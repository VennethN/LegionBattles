// Marks left on the ground: cracks where a blow fell, a furrow a spade
// ploughed, hoof marks in the snow, blood, a scorch. They lie under
// everything that stands and under the tells, and fade after a while, so
// that a long hunt's ground tells the story of its last few blows and not
// of all of them.

import Phaser from 'phaser';
import { SHEET } from '../art/Sheet';
import { SHAPE_SIZE } from './shapes';

interface Decal {
  img: Phaser.GameObjects.Image;
  live: boolean;
  t: number;
  life: number;
  a0: number;
  /** Seconds it takes to come up: a crack runs out, it does not appear. */
  grow: number;
  sx: number;
  sy: number;
}

export interface DecalSpec {
  shape: string;
  /** Length along the shape's width, in the field's units. */
  length: number;
  /** Width across, in the field's units: by default as the shape was drawn, scaled with its length. */
  width?: number;
  rotation?: number;
  tint: number;
  alpha?: number;
  life?: number;
  grow?: number;
  flip?: boolean;
}

export class Decals {
  private readonly pool: Decal[] = [];
  /** How many may lie on the ground at once: the oldest go first. */
  most = 40;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number,
  ) {}

  put(x: number, y: number, o: DecalSpec): void {
    let d = this.pool.find((p) => !p.live);
    if (!d) {
      if (this.pool.length < this.most) {
        d = { img: this.scene.add.image(0, 0, SHEET, 'vfx/crack').setDepth(this.depth), live: false, t: 0, life: 1, a0: 1, grow: 0, sx: 1, sy: 1 };
        this.pool.push(d);
      } else d = this.pool.reduce((a, b) => (a.t / a.life > b.t / b.life ? a : b));
    }
    const size = SHAPE_SIZE[o.shape] ?? [64, 32];
    d.live = true;
    d.t = 0;
    d.life = o.life ?? 9;
    d.a0 = o.alpha ?? 0.75;
    d.grow = o.grow ?? 0.12;
    d.sx = o.length / size[0];
    d.sy = (o.width ?? (size[1] * o.length) / size[0]) / size[1];
    d.img.setFrame(`vfx/${o.shape}`).setPosition(x, y).setRotation(o.rotation ?? 0).setTint(o.tint).setFlipY(!!o.flip).setVisible(true).setAlpha(d.a0);
  }

  update(dt: number): void {
    for (const d of this.pool) {
      if (!d.live) continue;
      d.t += dt;
      if (d.t >= d.life) {
        d.live = false;
        d.img.setVisible(false);
        continue;
      }
      const up = d.grow > 0 ? Math.min(1, d.t / d.grow) : 1;
      // It comes up along its length first, as a crack runs.
      d.img.setScale(d.sx * up, d.sy * (0.5 + 0.5 * up));
      const fade = d.t > d.life - 2 ? (d.life - d.t) / 2 : 1;
      d.img.alpha = d.a0 * fade;
    }
  }

  clear(): void {
    for (const d of this.pool) {
      d.live = false;
      d.img.setVisible(false);
    }
  }
}
