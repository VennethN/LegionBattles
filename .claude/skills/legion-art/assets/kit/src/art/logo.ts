// The game's logo: LEGION in gold over a shield that is half one side's
// color and half the other's, two standards crossed behind it, and BATTLES
// on a ribbon under it. Drawn with the same pieces as everything else: the
// one dark line, the palette, a lit rim and a shade on each piece.
//
// A first version, of 24 November 2026, when the owner asked to "begin
// making the game's logo". It is drawn small, on the grid the grade badges'
// letters are drawn on, and written out three times that size, so that its
// line is as heavy for its letters as theirs is.
//
// `logoMark` is the shield and the standards alone, square, for where there
// is no room for words: a browser's tab, a portal's tile.

import { Doc, type PieceOpts } from './kit/draw';
import { BONE, CLOTH, GOLD, STEEL, WOOD, type Material } from './kit/palette';
import { Path, capsule, path, poly, star } from './kit/path';
import { LOGO_H, LOGO_SCALE, LOGO_W, MARK_SIZE } from './logoSize';

export { LOGO_H, LOGO_SCALE, LOGO_W, MARK_SIZE };

// The letters, each on a box 24 wide and 28 tall, as the grades' are (grades.ts): chunky, like the font's.
// `w` is how wide the letter is, for setting them side by side.
const LETTERS: Record<string, { w: number; draw: () => Path }> = {
  L: { w: 21, draw: () => poly([[1, 0], [9.5, 0], [9.5, 20.5], [21, 20.5], [21, 28], [1, 28]]) },
  E: { w: 22, draw: () => poly([[1, 0], [22, 0], [22, 7.5], [9.5, 7.5], [9.5, 10.3], [19, 10.3], [19, 17.7], [9.5, 17.7], [9.5, 20.5], [22, 20.5], [22, 28], [1, 28]]) },
  G: {
    w: 24,
    draw: () =>
      path()
        .M(23, 7.4).C(20.5, 2.2, 16.5, 0, 12.5, 0).C(4.5, 0, 0, 6, 0, 14).C(0, 22, 4.5, 28, 12.5, 28).C(17, 28, 21, 26.4, 23.6, 22.6)
        .L(23.6, 12).L(12.2, 12).L(12.2, 18.2).L(15.8, 18.2).L(15.8, 19.4)
        .C(15, 20.1, 14.1, 20.4, 12.8, 20.4).C(9.6, 20.4, 8.6, 17.4, 8.6, 14).C(8.6, 10.6, 9.6, 7.6, 12.6, 7.6).C(14.2, 7.6, 15.3, 8.6, 16.2, 11).Z(),
  },
  I: { w: 10.5, draw: () => poly([[1, 0], [9.5, 0], [9.5, 28], [1, 28]]) },
  O: {
    w: 24,
    draw: () =>
      path()
        .M(12, 0).C(19.5, 0, 24, 6, 24, 14).C(24, 22, 19.5, 28, 12, 28).C(4.5, 28, 0, 22, 0, 14).C(0, 6, 4.5, 0, 12, 0).Z()
        .M(12, 7.6).C(9.4, 7.6, 8.6, 10.6, 8.6, 14).C(8.6, 17.4, 9.4, 20.4, 12, 20.4).C(14.6, 20.4, 15.4, 17.4, 15.4, 14).C(15.4, 10.6, 14.6, 7.6, 12, 7.6).Z(),
  },
  N: { w: 24, draw: () => poly([[1, 0], [9.6, 0], [15.5, 12.4], [15.5, 0], [23, 0], [23, 28], [14.4, 28], [8.5, 15.6], [8.5, 28], [1, 28]]) },
  B: {
    w: 24,
    draw: () =>
      path()
        .M(0, 0).L(12.5, 0).C(19.5, 0, 22.5, 3, 22.5, 7.5).C(22.5, 10.5, 21, 12.5, 19, 13.6).C(22, 14.6, 24, 17, 24, 20.5).C(24, 25, 20.5, 28, 13.5, 28).L(0, 28).Z()
        .M(8.5, 6.6).L(8.5, 10.9).L(11.6, 10.9).C(13.6, 10.9, 14.5, 10, 14.5, 8.7).C(14.5, 7.4, 13.6, 6.6, 11.6, 6.6).Z()
        .M(8.5, 16.7).L(8.5, 21.4).L(12.5, 21.4).C(14.7, 21.4, 15.7, 20.5, 15.7, 19).C(15.7, 17.6, 14.7, 16.7, 12.5, 16.7).Z(),
  },
  A: {
    w: 24,
    draw: () =>
      path()
        .M(7.5, 0).L(16.5, 0).L(24, 28).L(15.5, 28).L(14.5, 23.5).L(9.5, 23.5).L(8.5, 28).L(0, 28).Z()
        .M(10.8, 17).L(13.2, 17).L(12, 10.5).Z(),
  },
  T: { w: 23, draw: () => poly([[0, 0], [23, 0], [23, 7.5], [15.75, 7.5], [15.75, 28], [7.25, 28], [7.25, 7.5], [0, 7.5]]) },
  S: {
    w: 24,
    draw: () =>
      path()
        .M(22.5, 8.4).C(21.5, 3, 17.5, 0, 12, 0).C(5.5, 0, 1.5, 3.5, 1.5, 8.8).C(1.5, 14, 5.5, 15.6, 11.2, 16.8)
        .C(14, 17.4, 15, 17.9, 15, 19.2).C(15, 20.5, 13.9, 21.2, 12.1, 21.2).C(9.8, 21.2, 8.6, 20, 8.3, 17.8)
        .L(0.5, 19.2).C(1.5, 25, 5.8, 28, 12.2, 28).C(19.2, 28, 23.3, 24.4, 23.3, 18.8).C(23.3, 13.6, 19.6, 11.8, 13.4, 10.6)
        .C(10.6, 10.1, 9.7, 9.7, 9.7, 8.5).C(9.7, 7.4, 10.6, 6.8, 12.2, 6.8).C(14, 6.8, 15, 7.7, 15.3, 9.6).Z(),
  },
};

/**
 * How the logo is painted: twice over. First every shape is drawn as a pale
 * line, wider than the dark one that will go round it. Then the pieces are
 * drawn over that. What shows of the first pass is a pale edge round the
 * whole logo, outside its dark line, so that it reads on a dark ground,
 * where the dark line alone is lost, as well as on a light one.
 */
interface Painter {
  pass: 'edge' | 'art';
  piece: (name: string, shape: Path, mat: Material, opts?: PieceOpts) => void;
  /** A shadow cast on what is behind: only in the second pass. */
  cast: (name: string, shape: Path) => void;
}
const EDGE = 10;

function painter(d: Doc, pass: 'edge' | 'art'): Painter {
  if (pass === 'edge') {
    return {
      pass,
      piece: (name, shape) => {
        d.line(`${name}-edge`, shape, BONE.fill, EDGE);
      },
      cast: () => {},
    };
  }
  return {
    pass,
    piece: (name, shape, mat, opts) => {
      d.piece(name, shape, mat, opts);
    },
    cast: (name, shape) => {
      d.shadeOver(name, shape, 1.2);
    },
  };
}

/** A word, its middle at `cx` and its top at `y`, each letter a piece of its own. */
function word(p: Painter, text: string, cx: number, y: number, k: number, gap: number, mat: Material, shade: number): void {
  const letters = [...text].map((ch) => LETTERS[ch]);
  const width = letters.reduce((n, l) => n + l.w * k, 0) + gap * (letters.length - 1);
  let x = cx - width / 2;
  letters.forEach((l, i) => {
    // Its shadow first, a little down and to the right, so that the word stands off what is behind it.
    p.cast(`${text}-${i}-cast`, l.draw().scale(k).translate(x + 2.5, y + 3.5));
    p.piece(`${text}-${i}`, l.draw().scale(k).translate(x, y), mat, { shade, holes: true });
    x += l.w * k + gap;
  });
}

/** A standard: a pole from its foot to its head, a spearhead on it, and a pennant in a side's color flying outward. */
function standard(p: Painter, name: string, foot: [number, number], head: [number, number], cloth: Material, out: 1 | -1): void {
  const [fx, fy] = foot;
  const [hx, hy] = head;
  p.piece(`${name}-pole`, capsule(fx, fy, hx, hy, 5.5), WOOD, { shade: 2 });
  // The pennant hangs from the pole just under its head.
  const along = 0.2;
  const px = hx + (fx - hx) * along;
  const py = hy + (fy - hy) * along;
  const qx = hx + (fx - hx) * (along + 0.34);
  const qy = hy + (fy - hy) * (along + 0.34);
  p.piece(`${name}-cloth`, poly([[px, py], [px + out * 40, py + 4], [px + out * 29, py + 15], [px + out * 42, py + 27], [qx, qy]]), cloth, { shade: 3 });
  const ux = (hx - fx) / Math.hypot(hx - fx, hy - fy);
  const uy = (hy - fy) / Math.hypot(hx - fx, hy - fy);
  p.piece(`${name}-blade`, poly([
    [hx + ux * 15, hy + uy * 15], [hx - uy * 6.5 + ux * 2, hy + ux * 6.5 + uy * 2], [hx - ux * 3, hy - uy * 3], [hx + uy * 6.5 + ux * 2, hy - ux * 6.5 + uy * 2],
  ]), STEEL, { shade: 2 });
}

/**
 * The shield: a gold rim, and inside it one side's color to the left and the
 * other's to the right. Its top is cut at the corners and dips to a point in
 * the middle, so that it is a shield by its top alone: in the logo a word
 * stands across its foot.
 */
function shield(p: Painter, d: Doc, cx: number, top: number, w: number, h: number): void {
  const shape = (inset: number): Path => {
    const l = cx - w / 2 + inset;
    const r = cx + w / 2 - inset;
    const t = top + inset;
    const b = top + h - inset * 1.3;
    const mid = t + (b - t) * 0.5;
    const cut = w * 0.13;
    const dip = h * 0.055;
    return path()
      .M(l + cut, t).L(cx, t + dip).L(r - cut, t).L(r, t + cut).L(r, mid)
      .C(r, mid + (b - mid) * 0.62, cx + (r - cx) * 0.5, b - (b - mid) * 0.16, cx, b)
      .C(cx - (cx - l) * 0.5, b - (b - mid) * 0.16, l, mid + (b - mid) * 0.62, l, mid)
      .L(l, t + cut).Z();
  };
  p.cast('shield-cast', shape(0).translate(3, 4));
  p.piece('shield-rim', shape(0), GOLD, { shade: 4 });
  // What is inside the rim has the rim round it: it needs no edge of its own.
  if (p.pass === 'edge') return;
  d.piece('shield-field', shape(8), CLOTH.blue, {
    shade: 5,
    inner: (c) => {
      // The other half: the other side.
      c.piece('shield-red', poly([[cx, top], [cx + w, top], [cx + w, top + h], [cx, top + h]]), CLOTH.red, { shade: 5, outline: false });
      c.line('shield-split', poly([[cx, top], [cx, top + h]], false));
    },
  });
  // What the two sides fight over, where they meet: a gold stud with four points, a star of the kind a win's experience is counted in.
  d.piece('shield-star', star(cx, top + h * 0.34, 4, w * 0.2, w * 0.085), GOLD, { shade: 2 });
}

function paintLogo(d: Doc, pass: 'edge' | 'art'): void {
  const p = painter(d, pass);
  const cx = LOGO_W / 2;
  // The standards end behind the word: nothing of them shows under it.
  standard(p, 'blue', [cx + 44, 104], [cx - 60, 12], CLOTH.blue, -1);
  standard(p, 'red', [cx - 44, 104], [cx + 60, 12], CLOTH.red, 1);
  shield(p, d, cx, 6, 96, 112);
  word(p, 'LEGION', cx, 62, 1.95, 4.5, GOLD, 5);
  // The ribbon BATTLES is written on: its two tails first, folded back, then the band over them.
  const ry = 131;
  const rw = 232;
  const far: Material = { fill: CLOTH.red.shade, shade: CLOTH.red.shade };
  p.piece('ribbon-tail-a', poly([[cx - rw / 2 + 14, ry + 9], [cx - rw / 2 - 26, ry + 9], [cx - rw / 2 - 14, ry + 27], [cx - rw / 2 - 26, ry + 45], [cx - rw / 2 + 14, ry + 45]]), far, { shade: 0 });
  p.piece('ribbon-tail-b', poly([[cx + rw / 2 - 14, ry + 9], [cx + rw / 2 + 26, ry + 9], [cx + rw / 2 + 14, ry + 27], [cx + rw / 2 + 26, ry + 45], [cx + rw / 2 - 14, ry + 45]]), far, { shade: 0 });
  p.cast('ribbon-cast', poly([[cx - rw / 2 + 3, ry + 4], [cx + rw / 2 + 3, ry + 4], [cx + rw / 2 + 3, ry + 44], [cx - rw / 2 + 3, ry + 44]]));
  p.piece('ribbon', poly([[cx - rw / 2, ry], [cx + rw / 2, ry], [cx + rw / 2, ry + 40], [cx - rw / 2, ry + 40]]), CLOTH.red, { shade: 5 });
  // The letters on the ribbon need no pale edge: the ribbon is under them.
  if (pass === 'art') word(p, 'BATTLES', cx, ry + 6, 1, 4, BONE, 3);
}

/** The whole logo. */
export function logo(): Doc {
  const d = new Doc('logo');
  paintLogo(d, 'edge');
  paintLogo(d, 'art');
  return d;
}

function paintMark(d: Doc, pass: 'edge' | 'art'): void {
  const p = painter(d, pass);
  const cx = MARK_SIZE / 2;
  // Room on every side for the pennants and the pale edge: nothing of it meets the square's sides.
  const dy = 14;
  standard(p, 'blue', [cx + 54, 124 + dy], [cx - 50, 14 + dy], CLOTH.blue, -1);
  standard(p, 'red', [cx - 54, 124 + dy], [cx + 50, 14 + dy], CLOTH.red, 1);
  shield(p, d, cx, 12 + dy, 86, 108);
}

/** The shield and the standards alone, on a square. */
export function logoMark(): Doc {
  const d = new Doc('logo-mark');
  paintMark(d, 'edge');
  paintMark(d, 'art');
  return d;
}

/** The logo's file, three times the size it is drawn. */
export function logoSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" id="logo" width="${LOGO_W * LOGO_SCALE}" height="${LOGO_H * LOGO_SCALE}" ` +
    `viewBox="0 0 ${LOGO_W} ${LOGO_H}">\n${logo().inner()}\n</svg>\n`
  );
}

export function logoMarkSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" id="logo-mark" width="${MARK_SIZE * 2}" height="${MARK_SIZE * 2}" ` +
    `viewBox="0 0 ${MARK_SIZE} ${MARK_SIZE}">\n${logoMark().inner()}\n</svg>\n`
  );
}
