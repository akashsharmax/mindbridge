/**
 * controllers/journalController.js — Journal CRUD + AI Analysis
 *
 * The journal endpoint is where the main AI magic happens.
 *
 * Flow for creating an entry:
 * 1. User submits journal text
 * 2. Entry is IMMEDIATELY saved to MongoDB (fast UX)
 * 3. Crisis detection runs (fast keyword check + optional AI check)
 * 4. If crisis detected: log it, emit Socket.io event, notify contacts
 * 5. Full AI analysis runs asynchronously
 * 6. Journal document updated with analysis results
 * 7. Socket.io emits "analysis:complete" event to client
 *
 * This two-phase approach means the user never waits for AI before seeing
 * their entry saved.
 */

const Journal = require("../models/Journal");
const User = require("../models/User");
const Crisis = require("../models/Crisis");
const { analyzeJournalEntry, detectCrisis } = require("../services/aiService");
const { sendCrisisEmail } = require("../services/emailService");

// @desc    Create journal entry + trigger AI analysis
// @route   POST /api/journal
// @access  Private
exports.createEntry = async (req, res) => {
  try {
    const { title, content, moodBefore, tags, promptUsed } = req.body;

    if (!content || content.trim().length < 10) {
      return res.status(400).json({ success: false, error: "Entry must be at least 10 characters" });
    }

    // ── Phase 1: Save entry immediately ───────────────────────────────────
    const entry = await Journal.create({
      user: req.user.id,
      title,
      content: content.trim(),
      moodBefore: moodBefore || 5,
      tags: tags || [],
      promptUsed: promptUsed || "",
    });

    // Update user streak
    const user = await User.findById(req.user.id);
    user.updateStreak();
    await user.save();

    // Return immediately to client with saved entry
    res.status(201).json({
      success: true,
      entry,
      message: "Entry saved! AI analysis in progress...",
    });

    // ── Phase 2: Crisis detection (async, after response sent) ───────────
    const io = req.app.get("io");

    try {
      const crisisResult = await detectCrisis(content);

      if (crisisResult.isCrisis) {
        // Log crisis event
        const crisisEvent = await Crisis.create({
          user: req.user.id,
          source: "journal",
          sourceId: entry._id,
          severity: crisisResult.severity,
          triggerText: crisisResult.triggerPhrase,
          aiReason: crisisResult.reason,
        });

        // Notify trusted contacts via email
        const fullUser = await User.findById(req.user.id);
        if (fullUser.trustedContacts?.length > 0) {
          for (const contact of fullUser.trustedContacts) {
            if (contact.notifyOnCrisis) {
              try {
                await sendCrisisEmail(contact, fullUser.name, crisisResult.severity);
                crisisEvent.contactsNotified.push({
                  name: contact.name,
                  email: contact.email,
                  notifiedAt: new Date(),
                  emailStatus: "sent",
                });
              } catch {
                crisisEvent.contactsNotified.push({
                  name: contact.name,
                  email: contact.email,
                  notifiedAt: new Date(),
                  emailStatus: "failed",
                });
              }
            }
          }
          await crisisEvent.save();
        }

        // Emit crisis event to user's socket room
        io.to(req.user.id.toString()).emit("crisis:detected", {
          severity: crisisResult.severity,
          entryId: entry._id,
        });

        // Update entry with crisis flag
        await Journal.findByIdAndUpdate(entry._id, {
          "aiAnalysis.isCrisis": true,
          "aiAnalysis.crisisSeverity": crisisResult.severity,
        });
      }
    } catch (crisisErr) {
      console.error("Crisis detection error:", crisisErr.message);
    }

    // ── Phase 3: Full AI analysis ─────────────────────────────────────────
    try {
      const analysis = await analyzeJournalEntry(content, {
        name: user.name,
        mentalHealthGoals: user.mentalHealthGoals,
        diagnoses: user.diagnoses,
      });

      // Update entry with complete analysis
      const updatedEntry = await Journal.findByIdAndUpdate(
        entry._id,
        { aiAnalysis: analysis },
        { new: true }
      );

      // Notify frontend that analysis is ready
      io.to(req.user.id.toString()).emit("analysis:complete", {
        entryId: entry._id,
        analysis: updatedEntry.aiAnalysis,
      });
    } catch (aiErr) {
      console.error("AI analysis error:", aiErr.message);
      io.to(req.user.id.toString()).emit("analysis:error", {
        entryId: entry._id,
        error: "Analysis unavailable. Your entry is saved safely.",
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get all entries for current user
// @route   GET /api/journal
// @access  Private
exports.getEntries = async (req, res) => {
  try {
    const { page = 1, limit = 10, emotion, tag, startDate, endDate } = req.query;

    const query = { user: req.user.id };

    if (emotion) query["aiAnalysis.primaryEmotion"] = emotion;
    if (tag) query.tags = { $in: [tag] };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await Journal.countDocuments(query);
    const entries = await Journal.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("-content"); // Omit full content in list view for performance

    res.json({
      success: true,
      count: entries.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      entries,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get single entry with full content
// @route   GET /api/journal/:id
// @access  Private
exports.getEntry = async (req, res) => {
  try {
    const entry = await Journal.findOne({
      _id: req.params.id,
      user: req.user.id, // Ensures users can only access their own entries
    });

    if (!entry) {
      return res.status(404).json({ success: false, error: "Entry not found" });
    }

    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Update mood after writing (moodAfter field)
// @route   PATCH /api/journal/:id/mood-after
// @access  Private
exports.updateMoodAfter = async (req, res) => {
  try {
    const { moodAfter } = req.body;
    const entry = await Journal.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { moodAfter },
      { new: true }
    );
    if (!entry) return res.status(404).json({ success: false, error: "Entry not found" });
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Delete journal entry
// @route   DELETE /api/journal/:id
// @access  Private
exports.deleteEntry = async (req, res) => {
  try {
    const entry = await Journal.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!entry) {
      return res.status(404).json({ success: false, error: "Entry not found" });
    }

    // Decrement user's total entries
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalEntries: -1 } });

    res.json({ success: true, message: "Entry deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
