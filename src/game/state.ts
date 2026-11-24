// What is saved: the player's cards, team, coins and how far they have got.
// Everything here is plain data and pure functions; storage.ts is the only
// thing that touches the browser.

import type { Placement } from '../sim/types';

export const SAVE_VERSION = 2;

/** A stage: a world's place in WORLDS, the stage's place in it, and the difficulty's place in DIFFICULTIES. */
export interface Where {
  world: number;
  stage: number;
  d: number;
}

export interface Card {
  /** Its place in GRADES. A better pull of the same unit raises it. */
  grade: number;
  level: number;
  /** Experience toward the next level. */
  xp: number;
}

export interface SaveData {
  version: number;
  coins: number;
  /** One card to a unit, by unit id. */
  cards: Record<string, Card>;
  /** Who fights and where they stand. */
  team: Placement[];
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
}

export function newSave(seed: number): SaveData {
  return {
    version: SAVE_VERSION,
    coins: 0,
    cards: {},
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
  };
}

/** A save as it came out of storage, made safe to use: missing parts filled in, nonsense dropped. */
export function repair(raw: unknown, seed: number): SaveData {
  const fresh = newSave(seed);
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Partial<SaveData> & { cleared?: Record<string, unknown> };
  // Version 1 kept one count of cleared stages to a world, and had no tutorial. It is carried over.
  if (r.version !== SAVE_VERSION && r.version !== 1) return fresh;
  const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const out: SaveData = {
    ...fresh,
    coins: Math.max(0, Math.floor(num(r.coins, 0))),
    rng: num(r.rng, fresh.rng) >>> 0,
    speed: r.speed === 2 ? 2 : 1,
    sound: r.sound !== false,
  };
  if (r.cards && typeof r.cards === 'object') {
    for (const [id, c] of Object.entries(r.cards)) {
      if (!c || typeof c !== 'object') continue;
      out.cards[id] = {
        grade: Math.max(0, Math.floor(num(c.grade, 0))),
        level: Math.max(1, Math.floor(num(c.level, 1))),
        xp: Math.max(0, Math.floor(num(c.xp, 0))),
      };
    }
  }
  if (Array.isArray(r.team)) {
    for (const p of r.team) {
      if (p && typeof p.unit === 'string' && out.cards[p.unit]) {
        out.team.push({ unit: p.unit, col: Math.floor(num(p.col, 0)), row: Math.floor(num(p.row, 0)) });
      }
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
