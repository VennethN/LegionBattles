// The hall of dungeons and raids. It opens over the board. A tile to each
// place: its lord's likeness, what it is, its five tiers, what it pays, and
// ENTER.
//
// A place the player has not opened is its lord's outline in the dark, named
// "???", and says only at which stage it opens. A tier that is not open is
// a lock.

import Phaser from 'phaser';
import { BONE, CLOTH, HIGHLIGHT, IRON, OUTLINE } from '../../art/kit/palette';
import { DUNGEONS, RAIDS, RESERVES, TIER_MARKS, type DungeonDef, type RaidDef } from '../../data/expeditions';
import { LANDS } from '../../data/lands';
import { packById } from '../../data/packs';
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

export class HallScene extends Phaser.Scene {
  /** The tier each place's tile shows, by the place's id. */
  private picked: Record<string, number> = {};
  /** The tutorial on this screen. The walks look at it (scripts/tours.mjs). */
  guide!: Guide;

  constructor() {
    super('Hall');
  }

  create(): void {
    setupCamera(this);
    const s = save();
    const head = new OverlayHead(this, 'Dungeons and Raids', s, () => commit());
    label(this, 400, 40, 'A dungeon: floors where nothing heals. A raid: one long battle.', { size: 16, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4 });
    const pitch = 414;
    DUNGEONS.forEach((d, i) => this.tile('dungeon', d, 226 + i * pitch, 232));
    RAIDS.forEach((r, i) => this.tile('raid', r, 226 + i * pitch, 548));

    // What the tour of this hall points at: the first dungeon, the first raid, and the dungeon's five difficulties.
    const guide = new Guide(this, 'Hall');
    this.guide = guide;
    guide.mark('dungeon', () => ({ x: 28, y: 82, w: 396, h: 300 }));
    guide.mark('raid', () => ({ x: 28, y: 398, w: 396, h: 300 }));
    guide.mark('tiers', () => (DUNGEONS[0] && placeOpen(s, DUNGEONS[0]) ? { x: 186, y: 201, w: 226, h: 38 } : null));
    guide.mark('close', () => head.close.rect);
    guide.refresh();
  }

  private tile(kind: 'dungeon' | 'raid', place: Place, x: number, y: number): void {
    const s = save();
    const w = 396;
    const h = 300;
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
    label(this, tx, y - h / 2 + 22, kind === 'dungeon' ? 'DUNGEON' : 'RAID', { size: 13, align: 'left', color: open ? CLOTH.red.shade : HIGHLIGHT, stroke: null });

    if (!open) {
      label(this, tx, y - h / 2 + 52, '???', { size: 28, align: 'left' });
      this.add.image(tx + 20, y - h / 2 + 110, SHEET, 'icon/lock').setScale(0.5);
      label(this, x, y + 60, `Clear stage ${place.after} to open it.`, { size: 18, weight: 600, color: HIGHLIGHT, strokeWidth: 4 });
      return;
    }

    label(this, tx, y - h / 2 + 48, place.name, { size: place.name.length > 18 ? 18 : 22, align: 'left', wrap: w - 172 });
    const facts = 'floors' in place
      ? [`${place.floors.length} floors. Nothing heals.`, `${RESERVES} reserves beside the team.`]
      : [`One battle of ${place.seconds} seconds.`, 'The lord calls up more.'];
    label(this, tx, y - h / 2 + 76, facts.join('\n'), { size: 14, weight: 600, align: 'left', ...dark }).setOrigin(0, 0);

    // The five difficulties: the ones that are open can be picked, the rest are locks. A button has room
    // for a number; the name of the one picked is said under them, on its color.
    const top = topTier(s, kind, place);
    const tier = Math.min(this.picked[place.id] ?? top, top);
    const done = tiersCleared(s, kind, place.id);
    TIER_MARKS.forEach((_name, t) => {
      const bx = tx + 22 + t * 45;
      const by = y - h / 2 + 138;
      if (!tierOpen(s, kind, place, t)) {
        const lock = this.add.graphics();
        slab(lock, bx - 20, by - 17, 40, 34, IRON, 8, 4);
        this.add.image(bx, by - 2, SHEET, 'icon/lock').setScale(0.24);
        return;
      }
      const b = new Button(this, bx, by, String(t + 1), () => {
        this.picked[place.id] = t;
        this.scene.restart();
      }, { width: 40, height: 34, size: 15, mat: t === tier ? DIFFICULTY_MAT[t] : BONE, color: t === tier ? undefined : OUTLINE });
      if (t !== tier) plain(b);
      if (t < done) this.add.image(bx + 14, by - 16, SHEET, 'icon/check').setScale(0.2);
    });

    // What its enemies stand at on the tier picked, and what it pays.
    const at = tierStage(place.land, tier);
    const prize = 'floors' in place ? dungeonPrize(place, tier) : raidPrize(place, tier);
    const py = y + 38;
    label(this, x - w / 2 + 22, py, TIER_MARKS[tier], { size: 17, align: 'left', ...dark });
    gradeBadge(this, x - w / 2 + 108, py, at.grade, 18);
    label(this, x - w / 2 + 138, py, `level ${at.level + ('floors' in place ? 1 : 2)}`, { size: 15, weight: 600, align: 'left', ...dark });
    this.add.image(x + 30, py, SHEET, 'icon/coin').setScale(0.3);
    label(this, x + 48, py, String(prize.coins), { size: 17, align: 'left', ...dark });
    this.add.image(x + 134, py, CARDS, `pack/${prize.pack.split('@')[0]}`).setScale(0.13);
    label(this, x + 152, py, `x${prize.packs}`, { size: 17, align: 'left', ...dark });
    label(this, x, py + 28, `Pays ${prize.packs} of the ${packById(prize.pack).name}${'floors' in place ? ' when the last floor is cleared' : ' for every win'}.`, {
      size: 12, weight: 600, color: IRON.shade, stroke: null, wrap: w - 30,
    });

    new Button(this, x, y + h / 2 - 44, 'ENTER', () => {
      commit();
      // The board of the line gives way to the place's own.
      this.scene.stop('Main');
      this.scene.start('Venture', { kind, id: place.id, tier } satisfies VentureData);
    }, { width: 220, height: 54, size: 24 });
  }
}
