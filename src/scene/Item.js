import '../three-setup.js';
import * as THREE from 'three';
import { itemVertex, itemFragment } from './shaders.js';
import { makePlaceholder, makeMedallion } from './placeholder.js';
import { makeCaption } from './text.js';
import { pickInk } from '../sky.js';
import { seededRandom, damp } from '../utils.js';

export const FAR = 2600; // items start fading in from this distance
const NEAR = 260; // and fade out when closer than this, as you fly past

const GEOMETRY = new THREE.PlaneGeometry(1, 1, 32, 16);
const SIZES = { s: 250, m: 320, l: 400 };
const DEFAULT_RATIOS = [4 / 3, 3 / 4, 1, 16 / 10];
const CAPTION_WIDTH = 340;

const loader = new THREE.TextureLoader();

/**
 * One thing on the timeline: a project picture (or video) on the left or right,
 * or a special-day medallion floating above the centre of the path.
 */
export class Item {
  constructor({ data, kind = 'project', monthIndex, indexInMonth, globalIndex, z, side = 1, centerX = 0 }) {
    this.data = data;
    this.kind = kind;
    this.isSpecial = kind === 'special';
    this.monthIndex = monthIndex;
    this.indexInMonth = indexInMonth;
    this.globalIndex = globalIndex;
    this.z = z;
    this.ratio = this.isSpecial ? 1 : data.ratio || DEFAULT_RATIOS[globalIndex % DEFAULT_RATIOS.length];
    this.isVideo = Boolean(data.video);
    this.loaded = false;

    const rnd = seededRandom(1000 + globalIndex * 7919);
    if (this.isSpecial) {
      // Special days sit above the middle of the path, so you fly underneath them.
      this.baseX = centerX;
      this.baseY = 150;
      this.size = 230;
    } else {
      this.baseX = side * (250 + rnd() * 160);
      this.baseY = (rnd() - 0.5) * 240;
      this.size = (SIZES[data.size] || SIZES.m) * (0.92 + rnd() * 0.16);
    }

    this.hover = 0;
    this.hoverTarget = 0;
    this.opacity = 1;
    this.near = NEAR;
    this.captionOpacity = 1;

    this.uniforms = {
      uMap: { value: null },
      uOpacity: { value: 1 },
      uHover: { value: 0 },
      uBend: { value: 0 },
      uFar: { value: FAR },
      uNear: { value: NEAR },
      uCover: { value: new THREE.Vector2(1, 1) },
      uChroma: { value: data.chroma ? 1 : 0 },
      uKey: { value: new THREE.Color(data.chromaKey || '#00ff00') },
      uSimilarity: { value: 0.36 },
      uSmoothness: { value: 0.08 },
      uSpill: { value: 0.12 },
    };
    this.material = new THREE.ShaderMaterial({
      vertexShader: itemVertex,
      fragmentShader: itemFragment,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(GEOMETRY, this.material);
    this.mesh.userData.item = this;
    this.group = new THREE.Group();
    this.group.add(this.mesh);

    this.video = null;
    this.videoTexture = null;
  }

  async load({ sky, sun, ink, anisotropy }) {
    let texture = null;
    if (this.data.image) {
      try {
        texture = await loader.loadAsync(this.data.image);
        if (!this.data.ratio) this.ratio = texture.image.width / texture.image.height;
      } catch {
        console.warn(`Couldn't load "${this.data.image}", showing a placeholder instead.`);
      }
    }
    if (!texture && this.isSpecial) {
      const color = new THREE.Color(this.data.color || '#f3d27a');
      const canvas = makeMedallion({
        day: parseInt(this.data.date, 10) || null,
        thai: this.data.thai,
        motif: this.data.motif,
        color: `#${color.getHexString()}`,
        ink: `#${pickInk(color).getHexString()}`,
      });
      texture = new THREE.CanvasTexture(canvas);
    }
    if (!texture) {
      const day = parseInt(this.data.date, 10) || this.indexInMonth + 1;
      const canvas = makePlaceholder({
        ratio: this.ratio,
        seed: 31 + this.globalIndex * 104729,
        sky,
        sun,
        ink,
        day,
        variant: this.globalIndex,
      });
      texture = new THREE.CanvasTexture(canvas);
    }
    texture.anisotropy = anisotropy;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.poster = texture;
    this.uniforms.uMap.value = texture;

    const caption = makeCaption(this.data.date, this.data.title, { align: this.isSpecial ? 'center' : 'left' });
    this.caption = caption.mesh;
    this.captionAspect = caption.aspect;
    this.captionContent = caption.contentWidth;
    this.group.add(this.caption);
    this.loaded = true;
  }

  /** The card's outline including its caption, relative to its centre. Used by the layout. */
  bounds() {
    const cw = this.caption.scale.x;
    const ch = this.caption.scale.y;
    const textW = cw * this.captionContent;
    if (this.isSpecial) {
      const r = this.w * 0.44;
      const top = this.caption.position.y; // the caption hangs down from here
      return { x0: -Math.max(r, textW / 2), x1: Math.max(r, textW / 2), y0: -r, y1: top + 4 };
    }
    return {
      x0: -this.w / 2,
      x1: Math.max(this.w / 2, -this.w / 2 + textW),
      y0: this.caption.position.y - ch,
      y1: this.h / 2,
    };
  }

  setPosition(x, y) {
    this.group.position.x = x;
    this.group.position.y = y;
  }

  /** What the pointer is tested against. */
  get hitMesh() {
    return this.mesh;
  }

  /** Textures to upload to the GPU while loading. */
  textures() {
    return [this.uniforms.uMap.value, this.caption?.material.uniforms.uMap.value].filter(Boolean);
  }

  get posterAspect() {
    const img = this.poster?.image;
    return img ? img.width / img.height : this.ratio;
  }

  /** Fit a texture of any shape into the plane without stretching it (like CSS object-fit: cover). */
  updateCover(textureAspect) {
    const plane = this.ratio;
    if (textureAspect > plane) this.uniforms.uCover.value.set(plane / textureAspect, 1);
    else this.uniforms.uCover.value.set(1, textureAspect / plane);
  }

  layout(scale, spread, captionScale = scale) {
    this.w = this.size * Math.sqrt(this.ratio) * scale;
    this.h = (this.size / Math.sqrt(this.ratio)) * scale;
    this.mesh.scale.set(this.w, this.h, 1);
    this.group.position.set(this.baseX * spread, this.baseY * scale, this.z);
    if (this.caption) {
      const cw = CAPTION_WIDTH * captionScale;
      this.caption.scale.set(cw, cw / this.captionAspect, 1);
      // Medallion captions go above the circle, away from the month names in the middle.
      if (this.isSpecial) this.caption.position.set(0, this.h * 0.44 + 12 * scale + cw / this.captionAspect, 0);
      else this.caption.position.set(-this.w / 2, -this.h / 2 - 16 * scale, 0);
    }
    this.updateCover(this.videoTexture ? this.video.videoWidth / this.video.videoHeight : this.posterAspect);
  }

  update(dt, { bend, ink, focused, dimmed }) {
    this.hover = damp(this.hover, this.hoverTarget, 8, dt);
    this.opacity = damp(this.opacity, dimmed ? 0.06 : 1, 6, dt);
    this.near = damp(this.near, focused ? 1 : NEAR, 6, dt);
    this.captionOpacity = damp(this.captionOpacity, focused || dimmed ? 0 : 1, 7, dt);

    const u = this.uniforms;
    u.uHover.value = this.hover;
    u.uOpacity.value = this.opacity;
    u.uNear.value = this.near;
    u.uBend.value = focused ? 0 : bend;
    this.mesh.position.z = this.hover * 30;

    const cu = this.caption.material.uniforms;
    cu.uColor.value.copy(ink);
    cu.uOpacity.value = this.captionOpacity;
  }

  // ------------------------------------------------------------- video
  // Phones and tablets can only decode a handful of videos at once, so a video element
  // only exists while its item is close. Further away it's released and the poster shows.

  setVideoPlaying(on) {
    if (!this.isVideo) return;
    if (on) {
      this.ensureVideo();
      if (this.video.paused) this.video.play().catch(() => {});
    } else if (this.video && !this.video.paused) {
      this.video.pause();
    }
  }

  ensureVideo() {
    if (this.video) return;
    const v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.crossOrigin = 'anonymous';
    v.preload = 'auto';
    v.src = this.data.video;
    v.addEventListener(
      'loadeddata',
      () => {
        if (this.video !== v) return;
        const tex = new THREE.VideoTexture(v);
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        this.videoTexture = tex;
        this.uniforms.uMap.value = tex;
        this.updateCover(v.videoWidth / v.videoHeight);
      },
      { once: true },
    );
    v.addEventListener('error', () => console.warn(`Couldn't play "${this.data.video}".`), { once: true });
    this.video = v;
  }

  releaseVideo() {
    if (!this.video) return;
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    this.video = null;
    if (this.videoTexture) {
      this.videoTexture.dispose();
      this.videoTexture = null;
    }
    this.uniforms.uMap.value = this.poster;
    this.updateCover(this.posterAspect);
  }
}
