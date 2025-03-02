// routes/weight.routes.js - Weight tracking routes
const express = require("express");
const {
  getWeightEntries,
  getWeightEntry,
  createWeightEntry,
  updateWeightEntry,
  deleteWeightEntry,
  getWeightProgress,
} = require("../controllers/weight.controller");

const router = express.Router();

// Import auth middleware
const { protect, checkOnboarding } = require("../middleware/auth.middleware");

// All routes require authentication
router.use(protect);

// Routes
router.route("/").get(getWeightEntries).post(createWeightEntry);

router.get("/progress", getWeightProgress);

router
  .route("/:id")
  .get(getWeightEntry)
  .put(updateWeightEntry)
  .delete(deleteWeightEntry);

module.exports = router;
