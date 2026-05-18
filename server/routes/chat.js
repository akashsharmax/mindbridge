// routes/chat.js
const express = require("express");
const router = express.Router();
const { sendMessage, getHistory, getConversation, deleteConversation } = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.post("/", sendMessage);
router.get("/history", getHistory);
router.route("/:id").get(getConversation).delete(deleteConversation);

module.exports = router;
