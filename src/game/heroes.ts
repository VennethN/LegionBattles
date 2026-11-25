// The heroes: who each is, the weapon that is theirs alone, the rule only
// they have (their quirk), and their one great deed (their move). The
// rules of a wave (world.ts) read the numbers here and know none of their
// own. A change here is measured with `npm run pace` before and after.

import type { Feat, WeaponDef } from './data';
import type { StatLine } from './stats';

/**
 * The rule only one hero has. What each does is in QUIRKS below, with its numbers.
 *
 * standfast (Bram): standing still sets his shield.
 * unseen (Wren): harm grows while nothing strikes her.
 * echo (Orrin): every third spell is cast twice, and a level offers one more choice.
 * sticky (Fenn): blows knock coins loose, and coins held are harm.
 * kindling (Nan): what dies burning bursts and lights its neighbors.
 * momentum (Isaura): harm grows while she keeps moving.
 * unburied (Hroth): harm grows with his wounds, and once in a land he gets up again.
 * shepherd (Aldous): one companion more, and what heals him heals them.
 * deepcold (Ysolde): the slowed, struck again, freeze; the frozen break.
 * consecrate (Maren): her hammer leaves holy ground.
 */
export type Quirk = 'standfast' | 'unseen' | 'echo' | 'sticky' | 'kindling' | 'momentum' | 'unburied' | 'shepherd' | 'deepcold' | 'consecrate';

export type MoveId = 'rush' | 'rain' | 'starfall' | 'vanish' | 'wildfire' | 'charge' | 'warcry' | 'toll' | 'whiteout' | 'judgment';

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
    weapon: 'gatekeeper', stats: { maxHp: 6, armor: 1, speed: -5 }, quirk: 'standfast', quirkName: 'Stand Fast',
    says: 'Standing still he sets his shield: blows do far less and his sword is faster. A step drops it.', move: 'rush', unlock: null,
  },
  {
    id: 'wren', unit: 'wren', name: 'Wren Fallowmere', short: 'Wren', epithet: 'the Quiet Arrow', who: 'A poacher the king could never catch.', line: 'You will not hear the one that matters.',
    weapon: 'whisper', stats: { aim: 2, reach: 30, maxHp: -4 }, quirk: 'unseen', quirkName: 'Unseen',
    says: 'Every second since she was last struck she hits harder. One blow takes it all away.', move: 'rain', unlock: null,
  },
  {
    id: 'orrin', unit: 'orrin', name: 'Orrin Quillon', short: 'Orrin', epithet: 'the Unfinished', who: 'A magister thrown out before his last lesson.', line: 'I never did learn how it ends.',
    weapon: 'unfinished', stats: { lore: 3, maxHp: -2, might: -2 }, quirk: 'echo', quirkName: 'Echo',
    says: 'Every third spell is cast twice. He picks from one more choice at each level.', move: 'starfall', unlock: { kind: 'wave', wave: 5 },
  },
  {
    id: 'fenn', unit: 'fenn', name: 'Fenn Two-Coins', short: 'Fenn', epithet: 'the Lucky', who: 'A thief who has never lost a toss.', line: 'Heads I win. Tails, look behind you.',
    weapon: 'headstails', stats: { speed: 12, bounty: 10, dodge: 8, maxHp: -4 }, quirk: 'sticky', quirkName: 'Sticky Fingers',
    says: 'A blow may knock a coin loose. The more coins he holds the harder he hits: spending makes him weaker.', move: 'vanish', unlock: { kind: 'coins', coins: 200 },
  },
  {
    id: 'nan', unit: 'nan', name: 'Old Nan Cinderwick', short: 'Old Nan', epithet: 'the Hearthwitch', who: 'She kept one fire lit for sixty years.', line: 'Come in out of the cold, dears.',
    weapon: 'hearthbrand', stats: { lore: 2, crit: 5 }, quirk: 'kindling', quirkName: 'Kindling',
    says: 'What dies burning bursts, and the burst sets others alight.', move: 'wildfire', unlock: { kind: 'boss', boss: 'warlord' },
  },
  {
    id: 'isaura', unit: 'isaura', name: 'Isaura Vane', short: 'Isaura', epithet: 'Captain of the Ninth', who: 'The Ninth Lance is gone. She rides on without it.', line: 'The Ninth does not halt.',
    weapon: 'ninth', stats: { might: 2, speed: 8 }, quirk: 'momentum', quirkName: 'Momentum',
    says: 'The longer she keeps moving the harder she hits. Standing still loses it. Her lance goes through everyone in its line.', move: 'charge', unlock: { kind: 'kills', kills: 600 },
  },
  {
    id: 'hroth', unit: 'hroth', name: 'Hroth', short: 'Hroth', epithet: 'the Unburied', who: 'They buried him twice.', line: 'Dig deeper next time.',
    weapon: 'gravecleaver', stats: { might: 3, lifesteal: 4, armor: -2 }, quirk: 'unburied', quirkName: "Won't Stay Down",
    says: 'More harm the more he is hurt. Once in a land he gets up from a killing blow. He does not mend by himself.', move: 'warcry', unlock: { kind: 'wave', wave: 10 },
  },
  {
    id: 'aldous', unit: 'aldous', name: 'Brother Aldous Bell', short: 'Aldous', epithet: 'the Shepherd', who: 'He rings the dead home, and now the living.', line: 'Stay close. I will count you all at dusk.',
    weapon: 'passingbell', stats: { regen: 6, maxHp: 4, damage: -20 }, quirk: 'shepherd', quirkName: 'Shepherd',
    says: 'He brings one companion more. What heals him heals his band, and companions near him strike faster. He himself hits softly.', move: 'toll', unlock: { kind: 'wave', wave: 12 },
  },
  {
    id: 'ysolde', unit: 'ysolde', name: 'Ysolde Rimeheart', short: 'Ysolde', epithet: 'the Winter Widow', who: 'The cold took her husband. She took the cold.', line: 'It only hurts until it does not.',
    weapon: 'widowstear', stats: { lore: 2, reach: 20, speed: -4 }, quirk: 'deepcold', quirkName: 'Deep Cold',
    says: 'The slowed, struck again, freeze solid. The frozen take far more and break into shards.', move: 'whiteout', unlock: { kind: 'boss', boss: 'colossus' },
  },
  {
    id: 'maren', unit: 'maren', name: 'Maren Dawnguard', short: 'Maren', epithet: 'the Oathkeeper', who: 'She swore to see the morning.', line: 'Hold until the light. Then hold some more.',
    weapon: 'morningstar', stats: { maxHp: 8, armor: 1, might: 2, haste: -10 }, quirk: 'consecrate', quirkName: 'Consecrate',
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
  { id: 'whisper', name: 'Whisper', own: true, icon: 'bow', kinds: ['bow'], kind: 'ranged', motion: 'shoot', dmg: [7, 12, 18, 27], scale: { aim: 1 }, every: [1.12, 1.04, 0.96, 0.88], range: 410, crit: 8, critBy: 2, knock: 6, pierce: 1, flies: 680, shot: 'arrow', price: 0, says: 'A longbow: an arrow through two.' },
  { id: 'unfinished', name: 'The Unfinished Staff', own: true, icon: 'staff', kinds: ['arcane'], kind: 'magic', motion: 'cast', dmg: [9, 14, 21, 32], scale: { lore: 1 }, every: [1.15, 1.07, 0.99, 0.9], range: 390, crit: 5, critBy: 2, knock: 5, pierce: 1, flies: 430, shot: 'orb-arcane', price: 0, says: 'A bolt that bends to its mark, and on through it.' },
  { id: 'headstails', name: 'Heads and Tails', own: true, icon: 'dagger', kinds: ['blade'], kind: 'melee', motion: 'thrust', dmg: [5, 8, 12, 19], scale: { might: 0.7 }, every: [0.52, 0.48, 0.44, 0.39], range: 82, crit: 20, critBy: 2.5, knock: 4, pierce: 2, price: 0, says: 'A pair of knives: quick, and they often find the gap.' },
  { id: 'hearthbrand', name: 'Hearthbrand', own: true, icon: 'brazier', kinds: ['fire', 'arcane'], kind: 'magic', motion: 'cast', dmg: [8, 12, 18, 27], scale: { lore: 0.8 }, every: [1.35, 1.26, 1.17, 1.08], range: 330, crit: 0, critBy: 2, knock: 8, burst: 58, burn: [3, 5, 8, 12], flies: 400, shot: 'orb-fire', price: 0, says: 'A burning staff: its fire bursts and keeps burning.' },
  { id: 'ninth', name: "The Ninth's Lance", own: true, icon: 'spear', kinds: ['pole'], kind: 'melee', motion: 'thrust', dmg: [10, 16, 24, 37], scale: { might: 1 }, every: [1.2, 1.12, 1.03, 0.94], range: 165, crit: 5, critBy: 2, knock: 20, pierce: 99, price: 0, says: 'A long thrust through everyone in its line.' },
  { id: 'gravecleaver', name: 'Gravecleaver', own: true, icon: 'greataxe', kinds: ['blade', 'blunt'], kind: 'melee', motion: 'sweep', dmg: [16, 25, 38, 58], scale: { might: 1.6 }, every: [1.75, 1.63, 1.51, 1.4], range: 110, crit: 5, critBy: 2, knock: 26, arc: 140, price: 0, says: 'A great axe: slow, wide and heavy.' },
  { id: 'passingbell', name: 'The Passing Bell', own: true, icon: 'censer', kinds: ['holy'], kind: 'magic', motion: 'pulse', dmg: [7, 11, 17, 26], scale: { lore: 0.7 }, every: [3.4, 3.15, 2.9, 2.65], range: 116, crit: 0, critBy: 2, knock: 18, burst: 118, mends: [1, 1, 2, 2], price: 0, says: 'A ring of sound that throws them back and mends the band.' },
  { id: 'widowstear', name: "Widow's Tear", own: true, icon: 'frost', kinds: ['frost', 'arcane'], kind: 'magic', motion: 'cast', dmg: [6, 9, 14, 21], scale: { lore: 0.7 }, every: [1.2, 1.12, 1.04, 0.95], range: 370, crit: 0, critBy: 2, knock: 2, pierce: 2, slow: 0.4, flies: 460, shot: 'orb-frost', price: 0, says: 'A wand of ice: slows three in a line.' },
  { id: 'morningstar', name: 'Morningstar', own: true, icon: 'hammer', kinds: ['blunt', 'holy'], kind: 'melee', motion: 'slam', dmg: [13, 20, 31, 47], scale: { might: 1.3 }, every: [1.6, 1.49, 1.38, 1.27], range: 100, crit: 0, critBy: 2, knock: 10, burst: 62, stun: 0.8, price: 0, says: 'A hammer: stuns everyone where it lands.' },
];

/** The hero levels at which their own weapon grows a tier by itself. */
export const OWN_GROWS = [5, 10, 15] as const;

/** The tier a hero's own weapon stands at, at a level. */
export function ownTier(level: number): number {
  return OWN_GROWS.filter((l) => level >= l).length;
}

// ---------------------------------------------------------------- quirks

/** The numbers of each quirk. Each was where the design put it, and then set by measuring. */
export const QUIRKS = {
  standfast: {
    /** Seconds he has to stand before the shield is set. */
    after: 0.45,
    /** The share of a blow that gets through a set shield. */
    lets: 0.6,
    /** How much more often his own sword strikes behind it. */
    faster: 1.25,
  },
  unseen: {
    /** What each second untouched adds to her harm, and the most it comes to. */
    each: 0.04,
    most: 0.6,
  },
  echo: {
    /** Every this many spells, one is cast twice. */
    every: 3,
    /** How many more choices a level offers him. */
    choices: 1,
  },
  sticky: {
    /** The chance a blow of his own knives knocks a coin loose. */
    chance: 0.04,
    /** How many coins held are one hundredth more harm, and the most it comes to. */
    coins: 10,
    most: 0.6,
  },
  kindling: {
    /** How wide what dies burning bursts, and how many seconds of its fire the burst does at once. */
    r: 64,
    harm: 2,
    /** Seconds the burst leaves its neighbors burning. */
    burns: 3,
  },
  momentum: {
    /** Seconds of running to her full harm, and how much more that is. */
    seconds: 3,
    most: 0.3,
    /** How long she can stand before it is lost. */
    slack: 0.3,
  },
  unburied: {
    /** How much more he hits at the edge of death. */
    most: 0.45,
    /** The share of his health he gets up with, how wide the burst is and how many of his blows it is worth. */
    rises: 0.34,
    r: 150,
    harm: 3,
  },
  shepherd: {
    /** How near him a companion strikes faster, and by how much. */
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

export const MOVES: readonly MoveDef[] = [
  { id: 'rush', name: 'Shield Rush', says: 'He runs the way he faces, throwing aside and stunning all he meets.', reach: 170, harm: 2.5, r: 36, seconds: 0.42, stun: 1.6 },
  { id: 'rain', name: 'Rain of Arrows', says: 'A marked ring of ground is rained on for three seconds.', reach: 430, harm: 0.55, r: 125, seconds: 3, stun: 0 },
  { id: 'starfall', name: 'Starfall', says: 'Stars fall on the thickest of them.', reach: 450, harm: 1.7, r: 68, seconds: 1.2, stun: 0.3 },
  { id: 'vanish', name: 'Vanish', says: 'Two seconds unseen. Enemies lose him, and his next blows are critical.', reach: 120, harm: 0, r: 0, seconds: 2, stun: 0 },
  { id: 'wildfire', name: 'Wildfire', says: 'A ring of fire runs out from her.', reach: 250, harm: 2, r: 330, seconds: 5, stun: 0 },
  { id: 'charge', name: 'Charge', says: 'A long run through whatever is in the way.', reach: 240, harm: 3, r: 38, seconds: 0.6, stun: 0.4 },
  { id: 'warcry', name: 'War Cry', says: 'Those near him flee for two seconds, and his blows heal him for four.', reach: 210, harm: 0, r: 300, seconds: 3, stun: 0.6 },
  { id: 'toll', name: 'Toll', says: 'The bell heals the band and stuns all who hear it.', reach: 250, harm: 1.5, r: 320, seconds: 0, stun: 1.6 },
  { id: 'whiteout', name: 'Whiteout', says: 'Everything on the field freezes for two seconds.', reach: 420, harm: 0, r: 0, seconds: 2, stun: 2 },
  { id: 'judgment', name: 'Judgment', says: 'A hammer of light falls where the enemy is thickest.', reach: 430, harm: 3, r: 165, seconds: 4, stun: 1.3 },
];

/** The numbers every move shares. */
export const MOVE = {
  /** Kills that fill the fury bar on the first wave, and how many more each wave after: the waves grow. */
  kills: 16,
  more: 9,
  /** What a blow on a captain adds to the bar: there is little else to kill beside one. */
  bossBlow: 0.006,
  /** A move that goes off by itself waits for this many in its reach, or a captain, or the hero in trouble. */
  crowd: 4,
  /** Under this share of health a move goes off for one enemy in reach. */
  trouble: 0.35,
  /** Seconds the ground is marked before something lands on it. */
  warn: 0.45,
  /** How many times a hero's speed a rush or a charge is. */
  dash: 3.4,
  /** How many stars a starfall is. */
  stars: 6,
  /** How far off the thickest of them is looked for, for the moves that land there. */
  cluster: 110,
  /** A captain is stunned or frozen for this share of what the rest are. */
  bossShare: 0.3,
  /** The share of health a toll gives back to the hero and to each of the band. */
  tollMends: 0.25,
} as const;
