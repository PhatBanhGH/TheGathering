import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import Peer from "simple-peer";
import { useSocket } from "./SocketContext";
import { areUsersInSameZone } from "../utils/zoneUtils";
import { useMapSafe } from "../hooks/useMapSafe";

interface PeerConnection {
  peer: Peer.Instance;
  userId: string;
  stream?: MediaStream;
}

interface WebRTCContextType {
  localStream: MediaStream | null;
  peers: Map<string, PeerConnection>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
  startMedia: () => Promise<void>;
  stopMedia: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error("useWebRTC must be used within WebRTCProvider");
  }
  return context;
};

interface WebRTCProviderProps {
  children: ReactNode;
}

export const WebRTCProvider = ({ children }: WebRTCProviderProps) => {
  const { socket, users, currentUser } = useSocket();
  const mapContext = useMapSafe();
  const mapData = mapContext?.mapData || null;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  // Check localStorage for saved preferences, default to false if no stream
  const [isVideoEnabled, setIsVideoEnabled] = useState(() => {
    const saved = localStorage.getItem("cameraEnabled");
    return saved === "true";
  });
  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    const saved = localStorage.getItem("micEnabled");
    return saved === "true";
  });
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  const startMedia = async () => {
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("Media devices API not available");
      return;
    }

    try {
      // Check saved preferences from localStorage
      const savedCameraEnabled =
        localStorage.getItem("cameraEnabled") !== "false";
      const savedMicEnabled = localStorage.getItem("micEnabled") !== "false";

      const stream = await navigator.mediaDevices.getUserMedia({
        video: savedCameraEnabled,
        audio: savedMicEnabled,
      });
      setLocalStream(stream);
      setCameraStream(stream); // Store camera stream for later
      setIsVideoEnabled(savedCameraEnabled);
      setIsAudioEnabled(savedMicEnabled);
    } catch (error: any) {
      // Handle different error types gracefully
      if (error.name === "NotFoundError") {
        console.warn("No media devices found. Video chat will be unavailable.");
      } else if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        console.warn(
          "Media permissions denied. Video chat will be unavailable."
        );
      } else {
        console.warn("Error accessing media devices:", error.message || error);
      }
      // Don't set stream, allowing app to continue without media
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack && localStream) {
        // Replace track in local stream
        const oldVideoTrack = localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        localStream.addTrack(videoTrack);

        // Replace track in all peer connections
        peersRef.current.forEach((peerConn) => {
          const sender =  (peerConn.peer as any)?._pc?.getSenders?.().find((s: RTCRtpSender) => s.track?.kind === "video");
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });

        setIsScreenSharing(true);

        // Handle screen share stop
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }
    } catch (error) {
      console.error("Error starting screen share:", error);
    }
  };

  const stopScreenShare = async () => {
    if (!cameraStream) return;

    try {
      // Get camera video track
      const cameraVideoTrack = cameraStream.getVideoTracks()[0];
      if (cameraVideoTrack && localStream) {
        // Remove screen share track
        const screenTrack = localStream.getVideoTracks()[0];
        if (screenTrack) {
          localStream.removeTrack(screenTrack);
          screenTrack.stop();
        }

        // Add camera track back
        localStream.addTrack(cameraVideoTrack);

        // Replace track in all peer connections
        peersRef.current.forEach((peerConn) => {
          const sender =  (peerConn.peer as any)?._pc?.getSenders?.().find((s: RTCRtpSender) => s.track?.kind === "video");
          if (sender && cameraVideoTrack) {
            sender.replaceTrack(cameraVideoTrack);
          }
        });

        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error("Error stopping screen share:", error);
    }
  };

  const stopMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    peers.forEach((peerConn) => {
      peerConn.peer.destroy();
      if (peerConn.stream) {
        peerConn.stream.getTracks().forEach((track) => track.stop());
      }
    });
    setPeers(new Map());
  };

  const createPeer = (userId: string, initiator: boolean): Peer.Instance => {
    const peer = new Peer({
      initiator,
      trickle: true, // Enable trickle ICE for better connection reliability
      stream: localStream || undefined,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    // If no local stream, peer connection will still work but without media

    peer.on("signal", (data) => {
      if (socket && currentUser) {
        if (initiator) {
          socket.emit("webrtc-offer", {
            targetUserId: userId,
            offer: data,
          });
        } else {
          socket.emit("webrtc-answer", {
            targetUserId: userId,
            answer: data,
          });
        }
      }
    });

    peer.on("stream", (stream) => {
      setPeers((prev) => {
        const newPeers = new Map(prev);
        const existing = newPeers.get(userId);
        if (existing) {
          existing.stream = stream;
        } else {
          newPeers.set(userId, { peer, userId, stream });
        }
        return newPeers;
      });
    });

    peer.on("error", (err) => {
      console.error("Peer error:", err);
    });

    return peer;
  };

  useEffect(() => {
    if (!socket || !currentUser || !localStream) return;

    const zones = mapData?.zones || [];

    // Create peer connections for nearby users
    users.forEach((user) => {
      if (user.userId === currentUser.userId) return;
      if (peersRef.current.has(user.userId)) return;

      // Tính toán khoảng cách từ avatar của tôi đến các avatar khác
      const distance = Math.sqrt(
        Math.pow(user.position.x - currentUser.position.x, 2) +
          Math.pow(user.position.y - currentUser.position.y, 2)
      );

      // Check if users are in the same zone (if zones exist)
      const inSameZone =
        zones.length === 0
          ? true // No zones = public area, everyone can hear
          : areUsersInSameZone(currentUser.position, user.position, zones);

      // Nếu khoảng cách < 150 pixels VÀ trong cùng zone, bắt đầu quá trình signaling WebRTC
      if (distance < 150 && inSameZone) {
        const peer = createPeer(user.userId, true);
        setPeers((prev) => {
          const newPeers = new Map(prev);
          newPeers.set(user.userId, { peer, userId: user.userId });
          return newPeers;
        });
      }
    });

    // Remove peers for users who are too far, left, or in different zones
    peersRef.current.forEach((peerConn, userId) => {
      const user = users.find((u) => u.userId === userId);
      if (!user || user.userId === currentUser.userId) {
        peerConn.peer.destroy();
        setPeers((prev) => {
          const newPeers = new Map(prev);
          newPeers.delete(userId);
          return newPeers;
        });
        return;
      }

      const distance = Math.sqrt(
        Math.pow(user.position.x - currentUser.position.x, 2) +
          Math.pow(user.position.y - currentUser.position.y, 2)
      );

      // Check zone membership
      const inSameZone =
        zones.length === 0
          ? true
          : areUsersInSameZone(currentUser.position, user.position, zones);

      // Nếu khoảng cách > 150 pixels HOẶC khác zone, đóng PeerConnection
      if (distance >= 150 || !inSameZone) {
        peerConn.peer.destroy();
        setPeers((prev) => {
          const newPeers = new Map(prev);
          newPeers.delete(userId);
          return newPeers;
        });
      }
    });
  }, [users, currentUser, localStream, socket, mapData]);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleOffer = (data: { fromUserId: string; offer: any }) => {
      if (peersRef.current.has(data.fromUserId)) return;

      const peer = createPeer(data.fromUserId, false);
      peer.signal(data.offer);

      setPeers((prev) => {
        const newPeers = new Map(prev);
        newPeers.set(data.fromUserId, { peer, userId: data.fromUserId });
        return newPeers;
      });
    };

    const handleAnswer = (data: { fromUserId: string; answer: any }) => {
      const peerConn = peersRef.current.get(data.fromUserId);
      if (peerConn) {
        peerConn.peer.signal(data.answer);
      }
    };

    const handleIceCandidate = (data: {
      fromUserId: string;
      candidate: any;
    }) => {
      const peerConn = peersRef.current.get(data.fromUserId);
      if (peerConn) {
        peerConn.peer.signal(data.candidate);
      }
    };

    socket.on("webrtc-offer", handleOffer);
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice-candidate", handleIceCandidate);

    return () => {
      socket.off("webrtc-offer", handleOffer);
      socket.off("webrtc-answer", handleAnswer);
      socket.off("webrtc-ice-candidate", handleIceCandidate);
    };
  }, [socket, currentUser]);

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    } else {
      // Allow toggling state even without stream (for UI consistency)
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    } else {
      // Allow toggling state even without stream (for UI consistency)
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  useEffect(() => {
    // Only start media if user hasn't explicitly disabled it
    const savedCameraEnabled = localStorage.getItem("cameraEnabled");
    const savedMicEnabled = localStorage.getItem("micEnabled");

    // If both are explicitly false, don't request media
    if (savedCameraEnabled === "false" && savedMicEnabled === "false") {
      console.log("Media disabled by user, skipping media initialization");
      return;
    }

    startMedia();
    return () => {
      stopMedia();
    };
  }, []);

  return (
    <WebRTCContext.Provider
      value={{
        localStream,
        peers,
        isVideoEnabled,
        isAudioEnabled,
        isScreenSharing,
        toggleVideo,
        toggleAudio,
        startMedia,
        stopMedia,
        startScreenShare,
        stopScreenShare,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};
