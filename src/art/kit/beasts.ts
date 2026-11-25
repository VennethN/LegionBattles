// Beasts. A beast has no face either, and by the same means as anyone: a
// mask of leather or a plate of iron over the muzzle, a hood, a forelock, a
// horn that lies where an eye would be. Ears, horns and tails are what tell
// one from another. If a beast cannot be drawn without eyes, it is not drawn.
//
// The four-legged ones share a build: a barrel of a body, two legs to a
// side, a tail, and a neck and head that the rig moves as it moves a
// weapon, so that a beast's attack is its head thrown forward.

import type { Doc } from './draw';
import { BONE, GOLD, IRON, LEATHER, STEEL, type Material } from './palette';
import { crease, far, rivet } from './parts';
import { Path, capsule, circle, ellipse, path, poly, roundRect, smooth, type Pt } from './path';

/** Where a beast's neck joins its body, on the canvas, before it is made bigger or smaller. */
export const WITHERS: Pt = [128, 116];

/** Makes a beast bigger or smaller about the point between its feet. Lines stay the one width. */
export function sized(k: number): (p: Path) => Path {
  return (p) => p.scale(k, k, 96, 180);
}

export function sizedPt(k: number, p: Pt): Pt {
  return [96 + (p[0] - 96) * k, 180 + (p[1] - 180) * k];
}

// ---------------------------------------------------------------- the body

/** A leg of a beast, with a paw or a hoof forward. `x` is where it joins the body, `top` how high that is. */
export function beastLeg(
  d: Doc, s: (p: Path) => Path, x: number, mat: Material, isFar: boolean, top = 142, w = 15, hoof: Material | null = null,
  /** How far forward of the hip the foot is set down, and how far its joint is bent back from the straight line between them. */
  step = 0, bend = 0,
): void {
  const h = w / 2;
  const px = x + step;
  // The joint, half way down: a straight leg has none, and is the table leg the first beasts stood on.
  const kx = x + step / 2 - bend;
  const ky = (top + 172) / 2;
  const leg = step === 0 && bend === 0
    ? path().M(x - h, top).L(x + h, top).L(x + h, 169).Q(x + h + 7, 170, x + h + 7, 176).L(x + h + 7, 180).L(x - h, 180).Z()
    : path().M(x - h, top).L(x + h, top).L(kx + h, ky).L(px + h, 169).Q(px + h + 7, 170, px + h + 7, 176).L(px + h + 7, 180).L(px - h, 180).L(px - h, 172).L(kx - h, ky).Z();
  x = px;
  d.piece('leg', s(leg), isFar ? far(mat) : mat, {
    shade: isFar ? 0 : 3,
    inner: hoof ? (c) => c.piece('hoof', s(roundRect(x - w / 2 - 2, 172, w + 12, 10, 0)), isFar ? far(hoof) : hoof, { shade: 0 }) : undefined,
  });
}

/** The barrel of a four-legged body. `low` drops its back for something that goes close to the ground. */
export function barrel(low = 0): Path {
  return smooth([[58, 124 + low], [70, 108 + low], [96, 104 + low], [122, 108 + low], [134, 122 + low], [134, 142], [122, 154], [96, 157], [70, 154], [58, 142]]);
}

/** Tufts over a shaggy hide. */
export function shag(c: Doc, s: (p: Path) => Path, low = 0): void {
  for (const [x, y] of [[70, 118], [84, 112], [100, 110], [116, 114], [76, 132], [92, 128], [110, 130], [124, 128], [84, 146], [104, 146]] as const) {
    c.shadeOver('tuft', s(capsule(x, y + low, x + 3, y + low + 8, 2.4)), 0.9);
  }
}

/** A cloth over a beast's back, with a band along its edge: where its side's color goes. */
export function blanket(d: Doc, s: (p: Path) => Path, cloth: Material, trim: Material = GOLD, low = 0): void {
  d.piece('blanket', s(smooth([[76, 104 + low, 'c'], [116, 102 + low, 'c'], [120, 136], [112, 146, 'c'], [82, 148, 'c'], [74, 138]])), cloth, {
    shade: 4,
    inner: (c) => c.piece('trim', s(roundRect(70, 138, 56, 6, 0)), trim, { shade: 0 }),
  });
}

/** A caparison: cloth over the whole of a horse's body, hanging below its belly in points. */
export function caparison(d: Doc, s: (p: Path) => Path, cloth: Material, trim: Material = GOLD): void {
  d.piece('caparison', s(path()
    .M(60, 110).Q(96, 96, 132, 108).L(136, 150).L(126, 162).L(116, 152).L(106, 164).L(96, 153).L(86, 164).L(76, 152).L(66, 162).L(56, 150).Z()), cloth, {
    shade: 5,
    inner: (c) => {
      c.piece('trim', s(roundRect(50, 138, 92, 6, 0)), trim, { shade: 0 });
      crease(c, 'fold-a', sizedLine(s, 84, 112), sizedLine(s, 80, 136), 3);
      crease(c, 'fold-b', sizedLine(s, 112, 110), sizedLine(s, 116, 136), 3);
    },
  });
}

function sizedLine(s: (p: Path) => Path, x: number, y: number): Pt {
  const b = s(circle(x, y, 0.01)).bounds();
  return [b.x, b.y];
}

// ---------------------------------------------------------------- tails

export function tailWhip(d: Doc, s: (p: Path) => Path, mat: Material): void {
  d.piece('tail', s(smooth([[62, 116, 'c'], [48, 110], [36, 92], [40, 78, 'c'], [46, 92], [56, 104], [66, 110, 'c']])), mat, { shade: 3 });
}

export function tailBrush(d: Doc, s: (p: Path) => Path, mat: Material, tip: Material | null = null): void {
  d.piece('tail', s(smooth([[62, 114, 'c'], [46, 112], [30, 122], [22, 140, 'c'], [36, 134], [50, 130], [64, 126, 'c']])), mat, {
    shade: 4,
    inner: tip ? (c) => c.piece('tip', s(circle(26, 136, 12)), tip, { shade: 0 }) : undefined,
  });
}

/** A horse's tail: long hair, falling. */
export function tailHair(d: Doc, s: (p: Path) => Path, mat: Material): void {
  d.piece('tail', s(smooth([[62, 112, 'c'], [48, 108], [38, 124], [36, 150], [42, 170, 'c'], [50, 152], [54, 132], [66, 122, 'c']])), mat, {
    shade: 4,
    inner: (c) => {
      crease(c, 'strand', sizedLine(s, 52, 116), sizedLine(s, 42, 160), 2.8, 0.9);
    },
  });
}

export function tailStub(d: Doc, s: (p: Path) => Path, mat: Material): void {
  d.piece('tail', s(ellipse(60, 116, 9, 8)), mat, { shade: 3 });
}

/** A lizard's tail: thick at the root, long, drawn out to a point on the ground behind. */
export function tailLizard(d: Doc, s: (p: Path) => Path, mat: Material): void {
  d.piece('tail', s(smooth([[66, 132, 'c'], [48, 136], [28, 152], [10, 172, 'c'], [32, 168], [52, 160], [68, 154, 'c']])), mat, { shade: 4 });
}

// ---------------------------------------------------------------- heads
// Each draws a neck and a head from the withers forward. None has an eye.

/** A hound's head in a mask of leather: ears up, a muzzle, a seam and three studs, and a collar. */
export function houndHead(d: Doc, s: (p: Path) => Path, fur: Material, mask: Material = LEATHER, collar: Material | null = null, rivets = true): void {
  d.piece('ear-far', s(poly([[142, 92], [146, 70], [154, 90]])), far(fur), { shade: 0 });
  d.piece('neck', s(capsule(124, 124, 140, 106, 22)), fur, { shade: 3 });
  if (collar) d.piece('collar', s(poly([[120, 110], [142, 122], [138, 131], [116, 119]])), collar, { shade: 0 });
  d.piece('head', s(smooth([[130, 100], [140, 88], [156, 88], [174, 102, 'c'], [173, 112, 'c'], [154, 117], [136, 115]])), mask, {
    shade: 4,
    inner: (c) => {
      c.shadeOver('seam', s(capsule(148, 86, 151, 118, 1.6)), 1.3);
      // Shown small, three rivets on a mask are dots where a face would be: a beast that is looked at closely goes without.
      if (rivets) for (const [x, y] of [[158, 96], [164, 100], [169, 105]] as const) rivetAt(c, s, x, y);
    },
  });
  d.piece('ear', s(poly([[132, 96], [130, 70], [146, 88]])), fur, { shade: 3 });
}

function rivetAt(c: Doc, s: (p: Path) => Path, x: number, y: number): void {
  const p = sizedLine(s, x, y);
  rivet(c, p[0], p[1], 1.7);
}

/** A bear's head: round ears, a heavy skull, and a plate of iron over the muzzle with three breaths cut in it. */
export function bearHead(d: Doc, s: (p: Path) => Path, fur: Material, plate: Material = IRON): void {
  d.piece('ear-far', s(circle(150, 86, 8)), far(fur), { shade: 0 });
  d.piece('neck', s(capsule(122, 124, 138, 110, 28)), fur, { shade: 3 });
  d.piece('head', s(smooth([[126, 98], [138, 86], [156, 86], [170, 98], [176, 112, 'c'], [160, 122], [138, 122], [126, 112]])), fur, { shade: 5 });
  d.piece('muzzle', s(smooth([[150, 98, 'c'], [168, 98], [178, 112, 'c'], [160, 123], [148, 118]])), plate, {
    shade: 3,
    inner: (c) => {
      for (let i = 0; i < 3; i++) c.shadeOver('breath', s(capsule(156 + i * 6, 108, 157 + i * 6, 115, 2.2)), 1.6);
    },
  });
  d.piece('ear', s(circle(136, 90, 9)), fur, { shade: 3 });
}

/** A stag's head hooded in cloth, on a long neck, with antlers. */
export function stagHead(d: Doc, s: (p: Path) => Path, fur: Material, hood: Material, antler: Material = BONE): void {
  // An antler is a beam and three tines. Each is outlined, and then filled
  // again a little thinner, so that where they join no line crosses the horn.
  const LIMBS: readonly [number, number, number, number, number][] = [
    [148, 70, 138, 30, 8],
    [144, 56, 160, 40, 7],
    [140, 40, 152, 18, 7],
    [139, 34, 126, 12, 7],
  ];
  const antlers = (dx: number, dy: number, mat: Material): void => {
    const m = (p: Path): Path => s(p.translate(dx, dy));
    for (const [x1, y1, x2, y2, w] of LIMBS) d.piece('antler', m(capsule(x1, y1, x2, y2, w)), mat, { shade: 0 });
    for (const [x1, y1, x2, y2, w] of LIMBS) d.flat('antler-fill', m(capsule(x1, y1, x2, y2, w - 3.4)), mat.fill);
  };
  antlers(-16, 4, far(antler));
  d.piece('neck', s(capsule(124, 122, 142, 86, 18)), fur, { shade: 3 });
  d.piece('ear', s(smooth([[136, 78, 'c'], [124, 72], [118, 62, 'c'], [132, 64], [140, 72]])), fur, { shade: 0 });
  d.piece('hood', s(smooth([[134, 76], [146, 66], [160, 70], [172, 86, 'c'], [168, 94, 'c'], [150, 96], [136, 104, 'c'], [130, 90]])), hood, {
    shade: 4,
    inner: (c) => c.piece('trim', s(poly([[128, 96], [140, 108], [144, 102], [132, 90]])), GOLD, { shade: 0 }),
  });
  antlers(0, 0, antler);
}

/** A ram's head: a great horn curled where an eye would be, and a plate over the muzzle. */
export function ramHead(d: Doc, s: (p: Path) => Path, wool: Material, horn: Material = BONE, plate: Material = IRON): void {
  d.piece('neck', s(capsule(122, 124, 138, 108, 26)), wool, { shade: 3 });
  d.piece('head', s(smooth([[130, 98], [142, 90], [158, 94], [172, 108, 'c'], [168, 118, 'c'], [150, 120], [134, 116]])), plate, { shade: 4 });
  d.piece('horn', s(smooth([[136, 88, 'c'], [150, 84], [162, 94], [162, 108], [152, 116], [142, 112], [140, 104], [146, 100, 'c'], [150, 104], [152, 100], [148, 94], [138, 96, 'c']])), horn, {
    shade: 3,
    inner: (c) => {
      c.shadeOver('ring-a', s(capsule(152, 86, 156, 96, 2)), 1.1);
      c.shadeOver('ring-b', s(capsule(160, 100, 152, 104, 2)), 1.1);
    },
  });
}

/** A yak's head: carried low, horns up, and a forelock of long hair over all the front of it. */
export function yakHead(d: Doc, s: (p: Path) => Path, fur: Material, horn: Material = BONE): void {
  d.piece('horn-far', s(smooth([[146, 96, 'c'], [158, 86], [164, 70, 'c'], [152, 80], [142, 90, 'c']])), far(horn), { shade: 0 });
  d.piece('neck', s(capsule(122, 126, 138, 116, 30)), fur, { shade: 3 });
  d.piece('head', s(smooth([[130, 104], [144, 96], [160, 102], [170, 120], [164, 134, 'c'], [148, 136], [134, 128]])), fur, { shade: 5 });
  // A mop of hair over all its front, hanging in strands: a jagged edge here read as teeth.
  d.piece('forelock', s(smooth([[132, 102], [148, 90], [166, 100], [174, 120], [166, 132], [150, 128], [136, 122]])), far(fur), {
    shade: 0,
    inner: (c) => {
      for (const [x, y] of [[144, 100], [154, 100], [164, 106]] as const) c.shadeOver('strand', s(capsule(x, y, x + 2, y + 24, 2.4)), 1.2);
    },
  });
  d.piece('horn', s(smooth([[138, 100, 'c'], [150, 88], [154, 68, 'c'], [142, 80], [134, 94, 'c']])), horn, { shade: 3 });
}

/** A lizard's head: low and flat, plated on top, with a crest of spines. */
export function lizardHead(d: Doc, s: (p: Path) => Path, skin: Material, plate: Material = IRON, spine: Material = BONE, rivets = true): void {
  for (const x of [130, 140, 150]) d.piece('spine', s(poly([[x - 5, 128], [x + 1, 114], [x + 6, 128]])), spine, { shade: 0 });
  d.piece('head', s(smooth([[124, 136], [134, 126], [152, 124], [170, 130], [180, 142, 'c'], [166, 150], [140, 152], [126, 148]])), skin, { shade: 4 });
  d.piece('plate', s(smooth([[132, 126, 'c'], [152, 122], [172, 130], [180, 141, 'c'], [160, 138], [134, 137]])), plate, {
    shade: 3,
    inner: (c) => {
      if (rivets) for (const [x, y] of [[146, 130], [156, 132], [166, 135]] as const) rivetAt(c, s, x, y);
    },
  });
}

/** A horse's head in a hood of cloth with a plate down its nose: ears up, and no opening in it. */
export function horseHead(d: Doc, s: (p: Path) => Path, hide: Material, hood: Material | null, mane: Material, plate: Material = STEEL): void {
  d.piece('ear-far', s(poly([[146, 62], [150, 44], [156, 62]])), far(hood ?? hide), { shade: 0 });
  d.piece('mane', s(smooth([[120, 112, 'c'], [122, 90], [132, 68], [142, 60, 'c'], [140, 78], [136, 96], [134, 116, 'c']])), mane, { shade: 3 });
  d.piece('neck', s(capsule(126, 118, 144, 78, 22)), hood ?? hide, { shade: 4 });
  d.piece('head', s(smooth([[136, 70], [146, 60], [158, 62], [168, 78], [176, 100, 'c'], [172, 108, 'c'], [160, 106], [146, 92], [136, 84]])), hood ?? hide, { shade: 5 });
  d.piece('plate', s(smooth([[150, 62, 'c'], [158, 62], [168, 78], [176, 100, 'c'], [170, 102], [160, 84]])), plate, {
    shade: 3,
    inner: (c) => {
      for (const [x, y] of [[160, 74], [165, 84], [170, 94]] as const) rivetAt(c, s, x, y);
    },
  });
  d.piece('ear', s(poly([[138, 66], [138, 46], [148, 62]])), hood ?? hide, { shade: 3 });
}
