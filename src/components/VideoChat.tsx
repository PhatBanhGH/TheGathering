import { useEffect, useRef } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';
import { useSocket } from '../contexts/SocketContext';
import './VideoChat.css';

const VideoChat = () => {
  const { localStream, peers } = useWebRTC();
  const { users, currentUser } = useSocket();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    peers.forEach((peerConn, userId) => {
      if (peerConn.stream) {
        let videoElement = remoteVideosRef.current.get(userId);
        if (!videoElement) {
          // Create video wrapper
          const videoWrapper = document.createElement('div');
          videoWrapper.className = 'video-item remote';
          
          // Create video element
          videoElement = document.createElement('video');
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.className = 'video-element';
          
          // Create overlay with username
          const overlay = document.createElement('div');
          overlay.className = 'video-overlay';
          const usernameSpan = document.createElement('span');
          usernameSpan.className = 'video-username';
          const peerUser = users.find(u => u.userId === userId);
          usernameSpan.textContent = peerUser?.username || 'User';
          overlay.appendChild(usernameSpan);
          
          // Assemble wrapper
          videoWrapper.appendChild(videoElement);
          videoWrapper.appendChild(overlay);
          
          remoteVideosRef.current.set(userId, videoElement);
          
          const container = document.getElementById('remote-videos-container');
          if (container) {
            container.appendChild(videoWrapper);
          }
        }
        videoElement.srcObject = peerConn.stream;
      }
    });

    // Clean up removed peers
    remoteVideosRef.current.forEach((videoElement, userId) => {
      if (!peers.has(userId)) {
        const wrapper = videoElement.parentElement;
        if (wrapper) {
          wrapper.remove();
        }
        remoteVideosRef.current.delete(userId);
      }
    });
  }, [peers, users]);

  // Get nearby users for video display (within 150 pixels)
  const nearbyUsers = users.filter((user) => {
    if (user.userId === currentUser?.userId || !currentUser) return false;
    const distance = Math.sqrt(
      Math.pow(user.position.x - currentUser.position.x, 2) +
      Math.pow(user.position.y - currentUser.position.y, 2)
    );
    return distance < 150;
  });

  if (nearbyUsers.length === 0 && !localStream && peers.size === 0) {
    return null;
  }

  const totalVideos = (localStream ? 1 : 0) + peers.size;
  const isGrid = totalVideos > 1;

  return (
    <div className={`video-chat-container ${isGrid ? 'grid-layout' : 'single-layout'}`}>
      {localStream && (
        <div className="video-item local">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="video-element"
          />
          {currentUser && (
            <div className="video-overlay">
              <span className="video-username">{currentUser.username}</span>
            </div>
          )}
        </div>
      )}
      <div id="remote-videos-container" className={`remote-videos-wrapper ${isGrid ? 'grid' : 'stack'}`}>
        {/* Remote videos are dynamically added here */}
      </div>
    </div>
  );
};

export default VideoChat;

