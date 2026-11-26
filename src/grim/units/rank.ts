// What a hunter wears for the hunts they have survived. The game gives each
// hunter a rank for hunting with them; each rank shows on the figure, so
// that a player sees a seasoned hunter at a glance, in the inn and on the
// field:
//
//   rank 2  a braided cord at the belt, knotted with the lodge's red
//   rank 3  a short cloak, black, its hem ragged
//   rank 4  the same cloak, and a trophy at the shoulder: a great claw on a thong
//   rank 5  the trophy, and a long cloak of the lodge's red edged in gilt thread
//
// These are parts like any other, with `rank` and `upto` on them (kit/unit.ts):
// the game draws a part when the hunter's rank is from `rank` to `upto`.
// Every hunter wears the same four things, cut to their own build by a few
// points on their body, so that a new hunter needs only those points.

import { cut } from '../kit/draw';
import { hem, rivets, stitches } from '../kit/figure';
import { BLOOD, BONE, LAMP, LEAD, LEATHER, SOOT, TALLOW } from '../kit/palette';
import { poly, type Pt } from '../kit/path';
import { part, type PartSpec, type UnitArt } from '../kit/unit';

/** Where a hunter's rank things sit on them. */
export interface RankFit {
  /** The back of the neck, where a cloak is tied. */
  neck: Pt;
  /** How far back the figure's back reaches, at the shoulder. */
  back: number;
  /** The belt, at the front hip, where the cord hangs. */
  belt: Pt;
  /** The near shoulder, where the trophy is tied. */
  shoulder: Pt;
}

/** A cloak hung from the neck down the back, behind everything: short to below the belt, or long to the calves. */
function cloak(fit: RankFit, long: boolean): PartSpec {
  const [nx, ny] = fit.neck;
  const b = fit.back;
  const foot = long ? 224 : fit.belt[1] + 28;
  // It flares well out behind, so that it shows past the back in profile, where a hunter is always seen.
  const flare = long ? 48 : 36;
  const name = long ? 'rank-mantle' : 'rank-cloak';
  return {
    ...part(name, 'extra', 'body', [nx, ny], (d) => {
      const tone = long ? BLOOD : SOOT;
      const front: Pt = [b + 26, foot - 4];
      const tail: Pt = [b - flare, foot];
      d.ink('cloak', poly([
        [nx + 12, ny + 8], [nx + 2, ny - 2], [nx - 12, ny + 2], [b - 4, ny + 16], [b - flare * 0.6, (ny + foot) / 2],
        tail,
        ...hem(tail, front, `${name}-hem`, long ? 7 : 6, 11).slice(1, -1),
        front, [b + 22, ny + 26],
      ]), tone, {
        // Only its far edge is in shadow, so that what shows past the back is its own color.
        dark: poly([[b - flare - 10, ny], [b - flare * 0.3, ny], ...cut([b - flare * 0.3, ny + 8], [b - flare * 0.55, foot + 4], `${name}-dark`, -1, 5), [b - flare - 10, foot + 10]]),
        mid: 3, cold: 2.6,
        inner: (c) => c.detail('folds', [[[b - 2, ny + 24], [b - flare * 0.5, foot - 8]], [[b + 8, ny + 30], [b - 2, foot - 6]]], tone, 2),
      });
      if (long) {
        // The gilt edge: the one thing a hunter of the last rank wears that catches the light like a lamp.
        d.pen('gilt-back', poly([[nx - 12, ny + 4], [b - 3, ny + 17], [b - flare * 0.6, (ny + foot) / 2], tail], false), 3, LAMP.mid);
        d.pen('gilt-hem', poly([tail, [(tail[0] + front[0]) / 2, foot + 3], front], false), 3, LAMP.mid);
      }
      // The tie at the throat: a knot of cord.
      d.ink('tie', poly([[nx + 8, ny + 4], [nx + 16, ny + 4], [nx + 16, ny + 11], [nx + 8, ny + 11]]), long ? LEAD : LEATHER, { dark: false, mid: 0, line: 1.4, heavy: 1.8 });
    }, 0.5),
    rank: long ? 5 : 3,
    ...(long ? {} : { upto: 4 }),
  };
}

/** The cord of rank: braided, looped through the belt, knotted with the lodge's red, its tails hanging. */
function cord(fit: RankFit): PartSpec {
  const [x, y] = fit.belt;
  return {
    ...part('rank-cord', 'extra', 'body', [x, y], (d) => {
      d.pen('loop', poly([[x - 4, y - 2], [x - 8, y + 10], [x - 2, y + 20], [x + 6, y + 12], [x + 4, y - 1]], false), 3.4, TALLOW.lit);
      d.strokes('braid', stitches([x - 7, y + 4], [x - 2, y + 18], 3, 3, 0.6), 1.2, TALLOW.mid);
      d.ink('knot', poly([[x - 6, y + 18], [x + 2, y + 17], [x + 3, y + 25], [x - 5, y + 26]]), BLOOD, { dark: false, mid: 0, line: 1.4, heavy: 1.8 });
      d.pen('tail-a', poly([[x - 4, y + 25], [x - 6, y + 38]], false), 2.8, TALLOW.lit);
      d.pen('tail-b', poly([[x + 1, y + 25], [x + 3, y + 36]], false), 2.8, TALLOW.lit);
    }, 0.6),
    rank: 2,
  };
}

/** A trophy tied at the shoulder: a great claw on a thong, ringed in iron. Not a skull: nothing on it could be a face. */
function trophy(fit: RankFit): PartSpec {
  const [x, y] = fit.shoulder;
  return {
    ...part('rank-trophy', 'extra', 'body', [x, y], (d) => {
      d.pen('thong', poly([[x - 6, y - 4], [x, y + 6], [x + 4, y + 12]], false), 2.4, LEATHER.mid);
      d.ink('ring', poly([[x, y + 9], [x + 8, y + 9], [x + 8, y + 15], [x, y + 15]]), LEAD, { dark: false, mid: 0, line: 1.4, heavy: 1.8 });
      // The claw, curved and longer than a hand.
      d.ink('claw', poly([[x - 1, y + 14], [x + 9, y + 13], [x + 12, y + 24], [x + 10, y + 36], [x + 4, y + 44], [x + 6, y + 34], [x + 4, y + 24]]), BONE, {
        dark: poly([[x - 4, y + 10], [x + 4, y + 10], [x + 6, y + 30], [x + 2, y + 48], [x - 4, y + 48]]),
        mid: 2, line: 1.8, heavy: 2.4, rim: 1.4,
        inner: (c) => c.detail('claw-rings', [[[x + 3, y + 20], [x + 11, y + 19]], [[x + 4, y + 27], [x + 11, y + 26]]], BONE, 1.4),
      });
      rivets(d, 'ring-nail', [x + 4, y + 12], [x + 4, y + 12], 1, 1.2);
    }, 0.3),
    rank: 4,
  };
}

/**
 * The hunter with their rank things: the cloaks hung first, behind everything; the cord laid over the body,
 * just after it; the trophy last, over all.
 */
export function ranked(unit: UnitArt, fit: RankFit): UnitArt {
  const parts = [...unit.parts];
  const shadow = parts.findIndex((p) => p.role === 'shadow');
  parts.splice(shadow + 1, 0, cloak(fit, false), cloak(fit, true));
  const body = parts.findIndex((p) => p.role === 'body');
  parts.splice(body + 1, 0, cord(fit));
  parts.push(trophy(fit));
  return { ...unit, parts };
}

/** The ranks there are, with what each adds: for the sheets and the guide. */
export const RANKS: ReadonlyArray<readonly [number, string]> = [
  [1, 'nothing yet'],
  [2, 'a braided cord at the belt'],
  [3, 'a short black cloak'],
  [4, 'a trophy at the shoulder'],
  [5, 'a long red cloak edged in gilt'],
];

/**
 * Where each hunter wears their rank things, read off their figures. A hunter not named here wears none,
 * which is how Brask, whom Amos replaced, is left as he was drawn.
 */
export const RANK_FITS: Record<string, RankFit> = {
  marta: { neck: [144, 82], back: 96, belt: [156, 150], shoulder: [152, 104] },
  jory: { neck: [146, 98], back: 100, belt: [152, 150], shoulder: [152, 116] },
  agnes: { neck: [140, 84], back: 104, belt: [150, 150], shoulder: [148, 106] },
  greta: { neck: [146, 80], back: 92, belt: [158, 150], shoulder: [156, 102] },
  ned: { neck: [152, 92], back: 100, belt: [152, 154], shoulder: [158, 112] },
  ida: { neck: [144, 82], back: 100, belt: [154, 156], shoulder: [152, 106] },
  silas: { neck: [146, 88], back: 92, belt: [168, 162], shoulder: [158, 110] },
  amos: { neck: [146, 86], back: 98, belt: [138, 158], shoulder: [156, 108] },
};
