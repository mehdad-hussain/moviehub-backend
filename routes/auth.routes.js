import express from "express";
import {
  getAllUsers,
  login,
  logout,
  refreshToken,
  register,
} from "../controllers/auth-controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.get("/users", authMiddleware, getAllUsers);

export default router;
