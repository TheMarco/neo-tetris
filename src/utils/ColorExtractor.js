/**
 * Extracts dominant colors from an image to create a palette for Tetris blocks
 */
export default class ColorExtractor {
  /**
   * Extract 7 dominant colors from a texture
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {string} textureKey - The key of the loaded texture
   * @returns {number[]} Array of 7 color values in hex format
   */
  static extractPalette(scene, textureKey) {
    const texture = scene.textures.get(textureKey);
    const source = texture.getSourceImage();
    
    // Create a temporary canvas to analyze the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = source.width;
    canvas.height = source.height;
    ctx.drawImage(source, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    
    // Sample pixels (every 4th pixel for performance)
    const colorMap = new Map();
    for (let i = 0; i < pixels.length; i += 16) { // RGBA, skip every 4 pixels
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      
      // Skip transparent pixels
      if (a < 128) continue;
      
      // Quantize colors to reduce similar shades
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      
      const colorKey = (qr << 16) | (qg << 8) | qb;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }
    
    // Sort colors by frequency
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    // Get top 7 colors, ensuring variety
    const palette = [];
    for (let i = 0; i < sortedColors.length && palette.length < 7; i++) {
      const color = sortedColors[i];

      // Ensure color is not too dark (visible on dark backgrounds)
      const r = (color >> 16) & 0xFF;
      const g = (color >> 8) & 0xFF;
      const b = color & 0xFF;
      const brightness = (r + g + b) / 3;

      if (brightness > 70) { // Skip dark colors - minimum brightness threshold
        palette.push(color);
      }
    }
    
    // Fill remaining slots with vibrant defaults if needed
    const defaultColors = [
      0x00F0F0, // Cyan
      0xF0F000, // Yellow
      0xA000F0, // Purple
      0x00F000, // Green
      0xF00000, // Red
      0x0000F0, // Blue
      0xF0A000  // Orange
    ];
    
    while (palette.length < 7) {
      palette.push(defaultColors[palette.length]);
    }
    
    return palette;
  }
}

