// Between hunts: what the player has (coin, trophies, what is opened and
// bought), the board of contracts, the muster within its supply, and what
// a hunt pays. Pure, like the hunt itself: the screens ask here what
// something costs and whether it can be done, and never work it out.

import { BUILDINGS, HUNTERS, MONSTERS, REINFORCEMENTS, TO_COME, byId, type Mark, type MonsterDef } from './content';
import type { Setup, Tally } from './hunt';

/** What goes on a hunt: who, what the horn calls, and how many of each building. */
export interface Muster {
  hunter: string;
  reinforcements: string[];
  buildings: Record<string, number>;
}

export interface SaveData {
  v: 1;
  coin: number;
  /** Steps of supply bought. */
  supply: number;
  /** The highest mark each monster has fallen at. */
  felled: Record<string, number>;
  trophies: string[];
  /** The trophy each hunter wears, by the hunter's name. */
  worn: Record<string, string>;
  /** What has been bought for the things that are brought: `more:pikemen` is a second call, `sturdy:barricade` a sturdier one. */
  steps: string[];
  muster: Muster;
  hunts: number;
  wins: number;
  sound: boolean;
  music: boolean;
  /** What the player has been shown once and need not be shown again. */
  told: string[];
}

/** The supply a new lodge has, and what each step more costs. */
export const SUPPLY = { base: 6, steps: [40, 80, 140, 220] as readonly number[] };
/** What a second call of a reinforcement costs, and a sturdier building. */
export const STEP_COST = { more: 60, sturdy: 45 };
/** The most kinds of reinforcement on one hunt, and the most of one building. */
export const MOST = { reinforcements: 2, ofOne: 3 };
/** What a lost hunt pays for each part of the monster got through: nobody goes home with nothing. */
export const CONSOLATION = 6;

/** What a new player goes out with: enough to see what each kind of thing is for. */
export const FIRST_MUSTER: Muster = { hunter: 'marta', reinforcements: ['pikemen'], buildings: { barricade: 1, watchfire: 1 } };

export function freshSave(): SaveData {
  return {
    v: 1, coin: 0, supply: 0, felled: {}, trophies: [], worn: {}, steps: [],
    muster: { hunter: FIRST_MUSTER.hunter, reinforcements: [...FIRST_MUSTER.reinforcements], buildings: { ...FIRST_MUSTER.buildings } },
    hunts: 0, wins: 0, sound: true, music: true, told: [],
  };
}

/** A save as it was read, made whole: what is missing or of the wrong kind is as a new one has it. */
export function repair(raw: unknown): SaveData {
  const s = freshSave();
  if (!raw || typeof raw !== 'object') return s;
  const r = raw as Partial<SaveData>;
  if (typeof r.coin === 'number' && r.coin >= 0) s.coin = Math.floor(r.coin);
  if (typeof r.supply === 'number') s.supply = Math.max(0, Math.min(SUPPLY.steps.length, Math.floor(r.supply)));
  if (r.felled && typeof r.felled === 'object') {
    for (const m of MONSTERS) {
      const n = (r.felled as Record<string, unknown>)[m.id];
      if (typeof n === 'number' && n >= 1) s.felled[m.id] = Math.min(3, Math.floor(n));
    }
  }
  const names = new Set(MONSTERS.map((m) => m.trophy.id));
  if (Array.isArray(r.trophies)) s.trophies = [...new Set(r.trophies.filter((t): t is string => typeof t === 'string' && names.has(t)))];
  if (r.worn && typeof r.worn === 'object') {
    for (const h of HUNTERS) {
      const t = (r.worn as Record<string, unknown>)[h.id];
      if (typeof t === 'string' && s.trophies.includes(t)) s.worn[h.id] = t;
    }
  }
  if (Array.isArray(r.steps)) s.steps = [...new Set(r.steps.filter((t): t is string => typeof t === 'string' && stepKnown(t)))];
  if (typeof r.hunts === 'number') s.hunts = Math.max(0, Math.floor(r.hunts));
  if (typeof r.wins === 'number') s.wins = Math.max(0, Math.floor(r.wins));
  if (typeof r.sound === 'boolean') s.sound = r.sound;
  if (typeof r.music === 'boolean') s.music = r.music;
  if (Array.isArray(r.told)) s.told = r.told.filter((t): t is string => typeof t === 'string');
  const m = r.muster;
  if (m && typeof m === 'object') {
    if (typeof m.hunter === 'string' && HUNTERS.some((h) => h.id === m.hunter) && isOpen(s, m.hunter)) s.muster.hunter = m.hunter;
    if (Array.isArray(m.reinforcements)) s.muster.reinforcements = m.reinforcements.filter((id): id is string => REINFORCEMENTS.some((x) => x.id === id) && isOpen(s, id)).slice(0, MOST.reinforcements);
    if (m.buildings && typeof m.buildings === 'object') {
      s.muster.buildings = {};
      for (const b of BUILDINGS) {
        const n = (m.buildings as Record<string, unknown>)[b.id];
        if (typeof n === 'number' && n >= 1 && isOpen(s, b.id)) s.muster.buildings[b.id] = Math.min(MOST.ofOne, Math.floor(n));
      }
    }
    // A muster that no longer fits its supply is cut back to one that does.
    if (costOf(s.muster) > supplyOf(s)) s.muster = { hunter: s.muster.hunter, reinforcements: [...FIRST_MUSTER.reinforcements], buildings: { ...FIRST_MUSTER.buildings } };
  }
  return s;
}

function stepKnown(step: string): boolean {
  const [kind, id] = step.split(':');
  return (kind === 'more' && REINFORCEMENTS.some((r) => r.id === id)) || (kind === 'sturdy' && BUILDINGS.some((b) => b.id === id));
}

// ------------------------------------------------------------ what is opened

type Thing = { id: string; opens: string | null };
const THINGS: readonly Thing[] = [...HUNTERS, ...REINFORCEMENTS, ...BUILDINGS];

/** True if a hunter, a reinforcement or a building can be taken: it needs no trophy, or its trophy is held. */
export function isOpen(save: SaveData, id: string): boolean {
  const t = byId(THINGS, id);
  return t.opens === null || save.trophies.includes(t.opens);
}

/** What opens a thing, said for the player: the monster whose trophy it is. */
export function opensBy(id: string): string {
  const t = byId(THINGS, id);
  const m = MONSTERS.find((x) => x.trophy.id === t.opens);
  return m ? `Beat ${m.name}` : '';
}

/** What a trophy opens, by name. */
export function opensWith(trophy: string): string[] {
  return THINGS.filter((t) => t.opens === trophy).map((t) => (t as { name?: string }).name ?? t.id);
}

// ------------------------------------------------------------ the board

export interface Contract {
  /** The monster, or nothing for one that is still only a shape on the board. */
  monster: MonsterDef | null;
  id: string;
  /** True once its bill is posted and it can be hunted. */
  posted: boolean;
  /** What must fall first, said for the player, where it is not posted. */
  needs: string;
  /** The highest mark it has fallen at. */
  felled: number;
  /** The highest mark that can be hunted now: one more than it has fallen at, up to three. */
  upTo: number;
}

export function contracts(save: SaveData): Contract[] {
  const needs = (after: string | null): string => (after ? `Beat ${byId(MONSTERS, after).name}` : '');
  const list: Contract[] = MONSTERS.map((m) => {
    const posted = m.after === null || (save.felled[m.after] ?? 0) >= 1;
    const felled = save.felled[m.id] ?? 0;
    return { monster: m, id: m.id, posted, needs: posted ? '' : needs(m.after), felled, upTo: posted ? Math.min(3, felled + 1) : 0 };
  });
  for (const t of TO_COME) list.push({ monster: null, id: t.id, posted: false, needs: needs(t.after), felled: 0, upTo: 0 });
  return list;
}

/** True if a monster can be hunted at a mark now. */
export function canHunt(save: SaveData, monster: string, mark: number): boolean {
  const c = contracts(save).find((x) => x.id === monster);
  return !!c && c.posted && mark >= 1 && mark <= c.upTo;
}

/** The first contract the player has not yet won: what the board holds out to them. */
export function nextContract(save: SaveData): { monster: string; mark: Mark } {
  for (const c of contracts(save)) if (c.posted && c.felled < 1) return { monster: c.id, mark: 1 };
  for (const c of contracts(save)) if (c.posted && c.felled < 3) return { monster: c.id, mark: (c.felled + 1) as Mark };
  return { monster: MONSTERS[0].id, mark: 3 };
}

// ------------------------------------------------------------ the muster

export function supplyOf(save: SaveData): number {
  return SUPPLY.base + save.supply;
}

export function costOf(m: Muster): number {
  let cost = 0;
  for (const id of m.reinforcements) cost += byId(REINFORCEMENTS, id).cost;
  for (const b of BUILDINGS) cost += (m.buildings[b.id] ?? 0) * b.cost;
  return cost;
}

/** Takes a reinforcement onto the muster or off it. Says why not, or nothing if it was done. */
export function toggleReinforcement(save: SaveData, id: string): string {
  const m = save.muster;
  if (m.reinforcements.includes(id)) {
    m.reinforcements = m.reinforcements.filter((x) => x !== id);
    return '';
  }
  if (!isOpen(save, id)) return `Locked: ${opensBy(id)}`;
  if (m.reinforcements.length >= MOST.reinforcements) return `No more than ${MOST.reinforcements} kinds`;
  if (costOf(m) + byId(REINFORCEMENTS, id).cost > supplyOf(save)) return 'Not enough Supply';
  m.reinforcements.push(id);
  return '';
}

/** One more or one fewer of a building on the muster. Says why not, or nothing if it was done. */
export function changeBuilding(save: SaveData, id: string, by: 1 | -1): string {
  const m = save.muster;
  const now = m.buildings[id] ?? 0;
  if (by < 0) {
    if (now <= 0) return 'None to take off';
    if (now === 1) delete m.buildings[id];
    else m.buildings[id] = now - 1;
    return '';
  }
  if (!isOpen(save, id)) return `Locked: ${opensBy(id)}`;
  if (now >= MOST.ofOne) return `No more than ${MOST.ofOne} of one`;
  if (costOf(m) + byId(BUILDINGS, id).cost > supplyOf(save)) return 'Not enough Supply';
  m.buildings[id] = now + 1;
  return '';
}

export function setHunter(save: SaveData, id: string): string {
  if (!isOpen(save, id)) return `Locked: ${opensBy(id)}`;
  save.muster.hunter = id;
  return '';
}

/** Puts a trophy on the hunter of the muster, or takes theirs off. */
export function wear(save: SaveData, trophy: string | null): void {
  const h = save.muster.hunter;
  if (trophy === null || save.worn[h] === trophy) delete save.worn[h];
  else if (save.trophies.includes(trophy)) save.worn[h] = trophy;
}

/** How many times a reinforcement can be called, with what has been bought for it. */
export function chargesOf(save: SaveData, id: string): number {
  return byId(REINFORCEMENTS, id).charges + (save.steps.includes(`more:${id}`) ? 1 : 0);
}

/** The hunt the muster makes of a contract. */
export function setupOf(save: SaveData, monster: string, mark: Mark, seed: number, tall: boolean): Setup {
  const m = save.muster;
  return {
    seed, monster, mark, hunter: m.hunter, tall,
    reinforcements: m.reinforcements.map((id) => ({ id, charges: chargesOf(save, id) })),
    buildings: BUILDINGS.filter((b) => (m.buildings[b.id] ?? 0) > 0).map((b) => ({ id: b.id, n: m.buildings[b.id], sturdy: save.steps.includes(`sturdy:${b.id}`) })),
    trophy: save.worn[m.hunter] ?? null,
  };
}

// ------------------------------------------------------------ what coin buys

export interface Ware {
  /** What is written in the save when it is bought: `supply`, `more:pikemen`, `sturdy:barricade`. */
  id: string;
  name: string;
  says: string;
  price: number;
  /** True once it is bought and cannot be bought again. */
  had: boolean;
}

/** Everything coin can buy now, with what has been bought already marked. */
export function wares(save: SaveData): Ware[] {
  const list: Ware[] = [];
  const next = SUPPLY.steps[save.supply];
  list.push({
    id: 'supply', name: 'More Supply', says: next === undefined ? 'At the most.' : `+1 Supply for your team (${supplyOf(save)} now).`,
    price: next ?? 0, had: next === undefined,
  });
  for (const r of REINFORCEMENTS) {
    if (!isOpen(save, r.id)) continue;
    list.push({ id: `more:${r.id}`, name: `${r.name}: 2 calls`, says: 'Call them twice per hunt.', price: STEP_COST.more, had: save.steps.includes(`more:${r.id}`) });
  }
  for (const b of BUILDINGS) {
    if (!isOpen(save, b.id)) continue;
    list.push({ id: `sturdy:${b.id}`, name: `${b.name}: stronger`, says: '+50% Health.', price: STEP_COST.sturdy, had: save.steps.includes(`sturdy:${b.id}`) });
  }
  return list;
}

/** Buys a ware. Says why not, or nothing if it was bought. */
export function buy(save: SaveData, id: string): string {
  const w = wares(save).find((x) => x.id === id);
  if (!w) return 'Not for sale';
  if (w.had) return 'Already bought';
  if (save.coin < w.price) return 'Not enough coin';
  save.coin -= w.price;
  if (id === 'supply') save.supply++;
  else save.steps.push(id);
  return '';
}

// ------------------------------------------------------------ what a hunt pays

export interface Pay {
  won: boolean;
  coin: number;
  /** True if this was the monster's first fall at this mark: it paid twice. */
  first: boolean;
  /** The trophy taken, if this was its first fall at all. */
  trophy: string | null;
  /** What the trophy opened, by name. */
  opened: string[];
  /** The contract that is posted because of it, by the monster's name. */
  posted: string[];
}

/** Writes a hunt's end into the save and says what it paid. */
export function payFor(save: SaveData, monster: string, mark: Mark, won: boolean, tally: Tally, part: number): Pay {
  const def = byId(MONSTERS, monster);
  save.hunts++;
  void tally;
  if (!won) {
    const coin = CONSOLATION * part;
    save.coin += coin;
    return { won, coin, first: false, trophy: null, opened: [], posted: [] };
  }
  save.wins++;
  const before = save.felled[monster] ?? 0;
  const first = before < mark;
  const coin = def.pay[mark - 1] * (first ? 2 : 1);
  save.coin += coin;
  save.felled[monster] = Math.max(before, mark);
  let trophy: string | null = null;
  let opened: string[] = [];
  const posted: string[] = [];
  if (before === 0) {
    if (!save.trophies.includes(def.trophy.id)) {
      trophy = def.trophy.id;
      save.trophies.push(trophy);
      opened = opensWith(trophy);
    }
    for (const m of MONSTERS) if (m.after === monster) posted.push(m.name);
  }
  return { won, coin, first, trophy, opened, posted };
}
