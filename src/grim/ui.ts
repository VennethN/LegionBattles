// Pieces of the interface, in the same hand as the rest: worn paper, wood
// and iron, with the same outline and the same hard shadow, torn edges and
// nail heads. And the style's own letters, cut as with a chisel or painted
// with a flat brush on a board: every corner a corner, heavy, upright. The
// game's name is set in them, and a game can set any heading in them with
// `word`; running text is the game's own font.

import { Doc, cut } from './kit/draw';
import { dice } from './kit/dice';
import { hem, rivets, stitches, stud } from './kit/figure';
import { BLOOD, BONE, GORE, LEAD, LEATHER, PAPER, RUST, SOOT, WOOD, type Tone } from './kit/palette';
import { Path, poly, type Pt } from './kit/path';
import type { Thing } from './things';

/** The letters, each on a box 30 tall and as wide as it says. A path inside a path is a hole. */
export const LETTERS: Record<string, { w: number; outer: Pt[]; holes?: Pt[][] }> = {
  A: { w: 22, outer: [[6, 0], [16, 0], [22, 30], [14, 30], [13, 24], [9, 24], [8, 30], [0, 30]], holes: [[[9.6, 18], [12.4, 18], [11, 9]]] },
  B: { w: 22, outer: [[0, 0], [15, 0], [21, 5], [21, 12], [18, 15], [22, 19], [22, 26], [16, 30], [0, 30]], holes: [[[8, 6], [13, 6], [14, 8], [14, 11], [12, 12], [8, 12]], [[8, 18], [13, 18], [15, 20], [15, 23], [13, 24], [8, 24]]] },
  C: { w: 20, outer: [[5, 0], [20, 0], [20, 8], [9, 8], [8, 9], [8, 21], [9, 22], [20, 22], [20, 30], [5, 30], [0, 25], [0, 5]] },
  D: { w: 22, outer: [[0, 0], [15, 0], [22, 6], [22, 24], [15, 30], [0, 30]], holes: [[[8, 7], [12, 7], [14, 9], [14, 21], [12, 23], [8, 23]]] },
  E: { w: 20, outer: [[0, 0], [20, 0], [20, 7], [8, 7], [8, 11], [17, 11], [17, 18], [8, 18], [8, 23], [20, 23], [20, 30], [0, 30]] },
  F: { w: 20, outer: [[0, 0], [20, 0], [20, 7], [8, 7], [8, 12], [17, 12], [17, 19], [8, 19], [8, 30], [0, 30]] },
  G: { w: 22, outer: [[5, 0], [20, 0], [20, 8], [9, 8], [8, 9], [8, 21], [9, 22], [14, 22], [14, 18], [11, 18], [11, 12], [22, 12], [22, 30], [5, 30], [0, 25], [0, 5]] },
  H: { w: 22, outer: [[0, 0], [8, 0], [8, 11], [14, 11], [14, 0], [22, 0], [22, 30], [14, 30], [14, 18], [8, 18], [8, 30], [0, 30]] },
  I: { w: 9, outer: [[0, 0], [9, 0], [9, 30], [0, 30]] },
  J: { w: 22, outer: [[10, 0], [22, 0], [22, 25], [17, 30], [4, 30], [0, 26], [0, 19], [8, 19], [8, 22], [13, 22], [14, 21], [14, 7], [10, 7]] },
  K: { w: 22, outer: [[0, 0], [8, 0], [8, 11], [14, 0], [22, 0], [15, 14], [22, 30], [14, 30], [9, 19], [8, 21], [8, 30], [0, 30]] },
  L: { w: 19, outer: [[0, 0], [8, 0], [8, 23], [19, 23], [19, 30], [0, 30]] },
  M: { w: 26, outer: [[0, 0], [8, 0], [13, 12], [18, 0], [26, 0], [26, 30], [19, 30], [19, 14], [15, 24], [11, 24], [7, 14], [7, 30], [0, 30]] },
  N: { w: 22, outer: [[0, 0], [7, 0], [15, 14], [15, 0], [22, 0], [22, 30], [15, 30], [7, 16], [7, 30], [0, 30]] },
  O: { w: 22, outer: [[5, 0], [17, 0], [22, 5], [22, 25], [17, 30], [5, 30], [0, 25], [0, 5]], holes: [[[8, 7], [14, 7], [14, 23], [8, 23]]] },
  P: { w: 21, outer: [[0, 0], [15, 0], [21, 5], [21, 14], [16, 19], [8, 19], [8, 30], [0, 30]], holes: [[[8, 6], [13, 6], [14, 8], [14, 11], [12, 12.5], [8, 12.5]]] },
  Q: { w: 23, outer: [[5, 0], [17, 0], [22, 5], [22, 24], [20, 26], [23, 30], [16, 30], [15, 29], [14, 30], [5, 30], [0, 25], [0, 5]], holes: [[[8, 7], [14, 7], [14, 23], [8, 23]]] },
  R: { w: 22, outer: [[0, 0], [15, 0], [21, 5], [21, 13], [17, 17], [22, 30], [14, 30], [10, 19], [8, 19], [8, 30], [0, 30]], holes: [[[8, 6], [13, 6], [14, 8], [14, 11], [12, 12], [8, 12]]] },
  S: { w: 22, outer: [[5, 0], [20, 0], [20, 7], [9, 7], [8, 8], [8, 10], [10, 12], [17, 12], [22, 17], [22, 25], [17, 30], [1, 30], [1, 23], [13, 23], [14, 22], [14, 20], [12, 18], [5, 18], [0, 13], [0, 5]] },
  T: { w: 22, outer: [[0, 0], [22, 0], [22, 7], [15, 7], [15, 30], [7, 30], [7, 7], [0, 7]] },
  U: { w: 22, outer: [[0, 0], [8, 0], [8, 22], [9, 23], [13, 23], [14, 22], [14, 0], [22, 0], [22, 25], [17, 30], [5, 30], [0, 25]] },
  V: { w: 22, outer: [[0, 0], [8, 0], [11, 18], [14, 0], [22, 0], [15, 30], [7, 30]] },
  W: { w: 28, outer: [[0, 0], [7, 0], [9, 16], [12, 4], [16, 4], [19, 16], [21, 0], [28, 0], [23, 30], [16, 30], [14, 18], [12, 30], [5, 30]] },
  X: { w: 22, outer: [[0, 0], [8, 0], [11, 9], [14, 0], [22, 0], [15, 15], [22, 30], [14, 30], [11, 21], [8, 30], [0, 30], [7, 15]] },
  Y: { w: 22, outer: [[0, 0], [8, 0], [11, 10], [14, 0], [22, 0], [15, 18], [15, 30], [7, 30], [7, 18]] },
  Z: { w: 22, outer: [[0, 0], [22, 0], [22, 7], [10, 23], [22, 23], [22, 30], [0, 30], [0, 23], [12, 7], [0, 7]] },
  ' ': { w: 10, outer: [] },
};

/** How wide a word is in these letters, at a size. */
export function wordWidth(text: string, k: number, gap: number): number {
  return [...text].reduce((n, ch) => n + (LETTERS[ch]?.w ?? 10) * k + gap, -gap);
}

/**
 * A word in the style's letters, its left end at x and its top at y. Every letter stands upright on one line:
 * they are cut, not thrown. Each has its corners knocked a little out of true, the same way every time, which
 * is what a chisel or a brush does and a ruler does not.
 */
export function word(d: Doc, text: string, x: number, y: number, k: number, tone: Tone, gap: number, line = 3.4): number {
  [...text].forEach((ch, i) => {
    const l = LETTERS[ch];
    if (!l) throw new Error(`no letter is cut for "${ch}"`);
    if (l.outer.length === 0) {
      x += l.w * k + gap;
      return;
    }
    const rnd = dice(`${text}-${i}-${ch}`);
    const place = (pts: Pt[]): Path => poly(pts.map(([px, py]) => [x + (px + rnd.range(-0.5, 0.5)) * k, y + (py + rnd.range(-0.4, 0.4)) * k] as Pt));
    const p = new Path();
    p.add(place(l.outer));
    for (const h of l.holes ?? []) p.add(place(h));
    // A letter has no shadow side: a third of it in black and it is no longer a letter. Its weight is in its
    // outline, and its foot is in the middle tone, as if lit from above.
    const foot = poly([[x - 6, y + 20 * k], [x + l.w * k + 6, y + 18.5 * k], [x + l.w * k + 6, y + 34 * k], [x - 6, y + 34 * k]]);
    d.ink(`${text}-${i}`, p, tone, { holes: true, dark: false, line, heavy: line * 1.4, inner: (c) => c.flat('foot', foot, tone.mid) });
    x += l.w * k + gap;
  });
  return x;
}

/** A wax seal: a blob pressed flat, with the lodge's mark cut in it, and two tails of ribbon. */
function seal(d: Doc, name: string, at: Pt, r: number): void {
  const [x, y] = at;
  d.ink(`${name}-ribbon-a`, poly([[x - r * 0.5, y + r * 0.4], [x - r * 0.1, y + r * 0.5], [x - r * 0.5, y + r * 2.1], [x - r * 0.8, y + r * 1.8], [x - r * 1.1, y + r * 2.1]]), BLOOD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
  d.ink(`${name}-ribbon-b`, poly([[x + r * 0.1, y + r * 0.5], [x + r * 0.6, y + r * 0.4], [x + r * 0.9, y + r * 1.9], [x + r * 0.5, y + r * 1.7], [x + r * 0.3, y + r * 2.0]]), BLOOD, { dark: 0.2, mid: 0, line: 1.8, heavy: 2.4 });
  d.ink(`${name}-wax`, poly([[x - r * 0.7, y - r], [x + r * 0.3, y - r * 1.1], [x + r, y - r * 0.5], [x + r * 1.1, y + r * 0.4], [x + r * 0.4, y + r], [x - r * 0.6, y + r * 0.9], [x - r * 1.1, y + r * 0.2]]), BLOOD, {
    dark: 0.3, mid: 3,
    inner: (c) => {
      c.flat(`${name}-press`, poly([[x - r * 0.5, y - r * 0.6], [x + r * 0.4, y - r * 0.6], [x + r * 0.6, y + r * 0.3], [x - r * 0.3, y + r * 0.5]]), BLOOD.mid);
      // The mark: a hunter's hook.
      c.strokes(`${name}-mark`, [[[x - r * 0.2, y - r * 0.4], [x + r * 0.2, y + r * 0.3]], [[x + r * 0.2, y + r * 0.3], [x - r * 0.15, y + r * 0.25]]], r * 0.22);
    },
  });
}

/** A contract, posted: a sheet of foxed paper nailed up at two corners, torn along its foot, dog-eared, headed and sealed. */
function bill(d: Doc): void {
  d.ink('sheet', poly([[10, 12], [186, 6], [206, 24], [212, 264], ...hem([212, 264], [6, 272], 'bill-foot', 10, 12).reverse().slice(1, -1), [6, 272]]), PAPER, {
    dark: false,
    inner: (c) => {
      // Foxing, the fold it was carried in, a ring where a mug stood on it.
      c.flat('fox-a', poly([[0, 0], [60, 0], [30, 30], [0, 40]]), PAPER.mid, 0.7);
      c.flat('fox-b', poly([[150, 230], [220, 200], [220, 280], [130, 280]]), PAPER.mid, 0.7);
      c.detail('fold', [[[8, 150], [212, 144]], [[112, 8], [108, 270]]], PAPER, 1.6);
      c.pen('mug', poly([[150, 190], [164, 184], [178, 190], [182, 204], [172, 214], [156, 214], [146, 204], [150, 190]], false), 2, PAPER.mid);
      // The frame the monster's picture is printed in, and the lines its terms are written on.
      c.pen('frame', poly([[28, 58], [190, 54], [192, 160], [30, 164], [28, 58]], false), 3);
      c.detail('frame-inner', [[[34, 64], [184, 60]], [[34, 64], [36, 158]]], PAPER, 1.6);
      c.detail('rules', [[[30, 184], [190, 181]], [[30, 200], [176, 197]], [[30, 216], [186, 213]], [[30, 232], [140, 230]]], PAPER, 2.4);
    },
  });
  // The corner that has come away from its nail.
  d.ink('dog-ear', poly([[186, 6], [206, 24], [188, 26]]), PAPER, { dark: poly([[180, 0], [210, 26], [180, 30]]), mid: 0, line: 2, heavy: 2.6 });
  word(d, 'CONTRACT', 110 - wordWidth('CONTRACT', 0.82, 2.5) / 2, 22, 0.82, { lit: '#14110f', mid: '#14110f' }, 2.5, 0.01);
  seal(d, 'seal', [172, 232], 18);
  d.ink('nail-a', poly([[20, 16], [30, 14], [32, 26], [22, 28]]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4, rim: 1.2 });
  d.ink('nail-b', poly([[104, 250], [114, 248], [116, 260], [106, 262]]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4, rim: 1.2 });
}

/** A button: a board split along its grain, with iron straps nailed across its ends. Words go across its middle. */
function button(d: Doc): void {
  d.ink('board', poly([[8, 12], [120, 8], [232, 6], [236, 30], [232, 34], [236, 58], [128, 62], [6, 64], [10, 40], [6, 36]]), WOOD, {
    dark: poly([[0, 46], ...cut([0, 48], [240, 42], 'button-dark', 1, 4), [240, 70], [0, 70]]),
    mid: 4,
    inner: (c) => {
      c.detail('grain', [[[40, 20], [120, 18]], [[90, 30], [200, 27]], [[50, 40], [110, 39]], [[130, 16], [206, 14]]], WOOD, 2);
      c.strokes('split', [[[232, 32], [176, 34]]], 2.6);
      c.detail('knot', [[[150, 24], [158, 28]], [[158, 28], [150, 32]]], WOOD, 2.4);
    },
  });
  const band = (name: string, x: number): void => {
    d.ink(name, poly([[x, 6], [x + 22, 5], [x + 23, 63], [x + 1, 64]]), LEAD, { dark: 0.3, mid: 2, line: 1.8, heavy: 2.4, rim: 1.4, inner: (c) => c.flat(`${name}-rust`, poly([[x, 40], [x + 23, 44], [x + 23, 64], [x, 64]]), RUST.mid, 0.7) });
    stud(d, `${name}-a`, [x + 11, 17], 2.8);
    stud(d, `${name}-b`, [x + 12, 34], 2.8);
    stud(d, `${name}-c`, [x + 12, 52], 2.8);
  };
  band('iron-a', 8);
  band('iron-b', 210);
}

/** A trophy's plate: a shield of boards on a hook, edged with nails, a strip below it for the monster's name. */
function trophyPlate(d: Doc): void {
  d.pen('cord', poly([[58, 26], [78, 6], [98, 26]], false), 2.6);
  d.ink('hook', poly([[72, 0], [84, 0], [86, 12], [70, 12]]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
  d.ink('plate', poly([[14, 24], [78, 16], [142, 24], [146, 100], [118, 156], [78, 178], [38, 156], [10, 100]]), WOOD, {
    dark: poly([[0, 0], [30, 0], ...cut([30, 16], [40, 184], 'plate-dark', -1, 8), [0, 184]]),
    mid: 6,
    inner: (c) => {
      c.detail('boards', [[[56, 20], [54, 170]], [[100, 20], [102, 170]]], WOOD, 2.2);
      c.detail('grain', [[[70, 40], [72, 90]], [[116, 50], [118, 110]], [[84, 110], [86, 160]]], WOOD, 1.6);
    },
  });
  rivets(d, 'nails-top', [24, 30], [132, 30], 6, 2.2);
  rivets(d, 'nails-l', [18, 46], [34, 148], 4, 2.2);
  rivets(d, 'nails-r', [138, 46], [122, 148], 4, 2.2);
  // The field the trophy hangs on, cut into the wood.
  d.ink('field', poly([[36, 46], [78, 40], [120, 46], [122, 98], [102, 136], [78, 148], [54, 136], [34, 98]]), SOOT, { dark: 0.2, mid: 4, line: 1.8, heavy: 2.4 });
  d.ink('label', poly([[26, 152], [130, 152], [126, 172], [78, 190], [30, 172]]), LEATHER, { dark: 0.3, mid: 3, inner: (c) => c.detail('label-stitch', stitches([34, 158], [122, 158], 9, 3, 0), LEATHER, 1.2) });
}

/** The name, painted on a board: BOSS in the lodge's red over HUNTERS in bone, the paint worn where the board has split. */
function title(d: Doc): void {
  // Two planks, split and nailed to a batten.
  d.ink('plank-a', poly([[14, 10], [200, 4], [428, 8], [434, 96], [300, 100], [10, 104]]), WOOD, {
    dark: poly([[0, 84], ...cut([0, 86], [440, 80], 'title-a', 1, 5), [440, 110], [0, 110]]), mid: 5,
    inner: (c) => c.detail('grain-a', [[[30, 24], [150, 20]], [[200, 60], [330, 56]], [[330, 22], [420, 22]], [[40, 80], [120, 78]]], WOOD, 2.2),
  });
  d.ink('plank-b', poly([[6, 108], [300, 104], [436, 100], [430, 196], [220, 204], [12, 200]]), WOOD, {
    dark: poly([[0, 180], ...cut([0, 182], [440, 176], 'title-b', 1, 5), [440, 210], [0, 210]]), mid: 5,
    inner: (c) => {
      c.detail('grain-b', [[[30, 124], [180, 120]], [[240, 180], [400, 176]], [[60, 184], [150, 182]]], WOOD, 2.2);
      c.strokes('split', [[[436, 150], [360, 154]]], 3);
    },
  });
  word(d, 'BOSS', 220 - wordWidth('BOSS', 2.7, 9) / 2, 12, 2.7, { lit: GORE.lit, mid: GORE.mid }, 9, 3.6);
  word(d, 'HUNTERS', 220 - wordWidth('HUNTERS', 2.3, 6) / 2, 116, 2.3, BONE, 6, 3.6);
  // Where the paint has worn off along the grain.
  d.strokes('wear', [[[120, 40], [150, 39]], [[250, 70], [300, 68]], [[90, 150], [130, 149]], [[300, 168], [350, 166]]], 2.4, WOOD.lit);
  for (const [i, p] of ([[22, 22], [22, 86], [418, 22], [420, 84], [20, 124], [22, 186], [420, 118], [418, 182]] as Pt[]).entries()) stud(d, `nail-${i}`, p, 3.4);
}

/** The whole alphabet, as a board to read the letters off. */
function alphabet(d: Doc): void {
  d.ink('board', poly([[4, 6], [462, 2], [466, 126], [2, 130]]), SOOT, { dark: false });
  word(d, 'ABCDEFGHIJKLM', 16, 14, 1.3, BONE, 4, 2.4);
  word(d, 'NOPQRSTUVWXYZ', 16, 74, 1.3, BONE, 4, 2.4);
}

export const UI: Thing[] = [
  { id: 'bill', set: 'ui', width: 222, height: 292, origin: [110, 146], draw: bill },
  { id: 'button', set: 'ui', width: 244, height: 72, origin: [122, 36], draw: button },
  { id: 'trophy-plate', set: 'ui', width: 156, height: 196, origin: [78, 98], draw: trophyPlate },
  { id: 'title', set: 'ui', width: 444, height: 214, origin: [222, 107], draw: title },
  { id: 'alphabet', set: 'ui', width: 470, height: 134, origin: [235, 67], draw: alphabet },
];
