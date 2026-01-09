import { Request, Response } from "express";
import Event from "../models/Event.js";

// Get events for a room
export const getEventsByRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { startDate, endDate } = req.query;

    interface QueryType {
      roomId: string;
      startTime?: {
        $gte: Date;
        $lte: Date;
      };
    }

    const query: QueryType = { roomId };

    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const events = await Event.find(query).sort({ startTime: 1 });
    res.json(events);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Create event
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      roomId,
      title,
      description,
      startTime,
      endTime,
      createdBy,
      location,
      isRecurring,
      recurrencePattern,
    } = req.body;

    const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const event = new Event({
      eventId,
      roomId,
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      createdBy,
      location,
      isRecurring: isRecurring || false,
      recurrencePattern: recurrencePattern || null,
    });

    await event.save();
    res.status(201).json(event);
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ message: err.message });
  }
};

// Update event
export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const updates = req.body;

    const event = await Event.findOne({ eventId });
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    if (updates.title) event.title = updates.title;
    if (updates.description !== undefined) event.description = updates.description;
    if (updates.startTime) event.startTime = new Date(updates.startTime);
    if (updates.endTime) event.endTime = new Date(updates.endTime);
    if (updates.location !== undefined) event.location = updates.location;

    await event.save();
    res.json(event);
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ message: err.message });
  }
};

// RSVP to event
export const rsvpEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { userId, username, status } = req.body;

    const event = await Event.findOne({ eventId });
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    const attendeeIndex = event.attendees.findIndex(
      (a) => a.userId === userId
    );

    if (attendeeIndex >= 0) {
      event.attendees[attendeeIndex].status = status;
    } else {
      event.attendees.push({ userId, username, status });
    }

    await event.save();
    res.json(event);
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ message: err.message });
  }
};

// Delete event
export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;

    const event = await Event.findOneAndDelete({ eventId });
    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

