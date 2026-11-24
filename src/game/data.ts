// Who is in the game and what everything costs. Numbers only: the rules
// that use them are in rules.ts, and what happens in a fight is in
// battle.ts. They were set with `npm run pace`, which plays the game through
// in seconds and says how long each stretch takes.

// ------------------------------------------------------------ the road

export type Ground = 'meadow' | 'desert' | 'snow';

export interface LandDef {
  id: string;
  name: string;
  ground: Ground;
  /** Who is met on its plain stages, by the art's ids. */
  troops: readonly string[];
  /** Who holds its fifth stage, and its tenth. */
  captain: string;
  boss: string;
  captainName: string;
  bossName: string;
}

/** The road runs through these in turn, ten stages each, and then again. */
export const LANDS: readonly LandDef[] = [
  {
    id: 'thornwood', name: 'Thornwood', ground: 'meadow',
    troops: ['cutpurse', 'poacher', 'hexer', 'ringleader', 'bruiser'],
    captain: 'bruiser', boss: 'warlord', captainName: 'Raider Captain', bossName: 'The Warlord',
  },
  {
    id: 'sunscar', name: 'Sunscar Dunes', ground: 'desert',
    troops: ['lancer', 'javelineer', 'pyromancer', 'drummer', 'ballista'],
    captain: 'ballista', boss: 'colossus', captainName: 'Siege Engine', bossName: 'Sandstone Colossus',
  },
  {
    id: 'frostholt', name: 'Frostholt', ground: 'snow',
    troops: ['huscarl', 'harpooner', 'frostwitch', 'skald', 'icegolem'],
    captain: 'icegolem', boss: 'jarl', captainName: 'Rime Golem', bossName: 'Jarl of the Rime',
  },
];

/** Stages to a land, and enemies to a plain stage. */
export const LAND_STAGES = 10;
export const STAGE_ENEMIES = 10;

/** A plain enemy's health at the first stage, and how much more each stage after has. */
export const BASE_HP = 10;
export const HP_GROWTH = 1.4;
/** What a captain and a boss have over a plain enemy of their stage, and what they pay over one. */
export const CAPTAIN = { hp: 4, gold: 5 } as const;
export const BOSS = { hp: 8, gold: 10 } as const;
/** Seconds to bring a captain or a boss down before the legion falls back. */
export const BOSS_SECONDS = 30;
/** A plain enemy's gold, as a share of its health. */
export const GOLD_SHARE = 0.25;
/** Seconds between one enemy falling and the next standing to fight. */
export const SPAWN_SECONDS = 0.7;

// ------------------------------------------------------------ heroes

export type LegionBonus = 'damage' | 'gold' | 'tap';

export interface HeroDef {
  id: string;
  /** Its picture: a unit of the art (src/art/units). */
  unit: string;
  name: string;
  /** What it does, in a few words, for its row. */
  line: string;
  /** Seconds between its blows. Its damage a second is in rules.ts; a blow is that much of it. */
  period: number;
  /** True if it strikes from where it stands: something flies to the enemy. */
  ranged: boolean;
  /** Where it stands in the legion: its column from the front, and its row from the top. */
  slot: readonly [col: number, row: number];
  /** What the whole legion gets once it is level 25: a share more damage, gold or tap. Doubled at level 100. */
  bonus: readonly [kind: LegionBonus, share: number];
}

/** In the order they are hired. Each costs more than the one before and strikes harder. */
export const HEROES: readonly HeroDef[] = [
  { id: 'militia', unit: 'militia', name: 'Militia', line: 'First to the line', period: 1.1, ranged: false, slot: [0, 1], bonus: ['tap', 0.25] },
  { id: 'archer', unit: 'archer', name: 'Archer', line: 'Shoots over the line', period: 1.5, ranged: true, slot: [2, 1], bonus: ['damage', 0.1] },
  { id: 'knight', unit: 'knight', name: 'Knight', line: 'Sword and shield', period: 1.2, ranged: false, slot: [0, 2], bonus: ['damage', 0.1] },
  { id: 'cleric', unit: 'cleric', name: 'Cleric', line: 'Blesses the purse', period: 1.7, ranged: true, slot: [2, 2], bonus: ['gold', 0.2] },
  { id: 'berserker', unit: 'berserker', name: 'Berserker', line: 'A great axe', period: 1.4, ranged: false, slot: [0, 0], bonus: ['damage', 0.1] },
  { id: 'mage', unit: 'mage', name: 'Mage', line: 'Arcane bolts', period: 1.8, ranged: true, slot: [2, 0], bonus: ['damage', 0.15] },
  { id: 'paladin', unit: 'paladin', name: 'Paladin', line: 'Hammer of the oath', period: 1.3, ranged: false, slot: [0, 3], bonus: ['damage', 0.15] },
  { id: 'herald', unit: 'herald', name: 'Herald', line: 'Sounds the charge', period: 1.9, ranged: true, slot: [2, 3], bonus: ['damage', 0.25] },
  { id: 'beekeeper', unit: 'beekeeper', name: 'Beekeeper', line: 'Throws the hive', period: 1.6, ranged: true, slot: [3, 1], bonus: ['gold', 0.25] },
  { id: 'gravedigger', unit: 'gravedigger', name: 'Gravedigger', line: 'A shovel, swung', period: 1.4, ranged: false, slot: [1, 1], bonus: ['gold', 0.25] },
  { id: 'bellringer', unit: 'bellringer', name: 'Bell Ringer', line: 'Tolls for them', period: 1.5, ranged: false, slot: [1, 2], bonus: ['tap', 0.5] },
  { id: 'blacksmith', unit: 'blacksmith', name: 'Blacksmith', line: 'Hammer and tongs', period: 1.2, ranged: false, slot: [1, 0], bonus: ['tap', 0.5] },
  { id: 'lamplighter', unit: 'lamplighter', name: 'Lamplighter', line: 'Fire on a pole', period: 1.7, ranged: true, slot: [3, 2], bonus: ['damage', 0.2] },
  { id: 'honorguard', unit: 'honorguard', name: 'Honor Guard', line: 'The halberd', period: 1.3, ranged: false, slot: [1, 3], bonus: ['damage', 0.25] },
  { id: 'frostwitch', unit: 'frostwitch', name: 'Frost Witch', line: 'Shards of ice', period: 1.8, ranged: true, slot: [3, 0], bonus: ['damage', 0.25] },
  { id: 'pyromancer', unit: 'pyromancer', name: 'Pyromancer', line: 'Throws fire', period: 1.7, ranged: true, slot: [3, 3], bonus: ['damage', 0.25] },
  { id: 'icegolem', unit: 'icegolem', name: 'Rime Golem', line: 'A fist of ice', period: 1.6, ranged: false, slot: [4, 0.7], bonus: ['gold', 0.5] },
  { id: 'colossus', unit: 'colossus', name: 'Sandstone Colossus', line: 'It shakes the road', period: 1.9, ranged: false, slot: [4, 2.3], bonus: ['damage', 0.5] },
];

/** The first hero's price and damage a second at level 1, and what each hero after it has over the one before. */
export const HERO_COST = 10;
export const HERO_COST_STEP = 3.3;
export const HERO_DPS = 1;
export const HERO_DPS_STEP = 1.75;
/** Each level of a hero costs this much more than the one before. */
export const LEVEL_GROWTH = 1.07;
/** At each of these levels a hero's own damage doubles, and after the last, every 25 levels more. */
export const MILESTONES: readonly number[] = [10, 25, 50, 75, 100];
export const MILESTONE_EVERY = 25;
/** The level at which a hero's bonus to the whole legion starts, and the one at which it doubles. */
export const BONUS_AT = 25;
export const BONUS_DOUBLED_AT = 100;

// ------------------------------------------------------------ the camp

export type CampEffect = 'damage' | 'gold' | 'volley' | 'discount' | 'offline' | 'bossTime' | 'march' | 'tap';

export interface CampDef {
  id: string;
  /** Its picture: a structure of the art. */
  unit: string;
  name: string;
  effect: CampEffect;
  /** How much each level gives: a share, shots a second, or seconds, as the effect is. */
  per: number;
  cost: number;
  growth: number;
  max: number;
}

/** What is built behind the legion. Each level costs more than the last. */
export const CAMP: readonly CampDef[] = [
  { id: 'banner', unit: 'warbanner', name: 'War Banner', effect: 'damage', per: 0.2, cost: 100, growth: 2, max: 60 },
  { id: 'counting', unit: 'longhouse', name: 'Counting House', effect: 'gold', per: 0.15, cost: 300, growth: 2, max: 60 },
  { id: 'armory', unit: 'raidertent', name: 'Armory', effect: 'tap', per: 0.5, cost: 50, growth: 2.2, max: 40 },
  { id: 'tower', unit: 'watchtower', name: 'Watchtower', effect: 'volley', per: 0.5, cost: 2000, growth: 3, max: 10 },
  { id: 'barracks', unit: 'barracks', name: 'Barracks', effect: 'discount', per: 0.02, cost: 5000, growth: 4, max: 15 },
  { id: 'tent', unit: 'wartent', name: 'Supply Tent', effect: 'offline', per: 0.1, cost: 10000, growth: 5, max: 10 },
  { id: 'obelisk', unit: 'sunobelisk', name: 'Sun Obelisk', effect: 'bossTime', per: 2, cost: 25000, growth: 6, max: 10 },
  { id: 'spire', unit: 'frostspire', name: 'Frost Spire', effect: 'march', per: 0.06, cost: 60000, growth: 6, max: 8 },
];

// ------------------------------------------------------------ abilities

export interface AbilityDef {
  id: 'rally' | 'volley' | 'plunder';
  name: string;
  line: string;
  /** The stage that has to have been reached, once, for it to be given. */
  stage: number;
  /** Seconds it lasts, and seconds before it can be used again. */
  seconds: number;
  cooldown: number;
  /** How strong it is: a multiplier while it lasts, or for the volley, seconds of the legion's damage at once. */
  power: number;
}

export const ABILITIES: readonly AbilityDef[] = [
  { id: 'rally', name: 'Rally', line: 'Double damage', stage: 5, seconds: 20, cooldown: 90, power: 2 },
  { id: 'volley', name: 'Volley', line: 'A storm of arrows', stage: 15, seconds: 0, cooldown: 150, power: 25 },
  { id: 'plunder', name: 'Plunder', line: 'Triple gold', stage: 25, seconds: 30, cooldown: 240, power: 3 },
];

// ------------------------------------------------------------ the tap

/** A tap strikes for this, and this share of the legion's damage a second on top. */
export const TAP_BASE = 1;
export const TAP_SHARE = 0.04;
/** A tap in ten is a telling blow, for this many times as much. */
export const CRIT_CHANCE = 0.1;
export const CRIT_POWER = 4;

// ------------------------------------------------------------ supply packs

/** Seconds of play between one supply pack and the next, the least and the most, and how long one waits to be opened. */
export const PACK_EVERY: readonly [number, number] = [120, 200];
export const PACK_WAITS = 40;
/** What a pack of gold is worth: this many plain kills at the stage. */
export const PACK_KILLS = 60;

// ------------------------------------------------------------ rebirth

/** The stage that has to be reached before the legion can be mustered again. */
export const REBIRTH_STAGE = 30;
/** Each laurel ever won is this share more damage, for good. */
export const LAUREL_DAMAGE = 0.05;

export type HonorEffect = 'damage' | 'gold' | 'tap' | 'start' | 'offline' | 'march' | 'bossTime' | 'packs';

export interface HonorDef {
  id: string;
  name: string;
  effect: HonorEffect;
  per: number;
  /** Laurels for its first level, and how many more each level after costs. */
  cost: number;
  step: number;
  max: number;
}

/** What laurels buy. None of it is lost at a rebirth. */
export const HONORS: readonly HonorDef[] = [
  { id: 'blades', name: 'Veteran Blades', effect: 'damage', per: 0.5, cost: 1, step: 1, max: 50 },
  { id: 'chest', name: 'War Chest', effect: 'gold', per: 0.5, cost: 1, step: 1, max: 50 },
  { id: 'arm', name: "Commander's Arm", effect: 'tap', per: 1, cost: 1, step: 1, max: 30 },
  { id: 'start', name: 'Head Start', effect: 'start', per: 5, cost: 2, step: 2, max: 10 },
  { id: 'quarter', name: 'Quartermaster', effect: 'offline', per: 0.25, cost: 2, step: 2, max: 8 },
  { id: 'march', name: 'Swift March', effect: 'march', per: 0.1, cost: 3, step: 3, max: 5 },
  { id: 'glass', name: 'Hourglass', effect: 'bossTime', per: 3, cost: 3, step: 3, max: 5 },
  { id: 'fortune', name: 'Fortune', effect: 'packs', per: 0.12, cost: 2, step: 2, max: 5 },
];

// ------------------------------------------------------------ offline

/** While the game is shut the legion earns this share of what it earns open, for at most this many hours. */
export const OFFLINE_SHARE = 0.4;
export const OFFLINE_HOURS = 4;
/** Each level of the Supply Tent and of the Quartermaster adds this many hours. */
export const OFFLINE_HOURS_STEP = 1;
/** Away for less than this many seconds is not away. */
export const OFFLINE_LEAST = 90;

// ------------------------------------------------------------ renown

/** Each feat is this share more damage and gold, for good. */
export const FEAT_SHARE = 0.03;

export type FeatKind = 'stage' | 'heroes' | 'taps' | 'bosses' | 'gold' | 'rebirths' | 'camp' | 'packs' | 'levels';

export interface FeatDef {
  id: string;
  name: string;
  kind: FeatKind;
  need: number;
}

function feats(kind: FeatKind, names: readonly string[], needs: readonly number[]): FeatDef[] {
  return needs.map((need, i) => ({ id: `${kind}-${need}`, name: names[i], kind, need }));
}

export const FEATS: readonly FeatDef[] = [
  ...feats('stage', ['First Blood', 'Out of the Wood', 'Across the Sand', 'Over the Ice', 'The Long Road', 'No Way Back', 'Past the Maps', 'Legend'], [5, 10, 20, 30, 60, 100, 150, 250]),
  ...feats('heroes', ['A Company', 'A Cohort', 'A Legion'], [5, 10, 18]),
  ...feats('levels', ['Drilled', 'Seasoned', 'Old Guard'], [100, 500, 2000]),
  ...feats('taps', ['Heavy Hand', 'Iron Hand', 'Thunder Hand'], [100, 2000, 20000]),
  ...feats('bosses', ['Giant Killer', 'Kingbreaker', 'Bane of Lords'], [5, 50, 250]),
  ...feats('gold', ['A Full Purse', 'A Full Cart', 'A Full Vault'], [1e5, 1e9, 1e15]),
  ...feats('camp', ['A Camp', 'A Fort'], [10, 60]),
  ...feats('packs', ['Well Supplied'], [10]),
  ...feats('rebirths', ['Born Again', 'Evergreen', 'Undying'], [1, 5, 15]),
];
