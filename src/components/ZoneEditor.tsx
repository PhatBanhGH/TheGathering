import { useState, useEffect } from "react";
import { useMap } from "../contexts/MapContext";
import { useSocket } from "../contexts/SocketContext";
import { Zone, getZoneBounds } from "../utils/zoneUtils";
import "./ZoneEditor.css";

interface ZoneEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const ZoneEditor = ({ isOpen, onClose }: ZoneEditorProps) => {
  const { mapData, refreshMap } = useMap();
  const { currentUser } = useSocket();
  const [zones, setZones] = useState<Zone[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newZone, setNewZone] = useState({
    name: "",
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    maxUsers: 10,
  });
  const [placementMode, setPlacementMode] = useState<"start" | "end" | null>(null);

  useEffect(() => {
    if (mapData?.zones) {
      setZones(mapData.zones);
    }
  }, [mapData]);

  useEffect(() => {
    if (!isOpen || !placementMode) return;

    const handleMapClick = (e: MouseEvent) => {
      const gameContainer = document.getElementById("phaser-game");
      if (!gameContainer) return;

      const rect = gameContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (placementMode === "start") {
        setNewZone((prev) => ({ ...prev, x1: x, y1: y }));
        setPlacementMode("end");
        alert("Click again to set the end point of the zone");
      } else if (placementMode === "end") {
        setNewZone((prev) => ({ ...prev, x2: x, y2: y }));
        setPlacementMode(null);
      }
    };

    window.addEventListener("click", handleMapClick);
    return () => window.removeEventListener("click", handleMapClick);
  }, [isOpen, placementMode]);

  const handleCreateZone = async () => {
    if (!newZone.name.trim() || !currentUser?.roomId) return;
    if (newZone.x1 === newZone.x2 || newZone.y1 === newZone.y2) {
      alert("Zone must have a valid area");
      return;
    }

    try {
      const zoneId = `zone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const updatedZones = [
        ...zones,
        {
          id: zoneId,
          name: newZone.name,
          bounds: {
            x1: newZone.x1,
            y1: newZone.y1,
            x2: newZone.x2,
            y2: newZone.y2,
          },
          maxUsers: newZone.maxUsers,
        },
      ];

      const response = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:5001"
        }/api/maps/room/${currentUser.roomId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            zones: updatedZones,
          }),
        }
      );

      if (response.ok) {
        await refreshMap();
        setIsCreating(false);
        setNewZone({
          name: "",
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 0,
          maxUsers: 10,
        });
        alert("Zone created successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "Failed to create zone"}`);
      }
    } catch (error) {
      console.error("Error creating zone:", error);
      alert("Failed to create zone");
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm("Are you sure you want to delete this zone?")) return;

    try {
      const updatedZones = zones.filter((z) => z.id !== zoneId);

      const response = await fetch(
        `${
          import.meta.env.VITE_SERVER_URL || "http://localhost:5001"
        }/api/maps/room/${currentUser?.roomId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            zones: updatedZones,
          }),
        }
      );

      if (response.ok) {
        await refreshMap();
      } else {
        alert("Failed to delete zone");
      }
    } catch (error) {
      console.error("Error deleting zone:", error);
      alert("Failed to delete zone");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="zone-editor-overlay" onClick={onClose}>
      <div className="zone-editor-panel" onClick={(e) => e.stopPropagation()}>
        <div className="editor-header">
          <h2>Private Spaces</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="editor-content">
          <div className="zones-list">
            <div className="list-header">
              <h3>Zones ({zones.length})</h3>
              <button
                className="btn-primary"
                onClick={() => {
                  setIsCreating(true);
                  setPlacementMode("start");
                  alert("Click on the map to set the start point");
                }}
              >
                + Create Zone
              </button>
            </div>

            {zones.length === 0 ? (
              <p className="empty-state">
                No zones yet. Create zones to create private spaces with audio
                isolation.
              </p>
            ) : (
              <div className="zones-grid">
                {zones.map((zone) => {
                  const bounds = getZoneBounds(zone);
                  return (
                    <div key={zone.id} className="zone-card">
                      <div className="zone-info">
                        <h4>{zone.name}</h4>
                        <p className="zone-bounds">
                          ({Math.round(bounds.x)}, {Math.round(bounds.y)}) - (
                          {Math.round(bounds.x + bounds.width)},{" "}
                          {Math.round(bounds.y + bounds.height)})
                        </p>
                        <p className="zone-size">
                          {Math.round(bounds.width)} ×{" "}
                          {Math.round(bounds.height)}px
                        </p>
                        {zone.maxUsers && (
                          <p className="zone-max">Max users: {zone.maxUsers}</p>
                        )}
                      </div>
                      <button
                        className="btn-danger"
                        onClick={() => handleDeleteZone(zone.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {isCreating && (
            <div className="create-zone-form">
              <h3>Create New Zone</h3>
              <div className="form-group">
                <label>Zone Name</label>
                <input
                  type="text"
                  value={newZone.name}
                  onChange={(e) =>
                    setNewZone({ ...newZone, name: e.target.value })
                  }
                  placeholder="e.g., Meeting Room 1"
                />
              </div>

              <div className="form-group">
                <label>Max Users (optional)</label>
                <input
                  type="number"
                  value={newZone.maxUsers}
                  onChange={(e) =>
                    setNewZone({
                      ...newZone,
                      maxUsers: parseInt(e.target.value) || 10,
                    })
                  }
                  min="1"
                  max="50"
                />
              </div>

              <div className="form-group">
                <label>Bounds</label>
                <div className="bounds-display">
                  <p>
                    Start: ({Math.round(newZone.x1)}, {Math.round(newZone.y1)})
                  </p>
                  <p>
                    End: ({Math.round(newZone.x2)}, {Math.round(newZone.y2)})
                  </p>
                  {placementMode && (
                    <p className="placement-hint">
                      {placementMode === "start"
                        ? "Click on map to set start point..."
                        : "Click on map to set end point..."}
                    </p>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setIsCreating(false);
                    setPlacementMode(null);
                    setNewZone({
                      name: "",
                      x1: 0,
                      y1: 0,
                      x2: 0,
                      y2: 0,
                      maxUsers: 10,
                    });
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleCreateZone}
                  disabled={
                    !newZone.name.trim() ||
                    newZone.x1 === newZone.x2 ||
                    newZone.y1 === newZone.y2 ||
                    placementMode !== null
                  }
                >
                  Create Zone
                </button>
              </div>
            </div>
          )}

          <div className="zone-info-panel">
            <h3>How Private Spaces Work</h3>
            <ul>
              <li>
                Users in the same zone can hear and see each other (within 150px
                proximity)
              </li>
              <li>
                Users in different zones cannot hear each other, even if close
              </li>
              <li>
                Users outside all zones are in the public area and can hear
                everyone nearby
              </li>
              <li>Create zones to create private meeting spaces</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoneEditor;

