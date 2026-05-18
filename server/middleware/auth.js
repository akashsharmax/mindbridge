/**
 * middleware/auth.js — JWT Authentication Middleware
 *
 * Protects routes by verifying the JWT token from:
 * 1. HTTP-only cookie (preferred — XSS resistant)
 * 2. Authorization header as fallback (for API clients)
 *
 * Usage: router.get('/protected', protect, controller)
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  // Try cookie first (most secure for web clients)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // Fallback: Bearer token in Authorization header
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access denied. Please log in to continue.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data (catches deactivated accounts)
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User no longer exists.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: "Your account has been deactivated.",
      });
    }

    req.user = user; // Attach user to request for downstream use
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token. Please log in again.",
    });
  }
};

// Helper to send token response with cookie
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true, // Cannot be accessed by JavaScript
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict", // CSRF protection
  };

  res.status(statusCode).cookie("token", token, cookieOptions).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      currentStreak: user.currentStreak,
      badges: user.badges,
      preferences: user.preferences,
      mentalHealthGoals: user.mentalHealthGoals,
    },
  });
};

module.exports = { protect, sendTokenResponse };
