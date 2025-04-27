import express from "express";
import {
  createMovie,
  getMovieById,
  getMovies,
  rateMovie,
} from "../controllers/movie-controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getMovies);
router.get("/:id", getMovieById);

// Protected routes
router.post("/", authMiddleware, createMovie);
router.post("/:id/rate", authMiddleware, rateMovie);

export default router;
