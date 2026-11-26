// Loads what the first screen needs and nothing more: the manifest, the
// effects and the icons, the font, and the pictures of whoever that screen
// shows. A wave's figures come as the wave is come to (ArenaScene), and the
// rest in the background once the game is being played (stream.ts).

import Phaser from 'phaser';
import { LOGO_H, LOGO_SCALE, LOGO_W } from '../../art/logoSize';
import type { Manifest } from '../../art/manifest';
import { OUTLINE } from '../../art/kit/palette';
import { COMPANIONS, HEROES, byId, waveOf } from '../../game/data';
import { ASSETS, setManifest, setupCamera } from '../app';
import { FONT, view } from '../config';
import { makeDigitFont } from '../Numbers';
import { sheet } from '../art/Sheet';
import { bundle, prefetchSvg, unitBundles } from '../art/bundles';
import { LISTED, STREAM, keepPortraits, spinner } from '../stream';
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
    const shown = Math.min(480, view.w - 80);
    this.load.svg('logo', 'assets/logo/logo.svg', { scale: Math.min(1, (shown * Math.max(1, view.res)) / (LOGO_W * LOGO_SCALE)) });
    // The game's small mark, which turns while something is still coming: there is no loading bar.
    this.load.svg('mark', 'assets/logo/mark.svg', { width: 128, height: 128 });
    // Everything the first screen needs is asked for at once, side by side: the bundle of what is kept from the
    // start, the font, and for someone new the first wave's ground and figures. Each would otherwise wait for the
    // one before it.
    void bundle('kept');
    if (typeof document !== 'undefined' && document.fonts) void Promise.all([document.fonts.load(`600 24px ${FONT}`), document.fonts.load(`700 24px ${FONT}`)]).catch(() => undefined);
    const s = save();
    if (s.runs === 0 && !s.run) {
      const wave = waveOf(1);
      void prefetchSvg(`assets/arena/${wave.land}-${view.tall ? 'tall' : 'wide'}.svg`);
      const red = wave.mix.map(([id]) => id);
      void unitBundles([
        ...[HEROES[0].unit, ...s.band.map((id) => byId(COMPANIONS, id).unit)].map((unit) => ({ team: 'blue', unit })),
        ...red.map((unit) => ({ team: 'red', unit })),
      ]);
    }
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
    spinner(this, cx, cy + 100, 48);
    // The page's own mark, which turned until the game could draw, gives way to the game's.
    if (typeof document !== 'undefined') document.getElementById('boot-mark')?.remove();

    // Only what the first screen needs. Someone who has never played lands in the first wave as Wren, with the band
    // they start with: their pictures and the field's. Anyone else sees the title, which shows every hero and
    // companion. The rest comes in the background once the game is being played (stream.ts).
    const s = save();
    const fresh = s.runs === 0 && !s.run;
    const first = fresh ? [HEROES[0].unit, ...s.band.map((id) => byId(COMPANIONS, id).unit)] : [...LISTED];
    const art = sheet(this.game, manifest, SHEET_HEIGHT);
    void bundle('kept').then(() => {
      art.queue(this, 'fx');
      art.queue(this, 'icons');
      // The title's own ground: the meadow, small. It is only ever seen dim and behind things.
      if (!fresh) this.load.svg('hold:ground', 'assets/arena/meadow-wide.svg', { scale: 0.5 });
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        // Text is drawn with the browser's canvas, so the font has to be there before any is made: no word is ever
        // drawn in a font that is not the game's.
        const fonts = typeof document !== 'undefined' && document.fonts
          ? Promise.all([document.fonts.load(`600 24px ${FONT}`), document.fonts.load(`700 24px ${FONT}`)])
          : Promise.resolve([]);
        const go = (): void => {
          art.keepFolder(this, 'fx', 'fx');
          art.inner('fx/pixel', 'fx/solid', 5);
          art.keepFolder(this, 'icons', 'icon');
          makeDigitFont(this, art);
          // From here down, the sheet is for the figures of the field.
          art.seal();
          void keepPortraits(this, manifest, first).then(() => {
            this.scene.launch(ASSETS);
            this.scene.launch(STREAM);
            if (fresh) {
              startRun(HEROES[0].id);
              this.scene.start('Arena');
            } else this.scene.start('Title');
          });
        };
        fonts.then(go, go);
      });
      this.load.start();
    });
  }
}
