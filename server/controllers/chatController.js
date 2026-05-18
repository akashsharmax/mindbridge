/**
 * controllers/chatController.js — AI Therapist Chat Logic
 *
 * Manages conversational sessions with the AI companion (Sage).
 * Each conversation has persistent history stored in MongoDB,
 * which is sent with every API call to maintain context.
 */

const Chat = require("../models/Chat");
const Crisis = require("../models/Crisis");
const User = require("../models/User");
const { chat, detectCrisis } = require("../services/aiService");
const { sendCrisisEmail } = require("../services/emailService");

// @desc    Send message, get AI reply
// @route   POST /api/chat
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: "Message cannot be empty" });
    }

    const user = await User.findById(req.user.id);

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Chat.findOne({ _id: conversationId, user: req.user.id });
      if (!conversation) {
        return res.status(404).json({ success: false, error: "Conversation not found" });
      }
    } else {
      conversation = await Chat.create({ user: req.user.id });
    }

    // Add user message to history
    conversation.messages.push({ role: "user", content: message });

    // Run crisis detection in parallel with AI response
    const [crisisResult, aiResult] = await Promise.all([
      detectCrisis(message),
      chat(conversation.messages, {
        name: user.name,
        mentalHealthGoals: user.mentalHealthGoals,
        diagnoses: user.diagnoses,
      }),
    ]);

    // Add AI reply to conversation
    conversation.messages.push({
      role: "assistant",
      content: aiResult.reply,
      metadata: aiResult.metadata,
    });

    await conversation.save();

    // Handle crisis if detected
    if (crisisResult.isCrisis) {
      conversation.crisisDetected = true;
      await conversation.save();

      await Crisis.create({
        user: req.user.id,
        source: "chat",
        sourceId: conversation._id,
        severity: crisisResult.severity,
        triggerText: crisisResult.triggerPhrase,
        aiReason: crisisResult.reason,
      });

      // Emit crisis event
      const io = req.app.get("io");
      io.to(req.user.id.toString()).emit("crisis:detected", {
        severity: crisisResult.severity,
        source: "chat",
      });

      // Email trusted contacts
      if (user.trustedContacts?.length > 0) {
        for (const contact of user.trustedContacts.filter((c) => c.notifyOnCrisis)) {
          await sendCrisisEmail(contact, user.name, crisisResult.severity).catch(() => {});
        }
      }
    }

    res.json({
      success: true,
      reply: aiResult.reply,
      metadata: aiResult.metadata,
      conversationId: conversation._id,
      crisisDetected: crisisResult.isCrisis,
      crisisSeverity: crisisResult.severity,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get all conversations for user
// @route   GET /api/chat/history
// @access  Private
exports.getHistory = async (req, res) => {
  try {
    const conversations = await Chat.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select("title messageCount crisisDetected createdAt updatedAt");

    res.json({ success: true, conversations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get single conversation with full messages
// @route   GET /api/chat/:id
// @access  Private
exports.getConversation = async (req, res) => {
  try {
    const conversation = await Chat.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: "Conversation not found" });
    }

    res.json({ success: true, conversation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Delete conversation
// @route   DELETE /api/chat/:id
// @access  Private
exports.deleteConversation = async (req, res) => {
  try {
    await Chat.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ success: true, message: "Conversation deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
