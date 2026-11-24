// The packs: the ones the player holds, and the ones coins buy. It opens
// over the field.
//
// Every pack has a slot of its own, laid out as the cards on the screen of
// units are: a small picture, and under it which difficulty's pack it is. A
// land's pack on each difficulty is a pack, and a slot, of its own. Pressing
// a slot brings that pack up on the right, big, with what it holds: the
// grades it hands out, every unit it can turn over, and how likely each tier
// is. By the owner's word of 24 November 2026: "Don't scroll on difficulty of
// packs / Make each pack difficulty its own slot / ... the pack graphic is
// small but once you select it you can focus on it and it be big and show
// more detail on the right", and "display what units you can get".
//
// A unit the player has not met is its outline in the dark there, as it is
// everywhere: the pack says there is one, and of which tier, and not who.
//
// Opening is a show. The pouch is torn, a light in the color of what is
// inside builds behind it, and the card comes up out of it and turns over.
// Up to ten can be opened at once: their cards are dealt face down and
// turned one after another, the rarest last.

import Phaser from 'phaser';
import { BONE, CLOTH, GOLD, HIGHLIGHT, HOLY, IRON, OUTLINE, VENOM, type Material } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { LANDS } from '../../data/lands';
import { DIFFICULTIES, LAPS } from '../../data/laps';
import { PACKS, packAt, type PackDef } from '../../data/packs';
import { WORLDS } from '../../data/stages';
import { UNITS } from '../../data/units';
import { RARITIES, RARITY } from '../../game/rarity';
import { buyPacks, known, openPacks, packNow, packOdds, packOpen, packShown, priceOf, worldNeeds, type Pull } from '../../game/rules';
import { markSeen } from '../../game/tutorial';
import { setupCamera } from '../app';
import { H, W, hex } from '../config';
import { CARDS, SHEET } from '../Sheet';
import { commit, save } from '../session';
import { OverlayHead, veil } from '../ui/chrome';
import { DIFFICULTY_MAT, RARITY_MAT } from '../ui/colors';
import { gradeBadge } from '../ui/grade';
import { burst, cardFace, rays, type Adder } from '../ui/fanfare';
import { Guide, type Rect } from '../ui/Guide';
import { portrait } from '../ui/UnitCard';
import { PH, PW, PX, PY } from '../ui/UnitPanel';
import { Button, label, plain, slab } from '../ui/widgets';

/** The slots stand as the cards on the screen of units do. */
const PITCH = 140;
const SLOT_W = 128;
const SLOT_H = 132;
/** The most packs opened at one press. */
export const OPEN_AT_ONCE = 10;

export interface Slot {
  pack: PackDef;
  /** The pack it is a difficulty of: itself, for a pack that has none. */
  base: PackDef;
  col: number;
  row: number;
}

/** Every pack there is, each in its slot: the packs that are no land's along the top, then a row to a land, a difficulty to a column. */
export function packSlots(): Slot[] {
  const out: Slot[] = [];
  PACKS.filter((p) => !p.land).forEach((pack, col) => out.push({ pack, base: pack, col, row: 0 }));
  PACKS.filter((p) => p.land).forEach((base, i) => {
    for (let lap = 0; lap < LAPS.length; lap++) out.push({ pack: packAt(base, lap), base, col: lap, row: i + 1 });
  });
  return out;
}

function rankOf(rarity: string): number {
  return Math.max(0, (RARITIES as readonly string[]).indexOf(rarity));
}

/** A chance as a share of a hundred: one decimal under ten, none over. */
function percent(chance: number): string {
  const p = chance * 100;
  return `${p >= 10 ? Math.round(p) : Math.round(p * 10) / 10}%`;
}

interface Dealt {
  root: Phaser.GameObjects.Container;
  back: Phaser.GameObjects.Container;
  front: Phaser.GameObjects.Container;
  pull: Pull;
  turned: boolean;
  x: number;
  y: number;
}

export class ShopScene extends Phaser.Scene {
  private head!: OverlayHead;
  private guide!: Guide;
  private slots: Slot[] = [];
  private selected = '';
  private grid: Phaser.GameObjects.GameObject[] = [];
  private detail: Phaser.GameObjects.GameObject[] = [];
  private show: Phaser.GameObjects.GameObject[] = [];
  private busy = false;
  /** Where the tutorial's OPEN is, if the pack on show is held. */
  private firstOpen: Rect | null = null;
  private doneRect: Rect | null = null;
  /** Where the buttons that open and buy the pack on show are, if it is one that is sold. */
  private buyRect: Rect | null = null;
  /** Ends the show at once, while cards are still being turned. */
  private skip: (() => void) | null = null;

  constructor() {
    super('Shop');
  }

  init(): void {
    this.grid = [];
    this.detail = [];
    this.show = [];
    this.busy = false;
    this.firstOpen = null;
    this.doneRect = null;
    this.skip = null;
  }

  create(): void {
    setupCamera(this);
    const s = save();
    this.head = new OverlayHead(this, 'Packs', s, () => {
      // The tutorial's look at the packs is over once one has been opened and the screen shut.
      if (s.stats.opened > 0) markSeen(s, 'packs');
      commit();
    });
    label(this, 190, 40, 'Every pack holds one card. Press a pack to see what is in it.', {
      size: 17, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4,
    });

    this.slots = packSlots();
    // It opens on the pack last looked at, if any of it are held still; or on the first pack held, so
    // that OPEN is there to press; or on the last looked at; or on the best one on sale.
    const last = this.registry.get('shopPack') as string | undefined;
    const lastSlot = this.slots.find((sl) => sl.pack.id === last);
    const held = this.slots.find((sl) => (s.packs[sl.pack.id] ?? 0) > 0);
    const onSale = this.slots.filter((sl) => packOpen(s, sl.pack));
    const pick = lastSlot && (s.packs[lastSlot.pack.id] ?? 0) > 0 ? lastSlot : held ?? lastSlot ?? onSale[onSale.length - 1] ?? this.slots[0];
    this.selected = pick.pack.id;

    this.guide = new Guide(this, 'Shop');
    this.guide.mark('open', () => this.firstOpen);
    this.guide.mark('close', () => this.head.close.rect);
    this.guide.mark('pouch', () => ({ x: W / 2 - 130, y: H / 2 - 190, w: 260, h: 340 }));
    this.guide.mark('reveal:done', () => this.doneRect);
    // What the tour of the packs points at: the slots, the pack on show, and the buttons that buy it.
    this.guide.mark('slots', () => ({ x: 26, y: 74, w: 704, h: 560 }));
    this.guide.mark('detail', () => ({ x: PX + 8, y: PY + 8, w: PW - 16, h: PH - 156 }));
    this.guide.mark('buy', () => this.buyRect);

    this.drawGrid();
    this.showDetail();
    this.guide.refresh({ show: 'none' });
  }

  private slotAt(sl: Slot): [number, number] {
    return [30 + 66 + sl.col * PITCH, 78 + 67 + sl.row * PITCH];
  }

  // ------------------------------------------------------------ the slots

  private drawGrid(): void {
    for (const o of this.grid) o.destroy();
    this.grid = [];
    const add: Adder = (o) => {
      this.grid.push(o);
      return o;
    };
    const s = save();
    for (const sl of this.slots) {
      const [x, y] = this.slotAt(sl);
      // Sold, or given: a pack the player has not come to is its own shape in the dark.
      const open = packShown(s, sl.pack);
      const held = s.packs[sl.pack.id] ?? 0;
      const root = add(this.add.container(x, y));
      const g = this.add.graphics();
      slab(g, -SLOT_W / 2, -SLOT_H / 2, SLOT_W, SLOT_H, open ? BONE : IRON, 14, 6);
      root.add(g);
      const art = this.add.image(0, -16, CARDS, `pack/${sl.base.id}`).setScale(0.25);
      root.add(art);
      const lap = sl.pack.lap ?? 0;
      if (!open) {
        // Not sold yet: its own shape in the dark, and nothing said of it.
        art.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.8);
        root.add(this.add.image(0, -16, SHEET, 'icon/lock').setScale(0.36));
        root.add(label(this, 0, SLOT_H / 2 - 18, '???', { size: 15, strokeWidth: 4 }));
      } else if (sl.base.land) {
        // Which difficulty's pack it is, on that difficulty's color.
        const chip = this.add.graphics();
        slab(chip, -SLOT_W / 2 + 8, SLOT_H / 2 - 32, SLOT_W - 16, 24, DIFFICULTY_MAT[lap], 8, 3);
        root.add(chip);
        root.add(label(this, 0, SLOT_H / 2 - 21, DIFFICULTIES[lap].toUpperCase(), { size: 13, strokeWidth: 4 }));
      } else {
        root.add(label(this, 0, SLOT_H / 2 - 20, sl.base.name.replace(' Pack', ''), { size: 15, color: OUTLINE, stroke: null }));
      }
      if (held > 0) {
        // How many are held, on a red disc in the corner, as the PACKS button on the main screen counts them.
        const badge = this.add.graphics();
        badge.fillStyle(hex(OUTLINE), 1).fillCircle(SLOT_W / 2 - 16, -SLOT_H / 2 + 16, 17);
        badge.fillStyle(hex(CLOTH.red.fill), 1).fillCircle(SLOT_W / 2 - 16, -SLOT_H / 2 + 16, 13);
        root.add(badge);
        root.add(label(this, SLOT_W / 2 - 16, -SLOT_H / 2 + 15, String(Math.min(held, 99)), { size: 15, strokeWidth: 3 }));
      }
      root.setSize(SLOT_W, SLOT_H);
      root.setInteractive({ useHandCursor: true });
      root.on('pointerup', () => {
        if (this.busy) return;
        this.selected = sl.pack.id;
        this.registry.set('shopPack', sl.pack.id);
        sfx.play('click');
        this.drawGrid();
        this.showDetail();
        this.guide.refresh({ show: 'none' });
      });
      if (sl.pack.id === this.selected) {
        const ring = add(this.add.graphics().setDepth(50));
        ring.lineStyle(5, hex(HIGHLIGHT), 1).strokeRoundedRect(x - 69, y - 70, 138, 140, 16);
      }
    }
  }

  // ------------------------------------------------------------ the pack on show

  private showDetail(): void {
    for (const o of this.detail) o.destroy();
    this.detail = [];
    this.firstOpen = null;
    this.buyRect = null;
    const add: Adder = (o) => {
      this.detail.push(o);
      return o;
    };
    const s = save();
    const sl = this.slots.find((x) => x.pack.id === this.selected);
    if (!sl) return;
    // As it stands today: a pack that grows hands out the grades of the difficulty the line has come to.
    const pack = packNow(s, sl.pack);
    const lap = pack.lap ?? 0;
    const open = packShown(s, pack);
    const cx = PX + PW / 2;
    const dark = { color: OUTLINE, stroke: null as null };
    const g = add(this.add.graphics());
    slab(g, PX, PY, PW, PH, BONE, 22, 8);
    const window: Material = !open ? IRON : sl.base.land ? DIFFICULTY_MAT[lap] : GOLD;
    slab(g, PX + 14, PY + 14, PW - 28, 196, window, 16, 5);
    const art = add(this.add.image(cx, PY + 112, CARDS, `pack/${sl.base.id}`).setScale(0.5));

    if (!open) {
      art.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.8);
      add(label(this, cx, PY + 244, '???', { size: 30 }));
      add(this.add.image(cx, PY + 310, SHEET, 'icon/lock').setScale(0.6));
      // What opens it: its land on its difficulty, or a stage of the line.
      let how = 'Not sold yet.';
      if (pack.gift) how = 'No shop sells it.\nIt is one of the REWARDS\nfor time played.';
      else if (sl.base.land) {
        const land = LANDS.findIndex((l) => l.id === sl.base.land);
        const needs = worldNeeds(s, lap * LANDS.length + land).map((w) => `${WORLDS[w].name} on ${DIFFICULTIES[WORLDS[w].lap]}`);
        if (needs.length > 0) how = `Sold once you have beaten\n${needs.join('\nand ')}.`;
      } else if (pack.after !== undefined) how = `Sold once stage ${pack.after} is cleared.`;
      add(label(this, cx, PY + 392, how, { size: 17, weight: 600, ...dark }));
      return;
    }

    add(label(this, cx, PY + 234, pack.name, { size: pack.name.length > 20 ? 20 : 24 }));
    add(label(this, cx, PY + 262, sl.base.blurb, { size: 14, weight: 600, ...dark }));

    // The grades it hands out, from its worst to its best, and how many are held.
    add(gradeBadge(this, PX + 64, PY + 298, pack.gradeMin, 22));
    add(label(this, PX + 108, PY + 298, 'to', { size: 15, weight: 600, ...dark }));
    add(gradeBadge(this, PX + 152, PY + 298, pack.gradeMax, 22));
    const held = s.packs[pack.id] ?? 0;
    add(label(this, PX + PW - 24, PY + 298, held > 0 ? `You hold ${held}` : 'None held', {
      size: 17, align: 'right', color: held > 0 ? CLOTH.blue.shade : IRON.shade, stroke: null,
    }));

    // Everything it can turn over, the rarest last: a small tile each, in its tier's color.
    const odds = packOdds(s, pack).sort((a, b) => rankOf(a.unit.rarity) - rankOf(b.unit.rarity) || a.unit.name.localeCompare(b.unit.name));
    const per = 7;
    const pitch = 48;
    const x0 = cx - ((per - 1) * pitch) / 2;
    const y0 = PY + 352;
    const rows = Math.ceil(odds.length / per);
    const ny = y0 + rows * pitch - 4;
    const note = add(label(this, cx, ny, `${odds.length} kinds of card inside`, { size: 14, weight: 600, ...dark }));
    odds.forEach(({ unit, chance }, i) => {
      const x = x0 + (i % per) * pitch;
      const y = y0 + Math.floor(i / per) * pitch;
      const met = known(s, unit);
      const tile = add(this.add.graphics());
      slab(tile, x - 21, y - 21, 42, 42, met ? RARITY_MAT[unit.rarity] : IRON, 8, 3);
      const pic = add(portrait(this, x, y + 17, unit.id, 'blue', 32, !met));
      // A wall or a trap is wider than it is tall: it is kept inside its tile.
      if (pic.displayWidth > 38) pic.setScale((pic.scaleX * 38) / pic.displayWidth);
      // Pressing one says what it is, if it is known, and how likely.
      const zone = add(this.add.zone(x, y, 46, 46).setInteractive({ useHandCursor: true }));
      const say = (): void => {
        note.setText(`${met ? unit.name : '???'}  ·  ${RARITY[unit.rarity].name}  ·  ${percent(chance)}`);
      };
      zone.on('pointerover', say);
      zone.on('pointerdown', say);
    });
    // Under them, how likely each tier is: its color, and its share.
    const tiers = RARITIES.filter((r) => odds.some((o) => o.unit.rarity === r));
    const tw = 66;
    const tx0 = cx - ((tiers.length - 1) * tw) / 2;
    tiers.forEach((r, i) => {
      const x = tx0 + i * tw;
      const share = odds.filter((o) => o.unit.rarity === r).reduce((n, o) => n + o.chance, 0);
      const dot = add(this.add.graphics());
      slab(dot, x - 28, ny + 16, 14, 14, RARITY_MAT[r], 4, 2);
      add(label(this, x - 10, ny + 23, percent(share), { size: 13, weight: 600, align: 'left', ...dark }));
    });

    // OPEN one, or as many as are held up to ten; BUY one, or ten.
    const by = PY + PH - 112;
    const many = Math.min(held, OPEN_AT_ONCE);
    const one = new Button(this, cx - 88, by, 'OPEN', () => this.open(pack, sl.base, 1), { width: 164, height: 58, size: 24 });
    one.setEnabled(held > 0);
    add(one.root);
    if (held > 0) this.firstOpen = one.rect;
    const all = new Button(this, cx + 88, by, many > 1 ? `OPEN ${many}` : 'OPEN 10', () => this.open(pack, sl.base, many), { width: 164, height: 58, size: 22 });
    all.setEnabled(many > 1);
    add(all.root);
    if (pack.gift) {
      // Coins never buy it: where the buttons would be, it says where it comes from.
      add(label(this, cx, by + 66, 'No shop sells it. Time played gives it:\nsee REWARDS on the main screen.', { size: 15, weight: 600, ...dark }));
      return;
    }
    const buy = (n: number): void => {
      if (buyPacks(s, pack.id, n) > 0) {
        sfx.play('buy');
        commit();
        this.head.coins.refresh();
        this.drawGrid();
        this.showDetail();
        this.guide.refresh({ show: 'none' });
      }
    };
    this.buyRect = { x: PX + 16, y: by - 32, w: PW - 32, h: 132 };
    // What it costs this player: its price, less whatever they have that takes off it.
    const price = priceOf(s, pack);
    const b1 = new Button(this, cx - 88, by + 66, `     ${price}`, () => buy(1), { width: 164, height: 58, size: 22, mat: VENOM });
    b1.root.add(this.add.image(-58, -3, SHEET, 'icon/coin').setScale(0.34));
    b1.setEnabled(s.coins >= price);
    add(b1.root);
    const b10 = new Button(this, cx + 88, by + 66, `x10   ${price * 10}`, () => buy(10), { width: 164, height: 58, size: price * 10 >= 10000 ? 17 : 20, mat: VENOM });
    b10.setEnabled(s.coins >= price * 10);
    add(b10.root);
  }

  // ------------------------------------------------------------ opening

  private clearShow(): void {
    for (const o of this.show) o.destroy();
    this.show = [];
    this.doneRect = null;
    this.skip = null;
  }

  private open(pack: PackDef, base: PackDef, count: number): void {
    if (this.busy || count <= 0) return;
    const s = save();
    if ((s.packs[pack.id] ?? 0) <= 0) return;
    this.busy = true;
    this.clearShow();
    const add: Adder = (o) => {
      this.show.push(o);
      return o;
    };
    add(veil(this, 9000, 0.9));
    const cx = W / 2;
    const cy = H / 2 - 20;
    const pouch = add(this.add.image(cx, cy, CARDS, `pack/${base.id}`).setDepth(9010).setScale(0.2));
    const hint = add(label(this, cx, H - 90, count > 1 ? `Press to open ${count}` : 'Press to open', { size: 24 }).setDepth(9010));
    this.tweens.add({ targets: pouch, scale: 0.9, duration: 320, ease: 'Back.easeOut' });
    this.tweens.add({ targets: hint, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
    const sway = this.tweens.add({ targets: pouch, angle: { from: -3, to: 3 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const zone = add(this.add.zone(W / 2, H / 2, W, H).setInteractive({ useHandCursor: true }).setDepth(9020));
    this.guide.refresh({ show: 'pouch' });
    zone.once('pointerup', () => {
      zone.disableInteractive();
      hint.destroy();
      sway.stop();
      // The cards are decided here, by the rules; all that follows is the show.
      const pulls = openPacks(s, pack.id, count);
      commit();
      this.guide.refresh({ show: 'reveal' });
      if (pulls.length === 0) {
        this.finish();
        return;
      }
      const best = pulls.reduce((a, b) => (rankOf(b.rarity) > rankOf(a.rarity) ? b : a));
      const glow = hex(RARITY_MAT[best.rarity].fill);
      sfx.play('packShake');
      this.time.delayedCall(330, () => sfx.play('packShake'));
      // A light in the color of the best thing inside gathers behind the pouch while it shakes: the first sign of what is coming.
      const halo = add(this.add.image(cx, cy, SHEET, 'fx/disc').setTint(glow).setDepth(9006).setScale(0.4).setAlpha(0));
      this.tweens.add({ targets: halo, scale: 5.2, alpha: 0.75, duration: 820, ease: 'Cubic.easeIn' });
      // It shakes harder and harder, swells, and bursts.
      this.tweens.add({
        targets: pouch,
        angle: { from: -10, to: 10 },
        duration: 68,
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          this.tweens.add({ targets: pouch, scaleX: 1.5, scaleY: 0.7, alpha: 0, y: cy + 40, duration: 200, ease: 'Cubic.easeIn' });
          this.tweens.add({ targets: halo, scale: 9, alpha: 0, duration: 420, ease: 'Cubic.easeOut' });
          sfx.play('packOpen');
          const flash = add(this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0.8).setDepth(9004));
          this.tweens.add({ targets: flash, alpha: 0, duration: 280 });
          if (pulls.length === 1) this.reveal(pulls[0], pack, base);
          else this.deal(pulls, pack, base);
        },
      });
    });
  }

  /** One pack opened: its card comes up out of the pouch and turns over, and what it is is said. */
  private reveal(pull: Pull, pack: PackDef, base: PackDef): void {
    const s = save();
    const add: Adder = (o) => {
      this.show.push(o);
      return o;
    };
    const def = UNITS[pull.unit];
    const color = hex(RARITY_MAT[pull.rarity].fill);
    const cx = W / 2;
    const cy = H / 2 - 40;
    const rank = rankOf(pull.rarity);

    this.time.delayedCall(140, () => sfx.reveal(rank));
    // A rare card's flourish is heard over the music, not through it.
    if (rank >= 2) music.duck(1 + rank * 0.3);
    burst(this, add, cx, cy, rank, color);
    if (rank >= 2) rays(this, add, cx, cy, color, 430);
    if (rank >= 3 && s.settings.shake) this.cameras.main.shake(220, 0.006 + (rank - 3) * 0.004);

    // The card rises out of where the pouch was, turning over as it comes.
    const w = 264;
    const h = 330;
    const card = add(cardFace(this, pull.unit, pull.rarity, w, h).setPosition(cx, cy + 70).setDepth(9030));
    card.setScale(0.05, 0.5).setAlpha(0);
    this.tweens.add({ targets: card, scaleX: 1, scaleY: 1, y: cy, alpha: 1, duration: 340, delay: 120, ease: 'Back.easeOut' });
    // Its grade is stamped on it a moment after: the second thing to hope for.
    const badge = add(gradeBadge(this, cx - w / 2 + 44, cy - h / 2 + 40, pull.grade, 40).setDepth(9032).setAlpha(0));
    // A badge is drawn at a scale of its own: it comes down onto the card from two and a half times that.
    const rest = badge.scaleX;
    badge.setScale(rest * 2.5);
    this.tweens.add({ targets: badge, alpha: 1, scale: rest, duration: 240, delay: 520, ease: 'Back.easeOut', onStart: () => sfx.play('place') });

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
    const head = add(label(this, cx, cy - h / 2 - 38, headline, { size: 40, color: headColor, strokeWidth: 8 }).setDepth(9031).setAlpha(0).setScale(0.6));
    this.tweens.add({ targets: head, alpha: 1, scale: 1, duration: 260, delay: 380, ease: 'Back.easeOut' });
    const line = add(label(this, cx, cy + h / 2 + 36, sub, { size: 20, weight: 600 }).setDepth(9031).setAlpha(0));
    this.tweens.add({ targets: line, alpha: 1, duration: 260, delay: 480 });

    this.time.delayedCall(700, () => this.endButtons(add, pack, base, s.packs[pack.id] ?? 0));
  }

  /** Several opened at once: their cards are dealt face down, and turned one after another, the rarest last. */
  private deal(pulls: Pull[], pack: PackDef, base: PackDef): void {
    const s = save();
    const add: Adder = (o) => {
      this.show.push(o);
      return o;
    };
    // The best is kept for last. Among one tier, the better grade comes later.
    const order = [...pulls].sort((a, b) => rankOf(a.rarity) - rankOf(b.rarity) || a.grade - b.grade);
    const per = order.length <= 5 ? order.length : Math.ceil(order.length / 2);
    const rows = Math.ceil(order.length / per);
    const w = 150;
    const h = 196;
    const gapX = 164;
    const gapY = 214;
    const top = H / 2 - 24 - ((rows - 1) * gapY) / 2;
    const cards: Dealt[] = [];
    order.forEach((pull, i) => {
      const row = Math.floor(i / per);
      const inRow = row === rows - 1 ? order.length - row * per : per;
      const x = W / 2 + (i - row * per - (inRow - 1) / 2) * gapX;
      const y = top + row * gapY;
      const root = add(this.add.container(W / 2, H / 2 - 20).setDepth(9030 + i).setScale(0.2).setAlpha(0));
      // The back of a card: the pack it came out of, on a dark slab.
      const back = this.add.container(0, 0);
      const bg = this.add.graphics();
      slab(bg, -w / 2, -h / 2, w, h, IRON, 14, 6);
      back.add(bg);
      back.add(this.add.image(0, 0, CARDS, `pack/${base.id}`).setScale(0.3).setAlpha(0.9));
      const front = cardFace(this, pull.unit, pull.rarity, w, h).setVisible(false);
      front.add(gradeBadge(this, -w / 2 + 26, -h / 2 + 24, pull.grade, 26));
      if (pull.outcome === 'new' || pull.best) {
        // What is worth a second look says so, on a ribbon across its corner.
        const tag = this.add.graphics();
        slab(tag, w / 2 - 62, -h / 2 + 10, 56, 24, pull.outcome === 'new' ? HOLY : GOLD, 8, 3);
        front.add(tag);
        front.add(label(this, w / 2 - 34, -h / 2 + 21, pull.outcome === 'new' ? 'NEW' : 'BEST', { size: 13, strokeWidth: 4 }));
      }
      root.add([back, front]);
      cards.push({ root, back, front, pull, turned: false, x, y });
      this.tweens.add({
        targets: root, x, y, scale: 1, alpha: 1, duration: 300, delay: 80 + i * 55, ease: 'Back.easeOut',
        onStart: () => sfx.play('lift', 0.5, 1 + i * 0.04),
      });
    });

    const turn = (i: number, quiet = false): void => {
      const c = cards[i];
      if (!c || c.turned) return;
      c.turned = true;
      const rank = rankOf(c.pull.rarity);
      const color = hex(RARITY_MAT[c.pull.rarity].fill);
      this.tweens.killTweensOf(c.root);
      c.root.setPosition(c.x, c.y).setAlpha(1).setScale(1);
      if (quiet) {
        c.back.setVisible(false);
        c.front.setVisible(true);
        return;
      }
      this.tweens.add({
        targets: c.root, scaleX: 0, duration: 90, ease: 'Cubic.easeIn',
        onComplete: () => {
          c.back.setVisible(false);
          c.front.setVisible(true);
          this.tweens.add({ targets: c.root, scaleX: 1, duration: 130, ease: 'Back.easeOut' });
          sfx.reveal(rank);
          burst(this, add, c.x, c.y, rank, color, 0.45);
          if (rank >= 2) {
            // A rare one is held up: it jumps, and the light stays on it.
            this.tweens.add({ targets: c.root, y: c.y - 14, duration: 140, yoyo: true, ease: 'Cubic.easeOut' });
            rays(this, add, c.x, c.y, color, 150);
          }
          if (rank >= 3) music.duck(1.4);
          if (rank >= 3 && s.settings.shake) this.cameras.main.shake(160, 0.005);
        },
      });
    };

    // One after another, a rare one after a longer breath. A press turns the rest at once.
    let at = 420 + order.length * 55;
    const timers: Phaser.Time.TimerEvent[] = [];
    order.forEach((pull, i) => {
      at += rankOf(pull.rarity) >= 2 ? 520 : 230;
      timers.push(this.time.delayedCall(at, () => turn(i)));
    });
    let ended = false;
    const end = (): void => {
      if (ended) return;
      ended = true;
      this.skip = null;
      for (const t of timers) t.remove();
      cards.forEach((_c, i) => turn(i, true));
      const fresh = order.filter((p) => p.outcome === 'new').length;
      const said = fresh > 0 ? `${order.length} cards, ${fresh} of them new to you` : `${order.length} cards`;
      add(label(this, W / 2, top - h / 2 - 34, said, { size: 30, strokeWidth: 7 }).setDepth(9060));
      this.endButtons(add, pack, base, s.packs[pack.id] ?? 0);
    };
    this.skip = end;
    timers.push(this.time.delayedCall(at + 520, end));
    const zone = add(this.add.zone(W / 2, H / 2, W, H).setInteractive().setDepth(9025));
    zone.on('pointerup', () => this.skip?.());
  }

  /** DONE, and OPEN again if any of that pack are left: as many as there are, up to ten. */
  private endButtons(add: Adder, pack: PackDef, base: PackDef, left: number): void {
    const cx = W / 2;
    const more = left > 0;
    const done = new Button(this, more ? cx - 160 : cx, H - 56, 'DONE', () => this.finish(), { width: 220, height: 62, size: 28, mat: more ? BONE : GOLD, color: more ? OUTLINE : undefined }).setDepth(9061);
    if (more) {
      plain(done);
      const n = Math.min(left, OPEN_AT_ONCE);
      const again = new Button(this, cx + 130, H - 56, n > 1 ? `OPEN ${n} MORE` : 'OPEN ANOTHER', () => {
        this.busy = false;
        this.open(pack, base, n);
      }, { width: 300, height: 62, size: 26 }).setDepth(9061);
      add(again.root);
    }
    add(done.root);
    this.doneRect = done.rect;
    this.busy = false;
    this.guide.refresh({ show: 'reveal' });
  }

  private finish(): void {
    this.clearShow();
    this.busy = false;
    this.scene.restart();
  }
}
