import { envs } from "../config/env.js";

// Not found middleware
export function notFoundMiddleware(req, res) {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
}

// Global error handler middleware
export function errorHandlerMiddleware(err, req, res, _next) {
  console.error("Server error:", err);
  res.status(500).json({
    message: "Internal server error",
    error: envs.nodeEnv === "development" ? err.message : undefined,
  });
}
