/**
 * controllers/insightsController.js — Weekly AI Reports
 */

const Journal = require("../models/Journal");
const Mood = require("../models/Mood");
const { generateWeeklyInsight } = require("../services/aiService");

// @desc    Generate weekly AI insight report
// @route   GET /api/insights/weekly
// @access  Private
exports.getWeeklyInsight = async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [entries, moods] = await Promise.all([
      Journal.find({ user: req.user.id, createdAt: { $gte: since }, "aiAnalysis.analyzed": true }),
      Mood.find({ user: req.user.id, date: { $gte: since } }),
    ]);

    const report = await generateWeeklyInsight(entries, moods, req.user);

    res.json({ success: true, report, generatedAt: new Date() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
