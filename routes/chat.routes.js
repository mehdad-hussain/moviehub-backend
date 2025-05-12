import express from "express";
import { getChatHistory, getChatUsers } from "../controllers/chat-controller.js";
import {
  addRoomMembers,
  createChatRoom,
  getChatRoomById,
  getRoomChatHistory,
  getUserChatRooms,
  leaveChatRoom,
} from "../controllers/chat-room-controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// Direct message routes
router.get("/users", getChatUsers);
router.get("/history/:userId", getChatHistory);

// Chat room routes
router.post("/rooms", createChatRoom);
router.get("/rooms", getUserChatRooms);
router.get("/rooms/:roomId", getChatRoomById);
router.get("/rooms/:roomId/history", getRoomChatHistory);
router.post("/rooms/:roomId/members", addRoomMembers);
router.delete("/rooms/:roomId/leave", leaveChatRoom);

export default router;
