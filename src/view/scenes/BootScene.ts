// Loads what the game needs before its first frame: the manifest, the
// effects and the icons, the whole pictures for the lodge's cards, the font
// and the sounds. The figures of a lair come later, as the lair is come to
// (LairScene).

import { loadUi } from '../ui/grim';
import Phaser from 'phaser';
import { GRIM_UNITS } from '../pictures';
import { setGrim, type GrimManifest } from '../art/grim';
import type { Manifest } from '../../art/manifest';
import { OUTLINE } from '../../art/kit/palette';
import { fillBank } from '../../audio/bank';
import { ads } from '../../platform/ads';
import { ASSETS, getManifest, setManifest, setupCamera } from '../app';
import { ART_SCALE, FONT, TEXT_FONT, view } from '../config';
import { makeDigitFont } from '../Numbers';
import { keepVfxShapes } from '../vfx/shapes';
import { cardSheet, portraitFrame, sheet } from '../art/Sheet';
import { WHOLE } from '../pictures';
import { save } from '../session';

/** The sheet of the lair is taller than it is wide: a hunter, a monster drawn big, and everyone and everything else that can be on a field. */
export const SHEET_HEIGHT = 4096;
/** The title's picture, as the kit draws it. */
const TITLE_W = 444;
const TITLE_H = 214;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor(OUTLINE);
    this.load.json('manifest', 'assets/manifest.json');
    this.load.json('grim', 'assets/grim/manifest.json');
    // The logo stands over the loading bar, so it is the first picture asked for.
    const shown = Math.min(480, view.w - 80);
    // The title, lettered in the style's own hand.
    this.load.svg('logo', 'assets/grim/things/title.svg', { scale: Math.min(3, (shown * Math.max(1, view.res)) / TITLE_W) });
    this.load.svg('bill', 'assets/grim/things/bill.svg', { scale: 1.5 });
  }


  create(): void {
    const manifest = this.cache.json.get('manifest') as Manifest;
    setManifest(manifest);
    const grim = this.cache.json.get('grim') as GrimManifest;
    setGrim(grim);
    const cx = view.w / 2;
    const cy = view.h / 2;
    const shown = Math.min(480, view.w - 80);
    const logo = this.add.image(cx, cy - 50, 'logo');
    logo.setDisplaySize(shown, (shown * TITLE_H) / TITLE_W).setAlpha(0);
    this.tweens.add({ targets: logo, alpha: 1, y: cy - 60, duration: 260, ease: 'Cubic.easeOut' });
    const by = cy + 110;
    const bw = Math.min(360, view.w - 120);
    const bar = this.add.graphics();
    const draw = (p: number): void => {
      bar.clear();
      // An iron trough with a strip of tallow light filling it: no rounded pastel bar in this game.
      bar.fillStyle(0x3a3631, 1).fillRect(cx - bw / 2 - 6, by - 12, bw + 12, 24);
      bar.fillStyle(0x0b0908, 1).fillRect(cx - bw / 2 - 2, by - 8, bw + 4, 16);
      bar.fillStyle(0xc89a4a, 1).fillRect(cx - bw / 2, by - 6, Math.max(6, bw * p), 12);
    };
    draw(0);
    this.load.on(Phaser.Loader.Events.PROGRESS, draw);

    const art = sheet(this.game, manifest, SHEET_HEIGHT);
    art.queue(this, 'fx');
    art.queue(this, 'icons');
    // Whole figures for the lodge's cards: the board's bills and the muster.
    const cards = cardSheet(this.game, manifest);
    for (const k of WHOLE) this.load.svg(`svg:portrait/${k.team}/${k.unit}`, `assets/units/${k.team}/${k.unit}/full.svg`, { scale: ART_SCALE });
    // The style's own figures, each made about as tall as a card can show it.
    const cardScale = (id: string): number => Math.min(1.5, 230 / grim.units[id].full[3]);
    for (const id of GRIM_UNITS) this.load.svg(`svg:portrait/grim/${id}`, `assets/grim/units/${id}/full.svg`, { scale: cardScale(id) });
    // The style's own interface pieces: buttons, slots, bar frames, the panel, the icons.
    loadUi(this);
    // The recorded sounds, in one file. They are read while the game goes on: nothing waits for them.
    this.load.binary('audio-bank', 'assets/audio/bank.bin');

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      void fillBank(this.cache.binary.get('audio-bank') as ArrayBuffer | undefined);
      // Text is drawn with the browser's canvas, so the font has to be there before any is made.
      const fonts = typeof document !== 'undefined' && document.fonts
        ? Promise.all([document.fonts.load(`600 24px ${FONT}`), document.fonts.load(`700 24px ${FONT}`), document.fonts.load(`500 24px ${TEXT_FONT}`), document.fonts.load(`700 24px ${TEXT_FONT}`)])
        : Promise.resolve([]);
      const go = (): void => {
        art.keepFolder(this, 'fx', 'fx');
        art.inner('fx/pixel', 'fx/solid', 5);
        art.keepFolder(this, 'icons', 'icon');
        // The shapes the effects are made of: on the sheet with everything else, so that a spark is drawn in the same batch.
        keepVfxShapes(art);
        makeDigitFont(this, art);
        // From here down, the sheet is for the figures of the field.
        art.seal();
        const units = WHOLE.map((k) => [k, getManifest().units[k.unit]] as const).sort((a, b) => b[1].full[3] - a[1].full[3]);
        for (const [k, info] of units) {
          const key = `svg:portrait/${k.team}/${k.unit}`;
          const source = this.textures.get(key).getSourceImage() as HTMLImageElement;
          // A list's picture stands on its feet: the frame turns about the middle of the ground under it.
          const box = info.full;
          cards.keep(
            portraitFrame(k.team, k.unit),
            source,
            Math.round(box[2] * ART_SCALE),
            Math.round(box[3] * ART_SCALE),
            [(96 - box[0]) / box[2], (180 - box[1]) / box[3]],
            [(box[0] + manifest.margin) * ART_SCALE, (box[1] + manifest.margin) * ART_SCALE],
          );
          this.textures.remove(key);
        }
        for (const id of GRIM_UNITS) {
          const u = grim.units[id];
          const k = cardScale(id);
          const key = `svg:portrait/grim/${id}`;
          const [bx, by, bw, bh] = u.full;
          cards.keep(
            portraitFrame('grim', id), this.textures.get(key).getSourceImage() as HTMLImageElement, Math.floor(bw * k), Math.floor(bh * k),
            [(u.feet[0] - bx) / bw, (u.feet[1] - by) / bh], [Math.ceil((bx + u.margin) * k), Math.ceil((by + u.margin) * k)],
          );
          this.textures.remove(key);
        }
        cards.refresh();
        ads().loadingDone();
        this.scene.launch(ASSETS);
        // Someone who has never hunted presses PLAY and is in a lair, against the first boss: the lodge can wait
        // until there is a reason to choose. Anyone else starts there.
        this.scene.start(save().hunts === 0 ? 'Title' : 'Lodge');
      };
      fonts.then(go, go);
    });
    this.load.start();
  }
}
