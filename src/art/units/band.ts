// The band: the companions of Legion Holdout, who fight beside a hero. Most
// are a beast of the kit made into somebody with one idea, drawn big: the
// hound has one ear down and a neckerchief, the bear has a hump and patched
// barding, the old turtle carries a garden and a lamp. They are caught in
// mid stride, on bent legs. The shared beasts are left as they were, for
// the other games. Tam is the one person among them.
//
// They are looked at more closely than a beast in a crowd, and from further
// off than a hero: nothing small is on a head. Rivets on a mask, shown at
// forty pixels, were dots where a face would be, and every one is gone.

import { standard } from '../kit/arms';
import { blanket, houndHead, lizardHead, tailLizard, tailStub, tailWhip } from '../kit/beasts';
import type { Doc } from '../kit/draw';
import { ARCANE, BONE, BRONZE, BUSH, CACTUS, CLOTH, DIRT, FIRE, GOLD, HOLY, IRON, LEATHER, LINEN, STEEL, STONE, WOOD, type Material, type Team } from '../kit/palette';
import { FEET, NECK, arm, belt, crease, dark, far, leg, shadow, torsoPath, under } from '../kit/parts';
import { Path, capsule, circle, path, poly, roundRect, smooth } from '../kit/path';
import { bodyOf, legOf, posed, turned, type Build } from '../kit/stance';
import type { UnitArt } from '../kit/unit';
import { TURTLE_SKIN, creature, plain, quadruped } from './beasts';
import { part } from './common';
import { note } from './notes';
import { backpack } from '../kit/gear';

type Size = (p: Path) => Path;

// ---------------------------------------------------------------- Biscuit, the war hound

/** The hound's head with one ear that never stood up, and a neckerchief big enough to see from across a field. */
function biscuitHead(d: Doc, s: Size, team: Team): void {
  houndHead(d, s, BONE, LEATHER, null, false);
  // The near ear, folded over: drawn on top of the one that stands, which is hidden under it.
  d.piece('flop', s(smooth([[128, 92, 'c'], [134, 78], [146, 82], [150, 96, 'c'], [142, 104], [134, 100]])), BONE, { shade: 3 });
  d.piece('kerchief', s(smooth([[110, 106, 'c'], [144, 122, 'c'], [140, 138], [128, 156, 'c'], [116, 134]])), CLOTH[team], { shade: 4 });
  d.piece('knot', s(circle(113, 106, 6)), CLOTH[team], { shade: 0 });
}

const biscuit = quadruped('biscuit', {
  set: 'Band', read: 'a pale hound in mid stride, one ear up and one down, a big neckerchief in his side\'s color',
  size: 0.9, hide: BONE, top: 86,
  gait: [[9, 5], [-8, -3], [-10, 6], [10, -3]],
  tail: (d, s) => tailWhip(d, s, BONE),
  head: biscuitHead,
  // One brown patch over his back.
  on: (d, s) => d.shadeOver('patch', s(smooth([[66, 108], [84, 104], [92, 114], [82, 124], [68, 120]])), 1.5),
});

// ---------------------------------------------------------------- Greta, the war bear

/**
 * A bear's head, big, with two round ears standing on the top of it, which
 * is what says bear from a long way off. The guard over her muzzle is one
 * plain plate: three slits in it were teeth.
 */
function gretaHead(d: Doc, s0: Size): void {
  const s: Size = (p) => s0(p.scale(1.2, 1.2, 128, 118));
  d.piece('ear-far', s(circle(154, 80, 9)), far(LEATHER), { shade: 0 });
  d.piece('neck', s(capsule(120, 124, 138, 108, 32)), LEATHER, { shade: 3 });
  d.piece('head', s(smooth([[124, 100], [132, 84], [150, 78], [168, 88], [177, 104, 'c'], [178, 116, 'c'], [162, 126], [138, 125], [125, 114]])), LEATHER, { shade: 5 });
  d.piece('muzzle', s(smooth([[154, 100, 'c'], [171, 99], [181, 114, 'c'], [164, 127], [152, 121]])), IRON, { shade: 3 });
  d.piece('ear', s(circle(136, 82, 10)), LEATHER, { shade: 3 });
}

const greta = quadruped('greta', {
  set: 'Band', read: 'a great brown bear, a hump over her shoulders, two round ears, short thick legs, barding patched by more than one hand',
  size: 1.16, hide: LEATHER, shaggy: true, legW: 23, legTop: 146, top: 60,
  gait: [[7, 4], [-6, -2], [-8, 5], [8, -3]],
  tail: (d, s) => tailStub(d, s, LEATHER),
  head: (d, s) => gretaHead(d, s),
  on: (d, s, team) => {
    blanket(d, s, CLOTH[team], GOLD);
    d.piece('patch-a', s(roundRect(80, 110, 14, 13, 2)), LINEN, { shade: 0 });
    d.piece('patch-b', s(roundRect(98, 123, 13, 12, 2)), DIRT, { shade: 0 });
    // The hump: a bear's shoulders stand higher than its back.
    d.piece('hump', s(smooth([[104, 108], [112, 92], [128, 88], [140, 100], [138, 116], [118, 120]])), LEATHER, { shade: 5 });
  },
});

// ---------------------------------------------------------------- Mossback, the old siege turtle

const MOSS: Material = { fill: CACTUS.fill, shade: CACTUS.shade };
const mossback = creature('mossback', 'Band', 'an old turtle with a garden grown over his shell, a sapling and a lamp on a pole, his head in a plain iron cap', 50, 'bite', [176, 136], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 54, 10)),
  part('legs-far', 'legBack', 'root', [96, 160], (d) => {
    d.piece('leg-a', roundRect(78, 150, 20, 30, 8), far(TURTLE_SKIN), { shade: 0 });
    d.piece('leg-b', roundRect(112, 150, 20, 30, 8), far(TURTLE_SKIN), { shade: 0 });
  }),
  part('lamp', 'extra', 'body', [118, 104], (d) => {
    // A lamp hung out ahead of him on a bent pole: he is slow, and likes to see where he is going.
    d.piece('pole', smooth([[114, 106, 'c'], [116, 76], [128, 60], [146, 60, 'c'], [146, 66, 'c'], [130, 66], [122, 80], [120, 106, 'c']]), WOOD, { shade: 0 });
    d.line('ring', path().M(144, 64).L(144, 72));
    d.flat('halo', circle(144, 84, 17), FIRE.light, 0.4);
    d.piece('cage', roundRect(136, 72, 16, 22, 3), IRON, {
      shade: 0,
      inner: (c) => {
        c.flat('pane', roundRect(139, 75, 10, 16, 2), FIRE.light);
        c.piece('rail', roundRect(136, 81.5, 16, 3, 0), IRON, { shade: 0, outline: false });
      },
    });
    d.piece('cap', poly([[133, 73], [144, 66], [155, 73]]), IRON, { shade: 0 });
  }, 1.4),
  part('sapling', 'extra', 'body', [78, 104], (d) => {
    d.piece('trunk', smooth([[75, 106, 'c'], [76, 86], [72, 72, 'c'], [78, 72, 'c'], [82, 86], [81, 106, 'c']]), WOOD, { shade: 0 });
    d.piece('leaves', smooth([[56, 74], [58, 54], [76, 42], [94, 52], [98, 70], [84, 82], [66, 84]]), BUSH, {
      shade: 4,
      inner: (c) => c.lightOver('lit', smooth([[62, 60], [76, 48], [88, 56], [76, 64]]), 0.8),
    });
  }, 1),
  part('body', 'body', 'root', FEET, (d, team) => {
    const shell = smooth([[40, 152], [48, 118], [78, 100], [116, 100], [144, 120], [152, 152], [96, 164]]);
    d.piece('shell', shell, STONE, {
      shade: 6,
      inner: (c) => {
        c.line('plate-a', poly([[80, 104], [70, 126], [84, 146], [108, 146], [122, 126], [112, 104]], false));
        c.line('plate-b', path().M(70, 126).L(46, 132));
        c.line('plate-c', path().M(122, 126).L(148, 132));
        c.shadeOver('lip', smooth([[40, 146], [96, 158], [152, 146], [152, 154], [96, 166], [40, 154]]), 0.9);
        // Moss, over the top of him and down one side.
        c.piece('moss', smooth([[44, 124, 'c'], [60, 104], [84, 92], [112, 94], [128, 104, 'c'], [116, 112], [104, 106], [92, 118], [78, 112], [66, 128], [54, 124], [48, 136, 'c']]), MOSS, { shade: 3 });
      },
    });
    // A saddle cloth of his side's, and the one mushroom that came up beside it.
    d.piece('cloth', smooth([[94, 116, 'c'], [132, 112, 'c'], [138, 142], [98, 150, 'c']]), CLOTH[team], {
      shade: 3,
      inner: (c) => c.piece('hem', roundRect(90, 140, 54, 6, 0), GOLD, { shade: 0 }),
    });
    d.piece('stem', roundRect(56, 100, 6, 12, 2), BONE, { shade: 0 });
    d.piece('mushroom', smooth([[48, 104, 'c'], [51, 92], [67, 92], [70, 104, 'c']]), ARCANE, { shade: 0 });
  }),
  part('legs-near', 'legFront', 'root', [96, 160], (d) => {
    d.piece('leg-a', roundRect(52, 152, 22, 28, 8), TURTLE_SKIN, { shade: 3 });
    d.piece('leg-b', roundRect(114, 152, 22, 28, 8), TURTLE_SKIN, { shade: 3 });
  }),
  part('head', 'weapon', 'body', [142, 140], (d) => {
    d.piece('neck', capsule(138, 143, 160, 138, 18), TURTLE_SKIN, { shade: 3 });
    // The cap is bare. It had two rivets, side by side: of everything drawn for the band, the plainest pair of eyes.
    d.piece('cap', smooth([[152, 126, 'c'], [166, 124], [176, 134], [174, 146, 'c'], [160, 142], [150, 138, 'c']]), IRON, { shade: 3 });
  }),
]);

// ---------------------------------------------------------------- Thistle, the great stag

/** A stag's bare head, held low, with the antlers forward: he is about to run at something. It has no features at all. */
function thistleHead(d: Doc, s: Size): void {
  const LIMBS: readonly [number, number, number, number, number][] = [
    [148, 104, 172, 74, 8],
    [160, 90, 186, 88, 7],
    [168, 78, 190, 62, 7],
    [166, 80, 160, 50, 7],
  ];
  const antlers = (dx: number, dy: number, mat: Material): void => {
    const m = (p: Path): Path => s(p.translate(dx, dy));
    for (const [x1, y1, x2, y2, w] of LIMBS) d.piece('antler', m(capsule(x1, y1, x2, y2, w)), mat, { shade: 0 });
    for (const [x1, y1, x2, y2, w] of LIMBS) d.flat('antler-fill', m(capsule(x1, y1, x2, y2, w - 3.4)), mat.fill);
  };
  antlers(-12, 4, far(BONE));
  d.piece('neck', s(capsule(122, 120, 148, 114, 20)), DIRT, { shade: 3 });
  d.piece('ear', s(smooth([[142, 104, 'c'], [128, 100], [120, 90, 'c'], [134, 90], [146, 98]])), DIRT, { shade: 0 });
  d.piece('head', s(smooth([[138, 108], [150, 100], [166, 104], [182, 116, 'c'], [180, 126, 'c'], [160, 130], [142, 126]])), DIRT, { shade: 4 });
  antlers(0, 0, BONE);
  // A collar of leaves, and one head of thistle. There were two, side by side, and they were a pair of eyes at his throat.
  d.piece('leaves', s(smooth([[112, 116, 'c'], [124, 108], [136, 114], [140, 128, 'c'], [128, 134], [116, 130]])), BUSH, { shade: 3 });
  d.piece('tuft', s(poly([[118, 126], [121, 112], [126, 122], [131, 112], [134, 126]])), ARCANE, { shade: 0 });
}

const thistle = quadruped('thistle', {
  set: 'Band', read: 'a stag in mid stride, a cloth of his side\'s color over his back, his bare head held low and his antlers forward, a thistle at his throat',
  size: 1.04, hide: DIRT, legW: 11, hoof: IRON, blanket: true, top: 44,
  gait: [[10, 5], [-9, -3], [-12, 6], [12, -3]],
  tail: (d, s) => tailStub(d, s, BONE),
  head: (d, s) => thistleHead(d, s),
});

// ---------------------------------------------------------------- Ember, the salamander

const SKIN = plain(IRON);
const ember = quadruped('ember', {
  set: 'Band', read: 'a lizard low to the ground with fire standing along its back, and the camp\'s kettle set to boil on it',
  size: 1, hide: SKIN, low: 22, legTop: 156, legW: 13, top: 96,
  gait: [[7, 3], [-6, -2], [-8, 3], [8, -2]],
  tail: (d, s) => tailLizard(d, s, SKIN),
  head: (d, s) => lizardHead(d, s, SKIN, BRONZE, FIRE, false),
  on: (d, s, team) => {
    d.piece('saddle', s(smooth([[84, 126, 'c'], [112, 126, 'c'], [114, 146], [98, 152], [82, 146]])), CLOTH[team], { shade: 3 });
    for (const [x, h] of [[72, 14], [86, 20], [100, 24], [114, 18]] as const) {
      d.flat('glow', s(circle(x, 124 - h * 0.4, 9)), FIRE.light, 0.4);
      d.piece('flame', s(smooth([[x - 6, 128, 'c'], [x - 7, 118], [x, 126 - h - 8, 'c'], [x + 7, 118], [x + 6, 128, 'c']])), FIRE, { shade: 0 });
    }
    d.line('handle', smooth([[86, 106], [98, 90], [110, 106]], false));
    d.piece('spout', poly([[110, 110], [126, 100], [128, 106], [112, 118]]), STEEL, { shade: 0 });
    d.piece('kettle', smooth([[84, 106, 'c'], [112, 106, 'c'], [117, 118], [108, 130], [88, 130], [79, 118]]), STEEL, { shade: 4 });
    d.piece('lid', roundRect(91, 101, 14, 6, 2), STEEL, { shade: 0 });
  },
});

// ---------------------------------------------------------------- Pip, the wisp

/**
 * A gold flame in a lantern that goes about with no one holding it. The
 * kit's wisp has bars across its flame and a spark beside it; shown small,
 * the bars made a birdcage of it and the spark, a dark star in a pale ring,
 * was an eye. Pip has one flame in an open frame and nothing beside it.
 */
const pip = creature('pip', 'Band', 'a small gold flame in an open lantern that goes about with no one holding it, a bow tied on its ring and a ribbon trailing', 62, 'cast', [124, 112], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 24, 6)),
  part('ribbon', 'extra', 'body', [92, 150], (d, team) => {
    d.piece('ribbon', smooth([[86, 148, 'c'], [80, 160], [64, 164], [46, 182, 'c'], [74, 180], [98, 168], [106, 150, 'c']]), CLOTH[team], { shade: 3 });
  }, 1.6),
  part('bow', 'extra', 'body', [96, 70], (d, team) => {
    d.piece('tail', poly([[96, 68], [68, 56], [76, 68], [66, 80]]), CLOTH[team], { shade: 0 });
    d.piece('tail-b', poly([[96, 68], [126, 54], [118, 68], [128, 82]]), CLOTH[team], { shade: 3 });
  }, 1),
  part('body', 'body', 'root', FEET, (d) => {
    d.line('chain', path().M(96, 62).L(96, 80));
    d.flat('halo', circle(96, 116, 42), HOLY.light, 0.4);
    d.piece('cage', roundRect(70, 88, 52, 64, 7), IRON, {
      shade: 4,
      inner: (c) => {
        c.flat('pane', roundRect(79, 96, 34, 48, 4), HOLY.shade);
        c.piece('flame', smooth([[96, 98, 'c'], [109, 116], [110, 130], [103, 142, 'c'], [89, 142, 'c'], [82, 130], [84, 116]]), HOLY, { shade: 0, outline: false });
        c.flat('heart', smooth([[96, 114, 'c'], [102, 126], [101, 138], [91, 138], [90, 126]]), HOLY.light);
      },
    });
    d.piece('cap', poly([[66, 90], [96, 70], [126, 90]]), IRON, { shade: 3 });
    d.piece('foot', roundRect(76, 150, 40, 7, 3), IRON, { shade: 0 });
  }),
]);

// ---------------------------------------------------------------- Quill, the eagle

/** One wing thrown up and back, its feathers open. `far` is the wing on the other side, further back. */
function sweptWing(d: Doc, isFar: boolean): void {
  if (isFar) {
    d.piece('wing', smooth([[102, 104, 'c'], [84, 78], [58, 50], [30, 36, 'c'], [42, 56, 'c'], [30, 62, 'c'], [48, 76, 'c'], [40, 84, 'c'], [66, 96], [88, 112, 'c']]), far(STONE), { shade: 0 });
    return;
  }
  d.piece('wing', smooth([[112, 100, 'c'], [106, 70], [92, 38], [74, 10, 'c'], [76, 36, 'c'], [62, 36, 'c'], [72, 56, 'c'], [60, 60, 'c'], [78, 84], [92, 108, 'c']]), STONE, {
    shade: 5,
    inner: (c) => {
      crease(c, 'feather-a', [100, 92], [80, 34], 3, 0.9);
      crease(c, 'feather-b', [92, 96], [70, 52], 3, 0.9);
    },
  });
}

function talon(d: Doc, x: number, y: number, isFar: boolean): void {
  const mat = isFar ? far(GOLD) : plain(GOLD);
  d.piece('leg', capsule(x, y, x + 16, y + 16, 8), mat, { shade: 0 });
  // Three claws, open, reaching for what is under her.
  d.piece('claws', poly([[x + 12, y + 12], [x + 30, y + 12], [x + 24, y + 18], [x + 32, y + 24], [x + 22, y + 24], [x + 24, y + 34], [x + 14, y + 26], [x + 10, y + 20]]), mat, { shade: 0 });
}

note('quill', 'Band', 'beast', 'an eagle in her stoop: wings thrown up and back in a V, talons out in front, hooded in her side\'s color, a ribbon streaming from her leg');
const quill: UnitArt = {
  id: 'quill',
  style: 'stoop',
  muzzle: [166, 124],
  top: 12,
  parts: [
    part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 28, 6)),
    part('wing-far', 'extra', 'body', [98, 104], (d) => sweptWing(d, true), 1.4),
    part('tail', 'extra', 'body', [84, 116], (d) => {
      d.piece('tail', poly([[90, 106], [56, 108], [44, 118], [58, 120], [48, 130], [64, 128], [60, 140], [80, 130], [94, 120]]), STONE, { shade: 3 });
    }, 0.8),
    part('streamer', 'extra', 'body', [116, 128], (d, team) => {
      d.piece('streamer', smooth([[120, 124, 'c'], [102, 134], [80, 150], [52, 150, 'c'], [64, 160], [86, 162], [106, 148], [122, 134, 'c']]), CLOTH[team], { shade: 3 });
    }, 2.2),
    part('talon-far', 'legBack', 'root', [118, 122], (d) => talon(d, 122, 120, true)),
    part('body', 'body', 'root', FEET, (d) => {
      d.piece('body', smooth([[78, 114], [88, 96], [110, 90], [130, 96], [140, 110], [130, 126], [106, 132], [86, 128]]), STONE, {
        shade: 5,
        inner: (c) => c.piece('breast', smooth([[104, 116, 'c'], [146, 108, 'c'], [134, 132], [108, 138]]), BONE, { shade: 0 }),
      });
    }),
    part('talon-near', 'legFront', 'root', [112, 126], (d) => talon(d, 114, 124, false)),
    part('wing', 'extra', 'body', [106, 102], (d) => sweptWing(d, false), 1.2),
    part('head', 'weapon', 'body', [128, 104], (d, team) => {
      d.piece('neck', capsule(126, 106, 144, 110, 17), STONE, { shade: 3 });
      d.piece('beak', smooth([[158, 106, 'c'], [171, 108], [174, 121, 'c'], [164, 116], [157, 116, 'c']]), GOLD, { shade: 0 });
      d.piece('hood', smooth([[136, 102, 'c'], [146, 95], [158, 100], [161, 114, 'c'], [148, 121], [136, 116]]), CLOTH[team], { shade: 4 });
      d.piece('plume', smooth([[146, 96, 'c'], [142, 84], [134, 78, 'c'], [146, 80], [152, 96, 'c']]), GOLD, { shade: 0 });
    }),
  ],
};

// ---------------------------------------------------------------- Tam, the squire

const TAM: Build = { size: 0.8 };

/**
 * A grown man's kettle hat on a boy. Under it is a plain hanging of iron
 * with the one slit: the kit's kettle hat has mail there, and mail drawn
 * small, in arcs, on a boy, was a bare chin with stubble on it.
 */
function tamHelm(d: Doc): void {
  under(d);
  d.piece('hanging', smooth([[72, 74], [96, 70], [122, 74], [128, 92], [121, 106], [98, 110], [76, 106], [68, 92]]), IRON, {
    shade: 5,
    inner: (c) => {
      c.shadeOver('seam', roundRect(84, 76, 2.6, 34, 1), 0.9);
      dark(c, 'slit', roundRect(94, 80, 44, 9, 4.5));
    },
  });
  d.piece('dome', smooth([[75, 74, 'c'], [77, 56], [97, 46], [117, 56], [119, 74, 'c']]), STEEL, {
    shade: 4,
    inner: (c) => c.shadeOver('crown-seam', roundRect(96, 44, 2.6, 32, 1), 0.9),
  });
  d.piece('brim', smooth([[50, 75], [96, 67], [144, 75], [145, 82], [96, 86], [49, 82]]), STEEL, { shade: 3 });
  d.glint('glint', capsule(85, 59, 90, 55, 4.5));
}

note('tam', 'Band', 'support', 'a boy in a kettle hat too big for him, tipped down over where his face would be, a pack on his back, the colors on a tall pole in both fists');
const tam: UnitArt = (() => {
  const body = bodyOf(TAM);
  const neck = turned(body, NECK);
  // The helmet is a grown man's: it is not made smaller with the boy, and it has slid forward.
  const head = (p: Path): Path => p.rotate(9, NECK[0], NECK[1]).translate(neck[0] - NECK[0] + 2, neck[1] - NECK[1] + 5);
  const hand: [number, number] = [132, 142];
  const tb = legOf(TAM, 85, -2, 3);
  const tf = legOf(TAM, 104, 2, -3);
  return {
    id: 'tam',
    style: 'cast',
    muzzle: [140, 40],
    top: 20,
    parts: [
      part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 30)),
      part('pack', 'extra', 'body', turned(body, [62, 120]), (d) => posed(d, body, (c) => backpack(c)), 0.6),
      part('leg-back', 'legBack', 'root', turned(tb, [83, 152]), (d) => posed(d, tb, (c) => leg(c, 85, LEATHER, true))),
      part('leg-front', 'legFront', 'root', turned(tf, [106, 152]), (d) => posed(d, tf, (c) => leg(c, 104, LEATHER))),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('tunic', torsoPath(), CLOTH[team], { inner: (i) => belt(i, { y: 140 }) });
        });
        arm(d, 'arm', turned(body, [114, 118]), [hand[0] - 2, hand[1] - 2], CLOTH[team], 13);
      }),
      part('head', 'head', 'body', neck, (d) => posed(d, head, (c) => tamHelm(c))),
      part('colors', 'weapon', 'body', hand, (d, team) => {
        standard(d, { hand, angle: 3 }, CLOTH[team], 112);
        // His other fist, lower on the pole.
        d.piece('fist', circle(hand[0] + 1, hand[1] + 16, 7), LEATHER, { shade: 3 });
      }),
    ],
  };
})();

export const BAND_ART: readonly UnitArt[] = [biscuit, pip, mossback, quill, greta, ember, tam, thistle];
