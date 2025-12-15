import { useState, useEffect, useMemo, useCallback } from "react";
import { useSocket } from "../contexts/SocketContext";
import { Channel, VoiceChannel } from "../contexts/ChatContext";

export const useChatChannels = (roomId: string) => {
  const { socket, currentUser, users } = useSocket();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [voiceChannels, setVoiceChannels] = useState<VoiceChannel[]>([]);
  const [currentVoiceChannel, setCurrentVoiceChannel] = useState<string | null>(
    null
  );
  const [channelUnreads, setChannelUnreads] = useState<Map<string, number>>(
    new Map()
  );
  const [viewedChannels, setViewedChannels] = useState<Set<string>>(new Set());

  // Initialize default channels
  useEffect(() => {
    const defaultChannels: Channel[] = [
      {
        id: "general",
        name: "general",
        type: "text",
        description: "Share company-wide updates, wins, announcements",
      },
      {
        id: "social",
        name: "social",
        type: "text",
        description: "Casual conversations and social interactions",
      },
    ];
    setChannels(defaultChannels);

    const defaultVoiceChannels: VoiceChannel[] = [
      { id: "general-voice", name: "Chat chung", users: [], isActive: false },
    ];
    setVoiceChannels(defaultVoiceChannels);
  }, []);

  // Update voice channels with real user data
  useEffect(() => {
    if (!currentUser) return;

    setVoiceChannels((prev) => {
      return prev.map((vc) => {
        const usersInChannel: string[] = [];

        // Add current user if they're in this channel
        if (currentVoiceChannel === vc.id) {
          usersInChannel.push(currentUser.userId);
        }

        return {
          ...vc,
          users: usersInChannel,
          isActive: usersInChannel.length > 0,
        };
      });
    });
  }, [users, currentUser, currentVoiceChannel]);

  // Listen for voice channel updates from socket
  useEffect(() => {
    if (!socket) return;

    const handleVoiceChannelUpdate = (data: {
      channelId: string;
      users: string[];
    }) => {
      setVoiceChannels((prev) =>
        prev.map((vc) =>
          vc.id === data.channelId
            ? { ...vc, users: data.users, isActive: data.users.length > 0 }
            : vc
        )
      );
    };

    socket.on("voice-channel-update", handleVoiceChannelUpdate);

    return () => {
      socket.off("voice-channel-update", handleVoiceChannelUpdate);
    };
  }, [socket]);

  const joinVoiceChannel = useCallback(
    (channelId: string) => {
      if (!socket || !currentUser) return;

      // Leave current voice channel if any
      if (currentVoiceChannel && currentVoiceChannel !== channelId) {
        leaveVoiceChannel();
      }

      setCurrentVoiceChannel(channelId);

      // Emit to server
      socket.emit("join-voice-channel", {
        channelId,
        userId: currentUser.userId,
        roomId,
      });

      // Optimistically update local state
      setVoiceChannels((prev) =>
        prev.map((vc) =>
          vc.id === channelId
            ? {
                ...vc,
                users: vc.users.includes(currentUser.userId)
                  ? vc.users
                  : [...vc.users, currentUser.userId],
                isActive: true,
              }
            : vc
        )
      );
    },
    [socket, currentUser, roomId, currentVoiceChannel]
  );

  const leaveVoiceChannel = useCallback(() => {
    if (!socket || !currentUser || !currentVoiceChannel) return;

    const channelToLeave = currentVoiceChannel;

    socket.emit("leave-voice-channel", {
      channelId: channelToLeave,
      userId: currentUser.userId,
      roomId,
    });

    // Optimistically update local state
    setVoiceChannels((prev) =>
      prev.map((vc) =>
        vc.id === channelToLeave
          ? {
              ...vc,
              users: vc.users.filter((id) => id !== currentUser.userId),
              isActive:
                vc.users.filter((id) => id !== currentUser.userId).length > 0,
            }
          : vc
      )
    );

    setCurrentVoiceChannel(null);
  }, [socket, currentUser, roomId, currentVoiceChannel]);

  const updateChannelUnread = useCallback(
    (channelId: string, count: number) => {
      setChannelUnreads((prev) => {
        const next = new Map(prev);
        if (count === 0) {
          next.delete(channelId);
        } else {
          next.set(channelId, count);
        }
        return next;
      });

      // Update channels with unread counts
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === channelId ? { ...ch, unreadCount: count } : ch
        )
      );
    },
    []
  );

  const markChannelAsViewed = useCallback(
    (channelId: string) => {
      setViewedChannels((prev) => new Set(prev).add(channelId));
      updateChannelUnread(channelId, 0);
    },
    [updateChannelUnread]
  );

  const createChannel = useCallback(
    (name: string, type: "text" | "voice", description?: string) => {
      if (!socket || !currentUser) return;

      const channelId =
        type === "text"
          ? `channel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          : `voice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      if (type === "text") {
        const newChannel: Channel = {
          id: channelId,
          name,
          type: "text",
          description,
        };
        setChannels((prev) => [...prev, newChannel]);

        socket.emit("create-channel", {
          channelId,
          name,
          type: "text",
          description,
          roomId,
        });
      } else {
        const newVoiceChannel: VoiceChannel = {
          id: channelId,
          name,
          users: [],
          isActive: false,
        };
        setVoiceChannels((prev) => [...prev, newVoiceChannel]);

        socket.emit("create-voice-channel", {
          channelId,
          name,
          roomId,
        });
      }
    },
    [socket, currentUser, roomId]
  );

  const channelsWithUnreads = useMemo(() => {
    return channels.map((ch) => ({
      ...ch,
      unreadCount: channelUnreads.get(ch.id) || ch.unreadCount || 0,
    }));
  }, [channels, channelUnreads]);

  return {
    channels: channelsWithUnreads,
    voiceChannels,
    currentVoiceChannel,
    channelUnreads,
    viewedChannels,
    joinVoiceChannel,
    leaveVoiceChannel,
    updateChannelUnread,
    markChannelAsViewed,
    createChannel,
    setChannelUnreads,
    setViewedChannels,
  };
};


