import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';
import PreloadScene from './scenes/PreloadScene.js';

const config = {
  type: Phaser.WEBGL,
  width: 256,
  height: 224,
  parent: 'game-container',
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
    antialiasGL: false
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: 3
  },
  scene: [PreloadScene, GameScene]
};

const game = new Phaser.Game(config);

