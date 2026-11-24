// What is shown when a card is handed over: rings and sparkles flying out
// in its tier's color, rays turning behind it, and the face of the card
// itself. A pack's opening and a reward's unit share these, so that a card
// is greeted the same way wherever it comes from.

import Phaser from 'phaser';
import { HIGHLIGHT, OUTLINE } from '../../art/kit/palette';
import { UNITS } from '../../data/units';
import { RARITY, type Rarity } from '../../game/rarity';
import { hex } from '../config';
import { SHEET } from '../Sheet';
import { RARITY_MAT } from './colors';
import { portrait } from './UnitCard';
import { label, slab } from './widgets';

/** Keeps what it is given, so that the screen can take it all away again. */
export type Adder = <T extends Phaser.GameObjects.GameObject>(o: T) => T;

/** Rings and sparkles in a tier's color, flying out from a point: more of them the rarer the tier. */
export function burst(scene: Phaser.Scene, add: Adder, x: number, y: number, rank: number, color: number, size = 1): void {
  for (let i = 0; i <= rank; i++) {
    const ring = add(scene.add.image(x, y, SHEET, 'fx/ring').setTint(color).setDepth(9005).setScale(0.2 * size).setAlpha(0.9));
    scene.tweens.add({ targets: ring, scale: (3 + i * 0.8) * size, alpha: 0, duration: 620 + i * 90, delay: i * 110, ease: 'Cubic.easeOut' });
  }
  const sparks = Math.round((8 + rank * 5) * (size < 1 ? 0.5 : 1));
  for (let i = 0; i < sparks; i++) {
    const a = (i / sparks) * Math.PI * 2 + 0.3;
    const far = (230 + (i % 3) * 70) * size;
    const sp = add(scene.add.image(x, y, SHEET, 'fx/sparkle').setTint(i % 2 === 0 ? color : hex(HIGHLIGHT)).setDepth(9006).setScale(0.2));
    scene.tweens.add({
      targets: sp, x: x + Math.cos(a) * far, y: y + Math.sin(a) * far * 0.8, scale: 0.5 * Math.max(size, 0.6), angle: 180, alpha: 0,
      duration: 700 + (i % 4) * 90, ease: 'Cubic.easeOut',
    });
  }
}

/** Rays of light turning slowly behind a card: for the tiers worth stopping for. */
export function rays(scene: Phaser.Scene, add: Adder, x: number, y: number, color: number, reach: number): void {
  const g = add(scene.add.graphics().setDepth(9003).setPosition(x, y).setAlpha(0).setScale(0.3));
  const n = 12;
  g.fillStyle(color, 0.5);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const half = (Math.PI / n) * 0.55;
    g.fillTriangle(0, 0, Math.cos(a - half) * reach, Math.sin(a - half) * reach, Math.cos(a + half) * reach, Math.sin(a + half) * reach);
  }
  scene.tweens.add({ targets: g, alpha: 1, scale: 1, duration: 360, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: g, angle: 360, duration: 14000, repeat: -1 });
}

/** The face of a card: its tier's color, the unit, its name and its tier. */
export function cardFace(scene: Phaser.Scene, unit: string, rarity: Rarity, w: number, h: number): Phaser.GameObjects.Container {
  const def = UNITS[unit];
  const mat = RARITY_MAT[rarity];
  const big = w > 200;
  const card = scene.add.container(0, 0);
  const g = scene.add.graphics();
  slab(g, -w / 2, -h / 2, w, h, mat, big ? 22 : 14, big ? 9 : 6);
  const edge = big ? 14 : 8;
  g.fillStyle(hex(HIGHLIGHT), 0.4).fillRoundedRect(-w / 2 + edge, -h / 2 + edge, w - edge * 2, h - (big ? 110 : 58), big ? 14 : 9);
  card.add(g);
  const pic = portrait(scene, 0, h / 2 - (big ? 104 : 54), def.id, 'blue', big ? 176 : 92);
  // A wide one, or one that carries something long, is kept inside the card.
  if (pic.displayWidth > w - edge * 2) pic.setScale((pic.scaleX * (w - edge * 2)) / pic.displayWidth);
  card.add(pic);
  const nameSize = big ? (def.name.length > 14 ? 22 : 28) : def.name.length > 12 ? 13 : 16;
  card.add(label(scene, 0, h / 2 - (big ? 70 : 36), def.name, { size: nameSize, strokeWidth: big ? 6 : 4 }));
  card.add(label(scene, 0, h / 2 - (big ? 34 : 16), RARITY[rarity].name, { size: big ? 18 : 12, weight: 600, color: OUTLINE, stroke: null }));
  return card;
}
