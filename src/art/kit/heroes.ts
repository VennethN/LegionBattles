// What only the named heroes carry and wear. Each of these was drawn for
// one person: a helm that is a gate tower, a staff nobody finished. They
// are kept apart from the parts the rank and file share so that a soldier
// is never given a hero's sign by mistake.
//
// Like every part: nothing here draws a face, every color is the palette's,
// and a weapon is drawn upright about its hand and turned by `at`.

import type { Doc } from './draw';
import { BONE, BRONZE, DIRT, GOLD, IRON, LEATHER, LINEN, RUBY, STEEL, STONE, WOOD, type Accent, type Material } from './palette';
import { hatFace } from './heads';
import { at, crease, dark, far, mitt, rivet, under, type Grip } from './parts';
import { Path, capsule, circle, ellipse, line, path, poly, roundRect, smooth, star, type Pt } from './path';

// ---------------------------------------------------------------- Bram Oakenhold

/** A great helm with battlements round its top, like the tower of the gate he kept. */
export function gateHelm(d: Doc, mat: Material = IRON, trim: Material = GOLD): void {
  under(d);
  const helm = smooth([
    [84, 108], [67, 100], [64, 80], [67, 60, 'c'],
    [67, 44, 'c'], [80, 44, 'c'], [80, 53, 'c'], [90, 53, 'c'], [90, 44, 'c'], [104, 44, 'c'], [104, 53, 'c'], [114, 53, 'c'], [114, 44, 'c'], [127, 44, 'c'],
    [127, 60, 'c'], [130, 80], [126, 100], [108, 108],
  ]);
  d.piece('helm', helm, mat, {
    shade: 6,
    inner: (c) => {
      c.piece('brow', smooth([[58, 60], [96, 56], [136, 60], [136, 68], [96, 64], [58, 68]]), trim, { shade: 0 });
      // One slit, run off the front edge, and the plate it is cut in riveted on behind it.
      c.shadeOver('plate', roundRect(89, 70, 2.6, 34, 1), 0.9);
      rivet(c, 71, 78, 1.8);
      rivet(c, 73, 88, 1.8);
      rivet(c, 78, 97, 1.8);
      dark(c, 'slit', roundRect(95, 77, 44, 9, 4.5));
      c.line('ridge', line(112, 88, 112, 106));
    },
  });
  d.glint('glint', capsule(73, 52, 76, 48, 4));
}

/** The door of a gate carried as a shield: oak planks under an arch, strapped and studded with iron. */
export function gateShield(d: Doc, cx: number, top: number, bottom: number, half = 24): void {
  const shape = path()
    .M(cx - half, bottom - 4).L(cx - half, top + 20)
    .C(cx - half, top + 4, cx - half * 0.5, top, cx, top)
    .C(cx + half * 0.5, top, cx + half, top + 4, cx + half, top + 20)
    .L(cx + half, bottom - 4).Q(cx + half, bottom, cx + half - 4, bottom).L(cx - half + 4, bottom).Q(cx - half, bottom, cx - half, bottom - 4).Z();
  d.piece('door', shape, WOOD, {
    shade: 6,
    inner: (c) => {
      for (const dx of [-8, 8]) c.shadeOver('plank', roundRect(cx + dx - 1.2, top, 2.4, bottom - top, 0), 1);
      c.shadeOver('grain-a', capsule(cx - 16, top + 30, cx - 16, top + 44, 1.7), 0.9);
      c.shadeOver('grain-b', capsule(cx + 1, bottom - 22, cx + 1, bottom - 12, 1.7), 0.9);
      c.shadeOver('grain-c', capsule(cx + 16, top + 34, cx + 16, top + 46, 1.7), 0.9);
      for (const y of [top + 22, bottom - 24]) {
        c.shadeOver('strap-cast', roundRect(cx - half - 2, y + 9, half * 2 + 4, 3, 0), 0.9);
        c.piece('strap', roundRect(cx - half - 4, y, half * 2 + 8, 9, 0), IRON, { shade: 0 });
        for (const dx of [-16, 0, 16]) rivet(c, cx + dx, y + 4.5, 2);
      }
    },
  });
  d.piece('boss', circle(cx, (top + bottom) / 2 + 2, 7.5), GOLD, { shade: 3 });
  d.glint('glint', circle(cx - 2, (top + bottom) / 2, 2));
}

/** Gatekeeper: a broad sword with an iron bar of a guard. */
export function gatekeeper(d: Doc, g: Grip, len = 68, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('blade', t(poly([[-9, -10], [-9, -len + 16], [0, -len], [9, -len + 16], [9, -10]])), STEEL, {
    shade: 4,
    inner: (c) => {
      c.lightOver('bevel', t(poly([[-9, -10], [-9, -len + 16], [0, -len], [0, -10]])), 0.9);
      c.line('fuller', t(line(0, -12, 0, -len + 26)));
    },
  });
  d.piece('pommel', t(roundRect(-6, 9, 12, 10, 3)), IRON, { shade: 0 });
  d.piece('guard', t(roundRect(-18, -16, 36, 9, 3)), IRON, { shade: 3 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

// ---------------------------------------------------------------- Wren Fallowmere

/** One long tail feather, swept back from where it is stuck in a hood. Its foot is at `base`. */
export function tailFeather(d: Doc, base: Pt, mat: Material = BONE, len = 46): void {
  const [x, y] = base;
  const shape = smooth([
    [x, y, 'c'], [x - 2, y - len * 0.4], [x - 12, y - len * 0.78], [x - 26, y - len, 'c'],
    [x - 22, y - len * 0.6], [x - 12, y - len * 0.25],
  ]);
  d.piece('feather', shape, mat, {
    shade: 3,
    inner: (c) => {
      // Barred, as a pheasant's is.
      c.shadeOver('bar-a', capsule(x - 12, y - len * 0.42, x, y - len * 0.5, 3), 1.4);
      c.shadeOver('bar-b', capsule(x - 20, y - len * 0.68, x - 6, y - len * 0.8, 3), 1.4);
      c.shadeOver('tip', circle(x - 25, y - len, 7), 1.6);
    },
  });
  d.line('quill', smooth([[x, y], [x - 5, y - len * 0.45], [x - 18, y - len * 0.82]], false));
}

/** A half cloak caught by the wind: from the shoulders out behind, its hem cut by years of thorns. */
export function windCloak(d: Doc, mat: Material): void {
  const shape = path()
    .M(84, 100).L(112, 104).Q(102, 122, 86, 130)
    .L(72, 124).L(62, 138).L(50, 126).L(36, 138).L(27, 122).L(10, 126)
    .Q(34, 106, 62, 99).Z();
  d.piece('cloak', shape, mat, {
    shade: 5,
    inner: (c) => {
      c.lightOver('billow', smooth([[66, 103], [92, 107], [82, 120], [60, 120]]), 0.6);
      crease(c, 'fold-a', [92, 108], [50, 126], 3);
      crease(c, 'fold-b', [70, 104], [24, 122], 2.6);
    },
  });
}

// ---------------------------------------------------------------- Orrin Quillon

/** A student's square cap with its tassel, over a scarf: he was thrown out before he could take it off. */
export function squareCap(d: Doc, cap: Material, scarf: Material): void {
  under(d);
  hatFace(d, scarf);
  d.piece('skull', smooth([[70, 76, 'c'], [72, 58], [97, 50], [122, 58], [124, 76, 'c'], [97, 80]]), cap, { shade: 4 });
  // The board, seen a little from above: a flat lozenge wider than the head.
  d.piece('board', poly([[42, 54], [96, 40], [152, 52], [100, 68]]), cap, {
    shade: 4,
    inner: (c) => c.lightOver('top', poly([[52, 54], [96, 43], [140, 52], [100, 63]]), 0.5),
  });
}

/** The tassel of that cap: a cord from the button over the edge of the board, and the tuft at its end. */
export function capTassel(d: Doc, mat: Material): void {
  d.line('cord', smooth([[98, 54], [70, 56], [52, 60], [50, 74]], false));
  d.piece('tuft', smooth([[47, 72, 'c'], [53, 72, 'c'], [55, 88], [50, 92], [45, 88]]), mat, {
    shade: 3,
    inner: (c) => c.shadeOver('tie', roundRect(42, 75, 16, 2.6, 0), 1.2),
  });
}

/** A pack of scrolls on the back: three rolls standing out of a satchel. */
export function scrollPack(d: Doc): void {
  const roll = (name: string, x: number, y: number, turn: number, len: number): void => {
    const t = (p: Path): Path => p.rotate(turn, x, y);
    d.piece(name, t(roundRect(x - 5, y - len, 10, len, 3)), BONE, {
      shade: 3,
      inner: (c) => c.shadeOver('band', t(roundRect(x - 6, y - len + 7, 12, 3, 0)), 1.2),
    });
    d.piece(`${name}-end`, t(ellipse(x, y - len, 5, 2.6)), LINEN, { shade: 0 });
  };
  roll('roll-a', 58, 118, -34, 34);
  roll('roll-b', 66, 114, -16, 40);
  roll('roll-c', 76, 112, -2, 34);
  d.piece('satchel', roundRect(48, 108, 34, 40, 7), LEATHER, {
    shade: 4,
    inner: (c) => {
      c.shadeOver('flap', roundRect(44, 104, 42, 16, 0), 0.9);
      c.piece('clasp', roundRect(60, 116, 9, 9, 2), GOLD, { shade: 0 });
    },
  });
}

/** An open book in the off hand, held up to be read from. */
export function openBook(d: Doc, cx: number, cy: number, cover: Material, hand: Material = LEATHER): void {
  d.piece('cover', poly([[cx - 20, cy - 8], [cx, cy - 3], [cx + 20, cy - 10], [cx + 20, cy + 8], [cx, cy + 14], [cx - 20, cy + 9]]), cover, { shade: 0 });
  const page = (name: string, s: 1 | -1): void => {
    const x = (v: number): number => cx + v * s;
    d.piece(name, smooth([[x(0), cy - 6, 'c'], [x(9), cy - 12], [x(18), cy - 13, 'c'], [x(18), cy + 4, 'c'], [x(9), cy + 5], [x(0), cy + 11, 'c']]), BONE, {
      shade: s === 1 ? 3 : 0,
      inner: (c) => {
        // Lines of writing, which at this size are three strokes.
        for (let i = 0; i < 3; i++) c.shadeOver('writing', capsule(x(4), cy - 6 + i * 4.5, x(14), cy - 8 + i * 4.5, 1.6), 1.3);
      },
    });
  };
  page('page-far', -1);
  page('page', 1);
  mitt(d, cx, cy + 14, hand);
}

/**
 * The Unfinished Staff. Its head was to be a ring: one horn of it was carved
 * and the other was never begun, and the stone that should sit in it hangs
 * in the gap by itself.
 */
export function unfinishedStaff(d: Doc, g: Grip, glow: Accent, len = 78, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-3.5, -len, 7, len + 40, 3)), WOOD, { shade: 2 });
  // The carved horn: half a ring, with the marks of the knife still on it.
  d.piece('horn', t(smooth([
    [-4, -len + 4, 'c'], [-16, -len - 8], [-18, -len - 26], [-8, -len - 40], [4, -len - 44, 'c'],
    [-3, -len - 34], [-9, -len - 24], [-8, -len - 12], [4, -len - 2, 'c'],
  ])), WOOD, {
    shade: 3,
    inner: (c) => {
      c.shadeOver('cut-a', t(capsule(-16, -len - 14, -9, -len - 16, 2)), 1.2);
      c.shadeOver('cut-b', t(capsule(-15, -len - 26, -8, -len - 26, 2)), 1.2);
    },
  });
  // The other horn: a block left square, as it came from the saw.
  d.piece('block', t(poly([[1, -len + 3], [3, -len - 12], [14, -len - 10], [10, -len + 5]])), WOOD, { shade: 0 });
  d.flat('halo', t(circle(5, -len - 26, 15)), glow.light, 0.45);
  d.piece('stone', t(poly([[5, -len - 40], [13, -len - 27], [6, -len - 12], [-2, -len - 26]])), glow, { shade: 4 });
  d.glint('glint', t(poly([[3, -len - 32], [5, -len - 36], [6, -len - 22], [1, -len - 26]])));
  mitt(d, g.hand[0], g.hand[1], hand);
}

// ---------------------------------------------------------------- Fenn Two-Coins

/** A flat cap pulled low, its bill forward, over a scarf up to it. */
export function flatCap(d: Doc, cap: Material, scarf: Material, band: Material = GOLD): void {
  under(d);
  hatFace(d, scarf);
  d.piece('cap', smooth([[58, 74, 'c'], [54, 58], [74, 46], [102, 46], [126, 58], [150, 72, 'c'], [124, 79], [92, 81]]), cap, {
    shade: 5,
    inner: (c) => {
      c.piece('band', smooth([[56, 68], [92, 73], [150, 66], [150, 73], [92, 81], [56, 76]]), band, { shade: 0 });
      crease(c, 'fold', [64, 60], [88, 51], 3);
    },
  });
}

/** The two tails of a long scarf, out behind the neck. The far one first. */
export function scarfTails(d: Doc, mat: Material): void {
  d.piece('tail-far', smooth([[76, 96, 'c'], [56, 92], [36, 98], [20, 90, 'c'], [26, 104], [44, 108], [62, 104], [76, 106, 'c']]), far(mat), { shade: 0 });
  d.piece('tail', smooth([[76, 100, 'c'], [58, 106], [40, 104], [22, 114, 'c'], [30, 124], [48, 118], [64, 118], [78, 110, 'c']]), mat, {
    shade: 3,
    inner: (c) => crease(c, 'fold', [70, 106], [34, 114], 2.6),
  });
}

/** Two big coins on a cord at the belt: the one he tosses, and the one he never spends. */
export function twoCoins(d: Doc, x: number, y: number): void {
  d.line('cord', line(x, y, x - 1, y + 9));
  d.piece('coin-b', circle(x + 5, y + 19, 7.5), GOLD, { shade: 0 });
  d.piece('coin-a', circle(x - 3, y + 15, 8), GOLD, {
    shade: 3,
    inner: (c) => c.shadeOver('struck', capsule(x - 6, y + 17, x, y + 13, 2.2), 1.1),
  });
  d.glint('glint', circle(x - 6, y + 12, 1.8));
}

/** One of Heads and Tails: a broad knife curved to its point, its pommel a coin. */
export function luckyKnife(d: Doc, g: Grip, len = 42, hilt: Material = GOLD, hand: Material = LEATHER): void {
  const t = at(g);
  const blade = smooth([[-6, -9, 'c'], [-8, -len * 0.6], [-2, -len, 'c'], [7, -len * 0.62], [7, -9, 'c']]);
  d.piece('blade', t(blade), STEEL, {
    shade: 3,
    inner: (c) => c.lightOver('edge', t(smooth([[-6, -9, 'c'], [-8, -len * 0.6], [-2, -len, 'c'], [-1, -len * 0.6], [-1, -9, 'c']])), 0.9),
  });
  d.piece('pommel', t(circle(0, 13, 5.5)), hilt, { shade: 0 });
  d.piece('guard', t(roundRect(-11, -13, 22, 7, 3)), hilt, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

// ---------------------------------------------------------------- Old Nan Cinderwick

/** A headscarf tied under the chin: round over the head, its knot and two ends at the throat. */
export function kerchief(d: Doc, mat: Material): void {
  under(d);
  const shape = smooth([[98, 50], [121, 58], [131, 80], [127, 100], [110, 109], [84, 109], [68, 101], [63, 80], [74, 58]]);
  d.piece('scarf', shape, mat, {
    shade: 6,
    inner: (c) => {
      c.shadeOver('lining', smooth([[110, 60], [130, 70], [137, 90], [128, 110], [104, 110], [91, 94], [93, 72]]), 1.1);
      dark(c, 'opening', smooth([[112, 66], [126, 74], [131, 88], [124, 100], [108, 101], [98, 91], [100, 76]]));
      crease(c, 'fold-a', [72, 74], [68, 98], 3);
      c.line('fold', smooth([[86, 56], [78, 72], [76, 90]], false));
    },
  });
  d.piece('end-a', smooth([[112, 106, 'c'], [108, 116], [112, 126, 'c'], [118, 118], [120, 108, 'c']]), mat, { shade: 0 });
  d.piece('end-b', smooth([[118, 106, 'c'], [124, 114], [132, 120, 'c'], [130, 110], [124, 104, 'c']]), mat, { shade: 0 });
  d.piece('knot', circle(117, 106, 5), mat, { shade: 3 });
}

/** A bundle of firewood carried across the back, tied twice. */
export function firewood(d: Doc): void {
  const stick = (name: string, x: number, y: number, turn: number, len: number, w = 7): void => {
    const t = (p: Path): Path => p.rotate(turn, x, y);
    d.piece(name, t(roundRect(x - w / 2, y - len / 2, w, len, 3)), WOOD, {
      shade: 2,
      inner: (c) => c.lightOver('cut', t(roundRect(x - w / 2, y - len / 2, w, 4, 0)), 1.2),
    });
  };
  stick('stick-a', 52, 96, -58, 96);
  stick('stick-b', 56, 106, -46, 104, 9);
  stick('stick-c', 62, 114, -54, 92, 8);
  stick('stick-d', 54, 88, -40, 88, 7);
  stick('stick-e', 64, 122, -62, 84, 7);
  d.piece('tie-a', smooth([[52, 96], [60, 91], [76, 122], [68, 127]]), LINEN, { shade: 0 });
}

/**
 * Hearthbrand: a staff grown crooked, with an iron basket at its head and a
 * fire in it that has not gone out in sixty years.
 */
export function hearthbrand(d: Doc, g: Grip, glow: Accent, len = 66, hand: Material = LEATHER): void {
  const t = at(g);
  // The shaft, with a knee in it where the tree turned.
  d.piece('shaft', t(smooth([
    [-4, 46, 'c'], [-5, 8], [-9, -len * 0.42], [-3, -len * 0.62], [-4, -len, 'c'],
    [4, -len, 'c'], [5, -len * 0.6], [-1, -len * 0.4], [4, 8], [4, 46, 'c'],
  ])), WOOD, { shade: 2, inner: (c) => c.shadeOver('knot', t(circle(-3, -len * 0.5, 3)), 1.3) });
  d.flat('halo', t(circle(0, -len - 24, 27)), glow.light, 0.4);
  // The fire: a tall tongue and a lesser one, and the pale heart of it.
  d.piece('flame', t(smooth([
    [-12, -len - 6, 'c'], [-17, -len - 22], [-9, -len - 34], [-10, -len - 48, 'c'], [-1, -len - 40], [4, -len - 54], [2, -len - 66, 'c'],
    [14, -len - 48], [17, -len - 26], [12, -len - 6, 'c'],
  ])), glow, { shade: 3 });
  d.flat('heart', t(smooth([[-6, -len - 8, 'c'], [-8, -len - 20], [-1, -len - 28], [1, -len - 40, 'c'], [8, -len - 26], [6, -len - 8, 'c']])), glow.light);
  // The basket: iron, wider at the top, on three straps.
  d.piece('basket', t(poly([[-15, -len - 14], [15, -len - 14], [9, -len + 4], [-9, -len + 4]])), IRON, {
    shade: 3,
    inner: (c) => {
      for (const x of [-8, 0, 8]) c.shadeOver('strap', t(roundRect(x - 1.3, -len - 16, 2.6, 22, 0)), 1.3);
    },
  });
  d.piece('rim', t(roundRect(-17, -len - 17, 34, 6, 3)), IRON, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

// ---------------------------------------------------------------- Isaura Vane

/** A sallet: a low dome drawn out to a long tail over the neck, one slit, and a ridge along its top. */
export function tailedSallet(d: Doc, mat: Material = STEEL, trim: Material = GOLD): void {
  under(d);
  const helm = smooth([[98, 52], [120, 58], [131, 78], [128, 98], [110, 107], [86, 105], [66, 102], [40, 104, 'c'], [58, 90], [66, 72], [78, 58]]);
  d.piece('helm', helm, mat, {
    shade: 6,
    inner: (c) => {
      c.shadeOver('plate', roundRect(90, 86, 2.6, 22, 1), 0.9);
      rivet(c, 58, 97, 1.8);
      rivet(c, 66, 96, 1.8);
      rivet(c, 74, 96.5, 1.8);
      dark(c, 'slit', roundRect(95, 78, 44, 8, 4));
      c.piece('comb', smooth([[76, 60], [98, 52], [122, 60], [122, 65], [98, 58], [76, 66]]), trim, { shade: 0 });
    },
  });
  d.glint('glint', capsule(78, 70, 83, 65, 4.5));
}

/** A long tail of horsehair from the top of a helm, streaming out behind. Its foot is at `base`. */
export function horseTail(d: Doc, base: Pt, mat: Material, len = 62): void {
  const [x, y] = base;
  const k = len / 62;
  const shape = smooth([
    [x + 5, y + 2, 'c'], [x + 2, y - 12], [x - 14 * k, y - 18], [x - 34 * k, y - 12], [x - 50 * k, y + 2], [x - 62 * k, y + 22, 'c'],
    [x - 48 * k, y + 14], [x - 36 * k, y + 20, 'c'], [x - 30 * k, y + 6], [x - 16 * k, y], [x - 6, y + 6, 'c'],
  ]);
  d.piece('tail', shape, mat, {
    shade: 4,
    inner: (c) => {
      crease(c, 'strand-a', [x - 4, y - 10], [x - 44 * k, y + 4], 2.6, 0.9);
      crease(c, 'strand-b', [x - 14, y - 2], [x - 52 * k, y + 16], 2.4, 0.9);
    },
  });
  d.piece('socket', roundRect(x - 5, y - 3, 11, 8, 2), GOLD, { shade: 0 });
}

/** A cape with nothing left of its lower half, straight out behind someone who is running. */
export function runCape(d: Doc, mat: Material): void {
  const shape = path()
    .M(84, 100).L(112, 104).Q(104, 120, 90, 128)
    .L(76, 122).L(66, 134).L(54, 120).L(40, 132).L(30, 116).L(12, 120)
    .Q(34, 104, 60, 98).Z();
  d.piece('cape', shape, mat, {
    shade: 5,
    inner: (c) => {
      c.lightOver('billow', smooth([[66, 102], [90, 106], [82, 118], [62, 118]]), 0.6);
      crease(c, 'fold-a', [92, 108], [50, 122], 3);
      crease(c, 'fold-b', [70, 104], [26, 118], 2.6);
    },
  });
}

/** The Ninth's Lance: long, with a steel guard before the hand and what is left of the Ninth's white pennon. */
export function ninthLance(d: Doc, g: Grip, len = 74, pennon: Material = LINEN, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-4, -len, 8, len + 46, 3)), WOOD, { shade: 2 });
  // The pennon, torn to two ribbons, blown back along the shaft.
  d.piece('pennon', t(path()
    .M(4, -len + 4).L(20, -len + 8).Q(26, -len + 26, 20, -len + 44).L(24, -len + 62).L(15, -len + 50).L(13, -len + 70)
    .Q(6, -len + 40, 4, -len + 22).Z()), pennon, { shade: 3 });
  d.piece('blade', t(poly([[0, -len - 30], [9, -len - 8], [5, -len + 3], [-5, -len + 3], [-9, -len - 8]])), STEEL, {
    shade: 3,
    inner: (c) => c.shadeOver('far-face', t(poly([[0, -len - 30], [9, -len - 8], [5, -len + 3], [0, -len + 3]])), 0.8),
  });
  d.piece('collar', t(roundRect(-6, -len, 12, 7, 2)), GOLD, { shade: 0 });
  // The guard: a cone of steel, its wide end to the hand.
  d.piece('guard', t(poly([[-4, -30], [4, -30], [13, -12], [-13, -12]])), STEEL, { shade: 3 });
  mitt(d, g.hand[0], g.hand[1], hand);
}

// ---------------------------------------------------------------- Hroth the Unburied

/** A winding sheet round the head with one gap in it, under an iron cap with one horn left and the stump of the other. */
export function shroudHelm(d: Doc, sheet: Material = LINEN, cap: Material = IRON, horn: Material = BONE): void {
  under(d);
  // The far horn: broken off short.
  d.piece('stump', poly([[70, 62], [60, 48], [70, 44], [80, 56]]), far(horn), { shade: 0 });
  d.piece('wrap', smooth([[97, 54], [119, 60], [129, 80], [125, 100], [108, 108], [84, 108], [69, 100], [65, 80], [75, 60]]), sheet, {
    shade: 6,
    inner: (c) => {
      dark(c, 'gap', roundRect(93, 80, 46, 10, 5));
      c.line('wind-a', smooth([[66, 94], [92, 98], [128, 92]], false));
      c.line('wind-b', smooth([[70, 104], [96, 106], [120, 102]], false));
    },
  });
  d.piece('cap', smooth([[64, 78, 'c'], [70, 60], [97, 50], [124, 60], [130, 76, 'c'], [97, 72]]), cap, {
    shade: 5,
    inner: (c) => {
      c.shadeOver('dent', ellipse(84, 62, 6, 4), 1.2);
      rivet(c, 104, 66, 1.8);
      rivet(c, 112, 67.5, 1.8);
      rivet(c, 120, 70, 1.8);
    },
  });
  d.piece('horn', smooth([[112, 66, 'c'], [130, 62], [142, 46], [140, 24, 'c'], [130, 40], [120, 50], [106, 56, 'c']]), horn, {
    shade: 4,
    inner: (c) => {
      c.shadeOver('ring-a', capsule(114, 62, 126, 54, 2.6), 1.1);
      c.shadeOver('ring-b', capsule(124, 54, 137, 46, 2.4), 1.1);
      c.shadeOver('ring-c', capsule(131, 42, 141, 37, 2.2), 1.1);
    },
  });
}

/** His own headstone, roped to his back, and the stake they drove in the second time, snapped off. */
export function headstone(d: Doc): void {
  const t = (p: Path): Path => p.rotate(-14, 62, 150);
  d.piece('stake', poly([[84, 108], [50, 70], [44, 62], [50, 66], [48, 56], [56, 64], [58, 58], [92, 100]]), WOOD, { shade: 2 });
  d.piece('stone', t(path().M(40, 150).L(40, 84).C(40, 60, 84, 60, 84, 84).L(84, 150).Z()), STONE, {
    shade: 6,
    inner: (c) => {
      c.shadeOver('line-a', t(roundRect(50, 92, 24, 3, 1.5)), 1.3);
      c.shadeOver('line-b', t(roundRect(50, 101, 18, 3, 1.5)), 1.3);
      c.line('crack', t(smooth([[78, 66], [70, 78], [74, 88]], false)));
      c.piece('earth', t(smooth([[36, 152, 'c'], [38, 134], [50, 138], [62, 130], [74, 138], [88, 134], [88, 152, 'c']])), DIRT, { shade: 0 });
    },
  });
  d.line('rope-a', t(line(38, 112, 86, 118)));
  d.line('rope-b', t(line(38, 126, 86, 132)));
}

/** Gravecleaver: a great axe with a blade as broad as a spade, notched, on a haft bound with strips of his shroud. */
export function gravecleaver(d: Doc, g: Grip, len = 84, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-4.5, -len, 9, len + 24, 3)), WOOD, {
    shade: 2,
    inner: (c) => {
      for (const y of [-len * 0.45, -len * 0.45 + 7, -len * 0.45 + 14]) c.piece('bind', t(roundRect(-6, y, 12, 4.5, 0)), LINEN, { shade: 0, outline: false });
    },
  });
  const blade = path()
    .M(3, -len + 2).L(16, -len - 12).L(40, -len - 16).Q(48, -len + 8, 42, -len + 26)
    .L(34, -len + 30).L(36, -len + 40).L(26, -len + 46).L(14, -len + 32).L(3, -len + 28).Z();
  d.piece('blade', t(blade), IRON, {
    shade: 5,
    inner: (c) => {
      // The edge is ground bright; the rest of it is as black as it was dug up.
      c.piece('edge', t(path().M(34, -len - 20).L(52, -len - 20).L(52, -len + 50).L(26, -len + 50).L(36, -len + 40).L(34, -len + 30).L(38, -len + 28).Q(42, -len + 6, 34, -len - 20).Z()), STEEL, { shade: 0, outline: false });
      rivet(c, 12, -len + 8, 2);
      rivet(c, 12, -len + 20, 2);
    },
  });
  d.piece('beak', t(poly([[-3, -len + 4], [-20, -len + 2], [-12, -len + 14], [-3, -len + 20]])), IRON, { shade: 0 });
  d.piece('cap', t(roundRect(-7, -len - 5, 14, 9, 3)), IRON, { shade: 0 });
  const upper = t(circle(0, -30, 8)).bounds();
  mitt(d, upper.x + upper.w / 2, upper.y + upper.h / 2, hand, 8, 'hand-upper');
  mitt(d, g.hand[0], g.hand[1], hand, 8);
}

// ---------------------------------------------------------------- Brother Aldous Bell

/** A monk's hood: round and deep, with its cape wide over the shoulders. */
export function monkHood(d: Doc, mat: Material): void {
  under(d, 97, 113, 32, 9);
  d.piece('cowl', smooth([[66, 100], [96, 96], [128, 100], [140, 114], [134, 124, 'c'], [96, 129], [60, 124, 'c'], [54, 114]]), mat, {
    shade: 4,
    inner: (c) => crease(c, 'fold', [70, 106], [64, 122], 3),
  });
  const shape = smooth([[100, 46], [124, 56], [134, 80], [129, 102], [108, 110], [84, 110], [68, 104], [60, 86], [64, 64], [80, 50]]);
  d.piece('hood', shape, mat, {
    shade: 6,
    inner: (c) => {
      c.shadeOver('lining', smooth([[110, 56], [134, 68], [141, 92], [130, 112], [102, 112], [88, 94], [91, 70]]), 1.1);
      dark(c, 'opening', smooth([[112, 62], [129, 72], [134, 90], [126, 105], [107, 106], [95, 92], [98, 73]]));
      crease(c, 'fold-b', [70, 72], [66, 100], 3);
    },
  });
  d.line('fold', smooth([[84, 56], [74, 72], [72, 92]], false));
}

/** The Passing Bell: a great bell hung from the hand by its yoke. It is swung, and it is heard. */
export function passingBell(d: Doc, g: Grip, mat: Material = BRONZE, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('clapper', t(circle(0, 62, 6.5)), IRON, { shade: 0 });
  d.piece('yoke', t(roundRect(-11, -4, 22, 9, 3)), WOOD, { shade: 0 });
  d.piece('crown', t(roundRect(-6, 4, 12, 10, 2)), mat, { shade: 0 });
  d.piece('bell', t(smooth([[-10, 11, 'c'], [10, 11, 'c'], [17, 30], [22, 44], [31, 56, 'c'], [-31, 56, 'c'], [-22, 44], [-17, 30]])), mat, {
    shade: 6,
    inner: (c) => {
      c.piece('lip', t(roundRect(-34, 49, 68, 9, 0)), GOLD, { shade: 0, outline: false });
      c.shadeOver('lip-line', t(roundRect(-34, 47, 68, 2.4, 0)), 1.2);
      c.shadeOver('band', t(roundRect(-34, 24, 68, 2.6, 0)), 0.9);
      c.shadeOver('band-b', t(roundRect(-34, 29, 68, 2, 0)), 0.7);
    },
  });
  d.glint('glint', t(capsule(-11, 22, -14, 36, 3.5)));
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** The two ends of a rope belt, knotted, hanging from the hip. */
export function ropeEnds(d: Doc, x: number, y: number, mat: Material = BONE): void {
  d.piece('end', capsule(x + 1, y, x - 2, y + 26, 5.5), mat, { shade: 0 });
  d.piece('tuft', smooth([[x - 6, y + 26, 'c'], [x + 2, y + 26, 'c'], [x + 4, y + 38], [x - 2, y + 35], [x - 8, y + 38]]), mat, { shade: 0 });
  d.piece('knot', circle(x + 1, y, 5.5), mat, { shade: 3 });
}

// ---------------------------------------------------------------- Ysolde Rimeheart

/** A widow's veil over the whole head, and on it a crown that grew there: five spires of ice. */
export function iceCrown(d: Doc, veil: Material, ice: Accent): void {
  under(d, 97, 112, 28, 9);
  d.piece('veil', smooth([[97, 50], [118, 57], [129, 80], [133, 104], [126, 115, 'c'], [97, 119], [68, 115, 'c'], [61, 104], [65, 80], [76, 57]]), veil, {
    shade: 6,
    inner: (c) => {
      crease(c, 'fold-a', [80, 72], [70, 112], 3.4);
      crease(c, 'fold-b', [100, 76], [98, 116], 3);
      crease(c, 'fold-c', [118, 74], [126, 112], 3.4);
    },
  });
  const spire = (name: string, x: number, h: number, w: number, leanBy: number): void => {
    d.piece(name, poly([[x - w, 62], [x + leanBy, 62 - h], [x + w, 62]]), ice, {
      shade: 3,
      inner: (c) => c.lightOver('facet', poly([[x - w, 62], [x + leanBy, 62 - h], [x, 62]]), 1.1),
    });
  };
  spire('spire-a', 70, 22, 6, -5);
  spire('spire-e', 124, 22, 6, 5);
  spire('spire-b', 83, 34, 7, -3);
  spire('spire-d', 111, 34, 7, 3);
  spire('spire-c', 97, 46, 8, 0);
  d.piece('band', smooth([[62, 60], [97, 56], [132, 60], [132, 68], [97, 65], [62, 69]]), ice, { shade: 0 });
}

/** The train of that veil, down the back and out behind. */
export function veilTrain(d: Doc, mat: Material): void {
  d.piece('train', smooth([[72, 62, 'c'], [60, 84], [48, 112], [30, 136], [10, 148, 'c'], [34, 152], [54, 140], [70, 120], [84, 96, 'c']]), mat, {
    shade: 4,
    inner: (c) => {
      crease(c, 'fold-a', [72, 76], [36, 140], 3.2);
      crease(c, 'fold-b', [80, 98], [52, 138], 2.8);
    },
  });
}

/** Widow's Tear: a slender wand of silver, and at its tip one great tear of ice with shards about it. */
export function widowsTear(d: Doc, g: Grip, glow: Accent, len = 40, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('stem', t(roundRect(-2.5, -len, 5, len + 18, 2.5)), STEEL, { shade: 0 });
  d.flat('halo', t(circle(0, -len - 20, 22)), glow.light, 0.42);
  d.piece('shard-a', t(poly([[-24, -len - 2], [-18, -len - 20], [-13, -len]])), glow, { shade: 0 });
  d.piece('shard-b', t(poly([[15, -len - 30], [23, -len - 46], [27, -len - 28]])), glow, { shade: 0 });
  // A tear: its point up, its belly down.
  d.piece('tear', t(path().M(0, -len - 44).C(4, -len - 30, 13, -len - 24, 13, -len - 13).C(13, -len + 3, -13, -len + 3, -13, -len - 13).C(-13, -len - 24, -4, -len - 30, 0, -len - 44).Z()), glow, {
    shade: 4,
    inner: (c) => c.lightOver('facet', t(path().M(0, -len - 44).C(-4, -len - 30, -13, -len - 24, -13, -len - 13).C(-13, -len - 4, -6, -len, 0, -len + 1).Z()), 0.9),
  });
  d.glint('glint', t(capsule(-5, -len - 20, -6, -len - 12, 3)));
  d.piece('collar', t(roundRect(-5, -len - 3, 10, 6, 2)), STEEL, { shade: 0 });
  mitt(d, g.hand[0], g.hand[1], hand, 6.5);
}

// ---------------------------------------------------------------- Maren Dawnguard

/** A closed helm with the sun coming up behind it: a fan of rays from ear to ear over the top. */
export function dawnHelm(d: Doc, mat: Material = STEEL, ray: Material = GOLD): void {
  under(d);
  // The rays, behind the helm: seven of them, longest at the top.
  const rays: [number, number][] = [[-78, 22], [-52, 28], [-26, 34], [0, 38], [26, 34], [52, 28], [78, 22]];
  rays.forEach(([turn, h], i) => {
    d.piece(`ray-${i}`, poly([[90, 62], [97, 62 - h], [104, 62]]).rotate(turn * 0.72, 97, 78).translate(-4, 0), ray, { shade: 0 });
  });
  const dome = smooth([[97, 52], [119, 58], [129, 78], [125, 99], [108, 108], [84, 108], [69, 99], [65, 78], [75, 58]]);
  d.piece('helm', dome, mat, {
    shade: 6,
    inner: (c) => {
      c.piece('brow', smooth([[60, 68], [96, 64], [134, 68], [134, 75], [96, 71], [60, 75]]), ray, { shade: 0 });
      c.shadeOver('plate', roundRect(90, 86, 2.6, 22, 1), 0.9);
      dark(c, 'slit', roundRect(95, 80, 44, 8.5, 4.2));
      c.line('ridge', line(112, 92, 112, 107));
    },
  });
  d.glint('glint', capsule(78, 62, 83, 58, 4.5));
}

/** Morningstar: a hammer for two hands, its head a block of steel with the sun's points on it. */
export function morningstarHammer(d: Doc, g: Grip, len = 86, hand: Material = LEATHER): void {
  const t = at(g);
  d.piece('shaft', t(roundRect(-4, -len, 8, len + 24, 3)), WOOD, { shade: 2 });
  for (const [i, pts] of ([
    [[-8, -len - 20], [0, -len - 38], [8, -len - 20]],
    [[-26, -len - 14], [-42, -len - 4], [-26, 6 - len]],
    [[26, -len - 14], [42, -len - 4], [26, 6 - len]],
  ] as Pt[][]).entries()) {
    d.piece(`point-${i}`, t(poly(pts)), GOLD, { shade: 0 });
  }
  d.piece('head', t(roundRect(-28, -len - 22, 56, 36, 7)), STEEL, {
    shade: 6,
    inner: (c) => {
      c.piece('sun', t(star(0, -len - 4, 8, 13, 6.5)), GOLD, { shade: 0 });
      c.shadeOver('face-a', t(roundRect(-21, -len - 24, 2.6, 40, 0)), 1);
      c.shadeOver('face-b', t(roundRect(18.4, -len - 24, 2.6, 40, 0)), 1);
    },
  });
  d.piece('collar', t(roundRect(-6, -len + 12, 12, 8, 2)), GOLD, { shade: 0 });
  const upper = t(circle(0, -28, 7.5)).bounds();
  mitt(d, upper.x + upper.w / 2, upper.y + upper.h / 2, hand, 7.5, 'hand-upper');
  mitt(d, g.hand[0], g.hand[1], hand);
}

/** Her oaths, written out and sealed, hung from the shoulder. */
export function oathRibbons(d: Doc, x: number, y: number): void {
  d.piece('oath-b', smooth([[x + 3, y, 'c'], [x + 12, y, 'c'], [x + 13, y + 30], [x + 9, y + 26], [x + 5, y + 32]]), far(BONE), { shade: 0 });
  d.piece('oath-a', smooth([[x - 7, y, 'c'], [x + 3, y, 'c'], [x + 2, y + 40], [x - 3, y + 35], [x - 8, y + 42]]), BONE, {
    shade: 0,
    inner: (c) => {
      for (let i = 0; i < 3; i++) c.shadeOver('writing', capsule(x - 5, y + 12 + i * 6, x, y + 12 + i * 6, 1.6), 1.2);
    },
  });
  d.piece('seal', circle(x + 2, y, 6), RUBY, { shade: 0 });
}
