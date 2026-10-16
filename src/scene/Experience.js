import '../three-setup.js';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { Item, FAR } from './Item.js';
import { Birthday } from './Birthday.js';
import { Fireworks } from './Fireworks.js';
import { Confetti } from './Confetti.js';
import { arrange } from './layout.js';
import { Background } from './Background.js';
import { Dust } from './Dust.js';
import { makeLabel } from './text.js';
import { SKY, INK_DARK, sampleSky, sampleSun, starAmount, pickInk } from '../sky.js';
import { daysInMonth } from '../timeline.js';
import { clamp, damp, lerp } from '../utils.js';

const SECTION = 2400; // length of one month along the z axis
const DAY_START = 760; // where day 1 sits, behind the month name
const DAY_END = SECTION - 420; // where the last day of the month sits
const VIEW = 650; // camera distance from a month's name when you arrive at it
const INTRO_OFFSET = 2200; // how far back the camera starts before "Start" is pressed

const WHITE = new THREE.Color('#ffffff');
const BLACK = new THREE.Color('#000000');

/**
 * The 3D scene. The camera only ever moves along z; scrolling, dragging and keys
 * change `targetZ`, and every frame the camera eases toward it.
 */
export class Experience {
  constructor({ canvas, site, months, entries, reducedMotion = false, on = {} }) {
    this.canvas = canvas;
    this.site = site;
    this.months = months;
    this.entries = entries;
    this.rm = reducedMotion;
    this.on = on;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setClearColor(SKY[0].top);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 1, FAR + 800);
    this.camera.rotation.order = 'YXZ';

    this.maxZ = VIEW;
    this.minZ = -months.length * SECTION + VIEW;
    this.cam = { x: 0, y: 0, z: VIEW + INTRO_OFFSET };
    this.targetZ = VIEW;
    this.returnZ = VIEW;
    this.vel = 0;
    this.mode = 'intro'; // intro → starting → free ⇄ focus → returning → free
    this.started = false;
    this.paused = false;
    this.moved = false;
    this.time = 0;
    this.last = performance.now();

    this.mouse = new THREE.Vector2();
    this.look = new THREE.Vector2();
    this.pointer = { down: false, inside: false, type: 'mouse', lastX: 0, lastY: 0, moved: 0, lastT: 0, flick: 0 };
    this.raycaster = new THREE.Raycaster();
    this.hovered = null;
    this.openItem = null;

    this.sky = { top: new THREE.Color(), bottom: new THREE.Color() };
    this.sun = { x: 0, y: 0, visible: 0, color: new THREE.Color() };
    this.mid = new THREE.Color();
    this.ink = new THREE.Color();
    this.paper = new THREE.Color();
    this.themeKey = '';
    this.monthIndex = -1;
    this.lastProgress = -1;

    this.background = new Background();
    this.scene.add(this.background.mesh);
    this.dust = new Dust({ count: 2400, minZ: this.minZ - 1600, maxZ: this.maxZ + INTRO_OFFSET + 400 });
    this.scene.add(this.dust.points);

    this.items = [];
    this.labels = [];
    this.birthday = null;
    this.fireworks = null;
    this.fireworkTimer = 0;
    this.fireworkQueue = [];

    this.bind();
    this.resize();
    this.renderer.setAnimationLoop(this.tick);
  }

  monthZ(i) {
    return -i * SECTION;
  }

  // ------------------------------------------------------------------ loading

  async load(onProgress = () => {}) {
    try {
      await Promise.all([
        document.fonts.load('800 100px "Big Shoulders"'),
        document.fonts.load('700 100px "Big Shoulders"'),
        document.fonts.load('500 40px "Newsreader"'),
        document.fonts.load('600 40px "Kanit"', 'วัน'),
      ]);
    } catch {
      // Fallback fonts are fine.
    }
    onProgress(0.08);

    const anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const total = this.entries.length;
    const pending = [];
    let done = 0;
    const tick = () => onProgress(0.08 + 0.84 * (++done / total));
    const year = this.site.year || new Date().getFullYear();

    let projectCount = 0;
    for (let m = 0; m < this.months.length; m++) {
      const month = this.months[m];
      const z0 = this.monthZ(m);
      const sky = sampleSky(m + 0.5, { top: new THREE.Color(), bottom: new THREE.Color() });
      const sun = sampleSun(m + 0.5, { color: new THREE.Color() }).color;
      const ink = pickInk(sky.top.clone().lerp(sky.bottom, 0.5));
      const days = daysInMonth(year, m);

      const label = makeLabel(month.name);
      label.mesh.position.set(0, 0, z0);
      // Drawn before the items, so pictures sit on top of the big type.
      label.mesh.renderOrder = -1;
      this.labels.push(label);
      this.scene.add(label.mesh);

      for (const entry of this.entries.filter((e) => e.monthIndex === m)) {
        // Place each thing by its day of the month; undated things are spread evenly.
        const f = entry.day ? (entry.day - 1) / (days - 1) : (entry.indexInMonth + 0.5) / entry.countInMonth;
        const z = z0 - lerp(DAY_START, DAY_END, clamp(f, 0, 1));
        const common = {
          data: entry.data,
          kind: entry.kind,
          monthIndex: m,
          indexInMonth: entry.indexInMonth,
          globalIndex: entry.globalIndex,
          z,
        };

        let item;
        if (entry.kind === 'birthday') {
          item = new Birthday(common);
          this.birthday ??= item;
        } else if (entry.kind === 'special') {
          item = new Item(common); // placed later by the layout, see layout.js
        } else {
          item = new Item({ ...common, side: projectCount++ % 2 === 0 ? -1 : 1 });
          item.side = item.baseX < 0 ? -1 : 1;
        }
        this.items.push(item);

        const p = item.load({ sky, sun, ink, anisotropy }).then(() => {
          this.scene.add(item.group);
          tick();
        });
        // Images load in parallel; generated artwork is made one by one,
        // with a pause between so the loader can repaint.
        if (item.data.image) pending.push(p);
        else {
          await p;
          await nextFrame();
        }
      }
    }

    if (this.birthday) {
      this.fireworks = new Fireworks();
      this.fireworks.setPixelRatio(this.renderer.getPixelRatio());
      this.scene.add(this.fireworks.points);
      this.confetti = new Confetti();
      this.scene.add(this.confetti.mesh);
    }

    this.outro = makeLabel(this.site.outro, { near0: 40, near1: 200 });
    this.outro.mesh.position.set(0, 0, this.monthZ(this.months.length));
    this.scene.add(this.outro.mesh);

    await Promise.all(pending);
    this.layout();

    // Upload textures and compile shaders now, not in the middle of the first flight.
    for (const item of this.items) for (const t of item.textures()) this.renderer.initTexture(t);
    for (const l of [...this.labels, this.outro]) this.renderer.initTexture(l.mesh.material.uniforms.uMap.value);
    this.renderer.compile(this.scene, this.camera);

    // Where each special day sits on the progress line.
    this.on.markers?.(
      this.items
        .filter((i) => i.kind !== 'project')
        .map((i) => ({ kind: i.kind, progress: this.progressAt(i.z + VIEW), title: i.data.title })),
    );
    onProgress(1);
  }

  progressAt(camZ) {
    return clamp((this.maxZ - camZ) / (this.maxZ - this.minZ), 0, 1);
  }

  layout() {
    const aspect = this.camera.aspect;
    const scale = clamp(aspect / 1.1, 0.62, 1);
    const spread = clamp(aspect / 1.5, 0.64, 1);
    const captionScale = Math.max(scale, 0.95); // keep captions readable on phones
    for (const item of this.items) if (item.loaded) item.layout(scale, spread, captionScale, aspect);

    // Spread the cards out so each one can be seen clearly (see layout.js).
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const t0 = performance.now();
    arrange(
      this.items.filter((i) => i.loaded && i.kind !== 'birthday'),
      { aspect, tan, fixed: this.birthday?.loaded ? [this.birthday] : [] },
    );
    this.layoutMs = performance.now() - t0;

    const visibleWidth = 2 * VIEW * tan * aspect;
    for (const l of [...this.labels, this.outro].filter(Boolean)) {
      const h = Math.min(250, (visibleWidth * 0.84) / l.aspect);
      l.mesh.scale.set(h * l.aspect, h, 1);
    }
  }

  // ------------------------------------------------------------------ navigation

  start() {
    if (this.started) return;
    this.started = true;
    this.mode = 'starting';
    gsap.to(this.cam, {
      z: VIEW,
      duration: this.rm ? 0.01 : 2.6,
      ease: 'power2.inOut',
      onComplete: () => {
        this.mode = 'free';
        this.targetZ = VIEW;
      },
    });
  }

  move(delta) {
    this.targetZ = clamp(this.targetZ + delta, this.minZ, this.maxZ);
    if (!this.moved) {
      this.moved = true;
      this.on.firstMove?.();
    }
  }

  goToMonth(i) {
    const z = this.monthZ(clamp(i, 0, this.months.length - 1)) + VIEW;
    if (this.mode === 'focus') this.close(z);
    else if (this.mode === 'free') this.move(z - this.targetZ);
  }

  goToItem(index) {
    const item = this.items[index];
    if (!item || !(this.mode === 'free' || this.mode === 'focus')) return;
    this.open(item, clamp(item.z + 900, this.minZ, this.maxZ));
  }

  open(item, returnZ) {
    if (!(this.mode === 'free' || this.mode === 'focus')) return;
    if (this.mode === 'free') this.returnZ = returnZ ?? this.cam.z;
    else if (returnZ !== undefined) this.returnZ = returnZ;

    const previous = this.openItem;
    if (previous && previous !== item) previous.setVideoPlaying(false);
    this.mode = 'focus';
    this.openItem = item;
    this.setHovered(null);

    gsap.to(this.cam, {
      ...this.focusTarget(item),
      duration: this.rm ? 0.01 : previous ? 1.0 : 1.25,
      ease: 'power3.inOut',
      overwrite: true,
    });
    if (item.kind === 'birthday') this.celebrate();
    const g = item.globalIndex;
    this.on.open?.(item, {
      monthName: this.months[item.monthIndex].name,
      hasPrev: g > 0,
      hasNext: g < this.items.length - 1,
    });
  }

  close(toZ = this.returnZ) {
    if (this.mode !== 'focus') return;
    this.openItem = null;
    this.mode = 'returning';
    this.targetZ = clamp(toZ, this.minZ, this.maxZ);
    gsap.to(this.cam, {
      x: 0,
      y: 0,
      z: this.targetZ,
      duration: this.rm ? 0.01 : 1.1,
      ease: 'power3.inOut',
      overwrite: true,
      onComplete: () => {
        this.mode = 'free';
      },
    });
    this.on.close?.();
  }

  openSibling(dir) {
    if (!this.openItem) return;
    const next = this.items[this.openItem.globalIndex + dir];
    if (next) this.open(next, clamp(next.z + 900, this.minZ, this.maxZ));
  }

  /** Where the camera goes to show an item next to the detail panel. */
  focusTarget(item) {
    const p = item.focusPoint ? item.focusPoint() : item.group.position;
    const aspect = this.camera.aspect;
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const narrow = this.width < 760;
    const fillH = narrow ? 0.4 : 0.62;
    const fillW = narrow ? 0.84 : 0.48;
    const d = Math.max(item.h / (fillH * 2 * tan), item.w / (fillW * 2 * tan * aspect));
    const visH = 2 * d * tan;
    const visW = visH * aspect;
    return {
      x: narrow ? p.x : p.x + (0.27 * visW) / 2,
      y: narrow ? p.y - (0.42 * visH) / 2 : p.y,
      z: p.z + d,
    };
  }

  setPaused(paused) {
    this.paused = paused;
    this.last = performance.now();
  }

  // ------------------------------------------------------------------ input

  bind() {
    window.addEventListener('resize', this.resize);
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKey);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    document.addEventListener('pointerleave', () => (this.pointer.inside = false));
  }

  get inputEnabled() {
    return this.started && !this.paused;
  }

  onWheel = (e) => {
    if (!this.inputEnabled || e.target.closest?.('.panel, .index')) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    const dx = e.deltaX * unit;
    const dy = e.deltaY * unit;
    const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    if (this.mode === 'focus') {
      if (Math.abs(d) > 25) this.close();
      return;
    }
    if (this.mode === 'free') this.move(-d * 1.3);
  };

  onPointerDown = (e) => {
    if (!this.inputEnabled) return;
    const p = this.pointer;
    p.down = true;
    p.type = e.pointerType;
    p.lastX = e.clientX;
    p.lastY = e.clientY;
    p.moved = 0;
    p.flick = 0;
    p.lastT = performance.now();
    this.canvas.setPointerCapture?.(e.pointerId);
  };

  onPointerMove = (e) => {
    const p = this.pointer;
    p.inside = e.target === this.canvas;
    p.type = e.pointerType;
    if (e.pointerType === 'mouse') {
      this.mouse.set((e.clientX / this.width) * 2 - 1, -(e.clientY / this.height) * 2 + 1);
    }
    if (!p.down) return;
    const dx = e.clientX - p.lastX;
    const dy = e.clientY - p.lastY;
    p.moved += Math.abs(dx) + Math.abs(dy);
    p.lastX = e.clientX;
    p.lastY = e.clientY;
    if (this.mode !== 'free' || p.moved < 6) return;
    const d = (Math.abs(dx) > Math.abs(dy) ? dx : dy) * (p.type === 'mouse' ? 2 : 2.6);
    this.move(d);
    const now = performance.now();
    p.flick = lerp(p.flick, d / Math.max(now - p.lastT, 1), 0.5);
    p.lastT = now;
  };

  onPointerUp = (e) => {
    const p = this.pointer;
    if (!p.down) return;
    p.down = false;
    if (p.moved < 6) {
      this.onTap(e);
      return;
    }
    // A quick swipe keeps going a little after you let go.
    if (this.mode === 'free' && performance.now() - p.lastT < 80) this.move(p.flick * 140);
  };

  onTap(e) {
    if (e.target !== this.canvas) return;
    const ndc = new THREE.Vector2((e.clientX / this.width) * 2 - 1, -(e.clientY / this.height) * 2 + 1);
    const hit = this.pick(ndc, this.mode === 'focus');
    if (this.mode === 'free' && hit) this.open(hit);
    else if (this.mode === 'focus') {
      if (!hit) this.close();
      else if (hit !== this.openItem) this.open(hit, clamp(hit.z + 900, this.minZ, this.maxZ));
      else if (hit.kind === 'birthday') this.celebrate();
    }
  }

  onKey = (e) => {
    if (!this.inputEnabled || e.target.closest?.('.index')) return;
    const k = e.key;
    if (this.mode === 'focus') {
      if (k === 'ArrowRight' || k === 'ArrowDown') this.openSibling(1);
      else if (k === 'ArrowLeft' || k === 'ArrowUp') this.openSibling(-1);
      else return;
      e.preventDefault();
      return;
    }
    if (this.mode !== 'free') return;
    const onControl = e.target.tagName === 'BUTTON' || e.target.tagName === 'A';
    switch (k) {
      case 'ArrowDown':
      case 'ArrowRight':
        this.move(-500);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        this.move(500);
        break;
      case 'PageDown':
        this.goToMonth(this.monthIndex + 1);
        break;
      case 'PageUp':
        this.goToMonth(this.monthIndex - 1);
        break;
      case ' ':
        if (onControl) return;
        this.goToMonth(this.monthIndex + (e.shiftKey ? -1 : 1));
        break;
      case 'Home':
        this.goToMonth(0);
        break;
      case 'End':
        this.move(this.minZ - this.targetZ);
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  pick(ndc, includeDimmed = false) {
    this.raycaster.setFromCamera(ndc, this.camera);
    const meshes = [];
    for (const item of this.items) {
      if (!item.loaded || !item.group.visible) continue;
      const depth = this.cam.z - item.z;
      if (depth < (includeDimmed ? 20 : 150) || depth > FAR * 0.85) continue;
      meshes.push(item.hitMesh);
    }
    const hits = this.raycaster.intersectObjects(meshes, false);
    return hits.length ? hits[0].object.userData.item : null;
  }

  setHovered(item) {
    if (item === this.hovered) return;
    if (this.hovered) this.hovered.hoverTarget = 0;
    this.hovered = item;
    if (item) item.hoverTarget = 1;
    this.canvas.style.cursor = item ? 'pointer' : '';
  }

  resize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.width < 760 ? 1.75 : 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.background.setAspect(this.camera.aspect);
    this.dust.setPixelRatio(dpr);
    this.fireworks?.setPixelRatio(dpr);
    if (this.items.length) this.layout();
    if (this.mode === 'focus' && this.openItem) {
      gsap.to(this.cam, { ...this.focusTarget(this.openItem), duration: 0.4, overwrite: true });
    }
  };

  // ------------------------------------------------------------------ frame loop

  tick = () => {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 1 / 20);
    this.last = now;
    if (this.paused) return;
    this.time += dt;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  update(dt) {
    const prevZ = this.cam.z;
    if (this.mode === 'free') {
      this.cam.z = damp(this.cam.z, this.targetZ, 3.2, dt);
      this.cam.x = damp(this.cam.x, 0, 4, dt);
      this.cam.y = damp(this.cam.y, 0, 4, dt);
    }
    this.vel = damp(this.vel, (this.cam.z - prevZ) / Math.max(dt, 1e-4), 8, dt);

    // Camera, with a little parallax from the mouse.
    const lookAmount = this.rm ? 0 : this.mode === 'focus' ? 0.3 : 1;
    this.look.x = damp(this.look.x, this.mouse.x * lookAmount, 2.5, dt);
    this.look.y = damp(this.look.y, this.mouse.y * lookAmount, 2.5, dt);
    this.camera.position.set(this.cam.x + this.look.x * 28, this.cam.y + this.look.y * 18, this.cam.z);
    this.camera.rotation.set(this.look.y * 0.035, -this.look.x * 0.05, 0);

    // Where we are in the year decides the sky.
    const yearT = (VIEW - this.cam.z) / SECTION; // 0 at January, 12 at the end
    const skyT = clamp(yearT + 0.5, 0, this.months.length);
    sampleSky(skyT, this.sky);
    sampleSun(skyT, this.sun);
    this.mid.copy(this.sky.top).lerp(this.sky.bottom, 0.55);
    // Text in the scene snaps to whichever ink reads best, with a short cross-fade.
    const inkTarget = pickInk(this.mid);
    if (!this.inkReady) {
      this.ink.copy(inkTarget);
      this.inkReady = true;
    } else this.ink.lerp(inkTarget, 1 - Math.exp(-4 * dt));
    this.background.update({
      sky: this.sky,
      sun: this.sun,
      stars: starAmount(skyT),
      time: this.rm ? 0 : this.time,
      offsetX: this.look.x * -0.012,
      offsetY: this.look.y * -0.01,
    });
    this.dust.update(this.rm ? 0 : this.time, this.ink);
    // Month names step back while an item is open.
    this.labelOpacity = damp(this.labelOpacity ?? 1, this.openItem ? 0.06 : 0.94, 6, dt);
    for (const l of [...this.labels, this.outro]) {
      if (!l) continue;
      l.mesh.material.uniforms.uColor.value.copy(this.ink);
      l.mesh.material.uniforms.uOpacity.value = this.labelOpacity;
    }

    // Items.
    const bend = this.rm ? 0 : clamp(this.vel * 0.022, -70, 70);
    for (const item of this.items) {
      if (!item.loaded) continue;
      const depth = this.cam.z - item.z;
      const focused = item === this.openItem;
      item.group.visible = focused || (depth > -300 && depth < FAR + 300);
      if (item.isVideo) this.manageVideo(item, depth);
      if (!item.group.visible) continue;
      item.update(dt, {
        bend,
        ink: this.ink,
        focused,
        dimmed: Boolean(this.openItem) && !focused,
        depth,
        time: this.time,
        reducedMotion: this.rm,
      });
    }
    this.updateFireworks(dt);

    // Hover only makes sense with a mouse, while browsing.
    const canHover = this.mode === 'free' && this.pointer.inside && this.pointer.type === 'mouse' && !this.pointer.down;
    this.setHovered(canHover ? this.pick(this.mouse) : null);

    this.report(yearT);
  }

  // ------------------------------------------------------------------ birthday fireworks

  /** Fireworks go up on their own while you're near the birthday. */
  updateFireworks(dt) {
    if (!this.fireworks) return;
    const depth = this.cam.z - this.birthday.z;
    const near = depth > -300 && depth < 2300;
    if (near && !this.rm) {
      this.fireworkTimer -= dt;
      if (this.fireworkTimer <= 0) {
        this.launchFirework();
        this.fireworkTimer = 0.35 + Math.random() * 0.7;
      }
    }
    for (let i = this.fireworkQueue.length - 1; i >= 0; i--) {
      this.fireworkQueue[i] -= dt;
      if (this.fireworkQueue[i] <= 0) {
        this.launchFirework(true);
        this.fireworkQueue.splice(i, 1);
      }
    }
    if (this.fireworks.active) this.fireworks.update(dt);

    // Confetti drifts down while the cake is in sight.
    if (depth > 150 && depth < 2200 && !this.rm) {
      this.confettiDue = (this.confettiDue || 0) + dt * 34;
      const n = Math.floor(this.confettiDue);
      if (n > 0) {
        this.confettiDue -= n;
        const spread = clamp(this.camera.aspect / 1.5, 0.55, 1);
        const p = this.birthday.group.position;
        this.confetti.rain(new THREE.Vector3(p.x, 600, this.birthday.z + 50), n, 1500 * spread, 900);
      }
    }
    this.confetti.update(dt, this.time, -750);
  }

  launchFirework(close = false) {
    const b = this.birthday;
    const spread = clamp(this.camera.aspect / 1.5, 0.55, 1);
    const z = b.z - (close ? 150 + Math.random() * 400 : 250 + Math.random() * 800);
    const x = (Math.random() - 0.5) * 1500 * spread;
    const apex = 120 + Math.random() * 380;
    this.fireworks.launch(new THREE.Vector3(x, -650, z), apex);
  }

  /** A volley of fireworks and a pop of confetti, for opening or clicking the cake. */
  celebrate() {
    if (!this.fireworks || this.rm) return;
    for (let i = 0; i < 7; i++) this.fireworkQueue.push(i * 0.18 + Math.random() * 0.1);
    this.confetti.pop(this.birthday.cakeTop(), 160);
  }

  /**
   * Videos only play near the camera. While you're flying fast nothing changes,
   * so play/pause calls don't pile up; far-away videos are released entirely.
   */
  manageVideo(item, depth) {
    if (item === this.openItem) return item.setVideoPlaying(true);
    if (depth > 3400 || depth < -900) return item.releaseVideo();
    if (Math.abs(this.vel) > 900) return;
    item.setVideoPlaying(this.mode !== 'focus' && depth > -150 && depth < 2000);
  }

  report(yearT) {
    const month = clamp(Math.floor(yearT + 0.25), 0, this.months.length - 1);
    if (month !== this.monthIndex) {
      this.monthIndex = month;
      this.on.month?.(month);
    }

    const progress = clamp((this.maxZ - this.cam.z) / (this.maxZ - this.minZ), 0, 1);
    if (Math.abs(progress - this.lastProgress) > 0.0005) {
      this.lastProgress = progress;
      this.on.progress?.(progress);
    }

    // UI colours: separate inks for the top and bottom edges, since the sky is a gradient.
    const inkTop = pickInk(this.sky.top);
    const inkBottom = pickInk(this.sky.bottom);
    const paperInk = pickInk(this.mid);
    this.paper.copy(this.mid).lerp(paperInk === INK_DARK ? WHITE : BLACK, paperInk === INK_DARK ? 0.5 : 0.35);
    const theme = {
      'ink-top': `#${inkTop.getHexString()}`,
      'ink-bottom': `#${inkBottom.getHexString()}`,
      paper: `#${this.paper.getHexString()}`,
      'paper-ink': `#${paperInk.getHexString()}`,
    };
    const key = Object.values(theme).join();
    if (key !== this.themeKey) {
      this.themeKey = key;
      this.on.theme?.(theme);
    }
  }
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
