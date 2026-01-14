import { useRef, useEffect, useState, useMemo } from "react";
import MessageItem from "./MessageItem";
import DateSeparator from "./DateSeparator";
import SearchModal from "../modals/SearchModal";
import FileUpload from "./FileUpload";
import "./ChatArea.css";

interface Message {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  editedAt?: number;
  replyTo?: {
    id: string;
    username: string;
    message: string;
  };
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

interface ChatAreaProps {
  channelName: string;
  channelType?: "text" | "dm";
  messages: Message[];
  currentUserId?: string;
  onSendMessage: (content: string, attachments?: Array<{filename: string; originalName: string; mimeType: string; size: number; url: string}>) => void;
  onReply?: (messageId: string, content: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  inputPlaceholder?: string;
  typingUsers?: string[]; // NEW: List of usernames currently typing
}

const ChatArea = ({
  channelName,
  channelType = "text",
  messages,
  currentUserId,
  onSendMessage,
  onReply,
  onReact,
  onEdit,
  onDelete,
  inputPlaceholder,
  typingUsers = [], // NEW: Default to empty array
}: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [attachments, setAttachments] = useState<Array<{filename: string; originalName: string; mimeType: string; size: number; url: string}>>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() && attachments.length === 0) return;
    
    if (replyingTo) {
      onReply?.(replyingTo.id, inputValue);
      setReplyingTo(null);
    } else {
      onSendMessage(inputValue, attachments.length > 0 ? attachments : undefined);
    }
    setInputValue("");
    setAttachments([]);
  };

  const handleFileUpload = () => {
    // File is being uploaded, FileUpload component will handle it
  };

  const handleUploadComplete = (fileUrl: string, fileData: any) => {
    setAttachments((prev) => [...prev, {
      filename: fileData.filename,
      originalName: fileData.originalName,
      mimeType: fileData.mimeType,
      size: fileData.size,
      url: fileUrl,
    }]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Open search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      // Ctrl/Cmd + F: Open search (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setShowSearch(true);
      }
      // Escape: Close search
      if (e.key === "Escape" && showSearch) {
        setShowSearch(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearch]);

  // Group messages and add date separators
  const groupedMessages = useMemo(() => {
    if (messages.length === 0) return [];

    const grouped: Array<Message | { type: "date"; date: Date }> = [];
    let currentGroup: Message[] = [];
    let lastDate: Date | null = null;
    const GROUP_TIME_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    messages.forEach((msg) => {
      const msgDate = new Date(msg.timestamp);
      const msgDateOnly = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());

      // Add date separator if date changed
      if (!lastDate || msgDateOnly.getTime() !== lastDate.getTime()) {
        if (currentGroup.length > 0) {
          grouped.push(...currentGroup);
          currentGroup = [];
        }
        grouped.push({ type: "date", date: msgDateOnly });
        lastDate = msgDateOnly;
      }

      // Check if should group with previous message in current group
      const shouldGroup =
        currentGroup.length > 0 &&
        currentGroup[currentGroup.length - 1].userId === msg.userId &&
        msg.timestamp - currentGroup[currentGroup.length - 1].timestamp < GROUP_TIME_THRESHOLD;

      if (shouldGroup) {
        currentGroup.push(msg);
      } else {
        if (currentGroup.length > 0) {
          grouped.push(...currentGroup);
          currentGroup = [];
        }
        currentGroup.push(msg);
      }
    });

    if (currentGroup.length > 0) {
      grouped.push(...currentGroup);
    }

    return grouped;
  }, [messages]);

  const handleReply = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      setReplyingTo(message);
    }
  };

  return (
    <div className="chat-area">
      {/* Discord-style Header */}
      <div className="chat-area-header">
        <div className="chat-area-title">
          <span className="channel-type-icon">#</span>
          <span className="channel-name">{channelName}</span>
        </div>
        <div className="chat-area-actions">
          <button className="header-icon-btn" title="Thông báo" onClick={() => setShowSearch(true)}>
            🔔
          </button>
          <button className="header-icon-btn" title="Ghim" onClick={() => setShowSearch(true)}>
            📌
          </button>
          <button className="header-icon-btn" title="Thành viên" onClick={() => setShowSearch(true)}>
            👥
          </button>
          <div className="header-search">
            <input
              type="text"
              placeholder={`Tìm kiếm ${channelName}`}
              className="header-search-input"
              onFocus={() => setShowSearch(true)}
            />
          </div>
          <button className="header-icon-btn" title="Trợ giúp">
            ?
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages-wrapper">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="empty-state-icon">💬</div>
            <h3 className="empty-state-title">Chưa có tin nhắn nào</h3>
            <p className="empty-state-description">Bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn đầu tiên!</p>
            <div className="empty-state-actions">
              <button 
                className="empty-state-btn"
                onClick={() => {
                  // Focus vào input
                  const input = document.querySelector('.chat-input input') as HTMLInputElement;
                  input?.focus();
                }}
              >
                Gửi tin nhắn đầu tiên
              </button>
            </div>
          </div>
        ) : (
          <div className="chat-messages-list">
            {groupedMessages.map((item, index) => {
              if ("type" in item && item.type === "date") {
                return <DateSeparator key={`date-${item.date.getTime()}`} date={item.date} />;
              }

              const msg = item as Message;
              const isOwnMessage = msg.userId === currentUserId;
              
              // Check if previous item is a message from the same user
              const prevItem = index > 0 ? groupedMessages[index - 1] : null;
              const isGrouped =
                prevItem &&
                !("type" in prevItem) &&
                (prevItem as Message).userId === msg.userId &&
                msg.timestamp - (prevItem as Message).timestamp < 5 * 60 * 1000;

              return (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  isGrouped={isGrouped || false}
                  isOwnMessage={isOwnMessage}
                  currentUserId={currentUserId}
                  onReply={handleReply}
                  onReact={onReact}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              );
            })}
            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                <span>{typingUsers.length === 1 ? `${typingUsers[0]} đang gõ...` : `${typingUsers.length} người đang gõ...`}</span>
                <div className="typing-indicator-dots">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="reply-preview">
          <div className="reply-preview-content">
            <span className="reply-preview-label">Đang trả lời</span>
            <span className="reply-preview-username">{replyingTo.username}</span>
            <span className="reply-preview-message">{replyingTo.message}</span>
          </div>
          <button
            className="reply-preview-close"
            onClick={() => setReplyingTo(null)}
            title="Hủy"
          >
            ✕
          </button>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="attachments-preview">
          {attachments.map((att, index) => (
            <div key={index} className="attachment-preview-item">
              {att.mimeType.startsWith("image/") ? (
                <img src={att.url} alt={att.originalName} className="attachment-preview-image" />
              ) : (
                <div className="attachment-preview-file">
                  <span className="attachment-icon">📎</span>
                  <span className="attachment-name">{att.originalName}</span>
                  <span className="attachment-size">
                    {(att.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              )}
              <button
                className="attachment-remove-btn"
                onClick={() => removeAttachment(index)}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="chat-input-wrapper">
        <div className="chat-input-container">
          <FileUpload
            onFileSelect={handleFileUpload}
            onUploadComplete={handleUploadComplete}
            maxSize={10 * 1024 * 1024}
            acceptedTypes={["image/*", "application/pdf", "text/*"]}
          />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              replyingTo
                ? `Trả lời ${replyingTo.username}...`
                : inputPlaceholder || `Nhắn #${channelName}`
            }
            className="chat-input"
          />
          <div className="input-toolbar">
            <button className="toolbar-icon-btn" title="Emoji">😀</button>
            <button className="toolbar-icon-btn" title="GIF">GIF</button>
            <button className="toolbar-icon-btn" title="Sticker">🎨</button>
            <button className="toolbar-icon-btn" title="Gift">🎁</button>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        roomId={localStorage.getItem("roomId") || "default-room"}
        channelId={channelType === "text" ? channelName : undefined}
        onMessageClick={(messageId) => {
          // Scroll to message when clicked
          const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
            // Highlight message briefly
            messageElement.classList.add("message-highlight");
            setTimeout(() => {
              messageElement.classList.remove("message-highlight");
            }, 2000);
          }
        }}
      />
    </div>
  );
};

export default ChatArea;

