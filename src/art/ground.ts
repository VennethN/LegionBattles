// The kinds of land, and the colors of each.

import { BRONZE, BUSH, DIRT, FIRE, GRASS, IRON, LEATHER, PINE, SAND, SNOW, STONE } from './kit/palette';

/** The kinds of land: one for each land of a run of a hundred waves (game/data.ts, LANDS_DEF). */
export type Ground = 'meadow' | 'mire' | 'desert' | 'snow' | 'coast' | 'mine' | 'steppe' | 'crypt' | 'clock' | 'ember';
export const GROUNDS: readonly Ground[] = ['meadow', 'mire', 'desert', 'snow', 'coast', 'mine', 'steppe', 'crypt', 'clock', 'ember'];

export interface GroundColors {
  /** Two tones of the open ground, the land's own darker tone, and specks on it. */
  a: string;
  b: string;
  around: string;
  speck: string;
}

export const GROUND: Readonly<Record<Ground, GroundColors>> = {
  meadow: { a: GRASS.fill, b: GRASS.shade, around: GRASS.dark, speck: GRASS.light },
  desert: { a: SAND.fill, b: SAND.shade, around: SAND.dark, speck: SAND.light },
  snow: { a: SNOW.fill, b: SNOW.shade, around: SNOW.dark, speck: SNOW.light },
  // The later lands are made of the palette's own tones: a dark wet green, pale sand by grey sea stone, worked stone, dry straw,
  // dark slate, cobbles of stone with brass, and ash with embers in it.
  mire: { a: BUSH.shade, b: PINE.fill, around: PINE.shade, speck: GRASS.shade },
  coast: { a: SAND.light, b: SAND.shade, around: STONE.shade, speck: STONE.fill },
  mine: { a: STONE.fill, b: STONE.shade, around: IRON.shade, speck: DIRT.shade },
  steppe: { a: DIRT.fill, b: SAND.dark, around: LEATHER.fill, speck: SAND.fill },
  crypt: { a: IRON.fill, b: IRON.shade, around: LEATHER.shade, speck: STONE.shade },
  clock: { a: STONE.shade, b: IRON.fill, around: IRON.shade, speck: BRONZE.fill },
  ember: { a: IRON.shade, b: LEATHER.shade, around: '#2a1a10', speck: FIRE.shade },
};
