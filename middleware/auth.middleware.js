// middleware/auth.middleware.js - Authentication middleware
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect routes - verify JWT token
 */
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Set token from Bearer token
    token = req.headers.authorization.split(" ")[1];
  }
  // Check for token in cookies (useful for browser clients)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret_key_dev_only"
    );

    // Find user by ID from token
    req.user = await User.findById(decoded.id);

    // Check if user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "User not found with this ID",
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }
};

/**
 * Check if onboarding is complete
 * To be used after the protect middleware
 */
exports.checkOnboarding = (req, res, next) => {
  if (!req.user.onboardingCompleted) {
    return res.status(403).json({
      success: false,
      error: "Please complete onboarding first",
    });
  }
  next();
};
