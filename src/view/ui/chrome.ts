// What the screens share: the coin counter, the sound button, the head of a
// screen that opens over the field, and the dim sheet behind it.

import Phaser from 'phaser';
import { BONE, CLOTH, GOLD, HOLY, IRON, OUTLINE } from '../../art/kit/palette';
import { PLAYER_MAX_LEVEL, playerXpToNext } from '../../data/player';
import { playerHasNews } from '../../game/player';
import type { SaveData } from '../../game/state';
import { H, W, hex } from '../config';
import { SHEET } from '../Sheet';
import { sfx } from '../../audio/sfx';
import { toggleSound } from '../session';
import { Button, label, slab } from './widgets';

/** The player's coins, top right. */
export class CoinPill {
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, private readonly save: SaveData, depth = 8000) {
    const g = scene.add.graphics().setDepth(depth);
    slab(g, W - 186, 14, 168, 46, IRON, 14, 5);
    scene.add.image(W - 162, 35, SHEET, 'icon/coin').setScale(0.42).setDepth(depth + 1);
    this.text = label(scene, W - 34, 35, String(save.coins), { size: 24, align: 'right', color: GOLD.fill }).setDepth(depth + 1);
  }

  refresh(): void {
    this.text.setText(String(this.save.coins));
  }
}

/**
 * The player's level, under the coins on the main screen: the level, a bar
 * of the experience toward the next, and a mark when there is a skill point
 * to spend or an upgrade the coins will pay for. Pressing it opens the
 * player's screen.
 */
export class LevelPill {
  private readonly things: Phaser.GameObjects.GameObject[] = [];
  private readonly zone: Phaser.GameObjects.Zone;

  constructor(private readonly scene: Phaser.Scene, private readonly save: SaveData, onPress: () => void, private readonly depth = 8000) {
    this.zone = scene.add.zone(W - 102, 86, 168, 40).setInteractive({ useHandCursor: true }).setDepth(depth + 2);
    this.zone.on('pointerup', onPress);
    this.refresh();
  }

  /** Where it is on the screen, for the tutorial to point at. */
  get rect(): { x: number; y: number; w: number; h: number } {
    return { x: W - 186, y: 66, w: 168, h: 40 };
  }

  refresh(): void {
    for (const o of this.things) o.destroy();
    this.things.length = 0;
    const s = this.save;
    const g = this.scene.add.graphics().setDepth(this.depth);
    slab(g, W - 186, 66, 168, 40, IRON, 12, 5);
    const share = s.player.level >= PLAYER_MAX_LEVEL ? 1 : Math.min(1, s.player.xp / playerXpToNext(s.player.level));
    g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(W - 110, 78, 84, 14, 6);
    if (share > 0.04) g.fillStyle(hex(HOLY.fill), 1).fillRoundedRect(W - 108, 80, 80 * share, 10, 4);
    this.things.push(g, label(this.scene, W - 176, 84, `LV ${s.player.level}`, { size: 18, align: 'left', strokeWidth: 4 }).setDepth(this.depth + 1));
    if (playerHasNews(s)) {
      const dot = this.scene.add.graphics().setDepth(this.depth + 1);
      dot.fillStyle(hex(OUTLINE), 1).fillCircle(W - 22, 68, 11);
      dot.fillStyle(hex(CLOTH.red.fill), 1).fillCircle(W - 22, 68, 8);
      this.things.push(dot);
    }
  }
}

/**
 * The way to the rewards, under the player's level on the main screen: a
 * gift, and on it how many things wait to be claimed.
 */
export class RewardsPill {
  private readonly dot: Phaser.GameObjects.Graphics;
  private readonly count: Phaser.GameObjects.Text;
  private shown = -1;

  constructor(scene: Phaser.Scene, onPress: () => void, depth = 8000) {
    const r = this.rect;
    const g = scene.add.graphics().setDepth(depth);
    slab(g, r.x, r.y, r.w, r.h, IRON, 12, 5);
    scene.add.image(r.x + 21, r.y + r.h / 2 - 2, SHEET, 'icon/gift').setScale(0.34).setDepth(depth + 1);
    label(scene, r.x + 40, r.y + r.h / 2 - 2, 'REWARDS', { size: 15, align: 'left', strokeWidth: 4 }).setDepth(depth + 1);
    this.dot = scene.add.graphics().setDepth(depth + 1);
    this.count = label(scene, r.x + r.w - 4, r.y + 1, '', { size: 14, strokeWidth: 3 }).setDepth(depth + 2);
    const zone = scene.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h + 6).setInteractive({ useHandCursor: true }).setDepth(depth + 2);
    zone.on('pointerup', () => {
      sfx.play('click');
      onPress();
    });
  }

  /** Where it is on the screen, for the tutorial to point at. */
  get rect(): { x: number; y: number; w: number; h: number } {
    // Narrower than the level over it: on the biggest field the plate of whoever stands in the far corner comes up beside it.
    return { x: W - 152, y: 112, w: 134, h: 38 };
  }

  /** Shows how many rewards wait. Draws only when the number changes: it is asked every frame. */
  refresh(waiting: number): void {
    if (waiting === this.shown) return;
    this.shown = waiting;
    const r = this.rect;
    this.dot.clear();
    this.count.setText(waiting > 0 ? String(waiting) : '');
    if (waiting <= 0) return;
    this.dot.fillStyle(hex(OUTLINE), 1).fillCircle(r.x + r.w - 4, r.y + 2, 13);
    this.dot.fillStyle(hex(CLOTH.red.fill), 1).fillCircle(r.x + r.w - 4, r.y + 2, 10);
  }
}

/** A small button that turns the sound on and off. Every screen has one. */
export function soundButton(scene: Phaser.Scene, x: number, y: number, on: boolean): Button {
  const b = new Button(scene, x, y, '', () => {
    icon.setFrame(toggleSound() ? 'icon/sound' : 'icon/mute');
  }, { width: 50, height: 46, mat: BONE }).setDepth(8000);
  const icon = scene.add.image(0, -3, SHEET, on ? 'icon/sound' : 'icon/mute').setScale(0.36);
  b.root.add(icon);
  return b;
}

/** A dim sheet over the scene that swallows presses, for what is shown on top of it. */
export function veil(scene: Phaser.Scene, depth: number, alpha = 0.55): Phaser.GameObjects.Rectangle {
  const r = scene.add.rectangle(W / 2, H / 2, W, H, hex(OUTLINE), alpha).setDepth(depth);
  r.setInteractive();
  return r;
}

/** The name of the event the game sends when a screen that was open over the field is shut. */
export const OVERLAY_CLOSED = 'overlay-closed';

/**
 * The head of a screen that opens over the field: the field dimmed behind
 * it, its title, the player's coins, and CLOSE.
 */
export class OverlayHead {
  readonly coins: CoinPill;
  readonly close: Button;

  /** `beforeClose` is called when CLOSE is pressed, before the screen goes. */
  constructor(scene: Phaser.Scene, title: string, save: SaveData, beforeClose: () => void = () => {}) {
    // The board under it is not drawn while this is open (MainScene), so the sheet over it is solid.
    veil(scene, 0, 1);
    label(scene, 26, 36, title, { size: 32, align: 'left' }).setDepth(8000);
    this.coins = new CoinPill(scene, save);
    this.close = new Button(scene, W - 262, 37, 'CLOSE', () => {
      beforeClose();
      closeOverlay(scene);
    }, { width: 130, height: 48, size: 20, mat: CLOTH.red }).setDepth(8000);
  }
}

/**
 * The two pages a screen of cards has: one for units, one for structures,
 * the buildings and the traps. They are kept apart because they are fielded
 * apart, each in places of its own.
 */
export type Side = 'units' | 'structures';

/** The page last looked at, on whichever screen: the index opens on the page the units were left on. */
export function sideOf(scene: Phaser.Scene): Side {
  return scene.registry.get('side') === 'structures' ? 'structures' : 'units';
}

/** The row along the bottom of a screen of cards, and where its parts stand on it. */
export const TABS_Y = 676;
/** Where the tabs end, for whatever a screen puts beside them. */
export const TABS_END = 340;
/** Where the arrows that turn the pages of a grid stand, clear of the tabs. */
export const TURN_X = [606, 680, 754] as const;

/**
 * The tabs that turn between the two pages. The one that is open is in
 * gold and does nothing; the other calls `pick`. Returns what it drew.
 */
export function sideTabs(scene: Phaser.Scene, side: Side, pick: (side: Side) => void): Phaser.GameObjects.GameObject[] {
  const tab = (x: number, w: number, text: string, of: Side): Phaser.GameObjects.GameObject => {
    const on = side === of;
    const b = new Button(scene, x, TABS_Y, text, () => {
      if (on) return;
      scene.registry.set('side', of);
      pick(of);
    }, { width: w, height: 46, size: 18, mat: on ? GOLD : BONE, color: on ? undefined : OUTLINE });
    if (!on) {
      for (const o of b.root.list) if (o instanceof Phaser.GameObjects.Text) o.setStroke(BONE.fill, 0);
    }
    return b.root;
  };
  return [tab(96, 120, 'UNITS', 'units'), tab(252, 176, 'STRUCTURES', 'structures')];
}

/** The name of the event the game sends when the team is changed on the screen of cards, for the field beside it to show. */
export const TEAM_CHANGED = 'team-changed';

/** The name of the event the game sends when one screen over the field gives way to another. */
export const OVERLAY_SWAP = 'overlay-swap';

/** Shuts a screen that is open over the field and opens another in its place. The field stays covered. */
export function swapOverlay(scene: Phaser.Scene, to: string): void {
  const from = scene.scene.key;
  scene.scene.stop();
  scene.game.events.emit(OVERLAY_SWAP, from, to);
}

/** Shuts a screen that is open over the field, and tells the field. */
export function closeOverlay(scene: Phaser.Scene): void {
  const key = scene.scene.key;
  sfx.play('close');
  scene.scene.stop();
  scene.game.events.emit(OVERLAY_CLOSED, key);
}
