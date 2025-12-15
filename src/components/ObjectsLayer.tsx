import { useObjects } from "../contexts/ObjectContext";
import InteractiveObject from "./InteractiveObject";
import "./ObjectsLayer.css";

const ObjectsLayer = () => {
  const { objects } = useObjects();

  // Get object icon/emoji based on type
  const getObjectIcon = (type: string) => {
    switch (type) {
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

  // Convert game coordinates to screen coordinates
  // Assuming game canvas is positioned at (0, 0) relative to viewport
  const gameToScreen = (gameX: number, gameY: number) => {
    // Get game container position
    const gameContainer = document.getElementById("phaser-game");
    if (!gameContainer) return { x: gameX, y: gameY };

    const rect = gameContainer.getBoundingClientRect();
    return {
      x: rect.left + gameX,
      y: rect.top + gameY,
    };
  };

  return (
    <>
      {/* Render objects trên map */}
      {objects.map((object) => {
        const screenPos = gameToScreen(object.position.x, object.position.y);
        return (
          <div
            key={object.objectId}
            className="map-object-indicator"
            style={{
              left: `${screenPos.x}px`,
              top: `${screenPos.y}px`,
            }}
          >
            <div className="object-icon">{getObjectIcon(object.type)}</div>
            <div className="object-name-label">{object.name}</div>
          </div>
        );
      })}

      {/* Render InteractiveObject components để handle interaction */}
      {objects.map((object) => (
        <InteractiveObject
          key={`interact-${object.objectId}`}
          object={object}
        />
      ))}
    </>
  );
};

export default ObjectsLayer;
