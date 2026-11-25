// The shapes the effects are made of, drawn once at start onto the sheet
// with everything else, so that a spark is in the same batch as the figure
// it flies off. They are flat and hard edged, as the style is: a spark is a
// splinter, blood is a cut drop, dust is a many-cornered puff. They are
// drawn white, or in black where they are always black, and the effect
// tints them.

import type { Sheet } from '../art/Sheet';

type Ctx = CanvasRenderingContext2D;

/** A fixed run of numbers, so that the shapes are the same every time the game starts. */
function dice(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poly(c: Ctx, pts: Array<[number, number]>, fill: string): void {
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  c.fill();
}

/** A blob with a ragged, many-cornered edge round a middle. */
function lump(c: Ctx, cx: number, cy: number, rx: number, ry: number, corners: number, rough: number, r: () => number, fill: string): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < corners; i++) {
    const a = (i / corners) * Math.PI * 2 + (r() - 0.5) * 0.3;
    const k = 1 - rough + r() * rough;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  poly(c, pts, fill);
}

/** A crack: a jagged line that thins to nothing, with a branch or two. Drawn as filled wedges, never a stroke. */
function crack(c: Ctx, x: number, y: number, angle: number, len: number, w: number, r: () => number, depth: number): void {
  let px = x;
  let py = y;
  let a = angle;
  const steps = 5 + Math.floor(r() * 3);
  for (let i = 0; i < steps; i++) {
    const seg = len / steps;
    a += (r() - 0.5) * 0.9;
    const nx = px + Math.cos(a) * seg;
    const ny = py + Math.sin(a) * seg * 0.62;
    const w0 = w * (1 - i / steps);
    const w1 = w * (1 - (i + 1) / steps);
    const ox = -Math.sin(a);
    const oy = Math.cos(a) * 0.62;
    poly(c, [[px + ox * w0, py + oy * w0], [nx + ox * w1, ny + oy * w1], [nx - ox * w1, ny - oy * w1], [px - ox * w0, py - oy * w0]], '#000');
    if (depth > 0 && r() < 0.35) crack(c, nx, ny, a + (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.5), len * 0.4, w1 * 0.8, r, depth - 1);
    px = nx;
    py = ny;
  }
}

interface Made {
  w: number;
  h: number;
  /** Where it turns about, as shares of its width and height. */
  origin: [number, number];
  draw: (c: Ctx) => void;
}

const SHAPES: Record<string, Made> = {
  // A splinter of light or iron: long, pointed at the front, flying to the right.
  shard: { w: 34, h: 8, origin: [0.5, 0.5], draw: (c) => poly(c, [[0, 4], [8, 0], [34, 4], [8, 8]], '#fff') },
  // A chip of stone or bone, and a clod of earth or snow: tumbling bits.
  chip: { w: 16, h: 14, origin: [0.5, 0.5], draw: (c) => poly(c, [[2, 5], [9, 0], [16, 6], [12, 14], [3, 12]], '#fff') },
  clod: { w: 20, h: 16, origin: [0.5, 0.5], draw: (c) => lump(c, 10, 8, 9, 7, 9, 0.4, dice(3), '#fff') },
  // A drop of blood in flight, its point behind it.
  drop: { w: 22, h: 10, origin: [0.6, 0.5], draw: (c) => poly(c, [[0, 5], [12, 1], [18, 1], [22, 5], [18, 9], [12, 9]], '#fff') },
  // Blood on the ground, as the ground is seen from above at a slant: wider than it is tall.
  splat: {
    w: 56, h: 28, origin: [0.5, 0.5],
    draw: (c) => {
      const r = dice(11);
      lump(c, 28, 14, 18, 8, 13, 0.45, r, '#fff');
      for (let i = 0; i < 6; i++) {
        const a = r() * Math.PI * 2;
        const d = 20 + r() * 6;
        lump(c, 28 + Math.cos(a) * d, 14 + Math.sin(a) * d * 0.45, 3 + r() * 2, 2 + r(), 6, 0.3, r, '#fff');
      }
    },
  },
  // Cracks in the ground: one that runs, and a star of them where something fell.
  crack: { w: 120, h: 40, origin: [0.06, 0.5], draw: (c) => crack(c, 4, 20, 0, 112, 5, dice(21), 2) },
  burst: {
    w: 160, h: 100, origin: [0.5, 0.5],
    draw: (c) => {
      const r = dice(31);
      lump(c, 80, 50, 18, 11, 10, 0.5, r, '#000');
      for (let i = 0; i < 8; i++) crack(c, 80, 50, (i / 8) * Math.PI * 2 + r() * 0.4, 50 + r() * 26, 6, r, 1);
    },
  },
  // A furrow ploughed by a blow: a dark trench with ragged lips. Long, to be stretched along the line it was struck.
  furrow: {
    w: 160, h: 30, origin: [0, 0.5],
    draw: (c) => {
      const r = dice(41);
      const top: Array<[number, number]> = [];
      const bot: Array<[number, number]> = [];
      for (let i = 0; i <= 16; i++) {
        const x = (i / 16) * 160;
        const k = Math.sin((i / 16) * Math.PI) * 0.7 + 0.3;
        top.push([x, 15 - (5 + r() * 6) * k]);
        bot.push([x, 15 + (5 + r() * 6) * k]);
      }
      poly(c, [...top, ...bot.reverse()], '#000');
    },
  },
  // A hoof's mark in snow or earth: two cut crescents.
  hoof: {
    w: 26, h: 16, origin: [0.5, 0.5],
    draw: (c) => {
      poly(c, [[2, 8], [6, 2], [12, 1], [11, 8], [12, 15], [6, 14]], '#000');
      poly(c, [[24, 8], [20, 2], [14, 1], [15, 8], [14, 15], [20, 14]], '#000');
    },
  },
  // A scorch or an open pit: a dark, ragged patch.
  scorch: { w: 90, h: 44, origin: [0.5, 0.5], draw: (c) => lump(c, 45, 22, 42, 20, 16, 0.35, dice(51), '#000') },
  // Dust and smoke: a flat puff with corners.
  puff: { w: 48, h: 32, origin: [0.5, 0.5], draw: (c) => lump(c, 24, 16, 22, 14, 11, 0.35, dice(61), '#fff') },
  // Ash, embers and snow: small.
  ash: { w: 9, h: 7, origin: [0.5, 0.5], draw: (c) => poly(c, [[0, 3], [5, 0], [9, 2], [7, 7], [2, 6]], '#fff') },
  ember: { w: 10, h: 10, origin: [0.5, 0.5], draw: (c) => poly(c, [[5, 0], [10, 5], [5, 10], [0, 5]], '#fff') },
  leaf: { w: 16, h: 9, origin: [0.5, 0.5], draw: (c) => poly(c, [[0, 4], [5, 0], [12, 1], [16, 4], [11, 8], [4, 8]], '#fff') },
  // A streak: what is left in the air behind something fast.
  streak: { w: 64, h: 6, origin: [1, 0.5], draw: (c) => poly(c, [[0, 3], [56, 0], [64, 3], [56, 6]], '#fff') },
  // A crack of light, for what is breaking in the boss.
  glint: {
    w: 44, h: 18, origin: [0.5, 0.5],
    draw: (c) => poly(c, [[0, 9], [12, 6], [16, 0], [22, 7], [30, 4], [44, 9], [30, 12], [24, 18], [18, 11], [10, 13]], '#fff'),
  },
  // A crack of light, for what is breaking in the boss: a jagged split with a short branch, thin at its ends.
  split: {
    w: 48, h: 14, origin: [0.5, 0.5],
    draw: (c) => {
      poly(c, [[0, 7], [9, 5], [15, 8], [23, 4], [31, 7], [40, 5], [48, 7], [40, 8], [31, 9], [23, 7], [15, 10], [9, 8]], '#fff');
      poly(c, [[23, 5], [27, 0], [29, 1], [25, 6]], '#fff');
    },
  },
  // A bank of fog: long and low, with a stepped edge.
  fog: {
    w: 256, h: 54, origin: [0.5, 0.5],
    draw: (c) => {
      const r = dice(71);
      const top: Array<[number, number]> = [[0, 40]];
      for (let i = 1; i < 16; i++) top.push([(i / 16) * 256, 8 + r() * 22]);
      top.push([256, 40], [244, 52], [12, 52]);
      poly(c, top, '#fff');
    },
  },
  // A crow, wings up and wings down, seen side on, flying to the right.
  crow0: { w: 40, h: 26, origin: [0.5, 0.6], draw: (c) => poly(c, [[2, 16], [12, 13], [14, 2], [22, 12], [32, 12], [40, 15], [33, 18], [20, 20], [10, 19]], '#000') },
  crow1: { w: 40, h: 26, origin: [0.5, 0.4], draw: (c) => poly(c, [[2, 10], [12, 9], [20, 8], [32, 8], [40, 11], [32, 13], [24, 13], [16, 25], [12, 13]], '#000') },
  // A crow at rest on a wall or a branch.
  perch: { w: 22, h: 20, origin: [0.5, 1], draw: (c) => poly(c, [[2, 9], [8, 4], [12, 0], [16, 4], [22, 6], [16, 8], [17, 14], [14, 20], [9, 20], [6, 13]], '#000') },
};

/** Puts every shape of the effects on the sheet. Called once, before the sheet is sealed. */
export function keepVfxShapes(sheet: Sheet): void {
  for (const [name, s] of Object.entries(SHAPES)) {
    const canvas = document.createElement('canvas');
    canvas.width = s.w;
    canvas.height = s.h;
    s.draw(canvas.getContext('2d') as Ctx);
    sheet.keep(`vfx/${name}`, canvas, s.w, s.h, s.origin);
  }
}

/** The size each shape was drawn at, so that an effect can ask for it in the field's units. */
export const SHAPE_SIZE: Record<string, [number, number]> = Object.fromEntries(Object.entries(SHAPES).map(([k, s]) => [k, [s.w, s.h]]));
