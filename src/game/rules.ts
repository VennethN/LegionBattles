// The rules of the game around the battles: what a new player starts with,
// what a pack turns over, what a win pays, what opens when. Pure functions on
// the save: no Phaser, no browser. The screens ask these and show the answer.

import { DIFFICULTIES, difficulty, raised } from '../data/difficulties';
import { PACKS, allPacks, packById, packIdAt, type PackDef } from '../data/packs';
import { UNITS, isFrontline, type UnitInfo } from '../data/units';
import { RANK, WORLDS, stageCoins, worldById, type WorldDef } from '../data/worlds';
import { COLS, HALF_COLS, ROWS } from '../sim/constants';
import { Rng, hash32 } from '../sim/rng';
import { defaultFormation } from '../sim/setup';
import type { BattleInput, Placement } from '../sim/types';
import { addCard, addXp, cardOf, cardsOf, holds } from './cards';
import { GRADES, GRADE_FALLOFF, RARITIES, RARITY, cardMult, type Rarity } from './rarity';
import { newSave, type Card, type Fielded, type SaveData } from './state';

export { addXp } from './cards';

/** How many units a new player may field. It grows as bosses fall. */
export const BASE_TEAM = 4;
export const MAX_TEAM = 8;

/** The chance that a won stage drops a pack of its world. */
export const DROP_CHANCE = 0.34;

// ------------------------------------------------------------ starting

export function startingSave(seed: number): SaveData {
  const save = newSave(seed);
  save.coins = 40;
  for (const id of ['militia', 'knight', 'archer']) addCard(save, id, 0);
  save.team = formation(save.cards);
  // Two packs to open before the first fight: the fourth place in the team is theirs to fill.
  save.packs.recruit = 2;
  return save;
}

// ------------------------------------------------------------ progress

/** How many of a world's stages are cleared, in order, at a difficulty (Easy if none is named). */
export function clearedIn(save: SaveData, world: string, d = 0): number {
  return Math.min(save.cleared[world]?.[d] ?? 0, worldById(world).stages.length);
}

export function worldDone(save: SaveData, world: string, d = 0): boolean {
  return clearedIn(save, world, d) >= worldById(world).stages.length;
}

/**
 * A world's difficulty is open when its boss has fallen at the one before,
 * and it stays open. Easy is open when the world is. What opens the next
 * world, a bigger team and a unit's place in packs is always Easy.
 */
export function difficultyOpen(save: SaveData, worldIndex: number, d: number): boolean {
  if (d < 0 || d >= DIFFICULTIES.length || !worldOpen(save, worldIndex)) return false;
  return d === 0 || worldDone(save, WORLDS[worldIndex].id, d - 1);
}

/** The hardest difficulty of a world that is open, or -1 if the world is shut. */
export function topDifficulty(save: SaveData, worldIndex: number): number {
  let top = -1;
  for (let d = 0; d < DIFFICULTIES.length; d++) if (difficultyOpen(save, worldIndex, d)) top = d;
  return top;
}

/** A world is open when the one before it has been finished. The first always is. */
export function worldOpen(save: SaveData, index: number): boolean {
  return index === 0 || (index < WORLDS.length && worldDone(save, WORLDS[index - 1].id));
}

/** A stage is open when every stage before it is cleared at that difficulty, and the difficulty is open. */
export function stageOpen(save: SaveData, worldIndex: number, stage: number, d = 0): boolean {
  return difficultyOpen(save, worldIndex, d) && stage <= clearedIn(save, WORLDS[worldIndex].id, d);
}

/** The furthest stage the player may fight: [world index, stage index]. The last stage of all, once everything is cleared. */
export function frontier(save: SaveData): [number, number] {
  for (let w = 0; w < WORLDS.length; w++) {
    const done = clearedIn(save, WORLDS[w].id);
    if (done < WORLDS[w].stages.length) return [w, done];
  }
  const last = WORLDS.length - 1;
  return [last, WORLDS[last].stages.length - 1];
}

export function teamSize(save: SaveData): number {
  let n = BASE_TEAM;
  if (clearedIn(save, WORLDS[0].id) >= 5) n++;
  for (const w of WORLDS) if (worldDone(save, w.id)) n++;
  return Math.min(MAX_TEAM, n);
}

/** Whether a unit has been met and beaten often enough for packs to turn it over. */
export function inPool(save: SaveData, unit: UnitInfo): boolean {
  if (unit.from === undefined) return true;
  const world = WORLDS.find((w) => w.set === unit.set);
  return !!world && clearedIn(save, world.id) >= unit.from;
}

/**
 * Whether the player knows a unit: holds its card, or has beaten it. What is
 * not known is shown dark, with "???", and nothing else about it is told.
 */
export function known(save: SaveData, unit: UnitInfo): boolean {
  return holds(save, unit.id) || (unit.from !== undefined && inPool(save, unit));
}

// ------------------------------------------------------------ the team

/** Whether a card is in the team. Two cards of a unit are two cards: one may fight while the other waits. */
export function inTeam(save: SaveData, card: number): boolean {
  return save.team.some((p) => p.card === card);
}

/** Cards laid out as a team that has not been arranged: fighters forward, the rest behind. */
function formation(cards: readonly Card[]): Fielded[] {
  const tiles = defaultFormation(cards.map((c) => c.unit), isFrontline);
  return tiles.map((t, i) => ({ ...t, card: cards[i].id }));
}

function freeTile(team: readonly Placement[], front: boolean): [number, number] {
  const cols = front ? [3, 2, 1, 0] : [0, 1, 2, 3];
  const rows = [1, 2, 0, 3];
  for (const col of cols) {
    for (const row of rows) {
      if (!team.some((p) => p.col === col && p.row === row)) return [col, row];
    }
  }
  throw new Error('team: no free tile');
}

/** Puts a card in the team or takes it out. Returns false if the team is full. */
export function toggleTeam(save: SaveData, card: number): boolean {
  const at = save.team.findIndex((p) => p.card === card);
  if (at >= 0) {
    save.team.splice(at, 1);
    return true;
  }
  const held = cardOf(save, card);
  if (!held || save.team.length >= teamSize(save)) return false;
  const [col, row] = freeTile(save.team, isFrontline(held.unit));
  save.team.push({ card, unit: held.unit, col, row });
  return true;
}

/** The team as it must be to fight: only cards the player holds, each once, no more than may be fielded, each on its own tile of the player's half. */
export function tidyTeam(save: SaveData): void {
  const seen = new Set<number>();
  const tiles = new Set<string>();
  const out: Fielded[] = [];
  for (const p of save.team) {
    const held = cardOf(save, p.card);
    if (!held || seen.has(held.id) || out.length >= teamSize(save)) continue;
    seen.add(held.id);
    let { col, row } = p;
    if (col < 0 || col >= HALF_COLS || row < 0 || row >= ROWS || tiles.has(`${col},${row}`)) {
      [col, row] = freeTile(out, isFrontline(held.unit));
    }
    tiles.add(`${col},${row}`);
    out.push({ card: held.id, unit: held.unit, col, row });
  }
  save.team = out;
}

/** The strongest cards the player holds, copies of a unit among them, laid out fighters forward. What FILL TEAM does. */
export function bestTeam(save: SaveData): Fielded[] {
  const cards = [...save.cards].sort((a, b) => cardPower(b) - cardPower(a) || a.unit.localeCompare(b.unit) || a.id - b.id);
  return formation(cards.slice(0, teamSize(save)));
}

/** One number for how strong a card is, to order cards by. */
export function cardPower(card: Card | undefined): number {
  const def = card ? UNITS[card.unit] : undefined;
  if (!card || !def) return 0;
  const m = cardMult(card.grade, card.level);
  const dps = (def.heal ? def.heal.amount * 0.8 + def.damage * 0.3 : def.damage) / def.attackInterval;
  return Math.round(Math.sqrt(def.hp * m * (1 + def.armor / 40) * dps * m * (def.splash ? 1.3 : 1)));
}

// ------------------------------------------------------------ battles

function mults(card: Card): { hpMult: number; damageMult: number } {
  const m = cardMult(card.grade, card.level);
  return { hpMult: m, damageMult: m };
}

/** The player's team as the simulation takes it, with each card's grade and level counted. */
export function teamPlacements(save: SaveData): Placement[] {
  const out: Placement[] = [];
  for (const p of save.team) {
    const card = cardOf(save, p.card);
    if (card) out.push({ unit: card.unit, col: p.col, row: p.row, ...mults(card) });
  }
  return out;
}

/**
 * The grade and level a stage's enemies stand at, at a difficulty. Grades
 * climb evenly from the stage's own to the best there is on Nightmare; levels
 * climb evenly by what takes the world's last stage to its `nightmare` level.
 */
export function stageStanding(world: WorldDef, stage: number, d = 0): { grade: number; level: number } {
  const def = world.stages[stage];
  const last = world.stages[world.stages.length - 1];
  return {
    grade: raised(def.grade, GRADES.length - 1, d),
    // At least a level more at each difficulty, so that none is the one before it under another name.
    level: def.level + Math.max(d, raised(0, Math.max(0, world.nightmare - last.level), d)),
  };
}

/**
 * Who a stage fields at a difficulty: who it is written with, at the
 * difficulty's grade and level, and from Hard on a few more of its commonest
 * troop, on free tiles: a fighter in front, a shooter behind.
 */
export function stageEnemies(world: WorldDef, stage: number, d = 0): Placement[] {
  const def = world.stages[stage];
  const at = stageStanding(world, stage, d);
  const m = cardMult(at.grade, at.level);
  const out: Placement[] = def.enemies.map((e) => {
    const rank = RANK[e.rank];
    return { unit: e.unit, col: e.col, row: e.row, hpMult: m * rank.hp, damageMult: m * rank.damage, scale: rank.scale };
  });
  const extra = difficulty(d).extra;
  if (extra > 0) {
    const counts = new Map<string, number>();
    for (const e of def.enemies) if (e.rank === 'troop') counts.set(e.unit, (counts.get(e.unit) ?? 0) + 1);
    const kinds = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (kinds.length > 0) {
      const unit = kinds[0][0];
      const cols = isFrontline(unit) ? [4, 5, 6, 7] : [7, 6, 5, 4];
      let left = extra;
      for (const col of cols) {
        for (const row of [1, 2, 0, 3]) {
          if (left > 0 && !out.some((p) => p.col === col && p.row === row)) {
            out.push({ unit, col, row, hpMult: m, damageMult: m, scale: 1 });
            left--;
          }
        }
      }
    }
  }
  return out;
}

/** A different fight each time a stage is tried, and the same one if the page is reloaded before it is fought. */
export function stageSeed(save: SaveData, world: string, stage: number, d = 0): number {
  return hash32(hash32(save.rng) ^ Math.imul(save.stats.battles + 1, 0x9e3779b1) ^ Math.imul(stage + 1 + d * 97, 40503) ^ world.length);
}

export function stageInput(save: SaveData, world: WorldDef, stage: number, d = 0): BattleInput {
  return {
    seed: stageSeed(save, world.id, stage, d),
    defs: UNITS,
    teams: [teamPlacements(save), stageEnemies(world, stage, d)],
  };
}

export interface LevelUp {
  card: number;
  unit: string;
  from: number;
  to: number;
}

export function stageXp(world: WorldDef, stage: number, won: boolean, d = 0): number {
  const at = stageStanding(world, stage, d);
  const base = 12 + 5 * at.level + 8 * at.grade;
  return Math.round(won ? base : base * 0.4);
}

/** Coins for a win at a stage: in full the first time at that difficulty, half after. */
export function stagePay(world: WorldDef, stage: number, first: boolean, d = 0): number {
  const full = Math.round((stageCoins(world, stage) * difficulty(d).coins) / 5) * 5;
  return first ? full : Math.round(full / 2);
}

export interface StageResult {
  won: boolean;
  first: boolean;
  coins: number;
  xp: number;
  levelUps: LevelUp[];
  /** Packs dropped, by id. */
  packs: string[];
  /** Units that packs can turn over from now on. */
  unlocked: string[];
  /** The team may be this much bigger from now on, or 0. */
  moreTeam: number;
  /** A world that has just opened, or null. */
  opened: string | null;
  /** A difficulty of this world that has just opened, as its place in DIFFICULTIES, or -1. */
  harder: number;
}

function nextRandom(save: SaveData): Rng {
  const rng = new Rng(save.rng);
  save.rng = hash32(save.rng + 0x9e3779b9);
  return rng;
}

/** Books a battle of a stage at a difficulty: pays it, levels the team, opens what it opens. Changes the save. */
export function finishStage(save: SaveData, worldIndex: number, stage: number, won: boolean, d = 0): StageResult {
  const world = WORLDS[worldIndex];
  const def = world.stages[stage];
  const rng = nextRandom(save);
  const sizeBefore = teamSize(save);
  const first = won && stage === clearedIn(save, world.id, d);
  const poolBefore = new Set(Object.values(UNITS).filter((u) => inPool(save, u)).map((u) => u.id));

  save.stats.battles++;
  const result: StageResult = {
    won, first, coins: 0, xp: stageXp(world, stage, won, d), levelUps: [], packs: [], unlocked: [], moreTeam: 0, opened: null, harder: -1,
  };

  for (const p of save.team) {
    const card = cardOf(save, p.card);
    if (!card) continue;
    const from = card.level;
    if (addXp(card, result.xp) > 0) result.levelUps.push({ card: card.id, unit: card.unit, from, to: card.level });
  }
  if (!won) return result;

  save.stats.wins++;
  result.coins = stagePay(world, stage, first, d);
  save.coins += result.coins;

  // What a stage drops is its world's pack at the difficulty it was fought at.
  const pack = packIdAt(world.pack, d);
  if (first) {
    const list = save.cleared[world.id] ?? [];
    while (list.length <= d) list.push(0);
    list[d] = stage + 1;
    save.cleared[world.id] = list;
    // A first clear of a boss or a miniboss always drops, and the very first stage does, to show what a pack is.
    if (def.kind !== 'normal' || (worldIndex === 0 && stage === 0 && d === 0)) result.packs.push(pack);
    if (def.kind === 'boss') result.packs.push(pack);
  }
  if (rng.chance(DROP_CHANCE)) result.packs.push(pack);
  for (const id of result.packs) save.packs[id] = (save.packs[id] ?? 0) + 1;

  for (const u of Object.values(UNITS)) if (inPool(save, u) && !poolBefore.has(u.id)) result.unlocked.push(u.id);
  result.moreTeam = teamSize(save) - sizeBefore;
  if (first && def.kind === 'boss') {
    if (d === 0 && worldIndex + 1 < WORLDS.length) result.opened = WORLDS[worldIndex + 1].id;
    if (d + 1 < DIFFICULTIES.length) result.harder = d + 1;
  }
  return result;
}

// ------------------------------------------------------------ packs

/** Whether the shop sells a pack yet. */
export function packOpen(save: SaveData, pack: PackDef): boolean {
  if (pack.world) {
    const i = WORLDS.findIndex((w) => w.id === pack.world);
    // A world's pack is sold once something in it has been beaten: before that it would be empty.
    // Its harder packs are sold once that difficulty is open.
    return i >= 0 && difficultyOpen(save, i, pack.difficulty ?? 0) && clearedIn(save, pack.world) > 0;
  }
  if (pack.after) return worldDone(save, pack.after);
  return true;
}

export function packPool(save: SaveData, pack: PackDef): UnitInfo[] {
  return Object.values(UNITS).filter((u) => u.set === pack.set && inPool(save, u));
}

export interface Pull {
  pack: string;
  unit: string;
  /** The card it became. */
  card: number;
  rarity: Rarity;
  grade: number;
  /** new: a unit not held before. copy: another card of a unit held, to field beside the others or to combine into one of them. */
  outcome: 'new' | 'copy';
  /** How many cards of the unit are held now, this one among them. */
  held: number;
  /** True for a copy at a better grade than any card of the unit held before. */
  best: boolean;
  /** True if there was room in the team and the card walked into it. */
  joined: boolean;
}

/** What a pack turns over, without changing anything: a tier by weight, a unit of that tier, a grade in the pack's range. */
export function rollPack(save: SaveData, pack: PackDef, rng: Rng): { unit: UnitInfo; grade: number } {
  const pool = packPool(save, pack);
  if (pool.length === 0) throw new Error(`pack "${pack.id}" has nothing in it yet`);
  // Only the tiers the pool has anything of take part, so a small pool does not waste rolls.
  const tiers = RARITIES.filter((r) => pool.some((u) => u.rarity === r));
  let total = 0;
  for (const t of tiers) total += RARITY[t].weight;
  let roll = rng.next() * total;
  let tier = tiers[tiers.length - 1];
  for (const t of tiers) {
    roll -= RARITY[t].weight;
    if (roll < 0) {
      tier = t;
      break;
    }
  }
  const of = pool.filter((u) => u.rarity === tier);
  const unit = of[rng.int(of.length)];

  // Grades grow rarer by a fixed share from the pack's worst to its best.
  let gTotal = 0;
  for (let g = pack.gradeMin; g <= pack.gradeMax; g++) gTotal += Math.pow(GRADE_FALLOFF, g - pack.gradeMin);
  let gRoll = rng.next() * gTotal;
  let grade = pack.gradeMax;
  for (let g = pack.gradeMin; g <= pack.gradeMax; g++) {
    gRoll -= Math.pow(GRADE_FALLOFF, g - pack.gradeMin);
    if (gRoll < 0) {
      grade = g;
      break;
    }
  }
  return { unit, grade };
}

/** Opens one pack the player holds. Changes the save. Null if they hold none. */
export function openPack(save: SaveData, packId: string): Pull | null {
  if ((save.packs[packId] ?? 0) <= 0) return null;
  const pack = packById(packId);
  if (packPool(save, pack).length === 0) return null;
  save.packs[packId]--;
  save.stats.opened++;
  const { unit, grade } = rollPack(save, pack, nextRandom(save));
  const before = cardsOf(save, unit.id);
  const card = addCard(save, unit.id, grade);
  // A card walks straight into the team if there is room for it, a copy too.
  const joined = save.team.length < teamSize(save) && toggleTeam(save, card.id);
  return {
    pack: packId,
    unit: unit.id,
    card: card.id,
    rarity: unit.rarity,
    grade,
    outcome: before.length === 0 ? 'new' : 'copy',
    held: before.length + 1,
    best: before.length > 0 && grade > before[0].grade,
    joined,
  };
}

/** Buys a pack with coins. Returns false if it is not sold yet or costs too much. */
export function buyPack(save: SaveData, packId: string): boolean {
  const pack = packById(packId);
  if (!packOpen(save, pack) || save.coins < pack.cost) return false;
  save.coins -= pack.cost;
  save.packs[packId] = (save.packs[packId] ?? 0) + 1;
  return true;
}

export function packsHeld(save: SaveData): number {
  let n = 0;
  for (const p of allPacks()) n += save.packs[p.id] ?? 0;
  return n;
}

/** The packs the shop has a place for: one to a world and the two that are no world's. */
export const SHELF: readonly PackDef[] = PACKS;

/** Tiles a stage's enemies may stand on: the right half. For the tests. */
export function isEnemyTile(col: number, row: number): boolean {
  return col >= HALF_COLS && col < COLS && row >= 0 && row < ROWS;
}
