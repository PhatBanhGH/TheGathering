import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { useSocket } from "../contexts/SocketContext";
import { useMap } from "../contexts/MapContext";
import SimplifiedMap from "./ui/SimplifiedMap";
import NotificationPanel from "./NotificationPanel";
import { useNotifications } from "../contexts/NotificationContext";
import {
  AssetLoader,
  AnimationManager,
  MapRenderer,
  ObjectManager,
  NPCManager,
  PlayerController,
  PlayerManager,
  SocketHandlers,
  ZoneIndicator,
  SpeechBubble,
} from "./game";

const GameScene = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const { socket, users, currentUser } = useSocket();
  const { mapData } = useMap();
  const [currentZone, setCurrentZone] = useState<{ id: string; name: string } | null>(null);
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [isOverviewMode, setIsOverviewMode] = useState(false);
  const isOverviewModeRef = useRef(false); // Ref for Phaser access
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotifications();

  // Handle Escape key to close map
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOverviewMode(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    class MainScene extends Phaser.Scene {
      private playerContainer?: Phaser.GameObjects.Container;
      private playerSprite?: Phaser.GameObjects.Sprite;
      private otherPlayers: Map<
        string,
        { container: Phaser.GameObjects.Container; sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text }
      > = new Map();
      private mapRenderer = new MapRenderer();
      private npcManager = new NPCManager();
      private playerController = new PlayerController();
      private zoneIndicator = new ZoneIndicator();
      private targetZoom = 1.5;
      private cleanupSocketHandlers?: () => void;

      constructor() {
        super({ key: "MainScene" });
      }

      preload() {
        AssetLoader.preload(this);
      }

      create() {
        // Create Animations
        AnimationManager.createAllAnimations(this);

        // Create Map
        const { wallLayer } = this.mapRenderer.createMap(this, mapData);

        // Create Player
        const playerData = PlayerManager.createPlayer(this, currentUser, wallLayer);
        this.playerContainer = playerData.container;
        this.playerSprite = playerData.sprite;
        this.playerController.setPlayer(this.playerContainer, this.playerSprite);

        // Create Office Objects (after player so collisions work)
        ObjectManager.createOfficeObjects(this, this.playerContainer);

        // Create NPCs
        this.npcManager.createNPC(this, 200, 200, "Receptionist", this.playerContainer);
        this.npcManager.createNPC(this, 400, 300, "Colleague", this.playerContainer);

        // Create other players from initial list
        // Chỉ tạo cho user đang online để tránh ghost/offline trên map
        if (users) {
          users.forEach((user) => {
            const status = (user as any).status || "online";
            if (user.userId !== currentUser?.userId && status === "online") {
              this.createOtherPlayer(user);
            }
          });
        }

        // Initialize input controls
        this.playerController.initInput(this);

        // Setup camera
        if (this.playerContainer) {
          this.cameras.main.startFollow(this.playerContainer);
          this.cameras.main.setZoom(1.5);
          this.targetZoom = 1.5;
        }

        // Setup zoom controls
        this.input.on("wheel", (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
          const currentZoom = this.cameras.main.zoom;
          if (deltaY > 0) {
            if (currentZoom > 1.0) {
              this.targetZoom = Math.max(1.0, currentZoom - 0.1);
            } else {
              setIsOverviewMode(true);
            }
          } else {
            this.targetZoom = Math.min(2.5, currentZoom + 0.1);
            setIsOverviewMode(false);
          }
        });

        // Create Zone Indicator
        this.zoneIndicator.createIndicator(this);

        // Setup Socket Listeners
        if (socket) {
          this.cleanupSocketHandlers = SocketHandlers.setupListeners(
            this,
            socket,
            currentUser,
            this.otherPlayers,
            (user) => this.createOtherPlayer(user),
            (userId, position, direction) => this.updateOtherPlayer(userId, position, direction),
            (userId, message) => this.showSpeechBubble(userId, message)
          );
        }
      }

      update() {
        this.cameras.main.setZoom(
          Phaser.Math.Interpolation.Linear([this.cameras.main.zoom, this.targetZoom], 0.1)
        );

        if (isOverviewMode !== isOverviewModeRef.current) {
          isOverviewModeRef.current = isOverviewMode;
        }

        // Update player position
        this.playerController.updatePlayerPosition(
          this,
          socket,
          (animName) => this.playAnimation(animName)
        );

        // Check interactions
        this.playerController.checkInteractions(
          this,
          this.mapRenderer.getInteractiveObjects() || null,
          setInteractionPrompt,
          (sitting) => this.playerController.setSitting(sitting),
          (x, y) => {
            if (this.playerContainer) {
              this.playerContainer.setPosition(x, y);
            }
          },
          (animName) => this.playAnimation(animName)
        );

        // Update NPCs
        this.npcManager.updateNPCs();

        // Update zone indicator
        this.zoneIndicator.updateIndicator(
          this,
          this.playerController.getPlayerPosition(),
          mapData,
          setCurrentZone
        );
      }

      showSpeechBubble(userId: string, message: string) {
        let container: Phaser.GameObjects.Container | undefined;

        if (userId === currentUser?.userId) {
          container = this.playerContainer;
        } else if (this.otherPlayers.has(userId)) {
          container = this.otherPlayers.get(userId)?.container;
        }

        if (!container) return;

        SpeechBubble.showSpeechBubble(this, container, message);
      }

      createOtherPlayer(user: any) {
        const playerData = PlayerManager.createOtherPlayer(this, user);
        this.otherPlayers.set(user.userId, playerData);
      }

      updateOtherPlayer(userId: string, position: { x: number; y: number }, direction?: string) {
        const player = this.otherPlayers.get(userId);
        if (!player) return;
        PlayerManager.updateOtherPlayer(this, player.container, player.sprite, position, direction);
      }

      playAnimation(animName: string) {
        if (!this.playerSprite) return;
        const fullAnim = `player-${animName}`;
        if (this.anims.exists(fullAnim)) {
          this.playerSprite.play(fullAnim, true);
        }
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth - 300,
      height: window.innerHeight - 60,
      parent: "phaser-game",
      backgroundColor: "#F0F4F8", // Pastel Blue-Grey
      scene: MainScene,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      // Socket cleanup is handled by SocketHandlers cleanup function
    };
  }, [currentUser, socket, mapData]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <SimplifiedMap visible={isOverviewMode} onClose={() => setIsOverviewMode(false)} />
      <div id="phaser-game" style={{ width: "100%", height: "100%" }} />
      {currentZone && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(99, 102, 241, 0.9)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "20px",
            fontWeight: "bold",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            zIndex: 100,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>🔊</span>
          <span>{currentZone.name}</span>
        </div>
      )}
      {interactionPrompt && (
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "#fbbf24", // Amber color
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "18px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
            zIndex: 100,
            pointerEvents: "none",
            animation: "fadeIn 0.2s ease-in-out"
          }}
        >
          {interactionPrompt}
        </div>
      )}

      {/* Notification Button */}
      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 100 }}>
        <button
          onClick={() => setShowNotifications(true)}
          style={{
            background: "rgba(0, 0, 0, 0.6)",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "white",
            fontSize: "20px",
            position: "relative",
            transition: "background 0.2s"
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "rgba(0, 0, 0, 0.8)")}
          onMouseOut={(e) => (e.currentTarget.style.background = "rgba(0, 0, 0, 0.6)")}
          title="Notifications"
        >
          🔔
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-2px",
                right: "-2px",
                background: "#ef4444",
                color: "white",
                fontSize: "10px",
                fontWeight: "bold",
                padding: "2px 4px",
                borderRadius: "8px",
                minWidth: "14px",
                textAlign: "center",
                lineHeight: "1.2"
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
};

export default GameScene;
