/**
 * AnimationManager - Handles creating character animations
 */
export class AnimationManager {
  /**
   * Create animations for a character sprite
   */
  static createCharacterAnimations(scene: Phaser.Scene, key: string): void {
    const directions = ["down", "left", "right", "up"];
    directions.forEach((dir) => {
      const startFrame = 0;
      // Walk animation
      scene.anims.create({
        key: `${key}-walk-${dir}`,
        frames: scene.anims.generateFrameNumbers(key, {
          frames: [startFrame, startFrame + 1, startFrame + 2]
        }),
        frameRate: 8,
        repeat: -1,
        yoyo: true
      });
      // Idle animation
      scene.anims.create({
        key: `${key}-idle-${dir}`,
        frames: [{ key: key, frame: startFrame + 1 }],
        frameRate: 1,
        repeat: -1
      });
    });
  }

  /**
   * Create all game animations
   */
  static createAllAnimations(scene: Phaser.Scene): void {
    this.createCharacterAnimations(scene, "player");
    this.createCharacterAnimations(scene, "npc1");
    this.createCharacterAnimations(scene, "npc2");
  }
}


