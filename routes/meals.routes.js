// routes/meals.routes.js - Meal tracking routes
const express = require("express");
const {
  getMeals,
  getMeal,
  createMeal,
  updateMeal,
  deleteMeal,
  getMealSummary,
  analyzeMealText,
} = require("../controllers/meals.controller");

const router = express.Router();

// Import auth middleware
const { protect, checkOnboarding } = require("../middleware/auth.middleware");

// All routes require authentication
router.use(protect);

// Routes
router.route("/").get(getMeals).post(createMeal);

router.get("/summary", getMealSummary);
router.post("/analyze-text", analyzeMealText);

router.route("/:id").get(getMeal).put(updateMeal).delete(deleteMeal);

module.exports = router;
