import '../three-setup.js';
import * as THREE from 'three';
import { makeCaption } from './text.js';
import { makeMedallion } from './placeholder.js';
import { itemVertex, itemFragment } from './shaders.js';
import { FAR } from './Item.js';
import { pickInk } from '../sky.js';
import { damp, seededRandom, smoothstep } from '../utils.js';

const NEAR = 260;
// Layout of the group, in its own units (it's scaled down on small screens):
// the cake sits at the bottom, its date card above, and the caption above that.
const CAKE_Y = -115; // cake centre; it spans about −225 to −5
const CARD_SIZE = 230;
const CARD_Y = 120; // card centre; the circle's radius is 0.44 × CARD_SIZE
const CAPTION_WIDTH = 600;
const COLORS = {
  plate: '#f1f2f7',
  base: '#f6b7c4',
  top: '#8fb9dc',
  frosting: '#fff4de',
  candles: ['#f3bd74', '#f1f2f7', '#e5845c', '#c6b3ff', '#9ef0c0'],
  sprinkles: ['#ff8fab', '#ffd27a', '#8fd3ff', '#9ef0c0', '#c6b3ff', '#ffffff'],
};
const TITLE_COLOR = new THREE.Color('#ffd27a');

function glowTexture(inner, outer) {
  const s = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = s;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(canvas);
}

function flameTexture() {
  const w = 64;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(w / 2, h * 0.68, 2, w / 2, h * 0.62, h * 0.5);
  g.addColorStop(0, '#fffbe8');
  g.addColorStop(0.35, '#ffd27a');
  g.addColorStop(0.75, 'rgba(255,140,60,0.6)');
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(w / 2, 4);
  ctx.bezierCurveTo(w * 0.95, h * 0.5, w * 0.9, h * 0.95, w / 2, h - 4);
  ctx.bezierCurveTo(w * 0.1, h * 0.95, w * 0.05, h * 0.5, w / 2, 4);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

/**
 * The birthday: a slowly turning cake with candles, and a title above it.
 * It behaves like any other item (hover, click to open, Previous/Next);
 * the fireworks around it are run by the Experience.
 */
export class Birthday {
  constructor({ data, monthIndex, indexInMonth, globalIndex, z }) {
    this.data = data;
    this.kind = 'birthday';
    this.monthIndex = monthIndex;
    this.indexInMonth = indexInMonth;
    this.globalIndex = globalIndex;
    this.z = z;
    this.isVideo = false;
    this.loaded = false;
    this.hover = 0;
    this.hoverTarget = 0;
    this.opacity = 1;
    this.near = NEAR;
    this.materials = [];
    this.flames = [];

    this.group = new THREE.Group();
    this.cake = new THREE.Group();
    this.cake.position.y = CAKE_Y;
    this.cake.rotation.x = 0.16; // tip the top toward the camera
    this.group.add(this.cake);
  }

  material(color) {
    const m = new THREE.MeshLambertMaterial({ color, transparent: true });
    this.materials.push(m);
    return m;
  }

  async load() {
    const rnd = seededRandom(2012);
    const add = (geometry, color, y, parent = this.cake) => {
      const mesh = new THREE.Mesh(geometry, this.material(color));
      mesh.position.y = y;
      parent.add(mesh);
      return mesh;
    };

    // The cake is built around its centre, from y = -110 (plate) to about +110 (flame tips).
    add(new THREE.CylinderGeometry(150, 140, 8, 48), COLORS.plate, -106);
    add(new THREE.CylinderGeometry(118, 118, 80, 48), COLORS.base, -62);
    add(new THREE.CylinderGeometry(78, 78, 60, 48), COLORS.top, 8);

    const frosting = (radius, y, drips) => {
      const ring = add(new THREE.TorusGeometry(radius, 9, 12, 64), COLORS.frosting, y);
      ring.rotation.x = Math.PI / 2;
      for (let i = 0; i < drips; i++) {
        const a = (i / drips) * Math.PI * 2 + rnd() * 0.2;
        const len = 8 + rnd() * 22;
        const drip = add(new THREE.CapsuleGeometry(6, len, 4, 8), COLORS.frosting, y - len / 2 - 2);
        drip.position.x = Math.cos(a) * (radius + 1);
        drip.position.z = Math.sin(a) * (radius + 1);
      }
      const lid = add(new THREE.CylinderGeometry(radius, radius, 3, 48), COLORS.frosting, y);
      lid.scale.y = 1;
    };
    frosting(116, -22, 20);
    frosting(76, 38, 14);

    // Sprinkles on the top tier.
    const sprinkleGeo = new THREE.CapsuleGeometry(2.2, 7, 2, 6);
    const sprinkles = new THREE.InstancedMesh(sprinkleGeo, this.material('#ffffff'), 60);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const color = new THREE.Color();
    for (let i = 0; i < 60; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 20 + rnd() * 48;
      q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, rnd() * Math.PI));
      m4.compose(new THREE.Vector3(Math.cos(a) * r, 41, Math.sin(a) * r), q, new THREE.Vector3(1, 1, 1));
      sprinkles.setMatrixAt(i, m4);
      sprinkles.setColorAt(i, color.set(COLORS.sprinkles[i % COLORS.sprinkles.length]));
    }
    this.cake.add(sprinkles);

    // Candles with flickering flames and a warm glow.
    const flameMap = flameTexture();
    const glowMap = glowTexture('rgba(255,214,140,0.9)', 'rgba(255,170,90,0.25)');
    const candleCount = 5;
    for (let i = 0; i < candleCount; i++) {
      const a = (i / candleCount) * Math.PI * 2 + 0.3;
      const x = Math.cos(a) * 44;
      const z = Math.sin(a) * 44;
      const candle = add(new THREE.CylinderGeometry(5, 5, 40, 12), COLORS.candles[i % COLORS.candles.length], 60);
      candle.position.x = x;
      candle.position.z = z;
      const wick = add(new THREE.CylinderGeometry(1, 1, 6, 6), '#3a2d3a', 83);
      wick.position.x = x;
      wick.position.z = z;

      const flame = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: flameMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      flame.position.set(x, 96, z);
      flame.scale.set(14, 28, 1);
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glowMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      glow.position.set(x, 94, z);
      glow.scale.set(70, 70, 1);
      this.cake.add(flame, glow);
      this.flames.push({ flame, glow, seed: rnd() * 10 });
    }
    this.textureList = [flameMap, glowMap];

    // Light just for the cake (the rest of the scene uses its own shaders).
    const hemi = new THREE.HemisphereLight('#e4e9ff', '#4a3a6a', 2.3);
    const sun = new THREE.DirectionalLight('#fff1d6', 2.2);
    sun.position.set(260, 420, 380);
    sun.target = this.group;
    this.group.add(hemi, sun);

    // A date card above the cake, drawn like the other special days.
    const cardColor = new THREE.Color(this.data.color || '#f6b7c4');
    const cardMap = new THREE.CanvasTexture(
      makeMedallion({
        day: parseInt(this.data.date, 10) || null,
        thai: this.data.thai,
        motif: this.data.motif || 'cake',
        color: `#${cardColor.getHexString()}`,
        ink: `#${pickInk(cardColor).getHexString()}`,
      }),
    );
    this.cardUniforms = {
      uMap: { value: cardMap },
      uOpacity: { value: 1 },
      uHover: { value: 0 },
      uBend: { value: 0 },
      uFar: { value: FAR },
      uNear: { value: NEAR },
      uCover: { value: new THREE.Vector2(1, 1) },
      uChroma: { value: 0 },
      uKey: { value: new THREE.Color('#00ff00') },
      uSimilarity: { value: 0 },
      uSmoothness: { value: 1 },
      uSpill: { value: 1 },
    };
    this.card = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 16, 16),
      new THREE.ShaderMaterial({
        vertexShader: itemVertex,
        fragmentShader: itemFragment,
        uniforms: this.cardUniforms,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.card.scale.set(CARD_SIZE, CARD_SIZE, 1);
    this.card.position.y = CARD_Y;
    this.group.add(this.card);

    // Its caption, in gold so the birthday stands apart from the holidays.
    const caption = makeCaption(this.data.date, this.data.title || 'Happy birthday', { align: 'center' });
    this.caption = caption.mesh;
    this.caption.material.uniforms.uColor.value.copy(TITLE_COLOR);
    const capH = CAPTION_WIDTH / caption.aspect;
    this.caption.scale.set(CAPTION_WIDTH, capH, 1);
    this.caption.position.y = CARD_Y + CARD_SIZE * 0.44 + 14 + capH;
    this.captionTop = this.caption.position.y;
    this.captionHalfWidth = (CAPTION_WIDTH * caption.contentWidth) / 2;
    this.group.add(this.caption);
    this.textureList.push(cardMap, this.caption.material.uniforms.uMap.value);

    // Invisible box covering cake and card, which the pointer is tested against.
    const bottom = CAKE_Y - 112;
    const top = CARD_Y + CARD_SIZE * 0.44;
    this.hit = new THREE.Mesh(
      new THREE.BoxGeometry(320, top - bottom, 300),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    );
    this.hit.position.y = (top + bottom) / 2;
    this.hit.userData.item = this;
    this.group.add(this.hit);

    this.loaded = true;
  }

  /** Outline of cake, card and caption relative to the group, for the layout. */
  bounds() {
    const s = this.scale;
    const half = Math.max(160, this.captionHalfWidth);
    return { x0: -half * s, x1: half * s, y0: (CAKE_Y - 112) * s, y1: (this.captionTop + 4) * s };
  }

  worldRect() {
    const b = this.bounds();
    const p = this.group.position;
    return { x0: p.x + b.x0, x1: p.x + b.x1, y0: p.y + b.y0, y1: p.y + b.y1 };
  }

  /** Where the camera looks when the birthday is opened: the middle of cake and card. */
  focusPoint() {
    const b = this.bounds();
    return this.group.position.clone().add(new THREE.Vector3(0, (b.y0 + b.y1) / 2, 0));
  }

  /** Top of the cake in world space, where confetti pops from. */
  cakeTop() {
    return this.group.position.clone().add(new THREE.Vector3(0, (CAKE_Y + 60) * this.scale, 0));
  }

  get hitMesh() {
    return this.hit;
  }

  textures() {
    return this.textureList;
  }

  layout(scale) {
    this.scale = scale;
    this.group.scale.setScalar(scale);
    // Low in the middle of the path: the camera flies over the cake, past the card.
    this.group.position.set(0, -230 * scale, this.z);
    const b = this.bounds();
    this.w = b.x1 - b.x0;
    this.h = b.y1 - b.y0;
  }

  update(dt, { focused, dimmed, depth, time, reducedMotion }) {
    this.hover = damp(this.hover, this.hoverTarget, 8, dt);
    this.opacity = damp(this.opacity, dimmed ? 0.06 : 1, 6, dt);
    this.near = damp(this.near, focused ? 1 : NEAR, 6, dt);

    const fade = smoothstep(FAR, FAR * 0.6, depth) * smoothstep(this.near * 0.25, this.near, depth);
    const o = this.opacity * fade;
    for (const m of this.materials) m.opacity = o;
    for (const f of this.flames) {
      const flicker = reducedMotion ? 1 : 1 + Math.sin(time * 17 + f.seed) * 0.08 + Math.sin(time * 29 + f.seed * 3) * 0.05;
      f.flame.scale.set(14 * (2 - flicker), 28 * flicker, 1);
      f.flame.material.opacity = o;
      f.glow.material.opacity = o * (0.75 + (flicker - 1) * 2);
    }
    const cu = this.cardUniforms;
    cu.uOpacity.value = this.opacity;
    cu.uNear.value = this.near;
    cu.uHover.value = this.hover;
    // The caption steps aside while the birthday is open; the panel says it instead.
    this.captionOpacity = damp(this.captionOpacity ?? 1, focused || dimmed ? 0 : 1, 6, dt);
    this.caption.material.uniforms.uOpacity.value = this.captionOpacity;

    if (!reducedMotion) this.cake.rotation.y += dt * 0.35;
    this.cake.scale.setScalar(1 + this.hover * 0.05);
  }

  setVideoPlaying() {}
  releaseVideo() {}
}
