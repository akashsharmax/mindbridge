/**
 * models/Chat.js — AI Conversation Schema
 *
 * Stores the full conversation history between user and Claude AI.
 * Each document represents ONE conversation session.
 * Messages array holds the back-and-forth turns.
 *
 * Design: We store the entire messages array in one document
 * (rather than one document per message) because Claude's API
 * needs the FULL conversation history on each call to maintain context.
 * This makes retrieval O(1) instead of O(n).
 */

const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: [4000, "Message too long"],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Metadata for assistant messages
    metadata: {
      isCrisisResponse: { type: Boolean, default: false },
      suggestedResources: { type: [String], default: [] },
      emotionDetected: { type: String, default: "" },
    },
  },
  { _id: false }
);

const ChatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Conversation",
      maxlength: 100,
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    crisisDetected: {
      type: Boolean,
      default: false,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Keep messageCount in sync
ChatSchema.pre("save", function (next) {
  this.messageCount = this.messages.length;
  // Auto-title from first user message if title is default
  if (
    this.title === "New Conversation" &&
    this.messages.length > 0 &&
    this.messages[0].role === "user"
  ) {
    const firstMsg = this.messages[0].content;
    this.title =
      firstMsg.length > 50 ? firstMsg.substring(0, 50) + "..." : firstMsg;
  }
  next();
});

module.exports = mongoose.model("Chat", ChatSchema);
