// Slash arcs, sparks, rings, dust and the like. A fixed pool of sprites is
// made once and handed round: an effect takes a free one, plays, and gives it
// back. Nothing is created or thrown away while a battle runs.

import Phaser from 'phaser';
import { ART_SCALE } from './config';
import { SHEET } from './art/Sheet';

const INV_ART = 1 / ART_SCALE;

interface Fx {
  img: Phaser.GameObjects.Image;
  active: boolean;
  /** Seconds lived. Negative while it waits to start. */
  t: number;
  dur: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  s0: number;
  s1: number;
  /** Squash of its height, for things that lie on the ground. */
  flat: number;
  a0: number;
  /** The share of its life after which it starts to fade. */
  hold: number;
  spin: number;
}

export interface FxOpts {
  dur?: number;
  delay?: number;
  vx?: number;
  vy?: number;
  gravity?: number;
  from?: number;
  to?: number;
  flat?: number;
  alpha?: number;
  hold?: number;
  rotation?: number;
  spin?: number;
  tint?: number;
  flipX?: boolean;
  depth?: number;
}

export class Effects {
  private pool: Fx[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    size = 96,
  ) {
    for (let i = 0; i < size; i++) this.pool.push(this.make());
  }

  private make(): Fx {
    const img = this.scene.add.image(0, 0, SHEET, 'fx/spark').setVisible(false).setActive(false);
    return { img, active: false, t: 0, dur: 1, x: 0, y: 0, vx: 0, vy: 0, gravity: 0, s0: 1, s1: 1, flat: 1, a0: 1, hold: 0.5, spin: 0 };
  }

  /**
   * How much smaller than on the first field effects are drawn: the zoom of
   * the field on show. Sizes and speeds are given as they are on the first
   * field, and are scaled by this. Where an effect starts is the caller's.
   */
  zoom = 1;

  /** Plays one effect. `frame` is its name on the sheet, like "fx/spark". */
  spawn(frame: string, x: number, y: number, o: FxOpts = {}): void {
    let fx: Fx | null = null;
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        fx = this.pool[i];
        break;
      }
    }
    if (!fx) {
      // The pool is sized for the busiest battle; if a busier one comes, it grows once and keeps the room.
      fx = this.make();
      this.pool.push(fx);
    }
    fx.active = true;
    fx.t = -(o.delay ?? 0);
    fx.dur = o.dur ?? 0.3;
    fx.x = x;
    fx.y = y;
    fx.vx = (o.vx ?? 0) * this.zoom;
    fx.vy = (o.vy ?? 0) * this.zoom;
    fx.gravity = (o.gravity ?? 0) * this.zoom;
    fx.s0 = (o.from ?? 1) * this.zoom;
    fx.s1 = (o.to ?? o.from ?? 1) * this.zoom;
    fx.flat = o.flat ?? 1;
    fx.a0 = o.alpha ?? 1;
    fx.hold = o.hold ?? 0.5;
    fx.spin = o.spin ?? 0;
    const img = fx.img;
    img.setTexture(SHEET, frame);
    img.setTint(o.tint ?? 0xffffff);
    img.setFlipX(o.flipX ?? false);
    img.rotation = o.rotation ?? 0;
    img.depth = o.depth ?? 6000;
    img.setActive(true);
    img.setVisible(fx.t >= 0);
    img.x = x;
    img.y = y;
    img.alpha = fx.a0;
    img.setScale(fx.s0 * INV_ART, fx.s0 * INV_ART * fx.flat);
  }

  update(dt: number): void {
    for (let i = 0; i < this.pool.length; i++) {
      const fx = this.pool[i];
      if (!fx.active) continue;
      fx.t += dt;
      if (fx.t < 0) continue;
      const img = fx.img;
      if (fx.t >= fx.dur) {
        fx.active = false;
        img.setVisible(false).setActive(false);
        continue;
      }
      const k = fx.t / fx.dur;
      const ease = 1 - (1 - k) * (1 - k);
      fx.vy += fx.gravity * dt;
      fx.x += fx.vx * dt;
      fx.y += fx.vy * dt;
      img.visible = true;
      img.x = fx.x;
      img.y = fx.y;
      img.rotation += fx.spin * dt;
      const s = (fx.s0 + (fx.s1 - fx.s0) * ease) * INV_ART;
      img.scaleX = s;
      img.scaleY = s * fx.flat;
      img.alpha = k <= fx.hold ? fx.a0 : fx.a0 * (1 - (k - fx.hold) / (1 - fx.hold));
    }
  }

  clear(): void {
    for (const fx of this.pool) {
      fx.active = false;
      fx.img.setVisible(false).setActive(false);
    }
  }
}
