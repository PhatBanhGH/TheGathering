import express from "express";
import {
  getUserProfile,
  getUserById,
  updateUserProfile,
} from "../controllers/userController.js";

const router = express.Router();

// Get user profile (current user)
router.get("/profile", getUserProfile);

// Get user by ID (public profile)
router.get("/:userId", getUserById);

// Update user profile
router.put("/profile", updateUserProfile);

export default router;

