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
  ALLY_QUIRKS, ARENA, BAND, COMPANIONS, GATHER_SECONDS, HEART, HERO_RADIUS, HERO_SPEED, HURT_GRACE, LEECH_GAP, MARK_CLEAR, MARK_SECONDS, MOVE, MOVES, PICKUP_RADIUS, QUIRKS, RING_SHARE,
  ENEMIES, byId, coinShare, enemyAt, waveOf, weaponOf,
  type AllyQuirk, type CompanionDef, type EnemyDef, type MoveDef, type MoveId, type Quirk, type WaveDef, type WeaponDef,
} from './data';
import { BREATH, DANGER } from './holdData';
import { countKinds, giftsOf, type Gifts } from './kinds';
import { RELIC } from './relics';
import { ROAD, type ChampionTrait, type Omen } from './road';
import { Rng } from './rng';
import { DODGE_CAP, armorShare, hasteRate, type Stat, type Stats } from './stats';

/** The step the wave is worked out in. A screen that draws faster or slower takes as many of these as the time needs. */
export const STEP = 1 / 60;

export interface Carried {
  id: string;
  /** 0 to 3. */
  tier: number;
}

/** A companion as it is brought to a wave: who, and how many steps of its bond the run has taken. */
export interface Banded {
  id: string;
  bond: number;
  /** True for one let out of a cage on the road: it is beyond the band's places, for this run only. */
  stray?: boolean;
}

export interface Setup {
  seed: number;
  wave: number;
  stats: Stats;
  /** The hero's own rule and deed. A wave may be fought with neither: a test of something else. */
  quirk?: Quirk | null;
  move?: MoveId | null;
  /** The hero's own weapon, which is the first of what they strike with and takes no hand. */
  own?: Carried | null;
  weapons: readonly Carried[];
  band?: readonly Banded[];
  /** The hero's level: companions grow by it. */
  level?: number;
  /** How full the fury bar is as the wave begins, 0 to 1. */
  fury?: number;
  /** True if the move goes off by itself when it is full and there is something to hit. */
  auto?: boolean;
  /** The coins the run holds as the wave begins: Fenn's harm counts them. */
  purse?: number;
  /** True if Hroth has not yet got up in this land. */
  spare?: boolean;
  /** True if Tam has not yet dragged the hero up in this run. */
  rescue?: boolean;
  /** True for a window that is taller than it is wide: the arena is stood on end. */
  tall?: boolean;
  /** The road that was taken to this wave: what is different about it (road.ts). */
  omen?: Omen;
  /** Who is in the cage, on the stray's road. */
  stray?: string;
  /** The relics the run holds, by name (relics.ts). */
  relics?: readonly string[];
  /** Waves come through with the Whetstone of Ages in hand. */
  whet?: number;
  /** True if the Tithe Box was paid for this wave. */
  tithe?: boolean;
  /** What the Bone Dice rolled for this wave: it is in `stats` already, and is here to be shown. */
  bones?: { up: Stat; down: Stat } | null;
  /** The danger the run is played at, 0 to 5: each step adds a rule (holdData.ts). */
  danger?: number;
  /** True if the Hold's Second Breath is still to be drawn in this run. */
  breath?: boolean;
}

/** Which way the hero is steered: a length of 1 is flat out. `act` lets the move loose, if it is full. */
export interface Steer {
  x: number;
  y: number;
  act?: boolean;
}

/** A hero running through whatever is in the way: Bram's rush, Isaura's charge. */
export interface Dash {
  kind: 'rush' | 'charge';
  dx: number;
  dy: number;
  left: number;
  /** Who it has met already. */
  seen: number[];
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
  /** Seconds they have stood still, and seconds they have kept moving. */
  still: number;
  ran: number;
  /** Seconds since a blow last landed on them. */
  safe: number;
  /** Seconds left in which enemies cannot see them, and in which every blow of theirs is critical. */
  unseen: number;
  sure: number;
  /** Seconds left in which their own blows heal them. */
  feast: number;
  dash: Dash | null;
}

export type FoeState = 'walk' | 'aim' | 'dash' | 'rest';

export type AllyState = 'with' | 'go' | 'dash' | 'back' | 'fetch';

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
  doing: 'shot' | 'charge' | 'burst' | 'call' | 'ring' | 'blaze' | '';
  /** A boss's place in its round of things to do. */
  turn: number;
  slow: number;
  slowBy: number;
  stun: number;
  burn: number;
  burnBy: number;
  burnTick: number;
  /** Seconds it is frozen solid for, and seconds until it can be frozen again. */
  frozen: number;
  numb: number;
  /** Seconds it is marked for, and how much more it takes from everything while it is. */
  marked: number;
  markedBy: number;
  /** Seconds it runs from the hero for. */
  flee: number;
  moving: boolean;
  /** True while a drum is near it. */
  spurred: boolean;
  boss: boolean;
  dead: boolean;
  /** What a champion has that the rest have not, or '' for one of the rest. */
  champion: ChampionTrait | '';
  /** True for a captain that has got up once already (the fourth danger). */
  second?: boolean;
  /** Seconds until a burning champion may blaze again. */
  blaze: number;
}

/** A companion on the field. */
export interface Ally {
  id: number;
  def: CompanionDef;
  /** The steps of its bond, 0 to 3. */
  bond: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  face: 1 | -1;
  moving: boolean;
  state: AllyState;
  /** Seconds left of sitting out, or 0 for one on its feet. */
  down: number;
  /** Seconds left in which nothing can hurt it again. */
  grace: number;
  /** Seconds until it may strike again, and seconds since it last did, for the screen to move it by. */
  cool: number;
  since: number;
  /** Which way it last struck, or where on its round a circling one is. */
  angle: number;
  /** Seconds until its quirk may act again. */
  quirkCool: number;
  /** Who or what it is going for. */
  target: number;
  /** A charge's way, the seconds left of it, and who it has met. */
  dx: number;
  dy: number;
  left: number;
  seen: number[];
  /** Seconds until it leaves its next patch of fire. */
  trail: number;
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
  /** A companion's: the fire it leaves on whoever it hits, as harm a second. */
  burns: number;
  /** True for one half of a shot the Twin Quiver has split already: it does not split again. */
  split: boolean;
  /** Who loosed it, for an enemy's. */
  src: number;
}

export type ZoneKind = 'cloud' | 'holy' | 'fire' | 'rain';

/**
 * A place that goes on doing harm: a cloud, fire on the ground, arrows
 * coming down, holy ground. `by` is its harm a second. Holy ground mends
 * the band that stands on it besides.
 */
export interface Zone {
  id: number;
  x: number;
  y: number;
  r: number;
  by: number;
  life: number;
  tick: number;
  kind: ZoneKind;
  /** Seconds until holy ground next gives health back. */
  mend: number;
}

/** Something of the hero's that is about to land: the ground is marked until it does. */
export interface Fall {
  id: number;
  x: number;
  y: number;
  r: number;
  /** Seconds until it lands. */
  left: number;
  dmg: number;
  stun: number;
  kind: Burst;
  /** What it leaves where it landed, for how long, at what harm a second. */
  leaves: ZoneKind | '';
  seconds: number;
  by: number;
}

/** A ring that runs out from where it began and does its harm to each as it passes. */
export interface Ring {
  id: number;
  x: number;
  y: number;
  r: number;
  to: number;
  /** How fast it widens. */
  speed: number;
  dmg: number;
  /** The fire it leaves on those it passes, as harm a second, and for how long. */
  burns: number;
  seconds: number;
  seen: number[];
  kind: 'fire';
}

export interface Mark {
  id: number;
  x: number;
  y: number;
  left: number;
  def: EnemyDef;
  boss: boolean;
  /** A champion's trait, where it is one that is about to stand. */
  champion: ChampionTrait | '';
}

/** A shrine on the field: standing in its ring for `need` seconds in all blesses the hero. */
export interface Shrine {
  x: number;
  y: number;
  r: number;
  need: number;
  got: number;
  done: boolean;
}

/** One of the slain that the Gravedigger's Spade has got up on the hero's side. Nothing can hurt it, and it does not last. */
export interface Risen {
  id: number;
  /** The figure it had as an enemy. */
  unit: string;
  size: number;
  x: number;
  y: number;
  face: 1 | -1;
  moving: boolean;
  /** Seconds left of it. */
  life: number;
  cool: number;
  dmg: number;
  speed: number;
  r: number;
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
  /** True for the hero's own weapon: it is in their hand. */
  own: boolean;
}

export type Burst = 'powder' | 'fire' | 'slam' | 'light' | 'venom' | 'foe' | 'star' | 'frost' | 'rain' | 'rise' | 'bolt';

/** What the screen can show of the hero's quirk: whether it is on, and how far along it is, 0 to 1. */
export interface Trait {
  on: boolean;
  share: number;
}

export type Ev =
  | { t: 'mark'; id: number; x: number; y: number; boss: boolean }
  | { t: 'stand'; id: number }
  | { t: 'strike'; slot: number; angle: number; x: number; y: number; range: number }
  | { t: 'loose'; slot: number; angle: number; shot: number }
  | { t: 'hit'; id: number; x: number; y: number; amount: number; crit: boolean; soft: boolean }
  | { t: 'fall'; id: number; x: number; y: number; boss: boolean; swept: boolean }
  // A captain that fell gets up again: the fourth danger.
  | { t: 'second'; id: number; x: number; y: number }
  // The hero was left standing by the Hold's Second Breath.
  | { t: 'breath'; x: number; y: number }
  | { t: 'burst'; x: number; y: number; r: number; kind: Burst }
  | { t: 'hurt'; amount: number; x: number; y: number }
  | { t: 'dodge' }
  | { t: 'mend'; amount: number }
  | { t: 'take'; kind: PickKind; value: number }
  | { t: 'aim'; id: number; doing: Foe['doing']; seconds: number; dx: number; dy: number }
  | { t: 'foeShot'; id: number }
  | { t: 'gather' }
  | { t: 'end'; cleared: boolean }
  // The hero's quirk turned on or off (Bram's shield set or dropped, Wren's or Isaura's harm full or lost, Orrin's spell cast twice).
  | { t: 'quirk'; on: boolean }
  // The fury bar is full.
  | { t: 'fury' }
  // The move is let loose, from where the hero stands, the way they face.
  | { t: 'move'; id: MoveId; x: number; y: number; dx: number; dy: number }
  // The ground is marked: something of the hero's lands there in `seconds`.
  | { t: 'warn'; id: number; x: number; y: number; r: number; seconds: number; kind: Burst }
  // A ring runs out from a place to `r` in `seconds`.
  | { t: 'ring'; x: number; y: number; r: number; seconds: number; kind: 'fire' | 'bell' | 'cry' | 'frost' | 'flare' | 'roar' }
  // A foe is frozen solid.
  | { t: 'freeze'; id: number; seconds: number }
  // Hroth gets up from a killing blow. Tam drags the hero up.
  | { t: 'rise'; x: number; y: number }
  | { t: 'rescue'; id: number }
  // A companion strikes, is struck, is struck down, gets up, and does what only it does.
  | { t: 'allyStrike'; id: number; x: number; y: number; angle: number }
  | { t: 'allyHurt'; id: number; amount: number }
  | { t: 'allyDown'; id: number }
  | { t: 'allyUp'; id: number }
  | { t: 'allyQuirk'; id: number; quirk: AllyQuirk; x: number; y: number }
  // A champion stands: it is the foe of this id.
  | { t: 'champion'; id: number; trait: ChampionTrait }
  // The shrine's ring is full: the hero is blessed.
  | { t: 'bless'; x: number; y: number }
  // The cage is broken: whoever was in it is the companion of this id from here on.
  | { t: 'free'; id: number; who: string; x: number; y: number }
  // The pay wagon is on the field (`on`), broken open, or away over the far side with its chest.
  | { t: 'wagon'; id: number; how: 'on' | 'broken' | 'away' }
  // A relic does what it does, where it can be seen.
  | { t: 'relic'; id: string; x: number; y: number }
  // One of the slain gets up on the hero's side.
  | { t: 'risen'; id: number; x: number; y: number };

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
  /** What the hero strikes with: their own weapon first, if they have one, then what they have bought. */
  readonly slots: Slot[];
  /** The companions on the field. */
  readonly band: Ally[];
  readonly quirk: Quirk | null;
  readonly move: MoveDef | null;
  foes: Foe[] = [];
  shots: Shot[] = [];
  zones: Zone[] = [];
  marks: Mark[] = [];
  picks: Pick[] = [];
  falls: Fall[] = [];
  rings: Ring[] = [];
  /** How full the fury bar is, 0 to 1. A full bar is a move. */
  fury = 0;
  /** True while Hroth can still get up from a killing blow in this wave, and true once he has. */
  spare = false;
  rose = false;
  /** True once Tam has dragged the hero up in this wave. */
  rescued = false;
  /** True if the move goes off by itself when it is full and there is something to hit. A player may change their mind in the middle of a wave. */
  auto = false;
  /** What has happened since the screen last asked: it takes these and empties the list. */
  events: Ev[] = [];
  time = 0;
  /** Coins gathered this wave, with Bounty in them, and the experience they were worth. */
  gold = 0;
  xp = 0;
  /** Coins gathered this wave as they lay, before Bounty and whatever the road adds to their experience. */
  coins = 0;
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
  /** The road that was taken here, and whether it is night. */
  readonly omen: Omen;
  readonly night: boolean;
  /** The shrine, on the shrine's road. */
  shrine: Shrine | null = null;
  /** True once the shrine has blessed the hero. */
  blessed = false;
  /** Who was freed from the cage, by name, once the cage is broken. */
  freed = '';
  /** Those of the slain who are on their feet for the hero. */
  risen: Risen[] = [];
  /** Champions and captains killed this wave. */
  banners = 0;
  /** The danger the wave is fought at, 0 to 5. */
  readonly danger: number;
  /** True once the Hold's Second Breath has been drawn in this wave. */
  breathed = false;
  private breath: boolean;
  /** Who has stood on the field in this wave, and how many of each were slain: the Chronicle keeps them. */
  met: string[] = [];
  slain: Record<string, number> = {};
  /** True once a blow has landed on the hero in this wave, and the captains that fell before one did. */
  struck = false;
  unstruck: string[] = [];
  /** Mending that the last danger has halved and not yet given. */
  private mendOwed = 0;
  /** What the Bone Dice rolled for this wave, if the run holds them. */
  readonly bones: { up: Stat; down: Stat } | null;
  /** What the kinds of weapon held do (kinds.ts). */
  readonly gifts: Gifts;

  private readonly relics: ReadonlySet<string>;
  /** The Whetstone of Ages: how many times the harm of the hero's own weapon. */
  private readonly whet: number;
  private readonly tithe: boolean;
  private readonly stray: string;
  /** How many times the experience a coin is worth here. */
  private readonly xpBy: number;
  private candle = true;
  /** Seconds the hero has run since a blow last landed, for the spurs; seconds until the shell next mends; until lightning next strikes. */
  private spur = 0;
  private shellAt = 0;
  private storm: number = RELIC.stormglass.every;
  /** Blows of the hero's own weapon, counted for the Echo Bell. */
  private ownBlows = 0;
  /** When each champion is due, and what is still to be put on the field. */
  private champsDue: number[] = [];
  private wagonDue = -1;
  private cageDue = -1;
  private wagonSpeed = 0;

  private readonly rng: Rng;
  private readonly stats: Stats;
  private readonly level: number;
  private readonly purse: number;
  private rescue = false;
  /** How much more often the hero strikes for the banner near them, or 0. */
  private rally = 0;
  /** Orrin's spells, counted. */
  private spells = 0;
  /** Every spell, counted, for the gift of the arcane. */
  private casts = 0;
  /** Where the hero was last seen, for enemies that have lost them. */
  private seenAt = { x: 0, y: 0 };
  private traitOn = false;
  private ids = 1;
  private nextBand = 0.4;
  private regen = 0;
  private leechAt = 0;
  private bossDue: string | undefined;
  private bossId = 0;

  constructor(setup: Setup) {
    this.relics = new Set(setup.relics ?? []);
    this.danger = Math.max(0, Math.floor(setup.danger ?? 0));
    this.breath = !!setup.breath;
    // A captain's wave is the captain's: no omen changes it.
    const plain = waveOf(setup.wave);
    this.omen = plain.boss ? 'quiet' : (setup.omen ?? 'quiet');
    this.night = this.omen === 'night';
    this.wave = this.omened(plain);
    this.w = setup.tall ? ARENA.short : ARENA.long;
    this.h = setup.tall ? ARENA.long : ARENA.short;
    this.rng = new Rng(setup.seed);
    this.stats = setup.stats;
    this.quirk = setup.quirk ?? null;
    this.move = setup.move ? byId(MOVES, setup.move) : null;
    this.level = Math.max(0, setup.level ?? 0);
    this.auto = setup.auto ?? false;
    this.purse = Math.max(0, setup.purse ?? 0);
    this.fury = Math.max(0, Math.min(1, setup.fury ?? 0));
    this.spare = this.quirk === 'unburied' && (setup.spare ?? true);
    this.rescue = setup.rescue ?? true;
    const maxHp = Math.max(1, Math.round(setup.stats.maxHp));
    this.hero = {
      x: this.w / 2, y: this.h / 2, hp: maxHp, maxHp, face: 1, moving: false, grace: 0, chill: 0, chillBy: 0,
      still: 0, ran: 0, safe: 0, unseen: 0, sure: 0, feast: 0, dash: null,
    };
    const slot = (c: Carried, own: boolean): Slot => ({ def: weaponOf(c.id), tier: c.tier, cool: 0.35, angle: 0, since: 9, own });
    this.slots = [...(setup.own ? [slot(setup.own, true)] : []), ...setup.weapons.map((c) => slot(c, false))];
    this.band = (setup.band ?? []).map((b, i, all) => this.enlist(b, i, all.length));
    this.bossDue = this.wave.boss;
    this.gifts = giftsOf(countKinds(this.slots.map((sl) => sl.def)));
    this.whet = 1 + RELIC.ageswhet.each * Math.max(0, setup.whet ?? 0);
    this.tithe = !!setup.tithe;
    this.bones = setup.bones ?? null;
    this.stray = setup.stray ?? '';
    this.xpBy = this.omen === 'horde' ? ROAD.horde.xp : 1;
    // What the road puts on the field.
    if (this.omen === 'champions') this.champsDue = ROAD.champions.at.slice(0, ROAD.champions.count).map((share) => share * this.wave.seconds);
    // The third danger: a champion walks in every wave from the third, but not beside a captain and not on the road that is all champions.
    else if (this.danger >= 3 && !this.wave.boss && this.wave.n >= DANGER.champion.from) this.champsDue = [DANGER.champion.at * this.wave.seconds];
    if (this.omen === 'wagon') this.wagonDue = ROAD.wagon.at * this.wave.seconds;
    if (this.omen === 'stray' && this.stray) this.cageDue = 1.2;
    if (this.omen === 'shrine') {
      const at = this.farFrom(this.hero.x, this.hero.y, ROAD.shrine.clear);
      const r = ROAD.shrine.r;
      this.shrine = {
        x: Math.max(ARENA.edge + r, Math.min(this.w - ARENA.edge - r, at.x)), y: Math.max(ARENA.edge + 30 + r, Math.min(this.h - ARENA.edge - r, at.y)),
        r, need: ROAD.shrine.seconds, got: 0, done: false,
      };
    }
  }

  /** True if the run holds a relic. */
  has(relic: string): boolean {
    return this.relics.has(relic);
  }

  /** The wave as its omen and the relics change it. */
  private omened(w: WaveDef): WaveDef {
    let { seconds, band, most } = w;
    if (this.omen === 'horde') {
      band = Math.round(band * ROAD.horde.more);
      most = Math.round(most * ROAD.horde.more);
    }
    if (this.omen === 'champions') band = Math.max(2, Math.round(band * ROAD.champions.fewer));
    if (this.has('sands')) seconds = Math.max(RELIC.sands.least, seconds - RELIC.sands.shorter);
    return { ...w, seconds, band, most };
  }

  /** A companion as it stands at the start of a wave: beside the hero, whole. */
  private enlist(b: Banded, i: number, n: number): Ally {
    const def = byId(COMPANIONS, b.id);
    const bond = Math.max(0, Math.min(BAND.bonds, b.bond));
    const maxHp = def.hp > 0 ? Math.max(1, Math.round(def.hp * (1 + BAND.hpGrow * this.level) * (1 + BAND.bond * bond))) : 0;
    const a = (i / Math.max(1, n)) * TAU + Math.PI;
    return {
      id: this.ids++, def, bond, x: this.hero.x + Math.cos(a) * 74, y: this.hero.y + Math.sin(a) * 46, hp: maxHp, maxHp, face: 1, moving: false, state: 'with',
      down: 0, grace: 0, cool: 0.6, since: 9, angle: a, quirkCool: 0, target: 0, dx: 0, dy: 0, left: 0, seen: [], trail: 0,
    };
  }

  /** The hero's own weapon, if they have one. */
  get own(): Slot | null {
    return this.slots[0]?.own ? this.slots[0] : null;
  }

  /** What the screen can show of the hero's quirk. */
  get trait(): Trait {
    const h = this.hero;
    switch (this.quirk) {
      case 'standfast':
        return { on: h.still >= QUIRKS.standfast.after, share: Math.min(1, h.still / QUIRKS.standfast.after) };
      case 'unseen': {
        const share = Math.min(1, (h.safe * QUIRKS.unseen.each) / QUIRKS.unseen.most);
        return { on: share >= 1, share };
      }
      case 'echo': {
        const at = this.spells % QUIRKS.echo.every;
        return { on: at === QUIRKS.echo.every - 1, share: at / (QUIRKS.echo.every - 1) };
      }
      case 'sticky': {
        const share = Math.min(1, this.held / QUIRKS.sticky.coins / 100 / QUIRKS.sticky.most);
        return { on: share > 0, share };
      }
      case 'momentum': {
        const share = Math.min(1, h.ran / QUIRKS.momentum.seconds);
        return { on: share >= 1, share };
      }
      case 'unburied':
        return { on: this.spare, share: 1 - h.hp / h.maxHp };
      case 'shepherd': {
        const up = this.band.filter((a) => a.down <= 0);
        const near = up.filter((a) => Math.hypot(a.x - h.x, a.y - h.y) < QUIRKS.shepherd.r).length;
        return { on: near > 0, share: up.length ? near / up.length : 0 };
      }
      case 'consecrate': {
        const on = this.zones.some((z) => z.kind === 'holy' && Math.hypot(z.x - h.x, z.y - h.y) <= z.r);
        return { on, share: on ? 1 : 0 };
      }
      default:
        return { on: false, share: 0 };
    }
  }

  /** The coins the hero holds: what the run came with and what this wave has given. */
  get held(): number {
    return this.purse + this.gold;
  }

  /** True when the move is full and there is something for it to hit: when it goes off by itself. */
  get ripe(): boolean {
    const m = this.move;
    if (!m || this.fury < 1 || this.gathering >= 0) return false;
    const h = this.hero;
    let near = 0;
    for (const f of this.foes) {
      if (f.dead || Math.hypot(f.x - h.x, f.y - h.y) - f.def.r > m.reach) continue;
      if (f.boss) return true;
      near++;
    }
    return near >= MOVE.crowd || (near > 0 && h.hp / h.maxHp < MOVE.trouble);
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
    return Math.max(40, (def.range + reach) * (1 + this.gifts.reach));
  }

  /** How many seconds a weapon takes between strikes, with the hero's Haste in it. */
  everyOf(slot: Slot): number {
    // Bram's sword is faster behind his set shield, and everything is faster by the banner.
    const set = this.quirk === 'standfast' && slot.own && this.hero.still >= QUIRKS.standfast.after ? QUIRKS.standfast.faster : 1;
    // The gift of bows quickens whatever shoots or is thrown.
    const haste = this.stats.haste + (slot.def.kind === 'ranged' ? this.gifts.bowHaste : 0);
    return slot.def.every[slot.tier] / (hasteRate(haste) * set * (1 + this.rally));
  }

  step(steer: Steer, dt = STEP): void {
    if (this.over) return;
    this.time += dt;
    this.moveHero(steer, dt);
    if (this.gathering < 0) {
      this.deed(steer);
      this.muster();
      this.signs(dt);
      this.standMarks(dt);
      this.moveFoes(dt);
      this.moveBand(dt);
      this.moveRisen(dt);
      this.strike(dt);
      this.landFalls(dt);
      this.spread(dt);
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
    h.unseen = Math.max(0, h.unseen - dt);
    h.sure = Math.max(0, h.sure - dt);
    h.feast = Math.max(0, h.feast - dt);
    h.safe += dt;
    let x = steer.x;
    let y = steer.y;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    // The spurs: the longer they have run unstruck, the faster.
    const spurred = this.has('spurs') ? 1 + RELIC.spurs.most * Math.min(1, this.spur / RELIC.spurs.seconds) : 1;
    const speed = HERO_SPEED * Math.max(0.3, 1 + this.stats.speed / 100) * spurred;
    if (h.dash) this.run(h.dash, speed, dt);
    else {
      h.moving = len > 0.08;
      if (h.moving) {
        const pace = speed * (h.chill > 0 ? 1 - h.chillBy : 1);
        h.x += x * pace * dt;
        h.y += y * pace * dt;
        if (Math.abs(x) > 0.15) h.face = x > 0 ? 1 : -1;
      }
    }
    h.x = Math.max(ARENA.edge, Math.min(this.w - ARENA.edge, h.x));
    h.y = Math.max(ARENA.edge + 30, Math.min(this.h - ARENA.edge, h.y));
    // How long they have stood, and how long they have run: Bram's shield and Isaura's lance go by these.
    if (h.moving) {
      h.still = 0;
      h.ran += dt;
      this.spur += dt;
    } else {
      h.still += dt;
      if (h.still > QUIRKS.momentum.slack) h.ran = 0;
      // The pilgrim's shell: one who stands in one place begins to mend.
      if (this.has('shell') && h.still >= RELIC.shell.after && h.hp < h.maxHp && this.gathering < 0) {
        this.shellAt -= dt;
        if (this.shellAt <= 0) {
          this.shellAt = RELIC.shell.every;
          this.mend(1);
        }
      }
    }
    if (h.unseen <= 0) this.seenAt = { x: h.x, y: h.y };
    // Mending is a trickle: this much every ten seconds. Hroth does not mend by himself.
    if (this.stats.regen > 0 && h.hp < h.maxHp && this.quirk !== 'unburied') {
      this.regen += (this.stats.regen / 10) * dt;
      if (this.regen >= 1) {
        this.regen -= 1;
        this.mend(1);
      }
    }
    const on = this.trait.on;
    if (on !== this.traitOn && (this.quirk === 'standfast' || this.quirk === 'unseen' || this.quirk === 'momentum')) this.events.push({ t: 'quirk', on });
    this.traitOn = on;
  }

  /** A rush or a charge: the hero runs one way, faster than anything, and whoever is met is struck and thrown aside. */
  private run(d: Dash, speed: number, dt: number): void {
    const h = this.hero;
    const m = this.move as MoveDef;
    h.moving = true;
    h.x += d.dx * speed * MOVE.dash * dt;
    h.y += d.dy * speed * MOVE.dash * dt;
    // Nothing lands on them on the way.
    h.grace = Math.max(h.grace, 0.2);
    for (const f of this.foes) {
      if (f.dead || d.seen.includes(f.id) || Math.hypot(f.x - h.x, f.y - h.y) > m.r + f.def.r) continue;
      d.seen.push(f.id);
      // Thrown to the side they were on, out of the way.
      const side = (f.x - h.x) * -d.dy + (f.y - h.y) * d.dx >= 0 ? 1 : -1;
      this.shove(f, -d.dy * side * 0.8 + d.dx * 0.6, d.dx * side * 0.8 + d.dy * 0.6, 60);
      f.stun = Math.max(f.stun, m.stun * (f.boss ? MOVE.bossShare : 1));
      this.wound(f, this.ownBlow(m.harm), false, false);
    }
    d.left -= dt;
    const wall = h.x <= ARENA.edge || h.x >= this.w - ARENA.edge || h.y <= ARENA.edge + 30 || h.y >= this.h - ARENA.edge;
    if (d.left <= 0 || wall) {
      h.dash = null;
      h.grace = Math.max(h.grace, 0.35);
    }
  }

  /** Throws a foe along a way. The big are not thrown far, and a boss hardly at all. */
  private shove(f: Foe, ux: number, uy: number, knock: number): void {
    // A wagon is hardly moved, and a cage not at all.
    const give = f.def.ai === 'still' ? 0 : f.boss || f.def.prop ? 0.12 : 1 / (f.def.size ?? 1) ** 2;
    f.kx += ux * knock * 9 * give;
    f.ky += uy * knock * 9 * give;
  }

  /** Gives the hero health back. What heals the shepherd heals his band. */
  private mend(amount: number): void {
    if (this.over) return;
    if (this.danger >= 5) {
      // The last danger: mending gives half. Most mending is a point at a time, so the halves are kept until they make one.
      this.mendOwed += amount * DANGER.mend;
      amount = Math.floor(this.mendOwed);
      this.mendOwed -= amount;
      if (amount <= 0) return;
    }
    const h = this.hero;
    if (this.quirk === 'shepherd') {
      for (const a of this.band) if (a.down <= 0 && a.maxHp > 0) a.hp = Math.min(a.maxHp, a.hp + amount);
    }
    if (h.hp >= h.maxHp) return;
    const before = h.hp;
    h.hp = Math.min(h.maxHp, h.hp + amount);
    if (h.hp > before) this.events.push({ t: 'mend', amount: h.hp - before });
  }

  /** A blow lands on the hero, unless they step out of it. */
  private hurt(dmg: number, fromX: number, fromY: number, by: string, chills = 0, src: Foe | null = null, close = false): void {
    const h = this.hero;
    if (h.grace > 0 || this.over || this.gathering >= 0) return;
    if (this.rng.chance(Math.min(DODGE_CAP, Math.max(0, this.stats.dodge)) / 100)) {
      h.grace = HURT_GRACE * 0.5;
      this.events.push({ t: 'dodge' });
      // The mirror shard throws a dodged blow back at who struck.
      if (src && !src.dead && this.has('mirror')) {
        this.events.push({ t: 'relic', id: 'mirror', x: src.x, y: src.y });
        this.wound(src, this.ownBlow(RELIC.mirror.harm), false, false);
      }
      return;
    }
    let amount = Math.max(1, Math.round(dmg * armorShare(this.stats.armor) * (this.has('crown') ? RELIC.crown.taken : 1)));
    // Bram's set shield takes its share.
    if (this.quirk === 'standfast' && h.still >= QUIRKS.standfast.after) amount = Math.max(1, Math.round(amount * QUIRKS.standfast.lets));
    h.hp -= amount;
    this.struck = true;
    h.grace = HURT_GRACE;
    h.safe = 0;
    this.spur = 0;
    // Thornmail: who strikes up close takes it back.
    if (close && src && !src.dead && this.has('thornmail')) {
      this.events.push({ t: 'relic', id: 'thornmail', x: src.x, y: src.y });
      this.wound(src, Math.max(RELIC.thornmail.least, Math.round(this.stats.armor * RELIC.thornmail.times)), false, false);
    }
    this.hurtBy[by] = (this.hurtBy[by] ?? 0) + amount;
    this.lastBy = by;
    if (chills > 0) {
      h.chill = 2;
      h.chillBy = chills;
    }
    this.events.push({ t: 'hurt', amount, x: fromX, y: fromY });
    this.flare();
    if (h.hp > 0) return;
    h.hp = 0;
    if (this.candle && this.has('lastcandle')) {
      // The last candle: the first blow that would kill in a wave does not.
      this.candle = false;
      h.hp = 1;
      h.grace = RELIC.lastcandle.grace;
      this.events.push({ t: 'relic', id: 'lastcandle', x: h.x, y: h.y });
      return;
    }
    if (this.spare) {
      // Hroth gets up, and everything round him is thrown down.
      const q = QUIRKS.unburied;
      this.spare = false;
      this.rose = true;
      h.hp = Math.max(1, Math.round(h.maxHp * q.rises));
      h.grace = 1.5;
      this.events.push({ t: 'rise', x: h.x, y: h.y });
      this.blast(h.x, h.y, q.r, this.ownBlow(q.harm), 1, 'rise', 40);
      return;
    }
    const tam = this.rescue && !this.rescued ? this.band.find((a) => a.def.quirk === 'rally' && a.down <= 0) : undefined;
    if (tam) {
      // Tam drags them back to their feet: once in a run.
      this.rescued = true;
      h.hp = Math.max(1, Math.round(h.maxHp * ALLY_QUIRKS.rally.rises));
      h.grace = ALLY_QUIRKS.rally.grace;
      this.events.push({ t: 'rescue', id: tam.id });
      return;
    }
    if (this.breath) {
      // The Hold's Second Breath: once in a run, when nothing else has kept them up.
      this.breath = false;
      this.breathed = true;
      h.hp = Math.max(1, Math.round(h.maxHp * BREATH.rises));
      h.grace = BREATH.grace;
      this.events.push({ t: 'breath', x: h.x, y: h.y });
      return;
    }
    this.over = 'dead';
    this.events.push({ t: 'end', cleared: false });
  }

  /** Pip flashes when the hero is struck: those near are stunned. */
  private flare(): void {
    const h = this.hero;
    const q = ALLY_QUIRKS.flare;
    for (const a of this.band) {
      if (a.def.quirk !== 'flare' || a.quirkCool > 0) continue;
      a.quirkCool = q.every - q.bond * a.bond;
      this.daze(h.x, h.y, q.r, q.stun);
      this.events.push({ t: 'allyQuirk', id: a.id, quirk: 'flare', x: h.x, y: h.y });
      this.events.push({ t: 'ring', x: h.x, y: h.y, r: q.r, seconds: 0.25, kind: 'flare' });
    }
  }

  /** Stuns everyone in a ring; a boss for a share of it. */
  private daze(x: number, y: number, r: number, seconds: number): void {
    for (const f of this.foes) {
      if (!f.dead && Math.hypot(f.x - x, f.y - y) <= r + f.def.r) f.stun = Math.max(f.stun, seconds * (f.boss ? MOVE.bossShare : 1));
    }
  }

  /** Something of the hero's bursts that is no weapon's: everyone in the ring takes it and is thrown out from the middle. */
  private blast(x: number, y: number, r: number, dmg: number, stun: number, kind: Burst, knock: number): void {
    this.events.push({ t: 'burst', x, y, r, kind });
    for (const f of this.foes) {
      const d = Math.hypot(f.x - x, f.y - y);
      if (f.dead || d > r + f.def.r) continue;
      if (knock) this.shove(f, (f.x - x) / (d || 1), (f.y - y) / (d || 1), knock);
      if (stun) f.stun = Math.max(f.stun, stun * (f.boss ? MOVE.bossShare : 1));
      this.wound(f, dmg, false, false);
    }
  }

  // ------------------------------------------------------------ the hero's move

  /** What one blow of the hero's own weapon does now, times a number: what a move's harm is counted in. */
  private ownBlow(times: number): number {
    const own = this.own ?? this.slots[0];
    return Math.max(1, Math.round((own ? this.roll(own, false).amount : 8) * times));
  }

  /** Adds to the fury bar, and says when it is full. */
  private fill(by: number): void {
    if (!this.move || this.fury >= 1) return;
    this.fury = Math.min(1, this.fury + by * (this.has('sands') ? RELIC.sands.fury : 1));
    if (this.fury >= 1) this.events.push({ t: 'fury' });
  }

  /** The foe with the most others close round it, within a distance of a place: where the enemy is thickest. */
  private thickest(x: number, y: number, range: number, not: readonly number[] = []): Foe | null {
    let best: Foe | null = null;
    let bestN = -1;
    for (const f of this.foes) {
      if (f.dead || not.includes(f.id) || Math.hypot(f.x - x, f.y - y) > range) continue;
      let n = f.boss ? 4 : 0;
      for (const o of this.foes) if (!o.dead && Math.abs(o.x - f.x) < MOVE.cluster && Math.hypot(o.x - f.x, o.y - f.y) < MOVE.cluster) n++;
      if (n > bestN) {
        best = f;
        bestN = n;
      }
    }
    return best;
  }

  /** Marks the ground for something that lands there in a moment. */
  private fall(x: number, y: number, r: number, left: number, dmg: number, stun: number, kind: Burst, leaves: ZoneKind | '' = '', seconds = 0, by = 0): void {
    const f: Fall = { id: this.ids++, x, y, r, left, dmg, stun, kind, leaves, seconds, by };
    this.falls.push(f);
    this.events.push({ t: 'warn', id: f.id, x, y, r, seconds: left, kind });
  }

  /** Lets the move loose, if it is full and it was asked for, or it goes off by itself and there is something to hit. */
  private deed(steer: Steer): void {
    const m = this.move;
    const h = this.hero;
    if (!m || this.fury < 1 || h.dash) return;
    if (!steer.act && !(this.auto && this.ripe)) return;
    this.fury = 0;
    let dx: number = h.face;
    let dy = 0;
    const len = Math.hypot(steer.x, steer.y);
    if (len > 0.08) {
      dx = steer.x / len;
      dy = steer.y / len;
    }
    this.events.push({ t: 'move', id: m.id, x: h.x, y: h.y, dx, dy });
    const thick = this.thickest(h.x, h.y, m.reach);
    const at = thick ?? { x: h.x + dx * 160, y: h.y + dy * 160 };
    switch (m.id) {
      case 'rush':
      case 'charge':
        h.dash = { kind: m.id, dx, dy, left: m.seconds, seen: [] };
        break;
      case 'rain':
        this.fall(at.x, at.y, m.r, MOVE.warn, 0, 0, 'rain', 'rain', m.seconds, this.ownBlow(m.harm) * 4);
        break;
      case 'starfall': {
        // One on the thickest of them, the rest on whoever else is near, one after another.
        const seen: number[] = [];
        for (let i = 0; i < MOVE.stars; i++) {
          const to = (i === 0 ? thick : null) ?? this.someone(h.x, h.y, m.reach, seen);
          const a = this.rng.next() * TAU;
          const d = to ? this.rng.range(0, 16) : this.rng.range(60, 220);
          const x = (to ? to.x : h.x) + Math.cos(a) * d;
          const y = (to ? to.y : h.y) + Math.sin(a) * d;
          if (to) seen.push(to.id);
          this.fall(x, y, m.r, MOVE.warn + (i * m.seconds) / MOVE.stars, this.ownBlow(m.harm), m.stun, 'star');
        }
        break;
      }
      case 'vanish':
        h.unseen = m.seconds;
        // Their next blows are sure ones: while they are unseen, and for as long again after.
        h.sure = m.seconds * 2;
        break;
      case 'wildfire': {
        const own = this.own;
        const burns = Math.max(3, (own?.def.burn?.[own.tier] ?? 3) * 1.5);
        const speed = 520;
        this.rings.push({ id: this.ids++, x: h.x, y: h.y, r: 10, to: m.r, speed, dmg: this.ownBlow(m.harm), burns, seconds: m.seconds, seen: [], kind: 'fire' });
        this.events.push({ t: 'ring', x: h.x, y: h.y, r: m.r, seconds: m.r / speed, kind: 'fire' });
        break;
      }
      case 'warcry':
        for (const f of this.foes) {
          if (f.dead || Math.hypot(f.x - h.x, f.y - h.y) > m.r + f.def.r) continue;
          // A captain does not run. It is checked for a moment.
          if (f.boss) f.stun = Math.max(f.stun, m.stun);
          else if (!f.def.prop) {
            f.flee = 2;
            if (f.state !== 'walk') {
              f.state = 'walk';
              f.doing = '';
            }
          }
        }
        h.feast = m.seconds;
        this.events.push({ t: 'ring', x: h.x, y: h.y, r: m.r, seconds: 0.3, kind: 'cry' });
        break;
      case 'toll':
        this.events.push({ t: 'ring', x: h.x, y: h.y, r: m.r, seconds: 0.3, kind: 'bell' });
        this.blast(h.x, h.y, m.r, this.ownBlow(m.harm), m.stun, 'light', 14);
        for (const a of this.band) {
          if (a.maxHp <= 0) continue;
          if (a.down > 0) this.getUp(a);
          a.hp = Math.min(a.maxHp, a.hp + Math.ceil(a.maxHp * MOVE.tollMends));
        }
        this.mend(Math.ceil(h.maxHp * MOVE.tollMends));
        break;
      case 'whiteout':
        for (const f of this.foes) if (!f.dead) this.freeze(f, m.stun);
        // What was in the air falls out of it.
        this.shots = this.shots.filter((s) => s.mine);
        this.events.push({ t: 'ring', x: h.x, y: h.y, r: Math.max(this.w, this.h), seconds: 0.4, kind: 'frost' });
        break;
      case 'judgment':
        this.fall(at.x, at.y, m.r, MOVE.warn + 0.15, this.ownBlow(m.harm), m.stun, 'light', 'holy', m.seconds, this.ownBlow(QUIRKS.consecrate.harm));
        break;
    }
  }

  /** Anyone within a distance of a place who has not been picked yet, by the wave's dice. */
  private someone(x: number, y: number, range: number, not: readonly number[]): Foe | null {
    const list = this.foes.filter((f) => !f.dead && Math.hypot(f.x - x, f.y - y) <= range);
    const fresh = list.filter((f) => !not.includes(f.id));
    const from = fresh.length ? fresh : list;
    return from.length ? this.rng.pick(from) : null;
  }

  /** What was marked on the ground lands. */
  private landFalls(dt: number): void {
    if (this.falls.length === 0) return;
    for (const f of this.falls) {
      f.left -= dt;
      if (f.left > 0) continue;
      if (f.dmg > 0) this.blast(f.x, f.y, f.r, f.dmg, f.stun, f.kind, f.kind === 'star' ? 8 : 20);
      else this.events.push({ t: 'burst', x: f.x, y: f.y, r: f.r, kind: f.kind });
      if (f.leaves) this.zones.push({ id: this.ids++, x: f.x, y: f.y, r: f.r, by: f.by, life: f.seconds, tick: 0, kind: f.leaves, mend: QUIRKS.consecrate.mends });
    }
    this.falls = this.falls.filter((f) => f.left > 0);
  }

  /** Rings that run out do their harm to each as they reach them. */
  private spread(dt: number): void {
    if (this.rings.length === 0) return;
    for (const g of this.rings) {
      g.r += g.speed * dt;
      for (const f of this.foes) {
        if (f.dead || g.seen.includes(f.id) || Math.hypot(f.x - g.x, f.y - g.y) > g.r + f.def.r) continue;
        g.seen.push(f.id);
        f.burn = Math.max(f.burn, g.seconds);
        f.burnBy = Math.max(f.burnBy, g.burns);
        this.wound(f, g.dmg, false, false);
      }
    }
    this.rings = this.rings.filter((g) => g.r < g.to);
  }

  /** Freezes a foe solid: it can do nothing, takes more from Ysolde, and cannot be frozen again at once. */
  private freeze(f: Foe, seconds: number): void {
    const s = seconds * (f.boss ? MOVE.bossShare : 1);
    f.frozen = Math.max(f.frozen, s);
    f.stun = Math.max(f.stun, s);
    f.numb = s + QUIRKS.deepcold.numb;
    this.events.push({ t: 'freeze', id: f.id, seconds: s });
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

  private mark(def: EnemyDef, x: number, y: number, boss: boolean, champion: ChampionTrait | '' = ''): void {
    const m: Mark = {
      id: this.ids++,
      x: Math.max(ARENA.edge, Math.min(this.w - ARENA.edge, x)),
      y: Math.max(ARENA.edge + 30, Math.min(this.h - ARENA.edge, y)),
      left: boss || champion ? MARK_SECONDS * 1.6 : MARK_SECONDS,
      def,
      boss,
      champion,
    };
    this.marks.push(m);
    this.events.push({ t: 'mark', id: m.id, x: m.x, y: m.y, boss });
  }

  private standMarks(dt: number): void {
    for (const m of this.marks) m.left -= dt;
    for (const m of this.marks) {
      if (m.left > 0) continue;
      const at = enemyAt(m.def, this.wave.n);
      // The horde is many and each a little weaker. A champion is far more than the one it is made from.
      const c = ROAD.champions;
      // The last danger: all of them are sturdier.
      const sturdy = this.danger >= 5 && !m.def.prop ? DANGER.hp : 1;
      const hp = Math.max(1, Math.round(at.hp * sturdy * (m.champion ? c.hp : this.omen === 'horde' && !m.def.prop ? ROAD.horde.hp : 1)));
      if (!m.def.prop && !this.met.includes(m.def.id)) this.met.push(m.def.id);
      const f: Foe = {
        id: m.id, def: m.def, x: m.x, y: m.y, kx: 0, ky: 0, hp, maxHp: hp, dmg: m.champion ? Math.max(1, Math.round(at.dmg * c.dmg)) : at.dmg, face: this.hero.x >= m.x ? 1 : -1,
        state: 'walk', left: 0, cool: (m.def.every ?? 2) * this.rng.range(0.4, 1), dx: 0, dy: 0, doing: '', turn: 0,
        slow: 0, slowBy: 0, stun: 0, burn: 0, burnBy: 0, burnTick: 0, frozen: 0, numb: 0, marked: 0, markedBy: 0, flee: 0, moving: false, spurred: false, boss: m.boss, dead: false,
        champion: m.champion, blaze: c.every * 0.5,
      };
      if (m.boss) this.bossId = f.id;
      if (m.def.ai === 'cross') {
        // The wagon goes over the field from the side it was marked on.
        f.dx = m.x < this.w / 2 ? 1 : -1;
        f.face = f.dx > 0 ? 1 : -1;
        this.events.push({ t: 'wagon', id: f.id, how: 'on' });
      }
      this.foes.push(f);
      this.events.push({ t: 'stand', id: f.id });
      if (m.champion) this.events.push({ t: 'champion', id: f.id, trait: m.champion });
    }
    this.marks = this.marks.filter((m) => m.left > 0);
  }

  // ------------------------------------------------------------ what the road and the relics put on the field

  /** The sturdiest of those who walk in this wave: what a champion and a wagon's guard are made from. */
  private sturdiest(): EnemyDef {
    let best: EnemyDef | null = null;
    for (const [id] of this.wave.mix) {
      const def = byId(ENEMIES, id);
      if (def.ai !== 'walk' && def.ai !== 'charge') continue;
      if (!best || def.hp > best.hp) best = def;
    }
    return best ?? byId(ENEMIES, this.wave.mix[0][0]);
  }

  /** What the road has put on the field comes when it is due, the shrine fills, and the stormglass strikes. */
  private signs(dt: number): void {
    const h = this.hero;
    const c = ROAD.champions;
    while (this.champsDue.length > 0 && this.time >= this.champsDue[0]) {
      this.champsDue.shift();
      const from = this.sturdiest();
      const trait = this.rng.pick(['quick', 'armored', 'burning'] as const);
      // A champion is the same fighter, bigger: its own picture, its own way of fighting.
      const def: EnemyDef = { ...from, size: (from.size ?? 1) * c.size, r: Math.round(from.r * 1.15), coins: from.coins * c.coins, speed: from.speed * (trait === 'quick' ? c.quick : 1) };
      const at = this.ringed(this.rng.next() * TAU);
      this.mark(def, at.x, at.y, false, trait);
    }
    if (this.wagonDue >= 0 && this.time >= this.wagonDue) {
      this.wagonDue = -1;
      const def = byId(ENEMIES, 'paywagon');
      // It comes on at the side further from the hero, and goes straight over.
      const left = h.x > this.w / 2;
      const x = left ? ARENA.edge + 6 : this.w - ARENA.edge - 6;
      const y = this.rng.range(this.h * 0.3, this.h * 0.7);
      this.wagonSpeed = (this.w - ARENA.edge * 2) / (ROAD.wagon.crossing * this.wave.seconds);
      this.mark(def, x, y, false);
      const guard = this.sturdiest();
      for (let i = 0; i < ROAD.wagon.guards; i++) {
        const a = (i / ROAD.wagon.guards) * TAU;
        this.mark(guard, x + (left ? 60 : -60) + Math.cos(a) * 54, y + Math.sin(a) * 54, false);
      }
    }
    if (this.cageDue >= 0 && this.time >= this.cageDue) {
      this.cageDue = -1;
      const at = this.farFrom(this.w / 2, this.h / 2, ROAD.stray.clear);
      this.mark(byId(ENEMIES, 'cage'), at.x, at.y, false);
    }
    const sh = this.shrine;
    if (sh && !sh.done && Math.hypot(h.x - sh.x, h.y - sh.y) <= sh.r) {
      sh.got = Math.min(sh.need, sh.got + dt);
      if (sh.got >= sh.need) {
        sh.done = true;
        this.blessed = true;
        this.events.push({ t: 'bless', x: sh.x, y: sh.y });
      }
    }
    if (this.has('stormglass')) {
      this.storm -= dt;
      if (this.storm <= 0) {
        // The one with the most health left, wherever it stands. The ground is marked first, as for anything that falls.
        let most: Foe | null = null;
        for (const f of this.foes) if (!f.dead && (!most || f.hp > most.hp)) most = f;
        if (most) {
          const q = RELIC.stormglass;
          this.storm = q.every;
          this.events.push({ t: 'relic', id: 'stormglass', x: most.x, y: most.y });
          this.fall(most.x, most.y, q.r, MOVE.warn, this.ownBlow(q.harm), q.stun, 'bolt');
        }
      }
    }
  }

  /** The cage is broken: whoever was in it joins the band where it stood. */
  private free(f: Foe): void {
    if (this.freed || !this.stray || !COMPANIONS.some((c) => c.id === this.stray)) return;
    const a = this.enlist({ id: this.stray, bond: 0 }, this.band.length, this.band.length + 1);
    a.x = f.x;
    a.y = f.y;
    a.grace = 1;
    this.band.push(a);
    this.freed = this.stray;
    this.events.push({ t: 'free', id: a.id, who: this.stray, x: f.x, y: f.y });
  }

  /** The Gravedigger's Spade: one of the slain gets up on the hero's side. */
  private raise(f: Foe): void {
    const q = RELIC.spade;
    if (f.boss || f.def.prop || this.risen.length >= q.most || !this.rng.chance(q.chance)) return;
    const r: Risen = {
      id: this.ids++, unit: f.def.unit, size: f.def.size ?? 1, x: f.x, y: f.y, face: f.face, moving: false, life: q.seconds, cool: 0.4,
      dmg: this.ownBlow(q.harm), speed: Math.max(90, f.def.speed * 1.2), r: f.def.r,
    };
    this.risen.push(r);
    this.events.push({ t: 'risen', id: r.id, x: r.x, y: r.y });
  }

  /** The risen go for whoever is nearest them, and are gone when their time is up. */
  private moveRisen(dt: number): void {
    if (this.risen.length === 0) return;
    for (const r of this.risen) {
      r.life -= dt;
      r.cool -= dt;
      r.moving = false;
      const f = this.nearest(460, [], r.x, r.y);
      if (!f) continue;
      const dx = f.x - r.x;
      const dy = f.y - r.y;
      const d = Math.hypot(dx, dy) || 1;
      const reach = r.r + f.def.r + 8;
      if (d > reach) {
        const step = Math.min(d - reach, r.speed * dt);
        r.x += (dx / d) * step;
        r.y += (dy / d) * step;
        r.moving = true;
      } else if (r.cool <= 0) {
        r.cool = RELIC.spade.every;
        this.shove(f, dx / d, dy / d, 6);
        this.wound(f, r.dmg, false, false);
      }
      if (Math.abs(dx) > 4) r.face = dx > 0 ? 1 : -1;
    }
    this.risen = this.risen.filter((r) => r.life > 0);
  }

  // ------------------------------------------------------------ how they fight

  /**
   * Who a foe goes for, and where they are. That is the hero, unless a
   * companion who draws them is near (Mossback), or the hero cannot be
   * seen: then it is where they were last.
   */
  private prey(f: Foe): { x: number; y: number; ally: Ally | null } {
    if (!f.boss) {
      for (const a of this.band) {
        if (a.def.quirk !== 'bulwark' || a.down > 0) continue;
        if (Math.hypot(a.x - f.x, a.y - f.y) < ALLY_QUIRKS.bulwark.r + ALLY_QUIRKS.bulwark.bond * a.bond) return { x: a.x, y: a.y, ally: a };
      }
    }
    return this.hero.unseen > 0 ? { x: this.seenAt.x, y: this.seenAt.y, ally: null } : { x: this.hero.x, y: this.hero.y, ally: null };
  }

  private moveFoes(dt: number): void {
    const drums = this.foes.filter((f) => f.def.ai === 'boost' && !f.dead);
    for (const f of this.foes) {
      if (f.dead) continue;
      f.cool -= dt;
      f.moving = false;
      if (f.burn > 0) this.smolder(f, dt);
      if (f.dead) continue;
      f.slow = Math.max(0, f.slow - dt);
      f.frozen = Math.max(0, f.frozen - dt);
      f.numb = Math.max(0, f.numb - dt);
      f.marked = Math.max(0, f.marked - dt);
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
      const pace = (f.def.ai === 'cross' ? this.wagonSpeed : f.def.speed) * (f.slow > 0 ? 1 - f.slowBy : 1) * (f.spurred ? 1.3 : 1) * (this.night ? ROAD.night.faster : 1) * (this.danger >= 1 && !f.def.prop ? DANGER.quick : 1);
      if (f.def.prop) {
        // A thing: the wagon goes on over the field and away, and a cage stands where it is.
        this.cart(f, pace, dt);
        continue;
      }
      const to = this.prey(f);
      const dx = to.x - f.x;
      const dy = to.y - f.y;
      const d = Math.hypot(dx, dy) || 1;
      if (f.flee > 0) {
        // It runs from the hero, and does nothing else until it has its nerve back.
        f.flee -= dt;
        const hx = f.x - this.hero.x;
        const hy = f.y - this.hero.y;
        const hd = Math.hypot(hx, hy) || 1;
        f.x += (hx / hd) * pace * 1.2 * dt;
        f.y += (hy / hd) * pace * 1.2 * dt;
        f.face = hx >= 0 ? 1 : -1;
        f.moving = true;
        f.x = Math.max(ARENA.edge - 10, Math.min(this.w - ARENA.edge + 10, f.x));
        f.y = Math.max(ARENA.edge + 10, Math.min(this.h - ARENA.edge + 10, f.y));
        continue;
      }
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

  /** A thing an omen put on the field. The wagon that reaches the far side is away with its chest. */
  private cart(f: Foe, pace: number, dt: number): void {
    f.flee = 0;
    if (f.def.ai !== 'cross') return;
    f.x += f.dx * pace * dt;
    f.moving = true;
    if ((f.dx > 0 && f.x >= this.w - ARENA.edge) || (f.dx < 0 && f.x <= ARENA.edge)) {
      f.dead = true;
      this.events.push({ t: 'wagon', id: f.id, how: 'away' });
      this.events.push({ t: 'fall', id: f.id, x: f.x, y: f.y, boss: false, swept: true });
    }
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
    // A burning champion stops when it is near and blazes: a ring round it, shown before it goes off.
    if (f.champion === 'burning') {
      f.blaze -= dt;
      if (f.blaze <= 0 && d < ROAD.champions.near) {
        aim('blaze', ROAD.champions.warn);
        return;
      }
    }
    switch (f.def.ai) {
      case 'walk':
        go(ux, uy);
        break;
      case 'cross':
      case 'still':
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
        const to = this.prey(f);
        const d = Math.hypot(to.x - f.x, to.y - f.y) || 1;
        this.foeShot(f, (to.x - f.x) / d, (to.y - f.y) / d);
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
        for (const a of this.band) if (Math.hypot(a.x - f.x, a.y - f.y) < (def.burst ?? 80) + a.def.r) this.hurtAlly(a, f.dmg);
        // It is spent: it leaves nothing, and is nobody's kill.
        f.dead = true;
        this.events.push({ t: 'fall', id: f.id, x: f.x, y: f.y, boss: false, swept: true });
        break;
      case 'blaze': {
        const r = ROAD.champions.blaze;
        this.events.push({ t: 'burst', x: f.x, y: f.y, r, kind: 'foe' });
        if (Math.hypot(h.x - f.x, h.y - f.y) < r + HERO_RADIUS) this.hurt(f.dmg, f.x, f.y, def.id, 0, f);
        for (const a of this.band) if (Math.hypot(a.x - f.x, a.y - f.y) < r + a.def.r) this.hurtAlly(a, f.dmg);
        f.blaze = ROAD.champions.every;
        break;
      }
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
    const numbed = f.slow > 0 && this.has('frostbite') ? RELIC.frostbite.lets : 1;
    const s: Shot = {
      id: this.ids++, mine: false, x: f.x + ux * (f.def.r + 6), y: f.y - 14 + uy * (f.def.r + 6), vx: ux * speed, vy: uy * speed, r: 7, dmg: Math.max(1, Math.round(f.dmg * share * numbed)), crit: false,
      pierce: 0, leaps: 0, life: 3.4, art: f.def.chills ? 'orb-frost' : 'orb-red', knock: 0, seen: [], from: null, tier: 0, mark: 0, lob: null, chills: f.def.chills ?? 0, by: f.def.id, burns: 0,
      split: false, src: f.id,
    };
    this.shots.push(s);
    this.events.push({ t: 'foeShot', id: s.id });
  }

  /** A foe that reaches the hero hurts them. One that is running through them hurts more. */
  private touch(f: Foe): void {
    const h = this.hero;
    if (f.dead || f.state === 'aim' || f.def.prop) return;
    // The frostbite ring: the slowed do less.
    const numbed = f.slow > 0 && this.has('frostbite') ? RELIC.frostbite.lets : 1;
    const dmg = Math.max(1, Math.round((f.state === 'dash' ? f.dmg * 1.5 : f.dmg) * numbed));
    // One who cannot be seen cannot be struck at.
    if (h.unseen <= 0 && Math.hypot(h.x - f.x, h.y - f.y) < f.def.r + HERO_RADIUS) this.hurt(dmg, f.x, f.y, f.def.id, 0, f, true);
    for (const a of this.band) if (Math.abs(a.x - f.x) < 60 && Math.hypot(a.x - f.x, a.y - f.y) < f.def.r + a.def.r) this.hurtAlly(a, dmg);
  }

  /** A blow lands on a companion. One with no health cannot be hurt, and nor can one in the middle of its charge. */
  private hurtAlly(a: Ally, dmg: number): void {
    if (a.maxHp <= 0 || a.down > 0 || a.grace > 0 || a.state === 'dash' || this.over || this.gathering >= 0) return;
    const amount = Math.max(1, Math.round(dmg * BAND.takes));
    a.hp -= amount;
    a.grace = BAND.grace;
    this.events.push({ t: 'allyHurt', id: a.id, amount });
    if (a.hp > 0) return;
    a.hp = 0;
    a.down = BAND.down * (this.has('whistle') ? RELIC.whistle.down : 1);
    a.state = 'with';
    this.events.push({ t: 'allyDown', id: a.id });
  }

  private getUp(a: Ally): void {
    a.down = 0;
    a.hp = Math.max(1, Math.ceil(a.maxHp * BAND.rises));
    a.grace = 1;
    this.events.push({ t: 'allyUp', id: a.id });
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
        // They keep a little more than their own width apart: a knot of them drawn one over another reads as one.
        const need = (a.def.r + b.def.r) * 1.2;
        if (Math.abs(dx) >= need || Math.abs(dy) >= need) continue;
        const d = Math.hypot(dx, dy);
        if (d >= need) continue;
        // Two on one spot are parted along a way that is always the same for those two.
        const ux = d > 0.01 ? dx / d : Math.cos(a.id + b.id);
        const uy = d > 0.01 ? dy / d : Math.sin(a.id + b.id);
        const push = (need - d) * 0.5;
        // A boss does not give way, and nor does a wagon or a cage.
        const fa = a.boss || !!a.def.prop;
        const fb = b.boss || !!b.def.prop;
        const sa = fa ? 0 : fb ? 1 : 0.5;
        if (fa && fb) continue;
        a.x -= ux * push * sa * 2;
        a.y -= uy * push * sa * 2;
        b.x += ux * push * (1 - sa) * 2;
        b.y += uy * push * (1 - sa) * 2;
      }
    }
  }

  // ------------------------------------------------------------ the band

  /** What one blow of a companion does: it grows with the hero's level, a share of their Damage, and its bond. */
  allyHarm(a: Ally): number {
    const by = (1 + (Math.max(-80, this.stats.damage) * BAND.share) / 100) * (1 + BAND.bond * a.bond) * (this.has('whistle') ? RELIC.whistle.harder : 1);
    return Math.max(1, Math.round((a.def.dmg + a.def.grow * this.level) * by));
  }

  /** Seconds between a companion's blows: a share of the hero's Haste counts, the banner, and the shepherd's nearness. */
  allyEvery(a: Ally): number {
    const h = this.hero;
    const near = this.quirk === 'shepherd' && Math.hypot(a.x - h.x, a.y - h.y) < QUIRKS.shepherd.r ? QUIRKS.shepherd.faster : 1;
    return a.def.every / (hasteRate(this.stats.haste * BAND.share) * near * (1 + this.rally));
  }

  /** A companion's blow lands on a foe. */
  private allyHit(a: Ally, f: Foe, ux: number, uy: number): void {
    if (f.dead) return;
    this.shove(f, ux, uy, a.def.knock);
    if (a.def.quirk === 'keen') {
      const q = ALLY_QUIRKS.keen;
      f.marked = q.seconds;
      f.markedBy = q.more + q.bond * a.bond;
    }
    if (a.def.quirk === 'stampede' && !f.boss) f.stun = Math.max(f.stun, ALLY_QUIRKS.stampede.stun + ALLY_QUIRKS.stampede.bond * a.bond);
    this.wound(f, this.allyHarm(a), false, false);
  }

  /** Moves a companion toward a place, and says how far off it still is. */
  private allyGo(a: Ally, x: number, y: number, speed: number, dt: number, stop = 0): number {
    const dx = x - a.x;
    const dy = y - a.y;
    const d = Math.hypot(dx, dy);
    if (d <= stop || d < 0.5) return d;
    const step = Math.min(d - stop, speed * dt);
    a.x += (dx / d) * step;
    a.y += (dy / d) * step;
    a.moving = true;
    if (Math.abs(dx) > 4) a.face = dx > 0 ? 1 : -1;
    return d - step;
  }

  /** Where a companion walks when it has nothing to do: at the hero's heel. */
  private heel(a: Ally, dt: number, speed = a.def.speed): void {
    const h = this.hero;
    const i = this.band.indexOf(a);
    const side = i % 2 === 0 ? -1 : 1;
    // Behind them and to one side, far enough off that neither stands in the other's picture.
    this.allyGo(a, h.x - h.face * (44 + a.def.r * 2 + 30 * Math.floor(i / 2)), h.y + side * (26 + a.def.r), Math.max(speed, HERO_SPEED * 1.15), dt, 10);
  }

  private moveBand(dt: number): void {
    const h = this.hero;
    this.rally = 0;
    for (const a of this.band) {
      a.since += dt;
      a.grace = Math.max(0, a.grace - dt);
      a.quirkCool = Math.max(0, a.quirkCool - dt);
      a.moving = false;
      if (a.down > 0) {
        a.down -= dt;
        if (a.down <= 0) this.getUp(a);
        continue;
      }
      a.cool -= dt;
      this.actAs(a, dt);
      if (a.def.does !== 'orbit' && a.def.does !== 'stoop') {
        a.x = Math.max(ARENA.edge, Math.min(this.w - ARENA.edge, a.x));
        a.y = Math.max(ARENA.edge + 20, Math.min(this.h - ARENA.edge, a.y));
      }
      if (a.def.quirk === 'rally' && Math.hypot(a.x - h.x, a.y - h.y) < ALLY_QUIRKS.rally.r) this.rally = ALLY_QUIRKS.rally.faster + ALLY_QUIRKS.rally.bond * a.bond;
    }
  }

  /** What a companion on its feet does this step. */
  private actAs(a: Ally, dt: number): void {
    const h = this.hero;
    const def = a.def;
    const strike = (f: Foe): void => {
      const angle = Math.atan2(f.y - a.y, f.x - a.x);
      a.cool = this.allyEvery(a);
      a.since = 0;
      a.angle = angle;
      this.events.push({ t: 'allyStrike', id: a.id, x: f.x, y: f.y, angle });
    };
    switch (def.does) {
      case 'bite': {
        if (a.state === 'fetch') {
          const p = this.picks.find((x) => x.id === a.target && !x.pulled);
          if (!p) a.state = 'with';
          else if (this.allyGo(a, p.x, p.y, def.speed * 1.2, dt, 10) <= 12) {
            // It is brought in: from here it comes to the hero by itself.
            p.pulled = true;
            a.state = 'with';
            a.quirkCool = ALLY_QUIRKS.fetch.every - ALLY_QUIRKS.fetch.bond * a.bond;
            this.events.push({ t: 'allyQuirk', id: a.id, quirk: 'fetch', x: p.x, y: p.y });
          }
          break;
        }
        if (a.quirkCool <= 0) {
          const reach = PICKUP_RADIUS * Math.max(0.3, 1 + this.stats.pickup / 100);
          let best: Pick | null = null;
          let bestD = 520;
          for (const p of this.picks) {
            if (p.pulled || p.kind === 'heart' || p.age < ALLY_QUIRKS.fetch.lain || Math.hypot(p.x - h.x, p.y - h.y) < reach + 30) continue;
            const d = Math.hypot(p.x - a.x, p.y - a.y);
            if (d < bestD) {
              best = p;
              bestD = d;
            }
          }
          if (best) {
            a.state = 'fetch';
            a.target = best.id;
            break;
          }
        }
        const f = this.nearest(BAND.leash);
        if (!f) {
          this.heel(a, dt);
          break;
        }
        if (this.allyGo(a, f.x, f.y, def.speed, dt, def.r + f.def.r + def.reach - 4) <= def.r + f.def.r + def.reach && a.cool <= 0) {
          strike(f);
          this.allyHit(a, f, Math.cos(a.angle), Math.sin(a.angle));
        }
        break;
      }
      case 'orbit': {
        // It goes round the hero and cannot be touched. `speed` is how fast it turns.
        a.angle += def.speed * dt;
        a.x = h.x + Math.cos(a.angle) * 58;
        a.y = h.y - 22 + Math.sin(a.angle) * 36;
        a.moving = true;
        if (a.cool > 0) break;
        const f = this.nearest(def.reach, [], a.x, a.y);
        if (f) {
          const turn = a.angle;
          strike(f);
          this.allyHit(a, f, (f.x - a.x) / (Math.hypot(f.x - a.x, f.y - a.y) || 1), (f.y - a.y) / (Math.hypot(f.x - a.x, f.y - a.y) || 1));
          a.angle = turn;
        }
        break;
      }
      case 'guard': {
        // It puts itself between the hero and whoever is nearest to them.
        const f = this.nearest(420);
        if (!f) {
          this.heel(a, dt, def.speed);
          break;
        }
        const d = Math.hypot(f.x - h.x, f.y - h.y) || 1;
        const out = Math.min(110, d * 0.6);
        this.allyGo(a, h.x + ((f.x - h.x) / d) * out, h.y + ((f.y - h.y) / d) * out, Math.max(def.speed, Math.hypot(a.x - h.x, a.y - h.y) > 200 ? HERO_SPEED : def.speed), dt, 6);
        if (a.cool > 0) break;
        const near = this.nearest(def.reach + def.r, [], a.x, a.y);
        if (near) {
          strike(near);
          this.allyHit(a, near, Math.cos(a.angle), Math.sin(a.angle));
        }
        break;
      }
      case 'stoop': {
        if (a.state === 'go') {
          const f = this.foes.find((x) => x.id === a.target && !x.dead);
          if (!f) {
            a.state = 'with';
            break;
          }
          if (this.allyGo(a, f.x, f.y - 8, def.speed, dt, def.reach) <= def.reach + 2) {
            strike(f);
            this.allyHit(a, f, Math.cos(a.angle), Math.sin(a.angle));
            a.state = 'with';
          }
          break;
        }
        // She wheels over the hero until she has picked someone out.
        a.angle += 1.7 * dt;
        this.allyGo(a, h.x + Math.cos(a.angle) * 86, h.y - 70 + Math.sin(a.angle) * 40, def.speed * 0.7, dt, 4);
        if (a.cool > 0) break;
        // Those who shoot, call and drum come first; then whoever is furthest off.
        let best: Foe | null = null;
        let bestScore = -1;
        for (const f of this.foes) {
          if (f.dead) continue;
          const d = Math.hypot(f.x - h.x, f.y - h.y);
          if (d > 640) continue;
          const back = f.def.ai === 'shoot' || f.def.ai === 'summon' || f.def.ai === 'boost';
          const score = (back ? 2000 : 0) + (back ? 640 - d : d);
          if (score > bestScore) {
            best = f;
            bestScore = score;
          }
        }
        if (best) {
          a.state = 'go';
          a.target = best.id;
        }
        break;
      }
      case 'maul': {
        const q = ALLY_QUIRKS.roar;
        if (a.quirkCool <= 0 && h.hp / h.maxHp < q.under && this.nearest(q.r, [], a.x, a.y)) {
          a.quirkCool = q.every - q.bond * a.bond;
          this.daze(a.x, a.y, q.r, q.stun);
          this.events.push({ t: 'allyQuirk', id: a.id, quirk: 'roar', x: a.x, y: a.y });
          this.events.push({ t: 'ring', x: a.x, y: a.y, r: q.r, seconds: 0.3, kind: 'roar' });
        }
        const f = this.nearest(230);
        if (!f) {
          this.heel(a, dt);
          break;
        }
        const reach = def.r + f.def.r + def.reach;
        if (this.allyGo(a, f.x, f.y, def.speed, dt, reach - 14) <= reach && a.cool <= 0) {
          strike(f);
          // Everyone round her takes it.
          for (const o of this.foes) {
            const d = Math.hypot(o.x - a.x, o.y - a.y);
            if (!o.dead && d <= def.r + o.def.r + def.reach) this.allyHit(a, o, (o.x - a.x) / (d || 1), (o.y - a.y) / (d || 1));
          }
        }
        break;
      }
      case 'spit': {
        const q = ALLY_QUIRKS.trail;
        const f = Math.hypot(a.x - h.x, a.y - h.y) < BAND.leash + 60 ? this.nearest(def.reach, [], a.x, a.y) : null;
        if (!f) this.heel(a, dt);
        else {
          // It never stands: it runs a ring round whoever it is spitting at, a little off.
          const dx = a.x - f.x;
          const dy = a.y - f.y;
          const d = Math.hypot(dx, dy) || 1;
          const keep = 130;
          const turn = a.id % 2 ? 1 : -1;
          const tx = dx / d;
          const ty = dy / d;
          const pull = d > keep + 30 ? -1 : d < keep - 30 ? 1 : 0;
          const mx = -ty * turn + tx * pull;
          const my = tx * turn + ty * pull;
          const ml = Math.hypot(mx, my) || 1;
          a.x += (mx / ml) * def.speed * dt;
          a.y += (my / ml) * def.speed * dt;
          a.moving = true;
          a.face = f.x >= a.x ? 1 : -1;
          if (a.cool <= 0) {
            strike(f);
            const speed = 420;
            const ang = Math.atan2(f.y - 14 - (a.y - 10), f.x - a.x);
            this.shots.push({
              id: this.ids++, mine: true, x: a.x, y: a.y - 10, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: 8, dmg: this.allyHarm(a), crit: false, pierce: 0, leaps: 0,
              life: (def.reach * 1.4) / speed, art: 'orb-fire', knock: def.knock, seen: [], from: null, tier: 0, mark: 0, lob: null, chills: 0, by: '', burns: Math.max(1, this.allyHarm(a) * 0.5),
              split: true, src: 0,
            });
          }
        }
        // The ground burns where it has run.
        a.trail -= dt;
        if (a.moving && a.trail <= 0) {
          a.trail = q.every;
          this.zones.push({ id: this.ids++, x: a.x, y: a.y, r: q.r, by: Math.max(1, this.allyHarm(a) * q.harm), life: q.seconds, tick: 0.2, kind: 'fire', mend: 0 });
        }
        break;
      }
      case 'banner': {
        this.heel(a, dt);
        if (a.cool > 0) break;
        const f = this.nearest(def.reach + def.r, [], a.x, a.y);
        if (f) {
          strike(f);
          this.allyHit(a, f, Math.cos(a.angle), Math.sin(a.angle));
        }
        break;
      }
      case 'ram': {
        const q = ALLY_QUIRKS.stampede;
        if (a.state === 'dash') {
          a.x += a.dx * q.dash * dt;
          a.y += a.dy * q.dash * dt;
          a.moving = true;
          a.face = a.dx >= 0 ? 1 : -1;
          for (const f of this.foes) {
            if (f.dead || a.seen.includes(f.id) || Math.hypot(f.x - a.x, f.y - a.y) > def.r + f.def.r + def.reach) continue;
            a.seen.push(f.id);
            const side = (f.x - a.x) * -a.dy + (f.y - a.y) * a.dx >= 0 ? 1 : -1;
            this.allyHit(a, f, -a.dy * side, a.dx * side);
          }
          a.left -= dt;
          if (a.left <= 0 || a.x < ARENA.edge || a.x > this.w - ARENA.edge || a.y < ARENA.edge + 20 || a.y > this.h - ARENA.edge) {
            a.state = 'back';
            a.cool = this.allyEvery(a);
          }
          break;
        }
        this.heel(a, dt, def.speed * 1.4);
        if (a.cool > 0) break;
        const f = this.thickest(h.x, h.y, BAND.leash + 60);
        if (!f) break;
        const d = Math.hypot(f.x - a.x, f.y - a.y) || 1;
        a.state = 'dash';
        a.dx = (f.x - a.x) / d;
        a.dy = (f.y - a.y) / d;
        a.left = Math.min(q.seconds, (d + 130) / q.dash);
        a.seen = [];
        a.since = 0;
        a.angle = Math.atan2(a.dy, a.dx);
        this.events.push({ t: 'allyStrike', id: a.id, x: f.x, y: f.y, angle: a.angle });
        break;
      }
    }
  }

  // ------------------------------------------------------------ what the hero carries

  /** How much more the hero's blows do for the relics they hold. */
  private boon(): number {
    const h = this.hero;
    let by = 1;
    if (this.has('crown')) by *= RELIC.crown.dealt;
    if (this.tithe) by *= 1 + RELIC.tithe.more;
    if (this.has('wolfskin') && this.band.some((a) => a.down <= 0 && Math.hypot(a.x - h.x, a.y - h.y) < RELIC.wolfskin.r)) by *= 1 + RELIC.wolfskin.more;
    return by;
  }

  /** How much more the hero's blows do for their quirk. */
  private edge(): number {
    const h = this.hero;
    switch (this.quirk) {
      case 'unseen':
        return 1 + Math.min(QUIRKS.unseen.most, h.safe * QUIRKS.unseen.each);
      case 'momentum':
        return 1 + QUIRKS.momentum.most * Math.min(1, h.ran / QUIRKS.momentum.seconds);
      case 'sticky':
        return 1 + Math.min(QUIRKS.sticky.most, Math.floor(this.held / QUIRKS.sticky.coins) / 100);
      case 'unburied':
        return 1 + QUIRKS.unburied.most * (1 - h.hp / h.maxHp);
      default:
        return 1;
    }
  }

  /** What one blow of a weapon does, rolled. `lucky` false leaves the dice alone: no blow that hits harder. */
  private roll(slot: Slot, lucky = true): { amount: number; crit: boolean } {
    const def = slot.def;
    const s = this.stats;
    const base = def.dmg[slot.tier] + (def.scale.might ?? 0) * s.might + (def.scale.aim ?? 0) * s.aim + (def.scale.lore ?? 0) * s.lore;
    // The Whetstone of Ages is on the hero's own weapon and no other.
    let amount = Math.max(1, Math.round(base * Math.max(0.1, 1 + s.damage / 100) * this.edge() * this.boon() * (slot.own ? this.whet : 1)));
    // Out of the dark every blow finds the gap.
    const crit = lucky && (this.hero.sure > 0 || this.rng.chance(Math.max(0, def.crit + s.crit) / 100));
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
      this.fire(i, slot, target, 0);
      if (def.kind === 'magic') {
        this.casts++;
        // The gift of the arcane: every so-many-th spell is not waited for.
        if (this.gifts.free > 0 && this.casts % this.gifts.free === 0) slot.cool = Math.min(slot.cool, 0.12);
      }
      // Every third spell of Orrin's is cast twice.
      if (this.quirk === 'echo' && def.kind === 'magic') {
        this.spells++;
        if (this.spells % QUIRKS.echo.every === 0) {
          this.fire(i, slot, target, 0.2);
          this.events.push({ t: 'quirk', on: true });
        }
      }
      // The Echo Bell: every tenth blow of the hero's own weapon lands twice.
      if (slot.own && this.has('echobell')) {
        this.ownBlows++;
        if (this.ownBlows % RELIC.echobell.every === 0) {
          this.fire(i, slot, target.dead ? (this.nearest(range) ?? target) : target, 0.15);
          this.events.push({ t: 'relic', id: 'echobell', x: this.hero.x, y: this.hero.y });
        }
      }
    }
  }

  /** One weapon strikes at a target. `twist` turns what it looses a little aside: a spell's echo. */
  private fire(i: number, slot: Slot, target: Foe, twist: number): void {
    const h = this.hero;
    const def = slot.def;
    const n = this.slots.length;
    const range = this.rangeOf(def);
    const angle = Math.atan2(target.y - h.y, target.x - h.x);
    slot.angle = angle;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const place = slotPlace(i, n);
    switch (def.motion) {
      case 'thrust': {
        // Everyone in a line from the hero, nearest first, as many as it goes through.
        const most = (def.pierce ?? 1) + this.gifts.thrust;
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
        // A venomed blade leaves its cloud where the first it cut stood.
        if (def.cloud && inLine.length > 0) this.cloud(inLine[0].x, inLine[0].y, def.burst ?? 34, def.cloud[slot.tier]);
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
        const r = (def.burst ?? 56) * this.gifts.burst;
        const stun = (def.stun ?? 0.6) + this.gifts.stun;
        let harm = 0;
        let felled = false;
        for (const f of this.foes) {
          if (f.dead || Math.hypot(f.x - target.x, f.y - target.y) > r + f.def.r) continue;
          harm = Math.max(harm, this.blow(f, slot, target.x, target.y));
          if (f.dead) felled = true;
          else if (!f.boss) f.stun = Math.max(f.stun, stun);
        }
        // A blessed mace mends whoever fells someone with it.
        if (felled && def.mends) this.mend(def.mends[slot.tier]);
        this.events.push({ t: 'strike', slot: i, angle, x: target.x, y: target.y, range });
        this.events.push({ t: 'burst', x: target.x, y: target.y, r, kind: 'slam' });
        // Maren's hammer leaves the ground holy.
        if (this.quirk === 'consecrate' && slot.own) {
          const q = QUIRKS.consecrate;
          this.zones.push({ id: this.ids++, x: target.x, y: target.y, r: r + 14, by: Math.max(1, harm * q.harm), life: q.seconds, tick: 0.5, kind: 'holy', mend: q.mends });
        }
        break;
      }
      case 'pulse': {
        const r = (def.burst ?? 110) * this.gifts.burst;
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
        // The hero's own weapon is in their hand; the rest float beside them.
        const x0 = h.x + (slot.own ? h.face * 16 : place.x);
        const y0 = h.y + (slot.own ? -26 : place.y);
        const a = Math.atan2(target.y - 14 - y0, target.x - x0) + twist;
        const lobbed = def.motion === 'lob';
        const far = Math.hypot(target.x - x0, target.y - y0);
        const s: Shot = {
          id: this.ids++, mine: true, x: x0, y: y0, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 9, dmg: amount, crit,
          // The gift of thrown things: what is thrown straight skips on.
          pierce: def.pierce ?? 0, leaps: (def.leaps ?? 0) + (def.motion === 'shoot' && def.kinds.includes('thrown') ? this.gifts.leaps : 0),
          life: lobbed ? 2 : (range * 1.35) / speed, art: def.shot ?? 'arrow', knock: def.knock, seen: [], from: def, tier: slot.tier, mark: def.motion === 'cast' ? target.id : 0,
          lob: lobbed ? { x0, y0, x1: target.x, y1: target.y, of: Math.max(0.35, Math.min(0.9, far / speed)), at: 0 } : null, chills: 0, by: '', burns: 0,
          split: false, src: 0,
        };
        this.shots.push(s);
        this.events.push({ t: 'loose', slot: i, angle: a, shot: s.id });
      }
    }
  }

  /** A weapon's blow lands on a foe: rolled afresh for each one it lands on. Gives back what it did. */
  private blow(f: Foe, slot: Slot, fromX: number, fromY: number): number {
    const { amount, crit } = this.roll(slot);
    this.land(f, amount, crit, fromX, fromY, slot.def.knock, slot.def, slot.tier);
    return amount;
  }

  /** Harm reaches a foe, with whatever the weapon leaves on them. */
  private land(f: Foe, amount: number, crit: boolean, fromX: number, fromY: number, knock: number, def: WeaponDef | null, tier: number): void {
    if (f.dead) return;
    // Ysolde: one that was slowed already, struck again, freezes solid.
    if (this.quirk === 'deepcold' && def && f.slow > 0 && f.numb <= 0) this.freeze(f, QUIRKS.deepcold.freeze);
    // The Hunter's Horn: the first blow on anyone unhurt finds the gap.
    if (def && !crit && f.hp >= f.maxHp && this.has('horn')) {
      amount = Math.round(amount * def.critBy);
      crit = true;
    }
    if (def?.slow) {
      f.slow = Math.max(f.slow, 2 + this.gifts.slowMore);
      f.slowBy = Math.max(f.slowBy, Math.min(0.85, def.slow + this.gifts.slowBy));
    }
    if (def?.burn) {
      f.burn = Math.max(f.burn, 3 + this.gifts.burnMore);
      f.burnBy = Math.max(f.burnBy, def.burn[tier] * this.gifts.burnBy);
    }
    const d = Math.hypot(f.x - fromX, f.y - fromY) || 1;
    this.shove(f, (f.x - fromX) / d, (f.y - fromY) / d, knock * (def ? this.gifts.knock : 1));
    // Fenn: a blow may knock a coin loose.
    if (this.quirk === 'sticky' && def?.own && this.rng.chance(QUIRKS.sticky.chance)) this.drop('coin', f.x, f.y, 1);
    if (f.boss && def) this.fill(MOVE.bossBlow);
    this.wound(f, amount, crit, false);
    const feast = this.hero.feast > 0 && def !== null;
    if ((feast || this.stats.lifesteal > 0) && this.time >= this.leechAt && (feast || this.rng.chance(this.stats.lifesteal / 100))) {
      this.leechAt = this.time + LEECH_GAP;
      this.mend(1);
    }
  }

  /** Takes health off a foe, and fells it if that is the last of it. `soft` is harm that comes by itself: fire, a cloud. */
  private wound(f: Foe, amount: number, crit: boolean, soft: boolean): void {
    if (f.dead) return;
    let by = amount;
    if (f.marked > 0) by *= 1 + f.markedBy;
    if (f.frozen > 0 && this.quirk === 'deepcold') by *= QUIRKS.deepcold.more;
    // An armored champion turns part of every blow. What burns and eats at it is no blow.
    if (f.champion === 'armored' && !soft) by *= ROAD.champions.armored;
    by = Math.max(1, Math.round(by));
    f.hp -= by;
    this.events.push({ t: 'hit', id: f.id, x: f.x, y: f.y, amount: by, crit, soft });
    if (f.hp > 0) return;
    if (f.boss && this.danger >= 4 && !f.second) {
      // The fourth danger: a captain that falls gets up once. It is down for a moment first, so the player sees it coming.
      f.second = true;
      f.hp = Math.max(1, Math.round(f.maxHp * DANGER.wind));
      f.stun = Math.max(f.stun, DANGER.windStun);
      this.events.push({ t: 'second', id: f.id, x: f.x, y: f.y });
      return;
    }
    f.dead = true;
    this.events.push({ t: 'fall', id: f.id, x: f.x, y: f.y, boss: f.boss, swept: false });
    if (f.def.prop) {
      // A thing broken open is nobody's kill: the wagon spills its chest, the cage lets out who was in it.
      if (f.def.ai === 'cross') {
        this.events.push({ t: 'wagon', id: f.id, how: 'broken' });
        this.spill(f.x, f.y, ROAD.wagon.coins + ROAD.wagon.more * (this.wave.n - 1));
      } else this.free(f);
      return;
    }
    this.kills++;
    this.slain[f.def.id] = (this.slain[f.def.id] ?? 0) + 1;
    this.fill(1 / (MOVE.kills + MOVE.more * (this.wave.n - 1)));
    if (f.boss) {
      this.felled.push(f.def.id);
      if (!this.struck) this.unstruck.push(f.def.id);
    }
    this.leave(f);
    if (f.boss || f.champion) {
      this.banners++;
      // The Banner of the Fallen: health for the run, and at once.
      if (this.has('fallen')) {
        this.hero.maxHp += RELIC.fallen.health;
        this.hero.hp += RELIC.fallen.health;
        this.events.push({ t: 'relic', id: 'fallen', x: this.hero.x, y: this.hero.y });
      }
    }
    if (this.has('spade')) this.raise(f);
    // The Bellows: what dies burning sets its neighbors alight.
    if (f.burnBy > 0 && this.has('bellows')) {
      const q = RELIC.bellows;
      this.events.push({ t: 'relic', id: 'bellows', x: f.x, y: f.y });
      for (const o of this.foes) {
        if (o.dead || o === f || Math.hypot(o.x - f.x, o.y - f.y) > q.r + o.def.r) continue;
        o.burn = Math.max(o.burn, q.seconds + this.gifts.burnMore);
        o.burnBy = Math.max(o.burnBy, f.burnBy);
      }
    }
    // The Ember Heart: every fifth kill bursts into flame, and leaves those it reaches burning.
    if (this.has('emberheart') && this.kills % RELIC.emberheart.every === 0) {
      const q = RELIC.emberheart;
      this.events.push({ t: 'relic', id: 'emberheart', x: f.x, y: f.y });
      for (const o of this.foes) {
        if (o.dead || Math.hypot(o.x - f.x, o.y - f.y) > q.r + o.def.r) continue;
        o.burn = Math.max(o.burn, 3 + this.gifts.burnMore);
        o.burnBy = Math.max(o.burnBy, q.burns);
      }
      this.blast(f.x, f.y, q.r, this.ownBlow(q.harm), 0, 'fire', 8);
    }
    // Nan: what dies burning bursts, and lights those near it.
    if (this.quirk === 'kindling' && f.burnBy > 0) {
      const q = QUIRKS.kindling;
      const harm = Math.max(1, Math.round(f.burnBy * q.harm));
      this.events.push({ t: 'burst', x: f.x, y: f.y, r: q.r, kind: 'fire' });
      for (const o of this.foes) {
        if (o.dead || Math.hypot(o.x - f.x, o.y - f.y) > q.r + o.def.r) continue;
        o.burn = Math.max(o.burn, q.burns);
        o.burnBy = Math.max(o.burnBy, f.burnBy);
        this.wound(o, harm, false, true);
      }
    }
    // Ysolde: what dies frozen breaks, and its shards slow those near it.
    if (this.quirk === 'deepcold' && f.frozen > 0) {
      const q = QUIRKS.deepcold;
      const harm = Math.max(1, Math.round(f.maxHp * q.shards));
      this.events.push({ t: 'burst', x: f.x, y: f.y, r: q.r, kind: 'frost' });
      for (const o of this.foes) {
        if (o.dead || Math.hypot(o.x - f.x, o.y - f.y) > q.r + o.def.r) continue;
        o.slow = Math.max(o.slow, 2);
        o.slowBy = Math.max(o.slowBy, 0.4);
        this.wound(o, harm, false, true);
      }
    }
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
    this.spill(f.x, f.y, coins);
    if (f.boss) this.drop('pack', f.x, f.y, 1);
    else if (this.rng.chance(0.006 * lucky)) this.drop('pack', f.x, f.y, 1);
    if (this.rng.chance(HEART.chance * lucky)) this.drop('heart', f.x, f.y, HEART.mends);
  }

  /** Coins of ten, of three and of one: a boss or a chest leaves a heap, not a hundred of them. */
  private spill(x: number, y: number, coins: number): void {
    for (const worth of [10, 3, 1]) {
      while (coins >= worth) {
        coins -= worth;
        this.drop('coin', x, y, worth);
      }
    }
  }

  private drop(kind: PickKind, x: number, y: number, value: number): void {
    const a = this.rng.next() * TAU;
    const v = this.rng.range(40, 150);
    this.picks.push({ id: this.ids++, kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, value, pulled: false, age: 0 });
  }

  // ------------------------------------------------------------ what flies

  private moveShots(dt: number): void {
    const h = this.hero;
    // Shots made while the rest are being moved: the halves of one that split.
    const born: Shot[] = [];
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
        // A shot stops on Mossback's shell, and he takes a share of it.
        const shell = this.band.find((a) => a.def.quirk === 'bulwark' && a.down <= 0 && Math.hypot(a.x - s.x, a.y - 12 - s.y) < a.def.r + s.r);
        if (shell) {
          this.hurtAlly(shell, s.dmg * ALLY_QUIRKS.bulwark.shell * 2);
          s.life = -1;
        } else if (Math.hypot(h.x - s.x, h.y - 14 - s.y) < HERO_RADIUS + s.r) {
          this.hurt(s.dmg, s.x - s.vx, s.y - s.vy, s.by, s.chills, this.foes.find((f) => f.id === s.src && !f.dead) ?? null);
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
        if (s.burns > 0) {
          f.burn = Math.max(f.burn, 3);
          f.burnBy = Math.max(f.burnBy, s.burns);
        }
        this.land(f, s.dmg, s.crit, s.x - s.vx, s.y - s.vy, s.knock, s.from, s.tier);
        // The Twin Quiver: a shot splits in two when it first hits, and the halves fly on to either side.
        if (!s.split && s.from?.motion === 'shoot' && this.has('twinquiver')) {
          s.split = true;
          const q = RELIC.twinquiver;
          const speed = Math.hypot(s.vx, s.vy);
          const a = Math.atan2(s.vy, s.vx);
          for (const turn of [-q.spread, q.spread]) {
            born.push({
              ...s, id: this.ids++, vx: Math.cos(a + turn) * speed, vy: Math.sin(a + turn) * speed, dmg: Math.max(1, Math.round(s.dmg * q.share)), pierce: 0, leaps: 0, life: 0.45,
              seen: [...s.seen], mark: 0, split: true,
            });
          }
        }
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
    if (born.length > 0) this.shots.push(...born);
  }

  /** Something of the hero's bursts: everyone in its ring is hit, and it may leave a cloud or holy ground. */
  private burst(s: Shot, x: number, y: number): void {
    const def = s.from;
    if (!def) return;
    const r = (def.burst ?? 60) * this.gifts.burst;
    const kind: Burst = def.cloud ? 'venom' : def.holy ? 'light' : def.burn ? 'fire' : 'powder';
    this.events.push({ t: 'burst', x, y, r, kind });
    for (const f of this.foes) {
      if (!f.dead && Math.hypot(f.x - x, f.y - y) <= r + f.def.r) this.land(f, s.dmg, s.crit, x, y, s.knock, def, s.tier);
    }
    if (def.cloud) this.cloud(x, y, r, def.cloud[s.tier]);
    if (def.holy) this.zones.push({ id: this.ids++, x, y, r, by: def.holy[s.tier], life: 4, tick: 0.5, kind: 'holy', mend: QUIRKS.consecrate.mends });
  }

  /** A cloud that eats at whoever stands in it. The gift of venom makes it wider and worse. */
  private cloud(x: number, y: number, r: number, by: number): void {
    this.zones.push({ id: this.ids++, x, y, r: r * this.gifts.cloudR, by: by * this.gifts.cloudBy, life: 3, tick: 0.5, kind: 'cloud', mend: 0 });
  }

  /**
   * Places that go on doing harm do it to whoever stands in them: a cloud
   * and holy ground twice a second, fire and falling arrows four times.
   * Holy ground gives the band that stands on it health back besides.
   */
  private seethe(dt: number): void {
    const h = this.hero;
    for (const z of this.zones) {
      z.life -= dt;
      z.tick -= dt;
      if (z.kind === 'holy') {
        z.mend -= dt;
        if (z.mend <= 0) {
          z.mend = QUIRKS.consecrate.mends;
          if (Math.hypot(h.x - z.x, h.y - z.y) <= z.r) this.mend(1);
          for (const a of this.band) if (a.down <= 0 && a.maxHp > 0 && Math.hypot(a.x - z.x, a.y - z.y) <= z.r) a.hp = Math.min(a.maxHp, a.hp + 1);
        }
      }
      if (z.tick > 0) continue;
      const every = z.kind === 'fire' || z.kind === 'rain' ? 0.25 : 0.5;
      z.tick = every;
      const harm = Math.max(1, Math.round(z.by * every));
      for (const f of this.foes) {
        if (f.dead || Math.hypot(f.x - z.x, f.y - z.y) > z.r + f.def.r) continue;
        // Arrows are blows; the rest is harm that comes by itself.
        this.wound(f, harm, false, z.kind !== 'rain');
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
        // The Magpie Feather: a coin comes from wherever it lies, once it has come to rest.
        const called = p.kind === 'coin' && p.age > 0.6 && this.has('magpie');
        if (p.age > 0.25 && wanted && (this.gathering >= 0 || called || Math.hypot(h.x - p.x, h.y - p.y) < reach)) p.pulled = true;
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
      this.xp += value * this.xpBy;
      this.coins += value;
    } else if (p.kind === 'heart') {
      // The Beggar's Bowl: a heart mends double and fills the fury bar.
      const bowl = this.has('bowl');
      this.mend(value * (bowl ? RELIC.bowl.times : 1));
      if (bowl) this.fill(RELIC.bowl.fury);
    } else this.packs++;
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
    this.risen = [];
    this.falls = [];
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
