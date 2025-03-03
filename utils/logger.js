// utils/logger.js - Centralized logging utility
const fs = require("fs");
const path = require("path");
const winston = require("winston");
const { format } = winston;
require("winston-daily-rotate-file");

// Ensure logs directory exists
const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = format.printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} ${level}: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta) : ""
  }`;
});

// Create file transport with daily rotation
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, "application-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  format: format.combine(format.timestamp(), logFormat),
});

// Create error file transport with daily rotation
const errorFileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  level: "error",
  format: format.combine(format.timestamp(), logFormat),
});

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: "niblet-api" },
  transports: [fileRotateTransport, errorFileRotateTransport],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "exceptions.log"),
      format: format.combine(format.timestamp(), format.json()),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "rejections.log"),
      format: format.combine(format.timestamp(), format.json()),
    }),
  ],
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  );
}

// Create a stream object for Morgan to use
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Helper methods
logger.logRouteAccess = (req, res, responseTime) => {
  const { method, originalUrl, ip, user } = req;
  logger.info(`Route accessed: ${method} ${originalUrl}`, {
    method,
    url: originalUrl,
    ip,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    userId: user ? user.id : "unauthenticated",
  });
};

logger.logError = (error, req = null) => {
  const logData = {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    },
  };

  if (req) {
    logData.method = req.method;
    logData.url = req.originalUrl;
    logData.ip = req.ip;
    logData.userId = req.user ? req.user.id : "unauthenticated";
  }

  logger.error(`Error: ${error.message}`, logData);
};

// Add application lifecycle logging
logger.logAppStart = (port) => {
  logger.info(`Niblet API server started on port ${port}`, {
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
    platform: process.platform,
  });
};

logger.logAppShutdown = (signal) => {
  logger.info(`Niblet API server shutting down due to ${signal}`);
};

logger.logDbConnection = (success, details) => {
  if (success) {
    logger.info("Database connection established successfully", details);
  } else {
    logger.error("Database connection failed", details);
  }
};

module.exports = logger;
