import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { connectDB } from "./config/database.js";
import { envs } from "./config/env.js";
import { errorHandlerMiddleware, notFoundMiddleware } from "./middleware/global.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import movieRoutes from "./routes/movie.routes.js";

// Connect to MongoDB
connectDB();

const app = express();

app.use(
  cors({
    origin: envs.frontendUrl,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json("Hello World!");
});

// Auth routes
app.use("/auth", authRoutes);
// Movie routes
app.use("/movies", movieRoutes);

// Handle 404 errors (route not found)
app.use(notFoundMiddleware);

// Global error handler
app.use(errorHandlerMiddleware);

// Start the server
app.listen(envs.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${envs.port}`);
});
