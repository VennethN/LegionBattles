// One wave, as it is fought: the hero, whoever comes at them, what flies
// between them and what is left on the ground. It knows nothing of the
// screen. A screen tells it which way the hero is steered and steps it, and
// shows what it finds here; a test or the pace report does the same with
// no screen at all.
//
// The same seed and the same steering give the same wave, to the last
// coin: every roll comes from the wave's own dice.
//
// Distances are in the arena's units and times in seconds.

import {
  ARENA, GATHER_SECONDS, HEART, HERO_RADIUS, HERO_SPEED, HURT_GRACE, LEECH_GAP, MARK_CLEAR, MARK_SECONDS, PICKUP_RADIUS, RING_SHARE, WEAPONS, ENEMIES, byId, coinShare, enemyAt, waveOf,
  type EnemyDef, type Flag, type WaveDef, type WeaponDef,
} from './data';
import { Rng } from './rng';
import { DODGE_CAP, armorShare, hasteRate, type Stats } from './stats';

/** The step the wave is worked out in. A screen that draws faster or slower takes as many of these as the time needs. */
export const STEP = 1 / 60;

export interface Carried {
  id: string;
  /** 0 to 3. */
  tier: number;
}

export interface Setup {
  seed: number;
  wave: number;
  stats: Stats;
  flag: Flag;
  weapons: readonly Carried[];
  /** True for a window that is taller than it is wide: the arena is stood on end. */
  tall?: boolean;
}

/** Which way the hero is steered: a length of 1 is flat out. */
export interface Steer {
  x: number;
  y: number;
}

export interface Hero {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  face: 1 | -1;
  moving: boolean;
  /** Seconds left in which nothing can hurt them. */
  grace: number;
  /** Seconds they are slowed for, and by what share. */
  chill: number;
  chillBy: number;
}

export type FoeState = 'walk' | 'aim' | 'dash' | 'rest';

export interface Foe {
  id: number;
  def: EnemyDef;
  x: number;
  y: number;
  /** How fast it is being thrown, which dies away. */
  kx: number;
  ky: number;
  hp: number;
  maxHp: number;
  dmg: number;
  face: 1 | -1;
  state: FoeState;
  /** Seconds left in its state. */
  left: number;
  /** Seconds until it may next shoot, charge or call. */
  cool: number;
  /** A charge's way. */
  dx: number;
  dy: number;
  /** What it is winding up to do, while it aims. */
  doing: 'shot' | 'charge' | 'burst' | 'call' | 'ring' | '';
  /** A boss's place in its round of things to do. */
  turn: number;
  slow: number;
  slowBy: number;
  stun: number;
  burn: number;
  burnBy: number;
  burnTick: number;
  moving: boolean;
  /** True while a drum is near it. */
  spurred: boolean;
  boss: boolean;
  dead: boolean;
}

export interface Shot {
  id: number;
  mine: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  crit: boolean;
  /** How many more it may go through. */
  pierce: number;
  leaps: number;
  life: number;
  art: string;
  knock: number;
  /** Who it has hit already. */
  seen: number[];
  /** The weapon it came from, and its tier: what it does when it lands is read from there. */
  from: WeaponDef | null;
  tier: number;
  /** Who a bolt bends toward. */
  mark: number;
  /** A thing thrown: where it will land, how long its flight is, and how far through it is. */
  lob: { x0: number; y0: number; x1: number; y1: number; of: number; at: number } | null;
  chills: number;
  /** Whose it is, for an enemy's. */
  by: string;
}

/** A place that goes on doing harm: fire on the ground, a cloud. */
export interface Zone {
  id: number;
  x: number;
  y: number;
  r: number;
  by: number;
  life: number;
  tick: number;
  kind: 'cloud';
}

export interface Mark {
  id: number;
  x: number;
  y: number;
  left: number;
  def: EnemyDef;
  boss: boolean;
}

export type PickKind = 'coin' | 'heart' | 'pack';

export interface Pick {
  id: number;
  kind: PickKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  /** True once it is coming to the hero. */
  pulled: boolean;
  age: number;
}

export interface Slot {
  def: WeaponDef;
  tier: number;
  /** Seconds until it may strike again. */
  cool: number;
  /** Which way it last struck. */
  angle: number;
  /** Seconds since it last struck, for the screen to move it by. */
  since: number;
}

export type Burst = 'powder' | 'fire' | 'slam' | 'light' | 'venom' | 'foe';

export type Ev =
  | { t: 'mark'; id: number; x: number; y: number; boss: boolean }
  | { t: 'stand'; id: number }
  | { t: 'strike'; slot: number; angle: number; x: number; y: number; range: number }
  | { t: 'loose'; slot: number; angle: number; shot: number }
  | { t: 'hit'; id: number; x: number; y: number; amount: number; crit: boolean; soft: boolean }
  | { t: 'fall'; id: number; x: number; y: number; boss: boolean; swept: boolean }
  | { t: 'burst'; x: number; y: number; r: number; kind: Burst }
  | { t: 'hurt'; amount: number; x: number; y: number }
  | { t: 'dodge' }
  | { t: 'mend'; amount: number }
  | { t: 'take'; kind: PickKind; value: number }
  | { t: 'aim'; id: number; doing: Foe['doing']; seconds: number; dx: number; dy: number }
  | { t: 'foeShot'; id: number }
  | { t: 'gather' }
  | { t: 'end'; cleared: boolean };

const TAU = Math.PI * 2;

/**
 * Where a weapon floats beside the hero, from their feet. One alone is at
 * their side, where a hand would hold it; more go round them in a ring,
 * the first at their side still.
 */
export function slotPlace(i: number, n: number): { x: number; y: number } {
  const a = (i * TAU) / Math.max(1, n);
  return { x: Math.cos(a) * 42, y: -30 + Math.sin(a) * 26 };
}

export class World {
  readonly wave: WaveDef;
  readonly w: number;
  readonly h: number;
  readonly hero: Hero;
  readonly slots: Slot[];
  foes: Foe[] = [];
  shots: Shot[] = [];
  zones: Zone[] = [];
  marks: Mark[] = [];
  picks: Pick[] = [];
  /** What has happened since the screen last asked: it takes these and empties the list. */
  events: Ev[] = [];
  time = 0;
  /** Coins gathered this wave, with Bounty in them, and the experience they were worth. */
  gold = 0;
  xp = 0;
  kills = 0;
  packs = 0;
  /** The bosses that fell this wave, by name. */
  felled: string[] = [];
  /** How much each kind of enemy took off the hero this wave, and who landed the last blow. */
  hurtBy: Record<string, number> = {};
  lastBy = '';
  /** Null while the wave goes on. */
  over: 'cleared' | 'dead' | null = null;
  /** Seconds left of the gathering after the wave, or -1 before it. */
  gathering = -1;

  private readonly rng: Rng;
  private readonly stats: Stats;
  private readonly flag: Flag;
  private ids = 1;
  private nextBand = 0.4;
  private regen = 0;
  private leechAt = 0;
  private bossDue: string | undefined;
  private bossId = 0;

  constructor(setup: Setup) {
    this.wave = waveOf(setup.wave);
    this.w = setup.tall ? ARENA.short : ARENA.long;
    this.h = setup.tall ? ARENA.long : ARENA.short;
    this.rng = new Rng(setup.seed);
    this.stats = setup.stats;
    this.flag = setup.flag;
    const maxHp = Math.max(1, Math.round(setup.stats.maxHp));
    this.hero = { x: this.w / 2, y: this.h / 2, hp: maxHp, maxHp, face: 1, moving: false, grace: 0, chill: 0, chillBy: 0 };
    this.slots = setup.weapons.map((c) => ({ def: byId(WEAPONS, c.id), tier: c.tier, cool: 0.35, angle: 0, since: 9 }));
    this.bossDue = this.wave.boss;
  }

  /** Seconds left of the wave. */
  get left(): number {
    return Math.max(0, this.wave.seconds - this.time);
  }

  /** The boss, while one stands. */
  get boss(): Foe | null {
    return this.bossId ? (this.foes.find((f) => f.id === this.bossId) ?? null) : null;
  }

  /** How far off a weapon strikes, with the hero's Reach in it. */
  rangeOf(def: WeaponDef): number {
    const reach = def.kind === 'melee' ? this.stats.reach * 0.5 : this.stats.reach;
    const drive = this.flag === 'drive' && def.motion === 'thrust' ? 25 : 0;
    return Math.max(40, def.range + reach + drive);
  }

  /** How many seconds a weapon takes between strikes, with the hero's Haste in it. */
  everyOf(slot: Slot): number {
    const focus = this.flag === 'focus' && slot.def.kind === 'magic' ? 1.2 : 1;
    return slot.def.every[slot.tier] / (hasteRate(this.stats.haste) * focus);
  }

  step(steer: Steer, dt = STEP): void {
    if (this.over) return;
    this.time += dt;
    this.moveHero(steer, dt);
    if (this.gathering < 0) {
      this.muster();
      this.standMarks(dt);
      this.moveFoes(dt);
      this.strike(dt);
    }
    this.moveShots(dt);
    this.seethe(dt);
    this.gather(dt);
    this.bury();
    this.finish(dt);
  }

  // ------------------------------------------------------------ the hero

  private moveHero(steer: Steer, dt: number): void {
    const h = this.hero;
    h.grace = Math.max(0, h.grace - dt);
    h.chill = Math.max(0, h.chill - dt);
    let x = steer.x;
    let y = steer.y;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    h.moving = len > 0.08;
    if (h.moving) {
      const pace = HERO_SPEED * Math.max(0.3, 1 + this.stats.speed / 100) * (h.chill > 0 ? 1 - h.chillBy : 1);
      h.x += x * pace * dt;
      h.y += y * pace * dt;
      if (Math.abs(x) > 0.15) h.face = x > 0 ? 1 : -1;
    }
    h.x = Math.max(ARENA.edge, Math.min(this.w - ARENA.edge, h.x));
    h.y = Math.max(ARENA.edge + 30, Math.min(this.h - ARENA.edge, h.y));
    // Mending is a trickle: this much every ten seconds.
    if (this.stats.regen > 0 && h.hp < h.maxHp) {
      this.regen += (this.stats.regen / 10) * dt;
      if (this.regen >= 1) {
        this.regen -= 1;
        h.hp = Math.min(h.maxHp, h.hp + 1);
        this.events.push({ t: 'mend', amount: 1 });
      }
    }
  }

  /** Gives the hero health back. A heart, a ring of light and a leech are one more for whoever carries the halo. */
  private mend(amount: number): void {
    const h = this.hero;
    if (h.hp >= h.maxHp || this.over) return;
    const by = amount + (this.flag === 'halo' ? 1 : 0);
    const before = h.hp;
    h.hp = Math.min(h.maxHp, h.hp + by);
    if (h.hp > before) this.events.push({ t: 'mend', amount: h.hp - before });
  }

  /** A blow lands on the hero, unless they step out of it. */
  private hurt(dmg: number, fromX: number, fromY: number, by: string, chills = 0): void {
    const h = this.hero;
    if (h.grace > 0 || this.over || this.gathering >= 0) return;
    if (this.rng.chance(Math.min(DODGE_CAP, Math.max(0, this.stats.dodge)) / 100)) {
      h.grace = HURT_GRACE * 0.5;
      this.events.push({ t: 'dodge' });
      return;
    }
    let amount = Math.max(1, Math.round(dmg * armorShare(this.stats.armor)));
    if (this.flag === 'plate') amount = Math.max(1, amount - 1);
    h.hp -= amount;
    h.grace = HURT_GRACE;
    this.hurtBy[by] = (this.hurtBy[by] ?? 0) + amount;
    this.lastBy = by;
    if (chills > 0) {
      h.chill = 2;
      h.chillBy = chills;
    }
    this.events.push({ t: 'hurt', amount, x: fromX, y: fromY });
    if (h.hp <= 0) {
      h.hp = 0;
      this.over = 'dead';
      this.events.push({ t: 'end', cleared: false });
    }
  }

  // ------------------------------------------------------------ who comes

  /** Marks the ground where the next band will stand. */
  private muster(): void {
    if (this.bossDue && this.time >= 2) {
      const def = byId(ENEMIES, this.bossDue);
      this.bossDue = undefined;
      const at = this.farFrom(this.hero.x, this.hero.y, 380);
      this.mark(def, at.x, at.y, true);
    }
    if (this.time < this.nextBand) return;
    this.nextBand = this.time + this.wave.gap * this.rng.range(0.85, 1.15);
    const room = this.wave.most - this.foes.length - this.marks.length;
    if (room <= 0) return;
    const n = Math.min(room, this.wave.band);
    // They come from every side at once, each to a mark of its own: a band that came in one knot could be led round the field for ever.
    const turn = this.rng.next() * TAU;
    for (let i = 0; i < n; i++) {
      const def = byId(ENEMIES, this.rng.weighted(this.wave.mix, (m) => m[1])[0]);
      const at = this.ringed(turn + (i * TAU) / n + this.rng.range(-0.5, 0.5));
      this.mark(def, at.x, at.y, false);
    }
  }

  /** A place on the field off the hero in about this direction, far enough to be seen coming, or the nearest such place there is. */
  private ringed(angle: number): { x: number; y: number } {
    const h = this.hero;
    for (let i = 0; i < 6; i++) {
      const a = angle + i * 1.05;
      const d = this.rng.range(MARK_CLEAR + 30, MARK_CLEAR + 260);
      const x = h.x + Math.cos(a) * d;
      const y = h.y + Math.sin(a) * d;
      if (x > ARENA.edge + 10 && x < this.w - ARENA.edge - 10 && y > ARENA.edge + 40 && y < this.h - ARENA.edge - 10) return { x, y };
    }
    return this.farFrom(h.x, h.y, MARK_CLEAR);
  }

  /** A place on the field at least `clear` from a point. */
  private farFrom(x: number, y: number, clear: number): { x: number; y: number } {
    let best = { x: this.w / 2, y: this.h / 2 };
    let bestD = -1;
    for (let i = 0; i < 12; i++) {
      const p = { x: this.rng.range(ARENA.edge + 20, this.w - ARENA.edge - 20), y: this.rng.range(ARENA.edge + 50, this.h - ARENA.edge - 20) };
      const d = Math.hypot(p.x - x, p.y - y);
      if (d >= clear) return p;
      if (d > bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }

  private mark(def: EnemyDef, x: number, y: number, boss: boolean): void {
    const m: Mark = {
      id: this.ids++,
      x: Math.max(ARENA.edge, Math.min(this.w - ARENA.edge, x)),
      y: Math.max(ARENA.edge + 30, Math.min(this.h - ARENA.edge, y)),
      left: boss ? MARK_SECONDS * 1.6 : MARK_SECONDS,
      def,
      boss,
    };
    this.marks.push(m);
    this.events.push({ t: 'mark', id: m.id, x: m.x, y: m.y, boss });
  }

  private standMarks(dt: number): void {
    for (const m of this.marks) m.left -= dt;
    for (const m of this.marks) {
      if (m.left > 0) continue;
      const at = enemyAt(m.def, this.wave.n);
      const f: Foe = {
        id: m.id, def: m.def, x: m.x, y: m.y, kx: 0, ky: 0, hp: at.hp, maxHp: at.hp, dmg: at.dmg, face: this.hero.x >= m.x ? 1 : -1,
        state: 'walk', left: 0, cool: (m.def.every ?? 2) * this.rng.range(0.4, 1), dx: 0, dy: 0, doing: '', turn: 0,
        slow: 0, slowBy: 0, stun: 0, burn: 0, burnBy: 0, burnTick: 0, moving: false, spurred: false, boss: m.boss, dead: false,
      };
      if (m.boss) this.bossId = f.id;
      this.foes.push(f);
      this.events.push({ t: 'stand', id: f.id });
    }
    this.marks = this.marks.filter((m) => m.left > 0);
  }

  // ------------------------------------------------------------ how they fight

  private moveFoes(dt: number): void {
    const h = this.hero;
    const drums = this.foes.filter((f) => f.def.ai === 'boost' && !f.dead);
    for (const f of this.foes) {
      if (f.dead) continue;
      f.cool -= dt;
      f.moving = false;
      if (f.burn > 0) this.smolder(f, dt);
      if (f.dead) continue;
      f.slow = Math.max(0, f.slow - dt);
      // What throws it back dies away quickly: it is a shove, not a flight.
      f.x += f.kx * dt;
      f.y += f.ky * dt;
      const fade = Math.exp(-9 * dt);
      f.kx *= fade;
      f.ky *= fade;
      if (f.stun > 0) {
        f.stun -= dt;
        this.touch(f);
        continue;
      }
      f.spurred = false;
      for (const d of drums) {
        if (d !== f && Math.hypot(d.x - f.x, d.y - f.y) < (d.def.aura ?? 0)) {
          f.spurred = true;
          break;
        }
      }
      const pace = f.def.speed * (f.slow > 0 ? 1 - f.slowBy : 1) * (f.spurred ? 1.3 : 1);
      const dx = h.x - f.x;
      const dy = h.y - f.y;
      const d = Math.hypot(dx, dy) || 1;
      if (f.state !== 'dash') f.face = dx >= 0 ? 1 : -1;

      if (f.state === 'aim') {
        f.left -= dt;
        if (f.left <= 0) this.loose(f);
      } else if (f.state === 'dash') {
        f.left -= dt;
        f.x += f.dx * (f.def.dash ?? 400) * dt;
        f.y += f.dy * (f.def.dash ?? 400) * dt;
        f.moving = true;
        if (f.left <= 0) {
          f.state = 'rest';
          f.left = f.boss ? 0.5 : 0.9;
        }
      } else if (f.state === 'rest') {
        f.left -= dt;
        if (f.left <= 0) f.state = 'walk';
      } else {
        this.think(f, dx / d, dy / d, d, pace, dt);
      }
      f.x = Math.max(ARENA.edge - 10, Math.min(this.w - ARENA.edge + 10, f.x));
      f.y = Math.max(ARENA.edge + 10, Math.min(this.h - ARENA.edge + 10, f.y));
      this.touch(f);
    }
    this.jostle();
  }

  /** What a foe that is free to act does this step. `ux`, `uy` point at the hero, who is `d` off. */
  private think(f: Foe, ux: number, uy: number, d: number, pace: number, dt: number): void {
    const go = (x: number, y: number, share = 1): void => {
      f.x += x * pace * share * dt;
      f.y += y * pace * share * dt;
      f.moving = true;
    };
    const aim = (doing: Foe['doing'], seconds: number): void => {
      f.state = 'aim';
      f.left = seconds;
      f.doing = doing;
      f.dx = ux;
      f.dy = uy;
      this.events.push({ t: 'aim', id: f.id, doing, seconds, dx: ux, dy: uy });
    };
    // Keeps its distance: comes on when far, backs off when near, and sidles between.
    const hold = (keep: number): void => {
      if (d > keep + 30) go(ux, uy);
      else if (d < keep - 70) go(-ux, -uy, 0.7);
      else go(-uy * (f.id % 2 ? 1 : -1), ux * (f.id % 2 ? 1 : -1), 0.35);
    };
    switch (f.def.ai) {
      case 'walk':
        go(ux, uy);
        break;
      case 'shoot':
        hold(f.def.keep ?? 260);
        if (f.cool <= 0 && d < (f.def.keep ?? 260) + 150) aim('shot', 0.55);
        break;
      case 'charge':
        if (d < 280 && f.cool <= 0) aim('charge', 0.75);
        else go(ux, uy);
        break;
      case 'bomb':
        if (d < 52) aim('burst', 0.6);
        else go(ux, uy);
        break;
      case 'summon':
        hold(f.def.keep ?? 320);
        if (f.cool <= 0) aim('call', 0.6);
        break;
      case 'boost':
        hold(f.def.keep ?? 300);
        break;
      case 'boss': {
        go(ux, uy);
        if (f.cool > 0) break;
        // A boss does its things in a round: a charge, a ring of shots, a call.
        const round: Foe['doing'][] = ['charge', 'ring', 'call'];
        const doing = round[f.turn % round.length];
        f.turn++;
        if (doing === 'charge' && d > 360) aim('ring', 0.7);
        else aim(doing, doing === 'charge' ? 0.8 : 0.7);
        break;
      }
    }
  }

  /** What a foe was winding up to do, it does. */
  private loose(f: Foe): void {
    const h = this.hero;
    const def = f.def;
    f.state = 'walk';
    switch (f.doing) {
      case 'shot': {
        const d = Math.hypot(h.x - f.x, h.y - f.y) || 1;
        this.foeShot(f, (h.x - f.x) / d, (h.y - f.y) / d);
        f.cool = (def.every ?? 2.6) * this.rng.range(0.85, 1.15);
        break;
      }
      case 'ring': {
        const n = 10;
        const turn = this.rng.next() * TAU;
        for (let i = 0; i < n; i++) this.foeShot(f, Math.cos(turn + (i * TAU) / n), Math.sin(turn + (i * TAU) / n), RING_SHARE);
        f.cool = def.every ?? 2.4;
        break;
      }
      case 'charge':
        f.state = 'dash';
        f.left = f.boss ? 0.7 : 0.62;
        f.cool = f.boss ? (def.every ?? 2.4) : 2.2;
        break;
      case 'burst':
        this.events.push({ t: 'burst', x: f.x, y: f.y, r: def.burst ?? 80, kind: 'foe' });
        if (Math.hypot(h.x - f.x, h.y - f.y) < (def.burst ?? 80) + HERO_RADIUS) this.hurt(f.dmg, f.x, f.y, def.id);
        // It is spent: it leaves nothing, and is nobody's kill.
        f.dead = true;
        this.events.push({ t: 'fall', id: f.id, x: f.x, y: f.y, boss: false, swept: true });
        break;
      case 'call': {
        const who = byId(ENEMIES, def.calls ?? 'cutpurse');
        const n = f.boss ? 4 : 2;
        for (let i = 0; i < n && this.foes.length + this.marks.length < this.wave.most + 6; i++) {
          const a = this.rng.next() * TAU;
          this.mark(who, f.x + Math.cos(a) * 60, f.y + Math.sin(a) * 60, false);
        }
        f.cool = f.boss ? (def.every ?? 2.4) : (def.every ?? 5.5);
        break;
      }
      default:
        break;
    }
    f.doing = '';
  }

  private foeShot(f: Foe, ux: number, uy: number, share = 1): void {
    const speed = f.def.flies ?? 210;
    const s: Shot = {
      id: this.ids++, mine: false, x: f.x + ux * (f.def.r + 6), y: f.y - 14 + uy * (f.def.r + 6), vx: ux * speed, vy: uy * speed, r: 7, dmg: Math.max(1, Math.round(f.dmg * share)), crit: false,
      pierce: 0, leaps: 0, life: 3.4, art: f.def.chills ? 'orb-frost' : 'orb-red', knock: 0, seen: [], from: null, tier: 0, mark: 0, lob: null, chills: f.def.chills ?? 0, by: f.def.id,
    };
    this.shots.push(s);
    this.events.push({ t: 'foeShot', id: s.id });
  }

  /** A foe that reaches the hero hurts them. One that is running through them hurts more. */
  private touch(f: Foe): void {
    const h = this.hero;
    if (f.dead || f.state === 'aim') return;
    if (Math.hypot(h.x - f.x, h.y - f.y) < f.def.r + HERO_RADIUS) this.hurt(f.state === 'dash' ? Math.round(f.dmg * 1.5) : f.dmg, f.x, f.y, f.def.id);
  }

  /** Foes do not stand in one another: where two overlap, each gives way. */
  private jostle(): void {
    const list = this.foes;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.dead) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.dead) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const need = (a.def.r + b.def.r) * 0.9;
        if (Math.abs(dx) >= need || Math.abs(dy) >= need) continue;
        const d = Math.hypot(dx, dy);
        if (d >= need) continue;
        // Two on one spot are parted along a way that is always the same for those two.
        const ux = d > 0.01 ? dx / d : Math.cos(a.id + b.id);
        const uy = d > 0.01 ? dy / d : Math.sin(a.id + b.id);
        const push = (need - d) * 0.5;
        // A boss does not give way.
        const sa = a.boss ? 0 : b.boss ? 1 : 0.5;
        a.x -= ux * push * sa * 2;
        a.y -= uy * push * sa * 2;
        b.x += ux * push * (1 - sa) * 2;
        b.y += uy * push * (1 - sa) * 2;
      }
    }
  }

  // ------------------------------------------------------------ what the hero carries

  /** What one blow of a weapon does, rolled. */
  private roll(slot: Slot): { amount: number; crit: boolean } {
    const def = slot.def;
    const s = this.stats;
    const base = def.dmg[slot.tier] + (def.scale.might ?? 0) * s.might + (def.scale.aim ?? 0) * s.aim + (def.scale.lore ?? 0) * s.lore;
    let by = Math.max(0.1, 1 + s.damage / 100);
    if (this.flag === 'rage') by *= 1 + 0.5 * (1 - this.hero.hp / this.hero.maxHp);
    let amount = Math.max(1, Math.round(base * by));
    const crit = this.rng.chance(Math.max(0, def.crit + s.crit) / 100);
    if (crit) amount = Math.round(amount * def.critBy);
    return { amount, crit };
  }

  /** The nearest foe to the hero within a distance, or null. */
  private nearest(range: number, not: readonly number[] = [], fromX = this.hero.x, fromY = this.hero.y): Foe | null {
    let best: Foe | null = null;
    let bestD = Infinity;
    for (const f of this.foes) {
      if (f.dead || not.includes(f.id)) continue;
      const d = Math.hypot(f.x - fromX, f.y - fromY) - f.def.r;
      if (d < range && d < bestD) {
        best = f;
        bestD = d;
      }
    }
    return best;
  }

  private strike(dt: number): void {
    const h = this.hero;
    const n = this.slots.length;
    for (let i = 0; i < n; i++) {
      const slot = this.slots[i];
      slot.cool -= dt;
      slot.since += dt;
      if (slot.cool > 0) continue;
      const def = slot.def;
      const range = this.rangeOf(def);
      const target = this.nearest(def.motion === 'pulse' ? (def.burst ?? range) : range);
      if (!target) {
        slot.cool = 0;
        continue;
      }
      slot.cool = this.everyOf(slot);
      slot.since = 0;
      const angle = Math.atan2(target.y - h.y, target.x - h.x);
      slot.angle = angle;
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const place = slotPlace(i, n);
      switch (def.motion) {
        case 'thrust': {
          // Everyone in a line from the hero, nearest first, as many as it goes through.
          const most = this.flag === 'drive' ? 99 : (def.pierce ?? 1);
          const inLine = this.foes
            .filter((f) => {
              if (f.dead) return false;
              const along = (f.x - h.x) * ux + (f.y - h.y) * uy;
              const off = Math.abs((f.x - h.x) * -uy + (f.y - h.y) * ux);
              return along > -f.def.r && along < range + f.def.r && off < 20 + f.def.r;
            })
            .sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))
            .slice(0, most);
          for (const f of inLine) this.blow(f, slot, h.x, h.y);
          this.events.push({ t: 'strike', slot: i, angle, x: h.x + ux * range, y: h.y + uy * range, range });
          break;
        }
        case 'sweep': {
          const half = (((def.arc ?? 90) / 2) * Math.PI) / 180;
          for (const f of this.foes) {
            if (f.dead) continue;
            const d = Math.hypot(f.x - h.x, f.y - h.y);
            if (d > range + f.def.r) continue;
            let off = Math.atan2(f.y - h.y, f.x - h.x) - angle;
            while (off > Math.PI) off -= TAU;
            while (off < -Math.PI) off += TAU;
            // Whoever is right on top of the hero is in the sweep whichever way it goes.
            if (Math.abs(off) <= half || d < f.def.r + 20) this.blow(f, slot, h.x, h.y);
          }
          this.events.push({ t: 'strike', slot: i, angle, x: h.x + ux * range, y: h.y + uy * range, range });
          break;
        }
        case 'slam': {
          const r = (def.burst ?? 56) * (this.flag === 'oath' ? 1.35 : 1);
          const stun = (def.stun ?? 0.6) * (this.flag === 'oath' ? 1.5 : 1);
          for (const f of this.foes) {
            if (f.dead || Math.hypot(f.x - target.x, f.y - target.y) > r + f.def.r) continue;
            this.blow(f, slot, target.x, target.y);
            if (!f.dead && !f.boss) f.stun = Math.max(f.stun, stun);
          }
          this.events.push({ t: 'strike', slot: i, angle, x: target.x, y: target.y, range });
          this.events.push({ t: 'burst', x: target.x, y: target.y, r, kind: 'slam' });
          break;
        }
        case 'pulse': {
          const r = def.burst ?? 110;
          for (const f of this.foes) {
            if (!f.dead && Math.hypot(f.x - h.x, f.y - h.y) <= r + f.def.r) this.blow(f, slot, h.x, h.y);
          }
          this.mend(def.mends?.[slot.tier] ?? 1);
          this.events.push({ t: 'strike', slot: i, angle, x: h.x, y: h.y, range: r });
          this.events.push({ t: 'burst', x: h.x, y: h.y, r, kind: 'light' });
          break;
        }
        default: {
          const { amount, crit } = this.roll(slot);
          const speed = def.flies ?? 500;
          const x0 = h.x + place.x;
          const y0 = h.y + place.y;
          const a = Math.atan2(target.y - 14 - y0, target.x - x0);
          const lobbed = def.motion === 'lob';
          const far = Math.hypot(target.x - x0, target.y - y0);
          const s: Shot = {
            id: this.ids++, mine: true, x: x0, y: y0, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 9, dmg: amount, crit,
            pierce: (def.pierce ?? 0) + (this.flag === 'volley' && def.kind === 'ranged' && !lobbed ? 1 : 0), leaps: def.leaps ?? 0,
            life: lobbed ? 2 : (range * 1.35) / speed, art: def.shot ?? 'arrow', knock: def.knock, seen: [], from: def, tier: slot.tier, mark: def.motion === 'cast' ? target.id : 0,
            lob: lobbed ? { x0, y0, x1: target.x, y1: target.y, of: Math.max(0.35, Math.min(0.9, far / speed)), at: 0 } : null, chills: 0, by: '',
          };
          this.shots.push(s);
          this.events.push({ t: 'loose', slot: i, angle: a, shot: s.id });
        }
      }
    }
  }

  /** A weapon's blow lands on a foe: rolled afresh for each one it lands on. */
  private blow(f: Foe, slot: Slot, fromX: number, fromY: number): void {
    const { amount, crit } = this.roll(slot);
    this.land(f, amount, crit, fromX, fromY, slot.def.knock, slot.def, slot.tier);
  }

  /** Harm reaches a foe, with whatever the weapon leaves on them. */
  private land(f: Foe, amount: number, crit: boolean, fromX: number, fromY: number, knock: number, def: WeaponDef | null, tier: number): void {
    if (f.dead) return;
    if (def?.slow) {
      f.slow = 2;
      f.slowBy = Math.max(f.slowBy, def.slow);
    }
    if (def?.burn) {
      f.burn = this.flag === 'kindle' ? 6 : 3;
      f.burnBy = Math.max(f.burnBy, def.burn[tier]);
    }
    const d = Math.hypot(f.x - fromX, f.y - fromY) || 1;
    // The big are not thrown far, and a boss hardly at all.
    const give = f.boss ? 0.12 : 1 / (f.def.size ?? 1) ** 2;
    f.kx += ((f.x - fromX) / d) * knock * 9 * give;
    f.ky += ((f.y - fromY) / d) * knock * 9 * give;
    this.wound(f, amount, crit, false);
    if (this.stats.lifesteal > 0 && this.time >= this.leechAt && this.rng.chance(this.stats.lifesteal / 100)) {
      this.leechAt = this.time + LEECH_GAP;
      this.mend(1);
    }
  }

  /** Takes health off a foe, and fells it if that is the last of it. `soft` is harm that comes by itself: fire, a cloud. */
  private wound(f: Foe, amount: number, crit: boolean, soft: boolean): void {
    if (f.dead) return;
    const by = this.flag === 'shatter' && f.slow > 0 ? Math.round(amount * 1.33) : amount;
    f.hp -= by;
    this.events.push({ t: 'hit', id: f.id, x: f.x, y: f.y, amount: by, crit, soft });
    if (f.hp > 0) return;
    f.dead = true;
    this.kills++;
    if (f.boss) this.felled.push(f.def.id);
    this.events.push({ t: 'fall', id: f.id, x: f.x, y: f.y, boss: f.boss, swept: false });
    this.leave(f);
  }

  /** Fire on a foe burns twice a second. */
  private smolder(f: Foe, dt: number): void {
    f.burn -= dt;
    f.burnTick -= dt;
    if (f.burnTick > 0) return;
    f.burnTick = 0.5;
    this.wound(f, Math.max(1, Math.round(f.burnBy * 0.5)), false, true);
    if (f.burn <= 0) f.burnBy = 0;
  }

  /** What the fallen leave on the ground. */
  private leave(f: Foe): void {
    const lucky = 1 + Math.max(0, this.stats.luck) / 100;
    // Later waves are far bigger, and would bury the camp's prices in coins: fewer of the fallen leave any.
    let coins = 0;
    for (let i = 0; i < f.def.coins; i++) if (f.boss || this.rng.chance(coinShare(this.wave.n))) coins++;
    if (this.rng.chance(Math.min(0.9, (Math.max(0, this.stats.luck) / 100) * 0.4))) coins++;
    // Coins of ten, of three and of one: a boss leaves a heap, not a hundred of them.
    for (const worth of [10, 3, 1]) {
      while (coins >= worth) {
        coins -= worth;
        this.drop('coin', f.x, f.y, worth);
      }
    }
    if (f.boss) this.drop('pack', f.x, f.y, 1);
    else if (this.rng.chance(0.006 * lucky)) this.drop('pack', f.x, f.y, 1);
    if (this.rng.chance(HEART.chance * lucky)) this.drop('heart', f.x, f.y, HEART.mends);
  }

  private drop(kind: PickKind, x: number, y: number, value: number): void {
    const a = this.rng.next() * TAU;
    const v = this.rng.range(40, 150);
    this.picks.push({ id: this.ids++, kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, value, pulled: false, age: 0 });
  }

  // ------------------------------------------------------------ what flies

  private moveShots(dt: number): void {
    const h = this.hero;
    for (const s of this.shots) {
      s.life -= dt;
      if (s.lob) {
        // A thing thrown goes to where its mark stood, and bursts there.
        s.lob.at += dt;
        const t = Math.min(1, s.lob.at / s.lob.of);
        s.x = s.lob.x0 + (s.lob.x1 - s.lob.x0) * t;
        s.y = s.lob.y0 + (s.lob.y1 - s.lob.y0) * t;
        if (t >= 1) {
          this.burst(s, s.x, s.y);
          s.life = -1;
        }
        continue;
      }
      if (s.mine && s.mark) {
        // A bolt bends toward its mark, or toward whoever is nearest once that one has fallen.
        let to = this.foes.find((f) => f.id === s.mark && !f.dead) ?? null;
        if (!to) {
          to = this.nearest(260, s.seen, s.x, s.y);
          s.mark = to ? to.id : 0;
        }
        if (to) {
          const speed = Math.hypot(s.vx, s.vy);
          const want = Math.atan2(to.y - 14 - s.y, to.x - s.x);
          let now = Math.atan2(s.vy, s.vx);
          let off = want - now;
          while (off > Math.PI) off -= TAU;
          while (off < -Math.PI) off += TAU;
          now += Math.max(-7 * dt, Math.min(7 * dt, off));
          s.vx = Math.cos(now) * speed;
          s.vy = Math.sin(now) * speed;
        }
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < -40 || s.y < -40 || s.x > this.w + 40 || s.y > this.h + 40) s.life = -1;
      if (s.life <= 0) continue;
      if (!s.mine) {
        if (Math.hypot(h.x - s.x, h.y - 14 - s.y) < HERO_RADIUS + s.r) {
          this.hurt(s.dmg, s.x - s.vx, s.y - s.vy, s.by, s.chills);
          s.life = -1;
        }
        continue;
      }
      for (const f of this.foes) {
        if (f.dead || s.seen.includes(f.id)) continue;
        if (Math.hypot(f.x - s.x, f.y - 14 - s.y) > f.def.r + s.r) continue;
        s.seen.push(f.id);
        if (s.from?.burst) {
          this.burst(s, s.x, s.y);
          s.life = -1;
          break;
        }
        this.land(f, s.dmg, s.crit, s.x - s.vx, s.y - s.vy, s.knock, s.from, s.tier);
        if (s.leaps > 0) {
          // A stone skips on to whoever else is near.
          const next = this.nearest(210, s.seen, s.x, s.y);
          if (next) {
            s.leaps--;
            const speed = Math.hypot(s.vx, s.vy);
            const a = Math.atan2(next.y - 14 - s.y, next.x - s.x);
            s.vx = Math.cos(a) * speed;
            s.vy = Math.sin(a) * speed;
            s.life = Math.max(s.life, 0.5);
            break;
          }
        }
        if (s.pierce <= 0) {
          s.life = -1;
          break;
        }
        s.pierce--;
        s.mark = 0;
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  /** Something of the hero's bursts: everyone in its ring is hit, and it may leave a cloud. */
  private burst(s: Shot, x: number, y: number): void {
    const def = s.from;
    if (!def) return;
    const r = def.burst ?? 60;
    const kind: Burst = def.cloud ? 'venom' : def.burn ? 'fire' : 'powder';
    this.events.push({ t: 'burst', x, y, r, kind });
    for (const f of this.foes) {
      if (!f.dead && Math.hypot(f.x - x, f.y - y) <= r + f.def.r) this.land(f, s.dmg, s.crit, x, y, s.knock, def, s.tier);
    }
    if (def.cloud) this.zones.push({ id: this.ids++, x, y, r, by: def.cloud[s.tier], life: 3, tick: 0.5, kind: 'cloud' });
  }

  /** Clouds eat at whoever stands in them, twice a second. */
  private seethe(dt: number): void {
    for (const z of this.zones) {
      z.life -= dt;
      z.tick -= dt;
      if (z.tick > 0) continue;
      z.tick = 0.5;
      for (const f of this.foes) {
        if (!f.dead && Math.hypot(f.x - z.x, f.y - z.y) <= z.r + f.def.r) this.wound(f, Math.max(1, Math.round(z.by * 0.5)), false, true);
      }
    }
    this.zones = this.zones.filter((z) => z.life > 0);
  }

  // ------------------------------------------------------------ what is left on the ground

  private gather(dt: number): void {
    const h = this.hero;
    const reach = PICKUP_RADIUS * Math.max(0.3, 1 + this.stats.pickup / 100);
    for (const p of this.picks) {
      p.age += dt;
      if (!p.pulled) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const fade = Math.exp(-6 * dt);
        p.vx *= fade;
        p.vy *= fade;
        p.x = Math.max(ARENA.edge, Math.min(this.w - ARENA.edge, p.x));
        p.y = Math.max(ARENA.edge + 20, Math.min(this.h - ARENA.edge, p.y));
        // A heart is left for a hero who has no need of it yet.
        const wanted = p.kind !== 'heart' || h.hp < h.maxHp;
        if (p.age > 0.25 && wanted && (this.gathering >= 0 || Math.hypot(h.x - p.x, h.y - p.y) < reach)) p.pulled = true;
        continue;
      }
      const dx = h.x - p.x;
      const dy = h.y - 16 - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const pace = 420 + p.age * 500;
      if (d < 18 + pace * dt) {
        p.value = -Math.abs(p.value);
        this.take(p);
        continue;
      }
      p.x += (dx / d) * pace * dt;
      p.y += (dy / d) * pace * dt;
    }
    this.picks = this.picks.filter((p) => p.value > 0);
  }

  private take(p: Pick): void {
    const value = Math.abs(p.value);
    if (p.kind === 'coin') {
      this.gold += value * Math.max(0.1, 1 + this.stats.bounty / 100);
      this.xp += value * (this.flag === 'thief' ? 1.5 : 1);
    } else if (p.kind === 'heart') this.mend(value);
    else this.packs++;
    this.events.push({ t: 'take', kind: p.kind, value });
  }

  // ------------------------------------------------------------ how it ends

  private bury(): void {
    if (this.foes.some((f) => f.dead)) this.foes = this.foes.filter((f) => !f.dead);
  }

  private finish(dt: number): void {
    if (this.over) return;
    if (this.gathering >= 0) {
      this.gathering -= dt;
      // Once everything has come in there is nothing to wait for.
      if (this.gathering <= 0 || (this.picks.length === 0 && this.gathering < GATHER_SECONDS - 0.5)) {
        // Whatever did not make it in time is counted all the same.
        for (const p of this.picks) this.take(p);
        this.picks = [];
        this.over = 'cleared';
        this.events.push({ t: 'end', cleared: true });
      }
      return;
    }
    const bossDown = this.wave.boss !== undefined && this.felled.includes(this.wave.boss);
    if (this.time < this.wave.seconds && !bossDown) return;
    // The wave is over: whoever is left leaves the field, and what lies on it comes in.
    for (const f of this.foes) this.events.push({ t: 'fall', id: f.id, x: f.x, y: f.y, boss: f.boss, swept: true });
    this.foes = [];
    this.marks = [];
    this.shots = [];
    this.zones = [];
    this.gathering = GATHER_SECONDS;
    this.events.push({ t: 'gather' });
  }

  /** Takes what has happened since this was last asked. */
  drain(): Ev[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
