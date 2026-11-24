// Loads what every scene needs: the manifest, the effects, the board pieces,
// the font. Unit parts are loaded later, by the battles that use them.

import Phaser from 'phaser';
import { LOGO_H, LOGO_SCALE, LOGO_W } from '../../art/logoSize';
import type { Manifest } from '../../art/manifest';
import { BONE, GRASS, OUTLINE } from '../../art/kit/palette';
import { fillBank } from '../../audio/bank';
import { ads } from '../../platform/ads';
import { setManifest, setupCamera } from '../app';
import { ART_SCALE, FONT, H, RES, W, hex } from '../config';
import { makeDigitFont } from '../Numbers';
import { cardSheet, portraitFrame, sheet } from '../Sheet';

/** A seed in the address goes straight to that skirmish, as it always has. Otherwise, the game. */
function startScene(): string {
  return new URLSearchParams(window.location.search).has('seed') ? 'Battle' : 'Main';
}

/** How wide the logo is shown on the loading screen. */
const LOGO_SHOWN = 560;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor(GRASS.dark);
    this.load.json('manifest', 'assets/manifest.json');
    // The logo stands over the loading bar, so it is the first picture asked for. It is written at three
    // times the size it is drawn (art/logo.ts) and shown here at less than that, so it needs no more.
    this.load.svg('logo', 'assets/logo/logo.svg', { scale: Math.min(1, (LOGO_SHOWN * Math.max(1, RES)) / (LOGO_W * LOGO_SCALE)) });
  }

  create(): void {
    const manifest = this.cache.json.get('manifest') as Manifest;
    setManifest(manifest);

    // The logo, and under it the bar that fills as the art comes in.
    const logo = this.add.image(W / 2, H / 2 - 70, 'logo');
    logo.setDisplaySize(LOGO_SHOWN, (LOGO_SHOWN * LOGO_H) / LOGO_W).setAlpha(0);
    this.tweens.add({ targets: logo, alpha: 1, y: H / 2 - 82, duration: 260, ease: 'Cubic.easeOut' });
    const by = H / 2 + 136;
    const bar = this.add.graphics();
    const draw = (p: number): void => {
      bar.clear();
      bar.fillStyle(hex(OUTLINE), 1).fillRoundedRect(W / 2 - 204, by - 16, 408, 32, 14);
      bar.fillStyle(hex(BONE.fill), 1).fillRoundedRect(W / 2 - 198, by - 10, Math.max(20, 396 * p), 20, 9);
    };
    draw(0);
    this.load.on(Phaser.Loader.Events.PROGRESS, draw);

    const art = sheet(this.game, manifest);
    art.queue(this, 'fx');
    art.queue(this, 'icons');
    // Whole units for the cards: the player's side sharp, the enemy's small, as that is how each is shown.
    const cards = cardSheet(this.game, manifest);
    cards.queue(this, 'packs');
    cards.queue(this, 'grades');
    for (const unit of Object.keys(manifest.units)) {
      this.load.svg(`svg:portrait/blue/${unit}`, `assets/units/blue/${unit}/full.svg`, { scale: ART_SCALE });
      this.load.svg(`svg:portrait/red/${unit}`, `assets/units/red/${unit}/full.svg`, { scale: 1 });
    }

    // The recorded sounds, in one file. They are read while the game goes on: nothing waits for them.
    this.load.binary('audio-bank', 'assets/audio/bank.bin');

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      void fillBank(this.cache.binary.get('audio-bank') as ArrayBuffer | undefined);
      // Text is drawn with the browser's canvas, so the font has to be there before any is made.
      const fonts = typeof document !== 'undefined' && document.fonts
        ? Promise.all([document.fonts.load(`600 24px ${FONT}`), document.fonts.load(`700 24px ${FONT}`)])
        : Promise.resolve([]);
      const go = (): void => {
        art.keepFolder(this, 'fx', 'fx');
        art.keepFolder(this, 'icons', 'icon');
        makeDigitFont(this, art);
        // From here down, the sheet is for the units of whatever battle is on.
        art.seal();
        cards.keepFolder(this, 'packs', 'pack');
        // Tallest first, so that the rows of the sheet waste little.
        const units = Object.entries(manifest.units).sort((a, b) => b[1].full[3] - a[1].full[3]);
        for (const [team, scale] of [['blue', ART_SCALE], ['red', 1]] as const) {
          for (const [unit, info] of units) {
            const key = `svg:portrait/${team}/${unit}`;
            const source = this.textures.get(key).getSourceImage() as HTMLImageElement;
            // A card's picture stands on its feet: the frame turns about the middle of the ground under it.
            const box = info.full;
            cards.keep(
              portraitFrame(team, unit),
              source,
              Math.round(box[2] * scale),
              Math.round(box[3] * scale),
              [(96 - box[0]) / box[2], (180 - box[1]) / box[3]],
              [(box[0] + manifest.margin) * scale, (box[1] + manifest.margin) * scale],
            );
            this.textures.remove(key);
          }
        }
        cards.keepFolder(this, 'grades', 'grade');
        cards.refresh();
        ads().loadingDone();
        this.scene.start(startScene());
      };
      fonts.then(go, go);
    });
    this.load.start();
  }
}
