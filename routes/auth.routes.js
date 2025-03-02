// routes/auth.routes.js - Authentication routes
const express = require("express");
const {
  register,
  login,
  getMe,
  logout,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");

const router = express.Router();

// Import auth middleware
const { protect } = require("../middleware/auth.middleware");

// Routes
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/logout", logout);
router.put("/updatedetails", protect, updateDetails);
router.put("/updatepassword", protect, updatePassword);
router.post("/forgotpassword", forgotPassword);
router.put("/resetpassword/:resettoken", resetPassword);

module.exports = router;
