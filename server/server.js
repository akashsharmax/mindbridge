/**
 * server.js — MindBridge Application Entry Point
 *
 * This is the heart of the backend. It:
 * 1. Loads environment variables from .env
 * 2. Connects to MongoDB
 * 3. Configures Express middleware stack (security, parsing, logging)
 * 4. Mounts all API route groups
 * 5. Initializes Socket.io for real-time crisis alerts
 * 6. Starts the HTTP server
 *
 * ORDER MATTERS: Security middleware must come before routes.
 */

const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// ─── Route Imports ────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const journalRoutes = require("./routes/journal");
const moodRoutes = require("./routes/mood");
const chatRoutes = require("./routes/chat");
const insightRoutes = require("./routes/insights");
const crisisRoutes = require("./routes/crisis");

// ─── Socket Handler ───────────────────────────────────────────────────────────
const { initSocket } = require("./services/socketService");

// ─── App & Server Setup ───────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app); // wrap Express in http for Socket.io

// Initialize Socket.io with CORS settings
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Attach io instance to app so controllers can access it via req.app.get('io')
app.set("io", io);
initSocket(io);

// ─── Database Connection ───────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1); // Kill the server if DB is unavailable
  }
};
connectDB();

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // Allow embedding from same origin
  })
);

// CORS — only allow our frontend origin
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true, // Allow cookies in cross-origin requests
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Global rate limiter — prevents brute force / DDoS
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Strict rate limiter for AI endpoints (expensive Claude API calls)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: "AI endpoint rate limit exceeded. Wait 1 minute." },
});
app.use("/api/chat", aiLimiter);
app.use("/api/journal", aiLimiter);
app.use("/api/insights", aiLimiter);

// ─── Parsing & Utility Middleware ──────────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // Parse JSON bodies (limit size)
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse cookies for JWT auth
app.use(mongoSanitize()); // Strip $ and . from request data (NoSQL injection)

// HTTP request logger (only in development)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/mood", moodRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/crisis", crisisRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
// Must be LAST middleware registered
app.use((err, req, res, next) => {
  console.error("🔥 Unhandled error:", err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 MindBridge server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for real-time crisis detection`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});
