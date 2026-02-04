import { useState, useEffect } from "react";
import GameScene from "./components/GameScene";
import Sidebar from "./components/Sidebar";
import ControlBar from "./components/ControlBar";
import VideoChat from "./components/chat/VideoChat";
import { SocketProvider } from "./contexts/SocketContext";
import { WebRTCProvider } from "./contexts/WebRTCContext";
import "./index.css";

function GameApp() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("default-room");
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    // Generate or get username from localStorage
    const savedUsername = localStorage.getItem("username");
    if (savedUsername) {
      setUsername(savedUsername);
    } else {
      const newUsername = `user-${Math.random().toString(36).substr(2, 9)}`;
      setUsername(newUsername);
      localStorage.setItem("username", newUsername);
    }
  }, []);

  const handleJoin = () => {
    if (username.trim()) {
      setIsJoined(true);
      localStorage.setItem("username", username);
    }
  };

  if (!isJoined) {
    return (
      <div className="flex justify-center items-center w-screen h-screen bg-gradient-to-br from-indigo-500 to-purple-600">
        <div className="bg-white p-8 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] min-w-[400px]">
          <h1 className="text-center mb-8 text-gray-800">Gather Town Clone</h1>
          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleJoin()}
              className="px-3 py-3 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-indigo-600"
            />
            <input
              type="text"
              placeholder="Room ID (optional)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleJoin()}
              className="px-3 py-3 border-2 border-gray-300 rounded-lg text-base transition-colors focus:outline-none focus:border-indigo-600"
            />
            <button
              onClick={handleJoin}
              className="px-3 py-3 bg-indigo-600 text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-colors hover:bg-indigo-700"
            >
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
        <div className="flex w-screen h-screen overflow-hidden bg-[#1a1a1a]">
          <Sidebar />
          <div className="flex-1 relative flex flex-col overflow-hidden">
            <GameScene />
            <ControlBar />
          </div>
          <VideoChat />
        </div>
      </WebRTCProvider>
    </SocketProvider>
  );
}

export default GameApp;
