import { BLOCK_SIZE } from '../constants.js';

/**
 * Renders Tetris blocks using sprite sheet with color palettes from backdrops
 */
export default class SpriteBlockRenderer {
  /**
   * Create a block texture from sprite sheet with palette colors
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {number[]} colorPalette - Array of 7 colors extracted from backdrop
   * @param {number} level - Current level (1-10) determines which sprite to use
   * @param {string} key - Texture key to create
   * @param {number} colorIndex - Which color from palette to use (0-6)
   */
  static createBlockTexture(scene, colorPalette, level, key, colorIndex) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    canvas.width = BLOCK_SIZE;
    canvas.height = BLOCK_SIZE;

    // Get the color to use
    const color = colorPalette[colorIndex % colorPalette.length];
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;

    // Get the sprite sheet and extract pattern
    const spriteSheet = scene.textures.get('blocks-spritesheet').getSourceImage();
    const spriteX = (level - 1) * BLOCK_SIZE;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.imageSmoothingEnabled = false;
    tempCanvas.width = spriteSheet.width;
    tempCanvas.height = spriteSheet.height;
    tempCtx.drawImage(spriteSheet, 0, 0);

    const spriteData = tempCtx.getImageData(spriteX, 0, BLOCK_SIZE, BLOCK_SIZE);
    const pixels = spriteData.data;

    // Create output image data
    const outputData = ctx.createImageData(BLOCK_SIZE, BLOCK_SIZE);
    const output = outputData.data;

    // Colorize: use grayscale brightness to modulate the base color
    // Grayscale values create depth (lighter/darker variations)
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];

      if (alpha > 0) {
        // Get grayscale brightness (0-255)
        const brightness = pixels[i]; // R channel (grayscale, so R=G=B)

        // Normalize brightness to a multiplier (0.5 to 1.5)
        // 128 (50% gray) = 1.0x (base color)
        // 0 (black) = 0.5x (darkest)
        // 255 (white) = 1.5x (lightest)
        const multiplier = 0.5 + (brightness / 255) * 1.0;

        // Apply brightness multiplier to base color
        output[i] = Math.min(255, Math.floor(r * multiplier));
        output[i + 1] = Math.min(255, Math.floor(g * multiplier));
        output[i + 2] = Math.min(255, Math.floor(b * multiplier));
        output[i + 3] = 255;
      } else {
        // Transparent pixel
        output[i] = 0;
        output[i + 1] = 0;
        output[i + 2] = 0;
        output[i + 3] = 0;
      }
    }

    ctx.putImageData(outputData, 0, 0);

    // Create texture and set nearest neighbor
    const texture = scene.textures.addCanvas(key, canvas);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  /**
   * Ensure colors are bright and distinct
   * @param {number[]} palette - Original palette from backdrop
   * @returns {number[]} Enhanced palette with bright, distinct colors
   */
  static enhancePalette(palette) {
    const enhanced = [];
    
    for (let i = 0; i < palette.length; i++) {
      let color = palette[i];
      let r = (color >> 16) & 0xFF;
      let g = (color >> 8) & 0xFF;
      let b = color & 0xFF;
      
      // Calculate brightness
      const brightness = (r + g + b) / 3;
      
      // If too dark, brighten it
      if (brightness < 100) {
        const boost = (100 - brightness) / brightness;
        r = Math.min(255, Math.floor(r * (1 + boost)));
        g = Math.min(255, Math.floor(g * (1 + boost)));
        b = Math.min(255, Math.floor(b * (1 + boost)));
      }
      
      // Ensure minimum saturation for visibility
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      
      if (saturation < 0.3) {
        // Boost the dominant channel
        if (r >= g && r >= b) r = Math.min(255, r + 50);
        else if (g >= r && g >= b) g = Math.min(255, g + 50);
        else b = Math.min(255, b + 50);
      }
      
      enhanced.push((r << 16) | (g << 8) | b);
    }
    
    // Ensure all colors are sufficiently different
    return this.ensureDistinctColors(enhanced);
  }

  /**
   * Ensure colors in palette are distinct from each other
   * @param {number[]} palette - Color palette
   * @returns {number[]} Palette with distinct colors
   */
  static ensureDistinctColors(palette) {
    const result = [palette[0]];
    
    for (let i = 1; i < palette.length; i++) {
      let color = palette[i];
      let attempts = 0;
      
      // Check if too similar to existing colors
      while (attempts < 10) {
        let tooSimilar = false;
        
        for (let j = 0; j < result.length; j++) {
          if (this.colorDistance(color, result[j]) < 100) {
            tooSimilar = true;
            break;
          }
        }
        
        if (!tooSimilar) break;
        
        // Adjust color
        let r = (color >> 16) & 0xFF;
        let g = (color >> 8) & 0xFF;
        let b = color & 0xFF;
        
        r = (r + 60) % 256;
        g = (g + 40) % 256;
        b = (b + 80) % 256;
        
        color = (r << 16) | (g << 8) | b;
        attempts++;
      }
      
      result.push(color);
    }
    
    return result;
  }

  /**
   * Calculate color distance
   */
  static colorDistance(c1, c2) {
    const r1 = (c1 >> 16) & 0xFF;
    const g1 = (c1 >> 8) & 0xFF;
    const b1 = c1 & 0xFF;
    const r2 = (c2 >> 16) & 0xFF;
    const g2 = (c2 >> 8) & 0xFF;
    const b2 = c2 & 0xFF;
    
    return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
  }
}

