precision mediump float;

// Texture and coordinates
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;

// Uniforms for shader parameters
uniform vec2 resolution;
uniform float time;

#define PI 3.14159265359

// --- Noise Helper Function (Permutation) ---
vec4 permute(vec4 t) {
  return mod(((t * 34.0) + 1.0) * t, 289.0);
}

// --- 3D Noise Function ---
float noise3d(vec3 p) {
  vec3 a = floor(p);
  vec3 d = p - a;
  d = d * d * (3.0 - 2.0 * d);

  vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
  vec4 k1 = permute(b.xyxy);
  vec4 k2 = permute(k1.xyxy + b.zzww);

  vec4 c = k2 + a.zzzz;
  vec4 k3 = permute(c);
  vec4 k4 = permute(c + 1.0);

  vec4 o1 = fract(k3 * (1.0 / 41.0));
  vec4 o2 = fract(k4 * (1.0 / 41.0));

  vec4 o3_interp_z = o2 * d.z + o1 * (1.0 - d.z);
  vec2 o4_interp_xy = o3_interp_z.yw * d.x + o3_interp_z.xz * (1.0 - d.x);

  return o4_interp_xy.y * d.y + o4_interp_xy.x * (1.0 - d.y);
}

void main() {
  // --- Configuration Parameters ---
  float brightness = 2.5;
  float red_balance = 1.0;
  float green_balance = 0.85;
  float blue_balance = 1.0;

  // Custom settings as requested
  float phosphorWidth = 2.50;
  float phosphorHeight = 4.50;
  float internalHorizontalGap = 1.0;
  float columnGap = 0.2;
  float verticalCellGap = 0.2;
  float phosphorPower = 0.9;

  float cell_noise_variation_amount = 0.025;
  float cell_noise_scale_xy = 240.0;
  float cell_noise_speed = 24.0;
  float curvature_amount = 0.0; // Set to 0 as requested

  // --- Apply Curvature Distortion ---
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = outTexCoord;
  vec2 centered_uv_output = uv - 0.5;
  float r = length(centered_uv_output);
  float distort_factor = 1.0 + curvature_amount * r * r;
  vec2 centered_uv_source = centered_uv_output * distort_factor;
  vec2 source_uv = centered_uv_source + 0.5;
  vec2 fragCoord_warped = source_uv * resolution;

  // --- Check if Warped Coordinate is on the "Flat Screen" ---
  bool is_on_original_flat_screen = source_uv.x >= 0.0 && source_uv.x <= 1.0 &&
                                   source_uv.y >= 0.0 && source_uv.y <= 1.0;

  if (!is_on_original_flat_screen) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // --- Calculated Grid Dimensions ---
  float fullCellWidth = 3.0 * phosphorWidth + 3.0 * internalHorizontalGap + columnGap;
  float fullRowHeight = phosphorHeight + verticalCellGap;

  // --- Calculate Logical Grid Positions ---
  float logical_cell_index_x = floor(fragCoord_warped.x / fullCellWidth);
  float shift_y_offset = 0.0;
  
  if (mod(logical_cell_index_x, 2.0) != 0.0) {
    shift_y_offset = fullRowHeight / 2.0;
  }
  
  float effective_y_warped = fragCoord_warped.y + shift_y_offset;
  float logical_row_index = floor(effective_y_warped / fullRowHeight);

  float uv_cell_x = mod(fragCoord_warped.x, fullCellWidth);
  if (uv_cell_x < 0.0) {
    uv_cell_x += fullCellWidth;
  }
  
  float uv_row_y = mod(effective_y_warped, fullRowHeight);
  if (uv_row_y < 0.0) {
    uv_row_y += fullRowHeight;
  }

  // --- Video Sampling and Color Balancing ---
  vec3 video_color = texture2D(uMainSampler, source_uv).rgb;
  video_color.r *= red_balance;
  video_color.g *= green_balance;
  video_color.b *= blue_balance;

  // --- Determine if inside a Phosphor Area ---
  vec3 final_color = vec3(0.0);
  bool in_column_gap = uv_cell_x >= (3.0 * phosphorWidth + 3.0 * internalHorizontalGap);
  bool in_vertical_gap = uv_row_y >= phosphorHeight;

  if (!in_column_gap && !in_vertical_gap) {
    float uv_cell_x_within_block = uv_cell_x;
    vec3 phosphor_base_color = vec3(0.0);
    float video_component_intensity = 0.0;
    float current_phosphor_startX_in_block = -1.0;
    float current_x_tracker = 0.0;

    // Red phosphor area
    if (uv_cell_x_within_block >= current_x_tracker && uv_cell_x_within_block < current_x_tracker + phosphorWidth) {
      phosphor_base_color = vec3(1.0, 0.0, 0.0);
      video_component_intensity = video_color.r;
      current_phosphor_startX_in_block = current_x_tracker;
    }
    current_x_tracker += phosphorWidth + internalHorizontalGap;

    // Green phosphor area
    if (uv_cell_x_within_block >= current_x_tracker && uv_cell_x_within_block < current_x_tracker + phosphorWidth) {
      phosphor_base_color = vec3(0.0, 1.0, 0.0);
      video_component_intensity = video_color.g;
      current_phosphor_startX_in_block = current_x_tracker;
    }
    current_x_tracker += phosphorWidth + internalHorizontalGap;

    // Blue phosphor area
    if (uv_cell_x_within_block >= current_x_tracker && uv_cell_x_within_block < current_x_tracker + phosphorWidth) {
      phosphor_base_color = vec3(0.0, 0.0, 1.0);
      video_component_intensity = video_color.b;
      current_phosphor_startX_in_block = current_x_tracker;
    }

    if (current_phosphor_startX_in_block >= 0.0) {
      float x_in_phosphor = (uv_cell_x_within_block - current_phosphor_startX_in_block) / phosphorWidth;
      float horizontal_intensity_factor = pow(sin(x_in_phosphor * PI), phosphorPower);
      float y_in_phosphor_band = uv_row_y / phosphorHeight;
      float vertical_intensity_factor = (phosphorHeight > 0.0) ? pow(sin(y_in_phosphor_band * PI), phosphorPower) : 1.0;
      float total_intensity_factor = horizontal_intensity_factor * vertical_intensity_factor;
      final_color = phosphor_base_color * video_component_intensity * total_intensity_factor;
    }
  }

  // --- Apply Cell-Based RGB Analog Noise ---
  vec3 noise_pos = vec3(logical_cell_index_x * cell_noise_scale_xy,
                        logical_row_index * cell_noise_scale_xy,
                        time * cell_noise_speed);

  vec3 cell_noise_rgb;
  cell_noise_rgb.r = noise3d(noise_pos);
  cell_noise_rgb.g = noise3d(noise_pos + vec3(19.0, 0.0, 0.0));
  cell_noise_rgb.b = noise3d(noise_pos + vec3(0.0, 13.0, 0.0));
  cell_noise_rgb = cell_noise_rgb * 2.0 - 1.0;
  final_color += cell_noise_rgb * cell_noise_variation_amount;

  // --- Apply Overall Brightness and Effects ---
  final_color *= brightness;
  float edge_darken_strength = 0.1;
  float vignette_factor = 1.0 - dot(centered_uv_output, centered_uv_output) * edge_darken_strength * 2.0;
  vignette_factor = clamp(vignette_factor, 0.0, 1.0);
  final_color *= vignette_factor;

  // --- Output ---
  final_color = clamp(final_color, 0.0, 1.0);
  gl_FragColor = vec4(final_color, 1.0);
}

