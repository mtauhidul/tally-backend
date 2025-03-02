// server.js - Main application file
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/tally")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  });

// Middleware
app.use(express.json());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : "http://localhost:3000",
    credentials: true,
  })
);

// API Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/users.routes"));
app.use("/api/meals", require("./routes/meals.routes"));
app.use("/api/weight", require("./routes/weight.routes"));
app.use("/api/goals", require("./routes/goals.routes"));

// Error handling middleware
app.use(require("./middleware/error.middleware"));

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  // Set static folder
  app.use(express.static("client/build"));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

// Set port
const PORT = process.env.PORT || 5080;

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  // Don't crash in production, but log the error
  if (process.env.NODE_ENV !== "production") {
    process.exit(1);
  }
});
