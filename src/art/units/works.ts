// More buildings and traps, by the rules of structures.ts: a building is the
// thing it is, shows its side in a roof, a flag, a band or a hung cloth, and
// has one dark opening at the most. A trap shows no side at all.

import type { Doc } from '../kit/draw';
import {
  ARCANE, BONE, BRONZE, BUSH, CLOTH, DARK_CLOTH, DIRT, FIRE, GOLD, HOLY, HOOD_INTERIOR, IRON, LEATHER, LINEN, PINE, STEEL, STONE, VENOM, WOOD, type Material,
} from '../kit/palette';
import { STRAW } from '../kit/heads';
import { FEET, far, rivet, shadow } from '../kit/parts';
import { Path, capsule, circle, ellipse, path, poly, roundRect, smooth, star, type Pt } from '../kit/path';
import type { AttackStyle, PartSpec, UnitArt } from '../kit/unit';
import { part } from './common';
import { note, type UnitRole } from './notes';
import { SANDSTONE, door, flag, planks } from './structures';

const X = 96;
const Y = 180;
const plain = (m: Material): Material => ({ fill: m.fill, shade: m.shade });
const VIOLET: Material = { fill: ARCANE.fill, shade: ARCANE.shade };

function work(id: string, set: string, role: UnitRole, read: string, top: number, style: AttackStyle, muzzle: Pt, parts: PartSpec[]): UnitArt {
  note(id, set, role, read);
  return { id, style, muzzle, top, parts };
}

const ground = (rx: number, ry = 9): PartSpec => part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, rx, ry));

/** Courses of stone: the dark lines between the rows of a wall. */
function courses(c: Doc, x: number, w: number, ys: readonly number[]): void {
  for (const y of ys) c.shadeOver('course', roundRect(x, y, w, 2.6, 0), 0.9);
}

/** A cloth hung by its top edge, with a point cut in its hem. */
function hung(d: Doc, x: number, y: number, w: number, h: number, cloth: Material, mark = false): void {
  d.piece('hung', poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2, y + h], [x, y + h - w * 0.4], [x - w / 2, y + h]]), cloth, {
    shade: 3,
    inner: mark ? (c) => c.piece('mark', poly([[x, y + h * 0.2], [x + w * 0.3, y + h * 0.42], [x, y + h * 0.64], [x - w * 0.3, y + h * 0.42]]), GOLD, { shade: 0 }) : undefined,
  });
}

/** A door of planks: for a building that has a dark opening somewhere else. */
function plankDoor(c: Doc, x: number, y: number, w: number, h: number): void {
  c.piece('door', path().M(x - w / 2, y).L(x - w / 2, y - h + w / 2).Q(x - w / 2, y - h, x, y - h).Q(x + w / 2, y - h, x + w / 2, y - h + w / 2).L(x + w / 2, y).Z(), far(WOOD), {
    shade: 0,
    inner: (k) => k.shadeOver('gap', roundRect(x - 1.2, y - h, 2.4, h, 0), 1),
  });
}

function merlons(x0: number, x1: number, y: number, n: number, tall = 12): Path {
  const w = (x1 - x0) / (n * 2 - 1);
  const pts: [number, number][] = [[x0, y + 6]];
  for (let i = 0; i < n; i++) {
    const a = x0 + i * 2 * w;
    pts.push([a, y - tall], [a + w, y - tall]);
    if (i < n - 1) pts.push([a + w, y], [a + 2 * w, y]);
  }
  pts.push([x1, y + 6]);
  return poly(pts);
}

// ---------------------------------------------------------------- buildings

const gatehouse = work('gatehouse', 'Crownlands', 'building', 'a wall of stone with a barred gate in it, three merlons, a cloth over the arch and a flag', 54, 'slash', [140, 150], [
  ground(52, 10),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('wall', roundRect(X - 44, Y - 76, 88, 76, 3), STONE, {
      shade: 5,
      inner: (c) => {
        courses(c, X - 48, 96, [Y - 20, Y - 40, Y - 60]);
        door(c, X, Y, 38, 50);
        for (const x of [X - 10, X, X + 10]) c.flat('bar', roundRect(x - 1.4, Y - 48, 2.8, 48, 0), IRON.fill);
        for (const y of [Y - 14, Y - 30]) c.flat('rail', roundRect(X - 19, y, 38, 2.8, 0), IRON.fill);
      },
    });
    d.piece('merlons', merlons(X - 48, X + 48, Y - 78, 3), STONE, { shade: 0 });
    hung(d, X, Y - 76, 22, 24, CLOTH[team], true);
  }),
  flag(X, Y - 88, 26),
]);

const magetower = work('magetower', 'Veiled Order', 'building', 'a thin tower of stone under a tall pointed roof, a violet stone turning in the air over it', 6, 'cast', [X, 20], [
  ground(30, 8),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('shaft', poly([[X - 20, Y], [X - 14, Y - 86], [X + 14, Y - 86], [X + 20, Y]]), STONE, {
      shade: 5,
      inner: (c) => {
        courses(c, X - 24, 48, [Y - 24, Y - 46, Y - 66]);
        door(c, X, Y, 16, 26);
      },
    });
    d.piece('ring', roundRect(X - 22, Y - 92, 44, 9, 3), STONE, { shade: 0 });
    d.piece('roof', poly([[X - 26, Y - 90], [X, Y - 146], [X + 26, Y - 90]]), CLOTH[team], {
      shade: 5,
      inner: (c) => c.shadeOver('eave', roundRect(X - 30, Y - 96, 60, 6, 0), 0.9),
    });
  }),
  part('stone', 'extra', 'body', [X, Y - 160], (d) => {
    d.flat('halo', circle(X, Y - 160, 16), ARCANE.light, 0.45);
    d.piece('stone', poly([[X, Y - 174], [X + 9, Y - 160], [X, Y - 146], [X - 9, Y - 160]]), ARCANE, { shade: 3 });
  }, 0.6),
]);

const chapel = work('chapel', 'Crownlands', 'building', 'a small white hall beside a bell tower, the bell in its one arch, both roofed in their side\'s color', 44, 'cast', [X + 30, 100], [
  ground(52, 10),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('hall', roundRect(X - 44, Y - 46, 64, 46, 3), BONE, {
      shade: 5,
      inner: (c) => plankDoor(c, X - 14, Y, 20, 30),
    });
    d.piece('hall-roof', poly([[X - 50, Y - 44], [X - 12, Y - 78], [X + 26, Y - 44]]), CLOTH[team], {
      shade: 5,
      inner: (c) => c.shadeOver('eave', roundRect(X - 54, Y - 50, 84, 6, 0), 0.9),
    });
    d.piece('tower', roundRect(X + 14, Y - 100, 32, 100, 3), STONE, {
      shade: 5,
      inner: (c) => {
        courses(c, X + 10, 40, [Y - 22, Y - 44]);
        door(c, X + 30, Y - 60, 18, 28);
        c.piece('bell', path().M(X + 23, Y - 64).Q(X + 23, Y - 82, X + 30, Y - 82).Q(X + 37, Y - 82, X + 37, Y - 64).Z(), GOLD, { shade: 0 });
      },
    });
    d.piece('spire', poly([[X + 8, Y - 98], [X + 30, Y - 136], [X + 52, Y - 98]]), CLOTH[team], { shade: 5 });
  }),
]);

const windmill = work('windmill', 'Townsfolk', 'building', 'a white mill with four sails of linen that turn, a cap in its side\'s color', 16, 'cast', [X, 80], [
  ground(40, 9),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('mill', poly([[X - 28, Y], [X - 18, Y - 84], [X + 18, Y - 84], [X + 28, Y]]), BONE, {
      shade: 6,
      inner: (c) => {
        courses(c, X - 32, 64, [Y - 40]);
        plankDoor(c, X - 4, Y, 18, 28);
      },
    });
    d.piece('cap', smooth([[X - 24, Y - 82, 'c'], [X - 16, Y - 102], [X, Y - 110], [X + 16, Y - 102], [X + 24, Y - 82, 'c']]), CLOTH[team], { shade: 5 });
  }),
  part('sails', 'extra', 'body', [X + 4, Y - 88], (d) => {
    for (let i = 0; i < 4; i++) {
      const t = (p: Path): Path => p.rotate(24 + i * 90, X + 4, Y - 88);
      d.piece('sail', t(roundRect(X + 7, Y - 146, 15, 44, 1)), LINEN, {
        shade: 0,
        inner: (c) => {
          for (const y of [Y - 136, Y - 124, Y - 112]) c.shadeOver('lath', t(roundRect(X + 5, y, 19, 2, 0)), 0.9);
        },
      });
      d.piece('arm', t(roundRect(X + 1.5, Y - 148, 5, 60, 2)), WOOD, { shade: 0 });
    }
    d.piece('hub', circle(X + 4, Y - 88, 6), IRON, { shade: 0 });
  }, 1.6),
]);

const well = work('well', 'Townsfolk', 'building', 'a ring of stone under a little roof on two posts, a bucket on its rope', 76, 'cast', [X, 110], [
  ground(36, 8),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('post-a', roundRect(X - 26, Y - 78, 7, 56, 2), WOOD, { shade: 0 });
    d.piece('post-b', roundRect(X + 19, Y - 78, 7, 56, 2), WOOD, { shade: 0 });
    d.piece('winch', roundRect(X - 24, Y - 62, 48, 6, 3), WOOD, { shade: 0 });
    d.line('rope', path().M(X, Y - 58).L(X, Y - 46));
    d.piece('bucket', poly([[X - 8, Y - 48], [X + 8, Y - 48], [X + 6, Y - 34], [X - 6, Y - 34]]), WOOD, {
      shade: 0,
      inner: (c) => c.piece('hoop', roundRect(X - 10, Y - 43, 20, 3.4, 0), IRON, { shade: 0 }),
    });
    d.piece('ring', roundRect(X - 28, Y - 28, 56, 28, 7), STONE, {
      shade: 5,
      inner: (c) => courses(c, X - 32, 64, [Y - 16]),
    });
    d.piece('lip', ellipse(X, Y - 28, 28, 7), STONE, {
      shade: 0,
      inner: (c) => c.flat('water', ellipse(X, Y - 28, 21, 4), HOOD_INTERIOR),
    });
    d.piece('roof', poly([[X - 36, Y - 74], [X, Y - 102], [X + 36, Y - 74]]), CLOTH[team], {
      shade: 5,
      inner: (c) => c.shadeOver('eave', roundRect(X - 40, Y - 80, 80, 6, 0), 0.9),
    });
  }),
]);

const marketstall = work('marketstall', 'Townsfolk', 'building', 'a counter of planks under a striped awning, a crate, a sack and a jug on it', 92, 'cast', [X, 120], [
  ground(46, 9),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('post-a', roundRect(X - 38, Y - 80, 6, 50, 2), WOOD, { shade: 0 });
    d.piece('post-b', roundRect(X + 32, Y - 80, 6, 50, 2), WOOD, { shade: 0 });
    d.piece('crate', roundRect(X - 30, Y - 50, 20, 18, 2), WOOD, { shade: 3, inner: (c) => c.shadeOver('slat', roundRect(X - 30, Y - 42, 20, 2, 0), 1) });
    d.piece('sack', smooth([[X - 6, Y - 32, 'c'], [X - 8, Y - 46], [X - 2, Y - 56, 'c'], [X + 6, Y - 56, 'c'], [X + 12, Y - 46], [X + 10, Y - 32, 'c']]), LINEN, { shade: 3 });
    d.piece('jug', smooth([[X + 18, Y - 32, 'c'], [X + 16, Y - 42], [X + 21, Y - 48, 'c'], [X + 21, Y - 54, 'c'], [X + 27, Y - 54, 'c'], [X + 27, Y - 48, 'c'], [X + 32, Y - 42], [X + 30, Y - 32, 'c']]), BRONZE, { shade: 3 });
    d.piece('counter', roundRect(X - 42, Y - 34, 84, 34, 3), WOOD, {
      shade: 5,
      inner: (c) => {
        planks(c, X - 42, X + 42, Y - 36, Y + 2, 12);
        c.piece('top', roundRect(X - 46, Y - 36, 92, 7, 0), far(WOOD), { shade: 0 });
      },
    });
    d.piece('awning', poly([[X - 42, Y - 96], [X + 42, Y - 96], [X + 52, Y - 68], [X - 52, Y - 68]]), CLOTH[team], {
      shade: 0,
      inner: (c) => {
        for (const x of [-30, -6, 18]) c.flat('stripe', poly([[X + x * 0.86, Y - 98], [X + (x + 12) * 0.86, Y - 98], [X + (x + 12) * 1.06, Y - 66], [X + x * 1.06, Y - 66]]), LINEN.fill);
        c.shadeOver('hem', roundRect(X - 54, Y - 74, 108, 8, 0), 0.8);
      },
    });
  }),
]);

const stonewall = work('stonewall', 'Crownlands', 'building', 'a length of stone wall with four merlons and a great cloth hung over its face', 100, 'slash', [140, 150], [
  ground(52, 9),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('wall', roundRect(X - 46, Y - 62, 92, 62, 3), STONE, {
      shade: 5,
      inner: (c) => {
        courses(c, X - 50, 100, [Y - 16, Y - 32, Y - 48]);
        for (const [x, y] of [[X - 24, Y - 62], [X + 20, Y - 62], [X - 2, Y - 46], [X - 30, Y - 30], [X + 26, Y - 30], [X + 2, Y - 14]] as const) c.shadeOver('joint', roundRect(x, y, 2.4, 15, 0), 0.9);
      },
    });
    d.piece('merlons', merlons(X - 50, X + 50, Y - 64, 4), STONE, { shade: 0 });
    hung(d, X, Y - 62, 28, 44, CLOTH[team], true);
  }),
]);

const alarmbell = work('alarmbell', 'Crownlands', 'building', 'a great bell hung in a frame of timber, a ribbon on its beam and a flag over it', 54, 'cast', [X, 120], [
  ground(38, 8),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('post-a', poly([[X - 34, Y], [X - 24, Y - 92], [X - 16, Y - 92], [X - 24, Y]]), WOOD, { shade: 3 });
    d.piece('post-b', poly([[X + 34, Y], [X + 24, Y - 92], [X + 16, Y - 92], [X + 24, Y]]), WOOD, { shade: 3 });
    d.piece('beam', roundRect(X - 36, Y - 100, 72, 10, 4), WOOD, { shade: 0 });
    d.piece('ribbon', poly([[X + 26, Y - 98], [X + 40, Y - 98], [X + 40, Y - 62], [X + 33, Y - 70], [X + 26, Y - 62]]), CLOTH[team], { shade: 3 });
  }),
  flag(X - 28, Y - 98, 24),
  part('bell', 'extra', 'body', [X, Y - 92], (d) => {
    d.piece('clapper', circle(X, Y - 36, 5), IRON, { shade: 0 });
    d.piece('bell', path().M(X - 16, Y - 46).Q(X - 17, Y - 88, X, Y - 88).Q(X + 17, Y - 88, X + 16, Y - 46).L(X + 22, Y - 40).L(X - 22, Y - 40).Z(), GOLD, {
      shade: 5,
      inner: (c) => c.shadeOver('lip', roundRect(X - 24, Y - 50, 48, 4, 0), 0.9),
    });
    d.piece('yoke', roundRect(X - 5, Y - 94, 10, 8, 2), IRON, { shade: 0 });
  }, 1.1),
]);

const scarecrow = work('scarecrow', 'Townsfolk', 'building', 'a coat on a cross of sticks, straw out of its sleeves, a sack for a head under a straw hat', 44, 'slash', [130, 110], [
  ground(26, 7),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('pole', roundRect(X - 3.5, Y - 100, 7, 100, 2), WOOD, { shade: 3 });
    d.piece('straw-a', poly([[X - 34, Y - 92], [X - 50, Y - 96], [X - 44, Y - 88], [X - 52, Y - 82], [X - 42, Y - 80], [X - 46, Y - 72], [X - 34, Y - 76]]), STRAW, { shade: 0 });
    d.piece('straw-b', poly([[X + 34, Y - 92], [X + 50, Y - 96], [X + 44, Y - 88], [X + 52, Y - 82], [X + 42, Y - 80], [X + 46, Y - 72], [X + 34, Y - 76]]), STRAW, { shade: 0 });
    d.piece('coat', poly([[X - 14, Y - 96], [X + 14, Y - 96], [X + 38, Y - 94], [X + 38, Y - 74], [X + 18, Y - 76], [X + 18, Y - 40], [X + 8, Y - 48], [X - 2, Y - 36], [X - 10, Y - 48], [X - 18, Y - 40], [X - 18, Y - 76], [X - 38, Y - 74], [X - 38, Y - 94]]), CLOTH[team], {
      shade: 5,
      inner: (c) => {
        c.piece('patch', roundRect(X + 2, Y - 68, 11, 11, 1).rotate(8, X + 7, Y - 62), LINEN, { shade: 0 });
        c.piece('belt', roundRect(X - 20, Y - 58, 40, 5, 0), LEATHER, { shade: 0 });
      },
    });
  }),
  part('head', 'extra', 'body', [X, Y - 96], (d) => {
    // The sack has one seam down it and nothing else.
    d.piece('sack', smooth([[X - 10, Y - 94, 'c'], [X - 15, Y - 108], [X - 10, Y - 124], [X + 10, Y - 124], [X + 15, Y - 108], [X + 10, Y - 94, 'c']]), LINEN, {
      shade: 4,
      inner: (c) => c.shadeOver('seam', roundRect(X + 2, Y - 126, 2.2, 34, 0), 1),
    });
    d.piece('tie', roundRect(X - 11, Y - 99, 22, 5, 2), LEATHER, { shade: 0 });
    d.piece('brim', ellipse(X, Y - 122, 26, 6), STRAW, { shade: 0 });
    d.piece('crown', smooth([[X - 13, Y - 123, 'c'], [X - 10, Y - 138], [X + 10, Y - 138], [X + 13, Y - 123, 'c']]), STRAW, { shade: 3 });
  }, 0.5),
]);

const REED: Material = { fill: STRAW.shade, shade: DIRT.fill };
const stilthut = work('stilthut', 'Mireborn', 'building', 'a hut of planks on stilts over the water, roofed in reeds, a ladder down, a cloth by its door', 40, 'shoot', [130, 100], [
  ground(44, 9),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('stilt-a', roundRect(X - 30, Y - 58, 7, 58, 2), far(WOOD), { shade: 0 });
    d.piece('stilt-b', roundRect(X + 23, Y - 58, 7, 58, 2), far(WOOD), { shade: 0 });
    d.piece('brace', poly([[X - 26, Y - 8], [X + 22, Y - 52], [X + 26, Y - 48], [X - 22, Y - 4]]), far(WOOD), { shade: 0 });
    for (const y of [Y - 14, Y - 28, Y - 42]) d.piece('rung', roundRect(X + 34, y, 16, 4, 1), WOOD, { shade: 0 });
    d.piece('rail-a', roundRect(X + 32, Y - 60, 4, 60, 2), WOOD, { shade: 0 });
    d.piece('rail-b', roundRect(X + 48, Y - 60, 4, 60, 2), WOOD, { shade: 0 });
    d.piece('deck', roundRect(X - 40, Y - 64, 96, 8, 2), WOOD, { shade: 0 });
    d.piece('wall', roundRect(X - 30, Y - 100, 58, 38, 3), WOOD, {
      shade: 4,
      inner: (c) => {
        planks(c, X - 30, X + 28, Y - 102, Y - 60, 11);
        door(c, X - 8, Y - 62, 18, 28);
      },
    });
    hung(d, X + 14, Y - 96, 14, 26, CLOTH[team]);
    d.piece('roof', poly([[X - 42, Y - 96], [X - 2, Y - 134], [X + 40, Y - 96]]), REED, {
      shade: 5,
      inner: (c) => {
        for (const x of [-22, -8, 6, 20]) c.shadeOver('reed', poly([[X + x * 0.4 - 2, Y - 132], [X + x * 0.4, Y - 132], [X + x * 1.5, Y - 94], [X + x * 1.5 - 3, Y - 94]]), 0.9);
      },
    });
  }),
  flag(X - 2, Y - 132, 20, true),
]);

const sporetower = work('sporetower', 'Mireborn', 'building', 'a mushroom as tall as a tower, a door in its stalk under a little awning, a violet cap', 22, 'cast', [X, 60], [
  ground(46, 9),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('little', smooth([[X + 30, Y, 'c'], [X + 30, Y - 16], [X + 38, Y - 16], [X + 38, Y, 'c']]), BONE, { shade: 0 });
    d.piece('little-cap', path().M(X + 22, Y - 14).Q(X + 34, Y - 34, X + 46, Y - 14).Z(), VIOLET, { shade: 3 });
    d.piece('stalk', smooth([[X - 18, Y, 'c'], [X - 12, Y - 48], [X - 18, Y - 90, 'c'], [X + 18, Y - 90, 'c'], [X + 12, Y - 48], [X + 18, Y, 'c']]), BONE, {
      shade: 5,
      inner: (c) => door(c, X, Y, 18, 28),
    });
    d.piece('awning', poly([[X - 16, Y - 34], [X + 16, Y - 34], [X + 20, Y - 24], [X - 20, Y - 24]]), CLOTH[team], { shade: 0 });
    d.piece('gills', smooth([[X - 50, Y - 82, 'c'], [X, Y - 70], [X + 50, Y - 82, 'c'], [X, Y - 92]]), far(BONE), { shade: 0 });
    d.piece('cap', path().M(X - 54, Y - 82).Q(X - 52, Y - 140, X, Y - 140).Q(X + 52, Y - 140, X + 54, Y - 82).Q(X, Y - 96, X - 54, Y - 82).Z(), VIOLET, {
      shade: 7,
      inner: (c) => {
        // Bands round the cap, not spots: two pale spots over a door would be a face.
        c.lightOver('band-a', path().M(X - 46, Y - 112).Q(X, Y - 128, X + 46, Y - 112).L(X + 44, Y - 106).Q(X, Y - 122, X - 44, Y - 106).Z(), 0.9);
        c.lightOver('shine', smooth([[X - 30, Y - 124], [X - 14, Y - 134], [X - 6, Y - 130], [X - 22, Y - 118]]), 0.9);
      },
    });
  }),
  flag(X + 6, Y - 138, 22),
]);

const furnace = work('furnace', 'Emberforged', 'building', 'a kiln of stone with fire in its one mouth, an iron stack smoking, a flag', 56, 'cast', [X, 130], [
  ground(46, 9),
  part('smoke', 'extra', 'body', [X + 20, Y - 104], (d) => {
    d.flat('smoke-a', circle(X + 24, Y - 118, 10), LINEN.fill, 0.55);
    d.flat('smoke-b', circle(X + 36, Y - 134, 7), LINEN.fill, 0.4);
  }, 0.4),
  part('body', 'body', 'root', FEET, (d) => {
    d.piece('stack', roundRect(X + 8, Y - 106, 20, 50, 3), plain(IRON), {
      shade: 4,
      inner: (c) => c.shadeOver('band', roundRect(X + 4, Y - 92, 28, 4, 0), 1),
    });
    d.flat('glow', ellipse(X - 4, Y - 14, 34, 22), FIRE.light, 0.3);
    d.piece('kiln', smooth([[X - 40, Y, 'c'], [X - 40, Y - 40], [X - 28, Y - 68], [X + 28, Y - 68], [X + 40, Y - 40], [X + 40, Y, 'c']]), STONE, {
      shade: 6,
      inner: (c) => {
        courses(c, X - 44, 88, [Y - 48]);
        door(c, X - 4, Y, 34, 36);
        c.piece('fire', smooth([[X - 16, Y, 'c'], [X - 14, Y - 14], [X - 8, Y - 10], [X - 4, Y - 28, 'c'], [X + 2, Y - 12], [X + 8, Y - 18], [X + 10, Y, 'c']]), FIRE, { shade: 0 });
      },
    });
  }),
  flag(X - 22, Y - 64, 26),
]);

const lighthouse = work('lighthouse', 'Tidewatch', 'building', 'a white tower banded in its side\'s color, a lamp burning in its top, rocks at its foot', 26, 'cast', [X, 60], [
  ground(38, 9),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.flat('beam', circle(X, Y - 116, 30), HOLY.light, 0.35);
    d.piece('tower', poly([[X - 24, Y], [X - 14, Y - 100], [X + 14, Y - 100], [X + 24, Y]]), BONE, {
      shade: 6,
      inner: (c) => {
        c.piece('band-a', roundRect(X - 30, Y - 46, 60, 16, 0), CLOTH[team], { shade: 0 });
        c.piece('band-b', roundRect(X - 30, Y - 88, 60, 14, 0), CLOTH[team], { shade: 0 });
        plankDoor(c, X, Y, 16, 24);
      },
    });
    d.piece('lamp', roundRect(X - 12, Y - 128, 24, 26, 2), { fill: HOLY.light, shade: HOLY.fill }, {
      shade: 0,
      inner: (c) => {
        for (const x of [X - 5, X + 3]) c.piece('bar', roundRect(x, Y - 130, 2.6, 30, 0), IRON, { shade: 0 });
      },
    });
    d.piece('gallery', roundRect(X - 21, Y - 106, 42, 8, 2), plain(IRON), { shade: 0 });
    d.piece('roof', poly([[X - 18, Y - 126], [X, Y - 150], [X + 18, Y - 126]]), CLOTH[team], { shade: 4 });
    d.piece('rock-a', smooth([[X - 40, Y, 'c'], [X - 36, Y - 14], [X - 22, Y - 16], [X - 16, Y, 'c']]), STONE, { shade: 3 });
    d.piece('rock-b', smooth([[X + 14, Y, 'c'], [X + 20, Y - 12], [X + 34, Y - 10], [X + 38, Y, 'c']]), STONE, { shade: 3 });
  }),
]);

const mausoleum = work('mausoleum', 'Hollow Court', 'building', 'a tomb of stone with two pale pillars, a violet light in its one door, a cloth on its lintel, a torn flag', 62, 'cast', [X, 130], [
  ground(52, 10),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('hall', roundRect(X - 36, Y - 64, 72, 58, 2), STONE, {
      shade: 5,
      inner: (c) => {
        door(c, X, Y - 6, 26, 44);
        c.flat('light', ellipse(X, Y - 16, 9, 12), ARCANE.fill, 0.55);
      },
    });
    d.piece('pillar-a', roundRect(X - 36, Y - 64, 10, 58, 2), BONE, { shade: 3 });
    d.piece('pillar-b', roundRect(X + 26, Y - 64, 10, 58, 2), BONE, { shade: 3 });
    d.piece('step', roundRect(X - 46, Y - 8, 92, 8, 2), STONE, { shade: 0 });
    d.piece('gable', poly([[X - 46, Y - 62], [X, Y - 92], [X + 46, Y - 62]]), STONE, {
      shade: 4,
      inner: (c) => c.shadeOver('eave', roundRect(X - 50, Y - 68, 100, 6, 0), 0.9),
    });
    hung(d, X, Y - 64, 22, 20, CLOTH[team]);
  }),
  flag(X, Y - 90, 22, true),
]);

const minehead = work('minehead', 'Stonekin', 'building', 'a hole into a hill of rock, framed in timber, a lamp off the end of its lintel, rails out of it, a flag on the hill', 66, 'slash', [140, 150], [
  ground(54, 10),
  part('body', 'body', 'root', FEET, (d) => {
    d.piece('hill', smooth([[X - 52, Y, 'c'], [X - 46, Y - 40], [X - 22, Y - 68], [X + 16, Y - 72], [X + 42, Y - 46], [X + 52, Y, 'c']]), STONE, {
      shade: 7,
      inner: (c) => {
        door(c, X - 4, Y, 38, 46);
        c.flat('rail-a', poly([[X - 14, Y], [X - 10, Y], [X - 6, Y - 22], [X - 8, Y - 22]]), IRON.fill);
        c.flat('rail-b', poly([[X + 2, Y], [X + 6, Y], [X + 2, Y - 22], [X, Y - 22]]), IRON.fill);
      },
    });
    d.piece('prop-a', roundRect(X - 28, Y - 48, 8, 48, 2), WOOD, { shade: 3 });
    d.piece('prop-b', roundRect(X + 12, Y - 48, 8, 48, 2), WOOD, { shade: 3 });
    d.piece('lintel', roundRect(X - 34, Y - 56, 60, 10, 3), WOOD, { shade: 0 });
    // Its lamp hangs off the end of the lintel: over the middle of the door a round light read as an eye.
    d.line('hook', path().M(X - 38, Y - 48).L(X - 38, Y - 42));
    d.piece('lamp', poly([[X - 43, Y - 42], [X - 33, Y - 42], [X - 34, Y - 28], [X - 42, Y - 28]]), { fill: HOLY.light, shade: HOLY.fill }, { shade: 0 });
    d.piece('lamp-cap', roundRect(X - 45, Y - 45, 14, 4, 1), plain(IRON), { shade: 0 });
  }),
  flag(X + 18, Y - 70, 28),
]);

const groveshrine = work('groveshrine', 'Wildwood', 'building', 'two standing stones with a third laid across them, moss on top, a cloth hung in the gap', 78, 'cast', [X, 110], [
  ground(46, 9),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.flat('glow', ellipse(X, Y - 40, 22, 40), VENOM.light, 0.3);
    d.piece('stone-a', smooth([[X - 38, Y, 'c'], [X - 36, Y - 40], [X - 34, Y - 80, 'c'], [X - 14, Y - 80, 'c'], [X - 16, Y - 40], [X - 14, Y, 'c']]), STONE, { shade: 5 });
    d.piece('stone-b', smooth([[X + 14, Y, 'c'], [X + 16, Y - 40], [X + 14, Y - 80, 'c'], [X + 34, Y - 80, 'c'], [X + 36, Y - 40], [X + 38, Y, 'c']]), STONE, { shade: 5 });
    hung(d, X, Y - 80, 20, 40, CLOTH[team], true);
    d.piece('lintel', smooth([[X - 46, Y - 80, 'c'], [X - 44, Y - 96], [X, Y - 100], [X + 44, Y - 96], [X + 46, Y - 80, 'c']]), STONE, { shade: 4 });
    d.piece('moss', smooth([[X - 44, Y - 94, 'c'], [X - 30, Y - 104], [X - 6, Y - 100], [X + 12, Y - 106], [X + 44, Y - 96, 'c'], [X + 20, Y - 92], [X, Y - 94], [X - 22, Y - 90]]), BUSH, { shade: 0 });
    d.piece('fern', smooth([[X - 44, Y, 'c'], [X - 52, Y - 14], [X - 46, Y - 22, 'c'], [X - 40, Y - 12], [X - 36, Y, 'c']]), PINE, { shade: 0 });
  }),
]);

const sunshrine = work('sunshrine', 'Sunspear', 'building', 'a stepped hill of sandstone with a gold point, a cloth down its stair, a flag', 82, 'cast', [X, 90], [
  ground(52, 10),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.flat('halo', circle(X, Y - 80, 24), HOLY.light, 0.4);
    d.piece('tier-a', roundRect(X - 48, Y - 24, 96, 24, 2), SANDSTONE, { shade: 4 });
    d.piece('tier-b', roundRect(X - 35, Y - 46, 70, 24, 2), SANDSTONE, { shade: 4 });
    d.piece('tier-c', roundRect(X - 22, Y - 66, 44, 22, 2), SANDSTONE, { shade: 4 });
    d.piece('runner', roundRect(X - 8, Y - 66, 16, 66, 0), CLOTH[team], {
      shade: 0,
      inner: (c) => {
        for (const y of [Y - 54, Y - 44, Y - 33, Y - 22, Y - 11]) c.shadeOver('step', roundRect(X - 10, y, 20, 2.4, 0), 1);
      },
    });
    d.piece('point', poly([[X - 15, Y - 64], [X, Y - 92], [X + 15, Y - 64]]), GOLD, { shade: 4 });
  }),
  flag(X + 30, Y - 44, 28),
]);

const yurt = work('yurt', 'Stormriders', 'building', 'a round tent of pale felt, a band and a door flap in its side\'s color, ropes over its roof', 92, 'cast', [X, 130], [
  ground(50, 10),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('crown', roundRect(X - 9, Y - 90, 18, 10, 3), WOOD, { shade: 0 });
    d.piece('roof', path().M(X - 46, Y - 36).Q(X - 34, Y - 76, X, Y - 84).Q(X + 34, Y - 76, X + 46, Y - 36).Z(), LINEN, {
      shade: 6,
      inner: (c) => {
        c.line('rope-a', path().M(X - 6, Y - 84).L(X - 26, Y - 36));
        c.line('rope-b', path().M(X + 6, Y - 84).L(X + 26, Y - 36));
      },
    });
    d.piece('wall', roundRect(X - 42, Y - 38, 84, 38, 6), LINEN, { shade: 5 });
    d.piece('band', roundRect(X - 47, Y - 44, 94, 10, 3), CLOTH[team], { shade: 0 });
    d.piece('flap', roundRect(X - 11, Y - 34, 22, 34, 2), CLOTH[team], {
      shade: 3,
      inner: (c) => c.piece('mark', poly([[X, Y - 26], [X + 6, Y - 18], [X, Y - 10], [X - 6, Y - 18]]), GOLD, { shade: 0 }),
    });
  }),
]);

const pylon = work('pylon', 'Artificers', 'building', 'a mast of bronze wound with three coils of gold, a ball of steel on top with a spark off it, a flag at its foot', 48, 'cast', [X, 70], [
  ground(32, 8),
  flag(X + 22, Y - 10, 34),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('foot', roundRect(X - 24, Y - 14, 48, 14, 4), plain(IRON), {
      shade: 3,
      inner: (c) => {
        for (let i = 0; i < 4; i++) rivet(c, X - 15 + i * 10, Y - 7, 1.6);
      },
    });
    d.piece('mast', poly([[X - 11, Y - 12], [X - 6, Y - 100], [X + 6, Y - 100], [X + 11, Y - 12]]), BRONZE, { shade: 4 });
    d.piece('wrap', roundRect(X - 13, Y - 30, 26, 10, 2), CLOTH[team], { shade: 0 });
    [[48, 38], [66, 32], [84, 26]].forEach(([up, w]) => d.piece('coil', roundRect(X - w / 2, Y - up - 5, w, 10, 5), GOLD, { shade: 3 }));
    d.flat('halo', circle(X, Y - 112, 22), ARCANE.light, 0.4);
    d.piece('ball', circle(X, Y - 112, 13), STEEL, { shade: 4 });
  }),
  part('spark', 'extra', 'body', [X, Y - 112], (d) => {
    d.piece('spark', star(X + 20, Y - 128, 4, 9, 3.4), ARCANE, { shade: 0 });
  }, 1.4),
]);

const altar = work('altar', 'Veiled Order', 'building', 'a block of stone under a cloth, a violet fire in a gold bowl on it, a candle at each end', 80, 'cast', [X, 100], [
  ground(44, 9),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('base', roundRect(X - 38, Y - 10, 76, 10, 2), STONE, { shade: 0 });
    d.piece('block', roundRect(X - 30, Y - 42, 60, 34, 3), STONE, { shade: 5 });
    hung(d, X, Y - 46, 30, 34, CLOTH[team], true);
    d.piece('slab', roundRect(X - 38, Y - 50, 76, 9, 2), STONE, { shade: 0 });
    for (const [x, tall] of [[X - 28, 24], [X + 28, 16]] as const) {
      d.piece('candle', roundRect(x - 3.5, Y - 50 - tall, 7, tall, 1), BONE, { shade: 0 });
      d.piece('light', smooth([[x - 3, Y - 50 - tall, 'c'], [x - 4, Y - 56 - tall], [x, Y - 62 - tall, 'c'], [x + 4, Y - 56 - tall], [x + 3, Y - 50 - tall, 'c']]), FIRE, { shade: 0 });
    }
    d.flat('halo', circle(X, Y - 76, 22), ARCANE.light, 0.4);
    d.piece('fire', smooth([[X - 10, Y - 58, 'c'], [X - 12, Y - 72], [X - 4, Y - 78], [X, Y - 98, 'c'], [X + 5, Y - 80], [X + 12, Y - 72], [X + 10, Y - 58, 'c']]), ARCANE, { shade: 0 });
    d.piece('bowl', path().M(X - 14, Y - 60).L(X + 14, Y - 60).Q(X + 12, Y - 48, X, Y - 48).Q(X - 12, Y - 48, X - 14, Y - 60).Z(), GOLD, { shade: 3 });
  }),
]);

// ---------------------------------------------------------------- traps

const caltrops = work('caltrops', 'Crownlands', 'trap', 'iron stars strewn on the ground, each with a point up', 146, 'slash', [X, 170], [
  ground(34, 7),
  part('body', 'body', 'root', FEET, (d) => {
    // Three, and big enough that the steel is seen: more of them, smaller, were a dark tangle.
    [[-22, -2, 13, 12], [18, 0, 14, 38], [-2, -13, 11, 60]].forEach(([dx, dy, r, turn], i) => {
      const x = X + dx;
      const y = Y - 9 + dy;
      d.piece(`star-${i}`, star(x, y, 4, r + 4, r * 0.42).rotate(turn, x, y), STEEL, { shade: 0 });
      d.piece(`point-${i}`, poly([[x - 4.5, y + 2], [x, y - r - 9], [x + 4.5, y + 2]]), STEEL, { shade: 3 });
    });
  }),
]);

const TAR: Material = { fill: DARK_CLOTH.shade, shade: DARK_CLOTH.shade };
const tarpit = work('tarpit', 'Emberforged', 'trap', 'a black pool with a bone standing in it and three bubbles', 140, 'slash', [X, 170], [
  ground(38, 8),
  part('body', 'body', 'root', FEET, (d) => {
    d.piece('bone', capsule(X + 14, Y - 8, X + 24, Y - 34, 6), BONE, { shade: 0 });
    d.piece('knob', circle(X + 25, Y - 36, 5.5), BONE, { shade: 0 });
    d.piece('pool', smooth([[X - 38, Y - 6], [X - 28, Y - 15], [X - 6, Y - 13], [X + 10, Y - 17], [X + 34, Y - 12], [X + 38, Y - 3], [X + 18, Y + 3], [X - 4, Y + 1], [X - 26, Y + 4]]), TAR, {
      shade: 0,
      inner: (c) => {
        c.lightOver('sheen', smooth([[X - 28, Y - 9], [X - 14, Y - 12], [X - 4, Y - 10], [X - 16, Y - 6]]), 0.5);
        // Three bubbles of three sizes, in a line that climbs: not two side by side.
        c.lightOver('bubble-a', circle(X - 14, Y - 1, 3.6), 0.6);
        c.lightOver('bubble-b', circle(X - 2, Y - 5, 2.6), 0.6);
        c.lightOver('bubble-c', circle(X + 6, Y - 10, 1.8), 0.6);
      },
    });
  }),
]);

const powderkeg = work('powderkeg', 'Tidewatch', 'trap', 'a barrel hooped in iron with a fuse burning down to it', 110, 'slash', [X, 150], [
  ground(26, 7),
  part('body', 'body', 'root', FEET, (d) => {
    d.line('fuse', path().M(X + 4, Y - 44).Q(X + 6, Y - 58, X + 18, Y - 60));
    d.flat('glow', circle(X + 21, Y - 62, 15), FIRE.light, 0.5);
    d.piece('spark', star(X + 21, Y - 62, 5, 12, 5.5), FIRE, { shade: 0 });
    d.piece('keg', path().M(X - 16, Y).Q(X - 23, Y - 22, X - 16, Y - 44).L(X + 16, Y - 44).Q(X + 23, Y - 22, X + 16, Y).Z(), WOOD, {
      shade: 5,
      inner: (c) => {
        for (const x of [X - 7, X + 5]) c.shadeOver('stave', roundRect(x, Y - 46, 2.2, 48, 0), 0.9);
        for (const y of [Y - 36, Y - 12]) c.piece('hoop', roundRect(X - 26, y, 52, 6, 0), IRON, { shade: 0 });
      },
    });
    d.piece('lid', ellipse(X, Y - 44, 16, 4.5), far(WOOD), { shade: 0 });
  }),
]);

const nettrap = work('nettrap', 'Mireborn', 'trap', 'a net spread flat with stones on its edge and a cord off to a peg', 150, 'slash', [X, 170], [
  ground(38, 8),
  part('body', 'body', 'root', FEET, (d) => {
    d.line('cord', path().M(X + 30, Y - 8).L(X + 46, Y - 4));
    d.piece('peg', roundRect(X + 44, Y - 14, 6, 13, 2), WOOD, { shade: 0 });
    d.piece('net', ellipse(X, Y - 7, 33, 10), { fill: STRAW.fill, shade: STRAW.shade }, {
      shade: 0,
      inner: (c) => {
        for (let i = -3; i <= 3; i++) {
          c.shadeOver('strand-a', poly([[X + i * 11 - 12, Y - 19], [X + i * 11 - 10, Y - 19], [X + i * 11 + 12, Y + 5], [X + i * 11 + 10, Y + 5]]), 1.3);
          c.shadeOver('strand-b', poly([[X + i * 11 + 10, Y - 19], [X + i * 11 + 12, Y - 19], [X + i * 11 - 10, Y + 5], [X + i * 11 - 12, Y + 5]]), 1.3);
        }
      },
    });
    for (const [dx, dy] of [[-32, -1], [-16, 8], [6, 9], [26, 4], [-12, -16], [18, -14]] as const) {
      d.piece('weight', ellipse(X + dx, Y - 7 + dy, 6.5, 5), STONE, { shade: 0 });
    }
  }),
]);

const embervent = work('embervent', 'Emberforged', 'trap', 'a crack in the ground with fire in it and three flames out of it', 126, 'slash', [X, 160], [
  ground(38, 8),
  part('body', 'body', 'root', FEET, (d) => {
    d.flat('glow', ellipse(X, Y - 8, 40, 16), FIRE.light, 0.4);
    d.piece('scorch', smooth([[X - 40, Y - 6], [X - 22, Y - 16], [X + 4, Y - 14], [X + 30, Y - 17], [X + 40, Y - 7], [X + 22, Y + 3], [X - 8, Y + 1], [X - 28, Y + 4]]), plain(IRON), { shade: 0 });
    d.piece('crack', poly([[X - 32, Y - 6], [X - 18, Y - 12], [X - 6, Y - 7], [X + 8, Y - 13], [X + 20, Y - 8], [X + 32, Y - 10], [X + 22, Y - 2], [X + 8, Y - 6], [X - 6, Y], [X - 20, Y - 4]]), FIRE, { shade: 0 });
    for (const [dx, h] of [[-16, 16], [2, 30], [18, 20]] as const) {
      const x = X + dx;
      d.piece('flame', smooth([[x - 6, Y - 6, 'c'], [x - 7, Y - 8 - h * 0.4], [x, Y - 8 - h, 'c'], [x + 7, Y - 8 - h * 0.4], [x + 6, Y - 6, 'c']]), FIRE, { shade: 0 });
    }
  }),
]);

const MUD: Material = { fill: DIRT.fill, shade: LEATHER.shade };
const quagmire = work('quagmire', 'Mireborn', 'trap', 'a patch of mud with reeds behind it and somebody\'s boot left in it', 116, 'slash', [X, 170], [
  ground(40, 8),
  part('reeds', 'extra', 'body', [X - 20, Y - 10], (d) => {
    for (const [dx, tall] of [[-28, 38], [-18, 50], [-8, 34]] as const) {
      d.piece('stalk', roundRect(X + dx - 1.5, Y - 10 - tall, 3, tall, 1), BUSH, { shade: 0 });
      d.piece('head', capsule(X + dx, Y - 12 - tall, X + dx, Y - 24 - tall, 6), LEATHER, { shade: 0 });
    }
  }, 0.7),
  part('body', 'body', 'root', FEET, (d) => {
    d.piece('mud', smooth([[X - 40, Y - 6], [X - 26, Y - 16], [X, Y - 13], [X + 24, Y - 17], [X + 40, Y - 8], [X + 26, Y + 3], [X - 2, Y + 1], [X - 26, Y + 4]]), MUD, {
      shade: 4,
      inner: (c) => {
        c.lightOver('wet', smooth([[X - 26, Y - 11], [X - 10, Y - 13], [X - 4, Y - 10], [X - 18, Y - 7]]), 0.6);
        c.shadeOver('ripple', ellipse(X + 14, Y - 6, 12, 3.4).add(ellipse(X + 14, Y - 6, 9, 2)), 1);
      },
    });
    // The boot goes in toe first, so its sole is up.
    d.piece('boot', smooth([[X + 6, Y - 6, 'c'], [X + 8, Y - 26], [X + 4, Y - 32, 'c'], [X + 22, Y - 32, 'c'], [X + 20, Y - 22], [X + 22, Y - 6, 'c']]), LEATHER, {
      shade: 3,
      inner: (c) => c.piece('sole', roundRect(X + 2, Y - 36, 22, 6, 2), far(LEATHER), { shade: 0 }),
    });
  }),
]);

const barrowstone = work('barrowstone', 'Hollow Court', 'trap', 'a leaning stone on a low mound with one sign cut in it, glowing violet', 96, 'slash', [X, 150], [
  ground(36, 8),
  part('body', 'body', 'root', FEET, (d) => {
    d.piece('mound', smooth([[X - 36, Y, 'c'], [X - 28, Y - 12], [X, Y - 16], [X + 28, Y - 12], [X + 36, Y, 'c']]), MUD, { shade: 3 });
    d.flat('glow', circle(X + 2, Y - 46, 22), ARCANE.light, 0.4);
    const t = (p: Path): Path => p.rotate(9, X, Y - 10);
    d.piece('stone', t(path().M(X - 16, Y - 8).L(X - 16, Y - 60).Q(X - 16, Y - 78, X, Y - 78).Q(X + 16, Y - 78, X + 16, Y - 60).L(X + 16, Y - 8).Z()), STONE, {
      shade: 5,
      inner: (c) => {
        // The sign: an upright and one arm. Lines only.
        c.flat('sign-a', t(roundRect(X - 2, Y - 62, 4, 30, 1)), ARCANE.fill);
        c.flat('sign-b', t(poly([[X, Y - 56], [X + 10, Y - 48], [X + 10, Y - 44], [X, Y - 51]])), ARCANE.fill);
      },
    });
    d.piece('moss', smooth([[X - 22, Y - 8, 'c'], [X - 14, Y - 18], [X - 2, Y - 12], [X + 8, Y - 16], [X + 16, Y - 6, 'c']]), BUSH, { shade: 0 });
  }),
]);

const runemine = work('runemine', 'Veiled Order', 'trap', 'a ring of small stones round a sign that glows violet on the ground', 150, 'slash', [X, 170], [
  ground(36, 8),
  part('body', 'body', 'root', FEET, (d) => {
    d.flat('glow', ellipse(X, Y - 8, 38, 15), ARCANE.light, 0.45);
    d.piece('disc', ellipse(X, Y - 8, 26, 9), { fill: ARCANE.light, shade: ARCANE.fill }, {
      shade: 3,
      inner: (c) => {
        // The sign: three lines through one point.
        c.flat('sign-a', roundRect(X - 16, Y - 9.4, 32, 2.8, 1), ARCANE.shade);
        c.flat('sign-b', poly([[X - 9, Y - 14], [X - 6.5, Y - 15], [X + 9, Y - 2], [X + 6.5, Y - 1]]), ARCANE.shade);
        c.flat('sign-c', poly([[X + 9, Y - 14], [X + 6.5, Y - 15], [X - 9, Y - 2], [X - 6.5, Y - 1]]), ARCANE.shade);
      },
    });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.283 + 0.5;
      d.piece('pebble', ellipse(X + Math.cos(a) * 34, Y - 8 + Math.sin(a) * 12, 7, 5), STONE, { shade: 0 });
    }
  }),
]);

const pitfall = work('pitfall', 'Wildwood', 'trap', 'a hole in the ground under a few branches and leaves', 150, 'slash', [X, 170], [
  ground(36, 8),
  part('body', 'body', 'root', FEET, (d) => {
    d.piece('rim', ellipse(X, Y - 7, 34, 11), MUD, {
      shade: 0,
      inner: (c) => c.flat('hole', ellipse(X, Y - 6, 27, 7.5), HOOD_INTERIOR),
    });
    d.piece('branch-a', capsule(X - 34, Y - 2, X + 30, Y - 14, 5), WOOD, { shade: 0 });
    d.piece('branch-b', capsule(X - 26, Y - 15, X + 36, Y - 3, 5), WOOD, { shade: 0 });
    d.piece('branch-c', capsule(X - 6, Y - 20, X + 4, Y + 4, 4.4), far(WOOD), { shade: 0 });
    for (const [dx, dy, turn] of [[-20, -10, -20], [0, -4, 30], [20, -12, 10], [-8, -16, 70], [14, -1, -40]] as const) {
      const x = X + dx;
      const y = Y - 2 + dy;
      d.piece('leaf', smooth([[x - 9, y, 'c'], [x, y - 5], [x + 9, y, 'c'], [x, y + 5]]).rotate(turn, x, y), BUSH, { shade: 0 });
    }
  }),
]);

export const WORKS_ART: UnitArt[] = [
  gatehouse, magetower, chapel, windmill, well, marketstall, stonewall, alarmbell, scarecrow, stilthut,
  sporetower, furnace, lighthouse, mausoleum, minehead, groveshrine, sunshrine, yurt, pylon, altar,
  caltrops, tarpit, powderkeg, nettrap, embervent, quagmire, barrowstone, runemine, pitfall,
];
