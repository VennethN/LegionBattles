// The map of a world: a painted land with a road winding from the first of
// its stages to the last, and at each stage what holds it: a camp, a
// watchtower where a miniboss waits, a stronghold for the boss. It opens
// from the stage's plate on the main screen. Pressing a stage that is open
// goes to it.
//
// The arrows at the sides turn to the world before and the world after.
// No arrow leads to a world that has not been reached, and a stage that is
// not open is dark, with a lock, and cannot be picked.

import Phaser from 'phaser';
import { mapNodes } from '../../art/backdrop';
import { GROUND } from '../../art/board';
import { BONE, CLOTH, GOLD, HIGHLIGHT, IRON, OUTLINE, type Material } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { LANDS } from '../../data/lands';
import { DIFFICULTIES } from '../../data/laps';
import { STAGES, WORLDS, stageAt, worldOf, type World } from '../../data/stages';
import { goTo } from '../../game/campaign';
import { payOf, stageCleared, stageOpen, worldNeeds, worldReached } from '../../game/rules';
import { setupCamera } from '../app';
import { H, W, hex } from '../config';
import { scenePicture } from '../Scenes';
import { SHEET } from '../Sheet';
import { commit, save } from '../session';
import { CoinPill, closeOverlay } from '../ui/chrome';
import { DIFFICULTY_MAT } from '../ui/colors';
import { gradeBadge } from '../ui/grade';
import { worldBanner } from '../ui/WorldBanner';
import { Button, label, plain, slab } from '../ui/widgets';

export interface MapData {
  /** The world to open on, as its place in WORLDS. The world of the stage on show, if left out. */
  world?: number;
}

export class MapScene extends Phaser.Scene {
  private world: World = WORLDS[0];

  constructor() {
    super('Map');
  }

  init(data: MapData): void {
    const s = save();
    const asked = data.world ?? worldOf(s.at).index;
    this.world = WORLDS[Math.max(0, Math.min(WORLDS.length - 1, asked))];
    // A world that has not been reached is not shown: the one the player is in is.
    if (!worldReached(s, this.world.index)) this.world = worldOf(s.at);
  }

  create(): void {
    setupCamera(this);
    const s = save();
    const world = this.world;
    const land = LANDS[world.land];
    this.cameras.main.setBackgroundColor(GROUND[land.ground].around);
    // A sheet that swallows presses, under everything: the board under this is not drawn while it is open.
    this.add.rectangle(W / 2, H / 2, W, H, hex(GROUND[land.ground].around), 1).setDepth(-1).setInteractive();
    scenePicture(this, 'maps', land.id);

    // The heading: the world's banner, the stages it holds, and the way out.
    worldBanner(this, W / 2, 36, world, true).setDepth(8000);
    label(this, W / 2, 78, `Stages ${world.first + 1} to ${world.last + 1}`, { size: 18, weight: 600, color: HIGHLIGHT, strokeWidth: 5 }).setDepth(8000);
    new CoinPill(this, s);
    new Button(this, W - 262, 37, 'CLOSE', () => closeOverlay(this), { width: 130, height: 48, size: 20, mat: CLOTH.red }).setDepth(8000);
    plain(new Button(this, 110, 37, 'SKIRMISH', () => {
      // A battle by itself, with nothing won or lost by it.
      this.scene.stop('Main');
      this.scene.start('Battle', {});
    }, { width: 170, height: 48, size: 18, mat: BONE, color: OUTLINE })).setDepth(8000);

    // The difficulties of this land, in a row under the heading: the one on show ringed, the ones not
    // open yet shut with a lock, which say what opens them when they are pressed.
    const chipW = 132;
    const row = 118;
    DIFFICULTIES.forEach((name, d) => {
      const to = d * LANDS.length + world.land;
      const open = worldReached(s, to);
      const x = W / 2 + (d - (DIFFICULTIES.length - 1) / 2) * (chipW + 10);
      const b = new Button(this, x, row, open ? name.toUpperCase() : '', () => {
        if (open) this.scene.restart({ world: to } satisfies MapData);
        else this.showNeeds(to);
      }, { width: chipW, height: 38, size: 15, mat: open ? DIFFICULTY_MAT[d] : IRON }).setDepth(8000);
      if (!open) b.root.add(this.add.image(0, -3, SHEET, 'icon/lock').setScale(0.26));
      if (to === world.index) {
        const ring = this.add.graphics().setDepth(8001);
        ring.lineStyle(4, hex(HIGHLIGHT), 1).strokeRoundedRect(x - chipW / 2 - 5, row - 24, chipW + 10, 46, 13);
      }
    });

    // The lands on either side on this difficulty, if they are open.
    for (const step of [-1, 1]) {
      const to = world.index + step;
      if (!WORLDS[to] || WORLDS[to].lap !== world.lap || !worldReached(s, to)) continue;
      const b = plain(new Button(this, step < 0 ? 44 : W - 44, 400, '', () => this.scene.restart({ world: to } satisfies MapData), { width: 60, height: 84, mat: BONE })).setDepth(8000);
      b.root.add(this.add.image(0, -3, SHEET, 'icon/arrow').setScale(0.44).setFlipX(step < 0));
    }

    const nodes = mapNodes(world.last - world.first + 1);
    nodes.forEach(([x, y], i) => {
      const index = world.first + i;
      const stage = stageAt(index);
      const open = stageOpen(s, index);
      const here = index === s.at;
      const beaten = stageCleared(s, index);
      const boss = stage.def.kind === 'boss';

      if (!open) {
        // Not reached: what holds it is in the dark, and it says nothing of itself.
        const veil = this.add.graphics().setDepth(20 + i);
        veil.fillStyle(hex(OUTLINE), 0.5).fillEllipse(x, y - 42, boss ? 156 : 104, boss ? 136 : 108);
        this.add.image(x, y - 42, SHEET, 'icon/lock').setScale(0.46).setDepth(40);
        return;
      }

      // Its number, on a plate under the site: gold once it is beaten, pale while it is still to win.
      const mat: Material = beaten ? GOLD : BONE;
      const g = this.add.graphics().setDepth(30);
      if (here) {
        // The stage the player is on: a ring round its plate, and their flag over the site, bobbing.
        const ring = this.add.graphics().setDepth(29);
        ring.lineStyle(6, hex(HIGHLIGHT), 1).strokeRoundedRect(x - 40, y + 2, 80, 40, 14);
        this.tweens.add({ targets: ring, alpha: 0.35, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        const flag = this.add.image(x, y - (boss ? 128 : 96), SHEET, 'icon/flag').setScale(0.56).setDepth(45);
        this.tweens.add({ targets: flag, y: flag.y - 10, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      slab(g, x - 33, y + 8, 66, 28, mat, 9, 4);
      label(this, x, y + 20, String(index + 1), { size: 19, color: OUTLINE, stroke: null }).setDepth(31);
      if (beaten) this.add.image(x + 30, y + 8, SHEET, 'icon/check').setScale(0.3).setDepth(32);
      if (stage.def.kind !== 'normal') this.add.image(x - 31, y + 6, SHEET, boss ? 'icon/crown' : 'icon/banner').setScale(0.3).setDepth(32);

      // The site and its plate are one thing to press.
      const zone = this.add.zone(x, y - 26, boss ? 150 : 110, 140).setDepth(50).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => this.showNote(index));
      zone.on('pointerdown', () => this.showNote(index));
      zone.on('pointerup', () => {
        if (!goTo(s, index)) return;
        commit();
        sfx.play('click');
        closeOverlay(this);
      });
    });
    // It opens telling of the stage the player is on, if that is in this world.
    if (s.at >= world.first && s.at <= world.last) this.showNote(s.at);
  }

  private note: Phaser.GameObjects.GameObject[] = [];

  /** What must be beaten for a world to open, said along the foot of the map. */
  private showNeeds(world: number): void {
    for (const o of this.note) o.destroy();
    this.note = [];
    const needs = worldNeeds(save(), world).map((w) => `${WORLDS[w].name} on ${DIFFICULTIES[WORLDS[w].lap]}`);
    const y = H - 30;
    const text = label(this, W / 2, y, `${WORLDS[world].title}: beat ${needs.join(' and ')} to open it`, { size: 18, weight: 600, strokeWidth: 4 }).setDepth(61);
    const g = this.add.graphics().setDepth(60);
    slab(g, W / 2 - text.width / 2 - 22, y - 24, text.width + 44, 46, IRON, 14, 5);
    this.note.push(g, text);
  }

  /** A stage's number and name, what a win pays and what its enemies stand at: one line along the foot of the map, clear of every site. */
  private showNote(index: number): void {
    for (const o of this.note) o.destroy();
    this.note = [];
    const s = save();
    const stage = STAGES[index];
    const first = !stageCleared(s, index);
    const y = H - 30;
    const small = { size: 18, weight: 600 as const, align: 'left' as const, strokeWidth: 4 };
    const name = label(this, 0, y, `Stage ${index + 1}  ·  ${stage.def.name}`, { ...small, weight: 700 }).setDepth(61);
    const pay = label(this, 0, y, String(payOf(s, index, first)), small).setDepth(61);
    const level = label(this, 0, y, `level ${stage.level}`, small).setDepth(61);
    const total = name.width + 26 + 26 + pay.width + 34 + 46 + level.width;
    const g = this.add.graphics().setDepth(60);
    slab(g, W / 2 - total / 2 - 22, y - 24, total + 44, 46, IRON, 14, 5);
    let x = W / 2 - total / 2;
    name.setX(x);
    x += name.width + 26;
    const coin = this.add.image(x + 10, y, SHEET, 'icon/coin').setScale(0.3).setDepth(61);
    pay.setX(x + 26);
    x += 26 + pay.width + 34;
    // Room on both sides of the badge: the better grades have wings.
    const badge = gradeBadge(this, x + 16, y, stage.grade, 19).setDepth(61);
    level.setX(x + 46);
    this.note.push(g, name, pay, level, coin, badge);
  }
}
