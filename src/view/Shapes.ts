// What a blow, a fall, a burst, a patch of ground and a level look like,
// made of the shapes in src/art/fxShapes.ts. The owner, of the effects as they
// were: "So its not just circle". Each kind of thing has its own: a blade
// leaves a cut and chips of metal, a hammer a star, dust and a crack, fire
// tongues and embers, frost crystals and shards, holy a sunburst, venom drips,
// the arcane a rune. Nothing here decides anything: it is told by the wave's
// events what happened and where, and only draws it.

import Phaser from 'phaser';
import type { Burst, ZoneKind } from '../game/world';
import type { Land } from '../game/data';
import { ARCANE, BONE, FIRE, FROST, HOLY, LEATHER, OUTLINE, SAND, SNOW, VENOM } from '../art/kit/palette';
import { ART_SCALE } from './config';
import { SHEET } from './art/Sheet';
import type { Effects } from './Effects';

export type HitLook = 'blade' | 'pole' | 'blunt' | 'bow' | 'thrown' | 'fire' | 'frost' | 'holy' | 'venom' | 'arcane';

const hex = (c: string): number => parseInt(c.slice(1), 16);
const TAU = Math.PI * 2;
const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

/** The dust a fall or a stamp raises, by the ground of the land. */
const DUST: Record<Land, number> = {
  // The dust picture is pale already and a tint only darkens it: these keep it the light of dry earth, sand or snow.
  meadow: hex(BONE.fill), mire: hex(BONE.shade), desert: hex(SAND.light), snow: hex(SNOW.light), coast: hex(SAND.light),
  mine: hex(BONE.shade), steppe: hex(BONE.fill), crypt: hex(BONE.shade), clock: hex(BONE.fill), ember: hex(BONE.shade),
};

/** What breaks off someone who falls, where it is not cloth and flesh: an armored man's plates, a golem's stone, a slime's venom. */
const BITS: Record<string, 'metal' | 'stone' | 'bone' | 'ice' | 'venom' | 'wood'> = {
  huscarl: 'metal', marine: 'metal', cinderguard: 'metal', lamellar: 'metal', tunnelguard: 'metal', lancer: 'metal', warlord: 'metal', jarl: 'metal',
  forgelord: 'metal', underking: 'metal', anchorman: 'metal', medjay: 'metal', scarab: 'metal',
  colossus: 'stone', mudbrute: 'stone', emberbrute: 'stone', icegolem: 'ice', slime: 'venom', mirelord: 'venom',
  packram: 'wood', blaster: 'wood', slagthrower: 'stone',
};

/** Where a hit or a fall is drawn, and where the hero is: what is drawn near them goes under them, never over. */
export interface Near {
  x: number;
  y: number;
}

export class Shapes {
  /** How many of a frame's units a shape is shown at to be so many pixels wide: the shapes are written at different sizes. */
  private widths = new Map<string, number>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Effects,
    private readonly hero: () => Near,
  ) {}

  /** The `from` or `to` that shows `frame` at `px` pixels wide. */
  px(frame: string, px: number): number {
    let w = this.widths.get(frame);
    if (w === undefined) {
      w = this.scene.textures.getFrame(SHEET, frame)?.width ?? 64;
      this.widths.set(frame, w);
    }
    return (px * ART_SCALE) / w;
  }

  /** A depth for something drawn at (x, y): over what stands there, but under the hero when it is close to them. */
  private over(x: number, y: number, by = 30): number {
    const h = this.hero();
    if (Math.abs(x - h.x) < 46 && y + by > h.y - 4 && y < h.y + 30) return h.y - 2;
    return y + by;
  }

  /** How strongly something is drawn at (x, y): faint over the hero, so that they are always seen through it. */
  private seen(x: number, y: number, a: number): number {
    const h = this.hero();
    return Math.hypot(x - h.x, (y - h.y) * 1.4) < 40 ? a * 0.45 : a;
  }

  // ------------------------------------------------------------ blows

  /** The look of a weapon's hit: what it is made of wins over how it is swung, as fire on a torch is what is seen. */
  static look(kinds: readonly string[] | undefined, motion?: string): HitLook {
    const k = kinds ?? [];
    for (const el of ['fire', 'frost', 'holy', 'venom', 'arcane'] as const) if (k.includes(el)) return el;
    if (k.includes('blunt') && (motion === 'slam' || !k.includes('blade'))) return 'blunt';
    return (k[0] as HitLook | undefined) ?? 'blade';
  }

  /**
   * A blow that landed at (x, y), struck from `from` (the angle from the striker to the struck). A crit is bigger,
   * and holds at its full size a moment before it goes.
   */
  hit(x: number, y: number, look: HitLook, crit: boolean, from: number): void {
    const fx = this.fx;
    const big = crit ? 1.6 : 1;
    const hold = crit ? 0.6 : 0.3;
    const d = this.over(x, y);
    const a = this.seen(x, y, 0.95);
    switch (look) {
      case 'blade': {
        // A short cut across the blow, and a chip of metal or two.
        fx.spawn('fx/slash', x, y, { dur: 0.16 * big, from: this.px('fx/slash', 34 * big), to: this.px('fx/slash', 46 * big), rotation: from + Math.PI / 2 + rnd(-0.4, 0.4), alpha: a, hold, depth: d });
        this.chips(x, y, 'fx/shard-metal', crit ? 3 : 1, from, d, 0);
        break;
      }
      case 'pole':
      case 'bow': {
        // A streak along the way it came, and a small star where it went in.
        fx.spawn('fx/stab', x - Math.cos(from) * 14, y - Math.sin(from) * 14, { dur: 0.13 * big, from: this.px('fx/stab', 40 * big), to: this.px('fx/stab', 56 * big), rotation: from, alpha: a, hold, depth: d });
        fx.spawn('fx/spark', x, y, { dur: 0.12 * big, from: this.px('fx/spark', 14 * big), to: this.px('fx/spark', 26 * big), alpha: a, hold, depth: d });
        if (look === 'bow') this.chips(x, y, 'fx/shard-wood', crit ? 2 : 1, from, d, 0);
        break;
      }
      case 'blunt': {
        // A heavy star, the dust it knocks up, and stone off the ground.
        fx.spawn('fx/spark', x, y, { dur: 0.16 * big, from: this.px('fx/spark', 24 * big), to: this.px('fx/spark', 44 * big), rotation: rnd(0, 1), alpha: a, hold, depth: d });
        fx.spawn('fx/dust', x, y + 16, { dur: 0.32, from: this.px('fx/dust', 18), to: this.px('fx/dust', 40 * big), alpha: 0.55, flat: 0.7, depth: y + 2 });
        this.chips(x, y, 'fx/shard-stone', crit ? 4 : 2, from, d, 0);
        if (crit) this.ground('fx/crack', x, y + 18, 44, 0.45, hex(OUTLINE));
        break;
      }
      case 'thrown': {
        fx.spawn('fx/spark', x, y, { dur: 0.13 * big, from: this.px('fx/spark', 18 * big), to: this.px('fx/spark', 32 * big), rotation: rnd(0, 1), alpha: a, hold, depth: d });
        this.chips(x, y, 'fx/shard-stone', crit ? 3 : 1, from, d, 0);
        break;
      }
      case 'fire': {
        // Tongues of flame licking up off the struck, and embers going.
        for (let i = 0; i < (crit ? 3 : 2); i++) {
          fx.spawn('fx/tongue', x + rnd(-10, 10), y + 10, { dur: rnd(0.22, 0.32) * big, from: this.px('fx/tongue', 10), to: this.px('fx/tongue', 22 * big), vy: -40, alpha: a, hold: 0.4, delay: i * 0.04, depth: d });
        }
        this.embers(x, y, crit ? 4 : 2, d);
        break;
      }
      case 'frost': {
        // Shards of ice thrown off, and a crystal that grows where it struck.
        fx.spawn('fx/crystal', x, y + 12, { dur: 0.3 * big, from: this.px('fx/crystal', 12), to: this.px('fx/crystal', 26 * big), alpha: a, hold: 0.5, depth: d });
        this.chips(x, y, 'fx/icicle', crit ? 4 : 2, from, d, 0);
        break;
      }
      case 'holy': {
        fx.spawn('fx/sunburst', x, y, { dur: 0.22 * big, from: this.px('fx/sunburst', 16), to: this.px('fx/sunburst', 40 * big), spin: 1.5, alpha: a, hold, depth: d });
        break;
      }
      case 'venom': {
        for (let i = 0; i < (crit ? 3 : 2); i++) {
          fx.spawn('fx/drip', x + rnd(-10, 10), y + rnd(-6, 4), { dur: 0.4, from: this.px('fx/drip', 8), to: this.px('fx/drip', 12 * big), vx: rnd(-30, 30), vy: rnd(-90, -50), gravity: 420, alpha: a, hold: 0.6, depth: d });
        }
        fx.spawn('fx/bubble', x, y, { dur: 0.25, from: this.px('fx/bubble', 8), to: this.px('fx/bubble', 18 * big), alpha: a, depth: d });
        break;
      }
      case 'arcane': {
        fx.spawn('fx/rune', x, y, { dur: 0.26 * big, from: this.px('fx/rune', 26 * big), to: this.px('fx/rune', 16), tint: hex(ARCANE.light), alpha: a, hold, spin: 2, depth: d });
        fx.spawn('fx/sparkle', x, y, { dur: 0.14, from: this.px('fx/sparkle', 12), to: this.px('fx/sparkle', 26 * big), tint: hex(ARCANE.fill), alpha: a, depth: d });
        break;
      }
    }
  }

  /** Bits knocked off away from the blow: up, out and down again. */
  private chips(x: number, y: number, frame: string, n: number, from: number, depth: number, tint: number): void {
    for (let i = 0; i < n; i++) {
      const a = from + rnd(-0.9, 0.9);
      const speed = rnd(90, 160);
      this.fx.spawn(frame, x, y, {
        dur: rnd(0.3, 0.45), from: this.px(frame, rnd(7, 10)), vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * 0.5 - rnd(80, 140), gravity: 520,
        spin: rnd(-12, 12), rotation: rnd(0, TAU), hold: 0.7, depth, tint: tint || undefined,
      });
    }
  }

  private embers(x: number, y: number, n: number, depth: number): void {
    for (let i = 0; i < n; i++) {
      this.fx.spawn('fx/ember', x + rnd(-8, 8), y + rnd(-6, 6), { dur: rnd(0.4, 0.7), from: this.px('fx/ember', rnd(5, 8)), to: this.px('fx/ember', 2), vx: rnd(-40, 40), vy: rnd(-110, -60), spin: rnd(-6, 6), hold: 0.5, depth });
    }
  }

  /** A mark laid flat on the ground that grows a little and fades: a crack, a scorch. */
  private ground(frame: string, x: number, y: number, size: number, alpha: number, tint: number, dur = 0.7): void {
    this.fx.spawn(frame, x, y, { dur, from: this.px(frame, size * 0.85), to: this.px(frame, size), alpha, flat: 0.6, hold: 0.55, tint, depth: 0.9 });
  }

  // ------------------------------------------------------------ falls

  /** Someone of the other side falls: the dust of the land, and what they were made of breaking off. */
  fall(x: number, y: number, unit: string, land: Land, size: number): void {
    const fx = this.fx;
    const dust = DUST[land];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + rnd(0, 1);
      fx.spawn('fx/dust', x + Math.cos(a) * 10 * size, y - 6, { dur: 0.42, from: this.px('fx/dust', 14 * size), to: this.px('fx/dust', 34 * size), vx: Math.cos(a) * 40, vy: -12, alpha: 0.7, flat: 0.8, hold: 0.4, tint: dust, depth: y + 2, delay: i * 0.03 });
    }
    const bits = BITS[unit];
    const d = this.over(x, y - 20);
    if (bits === 'metal') this.chips(x, y - 20, 'fx/shard-metal', 3, -Math.PI / 2, d, 0);
    else if (bits === 'stone') this.chips(x, y - 20, 'fx/shard-stone', 4, -Math.PI / 2, d, 0);
    else if (bits === 'bone') this.chips(x, y - 20, 'fx/shard-bone', 3, -Math.PI / 2, d, 0);
    else if (bits === 'wood') this.chips(x, y - 20, 'fx/shard-wood', 3, -Math.PI / 2, d, 0);
    else if (bits === 'ice') this.chips(x, y - 20, 'fx/icicle', 4, -Math.PI / 2, d, 0);
    else if (bits === 'venom') for (let i = 0; i < 3; i++) fx.spawn('fx/drip', x + rnd(-12, 12), y - 16, { dur: 0.45, from: this.px('fx/drip', 10), vx: rnd(-50, 50), vy: rnd(-110, -60), gravity: 480, hold: 0.6, depth: d });
    else if (land === 'snow') this.chips(x, y - 16, 'fx/icicle', 2, -Math.PI / 2, d, hex(SNOW.light));
  }

  /** A boss is down: a holy burst over a broken ground and a ring of dust. */
  bossFall(x: number, y: number, land: Land): void {
    this.ground('fx/crack', x, y, 150, 0.6, hex(OUTLINE), 1.4);
    this.fx.spawn('fx/sunburst', x, y - 30, { dur: 0.6, from: this.px('fx/sunburst', 40), to: this.px('fx/sunburst', 190), spin: 0.8, alpha: 0.9, hold: 0.3, depth: 6000 });
    this.dustRing(x, y, 70, 10, DUST[land]);
    this.chips(x, y - 30, 'fx/shard-metal', 5, -Math.PI / 2, y + 20, 0);
  }

  /** A boss comes up out of the ground: the ground breaks under it and the dust goes out. */
  bossArrive(x: number, y: number, land: Land): void {
    this.ground('fx/crack', x, y, 130, 0.55, hex(OUTLINE), 1.6);
    this.dustRing(x, y, 60, 9, DUST[land]);
    this.chips(x, y - 10, 'fx/shard-stone', 6, -Math.PI / 2, y + 10, 0);
  }

  /** Puffs of dust thrown out round a point, as a heavy thing coming down throws them. */
  dustRing(x: number, y: number, r: number, n: number, tint: number): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      this.fx.spawn('fx/dust', x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.18, {
        dur: 0.6, from: this.px('fx/dust', 22), to: this.px('fx/dust', 48), vx: Math.cos(a) * r * 1.6, vy: Math.sin(a) * r * 0.9, alpha: 0.75, flat: 0.8, hold: 0.4, tint, depth: y + Math.sin(a) * r * 0.5,
      });
    }
  }

  // ------------------------------------------------------------ bursts

  /** A blast, a slam, a fall of light: drawn as the thing it is, at its reach on the ground. */
  burst(kind: Burst, x: number, y: number, r: number, land: Land): void {
    const fx = this.fx;
    switch (kind) {
      case 'powder':
      case 'foe': {
        this.ground('fx/crack', x, y, r * 2, 0.5, hex(OUTLINE), 0.9);
        this.dustRing(x, y, r, 7, kind === 'foe' ? DUST[land] : hex(BONE.shade));
        if (kind === 'powder') this.embers(x, y - 10, 6, y + 20);
        fx.spawn('fx/spark', x, y - 10, { dur: 0.18, from: this.px('fx/spark', r * 0.5), to: this.px('fx/spark', r * 1.1), tint: hex(FIRE.light), alpha: 0.9, depth: y + 20 });
        break;
      }
      case 'fire': {
        // A ring of tongues where the fire goes up.
        const n = Math.max(5, Math.round(r / 10));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          const px = x + Math.cos(a) * r * 0.7;
          const py = y + Math.sin(a) * r * 0.7 * 0.62;
          fx.spawn('fx/tongue', px, py, { dur: rnd(0.35, 0.5), from: this.px('fx/tongue', 10), to: this.px('fx/tongue', 26), vy: -30, hold: 0.5, delay: i * 0.015, depth: py + 4 });
        }
        this.embers(x, y - 10, 5, y + 20);
        break;
      }
      case 'slam': {
        this.ground('fx/crack', x, y, r * 2, 0.55, hex(OUTLINE), 0.8);
        this.dustRing(x, y, r, 6, DUST[land]);
        this.chips(x, y - 6, 'fx/shard-stone', 4, -Math.PI / 2, y + 10, 0);
        break;
      }
      case 'light':
      case 'bolt': {
        fx.spawn('fx/sunburst', x, y - 10, { dur: 0.36, from: this.px('fx/sunburst', r * 0.4), to: this.px('fx/sunburst', r * 1.6), spin: 1, alpha: 0.9, hold: 0.3, tint: kind === 'bolt' ? hex(HOLY.light) : undefined, depth: y + 30 });
        for (let i = 0; i < 4; i++) fx.spawn('fx/sparkle', x + rnd(-r, r) * 0.5, y - 10 + rnd(-r, r) * 0.3, { dur: 0.4, from: this.px('fx/sparkle', 10), to: this.px('fx/sparkle', 18), vy: -50, tint: hex(HOLY.light), delay: i * 0.05, depth: y + 30 });
        break;
      }
      case 'venom': {
        fx.spawn('fx/pool', x, y, { dur: 0.6, from: this.px('fx/pool', r * 1.2), to: this.px('fx/pool', r * 2.3), alpha: 0.5, flat: 0.62, tint: hex(VENOM.fill), hold: 0.4, depth: 0.9 });
        for (let i = 0; i < 6; i++) fx.spawn('fx/drip', x + rnd(-r, r) * 0.5, y - 10, { dur: 0.5, from: this.px('fx/drip', 10), vx: rnd(-90, 90), vy: rnd(-160, -90), gravity: 480, hold: 0.6, depth: y + 20 });
        break;
      }
      case 'star': {
        // A star coming down on where it lands, and the ground broken where it did.
        fx.spawn('fx/star5', x, y - 10, { dur: 0.3, from: this.px('fx/star5', r * 0.9), to: this.px('fx/star5', r * 0.3), spin: 4, tint: hex(HOLY.light), hold: 0.6, depth: y + 30 });
        this.ground('fx/crack', x, y, r * 1.6, 0.4, hex(OUTLINE), 0.8);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU;
          fx.spawn('fx/sparkle', x, y - 10, { dur: 0.35, from: this.px('fx/sparkle', 14), to: this.px('fx/sparkle', 6), vx: Math.cos(a) * 140, vy: Math.sin(a) * 80, tint: hex(HOLY.light), depth: y + 30 });
        }
        break;
      }
      case 'frost': {
        const n = Math.max(5, Math.round(r / 12));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + rnd(0, 0.3);
          const px = x + Math.cos(a) * r * rnd(0.3, 0.8);
          const py = y + Math.sin(a) * r * rnd(0.3, 0.8) * 0.62;
          fx.spawn('fx/crystal', px, py, { dur: 0.6, from: this.px('fx/crystal', 10), to: this.px('fx/crystal', 26), hold: 0.6, delay: i * 0.02, depth: py + 4 });
        }
        this.ground('fx/frostpatch', x, y, r * 2, 0.5, hex(FROST.light), 0.8);
        break;
      }
      case 'rain': {
        for (let i = 0; i < 6; i++) fx.spawn('fx/icicle', x + rnd(-r, r) * 0.6, y - 80 + rnd(-10, 10), { dur: 0.25, from: this.px('fx/icicle', 7), vy: 340, tint: hex(BONE.fill), delay: i * 0.03, depth: y + 20 });
        break;
      }
      case 'rise': {
        // The dead coming up: the ground breaks and bone is thrown out of it.
        this.ground('fx/crack', x, y, r * 1.4, 0.5, hex(OUTLINE), 0.8);
        this.chips(x, y - 6, 'fx/shard-bone', 4, -Math.PI / 2, y + 10, 0);
        this.dustRing(x, y, r * 0.6, 5, DUST[land]);
        break;
      }
    }
  }

  // ------------------------------------------------------------ the ground that stays

  /** What a lasting patch of ground is drawn as, and how wide its picture's edge is of the picture: so that it is drawn at its reach. */
  static zoneFrame(kind: ZoneKind): { frame: string; edge: number; tint: number; alpha: number } {
    switch (kind) {
      case 'cloud': return { frame: 'fx/pool', edge: 52 / 128, tint: hex(VENOM.fill), alpha: 0.5 };
      case 'holy': return { frame: 'fx/glyphs', edge: 56 / 128, tint: hex(HOLY.fill), alpha: 0.75 };
      case 'fire': return { frame: 'fx/crack', edge: 58 / 128, tint: hex(FIRE.shade), alpha: 0.7 };
      case 'ice': return { frame: 'fx/frostpatch', edge: 54 / 128, tint: hex(FROST.light), alpha: 0.6 };
      case 'rain': return { frame: 'fx/pool', edge: 52 / 128, tint: hex(BONE.shade), alpha: 0.4 };
      case 'mud': return { frame: 'fx/pool', edge: 52 / 128, tint: hex(LEATHER.fill), alpha: 0.55 };
    }
  }

  /** What rises off a patch of ground while it lasts: bubbles off venom, motes off holy ground, flames off fire, a glint off ice. */
  zoneTick(kind: ZoneKind, x: number, y: number, r: number, dt: number): void {
    // As many a second as the patch is big, so a wide one is as busy as a small one.
    const rate = kind === 'fire' ? r / 9 : r / 22;
    if (Math.random() > rate * dt) return;
    const a = rnd(0, TAU);
    const d = Math.sqrt(Math.random()) * r * 0.8;
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d * 0.62;
    const fx = this.fx;
    if (kind === 'cloud') fx.spawn('fx/bubble', px, py, { dur: 0.5, from: this.px('fx/bubble', 6), to: this.px('fx/bubble', 13), vy: -24, hold: 0.7, depth: py + 2 });
    else if (kind === 'holy') fx.spawn('fx/sparkle', px, py - 6, { dur: 0.8, from: this.px('fx/sparkle', 12), to: this.px('fx/sparkle', 4), vy: -40, tint: hex(HOLY.light), hold: 0.5, depth: py + 2 });
    else if (kind === 'fire') fx.spawn('fx/tongue', px, py, { dur: rnd(0.35, 0.55), from: this.px('fx/tongue', 8), to: this.px('fx/tongue', rnd(16, 24)), vy: -18, hold: 0.5, depth: py + 2 });
    else if (kind === 'ice') fx.spawn('fx/sparkle', px, py - 4, { dur: 0.3, from: this.px('fx/sparkle', 4), to: this.px('fx/sparkle', 12), tint: hex(FROST.light), depth: py + 2 });
  }

  // ------------------------------------------------------------ the hero's own

  /** A level gained: stars going up round them, and a column of them rising. */
  levelUp(x: number, y: number): void {
    const fx = this.fx;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      fx.spawn('fx/star5', x + Math.cos(a) * 28, y - 10 + Math.sin(a) * 12, { dur: 0.9, from: this.px('fx/star5', 14), to: this.px('fx/star5', 6), vy: -90 - (i % 3) * 30, spin: 3, tint: hex(HOLY.light), hold: 0.5, delay: i * 0.04, depth: y + (Math.sin(a) > 0 ? 6 : -6) });
    }
    fx.spawn('fx/sunburst', x, y - 50, { dur: 0.5, from: this.px('fx/sunburst', 20), to: this.px('fx/sunburst', 90), spin: 1, alpha: 0.7, depth: y - 4 });
  }

  /** HP coming back to them: leaves going up off them. */
  mend(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      this.fx.spawn('fx/leaf', x + rnd(-20, 20), y - rnd(30, 70), { dur: 0.7, from: this.px('fx/leaf', 10), to: this.px('fx/leaf', 16), vx: rnd(-20, 20), vy: -50, spin: rnd(-3, 3), rotation: rnd(-0.6, 0.6), hold: 0.5, delay: i * 0.08, depth: y + 30 });
    }
  }

  /** A coin, a sack or a heart has been dropped: a glint where it lies. */
  glint(x: number, y: number, gold: boolean): void {
    this.fx.spawn('fx/sparkle', x + rnd(-6, 6), y - rnd(8, 16), { dur: 0.3, from: this.px('fx/sparkle', 4), to: this.px('fx/sparkle', 14), tint: gold ? hex(HOLY.light) : 0xffffff, hold: 0.4, depth: y });
  }
}
