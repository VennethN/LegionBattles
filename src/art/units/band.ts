// The band: the companions of Legion Holdout, who fight beside a hero. Most
// are a beast of the kit made into somebody: the hound has one ear down and
// a purse for what he fetches, the bear wears a soldier's helmet, the old
// turtle carries a garden and a lamp. The shared beasts are left as they
// were, for the other games. Tam is the one person among them.

import { rivetRow, standard } from '../kit/arms';
import { bearHead, blanket, houndHead, stagHead, tailStub, tailWhip } from '../kit/beasts';
import type { Doc } from '../kit/draw';
import { ARCANE, BONE, BUSH, CACTUS, CLOTH, DIRT, FIRE, GOLD, HOLY, IRON, LEATHER, LINEN, STEEL, STONE, WOOD, type Material, type Team } from '../kit/palette';
import { FEET, NECK, arm, belt, far, kettleHelm, leg, rivet, shadow, torsoPath } from '../kit/parts';
import { Path, capsule, circle, ellipse, path, poly, roundRect, smooth } from '../kit/path';
import { bodyOf, legOf, posed, turned, type Build } from '../kit/stance';
import type { UnitArt } from '../kit/unit';
import { TURTLE_SKIN, creature, eagle, lanternWisp, quadruped, salamander } from './beasts';
import { part } from './common';
import { note } from './notes';
import { backpack } from '../kit/gear';

type Size = (p: Path) => Path;

// ---------------------------------------------------------------- Biscuit, the war hound

/** The hound's head with one ear that never stood up. */
function biscuitHead(d: Doc, s: Size, team: Team): void {
  houndHead(d, s, BONE, LEATHER, null);
  // The near ear, folded over: drawn on top of the one that stands, which is hidden under it.
  d.piece('flop', s(smooth([[128, 92, 'c'], [134, 78], [146, 82], [150, 96, 'c'], [142, 104], [134, 100]])), BONE, { shade: 3 });
  // A neckerchief, knotted at the back, its corner down over his chest.
  d.piece('kerchief', s(smooth([[114, 108, 'c'], [142, 122, 'c'], [136, 134], [126, 146, 'c'], [120, 130]])), CLOTH[team], { shade: 3 });
  d.piece('knot', s(circle(116, 108, 5)), CLOTH[team], { shade: 0 });
}

const biscuit = quadruped('biscuit', {
  set: 'Band', read: 'a pale hound with one ear up and one down, a neckerchief, and a purse strapped to his side for what he fetches',
  size: 0.86, hide: BONE, top: 90,
  tail: (d, s) => tailWhip(d, s, BONE),
  head: biscuitHead,
  on: (d, s, team) => {
    // One brown patch over his back, and the strap that holds his purse.
    d.shadeOver('patch', s(smooth([[66, 108], [84, 104], [92, 114], [82, 124], [68, 120]])), 1.5);
    d.piece('strap', s(roundRect(94, 104, 9, 44, 0)), CLOTH[team], { shade: 0 });
    d.piece('purse', s(smooth([[88, 122, 'c'], [110, 122, 'c'], [114, 140], [99, 146], [84, 140]])), LEATHER, {
      shade: 3,
      inner: (c) => c.piece('flap', s(roundRect(84, 118, 32, 9, 0)), LEATHER, { shade: 0 }),
    });
    // Its clasp is square: a round one in the middle of a dark purse was an eye.
    d.piece('clasp', s(roundRect(95, 124, 8, 9, 1.5)), GOLD, { shade: 0 });
  },
});

// ---------------------------------------------------------------- Greta, the war bear

function gretaHead(d: Doc, s: Size): void {
  bearHead(d, s, LEATHER);
  // A soldier's kettle helmet, far too small, strapped on between her ears.
  d.piece('helm-brim', s(smooth([[124, 88], [146, 80], [168, 86], [168, 91], [146, 87], [124, 94]])), STEEL, { shade: 0 });
  d.piece('helm', s(smooth([[134, 86, 'c'], [136, 72], [147, 66], [158, 72], [160, 85, 'c']])), STEEL, { shade: 3 });
}

const greta = quadruped('greta', {
  set: 'Band', read: 'a great brown bear in patched barding, a soldier\'s helmet strapped between her ears, a plate over her muzzle',
  size: 1.2, hide: LEATHER, shaggy: true, legW: 19, top: 56,
  tail: (d, s) => tailStub(d, s, LEATHER),
  head: (d, s) => gretaHead(d, s),
  on: (d, s, team) => {
    blanket(d, s, CLOTH[team], GOLD);
    // Mended more than once, by more than one hand.
    d.piece('patch-a', s(roundRect(80, 110, 13, 12, 2)), LINEN, { shade: 0 });
    d.piece('patch-b', s(roundRect(100, 122, 12, 11, 2)), DIRT, { shade: 0 });
    d.piece('plate', s(ellipse(120, 112, 11, 12)), IRON, { shade: 3, inner: (c) => rivetRow(c, 114, 112, 3, 6) });
  },
});

// ---------------------------------------------------------------- Mossback, the old siege turtle

const MOSS: Material = { fill: CACTUS.fill, shade: CACTUS.shade };
const mossback = creature('mossback', 'Band', 'an old turtle with a garden grown over his shell, a sapling and a lamp on a pole, his head in an iron cap', 50, 'bite', [176, 136], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 54, 10)),
  part('legs-far', 'legBack', 'root', [96, 160], (d) => {
    d.piece('leg-a', roundRect(74, 150, 20, 30, 8), far(TURTLE_SKIN), { shade: 0 });
    d.piece('leg-b', roundRect(116, 150, 20, 30, 8), far(TURTLE_SKIN), { shade: 0 });
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
    d.piece('leaves', smooth([[58, 74], [60, 56], [76, 46], [92, 54], [96, 70], [84, 80], [68, 82]]), BUSH, {
      shade: 4,
      inner: (c) => c.lightOver('lit', smooth([[64, 62], [76, 52], [86, 58], [76, 64]]), 0.8),
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
    // A saddle cloth of his side's, and the three mushrooms that came up through it.
    d.piece('cloth', smooth([[96, 118, 'c'], [130, 114, 'c'], [136, 142], [100, 150, 'c']]), CLOTH[team], {
      shade: 3,
      inner: (c) => c.piece('hem', roundRect(92, 140, 50, 6, 0), GOLD, { shade: 0 }),
    });
    for (const [x, y, k] of [[58, 112, 1], [68, 104, 0.8], [100, 98, 0.9]] as const) {
      d.piece('stem', roundRect(x - 2.5 * k, y - 8 * k, 5 * k, 10 * k, 2), BONE, { shade: 0 });
      d.piece('mushroom', smooth([[x - 9 * k, y - 7 * k, 'c'], [x - 6 * k, y - 15 * k], [x + 6 * k, y - 15 * k], [x + 9 * k, y - 7 * k, 'c']]), ARCANE, { shade: 0 });
    }
  }),
  part('legs-near', 'legFront', 'root', [96, 160], (d) => {
    d.piece('leg-a', roundRect(56, 152, 22, 28, 8), TURTLE_SKIN, { shade: 3 });
    d.piece('leg-b', roundRect(108, 152, 22, 28, 8), TURTLE_SKIN, { shade: 3 });
  }),
  part('head', 'weapon', 'body', [142, 140], (d) => {
    d.piece('neck', capsule(138, 143, 160, 138, 18), TURTLE_SKIN, { shade: 3 });
    d.piece('cap', smooth([[152, 126, 'c'], [166, 124], [176, 134], [174, 146, 'c'], [160, 142], [150, 138, 'c']]), IRON, {
      shade: 3,
      inner: (c) => {
        for (const [x, y] of [[157, 131], [164, 132], [170, 136]] as const) rivet(c, x, y, 1.6);
      },
    });
  }),
]);

// ---------------------------------------------------------------- Thistle, the great stag

const thistle = quadruped('thistle', {
  set: 'Band', read: 'a stag hooded in his side\'s color, antlers high, with a collar of leaves and three thistles at his throat',
  size: 1.04, hide: DIRT, legW: 11, hoof: IRON, blanket: true, top: 18,
  tail: (d, s) => tailStub(d, s, BONE),
  head: (d, s, team) => {
    stagHead(d, s, DIRT, CLOTH[team]);
    d.piece('leaves', s(smooth([[116, 112, 'c'], [128, 104], [142, 110], [148, 122, 'c'], [136, 128], [122, 126]])), BUSH, { shade: 3 });
    // One head of thistle. There were two, side by side, and they were a pair of eyes at his throat.
    d.piece('tuft', s(poly([[124, 110], [127, 96], [132, 106], [137, 96], [140, 110]])), ARCANE, { shade: 0 });
    d.piece('thistle', s(smooth([[122, 112, 'c'], [142, 112, 'c'], [140, 122], [132, 127], [124, 122]])), BUSH, { shade: 0 });
  },
});

// ---------------------------------------------------------------- Pip, Quill and Ember

const pip = lanternWisp('pip', 'Band', 'a small gold flame that goes about in a lantern with no one holding it, a bow tied on its ring and a ribbon trailing', HOLY);

note('quill', 'Band', 'beast', 'a hunting eagle hooded in her side\'s color, one wing up, a long ribbon streaming from her leg');
const quill: UnitArt = {
  ...eagle,
  id: 'quill',
  parts: [
    eagle.parts[0],
    part('streamer', 'extra', 'body', [90, 164], (d, team) => {
      d.piece('streamer', smooth([[92, 160, 'c'], [76, 158], [58, 168], [36, 162, 'c'], [44, 172], [60, 178], [78, 170], [94, 170, 'c']]), CLOTH[team], { shade: 3 });
    }, 2),
    ...eagle.parts.slice(1),
  ],
};

note('ember', 'Band', 'beast', 'a lizard low to the ground with fire standing along its back, and the camp\'s kettle set to boil on it');
const ember: UnitArt = {
  ...salamander,
  id: 'ember',
  parts: [
    ...salamander.parts.slice(0, -1),
    part('kettle', 'extra', 'body', [98, 128], (d) => {
      d.line('handle', smooth([[86, 106], [98, 90], [110, 106]], false));
      d.piece('spout', poly([[110, 110], [126, 100], [128, 106], [112, 118]]), STEEL, { shade: 0 });
      d.piece('kettle', smooth([[84, 106, 'c'], [112, 106, 'c'], [117, 118], [108, 130], [88, 130], [79, 118]]), STEEL, { shade: 4 });
      d.piece('lid', roundRect(91, 101, 14, 6, 2), STEEL, { shade: 0 });
    }, 0.6),
    salamander.parts[salamander.parts.length - 1],
  ],
};

// ---------------------------------------------------------------- Tam, the squire

const TAM: Build = { size: 0.8 };

note('tam', 'Band', 'support', 'a boy in a kettle helmet too big for him, tipped down over where his face would be, a pack on his back, the colors on a tall pole in both fists');
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
      part('head', 'head', 'body', neck, (d) => posed(d, head, (c) => kettleHelm(c))),
      part('colors', 'weapon', 'body', hand, (d, team) => {
        standard(d, { hand, angle: 3 }, CLOTH[team], 112);
        // His other fist, lower on the pole.
        d.piece('fist', circle(hand[0] + 1, hand[1] + 16, 7), LEATHER, { shade: 3 });
      }),
    ],
  };
})();

export const BAND_ART: readonly UnitArt[] = [biscuit, pip, mossback, quill, greta, ember, tam, thistle];
