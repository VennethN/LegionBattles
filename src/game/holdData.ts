// The Hold: what a player keeps and grows between runs. These are its
// lists and its numbers. The rules that use them are in hold.ts.
//
// Renown is what every run pays, whatever became of it. It buys what the
// Hold sells: a hero or a companion whose deed has not been done, a second
// place in the band, crates for the armory, and blessings. Nothing here
// makes a hero much stronger: it makes later runs have more in them, and
// gives every run a next thing to go for (a deed, an oath of the hero's, a
// crate's own deed, a vow to win under, the day's road).

import type { Feat } from './data';

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
 * than a crate or a blessing asks, so that it is paid only by someone
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
  /** Every kind of road come through at least once. */
  | { kind: 'roads' };

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
  { id: 'fletcher', name: "The Fletcher's Crate", says: 'Bows, and what makes one shot two.', things: [w('longbow'), w('rimebow'), w('blowpipe'), i('quiver'), r('twinquiver')], deed: { kind: 'kinds', held: 3, of: REF.kind.bow }, deedSays: 'Hold three bows in one run.' },
  { id: 'chandler', name: "The Chandler's Crate", says: 'Powder, oil and everything that burns.', things: [w('bomb'), w('brazier'), w('sunbrand'), i('keg'), r('bellows'), r('emberheart')], deed: { kind: 'kinds', held: 3, of: REF.kind.fire }, deedSays: 'Hold three weapons of fire in one run.' },
  { id: 'winter', name: 'The Winter Crate', says: 'Packed in straw and still cold.', things: [w('trident'), w('hail'), i('cloak'), r('frostbite')], deed: { kind: 'kinds', held: 3, of: REF.kind.frost }, deedSays: 'Hold three weapons of frost in one run.' },
  { id: 'reliquary', name: 'The Reliquary', says: 'What the chapel kept under the altar.', things: [w('mace'), w('holywater'), i('relic'), r('bowl'), r('fallen')], deed: { kind: 'kinds', held: 3, of: REF.kind.holy }, deedSays: 'Hold three holy weapons in one run.' },
  { id: 'apothecary', name: "The Apothecary's Crate", says: 'Do not open the green jars.', things: [w('venom'), w('gourd'), w('fang'), r('spade')], deed: { kind: 'kills', kills: 5000 }, deedSays: 'Fell 5000 enemies in all.' },
  { id: 'armorer', name: "The Armorer's Crate", says: 'Heavy iron, and a stone to keep it keen.', things: [w('greataxe'), w('halberd'), w('hatchet'), i('gauntlets'), r('ageswhet'), r('mirror')], deed: { kind: 'tier' }, deedSays: 'Join a weapon up to its last tier.' },
  { id: 'scholar', name: "The Scholar's Crate", says: 'Glass, sand and things that count.', things: [w('wand'), i('spyglass'), i('hourglass'), r('stormglass'), r('sands')], deed: { kind: 'level', level: 15 }, deedSays: 'Reach level fifteen in one run.' },
  { id: 'gambler', name: "The Gambler's Crate", says: 'Everything in it is a wager.', things: [i('crown'), i('lodestone'), r('bonedice'), r('crown'), r('tithe')], deed: { kind: 'purse', gold: 300 }, deedSays: 'Hold three hundred coins at once.' },
  { id: 'wayfarer', name: "The Wayfarer's Crate", says: 'Maps, spurs and a horn to be heard by.', things: [i('horn'), r('oldmap'), r('spurs')], deed: { kind: 'roads' }, deedSays: 'Come through every kind of road.' },
];

/** What a crate costs when this many are open already, however they were opened. The player picks the order. */
export const CRATE_PRICES: readonly number[] = [100, 150, 200, 250, 300, 360, 420, 480, 550];

/** A thing's name in a run's list of what is shut to it. */
export const thingKey = (t: Thing): string => `${t.kind}:${t.id}`;

// ---------------------------------------------------------------- blessings

export type BlessingId = 'quarter' | 'banish' | 'path' | 'relook' | 'breath';

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
 * The blessings: a few lasting gifts. Each gives a choice, not a number:
 * more health or more harm would only move what the enemies' growth then
 * takes back. (A lock on a ware already holds through to the next camp,
 * for everyone, so it is not one of them.)
 */
export const BLESSINGS: readonly BlessingDef[] = [
  { id: 'quarter', name: "The Quartermaster's Favor", prices: [200, 400], by: [1, 2], says: (by) => (by === 1 ? 'The first look at other wares in each camp is free.' : 'The first two looks at other wares in each camp are free.') },
  { id: 'banish', name: 'The Black Mark', prices: [200, 400], by: [2, 4], says: (by) => `${by} times in a run, strike a ware from the table: it is not offered again that run.` },
  { id: 'path', name: 'The Third Road', prices: [350], by: [1], says: () => 'Three roads to choose from, not two.' },
  { id: 'relook', name: 'A Second Look', prices: [300], by: [1], says: () => 'Once at each choice of a relic, see three others instead.' },
  { id: 'breath', name: 'A Second Breath', prices: [900], by: [1], says: () => 'Once in a run, a killing blow leaves the hero standing.' },
];

/** A Second Breath: the share of their health the hero gets up with, and how long nothing can hurt them. */
export const BREATH = { rises: 0.35, grace: 1.5 };

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
  { id: 'march', name: 'Forced March', says: 'They come a good deal quicker.' },
  { id: 'lean', name: 'Lean Coffers', says: 'Everything in the camp costs a fifth more.' },
  { id: 'famine', name: 'Bare Fields', says: 'The fallen leave no hearts.' },
  { id: 'champions', name: 'Champions Abroad', says: 'A champion walks in every wave from the third.' },
  { id: 'hand', name: 'One Hand Fewer', says: 'One hand fewer for what is bought.' },
  { id: 'dusk', name: 'The Early Dark', says: 'Every wave is fought by night.' },
  { id: 'wounds', name: 'Open Wounds', says: 'No rest between waves: each is begun with the health the last one left.' },
  { id: 'wind', name: 'Second Wind', says: 'A captain that falls gets up once.' },
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
  { id: 'wave5', name: 'Still Standing', says: 'Come through the fifth wave.', test: { kind: 'wave', wave: 5 }, renown: 10 },
  { id: 'wave10', name: 'Half the Road', says: 'Come through the tenth wave.', test: { kind: 'wave', wave: 10 }, renown: 15 },
  { id: 'wave15', name: 'Into the Snow', says: 'Come through the fifteenth wave.', test: { kind: 'wave', wave: 15 }, renown: 20 },
  { id: 'captain1', name: 'The First Captain', says: 'Beat the captain of wave 7.', test: { kind: 'boss', boss: REF.captain.first }, renown: 15 },
  { id: 'captain2', name: 'The Second Captain', says: 'Beat the captain of wave 14.', test: { kind: 'boss', boss: REF.captain.second }, renown: 20 },
  { id: 'captain3', name: 'The Third Captain', says: 'Beat the captain of wave 20.', test: { kind: 'boss', boss: REF.captain.third }, renown: 25 },
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
  { id: 'wins10', name: 'Every Banner', says: 'Win with every hero.', test: { kind: 'wins', heroes: 10 }, renown: 50 },
  { id: 'vows1', name: 'Sworn', says: 'Win a run under a vow.', test: { kind: 'win', vows: 1 }, renown: 30 },
  { id: 'vows2', name: 'Twice Sworn', says: 'Win a run under two vows.', test: { kind: 'win', vows: 2 }, renown: 40 },
  { id: 'vows4', name: 'Oathbound', says: 'Win a run under four vows.', test: { kind: 'win', vows: 4 }, renown: 60 },
  { id: 'vows8', name: 'The Long Night', says: 'Win a run under every vow.', test: { kind: 'win', vows: 8 }, renown: 100 },
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
  { hero: 'bram', name: 'Bram', epithet: 'the Gate That Held', quirk: { name: 'Not One Step', says: 'Beat a captain without one blow landing.', test: { kind: 'unstruck' } } },
  { hero: 'wren', name: 'Wren', epithet: 'the Uncaught', quirk: { name: 'Never Seen', says: 'Come through five waves of one run untouched.', test: { kind: 'clean', waves: 5 } } },
  { hero: 'orrin', name: 'Orrin', epithet: 'the Finished', quirk: { name: 'The Last Lesson', says: 'Hold four arcane weapons.', test: { kind: 'kinds', held: 4, of: REF.kind.arcane } } },
  { hero: 'fenn', name: 'Fenn', epithet: 'the Rich', quirk: { name: 'Heads Every Time', says: 'Hold four hundred coins at once.', test: { kind: 'purse', gold: 400 } } },
  { hero: 'nan', name: 'Old Nan', epithet: 'the Last Hearth', quirk: { name: 'Banked High', says: 'Hold four weapons of fire.', test: { kind: 'kinds', held: 4, of: REF.kind.fire } } },
  { hero: 'isaura', name: 'Isaura', epithet: 'Captain of the Dawn', quirk: { name: 'The Ninth Rides', says: 'Fell fifteen hundred in one run.', test: { kind: 'slain', kills: 1500 } } },
  { hero: 'hroth', name: 'Hroth', epithet: 'the Thrice Buried', quirk: { name: 'Up Again', says: 'Come through the tenth wave of a run in which he got up.', test: { kind: 'risen', wave: 10 } } },
  { hero: 'aldous', name: 'Aldous', epithet: 'the Morning Bell', quirk: { name: 'The Flock', says: 'Take a bond with a companion to its last step.', test: { kind: 'bond' } } },
  { hero: 'ysolde', name: 'Ysolde', epithet: 'the Thaw', quirk: { name: 'Deep Winter', says: 'Hold four weapons of frost.', test: { kind: 'kinds', held: 4, of: REF.kind.frost } } },
  { hero: 'maren', name: 'Maren', epithet: 'the Oath Kept', quirk: { name: 'Hallowed', says: 'Hold four holy weapons.', test: { kind: 'kinds', held: 4, of: REF.kind.holy } } },
];

export const OATHS: readonly OathDef[] = OATH_LINES.flatMap((h): OathDef[] => [
  { id: `${h.hero}-win`, hero: h.hero, name: `${h.name}'s Morning`, says: `Win a run as ${h.name}.`, test: { kind: 'win' }, opens: { kind: 'epithet', epithet: h.epithet } },
  { id: `${h.hero}-vow`, hero: h.hero, name: `${h.name}, Sworn`, says: `Win a run as ${h.name} under a vow.`, test: { kind: 'win', vows: 1 }, opens: { kind: 'relic', relic: REF.relic[h.hero as keyof typeof REF.relic] } },
  { id: `${h.hero}-quirk`, hero: h.hero, name: h.quirk.name, says: `As ${h.name}: ${h.quirk.says[0].toLowerCase()}${h.quirk.says.slice(1)}`, test: h.quirk.test, opens: { kind: 'rule' } },
]);
