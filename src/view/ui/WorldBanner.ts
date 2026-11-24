// The banner of a world: its land's emblem, its number and its name, on a
// ribbon in the land's color. It stands over a stage's number wherever one
// is shown, so that it is plain which world the stage is in. The owner, of
// this: "make it recognizeable that we're in what world we are in. E.g a
// sort of graphic on top of the stage numbers".

import Phaser from 'phaser';
import { LANDS } from '../../data/lands';
import type { World } from '../../data/stages';
import { SHEET } from '../Sheet';
import { LAND_MAT } from './colors';
import { label, slab } from './widgets';

/** The banner with its middle at (x, y). `big` is for a heading. */
export function worldBanner(scene: Phaser.Scene, x: number, y: number, world: World, big = false): Phaser.GameObjects.Container {
  const land = LANDS[world.land];
  const size = big ? 24 : 17;
  const h = big ? 44 : 32;
  const root = scene.add.container(x, y);
  const text = label(scene, 0, -2, `WORLD ${world.index + 1}  ·  ${world.name.toUpperCase()}`, { size, strokeWidth: big ? 6 : 5 });
  const w = text.width + h + 34;
  const g = scene.add.graphics();
  const mat = LAND_MAT[land.ground];
  // The two tails of the ribbon, then the ribbon over them.
  slab(g, -w / 2 - 14, -h / 2 + 6, 30, h - 4, { fill: mat.shade, shade: mat.shade }, 6, 0);
  slab(g, w / 2 - 16, -h / 2 + 6, 30, h - 4, { fill: mat.shade, shade: mat.shade }, 6, 0);
  slab(g, -w / 2, -h / 2, w, h, mat, 10, 5);
  root.add(g);
  text.setX(h / 2 - 2);
  root.add(text);
  // The emblem hangs over the ribbon's left end, a little bigger than it is tall.
  root.add(scene.add.image(-w / 2 + h / 2 + 2, -2, SHEET, `icon/land-${land.ground}`).setScale((h + 12) / 96));
  root.setSize(w + 28, h + 12);
  return root;
}
