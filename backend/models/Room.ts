import mongoose, { Document, Schema } from "mongoose";

export interface IRoom extends Document {
  roomId: string;
  name: string;
  description: string;
  maxUsers: number;
  isPrivate: boolean;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    maxUsers: {
      type: Number,
      default: 20, // Hỗ trợ tối đa 20 users (có thể tăng qua settings)
      min: 20, // Đảm bảo tối thiểu 20 users
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IRoom>("Room", roomSchema);

