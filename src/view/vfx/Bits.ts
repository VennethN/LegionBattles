// The bits an effect is made of: sparks, drops, chips, clods, puffs, ash.
// Each is one picture of the sheet, made once and handed round. A bit lives
// on the ground of the lair, seen from above at a slant: it has a place on
// the ground and a height above it, so that what is thrown up falls back
// down where it should, bounces, and lies there a moment before it fades.

import Phaser from 'phaser';
import { SHEET } from '../art/Sheet';
import { SHAPE_SIZE } from './shapes';

export interface BitSpec {
  /** The shape, by its name in shapes.ts. */
  shape: string;
  /** Its size in the field's units along its length: the shape is scaled to it. */
  size: number;
  /** What it is at its end, as a share of `size`. */
  to?: number;
  dur: number;
  delay?: number;
  /** Speed along the ground, and up from it. */
  vx?: number;
  vy?: number;
  vz?: number;
  /** Height above the ground it starts at. */
  z?: number;
  /** Pull down, in units a second a second. Nothing falls without it. */
  gravity?: number;
  /** How much of its speed it loses each second, as a share. */
  drag?: number;
  /** How much of its fall it keeps when it hits the ground; nothing, and it lies where it fell. */
  bounce?: number;
  rotation?: number;
  spin?: number;
  /** True to turn along its way, as a spark or a drop does. */
  turn?: boolean;
  /** How long it is drawn out by its speed, for sparks: 0 for not at all. */
  stretch?: number;
  tint: number;
  alpha?: number;
  /** The share of its life before it begins to fade. */
  hold?: number;
  /** Drawn in front of what stands at its place by this much: a spark off a boss is drawn over him. */
  front?: number;
  /** Squash of its height, for what lies on the ground. */
  flat?: number;
  /** Added, as light is: a spark, an ember. Such a bit is shown through the light's own picture where there is one. */
  shine?: boolean;
  /** Something it does each frame: a sway, a flutter. */
  sway?: number;
}

interface Bit {
  img: Phaser.GameObjects.Image;
  live: boolean;
  shine: boolean;
  t: number;
  dur: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  g: number;
  drag: number;
  bounce: number;
  spin: number;
  turn: boolean;
  stretch: number;
  s0: number;
  s1: number;
  a0: number;
  hold: number;
  front: number;
  flat: number;
  sway: number;
  phase: number;
  w: number;
  resting: boolean;
}

export class Bits {
  private readonly pool: Bit[] = [];
  /** How many may be alive at once: set by how much the machine can take. */
  most = 260;

  constructor(
    private readonly scene: Phaser.Scene,
    size: number,
    /** Called with each picture made, so that the light can be told how to draw it. */
    private readonly made: (img: Phaser.GameObjects.Image, shine: boolean) => void,
  ) {
    for (let i = 0; i < size; i++) this.pool.push(this.make(i % 4 === 0));
  }

  private make(shine: boolean): Bit {
    const img = this.scene.add.image(0, 0, SHEET, 'vfx/chip').setVisible(false).setActive(false);
    this.made(img, shine);
    return {
      img, live: false, shine, t: 0, dur: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, bounce: 0, spin: 0, turn: false, stretch: 0,
      s0: 1, s1: 1, a0: 1, hold: 0.5, front: 0, flat: 1, sway: 0, phase: 0, w: 1, resting: false,
    };
  }

  /** How many are alive now. */
  get count(): number {
    let n = 0;
    for (const b of this.pool) if (b.live) n++;
    return n;
  }

  /** Throws one bit. Returns false if there was no room for it: an effect is never worth a slow frame. */
  spawn(x: number, y: number, o: BitSpec): boolean {
    const shine = !!o.shine;
    let bit: Bit | null = null;
    let live = 0;
    for (const b of this.pool) {
      if (b.live) live++;
      else if (!bit && b.shine === shine) bit = b;
    }
    if (live >= this.most) return false;
    if (!bit) {
      bit = this.make(shine);
      this.pool.push(bit);
    }
    const size = SHAPE_SIZE[o.shape] ?? [16, 16];
    bit.live = true;
    bit.t = -(o.delay ?? 0);
    bit.dur = o.dur;
    bit.x = x;
    bit.y = y;
    bit.z = o.z ?? 0;
    bit.vx = o.vx ?? 0;
    bit.vy = o.vy ?? 0;
    bit.vz = o.vz ?? 0;
    bit.g = o.gravity ?? 0;
    bit.drag = o.drag ?? 0;
    bit.bounce = o.bounce ?? 0;
    bit.spin = o.spin ?? 0;
    bit.turn = !!o.turn;
    bit.stretch = o.stretch ?? 0;
    bit.w = size[0];
    bit.s0 = o.size / size[0];
    bit.s1 = bit.s0 * (o.to ?? 1);
    bit.a0 = o.alpha ?? 1;
    bit.hold = o.hold ?? 0.6;
    bit.front = o.front ?? 0;
    bit.flat = o.flat ?? 1;
    bit.sway = o.sway ?? 0;
    bit.phase = Math.random() * 6.28;
    bit.resting = false;
    const img = bit.img;
    img.setFrame(`vfx/${o.shape}`).setTint(o.tint).setRotation(o.rotation ?? 0).setActive(true).setVisible(false).setAlpha(bit.a0);
    return true;
  }

  update(dt: number): void {
    for (const b of this.pool) {
      if (!b.live) continue;
      b.t += dt;
      if (b.t < 0) continue;
      const img = b.img;
      if (b.t >= b.dur) {
        b.live = false;
        img.setVisible(false).setActive(false);
        continue;
      }
      if (!b.resting) {
        const keep = Math.max(0, 1 - b.drag * dt);
        b.vx *= keep;
        b.vy *= keep;
        b.vz -= b.g * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
        if (b.g > 0 && b.z <= 0) {
          b.z = 0;
          if (b.bounce > 0 && b.vz < -60) {
            b.vz = -b.vz * b.bounce;
            b.vx *= 0.55;
            b.vy *= 0.55;
            b.spin *= 0.5;
          } else {
            // It lies where it fell: flat on the ground, still, until it fades.
            b.resting = true;
            b.vx = b.vy = b.vz = 0;
            b.spin = 0;
          }
        }
      }
      const k = b.t / b.dur;
      const ease = 1 - (1 - k) * (1 - k);
      const s = b.s0 + (b.s1 - b.s0) * ease;
      let sx = s;
      let sy = s * (b.resting ? Math.min(b.flat, 0.6) : b.flat);
      const sway = b.sway ? Math.sin(b.t * b.sway + b.phase) * 10 : 0;
      img.x = b.x + sway;
      img.y = b.y - b.z;
      if (b.turn && !b.resting) {
        const ux = b.vx;
        const uy = b.vy - b.vz;
        img.rotation = Math.atan2(uy, ux);
        if (b.stretch > 0) sx *= 1 + Math.min(3, (Math.hypot(ux, uy) / 400) * b.stretch);
      } else img.rotation += b.spin * dt;
      img.scaleX = sx;
      img.scaleY = sy;
      img.depth = b.y + b.front;
      img.alpha = k <= b.hold ? b.a0 : b.a0 * (1 - (k - b.hold) / (1 - b.hold));
      img.visible = true;
    }
  }

  clear(): void {
    for (const b of this.pool) {
      b.live = false;
      b.img.setVisible(false).setActive(false);
    }
  }
}
