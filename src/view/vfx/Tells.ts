// How a warning on the ground is drawn: as marked ground in the style, not a
// plain outline. Its shape and size are the rules' to the last unit (a
// circle on the ground is a circle, seen from above), and it stays the
// clearest thing on the field: it is drawn by the sharp camera, over every
// effect. Inside that shape:
//   - a hard dark-red edge with a broken, scratched line along it;
//   - the ground darkened, with a pattern that says what kind of blow it is:
//     a spade's lane raked, grave earth heaving in a ring, hoof marks down a
//     charge's lane, frost spreading for a gore;
//   - the time left, as a fill that grows from where the blow comes from and
//     reaches the edge as it lands, and a pulse that quickens in the last
//     half second. Never a number.
// A ring with a safe middle has that middle edged in pale, empty. A warning
// that has the hunter in it is a little brighter.

import type Phaser from 'phaser';
import type { Tell } from '../../game/hunt';

const EDGE = 0x8c1010;
const CHALK = 0xff5440;
const FILL = 0xff3a2a;
const DARK = 0x1a0404;
/** The one warning of the hunter's own side: a sapper's charge. */
const OURS = 0xffd858;
const SAFE = 0xe8dfc6;
const FROST = 0xbfe6ff;

/** The same numbers for the same warning every frame: its scratches and marks do not crawl. */
function dice(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type G = Phaser.GameObjects.Graphics;

/** True if a point on the ground is inside the warning's shape. */
export function inside(t: Tell, x: number, y: number): boolean {
  const dx = x - t.x;
  const dy = y - t.y;
  if (t.kind === 'ring') {
    const d = Math.hypot(dx, dy);
    return d <= t.r && d >= t.inner;
  }
  if (t.kind === 'cone') {
    const d = Math.hypot(dx, dy);
    if (d > t.r) return false;
    let a = Math.atan2(dy, dx) - t.angle;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    return Math.abs(a) <= t.half;
  }
  const along = dx * Math.cos(t.angle) + dy * Math.sin(t.angle);
  const across = -dx * Math.sin(t.angle) + dy * Math.cos(t.angle);
  return along >= 0 && along <= t.len && Math.abs(across) <= t.w / 2;
}

/** A line broken into scratches: dashes of uneven length with small gaps, a little off the true line. */
function scratch(g: G, pts: ReadonlyArray<readonly [number, number]>, r: () => number, width: number, color: number, alpha: number): void {
  g.lineStyle(width, color, alpha);
  for (let i = 0; i < pts.length - 1; i++) {
    if (r() < 0.22) continue;
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const a = 0.08 + r() * 0.15;
    const b = 0.72 + r() * 0.25;
    const j = (r() - 0.5) * 3;
    g.lineBetween(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a + j, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b - j);
  }
}

function circlePts(x: number, y: number, r: number, n: number): Array<[number, number]> {
  const p: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++) p.push([x + Math.cos((i / n) * Math.PI * 2) * r, y + Math.sin((i / n) * Math.PI * 2) * r]);
  return p;
}

function band(g: G, x: number, y: number, inner: number, outer: number, color: number, alpha: number): void {
  const n = 48;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= n; i++) pts.push({ x: x + Math.cos((i / n) * Math.PI * 2) * outer, y: y + Math.sin((i / n) * Math.PI * 2) * outer });
  for (let i = n; i >= 0; i--) pts.push({ x: x + Math.cos((i / n) * Math.PI * 2) * inner, y: y + Math.sin((i / n) * Math.PI * 2) * inner });
  g.fillStyle(color, alpha).fillPoints(pts as Phaser.Math.Vector2[], true);
}

function lane(g: G, t: Tell, len: number, color: number, alpha: number): void {
  const cx = Math.cos(t.angle);
  const cy = Math.sin(t.angle);
  const nx = -cy * (t.w / 2);
  const ny = cx * (t.w / 2);
  g.fillStyle(color, alpha).fillPoints([
    { x: t.x + nx, y: t.y + ny }, { x: t.x + cx * len + nx, y: t.y + cy * len + ny }, { x: t.x + cx * len - nx, y: t.y + cy * len - ny }, { x: t.x - nx, y: t.y - ny },
  ] as Phaser.Math.Vector2[], true);
}

/**
 * Draws one warning. `clock` makes the pulse; `hunter` is where the hunter stands, so that the warning they are in
 * is the brighter; `lair` says what the ground is (snow takes frost).
 */
export function drawTell(g: G, t: Tell, clock: number, hunter: { x: number; y: number }, lair: string): void {
  const k = Math.max(0, Math.min(1, 1 - t.left / t.of));
  const ours = !t.foe;
  const edge = ours ? 0x8a6a10 : EDGE;
  const chalk = ours ? OURS : CHALK;
  const fill = ours ? OURS : FILL;
  // In the last half second it beats, faster as the moment comes.
  const last = Math.max(0, Math.min(1, 1 - t.left / 0.5));
  const beat = last > 0 ? 0.5 + 0.5 * Math.sin(clock * (10 + 26 * last)) : 0;
  const on = inside(t, hunter.x, hunter.y) ? 1.25 : 1;
  const r = dice(t.id);
  const frost = lair === 'wood' && (t.attack === 'gore' || t.attack === 'stomp' || t.attack === 'bellow');

  if (t.kind === 'ring') {
    const solid = t.inner <= 0;
    // The ground inside, darkened.
    if (solid) g.fillStyle(DARK, 0.42).fillCircle(t.x, t.y, t.r);
    else band(g, t.x, t.y, t.inner, t.r, DARK, 0.42);
    // What kind: earth heaving in lumps for a grave, cracks out from the middle for a stomp or a burst, frost for the wood's.
    const n = Math.max(5, Math.round(t.r / 14));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.4;
      const d0 = solid ? t.r * (0.15 + r() * 0.2) : t.inner + 4;
      const d1 = t.r * (0.62 + r() * 0.3);
      if (frost) {
        // Frost: thin spikes in from the edge.
        const s = t.r - 4;
        g.fillStyle(FROST, 0.32).fillTriangle(t.x + Math.cos(a - 0.05) * s, t.y + Math.sin(a - 0.05) * s, t.x + Math.cos(a + 0.05) * s, t.y + Math.sin(a + 0.05) * s, t.x + Math.cos(a) * d1 * 0.7, t.y + Math.sin(a) * d1 * 0.7);
      } else if (t.attack === 'graves' || t.attack === 'moregraves' || t.attack === 'bury' || t.attack === 'grasp' || t.attack === 'thorns') {
        // Grave earth heaving: small dark lumps pushed up.
        const d = d0 + (d1 - d0) * r();
        g.fillStyle(0x3a0c08, 0.55).fillEllipse(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, 6 + r() * 6, 4 + r() * 3);
      } else {
        g.lineStyle(2, edge, 0.55).lineBetween(t.x + Math.cos(a) * d0, t.y + Math.sin(a) * d0, t.x + Math.cos(a + 0.12) * d1, t.y + Math.sin(a + 0.12) * d1);
      }
    }
    // The time: from the middle out (or from the safe ring out), reaching the edge as it lands.
    const reach = solid ? t.r * k : t.inner + (t.r - t.inner) * k;
    if (solid && reach > 2) g.fillStyle(fill, (0.22 + 0.18 * beat) * on).fillCircle(t.x, t.y, reach);
    else if (!solid && reach > t.inner + 1) band(g, t.x, t.y, t.inner, reach, fill, (0.22 + 0.18 * beat) * on);
    // The edge: hard and dark, with a scratched bright line just inside it.
    g.lineStyle(5 + 2 * beat, edge, 0.95).strokeCircle(t.x, t.y, t.r);
    scratch(g, circlePts(t.x, t.y, t.r - 5, Math.max(16, Math.round(t.r / 9))), r, 2.5, chalk, Math.min(1, (0.75 + 0.25 * beat) * on));
    if (!solid) {
      // The safe middle, plain to see: pale edge, nothing inside.
      g.lineStyle(4, edge, 0.95).strokeCircle(t.x, t.y, t.inner);
      scratch(g, circlePts(t.x, t.y, t.inner + 4, Math.max(12, Math.round(t.inner / 8))), r, 2, SAFE, 0.85);
    }
    return;
  }

  if (t.kind === 'cone') {
    g.fillStyle(DARK, 0.42).slice(t.x, t.y, t.r, t.angle - t.half, t.angle + t.half, false).fillPath();
    // Rake marks across the sweep, or frost.
    const n = Math.max(4, Math.round((t.r * t.half) / 22));
    for (let i = 0; i < n; i++) {
      const a = t.angle - t.half * 0.85 + ((i + 0.5) / n) * t.half * 1.7;
      const d0 = t.r * (0.3 + r() * 0.2);
      const d1 = t.r * (0.7 + r() * 0.22);
      if (frost) g.fillStyle(FROST, 0.3).fillTriangle(t.x + Math.cos(a - 0.03) * d1, t.y + Math.sin(a - 0.03) * d1, t.x + Math.cos(a + 0.03) * d1, t.y + Math.sin(a + 0.03) * d1, t.x + Math.cos(a) * d0, t.y + Math.sin(a) * d0);
      else g.lineStyle(2, edge, 0.55).lineBetween(t.x + Math.cos(a) * d0, t.y + Math.sin(a) * d0, t.x + Math.cos(a) * d1, t.y + Math.sin(a) * d1);
    }
    // The time: out from the boss, reaching the rim as it lands.
    if (t.r * k > 4) g.fillStyle(fill, (0.22 + 0.18 * beat) * on).slice(t.x, t.y, t.r * k, t.angle - t.half, t.angle + t.half, false).fillPath();
    g.lineStyle(5 + 2 * beat, edge, 0.95).slice(t.x, t.y, t.r, t.angle - t.half, t.angle + t.half, false).strokePath();
    const arc: Array<[number, number]> = [];
    const m = Math.max(8, Math.round((t.r * t.half * 2) / 18));
    for (let i = 0; i <= m; i++) {
      const a = t.angle - t.half + (i / m) * t.half * 2;
      arc.push([t.x + Math.cos(a) * (t.r - 5), t.y + Math.sin(a) * (t.r - 5)]);
    }
    scratch(g, arc, r, 2.5, chalk, Math.min(1, (0.75 + 0.25 * beat) * on));
    return;
  }

  // A lane: raked across for a spade, hoof marks pressed into it for a charge.
  lane(g, t, t.len, DARK, 0.42);
  const ux = Math.cos(t.angle);
  const uy = Math.sin(t.angle);
  const nx = -uy;
  const ny = ux;
  const charge = !!t.charge || t.attack === 'charge' || t.attack === 'herd' || t.attack === 'crossherd';
  const step = charge ? 46 : 26;
  for (let d = step * 0.6, i = 0; d < t.len - 8; d += step, i++) {
    const px = t.x + ux * d;
    const py = t.y + uy * d;
    if (charge) {
      // Two hoof marks, one each side of the middle, turned along the way.
      const side = (i % 2 === 0 ? 1 : -1) * t.w * 0.18;
      const hx = px + nx * side;
      const hy = py + ny * side;
      g.fillStyle(0x3a0c08, 0.7).fillEllipse(hx - ux * 6, hy - uy * 6, 11, 8).fillEllipse(hx + ux * 6, hy + uy * 6, 11, 8);
    } else {
      const w = t.w * (0.3 + r() * 0.12);
      g.lineStyle(2, edge, 0.55).lineBetween(px + nx * w - ux * 6, py + ny * w - uy * 6, px - nx * w + ux * 6, py - ny * w + uy * 6);
    }
  }
  // The time: down the lane from where the blow comes, reaching its end as it lands.
  if (k > 0.01) lane(g, t, t.len * k, fill, (0.22 + 0.18 * beat) * on);
  g.lineStyle(5 + 2 * beat, edge, 0.95);
  g.strokePoints([
    { x: t.x + nx * (t.w / 2), y: t.y + ny * (t.w / 2) }, { x: t.x + ux * t.len + nx * (t.w / 2), y: t.y + uy * t.len + ny * (t.w / 2) },
    { x: t.x + ux * t.len - nx * (t.w / 2), y: t.y + uy * t.len - ny * (t.w / 2) }, { x: t.x - nx * (t.w / 2), y: t.y - ny * (t.w / 2) },
  ] as Phaser.Math.Vector2[], true, true);
  const inset = t.w / 2 - 5;
  const sides: Array<Array<[number, number]>> = [[], []];
  const n = Math.max(6, Math.round(t.len / 18));
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * t.len;
    sides[0].push([t.x + ux * d + nx * inset, t.y + uy * d + ny * inset]);
    sides[1].push([t.x + ux * d - nx * inset, t.y + uy * d - ny * inset]);
  }
  for (const s of sides) scratch(g, s, r, 2.5, chalk, Math.min(1, (0.75 + 0.25 * beat) * on));
}
