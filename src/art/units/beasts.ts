// The beasts, and who rides them. None has a face: a mask, a plate, a hood,
// a forelock or a horn is where one would be (kit/beasts.ts).
//
// A four-legged beast is a body, two legs to a side, a tail, and a neck and
// head that the rig moves as a weapon, so its attack is its head thrown
// forward. A rider is a recipe like any other, set on a horse's back.

import type { Doc } from '../kit/draw';
import {
  ARCANE, BONE, BRONZE, BUSH, CLOTH, DARK_CLOTH, DIRT, FIRE, FROST, GOLD, HOLY, IRON, LEATHER, LINEN, PINE, STEEL, STONE, VENOM, WOOD, type Material, type Team,
} from '../kit/palette';
import {
  barrel, bearHead, beastLeg, blanket, caparison, horseHead, houndHead, lizardHead, ramHead, shag, sized, sizedPt, stagHead, tailBrush, tailHair, tailLizard,
  tailStub, tailWhip, WITHERS, yakHead,
} from '../kit/beasts';
import { FEET, crease, crossbow, far, leg, rivet, shadow } from '../kit/parts';
import { Path, capsule, circle, path, poly, roundRect, smooth, star, type Pt } from '../kit/path';
import type { PartSpec, UnitArt } from '../kit/unit';
import { H, HOLD, O, W, X } from './catalogue';
import { part } from './common';
import { held, reach, upper, type Recipe } from './figure';
import { note, type UnitRole } from './notes';
import { B } from './wearing';

type Size = (p: Path) => Path;

interface Quad {
  set: string;
  role?: UnitRole;
  read: string;
  size: number;
  hide: Material;
  /** How far its back is dropped: for what goes close to the ground. */
  low?: number;
  legTop?: number;
  legW?: number;
  hoof?: Material;
  shaggy?: boolean;
  /** A cloth over its back in its side's color. */
  blanket?: boolean;
  tail: (d: Doc, s: Size, team: Team) => void;
  head: (d: Doc, s: Size, team: Team) => void;
  /** Drawn on the body, over the blanket: a crest of spines, a pack. */
  on?: (d: Doc, s: Size, team: Team) => void;
  top: number;
}

function quadruped(id: string, q: Quad): UnitArt {
  note(id, q.set, q.role ?? 'beast', q.read);
  const k = q.size;
  const s = sized(k);
  const top = q.legTop ?? 142;
  const w = q.legW ?? 15;
  const hoof = q.hoof ?? null;
  return {
    id,
    style: 'bite',
    muzzle: sizedPt(k, [176, 108]).map(Math.round) as unknown as Pt,
    top: q.top,
    parts: [
      part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 46 * k, 9)),
      part('tail', 'extra', 'body', sizedPt(k, [62, 118]), (d, team) => q.tail(d, s, team), 1),
      part('legs-far', 'legBack', 'root', sizedPt(k, [98, 150]), (d) => {
        beastLeg(d, s, 82, q.hide, true, top, w, hoof);
        beastLeg(d, s, 114, q.hide, true, top, w, hoof);
      }),
      part('body', 'body', 'root', FEET, (d, team) => {
        d.piece('hide', s(barrel(q.low ?? 0)), q.hide, { shade: 6, inner: q.shaggy ? (c) => shag(c, s, q.low ?? 0) : undefined });
        if (q.blanket) blanket(d, s, CLOTH[team], GOLD, q.low ?? 0);
        q.on?.(d, s, team);
      }),
      part('legs-near', 'legFront', 'root', sizedPt(k, [98, 150]), (d) => {
        beastLeg(d, s, 70, q.hide, false, top, w, hoof);
        beastLeg(d, s, 124, q.hide, false, top, w, hoof);
      }),
      part('head', 'weapon', 'body', sizedPt(k, WITHERS), (d, team) => q.head(d, s, team)),
    ],
  };
}

const plain = (m: Material): Material => ({ fill: m.fill, shade: m.shade });

const warhound = quadruped('warhound', {
  set: 'Crownlands', read: 'a pale hound in a mask of leather, ears up, a collar and a coat in its side\'s color',
  size: 0.84, hide: BONE, blanket: true, top: 92,
  tail: (d, s) => tailWhip(d, s, BONE),
  head: (d, s, team) => houndHead(d, s, BONE, LEATHER, CLOTH[team]),
});

const direwolf = quadruped('direwolf', {
  set: 'Wildwood', read: 'a great grey wolf, shaggy, in a mask of iron, with a brush of a tail',
  size: 1.02, hide: STONE, shaggy: true, blanket: true, top: 66,
  tail: (d, s) => tailBrush(d, s, STONE, BONE),
  head: (d, s, team) => houndHead(d, s, STONE, IRON, CLOTH[team]),
});

const warbear = quadruped('warbear', {
  set: 'Wildwood', read: 'a bear as broad as two soldiers, round ears, a plate of iron over its muzzle',
  size: 1.14, hide: LEATHER, shaggy: true, blanket: true, legW: 18, top: 70,
  tail: (d, s) => tailStub(d, s, LEATHER),
  head: (d, s) => bearHead(d, s, LEATHER),
});

const greatstag = quadruped('greatstag', {
  set: 'Wildwood', read: 'a stag hooded in its side\'s color, on a long neck, antlers high over everyone',
  size: 1, hide: DIRT, legW: 11, hoof: IRON, blanket: true, top: 22,
  tail: (d, s) => tailStub(d, s, BONE),
  head: (d, s, team) => stagHead(d, s, DIRT, CLOTH[team]),
});

const packram = quadruped('packram', {
  set: 'Stonekin', read: 'a woolly ram with a great curled horn where an eye would be, and a load on its back',
  size: 0.92, hide: BONE, shaggy: true, hoof: IRON, legW: 12, blanket: true, top: 84,
  tail: (d, s) => tailStub(d, s, BONE),
  head: (d, s) => ramHead(d, s, BONE),
  on: (d, s) => {
    d.piece('load', s(roundRect(78, 88, 36, 20, 8)), LEATHER, { shade: 4, inner: (c) => c.shadeOver('strap', s(roundRect(94, 86, 3, 24, 0)), 1.2) });
  },
});

const yak = quadruped('yak', {
  set: 'Stormriders', read: 'a shaggy beast with its head low, horns up, and a forelock over all its front',
  size: 1.08, hide: LEATHER, shaggy: true, hoof: IRON, legW: 16, blanket: true, top: 74,
  tail: (d, s) => tailBrush(d, s, LEATHER, DARK_CLOTH),
  head: (d, s) => yakHead(d, s, LEATHER),
});

const SKIN = plain(IRON);
const salamander = quadruped('salamander', {
  set: 'Emberforged', read: 'a lizard low to the ground, plated on its head, with fire standing along its back',
  size: 1, hide: SKIN, low: 22, legTop: 156, legW: 13, top: 104,
  tail: (d, s) => tailLizard(d, s, SKIN),
  head: (d, s) => lizardHead(d, s, SKIN, BRONZE, FIRE),
  on: (d, s, team) => {
    d.piece('saddle', s(smooth([[84, 126, 'c'], [112, 126, 'c'], [114, 146], [98, 152], [82, 146]])), CLOTH[team], { shade: 3 });
    for (const [x, h] of [[72, 14], [86, 20], [100, 24], [114, 18]] as const) {
      d.flat('glow', s(circle(x, 124 - h * 0.4, 9)), FIRE.light, 0.4);
      d.piece('flame', s(smooth([[x - 6, 128, 'c'], [x - 7, 118], [x, 126 - h - 8, 'c'], [x + 7, 118], [x + 6, 128, 'c']])), FIRE, { shade: 0 });
    }
  },
});

// ---------------------------------------------------------------- the ones that are not four-legged

const X0 = 96;

/** A pennon on a stick, stuck in a shell or a back: where a creature with no cloth of its own shows its side. */
function pennon(x: number, y: number, tall = 36): PartSpec {
  return part('pennon', 'extra', 'body', [x, y], (d, team) => {
    d.piece('stick', roundRect(x - 2.5, y - tall, 5, tall, 2), WOOD, { shade: 0 });
    d.piece('cloth', poly([[x + 2, y - tall + 1], [x + 28, y - tall + 6], [x + 20, y - tall + 11], [x + 28, y - tall + 17], [x + 2, y - tall + 20]]), CLOTH[team], { shade: 3 });
  }, 0.8);
}

/** A cloth thrown over a shell, in its side's color, with a gold hem. */
function shellCloth(d: Doc, team: Team, pts: [number, number][]): void {
  d.piece('cloth', smooth(pts.map(([x, y]) => [x, y, 'c'] as [number, number, 'c'])), CLOTH[team], {
    shade: 3,
    inner: (c) => {
      const low = pts.slice().sort((a, b) => b[1] - a[1]).slice(0, 2).sort((a, b) => a[0] - b[0]);
      c.piece('hem', poly([[low[0][0] - 2, low[0][1] - 5], [low[1][0] + 2, low[1][1] - 5], [low[1][0] + 2, low[1][1] + 2], [low[0][0] - 2, low[0][1] + 2]]), GOLD, { shade: 0 });
    },
  });
}

function creature(id: string, set: string, read: string, top: number, style: UnitArt['style'], muzzle: Pt, parts: PartSpec[], role: UnitRole = 'beast'): UnitArt {
  note(id, set, role, read);
  return { id, style, muzzle, top, parts };
}

/** Three legs of something with a shell, as thin jointed limbs. */
function shellLegs(d: Doc, mat: Material, xs: readonly number[], isFar: boolean): void {
  for (const x of xs) {
    const out = x < X0 ? -1 : x > X0 ? 1 : 0;
    d.piece('limb', path().M(x - 4, 150).L(x + 4, 150).L(x + 4 + out * 8, 166).L(x + 6 + out * 12, 180).L(x - 2 + out * 12, 180).L(x - 4 + out * 6, 166).Z(), isFar ? far(mat) : mat, { shade: 0 });
  }
}

const SHELL_GOLD = plain(GOLD);
const scarab = creature('scarab', 'Sunspear', 'a beetle like a gilded shield on six legs, with a forked horn', 96, 'bite', [176, 100], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 46, 9)),
  part('legs-far', 'legBack', 'root', [96, 152], (d) => shellLegs(d, IRON, [80, 104, 126], true)),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('shell', smooth([[50, 150], [58, 120], [82, 102], [112, 102], [134, 116], [142, 146], [122, 158], [72, 160]]), SHELL_GOLD, {
      shade: 6,
      inner: (c) => {
        c.line('wings', smooth([[98, 100], [94, 130], [98, 162]], false));
        c.shadeOver('band-a', smooth([[60, 124], [80, 116], [78, 150], [58, 152]]), 0.6);
        c.lightOver('shine', smooth([[84, 108], [104, 106], [100, 122], [84, 124]]), 0.8);
      },
    });
    shellCloth(d, team, [[70, 110], [102, 103], [106, 138], [72, 144]]);
    d.piece('shield', smooth([[120, 110, 'c'], [138, 110], [152, 124], [152, 146], [134, 156, 'c'], [128, 134]]), IRON, { shade: 4 });
  }),
  part('legs-near', 'legFront', 'root', [96, 152], (d) => shellLegs(d, IRON, [70, 96, 120], false)),
  pennon(112, 104),
  part('horn', 'weapon', 'body', [146, 122], (d) => {
    d.piece('horn', smooth([[142, 126, 'c'], [152, 110], [164, 98], [176, 86, 'c'], [172, 100], [182, 104, 'c'], [166, 110], [158, 120], [150, 132, 'c']]), IRON, { shade: 3 });
  }),
]);

const CRAB = plain(BRONZE);
function claw(d: Doc, x: number, y: number, k: number, mat: Material, shade: number): void {
  const t = (p: Path): Path => p.scale(k, k, 0, 0).translate(x, y);
  d.piece('arm', t(capsule(0, 0, 18, -14, 12)), mat, { shade: Math.min(shade, 3) });
  d.piece('claw', t(smooth([[12, -22, 'c'], [20, -40], [40, -42], [50, -28, 'c'], [36, -30], [30, -22, 'c'], [46, -16, 'c'], [38, -4], [20, -4]])), mat, { shade });
}
const reefcrab = creature('reefcrab', 'Tidewatch', 'a crab as wide as a cart, one great claw raised, and no eyes on it anywhere', 96, 'chop', [170, 96], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 52, 9)),
  part('claw-far', 'offhand', 'body', [72, 138], (d) => claw(d, 60, 138, 0.8, far(CRAB), 0)),
  part('legs-far', 'legBack', 'root', [96, 152], (d) => shellLegs(d, CRAB, [72, 90, 118], true)),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('shell', smooth([[44, 150], [52, 124], [96, 110], [140, 124], [148, 150], [96, 162]]), CRAB, {
      shade: 6,
      inner: (c) => {
        // Knobs on the shell, clear of the cloth: a row of three.
        for (let i = 0; i < 3; i++) rivet(c, 114 + i * 11, 128 + i * 4, 2.4);
        c.shadeOver('lip', smooth([[44, 146], [96, 156], [148, 146], [148, 152], [96, 164], [44, 152]]), 0.9);
      },
    });
    shellCloth(d, team, [[66, 118], [100, 110], [104, 140], [68, 146]]);
  }),
  part('legs-near', 'legFront', 'root', [96, 152], (d) => shellLegs(d, CRAB, [62, 82, 108], false)),
  pennon(112, 114),
  part('claw', 'weapon', 'body', [128, 140], (d) => claw(d, 126, 142, 1.05, CRAB, 4)),
]);

const TURTLE_SKIN = plain(PINE);
const siegeturtle = creature('siegeturtle', 'Mireborn', 'a turtle with its head in an iron cap, and a little fort with a crossbow on its shell', 44, 'shoot', [160, 78], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 54, 10)),
  part('legs-far', 'legBack', 'root', [96, 160], (d) => {
    d.piece('leg-a', roundRect(74, 150, 20, 30, 8), far(TURTLE_SKIN), { shade: 0 });
    d.piece('leg-b', roundRect(116, 150, 20, 30, 8), far(TURTLE_SKIN), { shade: 0 });
  }),
  part('flag', 'extra', 'body', [78, 68], (d, team) => {
    d.piece('staff', roundRect(76, 34, 5, 36, 2), WOOD, { shade: 0 });
    d.piece('cloth', poly([[77, 35], [50, 41], [60, 47], [50, 54], [77, 57]]), CLOTH[team], { shade: 3 });
  }, 0.8),
  part('head', 'extra', 'body', [146, 140], (d) => {
    d.piece('neck', capsule(140, 142, 160, 138, 18), TURTLE_SKIN, { shade: 3 });
    d.piece('cap', smooth([[152, 126, 'c'], [166, 124], [176, 134], [174, 146, 'c'], [160, 142], [150, 138, 'c']]), IRON, {
      shade: 3,
      inner: (c) => {
        for (const [x, y] of [[157, 131], [164, 132], [170, 136]] as const) rivet(c, x, y, 1.6);
      },
    });
  }, 0.3),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('fort', roundRect(72, 66, 50, 44, 3), WOOD, {
      shade: 4,
      inner: (c) => {
        for (const x of [84, 96, 108]) c.shadeOver('plank', roundRect(x, 62, 2.4, 50, 0), 0.9);
        c.piece('band', roundRect(66, 92, 62, 8, 0), CLOTH[team], { shade: 0 });
      },
    });
    d.piece('merlons', poly([[70, 68], [70, 56], [82, 56], [82, 62], [92, 62], [92, 56], [104, 56], [104, 62], [112, 62], [112, 56], [124, 56], [124, 68]]), WOOD, { shade: 0 });
    const shell = smooth([[40, 152], [48, 118], [78, 100], [116, 100], [144, 120], [152, 152], [96, 164]]);
    d.piece('shell', shell, BUSH, {
      shade: 6,
      inner: (c) => {
        c.line('plate-a', poly([[80, 104], [70, 126], [84, 146], [108, 146], [122, 126], [112, 104]], false));
        c.line('plate-b', path().M(70, 126).L(46, 132));
        c.line('plate-c', path().M(122, 126).L(148, 132));
        c.shadeOver('lip', smooth([[40, 146], [96, 158], [152, 146], [152, 154], [96, 166], [40, 154]]), 0.9);
      },
    });
  }),
  part('legs-near', 'legFront', 'root', [96, 160], (d) => {
    d.piece('leg-a', roundRect(56, 152, 22, 28, 8), TURTLE_SKIN, { shade: 3 });
    d.piece('leg-b', roundRect(108, 152, 22, 28, 8), TURTLE_SKIN, { shade: 3 });
  }),
  part('crossbow', 'weapon', 'body', [108, 64], (d) => crossbow(d, { hand: [108, 64], angle: 80 }, WOOD)),
]);

const slime = creature('slime', 'Mireborn', 'a green heap of ooze with a spear still stuck in it, pennon and all, and a helmet seen inside', 60, 'thrust', [150, 96], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 46, 9)),
  part('spear', 'weapon', 'body', [104, 120], (d, team) => {
    const t = (p: Path): Path => p.rotate(24, 104, 120);
    d.piece('shaft', t(roundRect(101, 50, 6, 80, 3)), WOOD, { shade: 0 });
    d.piece('head', t(poly([[104, 30], [112, 48], [108, 56], [100, 56], [96, 48]])), STEEL, { shade: 3 });
    d.piece('pennon', t(poly([[107, 58], [140, 64], [130, 72], [140, 81], [107, 84]])), CLOTH[team], { shade: 3 });
  }),
  part('body', 'body', 'root', FEET, (d) => {
    d.piece('ooze', smooth([[48, 180, 'c'], [48, 150], [66, 124], [96, 114], [126, 124], [144, 150], [144, 180, 'c']]), VENOM, {
      shade: 7,
      inner: (c) => {
        c.lightOver('shine', smooth([[62, 150], [70, 130], [88, 122], [84, 136], [74, 150]]), 1.2);
        // What it has taken in, seen through it: one helmet, and bubbles rising in a line.
        c.shadeOver('helm', path().M(96, 172).L(96, 160).Q(98, 144, 112, 144).Q(126, 144, 128, 160).L(128, 172).Z(), 1.1);
        c.shadeOver('helm-brim', roundRect(92, 168, 40, 6, 3), 1.1);
        c.lightOver('bubble-a', circle(84, 158, 4), 1.4);
        c.lightOver('bubble-b', circle(92, 142, 3), 1.4);
        c.lightOver('bubble-c', circle(102, 130, 2.2), 1.4);
      },
    });
    d.glint('glint', capsule(64, 142, 70, 132, 5));
  }),
]);

const wisp = creature('wisp', 'Hollow Court', 'a violet flame that goes about in a lantern with no one holding it, a bow tied on its ring and a ribbon trailing', 62, 'cast', [150, 112], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 24, 6)),
  part('ribbon', 'extra', 'body', [92, 150], (d, team) => {
    d.piece('ribbon', smooth([[86, 148, 'c'], [80, 160], [64, 164], [50, 180, 'c'], [74, 178], [96, 168], [104, 150, 'c']]), CLOTH[team], { shade: 3 });
  }, 1.4),
  part('bow', 'extra', 'body', [96, 70], (d, team) => {
    d.piece('tail', poly([[96, 68], [74, 60], [80, 68], [72, 76]]), CLOTH[team], { shade: 0 });
    d.piece('tail-b', poly([[96, 68], [120, 58], [114, 68], [122, 78]]), CLOTH[team], { shade: 3 });
  }, 1),
  part('body', 'body', 'root', FEET, (d) => {
    d.line('chain', path().M(96, 62).L(96, 80));
    d.flat('halo', circle(96, 116, 40), ARCANE.light, 0.4);
    d.piece('cage', roundRect(72, 88, 48, 62, 6), IRON, {
      shade: 4,
      inner: (c) => {
        c.flat('pane', roundRect(78, 95, 36, 48, 3), ARCANE.shade);
        c.piece('flame', smooth([[96, 98, 'c'], [106, 114], [108, 128], [102, 140, 'c'], [90, 140, 'c'], [84, 128], [88, 114]]), ARCANE, { shade: 0 });
        c.flat('heart', smooth([[96, 116, 'c'], [101, 126], [100, 136], [92, 136], [91, 126]]), ARCANE.light);
        // Two bars and a rail: the flame is seen through six panes.
        c.piece('bar-a', roundRect(86, 90, 3.6, 58, 0), IRON, { shade: 0 });
        c.piece('bar-b', roundRect(102.4, 90, 3.6, 58, 0), IRON, { shade: 0 });
        c.piece('rail', roundRect(72, 116, 48, 3.6, 0), IRON, { shade: 0 });
      },
    });
    d.piece('cap', poly([[68, 90], [96, 72], [124, 90]]), IRON, { shade: 3 });
    d.piece('foot', roundRect(78, 148, 36, 7, 3), IRON, { shade: 0 });
  }),
  part('spark', 'weapon', 'body', [138, 112], (d) => {
    d.flat('halo', circle(138, 112, 12), ARCANE.light, 0.45);
    d.piece('spark', star(138, 112, 4, 8, 3.4), ARCANE, { shade: 0 });
  }),
]);

const eagle = creature('eagle', 'Stormriders', 'a hunting eagle hooded in its side\'s color, one wing up, jesses trailing from its legs', 54, 'bite', [160, 98], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 34, 7)),
  part('wing-far', 'extra', 'body', [96, 116], (d) => {
    d.piece('wing', smooth([[100, 120, 'c'], [84, 96], [62, 70], [40, 56, 'c'], [48, 76, 'c'], [36, 78, 'c'], [48, 94, 'c'], [40, 100, 'c'], [60, 112], [84, 126, 'c']]), far(STONE), { shade: 0 });
  }, 1.2),
  part('tail', 'extra', 'body', [78, 148], (d) => {
    d.piece('tail', poly([[84, 140], [56, 158], [60, 166], [68, 162], [70, 172], [80, 164], [84, 172], [94, 152]]), STONE, { shade: 3 });
  }, 0.8),
  part('leg-far', 'legBack', 'root', [104, 158], (d) => {
    d.piece('leg', roundRect(100, 152, 7, 24, 3), far(GOLD), { shade: 0 });
    d.piece('foot', poly([[98, 174], [116, 174], [118, 180], [96, 180]]), far(GOLD), { shade: 0 });
  }),
  part('body', 'body', 'root', FEET, (d) => {
    d.piece('body', smooth([[80, 152], [84, 122], [100, 106], [120, 108], [130, 126], [124, 150], [104, 162], [88, 160]]), STONE, {
      shade: 5,
      inner: (c) => {
        c.piece('breast', smooth([[112, 110, 'c'], [134, 122], [128, 152], [108, 166], [104, 140]]), BONE, { shade: 0 });
      },
    });
    d.piece('wing', smooth([[92, 116, 'c'], [108, 124], [112, 144], [100, 160, 'c'], [84, 156], [76, 140]]), STONE, {
      shade: 4,
      inner: (c) => {
        crease(c, 'feather-a', [92, 124], [84, 150], 3, 0.9);
        crease(c, 'feather-b', [102, 128], [96, 156], 3, 0.9);
      },
    });
  }),
  part('leg-near', 'legFront', 'root', [94, 158], (d, team) => {
    d.piece('jess', poly([[90, 162], [78, 176], [84, 180], [94, 168]]), CLOTH[team], { shade: 0 });
    d.piece('leg', roundRect(90, 152, 7, 24, 3), GOLD, { shade: 0 });
    d.piece('foot', poly([[88, 174], [106, 174], [108, 180], [86, 180]]), GOLD, { shade: 0 });
  }),
  part('head', 'weapon', 'body', [114, 110], (d, team) => {
    d.piece('neck', capsule(112, 114, 126, 96, 18), STONE, { shade: 3 });
    d.piece('beak', smooth([[138, 88, 'c'], [152, 90], [158, 100, 'c'], [148, 98], [138, 98, 'c']]), GOLD, { shade: 0 });
    d.piece('hood', smooth([[118, 100, 'c'], [116, 84], [128, 76], [140, 80], [142, 96, 'c'], [130, 102]]), CLOTH[team], { shade: 3 });
    d.piece('plume', smooth([[126, 78, 'c'], [120, 66], [112, 60, 'c'], [124, 62], [132, 76, 'c']]), GOLD, { shade: 0 });
  }),
]);

// ---------------------------------------------------------------- riders

interface Mount {
  hide: Material;
  mane: Material;
  /** Cloth over the whole horse in its side's color, or only a blanket under the saddle. */
  caparison?: boolean;
  plate?: Material;
}

const HORSE = 1.22;
/** How big a rider is beside someone on foot, and where the feet of one would be when sat on the horse. */
const RIDER = 0.84;
const SEAT: Pt = [-8, -62];

/** Where a point of someone drawn on foot is when they ride. */
function seat(p: Pt): Pt {
  return [(p[0] - FEET[0]) * RIDER + FEET[0] + SEAT[0], (p[1] - FEET[1]) * RIDER + FEET[1] + SEAT[1]];
}

function seated(d: Doc, draw: (c: Doc) => void, dy = 0): void {
  const o = seat([0, 0]);
  d.at(o[0], o[1] + dy, RIDER, false, draw);
}

function riding(p: PartSpec): PartSpec {
  const draw = p.draw;
  return { ...p, pivot: seat(p.pivot), draw: (d, team) => seated(d, (c) => draw(c, team)) };
}

/** Someone on a horse: the horse first, then whoever the recipe describes, from the hips up, on its back. */
function mounted(id: string, m: Mount, r: Recipe): UnitArt {
  note(id, r.set, r.role, r.read);
  const s = sized(HORSE);
  const u = upper(r);
  const body = u.front[0];
  const rest = u.front.slice(1).map(riding);
  const rider: PartSpec = {
    name: 'rider', role: 'extra', parent: 'body', pivot: seat(FEET),
    draw: (d, team) => {
      seated(d, (c) => body.draw(c, team));
      // The near leg, down the horse's flank.
      seated(d, (c) => leg(c, 100, r.legs ?? LEATHER), 4);
    },
  };
  const tip = seat(held(r.arm.tip, reach(r.hold)));
  return {
    id,
    style: r.style ?? r.arm.style,
    muzzle: [Math.round(tip[0]), Math.round(tip[1])],
    top: Math.round(seat([0, r.top ?? r.head.top])[1]),
    parts: [
      part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 60, 10)),
      part('tail', 'extra', 'body', sizedPt(HORSE, [62, 116]), (d) => tailHair(d, s, m.mane), 0.8),
      part('legs-far', 'legBack', 'root', sizedPt(HORSE, [98, 146]), (d) => {
        beastLeg(d, s, 82, m.hide, true, 138, 12, IRON);
        beastLeg(d, s, 114, m.hide, true, 138, 12, IRON);
      }),
      ...u.back.map(riding),
      part('body', 'body', 'root', FEET, (d, team) => {
        d.piece('hide', s(barrel()), m.hide, { shade: 6 });
        if (m.caparison) caparison(d, s, CLOTH[team]);
        else blanket(d, s, CLOTH[team]);
      }),
      part('legs-near', 'legFront', 'root', sizedPt(HORSE, [98, 146]), (d) => {
        beastLeg(d, s, 70, m.hide, false, 138, 12, IRON);
        beastLeg(d, s, 124, m.hide, false, 138, 12, IRON);
      }),
      part('horse-head', 'extra', 'body', sizedPt(HORSE, WITHERS), (d, team) => horseHead(d, s, m.hide, m.caparison ? CLOTH[team] : null, m.mane, m.plate ?? STEEL), 0.3),
      rider,
      ...rest,
    ],
  };
}

const cavalier = mounted('cavalier', { hide: BONE, mane: LINEN, caparison: true }, {
  set: 'Crownlands', role: 'mounted', read: 'a knight on a horse clothed to the hooves in its side\'s color, a lance with a pennon, a kite shield',
  head: H.round(), crest: [X.plume()], body: B.plate(STEEL), legs: STEEL, arm: W.spear(78, 'team', STEEL), hold: [118, 138, 78], off: O.kite([72, 140]),
});

const outrider = mounted('outrider', { hide: LEATHER, mane: DARK_CLOTH }, {
  set: 'Stormriders', role: 'mounted', read: 'a rider in a fur hat on a brown horse, a bow drawn, a quiver',
  head: H.furCap(LEATHER), back: [X.quiver()], body: B.tunic(), arm: W.bow(), hold: HOLD.bow, off: O.arrow(), offOver: true,
});

const khan = mounted('khan', { hide: BONE, mane: BONE, plate: GOLD }, {
  set: 'Stormriders', role: 'boss', read: 'a rider on a white horse, a gold pointed helm with a tail of hair, a glaive, a banner on its back',
  head: H.tailHelm('team', GOLD), back: [X.banner()], body: B.scale(BRONZE), arm: W.glaive(70), hold: [124, 140, 26],
});

const dunerider = mounted('dunerider', { hide: DIRT, mane: LEATHER, plate: BRONZE }, {
  set: 'Sunspear', role: 'mounted', read: 'a rider in a spiked helm with cloth hung from it on a sand-colored horse, a javelin raised, a round shield',
  head: H.spike(), back: [X.javelins()], body: B.tunic(), arm: W.javelin(46), hold: [126, 114, 66], off: O.buckler([78, 138], 17, BRONZE),
});

const deathrider = mounted('deathrider', { hide: SKIN, mane: DARK_CLOTH, caparison: true, plate: IRON }, {
  set: 'Hollow Court', role: 'mounted', read: 'a rider in a dark barbute on a dark horse clothed to the hooves, a scythe, a torn cape',
  head: H.barbute(IRON), back: [X.tornCape()], body: B.plate(IRON), legs: IRON, arm: W.scythe(78), hold: [122, 142, 14],
});

export const BEASTS_ART: UnitArt[] = [
  warhound, direwolf, warbear, greatstag, packram, yak, salamander, scarab, reefcrab, siegeturtle, slime, wisp, eagle,
  cavalier, outrider, khan, dunerider, deathrider,
];
void FROST;
void HOLY;
