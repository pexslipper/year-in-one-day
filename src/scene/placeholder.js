import { seededRandom } from '../utils.js';

/**
 * Generated artwork for items that don't have an image yet.
 * Each one uses its month's sky colours, so the placeholders already feel
 * like part of the year. Replace them by giving an item an `image`.
 */

const hex = (c) => `#${c.getHexString()}`;
const rgba = (c, a) => `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${a})`;

export function makePlaceholder({ ratio, seed, sky, sun, ink, day, variant }) {
  const longSide = 640;
  const w = ratio >= 1 ? longSide : Math.round(longSide * ratio);
  const h = ratio >= 1 ? Math.round(longSide / ratio) : longSide;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const rnd = seededRandom(seed);

  const top = sky.top;
  const bottom = sky.bottom;

  switch (variant % 4) {
    case 0: {
      // Horizon: sky, sun at this month's height, layered hills.
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, hex(top));
      g.addColorStop(1, hex(bottom));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = hex(sun);
      ctx.beginPath();
      ctx.arc(w * (0.3 + rnd() * 0.4), h * (0.35 + rnd() * 0.2), Math.min(w, h) * 0.11, 0, Math.PI * 2);
      ctx.fill();
      for (let layer = 0; layer < 3; layer++) {
        const base = h * (0.62 + layer * 0.12);
        ctx.fillStyle = rgba(ink, 0.18 + layer * 0.2);
        ctx.beginPath();
        ctx.moveTo(0, h);
        const phase = rnd() * 10;
        for (let x = 0; x <= w; x += 8) {
          ctx.lineTo(x, base - Math.sin(x / w * (2 + layer) + phase) * h * 0.05 - Math.sin(x / w * 7 + phase) * h * 0.015);
        }
        ctx.lineTo(w, h);
        ctx.fill();
      }
      break;
    }
    case 1: {
      // Arcs rising from the bottom edge.
      ctx.fillStyle = hex(bottom);
      ctx.fillRect(0, 0, w, h);
      const cx = w * (0.35 + rnd() * 0.3);
      const rings = 7;
      for (let i = rings; i > 0; i--) {
        const r = (Math.max(w, h) * 0.95 * i) / rings;
        ctx.fillStyle = i % 2 ? rgba(top, 0.55 + i * 0.05) : hex(bottom);
        ctx.beginPath();
        ctx.arc(cx, h * 1.02, r, Math.PI, 0);
        ctx.fill();
      }
      ctx.fillStyle = hex(sun);
      ctx.beginPath();
      ctx.arc(cx, h * 1.02, Math.max(w, h) * 0.12, Math.PI, 0);
      ctx.fill();
      break;
    }
    case 2: {
      // A huge, cropped day number.
      ctx.fillStyle = hex(top);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = hex(bottom);
      ctx.font = `800 ${Math.round(h * 1.15)}px "Big Shoulders", "Arial Narrow", sans-serif`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(day), w * 0.06, h * 1.02);
      ctx.fillStyle = hex(sun);
      ctx.beginPath();
      ctx.arc(w * 0.82, h * 0.2, Math.min(w, h) * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      // A dot grid with one bright spot.
      const g = ctx.createLinearGradient(0, h, w, 0);
      g.addColorStop(0, hex(bottom));
      g.addColorStop(1, hex(top));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const step = Math.round(Math.min(w, h) / 9);
      ctx.fillStyle = rgba(ink, 0.35);
      for (let y = step / 2; y < h; y += step) {
        for (let x = step / 2; x < w; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, step * 0.09, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = hex(sun);
      ctx.beginPath();
      ctx.arc(w * (0.25 + rnd() * 0.5), h * (0.25 + rnd() * 0.5), step * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Film grain, so flat colour doesn't look like a UI block.
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 18;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  return canvas;
}

// ------------------------------------------------------------------ special-day medallions

/** Small drawings for the medallions, centred on (x, y) and roughly `m` across. */
function drawMotif(ctx, motif, x, y, m, ink, fill) {
  ctx.save();
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = m * 0.09;
  const petal = (cx, cy, w, h, rot) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.bezierCurveTo(w / 2, -h / 4, w / 2, h / 4, 0, h / 2);
    ctx.bezierCurveTo(-w / 2, h / 4, -w / 2, -h / 4, 0, -h / 2);
    ctx.fill();
    ctx.restore();
  };
  const drop = (cx, cy, w, h) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.bezierCurveTo(cx + w * 0.6, cy + h * 0.05, cx + w * 0.5, cy + h / 2, cx, cy + h / 2);
    ctx.bezierCurveTo(cx - w * 0.5, cy + h / 2, cx - w * 0.6, cy + h * 0.05, cx, cy - h / 2);
    ctx.fill();
  };
  switch (motif) {
    case 'lotus': {
      petal(x, y - m * 0.08, m * 0.34, m * 0.7, 0);
      petal(x - m * 0.24, y + m * 0.02, m * 0.3, m * 0.6, -0.6);
      petal(x + m * 0.24, y + m * 0.02, m * 0.3, m * 0.6, 0.6);
      ctx.beginPath();
      ctx.moveTo(x - m * 0.42, y + m * 0.36);
      ctx.lineTo(x + m * 0.42, y + m * 0.36);
      ctx.stroke();
      break;
    }
    case 'krathong': {
      // Banana-leaf base, petals and a candle flame.
      ctx.beginPath();
      ctx.ellipse(x, y + m * 0.3, m * 0.48, m * 0.14, 0, 0, Math.PI);
      ctx.fill();
      petal(x - m * 0.26, y + m * 0.12, m * 0.24, m * 0.42, -0.5);
      petal(x + m * 0.26, y + m * 0.12, m * 0.24, m * 0.42, 0.5);
      petal(x, y + m * 0.08, m * 0.24, m * 0.42, 0);
      ctx.fillRect(x - m * 0.035, y - m * 0.28, m * 0.07, m * 0.24);
      drop(x, y - m * 0.42, m * 0.16, m * 0.24);
      break;
    }
    case 'drops': {
      drop(x - m * 0.28, y + m * 0.08, m * 0.26, m * 0.42);
      drop(x, y - m * 0.12, m * 0.3, m * 0.5);
      drop(x + m * 0.28, y + m * 0.1, m * 0.22, m * 0.36);
      break;
    }
    case 'flower': {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * m * 0.24, y + Math.sin(a) * m * 0.24, m * 0.19, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, y, m * 0.11, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'lantern': {
      ctx.fillRect(x - m * 0.04, y - m * 0.5, m * 0.08, m * 0.12);
      ctx.fillRect(x - m * 0.2, y - m * 0.4, m * 0.4, m * 0.08);
      ctx.beginPath();
      ctx.ellipse(x, y, m * 0.36, m * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - m * 0.2, y + m * 0.3, m * 0.4, m * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, y + m * 0.38);
      ctx.lineTo(x, y + m * 0.52);
      ctx.stroke();
      ctx.strokeStyle = fill;
      ctx.lineWidth = m * 0.05;
      for (const dx of [-0.14, 0, 0.14]) {
        ctx.beginPath();
        ctx.moveTo(x + dx * m, y - m * 0.26);
        ctx.lineTo(x + dx * m, y + m * 0.26);
        ctx.stroke();
      }
      break;
    }
    case 'elephant': {
      ctx.beginPath();
      ctx.ellipse(x + m * 0.08, y + m * 0.02, m * 0.34, m * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - m * 0.26, y - m * 0.08, m * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - m * 0.4, y - m * 0.06);
      ctx.quadraticCurveTo(x - m * 0.56, y + m * 0.18, x - m * 0.44, y + m * 0.34);
      ctx.lineWidth = m * 0.09;
      ctx.stroke();
      for (const dx of [-0.14, 0.02, 0.18, 0.32]) ctx.fillRect(x + dx * m - m * 0.05, y + m * 0.14, m * 0.1, m * 0.24);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x - m * 0.28, y - m * 0.12, m * 0.03, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'rice': {
      ctx.beginPath();
      ctx.moveTo(x - m * 0.1, y + m * 0.5);
      ctx.quadraticCurveTo(x - m * 0.05, y - m * 0.1, x + m * 0.28, y - m * 0.45);
      ctx.lineWidth = m * 0.06;
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const t = 0.25 + i * 0.12;
        const px = x - m * 0.1 + (m * 0.38) * t * t;
        const py = y + m * 0.5 - m * 0.95 * t;
        petal(px - m * 0.1, py, m * 0.1, m * 0.2, -0.9);
        petal(px + m * 0.1, py - m * 0.04, m * 0.1, m * 0.2, 0.5);
      }
      break;
    }
    case 'cake': {
      ctx.beginPath();
      ctx.roundRect(x - m * 0.44, y + m * 0.06, m * 0.88, m * 0.3, m * 0.05);
      ctx.roundRect(x - m * 0.3, y - m * 0.18, m * 0.6, m * 0.26, m * 0.05);
      ctx.fill();
      for (const dx of [-0.16, 0, 0.16]) {
        ctx.fillRect(x + dx * m - m * 0.025, y - m * 0.36, m * 0.05, m * 0.16);
        drop(x + dx * m, y - m * 0.46, m * 0.09, m * 0.14);
      }
      ctx.fillStyle = fill;
      ctx.fillRect(x - m * 0.44, y + m * 0.14, m * 0.88, m * 0.05);
      break;
    }
    case 'plus': {
      const t = m * 0.22;
      ctx.beginPath();
      ctx.roundRect(x - t / 2, y - m * 0.4, t, m * 0.8, t * 0.3);
      ctx.roundRect(x - m * 0.4, y - t / 2, m * 0.8, t, t * 0.3);
      ctx.fill();
      break;
    }
    case 'rays': {
      ctx.beginPath();
      ctx.arc(x, y, m * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = m * 0.07;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * m * 0.29, y + Math.sin(a) * m * 0.29);
        ctx.lineTo(x + Math.cos(a) * m * 0.46, y + Math.sin(a) * m * 0.46);
        ctx.stroke();
      }
      break;
    }
    default: {
      // 'star': a four-point sparkle with a small companion.
      const sparkle = (cx, cy, r) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.quadraticCurveTo(cx, cy, cx + r, cy);
        ctx.quadraticCurveTo(cx, cy, cx, cy + r);
        ctx.quadraticCurveTo(cx, cy, cx - r, cy);
        ctx.quadraticCurveTo(cx, cy, cx, cy - r);
        ctx.fill();
      };
      sparkle(x - m * 0.06, y + m * 0.04, m * 0.42);
      sparkle(x + m * 0.32, y - m * 0.3, m * 0.16);
    }
  }
  ctx.restore();
}

/** A round medallion: motif, day number and Thai name. Transparent outside the circle. */
export function makeMedallion({ day, thai, motif, color, ink }) {
  const s = 512;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  const c = s / 2;
  const r = s * 0.44; // leaves room for the hover zoom

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(c, c, r - 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  drawMotif(ctx, motif, c, c - r * 0.5, r * 0.36, ink, color);

  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 ${Math.round(r * 0.74)}px "Big Shoulders", "Arial Narrow", sans-serif`;
  ctx.fillText(day == null ? '' : String(day), c, c + r * 0.34);

  if (thai) {
    let size = Math.round(r * 0.19);
    const maxWidth = r * 1.45;
    do {
      ctx.font = `600 ${size}px "Kanit", sans-serif`;
      size -= 2;
    } while (ctx.measureText(thai).width > maxWidth && size > 14);
    ctx.fillText(thai, c, c + r * 0.66);
  }

  return canvas;
}
