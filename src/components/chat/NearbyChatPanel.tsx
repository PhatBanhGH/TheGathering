import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { getNearbyUsers, calculateDistanceInMeters, getAvatarColor } from '../../utils';
import { formatTime } from '../../utils/date';
import './NearbyChatPanel.css';

interface NearbyChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NearbyMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'nearby';
}

const NearbyChatPanel = ({ isOpen, onClose }: NearbyChatPanelProps) => {
  const { socket, currentUser, users } = useSocket();
  const [messages, setMessages] = useState<NearbyMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate nearby users (within 200 pixels)
  const nearbyUsers = getNearbyUsers(users, currentUser, 200);

  // Listen for nearby chat messages
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (data: any) => {
      if (data.type === 'nearby') {
        setMessages((prev) => [...prev, data]);
      }
    };

    socket.on('chat-message', handleChatMessage);

    return () => {
      socket.off('chat-message', handleChatMessage);
    };
  }, [socket]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!socket || !currentUser || !inputMessage.trim()) return;

    const message: NearbyMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: currentUser.userId,
      username: currentUser.username,
      message: inputMessage.trim(),
      timestamp: Date.now(),
      type: 'nearby',
    };

    socket.emit('chat-message', message);
    setMessages((prev) => [...prev, message]);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="nearby-chat-overlay" onClick={onClose} />
      <div className="nearby-chat-panel">
        <div className="nearby-chat-header">
          <div className="header-left">
            <h3>💬 Nearby Chat</h3>
            <span className="nearby-count">
              {nearbyUsers.length} {nearbyUsers.length === 1 ? 'person' : 'people'} nearby
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="nearby-users-list">
          {nearbyUsers.length === 0 ? (
            <div className="no-users">
              <span className="no-users-icon">👥</span>
              <p>No one nearby</p>
              <small>Move closer to other users to chat</small>
            </div>
          ) : (
            nearbyUsers.map((user) => (
              <div key={user.userId} className="nearby-user-item">
                <div className="user-avatar" style={{ backgroundColor: getAvatarColor(user.userId) }}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="user-name">{user.username}</span>
                <span className="user-distance">{calculateDistance(user)}m</span>
              </div>
            ))
          )}
        </div>

        <div className="nearby-chat-messages">
          {messages.length === 0 ? (
            <div className="no-messages">
              <span className="no-messages-icon">💭</span>
              <p>No messages yet</p>
              <small>Start a conversation with nearby users</small>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`message-item ${msg.userId === currentUser?.userId ? 'own-message' : ''}`}
              >
                <div className="message-avatar" style={{ backgroundColor: getAvatarColor(msg.userId) }}>
                  {msg.username.charAt(0).toUpperCase()}
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-username">{msg.username}</span>
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="message-text">{msg.message}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="nearby-chat-input">
          <input
            type="text"
            placeholder={nearbyUsers.length > 0 ? "Message nearby users..." : "No one nearby to chat with"}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={nearbyUsers.length === 0}
          />
          <button
            className="send-btn"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || nearbyUsers.length === 0}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );

  const calculateDistance = (user: any): number => {
    if (!currentUser) return 0;
    return calculateDistanceInMeters(user.position, currentUser.position);
  };
};

export default NearbyChatPanel;
