import express from "express";
import {
  getObjectsByRoom,
  getObjectById,
  createObject,
  updateObject,
  updateWhiteboardContent,
  deleteObject,
} from "../controllers/objectController.js";

const router = express.Router();

// Get all objects in a room
router.get("/room/:roomId", getObjectsByRoom);

// Get single object
router.get("/:objectId", getObjectById);

// Create new object
router.post("/", createObject);

// Update object
router.put("/:objectId", updateObject);

// Update whiteboard content
router.put("/:objectId/whiteboard", updateWhiteboardContent);

// Delete object
router.delete("/:objectId", deleteObject);

export default router;

