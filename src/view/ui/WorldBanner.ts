// The banner of a world: its land's emblem, its number and its name, on a
// ribbon in the land's color, and beside it a chip that says which
// difficulty this is, in that difficulty's color. It stands over a stage's
// number wherever one is shown, so that it is plain which world the stage is
// in. The owner, of this: "make it recognizeable that we're in what world we
// are in. E.g a sort of graphic on top of the stage numbers".

import Phaser from 'phaser';
import { LANDS } from '../../data/lands';
import { DIFFICULTIES } from '../../data/laps';
import type { World } from '../../data/stages';
import { SHEET } from '../Sheet';
import { DIFFICULTY_MAT, LAND_MAT } from './colors';
import { slabImage } from './bake';
import { label } from './widgets';

/** The banner with its middle at (x, y). `big` is for a heading. */
export function worldBanner(scene: Phaser.Scene, x: number, y: number, world: World, big = false): Phaser.GameObjects.Container {
  const land = LANDS[world.land];
  const size = big ? 24 : 18;
  const h = big ? 44 : 34;
  const root = scene.add.container(x, y);
  // A world's number is its land's: World 1 is Thornwood on every difficulty.
  const text = label(scene, 0, -2, `WORLD ${world.land + 1}  ·  ${world.name.toUpperCase()}`, { size, strokeWidth: big ? 6 : 5 });
  const chipText = label(scene, 0, -2, DIFFICULTIES[world.lap].toUpperCase(), { size: big ? 20 : 17, strokeWidth: big ? 5 : 4 });
  const w = text.width + h + 34;
  const chipW = chipText.width + (big ? 28 : 22);
  const gap = 20;
  // The ribbon and the chip are one thing, with its middle at the middle.
  const left = -(w + gap + chipW) / 2;
  const mid = left + w / 2;
  const mat = LAND_MAT[land.ground];
  // The two tails of the ribbon, then the ribbon over them. Each is a picture made once (bake.ts): a banner is on show for as long as its world is.
  const tail = { ...mat, fill: mat.shade };
  const chipX = left + w + gap + chipW / 2;
  const ch = h - (big ? 8 : 6);
  root.add([
    slabImage(scene, mid - w / 2 - 14, -h / 2 + 6, 30, h - 4, tail, 6, 0),
    slabImage(scene, mid + w / 2 - 16, -h / 2 + 6, 30, h - 4, tail, 6, 0),
    slabImage(scene, mid - w / 2, -h / 2, w, h, mat, 10, 5),
    slabImage(scene, chipX - chipW / 2, -ch / 2, chipW, ch, DIFFICULTY_MAT[world.lap] ?? DIFFICULTY_MAT[0], 9, 4),
  ]);
  text.setX(mid + h / 2 - 2);
  root.add(text);
  chipText.setX(chipX);
  root.add(chipText);
  // The emblem hangs over the ribbon's left end, a little bigger than it is tall.
  root.add(scene.add.image(mid - w / 2 + h / 2 + 2, -2, SHEET, `icon/land-${land.ground}`).setScale((h + 12) / 96));
  root.setSize(w + gap + chipW + 28, h + 12);
  return root;
}
