// routes/crisis.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Crisis = require("../models/Crisis");
const User = require("../models/User");

router.use(protect);

// Get crisis event log for current user
router.get("/log", async (req, res) => {
  try {
    const events = await Crisis.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add trusted contact
router.post("/contacts", async (req, res) => {
  try {
    const { name, email, relationship } = req.body;
    const user = await User.findById(req.user.id);
    if (user.trustedContacts.length >= 5) {
      return res.status(400).json({ success: false, error: "Maximum 5 trusted contacts allowed" });
    }
    user.trustedContacts.push({ name, email, relationship });
    await user.save();
    res.json({ success: true, trustedContacts: user.trustedContacts });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Remove trusted contact
router.delete("/contacts/:contactId", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.trustedContacts = user.trustedContacts.filter(
      (c) => c._id.toString() !== req.params.contactId
    );
    await user.save();
    res.json({ success: true, trustedContacts: user.trustedContacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Acknowledge crisis (user confirms they're safe)
router.patch("/:id/acknowledge", async (req, res) => {
  try {
    const event = await Crisis.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { userAcknowledged: true, resolvedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
