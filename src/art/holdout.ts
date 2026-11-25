// The pictures Lastander has that the kit did not: what a hero carries,
// drawn by itself so that it can float at their side; the things the camp
// sells; a mark for each of a hero's stats; and the ground of the arena.
// All of it is drawn with the kit's own pieces, by its rules.

import { Dice } from './kit/dice';
import { Doc } from './kit/draw';
import { hawk, keg } from './kit/gear';
import {
  ARCANE, BONE, BRONZE, BUSH, CLOTH, DARK_CLOTH, DIRT, FIRE, FROST, GOLD, GRASS, HOLY, IRON, LEATHER, LINEN, OUTLINE, RUBY, SAND, SNOW, STEEL, STONE, VENOM, WOOD,
  type Material,
} from './kit/palette';
import { book, drum, mitt } from './kit/parts';
import { capsule, circle, ellipse, path, poly, roundRect, smooth, star, type Pt } from './kit/path';
import { GROUND, type Ground } from './ground';
import type { IconArt } from './icons';
import { bush, cairn, drift, dryShrub, flowers, iceSpike, mushrooms, rock, sandrock, stump, tuft, type Scenery } from './scenery';
import { W } from './units/catalogue';
import type { Arm } from './units/figure';

const flat = (m: Material): Material => ({ fill: m.shade, shade: m.shade });
const VIOLET: Material = { fill: ARCANE.fill, shade: ARCANE.shade };

// ---------------------------------------------------------------- what a hero carries

/** A weapon's picture: it stands upright with its hand at this place, and turns about it. */
export const WEAPON_W = 100;
export const WEAPON_H = 184;
export const WEAPON_HAND: Pt = [50, 126];

/** A bow with rime on it: three shards of ice along its upper limb, so that it is not the plain bow at a glance. */
function iced(bow: Arm): Arm {
  return {
    ...bow,
    draw: (d, g, team) => {
      bow.draw(d, g, team);
      const [x, y] = g.hand;
      for (const [dx, dy, r] of [[-2, -52, 9], [8, -34, 7], [-2, 50, 8]] as const) {
        d.piece('rime', poly([[x + dx, y + dy - r], [x + dx + r * 0.6, y + dy], [x + dx, y + dy + r], [x + dx - r * 0.6, y + dy]]), FROST, { shade: 0 });
      }
    },
  };
}

/** A blowpipe: a length of green cane with bound ends and a feathered dart at its mouth. */
const BLOWPIPE: Arm = {
  style: 'bow',
  tip: [0, -92],
  draw: (d, g) => {
    const [x, y] = g.hand;
    d.piece('dart', poly([[x - 5, y - 92], [x, y - 108], [x + 5, y - 92]]), VENOM, { shade: 0 });
    d.piece('cane', roundRect(x - 5, y - 94, 10, 118, 4), BUSH, { shade: 3 });
    for (const dy of [-88, -40, 8]) d.piece('binding', roundRect(x - 6.5, y + dy, 13, 7, 2), LINEN, { shade: 0 });
    mitt(d, x, y - 14, LEATHER, 7.5);
  },
};

/** Who draws each weapon of the game, by the weapon's own name. */
const ARMS: Record<string, Arm> = {
  sword: W.sword(),
  dagger: W.dagger(),
  spear: W.spear(84),
  greataxe: W.greatAxe(),
  hammer: W.warhammer(60),
  torch: W.torch(FIRE, 44),
  bow: W.bow(),
  crossbow: W.crossbow(),
  javelin: W.javelin(52),
  sling: W.sling(),
  bomb: W.bomb(FIRE, 14),
  staff: W.orbStaff(ARCANE),
  brazier: W.brazierStaff(FIRE),
  frost: W.crystalWand(FROST, 56),
  venom: W.sporeStaff(VENOM, VIOLET),
  censer: W.censer(HOLY, 26),
  // The second armful.
  halberd: W.halberd(84),
  trident: W.trident(74, { fill: FROST.fill, shade: FROST.shade }),
  mace: W.mace(50),
  longbow: W.longbow(),
  rimebow: iced(W.bow()),
  blowpipe: BLOWPIPE,
  hatchet: W.throwingAxe(46),
  hail: W.boulder({ fill: FROST.light, shade: FROST.fill }, 13),
  holywater: W.flask(HOLY),
  gourd: W.flask(VENOM),
  sunbrand: W.khopesh(58, GOLD),
  fang: W.sickle(26),
  wand: W.wand(ARCANE, 40),
};

/** The weapons, each as a picture named "w-" and its name. */
export function weaponIcons(): IconArt[] {
  return Object.entries(ARMS).map(([id, arm]) => ({
    name: `w-${id}`,
    width: WEAPON_W,
    height: WEAPON_H,
    origin: [WEAPON_HAND[0] / WEAPON_W, WEAPON_HAND[1] / WEAPON_H] as [number, number],
    draw: (d: Doc) => arm.draw(d, { hand: WEAPON_HAND, angle: 0 }, 'blue'),
  }));
}

export const WEAPON_ART = Object.keys(ARMS);

// ---------------------------------------------------------------- small pictures

const heart = (): ReturnType<typeof path> => path().M(24, 42).C(4, 28, 3, 12, 14, 9).C(20, 8, 24, 13, 24, 16).C(24, 13, 28, 8, 34, 9).C(45, 12, 44, 28, 24, 42).Z();

const ICONS: Record<string, (d: Doc) => void> = {
  // ------------------------------------------------ a hero's stats
  drop: (d) => {
    d.piece('drop', path().M(24, 4).C(33, 17, 39, 24, 39, 31).C(39, 39, 32, 45, 24, 45).C(16, 45, 9, 39, 9, 31).C(9, 24, 15, 17, 24, 4).Z(), RUBY, { shade: 4 });
    d.glint('glint', capsule(17, 30, 19, 24, 4));
  },
  burst: (d) => {
    d.piece('burst', star(24, 24, 8, 22, 11), FIRE, { shade: 0 });
    d.flat('heart', star(24, 24, 8, 12, 6), FIRE.light);
  },
  // Lore is a cut stone, not an orb: an orb with a ring of light round it is an eye.
  rune: (d) => {
    d.piece('stone', poly([[24, 3], [40, 22], [24, 45], [8, 22]]), ARCANE, {
      shade: 4,
      inner: (c) => {
        c.lightOver('facet', poly([[24, 3], [24, 22], [8, 22]]), 1);
        c.shadeOver('facet-low', poly([[24, 22], [40, 22], [24, 45]]), 0.8);
      },
    });
    d.glint('glint', capsule(17, 18, 21, 12, 3));
  },
  herb: (d) => {
    d.piece('stem', capsule(24, 44, 24, 20, 4), flat(BUSH), { shade: 0 });
    d.piece('leaf-a', smooth([[24, 26, 'c'], [12, 24], [5, 13, 'c'], [18, 12], [24, 22, 'c']]), BUSH, { shade: 3 });
    d.piece('leaf-b', smooth([[24, 26, 'c'], [36, 24], [43, 13, 'c'], [30, 12], [24, 22, 'c']]), BUSH, { shade: 3 });
    d.piece('leaf-c', smooth([[19, 20, 'c'], [17, 9], [24, 2, 'c'], [31, 9], [29, 20, 'c']]), VENOM, { shade: 3 });
    d.piece('tie', roundRect(19, 34, 10, 5, 2), LINEN, { shade: 0 });
  },
  feather: (d) => {
    d.piece('vane', smooth([[9, 41, 'c'], [10, 26], [20, 12], [38, 5, 'c'], [36, 22], [26, 34], [14, 40]]), BONE, {
      shade: 3,
      inner: (c) => {
        for (const [x, y] of [[18, 22], [24, 17], [30, 13]] as const) c.shadeOver('barb', capsule(x, y, x + 5, y + 9, 1.6), 1);
      },
    });
    d.line('quill', path().M(6, 45).L(34, 9));
  },
  clover: (d) => {
    d.piece('stem', capsule(25, 30, 31, 44, 4), flat(BUSH), { shade: 0 });
    for (const [x, y] of [[16, 16], [32, 16], [16, 31], [32, 31]] as const) d.piece('leaf', circle(x, y, 9.5), BUSH, { shade: 3 });
    d.flat('middle', circle(24, 23.5, 3.5), VENOM.light);
  },
  magnet: (d) => {
    d.piece('arch', path().M(7, 40).L(7, 22).C(7, 0, 41, 0, 41, 22).L(41, 40).L(30, 40).L(30, 22).C(30, 14, 18, 14, 18, 22).L(18, 40).Z(), RUBY, { shade: 4 });
    d.piece('tip-a', roundRect(6, 34, 13, 9, 2), STEEL, { shade: 0 });
    d.piece('tip-b', roundRect(29, 34, 13, 9, 2), STEEL, { shade: 0 });
  },
  // ------------------------------------------------ the field
  // A bare hand, the size the kit draws one: it is shown at the end of a hero's arm in place of what they hold.
  fist: (d) => mitt(d, 24, 24, LEATHER, 7.5),
  'shot-bomb': (d) => {
    d.line('fuse', path().M(30, 14).L(36, 7));
    d.piece('spark', star(38, 6, 5, 6, 2.6), FIRE, { shade: 0 });
    d.piece('ball', circle(22, 28, 14), IRON, { shade: 4 });
    d.piece('neck', roundRect(25, 11, 9, 7, 2).rotate(35, 29, 14), flat(IRON), { shade: 0 });
  },
  'shot-stone': (d) => {
    d.piece('stone', smooth([[14, 24], [18, 15], [29, 14], [35, 22], [32, 32], [20, 34]]), STONE, { shade: 3 });
  },
  reroll: (d) => {
    d.piece('turn-a', path().M(8, 22).C(8, 9, 28, 3, 38, 14).L(42, 9).L(43, 25).L(27, 23).L(32, 19).C(26, 13, 16, 15, 16, 22).Z(), BONE, { shade: 3 });
    d.piece('turn-b', path().M(40, 26).C(40, 39, 20, 45, 10, 34).L(6, 39).L(5, 23).L(21, 25).L(16, 29).C(22, 35, 32, 33, 32, 26).Z(), BONE, { shade: 3 });
  },
  // ------------------------------------------------ the camp's wares
  ration: (d) => {
    d.piece('loaf', smooth([[5, 33, 'c'], [6, 21], [16, 13], [32, 13], [42, 21], [43, 33, 'c']]), DIRT, {
      shade: 5,
      inner: (c) => {
        for (const x of [15, 24, 33]) c.shadeOver('cut', capsule(x - 2, 17, x + 3, 28, 2.2), 1.1);
      },
    });
    d.piece('cloth', poly([[3, 32], [45, 32], [41, 41], [7, 41]]), LINEN, { shade: 0 });
  },
  whetstone: (d) => {
    d.piece('stone', roundRect(6, 26, 36, 13, 3).rotate(-14, 24, 32), STONE, { shade: 4 });
    d.piece('blade', poly([[10, 22], [38, 5], [42, 9], [15, 27]]), STEEL, { shade: 3 });
  },
  fletching: (d) => {
    d.piece('shaft', roundRect(21.5, 4, 5, 40, 2), WOOD, { shade: 0 });
    d.piece('vane-a', poly([[21, 18], [9, 26], [9, 40], [21, 34]]), BONE, { shade: 3 });
    d.piece('vane-b', poly([[27, 18], [39, 26], [39, 40], [27, 34]]), BONE, { shade: 3 });
    d.piece('nock', roundRect(20, 40, 8, 5, 2), flat(WOOD), { shade: 0 });
  },
  candle: (d) => {
    d.flat('halo', circle(24, 12, 12), FIRE.light, 0.45);
    d.piece('flame', smooth([[19, 17, 'c'], [18, 10], [24, 2, 'c'], [30, 10], [29, 17, 'c']]), FIRE, { shade: 0 });
    d.piece('wax', roundRect(17, 16, 14, 22, 3), BONE, { shade: 3 });
    d.piece('dish', path().M(7, 36).L(41, 36).C(39, 44, 9, 44, 7, 36).Z(), GOLD, { shade: 3 });
  },
  horseshoe: (d) => {
    d.piece('shoe', path().M(7, 42).L(7, 21).C(7, 0, 41, 0, 41, 21).L(41, 42).L(32, 42).L(32, 21).C(32, 12, 16, 12, 16, 21).L(16, 42).Z(), IRON, {
      shade: 4,
      inner: (c) => {
        for (const [x, y] of [[11.5, 34], [11.5, 25], [14.5, 14], [33.5, 14], [36.5, 25], [36.5, 34]] as const) c.shadeOver('nail', circle(x, y, 1.7), 1.8);
      },
    });
  },
  keg: (d) => keg(d, 24, 26),
  wardrum: (d) => drum(d, 24, 27, CLOTH.blue, 17),
  hawk: (d) => hawk(d, 22, 36),
  grimoire: (d) => book(d, 24, 26, VIOLET),
  mail: (d) => {
    d.piece('shirt', poly([[13, 6], [20, 6], [24, 10], [28, 6], [35, 6], [46, 15], [40, 23], [36, 20], [36, 43], [12, 43], [12, 20], [8, 23], [2, 15]]), IRON, {
      shade: 4,
      inner: (c) => {
        for (let y = 16; y < 42; y += 6) for (let x = 15 + ((y / 6) % 2) * 3; x < 35; x += 6) c.shadeOver('ring', circle(x, y, 1.9), 1.3);
      },
    });
  },
  spyglass: (d) => {
    const t = (p: ReturnType<typeof roundRect>): ReturnType<typeof roundRect> => p.rotate(-32, 24, 24);
    d.piece('wide', t(roundRect(3, 17, 20, 14, 3)), BRONZE, { shade: 4 });
    d.piece('mid', t(roundRect(21, 19, 14, 10, 2)), GOLD, { shade: 3 });
    d.piece('thin', t(roundRect(33, 20.5, 12, 7, 2)), BRONZE, { shade: 0 });
    d.piece('rim', t(roundRect(1, 15, 5, 18, 2)), GOLD, { shade: 0 });
  },
  cloak: (d) => {
    d.piece('cloak', smooth([[16, 9, 'c'], [24, 6], [32, 9, 'c'], [41, 26], [44, 43, 'c'], [34, 39], [24, 44], [14, 39], [4, 43, 'c'], [7, 26]]), DARK_CLOTH, {
      shade: 5,
      inner: (c) => {
        c.shadeOver('fold-a', capsule(17, 16, 14, 40, 2.4), 1);
        c.shadeOver('fold-b', capsule(31, 16, 34, 40, 2.4), 1);
      },
    });
    d.piece('clasp', circle(24, 10, 4.5), GOLD, { shade: 0 });
  },
  chalice: (d) => {
    d.piece('foot', path().M(13, 43).L(35, 43).L(31, 37).L(17, 37).Z(), GOLD, { shade: 0 });
    d.piece('stem', roundRect(21, 24, 6, 15, 2), GOLD, { shade: 0 });
    d.piece('cup', path().M(8, 7).L(40, 7).C(40, 22, 32, 28, 24, 28).C(16, 28, 8, 22, 8, 7).Z(), GOLD, { shade: 4 });
    d.piece('wine', ellipse(24, 8, 14, 3.4), RUBY, { shade: 0 });
  },
  relic: (d) => {
    d.flat('halo', circle(24, 24, 23), HOLY.light, 0.5);
    d.piece('rays', star(24, 24, 12, 22, 14), GOLD, { shade: 0 });
    d.piece('disc', circle(24, 24, 12), HOLY, { shade: 4 });
    d.glint('glint', circle(20, 20, 3));
  },
  stoneheart: (d) => {
    d.piece('heart', heart(), STONE, {
      shade: 5,
      inner: (c) => c.shadeOver('crack', path().M(22, 12).L(27, 20).L(21, 27).L(26, 36).L(24, 37).L(18, 27).L(24, 20).L(20, 13).Z(), 1.2),
    });
  },
  quiver: (d) => {
    for (const [x, tall] of [[17, 0], [24, -4], [31, 1]] as const) {
      d.piece('shaft', roundRect(x - 1.5, 6 + tall, 3, 16, 1), WOOD, { shade: 0 });
      d.piece('vane', poly([[x - 5, 5 + tall], [x, 1 + tall], [x + 5, 5 + tall], [x + 5, 13 + tall], [x, 10 + tall], [x - 5, 13 + tall]]), BONE, { shade: 0 });
    }
    d.piece('case', path().M(11, 16).L(37, 16).L(33, 44).L(15, 44).Z(), LEATHER, {
      shade: 4,
      inner: (c) => c.piece('band', roundRect(8, 22, 32, 6, 0), GOLD, { shade: 0 }),
    });
  },
  // ------------------------------------------------ relics: one picture each, named "r-" and the relic's name
  'r-bellows': (d) => {
    d.piece('nozzle', poly([[21, 36], [27, 36], [25.5, 46], [22.5, 46]]), IRON, { shade: 0 });
    d.piece('pleats', poly([[9, 16], [39, 16], [35, 34], [24, 39], [13, 34]]), LEATHER, {
      shade: 4,
      inner: (c) => {
        for (const y of [21, 26, 31]) c.shadeOver('pleat', capsule(13, y, 35, y, 1.5), 1);
      },
    });
    d.piece('board', smooth([[24, 4, 'c'], [38, 6], [41, 16, 'c'], [7, 16, 'c'], [10, 6]]), WOOD, { shade: 3 });
    d.piece('grip', roundRect(20, 1, 8, 7, 3), flat(WOOD), { shade: 0 });
  },
  'r-echobell': (d) => {
    d.line('ring-a', path().M(38, 12).C(43, 18, 43, 28, 38, 34));
    d.line('ring-b', path().M(10, 12).C(5, 18, 5, 28, 10, 34));
    d.piece('clapper', roundRect(21, 36, 6, 9, 3), IRON, { shade: 0 });
    d.piece('bell', path().M(12, 37).C(16, 30, 13, 9, 24, 9).C(35, 9, 32, 30, 36, 37).Z(), GOLD, { shade: 5 });
    d.piece('loop', roundRect(20, 3, 8, 8, 3), flat(GOLD), { shade: 0 });
    d.glint('glint', capsule(19, 16, 18, 26, 3));
  },
  'r-wolfskin': (d) => {
    d.piece('hide', smooth([[24, 4], [31, 9], [42, 6], [38, 17], [43, 26], [36, 29], [39, 42], [29, 37], [24, 45], [19, 37], [9, 42], [12, 29], [5, 26], [10, 17], [6, 6], [17, 9]]), IRON, {
      shade: 5,
      inner: (c) => c.lightOver('back', smooth([[24, 10], [29, 18], [28, 30], [24, 36], [20, 30], [19, 18]]), 1),
    });
    d.piece('tie', roundRect(21, 2, 6, 6, 2), LEATHER, { shade: 0 });
  },
  'r-lastcandle': (d) => {
    d.flat('halo', circle(24, 15, 12), FIRE.light, 0.45);
    d.piece('flame', smooth([[20, 21, 'c'], [19, 14], [24, 5, 'c'], [29, 14], [28, 21, 'c']]), FIRE, { shade: 0 });
    d.piece('pool', smooth([[5, 40, 'c'], [10, 34], [38, 34], [43, 40, 'c'], [36, 45], [12, 45]]), BONE, { shade: 3 });
    d.piece('stub', path().M(16, 38).L(16, 24).C(18, 20, 30, 20, 32, 24).L(32, 38).Z(), BONE, { shade: 3 });
    d.piece('drip', capsule(19, 26, 19, 33, 3.4), flat(BONE), { shade: 0 });
  },
  'r-magpie': (d) => {
    d.piece('vane', smooth([[9, 41, 'c'], [10, 26], [20, 12], [38, 5, 'c'], [36, 22], [26, 34], [14, 40]]), DARK_CLOTH, { shade: 3 });
    d.piece('tip', smooth([[38, 5, 'c'], [36, 17], [31, 21], [26, 14, 'c'], [31, 8]]), BONE, { shade: 0 });
    d.line('quill', path().M(6, 45).L(34, 9));
    d.glint('sheen', capsule(15, 31, 20, 24, 3));
  },
  'r-thornmail': (d) => {
    for (const [x, y, a] of [[6, 10, -40], [42, 10, 40], [2, 21, -80], [46, 21, 80], [14, 3, -10], [34, 3, 10]] as const) {
      d.piece('thorn', poly([[x - 4, y + 5], [x, y - 7], [x + 4, y + 5]]).rotate(a, x, y), BONE, { shade: 0 });
    }
    d.piece('shirt', poly([[13, 8], [20, 8], [24, 12], [28, 8], [35, 8], [44, 16], [39, 23], [36, 21], [36, 44], [12, 44], [12, 21], [9, 23], [4, 16]]), IRON, {
      shade: 4,
      inner: (c) => {
        for (let y = 19; y < 43; y += 6) for (let x = 15 + ((y / 6) % 2 > 0.5 ? 3 : 0); x < 35; x += 6) c.shadeOver('link', circle(x, y, 1.8), 1.2);
      },
    });
  },
  'r-stormglass': (d) => {
    d.piece('cork', roundRect(19, 2, 10, 8, 2), WOOD, { shade: 0 });
    d.piece('glass', path().M(19, 9).L(29, 9).L(29, 16).C(41, 20, 42, 45, 24, 45).C(6, 45, 7, 20, 19, 16).Z(), FROST, { shade: 5 });
    d.piece('bolt', poly([[27, 17], [17, 31], [23, 31], [20, 42], [31, 27], [25, 27]]), HOLY, { shade: 0 });
    d.glint('glint', capsule(13, 28, 15, 22, 3));
  },
  'r-horn': (d) => {
    d.piece('horn', path().M(6, 14).C(10, 36, 30, 44, 44, 36).L(40, 26).C(30, 31, 18, 26, 15, 12).Z(), BONE, { shade: 4 });
    d.piece('mouth', roundRect(3, 8, 14, 7, 3).rotate(-12, 10, 12), GOLD, { shade: 0 });
    d.piece('band', roundRect(26, 29, 6, 13, 2).rotate(-66, 29, 35), GOLD, { shade: 0 });
    d.piece('bell', roundRect(37, 23, 7, 16, 3).rotate(-20, 41, 31), GOLD, { shade: 0 });
    d.piece('tassel', poly([[17, 30], [21, 32], [17, 45], [12, 43]]), RUBY, { shade: 0 });
  },
  'r-spade': (d) => {
    d.piece('shaft', roundRect(21.5, 9, 5, 24, 2), WOOD, { shade: 0 });
    d.piece('grip', roundRect(15, 2, 18, 8, 4), WOOD, { shade: 3 });
    d.piece('blade', path().M(13, 27).L(35, 27).L(35, 36).C(35, 42, 28, 46, 24, 47).C(20, 46, 13, 42, 13, 36).Z(), IRON, { shade: 4 });
    d.flat('earth', smooth([[14, 39, 'c'], [20, 36], [28, 39], [34, 37, 'c'], [32, 43], [24, 46], [16, 43]]), DIRT.shade);
  },
  'r-twinquiver': (d) => {
    d.piece('shaft', roundRect(21.5, 24, 5, 21, 2), WOOD, { shade: 0 });
    d.piece('fork-a', capsule(23, 27, 12, 12, 4.5), WOOD, { shade: 0 });
    d.piece('fork-b', capsule(25, 27, 36, 12, 4.5), WOOD, { shade: 0 });
    d.piece('head-a', poly([[4, 13], [9, 1], [18, 9]]), STEEL, { shade: 0 });
    d.piece('head-b', poly([[44, 13], [39, 1], [30, 9]]), STEEL, { shade: 0 });
    d.piece('vane', poly([[19, 38], [24, 33], [29, 38], [29, 46], [24, 42], [19, 46]]), BONE, { shade: 0 });
  },
  'r-ageswhet': (d) => {
    d.piece('stone', roundRect(5, 17, 38, 16, 4).rotate(-12, 24, 25), STONE, {
      shade: 5,
      inner: (c) => {
        c.shadeOver('worn', ellipse(24, 23, 13, 3.5).rotate(-12, 24, 25), 1);
      },
    });
    for (const x of [11, 37]) d.piece('band', roundRect(x - 3, 14, 6, 22, 2).rotate(-12, 24, 25), GOLD, { shade: 0 });
    d.piece('moss', smooth([[15, 34, 'c'], [19, 31], [25, 33], [30, 30, 'c'], [28, 36], [20, 38]]), BUSH, { shade: 0 });
    d.piece('spark', star(38, 9, 4, 6, 2.4), HOLY, { shade: 0 });
  },
  'r-crown': (d) => {
    d.piece('crown', poly([[6, 40], [5, 14], [14, 24], [20, 9], [24, 22], [28, 9], [34, 24], [43, 14], [42, 40]]), GOLD, {
      shade: 5,
      inner: (c) => c.shadeOver('crack', poly([[25, 14], [28, 21], [22, 27], [27, 33], [23, 41], [20, 41], [23, 33], [18, 27], [24, 21], [22, 14]]), 1.6),
    });
    d.piece('band', roundRect(5, 36, 38, 7, 2), flat(GOLD), { shade: 0 });
    d.piece('gem', poly([[12, 31], [16, 35.5], [12, 40], [8, 35.5]]), RUBY, { shade: 0 });
  },
  'r-ledger': (d) => {
    book(d, 22, 24, LEATHER);
    d.piece('ribbon', poly([[13, 30], [19, 30], [19, 46], [16, 42], [13, 46]]), RUBY, { shade: 0 });
    d.piece('coin', circle(36, 36, 8), GOLD, { shade: 3 });
    d.piece('stamp', star(36, 36, 5, 4.6, 2.2), flat(GOLD), { shade: 0 });
  },
  'r-shell': (d) => {
    d.piece('shell', path().M(24, 44).C(2, 38, 2, 12, 12, 8).C(16, 4, 20, 6, 24, 5).C(28, 6, 32, 4, 36, 8).C(46, 12, 46, 38, 24, 44).Z(), BONE, {
      shade: 4,
      inner: (c) => {
        for (const [x, y] of [[9, 16], [16, 10], [24, 8], [32, 10], [39, 16]] as const) c.shadeOver('rib', capsule(24, 41, x, y, 1.4), 1.1);
      },
    });
    d.piece('hinge', roundRect(18, 39, 12, 7, 3), LINEN, { shade: 0 });
  },
  'r-spurs': (d) => {
    d.piece('band', path().M(6, 8).L(14, 8).L(14, 20).C(14, 28, 26, 28, 26, 20).L(26, 8).L(34, 8).L(34, 20).C(34, 40, 6, 40, 6, 20).Z().rotate(-30, 20, 22), IRON, { shade: 4 });
    d.piece('shank', capsule(27, 32, 35, 38, 5), IRON, { shade: 0 });
    d.piece('rowel', star(38, 40, 7, 8.5, 3.6), GOLD, { shade: 0 });
  },
  'r-whistle': (d) => {
    d.line('cord', path().M(34, 20).C(46, 8, 40, 0, 30, 6));
    d.piece('pipe', roundRect(5, 21, 36, 13, 6).rotate(-18, 24, 27), BONE, { shade: 4 });
    d.piece('lip', roundRect(2, 26, 9, 9, 3).rotate(-18, 24, 27), GOLD, { shade: 0 });
    d.flat('slot', roundRect(15, 21, 9, 4, 1.5).rotate(-18, 24, 27), OUTLINE);
    d.piece('ring', roundRect(31, 15, 8, 8, 3).rotate(-18, 24, 27), GOLD, { shade: 0 });
  },
  // The marks on the dice are scratches, three in a row or one long one: pips would be dots, and two dots are eyes.
  'r-bonedice': (d) => {
    d.piece('top', poly([[24, 5], [42, 14], [24, 23], [6, 14]]), BONE, { shade: 0 });
    d.piece('left', poly([[6, 14], [24, 23], [24, 44], [6, 35]]), BONE, { shade: 0, inner: (c) => c.shadeOver('dark', poly([[6, 14], [24, 23], [24, 44], [6, 35]]), 0.7) });
    d.piece('right', poly([[42, 14], [24, 23], [24, 44], [42, 35]]), BONE, { shade: 0, inner: (c) => c.shadeOver('dark', poly([[42, 14], [24, 23], [24, 44], [42, 35]]), 1.5) });
    for (const x of [18, 24, 30]) d.flat('scratch', capsule(x, 12.5, x + 1.5, 15.5, 1.5), OUTLINE);
    d.flat('score', capsule(11, 22, 19, 35, 1.6), OUTLINE);
    for (const x of [29, 33, 37]) d.flat('notch', capsule(x, 26 - (x - 29) * 0.5, x, 34 - (x - 29) * 0.5, 1.4), OUTLINE);
  },
  'r-emberheart': (d) => {
    d.flat('halo', circle(24, 25, 22), FIRE.light, 0.4);
    d.piece('heart', heart(), FIRE, {
      shade: 5,
      inner: (c) => c.lightOver('core', smooth([[24, 34, 'c'], [15, 26], [16, 17], [21, 17], [24, 21], [27, 17], [32, 17], [33, 26]]), 1),
    });
    d.piece('flame', smooth([[20, 10, 'c'], [19, 5], [24, 0, 'c'], [29, 5], [28, 10, 'c']]), FIRE, { shade: 0 });
  },
  // A shard of ice on a cord, not a ring: a band with a dark middle is an eye.
  'r-frostbite': (d) => {
    d.line('cord', path().M(12, 4).C(14, 14, 20, 16, 24, 16).C(28, 16, 34, 14, 36, 4));
    d.piece('cap', roundRect(19, 13, 10, 7, 2), IRON, { shade: 0 });
    d.piece('shard', poly([[18, 19], [30, 19], [34, 31], [24, 46], [14, 31]]), FROST, {
      shade: 4,
      inner: (c) => {
        c.lightOver('facet', poly([[18, 19], [24, 19], [24, 46], [14, 31]]), 1);
      },
    });
    d.glint('glint', capsule(20, 24, 19, 31, 2.6));
  },
  'r-mirror': (d) => {
    d.piece('shard', poly([[14, 3], [38, 9], [43, 30], [27, 45], [6, 31], [17, 20]]), STEEL, {
      shade: 4,
      inner: (c) => {
        c.lightOver('shine-a', poly([[19, 6], [26, 8], [13, 31], [9, 29]]), 1);
        c.lightOver('shine-b', poly([[32, 10], [36, 11], [24, 40], [21, 38]]), 0.8);
      },
    });
  },
  'r-fallen': (d) => {
    d.piece('pole', roundRect(9, 3, 5, 43, 2), WOOD, { shade: 0 });
    d.piece('cloth', poly([[13, 7], [42, 9], [38, 16], [43, 23], [36, 27], [40, 34], [30, 31], [26, 38], [20, 31], [13, 33]]), DARK_CLOTH, {
      shade: 4,
      inner: (c) => c.piece('stripe', poly([[13, 15], [40, 17], [40, 22], [13, 21]]), BONE, { shade: 0 }),
    });
    d.piece('finial', poly([[11.5, 0], [16, 5], [11.5, 9], [7, 5]]), GOLD, { shade: 0 });
  },
  'r-sands': (d) => {
    const t = <T extends { rotate: (a: number, x: number, y: number) => T }>(p: T): T => p.rotate(24, 24, 24);
    d.piece('glass', t(path().M(13, 8).L(35, 8).C(35, 18, 27, 21, 27, 24).C(27, 27, 35, 30, 35, 40).L(13, 40).C(13, 30, 21, 27, 21, 24).C(21, 21, 13, 18, 13, 8).Z()), FROST, { shade: 3 });
    d.flat('sand-top', t(path().M(16, 12).L(32, 12).C(31, 17, 26, 19, 24, 22).C(22, 19, 17, 17, 16, 12).Z()), SAND.dark);
    d.flat('sand-low', t(path().M(15, 39).C(16, 34, 21, 32, 24, 31).C(27, 32, 32, 34, 33, 39).Z()), SAND.dark);
    d.piece('cap-a', t(roundRect(10, 4, 28, 6, 2)), GOLD, { shade: 0 });
    d.piece('cap-b', t(roundRect(10, 38, 28, 6, 2)), GOLD, { shade: 0 });
  },
  'r-bowl': (d) => {
    d.piece('coin', circle(27, 19, 8), GOLD, { shade: 3 });
    d.piece('bowl', path().M(4, 22).L(44, 22).C(44, 36, 34, 43, 24, 43).C(14, 43, 4, 36, 4, 22).Z(), WOOD, { shade: 5 });
    d.piece('rim', roundRect(2, 19, 44, 6, 3), flat(WOOD), { shade: 0 });
    d.piece('foot', roundRect(16, 41, 16, 5, 2), flat(WOOD), { shade: 0 });
  },
  'r-tithe': (d) => {
    d.piece('coin', roundRect(21, 1, 6, 13, 3), GOLD, { shade: 0 });
    d.piece('box', roundRect(6, 18, 36, 26, 4), WOOD, { shade: 5 });
    d.piece('lid', roundRect(4, 12, 40, 11, 4), WOOD, { shade: 3 });
    d.flat('slot', roundRect(16, 15.5, 16, 3.6, 1.6), OUTLINE);
    for (const x of [11, 33]) d.piece('strap', roundRect(x, 22, 5, 22, 1), IRON, { shade: 0 });
    d.piece('lock', poly([[24, 26], [29, 31], [24, 37], [19, 31]]), GOLD, { shade: 0 });
  },
  'r-oldmap': (d) => {
    d.piece('sheet', poly([[7, 9], [18, 5], [30, 9], [42, 5], [42, 39], [30, 43], [18, 39], [7, 43]]), LINEN, {
      shade: 0,
      inner: (c) => {
        c.shadeOver('fold-a', poly([[18, 5], [30, 9], [30, 43], [18, 39]]), 0.7);
      },
    });
    for (const [x, y] of [[12, 34], [17, 28], [23, 24]] as const) d.flat('step', capsule(x, y, x + 2.5, y - 2.5, 1.7), DIRT.shade);
    d.flat('cross-a', capsule(29, 14, 37, 22, 2), RUBY.fill);
    d.flat('cross-b', capsule(37, 14, 29, 22, 2), RUBY.fill);
  },
  'r-seal': (d) => {
    d.piece('tail-a', poly([[15, 26], [23, 30], [16, 47], [12, 41], [7, 43]]), RUBY, { shade: 0 });
    d.piece('tail-b', poly([[33, 26], [25, 30], [32, 47], [36, 41], [41, 43]]), RUBY, { shade: 0 });
    d.piece('wax', star(24, 20, 11, 18, 15), RUBY, { shade: 4 });
    d.flat('stamp', star(24, 20, 5, 9, 4), RUBY.shade);
  },
};

// ---------------------------------------------------------------- what a road puts on the field

/**
 * The things an omen puts on the field, each a picture that stands on the
 * ground at the middle of its lower edge: the pay wagon, the cage, and the
 * shrine. The wagon is the enemy's and flies red; the cage and the shrine
 * are nobody's.
 */
const THINGS: IconArt[] = [
  {
    name: 'thing-wagon', width: 150, height: 124, origin: [0.5, 0.94],
    draw: (d) => {
      d.shadeOver('shadow', ellipse(75, 114, 62, 9), 0.35);
      d.piece('pole', roundRect(109, 8, 5, 56, 2), WOOD, { shade: 0 });
      d.piece('pennon', poly([[113, 10], [140, 15], [130, 21], [139, 28], [113, 30]]), CLOTH.red, { shade: 3 });
      d.piece('heap', smooth([[34, 52, 'c'], [44, 38], [62, 30], [82, 34], [96, 44], [102, 52, 'c']]), GOLD, {
        shade: 4,
        inner: (c) => {
          for (const [x, y] of [[52, 43], [66, 37], [80, 42], [60, 48], [90, 49]] as const) c.lightOver('coin', ellipse(x, y, 6, 2.6), 0.9);
        },
      });
      d.piece('box', poly([[18, 50], [132, 50], [124, 92], [26, 92]]), WOOD, {
        shade: 6,
        inner: (c) => {
          for (const x of [46, 75, 104]) c.shadeOver('plank', capsule(x, 52, x, 90, 1.6), 1);
        },
      });
      d.piece('rail', roundRect(14, 46, 122, 9, 3), IRON, { shade: 0 });
      // Two wheels with spokes and no hub, and nothing between them: a dot in each, or a mark in the middle of the box, and the wagon has a face.
      for (const x of [44, 106]) {
        d.piece('wheel', circle(x, 96, 20), WOOD, {
          shade: 4,
          inner: (c) => {
            for (const a of [0, 45, 90, 135]) c.shadeOver('spoke', capsule(x - 17, 96, x + 17, 96, 2.2).rotate(a, x, 96), 1.2);
          },
        });
      }
    },
  },
  {
    name: 'thing-cage', width: 116, height: 124, origin: [0.5, 0.93],
    draw: (d) => {
      d.shadeOver('shadow', ellipse(58, 112, 48, 8), 0.35);
      d.piece('floor', roundRect(12, 98, 92, 13, 4), WOOD, { shade: 4 });
      // Whoever is inside is a dark shape and no more: nothing of it is told before it is let out.
      d.flat('inside', smooth([[30, 100, 'c'], [32, 70], [46, 54], [66, 52], [82, 66], [86, 100, 'c']]), OUTLINE, 0.6);
      for (const x of [20, 37, 54, 71, 88]) d.piece('bar', roundRect(x, 28, 7, 74, 3), IRON, { shade: 0 });
      d.piece('roof', poly([[8, 32], [22, 14], [94, 14], [108, 32]]), WOOD, { shade: 4 });
      d.piece('ring', roundRect(51, 4, 14, 12, 5), IRON, { shade: 0 });
      d.piece('lock', roundRect(47, 58, 22, 20, 4), GOLD, { shade: 3 });
      d.flat('keyhole', roundRect(56, 64, 4, 9, 2), OUTLINE);
    },
  },
  {
    name: 'thing-shrine', width: 128, height: 156, origin: [0.5, 0.94],
    draw: (d) => {
      d.shadeOver('shadow', ellipse(64, 146, 54, 8), 0.35);
      d.flat('glow', circle(64, 30, 28), HOLY.light, 0.4);
      d.piece('flame', smooth([[54, 40, 'c'], [50, 26], [64, 6, 'c'], [78, 26], [74, 40, 'c']]), HOLY, { shade: 0 });
      d.piece('bowl', path().M(42, 38).L(86, 38).C(84, 52, 44, 52, 42, 38).Z(), GOLD, { shade: 3 });
      d.piece('stone', poly([[48, 50], [80, 50], [88, 124], [40, 124]]), STONE, {
        shade: 6,
        inner: (c) => {
          c.piece('sun', star(64, 82, 8, 13, 6), GOLD, { shade: 0 });
          c.shadeOver('crack', poly([[74, 54], [78, 70], [73, 84], [76, 84], [81, 70], [77, 54]]), 1);
        },
      });
      d.piece('step-a', roundRect(26, 120, 76, 13, 4), STONE, { shade: 3 });
      d.piece('step-b', roundRect(14, 131, 100, 13, 4), STONE, { shade: 3 });
      d.piece('moss', smooth([[18, 133, 'c'], [26, 128], [38, 132], [46, 129, 'c'], [42, 137], [26, 138]]), BUSH, { shade: 0 });
    },
  },
];

/** The game's own small pictures, beside the kit's, and the things a road puts on the field. */
export function holdoutIcons(): IconArt[] {
  return [...Object.entries(ICONS).map(([name, draw]) => ({ name, width: 48, height: 48, origin: [0.5, 0.5] as [number, number], draw })), ...THINGS];
}

// ---------------------------------------------------------------- the arena

/** A soft shape of no particular outline, about a point. */
function blob(dice: Dice, cx: number, cy: number, r: number, squash = 0.7): ReturnType<typeof smooth> {
  const pts: Pt[] = [];
  const turn = dice.next() * 6.283;
  for (let i = 0; i < 8; i++) {
    const a = turn + (i / 8) * 6.283;
    const k = r * (0.7 + dice.next() * 0.5);
    pts.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k * squash]);
  }
  return smooth(pts);
}

function speck(d: Doc, ground: Ground, dice: Dice, px: number, py: number): void {
  const c = GROUND[ground];
  const kind = dice.int(4);
  if (ground === 'meadow') {
    if (kind < 2) d.flat('tuft', path().M(px, py).L(px + 4, py - 13).L(px + 8, py).L(px + 12, py - 10).L(px + 16, py).Z(), kind === 0 ? c.speck : GRASS.dark);
    else if (kind === 2) d.shadeOver('clover', ellipse(px, py, 18, 8), 0.2);
    else {
      d.flat('bloom', poly([[px, py - 5.5], [px + 5.5, py], [px, py + 5.5], [px - 5.5, py]]), dice.chance(0.5) ? SNOW.light : HOLY.fill);
      d.flat('bloom-heart', ellipse(px, py, 2, 2), HOLY.shade);
    }
  } else if (ground === 'desert') {
    if (kind < 2) d.flat('ripple', smooth([[px - 6, py], [px + 6, py - 5], [px + 19, py], [px + 32, py - 5], [px + 32, py], [px + 19, py + 5], [px + 6, py]], true), c.speck);
    else if (kind === 2) {
      d.flat('pebble', ellipse(px, py, 7, 5), SAND.dark);
      d.flat('pebble-lit', ellipse(px - 1.5, py - 1.5, 3.5, 2.2), SAND.light);
    } else d.shadeOver('crack', path().M(px, py).L(px + 11, py + 5).L(px + 8, py + 14).L(px + 19, py + 21).L(px + 10, py + 16).L(px + 13, py + 6).Z(), 0.5);
  } else {
    if (kind < 2) d.flat('drift', ellipse(px, py, 18, 6.5), c.speck);
    else if (kind === 2) d.shadeOver('dip', ellipse(px, py, 14, 5.5), 0.18);
    else d.flat('ice', poly([[px, py - 6.5], [px + 5, py], [px, py + 6.5], [px - 5, py]]), FROST.light);
  }
}

/** What stands along the arena's edge, where nobody fights: low things, so that nothing hides who comes over it. */
const EDGES: Record<Ground, Scenery[]> = {
  meadow: [bush, rock(STONE, BUSH), stump, mushrooms, flowers(SNOW.light), tuft(GRASS.light, GRASS.dark), bush, flowers(HOLY.fill)],
  desert: [sandrock, dryShrub, sandrock, tuft(SAND.light, SAND.dark), dryShrub, rock(STONE, null)],
  snow: [iceSpike, cairn, drift, rock(STONE, { fill: SNOW.light, shade: SNOW.shade }), drift, tuft(SNOW.light, SNOW.dark)],  // The later lands borrow the scenery of the land most like them, until they have their own.
  mire: [bush, mushrooms, stump, rock(STONE, BUSH), mushrooms, tuft(GRASS.dark, GRASS.shade)],
  coast: [sandrock, rock(STONE, null), tuft(SAND.light, SAND.dark), sandrock, rock(STONE, null)],
  mine: [cairn, rock(STONE, null), cairn, rock(STONE, null)],
  steppe: [dryShrub, tuft(SAND.light, SAND.dark), dryShrub, sandrock, tuft(SAND.fill, SAND.dark)],
  crypt: [cairn, rock(STONE, null), stump, cairn, mushrooms],
  clock: [cairn, rock(STONE, null), cairn],
  ember: [sandrock, rock(STONE, null), cairn, dryShrub],
};

/**
 * The ground of the arena, the size the arena is: the land's darker tone
 * all round, where nobody can go, and its open ground within. `edge` is
 * how wide that border is. It is put together by a seed, so it is the same
 * picture every time.
 */
export function arenaGround(ground: Ground, w: number, h: number, edge: number): Doc {
  const d = new Doc(`${ground}-arena-${w}`);
  const c = GROUND[ground];
  const dice = new Dice(ground.length * 7919 + w);
  d.flat('land', roundRect(0, 0, w, h, 0), c.around);
  // The open ground, with an edge that wanders a little so that it is a clearing and not a box.
  const pts: Pt[] = [];
  const along = (x0: number, y0: number, x1: number, y1: number, n: number, nx: number, ny: number): void => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const wob = (dice.next() - 0.5) * 16;
      pts.push([x0 + (x1 - x0) * t + nx * wob, y0 + (y1 - y0) * t + ny * wob]);
    }
  };
  const e = edge - 6;
  along(e, e, w - e, e, 9, 0, 1);
  along(w - e, e, w - e, h - e, 7, 1, 0);
  along(w - e, h - e, e, h - e, 9, 0, 1);
  along(e, h - e, e, e, 7, 1, 0);
  const field = smooth(pts);
  d.flat('field-edge', field, c.b);
  d.flat('field', field.scale(0.985, 0.98, w / 2, h / 2), c.a);
  for (let i = 0; i < 26; i++) {
    const x = edge + dice.next() * (w - edge * 2);
    const y = edge + dice.next() * (h - edge * 2);
    const r = 70 + dice.next() * 130;
    if (i % 2 === 0) d.lightOver('patch-lit', blob(dice, x, y, r), 0.2 + dice.next() * 0.14);
    else d.shadeOver('patch-dark', blob(dice, x, y, r), 0.1 + dice.next() * 0.1);
  }
  for (let i = 0; i < 110; i++) speck(d, ground, dice, edge + 20 + dice.next() * (w - edge * 2 - 40), edge + 20 + dice.next() * (h - edge * 2 - 40));
  // Along the edge, back to front.
  const things: Array<{ x: number; y: number; s: number; flip: boolean; draw: Scenery }> = [];
  const set = EDGES[ground];
  const stand = (x: number, y: number): void => {
    things.push({ x, y, s: 0.75 + dice.next() * 0.35, flip: dice.chance(0.5), draw: set[dice.int(set.length)] });
  };
  for (let x = 30; x < w - 20; x += 62 + dice.next() * 40) {
    stand(x, 34 + dice.next() * 8);
    stand(x + 20, h - 4 - dice.next() * 6);
  }
  for (let y = 80; y < h - 40; y += 70 + dice.next() * 40) {
    stand(14 + dice.next() * 8, y);
    stand(w - 14 - dice.next() * 8, y + 24);
  }
  things.sort((a, b) => a.y - b.y);
  for (const t of things) d.at(t.x, t.y, t.s, t.flip, t.draw);
  return d;
}
