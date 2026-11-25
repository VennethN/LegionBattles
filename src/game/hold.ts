// The Hold: the rules of what a player keeps and grows between runs. Its
// lists and numbers are in holdData.ts and what is kept is in the save
// (state.ts). Everything here is plain functions on a save, so that the
// pace report can play a whole career without a screen.
//
// A run pays renown when it ends, whatever became of it. Renown buys a
// hero or a companion whose deed is not done yet, the second place in the
// band, crates for the armory, and places on the board: lasting upgrades
// that make every later run stronger. A win opens the vows: hard
// rules sworn before a run, in any mix, for more renown. Each hero has
// three oaths of their own, each crate a deed that opens it for nothing,
// and each day a road that is the same for everyone. The Chronicle
// remembers everything met.

import { BAND, COMPANIONS, ENEMIES, HEROES, ITEMS, LAST_WAVE, OMENS, RELICS, ROAD, TIERS, WEAPONS, byId, weaponOf, type Feat } from './data';
import {
  BOARD, CRATES, CRATE_PRICES, DEEDS, HALL, KENNEL, OATHS, PLACE_PRICE, RENOWN, VOW, VOWS, boonsFrom, giftSays, thingKey,
  type Boons, type CrateDef, type DeedTest, type NodeDef, type OathDef, type Thing, type VowId,
} from './holdData';
import { Rng } from './rng';
import { kindCounts, newRun, survived, type RunData, type Terms, type Told } from './run';
import { bandFor, featDone, featShare, isFriend, isOpen, type SaveData } from './state';

// ---------------------------------------------------------------- renown

export interface TallyLine {
  why: string;
  /** How many of them, where there is a count: waves, captains. */
  count: number;
  renown: number;
}

/** What a run paid, line by line, for the screen that shows it. */
export interface Tally {
  lines: TallyLine[];
  /** How many vows the run was sworn under. */
  vows: number;
  total: number;
}

/** True for a run that has come through the twentieth wave. */
export function hasWon(run: RunData): boolean {
  return survived(run) >= LAST_WAVE;
}

/**
 * What a run pays as it stands. The waves, the captains and the win are
 * paid more for each vow the run was sworn under; a deed pays what it pays, once.
 */
export function tallyOf(run: RunData): Tally {
  const waves = survived(run);
  const lines: TallyLine[] = [];
  if (waves > 0) lines.push({ why: 'Waves come through', count: waves, renown: waves * RENOWN.wave });
  if (run.felled.length > 0) lines.push({ why: 'Captains beaten', count: run.felled.length, renown: run.felled.length * RENOWN.captain });
  if (hasWon(run)) lines.push({ why: 'The twentieth wave won', count: 1, renown: RENOWN.win });
  const base = lines.reduce((n, l) => n + l.renown, 0);
  const more = Math.round(base * RENOWN.vow * run.vows.length);
  if (more > 0) lines.push({ why: run.vows.length === 1 ? 'A vow kept' : 'Vows kept', count: run.vows.length, renown: more });
  for (const id of run.deeds) {
    const deed = DEEDS.find((d) => d.id === id);
    if (deed) lines.push({ why: deed.name, count: 1, renown: deed.renown });
  }
  return { lines, vows: run.vows.length, total: lines.reduce((n, l) => n + l.renown, 0) };
}

// ---------------------------------------------------------------- the chronicle

export type MetKind = 'hero' | 'friend' | 'foe' | 'weapon' | 'item' | 'relic' | 'omen';

const key = (kind: MetKind, id: string): string => `${kind}:${id}`;

/** True if the player has met it: only then is it named anywhere. */
export function met(save: SaveData, kind: MetKind, id: string): boolean {
  return save.seen[key(kind, id)] !== undefined;
}

/** The count kept with a thing met (see `seen` in the save). */
export function count(save: SaveData, kind: MetKind, id: string): number {
  return save.seen[key(kind, id)] ?? 0;
}

function meet(save: SaveData, kind: MetKind, id: string, more = 0): void {
  const k = key(kind, id);
  save.seen[k] = (save.seen[k] ?? 0) + more;
}

export interface ChronicleEntry {
  kind: MetKind;
  id: string;
  /** Its name, or "???" for what has not been met. */
  name: string;
  /** What there is to tell of it, or '' for what has not been met. */
  says: string;
  met: boolean;
  count: number;
  /** What the count is of, for the line under it: "slain", "runs", "runs held", "times taken". */
  counted: string;
}

export interface ChroniclePage {
  kind: MetKind;
  title: string;
  /** How many of the page have been met. */
  met: number;
  entries: ChronicleEntry[];
}

/** The whole Chronicle: every hero, companion, enemy, weapon, ware, relic and road, met or not. */
export function chronicleOf(save: SaveData): ChroniclePage[] {
  const page = (kind: MetKind, title: string, counted: string, list: ReadonlyArray<{ id: string; name: string; says: string }>): ChroniclePage => {
    const entries = list.map((e): ChronicleEntry => {
      const known = met(save, kind, e.id);
      return { kind, id: e.id, name: known ? e.name : '???', says: known ? e.says : '', met: known, count: count(save, kind, e.id), counted };
    });
    return { kind, title, met: entries.filter((e) => e.met).length, entries };
  };
  return [
    page('hero', 'Heroes', 'runs', HEROES.map((h) => ({ id: h.id, name: h.name, says: `${h.epithet[0].toUpperCase()}${h.epithet.slice(1)}. ${h.who}` }))),
    page('friend', 'Companions', 'runs', COMPANIONS.map((c) => ({ id: c.id, name: c.name, says: `${c.kind[0].toUpperCase()}${c.kind.slice(1)}. ${c.says}` }))),
    page('foe', 'Enemies', 'slain', ENEMIES.filter((e) => !e.prop).map((e) => ({ id: e.id, name: e.name, says: e.ai === 'boss' ? 'A captain.' : FOE_SAYS[e.ai] ?? '' }))),
    page('weapon', 'Weapons', 'runs held', [...HEROES.map((h) => weaponOf(h.weapon)), ...WEAPONS].map((w) => ({ id: w.id, name: w.name, says: w.own ? 'A hero\'s own.' : w.kinds.join(' and ') }))),
    page('item', 'Wares', 'runs held', ITEMS.map((it) => ({ id: it.id, name: it.name, says: '' }))),
    page('relic', 'Relics', 'runs held', RELICS.map((r) => ({ id: r.id, name: r.name, says: r.says }))),
    page('omen', 'Roads', 'times taken', OMENS.map((o) => ({ id: o.id, name: o.name, says: `${o.says} ${o.prize}.` }))),
  ];
}

/** How each way of fighting is told in the Chronicle. */
const FOE_SAYS: Record<string, string> = {
  walk: 'Walks at the hero.',
  shoot: 'Keeps off and shoots.',
  charge: 'Turns and runs the hero down.',
  bomb: 'Runs in and bursts.',
  summon: 'Calls others up.',
  boost: 'Drums the rest on.',
  still: 'Stands where it is.',
};

// ---------------------------------------------------------------- deeds

/** True if a deed's test is met by the save and the run as they stand. `told` is what the last waves told. */
function deedMet(save: SaveData, run: RunData, told: Told | null, test: DeedTest): boolean {
  switch (test.kind) {
    case 'wave':
    case 'boss':
    case 'coins':
    case 'kills':
    case 'runs':
      return featDone(save, test);
    case 'win':
      return hasWon(run) && run.vows.length >= (test.vows ?? 0);
    case 'wins':
      return Object.keys(save.won).length >= test.heroes;
    case 'alone':
      // A stray let out of a cage on the way is not a band that was brought.
      return hasWon(run) && run.band.every((b) => b.stray);
    case 'kinds': {
      const counts = kindCounts(run) as Record<string, number>;
      return (test.of ? (counts[test.of] ?? 0) : Math.max(0, ...Object.values(counts))) >= test.held;
    }
    case 'relics':
      return run.relics.length >= test.held;
    case 'unstruck':
      return !!told && told.unstruck.length > 0;
    case 'clean':
      return run.clean >= test.waves;
    case 'slain':
      return run.kills >= test.kills;
    case 'risen':
      return run.rose >= 0 && survived(run) >= test.wave;
    case 'level':
      return run.level >= test.level;
    case 'bond':
      return run.band.some((b) => b.bond >= BAND.bonds);
    case 'purse':
      return run.gold >= test.gold;
    case 'tier':
      return run.weapons.some((w) => w.tier >= TIERS - 1);
    case 'roads':
      return OMENS.every((o) => count(save, 'omen', o.id) > 0);
  }
}

/** How far along a deed is, 0 to 1, where that can be said from the save alone. */
function deedShare(save: SaveData, test: DeedTest): number {
  switch (test.kind) {
    case 'wave':
    case 'boss':
    case 'coins':
    case 'kills':
    case 'runs':
      return featShare(save, test);
    case 'wins':
      return Math.min(1, Object.keys(save.won).length / test.heroes);
    case 'roads':
      return OMENS.filter((o) => count(save, 'omen', o.id) > 0).length / OMENS.length;
    default:
      return 0;
  }
}

/** What opens a hero or a companion, as a line a player reads. A captain is not named: it may not have been met. */
export function featSays(feat: Feat): string {
  switch (feat.kind) {
    case 'wave':
      return `Come through wave ${feat.wave}.`;
    case 'boss':
      return feat.boss === 'warlord' ? 'Beat the captain of wave 7.' : feat.boss === 'colossus' ? 'Beat the captain of wave 14.' : 'Beat the captain of wave 20.';
    case 'coins':
      return `Gather ${feat.coins} coins in one run.`;
    case 'kills':
      return `Fell ${feat.kills} enemies in all.`;
    case 'runs':
      return feat.runs === 1 ? 'Finish a run.' : `Finish ${feat.runs} runs.`;
  }
}

export interface DeedRow {
  id: string;
  /** What kind of deed it is: one that opens somebody, one that pays renown, a hero's oath, or a crate's own deed. */
  kind: 'opens' | 'renown' | 'oath' | 'crate';
  name: string;
  says: string;
  done: boolean;
  /** How far along, 0 to 1. */
  share: number;
  /** What it pays: renown, or what it opens, as words. */
  renown: number;
  opens: string;
  /** The hero whose oath it is, or ''. */
  hero: string;
}

/** What an oath opens, as words. */
export function oathGift(o: OathDef): string {
  if (o.opens.kind === 'epithet') return `a new name: ${o.opens.epithet}`;
  if (o.opens.kind === 'relic') return `${byId(RELICS, o.opens.relic).name} to begin every run with`;
  return 'a second rule for their own weapon';
}

/**
 * Every deed there is, done or not: the ones that open a hero or a
 * companion (the one opened is "???" until they are), the crates' own, the
 * ones that pay renown, and the oaths of every hero who is open. Those
 * still to do come before those done.
 */
export function deedsOf(save: SaveData): DeedRow[] {
  const rows: DeedRow[] = [];
  for (const h of HEROES) {
    if (!h.unlock) continue;
    const done = isOpen(save, h.id);
    rows.push({ id: `hero-${h.id}`, kind: 'opens', name: done ? h.name : '???', says: featSays(h.unlock), done, share: done ? 1 : featShare(save, h.unlock), renown: 0, opens: done ? h.name : 'a hero', hero: '' });
  }
  for (const c of COMPANIONS) {
    const done = isFriend(save, c.id);
    rows.push({ id: `friend-${c.id}`, kind: 'opens', name: done ? c.name : '???', says: featSays(c.unlock), done, share: done ? 1 : featShare(save, c.unlock), renown: 0, opens: done ? c.name : 'a companion', hero: '' });
  }
  for (const c of CRATES) {
    const done = save.crates.includes(c.id);
    rows.push({ id: `crate-${c.id}`, kind: 'crate', name: c.name, says: c.deedSays, done, share: done ? 1 : deedShare(save, c.deed), renown: 0, opens: 'the crate', hero: '' });
  }
  for (const d of DEEDS) {
    const done = save.deeds.includes(d.id);
    rows.push({ id: d.id, kind: 'renown', name: d.name, says: d.says, done, share: done ? 1 : deedShare(save, d.test), renown: d.renown, opens: '', hero: '' });
  }
  for (const o of OATHS) {
    if (!isOpen(save, o.hero)) continue;
    const done = save.oaths.includes(o.id);
    rows.push({ id: o.id, kind: 'oath', name: o.name, says: o.says, done, share: done ? 1 : 0, renown: 0, opens: oathGift(o), hero: o.hero });
  }
  return [...rows.filter((r) => !r.done), ...rows.filter((r) => r.done)];
}

/**
 * The nearest deeds not yet done, for the end of a run: "what next". The
 * ones furthest along come first; after them the oaths of the hero who was
 * just played, which cannot be measured until they are done.
 */
export function nextDeeds(save: SaveData, hero = '', n = 3): DeedRow[] {
  const open = deedsOf(save).filter((r) => !r.done);
  const far = open.filter((r) => r.share > 0).sort((a, b) => b.share - a.share);
  const own = open.filter((r) => r.share === 0 && r.hero === hero && hero !== '');
  const rest = open.filter((r) => r.share === 0 && r.kind === 'renown');
  return [...far, ...own, ...rest].slice(0, Math.max(0, n));
}

// ---------------------------------------------------------------- oaths

/** A hero's three oaths, each with whether it is done. */
export function oathsOf(save: SaveData, hero: string): Array<{ oath: OathDef; done: boolean }> {
  return OATHS.filter((o) => o.hero === hero).map((oath) => ({ oath, done: save.oaths.includes(oath.id) }));
}

/** What a hero is called besides their name: the epithet their oath opened, once it has, or the one they began with. */
export function epithetOf(save: SaveData, hero: string): string {
  const o = OATHS.find((x) => x.hero === hero && x.opens.kind === 'epithet' && save.oaths.includes(x.id));
  return o && o.opens.kind === 'epithet' ? o.opens.epithet : byId(HEROES, hero).epithet;
}

/** The relic a hero's runs begin with, once their oath has opened it, or ''. */
export function startRelic(save: SaveData, hero: string): string {
  const o = OATHS.find((x) => x.hero === hero && x.opens.kind === 'relic' && save.oaths.includes(x.id));
  return o && o.opens.kind === 'relic' ? o.opens.relic : '';
}

/** True if a hero's oath has opened the second rule for their own weapon. */
export function altOpen(save: SaveData, hero: string): boolean {
  return OATHS.some((x) => x.hero === hero && x.opens.kind === 'rule' && save.oaths.includes(x.id));
}

/** Chooses which rule a hero's own weapon follows: the second, or the first again. */
export function setAlt(save: SaveData, hero: string, on: boolean): boolean {
  if (!altOpen(save, hero)) return false;
  save.alt = on ? [...new Set([...save.alt, hero])] : save.alt.filter((id) => id !== hero);
  return true;
}

// ---------------------------------------------------------------- vows

/** How many vows a win has ever been sworn under at most, or -1 if nothing has been won. */
function mostVows(save: SaveData): number {
  return Math.max(-1, ...Object.values(save.won).map((v) => v.length));
}

/** The vows that may be sworn: none until a run is won, then the first few, and more for each vow a win was sworn under. */
export function vowsOpen(save: SaveData): VowId[] {
  const most = mostVows(save);
  return most < 0 ? [] : VOWS.slice(0, VOW.first + VOW.more * most).map((v) => v.id);
}

/** What opens the next vows, as a line, or '' when all are open. */
export function vowsNext(save: SaveData): string {
  const most = mostVows(save);
  if (most < 0) return 'Win the twentieth wave.';
  if (VOW.first + VOW.more * most >= VOWS.length) return '';
  return most === 0 ? 'Win a run under a vow.' : `Win a run under ${most + 1} vows.`;
}

/** Swears a vow for the next run, or takes it back. */
export function toggleVow(save: SaveData, id: string): boolean {
  if (!vowsOpen(save).includes(id as VowId)) return false;
  save.vows = save.vows.includes(id) ? save.vows.filter((v) => v !== id) : VOWS.filter((v) => v.id === id || save.vows.includes(v.id)).map((v) => v.id);
  return true;
}

/** The vows a hero's best win was sworn under: their badge. None for a plain win; null for a hero who has not won. */
export function badge(save: SaveData, hero: string): string[] | null {
  return save.won[hero] ?? null;
}

// ---------------------------------------------------------------- the day's road

export interface Daily {
  date: string;
  hero: string;
  band: string[];
  seed: number;
}

/**
 * The day's road: one hero, one companion and one seed for a day, the same
 * for everyone, worked out from the date by the rules' own dice. Every
 * hero may come up, opened or not: it is a way to meet them.
 */
export function dailyOf(date: string): Daily {
  // The date as a number to seed the dice with: any day gives another.
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) h = Math.imul(h ^ date.charCodeAt(i), 16777619) >>> 0;
  const rng = new Rng(h || 1);
  const hero = rng.pick(HEROES).id;
  const band = [rng.pick(COMPANIONS).id];
  return { date, hero, band, seed: rng.int(0x7ffffffe) + 1 };
}

/** True if the day's road has been taken already: it is one try a day. */
export function dailyTaken(save: SaveData, date: string): boolean {
  return save.daily?.date === date;
}

/**
 * Sets out on the day's road. It is the same run for everyone: the whole
 * armory, two roads, nothing from the board, no vow, nothing an oath has opened.
 */
export function beginDaily(save: SaveData, date: string): RunData | null {
  if (dailyTaken(save, date)) return null;
  const d = dailyOf(date);
  save.daily = { date, wave: 0, seconds: 0 };
  return newRun(d.hero, d.seed, d.band, ROAD.roads, { daily: date });
}

// ---------------------------------------------------------------- what a run tells the Hold

export interface Chronicled {
  deeds: string[];
  oaths: string[];
  crates: string[];
  tally: Tally | null;
}

/**
 * Takes what a run has to tell, after every wave and at its end: who was
 * met and slain goes into the Chronicle, deeds and oaths done are marked,
 * a crate whose deed is done is opened, a win is counted, the day's road
 * is written down, and when the run is over its renown is paid, once.
 */
export function chronicle(save: SaveData, run: RunData): Chronicled {
  const told = run.told;
  if (told) {
    for (const id of told.met) meet(save, 'foe', id);
    for (const [id, n] of Object.entries(told.slain)) meet(save, 'foe', id, n);
    for (const id of told.roads) meet(save, 'omen', id, 1);
  }
  // Whoever is on the run and whatever it holds or has been shown is met.
  meet(save, 'hero', run.hero);
  meet(save, 'weapon', byId(HEROES, run.hero).weapon);
  for (const b of run.band) meet(save, 'friend', b.id);
  for (const w of run.weapons) meet(save, 'weapon', w.id);
  for (const id of run.items) meet(save, 'item', id);
  for (const id of [...run.relics, ...run.relicChoices]) meet(save, 'relic', id);
  for (const o of run.offers) meet(save, o.kind, o.id);
  for (const r of [run.road, ...run.roads]) meet(save, 'omen', r.omen);
  // A win is counted when the twentieth wave is come through, though the run may go on. The badge is the win under the most vows.
  if (hasWon(run) && !run.won) {
    run.won = true;
    const best = save.won[run.hero];
    if (!best || run.vows.length > best.length) save.won[run.hero] = [...run.vows];
  }
  const out: Chronicled = { deeds: [], oaths: [], crates: [], tally: null };
  for (const d of DEEDS) {
    if (save.deeds.includes(d.id) || !deedMet(save, run, told, d.test)) continue;
    save.deeds.push(d.id);
    run.deeds.push(d.id);
    out.deeds.push(d.id);
  }
  for (const o of OATHS) {
    if (o.hero !== run.hero || save.oaths.includes(o.id) || !deedMet(save, run, told, o.test)) continue;
    save.oaths.push(o.id);
    out.oaths.push(o.id);
  }
  for (const c of CRATES) {
    if (save.crates.includes(c.id) || !deedMet(save, run, told, c.deed)) continue;
    save.crates.push(c.id);
    out.crates.push(c.id);
  }
  // The day's road is written down as it goes, so that a day's try that is shut half way still counts for what it came to.
  if (run.daily && save.daily?.date === run.daily) {
    save.daily.wave = Math.max(save.daily.wave, survived(run));
    save.daily.seconds = Math.round(run.time);
    save.dailyBest = Math.max(save.dailyBest, save.daily.wave);
  }
  run.told = null;
  if (run.phase !== 'over' || run.paid) return out;
  // The run has ended: what it held is counted, and it is paid.
  run.paid = true;
  meet(save, 'hero', run.hero, 1);
  for (const b of run.band) meet(save, 'friend', b.id, 1);
  for (const id of new Set([byId(HEROES, run.hero).weapon, ...run.weapons.map((w) => w.id)])) meet(save, 'weapon', id, 1);
  for (const id of new Set(run.items)) meet(save, 'item', id, 1);
  for (const id of new Set(run.relics)) meet(save, 'relic', id, 1);
  const tally = tallyOf(run);
  save.renown += tally.total;
  save.earned += tally.total;
  save.tally = tally;
  out.tally = tally;
  return out;
}

// ---------------------------------------------------------------- the hall, the kennels and the band

/** What a hero costs, or null for one who cannot be bought: they are open, or were never for sale. */
export function heroPrice(save: SaveData, id: string): number | null {
  return isOpen(save, id) || HALL[id] === undefined ? null : HALL[id];
}

export function buyHero(save: SaveData, id: string): boolean {
  const price = heroPrice(save, id);
  if (price === null || save.renown < price) return false;
  save.renown -= price;
  save.open.push(id);
  return true;
}

export function friendPrice(save: SaveData, id: string): number | null {
  return isFriend(save, id) || KENNEL[id] === undefined ? null : KENNEL[id];
}

/** Buys a companion. One bought while the band has a place free goes straight into it, as one opened by a deed does. */
export function buyFriend(save: SaveData, id: string): boolean {
  const price = friendPrice(save, id);
  if (price === null || save.renown < price) return false;
  save.renown -= price;
  save.friends.push(id);
  if (save.band.length < save.places) save.band.push(id);
  return true;
}

/** What the next place in the band costs, or null when there are no more to open. */
export function placePrice(save: SaveData): number | null {
  return save.places >= BAND.places ? null : PLACE_PRICE;
}

export function buyPlace(save: SaveData): boolean {
  const price = placePrice(save);
  if (price === null || save.renown < price) return false;
  save.renown -= price;
  save.places++;
  // Whoever is open and waiting takes the new place.
  const next = save.friends.find((id) => !save.band.includes(id));
  if (next && save.band.length < save.places) save.band.push(next);
  return true;
}

// ---------------------------------------------------------------- the armory

/** Everything a crate holds, for the list of what is shut. */
const CRATED: ReadonlySet<string> = new Set(CRATES.flatMap((c) => c.things.map(thingKey)));

/** True if the armory offers a thing: it was there from the start, or its crate is open. */
export function inArmory(save: SaveData, t: Thing): boolean {
  if (!CRATED.has(thingKey(t))) return true;
  return CRATES.some((c) => save.crates.includes(c.id) && c.things.some((x) => x.kind === t.kind && x.id === t.id));
}

/** What a run that begins now is never offered: the things in the crates not open. */
export function shutOf(save: SaveData): string[] {
  return CRATES.filter((c) => !save.crates.includes(c.id)).flatMap((c) => c.things.map(thingKey));
}

/** The weapons a run that begins now may be offered, by name. */
export function poolOf(save: SaveData): string[] {
  return WEAPONS.filter((w) => inArmory(save, { kind: 'weapon', id: w.id })).map((w) => w.id);
}

/** What the next crate costs, whichever it is, or null when all are open. It rises with every crate opened, by renown or by its deed. */
export function cratePrice(save: SaveData): number | null {
  return save.crates.length >= CRATES.length ? null : CRATE_PRICES[Math.min(save.crates.length, CRATE_PRICES.length - 1)];
}

export function buyCrate(save: SaveData, id: string): boolean {
  const price = cratePrice(save);
  if (price === null || save.crates.includes(id) || !CRATES.some((c) => c.id === id) || save.renown < price) return false;
  save.renown -= price;
  save.crates.push(id);
  return true;
}

export interface CrateThing extends Thing {
  /** Its name, or "???" for a thing the player has never seen. */
  name: string;
  met: boolean;
}

/** A crate's contents as they may be shown before it is opened: what has been met by name, the rest dark. */
export function crateThings(save: SaveData, crate: CrateDef): CrateThing[] {
  return crate.things.map((t) => {
    const known = met(save, t.kind, t.id);
    const name = t.kind === 'weapon' ? weaponOf(t.id).name : t.kind === 'item' ? byId(ITEMS, t.id).name : byId(RELICS, t.id).name;
    return { ...t, name: known ? name : '???', met: known };
  });
}

// ---------------------------------------------------------------- the board

export interface NodeRow {
  node: NodeDef;
  /** What it gives, in words. */
  says: string;
  owned: boolean;
  /** True if the place before it is owned, or it is the foot of a branch: it may be bought, renown allowing. */
  open: boolean;
  /** True if it may be bought now: open, not owned, and renown enough. */
  can: boolean;
}

/** True if a place on the board is owned. */
export function owns(save: SaveData, id: string): boolean {
  return save.board.includes(id);
}

/** True if a place may be bought now: it is there, not owned, the place before it is, and there is renown enough. */
export function canBuyNode(save: SaveData, id: string): boolean {
  const n = BOARD.find((x) => x.id === id);
  return !!n && !owns(save, id) && (!n.needs || owns(save, n.needs)) && save.renown >= n.price;
}

export function buyNode(save: SaveData, id: string): boolean {
  if (!canBuyNode(save, id)) return false;
  save.renown -= BOARD.find((x) => x.id === id)?.price ?? 0;
  save.board.push(id);
  return true;
}

/** The whole board as a screen draws it: every place with where it stands, what it gives, what it costs and how it stands with the player. */
export function boardOf(save: SaveData): NodeRow[] {
  return BOARD.map((node) => {
    const owned = owns(save, node.id);
    const open = !node.needs || owns(save, node.needs);
    return { node, says: giftSays(node.gift), owned, open, can: !owned && open && save.renown >= node.price };
  });
}

/** What the board has given so far, added up: what a run begins with. */
export function boonsOf(save: SaveData): Boons {
  return boonsFrom(save.board);
}

/** Takes the whole board back for what was paid, to be spent again another way. It costs nothing. Returns the renown given back. */
export function refundBoard(save: SaveData): number {
  const back = BOARD.filter((n) => owns(save, n.id)).reduce((sum, n) => sum + n.price, 0);
  save.renown += back;
  save.board = [];
  return back;
}

// ---------------------------------------------------------------- a run begins

/** What the Hold gives a run that a hero begins now. */
export function termsOf(save: SaveData, hero = ''): Terms {
  const open = vowsOpen(save);
  return {
    vows: save.vows.filter((v) => open.includes(v as VowId)), shut: shutOf(save), pool: poolOf(save), boons: boonsOf(save),
    relic: hero ? startRelic(save, hero) : '', alt: hero !== '' && save.alt.includes(hero) && altOpen(save, hero),
  };
}

/** How many roads a run that begins now is offered at once. */
export function forksNow(save: SaveData): number {
  return ROAD.roads + boonsOf(save).road;
}

/** A new run as the Hold sends it out: the band chosen, the roads, the vows sworn, the armory as it is, what the board gives and what the hero's oaths have opened. */
export function beginRun(save: SaveData, hero: string, seed: number): RunData {
  return newRun(hero, seed, bandFor(save, hero), forksNow(save), termsOf(save, hero));
}

// ---------------------------------------------------------------- everything the Hold sells

export interface Ware {
  kind: 'place' | 'hero' | 'friend' | 'crate' | 'node';
  id: string;
  name: string;
  price: number;
  /** True if there is renown enough. */
  can: boolean;
}

/** Everything the Hold sells now, with its price: for the screen, and for a player that buys the cheapest. */
export function waresOf(save: SaveData): Ware[] {
  const out: Ware[] = [];
  const add = (kind: Ware['kind'], id: string, name: string, price: number | null): void => {
    if (price !== null) out.push({ kind, id, name, price, can: save.renown >= price });
  };
  add('place', 'place', 'A second place in the band', placePrice(save));
  for (const h of HEROES) add('hero', h.id, h.name, heroPrice(save, h.id));
  for (const c of COMPANIONS) add('friend', c.id, c.name, friendPrice(save, c.id));
  const crate = cratePrice(save);
  for (const c of CRATES) if (!save.crates.includes(c.id)) add('crate', c.id, c.name, crate);
  // Of the board, the places that are open to be bought now: the rest wait for the one before them.
  for (const n of BOARD) if (!owns(save, n.id) && (!n.needs || owns(save, n.needs))) add('node', n.id, n.name, n.price);
  return out;
}

/** Buys one of the Hold's wares, whatever it is. */
export function buyWare(save: SaveData, ware: Pick<Ware, 'kind' | 'id'>): boolean {
  switch (ware.kind) {
    case 'place':
      return buyPlace(save);
    case 'hero':
      return buyHero(save, ware.id);
    case 'friend':
      return buyFriend(save, ware.id);
    case 'crate':
      return buyCrate(save, ware.id);
    case 'node':
      return buyNode(save, ware.id);
  }
}

/** True once there is nothing left for the Hold to sell: everyone is open and everything is bought. */
export function holdFull(save: SaveData): boolean {
  return waresOf(save).length === 0;
}

/** True once every place on the board is owned. */
export function boardFull(save: SaveData): boolean {
  return BOARD.every((n) => owns(save, n.id));
}
