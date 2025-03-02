// routes/users.routes.js - User profile routes
const express = require("express");
const {
  updateProfile,
  getProfile,
  completeOnboarding,
} = require("../controllers/users.controller");

const router = express.Router();

// Import auth middleware
const { protect } = require("../middleware/auth.middleware");

// All routes require authentication
router.use(protect);

// Routes
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/complete-onboarding", completeOnboarding);

module.exports = router;
