import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Lazy load heavy components for better code splitting
const GameScene = lazy(() => import("../components/game/GameScene"));
const Sidebar = lazy(() => import("../components/Sidebar"));
const ControlBar = lazy(() => import("../components/ControlBar"));
const VideoChat = lazy(() => import("../components/chat/VideoChat"));
const Chat = lazy(() => import("../components/chat/Chat"));
const MapLayers = lazy(() => import("../components/game/MapLayers"));
const ChatPage = lazy(() => import("./ChatPage"));
const EventsPage = lazy(() => import("./EventsPage"));
const ProfilePage = lazy(() => import("./ProfilePage"));
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
import { SearchModal } from "../components/modals"; // Ensure this is correct
import { analytics } from "../utils/analytics";

const AppPage = () => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("default-room");
  const [isJoined, setIsJoined] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check authentication - prioritize Lobby data
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
      // Track room join
      analytics.trackUserAction("room_joined", {
        roomId,
        username,
      });
    }
  }, [username, roomId]);

  // Track page views
  useEffect(() => {
    analytics.trackPageView(location.pathname);
  }, [location.pathname]);

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearchModal(true);
      }
      if (e.key === "Escape" && showSearchModal) {
        setShowSearchModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearchModal]);

  if (!isJoined || !username) {
    return (
      <div className="flex justify-center items-center w-screen h-screen bg-obsidian text-white">
        <div className="flex flex-col items-center p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-2xl">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(139,92,246,0.5)]"></div>
          <h1 className="text-lg font-outfit tracking-wide font-medium text-slate-200">Initializing...</h1>
        </div>
      </div>
    );
  }

  const isChatPage = location.pathname === "/app/chat";
  const isProfilePage = location.pathname.startsWith("/app/profile");
  const isEventsPage = location.pathname === "/app/events";

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SocketProvider username={username} roomId={roomId}>
          <MapProvider>
            {/* <WebRTCProvider> */}
              <ChatProvider roomId={roomId}>
                <ObjectProvider>
                  <EventProvider>
                    <NotificationProvider>
                      <div className="flex w-screen h-screen overflow-hidden bg-obsidian text-slate-100 font-sans selection:bg-violet-500/30">
                        {/* Global Background Mesh */}
                        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,0,255,0.1),rgba(0,0,0,0)_50%)] pointer-events-none" />
                        
                        <Suspense
                          fallback={
                            <div className="flex items-center justify-center w-full h-full bg-obsidian">
                             <div className="flex flex-col items-center">
                                <div className="w-10 h-10 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                <div className="text-xs text-slate-500 uppercase tracking-widest">Loading Interface</div>
                              </div>
                            </div>
                          }
                        >
                          <Sidebar />
                          {isChatPage ? (
                            <>
                              <ChatPage />
                              <VideoChat />
                            </>
                          ) : isEventsPage ? (
                            <>
                              <EventsPage />
                            </>
                          ) : isProfilePage ? (
                            <>
                              <ProfilePage />
                            </>
                          ) : (
                            <>
                              <div className="flex-1 relative flex flex-col overflow-hidden bg-[#0a0a0c] m-2 rounded-2xl border border-white/5 shadow-2xl">
                                <GameScene />
                                <ControlBar />
                              </div>
                              <VideoChat />
                              <Chat />
                              <MapLayers />
                            </>
                          )}
                        </Suspense>
                      </div>
                      
                      {showSearchModal && (
                        <SearchModal
                            isOpen={showSearchModal}
                            onClose={() => setShowSearchModal(false)}
                            roomId={roomId}
                        />
                      )}
                    </NotificationProvider>
                  </EventProvider>
                </ObjectProvider>
              </ChatProvider>
            {/* </WebRTCProvider> */}
          </MapProvider>
        </SocketProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default AppPage;
