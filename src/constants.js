// Game dimensions
export const GAME_WIDTH = 256;
export const GAME_HEIGHT = 224;

// Bitmap font character set
export const BITMAP_FONT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Grid configuration
export const BLOCK_SIZE = 8; // 8x8 pixel blocks for retro feel
export const GRID_WIDTH = 10;
export const GRID_HEIGHT = 20;
export const PLAY_AREA_WIDTH = GRID_WIDTH * BLOCK_SIZE; // 80 pixels
export const PLAY_AREA_HEIGHT = GRID_HEIGHT * BLOCK_SIZE; // 160 pixels
export const PLAY_AREA_X = 80; // Centered with room for UI
export const PLAY_AREA_Y = 28; // Room for header (moved up 20 pixels from original 48)

// Level progression
export const LINES_PER_LEVEL = 2; // Temporary for testing
export const MAX_LEVEL = 10;

// Tetromino shapes (NES Tetris style)
export const TETROMINOES = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: 0, // Will be replaced with palette color
    name: 'I'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: 1,
    name: 'O'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: 2,
    name: 'T'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: 3,
    name: 'S'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: 4,
    name: 'Z'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: 5,
    name: 'J'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: 6,
    name: 'L'
  }
};

// Advanced mode tetrominoes (includes all classic + new shapes)
export const ADVANCED_TETROMINOES = {
  ...TETROMINOES,
  // Small L (3 blocks) - top row
  SMALL_L: {
    shape: [
      [1, 1],
      [1, 0]
    ],
    color: 0,
    name: 'SMALL_L'
  },
  // Small L mirrored (3 blocks) - top row
  SMALL_L_MIRROR: {
    shape: [
      [1, 1],
      [0, 1]
    ],
    color: 1,
    name: 'SMALL_L_MIRROR'
  },
  // U shape (5 blocks) - middle left
  U: {
    shape: [
      [1, 0, 1],
      [1, 1, 1]
    ],
    color: 2,
    name: 'U'
  },
  // S shape (4 blocks) - middle right
  S_ADVANCED: {
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: 3,
    name: 'S_ADVANCED'
  },
  // 2x2 with extra piece (5 blocks) - bottom left
  BLOCK_PLUS: {
    shape: [
      [1, 1, 1],
      [1, 1, 0]
    ],
    color: 4,
    name: 'BLOCK_PLUS'
  },
  // T with top extended (5 blocks) - bottom right
  T_EXTENDED: {
    shape: [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0]
    ],
    color: 5,
    name: 'T_EXTENDED'
  }
};

// NES Tetris scoring
export const SCORES = {
  SINGLE: 40,
  DOUBLE: 100,
  TRIPLE: 300,
  TETRIS: 1200,
  SOFT_DROP: 1,
  PERFECT_CLEAR: 10000 // Bonus for clearing entire field
};

// Game speeds (frames per drop) - Higher = slower
// Smooth progression, gets hard at level 6+
export const LEVEL_SPEEDS = [
  90,  // Level 1 - relaxed start
  80,  // Level 2
  70,  // Level 3
  60,  // Level 4
  50,  // Level 5
  35,  // Level 6 - starts getting hard
  25,  // Level 7
  18,  // Level 8
  12,  // Level 9
  6    // Level 10 - very challenging
];

// UI Layout - single panel to the right of play area
export const UI = {
  // Panel positioned right of play area with 8px gap between frames
  PANEL_X: PLAY_AREA_X + PLAY_AREA_WIDTH + 16,
  PANEL_Y: PLAY_AREA_Y,
  PANEL_WIDTH: 64,
  PANEL_HEIGHT: PLAY_AREA_HEIGHT,
  PADDING: 6,
  LINE_HEIGHT: 20
};

