// The end of a run, over the field where it ended: how far the hero came,
// what that opened, and the way back in.

import Phaser from 'phaser';
import { BONE, BUSH, CLOTH, GOLD, HOLY, IRON, OUTLINE, VENOM } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { COMPANIONS, ENEMIES, HEROES, byId } from '../../game/data';
import { heroOf, survived } from '../../game/run';
import { hasWon, masteryLevel, nextDeeds, type Tally } from '../../game/hold';
import { comeIn, setupCamera } from '../app';
import { hex, view } from '../config';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { endRun, save, startRun, takeFriends, takeGained, takeOpened, theRun, theWorld } from '../session';
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
    // What the run paid in renown, line by line, and the quests nearest to done: the reasons to go again. On a wide
    // screen they are a second column beside the run; on a tall one they are under it.
    const tally = s.tally;
    const quests = nextDeeds(s, 3);
    const gained = takeGained();
    const side = !view.tall;
    const tallyH = tally ? 62 + tally.lines.length * 26 + 34 : 0;
    const questH = quests.length > 0 ? 40 + quests.length * 58 : 0;
    const sideH = tallyH + questH;
    const sw = side ? Math.min(380, view.w - 28 - 460 - 14) : 0;
    const cx = side ? view.w / 2 - (sw + 14) / 2 : view.w / 2;
    const pw = Math.min(460, view.w - 28);
    // As tall as what it has to say: the rows, and whoever this run opened.
    const lines = 4 + (run.relics.length > 0 ? 1 : 0) + (run.band.length > 0 ? 1 : 0);
    const under = 172 + lines * 28 + 4;
    const best = s.best[hero.id] ?? 0;
    const isBest = waves > 0 && waves >= best;
    const friends = takeFriends();
    // Each thing under the rows has a line of its own: the best yet, a companion who will come, the heroes opened.
    // They were placed by fixed numbers once, and wrote over each other on a small screen.
    const extra = (isBest ? 28 : 0) + (friends.length > 0 ? 30 : 0) + (gained.slots > 0 ? 30 : 0) + (gained.levels > 0 ? 30 : 0);
    // The heroes a run unlocked are shown in pictures, unless that would push the buttons off the screen: then they
    // are named on one line. A long run can unlock companions, slots, a level and heroes all at once.
    const room = view.h - 28 - (side ? 0 : sideH + 14);
    const compact = opened.length > 0 && under + extra + 28 + 150 + 70 > room;
    const ph = under + extra + 28 + (opened.length > 0 ? (compact ? 34 : 150) : 0) + 70;
    const py = side ? Math.max(14, (view.h - Math.max(ph, sideH)) / 2) : Math.max(14, (view.h - ph - sideH - 14) / 2);
    this.add.existing(slabImage(this, cx - pw / 2, py, pw, ph, BONE, 20, 8));
    if (sideH > 0) this.renown(side ? cx + pw / 2 + 14 : cx - pw / 2, side ? py : py + ph + 14, side ? sw : pw, tally, quests);
    // Whose run it was: their picture, their name and what they are called, before how it ended.
    const pic = this.add.image(cx - pw / 2 + 70, py + 118, CARDS, portraitFrame('blue', hero.unit));
    pic.setScale(Math.min(96 / (pic.frame.height || 1), 100 / (pic.frame.width || 1)));
    const nx = cx - pw / 2 + 132;
    const name = label(this, nx, py + 50, hero.name.toUpperCase(), { size: 24, align: 'left', color: OUTLINE, stroke: null });
    name.setScale(Math.min(1, (pw - 150) / Math.max(1, name.width)));
    label(this, nx, py + 76, hero.epithet, { size: 17, align: 'left', color: HOLY.shade, stroke: null });
    heading(this, cx, py + 2, hasWon(run) ? 'VICTORY' : 'DEFEATED', hasWon(run) ? GOLD : CLOTH.red);
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

    // A slot or a mastery level the run unlocked: the reasons this run counted for something even if it was lost.
    if (gained.slots > 0) {
      label(this, cx, at, gained.slots > 1 ? `${gained.slots} NEW COMPANION SLOTS UNLOCKED` : 'NEW COMPANION SLOT UNLOCKED', { size: 16, color: '#2e5f45', stroke: null });
      at += 30;
    }
    if (gained.levels > 0) {
      label(this, cx, at, `${hero.short.toUpperCase()} REACHED MASTERY LEVEL ${masteryLevel(s, hero.id)}`, { size: 16, color: '#7a5a12', stroke: null });
      at += 30;
    }

    // Whoever this run opened is shown, by name now.
    if (opened.length > 0 && compact) {
      const names = opened.map((id) => byId(HEROES, id).short.toUpperCase()).join(', ');
      const line = label(this, cx, at + 4, `${opened.length > 1 ? 'NEW HEROES' : 'NEW HERO'} UNLOCKED: ${names}`, { size: 16, color: HOLY.shade, stroke: null });
      line.setScale(Math.min(1, (pw - 40) / Math.max(1, line.width)));
      this.time.delayedCall(350, () => sfx.play('claim', 0.8));
    } else if (opened.length > 0) {
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

  /** The mastery the run paid its hero, a line for each reason with its total, and under it the next quests with how far along each is. */
  private renown(x: number, y: number, w: number, tally: Tally | null, quests: ReturnType<typeof nextDeeds>): void {
    const h = (tally ? 62 + tally.lines.length * 26 + 34 : 0) + (quests.length > 0 ? 40 + quests.length * 58 : 0);
    this.add.existing(slabImage(this, x, y, w, h, BONE, 20, 8));
    let at = y + 30;
    const ink = OUTLINE;
    if (tally) {
      label(this, x + 22, at, 'MASTERY EARNED', { size: 19, align: 'left', color: ink, stroke: null });
      at += 32;
      tally.lines.forEach((l, i) => {
        // Each line comes in after the one before it, and the total last: the pay is counted out.
        const name = label(this, x + 22, at, l.count > 1 ? `${l.why} x${l.count}` : l.why, { size: 16, align: 'left', color: ink, stroke: null });
        const val = label(this, x + w - 22, at, `+${l.xp}`, { size: 17, align: 'right', color: '#7a5a12', stroke: null });
        for (const t of [name, val]) {
          t.setAlpha(0);
          this.tweens.add({ targets: t, alpha: 1, duration: 200, delay: 250 + i * 160 });
        }
        at += 26;
      });
      const g = this.add.graphics();
      g.lineStyle(3, hex(OUTLINE), 0.5).lineBetween(x + 22, at - 8, x + w - 22, at - 8);
      label(this, x + 22, at + 8, 'TOTAL', { size: 18, align: 'left', color: ink, stroke: null });
      const total = label(this, x + w - 22, at + 8, `+${tally.total}`, { size: 22, align: 'right', color: '#7a5a12', stroke: null });
      total.setAlpha(0);
      this.tweens.add({ targets: total, alpha: 1, scale: { from: 1.6, to: 1 }, duration: 320, delay: 300 + tally.lines.length * 160, ease: 'Back.easeOut', onStart: () => sfx.play('coin', 0.7) });
      at += 44;
    }
    if (quests.length > 0) {
      label(this, x + 22, at, 'NEXT QUESTS', { size: 19, align: 'left', color: ink, stroke: null });
      at += 26;
      for (const q of quests) {
        const reward = q.xp > 0 ? `+${q.xp}` : q.kind === 'crate' ? 'CRATE' : 'UNLOCK';
        const t = label(this, x + 22, at + 8, q.name === '???' ? 'Unlock someone new' : q.name, { size: 16, align: 'left', color: ink, stroke: null });
        t.setScale(Math.min(1, (w - 120) / Math.max(1, t.width)));
        label(this, x + w - 22, at + 8, reward, { size: 16, align: 'right', color: '#7a5a12', stroke: null });
        const says = label(this, x + 22, at + 28, q.says, { size: 15, align: 'left', color: '#4a3a2a', stroke: null, weight: 600 });
        says.setScale(Math.min(1, (w - 44) / Math.max(1, says.width)));
        const g = this.add.graphics();
        g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(x + 22, at + 42, w - 44, 10, 4);
        if (q.share > 0) g.fillStyle(hex(VENOM.fill), 1).fillRoundedRect(x + 24, at + 44, Math.max(4, (w - 48) * q.share), 6, 3);
        at += 58;
      }
    }
  }
}
