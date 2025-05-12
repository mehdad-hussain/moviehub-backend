/* eslint-disable no-console */

export function initMainNamespace(io) {
  io.on("connection", (socket) => {
    console.log(`User connected to main namespace: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`User disconnected from main namespace: ${socket.id}`);
    });
  });

  return io;
}
