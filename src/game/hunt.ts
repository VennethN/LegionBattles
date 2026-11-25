// A hunt: one lair, one monster, one hunter and what they brought. It is
// pure: it is stepped at a fixed rate with how the hunter is steered and
// what they ask for, it draws its chances from its own seeded dice, and it
// tells what happened as a list of events that a screen drains. The same
// seed and the same steering give the same hunt, which is what the tests
// and the bot's measure stand on.
//
// The rule the whole fight rests on: a monster (and its helpers) never
// hurts anyone without a tell, a shape on the ground that shows for a set
// time and then lands. Everything in `tells` is exactly what will land,
// where and when.

import {
  ABILITIES, BUILDINGS, CAMP, ENRAGE, FIELD, HELPERS, HORN_WAIT, HOUND, HUNTERS, HURT_GRACE, MARKS, MONSTERS, REINFORCEMENTS, byId,
  type AbilityDef, type AllyDef, type AttackDef, type BuildingDef, type HelperDef, type HunterDef, type Mark, type MonsterDef, type ReinforcementDef, type ShapeDef,
} from './content';
import { Rng } from './rng';

export const STEP = 1 / 60;
const TAU = Math.PI * 2;
const RAD = Math.PI / 180;

/** How the hunter is steered this step, and what is asked for. */
export interface Steer {
  x: number;
  y: number;
  dodge?: boolean;
  /** The first ability, the second. */
  a?: boolean;
  b?: boolean;
  /** Call the reinforcement at this place in the muster. */
  call?: number;
  /** In camp: set this building down where the hunter stands. */
  place?: string;
  /** In camp: wake the monster. */
  wake?: boolean;
}

export interface Setup {
  seed: number;
  monster: string;
  mark: Mark;
  hunter: string;
  /** What comes at the horn, each with how many times it can be called. */
  reinforcements: ReadonlyArray<{ id: string; charges: number }>;
  /** What can be built in camp, each with how many, and whether a sturdier one was bought. */
  buildings: ReadonlyArray<{ id: string; n: number; sturdy?: boolean }>;
  /** True for a field stood up, for a tall window. */
  tall?: boolean;
  /** The trophy the hunter wears, by name. */
  trophy?: string | null;
}

export interface Hunter {
  def: HunterDef;
  x: number;
  y: number;
  face: 1 | -1;
  /** Which way they strike and look, in radians. */
  aim: number;
  hp: number;
  maxHp: number;
  moving: boolean;
  /** Seconds since the last blow of their own. */
  since: number;
  /** Seconds of the roll left, and of the wait before the next. */
  roll: number;
  rollWait: number;
  rx: number;
  ry: number;
  /** Seconds left in which nothing more can hurt them. */
  grace: number;
  /** Seconds they are held where they stand. */
  root: number;
  /** Seconds left of each ability's wait. */
  waits: [number, number];
  /** Seconds the halberd is still set. */
  bracing: number;
  /** True once the trophy that saves a life has done so. */
  spared: boolean;
}

export type MonsterState = 'asleep' | 'walk' | 'tell' | 'dash' | 'recover' | 'dazed' | 'held' | 'broken' | 'shift' | 'dead';

export interface Monster {
  def: MonsterDef;
  x: number;
  y: number;
  face: 1 | -1;
  aim: number;
  hp: number;
  maxHp: number;
  /** Which of its three parts it is in: 0, 1 or 2. */
  part: number;
  state: MonsterState;
  /** Seconds left of the state it is in. */
  left: number;
  stagger: number;
  staggerMax: number;
  /** The attack it is making, and how long it has been at it. */
  attack: AttackDef | null;
  moving: boolean;
  enraged: boolean;
  /** Seconds a trap's hold makes it take more, and by how much. */
  soft: number;
  softBy: number;
}

/** A shape on the ground that will land. `foe` is false for the one thing of the hunter's side that is shown this way: a sapper's charge. */
export interface Tell {
  id: number;
  kind: 'line' | 'cone' | 'ring';
  x: number;
  y: number;
  angle: number;
  len: number;
  w: number;
  r: number;
  /** Half a cone's width, in radians. */
  half: number;
  inner: number;
  /** Seconds until it lands, and how long it shows in all. */
  left: number;
  of: number;
  dmg: number;
  foe: boolean;
  /** The attack it is of, by name. */
  attack: string;
  /** Whose it is: 0 for the monster's, or a helper's or an ally's own number. */
  by: number;
  summon?: string;
  charge?: { speed: number; daze: number; stagger: number };
  root?: number;
  stagger?: number;
}

export interface Helper {
  id: number;
  def: HelperDef;
  x: number;
  y: number;
  hp: number;
  face: 1 | -1;
  cool: number;
  /** Seconds it is held in a trap. */
  held: number;
  moving: boolean;
  /** True while its own blow is shown on the ground. */
  winding: boolean;
}

export interface Ally {
  id: number;
  def: AllyDef;
  /** Which reinforcement it came with, or 'hound'. */
  group: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  face: 1 | -1;
  cool: number;
  state: 'stand' | 'run' | 'plant' | 'flee' | 'leave' | 'heel' | 'down';
  moving: boolean;
  /** The charge it last set itself against, so that one charge is met once. */
  met: number;
  /** Seconds left of a thing it is doing: planting, or heeling. */
  left: number;
  /** Where a sapper's charge lies, to run from. */
  fx: number;
  fy: number;
}

export interface Building {
  id: number;
  def: BuildingDef;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  cool: number;
}

export interface Shot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  left: number;
  from: 'hunter' | 'ally' | 'ballista';
}

export interface Trap {
  id: number;
  x: number;
  y: number;
  def: AbilityDef;
  arm: number;
  life: number;
}

export interface Pool {
  id: number;
  x: number;
  y: number;
  r: number;
  life: number;
  /** Seconds it will go on burning. */
  burning: number;
  def: AbilityDef;
}

export interface Ward {
  id: number;
  x: number;
  y: number;
  r: number;
  life: number;
  share: number;
}

export interface Stone {
  x: number;
  y: number;
  r: number;
}

/** Why the monster can be struck freely just now. */
export type Opening = 'recover' | 'dazed' | 'held' | 'blind' | 'bell' | 'crash';

export type Ev =
  | { t: 'wake' }
  | { t: 'tell'; id: number; attack: string; name: string; first: boolean }
  | { t: 'land'; id: number; kind: Tell['kind']; x: number; y: number; r: number; foe: boolean }
  | { t: 'strike'; x: number; y: number; angle: number; reach: number; kind: 'arc' | 'bolt' }
  | { t: 'hit'; who: 'monster' | 'helper'; id: number; x: number; y: number; amount: number; big: boolean; open: boolean }
  | { t: 'hurt'; who: 'hunter' | 'ally' | 'building'; id: number; x: number; y: number; amount: number; by: string }
  | { t: 'roll'; x: number; y: number }
  | { t: 'dodged'; x: number; y: number }
  | { t: 'ability'; id: string; x: number; y: number; r: number; tx: number; ty: number }
  | { t: 'turned'; x: number; y: number }
  | { t: 'open'; why: Opening; seconds: number }
  | { t: 'broken'; x: number; y: number }
  | { t: 'rise' }
  | { t: 'shift'; part: number }
  | { t: 'part'; part: number }
  | { t: 'dash'; x: number; y: number; angle: number }
  | { t: 'crash'; x: number; y: number; into: 'stone' | 'barricade' }
  | { t: 'summon'; id: number; x: number; y: number }
  | { t: 'fall'; who: 'helper' | 'ally' | 'building' | 'monster' | 'hunter'; id: number; x: number; y: number }
  | { t: 'call'; id: string; x: number; y: number }
  | { t: 'place'; id: string; x: number; y: number }
  | { t: 'bell'; x: number; y: number }
  | { t: 'blast'; x: number; y: number; r: number }
  | { t: 'alight'; x: number; y: number; r: number }
  | { t: 'trap'; x: number; y: number }
  | { t: 'mend'; x: number; y: number; amount: number }
  | { t: 'loose'; x: number; y: number; angle: number; from: Shot['from'] }
  | { t: 'spared' }
  | { t: 'enrage' }
  | { t: 'end'; won: boolean };

/** What a hunt came to, for the lodge and for the measure. */
export interface Tally {
  /** Seconds the hunt lasted, from the monster's waking. */
  time: number;
  /** Harm done to the monster, by who did it. */
  dealt: Record<string, number>;
  /** Harm done to the hunter, by the attack that did it. */
  taken: Record<string, number>;
  /** The attack that killed the hunter, if one did. */
  killedBy: string | null;
  /** How many times the monster was broken. */
  breaks: number;
}

interface Pending {
  shape: ShapeDef;
  at: number;
  first: boolean;
}

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

/** The smallest turn from one heading to another. */
function turn(from: number, to: number): number {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** True if a point is inside a tell's shape. `pad` widens the shape: a big thing is struck by its rim. */
export function inside(tell: Tell, px: number, py: number, pad = 0): boolean {
  const dx = px - tell.x;
  const dy = py - tell.y;
  if (tell.kind === 'ring') {
    const d = Math.hypot(dx, dy);
    return d <= tell.r + pad && d >= tell.inner - pad;
  }
  if (tell.kind === 'cone') {
    const d = Math.hypot(dx, dy);
    if (d > tell.r + pad) return false;
    return d < 1 || Math.abs(turn(tell.angle, Math.atan2(dy, dx))) <= tell.half + (pad > 0 ? pad / Math.max(40, d) : 0);
  }
  const along = dx * Math.cos(tell.angle) + dy * Math.sin(tell.angle);
  const across = -dx * Math.sin(tell.angle) + dy * Math.cos(tell.angle);
  return along >= -pad && along <= tell.len + pad && Math.abs(across) <= tell.w / 2 + pad;
}

export class Hunt {
  readonly w: number;
  readonly h: number;
  readonly mark: Mark;
  readonly tall: boolean;
  readonly trophy: string | null;
  /** Camp while the monster sleeps, then the hunt, then how it ended. */
  phase: 'camp' | 'hunt' | 'won' | 'lost' = 'camp';
  /** Seconds since the monster woke. */
  time = 0;
  readonly hunter: Hunter;
  readonly monster: Monster;
  tells: Tell[] = [];
  helpers: Helper[] = [];
  allies: Ally[] = [];
  buildings: Building[] = [];
  shots: Shot[] = [];
  traps: Trap[] = [];
  pools: Pool[] = [];
  wards: Ward[] = [];
  readonly stones: Stone[] = [];
  /** What is still to be set down in camp, by name. */
  readonly toPlace: Record<string, number> = {};
  /** What the horn can call: each with the charges it has left. */
  readonly calls: Array<{ def: ReinforcementDef; left: number }>;
  /** Seconds until the horn can be blown again. */
  hornWait = 0;
  /** Seconds the hounds bite harder for, after being set on. */
  frenzy = 0;
  readonly tally: Tally = { time: 0, dealt: {}, taken: {}, killedBy: null, breaks: 0 };

  private readonly rng: Rng;
  private readonly sturdy = new Set<string>();
  private readonly abilities: readonly [AbilityDef, AbilityDef];
  private events: Ev[] = [];
  private nextId = 1;
  /** Where the monster is in the round of its part. */
  private round = 0;
  private pending: Pending[] = [];
  private elapsed = 0;
  private tellFor = 1;
  private targetAlly = 0;
  private dash: { angle: number; left: number; speed: number; daze: number; stagger: number; dmg: number; id: number; struck: boolean } | null = null;
  private frenzyBy = 1;

  constructor(setup: Setup) {
    this.rng = new Rng(setup.seed);
    this.tall = !!setup.tall;
    this.w = this.tall ? FIELD.short : FIELD.long;
    this.h = this.tall ? FIELD.long : FIELD.short;
    this.mark = setup.mark;
    this.trophy = setup.trophy ?? null;
    const hd = byId(HUNTERS, setup.hunter);
    const md = byId(MONSTERS, setup.monster);
    this.abilities = [byId(ABILITIES, hd.abilities[0]), byId(ABILITIES, hd.abilities[1])];
    const [hx, hy] = this.tall ? [this.w / 2, this.h * 0.78] : [this.w * 0.2, this.h / 2];
    const [mx, my] = this.tall ? [this.w / 2, this.h * 0.28] : [this.w * 0.72, this.h / 2];
    this.hunter = {
      def: hd, x: hx, y: hy, face: mx >= hx ? 1 : -1, aim: Math.atan2(my - hy, mx - hx), hp: hd.hp, maxHp: hd.hp, moving: false, since: 0, roll: 0, rollWait: 0, rx: 1, ry: 0,
      grace: 0, root: 0, waits: [0, 0], bracing: 0, spared: false,
    };
    const hp = Math.round(md.hp * MARKS[setup.mark].hp);
    this.monster = {
      def: md, x: mx, y: my, face: hx >= mx ? 1 : -1, aim: Math.atan2(hy - my, hx - mx), hp, maxHp: hp, part: 0, state: 'asleep', left: 0, stagger: 0, staggerMax: md.stagger.max, attack: null,
      moving: false, enraged: false, soft: 0, softBy: 0,
    };
    this.calls = setup.reinforcements.map((r) => ({ def: byId(REINFORCEMENTS, r.id), left: r.charges }));
    for (const b of setup.buildings) {
      this.toPlace[b.id] = (this.toPlace[b.id] ?? 0) + b.n;
      if (b.sturdy) this.sturdy.add(b.id);
    }
    // The stones of a lair stand in a ring round its middle, a little off true, clear of where either side starts.
    for (let i = 0; i < md.stones; i++) {
      const a = (i / md.stones) * TAU + 0.6 + this.rng.range(-0.2, 0.2);
      const x = this.w / 2 + Math.cos(a) * this.w * 0.24;
      const y = this.h / 2 + Math.sin(a) * this.h * 0.27;
      if (dist(x, y, hx, hy) > 120 && dist(x, y, mx, my) > 150) this.stones.push({ x, y, r: 34 });
    }
    for (let i = 0; i < (hd.hounds ?? 0); i++) {
      this.allies.push(this.ally(HOUND, 'hound', hx - 40, hy + (i === 0 ? -34 : 34)));
    }
  }

  /** How the hunt ended, once it has. */
  get over(): 'won' | 'lost' | null {
    return this.phase === 'won' || this.phase === 'lost' ? this.phase : null;
  }

  /** The hunter's two abilities, as the tables have them. */
  get skills(): readonly [AbilityDef, AbilityDef] {
    return this.abilities;
  }

  /** True while the monster can be struck freely: what the stagger is filled in. */
  get open(): boolean {
    const s = this.monster.state;
    return s === 'recover' || s === 'dazed' || s === 'held' || s === 'broken';
  }

  /** How far through its health the monster's next change is, as shares of all of it: the bar is cut there. */
  get cuts(): readonly [number, number] {
    return [2 / 3, 1 / 3];
  }

  /** The run the monster is making, if it is making one: where it is headed and how far it has still to go. Its line is as deadly as a tell. */
  get running(): { angle: number; left: number } | null {
    return this.dash ? { angle: this.dash.angle, left: this.dash.left } : null;
  }

  /** Everything that has happened since this was last asked. */
  drain(): Ev[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** The hunter turns back: the hunt is lost, as if they had fallen. */
  giveUp(): void {
    if (this.over) return;
    this.phase = 'lost';
    this.events.push({ t: 'end', won: false });
  }

  // ------------------------------------------------------------ camp

  /** Why a building cannot be set down where the hunter stands, or nothing if it can. */
  whyNot(id: string): string {
    if (this.phase !== 'camp') return 'It is awake';
    if (!this.toPlace[id]) return 'None left';
    const def = byId(BUILDINGS, id);
    const [x, y] = this.spot();
    if (dist(x, y, this.monster.x, this.monster.y) < CAMP.clear) return 'Too near it';
    if (this.buildings.some((b) => dist(x, y, b.x, b.y) < CAMP.apart)) return 'Too near another';
    if (this.stones.some((s) => dist(x, y, s.x, s.y) < s.r + def.r + 8)) return 'A stone is in the way';
    return '';
  }

  /** Where a building would go: a step in front of the hunter, on the field. */
  private spot(): [number, number] {
    const h = this.hunter;
    const e = FIELD.edge + 12;
    return [Math.max(e, Math.min(this.w - e, h.x + Math.cos(h.aim) * 46)), Math.max(e, Math.min(this.h - e, h.y + Math.sin(h.aim) * 46))];
  }

  private place(id: string): void {
    if (this.whyNot(id)) return;
    const def = byId(BUILDINGS, id);
    const [x, y] = this.spot();
    const hp = Math.round(def.hp * (this.sturdy.has(id) ? 1.5 : 1));
    this.buildings.push({ id: this.nextId++, def, x, y, hp, maxHp: hp, cool: def.kind === 'ballista' ? 1.5 : 0 });
    this.toPlace[id]--;
    this.events.push({ t: 'place', id, x, y });
  }

  private wake(): void {
    if (this.phase !== 'camp') return;
    this.phase = 'hunt';
    const m = this.monster;
    m.state = 'walk';
    // A moment for its roar before the first blow.
    m.left = 1.4;
    this.events.push({ t: 'wake' });
  }

  // ------------------------------------------------------------ a step

  step(steer: Steer, dt = STEP): void {
    if (this.over) return;
    const h = this.hunter;
    const m = this.monster;
    if (this.phase === 'camp') {
      this.moveHunter(steer, dt);
      this.heel(dt);
      if (steer.place) this.place(steer.place);
      if (steer.wake || dist(h.x, h.y, m.x, m.y) < CAMP.wakeAt) this.wake();
      return;
    }
    this.time += dt;
    this.tally.time = this.time;
    if (!m.enraged && this.time >= ENRAGE.at) {
      m.enraged = true;
      this.events.push({ t: 'enrage' });
    }
    this.hornWait = Math.max(0, this.hornWait - dt);
    this.frenzy = Math.max(0, this.frenzy - dt);
    h.grace = Math.max(0, h.grace - dt);
    h.root = Math.max(0, h.root - dt);
    h.bracing = Math.max(0, h.bracing - dt);
    h.rollWait = Math.max(0, h.rollWait - dt);
    h.waits[0] = Math.max(0, h.waits[0] - dt);
    h.waits[1] = Math.max(0, h.waits[1] - dt);

    if (steer.dodge) this.rollNow(steer);
    if (steer.a) this.use(0);
    if (steer.b) this.use(1);
    if (steer.call !== undefined) this.call(steer.call);
    this.moveHunter(steer, dt);
    this.strike(dt);

    this.stepMonster(dt);
    this.stepTells(dt);
    this.stepHelpers(dt);
    this.stepAllies(dt);
    this.stepBuildings(dt);
    this.stepShots(dt);
    this.stepGround(dt);
  }

  // ------------------------------------------------------------ the hunter

  private moveHunter(steer: Steer, dt: number): void {
    const h = this.hunter;
    if (h.roll > 0) {
      const speed = this.rollDist() / h.def.dodge.dur;
      h.x += h.rx * speed * dt;
      h.y += h.ry * speed * dt;
      h.roll = Math.max(0, h.roll - dt);
      h.moving = true;
    } else if (h.root > 0 || h.bracing > 0) {
      h.moving = false;
    } else {
      const len = Math.hypot(steer.x, steer.y);
      h.moving = len > 0.05;
      if (h.moving) {
        const k = Math.min(1, len) / len;
        h.x += steer.x * k * h.def.speed * dt;
        h.y += steer.y * k * h.def.speed * dt;
        if (Math.abs(steer.x) > 0.1) h.face = steer.x > 0 ? 1 : -1;
        // In camp there is nothing to aim at: they look where they walk, and build there.
        if (this.phase === 'camp') h.aim = Math.atan2(steer.y, steer.x);
      }
    }
    this.keepOut(h, 12, true);
  }

  /** Keeps something on the field and out of what stands on it. */
  private keepOut(p: { x: number; y: number }, r: number, alsoMonster: boolean): void {
    for (const s of this.stones) this.push(p, s.x, s.y, s.r + r);
    for (const b of this.buildings) this.push(p, b.x, b.y, b.def.r + r);
    const m = this.monster;
    if (alsoMonster && m.state !== 'dead' && m.state !== 'dash') this.push(p, m.x, m.y, m.def.r * 0.7 + r);
    const e = FIELD.edge;
    p.x = Math.max(e, Math.min(this.w - e, p.x));
    p.y = Math.max(e, Math.min(this.h - e, p.y));
  }

  private push(p: { x: number; y: number }, x: number, y: number, r: number): void {
    const d = dist(p.x, p.y, x, y);
    if (d >= r) return;
    if (d < 0.01) {
      p.x += r;
      return;
    }
    p.x = x + ((p.x - x) / d) * r;
    p.y = y + ((p.y - y) / d) * r;
  }

  private rollDist(): number {
    return this.hunter.def.dodge.dist * (this.trophy === 'antler' ? 1.25 : 1);
  }

  private rollNow(steer: Steer): void {
    const h = this.hunter;
    if (h.rollWait > 0 || h.roll > 0 || h.root > 0) return;
    let x = steer.x;
    let y = steer.y;
    if (Math.hypot(x, y) < 0.05) {
      // With no way chosen, they go away from the monster.
      x = h.x - this.monster.x;
      y = h.y - this.monster.y;
    }
    const len = Math.hypot(x, y) || 1;
    h.rx = x / len;
    h.ry = y / len;
    h.roll = h.def.dodge.dur;
    h.rollWait = h.def.dodge.wait * (this.trophy === 'antler' ? 0.75 : 1);
    h.bracing = 0;
    this.events.push({ t: 'roll', x: h.x, y: h.y });
  }

  /** How much faster someone strikes where they stand: a watchfire's doing. */
  private hasteAt(x: number, y: number): number {
    let most = 0;
    for (const b of this.buildings) if (b.def.kind === 'fire' && dist(x, y, b.x, b.y) <= b.def.reach) most = Math.max(most, b.def.share ?? 0);
    return 1 + most;
  }

  private strike(dt: number): void {
    const h = this.hunter;
    const m = this.monster;
    const s = h.def.strike;
    h.since += dt * this.hasteAt(h.x, h.y);
    if (h.since < s.every || h.roll > 0 || h.bracing > 0) return;
    // A bell within reach is rung, if there is something to break with it.
    if (m.state === 'tell') {
      const bell = this.buildings.find((b) => b.def.kind === 'bell' && b.cool <= 0 && dist(h.x, h.y, b.x, b.y) <= b.def.reach);
      if (bell) {
        h.since = 0;
        h.aim = Math.atan2(bell.y - h.y, bell.x - h.x);
        bell.cool = bell.def.every ?? 15;
        this.events.push({ t: 'strike', x: h.x, y: h.y, angle: h.aim, reach: s.reach, kind: 'arc' }, { t: 'bell', x: bell.x, y: bell.y });
        this.cancelAttack();
        this.addStagger(bell.def.stagger ?? 0);
        if (this.monster.state !== 'broken') this.openFor('dazed', bell.def.daze ?? 1.5, 'bell');
        return;
      }
    }
    const awake = m.state !== 'asleep' && m.state !== 'dead';
    const dm = dist(h.x, h.y, m.x, m.y);
    let tx = 0;
    let ty = 0;
    let found = false;
    if (awake && dm <= s.reach + m.def.r) {
      tx = m.x;
      ty = m.y;
      found = true;
    } else {
      let best = s.reach + 14;
      for (const f of this.helpers) {
        const d = dist(h.x, h.y, f.x, f.y);
        if (d < best) {
          best = d;
          tx = f.x;
          ty = f.y;
          found = true;
        }
      }
    }
    if (!found) return;
    h.since = 0;
    h.aim = Math.atan2(ty - h.y, tx - h.x);
    h.face = tx >= h.x ? 1 : -1;
    this.events.push({ t: 'strike', x: h.x, y: h.y, angle: h.aim, reach: s.reach, kind: s.kind });
    if (s.kind === 'bolt') {
      const far = s.far && dist(h.x, h.y, tx, ty) >= s.far.beyond ? 1 + s.far.by : 1;
      this.loose(h.x, h.y, tx, ty, s.speed ?? 800, s.dmg * far, 'hunter', s.reach + 80);
      return;
    }
    const half = (s.half ?? 50) * RAD;
    if (awake && dm <= s.reach + m.def.r && Math.abs(turn(h.aim, Math.atan2(m.y - h.y, m.x - h.x))) <= half + 0.3) this.harm(s.dmg, 'hunter');
    for (const f of [...this.helpers]) {
      if (dist(h.x, h.y, f.x, f.y) <= s.reach + 14 && Math.abs(turn(h.aim, Math.atan2(f.y - h.y, f.x - h.x))) <= half) this.harmHelper(f, s.dmg);
    }
  }

  private loose(x: number, y: number, tx: number, ty: number, speed: number, dmg: number, from: Shot['from'], range: number): void {
    const a = Math.atan2(ty - y, tx - x);
    this.shots.push({ id: this.nextId++, x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, left: range / speed, from });
    this.events.push({ t: 'loose', x, y, angle: a, from });
  }

  private use(i: 0 | 1): void {
    const h = this.hunter;
    const m = this.monster;
    const a = this.abilities[i];
    if (h.waits[i] > 0 || h.roll > 0) return;
    h.waits[i] = a.wait;
    const r = a.r ?? 0;
    let tx = h.x;
    let ty = h.y;
    switch (a.kind) {
      case 'brace':
        h.bracing = a.life ?? 1;
        break;
      case 'sweep':
        if (this.struckBy(h.x, h.y, r)) {
          this.harm(a.dmg ?? 0, 'ability');
          this.addStagger(a.stagger ?? 0);
        }
        for (const f of [...this.helpers]) {
          const d = dist(h.x, h.y, f.x, f.y);
          if (d > r) continue;
          // Thrown back, out of reach of whoever threw them.
          f.x += ((f.x - h.x) / (d || 1)) * 120;
          f.y += ((f.y - h.y) / (d || 1)) * 120;
          this.keepOut(f, 10, false);
          this.harmHelper(f, a.dmg ?? 0);
        }
        break;
      case 'trap':
        if (this.traps.length >= (a.most ?? 1)) this.traps.shift();
        this.traps.push({ id: this.nextId++, x: h.x, y: h.y, def: a, arm: 0.6, life: a.life ?? 30 });
        break;
      case 'pool': {
        // Thrown at the monster if it is in reach, and as far that way as it goes if not.
        const d = dist(h.x, h.y, m.x, m.y);
        const k = Math.min(1, (a.range ?? 300) / (d || 1));
        tx = h.x + (m.x - h.x) * k;
        ty = h.y + (m.y - h.y) * k;
        this.pools.push({ id: this.nextId++, x: tx, y: ty, r, life: a.life ?? 10, burning: 0, def: a });
        break;
      }
      case 'flare':
        for (const f of [...this.helpers]) if (dist(h.x, h.y, f.x, f.y) <= r) this.harmHelper(f, a.dmg ?? 0);
        if (this.struckBy(h.x, h.y, r) && (m.state === 'walk' || m.state === 'tell')) {
          this.cancelAttack();
          this.addStagger(a.stagger ?? 0);
          if (this.monster.state !== 'broken') this.openFor('dazed', a.hold ?? 1.5, 'blind');
        }
        break;
      case 'ward':
        this.wards.push({ id: this.nextId++, x: h.x, y: h.y, r, life: a.life ?? 8, share: a.share ?? 0.5 });
        break;
      case 'seton': {
        const hounds = this.allies.filter((x) => x.group === 'hound' && x.state !== 'down');
        if (hounds.length === 0 || m.state === 'asleep' || m.state === 'dead') break;
        this.frenzy = a.life ?? 4;
        this.frenzyBy = a.share ?? 2;
        hounds.forEach((x, n) => {
          // They are on it at once: a hound set on does not walk.
          const ang = Math.atan2(h.y - m.y, h.x - m.x) + (n === 0 ? 0.7 : -0.7);
          x.x = m.x + Math.cos(ang) * (m.def.r + 18);
          x.y = m.y + Math.sin(ang) * (m.def.r + 18);
          x.state = 'run';
          x.left = 0;
        });
        tx = m.x;
        ty = m.y;
        if (m.state === 'walk' || m.state === 'tell' || m.state === 'recover') {
          this.cancelAttack();
          this.addStagger(a.stagger ?? 0);
          if (this.monster.state !== 'broken') this.openFor('held', a.hold ?? 2, 'held');
        }
        break;
      }
      case 'whistle': {
        const by = a.share ?? 0.25;
        this.mend(h, by * h.maxHp);
        for (const x of this.allies) {
          if (x.group !== 'hound') continue;
          if (x.state === 'down') x.hp = 0;
          x.hp = Math.min(x.maxHp, x.hp + by * x.maxHp);
          x.state = 'heel';
          x.left = 1.6;
        }
        break;
      }
    }
    this.events.push({ t: 'ability', id: a.id, x: h.x, y: h.y, r, tx, ty });
  }

  private mend(h: Hunter, amount: number): void {
    const before = h.hp;
    h.hp = Math.min(h.maxHp, h.hp + amount);
    if (h.hp > before) this.events.push({ t: 'mend', x: h.x, y: h.y, amount: Math.round(h.hp - before) });
  }

  private call(i: number): void {
    const c = this.calls[i];
    const h = this.hunter;
    const m = this.monster;
    if (!c || c.left <= 0 || this.hornWait > 0 || this.phase !== 'hunt') return;
    c.left--;
    this.hornWait = HORN_WAIT;
    const toward = Math.atan2(m.y - h.y, m.x - h.x);
    const cx = Math.cos(toward);
    const cy = Math.sin(toward);
    for (let n = 0; n < c.def.men; n++) {
      const off = (n - (c.def.men - 1) / 2) * 36;
      let x = h.x;
      let y = h.y;
      if (c.def.form === 'line') {
        // Across the way to the monster, a little in front of the hunter.
        x += cx * 62 - cy * off;
        y += cy * 62 + cx * off;
      } else if (c.def.form === 'back') {
        x += -cx * 120 - cy * off * 1.2;
        y += -cy * 120 + cx * off * 1.2;
      } else {
        x += -cy * off;
        y += cx * off;
      }
      const a = this.ally(c.def.ally, c.def.id, x, y);
      this.keepOut(a, 10, true);
      if (c.def.ally.way === 'sap') a.state = 'run';
      this.allies.push(a);
    }
    this.events.push({ t: 'call', id: c.def.id, x: h.x, y: h.y });
  }

  private ally(def: AllyDef, group: string, x: number, y: number): Ally {
    return { id: this.nextId++, def, group, x, y, hp: def.hp, maxHp: def.hp, face: 1, cool: this.rng.range(0.1, 0.6), state: def.way === 'hound' ? 'heel' : 'stand', moving: false, met: 0, left: 0, fx: 0, fy: 0 };
  }

  private hurtHunter(amount: number, by: string, root = 0): void {
    const h = this.hunter;
    if (h.grace > 0 || this.over) return;
    let harm = amount * (1 - h.def.armor);
    for (const w of this.wards) if (dist(h.x, h.y, w.x, w.y) <= w.r) harm *= 1 - w.share;
    harm = Math.max(1, Math.round(harm));
    h.hp -= harm;
    h.grace = HURT_GRACE;
    if (root > 0) h.root = root;
    this.tally.taken[by] = (this.tally.taken[by] ?? 0) + harm;
    this.events.push({ t: 'hurt', who: 'hunter', id: 0, x: h.x, y: h.y, amount: harm, by });
    if (h.hp > 0) return;
    if (this.trophy === 'spade' && !h.spared) {
      h.spared = true;
      h.hp = 1;
      h.grace = 1.4;
      this.events.push({ t: 'spared' });
      return;
    }
    h.hp = 0;
    this.tally.killedBy = by;
    this.phase = 'lost';
    this.events.push({ t: 'fall', who: 'hunter', id: 0, x: h.x, y: h.y }, { t: 'end', won: false });
  }

  // ------------------------------------------------------------ harm to the monster and its helpers

  /** True if something this wide at a place reaches the monster's body. */
  private struckBy(x: number, y: number, r: number): boolean {
    const m = this.monster;
    return m.state !== 'asleep' && m.state !== 'dead' && dist(x, y, m.x, m.y) <= r + m.def.r;
  }

  private harm(amount: number, by: string): void {
    const m = this.monster;
    if (m.state === 'asleep' || m.state === 'dead' || m.state === 'shift' || amount <= 0) return;
    const broken = m.state === 'broken';
    const open = this.open;
    let dmg = amount * (broken ? m.def.stagger.more : 1) * (m.soft > 0 ? 1 + m.softBy : 1);
    if (by === 'hound' && this.frenzy > 0) dmg *= this.frenzyBy;
    dmg = Math.max(1, Math.round(dmg));
    // It does not go from one part into the next in one blow: it changes first.
    const floor = m.part < 2 ? Math.ceil((m.maxHp * (2 - m.part)) / 3) : 0;
    const done = Math.min(dmg, m.hp - floor);
    m.hp -= done;
    this.tally.dealt[by] = (this.tally.dealt[by] ?? 0) + done;
    this.events.push({ t: 'hit', who: 'monster', id: 0, x: m.x, y: m.y, amount: dmg, big: broken, open });
    if (m.hp <= 0) {
      m.hp = 0;
      m.state = 'dead';
      this.cancelAttack();
      this.tells = [];
      for (const f of this.helpers) this.events.push({ t: 'fall', who: 'helper', id: f.id, x: f.x, y: f.y });
      this.helpers = [];
      this.phase = 'won';
      this.events.push({ t: 'fall', who: 'monster', id: 0, x: m.x, y: m.y }, { t: 'end', won: true });
      return;
    }
    if (m.part < 2 && m.hp <= floor) {
      this.shift();
      return;
    }
    // Blows in an opening are what break it. At other times a blow counts for little.
    if (!broken) this.addStagger(amount * (open ? 1 : 0.15));
  }

  private addStagger(amount: number): void {
    const m = this.monster;
    if (amount <= 0 || m.state === 'broken' || m.state === 'shift' || m.state === 'dead' || m.state === 'asleep') return;
    m.stagger += amount;
    if (m.stagger < m.staggerMax) return;
    m.stagger = m.staggerMax;
    this.cancelAttack();
    m.state = 'broken';
    m.left = m.def.stagger.down;
    this.tally.breaks++;
    this.events.push({ t: 'broken', x: m.x, y: m.y });
  }

  private harmHelper(f: Helper, amount: number): void {
    const dmg = Math.max(1, Math.round(amount));
    f.hp -= dmg;
    this.events.push({ t: 'hit', who: 'helper', id: f.id, x: f.x, y: f.y, amount: dmg, big: false, open: false });
    if (f.hp > 0) return;
    this.helpers = this.helpers.filter((x) => x !== f);
    this.tells = this.tells.filter((t) => t.by !== f.id);
    this.events.push({ t: 'fall', who: 'helper', id: f.id, x: f.x, y: f.y });
  }

  // ------------------------------------------------------------ the monster

  /** Drops whatever it was preparing: its own tells go, and its run stops. */
  private cancelAttack(): void {
    this.tells = this.tells.filter((t) => !(t.foe && t.by === 0));
    this.pending = [];
    this.dash = null;
    this.monster.attack = null;
  }

  private openFor(state: 'recover' | 'dazed' | 'held', seconds: number, why: Opening): void {
    const m = this.monster;
    m.state = state;
    m.left = seconds;
    m.moving = false;
    this.events.push({ t: 'open', why, seconds });
  }

  private shift(): void {
    const m = this.monster;
    this.cancelAttack();
    m.state = 'shift';
    m.left = 1.9;
    m.stagger = 0;
    this.events.push({ t: 'shift', part: m.part + 1 });
    // It throws off whoever is on it as it changes: a ring to step out of.
    this.tell({ kind: 'ring', r: 190, at: 'self' }, 1.0, { id: 'shift', name: 'It changes', tell: 1, recover: 0, dmg: 9, shapes: [] }, m.aim, true);
  }

  private target(): { x: number; y: number } {
    const a = this.targetAlly ? this.allies.find((x) => x.id === this.targetAlly && x.state !== 'down' && x.state !== 'leave') : null;
    if (a) return a;
    this.targetAlly = 0;
    return this.hunter;
  }

  private stepMonster(dt: number): void {
    const m = this.monster;
    m.soft = Math.max(0, m.soft - dt);
    m.moving = false;
    switch (m.state) {
      case 'asleep':
      case 'dead':
        return;
      case 'walk': {
        const t = this.target();
        const d = dist(m.x, m.y, t.x, t.y);
        m.aim = Math.atan2(t.y - m.y, t.x - m.x);
        m.face = t.x >= m.x ? 1 : -1;
        if (d > m.def.reach) {
          const speed = m.def.speed * this.slowAt(m.x, m.y);
          m.x += Math.cos(m.aim) * speed * dt;
          m.y += Math.sin(m.aim) * speed * dt;
          m.moving = true;
          this.keepOut(m, m.def.r * 0.8, false);
        }
        this.caught();
        if (m.state !== 'walk') return;
        m.left -= dt;
        if (m.left <= 0) this.begin(d);
        return;
      }
      case 'tell': {
        this.elapsed += dt;
        while (this.pending.length && this.pending[0].at <= this.elapsed) {
          const p = this.pending.shift() as Pending;
          this.tell(p.shape, this.tellFor, m.attack as AttackDef, m.aim, p.first);
        }
        if (this.pending.length === 0 && !this.tells.some((t) => t.foe && t.by === 0) && !this.dash) {
          const a = m.attack as AttackDef;
          m.attack = null;
          this.openFor('recover', a.recover, 'recover');
        }
        return;
      }
      case 'dash':
        this.stepDash(dt);
        return;
      case 'recover':
      case 'dazed':
      case 'held':
        m.left -= dt;
        if (m.left <= 0) this.walkOn();
        return;
      case 'broken':
        m.left -= dt;
        if (m.left <= 0) {
          m.stagger = 0;
          m.staggerMax = Math.round(m.staggerMax * m.def.stagger.grow);
          this.events.push({ t: 'rise' });
          this.walkOn();
        }
        return;
      case 'shift':
        m.left -= dt;
        if (m.left <= 0) {
          m.part++;
          this.round = 0;
          this.events.push({ t: 'part', part: m.part });
          this.walkOn();
        }
        return;
    }
  }

  private walkOn(): void {
    const m = this.monster;
    m.state = 'walk';
    m.left = this.rng.range(m.def.gap[0], m.def.gap[1]) * MARKS[this.mark].gap * (m.enraged ? ENRAGE.faster : 1);
    // Sometimes it turns on those who stand against it, and not on the hunter.
    this.targetAlly = 0;
    const draws = this.allies.filter((a) => a.state !== 'down' && byIdOr(REINFORCEMENTS, a.group)?.draws && dist(a.x, a.y, m.x, m.y) < 330);
    if (draws.length && this.rng.chance(0.45)) {
      draws.sort((a, b) => dist(a.x, a.y, m.x, m.y) - dist(b.x, b.y, m.x, m.y));
      this.targetAlly = draws[0].id;
    }
  }

  /** Takes the next attack of its round that suits where its mark stands, and begins it. */
  private begin(d: number): void {
    const m = this.monster;
    const round = m.def.parts[m.part];
    let pick: AttackDef | null = null;
    for (let tries = 0; tries < round.length && !pick; tries++) {
      const a = byId(m.def.attacks, round[this.round % round.length]);
      this.round++;
      if (a.mark && a.mark > this.mark) continue;
      if (a.far !== undefined && d < a.far) continue;
      if (a.near !== undefined && d > a.near) continue;
      pick = a;
    }
    if (!pick) {
      // Nothing in its round suits: it comes closer and tries again.
      m.left = 0.4;
      return;
    }
    m.attack = pick;
    m.state = 'tell';
    this.elapsed = 0;
    this.tellFor = pick.tell * MARKS[this.mark].tell * (m.enraged ? ENRAGE.faster : 1);
    this.pending = [];
    pick.shapes.forEach((shape, i) => {
      if (shape.kind === 'marks' && shape.at === 'follow') {
        for (let n = 0; n < shape.n; n++) this.pending.push({ shape: { ...shape, n: 1 }, at: (shape.after ?? 0) + n * (shape.every ?? 0.4), first: i === 0 && n === 0 });
      } else this.pending.push({ shape, at: shape.after ?? 0, first: i === 0 });
    });
    this.pending.sort((a, b) => a.at - b.at);
  }

  /** Puts a shape on the ground, to land after `seconds`. */
  private tell(shape: ShapeDef, seconds: number, attack: AttackDef, aim: number, first: boolean): void {
    const m = this.monster;
    const t = this.target();
    const dmg = attack.dmg * MARKS[this.mark].dmg;
    const base = { left: seconds, of: seconds, dmg, foe: true, attack: attack.id, by: 0, len: 0, w: 0, r: 0, half: 0, inner: 0, angle: 0, root: attack.root };
    const made: Tell[] = [];
    if (shape.kind === 'line') {
      made.push({ ...base, id: this.nextId++, kind: 'line', x: m.x, y: m.y, angle: aim + (shape.turn ?? 0) * RAD, len: shape.len, w: shape.w, charge: attack.charge });
    } else if (shape.kind === 'cone') {
      made.push({ ...base, id: this.nextId++, kind: 'cone', x: m.x, y: m.y, angle: aim + (shape.turn ?? 0) * RAD, r: shape.r, half: shape.half * RAD });
    } else if (shape.kind === 'ring') {
      const at = shape.at === 'self' ? m : t;
      made.push({ ...base, id: this.nextId++, kind: 'ring', x: at.x, y: at.y, r: shape.r, inner: shape.inner ?? 0 });
    } else if (shape.kind === 'marks') {
      const e = FIELD.edge + shape.r * 0.5;
      for (let n = 0; n < shape.n; n++) {
        let x = t.x;
        let y = t.y;
        if (shape.at === 'follow') {
          x = this.hunter.x;
          y = this.hunter.y;
        } else if (shape.at === 'field') {
          x = this.rng.range(e, this.w - e);
          y = this.rng.range(e, this.h - e);
        } else if (n > 0) {
          const a = this.rng.range(0, TAU);
          const d = this.rng.range(shape.r * 1.2, shape.spread ?? 160);
          x += Math.cos(a) * d;
          y += Math.sin(a) * d;
        }
        made.push({ ...base, id: this.nextId++, kind: 'ring', x: Math.max(e, Math.min(this.w - e, x)), y: Math.max(e, Math.min(this.h - e, y)), r: shape.r, summon: attack.summon });
      }
    } else {
      // Lanes right across the field, the long way, with ground between them that is safe.
      const across = this.tall ? this.w : this.h;
      const pitch = across / shape.n;
      const off = this.rng.range(shape.w / 2, pitch - shape.w / 2);
      for (let n = 0; n < shape.n; n++) {
        const c = n * pitch + off;
        if (this.tall) made.push({ ...base, id: this.nextId++, kind: 'line', x: c, y: 0, angle: Math.PI / 2, len: this.h, w: shape.w });
        else made.push({ ...base, id: this.nextId++, kind: 'line', x: 0, y: c, angle: 0, len: this.w, w: shape.w });
      }
    }
    made.forEach((tell, i) => {
      this.tells.push(tell);
      this.events.push({ t: 'tell', id: tell.id, attack: attack.id, name: attack.name, first: first && i === 0 });
    });
  }

  private stepDash(dt: number): void {
    const m = this.monster;
    const d = this.dash;
    if (!d) {
      this.openFor('recover', 0.6, 'recover');
      return;
    }
    const speed = d.speed * this.slowAt(m.x, m.y);
    const step = Math.min(d.left, speed * dt);
    m.x += Math.cos(d.angle) * step;
    m.y += Math.sin(d.angle) * step;
    m.moving = true;
    d.left -= step;
    // Whoever is in its way as it passes. A roll goes through it.
    const h = this.hunter;
    if (!d.struck && h.roll <= 0 && dist(h.x, h.y, m.x, m.y) < m.def.r + 14) {
      d.struck = true;
      if (h.bracing > 0) this.turned();
      else this.hurtHunter(d.dmg, 'charge');
    }
    for (const a of [...this.allies]) {
      if (a.met === d.id || a.state === 'down' || dist(a.x, a.y, m.x, m.y) > m.def.r + 16) continue;
      a.met = d.id;
      if (a.def.set) {
        // Pikes set against a charge: it runs onto them.
        this.harm(a.def.set.dmg, a.group);
        this.addStagger(a.def.set.stagger);
      }
      this.hurtAlly(a, d.dmg, 'charge');
      if (this.monster.state !== 'dash') return;
    }
    // What it runs into.
    const stone = this.stones.find((s) => dist(s.x, s.y, m.x, m.y) < s.r + m.def.r * 0.6);
    const wall = this.buildings.find((b) => dist(b.x, b.y, m.x, m.y) < b.def.r + m.def.r * 0.6);
    if (stone || (wall && wall.def.kind === 'wall')) {
      const daze = wall && wall.def.kind === 'wall' ? (wall.def.daze ?? d.daze) : d.daze;
      const stagger = wall && wall.def.kind === 'wall' ? (wall.def.stagger ?? d.stagger) : d.stagger;
      this.events.push({ t: 'crash', x: m.x, y: m.y, into: stone ? 'stone' : 'barricade' });
      if (!stone && wall) this.fell(wall);
      this.dash = null;
      m.attack = null;
      this.addStagger(stagger);
      if (this.monster.state !== 'broken') this.openFor('dazed', daze, 'crash');
      return;
    }
    if (wall) {
      // Anything else that stands in its way is run down.
      this.hurtBuilding(wall, d.dmg * 2, 'charge');
    }
    this.caught();
    if (this.monster.state !== 'dash') return;
    const e = FIELD.edge;
    const out = m.x <= e || m.x >= this.w - e || m.y <= e || m.y >= this.h - e;
    if (d.left <= 0 || out) {
      m.x = Math.max(e, Math.min(this.w - e, m.x));
      m.y = Math.max(e, Math.min(this.h - e, m.y));
      const a = m.attack;
      this.dash = null;
      m.attack = null;
      this.openFor('recover', a?.recover ?? 0.8, 'recover');
    }
  }

  /** A trap under it shuts. */
  private caught(): void {
    const m = this.monster;
    const trap = this.traps.find((t) => t.arm <= 0 && dist(t.x, t.y, m.x, m.y) < (t.def.r ?? 30) + m.def.r * 0.5);
    if (!trap) return;
    this.traps = this.traps.filter((t) => t !== trap);
    this.events.push({ t: 'trap', x: trap.x, y: trap.y });
    this.cancelAttack();
    m.soft = trap.def.hold ?? 2;
    m.softBy = trap.def.share ?? 0.3;
    this.addStagger(trap.def.stagger ?? 0);
    if (this.monster.state !== 'broken') this.openFor('held', trap.def.hold ?? 2, 'held');
  }

  /** How fast something goes where it stands, as a share: tar slows. */
  private slowAt(x: number, y: number): number {
    let k = 1;
    for (const p of this.pools) if (dist(x, y, p.x, p.y) <= p.r) k = Math.min(k, 1 - (p.def.share ?? 0.4));
    return k;
  }

  // ------------------------------------------------------------ tells

  private stepTells(dt: number): void {
    for (const t of [...this.tells]) {
      t.left -= dt;
      if (t.left > 0) continue;
      this.tells = this.tells.filter((x) => x !== t);
      this.land(t);
      if (this.over) return;
    }
  }

  /** The halberd turns a blow: nothing is taken, and the monster is the worse for it. */
  private turned(): void {
    const h = this.hunter;
    const a = this.abilities.find((x) => x.kind === 'brace');
    h.bracing = 0;
    h.grace = Math.max(h.grace, 0.3);
    this.events.push({ t: 'turned', x: h.x, y: h.y });
    if (!a) return;
    this.addStagger(a.stagger ?? 0);
    if (this.struckBy(h.x, h.y, h.def.strike.reach * 1.5)) this.harm(h.def.strike.dmg * (a.share ?? 2), 'ability');
  }

  private land(t: Tell): void {
    const h = this.hunter;
    const m = this.monster;
    this.events.push({ t: 'land', id: t.id, kind: t.kind, x: t.x, y: t.y, r: t.kind === 'line' ? t.len : t.r, foe: t.foe });
    if (!t.foe) {
      // A sapper's charge goes up.
      this.events.push({ t: 'blast', x: t.x, y: t.y, r: t.r });
      if (this.struckBy(t.x, t.y, t.r)) {
        this.harm(t.dmg, 'sappers');
        this.addStagger(t.stagger ?? 0);
      }
      for (const f of [...this.helpers]) if (dist(f.x, f.y, t.x, t.y) <= t.r) this.harmHelper(f, t.dmg);
      for (const p of this.pools) if (dist(p.x, p.y, t.x, t.y) <= t.r + p.r) this.light(p);
      return;
    }
    if (t.charge && t.by === 0 && m.state === 'tell') {
      // The line was where it will run. It runs it now, and what it meets on the way is struck as it passes.
      m.state = 'dash';
      this.dash = { angle: t.angle, left: t.len, speed: t.charge.speed, daze: t.charge.daze, stagger: t.charge.stagger, dmg: t.dmg, id: t.id, struck: false };
      this.events.push({ t: 'dash', x: m.x, y: m.y, angle: t.angle });
      return;
    }
    if (inside(t, h.x, h.y)) {
      if (h.roll > 0) this.events.push({ t: 'dodged', x: h.x, y: h.y });
      else if (h.bracing > 0 && h.grace <= 0) {
        if (t.by === 0) this.turned();
        else {
          h.bracing = 0;
          this.events.push({ t: 'turned', x: h.x, y: h.y });
        }
      } else this.hurtHunter(t.dmg, t.attack, t.root ?? 0);
      if (this.over) return;
    }
    for (const a of [...this.allies]) if (a.state !== 'down' && a.state !== 'leave' && inside(t, a.x, a.y)) this.hurtAlly(a, t.dmg, t.attack);
    for (const b of [...this.buildings]) if (inside(t, b.x, b.y, b.def.r * 0.5)) this.hurtBuilding(b, t.dmg, t.attack);
    if (t.summon) {
      const def = byId(HELPERS, t.summon);
      if (this.helpers.length < def.most) {
        // A helper grows by half of what the monster does at a mark: a swarm at full growth leaves no room to fight.
        const f: Helper = { id: this.nextId++, def, x: t.x, y: t.y, hp: Math.round(def.hp * (1 + (MARKS[this.mark].hp - 1) / 2)), face: 1, cool: 0.8, held: 0, moving: false, winding: false };
        this.helpers.push(f);
        this.events.push({ t: 'summon', id: f.id, x: f.x, y: f.y });
      }
    }
  }

  private hurtAlly(a: Ally, amount: number, by: string): void {
    let harm = amount;
    for (const w of this.wards) if (dist(a.x, a.y, w.x, w.y) <= w.r) harm *= 1 - w.share;
    harm = Math.max(1, Math.round(harm));
    a.hp -= harm;
    this.events.push({ t: 'hurt', who: 'ally', id: a.id, x: a.x, y: a.y, amount: harm, by });
    if (a.hp > 0) return;
    a.hp = 0;
    this.events.push({ t: 'fall', who: 'ally', id: a.id, x: a.x, y: a.y });
    // A hound that is down can be whistled up again. A man is gone.
    if (a.group === 'hound') a.state = 'down';
    else this.allies = this.allies.filter((x) => x !== a);
    this.tells = this.tells.filter((t) => t.by !== a.id || t.left < 0.05);
  }

  private hurtBuilding(b: Building, amount: number, by: string): void {
    const harm = Math.max(1, Math.round(amount));
    b.hp -= harm;
    this.events.push({ t: 'hurt', who: 'building', id: b.id, x: b.x, y: b.y, amount: harm, by });
    if (b.hp <= 0) this.fell(b);
  }

  private fell(b: Building): void {
    this.buildings = this.buildings.filter((x) => x !== b);
    this.events.push({ t: 'fall', who: 'building', id: b.id, x: b.x, y: b.y });
  }

  // ------------------------------------------------------------ helpers

  private stepHelpers(dt: number): void {
    const h = this.hunter;
    for (const f of this.helpers) {
      f.moving = false;
      f.cool -= dt;
      if (f.held > 0) {
        f.held -= dt;
        continue;
      }
      f.winding = this.tells.some((t) => t.by === f.id);
      if (f.winding) continue;
      // It goes for whoever is nearest: the hunter, one of theirs, or what they built.
      let tx = h.x;
      let ty = h.y;
      let best = dist(f.x, f.y, h.x, h.y);
      for (const a of this.allies) {
        if (a.state === 'down' || a.state === 'leave') continue;
        const d = dist(f.x, f.y, a.x, a.y);
        if (d < best) [best, tx, ty] = [d, a.x, a.y];
      }
      for (const b of this.buildings) {
        const d = dist(f.x, f.y, b.x, b.y) - b.def.r;
        if (d < best) [best, tx, ty] = [d, b.x, b.y];
      }
      f.face = tx >= f.x ? 1 : -1;
      if (best > f.def.reach) {
        const a = Math.atan2(ty - f.y, tx - f.x);
        const speed = f.def.speed * this.slowAt(f.x, f.y);
        f.x += Math.cos(a) * speed * dt;
        f.y += Math.sin(a) * speed * dt;
        f.moving = true;
        const trap = this.traps.find((t) => t.arm <= 0 && dist(t.x, t.y, f.x, f.y) < (t.def.r ?? 30));
        if (trap) {
          this.traps = this.traps.filter((t) => t !== trap);
          f.held = (trap.def.hold ?? 2) * 1.6;
          this.events.push({ t: 'trap', x: trap.x, y: trap.y });
        }
      } else if (f.cool <= 0) {
        f.cool = f.def.every;
        const seconds = f.def.tell * MARKS[this.mark].tell;
        const tell: Tell = {
          id: this.nextId++, kind: 'ring', x: tx, y: ty, angle: 0, len: 0, w: 0, r: 34, half: 0, inner: 0, left: seconds, of: seconds, dmg: f.def.dmg * (1 + (MARKS[this.mark].dmg - 1) / 2), foe: true,
          attack: f.def.id, by: f.id,
        };
        this.tells.push(tell);
        this.events.push({ t: 'tell', id: tell.id, attack: f.def.id, name: f.def.name, first: false });
      }
    }
    // They do not stand in each other.
    for (let i = 0; i < this.helpers.length; i++) {
      for (let j = i + 1; j < this.helpers.length; j++) {
        const a = this.helpers[i];
        const b = this.helpers[j];
        const d = dist(a.x, a.y, b.x, b.y);
        if (d >= 26 || d < 0.01) continue;
        const k = (26 - d) / 2 / d;
        a.x -= (b.x - a.x) * k;
        a.y -= (b.y - a.y) * k;
        b.x += (b.x - a.x) * k;
        b.y += (b.y - a.y) * k;
      }
    }
  }

  // ------------------------------------------------------------ those who fight beside the hunter

  /** The hounds keep by the hunter in camp. */
  private heel(dt: number): void {
    for (const a of this.allies) if (a.group === 'hound') this.follow(a, dt, 1);
  }

  private follow(a: Ally, dt: number, side: number): void {
    const h = this.hunter;
    const n = this.allies.filter((x) => x.group === 'hound').indexOf(a);
    const tx = h.x - h.face * 34 * side;
    const ty = h.y + (n === 0 ? -30 : 30);
    this.walkTo(a, tx, ty, 14, dt);
  }

  private walkTo(a: Ally, tx: number, ty: number, near: number, dt: number): boolean {
    const d = dist(a.x, a.y, tx, ty);
    a.moving = d > near;
    if (!a.moving) return true;
    const step = Math.min(d - near * 0.5, a.def.speed * this.slowAt(a.x, a.y) * dt);
    a.x += ((tx - a.x) / d) * step;
    a.y += ((ty - a.y) / d) * step;
    a.face = tx >= a.x ? 1 : -1;
    return false;
  }

  private stepAllies(dt: number): void {
    const m = this.monster;
    const awake = m.state !== 'asleep' && m.state !== 'dead' && m.state !== 'shift';
    for (const a of [...this.allies]) {
      a.moving = false;
      if (a.state === 'down') continue;
      a.cool -= dt * (a.def.way === 'hound' ? 1 : this.hasteAt(a.x, a.y));
      const dm = dist(a.x, a.y, m.x, m.y);
      switch (a.def.way) {
        case 'hold': {
          // Where they were set, facing what comes.
          a.face = m.x >= a.x ? 1 : -1;
          if (a.cool > 0) break;
          if (awake && dm <= a.def.reach + m.def.r) {
            a.cool = a.def.every;
            this.harm(a.def.dmg, a.group);
          } else {
            const f = this.helpers.find((x) => dist(x.x, x.y, a.x, a.y) <= a.def.reach);
            if (f) {
              a.cool = a.def.every;
              this.harmHelper(f, a.def.dmg * 2);
            }
          }
          break;
        }
        case 'shoot': {
          a.face = m.x >= a.x ? 1 : -1;
          if (a.cool > 0) break;
          const f = this.helpers.find((x) => dist(x.x, x.y, a.x, a.y) <= 190);
          if (f) {
            a.cool = a.def.every;
            this.loose(a.x, a.y, f.x, f.y, 700, a.def.dmg, 'ally', 260);
          } else if (awake && dm <= a.def.reach) {
            a.cool = a.def.every;
            this.loose(a.x, a.y, m.x, m.y, 700, a.def.dmg, 'ally', a.def.reach + 60);
          }
          break;
        }
        case 'sap':
          this.sap(a, dt);
          break;
        case 'hound':
          this.hound(a, dt, awake);
          break;
      }
    }
  }

  private sap(a: Ally, dt: number): void {
    const m = this.monster;
    const blast = a.def.blast;
    if (!blast) return;
    if (a.state === 'run') {
      if (m.state === 'dead') a.state = 'leave';
      else if (this.walkTo(a, m.x, m.y, m.def.r + a.def.reach * 0.5, dt)) {
        a.state = 'plant';
        a.left = 0.5;
      }
    } else if (a.state === 'plant') {
      a.left -= dt;
      if (a.left > 0) return;
      // The charge is laid, and shown, as everything that will land is.
      const tell: Tell = {
        id: this.nextId++, kind: 'ring', x: a.x, y: a.y, angle: 0, len: 0, w: 0, r: blast.r, half: 0, inner: 0, left: blast.fuse, of: blast.fuse, dmg: blast.dmg, foe: false,
        attack: 'charge', by: a.id, stagger: blast.stagger,
      };
      this.tells.push(tell);
      this.events.push({ t: 'tell', id: tell.id, attack: 'charge', name: "A sapper's charge", first: false });
      a.state = 'flee';
      a.fx = a.x;
      a.fy = a.y;
    } else if (a.state === 'flee') {
      const d = dist(a.x, a.y, a.fx, a.fy);
      if (d > blast.r + 70) {
        a.state = 'leave';
        return;
      }
      const ang = d > 1 ? Math.atan2(a.y - a.fy, a.x - a.fx) : Math.atan2(a.y - m.y, a.x - m.x);
      this.walkTo(a, a.x + Math.cos(ang) * 200, a.y + Math.sin(ang) * 200, 4, dt);
      this.keepOut(a, 8, false);
    } else if (a.state === 'leave') {
      // Their work is done: off the field by its nearest side.
      const toLeft = a.x < this.w / 2;
      if (this.walkTo(a, toLeft ? -30 : this.w + 30, a.y, 6, dt)) this.allies = this.allies.filter((x) => x !== a);
    }
  }

  private hound(a: Ally, dt: number, awake: boolean): void {
    const h = this.hunter;
    const m = this.monster;
    if (a.state === 'heel' && a.left > 0) {
      a.left -= dt;
      this.follow(a, dt, 1);
      return;
    }
    a.state = 'run';
    // A helper near the hunter first; then the monster, if it is not far off; else by the hunter's side.
    let f: Helper | null = null;
    let best = 250;
    for (const x of this.helpers) {
      const d = dist(x.x, x.y, h.x, h.y);
      if (d < best) [best, f] = [d, x];
    }
    if (f) {
      if (this.walkTo(a, f.x, f.y, a.def.reach * 0.7, dt) && a.cool <= 0) {
        a.cool = a.def.every;
        this.harmHelper(f, a.def.dmg * 1.5);
      }
    } else if (awake && (this.frenzy > 0 || dist(m.x, m.y, h.x, h.y) < 440)) {
      if (this.walkTo(a, m.x, m.y, m.def.r + a.def.reach * 0.5, dt) && a.cool <= 0) {
        a.cool = a.def.every;
        this.harm(a.def.dmg, 'hound');
      }
    } else this.follow(a, dt, 1);
  }

  // ------------------------------------------------------------ buildings, shots and what lies on the ground

  private stepBuildings(dt: number): void {
    const m = this.monster;
    const awake = m.state !== 'asleep' && m.state !== 'dead' && m.state !== 'shift';
    for (const b of this.buildings) {
      b.cool = Math.max(0, b.cool - dt);
      if (b.def.kind === 'ballista' && b.cool <= 0 && awake && dist(b.x, b.y, m.x, m.y) <= b.def.reach) {
        b.cool = b.def.every ?? 4;
        this.loose(b.x, b.y - 10, m.x, m.y, 950, b.def.dmg ?? 20, 'ballista', b.def.reach + 80);
      } else if (b.def.kind === 'fire') {
        for (const p of this.pools) if (p.burning <= 0 && dist(p.x, p.y, b.x, b.y) <= p.r + 46) this.light(p);
      }
    }
  }

  private light(p: Pool): void {
    if (p.burning > 0) return;
    p.burning = 5;
    p.life = Math.max(p.life, 5);
    this.events.push({ t: 'alight', x: p.x, y: p.y, r: p.r });
  }

  private stepShots(dt: number): void {
    const m = this.monster;
    for (const s of [...this.shots]) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.left -= dt;
      let gone = s.left <= 0;
      if (!gone && this.struckBy(s.x, s.y, 6)) {
        this.harm(s.dmg, s.from === 'hunter' ? 'hunter' : s.from === 'ballista' ? 'ballista' : 'crossbowmen');
        gone = true;
      }
      if (!gone) {
        const f = this.helpers.find((x) => dist(x.x, x.y, s.x, s.y) < 20);
        if (f) {
          this.harmHelper(f, s.dmg);
          gone = true;
        }
      }
      if (gone) this.shots = this.shots.filter((x) => x !== s);
      if (m.state === 'dead') return;
    }
  }

  private stepGround(dt: number): void {
    for (const t of this.traps) {
      t.arm -= dt;
      t.life -= dt;
    }
    this.traps = this.traps.filter((t) => t.life > 0);
    for (const w of this.wards) w.life -= dt;
    this.wards = this.wards.filter((w) => w.life > 0);
    for (const p of this.pools) {
      p.life -= dt;
      if (p.burning <= 0) continue;
      const before = Math.floor(p.burning * 2);
      p.burning -= dt;
      // Twice a second, whatever stands in the fire is burnt.
      if (Math.floor(p.burning * 2) === before) continue;
      const dmg = (p.def.dmg ?? 8) / 2;
      if (this.struckBy(p.x, p.y, p.r * 0.8)) this.harm(dmg, 'fire');
      for (const f of [...this.helpers]) if (dist(f.x, f.y, p.x, p.y) <= p.r) this.harmHelper(f, dmg);
      if (this.over) return;
    }
    this.pools = this.pools.filter((p) => p.life > 0);
  }
}

function byIdOr<T extends { id: string }>(list: readonly T[], id: string): T | undefined {
  return list.find((x) => x.id === id);
}
