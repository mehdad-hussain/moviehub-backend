import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { connectDB } from "./config/database.js";
import { envs } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";

// Connect to MongoDB
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json("Hello World!");
});

// Auth routes
app.use("/auth", authRoutes);

// Global error handler
app.use((err, req, res, _next) => {
  console.error("Server error:", err);
  res.status(500).json({
    message: "Internal server error",
    error: envs.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start the server
app.listen(envs.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${envs.port}`);
});
