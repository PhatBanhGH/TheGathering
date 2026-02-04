import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {
  validatePassword,
  isCommonPassword,
  sanitizeString,
  isValidEmail,
  isValidUsername,
} from "../utils/validators.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";
import {
  isAccountLocked,
  recordFailedAttempt,
  clearFailedAttempts,
  getLockoutTimeRemaining,
} from "../utils/accountLockout.js";
import {
  createSession,
  refreshAccessToken,
  deleteSession,
  deleteAllUserSessions,
} from "../utils/tokenManager.js";
import { authenticate } from "../middleware/security.js";

const router = express.Router();

// Register
router.post(
  "/register",
  authRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Sanitize and validate input
      const username = sanitizeString(req.body.username || "");
      const email = sanitizeString(req.body.email || "").toLowerCase();
      const password = req.body.password || "";

      // Validate input
      if (!username || !email || !password) {
        res
          .status(400)
          .json({ message: "Username, email, and password are required" });
        return;
      }

      if (!isValidUsername(username)) {
        res.status(400).json({
          message:
            "Username must be 3-20 characters, alphanumeric with underscores only, and cannot start with underscore",
        });
        return;
      }

      if (!isValidEmail(email)) {
        res.status(400).json({ message: "Invalid email format" });
        return;
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          message: "Password validation failed",
          errors: passwordValidation.errors,
        });
        return;
      }

      // Check for common passwords
      if (isCommonPassword(password)) {
        res.status(400).json({
          message: "Password is too common. Please choose a stronger password.",
        });
        return;
      }

      // Check if user exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        res.status(400).json({ message: "User already exists" });
        return;
      }

      // Hash password with higher salt rounds for better security
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = new User({
        username,
        email,
        password: hashedPassword,
      });

      await user.save();

      // Create session with refresh token
      const deviceInfo = req.headers["user-agent"] || "Unknown";
      const ipAddress = req.ip || req.socket.remoteAddress || "Unknown";
      const { accessToken, refreshToken } = await createSession(
        user._id.toString(),
        deviceInfo,
        ipAddress,
        req.headers["user-agent"]
      );

      res.status(201).json({
        accessToken,
        refreshToken,
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
  }
);

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

    // Create session with refresh token
    const deviceInfo = req.headers["user-agent"] || "Unknown";
    const ipAddress = req.ip || req.socket.remoteAddress || "Unknown";
    const { accessToken, refreshToken } = await createSession(
      user._id.toString(),
      deviceInfo,
      ipAddress,
      req.headers["user-agent"]
    );

    res.json({
      accessToken,
      refreshToken,
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


// Check email availability
router.post("/check-email", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }
    const user = await User.findOne({ email });
    res.json({ exists: !!user });
  } catch (error) {
    console.error("Check email error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Forgot password (stub)
router.post("/forgot-password", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }
    // Logic to send reset password email would go here
    // For now, we just return success to unblock the frontend
    res.json({ message: "If your email exists, you will receive a password reset link." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post(
  "/login",
  authRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Sanitize input
      const email = sanitizeString(req.body.email || "").toLowerCase();
      const password = req.body.password || "";
      const recaptchaToken = req.body.recaptchaToken;

      // Validate input
      if (!email || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
      }

      if (!isValidEmail(email)) {
        res.status(400).json({ message: "Invalid email format" });
        return;
      }

      // Check if account is locked
      if (isAccountLocked(email)) {
        const remaining = getLockoutTimeRemaining(email);
        res.status(423).json({
          message: `Account is temporarily locked due to too many failed login attempts. Please try again in ${remaining} seconds.`,
          lockoutUntil: remaining,
        });
        return;
      }

      // Verify reCAPTCHA only if token is provided
      if (process.env.GOOGLE_RECAPTCHA_SECRET_KEY && recaptchaToken) {
        const recaptchaResponse = await fetch(
          "https://www.google.com/recaptcha/api/siteverify",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `secret=${process.env.GOOGLE_RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
          }
        );
        const recaptchaData = (await recaptchaResponse.json()) as {
          success: boolean;
        };
        if (!recaptchaData.success) {
          res
            .status(400)
            .json({ message: "Xác thực CAPTCHA không thành công." });
          return;
        }
      }

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        // Record failed attempt even if user doesn't exist (prevent email enumeration)
        recordFailedAttempt(email);
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      // Check password
      if (!user.password) {
        recordFailedAttempt(email);
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        const { isLocked, remainingAttempts } = recordFailedAttempt(email);
        if (isLocked) {
          res.status(423).json({
            message: `Too many failed login attempts. Account locked for 15 minutes.`,
            lockoutUntil: 900,
          });
        } else {
          res.status(401).json({
            message: "Invalid credentials",
            remainingAttempts,
          });
        }
        return;
      }

      // Clear failed attempts on successful login
      clearFailedAttempts(email);

      // Update last seen
      user.lastSeen = new Date();
      await user.save();

      // Create session with refresh token
      const deviceInfo = req.headers["user-agent"] || "Unknown";
      const ipAddress = req.ip || req.socket.remoteAddress || "Unknown";
      const { accessToken, refreshToken } = await createSession(
        user._id.toString(),
        deviceInfo,
        ipAddress,
        req.headers["user-agent"]
      );

      res.json({
        accessToken,
        refreshToken,
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
  }
);

// Refresh access token
router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: "Refresh token is required" });
      return;
    }

    const result = await refreshAccessToken(refreshToken);

    if (!result) {
      res.status(401).json({ message: "Invalid or expired refresh token" });
      return;
    }

    res.json({
      accessToken: result.accessToken,
      refreshToken: result.newRefreshToken || refreshToken, // Return same token if not rotated
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout (delete session)
router.post("/logout", async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: "Refresh token is required" });
      return;
    }

    await deleteSession(refreshToken);

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout from all devices
router.post(
  "/logout-all",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const deletedCount = await deleteAllUserSessions(userId);

      res.json({
        message: "Logged out from all devices",
        deletedSessions: deletedCount,
      });
    } catch (error) {
      console.error("Logout all error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
