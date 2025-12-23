import Phaser from 'phaser';
import { MAX_LEVEL, GAME_WIDTH, GAME_HEIGHT } from '../constants.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Load title screen
    this.load.image('title', 'assets/title.png');

    // Load block sprite sheet (grayscale with depth)
    this.load.image('blocks-spritesheet', 'assets/blocks-sprite.png');

    // Load bitmap font (Thick 8x8 from frostyfreeze)
    this.load.bitmapFont('pixel-font', 'assets/fonts/thick_8x8.png', 'assets/fonts/thick_8x8.xml');

    // Load backdrops for all levels
    for (let i = 1; i <= MAX_LEVEL; i++) {
      this.load.image(`backdrop-${i}`, `assets/backdrops/level-${i}/backdrop.png`);
    }

    // Load music for all levels
    for (let i = 1; i <= MAX_LEVEL; i++) {
      this.load.audio(`music-${i}`, `assets/music/level-${i}/track.mp3`);
    }
  }

  create() {
    // Title image fills entire screen (256x224)
    const titleImage = this.add.image(0, 0, 'title');
    titleImage.setOrigin(0, 0);
    titleImage.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    // Game title
    const titleText = this.add.bitmapText(GAME_WIDTH / 2, 60, 'pixel-font', 'STACK PROTOCOL', 20).setOrigin(0.5);
    titleText.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    titleText.setDepth(10);

    // "Press space to start" text
    const startText = this.add.bitmapText(GAME_WIDTH / 2, 140, 'pixel-font', 'PRESS SPACE TO START', 10).setOrigin(0.5);
    startText.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    startText.setDepth(10);

    // Blinking effect for start text
    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    // Credits text
    const creditsText = this.add.bitmapText(GAME_WIDTH / 2, 200, 'pixel-font', 'BY MARCO VAN HYLCKAMA VLIEG', 10).setOrigin(0.5);
    creditsText.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    creditsText.setDepth(10);

    // Wait for space key to start
    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }
}

