import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// Register
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Google OAuth Login/Create
router.post("/google", async (req: Request, res: Response): Promise<void> => {
  try {
    const { googleId, email, username, avatar } = req.body;

    if (!googleId || !email) {
      res.status(400).json({ message: "Google ID and email are required" });
      return;
    }

    // Find or create user
    let user = await User.findOne({ googleId });
    
    if (!user) {
      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        // Link Google account to existing user
        existingUser.googleId = googleId;
        if (avatar) existingUser.avatar = avatar;
        await existingUser.save();
        user = existingUser;
      } else {
        // Create new user
        user = new User({
          username: username || email.split("@")[0],
          email,
          googleId,
          avatar: avatar || "default",
          password: "", // OAuth users don't need password
        });
        await user.save();
      }
    } else {
      // Update avatar if provided
      if (avatar) {
        user.avatar = avatar;
        await user.save();
      }
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Google OAuth error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, recaptchaToken } = req.body;
    
    // Verify reCAPTCHA only if token is provided
    if (process.env.GOOGLE_RECAPTCHA_SECRET_KEY && recaptchaToken) {
      const recaptchaResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${process.env.GOOGLE_RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
      });
      const recaptchaData = await recaptchaResponse.json() as { success: boolean };
      if (!recaptchaData.success) {
        res.status(400).json({ message: "Xác thực CAPTCHA không thành công." });
        return;
      }
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Check password
    if (!user.password) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

