/**
 * Space/Room routes
 * Combines event and room management
 */
import express, { Request, Response } from "express";
import Room from "../models/Room.js";
import {
  getEventsByRoom,
  createEvent,
  updateEvent,
  rsvpEvent,
  deleteEvent,
  markAttendance,
} from "../controllers/eventController.js";
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../controllers/eventTemplateController.js";
import { authenticate } from "../middleware/security.js";

const router = express.Router();

// ============================================
// Room Routes
// ============================================

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
router.post(
  "/:roomId/invite",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { roomId } = req.params;
      const room = await Room.findOne({ roomId });

      if (!room) {
        res.status(404).json({ message: "Room not found" });
        return;
      }

      const inviteLink = `${
        process.env.CLIENT_URL || "http://localhost:5173"
      }/lobby?room=${roomId}`;

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
  }
);

// ============================================
// Event Routes
// ============================================

// Get events by room
router.get("/:roomId/events", getEventsByRoom);

// Create event
router.post("/:roomId/events", authenticate, createEvent);

// Update event
router.put("/events/:eventId", authenticate, updateEvent);

// RSVP to event
router.post("/events/:eventId/rsvp", authenticate, rsvpEvent);

// Mark attendance
router.post("/events/:eventId/attendance", authenticate, markAttendance);

// Delete event
router.delete("/events/:eventId", authenticate, deleteEvent);

// Event template routes
router.get("/templates", getTemplates);
router.get("/templates/:templateId", getTemplate);
router.post("/templates", authenticate, createTemplate);
router.put("/templates/:templateId", authenticate, updateTemplate);
router.delete("/templates/:templateId", authenticate, deleteTemplate);

// Legacy routes for backward compatibility
router.get("/room/:roomId/events", getEventsByRoom);

export default router;
