// middleware/request-logger.middleware.js - Custom request logging middleware
const logger = require("../utils/logger");

/**
 * Middleware for detailed request logging
 */
const requestLogger = (req, res, next) => {
  // Get the start time for this request
  const start = process.hrtime();

  // Get original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  // Log the request
  const { method, originalUrl, ip, headers } = req;

  // Create basic request log info
  const reqInfo = {
    method,
    url: originalUrl,
    ip,
    userAgent: headers["user-agent"],
    userId: req.user ? req.user.id : "unauthenticated",
    requestId:
      req.headers["x-request-id"] ||
      `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  // Add request ID header for tracing
  res.setHeader("X-Request-ID", reqInfo.requestId);

  // Check if it's an API endpoint
  if (originalUrl.startsWith("/api") && originalUrl !== "/api/health") {
    logger.info(`API Request: ${method} ${originalUrl}`, {
      ...reqInfo,
      query: req.query,
      params: req.params,
      // Sanitize the body to remove sensitive data like passwords
      body: sanitizeBody(req.body),
    });
  }

  // Override response methods to log the response
  res.send = function (body) {
    // Calculate response time
    const diff = process.hrtime(start);
    const responseTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

    // Log response time for API endpoints
    if (originalUrl.startsWith("/api") && originalUrl !== "/api/health") {
      const responseSize = Buffer.isBuffer(body)
        ? body.length
        : typeof body === "string"
        ? Buffer.byteLength(body)
        : null;

      logger.info(`API Response: ${method} ${originalUrl} ${res.statusCode}`, {
        ...reqInfo,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        responseSize: responseSize ? `${responseSize} bytes` : "unknown",
      });
    }

    // Call original method
    return originalSend.apply(res, arguments);
  };

  res.json = function (body) {
    // Calculate response time
    const diff = process.hrtime(start);
    const responseTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

    // Log response time for API endpoints
    if (originalUrl.startsWith("/api") && originalUrl !== "/api/health") {
      logger.info(`API Response: ${method} ${originalUrl} ${res.statusCode}`, {
        ...reqInfo,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
      });
    }

    // Call original method
    return originalJson.apply(res, arguments);
  };

  res.end = function () {
    // Calculate response time if not already calculated (e.g. for redirects)
    const diff = process.hrtime(start);
    const responseTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

    // Log response time for API endpoints if not already logged via send/json
    if (
      originalUrl.startsWith("/api") &&
      originalUrl !== "/api/health" &&
      !res.headersSent
    ) {
      logger.info(`API Response: ${method} ${originalUrl} ${res.statusCode}`, {
        ...reqInfo,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
      });
    }

    // Call original method
    return originalEnd.apply(res, arguments);
  };

  next();
};

/**
 * Sanitize request body to remove sensitive information
 * @param {Object} body - Request body
 * @returns {Object} - Sanitized body
 */
function sanitizeBody(body) {
  if (!body) return {};

  // Create a copy to avoid modifying the original
  const sanitized = { ...body };

  // List of sensitive fields to remove
  const sensitiveFields = [
    "password",
    "passwordConfirm",
    "currentPassword",
    "newPassword",
    "token",
    "refreshToken",
    "accessToken",
    "credit_card",
    "creditCard",
    "cardNumber",
    "cvv",
    "securityCode",
  ];

  // Remove sensitive fields
  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  });

  return sanitized;
}

module.exports = requestLogger;
