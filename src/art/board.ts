// The ground a battle is fought on, and what stands around it. A world is a
// set of colors and a list of props; the tiles and props are drawn from them.

import { Doc } from './kit/draw';
import { BONE, BUSH, DIRT, GRASS, STONE, type Material } from './kit/palette';
import { ellipse, roundRect, smooth } from './kit/path';
import { OUTLINE, SHADOW_OPACITY } from './kit/palette';

/** A tile on screen. The board is seen a little from above, so it is wider than tall. */
export const TILE_W = 120;
export const TILE_H = 102;

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
  /** Specks on the ground: tufts, pebbles. */
  speck: string;
}

export const MEADOW: GroundColors = { a: GRASS.fill, b: GRASS.shade, around: GRASS.dark, speck: GRASS.light };

function tile(fill: string, speck: string, seed: number): (d: Doc) => void {
  return (d) => {
    // A tile is a soft square a little smaller than its place, so the gaps
    // between tiles are the grid. No lines: the board must stay quiet.
    d.flat('ground', roundRect(2, 2, TILE_W - 4, TILE_H - 4, 10), fill);
    const spots: Array<[number, number]> = seed % 2 === 0 ? [[26, 30], [84, 62]] : [[38, 66], [92, 26]];
    spots.forEach(([x, y], i) => {
      d.flat(`tuft-${i}`, smooth([[x, y], [x + 3, y - 8], [x + 6, y], [x + 9, y - 6], [x + 12, y]], false).L(x, y).Z(), speck);
    });
  };
}

function rock(d: Doc): void {
  d.flat('shadow', ellipse(40, 50, 34, 8), OUTLINE, SHADOW_OPACITY);
  d.piece('rock', smooth([[10, 48, 'c'], [12, 28], [26, 12], [46, 10], [62, 22], [70, 48, 'c']]), STONE, { shade: 6 });
  d.piece('pebble', smooth([[52, 50, 'c'], [54, 40], [64, 36], [74, 42], [76, 50, 'c']]), STONE, { shade: 3 });
}

function bush(mat: Material): (d: Doc) => void {
  return (d) => {
    d.flat('shadow', ellipse(44, 54, 38, 8), OUTLINE, SHADOW_OPACITY);
    d.piece(
      'bush',
      smooth([[8, 54, 'c'], [6, 38], [16, 28], [22, 14], [40, 8], [54, 16], [66, 18], [76, 30], [82, 42], [80, 54, 'c']]),
      mat,
      { shade: 6 },
    );
  };
}

function stump(d: Doc): void {
  d.flat('shadow', ellipse(32, 46, 28, 7), OUTLINE, SHADOW_OPACITY);
  d.piece('trunk', smooth([[10, 46, 'c'], [12, 20], [32, 16], [52, 20], [54, 46, 'c']]), DIRT, { shade: 5 });
  d.piece('top', ellipse(32, 19, 21, 8), BONE, { shade: 0 });
}

export function boardArt(): BoardArt[] {
  return [
    { name: 'meadow-tile-a', width: TILE_W, height: TILE_H, origin: [0, 0], draw: tile(MEADOW.a, MEADOW.speck, 0) },
    { name: 'meadow-tile-b', width: TILE_W, height: TILE_H, origin: [0, 0], draw: tile(MEADOW.b, MEADOW.speck, 1) },
    { name: 'rock', width: 84, height: 60, origin: [0.5, 0.82], draw: rock },
    { name: 'bush', width: 90, height: 64, origin: [0.5, 0.84], draw: bush(BUSH) },
    { name: 'stump', width: 64, height: 56, origin: [0.5, 0.82], draw: stump },
  ];
}
