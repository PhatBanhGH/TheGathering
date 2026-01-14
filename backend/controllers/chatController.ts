import { Server, Socket } from "socket.io";
import Message from "../models/Message.js";

interface ConnectedUser {
  userId: string;
  username: string;
  roomId: string;
  avatar?: string;
  position: { x: number; y: number };
  direction?: string;
  socketId: string;
}

interface GroupChat {
  id: string;
  name: string;
  members: string[];
  roomId: string;
  createdBy: string;
  createdAt: number;
}

interface ChatHandlersParams {
  io: Server;
  socket: Socket;
  connectedUsers: Map<string, ConnectedUser>;
  roomUsers: Map<string, Set<string>>;
  groupChats: Map<string, GroupChat>;
}

interface ChatMessageData {
  id?: string;
  message?: string;
  content?: string;
  type?: "nearby" | "global" | "dm" | "group";
  targetUserId?: string;
  groupId?: string;
  channelId?: string;
  timestamp?: number;
  editedAt?: number | null;
  replyTo?: {
    id: string;
    username: string;
    message: string;
  } | null;
  reactions?: Array<{
    emoji: string;
    users: string[];
  }>;
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  }>;
}

interface MessageReactionData {
  messageId: string;
  emoji: string;
  userId: string;
  roomId?: string;
}

interface EditMessageData {
  messageId: string;
  newContent: string;
  userId: string;
  roomId?: string;
}

interface DeleteMessageData {
  messageId: string;
  userId: string;
  roomId?: string;
}

interface CreateGroupChatData {
  groupId: string;
  name: string;
  members: string[];
  roomId: string;
}

interface CreateChannelData {
  channelId: string;
  name: string;
  type: "text" | "voice" | "forum";
  description?: string;
  isPrivate?: boolean;
  roomId: string;
}

interface CreateVoiceChannelData {
  channelId: string;
  name: string;
  isPrivate?: boolean;
  roomId: string;
}

export const registerChatHandlers = ({
  io,
  socket,
  connectedUsers,
  roomUsers,
  groupChats,
}: ChatHandlersParams): void => {
  // Handle group chat creation
  socket.on("create-group-chat", (data: CreateGroupChatData) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const { groupId, name, members, roomId } = data;

    // Verify all members are in the same room
    const validMembers = members.filter((memberId) => {
      return Array.from(roomUsers.get(roomId) || []).some((socketId) => {
        const u = connectedUsers.get(socketId);
        return u && u.userId === memberId;
      });
    });

    if (validMembers.length < 2) {
      socket.emit("error", {
        message: "Group chat cần ít nhất 2 thành viên",
      });
      return;
    }

    const groupChat: GroupChat = {
      id: groupId,
      name,
      members: validMembers,
      roomId,
      createdBy: user.userId,
      createdAt: Date.now(),
    };

    groupChats.set(groupId, groupChat);

    // Notify all members about the new group
    validMembers.forEach((memberId) => {
      const memberSocket = Array.from(connectedUsers.values()).find(
        (u) => u.userId === memberId && u.roomId === roomId
      );
      if (memberSocket) {
        io.to(memberSocket.socketId).emit("group-chat-created", groupChat);
      }
    });

    console.log(
      `Group chat "${name}" created with ${validMembers.length} members`
    );
  });

  // Handle channel creation
  socket.on("create-channel", (data: CreateChannelData) => {
    const user = connectedUsers.get(socket.id);
    if (!user) {
      socket.emit("error", { message: "User not found" });
      return;
    }

    const { channelId, name, type, description, isPrivate, roomId } = data;

    // Verify user is in the same room
    if (user.roomId !== roomId) {
      socket.emit("error", {
        message: "Bạn không thể tạo kênh trong phòng khác",
      });
      return;
    }

    // Broadcast new channel to all users in room
    const channelData = {
      id: channelId,
      name,
      type,
      description,
      isPrivate: isPrivate || false,
      roomId,
      createdBy: user.userId,
      createdAt: Date.now(),
    };

    io.to(roomId).emit("channel-created", channelData);
    console.log(`✅ Channel "${name}" (${type}) created by ${user.username} in room ${roomId}${isPrivate ? " (PRIVATE)" : ""}`);
  });

  // Handle voice channel creation
  socket.on("create-voice-channel", (data: CreateVoiceChannelData) => {
    const user = connectedUsers.get(socket.id);
    if (!user) {
      socket.emit("error", { message: "User not found" });
      return;
    }

    const { channelId, name, isPrivate, roomId } = data;

    // Verify user is in the same room
    if (user.roomId !== roomId) {
      socket.emit("error", {
        message: "Bạn không thể tạo kênh trong phòng khác",
      });
      return;
    }

    // Broadcast new voice channel to all users in room
    const channelData = {
      id: channelId,
      name,
      type: "voice",
      isPrivate: isPrivate || false,
      roomId,
      createdBy: user.userId,
      createdAt: Date.now(),
      users: [],
      isActive: false,
    };

    io.to(roomId).emit("voice-channel-created", channelData);
    console.log(`✅ Voice channel "${name}" created by ${user.username} in room ${roomId}${isPrivate ? " (PRIVATE)" : ""}`);
  });

  socket.on("chat-message", async (data: ChatMessageData) => {
    const user = connectedUsers.get(socket.id);
    if (!user) {
      console.warn(
        "Chat message received but user not found for socket:",
        socket.id
      );
      return;
    }

    console.log("Received chat-message event:", {
      userId: user.userId,
      username: user.username,
      data: data,
    });

    const message = {
      id: data.id || `msg-${Date.now()}-${socket.id}`,
      userId: user.userId,
      username: user.username,
      message: data.message?.trim() || data.content?.trim() || "",
      type: data.type || "global",
      targetUserId: data.targetUserId || null,
      groupId: data.groupId || null,
      channelId: data.channelId || (data.type === "global" ? "general" : null), // Default to "general" for global messages
      timestamp: data.timestamp || Date.now(),
      editedAt: data.editedAt || null,
      replyTo: data.replyTo || null,
      reactions: data.reactions || [],
    };

    console.log("Backend processing message:", {
      id: message.id,
      channelId: message.channelId,
      type: message.type,
      userId: message.userId,
      username: message.username,
    });

    if (!message.message) {
      console.warn("Empty message received, ignoring");
      return;
    }

    console.log("Processing chat message:", message);

    const recipients: string[] = [];

    if (message.type === "nearby") {
      const nearbyUsers = Array.from(roomUsers.get(user.roomId) || [])
        .map((id) => connectedUsers.get(id))
        .filter((u) => {
          if (!u || u.userId === user.userId) return false;
          const distance = Math.sqrt(
            Math.pow((u.position?.x || 0) - (user.position?.x || 0), 2) +
              Math.pow((u.position?.y || 0) - (user.position?.y || 0), 2)
          );
          return distance < 200;
        });

      nearbyUsers.forEach((recipient) => {
        if (recipient) {
          recipients.push(recipient.userId);
          io.to(recipient.socketId).emit("chat-message", message);
        }
      });
      // send back to sender
      socket.emit("chat-message", message);
    } else if (message.type === "global") {
      // Broadcast to ALL users in the room using io.to() - this includes sender and all other users
      console.log(`📢 Broadcasting global message to room ${user.roomId}`);
      console.log(`📢 Message channelId: ${message.channelId}, Message ID: ${message.id}`);
      console.log(`📢 Message content: ${message.message?.substring(0, 50)}`);
      console.log(`📢 Sender: ${user.username} (${user.userId})`);
      
      // Get all sockets in room for logging
      const roomSockets = Array.from(roomUsers.get(user.roomId) || []);
      console.log(`📢 Room ${user.roomId} has ${roomSockets.length} connected sockets`);
      
      // Use io.to() to broadcast to ALL sockets in the room (including sender's other tabs)
      io.to(user.roomId).emit("chat-message", message);
      console.log(`📢 Emitted chat-message event to room ${user.roomId}`);
      
      recipients.push(
        ...Array.from(roomUsers.get(user.roomId) || []).map((id) => {
          const recipient = connectedUsers.get(id);
          return recipient?.userId;
        }).filter((id): id is string => id !== undefined)
      );
      console.log(`📢 Broadcasted global message to room ${user.roomId} to ${recipients.length} recipients`);
    } else if (message.type === "group" && message.groupId) {
      // Group chat - send to all members of the group
      const group = groupChats.get(message.groupId);
      if (!group) {
        console.warn(`Group chat ${message.groupId} not found`);
        socket.emit("error", {
          message: "Group chat không tồn tại",
        });
        return;
      }

      // Verify user is a member of the group
      if (!group.members.includes(user.userId)) {
        console.warn(
          `User ${user.userId} is not a member of group ${message.groupId}`
        );
        socket.emit("error", {
          message: "Bạn không phải thành viên của group này",
        });
        return;
      }

      // Send message to all group members
      group.members.forEach((memberId) => {
        const memberSocket = Array.from(connectedUsers.values()).find(
          (u) => u.userId === memberId && u.roomId === user.roomId
        );
        if (memberSocket) {
          io.to(memberSocket.socketId).emit("chat-message", message);
          recipients.push(memberId);
        }
      });

      console.log(
        `Sent group message to ${group.members.length} members in group "${group.name}"`
      );
    } else if (message.type === "dm" && message.targetUserId) {
      const targetUser = Array.from(connectedUsers.values()).find(
        (u) => u.userId === message.targetUserId && u.roomId === user.roomId
      );
      if (targetUser) {
        recipients.push(targetUser.userId);
        // Send to target user
        io.to(targetUser.socketId).emit("chat-message", message);
        // Send back to sender so they see their own message
        socket.emit("chat-message", message);
        console.log(
          `Sent DM from ${user.username} (${user.userId}) to ${targetUser.username} (${targetUser.userId})`
        );
        console.log(
          `Sender socket: ${socket.id}, Target socket: ${targetUser.socketId}`
        );
      } else {
        console.warn(
          `Target user ${message.targetUserId} not found for DM in room ${user.roomId}`
        );
        console.log(
          "Available users in room:",
          Array.from(roomUsers.get(user.roomId) || [])
            .map((id) => {
              const u = connectedUsers.get(id);
              return u ? `${u.username} (${u.userId})` : null;
            })
            .filter(Boolean)
        );
        // Still send back to sender so they see their message even if target not found
        socket.emit("chat-message", {
          ...message,
          error: "Người nhận không tìm thấy hoặc đã rời phòng",
        });
      }
    }

    // Persist message
    try {
      const messageDoc: any = {
        roomId: user.roomId,
        senderId: user.userId,
        senderName: user.username,
        type: message.type,
        content: message.message,
        targetUserId: message.targetUserId,
        groupId: message.groupId,
        channelId: message.channelId,
        recipients: recipients.filter(Boolean),
        timestamp: new Date(message.timestamp),
      };
      
      // Add optional fields if they exist
      if (message.editedAt) {
        messageDoc.editedAt = new Date(message.editedAt);
      }
      if (message.replyTo) {
        messageDoc.replyTo = message.replyTo;
      }
      if (message.reactions && message.reactions.length > 0) {
        messageDoc.reactions = message.reactions;
      }
      if (data.attachments && data.attachments.length > 0) {
        messageDoc.attachments = data.attachments;
      }
      
      await Message.create(messageDoc);
      console.log("Message saved to database with channelId:", message.channelId);
    } catch (error) {
      console.error("Failed to save message", error);
      // Don't fail the request if DB save fails
    }
  });

  // Handle message reaction
  socket.on("message-reaction", (data: MessageReactionData) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const { messageId, emoji, userId, roomId } = data;
    const targetRoomId = roomId || user.roomId;

    console.log(`📢 Broadcasting message-reaction-updated to room ${targetRoomId}:`, { messageId, emoji, userId });

    // Broadcast reaction update to ALL users in room (realtime)
    io.to(targetRoomId).emit("message-reaction-updated", {
      messageId,
      emoji,
      userId,
    });

    console.log(`✅ User ${user.username} reacted ${emoji} to message ${messageId} - broadcasted to room ${targetRoomId}`);
  });

  // Handle message edit
  socket.on("edit-message", (data: EditMessageData) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const { messageId, newContent, userId, roomId } = data;
    const targetRoomId = roomId || user.roomId;

    console.log(`📢 Broadcasting message-edited to room ${targetRoomId}:`, { messageId, userId, newContent: newContent?.substring(0, 50) });

    // Broadcast edit to ALL users in room (realtime)
    io.to(targetRoomId).emit("message-edited", {
      messageId,
      newContent,
      editedAt: Date.now(),
      userId,
    });

    console.log(`✅ User ${user.username} edited message ${messageId} - broadcasted to room ${targetRoomId}`);
  });

  // Handle message delete
  socket.on("delete-message", (data: DeleteMessageData) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const { messageId, userId, roomId } = data;
    const targetRoomId = roomId || user.roomId;

    console.log(`📢 Broadcasting message-deleted to room ${targetRoomId}:`, { messageId, userId });

    // Broadcast delete to ALL users in room (realtime)
    io.to(targetRoomId).emit("message-deleted", {
      messageId,
      userId,
    });

    console.log(`✅ User ${user.username} deleted message ${messageId} - broadcasted to room ${targetRoomId}`);
  });
};

