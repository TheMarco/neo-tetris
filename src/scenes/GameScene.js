import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, BLOCK_SIZE, GRID_WIDTH, GRID_HEIGHT,
  PLAY_AREA_X, PLAY_AREA_Y, PLAY_AREA_WIDTH, PLAY_AREA_HEIGHT,
  TETROMINOES, SCORES, LEVEL_SPEEDS, LINES_PER_LEVEL, MAX_LEVEL, UI
} from '../constants.js';
import ColorExtractor from '../utils/ColorExtractor.js';
import SpriteBlockRenderer from '../utils/SpriteBlockRenderer.js';
import SoundGenerator from '../utils/SoundGenerator.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  create() {
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
        this.focusWarning = this.add.text(GAME_WIDTH / 2, 10, 'CLICK TO FOCUS', {
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
    this.currentPiece = null; this.nextPiece = null;
    this.currentX = 0; this.currentY = 0;
    this.blockSprites = []; this.ghostSprites = [];
    this.loadLevel(this.level); this.setupInput(); this.createUI();
    this.spawnPiece(); this.nextPiece = this.getRandomPiece();
    this.updateNextPieceDisplay();
  }

  createEmptyGrid() {
    const grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) { grid[y] = []; for (let x = 0; x < GRID_WIDTH; x++) grid[y][x] = 0; }
    return grid;
  }

  loadLevel(level) {
    if (this.currentMusic) this.currentMusic.stop();
    const backdropKey = `backdrop-${level}`;
    if (this.backdrop) this.backdrop.destroy();
    this.backdrop = this.add.image(0, 0, backdropKey).setOrigin(0, 0);
    this.backdrop.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.backdrop.setDepth(-1);  // <-- ADD THIS LINE
    this.colorPalette = ColorExtractor.extractPalette(this, backdropKey);
    this.createBlockTextures();
    const musicKey = `music-${level}`;
    this.currentMusic = this.sound.add(musicKey, { loop: true, volume: 0.5 });
    this.currentMusic.play(); this.redrawGrid();
  }

  createBlockTextures() {
    const enhanced = SpriteBlockRenderer.enhancePalette(this.colorPalette);
    this.colorPalette = enhanced;
    Object.keys(TETROMINOES).forEach((key, i) => {
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
    const g = this.add.graphics();

    // Play area frame (frame draws around the play area)
    this.drawNESFrame(g, PLAY_AREA_X - 2, PLAY_AREA_Y - 2, PLAY_AREA_WIDTH + 5, PLAY_AREA_HEIGHT + 4);

    // UI text positions - align first frame with play area top
    const frameWidth = UI.PANEL_WIDTH - 3;
    const x = UI.PANEL_X + UI.PADDING;
    let y = PLAY_AREA_Y; // Align with play area top

    // SCORE frame
    this.drawNESFrame(g, UI.PANEL_X, y - 2, frameWidth, 26);
    this.createBitmapText(x, y + 2, 'SCORE');
    y += 12;
    this.scoreText = this.createBitmapText(x, y + 2, '000000');
    y += 12 + 12; // 12px vertical space

    // LEVEL frame
    this.drawNESFrame(g, UI.PANEL_X, y - 2, frameWidth, 26);
    this.createBitmapText(x, y + 2, 'LEVEL');
    y += 12;
    this.levelText = this.createBitmapText(x, y + 2, '1');
    y += 12 + 12; // 12px vertical space

    // LINES frame
    this.drawNESFrame(g, UI.PANEL_X, y - 2, frameWidth, 26);
    this.createBitmapText(x, y + 2, 'LINES');
    y += 12;
    this.linesText = this.createBitmapText(x, y + 2, '0');
    y += 12 + 12; // 12px vertical space

    // NEXT frame
    const nextFrameHeight = 42; // Enough for piece preview + 2px top padding
    this.drawNESFrame(g, UI.PANEL_X, y - 2, frameWidth, nextFrameHeight);
    this.createBitmapText(x, y + 2, 'NEXT');
    this.nextPieceY = y + 16;
    this.nextPieceX = x;
  }

  drawNESFrame(g, x, y, w, h) {
    g.fillStyle(0x000000, 1); g.fillRect(x, y, w, h);
    g.lineStyle(2, 0xAAAAAA, 1); g.strokeRect(x, y, w, h);
    g.lineStyle(1, 0x555555, 1); g.strokeRect(x + 2, y + 2, w - 4, h - 4);
    g.lineStyle(1, 0xFFFFFF, 1); g.beginPath(); g.moveTo(x + 1, y + h - 1); g.lineTo(x + 1, y + 1); g.lineTo(x + w - 1, y + 1); g.strokePath();
    g.lineStyle(1, 0x333333, 1); g.beginPath(); g.moveTo(x + w - 1, y + 1); g.lineTo(x + w - 1, y + h - 1); g.lineTo(x + 1, y + h - 1); g.strokePath();
  }

  getRandomPiece() {
    const keys = Object.keys(TETROMINOES);
    return JSON.parse(JSON.stringify(TETROMINOES[keys[Math.floor(Math.random() * keys.length)]]));
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
    if (this.gameOver) return;

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
      this.pauseOverlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8);
      this.pauseOverlay.setDepth(100);
      this.pauseText = this.createBitmapText(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'PAUSED');
      this.pauseText.setOrigin(0.5).setDepth(101);
      this.pauseHintText = this.createBitmapText(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 12, 'PRESS P');
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
    if (!this.checkCollision(rotated, this.currentX, this.currentY)) { this.currentPiece = rotated; SoundGenerator.playRotate(); }
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

    // Play sound
    if (completeLines.length === 4) SoundGenerator.playTetris();
    else SoundGenerator.playLineClear();

    // Show the locked piece first
    this.redrawGrid();

    // Run the line clear animation, then apply changes
    this.animateLineClear(completeLines);
  }

  animateLineClear(completeLines) {
    // Create spectacular crush effect for each block
    const crushSprites = [];
    const particles = [];

    completeLines.forEach(y => {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const px = PLAY_AREA_X + x * BLOCK_SIZE;
        const py = PLAY_AREA_Y + y * BLOCK_SIZE;

        // Main block that will get crushed
        const block = this.add.rectangle(px + BLOCK_SIZE/2, py + BLOCK_SIZE/2, BLOCK_SIZE, BLOCK_SIZE, 0xffffff);
        block.setDepth(50);
        crushSprites.push(block);

        // Create 4 particle pieces per block for explosion
        for (let i = 0; i < 4; i++) {
          const particle = this.add.rectangle(px + BLOCK_SIZE/2, py + BLOCK_SIZE/2, 2, 2, 0xffffff);
          particle.setDepth(51);
          particle.setVisible(false);
          particles.push({ sprite: particle, x: px + BLOCK_SIZE/2, y: py + BLOCK_SIZE/2 });
        }
      }
    });

    // Phase 1: Rapid flash
    this.tweens.add({
      targets: crushSprites,
      alpha: { from: 1, to: 0.5 },
      duration: 60,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        // Phase 2: Violent crush from top and bottom
        this.tweens.add({
          targets: crushSprites,
          scaleY: 0.05,
          scaleX: 2.0,
          alpha: 0.9,
          duration: 80,
          ease: 'Power3',
          onComplete: () => {
            // Phase 3: Horizontal crush to nothing
            this.tweens.add({
              targets: crushSprites,
              scaleX: 0,
              scaleY: 0.02,
              alpha: 0.5,
              duration: 60,
              ease: 'Power2',
              onComplete: () => {
                // Phase 4: Particle explosion
                particles.forEach(p => {
                  p.sprite.setVisible(true);
                  const angle = Math.random() * Math.PI * 2;
                  const speed = 20 + Math.random() * 30;
                  const vx = Math.cos(angle) * speed;
                  const vy = Math.sin(angle) * speed;

                  this.tweens.add({
                    targets: p.sprite,
                    x: p.x + vx,
                    y: p.y + vy,
                    alpha: 0,
                    scaleX: 0,
                    scaleY: 0,
                    duration: 200 + Math.random() * 100,
                    ease: 'Power2'
                  });
                });

                this.time.delayedCall(300, () => {
                  crushSprites.forEach(s => s.destroy());
                  particles.forEach(p => p.sprite.destroy());
                  this.finishLineClear(completeLines);
                });
              }
            });
          }
        });
      }
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

    // Check for level up
    const newLevel = Math.min(MAX_LEVEL, Math.floor(this.lines / LINES_PER_LEVEL) + 1);
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

    // Flash effect
    const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff);
    flash.setDepth(200);
    flash.setAlpha(0);

    // Level up text
    const levelText = this.createBitmapText(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, `LEVEL ${newLevel}`, 20);
    levelText.setOrigin(0.5);
    levelText.setDepth(201);
    levelText.setAlpha(0);

    // Subtitle
    const subtitle = this.createBitmapText(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15, 'SPEED UP', 10);
    subtitle.setOrigin(0.5);
    subtitle.setDepth(201);
    subtitle.setAlpha(0);

    // Animation sequence
    this.tweens.add({
      targets: flash,
      alpha: 0.8,
      duration: 100,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        // Show level text with zoom effect
        levelText.setScale(0.5);
        subtitle.setScale(0.5);

        this.tweens.add({
          targets: [levelText, subtitle],
          alpha: 1,
          scale: 1,
          duration: 200,
          ease: 'Back.easeOut',
          onComplete: () => {
            // Hold for a moment
            this.time.delayedCall(800, () => {
              // Fade out
              this.tweens.add({
                targets: [levelText, subtitle, flash],
                alpha: 0,
                duration: 200,
                onComplete: () => {
                  flash.destroy();
                  levelText.destroy();
                  subtitle.destroy();

                  // Load new level
                  this.loadLevel(newLevel);
                  this.updateUI();
                  this.clearing = false;
                  this.spawnPiece();
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

    // Black screen overlay
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000);
    overlay.setDepth(100);

    const gameOverText = this.createBitmapText(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'GAME OVER');
    gameOverText.setOrigin(0.5).setDepth(101);

    const restartText = this.createBitmapText(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 12, 'PRESS SPACE');
    restartText.setOrigin(0.5).setDepth(101);

    this.input.keyboard.once('keydown-SPACE', () => { this.scene.restart(); });
  }
}
