import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWebRTC } from "../contexts/WebRTCContext";
import { useSocket } from "../contexts/SocketContext";
import { SettingsModal } from "./modals";
import ReactionPanel from "./ReactionPanel";
import NearbyChatPanel from "./chat/NearbyChatPanel";
import "./ControlBar.css";

const ControlBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const {
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
  } = useWebRTC();
  const [showSettings, setShowSettings] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showNearbyChat, setShowNearbyChat] = useState(false);

  const isChatPage = location.pathname === "/app/chat";
  const isSidebarPage = isChatPage;

  const handleLeaveRoom = () => {
    if (confirm('Are you sure you want to leave the room?')) {
      // Disconnect socket
      if (socket) {
        console.log("Leaving room and disconnecting socket...");
        socket.disconnect();
      }
      // Clear local storage
      localStorage.removeItem("roomId");
      localStorage.removeItem("userId");
      // Navigate to spaces
      navigate("/spaces");
    }
  };

  return (
    <div className={`control-bar ${isSidebarPage ? 'chat-position' : 'map-position'}`}>
      <div className="control-group">
        <button
          className="control-button minimap-button"
          title="Minimap"
        >
          <div className="minimap">
            <div className="minimap-content">
              <div className="minimap-player">P</div>
            </div>
          </div>
        </button>
      </div>

      <div className="control-group">
        <button
          className={`control-button ${isVideoEnabled ? "active" : ""}`}
          onClick={toggleVideo}
          title="Toggle Video"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            {isVideoEnabled ? (
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            ) : (
              <path d="M21 6.5l-4-4v3.5H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h13v3.5l4-4v-11z" />
            )}
          </svg>
        </button>

        <button
          className={`control-button ${isAudioEnabled ? "active" : ""}`}
          onClick={toggleAudio}
          title="Toggle Audio"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            {isAudioEnabled ? (
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            ) : (
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4c-.83 0-1.5.67-1.5 1.5v3.18l3 3V5.5c0-.83-.67-1.5-1.5-1.5z" />
            )}
          </svg>
        </button>

        <button
          className={`control-button ${showNearbyChat ? "active" : ""}`}
          onClick={() => setShowNearbyChat(!showNearbyChat)}
          title="Nearby Chat"
        >
          💬
        </button>
      </div>

      <div className="control-group">
        <button
          className={`control-button ${showReactions ? "active" : ""}`}
          onClick={() => setShowReactions(!showReactions)}
          title="Send Reaction"
        >
          😀
        </button>

        <button
          className="control-button settings-button"
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        </button>

        <button
          className="control-button leave-button"
          onClick={handleLeaveRoom}
          title="Leave Room"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
          </svg>
        </button>
      </div>

      <ReactionPanel
        isOpen={showReactions}
        onClose={() => setShowReactions(false)}
      />

      <NearbyChatPanel
        isOpen={showNearbyChat}
        onClose={() => setShowNearbyChat(false)}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default ControlBar;
