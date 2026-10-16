import * as THREE from 'three';
import { textVertex, textFragment } from './shaders.js';

/**
 * Text in the 3D scene is drawn onto a canvas in white, uploaded as a texture,
 * and tinted in the shader. That way it can change colour with the sky.
 */

const DISPLAY = '"Big Shoulders", "Arial Narrow", sans-serif';
const SERIF = '"Newsreader", Georgia, serif';

function canvasTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export function textMaterial(texture, { near0 = 40, near1 = 240, far = 2600 } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: textVertex,
    fragmentShader: textFragment,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uMap: { value: texture },
      uColor: { value: new THREE.Color('#ffffff') },
      uOpacity: { value: 1 },
      uNear0: { value: near0 },
      uNear1: { value: near1 },
      uFar: { value: far },
    },
  });
}

/** A single line of big display type, e.g. a month name. Returns { mesh, aspect }. */
export function makeLabel(text, { weight = 800, fontSize = 260, near0 = 170, near1 = 720, far = 2600 } = {}) {
  const measure = document.createElement('canvas').getContext('2d');
  const font = `${weight} ${fontSize}px ${DISPLAY}`;
  measure.font = font;
  const pad = Math.round(fontSize * 0.08);
  const width = Math.ceil(measure.measureText(text).width) + pad * 2;
  const height = Math.round(fontSize * 1.05);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, pad, Math.round(fontSize * 0.86));

  const geometry = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.Mesh(geometry, textMaterial(canvasTexture(canvas), { near0, near1, far }));
  return { mesh, aspect: width / height };
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * A caption under an item: the date in the serif, the title in the display face.
 * The mesh's origin is its top-left corner so it can be lined up with the item's left edge.
 */
export function makeCaption(date, title, { near0 = 50, near1 = 260, far = 2600, align = 'left' } = {}) {
  const width = 1024;
  const dateSize = 38;
  const titleSize = 70;
  const lineHeight = titleSize * 0.98;

  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `700 ${titleSize}px ${DISPLAY}`;
  const lines = wrap(measure, title, width - 20).slice(0, 2);
  const height = Math.ceil(dateSize * 1.5 + lines.length * lineHeight + 16);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const centred = align === 'center';
  const x = centred ? width / 2 : 0;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = centred ? 'center' : 'left';
  ctx.font = `500 ${dateSize}px ${SERIF}`;
  ctx.globalAlpha = 0.78;
  ctx.fillText(date, x + (centred ? 0 : 2), dateSize);
  ctx.globalAlpha = 1;
  ctx.font = `700 ${titleSize}px ${DISPLAY}`;
  lines.forEach((l, i) => ctx.fillText(l, x, dateSize * 1.5 + titleSize * 0.82 + i * lineHeight));
  // How much of the canvas width the text really uses, for layout.
  let used = Math.max(...lines.map((l) => ctx.measureText(l).width));
  ctx.font = `500 ${dateSize}px ${SERIF}`;
  used = Math.max(used, ctx.measureText(date).width);

  // Origin at the top-left corner (or top-centre when centred) for easy lining up.
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.translate(centred ? 0 : 0.5, -0.5, 0);
  const mesh = new THREE.Mesh(geometry, textMaterial(canvasTexture(canvas), { near0, near1, far }));
  return { mesh, aspect: width / height, contentWidth: Math.min(1, (used + 8) / width) };
}
