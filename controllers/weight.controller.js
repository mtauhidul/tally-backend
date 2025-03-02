// controllers/weight.controller.js - Weight tracking controller
const Weight = require("../models/Weight");
const Goal = require("../models/Goal");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

/**
 * @desc    Get all weight entries
 * @route   GET /api/weight
 * @access  Private
 */
exports.getWeightEntries = asyncHandler(async (req, res, next) => {
  // Parse date range
  let startDate, endDate;

  if (req.query.startDate && req.query.endDate) {
    startDate = new Date(new Date(req.query.startDate).setHours(0, 0, 0, 0));
    endDate = new Date(new Date(req.query.endDate).setHours(23, 59, 59, 999));
  } else {
    // Default to last 30 days
    endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
  }

  // Get weight entries
  const weightEntries = await Weight.find({
    user: req.user.id,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 });

  // Get statistics
  const stats = await Weight.getStats(req.user.id);

  // Get user's current goal if available
  const goal = await Goal.findOne({ user: req.user.id }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    count: weightEntries.length,
    stats,
    goal: goal
      ? {
          current: stats ? stats.current : null,
          target: goal.goalWeight,
          targetDate: goal.targetDate,
          progress:
            stats && goal
              ? ((stats.starting - stats.current) /
                  (stats.starting - goal.goalWeight)) *
                100
              : 0,
        }
      : null,
    data: weightEntries,
  });
});

/**
 * @desc    Get single weight entry
 * @route   GET /api/weight/:id
 * @access  Private
 */
exports.getWeightEntry = asyncHandler(async (req, res, next) => {
  const weightEntry = await Weight.findById(req.params.id);

  if (!weightEntry) {
    return next(
      new ErrorResponse(
        `Weight entry not found with id of ${req.params.id}`,
        404
      )
    );
  }

  // Make sure user owns the weight entry
  if (weightEntry.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to access this weight entry`, 401)
    );
  }

  res.status(200).json({
    success: true,
    data: weightEntry,
  });
});

/**
 * @desc    Create new weight entry
 * @route   POST /api/weight
 * @access  Private
 */
exports.createWeightEntry = asyncHandler(async (req, res, next) => {
  // Add user to request body
  req.body.user = req.user.id;

  // Check if entry for this date already exists
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const entryDate = req.body.date
    ? new Date(new Date(req.body.date).setHours(0, 0, 0, 0))
    : today;

  const existingEntry = await Weight.findOne({
    user: req.user.id,
    date: {
      $gte: entryDate,
      $lt: new Date(entryDate.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  if (existingEntry) {
    return next(
      new ErrorResponse(
        `You already have a weight entry for this date. Please update the existing entry.`,
        400
      )
    );
  }

  // Create weight entry
  const weightEntry = await Weight.create(req.body);

  // If this is the first entry, update user's profile weight
  const entriesCount = await Weight.countDocuments({ user: req.user.id });

  if (entriesCount === 1) {
    await User.findByIdAndUpdate(req.user.id, {
      "profile.weight": req.body.weight,
    });
  }

  res.status(201).json({
    success: true,
    data: weightEntry,
  });
});

/**
 * @desc    Update weight entry
 * @route   PUT /api/weight/:id
 * @access  Private
 */
exports.updateWeightEntry = asyncHandler(async (req, res, next) => {
  let weightEntry = await Weight.findById(req.params.id);

  if (!weightEntry) {
    return next(
      new ErrorResponse(
        `Weight entry not found with id of ${req.params.id}`,
        404
      )
    );
  }

  // Make sure user owns the weight entry
  if (weightEntry.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to update this weight entry`, 401)
    );
  }

  // Update weight entry
  weightEntry = await Weight.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: weightEntry,
  });
});

/**
 * @desc    Delete weight entry
 * @route   DELETE /api/weight/:id
 * @access  Private
 */
exports.deleteWeightEntry = asyncHandler(async (req, res, next) => {
  const weightEntry = await Weight.findById(req.params.id);

  if (!weightEntry) {
    return next(
      new ErrorResponse(
        `Weight entry not found with id of ${req.params.id}`,
        404
      )
    );
  }

  // Make sure user owns the weight entry
  if (weightEntry.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to delete this weight entry`, 401)
    );
  }

  await weightEntry.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Get weight progress summary
 * @route   GET /api/weight/progress
 * @access  Private
 */
exports.getWeightProgress = asyncHandler(async (req, res, next) => {
  // Get user's stats
  const stats = await Weight.getStats(req.user.id);

  // Get current goal
  const goal = await Goal.findOne({ user: req.user.id }).sort({
    createdAt: -1,
  });

  // Calculate goal data
  let goalData = null;

  if (goal) {
    // Calculate progress percentage
    const totalToLose = goal.currentWeight - goal.goalWeight;
    const lostSoFar =
      goal.currentWeight - (stats ? stats.current : goal.currentWeight);
    const progressPercentage =
      totalToLose > 0 ? (lostSoFar / totalToLose) * 100 : 0;

    // Calculate projected completion date based on current progress
    const now = new Date();
    const goalStartDate = goal.createdAt;
    const daysElapsed = Math.floor(
      (now - goalStartDate) / (1000 * 60 * 60 * 24)
    );

    const weightLossRate = daysElapsed > 0 ? lostSoFar / daysElapsed : 0; // lbs per day
    const remainingToLose =
      (stats ? stats.current : goal.currentWeight) - goal.goalWeight;
    const projectedDaysRemaining =
      weightLossRate > 0 ? Math.ceil(remainingToLose / weightLossRate) : null;

    const projectedCompletionDate = projectedDaysRemaining
      ? new Date(now.getTime() + projectedDaysRemaining * 24 * 60 * 60 * 1000)
      : null;

    goalData = {
      current: stats ? stats.current : goal.currentWeight,
      starting: goal.currentWeight,
      target: goal.goalWeight,
      targetDate: goal.targetDate,
      progressPercentage: progressPercentage,
      projectedCompletionDate: projectedCompletionDate,
    };
  }

  res.status(200).json({
    success: true,
    stats,
    goal: goalData,
  });
});
