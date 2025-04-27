import { Server } from "socket.io";
import { envs } from "./env.js";

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: envs.frontendUrl,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // eslint-disable-next-line no-console
    console.log(`User connected: ${socket.id}`);

    socket.on("disconnect", () => {
      // eslint-disable-next-line no-console
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}
