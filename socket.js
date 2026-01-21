const { Server } = require("socket.io");
const User = require('./models/User');

let io;
const onlineCounts = new Map(); // userId -> active socket count

const broadcastPresence = (userId, isOnline, lastSeen = null) => {
  if (!io || !userId) return;
  const payload = {
    userId: userId.toString(),
    isOnline,
    lastSeen,
  };
  io.emit("presence:update", payload);
};

const markOnline = async (userId) => {
  const key = userId.toString();
  const nextCount = (onlineCounts.get(key) || 0) + 1;
  onlineCounts.set(key, nextCount);

  try {
    await User.findByIdAndUpdate(key, { isOnline: true, lastSeen: new Date() });
  } catch (err) {
    console.error("Failed to mark user online", key, err?.message || err);
  }

  broadcastPresence(key, true, null);
};

const markOffline = async (userId) => {
  const key = userId?.toString?.();
  if (!key) return;

  const current = onlineCounts.get(key) || 0;
  const next = current - 1;

  if (next > 0) {
    onlineCounts.set(key, next);
    return;
  }

  onlineCounts.delete(key);
  const lastSeen = new Date();

  try {
    await User.findByIdAndUpdate(key, { isOnline: false, lastSeen });
  } catch (err) {
    console.error("Failed to mark user offline", key, err?.message || err);
  }

  broadcastPresence(key, false, lastSeen);
};

const initSocket = (server) => {
  io = new Server(server, {
    // Allow common dev origins and support older clients if needed
    cors: {
      origin: [
        "http://localhost:3001", // React app
        "http://localhost:3000", // server dev origin or dashboard
        "http://localhost:5173", // other dev server
        "https://admin.socket.io" // optional admin UI
      ],
      credentials: true,
      methods: ["GET", "POST"]
    },
    // allowEIO3 to accept older socket.io-client v2 (optional)
    allowEIO3: true,
    transports: ["websocket", "polling"]
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // user joins their personal room
    socket.on("join", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined his room`);
      socket.data.userId = userId;
      markOnline(userId);

      // send current online users snapshot to the joining client
      const snapshot = Array.from(onlineCounts.keys()).map((id) => ({ userId: id, isOnline: true, lastSeen: null }));
      socket.emit("presence:state", snapshot);
    });

    socket.on("presence:request", () => {
      const snapshot = Array.from(onlineCounts.keys()).map((id) => ({ userId: id, isOnline: true, lastSeen: null }));
      socket.emit("presence:state", snapshot);
    });

    socket.on("ping-test", (cb) => {
      if (cb && typeof cb === 'function') cb({ ok: true, id: socket.id });
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", socket.id, reason);
      if (socket.data?.userId) {
        markOffline(socket.data.userId);
      }
    });

    socket.on("leave", (userId) => {
      markOffline(userId || socket.data?.userId);
    });
  });
};

// send a notification to a specific user room
const sendNotification = (userId, data) => {
  if (!io) return;
  const userIdStr = userId.toString ? userId.toString() : userId;
  io.to(userIdStr).emit("notification", data);
};

// send a message to a specific user room
const sendMessageToUser = (userId, event, data) => {
  if (!io) return;
  const userIdStr = userId.toString ? userId.toString() : userId;
  io.to(userIdStr).emit(event, data);
};

module.exports = {
  initSocket,
  sendNotification,
  sendMessageToUser,
};
