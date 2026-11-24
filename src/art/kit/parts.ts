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
  IRON,
  LEATHER,
  LINEN,
  OUTLINE,
  SHADOW_OPACITY,
  STEEL,
  WOOD,
  type Accent,
  type Material,
} from './palette';
import { Path, capsule, circle, ellipse, line, path, poly, roundRect, smooth, star, type Pt } from './path';

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

/** A cape that hangs from the shoulders and billows out behind. */
export function cape(d: Doc, mat: Material): void {
  const shape = smooth([
    [78, 104, 'c'],
    [112, 104, 'c'],
    [108, 132],
    [104, 166, 'c'],
    [88, 160],
    [68, 170],
    [44, 164, 'c'],
    [50, 140],
    [60, 116],
  ]);
  d.piece('cape', shape, mat, {
    shade: 5,
    inner: (c) => c.line('fold', smooth([[66, 124], [58, 146], [56, 166]], false)),
  });
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

// ================================================================ more heads

function domePath(): Path {
  return smooth([[97, 50], [119, 57], [129, 78], [125, 99], [108, 108], [84, 108], [69, 99], [65, 78], [75, 57]]);
}

/** A wide-brimmed kettle hat over a mail coif that covers the face. The Militia's. */
export function kettleHelm(d: Doc, mat: Material = STEEL, coif: Material = IRON): void {
  d.piece('coif', smooth([[72, 74], [96, 70], [122, 74], [128, 92], [121, 106], [98, 110], [76, 106], [68, 92]]), coif, {
    shade: 5,
    inner: (c) => dark(c, 'slit', roundRect(94, 80, 44, 9, 4.5)),
  });
  d.piece('dome', smooth([[77, 74, 'c'], [79, 58], [97, 49], [115, 58], [117, 74, 'c']]), mat, { shade: 4 });
  d.piece('brim', smooth([[56, 75], [96, 68], [138, 75], [139, 81], [96, 85], [55, 81]]), mat, { shade: 3 });
  d.glint('glint', capsule(86, 60, 91, 56, 4.5));
}

/** A closed helm with one upright slit, a gold brow and a wing swept back from each temple. The Paladin's. */
export function wingedHelm(d: Doc, mat: Material = STEEL, wing: Material = BONE): void {
  const wingShape = smooth([
    [82, 76, 'c'], [70, 66], [54, 54], [40, 34, 'c'], [56, 42], [56, 30, 'c'], [70, 44], [74, 34, 'c'], [84, 52], [92, 70, 'c'],
  ]);
  d.piece('wing-far', wingShape.translate(22, -6), far(wing), { shade: 0 });
  d.piece('helm', domePath(), mat, {
    shade: 6,
    inner: (c) => {
      dark(c, 'slit', roundRect(108, 72, 9, 32, 4.5));
      c.piece('brow', smooth([[60, 62], [96, 58], [134, 62], [134, 71], [96, 68], [60, 72]]), GOLD, { shade: 0 });
    },
  });
  d.piece('wing', wingShape, wing, { shade: 4 });
  d.glint('glint', capsule(92, 82, 96, 78, 4.5));
}

/** A head wound round with cloth, a dark gap where it parts, and the ends knotted behind. The Cutpurse's. */
export function faceWrap(d: Doc, mat: Material): void {
  d.piece('tail-a', smooth([[72, 78, 'c'], [56, 78], [42, 88, 'c'], [56, 90], [70, 88, 'c']]), far(mat), { shade: 0 });
  d.piece('tail-b', smooth([[72, 86, 'c'], [58, 92], [48, 106, 'c'], [62, 102], [72, 94, 'c']]), mat, { shade: 3 });
  d.piece('wrap', domePath(), mat, {
    shade: 6,
    inner: (c) => {
      dark(c, 'gap', roundRect(92, 73, 46, 12, 6));
      c.line('fold-a', smooth([[68, 66], [88, 58], [112, 56]], false));
      c.line('fold-b', smooth([[70, 96], [92, 92], [126, 96]], false));
    },
  });
}

/** A broad hat pulled low over a scarf: between them, only shadow. The Poacher's. */
export function brimHat(d: Doc, hat: Material, scarf: Material, band: Material = GOLD): void {
  const face = ellipse(98, 86, 28, 23);
  d.flat('shadow-under', face, HOOD_INTERIOR);
  d.line('shadow-under-edge', face);
  d.piece('scarf', smooth([[68, 88], [84, 84], [112, 84], [128, 88], [126, 100], [112, 109], [84, 109], [70, 100]]), scarf, {
    shade: 4,
    inner: (c) => c.line('fold', smooth([[74, 96], [98, 92], [124, 96]], false)),
  });
  d.piece('crown', smooth([[76, 72, 'c'], [77, 54], [96, 47], [115, 54], [117, 72, 'c']]), hat, {
    shade: 4,
    inner: (c) => c.piece('band', roundRect(70, 62, 54, 8, 0), band, { shade: 0 }),
  });
  d.piece('brim', smooth([[50, 73], [96, 64], [144, 73], [145, 79], [96, 81], [49, 79]]), hat, { shade: 3 });
}

/** A sack with a slit cut in it, gathered and tied at the top and at the neck. The Bruiser's. */
export function sackHood(d: Doc, mat: Material = LINEN, rope: Material = WOOD): void {
  d.piece('gather', smooth([[88, 54, 'c'], [80, 34], [92, 40], [100, 30], [106, 40], [116, 36], [108, 54, 'c']]), mat, { shade: 3 });
  d.piece('sack', smooth([[76, 54, 'c'], [98, 50], [120, 54, 'c'], [129, 76], [126, 100], [110, 109], [84, 109], [68, 100], [65, 76]]), mat, {
    shade: 6,
    inner: (c) => {
      dark(c, 'slit', roundRect(93, 74, 46, 10, 5));
      c.line('seam', line(84, 56, 84, 100));
      c.line('stitch-a', line(79, 66, 89, 66));
      c.line('stitch-b', line(79, 88, 89, 88));
      c.piece('rope', smooth([[60, 97], [96, 101], [134, 97], [134, 105], [96, 109], [60, 105]]), rope, { shade: 0 });
    },
  });
  d.piece('tie', roundRect(84, 48, 28, 8, 4), rope, { shade: 0 });
}

/** A tall wooden mask with one slit, under a hood, with antlers. The Hexer's. */
export function antlerMask(d: Doc, hoodMat: Material, glow: Accent, mask: Material = WOOD, horn: Material = BONE): void {
  d.piece('antler-far', capsule(106, 54, 116, 26, 7), far(horn), { shade: 0 });
  d.piece('tine-far', capsule(112, 38, 126, 30, 6), far(horn), { shade: 0 });
  d.piece('hood', smooth([[97, 50], [118, 57], [128, 78], [124, 100], [108, 109], [84, 109], [69, 100], [65, 78], [75, 57]]), hoodMat, { shade: 6 });
  d.piece('antler', capsule(84, 56, 72, 24, 7), horn, { shade: 2 });
  d.piece('tine', capsule(77, 40, 60, 34, 6), horn, { shade: 2 });
  d.piece('mask', smooth([[98, 60, 'c'], [130, 60, 'c'], [132, 86], [124, 108], [115, 117], [106, 108], [96, 86]]), mask, {
    shade: 4,
    inner: (c) => {
      dark(c, 'slit', roundRect(111, 68, 8, 30, 4));
      c.flat('paint-a', poly([[98, 100], [108, 104], [108, 110], [98, 106]]), glow.fill);
      c.flat('paint-b', poly([[122, 104], [132, 100], [132, 106], [122, 110]]), glow.fill);
    },
  });
}

/** A flat-topped great helm with a crown on it. The Warlord's. */
export function crownedHelm(d: Doc, mat: Material = IRON, crown: Material = GOLD): void {
  d.piece('crown', poly([[70, 60], [68, 38], [80, 50], [88, 34], [97, 50], [106, 34], [115, 50], [126, 38], [124, 60]]), crown, { shade: 3 });
  d.piece('helm', smooth([[71, 56, 'c'], [123, 56, 'c'], [129, 80], [125, 100], [108, 109], [86, 109], [69, 100], [65, 80]]), mat, {
    shade: 6,
    inner: (c) => {
      dark(c, 'slit', roundRect(92, 75, 46, 9, 4.5));
      c.line('ridge-a', line(112, 54, 112, 74));
      c.line('ridge-b', line(112, 86, 112, 110));
      c.piece('band', roundRect(60, 56, 76, 7, 0), crown, { shade: 0 });
    },
  });
  d.glint('glint', capsule(76, 70, 80, 66, 4.5));
}

// ================================================================ more weapons

/** A spear, held low and level for the thrust. */
export function spear(d: Doc, g: Grip, len = 78, hand: Material = LEATHER, pennant: Material | null = null): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-3.5, -len, 7, len + 34, 3)), WOOD, { shade: 2 });
  if (pennant) {
    d.piece('pennant', t(smooth([[3, -len + 6, 'c'], [26, -len + 10], [36, -len + 4, 'c'], [28, -len + 20], [3, -len + 22, 'c']])), pennant, { shade: 3 });
  }
  d.piece('blade', t(poly([[0, -len - 28], [10, -len - 7], [5, -len + 3], [-5, -len + 3], [-10, -len - 7]])), STEEL, { shade: 3 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A war hammer for one hand. */
export function warhammer(d: Doc, g: Grip, len = 56, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-3.5, -len, 7, len + 16, 3)), WOOD, { shade: 2 });
  d.piece('head', t(roundRect(-18, -len - 12, 36, 22, 5)), STEEL, { shade: 5 });
  d.piece('band', t(roundRect(-5, -len - 14, 10, 26, 2)), GOLD, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A short knife. */
export function dagger(d: Doc, g: Grip, len = 34, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('blade', t(poly([[-5, -8], [-5, -len + 9], [0, -len], [5, -len + 9], [5, -8]])), STEEL, { shade: 3 });
  d.piece('guard', t(roundRect(-9, -11, 18, 6, 3)), GOLD, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A crossbow, loaded. Drawn upright and turned to point where it is aimed. */
export function crossbow(d: Doc, g: Grip, hand: Material = LEATHER): void {
  const t = at(g);
  d.line('string', t(path().M(-25, -30).L(0, -10).L(25, -30)));
  d.piece('limbs', t(path().M(-27, -27).Q(0, -50, 27, -27).L(23, -22).Q(0, -40, -23, -22).Z()), STEEL, { shade: 0 });
  d.piece('stock', t(roundRect(-5, -40, 10, 58, 4)), WOOD, { shade: 3 });
  d.piece('bolt', t(poly([[-4.5, -40], [0, -54], [4.5, -40]])), BONE, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** Most of a tree. Two hands. */
export function club(d: Doc, g: Grip, len = 74, hand: Material = LEATHER): void {
  const t = at(g);
  const shape = smooth([
    [-5, 20, 'c'], [-6, -18], [-15, -len + 14], [-12, -len - 4], [0, -len - 9], [12, -len - 4], [15, -len + 14], [6, -18], [5, 20, 'c'],
  ]);
  d.piece('club', t(shape), WOOD, {
    shade: 5,
    inner: (c) => {
      c.piece('band-a', t(roundRect(-20, -len + 6, 40, 8, 0)), IRON, { shade: 0 });
      c.piece('band-b', t(roundRect(-20, -len + 26, 40, 8, 0)), IRON, { shade: 0 });
    },
  });
  const upper = t(circle(0, -24, 7.5)).bounds();
  mitt(d, upper.x + upper.w / 2, upper.y + upper.h / 2, hand, 7.5, 'hand-upper');
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A carved post with a charm burning at its top. The Hexer's. */
export function totemStaff(d: Doc, g: Grip, glow: Accent, len = 70, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-3.5, -len, 7, len + 40, 3)), WOOD, { shade: 2 });
  d.piece('tassel-a', t(smooth([[-8, -len + 20, 'c'], [-15, -len + 30], [-11, -len + 44, 'c'], [-6, -len + 32]])), BONE, { shade: 0 });
  d.piece('tassel-b', t(smooth([[8, -len + 20, 'c'], [15, -len + 30], [11, -len + 44, 'c'], [6, -len + 32]])), BONE, { shade: 0 });
  d.piece('block', t(roundRect(-11, -len - 2, 22, 24, 5)), WOOD, {
    shade: 3,
    inner: (c) => {
      c.flat('notch', t(roundRect(-3, -len + 3, 6, 14, 3)), HOOD_INTERIOR);
    },
  });
  d.flat('halo', t(circle(0, -len - 16, 15)), glow.light, 0.45);
  d.piece('charm', t(star(0, -len - 16, 4, 11, 6)), glow, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A sword as long as its owner. Two hands. */
export function greatsword(d: Doc, g: Grip, len = 96, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('blade', t(poly([[-10, -12], [-10, -len + 18], [0, -len], [10, -len + 18], [10, -12]])), STEEL, {
    shade: 5,
    inner: (c) => c.line('fuller', t(line(0, -14, 0, -len + 28))),
  });
  d.piece('grip', t(roundRect(-4, -8, 8, 34, 3)), LEATHER, { shade: 0 });
  d.piece('pommel', t(circle(0, 29, 6)), GOLD, { shade: 0 });
  d.piece('guard', t(smooth([[-22, -20, 'c'], [-18, -10], [0, -8], [18, -10], [22, -20, 'c'], [12, -15], [-12, -15]])), GOLD, { shade: 3 });
  const lower = t(circle(0, 16, 7.5)).bounds();
  mitt(d, lower.x + lower.w / 2, lower.y + lower.h / 2, hand, 7.5, 'hand-lower');
  mitt(d, g.hand[0], g.hand[1], hand);
}

// ================================================================ more off hands

/** A small round shield. */
export function buckler(d: Doc, cx: number, cy: number, r = 16, mat: Material = STEEL): void {
  d.piece('face', circle(cx, cy, r), mat, { shade: 4 });
  d.piece('boss', circle(cx, cy, r * 0.4), GOLD, { shade: 2 });
}

/** A kite shield: broad at the top, a point at the bottom, a gold band across. */
export function kiteShield(d: Doc, cx: number, cy: number, mat: Material = STEEL, trim: Material = GOLD): void {
  const shape = smooth([
    [cx - 24, cy - 28, 'c'], [cx, cy - 33], [cx + 24, cy - 28, 'c'], [cx + 24, cy], [cx + 14, cy + 22], [cx, cy + 36, 'c'], [cx - 14, cy + 22], [cx - 24, cy],
  ]);
  d.piece('face', shape, mat, {
    shade: 5,
    inner: (c) => {
      c.piece('chevron', poly([[cx - 30, cy - 12], [cx, cy + 6], [cx + 30, cy - 12], [cx + 30, cy], [cx, cy + 18], [cx - 30, cy]]), trim, { shade: 0 });
    },
  });
  d.glint('glint', capsule(cx - 15, cy - 20, cx - 9, cy - 22, 4.5));
}

/** A broader torso, for the big ones. */
export function bulkTorsoPath(): Path {
  return torsoPath().scale(1.16, 1.03, 96, 159);
}

/** Drawn inside a torso: what hangs below the belt, in another material. */
export function skirt(d: Doc, mat: Material, y = 147): void {
  d.piece('skirt', roundRect(52, y, 88, 24, 0), mat, { shade: 0 });
}

// ================================================================ the Sandsworn

/** A great wound turban with a jewel, a veil below it, and shadow between. The Lancer's. */
export function turban(d: Doc, mat: Material, veil: Material = LINEN): void {
  const face = ellipse(98, 86, 28, 23);
  d.flat('shadow-under', face, HOOD_INTERIOR);
  d.line('shadow-under-edge', face);
  d.piece('tail', smooth([[70, 70, 'c'], [60, 84], [54, 108, 'c'], [66, 102], [76, 78, 'c']]), far(mat), { shade: 0 });
  d.piece('veil', smooth([[68, 90], [84, 86], [112, 86], [128, 90], [126, 100], [112, 109], [84, 109], [70, 100]]), veil, { shade: 4 });
  d.piece('turban', smooth([[62, 74], [63, 56], [78, 44], [98, 40], [118, 44], [133, 56], [134, 74], [118, 81], [98, 83], [78, 81]]), mat, {
    shade: 6,
    inner: (c) => {
      c.line('wrap-a', smooth([[64, 60], [92, 62], [128, 48]], false));
      c.line('wrap-b', smooth([[66, 76], [96, 70], [134, 60]], false));
    },
  });
  d.piece('jewel', poly([[112, 52], [120, 60], [112, 70], [104, 60]]), GOLD, { shade: 0 });
}

/** A pointed helm with a spike, and cloth hung from it over the face and neck. The Javelineer's. */
export function spikeHelm(d: Doc, cloth: Material, mat: Material = STEEL): void {
  d.piece('drape', smooth([[66, 72, 'c'], [128, 72, 'c'], [131, 93], [124, 107], [99, 111], [73, 107], [65, 93]]), cloth, {
    shade: 5,
    inner: (c) => dark(c, 'slit', roundRect(93, 78, 46, 9, 4.5)),
  });
  d.piece('spike', poly([[91, 50], [97, 24], [103, 50]]), mat, { shade: 0 });
  d.piece('helm', smooth([[68, 76, 'c'], [74, 58], [97, 46], [120, 58], [126, 76, 'c']]), mat, {
    shade: 5,
    inner: (c) => c.piece('rim', roundRect(60, 68, 76, 10, 0), GOLD, { shade: 0 }),
  });
  d.glint('glint', capsule(82, 60, 87, 56, 4.5));
}

/** A hood whose crown is cut into tongues of flame. The Pyromancer's. */
export function flameHood(d: Doc, mat: Material, glow: Accent): void {
  const shape = smooth([
    [76, 58], [68, 34, 'c'], [84, 46], [92, 20, 'c'], [103, 42], [116, 26, 'c'], [119, 52], [129, 78], [125, 100], [108, 109], [84, 109], [69, 100], [65, 78],
  ]);
  d.piece('hood', shape, mat, {
    shade: 6,
    inner: (c) => {
      dark(c, 'opening', smooth([[112, 66], [126, 74], [131, 89], [124, 103], [108, 104], [97, 93], [99, 76]]));
    },
  });
  d.piece('ember', poly([[82, 62], [88, 70], [82, 80], [76, 70]]), glow, { shade: 0 });
}

/** A light spear for throwing, held up by the shoulder. */
export function javelin(d: Doc, g: Grip, len = 46, hand: Material = LEATHER, barbed = false): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-2.5, -len, 5, len + 36, 2.5)), WOOD, { shade: 0 });
  const head = barbed
    ? poly([[0, -len - 24], [9, -len - 2], [3, -len - 6], [3, -len + 4], [-3, -len + 4], [-3, -len - 6], [-9, -len - 2]])
    : poly([[0, -len - 22], [7, -len - 4], [3, -len + 3], [-3, -len + 3], [-7, -len - 4]]);
  d.piece('head', t(head), STEEL, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A staff topped with an iron bowl of fire. The Pyromancer's. */
export function brazierStaff(d: Doc, g: Grip, glow: Accent, len = 70, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-3.5, -len, 7, len + 40, 3)), WOOD, { shade: 2 });
  d.flat('halo', t(circle(0, -len - 18, 17)), glow.light, 0.45);
  d.piece('flame', t(smooth([[-9, -len - 6, 'c'], [-11, -len - 18], [-4, -len - 26], [-2, -len - 38, 'c'], [6, -len - 28], [11, -len - 18], [9, -len - 6, 'c']])), glow, { shade: 3 });
  d.flat('flame-core', t(smooth([[-4, -len - 8, 'c'], [-5, -len - 16], [0, -len - 24, 'c'], [5, -len - 16], [4, -len - 8, 'c']])), glow.light);
  d.piece('bowl', t(smooth([[-13, -len - 8, 'c'], [-10, -len + 2], [0, -len + 6], [10, -len + 2], [13, -len - 8, 'c']])), IRON, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A wheel of a cart or an engine. */
export function wheel(d: Doc, cx: number, cy: number, r = 17, isFar = false): void {
  d.piece('rim', circle(cx, cy, r), isFar ? far(WOOD) : WOOD, {
    shade: isFar ? 0 : 3,
    inner: (c) => {
      c.line('spoke-a', line(cx - r, cy, cx + r, cy));
      c.line('spoke-b', line(cx, cy - r, cx, cy + r));
    },
  });
  d.piece('hub', circle(cx, cy, 5), IRON, { shade: 0 });
}

/** The bed and post of a ballista: what the wheels carry and the bow sits on. */
export function ballistaCart(d: Doc, cloth: Material): void {
  d.piece('post', roundRect(88, 110, 16, 34, 3), WOOD, { shade: 3 });
  d.piece('bed', roundRect(54, 136, 84, 20, 6), WOOD, { shade: 4 });
  d.piece('drape', poly([[62, 138], [100, 138], [100, 160], [91, 153], [81, 162], [71, 153], [62, 160]]), cloth, { shade: 3 });
  d.piece('brace', roundRect(108, 140, 24, 8, 3), IRON, { shade: 0 });
}

/** The bow of a ballista on its beam, loaded. Drawn upright and turned to aim. */
export function ballistaBow(d: Doc, g: Grip): void {
  const t = at(g);
  d.line('string', t(path().M(-38, -38).L(0, -6).L(38, -38)));
  d.piece('limbs', t(path().M(-41, -34).Q(0, -68, 41, -34).L(35, -27).Q(0, -54, -35, -27).Z()), WOOD, { shade: 3 });
  d.piece('beam', t(roundRect(-7, -60, 14, 88, 5)), WOOD, { shade: 3 });
  d.piece('bolt-shaft', t(roundRect(-2.5, -62, 5, 54, 2)), BONE, { shade: 0 });
  d.piece('bolt-head', t(poly([[-8, -58], [0, -80], [8, -58]])), STEEL, { shade: 0 });
  d.piece('mount', t(circle(0, 0, 7)), IRON, { shade: 0 });
}

// ---------------------------------------------------------------- golems

export interface GolemLook {
  /** What it is made of. */
  rock: Material;
  /** What caps its head and shoulders: sand, moss, snow. */
  cap: Material;
  /** The glow of the sign cut in its chest. */
  rune: Accent;
  /** Shards standing out of its shoulders. */
  spikes: boolean;
}

export function golemLeg(d: Doc, x: number, look: GolemLook, isFar = false): void {
  d.piece('leg', roundRect(x - 13, HIP_Y - 6, 28, 34, 7), isFar ? far(look.rock) : look.rock, { shade: isFar ? 0 : 4 });
}

/** A boulder of a body with a sign cut in its chest, and cloth tied round its middle. */
export function golemBody(d: Doc, look: GolemLook, cloth: Material): void {
  if (look.spikes) {
    d.piece('shard-a', poly([[58, 98], [40, 56], [78, 86]]), look.cap, { shade: 0 });
    d.piece('shard-b', poly([[116, 86], [146, 50], [136, 98]]), look.cap, { shade: 0 });
    d.piece('shard-c', poly([[46, 112], [28, 92], [54, 98]]), look.cap, { shade: 0 });
  }
  const body = smooth([[60, 92], [96, 84], [132, 92], [142, 122], [134, 154], [112, 162], [80, 162], [58, 154], [50, 122]]);
  d.piece('rock', body, look.rock, {
    shade: 7,
    inner: (c) => {
      c.piece('cap', smooth([[44, 84], [96, 76], [148, 84], [140, 100], [118, 96], [96, 104], [74, 96], [52, 100]]), look.cap, { shade: 0 });
      c.line('crack-a', path().M(64, 118).L(74, 128).L(68, 142));
      c.line('crack-b', path().M(128, 112).L(120, 124));
      c.piece('wrap', roundRect(40, 142, 112, 12, 0), cloth, { shade: 0 });
    },
  });
  d.flat('rune-glow', poly([[104, 104], [116, 120], [104, 136], [92, 120]]), look.rune.light, 0.55);
  d.piece('rune', poly([[104, 109], [112, 120], [104, 131], [96, 120]]), look.rune, { shade: 0 });
  d.piece('flap', poly([[86, 150], [112, 150], [112, 172], [99, 166], [86, 172]]), cloth, { shade: 3 });
}

/** A block of a head, sunk between the shoulders, with a line cut down it and nothing else. */
export function golemHead(d: Doc, look: GolemLook): void {
  if (look.spikes) {
    // Ice grows upward: the block is crowned with three shards.
    d.piece('peak-a', poly([[78, 64], [84, 34], [96, 62]]), look.cap, { shade: 0 });
    d.piece('peak-b', poly([[92, 62], [102, 22], [112, 62]]), look.cap, { shade: 0 });
    d.piece('peak-c', poly([[108, 62], [122, 38], [124, 64]]), look.cap, { shade: 0 });
  }
  d.piece('block', smooth([[76, 60, 'c'], [122, 58, 'c'], [127, 80], [122, 100, 'c'], [78, 100, 'c'], [72, 80]]), look.rock, {
    shade: 6,
    inner: (c) => {
      c.piece('cap', smooth([[66, 52], [98, 50], [132, 52], [130, 68], [112, 64], [98, 70], [84, 64], [68, 68]]), look.cap, { shade: 0 });
      c.line('cut', line(108, 74, 108, 104));
    },
  });
}

/** An arm that ends in a fist the size of its head. `x`, `y` is the shoulder. */
export function golemArm(d: Doc, x: number, y: number, look: GolemLook, cloth: Material, isFar = false): void {
  const rock = isFar ? far(look.rock) : look.rock;
  d.piece('arm', capsule(x, y, x + 4, y + 30, 20), rock, { shade: isFar ? 0 : 4 });
  d.piece('band', roundRect(x - 9, y + 12, 26, 9, 3), isFar ? far(cloth) : cloth, { shade: 0 });
  d.piece('fist', smooth([[x - 14, y + 34], [x + 5, y + 26], [x + 23, y + 34], [x + 25, y + 52], [x + 6, y + 62], [x - 14, y + 52]]), rock, { shade: isFar ? 0 : 5 });
}

// ================================================================ the Frostbound

/** A banded pointed helm with mail hung from it over the face and neck. The Huscarl's. */
export function spangenhelm(d: Doc, mat: Material = STEEL, mail: Material = IRON): void {
  d.piece('mail', smooth([[66, 72, 'c'], [128, 72, 'c'], [131, 93], [124, 107], [99, 111], [73, 107], [65, 93]]), mail, {
    shade: 5,
    inner: (c) => dark(c, 'slit', roundRect(93, 79, 46, 9, 4.5)),
  });
  d.piece('helm', smooth([[67, 77, 'c'], [71, 60], [84, 50], [97, 46], [110, 50], [123, 60], [127, 77, 'c']]), mat, {
    shade: 5,
    inner: (c) => {
      c.piece('band-up', roundRect(93, 40, 9, 40, 0), GOLD, { shade: 0 });
      c.piece('band-brow', roundRect(60, 68, 76, 10, 0), GOLD, { shade: 0 });
    },
  });
  d.piece('knob', circle(97, 46, 5), GOLD, { shade: 0 });
}

/**
 * A hood with fur along its brow and round its neck. The Harpooner's.
 * The fur does not ring the opening: a pale ring round a dark middle reads as
 * an eye, and nothing here may.
 */
export function furHood(d: Doc, mat: Material, fur: Material = BONE): void {
  d.piece('hood', smooth([[100, 50], [121, 58], [130, 80], [126, 101], [108, 109], [84, 109], [69, 102], [64, 84], [68, 64], [82, 53]]), mat, {
    shade: 6,
    inner: (c) => {
      dark(c, 'opening', smooth([[110, 66], [126, 72], [133, 88], [126, 104], [108, 105], [96, 93], [98, 76]]));
    },
  });
  d.piece('brow', smooth([[92, 58], [104, 46], [120, 48], [132, 60], [138, 74], [130, 78], [120, 66], [108, 62], [98, 70]]), fur, { shade: 3 });
  d.piece('collar', smooth([[66, 98], [84, 104], [108, 106], [130, 98], [134, 108], [112, 117], [84, 116], [62, 108]]), fur, { shade: 3 });
}

/** A wide-brimmed hat with a tall bent point, and a scarf up to the brim. The Frost Witch's. */
export function witchHat(d: Doc, mat: Material, band: Material, scarf: Material = LINEN): void {
  const face = ellipse(98, 88, 27, 21);
  d.flat('shadow-under', face, HOOD_INTERIOR);
  d.line('shadow-under-edge', face);
  d.piece('scarf', smooth([[69, 92], [84, 88], [112, 88], [127, 92], [125, 101], [112, 109], [84, 109], [71, 101]]), scarf, { shade: 4 });
  d.piece('cone', smooth([[74, 76, 'c'], [80, 52], [78, 30], [62, 14, 'c'], [92, 20], [110, 40], [120, 76, 'c']]), mat, {
    shade: 5,
    inner: (c) => c.piece('band', roundRect(60, 62, 76, 10, 0), band, { shade: 0 }),
  });
  d.piece('brim', smooth([[44, 77], [96, 68], [150, 77], [151, 83], [96, 86], [43, 83]]), mat, { shade: 3 });
}

/** A helm with ram's horns curled at its sides and a crown on its brow. The Jarl's. */
export function jarlHelm(d: Doc, mat: Material = IRON, horn: Material = BONE, crown: Material = GOLD): void {
  const hornShape = smooth([
    [76, 62, 'c'], [58, 52], [42, 60], [38, 78], [46, 94], [60, 96, 'c'], [52, 84], [52, 72], [62, 68], [76, 74, 'c'],
  ]);
  d.piece('horn-far', hornShape.mirrorX(97).translate(8, -2), far(horn), { shade: 0 });
  d.piece('crown', poly([[72, 60], [70, 40], [82, 52], [90, 36], [98, 52], [106, 36], [114, 52], [126, 40], [124, 60]]), crown, { shade: 3 });
  d.piece('helm', domePath().translate(0, 2), mat, {
    shade: 6,
    inner: (c) => {
      dark(c, 'slit', roundRect(107, 74, 9, 32, 4.5));
      c.piece('brow', smooth([[60, 62], [96, 58], [134, 62], [134, 72], [96, 69], [60, 73]]), crown, { shade: 0 });
    },
  });
  d.piece('horn', hornShape, horn, { shade: 4 });
}

/** A bearded axe for one hand. */
export function handAxe(d: Doc, g: Grip, len = 52, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-3.5, -len, 7, len + 16, 3)), WOOD, { shade: 2 });
  d.piece('blade', t(smooth([[2, -len + 2, 'c'], [16, -len - 6], [26, -len - 2, 'c'], [28, -len + 14], [22, -len + 32, 'c'], [12, -len + 20], [2, -len + 16, 'c']])), STEEL, { shade: 4 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A hammer with a head like an anvil. Two hands. */
export function greatHammer(d: Doc, g: Grip, len = 80, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-4, -len, 8, len + 22, 3)), WOOD, { shade: 2 });
  d.piece('head', t(roundRect(-26, -len - 18, 52, 32, 6)), IRON, {
    shade: 6,
    inner: (c) => {
      c.piece('band-a', t(roundRect(-30, -len - 20, 10, 36, 0)), GOLD, { shade: 0 });
      c.piece('band-b', t(roundRect(20, -len - 20, 10, 36, 0)), GOLD, { shade: 0 });
    },
  });
  const upper = t(circle(0, -26, 7.5)).bounds();
  mitt(d, upper.x + upper.w / 2, upper.y + upper.h / 2, hand, 7.5, 'hand-upper');
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A wand with a great crystal at its tip and shards hanging by it. The Frost Witch's. */
export function crystalWand(d: Doc, g: Grip, glow: Accent, len = 50, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-3, -len, 6, len + 22, 3)), WOOD, { shade: 0 });
  d.flat('halo', t(circle(0, -len - 16, 19)), glow.light, 0.45);
  d.piece('shard-a', t(poly([[-18, -len - 6], [-13, -len - 18], [-9, -len - 4]])), glow, { shade: 0 });
  d.piece('shard-b', t(poly([[10, -len - 2], [16, -len - 14], [19, -len]])), glow, { shade: 0 });
  d.piece('crystal', t(poly([[0, -len - 36], [10, -len - 18], [0, -len + 2], [-10, -len - 18]])), glow, { shade: 4 });
  d.glint('glint', t(poly([[-3, -len - 26], [0, -len - 30], [0, -len - 14], [-5, -len - 18]])));
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A coil of rope carried at the hip. */
export function ropeCoil(d: Doc, cx: number, cy: number, hand: Material = LEATHER): void {
  d.piece('coil', ellipse(cx, cy, 15, 18), LINEN, { shade: 3 });
  d.flat('coil-hole', ellipse(cx, cy, 6, 9), HOOD_INTERIOR);
  d.line('coil-hole-edge', ellipse(cx, cy, 6, 9));
  mitt(d, cx, cy - 16, hand);
}
