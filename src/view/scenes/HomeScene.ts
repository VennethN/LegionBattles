// The map: a world's stages as a path of stones. Pressing an open one shows
// who waits there and what a win pays, and FIGHT goes to the battle.
//
// What the player has not reached is not told: a stage that is not open is a
// lock, and no arrow leads to a world that is shut.

import Phaser from 'phaser';
import { GROUND, PROPS } from '../../art/board';
import { BONE, CLOTH, DIRT, GOLD, HIGHLIGHT, IRON, OUTLINE, type Material } from '../../art/kit/palette';
import { WORLDS, stageCoins, type StageDef } from '../../data/worlds';
import { clearedIn, frontier, packsHeld, stageOpen, teamSize, worldOpen } from '../../game/rules';
import { setupCamera } from '../app';
import { H, W, hex } from '../config';
import { SHEET } from '../Sheet';
import { commit, save } from '../session';
import { Chrome, veil } from '../ui/chrome';
import { gradeBadge } from '../ui/grade';
import { unitCard } from '../ui/UnitCard';
import { Button, label, slab } from '../ui/widgets';
import type { BattleConfig } from './BattleScene';

export class HomeScene extends Phaser.Scene {
  private world = 0;
  private panel: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Home');
  }

  init(data: { world?: number }): void {
    const s = save();
    const [w] = frontier(s);
    const kept = this.registry.get('world') as number | undefined;
    this.world = data.world ?? kept ?? w;
    if (!worldOpen(s, this.world)) this.world = w;
    this.registry.set('world', this.world);
    this.panel = [];
  }

  create(): void {
    setupCamera(this);
    const s = save();
    const world = WORLDS[this.world];
    const ground = GROUND[world.ground];
    this.cameras.main.setBackgroundColor(ground.around);

    // The land: a lighter field with things growing on it, well away from the path.
    const field = this.add.graphics();
    field.fillStyle(hex(ground.b), 1).fillRoundedRect(96, 122, W - 192, 488, 40);
    const props = PROPS[world.ground];
    const spots: Array<[number, number, number, number]> = [
      [0, 46, 200, 1], [1, 52, 420, 1], [2, 40, 580, 0.9], [0, 1232, 250, 1], [1, 1240, 470, 1], [2, 1226, 600, 0.9],
      [1, 250, 150, 0.7], [0, 1020, 148, 0.7], [2, 640, 142, 0.65],
    ];
    for (const [k, x, y, scale] of spots) this.add.image(x, y, SHEET, `board/${props[k]}`).setScale(0.5 * scale).setDepth(y);

    new Chrome(this, world.name, 'Home', s);
    label(this, 28, 78, world.blurb, { size: 17, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4 }).setDepth(8000);

    new Button(this, W - 300, 37, 'SKIRMISH', () => this.scene.start('Battle', { seed: (Date.now() % 999983) + 1 } satisfies BattleConfig), {
      width: 170, height: 46, size: 20, mat: BONE, color: OUTLINE,
    }).setDepth(8000).root.list.forEach((o) => {
      if (o instanceof Phaser.GameObjects.Text) o.setStroke(BONE.fill, 0);
    });

    this.drawPath(world.stages);

    // No arrow leads to a world that is shut.
    if (this.world > 0) {
      const b = new Button(this, 44, 366, '', () => this.scene.restart({ world: this.world - 1 }), { width: 56, height: 84, mat: BONE }).setDepth(8000);
      b.root.add(this.add.image(0, -3, SHEET, 'icon/arrow').setScale(0.5).setFlipX(true));
    }
    if (this.world + 1 < WORLDS.length && worldOpen(s, this.world + 1)) {
      const b = new Button(this, W - 44, 366, '', () => this.scene.restart({ world: this.world + 1 }), { width: 56, height: 84, mat: BONE }).setDepth(8000);
      b.root.add(this.add.image(0, -3, SHEET, 'icon/arrow').setScale(0.5));
    }

    label(this, W - 30, 84, `Team of ${teamSize(s)}`, { size: 17, weight: 600, align: 'right', color: HIGHLIGHT, strokeWidth: 4 }).setDepth(8000);

    // A new player holds packs and has never opened one: point at them.
    if (packsHeld(s) > 0 && s.stats.opened === 0) {
      const hint = label(this, W / 2 + 214, H - 104, 'Open your packs first!', { size: 20, color: GOLD.fill }).setDepth(8002);
      this.tweens.add({ targets: hint, y: H - 112, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private positions(n: number): Array<[number, number]> {
    const rows = n <= 6 ? 1 : n <= 12 ? 2 : 3;
    const perRow = Math.ceil(n / rows);
    const out: Array<[number, number]> = [];
    const x0 = 190;
    const x1 = W - 190;
    const y0 = rows === 1 ? 366 : rows === 2 ? 268 : 222;
    const y1 = rows === 1 ? 366 : rows === 2 ? 480 : 532;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inRow = Math.min(perRow, n - row * perRow);
      const t = inRow > 1 ? col / (perRow - 1) : 0.5;
      // The path snakes: left to right, then back.
      const x = row % 2 === 0 ? x0 + (x1 - x0) * t : x1 - (x1 - x0) * t;
      const y = rows === 1 ? y0 : y0 + ((y1 - y0) * row) / (rows - 1);
      out.push([x, y + (col % 2 === 0 ? -10 : 10)]);
    }
    return out;
  }

  private drawPath(stages: readonly StageDef[]): void {
    const s = save();
    const world = WORLDS[this.world];
    const pts = this.positions(stages.length);
    const cleared = clearedIn(s, world.id);

    const g = this.add.graphics().setDepth(10);
    const road = (width: number, color: number, upTo: number): void => {
      g.lineStyle(width, color, 1);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i <= upTo; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.strokePath();
    };
    road(26, hex(OUTLINE), pts.length - 1);
    road(18, hex(DIRT.shade), pts.length - 1);
    // The road walked so far is lighter.
    if (cleared > 0) road(18, hex(BONE.fill), Math.min(cleared, pts.length - 1));

    stages.forEach((stage, i) => {
      const [x, y] = pts[i];
      const open = stageOpen(s, this.world, i);
      const done = i < cleared;
      const big = stage.kind === 'boss' ? 42 : stage.kind === 'miniboss' ? 36 : 30;
      const mat: Material = !open ? IRON : done ? GOLD : BONE;
      const node = this.add.container(x, y).setDepth(20 + i);
      const disc = this.add.graphics();
      disc.fillStyle(hex(OUTLINE), 1).fillCircle(0, 4, big + 4);
      disc.fillStyle(hex(mat.shade), 1).fillCircle(0, 3, big);
      disc.fillStyle(hex(mat.fill), 1).fillCircle(0, -2, big);
      disc.lineStyle(4, hex(OUTLINE), 1).strokeCircle(0, 0.5, big + 2);
      node.add(disc);
      if (!open) {
        node.add(this.add.image(0, -2, SHEET, 'icon/lock').setScale(big / 60));
      } else {
        node.add(label(this, 0, -3, String(i + 1), { size: big * 0.9, color: OUTLINE, stroke: null }));
        if (stage.kind !== 'normal') {
          node.add(this.add.image(0, -big - 16, SHEET, stage.kind === 'boss' ? 'icon/crown' : 'icon/banner').setScale(0.5));
        }
        node.setSize(big * 2 + 16, big * 2 + 16);
        node.setInteractive({ useHandCursor: true });
        node.on('pointerup', () => this.showStage(i));
        if (!done) this.tweens.add({ targets: node, scale: 1.1, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    });
  }

  /** Who waits at a stage, and what a win pays. */
  private showStage(index: number): void {
    if (this.panel.length) return;
    const s = save();
    const world = WORLDS[this.world];
    const stage = world.stages[index];
    const first = index >= clearedIn(s, world.id);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.panel.push(o);
      return o;
    };
    const close = (): void => {
      for (const o of this.panel) o.destroy();
      this.panel = [];
    };
    add(veil(this, 8500)).on('pointerup', close);

    const pw = 700;
    const ph = 420;
    const px = W / 2 - pw / 2;
    const py = H / 2 - ph / 2 - 10;
    const g = add(this.add.graphics().setDepth(8600));
    slab(g, px, py, pw, ph, BONE, 24, 10);
    // The panel itself swallows presses, so that pressing it does not close it.
    add(this.add.zone(W / 2, H / 2 - 10, pw, ph).setInteractive().setDepth(8601));

    const kind = stage.kind === 'boss' ? 'BOSS' : stage.kind === 'miniboss' ? 'MINIBOSS' : `STAGE ${index + 1}`;
    add(label(this, W / 2, py + 44, stage.name, { size: 36 }).setDepth(8602));
    // One line: what kind of stage, then the enemies' grade as its badge, then their level.
    const small = { size: 18, weight: 600 as const, color: OUTLINE, stroke: null, align: 'left' as const };
    const before = add(label(this, 0, py + 86, `${kind}  ·  enemies at`, small).setDepth(8602));
    const after = add(label(this, 0, py + 86, `level ${stage.level}`, small).setDepth(8602));
    const badge = add(gradeBadge(this, 0, py + 86, stage.grade, 22).setDepth(8602));
    const plate = 28;
    const left = W / 2 - (before.width + 12 + plate + 12 + after.width) / 2;
    before.setX(left);
    badge.setX(left + before.width + 12 + plate / 2);
    after.setX(left + before.width + 12 + plate + 12);

    // One card to each kind of enemy, with how many of it.
    const counts = new Map<string, number>();
    for (const e of stage.enemies) counts.set(e.unit, (counts.get(e.unit) ?? 0) + 1);
    const kinds = [...counts.keys()];
    const cw = 104;
    const gap = 14;
    const startX = W / 2 - ((kinds.length - 1) * (cw + gap)) / 2;
    kinds.forEach((unit, i) => {
      const c = add(unitCard(this, startX + i * (cw + gap), py + 190, unit, s, { width: cw, height: 124, enemy: true }).setDepth(8602));
      void c;
      const n = counts.get(unit) ?? 1;
      if (n > 1) add(label(this, startX + i * (cw + gap) + cw / 2 - 10, py + 138, `x${n}`, { size: 20 }).setDepth(8603));
    });

    const pay = stageCoins(world, index);
    add(this.add.image(W / 2 - 96, py + 288, SHEET, 'icon/coin').setScale(0.42).setDepth(8602));
    add(label(this, W / 2 - 70, py + 288, first ? `${pay} for the first win` : `${Math.round(pay / 2)} for a win`, {
      size: 20, weight: 600, align: 'left', color: OUTLINE, stroke: null,
    }).setDepth(8602));

    const fight = new Button(this, W / 2 + 120, py + ph - 62, 'FIGHT', () => {
      commit();
      this.scene.start('Battle', { world: this.world, stage: index } satisfies BattleConfig);
    }, { width: 240, height: 70, size: 34 }).setDepth(8602);
    const back = new Button(this, W / 2 - 150, py + ph - 62, 'BACK', close, { width: 180, height: 70, size: 28, mat: CLOTH.red }).setDepth(8602);
    add(fight.root);
    add(back.root);
    if (s.team.length === 0) {
      fight.setEnabled(false);
      add(label(this, W / 2, py + ph - 116, 'Your team is empty: put someone in it first.', { size: 17, color: CLOTH.red.fill }).setDepth(8602));
    }
  }
}
