// What is kept between visits: which heroes are open, how far each has
// come, a run that was left in its camp, and how the player likes the
// sound. A save may be from an older copy of the game, or not a save at
// all, so it is mended on the way in.

import { HEROES, type Feat } from './data';
import { survived, type RunData } from './run';

export const SAVE_VERSION = 1;

export interface SaveData {
  v: number;
  /** The most waves each hero has come through. */
  best: Record<string, number>;
  /** Heroes opened by a feat. Those with no feat are open without being here. */
  open: string[];
  /** Every enemy felled, ever. */
  kills: number;
  /** The most coins gathered in one run. */
  coins: number;
  /** Every boss beaten, ever. */
  felled: string[];
  runs: number;
  /** Who was played last: the one the game offers first. */
  last: string;
  /** A run left in its camp, to carry on. */
  run: RunData | null;
  sound: boolean;
  music: boolean;
  /** Things said once to a new player and not again. */
  told: string[];
}

export function freshSave(): SaveData {
  return { v: SAVE_VERSION, best: {}, open: [], kills: 0, coins: 0, felled: [], runs: 0, last: HEROES[0].id, run: null, sound: true, music: true, told: [] };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const whole = (v: unknown, least = 0): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(least, Math.floor(v)) : least);
const names = (v: unknown, known: ReadonlySet<string> | null = null): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && (!known || known.has(x))))] : [];

/** A run as it was saved, if it can still be carried on. Anything odd about it and it is let go. */
function mendRun(raw: unknown): RunData | null {
  if (!isRecord(raw)) return null;
  const r = raw as unknown as RunData;
  const ok =
    typeof r.hero === 'string' && HEROES.some((h) => h.id === r.hero) && typeof r.wave === 'number' && r.wave >= 1 && Array.isArray(r.weapons) && r.weapons.length > 0 &&
    Array.isArray(r.items) && Array.isArray(r.ups) && Array.isArray(r.offers) && Array.isArray(r.choices) && (r.phase === 'camp' || r.phase === 'level') &&
    typeof r.gold === 'number' && typeof r.dice === 'number';
  return ok ? r : null;
}

export function repair(raw: unknown, _seed = 1): SaveData {
  const s = freshSave();
  if (!isRecord(raw)) return s;
  const heroes = new Set(HEROES.map((h) => h.id));
  if (isRecord(raw.best)) {
    for (const [id, n] of Object.entries(raw.best)) if (heroes.has(id)) s.best[id] = whole(n);
  }
  s.open = names(raw.open, heroes);
  s.kills = whole(raw.kills);
  s.coins = whole(raw.coins);
  s.felled = names(raw.felled);
  s.runs = whole(raw.runs);
  s.last = typeof raw.last === 'string' && heroes.has(raw.last) ? raw.last : s.last;
  s.run = mendRun(raw.run);
  s.sound = raw.sound !== false;
  s.music = raw.music !== false;
  s.told = names(raw.told);
  return s;
}

/** The most waves anyone has come through. */
export function bestWave(save: SaveData): number {
  return Math.max(0, ...Object.values(save.best));
}

export function featDone(save: SaveData, feat: Feat): boolean {
  switch (feat.kind) {
    case 'wave':
      return bestWave(save) >= feat.wave;
    case 'boss':
      return save.felled.includes(feat.boss);
    case 'coins':
      return save.coins >= feat.coins;
    case 'kills':
      return save.kills >= feat.kills;
  }
}

export function isOpen(save: SaveData, hero: string): boolean {
  const def = HEROES.find((h) => h.id === hero);
  return !!def && (def.unlock === null || save.open.includes(hero));
}

/** How far along a feat is, from 0 to 1: for the bar under a hero who is not open yet. */
export function featShare(save: SaveData, feat: Feat): number {
  switch (feat.kind) {
    case 'wave':
      return Math.min(1, bestWave(save) / feat.wave);
    case 'boss':
      return save.felled.includes(feat.boss) ? 1 : 0;
    case 'coins':
      return Math.min(1, save.coins / feat.coins);
    case 'kills':
      return Math.min(1, save.kills / feat.kills);
  }
}

/**
 * Writes what a run has come to into the save: after every wave, and when
 * it ends. `kills` is what the last wave added. Returns the heroes this
 * opened, in the order the game lists them.
 */
export function record(save: SaveData, run: RunData, kills: number): string[] {
  save.best[run.hero] = Math.max(save.best[run.hero] ?? 0, survived(run));
  save.kills += kills;
  save.coins = Math.max(save.coins, run.coins);
  for (const b of run.felled) if (!save.felled.includes(b)) save.felled.push(b);
  save.last = run.hero;
  const opened: string[] = [];
  for (const h of HEROES) {
    if (h.unlock && !save.open.includes(h.id) && featDone(save, h.unlock)) {
      save.open.push(h.id);
      opened.push(h.id);
    }
  }
  return opened;
}
