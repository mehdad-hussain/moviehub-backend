/* eslint-disable no-console */
import ChatRoom from "../../models/chat-room.js";
import ChatMessage from "../../models/chat.js";
import { socketAuthMiddleware } from "./middleware.js";

let chatNamespace;

//  Join a socket to all chat rooms where the user is a member
function joinUserRooms(socket) {
  ChatRoom.find({ members: socket.user._id })
    .then((rooms) => {
      rooms.forEach((room) => {
        socket.join(room._id.toString());
        console.log(`User ${socket.user.name} joined room: ${room.name} (${room._id})`);
      });
    })
    .catch((err) => {
      console.error("Error joining user rooms:", err.message);
    });
}

export function initChatNamespace(io) {
  chatNamespace = io.of("/chat");

  chatNamespace.use(socketAuthMiddleware);

  chatNamespace.on("connection", (socket) => {
    console.log(`User connected to chat: ${socket.id}, User: ${socket.user.name}`);

    // Join a personal room based on the user ID
    socket.join(socket.user._id.toString());

    // Join user's chat rooms
    joinUserRooms(socket);

    // Handle private messages
    socket.on("private-message", (data) => {
      try {
        const { recipientId, message } = data;

        if (!recipientId || !message) {
          socket.emit("error", { message: "Recipient ID and message are required" });
          return;
        }

        // Create new message in DB
        ChatMessage.create({
          sender: socket.user._id,
          recipient: recipientId,
          message,
          messageType: "direct",
        })
          .then((newMessage) => {
            return newMessage.populate("sender", "name email");
          })
          .then((populatedMessage) => {
            // Send message to recipient if they are online
            chatNamespace.to(recipientId).emit("new-message", populatedMessage);

            // Confirm message sent back to the sender
            socket.emit("message-sent", populatedMessage);
          })
          .catch((err) => {
            console.error("Error sending private message:", err);
            socket.emit("error", { message: "Failed to send message" });
          });
      } catch (error) {
        console.error("Error sending private message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle room messages
    socket.on("room-message", (data) => {
      try {
        const { roomId, message } = data;

        if (!roomId || !message) {
          socket.emit("error", { message: "Room ID and message are required" });
          return;
        }

        // Check if user is a member of the room
        ChatRoom.findOne({
          _id: roomId,
          members: socket.user._id,
        })
          .then((room) => {
            if (!room) {
              socket.emit("error", { message: "You are not a member of this room" });
              return Promise.reject(new Error("Not a room member"));
            }

            // Create new message in DB
            return ChatMessage.create({
              sender: socket.user._id,
              roomId,
              message,
              messageType: "room",
            });
          })
          .then((newMessage) => {
            return newMessage.populate("sender", "name email");
          })
          .then((populatedMessage) => {
            socket.to(roomId).emit("new-room-message", populatedMessage);

            socket.emit("message-sent", populatedMessage);
          })
          .catch((err) => {
            console.error("Error sending room message:", err);
            if (err.message !== "Not a room member") {
              socket.emit("error", { message: "Failed to send message" });
            }
          });
      } catch (error) {
        console.error("Error sending room message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle joining a room
    socket.on("join-room", (roomId) => {
      if (!roomId) {
        socket.emit("error", { message: "Room ID is required" });
        return;
      }

      // Check if user is a member of the room
      ChatRoom.findOne({
        _id: roomId,
        members: socket.user._id,
      })
        .then((room) => {
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
        })
        .catch((err) => {
          console.error("Error joining room:", err);
          socket.emit("error", { message: "Failed to join room" });
        });
    });

    // Handle leaving a room
    socket.on("leave-room", (roomId) => {
      if (!roomId) {
        socket.emit("error", { message: "Room ID is required" });
        return;
      }

      // Check if user is a member of the room
      ChatRoom.findOne({
        _id: roomId,
        members: socket.user._id,
      })
        .then((room) => {
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
        })
        .catch((err) => {
          console.error("Error leaving room:", err);
          socket.emit("error", { message: "Failed to leave room" });
        });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected from chat: ${socket.id}`);
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
