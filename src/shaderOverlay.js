// This creates a WebGL canvas overlay that applies the Trinitron shader to the final scaled output

const vertexShaderSource = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const fragmentShaderSource = `
precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

varying vec2 v_texCoord;

#define PI 3.14159265359

void main() {
  vec2 uv = v_texCoord;

  // CRT curvature - subtle but noticeable
  vec2 centered = uv - 0.5;
  float curvature = 0.06; // Curvature amount (reduced by half from 0.12)

  // Apply barrel distortion
  float r2 = centered.x * centered.x + centered.y * centered.y;
  float distortion = 1.0 + curvature * r2;
  vec2 curvedUV = centered * distortion + 0.5;

  // Check if we're outside the original screen bounds (black borders)
  if (curvedUV.x < 0.0 || curvedUV.x > 1.0 || curvedUV.y < 0.0 || curvedUV.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 color = texture2D(u_texture, curvedUV).rgb;

  // 480i scanline effect - simulating classic CRT TV
  float scanline = gl_FragCoord.y;

  // Calculate scanline width to achieve ~480 scanlines for current resolution
  // For 556px height, we want 480 scanlines: 556/480 ≈ 1.16 pixels per scanline
  float scanlineWidth = 2.0;
  float scanlineIntensity = 0.7; // How dark the scanlines are
  float scanlineMod = mod(scanline, scanlineWidth);

  // Make scanline darker for half the pixels
  float scanlineFactor = 1.0;
  if (scanlineMod < 1.0) {
    scanlineFactor = 1.0 - scanlineIntensity;
  }

  // Apply scanlines
  color *= scanlineFactor;

  // Slight bloom/glow on bright areas (CRT phosphor persistence)
  float brightness = (color.r + color.g + color.b) / 3.0;
  color *= 1.0 + (brightness * 0.15);

  // Vignette (darker edges like a CRT tube)
  float vignette = 1.0 - dot(centered, centered) * 0.4;
  color *= vignette;

  // Slight color shift for CRT feel
  color.r *= 1.02;
  color.b *= 0.98;

  gl_FragColor = vec4(color, 1.0);
}
`;

export function createShaderOverlay(gameCanvas) {
  console.log('Creating shader overlay for canvas:', gameCanvas);

  // Create overlay canvas
  const overlay = document.createElement('canvas');
  overlay.style.position = 'absolute';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '1000';

  // Position it over the game canvas
  const updateOverlayPosition = () => {
    const rect = gameCanvas.getBoundingClientRect();
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.width = rect.width;
    overlay.height = rect.height;
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  };

  document.body.appendChild(overlay);
  updateOverlayPosition();

  // Update on resize
  window.addEventListener('resize', updateOverlayPosition);

  const gl = overlay.getContext('webgl') || overlay.getContext('experimental-webgl');
  if (!gl) {
    console.error('WebGL not supported');
    return null;
  }

  console.log('WebGL context created, overlay size:', overlay.width, 'x', overlay.height);

  // Compile shaders
  function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return null;
  }

  gl.useProgram(program);

  // Set up geometry (flip Y coordinate for texture)
  const positions = new Float32Array([
    -1, -1,  0, 1,
     1, -1,  1, 1,
    -1,  1,  0, 0,
     1,  1,  1, 0
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, 'a_position');
  const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');

  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0);

  gl.enableVertexAttribArray(texCoordLoc);
  gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8);

  // Create texture from game canvas
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
  const timeLoc = gl.getUniformLocation(program, 'u_time');

  // Render loop
  function render() {
    updateOverlayPosition();

    // Copy game canvas to texture
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gameCanvas);

    // Set uniforms
    gl.uniform2f(resolutionLoc, overlay.width, overlay.height);
    gl.uniform1f(timeLoc, performance.now() / 1000);

    // Draw
    gl.viewport(0, 0, overlay.width, overlay.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
  }

  render();

  return overlay;
}

