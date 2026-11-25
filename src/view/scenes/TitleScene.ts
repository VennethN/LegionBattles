// What someone who has never played sees first: the churchyard at night, a
// hunter with a lantern at its gate, the game's name on its board, and
// PLAY. The press that starts the hunt is also the press a browser needs
// before it will make a sound.

import Phaser from 'phaser';
import { RUBY } from '../../art/kit/palette';
import { setupCamera } from '../app';
import { view } from '../config';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { Button, label } from '../ui/widgets';
import { LairScene } from './LairScene';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor('#0b0d10');
    LairScene.applySound();
    const w = view.w;
    const h = view.h;
    const ground = h * (view.tall ? 0.7 : 0.74);
    const g = this.add.graphics();
    // The sky, cold, darker at the top.
    for (let i = 0; i < 12; i++) g.fillStyle(Phaser.Display.Color.GetColor(14 + i * 2, 18 + i * 2, 24 + i * 2), 1).fillRect(0, (ground * i) / 12, w, ground / 12 + 1);
    // The church far off and the wall, as flat dark shapes.
    const cx = w * 0.72;
    g.fillStyle(0x161a1f, 1).fillRect(cx - 70, ground - 150, 140, 150).fillTriangle(cx - 80, ground - 150, cx + 80, ground - 150, cx, ground - 210);
    g.fillRect(cx + 40, ground - 250, 34, 250).fillTriangle(cx + 34, ground - 250, cx + 80, ground - 250, cx + 57, ground - 300);
    g.fillStyle(0x3a2a14, 1).fillRect(cx - 12, ground - 110, 24, 36);
    g.fillStyle(0x0f1215, 1).fillRect(0, ground - 46, w, 46);
    // Stones and crosses along the yard, leaning.
    const stones = Math.ceil(w / 90);
    for (let i = 0; i < stones; i++) {
      const x = i * 90 + 30 + ((i * 37) % 23);
      if ((i * 7) % 3 === 0) g.fillStyle(0x1b1f24, 1).fillRect(x - 3, ground - 62, 6, 50).fillRect(x - 15, ground - 50, 30, 6);
      else g.fillStyle(0x1b1f24, 1).fillRoundedRect(x - 14, ground - 50 + (i % 3) * 4, 28, 44, { tl: 12, tr: 12, bl: 0, br: 0 });
    }
    g.fillStyle(0x0a0b0d, 1).fillRect(0, ground, w, h - ground);
    // Mist low on the ground.
    for (let i = 0; i < 5; i++) g.fillStyle(0x3a4550, 0.08).fillEllipse(w * (0.15 + i * 0.18), ground - 6, 260, 30);
    // The hunter at the gate, with her lantern's pool of light about her.
    const hx = view.tall ? w * 0.3 : w * 0.24;
    this.add.image(hx + 8, ground - 60, SHEET, 'fx/glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffa040).setDisplaySize(380, 300).setAlpha(0.75);
    const fig = this.add.image(hx, ground + 6, CARDS, portraitFrame('grim', 'marta')).setOrigin(0.5, 1);
    fig.setScale(Math.min(1.3, (h * 0.42) / fig.height));
    // Embers and motes drifting up through the light.
    for (let i = 0; i < 14; i++) {
      const m = this.add.image(hx + (Math.random() - 0.5) * 220, ground - Math.random() * 200, SHEET, 'fx/glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffc070).setDisplaySize(8, 8).setAlpha(0.6);
      this.tweens.add({ targets: m, y: m.y - 80, alpha: 0, duration: 3000 + Math.random() * 3000, repeat: -1, delay: Math.random() * 3000 });
    }
    // The name on its board, and PLAY under it.
    const bx = view.tall ? w / 2 : w * 0.64;
    const tw = Math.min(w - 40, view.tall ? 340 : 420);
    const logo = this.add.image(bx, h * (view.tall ? 0.2 : 0.3), 'logo').setDisplaySize(tw, (tw * 214) / 444);
    this.tweens.add({ targets: logo, y: logo.y - 4, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    label(this, bx, logo.y + tw * 0.27 + 12, 'Hunt the boss. Take its trophy.', { size: 17 });
    const go = (): void => void this.scene.start('Lair');
    new Button(this, bx, view.tall ? h * 0.86 : h * 0.62, 'PLAY', go, { width: 240, height: 72, size: 34, mat: RUBY });
    this.input.keyboard?.once('keydown-ENTER', go);
    this.input.keyboard?.once('keydown-SPACE', go);
  }
}
