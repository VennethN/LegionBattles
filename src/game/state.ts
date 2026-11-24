// What is saved: the player's cards, team, coins and how far they have got.
// Everything here is plain data and pure functions; storage.ts is the only
// thing that touches the browser.

import { LANDS } from '../data/lands';
import { PLAYER_MAX_LEVEL } from '../data/player';
import { tidyTree } from './player';
import { STAGES, WORLDS } from '../data/stages';
import type { Placement } from '../sim/types';

export const SAVE_VERSION = 4;

/**
 * A card. Every card pulled is one of these, a copy of a unit already held
 * too: it has a grade of its own from its pack and a level of its own from
 * what it has fought and what has been combined into it.
 */
export interface Card {
  /** A number no other card of the player has. The team names its cards by it. */
  id: number;
  unit: string;
  /** Its place in GRADES, as its pack rolled it. It never changes. */
  grade: number;
  level: number;
  /** Experience toward the next level. */
  xp: number;
}

/** A place in the team: which card, and the tile it stands on. `unit` is the card's, kept beside it for the board. */
export interface Fielded extends Placement {
  card: number;
}

export interface SaveData {
  version: number;
  coins: number;
  /** Every card held. Two of a unit are two cards. */
  cards: Card[];
  /** The id the next card gets. */
  nextCard: number;
  /** Every unit a card has ever been held of. A unit stays known after its last card is combined away. */
  met: string[];
  /** Who fights and where they stand. */
  team: Fielded[];
  /** How many stages of the line are cleared, in order (data/stages.ts). */
  cleared: number;
  /**
   * Stages cleared in worlds the line has not come to yet, by the world's
   * place in WORLDS: a world's harder difficulty can be open, and played,
   * before the worlds between are done (game/rules.ts, worldOpen). When the
   * line comes to such a world its count here is taken into `cleared`.
   */
  ahead: Record<string, number>;
  /** How many tiers of each dungeon are cleared, in order, by its id; and of each raid (data/expeditions.ts). */
  dungeons: Record<string, number>;
  raids: Record<string, number>;
  /** Unopened packs, by pack id. */
  packs: Record<string, number>;
  /** Where the pack roller's generator stands, so that reloading does not reroll. */
  rng: number;
  /** Battles fought and won, packs opened: for the record and for tuning. */
  stats: { battles: number; wins: number; opened: number };
  speed: number;
  /** False when the player has turned the sound off. */
  sound: boolean;
  /** Where the first-run tutorial stands: over, or the notes the player has pressed GOT IT on. */
  tutorial: { done: boolean; seen: string[] };
  /** The stage on show, which is where the next battle is fought: its place in the line, from 0. */
  at: number;
  /** A stage that was lost and stepped back from, to come back to when the team changes. */
  lostAt: number | null;
  /** False when the player has switched auto battle off: then BATTLE fights one battle and waits. */
  auto: boolean;
  /** The order the screen of units lays the cards out in: one of SORTS (game/sorting.ts). */
  sort: string;
  /** The player's own level and the experience toward the next (data/player.ts). */
  player: { level: number; xp: number };
  /** The ranks bought in the skill tree, by node. */
  tree: Record<string, number>;
  /** The levels bought of each upgrade, by its id. */
  upgrades: Record<string, number>;
}

export function newSave(seed: number): SaveData {
  return {
    version: SAVE_VERSION,
    coins: 0,
    cards: [],
    nextCard: 1,
    met: [],
    team: [],
    cleared: 0,
    ahead: {},
    dungeons: {},
    raids: {},
    packs: {},
    rng: seed >>> 0,
    stats: { battles: 0, wins: 0, opened: 0 },
    speed: 1,
    sound: true,
    tutorial: { done: false, seen: [] },
    at: 0,
    lostAt: null,
    auto: true,
    sort: 'unit',
    player: { level: 1, xp: 0 },
    tree: {},
    upgrades: {},
  };
}

/** A save as it came out of storage, made safe to use: missing parts filled in, nonsense dropped. */
export function repair(raw: unknown, seed: number): SaveData {
  const fresh = newSave(seed);
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Omit<Partial<SaveData>, 'cleared' | 'at' | 'lostAt'> & { cleared?: unknown; at?: unknown; lostAt?: unknown };
  // Version 1 kept one count of cleared stages to a world, and had no tutorial. Versions 1 and 2
  // kept one card to a unit, by the unit's name. Up to version 3 there were worlds, each with five
  // difficulties, where there is one line of stages now. All of them are carried over.
  if (r.version !== SAVE_VERSION && r.version !== 1 && r.version !== 2 && r.version !== 3) return fresh;
  const worlds = r.version !== SAVE_VERSION;
  const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const out: SaveData = {
    ...fresh,
    coins: Math.max(0, Math.floor(num(r.coins, 0))),
    rng: num(r.rng, fresh.rng) >>> 0,
    speed: r.speed === 2 ? 2 : 1,
    sound: r.sound !== false,
  };
  const card = (c: unknown, unit: unknown, id: number): Card | null => {
    if (!c || typeof c !== 'object' || typeof unit !== 'string' || unit === '') return null;
    const v = c as Partial<Card>;
    return {
      id,
      unit,
      grade: Math.max(0, Math.floor(num(v.grade, 0))),
      level: Math.max(1, Math.floor(num(v.level, 1))),
      xp: Math.max(0, Math.floor(num(v.xp, 0))),
    };
  };
  const taken = new Set<number>();
  const old = !Array.isArray(r.cards);
  if (Array.isArray(r.cards)) {
    for (const c of r.cards as unknown[]) {
      const v = c as Partial<Card> | null;
      const id = Math.floor(num(v?.id, 0));
      // A card with no number of its own, or with another's, can't be named by the team: it is dropped.
      if (id <= 0 || taken.has(id)) continue;
      const made = card(v, v?.unit, id);
      if (!made) continue;
      taken.add(id);
      out.cards.push(made);
    }
  } else if (r.cards && typeof r.cards === 'object') {
    // One card to a unit, by name: each becomes a card with a number.
    let id = 1;
    for (const [unit, c] of Object.entries(r.cards as Record<string, unknown>)) {
      const made = card(c, unit, id);
      if (!made) continue;
      taken.add(id++);
      out.cards.push(made);
    }
  }
  const met = new Set<string>(Array.isArray(r.met) ? r.met.filter((x): x is string => typeof x === 'string') : []);
  for (const c of out.cards) met.add(c.unit);
  out.met = [...met];
  let top = 0;
  for (const id of taken) top = Math.max(top, id);
  out.nextCard = Math.max(top + 1, Math.floor(num(r.nextCard, 1)));
  if (Array.isArray(r.team)) {
    const fielded = new Set<number>();
    for (const p of r.team as unknown[]) {
      if (!p || typeof p !== 'object') continue;
      const v = p as Partial<Fielded>;
      // An older team names a unit, and there was one card of each.
      const held = old ? out.cards.find((c) => c.unit === v.unit) : out.cards.find((c) => c.id === v.card);
      if (!held || fielded.has(held.id)) continue;
      fielded.add(held.id);
      out.team.push({ card: held.id, unit: held.unit, col: Math.floor(num(v.col, 0)), row: Math.floor(num(v.row, 0)) });
    }
  }
  if (r.packs && typeof r.packs === 'object') {
    for (const [id, n] of Object.entries(r.packs)) out.packs[id] = Math.max(0, Math.floor(num(n, 0)));
  }
  if (worlds) {
    // The line as far as it had been walked: stage after stage, as long as the world and
    // difficulty that stage was then had been cleared that far.
    const old = (r.cleared && typeof r.cleared === 'object' ? r.cleared : {}) as Record<string, unknown>;
    const done = (land: string, lap: number): number => {
      const v = old[land];
      const list = Array.isArray(v) ? v : [v];
      return Math.max(0, Math.floor(num(list[lap], 0)));
    };
    let n = 0;
    while (n < STAGES.length && done(LANDS[STAGES[n].land].id, STAGES[n].lap) > STAGES[n].local) n++;
    out.cleared = n;
    // It opens on the furthest stage: where it stood among the worlds has no place on the line.
    out.at = Math.min(n, STAGES.length - 1);
    out.lostAt = null;
  } else {
    out.cleared = Math.max(0, Math.min(STAGES.length, Math.floor(num(r.cleared, 0))));
    out.at = Math.max(0, Math.min(STAGES.length - 1, Math.floor(num(r.at, 0))));
    out.lostAt = typeof r.lostAt === 'number' && Number.isFinite(r.lostAt) ? Math.max(0, Math.min(STAGES.length - 1, Math.floor(r.lostAt))) : null;
    // Stages cleared ahead of the line, in worlds it has not come to. A save from before difficulties could be picked has none.
    const ahead = (r as { ahead?: unknown }).ahead;
    if (ahead && typeof ahead === 'object') {
      for (const [world, n] of Object.entries(ahead)) {
        const w = Number(world);
        const count = Math.floor(num(n, 0));
        if (Number.isInteger(w) && w >= 0 && w < WORLDS.length && count > 0) out.ahead[String(w)] = Math.min(count, WORLDS[w].last - WORLDS[w].first + 1);
      }
    }
  }
  for (const key of ['dungeons', 'raids'] as const) {
    const book = r[key];
    if (book && typeof book === 'object') {
      for (const [id, n] of Object.entries(book)) out[key][id] = Math.max(0, Math.floor(num(n, 0)));
    }
  }
  out.auto = r.auto !== false;
  out.sort = typeof r.sort === 'string' ? r.sort : fresh.sort;
  // The player's level, tree and upgrades. A save from before there were any starts at level 1 with none.
  const p = (r as { player?: unknown }).player;
  if (p && typeof p === 'object') {
    const v = p as { level?: unknown; xp?: unknown };
    out.player = {
      level: Math.max(1, Math.min(PLAYER_MAX_LEVEL, Math.floor(num(v.level, 1)))),
      xp: Math.max(0, Math.floor(num(v.xp, 0))),
    };
  }
  for (const key of ['tree', 'upgrades'] as const) {
    const book = (r as Record<string, unknown>)[key];
    if (book && typeof book === 'object') {
      for (const [id, n] of Object.entries(book)) {
        const count = Math.floor(num(n, 0));
        if (count > 0) out[key][id] = count;
      }
    }
  }
  // A save from before the tutorial belongs to someone who has already played: they have no use for it.
  const t = r.tutorial;
  if (t && typeof t === 'object') {
    out.tutorial = {
      done: t.done === true,
      seen: Array.isArray(t.seen) ? t.seen.filter((x): x is string => typeof x === 'string') : [],
    };
  } else {
    out.tutorial = { done: r.version === 1 || out.cleared > 0, seen: [] };
  }
  if (r.stats && typeof r.stats === 'object') {
    out.stats = {
      battles: Math.max(0, Math.floor(num(r.stats.battles, 0))),
      wins: Math.max(0, Math.floor(num(r.stats.wins, 0))),
      opened: Math.max(0, Math.floor(num(r.stats.opened, 0))),
    };
  }
  // A tree with ranks a node can't have, or more points spent than were earned, is put right.
  tidyTree(out);
  return out;
}
