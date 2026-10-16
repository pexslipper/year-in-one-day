import '../three-setup.js';
import * as THREE from 'three';

const vertex = /* glsl */ `
  varying vec3 vColor;
  varying float vShade;
  varying float vDepth;
  void main() {
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    // Pieces catch the light as they tumble.
    vec3 n = normalize(normalMatrix * (mat3(instanceMatrix) * vec3(0.0, 0.0, 1.0)));
    vShade = 0.5 + 0.5 * abs(n.z);
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  uniform float uOpacity;
  uniform float uFar;
  varying vec3 vColor;
  varying float vShade;
  varying float vDepth;
  void main() {
    float a = uOpacity * smoothstep(uFar, uFar * 0.6, vDepth) * smoothstep(30.0, 200.0, vDepth);
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * vShade, a);
  }
`;

const PALETTE = ['#ff8fab', '#ffd27a', '#8fd3ff', '#9ef0c0', '#c6b3ff', '#fff6e6', '#ffb06a'];
const GRAVITY = 170;
const FALL_SPEED = 95; // paper flutters down slowly once it has slowed

/** Paper confetti: a fixed pool of small tumbling pieces, drawn in one call. */
export class Confetti {
  constructor({ count = 900, far = 2600, calm = false } = {}) {
    this.count = count;
    // The calm version falls slower and tumbles less.
    this.fallSpeed = FALL_SPEED * (calm ? 0.6 : 1);
    this.spinScale = calm ? 0.45 : 1;
    this.cursor = 0;
    this.live = 0;
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.axis = new Float32Array(count * 3);
    this.angle = new Float32Array(count);
    this.spin = new Float32Array(count);
    this.size = new Float32Array(count);
    this.seed = new Float32Array(count);
    this.alive = new Uint8Array(count);

    this.uniforms = { uOpacity: { value: 1 }, uFar: { value: far } };
    this.mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1.6),
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      count,
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;

    const color = new THREE.Color();
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < count; i++) {
      this.mesh.setMatrixAt(i, hidden);
      this.mesh.setColorAt(i, color.set(PALETTE[i % PALETTE.length]));
    }

    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.v = new THREE.Vector3();
    this.s = new THREE.Vector3();
    this.a = new THREE.Vector3();
  }

  get active() {
    return this.live > 0;
  }

  spawn(x, y, z, vx, vy, vz) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    if (!this.alive[i]) this.live++;
    this.alive[i] = 1;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    const ax = Math.random() - 0.5;
    const ay = Math.random() - 0.5;
    const az = Math.random() - 0.5;
    const len = Math.hypot(ax, ay, az) || 1;
    this.axis.set([ax / len, ay / len, az / len], i * 3);
    this.angle[i] = Math.random() * Math.PI * 2;
    this.spin[i] = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 5) * this.spinScale;
    this.size[i] = 13 + Math.random() * 11;
    this.seed[i] = Math.random() * 100;
  }

  /** Confetti drifting down from above, over an area around `center`. */
  rain(center, n, width, depth) {
    for (let k = 0; k < n; k++) {
      this.spawn(
        center.x + (Math.random() - 0.5) * width,
        center.y + Math.random() * 120,
        center.z + (Math.random() - 0.5) * depth,
        (Math.random() - 0.5) * 30,
        -this.fallSpeed * (0.6 + Math.random() * 0.5),
        (Math.random() - 0.5) * 30,
      );
    }
  }

  /** A party-popper burst thrown up from `origin`. */
  pop(origin, n = 140) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const out = 80 + Math.random() * 220;
      this.spawn(origin.x, origin.y, origin.z, Math.cos(a) * out, 260 + Math.random() * 260, Math.sin(a) * out * 0.6);
    }
  }

  update(dt, time, floor) {
    if (!this.live) return;
    const drag = Math.exp(-1.4 * dt);
    let live = 0;
    for (let i = 0; i < this.count; i++) {
      if (!this.alive[i]) continue;
      const j = i * 3;
      this.vel[j] *= drag;
      this.vel[j + 2] *= drag;
      // Fall, but no faster than paper does, with a little side-to-side sway.
      this.vel[j + 1] = Math.max(this.vel[j + 1] - GRAVITY * dt, -this.fallSpeed);
      const sway = Math.sin(time * 2.2 + this.seed[i]) * 26;
      this.pos[j] += (this.vel[j] + sway) * dt;
      this.pos[j + 1] += this.vel[j + 1] * dt;
      this.pos[j + 2] += this.vel[j + 2] * dt;
      this.angle[i] += this.spin[i] * dt;

      if (this.pos[j + 1] < floor) {
        this.alive[i] = 0;
        this.mesh.setMatrixAt(i, this.m4.makeScale(0, 0, 0));
        continue;
      }
      live++;
      this.a.set(this.axis[j], this.axis[j + 1], this.axis[j + 2]);
      this.q.setFromAxisAngle(this.a, this.angle[i]);
      this.v.set(this.pos[j], this.pos[j + 1], this.pos[j + 2]);
      this.s.setScalar(this.size[i]);
      this.mesh.setMatrixAt(i, this.m4.compose(this.v, this.q, this.s));
    }
    this.live = live;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
