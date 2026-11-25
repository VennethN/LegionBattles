// The Hold: what a player keeps and grows between runs. These are its
// lists and its numbers. The rules that use them are in hold.ts.
//
// What makes a hero stronger for good is their own mastery (mastery.ts):
// every run pays it to the hero who played it. Besides that, every run has
// a next thing to go for: a quest, a companion to unlock, a crate's own
// deed, a vow to win under, the day's road.

import type { Count, Feat } from './data';

// ---------------------------------------------------------------- what this file names

/**
 * Every name of another list that this file leans on, in one place: the
 * captains and the kinds of weapon. A quest or a crate names them through
 * here, so that one renamed elsewhere is one line to change.
 * `tests/hold.test.ts` holds each to being a name the game has.
 */
export const REF = {
  captain: { first: 'warlord', second: 'mirelord', third: 'colossus' },
  kind: { bow: 'bow', fire: 'fire', frost: 'frost', holy: 'holy', arcane: 'arcane' },
} as const;

// ---------------------------------------------------------------- deeds, as they are asked

/**
 * What a deed asks. The first five are the ones heroes and companions are
 * opened by (data.ts); the rest are asked of a run as it stands or as it
 * ended.
 */
export type DeedTest =
  | Feat
  /** A run won: the hundredth wave come through. Under at least this many vows, if given. */
  | { kind: 'win'; vows?: number }
  /** Won with this many different heroes. */
  | { kind: 'wins'; heroes: number }
  /** Won with nobody in the band. */
  | { kind: 'alone' }
  /** This many weapons of one kind in hand at once: of this kind, if one is named. */
  | { kind: 'kinds'; held: number; of?: string }
  /** This many relics held at once. */
  | { kind: 'relics'; held: number }
  /** A captain beaten in a wave in which no blow landed on the hero. */
  | { kind: 'unstruck' }
  /** This many waves of one run come through with no blow landed, past the first land. */
  | { kind: 'clean'; waves: number }
  /** This many felled in one run. */
  | { kind: 'slain'; kills: number }
  /** This wave come through in a run in which the hero got up from a killing blow. */
  | { kind: 'risen'; wave: number }
  /** A hero's level in one run. */
  | { kind: 'level'; level: number }
  /** A bond with a companion taken to its last step. */
  | { kind: 'bond' }
  /** This many coins in hand at once. */
  | { kind: 'purse'; gold: number }
  /** A weapon joined up to its last tier. */
  | { kind: 'tier' }
  /** Every kind of road come through at least once, or this many kinds of them. */
  | { kind: 'roads'; count?: number }
  /** This many of something a run counts of the way its hero was played (heroes.ts, COUNTS). */
  | { kind: 'count'; of: Count; n: number }
  /** A wave cleared with under 15% HP left. */
  | { kind: 'brink' };

// ---------------------------------------------------------------- the armory

/** A thing a run can offer: a weapon, a ware or a relic. A ware and a relic may share a name, so the kind is said. */
export interface Thing {
  kind: 'weapon' | 'item' | 'relic';
  id: string;
}

export interface CrateDef {
  id: string;
  name: string;
  /** Whose it was, in a few words. */
  says: string;
  things: readonly Thing[];
  /** The deed that unlocks it, and that deed as a line a player reads: playing a way unlocks more of that way. */
  deed: DeedTest;
  deedSays: string;
}

const w = (id: string): Thing => ({ kind: 'weapon', id });
const i = (id: string): Thing => ({ kind: 'item', id });
const r = (id: string): Thing => ({ kind: 'relic', id });

/**
 * The crates. Whatever is in none of them is in the armory from the
 * start: enough for a good first run (a dozen weapons of every way of
 * fighting, wares of every rarity, ten relics). A crate is a theme, and it
 * is unlocked by its deed: playing a way unlocks more of that way.
 */
export const CRATES: readonly CrateDef[] = [
  { id: 'fletcher', name: "The Fletcher's Crate", says: 'Bows, and a relic that splits shots.', things: [w('longbow'), w('rimebow'), w('blowpipe'), i('quiver'), r('twinquiver')], deed: { kind: 'kinds', held: 3, of: REF.kind.bow }, deedSays: 'Hold 3 Bow weapons in one run.' },
  { id: 'chandler', name: "The Chandler's Crate", says: 'Bombs, fire and things that burn.', things: [w('bomb'), w('brazier'), w('sunbrand'), i('keg'), r('bellows'), r('emberheart')], deed: { kind: 'kinds', held: 3, of: REF.kind.fire }, deedSays: 'Hold 3 Fire weapons in one run.' },
  { id: 'winter', name: 'The Winter Crate', says: 'Frost weapons, packed in straw and still cold.', things: [w('trident'), w('hail'), i('cloak'), r('frostbite')], deed: { kind: 'kinds', held: 3, of: REF.kind.frost }, deedSays: 'Hold 3 Frost weapons in one run.' },
  { id: 'reliquary', name: 'The Reliquary', says: 'Holy weapons and relics from under the altar.', things: [w('mace'), w('holywater'), i('relic'), r('bowl'), r('fallen')], deed: { kind: 'kinds', held: 3, of: REF.kind.holy }, deedSays: 'Hold 3 Holy weapons in one run.' },
  { id: 'apothecary', name: "The Apothecary's Crate", says: 'Poison weapons. Do not open the green jars.', things: [w('venom'), w('gourd'), w('fang'), r('spade')], deed: { kind: 'kills', kills: 5000 }, deedSays: 'Kill 5000 enemies in total.' },
  { id: 'armorer', name: "The Armorer's Crate", says: 'Heavy weapons, and a stone that sharpens them.', things: [w('greataxe'), w('halberd'), w('hatchet'), i('gauntlets'), r('ageswhet'), r('mirror')], deed: { kind: 'tier' }, deedSays: 'Upgrade a weapon to tier IV.' },
  { id: 'scholar', name: "The Scholar's Crate", says: 'A wand, lenses and hourglasses.', things: [w('wand'), i('spyglass'), i('hourglass'), r('stormglass'), r('sands')], deed: { kind: 'level', level: 15 }, deedSays: 'Reach level 15 in one run.' },
  { id: 'gambler', name: "The Gambler's Crate", says: 'High-risk items and relics.', things: [i('crown'), i('lodestone'), r('bonedice'), r('crown'), r('tithe')], deed: { kind: 'purse', gold: 300 }, deedSays: 'Hold 300 coins at once.' },
  { id: 'wayfarer', name: "The Wayfarer's Crate", says: 'A map, spurs and a war horn.', things: [i('horn'), r('oldmap'), r('spurs')], deed: { kind: 'roads', count: 8 }, deedSays: 'Clear 8 different kinds of road.' },
];

/** A thing's name in a run's list of what is shut to it. */
export const thingKey = (t: Thing): string => `${t.kind}:${t.id}`;

// ---------------------------------------------------------------- what a run is given

/**
 * What a run is given to begin with, besides its hero: the stat steps and
 * skill of the hero's mastery (mastery.ts), and their passives. The other
 * fields are gifts the game has had and may have again (coins to start
 * with, free rerolls, bans, a third road, a second look at relics, a
 * revive); nothing gives them now, and they are 0.
 */
export interface Boons {
  stats: Partial<Record<'maxHp' | 'damage' | 'haste' | 'speed' | 'armor' | 'pickup' | 'luck', number>>;
  gold: number;
  xp: number;
  fury: number;
  bandHp: number;
  bandDmg: number;
  bandUp: number;
  reroll: number;
  banish: number;
  road: number;
  relook: number;
  breath: number;
  /** A share more skill damage, a share wider skill, and the share of the Fury bar left after the skill (mastery.ts). */
  harm: number;
  area: number;
  again: number;
  /** The hero's passives past their first, by name (mastery.ts, PERKS). */
  perks: string[];
}

export const noBoons = (): Boons => ({ stats: {}, gold: 0, xp: 0, fury: 0, bandHp: 0, bandDmg: 0, bandUp: 0, reroll: 0, banish: 0, road: 0, relook: 0, breath: 0, harm: 0, area: 0, again: 0, perks: [] });

/** A revive: the share of their health the hero gets up with, and how long nothing can hurt them. */
export const BREATH = { rises: 0.35, grace: 1.5 };

/** The least a fallen companion's wait can come down to, as a share of what it was. */
export const BAND_UP_LEAST = 0.4;

// ---------------------------------------------------------------- vows

export type VowId = 'march' | 'lean' | 'famine' | 'champions' | 'hand' | 'dusk' | 'wounds' | 'wind';

export interface VowDef {
  id: VowId;
  name: string;
  says: string;
}

/**
 * The vows: hard rules a player swears before a run, in any mix. Each is a
 * thing that is felt and can be played round, not a share more of
 * everything. They are listed in the order they are opened: the first
 * three by a first win, two more for each vow a win was sworn under.
 */
export const VOWS: readonly VowDef[] = [
  { id: 'march', name: 'Double Time', says: 'Enemies move 15% faster.' },
  { id: 'lean', name: 'Lean Coffers', says: 'Everything in the shop costs 20% more.' },
  { id: 'famine', name: 'Bare Fields', says: 'Enemies drop no hearts.' },
  { id: 'champions', name: 'Champions Abroad', says: 'A champion joins every wave from wave 3.' },
  { id: 'hand', name: 'One Hand Fewer', says: '1 less weapon slot.' },
  { id: 'dusk', name: 'The Early Dark', says: 'Every wave is at night: it is dark, and enemies move 20% faster.' },
  { id: 'wounds', name: 'Open Wounds', says: 'No healing between waves: you start each wave with the HP you had left.' },
  { id: 'wind', name: 'Second Wind', says: 'Every boss revives once with 40% HP.' },
];

export const VOW = {
  /** How many are opened by a first win, and how many more for each vow a win was sworn under. */
  first: 3,
  more: 2,
  /** Forced March: how many times as fast they walk. */
  quick: 1.15,
  /** Lean Coffers: how many times the price of wares and of other wares. */
  prices: 1.2,
  /** Champions Abroad: the first wave a champion walks in, and the share of the wave's time at which it is marked. */
  champion: { from: 3, at: 0.4 },
  /** One Hand Fewer: how many hands are lost. */
  hands: 1,
  /** Second Wind: the share of its health a captain gets up with, and how long it is down first. */
  wind: 0.4,
  windStun: 1.4,
};

// ---------------------------------------------------------------- deeds

export interface DeedDef {
  id: string;
  name: string;
  /** What has to be done, in a line. */
  says: string;
  test: DeedTest;
  /** The mastery it pays, once, to the hero who did it (mastery.ts). */
  xp: number;
}

/**
 * The quests, each paid once in mastery to the hero who did it. Those that
 * unlock a hero or a companion are not here: they are on the hero and the
 * companion. There is always a next one to go for: some are done in a
 * first evening, some ask for a win under every vow.
 */
export const DEEDS: readonly DeedDef[] = [
  { id: 'wave5', name: 'Still Standing', says: 'Clear wave 10.', test: { kind: 'wave', wave: 10 }, xp: 10 },
  { id: 'wave10', name: 'Into the Mire', says: 'Clear wave 25.', test: { kind: 'wave', wave: 25 }, xp: 15 },
  { id: 'wave15', name: 'Half the Road', says: 'Clear wave 50.', test: { kind: 'wave', wave: 50 }, xp: 25 },
  { id: 'wave75', name: 'Far From Home', says: 'Clear wave 75.', test: { kind: 'wave', wave: 75 }, xp: 40 },
  { id: 'captain1', name: 'The First Boss', says: 'Beat the boss of wave 10.', test: { kind: 'boss', boss: REF.captain.first }, xp: 15 },
  { id: 'captain2', name: 'The Second Boss', says: 'Beat the boss of wave 20.', test: { kind: 'boss', boss: REF.captain.second }, xp: 20 },
  { id: 'captain3', name: 'The Third Boss', says: 'Beat the boss of wave 30.', test: { kind: 'boss', boss: REF.captain.third }, xp: 25 },
  { id: 'kills1', name: 'A Thousand', says: 'Kill 1000 enemies in total.', test: { kind: 'kills', kills: 1000 }, xp: 10 },
  { id: 'kills2', name: 'Five Thousand', says: 'Kill 5000 enemies in total.', test: { kind: 'kills', kills: 5000 }, xp: 15 },
  { id: 'kills3', name: 'A Legion', says: 'Kill 20000 enemies in total.', test: { kind: 'kills', kills: 20000 }, xp: 25 },
  { id: 'runs10', name: 'Ten Times Out', says: 'Finish 10 runs.', test: { kind: 'runs', runs: 10 }, xp: 10 },
  { id: 'runs40', name: 'An Old Hand', says: 'Finish 40 runs.', test: { kind: 'runs', runs: 40 }, xp: 20 },
  { id: 'level15', name: 'Seasoned', says: 'Reach level 15 in one run.', test: { kind: 'level', level: 15 }, xp: 15 },
  { id: 'purse', name: 'Deep Pockets', says: 'Hold 300 coins at once.', test: { kind: 'purse', gold: 300 }, xp: 15 },
  { id: 'kinds4', name: 'Of a Kind', says: 'Hold 4 weapons of one type.', test: { kind: 'kinds', held: 4 }, xp: 15 },
  { id: 'tier', name: 'Masterwork', says: 'Upgrade a weapon to tier IV.', test: { kind: 'tier' }, xp: 15 },
  { id: 'relics5', name: 'A Collector', says: 'Hold 5 relics in one run.', test: { kind: 'relics', held: 5 }, xp: 10 },
  { id: 'relics8', name: 'A Hoard', says: 'Hold 8 relics in one run.', test: { kind: 'relics', held: 8 }, xp: 20 },
  { id: 'bond', name: 'Fast Friends', says: 'Max out your bond with a companion.', test: { kind: 'bond' }, xp: 15 },
  { id: 'roads', name: 'Every Road', says: 'Clear every kind of road.', test: { kind: 'roads' }, xp: 15 },
  { id: 'unstruck', name: 'Untouched', says: 'Beat a boss without getting hit in that wave.', test: { kind: 'unstruck' }, xp: 25 },
  { id: 'win', name: 'The Morning', says: 'Clear wave 100.', test: { kind: 'win' }, xp: 100 },
  { id: 'alone', name: 'The Last Stander', says: 'Win a run with no companions.', test: { kind: 'alone' }, xp: 30 },
  { id: 'wins5', name: 'Five Banners', says: 'Win with 5 different heroes.', test: { kind: 'wins', heroes: 5 }, xp: 30 },
  { id: 'wins10', name: 'Every Banner', says: 'Win with every hero.', test: { kind: 'wins', heroes: 10 }, xp: 50 },
  { id: 'vows1', name: 'Sworn', says: 'Win a run with 1 vow.', test: { kind: 'win', vows: 1 }, xp: 30 },
  { id: 'vows2', name: 'Twice Sworn', says: 'Win a run with 2 vows.', test: { kind: 'win', vows: 2 }, xp: 40 },
  { id: 'vows4', name: 'Oathbound', says: 'Win a run with 4 vows.', test: { kind: 'win', vows: 4 }, xp: 60 },
  { id: 'vows8', name: 'Every Vow', says: 'Win a run with all 8 vows.', test: { kind: 'win', vows: 8 }, xp: 100 },
];
