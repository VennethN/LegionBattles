// The index: every unit there is, in the order of a book. A unit the player
// holds a card of, or has beaten, is shown as it is. One not met yet is its
// own outline in the dark, named "???", and nothing else about it is told:
// not its name, not its tier, not where it is from.
//
// It opens from the screen of units, which lists only the cards held. Like
// that screen it has a page for units and a page for structures.

import Phaser from 'phaser';
import { BONE, HIGHLIGHT, OUTLINE } from '../../art/kit/palette';
import { PACKS } from '../../data/packs';
import { UNITS, isStructure, type UnitInfo } from '../../data/units';
import { cardsOf, holds } from '../../game/cards';
import { known, packHolds } from '../../game/rules';
import { unitOrder } from '../../game/sorting';
import { setupCamera } from '../app';
import { hex } from '../config';
import { SHEET } from '../Sheet';
import { commit, save } from '../session';
import { OverlayHead, TABS_END, TABS_Y, TURN_X, sideOf, sideTabs, swapOverlay, type Side } from '../ui/chrome';
import { unitCard } from '../ui/UnitCard';
import { unitPanel } from '../ui/UnitPanel';
import { Button, label, plain } from '../ui/widgets';

const COLS = 6;
const ROWS = 4;
const PITCH = 140;
const PER_PAGE = COLS * ROWS;

/**
 * Every unit there is a card of, in the order of a book: the units, or the
 * structures, as the page is. That is whatever a pack can turn over, and
 * the prizes the rewards give by name. A unit that is no card (a practice
 * dummy, say) has no place here.
 */
export function indexUnits(side: Side = 'units'): UnitInfo[] {
  return Object.values(UNITS)
    .filter((u) => isStructure(u.id) === (side === 'structures') && (!!u.prize || PACKS.some((p) => packHolds(p, u))))
    .sort(unitOrder);
}

export class IndexScene extends Phaser.Scene {
  private units: UnitInfo[] = [];
  private selected = '';
  private page = 0;
  private grid: Phaser.GameObjects.GameObject[] = [];
  private detail: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Index');
  }

  init(): void {
    this.grid = [];
    this.detail = [];
    this.page = 0;
  }

  create(): void {
    setupCamera(this);
    const s = save();
    new OverlayHead(this, 'Index', s, () => commit());
    const side = sideOf(this);
    this.units = indexUnits(side);
    const found = this.units.filter((u) => known(s, u)).length;
    label(this, 170, 40, `${found} of ${this.units.length} ${side === 'structures' ? 'structures' : 'units'} met`, { size: 20, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4 });
    sideTabs(this, side, () => this.scene.restart());
    // Back to the cards held, where the index was opened from: it stands where INDEX does there.
    plain(new Button(this, TABS_END + 80, TABS_Y, 'MY CARDS', () => swapOverlay(this, 'Team'), { width: 140, height: 46, size: 18, mat: BONE, color: OUTLINE }));
    // It opens on the first unit the player knows, so that the panel has something to say.
    this.selected = (this.units.find((u) => known(s, u)) ?? this.units[0])?.id ?? '';
    this.drawGrid();
    this.showDetail();
  }

  private drawGrid(): void {
    for (const o of this.grid) o.destroy();
    this.grid = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.grid.push(o);
      return o;
    };
    const s = save();
    const pages = Math.max(1, Math.ceil(this.units.length / PER_PAGE));
    this.page = Math.min(this.page, pages - 1);
    this.units.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE).forEach((u, i) => {
      const x = 30 + 66 + (i % COLS) * PITCH;
      const y = 78 + 67 + Math.floor(i / COLS) * PITCH;
      // A unit the player holds stands at full strength; one only met in battle is paler.
      const card = add(unitCard(this, x, y, u.id, s, { held: holds(s, u.id) }));
      card.setInteractive({ useHandCursor: true });
      card.on('pointerup', () => {
        this.selected = u.id;
        this.drawGrid();
        this.showDetail();
      });
      if (u.id === this.selected) {
        const ring = add(this.add.graphics().setDepth(50));
        ring.lineStyle(5, hex(HIGHLIGHT), 1).strokeRoundedRect(x - 69, y - 70, 138, 140, 16);
      }
    });
    if (pages > 1) {
      const y = TABS_Y;
      const turn = (by: number): void => {
        this.page = (this.page + by + pages) % pages;
        this.drawGrid();
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

  private showDetail(): void {
    for (const o of this.detail) o.destroy();
    this.detail = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.detail.push(o);
      return o;
    };
    const s = save();
    const def = UNITS[this.selected];
    if (!def) return;
    const held = cardsOf(s, def.id).length;
    const pack = PACKS.find((p) => packHolds(p, def));
    const from = pack ? `Found in the ${pack.name}.` : '';
    // The numbers are those of a card fresh from its pack, at the worst grade.
    unitPanel(this, add, def, {
      known: known(s, def),
      line: held > 0 ? `You hold ${held}. ${from}` : `Not held. ${from}`,
    });
  }
}
