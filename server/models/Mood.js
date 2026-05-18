/**
 * models/Mood.js — Daily Mood Log Schema
 *
 * Separate from journal entries — users can log mood quickly
 * without writing a full entry. Used for:
 * - Mood heatmaps (calendar view)
 * - Trend line charts
 * - Correlation analysis with journal entries
 */

const mongoose = require("mongoose");

const MoodSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ─── Core Mood Rating ─────────────────────────────────────────────────────
    score: {
      type: Number,
      required: [true, "Mood score is required"],
      min: 1,
      max: 10,
      // 1-3: struggling, 4-6: neutral, 7-9: good, 10: amazing
    },

    // ─── Emotion Labels ───────────────────────────────────────────────────────
    emotions: {
      type: [String],
      default: [],
      // Multi-select from: happy, sad, anxious, calm, angry, hopeful,
      //                    overwhelmed, grateful, lonely, energized, etc.
    },

    // ─── Context Factors ─────────────────────────────────────────────────────
    // What factors influenced the mood today?
    factors: {
      sleep: { type: Number, min: 1, max: 5, default: null }, // hours
      exercise: { type: Boolean, default: false },
      socialInteraction: { type: String, enum: ["none", "little", "moderate", "lots"], default: "none" },
      weather: { type: String, default: "" },
      medications: { type: Boolean, default: false },
    },

    // ─── Quick Note ───────────────────────────────────────────────────────────
    note: {
      type: String,
      maxlength: [500, "Note cannot exceed 500 characters"],
      default: "",
    },

    // ─── Date (day-level deduplication) ─────────────────────────────────────
    date: {
      type: Date,
      default: () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0); // Normalize to start of day
        return d;
      },
    },
  },
  { timestamps: true }
);

// ─── Compound index to allow only ONE mood entry per user per day ──────────
MoodSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Mood", MoodSchema);
