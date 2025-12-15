import { useState, useEffect } from "react";
import { useSocket } from "../../contexts/SocketContext";
import "./InviteModal.css";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

const InviteModal = ({ isOpen, onClose, roomId }: InviteModalProps) => {
  const { users, currentUser } = useSocket();
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && roomId) {
      generateInviteLink();
    }
  }, [isOpen, roomId]);

  const generateInviteLink = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL || "http://localhost:5001"}/api/rooms/${roomId}/invite`,
        {
          method: "POST",
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setInviteLink(data.inviteLink);
      }
    } catch (error) {
      console.error("Failed to generate invite link", error);
      // Fallback to manual link
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/lobby?room=${roomId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy", error);
    }
  };

  if (!isOpen) return null;

  const currentUserCount = users.length + (currentUser ? 1 : 0);
  const maxUsers = 20;

  return (
    <div className="invite-modal-overlay" onClick={onClose}>
      <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="invite-modal-header">
          <h2>Mời người tham gia</h2>
          <button className="invite-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="invite-modal-content">
          <div className="room-info">
            <div className="room-info-item">
              <span className="room-info-label">Phòng:</span>
              <span className="room-info-value">{roomId}</span>
            </div>
            <div className="room-info-item">
              <span className="room-info-label">Số người:</span>
              <span className="room-info-value">
                {currentUserCount} / {maxUsers}
              </span>
            </div>
          </div>

          <div className="invite-link-section">
            <label>Link mời</label>
            <div className="invite-link-input-group">
              <input
                type="text"
                value={loading ? "Đang tạo link..." : inviteLink}
                readOnly
                className="invite-link-input"
              />
              <button
                className={`copy-button ${copied ? "copied" : ""}`}
                onClick={handleCopy}
                disabled={loading || !inviteLink}
              >
                {copied ? "✓ Đã copy" : "📋 Copy"}
              </button>
            </div>
          </div>

          <div className="invite-options">
            <button
              className="invite-option-btn"
              onClick={() => {
                if (inviteLink) {
                  window.open(
                    `mailto:?subject=Tham gia phòng ${roomId}&body=Hãy tham gia phòng của tôi: ${inviteLink}`,
                    "_blank"
                  );
                }
              }}
              disabled={loading || !inviteLink}
            >
              📧 Gửi qua Email
            </button>
            <button
              className="invite-option-btn"
              onClick={() => {
                if (inviteLink) {
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(`Tham gia phòng ${roomId}: ${inviteLink}`)}`,
                    "_blank"
                  );
                }
              }}
              disabled={loading || !inviteLink}
            >
              💬 Gửi qua WhatsApp
            </button>
          </div>

          {currentUserCount >= maxUsers && (
            <div className="room-full-warning">
              ⚠️ Phòng đã đầy ({maxUsers}/{maxUsers} người)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteModal;



