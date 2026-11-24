// The ground a battle is fought on: where the board is, how big a tile is,
// and the four colors of each kind of land. The picture of it, with the
// board laid in it and the land's scenery round about, is backdrop.ts.

import { GRASS, SAND, SNOW } from './kit/palette';

/** A tile on screen. The board is seen a little from above, so it is wider than tall. */
export const TILE_W = 120;
export const TILE_H = 102;
/** Where the board's corner is on the 1280 by 720 screen. The painted ground has the board in it, so the two must agree. */
export const BOARD_X = 160;
export const BOARD_Y = 186;

/** The kinds of land a world can be. */
export type Ground = 'meadow' | 'desert' | 'snow';
export const GROUNDS: readonly Ground[] = ['meadow', 'desert', 'snow'];

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
