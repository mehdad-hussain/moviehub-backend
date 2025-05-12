/* eslint-disable no-console */
import ChatRoom from "../../models/chat-room.js";
import ChatMessage from "../../models/chat.js";
import { socketAuthMiddleware } from "./middleware.js";

let chatNamespace;
// Track disconnected users by their user ID (from token)
const disconnectedUsers = new Map(); // Map userId => {timestamp, chatState, socketId}

//  Join a socket to all chat rooms where the user is a member
async function joinUserRooms(socket) {
  try {
    const rooms = await ChatRoom.find({ members: socket.user._id });
    rooms.forEach((room) => {
      socket.join(room._id.toString());
      console.log(`User ${socket.user.name} joined room: ${room.name} (${room._id})`);
    });
  } catch (err) {
    console.error("Error joining user rooms:", err.message);
  }
}

export function initChatNamespace(io) {
  chatNamespace = io.of("/chat");

  chatNamespace.use(socketAuthMiddleware);

  chatNamespace.on("connection", (socket) => {
    console.log(`User connected to chat: ${socket.id}, User: ${socket.user.name}`);

    const userId = socket.user._id.toString();

    // Check if this is a reconnection within our window
    if (disconnectedUsers.has(userId)) {
      console.log(`User ${socket.user.name} reconnected within grace period`);

      // Here you can restore any chat state that was saved
      // const savedData = disconnectedUsers.get(userId);
      // Inform the user or other players about the reconnection
      socket.emit("reconnection-successful", {
        message: "Welcome back! Your chat session was preserved.",
      });

      // Delete from disconnected users map
      disconnectedUsers.delete(userId);
    }

    // Join a personal room based on the user ID
    socket.join(userId);

    // Join user's chat rooms
    joinUserRooms(socket);

    // Handle private messages
    socket.on("private-message", async (data) => {
      try {
        const { recipientId, message } = data;

        if (!recipientId || !message) {
          socket.emit("error", { message: "Recipient ID and message are required" });
          return;
        }

        // Create new message in DB
        const newMessage = await ChatMessage.create({
          sender: socket.user._id,
          recipient: recipientId,
          message,
          messageType: "direct",
        });

        const populatedMessage = await newMessage.populate("sender", "name email");

        // Send message to recipient if they are online
        chatNamespace.to(recipientId).emit("new-message", populatedMessage);

        // Confirm message sent back to the sender
        socket.emit("message-sent", populatedMessage);
      } catch (error) {
        console.error("Error sending private message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle room messages
    socket.on("room-message", async (data) => {
      try {
        const { roomId, message } = data;

        if (!roomId || !message) {
          socket.emit("error", { message: "Room ID and message are required" });
          return;
        }

        // Check if user is a member of the room
        const room = await ChatRoom.findOne({
          _id: roomId,
          members: socket.user._id,
        });

        if (!room) {
          socket.emit("error", { message: "You are not a member of this room" });
          return;
        }

        // Create new message in DB
        const newMessage = await ChatMessage.create({
          sender: socket.user._id,
          roomId,
          message,
          messageType: "room",
        });

        const populatedMessage = await newMessage.populate("sender", "name email");

        socket.to(roomId).emit("new-room-message", populatedMessage);
        socket.emit("message-sent", populatedMessage);
      } catch (error) {
        console.error("Error sending room message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle joining a room
    socket.on("join-room", async (roomId) => {
      try {
        if (!roomId) {
          socket.emit("error", { message: "Room ID is required" });
          return;
        }

        // Check if user is a member of the room
        const room = await ChatRoom.findOne({
          _id: roomId,
          members: socket.user._id,
        });

        if (!room) {
          socket.emit("error", { message: "You are not a member of this room" });
          return;
        }

        socket.join(roomId);
        console.log(`User ${socket.user.name} joined room: ${room.name} (${room._id})`);

        // Notify other room members
        socket.to(roomId).emit("user-joined-room", {
          roomId,
          user: {
            _id: socket.user._id,
            name: socket.user.name,
            email: socket.user.email,
          },
        });

        socket.emit("room-joined", { roomId, name: room.name });
      } catch (err) {
        console.error("Error joining room:", err);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Handle leaving a room
    socket.on("leave-room", async (roomId) => {
      try {
        if (!roomId) {
          socket.emit("error", { message: "Room ID is required" });
          return;
        }

        // Check if user is a member of the room
        const room = await ChatRoom.findOne({
          _id: roomId,
          members: socket.user._id,
        });

        if (!room) {
          socket.emit("error", { message: "You are not a member of this room" });
          return;
        }

        // Leave the socket.io room
        socket.leave(roomId);
        console.log(`User ${socket.user.name} left room: ${room.name} (${room._id})`);

        // Notify other room members
        socket.to(roomId).emit("user-left-room", {
          roomId,
          user: {
            _id: socket.user._id,
            name: socket.user.name,
            email: socket.user.email,
          },
        });

        socket.emit("room-left", { roomId, name: room.name });
      } catch (err) {
        console.error("Error leaving room:", err);
        socket.emit("error", { message: "Failed to leave room" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected from chat: ${socket.id}`);

      // Store the disconnected user with a timestamp and any chat state
      disconnectedUsers.set(userId, {
        timestamp: Date.now(),
        socketId: socket.id,
        // You can add any chat state here that needs to be preserved
        chatState: {}, // Add whatever chat state you need to preserve
      });

      // Set a timeout to clean up if user doesn't return in 10 seconds
      setTimeout(() => {
        // Check if this specific disconnect instance is still valid
        const disconnectData = disconnectedUsers.get(userId);
        if (disconnectData && disconnectData.socketId === socket.id) {
          console.log(`User ${socket.user.name} did not reconnect within 10 seconds`);

          // Clean up and remove from disconnected users
          disconnectedUsers.delete(userId);

          // Notify other players that this user has permanently left
          // For example:
          chatNamespace.emit("user-permanently-disconnected", {
            userId,
            userName: socket.user.name,
          });

          // Handle any chat state cleanup here
        }
      }, 10000); // 10 seconds
    });
  });

  return chatNamespace;
}

export function getChatNamespace() {
  if (!chatNamespace) {
    throw new Error("Chat namespace not initialized");
  }
  return chatNamespace;
}
