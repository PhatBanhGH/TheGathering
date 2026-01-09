import { useState, useMemo, useEffect } from "react";
import { useSocket } from "../contexts/SocketContext";
import { useChat } from "../contexts/ChatContext";
import { useTheme } from "../contexts/ThemeContext";
import { InviteModal, CreateChannelModal } from "../components/modals";
import { ServerList, ChannelList, ChatArea, UserList } from "../components/chat/index";
import VoiceChannelView from "../components/chat/VoiceChannelView";
import "../styles/responsive.css";
import "./ChatPage.css";

type DirectMessage = {
  userId: string;
  username: string;
  avatar: string;
};

const ChatPage = () => {
  const { users, currentUser } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const {
    activeTab,
    setActiveTab,
    messages,
    sendMessage,
    setDmTarget,
    channels,
    voiceChannels,
    joinVoiceChannel,
    leaveVoiceChannel,
    currentVoiceChannel,
    updateChannelUnread,
    createChannel,
    reactToMessage,
    editMessage,
    deleteMessage,
  } = useChat();

  const [selectedChannel, setSelectedChannel] = useState<string>("general");
  const [selectedDM, setSelectedDM] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [createChannelType, setCreateChannelType] = useState<"text" | "voice">("text");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileUserListOpen, setMobileUserListOpen] = useState(false);

  // Get roomId from localStorage
  const roomId = localStorage.getItem("roomId") || "default-room";

  // Mark channel as viewed when selected
  useEffect(() => {
    if (selectedChannel) {
      updateChannelUnread(selectedChannel, 0);
    }
  }, [selectedChannel, updateChannelUnread]);

  const directMessages: DirectMessage[] = useMemo(() => {
    // Dedupe theo username và ưu tiên bản ghi đang online để DM đúng user hiện tại
    const dmMap = new Map<string, DirectMessage & { status?: "online" | "offline" }>();

    users
      .filter((u) => u.userId !== currentUser?.userId)
      .forEach((u) => {
        const status = (u as any).status || "online";
        const existing = dmMap.get(u.username);

        if (!existing) {
          dmMap.set(u.username, {
            userId: u.userId,
            username: u.username,
            avatar: u.avatar,
            status,
          });
        } else {
          // Nếu đã có user cùng username:
          // - Nếu bản cũ offline và bản mới online -> thay bằng online
          // - Nếu cả hai online, giữ lần đầu (tránh nhảy userId liên tục)
          if (existing.status === "offline" && status === "online") {
            dmMap.set(u.username, {
              userId: u.userId,
              username: u.username,
              avatar: u.avatar,
              status,
            });
          }
        }
      });

    return Array.from(dmMap.values()).map(({ status: _status, ...rest }) => rest);
  }, [users, currentUser]);

  useEffect(() => {
    if (selectedDM) {
      setDmTarget(selectedDM);
      setActiveTab("dm");
    } else {
      setDmTarget(null);
    }
  }, [selectedDM, setDmTarget, setActiveTab]);

  useEffect(() => {
    if (selectedChannel) {
      setActiveTab("global");
      setSelectedDM(null);
    }
  }, [selectedChannel, setActiveTab]);

  const currentChannel = channels?.find((ch) => ch.id === selectedChannel) || null;
  const currentDMUser = directMessages?.find((dm) => dm.userId === selectedDM) || null;

  const displayMessages = useMemo(() => {
    console.log("Filtering messages. activeTab:", activeTab, "selectedChannel:", selectedChannel, "total messages:", messages.length);
    
    if (activeTab === "dm" && selectedDM) {
      return messages.filter((msg) => {
        if (msg.type !== "dm") return false;
        const participants = [msg.userId, msg.targetUserId];
        return (
          participants.includes(currentUser?.userId || "") &&
          participants.includes(selectedDM)
        );
      });
    }
    if (activeTab === "global" && selectedChannel) {
      // Filter messages by channelId
      const filtered = messages.filter((msg) => {
        const matches = msg.type === "global" && msg.channelId === selectedChannel;
        if (!matches) {
          console.log("Message filtered out:", {
            id: msg.id,
            type: msg.type,
            channelId: msg.channelId,
            selectedChannel,
            username: msg.username,
            message: msg.message?.substring(0, 20) || ""
          });
        }
        return matches;
      });
      console.log("Filtered messages for channel", selectedChannel, ":", filtered.length);
      return filtered;
    }
    return messages;
  }, [messages, activeTab, selectedDM, currentUser, selectedChannel]);

  const handleSendMessage = (content: string, replyToId?: string) => {
    // Send message with channelId for global messages
    if (activeTab === "global" && selectedChannel) {
      sendMessage(content, selectedChannel, replyToId);
    } else {
      sendMessage(content, undefined, replyToId);
    }
  };

  // Prepare users cho UserList: gộp 1 bản duy nhất theo username, ưu tiên bản đang online
  const usersForList = useMemo(() => {
    const byUsername = new Map<
      string,
      (typeof users)[0] | (typeof currentUser) | null | undefined
    >();

    // Add all socket users (online/offline)
    users.forEach((u) => {
      if (!u) return;
      const existing = byUsername.get(u.username);
      const status = (u as any).status || "online";
      const existingStatus = (existing as any)?.status || "offline";

      // Ưu tiên online, nếu chưa có thì thêm, nếu đã có offline mà bản mới online thì thay
      if (!existing || (existingStatus === "offline" && status === "online")) {
        byUsername.set(u.username, u);
      }
    });

    // Ensure currentUser present và online
    if (currentUser) {
      const existing = byUsername.get(currentUser.username);
      const existingStatus = (existing as any)?.status || "offline";
      if (!existing || existingStatus === "offline") {
        byUsername.set(currentUser.username, { ...currentUser, status: "online" as const });
      }
    }

    const merged = Array.from(byUsername.values()).filter(
      (u): u is NonNullable<typeof u> => !!u
    );

    // Sort: currentUser first, sau đó online > offline, rồi alpha
    const sorted = merged.sort((a, b) => {
      if (a.userId === currentUser?.userId) return -1;
      if (b.userId === currentUser?.userId) return 1;
      const aStatus = (a as any).status || "online";
      const bStatus = (b as any).status || "online";
      if (aStatus !== bStatus) return aStatus === "online" ? -1 : 1;
      return a.username.localeCompare(b.username);
    });

    return sorted.map((user) => ({
      userId: user.userId,
      username: user.username,
      avatar: user.avatar,
      status: ((user as any).status || "online") as "online" | "offline",
      currentVoiceChannel:
        currentVoiceChannel && user.userId === currentUser?.userId
          ? currentVoiceChannel
          : undefined,
    }));
  }, [users, currentUser, currentVoiceChannel]);

  return (
    <div className="chat-page">
      {/* Theme Toggle Button */}
      <button
        className="theme-toggle-btn"
        onClick={toggleTheme}
        title={theme === "light" ? "Chuyển sang chế độ tối" : "Chuyển sang chế độ sáng"}
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>

      <div className="chat-page-content discord-layout">
        {/* Mobile Menu Button removed */}

        {/* Server List */}
        <ServerList
          currentServerId="default"
          onServerSelect={(id: string) => console.log("Server selected:", id)}
        />

        {/* Channel List */}
        <ChannelList
          className={mobileMenuOpen ? "open" : ""}
          serverName="My Virtual Office"
          channels={channels || []}
          voiceChannels={voiceChannels || []}
          selectedChannelId={selectedChannel}
          currentVoiceChannelId={currentVoiceChannel}
          onChannelSelect={(id: string) => {
            setSelectedChannel(id);
            setSelectedDM(null);
            setActiveTab("global");
            setMobileMenuOpen(false);
          }}
          onVoiceChannelJoin={(id: string) => {
            if (currentVoiceChannel === id) {
              leaveVoiceChannel();
            } else {
              joinVoiceChannel(id);
            }
          }}
          onCreateChannel={(type: "text" | "voice") => {
            setCreateChannelType(type);
            setShowCreateChannelModal(true);
          }}
          currentUser={currentUser ? {
            userId: currentUser.userId,
            username: currentUser.username,
            avatar: currentUser.avatar,
          } : undefined}
        />

        {/* Chat Area or Voice Channel View */}
        {currentVoiceChannel ? (
          <VoiceChannelView
            channelId={currentVoiceChannel}
            channelName={
              voiceChannels.find((vc) => vc.id === currentVoiceChannel)?.name ||
              "Voice Channel"
            }
            onLeave={() => {
              leaveVoiceChannel();
              setSelectedChannel("general");
              setActiveTab("global");
              // Clear voice channel users in WebRTC context
              // This is handled by VoiceChannelView useEffect cleanup
            }}
          />
        ) : (
          <ChatArea
            channelName={
              activeTab === "dm" && currentDMUser
                ? currentDMUser.username
                : currentChannel?.name || selectedChannel || "general"
            }
            channelType={activeTab === "dm" ? "dm" : "text"}
            messages={displayMessages.map((msg) => ({
              id: msg.id,
              userId: msg.userId,
              username: msg.username,
              message: msg.message,
              timestamp: msg.timestamp,
              editedAt: msg.editedAt,
              replyTo: msg.replyTo,
              reactions: msg.reactions,
              attachments: msg.attachments,
            }))}
            currentUserId={currentUser?.userId}
            onSendMessage={(content: string, attachments?: Array<{ filename: string; originalName: string; mimeType: string; size: number; url: string }>) => {
              // Send message with channelId for global messages
              if (activeTab === "global" && selectedChannel) {
                sendMessage(content, selectedChannel, undefined, attachments);
              } else {
                sendMessage(content, undefined, undefined, attachments);
              }
            }}
            onReply={(messageId: string, content: string) => {
              // Reply with messageId
              handleSendMessage(content, messageId);
            }}
            onReact={reactToMessage}
            onEdit={editMessage}
            onDelete={deleteMessage}
            inputPlaceholder={
              activeTab === "dm" && currentDMUser
                ? `Nhắn @${currentDMUser.username}`
                : `Nhắn #${selectedChannel || "general"}`
            }
          />
        )}

        {/* User List */}
        <UserList
          className={mobileUserListOpen ? "open" : ""}
          users={usersForList}
          currentUserId={currentUser?.userId}
          onUserClick={(userId: string) => {
            setSelectedDM(userId);
            setSelectedChannel("");
            setActiveTab("dm");
            setMobileUserListOpen(false);
          }}
        />

      </div>
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roomId={roomId}
      />
      <CreateChannelModal
        isOpen={showCreateChannelModal}
        onClose={() => setShowCreateChannelModal(false)}
        onCreateChannel={(name: string, type: "text" | "voice", description?: string) => {
          createChannel(name, type, description);
          setShowCreateChannelModal(false);
        }}
        defaultType={createChannelType}
      />
    </div>
  );
};

export default ChatPage;

