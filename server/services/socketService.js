/**
 * services/socketService.js — Real-time Socket.io Handler
 *
 * Manages WebSocket connections for:
 * 1. Joining user-specific rooms (for targeted events)
 * 2. Emitting crisis alerts to specific users
 * 3. Emitting AI analysis completion events
 *
 * Each user joins a room identified by their MongoDB user ID.
 * This lets us emit events to specific users from controllers.
 */

const jwt = require("jsonwebtoken");

const initSocket = (io) => {
  // Authenticate socket connections using JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log(`🔌 Socket connected: user ${userId}`);

    // Join user-specific room for targeted events
    socket.join(userId.toString());

    // Client acknowledges crisis resources were shown
    socket.on("crisis:acknowledged", (data) => {
      console.log(`✅ Crisis acknowledged by user ${userId}:`, data);
    });

    socket.on("disconnect", (reason) => {
      console.log(`❌ Socket disconnected: user ${userId} (${reason})`);
    });
  });
};

module.exports = { initSocket };
