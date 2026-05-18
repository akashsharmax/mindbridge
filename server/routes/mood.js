// routes/mood.js
const express = require("express");
const router = express.Router();
const { logMood, getMoods, getAnalytics } = require("../controllers/moodController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.route("/").post(logMood).get(getMoods);
router.get("/analytics", getAnalytics);

module.exports = router;
