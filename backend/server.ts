import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { sanitizeBody, sanitizeQuery } from "./middleware/security.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { requestLogger, errorHandler, notFoundHandler } from "./middleware/logging.js";
import { logger } from "./utils/logger.js";

// Import existing routes and models
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chatRoutes.js";
import worldRoutes from "./routes/worldRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import spaceRoutes from "./routes/spaceRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import { registerChatHandlers } from "./controllers/chatController.js";
import Room from "./models/Room.js";
import RoomMember from "./models/RoomMember.js";

// Tải biến môi trường
dotenv.config();

const app = express();
const httpServer = createServer(app); // Sử dụng httpServer cho Socket.IO
const PORT = process.env.PORT || 5001; // Default to 5001 as per previous fix

// Middleware CORS
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json());

// Apply input sanitization middleware globally
app.use(sanitizeBody);
app.use(sanitizeQuery);

// Health check endpoint (before rate limiting)
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ 
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

// Apply rate limiting to all API routes
app.use("/api", apiRateLimiter);

// Socket.IO Setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/gather-town")
  .then(() => logger.info("MongoDB connected successfully"))
  .catch((err) => logger.error("MongoDB connection error", err));

// ----------------------------------------------------------------
// PHẦN LOGIC AUTH (Google + OTP)
// ----------------------------------------------------------------

interface OtpEntry {
  code: string;
  expires: number;
}

const otpStore = new Map<string, OtpEntry>();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || "your-very-secret-key-fallback";
const OTP_EXPIRATION_MS = 5 * 60 * 1000; // 5 phút

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function createEmailTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// === ROUTE XÁC THỰC GOOGLE ===
app.post("/api/auth/google", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error("Invalid Google token");
    }
    console.log("✅ [Verified] Xác thực Google thành công cho:", payload.email);

    // Kiểm tra xem user đã tồn tại chưa, nếu chưa thì tạo mới (Optional - tùy logic game)
    // Hiện tại chỉ trả về token
    const serverToken = jwt.sign(
      { email: payload.email, name: payload.name },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    res
      .status(200)
      .json({ message: "Xác thực Google thành công", serverToken });
  } catch (error) {
    console.error("Lỗi xác thực Google:", error);
    res.status(401).json({ message: "Xác thực thất bại." });
  }
});

// === ROUTE OTP ===
app.post("/api/auth/send-otp", async (req: Request, res: Response) => {
  try {
    const { email, recaptchaToken } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Vui lòng nhập email." });
    }

    // == XÁC THỰC RECAPTCHA ==
    // Nếu không có secret key (dev mode), có thể bỏ qua hoặc warn
    if (process.env.GOOGLE_RECAPTCHA_SECRET_KEY) {
      const recaptchaResponse = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=${process.env.GOOGLE_RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
        }
      );
      const recaptchaData = await recaptchaResponse.json();
      if (!recaptchaData.success) {
        return res
          .status(400)
          .json({ message: "Xác thực CAPTCHA không thành công." });
      }
      console.log("✅ [Verified] Xác thực reCAPTCHA thành công cho:", email);
    } else {
      console.warn(
        "⚠️ Skipping reCAPTCHA verification: GOOGLE_RECAPTCHA_SECRET_KEY not set"
      );
    }

    const code = generateOtp();
    const expires = Date.now() + OTP_EXPIRATION_MS;

    otpStore.set(email, { code, expires });
    console.log(`Đã tạo mã OTP ${code} cho ${email}`);

    const transporter = await createEmailTransporter();
    const mailOptions = {
      from: '"Gather Clone" <noreply@gatherclone.com>',
      to: email,
      subject: "Mã xác thực đăng nhập",
      text: `Mã xác thực của bạn là: ${code}. Mã này sẽ hết hạn sau 5 phút.`,
      html: `<b>Mã xác thực của bạn là: ${code}</b><p>Mã này sẽ hết hạn sau 5 phút.</p>`,
    };

    await transporter.sendMail(mailOptions);
    res
      .status(200)
      .json({ message: "Mã OTP đã được gửi. Vui lòng kiểm tra email." });
  } catch (error) {
    console.error("Lỗi khi gửi OTP:", error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
  }
});

app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập email và mã OTP." });
    }

    const storedEntry = otpStore.get(email);
    if (!storedEntry) {
      return res
        .status(400)
        .json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn." });
    }
    if (Date.now() > storedEntry.expires) {
      otpStore.delete(email);
      return res.status(400).json({ message: "Mã OTP đã hết hạn." });
    }
    if (storedEntry.code !== otp) {
      return res.status(400).json({ message: "Mã OTP không chính xác." });
    }

    otpStore.delete(email);

    const token = jwt.sign({ email: email }, JWT_SECRET, {
      expiresIn: "1h",
    });

    console.log(`✅ Xác thực thành công cho ${email}`);
    res.status(200).json({ message: "Đăng nhập thành công!", token: token });
  } catch (error) {
    console.error("Lỗi khi xác minh OTP:", error);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ." });
  }
});

// ----------------------------------------------------------------
// EXISTING ROUTES & GAME LOGIC
// ----------------------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/world", worldRoutes);
app.use("/api/users", userRoutes);
app.use("/api/spaces", spaceRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/search", searchRoutes);

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Room users endpoint - must be before errorHandler
app.get("/api/rooms/:roomId/users", async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    
    // Get all room members from database (including offline)
    const allMembers = await RoomMember.find({ roomId }).lean();
    
    // Get online users from connectedUsers
    const onlineUserIds = new Set(
      Array.from(connectedUsers.values())
        .filter((u) => u.roomId === roomId)
        .map((u) => u.userId)
    );
    
    // Combine database members with online status
    const users = allMembers.map((member) => {
      const connectedUser = Array.from(connectedUsers.values()).find(
        (u) => u.userId === member.userId && u.roomId === roomId
      );
      
      return {
        userId: member.userId,
        username: member.username,
        avatar: member.avatar,
        position: connectedUser?.position || { x: 0, y: 0 },
        status: onlineUserIds.has(member.userId) ? "online" : "offline",
        lastSeen: member.lastSeen,
      };
    });
    
    res.json(users);
  } catch (error) {
    console.error("Error fetching room users:", error);
    res.status(500).json({ message: "Failed to fetch room users" });
  }
});

// Error handling middleware is already imported and used above

// Socket.IO Connection Handling
interface ConnectedUser {
  userId: string;
  username: string;
  roomId: string;
  avatar?: string;
  position: { x: number; y: number };
  direction?: string;
  socketId: string;
}

interface GroupChat {
  id: string;
  name: string;
  members: string[];
  roomId: string;
  createdBy: string;
  createdAt: number;
}

const connectedUsers = new Map<string, ConnectedUser>(); // socketId -> userData
const roomUsers = new Map<string, Set<string>>(); // roomId -> Set of socketIds
const groupChats = new Map<string, GroupChat>(); // groupId -> { id, name, members, roomId, createdBy }
const voiceChannels = new Map<string, Set<string>>(); // channelId -> Set of userIds (GLOBAL, shared across all connections)
const batchUpdateIntervals = new Map<string, NodeJS.Timeout>(); // roomId -> interval for batch position updates

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // User joins with user data
  socket.on("user-join", async (data) => {
    try {
      const { userId, username, roomId, avatar, position } = data;
      const startPosition =
        position &&
        typeof position.x === "number" &&
        typeof position.y === "number"
          ? position
          : { x: 100, y: 100 };

      // Validate username
      if (!username || username.trim() === "") {
        socket.emit("error", { message: "Tên người dùng không được để trống" });
        return;
      }

      // Get or create room
      let room = await Room.findOne({ roomId });
      if (!room) {
        room = new Room({
          roomId,
          name: `Room ${roomId}`,
          maxUsers: Number(process.env.DEFAULT_ROOM_CAPACITY) || 20,
        });
        await room.save();
      }

      // Check for duplicate username in room
      const existingUsersInRoom = Array.from(roomUsers.get(roomId) || [])
        .map((id) => connectedUsers.get(id))
        .filter(Boolean);

      const duplicateUser = existingUsersInRoom.find(
        (u) =>
          u && u.username.toLowerCase().trim() === username.toLowerCase().trim()
      );

      if (duplicateUser) {
        socket.emit("error", {
          message: `Tên "${username}" đã được sử dụng trong phòng này. Vui lòng chọn tên khác.`,
        });
        return;
      }

      // Check room capacity
      const currentUserCount = roomUsers.get(roomId)?.size || 0;
      if (currentUserCount >= room.maxUsers) {
        socket.emit("room-full", {
          message: `Phòng đã đầy (${room.maxUsers}/${room.maxUsers} người)`,
          maxUsers: room.maxUsers,
          currentUsers: currentUserCount,
        });
        return;
      }

      // Store user connection
      connectedUsers.set(socket.id, {
        userId,
        username: username.trim(),
        roomId,
        avatar,
        position: startPosition, // Use client-provided or default position
        socketId: socket.id,
      });

      // Add to room FIRST
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Set());
      }
      roomUsers.get(roomId).add(socket.id);
      socket.join(roomId);

      // Save/Update RoomMember in database FIRST (mark as online)
      // Use upsert with proper error handling to prevent race conditions
      try {
        await RoomMember.findOneAndUpdate(
          { roomId, userId },
          {
            roomId,
            userId,
            username: username.trim(),
            avatar: avatar || username.trim().charAt(0).toUpperCase(),
            isOnline: true,
            lastSeen: new Date(),
            $setOnInsert: { joinedAt: new Date() },
          },
          { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true,
            // Use runValidators to ensure data integrity
            runValidators: true
          }
        );
        console.log(`Updated RoomMember ${userId} to online in room ${roomId}`);
      } catch (error: any) {
        // Handle duplicate key errors (race condition)
        if (error.code === 11000) {
          // Duplicate key - try to update existing record
          console.log(`Duplicate key detected for ${userId} in room ${roomId}, updating existing record...`);
          try {
            await RoomMember.findOneAndUpdate(
              { roomId, userId },
              {
                username: username.trim(),
                avatar: avatar || username.trim().charAt(0).toUpperCase(),
                isOnline: true,
                lastSeen: new Date(),
              },
              { new: true }
            );
            console.log(`Updated existing RoomMember ${userId} to online in room ${roomId}`);
          } catch (updateError) {
            console.error("Error updating existing RoomMember:", updateError);
          }
        } else {
          console.error("Error saving RoomMember:", error);
        }
      }

      // Load ALL room members from database AFTER updating
      let allRoomMembers: Array<{
        userId: string;
        username: string;
        avatar: string;
        roomId: string;
        isOnline: boolean;
        lastSeen: Date;
        [key: string]: unknown;
      }> = [];
      try {
        allRoomMembers = await RoomMember.find({ roomId }).lean();
        
        // Calculate online status AFTER user has been added to roomUsers
        const onlineUserIds = new Set(
          Array.from(roomUsers.get(roomId) || [])
            .map((id) => connectedUsers.get(id)?.userId)
            .filter(Boolean)
        );
        
        console.log(`Room ${roomId} online users:`, Array.from(onlineUserIds));
        
        // Update isOnline status based on actual connections
        allRoomMembers = allRoomMembers.map((member) => ({
          ...member,
          isOnline: onlineUserIds.has(member.userId),
        }));
      } catch (error) {
        console.error("Error loading RoomMembers:", error);
      }

      // Prepare ALL room members list (online + offline) with correct status
      // Use Map to deduplicate by userId (in case of database duplicates)
      const usersMap = new Map();
      allRoomMembers.forEach((member) => {
        // Get position from connected users if online
        const connectedUser = Array.from(connectedUsers.values()).find(
          (u) => u.userId === member.userId && u.roomId === roomId
        );
        
        const userStatus = member.isOnline ? "online" : "offline";
        
        // Deduplicate: if same userId exists, keep the latest one
        usersMap.set(member.userId, {
          userId: member.userId,
          username: member.username,
          avatar: member.avatar,
          position: connectedUser?.position || { x: 0, y: 0 },
          direction: connectedUser?.direction,
          status: userStatus,
        });
      });
      
      const allUsersInRoom = Array.from(usersMap.values());
      
      // Log duplicates if any
      if (allRoomMembers.length !== usersMap.size) {
        console.warn(`⚠️ Found ${allRoomMembers.length - usersMap.size} duplicate RoomMembers in database for room ${roomId}`);
      }
      
      console.log(`Broadcasting user-joined for ${username} (${userId}) to room ${roomId}`);
      
      // Notify others in room - IMMEDIATELY broadcast user-joined
      io.to(roomId).emit("user-joined", {
        userId,
        username: username.trim(),
        avatar,
        position: startPosition,
        status: "online", // Explicitly set status
      });

      // Broadcast updated room-users list to ALL users in room (realtime update)
      // This ensures all users see the updated status immediately
      // Filter out current user and deduplicate
      const usersToBroadcast = allUsersInRoom.filter(m => m.userId !== userId);
      console.log(`📢 Broadcasting room-users to ALL users in room ${roomId}:`, usersToBroadcast.length, "users");
      console.log("📢 Users to broadcast:", usersToBroadcast.map(u => ({ userId: u.userId, username: u.username, status: u.status })));
      
      // IMPORTANT: Broadcast to ALL users in room using io.to() - this ensures realtime update for everyone
      // This includes the new user's other tabs and all other users in the room
      io.to(roomId).emit("room-users", usersToBroadcast);
      console.log(`✅ Broadcasted room-users event to room ${roomId}`);

      // Send all players positions including the new user
      const allPlayersInRoom = Array.from(roomUsers.get(roomId))
        .map((id) => {
          const u = connectedUsers.get(id);
          if (u) {
            return {
              userId: u.userId,
              username: u.username,
              avatar: u.avatar,
              position: u.position,
              direction: u.direction,
            };
          }
          return null;
        })
        .filter(Boolean);

      socket.emit("allPlayersPositions", allPlayersInRoom);

      // Emit room info with user count
      const finalUserCount = roomUsers.get(roomId)?.size || 0;
      io.to(roomId).emit("room-info", {
        roomId,
        currentUsers: finalUserCount,
        maxUsers: room.maxUsers,
      });

      console.log(
        `${username.trim()} joined room ${roomId} (${finalUserCount}/${
          room.maxUsers
        })`
      );

      // Start batch position update interval for this room if not already started
      startBatchUpdateForRoom(roomId);
    } catch (error) {
      console.error("Error in user-join:", error);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  // Handle avatar movement
  socket.on("playerMovement", (data) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.position = data.position || { x: data.x, y: data.y };
      user.direction = data.direction;

      // Emit individual player movement to others in room (real-time)
      socket.to(user.roomId).emit("playerMoved", {
        userId: user.userId,
        username: user.username,
        position: user.position,
        direction: user.direction,
      });

      // Batch update is now sent via interval (see below) to reduce network traffic
    }
  });

  // Batch position updates - send all players positions periodically (every 500ms)
  // This reduces network traffic while still keeping positions synchronized
  // Start batch update interval for room if not already started
  const startBatchUpdateForRoom = (roomId: string) => {
    if (!batchUpdateIntervals.has(roomId)) {
      const interval = setInterval(() => {
        if (!roomUsers.has(roomId) || roomUsers.get(roomId)?.size === 0) {
          clearInterval(interval);
          batchUpdateIntervals.delete(roomId);
          return;
        }

        const allPlayersInRoom = Array.from(roomUsers.get(roomId) || [])
          .map((id) => {
            const u = connectedUsers.get(id);
            if (u) {
              return {
                userId: u.userId,
                username: u.username,
                avatar: u.avatar,
                position: u.position,
                direction: u.direction,
              };
            }
            return null;
          })
          .filter(Boolean);

        // Broadcast to all users in room
        if (allPlayersInRoom.length > 0) {
          io.to(roomId).emit("allPlayersPositions", allPlayersInRoom);
        }
      }, 500); // Every 500ms

      batchUpdateIntervals.set(roomId, interval);
    }
  };

  // Handle reactions
  socket.on("reaction", (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    io.to(user.roomId).emit("reaction", {
      userId: user.userId,
      reaction: data.reaction,
      timestamp: data.timestamp || Date.now(),
    });
  });

  registerChatHandlers({ io, socket, connectedUsers, roomUsers, groupChats });

  // Whiteboard handlers
  socket.on("whiteboard-draw", (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    socket.to(user.roomId).emit("whiteboard-draw", {
      ...data,
      userId: user.userId,
      username: user.username,
    });
  });

  // WebRTC Signaling
  socket.on("webrtc-offer", (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const { targetUserId, offer } = data;
    const targetUser = Array.from(connectedUsers.values()).find(
      (u) => u.userId === targetUserId && u.roomId === user.roomId
    );

    if (targetUser) {
      io.to(targetUser.socketId).emit("webrtc-offer", {
        fromUserId: user.userId,
        offer,
      });
    } else {
      console.warn(`Target user ${targetUserId} not found for WebRTC offer`);
    }
  });

  socket.on("webrtc-answer", (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const { targetUserId, answer } = data;
    const targetUser = Array.from(connectedUsers.values()).find(
      (u) => u.userId === targetUserId && u.roomId === user.roomId
    );

    if (targetUser) {
      io.to(targetUser.socketId).emit("webrtc-answer", {
        fromUserId: user.userId,
        answer,
      });
    } else {
      console.warn(`Target user ${targetUserId} not found for WebRTC answer`);
    }
  });

  socket.on("webrtc-ice-candidate", (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const { targetUserId, candidate } = data;
    const targetUser = Array.from(connectedUsers.values()).find(
      (u) => u.userId === targetUserId && u.roomId === user.roomId
    );

    if (targetUser) {
      io.to(targetUser.socketId).emit("webrtc-ice-candidate", {
        fromUserId: user.userId,
        candidate,
      });
    } else {
      console.warn(
        `Target user ${targetUserId} not found for WebRTC ICE candidate`
      );
    }
  });

  // Voice Channel Management (using global voiceChannels Map defined above)
  socket.on("join-voice-channel", (data: { channelId: string; userId: string; roomId: string }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) {
      console.warn("join-voice-channel: User not found in connectedUsers");
      return;
    }

    const { channelId, userId, roomId } = data;

    // Verify user is in the same room
    if (user.roomId !== roomId) {
      console.warn(`User ${userId} tried to join voice channel in different room. User room: ${user.roomId}, Requested room: ${roomId}`);
      return;
    }

    // Initialize channel if it doesn't exist
    if (!voiceChannels.has(channelId)) {
      voiceChannels.set(channelId, new Set());
      console.log(`Created new voice channel: ${channelId}`);
    }

    // Add user to channel
    voiceChannels.get(channelId)?.add(userId);

    // Get all users in this voice channel
    const channelUsers = Array.from(voiceChannels.get(channelId) || []);

    console.log(`User ${user.username} (${userId}) joined voice channel ${channelId}. Total users: ${channelUsers.length}`, channelUsers);

    // Get all sockets in the room
    const roomSockets = Array.from(roomUsers.get(roomId) || []);
    console.log(`Broadcasting to ${roomSockets.length} sockets in room ${roomId}`);

    // Broadcast to all users in the room (including the user who just joined)
    const updateData = {
      channelId,
      users: channelUsers,
    };
    
    console.log(`✅ Broadcasting voice-channel-update for channel ${channelId} to room ${roomId} with ${channelUsers.length} users:`, channelUsers);
    console.log(`✅ Room ${roomId} has ${roomSockets.length} sockets:`, roomSockets);
    
    // Broadcast to all sockets in the room
    io.to(roomId).emit("voice-channel-update", updateData);
    
    // Also send directly to the socket to ensure it receives the update immediately
    socket.emit("voice-channel-update", updateData);
    console.log(`✅ Also sent voice-channel-update directly to socket ${socket.id}`);
  });

  socket.on("leave-voice-channel", (data: { channelId: string; userId: string; roomId: string }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const { channelId, userId, roomId } = data;

    // Remove user from channel
    const channel = voiceChannels.get(channelId);
    if (channel) {
      channel.delete(userId);
      
      // If channel is empty, remove it
      if (channel.size === 0) {
        voiceChannels.delete(channelId);
      }

      // Get updated users list
      const channelUsers = Array.from(channel);

      console.log(`User ${user.username} (${userId}) left voice channel ${channelId}. Remaining users: ${channelUsers.length}`, channelUsers);

      // Broadcast to all users in the room
      io.to(roomId).emit("voice-channel-update", {
        channelId,
        users: channelUsers,
      });

      console.log(`Broadcasted voice-channel-update for channel ${channelId} to room ${roomId} with ${channelUsers.length} users`);
    }
  });

  // Handle disconnect
  socket.on("disconnect", async () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`User ${user.username} (${user.userId}) is disconnecting`);
      
      // Store user info before removing
      const userId = user.userId;
      const roomId = user.roomId;
      const username = user.username;
      
      // Remove from roomUsers first
      if (roomUsers.has(roomId)) {
        roomUsers.get(roomId).delete(socket.id);
        if (roomUsers.get(roomId).size === 0) {
          roomUsers.delete(roomId);
        }
      }

      // Remove from connectedUsers
      connectedUsers.delete(socket.id);

      // Check if user still has other connections in this room
      const remainingInRoom = Array.from(roomUsers.get(roomId) || [])
        .map((id) => connectedUsers.get(id))
        .filter((u) => u && u.userId === userId);
      
      const hasOtherConnections = remainingInRoom.length > 0;

      // Remove user from all voice channels
      voiceChannels.forEach((channelUsers, channelId) => {
        if (channelUsers.has(userId)) {
          channelUsers.delete(userId);
          if (channelUsers.size === 0) {
            voiceChannels.delete(channelId);
          }
          // Broadcast updated voice channel
          io.to(roomId).emit("voice-channel-update", {
            channelId,
            users: Array.from(channelUsers),
          });
          console.log(`Removed user ${userId} from voice channel ${channelId} on disconnect`);
        }
      });

      // IMMEDIATELY broadcast user-left event (realtime)
      io.to(roomId).emit("user-left", {
        userId,
        username,
        timestamp: Date.now(),
      });
      console.log(`Broadcasted user-left for ${username} to room ${roomId}`);

      // Update RoomMember to offline in database if no other connections
      // Use atomic update to prevent race conditions
      if (!hasOtherConnections) {
        try {
          console.log(`Marking user ${userId} as offline in database`);
          await RoomMember.findOneAndUpdate(
            { roomId, userId },
            {
              isOnline: false,
              lastSeen: new Date(),
            },
            {
              // Ensure atomic update
              new: false, // Don't return updated doc, just update
              runValidators: true
            }
          );
          
          // Broadcast updated room members list to all users in room (with correct status)
          try {
            const allRoomMembers = await RoomMember.find({ roomId }).lean();
            const onlineUserIds = new Set(
              Array.from(roomUsers.get(roomId) || [])
                .map((id) => connectedUsers.get(id)?.userId)
                .filter((id): id is string => id !== undefined)
            );
            
            // Use Map to deduplicate by userId (in case of database duplicates)
            const membersMap = new Map<string, any>();
            allRoomMembers.forEach((member) => {
              // Get position from connected users if online
              const connectedUser = Array.from(connectedUsers.values()).find(
                (u) => u.userId === member.userId && u.roomId === roomId
              );
              
              // Deduplicate: if same userId exists, keep the latest one
              membersMap.set(member.userId, {
                userId: member.userId,
                username: member.username,
                avatar: member.avatar,
                position: connectedUser?.position || { x: 0, y: 0 },
                direction: connectedUser?.direction,
                status: onlineUserIds.has(member.userId) ? "online" : "offline",
              });
            });
            
            const updatedMembers = Array.from(membersMap.values());
            
            // Log duplicates if any
            if (allRoomMembers.length !== membersMap.size) {
              console.warn(`⚠️ Found ${allRoomMembers.length - membersMap.size} duplicate RoomMembers in database for room ${roomId}`);
            }
            
            // Send updated list to all users in room (INCLUDING the disconnected user with offline status)
            // This ensures other users see the user as offline, not removed from the list
            io.to(roomId).emit("room-users", updatedMembers);
            console.log(`Broadcasted updated room-users to room ${roomId} (${updatedMembers.length} members, including offline users)`);
          } catch (error) {
            console.error("Error broadcasting updated room members:", error);
          }
        } catch (error) {
          console.error("Error updating RoomMember on disconnect:", error);
        }
      } else {
        console.log(`User ${userId} still has ${remainingInRoom.length} other connections, not marking offline`);
      }

      const finalUserCount = roomUsers.get(user.roomId)?.size || 0;
      if (roomUsers.has(user.roomId)) {
        try {
          const room = await Room.findOne({ roomId: user.roomId });
          if (room) {
            io.to(user.roomId).emit("room-info", {
              roomId: user.roomId,
              currentUsers: finalUserCount,
              maxUsers: room.maxUsers,
            });
          }
        } catch (error) {
          console.error("Error updating room info on disconnect:", error);
        }
      }

      // Note: connectedUsers.delete was already called above, so this is redundant
      // But keeping for safety - check if it exists first
      if (connectedUsers.has(socket.id)) {
        connectedUsers.delete(socket.id);
      }

      // Cleanup batch update interval if room is empty
      if (roomUsers.has(roomId) && roomUsers.get(roomId)?.size === 0) {
        const interval = batchUpdateIntervals.get(roomId);
        if (interval) {
          clearInterval(interval);
          batchUpdateIntervals.delete(roomId);
          console.log(`Cleaned up batch update interval for room ${roomId}`);
        }
      }

      console.log(`${user.username} (${user.userId}) disconnected and removed from connectedUsers`);
    } else {
      console.log(`Socket ${socket.id} disconnected but was not in connectedUsers`);
    }
  });
});

httpServer.listen(PORT, () => {
  logger.info(`Backend server running on port ${PORT}`, {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || "development",
  });
});
