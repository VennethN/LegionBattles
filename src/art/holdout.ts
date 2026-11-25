// The pictures Lastander has that the kit did not: what a hero carries,
// drawn by itself so that it can float at their side; the things the camp
// sells; a mark for each of a hero's stats; and the ground of the arena.
// All of it is drawn with the kit's own pieces, by its rules.

import { Dice } from './kit/dice';
import { Doc } from './kit/draw';
import { hawk, keg } from './kit/gear';
import {
  ARCANE, BONE, BRONZE, BUSH, CLOTH, DARK_CLOTH, DIRT, FIRE, FROST, GOLD, GRASS, HOLY, IRON, LEATHER, LINEN, RUBY, SAND, SNOW, STEEL, STONE, VENOM, WOOD,
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
};

/** The game's own small pictures, beside the kit's. */
export function holdoutIcons(): IconArt[] {
  return Object.entries(ICONS).map(([name, draw]) => ({ name, width: 48, height: 48, origin: [0.5, 0.5] as [number, number], draw }));
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
  snow: [iceSpike, cairn, drift, rock(STONE, { fill: SNOW.light, shade: SNOW.shade }), drift, tuft(SNOW.light, SNOW.dark)],
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
