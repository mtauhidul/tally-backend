// models/Weight.js - Weight model schema for tracking weight entries
const mongoose = require("mongoose");

const WeightSchema = new mongoose.Schema({
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
  weight: {
    type: Number,
    required: [true, "Weight value is required"],
  },
  unit: {
    type: String,
    enum: ["lbs", "kg"],
    default: "lbs",
  },
  notes: {
    type: String,
    trim: true,
  },
  // Store original text input if entered via chat
  originalText: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a user can only have one weight entry per day
WeightSchema.index({ user: 1, date: 1 }, { unique: true });

// Static method to get weight stats for a user
WeightSchema.statics.getStats = async function (userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { $sort: { date: 1 } },
    {
      $group: {
        _id: null,
        current: { $last: "$weight" },
        starting: { $first: "$weight" },
        lowest: { $min: "$weight" },
        highest: { $max: "$weight" },
        totalEntries: { $sum: 1 },
        firstDate: { $first: "$date" },
        lastDate: { $last: "$date" },
      },
    },
    {
      $project: {
        _id: 0,
        current: 1,
        starting: 1,
        lowest: 1,
        highest: 1,
        totalEntries: 1,
        firstDate: 1,
        lastDate: 1,
        netChange: { $subtract: ["$current", "$starting"] },
      },
    },
  ]);

  return stats.length > 0 ? stats[0] : null;
};

module.exports = mongoose.model("Weight", WeightSchema);
