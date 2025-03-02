// controllers/users.controller.js - User profile controller
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res, next) => {
  // Allow updates to profile and preferences
  const validProfileFields = [
    "height",
    "weight",
    "age",
    "gender",
    "activityLevel",
  ];
  const validPreferenceFields = ["darkMode", "mealReminders", "units"];

  const updateFields = {};

  // Process profile fields
  validProfileFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateFields[`profile.${field}`] = req.body[field];
    }
  });

  // Process preference fields
  validPreferenceFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateFields[`preferences.${field}`] = req.body[field];
    }
  });

  // Update name if provided
  if (req.body.name) {
    updateFields.name = req.body.name;
  }

  // Only update if there are fields to update
  if (Object.keys(updateFields).length === 0) {
    return next(new ErrorResponse("No valid update fields provided", 400));
  }

  const user = await User.findByIdAndUpdate(req.user.id, updateFields, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Complete onboarding
 * @route   PUT /api/users/complete-onboarding
 * @access  Private
 */
exports.completeOnboarding = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { onboardingCompleted: true },
    { new: true }
  );

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
exports.getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user,
  });
});
