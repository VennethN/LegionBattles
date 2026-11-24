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
// Only cards the player holds are here. Every unit there is, the ones not
// met yet among them, is in the index (IndexScene), which INDEX opens.

import Phaser from 'phaser';
import { ARCANE, BONE, CLOTH, GOLD, HIGHLIGHT, OUTLINE, VENOM } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { UNITS, isStructure } from '../../data/units';
import { cardOf, cardsOf, combine, combinePreview, fielded, spare, whyNot, worth } from '../../game/cards';
import { MAX_LEVEL } from '../../game/rarity';
import { STRUCTURES_AT, bestTeam, inTeam, roomFor, teamSize, toggleTeam, unitsIn, structuresIn, structuresSize } from '../../game/rules';
import { SORT_NAME, isSort, nextSort, sortCards, type Sort } from '../../game/sorting';
import type { Card } from '../../game/state';
import { markSeen, seen } from '../../game/tutorial';
import { setupCamera } from '../app';
import { hex } from '../config';
import { SHEET } from '../Sheet';
import { commit, save } from '../session';
import { OverlayHead, TABS_END, TABS_Y, TURN_X, sideOf, sideTabs, swapOverlay, type Side } from '../ui/chrome';
import { RARITY_MAT } from '../ui/colors';
import { gradeBadge } from '../ui/grade';
import { Guide } from '../ui/Guide';
import { portrait, unitCard } from '../ui/UnitCard';
import { PH, PW, PX, PY, levelBar, unitPanel } from '../ui/UnitPanel';
import { Button, label, plain, slab } from '../ui/widgets';

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** A place in the grid: a card. */
interface Tile {
  key: string;
  unit: string;
  card: Card;
}

const COLS = 6;
const ROWS = 4;
const PITCH = 140;
const PER_PAGE = COLS * ROWS;

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
    const head = new OverlayHead(this, this.forge ? 'Combine' : this.side === 'structures' ? 'Structures' : 'Your Team', s, () => {
      // The tutorial's look at the team is over once it has been filled and shut.
      if (seen(s, 'fill')) markSeen(s, 'team');
      commit();
    });
    this.count = label(this, 250, 40, '', { size: 18, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4 });
    // The units and the structures have a page each. In the forge there is one list: any card can go into any.
    if (!this.forge) sideTabs(this, this.side, (side) => this.scene.restart({ side } satisfies TeamData));

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
        // Into the team's own list: the board holds that list, and writes a drag into it.
        const best = bestTeam(s);
        s.team.length = 0;
        for (const p of best) s.team.push(p);
        markSeen(s, 'fill');
        commit();
        this.redraw();
        this.guide.refresh();
      }, { width: 170, height: 46, size: 20, mat: BONE, color: OUTLINE }));
      this.guide.mark('fill', () => fill.rect);
    }
    this.guide.mark('close', () => head.close.rect);
    // What the tour of the structures points at: their tab, and the cards on the page.
    this.guide.mark('tab:structures', () => (this.forge ? null : { x: 164, y: TABS_Y - 23, w: 176, h: 46 }));
    this.guide.mark('grid', () => ({ x: 26, y: 74, w: 848, h: 568 }));

    this.redraw();
    this.guide.refresh();
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
    this.count.setText(
      this.forge
        ? 'Mark the cards to give up. They are gone for good.'
        : this.side === 'structures'
          ? `${structuresIn(s.team)} of ${structuresSize(s)} placed  ·  ${plural(this.tiles.length, 'card')}`
          : `${unitsIn(s.team)} of ${teamSize(s)} in the team  ·  ${plural(this.tiles.length, 'card')}`,
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

    if (shown.length === 0 && !this.forge) {
      // The structures' page before there is anything on it says what it is for.
      const none = structuresSize(s) === 0
        ? `Structures are towers, walls and traps.\nThey stand in places of their own, beside your team.\nClear stage ${STRUCTURES_AT[0]} for the first.`
        : "You hold no structures yet.\nThe Builder's Pack has them, and each land's pack has its own.";
      add(label(this, 30 + (COLS * PITCH) / 2, 300, none, { size: 20, weight: 600, color: HIGHLIGHT, strokeWidth: 4 }));
    }

    // In the forge, how many cards there are to choose from; elsewhere the tabs stand there, and the index beside them.
    const y = TABS_Y;
    if (this.forge) {
      add(label(this, 36, y, `${this.tiles.length} other ${this.tiles.length === 1 ? 'card' : 'cards'}, the least first`, { size: 16, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4 }));
    } else {
      // Every unit there is, the ones not held among them, is on a page of its own.
      const index = plain(new Button(this, TABS_END + 68, y, 'INDEX', () => swapOverlay(this, 'Index'), { width: 116, height: 46, size: 18, mat: BONE, color: OUTLINE }));
      add(index.root);
    }
    if (pages > 1) {
      const turn = (by: number): void => {
        this.page = (this.page + by + pages) % pages;
        this.drawGrid();
        // The forge marks a page at a time, so its panel follows the page.
        if (this.forge) this.showForge();
      };
      const back = plain(new Button(this, TURN_X[0], y, '', () => turn(-1), { width: 60, height: 46, mat: BONE }));
      back.root.add(this.add.image(0, -3, SHEET, 'icon/arrow').setScale(0.34).setFlipX(true));
      const on = plain(new Button(this, TURN_X[2], y, '', () => turn(1), { width: 60, height: 46, mat: BONE }));
      on.root.add(this.add.image(0, -3, SHEET, 'icon/arrow').setScale(0.34));
      add(back.root);
      add(on.root);
      add(label(this, TURN_X[1], y, `${this.page + 1} of ${pages}`, { size: 18, strokeWidth: 4 }));
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

  private showDetail(): void {
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
      noPlace ? `Clear stage ${STRUCTURES_AT[0]} for a place to stand it.`
      : card.level >= MAX_LEVEL ? 'This card is at the last level.'
      : free === 0 ? 'Every other card is in your team.'
      : copies > 1 ? `You hold ${copies} of this unit.`
      : '';
    if (note) add(label(this, cx, by - 50, note, { size: 14, weight: 600, ...dark }));
    const b = new Button(this, cx - 88, by, on ? 'TAKE OUT' : noPlace ? 'NO PLACE' : full ? (built ? 'ALL FULL' : 'TEAM FULL') : built ? 'PLACE IT' : 'PUT IN', toggle, { width: 164, height: 62, size: 22, mat: on ? CLOTH.red : GOLD });
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
    levelBar(this, add, PY + 262, target.level, target.xp);

    if (after) {
      // What it will be: under what it is, so the two can be compared.
      add(this.add.image(PX + 62, PY + 306, SHEET, 'icon/arrow').setScale(0.34).setAngle(90));
      const up = after.to > after.from;
      add(label(this, PX + 118, PY + 306, `Level ${after.to}`, { size: 22, align: 'left', color: up ? VENOM.shade : OUTLINE, stroke: null }));
      levelBar(this, add, PY + 306, after.to, after.left);
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
