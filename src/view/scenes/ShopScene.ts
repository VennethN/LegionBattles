// The packs: the ones the player holds, and the ones coins buy. Every pack
// holds one card. Opening one is a small show: the pouch shakes, bursts, and
// the card it held is turned over.
//
// A pack that is not sold yet is its own shape in the dark, named "???".

import Phaser from 'phaser';
import { BONE, CLOTH, GOLD, GRASS, HIGHLIGHT, HOLY, IRON, OUTLINE, VENOM } from '../../art/kit/palette';
import { PACKS, type PackDef } from '../../data/packs';
import { UNITS } from '../../data/units';
import { RARITY } from '../../game/rarity';
import { buyPack, openPack, packOpen, packPool, type Pull } from '../../game/rules';
import { setupCamera } from '../app';
import { H, W, hex } from '../config';
import { CARDS, SHEET } from '../Sheet';
import { commit, save } from '../session';
import { Chrome, veil } from '../ui/chrome';
import { RARITY_MAT } from '../ui/colors';
import { gradeBadge } from '../ui/grade';
import { portrait } from '../ui/UnitCard';
import { Button, label, slab } from '../ui/widgets';

export class ShopScene extends Phaser.Scene {
  private chrome!: Chrome;
  private show: Phaser.GameObjects.GameObject[] = [];
  private busy = false;

  constructor() {
    super('Shop');
  }

  init(): void {
    this.show = [];
    this.busy = false;
  }

  create(): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor(GRASS.dark);
    const s = save();
    this.chrome = new Chrome(this, 'Packs', 'Shop', s);
    label(this, 190, 40, 'Every pack holds one card. A better grade of a card you hold takes its place.', {
      size: 17, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4,
    });

    const pitch = 244;
    const x0 = W / 2 - ((PACKS.length - 1) * pitch) / 2;
    PACKS.forEach((pack, i) => this.packCard(pack, x0 + i * pitch, 350));
  }

  private packCard(pack: PackDef, x: number, y: number): void {
    const s = save();
    const w = 224;
    const h = 500;
    const open = packOpen(s, pack);
    const held = s.packs[pack.id] ?? 0;
    const g = this.add.graphics();
    slab(g, x - w / 2, y - h / 2, w, h, open ? BONE : IRON, 20, 8);
    const art = this.add.image(x, y - 128, CARDS, `pack/${pack.id}`).setScale(0.5);
    if (!open) {
      art.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.8);
      label(this, x, y - 18, '???', { size: 28 });
      this.add.image(x, y + 40, SHEET, 'icon/lock').setScale(0.6);
      label(this, x, y + 100, 'Not sold yet.', { size: 16, weight: 600, color: HIGHLIGHT, strokeWidth: 4 });
      return;
    }
    const dark = { color: OUTLINE, stroke: null as null };
    label(this, x, y - 22, pack.name, { size: 22 });
    label(this, x, y + 10, pack.blurb, { size: 14, weight: 600, wrap: w - 30, ...dark });
    // The grades it hands out, from its worst to its best.
    gradeBadge(this, x - 44, y + 52, pack.gradeMin, 22);
    label(this, x, y + 52, 'to', { size: 15, weight: 600, ...dark });
    gradeBadge(this, x + 44, y + 52, pack.gradeMax, 22);
    label(this, x, y + 80, `${packPool(s, pack).length} kinds of card inside`, { size: 13, weight: 600, color: IRON.shade, stroke: null });

    if (held > 0) {
      label(this, x, y + 104, `You hold ${held}`, { size: 18, color: CLOTH.blue.shade, stroke: null });
    }
    const openB = new Button(this, x, y + 148, 'OPEN', () => this.open(pack.id), { width: 180, height: 56, size: 24 });
    openB.setEnabled(held > 0);
    const buy = new Button(this, x, y + 212, `     ${pack.cost}`, () => {
      if (buyPack(s, pack.id)) {
        commit();
        this.scene.restart();
      }
    }, { width: 180, height: 56, size: 24, mat: VENOM, color: undefined });
    buy.root.add(this.add.image(-38, -3, SHEET, 'icon/coin').setScale(0.38));
    buy.setEnabled(s.coins >= pack.cost);
  }

  // ------------------------------------------------------------ opening

  private clearShow(): void {
    for (const o of this.show) o.destroy();
    this.show = [];
  }

  private open(packId: string): void {
    if (this.busy) return;
    const s = save();
    if ((s.packs[packId] ?? 0) <= 0) return;
    this.busy = true;
    this.clearShow();
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.show.push(o);
      return o;
    };
    add(veil(this, 9000, 0.72));
    const pouch = add(this.add.image(W / 2, H / 2 - 20, CARDS, `pack/${packId}`).setDepth(9010).setScale(0.2));
    const hint = add(label(this, W / 2, H - 90, 'Press to open', { size: 24 }).setDepth(9010));
    this.tweens.add({ targets: pouch, scale: 0.9, duration: 320, ease: 'Back.easeOut' });
    this.tweens.add({ targets: hint, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
    const sway = this.tweens.add({ targets: pouch, angle: { from: -3, to: 3 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const zone = add(this.add.zone(W / 2, H / 2, W, H).setInteractive({ useHandCursor: true }).setDepth(9020));
    zone.once('pointerup', () => {
      zone.disableInteractive();
      hint.destroy();
      sway.stop();
      // The card is decided here, by the rules; all that follows is the show.
      const pull = openPack(s, packId);
      commit();
      // It shakes harder and harder, then bursts.
      this.tweens.add({
        targets: pouch,
        angle: { from: -9, to: 9 },
        duration: 70,
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          this.tweens.add({ targets: pouch, scale: 1.25, alpha: 0, duration: 180, ease: 'Cubic.easeIn' });
          if (pull) this.reveal(pull);
          else this.finish();
        },
      });
    });
  }

  private reveal(pull: Pull): void {
    const s = save();
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.show.push(o);
      return o;
    };
    const def = UNITS[pull.unit];
    const mat = RARITY_MAT[pull.rarity];
    const color = hex(mat.fill);
    const cx = W / 2;
    const cy = H / 2 - 40;

    // A burst in the tier's color: rings, then sparkles flying out. Rarer tiers get more.
    const rank = ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(pull.rarity);
    for (let i = 0; i <= rank; i++) {
      const ring = add(this.add.image(cx, cy, SHEET, 'fx/ring').setTint(color).setDepth(9005).setScale(0.2).setAlpha(0.9));
      this.tweens.add({ targets: ring, scale: 3 + i * 0.8, alpha: 0, duration: 620 + i * 90, delay: i * 110, ease: 'Cubic.easeOut' });
    }
    const sparks = 8 + rank * 5;
    for (let i = 0; i < sparks; i++) {
      const a = (i / sparks) * Math.PI * 2 + 0.3;
      const far = 230 + (i % 3) * 70;
      const sp = add(this.add.image(cx, cy, SHEET, 'fx/sparkle').setTint(i % 2 === 0 ? color : hex(HIGHLIGHT)).setDepth(9006).setScale(0.2));
      this.tweens.add({
        targets: sp, x: cx + Math.cos(a) * far, y: cy + Math.sin(a) * far * 0.8, scale: 0.5, angle: 180, alpha: 0,
        duration: 700 + (i % 4) * 90, ease: 'Cubic.easeOut',
      });
    }
    const flash = add(this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0.75).setDepth(9004));
    this.tweens.add({ targets: flash, alpha: 0, duration: 260 });

    // The card itself.
    const card = add(this.add.container(cx, cy).setDepth(9030));
    const w = 264;
    const h = 330;
    const g = this.add.graphics();
    slab(g, -w / 2, -h / 2, w, h, mat, 22, 9);
    g.fillStyle(hex(HIGHLIGHT), 0.4).fillRoundedRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 110, 14);
    card.add(g);
    card.add(portrait(this, 0, h / 2 - 104, def.id, 'blue', 176));
    card.add(label(this, 0, h / 2 - 70, def.name, { size: def.name.length > 14 ? 22 : 28 }));
    card.add(label(this, 0, h / 2 - 34, RARITY[pull.rarity].name, { size: 18, weight: 600, color: OUTLINE, stroke: null }));
    card.add(gradeBadge(this, -w / 2 + 44, -h / 2 + 40, pull.grade, 40));
    card.setScale(0.05, 1).setAlpha(0);
    this.tweens.add({ targets: card, scaleX: 1, alpha: 1, duration: 300, delay: 120, ease: 'Back.easeOut' });

    let gradeLine = false;
    let headline = 'NEW!';
    let headColor = HOLY.fill;
    let sub = `${def.name} joins you.`;
    if (pull.outcome === 'gradeUp') {
      headline = 'A BETTER GRADE';
      sub = `Your ${def.name} is better now:`;
      gradeLine = true;
    } else if (pull.outcome === 'duplicate') {
      headline = `+${pull.xp} EXPERIENCE`;
      headColor = VENOM.light;
      const mine = s.cards[pull.unit];
      sub = pull.levels > 0
        ? `Your ${def.name} is level ${mine.level} now.`
        : `Your ${def.name} is as good already, so this one teaches it.`;
    }
    const head = add(label(this, cx, cy - h / 2 - 34, headline, { size: 40, color: headColor, strokeWidth: 8 }).setDepth(9031).setAlpha(0).setScale(0.6));
    this.tweens.add({ targets: head, alpha: 1, scale: 1, duration: 260, delay: 380, ease: 'Back.easeOut' });
    const line = add(label(this, cx, cy + h / 2 + 34, sub, { size: 20, weight: 600 }).setDepth(9031).setAlpha(0));
    this.tweens.add({ targets: line, alpha: 1, duration: 260, delay: 480 });
    if (gradeLine) {
      // The grade it had, an arrow, the grade it has: as badges, after the words.
      const room = 34 + 30 + 34 + 30;
      line.setX(cx - room / 2);
      const x = cx - room / 2 + line.width / 2 + 30;
      const was = add(gradeBadge(this, x, cy + h / 2 + 34, pull.was, 26).setDepth(9032).setAlpha(0));
      const arrow = add(this.add.image(x + 46, cy + h / 2 + 34, SHEET, 'icon/arrow').setScale(0.34).setDepth(9032).setAlpha(0));
      const now = add(gradeBadge(this, x + 96, cy + h / 2 + 34, pull.grade, 26).setDepth(9032).setAlpha(0));
      this.tweens.add({ targets: [was, arrow, now], alpha: 1, duration: 260, delay: 480 });
    }

    this.time.delayedCall(650, () => {
      const more = (s.packs[pull.pack] ?? 0) > 0;
      const done = new Button(this, more ? cx - 150 : cx, H - 62, 'DONE', () => this.finish(), { width: 220, height: 66, size: 28, mat: more ? BONE : GOLD, color: more ? OUTLINE : undefined }).setDepth(9031);
      if (more) {
        done.root.list.forEach((o) => {
          if (o instanceof Phaser.GameObjects.Text) o.setStroke(BONE.fill, 0);
        });
        const again = new Button(this, cx + 130, H - 62, 'OPEN ANOTHER', () => {
          this.busy = false;
          this.open(pull.pack);
        }, { width: 280, height: 66, size: 26 }).setDepth(9031);
        add(again.root);
      }
      add(done.root);
      this.busy = false;
    });
  }

  private finish(): void {
    this.clearShow();
    this.busy = false;
    this.chrome.refresh();
    this.scene.restart();
  }
}
