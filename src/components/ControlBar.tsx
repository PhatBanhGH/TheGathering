import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useWebRTC } from "../contexts/WebRTCContext";
import { SettingsModal } from "./modals";
import "./ControlBar.css";

const ControlBar = () => {
  const location = useLocation();
  const {
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
  } = useWebRTC();
  const [showSettings, setShowSettings] = useState(false);

  const isChatPage = location.pathname === "/app/chat";
  const isSidebarPage = isChatPage;

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

        {/* Nearby chat moved to ChannelList footer */}
      </div>

      <div className="control-group">
        <button
          className="control-button"
          title="Reactions"
        >
          😀
        </button>

      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default ControlBar;
