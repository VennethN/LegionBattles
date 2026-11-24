// What the screens share: the coin counter, the sound button, the head of a
// screen that opens over the field, and the dim sheet behind it.

import Phaser from 'phaser';
import { BONE, CLOTH, GOLD, IRON, OUTLINE } from '../../art/kit/palette';
import type { SaveData } from '../../game/state';
import { H, W, hex } from '../config';
import { SHEET } from '../Sheet';
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
  scene.scene.stop();
  scene.game.events.emit(OVERLAY_CLOSED, key);
}
