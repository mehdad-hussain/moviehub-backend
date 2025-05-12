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
