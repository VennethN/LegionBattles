// A run: one hero from the first wave until they fall. Between waves the
// hero levels and trades in the camp; this is the rules of both, and of
// what a wave leaves a run with. It is plain data and functions on it, so
// that a run can be saved in the middle and carried on, and so that the
// pace report can play one without a screen.

import {
  BAND, BASE_STATS, CHOICES, COMPANIONS, HEROES, ITEMS, KIND_AGAIN, OFFERS, QUIRKS, SAME_AGAIN, SELL_SHARE, SLOTS, TIERS, TIER_PRICE, UPGRADES, WEAPONS, WEAPON_SHARE, byId,
  finishedAs, landAt, levelNeeds, ownTier, priceAt, rerollCost, tierWeights, waveOf, weaponOf, type HeroDef, type WeaponDef,
} from './data';
import { VOW, VOWS, noBoons, type Boons, type Thing, thingKey } from './holdData';
import { KINDS, KIND_STEPS, countKinds, giftLine, kindStep, type Kind, type KindCounts } from './kinds';
import { RELIC, RELICS } from './relics';
import { OMENS, ROAD, type Omen, type Road } from './road';
import { Rng } from './rng';
import { hasteRate, sumStats, type Stat, type StatLine, type Stats } from './stats';
import type { Banded, Carried, Setup, World } from './world';

export interface Offer {
  /** A relic among the wares has no tier of its own: it is offered as the rarest are. */
  kind: 'weapon' | 'item' | 'relic';
  id: string;
  tier: number;
  price: number;
  sold: boolean;
  /** Kept when the wares are changed, and for the next camp. */
  locked: boolean;
  /** True for the ware the Merchant's Seal has halved. */
  cut?: boolean;
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
 * relic: a relic was won and one of three is to be chosen.
 * camp: trading before the next wave.
 * road: the camp is left and a road to the next wave is to be chosen.
 * over: the hero has fallen.
 */
export type Phase = 'fight' | 'level' | 'relic' | 'camp' | 'road' | 'over';

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
  /** The relics held, by name (relics.ts). */
  relics: string[];
  /** Relics won and not chosen yet, and the ones on offer while one is being chosen. */
  relicsDue: number;
  relicChoices: string[];
  /** The road taken to the wave that is being fought, or will be next. */
  road: Road;
  /** The roads on offer while one is being chosen. */
  roads: Road[];
  /** How many roads are offered at once, before what a relic adds: the Hold opens a third. */
  forks: number;
  /** Health the Banner of the Fallen has given. */
  vigor: number;
  /** Waves come through with the Whetstone of Ages in hand. */
  whet: number;
  /** The share of the hero's health that was left when the last wave ended: a player picks a road by it, and so does the plain player. */
  left: number;
  /** True for a player's first run: its second wave's road is the stray's, with Biscuit in the cage. */
  first: boolean;
  /** The last weapon bought, by name, or '': Orrin's staff is finished as it. */
  taken: string;
  /** True once Fenn has tossed for a ware in this camp. */
  tossed: boolean;
  /** True from the end of a forced march until its camp has been passed by. */
  forced: boolean;
  /** The share of their health the hero begins the next wave with: 1 but after a forced march. */
  hurt: number;
  /** Choices as for a level that are owed at the best tier: the prize of the road of the wounded. */
  bests: number;
  /** The vows the run was sworn under, by name (holdData.ts). */
  vows: string[];
  /** The weapons the run may be offered, by name, or null for all the armory has not shut. */
  pool: string[] | null;
  /** The day whose road this run is (hold.ts), or '' for a run of the player's own. */
  daily: string;
  /** True if the hero's own weapon follows its second rule: an oath opens it, and the player chooses. */
  alt: boolean;
  /** Seconds fought so far, and waves come through with no blow landed. */
  time: number;
  clean: number;
  /** Wares that may still be struck from the table in this run, and true once the relics on offer have been looked at a second time. */
  banishes: number;
  relooked: boolean;
  /** What the armory had not opened when the run began: the weapons, wares and relics this run is never offered. */
  shut: string[];
  /** What the board had given when the run began, added up (holdData.ts). */
  boons: Boons;
  /** True once the Second Breath has been drawn: it is once in a run. */
  breathed: boolean;
  /** Deeds done in this run, for the tally at its end. */
  deeds: string[];
  /** What the waves have told since the save last took it: who stood on the field, who was slain, which roads were come through, which captains fell with no blow landed. */
  told: Told | null;
  /** True once the run's renown has been paid, and once its win has been counted. */
  paid: boolean;
  won: boolean;
}

/** What the Hold gives a run to begin with: its vows, what is shut to it or the weapons it may be offered, what the board gives, and what the hero's oaths have opened. */
export interface Terms {
  /** True for a player's first run: its second wave's road is the stray's, with Biscuit in the cage. */
  first?: boolean;
  vows?: readonly string[];
  shut?: readonly string[];
  /** The weapons the run may be offered, by name: all that are not shut, if it is not given. */
  pool?: readonly string[] | null;
  boons?: Boons;
  /** A relic the run begins with. */
  relic?: string;
  alt?: boolean;
  daily?: string;
}

export interface Told {
  met: string[];
  slain: Record<string, number>;
  roads: string[];
  unstruck: string[];
}

/** True if the armory had this open when the run began. */
export function offered(run: RunData, kind: Thing['kind'], id: string): boolean {
  return !run.shut.includes(thingKey({ kind, id }));
}

const openWeapons = (run: RunData): typeof WEAPONS => WEAPONS.filter((w) => (run.pool ? run.pool.includes(w.id) : true) && offered(run, 'weapon', w.id));
const openItems = (run: RunData): typeof ITEMS => ITEMS.filter((it) => offered(run, 'item', it.id));
const openRelics = (run: RunData): typeof RELICS => RELICS.filter((r) => offered(run, 'relic', r.id));

/** A price in the camp as the run's vows have it: dearer under Lean Coffers. */
const dear = (run: RunData, price: number): number => (run.vows.includes('lean') ? Math.max(1, Math.round(price * VOW.prices)) : price);

/** How many hands the run has for what is bought. */
export function handsOf(run: RunData): number {
  return SLOTS - (run.vows.includes('hand') ? VOW.hands : 0);
}

/** Who is in the cage on a first run. */
export const FIRST_STRAY = 'biscuit';

export function heroOf(run: RunData): HeroDef {
  return byId(HEROES, run.hero);
}

/** How many companions a hero may bring, with this many places open in the Hold. The shepherd brings one more. */
export function bandSize(hero: string, places: number): number {
  return Math.max(0, Math.min(BAND.places, places)) + (byId(HEROES, hero).quirk === 'shepherd' ? 1 : 0);
}

/** A new run: a hero, and the companions who go with them. The hero's own weapon is all they carry. */
export function newRun(hero: string, seed: number, band: readonly string[] = [], forks: number = ROAD.roads, terms: Terms = {}): RunData {
  byId(HEROES, hero);
  const known = [...new Set(band)].filter((id) => COMPANIONS.some((c) => c.id === id));
  const run: RunData = {
    first: !!terms.first, taken: '', tossed: false, forced: false, hurt: 1, bests: 0,
    hero, dice: seed >>> 0 || 1, wave: 1, gold: 0, xp: 0, level: 0, pending: 0, weapons: [], band: known.map((id) => ({ id, bond: 0 })), fury: 0, rose: -1, saved: false,
    items: [], ups: [], packs: 0, kills: 0, coins: 0, felled: [], phase: 'fight', offers: [], rerolls: 0, choices: [],
    relics: [], relicsDue: 0, relicChoices: [], road: { omen: 'quiet' }, roads: [], forks: Math.max(1, Math.min(ROAD.most, Math.floor(forks))), vigor: 0, whet: 0, left: 1,
    vows: VOWS.filter((v) => (terms.vows ?? []).includes(v.id)).map((v) => v.id), shut: [...(terms.shut ?? [])], pool: terms.pool ? [...terms.pool] : null, boons: terms.boons ? { ...terms.boons, stats: { ...terms.boons.stats } } : noBoons(),
    daily: terms.daily ?? '', alt: !!terms.alt, time: 0, clean: 0, banishes: 0, relooked: false, breathed: false, deeds: [], told: null, paid: false, won: false,
  };
  // What an oath of the hero's has opened: a relic to begin with.
  if (terms.relic && RELICS.some((r) => r.id === terms.relic)) run.relics.push(terms.relic);
  // What the board gives a run to begin with: coins, and marks to strike wares with.
  run.gold = run.boons.gold;
  run.banishes = run.boons.banish;
  return run;
}

/** True if the run holds a relic. */
export function hasRelic(run: RunData, id: string): boolean {
  return run.relics.includes(id);
}

/** The hero's own weapon as it stands: it grows a tier by itself at set levels. */
export function ownOf(run: RunData): Carried {
  return { id: heroOf(run).weapon, tier: ownTier(run.level) };
}

/** What the hero's own weapon is: for Orrin, his staff as the last weapon he bought finished it. */
export function ownDef(run: RunData): WeaponDef {
  const hero = heroOf(run);
  const own = weaponOf(hero.weapon);
  return hero.quirk === 'unfinished' && run.taken ? finishedAs(own, weaponOf(run.taken)) : own;
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
    // What the kinds of weapon held give as plain stats.
    giftLine(kindCounts(run)),
    // The health the Banner of the Fallen has given, and what the board gives for good.
    { maxHp: run.vigor },
    run.boons.stats,
  ];
}

/** How many of each kind of weapon the hero holds, their own among them. */
export function kindCounts(run: RunData): KindCounts {
  return countKinds([ownDef(run), ...run.weapons.map((w) => weaponOf(w.id))]);
}

/** A kind of weapon as the camp shows it: how many are held, the step of its gift that gives, and what the next step asks for and gives. */
export interface KindHeld {
  kind: Kind;
  name: string;
  held: number;
  /** 0 for no gift yet, 3 for all of it. */
  step: number;
  /** What it gives now, or '' for nothing yet. */
  says: string;
  /** How many have to be held for the next step and what that gives, or null when there is no further step. */
  next: { at: number; says: string } | null;
}

/** Every kind the hero holds at least one of, most first. */
export function kindsOf(run: RunData): KindHeld[] {
  const counts = kindCounts(run);
  return KINDS.filter((k) => counts[k.id] > 0)
    .map((k) => {
      const held = counts[k.id];
      const step = kindStep(held);
      return { kind: k.id, name: k.name, held, step, says: step > 0 ? k.says[step - 1] : '', next: step < KIND_STEPS.length ? { at: KIND_STEPS[step], says: k.says[step] } : null };
    })
    .sort((a, b) => b.held - a.held);
}

export function statsOf(run: RunData): Stats {
  const s = sumStats(statLines(run));
  s.maxHp = Math.max(1, Math.round(s.maxHp));
  return s;
}

/** What a wave is fought with. The wave's own dice come off the run's, so no two waves are alike. */
export function setupOf(run: RunData, tall = false, auto = true): Setup {
  const hero = heroOf(run);
  const seed = roll(run, (r) => Math.floor(r.next() * 0x7fffffff) + 1);
  const stats = statsOf(run);
  // The Bone Dice: one stat up and another down, for this wave only.
  let bones: Setup['bones'] = null;
  if (hasRelic(run, 'bonedice')) {
    bones = roll(run, (r) => {
      const up = r.pick(DICE_STATS);
      return { up, down: r.pick(DICE_STATS.filter((st) => st !== up)) };
    });
    stats[bones.up] += RELIC.bonedice.up;
    stats[bones.down] -= RELIC.bonedice.down;
  }
  // The Tithe Box takes its coins if they are there.
  const tithe = hasRelic(run, 'tithe') && run.gold >= RELIC.tithe.coins;
  if (tithe) run.gold -= RELIC.tithe.coins;
  // A forced march is paid for once: by the wave that follows it. Under Open Wounds every wave begins with what the
  // last one left, so the two ask the same thing and the worse of them holds.
  const hurt = Math.min(run.hurt ?? 1, run.vows.includes('wounds') ? Math.max(0.05, run.left) : 1);
  run.hurt = 1;
  return {
    taken: run.taken ?? '', hurt, herald: run.wave === HERALD_WAVE, given: !!run.first && run.wave === 2,
    seed, wave: run.wave, stats, quirk: hero.quirk, move: hero.move, own: ownOf(run), weapons: run.weapons,
    band: run.band, level: run.level, fury: run.fury, auto, purse: run.gold, spare: run.rose !== landAt(run.wave), rescue: !run.saved, tall,
    omen: run.road.omen, stray: run.road.stray, relics: run.relics, whet: run.whet, tithe, bones,
    vows: run.vows, breath: run.boons.breath > 0 && !run.breathed,
    furyBy: 1 + run.boons.fury / 100, bandHp: 1 + run.boons.bandHp / 100, bandDmg: 1 + run.boons.bandDmg / 100, bandUp: run.boons.bandUp / 100,
  };
}

/** The wave on which a lone champion comes, in every run, and leaves a relic if it falls. */
export const HERALD_WAVE = 3;

/** The stats the Bone Dice may roll: the ones counted in hundredths, where 15 up and 10 down mean the same for each. */
const DICE_STATS: readonly Stat[] = ['damage', 'haste', 'crit', 'dodge', 'speed', 'luck', 'bounty'];

/** A wave has ended: the run takes what it left, and goes on to a level, to the camp, or to its end. */
export function endWave(run: RunData, world: World): void {
  run.gold += Math.round(world.gold);
  run.coins += Math.round(world.coins);
  run.fury = world.fury;
  run.left = Math.max(0, world.hero.hp / world.hero.maxHp);
  if (world.rose) run.rose = landAt(run.wave);
  if (world.rescued) run.saved = true;
  if (world.breathed) run.breathed = true;
  // What the wave told, kept until the save takes it (hold.ts).
  const told = (run.told ??= { met: [], slain: {}, roads: [], unstruck: [] });
  for (const id of world.met) if (!told.met.includes(id)) told.met.push(id);
  for (const [id, n] of Object.entries(world.slain)) told.slain[id] = (told.slain[id] ?? 0) + n;
  for (const id of world.unstruck) if (!told.unstruck.includes(id)) told.unstruck.push(id);
  if (world.over === 'cleared' && !told.roads.includes(world.omen)) told.roads.push(world.omen);
  run.time += world.time;
  if (world.over === 'cleared' && !world.struck) run.clean++;
  // The board's tales: more is learned from the same wave.
  run.xp += world.xp * (1 + run.boons.xp / 100);
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
  // What the road promised, and what the wave gave besides.
  const omen = world.omen;
  // A captain leaves a relic. So do the roads that pay one, come through, a duelist who fell, and the lone champion of the third wave.
  run.relicsDue += world.felled.length + (omen === 'champions' || omen === 'night' || omen === 'forced' ? 1 : 0) + (world.dueled ? 1 : 0) + (world.herald ? 1 : 0);
  // The shrine's blessing is a choice as for a level, with no level made. The road of the wounded pays one of the best kind.
  if (world.blessed) run.pending++;
  if (omen === 'wounded') {
    run.pending++;
    run.bests = (run.bests ?? 0) + 1;
  }
  // The blizzard's spoils: the plainest weapon bought gains a tier, or a pack for one who has bought none that can.
  if (omen === 'blizzard' && !whet(run)) run.packs++;
  // A forced march: no camp after it, and the next wave finds the hero as this one left them.
  if (omen === 'forced') {
    run.forced = true;
    run.hurt = Math.max(ROAD.forced.least, run.left);
  }
  // Whoever was let out of the cage stays for the run, beyond the band's places.
  if (world.freed && !run.band.some((b) => b.id === world.freed)) run.band.push({ id: world.freed, bond: 0, stray: true });
  if (hasRelic(run, 'fallen')) run.vigor += RELIC.fallen.health * world.banners;
  if (hasRelic(run, 'ageswhet')) run.whet++;
  run.wave++;
  run.rerolls = 0;
  run.tossed = false;
  run.road = { omen: 'quiet' };
  // What was locked is still on the table; the rest of the wares are new.
  rollOffers(run, false);
  settle(run);
}

/** After a wave, and after each choice: a level's choice first, then a relic's, then the camp. */
function settle(run: RunData): void {
  if (run.pending > 0) {
    run.phase = 'level';
    rollChoices(run);
    return;
  }
  run.choices = [];
  if (run.relicsDue > 0) {
    const left = openRelics(run).filter((r) => !hasRelic(run, r.id));
    if (left.length === 0) {
      // A run that holds every relic there is takes coins instead.
      run.gold += RELIC.instead * run.relicsDue;
      run.relicsDue = 0;
    } else {
      run.relooked = false;
      run.relicChoices = roll(run, (rng) => {
        const pool = left.map((r) => r.id);
        const out: string[] = [];
        while (out.length < RELIC_CHOICES && pool.length > 0) out.push(pool.splice(rng.int(pool.length), 1)[0]);
        return out;
      });
      run.phase = 'relic';
      return;
    }
  }
  run.relicChoices = [];
  if (run.forced) {
    // The camp is passed by: straight on to the roads.
    run.forced = false;
    leave(run);
    return;
  }
  run.phase = 'camp';
}

/** The plainest weapon bought gains a tier. False if none can. */
function whet(run: RunData): boolean {
  let plainest: Carried | null = null;
  for (const w of run.weapons) if (w.tier < TIERS - 1 && (!plainest || w.tier < plainest.tier)) plainest = w;
  if (!plainest) return false;
  plainest.tier++;
  return true;
}

/** How many relics are offered when one is won. */
export const RELIC_CHOICES = 3;

/** Takes one of the relics on offer. */
export function takeRelic(run: RunData, i: number): boolean {
  const id = run.relicChoices[i];
  if (run.phase !== 'relic' || !id) return false;
  run.relics.push(id);
  run.relicsDue = Math.max(0, run.relicsDue - 1);
  settle(run);
  return true;
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
  const n = CHOICES + (heroOf(run).quirk === 'unfinished' ? QUIRKS.unfinished.choices : 0);
  // A blessing of the best kind: every choice at the best tier.
  const best = (run.bests ?? 0) > 0;
  run.choices = roll(run, (rng) => {
    const pool = [...UPGRADES];
    const out: Choice[] = [];
    while (out.length < n && pool.length > 0) {
      const u = pool.splice(rng.int(pool.length), 1)[0];
      const rolled = rollTier(rng, run.level, luck);
      const tier = best ? TIERS - 1 : rolled;
      out.push({ stat: u.stat, tier, by: u.by[tier] });
    }
    // Now and then the last of them is a bond with a companion on the run who has a step left.
    const open = run.band.filter((b) => b.bond < BAND.bonds);
    if (!best && open.length > 0 && rng.chance(BAND.bondChance)) {
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
  if ((run.bests ?? 0) > 0) run.bests--;
  settle(run);
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
      // Now and then one of a kind the hero holds already: a kind is built up over a run, and the camp helps.
      const counts = kindCounts(run);
      const open = openWeapons(run);
      const kin = open.filter((w) => w.kinds.some((k) => counts[k] > 0));
      id = (kin.length > 0 && rng.chance(KIND_AGAIN) ? rng.pick(kin) : rng.pick(open)).id;
      tier = rollTier(rng, run.wave, luck);
    }
    const def = byId(WEAPONS, id);
    return { kind: 'weapon', id, tier, price: dear(run, priceAt(def.price * TIER_PRICE[tier], run.wave)), sold: false, locked: false };
  }
  const wares = openItems(run);
  let tier = rollTier(rng, run.wave, luck);
  let pool = wares.filter((it) => it.tier === tier && held(run, it.id) < (it.most ?? 99));
  while (pool.length === 0 && tier > 0) {
    tier--;
    pool = wares.filter((it) => it.tier === tier);
  }
  const item = rng.pick(pool);
  return { kind: 'item', id: item.id, tier: item.tier, price: dear(run, priceAt(item.price, run.wave)), sold: false, locked: false };
}

/** New wares. What is locked stays, unless it was sold. `all` changes even those. */
function rollOffers(run: RunData, all: boolean): void {
  roll(run, (rng) => {
    const next: Offer[] = [];
    for (let i = 0; i < OFFERS; i++) {
      const old = run.offers[i];
      next.push(old && old.locked && !old.sold && !all ? old : rollOffer(run, rng, i));
    }
    // Rarely the last of the wares is a relic, at a high price: never two at once, and never one the run holds.
    const last = next[OFFERS - 1];
    const left = openRelics(run).filter((r) => !hasRelic(run, r.id));
    if (run.wave >= RELIC.wareFrom && left.length > 0 && !(last.locked && !last.sold) && !next.some((o) => o.kind === 'relic') && rng.chance(RELIC.ware)) {
      next[OFFERS - 1] = { kind: 'relic', id: rng.pick(left).id, tier: TIERS - 1, price: dear(run, priceAt(RELIC.price, run.wave)), sold: false, locked: false };
    }
    // The Merchant's Seal: the dearest ware on the table is half its price. One at a time: a halved ware kept from before is the one.
    if (hasRelic(run, 'seal') && !next.some((o) => o.cut && !o.sold)) {
      let dearest: Offer | null = null;
      for (const o of next) if (!o.sold && (!dearest || o.price > dearest.price)) dearest = o;
      if (dearest) {
        dearest.price = Math.max(1, Math.round(dearest.price * RELIC.seal.share));
        dearest.cut = true;
      }
    }
    run.offers = next;
  });
}

/**
 * The Black Mark: strikes a ware from the table. It is not offered again
 * in this run, and another takes its place. A relic can be struck too.
 */
export function banish(run: RunData, i: number): boolean {
  const o = run.offers[i];
  if (run.phase !== 'camp' || !o || o.sold || run.banishes <= 0) return false;
  run.banishes--;
  const key = thingKey(o);
  if (!run.shut.includes(key)) run.shut.push(key);
  roll(run, (rng) => {
    run.offers[i] = rollOffer(run, rng, i);
  });
  return true;
}

/** A Second Look: once at each choice of a relic, three others are shown instead, where there are others. */
export function relook(run: RunData): boolean {
  if (run.phase !== 'relic' || run.relooked || run.boons.relook <= 0) return false;
  const others = openRelics(run).filter((r) => !hasRelic(run, r.id) && !run.relicChoices.includes(r.id)).map((r) => r.id);
  if (others.length === 0) return false;
  run.relooked = true;
  run.relicChoices = roll(run, (rng) => {
    const out: string[] = [];
    while (out.length < run.relicChoices.length && others.length > 0) out.push(others.splice(rng.int(others.length), 1)[0]);
    return out;
  });
  return true;
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
  if (o.kind === 'weapon' && run.weapons.length >= handsOf(run) && twinOf(run, o.id, o.tier) < 0) return 'hands';
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
  else if (o.kind === 'relic') run.relics.push(o.id);
  else {
    if (run.weapons.length < handsOf(run)) run.weapons.push({ id: o.id, tier: o.tier });
    else run.weapons[twinOf(run, o.id, o.tier)].tier++;
    // The last weapon bought: Orrin's staff is finished as it.
    run.taken = o.id;
  }
  return true;
}

/** True if Fenn may toss for a ware now: once in a camp, and for one he could pay for. */
export function canToss(run: RunData, i: number): boolean {
  return run.phase === 'camp' && heroOf(run).quirk === 'double' && !run.tossed && whyNot(run, i) === '';
}

/** The chance Fenn's toss comes up heads: even, and a little better for every point of Luck. */
export function tossOdds(run: RunData): number {
  const q = QUIRKS.double;
  return Math.min(q.best, q.heads + Math.max(0, statsOf(run).luck) * q.luck);
}

/**
 * Fenn tosses for a ware: heads it is his for nothing, tails he pays for it
 * and it is gone. Once in a camp. Gives back how it fell, or null if there
 * was no toss.
 */
export function toss(run: RunData, i: number): 'heads' | 'tails' | null {
  if (!canToss(run, i)) return null;
  const o = run.offers[i];
  const heads = roll(run, (rng) => rng.chance(tossOdds(run)));
  run.tossed = true;
  if (heads) {
    const price = o.price;
    o.price = 0;
    buy(run, i);
    o.price = price;
    return 'heads';
  }
  run.gold -= o.price;
  o.sold = true;
  o.locked = false;
  return 'tails';
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
  // The board's quartermaster gives a free look or two in each camp. (The Merchant's Seal used to: it halves the dearest ware now.)
  if (run.rerolls < run.boons.reroll) return 0;
  // A free look still counts as a look: the next one costs what a second would.
  return dear(run, rerollCost(run.wave, run.rerolls));
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
    const wares = openItems(run);
    let pool = wares.filter((it) => it.tier === tier);
    while (pool.length === 0 && tier > 0) pool = wares.filter((it) => it.tier === --tier);
    return rng.pick(pool).id;
  });
  run.items.push(id);
  return id;
}

/** What a weapon would do in this hero's hands, for the card that offers it: its harm, and the seconds between its blows. */
export function weaponNumbers(run: RunData, id: string, tier: number): { harm: number; every: number } {
  const def = id === heroOf(run).weapon ? ownDef(run) : weaponOf(id);
  const s = statsOf(run);
  const base = def.dmg[tier] + (def.scale.might ?? 0) * s.might + (def.scale.aim ?? 0) * s.aim + (def.scale.lore ?? 0) * s.lore;
  return { harm: Math.max(1, Math.round(base * Math.max(0.1, 1 + s.damage / 100))), every: def.every[tier] / hasteRate(s.haste) };
}

// ---------------------------------------------------------------- the road

/** How many roads the run is offered at once: what it began with, and one more for the Old Map. */
export function forksOf(run: RunData): number {
  return Math.min(ROAD.most, run.forks + (hasRelic(run, 'oldmap') ? 1 : 0));
}

/** The companion who is in the cage, if a cage is offered now: one who is not on the run, by the run's dice. */
function strayFor(run: RunData, rng: Rng): string | undefined {
  if (run.band.filter((b) => b.stray).length >= ROAD.stray.most) return undefined;
  const free = COMPANIONS.filter((c) => !run.band.some((b) => b.id === c.id));
  return free.length > 0 ? rng.pick(free).id : undefined;
}

/** True if an omen may be offered to the run now. */
function roadOpen(run: RunData, id: Omen, stray: string | undefined): boolean {
  const o = OMENS.find((x) => x.id === id);
  if (!o || o.weight <= 0 || run.wave < o.from) return false;
  // An omen that is one land's own comes only there.
  if (o.land && o.land !== waveOf(run.wave).land) return false;
  if (id === 'stray') return stray !== undefined;
  // A forced march leaves no camp after it: never before a captain, who is hard enough rested.
  if (id === 'forced') return !waveOf(run.wave + 1).boss;
  // The keepers want a purse worth taking from.
  if (id === 'toll') return run.gold >= ROAD.toll.least;
  return true;
}

/** The roads to the run's next wave: no two alike, each with what it needs to be told. */
function rollRoads(run: RunData, n: number): Road[] {
  return roll(run, (rng) => {
    const stray = strayFor(run, rng);
    const pool = OMENS.filter((o) => roadOpen(run, o.id, stray));
    const out: Road[] = [];
    while (out.length < n && pool.length > 0) {
      const o = rng.weighted(pool, (x) => x.weight);
      pool.splice(pool.indexOf(o), 1);
      out.push(o.id === 'stray' ? { omen: o.id, stray } : { omen: o.id });
    }
    return out;
  });
}

/** The roads are laid out, or, where there is one road, the run is on it at once. */
function leave(run: RunData): void {
  // A first run's second wave: the stray's road and no other, with Biscuit in the cage, so that a companion is met in the first minutes.
  if (run.first && run.wave === 2 && !run.band.some((b) => b.id === FIRST_STRAY)) {
    run.roads = [{ omen: 'stray', stray: FIRST_STRAY }];
    run.phase = 'road';
    return;
  }
  const n = waveOf(run.wave).boss ? 1 : forksOf(run);
  const roads = n <= 1 ? [] : rollRoads(run, n);
  if (roads.length === 0) {
    run.road = { omen: 'quiet' };
    run.roads = [];
    run.phase = 'fight';
    return;
  }
  run.roads = roads;
  run.phase = 'road';
}

/**
 * Leaves the camp. Where there is more than one road to the next wave, they
 * are laid out to choose from; a captain's wave has one road, and the run
 * is on it at once.
 */
export function march(run: RunData): boolean {
  if (run.phase !== 'camp') return false;
  // The Paymaster's Ledger: what was not spent earns.
  if (hasRelic(run, 'ledger')) run.gold += Math.min(RELIC.ledger.most, Math.floor(run.gold * RELIC.ledger.share));
  leave(run);
  return true;
}

/** What the keepers of the toll road would take now. */
export function tollOf(run: RunData): number {
  return Math.floor(run.gold * ROAD.toll.share);
}

/** Takes one of the roads on offer, and the run is on its way to the wave. The toll road is paid for here. */
export function takeRoad(run: RunData, i: number): boolean {
  const road = run.roads[i];
  if (run.phase !== 'road' || !road) return false;
  if (road.omen === 'toll') run.gold -= tollOf(run);
  run.road = road;
  run.roads = [];
  run.phase = 'fight';
  return true;
}

/** The omen of the road the run is on. */
export function omenNow(run: RunData): Omen {
  return run.road.omen;
}
