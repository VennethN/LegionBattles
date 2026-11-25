// A run: one hero from the first wave until they fall. Between waves the
// hero levels and trades in the camp; this is the rules of both, and of
// what a wave leaves a run with. It is plain data and functions on it, so
// that a run can be saved in the middle and carried on, and so that the
// pace report can play one without a screen.

import {
  BASE_STATS, HEROES, ITEMS, OFFERS, SAME_AGAIN, SELL_SHARE, SLOTS, TIERS, TIER_PRICE, UPGRADES, WEAPONS, WEAPON_SHARE, byId, levelNeeds, priceAt, rerollCost,
  tierWeights, type HeroDef,
} from './data';
import { Rng } from './rng';
import { sumStats, type Stat, type StatLine, type Stats } from './stats';
import type { Carried, Setup, World } from './world';

export interface Offer {
  kind: 'weapon' | 'item';
  id: string;
  tier: number;
  price: number;
  sold: boolean;
  /** Kept when the wares are changed, and for the next camp. */
  locked: boolean;
}

export interface Choice {
  stat: Stat;
  tier: number;
  by: number;
}

/**
 * fight: a wave is being fought, or is about to be.
 * level: a level was made and its choice is waiting.
 * camp: trading before the next wave.
 * over: the hero has fallen.
 */
export type Phase = 'fight' | 'level' | 'camp' | 'over';

export interface RunData {
  hero: string;
  /** Where the run's own dice are. */
  dice: number;
  /** The wave that is being fought, or will be next. The first is 1. */
  wave: number;
  gold: number;
  /** Experience toward the next level. */
  xp: number;
  level: number;
  /** Levels made whose choice has not been taken yet. */
  pending: number;
  weapons: Carried[];
  items: string[];
  /** What was chosen on each level. */
  ups: Array<{ stat: Stat; by: number }>;
  /** Packs picked up and not opened. */
  packs: number;
  kills: number;
  /** Every coin gathered in the run, before Bounty. */
  coins: number;
  /** Bosses beaten in the run. */
  felled: string[];
  phase: Phase;
  offers: Offer[];
  rerolls: number;
  choices: Choice[];
}

export function heroOf(run: RunData): HeroDef {
  return byId(HEROES, run.hero);
}

export function newRun(hero: string, seed: number): RunData {
  const def = byId(HEROES, hero);
  return {
    hero, dice: seed >>> 0 || 1, wave: 1, gold: 0, xp: 0, level: 0, pending: 0, weapons: [{ id: def.weapon, tier: 0 }], items: [], ups: [], packs: 0,
    kills: 0, coins: 0, felled: [], phase: 'fight', offers: [], rerolls: 0, choices: [],
  };
}

/** Rolls with the run's dice, and leaves them where they came to rest. */
function roll<T>(run: RunData, use: (rng: Rng) => T): T {
  const rng = new Rng(run.dice);
  const out = use(rng);
  run.dice = rng.state;
  return out;
}

/** Every line of the hero's stats, in the order they were come by: for the screen that lists them. */
export function statLines(run: RunData): StatLine[] {
  return [
    BASE_STATS,
    heroOf(run).stats,
    // A level is a point of health besides what was chosen on it.
    { maxHp: run.level },
    ...run.items.map((id) => byId(ITEMS, id).stats),
    ...run.ups.map((u) => ({ [u.stat]: u.by }) as StatLine),
  ];
}

export function statsOf(run: RunData): Stats {
  const s = sumStats(statLines(run));
  s.maxHp = Math.max(1, Math.round(s.maxHp));
  return s;
}

/** What a wave is fought with. The wave's own dice come off the run's, so no two waves are alike. */
export function setupOf(run: RunData, tall = false): Setup {
  return { seed: roll(run, (r) => Math.floor(r.next() * 0x7fffffff) + 1), wave: run.wave, stats: statsOf(run), flag: heroOf(run).flag, weapons: run.weapons, tall };
}

/** A wave has ended: the run takes what it left, and goes on to a level, to the camp, or to its end. */
export function endWave(run: RunData, world: World): void {
  run.gold += Math.round(world.gold);
  run.coins += Math.round(world.xp / (heroOf(run).flag === 'thief' ? 1.5 : 1));
  run.xp += world.xp;
  run.kills += world.kills;
  run.packs += world.packs;
  for (const b of world.felled) if (!run.felled.includes(b)) run.felled.push(b);
  if (world.over !== 'cleared') {
    run.phase = 'over';
    return;
  }
  while (run.xp >= levelNeeds(run.level)) {
    run.xp -= levelNeeds(run.level);
    run.level++;
    run.pending++;
  }
  run.wave++;
  run.rerolls = 0;
  // What was locked is still on the table; the rest of the wares are new.
  rollOffers(run, false);
  if (run.pending > 0) {
    run.phase = 'level';
    rollChoices(run);
  } else run.phase = 'camp';
}

/** How many waves the run has come through. */
export function survived(run: RunData): number {
  return run.wave - 1;
}

// ---------------------------------------------------------------- a level

function rollTier(rng: Rng, step: number, luck: number, most = TIERS - 1): number {
  const w = tierWeights(step, luck);
  const tiers = [0, 1, 2, 3].filter((t) => t <= most);
  return rng.weighted(tiers, (t) => w[t]);
}

function rollChoices(run: RunData): void {
  const luck = statsOf(run).luck;
  run.choices = roll(run, (rng) => {
    const pool = [...UPGRADES];
    const out: Choice[] = [];
    while (out.length < 4 && pool.length > 0) {
      const u = pool.splice(rng.int(pool.length), 1)[0];
      const tier = rollTier(rng, run.level, luck);
      out.push({ stat: u.stat, tier, by: u.by[tier] });
    }
    return out;
  });
}

/** Takes one of a level's choices. */
export function choose(run: RunData, i: number): boolean {
  const c = run.choices[i];
  if (run.phase !== 'level' || !c) return false;
  run.ups.push({ stat: c.stat, by: c.by });
  run.pending--;
  if (run.pending > 0) rollChoices(run);
  else {
    run.choices = [];
    run.phase = 'camp';
  }
  return true;
}

// ---------------------------------------------------------------- the camp

function rollOffer(run: RunData, rng: Rng, slot: number): Offer {
  const luck = statsOf(run).luck;
  // In the first camps two of the wares are always weapons: a hero with one empty hand after another is no fun to play.
  const weapon = (run.wave <= 3 && slot < 2) || rng.chance(WEAPON_SHARE);
  if (weapon) {
    let id: string;
    let tier: number;
    if (run.weapons.length > 0 && rng.chance(SAME_AGAIN)) {
      // One the hero carries already, at its own tier, so that the two can be joined.
      const mine = rng.pick(run.weapons);
      id = mine.id;
      tier = mine.tier;
    } else {
      id = rng.pick(WEAPONS).id;
      tier = rollTier(rng, run.wave, luck);
    }
    const def = byId(WEAPONS, id);
    return { kind: 'weapon', id, tier, price: priceAt(def.price * TIER_PRICE[tier], run.wave), sold: false, locked: false };
  }
  let tier = rollTier(rng, run.wave, luck);
  let pool = ITEMS.filter((it) => it.tier === tier && held(run, it.id) < (it.most ?? 99));
  while (pool.length === 0 && tier > 0) {
    tier--;
    pool = ITEMS.filter((it) => it.tier === tier);
  }
  const item = rng.pick(pool);
  return { kind: 'item', id: item.id, tier: item.tier, price: priceAt(item.price, run.wave), sold: false, locked: false };
}

/** New wares. What is locked stays, unless it was sold. `all` changes even those. */
function rollOffers(run: RunData, all: boolean): void {
  roll(run, (rng) => {
    const next: Offer[] = [];
    for (let i = 0; i < OFFERS; i++) {
      const old = run.offers[i];
      next.push(old && old.locked && !old.sold && !all ? old : rollOffer(run, rng, i));
    }
    run.offers = next;
  });
}

export function held(run: RunData, item: string): number {
  return run.items.filter((id) => id === item).length;
}

/** The place of a weapon the same as this one, which it could be joined with, or -1. */
export function twinOf(run: RunData, id: string, tier: number, not = -1): number {
  if (tier >= TIERS - 1) return -1;
  return run.weapons.findIndex((w, i) => i !== not && w.id === id && w.tier === tier);
}

/** Why a ware cannot be bought, or '' if it can. */
export function whyNot(run: RunData, i: number): '' | 'sold' | 'coins' | 'hands' {
  const o = run.offers[i];
  if (!o || o.sold) return 'sold';
  if (run.gold < o.price) return 'coins';
  if (o.kind === 'weapon' && run.weapons.length >= SLOTS && twinOf(run, o.id, o.tier) < 0) return 'hands';
  return '';
}

/** Buys a ware. A weapon bought with every hand full is joined to its twin at once. */
export function buy(run: RunData, i: number): boolean {
  if (run.phase !== 'camp' || whyNot(run, i) !== '') return false;
  const o = run.offers[i];
  run.gold -= o.price;
  o.sold = true;
  o.locked = false;
  if (o.kind === 'item') run.items.push(o.id);
  else if (run.weapons.length < SLOTS) run.weapons.push({ id: o.id, tier: o.tier });
  else run.weapons[twinOf(run, o.id, o.tier)].tier++;
  return true;
}

/** Joins a weapon with its twin into one of the next tier. */
export function combine(run: RunData, slot: number): boolean {
  const w = run.weapons[slot];
  if (run.phase !== 'camp' || !w) return false;
  const twin = twinOf(run, w.id, w.tier, slot);
  if (twin < 0) return false;
  w.tier++;
  run.weapons.splice(twin, 1);
  return true;
}

/** What a weapon sells for. */
export function sellPrice(w: Carried): number {
  return Math.max(1, Math.round(byId(WEAPONS, w.id).price * TIER_PRICE[w.tier] * SELL_SHARE));
}

/** Sells a weapon. The last one is never sold: a hero with nothing in hand cannot fight. */
export function sell(run: RunData, slot: number): boolean {
  if (run.phase !== 'camp' || !run.weapons[slot] || run.weapons.length <= 1) return false;
  run.gold += sellPrice(run.weapons[slot]);
  run.weapons.splice(slot, 1);
  return true;
}

export function rerollPrice(run: RunData): number {
  return rerollCost(run.wave, run.rerolls);
}

/** Pays to see other wares. What is locked stays. */
export function reroll(run: RunData): boolean {
  const cost = rerollPrice(run);
  if (run.phase !== 'camp' || run.gold < cost) return false;
  run.gold -= cost;
  run.rerolls++;
  rollOffers(run, false);
  return true;
}

export function lock(run: RunData, i: number): boolean {
  const o = run.offers[i];
  if (run.phase !== 'camp' || !o || o.sold) return false;
  o.locked = !o.locked;
  return true;
}

/** Opens a pack: something for nothing, as good as the wave makes likely. Returns what it was. */
export function openPack(run: RunData): string | null {
  if (run.packs <= 0) return null;
  run.packs--;
  const luck = statsOf(run).luck;
  const id = roll(run, (rng) => {
    let tier = rollTier(rng, run.wave + 3, luck);
    let pool = ITEMS.filter((it) => it.tier === tier);
    while (pool.length === 0 && tier > 0) pool = ITEMS.filter((it) => it.tier === --tier);
    return rng.pick(pool).id;
  });
  run.items.push(id);
  return id;
}

/** Leaves the camp for the next wave. */
export function march(run: RunData): boolean {
  if (run.phase !== 'camp') return false;
  run.phase = 'fight';
  return true;
}
