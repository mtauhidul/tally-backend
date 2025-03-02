// routes/goals.routes.js - Goals routes
const express = require("express");
const {
  getCurrentGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  calculateCalories,
  getGoals,
} = require("../controllers/goals.controller");

const router = express.Router();

// Import auth middleware
const { protect } = require("../middleware/auth.middleware");

// All routes require authentication
router.use(protect);

// Routes
router.route("/").get(getGoals).post(createGoal);

router.get("/current", getCurrentGoal);
router.post("/calculate-calories", calculateCalories);

router.route("/:id").put(updateGoal).delete(deleteGoal);

module.exports = router;
