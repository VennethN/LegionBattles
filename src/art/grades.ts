// The badge of a card's grade: its letter on a plate. Every place that shows
// a grade shows this badge, never the letter alone in a line of text.
//
// The grades fall into bands, and each band is dressed more grandly than the
// one below it, each with what the bands under it have. So a grade is told by
// its outline and by the studs under it as well as by its color:
//
//   iron     F, E   a plain plate
//   bronze   D, C   and a gloss on its upper half
//   silver   B      and a spur, a plain point, out of each end, and a stud under it
//   gold     A      and wings in place of the spurs, and two studs
//   ruby     S      and wings of four feathers, lifted, a rim of gold round the
//                   plate, three studs with the middle one biggest, and a crown
//                   over it with a stone in it
//
// A badge is drawn so that its plate's middle is the middle of its picture:
// what stands out of the plate stands out of both sides alike.

import { Doc } from './kit/draw';
import { BONE, BRONZE, GOLD, HIGHLIGHT, IRON, RUBY, STEEL, type Material } from './kit/palette';
import { Path, circle, path, poly, roundRect, smooth } from './kit/path';

export const GRADE_W = 132;
export const GRADE_H = 96;
/** The plate, which is what a badge's size is measured by. */
export const PLATE_W = 50;
export const PLATE_H = 42;
const CX = GRADE_W / 2;
const CY = 54;

/** The bands, from the plainest. A grade's place in GRADES picks its band. */
const BAND_OF = [0, 0, 1, 1, 2, 3, 4];
const PLATE: Material[] = [IRON, BRONZE, STEEL, GOLD, RUBY];

// The letters, each on a box 24 wide and 28 tall. Chunky, like the font's.
const LETTERS: Record<string, () => Path> = {
  F: () => poly([[1, 0], [22, 0], [22, 7.5], [9.5, 7.5], [9.5, 11], [19, 11], [19, 18.5], [9.5, 18.5], [9.5, 28], [1, 28]]),
  E: () => poly([[1, 0], [22, 0], [22, 7.5], [9.5, 7.5], [9.5, 10.3], [19, 10.3], [19, 17.7], [9.5, 17.7], [9.5, 20.5], [22, 20.5], [22, 28], [1, 28]]),
  D: () =>
    path()
      .M(0, 0).L(10, 0).C(21, 0, 24, 7, 24, 14).C(24, 21, 21, 28, 10, 28).L(0, 28).Z()
      .M(8.5, 7.5).L(8.5, 20.5).L(10.5, 20.5).C(14.5, 20.5, 15.5, 17, 15.5, 14).C(15.5, 11, 14.5, 7.5, 10.5, 7.5).Z(),
  C: () =>
    path()
      .M(23, 7).C(20.5, 2, 16.5, 0, 12.5, 0).C(4.5, 0, 0, 6, 0, 14).C(0, 22, 4.5, 28, 12.5, 28).C(16.5, 28, 20.5, 26, 23, 21)
      .L(16.2, 17).C(15.3, 19.4, 14.2, 20.4, 12.6, 20.4).C(9.6, 20.4, 8.6, 17.4, 8.6, 14).C(8.6, 10.6, 9.6, 7.6, 12.6, 7.6).C(14.2, 7.6, 15.3, 8.6, 16.2, 11).Z(),
  B: () =>
    path()
      .M(0, 0).L(12.5, 0).C(19.5, 0, 22.5, 3, 22.5, 7.5).C(22.5, 10.5, 21, 12.5, 19, 13.6).C(22, 14.6, 24, 17, 24, 20.5).C(24, 25, 20.5, 28, 13.5, 28).L(0, 28).Z()
      .M(8.5, 6.6).L(8.5, 10.9).L(11.6, 10.9).C(13.6, 10.9, 14.5, 10, 14.5, 8.7).C(14.5, 7.4, 13.6, 6.6, 11.6, 6.6).Z()
      .M(8.5, 16.7).L(8.5, 21.4).L(12.5, 21.4).C(14.7, 21.4, 15.7, 20.5, 15.7, 19).C(15.7, 17.6, 14.7, 16.7, 12.5, 16.7).Z(),
  A: () =>
    path()
      .M(7.5, 0).L(16.5, 0).L(24, 28).L(15.5, 28).L(14.5, 23.5).L(9.5, 23.5).L(8.5, 28).L(0, 28).Z()
      .M(10.8, 17).L(13.2, 17).L(12, 10.5).Z(),
  S: () =>
    path()
      .M(22.5, 8.4).C(21.5, 3, 17.5, 0, 12, 0).C(5.5, 0, 1.5, 3.5, 1.5, 8.8).C(1.5, 14, 5.5, 15.6, 11.2, 16.8)
      .C(14, 17.4, 15, 17.9, 15, 19.2).C(15, 20.5, 13.9, 21.2, 12.1, 21.2).C(9.8, 21.2, 8.6, 20, 8.3, 17.8)
      .L(0.5, 19.2).C(1.5, 25, 5.8, 28, 12.2, 28).C(19.2, 28, 23.3, 24.4, 23.3, 18.8).C(23.3, 13.6, 19.6, 11.8, 13.4, 10.6)
      .C(10.6, 10.1, 9.7, 9.7, 9.7, 8.5).C(9.7, 7.4, 10.6, 6.8, 12.2, 6.8).C(14, 6.8, 15, 7.7, 15.3, 9.6).Z(),
};

/** A wing of `n` feathers out of the plate's left end. Mirror it for the right. */
function wing(n: number, lift: number): Path[] {
  const out: Path[] = [];
  const x = CX - PLATE_W / 2 + 2;
  for (let i = n - 1; i >= 0; i--) {
    const len = 22 + i * 7;
    const y = CY + 8 - i * (7 + lift);
    out.push(smooth([[x, y - 5, 'c'], [x - len * 0.6, y - 9 - lift], [x - len, y - 6 - lift * 2, 'c'], [x - len * 0.55, y + 2], [x, y + 6, 'c']]));
  }
  return out;
}

export function drawGrade(d: Doc, grade: number, letter: string): void {
  const band = BAND_OF[Math.min(grade, BAND_OF.length - 1)];
  const mat = PLATE[band];
  const px = CX - PLATE_W / 2;
  const py = CY - PLATE_H / 2;
  const mirror = (p: Path): Path => p.mirrorX(CX);

  if (band === 2) {
    // A spur out of each end.
    const spur = poly([[px + 3, CY - 11], [px - 17, CY], [px + 3, CY + 11]]);
    d.piece('spur-left', spur, mat, { shade: 0 });
    d.piece('spur-right', mirror(spur), mat, { shade: 0 });
  }
  if (band >= 3) {
    const feathers = wing(band === 4 ? 4 : 3, band === 4 ? 1.5 : 0);
    feathers.forEach((f, i) => {
      d.piece(`wing-left-${i}`, f, band === 4 ? GOLD : BONE, { shade: 3 });
      d.piece(`wing-right-${i}`, mirror(f), band === 4 ? GOLD : BONE, { shade: 3 });
    });
  }
  if (band === 4) {
    // A rim of gold round the plate, and a crown over it with a stone in it.
    d.piece('rim', roundRect(px - 6, py - 6, PLATE_W + 12, PLATE_H + 12, 14), GOLD, { shade: 4 });
    d.piece('crown', poly([[CX - 19, py - 4], [CX - 22, py - 24], [CX - 10, py - 15], [CX, py - 30], [CX + 10, py - 15], [CX + 22, py - 24], [CX + 19, py - 4]]), GOLD, { shade: 3 });
    d.piece('stone', poly([[CX, py - 21], [CX + 5, py - 14], [CX, py - 7], [CX - 5, py - 14]]), RUBY, { shade: 0 });
  }

  d.piece('plate', roundRect(px, py, PLATE_W, PLATE_H, 10), mat, {
    shade: 5,
    inner: band >= 1 ? (c) => c.flat('gloss', roundRect(px - 2, py - 2, PLATE_W + 4, PLATE_H * 0.46, 8), HIGHLIGHT, 0.28) : undefined,
  });

  // Studs under the plate: none, none, one, two, three with the middle one biggest.
  const studs = band === 2 ? [0] : band === 3 ? [-9, 9] : band === 4 ? [-13, 0, 13] : [];
  studs.forEach((dx, i) => {
    const big = band === 4 && dx === 0;
    d.piece(`stud-${i}`, circle(CX + dx, py + PLATE_H + (big ? 5 : 4), big ? 6 : 4.5), band === 4 ? BONE : GOLD, { shade: 0 });
  });

  const glyph = (LETTERS[letter] ?? LETTERS.F)().translate(CX - 12, CY - 14);
  d.piece('letter', glyph, { fill: HIGHLIGHT, shade: HIGHLIGHT }, { shade: 0, holes: true });
}


