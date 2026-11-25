// The heroes: who each is, the weapon that is theirs alone, the rule only
// they have (their quirk), and their one great deed (their move). The
// rules of a wave (world.ts) read the numbers here and know none of their
// own. A change here is measured with `npm run pace` before and after.

import type { Feat, WeaponDef } from './data';
import type { StatLine } from './stats';

/**
 * The rule only one hero has. What each does is in QUIRKS below, with its numbers.
 * Each is something a player does, and can do well or badly: a line of stats is no quirk.
 *
 * standfast (Bram): standing still sets his shield, which stops shots from in front.
 * unseen (Wren): harm grows while nothing strikes her.
 * unfinished (Orrin): his staff finishes itself as the last weapon he bought.
 * double (Fenn): once a camp he tosses for a ware, and coins held are harm.
 * banked (Nan): fire near her never goes out, and what she lights again burns hotter.
 * tilt (Isaura): riding straight couches her lance for one great thrust.
 * gravedebt (Hroth): near death he hits far harder and his axe feeds him; once in a land he gets up again.
 * shepherd (Aldous): one companion more, and what heals him heals those in his fold.
 * deepcold (Ysolde): the slowed, struck again, freeze; the frozen break.
 * consecrate (Maren): her hammer leaves holy ground.
 */
export type Quirk = 'standfast' | 'unseen' | 'unfinished' | 'double' | 'banked' | 'tilt' | 'gravedebt' | 'shepherd' | 'deepcold' | 'consecrate';

export type MoveId = 'gate' | 'oneshot' | 'starfall' | 'vanish' | 'wildfire' | 'charge' | 'opengrave' | 'toll' | 'whiteout' | 'judgment';

export interface HeroDef {
  id: string;
  /** The figure the kit draws for them. */
  unit: string;
  name: string;
  /** What they are called for short, where there is little room: on a card, on a button. */
  short: string;
  /** What they are called besides: "the Gatewarden". */
  epithet: string;
  /** Who they are, in a line. */
  who: string;
  /** A thing they say. */
  line: string;
  /** Their own weapon: one of SIGNATURES, which nobody else can have. */
  weapon: string;
  stats: StatLine;
  quirk: Quirk;
  /** What the quirk is called, and what it does in a line a player reads. */
  quirkName: string;
  says: string;
  move: MoveId;
  /** What opens them, or null for one who is there from the start. */
  unlock: Feat | null;
}

export const HEROES: readonly HeroDef[] = [
  {
    id: 'bram', unit: 'bram', name: 'Bram Oakenhold', short: 'Bram', epithet: 'the Gatewarden', who: 'The last man on a gate that fell. He does not step back.', line: 'The gate is wherever I stand.',
    weapon: 'gatekeeper', stats: { maxHp: 8, armor: 1, speed: -5 }, quirk: 'standfast', quirkName: 'Stand Fast',
    says: 'Standing still he sets his shield: blows do far less, shots from in front stop on it, and his sword is faster. A step drops it.', move: 'gate', unlock: null,
  },
  {
    id: 'wren', unit: 'wren', name: 'Wren Fallowmere', short: 'Wren', epithet: 'the Quiet Arrow', who: 'A poacher the king could never catch.', line: 'You will not hear the one that matters.',
    weapon: 'whisper', stats: { aim: 2, reach: 30, maxHp: -3 }, quirk: 'unseen', quirkName: 'Unseen',
    says: 'Every second since she was last struck she hits harder. One blow takes it all away.', move: 'oneshot', unlock: null,
  },
  {
    id: 'orrin', unit: 'orrin', name: 'Orrin Quillon', short: 'Orrin', epithet: 'the Unfinished', who: 'A magister thrown out before his last lesson.', line: 'I never did learn how it ends.',
    weapon: 'unfinished', stats: { lore: 3, maxHp: -2, might: -2 }, quirk: 'unfinished', quirkName: 'Unfinished',
    says: 'His staff finishes itself as the last weapon he bought: it takes its kinds and what it does. He picks from one more choice at each level.', move: 'starfall', unlock: { kind: 'wave', wave: 5 },
  },
  {
    id: 'fenn', unit: 'fenn', name: 'Fenn Two-Coins', short: 'Fenn', epithet: 'the Lucky', who: 'A thief who has never lost a toss.', line: 'Heads I win. Tails, look behind you.',
    weapon: 'headstails', stats: { speed: 12, bounty: 10, dodge: 8, maxHp: -2 }, quirk: 'double', quirkName: 'Double or Nothing',
    says: 'Once in a camp he may toss for a ware: heads it is free, tails it is paid for and gone. The more coins he holds the harder he hits.', move: 'vanish', unlock: { kind: 'coins', coins: 200 },
  },
  {
    id: 'nan', unit: 'nan', name: 'Old Nan Cinderwick', short: 'Old Nan', epithet: 'the Hearthwitch', who: 'She kept one fire lit for sixty years.', line: 'Come in out of the cold, dears.',
    weapon: 'hearthbrand', stats: { lore: 2, crit: 5 }, quirk: 'banked', quirkName: 'Banked Fire',
    says: 'Fire never goes out on those near her, and one she lights again burns hotter. She has to stay close.', move: 'wildfire', unlock: { kind: 'boss', boss: 'warlord' },
  },
  {
    id: 'isaura', unit: 'isaura', name: 'Isaura Vane', short: 'Isaura', epithet: 'Captain of the Ninth', who: 'The Ninth Lance is gone. She rides on without it.', line: 'The Ninth does not halt.',
    weapon: 'ninth', stats: { might: 2, speed: 8 }, quirk: 'tilt', quirkName: 'Tilt',
    says: 'Riding straight couches her lance: the next thrust lands far harder. A sharp turn or a halt loses it. Her lance goes through everyone in its line.', move: 'charge', unlock: { kind: 'kills', kills: 600 },
  },
  {
    id: 'hroth', unit: 'hroth', name: 'Hroth', short: 'Hroth', epithet: 'the Unburied', who: 'They buried him twice.', line: 'Dig deeper next time.',
    weapon: 'gravecleaver', stats: { might: 2, armor: -2 }, quirk: 'gravedebt', quirkName: 'Grave Debt',
    says: "Under a third of his health he hits far harder and his axe's kills give health back. Once in a land he gets up from a killing blow. He does not mend by himself.", move: 'opengrave', unlock: { kind: 'wave', wave: 10 },
  },
  {
    id: 'aldous', unit: 'aldous', name: 'Brother Aldous Bell', short: 'Aldous', epithet: 'the Shepherd', who: 'He rings the dead home, and now the living.', line: 'Stay close. I will count you all at dusk.',
    weapon: 'passingbell', stats: { regen: 6, maxHp: 4, damage: -20 }, quirk: 'shepherd', quirkName: 'Shepherd',
    says: 'He brings one companion more. What heals him heals those in his fold, and they strike faster there. He himself hits softly.', move: 'toll', unlock: { kind: 'wave', wave: 12 },
  },
  {
    id: 'ysolde', unit: 'ysolde', name: 'Ysolde Rimeheart', short: 'Ysolde', epithet: 'the Winter Widow', who: 'The cold took her husband. She took the cold.', line: 'It only hurts until it does not.',
    weapon: 'widowstear', stats: { lore: 2, reach: 20, speed: -4 }, quirk: 'deepcold', quirkName: 'Deep Cold',
    says: 'The slowed, struck again, freeze solid. The frozen take far more and break into shards.', move: 'whiteout', unlock: { kind: 'boss', boss: 'colossus' },
  },
  {
    id: 'maren', unit: 'maren', name: 'Maren Dawnguard', short: 'Maren', epithet: 'the Oathkeeper', who: 'She swore to see the morning.', line: 'Hold until the light. Then hold some more.',
    weapon: 'morningstar', stats: { maxHp: 6, armor: 1, might: 1, haste: -10 }, quirk: 'consecrate', quirkName: 'Consecrate',
    says: 'Her hammer leaves holy ground that mends the band and burns enemies.', move: 'judgment', unlock: { kind: 'wave', wave: 20 },
  },
];

/** The ids heroes had before they had names, for a save from then. */
export const OLD_HEROES: Readonly<Record<string, string>> = {
  knight: 'bram', archer: 'wren', mage: 'orrin', cutpurse: 'fenn', pyromancer: 'nan', lancer: 'isaura', berserker: 'hroth', cleric: 'aldous', frostwitch: 'ysolde', paladin: 'maren',
};

// ---------------------------------------------------------------- their own weapons

/**
 * The weapon each hero has and nobody else can: it takes no hand, is never
 * for sale and can't be sold or joined. It is a weapon like the others in
 * every other way. `icon` is the plain weapon whose picture it is drawn
 * with until it has one of its own.
 */
export const SIGNATURES: readonly WeaponDef[] = [
  { id: 'gatekeeper', name: 'Gatekeeper', own: true, icon: 'sword', kinds: ['blade'], kind: 'melee', motion: 'sweep', dmg: [9, 14, 22, 34], scale: { might: 1 }, every: [1, 0.93, 0.86, 0.78], range: 96, crit: 5, critBy: 2, knock: 18, arc: 100, price: 0, says: 'Sword and shield: a wide sweep in front of him.' },
  { id: 'whisper', name: 'Whisper', own: true, icon: 'bow', kinds: ['bow'], kind: 'ranged', motion: 'shoot', dmg: [8, 13, 19, 29], scale: { aim: 1 }, every: [1.12, 1.04, 0.96, 0.88], range: 410, crit: 8, critBy: 2, knock: 6, pierce: 1, flies: 680, shot: 'arrow', price: 0, says: 'A longbow: an arrow through two.' },
  { id: 'unfinished', name: 'The Unfinished Staff', own: true, icon: 'staff', kinds: ['arcane'], kind: 'magic', motion: 'cast', dmg: [11, 17, 26, 39], scale: { lore: 1 }, every: [1.1, 1.02, 0.94, 0.85], range: 390, crit: 5, critBy: 2, knock: 5, pierce: 1, flies: 430, shot: 'orb-arcane', price: 0, says: 'A bolt that bends to its mark, and on through it.' },
  { id: 'headstails', name: 'Heads and Tails', own: true, icon: 'dagger', kinds: ['blade'], kind: 'melee', motion: 'thrust', dmg: [6, 9, 13, 20], scale: { might: 0.7 }, every: [0.52, 0.48, 0.44, 0.39], range: 82, crit: 20, critBy: 2.5, knock: 4, pierce: 2, price: 0, says: 'A knife and a coin: quick, and they often find the gap.' },
  { id: 'hearthbrand', name: 'Hearthbrand', own: true, icon: 'brazier', kinds: ['fire', 'arcane'], kind: 'magic', motion: 'cast', dmg: [9, 14, 20, 30], scale: { lore: 0.8 }, every: [1.3, 1.21, 1.13, 1.04], range: 330, crit: 0, critBy: 2, knock: 8, burst: 60, burn: [4, 6, 9, 13], flies: 400, shot: 'orb-fire', price: 0, says: 'A burning staff: its fire bursts and keeps burning.' },
  { id: 'ninth', name: "The Ninth's Lance", own: true, icon: 'spear', kinds: ['pole'], kind: 'melee', motion: 'thrust', dmg: [11, 18, 27, 41], scale: { might: 1 }, every: [1.2, 1.12, 1.03, 0.94], range: 165, crit: 5, critBy: 2, knock: 20, pierce: 99, price: 0, says: 'A long thrust through everyone in its line.' },
  { id: 'gravecleaver', name: 'Gravecleaver', own: true, icon: 'greataxe', kinds: ['blade', 'blunt'], kind: 'melee', motion: 'sweep', dmg: [17, 26, 40, 60], scale: { might: 1.6 }, every: [1.75, 1.63, 1.51, 1.4], range: 110, crit: 5, critBy: 2, knock: 26, arc: 140, price: 0, says: 'A great axe: slow, wide and heavy.' },
  { id: 'passingbell', name: 'The Passing Bell', own: true, icon: 'censer', kinds: ['holy'], kind: 'magic', motion: 'pulse', dmg: [7, 12, 18, 27], scale: { lore: 0.7 }, every: [3.4, 3.15, 2.9, 2.65], range: 116, crit: 0, critBy: 2, knock: 18, burst: 118, mends: [1, 1, 2, 2], price: 0, says: 'A ring of sound that throws them back and mends the band.' },
  { id: 'widowstear', name: "Widow's Tear", own: true, icon: 'frost', kinds: ['frost', 'arcane'], kind: 'magic', motion: 'cast', dmg: [7, 11, 16, 24], scale: { lore: 0.7 }, every: [1.2, 1.12, 1.04, 0.95], range: 370, crit: 0, critBy: 2, knock: 2, pierce: 2, slow: 0.45, flies: 460, shot: 'orb-frost', price: 0, says: 'A wand of ice: slows three in a line.' },
  { id: 'morningstar', name: 'Morningstar', own: true, icon: 'hammer', kinds: ['blunt', 'holy'], kind: 'melee', motion: 'slam', dmg: [14, 22, 34, 51], scale: { might: 1.3 }, every: [1.6, 1.49, 1.38, 1.27], range: 100, crit: 0, critBy: 2, knock: 10, burst: 62, stun: 0.8, price: 0, says: 'A hammer: stuns everyone where it lands.' },
];

/** The hero levels at which their own weapon grows a tier by itself. */
export const OWN_GROWS = [5, 10, 15] as const;

/** The tier a hero's own weapon stands at, at a level. */
export function ownTier(level: number): number {
  return OWN_GROWS.filter((l) => level >= l).length;
}

/**
 * What a hero's own weapon learns as it grows: one rule at each of the
 * levels above, three to a weapon. They are what a run looks forward to,
 * and each is a thing seen on the field. `at` is which of the three it is,
 * 1 to 3: it is on once the weapon stands at that tier.
 */
export interface OwnRule {
  weapon: string;
  at: 1 | 2 | 3;
  says: string;
}

export const OWN_RULES: readonly OwnRule[] = [
  { weapon: 'gatekeeper', at: 1, says: 'A set shield throws shots back at who loosed them.' },
  { weapon: 'gatekeeper', at: 2, says: 'The first sweep from behind a shield just set goes all the way round, and stuns.' },
  { weapon: 'gatekeeper', at: 3, says: 'Who strikes a set shield up close is thrown back and stunned.' },
  { weapon: 'whisper', at: 1, says: 'An arrow that finds someone unhurt pins them for a second.' },
  { weapon: 'whisper', at: 2, says: 'At full Unseen her arrows go through everyone.' },
  { weapon: 'whisper', at: 3, says: 'A kill at full Unseen looses the next arrow at once.' },
  { weapon: 'unfinished', at: 1, says: 'Every third bolt is cast twice.' },
  { weapon: 'unfinished', at: 2, says: 'A bolt that fells its mark flies on to another.' },
  { weapon: 'unfinished', at: 3, says: 'A bolt splits in two on the first it strikes.' },
  { weapon: 'headstails', at: 1, says: 'A critical blow knocks a coin loose.' },
  { weapon: 'headstails', at: 2, says: 'A coin picked up makes his next blow critical.' },
  { weapon: 'headstails', at: 3, says: 'The knife strikes behind him as well as before.' },
  { weapon: 'hearthbrand', at: 1, says: 'Where its fire bursts the ground burns on.' },
  { weapon: 'hearthbrand', at: 2, says: 'What dies burning near her bursts, and lights those round it.' },
  { weapon: 'hearthbrand', at: 3, says: 'Its bursts are half as wide again.' },
  { weapon: 'ninth', at: 1, says: 'A couched thrust throws back all it meets, and stuns them.' },
  { weapon: 'ninth', at: 2, says: 'A kill with the lance gives the thrust back at once.' },
  { weapon: 'ninth', at: 3, says: 'A couched thrust lands harder still, and reaches half as far again.' },
  { weapon: 'gravecleaver', at: 1, says: 'In debt his axe goes all the way round him.' },
  { weapon: 'gravecleaver', at: 2, says: 'What his axe fells in debt bursts where it drops.' },
  { weapon: 'gravecleaver', at: 3, says: 'He gets up from a killing blow with the grave open.' },
  { weapon: 'passingbell', at: 1, says: 'Each ring of the bell takes seconds off a fallen companion\'s rest.' },
  { weapon: 'passingbell', at: 2, says: 'Companions in his fold take half the harm.' },
  { weapon: 'passingbell', at: 3, says: 'At each ring every companion in his fold strikes at once.' },
  { weapon: 'widowstear', at: 1, says: 'Its bolt goes through everyone in its line.' },
  { weapon: 'widowstear', at: 2, says: 'What breaks leaves ice on the ground that slows who crosses it.' },
  { weapon: 'widowstear', at: 3, says: 'A captain freezes as long as anyone.' },
  { weapon: 'morningstar', at: 1, says: 'Her holy ground lasts twice as long.' },
  { weapon: 'morningstar', at: 2, says: 'On holy ground her hammer strikes a third faster.' },
  { weapon: 'morningstar', at: 3, says: 'What dies on holy ground gives her health back.' },
];

/** The rules a hero's own weapon has, each with the level it comes at and whether it is on at this tier. */
export function ownRules(weapon: string, tier: number): Array<{ level: number; says: string; on: boolean }> {
  return OWN_RULES.filter((r) => r.weapon === weapon).map((r) => ({ level: OWN_GROWS[r.at - 1], says: r.says, on: tier >= r.at }));
}

/** The numbers of those rules. */
export const OWN = {
  gatekeeper: {
    /** A shot thrown back is this many of his own blows; the sweep all round stuns for this long; who strikes the shield is thrown this far and stunned this long. */
    back: 1.5,
    roundStun: 0.6,
    bash: 46,
    bashStun: 0.8,
  },
  whisper: {
    /** Seconds one who was unhurt is pinned; the wait for the next arrow after a kill at full Unseen. */
    pin: 1,
    again: 0.08,
  },
  unfinished: {
    /** Every this many bolts, one is cast twice. */
    every: 3,
    /** The share of a bolt's harm each half of a split one does. */
    half: 0.6,
  },
  headstails: {
    /** Seconds between one coin a critical blow knocks loose and the next. */
    gap: 1.5,
  },
  hearthbrand: {
    /** Seconds the ground burns on where its fire burst; how wide what dies burning bursts, how many seconds of its fire that does at once and how long it leaves its neighbors burning; how much wider its bursts are. */
    ground: 2,
    r: 64,
    harm: 2,
    burns: 3,
    wider: 1.5,
  },
  ninth: {
    /** How far a couched thrust throws and how long it stuns; the wait for the next thrust after a kill; how many times the harm of a couched thrust at the last, and how much further it reaches. */
    knock: 34,
    stun: 0.6,
    again: 0.2,
    times: 3.5,
    reach: 1.5,
  },
  gravecleaver: {
    /** How wide what his axe fells in debt bursts, and how many of his blows that is. */
    r: 62,
    harm: 0.5,
  },
  passingbell: {
    /** Seconds a ring takes off a fallen companion's rest; the share of a blow a companion in the fold takes. */
    wakes: 3,
    lets: 0.5,
  },
  widowstear: {
    /** How wide the ice a broken one leaves is, how long it lies, and how much it slows. */
    r: 72,
    seconds: 3,
    slow: 0.4,
  },
  morningstar: {
    /** How many times as long her holy ground lasts; how much faster her hammer is on it; seconds between one health and the next from what dies on it. */
    longer: 2,
    faster: 1.33,
    gap: 0.4,
  },
} as const;

// ---------------------------------------------------------------- quirks

/** The numbers of each quirk. Each was where the design put it, and then set by measuring. */
export const QUIRKS = {
  standfast: {
    /** Seconds he has to stand before the shield is set. */
    after: 0.45,
    /** The share of a blow that gets through a set shield. A shot from the side he faces does not get through at all. */
    lets: 0.4,
    /** How much more often his own sword strikes behind it. */
    faster: 1.25,
  },
  unseen: {
    /** What each second untouched adds to her harm, and the most it comes to. */
    each: 0.04,
    most: 0.6,
  },
  unfinished: {
    /** How many more choices a level offers him. */
    choices: 1,
    /** What the staff takes from a weapon of each plain kind: a blade's chance of a critical blow, how many more a pole goes through, seconds a blunt thing stuns, how much further a bow reaches, how many more a thrown thing skips to. */
    blade: 15,
    pole: 2,
    blunt: 0.4,
    bow: 130,
    thrown: 1,
  },
  double: {
    /** The chance a blow of his own knife knocks a coin loose. */
    chance: 0.04,
    /** How many coins held are one hundredth more harm, and the most it comes to: full at 240 held. */
    coins: 4,
    most: 0.6,
    /** The chance a toss comes up heads, what each point of Luck adds to it, and the most it can be. */
    heads: 0.5,
    luck: 0.0025,
    best: 0.75,
  },
  banked: {
    /** How near her a fire never goes out. */
    r: 200,
    /** What each time her own staff lights one who burns already adds to its fire, as a share of the staff's, and how many times the staff's fire it can come to. */
    hotter: 0.35,
    most: 3,
  },
  tilt: {
    /** Seconds of riding straight that couch the lance, and how many times the harm of the thrust that follows. */
    seconds: 1.5,
    times: 2.5,
    /** How far she may turn from the way she set out, in degrees, and how long she may stand, before it is lost. */
    turn: 45,
    slack: 0.25,
  },
  gravedebt: {
    /** The share of his health under which he is in debt, how much more he hits then, and what a kill of his axe gives back. */
    under: 1 / 3,
    more: 0.4,
    mends: 1,
    /** The share of his health he gets up with, how wide the burst is and how many of his blows it is worth. */
    rises: 0.25,
    r: 150,
    harm: 3,
  },
  shepherd: {
    /** How near him a companion is in his fold: it strikes faster there, by this much, and what heals him heals it. */
    r: 230,
    faster: 1.2,
  },
  deepcold: {
    /** Seconds the slowed, struck again, are frozen for. A captain is frozen for a share of it, as it is stunned (MOVE.bossShare). */
    freeze: 0.9,
    /** Seconds after thawing before the same one can be frozen again. */
    numb: 4.5,
    /** How much more the frozen take. */
    more: 1.3,
    /** The shards of one that breaks: how wide, and the share of its health they do. */
    r: 66,
    shards: 0.12,
  },
  consecrate: {
    /** Seconds her hammer's ground stays holy, what it does to enemies a second as a share of the blow, and seconds between one health back for each of the band on it. */
    seconds: 4,
    harm: 0.2,
    mends: 2.2,
  },
} as const;

/**
 * Orrin's staff as the last weapon he bought finished it: it takes that
 * weapon's kinds, and what that weapon leaves on those it strikes. A staff
 * with nothing bought yet is as it was made.
 */
export function finishedAs(staff: WeaponDef, from: WeaponDef | null): WeaponDef {
  if (!from) return staff;
  const q = QUIRKS.unfinished;
  const has = (k: WeaponDef['kinds'][number]): boolean => from.kinds.includes(k);
  // A bolt that leaves a cloud or holy ground has to burst where it lands, and so goes through nobody.
  const lands = !!from.cloud || !!from.holy;
  return {
    ...staff,
    kinds: from.kinds,
    burn: from.burn,
    slow: from.slow,
    cloud: from.cloud,
    holy: from.holy,
    burst: lands ? (from.burst ?? 50) : undefined,
    crit: staff.crit + (has('blade') ? q.blade : 0),
    pierce: lands ? 0 : (staff.pierce ?? 0) + (has('pole') ? q.pole : 0),
    stun: has('blunt') ? q.blunt : undefined,
    range: staff.range + (has('bow') ? q.bow : 0),
    leaps: has('thrown') ? q.thrown : 0,
    says: `Finished as ${from.name}: it takes its kinds and what it does.`,
  };
}

// ---------------------------------------------------------------- moves

export interface MoveDef {
  id: MoveId;
  name: string;
  /** What it does, in a line a player reads. */
  says: string;
  /** How far off enemies count as something to hit, for a move let loose by itself. */
  reach: number;
  /** What it does, counted in blows of the hero's own weapon. */
  harm: number;
  /** How wide it lands, where it has a ring. */
  r: number;
  /** Seconds it lasts, where it lasts. */
  seconds: number;
  /** Seconds it stuns, where it stuns. */
  stun: number;
}

/**
 * No two are alike, and each asks the player for something: where to stand,
 * which way to face, or when.
 *
 * gate: where he stands and the way he faces is where the gate goes.
 * oneshot: when (her harm is at its fullest unstruck), and who is in reach.
 * starfall: the way he faces is the line the stars come down along.
 * vanish: when.
 * wildfire: where she stands is its middle.
 * charge: the way she is steered is the way she goes.
 * opengrave: when to pay for it, and with how much health left.
 * toll: where he stands, and who of the band is near.
 * whiteout: when.
 * judgment: where she stands is where it falls.
 */
export const MOVES: readonly MoveDef[] = [
  { id: 'gate', name: 'Plant the Gate', says: 'A gate stands before him for five seconds. Nothing passes it, and what it lands on is thrown back.', reach: 150, harm: 2.5, r: 100, seconds: 5, stun: 1.2 },
  { id: 'oneshot', name: 'The One That Matters', says: 'One arrow at the strongest of them in reach. At full Unseen it is worth two.', reach: 520, harm: 12, r: 0, seconds: 0, stun: 0 },
  { id: 'starfall', name: 'Starfall', says: 'Stars come down in a line the way he faces.', reach: 420, harm: 1.7, r: 68, seconds: 1.2, stun: 0.3 },
  { id: 'vanish', name: 'Vanish', says: 'Two seconds unseen. Enemies lose him, and his next blows are critical.', reach: 120, harm: 0, r: 0, seconds: 2, stun: 0 },
  { id: 'wildfire', name: 'Wildfire', says: 'A ring of fire runs out from her.', reach: 250, harm: 2, r: 330, seconds: 5, stun: 0 },
  { id: 'charge', name: 'Charge', says: 'A long run through whatever is in the way.', reach: 240, harm: 3, r: 38, seconds: 0.6, stun: 0.4 },
  { id: 'opengrave', name: 'Open Grave', says: 'He pays with his own health. For five seconds he does double harm and every blow gives health back.', reach: 150, harm: 2, r: 0, seconds: 5, stun: 0 },
  { id: 'toll', name: 'Toll', says: 'The bell heals the band and stuns all who hear it.', reach: 250, harm: 1.5, r: 320, seconds: 0, stun: 1.6 },
  { id: 'whiteout', name: 'Whiteout', says: 'Everything on the field freezes for two seconds.', reach: 420, harm: 0, r: 0, seconds: 2, stun: 2 },
  { id: 'judgment', name: 'Judgment', says: 'A hammer of light falls where she stands, and the ground there is holy.', reach: 170, harm: 3, r: 165, seconds: 4, stun: 1.3 },
];

/** The numbers every move shares. */
export const MOVE = {
  /** Kills that fill the fury bar on the first wave, and how many more each wave after: the waves grow. Set so that a move comes about twice a wave early and three or four times late. */
  kills: 12,
  more: 3.5,
  /** What a blow on a captain adds to the bar: there is little else to kill beside one. */
  bossBlow: 0.006,
  /** A move that goes off by itself waits for this many in its reach, or a captain, or the hero in trouble. */
  crowd: 4,
  /** Under this share of health a move goes off for one enemy in reach. */
  trouble: 0.35,
  /** Seconds the ground is marked before something lands on it. */
  warn: 0.45,
  /** How many times a hero's speed a charge is. */
  dash: 3.4,
  /** How many stars a starfall is. */
  stars: 6,
  /** How near one another foes count as a knot, where the thickest of them is looked for. */
  cluster: 110,
  /** A captain is stunned or frozen for this share of what the rest are. */
  bossShare: 0.3,
  /** The share of health a toll gives back to the hero and to each of the band. */
  tollMends: 0.25,
  /** How far before him the gate is planted, and how near it a foe is thrown back when it lands. */
  gateAhead: 46,
  gateNear: 34,
  /** How fast the one arrow flies. */
  oneFlies: 1500,
  /** How far before him the first star comes down, and how far apart the rest are along the line. */
  starsFrom: 90,
  starsApart: 66,
  /** The share of his whole health an open grave costs. It never takes the last of it. */
  graveCost: 0.3,
} as const;
