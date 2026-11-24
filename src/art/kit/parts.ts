// The reusable parts units are assembled from. Every unit faces right; the
// game mirrors it to face left. All coordinates are on the 192 canvas with
// the feet at (96, 180).
//
// Faces: there are none. A head is a closed helmet with a dark slit, or a hood
// filled with shadow, or a mask or a wrap. Nothing here draws an eye, a mouth,
// a nose or a brow, and nothing should.

import { Doc, FEET_Y } from './draw';
import {
  BONE,
  GOLD,
  HOOD_INTERIOR,
  LEATHER,
  LINEN,
  OUTLINE,
  SHADOW_OPACITY,
  STEEL,
  WOOD,
  type Accent,
  type Material,
} from './palette';
import { Path, capsule, circle, ellipse, line, path, poly, roundRect, smooth, type Pt } from './path';

export const HIP_Y = 152;
export const NECK: Pt = [96, 106];
export const FEET: Pt = [96, FEET_Y];

/** A material at its shade tone all over: for the leg and arm on the far side. */
export function far(mat: Material): Material {
  return { fill: mat.shade, shade: mat.shade };
}

// ---------------------------------------------------------------- ground

export function shadow(d: Doc, rx = 36, ry = 8): void {
  d.flat('shadow', ellipse(96, FEET_Y + 1, rx, ry), OUTLINE, SHADOW_OPACITY);
}

// ---------------------------------------------------------------- legs

/** A stubby leg ending in a boot with its toe forward. `x` is the hip. */
export function leg(d: Doc, x: number, mat: Material, isFar = false): void {
  const p = path()
    .M(x - 10, HIP_Y - 4)
    .L(x + 9, HIP_Y - 4)
    .L(x + 9, 164)
    .C(x + 15, 164, x + 20, 168, x + 20, 174)
    .L(x + 20, 176)
    .Q(x + 20, 180, x + 16, 180)
    .L(x - 6, 180)
    .Q(x - 10, 180, x - 10, 176)
    .Z();
  d.piece('boot', p, isFar ? far(mat) : mat, { shade: isFar ? 0 : 4 });
}

export const LEG_BACK_X = 85;
export const LEG_FRONT_X = 104;

// ---------------------------------------------------------------- bodies

/** The barrel of a torso every armored or tunic-wearing unit shares. */
export function torsoPath(): Path {
  return smooth([
    [70, 105],
    [96, 101],
    [122, 105],
    [128, 128],
    [124, 152],
    [108, 159],
    [84, 159],
    [68, 152],
    [64, 128],
  ]);
}

/** A robe down to the ankles, wider at the hem. */
export function robePath(): Path {
  return smooth([
    [72, 105],
    [96, 101],
    [120, 105],
    [127, 130],
    [133, 164],
    [122, 173],
    [96, 175],
    [70, 173],
    [59, 164],
    [65, 130],
  ]);
}

export interface BeltOpts {
  y?: number;
  mat?: Material;
  buckle?: Material | null;
}

/** Drawn inside a torso: a band across it with a buckle toward the front. */
export function belt(d: Doc, opts: BeltOpts = {}): void {
  const y = opts.y ?? 138;
  d.piece('belt', roundRect(56, y, 80, 9, 0), opts.mat ?? LEATHER, { shade: 0 });
  const buckle = opts.buckle === undefined ? GOLD : opts.buckle;
  if (buckle) d.piece('buckle', roundRect(101, y - 2, 12, 13, 3), buckle, { shade: 3 });
}

/** An arm from shoulder to hand. The hand itself is drawn with what it holds. */
export function arm(d: Doc, name: string, from: Pt, to: Pt, mat: Material, width = 15): void {
  d.piece(name, capsule(from[0], from[1], to[0], to[1], width), mat, { shade: 3 });
}

/** A round pauldron on a shoulder. */
export function pauldron(d: Doc, x: number, y: number, mat: Material = STEEL, r = 11): void {
  d.piece('pauldron', ellipse(x, y, r + 1, r), mat, { shade: 3 });
}

// ---------------------------------------------------------------- hands

/** A mitten of a hand. It is drawn on top of whatever it grips. */
export function mitt(d: Doc, x: number, y: number, mat: Material = LEATHER, r = 7.5, name = 'hand'): void {
  d.piece(name, circle(x, y, r), mat, { shade: 3 });
}

// ---------------------------------------------------------------- heads

/** The dark where a face would be, cut to the shape it is drawn inside. */
function dark(d: Doc, name: string, p: Path): void {
  d.flat(name, p, HOOD_INTERIOR);
  d.line(`${name}-edge`, p);
}

/**
 * A round closed helm: a dome with one dark slit across the front and a ridge
 * down the middle. The Knight's.
 */
export function roundHelm(d: Doc, mat: Material = STEEL): void {
  const dome = smooth([
    [97, 50],
    [119, 57],
    [129, 78],
    [125, 99],
    [108, 108],
    [84, 108],
    [69, 99],
    [65, 78],
    [75, 57],
  ]);
  d.piece('helm', dome, mat, {
    shade: 6,
    inner: (c) => {
      // The slit runs off the front edge, which is what turns the head a little to the right.
      dark(c, 'slit', roundRect(94, 77, 44, 9, 4.5));
      c.line('ridge', line(110, 52, 110, 76));
      c.line('rim', smooth([[62, 97], [96, 101], [132, 95]], false));
    },
  });
  d.glint('glint', capsule(78, 64, 84, 59, 5));
}

/**
 * A low iron cap over a face plate with a T-shaped opening, and two big horns.
 * The Berserker's.
 */
export function hornedHelm(d: Doc, mat: Material = STEEL, horn: Material = BONE): void {
  const hornShape = (flip: boolean): Path => {
    const h = smooth([
      [118, 74, 'c'],
      [133, 66],
      [141, 48],
      [137, 30, 'c'],
      [129, 46],
      [121, 56],
      [112, 60, 'c'],
    ]);
    return flip ? h.mirrorX(97) : h;
  };
  d.piece('horn-far', hornShape(true), far(horn), { shade: 0 });
  const helm = smooth([
    [97, 54],
    [118, 60],
    [127, 80],
    [123, 100],
    [108, 108],
    [86, 108],
    [71, 100],
    [67, 80],
    [76, 60],
  ]);
  d.piece('helm', helm, mat, {
    shade: 6,
    inner: (c) => {
      const t = path()
        .M(94, 78)
        .L(134, 78)
        .L(134, 86)
        .L(116, 86)
        .L(116, 112)
        .L(107, 112)
        .L(107, 86)
        .L(94, 86)
        .Q(90, 82, 94, 78)
        .Z();
      dark(c, 'slit', t);
      c.line('band', smooth([[64, 73], [96, 69], [130, 72]], false));
    },
  });
  d.piece('horn', hornShape(false), horn, { shade: 4 });
  d.glint('glint', capsule(79, 67, 84, 63, 5));
}

/**
 * A deep hood with its opening to the front and nothing in it but shadow.
 * `tip` pulls the back of the hood out into a point.
 */
export function hood(d: Doc, mat: Material, tip = 10): void {
  const shape = smooth([
    [104, 51],
    [122, 60],
    [130, 82],
    [125, 102],
    [106, 109],
    [84, 109],
    [70, 104],
    [64 - tip * 0.5, 99],
    [58 - tip, 98, 'c'],
    [62 - tip * 0.3, 82],
    [67, 64],
    [83, 53],
  ]);
  d.piece('hood', shape, mat, {
    shade: 6,
    inner: (c) => {
      dark(c, 'opening', smooth([[112, 64], [126, 72], [131, 88], [124, 103], [108, 104], [97, 92], [99, 74]]));
    },
  });
  d.line('fold', smooth([[84, 60], [76, 74], [74, 90]], false));
}

/** A tall hood that ends in a bent point. The Mage's. */
export function pointedHood(d: Doc, mat: Material): void {
  const shape = smooth([
    [84, 16, 'c'],
    [98, 30],
    [116, 54],
    [128, 80],
    [124, 102],
    [106, 109],
    [84, 109],
    [69, 101],
    [66, 80],
    [78, 52],
    [80, 32],
  ]);
  d.piece('hood', shape, mat, {
    shade: 6,
    inner: (c) => {
      dark(c, 'opening', smooth([[112, 66], [126, 76], [130, 90], [123, 103], [107, 104], [97, 93], [100, 76]]));
    },
  });
  d.line('fold', smooth([[88, 40], [80, 62], [76, 88]], false));
}

/**
 * A round cowl with a band across the brow and a veil where a face would be.
 * The Cleric's.
 */
export function cowl(d: Doc, mat: Material, trim: Material = GOLD, veil: Material = LINEN): void {
  const shape = smooth([
    [97, 49],
    [120, 57],
    [130, 79],
    [127, 100],
    [110, 109],
    [84, 109],
    [67, 100],
    [64, 79],
    [74, 57],
  ]);
  d.piece('cowl', shape, mat, {
    shade: 6,
    inner: (c) => {
      c.piece('veil', smooth([[102, 66, 'c'], [140, 66, 'c'], [140, 114, 'c'], [106, 114], [97, 96]]), veil, {
        shade: 4,
        inner: (v) => v.piece('stripe', roundRect(113, 60, 9, 60, 0), trim, { shade: 0 }),
      });
      c.piece('band', smooth([[60, 62], [96, 58], [134, 62], [134, 71], [96, 68], [60, 72]]), trim, { shade: 0 });
    },
  });
}

// ---------------------------------------------------------------- weapons
// A weapon is drawn upright with its hand at the origin, then turned to how
// it is held at rest and moved to the hand. `at` does both.

export interface Grip {
  /** Where the hand is on the canvas. */
  hand: Pt;
  /** Degrees from upright, clockwise: positive leans the weapon forward. */
  angle: number;
}

function at(g: Grip): (p: Path) => Path {
  return (p) => p.rotate(g.angle).translate(g.hand[0], g.hand[1]);
}

export function sword(d: Doc, g: Grip, len = 60, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('blade', t(poly([[-7.5, -10], [-7.5, -len + 13], [0, -len], [7.5, -len + 13], [7.5, -10]])), STEEL, {
    shade: 4,
    inner: (c) => c.line('fuller', t(line(0, -12, 0, -len + 20))),
  });
  d.piece('pommel', t(circle(0, 13, 5)), GOLD, { shade: 0 });
  d.piece('guard', t(roundRect(-15, -15, 30, 8, 4)), GOLD, { shade: 3 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A two-handed axe with one great bearded blade. */
export function greatAxe(d: Doc, g: Grip, len = 78, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-3.5, -len, 7, len + 20, 3)), WOOD, { shade: 2 });
  const blade = smooth([
    [2, -len + 2, 'c'],
    [14, -len - 6],
    [30, -len - 10, 'c'],
    [36, -len + 14],
    [30, -len + 38, 'c'],
    [14, -len + 30],
    [2, -len + 24, 'c'],
  ]);
  d.piece('blade', t(blade), STEEL, { shade: 5 });
  d.piece('spike', t(poly([[-2, -len + 4], [-16, -len + 12], [-2, -len + 20]])), STEEL, { shade: 0 });
  d.piece('cap', t(roundRect(-6, -len - 4, 12, 8, 3)), GOLD, { shade: 0 });
  const upper = t(circle(0, -26, 7.5)).bounds();
  mitt(d, upper.x + upper.w / 2, upper.y + upper.h / 2, hand, 7.5, 'hand-upper');
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A bow held upright, its belly forward. The string is part of it. */
export function bow(d: Doc, g: Grip, hand: Material = LEATHER): void {
  const t = at(g);
  d.line('string', t(line(-9, -42, -9, 42)));
  const limb = path()
    .M(-12, -48)
    .C(6, -40, 15, -18, 14, 0)
    .C(15, 18, 6, 40, -12, 48)
    .L(-14, 38)
    .C(-2, 30, 4, 14, 4, 0)
    .C(4, -14, -2, -30, -14, -38)
    .Z();
  d.piece('limbs', t(limb), WOOD, { shade: 3 });
  d.piece('grip', t(roundRect(2, -9, 13, 18, 4)), LEATHER, { shade: 0 });
  mitt(d, g.hand[0] + 6, g.hand[1], hand);
}

/** A staff with a crook that cradles a glowing orb. */
export function orbStaff(d: Doc, g: Grip, glow: Accent, len = 74, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-3.5, -len, 7, len + 40, 3)), WOOD, { shade: 2 });
  d.piece('claw', t(smooth([[-12, -len - 2, 'c'], [-9, -len + 9], [0, -len + 12], [9, -len + 9], [12, -len - 2, 'c'], [5, -len + 3], [-5, -len + 3]])), GOLD, { shade: 0 });
  // A glow is two flat rings and a core: no blur, no gradient.
  d.flat('halo', t(circle(0, -len - 10, 15)), glow.light, 0.45);
  d.piece('orb', t(circle(0, -len - 10, 9.5)), glow, { shade: 3 });
  d.glint('glint', t(circle(-3, -len - 13, 2.5)));
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A censer on a chain. It hangs straight down from the hand and swings. */
export function censer(d: Doc, g: Grip, glow: Accent, drop = 24, hand: Material = LEATHER): void {
  const t = at(g);
  d.line('chain', t(line(0, 2, 0, drop)));
  d.flat('halo', t(circle(0, drop + 11, 18)), glow.light, 0.45);
  d.piece('bowl', t(smooth([[-12, drop + 8, 'c'], [-11, drop + 18], [0, drop + 24], [11, drop + 18], [12, drop + 8, 'c']])), GOLD, { shade: 3 });
  d.piece('lid', t(smooth([[-12, drop + 8, 'c'], [-7, drop], [0, drop - 4], [7, drop], [12, drop + 8, 'c']])), GOLD, { shade: 0 });
  d.flat('ember', t(roundRect(-7, drop + 6, 14, 4, 2)), glow.light);
  mitt(d, g.hand[0], g.hand[1], hand);
}

// ---------------------------------------------------------------- off hand

/** A big round shield: a steel rim, a wooden face, a boss in the middle. */
export function roundShield(d: Doc, cx: number, cy: number, r = 25): void {
  d.piece('rim', circle(cx, cy, r), STEEL, { shade: 5 });
  d.piece('face', circle(cx, cy, r - 7), WOOD, {
    shade: 4,
    inner: (c) => {
      c.line('plank-a', line(cx - 7, cy - r, cx - 7, cy + r));
      c.line('plank-b', line(cx + 8, cy - r, cx + 8, cy + r));
    },
  });
  d.piece('boss', circle(cx, cy, 7), GOLD, { shade: 3 });
  d.glint('glint', circle(cx - 2, cy - 2, 2));
}

/** The hand that draws the bow, with an arrow laid across it. */
export function nockedArrow(d: Doc, x: number, y: number, len = 54, hand: Material = LEATHER): void {
  arrowShape(d, x - 20, y, len);
  mitt(d, x, y, hand);
}

/** An arrow pointing right, its nock at (x, y). Shared with the projectile. */
export function arrowShape(d: Doc, x: number, y: number, len = 54): void {
  d.line('shaft', line(x + 6, y, x + len - 10, y));
  d.piece('fletch', poly([[x, y - 6.5], [x + 11, y - 6.5], [x + 16, y], [x + 11, y + 6.5], [x, y + 6.5], [x + 5, y]]), BONE, { shade: 0 });
  d.piece('head', poly([[x + len - 13, y - 7], [x + len + 2, y], [x + len - 13, y + 7]]), STEEL, { shade: 0 });
}

/** A closed book held against the body, its pages showing along two edges. */
export function book(d: Doc, cx: number, cy: number, cover: Material, hand: Material = LEATHER): void {
  d.piece('pages', roundRect(cx - 11, cy - 12, 28, 30, 3), BONE, { shade: 0 });
  d.piece('cover', roundRect(cx - 16, cy - 17, 28, 30, 3), cover, { shade: 4 });
  d.piece('clasp', roundRect(cx - 7, cy - 8, 10, 12, 2), GOLD, { shade: 0 });
  mitt(d, cx - 2, cy + 15, hand);
}

// ---------------------------------------------------------------- extras

/** A feather plume that springs from the top of a helm and trails behind. */
export function plume(d: Doc, mat: Material, base: Pt = [99, 54]): void {
  const [x, y] = base;
  const shape = smooth([
    [x + 5, y, 'c'],
    [x + 3, y - 14],
    [x - 10, y - 24],
    [x - 28, y - 22],
    [x - 42, y - 8],
    [x - 44, y + 8, 'c'],
    [x - 32, y - 2],
    [x - 20, y - 4],
    [x - 10, y + 2, 'c'],
  ]);
  d.piece('plume', shape, mat, { shade: 5 });
}

/** A quiver slung at the hip, its fletchings fanning out behind. */
export function quiver(d: Doc): void {
  const turn = (p: Path): Path => p.rotate(-38, 74, 150);
  d.piece('fletch-a', turn(poly([[61, 96], [69, 103], [69, 118], [61, 118]])), BONE, { shade: 0 });
  d.piece('fletch-b', turn(poly([[72, 92], [80, 99], [80, 118], [72, 118]])), BONE, { shade: 0 });
  d.piece('tube', turn(roundRect(59, 114, 24, 42, 6)), LEATHER, { shade: 4 });
  d.piece('band', turn(roundRect(59, 120, 24, 7, 0)), GOLD, { shade: 0 });
}

/** A cape that hangs from the shoulders down the back. */
export function cape(d: Doc, mat: Material): void {
  const shape = smooth([
    [78, 104, 'c'],
    [112, 104, 'c'],
    [106, 130],
    [100, 168, 'c'],
    [86, 162],
    [72, 170],
    [58, 164, 'c'],
    [62, 136],
  ]);
  d.piece('cape', shape, mat, { shade: 5 });
}

/** A mantle over the shoulders, under the head. */
export function mantle(d: Doc, mat: Material, trim: Material | null = GOLD): void {
  const shape = smooth([
    [70, 102],
    [96, 98],
    [122, 102],
    [133, 118],
    [128, 126, 'c'],
    [96, 130],
    [64, 126, 'c'],
    [59, 118],
  ]);
  d.piece('mantle', shape, mat, {
    shade: 4,
    inner: trim
      ? (c) => {
          c.piece('trim', smooth([[56, 119], [96, 123], [136, 119], [136, 132], [96, 136], [56, 132]]), trim, { shade: 0 });
        }
      : undefined,
  });
}

/** Drawn inside a robe: a band along its hem. */
export function hem(d: Doc, mat: Material, y = 163): void {
  d.piece('hem', smooth([[52, y], [96, y + 4], [140, y], [140, y + 9], [96, y + 13], [52, y + 9]]), mat, { shade: 0 });
}

/** A ruff of fur over the shoulders, with a ragged lower edge. */
export function furCollar(d: Doc, mat: Material): void {
  const shape = poly([
    [66, 104], [96, 99], [126, 104], [133, 116], [126, 127], [120, 120], [113, 130], [105, 121],
    [96, 131], [87, 121], [79, 130], [72, 120], [66, 127], [59, 116],
  ]);
  d.piece('fur', shape, mat, { shade: 4 });
}
