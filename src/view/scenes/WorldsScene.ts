// The menu of worlds, where a world and a difficulty are picked. It opens
// over the field. Each world is a tile: its name, its boss standing before
// it, how far the player is, and a band for each of its five difficulties.
// Pressing an open band goes to that world at that difficulty, at the
// furthest stage open there.
//
// A world not reached is a dark tile with "???" and one line that names
// only what the player knows. A difficulty not open is a lock, and the next
// one to open says how.

import Phaser from 'phaser';
import { GROUND } from '../../art/board';
import { BONE, HIGHLIGHT, IRON, OUTLINE } from '../../art/kit/palette';
import { DIFFICULTIES } from '../../data/difficulties';
import { UNITS } from '../../data/units';
import { WORLDS } from '../../data/worlds';
import { goTo } from '../../game/campaign';
import { clearedIn, difficultyOpen, known, worldOpen } from '../../game/rules';
import { setupCamera } from '../app';
import { H, W, hex } from '../config';
import { SHEET } from '../Sheet';
import { commit, save } from '../session';
import { OverlayHead, closeOverlay } from '../ui/chrome';
import { DIFFICULTY_MAT } from '../ui/colors';
import { portrait } from '../ui/UnitCard';
import { Button, label, plain, slab } from '../ui/widgets';

export class WorldsScene extends Phaser.Scene {
  constructor() {
    super('Worlds');
  }

  create(): void {
    setupCamera(this);
    const s = save();
    new OverlayHead(this, 'Worlds', s);
    label(this, 190, 40, 'Each world can be fought at five difficulties. Its boss opens the next one.', {
      size: 17, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4,
    });

    const pitch = 404;
    const x0 = W / 2 - ((WORLDS.length - 1) * pitch) / 2;
    WORLDS.forEach((_w, i) => this.tile(i, x0 + i * pitch, 352));

    plain(new Button(this, W / 2, H - 40, 'SKIRMISH', () => {
      // A battle by itself, with nothing won or lost: the field is put away for it.
      this.scene.stop('Main');
      this.scene.start('Battle', { seed: (Date.now() % 999983) + 1 });
    }, { width: 200, height: 50, size: 20, mat: BONE, color: OUTLINE }));
  }

  private tile(index: number, x: number, y: number): void {
    const s = save();
    const world = WORLDS[index];
    const w = 380;
    const h = 520;
    const g = this.add.graphics();
    if (!worldOpen(s, index)) {
      slab(g, x - w / 2, y - h / 2, w, h, IRON, 22, 8);
      label(this, x, y - 70, '???', { size: 40 });
      this.add.image(x, y + 4, SHEET, 'icon/lock').setScale(0.8);
      // It names only what the player knows: the world they are in.
      label(this, x, y + 80, `Beat the boss of ${WORLDS[index - 1].name}.`, { size: 17, weight: 600, color: HIGHLIGHT, strokeWidth: 4, wrap: w - 40 });
      return;
    }
    slab(g, x - w / 2, y - h / 2, w, h, BONE, 22, 8);
    // A patch of the world's own ground, with its boss standing on it: dark until he has been beaten.
    const ground = GROUND[world.ground];
    g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(x - w / 2 + 14, y - h / 2 + 14, w - 28, 134, 16);
    g.fillStyle(hex(ground.b), 1).fillRoundedRect(x - w / 2 + 18, y - h / 2 + 18, w - 36, 126, 13);
    g.fillStyle(hex(ground.a), 1).fillRoundedRect(x - w / 2 + 18, y - h / 2 + 96, w - 36, 48, 13);
    const boss = world.stages[world.stages.length - 1].enemies.find((e) => e.rank === 'boss');
    if (boss) portrait(this, x + 104, y - h / 2 + 138, boss.unit, 'red', 112, !known(s, UNITS[boss.unit]));
    label(this, x - w / 2 + 34, y - h / 2 + 50, world.name, { size: world.name.length > 12 ? 24 : 30, align: 'left' });
    label(this, x - w / 2 + 34, y - h / 2 + 100, world.blurb, { size: 13, weight: 600, align: 'left', color: OUTLINE, stroke: null, wrap: 190 });

    const n = world.stages.length;
    let nextShown = false;
    DIFFICULTIES.forEach((diff, d) => {
      const by = y - h / 2 + 190 + d * 64;
      const open = difficultyOpen(s, index, d);
      if (open) {
        const done = clearedIn(s, world.id, d);
        const b = new Button(this, x, by, `${diff.name}`, () => {
          if (goTo(s, { world: index, stage: Math.min(done, n - 1), d })) {
            commit();
            closeOverlay(this);
          }
        }, { width: w - 44, height: 54, size: 22, mat: DIFFICULTY_MAT[d] });
        b.root.add(label(this, w / 2 - 44, -3, done >= n ? '' : `${done} / ${n}`, { size: 17, align: 'right', strokeWidth: 4 }));
        if (done >= n) b.root.add(this.add.image(w / 2 - 54, -3, SHEET, 'icon/check').setScale(0.36));
        return;
      }
      const lg = this.add.graphics();
      slab(lg, x - (w - 44) / 2, by - 27, w - 44, 54, IRON, 16, 6);
      this.add.image(x - (w - 44) / 2 + 30, by - 3, SHEET, 'icon/lock').setScale(0.36);
      if (!nextShown) {
        // The next one to open says how. The ones after it say nothing.
        nextShown = true;
        label(this, x + 16, by - 3, `Beat the boss on ${DIFFICULTIES[d - 1].name}`, { size: 16, weight: 600, color: HIGHLIGHT, strokeWidth: 4 });
      }
    });
  }
}
