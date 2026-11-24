// The ground a battle is fought on, and what stands around it. A kind of
// land is four colors and a few props; the tiles and props are drawn from
// them, so a new world's land is a few lines here.

import { Doc } from './kit/draw';
import {
  BONE, BUSH, CACTUS, DIRT, FROST, GRASS, OUTLINE, PINE, SAND, SHADOW_OPACITY, SNOW, STONE, type Material,
} from './kit/palette';
import { ellipse, poly, roundRect, smooth } from './kit/path';

/** A tile on screen. The board is seen a little from above, so it is wider than tall. */
export const TILE_W = 120;
export const TILE_H = 102;

/** The kinds of land a world can be. */
export type Ground = 'meadow' | 'desert' | 'snow';
export const GROUNDS: readonly Ground[] = ['meadow', 'desert', 'snow'];

export interface BoardArt {
  name: string;
  width: number;
  height: number;
  origin: [number, number];
  draw: (d: Doc) => void;
}

export interface GroundColors {
  /** The two tones tiles alternate between, and the land around the board. */
  a: string;
  b: string;
  around: string;
  /** Specks on the ground: tufts, pebbles, drifts. */
  speck: string;
}

export const GROUND: Readonly<Record<Ground, GroundColors>> = {
  meadow: { a: GRASS.fill, b: GRASS.shade, around: GRASS.dark, speck: GRASS.light },
  desert: { a: SAND.fill, b: SAND.shade, around: SAND.dark, speck: SAND.light },
  snow: { a: SNOW.fill, b: SNOW.shade, around: SNOW.dark, speck: SNOW.light },
};

/** What stands round the board in each kind of land, by name. Three each. */
export const PROPS: Readonly<Record<Ground, readonly [string, string, string]>> = {
  meadow: ['bush', 'rock', 'stump'],
  desert: ['cactus', 'sandrock', 'dryshrub'],
  snow: ['pine', 'snowrock', 'icespike'],
};

function tile(ground: Ground, fill: string, speck: string, seed: number): (d: Doc) => void {
  return (d) => {
    // A tile is a soft square a little smaller than its place, so the gaps
    // between tiles are the grid. No lines: the board must stay quiet.
    d.flat('ground', roundRect(2, 2, TILE_W - 4, TILE_H - 4, 10), fill);
    const spots: Array<[number, number]> = seed % 2 === 0 ? [[26, 32], [84, 66]] : [[38, 70], [92, 28]];
    spots.forEach(([x, y], i) => {
      if (ground === 'meadow') {
        d.flat(`tuft-${i}`, smooth([[x, y], [x + 3, y - 8], [x + 6, y], [x + 9, y - 6], [x + 12, y]], false).L(x, y).Z(), speck);
      } else if (ground === 'desert') {
        // A ripple in the sand.
        d.flat(`ripple-${i}`, smooth([[x - 4, y], [x + 4, y - 3], [x + 12, y], [x + 20, y - 3], [x + 20, y], [x + 12, y + 3], [x + 4, y]], true), speck);
      } else {
        // A small drift.
        d.flat(`drift-${i}`, ellipse(x + 6, y - 2, 10, 4), speck);
      }
    });
  };
}

function shadowUnder(d: Doc, cx: number, cy: number, rx: number): void {
  d.flat('shadow', ellipse(cx, cy, rx, 8), OUTLINE, SHADOW_OPACITY);
}

function rock(mat: Material, cap: Material | null): (d: Doc) => void {
  return (d) => {
    shadowUnder(d, 40, 50, 34);
    d.piece('rock', smooth([[10, 48, 'c'], [12, 28], [26, 12], [46, 10], [62, 22], [70, 48, 'c']]), mat, {
      shade: 6,
      inner: cap
        ? (c) => c.piece('cap', smooth([[4, 26], [24, 4], [50, 2], [70, 24], [56, 22], [44, 28], [30, 20], [16, 30]]), cap, { shade: 0 })
        : undefined,
    });
    d.piece('pebble', smooth([[52, 50, 'c'], [54, 40], [64, 36], [74, 42], [76, 50, 'c']]), mat, { shade: 3 });
  };
}

function bush(mat: Material): (d: Doc) => void {
  return (d) => {
    shadowUnder(d, 44, 54, 38);
    d.piece(
      'bush',
      smooth([[8, 54, 'c'], [6, 38], [16, 28], [22, 14], [40, 8], [54, 16], [66, 18], [76, 30], [82, 42], [80, 54, 'c']]),
      mat,
      { shade: 6 },
    );
  };
}

function stump(d: Doc): void {
  shadowUnder(d, 32, 46, 28);
  d.piece('trunk', smooth([[10, 46, 'c'], [12, 20], [32, 16], [52, 20], [54, 46, 'c']]), DIRT, { shade: 5 });
  d.piece('top', ellipse(32, 19, 21, 8), BONE, { shade: 0 });
}

function cactus(d: Doc): void {
  shadowUnder(d, 36, 84, 26);
  d.piece('arm-a', smooth([[30, 58, 'c'], [14, 56], [10, 44], [12, 30], [22, 30], [22, 44], [30, 46, 'c']]), CACTUS, { shade: 3 });
  d.piece('arm-b', smooth([[44, 48, 'c'], [58, 46], [60, 34], [62, 22], [52, 22], [50, 34], [44, 36, 'c']]), CACTUS, { shade: 3 });
  d.piece('trunk', smooth([[26, 84, 'c'], [26, 20], [36, 8], [46, 20], [46, 84, 'c']]), CACTUS, {
    shade: 5,
    inner: (c) => c.line('rib', smooth([[36, 14], [36, 84]], false)),
  });
}

function dryShrub(d: Doc): void {
  shadowUnder(d, 34, 46, 26);
  d.piece(
    'shrub',
    poly([[10, 46], [4, 30], [16, 34], [14, 14], [26, 28], [34, 6], [42, 28], [54, 14], [52, 34], [64, 30], [58, 46]]),
    DIRT,
    { shade: 4 },
  );
}

function pine(d: Doc): void {
  shadowUnder(d, 40, 112, 30);
  d.piece('trunk', roundRect(33, 92, 14, 22, 3), DIRT, { shade: 3 });
  const tier = (y: number, w: number, name: string): void => {
    d.piece(name, poly([[40, y - 34], [40 + w, y], [40 - w, y]]), PINE, {
      shade: 5,
      inner: (c) => c.flat(`${name}-snow`, poly([[40, y - 40], [40 + w * 0.5, y - 14], [40 + w * 0.2, y - 20], [40, y - 12], [40 - w * 0.25, y - 20], [40 - w * 0.5, y - 14]]), SNOW.light),
    });
  };
  tier(98, 34, 'low');
  tier(72, 27, 'mid');
  tier(46, 20, 'top');
}

function iceSpike(d: Doc): void {
  shadowUnder(d, 34, 66, 26);
  d.piece('spike-a', poly([[10, 66], [20, 26], [32, 66]]), FROST, { shade: 3 });
  d.piece('spike-b', poly([[40, 66], [52, 34], [60, 66]]), FROST, { shade: 3 });
  d.piece('spike-c', poly([[22, 66], [36, 6], [48, 66]]), FROST, { shade: 5 });
  d.glint('glint', poly([[32, 22], [36, 14], [36, 44], [30, 46]]));
}

export function boardArt(): BoardArt[] {
  const out: BoardArt[] = [];
  for (const ground of GROUNDS) {
    const c = GROUND[ground];
    out.push({ name: `${ground}-tile-a`, width: TILE_W, height: TILE_H, origin: [0, 0], draw: tile(ground, c.a, c.speck, 0) });
    out.push({ name: `${ground}-tile-b`, width: TILE_W, height: TILE_H, origin: [0, 0], draw: tile(ground, c.b, c.speck, 1) });
  }
  out.push(
    { name: 'rock', width: 84, height: 60, origin: [0.5, 0.82], draw: rock(STONE, null) },
    { name: 'bush', width: 90, height: 64, origin: [0.5, 0.84], draw: bush(BUSH) },
    { name: 'stump', width: 64, height: 56, origin: [0.5, 0.82], draw: stump },
    { name: 'cactus', width: 72, height: 96, origin: [0.5, 0.88], draw: cactus },
    { name: 'sandrock', width: 84, height: 60, origin: [0.5, 0.82], draw: rock(DIRT, null) },
    { name: 'dryshrub', width: 68, height: 56, origin: [0.5, 0.82], draw: dryShrub },
    { name: 'pine', width: 80, height: 124, origin: [0.5, 0.9], draw: pine },
    { name: 'snowrock', width: 84, height: 60, origin: [0.5, 0.82], draw: rock(STONE, { fill: SNOW.light, shade: SNOW.light }) },
    { name: 'icespike', width: 68, height: 76, origin: [0.5, 0.86], draw: iceSpike },
  );
  return out;
}
