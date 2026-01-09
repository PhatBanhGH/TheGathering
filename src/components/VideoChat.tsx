import { useEffect, useRef } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';
import { useSocket } from '../contexts/SocketContext';
import './VideoChat.css';

// 1. Tạo Component con để xử lý từng Video riêng biệt
// Điều này giúp cô lập logic gán srcObject, tránh conflict ref
const VideoPlayer = ({ 
  stream, 
  username, 
  isLocal = false 
}: { 
  stream: MediaStream | undefined | null, 
  username: string, 
  isLocal?: boolean 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Chỉ gán stream khi ref đã sẵn sàng và stream có dữ liệu
    if (videoRef.current && stream) {
      console.log(`📹 VideoPlayer: Setting srcObject for ${username} (${isLocal ? 'local' : 'remote'}):`, {
        streamId: stream.id,
        tracks: stream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
        })),
      });
      videoRef.current.srcObject = stream;
      
      // Force play to bypass autoplay policy
      videoRef.current.play().catch((err) => {
        console.warn(`⚠️ Autoplay prevented for ${username}:`, err);
      });
    } else if (videoRef.current && !stream) {
      // Clear srcObject if stream is removed
      videoRef.current.srcObject = null;
    }
  }, [stream, username, isLocal]);

  return (
    <div className={`video-item ${isLocal ? 'local' : 'remote'}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline // Bắt buộc cho mobile/một số trình duyệt
        muted={isLocal} // Mute chính mình để tránh hú (feedback loop)
        className="video-element"
        onLoadedMetadata={() => {
          console.log(`✅ Video metadata loaded for ${username}`);
          // Try to play again when metadata is loaded
          videoRef.current?.play().catch((err) => {
            console.warn(`⚠️ Play failed for ${username}:`, err);
          });
        }}
        onCanPlay={() => {
          console.log(`✅ Video can play for ${username}`);
          // Try to play when ready
          videoRef.current?.play().catch((err) => {
            console.warn(`⚠️ Play failed for ${username}:`, err);
          });
        }}
        onError={(e) => {
          console.error(`❌ Video error for ${username}:`, e);
        }}
      />
      <div className="video-overlay">
        <span className="video-username">{username}</span>
      </div>
    </div>
  );
};

const VideoChat = () => {
  const { localStream, peers } = useWebRTC();
  const { users, currentUser } = useSocket();

  // Chuyển đổi Map peers sang Array để render trong JSX
  const peersArray = Array.from(peers.values());

  // Logic hiển thị chỉ khi có video (giữ nguyên logic cũ của bạn)
  const nearbyUsers = users.filter((user) => {
    if (user.userId === currentUser?.userId || !currentUser) return false;
    const distance = Math.sqrt(
      Math.pow(user.position.x - currentUser.position.x, 2) +
      Math.pow(user.position.y - currentUser.position.y, 2)
    );
    return distance < 150;
  });

  // Nếu không có ai gần, không có stream local và không có peer kết nối -> Ẩn
  if (nearbyUsers.length === 0 && !localStream && peers.size === 0) {
    return null;
  }

  const totalVideos = (localStream ? 1 : 0) + peers.size;
  const isGrid = totalVideos > 1;

  return (
    <div className={`video-chat-container ${isGrid ? 'grid-layout' : 'single-layout'}`}>
      {/* 2. Render Local Stream */}
      {localStream && currentUser && (
        <VideoPlayer 
          stream={localStream} 
          username={currentUser.username || "Me"} 
          isLocal={true} 
        />
      )}

      {/* 3. Render Remote Peers - Sử dụng React Map thay vì appendChild */}
      <div id="remote-videos-container" className={`remote-videos-wrapper ${isGrid ? 'grid' : 'stack'}`}>
        {peersArray.map((peerConn) => {
          // Tìm username tương ứng với userId của peer
          const peerUser = users.find(u => u.userId === peerConn.userId);
          const username = peerUser?.username || peerConn.userId;

          // Chỉ render nếu peer có stream (hoặc render khung loading tùy bạn)
          if (!peerConn.stream) {
            console.log(`⏳ Peer ${peerConn.userId} has no stream yet, skipping render`);
            return null;
          }

          return (
            <VideoPlayer
              key={peerConn.userId} // Key quan trọng để React không render lại nhầm component
              stream={peerConn.stream}
              username={username}
              isLocal={false}
            />
          );
        })}
      </div>
    </div>
  );
};

export default VideoChat;
