/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
  useCallback,
} from "react";
import Peer, { SignalData } from "simple-peer";
import { useSocket } from "./SocketContext";

// Helper: So sánh 2 mảng string xem có giống nhau không
function isSameUserList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
}

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
  setVoiceChannelUsers: (userIds: string[]) => void;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) throw new Error("useWebRTC must be used within WebRTCProvider");
  return context;
};

export const WebRTCProvider = ({ children }: { children: ReactNode }) => {
  const { socket, currentUser } = useSocket();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());

  const [isVideoEnabled, setIsVideoEnabled] = useState(
    () => localStorage.getItem("cameraEnabled") !== "false"
  );
  const [isAudioEnabled, setIsAudioEnabled] = useState(
    () => localStorage.getItem("micEnabled") !== "false"
  );
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  // Ref lưu danh sách user hiện tại để so sánh
  const voiceChannelUsersRef = useRef<string[]>([]);
  const startMediaRef = useRef<boolean>(false);

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  // --- 1. MEDIA HANDLING ---
  const startMedia = useCallback(async () => {
    if (startMediaRef.current || localStream) {
      console.log(
        "⚠️ startMedia called but already processing or stream exists."
      );
      return;
    }
    startMediaRef.current = true;

    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn("Media devices API not available");
      startMediaRef.current = false;
      return;
    }

    try {
      console.log("📸 Requesting user media...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      stream.getVideoTracks().forEach((t) => (t.enabled = isVideoEnabled));
      stream.getAudioTracks().forEach((t) => (t.enabled = isAudioEnabled));

      setLocalStream(stream);
      setCameraStream(stream);
      console.log("✅ Local stream acquired:", stream.id);
    } catch (error) {
      console.error("❌ Error accessing media devices:", error);
    } finally {
      startMediaRef.current = false;
    }
  }, [localStream, isVideoEnabled, isAudioEnabled]);

  const stopMedia = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      setCameraStream(null);
    }
    peersRef.current.forEach((p) => p.peer.destroy());
    setPeers(new Map());
    peersRef.current = new Map();
    voiceChannelUsersRef.current = []; // Reset list khi stop
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
        localStorage.setItem("cameraEnabled", String(!isVideoEnabled));
      }
    }
  }, [localStream, isVideoEnabled]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
        localStorage.setItem("micEnabled", String(!isAudioEnabled));
      }
    }
  }, [localStream, isAudioEnabled]);

  // Screen share
  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack && localStream) {
        const oldVideoTrack = localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        localStream.addTrack(videoTrack);

        peersRef.current.forEach((peerConn) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sender = (peerConn.peer as any)?._pc
            ?.getSenders?.()
            .find((s: RTCRtpSender) => s.track?.kind === "video");
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });

        setIsScreenSharing(true);
        videoTrack.onended = () => stopScreenShare();
      }
    } catch (error) {
      console.error("Error starting screen share:", error);
    }
  };

  const stopScreenShare = () => {
    if (!cameraStream || !localStream) return;
    try {
      const cameraVideoTrack = cameraStream.getVideoTracks()[0];
      if (cameraVideoTrack) {
        const screenTrack = localStream.getVideoTracks()[0];
        if (screenTrack) {
          localStream.removeTrack(screenTrack);
          screenTrack.stop();
        }
        localStream.addTrack(cameraVideoTrack);

        peersRef.current.forEach((peerConn) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sender = (peerConn.peer as any)?._pc
            ?.getSenders?.()
            .find((s: RTCRtpSender) => s.track?.kind === "video");
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

  // --- 2. PEER CREATION ---
  const createPeer = useCallback(
    (userId: string, initiator: boolean, stream: MediaStream) => {
      console.log(`🛠 Creating peer for ${userId} (Initiator: ${initiator})`);

      const peer = new Peer({
        initiator,
        trickle: true,
        stream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        },
      });

      peer.on("signal", (data) => {
        if (!socket || !currentUser) return;
        socket.emit(initiator ? "webrtc-offer" : "webrtc-answer", {
          targetUserId: userId,
          [initiator ? "offer" : "answer"]: data,
        });
      });

      peer.on("stream", (remoteStream) => {
        console.log(`🎥 Received stream from ${userId} (${remoteStream.id})`);
        setPeers((prev) => {
          const newMap = new Map(prev);
          if (newMap.has(userId)) {
            const oldPeerData = newMap.get(userId)!;
            // Tạo object mới để React nhận ra thay đổi (tránh mutate trực tiếp)
            newMap.set(userId, {
              ...oldPeerData,
              stream: remoteStream,
            });
          } else {
            // Trường hợp hiếm: stream đến trước khi ta kịp set entry
            newMap.set(userId, { peer, userId, stream: remoteStream });
          }
          return newMap;
        });
      });

      peer.on("error", (err) => console.error(`❌ Peer error ${userId}:`, err));

      peer.on("close", () => {
        console.log(`🔌 Peer closed ${userId}`);
        setPeers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
      });

      return peer;
    },
    [currentUser, socket]
  );

  // --- 3. CONNECTION LOGIC (FIXED LOOP) ---
  const setVoiceChannelUsers = useCallback(
    (userIds: string[]) => {
      const unchanged = isSameUserList(voiceChannelUsersRef.current, userIds);
      const canConnectNow = !!socket && !!currentUser && !!localStream;

      // 🛑 Chỉ skip nếu danh sách không đổi VÀ chúng ta đã có stream + đã có peer/đã xử lý trước đó
      if (unchanged && canConnectNow && peersRef.current.size > 0) {
        console.log(
          "⚠️ User list unchanged and already connected, skipping update."
        );
        return;
      }

      console.log("🔄 Voice users updated:", {
        previous: voiceChannelUsersRef.current,
        current: userIds,
      });
      voiceChannelUsersRef.current = userIds;

      // Trigger logic kết nối
      if (!socket || !currentUser || !localStream) {
        console.log(
          "⏳ Waiting for socket/currentUser/localStream before connecting"
        );
        return;
      }

      // 1. Kết nối với người mới
      userIds.forEach((userId) => {
        if (userId === currentUser.userId) return;
        if (!peersRef.current.has(userId)) {
          const isInitiator = currentUser.userId < userId;
          console.log(
            `✨ Connecting to new user ${userId} (Initiator: ${isInitiator})`
          );
          const newPeer = createPeer(userId, isInitiator, localStream);
          setPeers((prev) =>
            new Map(prev).set(userId, { peer: newPeer, userId })
          );
        }
      });

      // 2. Xóa người cũ
      peersRef.current.forEach((conn, userId) => {
        if (!userIds.includes(userId) && userId !== currentUser.userId) {
          console.log(`🗑 User ${userId} left. Destroying peer.`);
          conn.peer.destroy();
          setPeers((prev) => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
          });
        }
      });
    },
    [socket, currentUser, localStream, createPeer]
  );

  // Re-run connection logic khi localStream sẵn sàng
  useEffect(() => {
    if (localStream && voiceChannelUsersRef.current.length > 0) {
      // Gọi lại logic kết nối với danh sách hiện tại
      setVoiceChannelUsers([...voiceChannelUsersRef.current]);
    }
  }, [localStream, setVoiceChannelUsers]);

  // --- 4. SIGNALING HANDLERS ---
  useEffect(() => {
    if (!socket || !localStream || !currentUser) return;

    const handleOffer = ({
      fromUserId,
      offer,
    }: {
      fromUserId: string;
      offer: SignalData;
    }) => {
      // Nếu đã có peer, signal offer vào đó
      if (peersRef.current.has(fromUserId)) {
        console.log(`📥 Re-signaling offer to existing peer ${fromUserId}`);
        peersRef.current.get(fromUserId)!.peer.signal(offer);
        return;
      }
      // Nếu chưa có, tạo peer mới
      console.log(
        `🆕 Creating non-initiator peer for ${fromUserId} from Offer`
      );
      const newPeer = createPeer(fromUserId, false, localStream);
      newPeer.signal(offer);
      setPeers((prev) =>
        new Map(prev).set(fromUserId, { peer: newPeer, userId: fromUserId })
      );
    };

    const handleAnswer = ({
      fromUserId,
      answer,
    }: {
      fromUserId: string;
      answer: SignalData;
    }) => {
      const peerConn = peersRef.current.get(fromUserId);
      if (peerConn) {
        console.log(`📥 Received Answer from ${fromUserId}`);
        peerConn.peer.signal(answer);
      } else {
        console.warn(
          `⚠️ Received answer from ${fromUserId} but peer not found`
        );
      }
    };

    const handleIceCandidate = ({
      fromUserId,
      candidate,
    }: {
      fromUserId: string;
      candidate: SignalData;
    }) => {
      const peerConn = peersRef.current.get(fromUserId);
      if (peerConn) {
        peerConn.peer.signal(candidate);
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
  }, [socket, localStream, currentUser, createPeer]);

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
        setVoiceChannelUsers,
      }}
    >
      {children}
    </WebRTCContext.Provider>
  );
};
