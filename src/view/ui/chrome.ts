// What every menu has: a title and the player's coins along the top, and the
// three places to go along the bottom.

import Phaser from 'phaser';
import { BONE, CLOTH, GOLD, IRON, OUTLINE } from '../../art/kit/palette';
import { packsHeld } from '../../game/rules';
import type { SaveData } from '../../game/state';
import { H, W, hex } from '../config';
import { SHEET } from '../Sheet';
import { toggleSound } from '../session';
import { Button, label, slab } from './widgets';

export type Tab = 'Home' | 'Team' | 'Shop';

const TABS: Array<{ scene: Tab; text: string; icon: string }> = [
  { scene: 'Home', text: 'MAP', icon: 'icon/flag' },
  { scene: 'Team', text: 'TEAM', icon: 'icon/team' },
  { scene: 'Shop', text: 'PACKS', icon: 'icon/pack' },
];

export class Chrome {
  private coinText: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    title: string,
    current: Tab,
    private readonly save: SaveData,
  ) {
    label(scene, 26, 36, title, { size: 32, align: 'left' }).setDepth(8000);

    const g = scene.add.graphics().setDepth(8000);
    slab(g, W - 196, 14, 172, 46, IRON, 14, 5);
    scene.add.image(W - 172, 35, SHEET, 'icon/coin').setScale(0.42).setDepth(8001);
    this.coinText = label(scene, W - 40, 35, String(save.coins), { size: 24, align: 'right', color: GOLD.fill }).setDepth(8001);

    soundButton(scene, W - 228, 37, save.sound);

    TABS.forEach((tab, i) => {
      const x = W / 2 + (i - 1) * 214;
      const on = tab.scene === current;
      const b = new Button(scene, x, H - 44, `   ${tab.text}`, () => {
        if (!on) scene.scene.start(tab.scene);
      }, { width: 200, height: 62, size: 26, mat: on ? GOLD : BONE, color: on ? undefined : OUTLINE }).setDepth(8000);
      if (!on) {
        b.root.list.forEach((o) => {
          if (o instanceof Phaser.GameObjects.Text) o.setStroke(BONE.fill, 0);
        });
      }
      b.root.add(scene.add.image(-62, -3, SHEET, tab.icon).setScale(0.36));
      if (tab.scene === 'Shop') {
        const n = packsHeld(save);
        if (n > 0) {
          const dot = scene.add.graphics();
          dot.fillStyle(hex(OUTLINE), 1).fillCircle(86, -26, 17);
          dot.fillStyle(hex(CLOTH.red.fill), 1).fillCircle(86, -26, 13);
          b.root.add(dot);
          b.root.add(label(scene, 86, -27, String(n), { size: 16, strokeWidth: 3 }));
        }
      }
    });
  }

  /** Shows the coins as they now are. */
  refresh(): void {
    this.coinText.setText(String(this.save.coins));
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
