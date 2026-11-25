// The Hold: the rules of what a player keeps and grows between runs. Its
// lists and numbers are in holdData.ts and what is kept is in the save
// (state.ts). Everything here is plain functions on a save, so that the
// pace report can play a whole career without a screen.
//
// A run pays renown when it ends, whatever became of it. Renown buys a
// hero or a companion whose deed is not done yet, the second place in the
// band, crates for the armory and blessings. Winning the twentieth wave at
// a danger opens the next. The Chronicle remembers everything met.

import { BAND, COMPANIONS, ENEMIES, HEROES, ITEMS, LAST_WAVE, OMENS, RELICS, ROAD, TIERS, WEAPONS, byId, weaponOf, type Feat } from './data';
import {
  BLESSINGS, CRATES, CRATE_PRICES, DANGERS, DEEDS, HALL, KENNEL, PLACE_PRICE, RENOWN, thingKey,
  type BlessingId, type CrateDef, type DeedDef, type DeedTest, type Thing,
} from './holdData';
import { blessed, kindCounts, newRun, survived, type RunData, type Terms, type Told } from './run';
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
  danger: number;
  total: number;
}

/** True for a run that has come through the twentieth wave. */
export function hasWon(run: RunData): boolean {
  return survived(run) >= LAST_WAVE;
}

/**
 * What a run pays as it stands. The waves, the captains and the win are
 * paid more at a higher danger; a deed pays what it pays, once.
 */
export function tallyOf(run: RunData): Tally {
  const waves = survived(run);
  const lines: TallyLine[] = [];
  if (waves > 0) lines.push({ why: 'Waves come through', count: waves, renown: waves * RENOWN.wave });
  if (run.felled.length > 0) lines.push({ why: 'Captains beaten', count: run.felled.length, renown: run.felled.length * RENOWN.captain });
  if (hasWon(run)) lines.push({ why: 'The twentieth wave won', count: 1, renown: RENOWN.win });
  const base = lines.reduce((n, l) => n + l.renown, 0);
  const more = Math.round(base * RENOWN.danger * run.danger);
  if (more > 0) lines.push({ why: `Danger ${run.danger}`, count: run.danger, renown: more });
  for (const id of run.deeds) {
    const deed = DEEDS.find((d) => d.id === id);
    if (deed) lines.push({ why: deed.name, count: 1, renown: deed.renown });
  }
  return { lines, danger: run.danger, total: lines.reduce((n, l) => n + l.renown, 0) };
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
    page('hero', 'Heroes', 'runs', HEROES.map((h) => ({ id: h.id, name: h.name, says: `${h.epithet}. ${h.who}` }))),
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
      return hasWon(run) && (!test.hero || run.hero === test.hero) && run.danger >= (test.danger ?? 0);
    case 'wins':
      return Object.keys(save.won).length >= test.heroes;
    case 'alone':
      // A stray let out of a cage on the way is not a band that was brought.
      return hasWon(run) && run.band.every((b) => b.stray);
    case 'kinds':
      return Math.max(0, ...Object.values(kindCounts(run))) >= test.held;
    case 'relics':
      return run.relics.length >= test.held;
    case 'unstruck':
      return !!told && told.unstruck.length > 0;
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
  name: string;
  says: string;
  done: boolean;
  /** How far along, 0 to 1. */
  share: number;
  /** What it pays: renown, or who it opens. */
  renown: number;
  opens: string;
}

/**
 * Every deed there is, done or not: the ones that open a hero or a
 * companion first (the one opened is "???" until they are), then the ones
 * that pay renown. Those still to do come before those done.
 */
export function deedsOf(save: SaveData): DeedRow[] {
  const rows: DeedRow[] = [];
  for (const h of HEROES) {
    if (!h.unlock) continue;
    const done = isOpen(save, h.id);
    rows.push({ id: `hero-${h.id}`, name: done ? h.name : '???', says: featSays(h.unlock), done, share: done ? 1 : featShare(save, h.unlock), renown: 0, opens: done ? h.name : 'a hero' });
  }
  for (const c of COMPANIONS) {
    const done = isFriend(save, c.id);
    rows.push({ id: `friend-${c.id}`, name: done ? c.name : '???', says: featSays(c.unlock), done, share: done ? 1 : featShare(save, c.unlock), renown: 0, opens: done ? c.name : 'a companion' });
  }
  for (const d of DEEDS) {
    const done = save.deeds.includes(d.id);
    rows.push({ id: d.id, name: d.name, says: d.says, done, share: done ? 1 : deedShare(save, d.test), renown: d.renown, opens: '' });
  }
  return [...rows.filter((r) => !r.done), ...rows.filter((r) => r.done)];
}

/** The deed that pays renown and is nearest done: the next thing to go for. */
export function nextDeed(save: SaveData): DeedDef | null {
  let best: DeedDef | null = null;
  let share = -1;
  for (const d of DEEDS) {
    if (save.deeds.includes(d.id)) continue;
    const s = deedShare(save, d.test);
    if (s > share) {
      share = s;
      best = d;
    }
  }
  return best;
}

// ---------------------------------------------------------------- what a run tells the Hold

/**
 * Takes what a run has to tell, after every wave and at its end: who was
 * met and slain goes into the Chronicle, deeds done are marked, a win is
 * counted, and when the run is over its renown is paid, once. Returns the
 * deeds this call found done, and the tally if this call paid it.
 */
export function chronicle(save: SaveData, run: RunData): { deeds: string[]; tally: Tally | null } {
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
  // A win is counted when the twentieth wave is come through, though the run may go on.
  if (hasWon(run) && !run.won) {
    run.won = true;
    save.won[run.hero] = Math.max(save.won[run.hero] ?? 0, run.danger);
    save.dangers = Math.max(save.dangers, Math.min(DANGERS.length, run.danger + 1));
  }
  const deeds: string[] = [];
  for (const d of DEEDS) {
    if (save.deeds.includes(d.id) || !deedMet(save, run, told, d.test)) continue;
    save.deeds.push(d.id);
    run.deeds.push(d.id);
    deeds.push(d.id);
  }
  run.told = null;
  if (run.phase !== 'over' || run.paid) return { deeds, tally: null };
  // The run has ended: what it held is counted, and it is paid.
  run.paid = true;
  meet(save, 'hero', run.hero, 1);
  for (const b of run.band) meet(save, 'friend', b.id, 1);
  for (const id of new Set([byId(HEROES, run.hero).weapon, ...run.weapons.map((w) => w.id)])) meet(save, 'weapon', id, 1);
  for (const id of new Set(run.items)) meet(save, 'item', id, 1);
  for (const id of run.relics) meet(save, 'relic', id, 1);
  const tally = tallyOf(run);
  save.renown += tally.total;
  save.earned += tally.total;
  save.tally = tally;
  return { deeds, tally };
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

/** True if the armory offers a thing: it was there from the start, or its crate has been bought. */
export function inArmory(save: SaveData, t: Thing): boolean {
  if (!CRATED.has(thingKey(t))) return true;
  return CRATES.some((c) => save.crates.includes(c.id) && c.things.some((x) => x.kind === t.kind && x.id === t.id));
}

/** What a run that begins now is never offered: the things in the crates not bought. */
export function shutOf(save: SaveData): string[] {
  return CRATES.filter((c) => !save.crates.includes(c.id)).flatMap((c) => c.things.map(thingKey));
}

/** What the next crate costs, whichever it is, or null when all are bought. */
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

/** A crate's contents as they may be shown before it is bought: what has been met by name, the rest dark. */
export function crateThings(save: SaveData, crate: CrateDef): CrateThing[] {
  return crate.things.map((t) => {
    const known = met(save, t.kind, t.id);
    const name = t.kind === 'weapon' ? weaponOf(t.id).name : t.kind === 'item' ? byId(ITEMS, t.id).name : byId(RELICS, t.id).name;
    return { ...t, name: known ? name : '???', met: known };
  });
}

// ---------------------------------------------------------------- blessings

export function blessStep(save: SaveData, id: BlessingId): number {
  return save.bless[id] ?? 0;
}

/** What the next step of a blessing costs, or null when it has them all. */
export function blessPrice(save: SaveData, id: BlessingId): number | null {
  const def = BLESSINGS.find((b) => b.id === id);
  const step = blessStep(save, id);
  return !def || step >= def.prices.length ? null : def.prices[step];
}

export function buyBlessing(save: SaveData, id: BlessingId): boolean {
  const price = blessPrice(save, id);
  if (price === null || save.renown < price) return false;
  save.renown -= price;
  save.bless[id] = blessStep(save, id) + 1;
  return true;
}

/** What a blessing gives as it stands and what its next step would, each as a line. '' for none. */
export function blessSays(save: SaveData, id: BlessingId): { now: string; next: string } {
  const def = BLESSINGS.find((b) => b.id === id);
  if (!def) return { now: '', next: '' };
  const step = blessStep(save, id);
  return { now: step > 0 ? def.says(def.by[step - 1]) : '', next: step < def.by.length ? def.says(def.by[step]) : '' };
}

// ---------------------------------------------------------------- danger

/** Picks the danger the next run is played at: any that is open. */
export function setDanger(save: SaveData, n: number): boolean {
  if (!Number.isInteger(n) || n < 0 || n > save.dangers) return false;
  save.danger = n;
  return true;
}

/** The highest danger a hero has won at: their badge. -1 for a hero who has not won. */
export function badge(save: SaveData, hero: string): number {
  return save.won[hero] ?? -1;
}

// ---------------------------------------------------------------- a run begins

/** What the Hold gives a run that begins now. */
export function termsOf(save: SaveData): Terms {
  return { danger: Math.min(save.danger, save.dangers), shut: shutOf(save), bless: { ...save.bless } };
}

/** How many roads a run that begins now is offered at once. */
export function forksNow(save: SaveData): number {
  return ROAD.roads + blessStep(save, 'path');
}

/** A new run as the Hold sends it out: the band chosen, the roads, the danger, the armory as it is and the blessings. */
export function beginRun(save: SaveData, hero: string, seed: number): RunData {
  return newRun(hero, seed, bandFor(save, hero), forksNow(save), termsOf(save));
}

// ---------------------------------------------------------------- everything the Hold sells

export interface Ware {
  kind: 'place' | 'hero' | 'friend' | 'crate' | 'blessing';
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
  for (const b of BLESSINGS) add('blessing', b.id, b.name, blessPrice(save, b.id));
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
    case 'blessing':
      return buyBlessing(save, ware.id as BlessingId);
  }
}

/** True once there is nothing left for the Hold to sell: everyone is open and everything is bought. */
export function holdFull(save: SaveData): boolean {
  return waresOf(save).length === 0;
}

/** What a run begun now has from its blessings, for a line on the screen before it: '' for none. */
export function blessingsLine(run: RunData): string {
  return BLESSINGS.filter((b) => blessed(run, b.id) > 0).map((b) => b.name).join(', ');
}
