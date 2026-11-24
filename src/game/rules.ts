// The rules of the game around the battles: what a new player starts with,
// what a pack turns over, what a win pays, what opens when. Pure functions on
// the save: no Phaser, no browser. The screens ask these and show the answer.

import { LANDS, RANK, type StageDef } from '../data/lands';
import { PACKS, allPacks, packById, type PackDef } from '../data/packs';
import { STAGES, WORLDS, landStart, stageAt, worldOf, type Stage } from '../data/stages';
import { UNITS, isFrontline, type UnitInfo } from '../data/units';
import { COLS, HALF_COLS, ROWS } from '../sim/constants';
import { Rng, hash32 } from '../sim/rng';
import { defaultFormation } from '../sim/setup';
import type { BattleInput, Placement } from '../sim/types';
import { addCard, addXp, cardOf, cardsOf, met } from './cards';
import { GRADE_FALLOFF, RARITIES, RARITY, cardMult, type Rarity } from './rarity';
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

/** How many stages of the line are cleared, in order. */
export function cleared(save: SaveData): number {
  return Math.max(0, Math.min(save.cleared, STAGES.length));
}

/** A stage is open when every stage before it is cleared. */
export function stageOpen(save: SaveData, index: number): boolean {
  return index >= 0 && index < STAGES.length && index <= cleared(save);
}

/** The furthest stage the player may fight. The last stage of all, once everything is cleared. */
export function frontier(save: SaveData): number {
  return Math.min(cleared(save), STAGES.length - 1);
}

/** True once every stage of the line is cleared. */
export function lineDone(save: SaveData): boolean {
  return cleared(save) >= STAGES.length;
}

/** A world is reached when its first stage is open. */
export function worldReached(save: SaveData, world: number): boolean {
  return world >= 0 && world < WORLDS.length && stageOpen(save, WORLDS[world].first);
}

/** How many stages must be cleared for each place in the team past the first four. */
export const TEAM_AT: readonly number[] = [5, 10, 22, 37];

export function teamSize(save: SaveData): number {
  let n = BASE_TEAM;
  for (const at of TEAM_AT) if (cleared(save) >= at) n++;
  return Math.min(MAX_TEAM, n);
}

/**
 * Whether a unit has been met in battle and beaten: an enemy from the stage
 * of its land it first stands at, once that stage is cleared. A unit that is
 * no enemy counts as met. This is for what is known, not for packs: a pack
 * holds every unit of its set from the start (packPool).
 */
export function beaten(save: SaveData, unit: UnitInfo): boolean {
  if (unit.from === undefined) return true;
  const start = landStart(unit.set);
  return start >= 0 && cleared(save) >= start + unit.from;
}

/**
 * Whether the player knows a unit: has held a card of it, or has beaten it.
 * What is not known is shown dark, with "???", and nothing else about it is
 * told. A unit stays known when its last card is combined into another.
 */
export function known(save: SaveData, unit: UnitInfo): boolean {
  return met(save, unit.id) || (unit.from !== undefined && beaten(save, unit));
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

/**
 * What each further card of a role is worth to a team, against the first.
 * A wall of tanks wins nothing before the clock runs out, and a second
 * healer mends little the first does not: a team wants some of each.
 */
const ROLE_WORTH: Readonly<Record<string, readonly number[]>> = {
  tank: [1, 0.85, 0.5, 0.3, 0.2],
  fighter: [1, 0.95, 0.85, 0.65, 0.45],
  ranger: [1, 0.95, 0.85, 0.65, 0.45],
  mage: [1, 0.9, 0.7, 0.5, 0.35],
  support: [1, 0.45, 0.2, 0.1],
};

/**
 * The strongest team the player's cards make, laid out fighters forward.
 * What FILL TEAM does. It takes the strongest card, and then, one at a time,
 * whichever card adds most: a card's power, less the more of its role the
 * team already has. Copies of a unit can be among them.
 */
export function bestTeam(save: SaveData): Fielded[] {
  const left = [...save.cards].sort((a, b) => cardPower(b) - cardPower(a) || a.unit.localeCompare(b.unit) || a.id - b.id);
  const picked: Card[] = [];
  const have = new Map<string, number>();
  const size = teamSize(save);
  while (picked.length < size && left.length > 0) {
    let best = 0;
    let bestWorth = -1;
    left.forEach((card, i) => {
      const role = UNITS[card.unit]?.role ?? 'fighter';
      const steps = ROLE_WORTH[role] ?? ROLE_WORTH.fighter;
      const worth = cardPower(card) * steps[Math.min(have.get(role) ?? 0, steps.length - 1)];
      // The list is strongest first, so the first of equal worth is the stronger card.
      if (worth > bestWorth) {
        bestWorth = worth;
        best = i;
      }
    });
    const [card] = left.splice(best, 1);
    const role = UNITS[card.unit]?.role ?? 'fighter';
    have.set(role, (have.get(role) ?? 0) + 1);
    picked.push(card);
  }
  return formation(picked);
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
 * Who a stage fields: who it is written with, at the grade and level the
 * line gives it, and on later laps more troops on free tiles, a fighter in
 * front, a shooter behind. The troops added are of the kinds the stage
 * already has, the commonest first and each in turn, so that a stage of two
 * Cutpurses and a Poacher grows into a line of both.
 */
export function stageEnemies(index: number): Placement[] {
  const stage = stageAt(index);
  return fieldOf(stage.def, stage.grade, stage.level, stage.extra);
}

/** Who a written stage fields at a grade and level, with so many more troops than it is written with. A dungeon's floor is fielded the same way. */
export function fieldOf(def: StageDef, grade: number, level: number, extra: number): Placement[] {
  const stage = { extra };
  const m = cardMult(grade, level);
  const out: Placement[] = def.enemies.map((e) => {
    const rank = RANK[e.rank];
    return { unit: e.unit, col: e.col, row: e.row, hpMult: m * rank.hp, damageMult: m * rank.damage, scale: rank.scale };
  });
  if (stage.extra > 0) {
    const counts = new Map<string, number>();
    for (const e of def.enemies) if (e.rank === 'troop') counts.set(e.unit, (counts.get(e.unit) ?? 0) + 1);
    const kinds = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map((k) => k[0]);
    for (let n = 0; n < stage.extra && kinds.length > 0; n++) {
      const unit = kinds[n % kinds.length];
      const cols = isFrontline(unit) ? [4, 5, 6, 7] : [7, 6, 5, 4];
      let placed = false;
      for (const col of cols) {
        for (const row of [1, 2, 0, 3]) {
          if (!placed && !out.some((p) => p.col === col && p.row === row)) {
            out.push({ unit, col, row, hpMult: m, damageMult: m, scale: 1 });
            placed = true;
          }
        }
      }
    }
  }
  return out;
}

/** A different fight each time a stage is tried, and the same one if the page is reloaded before it is fought. */
export function stageSeed(save: SaveData, index: number): number {
  return hash32(hash32(save.rng) ^ Math.imul(save.stats.battles + 1, 0x9e3779b1) ^ Math.imul(index + 1, 40503));
}

export function stageInput(save: SaveData, index: number): BattleInput {
  return {
    seed: stageSeed(save, index),
    defs: UNITS,
    teams: [teamPlacements(save), stageEnemies(index)],
  };
}

export interface LevelUp {
  card: number;
  unit: string;
  from: number;
  to: number;
}

/** The experience a battle at a stage gives each card that fought: in full for a win, less for a loss. */
export function stageXp(index: number, won: boolean): number {
  const xp = stageAt(index).xp;
  return Math.round(won ? xp : xp * 0.4);
}

/** Coins for a win at a stage: in full the first time, half after. */
export function stagePay(index: number, first: boolean): number {
  const full = stageAt(index).coins;
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
  /** Units beaten for the first time: known from now on, held or not. */
  unlocked: string[];
  /** The team may be this much bigger from now on, or 0. */
  moreTeam: number;
  /** The world the line has just come to, as its place in WORLDS, or -1. */
  reached: number;
  /** True if this was the last stage of all, cleared for the first time. */
  finished: boolean;
}

function nextRandom(save: SaveData): Rng {
  const rng = new Rng(save.rng);
  save.rng = hash32(save.rng + 0x9e3779b9);
  return rng;
}

/** Books a battle of a stage: pays it, levels the team, opens what it opens. Changes the save. */
export function finishStage(save: SaveData, index: number, won: boolean): StageResult {
  const stage: Stage = stageAt(index);
  const def = stage.def;
  const rng = nextRandom(save);
  const sizeBefore = teamSize(save);
  const first = won && stage.index === cleared(save);
  const beatenBefore = new Set(Object.values(UNITS).filter((u) => beaten(save, u)).map((u) => u.id));

  save.stats.battles++;
  const result: StageResult = {
    won, first, coins: 0, xp: stageXp(stage.index, won), levelUps: [], packs: [], unlocked: [], moreTeam: 0, reached: -1, finished: false,
  };

  for (const p of save.team) {
    const card = cardOf(save, p.card);
    if (!card) continue;
    const from = card.level;
    if (addXp(card, result.xp) > 0) result.levelUps.push({ card: card.id, unit: card.unit, from, to: card.level });
  }
  if (!won) return result;

  save.stats.wins++;
  result.coins = stagePay(stage.index, first);
  save.coins += result.coins;

  if (first) {
    save.cleared = stage.index + 1;
    // A first clear of a boss or a miniboss always drops, and the very first stage does, to show what a pack is.
    if (def.kind !== 'normal' || stage.index === 0) result.packs.push(stage.pack);
    if (def.kind === 'boss') result.packs.push(stage.pack);
  }
  if (rng.chance(DROP_CHANCE)) result.packs.push(stage.pack);
  for (const id of result.packs) save.packs[id] = (save.packs[id] ?? 0) + 1;

  for (const u of Object.values(UNITS)) if (beaten(save, u) && !beatenBefore.has(u.id)) result.unlocked.push(u.id);
  result.moreTeam = teamSize(save) - sizeBefore;
  if (first) {
    if (stage.index + 1 >= STAGES.length) result.finished = true;
    else if (worldOf(stage.index + 1).index !== worldOf(stage.index).index) result.reached = worldOf(stage.index + 1).index;
  }
  return result;
}

// ------------------------------------------------------------ packs

/** Whether the shop sells a pack yet. */
export function packOpen(save: SaveData, pack: PackDef): boolean {
  if (pack.land) {
    // A land's pack is sold once the line has come to that land, and its later packs once it has come to it again.
    const l = LANDS.findIndex((w) => w.id === pack.land);
    return l >= 0 && worldReached(save, (pack.lap ?? 0) * LANDS.length + l);
  }
  if (pack.after !== undefined) return cleared(save) >= pack.after;
  return true;
}

/**
 * What a pack can turn over: every unit of its set, from the start. Nothing
 * in a pack has to be unlocked, by the owner's word ("all packs can contain
 * the unit from that pack from the start").
 */
export function packPool(_save: SaveData, pack: PackDef): UnitInfo[] {
  return Object.values(UNITS).filter((u) => u.set === pack.set);
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

/** The packs the shop has a place for: one to a land and the two that are no land's. */
export const SHELF: readonly PackDef[] = PACKS;

/** Tiles a stage's enemies may stand on: the right half. For the tests. */
export function isEnemyTile(col: number, row: number): boolean {
  return col >= HALF_COLS && col < COLS && row >= 0 && row < ROWS;
}
