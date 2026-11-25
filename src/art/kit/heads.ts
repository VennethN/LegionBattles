// More heads. The rule of parts.ts holds here as it does there: there are no
// faces. A head is a closed helm with one dark slit, a hood with shadow in
// it, a hat over a scarf with shadow between, a wrap, a mask or a veil.
// Nothing here draws an eye, a mouth, a nose or a brow.
//
// Each was drawn for one unit and can be worn by any. What tells a head from
// the others is its outline first: a tail, a comb, a pair of ears, a cone.

import type { Doc } from './draw';
import { BONE, BUSH, FIRE, GOLD, HOOD_INTERIOR, IRON, LEATHER, LINEN, RUBY, STEEL, STONE, WOOD, type Accent, type Material } from './palette';
import { crease, dark, domePath, far, hood, mailRings, rivet, under } from './parts';
import { Path, capsule, circle, ellipse, line, path, poly, roundRect, smooth, type Pt } from './path';

/** Straw: gold's colors with no shine on them. */
export const STRAW: Material = { fill: GOLD.fill, shade: GOLD.shade };

/** The shadow under a hat's brim, where a face would be, and a scarf up to it. Most hats are worn over this. */
export function hatFace(d: Doc, scarf: Material, fold = true): void {
  const face = ellipse(98, 88, 27, 21);
  d.flat('shadow-under', face, HOOD_INTERIOR);
  d.line('shadow-under-edge', face);
  d.piece('scarf', smooth([[69, 92], [84, 88], [112, 88], [127, 92], [125, 101], [112, 109], [84, 109], [71, 101]]), scarf, {
    shade: 4,
    inner: fold ? (c) => c.line('fold', smooth([[75, 98], [98, 95], [123, 98]], false)) : undefined,
  });
}

/** The usual slit of a closed helm: it runs off the front edge, which turns the head a little to the right. */
function slit(c: Doc, y = 77, h = 9): void {
  dark(c, 'slit', roundRect(94, y, 44, h, h / 2));
}

/** A toothed wheel as a path: `n` flat teeth. */
export function cog(cx: number, cy: number, n: number, outer: number, inner: number): Path {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const w = (Math.PI * 2) / n;
    for (const [r, t] of [[inner, 0.02], [outer, 0.14], [outer, 0.38], [inner, 0.5]] as const) {
      pts.push([cx + Math.cos(a + w * t) * r, cy + Math.sin(a + w * t) * r]);
    }
  }
  return poly(pts);
}

// ---------------------------------------------------------------- helms

/** A sallet: a helm drawn out into a tail over the nape, and a plate for the chin under it. */
export function sallet(d: Doc, mat: Material = STEEL): void {
  under(d);
  d.piece('bevor', smooth([[82, 90, 'c'], [130, 88, 'c'], [128, 101], [112, 110], [90, 110]]), mat, { shade: 3 });
  d.piece('helm', smooth([[97, 49], [119, 56], [131, 76], [129, 90, 'c'], [100, 95], [78, 99], [50, 104, 'c'], [60, 88], [64, 72], [75, 56]]), mat, {
    shade: 6,
    inner: (c) => {
      // A row of three along the tail.
      rivet(c, 60, 97, 1.8);
      rivet(c, 69, 95.5, 1.8);
      rivet(c, 78, 94, 1.8);
      slit(c, 76, 8);
      c.line('ridge', smooth([[70, 60], [97, 51], [124, 62]], false));
    },
  });
  d.glint('glint', capsule(78, 66, 84, 61, 5));
}

/** A barbute: a tall helm with one opening shaped like a T, and a low fin along its crown. */
export function barbute(d: Doc, mat: Material = STEEL): void {
  under(d);
  d.piece('fin', smooth([[76, 56, 'c'], [82, 40], [98, 34], [114, 40], [120, 56, 'c']]), mat, { shade: 3 });
  d.piece('helm', smooth([[97, 46], [119, 54], [129, 78], [125, 100], [108, 109], [86, 109], [70, 100], [66, 78], [76, 54]]), mat, {
    shade: 6,
    inner: (c) => {
      const t = path().M(98, 75).L(134, 75).L(134, 84).L(118, 84).L(118, 112).L(110, 112).L(110, 84).L(98, 84).Q(94, 79.5, 98, 75).Z();
      dark(c, 'slit', t);
      c.line('rim', smooth([[62, 98], [96, 102], [132, 96]], false));
    },
  });
  d.glint('glint', capsule(77, 68, 82, 63, 5));
}

/** A great helm: a flat-topped bucket with one slit, bands of trim crossed on its front, and a row of breaths. */
export function greatHelm(d: Doc, mat: Material = STEEL, trim: Material = GOLD): void {
  under(d);
  d.piece('helm', smooth([[70, 51, 'c'], [124, 51, 'c'], [130, 80], [126, 100], [108, 109], [86, 109], [69, 100], [65, 80]]), mat, {
    shade: 6,
    inner: (c) => {
      c.piece('band-up', roundRect(108, 44, 8, 70, 0), trim, { shade: 0 });
      c.piece('band-across', roundRect(60, 66, 80, 7, 0), trim, { shade: 0 });
      slit(c, 76, 8);
      // Breaths: a row of four, low on the cheek.
      for (let i = 0; i < 4; i++) rivet(c, 76 + i * 7, 96, 1.7);
    },
  });
  d.glint('glint', capsule(74, 62, 79, 58, 4.5));
}

/** A helm with a visor drawn out to a point, like a hound's muzzle, with a slit above and breaths along it. */
export function hounskull(d: Doc, mat: Material = STEEL): void {
  under(d);
  d.piece('helm', smooth([[94, 46], [114, 54], [124, 76], [122, 98], [106, 108], [84, 108], [69, 100], [65, 78], [74, 56]]), mat, {
    shade: 6,
    inner: (c) => c.line('rim', smooth([[62, 98], [96, 102], [128, 96]], false)),
  });
  d.piece('visor', smooth([[96, 68, 'c'], [120, 70], [148, 92, 'c'], [122, 106], [98, 104, 'c']]), mat, {
    shade: 5,
    inner: (c) => {
      dark(c, 'slit', roundRect(104, 76, 26, 6.5, 3.2).rotate(12, 104, 79));
      // Breaths: three short cuts along the lower side of the point.
      for (let i = 0; i < 3; i++) c.shadeOver('breath', capsule(112 + i * 8, 94 - i * 0.5, 113 + i * 8, 100 - i * 1.5, 2.4), 1.6);
    },
  });
  // The hinge the visor lifts on: dark and small, so that it is not a second thing to look at beside the slit.
  d.piece('pivot', circle(98, 92, 3.5), IRON, { shade: 0 });
  d.glint('glint', capsule(77, 64, 82, 59, 5));
}

/** A morion: a comb along the crown, and a brim that sweeps up to a point before and behind, over a scarf. */
export function morion(d: Doc, scarf: Material, mat: Material = STEEL): void {
  under(d);
  hatFace(d, scarf);
  d.piece('comb', smooth([[70, 66, 'c'], [78, 42], [97, 32], [116, 42], [124, 66, 'c']]), mat, { shade: 3 });
  d.piece('crown', smooth([[74, 76, 'c'], [77, 56], [97, 47], [117, 56], [120, 76, 'c']]), mat, { shade: 4 });
  d.piece('brim', smooth([[44, 60, 'c'], [60, 74], [96, 79], [132, 74], [150, 60, 'c'], [142, 80], [96, 89], [50, 80]]), mat, { shade: 3 });
  d.glint('glint', capsule(84, 62, 89, 58, 4.5));
}

/** A pointed helm with a tail of hair from its tip, over a guard of leather plates with one slit. */
export function tailHelm(d: Doc, hair: Material, mat: Material = STEEL, guard: Material = LEATHER): void {
  under(d);
  d.piece('guard', smooth([[66, 72, 'c'], [128, 72, 'c'], [131, 93], [124, 107], [99, 111], [73, 107], [65, 93]]), guard, {
    shade: 5,
    inner: (c) => {
      // Plates laced in rows.
      for (const y of [88, 96, 104]) c.shadeOver('row', roundRect(60, y, 34, 2.4, 0), 1);
      slit(c, 79, 9);
    },
  });
  d.piece('tail', smooth([[98, 30, 'c'], [84, 24], [64, 32], [50, 52], [46, 78, 'c'], [58, 62], [72, 48], [92, 42, 'c']]), hair, {
    shade: 4,
    inner: (c) => {
      crease(c, 'strand-a', [88, 34], [58, 58], 2.6, 0.9);
      crease(c, 'strand-b', [78, 30], [52, 66], 2.4, 0.9);
    },
  });
  d.piece('helm', smooth([[66, 78, 'c'], [74, 56], [97, 30, 'c'], [120, 56], [128, 78, 'c']]), mat, {
    shade: 5,
    inner: (c) => c.piece('rim', roundRect(60, 69, 76, 10, 0), GOLD, { shade: 0 }),
  });
  d.glint('glint', capsule(84, 58, 89, 52, 4.5));
}

/** A helm with a bull's horns: out from the sides and up, wider than the shoulders. */
export function bullHelm(d: Doc, mat: Material = IRON, horn: Material = BONE): void {
  under(d);
  const hornShape = smooth([[112, 74, 'c'], [134, 74], [150, 58], [154, 34, 'c'], [142, 50], [130, 58], [112, 60, 'c']]);
  d.piece('horn-far', hornShape.mirrorX(97), far(horn), { shade: 0 });
  d.piece('helm', smooth([[97, 52], [118, 59], [128, 80], [124, 100], [108, 108], [86, 108], [70, 100], [66, 80], [76, 59]]), mat, {
    shade: 6,
    inner: (c) => {
      slit(c, 78, 9);
      c.line('nasal', line(112, 54, 112, 77));
      c.line('band', smooth([[64, 70], [96, 66], [130, 69]], false));
    },
  });
  d.piece('horn', hornShape, horn, {
    shade: 4,
    inner: (c) => {
      c.shadeOver('ring-a', capsule(124, 62, 128, 76, 2.4), 1.1);
      c.shadeOver('ring-b', capsule(138, 54, 146, 64, 2.4), 1.1);
    },
  });
  d.glint('glint', capsule(78, 68, 83, 64, 4.5));
}

/** A keep's tower for a helm: a round wall with three merlons on it and one slit. */
export function towerHelm(d: Doc, mat: Material = STONE): void {
  under(d);
  d.piece('merlons', poly([[68, 58], [68, 34], [81, 34], [81, 44], [90, 44], [90, 34], [104, 34], [104, 44], [113, 44], [113, 34], [126, 34], [126, 58]]), mat, { shade: 3 });
  d.piece('wall', smooth([[68, 54, 'c'], [126, 54, 'c'], [130, 80], [126, 100], [108, 109], [86, 109], [69, 100], [65, 80]]), mat, {
    shade: 6,
    inner: (c) => {
      // Courses of stone, and the joints in them set between each other.
      for (const y of [66, 92]) c.shadeOver('course', roundRect(60, y, 80, 2.4, 0), 0.9);
      c.shadeOver('joint-a', roundRect(84, 54, 2.4, 12, 0), 0.9);
      c.shadeOver('joint-b', roundRect(76, 92, 2.4, 18, 0), 0.9);
      slit(c, 75, 9);
    },
  });
}

/** An anvil for a helm: a flat table wider than the head, with its horn forward, on a block with one slit. */
export function anvilHelm(d: Doc, mat: Material = IRON, trim: Material = GOLD): void {
  under(d);
  d.piece('block', smooth([[72, 58, 'c'], [122, 58, 'c'], [129, 82], [125, 100], [108, 109], [86, 109], [69, 100], [65, 82]]), mat, {
    shade: 6,
    inner: (c) => {
      slit(c, 78, 9);
      c.piece('band', roundRect(60, 92, 80, 6, 0), trim, { shade: 0 });
    },
  });
  d.piece('table', poly([[56, 60], [56, 42], [122, 42], [154, 50], [122, 60]]), mat, {
    shade: 4,
    inner: (c) => c.lightOver('face', roundRect(56, 42, 70, 5, 0), 0.8),
  });
}

/** A cog for a crest: the top half of a toothed wheel stands over a round helm with one slit. */
export function gearHelm(d: Doc, mat: Material, wheel: Material = GOLD): void {
  under(d);
  d.piece('wheel', cog(97, 60, 9, 31, 23), wheel, { shade: 3 });
  d.piece('helm', domePath().translate(0, 2), mat, {
    shade: 6,
    inner: (c) => {
      slit(c, 79, 9);
      // A row of three round the back.
      rivet(c, 71, 90, 1.8);
      rivet(c, 77, 95, 1.8);
      rivet(c, 85, 98, 1.8);
      c.line('seam', smooth([[66, 70], [96, 66], [130, 69]], false));
    },
  });
  d.glint('glint', capsule(78, 68, 83, 63, 4.5));
}

/** A boiler for a helm: a flat-topped drum with a stub of pipe behind, and a grille of bars over one opening. */
export function boilerHelm(d: Doc, mat: Material, pipe: Material = IRON): void {
  under(d);
  d.piece('pipe', roundRect(70, 26, 14, 30, 3), pipe, { shade: 3 });
  d.piece('pipe-cap', roundRect(66, 22, 22, 8, 3), pipe, { shade: 0 });
  d.piece('drum', smooth([[69, 52, 'c'], [125, 52, 'c'], [130, 80], [126, 100], [108, 109], [86, 109], [69, 100], [65, 80]]), mat, {
    shade: 6,
    inner: (c) => {
      c.piece('band', roundRect(60, 58, 80, 7, 0), pipe, { shade: 0 });
      dark(c, 'grille', roundRect(98, 74, 42, 20, 5));
      // Bars across the opening: it is one opening, barred.
      for (const x of [108, 118, 128]) c.piece('bar', roundRect(x, 70, 4.5, 28, 0), mat, { shade: 0 });
      for (let i = 0; i < 4; i++) rivet(c, 72 + i * 6, 101, 1.6);
    },
  });
}

/** A miner's cap with a candle burning on its front, over a cloth across the face with one slit. */
export function miningHelm(d: Doc, cloth: Material, mat: Material = IRON, glow: Accent = FIRE): void {
  under(d);
  d.piece('cloth', smooth([[66, 72, 'c'], [128, 72, 'c'], [131, 93], [124, 107], [99, 111], [73, 107], [65, 93]]), cloth, {
    shade: 5,
    inner: (c) => {
      slit(c, 79, 9);
      c.line('fold', smooth([[70, 98], [96, 102], [126, 98]], false));
    },
  });
  d.piece('cap', smooth([[66, 78, 'c'], [71, 58], [97, 47], [123, 58], [128, 78, 'c']]), mat, {
    shade: 5,
    inner: (c) => c.shadeOver('brim', roundRect(60, 72, 80, 3, 0), 1),
  });
  d.flat('halo', circle(116, 40, 12), glow.light, 0.45);
  d.piece('flame', smooth([[116, 28, 'c'], [122, 40], [116, 48], [110, 40]]), glow, { shade: 0 });
  d.piece('holder', roundRect(110, 46, 12, 12, 2), GOLD, { shade: 0 });
}

/** A spiral shell for a helm: a dome with a ridge of spines from brow to nape, and its turns winding down the back. */
export function shellHelm(d: Doc, shell: Material = BONE): void {
  under(d);
  for (const [x, y, k] of [[70, 62, 0.8], [82, 50, 1], [98, 44, 1.15], [114, 48, 1]] as const) {
    d.piece('spine', poly([[x - 7 * k, y + 8], [x - 3 * k, y - 20 * k], [x + 8 * k, y + 6]]), shell, { shade: 0 });
  }
  d.piece('shell', domePath().translate(0, 2), shell, {
    shade: 6,
    inner: (c) => {
      // It winds: each turn is a band of shade down the back of it, well behind the slit. Lines near the slit
      // were tried first, and one of them under it read as a mouth.
      c.shadeOver('turn-a', smooth([[84, 48], [90, 50], [80, 80], [82, 112], [76, 112], [73, 80]]), 1);
      c.shadeOver('turn-b', smooth([[70, 60], [75, 62], [70, 84], [72, 108], [66, 108], [64, 84]]), 1);
      slit(c, 78, 9);
    },
  });
}

/** An upturned bucket with its hoops and its handle, and one slit sawn in it. */
export function bucketHelm(d: Doc, mat: Material = WOOD, hoop: Material = IRON): void {
  under(d);
  d.line('handle', smooth([[74, 54], [97, 34], [120, 54]], false));
  d.piece('bucket', smooth([[73, 50, 'c'], [121, 50, 'c'], [131, 106, 'c'], [63, 106, 'c']]), mat, {
    shade: 6,
    inner: (c) => {
      for (const x of [78, 90, 104]) c.shadeOver('stave', roundRect(x, 46, 2.4, 64, 0), 0.9);
      c.piece('hoop-a', roundRect(56, 58, 84, 7, 0), hoop, { shade: 0 });
      c.piece('hoop-b', roundRect(56, 96, 84, 7, 0), hoop, { shade: 0 });
      slit(c, 76, 9);
    },
  });
}

/** A hollow stump for a helm: bark, a cut top with its rings, one knothole, and a twig still in leaf. */
export function stumpHelm(d: Doc, bark: Material = WOOD, leaf: Material = BUSH): void {
  under(d);
  d.piece('twig', capsule(78, 50, 70, 30, 5), bark, { shade: 0 });
  d.piece('leaf', smooth([[70, 30, 'c'], [58, 26], [50, 14, 'c'], [66, 14], [72, 24]]), leaf, { shade: 3 });
  d.piece('trunk', smooth([[69, 52, 'c'], [125, 52, 'c'], [129, 80], [126, 101], [108, 109], [86, 109], [68, 101], [65, 80]]), bark, {
    shade: 6,
    inner: (c) => {
      crease(c, 'bark-a', [76, 60], [74, 104], 3);
      crease(c, 'bark-b', [90, 62], [92, 106], 2.6);
      crease(c, 'bark-c', [126, 64], [124, 100], 2.6);
      dark(c, 'knothole', roundRect(107, 70, 10, 30, 5));
    },
  });
  d.piece('cut', ellipse(97, 52, 28, 7), BONE, {
    shade: 0,
    inner: (c) => c.line('ring', ellipse(97, 52, 15, 3.2)),
  });
}

// ---------------------------------------------------------------- hoods, pelts and wraps

/** A pelt worn as a hood: the beast's ears still on it, a ragged edge on the shoulders, and shadow in its opening. */
export function peltHood(d: Doc, fur: Material, round = false): void {
  under(d);
  const ear = (x: number, y: number): Path =>
    round ? ellipse(x, y - 4, 9, 10) : poly([[x - 9, y + 6], [x - 2, y - 20], [x + 10, y + 4]]);
  d.piece('ear-far', ear(110, 52), far(fur), { shade: 0 });
  d.piece('pelt', path()
    .M(100, 50).C(114, 51, 126, 62, 130, 80).C(132, 92, 130, 100, 126, 104)
    .L(120, 112).L(113, 104).L(105, 113).L(97, 105).L(88, 113).L(81, 104).L(72, 111).L(67, 100)
    .C(62, 88, 64, 72, 70, 62).C(78, 54, 90, 50, 100, 50).Z(), fur, {
    shade: 6,
    inner: (c) => {
      c.shadeOver('lining', smooth([[108, 60], [130, 68], [139, 90], [130, 111], [104, 111], [90, 95], [92, 72]]), 1.1);
      dark(c, 'opening', smooth([[110, 66], [126, 72], [133, 88], [126, 102], [108, 103], [96, 93], [98, 76]]));
      for (const [x, y] of [[74, 72], [82, 62], [72, 88], [84, 96]] as const) c.shadeOver('tuft', capsule(x, y, x + 2.5, y + 6, 2), 0.9);
    },
  });
  d.piece('ear', ear(84, 54), fur, { shade: 3 });
}

/** A hood worn to rags: a long torn point behind, a torn edge below, and a deep opening. */
export function raggedHood(d: Doc, mat: Material): void {
  under(d);
  d.piece('hood', path()
    .M(104, 50).C(118, 54, 128, 66, 130, 82).C(131, 94, 128, 102, 124, 106)
    .L(118, 114).L(110, 106).L(103, 115).L(95, 107).L(86, 114).L(80, 105).L(70, 108)
    .L(58, 104).L(46, 110).L(40, 100).L(52, 94).L(62, 80).C(64, 66, 74, 54, 90, 50).Z(), mat, {
    shade: 6,
    inner: (c) => {
      c.shadeOver('lining', smooth([[108, 58], [130, 68], [137, 90], [128, 112], [102, 112], [88, 96], [90, 70]]), 1.1);
      dark(c, 'opening', smooth([[110, 62], [127, 71], [132, 88], [125, 104], [106, 106], [94, 93], [96, 74]]));
      crease(c, 'fold', [72, 76], [56, 100], 3);
    },
  });
}

/** A tall cone of a hood that covers the head whole, with one slit: the hood of an order that hides who is in it. */
export function capirote(d: Doc, mat: Material): void {
  under(d);
  d.piece('hood', smooth([[97, 2, 'c'], [110, 40], [126, 78], [126, 100], [108, 109], [86, 109], [68, 100], [68, 78], [84, 40]]), mat, {
    shade: 6,
    inner: (c) => {
      slit(c, 80, 8);
      crease(c, 'fold-a', [96, 14], [90, 60], 3);
      crease(c, 'fold-b', [76, 70], [72, 102], 3);
    },
  });
}

/**
 * A hood with a plate of bone across its whole opening and one slit in the plate. The plate is wider than the
 * opening: a pale oval inside a ring of shadow was drawn first, and read as one great eye.
 */
export function maskHood(d: Doc, mat: Material, mask: Material = BONE): void {
  hood(d, mat, 6);
  d.piece('mask', smooth([[97, 62, 'c'], [134, 60, 'c'], [135, 88], [126, 104], [114, 112, 'c'], [102, 104], [95, 86]]), mask, {
    shade: 4,
    inner: (c) => {
      dark(c, 'slit', roundRect(102, 76, 40, 7.5, 3.7));
      c.shadeOver('crack', path().M(108, 60).L(111, 68).L(107, 73).L(109, 73).L(113, 68).L(110, 60).Z(), 1.4);
    },
  });
}

/** A veil over the whole head and down onto the shoulders, with a circlet round the brow and one stone on it. */
export function mournVeil(d: Doc, veil: Material, circlet: Material = GOLD, stone: Material = RUBY): void {
  under(d, 97, 112, 30, 9);
  d.piece('veil', smooth([[97, 48], [118, 56], [130, 80], [136, 106], [128, 117, 'c'], [97, 121], [66, 117, 'c'], [58, 106], [64, 80], [76, 56]]), veil, {
    shade: 6,
    inner: (c) => {
      crease(c, 'fold-a', [78, 70], [66, 114], 3.4);
      crease(c, 'fold-b', [98, 74], [96, 118], 3);
      crease(c, 'fold-c', [118, 72], [128, 114], 3.4);
      c.piece('circlet', smooth([[60, 62], [96, 58], [134, 62], [134, 70], [96, 67], [60, 71]]), circlet, { shade: 0 });
    },
  });
  d.piece('stone', poly([[112, 60], [118, 67], [112, 76], [106, 67]]), stone, { shade: 0 });
}

/** A hood with a wreath of leaves round its brow. */
export function wreathHood(d: Doc, mat: Material, leaf: Material = BUSH): void {
  hood(d, mat, 4);
  // Leaves laid one over the next, from the nape round to the brow.
  for (const [x, y, turn] of [[70, 74, -60], [78, 60, -35], [92, 52, -12], [108, 50, 12], [122, 56, 38]] as const) {
    d.piece('leaf', smooth([[-9, 0, 'c'], [0, -6], [10, 0, 'c'], [0, 6]]).rotate(turn).translate(x, y), leaf, { shade: 0 });
  }
}

/** A cap of cloth knotted behind, a scarf up to it, and shadow between. */
export function bandana(d: Doc, cap: Material, scarf: Material): void {
  under(d);
  hatFace(d, scarf);
  d.piece('tail-a', smooth([[70, 70, 'c'], [54, 66], [40, 74, 'c'], [54, 80], [68, 80, 'c']]), far(cap), { shade: 0 });
  d.piece('tail-b', smooth([[70, 76, 'c'], [56, 82], [46, 96, 'c'], [60, 92], [72, 84, 'c']]), cap, { shade: 3 });
  d.piece('cap', smooth([[64, 78, 'c'], [68, 58], [97, 47], [124, 58], [130, 78, 'c'], [98, 82]]), cap, {
    shade: 5,
    inner: (c) => c.line('fold', smooth([[68, 68], [96, 62], [126, 68]], false)),
  });
  d.piece('knot', circle(68, 76, 6), cap, { shade: 0 });
}

/** A cloth over the head that falls in a lappet to each shoulder, banded, with a band on the brow and a veil below. */
export function nemes(d: Doc, cloth: Material, band: Material = GOLD, veil: Material = LINEN): void {
  under(d);
  const face = ellipse(98, 92, 24, 17);
  d.flat('shadow-under', face, HOOD_INTERIOR);
  d.line('shadow-under-edge', face);
  d.piece('veil', smooth([[72, 96], [86, 92], [110, 92], [124, 96], [122, 104], [110, 110], [86, 110], [74, 104]]), veil, { shade: 4 });
  d.piece('cloth', smooth([[97, 44], [120, 50], [133, 68], [146, 108, 'c'], [124, 110, 'c'], [122, 86, 'c'], [72, 86, 'c'], [70, 110, 'c'], [48, 108, 'c'], [61, 68], [74, 50]]), cloth, {
    shade: 6,
    inner: (c) => {
      for (const y of [56, 66, 96, 106]) c.piece('stripe', roundRect(40, y, 114, 4, 0), band, { shade: 0 });
      c.piece('brow', roundRect(60, 76, 76, 10, 0), band, { shade: 0 });
    },
  });
  d.piece('jewel', poly([[112, 70], [118, 78], [112, 88], [106, 78]]), RUBY, { shade: 0 });
}

// ---------------------------------------------------------------- hats

/** A wide cone of straw, low over a scarf. */
export function strawCone(d: Doc, scarf: Material, hat: Material = STRAW): void {
  under(d);
  hatFace(d, scarf);
  d.piece('cone', smooth([[40, 80, 'c'], [97, 36, 'c'], [154, 80, 'c'], [96, 89]]), hat, {
    shade: 5,
    inner: (c) => {
      // Plaited from the point outward.
      for (const x of [60, 80, 114, 134]) c.shadeOver('plait', capsule(97, 40, x, 86, 1.8), 0.9);
      c.shadeOver('rim', smooth([[40, 78], [96, 86], [154, 78], [154, 82], [96, 91], [40, 82]]), 0.9);
    },
  });
}

/** A mushroom's cap for a hat, spotted, over a scarf. */
export function mushroomCap(d: Doc, cap: Material, scarf: Material = LINEN, spot: Material = BONE): void {
  under(d);
  hatFace(d, scarf, false);
  d.piece('cap', smooth([[40, 80, 'c'], [44, 54], [68, 34], [97, 29], [126, 34], [150, 54], [154, 80, 'c'], [126, 84], [96, 86], [68, 84]]), cap, {
    shade: 6,
    inner: (c) => {
      // Four spots, none level with another.
      c.piece('spot-a', ellipse(70, 50, 9, 7), spot, { shade: 0 });
      c.piece('spot-b', ellipse(100, 40, 7, 5.5), spot, { shade: 0 });
      c.piece('spot-c', ellipse(128, 56, 9, 7), spot, { shade: 0 });
      c.piece('spot-d', ellipse(94, 66, 6, 4.5), spot, { shade: 0 });
      c.shadeOver('gills', smooth([[40, 76], [96, 82], [154, 76], [154, 84], [96, 90], [40, 84]]), 1);
    },
  });
}

/** A hat with its brim turned up fore and aft into two horns, worn side on, with trim along its edge. */
export function bicorne(d: Doc, hat: Material, scarf: Material, trim: Material = GOLD): void {
  under(d);
  hatFace(d, scarf);
  d.piece('hat', smooth([[38, 78, 'c'], [52, 54], [74, 40], [97, 35], [120, 40], [142, 54], [156, 78, 'c'], [126, 74], [96, 78], [66, 74]]), hat, {
    shade: 6,
    inner: (c) => {
      c.piece('trim', smooth([[36, 72], [66, 68], [96, 72], [126, 68], [158, 72], [158, 82], [126, 78], [96, 82], [66, 78], [36, 82]]), trim, { shade: 0 });
      crease(c, 'crease', [97, 40], [97, 68], 2.8);
    },
  });
  d.piece('cockade', poly([[104, 50], [112, 58], [104, 68], [96, 58]]), trim, { shade: 0 });
}

/** A broad hat cocked up at one side, with a great feather sweeping back from its band, over a scarf. */
export function cavalierHat(d: Doc, hat: Material, feather: Material, scarf: Material, band: Material = GOLD): void {
  under(d);
  hatFace(d, scarf);
  d.piece('feather', smooth([[104, 58, 'c'], [96, 38], [74, 26], [50, 30], [34, 46], [30, 64, 'c'], [44, 52], [60, 46], [76, 48], [90, 60, 'c']]), feather, {
    shade: 4,
    inner: (c) => {
      crease(c, 'barb-a', [88, 46], [80, 56], 2.6, 0.9);
      crease(c, 'barb-b', [68, 34], [62, 48], 2.6, 0.9);
      crease(c, 'barb-c', [48, 36], [44, 52], 2.4, 0.9);
    },
  });
  d.piece('crown', smooth([[76, 72, 'c'], [78, 56], [97, 49], [116, 56], [118, 72, 'c']]), hat, {
    shade: 4,
    inner: (c) => c.piece('band', roundRect(70, 63, 54, 7, 0), band, { shade: 0 }),
  });
  d.piece('brim', smooth([[44, 80], [96, 68], [148, 62], [152, 68], [96, 82], [44, 86]]), hat, { shade: 3 });
}

/** A soft flat cap pulled to one side, with a stalk on it, over a scarf. */
export function beret(d: Doc, cap: Material, scarf: Material, band: Material = GOLD): void {
  under(d);
  hatFace(d, scarf);
  d.piece('stalk', capsule(92, 46, 90, 38, 4.5), cap, { shade: 0 });
  d.piece('cap', smooth([[52, 74, 'c'], [52, 56], [76, 44], [104, 44], [130, 54], [134, 74, 'c'], [98, 80]]), cap, {
    shade: 5,
    inner: (c) => {
      c.piece('band', smooth([[60, 72], [96, 76], [136, 70], [136, 78], [96, 84], [60, 80]]), band, { shade: 0 });
      crease(c, 'fold', [62, 60], [86, 52], 3);
    },
  });
}

/** A cook's hat: a band, and a great puff of cloth over it. */
export function toque(d: Doc, scarf: Material, mat: Material = BONE): void {
  under(d);
  hatFace(d, scarf);
  d.piece('puff', smooth([[72, 62, 'c'], [54, 50], [58, 28], [80, 24], [97, 14], [114, 24], [136, 28], [140, 50], [122, 62, 'c']]), mat, {
    shade: 5,
    inner: (c) => {
      crease(c, 'pleat-a', [80, 30], [84, 60], 2.8);
      crease(c, 'pleat-b', [98, 22], [98, 60], 2.8);
      crease(c, 'pleat-c', [116, 30], [112, 60], 2.8);
    },
  });
  d.piece('band', roundRect(68, 58, 58, 20, 4), mat, { shade: 3 });
}

/** A cap with its bill drawn out to a point in front and a long feather in its band, over a scarf. */
export function featherCap(d: Doc, cap: Material, scarf: Material, feather: Material = BONE): void {
  under(d);
  hatFace(d, scarf);
  d.piece('feather', smooth([[86, 60, 'c'], [74, 44], [56, 26], [40, 20, 'c'], [48, 38], [62, 54], [78, 66, 'c']]), feather, {
    shade: 3,
    inner: (c) => c.line('quill', smooth([[82, 62], [62, 40], [44, 24]], false)),
  });
  d.piece('cap', smooth([[60, 76, 'c'], [64, 56], [86, 45], [110, 50], [152, 74, 'c'], [122, 80], [92, 82]]), cap, {
    shade: 5,
    inner: (c) => c.shadeOver('turn', smooth([[60, 72], [92, 76], [152, 70], [152, 76], [92, 84], [60, 80]]), 1),
  });
}

/** A round hat of fur with a flap down over the ear, over a scarf. */
export function furCap(d: Doc, fur: Material, scarf: Material): void {
  under(d);
  hatFace(d, scarf);
  d.piece('flap', smooth([[62, 70, 'c'], [58, 86], [64, 102, 'c'], [76, 98], [78, 74, 'c']]), fur, { shade: 3 });
  d.piece('cap', smooth([[60, 76, 'c'], [58, 56], [76, 43], [97, 40], [118, 43], [136, 56], [134, 76, 'c'], [98, 82]]), fur, {
    shade: 6,
    inner: (c) => {
      for (const [x, y] of [[70, 56], [84, 50], [100, 48], [116, 52], [126, 62], [78, 66], [96, 64], [112, 68]] as const) {
        c.shadeOver('tuft', capsule(x, y, x + 2.5, y + 6, 2), 0.9);
      }
    },
  });
}

/** A fool's cap: two horns of cloth, one before and one behind, each with a bell at its tip, over a scarf. */
export function jesterCap(d: Doc, a: Material, b: Material, scarf: Material, bell: Material = GOLD): void {
  under(d);
  hatFace(d, scarf);
  d.piece('horn-back', smooth([[84, 74, 'c'], [70, 58], [56, 36], [38, 34, 'c'], [50, 50], [58, 68], [70, 80, 'c']]), b, { shade: 4 });
  d.piece('horn-front', smooth([[110, 74, 'c'], [124, 56], [140, 38], [158, 40, 'c'], [146, 54], [138, 70], [124, 80, 'c']]), a, { shade: 4 });
  d.piece('cap', smooth([[62, 78, 'c'], [66, 60], [97, 50], [128, 60], [132, 78, 'c'], [98, 83]]), a, {
    shade: 5,
    inner: (c) => c.piece('half', roundRect(50, 40, 47, 50, 0), b, { shade: 0 }),
  });
  d.piece('bell-back', circle(36, 34, 6), bell, { shade: 0 });
  d.piece('bell-front', circle(160, 40, 6), bell, { shade: 0 });
}

// ---------------------------------------------------------------- heads of the great

/** A closed helm with three long plumes sweeping up and back from its crown: a marshal's. */
export function plumedHelm(d: Doc, feather: Material, mat: Material = STEEL, trim: Material = GOLD): void {
  under(d);
  for (const [turn, len, name] of [[-76, 0.84, 'plume-c'], [-50, 0.96, 'plume-b'], [-24, 0.84, 'plume-a']] as const) {
    const f = (p: Path): Path => p.scale(len, 1).rotate(turn - 90, 0, 0).translate(98, 52);
    d.piece(name, f(smooth([[0, -5, 'c'], [20, -11], [44, -8], [58, 2, 'c'], [42, 6], [20, 8], [0, 5, 'c']])), feather, {
      shade: 3,
      inner: (c) => c.shadeOver('quill', f(capsule(4, 0, 50, 0, 1.6)), 1),
    });
  }
  d.piece('helm', domePath().translate(0, 2), mat, {
    shade: 6,
    inner: (c) => {
      slit(c, 79, 9);
      c.piece('brow', smooth([[60, 64], [96, 60], [134, 64], [134, 72], [96, 69], [60, 73]]), trim, { shade: 0 });
    },
  });
  d.piece('socket', roundRect(91, 46, 14, 10, 3), trim, { shade: 0 });
  d.glint('glint', capsule(78, 84, 83, 80, 4.5));
}

/** Antlers branching wide from a cowl with a veil where a face would be, and leaves at the brow. */
export function antlerCrown(d: Doc, cowlMat: Material, antler: Material = BONE, leaf: Material = BUSH, veil: Material = LINEN): void {
  under(d);
  const beam = (flip: boolean, mat: Material, shade: number): void => {
    const m = (p: Path): Path => (flip ? p.mirrorX(100) : p);
    d.piece('beam', m(capsule(82, 58, 62, 20, 7.5)), mat, { shade });
    d.piece('tine-a', m(capsule(74, 42, 52, 38, 6)), mat, { shade });
    d.piece('tine-b', m(capsule(66, 28, 46, 14, 6)), mat, { shade });
    d.piece('tine-c', m(capsule(64, 22, 72, 6, 6)), mat, { shade });
  };
  beam(true, far(antler), 0);
  d.piece('cowl', domePath(), cowlMat, {
    shade: 6,
    inner: (c) => {
      c.piece('veil', smooth([[102, 68, 'c'], [140, 68, 'c'], [140, 114, 'c'], [106, 114], [97, 96]]), veil, { shade: 4 });
    },
  });
  beam(false, antler, 2);
  for (const [x, y, turn] of [[78, 62, -30], [96, 56, 0], [114, 58, 24]] as const) {
    d.piece('leaf', smooth([[-10, 0, 'c'], [0, -7], [11, 0, 'c'], [0, 7]]).rotate(turn).translate(x, y), leaf, { shade: 0 });
  }
}

/** A tall crown, wider at its top than at the brow, with a stone in it, over a head veiled whole. */
export function tallCrown(d: Doc, veil: Material, crown: Material = GOLD, stone: Material = RUBY): void {
  under(d);
  d.piece('veil', domePath(), veil, {
    shade: 6,
    inner: (c) => {
      crease(c, 'fold-a', [80, 70], [74, 104], 3);
      crease(c, 'fold-b', [104, 72], [106, 106], 3);
      crease(c, 'fold-c', [122, 72], [124, 100], 2.6);
    },
  });
  d.piece('crown', smooth([[70, 64, 'c'], [64, 22, 'c'], [78, 30, 'c'], [88, 16, 'c'], [97, 28, 'c'], [106, 16, 'c'], [116, 30, 'c'], [130, 22, 'c'], [124, 64, 'c']]), crown, {
    shade: 5,
    inner: (c) => c.shadeOver('rim', roundRect(60, 56, 76, 3, 0), 1),
  });
  d.piece('stone', poly([[104, 36], [111, 45], [104, 56], [97, 45]]), stone, { shade: 0 });
}

/** A great disc stood behind a round helm, with rays about it: the sun, worn. */
export function sunDiscHelm(d: Doc, mat: Material = GOLD, disc: Material = GOLD): void {
  under(d);
  for (let i = 0; i < 7; i++) {
    const a = ((-170 + i * 27) * Math.PI) / 180;
    const x = 97 + Math.cos(a) * 34;
    const y = 50 + Math.sin(a) * 34;
    d.piece('ray', poly([[-4, 6], [0, -8], [4, 6]]).rotate((a * 180) / Math.PI + 90).translate(x, y), disc, { shade: 0 });
  }
  d.piece('disc', circle(97, 50, 27), disc, { shade: 5 });
  d.piece('helm', domePath().translate(0, 2), mat, {
    shade: 6,
    inner: (c) => {
      slit(c, 79, 9);
      c.line('brow', smooth([[64, 70], [96, 66], [130, 69]], false));
    },
  });
  d.glint('glint', capsule(78, 68, 83, 63, 4.5));
}

/** A mitre: a tall arch of a hat with a band up its front, over a scarf. */
export function mitre(d: Doc, cloth: Material, scarf: Material, trim: Material = GOLD): void {
  under(d);
  hatFace(d, scarf);
  d.piece('mitre', smooth([[70, 78, 'c'], [66, 48], [97, 8, 'c'], [128, 48], [124, 78, 'c'], [98, 82]]), cloth, {
    shade: 6,
    inner: (c) => {
      c.piece('band-up', roundRect(93, 0, 9, 90, 0), trim, { shade: 0 });
      c.piece('band-brow', smooth([[60, 68], [96, 72], [134, 68], [134, 78], [96, 84], [60, 78]]), trim, { shade: 0 });
    },
  });
}

/** A crown of points on a cowl, with a veil where a face would be: who rules, on the side the player is on. */
export function crownCowl(d: Doc, cloth: Material, crown: Material = GOLD, veil: Material = LINEN): void {
  under(d);
  d.piece('crown', poly([[70, 62], [68, 36], [80, 50], [88, 30], [97, 48], [106, 30], [115, 50], [126, 36], [124, 62]]), crown, { shade: 3 });
  d.piece('cowl', domePath().translate(0, 2), cloth, {
    shade: 6,
    inner: (c) => {
      c.piece('veil', smooth([[102, 68, 'c'], [140, 68, 'c'], [140, 114, 'c'], [106, 114], [97, 96]]), veil, { shade: 4 });
      c.piece('band', smooth([[60, 60], [96, 56], [134, 60], [134, 69], [96, 66], [60, 70]]), crown, { shade: 0 });
    },
  });
}

/** Mail over the whole head with one slit, and a plain band of steel round the brow. A head for the rank and file. */
export function coif(d: Doc, mail: Material = IRON, band: Material = STEEL): void {
  under(d);
  d.piece('coif', domePath(), mail, {
    shade: 6,
    inner: (c) => {
      mailRings(c, 66, 84, 92, 108, 7);
      mailRings(c, 70, 52, 124, 62, 7);
      slit(c, 77, 9);
      c.piece('band', smooth([[60, 64], [96, 60], [134, 64], [134, 72], [96, 69], [60, 73]]), band, { shade: 0 });
    },
  });
}

/** A helm with crystals grown through its crown, the tallest in the middle. */
export function crystalHelm(d: Doc, glow: Accent, mat: Material = IRON): void {
  under(d);
  for (const [x, y, w, h] of [[72, 62, 9, 22], [84, 56, 10, 34], [98, 54, 12, 46], [112, 56, 10, 32], [123, 62, 8, 20]] as const) {
    d.piece('crystal', poly([[x - w, y], [x - w * 0.3, y - h], [x + w * 0.6, y - h * 0.8], [x + w, y]]), glow, {
      shade: 3,
      inner: (c) => c.lightOver('facet', poly([[x - w, y], [x - w * 0.3, y - h], [x, y]]), 1),
    });
  }
  d.piece('helm', domePath().translate(0, 2), mat, {
    shade: 6,
    inner: (c) => {
      slit(c, 79, 9);
      c.piece('brow', smooth([[60, 62], [96, 58], [134, 62], [134, 70], [96, 67], [60, 71]]), GOLD, { shade: 0 });
    },
  });
  d.glint('glint', capsule(78, 84, 83, 80, 4.5));
}
