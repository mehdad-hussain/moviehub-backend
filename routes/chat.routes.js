import express from "express";
import { getChatHistory, getChatUsers } from "../controllers/chat-controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/users", getChatUsers);

router.get("/history/:userId", getChatHistory);

export default router;
