// models/Meal.js - Meal model schema for food tracking
const mongoose = require("mongoose");

const MealSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
    required: true,
  },
  mealType: {
    type: String,
    enum: ["breakfast", "lunch", "dinner", "snack"],
    required: [true, "Meal type is required"],
  },
  description: {
    type: String,
    required: [true, "Meal description is required"],
    trim: true,
  },
  calories: {
    type: Number,
    required: [true, "Calorie amount is required"],
  },
  nutrition: {
    protein: {
      type: Number, // in grams
      default: 0,
    },
    carbs: {
      type: Number, // in grams
      default: 0,
    },
    fat: {
      type: Number, // in grams
      default: 0,
    },
  },
  // For storing food items if we break down the meal
  items: [
    {
      name: {
        type: String,
        trim: true,
      },
      quantity: {
        type: Number,
        default: 1,
      },
      calories: {
        type: Number,
      },
      protein: {
        type: Number,
      },
      carbs: {
        type: Number,
      },
      fat: {
        type: Number,
      },
    },
  ],
  // For image uploads
  image: {
    url: String,
    publicId: String,
  },
  // For storing the original text input for the meal
  originalText: {
    type: String,
    trim: true,
  },
  // Whether the meal was entered manually or via NLP
  entryMethod: {
    type: String,
    enum: ["manual", "text", "image"],
    default: "manual",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying by user and date
MealSchema.index({ user: 1, date: 1 });

module.exports = mongoose.model("Meal", MealSchema);
