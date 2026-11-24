// A card as the menus show it: its unit's picture on its tier's color, its
// name, its grade and its level. Every card is a tile of its own: two of a
// unit are two tiles, and none has a count on it.
//
// A unit the player does not know is its own outline in the dark, named
// "???", and nothing else about it is told: not its tier, not its name.

import Phaser from 'phaser';
import { HIGHLIGHT, IRON, OUTLINE } from '../../art/kit/palette';
import { UNITS } from '../../data/units';
import { inTeam, known } from '../../game/rules';
import type { Card, SaveData } from '../../game/state';
import { getManifest } from '../app';
import { hex } from '../config';
import { BAKE_PAD, baked, roundRect, slabOn } from './bake';
import { CARDS, SHEET, portraitFrame } from '../Sheet';
import { RARITY_MAT } from './colors';
import { gradeBadge } from './grade';
import { label } from './widgets';

export interface CardOpts {
  width?: number;
  height?: number;
  /** Shows the enemy's colors, with no grade or level: for a stage's line-up. */
  enemy?: boolean;
  /** Leaves the name off, for small cards. */
  bare?: boolean;
  /** The card shown. Without one the tile is the unit alone: one not held, or not known. */
  card?: Card;
  /** With no card: true if the player holds one all the same, so the unit is shown at full strength. The index says this. */
  held?: boolean;
}

/** A unit's picture standing on (x, y), fitted to a height. Dark if `dark`. */
export function portrait(
  scene: Phaser.Scene,
  x: number,
  y: number,
  unit: string,
  team: 'blue' | 'red',
  height: number,
  dark = false,
): Phaser.GameObjects.Image {
  const art = getManifest().units[unit];
  const img = scene.add.image(x, y, CARDS, portraitFrame(team, unit));
  // The frame holds the unit at 2x (blue) or 1x (red); fit what stands above its feet to the height asked.
  const tall = 180 - art.full[1];
  const k = Math.min(height / tall, 1.4);
  img.setScale(k / (team === 'blue' ? 2 : 1));
  if (dark) img.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.85);
  return img;
}

export function unitCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  unit: string,
  save: SaveData,
  o: CardOpts = {},
): Phaser.GameObjects.Container {
  const w = o.width ?? 128;
  const h = o.height ?? 132;
  const def = UNITS[unit];
  const card = o.card;
  const isKnown = !!card || known(save, def);
  const root = scene.add.container(x, y);
  // The tile is a picture made once for its size and tier (bake.ts): a screen of twenty cards drew twenty of these as shapes, every frame.
  const mat = isKnown ? RARITY_MAT[def.rarity] : IRON;
  const windowH = h - (o.bare ? 22 : 40);
  const tile = baked(scene, `card:${w}x${h}:${mat.fill}${mat.shade}:${isKnown ? 1 : 0}:${windowH}`, w + BAKE_PAD * 2, h + BAKE_PAD * 2, (ctx) => {
    slabOn(ctx, BAKE_PAD, BAKE_PAD, w, h, mat, 14, 6);
    // A lighter window behind the figure, so that it stands out from its tier's color.
    ctx.globalAlpha = isKnown ? 0.35 : 0.3;
    ctx.fillStyle = isKnown ? HIGHLIGHT : OUTLINE;
    roundRect(ctx, BAKE_PAD + 8, BAKE_PAD + 8, w - 16, windowH, 9);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  root.add(scene.add.image(0, 0, tile).setDisplaySize(w + BAKE_PAD * 2, h + BAKE_PAD * 2));

  const nameRoom = o.bare ? 8 : 26;
  const pic = portrait(scene, 0, h / 2 - nameRoom - 8, unit, o.enemy ? 'red' : 'blue', h - nameRoom - 26, !isKnown);
  if (isKnown && !card && !o.enemy && !o.held) pic.setAlpha(0.55);
  root.add(pic);

  if (!o.bare) {
    root.add(label(scene, 0, h / 2 - 18, isKnown ? def.name : '???', { size: def.name.length > 12 ? 12 : 15, strokeWidth: 4, wrap: w - 8 }));
  }
  if (card && !o.enemy) {
    root.add(gradeBadge(scene, -w / 2 + 24, -h / 2 + 20, card.grade, 24));
    root.add(label(scene, w / 2 - 8, -h / 2 + 18, `Lv ${card.level}`, { size: 14, align: 'right', strokeWidth: 4 }));
    if (inTeam(save, card.id)) root.add(scene.add.image(w / 2 - 16, h / 2 - 44, SHEET, 'icon/check').setScale(0.3));
  }
  root.setSize(w, h);
  return root;
}
