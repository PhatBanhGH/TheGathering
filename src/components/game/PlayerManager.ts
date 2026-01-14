/**
 * PlayerManager - Handles creating and managing player sprites
 */
export class PlayerManager {
  /**
   * Create the main player sprite
   */
  static createPlayer(
    scene: Phaser.Scene,
    currentUser: any,
    wallLayer?: Phaser.Tilemaps.TilemapLayer
  ): {
    container: Phaser.GameObjects.Container;
    sprite: Phaser.GameObjects.Sprite;
    nameLabel: Phaser.GameObjects.Text;
    position: { x: number; y: number };
  } {
    const startX = currentUser?.position?.x || 100;
    const startY = currentUser?.position?.y || 100;
    const playerPosition = { x: startX, y: startY };

    const container = scene.add.container(startX, startY);
    container.setSize(32, 32);
    scene.physics.world.enable(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(24, 24);
    body.setOffset(-12, 12);

    const sprite = scene.add.sprite(0, 0, "player");
    container.add(sprite);

    const nameLabel = scene.add.text(0, -25, currentUser?.username || "You", {
      fontSize: "12px",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    container.add(nameLabel);

    // Play initial animation
    sprite.play("player-idle-down", true);

    if (wallLayer) {
      scene.physics.add.collider(container, wallLayer);
    }

    return {
      container,
      sprite,
      nameLabel,
      position: playerPosition
    };
  }

  /**
   * Create another player sprite
   */
  static createOtherPlayer(
    scene: Phaser.Scene,
    user: any
  ): {
    container: Phaser.GameObjects.Container;
    sprite: Phaser.GameObjects.Sprite;
    label: Phaser.GameObjects.Text;
  } {
    const pos = user.position || { x: 100, y: 100 };
    const container = scene.add.container(pos.x, pos.y);
    container.setSize(32, 32);

    const sprite = scene.add.sprite(0, 0, "player");
    container.add(sprite);

    const nameLabel = scene.add.text(0, -25, user.username || "User", {
      fontSize: "12px",
      color: "#ffffff",
      backgroundColor: "#000000",
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);
    container.add(nameLabel);

    // Play appropriate animation based on direction or default
    const direction = user.direction || "idle-down";
    const animName = direction.startsWith("idle") ? direction : `walk-${direction}`;
    const fullAnim = `player-${animName}`;
    if (scene.anims.exists(fullAnim)) {
      sprite.play(fullAnim, true);
    } else {
      sprite.play("player-idle-down", true);
    }

    return {
      container,
      sprite,
      label: nameLabel
    };
  }

  /**
   * Update another player's position and animation
   */
  static updateOtherPlayer(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    sprite: Phaser.GameObjects.Sprite,
    position: { x: number; y: number },
    direction?: string
  ): void {
    // Smooth position interpolation - only tween if distance is significant
    const currentX = container.x;
    const currentY = container.y;
    const targetX = position.x;
    const targetY = position.y;
    const distance = Phaser.Math.Distance.Between(currentX, currentY, targetX, targetY);

    // Only use tween for larger movements to improve performance
    // For small movements, directly set position
    if (distance > 10) {
      // Kill any existing tween on this container to prevent conflicts
      scene.tweens.killTweensOf(container);
      scene.tweens.add({
        targets: container,
        x: targetX,
        y: targetY,
        duration: 150, // Slightly longer for smoother interpolation
        ease: 'Linear'
      });
    } else if (distance > 1) {
      // Small movements: direct position update (no tween for better performance)
      container.setPosition(targetX, targetY);
    }

    // Update animation if direction provided
    if (direction) {
      const animName = direction.startsWith("idle") ? direction : `walk-${direction}`;
      const fullAnim = `player-${animName}`;
      if (scene.anims.exists(fullAnim)) {
        sprite.play(fullAnim, true);
      }
    }
  }
}


