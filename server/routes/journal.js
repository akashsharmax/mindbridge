// routes/journal.js
const express = require("express");
const router = express.Router();
const { createEntry, getEntries, getEntry, updateMoodAfter, deleteEntry } = require("../controllers/journalController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.route("/").post(createEntry).get(getEntries);
router.route("/:id").get(getEntry).delete(deleteEntry);
router.patch("/:id/mood-after", updateMoodAfter);

module.exports = router;
