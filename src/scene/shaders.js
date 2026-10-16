/* All GLSL lives here so it is easy to find and tweak. */

// ---------------------------------------------------------------- Sky
export const skyVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

export const skyFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uSunColor;
  uniform vec2 uSunPos;
  uniform float uSunVisible;
  uniform float uStars;
  uniform float uTime;
  uniform float uAspect;
  uniform vec2 uOffset;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec2 uv = vUv + uOffset;

    // Vertical sky gradient, brightest a little above the bottom edge.
    float h = clamp((uv.y - 0.06) / 0.94, 0.0, 1.0);
    vec3 col = mix(uBottom, uTop, pow(h, 0.85));

    // Sun: a soft glow plus a disc.
    vec2 p = uv * 2.0 - 1.0;
    p.x *= uAspect;
    vec2 sun = vec2(uSunPos.x * uAspect, uSunPos.y);
    float d = length(p - sun);
    float glow = exp(-d * d * 2.2) * 0.45 * uSunVisible;
    float disc = smoothstep(0.085, 0.078, d) * uSunVisible;
    col = mix(col, uSunColor, glow);
    col = mix(col, uSunColor, disc);

    // Stars: one possible star per grid cell, twinkling.
    vec2 g = uv * vec2(uAspect, 1.0) * 70.0;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float r = hash(id);
    vec2 o = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
    float star = step(0.982, r) * smoothstep(0.09, 0.0, length(f - o * 0.6));
    star *= 0.55 + 0.45 * sin(uTime * (1.0 + r * 2.0) + r * 60.0);
    col += star * uStars * smoothstep(0.15, 0.6, uv.y);

    // Tiny noise to stop gradient banding.
    col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ---------------------------------------------------------------- Items (images and videos)
export const itemVertex = /* glsl */ `
  uniform float uBend;
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;
    vec3 p = position;
    // Bow the plane while the camera moves, like paper caught in the wind.
    p.z += sin(uv.x * 3.14159265) * uBend;
    p.z += sin(uv.y * 3.14159265) * uBend * 0.35;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const itemFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uHover;
  uniform float uFar;
  uniform float uNear;
  uniform vec2 uCover;
  uniform float uChroma;
  uniform vec3 uKey;
  uniform float uSimilarity;
  uniform float uSmoothness;
  uniform float uSpill;
  varying vec2 vUv;
  varying float vDepth;

  // Colour difference that ignores brightness, so shadows on the green still key out.
  vec2 chromaUV(vec3 c) {
    return vec2(
      -0.169 * c.r - 0.331 * c.g + 0.500 * c.b,
       0.500 * c.r - 0.419 * c.g - 0.081 * c.b
    );
  }

  void main() {
    // Slight zoom inside the frame on hover.
    vec2 uv = (vUv - 0.5) * uCover * (1.0 - uHover * 0.06) + 0.5;
    vec4 tex = texture2D(uMap, uv);
    vec3 rgb = tex.rgb;
    float alpha = tex.a;

    if (uChroma > 0.5) {
      float mask = distance(chromaUV(rgb), chromaUV(uKey)) - uSimilarity;
      alpha *= pow(clamp(mask / uSmoothness, 0.0, 1.0), 1.5);
      // Pull green spill out of the edges that remain.
      float spill = pow(clamp(mask / uSpill, 0.0, 1.0), 1.5);
      float grey = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
      rgb = mix(vec3(grey), rgb, spill);
    }

    // Fade in from the distance, and out just before the camera passes.
    float fade = smoothstep(uFar, uFar * 0.6, vDepth) * smoothstep(uNear * 0.25, uNear, vDepth);
    alpha *= uOpacity * fade;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(rgb, alpha);
  }
`;

// ---------------------------------------------------------------- Text (month names and captions)
export const textVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const textFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uNear0;
  uniform float uNear1;
  uniform float uFar;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    float a = texture2D(uMap, vUv).a;
    float fade = smoothstep(uFar, uFar * 0.6, vDepth) * smoothstep(uNear0, uNear1, vDepth);
    a *= uOpacity * fade;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

// ---------------------------------------------------------------- Dust / stars drifting in the air
export const dustVertex = /* glsl */ `
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uTime;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.25 + aSeed * 40.0) * 8.0;
    p.x += cos(uTime * 0.2 + aSeed * 25.0) * 6.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float depth = -mv.z;
    gl_PointSize = uSize * uPixelRatio * (0.5 + aSeed) * (420.0 / max(depth, 1.0));
    vAlpha = smoothstep(2600.0, 1300.0, depth) * smoothstep(30.0, 220.0, depth);
    gl_Position = projectionMatrix * mv;
  }
`;

export const dustFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * vAlpha * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;
