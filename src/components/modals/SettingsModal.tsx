import { useState, useEffect } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useWebRTC } from "../../contexts/WebRTCContext";
import "./SettingsModal.css";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "profile" | "audio" | "controls";

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { currentUser } = useSocket();
  const {
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    localStream,
  } = useWebRTC();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [username, setUsername] = useState("");
  const [avatarColor, setAvatarColor] = useState("#4f46e5");
  const [status, setStatus] = useState("Available");
  const [devices, setDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }>({
    cameras: [],
    microphones: [],
    speakers: [],
  });
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");

  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username);
      // Get avatar color from localStorage or default
      const savedColor = localStorage.getItem("avatarColor");
      if (savedColor) {
        setAvatarColor(savedColor);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen && activeTab === "audio") {
      loadDevices();
    }
  }, [isOpen, activeTab]);

  const loadDevices = async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const cameras = deviceList.filter((d) => d.kind === "videoinput");
      const microphones = deviceList.filter((d) => d.kind === "audioinput");
      const speakers = deviceList.filter((d) => d.kind === "audiooutput");

      setDevices({ cameras, microphones, speakers });

      // Set defaults
      if (cameras.length > 0 && !selectedCamera) {
        setSelectedCamera(cameras[0].deviceId);
      }
      if (microphones.length > 0 && !selectedMicrophone) {
        setSelectedMicrophone(microphones[0].deviceId);
      }
      if (speakers.length > 0 && !selectedSpeaker) {
        setSelectedSpeaker(speakers[0].deviceId);
      }
    } catch (error) {
      console.error("Error loading devices:", error);
    }
  };

  const handleSaveProfile = () => {
    if (!username.trim()) {
      alert("Username cannot be empty");
      return;
    }

    // Update localStorage
    localStorage.setItem("userName", username);
    localStorage.setItem("avatarColor", avatarColor);
    localStorage.setItem("userStatus", status);

    // Update avatar in localStorage
    const avatar = username.charAt(0).toUpperCase();
    localStorage.setItem("userAvatar", avatar);

    alert("Profile saved! Changes will apply after refresh.");
  };

  const handleChangeDevice = async (
    type: "camera" | "microphone" | "speaker"
  ) => {
    if (!localStream) return;

    try {
      if (type === "camera" && selectedCamera) {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCamera } },
          audio: isAudioEnabled,
        });

        // Replace video track
        const videoTrack = newStream.getVideoTracks()[0];
        const oldVideoTrack = localStream.getVideoTracks()[0];
        if (oldVideoTrack && videoTrack) {
          localStream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
          localStream.addTrack(videoTrack);
        }
        newStream.getAudioTracks().forEach((track) => track.stop());
      } else if (type === "microphone" && selectedMicrophone) {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: isVideoEnabled,
          audio: { deviceId: { exact: selectedMicrophone } },
        });

        // Replace audio track
        const audioTrack = newStream.getAudioTracks()[0];
        const oldAudioTrack = localStream.getAudioTracks()[0];
        if (oldAudioTrack && audioTrack) {
          localStream.removeTrack(oldAudioTrack);
          oldAudioTrack.stop();
          localStream.addTrack(audioTrack);
        }
        newStream.getVideoTracks().forEach((track) => track.stop());
      }

      alert(`${type} changed successfully!`);
    } catch (error) {
      console.error(`Error changing ${type}:`, error);
      alert(`Failed to change ${type}`);
    }
  };

  const testAudio = () => {
    // Simple audio test - play a beep
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 440;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            👤 Profile
          </button>
          <button
            className={`tab-btn ${activeTab === "audio" ? "active" : ""}`}
            onClick={() => setActiveTab("audio")}
          >
            🎤 Audio/Video
          </button>
          <button
            className={`tab-btn ${activeTab === "controls" ? "active" : ""}`}
            onClick={() => setActiveTab("controls")}
          >
            ⌨️ Controls
          </button>
        </div>

        <div className="settings-content">
          {activeTab === "profile" && (
            <div className="settings-panel">
              <h3>Profile Settings</h3>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your username"
                />
              </div>

              <div className="form-group">
                <label>Avatar Color</label>
                <div className="avatar-preview-section">
                  <div
                    className="avatar-preview"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {username.charAt(0).toUpperCase() || "U"}
                  </div>
                  <input
                    type="color"
                    value={avatarColor}
                    onChange={(e) => setAvatarColor(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="Away">Away</option>
                  <option value="Do Not Disturb">Do Not Disturb</option>
                </select>
              </div>

              <button className="btn-primary" onClick={handleSaveProfile}>
                Save Profile
              </button>
            </div>
          )}

          {activeTab === "audio" && (
            <div className="settings-panel">
              <h3>Audio/Video Settings</h3>

              <div className="media-status">
                <div className="status-item">
                  <span>Video:</span>
                  <button
                    className={`toggle-btn ${isVideoEnabled ? "on" : "off"}`}
                    onClick={toggleVideo}
                  >
                    {isVideoEnabled ? "On" : "Off"}
                  </button>
                </div>
                <div className="status-item">
                  <span>Audio:</span>
                  <button
                    className={`toggle-btn ${isAudioEnabled ? "on" : "off"}`}
                    onClick={toggleAudio}
                  >
                    {isAudioEnabled ? "On" : "Off"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Camera</label>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                >
                  {devices.cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${devices.cameras.indexOf(camera) + 1}`}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-secondary"
                  onClick={() => handleChangeDevice("camera")}
                  disabled={!selectedCamera}
                >
                  Apply Camera
                </button>
              </div>

              <div className="form-group">
                <label>Microphone</label>
                <select
                  value={selectedMicrophone}
                  onChange={(e) => setSelectedMicrophone(e.target.value)}
                >
                  {devices.microphones.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${devices.microphones.indexOf(mic) + 1}`}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-secondary"
                  onClick={() => handleChangeDevice("microphone")}
                  disabled={!selectedMicrophone}
                >
                  Apply Microphone
                </button>
              </div>

              <div className="form-group">
                <label>Speaker</label>
                <select
                  value={selectedSpeaker}
                  onChange={(e) => setSelectedSpeaker(e.target.value)}
                >
                  {devices.speakers.map((speaker) => (
                    <option key={speaker.deviceId} value={speaker.deviceId}>
                      {speaker.label || `Speaker ${devices.speakers.indexOf(speaker) + 1}`}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary" onClick={testAudio}>
                  Test Audio
                </button>
              </div>
            </div>
          )}

          {activeTab === "controls" && (
            <div className="settings-panel">
              <h3>Keyboard Shortcuts</h3>

              <div className="shortcuts-list">
                <div className="shortcut-item">
                  <kbd>W</kbd> / <kbd>↑</kbd>
                  <span>Move Up</span>
                </div>
                <div className="shortcut-item">
                  <kbd>S</kbd> / <kbd>↓</kbd>
                  <span>Move Down</span>
                </div>
                <div className="shortcut-item">
                  <kbd>A</kbd> / <kbd>←</kbd>
                  <span>Move Left</span>
                </div>
                <div className="shortcut-item">
                  <kbd>D</kbd> / <kbd>→</kbd>
                  <span>Move Right</span>
                </div>
                <div className="shortcut-item">
                  <kbd>X</kbd>
                  <span>Interact with Object</span>
                </div>
                <div className="shortcut-item">
                  <kbd>ESC</kbd>
                  <span>Close Modal/Object</span>
                </div>
                <div className="shortcut-item">
                  <kbd>1</kbd> - <kbd>4</kbd>
                  <span>Quick Reactions</span>
                </div>
                <div className="shortcut-item">
                  <kbd>Ctrl</kbd> + <kbd>F</kbd>
                  <span>Search People</span>
                </div>
              </div>

              <div className="info-box">
                <p>
                  <strong>Note:</strong> Keyboard shortcuts are active when the
                  game window is focused.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

