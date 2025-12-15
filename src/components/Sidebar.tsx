import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext";
import { InviteModal } from "./modals";
import NotificationPanel from "./NotificationPanel";
import { useNotifications } from "../contexts/NotificationContext";
import "./Sidebar.css";

const Sidebar = () => {
  const { users, currentUser, isConnected, socket } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  // Xác định tab active dựa trên route hiện tại
  const getActiveTab = () => {
    if (location.pathname === "/app/chat") return "chat";
    if (location.pathname === "/app/calendar") return "calendar";
    if (location.pathname.includes("/app")) return "users";
    return "users";
  };

  const [activeTab, setActiveTab] = useState<"users" | "calendar" | "chat">(getActiveTab());

  // Đồng bộ activeTab khi location thay đổi
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  // Gộp danh sách user giống panel chat: 1 bản duy nhất theo username, ưu tiên online
  const { onlineUsers, offlineUsers, filteredOnlineUsers, filteredOfflineUsers } =
    (() => {
      const byUsername = new Map<
        string,
        (typeof users)[0] | typeof currentUser | null | undefined
      >();

      users.forEach((u) => {
        if (!u) return;
        const existing = byUsername.get(u.username);
        const status = (u as any).status || "online";
        const existingStatus = (existing as any)?.status || "offline";
        if (!existing || (existingStatus === "offline" && status === "online")) {
          byUsername.set(u.username, u);
        }
      });

      if (currentUser) {
        const existing = byUsername.get(currentUser.username);
        const existingStatus = (existing as any)?.status || "offline";
        if (!existing || existingStatus === "offline") {
          byUsername.set(currentUser.username, {
            ...currentUser,
            status: "online" as const,
          });
        }
      }

      const merged = Array.from(byUsername.values()).filter(
        (u): u is NonNullable<typeof u> => !!u
      );

      const online = merged.filter(
        (u) => (u as any).status !== "offline"
      );
      const offline = merged.filter((u) => (u as any).status === "offline");

      const filteredOnline = online.filter((u) =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const filteredOffline = offline.filter((u) =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return {
        onlineUsers: online,
        offlineUsers: offline,
        filteredOnlineUsers: filteredOnline,
        filteredOfflineUsers: filteredOffline,
      };
    })();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotifications();
  const roomId = localStorage.getItem("roomId") || "default-room";

  const handleExit = () => {
    // Disconnect socket before navigating to ensure backend receives disconnect event
    // This will trigger user-left event and update user status to offline
    if (socket) {
      console.log("Disconnecting socket before exit...");
      socket.disconnect();
    }
    // Clear local storage
    localStorage.removeItem("roomId");
    localStorage.removeItem("userId");
    // Navigate to spaces
    navigate("/spaces");
  };

  const handleTabClick = (tab: "users" | "calendar" | "chat") => {
    setActiveTab(tab);
    if (tab === "chat") {
      navigate("/app/chat");
    } else if (tab === "calendar") {
      navigate("/app/calendar");
    } else {
      navigate("/app");
    }
  };

  const projectName = "My Virtual Office";

  return (
    <div className={`sidebar ${activeTab !== "users" ? "collapsed" : ""}`}>
      {/* Vertical Navigation Strip */}
      <div className="sidebar-nav-strip">
        <button
          className={`nav-icon-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => handleTabClick("users")}
          title="People"
        >
          🗺️
        </button>
        <button
          className={`nav-icon-btn ${activeTab === "calendar" ? "active" : ""}`}
          onClick={() => handleTabClick("calendar")}
          title="Calendar"
        >
          📅
        </button>
        <button
          className={`nav-icon-btn ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => handleTabClick("chat")}
          title="Chat"
        >
          💬
        </button>
      </div>

      {/* Main Sidebar Panel - Only show for Users tab */}
      {activeTab === "users" && (
        <div className="sidebar-main">
          <div className="sidebar-header">
            <h2>{projectName}</h2>
            <button
              className="notification-btn-sidebar"
              onClick={() => setShowNotifications(true)}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>
          </div>

          <div className="sidebar-section">
            <h3>Experience Gather together</h3>
            <p className="section-subtitle">Invite your closest collaborators.</p>
            <button
              className="invite-button"
              onClick={() => setShowInviteModal(true)}
            >
              Invite
            </button>
          </div>

          <div className="sidebar-section">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search people"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <span className="search-hint">Ctrl F</span>
            </div>
          </div>

          {/* Online Users Panel - Trực tuyến */}
          <div className="online-users-panel">
            <div className="user-list-header">
              <span>Trực tuyến ({onlineUsers.length}/20)</span>
            </div>
            <div className="user-list">
              {filteredOnlineUsers.map((user) => (
                <div key={user.userId} className="user-item">
                  <div className="user-avatar-wrapper">
                    <div className="user-avatar">{user.avatar}</div>
                    <div className="status-dot online"></div>
                  </div>
                  <div className="user-info">
                    <span className="user-name">{user.username}</span>
                    <span className="user-status">Online</span>
                  </div>
                  <button
                    className="follow-btn"
                    onClick={() => {
                      // Follow functionality
                      console.log("Follow", user.userId);
                    }}
                    title="Follow"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Offline Users Panel - Ngoại tuyến */}
          {filteredOfflineUsers.length > 0 && (
            <div className="offline-users-panel">
              <div className="user-list-header">
                <span>Ngoại tuyến ({offlineUsers.length})</span>
              </div>
              <div className="user-list">
                {filteredOfflineUsers.map((user) => (
                  <div key={user.userId} className="user-item offline">
                    <div className="user-avatar-wrapper">
                      <div className="user-avatar">{user.avatar}</div>
                      <div className="status-dot offline"></div>
                    </div>
                    <div className="user-info">
                      <span className="user-name">{user.username}</span>
                      <span className="user-status">Offline</span>
                    </div>
                    <button
                      className="follow-btn"
                      onClick={() => {
                        // Follow functionality
                        console.log("Follow", user.userId);
                      }}
                      title="Follow"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sidebar-footer">
            <div className="connection-status">
              <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <button className="exit-button" onClick={handleExit}>
              Thoát
            </button>
          </div>
        </div>
      )}

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roomId={roomId}
      />
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
};

export default Sidebar;

