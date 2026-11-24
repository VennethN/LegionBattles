// What is kept between visits, and nothing else. Everything that can be
// worked out from this is worked out (rules.ts), so a save is small and an
// old one can always be read.

import { ABILITIES, CAMP, FEATS, HEROES, HERO_COST, HONORS, PACK_EVERY } from './data';

export const SAVE_VERSION = 1;

/** What a rebirth takes away: the road walked, the purse, the legion's levels and the camp. */
export interface Run {
  /** The stage being fought, from 1. */
  stage: number;
  /** The furthest stage reached this run. */
  top: number;
  /** Enemies down in this stage. */
  kills: number;
  /**
   * True while the legion stays at its stage and does not go on: after a
   * boss it could not bring down in time, or because the player said so.
   */
  holding: boolean;
  gold: number;
  /** Each hero's level, in the order of HEROES. 0 is not hired. */
  heroes: number[];
  /** Each camp building's level, in the order of CAMP. */
  camp: number[];
}

export interface Settings {
  /** Volumes from 0 to 10, and the switch over both. */
  music: number;
  effects: number;
  sound: boolean;
  /** How many levels a press buys: 1, 10, 25, or 0 for as many as the purse allows. */
  buy: number;
  /** False when the player has told the legion to stay where it is. */
  advance: boolean;
  /** False for no shaking of the screen. */
  shake: boolean;
}

export interface Stats {
  taps: number;
  kills: number;
  bosses: number;
  /** All the gold ever earned, through every rebirth. */
  gold: number;
  packs: number;
  /** Seconds played with the game open. */
  seconds: number;
}

export interface SaveData {
  version: number;
  run: Run;
  /** Laurels to spend, and every laurel ever won. */
  laurels: number;
  laurelsEver: number;
  /** Each honor's level, in the order of HONORS. */
  honors: number[];
  rebirths: number;
  /** The furthest stage ever reached, in any run. */
  best: number;
  stats: Stats;
  /** The feats done, by id. */
  feats: string[];
  /** For each ability: the moment it can be used again and the moment it stops, by the clock on the wall, in milliseconds. */
  abilities: Array<{ ready: number; until: number }>;
  /** Seconds of play until the next supply pack. */
  packIn: number;
  /** When the game was last seen running, by the clock on the wall. 0 for never. */
  seen: number;
  /** Where the dice stand, so that reloading does not roll again. */
  rng: number;
  /** The hints that have been shown and need not be again. */
  hints: string[];
  settings: Settings;
}

/** A run as it starts: no one hired, nothing built, and the price of the first hero in the purse, so that the first thing there is to do is hire. */
export function newRun(): Run {
  return { stage: 1, top: 1, kills: 0, holding: false, gold: HERO_COST, heroes: HEROES.map(() => 0), camp: CAMP.map(() => 0) };
}

export function newSave(seed = 1): SaveData {
  return {
    version: SAVE_VERSION,
    run: newRun(),
    laurels: 0,
    laurelsEver: 0,
    honors: HONORS.map(() => 0),
    rebirths: 0,
    best: 1,
    stats: { taps: 0, kills: 0, bosses: 0, gold: 0, packs: 0, seconds: 0 },
    feats: [],
    abilities: ABILITIES.map(() => ({ ready: 0, until: 0 })),
    packIn: PACK_EVERY[0],
    seen: 0,
    rng: seed >>> 0 || 1,
    hints: [],
    settings: { music: 6, effects: 8, sound: true, buy: 1, advance: true, shake: true },
  };
}

const num = (v: unknown, fallback: number, least = 0): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(least, v) : fallback);
const whole = (v: unknown, fallback: number, least = 0): number => Math.floor(num(v, fallback, least));

/** A list of levels as long as what it is the levels of: a save from before a hero was added has a 0 for it. */
function levels(v: unknown, length: number, most?: (i: number) => number): number[] {
  const list = Array.isArray(v) ? v : [];
  const out: number[] = [];
  for (let i = 0; i < length; i++) out.push(Math.min(most ? most(i) : Infinity, whole(list[i], 0)));
  return out;
}

/**
 * Makes whatever was read from storage into a save that every rule can
 * trust: a field that is missing or of the wrong kind gets what a new save
 * has, and a number that could not be is brought back in. A save is the
 * player's own file and may have been edited; nothing in it may stop the
 * game.
 */
export function repair(raw: unknown, seed = 1): SaveData {
  const fresh = newSave(seed);
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Record<string, unknown>;
  const run = (r.run && typeof r.run === 'object' ? r.run : {}) as Record<string, unknown>;
  const stats = (r.stats && typeof r.stats === 'object' ? r.stats : {}) as Record<string, unknown>;
  const settings = (r.settings && typeof r.settings === 'object' ? r.settings : {}) as Record<string, unknown>;
  const stage = whole(run.stage, 1, 1);
  const top = Math.max(stage, whole(run.top, stage, 1));
  const abilities = Array.isArray(r.abilities) ? r.abilities : [];
  const save: SaveData = {
    version: SAVE_VERSION,
    run: {
      stage,
      top,
      kills: whole(run.kills, 0),
      holding: run.holding === true,
      gold: num(run.gold, fresh.run.gold),
      heroes: levels(run.heroes, HEROES.length),
      camp: levels(run.camp, CAMP.length, (i) => CAMP[i].max),
    },
    laurels: whole(r.laurels, 0),
    laurelsEver: whole(r.laurelsEver, 0),
    honors: levels(r.honors, HONORS.length, (i) => HONORS[i].max),
    rebirths: whole(r.rebirths, 0),
    best: Math.max(top, whole(r.best, top, 1)),
    stats: {
      taps: whole(stats.taps, 0),
      kills: whole(stats.kills, 0),
      bosses: whole(stats.bosses, 0),
      gold: num(stats.gold, 0),
      packs: whole(stats.packs, 0),
      seconds: num(stats.seconds, 0),
    },
    // Each feat there is, once: one listed twice would be counted twice, and one there is not would be counted at all.
    feats: FEATS.map((f) => f.id).filter((id) => Array.isArray(r.feats) && r.feats.includes(id)),
    abilities: ABILITIES.map((_a, i) => {
      const a = (abilities[i] && typeof abilities[i] === 'object' ? abilities[i] : {}) as Record<string, unknown>;
      return { ready: num(a.ready, 0), until: num(a.until, 0) };
    }),
    packIn: num(r.packIn, fresh.packIn),
    seen: num(r.seen, 0),
    rng: whole(r.rng, fresh.rng) >>> 0 || 1,
    hints: Array.isArray(r.hints) ? r.hints.filter((h): h is string => typeof h === 'string') : [],
    settings: {
      music: Math.min(10, whole(settings.music, fresh.settings.music)),
      effects: Math.min(10, whole(settings.effects, fresh.settings.effects)),
      sound: settings.sound !== false,
      buy: [1, 10, 25, 0].includes(settings.buy as number) ? (settings.buy as number) : 1,
      advance: settings.advance !== false,
      shake: settings.shake !== false,
    },
  };
  // Laurels to spend can't be more than were ever won.
  save.laurelsEver = Math.max(save.laurelsEver, save.laurels);
  return save;
}
