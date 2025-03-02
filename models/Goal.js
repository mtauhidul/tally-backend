// models/Goal.js - Goal model schema for weight and nutrition targets
const mongoose = require("mongoose");

const GoalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["lose", "maintain", "gain"],
    default: "lose",
  },
  currentWeight: {
    type: Number,
    required: [true, "Current weight is required"],
  },
  goalWeight: {
    type: Number,
    required: [true, "Goal weight is required"],
  },
  targetDate: {
    type: Date,
    required: [true, "Target date is required"],
  },
  weeklyWeightChange: {
    type: Number, // in pounds per week (negative for weight loss)
    default: -1.0,
  },
  nutrition: {
    dailyCalories: {
      type: Number,
      required: [true, "Daily calorie target is required"],
    },
    protein: {
      type: Number, // in grams
      default: 120,
    },
    carbs: {
      type: Number, // in grams
      default: 250,
    },
    fat: {
      type: Number, // in grams
      default: 65,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
GoalSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Goal", GoalSchema);
