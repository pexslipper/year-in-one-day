import { seededRandom } from '../utils.js';

/**
 * Spreads cards out so each one gets a clear view.
 *
 * Things further away look smaller and closer to the centre, so two cards at
 * different depths can cover each other even if they're far apart in space.
 * For every card we try a grid of spots across the screen and, for each spot,
 * fly an imaginary camera past it, measuring how much it overlaps anything
 * nearby at each step. The spot with the least overlap wins, as long as the
 * card fits on screen.
 */

const D_REF = 1200; // spots are defined as screen positions at this distance
const NEAR = 450; // overlap is only counted while both cards are this far away…
const FAR = 2300; // …and closer than this, which is when they're readable
const STEP = 115;
const FIT_DEPTH = 1150; // a card must fit on screen when it's this far away
const PAD = 14; // breathing room around each card
const SAFE = { x0: -0.95, x1: 0.95, y0: -0.76, y1: 0.8 }; // inside the top bar and month rail

function grow(r) {
  return { x0: r.x0 - PAD, x1: r.x1 + PAD, y0: r.y0 - PAD, y1: r.y1 + PAD };
}

/** How much two cards cover each other, summed over camera positions as you fly past. */
function overlap(a, za, b, zb) {
  let cost = 0;
  for (let d = NEAR; d <= FAR; d += STEP) {
    const db = za + d - zb; // the camera sits at za + d
    if (db < NEAR || db > FAR) continue;
    const ia = 1 / d;
    const ib = 1 / db;
    const w = Math.min(a.x1 * ia, b.x1 * ib) - Math.max(a.x0 * ia, b.x0 * ib);
    if (w <= 0) continue;
    const h = Math.min(a.y1 * ia, b.y1 * ib) - Math.max(a.y0 * ia, b.y0 * ib);
    if (h <= 0) continue;
    const areaA = (a.x1 - a.x0) * (a.y1 - a.y0) * ia * ia;
    const areaB = (b.x1 - b.x0) * (b.y1 - b.y0) * ib * ib;
    cost += (w * h) / Math.min(areaA, areaB);
  }
  return cost;
}

/** Share of the card that falls off screen at FIT_DEPTH. */
function offscreen(r, tan, aspect) {
  const sx = 1 / (FIT_DEPTH * tan * aspect);
  const sy = 1 / (FIT_DEPTH * tan);
  const x0 = r.x0 * sx;
  const x1 = r.x1 * sx;
  const y0 = r.y0 * sy;
  const y1 = r.y1 * sy;
  const inW = Math.max(0, Math.min(x1, SAFE.x1) - Math.max(x0, SAFE.x0));
  const inH = Math.max(0, Math.min(y1, SAFE.y1) - Math.max(y0, SAFE.y0));
  return 1 - (inW * inH) / ((x1 - x0) * (y1 - y0));
}

/**
 * items: things with { z, kind, side, globalIndex, bounds(), setPosition(x, y) }.
 * fixed: things that stay put, with { z, worldRect() }.
 */
export function arrange(items, { aspect, tan, fixed = [] }) {
  const W = D_REF * tan * aspect;
  const H = D_REF * tan;
  const placed = fixed.map((f) => ({ z: f.z, rect: grow(f.worldRect()) }));
  const sorted = [...items].sort((a, b) => b.z - a.z);
  const span = FAR - NEAR;

  for (const item of sorted) {
    const local = item.bounds();
    const rnd = seededRandom(9000 + item.globalIndex * 131);
    const neighbours = placed.filter((p) => Math.abs(p.z - item.z) < span);
    const isProject = item.kind === 'project';
    let best = null;
    let bestCost = Infinity;

    for (let iu = -6; iu <= 6; iu++) {
      for (let iv = -6; iv <= 6; iv++) {
        const u = iu * 0.125;
        const v = iv * 0.14;
        // Projects keep to their own side; date cards stay out of the middle,
        // which is where the month names are and where the camera flies.
        if (isProject && u * item.side < 0.2) continue;
        if (!isProject && Math.abs(u) < 0.22 && Math.abs(v) < 0.3) continue;

        const x = (u + (rnd() - 0.5) * 0.05) * W;
        const y = (v + (rnd() - 0.5) * 0.05) * H;
        const rect = { x0: x + local.x0, x1: x + local.x1, y0: y + local.y0, y1: y + local.y1 };

        let cost = offscreen(rect, tan, aspect) * 6;
        if (cost >= bestCost) continue;
        const padded = grow(rect);
        for (const p of neighbours) {
          cost += overlap(padded, item.z, p.rect, p.z);
          if (cost >= bestCost) break;
        }
        // Small preferences break ties: projects near the middle band,
        // date cards slightly favour the sky above the path.
        cost += isProject ? 0.08 * Math.abs(v) + 0.05 * Math.abs(Math.abs(u) - 0.42) : v < 0 ? 0.04 : 0;
        cost += rnd() * 0.02;
        if (cost < bestCost) {
          bestCost = cost;
          best = { x, y, rect: padded };
        }
      }
    }

    if (best) {
      item.setPosition(best.x, best.y);
      placed.push({ z: item.z, rect: best.rect });
    }
  }
}
