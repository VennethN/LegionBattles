// The packs: the ones the player holds, and the ones coins buy. It opens
// over the field. Every pack holds one card. Opening one is a small show:
// the pouch shakes, bursts, and the card it held is turned over.
//
// A world's pack comes at each difficulty the player has opened there, the
// same cards at better grades; the arrows on its card step between them.
// A pack that is not sold yet is its own shape in the dark, named "???".

import Phaser from 'phaser';
import { BONE, CLOTH, GOLD, HIGHLIGHT, HOLY, IRON, OUTLINE, VENOM } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { LAPS } from '../../data/laps';
import { packAt, type PackDef } from '../../data/packs';
import { UNITS } from '../../data/units';
import { RARITY } from '../../game/rarity';
import { SHELF, buyPack, openPack, packOpen, packPool, type Pull } from '../../game/rules';
import { markSeen } from '../../game/tutorial';
import { setupCamera } from '../app';
import { H, W, hex } from '../config';
import { CARDS, SHEET } from '../Sheet';
import { commit, save } from '../session';
import { OverlayHead, veil } from '../ui/chrome';
import { DIFFICULTY_MAT, RARITY_MAT } from '../ui/colors';
import { gradeBadge } from '../ui/grade';
import { Guide, type Rect } from '../ui/Guide';
import { portrait } from '../ui/UnitCard';
import { Button, label, plain, slab } from '../ui/widgets';

export class ShopScene extends Phaser.Scene {
  private head!: OverlayHead;
  private guide!: Guide;
  private show: Phaser.GameObjects.GameObject[] = [];
  private busy = false;
  /** Where the tutorial's OPEN is, if a pack is held. */
  private firstOpen: Rect | null = null;
  private doneRect: Rect | null = null;

  constructor() {
    super('Shop');
  }

  init(): void {
    this.show = [];
    this.busy = false;
    this.firstOpen = null;
    this.doneRect = null;
  }

  create(): void {
    setupCamera(this);
    const s = save();
    this.head = new OverlayHead(this, 'Packs', s, () => {
      // The tutorial's look at the packs is over once one has been opened and the screen shut.
      if (s.stats.opened > 0) markSeen(s, 'packs');
      commit();
    });
    label(this, 190, 40, 'Every pack holds one card. A copy of one you hold is a card of its own.', {
      size: 17, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4,
    });

    // The shelf is as wide as the screen: a card for each pack, as wide as there is room for.
    const pitch = Math.min(244, (W - 24) / SHELF.length);
    const x0 = W / 2 - ((SHELF.length - 1) * pitch) / 2;
    SHELF.forEach((pack, i) => this.packCard(pack, x0 + i * pitch, 372, Math.round(pitch - 20)));

    this.guide = new Guide(this, 'Shop');
    this.guide.mark('open', () => this.firstOpen);
    this.guide.mark('close', () => this.head.close.rect);
    this.guide.mark('pouch', () => ({ x: W / 2 - 130, y: H / 2 - 190, w: 260, h: 340 }));
    this.guide.mark('reveal:done', () => this.doneRect);
    this.guide.refresh({ show: 'none' });
  }

  /** The lap of a land's pack that its card shows: the one last chosen, or the latest one held, or the latest on sale. */
  private chosen(base: PackDef): number {
    if (!base.land) return 0;
    const s = save();
    const picks = (this.registry.get('packDifficulty') as Record<string, number> | undefined) ?? {};
    const open = (d: number): boolean => packOpen(s, packAt(base, d));
    if (picks[base.id] !== undefined && open(picks[base.id])) return picks[base.id];
    let best = 0;
    for (let d = 0; d < LAPS.length; d++) if (open(d)) best = d;
    for (let d = LAPS.length - 1; d >= 0; d--) if ((s.packs[packAt(base, d).id] ?? 0) > 0) return d;
    return best;
  }

  private choose(base: PackDef, d: number): void {
    const picks = { ...((this.registry.get('packDifficulty') as Record<string, number> | undefined) ?? {}) };
    picks[base.id] = d;
    this.registry.set('packDifficulty', picks);
    this.scene.restart();
  }

  private packCard(base: PackDef, x: number, y: number, w: number): void {
    const s = save();
    const h = 520;
    const bw = Math.min(180, w - 28);
    const d = this.chosen(base);
    const pack = packAt(base, d);
    const open = packOpen(s, pack);
    const held = s.packs[pack.id] ?? 0;
    const g = this.add.graphics();
    slab(g, x - w / 2, y - h / 2, w, h, open ? BONE : IRON, 20, 8);
    const art = this.add.image(x, y - 150, CARDS, `pack/${base.id}`).setScale(0.5);
    if (!open) {
      art.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.8);
      label(this, x, y - 40, '???', { size: 28 });
      this.add.image(x, y + 20, SHEET, 'icon/lock').setScale(0.6);
      label(this, x, y + 80, 'Not sold yet.', { size: 16, weight: 600, color: HIGHLIGHT, strokeWidth: 4 });
      return;
    }
    const dark = { color: OUTLINE, stroke: null as null };
    label(this, x, y - 48, base.name, { size: w < 200 ? (base.name.length > 12 ? 18 : 20) : 22 });

    if (base.land) {
      // Which lap's pack this is, with arrows to the others that are on sale. Each lap's is better than the last.
      const chip = this.add.graphics();
      const cw = Math.min(124, w - 112);
      slab(chip, x - cw / 2, y - 30, cw, 30, DIFFICULTY_MAT[d], 10, 4);
      label(this, x, y - 16, `Tier ${d + 1}`, { size: 15, strokeWidth: 4 });
      for (const step of [-1, 1]) {
        const to = d + step;
        if (to < 0 || to >= LAPS.length || !packOpen(s, packAt(base, to))) continue;
        const b = new Button(this, x + step * (w / 2 - 32), y - 15, '', () => this.choose(base, to), { width: 40, height: 44, mat: BONE });
        b.root.add(this.add.image(0, -3, SHEET, 'icon/arrow').setScale(0.34).setFlipX(step < 0));
      }
    } else {
      label(this, x, y - 14, base.blurb, { size: 14, weight: 600, wrap: w - 30, ...dark });
    }

    // The grades it hands out, from its worst to its best.
    gradeBadge(this, x - 44, y + 30, pack.gradeMin, 22);
    label(this, x, y + 30, 'to', { size: 15, weight: 600, ...dark });
    gradeBadge(this, x + 44, y + 30, pack.gradeMax, 22);
    label(this, x, y + 60, `${packPool(s, pack).length} kinds of card inside`, { size: 13, weight: 600, color: IRON.shade, stroke: null });
    if (held > 0) label(this, x, y + 88, `You hold ${held}`, { size: 18, color: CLOTH.blue.shade, stroke: null });

    const openB = new Button(this, x, y + 140, 'OPEN', () => this.open(pack.id), { width: bw, height: 56, size: 24 });
    openB.setEnabled(held > 0);
    if (held > 0 && !this.firstOpen) this.firstOpen = openB.rect;
    const buy = new Button(this, x, y + 206, `     ${pack.cost}`, () => {
      if (buyPack(s, pack.id)) {
        sfx.play('buy');
        commit();
        this.scene.restart();
      }
    }, { width: bw, height: 56, size: 24, mat: VENOM });
    buy.root.add(this.add.image(-bw / 2 + 42, -3, SHEET, 'icon/coin').setScale(0.38));
    buy.setEnabled(s.coins >= pack.cost);
  }

  // ------------------------------------------------------------ opening

  private clearShow(): void {
    for (const o of this.show) o.destroy();
    this.show = [];
    this.doneRect = null;
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
    const pouch = add(this.add.image(W / 2, H / 2 - 20, CARDS, `pack/${packId.split('@')[0]}`).setDepth(9010).setScale(0.2));
    const hint = add(label(this, W / 2, H - 90, 'Press to open', { size: 24 }).setDepth(9010));
    this.tweens.add({ targets: pouch, scale: 0.9, duration: 320, ease: 'Back.easeOut' });
    this.tweens.add({ targets: hint, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
    const sway = this.tweens.add({ targets: pouch, angle: { from: -3, to: 3 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const zone = add(this.add.zone(W / 2, H / 2, W, H).setInteractive({ useHandCursor: true }).setDepth(9020));
    this.guide.refresh({ show: 'pouch' });
    zone.once('pointerup', () => {
      zone.disableInteractive();
      hint.destroy();
      sway.stop();
      // The card is decided here, by the rules; all that follows is the show.
      const pull = openPack(s, packId);
      commit();
      this.guide.refresh({ show: 'reveal' });
      sfx.play('packShake');
      this.time.delayedCall(330, () => sfx.play('packShake'));
      // It shakes harder and harder, then bursts.
      this.tweens.add({
        targets: pouch,
        angle: { from: -9, to: 9 },
        duration: 70,
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          this.tweens.add({ targets: pouch, scale: 1.25, alpha: 0, duration: 180, ease: 'Cubic.easeIn' });
          sfx.play('packOpen');
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
    this.time.delayedCall(140, () => sfx.reveal(rank));
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

    // A copy is a card of its own: it says how many are held now, and what can be done with it.
    let headline = 'NEW!';
    let headColor = HOLY.fill;
    let sub = pull.joined ? `${def.name} joins your team.` : `${def.name} joins you.`;
    if (pull.outcome === 'copy') {
      headline = pull.best ? 'YOUR BEST YET' : 'ANOTHER ONE';
      headColor = pull.best ? GOLD.fill : VENOM.light;
      sub = pull.joined
        ? `It joins your team. You hold ${pull.held} of this unit now.`
        : `You hold ${pull.held} of this unit now. Field it, or COMBINE it in UNITS.`;
    }
    const head = add(label(this, cx, cy - h / 2 - 34, headline, { size: 40, color: headColor, strokeWidth: 8 }).setDepth(9031).setAlpha(0).setScale(0.6));
    this.tweens.add({ targets: head, alpha: 1, scale: 1, duration: 260, delay: 380, ease: 'Back.easeOut' });
    const line = add(label(this, cx, cy + h / 2 + 34, sub, { size: 20, weight: 600 }).setDepth(9031).setAlpha(0));
    this.tweens.add({ targets: line, alpha: 1, duration: 260, delay: 480 });

    this.time.delayedCall(650, () => {
      const more = (s.packs[pull.pack] ?? 0) > 0;
      const done = new Button(this, more ? cx - 150 : cx, H - 62, 'DONE', () => this.finish(), { width: 220, height: 66, size: 28, mat: more ? BONE : GOLD, color: more ? OUTLINE : undefined }).setDepth(9031);
      if (more) {
        plain(done);
        const again = new Button(this, cx + 130, H - 62, 'OPEN ANOTHER', () => {
          this.busy = false;
          this.open(pull.pack);
        }, { width: 280, height: 66, size: 26 }).setDepth(9031);
        add(again.root);
      }
      add(done.root);
      this.doneRect = done.rect;
      this.busy = false;
      this.guide.refresh({ show: 'reveal' });
    });
  }

  private finish(): void {
    this.clearShow();
    this.busy = false;
    this.scene.restart();
  }
}

