// What is saved: the player's cards, team, coins and how far they have got.
// Everything here is plain data and pure functions; storage.ts is the only
// thing that touches the browser.

import type { Placement } from '../sim/types';

export const SAVE_VERSION = 3;

/** A stage: a world's place in WORLDS, the stage's place in it, and the difficulty's place in DIFFICULTIES. */
export interface Where {
  world: number;
  stage: number;
  d: number;
}

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
  /** By world id, then by difficulty: how many of its stages are cleared, in order. */
  cleared: Record<string, number[]>;
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
  /** The stage on show, which is where the next battle is fought. */
  at: Where;
  /** A stage that was lost and stepped back from, to come back to when the team changes. */
  lostAt: Where | null;
  /** False when the player has switched auto battle off: then BATTLE fights one battle and waits. */
  auto: boolean;
  /** The order the screen of units lays the cards out in: one of SORTS (game/sorting.ts). */
  sort: string;
}

export function newSave(seed: number): SaveData {
  return {
    version: SAVE_VERSION,
    coins: 0,
    cards: [],
    nextCard: 1,
    met: [],
    team: [],
    cleared: {},
    packs: {},
    rng: seed >>> 0,
    stats: { battles: 0, wins: 0, opened: 0 },
    speed: 1,
    sound: true,
    tutorial: { done: false, seen: [] },
    at: { world: 0, stage: 0, d: 0 },
    lostAt: null,
    auto: true,
    sort: 'unit',
  };
}

/** A save as it came out of storage, made safe to use: missing parts filled in, nonsense dropped. */
export function repair(raw: unknown, seed: number): SaveData {
  const fresh = newSave(seed);
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Partial<SaveData> & { cleared?: Record<string, unknown> };
  // Version 1 kept one count of cleared stages to a world, and had no tutorial. Versions 1 and 2
  // kept one card to a unit, by the unit's name. Both are carried over.
  if (r.version !== SAVE_VERSION && r.version !== 1 && r.version !== 2) return fresh;
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
  if (r.cleared && typeof r.cleared === 'object') {
    for (const [id, v] of Object.entries(r.cleared)) {
      const list = Array.isArray(v) ? v : [v];
      out.cleared[id] = list.map((n) => Math.max(0, Math.floor(num(n, 0))));
    }
  }
  const where = (v: unknown): Where | null => {
    if (!v || typeof v !== 'object') return null;
    const w = v as Partial<Where>;
    return { world: Math.max(0, Math.floor(num(w.world, 0))), stage: Math.max(0, Math.floor(num(w.stage, 0))), d: Math.max(0, Math.floor(num(w.d, 0))) };
  };
  out.at = where(r.at) ?? fresh.at;
  out.lostAt = where(r.lostAt);
  out.auto = r.auto !== false;
  out.sort = typeof r.sort === 'string' ? r.sort : fresh.sort;
  // A save from before the tutorial belongs to someone who has already played: they have no use for it.
  const t = r.tutorial;
  if (t && typeof t === 'object') {
    out.tutorial = {
      done: t.done === true,
      seen: Array.isArray(t.seen) ? t.seen.filter((x): x is string => typeof x === 'string') : [],
    };
  } else {
    const played = Object.values(out.cleared).some((list) => list.some((n) => n > 0));
    out.tutorial = { done: r.version === 1 || played, seen: [] };
  }
  if (r.stats && typeof r.stats === 'object') {
    out.stats = {
      battles: Math.max(0, Math.floor(num(r.stats.battles, 0))),
      wins: Math.max(0, Math.floor(num(r.stats.wins, 0))),
      opened: Math.max(0, Math.floor(num(r.stats.opened, 0))),
    };
  }
  return out;
}
