/**
 * controllers/moodController.js — Mood Logging & Analytics
 *
 * Handles mood log CRUD and provides analytics data
 * for the dashboard charts and heatmap.
 */

const Mood = require("../models/Mood");
const Journal = require("../models/Journal");

// @desc    Log today's mood
// @route   POST /api/mood
// @access  Private
exports.logMood = async (req, res) => {
  try {
    const { score, emotions, factors, note } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Upsert — replace today's entry if it exists
    const mood = await Mood.findOneAndUpdate(
      { user: req.user.id, date: today },
      { score, emotions: emotions || [], factors: factors || {}, note: note || "" },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json({ success: true, mood });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get mood history (last 90 days default)
// @route   GET /api/mood
// @access  Private
exports.getMoods = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const moods = await Mood.find({
      user: req.user.id,
      date: { $gte: since },
    }).sort({ date: 1 });

    res.json({ success: true, moods });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get mood analytics (for dashboard charts)
// @route   GET /api/mood/analytics
// @access  Private
exports.getAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const [moods, journals] = await Promise.all([
      Mood.find({ user: req.user.id, date: { $gte: since } }).sort({ date: 1 }),
      Journal.find({
        user: req.user.id,
        createdAt: { $gte: since },
        "aiAnalysis.analyzed": true,
      }).select("aiAnalysis.primaryEmotion aiAnalysis.sentimentScore aiAnalysis.stressLevel aiAnalysis.triggers createdAt"),
    ]);

    // ── Mood trend data (for line chart) ─────────────────────────────────
    const moodTrend = moods.map((m) => ({
      date: m.date.toISOString().split("T")[0],
      score: m.score,
      emotions: m.emotions,
    }));

    // ── Average mood ───────────────────────────────────────────────────────
    const avgMood =
      moods.length > 0
        ? parseFloat(
            (moods.reduce((s, m) => s + m.score, 0) / moods.length).toFixed(1)
          )
        : null;

    // ── Emotion frequency (for pie/bar chart) ─────────────────────────────
    const emotionCount = {};
    journals.forEach((j) => {
      const e = j.aiAnalysis.primaryEmotion;
      if (e) emotionCount[e] = (emotionCount[e] || 0) + 1;
    });
    const emotionBreakdown = Object.entries(emotionCount)
      .sort((a, b) => b[1] - a[1])
      .map(([emotion, count]) => ({ emotion, count }));

    // ── Common triggers (for word cloud / list) ───────────────────────────
    const triggerCount = {};
    journals.forEach((j) => {
      (j.aiAnalysis.triggers || []).forEach((t) => {
        triggerCount[t] = (triggerCount[t] || 0) + 1;
      });
    });
    const topTriggers = Object.entries(triggerCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([trigger, count]) => ({ trigger, count }));

    // ── Avg stress level ──────────────────────────────────────────────────
    const avgStress =
      journals.length > 0
        ? parseFloat(
            (
              journals.reduce((s, j) => s + (j.aiAnalysis.stressLevel || 5), 0) /
              journals.length
            ).toFixed(1)
          )
        : null;

    // ── Mood heatmap (for calendar) ───────────────────────────────────────
    const heatmapData = moods.reduce((acc, m) => {
      acc[m.date.toISOString().split("T")[0]] = m.score;
      return acc;
    }, {});

    res.json({
      success: true,
      analytics: {
        moodTrend,
        avgMood,
        avgStress,
        emotionBreakdown,
        topTriggers,
        heatmapData,
        totalMoodLogs: moods.length,
        totalJournalEntries: journals.length,
        dateRange: { from: since, to: new Date() },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
