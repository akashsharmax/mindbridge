/**
 * models/User.js — User Schema
 *
 * Stores all user profile data, authentication credentials,
 * trusted contacts for crisis alerts, and preferences.
 *
 * Key design decisions:
 * - Password stored as bcrypt hash (never plaintext)
 * - Trusted contacts array embedded in user doc (avoids extra collection)
 * - Streak tracking built into model (updated via pre-save hook)
 * - Avatar stored as Cloudinary URL
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const TrustedContactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  relationship: { type: String, default: "Friend" },
  notifyOnCrisis: { type: Boolean, default: true },
});

const UserSchema = new mongoose.Schema(
  {
    // ─── Basic Info ─────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [60, "Name cannot exceed 60 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never returned in queries by default
    },
    avatar: {
      type: String,
      default: "", // Cloudinary URL or empty
    },

    // ─── Mental Health Profile ───────────────────────────────────────────────
    // These help Claude personalize its responses
    mentalHealthGoals: {
      type: [String],
      default: [],
      // e.g. ["reduce anxiety", "improve sleep", "process grief"]
    },
    diagnoses: {
      type: [String],
      default: [],
      // Optional self-reported, e.g. ["anxiety", "depression"]
    },
    therapistName: {
      type: String,
      default: "",
    },

    // ─── Streak & Gamification ───────────────────────────────────────────────
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastEntryDate: {
      type: Date,
      default: null,
    },
    totalEntries: {
      type: Number,
      default: 0,
    },
    badges: {
      type: [String],
      default: [],
      // e.g. ["First Entry", "7-Day Streak", "30-Day Warrior"]
    },

    // ─── Safety Network ──────────────────────────────────────────────────────
    trustedContacts: {
      type: [TrustedContactSchema],
      default: [],
      validate: {
        validator: (v) => v.length <= 5,
        message: "Maximum 5 trusted contacts allowed",
      },
    },

    // ─── Preferences ────────────────────────────────────────────────────────
    preferences: {
      theme: { type: String, enum: ["light", "dark"], default: "dark" },
      dailyReminder: { type: Boolean, default: false },
      reminderTime: { type: String, default: "20:00" }, // 24-hour format
      weeklyInsights: { type: Boolean, default: true },
    },

    // ─── Account Status ──────────────────────────────────────────────────────
    isVerified: { type: Boolean, default: true }, // skip email verify for now
    isActive: { type: Boolean, default: true },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// ─── Pre-save Hook: Hash password before saving ────────────────────────────
// Only re-hashes if password field was actually modified
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12); // Higher cost factor = more secure
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance Method: Compare password ────────────────────────────────────
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─── Instance Method: Generate JWT token ──────────────────────────────────
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );
};

// ─── Instance Method: Update streak ───────────────────────────────────────
UserSchema.methods.updateStreak = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!this.lastEntryDate) {
    this.currentStreak = 1;
  } else {
    const last = new Date(this.lastEntryDate);
    last.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day, no streak change
    } else if (diffDays === 1) {
      this.currentStreak += 1; // Consecutive day
    } else {
      this.currentStreak = 1; // Streak broken
    }
  }

  this.lastEntryDate = new Date();
  this.totalEntries += 1;

  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }

  // Award badges
  const streakBadges = {
    1: "First Entry 🌱",
    7: "Week Warrior 🔥",
    30: "Monthly Master 🏆",
    100: "Century Champion 💎",
  };
  const badge = streakBadges[this.currentStreak];
  if (badge && !this.badges.includes(badge)) {
    this.badges.push(badge);
  }
};

// ─── Static Method: Check if email exists ─────────────────────────────────
UserSchema.statics.emailExists = async function (email) {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user;
};

module.exports = mongoose.model("User", UserSchema);
