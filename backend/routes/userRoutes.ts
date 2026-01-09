import express from "express";
import {
  getUserProfile,
  updateUserProfile,
} from "../controllers/userController.js";

const router = express.Router();

// Get user profile
router.get("/profile", getUserProfile);

// Update user profile
router.put("/profile", updateUserProfile);

export default router;

