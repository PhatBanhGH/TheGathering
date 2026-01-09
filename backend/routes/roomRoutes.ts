import express, { Request, Response } from "express";
import Room from "../models/Room.js";

const router = express.Router();

// Get room info
router.get("/:roomId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }
    
    res.json(room);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
});

// Generate invite link
router.post("/:roomId/invite", async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }
    
    const inviteLink = `${process.env.CLIENT_URL || "http://localhost:5173"}/lobby?room=${roomId}`;
    
    res.json({
      inviteLink,
      roomId: room.roomId,
      roomName: room.name,
      maxUsers: room.maxUsers,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
});

export default router;

