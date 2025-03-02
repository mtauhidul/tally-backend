// controllers/goals.controller.js - Goals controller
const Goal = require("../models/Goal");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

/**
 * @desc    Get current user's goal
 * @route   GET /api/goals/current
 * @access  Private
 */
exports.getCurrentGoal = asyncHandler(async (req, res, next) => {
  const goal = await Goal.findOne({ user: req.user.id }).sort({
    createdAt: -1,
  });

  if (!goal) {
    return next(new ErrorResponse("No goal found for this user", 404));
  }

  res.status(200).json({
    success: true,
    data: goal,
  });
});

/**
 * @desc    Create new goal
 * @route   POST /api/goals
 * @access  Private
 */
exports.createGoal = asyncHandler(async (req, res, next) => {
  // Add user to request body
  req.body.user = req.user.id;

  // Create goal
  const goal = await Goal.create(req.body);

  // Update user's profile with current weight if provided
  if (req.body.currentWeight) {
    await User.findByIdAndUpdate(req.user.id, {
      "profile.weight": req.body.currentWeight,
    });
  }

  res.status(201).json({
    success: true,
    data: goal,
  });
});

/**
 * @desc    Update goal
 * @route   PUT /api/goals/:id
 * @access  Private
 */
exports.updateGoal = asyncHandler(async (req, res, next) => {
  let goal = await Goal.findById(req.params.id);

  if (!goal) {
    return next(
      new ErrorResponse(`Goal not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the goal
  if (goal.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to update this goal`, 401)
    );
  }

  // Update goal
  goal = await Goal.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: goal,
  });
});

/**
 * @desc    Delete goal
 * @route   DELETE /api/goals/:id
 * @access  Private
 */
exports.deleteGoal = asyncHandler(async (req, res, next) => {
  const goal = await Goal.findById(req.params.id);

  if (!goal) {
    return next(
      new ErrorResponse(`Goal not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the goal
  if (goal.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to delete this goal`, 401)
    );
  }

  await goal.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Calculate recommended calorie intake
 * @route   POST /api/goals/calculate-calories
 * @access  Private
 */
exports.calculateCalories = asyncHandler(async (req, res, next) => {
  const {
    currentWeight,
    goalWeight,
    height,
    age,
    gender,
    activityLevel,
    targetDate,
    weeklyWeightChange,
  } = req.body;

  // Ensure required fields are provided
  if (!currentWeight || !height || !age || !gender || !activityLevel) {
    return next(new ErrorResponse("Please provide all required fields", 400));
  }

  // Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
  let bmr;

  if (gender === "male") {
    bmr = 10 * currentWeight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * currentWeight + 6.25 * height - 5 * age - 161;
  }

  // Apply activity multiplier
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    "very-active": 1.9,
  };

  const maintenanceCalories = Math.round(
    bmr * activityMultipliers[activityLevel]
  );

  // Calculate calorie deficit/surplus based on weight goals
  let recommendedCalories = maintenanceCalories;

  if (weeklyWeightChange) {
    // Each pound of weight is approximately 3500 calories
    // weeklyWeightChange is in pounds per week (negative for loss, positive for gain)
    const dailyCalorieAdjustment = (weeklyWeightChange * 3500) / 7;
    recommendedCalories = Math.round(
      maintenanceCalories + dailyCalorieAdjustment
    );
  } else if (goalWeight && targetDate) {
    // Calculate based on goal and target date
    const today = new Date();
    const targetDateObj = new Date(targetDate);
    const daysUntilTarget = Math.max(
      1,
      Math.round((targetDateObj - today) / (1000 * 60 * 60 * 24))
    );

    const weightDifference = goalWeight - currentWeight; // Negative for weight loss
    const totalCalorieDifference = weightDifference * 3500; // 3500 calories per pound
    const dailyCalorieDifference = totalCalorieDifference / daysUntilTarget;

    recommendedCalories = Math.round(
      maintenanceCalories + dailyCalorieDifference
    );
  }

  // Ensure minimum safe calorie intake
  const minimumCalories = gender === "male" ? 1500 : 1200;
  recommendedCalories = Math.max(minimumCalories, recommendedCalories);

  // Calculate macronutrient recommendations (simplified)
  const protein = Math.round((recommendedCalories * 0.3) / 4); // 30% of calories from protein, 4 calories per gram
  const fat = Math.round((recommendedCalories * 0.25) / 9); // 25% of calories from fat, 9 calories per gram
  const carbs = Math.round((recommendedCalories * 0.45) / 4); // 45% of calories from carbs, 4 calories per gram

  res.status(200).json({
    success: true,
    data: {
      bmr,
      maintenanceCalories,
      recommendedCalories,
      macronutrients: {
        protein,
        fat,
        carbs,
      },
    },
  });
});

/**
 * @desc    Get all user goals
 * @route   GET /api/goals
 * @access  Private
 */
exports.getGoals = asyncHandler(async (req, res, next) => {
  const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: goals.length,
    data: goals,
  });
});
