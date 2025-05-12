import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
// eslint-disable-next-line perfectionist/sort-imports
import http from "node:http";
import { connectDB } from "./config/database.js";
import { envs } from "./config/env.js";
import { initSocket } from "./config/socket.js";
import { errorHandlerMiddleware, notFoundMiddleware } from "./middleware/global.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import movieRoutes from "./routes/movie.routes.js";

connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);

// Make io accessible to the request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

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

app.use("/auth", authRoutes);
app.use("/movies", movieRoutes);
app.use("/chat", chatRoutes);

app.use(notFoundMiddleware);

app.use(errorHandlerMiddleware);

server.listen(envs.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${envs.port}`);
});
