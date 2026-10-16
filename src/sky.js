import './three-setup.js';
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from './utils.js';

/**
 * The year as one day: each month gets a sky, from pre-dawn in January
 * to full night in December. `top` is the sky overhead, `bottom` the horizon.
 * Change these to restyle the whole site.
 */
export const SKY = [
  { top: '#10142f', bottom: '#262c5a' }, // Jan  pre-dawn
  { top: '#1d2250', bottom: '#4a4a80' }, // Feb  blue hour
  { top: '#3f3f78', bottom: '#c999ae' }, // Mar  first light
  { top: '#7d8cc0', bottom: '#f1c3b1' }, // Apr  sunrise
  { top: '#8fb9dc', bottom: '#e4ecee' }, // May  morning haze
  { top: '#6eaee0', bottom: '#d4ebf5' }, // Jun  noon
  { top: '#79b2db', bottom: '#e2efe0' }, // Jul  early afternoon
  { top: '#94b3cf', bottom: '#f2dca8' }, // Aug  late afternoon
  { top: '#b68a78', bottom: '#f3bd74' }, // Sep  golden hour
  { top: '#5e3a66', bottom: '#e5845c' }, // Oct  sunset
  { top: '#241d45', bottom: '#6d4a77' }, // Nov  dusk
  { top: '#090b1c', bottom: '#161a36' }, // Dec  night
].map((m) => ({ top: new THREE.Color(m.top), bottom: new THREE.Color(m.bottom) }));

export const INK_DARK = new THREE.Color('#1a2036');
export const INK_LIGHT = new THREE.Color('#f1f2f7');

const SUN_HIGH = new THREE.Color('#fff4de');
const SUN_LOW = new THREE.Color('#ffb06a');

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export const luminance = (c) => 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b);
export const contrast = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** Whichever ink reads better on this background. */
export const pickInk = (bg) => (contrast(bg, INK_DARK) >= contrast(bg, INK_LIGHT) ? INK_DARK : INK_LIGHT);

/** A smooth blend between the two inks, for things in the 3D scene. */
export function blendInk(bg, out) {
  const k = smoothstep(-1.2, 1.2, contrast(bg, INK_DARK) - contrast(bg, INK_LIGHT));
  return out.copy(INK_LIGHT).lerp(INK_DARK, k);
}

const ease = (x) => x * x * (3 - 2 * x);

/** Sky colours at a point in the year. t runs 0 → 12, month i is centred at i + 0.5. */
export function sampleSky(t, out) {
  const x = clamp(t - 0.5, 0, SKY.length - 1);
  const i = Math.floor(x);
  const j = Math.min(i + 1, SKY.length - 1);
  const f = ease(x - i);
  out.top.copy(SKY[i].top).lerp(SKY[j].top, f);
  out.bottom.copy(SKY[i].bottom).lerp(SKY[j].bottom, f);
  return out;
}

/** Where the sun sits on screen (−1…1), how visible it is, and its colour. */
export function sampleSun(t, out) {
  const rise = 2.3;
  const set = 10.1;
  const u = (t - rise) / (set - rise);
  const elevation = Math.sin(Math.PI * clamp(u, -0.12, 1.12));
  out.x = lerp(-0.82, 0.82, clamp(u, 0, 1));
  out.y = -0.62 + 1.08 * Math.max(elevation, -0.25);
  out.visible = u > -0.1 && u < 1.1 ? smoothstep(-0.04, 0.1, elevation) : 0;
  out.color.copy(SUN_HIGH).lerp(SUN_LOW, 1 - smoothstep(0.1, 0.65, elevation));
  return out;
}

/** How many stars show: only around the night ends of the year. */
export const starAmount = (t) => Math.max(1 - smoothstep(1.1, 2.5, t), smoothstep(10.1, 11.2, t));
