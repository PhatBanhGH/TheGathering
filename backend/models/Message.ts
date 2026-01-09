import mongoose, { Document, Schema } from "mongoose";

export interface IMessageAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface IMessageReaction {
  emoji: string;
  users: string[];
}

export interface IMessageReplyTo {
  id: string;
  username: string;
  message: string;
}

export interface IMessage extends Document {
  roomId: string;
  senderId: string;
  senderName: string;
  type: "nearby" | "global" | "dm" | "group";
  content: string;
  targetUserId?: string | null;
  groupId?: string | null;
  channelId?: string | null;
  recipients: string[];
  timestamp: Date;
  editedAt?: Date | null;
  replyTo?: IMessageReplyTo | null;
  reactions: IMessageReaction[];
  attachments: IMessageAttachment[];
  createdAt?: Date;
  updatedAt?: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    roomId: {
      type: String,
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["nearby", "global", "dm", "group"],
      default: "global",
    },
    content: {
      type: String,
      required: true,
    },
    targetUserId: {
      type: String,
      default: null,
    },
    groupId: {
      type: String,
      default: null,
    },
    channelId: {
      type: String,
      default: null,
    },
    recipients: {
      type: [String],
      default: [],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    replyTo: {
      type: {
        id: String,
        username: String,
        message: String,
      },
      default: null,
    },
    reactions: {
      type: [
        {
          emoji: String,
          users: [String],
        },
      ],
      default: [],
    },
    attachments: {
      type: [
        {
          filename: String,
          originalName: String,
          mimeType: String,
          size: Number,
          url: String,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMessage>("Message", messageSchema);

