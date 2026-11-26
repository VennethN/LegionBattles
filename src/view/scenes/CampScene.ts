// The camp between two waves, over the field where the last one was fought:
// a pack to open if one was picked up, a choice for every level made, and
// then the wares. It shows the run and asks its rules (game/run.ts) for
// everything; it works nothing out for itself.
//
// It is drawn afresh after every press. Nothing here moves by itself, so
// that costs nothing, and what is shown can never be behind the run.

import { getManifest } from '../app';
import { listsReady } from '../stream';
import Phaser from 'phaser';
import type { ArenaScene } from './ArenaScene';
import { BONE, BUSH, GOLD, HOLY, IRON, LINEN, OUTLINE, RUBY, VENOM, type Material } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { COMPANIONS, ITEMS, LAND_NAMES, SLOTS, TIER_NAMES, WEAPONS, byId, levelNeeds, ownRules, relicOf, waveOf, weaponOf } from '../../game/data';
import { FIFTH, fifthOf } from '../../game/forms';
import {
  buy, canSwap, canToss, choose, combine, handsOf, heroOf, kindsOf, lock, march, openPack, ownDef, ownOf, reroll, rerollPrice, sell, sellPrice, statsOf, swap, toss, tossOdds, twinOf, whyNot, type Offer, type RunData,
} from '../../game/run';
import { STAT_INFO, STATS, statText, type Stat, type StatLine } from '../../game/stats';
import { compare, previewLevel, previewOffer, weaponFacts, type Change, type Preview } from '../../game/preview';
import { ads } from '../../platform/ads';
import { TIER_MATS, comeIn, setupCamera } from '../app';
import { hex, view } from '../config';
import { THING_ICONS, itemIcon, relicIcon, statIcon, weaponIcon } from '../icons';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { keepRun, theRun } from '../session';
import { pillImage, slabImage } from '../ui/bake';
import { Button, heading, label, plain } from '../ui/widgets';

/** What each tier of an upgrade is called on its card. */
const RARITY_WORDS = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC'] as const;

const DARK: Material = { fill: '#3b2a1c', shade: '#2a1a10' };

/** A weapon's name at a tier: its fifth form has a name of its own. */
function nameAt(id: string, tier: number): string {
  return (tier === FIFTH ? fifthOf(id)?.name : undefined) ?? byId(WEAPONS, id).name;
}

export class CampScene extends Phaser.Scene {
  private run!: RunData;
  private root!: Phaser.GameObjects.Container;
  /** What a pack just gave, while its card is up. */
  private loot: string | null = null;
  /** True for the one drawing just after OPEN, when the chest bursts and what was in it rises out. */
  private burst = false;
  /** The weapon the player has pressed, whose card is up. */
  private picked = -1;
  /** True while the card of the hero's own weapon is shown. */
  private owned = false;
  /** The thing the player has pressed, whose card is up. */
  private thing: string | null = null;
  /** The relic the player has pressed, and whether the card of the kinds of weapon is up. */
  private relic: string | null = null;
  private kinds = false;
  /** The offer a weapon in hand is being chosen to make room for, or -1. */
  private swapFor = -1;
  /** The stats the last choice or buy changed: lit in the list of stats, so that a player sees what they just got. */
  private lit = new Set<Stat>();

  constructor() {
    super('Camp');
  }

  create(): void {
    // The lists need every hero's and companion's picture: if they are still coming, the mark turns until they are in.
    if (!listsReady(this, getManifest())) return;
    const run = theRun();
    if (!run) {
      this.scene.start('Title');
      return;
    }
    this.run = run;
    this.loot = null;
    this.picked = -1;
    this.thing = null;
    this.relic = null;
    this.kinds = false;
    this.swapFor = -1;
    this.lit = new Set();
    setupCamera(this);
    this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.6).setInteractive();
    this.root = this.add.container(0, 0);
    comeIn(this, this.root);
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

  /** Cuts a one-line text to a width, ending it with "...", rather than squeezing it below what can be read. */
  private fit(t: Phaser.GameObjects.Text, width: number): Phaser.GameObjects.Text {
    if (t.width <= width) return t;
    let s = t.text;
    while (s.length > 1 && t.width > width) {
      s = s.slice(0, -1).trimEnd();
      t.setText(`${s}...`);
    }
    return t;
  }

  /** Cuts a wrapped text to a height, word by word, ending it with "...". Nothing under it is written over. */
  private fitLines(t: Phaser.GameObjects.Text, height: number): Phaser.GameObjects.Text {
    if (height < 15) {
      t.destroy();
      return t;
    }
    let words = t.text.split(' ');
    while (words.length > 1 && t.height > height) {
      words = words.slice(0, -1);
      t.setText(`${words.join(' ').replace(/[.,;:]$/, '')}...`);
    }
    if (t.height > height) t.destroy();
    return t;
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

  /** Does what `fn` does to the run and remembers which stats it moved, to light them in the list. */
  private moving(fn: () => boolean): boolean {
    const before = statsOf(this.run);
    const done = fn();
    if (done) this.lit = new Set(compare(before, statsOf(this.run)).map((c) => c.stat).filter((x): x is Stat => x !== ''));
    return done;
  }

  /**
   * What a choice changes, a line for each number: its name at the left, and at the right what it is now, an arrow,
   * and what it would be, the new number green when it is better and red when it is worse. Returns the height used.
   */
  private changeLines(x: number, y: number, w: number, changes: readonly Change[], most: number, into?: Phaser.GameObjects.Container): number {
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      if (into) into.add(o);
      else this.add2(o);
      return o;
    };
    const rh = 22;
    changes.slice(0, most).forEach((c, i) => {
      const cy = y + i * rh + rh / 2;
      const name = add(label(this, x, cy, c.name, { size: 15, align: 'left', color: OUTLINE, stroke: null, weight: 600 }));
      const after = add(label(this, x + w, cy, c.after, { size: 16, align: 'right', color: c.up ? '#2e7d3a' : RUBY.shade, stroke: null }));
      const arrow = add(label(this, after.x - after.width - 4, cy, '>', { size: 15, align: 'right', color: '#8a6a3a', stroke: null }));
      const before = add(label(this, arrow.x - arrow.width - 4, cy, c.before, { size: 15, align: 'right', color: '#6b4a2b', stroke: null, weight: 600 }));
      // A long name gives way to the numbers: it is narrowed, never written under them.
      name.setScale(Math.min(1, (before.x - before.width - 6 - x) / Math.max(1, name.width)), 1);
    });
    return Math.min(most, changes.length) * rh;
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
    // The camp's fire is seen where this screen leaves room; a screen that leaves none has it in the middle, under the veil.
    this.focus(0.5, 0.5);
    this.head();
    if (this.loot || run.packs > 0) this.pack();
    else if (run.phase === 'level') this.level();
    // A relic to choose, or the road out: those have a screen of their own.
    else if (run.phase === 'relic' || run.phase === 'road') this.scene.start('Road');
    else this.wares();
  }

  /** Where on the screen the field behind shows the band at its fire, as shares of the screen. */
  private focus(x: number, y: number): void {
    (this.scene.get('Arena') as ArenaScene | null)?.campFocus?.(x, y);
  }

  private head(): void {
    const run = this.run;
    this.root.add(heading(this, 104, 26, 'CAMP'));
    this.text(210, 28, `Next: wave ${run.wave}`, { size: 16, align: 'left', color: BONE.fill });
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
      this.text(cx, cy - 132, 'BOSS CHEST', { size: 24 });
      const img = this.add2(this.add.image(cx, cy - 10, SHEET, THING_ICONS.chest));
      img.setScale(170 / img.frame.width);
      // It rattles now and then, as if something in it wanted out.
      this.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 90, yoyo: true, repeat: 3, repeatDelay: 0, loop: -1, loopDelay: 900, ease: 'Sine.easeInOut' });
      this.button(cx, cy + 116, 'OPEN', () => {
        this.loot = openPack(this.run);
        sfx.play('packOpen', 0.8);
        keepRun();
        this.burst = true;
        this.draw();
      }, { width: 200, height: 54, size: 24 });
      return;
    }
    const item = byId(ITEMS, this.loot);
    this.text(cx, cy - 132, 'YOU GOT', { size: 22, color: BONE.shade });
    // The chest stands open below what came out of it.
    const open = this.add2(this.add.image(cx, cy + 40, SHEET, THING_ICONS.chestOpen));
    open.setScale(120 / open.frame.width).setAlpha(0.9);
    const back = this.add2(slabImage(this, cx - 44, cy - 104, 88, 88, TIER_MATS[item.tier], 14, 6));
    const pic = this.icon(cx, cy - 62, itemIcon(item.id), 64);
    if (this.burst) {
      this.burst = false;
      // The lid bursts open: a flash of gold, coins thrown out, and what was inside rises out of it to its place.
      const glow = this.add2(this.add.image(cx, cy + 20, SHEET, 'fx/glow').setTint(hex(HOLY.light)).setBlendMode(Phaser.BlendModes.ADD));
      glow.setScale(0.2);
      this.tweens.add({ targets: glow, scale: 3.2, alpha: { from: 1, to: 0 }, duration: 520, ease: 'Cubic.easeOut' });
      for (let i = 0; i < 9; i++) {
        const coin = this.add2(this.add.image(cx, cy + 24, SHEET, 'icon/coin'));
        coin.setScale(22 / coin.frame.width);
        const a = -Math.PI / 2 + (i - 4) * 0.28;
        this.tweens.add({ targets: coin, x: cx + Math.cos(a) * 150, y: cy + 24 + Math.sin(a) * 120, angle: 360, alpha: { from: 1, to: 0 }, duration: 640, ease: 'Quad.easeOut' });
      }
      for (const o of [back, pic]) {
        const y = o.y;
        o.setY(y + 90).setScale(o.scaleX * 0.4, o.scaleY * 0.4);
        this.tweens.add({ targets: o, y, scaleX: o.scaleX / 0.4, scaleY: o.scaleY / 0.4, duration: 460, delay: 120, ease: 'Back.easeOut' });
      }
    }
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
    this.root.add(heading(this, cx, 84, 'LEVEL UP', GOLD));
    this.text(cx, 118, run.pending > 1 ? `Choose 1 upgrade. ${run.pending - 1} more after this.` : 'Choose 1 upgrade.', { size: 17, color: BONE.fill });
    const cols = view.tall ? 2 : 4;
    const cw = Math.min(232, (view.w - 32 - (cols - 1) * 12) / cols);
    // A card is as tall as what it says: its lower half stood empty when every card was one size.
    const lines = Math.max(1, ...run.choices.map((_, i) => Math.min(3, previewLevel(run, i).changes.length)));
    const ch = 226 + lines * 22;
    const rows = Math.ceil(run.choices.length / cols);
    const x0 = cx - (cols * cw + (cols - 1) * 12) / 2;
    // On a tall screen the cards stand at the bottom, where a thumb is, and the band at its fire is seen between them and the heading.
    const y0 = view.tall ? Math.max(150, view.h - 20 - rows * (ch + 12) + 12) : Math.max(140, (view.h - 150 - rows * ch) / 2 + 150);
    this.focus(0.5, ((view.tall ? 150 : 128) + y0) / 2 / view.h);
    run.choices.forEach((c, i) => {
      const x = x0 + (i % cols) * (cw + 12);
      const y = y0 + Math.floor(i / cols) * (ch + 12);
      // A bond with a companion is offered like a stat: its name, the step it would be, and what the companion does.
      const friend = c.bond ? byId(COMPANIONS, c.bond) : null;
      const info = friend ? { name: `Bond with ${friend.name}`, icon: 'heart', says: `${friend.name} gets stronger. ${friend.quirkName} improves.` } : STAT_INFO[c.stat];
      const card = this.add.container(x + cw / 2, y + ch / 2);
      card.add(slabImage(this, -cw / 2, -ch / 2, cw, ch, BONE, 16, 7));
      card.add(slabImage(this, -cw / 2 + 8, -ch / 2 + 8, cw - 16, 30, TIER_MATS[c.tier], 10, 0));
      // Its rarity as a word on the rarity's color: the numerals I to IV read as the cards' numbers.
      card.add(label(this, 0, -ch / 2 + 22, RARITY_WORDS[c.tier], { size: 16, color: OUTLINE, stroke: null }));
      const img = this.add.image(0, -ch / 2 + 78, SHEET, statIcon(info.icon));
      img.setScale(56 / img.frame.width);
      card.add(img);
      // What it is, big: the number and the stat. Dark words on the pale card, and never wider than it.
      const head = label(this, 0, -ch / 2 + 128, friend ? info.name : `${statText(c.stat, c.by)} ${info.name}`, { size: friend ? 18 : 22, color: '#2e5f45', stroke: null });
      head.setScale(Math.min(1, (cw - 22) / Math.max(1, head.width)));
      card.add(head);
      // What the stat does, in a few words, for whoever does not know it.
      const says = label(this, 0, -ch / 2 + 146, info.says, { size: 15, color: '#6b4a2b', stroke: null, wrap: cw - 30, weight: 600 }).setOrigin(0.5, 0);
      card.add(says);
      // And what it changes, from the rules: each number now and after.
      const p = previewLevel(run, i);
      const top = -ch / 2 + 152 + says.height + 10;
      if (p.changes.length > 0) {
        const g = this.add.graphics();
        g.fillStyle(hex(LINEN.shade), 0.55).fillRoundedRect(-cw / 2 + 10, top - 4, cw - 20, Math.min(3, p.changes.length) * 22 + 8, 8);
        card.add(g);
        this.changeLines(-cw / 2 + 18, top, cw - 36, p.changes, 3, card);
      }
      card.setSize(cw, ch).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => {
        this.moving(() => choose(this.run, i));
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
    // A tall screen has the height to give each ware room for all its numbers: what it does is what the card is for.
    const ch = tall ? 320 : 284;
    const top = 58;
    run.offers.forEach((o, i) => this.offer(o, i, waresX + (i % cols) * (cw + gap), top + Math.floor(i / cols) * (ch + gap), cw, ch));
    const under = top + Math.ceil(run.offers.length / cols) * (ch + gap) + 2;

    // What is carried: six hands, and the things beside them.
    this.text(waresX, under + 12, 'WEAPONS', { size: 15, align: 'left', color: BONE.shade });
    const hand = Math.min(62, (waresW - (SLOTS - 1) * 8 - (tall ? 0 : 250)) / SLOTS);
    for (let i = 0; i < SLOTS; i++) {
      const x = waresX + i * (hand + 8);
      // A little lower than the line that names them: a tall weapon's picture stands out of its slot.
      const y = under + 38;
      const w = run.weapons[i];
      const slot = this.add.container(x + hand / 2, y + hand / 2);
      slot.add(slabImage(this, -hand / 2, -hand / 2, hand, hand, w ? TIER_MATS[w.tier] : DARK, 12, 5));
      if (w) {
        const img = this.add.image(0, 14, SHEET, weaponIcon(w.id));
        img.setScale((hand * 0.95) / 184 / 0.5 * 0.5);
        slot.add(img);
        slot.add(label(this, hand / 2 - 13, -hand / 2 + 13, TIER_NAMES[w.tier], { size: 15, color: OUTLINE, stroke: null }));
        // A fifth form has a glint in the corner where a pair that can merge has its arrows: it is the last there is.
        if (w.tier === FIFTH) slot.add(this.add.image(-hand / 2 + 12, -hand / 2 + 12, SHEET, 'fx/sparkle').setScale(0.5).setTint(hex(OUTLINE)));
        // Two of a kind can be joined: the slot says so.
        else if (twinOf(run, w.id, w.tier, i) >= 0) slot.add(this.add.image(-hand / 2 + 12, -hand / 2 + 12, SHEET, 'icon/chevrons').setScale(0.22).setAngle(-90));
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
    // The kinds of weapon held, each with how many: pressed, they say what they give and what the next one would. They are
    // written after the hands, so that their words lie over the tip of a tall weapon and not under it.
    let kx = waresX + 84;
    for (const k of kindsOf(run)) {
      const chip = this.text(kx, under + 12, `${k.name} ${k.held}`, { size: 15, align: 'left', color: k.step > 0 ? HOLY.fill : BONE.fill, strokeWidth: 3 });
      if (kx + chip.width > waresX + waresW - (tall ? 0 : 250)) {
        chip.destroy();
        break;
      }
      chip.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        this.kinds = true;
        sfx.play('click', 0.6);
        this.draw();
      });
      kx += chip.width + 14;
    }
    const thingsY = under + 38 + hand + 10;
    if (run.items.length > 0) {
      this.text(waresX, thingsY + 8, 'ITEMS', { size: 15, align: 'left', color: BONE.shade });
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

    // The relics the run holds, in a row: pressed, each says what it does.
    const relicsY = Math.min(view.h - (tall ? 110 : 24), thingsY + (run.items.length > 0 ? 102 : 14));
    if (run.relics.length > 0) {
      this.text(waresX, relicsY, 'RELICS', { size: 15, align: 'left', color: BONE.shade });
      const room = Math.max(1, Math.floor((waresW - (tall ? 0 : 250) - 70) / 32));
      run.relics.slice(0, room).forEach((id, i) => {
        const img = this.icon(waresX + 84 + i * 32, relicsY, relicIcon(id), 28);
        img.setInteractive({ useHandCursor: true }).on('pointerup', () => {
          this.relic = id;
          sfx.play('click', 0.6);
          this.draw();
        });
      });
      if (run.relics.length > room) this.text(waresX + 84 + room * 32, relicsY, `+${run.relics.length - room}`, { size: 15, align: 'left' });
    }

    // The buttons: other wares, and on to the wave.
    const bw = tall ? (view.w - pad * 3) / 2 : 230;
    const by = view.h - 44;
    const cost = rerollPrice(run);
    const again = this.button(tall ? pad + bw / 2 : view.w - pad - bw / 2, tall ? by : by - 66, `REROLL   ${cost > 0 ? cost : 'FREE'}`, () => this.act(reroll(this.run), 'place'), { width: bw, height: 52, size: 19, mat: IRON });
    again.setEnabled(run.gold >= cost);
    this.button(tall ? view.w - pad - bw / 2 : view.w - pad - bw / 2, by, 'NEXT WAVE  >', () => this.go(), { width: bw, height: 60, size: 26, mat: BUSH });

    // The band at its fire: on a wide screen beside the weapons and over the buttons, on a tall one between the items and the hero.
    if (!tall) this.focus((waresX + SLOTS * (hand + 8) + view.w - pad) / 2 / view.w, (under + 20 + view.h - 136) / 2 / view.h);
    else this.focus(0.5, (thingsY + (run.items.length > 0 ? 70 : 10) + (run.relics.length > 0 ? 34 : 0)) / view.h);
    if (!tall) this.hero(pad, top, left - pad);
    else this.heroStrip(pad, thingsY + (run.items.length > 0 ? 104 : 16) + (run.relics.length > 0 ? 34 : 0), view.w - pad * 2, by - 44);

    if (this.swapFor >= 0 && run.offers[this.swapFor] && !run.offers[this.swapFor].sold) this.swapCard(this.swapFor);
    else if (this.picked >= 0 && run.weapons[this.picked]) this.weaponCard(this.picked);
    else if (this.thing) this.thingCard(this.thing);
    else if (this.relic) this.relicCard(this.relic);
    else if (this.owned) this.ownCard();
    else if (this.kinds) this.kindsCard();
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
    const weapon = o.kind === 'weapon';
    const relic = o.kind === 'relic';
    const name = weapon ? byId(WEAPONS, o.id).name : relic ? relicOf(o.id).name : byId(ITEMS, o.id).name;
    // Every card is laid out the same way, each thing on a line of its own that is cut to fit and never shrunk: a
    // reviewer found a weapon's set bonus written over its words, and a line squeezed below what can be read.
    // A weapon says its kinds where it said only how it strikes: a kind is what a hand is filled for.
    const land = !weapon && !relic ? byId(ITEMS, o.id).land : undefined;
    const tag = weapon ? `${TIER_NAMES[o.tier]}  ${byId(WEAPONS, o.id).kinds.join(' ').toUpperCase()}` : relic ? 'RELIC' : land ? `${LAND_NAMES[land].toUpperCase()} ONLY` : 'ITEM';
    const picY = y + 68;
    if (weapon) {
      // A weapon's picture turns about its hand, two thirds of the way down it, sized by the frame's own height.
      const img = this.add2(this.add.image(x + w / 2, picY + 4, SHEET, weaponIcon(o.id)).setOrigin(0.5, 0.62));
      img.setScale(84 / img.frame.height);
    } else this.icon(x + w / 2, picY, relic ? relicIcon(o.id) : itemIcon(o.id), 46);
    // The band and its words are laid over the picture: the tip of a tall weapon goes under the band, never over its words.
    this.add2(slabImage(this, x + 8, y + 8, w - 16, 28, mat, 10, 0));
    this.fit(this.text(x + 16, y + 21, tag, { size: 15, align: 'left', color: OUTLINE, stroke: null }), w - (canToss(run, i) ? 120 : 32));
    this.fit(this.text(x + w / 2, y + 110, name, { size: 18, color: OUTLINE, stroke: null }), w - 16);
    const room = y + h - 62;
    const p: Preview = previewOffer(run, i);
    if (weapon && p.weapon) {
      const f = p.weapon.facts;
      // Its numbers as this hero would fight with it; on a narrow card the plainest of them is kept.
      const nums = this.text(x + w / 2, y + 134, `${f.dmg} DMG   ${f.rate.toFixed(2)}/s   ${f.dps} DPS`, { size: 15, color: OUTLINE, stroke: null });
      if (nums.width > w - 12) nums.setText(`${f.dmg} DMG   ${f.dps} DPS`);
      if (nums.width > w - 12) nums.setText(`${f.dps} DPS`);
      // Beside them, the same weapon already held: it merges, or which is better.
      if (p.weapon.joins) this.fit(this.text(x + w / 2, y + 154, `Merges with yours: ${nameAt(o.id, o.tier + 1)} ${TIER_NAMES[o.tier + 1]}`, { size: 15, color: '#2e7d3a', stroke: null }), w - 14);
      else if (p.weapon.held) {
        const better = f.dps > p.weapon.held.dps;
        this.fit(this.text(x + w / 2, y + 154, `Yours: ${p.weapon.held.dps} DPS, ${better ? 'this is better' : 'yours is better'}`, { size: 15, color: better ? '#2e7d3a' : RUBY.shade, stroke: null }), w - 14);
      }
      // The set bonus it moves first, on a line of its own; the rest are in the weapon types card.
      const st = p.sets[0];
      if (st) {
        const line = `${st.name} ${st.held} > ${st.after}: ${st.steps ? st.then : `at ${st.at}, ${st.then || 'a bonus'}`}`;
        this.fit(this.text(x + 10, y + 166, line, { size: 15, align: 'left', color: st.steps ? '#2e7d3a' : '#6b4a2b', stroke: null, weight: 600 }).setOrigin(0, 0), w - 20);
      }
      // What it does, last, cut to the room that is left.
      this.fitLines(this.text(x + w / 2, y + 188, byId(WEAPONS, o.id).says, { size: 15, color: '#6b4a2b', stroke: null, wrap: w - 20 }).setOrigin(0.5, 0), room - (y + 188));
    } else if (relic) this.fitLines(this.text(x + w / 2, y + 128, relicOf(o.id).says, { size: 15, color: '#6b4a2b', stroke: null, wrap: w - 20 }).setOrigin(0.5, 0), room - (y + 128));
    else {
      // An item of the land's own says its rule first, and its stats under it.
      const says = byId(ITEMS, o.id).says;
      let at = y + 128;
      if (says) {
        const t = this.fitLines(this.text(x + w / 2, at, says, { size: 15, color: '#2e5f45', stroke: null, wrap: w - 20, weight: 600 }).setOrigin(0.5, 0), room - at);
        if (t.active) at += t.height + 8;
      }
      this.changeLines(x + 12, at, w - 24, p.changes, Math.max(1, Math.floor((room - at) / 22)));
    }
    const why = whyNot(run, i);
    // Every slot full and no twin to merge with: a held weapon can be sold for it, from here.
    const full = o.kind === 'weapon' && !o.sold && run.weapons.length >= handsOf(run) && twinOf(run, o.id, o.tier) < 0;
    const swappable = full && run.weapons.some((_, slot) => canSwap(run, i, slot));
    // What cannot be afforded is seen to be so at a glance: its button is iron, not gold, and its price is in red.
    const poor = full ? !swappable : why === 'coins';
    const b = full
      ? this.button(x + w / 2 - 22, y + h - 34, `SWAP   ${o.price}`, () => {
        this.swapFor = i;
        sfx.play('click', 0.6);
        this.draw();
      }, { width: w - 68, height: 46, size: 19, mat: poor ? IRON : GOLD, color: poor ? '#ff8f7a' : undefined })
      : this.button(x + w / 2 - 22, y + h - 34, `BUY   ${o.price}`, () => this.act(this.moving(() => buy(this.run, i))), { width: w - 68, height: 46, size: 19, mat: poor ? IRON : GOLD, color: poor ? '#ff8f7a' : undefined });
    b.setEnabled(full ? swappable : why === '');
    if (poor) this.add2(this.add.image(x + 6, y + 6, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(w - 12, h - 62).setTint(hex(OUTLINE)).setAlpha(0.22));
    // Fenn may toss for it, once in a camp: heads it is free, tails it is paid for and gone.
    if (canToss(run, i)) {
      this.button(x + w - 52, y + 24, `FLIP ${Math.round(tossOdds(run) * 100)}%`, () => {
        const how = this.moving(() => toss(this.run, i) === 'heads') ? 'heads' : 'tails';
        this.act(true, how === 'heads' ? 'claim' : 'tick');
      }, { width: 92, height: 44, size: 15, mat: IRON });
    }
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
    this.text(x + 96, y + 30, def.short, { size: 20, align: 'left' });
    this.text(x + 96, y + 54, `Level ${run.level}`, { size: 16, align: 'left', color: HOLY.fill });
    this.text(x + 96, y + 76, `${Math.floor(run.xp)} / ${levelNeeds(run.level)}`, { size: 15, align: 'left', color: BONE.shade });
    // Their own weapon, which takes no hand and grows by itself: named with its tier, plainly, until it has a place of its own here.
    const own = ownOf(run);
    const named = this.text(x + 14, y + 126, `${weaponOf(own.id).name} ${TIER_NAMES[own.tier]}`, { size: 15, align: 'left', color: BONE.fill, strokeWidth: 3 });
    // Pressed, it shows what it is and what it learns as the hero grows.
    named.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      this.owned = true;
      this.draw();
    });
    this.statGrid(x + 12, y + 142, w - 24, 1, h - 154);
  }

  /** The same under a tall screen's wares: two columns, as tall as they need and no taller, just over the buttons. */
  private heroStrip(x: number, top: number, w: number, bottom: number): void {
    const run = this.run;
    const rows = Math.ceil(STATS.length / 2);
    // Who the hero is heads the strip: their picture, level and own weapon, as a wide screen has them down its left.
    const headH = 58;
    const h = Math.min(bottom - top, rows * 26 + 22 + headH);
    if (h < rows * 20 + 22 + headH) return;
    const y = bottom - h;
    this.add2(slabImage(this, x, y, w, h, DARK, 14, 5));
    const def = heroOf(run);
    const img = this.add2(this.add.image(x + 36, y + headH - 4, CARDS, portraitFrame('blue', def.unit)));
    img.setScale(Math.min(52 / (img.frame.height || 1), 52 / (img.frame.width || 1)));
    this.text(x + 72, y + 20, `${def.short}  Level ${run.level}`, { size: 18, align: 'left' });
    const own = ownOf(run);
    const named = this.text(x + 72, y + 42, `${weaponOf(own.id).name} ${TIER_NAMES[own.tier]}  (tap for its rules)`, { size: 15, align: 'left', color: HOLY.fill, strokeWidth: 3 });
    named.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      this.owned = true;
      this.draw();
    });
    this.text(x + w - 14, y + 20, `${Math.floor(run.xp)} / ${levelNeeds(run.level)} XP`, { size: 15, align: 'right', color: BONE.shade });
    this.statGrid(x + 12, y + headH + 8, w - 24, 2, h - headH - 16);
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
      // What the last choice or buy changed is lit: a player sees at once what they just got.
      if (this.lit.has(stat)) {
        const glow = this.add2(this.add.image(cx + cw / 2 - 4, cy, SHEET, 'fx/solid').setDisplaySize(cw - 4, rh - 2).setTint(hex(HOLY.fill)).setAlpha(0.28));
        this.tweens.add({ targets: glow, alpha: 0.08, duration: 600, yoyo: true, repeat: 3 });
      }
      this.icon(cx + 11, cy, statIcon(STAT_INFO[stat].icon), 20);
      const v = Math.round(s[stat] * 10) / 10;
      const named = this.text(cx + 30, cy, STAT_INFO[stat].name, { size: 15, align: 'left', color: this.lit.has(stat) ? HOLY.fill : BONE.fill, strokeWidth: 3 });
      const value = this.text(cx + cw - 10, cy, `${v}${STAT_INFO[stat].percent ? '%' : ''}`, { size: 15, align: 'right', color: v < 0 ? RUBY.fill : v > 0 ? VENOM.light : BONE.shade, strokeWidth: 3 });
      // A long name gives way to its number.
      named.setScale(Math.min(1, (value.x - value.width - 6 - named.x) / Math.max(1, named.width)), 1);
    });
  }

  /**
   * A weapon on offer with every slot full: which held weapon to give up for it. Each one can be swapped for it (sold
   * and the offer bought in one step) or only sold, which leaves a slot free and the offer to buy or not.
   */
  private swapCard(i: number): void {
    const run = this.run;
    const o = run.offers[i];
    const cx = view.w / 2;
    const rowH = 52;
    const n = run.weapons.length;
    const ch = 118 + n * rowH + 62;
    const cw = Math.min(440, view.w - 16);
    const cy = Math.max(ch / 2 + 8, view.h / 2);
    const top = cy - ch / 2;
    const left = cx - cw / 2;
    const shut = (): void => {
      this.swapFor = -1;
      this.draw();
    };
    this.add2(this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.55).setInteractive()).on('pointerup', shut);
    this.add2(slabImage(this, left, top, cw, ch, BONE, 18, 8).setInteractive());
    this.add2(slabImage(this, left + 10, top + 10, cw - 20, 30, TIER_MATS[o.tier], 10, 0));
    this.fit(this.text(cx, top + 25, `SWAP FOR ${byId(WEAPONS, o.id).name.toUpperCase()} ${TIER_NAMES[o.tier]}`, { size: 16, color: OUTLINE, stroke: null }), cw - 30);
    this.text(cx, top + 62, `Costs ${o.price}. Swap a weapon for it, or sell one to free a slot:`, { size: 15, color: '#6b4a2b', stroke: null, wrap: cw - 30 });
    run.weapons.forEach((w, slot) => {
      const y = top + 96 + slot * rowH;
      this.add2(slabImage(this, left + 20, y, 44, 44, TIER_MATS[w.tier], 10, 4));
      // Sized as the slots size it: the pictures are drawn on a canvas 184 high with room round the weapon.
      const img = this.add2(this.add.image(left + 42, y + 30, SHEET, weaponIcon(w.id)));
      img.setScale(48 / 184);
      const bw = 96;
      const sellX = left + cw - 20 - bw / 2;
      const swapX = sellX - bw - 8;
      this.fit(this.text(left + 74, y + 22, `${nameAt(w.id, w.tier)} ${TIER_NAMES[w.tier]}`, { size: 16, align: 'left', color: OUTLINE, stroke: null }), swapX - bw / 2 - 8 - (left + 74));
      const can = canSwap(run, i, slot);
      const b = plain(this.button(swapX, y + 22, 'SWAP', () => {
        this.swapFor = -1;
        this.act(this.moving(() => swap(this.run, i, slot)), 'buy');
      }, { width: bw, height: 42, size: 16, mat: can ? GOLD : IRON, color: can ? undefined : '#ff8f7a' }));
      b.setEnabled(can);
      const sold = plain(this.button(sellX, y + 22, `SELL +${sellPrice(w)}`, () => {
        this.swapFor = -1;
        this.act(sell(this.run, slot), 'coin');
      }, { width: bw, height: 42, size: 15, mat: IRON }));
      sold.setEnabled(run.weapons.length > 1);
    });
    this.button(cx, top + ch - 36, 'CANCEL', shut, { width: 200, height: 46, size: 18, mat: IRON });
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
    // A tier IV weapon says what its fifth form would be, and a fifth form says its own rule: the card is taller for it.
    const form = fifthOf(w.id);
    const next = form && w.tier >= FIFTH - 1 ? form : null;
    const extra = next ? 70 : 0;
    const top = cy - 170 - extra / 2;
    this.add2(slabImage(this, cx - 160, top, 320, 340 + extra, BONE, 18, 8));
    this.add2(slabImage(this, cx - 150, top + 10, 300, 30, TIER_MATS[w.tier], 10, 0));
    this.fit(this.text(cx, top + 25, `${nameAt(w.id, w.tier)}  ${TIER_NAMES[w.tier]}`, { size: 17, color: OUTLINE, stroke: null }), 280);
    // A tall weapon is sized by its own height, so that its tip stays under the band with its name.
    const img = this.add2(this.add.image(cx, top + 104, SHEET, weaponIcon(w.id)));
    img.setScale(Math.min(100 / 184, 118 / img.frame.height));
    const f = weaponFacts(run, w.id, w.tier);
    this.text(cx, top + 172, `${f.dmg} DMG   ${f.rate.toFixed(2)} hits/s   ${f.dps} DPS`, { size: 17, color: OUTLINE, stroke: null });
    this.text(cx, top + 198, def.says, { size: 15, color: '#6b4a2b', stroke: null, wrap: 280 });
    if (next) {
      const head = w.tier === FIFTH ? `${def.name}'s tier V:` : `Merge 2 for tier V, ${next.name}:`;
      this.text(cx, top + 222, `${head} ${next.says}`, { size: 15, color: '#2e5f45', stroke: null, wrap: 280, weight: 600 }).setOrigin(0.5, 0);
    }
    const twin = twinOf(run, w.id, w.tier, i) >= 0;
    const last = w.tier >= FIFTH || (w.tier === FIFTH - 1 && !form);
    const join = plain(this.button(cx, top + 246 + extra, twin ? `MERGE INTO TIER ${TIER_NAMES[w.tier + 1]}` : last ? 'HIGHEST TIER' : 'NEED 2 TO MERGE', () => {
      this.picked = -1;
      this.act(combine(this.run, i), 'levelUp');
    }, { width: 280, height: 46, size: 17, mat: HOLY, color: OUTLINE }));
    join.setEnabled(twin);
    const sold = this.button(cx, top + 300 + extra, `SELL FOR ${sellPrice(w)}`, () => {
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
    // A land's own item says its rule and where it is sold, over its stats: its card is taller for it.
    const extra = item.says ? 70 : 0;
    const top = cy - 140 - extra / 2;
    this.add2(slabImage(this, cx - 150, top, 300, 280 + extra, BONE, 18, 8));
    this.add2(slabImage(this, cx - 44, top + 22, 88, 88, TIER_MATS[item.tier], 14, 6));
    this.icon(cx, top + 64, itemIcon(item.id), 64);
    const n = this.run.items.filter((x) => x === id).length;
    this.text(cx, top + 134, n > 1 ? `${item.name}  x${n}` : item.name, { size: 20, color: OUTLINE, stroke: null });
    if (item.says) {
      if (item.land) this.text(cx, top + 156, `${LAND_NAMES[item.land]} only`, { size: 15, color: '#6b4a2b', stroke: null });
      this.text(cx, top + 172, item.says, { size: 15, color: '#2e5f45', stroke: null, wrap: 264, weight: 600 }).setOrigin(0.5, 0);
    }
    this.statLinesDark(cx, top + 164 + extra, item.stats);
    this.button(cx, top + 240 + extra, 'CLOSE', shut, { width: 180, height: 46, size: 19, mat: IRON });
  }

  /** A relic that is held was pressed: what it is and what it does. */
  private relicCard(id: string): void {
    const r = relicOf(id);
    const cx = view.w / 2;
    const cy = view.h / 2;
    const shut = (): void => {
      this.relic = null;
      this.draw();
    };
    this.add2(this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.55).setInteractive()).on('pointerup', shut);
    this.add2(slabImage(this, cx - 150, cy - 140, 300, 280, BONE, 18, 8));
    this.add2(slabImage(this, cx - 44, cy - 118, 88, 88, GOLD, 14, 6));
    this.icon(cx, cy - 76, relicIcon(id), 64);
    this.text(cx, cy - 6, r.name, { size: 20, color: OUTLINE, stroke: null });
    this.text(cx, cy + 14, r.says, { size: 16, color: '#6b4a2b', stroke: null, wrap: 264 }).setOrigin(0.5, 0);
    this.button(cx, cy + 100, 'CLOSE', shut, { width: 180, height: 46, size: 19, mat: IRON });
  }

  /** The hero's own weapon: what it is now, and the rule it learns at each of three levels. */
  private ownCard(): void {
    const run = this.run;
    const own = ownOf(run);
    const def = ownDef(run);
    const cx = view.w / 2;
    const w = Math.min(460, view.w - 24);
    const h = 330;
    const top = Math.max(8, (view.h - h) / 2);
    const shut = (): void => {
      this.owned = false;
      this.draw();
    };
    this.add2(this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.55).setInteractive()).on('pointerup', shut);
    this.add2(slabImage(this, cx - w / 2, top, w, h, BONE, 18, 8));
    this.text(cx, top + 28, `${def.name} ${TIER_NAMES[own.tier]}`, { size: 20, color: OUTLINE, stroke: null });
    this.text(cx, top + 46, def.says, { size: 15, color: '#6b4a2b', stroke: null, wrap: w - 36 }).setOrigin(0.5, 0);
    ownRules(def.id, own.tier, this.run.alt).forEach((r, i) => {
      const y = top + 104 + i * 56;
      this.text(cx - w / 2 + 18, y, `Level ${r.level}`, { size: 16, align: 'left', color: r.on ? '#2e5f45' : OUTLINE, stroke: null });
      this.text(cx - w / 2 + 104, y - 10, r.says, { size: 15, align: 'left', color: r.on ? '#2e5f45' : '#6b4a2b', stroke: null, wrap: w - 122 }).setOrigin(0, 0);
    });
    this.button(cx, top + h - 36, 'CLOSE', shut, { width: 180, height: 46, size: 19, mat: IRON });
  }

  /** The kinds of weapon held: how many of each, what that gives, and what the next one would. */
  private kindsCard(): void {
    const held = kindsOf(this.run);
    const cx = view.w / 2;
    const w = Math.min(500, view.w - 24);
    // On a narrow screen what the next step gives may take two lines.
    const rowH = w < 460 ? 62 : 46;
    const h = 84 + held.length * rowH + 62;
    const top = Math.max(8, (view.h - h) / 2);
    const shut = (): void => {
      this.kinds = false;
      this.draw();
    };
    this.add2(this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.55).setInteractive()).on('pointerup', shut);
    this.add2(slabImage(this, cx - w / 2, top, w, h, BONE, 18, 8));
    this.text(cx, top + 28, 'WEAPON TYPES', { size: 20, color: OUTLINE, stroke: null });
    this.text(cx, top + 52, 'Hold 2, 3 or 4 of a type for a set bonus.', { size: 15, color: '#6b4a2b', stroke: null });
    held.forEach((k, i) => {
      const y = top + 84 + i * rowH;
      this.text(cx - w / 2 + 18, y, `${k.name} ${k.held}`, { size: 17, align: 'left', color: OUTLINE, stroke: null });
      this.text(cx - w / 2 + 110, y - 10, k.says || 'No bonus yet.', { size: 15, align: 'left', color: k.says ? '#2e5f45' : '#6b4a2b', stroke: null });
      this.text(cx - w / 2 + 110, y, k.next ? `At ${k.next.at}: ${k.next.says}` : 'Max bonus.', { size: 15, align: 'left', color: '#6b4a2b', stroke: null, wrap: w - 126 }).setOrigin(0, 0);
    });
    this.button(cx, top + h - 36, 'CLOSE', shut, { width: 180, height: 46, size: 19, mat: IRON });
  }

  /** On to the next wave: by the road, where there is more than one. */
  private go(): void {
    if (!march(this.run)) return;
    keepRun();
    if (this.run.phase === 'road') {
      this.scene.start('Road');
      return;
    }
    // A portal may show something between waves. The wave waits for it, and never long.
    void ads().interstitial().then(() => {
      this.scene.stop();
      this.scene.get('Arena').scene.restart();
    });
  }
}
