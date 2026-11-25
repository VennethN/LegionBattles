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

// ---------------------------------------------------------------- small things

/** A rivet: a dark dot with a speck of light on the side the light comes from. */
export function rivet(d: Doc, x: number, y: number, r = 2): void {
  d.shadeOver('rivet', circle(x, y, r), 1.9);
  d.lightOver('rivet-lit', circle(x - r * 0.35, y - r * 0.35, r * 0.45), 1.6);
}

/**
 * The shadow a head casts on the shoulders under it. It is part of the head,
 * drawn before anything else of it, so it lies on the body and moves with the
 * head. It is kept inside the shoulders: nothing of it shows past them.
 */
export function under(d: Doc, cx = 97, cy = 110, rx = 25, ry = 9.5): void {
  d.shadeOver('cast', ellipse(cx, cy, rx, ry), 0.95);
}

/** A crease in cloth: a thin dark wedge from one point to another, widest in the middle. */
export function crease(d: Doc, name: string, from: Pt, to: Pt, width = 3.2, strength = 0.75): void {
  const mx = (from[0] + to[0]) / 2;
  const my = (from[1] + to[1]) / 2;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = (-dy / len) * width;
  const ny = (dx / len) * width;
  d.shadeOver(name, path().M(from[0], from[1]).Q(mx + nx, my + ny, to[0], to[1]).Q(mx - nx * 0.2, my - ny * 0.2, from[0], from[1]).Z(), strength);
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
  d.piece('boot', p, isFar ? far(mat) : mat, {
    shade: isFar ? 0 : 4,
    inner: (c) => {
      // A sole under it, and the top of the boot turned over.
      c.shadeOver('sole', roundRect(x - 14, 175, 40, 8, 0), 1.25);
      if (!isFar) {
        c.lightOver('cuff', roundRect(x - 14, 159, 28, 4.5, 0), 0.9);
        c.shadeOver('cuff-under', roundRect(x - 14, 163.5, 28, 2, 0), 0.7);
      }
    },
  });
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
  // Cloth gathers into a belt: creases above it, and its shadow on what hangs below.
  crease(d, 'crease-a', [80, y - 1], [77, y - 17]);
  crease(d, 'crease-b', [118, y - 1], [120, y - 15], 2.6);
  d.shadeOver('belt-cast', roundRect(56, y + 10, 80, 4.5, 0), 0.9);
  d.piece('belt', roundRect(56, y, 80, 9, 0), opts.mat ?? LEATHER, { shade: 0 });
  const buckle = opts.buckle === undefined ? GOLD : opts.buckle;
  if (buckle) d.piece('buckle', roundRect(101, y - 2, 12, 13, 3), buckle, { shade: 3 });
}

/** Drawn inside a cloth torso: the seam down its front. */
export function seam(d: Doc, x = 109, from = 100, to = 162): void {
  d.shadeOver('seam', roundRect(x - 1.3, from, 2.6, to - from, 1), 0.85);
}

/** Drawn inside a torso: a seam laced shut at the chest. */
export function lacing(d: Doc, x = 109, y = 110): void {
  seam(d, x);
  for (let i = 0; i < 3; i++) d.shadeOver('lace', capsule(x - 4.5, y + i * 7, x + 4.5, y + i * 7 + 2.5, 2.4), 1.5);
}

/** Drawn inside a torso: a row of buttons down the front. */
export function buttons(d: Doc, x = 109, from = 110, n = 3): void {
  seam(d, x - 5);
  for (let i = 0; i < n; i++) rivet(d, x, from + i * 9, 2.2);
}

/** Drawn inside a torso: a paler stripe down a tabard, as heralds wear. */
export function stripe(d: Doc, x = 100, w = 13): void {
  d.lightOver('stripe', roundRect(x, 90, w, 90, 0), 1.25);
  d.shadeOver('stripe-edge', roundRect(x + w, 90, 2, 90, 0), 0.6);
}

/** Drawn inside a torso: a patch sewn on, with its stitches. */
export function patch(d: Doc, x: number, y: number, w = 13, h = 11): void {
  d.shadeOver('patch', roundRect(x, y, w, h, 2), 0.9);
  d.lightOver('patch-thread', roundRect(x + 2, y + 2, w - 4, 1.4, 0.7), 1.3);
  d.lightOver('patch-thread', roundRect(x + 2, y + h - 3.4, w - 4, 1.4, 0.7), 1.3);
}

/** Drawn inside something of mail: its rings, as rows of small dark marks set between each other. */
export function mailRings(d: Doc, x0: number, y0: number, x1: number, y1: number, step = 7): void {
  let row = 0;
  for (let y = y0; y <= y1; y += step * 0.8) {
    for (let x = x0 + (row % 2) * (step / 2); x <= x1; x += step) {
      d.shadeOver('ring', path().M(x - 2.2, y).Q(x, y + 3.2, x + 2.2, y).Q(x, y + 1.4, x - 2.2, y).Z(), 1.5);
    }
    row++;
  }
}

/** Drawn inside something of plate: where one plate laps over the next, a dark line and its lit edge. */
export function lames(d: Doc, ys: readonly number[], x0 = 50, x1 = 142): void {
  for (const y of ys) {
    d.shadeOver('lame', smooth([[x0, y], [96, y + 3], [x1, y], [x1, y + 2.6], [96, y + 5.6], [x0, y + 2.6]]), 1.2);
    d.lightOver('lame-lit', smooth([[x0, y + 2.6], [96, y + 5.6], [x1, y + 2.6], [x1, y + 4.6], [96, y + 7.6], [x0, y + 4.6]]), 0.8);
  }
}

/** An arm from shoulder to hand. The hand itself is drawn with what it holds. */
export function arm(d: Doc, name: string, from: Pt, to: Pt, mat: Material, width = 15): void {
  // The shadow it casts on the body, a little down and away from the light.
  d.shadeOver(`${name}-cast`, capsule(from[0] + 1, from[1] + 3.5, to[0] + 1, to[1] + 3.5, width), 0.6);
  d.piece(name, capsule(from[0], from[1], to[0], to[1], width), mat, { shade: 3 });
}

/** A round pauldron on a shoulder. */
export function pauldron(d: Doc, x: number, y: number, mat: Material = STEEL, r = 11): void {
  d.shadeOver('pauldron-cast', ellipse(x + 1, y + 3.5, r + 1, r), 0.6);
  d.piece('pauldron', ellipse(x, y, r + 1, r), mat, {
    shade: 3,
    inner: (c) => rivet(c, x + r * 0.35, y + r * 0.3, 1.7),
  });
}

// ---------------------------------------------------------------- hands

/** A mitten of a hand. It is drawn on top of whatever it grips. */
export function mitt(d: Doc, x: number, y: number, mat: Material = LEATHER, r = 7.5, name = 'hand'): void {
  d.piece(name, circle(x, y, r), mat, { shade: 3 });
}

// ---------------------------------------------------------------- heads

/** The dark where a face would be, cut to the shape it is drawn inside. */
export function dark(d: Doc, name: string, p: Path): void {
  d.flat(name, p, HOOD_INTERIOR);
  d.line(`${name}-edge`, p);
}

/**
 * A round closed helm: a dome with one dark slit across the front and a ridge
 * down the middle. The Knight's.
 */
export function roundHelm(d: Doc, mat: Material = STEEL): void {
  under(d);
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
      // The plates it is made of: a seam behind the slit, and rivets along the rim at the back.
      c.shadeOver('plate', roundRect(90.5, 84, 2.6, 16, 1), 0.9);
      // Three in a row along the rim: a row reads as rivets, where one or two alone could be read as an eye.
      rivet(c, 70.5, 88.5, 1.8);
      rivet(c, 76.5, 93, 1.8);
      rivet(c, 84, 95.5, 1.8);
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
  under(d);
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
  d.piece('horn', hornShape(false), horn, {
    shade: 4,
    inner: (c) => {
      // A horn grows in rings.
      c.shadeOver('ring-a', capsule(117, 66, 129, 58, 2.6), 1.1);
      c.shadeOver('ring-b', capsule(126, 56, 138, 50, 2.4), 1.1);
      c.shadeOver('ring-c', capsule(131, 45, 141, 41, 2.2), 1.1);
    },
  });
  d.glint('glint', capsule(79, 67, 84, 63, 5));
}

/**
 * A deep hood with its opening to the front and nothing in it but shadow.
 * `tip` pulls the back of the hood out into a point.
 */
export function hood(d: Doc, mat: Material, tip = 10): void {
  under(d);
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
      // The cloth turns in at the opening: a band of shade round it, and none of it pale.
      c.shadeOver('lining', smooth([[110, 58], [130, 68], [137, 90], [128, 110], [104, 110], [91, 94], [93, 70]]), 1.1);
      dark(c, 'opening', smooth([[112, 64], [126, 72], [131, 88], [124, 103], [108, 104], [97, 92], [99, 74]]));
      crease(c, 'fold-b', [70, 78], [68, 100], 3);
      c.lightOver('crown-lit', smooth([[84, 56], [100, 53], [112, 58], [100, 60], [88, 62]]), 0.8);
    },
  });
  d.line('fold', smooth([[84, 60], [76, 74], [74, 90]], false));
}

/** A tall hood that ends in a bent point. The Mage's. */
export function pointedHood(d: Doc, mat: Material): void {
  under(d);
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
      c.shadeOver('lining', smooth([[110, 60], [130, 72], [136, 92], [127, 110], [103, 110], [91, 95], [94, 72]]), 1.1);
      dark(c, 'opening', smooth([[112, 66], [126, 76], [130, 90], [123, 103], [107, 104], [97, 93], [100, 76]]));
      crease(c, 'fold-b', [96, 34], [104, 56], 3);
      crease(c, 'fold-c', [72, 76], [70, 100], 3);
    },
  });
  d.line('fold', smooth([[88, 40], [80, 62], [76, 88]], false));
}

/**
 * A round cowl with a band across the brow and a veil where a face would be.
 * The Cleric's.
 */
export function cowl(d: Doc, mat: Material, trim: Material = GOLD, veil: Material = LINEN): void {
  under(d);
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

/** Turns and moves a shape drawn upright about the hand to how it is held. */
export function at(g: Grip): (p: Path) => Path {
  return (p) => p.rotate(g.angle).translate(g.hand[0], g.hand[1]);
}

export function sword(d: Doc, g: Grip, len = 60, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('blade', t(poly([[-7.5, -10], [-7.5, -len + 13], [0, -len], [7.5, -len + 13], [7.5, -10]])), STEEL, {
    shade: 4,
    inner: (c) => {
      // The blade is ground to an edge on both sides of the fuller: one side takes the light.
      c.lightOver('bevel', t(poly([[-7.5, -10], [-7.5, -len + 13], [0, -len], [0, -10]])), 0.9);
      c.line('fuller', t(line(0, -12, 0, -len + 20)));
    },
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
  d.piece('blade', t(blade), STEEL, {
    shade: 5,
    // The cheek of the blade is duller than its edge, which is ground bright.
    inner: (c) => c.shadeOver('cheek', t(blade.translate(-7, 0)), 0.8),
  });
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
      // The grain of each plank, and the shadow of the boss on them.
      c.shadeOver('grain-a', capsule(cx - 13, cy - 8, cx - 13, cy + 5, 1.7), 0.9);
      c.shadeOver('grain-b', capsule(cx + 1, cy + 9, cx + 1, cy + 15, 1.7), 0.9);
      c.shadeOver('grain-c', capsule(cx + 13, cy - 9, cx + 13, cy + 3, 1.7), 0.9);
      c.shadeOver('boss-cast', circle(cx + 1.5, cy + 2.5, 9), 0.9);
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
  d.piece('plume', shape, mat, {
    shade: 5,
    inner: (c) => {
      // The barbs of the feather, all swept back.
      crease(c, 'barb-a', [x - 4, y - 16], [x - 12, y - 4], 2.6, 0.9);
      crease(c, 'barb-b', [x - 18, y - 21], [x - 24, y - 6], 2.6, 0.9);
      crease(c, 'barb-c', [x - 32, y - 16], [x - 36, y - 3], 2.4, 0.9);
    },
  });
}

/** A quiver slung at the hip, its fletchings fanning out behind. */
export function quiver(d: Doc): void {
  const turn = (p: Path): Path => p.rotate(-38, 74, 150);
  d.piece('fletch-a', turn(poly([[61, 96], [69, 103], [69, 118], [61, 118]])), BONE, { shade: 0 });
  d.piece('fletch-b', turn(poly([[72, 92], [80, 99], [80, 118], [72, 118]])), BONE, { shade: 0 });
  d.piece('tube', turn(roundRect(59, 114, 24, 42, 6)), LEATHER, {
    shade: 4,
    inner: (c) => {
      // Stitched down one side.
      for (let i = 0; i < 4; i++) c.lightOver('stitch', turn(roundRect(63, 130 + i * 6, 4.5, 1.8, 0.9)), 1.4);
    },
  });
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
    inner: (c) => {
      // It billows: light on the swell of it, creases where it hangs.
      c.lightOver('billow', smooth([[80, 110], [94, 114], [92, 150], [78, 156], [72, 132]]), 0.6);
      crease(c, 'fold-b', [96, 116], [94, 160], 3.4);
      crease(c, 'fold-c', [78, 118], [72, 164], 3);
      c.line('fold', smooth([[66, 124], [58, 146], [56, 166]], false));
    },
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
  // A robe falls in folds: three creases down to the hem, each with light beside it.
  crease(d, 'fold-a', [77, y - 1], [82, y - 40], 3.6);
  crease(d, 'fold-b', [99, y + 3], [97, y - 30], 3.2);
  crease(d, 'fold-c', [119, y], [114, y - 36], 3.4);
  d.lightOver('fold-lit-a', path().M(84, y).Q(90, y - 20, 88, y - 38).Q(86, y - 18, 84, y).Z(), 0.7);
  d.lightOver('fold-lit-b', path().M(105, y + 2).Q(109, y - 14, 106, y - 28).Q(104, y - 12, 105, y + 2).Z(), 0.7);
  d.shadeOver('hem-cast', smooth([[52, y - 4], [96, y], [140, y - 4], [140, y], [96, y + 4], [52, y]]), 0.8);
  d.piece('hem', smooth([[52, y], [96, y + 4], [140, y], [140, y + 9], [96, y + 13], [52, y + 9]]), mat, { shade: 0 });
}

/** A ruff of fur over the shoulders, with a ragged lower edge. */
export function furCollar(d: Doc, mat: Material): void {
  const shape = poly([
    [66, 104], [96, 99], [126, 104], [133, 116], [126, 127], [120, 120], [113, 130], [105, 121],
    [96, 131], [87, 121], [79, 130], [72, 120], [66, 127], [59, 116],
  ]);
  d.piece('fur', shape, mat, {
    shade: 4,
    inner: (c) => {
      // Tufts: short dark strokes that all lie one way.
      for (const [x, y] of [[70, 110], [82, 108], [94, 106], [106, 107], [118, 109], [76, 118], [100, 118], [112, 117]] as const) {
        c.shadeOver('tuft', capsule(x, y, x + 2.5, y + 6, 2), 0.9);
      }
    },
  });
}

// ================================================================ more heads

/** The round of a head: what most helms and wraps are cut from. */
export function domePath(): Path {
  return smooth([[97, 50], [119, 57], [129, 78], [125, 99], [108, 108], [84, 108], [69, 99], [65, 78], [75, 57]]);
}

/** A wide-brimmed kettle hat over a mail coif that covers the face. The Militia's. */
export function kettleHelm(d: Doc, mat: Material = STEEL, coif: Material = IRON): void {
  under(d);
  d.piece('coif', smooth([[72, 74], [96, 70], [122, 74], [128, 92], [121, 106], [98, 110], [76, 106], [68, 92]]), coif, {
    shade: 5,
    inner: (c) => {
      // Mail, where it hangs behind the opening.
      mailRings(c, 70, 88, 90, 108, 7);
      dark(c, 'slit', roundRect(94, 80, 44, 9, 4.5));
    },
  });
  d.piece('dome', smooth([[77, 74, 'c'], [79, 58], [97, 49], [115, 58], [117, 74, 'c']]), mat, {
    shade: 4,
    inner: (c) => c.shadeOver('crown-seam', roundRect(96, 46, 2.6, 30, 1), 0.9),
  });
  d.piece('brim', smooth([[56, 75], [96, 68], [138, 75], [139, 81], [96, 85], [55, 81]]), mat, { shade: 3 });
  d.glint('glint', capsule(86, 60, 91, 56, 4.5));
}

/** A closed helm with one upright slit, a gold brow and a wing swept back from each temple. The Paladin's. */
export function wingedHelm(d: Doc, mat: Material = STEEL, wing: Material = BONE): void {
  under(d);
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
  d.piece('wing', wingShape, wing, {
    shade: 4,
    inner: (c) => {
      // The feathers it is made of.
      crease(c, 'feather-a', [80, 70], [50, 42], 2.6, 0.9);
      crease(c, 'feather-b', [84, 62], [62, 38], 2.6, 0.9);
      crease(c, 'feather-c', [86, 56], [76, 40], 2.4, 0.9);
    },
  });
  d.glint('glint', capsule(92, 82, 96, 78, 4.5));
}

/** A head wound round with cloth, a dark gap where it parts, and the ends knotted behind. The Cutpurse's. */
export function faceWrap(d: Doc, mat: Material): void {
  under(d);
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
  under(d);
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
  under(d);
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
  under(d);
  d.piece('antler-far', capsule(106, 54, 116, 26, 7), far(horn), { shade: 0 });
  d.piece('tine-far', capsule(112, 38, 126, 30, 6), far(horn), { shade: 0 });
  d.piece('hood', smooth([[97, 50], [118, 57], [128, 78], [124, 100], [108, 109], [84, 109], [69, 100], [65, 78], [75, 57]]), hoodMat, { shade: 6 });
  d.piece('antler', capsule(84, 56, 72, 24, 7), horn, { shade: 2 });
  d.piece('tine', capsule(77, 40, 60, 34, 6), horn, { shade: 2 });
  d.piece('mask', smooth([[98, 60, 'c'], [130, 60, 'c'], [132, 86], [124, 108], [115, 117], [106, 108], [96, 86]]), mask, {
    shade: 4,
    inner: (c) => {
      c.shadeOver('grain-a', capsule(102, 66, 103, 92, 1.8), 0.9);
      c.shadeOver('grain-b', capsule(126, 64, 126, 96, 1.8), 0.9);
      dark(c, 'slit', roundRect(111, 68, 8, 30, 4));
      c.flat('paint-a', poly([[98, 100], [108, 104], [108, 110], [98, 106]]), glow.fill);
      c.flat('paint-b', poly([[122, 104], [132, 100], [132, 106], [122, 110]]), glow.fill);
    },
  });
}

/** A flat-topped great helm with a crown on it. The Warlord's. */
export function crownedHelm(d: Doc, mat: Material = IRON, crown: Material = GOLD): void {
  under(d);
  d.piece('crown', poly([[70, 60], [68, 38], [80, 50], [88, 34], [97, 50], [106, 34], [115, 50], [126, 38], [124, 60]]), crown, { shade: 3 });
  d.piece('helm', smooth([[71, 56, 'c'], [123, 56, 'c'], [129, 80], [125, 100], [108, 109], [86, 109], [69, 100], [65, 80]]), mat, {
    shade: 6,
    inner: (c) => {
      c.shadeOver('plate', roundRect(88.5, 84, 2.6, 18, 1), 0.9);
      // A column of three down the back edge.
      rivet(c, 72, 72, 1.8);
      rivet(c, 71.5, 84, 1.8);
      rivet(c, 73.5, 96, 1.8);
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
  d.piece('blade', t(poly([[0, -len - 28], [10, -len - 7], [5, -len + 3], [-5, -len + 3], [-10, -len - 7]])), STEEL, {
    shade: 3,
    inner: (c) => c.shadeOver('far-face', t(poly([[0, -len - 28], [10, -len - 7], [5, -len + 3], [0, -len + 3]])), 0.8),
  });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A war hammer for one hand. */
export function warhammer(d: Doc, g: Grip, len = 56, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-3.5, -len, 7, len + 16, 3)), WOOD, { shade: 2 });
  d.piece('head', t(roundRect(-18, -len - 12, 36, 22, 5)), STEEL, {
    shade: 5,
    inner: (c) => {
      // The two faces it strikes with, set off from the block between them.
      c.shadeOver('face-a', t(roundRect(-13, -len - 14, 2.6, 26, 0)), 1);
      c.shadeOver('face-b', t(roundRect(10.4, -len - 14, 2.6, 26, 0)), 1);
    },
  });
  d.piece('band', t(roundRect(-5, -len - 14, 10, 26, 2)), GOLD, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A short knife. */
export function dagger(d: Doc, g: Grip, len = 34, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('blade', t(poly([[-5, -8], [-5, -len + 9], [0, -len], [5, -len + 9], [5, -8]])), STEEL, {
    shade: 3,
    inner: (c) => c.shadeOver('far-face', t(poly([[0, -8], [0, -len], [5, -len + 9], [5, -8]])), 0.8),
  });
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
      // The grain of the wood, and a knot in it.
      c.shadeOver('grain-a', t(capsule(-4, -len + 42, -3, -22, 1.8)), 0.9);
      c.shadeOver('grain-b', t(capsule(5, -len + 38, 3, -30, 1.8)), 0.9);
      c.shadeOver('knot', t(ellipse(-2, -len + 18, 3.2, 4.2)), 1.1);
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
    inner: (c) => {
      c.lightOver('bevel', t(poly([[-10, -12], [-10, -len + 18], [0, -len], [0, -12]])), 0.9);
      c.line('fuller', t(line(0, -14, 0, -len + 28)));
    },
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
  d.piece('face', circle(cx, cy, r), mat, {
    shade: 4,
    inner: (c) => {
      // Riveted round its edge, and the boss's shadow in the middle.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.5;
        rivet(c, cx + Math.cos(a) * (r - 5.5), cy + Math.sin(a) * (r - 5.5), 1.7);
      }
      c.shadeOver('boss-cast', circle(cx + 1.5, cy + 2, r * 0.4 + 2), 0.9);
    },
  });
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
      // A raised border: the field inside it sits a little lower and darker.
      c.shadeOver('field', shape.scale(0.74, 0.78, cx, cy), 0.55);
      c.piece('chevron', poly([[cx - 30, cy - 12], [cx, cy + 6], [cx + 30, cy - 12], [cx + 30, cy], [cx, cy + 18], [cx - 30, cy]]), trim, { shade: 0 });
      rivet(c, cx - 16, cy - 22);
      rivet(c, cx + 16, cy - 22);
      rivet(c, cx, cy + 25);
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
  under(d);
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
  under(d);
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
  under(d);
  const shape = smooth([
    [76, 58], [68, 34, 'c'], [84, 46], [92, 20, 'c'], [103, 42], [116, 26, 'c'], [119, 52], [129, 78], [125, 100], [108, 109], [84, 109], [69, 100], [65, 78],
  ]);
  d.piece('hood', shape, mat, {
    shade: 6,
    inner: (c) => {
      c.shadeOver('lining', smooth([[110, 60], [130, 70], [137, 91], [128, 110], [104, 110], [91, 95], [93, 72]]), 1.1);
      dark(c, 'opening', smooth([[112, 66], [126, 74], [131, 89], [124, 103], [108, 104], [97, 93], [99, 76]]));
      // The tongues of the crown are lit along one side, as flames are.
      c.lightOver('tongue-a', poly([[70, 38], [84, 48], [78, 58]]), 0.8);
      c.lightOver('tongue-b', poly([[92, 24], [101, 42], [90, 50]]), 0.8);
      crease(c, 'fold-b', [72, 76], [70, 100], 3);
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
      // Cut in planes: the one that faces the light, and the one turned from it.
      c.lightOver('facet-a', poly([[58, 100], [92, 96], [86, 122], [56, 130]]), 0.55);
      c.shadeOver('facet-b', poly([[114, 128], [140, 116], [136, 154], [112, 160]]), 0.7);
      crease(c, 'chip-a', [84, 150], [92, 138], 2.6, 1);
      crease(c, 'chip-b', [124, 96], [130, 104], 2.4, 1);
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
  under(d, 99, 100, 29, 8);
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
      c.lightOver('facet', poly([[74, 66], [100, 64], [94, 82], [73, 84]]), 0.55);
      crease(c, 'chip', [82, 88], [90, 96], 2.4, 1);
      c.line('cut', line(108, 74, 108, 104));
    },
  });
}

/** An arm that ends in a fist the size of its head. `x`, `y` is the shoulder. */
export function golemArm(d: Doc, x: number, y: number, look: GolemLook, cloth: Material, isFar = false): void {
  const rock = isFar ? far(look.rock) : look.rock;
  d.piece('arm', capsule(x, y, x + 4, y + 30, 20), rock, { shade: isFar ? 0 : 4 });
  d.piece('band', roundRect(x - 9, y + 12, 26, 9, 3), isFar ? far(cloth) : cloth, { shade: 0 });
  d.piece('fist', smooth([[x - 14, y + 34], [x + 5, y + 26], [x + 23, y + 34], [x + 25, y + 52], [x + 6, y + 62], [x - 14, y + 52]]), rock, {
    shade: isFar ? 0 : 5,
    inner: isFar
      ? undefined
      : (c) => {
          // The knuckles of it.
          crease(c, 'knuckle-a', [x + 2, y + 40], [x + 3, y + 56], 2.6, 1);
          crease(c, 'knuckle-b', [x + 12, y + 38], [x + 13, y + 56], 2.6, 1);
          c.lightOver('facet', poly([[x - 10, y + 36], [x + 4, y + 30], [x, y + 42], [x - 12, y + 46]]), 0.55);
        },
  });
}

// ================================================================ the Frostbound

/** A banded pointed helm with mail hung from it over the face and neck. The Huscarl's. */
export function spangenhelm(d: Doc, mat: Material = STEEL, mail: Material = IRON): void {
  under(d);
  d.piece('mail', smooth([[66, 72, 'c'], [128, 72, 'c'], [131, 93], [124, 107], [99, 111], [73, 107], [65, 93]]), mail, {
    shade: 5,
    inner: (c) => {
      mailRings(c, 68, 90, 90, 109, 7);
      dark(c, 'slit', roundRect(93, 79, 46, 9, 4.5));
    },
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
  under(d);
  d.piece('hood', smooth([[100, 50], [121, 58], [130, 80], [126, 101], [108, 109], [84, 109], [69, 102], [64, 84], [68, 64], [82, 53]]), mat, {
    shade: 6,
    inner: (c) => {
      c.shadeOver('lining', smooth([[108, 60], [130, 68], [139, 90], [130, 111], [104, 111], [90, 95], [92, 72]]), 1.1);
      dark(c, 'opening', smooth([[110, 66], [126, 72], [133, 88], [126, 104], [108, 105], [96, 93], [98, 76]]));
      crease(c, 'fold-b', [72, 70], [69, 96], 3);
    },
  });
  d.piece('brow', smooth([[92, 58], [104, 46], [120, 48], [132, 60], [138, 74], [130, 78], [120, 66], [108, 62], [98, 70]]), fur, { shade: 3 });
  d.piece('collar', smooth([[66, 98], [84, 104], [108, 106], [130, 98], [134, 108], [112, 117], [84, 116], [62, 108]]), fur, { shade: 3 });
}

/** A wide-brimmed hat with a tall bent point, and a scarf up to the brim. The Frost Witch's. */
export function witchHat(d: Doc, mat: Material, band: Material, scarf: Material = LINEN): void {
  under(d);
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
  under(d);
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
  d.piece('horn', hornShape, horn, {
    shade: 4,
    inner: (c) => {
      // A ram's horn is ridged across all the way round its curl.
      c.shadeOver('ring-a', capsule(66, 54, 68, 70, 2.4), 1.1);
      c.shadeOver('ring-b', capsule(54, 54, 60, 68, 2.4), 1.1);
      c.shadeOver('ring-c', capsule(40, 64, 52, 72, 2.4), 1.1);
      c.shadeOver('ring-d', capsule(40, 82, 52, 80, 2.4), 1.1);
    },
  });
}

/** A bearded axe for one hand. */
export function handAxe(d: Doc, g: Grip, len = 52, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-3.5, -len, 7, len + 16, 3)), WOOD, { shade: 2 });
  const blade = smooth([[2, -len + 2, 'c'], [16, -len - 6], [26, -len - 2, 'c'], [28, -len + 14], [22, -len + 32, 'c'], [12, -len + 20], [2, -len + 16, 'c']]);
  d.piece('blade', t(blade), STEEL, { shade: 4, inner: (c) => c.shadeOver('cheek', t(blade.translate(-6, 0)), 0.8) });
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

// ================================================================ what a summoner holds
// A summoner fights little: what it carries is what it calls with. Each is
// a thing no one else holds, so that a summoner is told from across a field.

/** A long straight horn with a cloth hung from it. The Herald's. */
export function trumpet(d: Doc, g: Grip, cloth: Material, len = 60, hand: Material = LEATHER): void {
  const t = at(g);
  // The cloth hangs from the tube, on the side that is down when the horn is raised.
  d.piece('cloth', t(poly([[2, -len + 12], [28, -len + 12], [28, -len + 40], [15, -len + 33], [2, -len + 40]])), cloth, {
    shade: 3,
    inner: (c) => c.piece('cloth-mark', t(poly([[15, -len + 16], [21, -len + 23], [15, -len + 30], [9, -len + 23]])), GOLD, { shade: 0 }),
  });
  d.piece('tube', t(roundRect(-2.5, -len, 5, len + 18, 2)), GOLD, { shade: 2 });
  d.piece('bell', t(poly([[-3, -len + 3], [3, -len + 3], [12, -len - 15], [-12, -len - 15]])), GOLD, { shade: 3 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A crook with a lantern hung from it, to signal with. The Ringleader's. */
export function crookLantern(d: Doc, g: Grip, glow: Accent, len = 66, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-3.5, -len, 7, len + 38, 3)), WOOD, { shade: 2 });
  d.piece('crook', t(smooth([
    [-3.5, -len + 2, 'c'], [-3.5, -len - 12], [8, -len - 19], [22, -len - 13], [25, -len + 1, 'c'],
    [18, -len + 1, 'c'], [16, -len - 7], [8, -len - 11], [3.5, -len - 6], [3.5, -len + 2, 'c'],
  ])), WOOD, { shade: 0 });
  d.line('ring', t(line(21.5, -len + 1, 21.5, -len + 8)));
  // The light: two flat rings and a pane, as every glow here is.
  d.flat('halo', t(circle(21.5, -len + 21, 19)), glow.light, 0.4);
  d.piece('cage', t(roundRect(13, -len + 9, 17, 24, 3)), IRON, {
    shade: 0,
    inner: (c) => c.flat('pane', t(roundRect(16.5, -len + 13.5, 10, 15, 2)), glow.light),
  });
  d.piece('cap', t(poly([[10.5, -len + 10], [21.5, -len + 3], [32.5, -len + 10]])), IRON, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A war drum slung in front: a wide shell laced top to bottom, its skin up. The Drummer's. */
export function drum(d: Doc, cx: number, cy: number, cloth: Material, r = 22): void {
  d.piece('shell', roundRect(cx - r, cy - 10, r * 2, 28, 7), cloth, {
    shade: 4,
    inner: (c) => {
      // The lacing: a zigzag from rim to rim.
      const pts: Pt[] = [];
      for (let i = 0; i <= 6; i++) pts.push([cx - r + 4 + (i * (r * 2 - 8)) / 6, i % 2 === 0 ? cy - 6 : cy + 14]);
      c.line('lacing', poly(pts, false));
      c.piece('hoop', roundRect(cx - r - 2, cy + 12, r * 2 + 4, 6, 0), GOLD, { shade: 0 });
    },
  });
  d.piece('skin', ellipse(cx, cy - 10, r, 7), BONE, { shade: 0 });
}

/** A drumstick with a padded head. */
export function beater(d: Doc, g: Grip, len = 30, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('stick', t(roundRect(-2.5, -len, 5, len + 8, 2)), WOOD, { shade: 0 });
  d.piece('pad', t(circle(0, -len - 5, 8)), LINEN, { shade: 3 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A great curved horn bound with gold, its mouth up and forward. The Skald's. */
export function warHorn(d: Doc, g: Grip, len = 46, hand: Material = LEATHER): void {
  const t = at(g);
  // Narrow at the hand, where it is blown, and wide at the far end: a crescent.
  d.piece('horn', t(smooth([
    [-3, 8, 'c'], [-7, -len * 0.5], [2, -len], [20, -len - 18, 'c'],
    [36, -len - 8, 'c'], [20, -len + 6], [9, -len * 0.45], [4, 8, 'c'],
  ])), BONE, {
    shade: 4,
    inner: (c) => {
      c.piece('band-a', t(roundRect(-10, -len * 0.45 - 3, 24, 6, 0)), GOLD, { shade: 0 });
      c.piece('band-b', t(roundRect(-6, -len - 6, 26, 6, 0).rotate(38, 6, -len - 3)), GOLD, { shade: 0 });
    },
  });
  // The mouth of the horn: one dark opening at its wide end.
  const mouth = t(ellipse(28.5, -len - 13, 9.5, 5).rotate(35, 28.5, -len - 13));
  d.flat('mouth', mouth, HOOD_INTERIOR);
  d.line('mouth-edge', mouth);
  mitt(d, g.hand[0], g.hand[1], hand);
}

// ================================================================ the Faithful
// The townsfolk the rewards give. Each is read by a hat no soldier wears and
// by a tool of its trade, held as a soldier holds a weapon.

/** A tall hat with a flat top and a narrow brim, over a scarf, with shadow between. The Lamplighter's. */
export function stovepipe(d: Doc, hat: Material, scarf: Material, band: Material = GOLD): void {
  under(d);
  const face = ellipse(98, 88, 27, 21);
  d.flat('shadow-under', face, HOOD_INTERIOR);
  d.line('shadow-under-edge', face);
  d.piece('scarf', smooth([[69, 92], [84, 88], [112, 88], [127, 92], [125, 101], [112, 109], [84, 109], [71, 101]]), scarf, {
    shade: 4,
    inner: (c) => c.line('fold', smooth([[75, 98], [98, 95], [123, 98]], false)),
  });
  // The crown stands as tall as the head under it, and is a little wider at the top than at the band.
  d.piece('crown', smooth([[77, 76, 'c'], [75, 50], [72, 22, 'c'], [122, 22, 'c'], [119, 50], [117, 76, 'c']]), hat, {
    shade: 6,
    inner: (c) => c.piece('band', roundRect(66, 60, 62, 10, 0), band, { shade: 0 }),
  });
  d.piece('brim', smooth([[57, 75], [96, 69], [137, 75], [138, 81], [96, 84], [56, 81]]), hat, { shade: 3 });
}

/**
 * A wide straw hat with a veil hung from its brim to the shoulders, all the
 * way round, and one dark window of net at the front. The Beekeeper's.
 */
export function veilHat(d: Doc, hat: Material, veil: Material = LINEN, band: Material = LEATHER): void {
  under(d);
  d.piece('veil', smooth([[67, 72, 'c'], [127, 72, 'c'], [133, 94], [127, 110], [96, 113], [67, 110], [61, 94]]), veil, {
    shade: 5,
    inner: (c) => {
      dark(c, 'net', roundRect(101, 80, 40, 22, 7));
      // The cloth is gathered where it is tied under the brim, and hangs in folds from there.
      crease(c, 'fold-a', [76, 76], [72, 108], 3);
      crease(c, 'fold-b', [90, 76], [89, 110], 2.6);
    },
  });
  d.piece('crown', smooth([[78, 70, 'c'], [80, 55], [97, 48], [114, 55], [116, 70, 'c']]), hat, {
    shade: 4,
    inner: (c) => c.piece('band', roundRect(70, 61, 54, 7, 0), band, { shade: 0 }),
  });
  d.piece('brim', smooth([[44, 70], [96, 62], [150, 70], [151, 77], [96, 80], [43, 77]]), hat, { shade: 3 });
}

/** A hat with its brim turned up into three corners, over a scarf, with shadow between. The Bell Ringer's. */
export function tricorn(d: Doc, hat: Material, scarf: Material, trim: Material = GOLD): void {
  under(d);
  const face = ellipse(98, 88, 27, 21);
  d.flat('shadow-under', face, HOOD_INTERIOR);
  d.line('shadow-under-edge', face);
  d.piece('scarf', smooth([[69, 92], [84, 88], [112, 88], [127, 92], [125, 101], [112, 109], [84, 109], [71, 101]]), scarf, { shade: 4 });
  // One corner forward, one back, and the third up over the brow.
  const shape = smooth([[46, 78, 'c'], [62, 64], [80, 58], [98, 40, 'c'], [114, 58], [132, 64], [152, 80, 'c'], [124, 82], [96, 85], [70, 82]]);
  d.piece('hat', shape, hat, {
    shade: 5,
    inner: (c) => {
      c.piece('trim', smooth([[40, 74], [70, 77], [96, 80], [124, 77], [158, 76], [158, 86], [96, 89], [40, 84]]), trim, { shade: 0 });
      crease(c, 'turn-a', [98, 46], [82, 70], 2.8);
      crease(c, 'turn-b', [98, 46], [116, 70], 2.8);
    },
  });
}

/** A closed helm with one slit, and a great crest that stands from brow to nape. The Honor Guard's. */
export function crestedHelm(d: Doc, crest: Material, mat: Material = STEEL, trim: Material = GOLD): void {
  // The crest stands behind the dome and over it.
  d.piece('crest', smooth([[122, 58, 'c'], [116, 30], [96, 16], [72, 20], [54, 40], [48, 68], [56, 94, 'c'], [66, 76], [80, 62], [100, 56]]), crest, {
    shade: 6,
    inner: (c) => {
      // The hair of it, all standing out from the helm.
      crease(c, 'hair-a', [108, 52], [112, 28], 2.8, 0.9);
      crease(c, 'hair-b', [92, 54], [88, 22], 2.8, 0.9);
      crease(c, 'hair-c', [78, 60], [66, 30], 2.8, 0.9);
      crease(c, 'hair-d', [68, 72], [52, 52], 2.6, 0.9);
    },
  });
  roundHelm(d, mat);
  // The comb the crest is set in.
  d.piece('comb', smooth([[62, 86, 'c'], [66, 68], [80, 56], [100, 51], [120, 55, 'c'], [118, 61], [100, 58], [84, 62], [72, 72], [68, 88, 'c']]), trim, { shade: 0 });
}

/** A flat-topped mask of plate with one slit, strapped on. The Blacksmith's. */
export function forgeMask(d: Doc, mat: Material = IRON, strap: Material = LEATHER): void {
  under(d);
  d.piece('mask', smooth([[69, 55, 'c'], [125, 55, 'c'], [130, 80], [126, 101], [109, 109], [84, 109], [68, 101], [64, 80]]), mat, {
    shade: 6,
    inner: (c) => {
      c.piece('strap', roundRect(58, 61, 80, 9, 0), strap, { shade: 0 });
      c.shadeOver('plate', roundRect(88, 70, 2.6, 40, 1), 0.9);
      // A row of three down the back plate: a row reads as rivets.
      rivet(c, 81, 80, 1.8);
      rivet(c, 81, 90, 1.8);
      rivet(c, 81, 100, 1.8);
      dark(c, 'slit', roundRect(97, 79, 44, 8, 4));
    },
  });
  d.glint('glint', capsule(73, 74, 77, 70, 4));
}

/** A hood with a long tail hung down the back. The Gravedigger's. */
export function tailHood(d: Doc, mat: Material): void {
  d.piece('tail', smooth([[70, 62, 'c'], [54, 66], [44, 88], [44, 120], [50, 142, 'c'], [58, 122], [60, 96], [72, 84, 'c']]), mat, {
    shade: 4,
    inner: (c) => crease(c, 'tail-fold', [58, 74], [50, 128], 2.8),
  });
  hood(d, mat, 4);
}

/** A long pole with a hook to open a lamp and a wick burning at its tip. The Lamplighter's. */
export function lampPole(d: Doc, g: Grip, glow: Accent, len = 84, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('pole', t(roundRect(-3, -len, 6, len + 38, 3)), WOOD, { shade: 2 });
  d.piece('hook', t(smooth([
    [-3, -len + 4, 'c'], [-3, -len - 6], [-13, -len - 10], [-18, -len, 'c'],
    [-12, -len, 'c'], [-10, -len - 4], [3, -len - 4], [3, -len + 4, 'c'],
  ])), IRON, { shade: 0 });
  // The light: two flat rings and a core, as every glow here is.
  d.flat('halo', t(circle(5, -len - 16, 18)), glow.light, 0.45);
  d.piece('flame', t(smooth([[5, -len - 34, 'c'], [14, -len - 18], [12, -len - 7], [5, -len - 3], [-2, -len - 7], [-4, -len - 18]])), glow, {
    shade: 3,
    inner: (c) => c.flat('core', t(ellipse(5, -len - 12, 4, 7)), glow.light),
  });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A halberd: an axe blade, a spike over it and a hook behind, on a shaft taller than whoever holds it. The Honor Guard's. */
export function halberd(d: Doc, g: Grip, cloth: Material, len = 90, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-3.5, -len, 7, len + 32, 3)), WOOD, { shade: 2 });
  // A tassel in the side's color, tied under the head.
  d.piece('tassel', t(poly([[-3, -len + 30], [-20, -len + 34], [-13, -len + 42], [-22, -len + 52], [-3, -len + 50]])), cloth, { shade: 3 });
  d.piece('spike', t(poly([[0, -len - 34], [6.5, -len - 2], [-6.5, -len - 2]])), STEEL, { shade: 0 });
  d.piece('hook', t(poly([[-3, -len + 2], [-20, -len - 2], [-13, -len + 9], [-3, -len + 16]])), STEEL, { shade: 0 });
  const blade = smooth([
    [3, -len, 'c'],
    [15, -len - 5],
    [29, -len - 14, 'c'],
    [34, -len + 8],
    [29, -len + 30, 'c'],
    [15, -len + 22],
    [3, -len + 20, 'c'],
  ]);
  d.piece('blade', t(blade), STEEL, {
    shade: 5,
    inner: (c) => c.shadeOver('cheek', t(blade.translate(-7, 0)), 0.8),
  });
  d.piece('socket', t(roundRect(-6, -len - 4, 12, 28, 3)), GOLD, { shade: 0 });
  const upper = t(circle(0, -28, 7.5)).bounds();
  mitt(d, upper.x + upper.w / 2, upper.y + upper.h / 2, hand, 7.5, 'hand-upper');
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A shovel with a pointed blade and a grip across the end of its shaft. The Gravedigger's. */
export function shovel(d: Doc, g: Grip, len = 68, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-3.5, -len, 7, len + 26, 3)), WOOD, { shade: 2 });
  d.piece('grip', t(roundRect(-10, 22, 20, 7, 3)), WOOD, { shade: 0 });
  d.piece('blade', t(smooth([[-14, -len + 2, 'c'], [14, -len + 2, 'c'], [15, -len - 18], [0, -len - 36, 'c'], [-15, -len - 18]])), IRON, {
    shade: 4,
    inner: (c) => {
      // Pressed out of one sheet: a rib down the middle, and the edge worn bright.
      c.shadeOver('rib', t(roundRect(-1.3, -len - 26, 2.6, 28, 1)), 0.9);
      c.lightOver('edge', t(smooth([[-15, -len - 18], [0, -len - 36, 'c'], [15, -len - 18], [9, -len - 19], [0, -len - 29, 'c'], [-9, -len - 19]])), 0.8);
    },
  });
  d.piece('socket', t(roundRect(-5.5, -len - 2, 11, 12, 2)), IRON, { shade: 0 });
  const upper = t(circle(0, -26, 7.5)).bounds();
  mitt(d, upper.x + upper.w / 2, upper.y + upper.h / 2, hand, 7.5, 'hand-upper');
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A great handbell, hung mouth down from the hand that rings it. The Bell Ringer's. */
export function handbell(d: Doc, g: Grip, drop = 8, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('handle', t(roundRect(-3.5, -2, 7, drop + 10, 3)), WOOD, { shade: 0 });
  d.piece('clapper', t(circle(0, drop + 45, 5.5)), IRON, { shade: 0 });
  d.piece('bell', t(smooth([[-8, drop + 5, 'c'], [8, drop + 5, 'c'], [13, drop + 22], [24, drop + 40, 'c'], [-24, drop + 40, 'c'], [-13, drop + 22]])), GOLD, {
    shade: 5,
    inner: (c) => {
      c.shadeOver('lip', t(roundRect(-26, drop + 32, 52, 3, 0)), 0.9);
      c.shadeOver('band', t(roundRect(-26, drop + 14, 52, 2.6, 0)), 0.7);
    },
  });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A hive of coiled straw, carried on the hand that throws what is in it. The Beekeeper's. */
export function skep(d: Doc, g: Grip, straw: Material, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('hive', t(smooth([[-18, 0, 'c'], [-19, -16], [-12, -31], [0, -37], [12, -31], [19, -16], [18, 0, 'c']])), straw, {
    shade: 5,
    inner: (c) => {
      // Coil on coil, and one way in.
      c.shadeOver('coil-a', t(roundRect(-22, -11, 44, 2.6, 0)), 0.9);
      c.shadeOver('coil-b', t(roundRect(-22, -20, 44, 2.6, 0)), 0.9);
      c.shadeOver('coil-c', t(roundRect(-22, -29, 44, 2.6, 0)), 0.9);
      dark(c, 'door', t(roundRect(-5.5, -9, 11, 10, 4.5)));
    },
  });
  mitt(d, g.hand[0], g.hand[1] + 4, hand);
}

/** Tongs with a billet in their jaws, still glowing from the fire. The Blacksmith's. */
export function tongs(d: Doc, cx: number, cy: number, glow: Accent, hand: Material = LEATHER): void {
  d.piece('bar-a', capsule(cx + 6, cy + 8, cx - 22, cy - 24, 5), IRON, { shade: 0 });
  d.piece('bar-b', capsule(cx - 4, cy + 10, cx - 16, cy - 28, 5), IRON, { shade: 0 });
  d.flat('halo', circle(cx - 24, cy - 31, 15), glow.light, 0.45);
  d.piece('billet', roundRect(cx - 35, cy - 37, 22, 12, 2).rotate(18, cx - 24, cy - 31), glow, {
    shade: 3,
    inner: (c) => c.flat('heat', roundRect(cx - 31, cy - 34, 12, 5, 2).rotate(18, cx - 24, cy - 31), glow.light),
  });
  mitt(d, cx, cy + 4, hand);
}
