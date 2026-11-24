// Small pictures for the interface. Each is drawn as the thing it is: a coin
// is a struck coin, a lock has a shackle, a crown has points. No letters, no
// faces, no emoji.

import { Doc } from './kit/draw';
import {
  ARCANE, BONE, BUSH, CLOTH, FIRE, FROST, GOLD, GRASS, HOLY, HOOD_INTERIOR, IRON, LEATHER, LINEN, PINE, SAND, SNOW, STEEL, VENOM, WOOD, type Material,
} from './kit/palette';
import { capsule, circle, ellipse, path, poly, roundRect, smooth, star } from './kit/path';

export interface IconArt {
  name: string;
  width: number;
  height: number;
  origin: [number, number];
  draw: (d: Doc) => void;
}

const flat = (m: Material): Material => ({ fill: m.shade, shade: m.shade });

const ICONS: Record<string, (d: Doc) => void> = {
  coin: (d) => {
    d.piece('coin', circle(24, 24, 19), GOLD, { shade: 4 });
    d.piece('stamp', star(24, 24, 5, 10, 4.5), flat(GOLD), { shade: 0 });
  },
  star: (d) => {
    d.piece('star', star(24, 25, 5, 20, 9), GOLD, { shade: 3 });
  },
  lock: (d) => {
    d.piece('shackle', path().M(11, 25).L(11, 16).C(11, 1, 37, 1, 37, 16).L(37, 25).L(30, 25).L(30, 16).C(30, 9, 18, 9, 18, 16).L(18, 25).Z(), STEEL, { shade: 0 });
    d.piece('body', roundRect(8, 21, 32, 23, 6), IRON, { shade: 4 });
    d.piece('keyhole', circle(24, 31, 4), GOLD, { shade: 0 });
  },
  crown: (d) => {
    d.piece('crown', poly([[7, 38], [4, 14], [15, 24], [24, 8], [33, 24], [44, 14], [41, 38]]), GOLD, { shade: 4 });
    d.piece('band', roundRect(6, 34, 36, 8, 3), flat(GOLD), { shade: 0 });
  },
  banner: (d) => {
    d.piece('pole', roundRect(9, 4, 6, 41, 3), WOOD, { shade: 0 });
    d.piece('flag', poly([[14, 7], [42, 9], [34, 18], [42, 28], [14, 30]]), CLOTH.red, { shade: 3 });
  },
  heart: (d) => {
    d.piece('heart', path().M(24, 42).C(4, 28, 3, 12, 14, 9).C(20, 8, 24, 13, 24, 16).C(24, 13, 28, 8, 34, 9).C(45, 12, 44, 28, 24, 42).Z(), CLOTH.red, { shade: 4 });
  },
  sword: (d) => {
    const t = (p: ReturnType<typeof poly>): ReturnType<typeof poly> => p.rotate(40, 24, 24);
    d.piece('blade', t(poly([[19, 6], [24, 1], [29, 6], [29, 30], [19, 30]])), STEEL, { shade: 3 });
    d.piece('guard', t(roundRect(12, 29, 24, 6, 3)), GOLD, { shade: 0 });
    d.piece('grip', t(roundRect(21, 34, 6, 10, 2)), LEATHER, { shade: 0 });
  },
  shield: (d) => {
    d.piece('shield', smooth([[7, 9, 'c'], [24, 5], [41, 9, 'c'], [41, 24], [34, 37], [24, 44, 'c'], [14, 37], [7, 24]]), STEEL, { shade: 4 });
    d.piece('boss', circle(24, 22, 6), GOLD, { shade: 0 });
  },
  boot: (d) => {
    d.piece('boot', path().M(13, 6).L(29, 6).L(29, 24).C(38, 25, 43, 30, 43, 37).L(43, 42).L(11, 42).L(11, 30).Z(), LEATHER, { shade: 4 });
    d.piece('cuff', roundRect(11, 4, 20, 8, 3), LINEN, { shade: 0 });
  },
  hourglass: (d) => {
    d.piece('glass', poly([[12, 8], [36, 8], [26, 24], [36, 40], [12, 40], [22, 24]]), BONE, { shade: 3 });
    d.piece('top', roundRect(8, 4, 32, 7, 3), WOOD, { shade: 0 });
    d.piece('bottom', roundRect(8, 37, 32, 7, 3), WOOD, { shade: 0 });
  },
  range: (d) => {
    // An arrow in flight, and the bow it left.
    d.piece('bow', path().M(8, 6).C(26, 12, 26, 36, 8, 42).L(6, 37).C(18, 32, 18, 16, 6, 11).Z(), WOOD, { shade: 0 });
    d.piece('shaft', roundRect(14, 21.5, 22, 5, 2.5), BONE, { shade: 0 });
    d.piece('head', poly([[33, 15], [45, 24], [33, 33]]), STEEL, { shade: 0 });
  },
  flag: (d) => {
    d.piece('pole', roundRect(10, 4, 6, 41, 3), WOOD, { shade: 0 });
    d.piece('flag', poly([[15, 7], [43, 13], [15, 27]]), CLOTH.blue, { shade: 3 });
  },
  cards: (d) => {
    d.piece('back', roundRect(6, 6, 24, 32, 5).rotate(-12, 18, 22), CLOTH.blue, { shade: 3 });
    d.piece('front', roundRect(17, 9, 24, 32, 5).rotate(8, 29, 25), BONE, { shade: 3 });
    d.piece('mark', star(29, 25, 4, 8, 3.5).rotate(8, 29, 25), GOLD, { shade: 0 });
  },
  pack: (d) => {
    d.piece('pouch', poly([[10, 8], [14, 4], [18, 8], [22, 4], [26, 8], [30, 4], [34, 8], [38, 4], [38, 40], [34, 44], [30, 40], [26, 44], [22, 40], [18, 44], [14, 40], [10, 44]]), CLOTH.blue, { shade: 4 });
    d.piece('seal', circle(24, 24, 8), GOLD, { shade: 2 });
  },
  check: (d) => {
    d.piece('check', poly([[6, 25], [12, 19], [20, 27], [36, 9], [42, 15], [20, 39]]), VENOM, { shade: 0 });
  },
  arrow: (d) => {
    d.piece('arrow', poly([[14, 8], [34, 24], [14, 40], [20, 24]]), BONE, { shade: 0 });
  },
  spark: (d) => {
    d.piece('spark', star(24, 24, 4, 21, 7), GOLD, { shade: 0 });
  },
  sound: (d) => {
    d.piece('cone', poly([[6, 18], [16, 18], [27, 8], [27, 40], [16, 30], [6, 30]]), BONE, { shade: 3 });
    d.piece('wave-a', path().M(32, 17).C(37, 21, 37, 27, 32, 31).L(29, 28).C(31, 26, 31, 22, 29, 20).Z(), BONE, { shade: 0 });
    d.piece('wave-b', path().M(38, 11).C(47, 18, 47, 30, 38, 37).L(35, 34).C(41, 29, 41, 19, 35, 14).Z(), BONE, { shade: 0 });
  },
  mute: (d) => {
    d.piece('cone', poly([[6, 18], [16, 18], [27, 8], [27, 40], [16, 30], [6, 30]]), BONE, { shade: 3 });
    d.piece('cross-a', capsule(32, 18, 44, 30, 6), CLOTH.red, { shade: 0 });
    d.piece('cross-b', capsule(44, 18, 32, 30, 6), CLOTH.red, { shade: 0 });
  },
  team: (d) => {
    // Three helms side by side: a team.
    d.piece('helm-a', smooth([[4, 34, 'c'], [5, 22], [13, 16], [21, 22], [22, 34, 'c']]), STEEL, { shade: 0 });
    d.piece('helm-c', smooth([[26, 34, 'c'], [27, 22], [35, 16], [43, 22], [44, 34, 'c']]), STEEL, { shade: 0 });
    d.piece('helm-b', smooth([[12, 40, 'c'], [13, 22], [24, 12], [35, 22], [36, 40, 'c']]), STEEL, { shade: 3 });
    d.piece('slit', capsule(20, 28, 34, 28, 5), { fill: HOOD_INTERIOR, shade: HOOD_INTERIOR }, { shade: 0 });
  },
};

// The statuses, a disc each in the status's own color with what it does drawn on it: these stand over a unit
// for as long as the status is on it. A disc is told from the others by its color first and its mark second,
// as they are seen small.
const disc = (d: Doc, mat: Material): void => {
  d.piece('disc', circle(24, 24, 21), mat, { shade: 3 });
};
ICONS['status-burn'] = (d) => {
  disc(d, { fill: FIRE.shade, shade: FIRE.shade });
  d.piece('flame', smooth([[24, 6, 'c'], [34, 20], [35, 31], [24, 40], [13, 31], [14, 20]]), FIRE, { shade: 0 });
  d.flat('core', smooth([[24, 21, 'c'], [29, 29], [24, 36], [19, 29]]), FIRE.light);
};
ICONS['status-poison'] = (d) => {
  disc(d, { fill: VENOM.shade, shade: VENOM.shade });
  // A drop, and a smaller one beside it.
  d.piece('drop', path().M(22, 7).C(30, 18, 34, 24, 34, 30).C(34, 37, 29, 41, 22, 41).C(15, 41, 10, 37, 10, 30).C(10, 24, 14, 18, 22, 7).Z(), VENOM, { shade: 0 });
  d.flat('shine', circle(17, 30, 3.5), VENOM.light);
  d.piece('drip', circle(37, 16, 4.5), VENOM, { shade: 0 });
};
ICONS['status-stun'] = (d) => {
  disc(d, { fill: HOLY.shade, shade: HOLY.shade });
  // Stars round a head that is not drawn.
  d.piece('star-a', star(24, 14, 5, 9, 4), HOLY, { shade: 0 });
  d.piece('star-b', star(13, 31, 5, 8, 3.5), HOLY, { shade: 0 });
  d.piece('star-c', star(35, 31, 5, 8, 3.5), HOLY, { shade: 0 });
};
ICONS['status-slow'] = (d) => {
  disc(d, { fill: FROST.shade, shade: FROST.shade });
  // A flake of frost: six arms.
  d.piece('flake', star(24, 24, 6, 17, 5), FROST, { shade: 0 });
  d.flat('heart', circle(24, 24, 4), FROST.light);
};
ICONS['status-haste'] = (d) => {
  disc(d, { fill: FROST.shade, shade: FROST.shade });
  // Two chevrons, going somewhere.
  d.piece('chevron-a', poly([[9, 11], [18, 11], [28, 24], [18, 37], [9, 37], [19, 24]]), BONE, { shade: 0 });
  d.piece('chevron-b', poly([[23, 11], [32, 11], [42, 24], [32, 37], [23, 37], [33, 24]]), BONE, { shade: 0 });
};
ICONS['status-rage'] = (d) => {
  disc(d, { fill: CLOTH.red.shade, shade: CLOTH.red.shade });
  // A blade, point up: it strikes harder.
  d.piece('blade', poly([[24, 5], [31, 14], [29, 31], [19, 31], [17, 14]]), STEEL, { shade: 0 });
  d.piece('guard', roundRect(13, 30, 22, 6, 3), GOLD, { shade: 0 });
  d.piece('grip', roundRect(21, 35, 6, 9, 2), LEATHER, { shade: 0 });
};
ICONS['status-weak'] = (d) => {
  disc(d, { fill: IRON.shade, shade: IRON.shade });
  // A blade broken in two.
  d.piece('stub', poly([[19, 22], [24, 17], [29, 23], [29, 31], [19, 31]]), STEEL, { shade: 0 });
  d.piece('tip', poly([[30, 6], [38, 10], [33, 20], [27, 15]]), STEEL, { shade: 0 });
  d.piece('guard', roundRect(13, 30, 22, 6, 3), GOLD, { shade: 0 });
  d.piece('grip', roundRect(21, 35, 6, 9, 2), LEATHER, { shade: 0 });
};
ICONS['status-mark'] = (d) => {
  disc(d, { fill: ARCANE.shade, shade: ARCANE.shade });
  // A mark to aim at: a ring, and a cross through it.
  d.piece('ring', circle(24, 24, 13), { fill: ARCANE.light, shade: ARCANE.light }, { shade: 0 });
  d.flat('hole', circle(24, 24, 7), ARCANE.shade);
  d.line('hole-edge', circle(24, 24, 7));
  d.piece('bar-a', roundRect(21, 4, 6, 12, 2), BONE, { shade: 0 });
  d.piece('bar-b', roundRect(21, 32, 6, 12, 2), BONE, { shade: 0 });
  d.piece('bar-c', roundRect(4, 21, 12, 6, 2), BONE, { shade: 0 });
  d.piece('bar-d', roundRect(32, 21, 12, 6, 2), BONE, { shade: 0 });
};
ICONS['status-shield'] = (d) => {
  disc(d, { fill: IRON.fill, shade: IRON.fill });
  d.piece('shield', smooth([[11, 12, 'c'], [24, 8], [37, 12, 'c'], [37, 24], [32, 34], [24, 40, 'c'], [16, 34], [11, 24]]), STEEL, { shade: 3 });
  d.piece('boss', circle(24, 23, 5), GOLD, { shade: 0 });
};
ICONS['status-regen'] = (d) => {
  disc(d, { fill: VENOM.shade, shade: VENOM.shade });
  // A cross: mending.
  d.piece('cross', poly([[19, 9], [29, 9], [29, 19], [39, 19], [39, 29], [29, 29], [29, 39], [19, 39], [19, 29], [9, 29], [9, 19], [19, 19]]), BONE, { shade: 0 });
};

// The marks of the screens that came later: the rewards, the settings and what is in them.
ICONS.gift = (d) => {
  d.piece('box', roundRect(8, 21, 32, 23, 4), CLOTH.red, { shade: 4 });
  d.piece('lid', roundRect(5, 14, 38, 11, 4), CLOTH.red, { shade: 0 });
  d.piece('ribbon', roundRect(20, 14, 8, 30, 0), GOLD, { shade: 0 });
  // The bow: two loops and the knot between them.
  d.piece('loop-a', smooth([[24, 14, 'c'], [14, 3], [7, 8], [12, 14]]), GOLD, { shade: 0 });
  d.piece('loop-b', smooth([[24, 14, 'c'], [34, 3], [41, 8], [36, 14]]), GOLD, { shade: 0 });
};
ICONS.gear = (d) => {
  // Eight square teeth round a wheel, and the hole it turns on.
  const pts: Array<[number, number]> = [];
  const at = (deg: number, r: number): [number, number] => [24 + Math.cos((deg * Math.PI) / 180) * r, 24 + Math.sin((deg * Math.PI) / 180) * r];
  for (let i = 0; i < 8; i++) {
    const a = i * 45;
    pts.push(at(a - 15, 15), at(a - 10, 21.5), at(a + 10, 21.5), at(a + 15, 15));
  }
  d.piece('wheel', poly(pts), STEEL, { shade: 3 });
  d.flat('hole', circle(24, 24, 6.5), HOOD_INTERIOR);
  d.line('hole-edge', circle(24, 24, 6.5));
};
ICONS.note = (d) => {
  // Two notes on one beam.
  d.piece('stem-a', roundRect(14, 10, 5, 26, 2), BONE, { shade: 0 });
  d.piece('stem-b', roundRect(35, 6, 5, 26, 2), BONE, { shade: 0 });
  d.piece('beam', poly([[14, 8], [40, 3], [40, 13], [14, 18]]), BONE, { shade: 0 });
  d.piece('head-a', ellipse(11, 37, 8, 6.5), BONE, { shade: 3 });
  d.piece('head-b', ellipse(32, 33, 8, 6.5), BONE, { shade: 3 });
};
ICONS.book = (d) => {
  // A closed book, its pages showing along the bottom and a clasp on its cover.
  d.piece('pages', roundRect(10, 34, 31, 9, 2), BONE, { shade: 0 });
  d.piece('cover', roundRect(8, 5, 33, 34, 4), CLOTH.blue, { shade: 4 });
  d.piece('spine', roundRect(8, 5, 8, 38, 3), CLOTH.blue, { shade: 0 });
  d.piece('clasp', star(28, 21, 4, 9, 4), GOLD, { shade: 0 });
};

// The emblem of each kind of land: a medal in its color with what grows or
// shines there. A world is known by its land's emblem wherever its stages
// are numbered.
ICONS['land-meadow'] = (d) => {
  d.piece('medal', circle(24, 24, 21), { fill: GRASS.fill, shade: GRASS.dark }, { shade: 4 });
  d.piece('trunk', roundRect(21, 28, 6, 12, 2), WOOD, { shade: 0 });
  d.piece('crown', smooth([[10, 24], [12, 13], [24, 7], [36, 13], [38, 24], [30, 31], [18, 31]]), BUSH, {
    shade: 3,
    inner: (c) => c.lightOver('heap', smooth([[14, 20], [18, 11], [27, 10], [26, 18], [18, 22]]), 0.8),
  });
};
ICONS['land-desert'] = (d) => {
  d.piece('medal', circle(24, 24, 21), { fill: SAND.fill, shade: SAND.dark }, { shade: 4 });
  d.piece('rays', star(24, 24, 8, 17, 10), HOLY, { shade: 0 });
  d.piece('sun', circle(24, 24, 8), GOLD, { shade: 2 });
};
ICONS['land-snow'] = (d) => {
  d.piece('medal', circle(24, 24, 21), { fill: SNOW.fill, shade: SNOW.dark }, { shade: 4 });
  d.piece('peak-b', poly([[22, 36], [32, 16], [42, 36]]), { fill: PINE.fill, shade: PINE.shade }, { shade: 0 });
  d.piece('peak-a', poly([[6, 36], [20, 10], [34, 36]]), FROST, {
    shade: 3,
    inner: (c) => c.flat('cap', poly([[20, 8], [27, 21], [22, 18], [19, 23], [15, 19], [12, 22]]), SNOW.light),
  });
};

export function iconArt(): IconArt[] {
  return Object.entries(ICONS).map(([name, draw]) => ({ name, width: 48, height: 48, origin: [0.5, 0.5], draw }));
}
