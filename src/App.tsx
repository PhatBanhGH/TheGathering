import { useState, useEffect } from 'react';
import GameScene from './components/GameScene';
import Sidebar from './components/Sidebar';
import ControlBar from './components/ControlBar';
import VideoChat from './components/chat/VideoChat';
import { SocketProvider } from './contexts/SocketContext';
import { WebRTCProvider } from './contexts/WebRTCContext';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('default-room');
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    // Generate or get username from localStorage
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    } else {
      const newUsername = `user-${Math.random().toString(36).substr(2, 9)}`;
      setUsername(newUsername);
      localStorage.setItem('username', newUsername);
    }
  }, []);

  const handleJoin = () => {
    if (username.trim()) {
      setIsJoined(true);
      localStorage.setItem('username', username);
    }
  };

  if (!isJoined) {
    return (
      <div className="join-screen">
        <div className="join-container">
          <h1>Gather Town Clone</h1>
          <div className="join-form">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              className="join-input"
            />
            <input
              type="text"
              placeholder="Room ID (optional)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              className="join-input"
            />
            <button onClick={handleJoin} className="join-button">
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SocketProvider username={username} roomId={roomId}>
      <WebRTCProvider>
        <div className="app-container">
          <Sidebar />
          <div className="game-container">
            <GameScene />
            <ControlBar />
          </div>
          <VideoChat />
        </div>
      </WebRTCProvider>
    </SocketProvider>
  );
}

export default App;

