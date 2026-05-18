/**
 * models/Crisis.js — Crisis Event Log Schema
 *
 * Every time the AI detects potential crisis language (in a journal
 * entry or chat message), a Crisis event is logged here.
 *
 * This serves two purposes:
 * 1. Audit trail for safety (reviewable by the user or a linked therapist)
 * 2. Source data for the crisis dashboard panel
 *
 * It also tracks whether trusted contacts were notified.
 */

const mongoose = require("mongoose");

const CrisisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ─── Source ───────────────────────────────────────────────────────────────
    source: {
      type: String,
      enum: ["journal", "chat"],
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.ObjectId,
      required: true,
      // References either Journal._id or Chat._id
    },

    // ─── AI Assessment ────────────────────────────────────────────────────────
    severity: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
      // 1: mild distress, 3: moderate risk, 5: immediate danger
    },
    triggerText: {
      type: String,
      required: true,
      // The specific phrase that triggered crisis detection
    },
    aiReason: {
      type: String,
      default: "",
      // Claude's explanation of why this was flagged
    },

    // ─── Response Actions ─────────────────────────────────────────────────────
    contactsNotified: {
      type: [
        {
          name: String,
          email: String,
          notifiedAt: Date,
          emailStatus: { type: String, enum: ["sent", "failed"], default: "sent" },
        },
      ],
      default: [],
    },
    resourcesShown: {
      type: [String],
      default: [],
      // Which hotline/resource links were displayed to user
    },
    userAcknowledged: {
      type: Boolean,
      default: false,
      // Whether user clicked "I'm safe" or similar confirmation
    },

    // ─── Follow-up ────────────────────────────────────────────────────────────
    followUpRequired: {
      type: Boolean,
      default: false,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Crisis", CrisisSchema);
