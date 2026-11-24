// The rules of dungeons and raids: what is open, who the enemy fields, what
// a run remembers from floor to floor, and what is paid. Pure functions on
// the save and on a run; the screens ask these and show the answer.
//
// A run of a dungeon is not saved: leaving the game in the middle of one
// gives it up, as LEAVE does.

import { DUNGEONS, RAIDS, RAID_BOSS, RESERVES, TIER_MARKS, type DungeonDef, type RaidDef } from '../data/expeditions';
import { LANDS, RANK } from '../data/lands';
import { packIdAt } from '../data/packs';
import { STAGES, WORLDS, type Stage } from '../data/stages';
import { UNITS, isFrontline, isStructure } from '../data/units';
import { seatTeam, standEnemy, type Field } from '../sim/field';
import { hash32 } from '../sim/rng';
import type { BattleInput, Placement } from '../sim/types';
import { addXp, cardOf } from './cards';
import { cardMult } from './rarity';
import { cardPower, cleared, fieldOf, roomFor, teamPlacements, type LevelUp } from './rules';
import type { Card, SaveData } from './state';

export const TIERS = TIER_MARKS.length;

/** How much higher than its land's boss a dungeon's enemies stand, and a raid's. */
const DUNGEON_LEVELS = 1;
const RAID_LEVELS = 2;
/** What clearing a dungeon pays, and winning a raid, in the coins of its land's boss stage on that lap. */
const DUNGEON_COINS = 5;
const RAID_COINS = 8;
const DUNGEON_PACKS = 2;
const RAID_PACKS = 3;

/** The stage of the line a tier is measured by: its land's boss, on the lap of that tier. */
export function tierStage(land: number, tier: number): Stage {
  const t = Math.max(0, Math.min(TIERS - 1, tier));
  return STAGES[WORLDS[t * LANDS.length + land].last];
}

/** The pack a tier pays: its land's pack of the lap after, so that it is always a better pack than the line is dropping there. */
export function tierPack(land: number, tier: number): string {
  return packIdAt(LANDS[land].pack, Math.min(TIERS - 1, tier + 1));
}

/** The field a tier of a dungeon or a raid is fought on: that of the stage it is measured by. */
export function tierField(land: number, tier: number): Field {
  return tierStage(land, tier).field;
}

// ------------------------------------------------------------ what is open

/** How many tiers of a dungeon or a raid are cleared, in order. */
export function tiersCleared(save: SaveData, kind: 'dungeon' | 'raid', id: string): number {
  const book = kind === 'dungeon' ? save.dungeons : save.raids;
  return Math.max(0, Math.min(TIERS, book[id] ?? 0));
}

/** A dungeon or a raid is open once the line has been cleared as far as it names. It stays open. */
export function placeOpen(save: SaveData, def: DungeonDef | RaidDef): boolean {
  return cleared(save) >= def.after;
}

/** A tier is open when the place is and every tier before it is cleared. */
export function tierOpen(save: SaveData, kind: 'dungeon' | 'raid', def: DungeonDef | RaidDef, tier: number): boolean {
  return tier >= 0 && tier < TIERS && placeOpen(save, def) && tier <= tiersCleared(save, kind, def.id);
}

/** The hardest tier of a place that can be entered, or -1 if it is shut. */
export function topTier(save: SaveData, kind: 'dungeon' | 'raid', def: DungeonDef | RaidDef): number {
  if (!placeOpen(save, def)) return -1;
  return Math.min(TIERS - 1, tiersCleared(save, kind, def.id));
}

// ------------------------------------------------------------ dungeons

/** One card of a run's roster: how much of its health is left, and whether it is sent in. */
export interface RosterCard {
  card: number;
  unit: string;
  /** The share of its health it has left: 1 until it has fought, 0 once it has fallen. */
  hp: number;
  /** True while it is on the board for the next floor. */
  fielded: boolean;
  col: number;
  row: number;
}

export interface Run {
  dungeon: string;
  tier: number;
  /** The floor to fight next, from 0. */
  floor: number;
  roster: RosterCard[];
  /** Battles fought in this run, for the seed. */
  fought: number;
  over: boolean;
}

function freeTile(taken: ReadonlyArray<{ col: number; row: number }>, front: boolean): [number, number] {
  const cols = front ? [3, 2, 1, 0] : [0, 1, 2, 3];
  for (const col of cols) for (const row of [1, 2, 0, 3]) if (!taken.some((p) => p.col === col && p.row === row)) return [col, row];
  return [0, 0];
}

/**
 * Starts a run: the team as it stands, and the strongest of the other cards
 * as reserves. Null if the tier is not open or there is no team.
 */
export function startRun(save: SaveData, dungeon: DungeonDef, tier: number): Run | null {
  if (!tierOpen(save, 'dungeon', dungeon, tier) || save.team.length === 0) return null;
  const roster: RosterCard[] = [];
  for (const p of save.team) {
    const card = cardOf(save, p.card);
    if (card) roster.push({ card: card.id, unit: card.unit, hp: 1, fielded: true, col: p.col, row: p.row });
  }
  // The reserves are people: someone to send in when another has fallen. A wall is not that.
  const spare = save.cards
    .filter((c) => !isStructure(c.unit) && !roster.some((r) => r.card === c.id))
    .sort((a, b) => cardPower(b) - cardPower(a) || a.id - b.id)
    .slice(0, RESERVES);
  for (const c of spare) roster.push({ card: c.id, unit: c.unit, hp: 1, fielded: false, col: 0, row: 0 });
  return { dungeon: dungeon.id, tier, floor: 0, roster, fought: 0, over: false };
}

/** The cards of a roster that are on the board. */
export function fielded(run: Run): RosterCard[] {
  return run.roster.filter((r) => r.fielded && r.hp > 0);
}

/**
 * Sends a card of the roster in, or takes it off the board. Returns false
 * if it has fallen, or the board has no place for it: as many units as the
 * team may be, and as many buildings and traps as it has places for structures.
 */
export function toggleFielded(save: SaveData, run: Run, card: number): boolean {
  const entry = run.roster.find((r) => r.card === card);
  if (!entry || entry.hp <= 0 || run.over) return false;
  if (entry.fielded) {
    entry.fielded = false;
    return true;
  }
  const on = fielded(run);
  if (!roomFor(save, entry.unit, on)) return false;
  const [col, row] = freeTile(on, isFrontline(entry.unit));
  entry.col = col;
  entry.row = row;
  entry.fielded = true;
  return true;
}

/** Who a floor of a dungeon fields at a tier. */
export function floorEnemies(dungeon: DungeonDef, tier: number, floor: number): Placement[] {
  const at = tierStage(dungeon.land, tier);
  return fieldOf(dungeon.floors[floor], at.grade, at.level + DUNGEON_LEVELS, 0, at.field);
}

/** The battle of the floor a run is at: whoever is sent in, each with the health it has left. */
export function floorInput(save: SaveData, run: Run, dungeon: DungeonDef): BattleInput {
  const field = tierField(dungeon.land, run.tier);
  const on = fielded(run).filter((r) => cardOf(save, r.card));
  const seats = seatTeam(on, field);
  const team: Placement[] = on.map((r, i) => {
    const card = cardOf(save, r.card) as Card;
    const m = cardMult(card.grade, card.level);
    return { unit: card.unit, col: seats[i][0], row: seats[i][1], hpMult: m, damageMult: m, hpShare: r.hp };
  });
  return {
    seed: hash32(hash32(save.rng) ^ Math.imul(run.fought + 1, 0x9e3779b1) ^ Math.imul(run.floor + 7, 40503) ^ Math.imul(run.tier + 3, 7919)),
    defs: UNITS,
    teams: [team, floorEnemies(dungeon, run.tier, run.floor)],
    field,
  };
}

export interface Prize {
  coins: number;
  /** Packs paid, by id. */
  packs: string[];
  /** True if this tier had not been cleared before. */
  first: boolean;
}

export interface FloorResult {
  won: boolean;
  /** The experience each card that fought takes. */
  xp: number;
  levelUps: LevelUp[];
  /** True if the run is over: a floor lost, or the last floor won. */
  over: boolean;
  /** What clearing the dungeon paid, or null. Only the last floor pays. */
  prize: Prize | null;
}

function teach(save: SaveData, cards: readonly number[], xp: number): LevelUp[] {
  const ups: LevelUp[] = [];
  for (const id of cards) {
    const card: Card | undefined = cardOf(save, id);
    if (!card) continue;
    const from = card.level;
    if (addXp(card, xp) > 0) ups.push({ card: card.id, unit: card.unit, from, to: card.level });
  }
  return ups;
}

function pay(save: SaveData, kind: 'dungeon' | 'raid', id: string, land: number, tier: number, coins: number, packs: number): Prize {
  const book = kind === 'dungeon' ? save.dungeons : save.raids;
  const first = (book[id] ?? 0) <= tier;
  if (first) book[id] = tier + 1;
  save.coins += coins;
  const pack = tierPack(land, tier);
  save.packs[pack] = (save.packs[pack] ?? 0) + packs;
  return { coins, packs: Array.from({ length: packs }, () => pack), first };
}

/**
 * Books a floor: `left` is the share of its health each card that fought
 * has left, in the order they were fielded. Nothing heals: that is what
 * they bring to the next floor, and none is what the fallen bring. A floor
 * that is not won ends the run. Changes the save and the run.
 */
export function afterFloor(save: SaveData, run: Run, dungeon: DungeonDef, won: boolean, left: readonly number[]): FloorResult {
  const fought = fielded(run);
  const at = tierStage(dungeon.land, run.tier);
  const xp = Math.round(at.xp * (won ? 0.8 : 0.3));
  fought.forEach((r, i) => {
    r.hp = Math.max(0, Math.min(1, left[i] ?? 0));
    if (r.hp <= 0) r.fielded = false;
  });
  run.fought++;
  save.stats.battles++;
  const result: FloorResult = { won, xp, levelUps: teach(save, fought.map((r) => r.card), xp), over: false, prize: null };
  if (!won) {
    run.over = true;
    result.over = true;
    return result;
  }
  save.stats.wins++;
  run.floor++;
  if (run.floor >= dungeon.floors.length) {
    run.over = true;
    result.over = true;
    result.prize = pay(save, 'dungeon', dungeon.id, dungeon.land, run.tier, at.coins * DUNGEON_COINS, DUNGEON_PACKS);
  }
  return result;
}

/** True if a run can go on: there is a floor left and someone standing to send in. */
export function canGoOn(run: Run): boolean {
  return !run.over && run.roster.some((r) => r.hp > 0);
}

/** What a tier of a dungeon pays when its last floor is cleared. */
export function dungeonPrize(dungeon: DungeonDef, tier: number): { coins: number; pack: string; packs: number } {
  return { coins: tierStage(dungeon.land, tier).coins * DUNGEON_COINS, pack: tierPack(dungeon.land, tier), packs: DUNGEON_PACKS };
}

// ------------------------------------------------------------ raids

/** Who a raid fields at a tier: the lord, huge, calling up his own, and his guard. */
export function raidEnemies(raid: RaidDef, tier: number): Placement[] {
  const at = tierStage(raid.land, tier);
  const m = cardMult(at.grade, at.level + RAID_LEVELS);
  // The lord and his guard are written on the first field, and stand on the tier's as a stage's enemies do.
  const [bc, br] = standEnemy(at.field, raid.boss.col, raid.boss.row);
  const boss: Placement = {
    unit: raid.boss.unit, col: bc, row: br,
    hpMult: m * RAID_BOSS.hp, damageMult: m * RAID_BOSS.damage, scale: RAID_BOSS.scale,
    summons: { ...raid.calls },
  };
  const guards: Placement[] = raid.guards.map((e) => {
    const [col, row] = standEnemy(at.field, e.col, e.row);
    return { unit: e.unit, col, row, hpMult: m * RANK[e.rank].hp, damageMult: m * RANK[e.rank].damage, scale: RANK[e.rank].scale };
  });
  return [boss, ...guards];
}

/** The battle of a raid: the team as it stands on the line, against the lord, for as long as the raid allows. */
export function raidInput(save: SaveData, raid: RaidDef, tier: number): BattleInput {
  const field = tierField(raid.land, tier);
  return {
    seed: hash32(hash32(save.rng) ^ Math.imul(save.stats.battles + 1, 0x9e3779b1) ^ Math.imul(tier + 11, 40503) ^ raid.id.length),
    defs: UNITS,
    teams: [teamPlacements(save, field), raidEnemies(raid, tier)],
    seconds: raid.seconds,
    field,
  };
}

export interface RaidResult {
  won: boolean;
  xp: number;
  levelUps: LevelUp[];
  prize: Prize | null;
}

/** Books a raid: only a win pays, and every win pays. The team learns either way. Changes the save. */
export function finishRaid(save: SaveData, raid: RaidDef, tier: number, won: boolean): RaidResult {
  const at = tierStage(raid.land, tier);
  const xp = Math.round(at.xp * (won ? 1.5 : 0.4));
  save.stats.battles++;
  // The battle's random numbers move on, so that the next try is another fight.
  save.rng = hash32(save.rng + 0x9e3779b9);
  const result: RaidResult = { won, xp, levelUps: teach(save, save.team.map((p) => p.card), xp), prize: null };
  if (!won) return result;
  save.stats.wins++;
  result.prize = pay(save, 'raid', raid.id, raid.land, tier, at.coins * RAID_COINS, RAID_PACKS);
  return result;
}

/** What a tier of a raid pays for a win. */
export function raidPrize(raid: RaidDef, tier: number): { coins: number; pack: string; packs: number } {
  return { coins: tierStage(raid.land, tier).coins * RAID_COINS, pack: tierPack(raid.land, tier), packs: RAID_PACKS };
}

/** Every unit a place can put on the board, the ones called up among them: the art a battle there needs. */
export function unitsOf(def: DungeonDef | RaidDef): string[] {
  const out = new Set<string>();
  if ('floors' in def) for (const f of def.floors) for (const e of f.enemies) out.add(e.unit);
  else {
    out.add(def.boss.unit);
    out.add(def.calls.unit);
    for (const e of def.guards) out.add(e.unit);
  }
  return [...out];
}

export { DUNGEONS, RAIDS };
