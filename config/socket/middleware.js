import jwt from "jsonwebtoken";
import User from "../../models/user.js";
import { envs } from "../env.js";

export function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    // Verify token
    const decoded = jwt.verify(token, envs.jwt.accessSecret);

    // Find user
    User.findById(decoded.id)
      .select("-password -refreshToken")
      .then((user) => {
        if (!user) {
          return next(new Error("Authentication error: User not found"));
        }

        // Set the user object in the socket
        socket.user = user;
        next();
      })
      .catch((err) => {
        console.error("Socket authentication error:", err.message);
        next(new Error("Authentication error: User not found"));
      });
  } catch (error) {
    console.error("Socket authentication error:", error.message);
    next(new Error("Authentication error: Invalid token"));
  }
}
