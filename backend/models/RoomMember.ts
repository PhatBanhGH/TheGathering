import mongoose, { Document, Schema } from "mongoose";

export interface IRoomMember extends Document {
  roomId: string;
  userId: string;
  username: string;
  avatar: string;
  joinedAt: Date;
  lastSeen: Date;
  isOnline: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const roomMemberSchema = new Schema<IRoomMember>(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique user per room
roomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });

export default mongoose.model<IRoomMember>("RoomMember", roomMemberSchema);

