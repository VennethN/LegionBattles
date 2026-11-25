// The Hold: what a player keeps and grows between runs. These are its
// lists and its numbers. The rules that use them are in hold.ts.
//
// Renown is what every run pays, whatever became of it. It buys what the
// Hold sells: a hero or a companion whose deed has not been done, a second
// place in the band, crates for the armory, and places on the board,
// which make a hero stronger for good. Besides what renown buys, every
// run has a next thing to go for (a deed, an oath of the hero's, a
// crate's own deed, a vow to win under, the day's road).

import type { Count, Feat } from './data';

// ---------------------------------------------------------------- what this file names

/**
 * Every name of another list that this file leans on, in one place: the
 * captains, the kinds of weapon, the relics a hero may begin with. A deed
 * or an oath names them through here, so that one renamed elsewhere is one
 * line to change. `tests/hold.test.ts` holds each to being a name the game
 * has.
 */
export const REF = {
  captain: { first: 'warlord', second: 'colossus', third: 'jarl' },
  kind: { bow: 'bow', fire: 'fire', frost: 'frost', holy: 'holy', arcane: 'arcane' },
  relic: {
    bram: 'thornmail', wren: 'horn', orrin: 'stormglass', fenn: 'magpie', nan: 'bellows', isaura: 'spurs', hroth: 'lastcandle', aldous: 'whistle', ysolde: 'frostbite', maren: 'fallen',
  },
} as const;

// ---------------------------------------------------------------- renown

export const RENOWN = {
  /** For each wave come through. */
  wave: 2,
  /** For each captain beaten in the run. */
  captain: 10,
  /** For coming through the twentieth wave. */
  win: 25,
  /** How much more of all of it each vow sworn pays. */
  vow: 0.2,
};

// ---------------------------------------------------------------- the hall and the kennels

/**
 * What a hero costs who has not been opened by their deed. The deed is
 * always the better way: a price is two to five good runs' renown, more
 * than a crate or a place on the board asks, so that it is paid only by someone
 * stuck behind a deed they cannot do.
 */
export const HALL: Record<string, number> = {
  orrin: 120,
  fenn: 150,
  nan: 180,
  isaura: 220,
  hroth: 280,
  aldous: 320,
  ysolde: 260,
  maren: 400,
};

/** What a companion costs, the same way. */
export const KENNEL: Record<string, number> = {
  biscuit: 60,
  pip: 90,
  mossback: 150,
  quill: 130,
  greta: 200,
  ember: 180,
  tam: 240,
  thistle: 350,
};

/** What the second place in the band costs. It is the first thing most players will buy. */
export const PLACE_PRICE = 100;

// ---------------------------------------------------------------- deeds, as they are asked

/**
 * What a deed asks. The first five are the ones heroes and companions are
 * opened by (data.ts); the rest are asked of a run as it stands or as it
 * ended.
 */
export type DeedTest =
  | Feat
  /** A run won: the twentieth wave come through. Under at least this many vows, if given. */
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
  /** This many waves of one run come through with no blow landed. */
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
  | { kind: 'count'; of: Count; n: number };

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
  /** The deed that opens it for nothing, and that deed as a line a player reads: playing a way opens more of that way. */
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
 * is opened by its deed or bought with renown, whichever comes first.
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

/** What a crate costs when this many are open already, however they were opened. The player picks the order. */
export const CRATE_PRICES: readonly number[] = [100, 150, 200, 250, 300, 360, 420, 480, 550];

/** A thing's name in a run's list of what is shut to it. */
export const thingKey = (t: Thing): string => `${t.kind}:${t.id}`;

// ---------------------------------------------------------------- the board

/**
 * What a place on the board gives. A stat is added to the hero's own. The
 * rest are what a run begins with or how it goes: coins, experience and
 * fury as shares more, the band's health, harm and getting up, and the
 * gifts that give a choice (a free look at other wares, a mark to strike a
 * ware from the table, a third road, a second look at a relic's choice,
 * one getting-up in a run).
 */
export type Gift =
  | { kind: 'stat'; stat: 'maxHp' | 'damage' | 'haste' | 'speed' | 'armor' | 'pickup' | 'luck'; by: number }
  | { kind: 'gold' | 'xp' | 'fury' | 'bandHp' | 'bandDmg' | 'bandUp' | 'reroll' | 'banish' | 'road' | 'relook' | 'breath'; by: number };

export type Branch = 'hero' | 'band' | 'purse' | 'fortune';

export interface NodeDef {
  id: string;
  branch: Branch;
  name: string;
  gift: Gift;
  price: number;
  /** The place that has to be owned first, or none for the foot of a branch. */
  needs?: string;
  /** Where a screen draws it: a column and a row of the board, the foot of each branch in the first row. */
  at: { col: number; row: number };
}

export const BRANCHES: ReadonlyArray<{ id: Branch; name: string; says: string }> = [
  { id: 'hero', name: 'Hero', says: 'HP, damage, and one revive.' },
  { id: 'band', name: 'Companions', says: 'Tougher, stronger companions that recover faster.' },
  { id: 'purse', name: 'Coins', says: 'Starting coins, free rerolls and item bans.' },
  { id: 'fortune', name: 'Fortune', says: 'Luck, XP and more choices.' },
];

/** A chain of places down one column: each needs the one above it, and the first needs `from`. */
function chain(branch: Branch, col: number, row: number, from: string | undefined, steps: ReadonlyArray<readonly [string, string, Gift, number]>): NodeDef[] {
  return steps.map(([id, name, gift, price], i): NodeDef => ({ id, branch, name, gift, price, needs: i === 0 ? from : steps[i - 1][0], at: { col, row: row + i } }));
}

const st = (stat: 'maxHp' | 'damage' | 'haste' | 'speed' | 'armor' | 'pickup' | 'luck', by: number): Gift => ({ kind: 'stat', stat, by });
const g = (kind: Exclude<Gift['kind'], 'stat'>, by: number): Gift => ({ kind, by }) as Gift;

/**
 * The board: lasting upgrades bought with renown, each making every later
 * run stronger or giving it a choice. The owner asked for exactly this of
 * a roguelite: "can we add upgrades we can spend on to make permanent per
 * run". Four branches, each grown from its foot; the hero's forks in two,
 * the body and the arm, so there is a choice of where to grow first.
 * Prices rise gently down a branch, each about what a run pays, so that
 * the first thirty runs nearly always leave enough for a place, and the last place of each branch is
 * dear: something to save for. The enemies are not made stronger to take
 * this back: the vows are what a strong player adds to keep it hard.
 */
export const BOARD: readonly NodeDef[] = [
  ...chain('hero', 0, 0, undefined, [['hero-1', 'Hearth Bread', st('maxHp', 3), 30]]),
  ...chain('hero', 0, 1, 'hero-1', [
    ['body-1', 'A Thick Coat', st('maxHp', 3), 50], ['body-2', 'Boiled Leather', st('armor', 1), 65], ['body-3', 'Road Bread', st('maxHp', 4), 80],
    ['body-4', 'Good Boots', st('speed', 4), 95], ['body-5', 'A Mail Shirt', st('armor', 1), 110], ['body-6', 'A Second Breath', g('breath', 1), 1100],
  ]),
  ...chain('hero', 1, 1, 'hero-1', [
    ['arm-1', 'A Keen Edge', st('damage', 4), 50], ['arm-2', 'A Loose Wrist', st('haste', 4), 65], ['arm-3', 'A Heavy Hand', st('damage', 5), 80],
    ['arm-4', 'Drilled', st('haste', 5), 95], ['arm-5', 'A Killing Stroke', st('damage', 6), 110], ['arm-6', 'Quick to Anger', g('fury', 15), 500],
  ]),
  ...chain('band', 2, 0, undefined, [
    ['band-1', 'Well Fed', g('bandHp', 15), 40], ['band-2', 'Sharp Teeth', g('bandDmg', 10), 60], ['band-3', 'On Your Feet', g('bandUp', 25), 75],
    ['band-4', 'Barded', g('bandHp', 20), 90], ['band-5', 'Blooded', g('bandDmg', 15), 110], ['band-6', 'Never Down Long', g('bandUp', 25), 450],
  ]),
  ...chain('purse', 3, 0, undefined, [
    ['purse-1', 'A Full Purse', g('gold', 10), 30], ['purse-2', "The Quartermaster's Favor", g('reroll', 1), 55], ['purse-3', 'A Fuller Purse', g('gold', 15), 70],
    ['purse-4', 'The Black Mark', g('banish', 2), 85], ['purse-5', 'A Heavy Purse', g('gold', 20), 100], ['purse-6', 'The Quartermaster Again', g('reroll', 1), 120],
    ['purse-7', 'A Blacker Mark', g('banish', 2), 550],
  ]),
  ...chain('fortune', 4, 0, undefined, [
    ['fortune-1', 'A Lucky Coin', st('luck', 5), 40], ['fortune-2', "Old Soldiers' Tales", g('xp', 6), 60], ['fortune-3', 'Long Arms', st('pickup', 15), 75],
    ['fortune-4', 'The Third Road', g('road', 1), 110], ['fortune-5', 'A Luckier Coin', st('luck', 8), 120], ['fortune-6', 'More Tales', g('xp', 8), 135],
    ['fortune-7', 'A Second Look', g('relook', 1), 600],
  ]),
];

/** What a gift gives, in words with its number. */
export function giftSays(gift: Gift): string {
  const by = gift.by;
  switch (gift.kind) {
    case 'stat':
      return gift.stat === 'maxHp' ? `+${by} Max HP.` : gift.stat === 'damage' ? `+${by}% Damage.` : gift.stat === 'haste' ? `+${by}% Attack Speed.` : gift.stat === 'speed' ? `+${by}% Move Speed.`
        : gift.stat === 'armor' ? `+${by} Armor.` : gift.stat === 'pickup' ? `+${by}% Pickup Range.` : `+${by}% Luck.`;
    case 'gold':
      return `Start every run with ${by} more coins.`;
    case 'xp':
      return `+${by}% XP.`;
    case 'fury':
      return `Fury fills ${by}% faster.`;
    case 'bandHp':
      return `Companions have ${by}% more HP.`;
    case 'bandDmg':
      return `Companions deal ${by}% more damage.`;
    case 'bandUp':
      return `Downed companions recover ${by}% faster.`;
    case 'reroll':
      return '+1 free reroll in every shop.';
    case 'banish':
      return `+${by} bans per run. A banned item is not offered again that run.`;
    case 'road':
      return '3 roads to choose from instead of 2.';
    case 'relook':
      return 'Once per relic choice, reroll the 3 relics.';
    case 'breath':
      return `Once per run, survive a killing blow with ${Math.round(BREATH.rises * 100)}% HP.`;
  }
}

/** What everything a player owns of the board comes to: a run begins with it. */
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
}

export const noBoons = (): Boons => ({ stats: {}, gold: 0, xp: 0, fury: 0, bandHp: 0, bandDmg: 0, bandUp: 0, reroll: 0, banish: 0, road: 0, relook: 0, breath: 0 });

/** The gifts of these places of the board, added up. */
export function boonsFrom(owned: readonly string[]): Boons {
  const out = noBoons();
  for (const n of BOARD) {
    if (!owned.includes(n.id)) continue;
    if (n.gift.kind === 'stat') out.stats[n.gift.stat] = (out.stats[n.gift.stat] ?? 0) + n.gift.by;
    else out[n.gift.kind] += n.gift.by;
  }
  return out;
}

/** A Second Breath: the share of their health the hero gets up with, and how long nothing can hurt them. */
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
  /** What it pays, once. */
  renown: number;
}

/**
 * The deeds that pay renown, once each. Those that open a hero or a
 * companion are not here: they are on the hero and the companion, and
 * what they pay is who they open. There is always a next one to go for:
 * some are done in a first evening, some ask for a win under every vow.
 */
export const DEEDS: readonly DeedDef[] = [
  { id: 'wave5', name: 'Still Standing', says: 'Clear wave 5.', test: { kind: 'wave', wave: 5 }, renown: 10 },
  { id: 'wave10', name: 'Half the Road', says: 'Clear wave 10.', test: { kind: 'wave', wave: 10 }, renown: 15 },
  { id: 'wave15', name: 'Into the Snow', says: 'Clear wave 15.', test: { kind: 'wave', wave: 15 }, renown: 20 },
  { id: 'captain1', name: 'The First Boss', says: 'Beat the boss of wave 7.', test: { kind: 'boss', boss: REF.captain.first }, renown: 15 },
  { id: 'captain2', name: 'The Second Boss', says: 'Beat the boss of wave 14.', test: { kind: 'boss', boss: REF.captain.second }, renown: 20 },
  { id: 'captain3', name: 'The Third Boss', says: 'Beat the boss of wave 20.', test: { kind: 'boss', boss: REF.captain.third }, renown: 25 },
  { id: 'kills1', name: 'A Thousand', says: 'Kill 1000 enemies in total.', test: { kind: 'kills', kills: 1000 }, renown: 10 },
  { id: 'kills2', name: 'Five Thousand', says: 'Kill 5000 enemies in total.', test: { kind: 'kills', kills: 5000 }, renown: 15 },
  { id: 'kills3', name: 'A Legion', says: 'Kill 20000 enemies in total.', test: { kind: 'kills', kills: 20000 }, renown: 25 },
  { id: 'runs10', name: 'Ten Times Out', says: 'Finish 10 runs.', test: { kind: 'runs', runs: 10 }, renown: 10 },
  { id: 'runs40', name: 'An Old Hand', says: 'Finish 40 runs.', test: { kind: 'runs', runs: 40 }, renown: 20 },
  { id: 'level15', name: 'Seasoned', says: 'Reach level 15 in one run.', test: { kind: 'level', level: 15 }, renown: 15 },
  { id: 'purse', name: 'Deep Pockets', says: 'Hold 300 coins at once.', test: { kind: 'purse', gold: 300 }, renown: 15 },
  { id: 'kinds4', name: 'Of a Kind', says: 'Hold 4 weapons of one type.', test: { kind: 'kinds', held: 4 }, renown: 15 },
  { id: 'tier', name: 'Masterwork', says: 'Upgrade a weapon to tier IV.', test: { kind: 'tier' }, renown: 15 },
  { id: 'relics5', name: 'A Collector', says: 'Hold 5 relics in one run.', test: { kind: 'relics', held: 5 }, renown: 10 },
  { id: 'relics8', name: 'A Hoard', says: 'Hold 8 relics in one run.', test: { kind: 'relics', held: 8 }, renown: 20 },
  { id: 'bond', name: 'Fast Friends', says: 'Max out your bond with a companion.', test: { kind: 'bond' }, renown: 15 },
  { id: 'roads', name: 'Every Road', says: 'Clear every kind of road.', test: { kind: 'roads' }, renown: 15 },
  { id: 'unstruck', name: 'Untouched', says: 'Beat a boss without getting hit in that wave.', test: { kind: 'unstruck' }, renown: 25 },
  { id: 'win', name: 'The Morning', says: 'Clear wave 20.', test: { kind: 'win' }, renown: 30 },
  { id: 'alone', name: 'The Last Stander', says: 'Win a run with no companions.', test: { kind: 'alone' }, renown: 30 },
  { id: 'wins5', name: 'Five Banners', says: 'Win with 5 different heroes.', test: { kind: 'wins', heroes: 5 }, renown: 30 },
  { id: 'wins10', name: 'Every Banner', says: 'Win with every hero.', test: { kind: 'wins', heroes: 10 }, renown: 50 },
  { id: 'vows1', name: 'Sworn', says: 'Win a run with 1 vow.', test: { kind: 'win', vows: 1 }, renown: 30 },
  { id: 'vows2', name: 'Twice Sworn', says: 'Win a run with 2 vows.', test: { kind: 'win', vows: 2 }, renown: 40 },
  { id: 'vows4', name: 'Oathbound', says: 'Win a run with 4 vows.', test: { kind: 'win', vows: 4 }, renown: 60 },
  { id: 'vows8', name: 'Every Vow', says: 'Win a run with all 8 vows.', test: { kind: 'win', vows: 8 }, renown: 100 },
];

// ---------------------------------------------------------------- oaths

/** What an oath opens for its hero: a second epithet for the title, a relic every run of theirs begins with, or a second rule for their own weapon to choose instead of the first. */
export type OathGift = { kind: 'epithet'; epithet: string } | { kind: 'relic'; relic: string } | { kind: 'rule' };

export interface OathDef {
  id: string;
  hero: string;
  name: string;
  says: string;
  /** Asked of a run played as this hero. */
  test: DeedTest;
  opens: OathGift;
}

/**
 * Three oaths for each hero, deeds done as that hero: a win, a win under a
 * vow, and one that is about their quirk. Each opens something of theirs.
 * A hero is told here by a line each, so that another is one line more.
 */
const OATH_LINES: ReadonlyArray<{ hero: string; name: string; epithet: string; quirk: { name: string; says: string; test: DeedTest } }> = [
  { hero: 'bram', name: 'Bram', epithet: 'the Gate That Held', quirk: { name: 'Not One Step', says: 'Beat a boss without getting hit in that wave.', test: { kind: 'unstruck' } } },
  { hero: 'wren', name: 'Wren', epithet: 'the Uncaught', quirk: { name: 'Never Seen', says: 'Clear 5 waves in one run without getting hit.', test: { kind: 'clean', waves: 5 } } },
  { hero: 'orrin', name: 'Orrin', epithet: 'the Finished', quirk: { name: 'The Last Lesson', says: 'Change the form of your staff 10 times in one run.', test: { kind: 'count', of: 'finished', n: 10 } } },
  { hero: 'fenn', name: 'Fenn', epithet: 'the Rich', quirk: { name: 'Heads Every Time', says: 'Win 6 coin flips in one run.', test: { kind: 'count', of: 'toss', n: 6 } } },
  { hero: 'nan', name: 'Old Nan', epithet: 'the Last Hearth', quirk: { name: 'Banked High', says: 'Stack burn to its max on 20 enemies in one run.', test: { kind: 'count', of: 'banked', n: 20 } } },
  { hero: 'isaura', name: 'Isaura', epithet: 'Captain of the Dawn', quirk: { name: 'The Ninth Rides', says: 'Kill 40 enemies with Tilt thrusts in one run.', test: { kind: 'count', of: 'tilt', n: 40 } } },
  { hero: 'hroth', name: 'Hroth', epithet: 'the Thrice Buried', quirk: { name: 'Paid in Full', says: 'Kill 150 enemies while in Grave Debt in one run.', test: { kind: 'count', of: 'debt', n: 150 } } },
  { hero: 'aldous', name: 'Aldous', epithet: 'the Morning Bell', quirk: { name: 'The Flock', says: 'Max out your bond with a companion.', test: { kind: 'bond' } } },
  { hero: 'ysolde', name: 'Ysolde', epithet: 'the Thaw', quirk: { name: 'Deep Winter', says: 'Hold 4 Frost weapons.', test: { kind: 'kinds', held: 4, of: REF.kind.frost } } },
  { hero: 'maren', name: 'Maren', epithet: 'the Oath Kept', quirk: { name: 'Hallowed', says: 'Hold 4 Holy weapons.', test: { kind: 'kinds', held: 4, of: REF.kind.holy } } },
];

export const OATHS: readonly OathDef[] = OATH_LINES.flatMap((h): OathDef[] => [
  { id: `${h.hero}-win`, hero: h.hero, name: `${h.name}'s Morning`, says: `Win a run as ${h.name}.`, test: { kind: 'win' }, opens: { kind: 'epithet', epithet: h.epithet } },
  { id: `${h.hero}-vow`, hero: h.hero, name: `${h.name}, Sworn`, says: `Win a run as ${h.name} with at least 1 vow.`, test: { kind: 'win', vows: 1 }, opens: { kind: 'relic', relic: REF.relic[h.hero as keyof typeof REF.relic] } },
  { id: `${h.hero}-quirk`, hero: h.hero, name: h.quirk.name, says: `As ${h.name}: ${h.quirk.says[0].toLowerCase()}${h.quirk.says.slice(1)}`, test: h.quirk.test, opens: { kind: 'rule' } },
]);
