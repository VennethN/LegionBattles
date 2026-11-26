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
    id: 'wren', unit: 'wren', name: 'Wren Fallowmere', short: 'Wren', epithet: 'the Quiet Arrow', who: 'A poacher the king could never catch.', line: 'You will not hear the one that matters.',
    weapon: 'whisper', stats: { aim: 2, reach: 30, maxHp: -3 }, quirk: 'unseen', quirkName: 'Unseen',
    says: 'Deal 4% more damage for each second you are not hit, up to 60%: 2x as fast with no enemy near you. Getting hit halves it.', move: 'oneshot', unlock: null,
  },
  {
    id: 'bram', unit: 'bram', name: 'Bram Oakenhold', short: 'Bram', epithet: 'the Gatewarden', who: 'The last man on a gate that fell. He does not step back.', line: 'The gate is wherever I stand.',
    weapon: 'gatekeeper', stats: { maxHp: 14, armor: 3, might: 1 }, quirk: 'standfast', quirkName: 'Stand Fast',
    says: 'Stand still to raise your shield: take 60% less damage, block shots from the front, and attack 25% faster. Moving lowers it.', move: 'gate', unlock: { kind: 'runs', runs: 1 },
  },
  {
    id: 'orrin', unit: 'orrin', name: 'Orrin Quillon', short: 'Orrin', epithet: 'the Unfinished', who: 'A wizard expelled before his last lesson.', line: 'I never did learn how it ends.',
    weapon: 'unfinished', stats: { lore: 3, maxHp: 2, might: -2 }, quirk: 'unfinished', quirkName: 'Unfinished',
    says: 'Your staff copies the last weapon you bought: its weapon types and its effects. Level ups offer 1 more choice.', move: 'starfall', unlock: { kind: 'wave', wave: 5 },
  },
  {
    id: 'fenn', unit: 'fenn', name: 'Fenn Two-Coins', short: 'Fenn', epithet: 'the Lucky', who: 'A thief who has never lost a toss.', line: 'Heads I win. Tails, look behind you.',
    weapon: 'headstails', stats: { speed: 12, bounty: 10, dodge: 10, maxHp: 18, armor: 2, crit: 5 }, quirk: 'double', quirkName: 'Double or Nothing',
    says: 'Once per camp, flip a coin for an item: heads it is free, tails you pay and lose it. Deal 1% more damage per 4 coins held, up to 20%.', move: 'vanish', unlock: { kind: 'coins', coins: 200 },
  },
  {
    id: 'nan', unit: 'nan', name: 'Old Nan Cinderwick', short: 'Old Nan', epithet: 'the Hearthwitch', who: 'She kept one fire lit for sixty years.', line: 'Come in out of the cold, dears.',
    weapon: 'hearthbrand', stats: { lore: 2, crit: 5 }, quirk: 'banked', quirkName: 'Banked Fire',
    says: 'Burning enemies near you never stop burning. Hitting a burning enemy with your staff adds 35% to its burn, up to 3x.', move: 'wildfire', unlock: { kind: 'boss', boss: 'warlord' },
  },
  {
    id: 'isaura', unit: 'isaura', name: 'Isaura Vane', short: 'Isaura', epithet: 'Captain of the Ninth', who: 'Her company, the Ninth, is gone. She rides on alone.', line: 'The Ninth does not halt.',
    weapon: 'ninth', stats: { might: 3, speed: 8, maxHp: 10, armor: 2 }, quirk: 'tilt', quirkName: 'Tilt',
    says: 'Ride in a straight line for 1.5 s to ready your lance: the next thrust deals 2.5x damage. Turning sharply or stopping loses it.', move: 'charge', unlock: { kind: 'runs', runs: 7 },
  },
  {
    id: 'hroth', unit: 'hroth', name: 'Hroth', short: 'Hroth', epithet: 'the Unburied', who: 'They buried him twice.', line: 'Dig deeper next time.',
    weapon: 'gravecleaver', stats: { might: 2, armor: -2 }, quirk: 'gravedebt', quirkName: 'Grave Debt',
    says: 'Below 33% HP: deal 40% more damage, and axe kills heal 1 HP. Once per land, survive a killing blow with 25% HP. No health regen.', move: 'opengrave', unlock: { kind: 'runs', runs: 12 },
  },
  {
    id: 'aldous', unit: 'aldous', name: 'Brother Aldous Bell', short: 'Aldous', epithet: 'the Shepherd', who: 'He rang the bell for the dead. Now he rings it for the living.', line: 'Stay close. I will count you all at dusk.',
    weapon: 'passingbell', stats: { regen: 6, maxHp: 8, damage: -10 }, quirk: 'shepherd', quirkName: 'Shepherd',
    says: 'Companions near you attack 20% faster, deal 30% more damage and are healed whenever you are. You deal 20% less damage.', move: 'toll', unlock: { kind: 'runs', runs: 18 },
  },
  {
    id: 'ysolde', unit: 'ysolde', name: 'Ysolde Rimeheart', short: 'Ysolde', epithet: 'the Winter Widow', who: 'The cold took her husband. She took the cold.', line: 'It only hurts until it does not.',
    weapon: 'widowstear', stats: { lore: 2, reach: 10, maxHp: 6 }, quirk: 'deepcold', quirkName: 'Deep Cold',
    says: 'Hit a slowed enemy to freeze it for 0.9 s. Frozen enemies take 30% more damage and shatter when they die, hitting enemies nearby.', move: 'whiteout', unlock: { kind: 'boss', boss: 'colossus' },
  },
  {
    id: 'maren', unit: 'maren', name: 'Maren Dawnguard', short: 'Maren', epithet: 'the Oathkeeper', who: 'She swore to see the morning.', line: 'Hold until the light. Then hold some more.',
    weapon: 'morningstar', stats: { maxHp: 6, armor: 1, might: 1, haste: -10 }, quirk: 'consecrate', quirkName: 'Consecrate',
    says: 'Your hammer leaves holy ground for 4 s. It burns enemies and heals you and your companions.', move: 'judgment', unlock: { kind: 'wave', wave: 50 },
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
  { id: 'gatekeeper', name: 'Gatekeeper', own: true, icon: 'sword', kinds: ['blade'], kind: 'melee', motion: 'sweep', dmg: [9, 14, 22, 34], scale: { might: 1 }, every: [1, 0.93, 0.86, 0.78], range: 96, crit: 5, critBy: 2, knock: 18, arc: 100, price: 0, says: 'Sword and shield. Sweeps a wide arc in front of you.' },
  { id: 'whisper', name: 'Whisper', own: true, icon: 'bow', kinds: ['bow'], kind: 'ranged', motion: 'shoot', dmg: [8, 13, 19, 29], scale: { aim: 1 }, every: [1.12, 1.04, 0.96, 0.88], range: 410, crit: 8, critBy: 2, knock: 6, pierce: 1, flies: 680, shot: 'arrow', price: 0, says: 'Longbow. Each arrow hits up to 2 enemies in a line.' },
  { id: 'unfinished', name: 'The Unfinished Staff', own: true, icon: 'staff', kinds: ['arcane'], kind: 'magic', motion: 'cast', dmg: [11, 17, 26, 39], scale: { lore: 1 }, every: [1.1, 1.02, 0.94, 0.85], range: 390, crit: 5, critBy: 2, knock: 5, pierce: 1, flies: 430, shot: 'orb-arcane', price: 0, says: 'Homing bolt. Hits up to 2 enemies.' },
  { id: 'headstails', name: 'Heads and Tails', own: true, icon: 'dagger', kinds: ['blade'], kind: 'melee', motion: 'thrust', dmg: [7, 10, 15, 22], scale: { might: 0.7 }, every: [0.52, 0.48, 0.44, 0.39], range: 92, crit: 12, critBy: 2, knock: 10, pierce: 2, price: 0, says: 'Fast knife with a 12% crit chance. Each hit has a 4% chance to knock a coin loose.' },
  { id: 'hearthbrand', name: 'Hearthbrand', own: true, icon: 'brazier', kinds: ['fire', 'arcane'], kind: 'magic', motion: 'cast', dmg: [9, 14, 20, 30], scale: { lore: 0.8 }, every: [1.3, 1.21, 1.13, 1.04], range: 330, crit: 0, critBy: 2, knock: 8, burst: 60, burn: [4, 6, 9, 13], flies: 400, shot: 'orb-fire', price: 0, says: 'Fireball. Explodes on hit and sets enemies on fire.' },
  { id: 'ninth', name: "The Ninth's Lance", own: true, icon: 'spear', kinds: ['pole'], kind: 'melee', motion: 'thrust', dmg: [11, 18, 27, 41], scale: { might: 1 }, every: [1.2, 1.12, 1.03, 0.94], range: 165, crit: 5, critBy: 2, knock: 20, pierce: 99, price: 0, says: 'Long lance. Hits every enemy in a line.' },
  { id: 'gravecleaver', name: 'Gravecleaver', own: true, icon: 'greataxe', kinds: ['blade', 'blunt'], kind: 'melee', motion: 'sweep', dmg: [17, 26, 40, 60], scale: { might: 1.6 }, every: [1.75, 1.63, 1.51, 1.4], range: 110, crit: 5, critBy: 2, knock: 26, arc: 140, price: 0, says: 'Great axe. Slow, wide, heavy sweeps.' },
  { id: 'passingbell', name: 'The Passing Bell', own: true, icon: 'censer', kinds: ['holy'], kind: 'magic', motion: 'pulse', dmg: [7, 12, 18, 27], scale: { lore: 0.7 }, every: [3.4, 3.15, 2.9, 2.65], range: 116, crit: 0, critBy: 2, knock: 18, burst: 118, mends: [1, 1, 2, 2], price: 0, says: 'Bell. Each ring knocks nearby enemies back and heals you.' },
  { id: 'widowstear', name: "Widow's Tear", own: true, icon: 'frost', kinds: ['frost', 'arcane'], kind: 'magic', motion: 'cast', dmg: [7, 11, 16, 24], scale: { lore: 0.7 }, every: [1.2, 1.12, 1.04, 0.95], range: 370, crit: 0, critBy: 2, knock: 2, pierce: 2, slow: 0.45, flies: 460, shot: 'orb-frost', price: 0, says: 'Ice wand. Slows up to 3 enemies in a line by 45%.' },
  { id: 'morningstar', name: 'Morningstar', own: true, icon: 'hammer', kinds: ['blunt', 'holy'], kind: 'melee', motion: 'slam', dmg: [14, 22, 34, 51], scale: { might: 1.3 }, every: [1.6, 1.49, 1.38, 1.27], range: 100, crit: 0, critBy: 2, knock: 10, burst: 62, stun: 0.8, price: 0, says: 'Hammer. Stuns every enemy it lands on for 0.8 s.' },
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
  { weapon: 'gatekeeper', at: 1, says: 'Your raised shield reflects shots back at the shooter.' },
  { weapon: 'gatekeeper', at: 2, says: 'The first sweep after raising your shield hits all around you and stuns for 0.6 s.' },
  { weapon: 'gatekeeper', at: 3, says: 'Enemies that hit your raised shield in melee are knocked back and stunned for 0.8 s.' },
  { weapon: 'whisper', at: 1, says: 'Arrows pin full-health enemies in place for 1 s.' },
  { weapon: 'whisper', at: 2, says: 'At full Unseen, arrows pierce every enemy.' },
  { weapon: 'whisper', at: 3, says: 'At full Unseen, a kill fires the next arrow instantly.' },
  { weapon: 'unfinished', at: 1, says: 'Every 3rd bolt casts twice.' },
  { weapon: 'unfinished', at: 2, says: 'A bolt that kills its target jumps to another enemy.' },
  { weapon: 'unfinished', at: 3, says: 'Bolts split in two on the first enemy hit. Each half deals 60% damage.' },
  { weapon: 'headstails', at: 1, says: 'Crits knock a coin loose (once every 1.5 s).' },
  { weapon: 'headstails', at: 2, says: 'Picking up a coin makes your next hit a crit.' },
  { weapon: 'headstails', at: 3, says: 'The knife also strikes behind you.' },
  { weapon: 'hearthbrand', at: 1, says: 'Explosions leave the ground burning for 2 s.' },
  { weapon: 'hearthbrand', at: 2, says: 'Burning enemies that die near you explode and set nearby enemies on fire.' },
  { weapon: 'hearthbrand', at: 3, says: 'Explosions are 50% wider.' },
  { weapon: 'ninth', at: 1, says: 'Tilt thrusts knock enemies back and stun them for 0.6 s.' },
  { weapon: 'ninth', at: 2, says: 'A kill with the lance readies the next thrust at once.' },
  { weapon: 'ninth', at: 3, says: 'Tilt thrusts deal 3.5x damage and reach 50% farther.' },
  { weapon: 'gravecleaver', at: 1, says: 'In Grave Debt, your axe hits all around you.' },
  { weapon: 'gravecleaver', at: 2, says: 'Enemies your axe kills in Grave Debt explode.' },
  { weapon: 'gravecleaver', at: 3, says: 'Surviving a killing blow also casts Open Grave for free.' },
  { weapon: 'passingbell', at: 1, says: 'Each ring takes 3 s off a downed companion\'s recovery.' },
  { weapon: 'passingbell', at: 2, says: 'Companions near you take 50% less damage.' },
  { weapon: 'passingbell', at: 3, says: 'Each ring makes every companion near you attack at once.' },
  { weapon: 'widowstear', at: 1, says: 'Bolts pierce every enemy in their line.' },
  { weapon: 'widowstear', at: 2, says: 'Shattered enemies leave ice on the ground for 3 s. It slows enemies by 40%.' },
  { weapon: 'widowstear', at: 3, says: 'Bosses stay frozen for the full time.' },
  { weapon: 'morningstar', at: 1, says: 'Holy ground lasts 2x as long.' },
  { weapon: 'morningstar', at: 2, says: 'On holy ground, your hammer attacks 33% faster.' },
  { weapon: 'morningstar', at: 3, says: 'Enemies that die on holy ground heal you 1 HP.' },
];

/**
 * The second way: one rule of each hero's own weapon has another that may be chosen in its place, once an oath of
 * theirs has unlocked the choice (hold.ts). It is another way to play, not a better one.
 */
export const OWN_ALTS: readonly OwnRule[] = [
  { weapon: 'gatekeeper', at: 1, says: 'Each shot your raised shield blocks fills 6% of your Fury.' },
  { weapon: 'whisper', at: 2, says: 'At full Unseen, arrows bounce to 2 more enemies.' },
  { weapon: 'unfinished', at: 1, says: 'Every 5th bolt deals 3x damage.' },
  { weapon: 'headstails', at: 1, says: 'Crits heal 1 HP (once every 1.5 s).' },
  { weapon: 'hearthbrand', at: 3, says: 'Its burn deals 50% more damage.' },
  { weapon: 'ninth', at: 2, says: 'After a Tilt thrust, you cannot be hurt for 0.8 s.' },
  { weapon: 'gravecleaver', at: 2, says: 'In Grave Debt, attack 30% faster.' },
  { weapon: 'passingbell', at: 2, says: 'Companions near you deal 40% more damage.' },
  { weapon: 'widowstear', at: 2, says: 'Shattered enemies freeze the enemies near them for 0.8 s.' },
  { weapon: 'morningstar', at: 1, says: 'Holy ground is 40% wider.' },
];

/** The level slot (1, 2 or 3) at which a weapon's second way stands in for its first, or 0 for a weapon with none. */
export function altAt(weapon: string): number {
  return OWN_ALTS.find((r) => r.weapon === weapon)?.at ?? 0;
}

/** The rules a hero's own weapon has, each with the level it comes at and whether it is on at this tier. With `alt`, the second way stands where it replaces the first. */
export function ownRules(weapon: string, tier: number, alt = false): Array<{ level: number; says: string; on: boolean; alt: boolean }> {
  const second = alt ? OWN_ALTS.find((r) => r.weapon === weapon) : undefined;
  return OWN_RULES.filter((r) => r.weapon === weapon).map((r) => {
    const swap = second?.at === r.at;
    return { level: OWN_GROWS[r.at - 1], says: swap ? second.says : r.says, on: tier >= r.at, alt: swap };
  });
}

/** A weapon's choice of ways, for the screen that offers it: the level, the first rule and the second. */
export function altChoice(weapon: string): { level: number; first: string; second: string } | null {
  const second = OWN_ALTS.find((r) => r.weapon === weapon);
  const first = second && OWN_RULES.find((r) => r.weapon === weapon && r.at === second.at);
  return second && first ? { level: OWN_GROWS[second.at - 1], first: first.says, second: second.says } : null;
}

/**
 * What a run counts of the way a hero was played, for the oaths that are about their passive (holdData.ts): kills by
 * a couched thrust, kills made in debt, enemies whose burn was stacked to its most, coin tosses won, and the times
 * the staff took a new form.
 */
export const COUNTS = ['tilt', 'debt', 'banked', 'toss', 'finished'] as const;
export type Count = (typeof COUNTS)[number];

/** The numbers of the second ways. */
export const ALT = {
  /** Bram: the share of Fury a blocked shot fills. */
  gatekeeper: { fury: 0.06 },
  /** Wren: how many more an arrow bounces to at full Unseen. */
  whisper: { leaps: 2 },
  /** Orrin: every this many bolts, one does this many times the damage. */
  unfinished: { every: 5, times: 3 },
  /** Fenn: health a crit gives back, and the seconds between one and the next. */
  headstails: { heals: 1, gap: 1.5 },
  /** Nan: how many times the burn of her staff. */
  hearthbrand: { hotter: 1.5 },
  /** Isaura: seconds nothing can hurt her after a couched thrust. */
  ninth: { grace: 0.8 },
  /** Hroth: how many times as fast his axe is in debt. */
  gravecleaver: { faster: 1.3 },
  /** Aldous: how many times the damage of a companion in his fold. */
  passingbell: { harder: 1.4 },
  /** Ysolde: seconds those near one that breaks are frozen. */
  widowstear: { freeze: 0.8 },
  /** Maren: how many times as wide her holy ground is. */
  morningstar: { wider: 1.4 },
} as const;

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
    /** What each second untouched adds to her harm, and the most it comes to. With nobody within `far`, it grows `alone` times as fast. A blow leaves `keeps` of it. */
    each: 0.04,
    most: 0.6,
    far: 180,
    alone: 2,
    keeps: 0.5,
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
    /** How many coins held are one hundredth more harm, and the most it comes to: full at 80 held. */
    coins: 4,
    most: 0.2,
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
    /** How near him a companion is in his fold: it strikes faster there, by this much, harder by this much, and what heals him heals it. */
    r: 230,
    faster: 1.2,
    harder: 1.3,
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
    says: `Copies ${from.name}: its weapon types and its effects.`,
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
  { id: 'gate', name: 'Plant the Gate', says: 'Plant a gate in front of you for 5 s. Enemies cannot pass it. Enemies it lands on take 2.5x weapon damage and are stunned for 1.2 s.', reach: 150, harm: 2.5, r: 100, seconds: 5, stun: 1.2 },
  { id: 'oneshot', name: 'The One That Matters', says: 'Fire one arrow at the toughest enemy in range: 12x weapon damage. At full Unseen: 24x.', reach: 520, harm: 12, r: 0, seconds: 0, stun: 0 },
  { id: 'starfall', name: 'Starfall', says: '6 stars fall in a line in front of you. Each deals 1.7x weapon damage in an area.', reach: 420, harm: 1.7, r: 68, seconds: 1.2, stun: 0.3 },
  { id: 'vanish', name: 'Vanish', says: 'Turn invisible for 2 s: enemies lose track of you. Every hit is a crit for 4 s.', reach: 120, harm: 0, r: 0, seconds: 2, stun: 0 },
  { id: 'wildfire', name: 'Wildfire', says: 'A ring of fire spreads out from you: 2x weapon damage, and enemies burn for 5 s.', reach: 250, harm: 2, r: 330, seconds: 5, stun: 0 },
  { id: 'charge', name: 'Charge', says: 'Dash the way you are moving. Enemies in your path take 3x weapon damage and are stunned for 0.4 s.', reach: 240, harm: 3, r: 38, seconds: 0.6, stun: 0.4 },
  { id: 'opengrave', name: 'Open Grave', says: 'Costs 30% of your max HP. For 5 s deal 2x damage, and your hits heal you.', reach: 150, harm: 2, r: 0, seconds: 5, stun: 0 },
  { id: 'toll', name: 'Toll', says: 'Heal yourself and your companions for 25% HP and revive downed companions. Nearby enemies take 1.5x weapon damage and are stunned for 1.6 s.', reach: 250, harm: 1.5, r: 320, seconds: 0, stun: 1.6 },
  { id: 'whiteout', name: 'Whiteout', says: 'Freeze every enemy for 2 s. Enemy shots in the air are destroyed.', reach: 420, harm: 0, r: 0, seconds: 2, stun: 2 },
  { id: 'judgment', name: 'Judgment', says: 'A hammer of light lands on you: enemies around you take 3x weapon damage and are stunned for 1.3 s. Leaves holy ground for 4 s.', reach: 170, harm: 3, r: 165, seconds: 4, stun: 1.3 },
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
