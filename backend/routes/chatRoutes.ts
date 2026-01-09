import express, { Request, Response } from "express";
import Message from "../models/Message.js";

const router = express.Router();

router.get("/history/:roomId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { limit = 100, type, channelId } = req.query;
    interface QueryType {
      roomId: string;
      type?: string;
      channelId?: string;
    }
    const query: QueryType = { roomId };
    if (type) {
      query.type = type as string;
    }
    if (channelId) {
      query.channelId = channelId as string;
    }
    const messages = await Message.find(query)
      .sort({ timestamp: 1 }) // Sort ascending to get chronological order
      .limit(Number(limit))
      .lean();

    // Transform to match frontend ChatMessage format
    const formattedMessages = messages.map((msg) => ({
      id: msg._id.toString(),
      userId: msg.senderId,
      username: msg.senderName,
      message: msg.content,
      type: msg.type,
      targetUserId: msg.targetUserId || null,
      groupId: msg.groupId || null,
      channelId: msg.channelId || null,
      timestamp: new Date(msg.timestamp).getTime(),
      editedAt: msg.editedAt ? new Date(msg.editedAt).getTime() : undefined,
      replyTo: msg.replyTo || undefined,
      reactions: msg.reactions || [],
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error("Failed to fetch chat history", error);
    res.status(500).json({ message: "Failed to fetch chat history" });
  }
});

// Search messages endpoint
router.get("/search/:roomId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { q, type, channelId, limit = 50 } = req.query;

    if (!q || (typeof q === "string" && q.trim().length === 0)) {
      res.status(400).json({ message: "Search query is required" });
      return;
    }

    interface QueryType {
      roomId: string;
      content: { $regex: string; $options: string };
      type?: string;
      channelId?: string;
    }

    const query: QueryType = {
      roomId,
      content: { $regex: q as string, $options: "i" }, // Case-insensitive search
    };

    if (type) {
      query.type = type as string;
    }
    if (channelId) {
      query.channelId = channelId as string;
    }

    const messages = await Message.find(query)
      .sort({ timestamp: -1 }) // Most recent first
      .limit(Number(limit))
      .lean();

    const formattedMessages = messages.map((msg) => ({
      id: msg._id.toString(),
      userId: msg.senderId,
      username: msg.senderName,
      message: msg.content,
      type: msg.type,
      targetUserId: msg.targetUserId || null,
      groupId: msg.groupId || null,
      channelId: msg.channelId || null,
      timestamp: new Date(msg.timestamp).getTime(),
      editedAt: msg.editedAt ? new Date(msg.editedAt).getTime() : undefined,
      replyTo: msg.replyTo || undefined,
      reactions: msg.reactions || [],
    }));

    res.json({
      query: q,
      results: formattedMessages,
      count: formattedMessages.length,
    });
  } catch (error) {
    console.error("Failed to search messages", error);
    res.status(500).json({ message: "Failed to search messages" });
  }
});

export default router;

