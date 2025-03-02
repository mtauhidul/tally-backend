// models/User.js - User model schema
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please add a valid email",
    ],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 8,
    select: false, // Don't return password by default in queries
  },
  name: {
    type: String,
    trim: true,
  },
  profile: {
    height: { type: Number }, // Height in inches
    weight: { type: Number }, // Weight in pounds (current)
    age: { type: Number },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
    },
    activityLevel: {
      type: String,
      enum: ["sedentary", "light", "moderate", "active", "very-active"],
      default: "moderate",
    },
  },
  preferences: {
    darkMode: {
      type: Boolean,
      default: false,
    },
    mealReminders: {
      type: Boolean,
      default: true,
    },
    units: {
      type: String,
      enum: ["metric", "imperial"],
      default: "imperial",
    },
  },
  onboardingCompleted: {
    type: Boolean,
    default: false,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password using bcrypt
UserSchema.pre("save", async function (next) {
  // Only hash password if it's modified (or new)
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET || "your_jwt_secret_key_dev_only",
    { expiresIn: process.env.JWT_EXPIRE || "30d" }
  );
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
UserSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

module.exports = mongoose.model("User", UserSchema);
