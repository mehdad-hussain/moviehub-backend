import jwt from "jsonwebtoken";
import User from "../../models/user.js";
import { envs } from "../env.js";

export async function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    // Verify token
    const decoded = jwt.verify(token, envs.jwt.accessSecret);

    // Find user
    const user = await User.findById(decoded.id).select("-password -refreshToken");

    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    // Set the user object in the socket
    socket.user = user;
    next();
  } catch (error) {
    console.error("Socket authentication error:", error.message);
    next(
      new Error(
        error.message === "jwt expired"
          ? "Authentication error: Token expired"
          : "Authentication error: Invalid token",
      ),
    );
  }
}
