const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const Email = require("./../utils/email");
const Wallet = require("../models/wallet");
const { sentOtp, verifyOtp } = require("../services/twillo");
const { verifyBvn } = require("../services/dojah");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

const handleSendOTP = catchAsync(async (req, res, next) => {
  try {
    const { phone } = req.body; // Assuming you're sending these parameters in the request body
    const result = await sentOtp(phone);
    console.log("result", result);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "An error occurred while sending OTP.",
    });
  }
});
const handleVerifyOTP = catchAsync(async (req, res, next) => {
  try {
    const { phone, otp } = req.body; // Assuming you're sending these parameters in the request body
    const result = await verifyOtp(phone, otp);
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "An error occurred while verifying OTP.",
    });
  }
});

const handleVerifyBVN = catchAsync(async (req, res, next) => {
  const { firstName, lastName, bvn, dob } = req.body;

  // Call verifyBvn function with extracted parameters
  const result = await verifyBvn(firstName, lastName, bvn, dob);

  if (!result) {
    throw new AppError(`Something went wrong`, 404);
  }

  res.status(200).json({
    success: true,
    data: result,
  });
});
const signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  const wallet = await Wallet.create({
    transactionPin: req.body.password,
    user: newUser.id,
  });
  const url = `${req.protocol}://${req.get("host")}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

const login = catchAsync(async (req, res, next) => {
  const { phone, password } = req.body;

  // 1) Check if email and password exist
  if (!phone || !password) {
    return next(
      new AppError("Please provide your client name, email and password!", 400)
    );
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ phone }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect number email or password", 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, req, res);
});

const logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

const protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

const forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({
    email: req.body.email,
    client: req.body.client,
  });
  if (!user) {
    return next(
      new AppError("There is no user with email address and client name.", 404)
    );
  }
  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    await new Email(user, resetToken).sendPasswordReset();
    res.status(200).json({
      status: "success",
      message: "otp sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

const resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const email = req.body.email;
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.otp)
    .digest("hex");

  const user = await User.findOne({
    email,
  });
  console.log("user", user);
  if (user.passwordResetAttempts >= 3) {
    return next(
      new AppError(
        "Maximum OTP attempts reached. Please request a new OTP.",
        400
      )
    );
  }

  user.passwordResetAttempts += 1;
  await user.save({ validateBeforeSave: false });
  if (
    !user ||
    user.passwordResetToken !== hashedToken ||
    user.passwordResetExpires < Date.now()
  ) {
    return next(new AppError("Invalid OTP or OTP has expired", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetAttempts = 0;
  await user.save();
  createSendToken(user, 200, req, res);
});

const updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select("+password");

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});

module.exports = {
  handleSendOTP,
  handleVerifyOTP,
  handleVerifyBVN,
  updatePassword,
  resetPassword,
  forgotPassword,
  protect,
  logout,
  login,
  signup,
};
