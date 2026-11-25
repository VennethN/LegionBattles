// The camp between two waves, over the field where the last one was fought:
// a pack to open if one was picked up, a choice for every level made, and
// then the wares. It shows the run and asks its rules (game/run.ts) for
// everything; it works nothing out for itself.
//
// It is drawn afresh after every press. Nothing here moves by itself, so
// that costs nothing, and what is shown can never be behind the run.

import Phaser from 'phaser';
import { BONE, BUSH, GOLD, HOLY, IRON, LINEN, OUTLINE, RUBY, VENOM, type Material } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { ITEMS, SLOTS, TIER_NAMES, WEAPONS, byId, levelNeeds, waveOf } from '../../game/data';
import {
  buy, choose, combine, heroOf, lock, march, openPack, reroll, rerollPrice, sell, sellPrice, statsOf, twinOf, weaponNumbers, whyNot, type Offer, type RunData,
} from '../../game/run';
import { STAT_INFO, STATS, statText, type StatLine } from '../../game/stats';
import { ads } from '../../platform/ads';
import { TIER_MATS, setupCamera } from '../app';
import { hex, view } from '../config';
import { itemIcon, statIcon, weaponIcon } from '../icons';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { keepRun, theRun } from '../session';
import { pillImage, slabImage } from '../ui/bake';
import { Button, label, plain } from '../ui/widgets';

const DARK: Material = { fill: '#3b2a1c', shade: '#2a1a10' };
/** A weapon's picture is 100 by 184; this is how big its tallest is shown on a card. */
const WEAPON_TALL = 88;

export class CampScene extends Phaser.Scene {
  private run!: RunData;
  private root!: Phaser.GameObjects.Container;
  /** What a pack just gave, while its card is up. */
  private loot: string | null = null;
  /** The weapon the player has pressed, whose card is up. */
  private picked = -1;
  /** The thing the player has pressed, whose card is up. */
  private thing: string | null = null;

  constructor() {
    super('Camp');
  }

  create(): void {
    const run = theRun();
    if (!run) {
      this.scene.start('Title');
      return;
    }
    this.run = run;
    this.loot = null;
    this.picked = -1;
    this.thing = null;
    setupCamera(this);
    this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.78).setInteractive();
    this.root = this.add.container(0, 0);
    music.play(waveOf(run.wave).land, 'calm');
    this.draw();
  }

  private add2<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.root.add(o);
    return o;
  }

  private text(x: number, y: number, t: string, o: Parameters<typeof label>[4] = {}): Phaser.GameObjects.Text {
    return this.add2(label(this, x, y, t, o));
  }

  private icon(x: number, y: number, frame: string, size: number): Phaser.GameObjects.Image {
    const img = this.add2(this.add.image(x, y, SHEET, frame));
    img.setScale(size / Math.max(img.frame.width, img.frame.height));
    return img;
  }

  private button(x: number, y: number, t: string, on: () => void, o: ConstructorParameters<typeof Button>[5] = {}): Button {
    const b = new Button(this, x, y, t, on, o);
    this.root.add(b.root);
    return b;
  }

  private act(done: boolean, sound: Parameters<typeof sfx.play>[0] = 'buy'): void {
    if (done) {
      sfx.play(sound, 0.7);
      keepRun();
    }
    this.draw();
  }

  private draw(): void {
    this.root.removeAll(true);
    const run = this.run;
    this.head();
    if (this.loot || run.packs > 0) this.pack();
    else if (run.phase === 'level') this.level();
    else this.wares();
  }

  private head(): void {
    const run = this.run;
    this.text(18, 26, 'CAMP', { size: 28, align: 'left' });
    this.text(112, 30, `before wave ${run.wave}`, { size: 16, align: 'left', color: BONE.shade });
    this.add2(pillImage(this, view.w - 74, 26, 112, 32, IRON.shade));
    this.icon(view.w - 114, 26, 'icon/coin', 24);
    this.text(view.w - 62, 25, String(run.gold), { size: 21, color: HOLY.fill });
  }

  // ------------------------------------------------------------ a pack

  private pack(): void {
    const cx = view.w / 2;
    const cy = view.h / 2;
    this.add2(slabImage(this, cx - 170, cy - 170, 340, 340, BONE, 18, 8));
    if (!this.loot) {
      this.text(cx, cy - 132, 'A PACK', { size: 28 });
      const img = this.add2(this.add.image(cx, cy - 16, SHEET, 'pack/thornwood'));
      img.setScale(150 / img.frame.height);
      this.tweens.add({ targets: img, angle: { from: -4, to: 4 }, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.button(cx, cy + 116, 'OPEN', () => {
        this.loot = openPack(this.run);
        sfx.play('packOpen', 0.8);
        keepRun();
        this.draw();
      }, { width: 200, height: 54, size: 24 });
      return;
    }
    const item = byId(ITEMS, this.loot);
    this.text(cx, cy - 132, 'IT HELD', { size: 22, color: BONE.shade });
    this.add2(slabImage(this, cx - 44, cy - 104, 88, 88, TIER_MATS[item.tier], 14, 6));
    this.icon(cx, cy - 62, itemIcon(item.id), 64);
    this.text(cx, cy + 6, item.name, { size: 22 });
    this.statLines(cx, cy + 36, item.stats, 'center');
    this.button(cx, cy + 122, 'TAKE', () => {
      this.loot = null;
      this.draw();
    }, { width: 200, height: 54, size: 24 });
  }

  /** A line of stats as a player reads them: what helps in green, what costs in red. */
  private statLines(x: number, y: number, stats: StatLine, align: 'left' | 'center', size = 16, gap = 21): number {
    let row = 0;
    for (const stat of STATS) {
      const v = stats[stat];
      if (!v) continue;
      this.text(x, y + row * gap, `${statText(stat, v)} ${STAT_INFO[stat].name}`, { size, align, color: v > 0 ? VENOM.light : RUBY.fill, strokeWidth: 3 });
      row++;
    }
    return row;
  }

  // ------------------------------------------------------------ a level

  private level(): void {
    const run = this.run;
    const cx = view.w / 2;
    this.text(cx, 84, 'LEVEL UP', { size: 38, color: HOLY.fill });
    this.text(cx, 118, run.pending > 1 ? `Choose one. ${run.pending - 1} more after this.` : 'Choose one.', { size: 17, color: BONE.fill });
    const cols = view.tall ? 2 : 4;
    const cw = Math.min(210, (view.w - 32 - (cols - 1) * 12) / cols);
    const ch = 190;
    const rows = Math.ceil(run.choices.length / cols);
    const x0 = cx - (cols * cw + (cols - 1) * 12) / 2;
    const y0 = view.tall ? 150 : (view.h - 150 - rows * ch) / 2 + 150;
    run.choices.forEach((c, i) => {
      const x = x0 + (i % cols) * (cw + 12);
      const y = y0 + Math.floor(i / cols) * (ch + 12);
      const info = STAT_INFO[c.stat];
      const card = this.add.container(x + cw / 2, y + ch / 2);
      card.add(slabImage(this, -cw / 2, -ch / 2, cw, ch, BONE, 16, 7));
      card.add(slabImage(this, -cw / 2 + 8, -ch / 2 + 8, cw - 16, 30, TIER_MATS[c.tier], 10, 0));
      card.add(label(this, 0, -ch / 2 + 22, TIER_NAMES[c.tier], { size: 16, color: OUTLINE, stroke: null }));
      const img = this.add.image(0, -28, SHEET, statIcon(info.icon));
      img.setScale(52 / img.frame.width);
      card.add(img);
      card.add(label(this, 0, 22, `${statText(c.stat, c.by)} ${info.name}`, { size: 20 }));
      card.add(label(this, 0, 40, info.says, { size: 15, color: OUTLINE, stroke: null, wrap: cw - 24 }).setOrigin(0.5, 0));
      card.setSize(cw, ch).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => {
        choose(this.run, i);
        sfx.play('levelUp', 0.7);
        keepRun();
        this.draw();
      });
      card.on('pointerover', () => card.setScale(1.03));
      card.on('pointerout', () => card.setScale(1));
      this.root.add(card);
    });
  }

  // ------------------------------------------------------------ the wares

  private wares(): void {
    const run = this.run;
    const tall = view.tall;
    const pad = 14;
    // Wide: the hero down the left, the wares across the top, what is carried under them. Tall: one over another.
    const left = tall ? 0 : 236;
    const waresX = left + pad;
    const waresW = view.w - waresX - pad;
    const cols = tall ? 2 : 4;
    const gap = 10;
    const cw = (waresW - (cols - 1) * gap) / cols;
    const ch = tall ? 240 : 284;
    const top = 58;
    run.offers.forEach((o, i) => this.offer(o, i, waresX + (i % cols) * (cw + gap), top + Math.floor(i / cols) * (ch + gap), cw, ch));
    const under = top + Math.ceil(run.offers.length / cols) * (ch + gap) + 2;

    // What is carried: six hands, and the things beside them.
    this.text(waresX, under + 12, 'IN HAND', { size: 15, align: 'left', color: BONE.shade });
    const hand = Math.min(62, (waresW - (SLOTS - 1) * 8 - (tall ? 0 : 250)) / SLOTS);
    for (let i = 0; i < SLOTS; i++) {
      const x = waresX + i * (hand + 8);
      const y = under + 26;
      const w = run.weapons[i];
      const slot = this.add.container(x + hand / 2, y + hand / 2);
      slot.add(slabImage(this, -hand / 2, -hand / 2, hand, hand, w ? TIER_MATS[w.tier] : DARK, 12, 5));
      if (w) {
        const img = this.add.image(0, 14, SHEET, weaponIcon(w.id));
        img.setScale((hand * 0.95) / 184 / 0.5 * 0.5);
        slot.add(img);
        slot.add(label(this, hand / 2 - 13, -hand / 2 + 13, TIER_NAMES[w.tier], { size: 15, color: OUTLINE, stroke: null }));
        // Two of a kind can be joined: the slot says so.
        if (twinOf(run, w.id, w.tier, i) >= 0) slot.add(this.add.image(-hand / 2 + 12, -hand / 2 + 12, SHEET, 'icon/chevrons').setScale(0.22).setAngle(-90));
        slot.setSize(hand, hand).setInteractive({ useHandCursor: true });
        slot.on('pointerup', () => {
          this.picked = this.picked === i ? -1 : i;
          sfx.play('click', 0.6);
          this.draw();
        });
        if (this.picked === i) slot.setScale(1.08);
      }
      this.root.add(slot);
    }
    const thingsY = under + 26 + hand + 14;
    if (run.items.length > 0) {
      this.text(waresX, thingsY + 8, 'THINGS', { size: 15, align: 'left', color: BONE.shade });
      const per = Math.max(1, Math.floor((waresW - (tall ? 0 : 250)) / 32));
      const counts = new Map<string, number>();
      for (const id of run.items) counts.set(id, (counts.get(id) ?? 0) + 1);
      [...counts.entries()].slice(0, per * 2).forEach(([id, n], i) => {
        const x = waresX + 14 + (i % per) * 32;
        const y = thingsY + 34 + Math.floor(i / per) * 32;
        const img = this.icon(x, y, itemIcon(id), 26);
        if (n > 1) this.text(x + 9, y + 8, String(n), { size: 15 });
        // Pressed, a thing says what it is: nobody remembers what all of them do.
        img.setInteractive({ useHandCursor: true }).on('pointerup', () => {
          this.thing = id;
          sfx.play('click', 0.6);
          this.draw();
        });
      });
    }

    // The buttons: other wares, and on to the wave.
    const bw = tall ? (view.w - pad * 3) / 2 : 230;
    const by = view.h - 44;
    const cost = rerollPrice(run);
    const again = this.button(tall ? pad + bw / 2 : view.w - pad - bw / 2, tall ? by : by - 66, `OTHER WARES   ${cost}`, () => this.act(reroll(this.run), 'place'), { width: bw, height: 52, size: 19, mat: IRON });
    again.setEnabled(run.gold >= cost);
    this.button(tall ? view.w - pad - bw / 2 : view.w - pad - bw / 2, by, `WAVE ${run.wave}  >`, () => this.go(), { width: bw, height: 60, size: 26, mat: BUSH });

    if (!tall) this.hero(pad, top, left - pad);
    else this.heroStrip(pad, thingsY + (run.items.length > 0 ? 104 : 16), view.w - pad * 2, by - 44);

    if (this.picked >= 0 && run.weapons[this.picked]) this.weaponCard(this.picked);
    else if (this.thing) this.thingCard(this.thing);
  }

  /** One of the wares: what it is, what it does in this hero's hands, and what it costs. */
  private offer(o: Offer, i: number, x: number, y: number, w: number, h: number): void {
    const run = this.run;
    const mat = TIER_MATS[o.tier];
    if (o.sold) {
      this.add2(slabImage(this, x, y, w, h, DARK, 16, 7));
      this.text(x + w / 2, y + h / 2, 'SOLD', { size: 22, color: BONE.shade });
      return;
    }
    this.add2(slabImage(this, x, y, w, h, BONE, 16, 7));
    this.add2(slabImage(this, x + 8, y + 8, w - 16, 28, mat, 10, 0));
    const weapon = o.kind === 'weapon';
    const name = weapon ? byId(WEAPONS, o.id).name : byId(ITEMS, o.id).name;
    this.text(x + 16, y + 21, weapon ? `${TIER_NAMES[o.tier]}  ${byId(WEAPONS, o.id).kind.toUpperCase()}` : 'THING', { size: 15, align: 'left', color: OUTLINE, stroke: null });
    const picY = y + (view.tall ? 76 : 86);
    if (weapon) {
      // A weapon's picture turns about its hand, which is two thirds of the way down it.
      const img = this.add2(this.add.image(x + w / 2, picY + (view.tall ? 14 : 22), SHEET, weaponIcon(o.id)));
      img.setScale((view.tall ? 72 : WEAPON_TALL) / 184);
    } else this.icon(x + w / 2, picY, itemIcon(o.id), 62);
    const nameY = y + (view.tall ? 122 : 150);
    this.text(x + w / 2, nameY, name, { size: 18, color: OUTLINE, stroke: null, wrap: w - 16 });
    if (weapon) {
      const n = weaponNumbers(run, o.id, o.tier);
      this.text(x + w / 2, nameY + 24, `${n.harm} harm, every ${n.every.toFixed(1)}s`, { size: 15, color: OUTLINE, stroke: null });
      if (!view.tall) this.text(x + w / 2, nameY + 50, byId(WEAPONS, o.id).says, { size: 15, color: '#6b4a2b', stroke: null, wrap: w - 20 });
    } else this.statLinesDark(x + w / 2, nameY + 24, byId(ITEMS, o.id).stats);
    const why = whyNot(run, i);
    const b = this.button(x + w / 2 - 22, y + h - 34, why === 'hands' ? 'HANDS FULL' : `BUY   ${o.price}`, () => this.act(buy(this.run, i)), { width: w - 68, height: 46, size: why === 'hands' ? 15 : 19, mat: GOLD });
    b.setEnabled(why === '');
    // Kept for the next camp, or for after the wares are changed.
    const keep = this.add.container(x + w - 30, y + h - 34);
    keep.add(slabImage(this, -22, -23, 44, 46, o.locked ? HOLY : LINEN, 12, 6));
    keep.add(this.add.image(0, -2, SHEET, 'icon/lock').setScale(0.3));
    keep.setSize(44, 46).setInteractive({ useHandCursor: true });
    keep.on('pointerup', () => this.act(lock(this.run, i), 'tick'));
    this.root.add(keep);
  }

  /** Stat lines on a pale card: dark words, with what costs in red. */
  private statLinesDark(x: number, y: number, stats: StatLine): void {
    let row = 0;
    for (const stat of STATS) {
      const v = stats[stat];
      if (!v) continue;
      this.text(x, y + row * 20, `${statText(stat, v)} ${STAT_INFO[stat].name}`, { size: 16, color: v > 0 ? '#2e5f45' : RUBY.shade, stroke: null });
      row++;
    }
  }

  /** The hero, down the left of a wide screen: who they are, their level, and every stat. */
  private hero(x: number, y: number, w: number): void {
    const run = this.run;
    const def = heroOf(run);
    const h = view.h - y - 14;
    this.add2(slabImage(this, x, y, w, h, DARK, 16, 6));
    const img = this.add2(this.add.image(x + 48, y + 92, CARDS, portraitFrame('blue', def.unit)));
    img.setScale(0.28);
    this.text(x + 96, y + 30, def.name, { size: 20, align: 'left' });
    this.text(x + 96, y + 54, `Level ${run.level}`, { size: 16, align: 'left', color: HOLY.fill });
    this.text(x + 96, y + 76, `${Math.floor(run.xp)} / ${levelNeeds(run.level)}`, { size: 15, align: 'left', color: BONE.shade });
    this.statGrid(x + 12, y + 122, w - 24, 1, h - 134);
  }

  /** The same under a tall screen's wares: two columns, as tall as they need and no taller, just over the buttons. */
  private heroStrip(x: number, top: number, w: number, bottom: number): void {
    const rows = Math.ceil(STATS.length / 2);
    const h = Math.min(bottom - top, rows * 26 + 22);
    if (h < rows * 20 + 22) return;
    const y = bottom - h;
    this.add2(slabImage(this, x, y, w, h, DARK, 14, 5));
    this.statGrid(x + 12, y + 12, w - 24, 2, h - 20);
  }

  private statGrid(x: number, y: number, w: number, cols: number, h: number): void {
    const s = statsOf(this.run);
    const rows = Math.ceil(STATS.length / cols);
    const rh = Math.min(26, h / rows);
    const cw = w / cols;
    STATS.forEach((stat, i) => {
      // Down each column in turn, so that the stats read in their own order.
      const cx = x + Math.floor(i / rows) * cw;
      const cy = y + (i % rows) * rh + rh / 2;
      this.icon(cx + 11, cy, statIcon(STAT_INFO[stat].icon), 20);
      const v = Math.round(s[stat] * 10) / 10;
      this.text(cx + 30, cy, STAT_INFO[stat].name, { size: 15, align: 'left', color: BONE.fill, strokeWidth: 3 });
      this.text(cx + cw - 10, cy, `${v}${STAT_INFO[stat].percent ? '%' : ''}`, { size: 15, align: 'right', color: v < 0 ? RUBY.fill : v > 0 ? VENOM.light : BONE.shade, strokeWidth: 3 });
    });
  }

  /** A weapon in hand was pressed: what it is, and what can be done with it. */
  private weaponCard(i: number): void {
    const run = this.run;
    const w = run.weapons[i];
    const def = byId(WEAPONS, w.id);
    const cx = view.w / 2;
    const cy = view.h / 2;
    const veil = this.add2(this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.55).setInteractive());
    veil.on('pointerup', () => {
      this.picked = -1;
      this.draw();
    });
    this.add2(slabImage(this, cx - 160, cy - 170, 320, 340, BONE, 18, 8));
    this.add2(slabImage(this, cx - 150, cy - 160, 300, 30, TIER_MATS[w.tier], 10, 0));
    this.text(cx, cy - 145, `${def.name}  ${TIER_NAMES[w.tier]}`, { size: 17, color: OUTLINE, stroke: null });
    const img = this.add2(this.add.image(cx, cy - 60, SHEET, weaponIcon(w.id)));
    img.setScale(100 / 184);
    const n = weaponNumbers(run, w.id, w.tier);
    this.text(cx, cy + 2, `${n.harm} harm, every ${n.every.toFixed(1)}s`, { size: 17, color: OUTLINE, stroke: null });
    this.text(cx, cy + 28, def.says, { size: 15, color: '#6b4a2b', stroke: null, wrap: 280 });
    const twin = twinOf(run, w.id, w.tier, i) >= 0;
    const join = plain(this.button(cx, cy + 76, twin ? `JOIN TWO INTO ${TIER_NAMES[w.tier + 1]}` : 'NO TWIN TO JOIN', () => {
      this.picked = -1;
      this.act(combine(this.run, i), 'levelUp');
    }, { width: 280, height: 46, size: 17, mat: HOLY, color: OUTLINE }));
    join.setEnabled(twin);
    const sold = this.button(cx, cy + 130, `SELL FOR ${sellPrice(w)}`, () => {
      this.picked = -1;
      this.act(sell(this.run, i), 'coin');
    }, { width: 280, height: 46, size: 17, mat: IRON });
    sold.setEnabled(run.weapons.length > 1);
  }

  /** A thing that is held was pressed: what it is and what it gives. */
  private thingCard(id: string): void {
    const item = byId(ITEMS, id);
    const cx = view.w / 2;
    const cy = view.h / 2;
    const shut = (): void => {
      this.thing = null;
      this.draw();
    };
    this.add2(this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.55).setInteractive()).on('pointerup', shut);
    this.add2(slabImage(this, cx - 150, cy - 140, 300, 280, BONE, 18, 8));
    this.add2(slabImage(this, cx - 44, cy - 118, 88, 88, TIER_MATS[item.tier], 14, 6));
    this.icon(cx, cy - 76, itemIcon(item.id), 64);
    const n = this.run.items.filter((x) => x === id).length;
    this.text(cx, cy - 6, n > 1 ? `${item.name}  x${n}` : item.name, { size: 20, color: OUTLINE, stroke: null });
    this.statLinesDark(cx, cy + 24, item.stats);
    this.button(cx, cy + 100, 'CLOSE', shut, { width: 180, height: 46, size: 19, mat: IRON });
  }

  /** On to the next wave. */
  private go(): void {
    if (!march(this.run)) return;
    keepRun();
    // A portal may show something between waves. The wave waits for it, and never long.
    void ads().interstitial().then(() => {
      this.scene.stop();
      this.scene.get('Arena').scene.restart();
    });
  }
}
