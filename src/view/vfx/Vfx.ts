// What the hunt looks and feels like beyond its figures: what flies off a
// blow, what a blow leaves on the ground, how the whole screen takes it, and
// the lair breathing round the fight. It is told what has happened, as the
// lair's screen is, and reads the hunt as it stands; it changes nothing that
// happens.
//
// Three rules hold it in:
//   - nothing here is drawn over a tell, the hunter or the bars: the tells
//     are on the sharp camera, which draws after everything here, and what
//     flies is kept small near the hunter;
//   - the screen is moved only as far as a tell stays easy to read, and a
//     player who wants less has CALM (setting.ts);
//   - there is a most for what is alive at once, lower when the machine has
//     had the light taken down for being slow.

import Phaser from 'phaser';
import { sfx } from '../../audio/sfx';
import type { Ev, Hunt, Tell } from '../../game/hunt';
import type { GrimFigure } from '../art/GrimFigure';
import { SHEET } from '../art/Sheet';
import type { LairLight } from '../light/LairLight';
import { lightMode } from '../light/setting';
import { Bits, type BitSpec } from './Bits';
import { Decals } from './Decals';
import { Feel } from './Feel';
import { feelShare } from './setting';

/** What the lair hands the effects: its figures and its time. */
export interface Stage {
  scene: Phaser.Scene;
  hunt: Hunt;
  light: LairLight;
  hunter(): GrimFigure;
  monster(): GrimFigure | null;
  /** How tall the boss stands. */
  tall(): number;
  /** Holds the lair nearly still for a moment, and slows it for a while. */
  stop(seconds: number): void;
  slow(seconds: number, by: number): void;
  /** Where crows sit: the tops of the walls, the gate and the trees, in the field's units. */
  perches: ReadonlyArray<readonly [number, number]>;
}

/** What the ground of each lair is made of, as it flies. */
const GROUNDS: Record<string, { clod: number; chip: number; dust: number; deep: number; snow: boolean; leaf: number }> = {
  churchyard: { clod: 0x3b2d22, chip: 0xd8cdb0, dust: 0x75664f, deep: 0x0d0a08, snow: false, leaf: 0x7a4a22 },
  wood: { clod: 0xe4ecf0, chip: 0xbfe0f2, dust: 0xcdd8de, deep: 0x1a2630, snow: true, leaf: 0xe8f0f6 },
};

const BLOOD = 0x8c1418;
const FRESH = 0xc8201c;
const SPARK = 0xffe9a8;
const GOLD = 0xffd858;
const IRON = 0x8a9096;

/** Each hunter's blow, as it is left in the air. */
const SWINGS: Record<string, { color: number; width: number; arc: number; fire?: boolean; thrust?: boolean }> = {
  marta: { color: 0xe8dfc6, width: 26, arc: 1.9 },
  agnes: { color: 0xff9a3c, width: 18, arc: 1.5, fire: true },
  brask: { color: 0xd8d2c0, width: 12, arc: 0.4, thrust: true },
  jory: { color: 0xe0dccc, width: 6, arc: 0.3, thrust: true },
};

interface Swing {
  x: number;
  y: number;
  angle: number;
  r: number;
  arc: number;
  width: number;
  color: number;
  dir: number;
  t: number;
  dur: number;
  thrust: boolean;
  /** Whose: the hunter's, drawn with them, or the boss's, drawn with him. */
  boss: boolean;
}

interface Ghost {
  img: Phaser.GameObjects.Image;
  t: number;
  dur: number;
  a0: number;
}

interface Crow {
  img: Phaser.GameObjects.Image;
  home: readonly [number, number];
  state: 'sit' | 'fly' | 'gone';
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  /** Seconds before it comes back to its perch. */
  back: number;
}

interface Bank {
  img: Phaser.GameObjects.Image;
  u: number;
  speed: number;
  y: number;
  scale: number;
  layer: number;
}

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
/** Where a ring sits round a figure's middle: so many of them, at these heights and sides of its body. */
const CRACKS: Array<[number, number, number]> = [
  [0.05, 0.55, 0.3], [-0.12, 0.42, -0.6], [0.16, 0.68, 1.2], [-0.04, 0.78, 0.1], [0.2, 0.36, -1.1], [-0.18, 0.62, 2.2], [0.02, 0.28, 0.8], [0.1, 0.86, -0.4],
];

export class Vfx {
  readonly feel: Feel;
  private readonly bits: Bits;
  private readonly decals: Decals;
  /** The ground darkening where a blow will fall. */
  private readonly gather: Phaser.GameObjects.Graphics;
  private readonly heroSwings: Phaser.GameObjects.Graphics;
  private readonly bossSwings: Phaser.GameObjects.Graphics;
  private swings: Swing[] = [];
  private ghosts: Ghost[] = [];
  private spareGhosts: Phaser.GameObjects.Image[] = [];
  private ghostAt = 0;
  private readonly cracks: Phaser.GameObjects.Image[] = [];
  private crackFlare = 0;
  private crows: Crow[] = [];
  private banks: Bank[] = [];
  private leafAt = 0;
  private emberAt = 0;
  private dashStep = 0;
  private hoofSide = 1;
  private clock = 0;
  private hunterWhite = 0;
  private monsterWhite = 0;
  private lowBeat = 0;
  private readonly ground: (typeof GROUNDS)[string];
  private readonly lair: string;

  constructor(private readonly stage: Stage) {
    const scene = stage.scene;
    this.lair = stage.hunt.monster.def.lair;
    this.ground = GROUNDS[this.lair] ?? GROUNDS.churchyard;
    this.feel = new Feel(scene, (obj) => stage.light.crisp(obj));
    this.bits = new Bits(scene, 200, (img, shine) => {
      if (shine) stage.light.shine(img);
    });
    this.decals = new Decals(scene, 1.5);
    this.gather = scene.add.graphics().setDepth(1.4);
    this.heroSwings = scene.add.graphics();
    this.bossSwings = scene.add.graphics();
    for (let i = 0; i < CRACKS.length; i++) {
      const img = scene.add.image(0, 0, SHEET, 'vfx/split').setTint(GOLD).setVisible(false);
      this.cracks.push(stage.light.shine(img));
    }
    this.makeCrows();
    this.makeFog();
  }

  // ------------------------------------------------------------ the lair breathing

  private makeCrows(): void {
    for (const home of this.stage.perches) {
      const img = this.stage.scene.add.image(home[0], home[1], SHEET, 'vfx/perch').setTint(0x1c1e24).setDepth(home[1] + 1).setScale(rnd(0.9, 1.15));
      if (Math.random() < 0.5) img.setFlipX(true);
      this.crows.push({ img, home, state: 'sit', x: home[0], y: home[1], vx: 0, vy: 0, t: rnd(0, 6), back: 0 });
    }
  }

  /** Low banks of fog, far behind and on the field: the cold of the place, drifting. */
  private makeFog(): void {
    const h = this.stage.hunt;
    const cold = this.ground.snow ? 0xe2ecf2 : 0xa8b8c2;
    const layers: Array<[number, number, number, number]> = [
      // Depth, height on the field as a share, alpha, how many.
      [-85, 0.12, 0.55, 4],
      [-60, 0.3, 0.3, 3],
      [8950, 0.98, 0.24, 3],
    ];
    layers.forEach(([depth, at, alpha, n], li) => {
      for (let i = 0; i < n; i++) {
        const scale = rnd(2.2, 3.4) * (li === 2 ? 1.3 : 1);
        const img = this.stage.scene.add.image(0, 0, SHEET, 'vfx/fog').setTint(cold).setAlpha(alpha * rnd(0.7, 1)).setDepth(depth).setScale(scale, scale * 0.8);
        if (li === 2) img.setScrollFactor(1.1, 1.04);
        this.banks.push({ img, u: i / n + rnd(-0.08, 0.08), speed: rnd(0.004, 0.01) * (li === 2 ? 1.6 : 1) * (Math.random() < 0.5 ? -1 : 1), y: at * h.h + rnd(-20, 20), scale, layer: li });
      }
    });
  }

  private breathe(dt: number): void {
    const s = this.stage;
    const h = s.hunt;
    const span = h.w + 600;
    for (const b of this.banks) {
      b.u = (((b.u + b.speed * dt) % 1) + 1) % 1;
      b.img.setPosition(-300 + b.u * span, b.y + Math.sin(this.clock * 0.3 + b.u * 9) * 6);
    }
    // Leaves in the churchyard, snow is already in the wood's air: a few, blown across.
    this.leafAt -= dt;
    if (this.leafAt <= 0 && !this.ground.snow) {
      this.leafAt = rnd(0.25, 0.6);
      const cam = s.scene.cameras.main;
      const x = cam.worldView.x + rnd(-40, cam.worldView.width);
      const y = cam.worldView.y + rnd(0, cam.worldView.height * 0.7);
      this.bits.spawn(x, y + 120, { shape: 'leaf', size: rnd(9, 14), dur: rnd(3, 5), vx: rnd(30, 70), vy: rnd(10, 30), z: 120, vz: -rnd(18, 34), gravity: 0.01, spin: rnd(-3, 3), sway: rnd(1.5, 3), tint: this.ground.leaf, alpha: 0.85, hold: 0.8, flat: 0.8 });
    }
    // Embers off the torches: they climb past the flame and go out high up.
    this.emberAt -= dt;
    if (this.emberAt <= 0) {
      this.emberAt = rnd(0.08, 0.2);
      for (const b of h.buildings) {
        if (b.def.kind === 'fire' && Math.random() < 0.6) this.ember(b.x + rnd(-8, 8), b.y, 50);
      }
      for (const p of h.pools) if (p.burning > 0 && Math.random() < 0.5) this.ember(p.x + rnd(-p.r, p.r) * 0.7, p.y, 10);
    }
    // Crows: they sit, now and then shift, and fly off when something big comes down.
    for (const c of this.crows) {
      if (c.state === 'sit') {
        c.t -= dt;
        if (c.t <= 0) {
          c.t = rnd(3, 8);
          c.img.setFlipX(!c.img.flipX);
        }
        continue;
      }
      if (c.state === 'fly') {
        c.t += dt;
        c.vy -= 30 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.img.setPosition(c.x, c.y).setFrame(Math.floor(c.t * 11) % 2 === 0 ? 'vfx/crow0' : 'vfx/crow1').setFlipX(c.vx < 0).setDepth(9100);
        if (c.t > 4) {
          c.state = 'gone';
          c.img.setVisible(false);
        }
        continue;
      }
      c.back -= dt;
      if (c.back <= 0) {
        c.state = 'sit';
        c.x = c.home[0];
        c.y = c.home[1];
        c.img.setFrame('vfx/perch').setPosition(c.x, c.y).setDepth(c.y + 1).setVisible(true);
      }
    }
  }

  private ember(x: number, y: number, z: number): void {
    this.bits.spawn(x, y, { shape: 'ember', size: rnd(3, 6), to: 0.3, dur: rnd(1.2, 2.2), z, vz: rnd(60, 110), vx: rnd(-14, 14), drag: 0.3, sway: rnd(2, 4), tint: 0xffa040, shine: true, front: 60, hold: 0.5 });
  }

  /** Something big came down: every crow within reach of it takes off. */
  private scare(x: number, y: number, reach: number): void {
    for (const c of this.crows) {
      if (c.state !== 'sit' || Math.hypot(c.x - x, c.y - y) > reach) continue;
      c.state = 'fly';
      c.t = rnd(-0.05, 0.1);
      const away = c.x >= x ? 1 : -1;
      c.vx = away * rnd(120, 200);
      c.vy = -rnd(110, 170);
      c.back = rnd(10, 16);
      sfx.play('lift', 0.25, rnd(1.6, 1.9));
    }
  }

  // ------------------------------------------------------------ pieces of effects

  private throw(x: number, y: number, n: number, o: Partial<BitSpec> & { spread: number; speed: number; up: number; angle?: number; cone?: number }): void {
    const shine = o.shine;
    for (let i = 0; i < n; i++) {
      const a = o.angle !== undefined ? o.angle + rnd(-(o.cone ?? Math.PI), o.cone ?? Math.PI) : rnd(0, Math.PI * 2);
      const sp = o.speed * rnd(0.45, 1);
      const ok = this.bits.spawn(x + rnd(-o.spread, o.spread), y + rnd(-o.spread, o.spread) * 0.5, {
        shape: o.shape ?? 'chip', size: (o.size ?? 10) * rnd(0.7, 1.25), to: o.to, dur: (o.dur ?? 0.8) * rnd(0.8, 1.2), delay: o.delay, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.55,
        vz: o.up * rnd(0.6, 1.1), z: o.z ?? 8, gravity: o.gravity ?? 900, drag: o.drag ?? 0.6, bounce: o.bounce ?? 0.3, spin: rnd(-12, 12), turn: o.turn, stretch: o.stretch, tint: o.tint ?? 0xffffff, alpha: o.alpha,
        hold: o.hold ?? 0.55, front: o.front ?? 20, flat: o.flat, shine,
      });
      if (!ok) return;
    }
  }

  /** A ring of dust rolling out along the ground. */
  private dustWave(x: number, y: number, r: number, color: number, n = 14): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd(-0.15, 0.15);
      const d = r * 0.35;
      this.bits.spawn(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, {
        shape: 'puff', size: rnd(34, 52) * Math.min(1.6, 0.6 + r / 120), to: 1.7, dur: rnd(0.55, 0.8), vx: Math.cos(a) * r * 1.6, vy: Math.sin(a) * r * 0.95, drag: 3.2, tint: color, alpha: 0.55, hold: 0.25, flat: 0.55, front: 4,
      });
    }
  }

  /** Smoke: grey puffs that climb and spread. */
  private smoke(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      this.bits.spawn(x + rnd(-14, 14), y, { shape: 'puff', size: rnd(26, 40), to: 2.2, dur: rnd(1.1, 1.7), delay: i * 0.04, z: rnd(10, 30), vz: rnd(30, 55), vx: rnd(-16, 16), drag: 0.4, tint: 0x3a3634, alpha: 0.45, hold: 0.2, front: 70 });
    }
  }

  /** Sparks of a blow: splinters of light flung along the way it went. */
  private sparks(x: number, y: number, angle: number, n: number, speed: number, color = SPARK, z = 50): void {
    // The point of the blow: a star of short splinters, there and gone in a tenth of a second.
    for (let i = 0; i < 7; i++) {
      const a = angle + Math.PI / 2 + (i / 7) * Math.PI * 2;
      this.bits.spawn(x, y, { shape: 'shard', size: 30, to: 1.6, dur: 0.1, rotation: a, z, vx: Math.cos(a) * 10, vy: Math.sin(a) * 10, tint: 0xffffff, front: 90, shine: true, hold: 0.3 });
    }
    this.throw(x, y, n, { shape: 'shard', size: 26, to: 0.4, dur: 0.28, speed, up: 220, angle, cone: 0.9, z, gravity: 700, drag: 1.6, bounce: 0, turn: true, stretch: 1.2, tint: color, hold: 0.4, front: 80, shine: true, spread: 6 });
  }

  /** Blood out of a wound, flung the way the blow went; what lands lies a while. */
  private blood(x: number, y: number, angle: number, n: number, z: number): void {
    this.throw(x, y, n, { shape: 'drop', size: 15, dur: 1.6, speed: 260, up: 170, angle, cone: 0.7, z, gravity: 900, drag: 0.8, bounce: 0, turn: true, tint: BLOOD, hold: 0.7, front: 40, spread: 6, flat: 0.5 });
    // A few drops of it bright: the one red the style keeps for what matters.
    this.throw(x, y, Math.ceil(n / 3), { shape: 'drop', size: 8, dur: 1.2, speed: 320, up: 200, angle, cone: 0.5, z, gravity: 900, drag: 0.8, bounce: 0, turn: true, tint: FRESH, hold: 0.6, front: 45, spread: 4, flat: 0.5 });
    if (Math.random() < 0.7) {
      const d = rnd(30, 70);
      this.decals.put(x + Math.cos(angle) * d, y + Math.sin(angle) * d * 0.55, { shape: 'splat', length: rnd(28, 44), tint: BLOOD, alpha: 0.7, life: 10, rotation: rnd(-0.3, 0.3) });
    }
  }

  // ------------------------------------------------------------ what has happened

  react(events: readonly Ev[]): void {
    const s = this.stage;
    const w = s.hunt;
    const h = w.hunter;
    const m = w.monster;
    const struck = events.some((e) => e.t === 'hit');
    for (const e of events) {
      switch (e.t) {
        case 'wake':
          this.dustWave(m.x, m.y, 220, this.ground.dust, 18);
          this.scare(m.x, m.y, 2000);
          this.feel.rumble(0.7, 7);
          break;
        case 'strike':
          this.swing(e.x, e.y, e.angle, e.reach, e.kind, struck);
          break;
        case 'loose':
          // A bolt leaves the bow with a puff and a kick.
          if (e.from === 'hunter') {
            this.bits.spawn(e.x, e.y, { shape: 'puff', size: 18, to: 1.8, dur: 0.35, vx: Math.cos(e.angle) * 60, vy: Math.sin(e.angle) * 40, z: 26, tint: 0x9a9080, alpha: 0.5, hold: 0.2, front: 60 });
            this.feel.kick(e.angle + Math.PI, 0.6);
          }
          break;
        case 'hit':
          this.hit(e);
          break;
        case 'hurt':
          if (e.who === 'hunter') {
            const a = Math.atan2(h.y - m.y, h.x - m.x);
            this.blood(h.x, h.y, a, 6, 34);
            this.hunterWhite = 0.06;
            this.feel.kick(a, 4 + Math.min(6, e.amount / 4));
            this.feel.flash(0x7a0a08, 0.18);
          } else this.throw(e.x, e.y, 4, { shape: 'chip', size: 8, speed: 160, up: 200, tint: IRON, spread: 8, dur: 0.6 });
          break;
        case 'land':
          if (e.foe) this.land(e.id, e.kind, e.x, e.y, e.r);
          break;
        case 'roll':
          this.dustWave(e.x, e.y, 40, this.ground.dust, 6);
          this.ghostAt = 0;
          break;
        case 'dodged':
          // Through it, untouched: the lair slows for a breath to let it be seen.
          s.slow(0.32 * feelShare().stop, 0.45);
          this.feel.flash(0xffffff, 0.08);
          this.throw(e.x, e.y, 8, { shape: 'streak', size: 26, to: 0.2, dur: 0.25, speed: 340, up: 0, gravity: 0, z: 30, drag: 3, turn: true, tint: 0xdfeaff, front: 80, shine: true, spread: 10 });
          break;
        case 'turned': {
          // A blow stopped on the shield: iron rings, sparks fly back the way it came.
          const a = Math.atan2(m.y - h.y, m.x - h.x);
          this.sparks(h.x + Math.cos(a) * 24, h.y, a, 14, 520);
          this.ironRing(h.x, h.y, 56);
          this.feel.kick(a + Math.PI, 5);
          s.stop(0.09 * feelShare().stop);
          break;
        }
        case 'ability':
          this.skill(e.id, e.x, e.y, e.r, e.tx, e.ty);
          break;
        case 'open':
          if (e.why === 'crash') this.scare(m.x, m.y, 900);
          break;
        case 'broken':
          this.broken(e.x, e.y);
          break;
        case 'shift':
          this.dustWave(m.x, m.y, 260, this.ground.dust, 20);
          this.scare(m.x, m.y, 2000);
          this.feel.rumble(0.9, 6);
          this.decals.put(m.x, m.y, { shape: 'burst', length: 300, tint: this.ground.deep, alpha: 0.8, life: 14, grow: 0.3 });
          break;
        case 'dash':
          this.dashStep = 0;
          this.feel.rumble(0.4, 3);
          break;
        case 'crash':
          // Into stone or a barricade: it breaks, and what it was made of flies.
          this.throw(e.x, e.y, 18, { shape: 'chip', size: 14, speed: 380, up: 420, tint: e.into === 'stone' ? 0x8a8c86 : 0x6a4a2c, spread: 16, dur: 1.4, bounce: 0.35, front: 60 });
          this.dustWave(e.x, e.y, 160, this.ground.dust, 16);
          this.decals.put(e.x, e.y, { shape: 'burst', length: 200, tint: this.ground.deep, alpha: 0.8, life: 12 });
          this.feel.kick(Math.atan2(e.y - m.y, e.x - m.x), 9);
          this.feel.punch(0.03);
          this.scare(e.x, e.y, 1200);
          s.stop(0.12 * feelShare().stop);
          break;
        case 'summon':
          // Out of the earth: soil thrown up, and the hole it came out of.
          this.throw(e.x, e.y, 10, { shape: 'clod', size: 10, speed: 120, up: 380, tint: this.ground.clod, spread: 10, dur: 1.1, bounce: 0.2, front: 30 });
          this.decals.put(e.x, e.y + 4, { shape: 'scorch', length: 64, tint: this.ground.deep, alpha: 0.85, life: 12 });
          break;
        case 'blast':
          this.throw(e.x, e.y, 16, { shape: 'clod', size: 12, speed: 340, up: 460, tint: this.ground.clod, spread: e.r * 0.3, dur: 1.3, bounce: 0.3, front: 40 });
          this.decals.put(e.x, e.y, { shape: 'scorch', length: e.r * 2.2, tint: 0x080605, alpha: 0.85, life: 14 });
          this.smoke(e.x, e.y, 6);
          this.feel.punch(0.025);
          this.scare(e.x, e.y, 900);
          break;
        case 'alight':
          this.decals.put(e.x, e.y, { shape: 'scorch', length: e.r * 2.4, tint: 0x0a0604, alpha: 0.7, life: 16 });
          for (let i = 0; i < 10; i++) this.ember(e.x + rnd(-e.r, e.r) * 0.7, e.y + rnd(-e.r, e.r) * 0.35, 6);
          break;
        case 'trap':
          // Iron jaws shut on it: teeth and blood.
          this.throw(e.x, e.y, 8, { shape: 'shard', size: 14, speed: 260, up: 260, tint: IRON, spread: 6, dur: 0.6, turn: true, front: 60 });
          this.blood(e.x, e.y, rnd(0, Math.PI * 2), 6, 20);
          this.feel.kick(-Math.PI / 2, 3);
          break;
        case 'mend':
          for (let i = 0; i < 8; i++) {
            this.bits.spawn(e.x + rnd(-18, 18), e.y + rnd(-4, 4), { shape: 'ember', size: rnd(4, 7), to: 0.4, dur: rnd(0.8, 1.2), delay: i * 0.05, z: rnd(10, 30), vz: rnd(60, 100), tint: 0xbdf09a, shine: true, sway: 3, front: 80, hold: 0.5 });
          }
          break;
        case 'fall':
          if (e.who === 'monster') this.fallen(e.x, e.y);
          else if (e.who === 'hunter') this.feel.dim(2.2, 0.5);
          else if (e.who === 'helper') this.throw(e.x, e.y, 6, { shape: 'chip', size: 9, speed: 140, up: 220, tint: this.ground.chip, spread: 10, dur: 0.9 });
          break;
        default:
          break;
      }
    }
  }

  private hit(e: Extract<Ev, { t: 'hit' }>): void {
    const s = this.stage;
    const h = s.hunt.hunter;
    const a = Math.atan2(e.y - h.y, e.x - h.x);
    const boss = e.who === 'monster';
    const tall = boss ? s.tall() : 40;
    const z = boss ? tall * 0.45 : 26;
    const x = e.x - Math.cos(a) * (boss ? s.hunt.monster.def.r * 0.4 : 6);
    if (boss) {
      // A boss is half the screen: struck, he goes white only for a big blow or one in his opening, and for an instant.
      if (e.big || e.open) this.monsterWhite = 0.035;
      this.sparks(x, e.y, a, e.big ? 14 : 8, e.big ? 560 : 420, SPARK, z);
      this.blood(x, e.y, a, e.big ? 7 : 3, z);
      if (e.big) this.throw(x, e.y, 6, { shape: 'chip', size: 10, speed: 260, up: 300, angle: a, cone: 0.8, tint: this.ground.chip, spread: 8, dur: 1, front: 40 });
      if (e.open) {
        // A blow in his opening stings: a ring of gold splinters off it, and it is felt more.
        this.throw(x, e.y, 10, { shape: 'shard', size: 22, to: 0.3, dur: 0.32, speed: 460, up: 160, z, gravity: 300, drag: 2, turn: true, stretch: 1.4, tint: GOLD, shine: true, front: 90, spread: 4 });
        s.light.flash(x, e.y - z, 180, 0xffd870, 0.45, 0.18);
        sfx.play('hit', 0.35, 1.5);
      }
      const stop = (e.big ? 0.07 : e.open ? 0.04 : 0.022) * feelShare().stop;
      s.stop(stop);
      this.feel.kick(a, e.big ? 5 : e.open ? 3 : 1.6);
      if (e.big) this.feel.punch(0.018);
    } else {
      // A helper: the risen are bone, the herd is flesh.
      this.sparks(x, e.y, a, 4, 300);
      this.throw(x, e.y, 4, { shape: 'chip', size: 8, speed: 220, up: 220, angle: a, cone: 0.9, tint: this.ground.chip, spread: 4, dur: 0.8 });
      this.feel.kick(a, 1);
    }
  }

  /** A blow of the hunter's, left in the air as the weapon's own shape; a blow that met nothing whistles through. */
  private swing(x: number, y: number, angle: number, reach: number, kind: 'arc' | 'bolt', struck: boolean): void {
    const who = this.stage.hunt.hunter.def.id;
    const look = SWINGS[who] ?? SWINGS.marta;
    const thrust = kind === 'bolt' || !!look.thrust;
    this.swings.push({
      x, y: y - 30, angle, r: reach * (thrust ? 1 : 0.78), arc: look.arc, width: look.width * (struck ? 1 : 0.7), color: struck ? look.color : 0xb8b2a4, dir: Math.random() < 0.5 ? 1 : -1, t: 0, dur: thrust ? 0.12 : 0.17, thrust, boss: false,
    });
    if (look.fire) {
      // Her pole leaves fire along its path.
      for (let i = 0; i < 7; i++) {
        const k = i / 6;
        const aa = angle + (k - 0.5) * look.arc;
        this.ember(x + Math.cos(aa) * reach * 0.75, y + Math.sin(aa) * reach * 0.45, 30);
      }
    }
    if (!struck) sfx.play('lift', 0.25, 1.7);
  }

  /** A boss's blow lands: what it does to the ground, along the shape it was told in. */
  private land(id: number, kind: Tell['kind'], x: number, y: number, r: number): void {
    const s = this.stage;
    const m = s.hunt.monster;
    const t = this.told.get(id);
    this.told.delete(id);
    const g = this.ground;
    const boss = !t || t.by === 0;
    const size = kind === 'line' && t ? t.len : r;
    const heavy = boss && size > 60;
    if (kind === 'line' && t) {
      // A spade brought down ploughs a furrow; earth is flung out to both sides along it.
      const len = t.len;
      this.decals.put(t.x, t.y, { shape: 'furrow', length: len, width: t.w * 0.7, rotation: t.angle, tint: g.deep, alpha: 0.85, life: 12, grow: 0.16 });
      for (let i = 0; i < 3; i++) this.decals.put(t.x + Math.cos(t.angle) * len * (0.2 + i * 0.3), t.y + Math.sin(t.angle) * len * (0.2 + i * 0.3), { shape: 'crack', length: rnd(50, 90), rotation: t.angle + rnd(-1.2, 1.2), tint: 0x000000, alpha: 0.7, life: 10 });
      const n = Math.min(24, Math.round(len / 18));
      for (let i = 0; i < n; i++) {
        const k = i / n;
        const px = t.x + Math.cos(t.angle) * len * k;
        const py = t.y + Math.sin(t.angle) * len * k;
        const side = i % 2 === 0 ? 1 : -1;
        this.throw(px, py, 1, { shape: g.snow ? 'clod' : i % 3 === 0 ? 'chip' : 'clod', size: rnd(8, 14), speed: 200, up: rnd(260, 420), angle: t.angle + side * Math.PI / 2, cone: 0.4, tint: i % 3 === 0 ? g.chip : g.clod, spread: 4, dur: 1.2, delay: k * 0.08, bounce: 0.25, front: 20 });
        if (i % 2 === 0) this.bits.spawn(px, py, { shape: 'puff', size: rnd(34, 48), to: 1.6, dur: 0.6, delay: k * 0.08, vx: Math.cos(t.angle + side * Math.PI / 2) * 90, vy: Math.sin(t.angle + side * Math.PI / 2) * 60, drag: 2.5, tint: g.dust, alpha: 0.5, hold: 0.25, flat: 0.55, front: 4 });
      }
      this.feel.kick(t.angle, heavy ? 6 : 3);
    } else if (kind === 'cone' && t) {
      // A sweep: cracks across its arc, and what was in the way thrown out of it.
      for (let i = 0; i < 4; i++) {
        const aa = t.angle + rnd(-t.half, t.half);
        this.decals.put(t.x + Math.cos(aa) * t.r * 0.35, t.y + Math.sin(aa) * t.r * 0.35 * 0.6, { shape: 'crack', length: t.r * rnd(0.4, 0.6), rotation: aa, tint: 0x000000, alpha: 0.7, life: 10 });
      }
      this.throw(t.x + Math.cos(t.angle) * t.r * 0.6, t.y + Math.sin(t.angle) * t.r * 0.4, 14, { shape: g.snow ? 'shard' : 'clod', size: 12, speed: 380, up: 240, angle: t.angle, cone: t.half, tint: g.snow ? 0xd8f0ff : g.clod, spread: t.r * 0.2, dur: 1, bounce: 0.25, turn: g.snow, front: 30, shine: false });
      this.dustWave(t.x + Math.cos(t.angle) * t.r * 0.5, t.y + Math.sin(t.angle) * t.r * 0.3, t.r * 0.5, g.dust, 8);
      this.feel.kick(t.angle, heavy ? 5 : 2.5);
    } else {
      // A ring: something came down in the middle of it. The ground breaks in a star and a wave of dust rolls out.
      this.decals.put(x, y, { shape: 'burst', length: Math.max(80, r * 1.8), tint: 0x000000, alpha: 0.75, life: 11, grow: 0.1 });
      this.dustWave(x, y, r, g.dust, Math.min(20, 8 + Math.round(r / 12)));
      this.throw(x, y, Math.min(16, 4 + Math.round(r / 10)), { shape: g.snow ? 'clod' : 'chip', size: 11, speed: r * 2.2, up: 420, tint: g.snow ? g.clod : g.chip, spread: r * 0.25, dur: 1.2, bounce: 0.3, front: 20 });
      if (boss) this.feel.kick(Math.PI / 2, heavy ? 6 : 2.5);
    }
    if (heavy) {
      this.feel.rumble(0.25, 3);
      if (size > 140) this.feel.punch(0.015);
      this.scare(x, y, 700);
      sfx.play('thud', 0.45, rnd(0.55, 0.7));
    }
    void m;
  }

  private ironRing(x: number, y: number, r: number): void {
    this.swings.push({ x, y: y - 20, angle: 0, r, arc: Math.PI * 2, width: 8, color: IRON, dir: 1, t: 0, dur: 0.3, thrust: false, boss: false });
    this.throw(x, y, 6, { shape: 'shard', size: 12, speed: 220, up: 80, tint: 0xd0d6dc, spread: r * 0.4, dur: 0.4, turn: true, gravity: 500, front: 80, shine: true });
  }

  private skill(id: string, x: number, y: number, r: number, tx: number, ty: number): void {
    const s = this.stage;
    const h = s.hunt.hunter;
    switch (id) {
      case 'brace':
        this.ironRing(h.x, h.y, 46);
        sfx.play('hit', 0.3, 0.6);
        break;
      case 'reap':
        this.swings.push({ x: h.x, y: h.y - 26, angle: h.aim, r: r * 0.85, arc: Math.PI * 2, width: 30, color: 0xe8dfc6, dir: 1, t: 0, dur: 0.24, thrust: false, boss: false });
        this.dustWave(h.x, h.y, r, this.ground.dust, 12);
        this.feel.rumble(0.18, 3);
        break;
      case 'jawtrap':
        this.throw(tx, ty, 6, { shape: 'clod', size: 8, speed: 80, up: 160, tint: this.ground.clod, spread: 6, dur: 0.6 });
        break;
      case 'tarflask':
        // The flask breaks: tar splashes out in a ring of black drops.
        this.throw(tx, ty, 12, { shape: 'drop', size: 10, speed: 220, up: 180, tint: 0x0c0a08, spread: 6, dur: 0.9, turn: true, front: 30 });
        sfx.play('hit', 0.4, 0.5);
        break;
      case 'flare':
        // Blinding white, then the smoke of it.
        this.feel.flash(0xfff4dc, 0.5);
        this.feel.punch(0.02);
        this.smoke(x, y - 10, 6);
        this.throw(x, y, 16, { shape: 'shard', size: 20, to: 0.2, speed: 600, up: 200, z: 40, gravity: 200, drag: 2.4, turn: true, stretch: 1.6, tint: 0xfff4dc, spread: 6, dur: 0.4, shine: true, front: 90 });
        break;
      case 'lamp':
        this.throw(x, y, 8, { shape: 'ember', size: 5, speed: 60, up: 140, z: 30, gravity: 120, tint: 0xffd890, spread: 6, dur: 1, shine: true, front: 60 });
        break;
      case 'seton':
        // The dogs go for it: a streak behind each, and dust kicked up where they leave from.
        for (const a of s.hunt.allies) {
          if (a.group !== 'hound' || a.state === 'down') continue;
          const ang = Math.atan2(ty - a.y, tx - a.x);
          this.throw(a.x, a.y, 5, { shape: 'streak', size: 40, to: 0.3, dur: 0.3, speed: 500, up: 0, angle: ang, cone: 0.1, gravity: 0, z: 20, drag: 4, turn: true, tint: 0xd6d0c0, front: 40, spread: 6 });
          this.dustWave(a.x, a.y, 30, this.ground.dust, 5);
        }
        this.feel.kick(Math.atan2(ty - h.y, tx - h.x), 2);
        break;
      case 'heel':
        for (let i = 0; i < 10; i++) this.bits.spawn(h.x + rnd(-24, 24), h.y, { shape: 'ember', size: rnd(4, 7), to: 0.4, dur: 1.1, delay: i * 0.04, z: 10, vz: rnd(60, 100), tint: 0xbdf09a, shine: true, sway: 3, front: 80 });
        break;
      default:
        break;
    }
  }

  /** The stagger breaks: the biggest moment of a hunt. */
  private broken(x: number, y: number): void {
    const s = this.stage;
    const tall = s.tall();
    this.crackFlare = 0.6;
    // Every crack in him bursts: splinters of light off each.
    for (const c of this.cracks) {
      if (!c.visible) continue;
      this.throw(c.x, c.y + tall * 0.5, 5, { shape: 'shard', size: 24, to: 0.2, speed: 520, up: 260, z: y - c.y, gravity: 500, drag: 1.5, turn: true, stretch: 1.4, tint: GOLD, shine: true, front: 120, spread: 4, dur: 0.6 });
    }
    this.throw(x, y, 22, { shape: 'shard', size: 26, to: 0.2, speed: 680, up: 300, z: tall * 0.5, gravity: 400, drag: 1.6, turn: true, stretch: 1.6, tint: GOLD, shine: true, front: 120, spread: 10, dur: 0.7 });
    this.dustWave(x, y, 260, this.ground.dust, 20);
    this.decals.put(x, y, { shape: 'burst', length: 320, tint: 0x000000, alpha: 0.8, life: 14, grow: 0.2 });
    this.feel.dim(1.4, 0.55);
    this.feel.dimDepth = y;
    this.feel.flash(0xfff0c0, 0.35);
    this.feel.punch(0.04);
    s.light.gutter(1.6);
    this.scare(x, y, 3000);
    sfx.play('thud', 0.8, 0.5);
  }

  /** The boss falls: the lair slows, a last light, ash and embers, and the dark lifts. */
  private fallen(x: number, y: number): void {
    const s = this.stage;
    const tall = s.tall();
    s.stop(0.22 * feelShare().stop);
    s.slow(2.4, 0.3);
    this.feel.dim(2.4, 0.4);
    this.feel.dimDepth = y;
    this.feel.flash(0xfff0c0, 0.18);
    this.feel.punch(0.05);
    this.scare(x, y, 4000);
    // He hits the ground a moment later: a wave of dust and the ground broken under him.
    this.dustWave(x, y, 340, this.ground.dust, 22);
    this.decals.put(x, y, { shape: 'burst', length: 380, tint: 0x000000, alpha: 0.85, life: 30, grow: 0.4 });
    for (let i = 0; i < 46; i++) {
      // Ash comes down over him, slowly; embers go up out of him.
      this.bits.spawn(x + rnd(-120, 120), y + rnd(-30, 30), { shape: 'ash', size: rnd(4, 8), dur: rnd(3, 5), delay: rnd(0, 1.2), z: rnd(tall * 0.4, tall * 1.3), vz: -rnd(14, 30), gravity: 0.01, vx: rnd(-10, 10), spin: rnd(-2, 2), sway: rnd(1, 2.5), tint: 0x5a5652, alpha: 0.85, hold: 0.75, front: 100 });
      if (i % 2 === 0) this.bits.spawn(x + rnd(-60, 60), y, { shape: 'ember', size: rnd(3, 6), to: 0.3, dur: rnd(1.6, 2.6), delay: rnd(0, 0.8), z: rnd(10, tall * 0.6), vz: rnd(50, 120), sway: rnd(2, 4), tint: 0xffa040, shine: true, front: 100 });
    }
    sfx.play('blast', 0.7, 0.45);
    sfx.play('thud', 0.9, 0.5);
  }

  // ------------------------------------------------------------ every frame

  /** The tells as they were told, so that a blow landing can be drawn along its shape. */
  private readonly told = new Map<number, Tell>();

  /** Called before the lair is drawn: what changes with the hunt as it stands. */
  update(dt: number, clock: number, halted: boolean): void {
    const s = this.stage;
    const w = s.hunt;
    const h = w.hunter;
    const m = w.monster;
    this.clock = clock;
    // As much as the machine can take: fewer when the game has had to take the light down.
    const mode = lightMode();
    this.bits.most = mode === 'full' ? 260 : mode === 'low' ? 140 : 90;
    for (const t of w.tells) if (!this.told.has(t.id)) this.told.set(t.id, { ...t });
    if (this.told.size > w.tells.length + 30) for (const id of [...this.told.keys()]) if (!w.tells.some((t) => t.id === id)) this.told.delete(id);

    if (!halted) {
      this.gathering(dt);
      this.breathe(dt);
      // The rolling hunter leaves after-images of themselves.
      if (h.roll > 0) {
        this.ghostAt -= dt;
        if (this.ghostAt <= 0) {
          this.ghostAt = 0.035;
          this.ghost(s.hunter(), 0x8ab8ff, 0.5);
        }
      }
      // A charge kicks up the ground behind him and leaves hoof marks.
      if (m.state === 'dash') {
        this.dashStep += dt;
        if (this.dashStep > 0.05) {
          this.dashStep = 0;
          const back = m.face > 0 ? Math.PI : 0;
          this.throw(m.x - m.face * m.def.r * 0.5, m.y, 3, { shape: 'clod', size: 12, speed: 220, up: 300, angle: back, cone: 0.6, tint: this.ground.clod, spread: 10, dur: 1, bounce: 0.25, front: 20 });
          this.hoofSide = -this.hoofSide;
          this.decals.put(m.x + rnd(-10, 10), m.y + this.hoofSide * 14, { shape: 'hoof', length: 22, tint: this.ground.deep, alpha: 0.75, life: 9, grow: 0 });
          this.feel.rumble(0.12, 1.5);
        }
      }
    }
    this.cracking(dt, clock);
    this.hurtMood(dt);
    this.bits.update(dt);
    this.decals.update(dt);
    this.drawSwings(dt);
    this.fadeGhosts(dt);
    // The screen's knock and flash go by real time: a blow that holds the lair still must not hold its flash too.
    const real = Math.min(0.1, s.scene.game.loop.delta / 1000);
    this.feel.update(real);
    // A struck figure goes flat white for a moment: real time, so that a blow that holds the lair does not hold it white.
    this.hunterWhite = Math.max(0, this.hunterWhite - real);
    this.monsterWhite = Math.max(0, this.monsterWhite - real);
    const hf = s.hunter();
    hf.fill = this.hunterWhite > 0;
    if (hf.fill) hf.tint = 0xffffff;
    const mf = s.monster();
    if (mf) {
      mf.fill = this.monsterWhite > 0;
      if (mf.fill) mf.tint = 0xffffff;
    }
  }

  /** Where a boss's blow will fall, the ground darkens as the moment comes; dust is drawn in to his feet. */
  private gathering(dt: number): void {
    const s = this.stage;
    const w = s.hunt;
    const m = w.monster;
    const g = this.gather;
    g.clear();
    let most = 0;
    for (const t of w.tells) {
      if (!t.foe || t.by !== 0) continue;
      const k = Math.max(0, Math.min(1, 1 - t.left / t.of));
      most = Math.max(most, k);
      const a = 0.32 * k * k;
      g.fillStyle(0x000000, a);
      if (t.kind === 'ring') {
        if (t.inner > 0) g.lineStyle(t.r - t.inner, 0x000000, a).strokeCircle(t.x, t.y, (t.r + t.inner) / 2);
        else g.fillCircle(t.x, t.y, t.r);
      } else if (t.kind === 'cone') g.slice(t.x, t.y, t.r, t.angle - t.half, t.angle + t.half, false).fillPath();
      else {
        const cx = Math.cos(t.angle);
        const cy = Math.sin(t.angle);
        const nx = -cy * (t.w / 2);
        const ny = cx * (t.w / 2);
        g.fillPoints([new Phaser.Math.Vector2(t.x + nx, t.y + ny), new Phaser.Math.Vector2(t.x + cx * t.len + nx, t.y + cy * t.len + ny), new Phaser.Math.Vector2(t.x + cx * t.len - nx, t.y + cy * t.len - ny), new Phaser.Math.Vector2(t.x - nx, t.y - ny)], true);
      }
    }
    if (most > 0.15 && Math.random() < dt * 40 * most) {
      // Dust and grit drawn in along the ground to where he stands.
      const a = rnd(0, Math.PI * 2);
      const d = rnd(140, 220);
      this.bits.spawn(m.x + Math.cos(a) * d, m.y + Math.sin(a) * d * 0.6, { shape: 'puff', size: rnd(14, 22), to: 0.4, dur: 0.5, vx: -Math.cos(a) * d * 1.6, vy: -Math.sin(a) * d, drag: 0.5, tint: this.ground.dust, alpha: 0.45, hold: 0.4, flat: 0.6, front: 2 });
    }
  }

  /** Cracks of light open in the boss as his stagger fills; when it breaks they burst, and close as it empties. */
  private cracking(dt: number, clock: number): void {
    const s = this.stage;
    const m = s.hunt.monster;
    const fig = s.monster();
    const fill = m.staggerMax > 0 ? m.stagger / m.staggerMax : 0;
    const broken = m.state === 'broken';
    this.crackFlare = Math.max(0, this.crackFlare - dt);
    const tall = s.tall();
    const x = fig ? fig.x : m.x;
    const y = fig ? fig.y : m.y;
    const width = m.def.r * 1.0;
    for (let i = 0; i < this.cracks.length; i++) {
      const c = this.cracks[i];
      const [ox, oy, rot] = CRACKS[i];
      const on = m.state !== 'dead' && m.state !== 'asleep' && (broken || fill > (i + 0.5) / this.cracks.length);
      if (!on) {
        c.setVisible(false);
        continue;
      }
      const flick = 0.75 + 0.25 * Math.sin(clock * 13 + i * 2.3);
      const big = broken ? 0.7 + this.crackFlare : 0.45;
      c.setVisible(true).setPosition(x + ox * width * m.face, y - oy * tall).setRotation(rot).setScale(big).setAlpha((broken ? 1 : 0.55 + 0.45 * fill) * flick).setDepth(y + 30);
    }
  }

  private hurtMood(dt: number): void {
    const h = this.stage.hunt.hunter;
    const low = h.hp > 0 ? Math.max(0, Math.min(1, (0.4 - h.hp / h.maxHp) / 0.3)) : 0;
    this.lowBeat += (low - this.lowBeat) * Math.min(1, dt * 3);
    this.stage.light.hurt = this.lowBeat;
  }

  private drawSwings(dt: number): void {
    const s = this.stage;
    const hg = this.heroSwings;
    const bg = this.bossSwings;
    hg.clear();
    bg.clear();
    hg.setDepth(s.hunter().y + 30);
    bg.setDepth(s.hunt.monster.y + 60);
    for (const sw of this.swings) {
      sw.t += dt;
      const k = sw.t / sw.dur;
      if (k >= 1) continue;
      const g = sw.boss ? bg : hg;
      const a = 1 - k * k;
      if (sw.thrust) {
        // A thrust: a narrow wedge out along the line, its point running ahead.
        const reach = sw.r * (0.5 + 0.5 * Math.min(1, k * 3));
        const ux = Math.cos(sw.angle);
        const uy = Math.sin(sw.angle) * 0.75;
        const nx = -uy;
        const ny = ux;
        const wdt = sw.width * (1 - k);
        g.fillStyle(sw.color, 0.85 * a).fillTriangle(sw.x + nx * wdt, sw.y + ny * wdt, sw.x - nx * wdt, sw.y - ny * wdt, sw.x + ux * reach, sw.y + uy * reach);
        continue;
      }
      // A cut: a crescent swept round from one side to the other, thick in the middle and thin at its ends.
      const sweep = Math.min(1, k * 2.5);
      const from = sw.angle - (sw.arc / 2) * sw.dir;
      const to = from + sw.arc * sw.dir * sweep;
      const n = 14;
      const outer: Phaser.Math.Vector2[] = [];
      const inner: Phaser.Math.Vector2[] = [];
      for (let i = 0; i <= n; i++) {
        const q = i / n;
        const ang = from + (to - from) * q;
        const thick = sw.width * Math.sin(q * Math.PI) * (1 - k * 0.6);
        outer.push(new Phaser.Math.Vector2(sw.x + Math.cos(ang) * sw.r, sw.y + Math.sin(ang) * sw.r * 0.62));
        inner.push(new Phaser.Math.Vector2(sw.x + Math.cos(ang) * (sw.r - thick), sw.y + Math.sin(ang) * (sw.r - thick) * 0.62));
      }
      g.fillStyle(sw.color, 0.8 * a).fillPoints([...outer, ...inner.reverse()], true);
    }
    if (this.swings.some((sw) => sw.t >= sw.dur)) this.swings = this.swings.filter((sw) => sw.t < sw.dur);
  }

  /** A copy of a figure as it stands, left behind to fade: a dodge leaves a trail of them. */
  private ghost(fig: GrimFigure, tint: number, alpha: number): void {
    const m = new Phaser.GameObjects.Components.TransformMatrix();
    const d = new Phaser.GameObjects.Components.TransformMatrix();
    for (const part of fig.parts) {
      if (!part.visible) continue;
      const img = this.spareGhosts.pop() ?? this.stage.scene.add.image(0, 0, SHEET, part.frame.name);
      part.getWorldTransformMatrix(m, d);
      const q = m.decomposeMatrix();
      img.setTexture(SHEET, part.frame.name).setPosition(q.translateX, q.translateY).setRotation(q.rotation).setScale(q.scaleX, q.scaleY).setVisible(true).setDepth(fig.y - 1);
      img.setTint(tint).setTintMode(Phaser.TintModes.FILL).setAlpha(alpha);
      this.ghosts.push({ img, t: 0, dur: 0.24, a0: alpha });
    }
  }

  private fadeGhosts(dt: number): void {
    for (const g of this.ghosts) {
      g.t += dt;
      g.img.alpha = g.a0 * Math.max(0, 1 - g.t / g.dur);
      if (g.t >= g.dur) {
        g.img.setVisible(false);
        this.spareGhosts.push(g.img);
      }
    }
    if (this.ghosts.some((g) => g.t >= g.dur)) this.ghosts = this.ghosts.filter((g) => g.t < g.dur);
  }

  /** Lays the screen's knock and lean on the view, which has just been put where it follows. */
  apply(cam: Phaser.Cameras.Scene2D.Camera, baseZoom: number): void {
    this.feel.apply(cam, baseZoom);
  }

  /** A shake from the lair itself, with no line to it. */
  rumble(ms: number, by: number): void {
    this.feel.rumble(ms / 1000, by * 600);
  }
}
