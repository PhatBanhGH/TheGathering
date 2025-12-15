import { useEffect, useRef } from "react";
import Whiteboard from "./Whiteboard";
import "./ObjectFrame.css";

interface ObjectFrameProps {
  object: {
    objectId: string;
    type: string;
    name: string;
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
  onClose: () => void;
}

const ObjectFrame = ({ object, onClose }: ObjectFrameProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [onClose]);

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
    <div className="object-frame-overlay" onClick={onClose}>
      <div
        className="object-frame-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="object-frame-header">
          <h3 className="object-frame-title">{object.name}</h3>
          <button
            className="object-frame-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="object-frame-content">{renderContent()}</div>
      </div>
    </div>
  );
};

export default ObjectFrame;
