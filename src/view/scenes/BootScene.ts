// Loads what every scene needs: the manifest, the effects, the board pieces,
// the font. Unit parts are loaded later, by the battles that use them.

import Phaser from 'phaser';
import type { Manifest } from '../../art/manifest';
import { BONE, GRASS, OUTLINE } from '../../art/kit/palette';
import { ads } from '../../platform/ads';
import { setManifest, setupCamera } from '../app';
import { FONT, H, W, hex } from '../config';
import { makeDigitFont } from '../Numbers';
import { sheet } from '../Sheet';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor(GRASS.dark);
    this.load.json('manifest', 'assets/manifest.json');
  }

  create(): void {
    const manifest = this.cache.json.get('manifest') as Manifest;
    setManifest(manifest);

    const bar = this.add.graphics();
    const draw = (p: number): void => {
      bar.clear();
      bar.fillStyle(hex(OUTLINE), 1).fillRoundedRect(W / 2 - 204, H / 2 - 16, 408, 32, 14);
      bar.fillStyle(hex(BONE.fill), 1).fillRoundedRect(W / 2 - 198, H / 2 - 10, Math.max(20, 396 * p), 20, 9);
    };
    draw(0);
    this.load.on(Phaser.Loader.Events.PROGRESS, draw);

    const art = sheet(this.game, manifest);
    art.queue(this, 'fx');
    art.queue(this, 'board');
    art.queue(this, 'icons');

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      // Text is drawn with the browser's canvas, so the font has to be there before any is made.
      const fonts = typeof document !== 'undefined' && document.fonts
        ? Promise.all([document.fonts.load(`600 24px ${FONT}`), document.fonts.load(`700 24px ${FONT}`)])
        : Promise.resolve([]);
      const go = (): void => {
        art.keepFolder(this, 'fx', 'fx');
        art.keepFolder(this, 'board', 'board');
        art.keepFolder(this, 'icons', 'icon');
        makeDigitFont(this, art);
        art.refresh();
        ads().loadingDone();
        this.scene.start('Battle');
      };
      fonts.then(go, go);
    });
    this.load.start();
  }
}
