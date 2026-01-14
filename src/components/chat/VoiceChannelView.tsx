import { useEffect, useRef, useState } from "react";
import { useWebRTC } from "../../contexts/WebRTCContext";
import { useSocket } from "../../contexts/SocketContext";
import { useChat } from "../../contexts/ChatContext";
import "./VoiceChannelView.css";

interface VoiceChannelViewProps {
  channelId: string;
  channelName: string;
  onLeave: () => void;
}

interface VoiceUser {
  userId: string;
  username: string;
  avatar?: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  stream?: MediaStream;
  isSpeaking?: boolean; // NEW: For speaking indicator
}

// ==========================================
// 1. Component hiển thị Video (Đã sửa lỗi)
// ==========================================
// Component này tự chịu trách nhiệm hoàn toàn về thẻ video của nó.
// Không cần truyền Ref ngược lên cha làm gì cả.
const UserVideoPlayer = ({
  stream,
  isLocal = false,
  isVideoEnabled = true,
}: {
  stream: MediaStream | undefined | null;
  isLocal?: boolean;
  isVideoEnabled?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (stream) {
      // Kiểm tra xem video track có còn hoạt động không
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && videoTrack.readyState === 'ended') {
        console.warn(`⚠️ Video track ended (Local: ${isLocal}), stream may be invalid`);
        // Không gán stream nếu track đã ended
        return;
      }

      // Chỉ gán lại nếu khác stream ID để tránh nháy
      if (videoEl.srcObject !== stream) {
        console.log(
          `📹 Assigning stream to video (Local: ${isLocal}, Stream: ${stream.id})`,
          {
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
            videoEnabled: stream.getVideoTracks()[0]?.enabled,
            videoTrackState: videoTrack?.readyState,
          }
        );
        videoEl.srcObject = stream;

        // Cố gắng play ngay lập tức
        videoEl.play().catch((e) => {
          console.warn(`⚠️ Autoplay blocked (Local: ${isLocal}):`, e);
        });
      } else {
        // Stream đã được gán, nhưng có thể cần play lại
        if (videoEl.paused) {
          console.log(`▶️ Resuming paused video (Local: ${isLocal})`);
          videoEl.play().catch((e) => {
            console.warn(`⚠️ Resume failed (Local: ${isLocal}):`, e);
          });
        }
      }

      // Monitor track state - nếu track bị ended, có thể camera bị chiếm dụng
      const checkTrackState = () => {
        if (videoTrack && videoTrack.readyState === 'ended') {
          console.warn(`⚠️ Video track ended while playing (Local: ${isLocal}) - camera may be in use by another tab`);
        }
      };
      
      if (videoTrack) {
        videoTrack.addEventListener('ended', checkTrackState);
        return () => {
          videoTrack.removeEventListener('ended', checkTrackState);
        };
      }
    } else {
      if (videoEl.srcObject) {
        console.log(`🗑 Clearing video srcObject (Local: ${isLocal})`);
        videoEl.srcObject = null;
      }
    }
  }, [stream, isLocal]); // Chỉ chạy lại khi stream object thay đổi

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal} // Quan trọng: Mute chính mình
      className="voice-user-video"
      style={{ 
        // Luôn hiển thị video nếu có stream, không phụ thuộc vào isVideoEnabled
        // isVideoEnabled chỉ để biết user có bật cam không (hiển thị avatar overlay)
        display: stream ? "block" : "none",
        opacity: stream && isVideoEnabled ? 1 : stream ? 0.3 : 0,
      }}
      onLoadedMetadata={() => {
        console.log(`✅ Video metadata loaded (Local: ${isLocal}, Stream: ${stream?.id})`);
        if (videoRef.current && stream) {
          videoRef.current.play().catch((e) => {
            console.warn(`⚠️ Play failed (Local: ${isLocal}):`, e);
          });
        }
      }}
      onCanPlay={() => {
        console.log(`✅ Video can play (Local: ${isLocal}, Stream: ${stream?.id})`);
        if (videoRef.current && stream) {
          videoRef.current.play().catch((e) => {
            console.warn(`⚠️ Play failed (Local: ${isLocal}):`, e);
          });
        }
      }}
      onPlaying={() => {
        console.log(`▶️ Video is playing (Local: ${isLocal}, Stream: ${stream?.id})`);
        // Kiểm tra xem video có thực sự hiển thị được không
        if (videoRef.current && stream && isLocal) {
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack && videoTrack.readyState === 'ended') {
            console.warn(`⚠️ Video track ended while playing - camera may be in use by another tab`);
          }
        }
      }}
      onError={(e) => {
        console.error(`❌ Video error (Local: ${isLocal}, Stream: ${stream?.id}):`, e);
        // Nếu là local stream và có lỗi, có thể camera bị chiếm dụng
        if (isLocal && stream) {
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack && videoTrack.readyState === 'ended') {
            console.error(`❌ Local video track ended - camera is in use by another tab/browser`);
          }
        }
      }}
    />
  );
};

// ==========================================
// 2. Component Cha (Đã làm sạch logic)
// ==========================================
const VoiceChannelView = ({
  channelId,
  channelName,
  onLeave,
}: VoiceChannelViewProps) => {
  const { currentUser, users } = useSocket();
  const {
    localStream,
    peers,
    isVideoEnabled,
    isAudioEnabled,
    mediaError,
    cameraOwner,
    toggleVideo,
    toggleAudio,
    startMedia,
    setVoiceChannelUsers,
  } = useWebRTC();
  const { voiceChannels } = useChat();

  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);

  // Get current voice channel
  const currentVoiceChannel = voiceChannels.find((vc) => vc.id === channelId);

  // 1. Initialize media
  useEffect(() => {
    if (!localStream && channelId) {
      console.log(`🎬 VoiceChannelView: Requesting media for channel ${channelId}`);
      startMedia().catch((err) => {
        console.error("Failed to start media:", err);
        // Lỗi đã được xử lý trong startMedia, chỉ log ở đây
      });
    }
  }, [channelId, localStream, startMedia]);

  // 2. Sync voice users to WebRTC Context
  const voiceChannelUsersStr = currentVoiceChannel?.users?.join(",") || "";
  useEffect(() => {
    if (currentVoiceChannel && currentUser) {
      setVoiceChannelUsers(currentVoiceChannel.users || []);
    } else {
      setVoiceChannelUsers([]);
    }
  }, [
    voiceChannelUsersStr,
    channelId,
    currentUser?.userId,
    currentVoiceChannel,
    currentUser,
    setVoiceChannelUsers,
  ]);

  // 3. Build User List (Logic quan trọng nhất)
  // Sử dụng useEffect để tính toán danh sách user hiển thị
  const peersStreamIds = Array.from(peers.values())
    .map((p) => p.stream?.id)
    .join(",");
  useEffect(() => {
    if (!currentVoiceChannel || !currentUser) return;

    const channelUsers = currentVoiceChannel.users || [];

    // Tạo danh sách user từ channel users
    const mappedUsers: VoiceUser[] = channelUsers.map((userId) => {
      // a. Xử lý chính mình
      if (userId === currentUser.userId) {
        // Mock speaking state for current user
        const isSpeaking = Math.random() > 0.7; // Fake: 30% chance of speaking
        
        return {
          userId: currentUser.userId,
          username: currentUser.username,
          avatar: currentUser.avatar,
          isVideoEnabled: isVideoEnabled, // State local
          isAudioEnabled: isAudioEnabled, // State local
          stream: localStream || undefined,
          isSpeaking: isSpeaking, // Mock speaking indicator
        };
      }

      // b. Xử lý người khác (Remote Peer)
      const user = users.find((u) => u.userId === userId);

      // FIX "UNKNOWN": Nếu chưa tìm thấy user trong list users tổng, tạo placeholder
      if (!user) {
        console.warn(
          `⚠️ User ${userId} in voice channel but not in global user list yet. Available users:`,
          users.map((u) => ({ userId: u.userId, username: u.username }))
        );
        return {
          userId: userId,
          username: "Loading...", // Hiển thị tạm thời
          isVideoEnabled: false,
          isAudioEnabled: false,
          stream: undefined,
        };
      }

      const peerConn = peers.get(userId);
      const remoteStream = peerConn?.stream;

      // Check track status
      const videoTrack = remoteStream?.getVideoTracks()[0];
      const audioTrack = remoteStream?.getAudioTracks()[0];

      // Log để debug
      if (peerConn && !remoteStream) {
        console.log(`⏳ Peer ${userId} exists but no stream yet`);
      }
      if (remoteStream) {
        console.log(`✅ Peer ${userId} has stream:`, {
          streamId: remoteStream.id,
          videoTracks: remoteStream.getVideoTracks().length,
          audioTracks: remoteStream.getAudioTracks().length,
          videoEnabled: videoTrack?.enabled,
        });
      }

      // Mock speaking state (in real app, use audio level detection)
      const isSpeaking = Math.random() > 0.7; // Fake: 30% chance of speaking
      
      return {
        userId: userId,
        username: user.username,
        avatar: user.avatar,
        // Hiển thị video nếu có stream và có video track (không cần check readyState vì có thể track chưa live ngay)
        // Chỉ check enabled để biết user có bật cam không
        isVideoEnabled: !!videoTrack && videoTrack.enabled,
        isAudioEnabled: audioTrack?.enabled ?? false,
        stream: remoteStream,
        isSpeaking: isSpeaking, // Mock speaking indicator
      };
    });

    // Cập nhật state
    setVoiceUsers(mappedUsers);
  }, [
    currentVoiceChannel, // Trigger khi có người vào/ra room
    users,
    currentUser,
    peers, // Trigger khi peer kết nối/ngắt
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    peersStreamIds, // Force update khi stream ID thay đổi
  ]);

  // Helper UI functions
  const getAvatarColor = (userId: string) => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++)
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 65%, 50%)`;
  };

  const getGridColumns = (count: number) => {
    if (count <= 1) return 1;
    if (count <= 4) return 2;
    if (count <= 9) return 3;
    return 4;
  };

  return (
    <div className="voice-channel-view">
      <div className="voice-channel-header">
        <div className="voice-channel-info">
          <span className="voice-channel-icon">🔊</span>
          <h2 className="voice-channel-title">{channelName}</h2>
          <span className="voice-channel-count">{voiceUsers.length} người</span>
        </div>
        <button className="voice-channel-leave-btn" onClick={onLeave}>
          Rời khỏi
        </button>
      </div>

      <div
        className="voice-channel-grid"
        style={{
          gridTemplateColumns: `repeat(${getGridColumns(
            voiceUsers.length
          )}, 1fr)`,
        }}
      >
        {voiceUsers.map((user) => {
          const isCurrentUser = user.userId === currentUser?.userId;

          return (
            <div
              key={user.userId}
              className={`voice-user-card ${
                isCurrentUser ? "current-user" : ""
              } ${user.isSpeaking ? "speaking" : ""}`}
            >
              <div className="voice-user-video-container">
                {/* Luôn render video element nếu có stream, để video có thể hiển thị ngay khi track enabled */}
                {user.stream ? (
                  <>
                    <UserVideoPlayer
                      stream={user.stream}
                      isLocal={isCurrentUser}
                      isVideoEnabled={user.isVideoEnabled}
                    />
                    {/* Avatar Fallback chỉ hiển thị khi video không enabled */}
                    {!user.isVideoEnabled && (
                      <div
                        className="voice-user-avatar"
                        style={{ backgroundColor: getAvatarColor(user.userId) }}
                      >
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Hiển thị avatar thay vì loading nếu là local user và có lỗi camera */}
                    {isCurrentUser && mediaError ? (
                      <>
                        <div
                          className="voice-user-avatar"
                          style={{ backgroundColor: getAvatarColor(user.userId) }}
                        >
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="voice-user-camera-blocked">
                          <span className="camera-icon">📷</span>
                          <span className="camera-message">Camera đang được sử dụng</span>
                          {cameraOwner && (
                            <span className="camera-owner">bởi tab khác</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="voice-user-video-placeholder">
                          <div className="voice-user-loading">Đang kết nối...</div>
                        </div>
                        {/* Avatar khi chưa có stream */}
                        <div
                          className="voice-user-avatar"
                          style={{ backgroundColor: getAvatarColor(user.userId) }}
                        >
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      </>
                    )}
                  </>
                )}

                <div className="voice-user-overlay">
                  <div className="voice-user-status">
                    {!user.isAudioEnabled && <span title="Đã tắt mic">🔇</span>}
                    {user.isVideoEnabled && (
                      <span title="Đang bật camera">📹</span>
                    )}
                  </div>
                  <div className="voice-user-name">{user.username}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {mediaError && (
        <div className="voice-channel-error">
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{mediaError}</span>
          </div>
          {!mediaError.includes("từ chối") && !mediaError.includes("Không tìm thấy") && (
            <button
              className="error-retry-btn"
              onClick={() => {
                startMedia(false);
              }}
            >
              Thử lại ngay
            </button>
          )}
        </div>
      )}

      {/* Control Bar */}
      <div className="voice-channel-controls">
        <div className="voice-controls-left">
          {/* Nút Toggle Video */}
          <button
            className={`voice-control-btn ${isVideoEnabled ? "active" : ""}`}
            onClick={toggleVideo}
            title={isVideoEnabled ? "Tắt camera" : "Bật camera"}
          >
            {isVideoEnabled ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M21 6.5l-4-4v3.5H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h13v3.5l4-4v-11z" />
              </svg>
            )}
          </button>

          {/* Nút Toggle Mic */}
          <button
            className={`voice-control-btn ${
              isAudioEnabled ? "active" : "muted"
            }`}
            onClick={toggleAudio}
            title={isAudioEnabled ? "Tắt mic" : "Bật mic"}
          >
            {isAudioEnabled ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4c-.83 0-1.5.67-1.5 1.5v3.18l3 3V5.5c0-.83-.67-1.5-1.5-1.5z" />
              </svg>
            )}
          </button>
        </div>

        <div className="voice-controls-center">
          <button className="voice-control-btn leave-btn" onClick={onLeave}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
            <span>Rời khỏi</span>
          </button>
        </div>

        <div className="voice-controls-right">
          <button className="voice-control-btn" title="Cài đặt">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceChannelView;
