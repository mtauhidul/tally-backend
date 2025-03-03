// server.js - Main application file with enhanced logging
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const morgan = require("morgan");
const fs = require("fs");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/niblet")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  });

// Setup logging directory
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Import and use request logger middleware
const requestLogger = require("./middleware/request-logger.middleware");
app.use(requestLogger);

// Create a write stream for access logs
const accessLogStream = fs.createWriteStream(path.join(logsDir, "access.log"), {
  flags: "a",
});

// Define custom Morgan token for request body
morgan.token("request-body", (req) => {
  // Don't log sensitive information like passwords
  const { password, ...safeBody } = req.body;
  return JSON.stringify(safeBody);
});

// Define custom Morgan token for response time
morgan.token("response-time-formatted", (req, res) => {
  // Return response time in milliseconds with ms suffix
  return res.getHeader("x-response-time") + "ms";
});

// Middleware to capture response time
app.use((req, res, next) => {
  const start = process.hrtime();

  res.on("finish", () => {
    const diff = process.hrtime(start);
    const time = diff[0] * 1e3 + diff[1] * 1e-6;
    res.setHeader("x-response-time", time.toFixed(2));
  });

  next();
});

// Configure Morgan for console output (development environment)
if (process.env.NODE_ENV === "development") {
  app.use(
    morgan(":method :url :status :response-time-formatted - :request-body", {
      skip: (req) => req.path === "/api/health", // Skip health check endpoints
    })
  );
}

// Configure Morgan for file output (all environments)
app.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-formatted ms',
    {
      stream: accessLogStream,
      skip: (req) => req.path === "/api/health", // Skip health check endpoints
    }
  )
);

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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", time: new Date().toISOString() });
});

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
