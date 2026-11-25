// What the other hand holds, what is carried on the back, and what is worn
// on the body: shields, a hawk on the fist, a pack, a banner on a pole, a
// sash across the chest. The rules of parts.ts hold: one dark line, the
// palette, flat shapes, and the side's color on cloth only, never on a
// shield's face.

import type { Doc } from './draw';
import { BONE, BUSH, GOLD, IRON, LEATHER, LINEN, STEEL, STONE, WOOD, type Material } from './palette';
import { STRAW } from './heads';
import { crease, far, mitt, rivet } from './parts';
import { capsule, circle, ellipse, path, poly, roundRect, smooth, star } from './path';

// ---------------------------------------------------------------- shields

/** A tower shield: as tall as the body behind it, with a boss and a row of rivets at each end. */
export function towerShield(d: Doc, cx: number, cy: number, mat: Material = STEEL, trim: Material = GOLD): void {
  const shape = smooth([[cx - 20, cy - 34, 'c'], [cx, cy - 38], [cx + 20, cy - 34, 'c'], [cx + 21, cy + 30, 'c'], [cx, cy + 35], [cx - 21, cy + 30, 'c']]);
  d.piece('face', shape, mat, {
    shade: 5,
    inner: (c) => {
      c.shadeOver('field', shape.scale(0.72, 0.8, cx, cy), 0.5);
      c.piece('bar', roundRect(cx - 26, cy - 6, 52, 9, 0), trim, { shade: 0 });
      for (const dx of [-11, 0, 11]) {
        rivet(c, cx + dx, cy - 26, 1.8);
        rivet(c, cx + dx, cy + 24, 1.8);
      }
    },
  });
  d.piece('boss', circle(cx, cy - 1, 7), trim, { shade: 3 });
}

/** A pavise: a tall shield of planks with a ridge down its middle, made to be stood on the ground. */
export function pavise(d: Doc, cx: number, cy: number, mat: Material = WOOD): void {
  const shape = smooth([[cx - 19, cy - 36, 'c'], [cx + 19, cy - 36, 'c'], [cx + 22, cy + 30, 'c'], [cx, cy + 38], [cx - 22, cy + 30, 'c']]);
  d.piece('face', shape, mat, {
    shade: 5,
    inner: (c) => {
      c.shadeOver('plank-a', roundRect(cx - 11, cy - 40, 2.4, 80, 0), 0.9);
      c.shadeOver('plank-b', roundRect(cx + 9, cy - 40, 2.4, 80, 0), 0.9);
      c.piece('band-a', roundRect(cx - 26, cy - 28, 52, 6, 0), IRON, { shade: 0 });
      c.piece('band-b', roundRect(cx - 26, cy + 18, 52, 6, 0), IRON, { shade: 0 });
    },
  });
  d.piece('ridge', roundRect(cx - 3.5, cy - 38, 7, 72, 3), IRON, { shade: 0 });
}

/** A heater shield: flat across the top, drawn down to a point. */
export function heater(d: Doc, cx: number, cy: number, mat: Material = STEEL, trim: Material = GOLD): void {
  const shape = smooth([[cx - 22, cy - 24, 'c'], [cx + 22, cy - 24, 'c'], [cx + 21, cy], [cx + 12, cy + 18], [cx, cy + 30, 'c'], [cx - 12, cy + 18], [cx - 21, cy]]);
  d.piece('face', shape, mat, {
    shade: 5,
    inner: (c) => {
      c.piece('pale', roundRect(cx - 5, cy - 30, 10, 64, 0), trim, { shade: 0 });
      c.piece('chief', roundRect(cx - 26, cy - 26, 52, 9, 0), trim, { shade: 0 });
    },
  });
  d.glint('glint', capsule(cx - 15, cy - 8, cx - 11, cy - 11, 4));
}

/** A round shield of iron with a spike for a boss and studs round its rim. */
export function spikeShield(d: Doc, cx: number, cy: number, r = 22, mat: Material = IRON): void {
  d.piece('face', circle(cx, cy, r), mat, {
    shade: 5,
    inner: (c) => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        rivet(c, cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6), 1.8);
      }
    },
  });
  d.piece('spike', star(cx, cy, 4, 13, 5.5), STEEL, { shade: 3 });
}

/** A shield of hide stretched on a frame: an oval, stitched round its edge, with a band of darker hide across it. */
export function hideShield(d: Doc, cx: number, cy: number, mat: Material = BONE, band: Material = LEATHER): void {
  d.piece('face', ellipse(cx, cy, 19, 30), mat, {
    shade: 5,
    inner: (c) => {
      c.piece('band', roundRect(cx - 24, cy - 7, 48, 14, 0), band, { shade: 0 });
      for (const dy of [-22, -15, 15, 22]) c.shadeOver('stitch', capsule(cx - 6, cy + dy, cx + 6, cy + dy, 1.6), 1.2);
    },
  });
  d.piece('grip', roundRect(cx - 3, cy - 34, 6, 68, 3), WOOD, { shade: 0 });
}

/** A great turtle's shell carried as a shield. */
export function shellShield(d: Doc, cx: number, cy: number, mat: Material = BUSH): void {
  d.piece('shell', ellipse(cx, cy, 23, 27), mat, {
    shade: 6,
    inner: (c) => {
      // The plates of it: one in the middle and a ring of them about it.
      c.line('plate', poly([[cx, cy - 12], [cx + 10, cy - 4], [cx + 8, cy + 9], [cx - 8, cy + 9], [cx - 10, cy - 4]]));
      for (const [x, y] of [[0, -30], [24, -10], [16, 26], [-16, 26], [-24, -10]] as const) {
        const k = 0.42;
        c.line('seam', path().M(cx + x * k, cy + y * k).L(cx + x, cy + y));
      }
    },
  });
}

/** A slab of bark for a shield, with a leaf still on it. */
export function barkShield(d: Doc, cx: number, cy: number, mat: Material = WOOD, leaf: Material = BUSH): void {
  d.piece('bark', smooth([[cx - 14, cy - 30], [cx + 10, cy - 34], [cx + 20, cy - 14], [cx + 16, cy + 18], [cx + 4, cy + 32], [cx - 14, cy + 24], [cx - 20, cy - 4]]), mat, {
    shade: 6,
    inner: (c) => {
      crease(c, 'ridge-a', [cx - 8, cy - 24], [cx - 10, cy + 20], 3.2);
      crease(c, 'ridge-b', [cx + 6, cy - 26], [cx + 4, cy + 24], 3);
    },
  });
  d.piece('leaf', smooth([[cx + 8, cy - 30, 'c'], [cx + 20, cy - 36], [cx + 30, cy - 30, 'c'], [cx + 20, cy - 24]]), leaf, { shade: 0 });
}

/** The lid of a cooking pot, held by its knob. */
export function potLid(d: Doc, cx: number, cy: number, mat: Material = IRON): void {
  d.piece('lid', circle(cx, cy, 18), mat, {
    shade: 4,
    inner: (c) => c.line('rim', circle(cx, cy, 12)),
  });
  d.piece('knob', circle(cx, cy, 5), WOOD, { shade: 0 });
}

// ---------------------------------------------------------------- other things in the off hand

/** A hawk on the fist: hooded, as a hunting bird is carried, with only its beak below the hood. */
export function hawk(d: Doc, cx: number, cy: number, feather: Material = STONE, hoodMat: Material = LEATHER, hand: Material = LEATHER): void {
  d.piece('tail', poly([[cx - 12, cy - 12], [cx - 26, cy + 4], [cx - 18, cy + 6], [cx - 6, cy - 6]]), far(feather), { shade: 0 });
  d.piece('body', smooth([[cx - 8, cy - 32], [cx + 6, cy - 34], [cx + 12, cy - 22], [cx + 8, cy - 8], [cx - 4, cy - 4], [cx - 14, cy - 14]]), feather, {
    shade: 4,
    inner: (c) => {
      c.piece('breast', smooth([[cx + 2, cy - 28], [cx + 14, cy - 22], [cx + 10, cy - 6], [cx, cy - 8]]), BONE, { shade: 0 });
      crease(c, 'wing', [cx - 8, cy - 26], [cx - 10, cy - 8], 3, 1);
    },
  });
  d.piece('beak', poly([[cx + 10, cy - 36], [cx + 18, cy - 33], [cx + 10, cy - 30]]), GOLD, { shade: 0 });
  d.piece('hood', smooth([[cx - 8, cy - 34, 'c'], [cx - 8, cy - 44], [cx + 2, cy - 48], [cx + 11, cy - 44], [cx + 12, cy - 34, 'c']]), hoodMat, { shade: 3 });
  d.piece('tuft', capsule(cx + 1, cy - 47, cx - 1, cy - 55, 4), GOLD, { shade: 0 });
  mitt(d, cx, cy, hand, 8);
}

/** A small keg under the arm. */
export function keg(d: Doc, cx: number, cy: number, mat: Material = WOOD): void {
  d.piece('keg', smooth([[cx - 15, cy - 14, 'c'], [cx + 15, cy - 14, 'c'], [cx + 18, cy], [cx + 15, cy + 14, 'c'], [cx - 15, cy + 14, 'c'], [cx - 18, cy]]), mat, {
    shade: 4,
    inner: (c) => {
      c.piece('hoop-a', roundRect(cx - 20, cy - 10, 40, 5, 0), IRON, { shade: 0 });
      c.piece('hoop-b', roundRect(cx - 20, cy + 6, 40, 5, 0), IRON, { shade: 0 });
      c.shadeOver('stave', roundRect(cx - 1.2, cy - 16, 2.4, 32, 0), 0.9);
    },
  });
  d.piece('bung', circle(cx + 6, cy - 1, 3), IRON, { shade: 0 });
}

/** A sack over the shoulder, tied at its neck. */
export function sack(d: Doc, cx: number, cy: number, mat: Material = LINEN): void {
  d.piece('sack', smooth([[cx - 4, cy - 26, 'c'], [cx + 8, cy - 22, 'c'], [cx + 18, cy - 6], [cx + 16, cy + 14], [cx, cy + 20], [cx - 16, cy + 14], [cx - 18, cy - 6]]), mat, {
    shade: 5,
    inner: (c) => {
      c.shadeOver('patch', roundRect(cx - 10, cy - 2, 11, 10, 2), 0.9);
      crease(c, 'fold', [cx + 2, cy - 18], [cx + 8, cy + 10], 3);
    },
  });
  d.piece('tie', roundRect(cx - 7, cy - 26, 16, 6, 3), WOOD, { shade: 0 });
}

/** A scroll, rolled and tied. */
export function scroll(d: Doc, cx: number, cy: number, tie: Material, hand: Material = LEATHER): void {
  d.piece('roll', roundRect(cx - 7, cy - 22, 14, 40, 6), BONE, { shade: 3 });
  d.piece('tie', roundRect(cx - 9, cy - 6, 18, 7, 0), tie, { shade: 0 });
  mitt(d, cx, cy + 6, hand);
}

/** A tankard with a head on it. */
export function mug(d: Doc, cx: number, cy: number, hand: Material = LEATHER): void {
  d.piece('foam', smooth([[cx - 11, cy - 12, 'c'], [cx - 12, cy - 20], [cx - 2, cy - 24], [cx + 8, cy - 22], [cx + 12, cy - 14], [cx + 11, cy - 10, 'c']]), BONE, { shade: 0 });
  d.piece('mug', roundRect(cx - 11, cy - 14, 22, 26, 3), WOOD, {
    shade: 3,
    inner: (c) => {
      c.piece('hoop-a', roundRect(cx - 14, cy - 10, 28, 4, 0), IRON, { shade: 0 });
      c.piece('hoop-b', roundRect(cx - 14, cy + 4, 28, 4, 0), IRON, { shade: 0 });
    },
  });
  mitt(d, cx - 12, cy, hand, 7);
}

/** A hook where a hand would be. */
export function hookHand(d: Doc, cx: number, cy: number): void {
  d.piece('hook', path().M(cx - 3, cy + 4).L(cx - 3, cy - 12).Q(cx - 3, cy - 26, cx + 10, cy - 26).Q(cx + 22, cy - 26, cx + 20, cy - 12).L(cx + 13, cy - 13).Q(cx + 14, cy - 20, cx + 9, cy - 20).Q(cx + 4, cy - 20, cx + 4, cy - 12).L(cx + 4, cy + 4).Z(), STEEL, { shade: 0 });
  d.piece('cup', roundRect(cx - 8, cy, 17, 12, 4), LEATHER, { shade: 3 });
}

// ---------------------------------------------------------------- on the back

/** A banner on a pole strapped to the back: tall and narrow, in the side's color. */
export function backBanner(d: Doc, cloth: Material, mark: Material = GOLD): void {
  d.piece('pole', roundRect(69, 34, 5, 96, 2), WOOD, { shade: 0 });
  d.piece('banner', poly([[42, 38], [70, 38], [70, 92], [42, 92], [50, 84], [42, 76]]), cloth, {
    shade: 4,
    inner: (c) => c.piece('mark', poly([[58, 52], [65, 61], [58, 70], [51, 61]]), mark, { shade: 0 }),
  });
  d.piece('bar', roundRect(40, 35, 34, 5, 2), WOOD, { shade: 0 });
}

/** A pack on the back with a bedroll tied over it. */
export function backpack(d: Doc, mat: Material = LEATHER, roll: Material = LINEN): void {
  d.piece('pack', roundRect(46, 110, 32, 38, 8), mat, {
    shade: 4,
    inner: (c) => {
      c.piece('flap', roundRect(42, 106, 40, 16, 6), mat, { shade: 3 });
      c.piece('buckle', roundRect(57, 120, 9, 9, 2), GOLD, { shade: 0 });
    },
  });
  d.piece('roll', roundRect(42, 98, 40, 14, 7), roll, {
    shade: 3,
    inner: (c) => {
      c.shadeOver('strap-a', roundRect(51, 96, 3, 18, 0), 1.2);
      c.shadeOver('strap-b', roundRect(70, 96, 3, 18, 0), 1.2);
    },
  });
}

/** A boiler on the back: a tank of metal with a pipe out of its top. */
export function boiler(d: Doc, mat: Material, pipe: Material = IRON): void {
  d.piece('pipe', roundRect(52, 76, 9, 32, 3), pipe, { shade: 0 });
  d.piece('pipe-cap', roundRect(48, 72, 17, 8, 3), pipe, { shade: 0 });
  d.piece('tank', roundRect(44, 102, 34, 48, 12), mat, {
    shade: 5,
    inner: (c) => {
      c.piece('band-a', roundRect(40, 114, 42, 5, 0), pipe, { shade: 0 });
      c.piece('band-b', roundRect(40, 134, 42, 5, 0), pipe, { shade: 0 });
      for (const y of [108, 126, 144]) rivet(c, 50, y, 1.7);
    },
  });
}

/** A basket on the back, with what was gathered standing out of the top of it. */
export function basket(d: Doc, load: Material = BUSH): void {
  d.piece('load-a', smooth([[52, 108, 'c'], [48, 94], [56, 88], [62, 98], [62, 108, 'c']]), load, { shade: 0 });
  d.piece('load-b', smooth([[62, 108, 'c'], [64, 92], [72, 90], [76, 100], [74, 108, 'c']]), load, { shade: 3 });
  d.piece('basket', smooth([[44, 106, 'c'], [80, 106, 'c'], [76, 146], [62, 152], [48, 146]]), STRAW, {
    shade: 4,
    inner: (c) => {
      for (const y of [116, 126, 136]) c.shadeOver('weave', roundRect(40, y, 44, 2.4, 0), 0.9);
      for (const x of [54, 64, 72]) c.shadeOver('stake', roundRect(x, 104, 2.2, 50, 0), 0.7);
    },
  });
}

/** A round shield slung on the back: only its rim shows past the body. */
export function slungShield(d: Doc, mat: Material = WOOD, rim: Material = IRON): void {
  d.piece('rim', circle(70, 126, 26), rim, { shade: 4 });
  d.piece('face', circle(70, 126, 20), mat, { shade: 3 });
}

/** A sheaf of javelins on the back, their heads up over the shoulder. */
export function javelins(d: Doc): void {
  for (const [x, turn] of [[62, -16], [70, -8], [78, 0]] as const) {
    const t = (p: ReturnType<typeof poly>): ReturnType<typeof poly> => p.rotate(turn, x, 130);
    d.piece('shaft', t(roundRect(x - 2.2, 70, 4.4, 72, 2)), WOOD, { shade: 0 });
    d.piece('head', t(poly([[x, 52], [x + 6, 68], [x, 73], [x - 6, 68]])), STEEL, { shade: 0 });
  }
  d.piece('strap', roundRect(54, 118, 30, 7, 3), LEATHER, { shade: 0 });
}

/** A cloak of fur: shaggy, and nobody's color. */
export function furCloak(d: Doc, fur: Material): void {
  d.piece('cloak', path()
    .M(78, 104).L(112, 104).Q(110, 132, 106, 158)
    .L(98, 166).L(92, 156).L(84, 168).L(76, 158).L(66, 170).L(58, 158).L(46, 166)
    .Q(50, 140, 60, 116).Z(), fur, {
    shade: 5,
    inner: (c) => {
      for (const [x, y] of [[70, 118], [84, 114], [98, 120], [64, 136], [80, 134], [96, 140], [72, 152], [90, 152]] as const) {
        c.shadeOver('tuft', capsule(x, y, x + 2.5, y + 7, 2.2), 0.9);
      }
    },
  });
}

/** A cape worn to tatters along its hem. */
export function tornCape(d: Doc, mat: Material): void {
  d.piece('cape', path()
    .M(78, 104).L(112, 104).Q(110, 134, 106, 160)
    .L(100, 150).L(94, 164).L(86, 152).L(78, 168).L(70, 154).L(60, 170).L(54, 156).L(44, 162)
    .Q(48, 138, 60, 116).Z(), mat, {
    shade: 5,
    inner: (c) => {
      crease(c, 'fold-a', [96, 114], [94, 152], 3.2);
      crease(c, 'fold-b', [78, 118], [70, 156], 3);
    },
  });
}

// ---------------------------------------------------------------- worn on the body, drawn inside it

/** A sash from one shoulder down to the other hip. */
export function sash(c: Doc, mat: Material): void {
  c.shadeOver('sash-cast', poly([[62, 104], [78, 100], [132, 150], [124, 164]]).translate(0, 3), 0.7);
  c.piece('sash', poly([[60, 102], [78, 96], [134, 148], [124, 162]]), mat, { shade: 0 });
}

/** An apron over the front of a tunic. */
export function apron(c: Doc, mat: Material): void {
  c.piece('apron', roundRect(84, 112, 44, 56, 4), mat, { shade: 3 });
  c.shadeOver('tie', roundRect(52, 128, 90, 3, 0), 1);
}

/** Scales: rows of small plates, each lapping the one below. */
export function scales(c: Doc, y0 = 104, y1 = 160): void {
  let row = 0;
  for (let y = y0; y <= y1; y += 9) {
    for (let x = 58 + (row % 2) * 6; x <= 136; x += 12) {
      c.shadeOver('scale', path().M(x - 5, y).Q(x, y + 8, x + 5, y).Q(x, y + 4.5, x - 5, y).Z(), 1.4);
    }
    row++;
  }
}

/** A breastplate over the chest, with the plates below it lapping down to the belt. */
export function breastplate(c: Doc, mat: Material = STEEL): void {
  c.piece('plate', smooth([[60, 100], [96, 96], [134, 100], [136, 124], [118, 136], [96, 139], [74, 136], [56, 124]]), mat, {
    shade: 4,
    inner: (p) => p.shadeOver('ridge', roundRect(107, 96, 2.6, 44, 1), 0.9),
  });
}

/** Ribs of bone laced over the chest: armor made of what the dead left. */
export function ribs(c: Doc, mat: Material = BONE): void {
  for (const y of [110, 120, 130]) {
    c.piece('rib', smooth([[84, y], [102, y - 3], [128, y], [128, y + 5], [102, y + 2], [84, y + 5]]), mat, { shade: 0 });
  }
  c.piece('spine', roundRect(104, 104, 6, 34, 2), mat, { shade: 0 });
}

/** A strap across the chest with a row of pouches on it. */
export function bandolier(c: Doc, mat: Material = LEATHER, pouch: Material = LINEN): void {
  c.piece('strap', poly([[60, 106], [70, 100], [132, 146], [126, 156]]), mat, { shade: 0 });
  for (const [x, y] of [[80, 116], [96, 128], [112, 140]] as const) c.piece('pouch', roundRect(x - 5, y - 6, 11, 12, 2).rotate(38, x, y), pouch, { shade: 0 });
}

/** A medal hung at the chest: one, and to the side of the middle. */
export function medal(c: Doc, mat: Material = GOLD): void {
  c.piece('medal', star(100, 122, 6, 8, 5), mat, { shade: 0 });
}

/** A belt of rope with its ends hanging. */
export function ropeBelt(c: Doc, y = 140, mat: Material = BONE): void {
  c.shadeOver('rope-cast', roundRect(56, y + 8, 80, 4, 0), 0.9);
  c.piece('rope', roundRect(56, y, 80, 7, 0), mat, { shade: 0 });
  c.piece('end-a', roundRect(104, y + 4, 5, 18, 2), mat, { shade: 0 });
  c.piece('end-b', roundRect(111, y + 4, 5, 13, 2), mat, { shade: 0 });
}

/** A hem of fur at the foot of a tunic or a robe. */
export function furHem(c: Doc, mat: Material, y = 150): void {
  c.piece('fur-hem', poly([[50, y], [142, y], [142, y + 30], [50, y + 30]]), mat, { shade: 0 });
  for (let x = 56; x < 140; x += 11) c.shadeOver('tuft', capsule(x, y + 3, x + 2, y + 9, 2), 0.9);
}

/** Quarters: one half of a tabard paler than the other. */
export function quartered(c: Doc): void {
  c.lightOver('quarter-a', roundRect(96, 90, 50, 44, 0), 1.2);
  c.lightOver('quarter-b', roundRect(46, 134, 50, 44, 0), 1.2);
}

/** Hoops: bands of a paler shade round a shirt, as sailors wear. */
export function hoops(c: Doc): void {
  for (const y of [106, 118, 130]) c.lightOver('hoop', roundRect(46, y, 100, 6, 0), 1.3);
}
