// routes/insights.js
const express = require("express");
const router = express.Router();
const { getWeeklyInsight } = require("../controllers/insightsController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.get("/weekly", getWeeklyInsight);

module.exports = router;
