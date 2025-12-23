/**
 * Generate simple sound effects using Web Audio API
 */
export default class SoundGenerator {
  /**
   * Play a simple beep sound
   * @param {number} frequency - Frequency in Hz
   * @param {number} duration - Duration in seconds
   * @param {number} volume - Volume (0-1)
   */
  static getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  }

  static playBeep(frequency, duration, volume = 0.3) {
    try {
      const audioContext = this.getAudioContext();

      // Create oscillator
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'square'; // Retro square wave sound

      // Envelope
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  static playMove() {
    this.playBeep(200, 0.05, 0.2);
  }

  static playRotate() {
    this.playBeep(300, 0.08, 0.25);
  }

  static playDrop() {
    this.playBeep(150, 0.15, 0.3);
  }

  static playLineClear(lineCount = 1) {
    // Noisy 8-bit explosion
    this.playNoisyExplosion();

    // Add bonus sounds for multiple lines
    if (lineCount === 2) {
      setTimeout(() => this.playBeep(600, 0.15, 0.25), 100);
      setTimeout(() => this.playBeep(800, 0.15, 0.25), 200);
    } else if (lineCount === 3) {
      setTimeout(() => this.playBeep(700, 0.12, 0.25), 100);
      setTimeout(() => this.playBeep(900, 0.12, 0.25), 180);
      setTimeout(() => this.playBeep(1100, 0.15, 0.25), 260);
    } else if (lineCount >= 4) {
      // Tetris! Extra exciting
      setTimeout(() => this.playBeep(800, 0.1, 0.3), 100);
      setTimeout(() => this.playBeep(1000, 0.1, 0.3), 180);
      setTimeout(() => this.playBeep(1200, 0.1, 0.3), 260);
      setTimeout(() => this.playBeep(1400, 0.2, 0.3), 340);
    }
  }

  static playNoisyExplosion() {
    try {
      const audioContext = this.getAudioContext();

      // Create white noise
      const bufferSize = audioContext.sampleRate * 0.5;
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }

      const noise = audioContext.createBufferSource();
      noise.buffer = noiseBuffer;

      // Filter the noise
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, audioContext.currentTime);
      filter.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.5);

      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);

      noise.start(audioContext.currentTime);
      noise.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  static playSoftDrop() {
    this.playBeep(120, 0.04, 0.15);
  }

  static playTetris() {
    // Exciting sound for 4-line clear
    this.playBeep(500, 0.1, 0.35);
    setTimeout(() => this.playBeep(600, 0.1, 0.35), 60);
    setTimeout(() => this.playBeep(700, 0.1, 0.35), 120);
    setTimeout(() => this.playBeep(800, 0.2, 0.35), 180);
  }

  static playLevelUp() {
    // Ascending tone
    this.playBeep(400, 0.1, 0.3);
    setTimeout(() => this.playBeep(500, 0.1, 0.3), 80);
    setTimeout(() => this.playBeep(600, 0.1, 0.3), 160);
    setTimeout(() => this.playBeep(700, 0.2, 0.3), 240);
  }

  static playGameOver() {
    // Descending tone
    this.playBeep(400, 0.15, 0.3);
    setTimeout(() => this.playBeep(300, 0.15, 0.3), 120);
    setTimeout(() => this.playBeep(200, 0.15, 0.3), 240);
    setTimeout(() => this.playBeep(100, 0.3, 0.3), 360);
  }

  static playWoosh() {
    try {
      const audioContext = this.getAudioContext();

      // Create white noise for woosh effect
      const bufferSize = audioContext.sampleRate * 0.4;
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }

      const noise = audioContext.createBufferSource();
      noise.buffer = noiseBuffer;

      // High-pass filter for airy woosh sound
      const filter = audioContext.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, audioContext.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.4);

      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);

      noise.start(audioContext.currentTime);
      noise.stop(audioContext.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }
}


