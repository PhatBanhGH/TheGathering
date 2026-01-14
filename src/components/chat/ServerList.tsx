import { useState } from "react";
import { useNotifications } from "../../contexts/NotificationContext";
import "./ServerList.css";

interface Server {
  id: string;
  name: string;
  icon?: string;
  unreadCount?: number;
  isOnline?: boolean;
}

interface ServerListProps {
  servers?: Server[];
  currentServerId: string;
  onServerSelect?: (id: string) => void;
  onAddServer?: () => void;
}

const ServerList = ({ 
  servers = [], 
  currentServerId, 
  onServerSelect,
  onAddServer 
}: ServerListProps) => {
  const [hoveredServerId, setHoveredServerId] = useState<string | null>(null);
  const { unreadCount } = useNotifications();

  // Default server if none provided
  const defaultServer: Server = {
    id: "default",
    name: "My Virtual Office",
    icon: "🏠",
    isOnline: true,
    unreadCount: unreadCount > 0 ? unreadCount : undefined,
  };

  const displayServers = servers.length > 0 
    ? servers.map(server => ({
        ...server,
        unreadCount: server.unreadCount || (server.id === currentServerId && unreadCount > 0 ? unreadCount : undefined),
      }))
    : [defaultServer];

  return (
    <div className="server-list">
      {displayServers.map((server) => {
        const isActive = server.id === currentServerId;
        const isHovered = hoveredServerId === server.id;

        return (
          <div
            key={server.id}
            className={`server-item ${isActive ? "active" : ""}`}
            onClick={() => onServerSelect?.(server.id)}
            onMouseEnter={() => setHoveredServerId(server.id)}
            onMouseLeave={() => setHoveredServerId(null)}
            title={server.name}
          >
            <div className="server-icon">
              {server.icon || server.name.charAt(0).toUpperCase()}
            </div>
            {server.unreadCount && server.unreadCount > 0 && (
              <div 
                className="server-unread-badge" 
                data-count={server.unreadCount <= 9 ? server.unreadCount.toString() : undefined}
              >
                {server.unreadCount > 99 ? "99+" : server.unreadCount}
              </div>
            )}
            {server.isOnline && !isActive && (
              <div className="server-online-indicator" />
            )}
            {isHovered && !isActive && (
              <div className="server-hover-indicator" />
            )}
          </div>
        );
      })}
      {onAddServer && (
        <div
          className="server-item add-server"
          onClick={onAddServer}
          title="Add Server"
        >
          <div className="server-icon">+</div>
        </div>
      )}
    </div>
  );
};

export default ServerList;

