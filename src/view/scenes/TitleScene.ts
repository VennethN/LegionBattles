// What someone who has never played sees first: the game's name and one
// button. The press that starts the hunt is also the press a browser needs
// before it will make a sound.

import Phaser from 'phaser';
import { BONE, RUBY } from '../../art/kit/palette';
import { setupCamera } from '../app';
import { view } from '../config';
import { Button, label } from '../ui/widgets';
import { LairScene } from './LairScene';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor('#0e1113');
    LairScene.applySound();
    const cx = view.w / 2;
    const tw = Math.min(view.w - 60, view.tall ? 330 : 400);
    const logo = this.add.image(cx, view.h * 0.34, 'logo').setDisplaySize(tw, (tw * 214) / 444);
    this.tweens.add({ targets: logo, y: logo.y - 5, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    label(this, cx, view.h * 0.34 + tw * 0.3 + 14, 'Hunt the boss. Take its trophy.', { size: 18, color: BONE.shade });
    const go = (): void => void this.scene.start('Lair');
    new Button(this, cx, view.h * 0.76, 'PLAY', go, { width: 240, height: 70, size: 32, mat: RUBY });
    this.input.keyboard?.once('keydown-ENTER', go);
    this.input.keyboard?.once('keydown-SPACE', go);
  }
}
