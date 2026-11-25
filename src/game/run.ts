// A run: one hero from the first wave until they fall. Between waves the
// hero levels and trades in the camp; this is the rules of both, and of
// what a wave leaves a run with. It is plain data and functions on it, so
// that a run can be saved in the middle and carried on, and so that the
// pace report can play one without a screen.

import {
  BAND, BASE_STATS, CHOICES, COMPANIONS, HEROES, ITEMS, OFFERS, QUIRKS, SAME_AGAIN, SELL_SHARE, SLOTS, TIERS, TIER_PRICE, UPGRADES, WEAPONS, WEAPON_SHARE, byId, landAt, levelNeeds,
  ownTier, priceAt, rerollCost, tierWeights, weaponOf, type HeroDef,
} from './data';
import { Rng } from './rng';
import { hasteRate, sumStats, type Stat, type StatLine, type Stats } from './stats';
import type { Banded, Carried, Setup, World } from './world';

export interface Offer {
  kind: 'weapon' | 'item';
  id: string;
  tier: number;
  price: number;
  sold: boolean;
  /** Kept when the wares are changed, and for the next camp. */
  locked: boolean;
}

/** One of a level's choices: a stat raised, or, where `bond` names a companion, a step of the bond with it. */
export interface Choice {
  stat: Stat;
  tier: number;
  by: number;
  bond?: string;
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
  /** What was bought: the hero's own weapon is not among them. */
  weapons: Carried[];
  /** The companions on the run, and the steps of each one's bond. */
  band: Banded[];
  /** How full the fury bar is, carried from wave to wave. */
  fury: number;
  /** The land Hroth last got up in (landAt), or -1. */
  rose: number;
  /** True once Tam has dragged the hero up: it is once in a run. */
  saved: boolean;
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

/** How many companions a hero may bring, with this many places open in the Hold. The shepherd brings one more. */
export function bandSize(hero: string, places: number): number {
  return Math.max(0, Math.min(BAND.places, places)) + (byId(HEROES, hero).quirk === 'shepherd' ? 1 : 0);
}

/** A new run: a hero, and the companions who go with them. The hero's own weapon is all they carry. */
export function newRun(hero: string, seed: number, band: readonly string[] = []): RunData {
  byId(HEROES, hero);
  const known = [...new Set(band)].filter((id) => COMPANIONS.some((c) => c.id === id));
  return {
    hero, dice: seed >>> 0 || 1, wave: 1, gold: 0, xp: 0, level: 0, pending: 0, weapons: [], band: known.map((id) => ({ id, bond: 0 })), fury: 0, rose: -1, saved: false,
    items: [], ups: [], packs: 0, kills: 0, coins: 0, felled: [], phase: 'fight', offers: [], rerolls: 0, choices: [],
  };
}

/** The hero's own weapon as it stands: it grows a tier by itself at set levels. */
export function ownOf(run: RunData): Carried {
  return { id: heroOf(run).weapon, tier: ownTier(run.level) };
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
export function setupOf(run: RunData, tall = false, auto = true): Setup {
  const hero = heroOf(run);
  return {
    seed: roll(run, (r) => Math.floor(r.next() * 0x7fffffff) + 1), wave: run.wave, stats: statsOf(run), quirk: hero.quirk, move: hero.move, own: ownOf(run), weapons: run.weapons,
    band: run.band, level: run.level, fury: run.fury, auto, purse: run.gold, spare: run.rose !== landAt(run.wave), rescue: !run.saved, tall,
  };
}

/** A wave has ended: the run takes what it left, and goes on to a level, to the camp, or to its end. */
export function endWave(run: RunData, world: World): void {
  run.gold += Math.round(world.gold);
  run.coins += Math.round(world.xp);
  run.fury = world.fury;
  if (world.rose) run.rose = landAt(run.wave);
  if (world.rescued) run.saved = true;
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
  // Orrin picks from one more.
  const n = CHOICES + (heroOf(run).quirk === 'echo' ? QUIRKS.echo.choices : 0);
  run.choices = roll(run, (rng) => {
    const pool = [...UPGRADES];
    const out: Choice[] = [];
    while (out.length < n && pool.length > 0) {
      const u = pool.splice(rng.int(pool.length), 1)[0];
      const tier = rollTier(rng, run.level, luck);
      out.push({ stat: u.stat, tier, by: u.by[tier] });
    }
    // Now and then the last of them is a bond with a companion on the run who has a step left.
    const open = run.band.filter((b) => b.bond < BAND.bonds);
    if (open.length > 0 && rng.chance(BAND.bondChance)) {
      const b = rng.pick(open);
      out[out.length - 1] = { stat: 'damage', tier: b.bond, by: 0, bond: b.id };
    }
    return out;
  });
}

/** Takes one of a level's choices. */
export function choose(run: RunData, i: number): boolean {
  const c = run.choices[i];
  if (run.phase !== 'level' || !c) return false;
  const bonded = c.bond ? run.band.find((b) => b.id === c.bond) : undefined;
  if (bonded) bonded.bond = Math.min(BAND.bonds, bonded.bond + 1);
  else run.ups.push({ stat: c.stat, by: c.by });
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

/** Sells a weapon that was bought. The hero's own is not among them, so there is always something in hand. */
export function sell(run: RunData, slot: number): boolean {
  if (run.phase !== 'camp' || !run.weapons[slot]) return false;
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

/** What a weapon would do in this hero's hands, for the card that offers it: its harm, and the seconds between its blows. */
export function weaponNumbers(run: RunData, id: string, tier: number): { harm: number; every: number } {
  const def = weaponOf(id);
  const s = statsOf(run);
  const base = def.dmg[tier] + (def.scale.might ?? 0) * s.might + (def.scale.aim ?? 0) * s.aim + (def.scale.lore ?? 0) * s.lore;
  return { harm: Math.max(1, Math.round(base * Math.max(0.1, 1 + s.damage / 100))), every: def.every[tier] / hasteRate(s.haste) };
}

/** Leaves the camp for the next wave. */
export function march(run: RunData): boolean {
  if (run.phase !== 'camp') return false;
  run.phase = 'fight';
  return true;
}
