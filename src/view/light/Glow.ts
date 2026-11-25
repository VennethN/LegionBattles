// Everything on the field that shines by itself: flames, embers, sparks,
// trails, the hearts of bolts, motes in the air. Each is the kit's soft
// glow or its tongue of flame, colored and added to what is under it, so
// that where many lie together the middle burns out to white as a real
// fire's does. A fixed pool is made once and handed round.
//
// With the light on they are drawn apart, into the emit picture, and no
// camera sees them: the hour must not dim what gives light.

import Phaser from 'phaser';
import { ART_SCALE } from '../config';
import { SHEET } from '../art/Sheet';
import type { Element } from './hours';

const INV_ART = 1 / ART_SCALE;

interface Bit {
  img: Phaser.GameObjects.Image;
  live: boolean;
  t: number;
  dur: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Pull down (or up, when negative), and how fast it loses its speed. */
  gravity: number;
  drag: number;
  s0: number;
  s1: number;
  /** How much longer than wide it is drawn, along the way it goes when `turn` is set. */
  stretch: number;
  turn: boolean;
  a: number;
  hot: number;
  mid: number;
  cool: number;
  /** It sways from side to side as it rises, as a flame does: how far, and where in the sway it began. */
  sway: number;
  phase: number;
  /** Squash of its height, for what lies on the ground. */
  flat: number;
}

export interface BitOpts {
  dur?: number;
  vx?: number;
  vy?: number;
  gravity?: number;
  drag?: number;
  from?: number;
  to?: number;
  stretch?: number;
  turn?: boolean;
  alpha?: number;
  sway?: number;
  flame?: boolean;
  flat?: number;
  /** Another picture from the sheet, drawn as light: a ring for the edge of a blast. */
  frame?: string;
}

function lerpColor(a: number, b: number, k: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  return ((ar + (((b >> 16) & 255) - ar) * k) << 16) | ((ag + (((b >> 8) & 255) - ag) * k) << 8) | (ab + ((b & 255) - ab) * k);
}

export class Glow {
  private readonly bits: Bit[] = [];
  private next = 0;
  /** Lights kept by whoever asked for them, moved by them every frame: the heart of a bolt, a flame on a brazier. */
  private readonly held: Phaser.GameObjects.Image[] = [];
  private readonly spare: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    size: number,
    /** Called for each picture made, so that the cameras can be told not to draw it. */
    private readonly made: (img: Phaser.GameObjects.Image) => void,
  ) {
    for (let i = 0; i < size; i++) {
      this.bits.push({
        img: this.make(), live: false, t: 0, dur: 1, x: 0, y: 0, vx: 0, vy: 0, gravity: 0, drag: 0, s0: 1, s1: 1, stretch: 1, turn: false, a: 1, hot: 0, mid: 0, cool: 0, sway: 0, phase: 0, flat: 1,
      });
    }
  }

  private make(): Phaser.GameObjects.Image {
    const img = this.scene.add.image(0, 0, SHEET, 'fx/glow').setBlendMode(Phaser.BlendModes.ADD).setVisible(false).setActive(false).setDepth(7000);
    this.made(img);
    return img;
  }

  /** One bit of light that lives by itself: it flies, cools through its colors, and goes out. Sizes are in the field's units across. */
  spawn(x: number, y: number, el: Element, o: BitOpts = {}): void {
    // The pool is a ring: when all are alight the oldest is taken, which is the one nearest gone.
    let bit = this.bits[this.next];
    for (let i = 0; i < 8 && bit.live; i++) {
      this.next = (this.next + 1) % this.bits.length;
      bit = this.bits[this.next];
    }
    this.next = (this.next + 1) % this.bits.length;
    bit.live = true;
    bit.t = 0;
    bit.dur = o.dur ?? 0.4;
    bit.x = x;
    bit.y = y;
    bit.vx = o.vx ?? 0;
    bit.vy = o.vy ?? 0;
    bit.gravity = o.gravity ?? 0;
    bit.drag = o.drag ?? 0;
    bit.s0 = o.from ?? 16;
    bit.s1 = o.to ?? 0;
    bit.stretch = o.stretch ?? 1;
    bit.turn = o.turn ?? false;
    bit.a = o.alpha ?? 1;
    bit.hot = el.hot;
    bit.mid = el.mid;
    bit.cool = el.cool;
    bit.sway = o.sway ?? 0;
    bit.phase = Math.random() * 6.28;
    bit.flat = o.flat ?? 1;
    bit.img.setFrame(o.frame ?? (o.flame ? 'fx/flame' : 'fx/glow')).setVisible(true).setActive(true).setRotation(0);
  }

  /** A light for the caller to keep and move: `give` it back when its owner is gone. */
  take(flame = false): Phaser.GameObjects.Image {
    const img = this.spare.pop() ?? this.make();
    img.setFrame(flame ? 'fx/flame' : 'fx/glow').setVisible(true).setActive(true).setRotation(0).setAlpha(1).setScale(1);
    this.held.push(img);
    return img;
  }

  give(img: Phaser.GameObjects.Image): void {
    const at = this.held.indexOf(img);
    if (at >= 0) this.held.splice(at, 1);
    img.setVisible(false).setActive(false);
    this.spare.push(img);
  }

  update(dt: number): void {
    for (const b of this.bits) {
      if (!b.live) continue;
      b.t += dt;
      if (b.t >= b.dur) {
        b.live = false;
        b.img.setVisible(false).setActive(false);
        continue;
      }
      const k = b.t / b.dur;
      if (b.drag > 0) {
        const keep = Math.max(0, 1 - b.drag * dt);
        b.vx *= keep;
        b.vy *= keep;
      }
      b.vy += b.gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const img = b.img;
      img.x = b.x + (b.sway ? Math.sin(b.phase + b.t * 9) * b.sway * k : 0);
      img.y = b.y;
      const s = ((b.s0 + (b.s1 - b.s0) * k) / 64) * INV_ART;
      img.scaleX = s * b.stretch;
      img.scaleY = s * b.flat;
      if (b.turn) img.rotation = Math.atan2(b.vy, b.vx);
      // Hot, then its own color, then the dull end of it; and it thins out over the last of its life.
      img.setTint(k < 0.35 ? lerpColor(b.hot, b.mid, k / 0.35) : lerpColor(b.mid, b.cool, (k - 0.35) / 0.65));
      img.alpha = b.a * (k < 0.12 ? k / 0.12 : k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1);
    }
  }

  /** Every picture that is alight this frame, to be drawn into the emit picture. */
  alight(into: Phaser.GameObjects.Image[]): void {
    for (const b of this.bits) if (b.live) into.push(b.img);
    for (const img of this.held) if (img.visible) into.push(img);
  }

  /** All of them, alight or not: for telling the cameras about them again. */
  all(): Phaser.GameObjects.Image[] {
    return [...this.bits.map((b) => b.img), ...this.held, ...this.spare];
  }

  clear(): void {
    for (const b of this.bits) {
      b.live = false;
      b.img.setVisible(false).setActive(false);
    }
  }
}

/** The size the kit's glow has to be scaled by to be `across` of the field's units wide. */
export function glowScale(across: number): number {
  return (across / 64) * INV_ART;
}
