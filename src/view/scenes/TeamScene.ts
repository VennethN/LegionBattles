// The player's cards, and who of them fights. It opens over the field.
// Every card is a tile of its own: two of a unit are two tiles. Pressing a
// card shows what it is and does; from there it is put in the team or taken
// out, or other cards are combined into it. FILL TEAM fields the strongest,
// and SORT steps through the orders the cards can be laid out in.
//
// COMBINE turns the screen into a forge: the card chosen is the one that
// grows, each card marked after it is given up, and the panel says what
// level that makes before anything is done. Any card can be given up to any
// other, a copy of its unit or not; the forge shows the least of them first.
//
// A unit the player does not know is its own outline in the dark, named
// "???", and nothing else about it is told.

import Phaser from 'phaser';
import { ARCANE, BONE, CLOTH, GOLD, HIGHLIGHT, IRON, OUTLINE, VENOM } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { PACKS } from '../../data/packs';
import { SETS, UNITS } from '../../data/units';
import { cardOf, cardsOf, combine, combinePreview, fielded, holds, spare, whyNot, worth } from '../../game/cards';
import { MAX_LEVEL, RARITY, cardMult, xpToNext } from '../../game/rarity';
import { bestTeam, inTeam, known, teamSize, toggleTeam } from '../../game/rules';
import { SORT_NAME, isSort, nextSort, sortCards, unitOrder, type Sort } from '../../game/sorting';
import type { Card } from '../../game/state';
import { markSeen, seen } from '../../game/tutorial';
import { STATUS } from '../../sim/status';
import { setupCamera } from '../app';
import { hex } from '../config';
import { SHEET } from '../Sheet';
import { commit, save } from '../session';
import { OverlayHead } from '../ui/chrome';
import { RARITY_MAT } from '../ui/colors';
import { gradeBadge } from '../ui/grade';
import { Guide } from '../ui/Guide';
import { portrait, unitCard } from '../ui/UnitCard';
import { Button, label, plain, slab } from '../ui/widgets';

/** A place in the grid: a card, or a unit the player holds no card of. */
interface Tile {
  key: string;
  unit: string;
  card?: Card;
}

const COLS = 6;
const ROWS = 4;
const PITCH = 140;
const PER_PAGE = COLS * ROWS;
/** The panel on the right. */
const PX = 884;
const PY = 78;
const PW = 372;
const PH = 620;

export interface TeamData {
  /** The tile to open on: "c12" for a card, "u:knight" for a unit not held. */
  selected?: string;
  /** The card to combine others into: the screen opens as its forge. */
  forge?: number;
}

export class TeamScene extends Phaser.Scene {
  private selected = '';
  private forge = 0;
  private page = 0;
  private tiles: Tile[] = [];
  /** The cards marked to be given up, in the forge. */
  private marked = new Set<number>();
  /** True once COMBINE has been pressed and asks to be pressed again. */
  private sure = false;
  private grid: Phaser.GameObjects.GameObject[] = [];
  private detail: Phaser.GameObjects.GameObject[] = [];
  private count!: Phaser.GameObjects.Text;
  private guide!: Guide;

  constructor() {
    super('Team');
  }

  init(data: TeamData): void {
    const s = save();
    this.forge = data.forge && cardOf(s, data.forge) ? data.forge : 0;
    const first = s.team[0] ? `c${s.team[0].card}` : s.cards[0] ? `c${s.cards[0].id}` : '';
    this.selected = data.selected ?? (this.registry.get('selected') as string | undefined) ?? first;
    this.marked = new Set();
    this.sure = false;
    this.grid = [];
    this.detail = [];
  }

  create(): void {
    setupCamera(this);
    const s = save();
    const head = new OverlayHead(this, this.forge ? 'Combine' : 'Your Team', s, () => {
      // The tutorial's look at the team is over once it has been filled and shut.
      if (seen(s, 'fill')) markSeen(s, 'team');
      commit();
    });
    this.count = label(this, 250, 40, '', { size: 20, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4 });

    this.tiles = this.forge ? this.forgeTiles() : this.cardTiles();
    // The card that was open stays open, on whichever page it is.
    const at = this.tiles.findIndex((t) => t.key === this.selected);
    if (!this.forge && at < 0) this.selected = this.tiles[0]?.key ?? '';
    this.page = Math.max(0, Math.floor(Math.max(0, at) / PER_PAGE));

    this.guide = new Guide(this, 'Team');
    if (!this.forge) {
      // SORT steps to the next order and lays the cards out again from the first page.
      const sort = plain(new Button(this, 840, 38, `SORT: ${SORT_NAME[this.sortBy()]}`, () => {
        s.sort = nextSort(this.sortBy());
        commit();
        sort.setText(`SORT: ${SORT_NAME[this.sortBy()]}`);
        this.tiles = this.cardTiles();
        this.page = 0;
        this.drawGrid();
      }, { width: 196, height: 46, size: 18, mat: BONE, color: OUTLINE }));
      const fill = plain(new Button(this, 640, 38, 'FILL TEAM', () => {
        s.team = bestTeam(s);
        markSeen(s, 'fill');
        commit();
        this.redraw();
        this.guide.refresh();
      }, { width: 170, height: 46, size: 20, mat: BONE, color: OUTLINE }));
      this.guide.mark('fill', () => fill.rect);
    }
    this.guide.mark('close', () => head.close.rect);

    this.redraw();
    this.guide.refresh();
  }

  /** The order the player last chose, or by unit. */
  private sortBy(): Sort {
    const by = save().sort;
    return isSort(by) ? by : 'unit';
  }

  /** Every card held, in the order chosen, then the units no card is held of. */
  private cardTiles(): Tile[] {
    const s = save();
    const out: Tile[] = sortCards(s.cards, this.sortBy()).map((card) => ({ key: `c${card.id}`, unit: card.unit, card }));
    for (const u of Object.values(UNITS).sort(unitOrder)) {
      // Units no pack holds (a practice dummy, say) have no place here.
      if (!holds(s, u.id) && PACKS.some((p) => p.set === u.set)) out.push({ key: `u:${u.id}`, unit: u.id });
    }
    return out;
  }

  /**
   * Every other card held: the ones that can be given up first, the least of
   * them at the front, then the ones the team keeps.
   */
  private forgeTiles(): Tile[] {
    const s = save();
    const target = cardOf(s, this.forge);
    if (!target) return [];
    const kept = s.cards
      .filter((c) => c.id !== target.id && whyNot(s, target.id, c.id) !== null)
      .sort((a, b) => worth(a, target.unit) - worth(b, target.unit) || a.id - b.id);
    return [...spare(s, target.id), ...kept].map((card) => ({ key: `c${card.id}`, unit: card.unit, card }));
  }

  private redraw(): void {
    const s = save();
    this.count.setText(
      this.forge
        ? 'Mark the cards to give up. They are gone for good.'
        : `${s.team.length} of ${teamSize(s)} in the team`,
    );
    this.drawGrid();
    if (this.forge) this.showForge();
    else this.showDetail();
  }

  // ------------------------------------------------------------ the grid

  private drawGrid(): void {
    for (const o of this.grid) o.destroy();
    this.grid = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.grid.push(o);
      return o;
    };
    const s = save();
    const pages = Math.max(1, Math.ceil(this.tiles.length / PER_PAGE));
    this.page = Math.min(this.page, pages - 1);
    const shown = this.tiles.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE);

    shown.forEach((t, i) => {
      const x = 30 + 66 + (i % COLS) * PITCH;
      const y = 78 + 67 + Math.floor(i / COLS) * PITCH;
      const card = add(unitCard(this, x, y, t.unit, s, { card: t.card }));
      card.setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.press(t));

      if (this.forge && t.card) {
        const why = whyNot(s, this.forge, t.card.id);
        if (why) {
          // A card that can't be given up says so, and is dimmed.
          card.setAlpha(0.5);
          add(label(this, x, y - 8, fielded(s, t.card.id) ? 'IN TEAM' : 'KEPT', { size: 16, strokeWidth: 5 }).setDepth(51));
        } else if (this.marked.has(t.card.id)) {
          const g = add(this.add.graphics().setDepth(50));
          g.fillStyle(hex(OUTLINE), 0.3).fillRoundedRect(x - 64, y - 66, 128, 132, 14);
          g.lineStyle(6, hex(CLOTH.red.fill), 1).strokeRoundedRect(x - 67, y - 69, 134, 138, 16);
          // A cross on a red disc: this one goes. It sits where a card in the team has its tick,
          // clear of the grade and the level, which are what the choice is made by.
          const mx = x + 42;
          const my = y + 20;
          g.fillStyle(hex(OUTLINE), 1).fillCircle(mx, my, 19);
          g.fillStyle(hex(CLOTH.red.fill), 1).fillCircle(mx, my, 15);
          g.lineStyle(5, hex(HIGHLIGHT), 1);
          g.lineBetween(mx - 7, my - 7, mx + 7, my + 7);
          g.lineBetween(mx + 7, my - 7, mx - 7, my + 7);
        }
      } else if (!this.forge && t.key === this.selected) {
        const ring = add(this.add.graphics().setDepth(50));
        ring.lineStyle(5, hex(HIGHLIGHT), 1).strokeRoundedRect(x - 69, y - 70, 138, 140, 16);
      }
    });

    // How many cards there are, and the pages they fill.
    const y = 676;
    const held = this.forge ? `${this.tiles.length} other ${this.tiles.length === 1 ? 'card' : 'cards'}, the least first` : `${s.cards.length} cards`;
    add(label(this, 36, y, held, { size: 16, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4 }));
    if (pages > 1) {
      const turn = (by: number): void => {
        this.page = (this.page + by + pages) % pages;
        this.drawGrid();
        // The forge marks a page at a time, so its panel follows the page.
        if (this.forge) this.showForge();
      };
      const back = plain(new Button(this, 386, y, '', () => turn(-1), { width: 60, height: 46, mat: BONE }));
      back.root.add(this.add.image(0, -3, SHEET, 'icon/arrow').setScale(0.34).setFlipX(true));
      const on = plain(new Button(this, 534, y, '', () => turn(1), { width: 60, height: 46, mat: BONE }));
      on.root.add(this.add.image(0, -3, SHEET, 'icon/arrow').setScale(0.34));
      add(back.root);
      add(on.root);
      add(label(this, 460, y, `${this.page + 1} of ${pages}`, { size: 18, strokeWidth: 4 }));
    }
  }

  private press(t: Tile): void {
    const s = save();
    if (!this.forge) {
      this.selected = t.key;
      this.registry.set('selected', t.key);
      this.drawGrid();
      this.showDetail();
      return;
    }
    if (!t.card || whyNot(s, this.forge, t.card.id)) return;
    if (this.marked.has(t.card.id)) this.marked.delete(t.card.id);
    else this.marked.add(t.card.id);
    this.sure = false;
    sfx.play('place');
    this.drawGrid();
    this.showForge();
  }

  // ------------------------------------------------------------ the panel

  private clearDetail(): <T extends Phaser.GameObjects.GameObject>(o: T) => T {
    for (const o of this.detail) o.destroy();
    this.detail = [];
    return (o) => {
      this.detail.push(o);
      return o;
    };
  }

  /** The level and the bar of experience toward the next, at (x, y) from the panel's corner. */
  private levelBar(add: <T extends Phaser.GameObjects.GameObject>(o: T) => T, y: number, level: number, xp: number): void {
    const bw = 120;
    const share = level >= MAX_LEVEL ? 1 : Math.min(1, xp / xpToNext(level));
    const bar = add(this.add.graphics());
    bar.fillStyle(hex(OUTLINE), 1).fillRoundedRect(PX + PW - 24 - bw - 3, y - 9, bw + 6, 18, 8);
    bar.fillStyle(hex(IRON.fill), 1).fillRoundedRect(PX + PW - 24 - bw, y - 6, bw, 12, 5);
    if (share > 0.03) bar.fillStyle(hex(VENOM.fill), 1).fillRoundedRect(PX + PW - 24 - bw, y - 6, bw * share, 12, 5);
  }

  private showDetail(): void {
    const add = this.clearDetail();
    const s = save();
    const tile = this.tiles.find((t) => t.key === this.selected);
    const def = tile ? UNITS[tile.unit] : undefined;
    if (!tile || !def) return;
    const card = tile.card;
    const isKnown = !!card || known(s, def);
    const cx = PX + PW / 2;
    const g = add(this.add.graphics());
    slab(g, PX, PY, PW, PH, BONE, 22, 8);
    slab(g, PX + 14, PY + 14, PW - 28, 150, isKnown ? RARITY_MAT[def.rarity] : IRON, 16, 5);
    add(portrait(this, cx, PY + 154, def.id, 'blue', 128, !isKnown));

    const dark = { color: OUTLINE, stroke: null as null };
    if (!isKnown) {
      add(label(this, cx, PY + 200, '???', { size: 30 }));
      add(label(this, cx, PY + 260, 'You have not met this one yet.\nBeat it in battle and packs\ncan turn it over.', { size: 18, weight: 600, ...dark }));
      return;
    }

    add(label(this, cx, PY + 190, def.name, { size: def.name.length > 14 ? 24 : 28 }));
    add(label(this, cx, PY + 220, `${RARITY[def.rarity].name}  ·  ${SETS[def.set].name}`, { size: 15, weight: 600, ...dark }));

    const m = card ? cardMult(card.grade, card.level) : 1;
    if (card) {
      add(gradeBadge(this, PX + 62, PY + 252, card.grade, 26));
      add(label(this, PX + 118, PY + 252, `Level ${card.level}`, { size: 18, align: 'left', ...dark }));
      this.levelBar(add, PY + 252, card.level, card.xp);
    } else {
      const pack = PACKS.find((p) => p.set === def.set);
      add(label(this, cx, PY + 252, `Not held yet. Found in the ${pack ? pack.name : 'packs'}.`, { size: 16, weight: 600, color: CLOTH.red.shade, stroke: null }));
    }

    // Its numbers, as it would fight now.
    const stats: Array<[string, string]> = [
      ['icon/heart', `${Math.round(def.hp * m)}`],
      ['icon/sword', def.heal ? `${Math.round(def.heal.amount * m)} heal` : `${Math.round(def.damage * m)}`],
      ['icon/hourglass', `${def.attackInterval} s`],
      ['icon/range', def.range <= 1.6 ? 'melee' : `${def.range} tiles`],
      ['icon/shield', `${Math.round(def.armor)}`],
      ['icon/boot', `${def.speed}`],
    ];
    stats.forEach(([icon, text], i) => {
      const x = PX + 30 + (i % 3) * 114;
      const y = PY + 292 + Math.floor(i / 3) * 32;
      add(this.add.image(x, y, SHEET, icon).setScale(0.3));
      add(label(this, x + 18, y, text, { size: 16, weight: 600, align: 'left', ...dark }));
    });

    // What it says of itself, then its skill: each under the last, however long they run.
    let y = PY + 350;
    if (def.text) {
      const t = add(label(this, PX + 24, y, def.text, { size: 14, weight: 600, align: 'left', wrap: PW - 48, color: IRON.shade, stroke: null }).setOrigin(0, 0));
      y += t.height + 10;
    }
    if (def.skill) {
      const sk = def.skill;
      add(this.add.image(PX + 32, y + 10, SHEET, 'icon/spark').setScale(0.3));
      add(label(this, PX + 50, y + 10, `${sk.name}  (every ${sk.cooldown} s)`, { size: 17, align: 'left', color: CLOTH.blue.shade, stroke: null }));
      y += 24;
      let text = sk.text;
      if (sk.status) text += ` ${STATUS[sk.status.id].name}: ${STATUS[sk.status.id].text}`;
      add(label(this, PX + 24, y, text, { size: 14, weight: 600, align: 'left', wrap: PW - 48, ...dark }).setOrigin(0, 0));
    }

    if (!card) return;
    const on = inTeam(s, card.id);
    const full = !on && s.team.length >= teamSize(s);
    const copies = cardsOf(s, card.unit).length;
    const toggle = (): void => {
      if (toggleTeam(s, card.id)) {
        commit();
        this.redraw();
      }
    };
    const by = PY + PH - 50;
    if (s.cards.length <= 1) {
      const b = new Button(this, cx, by, on ? 'TAKE OUT' : full ? 'TEAM IS FULL' : 'PUT IN TEAM', toggle, { width: 260, height: 62, size: 24, mat: on ? CLOTH.red : GOLD });
      if (full) b.setEnabled(false);
      add(b.root);
      return;
    }
    // Any other card can be combined into this one. A copy of it can also fight beside it.
    const free = spare(s, card.id).length;
    const note =
      card.level >= MAX_LEVEL ? 'This card is at the last level.'
      : free === 0 ? 'Every other card is in your team.'
      : copies > 1 ? `You hold ${copies} of this unit.`
      : '';
    if (note) add(label(this, cx, by - 50, note, { size: 14, weight: 600, ...dark }));
    const b = new Button(this, cx - 88, by, on ? 'TAKE OUT' : full ? 'TEAM FULL' : 'PUT IN', toggle, { width: 164, height: 62, size: 22, mat: on ? CLOTH.red : GOLD });
    if (full) b.setEnabled(false);
    add(b.root);
    const c = new Button(this, cx + 88, by, 'COMBINE', () => this.scene.restart({ selected: this.selected, forge: card.id } satisfies TeamData), { width: 164, height: 62, size: 22, mat: ARCANE });
    if (free === 0) c.setEnabled(false);
    add(c.root);
  }

  /** The forge's panel: the card that grows, what the marked cards make it, and the buttons. */
  private showForge(): void {
    const add = this.clearDetail();
    const s = save();
    const target = cardOf(s, this.forge);
    if (!target) return;
    const def = UNITS[target.unit];
    const cx = PX + PW / 2;
    const g = add(this.add.graphics());
    slab(g, PX, PY, PW, PH, BONE, 22, 8);
    slab(g, PX + 14, PY + 14, PW - 28, 150, RARITY_MAT[def.rarity], 16, 5);
    add(portrait(this, cx, PY + 154, def.id, 'blue', 128));
    const dark = { color: OUTLINE, stroke: null as null };
    add(label(this, cx, PY + 190, def.name, { size: def.name.length > 14 ? 24 : 28 }));
    add(label(this, cx, PY + 220, 'This card grows. The marked ones are given up.', { size: 14, weight: 600, ...dark }));

    const marked = [...this.marked];
    const after = combinePreview(s, target.id, marked);
    add(gradeBadge(this, PX + 62, PY + 262, target.grade, 26));
    add(label(this, PX + 118, PY + 262, `Level ${target.level}`, { size: 18, align: 'left', ...dark }));
    this.levelBar(add, PY + 262, target.level, target.xp);

    if (after) {
      // What it will be: under what it is, so the two can be compared.
      add(this.add.image(PX + 62, PY + 306, SHEET, 'icon/arrow').setScale(0.34).setAngle(90));
      const up = after.to > after.from;
      add(label(this, PX + 118, PY + 306, `Level ${after.to}`, { size: 22, align: 'left', color: up ? VENOM.shade : OUTLINE, stroke: null }));
      this.levelBar(add, PY + 306, after.to, after.left);
      add(label(this, cx, PY + 350, `+${after.xp} experience from ${after.given} ${after.given === 1 ? 'card' : 'cards'}`, { size: 17, ...dark }));
      if (after.to >= MAX_LEVEL) add(label(this, cx, PY + 376, 'That is the last level. More would be wasted.', { size: 14, weight: 600, color: CLOTH.red.shade, stroke: null }));
    } else {
      const free = spare(s, target.id).length;
      const text = free === 0
        ? 'Nothing here can be given up.\nCards in your team are kept:\ntake one out first.'
        : `Press a card on the left to mark it.\nAny card will do. Another ${def.name}\ngives twice what another unit does,\nand a better grade or level gives more.`;
      add(label(this, cx, PY + 340, text, { size: 16, weight: 600, ...dark }));
    }

    // Marking is a page at a time: what is about to go is all in view before COMBINE is pressed.
    const shown = this.tiles
      .slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE)
      .filter((t) => t.card && whyNot(s, target.id, t.card.id) === null)
      .map((t) => (t.card as Card).id);
    const all = shown.length > 0 && shown.every((id) => this.marked.has(id));
    const mark = plain(new Button(this, cx, PY + PH - 196, this.marked.size > 0 && (all || shown.length === 0) ? 'CLEAR MARKS' : 'MARK THIS PAGE', () => {
      if (all || shown.length === 0) this.marked.clear();
      else for (const id of shown) this.marked.add(id);
      this.sure = false;
      this.drawGrid();
      this.showForge();
    }, { width: 240, height: 50, size: 20, mat: BONE, color: OUTLINE }));
    if (shown.length === 0 && this.marked.size === 0) mark.setEnabled(false);
    add(mark.root);

    // COMBINE asks once: the cards given up do not come back.
    const go = new Button(this, cx, PY + PH - 126, this.sure ? 'SURE? PRESS AGAIN' : 'COMBINE', () => {
      if (!this.sure) {
        this.sure = true;
        this.showForge();
        return;
      }
      const done = combine(s, target.id, marked);
      if (!done) return;
      commit();
      sfx.play(done.to > done.from ? 'levelUp' : 'buy');
      this.scene.restart({ selected: `c${target.id}` } satisfies TeamData);
    }, { width: 280, height: 66, size: this.sure ? 22 : 28, mat: this.sure ? CLOTH.red : GOLD });
    if (!after) go.setEnabled(false);
    add(go.root);

    const back = plain(new Button(this, cx, PY + PH - 50, 'BACK', () => this.scene.restart({ selected: `c${target.id}` } satisfies TeamData), { width: 200, height: 50, size: 20, mat: BONE, color: OUTLINE }));
    add(back.root);
  }
}
