// The hall of the dungeons, and the hall of the raids: one screen, opened
// on one or the other. They are two things, each with a button of its own
// on the main screen, and the raids' is not there until a raid is open. A
// tile to each place: its lord's likeness, what it is, its five tiers, what
// it pays, and ENTER.
//
// A place the player has not opened is its lord's outline in the dark, named
// "???", and says only at which stage it opens. A tier that is not open is
// a lock.

import Phaser from 'phaser';
import { BONE, CLOTH, HIGHLIGHT, IRON, OUTLINE } from '../../art/kit/palette';
import { DUNGEONS, RAIDS, RESERVES, TIER_MARKS, type DungeonDef, type RaidDef } from '../../data/expeditions';
import { LANDS } from '../../data/lands';
import { stageSaid } from '../../data/stages';
import { dungeonPrize, placeOpen, raidPrize, tierOpen, tierStage, tiersCleared, topTier } from '../../game/expeditions';
import { setupCamera } from '../app';
import { CARDS, SHEET } from '../Sheet';
import { commit, save } from '../session';
import { OverlayHead } from '../ui/chrome';
import { DIFFICULTY_MAT, LAND_MAT } from '../ui/colors';
import { gradeBadge } from '../ui/grade';
import { Guide } from '../ui/Guide';
import { portrait } from '../ui/UnitCard';
import { Button, label, plain, slab } from '../ui/widgets';
import type { VentureData } from './VentureScene';

type Place = DungeonDef | RaidDef;

export interface HallData {
  kind?: 'dungeon' | 'raid';
}

export class HallScene extends Phaser.Scene {
  /** The tier each place's tile shows, by the place's id. */
  private picked: Record<string, number> = {};
  /** Which hall this is: the dungeons', or the raids'. */
  private kind: 'dungeon' | 'raid' = 'dungeon';
  /** The tutorial on this screen. The walks look at it (scripts/tours.mjs). */
  guide!: Guide;

  constructor() {
    super('Hall');
  }

  init(data: HallData): void {
    this.kind = data?.kind ?? this.kind;
  }

  create(): void {
    setupCamera(this);
    const s = save();
    const raids = this.kind === 'raid';
    const head = new OverlayHead(this, raids ? 'Raids' : 'Dungeons', s, () => commit());
    label(this, 250, 40, raids ? 'One long fight with a boss.' : 'Several floors, no healing between them.', {
      size: 19, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4,
    });
    const pitch = 414;
    const row = 346;
    const places: readonly Place[] = raids ? RAIDS : DUNGEONS;
    places.forEach((p, i) => this.tile(this.kind, p, 226 + i * pitch, row));

    // What the tours of this hall point at: the first place that is open, and its five difficulties.
    const guide = new Guide(this, 'Hall');
    this.guide = guide;
    const first = Math.max(0, places.findIndex((p) => placeOpen(s, p)));
    const tile = { x: 28 + first * pitch, y: row - TILE_H / 2, w: 396, h: TILE_H };
    guide.mark('dungeon', () => (raids ? null : tile));
    guide.mark('raid', () => (raids ? tile : null));
    guide.mark('tiers', () => (placeOpen(s, places[first]) ? { x: tile.x + 158, y: tile.y + 131, w: 226, h: 38 } : null));
    guide.mark('close', () => head.close.rect);
    guide.refresh();
  }

  private tile(kind: 'dungeon' | 'raid', place: Place, x: number, y: number): void {
    const s = save();
    const w = 396;
    const h = TILE_H;
    const open = placeOpen(s, place);
    const land = LANDS[place.land];
    const boss = 'floors' in place ? place.floors[place.floors.length - 1].enemies.find((e) => e.rank === 'boss')?.unit ?? '' : place.boss.unit;
    const g = this.add.graphics();
    slab(g, x - w / 2, y - h / 2, w, h, open ? BONE : IRON, 20, 8);
    // The gate its lord stands in, in the color of its land.
    slab(g, x - w / 2 + 14, y - h / 2 + 14, 130, 150, open ? LAND_MAT[land.ground] : { fill: IRON.shade, shade: IRON.shade }, 14, 5);
    portrait(this, x - w / 2 + 79, y - h / 2 + 154, boss, 'red', 118, !open);
    const tx = x - w / 2 + 158;
    const dark = { color: OUTLINE, stroke: null as null };
    label(this, tx, y - h / 2 + 26, kind === 'dungeon' ? 'DUNGEON' : 'RAID', { size: 18, align: 'left', color: open ? CLOTH.red.shade : HIGHLIGHT, stroke: null });

    if (!open) {
      label(this, tx, y - h / 2 + 62, '???', { size: 28, align: 'left' });
      this.add.image(tx + 20, y - h / 2 + 118, SHEET, 'icon/lock').setScale(0.5);
      label(this, x, y + 60, `Clear ${stageSaid(place.after)} to open it.`, { size: 19, weight: 600, color: HIGHLIGHT, strokeWidth: 4, wrap: w - 30 });
      return;
    }

    label(this, tx, y - h / 2 + 54, place.name, { size: place.name.length > 16 ? 19 : 22, align: 'left' });
    // Two things about it, a line each, and short: they stand beside its lord in a tile a third of the screen wide.
    const facts = 'floors' in place
      ? [`${place.floors.length} floors, no healing.`, `${RESERVES} reserves.`]
      : [`${place.seconds} seconds.`, 'The lord calls more.'];
    label(this, tx, y - h / 2 + 72, facts.join('\n'), { size: 18, weight: 600, align: 'left', ...dark }).setOrigin(0, 0).setLineSpacing(-2);

    // The five difficulties: the ones that are open can be picked, the rest are locks. A button has room
    // for a number; the name of the one picked is said under them, on its color.
    const top = topTier(s, kind, place);
    const tier = Math.min(this.picked[place.id] ?? top, top);
    const done = tiersCleared(s, kind, place.id);
    TIER_MARKS.forEach((_name, t) => {
      const bx = tx + 22 + t * 45;
      const by = y - h / 2 + 150;
      if (!tierOpen(s, kind, place, t)) {
        const lock = this.add.graphics();
        slab(lock, bx - 20, by - 17, 40, 34, IRON, 8, 4);
        this.add.image(bx, by - 2, SHEET, 'icon/lock').setScale(0.24);
        return;
      }
      const b = new Button(this, bx, by, String(t + 1), () => {
        this.picked[place.id] = t;
        this.scene.restart();
      }, { width: 40, height: 34, size: 19, mat: t === tier ? DIFFICULTY_MAT[t] : BONE, color: t === tier ? undefined : OUTLINE });
      if (t !== tier) plain(b);
      if (t < done) this.add.image(bx + 14, by - 16, SHEET, 'icon/check').setScale(0.2);
    });

    // What its enemies stand at on the tier picked, and what it pays.
    const at = tierStage(place.land, tier);
    const prize = 'floors' in place ? dungeonPrize(place, tier) : raidPrize(place, tier);
    // Two rows: who is in there, and what it pays. The pack's picture says whose pack it is; under the two,
    // when it is paid, which is where a dungeon and a raid differ.
    const py = y - h / 2 + 196;
    const name = label(this, x - w / 2 + 20, py, TIER_MARKS[tier], { size: 19, align: 'left', ...dark });
    // Room on both sides of the badge: the better grades have wings.
    gradeBadge(this, x - w / 2 + 52 + name.width, py, at.grade, 21);
    label(this, x - w / 2 + 84 + name.width, py, `LV ${at.level + ('floors' in place ? 1 : 2)}`, { size: 18, weight: 600, align: 'left', ...dark });
    const py2 = py + 30;
    this.add.image(x - w / 2 + 32, py2, SHEET, 'icon/coin').setScale(0.3);
    const coins = label(this, x - w / 2 + 50, py2, String(prize.coins), { size: 19, align: 'left', ...dark });
    this.add.image(x - w / 2 + 82 + coins.width, py2, CARDS, `pack/${prize.pack.split('@')[0]}`).setScale(0.14);
    const packs = label(this, x - w / 2 + 102 + coins.width, py2, `x${prize.packs}`, { size: 19, align: 'left', ...dark });
    label(this, x - w / 2 + 118 + coins.width + packs.width, py2, 'floors' in place ? 'on the last floor' : 'every win', { size: 18, weight: 600, align: 'left', color: IRON.shade, stroke: null });

    new Button(this, x, y + h / 2 - 44, 'ENTER', () => {
      commit();
      // The board of the line gives way to the place's own.
      this.scene.stop('Main');
      this.scene.start('Venture', { kind, id: place.id, tier } satisfies VentureData);
    }, { width: 220, height: 54, size: 24 });
  }
}

/** How tall a place's tile is. */
const TILE_H = 340;
