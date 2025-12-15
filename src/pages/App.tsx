import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import GameScene from "../components/GameScene";
import Sidebar from "../components/Sidebar";
import ControlBar from "../components/ControlBar";
import VideoChat from "../components/VideoChat";
import Chat from "../components/Chat";
import ObjectsLayer from "../components/ObjectsLayer";
import ZonesLayer from "../components/ZonesLayer";
import ChatPage from "./ChatPage";
import CalendarPage from "./CalendarPage";
import {
  SocketProvider,
  WebRTCProvider,
  ChatProvider,
  ObjectProvider,
  MapProvider,
  EventProvider,
  ThemeProvider,
  NotificationProvider,
} from "../contexts";
import ErrorBoundary from "../components/ErrorBoundary";
import "../App.css";

const AppPage = () => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("default-room");
  const [isJoined, setIsJoined] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check authentication - ưu tiên dữ liệu từ Lobby
    const savedName = localStorage.getItem("userName");
    if (savedName) {
      setUsername(savedName);
    } else {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      if (!token || !userStr) {
        navigate("/lobby");
        return;
      }
      try {
        const user = JSON.parse(userStr);
        setUsername(user.username || user.email);
      } catch (e) {
        navigate("/lobby");
      }
    }
  }, [navigate]);

  useEffect(() => {
    const storedRoom = localStorage.getItem("roomId");
    if (storedRoom) {
      setRoomId(storedRoom);
    }
  }, []);

  useEffect(() => {
    if (username && roomId) {
      setIsJoined(true);
    }
  }, [username, roomId]);

  if (!isJoined || !username) {
    return (
      <div className="join-screen">
        <div className="join-container">
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  const isChatPage = location.pathname === "/app/chat";
  const isCalendarPage = location.pathname === "/app/calendar";

  return (
    <ErrorBoundary>
    <ThemeProvider>
      <SocketProvider username={username} roomId={roomId}>
        <MapProvider>
          <WebRTCProvider>
            <ChatProvider roomId={roomId}>
              <ObjectProvider>
                <EventProvider>
                  <NotificationProvider>
                    <div className="app-container">
                      <Sidebar />
                      {isChatPage ? (
                        <>
                          <ChatPage />
                            {/* ControlBar integrated into ChannelList footer */}
                        </>
                      ) : isCalendarPage ? (
                        <>
                          <CalendarPage />
                          <ControlBar />
                        </>
                      ) : (
                        <>
                          <div className="game-container">
                            <GameScene />
                            <ControlBar />
                          </div>
                          <VideoChat />
                          <Chat />
                            {/* Reactions sidebar removed */}
                          <ObjectsLayer />
                          <ZonesLayer />
                        </>
                      )}
                    </div>
                  </NotificationProvider>
                </EventProvider>
              </ObjectProvider>
            </ChatProvider>
          </WebRTCProvider>
        </MapProvider>
      </SocketProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
};

export default AppPage;
