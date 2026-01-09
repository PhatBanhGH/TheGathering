import express from "express";
import {
  getEventsByRoom,
  createEvent,
  updateEvent,
  rsvpEvent,
  deleteEvent,
} from "../controllers/eventController.js";

const router = express.Router();

router.get("/room/:roomId", getEventsByRoom);
router.post("/", createEvent);
router.put("/:eventId", updateEvent);
router.post("/:eventId/rsvp", rsvpEvent);
router.delete("/:eventId", deleteEvent);

export default router;

