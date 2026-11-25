// Every number of the game, and what each is for. The rules (world.ts,
// run.ts) read these and know none of their own. A change here is measured
// with `npm run pace` before and after. The heroes are in heroes.ts and
// the companions in companions.ts; both are handed on from here.

import { SIGNATURES } from './heroes';
import type { Kind } from './kinds';
import type { StatLine, Stat } from './stats';

// ---------------------------------------------------------------- the hero

/** What every hero starts from, before who they are is added. */
export const BASE_STATS: StatLine = { maxHp: 24 };
/** How fast a hero with no Speed runs, in the arena's units a second. */
export const HERO_SPEED = 205;
/** How near a coin has to be to come to a hero with no Gather. */
export const PICKUP_RADIUS = 78;
/** How big a hero is to whatever touches them. Smaller than the picture: a near miss is a miss. */
export const HERO_RADIUS = 13;
/** The least seconds between one health given back by Leech and the next: a wide blade in a crowd would otherwise mend faster than anything could hurt. */
export const LEECH_GAP = 0.25;
/** Seconds a hero cannot be hurt again after a blow lands. */
export const HURT_GRACE = 0.5;
/** The most weapons a hero carries. */
export const SLOTS = 6;

/** A thing a player does once that opens a hero or a companion for good. */
export type Feat =
  | { kind: 'wave'; wave: number }
  | { kind: 'boss'; boss: string }
  | { kind: 'coins'; coins: number }
  | { kind: 'kills'; kills: number }
  | { kind: 'runs'; runs: number };

// The heroes and the companions have files of their own: who they are, and the numbers of what only they do.
export * from './heroes';
export * from './companions';
// So have the kinds of weapon, the relics and the road.
export * from './kinds';
export * from './relics';
export * from './road';

// ---------------------------------------------------------------- weapons

export const TIERS = 4;
/** What the tiers are called, plainest first. */
export const TIER_NAMES = ['I', 'II', 'III', 'IV'] as const;

export type WeaponKind = 'melee' | 'ranged' | 'magic';
/**
 * How a weapon strikes.
 * thrust: a line from the hero toward the target; whoever is in it is hit.
 * sweep: an arc in front of the hero.
 * slam: a ring where the target stands, which stuns.
 * shoot: something that flies straight and hits the first in its way.
 * lob: something thrown to where the target stands, which bursts there.
 * cast: a bolt that bends toward its target.
 * pulse: a ring round the hero, which mends them too.
 */
export type Motion = 'thrust' | 'sweep' | 'slam' | 'shoot' | 'lob' | 'cast' | 'pulse';

export interface WeaponDef {
  id: string;
  name: string;
  kind: WeaponKind;
  /** The kinds it is of, one or two: holding several of a kind gives that kind's gift (kinds.ts). */
  kinds: readonly Kind[];
  motion: Motion;
  /** Harm at each tier, before the hero's stats. */
  dmg: readonly [number, number, number, number];
  /** How much of Might, Aim and Lore is added to that. */
  scale: { might?: number; aim?: number; lore?: number };
  /** Seconds between strikes at each tier. */
  every: readonly [number, number, number, number];
  /** How far off it strikes. */
  range: number;
  /** Its own chance of a blow that hits harder, and how much harder. */
  crit: number;
  critBy: number;
  /** How far it throws back what it hits. */
  knock: number;
  /** How many it goes through (shoot, cast), or strikes at once (thrust). */
  pierce?: number;
  /** A sweep's width in degrees. */
  arc?: number;
  /** The ring of a slam, a lob's burst, a pulse. */
  burst?: number;
  /** How fast what it looses flies. */
  flies?: number;
  /** What flies: a picture's name. */
  shot?: string;
  /** Fire: this much harm a second, for three seconds. */
  burn?: readonly [number, number, number, number];
  /** Cold: slows by this share for two seconds. */
  slow?: number;
  /** Poison: leaves a cloud that does this much a second for three seconds. A thrust with this leaves it where its first mark stood, as wide as `burst`. */
  cloud?: readonly [number, number, number, number];
  /** Seconds it stuns. */
  stun?: number;
  /** How many more enemies what it looses leaps to after the first. */
  leaps?: number;
  /** What a pulse gives back in health at each tier. A slam with this gives it back when it fells someone. */
  mends?: readonly [number, number, number, number];
  /** Holy water: where it bursts the ground is holy for four seconds, does this much a second, and mends the band that stands on it. */
  holy?: readonly [number, number, number, number];
  /** What it costs at tier I, before the wave's prices. */
  price: number;
  /** One line a player reads. */
  says: string;
  /** True for a hero's own weapon (SIGNATURES in heroes.ts): it takes no hand, and is never sold, bought or joined. */
  own?: boolean;
  /** The weapon whose picture it is drawn with, where it has none of its own. */
  icon?: string;
}

export const WEAPONS: readonly WeaponDef[] = [
  { id: 'sword', name: 'Sword', kinds: ['blade'], kind: 'melee', motion: 'sweep', dmg: [8, 13, 20, 31], scale: { might: 1 }, every: [1.05, 0.97, 0.9, 0.82], range: 92, crit: 5, critBy: 2, knock: 14, arc: 80, price: 20, says: 'A sweep in front of you.' },
  { id: 'dagger', name: 'Dagger', kinds: ['blade'], kind: 'melee', motion: 'thrust', dmg: [5, 8, 12, 19], scale: { might: 0.7 }, every: [0.58, 0.53, 0.48, 0.42], range: 78, crit: 20, critBy: 2.5, knock: 4, pierce: 1, price: 18, says: 'Quick, and often finds the gap.' },
  { id: 'spear', name: 'Spear', kinds: ['pole'], kind: 'melee', motion: 'thrust', dmg: [10, 16, 24, 37], scale: { might: 1 }, every: [1.25, 1.16, 1.07, 0.98], range: 150, crit: 5, critBy: 2, knock: 20, pierce: 3, price: 22, says: 'A long thrust through three.' },
  { id: 'greataxe', name: 'Great Axe', kinds: ['blade', 'blunt'], kind: 'melee', motion: 'sweep', dmg: [16, 25, 38, 58], scale: { might: 1.6 }, every: [1.8, 1.68, 1.56, 1.44], range: 108, crit: 5, critBy: 2, knock: 26, arc: 130, price: 26, says: 'Slow, wide and heavy.' },
  { id: 'hammer', name: 'War Hammer', kinds: ['blunt'], kind: 'melee', motion: 'slam', dmg: [13, 20, 31, 47], scale: { might: 1.3 }, every: [1.65, 1.54, 1.43, 1.32], range: 96, crit: 0, critBy: 2, knock: 10, burst: 56, stun: 0.7, price: 26, says: 'Stuns everyone where it lands.' },
  { id: 'torch', name: 'Torch', kinds: ['fire', 'blunt'], kind: 'melee', motion: 'thrust', dmg: [4, 6, 9, 14], scale: { might: 0.4, lore: 0.4 }, every: [0.9, 0.84, 0.78, 0.72], range: 84, crit: 0, critBy: 2, knock: 6, pierce: 2, burn: [3, 5, 8, 12], price: 20, says: 'Sets alight what it touches.' },
  { id: 'bow', name: 'Bow', kinds: ['bow'], kind: 'ranged', motion: 'shoot', dmg: [7, 11, 17, 26], scale: { aim: 1 }, every: [1.1, 1.02, 0.94, 0.86], range: 400, crit: 5, critBy: 2, knock: 6, pierce: 0, flies: 620, shot: 'arrow', price: 20, says: 'An arrow at the nearest.' },
  { id: 'crossbow', name: 'Crossbow', kinds: ['bow'], kind: 'ranged', motion: 'shoot', dmg: [14, 22, 33, 50], scale: { aim: 1.4 }, every: [1.9, 1.78, 1.66, 1.54], range: 460, crit: 10, critBy: 2, knock: 16, pierce: 2, flies: 760, shot: 'bolt', price: 26, says: 'A bolt through three.' },
  { id: 'javelin', name: 'Javelin', kinds: ['pole', 'thrown'], kind: 'ranged', motion: 'shoot', dmg: [11, 17, 26, 40], scale: { aim: 0.8, might: 0.6 }, every: [1.5, 1.4, 1.3, 1.2], range: 350, crit: 5, critBy: 2, knock: 12, pierce: 1, flies: 560, shot: 'javelin', price: 22, says: 'Thrown hard, through two.' },
  { id: 'sling', name: 'Sling', kinds: ['thrown'], kind: 'ranged', motion: 'shoot', dmg: [4, 6, 10, 15], scale: { aim: 0.6 }, every: [0.56, 0.52, 0.48, 0.43], range: 320, crit: 5, critBy: 2, knock: 3, pierce: 0, leaps: 1, flies: 540, shot: 'stone', price: 18, says: 'Stones that skip to a second.' },
  { id: 'bomb', name: 'Powder Bomb', kinds: ['thrown', 'fire'], kind: 'ranged', motion: 'lob', dmg: [12, 19, 29, 44], scale: { aim: 0.5, lore: 0.5 }, every: [2.2, 2.06, 1.92, 1.78], range: 330, crit: 0, critBy: 2, knock: 18, burst: 74, flies: 330, shot: 'bomb', price: 26, says: 'Bursts where it lands.' },
  { id: 'staff', name: 'Arcane Staff', kinds: ['arcane'], kind: 'magic', motion: 'cast', dmg: [10, 16, 24, 37], scale: { lore: 1 }, every: [1.1, 1.02, 0.94, 0.86], range: 390, crit: 5, critBy: 2, knock: 5, pierce: 1, flies: 430, shot: 'orb-arcane', price: 22, says: 'A bolt that bends to its mark, and on through it.' },
  { id: 'brazier', name: 'Fire Brazier', kinds: ['fire', 'arcane'], kind: 'magic', motion: 'cast', dmg: [8, 12, 18, 27], scale: { lore: 0.8 }, every: [1.4, 1.31, 1.22, 1.13], range: 320, crit: 0, critBy: 2, knock: 8, burst: 56, burn: [3, 5, 8, 12], flies: 400, shot: 'orb-fire', price: 24, says: 'Bursts into fire that keeps burning.' },
  { id: 'frost', name: 'Frost Crystal', kinds: ['frost', 'arcane'], kind: 'magic', motion: 'cast', dmg: [6, 9, 14, 21], scale: { lore: 0.7 }, every: [1.3, 1.21, 1.12, 1.03], range: 360, crit: 0, critBy: 2, knock: 2, pierce: 2, slow: 0.4, flies: 460, shot: 'orb-frost', price: 22, says: 'Slows three in a line.' },
  { id: 'venom', name: 'Spore Staff', kinds: ['venom', 'arcane'], kind: 'magic', motion: 'cast', dmg: [3, 5, 7, 11], scale: { lore: 0.5 }, every: [1.7, 1.59, 1.48, 1.37], range: 300, crit: 0, critBy: 2, knock: 0, burst: 62, cloud: [4, 6, 10, 15], flies: 360, shot: 'orb-venom', price: 22, says: 'Leaves a cloud that eats at them.' },
  { id: 'censer', name: 'Censer', kinds: ['holy'], kind: 'magic', motion: 'pulse', dmg: [6, 10, 15, 23], scale: { lore: 0.6 }, every: [4, 3.7, 3.4, 3.1], range: 110, crit: 0, critBy: 2, knock: 16, burst: 112, mends: [1, 1, 2, 2], price: 24, says: 'A ring of light that mends you.' },
  // The second armful: so that every kind has four of its own to find.
  { id: 'halberd', name: 'Halberd', kinds: ['pole', 'blade'], kind: 'melee', motion: 'sweep', dmg: [11, 17, 26, 40], scale: { might: 1.2 }, every: [1.45, 1.35, 1.25, 1.15], range: 138, crit: 5, critBy: 2, knock: 22, arc: 56, price: 24, says: 'A long, narrow sweep that keeps them off.' },
  { id: 'trident', name: 'Rime Trident', kinds: ['frost', 'pole'], kind: 'melee', motion: 'thrust', dmg: [7, 11, 17, 26], scale: { might: 0.6, lore: 0.5 }, every: [1.15, 1.07, 0.99, 0.9], range: 134, crit: 0, critBy: 2, knock: 10, pierce: 2, slow: 0.35, price: 22, says: 'A cold thrust that slows two.' },
  { id: 'mace', name: 'Blessed Mace', kinds: ['holy', 'blunt'], kind: 'melee', motion: 'slam', dmg: [8, 13, 20, 31], scale: { might: 0.9 }, every: [1.2, 1.12, 1.04, 0.95], range: 86, crit: 0, critBy: 2, knock: 8, burst: 44, stun: 0.45, mends: [1, 1, 1, 2], price: 24, says: 'A quick, small slam. Felling someone with it mends you.' },
  { id: 'longbow', name: 'War Bow', kinds: ['bow'], kind: 'ranged', motion: 'shoot', dmg: [13, 20, 31, 47], scale: { aim: 1.5 }, every: [2.1, 1.96, 1.82, 1.68], range: 560, crit: 25, critBy: 3, knock: 10, pierce: 0, flies: 820, shot: 'arrow', price: 26, says: 'Far, slow, and often deadly.' },
  { id: 'rimebow', name: 'Rime Bow', kinds: ['frost', 'bow'], kind: 'ranged', motion: 'shoot', dmg: [5, 8, 12, 19], scale: { aim: 0.7, lore: 0.3 }, every: [0.95, 0.88, 0.81, 0.74], range: 380, crit: 5, critBy: 2, knock: 4, pierce: 1, slow: 0.3, flies: 600, shot: 'arrow', price: 22, says: 'Arrows of ice that slow two.' },
  { id: 'blowpipe', name: 'Blowpipe', kinds: ['venom', 'bow'], kind: 'ranged', motion: 'shoot', dmg: [3, 5, 7, 11], scale: { aim: 0.5 }, every: [0.8, 0.74, 0.68, 0.62], range: 330, crit: 5, critBy: 2, knock: 0, burst: 36, cloud: [3, 5, 8, 12], flies: 640, shot: 'bolt', price: 20, says: 'Quick darts, each a small cloud.' },
  { id: 'hatchet', name: 'Throwing Axes', kinds: ['blade', 'thrown'], kind: 'ranged', motion: 'shoot', dmg: [10, 16, 24, 37], scale: { might: 0.8, aim: 0.5 }, every: [1.3, 1.21, 1.12, 1.03], range: 280, crit: 12, critBy: 2, knock: 20, pierce: 1, flies: 500, shot: 'javelin', price: 22, says: 'Thrown hard and near: through two, and back they go.' },
  { id: 'hail', name: 'Hailstones', kinds: ['frost', 'thrown'], kind: 'ranged', motion: 'shoot', dmg: [3, 5, 8, 12], scale: { aim: 0.4, lore: 0.3 }, every: [0.62, 0.57, 0.52, 0.47], range: 300, crit: 0, critBy: 2, knock: 2, pierce: 0, leaps: 1, slow: 0.2, flies: 520, shot: 'stone', price: 20, says: 'Cold stones that skip to a second and slow both.' },
  { id: 'holywater', name: 'Holy Water', kinds: ['holy', 'thrown'], kind: 'ranged', motion: 'lob', dmg: [7, 11, 17, 26], scale: { lore: 0.6, aim: 0.3 }, every: [2.6, 2.43, 2.26, 2.1], range: 300, crit: 0, critBy: 2, knock: 6, burst: 70, holy: [3, 5, 8, 12], flies: 320, shot: 'bomb', price: 26, says: 'Where it breaks the ground is holy: it burns them and mends you.' },
  { id: 'gourd', name: 'Spore Gourd', kinds: ['venom', 'thrown'], kind: 'ranged', motion: 'lob', dmg: [4, 6, 9, 14], scale: { lore: 0.4, aim: 0.2 }, every: [2.4, 2.25, 2.1, 1.95], range: 310, crit: 0, critBy: 2, knock: 0, burst: 88, cloud: [5, 8, 12, 18], flies: 320, shot: 'bomb', price: 24, says: 'Thrown into the thick of them: a wide cloud.' },
  { id: 'sunbrand', name: 'Sunbrand', kinds: ['holy', 'fire'], kind: 'melee', motion: 'sweep', dmg: [6, 10, 15, 23], scale: { might: 0.7, lore: 0.5 }, every: [1.1, 1.02, 0.94, 0.86], range: 96, crit: 5, critBy: 2, knock: 10, arc: 90, burn: [3, 5, 8, 12], price: 24, says: 'A sweep that sets them all alight.' },
  { id: 'fang', name: 'Serpent Sickle', kinds: ['venom', 'blade'], kind: 'melee', motion: 'thrust', dmg: [4, 7, 10, 16], scale: { might: 0.6 }, every: [0.7, 0.65, 0.6, 0.54], range: 80, crit: 15, critBy: 2.5, knock: 4, pierce: 1, burst: 34, cloud: [3, 5, 8, 12], price: 22, says: 'Quick cuts that leave a small cloud.' },
  { id: 'wand', name: 'Spark Wand', kinds: ['arcane'], kind: 'magic', motion: 'cast', dmg: [4, 6, 10, 15], scale: { lore: 0.5 }, every: [0.6, 0.55, 0.5, 0.45], range: 340, crit: 5, critBy: 2, knock: 2, pierce: 0, leaps: 2, flies: 520, shot: 'orb-arcane', price: 22, says: 'Quick sparks that leap on to two more.' },
];

/** A weapon by its name, a hero's own among them. */
export function weaponOf(id: string): WeaponDef {
  const found = WEAPONS.find((w) => w.id === id) ?? SIGNATURES.find((w) => w.id === id);
  if (!found) throw new Error(`data: no weapon is called "${id}"`);
  return found;
}

/** How much dearer each tier is than the first. */
export const TIER_PRICE = [1, 2.1, 4.3, 8.5] as const;

// ---------------------------------------------------------------- things

export interface ItemDef {
  id: string;
  name: string;
  /** 0 to 3: how rare, and so how late it is offered. */
  tier: number;
  price: number;
  stats: StatLine;
  /** The most of it one hero can hold, if it has a limit. */
  most?: number;
}

export const ITEMS: readonly ItemDef[] = [
  { id: 'ration', name: 'Field Ration', tier: 0, price: 16, stats: { maxHp: 3 } },
  { id: 'whetstone', name: 'Whetstone', tier: 0, price: 18, stats: { might: 2 } },
  { id: 'fletching', name: 'Goose Fletching', tier: 0, price: 18, stats: { aim: 2 } },
  { id: 'candle', name: "Scholar's Candle", tier: 0, price: 18, stats: { lore: 2 } },
  { id: 'boots', name: 'Marching Boots', tier: 0, price: 16, stats: { speed: 5 } },
  { id: 'herbs', name: 'Healing Herbs', tier: 0, price: 16, stats: { regen: 2 } },
  { id: 'purse', name: 'Deep Purse', tier: 0, price: 20, stats: { bounty: 10 } },
  { id: 'buckler', name: 'Dented Buckler', tier: 0, price: 18, stats: { armor: 1 } },
  { id: 'horseshoe', name: 'Old Horseshoe', tier: 0, price: 18, stats: { luck: 10 } },
  { id: 'keg', name: 'Keg of Ale', tier: 1, price: 38, stats: { maxHp: 8, speed: -3 } },
  { id: 'wardrum', name: 'War Drum', tier: 1, price: 44, stats: { haste: 10 } },
  { id: 'hawk', name: 'Hunting Hawk', tier: 1, price: 42, stats: { aim: 3, reach: 20 } },
  { id: 'grimoire', name: 'Grimoire', tier: 1, price: 42, stats: { lore: 4, maxHp: -2 } },
  { id: 'mail', name: 'Mail Shirt', tier: 1, price: 44, stats: { armor: 3, speed: -4 } },
  { id: 'spyglass', name: 'Spyglass', tier: 1, price: 40, stats: { reach: 35, crit: 3 } },
  { id: 'lodestone', name: 'Lodestone', tier: 1, price: 36, stats: { pickup: 50, bounty: 5 } },
  { id: 'cloak', name: 'Shadow Cloak', tier: 1, price: 44, stats: { dodge: 8 } },
  { id: 'banner', name: 'Legion Banner', tier: 2, price: 84, stats: { damage: 12 } },
  { id: 'horn', name: 'Horn of Fury', tier: 2, price: 82, stats: { haste: 16, armor: -1 } },
  { id: 'chalice', name: 'Chalice', tier: 2, price: 86, stats: { lifesteal: 5, regen: 3 } },
  { id: 'gauntlets', name: "Giant's Gauntlets", tier: 2, price: 84, stats: { might: 6, haste: -5 } },
  { id: 'hourglass', name: 'Hourglass', tier: 2, price: 88, stats: { haste: 8, speed: 6 } },
  { id: 'crown', name: 'Crown of the Line', tier: 3, price: 170, stats: { damage: 15, maxHp: 10 } },
  { id: 'relic', name: 'Sun Relic', tier: 3, price: 165, stats: { lore: 8, crit: 8 } },
  { id: 'stoneheart', name: 'Stone Heart', tier: 3, price: 160, stats: { maxHp: 20, armor: 3, speed: -8 } },
  { id: 'quiver', name: 'Endless Quiver', tier: 3, price: 165, stats: { aim: 6, haste: 10 } },
];

// ---------------------------------------------------------------- a level

/** What a level can raise, and by how much at each tier of the offer. */
export const UPGRADES: ReadonlyArray<{ stat: Stat; by: readonly [number, number, number, number] }> = [
  { stat: 'maxHp', by: [3, 6, 9, 12] },
  { stat: 'regen', by: [2, 3, 4, 5] },
  { stat: 'lifesteal', by: [1, 2, 3, 4] },
  { stat: 'damage', by: [5, 8, 12, 16] },
  { stat: 'might', by: [2, 4, 6, 8] },
  { stat: 'aim', by: [1, 2, 3, 4] },
  { stat: 'lore', by: [1, 2, 3, 4] },
  { stat: 'haste', by: [5, 10, 15, 20] },
  { stat: 'crit', by: [3, 5, 7, 9] },
  { stat: 'reach', by: [15, 30, 45, 60] },
  { stat: 'armor', by: [1, 2, 3, 4] },
  { stat: 'dodge', by: [3, 6, 9, 12] },
  { stat: 'speed', by: [3, 6, 9, 12] },
  { stat: 'luck', by: [5, 10, 15, 20] },
  { stat: 'bounty', by: [5, 8, 12, 16] },
];

/** How many things a level offers to choose from. */
export const CHOICES = 4;

/** Experience from the start of a level to the next. A coin is one. */
export function levelNeeds(level: number): number {
  return Math.round(12 + 9 * level + 1.2 * level * level);
}

/**
 * How likely each tier is when something is offered, as weights. Better
 * tiers open as the waves go by and Luck brings them sooner. `step` is the
 * wave for the camp's wares and the level for a level's choices.
 */
export function tierWeights(step: number, luck: number): [number, number, number, number] {
  const lucky = 1 + Math.max(-90, luck) / 100;
  return [100, Math.max(0, step - 1) * 7 * lucky, Math.max(0, step - 5) * 3.5 * lucky, Math.max(0, step - 9) * 1.6 * lucky];
}

// ---------------------------------------------------------------- the camp

/** Wares on offer at once. */
export const OFFERS = 4;
/** How much dearer everything is each wave. */
export const PRICE_RISE = 0.07;
/** A weapon sold gives back this share of what its tier costs at the first wave's prices. */
export const SELL_SHARE = 0.5;
/** The share of offers that are weapons, while there is a hand free and after. */
export const WEAPON_SHARE = 0.4;
/** A weapon offered is, this often, one already carried: so that two of a kind can be joined. */
export const SAME_AGAIN = 0.35;
/** A weapon offered that is not one already carried is, this often, of a kind the hero holds: so that a kind can be built up. */
export const KIND_AGAIN = 0.35;

export function priceAt(base: number, wave: number): number {
  return Math.max(1, Math.round(base * (1 + PRICE_RISE * (wave - 1))));
}

/** What it costs to see other wares: more each wave, and more each time in one camp. */
export function rerollCost(wave: number, times: number): number {
  return Math.round((1 + times) * (2 + wave * 0.6));
}

// ---------------------------------------------------------------- enemies

/**
 * How an enemy fights.
 * walk: comes at the hero.
 * shoot: keeps its distance and looses something slow enough to step out of.
 * charge: stops, turns to the hero, then runs through where they stood.
 * bomb: runs in, lights its fuse and bursts.
 * summon: stays back and calls others up.
 * boost: stays back; whoever is near it is faster.
 * boss: all of it, in turns.
 * cross: goes over the field from one side to the other and hurts nobody (the pay wagon).
 * still: stands where it is and hurts nobody (a cage).
 */
export type Ai = 'walk' | 'shoot' | 'charge' | 'bomb' | 'summon' | 'boost' | 'boss' | 'cross' | 'still';

export interface EnemyDef {
  id: string;
  /** The figure the kit draws for it. */
  unit: string;
  name: string;
  ai: Ai;
  /** Health and harm at the first wave. Both grow with the wave (ENEMY_GROWTH). */
  hp: number;
  dmg: number;
  speed: number;
  /** How big it is to whatever touches it. */
  r: number;
  /** What it leaves, in coins. */
  coins: number;
  /** How big it is drawn, beside a soldier. */
  size?: number;
  /** shoot, summon, boost: how far it stays off. */
  keep?: number;
  /** shoot, summon: seconds between. */
  every?: number;
  /** shoot: how fast what it looses flies. */
  flies?: number;
  /** shoot: what it looses slows the hero by this share for two seconds. */
  chills?: number;
  /** charge: how fast it runs once it has turned. */
  dash?: number;
  /** bomb: how wide it bursts. */
  burst?: number;
  /** summon, boss: who it calls. */
  calls?: string;
  /** boost: how far its drum carries. */
  aura?: number;
  /** A thing, not a fighter: the picture it is shown with in place of a figure. It is only ever put on the field by a road's omen (road.ts). */
  prop?: string;
}

export const ENEMIES: readonly EnemyDef[] = [
  // Thornwood.
  { id: 'cutpurse', unit: 'cutpurse', name: 'Cutpurse', ai: 'walk', hp: 6, dmg: 1, speed: 104, r: 13, coins: 1 },
  { id: 'warhound', unit: 'warhound', name: 'War Hound', ai: 'walk', hp: 4, dmg: 1, speed: 150, r: 12, coins: 1, size: 0.9 },
  { id: 'poacher', unit: 'poacher', name: 'Poacher', ai: 'shoot', hp: 9, dmg: 1, speed: 70, r: 13, coins: 2, keep: 250, every: 2.8, flies: 200 },
  { id: 'bruiser', unit: 'bruiser', name: 'Bruiser', ai: 'walk', hp: 30, dmg: 2, speed: 58, r: 18, coins: 4, size: 1.2 },
  { id: 'packram', unit: 'packram', name: 'Ram', ai: 'charge', hp: 18, dmg: 2, speed: 72, r: 15, coins: 3, dash: 430 },
  { id: 'hexer', unit: 'hexer', name: 'Hexer', ai: 'summon', hp: 24, dmg: 2, speed: 62, r: 14, coins: 5, keep: 330, every: 5.5, calls: 'cutpurse' },
  { id: 'direwolf', unit: 'direwolf', name: 'Dire Wolf', ai: 'walk', hp: 10, dmg: 1, speed: 158, r: 14, coins: 2 },
  { id: 'warlord', unit: 'warlord', name: 'The Warlord', ai: 'boss', hp: 440, dmg: 2, speed: 84, r: 26, coins: 40, size: 1.55, every: 3, flies: 210, dash: 420, calls: 'cutpurse' },
  // The dunes.
  { id: 'lancer', unit: 'lancer', name: 'Lancer', ai: 'walk', hp: 9, dmg: 2, speed: 112, r: 13, coins: 1 },
  { id: 'scarab', unit: 'scarab', name: 'Scarab', ai: 'walk', hp: 16, dmg: 2, speed: 92, r: 16, coins: 2 },
  { id: 'javelineer', unit: 'javelineer', name: 'Javelineer', ai: 'shoot', hp: 10, dmg: 2, speed: 74, r: 13, coins: 2, keep: 270, every: 2.6, flies: 230 },
  { id: 'powdermonkey', unit: 'powdermonkey', name: 'Powder Monkey', ai: 'bomb', hp: 7, dmg: 5, speed: 132, r: 12, coins: 2, burst: 84 },
  { id: 'yak', unit: 'yak', name: 'Yak', ai: 'charge', hp: 34, dmg: 4, speed: 62, r: 20, coins: 5, dash: 410, size: 1.1 },
  { id: 'drummer', unit: 'drummer', name: 'War Drummer', ai: 'boost', hp: 22, dmg: 2, speed: 66, r: 14, coins: 6, keep: 300, aura: 230 },
  { id: 'medjay', unit: 'medjay', name: 'Medjay', ai: 'walk', hp: 44, dmg: 4, speed: 76, r: 17, coins: 5, size: 1.15 },
  { id: 'colossus', unit: 'colossus', name: 'The Colossus', ai: 'boss', hp: 700, dmg: 5, speed: 66, r: 32, coins: 70, size: 1.7, every: 2.4, flies: 220, dash: 380, calls: 'scarab' },
  // Frostholt.
  { id: 'huscarl', unit: 'huscarl', name: 'Huscarl', ai: 'walk', hp: 14, dmg: 3, speed: 102, r: 14, coins: 2 },
  { id: 'harpooner', unit: 'harpooner', name: 'Harpooner', ai: 'shoot', hp: 11, dmg: 2, speed: 72, r: 13, coins: 2, keep: 280, every: 2.5, flies: 240 },
  { id: 'frostwitch', unit: 'frostwitch', name: 'Frost Witch', ai: 'shoot', hp: 13, dmg: 2, speed: 66, r: 13, coins: 4, keep: 300, every: 3, flies: 200, chills: 0.35 },
  { id: 'icegolem', unit: 'icegolem', name: 'Rime Golem', ai: 'walk', hp: 70, dmg: 5, speed: 60, r: 24, coins: 8, size: 1.3 },
  { id: 'skald', unit: 'skald', name: 'Skald', ai: 'boost', hp: 24, dmg: 2, speed: 66, r: 14, coins: 6, keep: 300, aura: 230 },
  { id: 'warbear', unit: 'warbear', name: 'War Bear', ai: 'charge', hp: 40, dmg: 5, speed: 66, r: 21, coins: 6, dash: 420, size: 1.1 },
  { id: 'jarl', unit: 'jarl', name: 'The Jarl', ai: 'boss', hp: 900, dmg: 6, speed: 80, r: 28, coins: 120, size: 1.6, every: 2.2, flies: 240, dash: 430, calls: 'direwolf' },
  // What a road may put on the field. Their health grows with the wave as an enemy's does; neither is in any wave's mix.
  { id: 'paywagon', unit: '', name: 'Pay Wagon', ai: 'cross', hp: 70, dmg: 0, speed: 30, r: 30, coins: 0, size: 1.2, prop: 'wagon' },
  { id: 'cage', unit: '', name: 'Cage', ai: 'still', hp: 26, dmg: 0, speed: 0, r: 24, coins: 0, prop: 'cage' },
];

/**
 * How enemies grow. Each wave an enemy has `hp` more of its first health, and `hpMore` more again for every wave
 * squared: a hero's harm grows faster than a straight line, as six weapons are bought and joined, and so must theirs.
 * Harm grows the same way, slowly at first: `dmg` each wave and `dmgMore` for every wave squared.
 */
export const ENEMY_GROWTH = { hp: 0.16, hpMore: 0.012, dmg: 0.06, dmgMore: 0.007 };
/** How fast coins thin out: the waves grow far faster than the camp's prices do. */
export const COIN_THINNING = 0.22;
/** Past the last of the written waves, health grows by this share of itself every wave besides. */
export const ENDLESS_GROWTH = 0.16;

// ---------------------------------------------------------------- waves

export type Land = 'meadow' | 'desert' | 'snow';
export const LAND_NAMES: Record<Land, string> = { meadow: 'Thornwood', desert: 'Sunscar Dunes', snow: 'Frostholt' };

export interface WaveDef {
  n: number;
  seconds: number;
  land: Land;
  /** Who comes, and how often each beside the others. */
  mix: ReadonlyArray<readonly [string, number]>;
  /** Seconds between one band of them and the next, and how many are in a band. */
  gap: number;
  band: number;
  /** The most that are on the field at once. */
  most: number;
  /** Who leads them, on a wave that has a boss. */
  boss?: string;
}

/** The written waves: after the last of them the lands come round again, harder each time. */
export const LAST_WAVE = 20;

const MIXES: ReadonlyArray<ReadonlyArray<readonly [string, number]>> = [
  [['cutpurse', 1]],
  [['cutpurse', 3], ['warhound', 1]],
  [['cutpurse', 3], ['warhound', 2], ['poacher', 1]],
  [['cutpurse', 3], ['warhound', 2], ['poacher', 1], ['bruiser', 0.5]],
  [['cutpurse', 3], ['warhound', 2], ['poacher', 1.4], ['bruiser', 0.9], ['packram', 0.7]],
  [['cutpurse', 2], ['direwolf', 2], ['poacher', 1.4], ['bruiser', 1], ['packram', 1], ['hexer', 0.3]],
  [['cutpurse', 3], ['direwolf', 2], ['poacher', 1]],
  [['lancer', 3], ['scarab', 1]],
  [['lancer', 3], ['scarab', 2], ['javelineer', 1]],
  [['lancer', 3], ['scarab', 2], ['javelineer', 1.4], ['powdermonkey', 1]],
  [['lancer', 3], ['scarab', 2], ['javelineer', 1.4], ['powdermonkey', 1], ['yak', 0.6]],
  [['lancer', 3], ['scarab', 2], ['javelineer', 1.4], ['powdermonkey', 1], ['yak', 0.6], ['medjay', 0.6], ['drummer', 0.2]],
  [['lancer', 2], ['scarab', 2], ['javelineer', 1.6], ['powdermonkey', 1.2], ['yak', 0.8], ['medjay', 0.8], ['drummer', 0.25]],
  [['lancer', 3], ['scarab', 2], ['javelineer', 1], ['powdermonkey', 1]],
  [['huscarl', 2], ['direwolf', 3]],
  [['huscarl', 2], ['direwolf', 3], ['harpooner', 1.5]],
  [['huscarl', 2], ['direwolf', 2.5], ['harpooner', 1.5], ['frostwitch', 0.8]],
  [['huscarl', 2], ['direwolf', 2.5], ['harpooner', 1.5], ['frostwitch', 0.8], ['icegolem', 0.4], ['warbear', 0.6]],
  [['huscarl', 2], ['direwolf', 2.5], ['harpooner', 1.5], ['frostwitch', 0.8], ['icegolem', 0.5], ['warbear', 0.7], ['skald', 0.22]],
  [['huscarl', 2], ['direwolf', 3], ['harpooner', 1.5]],
];

const BOSSES: Record<number, string> = { 7: 'warlord', 14: 'colossus', 20: 'jarl' };
const LANDS: readonly Land[] = ['meadow', 'desert', 'snow'];

/** The wave of a number, however high. */
export function waveOf(n: number): WaveDef {
  // Past the written waves the same twenty come round again: only their number, which is what makes them harder, goes on.
  const at = ((n - 1) % LAST_WAVE) + 1;
  const boss = BOSSES[at];
  return {
    n,
    seconds: boss ? 75 : Math.min(60, 20 + 5 * (at - 1)),
    land: LANDS[at <= 7 ? 0 : at <= 14 ? 1 : 2],
    mix: MIXES[at - 1],
    gap: Math.max(1.2, 2.6 - 0.07 * Math.min(n, 30)),
    // A wave with a boss in it has fewer of the rest: the boss is the wave.
    band: Math.max(2, Math.round((3 + Math.floor(Math.min(n, 40) / 3)) * (boss ? 0.6 : 1))),
    most: Math.min(110, 22 + 5 * n),
    boss,
  };
}

/** Which land a wave is fought in, counted from 0 and on past the written waves: what happens once in a land asks this. */
export function landAt(n: number): number {
  const at = ((n - 1) % LAST_WAVE) + 1;
  return Math.floor((n - 1) / LAST_WAVE) * LANDS.length + (at <= 7 ? 0 : at <= 14 ? 1 : 2);
}

/** The chance that each coin an enemy carries is left on the ground, on a wave. */
export function coinShare(wave: number): number {
  return 1 / (1 + COIN_THINNING * (wave - 1));
}

/** An enemy's health and harm on a wave. */
export function enemyAt(def: EnemyDef, wave: number): { hp: number; dmg: number } {
  const past = Math.max(0, wave - LAST_WAVE);
  const w = wave - 1;
  const hp = def.hp * (1 + ENEMY_GROWTH.hp * w + ENEMY_GROWTH.hpMore * w * w) * Math.pow(1 + ENDLESS_GROWTH, past);
  const dmg = def.dmg * (1 + ENEMY_GROWTH.dmg * w + ENEMY_GROWTH.dmgMore * w * w) * Math.pow(1 + ENDLESS_GROWTH * 0.5, past);
  return { hp: Math.max(1, Math.round(hp)), dmg: Math.max(1, Math.round(dmg)) };
}

// ---------------------------------------------------------------- the field

/** The arena, in its own units: wide for a wide window, tall for a tall one. */
export const ARENA = { long: 1400, short: 1000, edge: 34 };
/** What a boss looses in a ring does this share of what its touch does: there are ten of them at once. */
export const RING_SHARE = 0.6;
/** Seconds an enemy is marked on the ground before it stands there. */
export const MARK_SECONDS = 0.9;
/** No enemy is marked nearer the hero than this. */
export const MARK_CLEAR = 190;
/** Seconds after a wave ends in which what was left on the ground comes in. */
export const GATHER_SECONDS = 1.3;
/** The chance that one of the fallen leaves a heart, which gives back this much. */
export const HEART = { chance: 0.02, mends: 3 };

export const byId = <T extends { id: string }>(list: readonly T[], id: string): T => {
  const found = list.find((x) => x.id === id);
  if (!found) throw new Error(`data: nothing is called "${id}"`);
  return found;
};
