import { useMemo, useRef, useEffect, useState } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useChat } from "../../contexts/ChatContext";
import { useWebRTC } from "../../contexts/WebRTCContext";
import { getNearbyUsers } from "../../utils";
import "./Chat.css";

const Chat = () => {
  const { users, currentUser } = useSocket();
  const {
    isOpen,
    toggleChat,
    activeTab,
    setActiveTab,
    messages,
    sendMessage,
    dmTarget,
    setDmTarget,
    groupChats,
    selectedGroupId,
    setSelectedGroupId,
    createGroupChat,
    isHistoryLoading,
  } = useChat();
  const [inputMessage, setInputMessage] = useState("");
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const nearbyUsers = useMemo(() => {
    return getNearbyUsers(users, currentUser, 200);
  }, [users, currentUser]);

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    if (activeTab === "dm" && !dmTarget) return;
    sendMessage(inputMessage);
    setInputMessage("");
  };

  // Check if video chat is visible
  const { localStream, peers } = useWebRTC();
  const hasVideoChat = localStream || peers.size > 0;
  
  // Check if there are nearby users for video (reuse nearbyUsers calculation)
  const isVideoChatVisible = hasVideoChat || nearbyUsers.length > 0;

  return (
    <>
      {!isOpen && (
        <button 
          className={`chat-toggle ${!isVideoChatVisible ? 'no-video' : ''}`} 
          onClick={toggleChat}
        >
          💬
        </button>
      )}

      {isOpen && (
        <div className={`chat-container ${!isVideoChatVisible ? 'no-video' : ''}`}>
          <div className="chat-header">
            <div className="chat-tabs">
              <button
                className={`chat-tab ${activeTab === "nearby" ? "active" : ""}`}
                onClick={() => setActiveTab("nearby")}
              >
                Nearby ({nearbyUsers.length})
              </button>
              <button
                className={`chat-tab ${activeTab === "global" ? "active" : ""}`}
                onClick={() => setActiveTab("global")}
              >
                Global
              </button>
              <button
                className={`chat-tab ${activeTab === "dm" ? "active" : ""}`}
                onClick={() => setActiveTab("dm")}
              >
                DM
              </button>
              <button
                className={`chat-tab ${activeTab === "group" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("group");
                  if (groupChats.length > 0 && !selectedGroupId) {
                    setSelectedGroupId(groupChats[0].id);
                  }
                }}
              >
                Group ({groupChats.length})
              </button>
            </div>
            <button className="chat-close" onClick={toggleChat}>
              ✕
            </button>
          </div>

          {/* Show group members when in global chat */}
          {activeTab === "global" && (
            <div className="group-members-panel">
              <div className="group-members-header">
                <span className="group-members-title">
                  👥 Thành viên trong phòng ({users.length})
                </span>
              </div>
              <div className="group-members-list">
                {users.map((user) => (
                  <div
                    key={user.userId}
                    className={`group-member-item ${
                      user.userId === currentUser?.userId ? "current-user" : ""
                    }`}
                  >
                    <div className="member-avatar-small">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="member-name">
                      {user.username}
                      {user.userId === currentUser?.userId && " (Bạn)"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "group" && (
            <div className="group-selector">
              <div className="group-selector-header">
                <select
                  value={selectedGroupId || ""}
                  onChange={(e) => setSelectedGroupId(e.target.value || null)}
                  className="group-select"
                  title="Chọn group chat"
                  aria-label="Chọn group chat"
                >
                  <option value="">Chọn group chat</option>
                  {groupChats.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.members.length} thành viên)
                    </option>
                  ))}
                </select>
                <button
                  className="create-group-btn"
                  onClick={() => setShowCreateGroupModal(true)}
                  title="Tạo group chat mới"
                >
                  +
                </button>
              </div>
              {selectedGroupId && (
                <div className="group-members-preview">
                  {groupChats
                    .find((g) => g.id === selectedGroupId)
                    ?.members.map((memberId) => {
                      const member = users.find((u) => u.userId === memberId);
                      if (!member) return null;
                      return (
                        <div key={memberId} className="group-member-badge">
                          <div className="member-avatar-tiny">
                            {member.username.charAt(0).toUpperCase()}
                          </div>
                          <span>{member.username}</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {activeTab === "dm" && (
            <div className="dm-selector">
              <select
                value={dmTarget || ""}
                onChange={(e) => setDmTarget(e.target.value)}
                className="dm-select"
                title="Chọn người nhận tin nhắn"
                aria-label="Chọn người nhận tin nhắn"
              >
                <option value="">Chọn người nhận</option>
                {users
                  .filter((u) => u.userId !== currentUser?.userId)
                  .map((user) => (
                    <option key={user.userId} value={user.userId}>
                      {user.username}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="chat-messages">
            {isHistoryLoading && messages.length === 0 ? (
              <div className="chat-loading">
                <div className="loading-spinner"></div>
                <p>Đang tải lịch sử...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="chat-empty">
                <div className="empty-state-icon">💬</div>
                <h3 className="empty-state-title">
                  {activeTab === "dm" && !dmTarget
                    ? "Chọn người nhận để bắt đầu chat"
                    : activeTab === "dm"
                    ? "Chưa có tin nhắn nào"
                    : "Chưa có tin nhắn nào"}
                </h3>
                <p className="empty-state-description">
                  {activeTab === "dm" && dmTarget
                    ? "Bắt đầu cuộc trò chuyện với người này!"
                    : activeTab === "dm"
                    ? "Chọn một người từ danh sách để bắt đầu chat"
                    : "Gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện"}
                </p>
                {activeTab === "dm" && !dmTarget && (
                  <button 
                    className="empty-state-btn"
                    onClick={() => setActiveTab("users")}
                  >
                    Chọn người nhận
                  </button>
                )}
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isOwnMessage = msg.userId === currentUser?.userId;
                  return (
                    <div
                      key={msg.id}
                      className={`chat-message-wrapper ${
                        isOwnMessage ? "own" : "other"
                      }`}
                    >
                      {!isOwnMessage && (
                        <div className="message-avatar">
                          {msg.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div
                        className={`chat-message ${
                          isOwnMessage ? "own" : "other"
                        }`}
                      >
                        {!isOwnMessage && (
                          <div className="message-username">{msg.username}</div>
                        )}
                        <div className="message-bubble">
                          <div className="message-content">{msg.message}</div>
                          <div className="message-time">
                            {new Date(msg.timestamp).toLocaleTimeString(
                              "vi-VN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="chat-input-container">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                activeTab === "dm" && !dmTarget
                  ? "Chọn người nhận trước"
                  : activeTab === "group" && !selectedGroupId
                  ? "Chọn hoặc tạo group chat"
                  : "Nhập tin nhắn..."
              }
              className="chat-input"
              disabled={
                (activeTab === "dm" && !dmTarget) ||
                (activeTab === "group" && !selectedGroupId)
              }
            />
            <button
              onClick={handleSend}
              className="chat-send"
              disabled={
                !inputMessage.trim() ||
                (activeTab === "dm" && !dmTarget) ||
                (activeTab === "group" && !selectedGroupId)
              }
            >
              Gửi
            </button>
          </div>

          {/* Create Group Modal */}
          {showCreateGroupModal && (
            <div
              className="modal-overlay"
              onClick={() => setShowCreateGroupModal(false)}
            >
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3>Tạo Group Chat</h3>
                  <button
                    className="modal-close"
                    onClick={() => setShowCreateGroupModal(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Tên group:</label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Nhập tên group..."
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Chọn thành viên:</label>
                    <div className="member-checkbox-list">
                      {users
                        .filter((u) => u.userId !== currentUser?.userId)
                        .map((user) => (
                          <label key={user.userId} className="member-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedMembers.includes(user.userId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMembers([
                                    ...selectedMembers,
                                    user.userId,
                                  ]);
                                } else {
                                  setSelectedMembers(
                                    selectedMembers.filter(
                                      (id) => id !== user.userId
                                    )
                                  );
                                }
                              }}
                            />
                            <div className="member-avatar-small">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <span>{user.username}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn-cancel"
                    onClick={() => {
                      setShowCreateGroupModal(false);
                      setNewGroupName("");
                      setSelectedMembers([]);
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    className="btn-create"
                    onClick={() => {
                      if (newGroupName.trim() && selectedMembers.length > 0) {
                        createGroupChat(newGroupName.trim(), selectedMembers);
                        setShowCreateGroupModal(false);
                        setNewGroupName("");
                        setSelectedMembers([]);
                      }
                    }}
                    disabled={
                      !newGroupName.trim() || selectedMembers.length === 0
                    }
                  >
                    Tạo Group
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Chat;
