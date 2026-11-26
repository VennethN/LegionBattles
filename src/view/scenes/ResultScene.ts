// How a hunt ended, shown over the lair: whether the monster fell, what it
// paid, the trophy and what it opened, and where to go from here. It asks
// the session what the hunt paid; it works nothing out.

import Phaser from 'phaser';
import { BONE, GOLD, IRON, OUTLINE } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { HUNTERS, MONSTERS, byId } from '../../game/content';
import { TRINKETS } from '../../game/growth';
import { growthOf } from '../../game/lodge';
import { GrimFigure } from '../art/GrimFigure';
import { getGrim } from '../art/grim';
import { HUNTER_ART, dressAt, isGrim } from '../pictures';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { uiIcon, uiKey } from '../ui/grim';
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
    lines.push(['Time', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`]);
    if (hunt.tally.breaks > 0) lines.push(['Boss stunned', `${hunt.tally.breaks} time${hunt.tally.breaks === 1 ? '' : 's'}`]);
    lines.push([pay.first ? 'Reward (double: first win)' : 'Reward', `+${pay.coin} coin`]);
    if (pay.prize) lines.push(['End of the story', `+${pay.prize} coin`]);
    const lead = pay.ranks[0];
    if (lead) lines.push(['Experience', `+${lead.xp}`]);
    const notes: string[] = [];
    // Who rose a rank, what was found, and how far a chain of contracts has gone.
    const rose = pay.ranks.filter((r) => r.rose).map((r) => `${byId(HUNTERS, r.hunter).short} is now ${r.rose}.`);
    if (rose.length) notes.push(`Rank up: ${rose.join(' ')}`);
    const found = pay.trinket ? TRINKETS.find((x) => x.id === pay.trinket) : null;
    if (found) notes.push(`Found: ${found.name}. ${found.says}`);
    if (pay.chain) notes.push(pay.chain);
    if (pay.trophy) notes.push(`Trophy: ${m.trophy.name}. ${m.trophy.says}`);
    if (pay.opened.length) notes.push(`Unlocked: ${pay.opened.join(', ')}.`);
    if (pay.posted.length) notes.push(`New boss: ${pay.posted.join(', ')}.`);
    if (pay.lesson && pay.won) notes.push('That was him going easy. Next: the real fight.');
    if (!pay.won) notes.push(hunt.tally.killedBy ? 'You can try again at once.' : 'You gave up.');
    // The hunter's record: a page of old paper with the hunter's likeness, the hunt's lines, and the trophy on its plate.
    const ph = 190 + lines.length * 30 + notes.length * 50 + 80;
    const py = Math.max(12, (view.h - ph) / 2);
    this.add.existing(slabImage(this, cx - pw / 2, py, pw, ph, BONE, 2, 8));
    label(this, cx, py + 30, "HUNTER'S RECORD", { size: 15, color: '#5a4a38', stroke: null, face: 'display' });
    label(this, cx, py + 60, pay.won ? 'BOSS DEFEATED' : 'DEFEATED', { size: 34, color: pay.won ? '#6b4a1a' : '#8a1e16', stroke: null, face: 'display' });
    label(this, cx, py + 92, pay.lesson ? `${m.name}, your first hunt` : `${m.name}, difficulty ${c.mark}`, { size: 16, color: OUTLINE, stroke: null });
    // The hunter who went, at the page's left; the trophy, if one was won, on its plate at the right.
    const id = hunt.hunter.def.id;
    const risen = pay.ranks.find((r) => r.hunter === id && r.rose);
    const g = getGrim();
    const art = HUNTER_ART[id];
    if (risen && pw > 400 && isGrim(art) && g.units[art.grim]) {
      // A rank gained is a moment: the hunter in what they have just earned, lit, rising a little into it.
      const u = g.units[art.grim];
      const fx = cx - pw / 2 + 50;
      const fy = py + 116;
      this.add.image(fx, fy - 40, SHEET, 'fx/glow').setDisplaySize(140, 140).setTint(0xffc060).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD);
      const fig = new GrimFigure(this, art.grim, u, g.poses, 86 / (u.feet[1] - u.top), 5);
      fig.x = fx;
      fig.y = fy;
      fig.rank = dressAt(growthOf(save(), id).rank);
      fig.shift = 1;
      fig.root.setScale(0.8).setAlpha(0);
      this.tweens.add({ targets: fig.root, scale: 1, alpha: 1, duration: 520, ease: 'Back.Out' });
      this.events.on('update', (_t: number, dt: number) => fig.root.active && fig.update(this.time.now / 1000, dt / 1000));
      // What rank it is is said in the record's notes below: the figure itself is the moment.
      sfx.play('levelUp', 0.7);
    } else if (this.textures.get(CARDS).has(portraitFrame('grim', id)) && pw > 400) {
      const face = this.add.image(cx - pw / 2 + 46, py + 70, CARDS, portraitFrame('grim', id));
      face.setScale(Math.min(70 / face.width, 80 / face.height));
      if (!pay.won) face.setTint(0x7a6a5a);
    }
    if (pay.trophy && pw > 400) {
      this.add.image(cx + pw / 2 - 52, py + 76, uiKey('trophy-plate')).setDisplaySize(70, 88);
      const icon = uiIcon(`icon-trophy-${pay.trophy}`);
      if (icon) this.add.image(cx + pw / 2 - 52, py + 72, icon).setDisplaySize(44, 44);
    }
    let y = py + 132;
    for (const [name, value] of lines) {
      label(this, cx - pw / 2 + 36, y, name, { size: 17, align: 'left', color: OUTLINE, stroke: null });
      label(this, cx + pw / 2 - 36, y, value, { size: 19, align: 'right', color: OUTLINE, stroke: null, face: 'display' });
      // A ruled line under each, as a ledger has.
      this.add.rectangle(cx, y + 13, pw - 64, 1, 0x8d7650, 0.6);
      y += 30;
    }
    y += 8;
    for (const note of notes) {
      label(this, cx, y + 14, note, { size: 16, color: '#2e5f2a', stroke: null, wrap: pw - 60 });
      y += 50;
    }
    const by = py + ph - 52;
    const again = (): void => {
      // The same contract, with the muster as it stands.
      takeContract(c.monster, c.mark);
      this.leave('Lair');
    };
    // The first win goes to the lodge: there is something new there. A loss is tried again at once.
    const first = pay.won && (pay.lesson || save().wins <= 1);
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
