// The structures: buildings and traps. A building stands where it is put and a
// trap lies there, so their art is a ground shadow, the thing itself, and a
// flag that stirs if it has one. Each is drawn as the thing it is: a tower is
// a tower, a tent is a tent, a trap is an iron plate with its spikes up.
//
// A building has one door or one slit, and never two openings side by side:
// two dark holes over a third would be a face, and nothing here has one.

import type { Doc } from '../kit/draw';
import {
  BONE, BUSH, CLOTH, DIRT, FIRE, FROST, GOLD, HOOD_INTERIOR, IRON, LEATHER, LINEN, OUTLINE, PINE, SAND, SNOW, STEEL, STONE, WOOD,
  type Accent, type Material,
} from '../kit/palette';
import { FEET, far, rivet, shadow } from '../kit/parts';
import { capsule, circle, ellipse, path, poly, roundRect, smooth, type Pt } from '../kit/path';
import type { AttackStyle, PartSpec, UnitArt } from '../kit/unit';
import { part } from './common';

const X = 96;
const Y = 180;
export const SNOWCAP: Material = { fill: SNOW.light, shade: SNOW.shade };
export const SANDSTONE: Material = { fill: SAND.dark, shade: DIRT.fill };

export function structure(id: string, top: number, style: AttackStyle, muzzle: Pt, parts: PartSpec[]): UnitArt {
  return { id, style, muzzle, top, parts };
}

/** A flag on a staff, its foot at (x, y): the one part of a building that moves. */
export function flag(x: number, y: number, tall: number, ragged = false): PartSpec {
  return part('flag', 'extra', 'body', [x, y], (d, team) => {
    d.piece('staff', roundRect(x - 2.5, y - tall, 5, tall, 2), WOOD, { shade: 0 });
    const top = y - tall;
    const cloth = ragged
      ? poly([[x + 2, top + 1], [x + 26, top + 5], [x + 18, top + 11], [x + 27, top + 16], [x + 15, top + 19], [x + 2, top + 19]])
      : poly([[x + 2, top + 1], [x + 28, top + 6], [x + 20, top + 11], [x + 28, top + 16], [x + 2, top + 20]]);
    d.piece('cloth', cloth, CLOTH[team], { shade: 3 });
    d.piece('knob', circle(x, top - 1, 3.5), GOLD, { shade: 0 });
  }, 0.8);
}

/** Planks: the dark lines between the boards of a timber wall. */
export function planks(c: Doc, x0: number, x1: number, y0: number, y1: number, step = 11): void {
  for (let x = x0 + step; x < x1 - 2; x += step) c.shadeOver('plank', roundRect(x - 1.2, y0, 2.4, y1 - y0, 0), 0.9);
}

/** A door: one arch of shadow. */
export function door(c: Doc, x: number, y: number, w: number, h: number): void {
  c.flat('door', path().M(x - w / 2, y).L(x - w / 2, y - h + w / 2).Q(x - w / 2, y - h, x, y - h).Q(x + w / 2, y - h, x + w / 2, y - h + w / 2).L(x + w / 2, y).Z(), HOOD_INTERIOR);
}

// ------------------------------------------------------------ the Crownlands

/** A timber tower with a walled top, one slit to shoot from, and a roof in its side's color. */
const watchtower = structure('watchtower', 44, 'shoot', [118, 108], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 40, 9)),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('leg-a', poly([[X - 24, Y], [X - 15, Y - 52], [X - 8, Y - 52], [X - 15, Y]]), WOOD, { shade: 3 });
    d.piece('leg-b', poly([[X + 24, Y], [X + 15, Y - 52], [X + 8, Y - 52], [X + 15, Y]]), WOOD, { shade: 3 });
    d.piece('brace', poly([[X - 17, Y - 9], [X + 15, Y - 45], [X + 17, Y - 41], [X - 15, Y - 5]]), far(WOOD), { shade: 0 });
    d.piece('deck', roundRect(X - 27, Y - 59, 54, 10, 2), WOOD, { shade: 0 });
    d.piece('wall', roundRect(X - 22, Y - 85, 44, 28, 2), WOOD, {
      shade: 4,
      inner: (c) => {
        planks(c, X - 22, X + 22, Y - 86, Y - 56);
        c.flat('slit', roundRect(X + 4, Y - 78, 16, 9, 3), HOOD_INTERIOR);
      },
    });
    d.piece('roof', poly([[X - 31, Y - 83], [X, Y - 113], [X + 31, Y - 83]]), CLOTH[team], {
      shade: 5,
      inner: (c) => c.shadeOver('eave', roundRect(X - 34, Y - 89, 68, 6, 0), 0.9),
    });
  }),
  flag(X, Y - 111, 24),
]);

/** A hall of stone with one door and a roof in its side's color: the Militia come out of it. */
const barracks = structure('barracks', 60, 'slash', [130, 150], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 50, 10)),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('wall', roundRect(X - 38, Y - 50, 76, 50, 3), STONE, {
      shade: 5,
      inner: (c) => {
        for (const y of [Y - 16, Y - 33]) c.shadeOver('course', roundRect(X - 42, y, 84, 2.6, 0), 0.9);
        door(c, X, Y, 26, 36);
        c.lightOver('step', roundRect(X - 16, Y - 4, 32, 4, 0), 0.6);
      },
    });
    d.piece('roof', poly([[X - 46, Y - 48], [X, Y - 88], [X + 46, Y - 48]]), CLOTH[team], {
      shade: 6,
      inner: (c) => {
        c.shadeOver('eave', roundRect(X - 50, Y - 55, 100, 7, 0), 0.9);
        c.shadeOver('tile-a', poly([[X - 22, Y - 68], [X + 22, Y - 68], [X + 25, Y - 65], [X - 25, Y - 65]]), 0.7);
      },
    });
    // The arms it musters under: a shield over the door.
    d.piece('shield', smooth([[X - 9, Y - 62, 'c'], [X, Y - 65], [X + 9, Y - 62, 'c'], [X + 9, Y - 53], [X, Y - 45, 'c'], [X - 9, Y - 53]]), GOLD, { shade: 3 });
  }),
  flag(X, Y - 86, 22),
]);

/** A great banner hung from a crossbar on a stone foot. */
const warbanner = structure('warbanner', 44, 'cast', [X, 70], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 26, 7)),
  part('body', 'body', 'root', FEET, (d) => {
    d.piece('foot', smooth([[X - 20, Y, 'c'], [X - 16, Y - 12], [X + 16, Y - 12], [X + 20, Y, 'c']]), STONE, { shade: 4 });
    d.piece('pole', roundRect(X - 4, Y - 132, 8, 124, 3), WOOD, { shade: 3 });
    d.piece('bar', roundRect(X - 26, Y - 126, 52, 7, 3), WOOD, { shade: 0 });
    d.piece('finial', poly([[X, Y - 146], [X + 7, Y - 134], [X, Y - 128], [X - 7, Y - 134]]), GOLD, { shade: 3 });
  }),
  part('cloth', 'extra', 'body', [X, Y - 122], (d, team) => {
    d.piece('cloth', poly([[X - 22, Y - 122], [X + 22, Y - 122], [X + 22, Y - 62], [X + 11, Y - 72], [X, Y - 58], [X - 11, Y - 72], [X - 22, Y - 62]]), CLOTH[team], {
      shade: 5,
      inner: (c) => {
        c.lightOver('fold', roundRect(X - 10, Y - 124, 6, 70, 0), 0.6);
        c.shadeOver('fold-b', roundRect(X + 6, Y - 124, 4, 70, 0), 0.6);
      },
    });
    d.piece('mark', poly([[X, Y - 108], [X + 10, Y - 96], [X, Y - 84], [X - 10, Y - 96]]), GOLD, { shade: 3 });
  }, 0.35),
]);

/** A wall of pointed stakes, bound together. */
const palisade = structure('palisade', 96, 'slash', [130, 140], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 46, 8)),
  part('body', 'body', 'root', FEET, (d, team) => {
    [-33, -11, 11, 33].forEach((dx, i) => {
      const x = X + dx;
      const h = 70 + (i % 2) * 9;
      d.piece(`stake-${i}`, poly([[x - 10, Y], [x - 10, Y - h + 14], [x, Y - h], [x + 10, Y - h + 14], [x + 10, Y]]), WOOD, {
        shade: 4,
        inner: (c) => {
          c.shadeOver('bark', capsule(x - 3, Y - 8, x - 3, Y - h + 22, 1.8), 1);
          c.lightOver('cut', poly([[x - 10, Y - h + 14], [x, Y - h], [x, Y - h + 12]]), 0.7);
        },
      });
    });
    d.piece('binding-a', roundRect(X - 46, Y - 52, 92, 8, 3), LEATHER, { shade: 0 });
    d.piece('binding-b', roundRect(X - 46, Y - 24, 92, 8, 3), LEATHER, { shade: 0 });
    // Whose wall it is: a ribbon tied to one stake.
    d.piece('ribbon', poly([[X + 22, Y - 56], [X + 42, Y - 60], [X + 38, Y - 52], [X + 44, Y - 44], [X + 24, Y - 44]]), CLOTH[team], { shade: 3 });
  }),
]);

// ------------------------------------------------------------ Thornwood

/** A crow's nest on one pole, with a ladder up it. */
const lookout = structure('lookout', 46, 'shoot', [114, 86], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 30, 8)),
  part('body', 'body', 'root', FEET, (d) => {
    d.line('stay-a', path().M(X - 34, Y).L(X - 4, Y - 78));
    d.line('stay-b', path().M(X + 34, Y).L(X + 4, Y - 78));
    d.piece('pole', roundRect(X - 6, Y - 100, 12, 100, 4), WOOD, {
      shade: 4,
      inner: (c) => {
        for (let y = Y - 14; y > Y - 80; y -= 14) c.shadeOver('rung', roundRect(X - 8, y, 16, 3, 0), 1.2);
      },
    });
    d.piece('nest', poly([[X - 24, Y - 106], [X + 24, Y - 106], [X + 18, Y - 78], [X - 18, Y - 78]]), LEATHER, {
      shade: 4,
      inner: (c) => {
        c.shadeOver('weave-a', roundRect(X - 28, Y - 97, 56, 2.6, 0), 1);
        c.shadeOver('weave-b', roundRect(X - 28, Y - 88, 56, 2.6, 0), 1);
        c.flat('gap', roundRect(X + 4, Y - 103, 16, 8, 3), HOOD_INTERIOR);
      },
    });
    d.piece('rim', roundRect(X - 27, Y - 110, 54, 7, 3), WOOD, { shade: 0 });
  }),
  flag(X - 14, Y - 108, 26, true),
]);

/** A raider's tent, patched, its flap open on the dark. */
const raidertent = structure('raidertent', 72, 'slash', [130, 150], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 50, 10)),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('tent', poly([[X - 46, Y], [X - 2, Y - 66], [X + 42, Y]]), CLOTH[team], {
      shade: 6,
      inner: (c) => {
        c.flat('flap', poly([[X - 14, Y], [X - 2, Y - 34], [X + 10, Y]]), HOOD_INTERIOR);
        c.shadeOver('seam', poly([[X - 2, Y - 66], [X + 1, Y - 66], [X + 22, Y], [X + 17, Y]]), 0.8);
        c.lightOver('panel', poly([[X - 40, Y], [X - 6, Y - 54], [X - 20, Y]]), 0.5);
        c.shadeOver('patch', roundRect(X + 14, Y - 28, 13, 11, 2), 0.9);
      },
    });
    d.piece('peg-a', roundRect(X - 52, Y - 8, 6, 9, 2), WOOD, { shade: 0 });
    d.piece('peg-b', roundRect(X + 44, Y - 8, 6, 9, 2), WOOD, { shade: 0 });
  }),
  flag(X - 2, Y - 64, 22, true),
]);

/** A ring of thorn wound on the ground. */
const bramblesnare = structure('bramblesnare', 150, 'slash', [X, 170], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 30, 7)),
  part('body', 'body', 'root', FEET, (d) => {
    const ring = ellipse(X, Y - 8, 30, 11).add(ellipse(X, Y - 8, 19, 5));
    d.piece('vine', ring, { fill: PINE.fill, shade: PINE.shade }, { shade: 0, holes: true });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 6.283 + 0.3;
      const cx = X + Math.cos(a) * 26;
      const cy = Y - 8 + Math.sin(a) * 9;
      d.piece(`thorn-${i}`, poly([[cx - 4, cy + 2], [cx + Math.cos(a) * 9, cy - 9 + Math.sin(a) * 4], [cx + 4, cy + 2]]), BUSH, { shade: 0 });
    }
  }),
]);

// ------------------------------------------------------------ the dunes

function orb(d: Doc, x: number, y: number, glow: Accent): void {
  d.flat('halo', circle(x, y, 16), glow.light, 0.45);
  d.piece('orb', circle(x, y, 10), glow, { shade: 3 });
  d.glint('glint', circle(x - 3, y - 3, 2.6));
}

/** A pillar of sandstone with fire held over it. */
const sunobelisk = structure('sunobelisk', 46, 'cast', [X, 66], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 30, 8)),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('foot', roundRect(X - 24, Y - 12, 48, 12, 2), SANDSTONE, { shade: 3 });
    d.piece('pillar', poly([[X - 16, Y - 10], [X - 11, Y - 86], [X, Y - 100], [X + 11, Y - 86], [X + 16, Y - 10]]), SANDSTONE, {
      shade: 5,
      inner: (c) => {
        c.lightOver('face', poly([[X - 16, Y - 10], [X - 11, Y - 86], [X, Y - 100], [X, Y - 10]]), 0.4);
        // What is cut in it: lines and a sun, not a face.
        for (const y of [Y - 30, Y - 44]) c.shadeOver('cut', roundRect(X - 8, y, 16, 2.6, 0), 1.1);
        c.piece('band', roundRect(X - 20, Y - 76, 40, 9, 0), CLOTH[team], { shade: 0 });
      },
    });
    orb(d, X, Y - 116, FIRE);
  }),
]);

/** A round pavilion, striped, with a gold finial. */
const wartent = structure('wartent', 78, 'slash', [130, 150], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 50, 10)),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('wall', smooth([[X - 38, Y, 'c'], [X - 36, Y - 40, 'c'], [X + 36, Y - 40, 'c'], [X + 38, Y, 'c']]), LINEN, {
      shade: 5,
      inner: (c) => {
        for (const x of [X - 30, X - 4, X + 22]) c.piece('stripe', roundRect(x, Y - 46, 9, 50, 0), CLOTH[team], { shade: 0 });
        door(c, X + 2, Y, 22, 30);
      },
    });
    d.piece('roof', smooth([[X - 44, Y - 38, 'c'], [X - 20, Y - 58], [X, Y - 82, 'c'], [X + 20, Y - 58], [X + 44, Y - 38, 'c']]), CLOTH[team], {
      shade: 5,
      inner: (c) => c.shadeOver('eave', roundRect(X - 48, Y - 45, 96, 7, 0), 0.9),
    });
    d.piece('finial', circle(X, Y - 84, 5), GOLD, { shade: 0 });
  }),
  flag(X, Y - 86, 20),
]);

/** A pit of coals ringed with stones. */
const firepit = structure('firepit', 150, 'slash', [X, 170], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 32, 7)),
  part('body', 'body', 'root', FEET, (d) => {
    d.flat('glow', ellipse(X, Y - 8, 36, 14), FIRE.light, 0.4);
    d.piece('pit', ellipse(X, Y - 7, 24, 9), { fill: IRON.shade, shade: OUTLINE }, {
      shade: 0,
      inner: (c) => {
        for (const [x, y, r] of [[X - 10, Y - 8, 5], [X + 4, Y - 6, 6], [X + 13, Y - 10, 4], [X - 2, Y - 11, 4]] as const) c.flat('coal', circle(x, y, r), FIRE.fill);
        for (const [x, y] of [[X - 9, Y - 9], [X + 5, Y - 7]] as const) c.flat('coal-hot', circle(x, y, 2.4), FIRE.light);
      },
    });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.283 + 0.5;
      d.piece(`stone-${i}`, ellipse(X + Math.cos(a) * 27, Y - 7 + Math.sin(a) * 10, 6.5, 4.5), SANDSTONE, { shade: 0 });
    }
  }),
]);

// ------------------------------------------------------------ the frost

/** Shards of ice standing as one spire, with cold held over them. */
const frostspire = structure('frostspire', 42, 'cast', [X, 62], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 30, 8)),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('shard-a', poly([[X - 26, Y], [X - 16, Y - 58], [X - 4, Y]]), FROST, { shade: 3 });
    d.piece('shard-b', poly([[X + 6, Y], [X + 18, Y - 50], [X + 26, Y]]), FROST, { shade: 3 });
    d.piece('spire', poly([[X - 14, Y], [X, Y - 102], [X + 14, Y]]), FROST, {
      shade: 5,
      inner: (c) => c.lightOver('face', poly([[X - 14, Y], [X, Y - 102], [X - 1, Y]]), 0.9),
    });
    d.piece('band', roundRect(X - 22, Y - 22, 44, 9, 3), CLOTH[team], { shade: 0 });
    orb(d, X, Y - 120, FROST);
  }),
]);

/** A low hall under a steep roof heavy with snow, its beams crossed at the peak. */
const longhouse = structure('longhouse', 66, 'slash', [130, 150], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 54, 10)),
  part('body', 'body', 'root', FEET, (d, team) => {
    d.piece('wall', roundRect(X - 40, Y - 36, 80, 36, 3), WOOD, {
      shade: 4,
      inner: (c) => {
        planks(c, X - 40, X + 40, Y - 38, Y + 2, 12);
        door(c, X, Y, 24, 30);
      },
    });
    d.piece('beam-a', capsule(X - 30, Y - 46, X + 12, Y - 100, 7), WOOD, { shade: 0 });
    d.piece('beam-b', capsule(X + 30, Y - 46, X - 12, Y - 100, 7), WOOD, { shade: 0 });
    d.piece('roof', poly([[X - 50, Y - 34], [X, Y - 86], [X + 50, Y - 34]]), SNOWCAP, {
      shade: 6,
      inner: (c) => c.shadeOver('eave', poly([[X - 50, Y - 34], [X + 50, Y - 34], [X + 44, Y - 41], [X - 44, Y - 41]]), 0.9),
    });
    // Whose hall it is: a cloth hung from the gable. Not a round shield,
    // which in a triangle reads as an eye.
    d.piece('cloth', poly([[X - 9, Y - 68], [X + 9, Y - 68], [X + 9, Y - 44], [X, Y - 50], [X - 9, Y - 44]]), CLOTH[team], {
      shade: 3,
    });
  }),
]);

/** A slab of ice with a sign cut in it. */
const frostrune = structure('frostrune', 150, 'slash', [X, 170], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 32, 7)),
  part('body', 'body', 'root', FEET, (d) => {
    d.flat('glow', ellipse(X, Y - 8, 36, 14), FROST.light, 0.45);
    d.piece('slab', ellipse(X, Y - 8, 28, 10), { fill: FROST.light, shade: FROST.fill }, {
      shade: 3,
      inner: (c) => {
        // The sign: an upright with two arms, as a rune is. Lines only.
        c.flat('rune-a', roundRect(X - 1.6, Y - 15, 3.2, 14, 1), FROST.shade);
        c.flat('rune-b', poly([[X, Y - 13], [X + 10, Y - 9], [X + 10, Y - 6.5], [X, Y - 10.5]]), FROST.shade);
        c.flat('rune-c', poly([[X, Y - 8], [X - 10, Y - 12], [X - 10, Y - 9.5], [X, Y - 5.5]]), FROST.shade);
      },
    });
  }),
]);

// ------------------------------------------------------------ the Crownlands' traps

/** An iron plate with its spikes up. */
const spiketrap = structure('spiketrap', 148, 'slash', [X, 170], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 32, 7)),
  part('body', 'body', 'root', FEET, (d) => {
    d.piece('plate', ellipse(X, Y - 6, 29, 10), IRON, {
      shade: 3,
      inner: (c) => {
        rivet(c, X - 20, Y - 6, 1.8);
        rivet(c, X + 20, Y - 6, 1.8);
        rivet(c, X, Y + 1, 1.8);
      },
    });
    [[-16, 16], [-6, 22], [5, 20], [15, 15], [-1, 12]].forEach(([dx, h], i) => {
      const x = X + dx;
      d.piece(`spike-${i}`, poly([[x - 5, Y - 7], [x, Y - 7 - h], [x + 5, Y - 7]]), STEEL, { shade: 0 });
    });
  }),
]);

/** An iron ring on a chain, with a plate in the middle that must not be stepped on. */
const beartrap = structure('beartrap', 150, 'slash', [X, 170], [
  part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 32, 7)),
  part('body', 'body', 'root', FEET, (d) => {
    d.line('chain', path().M(X + 26, Y - 6).L(X + 42, Y - 2));
    d.piece('peg', roundRect(X + 40, Y - 12, 6, 12, 2), WOOD, { shade: 0 });
    d.piece('ring', ellipse(X, Y - 7, 28, 10).add(ellipse(X, Y - 7, 20, 6)), STEEL, { shade: 0, holes: true });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * 6.283 + 0.2;
      const cx = X + Math.cos(a) * 28;
      const cy = Y - 7 + Math.sin(a) * 10;
      d.piece(`tooth-${i}`, poly([[cx - 3.5, cy], [cx + Math.cos(a) * 3, cy - 8], [cx + 3.5, cy]]), STEEL, { shade: 0 });
    }
    d.piece('plate', ellipse(X, Y - 7, 11, 4), BONE, { shade: 0 });
  }),
]);

/** Every building and trap that has art, set by set. */
export const STRUCTURES_ART: readonly UnitArt[] = [
  palisade, spiketrap, beartrap, watchtower, barracks, warbanner,
  lookout, raidertent, bramblesnare,
  sunobelisk, wartent, firepit,
  frostspire, longhouse, frostrune,
];
