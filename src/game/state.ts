// What is kept between visits: which heroes and companions are unlocked,
// how far each hero has come and their mastery, who goes on the next run,
// a run that was left in its camp (a run of a hundred waves is played over
// several sittings), how the player likes the sound, and what the Hold has:
// the vows won under, quests done, everything met (hold.ts has the rules of
// those). A save may be from an older copy of the game, or not a save at
// all, so it is mended on the way in.

import { HANDED } from './handover';
import { BAND, COMPANIONS, COUNTS, HEROES, OLD_HEROES, FUSED, OMENS, RELICS, SLOT_WAVES, WEAPONS, type Feat } from './data';
import { chronicle, fillBand, unlockFriends, waitingOf, type Tally } from './hold';
import { CRATES, DEEDS, VOWS, noBoons, type Boons } from './holdData';
import { LEVEL_XP } from './mastery';
import { bandSize, survived, type RunData } from './run';

/** 1: heroes without names. 2: named heroes, companions. 3: the road, relics, kinds of weapon. 4: the Hold. 5: mastery, slots, a hundred waves. */
export const SAVE_VERSION = 5;

/**
 * What each place of the old board cost (version 4). A save from then has
 * what it bought, and its renown in hand, turned into mastery for the hero
 * it played most, so that nobody loses what they had earned.
 */
const OLD_BOARD: Readonly<Record<string, number>> = {
  'hero-1': 30, 'body-1': 50, 'body-2': 65, 'body-3': 80, 'body-4': 95, 'body-5': 110, 'body-6': 1100, 'arm-1': 50, 'arm-2': 65, 'arm-3': 80, 'arm-4': 95, 'arm-5': 110,
  'arm-6': 500, 'band-1': 40, 'band-2': 60, 'band-3': 75, 'band-4': 90, 'band-5': 110, 'band-6': 450, 'purse-1': 30, 'purse-2': 55, 'purse-3': 70, 'purse-4': 85, 'purse-5': 100,
  'purse-6': 120, 'purse-7': 550, 'fortune-1': 40, 'fortune-2': 60, 'fortune-3': 75, 'fortune-4': 110, 'fortune-5': 120, 'fortune-6': 135, 'fortune-7': 600,
};

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
  /** Companions unlocked, by any way (companions.ts, Route). */
  friends: string[];
  /** The companions who go on the next run, in their slots. More may be named here than there are slots: the first are taken. */
  band: string[];
  /** True if the move goes off by itself when it is full. */
  auto: boolean;
  /** A run left in its camp, to carry on. */
  run: RunData | null;
  sound: boolean;
  music: boolean;
  /** Things said once to a new player and not again. */
  told: string[];
  /** Each hero's mastery, by name: what their runs have paid them in all (mastery.ts). */
  mastery: Record<string, number>;
  /** Which of a pair each hero picked at the levels of their track that have two, by the level's place in it. */
  picks: Record<string, Record<number, number>>;
  /** The armory's crates that have been unlocked (holdData.ts). */
  crates: string[];
  /** The vows sworn for the next run, by name (holdData.ts). */
  vows: string[];
  /** The vows each hero's best win was sworn under: their badge. None for a plain win. A hero who has not won is not here. */
  won: Record<string, string[]>;
  /** Quests done (holdData.ts). */
  deeds: string[];
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
  /** What the last run that ended paid its hero, line by line. */
  tally: Tally | null;
}

/** The companion a new player has from the start: Biscuit, the war hound. */
const START_FRIEND = COMPANIONS.find((c) => c.unlock.kind === 'start')?.id ?? COMPANIONS[0].id;

export function freshSave(): SaveData {
  return {
    v: SAVE_VERSION, best: {}, open: [], kills: 0, coins: 0, felled: [], runs: 0, ended: 0, last: HEROES[0].id, friends: [START_FRIEND], band: [START_FRIEND], auto: false, run: null, sound: true,
    // A save begun now never has its skill handed over: AUTO is off from the start (handover.ts).
    music: true, told: [HANDED], mastery: {}, picks: {}, crates: [], vows: [], won: {}, deeds: [], daily: null, dailyBest: 0, seen: {}, tally: null,
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const whole = (v: unknown, least = 0): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(least, Math.floor(v)) : least);
const names = (v: unknown, known: ReadonlySet<string> | null = null): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && (!known || known.has(x))))] : [];

const RELIC_IDS: ReadonlySet<string> = new Set([...RELICS, ...FUSED].map((r) => r.id));
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
  // What a run has had since slots and found companions: one from before has room for the band it has.
  r.slots = typeof r.slots === 'number' ? Math.max(0, Math.min(BAND.places, Math.floor(r.slots))) : Math.max(1, r.band.length);
  r.friends = Array.isArray(r.friends) ? names(r.friends) : null;
  r.seek = names(r.seek);
  r.found = names(r.found);
  r.caged = r.caged === true;
  r.cageAt = whole(r.cageAt);
  r.cage = typeof r.cage === 'string' && COMPANIONS.some((c) => c.id === r.cage) ? r.cage : '';
  r.taken = typeof r.taken === 'string' && WEAPONS.some((w) => w.id === r.taken) ? r.taken : '';
  r.tossed = r.tossed === true;
  r.forced = r.forced === true;
  r.hurt = typeof r.hurt === 'number' && r.hurt > 0 && r.hurt <= 1 ? r.hurt : 1;
  r.bests = whole(r.bests);
  r.counts = Object.fromEntries(COUNTS.map((c) => [c, whole(isRecord(r.counts) ? r.counts[c] : 0)]).filter(([, n]) => n !== 0));
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
    if (k === 'stats' || k === 'perks') continue;
    const n = v[k];
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0) out[k] = n;
  }
  if (isRecord(v.stats)) for (const [k, n] of Object.entries(v.stats)) if (typeof n === 'number' && Number.isFinite(n) && n >= 0) (out.stats as Record<string, number>)[k] = n;
  out.perks = names(v.perks);
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
  s.friends = [...new Set([...s.friends, ...names(raw.friends, friends)])];
  s.auto = raw.auto !== false;
  // A run from before the road carried other things, and one from before a run was a hundred waves was another run: they are let go.
  s.run = raw.v === SAVE_VERSION ? mendRun(raw.run) : null;
  // What the Hold has.
  s.crates = names(raw.crates, new Set(CRATES.map((c) => c.id)));
  if (isRecord(raw.mastery)) for (const [id, n] of Object.entries(raw.mastery)) if (heroes.has(id)) s.mastery[id] = Math.min(LEVEL_XP[LEVEL_XP.length - 1], whole(n));
  if (isRecord(raw.picks)) {
    for (const [id, v] of Object.entries(raw.picks)) {
      if (!heroes.has(id) || !isRecord(v)) continue;
      s.picks[id] = {};
      for (const [lv, i] of Object.entries(v)) if (typeof i === 'number' && (i === 0 || i === 1)) s.picks[id][Number(lv)] = i;
    }
  }
  if (isRecord(raw.won)) for (const [id, v] of Object.entries(raw.won)) if (heroes.has(id)) s.won[id] = names(v, VOW_IDS);
  s.vows = names(raw.vows, VOW_IDS);
  s.deeds = names(raw.deeds, new Set(DEEDS.map((d) => d.id)));
  const d: unknown = raw.daily;
  s.daily = isRecord(d) && typeof d.date === 'string' ? { date: d.date, wave: whole(d.wave), seconds: typeof d.seconds === 'number' && d.seconds >= 0 ? d.seconds : 0 } : null;
  s.dailyBest = whole(raw.dailyBest);
  s.seen = counts(raw.seen);
  s.tally = isRecord(raw.tally) && Array.isArray(raw.tally.lines) && typeof raw.tally.total === 'number' && typeof raw.tally.hero === 'string' ? (raw.tally as unknown as Tally) : null;
  // A save from the board: what it bought and the renown it held become mastery for the hero it played most.
  if (raw.v === 4 || (typeof raw.v === 'number' && raw.v < 5 && (Array.isArray(raw.board) || typeof raw.renown === 'number'))) {
    const paid = names(raw.board).reduce((n, id) => n + (OLD_BOARD[id] ?? 0), 0) + whole(raw.renown);
    const most = Object.entries(isRecord(raw.seen) ? raw.seen : {}).filter(([k]) => k.startsWith('hero:') && heroes.has(k.slice(5))).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    const hero = most ? most[0].slice(5) : s.last;
    if (paid > 0) s.mastery[hero] = Math.min(LEVEL_XP[LEVEL_XP.length - 1], (s.mastery[hero] ?? 0) + paid);
  }
  // A save from before the Chronicle has met whoever it has played and beaten.
  for (const id of Object.keys(s.best)) s.seen[`hero:${id}`] ??= 0;
  for (const id of s.felled) s.seen[`foe:${id}`] ??= 1;
  // Whoever has been unlocked since is unlocked now, and only those unlocked go on a run, as many as there are slots.
  for (const h of HEROES) if (h.unlock && !s.open.includes(h.id) && featDone(s, h.unlock)) s.open.push(h.id);
  // A save from before the band was chosen has Biscuit along, as a new one has.
  s.band = Array.isArray(raw.band) ? names(raw.band, friends) : [START_FRIEND];
  unlockFriends(s);
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

/** Who goes on a run with a hero: the companions chosen, as many as there are slots. */
export function bandFor(save: SaveData, hero: string): string[] {
  return save.band.filter((id) => isFriend(save, id)).slice(0, bandSize(hero, slotsNow(save)));
}

/** How many companion slots are unlocked, by the best wave (hold.ts has it as `slotsOf`; it is here too so the save needs nothing of the Hold to say it). */
function slotsNow(save: SaveData): number {
  const best = bestWave(save);
  return Math.min(BAND.places, SLOT_WAVES.filter((w) => best >= w).length);
}

/**
 * Puts a companion in a place of the band, or takes whoever is there out
 * of it ('' for nobody). One who was in another place changes places.
 */
export function setBand(save: SaveData, place: number, id: string): boolean {
  if (place < 0 || place >= slotsNow(save) || (id !== '' && !isFriend(save, id))) return false;
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
  /** Crates their own quests have unlocked. */
  crates: string[];
  /** What the run paid its hero at its end, and how many levels of their mastery that came to. */
  tally: Tally | null;
  levels: number;
  /** The slots of the band unlocked by this run. */
  slots: number;
}

/**
 * Writes what a run has come to into the save: after every wave, and when
 * it ends. `kills` is what the last wave added. Returns who this opened.
 * A companion opened while the band has a place free goes straight into
 * it: the first of them is met by having it along.
 */
export function record(save: SaveData, run: RunData, kills: number): Opened {
  // Counted before the best is: the slots this run's waves unlock are said.
  const slotsWere = slotsNow(save);
  save.best[run.hero] = Math.max(save.best[run.hero] ?? 0, survived(run));
  save.kills += kills;
  save.coins = Math.max(save.coins, run.coins);
  for (const b of run.felled) if (!save.felled.includes(b)) save.felled.push(b);
  save.last = run.hero;
  if (run.phase === 'over') save.ended++;
  const opened: Opened = { heroes: [], friends: [], deeds: [], crates: [], tally: null, levels: 0, slots: 0 };
  for (const h of HEROES) {
    if (h.unlock && !save.open.includes(h.id) && featDone(save, h.unlock)) {
      save.open.push(h.id);
      opened.heroes.push(h.id);
    }
  }
  // The Hold takes what the run has to tell: the Codex, the quests, the companions unlocked, and at the end its hero's mastery.
  const told = chronicle(save, run);
  opened.friends = told.friends;
  opened.deeds = told.deeds;
  opened.crates = told.crates;
  opened.tally = told.tally;
  opened.levels = told.levels;
  opened.slots = slotsNow(save) - slotsWere;
  // A slot just unlocked is filled by whoever has waited longest, so that it is felt at once.
  if (opened.slots > 0) fillBand(save, waitingOf(save).slice(0, opened.slots));
  return opened;
}
