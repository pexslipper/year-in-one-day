import '../three-setup.js';
import * as THREE from 'three';

const vertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute float aSize;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aAlpha <= 0.0 ? 0.0 : aSize * uPixelRatio * (600.0 / max(-mv.z, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

const PALETTE = ['#ffd27a', '#ff8fab', '#8fd3ff', '#c6b3ff', '#fff6e6', '#9ef0c0', '#ffb06a'].map((c) => new THREE.Color(c));
const GRAVITY = 70;

/**
 * Rockets that rise, burst into sparks and fall. All particles live in one
 * fixed-size pool that is reused, so there's no garbage while it runs.
 */
export class Fireworks {
  constructor({ max = 2600 } = {}) {
    this.max = max;
    this.cursor = 0;
    this.alive = 0;
    this.rockets = [];

    this.position = new Float32Array(max * 3);
    this.color = new Float32Array(max * 3);
    this.alpha = new Float32Array(max);
    this.size = new Float32Array(max);
    this.velocity = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.decay = new Float32Array(max);

    const g = new THREE.BufferGeometry();
    const attr = (array, n) => new THREE.BufferAttribute(array, n).setUsage(THREE.DynamicDrawUsage);
    this.attributes = {
      position: attr(this.position, 3),
      aColor: attr(this.color, 3),
      aAlpha: attr(this.alpha, 1),
      aSize: attr(this.size, 1),
    };
    for (const [name, a] of Object.entries(this.attributes)) g.setAttribute(name, a);

    this.uniforms = { uPixelRatio: { value: 1 } };
    this.points = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
  }

  setPixelRatio(dpr) {
    this.uniforms.uPixelRatio.value = dpr;
  }

  get active() {
    return this.rockets.length > 0 || this.alive > 0;
  }

  spawn(x, y, z, vx, vy, vz, color, size, decay) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    if (this.life[i] <= 0) this.alive++;
    this.position.set([x, y, z], i * 3);
    this.velocity.set([vx, vy, vz], i * 3);
    this.color.set([color.r, color.g, color.b], i * 3);
    this.size[i] = size;
    this.life[i] = 1;
    this.decay[i] = decay;
    this.alpha[i] = 1;
  }

  /** Send up a rocket from `from` that bursts at about `apexY`. */
  launch(from, apexY, color = PALETTE[Math.floor(Math.random() * PALETTE.length)]) {
    const rise = Math.max(apexY - from.y, 100);
    const vy = Math.sqrt(2 * GRAVITY * 3.2 * rise); // fast enough to reach the apex
    this.rockets.push({
      p: from.clone(),
      v: new THREE.Vector3((Math.random() - 0.5) * 60, vy, 0),
      apexY,
      color,
      trail: 0,
    });
  }

  burst(p, color, count = 190) {
    const speed = 280 + Math.random() * 120;
    const white = new THREE.Color('#ffffff');
    const tint = new THREE.Color();
    const ring = Math.random() < 0.25; // some bursts are flat rings instead of spheres
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      let dx = s * Math.cos(a);
      let dy = ring ? Math.sin(a) : u;
      let dz = ring ? 0 : s * Math.sin(a);
      if (ring) dx = Math.cos(a);
      const k = speed * (0.82 + Math.random() * 0.18);
      tint.copy(color).lerp(white, Math.random() * 0.35);
      this.spawn(p.x, p.y, p.z, dx * k, dy * k, dz * k, tint, 15 + Math.random() * 9, 0.5 + Math.random() * 0.3);
    }
    // A bright flash at the centre.
    this.spawn(p.x, p.y, p.z, 0, 0, 0, white, 140, 3.5);
  }

  update(dt) {
    // Rockets climb, leave a short trail and burst near the top.
    for (let r = this.rockets.length - 1; r >= 0; r--) {
      const rk = this.rockets[r];
      rk.v.y -= GRAVITY * 3.2 * dt;
      rk.p.addScaledVector(rk.v, dt);
      rk.trail -= dt;
      if (rk.trail <= 0) {
        rk.trail = 0.016;
        this.spawn(rk.p.x, rk.p.y, rk.p.z, (Math.random() - 0.5) * 12, -20, 0, rk.color, 10, 2.4);
      }
      if (rk.v.y <= 40 || rk.p.y >= rk.apexY) {
        this.burst(rk.p, rk.color);
        this.rockets.splice(r, 1);
      }
    }

    if (this.alive > 0) {
      const drag = Math.exp(-1.7 * dt);
      let alive = 0;
      for (let i = 0; i < this.max; i++) {
        if (this.life[i] <= 0) continue;
        const j = i * 3;
        this.velocity[j] *= drag;
        this.velocity[j + 1] = this.velocity[j + 1] * drag - GRAVITY * dt;
        this.velocity[j + 2] *= drag;
        this.position[j] += this.velocity[j] * dt;
        this.position[j + 1] += this.velocity[j + 1] * dt;
        this.position[j + 2] += this.velocity[j + 2] * dt;
        this.life[i] -= this.decay[i] * dt;
        if (this.life[i] <= 0) {
          this.life[i] = 0;
          this.alpha[i] = 0;
        } else {
          // Sparks twinkle a little as they fade.
          this.alpha[i] = Math.pow(this.life[i], 1.6) * (this.life[i] < 0.5 ? 0.6 + Math.random() * 0.4 : 1);
          alive++;
        }
      }
      this.alive = alive;
    }

    for (const a of Object.values(this.attributes)) a.needsUpdate = true;
  }
}
