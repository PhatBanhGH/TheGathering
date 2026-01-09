import { Request, Response } from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email?: string;
  };
}

// Get user profile
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    ) as { userId: string };
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Update user profile
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    ) as { userId: string };
    const { username, avatar, status } = req.body;

    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (username) user.username = username;
    if (avatar) user.avatar = avatar;
    if (status) user.status = status;

    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
    });
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ message: err.message });
  }
};

