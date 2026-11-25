// The made things that fight: three more golems, and the engines.
//
// An engine is not a soldier. Its wheels are its legs, so they turn over as
// it goes, and whatever it strikes with (an arm, a barrel, a log, a drill) is
// its weapon, so the rig throws that and nothing else. Each carries cloth of
// its side: a pennant, a drape, a cover.

import type { Doc } from '../kit/draw';
import { ARCANE, BONE, BRONZE, BUSH, CLOTH, FIRE, GOLD, HOOD_INTERIOR, IRON, LEATHER, LINEN, PINE, STEEL, STONE, VENOM, WOOD, type Material } from '../kit/palette';
import { FEET, far, rivet, shadow, wheel } from '../kit/parts';
import { Path, capsule, circle, path, poly, roundRect, smooth, star, type Pt } from '../kit/path';
import type { AttackStyle, PartSpec, UnitArt } from '../kit/unit';
import { part } from './common';
import { golem } from './golems';
import { note } from './notes';
import { planks } from './structures';

const plain = (m: Material): Material => ({ fill: m.fill, shade: m.shade });

// ---------------------------------------------------------------- golems

note('slaggolem', 'Emberforged', 'boss', 'a golem of dark iron under a crust of bronze, a fire sign in its chest, two stacks burning on its back');
const slaggolem = golem('slaggolem', { rock: plain(IRON), cap: BRONZE, rune: FIRE, spikes: false }, 30, [
  part('stacks', 'extra', 'body', [96, 96], (d) => {
    for (const [x, top] of [[66, 44], [122, 58]] as const) {
      d.flat('glow', circle(x, top - 8, 14), FIRE.light, 0.4);
      d.piece('flame', smooth([[x - 7, top + 2, 'c'], [x - 8, top - 8], [x, top - 22, 'c'], [x + 8, top - 8], [x + 7, top + 2, 'c']]), FIRE, { shade: 0 });
      d.piece('stack', roundRect(x - 8, top, 16, 100 - top, 3), far(IRON), { shade: 0 });
      d.piece('lip', roundRect(x - 11, top - 2, 22, 8, 3), plain(IRON), { shade: 0 });
    }
  }, 0.2),
]);

note('treant', 'Wildwood', 'boss', 'a golem of bark with a crown of leaves as wide as its shoulders and a green sign in its chest');
const treant = golem('treant', { rock: WOOD, cap: BUSH, rune: VENOM, spikes: false }, 16, [
  part('boughs', 'extra', 'body', [96, 92], (d) => {
    d.piece('bough-a', capsule(74, 92, 50, 52, 9), far(WOOD), { shade: 0 });
    d.piece('bough-b', capsule(120, 92, 146, 58, 9), far(WOOD), { shade: 0 });
  }, 0.3),
], [
  part('crown', 'extra', 'body', [98, 70], (d) => {
    d.piece('leaves', smooth([[40, 58], [44, 34], [66, 26], [80, 12], [106, 10], [124, 22], [146, 28], [156, 50], [144, 68], [118, 62], [98, 70], [76, 62], [54, 70]]), BUSH, {
      shade: 6,
      inner: (c) => {
        c.lightOver('clump-a', smooth([[60, 36], [78, 24], [92, 30], [84, 44], [66, 46]]), 0.9);
        c.lightOver('clump-b', smooth([[108, 22], [128, 30], [136, 44], [118, 46], [106, 36]]), 0.9);
        c.shadeOver('under', smooth([[40, 58], [54, 70], [76, 62], [98, 70], [118, 62], [144, 68], [156, 50], [140, 56], [118, 52], [98, 60], [76, 52], [54, 60]]), 0.9);
      },
    });
    d.piece('sprig', smooth([[92, 14, 'c'], [88, 2], [98, -8, 'c'], [106, 2], [102, 14, 'c']]), PINE, { shade: 0 });
  }, 0.35),
]);

note('automaton', 'Artificers', 'boss', 'a golem of bronze plate capped with gold, a violet sign in its chest, a great key turning in its back');
const automaton = golem('automaton', { rock: plain(BRONZE), cap: GOLD, rune: ARCANE, spikes: false }, 44, [
  part('key', 'extra', 'body', [56, 112], (d) => {
    d.piece('stem', roundRect(26, 108, 34, 8, 3), STEEL, { shade: 0 });
    // The grip is two solid wings: a key with holes in its wings has two dark rings side by side.
    d.piece('wing-a', smooth([[32, 110, 'c'], [18, 104], [12, 88], [24, 80], [36, 90, 'c']]), STEEL, { shade: 3 });
    d.piece('wing-b', smooth([[32, 114, 'c'], [18, 120], [12, 136], [24, 144], [36, 134, 'c']]), STEEL, { shade: 3 });
  }, 0.9),
], [
  part('valve', 'extra', 'body', [124, 88], (d) => {
    d.piece('pipe', roundRect(118, 68, 10, 24, 3), IRON, { shade: 0 });
    d.piece('cap', roundRect(114, 62, 18, 8, 3), GOLD, { shade: 0 });
    d.flat('steam-a', circle(128, 50, 8), LINEN.fill, 0.6);
    d.flat('steam-b', circle(138, 38, 6), LINEN.fill, 0.45);
  }, 0.2),
]);

// ---------------------------------------------------------------- engines

function engine(id: string, set: string, read: string, top: number, style: AttackStyle, muzzle: Pt, parts: PartSpec[]): UnitArt {
  note(id, set, 'engine', read);
  return { id, style, muzzle, top, parts };
}

/** A pennant on a pole at an engine's back, its foot at (x, y). */
function pennant(x: number, y: number, tall = 62): PartSpec {
  return part('pennant', 'extra', 'body', [x, y], (d, team) => {
    d.piece('pole', roundRect(x - 3, y - tall, 6, tall, 3), WOOD, { shade: 0 });
    d.piece('flag', poly([[x + 2, y - tall + 2], [x - 26, y - tall + 8], [x - 16, y - tall + 16], [x - 26, y - tall + 26], [x + 2, y - tall + 28]]), CLOTH[team], { shade: 3 });
  }, 0.5);
}

/** Cloth of its side hung over an engine's bed, with a cut hem. */
function drape(d: Doc, x: number, y: number, w: number, h: number, cloth: Material): void {
  const q = w / 4;
  d.piece('drape', poly([[x, y], [x + w, y], [x + w, y + h], [x + q * 3, y + h - 7], [x + q * 2, y + h + 2], [x + q, y + h - 7], [x, y + h]]), cloth, { shade: 3 });
}

const wheels = (back: number, front: number, y: number, r: number): PartSpec[] => [
  part('wheel-back', 'legBack', 'root', [back, y], (d) => wheel(d, back, y, r, true)),
  part('wheel-front', 'legFront', 'root', [front, y], (d) => wheel(d, front, y, r)),
];

const catapult = (() => {
  const [wb, wf] = wheels(70, 124, 163, 17);
  return engine('catapult', 'Crownlands', 'a cart with a throwing arm laid back, a stone in its cup, a padded bar to stop it', 60, 'lob', [150, 70], [
    part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 50, 9)),
    pennant(52, 142, 58),
    wb,
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('post-far', poly([[112, 142], [104, 92], [112, 90], [122, 142]]), far(WOOD), { shade: 0 });
      d.piece('bed', roundRect(46, 138, 102, 18, 6), WOOD, { shade: 4 });
      drape(d, 58, 140, 36, 20, CLOTH[team]);
      d.piece('post', poly([[100, 142], [108, 92], [116, 90], [112, 142]]), WOOD, { shade: 3 });
      d.piece('stop', roundRect(98, 84, 30, 11, 5), LEATHER, { shade: 3 });
    }),
    wf,
    part('arm', 'weapon', 'body', [100, 138], (d) => {
      d.piece('arm', capsule(100, 138, 62, 84, 9), WOOD, { shade: 3 });
      d.piece('stone', circle(54, 68, 11), STONE, { shade: 4 });
      d.piece('cup', smooth([[40, 74, 'c'], [44, 88], [60, 92], [70, 82, 'c'], [58, 80], [50, 76]]), IRON, { shade: 0 });
      d.piece('axle', circle(100, 138, 6), IRON, { shade: 0 });
    }),
  ]);
})();

const trebuchet = engine('trebuchet', 'Crownlands', 'a tall frame with a long beam across it, a box of stone on the short end and a sling on the long', 24, 'lob', [150, 40], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 56, 9)),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('leg-far', poly([[112, 176], [98, 80], [106, 80], [124, 176]]), far(WOOD), { shade: 0 });
    d.piece('sill', roundRect(40, 170, 112, 10, 4), WOOD, { shade: 3 });
    d.piece('leg', poly([[66, 176], [88, 80], [96, 80], [78, 176]]), WOOD, { shade: 3 });
    d.piece('rail', roundRect(70, 134, 48, 7, 3), WOOD, { shade: 0 });
    d.piece('cloth', poly([[78, 138], [110, 138], [110, 164], [102, 157], [94, 166], [86, 157], [78, 164]]), CLOTH[team], { shade: 3 });
  }),
  part('beam', 'weapon', 'body', [96, 82], (d) => {
    d.line('sling', path().M(42, 34).L(34, 62).L(48, 68));
    d.piece('shot', circle(42, 70, 9), STONE, { shade: 3 });
    d.piece('beam', capsule(124, 104, 42, 34, 9), WOOD, { shade: 3 });
    d.piece('weight', roundRect(110, 100, 32, 30, 5), STONE, {
      shade: 5,
      inner: (c) => c.piece('band', roundRect(104, 111, 44, 7, 0), IRON, { shade: 0 }),
    });
    d.piece('axle', circle(96, 82, 7), IRON, { shade: 0 });
  }),
]);

const cannon = engine('cannon', 'Tidewatch', 'a bronze gun on a carriage with one great wheel, its trail on the ground behind', 82, 'shoot', [156, 118], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 50, 9)),
  pennant(46, 172, 86),
  part('wheel-back', 'legBack', 'root', [100, 158], (d) => wheel(d, 100, 156, 21, true)),
  part('body', 'body', 'root', FEET, (d) => {
    d.piece('trail', poly([[96, 146], [48, 170], [40, 180], [56, 180], [104, 158]]), WOOD, { shade: 3 });
    d.piece('cheek', poly([[72, 150], [78, 134], [118, 132], [122, 150]]), WOOD, { shade: 3 });
  }),
  part('barrel', 'weapon', 'body', [96, 136], (d) => {
    const t = (p: Path): Path => p.rotate(-12, 96, 136);
    d.piece('knob', t(circle(60, 134, 6)), BRONZE, { shade: 0 });
    d.piece('tube', t(poly([[64, 122], [150, 126], [150, 142], [64, 146]])), BRONZE, {
      shade: 4,
      inner: (c) => {
        for (const x of [78, 104, 128]) c.shadeOver('ring', t(roundRect(x, 120, 5, 28, 0)), 1.1);
      },
    });
    d.piece('mouth', t(roundRect(146, 122, 10, 24, 3)), BRONZE, { shade: 0 });
  }),
  part('wheel-front', 'legFront', 'root', [92, 158], (d) => wheel(d, 92, 158, 22)),
]);

const mortar = (() => {
  const [wb, wf] = wheels(70, 122, 168, 12);
  return engine('mortar', 'Artificers', 'a short fat gun pointed at the sky on a low bed, a drape on its side', 92, 'shoot', [140, 96], [
    part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 44, 8)),
    pennant(56, 162, 56),
    wb,
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('bed', roundRect(54, 152, 86, 16, 5), WOOD, { shade: 4 });
      drape(d, 62, 154, 30, 18, CLOTH[team]);
      d.piece('cradle', smooth([[84, 156, 'c'], [86, 142], [112, 142], [114, 156, 'c']]), IRON, { shade: 0 });
    }),
    wf,
    part('gun', 'weapon', 'body', [98, 152], (d) => {
      const t = (p: Path): Path => p.rotate(36, 98, 152);
      d.piece('tube', t(path().M(80, 154).L(82, 112).L(114, 112).L(116, 154).Q(98, 166, 80, 154).Z()), plain(IRON), {
        shade: 5,
        inner: (c) => c.shadeOver('ring', t(roundRect(78, 130, 40, 5, 0)), 1.1),
      });
      d.piece('mouth', t(roundRect(77, 104, 42, 11, 4)), BRONZE, { shade: 0 });
    }),
  ]);
})();

const batteringram = (() => {
  const [wb, wf] = wheels(66, 126, 166, 14);
  return engine('batteringram', 'Crownlands', 'a log with an iron head slung under a roof on wheels', 72, 'ram', [172, 136], [
    part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 54, 9)),
    wb,
    part('frame', 'body', 'root', FEET, (d, team) => {
      d.piece('post-a', roundRect(56, 104, 8, 54, 3), WOOD, { shade: 0 });
      d.piece('post-b', roundRect(128, 104, 8, 54, 3), WOOD, { shade: 0 });
      d.piece('bed', roundRect(48, 152, 96, 10, 4), WOOD, { shade: 3 });
      d.line('rope-a', path().M(76, 104).L(76, 130));
      d.line('rope-b', path().M(116, 104).L(116, 130));
      d.piece('roof', poly([[42, 108], [96, 76], [150, 108]]), CLOTH[team], {
        shade: 6,
        inner: (c) => c.shadeOver('eave', roundRect(38, 101, 116, 7, 0), 0.9),
      });
    }),
    wf,
    part('log', 'weapon', 'body', [96, 136], (d) => {
      d.piece('log', roundRect(34, 128, 118, 17, 8), WOOD, {
        shade: 4,
        inner: (c) => {
          for (const x of [74, 114]) c.piece('strap', roundRect(x - 3, 124, 7, 26, 0), LEATHER, { shade: 0 });
        },
      });
      d.piece('head', smooth([[144, 124, 'c'], [160, 124], [172, 136], [160, 149], [144, 149, 'c']]), IRON, { shade: 4 });
    }),
  ]);
})();

const siegetower = (() => {
  const [wb, wf] = wheels(72, 122, 169, 11);
  return engine('siegetower', 'Crownlands', 'a tower of planks on wheels, taller than anything else on the field, a bridge up at its top, a banner down its side', 14, 'lob', [150, 60], [
    part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 48, 9)),
    wb,
    part('body', 'body', 'root', FEET, (d, team) => {
      const wall = poly([[60, 164], [70, 36], [122, 36], [132, 164]]);
      d.piece('wall', wall, WOOD, {
        shade: 6,
        inner: (c) => {
          planks(c, 62, 132, 34, 166, 12);
          for (const y of [78, 120]) c.piece('floor', roundRect(56, y, 80, 6, 0), far(WOOD), { shade: 0 });
          c.flat('slit', roundRect(88, 52, 20, 9, 3), HOOD_INTERIOR);
        },
      });
      d.piece('banner', poly([[84, 86], [108, 86], [108, 150], [96, 140], [84, 150]]), CLOTH[team], {
        shade: 4,
        inner: (c) => c.piece('mark', poly([[96, 100], [104, 110], [96, 120], [88, 110]]), GOLD, { shade: 0 }),
      });
      d.piece('top', poly([[64, 40], [64, 24], [78, 24], [78, 30], [90, 30], [90, 24], [102, 24], [102, 30], [114, 30], [114, 24], [128, 24], [128, 40]]), WOOD, { shade: 0 });
    }),
    wf,
    part('bridge', 'weapon', 'body', [126, 78], (d) => {
      d.piece('bridge', roundRect(122, 30, 9, 50, 3), WOOD, {
        shade: 3,
        inner: (c) => {
          for (const y of [42, 54, 66]) c.shadeOver('board', roundRect(120, y, 13, 2.4, 0), 0.9);
        },
      });
      d.line('chain', path().M(131, 34).L(128, 26));
    }),
  ]);
})();

const warwagon = (() => {
  const [wb, wf] = wheels(66, 126, 163, 17);
  return engine('warwagon', 'Stormriders', 'a wagon under a hooped cover in its side\'s color, spears out of its front', 76, 'ram', [178, 126], [
    part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 54, 9)),
    wb,
    part('spears', 'weapon', 'body', [140, 132], (d) => {
      for (const [y, len] of [[126, 34], [140, 24]] as const) {
        // The shafts run back under the cover, so that run out they are still in the wagon.
        d.piece('shaft', roundRect(104, y - 2.5, len + 36, 5, 2), WOOD, { shade: 0 });
        d.piece('point', poly([[140 + len - 2, y - 6], [140 + len + 12, y], [140 + len - 2, y + 6]]), STEEL, { shade: 0 });
      }
    }),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('cover', path().M(50, 128).Q(50, 80, 96, 80).Q(142, 80, 142, 128).Z(), CLOTH[team], {
        shade: 6,
        inner: (c) => {
          for (const x of [72, 96, 120]) c.shadeOver('hoop', roundRect(x - 1.6, 78, 3.2, 52, 0), 0.9);
        },
      });
      d.piece('box', roundRect(44, 124, 104, 32, 5), WOOD, {
        shade: 5,
        inner: (c) => {
          planks(c, 44, 148, 122, 158, 13);
          c.piece('rail', roundRect(40, 124, 112, 6, 0), IRON, { shade: 0 });
        },
      });
    }),
    wf,
  ]);
})();

const steamtank = engine('steamtank', 'Artificers', 'an iron hull on three wheels, riveted, a stack smoking, a bronze gun, a banner on its side', 62, 'shoot', [176, 128], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 54, 9)),
  part('stack', 'extra', 'body', [70, 106], (d) => {
    d.flat('smoke-a', circle(64, 62, 9), LINEN.fill, 0.6);
    d.flat('smoke-b', circle(54, 46, 7), LINEN.fill, 0.45);
    d.piece('stack', roundRect(62, 74, 14, 36, 3), far(IRON), { shade: 0 });
    d.piece('lip', roundRect(58, 70, 22, 8, 3), plain(IRON), { shade: 0 });
  }, 0.2),
  part('wheel-mid', 'legBack', 'root', [96, 168], (d) => wheel(d, 96, 168, 12, true)),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('hull', smooth([[46, 162, 'c'], [50, 120, 'c'], [68, 104, 'c'], [124, 104, 'c'], [142, 120, 'c'], [148, 162, 'c']]), plain(IRON), {
      shade: 6,
      inner: (c) => {
        for (let i = 0; i < 5; i++) rivet(c, 72 + i * 12, 111, 1.8);
        for (let i = 0; i < 7; i++) rivet(c, 58 + i * 13, 154, 1.8);
        c.shadeOver('seam', roundRect(46, 144, 104, 2.6, 0), 1);
      },
    });
    d.piece('banner', poly([[70, 118], [100, 118], [100, 142], [85, 134], [70, 142]]), CLOTH[team], { shade: 3 });
    d.piece('hatch', roundRect(84, 96, 28, 10, 4), plain(IRON), { shade: 0 });
  }),
  part('wheels', 'legFront', 'root', [96, 168], (d) => {
    wheel(d, 64, 168, 12);
    wheel(d, 128, 168, 12);
  }),
  part('gun', 'weapon', 'body', [134, 128], (d) => {
    d.piece('mount', circle(134, 128, 10), plain(IRON), { shade: 3 });
    d.piece('tube', roundRect(136, 122, 34, 12, 3), BRONZE, { shade: 3 });
    d.piece('mouth', roundRect(166, 119, 9, 18, 3), BRONZE, { shade: 0 });
  }),
]);

const drillcart = (() => {
  const [wb, wf] = wheels(68, 112, 165, 15);
  return engine('drillcart', 'Stonekin', 'a cart with a bronze boiler and a great steel drill out of its front', 78, 'ram', [176, 132], [
    part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 54, 9)),
    pennant(50, 140, 60),
    wb,
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('stack', roundRect(64, 84, 11, 26, 3), plain(IRON), { shade: 0 });
      d.piece('boiler', roundRect(52, 104, 52, 36, 14), BRONZE, {
        shade: 5,
        inner: (c) => {
          c.shadeOver('band', roundRect(76, 100, 5, 44, 0), 1);
          for (let i = 0; i < 3; i++) rivet(c, 86 + i * 6, 112, 1.6);
        },
      });
      d.piece('bed', roundRect(46, 138, 88, 18, 6), WOOD, { shade: 4 });
      drape(d, 56, 140, 32, 18, CLOTH[team]);
    }),
    wf,
    part('drill', 'weapon', 'body', [112, 132], (d) => {
      d.piece('collar', roundRect(102, 108, 13, 48, 4), plain(IRON), { shade: 0 });
      const cone = poly([[114, 110], [176, 132], [114, 154]]);
      d.piece('cone', cone, STEEL, {
        shade: 4,
        inner: (c) => {
          // The thread of the drill: bands across the cone, leaning.
          for (const x of [122, 136, 150]) c.shadeOver('thread', poly([[x, 104], [x + 6, 104], [x + 14, 160], [x + 8, 160]]), 1.1);
        },
      });
    }),
  ]);
})();

export const MACHINES_ART: UnitArt[] = [slaggolem, treant, automaton, catapult, trebuchet, cannon, mortar, batteringram, siegetower, warwagon, steamtank, drillcart];
void BONE;
void star;
