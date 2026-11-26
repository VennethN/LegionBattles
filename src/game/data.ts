// Every number of the game, and what each is for. The rules (world.ts,
// run.ts) read these and know none of their own. A change here is measured
// with `npm run pace` before and after. The heroes are in heroes.ts and
// the companions in companions.ts; both are handed on from here.

import { SIGNATURES } from './heroes';
import type { Kind } from './kinds';
import { FIFTH_STEP, withFifth, type Fx } from './forms';
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
/** What each point of Lore adds to the harm a second of a fire the hero's weapons light. */
export const BURN_LORE = 0.25;
/** The share that a coin still on the ground when a wave ends is worth: in coins, and in what coins give. */
export const LATE_COIN = 0.5;

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
export * from './holdData';
export * from './mastery';

// ---------------------------------------------------------------- weapons

export const TIERS = 4;
/** What the tiers are called, plainest first. */
export const TIER_NAMES = ['I', 'II', 'III', 'IV', 'V'] as const;

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
  dmg: readonly number[];
  /** How much of Might, Aim and Lore is added to that. */
  scale: { might?: number; aim?: number; lore?: number };
  /** Seconds between strikes at each tier. */
  every: readonly number[];
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
  burn?: readonly number[];
  /** Cold: slows by this share for two seconds. */
  slow?: number;
  /** Poison: leaves a cloud that does this much a second for three seconds. A thrust with this leaves it where its first mark stood, as wide as `burst`. */
  cloud?: readonly number[];
  /** Seconds it stuns. */
  stun?: number;
  /** How many more enemies what it looses leaps to after the first. */
  leaps?: number;
  /** What a pulse gives back in health at each tier. A slam with this gives it back when it fells someone. */
  mends?: readonly number[];
  /** Holy water: where it bursts the ground is holy for four seconds, does this much a second, and mends the band that stands on it. */
  holy?: readonly number[];
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
  { id: 'sword', name: 'Sword', kinds: ['blade'], kind: 'melee', motion: 'sweep', dmg: [8, 13, 20, 31], scale: { might: 1 }, every: [1.05, 0.97, 0.9, 0.82], range: 92, crit: 5, critBy: 2, knock: 14, arc: 80, price: 20, says: 'Sweeps an arc in front of you.' },
  { id: 'dagger', name: 'Dagger', kinds: ['blade'], kind: 'melee', motion: 'thrust', dmg: [5, 8, 12, 19], scale: { might: 0.7 }, every: [0.58, 0.53, 0.48, 0.42], range: 78, crit: 20, critBy: 2.5, knock: 4, pierce: 1, price: 18, says: 'Fast stabs with a 20% crit chance.' },
  { id: 'spear', name: 'Spear', kinds: ['pole'], kind: 'melee', motion: 'thrust', dmg: [10, 16, 24, 37], scale: { might: 1 }, every: [1.25, 1.16, 1.07, 0.98], range: 150, crit: 5, critBy: 2, knock: 20, pierce: 3, price: 22, says: 'Long thrust. Hits up to 3 enemies in a line.' },
  { id: 'greataxe', name: 'Great Axe', kinds: ['blade', 'blunt'], kind: 'melee', motion: 'sweep', dmg: [16, 25, 38, 58], scale: { might: 1.6 }, every: [1.8, 1.68, 1.56, 1.44], range: 108, crit: 5, critBy: 2, knock: 26, arc: 130, price: 26, says: 'Slow, wide, heavy sweeps.' },
  { id: 'hammer', name: 'War Hammer', kinds: ['blunt'], kind: 'melee', motion: 'slam', dmg: [13, 20, 31, 47], scale: { might: 1.3 }, every: [1.65, 1.54, 1.43, 1.32], range: 96, crit: 0, critBy: 2, knock: 10, burst: 56, stun: 0.7, price: 26, says: 'Stuns every enemy it lands on for 0.7 s.' },
  { id: 'torch', name: 'Torch', kinds: ['fire', 'blunt'], kind: 'melee', motion: 'thrust', dmg: [4, 6, 9, 14], scale: { might: 0.4, lore: 0.4 }, every: [0.9, 0.84, 0.78, 0.72], range: 84, crit: 0, critBy: 2, knock: 6, pierce: 2, burn: [3, 5, 8, 12], price: 20, says: 'Sets enemies on fire.' },
  { id: 'bow', name: 'Bow', kinds: ['bow'], kind: 'ranged', motion: 'shoot', dmg: [7, 11, 17, 26], scale: { aim: 1 }, every: [1.1, 1.02, 0.94, 0.86], range: 400, crit: 5, critBy: 2, knock: 6, pierce: 0, flies: 620, shot: 'arrow', price: 20, says: 'Shoots the nearest enemy.' },
  { id: 'crossbow', name: 'Crossbow', kinds: ['bow'], kind: 'ranged', motion: 'shoot', dmg: [14, 22, 33, 50], scale: { aim: 1.4 }, every: [1.9, 1.78, 1.66, 1.54], range: 460, crit: 10, critBy: 2, knock: 16, pierce: 2, flies: 760, shot: 'bolt', price: 26, says: 'Slow, heavy bolt. Hits up to 3 enemies in a line.' },
  { id: 'javelin', name: 'Javelin', kinds: ['pole', 'thrown'], kind: 'ranged', motion: 'shoot', dmg: [11, 17, 26, 40], scale: { aim: 0.8, might: 0.6 }, every: [1.5, 1.4, 1.3, 1.2], range: 350, crit: 5, critBy: 2, knock: 12, pierce: 1, flies: 560, shot: 'javelin', price: 22, says: 'Thrown spear. Hits up to 2 enemies in a line.' },
  { id: 'sling', name: 'Sling', kinds: ['thrown'], kind: 'ranged', motion: 'shoot', dmg: [4, 6, 10, 15], scale: { aim: 0.6 }, every: [0.56, 0.52, 0.48, 0.43], range: 320, crit: 5, critBy: 2, knock: 3, pierce: 0, leaps: 1, flies: 540, shot: 'stone', price: 18, says: 'Fast stones that bounce to 1 more enemy.' },
  { id: 'bomb', name: 'Powder Bomb', kinds: ['thrown', 'fire'], kind: 'ranged', motion: 'lob', dmg: [12, 19, 29, 44], scale: { aim: 0.5, lore: 0.5 }, every: [2.2, 2.06, 1.92, 1.78], range: 330, crit: 0, critBy: 2, knock: 18, burst: 74, flies: 330, shot: 'bomb', price: 26, says: 'Explodes where it lands.' },
  { id: 'staff', name: 'Arcane Staff', kinds: ['arcane'], kind: 'magic', motion: 'cast', dmg: [10, 16, 24, 37], scale: { lore: 1 }, every: [1.1, 1.02, 0.94, 0.86], range: 390, crit: 5, critBy: 2, knock: 5, pierce: 1, flies: 430, shot: 'orb-arcane', price: 22, says: 'Homing bolt. Hits up to 2 enemies.' },
  { id: 'brazier', name: 'Fire Brazier', kinds: ['fire', 'arcane'], kind: 'magic', motion: 'cast', dmg: [8, 12, 18, 27], scale: { lore: 0.8 }, every: [1.4, 1.31, 1.22, 1.13], range: 320, crit: 0, critBy: 2, knock: 8, burst: 56, burn: [3, 5, 8, 12], flies: 400, shot: 'orb-fire', price: 24, says: 'Fireball. Explodes and sets enemies on fire.' },
  { id: 'frost', name: 'Frost Crystal', kinds: ['frost', 'arcane'], kind: 'magic', motion: 'cast', dmg: [6, 9, 14, 21], scale: { lore: 0.7 }, every: [1.3, 1.21, 1.12, 1.03], range: 360, crit: 0, critBy: 2, knock: 2, pierce: 2, slow: 0.4, flies: 460, shot: 'orb-frost', price: 22, says: 'Slows up to 3 enemies in a line by 40%.' },
  { id: 'venom', name: 'Spore Staff', kinds: ['venom', 'arcane'], kind: 'magic', motion: 'cast', dmg: [3, 5, 7, 11], scale: { lore: 0.5 }, every: [1.7, 1.59, 1.48, 1.37], range: 300, crit: 0, critBy: 2, knock: 0, burst: 62, cloud: [4, 6, 10, 15], flies: 360, shot: 'orb-venom', price: 22, says: 'Leaves a poison cloud that damages enemies inside it.' },
  { id: 'censer', name: 'Censer', kinds: ['holy'], kind: 'magic', motion: 'pulse', dmg: [6, 10, 15, 23], scale: { lore: 0.6 }, every: [4, 3.7, 3.4, 3.1], range: 110, crit: 0, critBy: 2, knock: 16, burst: 112, mends: [1, 1, 2, 2], price: 24, says: 'Pulse of light around you. Each pulse heals you.' },
  // The second armful: so that every kind has four of its own to find.
  { id: 'halberd', name: 'Halberd', kinds: ['pole', 'blade'], kind: 'melee', motion: 'sweep', dmg: [11, 17, 26, 40], scale: { might: 1.2 }, every: [1.45, 1.35, 1.25, 1.15], range: 138, crit: 5, critBy: 2, knock: 22, arc: 56, price: 24, says: 'Long, narrow sweep with strong knockback.' },
  { id: 'trident', name: 'Rime Trident', kinds: ['frost', 'pole'], kind: 'melee', motion: 'thrust', dmg: [7, 11, 17, 26], scale: { might: 0.6, lore: 0.5 }, every: [1.15, 1.07, 0.99, 0.9], range: 134, crit: 0, critBy: 2, knock: 10, pierce: 2, slow: 0.35, price: 22, says: 'Thrust. Slows up to 2 enemies by 35%.' },
  { id: 'mace', name: 'Blessed Mace', kinds: ['holy', 'blunt'], kind: 'melee', motion: 'slam', dmg: [8, 13, 20, 31], scale: { might: 0.9 }, every: [1.2, 1.12, 1.04, 0.95], range: 86, crit: 0, critBy: 2, knock: 8, burst: 44, stun: 0.45, mends: [1, 1, 1, 2], price: 24, says: 'Fast slam with a short stun. Kills with it heal you.' },
  { id: 'longbow', name: 'War Bow', kinds: ['bow'], kind: 'ranged', motion: 'shoot', dmg: [13, 20, 31, 47], scale: { aim: 1.5 }, every: [2.1, 1.96, 1.82, 1.68], range: 560, crit: 25, critBy: 3, knock: 10, pierce: 0, flies: 820, shot: 'arrow', price: 26, says: 'Long range and slow. 25% crit chance, and crits deal 3x damage.' },
  { id: 'rimebow', name: 'Rime Bow', kinds: ['frost', 'bow'], kind: 'ranged', motion: 'shoot', dmg: [5, 8, 12, 19], scale: { aim: 0.7, lore: 0.3 }, every: [0.95, 0.88, 0.81, 0.74], range: 380, crit: 5, critBy: 2, knock: 4, pierce: 1, slow: 0.3, flies: 600, shot: 'arrow', price: 22, says: 'Ice arrows. Slow up to 2 enemies by 30%.' },
  { id: 'blowpipe', name: 'Blowpipe', kinds: ['venom', 'bow'], kind: 'ranged', motion: 'shoot', dmg: [3, 5, 7, 11], scale: { aim: 0.5 }, every: [0.8, 0.74, 0.68, 0.62], range: 330, crit: 5, critBy: 2, knock: 0, burst: 36, cloud: [3, 5, 8, 12], flies: 640, shot: 'bolt', price: 20, says: 'Fast darts. Each leaves a small poison cloud.' },
  { id: 'hatchet', name: 'Throwing Axes', kinds: ['blade', 'thrown'], kind: 'ranged', motion: 'shoot', dmg: [10, 16, 24, 37], scale: { might: 0.8, aim: 0.5 }, every: [1.3, 1.21, 1.12, 1.03], range: 280, crit: 12, critBy: 2, knock: 20, pierce: 1, flies: 500, shot: 'javelin', price: 22, says: 'Short range throw. Hits up to 2 enemies in a line.' },
  { id: 'hail', name: 'Hailstones', kinds: ['frost', 'thrown'], kind: 'ranged', motion: 'shoot', dmg: [3, 5, 8, 12], scale: { aim: 0.4, lore: 0.3 }, every: [0.62, 0.57, 0.52, 0.47], range: 300, crit: 0, critBy: 2, knock: 2, pierce: 0, leaps: 1, slow: 0.2, flies: 520, shot: 'stone', price: 20, says: 'Fast stones that bounce to 1 more enemy and slow by 20%.' },
  { id: 'holywater', name: 'Holy Water', kinds: ['holy', 'thrown'], kind: 'ranged', motion: 'lob', dmg: [7, 11, 17, 26], scale: { lore: 0.6, aim: 0.3 }, every: [2.6, 2.43, 2.26, 2.1], range: 300, crit: 0, critBy: 2, knock: 6, burst: 70, holy: [3, 5, 8, 12], flies: 320, shot: 'bomb', price: 26, says: 'Leaves holy ground that damages enemies and heals you.' },
  { id: 'gourd', name: 'Spore Gourd', kinds: ['venom', 'thrown'], kind: 'ranged', motion: 'lob', dmg: [4, 6, 9, 14], scale: { lore: 0.4, aim: 0.2 }, every: [2.4, 2.25, 2.1, 1.95], range: 310, crit: 0, critBy: 2, knock: 0, burst: 88, cloud: [5, 8, 12, 18], flies: 320, shot: 'bomb', price: 24, says: 'Leaves a wide poison cloud.' },
  { id: 'sunbrand', name: 'Sunbrand', kinds: ['holy', 'fire'], kind: 'melee', motion: 'sweep', dmg: [6, 10, 15, 23], scale: { might: 0.7, lore: 0.5 }, every: [1.1, 1.02, 0.94, 0.86], range: 96, crit: 5, critBy: 2, knock: 10, arc: 90, burn: [3, 5, 8, 12], price: 24, says: 'Sweep that sets every enemy it hits on fire.' },
  { id: 'fang', name: 'Serpent Sickle', kinds: ['venom', 'blade'], kind: 'melee', motion: 'thrust', dmg: [4, 7, 10, 16], scale: { might: 0.6 }, every: [0.7, 0.65, 0.6, 0.54], range: 80, crit: 15, critBy: 2.5, knock: 4, pierce: 1, burst: 34, cloud: [3, 5, 8, 12], price: 22, says: 'Fast cuts that leave a small poison cloud.' },
  { id: 'wand', name: 'Spark Wand', kinds: ['arcane'], kind: 'magic', motion: 'cast', dmg: [4, 6, 10, 15], scale: { lore: 0.5 }, every: [0.6, 0.55, 0.5, 0.45], range: 340, crit: 5, critBy: 2, knock: 2, pierce: 0, leaps: 2, flies: 520, shot: 'orb-arcane', price: 22, says: 'Fast sparks that bounce to 2 more enemies.' },
];

// Each weapon's numbers at tier V, the fifth form two tier IV weapons merge into (forms.ts): worked out from tier IV,
// so that a weapon's table stays four numbers a line.
for (const w of WEAPONS) {
  const more = (four: readonly number[] | undefined): number[] | undefined => (four ? withFifth(four, FIFTH_STEP.more) : undefined);
  Object.assign(w, { dmg: more(w.dmg), every: withFifth(w.every, FIFTH_STEP.every), burn: more(w.burn), cloud: more(w.cloud), mends: more(w.mends), holy: more(w.holy) });
}

/** A weapon by its name, a hero's own among them. */
export function weaponOf(id: string): WeaponDef {
  const found = WEAPONS.find((w) => w.id === id) ?? SIGNATURES.find((w) => w.id === id);
  if (!found) throw new Error(`data: no weapon is called "${id}"`);
  return found;
}

/** How much dearer each tier is than the first. */
export const TIER_PRICE = [1, 2.1, 4.3, 8.5, FIFTH_STEP.price] as const;

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
  /** A land's own ware: sold only in that land's shops. */
  land?: Land;
  /** A small rule it carries besides its stats, on every weapon's blows (forms.ts). */
  fx?: Fx;
  /** That rule in a line a player reads. */
  says?: string;
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
  // Each land's own two wares, sold only in its shops: something to want after the slots are full, and a reason a land feels its own.
  { id: 'reedpipe', name: 'Reed Pipe', tier: 1, price: 40, land: 'meadow', stats: { speed: 4 }, fx: { kind: 'coin', chance: 0.08 }, says: 'Kills drop a coin 8% of the time.' },
  { id: 'thornbrace', name: 'Thorn Bracer', tier: 2, price: 70, land: 'meadow', stats: { armor: 2 }, fx: { kind: 'slow', by: 0.2, secs: 1.5 }, says: 'Hits slow the enemy by 20% for 1.5 s.' },
  { id: 'leechjar', name: 'Leech Jar', tier: 1, price: 44, land: 'mire', stats: { regen: 2 }, fx: { kind: 'mend', heal: 1 }, says: 'Kills heal you 1 HP.' },
  { id: 'mudboots', name: 'Mud Boots', tier: 2, price: 72, land: 'mire', stats: { maxHp: 6, speed: 3 }, fx: { kind: 'pull', r: 70 }, says: 'Hits drag nearby enemies in toward the one struck.' },
  { id: 'sunglass', name: 'Burning Glass', tier: 1, price: 44, land: 'desert', stats: { crit: 3 }, fx: { kind: 'burn', per: 3, secs: 2 }, says: 'Hits burn for 3 damage a second for 2 s.' },
  { id: 'scarab', name: 'Scarab Charm', tier: 2, price: 76, land: 'desert', stats: { luck: 15 }, fx: { kind: 'coin', chance: 0.12 }, says: 'Kills drop a coin 12% of the time.' },
  { id: 'icepick', name: 'Ice Pick', tier: 1, price: 44, land: 'snow', stats: { might: 2 }, fx: { kind: 'stun', every: 12, secs: 0.4 }, says: 'Every 12th hit freezes the enemy for 0.4 s.' },
  { id: 'wolfpelt', name: 'Wolf Pelt', tier: 2, price: 76, land: 'snow', stats: { maxHp: 10, armor: 1 }, fx: { kind: 'slow', by: 0.25, secs: 1.5 }, says: 'Hits slow the enemy by 25% for 1.5 s.' },
  { id: 'harpoon', name: 'Rope Harpoon', tier: 1, price: 46, land: 'coast', stats: { reach: 15 }, fx: { kind: 'pull', r: 80 }, says: 'Hits drag nearby enemies in toward the one struck.' },
  { id: 'pearl', name: 'Black Pearl', tier: 2, price: 80, land: 'coast', stats: { crit: 4, luck: 10 }, fx: { kind: 'mark', by: 0.1, secs: 3 }, says: 'Hits mark the enemy: it takes 10% more from everything for 3 s.' },
  { id: 'blastcap', name: 'Blasting Cap', tier: 1, price: 48, land: 'mine', stats: { damage: 4 }, fx: { kind: 'burst', every: 10, share: 0.6, r: 70 }, says: 'Every 10th hit bursts for 60% of its damage around the enemy.' },
  { id: 'minerlamp', name: "Miner's Lamp", tier: 2, price: 80, land: 'mine', stats: { armor: 2, pickup: 40 }, fx: { kind: 'mark', by: 0.12, secs: 3 }, says: 'Hits mark the enemy: it takes 12% more from everything for 3 s.' },
  { id: 'saddle', name: 'Horse Saddle', tier: 1, price: 48, land: 'steppe', stats: { speed: 7 }, fx: { kind: 'chain', share: 0.25, r: 100 }, says: 'Hits jump to one more enemy for 25% damage.' },
  { id: 'kumis', name: 'Skin of Kumis', tier: 2, price: 82, land: 'steppe', stats: { maxHp: 8, haste: 6 }, fx: { kind: 'mend', heal: 1 }, says: 'Kills heal you 1 HP.' },
  { id: 'gravebell', name: 'Grave Bell', tier: 1, price: 50, land: 'crypt', stats: { lore: 3 }, fx: { kind: 'stun', every: 10, secs: 0.5 }, says: 'Every 10th hit stuns the enemy for 0.5 s.' },
  { id: 'ossuary', name: 'Bone Reliquary', tier: 2, price: 84, land: 'crypt', stats: { lifesteal: 3 }, fx: { kind: 'mark', by: 0.15, secs: 3 }, says: 'Hits mark the enemy: it takes 15% more from everything for 3 s.' },
  { id: 'cogwheel', name: 'Spring Cog', tier: 1, price: 50, land: 'clock', stats: { haste: 8 }, fx: { kind: 'chain', share: 0.3, r: 110 }, says: 'Hits jump to one more enemy for 30% damage.' },
  { id: 'gearplate', name: 'Gear Plate', tier: 2, price: 86, land: 'clock', stats: { armor: 3, maxHp: 6 }, fx: { kind: 'stun', every: 9, secs: 0.5 }, says: 'Every 9th hit stuns the enemy for 0.5 s.' },
  { id: 'tongs', name: "Smith's Tongs", tier: 1, price: 52, land: 'ember', stats: { might: 3 }, fx: { kind: 'burn', per: 5, secs: 2 }, says: 'Hits burn for 5 damage a second for 2 s.' },
  { id: 'cinderheart', name: 'Cinder Heart', tier: 2, price: 88, land: 'ember', stats: { damage: 8 }, fx: { kind: 'burst', every: 8, share: 0.7, r: 80 }, says: 'Every 8th hit bursts for 70% of its damage around the enemy.' },
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
export const PRICE_RISE = 0.05;
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
 * lob: stays back and throws something that lands where the hero stands: the ground is marked first.
 * circle: rides round the hero at a distance, fast, and shoots as it goes.
 * ward: stays back; whoever is near it takes less from every blow.
 * heal: stays back, and now and then heals whoever is near it.
 */
export type Ai = 'walk' | 'shoot' | 'charge' | 'bomb' | 'summon' | 'boost' | 'boss' | 'cross' | 'still' | 'lob' | 'circle' | 'ward' | 'heal';

/**
 * What a boss does that no other does, besides its round of charge, ring of shots and call.
 * mud: where it walks it leaves mud that slows the hero.
 * slam: it brings its hammer down in a ring round itself, shown first.
 * broadside: it fires a line of shells toward the hero, each landing on marked ground.
 * cavein: rocks fall in a ring round the hero, on marked ground.
 * thrice: it charges three times in a row.
 * overclock: enemies near it move 30% faster, as a drummer's do.
 * raise: what it calls gets up once when it falls.
 */
export type BossWay = 'mud' | 'slam' | 'broadside' | 'cavein' | 'thrice' | 'overclock' | 'raise';

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
  /** A boss's way of its own (BossWay), and for a slam how wide its ring is. */
  way?: BossWay;
  slam?: number;
  /** Gets up once when it falls, with a share of its health, after a moment down. */
  undying?: boolean;
  /** Breaks into two of this when it falls. */
  splits?: string;
  /** lob: how wide what it throws lands. ward, heal: how far it reaches. */
  wide?: number;
}

export const ENEMIES: readonly EnemyDef[] = [
  // Thornwood.
  { id: 'cutpurse', unit: 'cutpurse', name: 'Bandit', ai: 'walk', hp: 6, dmg: 1, speed: 104, r: 13, coins: 1 },
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
  { id: 'powdermonkey', unit: 'powdermonkey', name: 'Bomber', ai: 'bomb', hp: 7, dmg: 5, speed: 132, r: 12, coins: 2, burst: 84 },
  { id: 'yak', unit: 'yak', name: 'Yak', ai: 'charge', hp: 34, dmg: 4, speed: 62, r: 20, coins: 5, dash: 410, size: 1.1 },
  { id: 'drummer', unit: 'drummer', name: 'War Drummer', ai: 'boost', hp: 22, dmg: 2, speed: 66, r: 14, coins: 6, keep: 300, aura: 230 },
  { id: 'medjay', unit: 'medjay', name: 'Tomb Guard', ai: 'walk', hp: 40, dmg: 3, speed: 76, r: 17, coins: 5, size: 1.15 },
  { id: 'colossus', unit: 'colossus', name: 'The Colossus', ai: 'boss', hp: 700, dmg: 5, speed: 66, r: 32, coins: 70, size: 1.7, every: 2.4, flies: 220, dash: 380, calls: 'scarab' },
  // Blackwater Mire.
  { id: 'bogspear', unit: 'bogspear', name: 'Bog Spear', ai: 'walk', hp: 11, dmg: 2, speed: 96, r: 13, coins: 1 },
  { id: 'slime', unit: 'slime', name: 'Slime', ai: 'walk', hp: 22, dmg: 2, speed: 54, r: 18, coins: 2, size: 1.05, splits: 'slimelet' },
  { id: 'slimelet', unit: 'slime', name: 'Slimelet', ai: 'walk', hp: 7, dmg: 1, speed: 84, r: 11, coins: 1, size: 0.6 },
  { id: 'netter', unit: 'netter', name: 'Netter', ai: 'shoot', hp: 10, dmg: 1, speed: 70, r: 13, coins: 2, keep: 260, every: 3, flies: 190, chills: 0.3 },
  { id: 'mudbrute', unit: 'mudbrute', name: 'Mud Brute', ai: 'charge', hp: 34, dmg: 3, speed: 60, r: 19, coins: 5, dash: 400, size: 1.15 },
  { id: 'sporecaller', unit: 'sporecaller', name: 'Spore Caller', ai: 'summon', hp: 22, dmg: 2, speed: 60, r: 14, coins: 5, keep: 320, every: 5.5, calls: 'slime' },
  { id: 'bogwitch', unit: 'bogwitch', name: 'Bog Witch', ai: 'boost', hp: 22, dmg: 2, speed: 64, r: 14, coins: 6, keep: 300, aura: 230 },
  { id: 'mirelord', unit: 'mirelord', name: 'The Mire Lord', ai: 'boss', hp: 560, dmg: 3, speed: 74, r: 30, coins: 55, size: 1.65, every: 2.6, flies: 200, dash: 380, calls: 'slime', way: 'mud' },
  // Frostholt.
  { id: 'huscarl', unit: 'huscarl', name: 'Raider', ai: 'walk', hp: 14, dmg: 3, speed: 102, r: 14, coins: 2 },
  { id: 'harpooner', unit: 'harpooner', name: 'Harpooner', ai: 'shoot', hp: 11, dmg: 2, speed: 72, r: 13, coins: 2, keep: 280, every: 2.9, flies: 240 },
  { id: 'frostwitch', unit: 'frostwitch', name: 'Frost Witch', ai: 'shoot', hp: 13, dmg: 2, speed: 66, r: 13, coins: 4, keep: 300, every: 3, flies: 200, chills: 0.35 },
  { id: 'icegolem', unit: 'icegolem', name: 'Rime Golem', ai: 'walk', hp: 70, dmg: 5, speed: 60, r: 24, coins: 8, size: 1.3 },
  { id: 'skald', unit: 'skald', name: 'War Singer', ai: 'boost', hp: 24, dmg: 2, speed: 66, r: 14, coins: 6, keep: 300, aura: 230 },
  { id: 'warbear', unit: 'warbear', name: 'War Bear', ai: 'charge', hp: 40, dmg: 5, speed: 66, r: 21, coins: 6, dash: 420, size: 1.1 },
  { id: 'jarl', unit: 'jarl', name: 'The Jarl', ai: 'boss', hp: 900, dmg: 6, speed: 80, r: 28, coins: 120, size: 1.6, every: 2.2, flies: 240, dash: 430, calls: 'direwolf' },
  // The Ashen Forge.
  { id: 'brandbearer', unit: 'brandbearer', name: 'Brand Bearer', ai: 'walk', hp: 16, dmg: 3, speed: 116, r: 13, coins: 2 },
  { id: 'cinderguard', unit: 'cinderguard', name: 'Cinder Guard', ai: 'walk', hp: 48, dmg: 4, speed: 70, r: 17, coins: 5, size: 1.15 },
  { id: 'ashcaster', unit: 'ashcaster', name: 'Ash Caster', ai: 'shoot', hp: 14, dmg: 3, speed: 70, r: 13, coins: 3, keep: 290, every: 2.6, flies: 240 },
  { id: 'slagthrower', unit: 'slagthrower', name: 'Slag Thrower', ai: 'bomb', hp: 10, dmg: 7, speed: 128, r: 12, coins: 2, burst: 90 },
  { id: 'emberbrute', unit: 'emberbrute', name: 'Ember Brute', ai: 'charge', hp: 46, dmg: 6, speed: 64, r: 20, coins: 6, dash: 440, size: 1.1 },
  { id: 'taskmaster', unit: 'taskmaster', name: 'Taskmaster', ai: 'boost', hp: 28, dmg: 3, speed: 66, r: 14, coins: 7, keep: 300, aura: 240 },
  { id: 'forgelord', unit: 'forgelord', name: 'The Forge Lord', ai: 'boss', hp: 1150, dmg: 7, speed: 76, r: 30, coins: 160, size: 1.7, every: 2.2, flies: 250, dash: 420, calls: 'brandbearer', way: 'slam', slam: 160 },
  // The Salt Coast.
  { id: 'deckhand', unit: 'deckhand', name: 'Deckhand', ai: 'walk', hp: 14, dmg: 3, speed: 108, r: 13, coins: 1 },
  { id: 'marine', unit: 'marine', name: 'Marine', ai: 'shoot', hp: 14, dmg: 3, speed: 70, r: 13, coins: 2, keep: 300, every: 2.6, flies: 260 },
  { id: 'anchorman', unit: 'anchorman', name: 'Anchorman', ai: 'charge', hp: 40, dmg: 5, speed: 64, r: 19, coins: 5, dash: 430, size: 1.15 },
  { id: 'seawitch', unit: 'seawitch', name: 'Sea Witch', ai: 'lob', hp: 18, dmg: 4, speed: 64, r: 14, coins: 4, keep: 320, every: 3.2, wide: 70 },
  { id: 'quartermaster', unit: 'quartermaster', name: 'Quartermaster', ai: 'summon', hp: 30, dmg: 3, speed: 60, r: 14, coins: 6, keep: 330, every: 5.5, calls: 'deckhand' },
  { id: 'corsair', unit: 'corsair', name: 'The Corsair', ai: 'boss', hp: 820, dmg: 5, speed: 82, r: 28, coins: 90, size: 1.6, every: 2.4, flies: 250, dash: 420, calls: 'deckhand', way: 'broadside', wide: 70 },
  // The Deep Mines.
  { id: 'delver', unit: 'delver', name: 'Delver', ai: 'walk', hp: 16, dmg: 3, speed: 100, r: 13, coins: 1 },
  { id: 'tunnelguard', unit: 'tunnelguard', name: 'Tunnel Guard', ai: 'walk', hp: 50, dmg: 4, speed: 62, r: 18, coins: 5, size: 1.15 },
  { id: 'blaster', unit: 'blaster', name: 'Blaster', ai: 'lob', hp: 14, dmg: 5, speed: 70, r: 13, coins: 3, keep: 300, every: 3, wide: 80 },
  { id: 'runesmith', unit: 'runesmith', name: 'Runesmith', ai: 'ward', hp: 30, dmg: 3, speed: 60, r: 15, coins: 7, keep: 300, wide: 220 },
  { id: 'foreman', unit: 'foreman', name: 'Foreman', ai: 'boost', hp: 28, dmg: 3, speed: 64, r: 14, coins: 7, keep: 300, aura: 240 },
  { id: 'underking', unit: 'underking', name: 'The Under King', ai: 'boss', hp: 900, dmg: 6, speed: 72, r: 30, coins: 110, size: 1.65, every: 2.4, flies: 230, dash: 400, calls: 'delver', way: 'cavein', wide: 80 },
  // The Endless Steppe.
  { id: 'lamellar', unit: 'lamellar', name: 'Steppe Rider', ai: 'walk', hp: 17, dmg: 3, speed: 118, r: 13, coins: 1 },
  { id: 'skirmisher', unit: 'skirmisher', name: 'Skirmisher', ai: 'circle', hp: 14, dmg: 3, speed: 150, r: 13, coins: 2, keep: 260, every: 2.2, flies: 260 },
  { id: 'wrangler', unit: 'wrangler', name: 'Wrangler', ai: 'shoot', hp: 16, dmg: 3, speed: 72, r: 13, coins: 2, keep: 280, every: 2.8, flies: 230, chills: 0.3 },
  { id: 'outrider', unit: 'outrider', name: 'Outrider', ai: 'circle', hp: 30, dmg: 4, speed: 175, r: 18, coins: 5, keep: 300, every: 2, flies: 280, size: 1.1 },
  { id: 'bannerlord', unit: 'bannerlord', name: 'Bannerlord', ai: 'boost', hp: 32, dmg: 3, speed: 66, r: 14, coins: 7, keep: 300, aura: 250 },
  { id: 'khan', unit: 'khan', name: 'The Khan', ai: 'boss', hp: 1000, dmg: 6, speed: 96, r: 30, coins: 130, size: 1.6, every: 2.2, flies: 260, dash: 480, calls: 'lamellar', way: 'thrice' },
  // The Hollow Court.
  { id: 'shroud', unit: 'shroud', name: 'Shroud', ai: 'walk', hp: 15, dmg: 4, speed: 124, r: 13, coins: 1 },
  { id: 'cryptguard', unit: 'cryptguard', name: 'Crypt Guard', ai: 'walk', hp: 40, dmg: 4, speed: 66, r: 17, coins: 4, size: 1.1, undying: true },
  { id: 'urnbearer', unit: 'urnbearer', name: 'Urn Bearer', ai: 'lob', hp: 16, dmg: 4, speed: 64, r: 14, coins: 3, keep: 310, every: 3, wide: 75 },
  { id: 'mourner', unit: 'mourner', name: 'Mourner', ai: 'heal', hp: 26, dmg: 3, speed: 60, r: 14, coins: 7, keep: 320, every: 3, wide: 220 },
  { id: 'ferryman', unit: 'ferryman', name: 'Ferryman', ai: 'charge', hp: 44, dmg: 5, speed: 66, r: 18, coins: 6, dash: 440, size: 1.1 },
  { id: 'cryptkeeper', unit: 'cryptkeeper', name: 'Crypt Keeper', ai: 'summon', hp: 32, dmg: 3, speed: 60, r: 14, coins: 7, keep: 330, every: 5.5, calls: 'shroud' },
  { id: 'hollowking', unit: 'hollowking', name: 'The Hollow King', ai: 'boss', hp: 1150, dmg: 6, speed: 78, r: 28, coins: 150, size: 1.6, every: 2.2, flies: 240, dash: 420, calls: 'cryptguard', way: 'raise' },
  // The Clockwork City.
  { id: 'tinker', unit: 'tinker', name: 'Tinker', ai: 'walk', hp: 18, dmg: 4, speed: 104, r: 13, coins: 1 },
  { id: 'rifleman', unit: 'rifleman', name: 'Rifleman', ai: 'shoot', hp: 16, dmg: 4, speed: 66, r: 13, coins: 2, keep: 380, every: 2.8, flies: 340 },
  { id: 'sapper', unit: 'sapper', name: 'Sapper', ai: 'bomb', hp: 14, dmg: 8, speed: 130, r: 12, coins: 2, burst: 90 },
  { id: 'gearwright', unit: 'gearwright', name: 'Gearwright', ai: 'heal', hp: 30, dmg: 3, speed: 60, r: 14, coins: 7, keep: 320, every: 3, wide: 230 },
  { id: 'clockmage', unit: 'clockmage', name: 'Clock Mage', ai: 'ward', hp: 28, dmg: 3, speed: 60, r: 14, coins: 7, keep: 320, wide: 230 },
  { id: 'ironmonger', unit: 'ironmonger', name: 'The Ironmonger', ai: 'boss', hp: 1250, dmg: 7, speed: 74, r: 30, coins: 160, size: 1.65, every: 2.2, flies: 260, dash: 420, calls: 'tinker', way: 'overclock', aura: 300 },
  // What a road may put on the field. Their health grows with the wave as an enemy's does; neither is in any wave's mix.
  { id: 'paywagon', unit: '', name: 'Pay Wagon', ai: 'cross', hp: 70, dmg: 0, speed: 30, r: 30, coins: 0, size: 1.2, prop: 'wagon' },
  { id: 'cage', unit: '', name: 'Cage', ai: 'still', hp: 26, dmg: 0, speed: 0, r: 24, coins: 0, prop: 'cage' },
];

/**
 * How enemies grow. Each wave an enemy has `hp` more of its first health, and `hpMore` more again for every wave
 * squared: a hero's harm grows faster than a straight line, as six weapons are bought and joined, and so must theirs.
 * Harm grows the same way, slowly at first: `dmg` each wave and `dmgMore` for every wave squared.
 *
 * Since the road, relics and kinds of weapon a hero has far more by the middle of a run than weapons alone gave, so
 * both grow again on top of that: health by `hpLate` of itself for every wave past `hpFrom`, and harm by `dmgLate`
 * for every wave past `dmgFrom`. The early waves are left as they were: there an enemy's harm is 1 or 2, and the
 * smallest change in it is a half or a whole again.
 */
export const ENEMY_GROWTH = { hp: 0.17, hpMore: 0.016, dmg: 0.06, dmgMore: 0.007, hpFrom: 4, hpLate: 0.07, dmgFrom: 7, dmgLate: 0.03, early: 1.6, knee: 10, late: 0.8 };
/** How fast coins thin out: the waves grow far faster than the camp's prices do. */
export const COIN_THINNING = 0.07;
/** Past the last of the written waves, health grows by this share of itself every wave besides. */
export const ENDLESS_GROWTH = 0.16;

// ---------------------------------------------------------------- waves

export type Land = 'meadow' | 'mire' | 'desert' | 'snow' | 'coast' | 'mine' | 'steppe' | 'crypt' | 'clock' | 'ember';

/**
 * A land of the run: ten waves, its own enemies and its boss. `roster` is
 * who comes, the wave of the land each first comes on, and how often each
 * beside the others. The fifth wave of a land brings an elite (a champion)
 * and the tenth its boss. Lands later in the run bring new ways of fighting,
 * not only bigger numbers: things thrown onto marked ground, riders that
 * circle, wards and healers, the dead that get up.
 */
export interface LandDef {
  id: Land;
  name: string;
  roster: ReadonlyArray<readonly [string, number, number]>;
  boss: string;
  /**
   * How many times the health and harm written on its enemies they have. The
   * lands were first written for a run of twenty waves, each land's enemies
   * stronger than the last's; the curve of the waves (ENEMY_GROWTH) now does
   * that, so a later land's are brought back toward the first's.
   */
  scale: number;
}

export const LANDS_DEF: readonly LandDef[] = [
  { id: 'meadow', name: 'Thornwood', scale: 1, boss: 'warlord', roster: [['cutpurse', 1, 3], ['warhound', 2, 2], ['poacher', 3, 1.4], ['bruiser', 4, 0.7], ['packram', 5, 0.8], ['direwolf', 6, 2], ['hexer', 7, 0.3]] },
  { id: 'mire', name: 'Blackwater Mire', scale: 0.62, boss: 'mirelord', roster: [['bogspear', 1, 3], ['slime', 1, 1.5], ['netter', 2, 1.3], ['mudbrute', 4, 0.7], ['sporecaller', 6, 0.3], ['bogwitch', 8, 0.2]] },
  { id: 'desert', name: 'Sunscar Dunes', scale: 0.6, boss: 'colossus', roster: [['lancer', 1, 3], ['scarab', 1, 2], ['javelineer', 2, 1.4], ['powdermonkey', 3, 1], ['yak', 5, 0.6], ['medjay', 6, 0.4], ['drummer', 8, 0.2]] },
  { id: 'snow', name: 'Frostholt', scale: 0.5, boss: 'jarl', roster: [['huscarl', 1, 2], ['direwolf', 1, 2.5], ['harpooner', 2, 1.5], ['frostwitch', 3, 0.8], ['warbear', 5, 0.5], ['icegolem', 6, 0.35], ['skald', 8, 0.2]] },
  { id: 'coast', name: 'The Salt Coast', scale: 0.48, boss: 'corsair', roster: [['deckhand', 1, 3], ['marine', 2, 1.3], ['anchorman', 3, 0.8], ['seawitch', 4, 0.8], ['quartermaster', 7, 0.25]] },
  { id: 'mine', name: 'The Deep Mines', scale: 0.42, boss: 'underking', roster: [['delver', 1, 3], ['tunnelguard', 2, 1], ['blaster', 3, 1], ['runesmith', 5, 0.4], ['foreman', 7, 0.25]] },
  { id: 'steppe', name: 'The Endless Steppe', scale: 0.42, boss: 'khan', roster: [['lamellar', 1, 3], ['skirmisher', 1, 1.5], ['wrangler', 3, 1], ['outrider', 4, 0.8], ['bannerlord', 7, 0.25]] },
  { id: 'crypt', name: 'The Hollow Court', scale: 0.4, boss: 'hollowking', roster: [['shroud', 1, 3], ['cryptguard', 2, 1], ['urnbearer', 3, 1], ['mourner', 5, 0.4], ['ferryman', 6, 0.6], ['cryptkeeper', 8, 0.2]] },
  { id: 'clock', name: 'The Clockwork City', scale: 0.36, boss: 'ironmonger', roster: [['tinker', 1, 3], ['rifleman', 2, 1.3], ['sapper', 3, 1], ['gearwright', 5, 0.4], ['clockmage', 6, 0.4]] },
  { id: 'ember', name: 'The Ashen Forge', scale: 0.36, boss: 'forgelord', roster: [['brandbearer', 1, 3], ['cinderguard', 1, 1.3], ['ashcaster', 2, 1.4], ['slagthrower', 3, 1], ['emberbrute', 5, 0.8], ['taskmaster', 7, 0.3]] },
];

export const LANDS: readonly Land[] = LANDS_DEF.map((l) => l.id);
export const LAND_NAMES: Record<Land, string> = Object.fromEntries(LANDS_DEF.map((l) => [l.id, l.name])) as Record<Land, string>;

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
  /** True on the fifth wave of a land: an elite comes, a champion of the land. */
  elite?: boolean;
}

/**
 * The written waves: ten lands of ten waves, a boss on every tenth. After
 * the last of them the lands come round again, harder each time. The
 * owner, of 25 November 2026: "let's make 100 waves". Reaching the
 * hundredth is the long goal, after many runs and much of a hero's mastery.
 */
export const LAST_WAVE = 100;
/** How many waves a land has. */
export const LAND_WAVES = 10;
/** How long a wave is at the start of a run and at most, and how long a boss's is if the boss does not fall first. */
export const WAVE_SECONDS = { first: 20, most: 35, boss: 48 };
/** Kept for what asks how long a boss's wave is. */
export const CAPTAIN_SECONDS = WAVE_SECONDS.boss;

/** The wave a boss leads, among the written ones. */
export function bossWave(id: string): number {
  const i = LANDS_DEF.findIndex((l) => l.boss === id);
  return i < 0 ? 0 : (i + 1) * LAND_WAVES;
}

/** Who comes on the wave of a land, counted from 1: each of the land's roster from its own wave on, the newest a little less often. */
function mixOf(land: LandDef, k: number): Array<readonly [string, number]> {
  const out: Array<readonly [string, number]> = [];
  for (const [id, from, weight] of land.roster) {
    if (k < from) continue;
    // One just come on is seen less at first.
    out.push([id, weight * (k === from ? 0.6 : 1)]);
  }
  return out;
}

/** The wave of a number, however high. */
export function waveOf(n: number): WaveDef {
  // Past the written waves the same hundred come round again: only their number, which is what makes them harder, goes on.
  const at = ((n - 1) % LAST_WAVE) + 1;
  const land = LANDS_DEF[Math.floor((at - 1) / LAND_WAVES)];
  const k = ((at - 1) % LAND_WAVES) + 1;
  const boss = k === LAND_WAVES ? land.boss : undefined;
  const s = WAVE_SECONDS;
  // A boss's wave brings only the first of the land's roster, besides the boss: the boss is the wave.
  const mix = boss ? mixOf(land, 3) : mixOf(land, k);
  const seconds = boss ? s.boss : Math.round(Math.min(s.most, s.first + (s.most - s.first) * Math.min(1, (at - 1) / 60) + (k - 1) * 0.6));
  return {
    n,
    seconds,
    land: land.id,
    mix,
    gap: Math.max(1.1, 2.4 - 0.012 * Math.min(n, 120)),
    // A wave with a boss in it has fewer of the rest.
    band: Math.max(2, Math.round((3 + Math.min(n, 140) / 9) * (boss ? 0.6 : 1))),
    most: Math.min(110, 22 + 1.2 * n),
    boss,
    elite: k === 5,
  };
}

/** Which land a wave is fought in, counted from 0 and on past the written waves: what happens once in a land asks this. */
export function landAt(n: number): number {
  return Math.floor((n - 1) / LAND_WAVES);
}

/** The chance that each coin an enemy carries is left on the ground, on a wave. */
export function coinShare(wave: number): number {
  return 1 / (1 + COIN_THINNING * (wave - 1));
}

/** An enemy's health and harm on a wave. */
/** Each enemy's land's scale, by its name (LandDef.scale). One in no land's roster, such as a boss's helper, is its caller's land's. */
const SCALE: Readonly<Record<string, number>> = (() => {
  const out: Record<string, number> = {};
  for (const land of LANDS_DEF) {
    for (const [id] of land.roster) out[id] ??= land.scale;
    out[land.boss] ??= land.scale;
  }
  for (const e of ENEMIES) if (e.splits) out[e.splits] ??= out[e.id] ?? 1;
  for (const e of ENEMIES) if (e.calls) out[e.calls] ??= out[e.id] ?? 1;
  return out;
})();

export function enemyAt(def: EnemyDef, wave: number): { hp: number; dmg: number } {
  const scale = SCALE[def.id] ?? 1;
  const past = Math.max(0, wave - LAST_WAVE);
  const g = ENEMY_GROWTH;
  // The curve was set for a run of twenty waves. A run of a hundred walks it at `early` the pace up to the `knee`, where a
  // first run ends, and at `late` the pace after it: past there a hero grows by many camps, a long mastery and a full band.
  const w100 = Math.min(wave, LAST_WAVE);
  const at = 1 + (Math.min(w100, g.knee) - 1) * g.early + Math.max(0, w100 - g.knee) * g.late;
  const w = at - 1;
  const hp = scale * def.hp * (1 + g.hp * w + g.hpMore * w * w) * (1 + g.hpLate * Math.max(0, at - g.hpFrom)) * Math.pow(1 + ENDLESS_GROWTH, past);
  const dmg = scale * def.dmg * (1 + g.dmg * w + g.dmgMore * w * w) * (1 + g.dmgLate * Math.max(0, at - g.dmgFrom)) * Math.pow(1 + ENDLESS_GROWTH * 0.5, past);
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
