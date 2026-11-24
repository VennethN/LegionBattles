// A card's grade as the game shows it: a badge, never a letter in a line of
// text. The art is in src/art/grades.ts; this puts it on the screen.

import type Phaser from 'phaser';
import { PLATE_H } from '../../art/grades';
import { GRADES } from '../../game/rarity';
import { ART_SCALE } from '../config';
import { SHEET } from '../Sheet';

/**
 * The badge of a grade with the middle of its plate at (x, y). `height` is
 * how tall the plate is; wings, studs and a crown stand out of it.
 */
export function gradeBadge(scene: Phaser.Scene, x: number, y: number, grade: number, height = 28): Phaser.GameObjects.Image {
  const letter = GRADES[Math.max(0, Math.min(GRADES.length - 1, grade))];
  return scene.add.image(x, y, SHEET, `grade/${letter}`).setScale(height / PLATE_H / ART_SCALE);
}
