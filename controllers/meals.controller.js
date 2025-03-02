// controllers/meals.controller.js - Meal tracking controller
const Meal = require("../models/Meal");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const { analyzeTextForCalories } = require("../utils/nutritionAnalysis");
const { processAndUploadImage } = require("../utils/imageProcessing");

/**
 * @desc    Get all meals
 * @route   GET /api/meals
 * @access  Private
 */
exports.getMeals = asyncHandler(async (req, res, next) => {
  // Parse date filters
  let startDate, endDate;

  if (req.query.date) {
    // If specific date is provided
    const date = new Date(req.query.date);
    startDate = new Date(date.setHours(0, 0, 0, 0));
    endDate = new Date(date.setHours(23, 59, 59, 999));
  } else if (req.query.startDate && req.query.endDate) {
    // If date range is provided
    startDate = new Date(new Date(req.query.startDate).setHours(0, 0, 0, 0));
    endDate = new Date(new Date(req.query.endDate).setHours(23, 59, 59, 999));
  } else {
    // Default to today
    const today = new Date();
    startDate = new Date(today.setHours(0, 0, 0, 0));
    endDate = new Date(today.setHours(23, 59, 59, 999));
  }

  // Build query
  const query = {
    user: req.user.id,
    date: { $gte: startDate, $lte: endDate },
  };

  // Add mealType filter if provided
  if (req.query.mealType) {
    query.mealType = req.query.mealType;
  }

  // Execute query and sort by date
  const meals = await Meal.find(query).sort({ date: 1 });

  // Calculate totals
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  meals.forEach((meal) => {
    totals.calories += meal.calories;
    totals.protein += meal.nutrition.protein;
    totals.carbs += meal.nutrition.carbs;
    totals.fat += meal.nutrition.fat;
  });

  res.status(200).json({
    success: true,
    count: meals.length,
    totals,
    data: meals,
  });
});

/**
 * @desc    Get single meal
 * @route   GET /api/meals/:id
 * @access  Private
 */
exports.getMeal = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id);

  if (!meal) {
    return next(
      new ErrorResponse(`Meal not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the meal
  if (meal.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to access this meal`, 401)
    );
  }

  res.status(200).json({
    success: true,
    data: meal,
  });
});

/**
 * @desc    Create new meal
 * @route   POST /api/meals
 * @access  Private
 */
exports.createMeal = asyncHandler(async (req, res, next) => {
  // Add user to request body
  req.body.user = req.user.id;

  // Process meal entry method
  if (req.body.entryMethod === "text" && req.body.originalText) {
    // Use NLP service to analyze meal text
    try {
      const nutritionData = await analyzeTextForCalories(req.body.originalText);

      // Set nutrition data from analysis
      req.body.calories = nutritionData.calories;
      req.body.nutrition = {
        protein: nutritionData.protein,
        carbs: nutritionData.carbs,
        fat: nutritionData.fat,
      };
      req.body.description = nutritionData.description || req.body.originalText;
    } catch (err) {
      console.error("Error analyzing meal text:", err);
      // If analysis fails, ask user to enter details manually
      return next(
        new ErrorResponse(
          "Could not analyze meal text. Please enter details manually.",
          400
        )
      );
    }
  } else if (req.body.entryMethod === "image" && req.files && req.files.image) {
    // Process and upload image
    try {
      const imageData = await processAndUploadImage(req.files.image);

      // Set image data
      req.body.image = {
        url: imageData.url,
        publicId: imageData.publicId,
      };

      // If we have image recognition for food
      if (imageData.nutritionData) {
        req.body.calories = imageData.nutritionData.calories;
        req.body.nutrition = {
          protein: imageData.nutritionData.protein,
          carbs: imageData.nutritionData.carbs,
          fat: imageData.nutritionData.fat,
        };
        req.body.description =
          imageData.nutritionData.description || "Food from image";
      }
    } catch (err) {
      console.error("Error processing meal image:", err);
      return next(
        new ErrorResponse(
          "Could not process meal image. Please try again or enter details manually.",
          400
        )
      );
    }
  }

  // Create meal
  const meal = await Meal.create(req.body);

  res.status(201).json({
    success: true,
    data: meal,
  });
});

/**
 * @desc    Update meal
 * @route   PUT /api/meals/:id
 * @access  Private
 */
exports.updateMeal = asyncHandler(async (req, res, next) => {
  let meal = await Meal.findById(req.params.id);

  if (!meal) {
    return next(
      new ErrorResponse(`Meal not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the meal
  if (meal.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to update this meal`, 401)
    );
  }

  // Update meal
  meal = await Meal.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: meal,
  });
});

/**
 * @desc    Delete meal
 * @route   DELETE /api/meals/:id
 * @access  Private
 */
exports.deleteMeal = asyncHandler(async (req, res, next) => {
  const meal = await Meal.findById(req.params.id);

  if (!meal) {
    return next(
      new ErrorResponse(`Meal not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user owns the meal
  if (meal.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User not authorized to delete this meal`, 401)
    );
  }

  // If meal has an image, delete it from storage
  if (meal.image && meal.image.publicId) {
    // Delete image logic would go here in production
  }

  await meal.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Get meal summary by day
 * @route   GET /api/meals/summary
 * @access  Private
 */
exports.getMealSummary = asyncHandler(async (req, res, next) => {
  // Parse date range
  let startDate, endDate;

  if (req.query.startDate && req.query.endDate) {
    startDate = new Date(new Date(req.query.startDate).setHours(0, 0, 0, 0));
    endDate = new Date(new Date(req.query.endDate).setHours(23, 59, 59, 999));
  } else {
    // Default to last 7 days
    endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
  }

  // Get aggregated meal data by day
  const summary = await Meal.aggregate([
    {
      $match: {
        user: req.user._id,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          // Group by date (year, month, day)
          year: { $year: "$date" },
          month: { $month: "$date" },
          day: { $dayOfMonth: "$date" },
        },
        date: { $first: "$date" },
        totalCalories: { $sum: "$calories" },
        totalProtein: { $sum: "$nutrition.protein" },
        totalCarbs: { $sum: "$nutrition.carbs" },
        totalFat: { $sum: "$nutrition.fat" },
        mealCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        date: 1,
        totalCalories: 1,
        totalProtein: 1,
        totalCarbs: 1,
        totalFat: 1,
        mealCount: 1,
      },
    },
    { $sort: { date: 1 } },
  ]);

  res.status(200).json({
    success: true,
    count: summary.length,
    data: summary,
  });
});

/**
 * @desc    Analyze meal text
 * @route   POST /api/meals/analyze-text
 * @access  Private
 */
exports.analyzeMealText = asyncHandler(async (req, res, next) => {
  const { text } = req.body;

  if (!text) {
    return next(new ErrorResponse("Please provide meal text to analyze", 400));
  }

  try {
    const nutritionData = await analyzeTextForCalories(text);

    res.status(200).json({
      success: true,
      data: nutritionData,
    });
  } catch (err) {
    console.error("Error analyzing meal text:", err);
    return next(
      new ErrorResponse(
        "Could not analyze meal text. Please try again or enter details manually.",
        400
      )
    );
  }
});
