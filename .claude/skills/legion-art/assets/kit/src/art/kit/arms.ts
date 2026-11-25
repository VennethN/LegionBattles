// More of what a hand holds: weapons, tools of a trade, things to cast with.
// As in parts.ts, each is drawn upright with its hand at the origin and then
// turned to how it is held: `at` does both. The hand is drawn last, over
// whatever it grips.
//
// Each is the thing it is: a pick is a pick, an anchor an anchor. What a
// unit holds is half of how it is told from the others.

import type { Doc } from './draw';
import { BONE, BUSH, FIRE, GOLD, IRON, LEATHER, LINEN, RUBY, STEEL, STONE, WOOD, type Accent, type Material } from './palette';
import { STRAW } from './heads';
import { at, crease, mitt, rivet, type Grip } from './parts';
import { Path, capsule, circle, ellipse, line, path, poly, roundRect, smooth, star } from './path';

/** The upper hand of a weapon held in two. */
function upperHand(d: Doc, g: Grip, y: number, hand: Material): void {
  const b = at(g)(circle(0, y, 7.5)).bounds();
  mitt(d, b.x + b.w / 2, b.y + b.h / 2, hand, 7.5, 'hand-upper');
}

function shaft(d: Doc, t: (p: Path) => Path, len: number, tail: number, mat: Material = WOOD, w = 7): void {
  d.piece('shaft', t(roundRect(-w / 2, -len, w, len + tail, 3)), mat, { shade: 2 });
}

/** A glow: a flat pale ring. Never a blur. */
function halo(d: Doc, t: (p: Path) => Path, x: number, y: number, r: number, glow: Accent): void {
  d.flat('halo', t(circle(x, y, r)), glow.light, 0.45);
}

// ---------------------------------------------------------------- blades and clubs for one hand

/** A mace: a short haft and a head of flanges. */
export function mace(d: Doc, g: Grip, len = 48, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 16);
  d.piece('head', t(star(0, -len - 6, 6, 17, 10)), STEEL, { shade: 4 });
  d.piece('collar', t(roundRect(-6, -len + 6, 12, 7, 2)), GOLD, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A morning star: a ball of iron set with spikes, on a haft. */
export function morningstar(d: Doc, g: Grip, len = 52, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 16);
  d.piece('spikes', t(star(0, -len - 8, 8, 22, 12)), STEEL, { shade: 0 });
  d.piece('ball', t(circle(0, -len - 8, 13)), IRON, { shade: 4 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A flail: a spiked ball on a chain, swung out ahead of its handle. */
export function flail(d: Doc, g: Grip, len = 34, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 14);
  d.line('chain', t(path().M(0, -len).Q(16, -len - 8, 20, -len - 24)));
  d.piece('spikes', t(star(22, -len - 34, 8, 19, 10)), STEEL, { shade: 0 });
  d.piece('ball', t(circle(22, -len - 34, 11)), IRON, { shade: 4 });
  d.piece('cap', t(roundRect(-5, -len - 3, 10, 8, 2)), IRON, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A cutlass: a broad blade that curves back and widens toward its point, with a guard round the hand. */
export function cutlass(d: Doc, g: Grip, len = 54, hand: Material = LEATHER): void {
  const t = at(g);
  const blade = smooth([[-6, -9, 'c'], [-7, -len * 0.5], [-13, -len + 6], [-22, -len - 4, 'c'], [-4, -len + 4], [7, -len * 0.5], [7, -9, 'c']]);
  d.piece('blade', t(blade), STEEL, {
    shade: 4,
    inner: (c) => c.lightOver('edge', t(smooth([[2, -9, 'c'], [3, -len * 0.5], [-6, -len + 2], [-22, -len - 4, 'c'], [-4, -len + 4], [7, -len * 0.5], [7, -9, 'c']])), 0.9),
  });
  d.piece('guard', t(smooth([[-9, -12, 'c'], [9, -12, 'c'], [16, -2], [14, 10, 'c'], [9, 10, 'c'], [10, -2], [6, -6], [-9, -6, 'c']])), GOLD, { shade: 3 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A khopesh: a straight shank from the hand, and then a crescent of a blade, edged on its outer curve. */
export function khopesh(d: Doc, g: Grip, len = 54, hand: Material = LEATHER, mat: Material = GOLD): void {
  const t = at(g);
  const k = len / 54;
  const s0 = 20 * k;
  d.piece('shank', t(roundRect(-4, -s0 - 4, 8, s0 - 2, 2)), mat, { shade: 0 });
  const blade = smooth([
    [-4, -s0 + 2, 'c'], [-6, -s0 - 16 * k], [6, -s0 - 30 * k], [22 * k, -s0 - 34 * k], [36 * k, -s0 - 24 * k, 'c'],
    [22 * k, -s0 - 25 * k], [10 * k, -s0 - 20 * k], [5, -s0 - 9 * k], [5, -s0 + 2, 'c'],
  ]);
  d.piece('blade', t(blade), mat, { shade: 3 });
  d.piece('guard', t(roundRect(-10, -12, 20, 6, 3)), mat, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A rapier: a long thin blade and a cup over the hand. */
export function rapier(d: Doc, g: Grip, len = 72, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('blade', t(poly([[-2.8, -10], [-2.8, -len + 8], [0, -len], [2.8, -len + 8], [2.8, -10]])), STEEL, { shade: 0 });
  d.piece('cup', t(smooth([[-13, -14, 'c'], [13, -14, 'c'], [11, -5], [0, -1], [-11, -5]])), GOLD, { shade: 3 });
  d.line('bow', t(path().M(11, -8).Q(18, 2, 8, 12)));
  d.piece('pommel', t(circle(0, 13, 4.5)), GOLD, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A cleaver: a slab of a blade on a short handle. */
export function cleaver(d: Doc, g: Grip, len = 42, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('handle', t(roundRect(-3.5, -12, 7, 26, 3)), WOOD, { shade: 0 });
  d.piece('blade', t(smooth([[-4, -10, 'c'], [-4, -len, 'c'], [20, -len - 2, 'c'], [24, -16], [18, -10, 'c']])), IRON, {
    shade: 4,
    inner: (c) => c.lightOver('edge', t(smooth([[16, -len - 2, 'c'], [20, -len - 2, 'c'], [24, -16], [18, -10, 'c'], [15, -14]])), 1.1),
  });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A sickle: a crescent of a blade on a short handle. */
export function sickle(d: Doc, g: Grip, len = 22, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('handle', t(roundRect(-3.5, -len, 7, len + 14, 3)), WOOD, { shade: 0 });
  d.piece('blade', t(smooth([[-3, -len + 2, 'c'], [-4, -len - 16], [10, -len - 28], [28, -len - 22, 'c'], [12, -len - 20], [5, -len - 10], [4, -len + 2, 'c']])), STEEL, { shade: 3 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A pick: a haft with a head of iron drawn out to a point each way. Two hands when `two`. */
export function pick(d: Doc, g: Grip, len = 58, two = false, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, two ? 24 : 16);
  d.piece('head', t(smooth([[-30, -len + 12, 'c'], [-16, -len - 4], [0, -len - 8], [16, -len - 4], [30, -len + 12, 'c'], [14, -len + 4], [0, -len + 2], [-14, -len + 4]])), IRON, {
    shade: 4,
    inner: (c) => c.lightOver('worn', t(poly([[20, -len + 2], [30, -len + 12], [18, -len + 6]])), 1.2),
  });
  d.piece('eye', t(roundRect(-5.5, -len - 9, 11, 14, 2)), IRON, { shade: 0 });
  if (two) upperHand(d, g, -24, hand);
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A torch: a stick with its head wrapped and burning. */
export function torch(d: Doc, g: Grip, glow: Accent = FIRE, len = 38, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 12, WOOD, 6);
  halo(d, t, 0, -len - 14, 17, glow);
  d.piece('flame', t(smooth([[-9, -len - 2, 'c'], [-11, -len - 14], [-4, -len - 22], [-2, -len - 34, 'c'], [6, -len - 24], [11, -len - 14], [9, -len - 2, 'c']])), glow, { shade: 3 });
  d.flat('flame-core', t(smooth([[-4, -len - 4, 'c'], [-5, -len - 12], [0, -len - 20, 'c'], [5, -len - 12], [4, -len - 4, 'c']])), glow.light);
  d.piece('wrap', t(roundRect(-6, -len - 4, 12, 12, 3)), LINEN, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A whip: a handle and a long lash that curls back on itself. */
export function whip(d: Doc, g: Grip, hand: Material = LEATHER): void {
  const t = at(g);
  d.line('lash', t(path().M(0, -12).C(4, -40, 30, -52, 40, -34).C(46, -22, 34, -12, 26, -20).C(22, -26, 28, -32, 32, -28)));
  d.piece('handle', t(roundRect(-3.5, -14, 7, 28, 3)), LEATHER, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A wrench: a bar of iron with open jaws at its end. */
export function wrench(d: Doc, g: Grip, len = 46, hand: Material = LEATHER, mat: Material = IRON): void {
  const t = at(g);
  d.piece('bar', t(roundRect(-4, -len, 8, len + 14, 3)), mat, { shade: 2 });
  d.piece('jaws', t(path().M(-13, -len - 14).L(-13, -len + 4).Q(-13, -len + 10, -6, -len + 10).L(6, -len + 10).Q(13, -len + 10, 13, -len + 4).L(13, -len - 14).L(6, -len - 14).L(6, -len - 2).L(-6, -len - 2).L(-6, -len - 14).Z()), mat, { shade: 3 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A great key: a ring for a bow, a long stem, and the bit at its end. */
export function greatKey(d: Doc, g: Grip, len = 56, hand: Material = LEATHER, mat: Material = GOLD): void {
  const t = at(g);
  d.piece('stem', t(roundRect(-3.5, -len, 7, len + 4, 3)), mat, { shade: 2 });
  d.piece('bit', t(path().M(2, -len).L(18, -len).L(18, -len + 7).L(12, -len + 7).L(12, -len + 13).L(18, -len + 13).L(18, -len + 20).L(2, -len + 20).Z()), mat, { shade: 3 });
  // The ring is a ring: what is behind it shows through. A dark middle in a pale ring would read as an eye.
  d.piece('bow', t(circle(0, 12, 12)).add(t(circle(0, 12, 5.5))), mat, { shade: 0, holes: true });
  d.line('bow-inner', t(circle(0, 12, 5.5)));
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A ladle: a long handle and a deep bowl. */
export function ladle(d: Doc, g: Grip, len = 46, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('handle', t(roundRect(-2.5, -len, 5, len + 12, 2)), IRON, { shade: 0 });
  d.piece('bowl', t(smooth([[-12, -len - 6, 'c'], [12, -len - 6, 'c'], [11, -len + 6], [0, -len + 12], [-11, -len + 6]])), IRON, { shade: 3 });
  d.flat('soup', t(ellipse(0, -len - 6, 10, 3)), BONE.fill);
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A rolling pin. */
export function rollingPin(d: Doc, g: Grip, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('grip', t(roundRect(-3, -50, 6, 64, 3)), WOOD, { shade: 0 });
  d.piece('roll', t(roundRect(-8, -42, 16, 34, 6)), BONE, { shade: 4 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** Shears: two long blades open in a V. */
export function shears(d: Doc, g: Grip, len = 46, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('blade-a', t(poly([[-3, -4], [-15, -len], [-4, -len * 0.55], [4, -6]])), STEEL, { shade: 0 });
  d.piece('blade-b', t(poly([[3, -4], [15, -len], [4, -len * 0.55], [-4, -6]])), STEEL, { shade: 3 });
  d.piece('pin', t(circle(0, -12, 3.2)), GOLD, { shade: 0 });
  d.piece('loop', t(smooth([[-6, 0], [0, -4], [6, 0], [8, 12], [0, 18], [-8, 12]])), IRON, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A saw: a broad blade with teeth along one edge, and a grip. */
export function saw(d: Doc, g: Grip, len = 54, hand: Material = LEATHER): void {
  const t = at(g);
  const teeth = path().M(-8, -10).L(-4, -len);
  for (let y = -len; y < -12; y += 8) teeth.L(12, y + 4).L(8, y + 8);
  teeth.L(8, -10).Z();
  d.piece('blade', t(teeth), STEEL, { shade: 3 });
  d.piece('grip', t(roundRect(-10, -12, 22, 24, 6)), WOOD, { shade: 3 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A mallet: a block of wood on a haft. */
export function mallet(d: Doc, g: Grip, len = 46, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 14);
  d.piece('head', t(roundRect(-17, -len - 12, 34, 22, 4)), WOOD, {
    shade: 4,
    inner: (c) => {
      c.piece('band-a', t(roundRect(-19, -len - 14, 6, 26, 0)), IRON, { shade: 0 });
      c.piece('band-b', t(roundRect(13, -len - 14, 6, 26, 0)), IRON, { shade: 0 });
    },
  });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A shepherd's crook. */
export function crook(d: Doc, g: Grip, len = 78, hand: Material = LEATHER, mat: Material = WOOD): void {
  const t = at(g);
  shaft(d, t, len, 36, mat);
  d.piece('hook', t(smooth([
    [-3.5, -len + 2, 'c'], [-3.5, -len - 14], [8, -len - 22], [22, -len - 16], [26, -len - 2], [20, -len + 8, 'c'],
    [15, -len + 4, 'c'], [19, -len - 3], [17, -len - 10], [8, -len - 14], [3.5, -len - 8], [3.5, -len + 2, 'c'],
  ])), mat, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A fishing rod: a thin pole, its line, and a float on the line. */
export function fishingRod(d: Doc, g: Grip, len = 84, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('rod', t(poly([[-3, 14], [-1.5, -len], [1.5, -len], [3, 14]])), WOOD, { shade: 0 });
  d.line('line', t(path().M(0, -len).Q(22, -len + 8, 26, -len + 38)));
  d.piece('float', t(ellipse(26, -len + 42, 5, 7)), RUBY, { shade: 0 });
  d.piece('reel', t(circle(5, -4, 5)), IRON, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

// ---------------------------------------------------------------- long things for two hands

/** A trident: three tines on a long shaft. A pitchfork is the same in wood and iron. */
export function trident(d: Doc, g: Grip, len = 76, mat: Material = STEEL, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 34);
  d.piece('tines', t(path()
    .M(-14, -len - 26).L(-10, -len - 8).L(-3, -len - 8).L(0, -len - 32).L(3, -len - 8).L(10, -len - 8).L(14, -len - 26)
    .L(17, -len - 2).Q(17, -len + 6, 9, -len + 6).L(-9, -len + 6).Q(-17, -len + 6, -17, -len - 2).Z()), mat, { shade: 3 });
  d.piece('socket', t(roundRect(-5.5, -len + 4, 11, 10, 2)), mat, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A scythe: a long snath and a blade that sweeps out from its end. */
export function scythe(d: Doc, g: Grip, len = 84, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 30);
  d.piece('grip', t(roundRect(-12, -30, 12, 6, 3)), WOOD, { shade: 0 });
  d.piece('blade', t(smooth([[-4, -len + 4, 'c'], [-2, -len - 8], [18, -len - 12], [40, -len - 2], [54, -len + 18, 'c'], [36, -len + 6], [18, -len + 2], [4, -len + 8, 'c']])), STEEL, {
    shade: 4,
    inner: (c) => c.lightOver('edge', t(smooth([[54, -len + 18, 'c'], [36, -len + 6], [18, -len + 2], [4, -len + 8, 'c'], [18, -len + 6], [36, -len + 11]])), 1.1),
  });
  d.piece('ring', t(roundRect(-6, -len - 2, 12, 9, 2)), IRON, { shade: 0 });
  upperHand(d, g, -30, hand);
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A glaive: one long curved edge on the end of a pole. */
export function glaive(d: Doc, g: Grip, len = 78, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 32);
  d.piece('blade', t(smooth([[-5, -len + 4, 'c'], [-6, -len - 18], [-2, -len - 36], [8, -len - 46, 'c'], [12, -len - 28], [10, -len - 10], [5, -len + 4, 'c']])), STEEL, {
    shade: 4,
    inner: (c) => c.lightOver('edge', t(smooth([[8, -len - 46, 'c'], [12, -len - 28], [10, -len - 10], [5, -len + 4, 'c'], [5, -len - 12], [6, -len - 30]])), 1),
  });
  d.piece('collar', t(roundRect(-6.5, -len + 2, 13, 9, 2)), GOLD, { shade: 0 });
  upperHand(d, g, -28, hand);
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** An anchor, swung by its shank: the flukes at the far end, the stock across it by the hands. */
export function anchor(d: Doc, g: Grip, len = 62, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shank', t(roundRect(-4.5, -len, 9, len + 20, 3)), IRON, { shade: 3 });
  d.piece('stock', t(roundRect(-18, 8, 36, 7, 3)), WOOD, { shade: 0 });
  d.piece('flukes', t(smooth([
    [-30, -len + 20, 'c'], [-28, -len - 2], [-12, -len - 12], [0, -len - 14], [12, -len - 12], [28, -len - 2], [30, -len + 20, 'c'],
    [21, -len + 8], [12, -len], [0, -len - 3], [-12, -len], [-21, -len + 8],
  ])), IRON, { shade: 4 });
  upperHand(d, g, -24, hand);
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** An oar. */
export function oar(d: Doc, g: Grip, len = 78, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 30);
  d.piece('blade', t(smooth([[-4, -len + 4, 'c'], [-11, -len - 10], [-10, -len - 36], [0, -len - 42], [10, -len - 36], [11, -len - 10], [4, -len + 4, 'c']])), WOOD, {
    shade: 4,
    inner: (c) => c.shadeOver('rib', t(roundRect(-1.2, -len - 38, 2.4, 40, 1)), 0.9),
  });
  upperHand(d, g, -28, hand);
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A broom of twigs. */
export function broom(d: Doc, g: Grip, len = 70, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 30);
  d.piece('twigs', t(smooth([[-6, -len + 2, 'c'], [-16, -len - 30, 'c'], [-6, -len - 36], [4, -len - 32], [16, -len - 34, 'c'], [6, -len + 2, 'c']])), STRAW, {
    shade: 4,
    inner: (c) => {
      crease(c, 'twig-a', [-3, -len - 2], [-9, -len - 30], 2.4, 0.9);
      crease(c, 'twig-b', [2, -len - 2], [5, -len - 30], 2.4, 0.9);
    },
  });
  d.piece('binding', t(roundRect(-7.5, -len - 2, 15, 7, 2)), LEATHER, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A staff with nothing on it but a cap of iron at each end. */
export function quarterstaff(d: Doc, g: Grip, len = 70, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 50);
  d.piece('cap-a', t(roundRect(-5, -len - 2, 10, 12, 3)), IRON, { shade: 0 });
  d.piece('cap-b', t(roundRect(-5, 40, 10, 12, 3)), IRON, { shade: 0 });
  upperHand(d, g, -30, hand);
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A standard: a tall pole with a banner hung from a bar across it, and a mark on the banner. */
export function standard(d: Doc, g: Grip, cloth: Material, len = 92, hand: Material = LEATHER, mark: Material = GOLD): void {
  const t = at(g);
  shaft(d, t, len, 36);
  d.piece('banner', t(poly([[-18, -len + 6], [18, -len + 6], [18, -len + 48], [9, -len + 40], [0, -len + 50], [-9, -len + 40], [-18, -len + 48]])), cloth, {
    shade: 4,
    inner: (c) => {
      c.piece('mark', t(poly([[0, -len + 12], [9, -len + 23], [0, -len + 34], [-9, -len + 23]])), mark, { shade: 0 });
      c.shadeOver('fold', t(capsule(-12, -len + 8, -13, -len + 44, 1.8)), 0.8);
    },
  });
  d.piece('bar', t(roundRect(-22, -len + 1, 44, 6, 3)), WOOD, { shade: 0 });
  d.piece('finial', t(poly([[0, -len - 16], [6, -len - 6], [0, -len + 1], [-6, -len - 6]])), mark, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

// ---------------------------------------------------------------- shot and thrown

/** A longbow: taller than whoever draws it. */
export function longbow(d: Doc, g: Grip, hand: Material = LEATHER): void {
  const t = at(g);
  d.line('string', t(line(-9, -56, -9, 56)));
  const limb = path()
    .M(-12, -62).C(8, -52, 15, -24, 14, 0).C(15, 24, 8, 52, -12, 62)
    .L(-14, 52).C(0, 40, 5, 18, 5, 0).C(5, -18, 0, -40, -14, -52).Z();
  d.piece('limbs', t(limb), WOOD, { shade: 3 });
  d.piece('grip', t(roundRect(3, -9, 12, 18, 4)), LEATHER, { shade: 0 });
  mitt(d, g.hand[0] + 6, g.hand[1], hand);
}

/** A gun of the old kind: a wooden stock and an iron barrel that flares at its mouth. */
export function arquebus(d: Doc, g: Grip, len = 62, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('stock', t(smooth([[-5, -len * 0.5, 'c'], [5, -len * 0.5, 'c'], [6, 4], [12, 22, 'c'], [0, 26, 'c'], [-6, 6]])), WOOD, { shade: 3 });
  d.piece('barrel', t(path().M(-4, -8).L(-4, -len + 8).L(-9, -len).L(9, -len).L(4, -len + 8).L(4, -8).Z()), IRON, { shade: 3 });
  d.piece('band', t(roundRect(-6, -len * 0.5, 12, 6, 0)), GOLD, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A sling whirled overhead: two cords and a stone in the cradle. */
export function sling(d: Doc, g: Grip, hand: Material = LEATHER): void {
  const t = at(g);
  d.line('cord-a', t(path().M(0, -4).Q(-10, -24, 6, -40)));
  d.line('cord-b', t(path().M(0, -4).Q(14, -20, 14, -36)));
  d.piece('cradle', t(smooth([[2, -44, 'c'], [18, -40, 'c'], [16, -32], [6, -34]])), LEATHER, { shade: 0 });
  d.piece('stone', t(circle(11, -44, 7)), STONE, { shade: 3 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A bomb held up to throw: a ball of iron, its fuse, and the spark on the fuse. */
export function bomb(d: Doc, g: Grip, glow: Accent = FIRE, r = 12, hand: Material = LEATHER): void {
  const t = at(g);
  d.line('fuse', t(path().M(0, -r * 2 - 2).Q(8, -r * 2 - 12, 4, -r * 2 - 18)));
  halo(d, t, 4, -r * 2 - 20, 9, glow);
  d.piece('spark', t(star(4, -r * 2 - 20, 4, 6, 2.6)), glow, { shade: 0 });
  d.piece('ball', t(circle(0, -r - 2, r)), IRON, { shade: 4 });
  d.piece('neck', t(roundRect(-4, -r * 2 - 5, 8, 6, 2)), IRON, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1] + 2, hand);
}

/** A flask held up to throw: glass with something bright in it, and a cork. */
export function flask(d: Doc, g: Grip, glow: Accent, hand: Material = LEATHER): void {
  const t = at(g);
  halo(d, t, 0, -16, 19, glow);
  d.piece('glass', t(smooth([[-4, -34, 'c'], [-4, -26], [-13, -16], [-11, -5], [0, -1], [11, -5], [13, -16], [4, -26], [4, -34, 'c']])), BONE, {
    shade: 0,
    inner: (c) => c.piece('liquid', t(roundRect(-16, -19, 32, 22, 0)), glow, { shade: 0 }),
  });
  d.piece('cork', t(roundRect(-5, -40, 10, 8, 2)), WOOD, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1] + 3, hand);
}

/** A net gathered in the hand, ready to cast: its mesh, and the weights along its edge. */
export function net(d: Doc, g: Grip, hand: Material = LEATHER): void {
  const t = at(g);
  const shape = smooth([[-4, -2, 'c'], [-20, -18], [-22, -40], [-8, -52], [10, -52], [24, -40], [22, -18], [4, -2, 'c']]);
  d.piece('net', t(shape), LINEN, {
    shade: 0,
    inner: (c) => {
      for (let i = -3; i <= 3; i++) {
        c.shadeOver('mesh-a', t(capsule(i * 9 - 16, -56, i * 9 + 16, 0, 1.6)), 1.3);
        c.shadeOver('mesh-b', t(capsule(i * 9 + 16, -56, i * 9 - 16, 0, 1.6)), 1.3);
      }
    },
  });
  for (const [x, y] of [[-21, -30], [-8, -51], [10, -51], [23, -30]] as const) d.piece('weight', t(circle(x, y, 3.5)), IRON, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A boulder held overhead in both hands. */
export function boulder(d: Doc, g: Grip, mat: Material = STONE, r = 19, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('rock', t(smooth([[-r, -r - 4], [-r * 0.5, -r * 2 - 2], [r * 0.6, -r * 2], [r + 2, -r - 6], [r * 0.7, -4], [-r * 0.6, -3]])), mat, {
    shade: 5,
    inner: (c) => {
      c.lightOver('facet', t(poly([[-r + 3, -r - 6], [-r * 0.4, -r * 2 + 2], [0, -r - 8], [-r * 0.5, -r + 2]])), 0.55);
      c.shadeOver('facet-dark', t(poly([[r * 0.3, -r * 0.4], [r + 2, -r - 6], [r * 0.7, -4]])), 0.7);
    },
  });
  upperHand(d, g, -2, hand);
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A boomerang. */
export function boomerang(d: Doc, g: Grip, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('wing', t(smooth([[-4, 4, 'c'], [-6, -22], [2, -36], [26, -42, 'c'], [28, -34, 'c'], [10, -28], [4, -18], [5, 4, 'c']])), WOOD, {
    shade: 3,
    inner: (c) => c.piece('paint', t(roundRect(-10, -16, 20, 5, 0)), BONE, { shade: 0 }),
  });
  mitt(d, g.hand[0], g.hand[1], hand);
}

// ---------------------------------------------------------------- things to cast with

/** A book held open and up, its pages alight. */
export function tome(d: Doc, g: Grip, cover: Material, glow: Accent, hand: Material = LEATHER): void {
  const t = at(g);
  halo(d, t, 0, -24, 22, glow);
  d.piece('cover', t(poly([[-22, -8], [0, -3], [22, -8], [22, -30], [0, -25], [-22, -30]])), cover, { shade: 3 });
  d.piece('pages', t(poly([[-19, -11], [0, -6], [19, -11], [19, -32], [0, -27], [-19, -32]])), BONE, {
    shade: 0,
    inner: (c) => {
      c.line('spine', t(line(0, -6, 0, -27)));
      c.flat('word-a', t(roundRect(-15, -24, 10, 2.2, 1)), glow.fill);
      c.flat('word-b', t(roundRect(-15, -18, 10, 2.2, 1)), glow.fill);
      c.flat('word-c', t(roundRect(5, -24, 10, 2.2, 1)), glow.fill);
    },
  });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A sceptre: a short rod of gold with a stone at its head. */
export function sceptre(d: Doc, g: Grip, stone: Material = RUBY, len = 44, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 14, GOLD, 6);
  d.piece('claws', t(smooth([[-11, -len - 6, 'c'], [-8, -len + 4], [0, -len + 7], [8, -len + 4], [11, -len - 6, 'c'], [4, -len], [-4, -len]])), GOLD, { shade: 0 });
  d.piece('stone', t(poly([[0, -len - 22], [9, -len - 10], [0, -len + 1], [-9, -len - 10]])), stone, { shade: 3 });
  d.piece('pommel', t(circle(0, 15, 5)), GOLD, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A crosier: a tall staff of gold that curls in on itself at the top, with a stone in the curl. */
export function crosier(d: Doc, g: Grip, stone: Material = RUBY, len = 78, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 38, GOLD);
  d.piece('curl', t(smooth([
    [-3.5, -len + 2, 'c'], [-4, -len - 16], [8, -len - 28], [24, -len - 22], [28, -len - 6], [18, -len + 2], [8, -len - 4], [10, -len - 12, 'c'],
    [14, -len - 6], [20, -len - 8], [20, -len - 16], [10, -len - 20], [3.5, -len - 12], [3.5, -len + 2, 'c'],
  ])), GOLD, { shade: 0 });
  d.piece('stone', t(circle(13, -len - 11, 4.5)), stone, { shade: 0 });
  d.piece('knop', t(roundRect(-6, -len + 2, 12, 8, 3)), GOLD, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A staff with the sun at its head: a disc, and rays about it. */
export function sunStaff(d: Doc, g: Grip, glow: Accent, len = 70, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 40);
  halo(d, t, 0, -len - 14, 24, glow);
  d.piece('rays', t(star(0, -len - 14, 8, 22, 12)), GOLD, { shade: 0 });
  d.piece('disc', t(circle(0, -len - 14, 11)), glow, { shade: 3 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A staff with a crescent moon at its head, and one star in the crescent. */
export function moonStaff(d: Doc, g: Grip, glow: Accent, len = 70, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 40);
  halo(d, t, 0, -len - 16, 22, glow);
  d.piece('moon', t(path().M(-4, -len + 2).C(-22, -len - 4, -22, -len - 30, -4, -len - 36).C(-12, -len - 26, -12, -len - 10, -4, -len + 2).Z().translate(8, 0)), BONE, { shade: 3 });
  d.piece('star', t(star(8, -len - 17, 4, 7, 3)), glow, { shade: 0 });
  d.piece('socket', t(roundRect(-5, -len - 2, 10, 9, 2)), GOLD, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A staff with a great shell at its head, and water dripping from it. */
export function shellStaff(d: Doc, g: Grip, glow: Accent, len = 68, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 40);
  halo(d, t, 2, -len - 14, 21, glow);
  d.piece('shell', t(smooth([[-12, -len - 2, 'c'], [-16, -len - 18], [-6, -len - 32], [10, -len - 34, 'c'], [18, -len - 20], [14, -len - 6], [2, -len + 2]])), BONE, {
    shade: 4,
    inner: (c) => {
      c.line('whorl-a', t(smooth([[-12, -len - 12], [0, -len - 16], [12, -len - 12]], false)));
      c.line('whorl-b', t(smooth([[-8, -len - 24], [2, -len - 26], [12, -len - 24]], false)));
    },
  });
  d.piece('drop', t(smooth([[14, -len + 2, 'c'], [18, -len + 10], [14, -len + 15], [10, -len + 10]])), glow, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A living branch for a staff: a fork at its head, leaves on the fork, and a bud alight between. */
export function branchStaff(d: Doc, g: Grip, glow: Accent, len = 68, leaf: Material = BUSH, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 40);
  d.piece('fork-a', t(capsule(0, -len + 4, -14, -len - 20, 6)), WOOD, { shade: 0 });
  d.piece('fork-b', t(capsule(0, -len + 4, 12, -len - 24, 6)), WOOD, { shade: 0 });
  halo(d, t, 0, -len - 20, 15, glow);
  d.piece('bud', t(smooth([[0, -len - 30, 'c'], [7, -len - 20], [0, -len - 10, 'c'], [-7, -len - 20]])), glow, { shade: 0 });
  for (const [x, y, turn] of [[-20, -len - 24, -30], [18, -len - 30, 20], [16, -len - 12, 60]] as const) {
    d.piece('leaf', t(smooth([[-9, 0, 'c'], [0, -6], [10, 0, 'c'], [0, 6]]).rotate(turn).translate(x, y)), leaf, { shade: 0 });
  }
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A staff with a mushroom grown at its head, and spores drifting from it. */
export function sporeStaff(d: Doc, g: Grip, glow: Accent, cap: Material, len = 66, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 40);
  halo(d, t, 0, -len - 14, 22, glow);
  d.piece('stem', t(roundRect(-5, -len - 10, 10, 14, 3)), BONE, { shade: 0 });
  d.piece('cap', t(smooth([[-18, -len - 8, 'c'], [-16, -len - 22], [0, -len - 30], [16, -len - 22], [18, -len - 8, 'c'], [0, -len - 5]])), cap, {
    shade: 4,
    inner: (c) => {
      c.piece('spot-a', t(ellipse(-7, -len - 18, 4, 3)), BONE, { shade: 0 });
      c.piece('spot-b', t(ellipse(4, -len - 24, 3, 2.4)), BONE, { shade: 0 });
      c.piece('spot-c', t(ellipse(10, -len - 14, 3.5, 2.6)), BONE, { shade: 0 });
    },
  });
  for (const [x, y] of [[-22, -len - 30], [20, -len - 36], [26, -len - 14]] as const) d.flat('spore', t(circle(x, y, 2.6)), glow.fill);
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A staff with an hourglass set at its head. */
export function hourglassStaff(d: Doc, g: Grip, glow: Accent, len = 66, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 40);
  halo(d, t, 0, -len - 18, 21, glow);
  d.piece('glass', t(poly([[-10, -len - 32], [10, -len - 32], [2, -len - 18], [10, -len - 4], [-10, -len - 4], [-2, -len - 18]])), BONE, {
    shade: 0,
    inner: (c) => {
      c.flat('sand-a', t(poly([[-6, -len - 28], [6, -len - 28], [0, -len - 19]])), glow.fill);
      c.flat('sand-b', t(poly([[-8, -len - 4], [8, -len - 4], [0, -len - 12]])), glow.fill);
    },
  });
  d.piece('plate-a', t(roundRect(-13, -len - 36, 26, 6, 2)), GOLD, { shade: 0 });
  d.piece('plate-b', t(roundRect(-13, -len - 6, 26, 6, 2)), GOLD, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A candlestick of three branches, each candle alight. */
export function candelabra(d: Doc, g: Grip, glow: Accent, len = 40, hand: Material = LEATHER): void {
  const t = at(g);
  shaft(d, t, len, 14, GOLD, 6);
  d.piece('arms', t(path().M(-20, -len - 8).Q(-20, -len + 4, 0, -len + 4).Q(20, -len + 4, 20, -len - 8).L(15, -len - 8).Q(15, -len - 2, 0, -len - 2).Q(-15, -len - 2, -15, -len - 8).Z()), GOLD, { shade: 0 });
  for (const x of [-17.5, 0, 17.5]) {
    const up = x === 0 ? 8 : 0;
    d.flat('halo', t(circle(x, -len - 26 - up, 9)), glow.light, 0.45);
    d.piece('candle', t(roundRect(x - 3.5, -len - 20 - up, 7, 14 + up, 2)), BONE, { shade: 0 });
    d.piece('flame', t(smooth([[x, -len - 34 - up, 'c'], [x + 4.5, -len - 26 - up], [x, -len - 20 - up], [x - 4.5, -len - 26 - up]])), glow, { shade: 0 });
  }
  d.piece('foot', t(roundRect(-8, 10, 16, 6, 3)), GOLD, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A wand: a thin rod with a star at its tip. */
export function wand(d: Doc, g: Grip, glow: Accent, len = 34, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('rod', t(roundRect(-2.5, -len, 5, len + 12, 2)), WOOD, { shade: 0 });
  halo(d, t, 0, -len - 8, 15, glow);
  d.piece('star', t(star(0, -len - 8, 5, 12, 5)), glow, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** An orb that hangs in the air over an open hand. */
export function orbHand(d: Doc, g: Grip, glow: Accent, r = 11, hand: Material = LEATHER): void {
  const t = at(g);
  halo(d, t, 0, -24, r + 9, glow);
  d.piece('orb', t(circle(0, -24, r)), glow, { shade: 3 });
  d.glint('glint', t(circle(-3.5, -27.5, 2.8)));
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A slab of stone held up, with a sign cut in it that is alight. */
export function runeTablet(d: Doc, g: Grip, glow: Accent, hand: Material = LEATHER): void {
  const t = at(g);
  halo(d, t, 0, -26, 24, glow);
  d.piece('slab', t(smooth([[-15, -4, 'c'], [-16, -40], [0, -48], [16, -40], [15, -4, 'c']])), STONE, {
    shade: 4,
    inner: (c) => {
      c.flat('sign-a', t(poly([[0, -40], [8, -28], [0, -16], [-8, -28]])), glow.light);
      c.flat('sign-b', t(poly([[0, -35], [4.5, -28], [0, -21], [-4.5, -28]])), glow.fill);
      c.shadeOver('chip', t(poly([[10, -8], [16, -4], [16, -14]])), 1);
    },
  });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A lute, held by its neck with its belly up. */
export function lute(d: Doc, g: Grip, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('neck', t(roundRect(-3.5, -8, 7, 38, 2)), WOOD, { shade: 0 });
  d.piece('head', t(poly([[-5, 28], [5, 28], [9, 40], [-1, 42]])), WOOD, { shade: 0 });
  d.piece('belly', t(smooth([[-4, -8, 'c'], [-17, -22], [-16, -42], [0, -50], [16, -42], [17, -22], [4, -8, 'c']])), WOOD, {
    shade: 5,
    inner: (c) => {
      // The rose is an inlay, pale and pointed: a round dark hole in a round belly read as an eye.
      c.piece('rose', t(star(0, -30, 6, 7, 3.4)), BONE, { shade: 0 });
      c.shadeOver('string-a', t(roundRect(-2.6, -48, 1.6, 44, 0)), 1.2);
      c.shadeOver('string-b', t(roundRect(1, -48, 1.6, 44, 0)), 1.2);
    },
  });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** A hand lantern, hung from the hand that holds it out. */
export function lantern(d: Doc, g: Grip, glow: Accent, hand: Material = LEATHER): void {
  const t = at(g);
  d.line('ring', t(line(0, 2, 0, 10)));
  d.flat('halo', t(circle(0, 24, 20)), glow.light, 0.4);
  d.piece('cage', t(roundRect(-9, 11, 18, 25, 3)), IRON, {
    shade: 0,
    inner: (c) => c.flat('pane', t(roundRect(-5.5, 15.5, 11, 16, 2)), glow.light),
  });
  d.piece('cap', t(poly([[-12, 12], [0, 4], [12, 12]])), IRON, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** Rivets in a row of three or more. Two alone, side by side, read as eyes, so this never draws fewer. */
export function rivetRow(d: Doc, x: number, y: number, n = 3, step = 7): void {
  for (let i = 0; i < Math.max(3, n); i++) rivet(d, x + i * step, y, 1.7);
}
