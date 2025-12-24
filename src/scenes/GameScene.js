import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, BLOCK_SIZE, GRID_WIDTH, GRID_HEIGHT,
  PLAY_AREA_X, PLAY_AREA_Y, PLAY_AREA_WIDTH, PLAY_AREA_HEIGHT,
  TETROMINOES, ADVANCED_TETROMINOES, SCORES, LEVEL_SPEEDS, MAX_LEVEL, UI, BORDER_OFFSET, LEVEL_TITLES
} from '../constants.js';
import ColorExtractor from '../utils/ColorExtractor.js';
import SpriteBlockRenderer from '../utils/SpriteBlockRenderer.js';
import SoundGenerator from '../utils/SoundGenerator.js';
import { CONFIG } from '../config.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  create() {
    // Get game mode from registry (set by ModeSelectScene)
    this.gameMode = this.registry.get('gameMode') || 'classic';
    this.tetrominoes = this.gameMode === 'advanced' ? ADVANCED_TETROMINOES : TETROMINOES;

    // CRITICAL: Ensure canvas has focus and can receive keyboard events
    this.game.canvas.setAttribute('tabindex', '1');
    this.game.canvas.focus();
    this.game.canvas.style.outline = 'none';

    // Visual indicator for focus loss
    this.focusWarning = null;

    // Re-focus on any click
    this.game.canvas.addEventListener('click', () => {
      this.game.canvas.focus();
      if (this.focusWarning) {
        this.focusWarning.destroy();
        this.focusWarning = null;
      }
    });

    // Monitor focus state
    this.game.canvas.addEventListener('blur', () => {
      console.log('Canvas lost focus!');
      if (!this.focusWarning) {
        this.focusWarning = this.add.text(GAME_WIDTH / 2 + BORDER_OFFSET, 10, 'CLICK TO FOCUS', {
          fontSize: '8px',
          color: '#ff0000',
          backgroundColor: '#000000'
        }).setOrigin(0.5).setDepth(300);
      }
    });

    this.game.canvas.addEventListener('focus', () => {
      console.log('Canvas gained focus');
      if (this.focusWarning) {
        this.focusWarning.destroy();
        this.focusWarning = null;
      }
    });

    // Re-focus if window regains focus
    window.addEventListener('focus', () => {
      this.game.canvas.focus();
    });

    this.grid = this.createEmptyGrid();
    this.score = 0; this.level = 1; this.lines = 0; this.gameOver = false;
    this.clearing = false;
    this.dropCounter = 0; this.dropInterval = LEVEL_SPEEDS[0];
    this.softDropping = false; this.softDropCounter = 0;
    this.inputEnabled = true;
    this.currentPiece = null; this.nextPiece = null;
    this.currentX = 0; this.currentY = 0;
    this.blockSprites = []; this.ghostSprites = [];
    this.setupInput();
    this.loadLevel(this.level, false); // Load level first without intro
    this.createUI(); // Create UI after level is loaded
    this.spawnPiece(); this.nextPiece = this.getRandomPiece();
    this.updateNextPieceDisplay();

    // Show intro animation after everything is set up
    this.showLevelIntro();
  }

  createEmptyGrid() {
    const grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) { grid[y] = []; for (let x = 0; x < GRID_WIDTH; x++) grid[y][x] = 0; }
    return grid;
  }

  loadLevel(level, showIntro = false) {
    if (this.currentMusic) this.currentMusic.stop();
    const backdropKey = `backdrop-${level}`;
    if (this.backdrop) this.backdrop.destroy();
    this.backdrop = this.add.image(BORDER_OFFSET, 0, backdropKey).setOrigin(0, 0);
    this.backdrop.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.backdrop.setDepth(-1);
    this.colorPalette = ColorExtractor.extractPalette(this, backdropKey);
    this.createBlockTextures();
    const musicKey = `music-${level}`;
    this.currentMusic = this.sound.add(musicKey, { loop: true, volume: 0.5 });
    this.currentMusic.play();
    this.redrawGrid();

    if (showIntro) {
      this.showLevelIntro();
    }
  }

  showLevelIntro() {
    // Immediately move containers off-screen (before any delay)
    if (this.playAreaContainer) {
      this.playAreaContainer.y = -GAME_HEIGHT;
    }
    if (this.uiPanelContainer) {
      this.uiPanelContainer.y = -GAME_HEIGHT;
    }

    // Hide all block sprites (current piece and grid)
    this.blockSprites.forEach(sprite => sprite.setVisible(false));
    this.ghostSprites.forEach(sprite => sprite.setVisible(false));

    // Disable input temporarily
    this.inputEnabled = false;

    // Show level title text
    const levelTitle = LEVEL_TITLES[this.level] || 'Unknown';
    const levelText = this.createBitmapText(GAME_WIDTH / 2 + BORDER_OFFSET, GAME_HEIGHT / 2 - 10, `LEVEL ${this.level}`, 16);
    levelText.setOrigin(0.5);
    levelText.setDepth(201);

    const titleText = this.createBitmapText(GAME_WIDTH / 2 + BORDER_OFFSET, GAME_HEIGHT / 2 + 10, levelTitle, 10);
    titleText.setOrigin(0.5);
    titleText.setDepth(201);

    // Wait 1 second showing backdrop and title
    this.time.delayedCall(1500, () => {
      // Fade out title texts
      this.tweens.add({
        targets: [levelText, titleText],
        alpha: 0,
        duration: 300,
        onComplete: () => {
          levelText.destroy();
          titleText.destroy();
        }
      });

      // Play woosh sound
      SoundGenerator.playWoosh();

      // Animate play area falling in
      if (this.playAreaContainer) {
        this.tweens.add({
          targets: this.playAreaContainer,
          y: 0,
          duration: 600,
          ease: 'Bounce.easeOut'
        });
      }

      // Animate UI panel falling in (slightly delayed)
      if (this.uiPanelContainer) {
        this.tweens.add({
          targets: this.uiPanelContainer,
          y: 0,
          duration: 600,
          delay: 100,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            // Show blocks and re-enable input after animations complete
            this.blockSprites.forEach(sprite => sprite.setVisible(true));
            this.ghostSprites.forEach(sprite => sprite.setVisible(true));
            this.inputEnabled = true;
          }
        });
      }
    });
  }

  createBlockTextures() {
    const enhanced = SpriteBlockRenderer.enhancePalette(this.colorPalette);
    this.colorPalette = enhanced;
    Object.keys(this.tetrominoes).forEach((key, i) => {
      // Remove old textures if they exist
      if (this.textures.exists(`block-${key}`)) {
        this.textures.remove(`block-${key}`);
      }
      if (this.textures.exists(`ghost-${key}`)) {
        this.textures.remove(`ghost-${key}`);
      }
      SpriteBlockRenderer.createBlockTexture(this, this.colorPalette, this.level, `block-${key}`, i);
      SpriteBlockRenderer.createBlockTexture(this, this.colorPalette, this.level, `ghost-${key}`, i);
    });
  }

  setupInput() {
    // Simple polling - use Phaser's built-in JustDown
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    // DAS settings for left/right auto-repeat when HOLDING
    this.dasDelay = 16;  // Frames before repeat starts (longer delay)
    this.dasSpeed = 4;   // Frames between repeats (slower repeat)
    this.leftHoldCounter = 0;
    this.rightHoldCounter = 0;

    // Grace period to prevent double-taps
    this.moveGracePeriod = 2; // Minimum frames between moves
    this.leftGraceCounter = 0;
    this.rightGraceCounter = 0;

    this.paused = false;
  }

  createBitmapText(x, y, text, size = 10) {
    const t = this.add.bitmapText(x, y, 'pixel-font', text.toUpperCase(), size);
    t.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return t;
  }

  createUI() {
    // Create container for play area (so it can be animated as a unit)
    this.playAreaContainer = this.add.container(0, 0);
    const playAreaGraphics = this.add.graphics();
    this.drawNESFrame(playAreaGraphics, PLAY_AREA_X - 2, PLAY_AREA_Y - 2, PLAY_AREA_WIDTH + 5, PLAY_AREA_HEIGHT + 4);
    this.playAreaContainer.add(playAreaGraphics);

    // Create container for right-side UI panels
    this.uiPanelContainer = this.add.container(0, 0);
    const panelGraphics = this.add.graphics();

    // UI text positions - align first frame with play area top
    const frameWidth = UI.PANEL_WIDTH - 3;
    const x = UI.PANEL_X + UI.PADDING;
    let y = PLAY_AREA_Y; // Align with play area top

    // SCORE frame
    this.drawNESFrame(panelGraphics, UI.PANEL_X, y - 2, frameWidth, 26);
    const scoreLabel = this.createBitmapText(x, y + 2, 'SCORE');
    y += 12;
    this.scoreText = this.createBitmapText(x, y + 2, '000000');
    y += 12 + 12; // 12px vertical space

    // LEVEL frame
    this.drawNESFrame(panelGraphics, UI.PANEL_X, y - 2, frameWidth, 26);
    const levelLabel = this.createBitmapText(x, y + 2, 'LEVEL');
    y += 12;
    this.levelText = this.createBitmapText(x, y + 2, '1');
    y += 12 + 12; // 12px vertical space

    // LINES frame
    this.drawNESFrame(panelGraphics, UI.PANEL_X, y - 2, frameWidth, 26);
    const linesLabel = this.createBitmapText(x, y + 2, 'LINES');
    y += 12;
    this.linesText = this.createBitmapText(x, y + 2, '0');
    y += 12 + 12; // 12px vertical space

    // NEXT frame
    const nextFrameHeight = 42; // Enough for piece preview + 2px top padding
    this.drawNESFrame(panelGraphics, UI.PANEL_X, y - 2, frameWidth, nextFrameHeight);
    this.nextPieceText = this.createBitmapText(x, y + 2, 'NEXT');
    this.nextPieceY = y + 16;
    this.nextPieceX = x;

    // Add all UI elements to the container
    this.uiPanelContainer.add([
      panelGraphics,
      scoreLabel,
      this.scoreText,
      levelLabel,
      this.levelText,
      linesLabel,
      this.linesText,
      this.nextPieceText
    ]);
  }

  drawNESFrame(g, x, y, w, h) {
    g.fillStyle(0x000000, 1); g.fillRect(x, y, w, h);
    g.lineStyle(2, 0xAAAAAA, 1); g.strokeRect(x, y, w, h);
    g.lineStyle(1, 0x555555, 1); g.strokeRect(x + 2, y + 2, w - 4, h - 4);
    g.lineStyle(1, 0xFFFFFF, 1); g.beginPath(); g.moveTo(x + 1, y + h - 1); g.lineTo(x + 1, y + 1); g.lineTo(x + w - 1, y + 1); g.strokePath();
    g.lineStyle(1, 0x333333, 1); g.beginPath(); g.moveTo(x + w - 1, y + 1); g.lineTo(x + w - 1, y + h - 1); g.lineTo(x + 1, y + h - 1); g.strokePath();
  }

  getRandomPiece() {
    const keys = Object.keys(this.tetrominoes);
    return JSON.parse(JSON.stringify(this.tetrominoes[keys[Math.floor(Math.random() * keys.length)]]));
  }

  spawnPiece() {
    this.currentPiece = this.nextPiece ? this.nextPiece : this.getRandomPiece();
    this.nextPiece = this.getRandomPiece();
    this.currentX = Math.floor(GRID_WIDTH / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
    this.currentY = 0;
    if (this.checkCollision(this.currentPiece, this.currentX, this.currentY)) { this.gameOver = true; this.handleGameOver(); }
    this.updateNextPieceDisplay();
  }

  update(time, delta) {
    if (this.gameOver || !this.inputEnabled) return;

    // Pause check - always available
    if (Phaser.Input.Keyboard.JustDown(this.pKey)) {
      this.togglePause();
    }

    if (this.clearing || this.paused) return;

    this.handleInput();
    this.dropCounter++;
    if (this.dropCounter >= this.dropInterval) { this.dropCounter = 0; this.moveDown(); }
    this.renderPiece();
  }

  togglePause() {
    this.paused = !this.paused;
    if (this.paused) {
      this.pauseOverlay = this.add.rectangle(GAME_WIDTH / 2 + BORDER_OFFSET, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8);
      this.pauseOverlay.setDepth(100);
      this.pauseText = this.createBitmapText(GAME_WIDTH / 2 + BORDER_OFFSET, GAME_HEIGHT / 2, 'PAUSED');
      this.pauseText.setOrigin(0.5).setDepth(101);
      this.pauseHintText = this.createBitmapText(GAME_WIDTH / 2 + BORDER_OFFSET, GAME_HEIGHT / 2 + 12, 'PRESS P');
      this.pauseHintText.setOrigin(0.5).setDepth(101);
      if (this.currentMusic) this.currentMusic.pause();
    } else {
      if (this.pauseOverlay) { this.pauseOverlay.destroy(); this.pauseOverlay = null; }
      if (this.pauseText) { this.pauseText.destroy(); this.pauseText = null; }
      if (this.pauseHintText) { this.pauseHintText.destroy(); this.pauseHintText = null; }
      if (this.currentMusic) this.currentMusic.resume();
    }
  }

  handleInput() {
    // Rotation - JustDown ensures one action per press
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.rotatePiece();
    }

    // Hard drop - JustDown ensures one action per press
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.hardDrop();
    }

    // Soft drop (down key held) - continuous action
    if (this.cursors.down.isDown) {
      if (!this.softDropping) { this.softDropping = true; this.softDropCounter = 0; }
      this.softDropCounter++;
      if (this.softDropCounter >= 2) {
        this.softDropCounter = 0;
        if (this.moveDown()) {
          this.score += SCORES.SOFT_DROP;
          this.updateUI();
          SoundGenerator.playSoftDrop();
        }
      }
    } else {
      this.softDropping = false;
      this.softDropCounter = 0;
    }

    // Decrement grace counters
    if (this.leftGraceCounter > 0) this.leftGraceCounter--;
    if (this.rightGraceCounter > 0) this.rightGraceCounter--;

    // LEFT - JustDown for first press, then auto-repeat when held
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) && this.leftGraceCounter === 0) {
      this.moveLeft();
      this.leftHoldCounter = 0;
      this.leftGraceCounter = this.moveGracePeriod;
    } else if (this.cursors.left.isDown && this.leftGraceCounter === 0) {
      this.leftHoldCounter++;
      if (this.leftHoldCounter >= this.dasDelay && (this.leftHoldCounter - this.dasDelay) % this.dasSpeed === 0) {
        this.moveLeft();
        this.leftGraceCounter = this.moveGracePeriod;
      }
    } else if (!this.cursors.left.isDown) {
      this.leftHoldCounter = 0;
    }

    // RIGHT - JustDown for first press, then auto-repeat when held
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right) && this.rightGraceCounter === 0) {
      this.moveRight();
      this.rightHoldCounter = 0;
      this.rightGraceCounter = this.moveGracePeriod;
    } else if (this.cursors.right.isDown && this.rightGraceCounter === 0) {
      this.rightHoldCounter++;
      if (this.rightHoldCounter >= this.dasDelay && (this.rightHoldCounter - this.dasDelay) % this.dasSpeed === 0) {
        this.moveRight();
        this.rightGraceCounter = this.moveGracePeriod;
      }
    } else if (!this.cursors.right.isDown) {
      this.rightHoldCounter = 0;
    }
  }

  moveLeft() { if (!this.checkCollision(this.currentPiece, this.currentX - 1, this.currentY)) { this.currentX--; SoundGenerator.playMove(); } }
  moveRight() { if (!this.checkCollision(this.currentPiece, this.currentX + 1, this.currentY)) { this.currentX++; SoundGenerator.playMove(); } }
  moveDown() { if (!this.checkCollision(this.currentPiece, this.currentX, this.currentY + 1)) { this.currentY++; return true; } else { this.lockPiece(); return false; } }
  hardDrop() { while (!this.checkCollision(this.currentPiece, this.currentX, this.currentY + 1)) this.currentY++; SoundGenerator.playDrop(); this.lockPiece(); }

  rotatePiece() {
    const rotated = this.getRotatedPiece(this.currentPiece);

    // Try rotation at current position
    if (!this.checkCollision(rotated, this.currentX, this.currentY)) {
      this.currentPiece = rotated;
      SoundGenerator.playRotate();
      return;
    }

    // Wall kick: try shifting right
    if (!this.checkCollision(rotated, this.currentX + 1, this.currentY)) {
      this.currentPiece = rotated;
      this.currentX++;
      SoundGenerator.playRotate();
      return;
    }

    // Wall kick: try shifting left
    if (!this.checkCollision(rotated, this.currentX - 1, this.currentY)) {
      this.currentPiece = rotated;
      this.currentX--;
      SoundGenerator.playRotate();
      return;
    }

    // Wall kick: try shifting right 2 spaces (for I-piece)
    if (!this.checkCollision(rotated, this.currentX + 2, this.currentY)) {
      this.currentPiece = rotated;
      this.currentX += 2;
      SoundGenerator.playRotate();
      return;
    }

    // Wall kick: try shifting left 2 spaces (for I-piece)
    if (!this.checkCollision(rotated, this.currentX - 2, this.currentY)) {
      this.currentPiece = rotated;
      this.currentX -= 2;
      SoundGenerator.playRotate();
      return;
    }

    // Rotation failed - no valid position found
  }

  getRotatedPiece(piece) {
    const rotated = JSON.parse(JSON.stringify(piece));
    const shape = piece.shape;
    const rows = shape.length;
    const cols = shape[0].length;
    const newShape = [];
    for (let x = 0; x < cols; x++) { newShape[x] = []; for (let y = rows - 1; y >= 0; y--) newShape[x][rows - 1 - y] = shape[y][x]; }
    rotated.shape = newShape;
    return rotated;
  }

  checkCollision(piece, x, y) {
    const shape = piece.shape;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const gridX = x + col;
          const gridY = y + row;
          if (gridX < 0 || gridX >= GRID_WIDTH || gridY >= GRID_HEIGHT) return true;
          if (gridY >= 0 && this.grid[gridY][gridX]) return true;
        }
      }
    }
    return false;
  }

  lockPiece() {
    const shape = this.currentPiece.shape;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const gridX = this.currentX + col;
          const gridY = this.currentY + row;
          if (gridY >= 0) this.grid[gridY][gridX] = this.currentPiece.name;
        }
      }
    }
    this.checkAndClearLines();
  }

  checkAndClearLines() {
    // Find complete lines - a line is complete ONLY if every cell is filled
    const completeLines = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      let isComplete = true;
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (!this.grid[y][x]) {
          isComplete = false;
          break;
        }
      }
      if (isComplete) {
        console.log(`Line ${y} is complete:`, JSON.stringify(this.grid[y]));
        completeLines.push(y);
      }
    }

    if (completeLines.length > 0) {
      console.log('Complete lines found:', completeLines);
      console.log('Grid state:', JSON.stringify(this.grid));
    }

    if (completeLines.length === 0) {
      this.spawnPiece();
      this.redrawGrid();
      return;
    }

    // Block game updates during line clear
    this.clearing = true;

    // Play sound based on number of lines cleared
    SoundGenerator.playLineClear(completeLines.length);

    // Show the locked piece first
    this.redrawGrid();

    // Run the line clear animation, then apply changes
    this.animateLineClear(completeLines);
  }

  animateLineClear(completeLines) {
    // Create crush animation for each block
    const crushSprites = [];
    const texturesToCleanup = [];

    completeLines.forEach(y => {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const blockType = this.grid[y][x];
        if (!blockType) continue;

        const px = PLAY_AREA_X + x * BLOCK_SIZE;
        const py = PLAY_AREA_Y + y * BLOCK_SIZE;

        // Get the block's color from the palette
        const colorIndex = blockType - 1;
        const color = this.colorPalette[colorIndex % this.colorPalette.length];

        // Create unique crush animation frames for this specific block instance
        const uniqueId = `${Date.now()}-${x}-${y}-${Math.random().toString(36).substr(2, 9)}`;
        const frames = [];
        for (let f = 0; f < 5; f++) {
          const frameKey = `crush-${uniqueId}-${f}`;
          SpriteBlockRenderer.createCrushTexture(this, color, f, frameKey);
          frames.push(frameKey);
          texturesToCleanup.push(frameKey);
        }

        // Create sprite starting with frame 4 (most intact)
        const sprite = this.add.sprite(px, py, frames[4]).setOrigin(0, 0);
        sprite.setDepth(50);
        crushSprites.push({ sprite, frames });
      }
    });

    // Cycle through the 5 crush frames in REVERSE: 4 -> 3 -> 2 -> 1 -> 0
    let frameCounter = 4;

    this.time.addEvent({
      delay: 75, // 75ms per frame (twice as fast)
      repeat: 4, // repeat 4 times = 5 total callbacks (frames 4,3,2,1,0)
      callback: () => {
        if (frameCounter > 0) {
          frameCounter--;
          crushSprites.forEach(crushData => {
            crushData.sprite.setTexture(crushData.frames[frameCounter]);
          });
        }
      }
    });

    // After all 5 frames (4 shows immediately, then 3,2,1,0 at 75ms each = 300ms total), clean up
    this.time.delayedCall(350, () => {
      crushSprites.forEach(crushData => {
        crushData.sprite.destroy();
      });

      // Clean up all textures
      texturesToCleanup.forEach(frameKey => {
        if (this.textures.exists(frameKey)) {
          this.textures.remove(frameKey);
        }
      });

      this.finishLineClear(completeLines);
    });
  }

  finishLineClear(completeLines) {
    // Apply the grid changes first
    const validLines = completeLines.filter(y => {
      if (y < 0 || y >= GRID_HEIGHT) return false;
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (!this.grid[y][x]) return false;
      }
      return true;
    });

    if (validLines.length === 0) {
      console.warn('No valid lines to clear after validation');
      this.clearing = false;
      this.spawnPiece();
      this.redrawGrid();
      return;
    }

    // Build new grid
    const newGrid = [];
    const linesToRemove = new Set(validLines);

    for (let i = 0; i < validLines.length; i++) {
      newGrid.push(new Array(GRID_WIDTH).fill(0));
    }

    for (let y = 0; y < GRID_HEIGHT; y++) {
      if (!linesToRemove.has(y)) {
        newGrid.push([...this.grid[y]]);
      }
    }

    this.grid = newGrid;

    // Now animate the falling blocks
    // Rebuild sprites from new grid state
    this.redrawGrid();

    // Animate all sprites falling into place
    const sortedLines = [...validLines].sort((a, b) => a - b);

    this.blockSprites.forEach(sprite => {
      const spriteGridY = Math.floor((sprite.y - PLAY_AREA_Y) / BLOCK_SIZE);

      // Count how many cleared lines were below this sprite's ORIGINAL position
      let linesBelowCount = 0;
      sortedLines.forEach(clearedY => {
        if (clearedY > spriteGridY - validLines.length) {
          linesBelowCount++;
        }
      });

      if (linesBelowCount > 0) {
        // Start sprite higher, then animate down to current position
        const startY = sprite.y - (linesBelowCount * BLOCK_SIZE);
        sprite.y = startY;

        this.tweens.add({
          targets: sprite,
          y: sprite.y + (linesBelowCount * BLOCK_SIZE),
          duration: 150,
          ease: 'Bounce.easeOut'
        });
      }
    });

    // Wait for fall animation, then finish
    this.time.delayedCall(160, () => {
      this.finishScoring(validLines);
    });
  }

  finishScoring(validLines) {
    // Update score
    this.lines += validLines.length;
    const levelMultiplier = this.level;
    switch (validLines.length) {
      case 1: this.score += SCORES.SINGLE * levelMultiplier; break;
      case 2: this.score += SCORES.DOUBLE * levelMultiplier; break;
      case 3: this.score += SCORES.TRIPLE * levelMultiplier; break;
      case 4: this.score += SCORES.TETRIS * levelMultiplier; break;
    }

    // Check for perfect clear (entire grid is empty)
    const isPerfectClear = this.grid.every(row => row.every(cell => cell === 0));
    if (isPerfectClear) {
      this.score += SCORES.PERFECT_CLEAR * levelMultiplier;
      // Show perfect clear message
      const perfectText = this.createBitmapText(GAME_WIDTH / 2 + BORDER_OFFSET, GAME_HEIGHT / 2, 'PERFECT CLEAR!', 12);
      perfectText.setOrigin(0.5);
      perfectText.setDepth(150);
      perfectText.setTint(0xFFD700); // Gold color

      // Animate the text
      this.tweens.add({
        targets: perfectText,
        scale: 1.5,
        alpha: 0,
        duration: 2000,
        ease: 'Power2',
        onComplete: () => perfectText.destroy()
      });

      // Play special sound
      SoundGenerator.playLevelUp();
    }

    // Check for level up
    const newLevel = Math.min(MAX_LEVEL, Math.floor(this.lines / CONFIG.LINES_PER_LEVEL) + 1);
    if (newLevel > this.level) {
      this.level = newLevel;
      this.dropInterval = LEVEL_SPEEDS[this.level - 1];
      SoundGenerator.playLevelUp();

      // Exciting level transition!
      this.showLevelTransition(newLevel);
    } else {
      this.updateUI();
      this.clearing = false;
      this.spawnPiece();
    }
  }



  showLevelTransition(newLevel) {
    // Keep game paused during transition
    this.clearing = true;

    // Black screen overlay
    const blackScreen = this.add.rectangle(GAME_WIDTH / 2 + BORDER_OFFSET, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000);
    blackScreen.setDepth(200);
    blackScreen.setAlpha(0);

    // Fade to black
    this.tweens.add({
      targets: blackScreen,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        // Pre-load the new level's palette and create preview blocks
        const backdropKey = `backdrop-${newLevel}`;
        const rawPalette = ColorExtractor.extractPalette(this, backdropKey);
        const newPalette = SpriteBlockRenderer.enhancePalette(rawPalette);

        // Level up text
        const levelText = this.createBitmapText(GAME_WIDTH / 2 + BORDER_OFFSET, 60, `LEVEL ${newLevel}`, 20);
        levelText.setOrigin(0.5);
        levelText.setDepth(201);
        levelText.setAlpha(0);

        // Subtitle - show level title
        const levelTitle = LEVEL_TITLES[newLevel] || 'Unknown';
        const subtitle = this.createBitmapText(GAME_WIDTH / 2 + BORDER_OFFSET, 85, levelTitle, 10);
        subtitle.setOrigin(0.5);
        subtitle.setDepth(201);
        subtitle.setAlpha(0);

        // Create preview blocks showing new level's style
        const previewBlocks = [];
        const startX = GAME_WIDTH / 2 + BORDER_OFFSET - 32; // Center 8 blocks (8*8 = 64px wide)
        const startY = 120;

        for (let i = 0; i < 7; i++) {
          const x = startX + i * 10;
          const y = startY;
          const blockKey = `preview-block-${i}`;

          // Create block texture with new level's palette
          SpriteBlockRenderer.createBlockTexture(this, newPalette, newLevel, blockKey, i);

          const block = this.add.sprite(x, y, blockKey).setOrigin(0, 0);
          block.setDepth(201);
          block.setAlpha(0);
          block.setScale(0.5);
          previewBlocks.push({ sprite: block, key: blockKey });
        }

        // Animate text and blocks in
        this.tweens.add({
          targets: [levelText, subtitle],
          alpha: 1,
          duration: 400,
          ease: 'Power2'
        });

        this.tweens.add({
          targets: previewBlocks.map(b => b.sprite),
          alpha: 1,
          scale: 1,
          duration: 500,
          delay: 200,
          ease: 'Back.easeOut',
          onComplete: () => {
            // Hold for a moment
            this.time.delayedCall(1200, () => {
              // Fade out text and preview blocks only (keep black screen)
              this.tweens.add({
                targets: [levelText, subtitle, ...previewBlocks.map(b => b.sprite)],
                alpha: 0,
                duration: 300,
                onComplete: () => {
                  // Clean up text and preview blocks
                  levelText.destroy();
                  subtitle.destroy();
                  previewBlocks.forEach(b => {
                    b.sprite.destroy();
                    if (this.textures.exists(b.key)) {
                      this.textures.remove(b.key);
                    }
                  });

                  // Black screen stays for a moment
                  this.time.delayedCall(300, () => {
                    // Destroy old level elements while screen is black
                    this.blockSprites.forEach(sprite => sprite.destroy());
                    this.blockSprites = [];
                    this.ghostSprites.forEach(sprite => sprite.destroy());
                    this.ghostSprites = [];

                    // Load new level (no intro yet)
                    this.loadLevel(newLevel, false);
                    this.updateUI();
                    this.clearing = false;
                    this.spawnPiece();

                    // IMMEDIATELY hide UI containers before fading out black screen
                    if (this.playAreaContainer) {
                      this.playAreaContainer.y = -GAME_HEIGHT;
                    }
                    if (this.uiPanelContainer) {
                      this.uiPanelContainer.y = -GAME_HEIGHT;
                    }
                    this.blockSprites.forEach(sprite => sprite.setVisible(false));
                    this.ghostSprites.forEach(sprite => sprite.setVisible(false));
                    this.inputEnabled = false;

                    // Fade out black screen to reveal ONLY the backdrop
                    this.tweens.add({
                      targets: blackScreen,
                      alpha: 0,
                      duration: 500,
                      ease: 'Power2',
                      onComplete: () => {
                        blackScreen.destroy();
                        // Now show the intro animation (UI falls in)
                        // Wait 1 second showing just the backdrop
                        this.time.delayedCall(1000, () => {
                          // Play woosh sound
                          SoundGenerator.playWoosh();

                          // Animate play area falling in
                          if (this.playAreaContainer) {
                            this.tweens.add({
                              targets: this.playAreaContainer,
                              y: 0,
                              duration: 600,
                              ease: 'Bounce.easeOut'
                            });
                          }

                          // Animate UI panel falling in (slightly delayed)
                          if (this.uiPanelContainer) {
                            this.tweens.add({
                              targets: this.uiPanelContainer,
                              y: 0,
                              duration: 600,
                              delay: 100,
                              ease: 'Bounce.easeOut',
                              onComplete: () => {
                                // Show blocks and re-enable input after animations complete
                                this.blockSprites.forEach(sprite => sprite.setVisible(true));
                                this.ghostSprites.forEach(sprite => sprite.setVisible(true));
                                this.inputEnabled = true;
                              }
                            });
                          }
                        });
                      }
                    });
                  });
                }
              });
            });
          }
        });
      }
    });
  }

  redrawGrid() {
    this.blockSprites.forEach(sprite => sprite.destroy());
    this.blockSprites = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (this.grid[y][x]) {
          const blockType = this.grid[y][x];
          const sprite = this.add.sprite(PLAY_AREA_X + x * BLOCK_SIZE, PLAY_AREA_Y + y * BLOCK_SIZE, `block-${blockType}`).setOrigin(0, 0);
          sprite.setDepth(2);
          this.blockSprites.push(sprite);
        }
      }
    }
  }

  renderPiece() {
    this.blockSprites.forEach(sprite => { if (sprite.getData('current')) sprite.destroy(); });
    this.blockSprites = this.blockSprites.filter(s => !s.getData('current'));
    this.ghostSprites.forEach(sprite => sprite.destroy());
    this.ghostSprites = [];
    if (!this.currentPiece) return;
    if (this.level === 1) {
      let ghostY = this.currentY;
      while (!this.checkCollision(this.currentPiece, this.currentX, ghostY + 1)) ghostY++;
      const shape = this.currentPiece.shape;
      for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
          if (shape[row][col]) {
            const x = PLAY_AREA_X + (this.currentX + col) * BLOCK_SIZE;
            const y = PLAY_AREA_Y + (ghostY + row) * BLOCK_SIZE;
            const sprite = this.add.sprite(x, y, `block-${this.currentPiece.name}`).setOrigin(0, 0);
            sprite.setAlpha(0.3);
            sprite.setDepth(1);
            this.ghostSprites.push(sprite);
          }
        }
      }
    }
    const shape = this.currentPiece.shape;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const x = PLAY_AREA_X + (this.currentX + col) * BLOCK_SIZE;
          const y = PLAY_AREA_Y + (this.currentY + row) * BLOCK_SIZE;
          const sprite = this.add.sprite(x, y, `block-${this.currentPiece.name}`).setOrigin(0, 0);
          sprite.setData('current', true);
          sprite.setDepth(2);
          this.blockSprites.push(sprite);
        }
      }
    }
  }

  updateNextPieceDisplay() {
    if (this.nextPieceSprites) this.nextPieceSprites.forEach(sprite => sprite.destroy());
    this.nextPieceSprites = [];
    if (!this.nextPiece) return;
    const shape = this.nextPiece.shape;
    const startX = this.nextPieceX;
    const startY = this.nextPieceY;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const x = startX + col * BLOCK_SIZE;
          const y = startY + row * BLOCK_SIZE;
          const sprite = this.add.sprite(x, y, `block-${this.nextPiece.name}`).setOrigin(0, 0);
          sprite.setDepth(20);
          this.nextPieceSprites.push(sprite);
          // Add to UI container so it animates with the panel
          if (this.uiPanelContainer) {
            this.uiPanelContainer.add(sprite);
          }
        }
      }
    }
  }

  updateUI() {
    const scoreStr = this.score.toString().padStart(6, '0');
    this.scoreText.setText(scoreStr);
    this.levelText.setText(this.level.toString());
    this.linesText.setText(this.lines.toString());
  }

  handleGameOver() {
    if (this.currentMusic) this.currentMusic.stop();
    SoundGenerator.playGameOver();

    // Display game over image (256x224, fills the game area)
    const gameOverImage = this.add.image(BORDER_OFFSET, 0, 'game-over');
    gameOverImage.setOrigin(0, 0);
    gameOverImage.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    gameOverImage.setDepth(100);
    gameOverImage.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.start('PreloadScene');
    });
  }
}
