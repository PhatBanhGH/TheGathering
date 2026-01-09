import mongoose, { Document, Schema } from "mongoose";

export interface IEventAttendee {
  userId: string;
  username: string;
  status: "going" | "maybe" | "not_going";
}

export interface IEvent extends Document {
  eventId: string;
  roomId: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  createdBy: string;
  attendees: IEventAttendee[];
  location: string;
  isRecurring: boolean;
  recurrencePattern?: "daily" | "weekly" | "monthly" | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
    },
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: String, // userId
      required: true,
    },
    attendees: [
      {
        userId: String,
        username: String,
        status: {
          type: String,
          enum: ["going", "maybe", "not_going"],
          default: "maybe",
        },
      },
    ],
    location: {
      type: String,
      default: "",
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrencePattern: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ roomId: 1, startTime: 1 });
eventSchema.index({ createdBy: 1 });

export default mongoose.model<IEvent>("Event", eventSchema);

