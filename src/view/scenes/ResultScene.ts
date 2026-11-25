// How a hunt ended, shown over the lair: whether the monster fell, what it
// paid, the trophy and what it opened, and where to go from here. It asks
// the session what the hunt paid; it works nothing out.

import Phaser from 'phaser';
import { BONE, GOLD, HOLY, IRON, OUTLINE, RUBY } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { MONSTERS, byId } from '../../game/content';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { SHEET } from '../art/Sheet';
import { leaveHunt, save, takeContract, theContract, theHunt, thePay } from '../session';
import { slabImage } from '../ui/bake';
import { Button, label } from '../ui/widgets';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(): void {
    const hunt = theHunt();
    const pay = thePay();
    if (!hunt || !pay) {
      this.scene.stop('Lair');
      this.scene.start('Lodge');
      return;
    }
    setupCamera(this);
    const c = theContract();
    const m = byId(MONSTERS, c.monster);
    this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.72).setInteractive();
    const cx = view.w / 2;
    const pw = Math.min(480, view.w - 28);
    const lines: Array<[string, string]> = [];
    const t = Math.round(hunt.tally.time);
    lines.push(['The hunt took', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`]);
    if (hunt.tally.breaks > 0) lines.push(['It was broken', `${hunt.tally.breaks} time${hunt.tally.breaks === 1 ? '' : 's'}`]);
    lines.push([pay.first ? 'Coin, twice for the first fall' : 'Coin', `+${pay.coin}`]);
    const notes: string[] = [];
    if (pay.trophy) notes.push(`Trophy: ${m.trophy.name}. ${m.trophy.says}`);
    if (pay.opened.length) notes.push(`Now at the lodge: ${pay.opened.join(', ')}.`);
    if (pay.posted.length) notes.push(`A new contract is posted: ${pay.posted.join(', ')}.`);
    if (!pay.won) notes.push(hunt.tally.killedBy ? 'It can be hunted again at once.' : 'The hunter turned back.');
    const ph = 190 + lines.length * 30 + notes.length * 50 + 80;
    const py = Math.max(12, (view.h - ph) / 2);
    this.add.existing(slabImage(this, cx - pw / 2, py, pw, ph, BONE, 20, 8));
    label(this, cx, py + 44, pay.won ? 'IT HAS FALLEN' : 'THE HUNT IS LOST', { size: 36, color: pay.won ? HOLY.fill : RUBY.fill });
    label(this, cx, py + 82, `${m.name}, ${['first', 'second', 'third'][c.mark - 1]} mark`, { size: 17, color: OUTLINE, stroke: null });
    let y = py + 124;
    for (const [name, value] of lines) {
      label(this, cx - pw / 2 + 36, y, name, { size: 17, align: 'left', color: OUTLINE, stroke: null });
      label(this, cx + pw / 2 - 36, y, value, { size: 19, align: 'right', color: OUTLINE, stroke: null });
      y += 30;
    }
    y += 8;
    for (const note of notes) {
      label(this, cx, y + 14, note, { size: 16, color: '#2e5f45', stroke: null, wrap: pw - 60 });
      y += 50;
    }
    const by = py + ph - 52;
    const again = (): void => {
      // The same contract, with the muster as it stands.
      takeContract(c.monster, c.mark);
      this.leave('Lair');
    };
    // The first win goes to the lodge: there is something new there. A loss is tried again at once.
    const first = pay.won && save().wins <= 1;
    new Button(this, cx - (first ? 0 : 112), by, 'THE LODGE', () => this.leave('Lodge'), { width: 200, height: 56, size: 22, mat: pay.won ? GOLD : IRON });
    if (!first) new Button(this, cx + 112, by, pay.won ? 'HUNT AGAIN' : 'TRY AGAIN', again, { width: 200, height: 56, size: 22, mat: pay.won ? IRON : GOLD });
    sfx.play('open', 0.6);
  }

  private leave(to: 'Lodge' | 'Lair'): void {
    const c = theContract();
    leaveHunt();
    if (to === 'Lair') takeContract(c.monster, c.mark);
    this.scene.stop('Hud');
    this.scene.stop('Lair');
    this.scene.start(to);
  }
}
