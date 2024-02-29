const AppError = require("./../utils/appError");

// This function handles cast errors thrown by Mongoose
const handleCastErrorDB = (err) => {
  // Create an error message with the invalid path and value that caused the error
  const message = `Invalid ${err.path}: ${err.value}.`;
  // Return a new AppError instance with the error message and a 400 status code
  return new AppError(message, 400);
};

// This function handles duplicate field errors thrown by Mongoose
const handleDuplicateFieldsDB = (err) => {
  console.log("rtt", err);
  // Check if the error code is 11000 (duplicate key error)
  if (err.code === 11000) {
    // Extract the field name from the error message (assuming it follows a standard format)
    const fieldName = Object.keys(err.keyPattern)[0];
    // Create a custom error message based on the field name
    const message = `${fieldName} already exists. Please use another ${fieldName}.`;
    // Return a new AppError instance with the custom error message and a 400 status code
    return new AppError(message, 400);
  } else {
    // If it's not a duplicate key error, handle it as before
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    console.log("error", value);
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
  }
};

// This function handles validation errors thrown by Mongoose
const handleValidationErrorDB = (err) => {
  // Check if 'acceptedTerms' validation error exists
  if (err._message == "User validation failed") {
    // Handle specific validation error for 'acceptedTerms'
    const message = "Terms and conditions must be accepted";
    // Return a new AppError instance with the custom error message and a 400 status code
    return new AppError(message, 400);
  }

  // Map over the error object's values to get an array of error messages
  const errors = Object.values(err.errors).map((el) => el.message);

  // Create an error message with all the validation errors
  const message = `Invalid input data. ${errors.join(". ")}`;
  // Return a new AppError instance with the error message and a 400 status code
  return new AppError(message, 400);
};

// This function handles JSON web token errors
const handleJWTError = () =>
  // Return a new AppError instance with an appropriate error message and a 401 status code
  new AppError("Invalid token. Please log in again!", 401);

// This function handles expired JSON web tokens
const handleJWTExpiredError = () =>
  // Return a new AppError instance with an appropriate error message and a 401 status code
  new AppError("Your token has expired! Please log in again.", 401);

// This function sends error responses during development
const sendErrorDev = (err, req, res) => {
  // A) API
  // Check if the error occurred in an API endpoint
  if (req.originalUrl.startsWith("/api")) {
    // Send a JSON response with the error status code, message, and stack trace
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // B) RENDERED WEBSITE
  // If the error occurred on a website, log the error and render an error page with the error message
  console.error("ERROR 💥", err);
  return res.status(err.statusCode).render("error", {
    title: "Something went wrong!",
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else if (err._message == "User validation failed") {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // B) Programming or other unknown error
    console.error("ERROR 💥", err);
    return res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

// Exporting a function that takes in four parameters: err, req, res, next
module.exports = (err, req, res, next) => {
  console.log("errorrrr", err.name, err.isOperational, "user", req.user);
  // Set a default value of 500 for statusCode if it doesn't exist in the error object
  err.statusCode = err.statusCode || 500;
  // Set a default value of "error" for status if it doesn't exist in the error object
  err.status = err.status || "error";

  // If the Node environment is set to "development", call the sendErrorDev function with the error object and other parameters
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
    // If the Node environment is set to "production", do the following:
  } else if (process.env.NODE_ENV === "production") {
    // Create a new error object that copies all the properties of the original error object
    let error = { ...err };
    // Set the message property of the new error object to the message property of the original error object
    error.message = err.message;

    // If the error name is "CastError", call the handleCastErrorDB function with the error object and update the error variable
    if (error.name === "CastError") error = handleCastErrorDB(error);
    // If the error code is 11000, call the handleDuplicateFieldsDB function with the error object and update the error variable
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    // If the error name is "ValidationError", call the handleValidationErrorDB function with the error object and update the error variable
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);

    // If the error name is "JsonWebTokenError", call the handleJWTError function and update the error variable
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    // If the error name is "TokenExpiredError", call the handleJWTExpiredError function and update the error variable
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

    // Call the sendErrorProd function with the updated error object and other parameters
    sendErrorProd(error, req, res);
  }
};
