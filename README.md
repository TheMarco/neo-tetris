# 🎮 Retro Tetris

A stunning retro-styled Tetris game with authentic CRT TV aesthetics, dynamic backdrops, and procedurally generated music. Built with Phaser 3 and modern web technologies.

![Retro Tetris](public/assets/tv.png)

## ✨ Features

### 🖥️ Authentic CRT TV Experience
- **Realistic CRT Shader Effects**
  - Barrel distortion/curvature for authentic tube TV look
  - 480i-style scanlines
  - Subtle static noise with 4x4 pixel grains
  - Dynamic flicker effect with multiple frequencies
  - Phosphor glow on bright areas
  - Edge vignetting
- **Vintage TV Frame** - Game displayed inside a beautiful retro TV bezel
- **Pixel-Perfect Rendering** - Crisp 8x8 pixel blocks with nearest-neighbor filtering

### 🎨 Dynamic Visual System
- **10 Unique Level Backdrops** - Each level features a distinct hand-crafted backdrop
- **Adaptive Color Palette** - Block colors automatically extract and enhance from each level's backdrop for perfect visual harmony
- **Sprite-Based Blocks** - Detailed block rendering with depth and shading
- **Smooth Animations** - Crush animations, level transitions, and particle effects

### 🎵 Procedural Music System
- **10 Unique Tracks** - Each level has its own procedurally generated music
- **Dynamic Composition** - Music adapts to the level's visual theme
- **Retro Sound Effects** - Authentic 8-bit style sound generation

### 🎯 Two Game Modes
1. **Classic Mode** - Traditional Tetris with 7 standard pieces (I, O, T, S, Z, J, L)
2. **Advanced Mode** - Extended gameplay with additional unique pieces for extra challenge

### 🏆 Advanced Gameplay Features
- **Progressive Difficulty** - 10 levels with increasing speed
- **Combo System** - Chain multiple line clears for bonus points
- **Perfect Clear Bonus** - Extra points for clearing the entire board
- **T-Spin Detection** - Bonus points for advanced T-piece maneuvers
- **Hard Drop** - Instant piece placement with space bar
- **Ghost Piece** - Preview where your piece will land
- **Next Piece Preview** - Plan your strategy ahead
- **Pause Functionality** - Press P to pause/resume

### 📊 Scoring System
- Single line: 100 points × level
- Double lines: 300 points × level
- Triple lines: 500 points × level
- Tetris (4 lines): 800 points × level
- T-Spin: 400 points × level
- Combo multiplier: +50 points per combo × level
- Perfect Clear: 2000 points × level

### 🎮 Controls
- **Arrow Keys** - Move and rotate pieces
  - ← → : Move left/right
  - ↓ : Soft drop (faster descent)
  - ↑ : Rotate piece
- **Space Bar** - Hard drop (instant placement)
- **P** - Pause/Resume game
- **Mouse/Touch** - Navigate menus

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tetris
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 🛠️ Technical Details

### Technologies Used
- **Phaser 3** - Game framework
- **Vite** - Build tool and dev server
- **WebGL** - Hardware-accelerated rendering and custom shaders
- **Canvas API** - Backdrop generation and color extraction

### Architecture
- **Scene-Based Structure** - Modular game scenes (Preload, Mode Select, Game)
- **Custom Shaders** - GLSL fragment shaders for CRT effects
- **Color Extraction System** - Automatic palette generation from backdrop images
- **Sprite Rendering Pipeline** - Dynamic block colorization and rendering
- **Procedural Audio** - Real-time sound effect generation

### Performance
- 60 FPS target frame rate
- Optimized WebGL rendering
- Efficient sprite batching
- Minimal memory footprint

## 🎨 Customization

### Adding New Levels
1. Create a new backdrop image (256x224 pixels)
2. Place it in `public/assets/backdrops/level-X/backdrop.png`
3. Add corresponding music track in `public/assets/music/level-X/track.mp3`
4. Update `MAX_LEVEL` in `src/constants.js`

See `BACKDROP-GUIDE.md` for detailed instructions on creating backdrops.

### Adjusting CRT Effects
Edit `src/shaderOverlay.js` to customize:
- Curvature intensity
- Scanline density
- Static grain size and intensity
- Flicker frequency and amplitude
- Vignette strength

## 📁 Project Structure

```
tetris/
├── public/
│   └── assets/
│       ├── backdrops/      # Level backdrop images
│       ├── fonts/          # Bitmap fonts
│       ├── music/          # Level music tracks
│       ├── blocks-sprite.png
│       ├── game-over.png
│       ├── title.png
│       └── tv.png
├── src/
│   ├── scenes/
│   │   ├── PreloadScene.js
│   │   ├── ModeSelectScene.js
│   │   └── GameScene.js
│   ├── utils/
│   │   ├── ColorExtractor.js
│   │   ├── SpriteBlockRenderer.js
│   │   └── SoundGenerator.js
│   ├── constants.js
│   ├── main.js
│   └── shaderOverlay.js
├── index.html
└── package.json
```

## 🎯 Game Mechanics

### Piece Movement
- Pieces fall automatically based on level speed
- Wall kicks allow rotation near edges
- Floor kicks prevent unfair lockouts
- Smooth movement with keyboard repeat

### Level Progression
- Levels 1-10 with exponentially increasing speed
- New backdrop and music for each level
- Visual transition effects between levels
- Speed ranges from 1000ms (Level 1) to 100ms (Level 10)

### Line Clearing
- Standard Tetris line clear mechanics
- Animated crush effect for cleared lines
- Combo system rewards consecutive clears
- Perfect clear detection and bonus

## 🐛 Troubleshooting

See `TROUBLESHOOTING.md` for common issues and solutions.

## 📝 License

This project is open source and available under the MIT License.

## 👨‍💻 Credits

Created by Marco van Hylckama Vlieg
- Website: [ai-created.com](https://ai-created.com)
- Twitter/X: [@AIandDesign](https://x.com/AIandDesign)

## 🙏 Acknowledgments

- Phaser 3 framework and community
- Retro gaming aesthetics and CRT shader techniques
- Classic Tetris gameplay mechanics
