// middleware/error.middleware.js - Enhanced centralized error handling
const ErrorResponse = require("../utils/errorResponse");
const logger = require("../utils/logger");

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error("Error details:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  let error = { ...err };
  error.message = err.message;

  // Create detailed error info for logging
  const errorDetails = {
    message: err.message,
    stack: err.stack,
    requestInfo: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.user ? req.user.id : "unauthenticated",
      requestId: req.headers["x-request-id"] || res.getHeader("X-Request-ID"),
    },
  };

  // Log error with detailed info
  logger.error(`API Error: ${err.message}`, errorDetails);

  // MongoDB bad ObjectId
  if (err.name === "CastError") {
    const message = `Resource not found`;
    error = new ErrorResponse(message, 404);
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = new ErrorResponse(message, 400);
  }

  // MongoDB validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new ErrorResponse(message, 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new ErrorResponse("Invalid token", 401);
  }

  if (err.name === "TokenExpiredError") {
    error = new ErrorResponse("Token expired", 401);
  }

  // Default to 500 server error if statusCode not set
  const statusCode = error.statusCode || 500;

  // Don't expose stack trace in production
  const response = {
    success: false,
    error: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };

  // Log 500 errors in more detail
  if (statusCode === 500) {
    logger.error(`Server Error: ${err.message}`, {
      ...errorDetails,
      stack: err.stack,
    });
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
