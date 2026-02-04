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
import { Device } from "mediasoup-client";
import type {
  Transport,
  Producer,
  Consumer,
  RtpCapabilities,
  DtlsParameters,
} from "mediasoup-client/lib/types";
import { useSocket } from "./SocketContext";
import { cameraManager } from "../utils/cameraManager";

const USE_SFU = (import.meta as any).env?.VITE_USE_SFU !== "false";

// Helper: So sánh 2 mảng string xem có giống nhau không
function isSameUserList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
}

interface PeerConnection {
  // In SFU mode, `peer` is not used (kept optional to preserve UI shape).
  peer?: Peer.Instance | null;
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
  mediaStateByUser: Record<string, { audioEnabled: boolean; videoEnabled: boolean }>;
  speakingByUser: Record<string, boolean>;
  toggleVideo: () => void;
  toggleAudio: () => void;
  startMedia: (isRetry?: boolean) => Promise<void>;
  stopMedia: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  setVoiceChannelUsers: (params: { roomId: string; channelId: string; userIds: string[] }) => void;
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
  const [mediaStateByUser, setMediaStateByUser] = useState<Record<string, { audioEnabled: boolean; videoEnabled: boolean }>>({});
  const [speakingByUser, setSpeakingByUser] = useState<Record<string, boolean>>({});

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
  const sfuContextRef = useRef<{ roomId: string; channelId: string } | null>(null);
  const startMediaRef = useRef<boolean>(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

  // --- SFU (mediasoup-client) state ---
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const producersRef = useRef<{ audio?: Producer; video?: Producer }>({});
  const consumersRef = useRef<Map<string, Consumer>>(new Map()); // consumerId -> consumer
  const producerToConsumerRef = useRef<Map<string, { consumerId: string; userId: string }>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map()); // userId -> MediaStream

  const socketRequest = useCallback(
    <T,>(event: string, data: any): Promise<T> => {
      return new Promise((resolve, reject) => {
        if (!socket) return reject(new Error("socket not ready"));
        socket.emit(event, data, (resp: any) => {
          if (!resp?.ok) return reject(new Error(resp?.error || "request failed"));
          resolve(resp);
        });
      });
    },
    [socket]
  );

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
    
    peersRef.current.forEach((p) => p.peer?.destroy?.());
    setPeers(new Map());
    peersRef.current = new Map();
    voiceChannelUsersRef.current = []; // Reset list khi stop
    setMediaError(null);
    setCameraOwner(null);
    retryCountRef.current = 0;
    setRetryCount(0);

    if (USE_SFU) {
      try {
        if (socket && sfuContextRef.current) {
          socket.emit("sfu:leave", sfuContextRef.current);
        }
      } catch {
        // ignore
      }
      producersRef.current.audio?.close();
      producersRef.current.video?.close();
      producersRef.current = {};
      consumersRef.current.forEach((c) => c.close());
      consumersRef.current.clear();
      producerToConsumerRef.current.clear();
      sendTransportRef.current?.close();
      recvTransportRef.current?.close();
      sendTransportRef.current = null;
      recvTransportRef.current = null;
      deviceRef.current = null;
      remoteStreamsRef.current.clear();
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const next = !isVideoEnabled;
        videoTrack.enabled = next;
        setIsVideoEnabled(next);
        localStorage.setItem("cameraEnabled", String(next));
        if (USE_SFU && socket && currentUser && sfuContextRef.current) {
          socket.emit("sfu:mediaState", {
            ...sfuContextRef.current,
            userId: currentUser.userId,
            audioEnabled: isAudioEnabled,
            videoEnabled: next,
          });
        }
      }
    }
    if (USE_SFU) {
      const p = producersRef.current.video;
      try {
        if (p) {
          if (!isVideoEnabled) p.resume();
          else p.pause();
        }
      } catch {
        // ignore
      }
    }
  }, [localStream, isVideoEnabled]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const next = !isAudioEnabled;
        audioTrack.enabled = next;
        setIsAudioEnabled(next);
        localStorage.setItem("micEnabled", String(next));
        if (USE_SFU && socket && currentUser && sfuContextRef.current) {
          socket.emit("sfu:mediaState", {
            ...sfuContextRef.current,
            userId: currentUser.userId,
            audioEnabled: next,
            videoEnabled: isVideoEnabled,
          });
        }
      }
    }
    if (USE_SFU) {
      const p = producersRef.current.audio;
      try {
        if (p) {
          if (!isAudioEnabled) p.resume();
          else p.pause();
        }
      } catch {
        // ignore
      }
    }
  }, [localStream, isAudioEnabled, socket, currentUser, isVideoEnabled]);

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
    (params: { roomId: string; channelId: string; userIds: string[] }) => {
      const { roomId, channelId, userIds } = params;
      const unchanged = isSameUserList(voiceChannelUsersRef.current, userIds);
      const canConnectNow = !!socket && !!currentUser && !!localStream;

      // SFU path (mediasoup) for scalable voice/video
      if (USE_SFU) {
        sfuContextRef.current = { roomId, channelId };
        voiceChannelUsersRef.current = userIds;

        // If leaving voice channel, cleanup SFU + UI streams
        if (!socket || !currentUser || !localStream || userIds.length === 0) {
          // Best-effort leave/cleanup when leaving channel
          try {
            if (socket && sfuContextRef.current) {
              socket.emit("sfu:leave", sfuContextRef.current);
            }
          } catch {
            // ignore
          }
          // Local cleanup
          producersRef.current.audio?.close();
          producersRef.current.video?.close();
          producersRef.current = {};
          consumersRef.current.forEach((c) => c.close());
          consumersRef.current.clear();
          producerToConsumerRef.current.clear();
          sendTransportRef.current?.close();
          recvTransportRef.current?.close();
          sendTransportRef.current = null;
          recvTransportRef.current = null;
          deviceRef.current = null;
          remoteStreamsRef.current.clear();
          setPeers(new Map());
          return;
        }

        // Avoid re-joining if nothing changed and we already have transports/producers
        if (
          unchanged &&
          canConnectNow &&
          sendTransportRef.current &&
          recvTransportRef.current &&
          (producersRef.current.audio || producersRef.current.video)
        ) {
          return;
        }

        (async () => {
          try {
            // Join socket.io SFU room for broadcasts
            socket.emit("sfu:joinRoom", { roomId, channelId });

            const joinResp = await socketRequest<{
              ok: true;
              rtpCapabilities: RtpCapabilities;
              producers: Array<{ producerId: string; userId: string; kind: "audio" | "video" }>;
              mediaStates: Array<{ userId: string; audioEnabled: boolean; videoEnabled: boolean }>;
            }>("sfu:join", { roomId, channelId, userId: currentUser.userId });

            // Seed media state map for UI (including self + existing users)
            setMediaStateByUser((prev) => {
              const next = { ...prev };
              for (const s of joinResp.mediaStates || []) {
                next[s.userId] = { audioEnabled: !!s.audioEnabled, videoEnabled: !!s.videoEnabled };
              }
              // Ensure self exists
              next[currentUser.userId] = {
                audioEnabled: isAudioEnabled,
                videoEnabled: isVideoEnabled,
              };
              return next;
            });

            if (!deviceRef.current) {
              const device = new Device();
              await device.load({ routerRtpCapabilities: joinResp.rtpCapabilities });
              deviceRef.current = device;
            }

            const device = deviceRef.current!;

            if (!sendTransportRef.current) {
              const sendT = await socketRequest<{ ok: true; params: any }>("sfu:createTransport", {
                roomId,
                channelId,
                direction: "send",
              });
              const transport = device.createSendTransport(sendT.params);

              transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
                try {
                  await socketRequest("sfu:connectTransport", {
                    roomId,
                    channelId,
                    transportId: transport.id,
                    dtlsParameters: dtlsParameters as DtlsParameters,
                  });
                  callback();
                } catch (e) {
                  errback(e as any);
                }
              });

              transport.on("produce", async ({ kind, rtpParameters }, callback, errback) => {
                try {
                  const resp = await socketRequest<{ ok: true; producerId: string }>("sfu:produce", {
                    roomId,
                    channelId,
                    transportId: transport.id,
                    kind,
                    rtpParameters,
                  });
                  callback({ id: resp.producerId });
                } catch (e) {
                  errback(e as any);
                }
              });

              sendTransportRef.current = transport;
            }

            if (!recvTransportRef.current) {
              const recvT = await socketRequest<{ ok: true; params: any }>("sfu:createTransport", {
                roomId,
                channelId,
                direction: "recv",
              });
              const transport = device.createRecvTransport(recvT.params);

              transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
                try {
                  await socketRequest("sfu:connectTransport", {
                    roomId,
                    channelId,
                    transportId: transport.id,
                    dtlsParameters: dtlsParameters as DtlsParameters,
                  });
                  callback();
                } catch (e) {
                  errback(e as any);
                }
              });

              recvTransportRef.current = transport;
            }

            const sendTransport = sendTransportRef.current!;
            const recvTransport = recvTransportRef.current!;

            // Produce local tracks (audio + video)
            const audioTrack = localStream.getAudioTracks()[0];
            const videoTrack = localStream.getVideoTracks()[0];

            if (audioTrack && !producersRef.current.audio) {
              const p = await (sendTransport as any).produce({ track: audioTrack });
              producersRef.current.audio = p;
              if (!isAudioEnabled) p.pause();
            }

            if (videoTrack && !producersRef.current.video) {
              const p = await (sendTransport as any).produce({ track: videoTrack });
              producersRef.current.video = p;
              if (!isVideoEnabled) p.pause();
            }

            // Broadcast self media state so others render correct icons
            try {
              socket.emit("sfu:mediaState", {
                roomId,
                channelId,
                userId: currentUser.userId,
                audioEnabled: isAudioEnabled,
                videoEnabled: isVideoEnabled,
              });
            } catch {
              // ignore
            }

            const consumeProducer = async (producerId: string, remoteUserId: string) => {
              if (!deviceRef.current || !recvTransportRef.current) return;
              if (remoteUserId === currentUser.userId) return;
              if (producerToConsumerRef.current.has(producerId)) return;

              const resp = await socketRequest<{
                ok: true;
                params: { id: string; producerId: string; kind: "audio" | "video"; rtpParameters: any; userId: string };
              }>("sfu:consume", {
                roomId,
                channelId,
                transportId: recvTransport.id,
                producerId,
                rtpCapabilities: device.rtpCapabilities,
              });

              const consumer = await (recvTransport as any).consume({
                id: resp.params.id,
                producerId: resp.params.producerId,
                kind: resp.params.kind,
                rtpParameters: resp.params.rtpParameters,
              });

              consumersRef.current.set(consumer.id, consumer);
              producerToConsumerRef.current.set(producerId, { consumerId: consumer.id, userId: remoteUserId });

              let ms = remoteStreamsRef.current.get(remoteUserId);
              if (!ms) {
                ms = new MediaStream();
                remoteStreamsRef.current.set(remoteUserId, ms);
              }
              ms.addTrack(consumer.track);

              // Update UI peers map
              setPeers((prev) => {
                const next = new Map(prev);
                next.set(remoteUserId, { userId: remoteUserId, peer: null, stream: ms! });
                return next;
              });

              await socketRequest("sfu:resume", { roomId, channelId, consumerId: consumer.id });
            };

            // Consume existing producers
            for (const p of joinResp.producers) {
              await consumeProducer(p.producerId, p.userId);
            }

            // Listen for new producers / closed producers
            const onNewProducer = async (p: { producerId: string; userId: string; kind: "audio" | "video" }) => {
              await consumeProducer(p.producerId, p.userId);
            };

            const onProducerClosed = (d: { producerId: string }) => {
              const mapping = producerToConsumerRef.current.get(d.producerId);
              if (!mapping) return;
              const { consumerId, userId: remoteUserId } = mapping;
              producerToConsumerRef.current.delete(d.producerId);

              const consumer = consumersRef.current.get(consumerId);
              if (consumer) {
                try {
                  consumer.close();
                } catch {
                  // ignore
                }
                consumersRef.current.delete(consumerId);
              }

              const ms = remoteStreamsRef.current.get(remoteUserId);
              if (ms) {
                // Remove ended tracks
                ms.getTracks().forEach((t) => {
                  if (t.readyState === "ended") {
                    try {
                      ms.removeTrack(t);
                    } catch {
                      // ignore
                    }
                  }
                });
                // If no tracks left, remove user entry
                if (ms.getTracks().length === 0) {
                  remoteStreamsRef.current.delete(remoteUserId);
                  setPeers((prev) => {
                    const next = new Map(prev);
                    next.delete(remoteUserId);
                    return next;
                  });
                }
              }
            };

            socket.off("sfu:newProducer", onNewProducer as any);
            socket.on("sfu:newProducer", onNewProducer as any);
            socket.off("sfu:producerClosed", onProducerClosed as any);
            socket.on("sfu:producerClosed", onProducerClosed as any);
          } catch (e: any) {
            console.error("❌ SFU connect error:", e);
          }
        })();

        return;
      }

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
      if (USE_SFU && sfuContextRef.current) {
        setVoiceChannelUsers({
          roomId: sfuContextRef.current.roomId,
          channelId: sfuContextRef.current.channelId,
          userIds: [...voiceChannelUsersRef.current],
        });
      } else {
        setVoiceChannelUsers({
          roomId: localStorage.getItem("roomId") || "default-room",
          channelId: "general-voice",
          userIds: [...voiceChannelUsersRef.current],
        });
      }
    }
  }, [localStream, setVoiceChannelUsers]);

  // --- 4. SIGNALING HANDLERS ---
  useEffect(() => {
    if (USE_SFU) return;
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

  // --- SFU: media state sync listeners ---
  useEffect(() => {
    if (!USE_SFU) return;
    if (!socket) return;

    const onMediaState = (p: { userId: string; audioEnabled: boolean; videoEnabled: boolean }) => {
      setMediaStateByUser((prev) => ({
        ...prev,
        [p.userId]: { audioEnabled: !!p.audioEnabled, videoEnabled: !!p.videoEnabled },
      }));
    };

    socket.on("sfu:mediaState", onMediaState as any);
    return () => {
      socket.off("sfu:mediaState", onMediaState as any);
    };
  }, [socket]);

  // --- Speaker indicator (local + remote) via WebAudio analyser ---
  useEffect(() => {
    if (!USE_SFU) return;
    if (!currentUser?.userId) return;

    const audioCtx: AudioContext =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).AudioContext
        ? new (window as any).AudioContext()
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          new (window as any).webkitAudioContext()) as AudioContext;

    const analysers = new Map<
      string,
      { analyser: AnalyserNode; source: MediaStreamAudioSourceNode; data: Uint8Array; speaking: boolean; frames: number }
    >();

    const ensureAnalyser = (userId: string, stream: MediaStream | null | undefined) => {
      if (!stream) return;
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      if (analysers.has(userId)) return;
      const onlyAudio = new MediaStream([audioTrack]);
      const source = audioCtx.createMediaStreamSource(onlyAudio);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analysers.set(userId, { analyser, source, data: new Uint8Array(analyser.fftSize), speaking: false, frames: 0 });
    };

    const cleanupMissing = (activeUserIds: Set<string>) => {
      Array.from(analysers.keys()).forEach((uid) => {
        if (!activeUserIds.has(uid)) {
          const node = analysers.get(uid);
          try {
            node?.source.disconnect();
          } catch {
            // ignore
          }
          analysers.delete(uid);
          setSpeakingByUser((prev) => {
            if (!(uid in prev)) return prev;
            const next = { ...prev };
            delete next[uid];
            return next;
          });
        }
      });
    };

    const tick = () => {
      // Resume AudioContext if browser suspended it
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }

      const updates: Array<[string, boolean]> = [];
      analysers.forEach((node, uid) => {
        node.analyser.getByteTimeDomainData(node.data);
        // RMS from time-domain
        let sum = 0;
        for (let i = 0; i < node.data.length; i++) {
          const v = (node.data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / node.data.length);
        const thresholdOn = 0.04;
        const thresholdOff = 0.025;

        const shouldSpeak = node.speaking ? rms > thresholdOff : rms > thresholdOn;
        if (shouldSpeak !== node.speaking) {
          node.frames += 1;
          // require 2 consecutive frames to flip (reduce flicker)
          if (node.frames >= 2) {
            node.speaking = shouldSpeak;
            node.frames = 0;
            updates.push([uid, shouldSpeak]);
          }
        } else {
          node.frames = 0;
        }
      });

      if (updates.length > 0) {
        setSpeakingByUser((prev) => {
          const next = { ...prev };
          for (const [uid, val] of updates) next[uid] = val;
          return next;
        });
      }
    };

    const interval = window.setInterval(tick, 120);

    // Setup analysers for current streams
    const active = new Set<string>();
    ensureAnalyser(currentUser.userId, localStream);
    active.add(currentUser.userId);

    peers.forEach((pc, uid) => {
      ensureAnalyser(uid, pc.stream);
      active.add(uid);
    });
    cleanupMissing(active);

    // Also react to changes in streams via dependency updates
    return () => {
      window.clearInterval(interval);
      analysers.forEach((node) => {
        try {
          node.source.disconnect();
        } catch {
          // ignore
        }
      });
      analysers.clear();
      audioCtx.close().catch(() => {});
    };
  }, [peers, localStream, currentUser?.userId]);

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
          conn.peer?.destroy?.();
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

      if (USE_SFU) {
        try {
          if (socket && sfuContextRef.current) {
            socket.emit("sfu:leave", sfuContextRef.current);
          }
        } catch {
          // ignore
        }
        producersRef.current.audio?.close();
        producersRef.current.video?.close();
        producersRef.current = {};
        consumersRef.current.forEach((c) => c.close());
        consumersRef.current.clear();
        producerToConsumerRef.current.clear();
        sendTransportRef.current?.close();
        recvTransportRef.current?.close();
        remoteStreamsRef.current.clear();
      }
    };
  }, [localStream, socket]);

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
        mediaStateByUser,
        speakingByUser,
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
