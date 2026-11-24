// The panel that says what a unit is: its picture on its tier's color, its
// name, its numbers, what it says of itself and its skill. The screen of
// units shows it for a card, with that card's grade and level counted; the
// index shows it for a unit, as a card fresh from its pack would be.
//
// A unit the player does not know is its own outline in the dark, named
// "???", and nothing else about it is told.

import Phaser from 'phaser';
import { CLOTH, IRON, OUTLINE, VENOM } from '../../art/kit/palette';
import { SETS, type UnitInfo } from '../../data/units';
import { MAX_LEVEL, RARITY, cardMult, xpToNext } from '../../game/rarity';
import type { Card } from '../../game/state';
import { STATUS } from '../../sim/status';
import { hex } from '../config';
import { SHEET } from '../Sheet';
import { BONE } from '../../art/kit/palette';
import { RARITY_MAT } from './colors';
import { gradeBadge } from './grade';
import { portrait } from './UnitCard';
import { label, slab } from './widgets';

/** Where the panel stands: the right of a screen that has a grid of cards on its left. */
/** What each role is called, wherever a unit is described. */
export const ROLE_NAME: Readonly<Record<string, string>> = { tank: 'Tank', fighter: 'Fighter', ranger: 'Ranger', mage: 'Mage', support: 'Support' };

export const PX = 884;
export const PY = 78;
export const PW = 372;
export const PH = 620;

export type Adder = <T extends Phaser.GameObjects.GameObject>(o: T) => T;

/** The level and the bar of experience toward the next, on the panel's right, at a height. */
export function levelBar(scene: Phaser.Scene, add: Adder, y: number, level: number, xp: number): void {
  const bw = 120;
  const share = level >= MAX_LEVEL ? 1 : Math.min(1, xp / xpToNext(level));
  const bar = add(scene.add.graphics());
  bar.fillStyle(hex(OUTLINE), 1).fillRoundedRect(PX + PW - 24 - bw - 3, y - 9, bw + 6, 18, 8);
  bar.fillStyle(hex(IRON.fill), 1).fillRoundedRect(PX + PW - 24 - bw, y - 6, bw, 12, 5);
  if (share > 0.03) bar.fillStyle(hex(VENOM.fill), 1).fillRoundedRect(PX + PW - 24 - bw, y - 6, bw * share, 12, 5);
}

export interface PanelOpts {
  /** The card shown: its grade and level are counted in the numbers. */
  card?: Card;
  /** False for a unit the player has not met: then only its outline and "???". */
  known: boolean;
  /** With no card, the line under the name: where it is found, how many are held. */
  line?: string;
}

/**
 * Draws the panel for a unit. Returns the height its words end at, so that
 * a screen can put its own buttons under them.
 */
export function unitPanel(scene: Phaser.Scene, add: Adder, def: UnitInfo, o: PanelOpts): number {
  const cx = PX + PW / 2;
  const g = add(scene.add.graphics());
  slab(g, PX, PY, PW, PH, BONE, 22, 8);
  slab(g, PX + 14, PY + 14, PW - 28, 150, o.known ? RARITY_MAT[def.rarity] : IRON, 16, 5);
  add(portrait(scene, cx, PY + 154, def.id, 'blue', 128, !o.known));

  const dark = { color: OUTLINE, stroke: null as null };
  if (!o.known) {
    add(label(scene, cx, PY + 200, '???', { size: 30 }));
    add(label(scene, cx, PY + 260, 'You have not met this one yet.\nPull its card from a pack,\nor beat it in battle.', { size: 18, weight: 600, ...dark }));
    return PY + 300;
  }

  add(label(scene, cx, PY + 190, def.name, { size: def.name.length > 14 ? 24 : 28 }));
  // What it is, after its tier: a tank, a ranger, a healer; or, for a structure, a building or a trap.
  const role = def.kind === 'trap' ? 'Trap' : def.kind === 'building' ? 'Building' : ROLE_NAME[def.role];
  add(label(scene, cx, PY + 220, `${RARITY[def.rarity].name} ${role}  ·  ${SETS[def.set].name}`, { size: 15, weight: 600, ...dark }));

  const card = o.card;
  const m = card ? cardMult(card.grade, card.level) : 1;
  if (card) {
    add(gradeBadge(scene, PX + 62, PY + 252, card.grade, 26));
    add(label(scene, PX + 118, PY + 252, `Level ${card.level}`, { size: 18, align: 'left', ...dark }));
    levelBar(scene, add, PY + 252, card.level, card.xp);
  } else if (o.line) {
    add(label(scene, cx, PY + 252, o.line, { size: 16, weight: 600, color: CLOTH.blue.shade, stroke: null }));
  }

  // Its numbers, as it would fight now. Only the ones it has: a wall strikes
  // no one, nothing that is built walks, and a trap is one blow of a width.
  const strikes = def.damage > 0 || !!def.heal;
  const stats: Array<[string, string]> = [];
  if (!def.trap) stats.push(['icon/heart', `${Math.round(def.hp * m)}`]);
  if (strikes) stats.push(['icon/sword', def.heal ? `${Math.round(def.heal.amount * m)} heal` : `${Math.round(def.damage * m)}`]);
  if (def.trap) stats.push(['icon/range', `${def.trap.radius * 2} tiles wide`]);
  else if (strikes) {
    stats.push(['icon/hourglass', `${def.attackInterval} s`]);
    stats.push(['icon/range', def.range <= 1.6 ? 'melee' : `${def.range} tiles`]);
  }
  if (!def.trap) stats.push(['icon/shield', `${Math.round(def.armor)}`]);
  if (!def.kind) stats.push(['icon/boot', `${def.speed}`]);
  stats.forEach(([icon, text], i) => {
    const x = PX + 30 + (i % 3) * 114;
    const y = PY + 292 + Math.floor(i / 3) * 32;
    add(scene.add.image(x, y, SHEET, icon).setScale(0.3));
    add(label(scene, x + 18, y, text, { size: 16, weight: 600, align: 'left', ...dark }));
  });

  // What it says of itself, then its skill: each under the last, however long they run.
  let y = PY + 350;
  if (def.text) {
    const t = add(label(scene, PX + 24, y, def.text, { size: 14, weight: 600, align: 'left', wrap: PW - 48, color: IRON.shade, stroke: null }).setOrigin(0, 0));
    y += t.height + 10;
  }
  if (def.skill) {
    const sk = def.skill;
    add(scene.add.image(PX + 32, y + 10, SHEET, 'icon/spark').setScale(0.3));
    add(label(scene, PX + 50, y + 10, `${sk.name}  (every ${sk.cooldown} s)`, { size: 17, align: 'left', color: CLOTH.blue.shade, stroke: null }));
    y += 24;
    let text = sk.text;
    if (sk.status) text += ` ${STATUS[sk.status.id].name}: ${STATUS[sk.status.id].text}`;
    const t = add(label(scene, PX + 24, y, text, { size: 14, weight: 600, align: 'left', wrap: PW - 48, ...dark }).setOrigin(0, 0));
    y += t.height;
  }
  return y;
}
