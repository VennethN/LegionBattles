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
  ABILITIES, ATTACK, BUILDINGS, CAMP, CART, ENRAGE, FIELD, HELPERS, HORN_WAIT, HOUND, HUNTERS, HURT_GRACE, LESSONS, MARKER, MARKS, MINION, MONSTERS, PARTY, REINFORCEMENTS, REVIVE, TASKS,
  TELL_FLOOR, VARIANTS, VILLAGER, byId,
  type AbilityDef, type AllyDef, type AttackDef, type BlowDef, type BuildingDef, type HelperDef, type HunterDef, type LessonDef, type LessonStep, type Mark, type MonsterDef, type ReinforcementDef,
  type ShapeDef, type TaskKind, type VariantDef,
} from './content';
import { Bot } from './bot';
import { Rng } from './rng';
import { dist, inside, turn } from './geometry';

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
  /** Attack, held or not: a press is a blow, pressed again in time the next of the chain, held the chain again (or a heavy shot aimed). */
  attack?: boolean;
  /** Which way to attack, in radians: toward the pointer with a mouse. Without it, the way the hunter faces, turned to a boss in reach a little ahead. */
  aim?: number;
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
  /** A hunt that teaches, by the lesson's name (content.ts, LESSONS): its simpler monster, no camp, and its steps. */
  lesson?: string;
  /** True if the lesson's steps have been done before: the same gentle hunt, without the waiting. */
  taught?: boolean;
  /** What comes at the horn, each with how many times it can be called. */
  reinforcements: ReadonlyArray<{ id: string; charges: number }>;
  /** What can be built in camp, each with how many, and whether a sturdier one was bought. */
  buildings: ReadonlyArray<{ id: string; n: number; sturdy?: boolean }>;
  /** True for a field stood up, for a tall window. */
  tall?: boolean;
  /** The trophy the hunter wears, by name. */
  trophy?: string | null;
  /** Who goes with the player, by hunter: the partners, each steered by the hunt's own brain. */
  partners?: readonly string[];
  /** What this contract makes of the hunt: how the boss is unlike itself, and the tasks besides the kill. */
  terms?: Terms;
}

/** A contract's terms, as the board drew them (lodge.ts). */
export interface Terms {
  variants: readonly string[];
  tasks: ReadonlyArray<{ id: TaskKind; n?: number }>;
}

/** A task of the contract as the hunt keeps it: how far along, and whether it is done or failed. */
export interface TaskState {
  id: TaskKind;
  name: string;
  /** What it asks, its number written in. */
  says: string;
  n: number;
  /** How far along: seconds, hits, breaks, markers broken or villagers alive, by the task. */
  now: number;
  done: boolean;
  failed: boolean;
}

export interface Hunter {
  def: HunterDef;
  /** Their place in the party: 0 is the player. */
  index: number;
  /** True for a partner, steered by the hunt's own brain. */
  ai: boolean;
  abilities: readonly [AbilityDef, AbilityDef];
  /** The trophy they wear: only the player's. */
  trophy: string | null;
  /** True while they are down: nothing they do until someone helps them up, and nothing can hurt them. */
  down: boolean;
  /** Seconds of help given them while down. */
  help: number;
  /** An ability asked for in the middle of a roll, used as the roll ends. */
  wanted: 0 | 1 | null;
  /** The blow being made: which of the chain, seconds since it began, which way, and whether it has landed. */
  blow: { n: number; t: number; aim: number; def: BlowDef; landed: boolean; heavy: boolean } | null;
  /** The next blow of the chain, and how long a press still chains to it. */
  chain: number;
  chainLeft: number;
  /** A press made while a blow was being made: the next goes as it ends. */
  queued: boolean;
  /** Seconds a held attack has aimed a heavy shot. */
  aiming: number;
  /** True if attack was held the step before: a press is a new hold. */
  held: boolean;
  /** Times struck in this hunt. */
  hits: number;
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

/** Fire left on the ground by a burning blow: a pool that burns and does not slow. */
const FIRE_GROUND: AbilityDef = { id: 'fire', name: 'Fire', says: '', kind: 'pool', wait: 0, share: 0, dmg: 6 };

/** What the hunter is called in the tally of harm: the player, or a partner by name. */
const whoOf = (h: Hunter): string => (h.index === 0 ? 'hunter' : h.def.id);

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
  /** How much bigger it and its shapes are than its kind: a Giant. */
  size: number;
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
  /** Whose it is, by their place in the party: a hound runs with its own hunter. */
  owner: number;
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
  /** Who loosed it, for the tally: a hunter's name in it, or the crossbowmen or the ballista. */
  by: string;
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
  /** A blow begun: its wind-up. `n` is its place in the chain. */
  | { t: 'blow'; who: number; n: number; heavy: boolean; x: number; y: number; angle: number; wind: number }
  /** A blow landing. */
  | { t: 'strike'; who: number; n: number; heavy: boolean; x: number; y: number; angle: number; reach: number; kind: 'arc' | 'thrust' | 'bolt' }
  | { t: 'hit'; who: 'monster' | 'helper'; id: number; x: number; y: number; amount: number; big: boolean; open: boolean }
  | { t: 'hurt'; who: 'hunter' | 'ally' | 'building'; id: number; x: number; y: number; amount: number; by: string }
  | { t: 'roll'; who: number; x: number; y: number }
  | { t: 'dodged'; who: number; x: number; y: number }
  | { t: 'ability'; who: number; id: string; x: number; y: number; r: number; tx: number; ty: number }
  | { t: 'turned'; who: number; x: number; y: number }
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
  | { t: 'lesson'; id: string; index: number; hold: boolean }
  | { t: 'learned'; id: string }
  | { t: 'taught'; says: string }
  /** A hunter of the party is down, and helped up. */
  | { t: 'down'; who: number; x: number; y: number }
  | { t: 'helped'; who: number; by: number }
  /** The boss is after another of the party. */
  | { t: 'target'; who: number }
  /** A task of the contract is done, or failed. */
  | { t: 'task'; id: TaskKind; done: boolean }
  /** An Armored boss's armor is broken. */
  | { t: 'armor' }
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
  /** True if the hunt was a lesson and every step of it was done. */
  taught: boolean;
  /** The contract's tasks: done or not, by name. */
  tasks: Partial<Record<TaskKind, boolean>>;
  /** How many times a hunter of the party went down. */
  downs: number;
}

interface Pending {
  shape: ShapeDef;
  at: number;
  first: boolean;
}

export { inside };

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
  /** The player's hunter: the first of the party. */
  readonly hunter: Hunter;
  /** Everyone on the hunt: the player first, then the partners. */
  readonly party: Hunter[];
  readonly monster: Monster;
  /** The contract's variants, by name, and its tasks as they stand. */
  readonly variants: ReadonlySet<string>;
  readonly tasks: TaskState[] = [];
  /** Which of the party the boss is after, by place. */
  targetWho = 0;
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
  readonly tally: Tally = { time: 0, dealt: {}, taken: {}, killedBy: null, breaks: 0, taught: false, tasks: {}, downs: 0 };

  private readonly rng: Rng;
  private readonly sturdy = new Set<string>();
  private events: Ev[] = [];
  /** Each partner's brain: the bot's, as a partner. None for the player. */
  private readonly brains: Array<Bot | null>;
  /** What the variants do to the boss's numbers, put together. */
  private readonly vary: { speed: number; tell: number; gap: number; armor: number; ahead: boolean; blight: VariantDef['blight']; again: string; escort: number; waves: VariantDef['waves'] };
  private blightIn = 0;
  private waveIn = 0;
  private againDone = false;
  /** Harm done to the boss by each of the party: who hurt it most is one it turns on. */
  private readonly dealtBy: number[];
  private nextId = 1;
  /** Where the monster is in the round of its part. */
  private round = 0;
  private pending: Pending[] = [];
  private elapsed = 0;
  private tellFor = 1;
  private targetAlly = 0;
  private dash: { angle: number; left: number; speed: number; daze: number; stagger: number; dmg: number; id: number; struck: Set<number> } | null = null;
  private frenzyBy = 1;
  /** What a mark, or a lesson in its place, does to the monster's numbers. */
  private readonly scale: { hp: number; dmg: number; tell: number; gap: number };
  /** The monster's rounds, part by part: its own, or a lesson's. */
  private readonly parts: readonly (readonly string[])[];
  /** The lesson this hunt teaches, the step it waits on, and how far that step has got. */
  private readonly lessonDef: LessonDef | null;
  private stepAt = 0;
  private stepN = 0;
  private stepRolled = false;
  private stepHurt = false;

  constructor(setup: Setup) {
    this.rng = new Rng(setup.seed);
    this.tall = !!setup.tall;
    this.w = this.tall ? FIELD.short : FIELD.long;
    this.h = this.tall ? FIELD.long : FIELD.short;
    this.mark = setup.mark;
    this.trophy = setup.trophy ?? null;
    this.lessonDef = setup.lesson ? byId(LESSONS, setup.lesson) : null;
    const hd = byId(HUNTERS, setup.hunter);
    const md = byId(MONSTERS, setup.monster);
    this.scale = this.lessonDef?.scale ?? MARKS[setup.mark];
    const lesson = this.lessonDef;
    // A lesson is fought alone and as it is written: no partners, nothing of a contract's.
    const partners = lesson ? [] : (setup.partners ?? []).slice(0, PARTY.most - 1);
    const terms = lesson ? null : (setup.terms ?? null);
    this.variants = new Set((terms?.variants ?? []).filter((v) => VARIANTS.some((x) => x.id === v && (!x.only || x.only === md.id))));
    const vs = VARIANTS.filter((v) => this.variants.has(v.id));
    const num = (f: (v: VariantDef) => number | undefined, base: number): number => vs.reduce((k, v) => k * (f(v) ?? 1), base);
    this.vary = {
      speed: num((v) => v.speed, 1), tell: num((v) => v.tell, 1), gap: num((v) => v.gap, 1), armor: vs.reduce((k, v) => Math.max(k, v.armor ?? 0), 0),
      ahead: vs.some((v) => v.ahead), blight: vs.find((v) => v.blight)?.blight, again: vs.find((v) => v.again)?.again ?? '',
      escort: vs.reduce((k, v) => k + (v.escort ?? 0), 0), waves: vs.find((v) => v.waves)?.waves,
    };
    this.blightIn = this.vary.blight?.every ?? 0;
    this.waveIn = this.vary.waves?.every ?? 0;
    // Opening Graves more often: one more after every so many of each round.
    const more = vs.find((v) => v.more)?.more;
    const rounds = lesson?.parts ?? md.parts;
    this.parts = more && md.attacks.some((a) => a.id === more.attack)
      ? rounds.map((r) => r.flatMap((id, i) => ((i + 1) % more.every === 0 ? [id, more.attack] : [id])))
      : rounds;
    if (this.lessonDef && setup.taught) {
      this.stepAt = this.lessonDef.steps.length;
      this.tally.taught = true;
    }
    const [hx, hy] = this.tall ? [this.w / 2, this.h * 0.78] : [this.w * 0.2, this.h / 2];
    const [mx, my] = this.tall ? [this.w / 2, this.h * 0.28] : [this.w * 0.72, this.h / 2];
    const make = (def: HunterDef, index: number, x: number, y: number): Hunter => ({
      def, index, ai: index > 0, abilities: [byId(ABILITIES, def.abilities[0]), byId(ABILITIES, def.abilities[1])], trophy: index === 0 ? (setup.trophy ?? null) : null,
      down: false, help: 0, wanted: null, blow: null, chain: 0, chainLeft: 0, queued: false, aiming: 0, held: false, hits: 0,
      x, y, face: mx >= x ? 1 : -1, aim: Math.atan2(my - y, mx - x), hp: def.hp, maxHp: def.hp, moving: false, since: 0, roll: 0, rollWait: 0, rx: 1, ry: 0,
      grace: 0, root: 0, waits: [0, 0], bracing: 0, spared: false,
    });
    this.hunter = make(hd, 0, hx, hy);
    this.party = [this.hunter];
    // Partners stand behind and beside the player as they come in.
    partners.forEach((id, i) => {
      const side = i === 1 ? 1 : i === 0 ? -1 : 0;
      const back = i === 2 ? 70 : 30;
      const [px, py] = this.tall ? [hx + side * 80, hy + back] : [hx - back, hy + side * 80];
      this.party.push(make(byId(HUNTERS, id), i + 1, px, py));
    });
    this.brains = this.party.map((p) => (p.ai ? new Bot((setup.seed * 13 + p.index * 101) >>> 0, { who: p.index, partner: true, react: 0.28, slip: 0.08 }) : null));
    this.dealtBy = this.party.map(() => 0);
    const n = this.party.length;
    const hpBy = num((v) => v.hp, 1) * (1 + PARTY.hp * (n - 1));
    const hp = Math.round(md.hp * this.scale.hp * hpBy);
    const size = num((v) => v.size, 1);
    this.monster = {
      def: md, x: mx, y: my, face: hx >= mx ? 1 : -1, aim: Math.atan2(hy - my, hx - mx), hp, maxHp: hp, part: 0, state: 'asleep', left: 0, stagger: 0,
      staggerMax: Math.round(md.stagger.max * (this.lessonDef?.stagger ?? 1) * (1 + PARTY.stagger * (n - 1))), attack: null,
      moving: false, enraged: false, soft: 0, softBy: 0, size,
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
    for (const p of this.party) {
      for (let i = 0; i < (p.def.hounds ?? 0); i++) this.allies.push(this.ally(HOUND, 'hound', p.x - 40, p.y + (i === 0 ? -34 : 34), p.index));
    }
    if (terms) this.setTasks(terms, md, hx, hy, mx, my);
    // A lesson has no camp: the monster is awake as the hunter walks in, and the first step is on.
    if (this.lessonDef) {
      this.wake();
      this.nextStep();
    }
  }

  /** The step of the lesson the hunt is waiting on, if it is waiting on one: what the plate shows. */
  get teaching(): { step: LessonStep; index: number; of: number } | null {
    const l = this.lessonDef;
    return l && this.stepAt < l.steps.length ? { step: l.steps[this.stepAt], index: this.stepAt, of: l.steps.length } : null;
  }

  /** True if this hunt has a camp before it: a lesson has none. */
  get camps(): boolean {
    return !this.lessonDef;
  }

  /** Says that the step waited on has begun. */
  private nextStep(): void {
    const t = this.teaching;
    this.stepN = 0;
    this.stepRolled = false;
    this.stepHurt = false;
    if (!t) return;
    // An ability to be shown is ready to be used.
    if (t.step.wants === 'skill' && t.step.skill !== undefined) this.hunter.waits[t.step.skill] = 0;
    this.events.push({ t: 'lesson', id: t.step.id, index: t.index, hold: !!t.step.hold });
  }

  /** The step waited on has been done: on to the next, or to the hunt itself. */
  private learn(): void {
    const l = this.lessonDef;
    const t = this.teaching;
    if (!l || !t) return;
    this.events.push({ t: 'learned', id: t.step.id });
    this.stepAt++;
    if (this.stepAt >= l.steps.length) {
      this.tally.taught = true;
      this.events.push({ t: 'taught', says: l.after });
    }
    else this.nextStep();
  }

  /** Something the step may have been waiting for has happened. */
  private did(what: LessonStep['wants'], n = 1, skill?: 0 | 1): void {
    const t = this.teaching;
    if (!t || t.step.wants !== what) return;
    if (what === 'skill' && t.step.skill !== skill) return;
    this.stepN += n;
    if (this.stepN >= (t.step.n ?? 1)) this.learn();
  }

  /** How the hunt ended, once it has. */
  get over(): 'won' | 'lost' | null {
    return this.phase === 'won' || this.phase === 'lost' ? this.phase : null;
  }

  /** The hunter's two abilities, as the tables have them. */
  get skills(): readonly [AbilityDef, AbilityDef] {
    return this.hunter.abilities;
  }

  /** The party still standing. */
  get standing(): Hunter[] {
    return this.party.filter((p) => !p.down);
  }

  // ------------------------------------------------------------ the contract's tasks

  /** Puts the contract's tasks in place: their numbers, and what some of them stand on the field. */
  private setTasks(terms: Terms, md: MonsterDef, hx: number, hy: number, mx: number, my: number): void {
    for (const t of terms.tasks) {
      const def = TASKS.find((x) => x.id === t.id);
      if (!def || this.tasks.some((x) => x.id === def.id)) continue;
      if (def.id === 'together' && this.party.length < 2) continue;
      const n = t.n ?? def.n?.[this.mark - 1] ?? 0;
      const says = def.says.replace('{n}', def.id === 'swift' ? `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` : String(n));
      this.tasks.push({ id: def.id, name: def.name, says, n, now: 0, done: false, failed: false });
      const e = FIELD.edge + 40;
      if (def.id === 'villagers') {
        // Three of them, along the hunter's own side of the field, behind where the fight starts.
        for (let i = 0; i < 3; i++) {
          const k = (i + 1) / 4;
          const [x, y] = this.tall ? [this.w * k, this.h - e - (i === 1 ? 40 : 0)] : [e + (i === 1 ? 40 : 0), this.h * k];
          this.allies.push(this.ally(VILLAGER, 'villager', x, y, 0));
        }
      } else if (def.id === 'cart') {
        // Behind the hunter's start, where the fight is not at first.
        const [x, y] = this.tall ? [this.w / 2 + 150, Math.min(this.h - e, hy + 60)] : [Math.max(e, hx - 90), hy - 170];
        this.buildings.push({ id: this.nextId++, def: CART, x, y, hp: CART.hp, maxHp: CART.hp, cool: 0 });
      } else if (def.id === 'markers') {
        const hd = byId(HELPERS, MARKER[md.id] ?? 'gravemarker');
        for (let i = 0; i < n; i++) {
          // Round the edge of the field, away from where either side starts.
          const a = (i / n) * TAU + 0.4;
          let x = this.w / 2 + Math.cos(a) * (this.w / 2 - e - 30);
          let y = this.h / 2 + Math.sin(a) * (this.h / 2 - e - 30);
          if (dist(x, y, hx, hy) < 160) [x, y] = [this.w - x, this.h - y];
          if (dist(x, y, mx, my) < 160) [x, y] = [this.w / 2 + (x - this.w / 2) * 0.6, this.h / 2 + (y - this.h / 2) * 0.6];
          const hp = Math.round(hd.hp * (1 + (this.scale.hp - 1) / 2));
          this.helpers.push({ id: this.nextId++, def: hd, x, y, hp, face: 1, cool: 0, held: 0, moving: false, winding: false });
        }
      }
    }
  }

  private task(id: TaskKind): TaskState | undefined {
    return this.tasks.find((t) => t.id === id && !t.done && !t.failed);
  }

  private fail(id: TaskKind): void {
    const t = this.task(id);
    if (!t) return;
    t.failed = true;
    this.tally.tasks[id] = false;
    this.events.push({ t: 'task', id, done: false });
  }

  private finish(id: TaskKind): void {
    const t = this.task(id);
    if (!t) return;
    t.done = true;
    this.tally.tasks[id] = true;
    this.events.push({ t: 'task', id, done: true });
  }

  /** How the tasks stand now: what can be known before the end is known now. */
  private checkTasks(): void {
    for (const t of this.tasks) {
      if (t.done || t.failed) continue;
      switch (t.id) {
        case 'swift':
          t.now = Math.floor(this.time);
          if (this.time > t.n) this.fail('swift');
          break;
        case 'careful':
          t.now = this.hunter.hits;
          if (t.now > t.n) this.fail('careful');
          break;
        case 'breaks':
          t.now = this.tally.breaks;
          if (t.now >= t.n) this.finish('breaks');
          break;
        case 'markers': {
          const left = this.helpers.filter((f) => f.def.still).length;
          t.now = t.n - left;
          if (left === 0) this.finish('markers');
          break;
        }
        case 'villagers':
          t.now = this.allies.filter((a) => a.group === 'villager').length;
          if (t.now < t.n) this.fail('villagers');
          break;
        case 'cart':
          t.now = this.buildings.some((b) => b.def.id === 'cart') ? 1 : 0;
          if (t.now === 0) this.fail('cart');
          break;
        case 'together':
          t.now = this.tally.downs;
          if (t.now > 0) this.fail('together');
          break;
        case 'nobuild':
          t.now = this.buildings.filter((b) => b.def.id !== 'cart').length;
          if (t.now > 0) this.fail('nobuild');
          break;
      }
    }
  }

  /** The boss is dead: what was still in hand is done, and what needed doing first is failed. */
  private closeTasks(): void {
    this.checkTasks();
    for (const t of this.tasks) {
      if (t.done || t.failed) continue;
      if (t.id === 'breaks' || t.id === 'markers') this.fail(t.id);
      else this.finish(t.id);
    }
  }

  /** True while the monster can be struck freely: what the stagger is filled in. */
  get open(): boolean {
    const s = this.monster.state;
    return s === 'recover' || s === 'dazed' || s === 'held' || s === 'broken';
  }

  /** How far through its health the monster's next change is, as shares of all of it: the bar is cut there. */
  get cuts(): readonly number[] {
    const n = this.parts.length;
    return Array.from({ length: n - 1 }, (_, i) => (n - 1 - i) / n);
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
    this.escort();
  }

  /** A contract that says the boss comes with minions: they are about it as it wakes, and again at each new phase. */
  private escort(): void {
    const n = this.vary.escort;
    const id = MINION[this.monster.def.id];
    if (!n || !id) return;
    const def = byId(HELPERS, id);
    const m = this.monster;
    for (let i = 0; i < n; i++) {
      const a = m.aim + ((i - (n - 1) / 2) * 0.9);
      const f: Helper = { id: this.nextId++, def, x: m.x + Math.cos(a) * (m.def.r + 50), y: m.y + Math.sin(a) * (m.def.r + 50), hp: Math.round(def.hp * (1 + (this.scale.hp - 1) / 2)), face: 1, cool: 1, held: 0, moving: false, winding: false };
      this.keepOut(f, 10, false);
      this.helpers.push(f);
      this.events.push({ t: 'summon', id: f.id, x: f.x, y: f.y });
    }
  }

  // ------------------------------------------------------------ a step

  step(steer: Steer, dt = STEP): void {
    if (this.over) return;
    const h = this.hunter;
    const m = this.monster;
    if (this.phase === 'camp') {
      this.moveHunter(h, steer, dt);
      // Partners keep by the player in camp: building and waking are the player's.
      for (const p of this.party) if (p.ai) this.moveHunter(p, this.brains[p.index]?.steer(this) ?? { x: 0, y: 0 }, dt);
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

    for (const p of this.party) {
      const s = p.index === 0 ? steer : (this.brains[p.index]?.steer(this) ?? { x: 0, y: 0 });
      this.act(p, s, dt);
      if (this.over) return;
    }
    if (steer.call !== undefined && !h.down) this.call(steer.call);
    this.helpUp(dt);

    this.stepMonster(dt);
    this.stepTells(dt);
    this.stepHelpers(dt);
    this.stepAllies(dt);
    this.stepBuildings(dt);
    this.stepShots(dt);
    this.stepGround(dt);
    this.stepContract(dt);
    if (!this.over) this.checkTasks();
  }

  /** One of the party, this step: their waits run down, and they do what they are steered to. */
  private act(h: Hunter, steer: Steer, dt: number): void {
    h.grace = Math.max(0, h.grace - dt);
    h.root = Math.max(0, h.root - dt);
    h.bracing = Math.max(0, h.bracing - dt);
    h.rollWait = Math.max(0, h.rollWait - dt);
    h.waits[0] = Math.max(0, h.waits[0] - dt);
    h.waits[1] = Math.max(0, h.waits[1] - dt);
    if (h.down) {
      h.moving = false;
      return;
    }
    if (steer.dodge) this.rollNow(h, steer);
    // An ability asked for in the middle of a roll is kept, and used as the roll ends: a press is not lost to bad timing.
    if (steer.a) h.wanted = 0;
    if (steer.b) h.wanted = 1;
    if (h.wanted !== null && h.roll <= 0 && !(h.blow && !h.blow.landed)) {
      this.use(h, h.wanted);
      h.wanted = null;
    }
    this.moveHunter(h, steer, dt);
    this.attack(h, steer, dt);
  }

  /** What a contract adds as the hunt goes: rot left behind a Blighted boss, and minions that keep coming. */
  private stepContract(dt: number): void {
    const m = this.monster;
    const awake = m.state !== 'asleep' && m.state !== 'dead' && m.state !== 'shift';
    const b = this.vary.blight;
    if (b && awake) {
      this.blightIn -= dt;
      if (this.blightIn <= 0 && m.moving) {
        this.blightIn = b.every;
        // Rot where it stands, which bursts after its warning: nothing hurts without a tell.
        const seconds = b.tell * this.scale.tell;
        const tell: Tell = {
          id: this.nextId++, kind: 'ring', x: m.x, y: m.y, angle: 0, len: 0, w: 0, r: b.r * m.size, half: 0, inner: 0, left: seconds, of: seconds, dmg: b.dmg * this.scale.dmg, foe: true,
          attack: 'blight', by: -1,
        };
        this.tells.push(tell);
        this.events.push({ t: 'tell', id: tell.id, attack: 'blight', name: 'Rot', first: false });
      }
    }
    const w = this.vary.waves;
    const id = MINION[m.def.id];
    if (w && id && awake) {
      this.waveIn -= dt;
      if (this.waveIn <= 0) {
        this.waveIn = w.every;
        const attack: AttackDef = { id: 'waves', name: 'More Minions', tell: 1.4, recover: 0, dmg: 6, summon: id, shapes: [] };
        this.tell({ kind: 'marks', n: w.n, r: 44, at: 'field' }, 1.4 * this.scale.tell, attack, m.aim, false, -1);
      }
    }
  }

  /** A hunter who is down is helped up by whoever stands by them long enough. */
  private helpUp(dt: number): void {
    for (const d of this.party) {
      if (!d.down) continue;
      const by = this.party.find((p) => !p.down && p.roll <= 0 && dist(p.x, p.y, d.x, d.y) <= REVIVE.r);
      if (!by) {
        d.help = Math.max(0, d.help - dt * REVIVE.fade);
        continue;
      }
      d.help += dt;
      if (d.help < REVIVE.time) continue;
      d.down = false;
      d.help = 0;
      d.hp = Math.round(d.maxHp * REVIVE.hp);
      d.grace = REVIVE.grace;
      this.events.push({ t: 'helped', who: d.index, by: by.index });
    }
  }

  // ------------------------------------------------------------ the hunter

  private moveHunter(h: Hunter, steer: Steer, dt: number): void {
    if (h.roll > 0) {
      const speed = this.rollDist(h) / h.def.dodge.dur;
      h.x += h.rx * speed * dt;
      h.y += h.ry * speed * dt;
      h.roll = Math.max(0, h.roll - dt);
      h.moving = true;
    } else if (h.root > 0 || h.bracing > 0 || (h.blow && !h.blow.landed && h.blow.def.kind !== 'bolt')) {
      // Held, braced, or in the wind-up of a swing or a thrust: they stand.
      h.moving = false;
    } else {
      const len = Math.hypot(steer.x, steer.y);
      h.moving = len > 0.05;
      if (h.moving) {
        const k = Math.min(1, len) / len;
        // Aiming a heavy shot, or in a blow's recovery, they go at half pace.
        const slow = h.aiming > 0 || h.blow ? 0.5 : 1;
        h.x += steer.x * k * h.def.speed * slow * dt;
        h.y += steer.y * k * h.def.speed * slow * dt;
        if (Math.abs(steer.x) > 0.1) h.face = steer.x > 0 ? 1 : -1;
        if (h.index === 0) this.did('move', Math.min(1, len) * h.def.speed * dt);
        // They look where they walk, and attack that way unless told otherwise.
        if (!h.blow) h.aim = Math.atan2(steer.y, steer.x);
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

  private rollDist(h: Hunter): number {
    return h.def.dodge.dist * (h.trophy === 'antler' ? 1.25 : 1);
  }

  private rollNow(h: Hunter, steer: Steer): void {
    if (h.rollWait > 0 || h.roll > 0 || h.root > 0) return;
    // A blow cannot be dodged out of while it winds up; its recovery can be cut short.
    if (h.blow && !h.blow.landed) return;
    h.blow = null;
    h.queued = false;
    h.aiming = 0;
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
    h.rollWait = h.def.dodge.wait * (h.trophy === 'antler' ? 0.75 : 1);
    h.bracing = 0;
    this.events.push({ t: 'roll', who: h.index, x: h.x, y: h.y });
    if (h.index === 0 && this.tells.some((t) => t.foe && t.by === 0)) this.stepRolled = true;
  }

  /** How much faster someone strikes where they stand: a watchfire's doing. */
  private hasteAt(x: number, y: number): number {
    let most = 0;
    for (const b of this.buildings) if (b.def.kind === 'fire' && dist(x, y, b.x, b.y) <= b.def.reach) most = Math.max(most, b.def.share ?? 0);
    return 1 + most;
  }

  /**
   * Attacking: a press is a blow, and a press while one is being made, or soon after, the next of the chain. Held, the
   * chain goes on by itself (or, for a hunter with a heavy shot, the shot is aimed and goes when it is ready).
   */
  private attack(h: Hunter, steer: Steer, dt: number): void {
    h.since += dt;
    const hold = !!steer.attack;
    const pressed = hold && !h.held;
    h.held = hold;
    const can = h.roll <= 0 && h.bracing <= 0 && this.phase === 'hunt';
    const b = h.blow;
    if (b) {
      b.t += dt * this.hasteAt(h.x, h.y);
      if (pressed) h.queued = true;
      if (!b.landed && b.t >= b.def.wind) {
        b.landed = true;
        this.landBlow(h, b);
        if (this.over) return;
      }
      if (b.landed && b.t >= b.def.wind + b.def.recover) {
        h.blow = null;
        h.chainLeft = ATTACK.chain;
        // A press made meanwhile, or the attack still held, is the next blow at once.
        if (can && (h.queued || (hold && !h.def.heavy))) this.startBlow(h, steer, false);
        h.queued = false;
      }
      return;
    }
    h.chainLeft = Math.max(0, h.chainLeft - dt);
    if (h.chainLeft <= 0) h.chain = 0;
    if (!can) {
      h.aiming = 0;
      return;
    }
    const heavy = h.def.heavy;
    if (heavy && hold && !pressed) {
      // Held: the heavy shot is cranked, and goes when it is ready.
      h.aiming += dt;
      if (h.aiming >= (heavy.aim ?? 1)) {
        h.aiming = 0;
        this.startBlow(h, steer, true);
      }
      return;
    }
    h.aiming = 0;
    if (pressed || (hold && !heavy)) this.startBlow(h, steer, false);
  }

  /** Which way a blow goes: where the player points, or the way the hunter faces, turned to a boss in reach a little ahead. */
  private aimOf(h: Hunter, steer: Steer, reach: number): number {
    if (steer.aim !== undefined) return steer.aim;
    const m = this.monster;
    const base = h.aim;
    const awake = m.state !== 'asleep' && m.state !== 'dead';
    const to = Math.atan2(m.y - h.y, m.x - h.x);
    if (awake && dist(h.x, h.y, m.x, m.y) <= reach + m.def.r * m.size + 30 && Math.abs(turn(base, to)) <= ATTACK.help * RAD) return to;
    // A helper in reach and ahead, and a marker to be broken, take the aim the same way.
    for (const f of this.helpers) {
      const a = Math.atan2(f.y - h.y, f.x - h.x);
      if (dist(h.x, h.y, f.x, f.y) <= reach + 20 && Math.abs(turn(base, a)) <= ATTACK.help * RAD) return a;
    }
    return base;
  }

  private startBlow(h: Hunter, steer: Steer, heavy: boolean): void {
    const combo = h.def.combo;
    const n = heavy ? 0 : h.chain % combo.length;
    const def = heavy ? (h.def.heavy as BlowDef) : combo[n];
    const aim = this.aimOf(h, steer, def.reach);
    h.aim = aim;
    if (Math.abs(Math.cos(aim)) > 0.15) h.face = Math.cos(aim) > 0 ? 1 : -1;
    h.blow = { n, t: 0, aim, def, landed: false, heavy };
    h.queued = false;
    if (!heavy) h.chain = (n + 1) % combo.length;
    this.events.push({ t: 'blow', who: h.index, n, heavy, x: h.x, y: h.y, angle: aim, wind: def.wind });
  }

  /** A blow lands: on the boss, its helpers and its markers, as far and as wide as the blow goes. */
  private landBlow(h: Hunter, b: NonNullable<Hunter['blow']>): void {
    const m = this.monster;
    const d = b.def;
    h.since = 0;
    this.events.push({ t: 'strike', who: h.index, n: b.n, heavy: b.heavy, x: h.x, y: h.y, angle: b.aim, reach: d.reach, kind: d.kind });
    // A bell within reach is rung, if there is something to break with it.
    if (m.state === 'tell') {
      const bell = this.buildings.find((x) => x.def.kind === 'bell' && x.cool <= 0 && dist(h.x, h.y, x.x, x.y) <= x.def.reach);
      if (bell) {
        bell.cool = bell.def.every ?? 15;
        this.events.push({ t: 'bell', x: bell.x, y: bell.y });
        this.cancelAttack();
        this.addStagger(bell.def.stagger ?? 0);
        if (this.monster.state !== 'broken') this.openFor('dazed', bell.def.daze ?? 1.5, 'bell');
        return;
      }
    }
    if (d.kind === 'bolt') {
      const tx = h.x + Math.cos(b.aim) * d.reach;
      const ty = h.y + Math.sin(b.aim) * d.reach;
      const far = d.far && dist(h.x, h.y, m.x, m.y) >= d.far.beyond ? 1 + d.far.by : 1;
      this.loose(h.x, h.y, tx, ty, d.speed ?? 800, d.dmg * far, 'hunter', d.reach + 80, whoOf(h));
      return;
    }
    const awake = m.state !== 'asleep' && m.state !== 'dead';
    const body = m.def.r * m.size;
    const shape = d.kind === 'arc'
      ? { kind: 'cone' as const, x: h.x, y: h.y, angle: b.aim, r: d.reach, half: (d.half ?? 50) * RAD, len: 0, w: 0, inner: 0 }
      : { kind: 'line' as const, x: h.x, y: h.y, angle: b.aim, len: d.reach, w: d.w ?? 30, r: 0, half: 0, inner: 0 };
    if (awake && inside(shape, m.x, m.y, body * 0.8)) {
      this.harm(d.dmg, whoOf(h), h.index);
      if (h.index === 0) this.did('strike');
    }
    for (const f of [...this.helpers]) if (inside(shape, f.x, f.y, 14)) this.harmHelper(f, d.dmg);
    if (d.fire) {
      // Fire left on the ground where the blow ends.
      const k = d.reach * 0.7;
      this.pools.push({ id: this.nextId++, x: h.x + Math.cos(b.aim) * k, y: h.y + Math.sin(b.aim) * k, r: d.fire.r, life: d.fire.life, burning: d.fire.life, def: { ...FIRE_GROUND, dmg: d.fire.dmg } });
    }
    if (d.hounds) {
      // The dogs go in with the blow: each of the hunter's own near the boss bites now.
      for (const a of this.allies) {
        if (a.group !== 'hound' || a.owner !== h.index || a.state === 'down') continue;
        if (awake && dist(a.x, a.y, m.x, m.y) < 220) {
          a.cool = 0;
          a.state = 'run';
          this.harm(a.def.dmg * 2, 'hound', h.index);
        }
      }
    }
  }

  private loose(x: number, y: number, tx: number, ty: number, speed: number, dmg: number, from: Shot['from'], range: number, by: string): void {
    const a = Math.atan2(ty - y, tx - x);
    this.shots.push({ id: this.nextId++, x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, left: range / speed, from, by });
    this.events.push({ t: 'loose', x, y, angle: a, from });
  }

  private use(h: Hunter, i: 0 | 1): void {
    const m = this.monster;
    const a = h.abilities[i];
    if (h.waits[i] > 0) return;
    h.waits[i] = a.wait;
    if (h.index === 0) this.did('skill', 1, i);
    const who = whoOf(h);
    const r = a.r ?? 0;
    let tx = h.x;
    let ty = h.y;
    switch (a.kind) {
      case 'brace':
        h.bracing = a.life ?? 1;
        break;
      case 'sweep':
        if (this.struckBy(h.x, h.y, r)) {
          this.harm(a.dmg ?? 0, h.index === 0 ? 'ability' : who, h.index);
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
        const hounds = this.allies.filter((x) => x.group === 'hound' && x.owner === h.index && x.state !== 'down');
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
          if (x.group !== 'hound' || x.owner !== h.index) continue;
          if (x.state === 'down') x.hp = 0;
          x.hp = Math.min(x.maxHp, x.hp + by * x.maxHp);
          x.state = 'heel';
          x.left = 1.6;
        }
        break;
      }
    }
    this.events.push({ t: 'ability', who: h.index, id: a.id, x: h.x, y: h.y, r, tx, ty });
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
      const a = this.ally(c.def.ally, c.def.id, x, y, 0);
      this.keepOut(a, 10, true);
      if (c.def.ally.way === 'sap') a.state = 'run';
      this.allies.push(a);
    }
    this.events.push({ t: 'call', id: c.def.id, x: h.x, y: h.y });
  }

  private ally(def: AllyDef, group: string, x: number, y: number, owner: number): Ally {
    return { id: this.nextId++, def, owner, group, x, y, hp: def.hp, maxHp: def.hp, face: 1, cool: this.rng.range(0.1, 0.6), state: def.way === 'hound' ? 'heel' : 'stand', moving: false, met: 0, left: 0, fx: 0, fy: 0 };
  }

  private hurtHunter(h: Hunter, amount: number, by: string, root = 0): void {
    if (h.down || h.grace > 0 || this.over) return;
    let harm = amount * (1 - h.def.armor);
    for (const w of this.wards) if (dist(h.x, h.y, w.x, w.y) <= w.r) harm *= 1 - w.share;
    harm = Math.max(1, Math.round(harm));
    // While a lesson's steps are left, nothing takes them far down: nobody dies learning to walk.
    const t = this.teaching;
    if (t && this.lessonDef) harm = Math.max(0, Math.min(harm, Math.floor(h.hp - h.maxHp * this.lessonDef.spare)));
    if (t) this.stepHurt = true;
    h.hp -= harm;
    h.hits++;
    h.grace = HURT_GRACE;
    if (root > 0) h.root = root;
    if (h.index === 0) this.tally.taken[by] = (this.tally.taken[by] ?? 0) + harm;
    this.events.push({ t: 'hurt', who: 'hunter', id: h.index, x: h.x, y: h.y, amount: harm, by });
    if (h.hp > 0) return;
    if (h.trophy === 'spade' && !h.spared) {
      h.spared = true;
      h.hp = 1;
      h.grace = 1.4;
      this.events.push({ t: 'spared' });
      return;
    }
    h.hp = 0;
    h.down = true;
    h.help = 0;
    h.blow = null;
    h.roll = 0;
    h.bracing = 0;
    h.aiming = 0;
    this.tally.downs++;
    this.events.push({ t: 'down', who: h.index, x: h.x, y: h.y });
    // The boss turns to whoever is still standing.
    if (this.targetWho === h.index) this.pickTarget();
    if (this.party.some((p) => !p.down)) return;
    this.tally.killedBy = by;
    this.phase = 'lost';
    const me = this.hunter;
    this.events.push({ t: 'fall', who: 'hunter', id: 0, x: me.x, y: me.y }, { t: 'end', won: false });
  }

  // ------------------------------------------------------------ harm to the monster and its helpers

  /** True if something this wide at a place reaches the monster's body. */
  private struckBy(x: number, y: number, r: number): boolean {
    const m = this.monster;
    return m.state !== 'asleep' && m.state !== 'dead' && dist(x, y, m.x, m.y) <= r + m.def.r * m.size;
  }

  private harm(amount: number, by: string, who = -1): void {
    const m = this.monster;
    if (m.state === 'asleep' || m.state === 'dead' || m.state === 'shift' || amount <= 0) return;
    const broken = m.state === 'broken';
    const open = this.open;
    let dmg = amount * (broken ? m.def.stagger.more : 1) * (m.soft > 0 ? 1 + m.softBy : 1);
    // An Armored boss shrugs off half of everything until its stagger has been broken once.
    if (this.vary.armor > 0 && this.tally.breaks === 0) dmg *= 1 - this.vary.armor;
    if (by === 'hound' && this.frenzy > 0) dmg *= this.frenzyBy;
    dmg = Math.max(1, Math.round(dmg));
    // It does not go from one part into the next in one blow: it changes first.
    const last = this.parts.length - 1;
    const floor = m.part < last ? Math.ceil((m.maxHp * (last - m.part)) / this.parts.length) : 0;
    const done = Math.min(dmg, m.hp - floor);
    m.hp -= done;
    this.tally.dealt[by] = (this.tally.dealt[by] ?? 0) + done;
    if (who >= 0 && who < this.dealtBy.length) this.dealtBy[who] += done;
    this.events.push({ t: 'hit', who: 'monster', id: 0, x: m.x, y: m.y, amount: dmg, big: broken, open });
    if (m.hp <= 0) {
      m.hp = 0;
      m.state = 'dead';
      this.cancelAttack();
      this.tells = [];
      // What the contract asked is settled before its markers go down with it.
      this.closeTasks();
      for (const f of this.helpers) this.events.push({ t: 'fall', who: 'helper', id: f.id, x: f.x, y: f.y });
      this.helpers = [];
      this.phase = 'won';
      this.events.push({ t: 'fall', who: 'monster', id: 0, x: m.x, y: m.y }, { t: 'end', won: true });
      return;
    }
    if (m.part < last && m.hp <= floor) {
      this.shift();
      return;
    }
    // Blows in an opening are what break it. At other times a blow counts for little.
    if (!broken) this.addStagger(amount * (open ? 1 : 0.15));
  }

  private addStagger(amount: number): void {
    const m = this.monster;
    if (amount <= 0 || m.state === 'broken' || m.state === 'shift' || m.state === 'dead' || m.state === 'asleep') return;
    // In a lesson the stagger waits for its own step: the bar is to be seen filling when it is spoken of.
    const lesson = this.teaching;
    if (lesson && lesson.step.wants !== 'break') return;
    m.stagger += amount;
    if (m.stagger < m.staggerMax) return;
    m.stagger = m.staggerMax;
    this.cancelAttack();
    m.state = 'broken';
    m.left = m.def.stagger.down;
    this.tally.breaks++;
    this.events.push({ t: 'broken', x: m.x, y: m.y });
    if (this.vary.armor > 0 && this.tally.breaks === 1) this.events.push({ t: 'armor' });
    this.did('break');
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
    return this.targetHunter();
  }

  /** The one of the party it is after: the chosen one if they still stand, the nearest who does if not. */
  private targetHunter(): Hunter {
    const t = this.party[this.targetWho];
    if (t && !t.down) return t;
    this.pickTarget();
    return this.party[this.targetWho];
  }

  /**
   * Turns on one of the party: most often the nearest, now and then the one who has hurt it most, and once in a while
   * the farthest, so that nobody can stand at the back for ever.
   */
  private pickTarget(): void {
    const m = this.monster;
    const up = this.party.filter((p) => !p.down);
    if (up.length === 0) return;
    let pick = up[0];
    if (up.length > 1) {
      const r = this.rng.next();
      const d = (p: Hunter): number => dist(p.x, p.y, m.x, m.y);
      if (r < 0.6) pick = up.reduce((a, b) => (d(b) < d(a) ? b : a));
      else if (r < 0.85) pick = up.reduce((a, b) => (this.dealtBy[b.index] > this.dealtBy[a.index] ? b : a));
      else pick = up.reduce((a, b) => (d(b) > d(a) ? b : a));
    }
    if (pick.index !== this.targetWho) {
      this.targetWho = pick.index;
      this.events.push({ t: 'target', who: pick.index });
    }
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
        // A step of a lesson that shows no attack: it stands and waits to be shown what the step wants.
        const lesson = this.teaching;
        if (lesson && !lesson.step.attack) return;
        // An attack that is shown to teach is made from where it will reach: it comes up first, and briskly.
        const shown = lesson?.step.attack ? byId(m.def.attacks, lesson.step.attack).shapes[0] : null;
        const from = shown ? Math.max(m.def.reach, (shown.kind === 'line' ? shown.len : shown.kind === 'marks' || shown.kind === 'lanes' ? 9999 : shown.r) * 0.8) : m.def.reach;
        if (d > m.def.reach) {
          const speed = m.def.speed * this.vary.speed * this.slowAt(m.x, m.y) * (shown && d > from ? 1.8 : 1);
          m.x += Math.cos(m.aim) * speed * dt;
          m.y += Math.sin(m.aim) * speed * dt;
          m.moving = true;
          this.keepOut(m, m.def.r * m.size * 0.8, false);
        }
        this.caught();
        if (m.state !== 'walk') return;
        m.left -= dt;
        if (m.left > 0 || (shown && d > from)) return;
        // A step that shows an attack has it made, however far off the hunter stands, with its warning as long as the step says.
        if (lesson?.step.attack) this.start(byId(m.def.attacks, lesson.step.attack), lesson.step.slow ?? 1);
        else this.begin(d);
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
          // The attack is over. If it missed, the step that asked for that is done; if not, it is made again.
          if (!this.stepHurt) {
            this.did('avoid');
            if (this.stepRolled) this.did('dodge');
          }
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
          this.escort();
        }
        return;
    }
  }

  private walkOn(): void {
    const m = this.monster;
    m.state = 'walk';
    // Against a party it attacks sooner: there are more of them to keep busy.
    const party = 1 / (1 + PARTY.gap * (this.party.length - 1));
    m.left = this.rng.range(m.def.gap[0], m.def.gap[1]) * this.scale.gap * this.vary.gap * party * (m.enraged ? ENRAGE.faster : 1);
    if (this.party.length > 1) this.pickTarget();
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
    // A Furious boss fights with its next phase's round from the start.
    const round = this.parts[Math.min(this.parts.length - 1, m.part + (this.vary.ahead ? 1 : 0))];
    this.againDone = false;
    let pick: AttackDef | null = null;
    for (let tries = 0; tries < round.length && !pick; tries++) {
      const a = byId(m.def.attacks, round[this.round % round.length]);
      this.round++;
      if (a.mark && a.mark > this.mark) continue;
      if (a.party && a.party > this.party.length) continue;
      if (a.far !== undefined && d < a.far) continue;
      if (a.near !== undefined && d > a.near) continue;
      pick = a;
    }
    if (!pick) {
      // Nothing in its round suits: it comes closer and tries again.
      m.left = 0.4;
      return;
    }
    this.start(pick, 1);
  }

  /** Begins an attack: its shapes are put down as their times come, each shown for the attack's warning. */
  private start(pick: AttackDef, slow: number): void {
    const m = this.monster;
    m.attack = pick;
    m.state = 'tell';
    this.elapsed = 0;
    this.stepRolled = false;
    this.stepHurt = false;
    const base = pick.tell * this.scale.tell * slow * (m.enraged ? ENRAGE.faster : 1);
    // A Quick boss's warnings are shorter, but never under what a person can react to; a Giant's are longer.
    this.tellFor = this.vary.tell < 1 ? Math.max(base * this.vary.tell, Math.min(base, TELL_FLOOR)) : base * this.vary.tell;
    this.pending = [];
    pick.shapes.forEach((shape, i) => {
      if (shape.kind === 'marks' && shape.at === 'follow') {
        for (let n = 0; n < shape.n; n++) this.pending.push({ shape: { ...shape, n: 1 }, at: (shape.after ?? 0) + n * (shape.every ?? 0.4), first: i === 0 && n === 0 });
      } else this.pending.push({ shape, at: shape.after ?? 0, first: i === 0 });
    });
    this.pending.sort((a, b) => a.at - b.at);
  }

  /** Puts a shape on the ground, to land after `seconds`. */
  private tell(shape: ShapeDef, seconds: number, attack: AttackDef, aim: number, first: boolean, by = 0): void {
    const m = this.monster;
    const t = this.target();
    const k = m.size;
    const dmg = attack.dmg * this.scale.dmg;
    const base = { left: seconds, of: seconds, dmg, foe: true, attack: attack.id, by, len: 0, w: 0, r: 0, half: 0, inner: 0, angle: 0, root: attack.root };
    const made: Tell[] = [];
    // What is marked at a target is marked at one more of the party, for an attack that splits, against three or more.
    const up = this.party.filter((p) => !p.down);
    const second = attack.split && up.length >= 3 ? up.filter((p) => p !== t).reduce((a, b) => (dist(b.x, b.y, t.x, t.y) > dist(a.x, a.y, t.x, t.y) ? b : a)) : null;
    const at = (target: { x: number; y: number }): void => {
      if (shape.kind === 'ring') {
        const c = shape.at === 'self' ? m : target;
        made.push({ ...base, id: this.nextId++, kind: 'ring', x: c.x, y: c.y, r: shape.r * k, inner: (shape.inner ?? 0) * k });
      } else if (shape.kind === 'marks') {
        const e = FIELD.edge + shape.r * 0.5;
        for (let n = 0; n < shape.n; n++) {
          let x = target.x;
          let y = target.y;
          if (shape.at === 'field') {
            x = this.rng.range(e, this.w - e);
            y = this.rng.range(e, this.h - e);
          } else if (n > 0 && shape.at === 'target') {
            const a = this.rng.range(0, TAU);
            const d = this.rng.range(shape.r * 1.2, (shape.spread ?? 160) * k);
            x += Math.cos(a) * d;
            y += Math.sin(a) * d;
          }
          made.push({ ...base, id: this.nextId++, kind: 'ring', x: Math.max(e, Math.min(this.w - e, x)), y: Math.max(e, Math.min(this.h - e, y)), r: shape.r * k, summon: attack.summon });
        }
      }
    };
    if (shape.kind === 'line') {
      made.push({ ...base, id: this.nextId++, kind: 'line', x: m.x, y: m.y, angle: aim + (shape.turn ?? 0) * RAD, len: shape.len * k, w: shape.w * k, charge: attack.charge });
    } else if (shape.kind === 'cone') {
      made.push({ ...base, id: this.nextId++, kind: 'cone', x: m.x, y: m.y, angle: aim + (shape.turn ?? 0) * RAD, r: shape.r * k, half: shape.half * RAD });
    } else if (shape.kind === 'ring' || shape.kind === 'marks') {
      // Marks that follow come down each where the one it is after stands as it appears.
      at(shape.kind === 'marks' && shape.at === 'follow' ? this.targetHunter() : t);
      if (second && (shape.kind === 'marks' ? shape.at === 'target' : shape.at === 'target')) at(second);
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
    for (const h of this.party) {
      if (h.down || d.struck.has(h.index) || h.roll > 0 || dist(h.x, h.y, m.x, m.y) >= m.def.r * m.size + 14) continue;
      d.struck.add(h.index);
      if (h.bracing > 0) this.turned(h);
      else this.hurtHunter(h, d.dmg, 'charge');
      if (this.over || !this.dash) return;
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
      // A Stampede: the charge again at once, unless a crash stopped it.
      if (this.vary.again && !this.againDone && a?.id === this.vary.again) {
        this.againDone = true;
        m.aim = Math.atan2(this.target().y - m.y, this.target().x - m.x);
        this.start(a, 1);
        return;
      }
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
  private turned(h: Hunter): void {
    const a = h.abilities.find((x) => x.kind === 'brace');
    h.bracing = 0;
    h.grace = Math.max(h.grace, 0.3);
    this.events.push({ t: 'turned', who: h.index, x: h.x, y: h.y });
    if (!a) return;
    this.addStagger(a.stagger ?? 0);
    if (this.struckBy(h.x, h.y, h.def.strike.reach * 1.5)) this.harm(h.def.strike.dmg * (a.share ?? 2), h.index === 0 ? 'ability' : whoOf(h), h.index);
  }

  private land(t: Tell): void {
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
      // A Quick boss runs a little faster too.
      const speed = t.charge.speed * (1 + (this.vary.speed - 1) / 2);
      this.dash = { angle: t.angle, left: t.len, speed, daze: t.charge.daze, stagger: t.charge.stagger, dmg: t.dmg, id: t.id, struck: new Set() };
      this.events.push({ t: 'dash', x: m.x, y: m.y, angle: t.angle });
      return;
    }
    for (const p of this.party) {
      if (p.down || !inside(t, p.x, p.y)) continue;
      if (p.roll > 0) this.events.push({ t: 'dodged', who: p.index, x: p.x, y: p.y });
      else if (p.bracing > 0 && p.grace <= 0) {
        if (t.by === 0) this.turned(p);
        else {
          p.bracing = 0;
          this.events.push({ t: 'turned', who: p.index, x: p.x, y: p.y });
        }
      } else this.hurtHunter(p, t.dmg, t.attack, t.root ?? 0);
      if (this.over) return;
    }
    for (const a of [...this.allies]) if (a.state !== 'down' && a.state !== 'leave' && inside(t, a.x, a.y)) this.hurtAlly(a, t.dmg, t.attack);
    for (const b of [...this.buildings]) if (inside(t, b.x, b.y, b.def.r * 0.5)) this.hurtBuilding(b, t.dmg, t.attack);
    if (t.summon) {
      const def = byId(HELPERS, t.summon);
      if (this.helpers.filter((f) => !f.def.still).length < def.most) {
        // A helper grows by half of what the monster does at a mark: a swarm at full growth leaves no room to fight.
        const f: Helper = { id: this.nextId++, def, x: t.x, y: t.y, hp: Math.round(def.hp * (1 + (this.scale.hp - 1) / 2)), face: 1, cool: 0.8, held: 0, moving: false, winding: false };
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
    for (const f of this.helpers) {
      f.moving = false;
      // A marker stands where it was put and does nothing.
      if (f.def.still) continue;
      f.cool -= dt;
      if (f.held > 0) {
        f.held -= dt;
        continue;
      }
      f.winding = this.tells.some((t) => t.by === f.id);
      if (f.winding) continue;
      // It goes for whoever is nearest: a hunter, one of theirs, or what they built.
      let tx = f.x;
      let ty = f.y;
      let best = 1e9;
      for (const p of this.party) {
        if (p.down) continue;
        const d = dist(f.x, f.y, p.x, p.y);
        if (d < best) [best, tx, ty] = [d, p.x, p.y];
      }
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
        const seconds = f.def.tell * this.scale.tell;
        const tell: Tell = {
          id: this.nextId++, kind: 'ring', x: tx, y: ty, angle: 0, len: 0, w: 0, r: 34, half: 0, inner: 0, left: seconds, of: seconds, dmg: f.def.dmg * (1 + (this.scale.dmg - 1) / 2), foe: true,
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
        if (a.def.still || b.def.still) continue;
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
    const h = this.party[a.owner] ?? this.hunter;
    const n = this.allies.filter((x) => x.group === 'hound' && x.owner === a.owner).indexOf(a);
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
            this.loose(a.x, a.y, f.x, f.y, 700, a.def.dmg, 'ally', 260, a.group);
          } else if (awake && dm <= a.def.reach) {
            a.cool = a.def.every;
            this.loose(a.x, a.y, m.x, m.y, 700, a.def.dmg, 'ally', a.def.reach + 60, a.group);
          }
          break;
        }
        case 'sap':
          this.sap(a, dt);
          break;
        case 'hound':
          this.hound(a, dt, awake);
          break;
        case 'cower':
          // A villager stands where they are and keeps their head down.
          a.face = m.x >= a.x ? 1 : -1;
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
    const h = this.party[a.owner] ?? this.hunter;
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
        this.harm(a.def.dmg, 'hound', a.owner);
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
        this.loose(b.x, b.y - 10, m.x, m.y, 950, b.def.dmg ?? 20, 'ballista', b.def.reach + 80, 'ballista');
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
        this.harm(s.dmg, s.by, this.party.findIndex((p) => whoOf(p) === s.by));
        gone = true;
      }
      if (!gone) {
        const f = this.helpers.find((x) => dist(x.x, x.y, s.x, s.y) < (x.def.still ? 26 : 20));
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
