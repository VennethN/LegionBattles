// The end of a run, over the field where it ended: how far the hero came,
// what that opened, and the way back in.

import Phaser from 'phaser';
import { BONE, BUSH, CLOTH, HOLY, IRON, OUTLINE } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { COMPANIONS, ENEMIES, HEROES, byId } from '../../game/data';
import { heroOf, survived } from '../../game/run';
import { comeIn, setupCamera } from '../app';
import { hex, view } from '../config';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { endRun, save, startRun, takeFriends, takeOpened, theRun, theWorld } from '../session';
import { slabImage } from '../ui/bake';
import { Button, heading, label } from '../ui/widgets';

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
    comeIn(this);
    const world = theWorld();
    const s = save();
    const hero = heroOf(run);
    const waves = survived(run);
    const opened = takeOpened();
    music.play('meadow', 'calm');
    this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.8).setInteractive();
    const cx = view.w / 2;
    const pw = Math.min(460, view.w - 28);
    // As tall as what it has to say: the rows, and whoever this run opened.
    const lines = 4 + (run.relics.length > 0 ? 1 : 0) + (run.band.length > 0 ? 1 : 0);
    const under = 172 + lines * 28 + 4;
    const best = s.best[hero.id] ?? 0;
    const isBest = waves > 0 && waves >= best;
    const friends = takeFriends();
    // Each thing under the rows has a line of its own: the best yet, a companion who will come, the heroes opened.
    // They were placed by fixed numbers once, and wrote over each other on a small screen.
    const extra = (isBest ? 28 : 0) + (friends.length > 0 ? 30 : 0);
    const ph = under + extra + 28 + (opened.length > 0 ? 150 : 0) + 70;
    const py = Math.max(14, (view.h - ph) / 2);
    this.add.existing(slabImage(this, cx - pw / 2, py, pw, ph, BONE, 20, 8));
    // Whose run it was: their picture, their name and what they are called, before how it ended.
    const pic = this.add.image(cx - pw / 2 + 70, py + 118, CARDS, portraitFrame('blue', hero.unit));
    pic.setScale(Math.min(96 / (pic.frame.height || 1), 100 / (pic.frame.width || 1)));
    const nx = cx - pw / 2 + 132;
    const name = label(this, nx, py + 40, hero.name.toUpperCase(), { size: 24, align: 'left', color: OUTLINE, stroke: null });
    name.setScale(Math.min(1, (pw - 150) / Math.max(1, name.width)));
    label(this, nx, py + 66, hero.epithet, { size: 17, align: 'left', color: HOLY.shade, stroke: null });
    heading(this, cx, py + 2, 'DEFEATED', CLOTH.red);
    // Who landed the last blow, if anyone did: a hero who gave up fell to no one.
    const by = world?.lastBy ? ENEMIES.find((e) => e.id === world.lastBy)?.name : '';
    label(this, nx, py + 104, by ? `Wave ${run.wave}. Killed by: ${by}` : `Wave ${run.wave}`, { size: 17, align: 'left', color: OUTLINE, stroke: null });
    const rows: Array<[string, string]> = [
      ['Waves survived', String(waves)],
      ['Enemies defeated', String(run.kills)],
      ['Coins collected', String(run.coins)],
      ['Level', String(run.level)],
    ];
    // What they found on the road, and who stood with them.
    if (run.relics.length > 0) rows.push(['Relics', String(run.relics.length)]);
    if (run.band.length > 0) rows.push(['Companions', run.band.map((b) => byId(COMPANIONS, b.id).name).join(', ')]);
    rows.forEach(([name, value], i) => {
      const y = py + 172 + i * 28;
      label(this, cx - pw / 2 + 40, y, name, { size: 18, align: 'left', color: OUTLINE, stroke: null });
      label(this, cx + pw / 2 - 40, y, value, { size: 20, align: 'right', color: OUTLINE, stroke: null });
    });
    let at = py + under + 4;
    if (isBest) {
      label(this, cx, at, `New best for ${hero.short}!`, { size: 17, color: '#2e5f45', stroke: null });
      at += 28;
    }
    // A companion this run opened is named.
    if (friends.length > 0) {
      const names = friends.map((id) => byId(COMPANIONS, id).name.toUpperCase()).join(', ');
      const line = label(this, cx, at, `NEW COMPANION UNLOCKED: ${names}`, { size: 16, color: HOLY.shade, stroke: null });
      line.setScale(Math.min(1, (pw - 40) / Math.max(1, line.width)));
      at += 30;
    }

    // Whoever this run opened is shown, by name now.
    if (opened.length > 0) {
      const y = at + 58;
      label(this, cx, y - 36, opened.length > 1 ? 'NEW HEROES UNLOCKED' : 'NEW HERO UNLOCKED', { size: 20, color: HOLY.shade, stroke: null });
      const step = Math.min(110, (pw - 60) / opened.length);
      opened.forEach((id, i) => {
        const def = byId(HEROES, id);
        const x = cx + (i - (opened.length - 1) / 2) * step;
        // A list's picture stands on its feet.
        const img = this.add.image(x, y + 66, CARDS, portraitFrame('blue', def.unit));
        img.setScale(0.24).setAlpha(0);
        this.tweens.add({ targets: img, alpha: 1, y: y + 60, duration: 300, delay: 300 + i * 160, ease: 'Back.easeOut' });
        label(this, x, y + 78, def.short, { size: 16, color: OUTLINE, stroke: null });
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
    new Button(this, cx + bw / 2 + 8, byy, 'PLAY AGAIN', () => {
      startRun(hero.id);
      this.scene.stop();
      this.scene.get('Arena').scene.restart();
    }, { width: bw, height: 56, size: 26, mat: BUSH });
    void BONE;
  }
}
