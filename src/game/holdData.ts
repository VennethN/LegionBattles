// The Hold: what a player keeps and grows between runs. These are its
// lists and its numbers. The rules that use them are in hold.ts.
//
// Renown is what every run pays, whatever became of it. It buys what the
// Hold sells: a hero or a companion whose deed has not been done, a second
// place in the band, crates for the armory, and blessings. Nothing here
// makes a hero much stronger: it makes later runs have more in them.

import type { Feat } from './data';

// ---------------------------------------------------------------- renown

export const RENOWN = {
  /** For each wave come through. */
  wave: 2,
  /** For each captain beaten in the run. */
  captain: 10,
  /** For coming through the twentieth wave. */
  win: 25,
  /** For a deed, where the deed does not name its own. */
  deed: 15,
  /** How much more of all of it each step of danger pays. */
  danger: 0.25,
};

// ---------------------------------------------------------------- the hall and the kennels

/**
 * What a hero costs who has not been opened by their deed. The deed is
 * always the better way: a price is two or three runs' renown, so that
 * nobody is stuck behind a deed they cannot do.
 */
export const HALL: Record<string, number> = {
  orrin: 50,
  fenn: 70,
  nan: 90,
  isaura: 80,
  hroth: 110,
  aldous: 130,
  ysolde: 150,
  maren: 200,
};

/** What a companion costs, the same way. */
export const KENNEL: Record<string, number> = {
  biscuit: 20,
  pip: 30,
  mossback: 60,
  quill: 50,
  greta: 80,
  ember: 90,
  tam: 130,
  thistle: 120,
};

/** What the second place in the band costs. It is the first thing most players will buy. */
export const PLACE_PRICE = 100;

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
}

const w = (id: string): Thing => ({ kind: 'weapon', id });
const i = (id: string): Thing => ({ kind: 'item', id });
const r = (id: string): Thing => ({ kind: 'relic', id });

/**
 * The crates. Whatever is in none of them is in the armory from the
 * start: enough for a good first run (a dozen weapons of every way of
 * fighting, wares of every rarity, ten relics). A crate is a theme: buying
 * one makes a kind of run possible that was not before.
 */
export const CRATES: readonly CrateDef[] = [
  { id: 'fletcher', name: "The Fletcher's Crate", says: 'Bows, and what makes one shot two.', things: [w('longbow'), w('rimebow'), w('blowpipe'), i('quiver'), r('twinquiver')] },
  { id: 'chandler', name: "The Chandler's Crate", says: 'Powder, oil and everything that burns.', things: [w('bomb'), w('brazier'), w('sunbrand'), i('keg'), r('bellows'), r('emberheart')] },
  { id: 'winter', name: 'The Winter Crate', says: 'Packed in straw and still cold.', things: [w('trident'), w('hail'), i('cloak'), r('frostbite')] },
  { id: 'reliquary', name: 'The Reliquary', says: 'What the chapel kept under the altar.', things: [w('mace'), w('holywater'), i('relic'), r('bowl'), r('fallen')] },
  { id: 'apothecary', name: "The Apothecary's Crate", says: 'Do not open the green jars.', things: [w('venom'), w('gourd'), w('fang'), r('spade')] },
  { id: 'armorer', name: "The Armorer's Crate", says: 'Heavy iron, and a stone to keep it keen.', things: [w('greataxe'), w('halberd'), w('hatchet'), i('gauntlets'), r('ageswhet'), r('mirror')] },
  { id: 'scholar', name: "The Scholar's Crate", says: 'Glass, sand and things that count.', things: [w('wand'), i('spyglass'), i('hourglass'), r('stormglass'), r('sands')] },
  { id: 'gambler', name: "The Gambler's Crate", says: 'Everything in it is a wager.', things: [i('crown'), i('lodestone'), r('bonedice'), r('crown'), r('tithe')] },
  { id: 'wayfarer', name: "The Wayfarer's Crate", says: 'Maps, spurs and a horn to be heard by.', things: [i('horn'), r('oldmap'), r('spurs')] },
];

/** What the first crate bought costs, the second, and so on: whichever they are. The player picks the order. */
export const CRATE_PRICES: readonly number[] = [30, 40, 55, 70, 85, 100, 115, 130, 150];

/** A thing's name in a run's list of what is shut to it. */
export const thingKey = (t: Thing): string => `${t.kind}:${t.id}`;

// ---------------------------------------------------------------- blessings

export type BlessingId = 'purse' | 'quarter' | 'hearty' | 'study' | 'path' | 'breath';

export interface BlessingDef {
  id: BlessingId;
  name: string;
  /** What each step costs. */
  prices: readonly number[];
  /** What each step gives in all, in the blessing's own measure. */
  by: readonly number[];
  /** What a step gives, said with its number. */
  says: (by: number) => string;
}

/**
 * The blessings: a few lasting gifts in steps. Each is small, and each is
 * felt in the first minute of a run, not in a line of sums.
 */
export const BLESSINGS: readonly BlessingDef[] = [
  { id: 'purse', name: 'A Full Purse', prices: [20, 40, 80], by: [10, 20, 30], says: (by) => `A run begins with ${by} coins.` },
  { id: 'hearty', name: 'Hearth Bread', prices: [20, 40, 80], by: [2, 4, 6], says: (by) => `${by} more health.` },
  { id: 'study', name: "Old Soldiers' Tales", prices: [20, 40, 80], by: [6, 12, 18], says: (by) => `${by}% more experience.` },
  { id: 'quarter', name: "The Quartermaster's Favor", prices: [50, 120], by: [1, 2], says: (by) => (by === 1 ? 'The first look at other wares in each camp is free.' : 'The first two looks at other wares in each camp are free.') },
  { id: 'path', name: 'The Third Road', prices: [100], by: [1], says: () => 'Three roads to choose from, not two.' },
  { id: 'breath', name: 'A Second Breath', prices: [300], by: [1], says: () => 'Once in a run, a killing blow leaves the hero standing.' },
];

/** A Second Breath: the share of their health the hero gets up with, and how long nothing can hurt them. */
export const BREATH = { rises: 0.35, grace: 1.5 };

// ---------------------------------------------------------------- danger

export interface DangerDef {
  /** 1 to 5. Danger 0 is the game as it is. */
  n: number;
  name: string;
  says: string;
}

/** Each danger adds its rule to all the ones below it. */
export const DANGERS: readonly DangerDef[] = [
  { n: 1, name: 'Forced March', says: 'They come a tenth quicker.' },
  { n: 2, name: 'Lean Coffers', says: 'Everything in the camp costs a fifth more.' },
  { n: 3, name: 'Champions Abroad', says: 'A champion walks in every wave from the third.' },
  { n: 4, name: 'Second Wind', says: 'A captain that falls gets up once.' },
  { n: 5, name: 'The Long Dark', says: 'Mending gives half, and they are sturdier.' },
];

export const DANGER = {
  /** 1: how many times as fast they walk. */
  quick: 1.1,
  /** 2: how many times the price of wares and of other wares. */
  prices: 1.2,
  /** 3: the first wave a champion walks in, and the share of the wave's time at which it is marked. */
  champion: { from: 3, at: 0.4 },
  /** 4: the share of its health a captain gets up with, and how long it is down first. */
  wind: 0.4,
  windStun: 1.4,
  /** 5: the share of mending that is had, and how many times the health they have. */
  mend: 0.5,
  hp: 1.15,
};

// ---------------------------------------------------------------- deeds

/**
 * What a deed asks. The first five are the ones heroes and companions are
 * opened by (data.ts); the rest are asked of a run as it stands or as it
 * ended.
 */
export type DeedTest =
  | Feat
  /** A run won: the twentieth wave come through. With one hero if named, at this danger or above if given. */
  | { kind: 'win'; hero?: string; danger?: number }
  /** Won with this many different heroes. */
  | { kind: 'wins'; heroes: number }
  /** Won with nobody in the band. */
  | { kind: 'alone' }
  /** This many weapons of one kind in hand at once. */
  | { kind: 'kinds'; held: number }
  /** This many relics held at once. */
  | { kind: 'relics'; held: number }
  /** A captain beaten in a wave in which no blow landed on the hero. */
  | { kind: 'unstruck' }
  /** A hero's level in one run. */
  | { kind: 'level'; level: number }
  /** A bond with a companion taken to its last step. */
  | { kind: 'bond' }
  /** This many coins in hand at once. */
  | { kind: 'purse'; gold: number }
  /** A weapon joined up to its last tier. */
  | { kind: 'tier' }
  /** Every kind of road come through at least once. */
  | { kind: 'roads' };

export interface DeedDef {
  id: string;
  name: string;
  /** What has to be done, in a line. */
  says: string;
  test: DeedTest;
  /** What it pays, once. */
  renown: number;
}

const HERO_NAMES: ReadonlyArray<readonly [string, string]> = [
  ['bram', 'Bram'], ['wren', 'Wren'], ['orrin', 'Orrin'], ['fenn', 'Fenn'], ['nan', 'Old Nan'], ['isaura', 'Isaura'], ['hroth', 'Hroth'], ['aldous', 'Aldous'], ['ysolde', 'Ysolde'], ['maren', 'Maren'],
];

/**
 * The deeds that pay renown, once each. Those that open a hero or a
 * companion are not here: they are on the hero and the companion, and
 * what they pay is who they open. There is always a next one to go for:
 * some are done in a first evening, some ask for a win at the last danger.
 */
export const DEEDS: readonly DeedDef[] = [
  { id: 'wave5', name: 'Still Standing', says: 'Come through the fifth wave.', test: { kind: 'wave', wave: 5 }, renown: 10 },
  { id: 'wave10', name: 'Half the Road', says: 'Come through the tenth wave.', test: { kind: 'wave', wave: 10 }, renown: 15 },
  { id: 'wave15', name: 'Into the Snow', says: 'Come through the fifteenth wave.', test: { kind: 'wave', wave: 15 }, renown: 20 },
  { id: 'warlord', name: 'The Warlord Falls', says: 'Beat the Warlord.', test: { kind: 'boss', boss: 'warlord' }, renown: 15 },
  { id: 'colossus', name: 'The Colossus Falls', says: 'Beat the Colossus.', test: { kind: 'boss', boss: 'colossus' }, renown: 20 },
  { id: 'jarl', name: 'The Jarl Falls', says: 'Beat the Jarl.', test: { kind: 'boss', boss: 'jarl' }, renown: 25 },
  { id: 'kills1', name: 'A Thousand', says: 'Fell a thousand, over all runs.', test: { kind: 'kills', kills: 1000 }, renown: 10 },
  { id: 'kills2', name: 'Five Thousand', says: 'Fell five thousand, over all runs.', test: { kind: 'kills', kills: 5000 }, renown: 15 },
  { id: 'kills3', name: 'A Legion', says: 'Fell twenty thousand, over all runs.', test: { kind: 'kills', kills: 20000 }, renown: 25 },
  { id: 'runs10', name: 'Ten Times Out', says: 'End ten runs.', test: { kind: 'runs', runs: 10 }, renown: 10 },
  { id: 'runs40', name: 'An Old Hand', says: 'End forty runs.', test: { kind: 'runs', runs: 40 }, renown: 20 },
  { id: 'level15', name: 'Seasoned', says: 'Reach level fifteen in one run.', test: { kind: 'level', level: 15 }, renown: 15 },
  { id: 'purse', name: 'Deep Pockets', says: 'Hold three hundred coins at once.', test: { kind: 'purse', gold: 300 }, renown: 15 },
  { id: 'kinds4', name: 'Of a Kind', says: 'Hold four weapons of one kind.', test: { kind: 'kinds', held: 4 }, renown: 15 },
  { id: 'tier', name: 'Masterwork', says: 'Join a weapon up to its last tier.', test: { kind: 'tier' }, renown: 15 },
  { id: 'relics5', name: 'A Collector', says: 'Hold five relics in one run.', test: { kind: 'relics', held: 5 }, renown: 10 },
  { id: 'relics8', name: 'A Hoard', says: 'Hold eight relics in one run.', test: { kind: 'relics', held: 8 }, renown: 20 },
  { id: 'bond', name: 'Fast Friends', says: 'Take a bond with a companion to its last step.', test: { kind: 'bond' }, renown: 15 },
  { id: 'roads', name: 'Every Road', says: 'Come through every kind of road.', test: { kind: 'roads' }, renown: 15 },
  { id: 'unstruck', name: 'Untouched', says: 'Beat a captain without one blow landing on the hero in that wave.', test: { kind: 'unstruck' }, renown: 25 },
  { id: 'win', name: 'The Morning', says: 'Come through the twentieth wave.', test: { kind: 'win' }, renown: 30 },
  { id: 'alone', name: 'The Last Stander', says: 'Win a run with nobody in the band.', test: { kind: 'alone' }, renown: 30 },
  { id: 'wins5', name: 'Five Banners', says: 'Win with five different heroes.', test: { kind: 'wins', heroes: 5 }, renown: 30 },
  ...HERO_NAMES.map(([hero, name]): DeedDef => ({ id: `win-${hero}`, name: `${name}'s Morning`, says: `Win a run as ${name}.`, test: { kind: 'win', hero }, renown: 20 })),
  ...[1, 2, 3, 4, 5].map((danger): DeedDef => ({ id: `danger${danger}`, name: `Danger ${danger}`, says: `Win a run at danger ${danger}.`, test: { kind: 'win', danger }, renown: 20 + danger * 10 })),
];
