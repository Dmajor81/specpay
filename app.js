require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");

const fileUploadRoute = require("./routes/file-uploadRoute");
const userRoute = require("./routes/userRoute");
const walletRoute = require("./routes/walletRoute");

const app = express();

// Parse JSON request body and limit its size to 10KB
app.use(express.json());

// Configure the app to use URL-encoded request bodies
app.use(
  express.urlencoded({
    // Allow the middleware to parse complex objects and arrays
    extended: true,
  })
);

// The cookieParser() middleware is being used to parse cookies from incoming requests.
app.use(cookieParser());

// Enable Cross-Origin Resource Sharing (CORS) for all routes
app.use(cors());

// Sanitize request data to prevent NoSQL injection attacks
app.use(mongoSanitize());

// Log HTTP requests in the console in the "dev" format
// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// API routes
// app.use('*', [RequestLogger.reqLog, Auth.checks, SchemaValidator.validate]);
app.get("/", (req, res) => {
  console.log("req", req.user);
  res.send("Server Started");
});
app.use("/api/v1/users", userRoute);

// under development
app.use("/api/v1/wallet", walletRoute);
app.use("/api/v1/misc", fileUploadRoute);

// Handle requests that do not match any of the defined routes
app.all("*", (req, res, next) => {
  return next(
    new AppError(`Can't find ${req.originalUrl} on this server.`, 404)
  );
});

// Global error handler
app.use(globalErrorHandler);

module.exports = app;
