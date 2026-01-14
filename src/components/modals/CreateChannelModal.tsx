import { useState, useEffect } from "react";
import "./CreateChannelModal.css";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string, type: "text" | "voice", description?: string, isPrivate?: boolean) => void;
  defaultType?: "text" | "voice";
}

const CreateChannelModal = ({
  isOpen,
  onClose,
  onCreateChannel,
  defaultType = "text",
}: CreateChannelModalProps) => {
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState<"text" | "voice">(defaultType || "text");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  // Reset form when modal opens/closes or defaultType changes
  useEffect(() => {
    if (isOpen) {
      setChannelType(defaultType);
      setChannelName("");
      setDescription("");
      setIsPrivate(false);
    }
  }, [isOpen, defaultType]);

  // ESC to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    onCreateChannel(channelName.trim(), channelType, description.trim() || undefined, isPrivate);
    setChannelName("");
    setDescription("");
    setChannelType("text");
    setIsPrivate(false);
    onClose();
  };

  const handleCancel = () => {
    setChannelName("");
    setDescription("");
    setChannelType("text");
    setIsPrivate(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="create-channel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Tạo kênh</h2>
            <p className="modal-subtitle">trong {channelType === "text" ? "Kênh Chat" : channelType === "voice" ? "Kênh đàm thoại" : "Diễn Đàn"}</p>
          </div>
          <button className="modal-close-btn" onClick={handleCancel}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="channel-type">Loại kênh</label>
            <div className="channel-type-selector">
              <button
                type="button"
                className={`type-btn ${channelType === "text" ? "active" : ""}`}
                onClick={() => setChannelType("text")}
              >
                <div className="type-radio">
                  <div className={`radio-dot ${channelType === "text" ? "checked" : ""}`}></div>
                </div>
                <span className="type-icon">#</span>
                <div className="type-content">
                  <span className="type-title">Văn bản</span>
                  <span className="type-description">Gửi tin nhắn, hình ảnh, ảnh GIF, emoji, ý kiến, và chơi chữ</span>
                </div>
              </button>
              <button
                type="button"
                className={`type-btn ${channelType === "voice" ? "active" : ""}`}
                onClick={() => setChannelType("voice")}
              >
                <div className="type-radio">
                  <div className={`radio-dot ${channelType === "voice" ? "checked" : ""}`}></div>
                </div>
                <span className="type-icon">🔊</span>
                <div className="type-content">
                  <span className="type-title">Giọng nói</span>
                  <span className="type-description">Cùng gặp mặt bằng gọi thoại, video, và chia sẻ màn hình</span>
                </div>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="channel-name">Tên kênh</label>
            <div className="input-with-prefix">
              <span className="input-prefix">#</span>
              <input
                id="channel-name"
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="kênh-mới"
                className="form-input"
                required
                maxLength={100}
              />
              <button type="button" className="input-emoji-btn" title="Add emoji">😀</button>
            </div>
          </div>

          <div className="form-group">
            <div className="private-channel-toggle">
              <div className="toggle-icon">🔒</div>
              <div className="toggle-content">
                <div className="toggle-header">
                  <span className="toggle-label">Kênh Riêng</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <p className="toggle-description">
                  Chỉ có thành viên và vai trò được chọn mới có thể nhìn thấy kênh này.
                </p>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={handleCancel}>
              Hủy bỏ
            </button>
            <button type="submit" className="btn-create" disabled={!channelName.trim()}>
              Tạo kênh
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;

