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
import { pillImage, slabImage } from './bake';
import { Button, label } from './widgets';

/** The player's coins, top right. */
export class CoinPill {
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, private readonly save: SaveData, depth = 8000) {
    slabImage(scene, W - 186, 14, 168, 46, IRON, 14, 5).setDepth(depth);
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
  private visible = true;

  constructor(private readonly scene: Phaser.Scene, private readonly save: SaveData, onPress: () => void, private readonly depth = 8000) {
    this.zone = scene.add.zone(W - 102, 86, 168, 40).setInteractive({ useHandCursor: true }).setDepth(depth + 2);
    this.zone.on('pointerup', onPress);
    this.refresh();
  }

  /** Where it is on the screen, for the tutorial to point at. */
  get rect(): { x: number; y: number; w: number; h: number } {
    return { x: W - 186, y: 66, w: 168, h: 40 };
  }

  /** Puts it away, or brings it back: it is not there while a battle is fought. */
  setVisible(on: boolean): void {
    if (on === this.visible) return;
    this.visible = on;
    for (const o of this.things) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(on);
    if (on) this.zone.setInteractive({ useHandCursor: true });
    else this.zone.disableInteractive();
  }

  refresh(): void {
    for (const o of this.things) o.destroy();
    this.things.length = 0;
    const s = this.save;
    // Its plate and the bar's track are pictures made once; only the bar's fill is drawn, and that is a plain rectangle.
    const share = s.player.level >= PLAYER_MAX_LEVEL ? 1 : Math.min(1, s.player.xp / playerXpToNext(s.player.level));
    this.things.push(
      slabImage(this.scene, W - 186, 66, 168, 40, IRON, 12, 5).setDepth(this.depth),
      pillImage(this.scene, W - 68, 85, 76, 6, OUTLINE).setDepth(this.depth),
      label(this.scene, W - 176, 84, `LV ${s.player.level}`, { size: 18, align: 'left', strokeWidth: 4 }).setDepth(this.depth + 1),
    );
    if (share > 0.04) this.things.push(this.scene.add.rectangle(W - 108, 85, 80 * share, 10, hex(HOLY.fill)).setOrigin(0, 0.5).setDepth(this.depth));
    if (playerHasNews(s)) this.things.push(pillImage(this.scene, W - 22, 68, 14, 14, CLOTH.red.fill).setDepth(this.depth + 1));
    if (!this.visible) for (const o of this.things) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
  }
}

/**
 * A small plate on the corner of a button: how many of a thing there are,
 * or how many of how many. It is asked often and draws only when what it
 * says changes.
 */
export class CountChip {
  private pill: Phaser.GameObjects.Image | null = null;
  private readonly text: Phaser.GameObjects.Text;
  private said = '';
  private lit = false;
  private visible = true;

  constructor(private readonly scene: Phaser.Scene, private readonly x: number, private readonly y: number, private readonly depth = 8001) {
    this.text = label(scene, x, y - 1, '', { size: 14, strokeWidth: 3 }).setDepth(depth + 1);
  }

  /** `lit` is for a count that asks for something: packs to open, a place that is free with a card to stand in it. */
  set(said: string, lit = false): void {
    if (said === this.said && lit === this.lit) return;
    this.said = said;
    this.lit = lit;
    this.text.setText(said);
    this.pill?.destroy();
    this.pill = null;
    if (!said) return;
    // Its plate is a picture made once for each width and color it has had (bake.ts).
    const w = Math.max(24, Math.ceil((this.text.width + 12) / 4) * 4);
    this.pill = pillImage(this.scene, this.x, this.y, w, 22, lit ? CLOTH.red.fill : IRON.fill).setDepth(this.depth).setVisible(this.visible);
  }

  setVisible(on: boolean): void {
    this.visible = on;
    this.pill?.setVisible(on);
    this.text.setVisible(on);
  }
}

/**
 * The way to the rewards, under the level on the main screen. No tutorial
 * speaks of the rewards, by the owner's word of 24 November 2026 ("make sure
 * the reward button is really obvious and you wanna really click it"), so
 * the button has to say it all. With nothing to claim it is a quiet plate
 * that says how long until the next gift. With something to claim it is
 * another thing: gold, bigger, breathing, with light turning behind a gift
 * that shakes, and the count of what waits in red on its corner.
 */
export class RewardsPill {
  private readonly calm: Phaser.GameObjects.Container;
  private readonly hot: Phaser.GameObjects.Container;
  private readonly soon: Phaser.GameObjects.Text;
  private readonly count: Phaser.GameObjects.Text;
  private readonly sub: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Zone;
  private shown = -1;
  private mins = -2;
  private visible = true;

  constructor(scene: Phaser.Scene, onPress: () => void, depth = 8000) {
    // The quiet plate.
    const c = RewardsPill.CALM;
    this.calm = scene.add.container(c.x + c.w / 2, c.y + c.h / 2).setDepth(depth);
    const plate = slabImage(scene, -c.w / 2, -c.h / 2, c.w, c.h, IRON, 12, 5);
    this.soon = label(scene, -c.w / 2 + 40, -2, 'REWARDS', { size: 15, align: 'left', strokeWidth: 4 });
    this.calm.add([plate, scene.add.image(-c.w / 2 + 21, -2, SHEET, 'icon/gift').setScale(0.34), this.soon]);

    // The one that asks to be pressed.
    const h = RewardsPill.HOT;
    this.hot = scene.add.container(h.x + h.w / 2, h.y + h.h / 2).setDepth(depth + 1).setVisible(false);
    const gx = -h.w / 2 + 32;
    // Light behind the gift: a star of twelve rays, turning.
    const rays = scene.add.graphics();
    rays.fillStyle(hex(HOLY.light), 0.75);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const w = 0.13;
      rays.fillTriangle(0, 0, Math.cos(a - w) * 36, Math.sin(a - w) * 36, Math.cos(a + w) * 36, Math.sin(a + w) * 36);
    }
    rays.setPosition(gx, -3);
    const gold = slabImage(scene, -h.w / 2, -h.h / 2, h.w, h.h, GOLD, 14, 7);
    const gift = scene.add.image(gx, -4, SHEET, 'icon/gift').setScale(0.56);
    const claim = label(scene, gx + 24, -10, 'CLAIM!', { size: 20, align: 'left', strokeWidth: 6 });
    this.sub = label(scene, gx + 25, 12, '', { size: 12, weight: 600, align: 'left', color: OUTLINE, stroke: null });
    const dot = pillImage(scene, h.w / 2 - 6, -h.h / 2 + 4, 22, 22, CLOTH.red.fill);
    this.count = label(scene, h.w / 2 - 6, -h.h / 2 + 3, '', { size: 16, strokeWidth: 3 });
    // The plate hides the middle of the star, so the rays show only round its edge and through the gift's corner.
    this.hot.add([gold, rays, gift, claim, this.sub, dot, this.count]);
    // It breathes, the light turns, and the gift shakes every second or so: none of it stops while it waits.
    scene.tweens.add({ targets: this.hot, scale: 1.07, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: rays, angle: 360, duration: 5000, repeat: -1 });
    scene.tweens.add({ targets: gift, angle: 16, duration: 520, repeat: -1, repeatDelay: 900, ease: (t: number) => Math.sin(t * Math.PI * 4) * (1 - t) });

    this.zone = scene.add.zone(c.x + c.w / 2, c.y + c.h / 2, c.w, c.h + 6).setInteractive({ useHandCursor: true }).setDepth(depth + 3);
    this.zone.on('pointerup', () => {
      sfx.play('click');
      onPress();
    });
  }

  /** Where each of its two looks stands. The quiet one is narrow: on the biggest field the plate of whoever stands in the far corner comes up beside it. */
  private static readonly CALM = { x: W - 152, y: 112, w: 134, h: 38 };
  private static readonly HOT = { x: W - 166, y: 117, w: 152, h: 56 };

  /** Where it is on the screen, as it now looks. */
  get rect(): { x: number; y: number; w: number; h: number } {
    return this.shown > 0 ? RewardsPill.HOT : RewardsPill.CALM;
  }

  /** Puts it away, or brings it back: it is not there while a battle is fought. */
  setVisible(on: boolean): void {
    if (on === this.visible) return;
    this.visible = on;
    this.calm.setVisible(on && this.shown <= 0);
    this.hot.setVisible(on && this.shown > 0);
    if (on) this.zone.setInteractive({ useHandCursor: true });
    else this.zone.disableInteractive();
  }

  /**
   * Shows how many rewards wait, and with none, how long until the next
   * one: `left` is seconds, below zero for no more today. It is asked every
   * frame and changes something only when a number does.
   */
  refresh(waiting: number, left = -1): void {
    const mins = waiting > 0 || left < 0 ? -1 : Math.ceil(left / 60);
    if (waiting === this.shown && mins === this.mins) return;
    const woke = this.shown === 0 && waiting > 0;
    if (waiting !== this.shown) {
      this.shown = waiting;
      const r = this.rect;
      this.zone.setPosition(r.x + r.w / 2, r.y + r.h / 2).setSize(r.w, r.h + 6);
      this.calm.setVisible(this.visible && waiting <= 0);
      this.hot.setVisible(this.visible && waiting > 0);
      this.count.setText(waiting > 0 ? String(waiting) : '');
      this.sub.setText(waiting === 1 ? '1 free gift' : `${waiting} free gifts`);
    }
    if (mins !== this.mins) {
      this.mins = mins;
      this.soon.setText(mins > 0 ? `GIFT IN ${mins} MIN` : 'REWARDS').setFontSize(mins > 0 ? 12 : 15);
    }
    // A gift that comes ready while the field is on show is heard.
    if (woke && this.visible) sfx.play('coin', 0.7);
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
