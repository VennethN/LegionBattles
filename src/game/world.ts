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

import { FIFTH, fifthOf, type Fx } from './forms';
import {
  ALLY_QUIRKS, ALT, ARENA, BAND, BURN_LORE, COMPANIONS, GATHER_SECONDS, HEART, HERO_RADIUS, HERO_SPEED, HURT_GRACE, ITEMS, LATE_COIN, LEECH_GAP, MARK_CLEAR, MARK_SECONDS, MOVE, MOVES, OWN, PICKUP_RADIUS,
  QUIRKS, RING_SHARE, ENEMIES, FOUND, altAt, byId, coinShare, enemyAt, finishedAs, waveOf, weaponOf,
  type AllyQuirk, type CompanionDef, type Count, type EnemyDef, type MoveDef, type MoveId, type Quirk, type WaveDef, type WeaponDef,
} from './data';
import { BAND_UP_LEAST, BREATH, VOW } from './holdData';
import { PERK, type Perk } from './mastery';
import { countKinds, giftsOf, type Gifts } from './kinds';
import { RELIC, partsOf } from './relics';
import { ROAD, likeOf, type ChampionTrait, type Omen } from './road';
import { Rng } from './rng';
import { DODGE_CAP, armorShare, hasteRate, type Stat, type Stats } from './stats';

/** The step the wave is worked out in. A screen that draws faster or slower takes as many of these as the time needs. */
export const STEP = 1 / 60;

/** How long an enemy's throw is in the air: the ground is marked for that long. */
export const LOB_FLIES = 1.1;
/** What a healer gives back, as a share of health, and the share of a blow that gets through to one near a warder. */
export const FOE_HEAL = 0.12;
export const FOE_WARD = 0.6;
/** The dead that get up: with this share of their health, after this long down. */
export const UNDYING = { rises: 0.4, down: 1.2 };

/** The Mire Lord's mud: how wide each patch is, how long it stays, seconds between patches as it walks, and the share of the hero's speed it takes. */
export const MUD = { r: 56, seconds: 5, every: 0.45, slow: 0.4 };

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
  /** The wares the run holds, by name: some carry a small rule of their own (forms.ts). */
  items?: readonly string[];
  /** Waves come through with the Whetstone of Ages in hand. */
  whet?: number;
  /** True if the Tithe Box was paid for this wave. */
  tithe?: boolean;
  /** What the Bone Dice rolled for this wave: it is in `stats` already, and is here to be shown. */
  bones?: { up: Stat; down: Stat } | null;
  /** The last weapon Orrin bought, by name: his staff is finished as it. */
  taken?: string;
  /** True on the wave that has the lone champion who leaves a relic: the third of every run. */
  herald?: boolean;
  /** True where whoever is in the cage is let out when the wave ends, broken or not: a first run's Biscuit is not to be missed. */
  given?: boolean;
  /** The vows the run was sworn under, by name: each is a rule (holdData.ts). */
  vows?: readonly string[];
  /** True if the hero's own weapon follows its second way (heroes.ts, OWN_ALTS): an oath unlocks the choice. */
  alt?: boolean;
  /** The share of their health the hero begins the wave with, where that is not all of it: after a forced march, or under a vow that gives no rest between waves. */
  hurt?: number;
  /** True if the Hold's Second Breath is still to be drawn in this run. */
  breath?: boolean;
  /** What the Hold's board gives: how many times as fast fury fills, how many times the band's health and harm, and the share sooner a fallen companion gets up. */
  furyBy?: number;
  bandHp?: number;
  bandDmg?: number;
  bandUp?: number;
  /** The hero's passives past their first, unlocked by their mastery (mastery.ts). */
  perks?: readonly string[];
  /** More from the skill, from their mastery: a share more damage, a share wider, and the share of the Fury bar left after it. */
  skillHarm?: number;
  skillArea?: number;
  skillAgain?: number;
  /** How many companions the run has room for: one let out of a cage joins only a slot that is free. */
  slots?: number;
  /** A companion in a cage on the field on a wave that is not the stray's road: found, and still locked. */
  found?: string;
}

/** Which way the hero is steered: a length of 1 is flat out. `act` lets the move loose, if it is full. */
export interface Steer {
  x: number;
  y: number;
  act?: boolean;
}

/** A hero running through whatever is in the way: Isaura's charge. */
export interface Dash {
  kind: 'charge';
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
  /** Seconds they have stood still, and seconds they have kept moving one way: Isaura's lance is couched by riding straight. */
  still: number;
  ran: number;
  /** Seconds since a blow last landed on them. */
  safe: number;
  /** Seconds left in which enemies cannot see them, and in which every blow of theirs is critical. */
  unseen: number;
  sure: number;
  /** Seconds left in which their own blows heal them. */
  feast: number;
  /** Seconds left of Hroth's open grave: double harm. */
  open: number;
  dash: Dash | null;
}

export type FoeState = 'walk' | 'aim' | 'dash' | 'rest';

export type AllyState = 'with' | 'go' | 'dash' | 'back' | 'fetch' | 'hold';

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
  doing: 'shot' | 'charge' | 'burst' | 'call' | 'ring' | 'blaze' | 'lob' | 'volley' | '';
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
  /** True for a captain that has got up once already (the vow of the second wind). */
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

export type ZoneKind = 'cloud' | 'holy' | 'fire' | 'rain' | 'ice' | 'mud';

/**
 * A place that goes on doing harm: a cloud, fire on the ground, holy
 * ground. `by` is its harm a second. Holy ground mends the band that
 * stands on it besides. Ice does no harm: it slows whoever crosses it.
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
  /** True for one an enemy threw: it lands on the hero and the band, not on enemies. */
  foe?: boolean;
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

/** Bram's gate: a wall across the way he faced. No foe passes it and no shot of theirs, until its time is up. */
export interface Wall {
  id: number;
  /** Its middle, the way it faces (out from where Bram stood), and half its length. */
  x: number;
  y: number;
  nx: number;
  ny: number;
  half: number;
  /** Seconds left of it. */
  life: number;
}

/** Something the field does to whoever stands in it, shown before it happens: a lane of the burning field. */
export interface Peril {
  id: number;
  /** Fire burns, spores poison; a stone falls once. */
  kind: 'fire' | 'spores' | 'stone';
  /** Its middle and its size. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Seconds until it burns, and seconds it then burns for. */
  left: number;
  life: number;
  /** What it does to the hero, and how hot it leaves an enemy burning. */
  dmg: number;
  burns: number;
  /** Seconds until it next catches whoever stands in it, once it burns. */
  tick: number;
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
  /** True for a coin that still lay on the ground when the wave ended: it is worth a share of itself (LATE_COIN). */
  late?: boolean;
}

/** How hard a pull drags an enemy in toward the one struck: as a weapon's knock, the other way. */
const PULL = 4;

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
  // `great` is a blow that is more than the weapon's usual: Isaura's couched thrust, a sweep that goes all the way round.
  | { t: 'strike'; slot: number; angle: number; x: number; y: number; range: number; great?: boolean }
  | { t: 'loose'; slot: number; angle: number; shot: number }
  | { t: 'hit'; id: number; x: number; y: number; amount: number; crit: boolean; soft: boolean }
  | { t: 'fall'; id: number; x: number; y: number; boss: boolean; swept: boolean }
  // A captain that fell gets up again: the vow of the second wind.
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
  /** A cage broken: who was in it, and whether they joined (a slot was free). */
  | { t: 'free'; id: number; who: string; x: number; y: number; joined: boolean }
  /** A ward took a blow that would have landed on the hero: Clank's or Orrin's. */
  | { t: 'ward'; x: number; y: number }
  /** A passive past a hero's first went off (mastery.ts): where, for the screen to show it. */
  | { t: 'perk'; perk: Perk; x: number; y: number }
  // The pay wagon is on the field (`on`), broken open, or away over the far side with its chest.
  | { t: 'wagon'; id: number; how: 'on' | 'broken' | 'away' }
  // A relic does what it does, where it can be seen.
  | { t: 'relic'; id: string; x: number; y: number }
  /** A fifth form's rule or a ware's went off where a blow landed: `id` is the weapon's or the ware's. From `from` for one that jumped. */
  | { t: 'form'; id: string; x: number; y: number; from?: { x: number; y: number } }
  // One of the slain gets up on the hero's side.
  | { t: 'risen'; id: number; x: number; y: number }
  // A shot stops on Bram's set shield; `back` if it is thrown back at who loosed it.
  | { t: 'block'; x: number; y: number; back: boolean }
  // Bram's gate is planted: its middle, the way it faces, half its length and how long it stands.
  | { t: 'gate'; id: number; x: number; y: number; nx: number; ny: number; half: number; seconds: number }
  // A lane of the field is about to burn: its middle and size, and the seconds until it does.
  | { t: 'peril'; id: number; kind: Peril['kind']; x: number; y: number; w: number; h: number; seconds: number }
  // The duelist stands (`on`), or has fallen (`won`).
  | { t: 'duel'; id: number; how: 'on' | 'won' }
  // The lone champion of the third wave has fallen: it leaves a relic.
  | { t: 'herald'; x: number; y: number };

const TAU = Math.PI * 2;

/**
 * Where a weapon floats beside the hero, from their feet. One alone is at
 * their side, where a hand would hold it; more go round them in a ring,
 * the first at their side still.
 */
export function slotPlace(i: number, n: number): { x: number; y: number } {
  // A wide ring that leaves the hero's figure clear, begun up and to one side so that none hangs over their head
  // or under their feet. `i` and `n` count what floats: the hero's own weapon is in their hand, not here.
  const a = (i * TAU) / Math.max(1, n) - Math.PI / 3;
  return { x: Math.cos(a) * 66, y: -42 + Math.sin(a) * 44 };
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
  /** Bram's gates that stand, and the lanes of a burning field. */
  walls: Wall[] = [];
  perils: Peril[] = [];
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
  /** What the road is like in these rules: itself, or the road it works as (road.ts, OMEN_LIKE). */
  readonly like: Omen;
  readonly night: boolean;
  /** The shrine, on the shrine's road. */
  shrine: Shrine | null = null;
  /** True once the shrine has blessed the hero. */
  blessed = false;
  /** Who was freed from the cage, by name, once the cage is broken. */
  freed = '';

  /** Who is in a cage on this field, by name, or '': the stray's road's, or a found companion's. The screen brings in their figure. */
  get caged(): string {
    return this.stray;
  }
  /** Those of the slain who are on their feet for the hero. */
  risen: Risen[] = [];
  /** Champions and captains killed this wave. */
  banners = 0;
  /** True once the lone champion of the third wave has fallen, and once the duelist has. */
  herald = false;
  dueled = false;
  /** The vows the wave is fought under. */
  private readonly vows: ReadonlySet<string>;
  /** What the board gives (see Setup). */
  private readonly furyBy: number;
  /** True if the hero's own weapon follows its second way. */
  private readonly alt: boolean;
  /** True once Orrin's staff has taken the form of a weapon he bought. */
  private finished = false;
  /** How many times the damage of the bolt being cast: Orrin's fifth, by the second way. */
  private surge = 1;
  private readonly bandHp: number;
  private readonly bandDmg: number;
  private readonly bandUp: number;
  /** True once the Hold's Second Breath has been drawn in this wave. */
  breathed = false;
  private breath: boolean;
  /** What the wave counted of the way the hero was played (heroes.ts, COUNTS): a run adds them up for the oaths. */
  counts: Partial<Record<Count, number>> = {};
  /** Who has stood on the field in this wave, and how many of each were slain: the Chronicle keeps them. */
  met: string[] = [];
  slain: Record<string, number> = {};
  /** True once a blow has landed on the hero in this wave, and the captains that fell before one did. */
  struck = false;
  unstruck: string[] = [];

  /** What the Bone Dice rolled for this wave, if the run holds them. */
  readonly bones: { up: Stat; down: Stat } | null;
  /** What the kinds of weapon held do (kinds.ts). */
  readonly gifts: Gifts;

  private readonly relics: ReadonlySet<string>;
  /** The small rules the wares carry, each counted on its own. */
  private readonly wareFx: ReadonlyArray<{ key: string; id: string; fx: Fx }>;
  /** How many blows or strikes each counted rule has seen, by its key. */
  private readonly fxCount = new Map<string, number>();
  /** When a rule may next give health back: as the leech, no faster than LEECH_GAP. */
  private fxLeech = 0;
  /** The Whetstone of Ages: how many times the harm of the hero's own weapon. */
  private readonly whet: number;
  private readonly tithe: boolean;
  private stray: string;
  private readonly given: boolean;
  /** The hero's passives past their first, and more from their skill (mastery.ts). */
  private readonly perks: ReadonlySet<string>;
  private readonly skillHarm: number;
  private readonly skillArea: number;
  private readonly skillAgain: number;
  /** How many companions the run has room for, and the share of its full strength each has: six are about two and a half of one. */
  private readonly room: number;
  private readonly bandShare: number;
  /** True if a ward will take the next blow; seconds until Orrin's next. */
  private warded = false;
  private arcAt = 0;
  /** How much more Wren's blows do for Unseen. */
  private quiet = 0;
  /** Kills counted for Overflow; hits left that Lucky Break makes sure; seconds left of Slip Away and of For the Ninth. */
  private flowKills = 0;
  private sureHits = 0;
  private slipLeft = 0;
  private ninthLeft = 0;
  /** Seconds until Hearth's next ring and Snowfall's next gust, and until Warm Hands heals. */
  private hearthAt = 0;
  private snowAt = 0;
  private warmAt = 0;
  /** Seconds until Hold the Line next heals; when each foe was last trampled. */
  private holdAt = 0;
  private trampled = new Map<number, number>();
  /** Seconds until the next spore lane or stone, or -1; seconds until a boss leaves its next mud. */
  private sporeDue = -1;
  private stoneDue = -1;
  private mudAt = 0;
  /** True once Nettle's tonic has been drunk this wave. */
  private tonicked = false;
  /** Enemies that ward those near them, as they stood this step. */
  private wards: Foe[] = [];
  /** How many times the experience a coin is worth here, and how many times the coins. */
  private readonly xpBy: number;
  private readonly goldBy: number;
  /** When the lone champion, the duelist and the next lane of fire are due, or -1; who the champion and the duelist are once they stand. */
  private heraldDue = -1;
  private duelDue = -1;
  private fireDue = -1;
  private heraldId = 0;
  private duelId = 0;
  /** The way Isaura set out on, for her tilt. */
  private tiltX = 0;
  private tiltY = 0;
  /** True from the moment Bram's shield is set until his sword next strikes; blows of Fenn's that are sure; seconds until a critical blow of his next knocks a coin loose. */
  private fresh = false;
  private lucky = 0;
  private coinAt = 0;
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
  /** The bolts of Orrin's staff, counted. */
  private spells = 0;
  /** Every spell, counted, for the gift of the arcane. */
  private casts = 0;
  /** Where the hero was last seen, for enemies that have lost them. */
  private seenAt = { x: 0, y: 0 };
  private traitOn = false;
  private ids = 1;
  // The first of a wave are marked almost at once: an empty field is a dull thing to open on.
  private nextBand = 0.15;
  private regen = 0;
  private leechAt = 0;
  private bossDue: string | undefined;
  private bossId = 0;

  constructor(setup: Setup) {
    // A relic made of two does what both of its halves do: it is held as them, and as itself for what it does more.
    this.relics = new Set((setup.relics ?? []).flatMap((id) => [id, ...partsOf(id)]));
    // What the wares held carry besides their stats: a copy each, so that two of a ware count twice.
    this.wareFx = (setup.items ?? []).flatMap((id, n) => {
      const fx = ITEMS.find((it) => it.id === id)?.fx;
      return fx ? [{ key: `ware:${id}:${n}`, id, fx }] : [];
    });
    if (this.relics.has('thunderbell')) this.storm = RELIC.thunderbell.every;
    this.vows = new Set(setup.vows ?? []);
    this.furyBy = Math.max(0, setup.furyBy ?? 1);
    this.alt = setup.alt ?? false;
    this.bandHp = Math.max(0.1, setup.bandHp ?? 1);
    this.bandDmg = Math.max(0.1, setup.bandDmg ?? 1);
    this.bandUp = Math.max(0, Math.min(1 - BAND_UP_LEAST, setup.bandUp ?? 0));
    this.breath = !!setup.breath;
    this.perks = new Set(setup.perks ?? []);
    this.skillHarm = 1 + Math.max(0, setup.skillHarm ?? 0);
    this.skillArea = 1 + Math.max(0, setup.skillArea ?? 0);
    this.skillAgain = Math.max(0, Math.min(0.9, setup.skillAgain ?? 0));
    this.room = Math.max(0, setup.slots ?? BAND.places);
    // A band is stronger with more in it, but not by as many times: each is the square root's share of one alone.
    this.bandShare = 1 / Math.sqrt(Math.max(1, (setup.band ?? []).length));
    this.arcAt = PERK.arcward.every;
    this.snowAt = PERK.snowfall.every;
    // A captain's wave is the captain's: no omen changes it.
    const plain = waveOf(setup.wave);
    this.omen = plain.boss ? 'quiet' : (setup.omen ?? 'quiet');
    this.like = likeOf(this.omen);
    // The Early Dark: every wave is fought by night, whatever road led to it.
    this.night = this.like === 'night' || this.vows.has('dusk');
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
    this.spare = this.quirk === 'gravedebt' && (setup.spare ?? true);
    this.rescue = setup.rescue ?? true;
    const maxHp = Math.max(1, Math.round(setup.stats.maxHp));
    // A hero is whole at the start of a wave, but for one a forced march brought here, one sworn to Open Wounds, and on the road of the wounded.
    const whole = Math.min(Math.max(0.05, Math.min(1, setup.hurt ?? 1)), this.omen === 'wounded' ? ROAD.wounded.hp : 1);
    this.hero = {
      x: this.w / 2, y: this.h / 2, hp: Math.max(1, Math.round(maxHp * whole)), maxHp, face: 1, moving: false, grace: 0, chill: 0, chillBy: 0,
      still: 0, ran: 0, safe: 0, unseen: 0, sure: 0, feast: 0, open: 0, dash: null,
    };
    // Orrin's staff is finished as the last weapon he bought.
    const taken = this.quirk === 'unfinished' && setup.taken ? weaponOf(setup.taken) : null;
    this.finished = taken !== null && setup.own !== null && setup.own !== undefined;
    const slot = (c: Carried, own: boolean): Slot => ({ def: own ? finishedAs(weaponOf(c.id), taken) : weaponOf(c.id), tier: c.tier, cool: 0.35, angle: 0, since: 9, own });
    this.slots = [...(setup.own ? [slot(setup.own, true)] : []), ...setup.weapons.map((c) => slot(c, false))];
    this.band = (setup.band ?? []).map((b, i, all) => this.enlist(b, i, all.length));
    this.bossDue = this.wave.boss;
    this.gifts = giftsOf(countKinds(this.slots.map((sl) => sl.def)));
    this.whet = 1 + RELIC.ageswhet.each * Math.max(0, setup.whet ?? 0);
    this.tithe = !!setup.tithe;
    this.bones = setup.bones ?? null;
    this.stray = setup.stray ?? '';
    this.given = !!setup.given;
    this.xpBy = this.omen === 'horde' ? ROAD.horde.xp : this.omen === 'stampede' ? ROAD.stampede.xp : 1;
    this.goldBy = this.omen === 'burning' ? ROAD.burning.coins : this.omen === 'goldvein' ? ROAD.goldvein.coins : 1;
    // What the road puts on the field.
    if (this.omen === 'champions') this.champsDue = ROAD.champions.at.slice(0, ROAD.champions.count).map((share) => share * this.wave.seconds);
    // Champions Abroad: a champion walks in every wave from the third, but not beside a captain, not on the road that is all
    // champions, not into a duel, which is fought alone, and not beside the lone champion of the third wave, who is the vow's own there.
    else if (this.vows.has('champions') && !this.wave.boss && this.wave.n >= VOW.champion.from && this.omen !== 'duel' && !setup.herald) this.champsDue = [VOW.champion.at * this.wave.seconds];
    // A land's fifth wave brings its elite: a champion of the land.
    else if (this.wave.elite && this.omen !== 'duel' && !setup.herald) this.champsDue = [0.3 * this.wave.seconds];
    if (this.like === 'wagon') this.wagonDue = ROAD.wagon.at * this.wave.seconds;
    if (this.omen === 'stray' && this.stray) this.cageDue = 1.2;
    // A found companion's cage: on its own, with nobody guarding it.
    else if (setup.found && COMPANIONS.some((c) => c.id === setup.found) && !plain.boss) {
      this.stray = setup.found;
      this.cageDue = FOUND.at;
    }
    if (this.like === 'spores') this.sporeDue = ROAD.spores.first;
    if (this.like === 'ashfall') this.stoneDue = ROAD.ashfall.first;
    if (this.omen === 'duel') this.duelDue = ROAD.duel.at;
    if (this.omen === 'burning') this.fireDue = ROAD.burning.first;
    if (setup.herald && !plain.boss) this.heraldDue = ROAD.herald.at * this.wave.seconds;
    if (this.like === 'shrine') {
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
    if (this.omen === 'horde' || this.omen === 'goldvein') {
      const more = this.omen === 'horde' ? ROAD.horde.more : ROAD.goldvein.more;
      band = Math.round(band * more);
      most = Math.round(most * more);
    }
    if (this.omen === 'champions') band = Math.max(2, Math.round(band * ROAD.champions.fewer));
    if (this.omen === 'toll') seconds = Math.round(seconds * ROAD.toll.seconds);
    if (this.has('sands')) seconds = Math.max(RELIC.sands.least, seconds - RELIC.sands.shorter);
    return { ...w, seconds, band, most };
  }

  /** A companion as it stands at the start of a wave: beside the hero, whole. */
  private enlist(b: Banded, i: number, n: number): Ally {
    const def = byId(COMPANIONS, b.id);
    const bond = Math.max(0, Math.min(BAND.bonds, b.bond));
    const maxHp = def.hp > 0 ? Math.max(1, Math.round(def.hp * this.bandHp * this.bandShare * (1 + BAND.hpGrow * this.level) * (1 + BAND.bond * bond))) : 0;
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
        const share = Math.min(1, this.quiet / QUIRKS.unseen.most);
        return { on: share >= 1, share };
      }
      case 'unfinished':
        // Finished as something or not yet.
        return { on: this.finished, share: this.finished ? 1 : 0 };
      case 'double': {
        const share = Math.min(1, this.held / QUIRKS.double.coins / 100 / QUIRKS.double.most);
        return { on: share > 0, share };
      }
      case 'banked': {
        // How many burn within her reach, of a handful.
        let n = 0;
        for (const f of this.foes) if (!f.dead && f.burn > 0 && Math.hypot(f.x - h.x, f.y - h.y) <= QUIRKS.banked.r + f.def.r) n++;
        return { on: n > 0, share: Math.min(1, n / 6) };
      }
      case 'tilt': {
        const share = Math.min(1, h.ran / QUIRKS.tilt.seconds);
        return { on: share >= 1, share };
      }
      case 'gravedebt': {
        // The bar fills as he is hurt, and is full at the edge of his debt.
        const debt = h.hp / h.maxHp < QUIRKS.gravedebt.under;
        return { on: debt, share: Math.min(1, (1 - h.hp / h.maxHp) / (1 - QUIRKS.gravedebt.under)) };
      }
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
    let strong = false;
    let worth = false;
    const sturdy = this.ownBlow(3);
    for (const f of this.foes) {
      if (f.dead || Math.hypot(f.x - h.x, f.y - h.y) - f.def.r > m.reach) continue;
      if (f.boss || f.champion) strong = true;
      // One worth an arrow of its own: a captain, a champion, or anyone who would take several blows to bring down.
      if (f.boss || f.champion || f.hp >= sturdy) worth = true;
      near++;
    }
    const hale = h.hp / h.maxHp;
    // One arrow is for one worth it. The grave is not opened by one who cannot pay for it.
    if (m.id === 'oneshot') return worth || (near > 0 && hale < MOVE.trouble);
    if (m.id === 'opengrave') return hale > MOVE.graveCost + 0.15 && (strong || near >= MOVE.crowd);
    return strong || near >= MOVE.crowd || (near > 0 && hale < MOVE.trouble);
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
    // Maren's hammer, once it has learned to, is faster while she stands on holy ground.
    const hallowed = slot.own && this.ruled('morningstar', 2) && this.onHoly(this.hero.x, this.hero.y) ? OWN.morningstar.faster : 1;
    // Hroth's axe, by its second way: faster while he is in debt.
    const owed = slot.own && this.indebted && this.alted('gravecleaver') ? ALT.gravecleaver.faster : 1;
    return slot.def.every[slot.tier] / (hasteRate(haste) * set * hallowed * owed * (1 + this.rally) * (this.ninthLeft > 0 ? 1 + PERK.ninth.faster : 1));
  }

  /** True if the hero's own weapon is this one and has learned its rule: the first at level 5, the second at 10, the third at 15. */
  private ruled(weapon: string, at: 1 | 2 | 3): boolean {
    const own = this.own;
    // Where the second way was chosen, it stands in for the rule of its level.
    return own !== null && own.def.id === weapon && own.tier >= at && !(this.alt && altAt(weapon) === at);
  }

  /** Counts one more of something an oath asks after. */
  private count(of: Count): void {
    this.counts[of] = (this.counts[of] ?? 0) + 1;
  }

  /** True if the hero's own weapon is this one, follows its second way, and has reached the level that comes at. */
  private alted(weapon: string): boolean {
    const own = this.own;
    return this.alt && own !== null && own.def.id === weapon && own.tier >= altAt(weapon);
  }

  /** True while Bram's shield is set. */
  private get shielded(): boolean {
    return this.quirk === 'standfast' && this.hero.still >= QUIRKS.standfast.after;
  }

  /** True while nothing has struck Wren for long enough that her harm is at its most. */
  private get hidden(): boolean {
    return this.quirk === 'unseen' && this.quiet >= QUIRKS.unseen.most;
  }

  /** True while Hroth is under the share of his health at which he is in debt. */
  private get indebted(): boolean {
    return this.quirk === 'gravedebt' && this.hero.hp / this.hero.maxHp < QUIRKS.gravedebt.under;
  }

  /** True while Isaura's lance is couched. */
  private get couched(): boolean {
    return this.quirk === 'tilt' && this.hero.ran >= QUIRKS.tilt.seconds;
  }

  /** True if a place is on holy ground. */
  private onHoly(x: number, y: number): boolean {
    return this.zones.some((z) => z.kind === 'holy' && Math.hypot(z.x - x, z.y - y) <= z.r);
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
      this.muddy(dt);
      this.gates(dt);
      this.lanes(dt);
      this.moveBand(dt);
      this.perkTick(dt);
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
    h.open = Math.max(0, h.open - dt);
    this.coinAt = Math.max(0, this.coinAt - dt);
    h.safe += dt;
    // Wren's Unseen grows while nothing strikes her, and twice as fast with nobody near her: she is a hunter who keeps her distance.
    if (this.quirk === 'unseen' && this.gathering < 0) {
      const q = QUIRKS.unseen;
      const alone = !this.foes.some((f) => !f.dead && !f.def.prop && Math.hypot(f.x - h.x, f.y - h.y) < q.far + f.def.r);
      this.quiet = Math.min(q.most, this.quiet + dt * q.each * (alone ? q.alone : 1));
    }
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
    const fromX = h.x;
    const fromY = h.y;
    if (h.dash) this.run(h.dash, speed, dt);
    else {
      h.moving = len > 0.08;
      if (h.moving) {
        // A blizzard takes a share of their speed for as long as it blows.
        const mud = this.zones.some((z) => z.kind === 'mud' && Math.hypot(z.x - h.x, z.y - h.y) <= z.r) ? 1 - MUD.slow : 1;
        const pace = speed * (h.chill > 0 ? 1 - h.chillBy : 1) * (this.omen === 'blizzard' ? 1 - ROAD.blizzard.slow : 1) * (this.omen === 'bog' ? 1 - ROAD.bog.slow : 1) * (this.omen === 'gale' ? 1 - ROAD.gale.slow : 1) * mud *
          (this.slipLeft > 0 ? 1 + PERK.slip.faster : 1);
        h.x += x * pace * dt;
        h.y += y * pace * dt;
        if (Math.abs(x) > 0.15) h.face = x > 0 ? 1 : -1;
      }
    }
    h.x = Math.max(ARENA.edge, Math.min(this.w - ARENA.edge, h.x));
    h.y = Math.max(ARENA.edge + 30, Math.min(this.h - ARENA.edge, h.y));
    // How long they have stood, and how long they have run one way: Bram's shield and Isaura's lance go by these.
    if (h.moving) {
      h.still = 0;
      this.spur += dt;
      // The way they go now. A turn of more than so much from the way they set out begins the count again, that way.
      const m = Math.hypot(x, y) || 1;
      const ux = h.dash ? h.dash.dx : x / m;
      const uy = h.dash ? h.dash.dy : y / m;
      // Riding into a wall is not riding.
      const went = Math.hypot(h.x - fromX, h.y - fromY) > 0.4;
      if (went && ux * this.tiltX + uy * this.tiltY >= Math.cos((QUIRKS.tilt.turn * Math.PI) / 180)) h.ran += dt;
      else {
        this.tiltX = ux;
        this.tiltY = uy;
        h.ran = 0;
      }
    } else {
      h.still += dt;
      if (h.still > QUIRKS.tilt.slack) h.ran = 0;
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
    if (this.stats.regen > 0 && h.hp < h.maxHp && this.quirk !== 'gravedebt') {
      this.regen += (this.stats.regen / 10) * dt;
      if (this.regen >= 1) {
        this.regen -= 1;
        this.mend(1);
      }
    }
    const on = this.trait.on;
    if (on !== this.traitOn && (this.quirk === 'standfast' || this.quirk === 'unseen' || this.quirk === 'tilt' || this.quirk === 'gravedebt' || this.quirk === 'banked')) {
      this.events.push({ t: 'quirk', on });
      // A shield just set: the next sweep from behind it is the first.
      if (this.quirk === 'standfast') this.fresh = on;
    }
    this.traitOn = on;
  }

  /** A charge: the hero runs one way, faster than anything, and whoever is met is struck and thrown aside. */
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
    const h = this.hero;
    if (this.quirk === 'shepherd') {
      // Those in his fold: a companion who has strayed off is not mended.
      for (const a of this.band) if (a.down <= 0 && a.maxHp > 0 && Math.hypot(a.x - h.x, a.y - h.y) <= QUIRKS.shepherd.r) a.hp = Math.min(a.maxHp, a.hp + amount);
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
      // Lucky Break: the next few hits are sure.
      if (this.perks.has('luckybreak')) {
        this.sureHits = PERK.luckybreak.hits;
        this.events.push({ t: 'perk', perk: 'luckybreak', x: h.x, y: h.y });
      }
      // The mirror shard throws a dodged blow back at who struck.
      if (src && !src.dead && this.has('mirror')) {
        this.events.push({ t: 'relic', id: 'mirror', x: src.x, y: src.y });
        this.wound(src, this.ownBlow(RELIC.mirror.harm), false, false);
      }
      return;
    }
    // A ward takes the whole blow, and is gone.
    if (this.warded) {
      this.warded = false;
      h.grace = HURT_GRACE * 0.5;
      this.events.push({ t: 'ward', x: h.x, y: h.y });
      return;
    }
    let amount = Math.max(1, Math.round(dmg * armorShare(this.stats.armor) * (this.has('crown') ? RELIC.crown.taken : 1)));
    // Bloodied and Dawnlight: less of it gets through.
    if (this.perks.has('bloodied') && h.hp / h.maxHp < PERK.bloodied.under) amount = Math.max(1, Math.round(amount * PERK.bloodied.takes));
    if (this.perks.has('dawnlight') && this.onHoly(h.x, h.y)) amount = Math.max(1, Math.round(amount * PERK.dawnlight.takes));
    if (close && src && !src.dead) {
      // Shield Bash: who strikes the raised shield up close is thrown back and stunned.
      if (this.perks.has('bash') && this.shielded) {
        const d = Math.hypot(src.x - h.x, src.y - h.y) || 1;
        this.shove(src, (src.x - h.x) / d, (src.y - h.y) / d, PERK.bash.knock);
        src.stun = Math.max(src.stun, PERK.bash.stun * (src.boss ? MOVE.bossShare : 1));
        this.events.push({ t: 'perk', perk: 'bash', x: src.x, y: src.y });
      }
      // Cold Skin: who strikes her up close is slowed.
      if (this.perks.has('coldskin')) {
        src.slow = Math.max(src.slow, PERK.coldskin.seconds);
        src.slowBy = Math.max(src.slowBy, PERK.coldskin.slow);
        this.events.push({ t: 'perk', perk: 'coldskin', x: src.x, y: src.y });
      }
    }
    if (this.perks.has('slip')) this.slipLeft = PERK.slip.seconds;
    // Bram's set shield takes its share.
    if (this.shielded) {
      amount = Math.max(1, Math.round(amount * QUIRKS.standfast.lets));
      // Once his sword has learned to, who strikes the shield up close is thrown back and stunned.
      if (close && src && !src.dead && this.ruled('gatekeeper', 3)) {
        const d = Math.hypot(src.x - h.x, src.y - h.y) || 1;
        this.shove(src, (src.x - h.x) / d, (src.y - h.y) / d, OWN.gatekeeper.bash);
        src.stun = Math.max(src.stun, OWN.gatekeeper.bashStun * (src.boss ? MOVE.bossShare : 1));
      }
    }
    h.hp -= amount;
    this.struck = true;
    h.grace = HURT_GRACE;
    h.safe = 0;
    // A blow takes part of Unseen, not all of it.
    this.quiet *= QUIRKS.unseen.keeps;
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
      const q = QUIRKS.gravedebt;
      this.spare = false;
      this.rose = true;
      h.hp = Math.max(1, Math.round(h.maxHp * q.rises));
      h.grace = 1.5;
      // Once his axe has learned to, he gets up with the grave open.
      if (this.ruled('gravecleaver', 3) && this.move) {
        h.open = Math.max(h.open, this.move.seconds);
        h.feast = Math.max(h.feast, this.move.seconds);
      }
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
    this.fury = Math.min(1, this.fury + by * this.furyBy * (this.has('sands') ? RELIC.sands.fury : 1));
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

  /** Marks the ground for something an enemy threw: it lands on the hero and the band. */
  private foeFall(x: number, y: number, r: number, left: number, dmg: number): void {
    const cx = Math.max(ARENA.edge, Math.min(this.w - ARENA.edge, x));
    const cy = Math.max(ARENA.edge + 30, Math.min(this.h - ARENA.edge, y));
    const f: Fall = { id: this.ids++, x: cx, y: cy, r, left, dmg, stun: 0, kind: 'foe', leaves: '', seconds: 0, by: 0, foe: true };
    this.falls.push(f);
    this.events.push({ t: 'warn', id: f.id, x: cx, y: cy, r, seconds: left, kind: 'foe' });
  }

  /** Lets the move loose, if it is full and it was asked for, or it goes off by itself and there is something to hit. */
  private deed(steer: Steer): void {
    let m = this.move;
    const h = this.hero;
    if (!m || this.fury < 1 || h.dash) return;
    if (!steer.act && !(this.auto && this.ripe)) return;
    // Mastery may leave the bar partly full after it, so the next comes sooner.
    this.fury = this.skillAgain;
    // Mastery: more harm, and wider.
    const base = byId(MOVES, m.id);
    m = { ...base, harm: base.harm * this.skillHarm, r: base.r * this.skillArea, reach: base.reach * this.skillArea };
    let dx: number = h.face;
    let dy = 0;
    const len = Math.hypot(steer.x, steer.y);
    if (len > 0.08) {
      dx = steer.x / len;
      dy = steer.y / len;
    }
    // The one arrow goes at the strongest of them in reach: the one with the most health left. The move points at it.
    let strongest: Foe | null = null;
    if (m.id === 'oneshot') {
      for (const f of this.foes) {
        if (f.dead || f.def.prop || Math.hypot(f.x - h.x, f.y - h.y) - f.def.r > m.reach) continue;
        if (!strongest || f.hp > strongest.hp) strongest = f;
      }
      if (strongest) {
        const d = Math.hypot(strongest.x - h.x, strongest.y - h.y) || 1;
        dx = (strongest.x - h.x) / d;
        dy = (strongest.y - h.y) / d;
        h.face = dx >= 0 ? 1 : -1;
      }
    }
    this.events.push({ t: 'move', id: m.id, x: h.x, y: h.y, dx, dy });
    switch (m.id) {
      case 'charge':
        h.dash = { kind: 'charge', dx, dy, left: m.seconds, seen: [] };
        break;
      case 'gate': {
        // The gate goes across the way he faces, a little before him. What it lands on is thrown back from it.
        const wall: Wall = { id: this.ids++, x: h.x + dx * MOVE.gateAhead, y: h.y + dy * MOVE.gateAhead, nx: dx, ny: dy, half: m.r, life: m.seconds };
        this.walls.push(wall);
        this.events.push({ t: 'gate', id: wall.id, x: wall.x, y: wall.y, nx: dx, ny: dy, half: m.r, seconds: m.seconds });
        const dmg = this.ownBlow(m.harm);
        for (const f of this.foes) {
          if (f.dead) continue;
          const along = (f.x - wall.x) * -dy + (f.y - wall.y) * dx;
          const off = (f.x - wall.x) * dx + (f.y - wall.y) * dy;
          if (Math.abs(along) > m.r + f.def.r || Math.abs(off) > MOVE.gateNear + f.def.r) continue;
          this.shove(f, dx, dy, 46);
          f.stun = Math.max(f.stun, m.stun * (f.boss ? MOVE.bossShare : 1));
          this.wound(f, dmg, false, false);
        }
        break;
      }
      case 'oneshot': {
        // One arrow, worth a dozen. Out of the dark, with nothing having touched her for long enough, it is worth two dozen.
        const dmg = this.ownBlow(m.harm) * (this.hidden ? 2 : 1);
        this.shots.push({
          id: this.ids++, mine: true, x: h.x + dx * 18, y: h.y - 26, vx: dx * MOVE.oneFlies, vy: dy * MOVE.oneFlies, r: 12, dmg, crit: this.hidden, pierce: 0, leaps: 0, life: 1.2, art: 'arrow',
          knock: 30, seen: [], from: null, tier: 0, mark: strongest ? strongest.id : 0, lob: null, chills: 0, by: '', burns: 0, split: true, src: 0,
        });
        break;
      }
      case 'starfall':
        // They come down one after another along the way he faces: he aims them by how he stands.
        for (let i = 0; i < MOVE.stars; i++) {
          const d = MOVE.starsFrom + i * MOVE.starsApart;
          const x = Math.max(ARENA.edge, Math.min(this.w - ARENA.edge, h.x + dx * d + this.rng.range(-16, 16)));
          const y = Math.max(ARENA.edge + 30, Math.min(this.h - ARENA.edge, h.y + dy * d + this.rng.range(-16, 16)));
          this.fall(x, y, m.r, MOVE.warn + (i * m.seconds) / MOVE.stars, this.ownBlow(m.harm), m.stun, 'star');
        }
        break;
      case 'vanish':
        h.unseen = m.seconds;
        // Their next blows are sure ones: while they are unseen, and for as long again after.
        h.sure = m.seconds * 2;
        break;
      case 'wildfire': {
        const own = this.own;
        const burns = Math.max(3, this.fireOf(own?.def.burn?.[own.tier] ?? 3) * 1.5);
        const speed = 520;
        this.rings.push({ id: this.ids++, x: h.x, y: h.y, r: 10, to: m.r, speed, dmg: this.ownBlow(m.harm), burns, seconds: m.seconds, seen: [], kind: 'fire' });
        this.events.push({ t: 'ring', x: h.x, y: h.y, r: m.r, seconds: m.r / speed, kind: 'fire' });
        break;
      }
      case 'opengrave': {
        // He pays for it with his own health, though never with the last of it.
        const cost = Math.max(0, Math.min(h.hp - 1, Math.round(h.maxHp * MOVE.graveCost)));
        h.hp -= cost;
        if (cost > 0) this.events.push({ t: 'hurt', amount: cost, x: h.x, y: h.y });
        h.open = m.seconds;
        h.feast = m.seconds;
        this.events.push({ t: 'ring', x: h.x, y: h.y, r: 130, seconds: 0.3, kind: 'cry' });
        break;
      }
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
        // It falls where she stands: she has to be in the thick of them for it to count.
        this.fall(h.x, h.y, m.r, MOVE.warn + 0.15, this.ownBlow(m.harm), m.stun, 'light', 'holy', m.seconds * (this.ruled('morningstar', 1) ? OWN.morningstar.longer : 1), this.ownBlow(QUIRKS.consecrate.harm));
        break;
    }
  }

  /** How hot a fire of the hero's burns, a second: what the weapon gives, and a share of their Lore. */
  private fireOf(base: number): number {
    return base + Math.max(0, this.stats.lore) * BURN_LORE;
  }

  /** What was marked on the ground lands. */
  private landFalls(dt: number): void {
    if (this.falls.length === 0) return;
    for (const f of this.falls) {
      f.left -= dt;
      if (f.left > 0) continue;
      if (f.foe) {
        // An enemy's throw: it hurts whoever of the hero's side stands where it lands.
        const h = this.hero;
        this.events.push({ t: 'burst', x: f.x, y: f.y, r: f.r, kind: 'foe' });
        if (Math.hypot(h.x - f.x, h.y - f.y) < f.r + HERO_RADIUS) this.hurt(f.dmg, f.x, f.y, 'thrown');
        for (const a of this.band) if (Math.hypot(a.x - f.x, a.y - f.y) < f.r + a.def.r) this.hurtAlly(a, f.dmg);
        continue;
      }
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
    // A captain is frozen for a share of it, until Ysolde's wand has learned otherwise.
    const s = seconds * (f.boss && !this.ruled('widowstear', 3) ? MOVE.bossShare : 1);
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
    // A duel is between two: nobody else comes.
    if (this.omen === 'duel') return;
    if (this.time < this.nextBand) return;
    // While the hero stands in a shrine's ring they come faster: the blessing is paid for.
    const sh = this.shrine;
    const hurried = sh && !sh.done && Math.hypot(this.hero.x - sh.x, this.hero.y - sh.y) <= sh.r ? ROAD.shrine.hurry : 1;
    this.nextBand = this.time + this.wave.gap * this.rng.range(0.85, 1.15) * hurried;
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

  /** Marks the ground where someone will stand. Gives back the number they will go by once they do. */
  private mark(def: EnemyDef, x: number, y: number, boss: boolean, champion: ChampionTrait | '' = ''): number {
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
    return m.id;
  }

  private standMarks(dt: number): void {
    for (const m of this.marks) m.left -= dt;
    for (const m of this.marks) {
      if (m.left > 0) continue;
      const at = enemyAt(m.def, this.wave.n);
      // The horde is many and each a little weaker. A champion is far more than the one it is made from.
      const c = ROAD.champions;
      const hp = Math.max(1, Math.round(at.hp * (m.champion ? c.hp : this.omen === 'horde' && !m.def.prop ? ROAD.horde.hp : 1)));
      if (!m.def.prop && !this.met.includes(m.def.id)) this.met.push(m.def.id);
      const f: Foe = {
        id: m.id, def: m.def, x: m.x, y: m.y, kx: 0, ky: 0, hp, maxHp: hp, dmg: m.champion ? Math.max(1, Math.round(at.dmg * c.dmg)) : at.dmg, face: this.hero.x >= m.x ? 1 : -1,
        state: 'walk', left: 0, cool: (m.def.every ?? 2) * this.rng.range(0.4, 1), dx: 0, dy: 0, doing: '', turn: 0,
        slow: 0, slowBy: 0, stun: 0, burn: 0, burnBy: 0, burnTick: 0, frozen: 0, numb: 0, marked: 0, markedBy: 0, flee: 0, moving: false, spurred: false, boss: m.boss, dead: false,
        champion: m.champion, blaze: c.every * 0.5,
      };
      if (m.boss) this.bossId = f.id;
      if (f.id === this.duelId) this.events.push({ t: 'duel', id: f.id, how: 'on' });
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
    // A champion is the same fighter, bigger: its own picture, its own way of fighting.
    const champion = (trait: ChampionTrait): EnemyDef => {
      const from = this.sturdiest();
      return { ...from, size: (from.size ?? 1) * c.size, r: Math.round(from.r * 1.15), coins: from.coins * c.coins, speed: from.speed * (trait === 'quick' ? c.quick : 1) };
    };
    while (this.champsDue.length > 0 && this.time >= this.champsDue[0]) {
      this.champsDue.shift();
      const trait = this.rng.pick(['quick', 'armored', 'burning'] as const);
      const at = this.ringed(this.rng.next() * TAU);
      this.mark(champion(trait), at.x, at.y, false, trait);
    }
    if (this.heraldDue >= 0 && this.time >= this.heraldDue) {
      // The lone champion of the third wave: the plainest kind, so that the first one anyone meets can be read.
      this.heraldDue = -1;
      const at = this.ringed(this.rng.next() * TAU);
      this.heraldId = this.mark(champion('armored'), at.x, at.y, false, 'armored');
    }
    if (this.duelDue >= 0 && this.time >= this.duelDue) {
      // The duelist: far more than a champion, quick, and it blazes. What a champion is given is taken off what it is made from first.
      this.duelDue = -1;
      const d = ROAD.duel;
      const from = this.sturdiest();
      const def: EnemyDef = {
        ...from, name: 'The Duelist', size: (from.size ?? 1) * 1.5, r: Math.round(from.r * 1.3), coins: from.coins * c.coins * 3, speed: from.speed * d.speed,
        hp: (from.hp * d.hp) / c.hp, dmg: (from.dmg * d.dmg) / c.dmg,
      };
      const at = this.farFrom(h.x, h.y, 330);
      this.duelId = this.mark(def, at.x, at.y, false, 'burning');
    }
    if (this.fireDue >= 0 && this.time >= this.fireDue && this.left > ROAD.burning.warn + ROAD.burning.burns) {
      // A lane of the field burns: through where the hero stands, across the field or down it. The ground shows it first.
      const q = ROAD.burning;
      this.fireDue = this.time + q.every;
      const base = enemyAt(this.sturdiest(), this.wave.n).dmg;
      const across = this.rng.chance(0.5);
      const p: Peril = {
        id: this.ids++, kind: 'fire', x: across ? this.w / 2 : h.x + this.rng.range(-30, 30), y: across ? h.y + this.rng.range(-30, 30) : this.h / 2, w: across ? this.w : q.wide, h: across ? q.wide : this.h,
        left: q.warn, life: q.burns, dmg: Math.max(1, Math.round(base * q.harm)), burns: Math.max(1, base * q.harm * q.lights), tick: 0,
      };
      this.perils.push(p);
      this.events.push({ t: 'peril', id: p.id, kind: 'fire', x: p.x, y: p.y, w: p.w, h: p.h, seconds: p.left });
    }
    if (this.sporeDue >= 0 && this.time >= this.sporeDue && this.left > ROAD.spores.warn + ROAD.spores.lasts) {
      // A lane of spores rises: through where the hero stands. The ground shows it first.
      const q = ROAD.spores;
      this.sporeDue = this.time + q.every;
      const base = enemyAt(this.sturdiest(), this.wave.n).dmg;
      const across = this.rng.chance(0.5);
      const p: Peril = {
        id: this.ids++, kind: 'spores', x: across ? this.w / 2 : h.x + this.rng.range(-30, 30), y: across ? h.y + this.rng.range(-30, 30) : this.h / 2, w: across ? this.w : q.wide, h: across ? q.wide : this.h,
        left: q.warn, life: q.lasts, dmg: Math.max(1, Math.round(base * q.harm)), burns: 0, tick: 0,
      };
      this.perils.push(p);
      this.events.push({ t: 'peril', id: p.id, kind: 'spores', x: p.x, y: p.y, w: p.w, h: p.h, seconds: p.left });
    }
    if (this.stoneDue >= 0 && this.time >= this.stoneDue && this.left > ROAD.ashfall.warn) {
      // A burning stone falls where the hero is: the ground shows it first.
      const q = ROAD.ashfall;
      this.stoneDue = this.time + q.every * (this.omen === 'squall' ? 0.45 : 1);
      const base = enemyAt(this.sturdiest(), this.wave.n).dmg;
      const p: Peril = {
        // A squall's lightning strikes anywhere on the field; ash falls where the hero is.
        id: this.ids++, kind: 'stone', x: this.omen === 'squall' ? this.rng.range(ARENA.edge + 60, this.w - ARENA.edge - 60) : h.x + this.rng.range(-40, 40),
        y: this.omen === 'squall' ? this.rng.range(ARENA.edge + 80, this.h - ARENA.edge - 60) : h.y + this.rng.range(-40, 40), w: q.wide, h: q.wide,
        left: q.warn, life: 0.01, dmg: Math.max(1, Math.round(base * q.harm)), burns: base, tick: 0,
      };
      this.perils.push(p);
      this.events.push({ t: 'peril', id: p.id, kind: 'stone', x: p.x, y: p.y, w: p.w, h: p.h, seconds: p.left });
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
      // Its guard is stout: the chest is not had for the asking.
      const stout = this.sturdiest();
      const guard: EnemyDef = { ...stout, hp: stout.hp * ROAD.wagon.stout };
      for (let i = 0; i < ROAD.wagon.guards; i++) {
        const a = (i / ROAD.wagon.guards) * TAU;
        this.mark(guard, x + (left ? 60 : -60) + Math.cos(a) * 54, y + Math.sin(a) * 54, false);
      }
    }
    if (this.cageDue >= 0 && this.time >= this.cageDue) {
      this.cageDue = -1;
      const at = this.farFrom(this.w / 2, this.h / 2, ROAD.stray.clear);
      this.mark(byId(ENEMIES, 'cage'), at.x, at.y, false);
      // On the stray's road its jailer stands by it: a champion, between the hero and the cage. One found by chance stands alone.
      const to = Math.atan2(h.y - at.y, h.x - at.x);
      if (this.omen === 'stray') this.mark(champion('armored'), at.x + Math.cos(to) * 70, at.y + Math.sin(to) * 70, false, 'armored');
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
          this.storm = this.has('thunderbell') ? RELIC.thunderbell.every : q.every;
          this.events.push({ t: 'relic', id: 'stormglass', x: most.x, y: most.y });
          this.fall(most.x, most.y, q.r, MOVE.warn, this.ownBlow(q.harm), q.stun, 'bolt');
        }
      }
    }
  }

  /** The cage is broken: whoever was in it joins the band where it stood. */
  private free(f: Foe): void {
    if (this.freed || !this.stray || !COMPANIONS.some((c) => c.id === this.stray)) return;
    this.freed = this.stray;
    // It joins if there is a slot free for it, and is unlocked for good either way (run.ts, state.ts).
    if (this.band.length >= this.room || this.band.some((b) => b.def.id === this.stray)) {
      this.events.push({ t: 'free', id: 0, who: this.stray, x: f.x, y: f.y, joined: false });
      return;
    }
    const a = this.enlist({ id: this.stray, bond: 0 }, this.band.length, this.band.length + 1);
    a.x = f.x;
    a.y = f.y;
    a.grace = 1;
    this.band.push(a);
    this.events.push({ t: 'free', id: a.id, who: this.stray, x: f.x, y: f.y, joined: true });
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
    const drums = this.foes.filter((f) => (f.def.ai === 'boost' || f.def.way === 'overclock') && !f.dead);
    this.wards = this.foes.filter((f) => f.def.ai === 'ward' && !f.dead);
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
      const pace = (f.def.ai === 'cross' ? this.wagonSpeed : f.def.speed) * (f.slow > 0 ? 1 - f.slowBy : 1) * (f.spurred ? 1.3 : 1) * (this.night ? ROAD.night.faster : 1) * (this.vows.has('march') && !f.def.prop ? VOW.quick : 1) * (this.omen === 'bog' ? 1 - ROAD.bog.slow : 1) *
        (f.def.prop ? 1 : this.omen === 'stampede' ? ROAD.stampede.faster : this.omen === 'overclocked' ? ROAD.overclocked.faster : 1);
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
      case 'ward':
        hold(f.def.keep ?? 300);
        break;
      case 'heal':
        hold(f.def.keep ?? 320);
        if (f.cool <= 0) {
          // It mends whoever is near it, a share of their health, and is seen to.
          f.cool = f.def.every ?? 3;
          const r = f.def.wide ?? 220;
          let any = false;
          for (const o of this.foes) {
            if (o.dead || o === f || o.def.prop || o.hp >= o.maxHp || Math.hypot(o.x - f.x, o.y - f.y) > r) continue;
            o.hp = Math.min(o.maxHp, o.hp + Math.ceil(o.maxHp * FOE_HEAL));
            any = true;
          }
          if (any) this.events.push({ t: 'ring', x: f.x, y: f.y, r, seconds: 0.35, kind: 'bell' });
        }
        break;
      case 'lob':
        hold(f.def.keep ?? 300);
        if (f.cool <= 0 && d < (f.def.keep ?? 300) + 200) aim('lob', 0.5);
        break;
      case 'circle': {
        // It rides round the hero at its distance, and shoots as it goes.
        const keep = f.def.keep ?? 260;
        const turn = f.id % 2 ? 1 : -1;
        const pull = d > keep + 40 ? 1 : d < keep - 40 ? -1 : 0;
        const mx = -uy * turn + ux * pull;
        const my = ux * turn + uy * pull;
        const ml = Math.hypot(mx, my) || 1;
        go(mx / ml, my / ml);
        if (f.cool <= 0 && d < keep + 180) {
          const to = this.prey(f);
          const dd = Math.hypot(to.x - f.x, to.y - f.y) || 1;
          this.foeShot(f, (to.x - f.x) / dd, (to.y - f.y) / dd);
          f.cool = (f.def.every ?? 2.2) * this.rng.range(0.85, 1.15);
        }
        break;
      }
      case 'boss': {
        go(ux, uy);
        if (f.cool > 0) break;
        // A boss does its things in a round: a charge, a ring of shots, a call; and what it has of its own between them.
        const way = f.def.way;
        const round: Foe['doing'][] =
          way === 'slam' ? ['charge', 'blaze', 'ring', 'blaze', 'call']
          : way === 'broadside' || way === 'cavein' ? ['charge', 'volley', 'ring', 'volley', 'call']
          : way === 'thrice' ? ['charge', 'charge', 'charge', 'ring', 'call']
          : ['charge', 'ring', 'call'];
        const doing = round[f.turn % round.length];
        f.turn++;
        if (doing === 'charge' && d > 360) aim('ring', 0.7);
        else if (doing === 'blaze' && d > (f.def.slam ?? 0) + 60) aim('ring', 0.7);
        else aim(doing, doing === 'charge' ? (way === 'thrice' ? 0.6 : 0.8) : doing === 'blaze' ? 1 : 0.7);
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
        const r = f.def.slam ?? ROAD.champions.blaze;
        this.events.push({ t: 'burst', x: f.x, y: f.y, r, kind: 'foe' });
        if (Math.hypot(h.x - f.x, h.y - f.y) < r + HERO_RADIUS) this.hurt(f.dmg, f.x, f.y, def.id, 0, f);
        for (const a of this.band) if (Math.hypot(a.x - f.x, a.y - f.y) < r + a.def.r) this.hurtAlly(a, f.dmg);
        f.blaze = ROAD.champions.every;
        if (f.boss) f.cool = def.every ?? 2.4;
        break;
      }
      case 'lob': {
        // What it throws lands where the hero is now: the ground is marked first, and there is time to step out.
        const to = this.prey(f);
        this.foeFall(to.x + this.rng.range(-20, 20), to.y + this.rng.range(-20, 20), def.wide ?? 70, LOB_FLIES, f.dmg);
        f.cool = (def.every ?? 3) * this.rng.range(0.85, 1.15);
        break;
      }
      case 'volley': {
        const to = this.prey(f);
        const r = def.wide ?? 70;
        if (def.way === 'cavein') {
          // Rocks come down in a ring round the hero, a gap left to slip through.
          const gap = this.rng.int(6);
          for (let i = 0; i < 6; i++) if (i !== gap) this.foeFall(to.x + Math.cos((i * TAU) / 6) * r * 1.6, to.y + Math.sin((i * TAU) / 6) * r * 1.2, r, LOB_FLIES + 0.2, f.dmg);
        } else {
          // A broadside: shells in a line from the boss toward the hero, landing one after another.
          const dx = to.x - f.x;
          const dy = to.y - f.y;
          const dl = Math.hypot(dx, dy) || 1;
          for (let i = 1; i <= 5; i++) {
            const at = Math.min(dl + 120, i * 120);
            this.foeFall(f.x + (dx / dl) * at, f.y + (dy / dl) * at, r, LOB_FLIES + i * 0.15, f.dmg);
          }
        }
        f.cool = def.every ?? 2.4;
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
    const speed = (f.def.flies ?? 210) * (this.omen === 'gale' ? ROAD.gale.shots : this.omen === 'overclocked' ? ROAD.overclocked.faster : 1);
    // In a blizzard everything they loose chills.
    const chills = f.def.chills ?? (this.omen === 'blizzard' ? ROAD.blizzard.chills : 0);
    const numbed = f.slow > 0 && this.has('frostbite') ? RELIC.frostbite.lets : 1;
    const s: Shot = {
      id: this.ids++, mine: false, x: f.x + ux * (f.def.r + 6), y: f.y - 14 + uy * (f.def.r + 6), vx: ux * speed, vy: uy * speed, r: 7, dmg: Math.max(1, Math.round(f.dmg * share * numbed)), crit: false,
      pierce: 0, leaps: 0, life: 3.4, art: chills ? 'orb-frost' : 'orb-red', knock: 0, seen: [], from: null, tier: 0, mark: 0, lob: null, chills, by: f.def.id, burns: 0,
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
    const fold = this.ruled('passingbell', 2) && Math.hypot(a.x - this.hero.x, a.y - this.hero.y) <= QUIRKS.shepherd.r ? OWN.passingbell.lets : 1;
    const shell = a.def.quirk === 'hardshell' ? Math.max(0.2, ALLY_QUIRKS.hardshell.takes - ALLY_QUIRKS.hardshell.bond * a.bond) : 1;
    const amount = Math.max(1, Math.round(dmg * BAND.takes * fold * shell));
    a.hp -= amount;
    a.grace = BAND.grace;
    this.events.push({ t: 'allyHurt', id: a.id, amount });
    if (a.hp > 0) return;
    a.hp = 0;
    a.down = BAND.down * (1 - this.bandUp) * (this.has('whistle') ? RELIC.whistle.down : 1);
    a.state = 'with';
    this.events.push({ t: 'allyDown', id: a.id });
    // Last Rites: those round one who goes down are stunned.
    if (this.perks.has('lastrites')) {
      this.daze(a.x, a.y, PERK.lastrites.r, PERK.lastrites.stun);
      this.events.push({ t: 'perk', perk: 'lastrites', x: a.x, y: a.y });
      this.events.push({ t: 'ring', x: a.x, y: a.y, r: PERK.lastrites.r, seconds: 0.3, kind: 'bell' });
    }
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

  // ------------------------------------------------------------ what stands in the way

  /** Bram's gates: no foe passes one, a charge stops on it, and no shot of theirs gets through. */
  private gates(dt: number): void {
    if (this.walls.length === 0) return;
    for (const w of this.walls) {
      w.life -= dt;
      for (const f of this.foes) {
        if (f.dead || f.def.prop) continue;
        const along = (f.x - w.x) * -w.ny + (f.y - w.y) * w.nx;
        if (Math.abs(along) > w.half + f.def.r * 0.5) continue;
        const off = (f.x - w.x) * w.nx + (f.y - w.y) * w.ny;
        const need = f.def.r + 8;
        if (Math.abs(off) >= need) continue;
        // It is put back on the side it came from.
        const side = off >= 0 ? 1 : -1;
        f.x += w.nx * (need * side - off);
        f.y += w.ny * (need * side - off);
        if (f.state === 'dash') {
          f.state = 'rest';
          f.left = 0.7;
        }
      }
      for (const sh of this.shots) {
        if (sh.mine || sh.life <= 0) continue;
        const along = (sh.x - w.x) * -w.ny + (sh.y - w.y) * w.nx;
        const off = (sh.x - w.x) * w.nx + (sh.y - w.y) * w.ny;
        if (Math.abs(along) > w.half || Math.abs(off) > sh.r + 6) continue;
        sh.life = -1;
        this.events.push({ t: 'block', x: sh.x, y: sh.y, back: false });
      }
    }
    this.walls = this.walls.filter((w) => w.life > 0);
  }

  /** The lanes of a burning field: shown, then alight. A hero in one is burnt; an enemy in one is set burning. */
  private lanes(dt: number): void {
    if (this.perils.length === 0) return;
    const h = this.hero;
    for (const p of this.perils) {
      if (p.left > 0) {
        p.left -= dt;
        if (p.left <= 0) this.events.push({ t: 'burst', x: p.x, y: p.y, r: Math.min(p.w, p.h) / 2, kind: p.kind === 'spores' ? 'venom' : 'fire' });
        continue;
      }
      p.life -= dt;
      p.tick -= dt;
      if (p.tick > 0) continue;
      p.tick = 0.2;
      const inside = (x: number, y: number): boolean => Math.abs(x - p.x) <= p.w / 2 && Math.abs(y - p.y) <= p.h / 2;
      if (inside(h.x, h.y)) this.hurt(p.dmg, h.x, h.y + 1, 'fire');
      for (const a of this.band) if (inside(a.x, a.y)) this.hurtAlly(a, p.dmg);
      // Spores choke only the hero's side; fire and a stone light enemies too.
      if (p.kind === 'spores') continue;
      for (const f of this.foes) {
        if (f.dead || f.def.prop || !inside(f.x, f.y)) continue;
        f.burn = Math.max(f.burn, 3);
        f.burnBy = Math.max(f.burnBy, p.burns);
      }
    }
    this.perils = this.perils.filter((p) => p.left > 0 || p.life > 0);
  }

  /** The Mire Lord leaves mud behind it as it walks. */
  private muddy(dt: number): void {
    this.mudAt -= dt;
    if (this.mudAt > 0) return;
    for (const f of this.foes) {
      if (f.dead || f.def.way !== 'mud' || !f.moving) continue;
      this.mudAt = MUD.every;
      this.zones.push({ id: this.ids++, x: f.x, y: f.y + 6, r: MUD.r, by: 0, life: MUD.seconds, tick: 0, kind: 'mud', mend: 0 });
    }
  }

  /** The passives of a hero's mastery that keep time: what each does this step (mastery.ts). */
  private perkTick(dt: number): void {
    const h = this.hero;
    this.slipLeft = Math.max(0, this.slipLeft - dt);
    this.ninthLeft = Math.max(0, this.ninthLeft - dt);
    if (this.perks.size === 0) return;
    // Arcane Ward: a ward comes back after a while, if it is not up already.
    if (this.perks.has('arcward') && !this.warded) {
      this.arcAt -= dt;
      if (this.arcAt <= 0) {
        this.arcAt = PERK.arcward.every;
        this.warded = true;
        this.events.push({ t: 'perk', perk: 'arcward', x: h.x, y: h.y });
      }
    }
    // Hold the Line: the raised shield heals him.
    if (this.perks.has('holdline') && this.shielded && h.hp < h.maxHp) {
      this.holdAt -= dt;
      if (this.holdAt <= 0) {
        this.holdAt = 1;
        this.mend(Math.max(1, Math.round(h.maxHp * PERK.holdline.heals)));
      }
    }
    // Warm Hands: the fires near her warm her.
    if (this.perks.has('warmth')) {
      this.warmAt -= dt;
      if (this.warmAt <= 0) {
        this.warmAt = 1;
        const near = this.foes.filter((f) => !f.dead && f.burn > 0 && Math.hypot(f.x - h.x, f.y - h.y) <= PERK.warmth.r).length;
        if (near > 0 && h.hp < h.maxHp) this.mend(Math.min(PERK.warmth.most, near * PERK.warmth.each));
      }
    }
    // Hearth: standing still lights a ring of fire round her, and again while she stands.
    if (this.perks.has('hearth')) {
      this.hearthAt -= dt;
      if (h.still >= PERK.hearth.still && this.hearthAt <= 0) {
        this.hearthAt = PERK.hearth.seconds;
        const own = this.own;
        const burn = this.fireOf(own?.def.burn?.[own.tier] ?? 3);
        this.zones.push({ id: this.ids++, x: h.x, y: h.y, r: PERK.hearth.r, by: Math.max(1, burn * PERK.hearth.harm * 2), life: PERK.hearth.seconds, tick: 0, kind: 'fire', mend: 0 });
        this.events.push({ t: 'perk', perk: 'hearth', x: h.x, y: h.y });
      }
    }
    // Snowfall: a gust now and then slows everyone near her.
    if (this.perks.has('snowfall')) {
      this.snowAt -= dt;
      if (this.snowAt <= 0) {
        const q = PERK.snowfall;
        this.snowAt = q.every;
        for (const f of this.foes) {
          if (f.dead || Math.hypot(f.x - h.x, f.y - h.y) > q.r + f.def.r) continue;
          f.slow = Math.max(f.slow, q.seconds);
          f.slowBy = Math.max(f.slowBy, q.slow);
        }
        this.events.push({ t: 'perk', perk: 'snowfall', x: h.x, y: h.y });
        this.events.push({ t: 'ring', x: h.x, y: h.y, r: q.r, seconds: 0.35, kind: 'frost' });
      }
    }
    // Trample: riding with her lance couched, she runs down whoever she meets, each no more than so often.
    if (this.perks.has('trample') && this.couched && h.moving) {
      const q = PERK.trample;
      for (const f of this.foes) {
        if (f.dead || f.def.prop || Math.hypot(f.x - h.x, f.y - h.y) > q.r + f.def.r || (this.trampled.get(f.id) ?? -9) > this.time - q.again) continue;
        this.trampled.set(f.id, this.time);
        const d = Math.hypot(f.x - h.x, f.y - h.y) || 1;
        // Thrown aside, off the line she rides.
        const side = (f.x - h.x) * -this.tiltY + (f.y - h.y) * this.tiltX >= 0 ? 1 : -1;
        this.shove(f, -this.tiltY * side || (f.x - h.x) / d, this.tiltX * side || (f.y - h.y) / d, q.knock);
        this.wound(f, this.ownBlow(q.harm), false, false);
        this.events.push({ t: 'perk', perk: 'trample', x: f.x, y: f.y });
      }
    }
  }

  /** The passives of a hero's mastery that go off on a kill (mastery.ts). */
  private perkKill(f: Foe): void {
    if (this.perks.size === 0) return;
    // Overflow: every so many kills burst with magic.
    if (this.perks.has('overflow')) {
      this.flowKills++;
      if (this.flowKills >= PERK.overflow.every) {
        this.flowKills = 0;
        this.events.push({ t: 'perk', perk: 'overflow', x: f.x, y: f.y });
        this.blast(f.x, f.y, PERK.overflow.r, this.ownBlow(PERK.overflow.harm), 0, 'star', 12);
      }
    }
    // Pickpocket: now and then a coin more.
    if (this.perks.has('pickpocket') && this.rng.chance(PERK.pickpocket.chance)) {
      this.drop('coin', f.x, f.y, 1);
      this.events.push({ t: 'perk', perk: 'pickpocket', x: f.x, y: f.y });
    }
    // Radiance: what dies on holy ground bursts with light.
    if (this.perks.has('radiance') && this.onHoly(f.x, f.y)) {
      this.events.push({ t: 'perk', perk: 'radiance', x: f.x, y: f.y });
      this.blast(f.x, f.y, PERK.radiance.r, this.ownBlow(PERK.radiance.harm), 0, 'light', 10);
    }
  }

  // ------------------------------------------------------------ the band

  /** What one blow of a companion does: it grows with the hero's level, a share of their Damage, and its bond. */
  allyHarm(a: Ally): number {
    // The Passing Bell, by its second way: a companion in his fold strikes harder.
    const near = Math.hypot(a.x - this.hero.x, a.y - this.hero.y) <= QUIRKS.shepherd.r;
    const fold = (this.alted('passingbell') && near ? ALT.passingbell.harder : 1) * (this.quirk === 'shepherd' && near ? QUIRKS.shepherd.harder : 1);
    const by = fold * (1 + (Math.max(-80, this.stats.damage) * BAND.share) / 100) * (1 + BAND.bond * a.bond) * this.bandDmg * (this.has('whistle') ? RELIC.whistle.harder : 1);
    return Math.max(1, Math.round((a.def.dmg + a.def.grow * this.level) * by * this.bandShare));
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
      if (a.state !== 'dash') this.giveRoom(a);
      if (a.def.quirk === 'rally' && Math.hypot(a.x - h.x, a.y - h.y) < ALLY_QUIRKS.rally.r) this.rally = ALLY_QUIRKS.rally.faster + ALLY_QUIRKS.rally.bond * a.bond;
    }
  }

  /** A companion that has come to stand where the hero does steps out to the edge of the room kept round them (BAND.room). */
  private giveRoom(a: Ally): void {
    const h = this.hero;
    const [rx, ry] = BAND.room;
    let dx = (a.x - h.x) / rx;
    let dy = (a.y - h.y) / ry;
    const d = Math.hypot(dx, dy);
    if (d >= 1) return;
    // Right on top of them: out behind them.
    if (d < 0.01) dx = -h.face;
    // It is put out at the room's edge, and a little round it: one that is on its way to something on the far side
    // goes round the hero, where a push straight back would hold it at the edge for good.
    if (Math.abs(dy) < 0.6) dy += dy < 0 ? -0.35 : 0.35;
    const n = Math.hypot(dx, dy);
    dx /= n;
    dy /= n;
    a.x = h.x + dx * rx;
    a.y = h.y + dy * ry;
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
      case 'mend': {
        // Nettle stays by the hero, heals them now and then, and pokes at what comes close.
        const q = ALLY_QUIRKS.mend;
        this.heel(a, dt);
        a.trail -= dt;
        if (a.trail <= 0 && Math.hypot(a.x - h.x, a.y - h.y) < 260) {
          a.trail = q.every;
          const heal = Math.max(1, Math.round((q.heals + q.grow * this.level) * (1 + BAND.bond * a.bond)));
          if (h.hp < h.maxHp) {
            this.mend(heal);
            this.events.push({ t: 'allyQuirk', id: a.id, quirk: 'tonic', x: h.x, y: h.y });
          }
          for (const o of this.band) if (o !== a && o.down <= 0 && o.maxHp > 0) o.hp = Math.min(o.maxHp, o.hp + heal);
        }
        // The tonic: once a wave, when the hero is nearly down.
        const t = ALLY_QUIRKS.tonic;
        if (!this.tonicked && h.hp > 0 && h.hp / h.maxHp < t.under) {
          this.tonicked = true;
          this.mend(Math.max(1, Math.round(h.maxHp * (t.heals + t.bond * a.bond))));
          this.events.push({ t: 'allyQuirk', id: a.id, quirk: 'tonic', x: h.x, y: h.y });
        }
        if (a.cool > 0) break;
        const f = this.nearest(def.reach + def.r, [], a.x, a.y);
        if (f) {
          strike(f);
          this.allyHit(a, f, Math.cos(a.angle), Math.sin(a.angle));
        }
        break;
      }
      case 'chill': {
        // Rime walks by the hero: enemies near it are slowed, and now and then frozen.
        const q = ALLY_QUIRKS.snap;
        this.heel(a, dt);
        for (const f of this.foes) {
          if (f.dead || f.def.prop || Math.hypot(f.x - a.x, f.y - a.y) > q.r + f.def.r) continue;
          f.slow = Math.max(f.slow, 0.3);
          f.slowBy = Math.max(f.slowBy, q.slow);
        }
        if (a.quirkCool <= 0 && this.nearest(q.r, [], a.x, a.y)) {
          a.quirkCool = q.every - q.bond * a.bond;
          for (const f of this.foes) if (!f.dead && !f.def.prop && f.numb <= 0 && Math.hypot(f.x - a.x, f.y - a.y) <= q.r + f.def.r) this.freeze(f, q.freeze);
          this.events.push({ t: 'allyQuirk', id: a.id, quirk: 'snap', x: a.x, y: a.y });
          this.events.push({ t: 'ring', x: a.x, y: a.y, r: q.r, seconds: 0.3, kind: 'frost' });
        }
        if (a.cool > 0) break;
        const f = this.nearest(def.reach + def.r, [], a.x, a.y);
        if (f) {
          strike(f);
          this.allyHit(a, f, Math.cos(a.angle), Math.sin(a.angle));
        }
        break;
      }
      case 'ward': {
        // Clank stands by the hero, punches what comes close, and keeps a ward up on them.
        const q = ALLY_QUIRKS.aegis;
        this.heel(a, dt);
        if (!this.warded && a.quirkCool <= 0) {
          a.quirkCool = q.every - q.bond * a.bond;
          this.warded = true;
          this.events.push({ t: 'allyQuirk', id: a.id, quirk: 'aegis', x: h.x, y: h.y });
        }
        if (a.cool > 0) break;
        const f = this.nearest(def.reach + def.r, [], a.x, a.y);
        if (f) {
          strike(f);
          this.allyHit(a, f, Math.cos(a.angle), Math.sin(a.angle));
        }
        break;
      }
      case 'shell': {
        // Boom stays well behind the hero and lobs a shell where they are thickest. The ground is marked first.
        const q = ALLY_QUIRKS.powder;
        this.allyGo(a, h.x - h.face * 110, h.y + 30, Math.max(def.speed, HERO_SPEED * 1.1), dt, 14);
        if (a.cool > 0) break;
        const f = this.thickest(h.x, h.y, def.reach);
        if (!f) break;
        strike(f);
        this.fall(f.x, f.y, q.r, q.warn, this.allyHarm(a), q.stun + q.bond * a.bond, 'powder');
        this.events.push({ t: 'allyQuirk', id: a.id, quirk: 'powder', x: f.x, y: f.y });
        break;
      }
      case 'swarm': {
        // Hive keeps off a little and sends bees: a poison cloud where they are thickest. Now and then a heart.
        const q = ALLY_QUIRKS.honey;
        this.heel(a, dt);
        if (a.quirkCool <= 0) {
          a.quirkCool = q.every - q.bond * a.bond;
          if (this.gathering < 0) {
            this.drop('heart', h.x + this.rng.range(-50, 50), h.y + this.rng.range(30, 60), 1);
            this.events.push({ t: 'allyQuirk', id: a.id, quirk: 'honey', x: h.x, y: h.y });
          }
        }
        if (a.cool > 0) break;
        const f = this.thickest(a.x, a.y, def.reach);
        if (!f) break;
        strike(f);
        this.zones.push({ id: this.ids++, x: f.x, y: f.y, r: q.r, by: Math.max(1, this.allyHarm(a) * q.harm), life: q.seconds, tick: 0, kind: 'cloud', mend: 0 });
        break;
      }
      case 'grab': {
        // Snap holds the toughest enemy near the hero still and pinches it.
        const held = a.state === 'hold' ? this.foes.find((x) => x.id === a.target && !x.dead) : undefined;
        if (held) {
          a.left -= dt;
          held.stun = Math.max(held.stun, 0.1);
          this.allyGo(a, held.x - held.def.r - def.r, held.y, def.speed, dt, 2);
          if (a.cool <= 0) {
            strike(held);
            this.allyHit(a, held, 0, 0);
          }
          if (a.left <= 0 || held.dead) {
            a.state = 'with';
            a.quirkCool = 1.5;
          }
          break;
        }
        a.state = 'with';
        let best: Foe | null = null;
        for (const f of this.foes) {
          if (f.dead || f.boss || f.def.prop || Math.hypot(f.x - h.x, f.y - h.y) > BAND.leash) continue;
          if (!best || f.hp > best.hp) best = f;
        }
        if (!best || a.quirkCool > 0) {
          this.heel(a, dt);
          break;
        }
        if (this.allyGo(a, best.x, best.y, def.speed, dt, def.r + best.def.r) <= def.r + best.def.r + def.reach) {
          a.state = 'hold';
          a.target = best.id;
          a.left = ALLY_QUIRKS.hardshell.hold;
        }
        break;
      }
      case 'hunt': {
        // Smoke runs down the weakest enemy in reach, and finishes one that is nearly dead.
        let best: Foe | null = null;
        for (const f of this.foes) {
          if (f.dead || f.def.prop || Math.hypot(f.x - h.x, f.y - h.y) > BAND.leash + 120) continue;
          if (!best || f.hp < best.hp) best = f;
        }
        if (!best) {
          this.heel(a, dt);
          break;
        }
        if (this.allyGo(a, best.x, best.y, def.speed, dt, def.r + best.def.r + def.reach - 4) <= def.r + best.def.r + def.reach && a.cool <= 0) {
          strike(best);
          const q = ALLY_QUIRKS.cull;
          if (!best.boss && best.hp / best.maxHp < q.under + q.bond * a.bond) {
            this.events.push({ t: 'allyQuirk', id: a.id, quirk: 'cull', x: best.x, y: best.y });
            this.wound(best, best.hp, true, false);
          } else this.allyHit(a, best, Math.cos(a.angle), Math.sin(a.angle));
        }
        break;
      }
      case 'burrow': {
        // Gilt digs under the nearest enemy and bursts up: everyone round it is thrown and stunned, and a coin may come up.
        const q = ALLY_QUIRKS.treasure;
        this.heel(a, dt);
        if (a.cool > 0) break;
        const f = this.nearest(BAND.leash, [], a.x, a.y);
        if (!f) break;
        strike(f);
        a.x = f.x - def.r;
        a.y = f.y + 4;
        for (const o of this.foes) {
          const d = Math.hypot(o.x - f.x, o.y - f.y);
          if (o.dead || o.def.prop || d > def.reach + o.def.r) continue;
          o.stun = Math.max(o.stun, q.stun * (o.boss ? MOVE.bossShare : 1));
          this.allyHit(a, o, (o.x - f.x) / (d || 1), (o.y - f.y) / (d || 1));
        }
        this.events.push({ t: 'burst', x: f.x, y: f.y, r: def.reach, kind: 'slam' });
        if (this.rng.chance(q.chance + q.bond * a.bond)) {
          this.drop('coin', f.x, f.y, Math.max(1, Math.round(1 + q.each * this.wave.n)));
          this.events.push({ t: 'allyQuirk', id: a.id, quirk: 'treasure', x: f.x, y: f.y });
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
    // The open grave: for as long as it is open, double.
    if (h.open > 0) by *= byId(MOVES, 'opengrave').harm;
    if (this.tithe) by *= 1 + RELIC.tithe.more;
    const near = this.has('packbanner') ? RELIC.packbanner.r : RELIC.wolfskin.r;
    if (this.has('wolfskin') && this.band.some((a) => a.down <= 0 && Math.hypot(a.x - h.x, a.y - h.y) < near)) by *= 1 + RELIC.wolfskin.more;
    if (this.perks.has('flock')) by *= 1 + PERK.flock.each * this.band.filter((a) => a.down <= 0).length;
    return by;
  }

  /** How much more the hero's blows do for their quirk. */
  private edge(): number {
    switch (this.quirk) {
      case 'unseen':
        return 1 + this.quiet;
      case 'double':
        return 1 + Math.min(QUIRKS.double.most, Math.floor(this.held / QUIRKS.double.coins) / 100);
      case 'gravedebt':
        return this.indebted ? 1 + QUIRKS.gravedebt.more : 1;
      default:
        return 1;
    }
  }

  /** What one blow of a weapon does, rolled. `lucky` false leaves the dice alone: no blow that hits harder. */
  private roll(slot: Slot, lucky = true): { amount: number; crit: boolean } {
    const def = slot.def;
    const s = this.stats;
    const base = def.dmg[slot.tier] + (def.scale.might ?? 0) * s.might + (def.scale.aim ?? 0) * s.aim + (def.scale.lore ?? 0) * s.lore;
    // The Whetstone of Ages is on everything the hero carries.
    let amount = Math.max(1, Math.round(base * Math.max(0.1, 1 + s.damage / 100) * this.edge() * this.boon() * this.whet));
    // Out of the dark every blow finds the gap, and so does Fenn's next after a coin, once his knife has learned to.
    const sure = this.hero.sure > 0 || (slot.own && this.lucky > 0) || (lucky && this.sureHits > 0);
    if (lucky && this.sureHits > 0) this.sureHits--;
    const crit = lucky && (sure || this.rng.chance(Math.max(0, def.crit + s.crit) / 100));
    if (lucky && slot.own) this.lucky = 0;
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
      // A fifth form that echoes: every so-many-th strike is struck again at once.
      const form = slot.tier === FIFTH && !slot.own ? fifthOf(def.id) : null;
      if (form?.fx.kind === 'echo' && this.due(`v:${def.id}:${i}`, form.fx.every)) {
        this.fire(i, slot, target.dead ? (this.nearest(range) ?? target) : target, 0.15);
        this.events.push({ t: 'form', id: def.id, x: this.hero.x, y: this.hero.y });
      }
      if (def.kind === 'magic') {
        this.casts++;
        // The gift of the arcane: every so-many-th spell is not waited for.
        if (this.gifts.free > 0 && this.casts % this.gifts.free === 0) slot.cool = Math.min(slot.cool, 0.12);
      }
      // Orrin's staff, once it has learned to: every third bolt is cast twice.
      // By its second way, every fifth is one great bolt.
      if (slot.own && this.alted('unfinished')) {
        this.spells++;
        if (this.spells % ALT.unfinished.every === ALT.unfinished.every - 1) this.surge = ALT.unfinished.times;
      }
      if (slot.own && this.ruled('unfinished', 1)) {
        this.spells++;
        if (this.spells % OWN.unfinished.every === 0) {
          this.fire(i, slot, target, 0.2);
          this.events.push({ t: 'quirk', on: true });
        }
      }
      // The Echo Bell: every fourth blow of the hero's own weapon lands twice.
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
    const owned = this.slots[0]?.own ? 1 : 0;
    const place = slotPlace(Math.max(0, i - owned), n - owned);
    // The hero turns to what their own weapon strikes at, unless they are being steered: it is the way Bram's shield faces.
    if (slot.own && !h.moving) h.face = target.x >= h.x ? 1 : -1;
    switch (def.motion) {
      case 'thrust': {
        // Isaura's lance, couched: one great thrust, and the count begins again.
        const tilted = slot.own && this.couched;
        const great = tilted && this.ruled('ninth', 3);
        // By its second way nothing can hurt her for a moment after a couched thrust.
        if (tilted && this.alted('ninth')) h.grace = Math.max(h.grace, ALT.ninth.grace);
        const times = tilted ? (great ? OWN.ninth.times : QUIRKS.tilt.times) : 1;
        const far = range * (great ? OWN.ninth.reach : 1);
        // Everyone in a line from the hero, nearest first, as many as it goes through.
        const most = (def.pierce ?? 1) + this.gifts.thrust;
        const line = (ax: number, ay: number): Foe[] =>
          this.foes
            .filter((f) => {
              if (f.dead) return false;
              const along = (f.x - h.x) * ax + (f.y - h.y) * ay;
              const off = Math.abs((f.x - h.x) * -ay + (f.y - h.y) * ax);
              return along > -f.def.r && along < far + f.def.r && off < 20 + f.def.r;
            })
            .sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))
            .slice(0, most);
        const inLine = line(ux, uy);
        // Fenn's knife, once it has learned to, strikes behind him as well.
        if (slot.own && this.ruled('headstails', 3)) for (const f of line(-ux, -uy)) if (!inLine.includes(f)) inLine.push(f);
        let felled = false;
        for (const f of inLine) {
          this.blow(f, slot, h.x, h.y, times);
          if (f.dead) {
            felled = true;
            if (tilted) {
              this.count('tilt');
              // For the Ninth: a kill with a Tilt thrust quickens her.
              if (this.perks.has('ninth')) {
                this.ninthLeft = PERK.ninth.seconds;
                this.events.push({ t: 'perk', perk: 'ninth', x: h.x, y: h.y });
              }
            }
          }
          else if (tilted && this.ruled('ninth', 1)) {
            const d = Math.hypot(f.x - h.x, f.y - h.y) || 1;
            this.shove(f, (f.x - h.x) / d, (f.y - h.y) / d, OWN.ninth.knock);
            f.stun = Math.max(f.stun, OWN.ninth.stun * (f.boss ? MOVE.bossShare : 1));
          }
        }
        if (tilted) h.ran = 0;
        // A kill gives the lance back at once, once it has learned to.
        if (felled && slot.own && this.ruled('ninth', 2)) slot.cool = Math.min(slot.cool, OWN.ninth.again);
        // A venomed blade leaves its cloud where the first it cut stood.
        if (def.cloud && inLine.length > 0) this.cloud(inLine[0].x, inLine[0].y, def.burst ?? 34, def.cloud[slot.tier]);
        this.events.push({ t: 'strike', slot: i, angle, x: h.x + ux * far, y: h.y + uy * far, range: far, great: tilted });
        break;
      }
      case 'sweep': {
        // All the way round, once their weapons have learned to: Bram's first sweep from behind a shield just set, and Hroth's while he is in debt.
        const first = slot.own && this.fresh && this.shielded && this.ruled('gatekeeper', 2);
        const debt = slot.own && this.indebted;
        const round = first || (debt && this.ruled('gravecleaver', 1));
        const graves: Array<{ x: number; y: number }> = [];
        const half = round ? Math.PI : (((def.arc ?? 90) / 2) * Math.PI) / 180;
        for (const f of this.foes) {
          if (f.dead) continue;
          const d = Math.hypot(f.x - h.x, f.y - h.y);
          if (d > range + f.def.r) continue;
          let off = Math.atan2(f.y - h.y, f.x - h.x) - angle;
          while (off > Math.PI) off -= TAU;
          while (off < -Math.PI) off += TAU;
          // Whoever is right on top of the hero is in the sweep whichever way it goes.
          if (Math.abs(off) > half && d >= f.def.r + 20) continue;
          this.blow(f, slot, h.x, h.y);
          if (first && !f.dead) f.stun = Math.max(f.stun, OWN.gatekeeper.roundStun * (f.boss ? MOVE.bossShare : 1));
          // What Hroth's axe fells in debt bursts where it drops, once it has learned to.
          if (f.dead && debt && this.ruled('gravecleaver', 2)) graves.push({ x: f.x, y: f.y });
        }
        if (slot.own) this.fresh = false;
        for (const g of graves) this.blast(g.x, g.y, OWN.gravecleaver.r, this.ownBlow(OWN.gravecleaver.harm), 0, 'rise', 12);
        this.events.push({ t: 'strike', slot: i, angle, x: h.x + ux * range, y: h.y + uy * range, range, great: round });
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
          // Once it has learned to, her ground stays holy twice as long.
          const life = q.seconds * (this.ruled('morningstar', 1) ? OWN.morningstar.longer : 1);
          // By its second way it is wider.
          const wide = (r + 14) * (this.alted('morningstar') ? ALT.morningstar.wider : 1);
          this.zones.push({ id: this.ids++, x: target.x, y: target.y, r: wide, by: Math.max(1, harm * q.harm), life, tick: 0.5, kind: 'holy', mend: q.mends });
        }
        break;
      }
      case 'pulse': {
        const r = (def.burst ?? 110) * this.gifts.burst;
        for (const f of this.foes) {
          if (!f.dead && Math.hypot(f.x - h.x, f.y - h.y) <= r + f.def.r) this.blow(f, slot, h.x, h.y);
        }
        this.mend(def.mends?.[slot.tier] ?? 1);
        if (slot.own && this.ruled('passingbell', 1)) {
          // Each ring takes seconds off a fallen companion's rest.
          for (const a of this.band) {
            if (a.down <= 0) continue;
            a.down -= OWN.passingbell.wakes;
            if (a.down <= 0) this.getUp(a);
          }
        }
        if (slot.own && this.ruled('passingbell', 3)) {
          // And every companion in the fold strikes at once.
          for (const a of this.band) if (a.down <= 0 && Math.hypot(a.x - h.x, a.y - h.y) <= QUIRKS.shepherd.r) a.cool = 0;
        }
        this.events.push({ t: 'strike', slot: i, angle, x: h.x, y: h.y, range: r });
        this.events.push({ t: 'burst', x: h.x, y: h.y, r, kind: 'light' });
        break;
      }
      default: {
        const rolled = this.roll(slot);
        const crit = rolled.crit;
        // Orrin's great bolt, by his staff's second way.
        const amount = slot.own && this.surge > 1 ? Math.round(rolled.amount * this.surge) : rolled.amount;
        if (slot.own && this.surge > 1) {
          this.surge = 1;
          this.events.push({ t: 'quirk', on: true });
        }
        const speed = def.flies ?? 500;
        // The hero's own weapon is in their hand; the rest float beside them.
        // What their own weapon looses leaves from the side the mark is on: their figure turns to it.
        const x0 = h.x + (slot.own ? (target.x >= h.x ? 16 : -16) : place.x);
        const y0 = h.y + (slot.own ? -26 : place.y);
        const a = Math.atan2(target.y - 14 - y0, target.x - x0) + twist;
        const lobbed = def.motion === 'lob';
        const far = Math.hypot(target.x - x0, target.y - y0);
        const s: Shot = {
          id: this.ids++, mine: true, x: x0, y: y0, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 9, dmg: amount, crit,
          // The gift of thrown things: what is thrown straight skips on.
          // Wren's arrows at full Unseen, and the Widow's Tear, go through everyone once they have learned to.
          pierce: slot.own && ((this.hidden && this.ruled('whisper', 2)) || this.ruled('widowstear', 1)) ? 99 : (def.pierce ?? 0), leaps: (def.leaps ?? 0) + (def.motion === 'shoot' && def.kinds.includes('thrown') ? this.gifts.leaps : 0) + (slot.own && this.hidden && this.alted('whisper') ? ALT.whisper.leaps : 0),
          life: lobbed ? 2 : (range * 1.35) / speed, art: def.shot ?? 'arrow', knock: def.knock, seen: [], from: def, tier: slot.tier, mark: def.motion === 'cast' ? target.id : 0,
          lob: lobbed ? { x0, y0, x1: target.x, y1: target.y, of: Math.max(0.35, Math.min(0.9, far / speed)), at: 0 } : null, chills: 0, by: '', burns: 0,
          split: false, src: 0,
        };
        this.shots.push(s);
        this.events.push({ t: 'loose', slot: i, angle: a, shot: s.id });
      }
    }
  }

  /** Counts one more for a rule, and says if it is that rule's turn: every `every`-th, or every one. */
  private due(key: string, every = 1): boolean {
    const n = (this.fxCount.get(key) ?? 0) + 1;
    this.fxCount.set(key, n);
    return n % Math.max(1, every) === 0;
  }

  /** What a landed blow carries besides its harm: its weapon's fifth form's rule, and every ware's. */
  private carry(f: Foe, amount: number, def: WeaponDef, tier: number): void {
    if (tier === FIFTH && !def.own) {
      const form = fifthOf(def.id);
      if (form && form.fx.kind !== 'echo') this.goOff(`v:${def.id}`, def.id, form.fx, f, amount);
    }
    for (const w of this.wareFx) this.goOff(w.key, w.id, w.fx, f, amount);
  }

  /** One rule goes off on a blow that landed on `f` for `amount`. */
  private goOff(key: string, id: string, fx: Fx, f: Foe, amount: number): void {
    const said = (x: number, y: number, from?: { x: number; y: number }): void => {
      this.events.push({ t: 'form', id, x, y, ...(from ? { from } : {}) });
    };
    switch (fx.kind) {
      case 'burst':
        if (this.due(key, fx.every)) {
          this.blast(f.x, f.y, fx.r ?? 70, Math.max(1, Math.round(amount * (fx.share ?? 0.4))), 0, 'powder', 0);
          said(f.x, f.y);
        }
        break;
      case 'chain': {
        const next = this.nearest(fx.r ?? 110, [f.id], f.x, f.y);
        // What jumps lands as plain harm: it carries no rule of its own, so it never jumps again.
        if (next && this.due(key, fx.every)) {
          this.land(next, Math.max(1, Math.round(amount * (fx.share ?? 0.5))), false, f.x, f.y, 0, null, 0);
          said(next.x, next.y, { x: f.x, y: f.y });
        }
        break;
      }
      case 'stun':
        if (!f.dead && this.due(key, fx.every)) {
          f.stun = Math.max(f.stun, (fx.secs ?? 0.5) * (f.boss ? MOVE.bossShare : 1));
          said(f.x, f.y);
        }
        break;
      case 'slow':
        if (!f.dead) {
          f.slow = Math.max(f.slow, fx.secs ?? 1.5);
          f.slowBy = Math.max(f.slowBy, Math.min(0.85, fx.by ?? 0.2));
        }
        break;
      case 'burn':
        if (!f.dead) {
          f.burnBy = Math.max(f.burnBy, this.fireOf(fx.per ?? 4));
          f.burn = Math.max(f.burn, fx.secs ?? 2);
        }
        break;
      case 'mark':
        if (!f.dead) {
          f.marked = Math.max(f.marked, fx.secs ?? 3);
          f.markedBy = Math.max(f.markedBy, fx.by ?? 0.15);
        }
        break;
      case 'pull':
        if (this.due(key, fx.every)) {
          let pulled = false;
          for (const o of this.foes) {
            if (o === f || o.dead) continue;
            const d = Math.hypot(o.x - f.x, o.y - f.y);
            if (d <= 0 || d > (fx.r ?? 100)) continue;
            this.shove(o, (f.x - o.x) / d, (f.y - o.y) / d, PULL);
            pulled = true;
          }
          if (pulled) said(f.x, f.y);
        }
        break;
      case 'mend':
        if (f.dead && this.time >= this.fxLeech) {
          this.fxLeech = this.time + LEECH_GAP;
          this.mend(fx.heal ?? 1);
        }
        break;
      case 'coin':
        if (f.dead && this.rng.chance(fx.chance ?? 0.1)) this.drop('coin', f.x, f.y, 1);
        break;
      case 'echo':
        break;
    }
  }

  /** A weapon's blow lands on a foe: rolled afresh for each one it lands on. Gives back what it did. */
  private blow(f: Foe, slot: Slot, fromX: number, fromY: number, times = 1): number {
    const { amount: rolled, crit } = this.roll(slot);
    const amount = Math.max(1, Math.round(rolled * times));
    this.land(f, amount, crit, fromX, fromY, slot.def.knock, slot.def, slot.tier);
    return amount;
  }

  /** Harm reaches a foe, with whatever the weapon leaves on them. */
  private land(f: Foe, amount: number, crit: boolean, fromX: number, fromY: number, knock: number, def: WeaponDef | null, tier: number): void {
    if (f.dead) return;
    // Long Shot: the farther the mark, the harder.
    if (def && this.perks.has('longshot')) amount = Math.round(amount * (1 + PERK.longshot.most * Math.min(1, Math.hypot(f.x - this.hero.x, f.y - this.hero.y) / PERK.longshot.full)));
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
      // Nan's staff, by its second way, burns hotter.
      const fire = this.fireOf(def.burn[tier]) * this.gifts.burnBy * (def.id === 'hearthbrand' && this.alted('hearthbrand') ? ALT.hearthbrand.hotter : 1);
      // Nan: one who burns already, lit again by her own staff, burns hotter, up to so many times the staff's fire.
      const again = this.quirk === 'banked' && def.own && f.burn > 0;
      const most = fire * QUIRKS.banked.most;
      const was = f.burnBy;
      f.burnBy = again ? Math.max(f.burnBy, Math.min(most, Math.max(f.burnBy, fire) + fire * QUIRKS.banked.hotter)) : Math.max(f.burnBy, fire);
      // One banked as high as her fire goes: counted once, when it gets there.
      if (again && was < most && f.burnBy >= most) this.count('banked');
      f.burn = Math.max(f.burn, 3 + this.gifts.burnMore);
    }
    // A bolt that stuns: Orrin's staff finished as something blunt.
    if (def?.stun && def.motion === 'cast') f.stun = Math.max(f.stun, def.stun * (f.boss ? MOVE.bossShare : 1));
    // Whisper, once it has learned to, pins one it finds unhurt.
    if (def?.id === 'whisper' && f.hp >= f.maxHp && this.ruled('whisper', 1)) f.stun = Math.max(f.stun, OWN.whisper.pin * (f.boss ? MOVE.bossShare : 1));
    const d = Math.hypot(f.x - fromX, f.y - fromY) || 1;
    this.shove(f, (f.x - fromX) / d, (f.y - fromY) / d, knock * (def ? this.gifts.knock : 1));
    // Fenn: a blow may knock a coin loose, and a critical one does, once his knife has learned to, though not more often than so.
    if (this.quirk === 'double' && def?.own) {
      if (this.rng.chance(QUIRKS.double.chance)) this.drop('coin', f.x, f.y, 1);
      else if (crit && this.coinAt <= 0 && this.ruled('headstails', 1)) {
        this.coinAt = OWN.headstails.gap;
        this.drop('coin', f.x, f.y, 1);
      } else if (crit && this.coinAt <= 0 && this.alted('headstails')) {
        // By its second way a critical blow gives him health back, no more often than a coin would fall.
        this.coinAt = ALT.headstails.gap;
        this.mend(ALT.headstails.heals);
      }
    }
    if (f.boss && def) this.fill(MOVE.bossBlow);
    const debt = this.indebted;
    this.wound(f, amount, crit, false);
    // A fifth form's rule, and the small rules of the wares held, go off as the blow lands.
    if (def) this.carry(f, amount, def, tier);
    if (f.dead && def?.own) {
      // Hroth in debt: what his axe fells gives health back, though a sweep through a crowd is one mouthful and not ten.
      if (debt && this.time >= this.leechAt) {
        this.leechAt = this.time + LEECH_GAP;
        this.mend(QUIRKS.gravedebt.mends);
      }
      if (debt && this.quirk === 'gravedebt') this.count('debt');
      // Hungry Axe: a kill of his axe feeds him a little, and a sweep through a crowd is one mouthful, as in debt.
      else if (this.perks.has('hungry') && this.time >= this.leechAt) {
        this.leechAt = this.time + LEECH_GAP;
        this.mend(PERK.hungry.heals);
      }
      // Whisper, once it has learned to: a kill at full Unseen looses the next arrow at once.
      const own = this.own;
      if (own && def.id === 'whisper' && this.hidden && this.ruled('whisper', 3)) own.cool = Math.min(own.cool, OWN.whisper.again);
    }
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
    // The Forge: every enemy is armored.
    if (this.omen === 'forge' && !f.def.prop) by *= ROAD.forge.lets;
    // One near a warder takes less from a blow.
    if (!soft && this.wards.length > 0 && this.wards.some((w) => w !== f && !w.dead && Math.hypot(w.x - f.x, w.y - f.y) <= (w.def.wide ?? 220))) by *= FOE_WARD;
    by = Math.max(1, Math.round(by));
    f.hp -= by;
    this.events.push({ t: 'hit', id: f.id, x: f.x, y: f.y, amount: by, crit, soft });
    if (f.hp > 0) return;
    // The dead that get up: once, after a moment down. The Restless road raises every enemy so.
    if (!f.boss && !f.def.prop && !f.second && !f.champion && (f.def.undying || this.omen === 'restless')) {
      f.second = true;
      f.hp = Math.max(1, Math.round(f.maxHp * UNDYING.rises));
      f.stun = Math.max(f.stun, UNDYING.down);
      this.events.push({ t: 'second', id: f.id, x: f.x, y: f.y });
      return;
    }
    if (f.boss && this.vows.has('wind') && !f.second) {
      // Second Wind: a captain that falls gets up once. It is down for a moment first, so the player sees it coming.
      f.second = true;
      f.hp = Math.max(1, Math.round(f.maxHp * VOW.wind));
      f.stun = Math.max(f.stun, VOW.windStun);
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
    // A slime breaks into two smaller.
    if (f.def.splits) for (let i = 0; i < 2; i++) this.mark(byId(ENEMIES, f.def.splits), f.x + (i ? 20 : -20), f.y, false);
    this.fill(1 / (MOVE.kills + MOVE.more * (this.wave.n - 1)));
    if (f.id === this.heraldId) {
      this.herald = true;
      this.events.push({ t: 'herald', x: f.x, y: f.y });
    }
    if (f.id === this.duelId) {
      this.dueled = true;
      this.events.push({ t: 'duel', id: f.id, how: 'won' });
    }
    // Maren's hammer, once it has learned to: what dies on holy ground gives her health back.
    if (this.ruled('morningstar', 3) && this.time >= this.leechAt && this.onHoly(f.x, f.y)) {
      this.leechAt = this.time + OWN.morningstar.gap;
      this.mend(1);
    }
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
    this.perkKill(f);
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
    if (this.has('emberheart') && this.kills % (this.has('forgeheart') ? RELIC.forgeheart.every : RELIC.emberheart.every) === 0) {
      const q = RELIC.emberheart;
      this.events.push({ t: 'relic', id: 'emberheart', x: f.x, y: f.y });
      for (const o of this.foes) {
        if (o.dead || Math.hypot(o.x - f.x, o.y - f.y) > q.r + o.def.r) continue;
        o.burn = Math.max(o.burn, 3 + this.gifts.burnMore);
        o.burnBy = Math.max(o.burnBy, q.burns);
      }
      this.blast(f.x, f.y, q.r, this.ownBlow(q.harm), 0, 'fire', 8);
    }
    // Nan's staff, once it has learned to: what dies burning near her bursts, and lights those round it.
    if (f.burnBy > 0 && this.ruled('hearthbrand', 2) && Math.hypot(f.x - this.hero.x, f.y - this.hero.y) <= QUIRKS.banked.r + f.def.r) {
      const q = OWN.hearthbrand;
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
      const second = this.alted('widowstear');
      this.events.push({ t: 'burst', x: f.x, y: f.y, r: q.r, kind: 'frost' });
      for (const o of this.foes) {
        if (o.dead || Math.hypot(o.x - f.x, o.y - f.y) > q.r + o.def.r) continue;
        o.slow = Math.max(o.slow, 2);
        o.slowBy = Math.max(o.slowBy, 0.4);
        this.wound(o, harm, false, true);
        // Her wand, by its second way: those near one that breaks are frozen for a moment, if they can be.
        if (!o.dead && second && o.numb <= 0) this.freeze(o, ALT.widowstear.freeze);
      }
      // Her wand, once it has learned to: what breaks leaves ice where it stood.
      if (this.ruled('widowstear', 2)) this.zones.push({ id: this.ids++, x: f.x, y: f.y, r: OWN.widowstear.r, by: 0, life: OWN.widowstear.seconds, tick: 0, kind: 'ice', mend: 0 });
    }
  }

  /** Fire on a foe burns twice a second. */
  private smolder(f: Foe, dt: number): void {
    // Nan: a fire near her does not burn down.
    const banked = this.quirk === 'banked' && Math.hypot(f.x - this.hero.x, f.y - this.hero.y) <= QUIRKS.banked.r + f.def.r;
    if (!banked) f.burn -= dt;
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
    // Bare Fields: the fallen leave no hearts.
    if (!this.vows.has('famine') && this.rng.chance(HEART.chance * lucky)) this.drop('heart', f.x, f.y, HEART.mends);
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
          if (this.shielded && (s.x - h.x) * h.face >= 0) {
            // Bram's set shield stops what comes from the side he faces, and once his sword has learned to, throws it back.
            const back = this.ruled('gatekeeper', 1);
            this.events.push({ t: 'block', x: s.x, y: s.y, back });
            // By its second way a shot stopped fills his fury.
            if (this.alted('gatekeeper')) this.fill(ALT.gatekeeper.fury);
            if (back) {
              born.push({
                ...s, id: this.ids++, mine: true, vx: -s.vx * 1.8, vy: -s.vy * 1.8, dmg: this.ownBlow(OWN.gatekeeper.back), life: 1.6, knock: 8, seen: [], from: null, tier: 0, mark: 0, chills: 0,
                by: '', split: true, src: 0,
              });
            }
          } else this.hurt(s.dmg, s.x - s.vx, s.y - s.vy, s.by, s.chills, this.foes.find((f) => f.id === s.src && !f.dead) ?? null);
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
        // Orrin's staff, once it has learned to: a bolt that fells its mark flies on to another.
        if (f.dead && s.from?.id === 'unfinished' && this.ruled('unfinished', 2)) s.leaps++;
        // The Twin Quiver: a shot splits in two when it first hits, and the halves fly on to either side. So does a bolt of Orrin's staff, at the last.
        const forked = s.from?.id === 'unfinished' && this.ruled('unfinished', 3);
        if (!s.split && ((s.from?.motion === 'shoot' && this.has('twinquiver')) || forked)) {
          s.split = true;
          const q = forked ? { spread: RELIC.twinquiver.spread, share: OWN.unfinished.half } : RELIC.twinquiver;
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
    // Nan's staff: its bursts are wider at the last, and before that the ground burns on where they were.
    const hearth = def.id === 'hearthbrand';
    const r = (def.burst ?? 60) * this.gifts.burst * (hearth && this.ruled('hearthbrand', 3) ? OWN.hearthbrand.wider : 1);
    if (hearth && def.burn && this.ruled('hearthbrand', 1)) {
      this.zones.push({ id: this.ids++, x, y, r, by: this.fireOf(def.burn[s.tier]), life: OWN.hearthbrand.ground, tick: 0.25, kind: 'fire', mend: 0 });
    }
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
      // Mud does no harm: the hero is slowed while they stand in it (moveHero).
      if (z.kind === 'mud') continue;
      if (z.kind === 'ice') {
        // Ice does no harm: whoever crosses it is slowed for as long as they are on it.
        for (const f of this.foes) {
          if (f.dead || Math.hypot(f.x - z.x, f.y - z.y) > z.r + f.def.r) continue;
          f.slow = Math.max(f.slow, 0.4);
          f.slowBy = Math.max(f.slowBy, OWN.widowstear.slow);
        }
        continue;
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
    // A coin that still lay on the ground when the wave ended is worth a share of itself. On a burning field every coin counts double.
    const value = Math.abs(p.value) * (p.kind === 'coin' ? (p.late ? LATE_COIN : 1) * this.goldBy : 1);
    if (p.kind === 'coin') {
      this.gold += value * Math.max(0.1, 1 + this.stats.bounty / 100);
      this.xp += value * this.xpBy;
      this.coins += value;
      // Fenn's knife, once it has learned to: a coin picked up makes his next blow a sure one.
      if (!p.late && this.ruled('headstails', 2)) this.lucky = 1;
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
    // A captain's wave ends when the captain falls, and a duel when the duelist does.
    const bossDown = (this.wave.boss !== undefined && this.felled.includes(this.wave.boss)) || this.dueled;
    if (this.time < this.wave.seconds && !bossDown) return;
    // The wave is over: whoever is left leaves the field, and what lies on it comes in. A coin nobody went for before
    // the time ran out is worth a share of itself. One who has felled a captain has the field, and loses nothing.
    if (!bossDown) for (const p of this.picks) if (p.kind === 'coin' && !p.pulled) p.late = true;
    // A first run's cage opens in any case: whoever is in it comes along.
    const cage = this.given ? this.foes.find((f) => f.def.ai === 'still' && !f.dead) : undefined;
    if (cage) this.free(cage);
    for (const f of this.foes) this.events.push({ t: 'fall', id: f.id, x: f.x, y: f.y, boss: f.boss, swept: true });
    this.foes = [];
    this.marks = [];
    this.shots = [];
    this.zones = [];
    this.risen = [];
    this.falls = [];
    this.walls = [];
    this.perils = [];
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
