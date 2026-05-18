/**
 * models/Journal.js — Journal Entry Schema
 *
 * Each journal entry stores:
 * 1. Raw user text
 * 2. AI analysis results (populated asynchronously after save)
 * 3. Metadata (mood at time of writing, tags, word count)
 * 4. Crisis flag (set if AI detected crisis language)
 *
 * The aiAnalysis field is initially empty and gets populated
 * by the AI service after the entry is created — this way
 * the user gets immediate feedback that their entry was saved,
 * and AI results stream in shortly after.
 */

const mongoose = require("mongoose");

// Sub-schema for AI analysis results
const AIAnalysisSchema = new mongoose.Schema(
  {
    primaryEmotion: {
      type: String,
      default: "",
      // e.g. "sadness", "anxiety", "joy", "anger", "fear", "disgust"
    },
    secondaryEmotions: {
      type: [String],
      default: [],
    },
    sentimentScore: {
      type: Number,
      min: -1,
      max: 1,
      default: 0,
      // -1 = very negative, 0 = neutral, +1 = very positive
    },
    stressLevel: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    triggers: {
      type: [String],
      default: [],
      // e.g. ["work pressure", "relationship conflict", "sleep deprivation"]
    },
    cognitiveDistortions: {
      type: [String],
      default: [],
      // e.g. ["catastrophizing", "mind reading", "all-or-nothing thinking"]
    },
    copingSuggestions: {
      type: [String],
      default: [],
      // Personalized suggestions from Claude
    },
    affirmation: {
      type: String,
      default: "",
      // One personalized affirmation based on entry content
    },
    summary: {
      type: String,
      default: "",
      // 2-3 sentence AI summary of the entry
    },
    isCrisis: {
      type: Boolean,
      default: false,
    },
    crisisSeverity: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    analyzed: {
      type: Boolean,
      default: false, // Becomes true once Claude processes the entry
    },
  },
  { _id: false }
);

const JournalSchema = new mongoose.Schema(
  {
    // ─── Ownership ───────────────────────────────────────────────────────────
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for fast user-specific queries
    },

    // ─── Content ─────────────────────────────────────────────────────────────
    title: {
      type: String,
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
      default: "",
    },
    content: {
      type: String,
      required: [true, "Journal content is required"],
      trim: true,
      minlength: [10, "Entry must be at least 10 characters"],
      maxlength: [10000, "Entry cannot exceed 10,000 characters"],
    },
    wordCount: {
      type: Number,
      default: 0,
    },

    // ─── User-set Metadata ───────────────────────────────────────────────────
    moodBefore: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
      // How the user rates their mood BEFORE writing (1=terrible, 10=great)
    },
    moodAfter: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
      // Optional: user rates mood AFTER writing (journaling often improves mood)
    },
    tags: {
      type: [String],
      default: [],
      // User-applied tags e.g. ["work", "family", "sleep"]
    },
    isPrivate: {
      type: Boolean,
      default: true,
    },

    // ─── AI Analysis (populated async after save) ────────────────────────────
    aiAnalysis: {
      type: AIAnalysisSchema,
      default: () => ({}),
    },

    // ─── Prompt Used (for guided journals) ───────────────────────────────────
    promptUsed: {
      type: String,
      default: "",
      // e.g. "What made you smile today?" (if user used a daily prompt)
    },
  },
  {
    timestamps: true,
  }
);

// ─── Pre-save Hook: Auto-calculate word count ──────────────────────────────
JournalSchema.pre("save", function (next) {
  if (this.isModified("content")) {
    this.wordCount = this.content
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  }
  next();
});

// ─── Index for date-range queries (analytics) ─────────────────────────────
JournalSchema.index({ user: 1, createdAt: -1 });

// ─── Virtual: reading time estimate ──────────────────────────────────────
JournalSchema.virtual("readingTimeMinutes").get(function () {
  return Math.max(1, Math.ceil(this.wordCount / 200)); // Avg 200 wpm reading speed
});

module.exports = mongoose.model("Journal", JournalSchema);
