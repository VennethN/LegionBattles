// The end of a run, over the field where it ended: how far the hero came,
// what that opened, and the way back in.

import Phaser from 'phaser';
import { BONE, BUSH, HOLY, IRON, OUTLINE, RUBY } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { ENEMIES, HEROES, byId } from '../../game/data';
import { heroOf, survived } from '../../game/run';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { endRun, save, startRun, takeOpened, theRun, theWorld } from '../session';
import { slabImage } from '../ui/bake';
import { Button, label } from '../ui/widgets';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(): void {
    const run = theRun();
    if (!run) {
      this.scene.start('Title');
      return;
    }
    setupCamera(this);
    const world = theWorld();
    const s = save();
    const hero = heroOf(run);
    const waves = survived(run);
    const opened = takeOpened();
    music.play('meadow', 'calm');
    this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.8).setInteractive();
    const cx = view.w / 2;
    const pw = Math.min(460, view.w - 28);
    const ph = opened.length > 0 ? 486 : 330;
    const py = Math.max(14, (view.h - ph) / 2);
    this.add.existing(slabImage(this, cx - pw / 2, py, pw, ph, BONE, 20, 8));
    label(this, cx, py + 44, 'FALLEN', { size: 40, color: RUBY.fill });
    // Who landed the last blow, if anyone did: a hero who gave up fell to no one.
    const by = world?.lastBy ? ENEMIES.find((e) => e.id === world.lastBy)?.name : '';
    label(this, cx, py + 82, by ? `on wave ${run.wave}, to ${/^The /.test(by) ? by : `a ${by}`}` : `on wave ${run.wave}`, { size: 17, color: OUTLINE, stroke: null });
    const best = s.best[hero.id] ?? 0;
    const rows: Array<[string, string]> = [
      ['Waves come through', String(waves)],
      ['Enemies felled', String(run.kills)],
      ['Coins gathered', String(run.coins)],
      ['Level', String(run.level)],
    ];
    rows.forEach(([name, value], i) => {
      const y = py + 124 + i * 30;
      label(this, cx - pw / 2 + 40, y, name, { size: 18, align: 'left', color: OUTLINE, stroke: null });
      label(this, cx + pw / 2 - 40, y, value, { size: 20, align: 'right', color: OUTLINE, stroke: null });
    });
    if (waves > 0 && waves >= best) label(this, cx, py + 250, `${hero.name}'s best yet`, { size: 17, color: '#2e5f45', stroke: null });

    // Whoever this run opened is shown, by name now.
    if (opened.length > 0) {
      const y = py + 318;
      label(this, cx, y - 36, opened.length > 1 ? 'NEW HEROES' : 'A NEW HERO', { size: 20, color: HOLY.shade, stroke: null });
      const step = Math.min(110, (pw - 60) / opened.length);
      opened.forEach((id, i) => {
        const def = byId(HEROES, id);
        const x = cx + (i - (opened.length - 1) / 2) * step;
        // A list's picture stands on its feet.
        const img = this.add.image(x, y + 66, CARDS, portraitFrame('blue', def.unit));
        img.setScale(0.24).setAlpha(0);
        this.tweens.add({ targets: img, alpha: 1, y: y + 60, duration: 300, delay: 300 + i * 160, ease: 'Back.easeOut' });
        label(this, x, y + 78, def.name, { size: 16, color: OUTLINE, stroke: null });
      });
      this.time.delayedCall(350, () => sfx.play('claim', 0.8));
    }

    const bw = (pw - 60) / 2;
    const byy = py + ph - 46;
    new Button(this, cx - bw / 2 - 8, byy, 'HEROES', () => {
      endRun();
      this.scene.stop('Arena');
      this.scene.start('Title');
    }, { width: bw, height: 56, size: 22, mat: IRON });
    new Button(this, cx + bw / 2 + 8, byy, 'AGAIN', () => {
      startRun(hero.id);
      this.scene.stop();
      this.scene.get('Arena').scene.restart();
    }, { width: bw, height: 56, size: 26, mat: BUSH });
    void BONE;
  }
}
