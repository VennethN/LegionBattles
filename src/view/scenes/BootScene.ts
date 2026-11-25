// Loads what the game needs before its first frame: the manifest, the
// effects and the icons, the heroes' pictures for the lists, the font and
// the sounds. The figures of a wave come later, as the wave is come to
// (ArenaScene).

import Phaser from 'phaser';
import { LOGO_H, LOGO_SCALE, LOGO_W } from '../../art/logoSize';
import type { Manifest } from '../../art/manifest';
import { BONE, OUTLINE } from '../../art/kit/palette';
import { fillBank } from '../../audio/bank';
import { HEROES } from '../../game/data';
import { ads } from '../../platform/ads';
import { ASSETS, getManifest, setManifest, setupCamera } from '../app';
import { ART_SCALE, FONT, hex, view } from '../config';
import { makeDigitFont } from '../Numbers';
import { cardSheet, portraitFrame, sheet } from '../art/Sheet';
import { save, startRun } from '../session';

/** The sheet of the field is taller than it is wide: a hero, three lands of enemies and their bosses are on it together. */
export const SHEET_HEIGHT = 4096;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor(OUTLINE);
    this.load.json('manifest', 'assets/manifest.json');
    // The logo stands over the loading bar, so it is the first picture asked for.
    const shown = Math.min(480, view.w - 80);
    this.load.svg('logo', 'assets/logo/logo.svg', { scale: Math.min(1, (shown * Math.max(1, view.res)) / (LOGO_W * LOGO_SCALE)) });
  }

  create(): void {
    const manifest = this.cache.json.get('manifest') as Manifest;
    setManifest(manifest);
    const cx = view.w / 2;
    const cy = view.h / 2;
    const shown = Math.min(480, view.w - 80);
    const logo = this.add.image(cx, cy - 50, 'logo');
    logo.setDisplaySize(shown, (shown * LOGO_H) / LOGO_W).setAlpha(0);
    this.tweens.add({ targets: logo, alpha: 1, y: cy - 60, duration: 260, ease: 'Cubic.easeOut' });
    const by = cy + 110;
    const bw = Math.min(360, view.w - 120);
    const bar = this.add.graphics();
    const draw = (p: number): void => {
      bar.clear();
      bar.fillStyle(hex(BONE.shade), 1).fillRoundedRect(cx - bw / 2 - 6, by - 16, bw + 12, 32, 14);
      bar.fillStyle(hex(OUTLINE), 1).fillRoundedRect(cx - bw / 2 - 2, by - 12, bw + 4, 24, 11);
      bar.fillStyle(hex(BONE.fill), 1).fillRoundedRect(cx - bw / 2, by - 10, Math.max(20, bw * p), 20, 9);
    };
    draw(0);
    this.load.on(Phaser.Loader.Events.PROGRESS, draw);

    const art = sheet(this.game, manifest, SHEET_HEIGHT);
    art.queue(this, 'fx');
    art.queue(this, 'icons');
    art.queue(this, 'packs');
    // Whole figures for the list of heroes.
    const cards = cardSheet(this.game, manifest);
    const heroes = HEROES.map((h) => h.unit);
    for (const unit of heroes) this.load.svg(`svg:portrait/blue/${unit}`, `assets/units/blue/${unit}/full.svg`, { scale: ART_SCALE });
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
        art.inner('fx/pixel', 'fx/solid', 5);
        art.keepFolder(this, 'icons', 'icon');
        art.keepFolder(this, 'packs', 'pack');
        makeDigitFont(this, art);
        // From here down, the sheet is for the figures of the field.
        art.seal();
        const units = heroes.map((unit) => [unit, getManifest().units[unit]] as const).sort((a, b) => b[1].full[3] - a[1].full[3]);
        for (const [unit, info] of units) {
          const key = `svg:portrait/blue/${unit}`;
          const source = this.textures.get(key).getSourceImage() as HTMLImageElement;
          // A list's picture stands on its feet: the frame turns about the middle of the ground under it.
          const box = info.full;
          cards.keep(
            portraitFrame('blue', unit),
            source,
            Math.round(box[2] * ART_SCALE),
            Math.round(box[3] * ART_SCALE),
            [(96 - box[0]) / box[2], (180 - box[1]) / box[3]],
            [(box[0] + manifest.margin) * ART_SCALE, (box[1] + manifest.margin) * ART_SCALE],
          );
          this.textures.remove(key);
        }
        cards.refresh();
        ads().loadingDone();
        this.scene.launch(ASSETS);
        // Someone who has never played lands in the field at once, as the Knight: the list of heroes can wait until
        // there is a reason to choose. Anyone else chooses first.
        const s = save();
        if (s.runs === 0 && !s.run) {
          startRun(HEROES[0].id);
          this.scene.start('Arena');
        } else this.scene.start('Title');
      };
      fonts.then(go, go);
    });
    this.load.start();
  }
}
