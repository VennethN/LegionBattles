// The player's cards, and who of them fights. It is a side screen: it takes
// the left of the screen, and the player's half of the field stays on show
// beside it, live, so that a card put in the team is seen to walk onto it
// and can be dragged to its tile there and then (view/app.ts, DRAWER_W and
// FIELD_WINDOW; MainScene shows the field). The units and the structures
// have a screen each, opened by a button each on the main screen.
//
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
// Only cards the player holds are here. Every unit there is, the ones not
// met yet among them, is in the index (IndexScene), which INDEX opens.

import Phaser from 'phaser';
import { ARCANE, BONE, CLOTH, GOLD, HIGHLIGHT, OUTLINE, VENOM } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { UNITS, isStructure } from '../../data/units';
import { cardOf, cardsOf, combine, combinePreview, fielded, spare, whyNot, worth } from '../../game/cards';
import { MAX_LEVEL } from '../../game/rarity';
import { bestTeam, inTeam, roomFor, teamSize, toggleTeam, unitsIn, structuresIn, structuresSize } from '../../game/rules';
import { SORT_NAME, isSort, nextSort, sortCards, type Sort } from '../../game/sorting';
import type { Card } from '../../game/state';
import { DRAWER_W, FIELD_WINDOW, setupCamera } from '../app';
import { H, W, hex } from '../config';
import { SHEET } from '../Sheet';
import { commit, save } from '../session';
import { TABS_Y, TEAM_CHANGED, closeOverlay, sideOf, swapOverlay, type Side } from '../ui/chrome';
import { RARITY_MAT } from '../ui/colors';
import { gradeBadge } from '../ui/grade';
import { Guide } from '../ui/Guide';
import { portrait, unitCard } from '../ui/UnitCard';
import { PH, PW, PX, PY, levelBar, unitPanel } from '../ui/UnitPanel';
import { Button, label, plain, slab } from '../ui/widgets';

/** A place in the grid: a card. */
interface Tile {
  key: string;
  unit: string;
  card: Card;
}

// The grid: three cards across, as it has the left of the screen only and the field beside it is shown at its
// own size. A card here is its picture, its grade and its level: its name is on the panel when it is pressed,
// as a card this small has no room for a name that can be read.
const COLS = 3;
const ROWS = 5;
const CARD_W = 104;
const CARD_H = 104;
const PITCH_X = 110;
const PITCH_Y = 110;
const GRID_X = 14;
const GRID_Y = 78;
const PER_PAGE = COLS * ROWS;
/** The panel of the card on show stands right of the grid: this far left of where a whole screen has it. */
const PANEL_SHIFT = PX - 346;

export interface TeamData {
  /** The tile to open on: "c12" for the card with that number. */
  selected?: string;
  /** The card to combine others into: the screen opens as its forge. */
  forge?: number;
  /** The page to open on: the units or the structures. Left out, the page the card asked for is on, or the one last looked at. */
  side?: Side;
}

export class TeamScene extends Phaser.Scene {
  private selected = '';
  private forge = 0;
  private side: Side = 'units';
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
    // A card that is asked for by number is shown on its own page.
    const asked = data.selected ? cardOf(s, Number(data.selected.slice(1))) : undefined;
    this.side = data.side ?? (asked ? (isStructure(asked.unit) ? 'structures' : 'units') : sideOf(this));
    this.registry.set('side', this.side);
    this.marked = new Set();
    this.sure = false;
    this.grid = [];
    this.detail = [];
  }

  create(): void {
    setupCamera(this);
    const s = save();
    // The side screen's own ground: the left of the screen, which swallows presses. The rest is the field's.
    this.add.rectangle(DRAWER_W / 2, H / 2, DRAWER_W, H, hex(OUTLINE), 1).setDepth(0).setInteractive();
    const edge = this.add.graphics().setDepth(1);
    edge.fillStyle(hex(BONE.fill), 1).fillRect(DRAWER_W, 0, 4, H);
    // Round the field beside it: what it is, over it, and what can be done there, under it.
    const fw = FIELD_WINDOW;
    const frame = this.add.graphics().setDepth(1);
    frame.fillStyle(hex(OUTLINE), 1).fillRect(DRAWER_W + 4, 0, W - DRAWER_W - 4, fw.y - 6);
    frame.fillStyle(hex(OUTLINE), 1).fillRect(DRAWER_W + 4, fw.y + fw.h + 6, W - DRAWER_W - 4, H - fw.y - fw.h - 6);
    frame.fillStyle(hex(OUTLINE), 1).fillRect(DRAWER_W + 4, fw.y - 6, fw.x - DRAWER_W - 10, fw.h + 12);
    frame.fillStyle(hex(OUTLINE), 1).fillRect(fw.x + fw.w + 6, fw.y - 6, W - fw.x - fw.w - 6, fw.h + 12);
    frame.lineStyle(4, hex(BONE.fill), 1).strokeRect(fw.x - 4, fw.y - 4, fw.w + 8, fw.h + 8);
    label(this, fw.x + fw.w / 2, fw.y + fw.h + 46, 'Drag to move them.', { size: 20, weight: 600, color: HIGHLIGHT, strokeWidth: 4 }).setDepth(2);

    if (this.forge) {
      label(this, 20, 36, 'Combine', { size: 30, align: 'left' }).setDepth(8000);
      label(this, 170, 39, 'Mark cards to give up.', { size: 19, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4 }).setDepth(8000);
    } else {
      // The two screens of cards are one press apart: the one that is open is lit, and the other is a button.
      // The owner, of 24 November 2026: "Make it so i can change between structure and unit on each other's ui (quickswitch)".
      const tab = (x: number, w: number, text: string, side: 'units' | 'structures'): void => {
        const on = this.side === side;
        const b = new Button(this, x, 37, text, () => {
          if (!on) this.scene.restart({ side } satisfies TeamData);
        }, { width: w, height: 46, size: 18, mat: on ? GOLD : BONE, color: on ? undefined : OUTLINE }).setDepth(8000);
        if (!on) plain(b);
      };
      tab(70, 112, 'UNITS', 'units');
      tab(210, 160, 'STRUCTURES', 'structures');
    }
    const close = new Button(this, DRAWER_W - 62, 37, 'CLOSE', () => {
      commit();
      closeOverlay(this);
    }, { width: 108, height: 48, size: 20, mat: CLOTH.red }).setDepth(8000);
    // Over the field beside the cards: how many stand on it of how many may.
    this.count = label(this, fw.x + fw.w / 2, fw.y - 36, '', { size: 22, strokeWidth: 5 }).setDepth(2);

    this.tiles = this.forge ? this.forgeTiles() : this.cardTiles();
    // The card that was open stays open, on whichever page it is.
    const at = this.tiles.findIndex((t) => t.key === this.selected);
    if (!this.forge && at < 0) this.selected = this.tiles[0]?.key ?? '';
    this.page = Math.max(0, Math.floor(Math.max(0, at) / PER_PAGE));

    this.guide = new Guide(this, 'Team');
    if (!this.forge) {
      // SORT steps to the next order and lays the cards out again from the first page.
      const sort = plain(new Button(this, 532, 38, `SORT: ${SORT_NAME[this.sortBy()]}`, () => {
        s.sort = nextSort(this.sortBy());
        commit();
        sort.setText(`SORT: ${SORT_NAME[this.sortBy()]}`);
        this.tiles = this.cardTiles();
        this.page = 0;
        this.drawGrid();
      }, { width: 150, height: 46, size: 17, mat: BONE, color: OUTLINE }));
      const fill = plain(new Button(this, 374, 38, 'FILL TEAM', () => {
        // Into the team's own list: the board holds that list, and writes a drag into it.
        const best = bestTeam(s);
        s.team.length = 0;
        for (const p of best) s.team.push(p);
        commit();
        this.game.events.emit(TEAM_CHANGED);
        this.redraw();
        this.guide.refresh();
      }, { width: 154, height: 46, size: 19, mat: BONE, color: OUTLINE }));
      // What the tour of the team points at.
      this.guide.mark('fill', () => fill.rect);
    }
    this.guide.mark('close', () => close.rect);
    // What the tour of the structures points at: the cards on the page.
    this.guide.mark('grid', () => ({ x: GRID_X - 6, y: GRID_Y - 6, w: COLS * PITCH_X + 6, h: ROWS * PITCH_Y + 6 }));

    this.redraw();
    this.guide.refresh({ page: this.side });
  }

  /** The order the player last chose, or by unit. */
  private sortBy(): Sort {
    const by = save().sort;
    return isSort(by) ? by : 'unit';
  }

  /** Every card held that belongs on this page, in the order chosen. */
  private cardTiles(): Tile[] {
    const mine = save().cards.filter((c) => isStructure(c.unit) === (this.side === 'structures'));
    return sortCards(mine, this.sortBy()).map((card) => ({ key: `c${card.id}`, unit: card.unit, card }));
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
    this.count.setText(`${unitsIn(s.team)} OF ${teamSize(s)} UNITS  ·  ${structuresIn(s.team)} OF ${structuresSize(s)} STRUCTURES`);
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
      const x = GRID_X + CARD_W / 2 + (i % COLS) * PITCH_X;
      const y = GRID_Y + CARD_H / 2 + Math.floor(i / COLS) * PITCH_Y;
      const card = add(unitCard(this, x, y, t.unit, s, { card: t.card, width: CARD_W, height: CARD_H, bare: true }));
      card.setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.press(t));

      if (this.forge && t.card) {
        const why = whyNot(s, this.forge, t.card.id);
        if (why) {
          // A card that can't be given up says so, and is dimmed.
          card.setAlpha(0.5);
          add(label(this, x, y + 4, fielded(s, t.card.id) ? 'IN TEAM' : 'KEPT', { size: 18, strokeWidth: 5 }).setDepth(51));
        } else if (this.marked.has(t.card.id)) {
          const g = add(this.add.graphics().setDepth(50));
          g.fillStyle(hex(OUTLINE), 0.3).fillRoundedRect(x - CARD_W / 2, y - CARD_H / 2, CARD_W, CARD_H, 14);
          g.lineStyle(6, hex(CLOTH.red.fill), 1).strokeRoundedRect(x - CARD_W / 2 - 3, y - CARD_H / 2 - 3, CARD_W + 6, CARD_H + 6, 16);
          // A cross on a red disc: this one goes. It sits where a card in the team has its tick,
          // clear of the grade and the level, which are what the choice is made by.
          const mx = x + CARD_W / 2 - 22;
          const my = y + 12;
          g.fillStyle(hex(OUTLINE), 1).fillCircle(mx, my, 19);
          g.fillStyle(hex(CLOTH.red.fill), 1).fillCircle(mx, my, 15);
          g.lineStyle(5, hex(HIGHLIGHT), 1);
          g.lineBetween(mx - 7, my - 7, mx + 7, my + 7);
          g.lineBetween(mx + 7, my - 7, mx - 7, my + 7);
        }
      } else if (!this.forge && t.key === this.selected) {
        const ring = add(this.add.graphics().setDepth(50));
        ring.lineStyle(5, hex(HIGHLIGHT), 1).strokeRoundedRect(x - CARD_W / 2 - 4, y - CARD_H / 2 - 4, CARD_W + 8, CARD_H + 8, 16);
      }
    });

    if (shown.length === 0 && !this.forge) {
      // An empty screen says where its cards come from.
      const none = this.side === 'structures' ? "No structures yet.\nThe Builder's Pack has them." : 'No units yet.\nOpen a pack.';
      add(label(this, GRID_X + (COLS * PITCH_X) / 2, 300, none, { size: 20, weight: 600, color: HIGHLIGHT, strokeWidth: 4, wrap: COLS * PITCH_X - 10 }));
    }

    // Under the grid: how many are fielded (drawn once, above), the index of every unit there is, and the pages.
    const y = TABS_Y;
    if (!this.forge) {
      const index = plain(new Button(this, 64, y, 'INDEX', () => swapOverlay(this, 'Index'), { width: 100, height: 46, size: 18, mat: BONE, color: OUTLINE }));
      add(index.root);
    }
    if (pages > 1) {
      const turn = (by: number): void => {
        this.page = (this.page + by + pages) % pages;
        this.drawGrid();
        // The forge marks a page at a time, so its panel follows the page.
        if (this.forge) this.showForge();
      };
      const back = plain(new Button(this, 172, y, '', () => turn(-1), { width: 56, height: 46, mat: BONE }));
      back.root.add(this.add.image(0, -3, SHEET, 'icon/arrow').setScale(0.3).setFlipX(true));
      const on = plain(new Button(this, 308, y, '', () => turn(1), { width: 56, height: 46, mat: BONE }));
      on.root.add(this.add.image(0, -3, SHEET, 'icon/arrow').setScale(0.3));
      add(back.root);
      add(on.root);
      add(label(this, 240, y, `${this.page + 1}/${pages}`, { size: 19, strokeWidth: 4 }));
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

  /** Moves everything of the panel to where this screen has it: it is drawn where a whole screen would have it. */
  private place(): void {
    for (const o of this.detail) (o as unknown as { x: number }).x -= PANEL_SHIFT;
  }

  private showDetail(): void {
    this.drawDetail();
    this.place();
  }

  private showForge(): void {
    this.drawForge();
    this.place();
  }

  private drawDetail(): void {
    const add = this.clearDetail();
    const s = save();
    const tile = this.tiles.find((t) => t.key === this.selected);
    const card = tile?.card;
    const def = card ? UNITS[card.unit] : undefined;
    if (!card || !def) return;
    unitPanel(this, add, def, { card, known: true });
    const cx = PX + PW / 2;
    const dark = { color: OUTLINE, stroke: null as null };

    const on = inTeam(s, card.id);
    // A structure stands in a place of its own, and there are none until the line has been cleared a way.
    const built = isStructure(card.unit);
    const full = !on && !roomFor(s, card.unit);
    const noPlace = built && structuresSize(s) === 0;
    const copies = cardsOf(s, card.unit).length;
    const toggle = (): void => {
      if (toggleTeam(s, card.id)) {
        commit();
        // The field beside this shows it at once.
        this.game.events.emit(TEAM_CHANGED);
        this.redraw();
      }
    };
    const by = PY + PH - 50;
    if (s.cards.length <= 1) {
      const b = new Button(this, cx, by, on ? 'TAKE OUT' : noPlace ? 'NO PLACE YET' : full ? (built ? 'PLACES ARE FULL' : 'TEAM IS FULL') : built ? 'PLACE IT' : 'PUT IN TEAM', toggle, { width: 260, height: 62, size: 24, mat: on ? CLOTH.red : GOLD });
      if (full) b.setEnabled(false);
      add(b.root);
      return;
    }
    // Any other card can be combined into this one. A copy of it can also fight beside it.
    const free = spare(s, card.id).length;
    const note =
      noPlace ? 'No place for a structure yet.'
      : card.level >= MAX_LEVEL ? 'At the last level.'
      : free === 0 ? 'Every other card is in your team.'
      : copies > 1 ? `You hold ${copies} of this unit.`
      : '';
    if (note) add(label(this, cx, by - 48, note, { size: 17, weight: 600, ...dark }));
    const b = new Button(this, cx - 88, by, on ? 'TAKE OUT' : noPlace ? 'NO PLACE' : full ? (built ? 'ALL FULL' : 'TEAM FULL') : built ? 'PLACE IT' : 'PUT IN', toggle, { width: 164, height: 62, size: 22, mat: on ? CLOTH.red : GOLD });
    if (full) b.setEnabled(false);
    add(b.root);
    const c = new Button(this, cx + 88, by, 'COMBINE', () => this.scene.restart({ selected: this.selected, forge: card.id } satisfies TeamData), { width: 164, height: 62, size: 22, mat: ARCANE });
    if (free === 0) c.setEnabled(false);
    add(c.root);
  }

  /** The forge's panel: the card that grows, what the marked cards make it, and the buttons. */
  private drawForge(): void {
    const add = this.clearDetail();
    const s = save();
    const target = cardOf(s, this.forge);
    if (!target) return;
    const def = UNITS[target.unit];
    const cx = PX + PW / 2;
    const g = add(this.add.graphics());
    slab(g, PX, PY, PW, PH, BONE, 22, 8);
    slab(g, PX + 14, PY + 14, PW - 28, 112, RARITY_MAT[def.rarity], 16, 5);
    const pic = add(portrait(this, cx, PY + 118, def.id, 'blue', 94));
    if (pic.displayWidth > PW - 60) pic.setScale((pic.scaleX * (PW - 60)) / pic.displayWidth);
    const dark = { color: OUTLINE, stroke: null as null };
    add(label(this, cx, PY + 150, def.name, { size: def.name.length > 14 ? 24 : 28 }));
    add(label(this, cx, PY + 180, 'This card grows.', { size: 18, weight: 600, ...dark }));

    const marked = [...this.marked];
    const after = combinePreview(s, target.id, marked);
    add(gradeBadge(this, PX + 46, PY + 218, target.grade, 26));
    add(label(this, PX + 84, PY + 218, `Level ${target.level}`, { size: 19, align: 'left', ...dark }));
    levelBar(this, add, PY + 218, target.level, target.xp);

    if (after) {
      // What it will be: under what it is, so the two can be compared.
      add(this.add.image(PX + 46, PY + 262, SHEET, 'icon/arrow').setScale(0.34).setAngle(90));
      const up = after.to > after.from;
      add(label(this, PX + 84, PY + 262, `Level ${after.to}`, { size: 22, align: 'left', color: up ? VENOM.shade : OUTLINE, stroke: null }));
      levelBar(this, add, PY + 262, after.to, after.left);
      add(label(this, cx, PY + 306, `+${after.xp} XP from ${after.given} ${after.given === 1 ? 'card' : 'cards'}`, { size: 19, ...dark }));
      if (after.to >= MAX_LEVEL) add(label(this, cx, PY + 336, 'The last level: more is wasted.', { size: 17, weight: 600, color: CLOTH.red.shade, stroke: null }));
    } else {
      const free = spare(s, target.id).length;
      const text = free === 0
        ? 'Nothing here can be given up.\nCards in your team are kept:\ntake one out first.'
        : `Mark cards on the left.\nAnother ${def.name} gives double.\nBetter grades and levels give more.`;
      add(label(this, cx, PY + 300, text, { size: 18, weight: 600, wrap: PW - 40, ...dark }));
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
      this.game.events.emit(TEAM_CHANGED);
      sfx.play(done.to > done.from ? 'levelUp' : 'buy');
      this.scene.restart({ selected: `c${target.id}` } satisfies TeamData);
    }, { width: 280, height: 66, size: this.sure ? 22 : 28, mat: this.sure ? CLOTH.red : GOLD });
    if (!after) go.setEnabled(false);
    add(go.root);

    const back = plain(new Button(this, cx, PY + PH - 50, 'BACK', () => this.scene.restart({ selected: `c${target.id}` } satisfies TeamData), { width: 200, height: 50, size: 20, mat: BONE, color: OUTLINE }));
    add(back.root);
  }
}
