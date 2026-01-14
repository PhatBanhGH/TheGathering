import { useState } from "react";
import { useChat } from "../../contexts/ChatContext";
import { useWebRTC } from "../../contexts/WebRTCContext";
import { useNotifications } from "../../contexts/NotificationContext";
import "./ChannelList.css";

// Hook for hover state per channel
const useChannelHover = () => {
  const [hoveredChannelId, setHoveredChannelId] = useState<string | null>(null);
  return { hoveredChannelId, setHoveredChannelId };
};

export interface Channel {
  id: string;
  name: string;
  type: "text" | "voice";
  category?: string;
  unreadCount?: number;
  description?: string;
}

export interface VoiceChannel {
  id: string;
  name: string;
  users: string[]; // userIds
  isActive: boolean;
  duration?: number; // in seconds
}

interface ChannelListProps {
  serverName: string;
  channels: Channel[];
  voiceChannels?: VoiceChannel[];
  selectedChannelId: string | null;
  currentVoiceChannelId?: string | null;
  onChannelSelect: (id: string) => void;
  onVoiceChannelJoin?: (id: string) => void;
  onCreateChannel?: (type: "text" | "voice") => void;
  currentUser?: { userId: string; username: string; avatar?: string };
  onSearch?: () => void;
  onNewMessage?: () => void;
  onSettings?: () => void;
  className?: string;
}

const ChannelList = ({
  serverName,
  channels,
  voiceChannels = [],
  selectedChannelId,
  currentVoiceChannelId,
  onChannelSelect,
  onVoiceChannelJoin,
  onCreateChannel,
  currentUser,
  onSearch,
  onNewMessage,
  onSettings,
  className = "",
}: ChannelListProps) => {
  const { toggleChat } = useChat();
  const {
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
  } = useWebRTC();
  const { unreadCount } = useNotifications();
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );
  const [hoveredChannelId, setHoveredChannelId] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const textChannels = channels.filter((ch) => ch.type === "text");
  const filteredTextChannels = textChannels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredVoiceChannels = voiceChannels.filter((vc) =>
    vc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`channel-list-container channel-list ${className}`}>
      {/* Header */}
      <div className="channel-list-header">
        <h2 className="server-name">{serverName}</h2>
        <div className="channel-list-actions">
          {onSearch && (
            <button className="icon-btn" onClick={onSearch} title="Search">
              🔍
            </button>
          )}
          {onNewMessage && (
            <button className="icon-btn" onClick={onNewMessage} title="New Message">
              <span className="new-message-icon">□+</span>
            </button>
          )}
          {onSettings && (
            <button className="icon-btn" onClick={onSettings} title="Settings">
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="channel-list-search">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Tìm kiếm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <span className="search-hint">Ctrl F</span>
      </div>

      {/* Events Section */}
      <div className="channel-section">
        <div
          className="section-header"
          onClick={() => toggleSection("events")}
        >
          <span className="section-toggle">
            {collapsedSections.has("events") ? "▶" : "▼"}
          </span>
          <h3 className="section-title">📅 Sự kiện</h3>
          <span className="section-badge">1</span>
        </div>
        {!collapsedSections.has("events") && (
          <div className="section-content">
            <div className="event-item">
              <span>• Event 1</span>
              <span className="event-badge">1</span>
            </div>
          </div>
        )}
      </div>

      {/* Text Channels Section */}
      <div className="channel-section">
        <div
          className="section-header"
          onClick={() => toggleSection("text")}
        >
          <span className="section-toggle">
            {collapsedSections.has("text") ? "▶" : "▼"}
          </span>
          <h3 className="section-title">💬 Kênh Chat</h3>
        </div>
        {!collapsedSections.has("text") && (
          <div className="section-content">
            {filteredTextChannels.map((channel) => (
              <div
                key={channel.id}
                className={`channel-item text-channel ${
                  selectedChannelId === channel.id ? "active" : ""
                }`}
                onClick={() => onChannelSelect(channel.id)}
              >
                <span className="channel-icon">#</span>
                <span className="channel-name">{channel.name}</span>
                {channel.unreadCount && channel.unreadCount > 0 && (
                  <span className="channel-unread">{channel.unreadCount}</span>
                )}
                {channel.unreadCount === 0 && selectedChannelId !== channel.id && (
                  <span className="channel-unread-dot">•</span>
                )}
              </div>
            ))}
            {onCreateChannel && (
              <button
                className="channel-item create-channel-btn"
                onClick={() => onCreateChannel("text")}
                title="Tạo kênh mới"
              >
                <span className="channel-icon">+</span>
                <span className="channel-name">Tạo kênh</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Voice Channels Section */}
      {voiceChannels.length > 0 && (
        <div className="channel-section">
          <div
            className="section-header"
            onClick={() => toggleSection("voice")}
          >
            <span className="section-toggle">
              {collapsedSections.has("voice") ? "▶" : "▼"}
            </span>
            <h3 className="section-title">🔊 Kênh đàm thoại</h3>
          </div>
          {!collapsedSections.has("voice") && (
            <div className="section-content">
              {filteredVoiceChannels.map((voiceChannel) => {
                const isCurrentChannel = currentVoiceChannelId === voiceChannel.id;
                return (
                  <div
                    key={voiceChannel.id}
                    className={`channel-item voice-channel ${
                      voiceChannel.isActive || isCurrentChannel ? "active" : ""
                    } ${isCurrentChannel ? "current-voice" : ""}`}
                    onClick={() => onVoiceChannelJoin?.(voiceChannel.id)}
                  >
                    <span className="voice-icon">🔊</span>
                    <span className="channel-name">{voiceChannel.name}</span>
                    {voiceChannel.users.length > 0 && (
                      <span className="voice-user-count">
                        [{voiceChannel.users.length}]
                      </span>
                    )}
                    {voiceChannel.duration && (
                      <span className="voice-duration">
                        {formatDuration(voiceChannel.duration)}
                      </span>
                    )}
                    {isCurrentChannel && (
                      <span className="current-voice-indicator" title="You are in this voice channel">
                        🎤
                      </span>
                    )}
                  </div>
                );
              })}
              {onCreateChannel && (
                <button
                  className="channel-item create-channel-btn voice-channel"
                  onClick={() => onCreateChannel("voice")}
                  title="Tạo kênh đàm thoại mới"
                >
                  <span className="voice-icon">+</span>
                  <span className="channel-name">Tạo kênh đàm thoại</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* User Footer - Integrated ControlBar */}
      {currentUser && (
        <div className="channel-list-footer integrated-control-bar">
          {/* User Profile */}
          <div className="user-profile">
            <div className="user-avatar">
              {currentUser.avatar || currentUser.username.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{currentUser.username}</div>
              {currentVoiceChannelId ? (
                <div className="user-status voice-connected">
                  <span className="voice-status-icon">🔊</span>
                  <span className="voice-status-text">
                    {voiceChannels.find((vc) => vc.id === currentVoiceChannelId)?.name || "Voice Channel"}
                  </span>
                </div>
              ) : (
                <div className="user-status">Online</div>
              )}
            </div>
          </div>

          {/* Controls Group */}
          <div className="footer-controls-group">
            {/* Minimap */}
            <button className="footer-control-btn minimap-button" title="Minimap">
              <div className="minimap">
                <div className="minimap-content">
                  <div className="minimap-player">P</div>
                </div>
              </div>
            </button>

            {/* Video */}
            <button
              className={`footer-control-btn ${isVideoEnabled ? "active" : ""}`}
              onClick={toggleVideo}
              title="Toggle Video"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                {isVideoEnabled ? (
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                ) : (
                  <path d="M21 6.5l-4-4v3.5H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h13v3.5l4-4v-11z" />
                )}
              </svg>
            </button>

            {/* Audio */}
            <button
              className={`footer-control-btn ${isAudioEnabled ? "active" : ""}`}
              onClick={toggleAudio}
              title="Toggle Audio"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                {isAudioEnabled ? (
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                ) : (
                  <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4c-.83 0-1.5.67-1.5 1.5v3.18l3 3V5.5c0-.83-.67-1.5-1.5-1.5z" />
                )}
              </svg>
            </button>

            {/* Nearby Chat */}
            <button 
              className="footer-control-btn nearby-chat-btn" 
              title="Nearby chat"
              onClick={toggleChat}
            >
              💬
            </button>

            {/* Emoji/Reactions */}
            <button className="footer-control-btn" title="Reactions">
              😀
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

export default ChannelList;

