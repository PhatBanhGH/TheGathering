import { useEffect, useState, useRef } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { calculateDistance } from "../../utils/distance";
import Whiteboard from "../editor/Whiteboard";
import "./ObjectInteraction.css";

interface ObjectInteractionProps {
  object: {
    objectId: string;
    type: string;
    name: string;
    position: { x: number; y: number };
    properties: {
      url?: string;
      content?: string;
      imageUrl?: string;
      documentUrl?: string;
      width?: number;
      height?: number;
      allowFullscreen?: boolean;
    };
  };
}

/**
 * ObjectInteraction - Combines InteractiveObject and ObjectFrame
 * Handles object interaction and rendering
 */
const ObjectInteraction = ({ object }: ObjectInteractionProps) => {
  const { currentUser } = useSocket();
  const [isNearby, setIsNearby] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check distance from currentUser to object
  useEffect(() => {
    if (!currentUser) {
      setIsNearby(false);
      return;
    }

    const checkDistance = () => {
      const distance = calculateDistance(currentUser.position, object.position);
      const nearby = distance < 50; // 50 pixels threshold
      setIsNearby(nearby);
      setShowPrompt(nearby && !isOpen);
    };

    checkDistance();
    const interval = setInterval(checkDistance, 100); // Check every 100ms
    return () => clearInterval(interval);
  }, [currentUser, object.position, isOpen]);

  // Handle keyboard interaction
  useEffect(() => {
    if (!isNearby || isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "x") {
        setIsOpen(true);
        setShowPrompt(false);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isNearby, isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isOpen]);

  // Get object icon based on type
  const getObjectIcon = () => {
    switch (object.type) {
      case "whiteboard":
        return "📋";
      case "video":
        return "🎥";
      case "website":
        return "🌐";
      case "image":
        return "🖼️";
      case "document":
        return "📄";
      case "game":
        return "🎮";
      default:
        return "📦";
    }
  };

  // Render content based on object type
  const renderContent = () => {
    switch (object.type) {
      case "website":
        return (
          <iframe
            ref={iframeRef}
            src={object.properties.url || "about:blank"}
            title={object.name}
            className="object-iframe"
            allowFullScreen={object.properties.allowFullscreen}
          />
        );

      case "video": {
        // Extract video ID from YouTube/Vimeo URL
        const videoUrl = object.properties.url || "";
        let embedUrl = videoUrl;

        if (videoUrl.includes("youtube.com/watch")) {
          const videoId = videoUrl.split("v=")[1]?.split("&")[0];
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (videoUrl.includes("youtu.be/")) {
          const videoId = videoUrl.split("youtu.be/")[1]?.split("?")[0];
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (videoUrl.includes("vimeo.com")) {
          const videoId = videoUrl.split("vimeo.com/")[1]?.split("?")[0];
          embedUrl = `https://player.vimeo.com/video/${videoId}`;
        }

        return (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={object.name}
            className="object-iframe"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        );
      }

      case "image":
        return (
          <div className="object-image-container">
            <img
              src={object.properties.imageUrl || object.properties.url}
              alt={object.name}
              className="object-image"
            />
          </div>
        );

      case "whiteboard":
        return (
          <Whiteboard
            objectId={object.objectId}
            initialContent={object.properties.content}
            onSave={async (content) => {
              try {
                const response = await fetch(
                  `${
                    import.meta.env.VITE_SERVER_URL || "http://localhost:5001"
                  }/api/objects/${object.objectId}/whiteboard`,
                  {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ content }),
                  }
                );
                if (!response.ok) {
                  console.error("Failed to save whiteboard");
                }
              } catch (error) {
                console.error("Error saving whiteboard:", error);
              }
            }}
          />
        );

      case "document":
        return (
          <iframe
            ref={iframeRef}
            src={object.properties.documentUrl || object.properties.url}
            title={object.name}
            className="object-iframe"
          />
        );

      case "game":
        return (
          <iframe
            ref={iframeRef}
            src={object.properties.url || "about:blank"}
            title={object.name}
            className="object-iframe"
            allowFullScreen
          />
        );

      default:
        return (
          <div className="object-unknown">
            <p>Unknown object type: {object.type}</p>
          </div>
        );
    }
  };

  return (
    <>
      {/* Interaction prompt when nearby */}
      {isNearby && showPrompt && (
        <div className="interact-prompt">
          <div className="prompt-icon">{getObjectIcon()}</div>
          <div className="prompt-text">
            <span className="prompt-key">X</span> để mở {object.name}
          </div>
        </div>
      )}

      {/* Object frame when opened */}
      {isOpen && (
        <div className="object-frame-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="object-frame-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="object-frame-header">
              <h3 className="object-frame-title">{object.name}</h3>
              <button
                className="object-frame-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="object-frame-content">{renderContent()}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default ObjectInteraction;
