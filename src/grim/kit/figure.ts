// What people are built of in the Grim style: limbs, boots, hands, a head
// with its eyes lost in shadow. A figure is not assembled from a catalogue,
// as the Legion's soldiers are: each is drawn for itself, with these for the
// pieces every body has.
//
// People are heavy: broad in the shoulder, short in the leg, big in the hand
// and the boot, with a small head sunk between the shoulders and a stance
// that carries weight. On the hunters' canvas the feet are at y 240, the
// hips near 176, the shoulders near 104 and the chin no higher than they are.

import { Doc, TO_LIGHT, cut, torn, type InkOpts } from './draw';
import { INK, type Tone } from './palette';
import { Path, poly, type Pt } from './path';

/**
 * A length of limb from one joint to the next, wider at one end than the other. `belly` swells it in the
 * middle on its upper side, as a muscle or a full sleeve does: a limb that is a plain box is a table leg.
 */
export function limb(a: Pt, b: Pt, wa: number, wb: number, belly = 0): Path {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  // The belly is on the side toward the light, so that it catches it.
  if (nx * TO_LIGHT[0] + ny * TO_LIGHT[1] < 0) {
    nx = -nx;
    ny = -ny;
  }
  const mx = a[0] + dx * 0.42;
  const my = a[1] + dy * 0.42;
  const wm = (wa + wb) / 2;
  const pts: Pt[] = [[a[0] + nx * wa * 0.5, a[1] + ny * wa * 0.5]];
  if (belly) pts.push([mx + nx * (wm * 0.5 + belly), my + ny * (wm * 0.5 + belly)]);
  pts.push([b[0] + nx * wb * 0.5, b[1] + ny * wb * 0.5], [b[0] - nx * wb * 0.5, b[1] - ny * wb * 0.5]);
  if (belly) pts.push([mx - nx * (wm * 0.5 + belly * 0.3), my - ny * (wm * 0.5 + belly * 0.3)]);
  pts.push([a[0] - nx * wa * 0.5, a[1] - ny * wa * 0.5]);
  return poly(pts);
}

/**
 * The dark of a limb: the side of it that is turned from the light, all along its length. A limb leans any way,
 * so its dark cannot be "the back of its box", as a standing piece's is. `share` is how much of its width is dark.
 */
export function limbDark(a: Pt, b: Pt, wa: number, wb: number, seed: string, share = 0.5): Path {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  // Turn the normal to point away from the light.
  if (nx * TO_LIGHT[0] + ny * TO_LIGHT[1] > 0) {
    nx = -nx;
    ny = -ny;
  }
  const w = Math.max(wa, wb);
  const off = w * (0.5 - share);
  const a0: Pt = [a[0] - nx * off - (dx / len) * 3, a[1] - ny * off - (dy / len) * 3];
  const b0: Pt = [b[0] - nx * off + (dx / len) * 3, b[1] - ny * off + (dy / len) * 3];
  // The teeth point back toward the light, whichever way the limb runs.
  const into: 1 | -1 = (-dy / len) * -nx + (dx / len) * -ny > 0 ? 1 : -1;
  return poly([...cut(a0, b0, seed, into, Math.min(4, w * 0.2)), [b0[0] + nx * w, b0[1] + ny * w], [a0[0] + nx * w, a0[1] + ny * w]]);
}

/** A point part of the way from one to another. */
export function between(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * An arm: a full upper arm, a forearm that tapers to a cuff, and a big hand. The elbow is a corner with a notch
 * cut into its inside, and the under side of the whole arm is black.
 */
export function arm(d: Doc, name: string, shoulder: Pt, elbow: Pt, hand: Pt, sleeve: Tone, glove: Tone, width = 12, opts: InkOpts = {}): void {
  // A limb is thin, so its line is finer than a body's: at a body's weight an arm would be all line.
  const fine = { line: 2.2, heavy: 3, mid: 2.5 };
  d.ink(`${name}-upper`, limb(shoulder, elbow, width * 1.1, width * 0.9, width * 0.14), sleeve, { dark: limbDark(shoulder, elbow, width * 1.2, width, `${name}-u`, 0.4), ...fine, ...opts });
  d.ink(`${name}-fore`, limb(elbow, hand, width * 0.95, width * 0.72, width * 0.1), sleeve, { dark: limbDark(elbow, hand, width, width, `${name}-f`, 0.4), ...fine, ...opts });
  // The notch inside the elbow, where the sleeve folds.
  const ex = elbow[0] - TO_LIGHT[0] * width * 0.5;
  const ey = elbow[1] - TO_LIGHT[1] * width * 0.5;
  d.strokes(`${name}-fold`, [[[ex, ey], [elbow[0] + TO_LIGHT[0] * width * 0.2, elbow[1] + TO_LIGHT[1] * width * 0.2]]], width * 0.34);
  const deg = (Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]) * 180) / Math.PI;
  fist(d, `${name}-fist`, hand, glove, width * 0.86, deg);
}

/**
 * A closed hand, big: a block with knuckles along its far edge, a thumb across it, and the fingers cut in.
 * `deg` is which way the arm it is on runs.
 */
export function fist(d: Doc, name: string, at: Pt, tone: Tone, r = 7, deg = 0): void {
  const [x, y] = at;
  const T = (px: number, py: number): Pt => {
    const a = (deg * Math.PI) / 180;
    return [x + (px * Math.cos(a) - py * Math.sin(a)) * r, y + (px * Math.sin(a) + py * Math.cos(a)) * r];
  };
  d.ink(name, poly([T(-1, -0.72), T(0.1, -1), T(0.62, -0.92), T(0.82, -0.5), T(1.08, -0.42), T(1.1, 0.08), T(0.88, 0.2), T(0.96, 0.66), T(0.4, 0.98), T(-0.7, 0.9), T(-1.02, 0.24)]), tone, {
    dark: poly([T(-1.4, 0.3), T(1.4, 0.42), T(1.4, 1.4), T(-1.4, 1.4)]),
    mid: 2,
    line: 2.2,
    heavy: 3,
  });
  d.strokes(`${name}-fingers`, [[T(0.86, -0.46), T(0.2, -0.36)], [T(0.92, 0.14), T(0.24, 0.16)]], r * 0.22);
}

/**
 * A boot seen from the side, standing on the ground at `sole` (the middle of its sole), toe to the right.
 * Its sole is ink: a boot's foot is the heaviest line a figure has.
 */
export function boot(d: Doc, name: string, sole: Pt, top: Pt, tone: Tone, len = 30, shaft = 13): void {
  const [x, y] = sole;
  const heel = x - len * 0.42;
  const toe = x + len * 0.58;
  d.ink(name, poly([
    [top[0] - shaft * 0.56, top[1] + 1], [top[0] + shaft * 0.5, top[1] - 1], [x + shaft * 0.46, y - 13], [toe - 6, y - 10], [toe, y - 4], [toe, y], [heel, y], [heel - 2, y - 10],
  ]), tone, {
    // The back of the boot and all under the ankle is black: it stands in its own shadow.
    dark: poly([[heel - 8, top[1] - 4], [x - shaft * 0.1, top[1] - 4], [x - shaft * 0.02, y - 14], [x + shaft * 0.5, y - 8], [toe + 4, y - 5], [toe + 4, y + 4], [heel - 8, y + 4]]),
    mid: 3,
    heavy: 4.4,
  });
  d.black(`${name}-sole`, poly([[heel - 2, y - 3], [toe + 1, y - 3], [toe + 1, y + 1.5], [heel - 2, y + 1.5]]));
  // The crease across the instep.
  d.strokes(`${name}-crease`, [[[x + shaft * 0.44, y - 13], [x - shaft * 0.1, y - 9]]], 2.6);
}

export interface FaceOpts {
  /** How tall the head is. 30 is a hunter's. */
  size?: number;
  /** False to leave the mouth out, for a head whose jaw is covered. */
  mouth?: boolean;
  /** A beard or a chin strap is drawn by whoever has one. This is only how long the jaw is, from 0.8 to 1.3. */
  jaw?: number;
  /** False for a head whose ear is under a hood or a helm. */
  ear?: boolean;
  /** True for an old cut across the cheek. */
  scar?: boolean;
}

/**
 * A head in profile, looking right, about its middle. There is a brow, a nose and a jaw, and where the
 * eye would be there is only the brow's shadow: no eye is ever drawn. The skull's top is plain, as a hat,
 * a hood or hair goes over it.
 */
export function face(d: Doc, name: string, at: Pt, tone: Tone, o: FaceOpts = {}): void {
  const k = (o.size ?? 30) / 30;
  const j = o.jaw ?? 1;
  const [cx, cy] = at;
  const P = (x: number, y: number): Pt => [cx + x * k, cy + y * k];
  const skull = poly([
    P(-10, -11), P(-5, -15), P(5, -15), P(9, -11), P(11.5, -6.5), P(9.5, -4), P(11, -2), P(15.5, 3), P(11.5, 4.5), P(12, 7.5),
    P(10.5, 8.5), P(11, 10.5), P(8.5, 13 * j), P(2, 14.5 * j), P(-5, 9), P(-9, 6),
  ]);
  d.ink(name, skull, tone, {
    // The back of the head and under the jaw are dark; the brow's shadow is given by hand below.
    dark: poly([P(-14, -18), ...cut(P(-4, -17), P(-1, 16), `${name}-back`, -1, 4 * k), P(-14, 18)]),
    mid: 3 * k,
    inner: (c) => {
      // The planes of the face, a step off the skin: the cheek under its bone, the side of the nose, the hollow under the lip.
      c.flat(`${name}-cheek-plane`, poly([P(1, 1.5), P(7, 0.5), P(9, 4), P(7.5, 9), P(2, 12 * j), P(-1, 7)]), tone.mid);
      c.flat(`${name}-chin-plane`, poly([P(6, 10.5), P(11, 10), P(8.5, 13 * j), P(4, 13.6 * j)]), tone.mid);
      // Where the eye would be: the shadow under the brow, running back to the temple and down the cheek.
      c.black(`${name}-socket`, poly([P(12, -7), P(-2, -8), P(-1, -1), P(4, 1.5), P(7, -1), P(10.5, -2.2)]));
      // The line from nose to mouth, the mouth, and the line of the jaw.
      c.strokes(`${name}-lines`, [[P(9.5, 4.5), P(7.5, 8.5)], [P(-3, 8), P(4, 13 * j)]], 1.8 * k);
      if (o.mouth ?? true) c.strokes(`${name}-mouth`, [[P(12, 7.8), P(5.5, 8.8)]], 2.2 * k);
      if (o.scar) c.scratch(`${name}-scar`, [[P(5, -3), P(9, 6)]], 1.4 * k);
    },
  });
  // The wing of the nose, and the ear: a small shape with its hollow, back where the jaw turns.
  d.strokes(`${name}-nostril`, [[P(11.5, 4.5), P(8.5, 2.5)]], 1.8 * k);
  if (o.ear ?? true) {
    d.ink(`${name}-ear`, poly([P(-5, -2), P(-1.5, -3), P(0, 1), P(-1.5, 5.5), P(-4.5, 4)]), tone, { dark: false, line: 1.4, heavy: 1.8 });
    d.strokes(`${name}-ear-hollow`, [[P(-3.6, -0.6), P(-2, 3.6)]], 1.6 * k);
  }
}

/** A neck, from under the jaw into the collar. */
export function neck(d: Doc, name: string, at: Pt, tone: Tone, size = 30): void {
  const k = size / 30;
  const [cx, cy] = at;
  d.ink(name, poly([[cx - 6 * k, cy + 6 * k], [cx + 5 * k, cy + 9 * k], [cx + 7 * k, cy + 22 * k], [cx - 8 * k, cy + 22 * k]]), tone, { dark: 0.5, mid: 2 });
}

/** The blot a figure stands on: a flat dark shape with a ragged far end, not a tidy ellipse. */
export function blot(d: Doc, at: Pt, w: number, h = 9): void {
  const [x, y] = at;
  d.blot('blot', poly([
    [x - w * 0.5, y + 1], [x - w * 0.36, y - h * 0.5], [x - w * 0.1, y - h * 0.62], [x + w * 0.24, y - h * 0.5], [x + w * 0.5, y - h * 0.1],
    [x + w * 0.42, y + h * 0.45], [x + w * 0.1, y + h * 0.62], [x - w * 0.3, y + h * 0.5],
  ]));
}

/** A ragged lower edge for cloth, from left to right: the points of a hem that has been dragged through things. */
export function hem(a: Pt, b: Pt, seed: string, depth = 8, every = 12): Pt[] {
  return torn(a, b, seed, 1, depth, every);
}

/** Short marks across a line from a to b: stitches along a seam, the rungs of a lacing, the bars of a grate. */
export function stitches(a: Pt, b: Pt, n: number, len = 4, skew = 0.3): Array<[Pt, Pt]> {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  const out: Array<[Pt, Pt]> = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = a[0] + dx * t;
    const y = a[1] + dy * t;
    out.push([[x - nx * len * 0.5 - (dx / l) * len * skew, y - ny * len * 0.5 - (dy / l) * len * skew], [x + nx * len * 0.5 + (dx / l) * len * skew, y + ny * len * 0.5 + (dy / l) * len * skew]]);
  }
  return out;
}

/** Points evenly along a line, ends left out: where rivets go on a band. */
export function along(a: Pt, b: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) out.push(between(a, b, (i + 0.5) / n));
  return out;
}

/** A row of nail heads from a to b. */
export function rivets(d: Doc, name: string, a: Pt, b: Pt, n: number, r = 1.5): void {
  along(a, b, n).forEach((p, i) => stud(d, `${name}-${i}`, p, r));
}

/** A strap from a to b, with its edge stitched, and a buckle part of the way along if asked. */
export function strap(d: Doc, name: string, a: Pt, b: Pt, w: number, tone: Tone, buckle?: number, metal?: Tone): void {
  d.ink(name, limb(a, b, w, w), tone, {
    dark: limbDark(a, b, w, w, name, 0.36), mid: 0, line: 1.8, heavy: 2.4,
    inner: (c) => c.detail(`${name}-stitch`, stitches(between(a, b, 0.06), between(a, b, 0.94), Math.max(3, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 7)), w * 0.36, 0), tone, 1.2),
  });
  if (buckle !== undefined && metal) {
    const [x, y] = between(a, b, buckle);
    const k = w * 0.75;
    d.ink(`${name}-buckle`, poly([[x - k, y - k], [x + k, y - k * 0.9], [x + k * 0.9, y + k], [x - k * 0.9, y + k * 0.9]]), metal, { dark: 0.3, mid: 0, line: 1.6, heavy: 2 });
    d.black(`${name}-pin`, poly([[x - k * 0.5, y - 0.8], [x + k * 0.7, y - 0.4], [x + k * 0.7, y + 0.8], [x - k * 0.5, y + 0.6]]));
  }
}

/** A pouch on a belt: a bag with a flap and a toggle. `at` is the middle of its top. */
export function pouch(d: Doc, name: string, at: Pt, w: number, h: number, tone: Tone): void {
  const [x, y] = at;
  d.ink(name, poly([[x - w * 0.5, y], [x + w * 0.5, y], [x + w * 0.56, y + h * 0.7], [x + w * 0.3, y + h], [x - w * 0.36, y + h], [x - w * 0.56, y + h * 0.7]]), tone, {
    dark: 0.36, mid: 2, line: 1.8, heavy: 2.4,
    inner: (c) => {
      c.flat(`${name}-flap`, poly([[x - w * 0.6, y - 1], [x + w * 0.6, y - 1], [x + w * 0.5, y + h * 0.42], [x, y + h * 0.56], [x - w * 0.5, y + h * 0.42]]), tone.mid);
      c.detail(`${name}-seam`, stitches([x - w * 0.4, y + h * 0.9], [x + w * 0.34, y + h * 0.9], 4, 2.4, 0), tone, 1.1);
    },
  });
  stud(d, `${name}-toggle`, [x, y + h * 0.5], 1.6);
}

/** A chain from a to b: links, one flat and one edge on, as a chain is seen. */
export function chain(d: Doc, name: string, a: Pt, b: Pt, link = 5): void {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const n = Math.max(2, Math.round(l / link));
  const ux = (b[0] - a[0]) / l;
  const uy = (b[1] - a[1]) / l;
  const marks: Array<[Pt, Pt]> = [];
  for (let i = 0; i < n; i++) {
    const p = between(a, b, i / n);
    const q = between(a, b, (i + 1) / n);
    if (i % 2 === 0) marks.push([[p[0] - uy * 1.6, p[1] + ux * 1.6], [q[0] + uy * 1.6, q[1] - ux * 1.6]]);
    else marks.push([[p[0] + uy * 1.6, p[1] - ux * 1.6], [q[0] - uy * 1.6, q[1] + ux * 1.6]]);
  }
  d.pen(name, poly([a, b], false), 1.6);
  d.strokes(`${name}-links`, marks, 3.2);
}

/** A rivet, a buckle's pin, a nail head: a dot of ink. */
export function stud(d: Doc, name: string, at: Pt, r = 1.6): void {
  d.black(name, poly([[at[0] - r, at[1]], [at[0], at[1] - r], [at[0] + r, at[1]], [at[0], at[1] + r]]));
}

export { INK };
