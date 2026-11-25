// The battle. Pure TypeScript: no Phaser, no DOM, no clock of its own.
//
// It moves in fixed steps of DT. The same input always gives the same battle,
// on any machine: the only randomness is a seeded generator, and the only
// arithmetic is +, -, *, / and square roots, which every engine rounds alike.
// That is what will let a saved team be fought again later exactly as it went.
//
// Each step it fills `events` (the first `eventCount` of them) with what
// happened, stamped with the time, for the view to animate from. The event
// objects are reused, so read them before the next step.
//
// The player's part in it is calling skills. A unit uses its skill by itself
// when it is ready; for a short while before that the player may call it,
// and then it is used at once and does more (CALL_WINDOW, CALL_BONUS). The
// calls are part of the input: a battle is its input and the list of calls,
// which unit at which step, and nothing else. A battle with no calls is the
// battle it was before there were any.

import {
  CALL_BONUS,
  CALL_WINDOW,
  DT,
  MAX_SECONDS,
  TICKS_PER_SECOND,
  TILE,
  ticks,
  tileCenterX,
  tileCenterY,
} from './constants';
import { FIRST_FIELD, type Field } from './field';
import { Rng } from './rng';
import { POISON_STACKS, PULSE_TICKS, STATUS, STATUS_IDS, STATUS_INDEX } from './status';
import type { BattleEvent, BattleInput, Call, EventType, Placement, SkillDef, StatusApply, Summons, UnitDef } from './types';

const ATTACK = 0;
const HEAL = 1;
const SKILL = 2;

const DEFAULT_RADIUS = 0.33;
/** How much of an overlap is pushed out each step. Less than all of it, so units slide rather than jump. */
const PUSH = 0.6;
/** How far ahead, beyond touching, a walking unit starts to steer round another. */
const STEER_AHEAD = 34;
/** A unit looks for a nearer enemy this often, in ticks. */
const RETARGET_TICKS = 8;

const ST_BURN = STATUS_INDEX.burn;
const ST_POISON = STATUS_INDEX.poison;
const ST_STUN = STATUS_INDEX.stun;
const ST_SLOW = STATUS_INDEX.slow;
const ST_HASTE = STATUS_INDEX.haste;
const ST_RAGE = STATUS_INDEX.rage;
const ST_WEAK = STATUS_INDEX.weak;
const ST_MARK = STATUS_INDEX.mark;
const ST_SHIELD = STATUS_INDEX.shield;
const ST_REGEN = STATUS_INDEX.regen;

export interface SimUnit {
  id: number;
  team: 0 | 1;
  def: UnitDef;
  /** What its health is multiplied by, and how much bigger it is drawn: kept for whoever it calls up. */
  hpMult: number;
  scale: number;
  /** What it calls up, and the steps until the next. Null if it calls no one. */
  summons: Summons | null;
  summonWait: number;
  /** How many it has called up so far. */
  summoned: number;
  /** The unit that called it up, or -1. */
  calledBy: number;
  /** True for a trap: no one's target, and not counted when a side is counted. */
  trap: boolean;
  /** The steps until it next gives its aura, if it has one. */
  auraWait: number;
  x: number;
  y: number;
  /** Where it was a step ago, for the view to glide between. */
  prevX: number;
  prevY: number;
  hp: number;
  maxHp: number;
  damage: number;
  /** What its card's level and grade multiply its damage and healing by. */
  mult: number;
  rangePx: number;
  radiusPx: number;
  alive: boolean;
  /** 1 facing right, -1 facing left. */
  facing: 1 | -1;
  moving: boolean;
  /** The enemy it is after, or -1. */
  target: number;
  /** Ticks until what it is doing lands. 0 when it is doing nothing. */
  windup: number;
  action: number;
  actionTarget: number;
  /** Ticks until it may start another attack. */
  cooldown: number;
  /** Ticks until its skill is ready. */
  skillWait: number;
  /** The player has called its skill on this step: it is used when the unit's turn comes. */
  called: boolean;
  /** What the skill it is using is multiplied by: CALL_BONUS if it was called, 1 if it went off by itself. */
  boost: number;
  retarget: number;
  /** By status index: ticks left, the status's number, who gave it, doses. */
  stTicks: number[];
  stPower: number[];
  stSrc: number[];
  stStacks: number[];
}

export interface Shot {
  active: boolean;
  id: number;
  /** What flies: the art's name. */
  kind: string;
  /** What the damage is called in events: 'attack' or a skill's id. */
  cause: string;
  src: number;
  team: 0 | 1;
  target: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  /** Where it is headed: the target, or where the target last was. */
  tx: number;
  ty: number;
  /** Where it left from, for the view to arc it. */
  fromX: number;
  fromY: number;
  /** Pixels a tick. */
  speed: number;
  damage: number;
  splashR: number;
  splashShare: number;
  status: StatusApply | null;
  drain: number;
}

export class Battle {
  readonly units: SimUnit[] = [];
  readonly shots: Shot[] = [];
  readonly events: BattleEvent[] = [];
  eventCount = 0;
  tick = 0;
  time = 0;
  ended = false;
  /** 0 or 1 once it has ended, -1 for a draw. */
  winner = -1;

  private readonly rng: Rng;
  /** The step it ends at if no side has fallen, and the units a unit may call up. */
  private limit = MAX_SECONDS * TICKS_PER_SECOND;
  private defs: Readonly<Record<string, UnitDef>> = {};
  private nextShot = 0;
  /**
   * The player's calls, in the order of their steps: those the input came
   * with, and those made while the battle is stepped (call). Together with
   * the input they are the whole battle.
   */
  readonly calls: Call[] = [];
  /** The first of them that has not been heard yet. */
  private nextCall = 0;
  private readonly callTicks = ticks(CALL_WINDOW);
  /** What a called skill leaves, lasting longer: made once for each status and kept. */
  private readonly longer = new Map<StatusApply, StatusApply>();
  /** The field it is fought on, and its size in the simulation's pixels: no one leaves it. */
  readonly field: Field;
  private readonly boardW: number;
  private readonly boardH: number;

  constructor(input: BattleInput) {
    this.rng = new Rng(input.seed);
    this.field = input.field ?? FIRST_FIELD;
    this.boardW = this.field.cols * TILE;
    this.boardH = this.field.rows * TILE;
    // Units are numbered turn about, so that neither side always acts first.
    const [a, b] = input.teams;
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      for (let team = 0 as 0 | 1; team < 2; team++) {
        const p = (team === 0 ? a : b)[i];
        if (!p) continue;
        const def = input.defs[p.unit];
        if (!def) throw new Error(`battle: no unit "${p.unit}"`);
        this.add(team as 0 | 1, def, tileCenterX(p.col), tileCenterY(p.row), p, -1);
      }
    }
    this.limit = Math.max(1, Math.round((input.seconds ?? MAX_SECONDS) * TICKS_PER_SECOND));
    this.defs = input.defs;
    if (input.calls) {
      for (const c of input.calls) this.calls.push({ tick: c.tick, unit: c.unit });
      // In the order of their steps, and as they were given within a step.
      this.calls.sort((x, y) => x.tick - y.tick);
    }
  }

  // ------------------------------------------------------------ calling a skill

  /**
   * Whether the player may call a unit's skill now. It is one of their own,
   * its skill is ready or within CALL_WINDOW of it, it is free to use it
   * (not stunned, not in the middle of it already), and there is something
   * to use it on: an enemy within its reach, or for a skill that mends,
   * someone hurt. So whatever can be called would do something if it were.
   */
  callable(id: number): boolean {
    const u = this.units[id];
    if (this.ended || !u || !u.alive || u.team !== 0 || u.trap || u.def.still) return false;
    const skill = u.def.skill;
    if (!skill || u.skillWait > this.callTicks) return false;
    if (u.stTicks[ST_STUN] > 0 || (u.windup > 0 && u.action === SKILL)) return false;
    return this.aimOf(u, skill) !== null;
  }

  /**
   * How near a unit's skill is to going off by itself, from 0 when it may
   * first be called to 1 when it is ready. For the view, which shows the
   * player how long they have.
   */
  callProgress(id: number): number {
    const u = this.units[id];
    if (!u) return 0;
    return 1 - Math.max(0, Math.min(1, u.skillWait / this.callTicks));
  }

  /**
   * The player calls a unit's skill. It is heard on the next step, and used
   * on it. Returns false, and does nothing, if the skill cannot be called
   * now. What is asked here while the battle is stepped is the same as a
   * call on the input's list: `calls` holds both.
   */
  call(id: number): boolean {
    if (!this.callable(id)) return false;
    const tick = this.tick + 1;
    const calls = this.calls;
    // Kept in the order of their steps. A second press in the same moment is the same call.
    let at = calls.length;
    while (at > this.nextCall && calls[at - 1].tick > tick) at--;
    for (let i = this.nextCall; i < at; i++) if (calls[i].tick === tick && calls[i].unit === id) return true;
    calls.splice(at, 0, { tick, unit: id });
    return true;
  }

  /** Whom a unit would use its skill on if it used it now: itself for a skill that mends, an enemy for any other. Null if no one. */
  private aimOf(u: SimUnit, skill: SkillDef): SimUnit | null {
    if (skill.kind === 'mend') return this.skillReady(u, skill, 0) ? u : null;
    const cur = u.target >= 0 && this.units[u.target].alive ? this.units[u.target] : null;
    if (cur && this.skillReady(u, skill, this.distance(u, cur))) return cur;
    // The enemy it is after may be out of reach while another is not: a healer that has been mending looks up to find one.
    const near = this.nearestEnemy(u.team, u.x, u.y, Infinity);
    return near && near !== cur && this.skillReady(u, skill, this.distance(u, near)) ? near : null;
  }

  private distance(a: SimUnit, b: SimUnit): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** The calls for this step are heard before anyone acts. One for a unit that cannot be called does nothing. */
  private hearCalls(): void {
    const calls = this.calls;
    while (this.nextCall < calls.length && calls[this.nextCall].tick <= this.tick) {
      const c = calls[this.nextCall++];
      if (c.tick === this.tick && this.callable(c.unit)) this.units[c.unit].called = true;
    }
  }

  /** Puts a unit in the battle: at the start, or called up in the middle of it. */
  private add(team: 0 | 1, def: UnitDef, x: number, y: number, p: Placement, calledBy: number): SimUnit {
    const maxHp = Math.max(1, Math.round(def.hp * (p.hpMult ?? 1)));
    const share = p.hpShare === undefined ? 1 : Math.max(0, Math.min(1, p.hpShare));
    const zeros = (): number[] => STATUS_IDS.map(() => 0);
    const unit: SimUnit = {
      id: this.units.length,
      team,
      def,
      hpMult: p.hpMult ?? 1,
      scale: p.scale ?? 1,
      summons: p.summons ?? def.summons ?? null,
      summonWait: ticks((p.summons ?? def.summons)?.every ?? 0),
      summoned: 0,
      calledBy,
      trap: !!def.trap,
      auraWait: def.aura ? ticks(def.aura.every) : 0,
      x,
      y,
      prevX: x,
      prevY: y,
      // A unit that comes hurt still comes alive: at least 1.
      hp: Math.max(1, Math.round(maxHp * share)),
      maxHp,
      damage: def.damage * (p.damageMult ?? 1),
      mult: p.damageMult ?? 1,
      rangePx: def.range * TILE,
      radiusPx: (def.radius ?? DEFAULT_RADIUS) * TILE * (1 + ((def.scale ?? 1) * (p.scale ?? 1) - 1) * 0.6),
      alive: true,
      facing: team === 0 ? 1 : -1,
      moving: false,
      target: -1,
      windup: 0,
      action: ATTACK,
      actionTarget: -1,
      // A little stagger, so that two of a kind do not strike as one.
      cooldown: this.rng.int(7),
      // First use comes somewhere in the second half of the wait, so that a
      // team's skills do not all go off in the same moment.
      skillWait: def.skill
        ? ticks(def.skill.first ?? def.skill.cooldown * (0.4 + 0.5 * this.rng.next()))
        : 0,
      called: false,
      boost: 1,
      retarget: 0,
      stTicks: zeros(),
      stPower: zeros(),
      stSrc: zeros(),
      stStacks: zeros(),
    };
    this.units.push(unit);
    return unit;
  }

  /**
   * A unit that calls others up does so on its own clock, stunned or not:
   * one more of its kind of follower, beside it on the side its enemy is,
   * unless as many as it may have are standing already.
   */
  private callUp(u: SimUnit): void {
    const call = u.summons;
    if (!call) return;
    // It has sent out all it had.
    if (call.total !== undefined && u.summoned >= call.total) return;
    if (u.summonWait > 0) {
      u.summonWait--;
      return;
    }
    u.summonWait = ticks(call.every);
    const def = this.defs[call.unit];
    if (!def) return;
    let standing = 0;
    for (let i = 0; i < this.units.length; i++) if (this.units[i].alive && this.units[i].calledBy === u.id) standing++;
    if (standing >= call.cap) return;
    // Above it and below it in turn, a step toward the enemy, and never off the board.
    const side = standing % 2 === 0 ? -1 : 1;
    const x = Math.max(TILE * 0.5, Math.min(this.boardW - TILE * 0.5, u.x + u.facing * TILE * 0.7));
    const y = Math.max(TILE * 0.5, Math.min(this.boardH - TILE * 0.5, u.y + side * TILE * 0.9));
    u.summoned++;
    const born = this.add(u.team, def, x, y, { unit: call.unit, col: 0, row: 0, hpMult: u.hpMult, damageMult: u.mult }, u.id);
    this.emit('spawn', born.id, u.id, 0, call.unit, x, y);
  }

  /** A trap goes off when an enemy that walks comes near it: once, on everyone of the enemy's within its blast. */
  private spring(u: SimUnit): void {
    const trap = u.def.trap;
    if (!trap) return;
    const units = this.units;
    const reach = trap.trigger * TILE;
    let near = false;
    for (let i = 0; i < units.length && !near; i++) {
      const o = units[i];
      if (!o.alive || o.team === u.team || o.trap || o.def.still) continue;
      const dx = o.x - u.x;
      const dy = o.y - u.y;
      near = dx * dx + dy * dy <= reach * reach;
    }
    if (!near) return;
    u.alive = false;
    this.emit('trap', u.id, -1, 0, u.def.id, u.x, u.y);
    const r = trap.radius * TILE;
    for (let i = 0; i < units.length; i++) {
      const o = units[i];
      if (!o.alive || o.team === u.team || o.trap) continue;
      const dx = o.x - u.x;
      const dy = o.y - u.y;
      if (dx * dx + dy * dy > r * r) continue;
      if (u.damage > 0) this.hurt(u.id, o, u.damage, 'trap', false);
      if (trap.status && o.alive) this.afflict(u, o, trap.status);
    }
  }

  /** A unit with an aura gives its status, every so often, to everyone of the side it is for within its reach. */
  private radiate(u: SimUnit): void {
    const aura = u.def.aura;
    if (!aura || u.stTicks[ST_STUN] > 0) return;
    if (u.auraWait > 0) {
      u.auraWait--;
      return;
    }
    u.auraWait = ticks(aura.every);
    const units = this.units;
    const r = aura.radius * TILE;
    for (let i = 0; i < units.length; i++) {
      const o = units[i];
      if (!o.alive || o.trap || o === u || (o.team === u.team) === !!aura.foes) continue;
      const dx = o.x - u.x;
      const dy = o.y - u.y;
      if (dx * dx + dy * dy <= r * r) this.afflict(u, o, aura.status);
    }
  }

  // ------------------------------------------------------------ the step

  step(): void {
    this.eventCount = 0;
    if (this.ended) return;
    this.tick++;
    this.time = this.tick * DT;
    const units = this.units;
    for (let i = 0; i < units.length; i++) {
      units[i].prevX = units[i].x;
      units[i].prevY = units[i].y;
    }
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i];
      s.prevX = s.x;
      s.prevY = s.y;
    }

    if (this.nextCall < this.calls.length) this.hearCalls();

    // Whoever is called up this step is at the end of the list, and acts from the next.
    const before = units.length;
    for (let i = 0; i < before; i++) if (units[i].alive) this.callUp(units[i]);
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (!u.alive) continue;
      if (u.trap) this.spring(u);
      else if (u.def.aura) this.radiate(u);
    }
    for (let i = 0; i < units.length; i++) if (units[i].alive && !units[i].trap) this.runStatuses(units[i]);
    for (let i = 0; i < units.length; i++) if (units[i].alive && !units[i].trap) this.act(units[i]);
    for (let i = 0; i < this.shots.length; i++) if (this.shots[i].active) this.fly(this.shots[i]);
    this.separate();
    this.checkEnd();
  }

  private emit(type: EventType, unit: number, target: number, amount: number, kind: string, x = 0, y = 0, id = -1): void {
    let e = this.events[this.eventCount];
    if (!e) {
      e = { t: 0, type, unit: -1, target: -1, amount: 0, x: 0, y: 0, id: -1, kind: '' };
      this.events.push(e);
    }
    e.t = this.time;
    e.type = type;
    e.unit = unit;
    e.target = target;
    e.amount = amount;
    e.x = x;
    e.y = y;
    e.id = id;
    e.kind = kind;
    this.eventCount++;
  }

  // ------------------------------------------------------------ deciding

  private act(u: SimUnit): void {
    if (u.cooldown > 0) u.cooldown--;
    if (u.skillWait > 0) u.skillWait--;
    if (u.stTicks[ST_STUN] > 0) {
      // Stunned since the call was heard: the call is lost.
      u.called = false;
      this.stop(u);
      return;
    }
    if (u.called) {
      // The player called its skill: whatever it was in the middle of is dropped, and the skill is used now, for more.
      u.called = false;
      const skill = u.def.skill as SkillDef;
      const t = this.aimOf(u, skill);
      if (t) {
        this.stop(u);
        if (t !== u) this.face(u, t.x);
        this.begin(u, SKILL, t.id, CALL_BONUS);
        return;
      }
    }
    if (u.windup > 0) {
      u.windup--;
      if (u.windup === 0) this.land(u);
      return;
    }

    const def = u.def;
    const skill = def.skill;

    // What stands still strikes whoever comes within its reach, the nearest first, and goes after no one.
    if (def.still) {
      if (def.damage <= 0 || u.cooldown > 0) return;
      const t = this.nearestEnemy(u.team, u.x, u.y, u.rangePx);
      if (t) this.begin(u, ATTACK, t.id);
      return;
    }

    // A skill that mends is used as soon as someone nearby needs it.
    if (skill && skill.kind === 'mend' && u.skillWait === 0 && this.skillReady(u, skill, 0)) {
      this.stop(u);
      this.begin(u, SKILL, u.id);
      return;
    }

    // A healer looks to its own side first.
    if (def.heal) {
      const reach = def.heal.range * TILE;
      const near = this.worstHurt(u, reach);
      if (near) {
        this.stop(u);
        this.face(u, near.x);
        if (u.cooldown === 0) this.begin(u, HEAL, near.id);
        return;
      }
      const far = this.worstHurt(u, Infinity);
      if (far) {
        this.face(u, far.x);
        this.walk(u, far.x, far.y, far.id);
        return;
      }
    }

    this.pickTarget(u);
    if (u.target < 0) {
      this.stop(u);
      return;
    }
    const t = this.units[u.target];
    const dx = t.x - u.x;
    const dy = t.y - u.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.face(u, t.x);

    if (skill && skill.kind !== 'mend' && u.skillWait === 0 && this.skillReady(u, skill, dist)) {
      this.stop(u);
      this.begin(u, SKILL, t.id);
      return;
    }

    // A unit that has stopped stays put until its target is clearly out of
    // reach, and one that is walking comes a little inside it. Without that,
    // a nudge from a neighbour sets it shuffling back and forth.
    const reach = u.moving ? u.rangePx * 0.97 : u.rangePx * 1.06;
    if (dist <= reach) {
      this.stop(u);
      if (u.cooldown === 0) this.begin(u, ATTACK, t.id);
    } else {
      this.walk(u, t.x, t.y, t.id);
    }
  }

  private face(u: SimUnit, x: number): void {
    if (x > u.x + 1) u.facing = 1;
    else if (x < u.x - 1) u.facing = -1;
  }

  private stop(u: SimUnit): void {
    if (u.moving) {
      u.moving = false;
      this.emit('moveEnd', u.id, -1, 0, '');
    }
  }

  /** How much faster than usual a unit moves and acts. */
  private pace(u: SimUnit, attacking: boolean): number {
    let f = 1;
    if (u.stTicks[ST_HASTE] > 0) f *= 1 + u.stPower[ST_HASTE];
    if (u.stTicks[ST_SLOW] > 0) f *= 1 - u.stPower[ST_SLOW];
    const frenzy = u.def.frenzy;
    if (attacking && frenzy && u.hp < u.maxHp * frenzy.below) f *= 1 + frenzy.haste;
    return f;
  }

  private pickTarget(u: SimUnit): void {
    const units = this.units;
    const cur = u.target >= 0 && units[u.target].alive ? units[u.target] : null;
    if (cur && u.retarget > 0) {
      u.retarget--;
      return;
    }
    u.retarget = RETARGET_TICKS;
    let best: SimUnit | null = null;
    let bestD = Infinity;
    for (let i = 0; i < units.length; i++) {
      const o = units[i];
      if (!o.alive || o.team === u.team || o.trap) continue;
      const dx = o.x - u.x;
      const dy = o.y - u.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    if (!best) {
      u.target = -1;
      return;
    }
    if (!cur) {
      u.target = best.id;
      return;
    }
    if (best !== cur) {
      // It keeps the enemy it has unless another is clearly nearer.
      const dx = cur.x - u.x;
      const dy = cur.y - u.y;
      if (bestD < (dx * dx + dy * dy) * 0.64) u.target = best.id;
    }
  }

  /** The ally (never the unit itself) with the least health for its size within reach, if any is hurt. */
  private worstHurt(u: SimUnit, reach: number): SimUnit | null {
    const units = this.units;
    let best: SimUnit | null = null;
    let bestShare = 0.999;
    const r2 = reach * reach;
    for (let i = 0; i < units.length; i++) {
      const o = units[i];
      // Nothing mends a building, and a trap has nothing to mend.
      if (!o.alive || o.team !== u.team || o === u || o.trap || o.def.still) continue;
      const share = o.hp / o.maxHp;
      if (share >= bestShare) continue;
      const dx = o.x - u.x;
      const dy = o.y - u.y;
      if (dx * dx + dy * dy > r2) continue;
      bestShare = share;
      best = o;
    }
    return best;
  }

  private nearestEnemy(team: number, x: number, y: number, within: number, not = -1): SimUnit | null {
    const units = this.units;
    let best: SimUnit | null = null;
    let bestD = within * within;
    for (let i = 0; i < units.length; i++) {
      const o = units[i];
      if (!o.alive || o.team === team || o.id === not || o.trap) continue;
      const dx = o.x - x;
      const dy = o.y - y;
      const d = dx * dx + dy * dy;
      if (d <= bestD) {
        if (d === bestD && best) continue;
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  private skillReady(u: SimUnit, skill: SkillDef, dist: number): boolean {
    switch (skill.kind) {
      case 'cleave':
        return dist <= Math.max(u.rangePx, (skill.area ?? 1.2) * TILE) * 1.02;
      case 'mend': {
        const reach = (skill.area ?? 2.5) * TILE;
        const units = this.units;
        for (let i = 0; i < units.length; i++) {
          const o = units[i];
          // A hurt wall is no reason to mend: nothing mends a building.
          if (!o.alive || o.team !== u.team || o.trap || o.def.still || o.hp > o.maxHp * 0.8) continue;
          const dx = o.x - u.x;
          const dy = o.y - u.y;
          if (dx * dx + dy * dy <= reach * reach) return true;
        }
        return false;
      }
      case 'boon':
        return dist <= u.rangePx * 1.6;
      default:
        return dist <= u.rangePx * 1.02;
    }
  }

  // ------------------------------------------------------------ acting

  private begin(u: SimUnit, action: number, target: number, boost = 1): void {
    const def = u.def;
    const pace = this.pace(u, true);
    const skill = action === SKILL ? (def.skill as SkillDef) : null;
    const seconds = skill ? (skill.windup ?? def.windup) : def.windup;
    const w = Math.max(1, Math.round((seconds * TICKS_PER_SECOND) / pace));
    u.windup = w;
    u.action = action;
    u.actionTarget = target;
    u.boost = boost;
    u.cooldown = Math.max(w + 1, Math.round((def.attackInterval * TICKS_PER_SECOND) / pace));
    let kind = 'attack';
    if (action === HEAL) kind = 'heal';
    if (skill) {
      kind = skill.id;
      u.skillWait = ticks(skill.cooldown);
      if (boost !== 1) this.emit('call', u.id, target, 0, skill.id);
      this.emit('skill', u.id, target, 0, skill.id);
    }
    this.emit('attackStart', u.id, target, w * DT, kind);
  }

  /** What a unit's blow is worth once its own statuses are counted. */
  private outgoing(u: SimUnit, base: number): number {
    let d = base;
    if (u.stTicks[ST_RAGE] > 0) d *= 1 + u.stPower[ST_RAGE];
    if (u.stTicks[ST_WEAK] > 0) d *= 1 - u.stPower[ST_WEAK];
    return d;
  }

  private land(u: SimUnit): void {
    const def = u.def;
    const units = this.units;

    if (u.action === HEAL) {
      const heal = def.heal as { amount: number; range: number };
      let t: SimUnit | null = units[u.actionTarget];
      if (!t.alive || t.hp >= t.maxHp) t = this.worstHurt(u, heal.range * TILE);
      this.emit('impact', u.id, t ? t.id : -1, 0, 'heal');
      if (t) this.heal(u, t, heal.amount * u.mult);
      return;
    }

    if (u.action === SKILL && (def.skill as SkillDef).kind === 'mend') {
      this.useSkill(u, def.skill as SkillDef, u);
      return;
    }

    // Whoever it meant to hit may have fallen while it wound up.
    let t: SimUnit | null = units[u.actionTarget];
    if (!t.alive) {
      const reach = def.projectile ? Infinity : u.rangePx * 1.25;
      t = this.nearestEnemy(u.team, u.x, u.y, reach);
    }

    if (u.action === SKILL) {
      this.useSkill(u, def.skill as SkillDef, t);
      return;
    }

    this.emit('impact', u.id, t ? t.id : -1, 0, 'attack');
    if (!t) return;
    const amount = this.outgoing(u, u.damage);
    const splashR = def.splash ? def.splash.radius * TILE : 0;
    const share = def.splash ? def.splash.share : 0;
    if (def.projectile) {
      this.launch(u, t, def.projectile.kind, def.projectile.speed, amount, 'attack', splashR, share, def.onHit ?? null, 0);
    } else {
      this.strike(u.id, u.team, t, amount, 'attack', splashR, share, def.onHit ?? null, 0);
    }
  }

  private useSkill(u: SimUnit, skill: SkillDef, t: SimUnit | null): void {
    const def = u.def;
    const units = this.units;
    let amount = this.outgoing(u, u.damage * (skill.power ?? 1));
    let status = skill.status ?? null;
    // A skill the player called does more: its blow, its mending, and how long what it leaves lasts.
    const boost = u.boost;
    if (boost !== 1) {
      amount *= boost;
      if (status) status = this.lengthened(status, boost);
    }
    const area = (skill.area ?? 0) * TILE;
    this.emit('impact', u.id, t ? t.id : -1, 0, skill.id);

    switch (skill.kind) {
      case 'strike':
      case 'drain':
      case 'blast': {
        if (!t) return;
        const r = skill.kind === 'blast' ? (skill.area ?? 1) * TILE : 0;
        const drain = skill.kind === 'drain' ? (skill.share ?? 0.5) : 0;
        if (def.projectile) {
          this.launch(u, t, skill.projectile ?? def.projectile.kind, def.projectile.speed, amount, skill.id, r, 1, status, drain);
        } else {
          this.strike(u.id, u.team, t, amount, skill.id, r, 1, status, drain);
        }
        return;
      }
      case 'cleave': {
        const r = (skill.area ?? 1.2) * TILE;
        for (let i = 0; i < units.length; i++) {
          const o = units[i];
          if (!o.alive || o.team === u.team || o.trap) continue;
          const dx = o.x - u.x;
          const dy = o.y - u.y;
          if (dx * dx + dy * dy > r * r) continue;
          this.hurt(u.id, o, amount, skill.id, false);
          if (status && o.alive) this.afflict(u, o, status);
        }
        return;
      }
      case 'volley': {
        // The nearest few, one shot each. Chosen nearest first, by number on a tie.
        const want = skill.targets ?? 3;
        let lastD = -1;
        let lastId = -1;
        for (let n = 0; n < want; n++) {
          let best: SimUnit | null = null;
          let bestD = Infinity;
          for (let i = 0; i < units.length; i++) {
            const o = units[i];
            if (!o.alive || o.team === u.team || o.trap) continue;
            const dx = o.x - u.x;
            const dy = o.y - u.y;
            const d = dx * dx + dy * dy;
            if (d < lastD || (d === lastD && o.id <= lastId)) continue;
            if (d < bestD) {
              bestD = d;
              best = o;
            }
          }
          if (!best) break;
          lastD = bestD;
          lastId = best.id;
          if (def.projectile) {
            this.launch(u, best, skill.projectile ?? def.projectile.kind, def.projectile.speed, amount, skill.id, 0, 0, status, 0);
          } else {
            this.strike(u.id, u.team, best, amount, skill.id, 0, 0, status, 0);
          }
        }
        return;
      }
      case 'mend': {
        const r = (skill.area ?? 2.5) * TILE;
        let base = (def.heal ? def.heal.amount : def.damage) * u.mult * (skill.power ?? 1);
        if (boost !== 1) base *= boost;
        for (let i = 0; i < units.length; i++) {
          const o = units[i];
          if (!o.alive || o.team !== u.team) continue;
          const dx = o.x - u.x;
          const dy = o.y - u.y;
          if (dx * dx + dy * dy > r * r) continue;
          this.heal(u, o, base);
          if (status) this.afflict(u, o, status);
        }
        return;
      }
      case 'boon': {
        if (!status) return;
        for (let i = 0; i < units.length; i++) {
          const o = units[i];
          if (!o.alive || o.team !== u.team) continue;
          const dx = o.x - u.x;
          const dy = o.y - u.y;
          if (o !== u && dx * dx + dy * dy > area * area) continue;
          this.afflict(u, o, status);
        }
        return;
      }
      case 'hex': {
        if (!t || !status) return;
        const cx = t.x;
        const cy = t.y;
        for (let i = 0; i < units.length; i++) {
          const o = units[i];
          if (!o.alive || o.team === u.team || o.trap) continue;
          const dx = o.x - cx;
          const dy = o.y - cy;
          if (o !== t && dx * dx + dy * dy > area * area) continue;
          if (skill.power) this.hurt(u.id, o, amount, skill.id, false);
          if (o.alive) this.afflict(u, o, status);
        }
        return;
      }
    }
  }

  /** A status as a called skill leaves it: the same, for longer. */
  private lengthened(status: StatusApply, by: number): StatusApply {
    let s = this.longer.get(status);
    if (!s) {
      s = { ...status, duration: status.duration * by };
      this.longer.set(status, s);
    }
    return s;
  }

  /** A blow that lands: on its target, and on the enemies near it if it splashes. */
  private strike(
    src: number,
    team: number,
    t: SimUnit,
    amount: number,
    cause: string,
    splashR: number,
    share: number,
    status: StatusApply | null,
    drain: number,
  ): void {
    const cx = t.x;
    const cy = t.y;
    const giver = this.units[src];
    const dealt = this.hurt(src, t, amount, cause, false);
    if (status && t.alive) this.afflict(giver, t, status);
    if (drain > 0 && giver.alive) this.heal(giver, giver, dealt * drain);
    if (splashR > 0) this.splash(src, team, cx, cy, t.id, amount * share, splashR, status, cause);
  }

  private splash(
    src: number,
    team: number,
    cx: number,
    cy: number,
    not: number,
    amount: number,
    radius: number,
    status: StatusApply | null,
    cause: string,
  ): void {
    const units = this.units;
    const r2 = radius * radius;
    for (let i = 0; i < units.length; i++) {
      const o = units[i];
      if (!o.alive || o.team === team || o.id === not || o.trap) continue;
      const dx = o.x - cx;
      const dy = o.y - cy;
      if (dx * dx + dy * dy > r2) continue;
      // A basic attack's splash is named apart, so that the view can tell it from the hit.
      this.hurt(src, o, amount, cause === 'attack' ? 'splash' : cause, false);
      if (status && o.alive) this.afflict(units[src], o, status);
    }
  }

  /**
   * Takes health off a unit and says so. Armor comes off every hit, which
   * still does at least 1; harm from a status goes straight through.
   */
  private hurt(src: number, t: SimUnit, raw: number, cause: string, pierce: boolean): number {
    // Nothing breaks a trap: it lies there until it goes off.
    if (t.trap) return 0;
    let d = raw;
    if (t.stTicks[ST_MARK] > 0) d *= 1 + t.stPower[ST_MARK];
    if (t.stTicks[ST_SHIELD] > 0) d *= 1 - t.stPower[ST_SHIELD];
    if (!pierce) d -= t.def.armor;
    d = Math.max(1, Math.round(d));
    if (d > t.hp) d = t.hp;
    t.hp -= d;
    this.emit('damage', src, t.id, d, cause, t.x, t.y);
    if (t.hp <= 0) this.kill(t, src);
    return d;
  }

  private heal(by: SimUnit, t: SimUnit, raw: number): void {
    if (t.trap || t.def.still) return;
    const amount = Math.min(t.maxHp - t.hp, Math.max(1, Math.round(raw)));
    if (amount <= 0) return;
    t.hp += amount;
    this.emit('heal', by.id, t.id, amount, '', t.x, t.y);
  }

  private kill(t: SimUnit, by: number): void {
    t.alive = false;
    t.hp = 0;
    t.windup = 0;
    t.called = false;
    t.moving = false;
    for (let i = 0; i < t.stTicks.length; i++) t.stTicks[i] = 0;
    this.emit('death', t.id, by, 0, '', t.x, t.y);
  }

  // ------------------------------------------------------------ statuses

  private afflict(by: SimUnit, t: SimUnit, s: StatusApply): void {
    if (t.trap) return;
    if (s.chance !== undefined && s.chance < 1 && this.rng.next() >= s.chance) return;
    const i = STATUS_INDEX[s.id];
    const rule = STATUS[s.id];
    const power = s.power ?? rule.power;
    const length = ticks(s.duration);
    if (rule.dot) {
      // Harm over time is a share of the giver's damage a second, fixed when it is given.
      const perSecond = power * by.damage;
      if (i === ST_POISON) {
        t.stStacks[i] = Math.min(POISON_STACKS, (t.stTicks[i] > 0 ? t.stStacks[i] : 0) + 1);
        t.stPower[i] = Math.max(t.stTicks[i] > 0 ? t.stPower[i] : 0, perSecond);
      } else {
        t.stStacks[i] = 1;
        t.stPower[i] = Math.max(t.stTicks[i] > 0 ? t.stPower[i] : 0, perSecond);
      }
    } else {
      t.stStacks[i] = 1;
      t.stPower[i] = t.stTicks[i] > 0 ? Math.max(t.stPower[i], power) : power;
    }
    if (length > t.stTicks[i]) t.stTicks[i] = length;
    t.stSrc[i] = by.id;
    if (i === ST_STUN && t.windup > 0) {
      // Stunned in the middle of a blow: the blow is lost.
      t.windup = 0;
    }
    this.emit('status', t.id, by.id, s.duration, s.id);
  }

  private runStatuses(u: SimUnit): void {
    const pulse = this.tick % PULSE_TICKS === 0;
    for (let i = 0; i < u.stTicks.length; i++) {
      if (u.stTicks[i] <= 0) continue;
      if (pulse) {
        const seconds = PULSE_TICKS / TICKS_PER_SECOND;
        if (i === ST_BURN || i === ST_POISON) {
          this.hurt(u.stSrc[i], u, u.stPower[i] * u.stStacks[i] * seconds, STATUS_IDS[i], true);
          if (!u.alive) return;
        } else if (i === ST_REGEN) {
          this.heal(u, u, u.maxHp * u.stPower[i] * seconds);
        }
      }
      u.stTicks[i]--;
      if (u.stTicks[i] === 0) {
        u.stStacks[i] = 0;
        this.emit('statusEnd', u.id, u.stSrc[i], 0, STATUS_IDS[i]);
      }
    }
  }

  // ------------------------------------------------------------ shots

  private launch(
    u: SimUnit,
    t: SimUnit,
    kind: string,
    speed: number,
    amount: number,
    cause: string,
    splashR: number,
    share: number,
    status: StatusApply | null,
    drain: number,
  ): void {
    let s: Shot | null = null;
    for (let i = 0; i < this.shots.length; i++) {
      if (!this.shots[i].active) {
        s = this.shots[i];
        break;
      }
    }
    if (!s) {
      s = {
        active: false, id: 0, kind: '', cause: '', src: 0, team: 0, target: 0, x: 0, y: 0, prevX: 0, prevY: 0,
        tx: 0, ty: 0, fromX: 0, fromY: 0, speed: 0, damage: 0, splashR: 0, splashShare: 0, status: null, drain: 0,
      };
      this.shots.push(s);
    }
    s.active = true;
    s.id = this.nextShot++;
    s.kind = kind;
    s.cause = cause;
    s.src = u.id;
    s.team = u.team;
    s.target = t.id;
    s.x = s.prevX = s.fromX = u.x;
    s.y = s.prevY = s.fromY = u.y;
    s.tx = t.x;
    s.ty = t.y;
    s.speed = speed * DT;
    s.damage = amount;
    s.splashR = splashR;
    s.splashShare = share;
    s.status = status;
    s.drain = drain;
    this.emit('projectileLaunch', u.id, t.id, 0, kind, u.x, u.y, s.id);
  }

  private fly(s: Shot): void {
    const t = this.units[s.target];
    // It follows its target; if the target falls, it goes on to where it was.
    if (t.alive) {
      s.tx = t.x;
      s.ty = t.y;
    }
    const dx = s.tx - s.x;
    const dy = s.ty - s.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > s.speed) {
      s.x += (dx / d) * s.speed;
      s.y += (dy / d) * s.speed;
      return;
    }
    s.x = s.tx;
    s.y = s.ty;
    s.active = false;
    this.emit('projectileHit', s.src, t.alive ? t.id : -1, 0, s.kind, s.x, s.y, s.id);
    if (t.alive) {
      this.strike(s.src, s.team, t, s.damage, s.cause, s.splashR, s.splashShare, s.status, s.drain);
    } else if (s.splashR > 0) {
      this.splash(s.src, s.team, s.x, s.y, -1, s.damage * s.splashShare, s.splashR, s.status, s.cause);
    }
  }

  // ------------------------------------------------------------ moving

  private walk(u: SimUnit, tx: number, ty: number, toward: number): void {
    const units = this.units;
    const dx = tx - u.x;
    const dy = ty - u.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return;
    let dirX = dx / dist;
    let dirY = dy / dist;

    // Steer round whoever stands in the way, to the side they are not on.
    let steerX = 0;
    let steerY = 0;
    for (let i = 0; i < units.length; i++) {
      const o = units[i];
      // A trap is not in the way: it is walked over, which is the point of it.
      if (!o.alive || o === u || o.id === toward || o.trap) continue;
      const ox = o.x - u.x;
      const oy = o.y - u.y;
      const reach = u.radiusPx + o.radiusPx + STEER_AHEAD;
      const od2 = ox * ox + oy * oy;
      if (od2 >= reach * reach || od2 < 0.000001) continue;
      const ahead = ox * dirX + oy * dirY;
      if (ahead <= 0) continue;
      const od = Math.sqrt(od2);
      const side = dirX * oy - dirY * ox;
      const sign = side > 0.001 ? -1 : side < -0.001 ? 1 : (u.id & 1) === 1 ? 1 : -1;
      const w = (1 - od / reach) * 1.8 * (ahead / od);
      steerX += -dirY * sign * w;
      steerY += dirX * sign * w;
    }
    dirX += steerX;
    dirY += steerY;
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len > 0.001) {
      dirX /= len;
      dirY /= len;
    }

    const step = Math.min(u.def.speed * DT * this.pace(u, false), dist);
    u.x += dirX * step;
    u.y += dirY * step;
    this.keepOnBoard(u);
    if (!u.moving) {
      u.moving = true;
      this.emit('moveStart', u.id, toward, 0, '');
    }
  }

  private keepOnBoard(u: SimUnit): void {
    const m = u.radiusPx * 0.6;
    if (u.x < m) u.x = m;
    else if (u.x > this.boardW - m) u.x = this.boardW - m;
    if (u.y < m) u.y = m;
    else if (u.y > this.boardH - m) u.y = this.boardH - m;
  }

  /** Units that overlap are eased apart, so that they do not stand in a heap. */
  private separate(): void {
    const units = this.units;
    for (let i = 0; i < units.length; i++) {
      const a = units[i];
      if (!a.alive || a.trap) continue;
      for (let j = i + 1; j < units.length; j++) {
        const b = units[j];
        if (!b.alive || b.trap) continue;
        // Two things that stand still are where they were put.
        if (a.def.still && b.def.still) continue;
        const min = a.radiusPx + b.radiusPx;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        let d = Math.sqrt(d2);
        if (d < 0.01) {
          // Exactly on top of each other: part them up and down, by number.
          dx = 0;
          dy = 1;
          d = 0;
        } else {
          dx /= d;
          dy /= d;
        }
        const push = (min - d) * 0.5 * PUSH;
        // What stands still is not pushed: whoever walked into it gives all the way.
        const pa = a.def.still ? 0 : b.def.still ? 2 : 1;
        const pb = b.def.still ? 0 : a.def.still ? 2 : 1;
        a.x -= dx * push * pa;
        a.y -= dy * push * pa;
        b.x += dx * push * pb;
        b.y += dy * push * pb;
        this.keepOnBoard(a);
        this.keepOnBoard(b);
      }
    }
  }

  // ------------------------------------------------------------ ending

  private checkEnd(): void {
    const units = this.units;
    let alive0 = 0;
    let alive1 = 0;
    for (let i = 0; i < units.length; i++) {
      // Everyone who stands is counted, a building as much as whoever walks:
      // a side has not lost while a tower, a wall or a hall of its own is up.
      // By the owner's word of 24 November 2026: "make the win condition to
      // kill unit and destroy every structure / Not just unit". A trap is not
      // counted: nothing can strike it, so nothing could end the battle.
      if (!units[i].alive || units[i].trap) continue;
      if (units[i].team === 0) alive0++;
      else alive1++;
    }
    if (alive0 > 0 && alive1 > 0 && this.tick < this.limit) return;
    this.ended = true;
    if (alive0 > 0 && alive1 === 0) this.winner = 0;
    else if (alive1 > 0 && alive0 === 0) this.winner = 1;
    else if (alive0 === 0 && alive1 === 0) this.winner = -1;
    else {
      // Out of time: the side with more of its health left has it.
      const share = [0, 0];
      const full = [0, 0];
      for (let i = 0; i < units.length; i++) {
        if (units[i].trap) continue;
        share[units[i].team] += units[i].hp;
        full[units[i].team] += units[i].maxHp;
      }
      const a = share[0] / full[0];
      const b = share[1] / full[1];
      this.winner = a > b ? 0 : b > a ? 1 : -1;
    }
    this.emit('battleEnd', -1, -1, this.winner, '');
  }
}

export interface BattleResult {
  winner: number;
  seconds: number;
  ticks: number;
  /** Every event of the battle, copied. */
  events: BattleEvent[];
  /** Health left, by unit number. */
  hp: number[];
  /** A number that differs if anything about how the battle went differs. */
  fingerprint: number;
  /** The calls it was fought with: the input's, and any made as it ran. On the same input they give the same battle again. */
  calls: Call[];
}

/**
 * Runs a whole battle at once. For tests, tools and anything that needs only
 * the outcome. `before` is asked ahead of every step: it is how a tool plays
 * a player who calls skills (callEverything).
 */
export function runBattle(input: BattleInput, keepEvents = true, before?: (battle: Battle) => void): BattleResult {
  const battle = new Battle(input);
  const events: BattleEvent[] = [];
  let print = 2166136261;
  const mix = (n: number): void => {
    print = Math.imul(print ^ (Math.round(n * 1000) | 0), 16777619);
  };
  while (!battle.ended) {
    before?.(battle);
    battle.step();
    for (let i = 0; i < battle.eventCount; i++) {
      const e = battle.events[i];
      mix(e.t);
      mix(e.unit);
      mix(e.target);
      mix(e.amount);
      mix(e.type.length);
      if (keepEvents) events.push({ ...e });
    }
    for (const u of battle.units) {
      mix(u.x);
      mix(u.y);
      mix(u.hp);
    }
  }
  return {
    winner: battle.winner,
    seconds: battle.time,
    ticks: battle.tick,
    events,
    hp: battle.units.map((u) => u.hp),
    fingerprint: print >>> 0,
    calls: battle.calls.map((c) => ({ ...c })),
  };
}

/**
 * A player who calls every skill the moment it can be called: the most that
 * calling can be worth. For runBattle's `before`.
 */
export function callEverything(battle: Battle): void {
  for (let i = 0; i < battle.units.length; i++) if (battle.units[i].team === 0) battle.call(i);
}
