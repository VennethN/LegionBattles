// The kinds of land, and the colors of each.

import { GRASS, SAND, SNOW } from './kit/palette';

export type Ground = 'meadow' | 'desert' | 'snow';
export const GROUNDS: readonly Ground[] = ['meadow', 'desert', 'snow'];

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
};
