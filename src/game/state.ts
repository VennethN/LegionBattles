// What is saved: the player's cards, team, coins and how far they have got.
// Everything here is plain data and pure functions; storage.ts is the only
// thing that touches the browser.

import type { Placement } from '../sim/types';

export const SAVE_VERSION = 1;

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
  /** By world id: how many of its stages are cleared, in order. */
  cleared: Record<string, number>;
  /** Unopened packs, by pack id. */
  packs: Record<string, number>;
  /** Where the pack roller's generator stands, so that reloading does not reroll. */
  rng: number;
  /** Battles fought and won, packs opened: for the record and for tuning. */
  stats: { battles: number; wins: number; opened: number };
  speed: number;
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
  };
}

/** A save as it came out of storage, made safe to use: missing parts filled in, nonsense dropped. */
export function repair(raw: unknown, seed: number): SaveData {
  const fresh = newSave(seed);
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Partial<SaveData>;
  if (r.version !== SAVE_VERSION) return fresh;
  const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const out: SaveData = {
    ...fresh,
    coins: Math.max(0, Math.floor(num(r.coins, 0))),
    rng: num(r.rng, fresh.rng) >>> 0,
    speed: r.speed === 2 ? 2 : 1,
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
  for (const key of ['cleared', 'packs'] as const) {
    const src = r[key];
    if (src && typeof src === 'object') {
      for (const [id, n] of Object.entries(src)) out[key][id] = Math.max(0, Math.floor(num(n, 0)));
    }
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
