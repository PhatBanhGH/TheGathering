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
import { cameraManager } from "../utils/cameraManager";

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
  mediaError: string | null;
  cameraOwner: { tabId: string; userId: string } | null;
  toggleVideo: () => void;
  toggleAudio: () => void;
  startMedia: (isRetry?: boolean) => Promise<void>;
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
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [cameraOwner, setCameraOwner] = useState<{ tabId: string; userId: string } | null>(null);

  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  // Ref lưu danh sách user hiện tại để so sánh
  const voiceChannelUsersRef = useRef<string[]>([]);
  const startMediaRef = useRef<boolean>(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

  // Set userId cho camera manager
  useEffect(() => {
    if (currentUser?.userId) {
      cameraManager.setUserId(currentUser.userId);
    }
  }, [currentUser?.userId]);

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  // --- 1. MEDIA HANDLING ---
  const startMedia = useCallback(async (isRetry = false) => {
    // Nếu đã có stream, không cần request lại
    if (localStream) {
      console.log("✅ Local stream already exists, skipping request.");
      return;
    }
    
    // Nếu đang xử lý và không phải retry, chờ đợi
    if (startMediaRef.current && !isRetry) {
      console.log("⚠️ startMedia already processing, skipping duplicate call.", {
        isRetry,
        hasLocalStream: !!localStream,
        startMediaRef: startMediaRef.current
      });
      return;
    }
    
    console.log(`🎬 startMedia called (isRetry: ${isRetry}, retryCount: ${retryCountRef.current})`);
    
    // Kiểm tra camera lock
    const canAcquire = cameraManager.canAcquireCamera();
    if (!canAcquire) {
      const owner = cameraManager.getCameraOwner();
      console.log(`🔒 Camera is locked by another tab:`, owner);
      setMediaError(`Camera đang được sử dụng bởi tab khác${owner?.userId ? ` (${owner.userId})` : ''}. Đang đợi...`);
      setCameraOwner(owner);
      
      // Retry sau một khoảng thời gian
      const retryDelay = 2000;
      retryTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Retrying camera acquisition...');
        startMedia(true);
      }, retryDelay);
      return;
    }

    // Thử acquire lock
    const lockAcquired = await cameraManager.acquireCameraLock();
    if (!lockAcquired) {
      console.log('❌ Failed to acquire camera lock');
      setMediaError('Không thể lấy quyền sử dụng camera. Đang thử lại...');
      
      const retryDelay = 2000;
      retryTimeoutRef.current = setTimeout(() => {
        startMedia(true);
      }, retryDelay);
      return;
    }

    startMediaRef.current = true;
    setMediaError(null);
    setCameraOwner(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn("Media devices API not available");
      setMediaError("Trình duyệt không hỗ trợ truy cập camera/microphone");
      startMediaRef.current = false;
      cameraManager.releaseCameraLock();
      return;
    }

    try {
      const currentRetry = retryCountRef.current;
      console.log(`📸 Requesting user media... ${isRetry ? `(Retry ${currentRetry + 1})` : ""}`);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Kiểm tra xem stream có thực sự hoạt động không
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      if (!videoTrack || !audioTrack) {
        throw new Error("Stream không có video hoặc audio track");
      }

      // Kiểm tra trạng thái của video track
      if ((videoTrack as any).readyState === 'ended') {
        throw new Error("Video track đã bị kết thúc");
      }

      // Đợi một chút để đảm bảo track đã sẵn sàng
      await new Promise(resolve => setTimeout(resolve, 100));

      // Kiểm tra lại sau khi đợi
      if ((videoTrack as any).readyState === 'ended') {
        throw new Error("Video track bị kết thúc sau khi khởi tạo");
      }

      // CRITICAL: Verify video track có data thực sự không
      // Sử dụng ImageCapture API để test
      try {
        const imageCapture = new ImageCapture(videoTrack);
        const capabilities = imageCapture.track.getCapabilities();
        console.log('📊 Camera capabilities:', capabilities);
        
        // Nếu track không có width/height, có thể không có data
        const settings = videoTrack.getSettings();
        if (!settings.width || !settings.height) {
          console.warn('⚠️ Video track has no dimensions, may be invalid');
        }
      } catch (captureError) {
        console.warn('⚠️ ImageCapture test failed:', captureError);
        // Không throw error vì một số browser không support ImageCapture
      }

      stream.getVideoTracks().forEach((t) => (t.enabled = isVideoEnabled));
      stream.getAudioTracks().forEach((t) => (t.enabled = isAudioEnabled));

      // Monitor track state - nếu track bị ended trong 1 giây, có thể camera bị chiếm dụng
      let trackEndedEarly = false;
      const trackEndHandler = () => {
        console.error('❌ Video track ended immediately after acquisition - camera may be in use!');
        trackEndedEarly = true;
        
        // Release lock và retry
        cameraManager.releaseCameraLock();
        startMediaRef.current = false;
        
        // Retry sau 2 giây
        setTimeout(() => {
          console.log('🔄 Retrying after track ended...');
          startMedia(true);
        }, 2000);
      };
      
      videoTrack.addEventListener('ended', trackEndHandler, { once: true });
      
      // Check sau 1 giây xem track có bị ended không
      setTimeout(() => {
        videoTrack.removeEventListener('ended', trackEndHandler);
        if (!trackEndedEarly && (videoTrack as any).readyState === 'ended') {
          console.error('❌ Video track ended within 1 second - camera was taken by another tab');
          cameraManager.releaseCameraLock();
          stopMedia();
          
          // Retry sau 2 giây
          setTimeout(() => {
            console.log('🔄 Retrying after detecting ended track...');
            startMedia(true);
          }, 2000);
        }
      }, 1000);

      if (trackEndedEarly) {
        console.log('⏭️ Skipping stream setup due to early track end');
        return;
      }

      setLocalStream(stream);
      setCameraStream(stream);
      cameraManager.setStream(stream); // Notify camera manager
      retryCountRef.current = 0;
      setRetryCount(0);
      setMediaError(null);
      console.log("✅ Local stream acquired:", stream.id, {
        videoTrackState: videoTrack.readyState,
        audioTrackState: audioTrack.readyState,
        videoEnabled: videoTrack.enabled,
        audioEnabled: audioTrack.enabled,
        videoSettings: videoTrack.getSettings()
      });
    } catch (error: any) {
      console.error("❌ Error accessing media devices:", error, {
        errorName: error.name,
        errorMessage: error.message,
        retryCount: retryCountRef.current
      });
      
      // Xử lý các loại lỗi khác nhau
      const currentRetry = retryCountRef.current;
      let errorMessage = "Không thể truy cập camera/microphone";
      let shouldRetry = false;
      const maxRetries = 5;
      const retryDelay = Math.min(1000 * Math.pow(2, currentRetry), 10000); // Exponential backoff, max 10s

      if (error.name === "NotReadableError" || error.name === "TrackStartError" || error.name === "AbortError" || error.message?.includes("ended") || error.message?.includes("track")) {
        // Camera đang được sử dụng bởi tab/browser khác hoặc track bị lỗi
        errorMessage = `Camera đang được sử dụng bởi tab/browser khác. Đang thử lại... (${currentRetry + 1}/${maxRetries})`;
        shouldRetry = currentRetry < maxRetries;
        console.log(`📹 Camera in use or track error, will retry ${shouldRetry ? `in ${retryDelay}ms` : 'no more retries'}`, {
          errorName: error.name,
          errorMessage: error.message
        });
      } else if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "Bạn đã từ chối quyền truy cập camera/microphone. Vui lòng cấp quyền trong cài đặt trình duyệt.";
        shouldRetry = false;
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage = "Không tìm thấy camera/microphone. Vui lòng kiểm tra thiết bị của bạn.";
        shouldRetry = false;
      } else if (error.name === "OverconstrainedError") {
        errorMessage = "Camera không hỗ trợ yêu cầu. Vui lòng thử lại.";
        shouldRetry = currentRetry < 2; // Chỉ retry 2 lần cho lỗi này
      } else {
        // Lỗi khác, thử retry
        errorMessage = `Lỗi kết nối camera. Đang thử lại... (${currentRetry + 1}/${maxRetries})`;
        shouldRetry = currentRetry < maxRetries;
      }

      setMediaError(errorMessage);

      // Retry nếu cần
      if (shouldRetry) {
        console.log(`🔄 Will retry in ${retryDelay}ms... (Attempt ${currentRetry + 1}/${maxRetries})`);
        retryCountRef.current = currentRetry + 1;
        setRetryCount(currentRetry + 1);
        
        // Clear timeout cũ nếu có
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        // Reset flag trước khi retry để cho phép retry
        startMediaRef.current = false;
        
        retryTimeoutRef.current = setTimeout(() => {
          console.log(`🔄 Retrying media request (Attempt ${retryCountRef.current}/${maxRetries})...`);
          startMedia(true);
        }, retryDelay);
      } else {
        startMediaRef.current = false;
        if (currentRetry >= maxRetries) {
          setMediaError("Không thể kết nối camera sau nhiều lần thử. Vui lòng đóng các tab/browser khác đang sử dụng camera và thử lại.");
        }
      }
    }
  }, [localStream, isVideoEnabled, isAudioEnabled]);

  const stopMedia = useCallback(() => {
    // Clear retry timeout nếu có
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      setCameraStream(null);
    }
    
    // Release camera lock
    cameraManager.setStream(null);
    cameraManager.releaseCameraLock();
    
    peersRef.current.forEach((p) => p.peer.destroy());
    setPeers(new Map());
    peersRef.current = new Map();
    voiceChannelUsersRef.current = []; // Reset list khi stop
    setMediaError(null);
    setCameraOwner(null);
    retryCountRef.current = 0;
    setRetryCount(0);
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

      peer.on("error", (err) => {
        console.error(`❌ Peer error ${userId}:`, err);
        // Log error details for debugging
        console.error(`Error details:`, {
          name: err.name,
          message: err.message,
        });
        
        // Don't auto-reconnect here - let the connection logic handle it
        // Auto-reconnection can cause issues with signaling
      });

      // Track connection state
      let connectionTimeout: NodeJS.Timeout | null = null;
      
      peer.on("connect", () => {
        console.log(`✅ Peer connected ${userId}`);
        // Clear timeout when connected
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
      });

      // Add timeout for peer connection (30 seconds)
      connectionTimeout = setTimeout(() => {
        if (peersRef.current.has(userId)) {
          const peerConn = peersRef.current.get(userId);
          // Check if peer is connected
          const isConnected = (peerConn?.peer as any)?._pc?.connectionState === "connected";
          if (!isConnected) {
            console.warn(`⏱️ Peer connection timeout for ${userId}, destroying...`);
            peerConn?.peer.destroy();
            setPeers((prev) => {
              const newMap = new Map(prev);
              newMap.delete(userId);
              return newMap;
            });
          }
        }
      }, 30000);

      peer.on("close", () => {
        console.log(`🔌 Peer closed ${userId}`);
        // Clear timeout on close
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
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
          try {
            conn.peer.destroy();
          } catch (error) {
            console.warn(`Error destroying peer for ${userId}:`, error);
          }
          setPeers((prev) => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
          });
        }
      });

      // 3. Reconnect failed peers (check connection state)
      peersRef.current.forEach((conn, userId) => {
        if (userIds.includes(userId) && userId !== currentUser.userId) {
          try {
            const pc = (conn.peer as any)?._pc;
            if (pc) {
              const connectionState = pc.connectionState;
              if (connectionState === "failed" || connectionState === "disconnected") {
                console.log(`🔄 Peer ${userId} is ${connectionState}, attempting to reconnect...`);
                // Destroy old peer and recreate
                conn.peer.destroy();
                const isInitiator = currentUser.userId < userId;
                const newPeer = createPeer(userId, isInitiator, localStream);
                setPeers((prev) => {
                  const newMap = new Map(prev);
                  newMap.set(userId, { peer: newPeer, userId });
                  return newMap;
                });
              }
            }
          } catch (error) {
            console.warn(`Error checking/reconnecting peer ${userId}:`, error);
          }
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

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      console.log("Cleaning up WebRTC context...");
      // Clear retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Stop all media streams
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      
      // Destroy all peer connections
      peersRef.current.forEach((conn) => {
        try {
          conn.peer.destroy();
        } catch (error) {
          console.warn("Error destroying peer on cleanup:", error);
        }
      });
      
      // Release camera lock
      cameraManager.releaseCameraLock();
      cameraManager.setStream(null);
      
      // Clear refs
      peersRef.current.clear();
      voiceChannelUsersRef.current = [];
      startMediaRef.current = false;
      retryCountRef.current = 0;
    };
  }, [localStream]);

  return (
    <WebRTCContext.Provider
      value={{
        localStream,
        peers,
        isVideoEnabled,
        isAudioEnabled,
        isScreenSharing,
        mediaError,
        cameraOwner,
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
