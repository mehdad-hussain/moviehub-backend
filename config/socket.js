import { Server } from "socket.io";
import { envs } from "./env.js";
import { getChatNamespace, initChatNamespace } from "./socket/chat-namespace.js";
import { initMainNamespace } from "./socket/main-namespace.js";

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: envs.frontendUrl,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Initialize namespaces
  initChatNamespace(io);
  initMainNamespace(io);

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

export { getChatNamespace };
