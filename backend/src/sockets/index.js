import { Server } from "socket.io";
import { Notification } from "../models/notification.model.js";

const connectedUsers = new Map(); // Map userId -> socket.id

export const initSocket = (server) => {
  const url = process.env.NODE_ENV === 'production' ? process.env.LIVE_URL : process.env.CLIENT_URL;
  console.log("Socket CORS URL:", url);

  const io = new Server(server, {
    cors: {
      origin: url || "http://localhost:5173",
      credentials: true,
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("register", async (userId) => {
      console.log(`User ${userId} registered with socket ${socket.id}`);
      socket.userId = userId;
      connectedUsers.set(userId.toString(), socket.id);
      console.log("Connected users:", Array.from(connectedUsers.keys()));

      // Send undelivered notifications
      try {
        const undelivered = await Notification.find({ userId, delivered: false });
        console.log(`Found ${undelivered.length} undelivered notifications for user ${userId}`);

        for (const notif of undelivered) {
          io.to(socket.id).emit("notification", {
            _id: notif._id,
            title: notif.title,
            message: notif.message,
            time: notif.createdAt,
            isRead: notif.isRead
          });

          notif.delivered = true;
          await notif.save();
        }
      } catch (error) {
        console.error("Error sending undelivered notifications:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      if (socket.userId) {
        connectedUsers.delete(socket.userId.toString());
      }
    });
  });

  return io;
};

export const sendNotificationToUser = async (io, userId, data) => {
  const userIdStr = userId.toString();
  const socketId = connectedUsers.get(userIdStr);

  console.log(`Sending notification to user ${userIdStr}`);
  console.log(`Socket ID found: ${socketId || "User offline"}`);
  console.log("Current connected users in Map:", Array.from(connectedUsers.keys()));

  // Save notification to database
  const notification = await Notification.create({
    userId,
    title: data.title,
    message: data.message,
    delivered: !!socketId,
  });

  // Send via socket if user is online
  if (socketId) {
    console.log(`🚀 Emitting 'notification' event to socket ${socketId} for user ${userIdStr}`);
    io.to(socketId).emit("notification", {
      _id: notification._id,
      title: data.title,
      message: data.message,
      time: notification.createdAt,
      isRead: false
    });
    console.log(`✅ Notification event emitted successfully`);
  } else {
    console.log(`⚠️ User ${userIdStr} is offline. Notification saved to DB only.`);
    console.warn(`[SOCKET] User ${userIdStr} is offline. Notification saved for later.`);
  }

  return notification;
};

// Helper to check if user is online
export const isUserOnline = (userId) => {
  return connectedUsers.has(userId.toString());
};

// Helper to get connected users count
export const getConnectedUsersCount = () => {
  return connectedUsers.size;
};
