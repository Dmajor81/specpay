const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const otpGenerator = require("otp-generator");

const userSchema = new mongoose.Schema({
  phone: {
    type: Number,
    maxlength: 11,
    unique: true,
    required: false,
  },
  firstName: {
    type: String,
    required: [true, "Provide your first name!"],
  },
  middleName: {
    type: String,
  },
  lastName: {
    type: String,
    required: [true, "Provide your last name!"],
  },
  bvn: {
    type: Number,
    required: [true, "Provide your bvn!"],
  },
  dob: {
    type: Date,
    required: [true, "Provide your Date of birth!"],
  },

  businessName: {
    type: String,
  },
  accountName: {
    type: String,
  },
  accountNumber: {
    type: Number,
  },
  gender: {
    type: String,
    enum: ["male", "female"],
  },

  email: {
    type: String,
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },

  GovernmentIDImage: {
    type: String,
  },
  role: {
    type: String,
    enum: ["admin", "user", "merchant"],
    required: true,
    default: "user",
  },
  photo: {
    type: String,
    default: "default.jpg",
  },
  state: {
    type: String,
  },
  lga: {
    type: String,
  },
  address: {
    type: String,
  },
  description: {
    type: String,
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 6,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same!",
    },
  },

  acceptTerms: {
    type: Boolean,
    required: [
      true,
      "Kindly accept Terms and conditions so that you can proceed with signUp",
    ],
    validate: {
      validator: function (value) {
        return value === true;
      },
      message: "Terms and conditions must be accepted",
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordResetAttempts: Number,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }
  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const otp = otpGenerator.generate(6, {
    upperCase: false,
    specialChars: false,
  });
  this.passwordResetAttempts = 0;

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  // return resetToken;
  return otp;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
