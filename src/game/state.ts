// What is kept between visits: which heroes and companions are open, how
// far each hero has come, who goes on the next run, a run that was left in
// its camp, how the player likes the sound, and what the Hold has: renown,
// what it has bought, the vows won under, deeds and oaths done, everything met
// (hold.ts has the rules of those). A save may be from an older copy of the
// game, or not a save at all, so it is mended on the way in.

import { BAND, COMPANIONS, HEROES, OLD_HEROES, OMENS, RELICS, WEAPONS, type Feat } from './data';
import { chronicle, type Tally } from './hold';
import { BOARD, CRATES, DEEDS, OATHS, VOWS, noBoons, type Boons } from './holdData';
import { bandSize, survived, type RunData } from './run';

/** 1: heroes without names. 2: named heroes, companions. 3: the road, relics, kinds of weapon. 4: the Hold. */
export const SAVE_VERSION = 4;

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
  /** Runs begun, and runs that have ended. */
  runs: number;
  ended: number;
  /** Who was played last: the one the game offers first. */
  last: string;
  /** Companions opened by a feat. */
  friends: string[];
  /** The companions who go on the next run, in their places. More may be named here than a hero has places for: the first are taken. */
  band: string[];
  /** Places in the band that are open, before what a hero adds. */
  places: number;
  /** True if the move goes off by itself when it is full. */
  auto: boolean;
  /** A run left in its camp, to carry on. */
  run: RunData | null;
  sound: boolean;
  music: boolean;
  /** Things said once to a new player and not again. */
  told: string[];
  /** Renown in hand, and all that was ever earned. */
  renown: number;
  earned: number;
  /** The armory's crates that have been bought (holdData.ts). */
  crates: string[];
  /** The places of the board that are owned (holdData.ts). */
  board: string[];
  /** The vows sworn for the next run, by name (holdData.ts). */
  vows: string[];
  /** The vows each hero's best win was sworn under: their badge. None for a plain win. A hero who has not won is not here. */
  won: Record<string, string[]>;
  /** Deeds done, and the heroes' oaths done (holdData.ts). */
  deeds: string[];
  oaths: string[];
  /** The heroes whose own weapon follows its second rule: an oath opens the choice. */
  alt: string[];
  /** The day's road as it was last taken: the day, how far it went and how long it was fought. One try a day. And the furthest any day's road has gone. */
  daily: { date: string; wave: number; seconds: number } | null;
  dailyBest: number;
  /**
   * The Chronicle: everything met, by kind and name ("foe:warhound"), and
   * a count with it. For an enemy it is how many were slain, for a hero or
   * a companion the runs they ended, for a weapon, a ware or a relic the
   * runs that ended holding it, for a road the times it was come through.
   * A thing met and not yet counted is 0.
   */
  seen: Record<string, number>;
  /** What the last run that ended paid, line by line. */
  tally: Tally | null;
}

export function freshSave(): SaveData {
  return {
    v: SAVE_VERSION, best: {}, open: [], kills: 0, coins: 0, felled: [], runs: 0, ended: 0, last: HEROES[0].id, friends: [], band: [], places: 1, auto: true, run: null, sound: true, music: true,
    told: [], renown: 0, earned: 0, crates: [], board: [], vows: [], won: {}, deeds: [], oaths: [], alt: [], daily: null, dailyBest: 0, seen: {}, tally: null,
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const whole = (v: unknown, least = 0): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(least, Math.floor(v)) : least);
const names = (v: unknown, known: ReadonlySet<string> | null = null): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && (!known || known.has(x))))] : [];

const RELIC_IDS: ReadonlySet<string> = new Set(RELICS.map((r) => r.id));
const OMEN_IDS: ReadonlySet<string> = new Set(OMENS.map((o) => o.id));
const VOW_IDS: ReadonlySet<string> = new Set(VOWS.map((v) => v.id));

/** A run as it was saved, if it can still be carried on. Anything odd about it and it is let go. */
function mendRun(raw: unknown): RunData | null {
  if (!isRecord(raw)) return null;
  const r = raw as unknown as RunData;
  const ok =
    typeof r.hero === 'string' && HEROES.some((h) => h.id === r.hero) && typeof r.wave === 'number' && r.wave >= 1 && Array.isArray(r.weapons) && Array.isArray(r.band) &&
    r.band.every((b) => isRecord(b) && COMPANIONS.some((c) => c.id === b.id) && typeof b.bond === 'number') &&
    Array.isArray(r.items) && Array.isArray(r.ups) && Array.isArray(r.offers) && Array.isArray(r.choices) &&
    (r.phase === 'camp' || r.phase === 'level' || r.phase === 'relic' || r.phase === 'road') &&
    typeof r.gold === 'number' && typeof r.dice === 'number' && typeof r.fury === 'number' && typeof r.rose === 'number' &&
    // What a run has had since the road: its relics, the road it is on and the roads it is offered.
    names(r.relics, RELIC_IDS).length === (Array.isArray(r.relics) ? r.relics.length : -1) && Array.isArray(r.relicChoices) && typeof r.relicsDue === 'number' &&
    isRecord(r.road) && OMEN_IDS.has(String(r.road.omen)) && Array.isArray(r.roads) && r.roads.every((x) => isRecord(x) && OMEN_IDS.has(String(x.omen))) &&
    typeof r.forks === 'number' && typeof r.vigor === 'number' && typeof r.whet === 'number' && typeof r.left === 'number';
  if (!ok) return null;
  // What a run has had since the Hold. One from just before it is carried on as a run under no vow, with everything open and nothing from the board.
  r.vows = names(r.vows, VOW_IDS);
  r.shut = names(r.shut);
  r.pool = Array.isArray(r.pool) ? names(r.pool) : null;
  r.daily = typeof r.daily === 'string' ? r.daily : '';
  r.alt = r.alt === true;
  r.time = typeof r.time === 'number' && r.time >= 0 ? r.time : 0;
  r.clean = whole(r.clean);
  r.banishes = whole(r.banishes);
  r.relooked = r.relooked === true;
  r.boons = mendBoons(r.boons);
  r.breathed = r.breathed === true;
  r.deeds = names(r.deeds);
  r.paid = r.paid === true;
  r.won = r.won === true;
  // What a run has had since the roads were given costs: whether it is a player's first, the last weapon bought, a toss
  // taken in this camp, a forced march and what it left, and choices owed at the best tier.
  r.first = r.first === true;
  r.taken = typeof r.taken === 'string' && WEAPONS.some((w) => w.id === r.taken) ? r.taken : '';
  r.tossed = r.tossed === true;
  r.forced = r.forced === true;
  r.hurt = typeof r.hurt === 'number' && r.hurt > 0 && r.hurt <= 1 ? r.hurt : 1;
  r.bests = whole(r.bests);
  const t: unknown = r.told;
  r.told = isRecord(t) ? { met: names(t.met), slain: counts(t.slain), roads: names(t.roads), unstruck: names(t.unstruck) } : null;
  return r;
}

/** Counts by name, with anything that is not a count left out. */
function counts(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (isRecord(v)) for (const [k, n] of Object.entries(v)) if (typeof n === 'number' && Number.isFinite(n) && n >= 0) out[k] = Math.floor(n);
  return out;
}

/** What the board had given a run, with anything that is not a number left out. */
function mendBoons(v: unknown): Boons {
  const out = noBoons();
  if (!isRecord(v)) return out;
  for (const k of Object.keys(out) as Array<keyof Boons>) {
    if (k === 'stats') continue;
    const n = v[k];
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0) out[k] = n;
  }
  if (isRecord(v.stats)) for (const [k, n] of Object.entries(v.stats)) if (typeof n === 'number' && Number.isFinite(n) && n >= 0) (out.stats as Record<string, number>)[k] = n;
  return out;
}

/** The places of the board that are owned, each with the one before it: a place whose way to it is missing is let go. */
function mendBoard(v: unknown): string[] {
  const had = names(v, new Set(BOARD.map((n) => n.id)));
  const out: string[] = [];
  for (const n of BOARD) if (had.includes(n.id) && (!n.needs || out.includes(n.needs))) out.push(n.id);
  return out;
}

/** A hero's name as it is now: a save from before the heroes had names calls them by what they were. */
const heroNow = (id: unknown): string => (typeof id === 'string' ? (OLD_HEROES[id] ?? id) : '');

export function repair(raw: unknown, _seed = 1): SaveData {
  const s = freshSave();
  if (!isRecord(raw)) return s;
  const heroes = new Set(HEROES.map((h) => h.id));
  const friends = new Set(COMPANIONS.map((c) => c.id));
  if (isRecord(raw.best)) {
    for (const [id, n] of Object.entries(raw.best)) if (heroes.has(heroNow(id))) s.best[heroNow(id)] = Math.max(s.best[heroNow(id)] ?? 0, whole(n));
  }
  s.open = names(Array.isArray(raw.open) ? raw.open.map(heroNow) : [], heroes);
  s.kills = whole(raw.kills);
  s.coins = whole(raw.coins);
  s.felled = names(raw.felled);
  s.runs = whole(raw.runs);
  // A save from before runs were counted to their end: every run begun but the one in its camp has ended.
  s.ended = typeof raw.ended === 'number' ? Math.min(s.runs, whole(raw.ended)) : Math.max(0, s.runs - (raw.run ? 1 : 0));
  s.last = heroes.has(heroNow(raw.last)) ? heroNow(raw.last) : s.last;
  s.friends = names(raw.friends, friends);
  s.places = Math.max(1, Math.min(BAND.places, whole(raw.places, 1)));
  s.auto = raw.auto !== false;
  // A run from before the road carried other things: it is let go. One from just before the Hold is carried on.
  s.run = raw.v === SAVE_VERSION || raw.v === 3 ? mendRun(raw.run) : null;
  // What the Hold has.
  s.renown = whole(raw.renown);
  s.earned = Math.max(s.renown, whole(raw.earned));
  s.crates = names(raw.crates, new Set(CRATES.map((c) => c.id)));
  s.board = mendBoard(raw.board);
  if (isRecord(raw.won)) for (const [id, v] of Object.entries(raw.won)) if (heroes.has(id)) s.won[id] = names(v, VOW_IDS);
  s.vows = names(raw.vows, VOW_IDS);
  s.deeds = names(raw.deeds, new Set(DEEDS.map((d) => d.id)));
  s.oaths = names(raw.oaths, new Set(OATHS.map((o) => o.id)));
  // Only a hero whose oath opened the choice can have it made.
  s.alt = names(raw.alt, heroes).filter((id) => OATHS.some((o) => o.hero === id && o.opens.kind === 'rule' && s.oaths.includes(o.id)));
  const d: unknown = raw.daily;
  s.daily = isRecord(d) && typeof d.date === 'string' ? { date: d.date, wave: whole(d.wave), seconds: typeof d.seconds === 'number' && d.seconds >= 0 ? d.seconds : 0 } : null;
  s.dailyBest = whole(raw.dailyBest);
  s.seen = counts(raw.seen);
  s.tally = isRecord(raw.tally) && Array.isArray(raw.tally.lines) && typeof raw.tally.total === 'number' ? (raw.tally as unknown as Tally) : null;
  // A save from before the Chronicle has met whoever it has played and beaten.
  for (const id of Object.keys(s.best)) s.seen[`hero:${id}`] ??= 0;
  for (const id of s.felled) s.seen[`foe:${id}`] ??= 1;
  // Whoever a feat has opened since is opened now, and only those who are open go on a run.
  for (const c of COMPANIONS) if (!s.friends.includes(c.id) && featDone(s, c.unlock)) s.friends.push(c.id);
  for (const h of HEROES) if (h.unlock && !s.open.includes(h.id) && featDone(s, h.unlock)) s.open.push(h.id);
  s.band = names(raw.band, friends).filter((id) => s.friends.includes(id));
  // A save from before there were companions takes the first it has earned along.
  if (!Array.isArray(raw.band) && s.friends.length > 0) s.band = [s.friends[0]];
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
    case 'runs':
      return save.ended >= feat.runs;
  }
}

/** True for a companion a feat has opened. */
export function isFriend(save: SaveData, id: string): boolean {
  return save.friends.includes(id);
}

/** Who goes on a run with a hero: the companions chosen, as many as that hero has places for. */
export function bandFor(save: SaveData, hero: string): string[] {
  return save.band.filter((id) => isFriend(save, id)).slice(0, bandSize(hero, save.places));
}

/**
 * Puts a companion in a place of the band, or takes whoever is there out
 * of it ('' for nobody). One who was in another place changes places.
 */
export function setBand(save: SaveData, place: number, id: string): boolean {
  if (place < 0 || place > BAND.places || (id !== '' && !isFriend(save, id))) return false;
  const next = [...save.band];
  const was = next.indexOf(id);
  if (id === '') next.splice(place, 1);
  else if (was >= 0 && place < next.length) [next[was], next[place]] = [next[place], next[was]];
  else if (was < 0 && place < next.length) next[place] = id;
  else if (was < 0) next.push(id);
  save.band = next;
  return true;
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
    case 'runs':
      return Math.min(1, save.ended / feat.runs);
  }
}

/** What a run has opened: heroes and companions, each in the order the game lists them, the deeds it has done, and at its end what it paid. */
export interface Opened {
  heroes: string[];
  friends: string[];
  deeds: string[];
  /** Oaths of the hero's done, and crates their own deeds have opened. */
  oaths: string[];
  crates: string[];
  tally: Tally | null;
}

/**
 * Writes what a run has come to into the save: after every wave, and when
 * it ends. `kills` is what the last wave added. Returns who this opened.
 * A companion opened while the band has a place free goes straight into
 * it: the first of them is met by having it along.
 */
export function record(save: SaveData, run: RunData, kills: number): Opened {
  save.best[run.hero] = Math.max(save.best[run.hero] ?? 0, survived(run));
  save.kills += kills;
  save.coins = Math.max(save.coins, run.coins);
  for (const b of run.felled) if (!save.felled.includes(b)) save.felled.push(b);
  save.last = run.hero;
  if (run.phase === 'over') save.ended++;
  const opened: Opened = { heroes: [], friends: [], deeds: [], oaths: [], crates: [], tally: null };
  for (const h of HEROES) {
    if (h.unlock && !save.open.includes(h.id) && featDone(save, h.unlock)) {
      save.open.push(h.id);
      opened.heroes.push(h.id);
    }
  }
  for (const c of COMPANIONS) {
    if (save.friends.includes(c.id) || !featDone(save, c.unlock)) continue;
    save.friends.push(c.id);
    opened.friends.push(c.id);
    if (save.band.length < save.places) save.band.push(c.id);
  }
  // The Hold takes what the run has to tell: the Chronicle, the deeds, and at the end its renown.
  const told = chronicle(save, run);
  opened.deeds = told.deeds;
  opened.oaths = told.oaths;
  opened.crates = told.crates;
  opened.tally = told.tally;
  return opened;
}
