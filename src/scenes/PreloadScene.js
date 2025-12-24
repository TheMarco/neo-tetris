import Phaser from 'phaser';
import { MAX_LEVEL, GAME_WIDTH, GAME_HEIGHT, BORDER_OFFSET } from '../constants.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Create loading screen
    const loadingText = this.add.text(GAME_WIDTH / 2 + BORDER_OFFSET, GAME_HEIGHT / 2 - 20, 'LOADING...', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    const progressText = this.add.text(GAME_WIDTH / 2 + BORDER_OFFSET, GAME_HEIGHT / 2 + 10, '0%', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Progress bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(GAME_WIDTH / 2 + BORDER_OFFSET - 80, GAME_HEIGHT / 2 + 30, 160, 20);

    // Update progress
    this.load.on('progress', (value) => {
      progressText.setText(Math.floor(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(GAME_WIDTH / 2 + BORDER_OFFSET - 78, GAME_HEIGHT / 2 + 32, 156 * value, 16);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      progressText.destroy();
    });

    // Load title screen
    this.load.image('title', 'assets/title.png');

    // Load game over screen
    this.load.image('game-over', 'assets/game-over.png');

    // Load block sprite sheet (grayscale with depth)
    this.load.image('blocks-spritesheet', 'assets/blocks-sprite.png');

    // Load crush animation sprite (40x8px = 5 frames of 8x8px)
    this.load.image('crush-spritesheet', 'assets/crush.png');

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
    // Title image fills entire screen (256x224), offset by border
    const titleImage = this.add.image(BORDER_OFFSET, 0, 'title');
    titleImage.setOrigin(0, 0);
    titleImage.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    // "Press space to start" text - positioned in bottom third
    const startText = this.add.bitmapText(GAME_WIDTH / 2 + BORDER_OFFSET, GAME_HEIGHT * 0.7 + 20, 'pixel-font', 'PRESS SPACE TO START', 10).setOrigin(0.5);
    startText.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    startText.setDepth(10);

    // Demo mode timer - start demo after 10 seconds of inactivity
    this.demoTimer = this.time.delayedCall(10000, () => {
      this.startDemoMode();
    });

    // Blinking effect for start text
    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    // Credits text - positioned below start text in bottom third
    const creditsText = this.add.bitmapText(GAME_WIDTH / 2 + BORDER_OFFSET, GAME_HEIGHT * 0.8 + 20, 'pixel-font', 'BY MARCO VAN HYLCKAMA VLIEG', 10).setOrigin(0.5);
    creditsText.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    creditsText.setDepth(10);

    // Wait for space key to start
    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.start('ModeSelectScene');
    });
  }
}

