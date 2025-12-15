import { useState, useEffect } from "react";
import "./CreateChannelModal.css";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string, type: "text" | "voice", description?: string) => void;
  defaultType?: "text" | "voice";
}

const CreateChannelModal = ({
  isOpen,
  onClose,
  onCreateChannel,
  defaultType = "text",
}: CreateChannelModalProps) => {
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState<"text" | "voice">(defaultType);
  const [description, setDescription] = useState("");

  // Reset form when modal opens/closes or defaultType changes
  useEffect(() => {
    if (isOpen) {
      setChannelType(defaultType);
      setChannelName("");
      setDescription("");
    }
  }, [isOpen, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    onCreateChannel(channelName.trim(), channelType, description.trim() || undefined);
    setChannelName("");
    setDescription("");
    setChannelType("text");
    onClose();
  };

  const handleCancel = () => {
    setChannelName("");
    setDescription("");
    setChannelType("text");
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="create-channel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Tạo kênh mới</h2>
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
                <span className="type-icon">#</span>
                <span>Kênh Chat</span>
              </button>
              <button
                type="button"
                className={`type-btn ${channelType === "voice" ? "active" : ""}`}
                onClick={() => setChannelType("voice")}
              >
                <span className="type-icon">🔊</span>
                <span>Kênh đàm thoại</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="channel-name">
              Tên kênh {channelType === "text" && "(không bao gồm dấu #)"}
            </label>
            <input
              id="channel-name"
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder={channelType === "text" ? "ví dụ: dev-team" : "ví dụ: Phòng họp"}
              className="form-input"
              required
              maxLength={100}
            />
          </div>

          {channelType === "text" && (
            <div className="form-group">
              <label htmlFor="description">Mô tả (tùy chọn)</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả về kênh này..."
                className="form-textarea"
                rows={3}
                maxLength={200}
              />
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={handleCancel}>
              Hủy
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

