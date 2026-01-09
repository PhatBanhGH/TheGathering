import express from "express";
import {
  getMapByRoom,
  updateMap,
  createMap,
} from "../controllers/mapController.js";

const router = express.Router();

// Get map by roomId
router.get("/room/:roomId", getMapByRoom);

// Update map
router.put("/room/:roomId", updateMap);

// Create new map
router.post("/", createMap);

export default router;

