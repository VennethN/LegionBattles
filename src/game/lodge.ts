// Between hunts: what the player has (coin, trophies, what is opened and
// bought), the board of contracts, the muster within its supply, and what
// a hunt pays. Pure, like the hunt itself: the screens ask here what
// something costs and whether it can be done, and never work it out.

import {
  BOARD, BUILDINGS, HUNTERS, LESSONS, MARKER, MINION, MONSTERS, PARTY, PARTY_DANGER, PARTY_SIZES, POSTED_BY, REINFORCEMENTS, TASKS, THING_CHANCE, TO_COME, VARIANTS, WHERE, WHY, byId,
  type AttackDef, type HunterDef, type LessonDef, type Mark, type MonsterDef, type TaskKind,
} from './content';
import type { Setup, Tally } from './hunt';
import { Rng } from './rng';
import { CHAINS, RANKS, TRINKETS, TRINKET_EFFECT, WEEKLY, chainNext, dropChance, dropOf, rankOf, rankXpFor, toNextRank, wornBy } from './growth';

/** What goes on a hunt: who, what the horn calls, and how many of each building. */
export interface Muster {
  hunter: string;
  reinforcements: string[];
  buildings: Record<string, number>;
  /** Who the player would take along, in order: a contract takes as many as it has places for. */
  partners: string[];
}

/** A contract posted on the board: one hunt of one boss, unlike the last. */
export interface Posting {
  /** Counts up: no two postings share it. */
  id: number;
  monster: string;
  mark: Mark;
  /** How the boss is unlike itself, by name (content.ts, VARIANTS). */
  variants: string[];
  /** What is asked besides the kill, each with its number. */
  tasks: Array<{ id: TaskKind; n?: number }>;
  /** How many hunters it takes: the player and their partners. */
  party: number;
  /** Who put it up, and why. */
  by: string;
  why: string;
  /** A free step from the shop, paid besides the coin, if this contract pays one. */
  thing: string | null;
  /** True for the week's hard contract (growth.ts, WEEKLY). */
  weekly?: boolean;
  /** The step of a chain of contracts this is, if it is one (growth.ts, CHAINS). */
  chain?: { id: string; step: number };
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
  /** How many of each boss's three phases the player has seen, by the boss: what its contract can tell of it. */
  met?: Record<string, number>;
  /** How far through the opening hunts the player is: an index into OPENING, and its length once everything is open. */
  opening: number;
  sound: boolean;
  music: boolean;
  /** Whether the hunters and bosses say their lines during a hunt. */
  talk: boolean;
  /** Whether the player's hunter strikes by themselves when attack is not pressed (the setting AUTO ATTACK). */
  auto: boolean;
  /** On a touch screen, the stick on the right and the buttons on the left: for a left hand. */
  lefty?: boolean;
  /** What the player has been shown once and need not be shown again. */
  told: string[];
  /** The contracts posted on the board, and where the board's own dice are. */
  board: Posting[];
  boardDice: number;
  nextPosting: number;
  /** Hunts since the whole board was last posted again, and the free new postings left before the next hunt. */
  sincePosted: number;
  reposts: number;
  /** Each hunter's experience, by name: their rank (growth.ts). */
  xp?: Record<string, number>;
  /** The trinkets the lodge holds, and which each hunter wears. */
  trinkets?: string[];
  charms?: Record<string, string[]>;
  /** The week the board was last posted in, and whether its hard contract has been won. */
  week?: { n: number; won: boolean };
  /** How many steps of each chain of contracts have been won. */
  chains?: Record<string, number>;
}

/** The supply a new lodge has, and what each step more costs. */
export const SUPPLY = { base: 6, steps: [40, 80, 140, 220] as readonly number[] };
/** What a second call of a reinforcement costs, and a sturdier building. */
export const STEP_COST = { more: 60, sturdy: 45 };
/** The most kinds of reinforcement on one hunt, and the most of one building. */
export const MOST = { reinforcements: 2, ofOne: 3 };
/** What a lost hunt pays for each part of the monster got through: nobody goes home with nothing. */
export const CONSOLATION = 6;

/** What a player goes out with once everything is open: enough to see what each kind of thing is for. */
export const FIRST_MUSTER: Muster = { hunter: 'marta', reinforcements: ['pikemen'], buildings: { barricade: 1, watchfire: 1 }, partners: [] };

/**
 * The opening hunts: what each allows, one new thing a hunt. The first is a lesson, with nothing brought and no
 * camp. The next brings one building and the camp to set it in, the one after that one reinforcement and the horn.
 * After them the muster is whatever the supply carries, and the shop is open.
 */
export interface OpeningStep {
  /** The lesson that is this hunt, where it is one. */
  lesson?: string;
  /** The most buildings and kinds of reinforcement that can go. */
  buildings: number;
  reinforcements: number;
  /** What is put on the muster as this step is come to, so that the new thing is in the player's hand. */
  gives?: { building?: string; reinforcement?: string };
  /** The one line the lodge says of what is new. */
  says: string;
}

export const OPENING: readonly OpeningStep[] = [
  { lesson: 'first', buildings: 0, reinforcements: 0, says: '' },
  { buildings: 1, reinforcements: 0, gives: { building: 'barricade' }, says: 'New: a Barricade. Build it in the lair, then wake the boss.' },
  { buildings: 1, reinforcements: 1, gives: { reinforcement: 'pikemen' }, says: 'New: Spearmen. Call them in the hunt when you need help.' },
];
/** Said once the opening is behind the player. */
export const OPEN_SAYS = 'New: Supply and the Shop. Bring more to each hunt, up to your Supply.';
/** What the lesson's win pays: there is no mark to it. */
export const LESSON_PAY = 30;

/** What the muster is held to now: a step of the opening, or nothing once everything is open. */
export function openingOf(save: SaveData): OpeningStep | null {
  return OPENING[save.opening] ?? null;
}

/** The lesson a hunt of this contract would be now, if it would be one. */
export function lessonFor(save: SaveData, monster: string, mark: number): LessonDef | null {
  const id = openingOf(save)?.lesson;
  const lesson = id ? byId(LESSONS, id) : null;
  return lesson && lesson.monster === monster && mark === 1 ? lesson : null;
}

/** What the lodge says of what is new at this hunt, or nothing. */
export function newsOf(save: SaveData): string {
  const step = openingOf(save);
  if (step) return step.says;
  return save.told.includes('open') ? '' : OPEN_SAYS;
}

/** Comes to the next step of the opening, and puts what it brings on the muster. */
function advance(save: SaveData): void {
  if (save.opening >= OPENING.length) return;
  save.opening++;
  const step = openingOf(save);
  const m = save.muster;
  if (!step) {
    // Everything is open: the muster a player starts from, if theirs fits inside it.
    for (const id of FIRST_MUSTER.reinforcements) if (!m.reinforcements.includes(id)) m.reinforcements.push(id);
    for (const [id, n] of Object.entries(FIRST_MUSTER.buildings)) m.buildings[id] = Math.max(m.buildings[id] ?? 0, n);
    if (costOf(m) > supplyOf(save)) save.muster = { hunter: m.hunter, reinforcements: [...FIRST_MUSTER.reinforcements], buildings: { ...FIRST_MUSTER.buildings }, partners: m.partners };
    // The board is posted from here on.
    fillBoard(save);
    return;
  }
  if (step.gives?.building && Object.keys(m.buildings).length === 0) m.buildings[step.gives.building] = 1;
  if (step.gives?.reinforcement && m.reinforcements.length === 0) m.reinforcements.push(step.gives.reinforcement);
}

export function freshSave(): SaveData {
  return {
    v: 1, coin: 0, supply: 0, felled: {}, trophies: [], worn: {}, steps: [],
    muster: { hunter: FIRST_MUSTER.hunter, reinforcements: [], buildings: {}, partners: [] },
    hunts: 0, wins: 0, opening: 0, sound: true, music: true, talk: true, auto: true, told: [],
    board: [], boardDice: 0x2c1b3c6d, nextPosting: 1, sincePosted: 0, reposts: BOARD.freeReposts,
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
  // A save from before there was an opening: one that has won is past it, and one that has not starts it.
  if (typeof r.opening === 'number') s.opening = Math.max(0, Math.min(OPENING.length, Math.floor(r.opening)));
  else if (s.wins > 0 || s.trophies.length > 0) s.opening = OPENING.length;
  if (typeof r.sound === 'boolean') s.sound = r.sound;
  if (typeof r.music === 'boolean') s.music = r.music;
  if (typeof r.talk === 'boolean') s.talk = r.talk;
  if (typeof r.auto === 'boolean') s.auto = r.auto;
  if (Array.isArray(r.told)) s.told = r.told.filter((t): t is string => typeof t === 'string');
  // What has been seen of each boss: a phase from 1 to 3, for what its contract can tell.
  if (r.met && typeof r.met === 'object') {
    const met: Record<string, number> = {};
    for (const m of MONSTERS) {
      const n = (r.met as Record<string, unknown>)[m.id];
      if (typeof n === 'number' && n >= 1) met[m.id] = Math.min(3, Math.floor(n));
    }
    s.met = met;
  }
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
    if (Array.isArray(m.partners)) s.muster.partners = [...new Set(m.partners.filter((id): id is string => typeof id === 'string' && canPartner(s, id) && id !== s.muster.hunter))].slice(0, PARTY.most - 1);
    // A muster that no longer fits its supply is cut back to one that does.
    if (costOf(s.muster) > supplyOf(s)) s.muster = { hunter: s.muster.hunter, reinforcements: [...FIRST_MUSTER.reinforcements], buildings: { ...FIRST_MUSTER.buildings }, partners: s.muster.partners };
  }
  if (typeof r.boardDice === 'number') s.boardDice = r.boardDice >>> 0 || 1;
  if (typeof r.nextPosting === 'number') s.nextPosting = Math.max(1, Math.floor(r.nextPosting));
  if (typeof r.sincePosted === 'number') s.sincePosted = Math.max(0, Math.floor(r.sincePosted));
  if (typeof r.reposts === 'number') s.reposts = Math.max(0, Math.min(BOARD.freeReposts, Math.floor(r.reposts)));
  if (Array.isArray(r.board)) s.board = r.board.filter(postingKnown).map((p) => ({ ...p, variants: [...p.variants], tasks: p.tasks.map((t) => ({ ...t })), ...(p.chain ? { chain: { ...p.chain } } : {}) }));
  // What has grown: experience, trinkets held and worn, the week, the chains.
  if (r.xp && typeof r.xp === 'object') {
    s.xp = {};
    for (const h of HUNTERS) {
      const n = (r.xp as Record<string, unknown>)[h.id];
      if (typeof n === 'number' && n > 0) s.xp[h.id] = Math.floor(n);
    }
  }
  if (Array.isArray(r.trinkets)) s.trinkets = [...new Set(r.trinkets.filter((t): t is string => typeof t === 'string' && TRINKETS.some((d) => d.id === t)))];
  if (r.charms && typeof r.charms === 'object') {
    s.charms = {};
    for (const h of HUNTERS) {
      const list = (r.charms as Record<string, unknown>)[h.id];
      if (Array.isArray(list)) s.charms[h.id] = list.filter((t): t is string => typeof t === 'string' && (s.trinkets ?? []).includes(t)).slice(0, 2);
    }
  }
  if (r.week && typeof r.week === 'object' && typeof r.week.n === 'number') s.week = { n: Math.floor(r.week.n), won: !!r.week.won };
  if (r.chains && typeof r.chains === 'object') {
    s.chains = {};
    for (const c of CHAINS) {
      const n = (r.chains as Record<string, unknown>)[c.id];
      if (typeof n === 'number' && n > 0) s.chains[c.id] = Math.min(c.steps.length, Math.floor(n));
    }
  }
  // And one that holds more than its step of the opening allows, to what that allows.
  const step = openingOf(s);
  if (step) {
    s.muster.reinforcements = s.muster.reinforcements.slice(0, step.reinforcements);
    const kept: Record<string, number> = {};
    let n = 0;
    for (const [id, have] of Object.entries(s.muster.buildings)) {
      const take = Math.min(have, step.buildings - n);
      if (take > 0) kept[id] = take;
      n += Math.max(0, take);
    }
    s.muster.buildings = kept;
  }
  return s;
}

/** True if a posting read from a save is one this game can still play. */
function postingKnown(p: unknown): p is Posting {
  if (!p || typeof p !== 'object') return false;
  const x = p as Posting;
  return typeof x.id === 'number' && MONSTERS.some((m) => m.id === x.monster) && [1, 2, 3].includes(x.mark) && Array.isArray(x.variants) && x.variants.every((v) => VARIANTS.some((d) => d.id === v))
    && Array.isArray(x.tasks) && x.tasks.every((t) => TASKS.some((d) => d.id === t.id)) && typeof x.party === 'number' && x.party >= 1 && x.party <= PARTY.most
    && typeof x.by === 'string' && typeof x.why === 'string' && (x.chain === undefined || CHAINS.some((c) => c.id === x.chain?.id && typeof x.chain.step === 'number' && !!c.steps[x.chain.step]));
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

// ------------------------------------------------------------ posted contracts

/** True once the board is posted: the lesson and the opening hunts are behind the player. */
export function posting(save: SaveData): boolean {
  return !openingOf(save);
}

/** The bosses that can be hunted now, with the highest difficulty each can be hunted at. */
function huntable(save: SaveData): Array<{ m: MonsterDef; upTo: Mark; first: boolean }> {
  return contracts(save).filter((c) => c.posted && c.monster).map((c) => ({ m: c.monster as MonsterDef, upTo: Math.max(1, c.upTo) as Mark, first: c.felled < 1 }));
}

/** The board as it is now: filled to its size first, if it has room. */
export function board(save: SaveData): Posting[] {
  if (posting(save)) fillBoard(save);
  return save.board;
}

/** The bosses not yet posted, as dark shapes with what must fall first. Nothing else of them is told. */
export function unposted(save: SaveData): Array<{ id: string; needs: string }> {
  return contracts(save).filter((c) => !c.posted).map((c) => ({ id: c.id, needs: c.needs }));
}

/** Posts contracts until the board is full. A boss whose first trophy is not taken is always on it. */
export function fillBoard(save: SaveData): void {
  const can = huntable(save);
  if (can.length === 0) return;
  const rng = new Rng(save.boardDice);
  // The next step of each chain that is open, if its boss can be hunted at its difficulty.
  for (const c of CHAINS) {
    const at = chainNext(c, save.felled, save.chains ?? {});
    if (at === null || save.board.some((p) => p.chain?.id === c.id)) continue;
    const step = c.steps[at];
    const m = can.find((x) => x.m.id === step.monster);
    if (!m || m.upTo < step.mark) continue;
    save.board.push({ ...draw(save, rng, m.m, step.mark, false), by: step.by, why: step.why, chain: { id: c.id, step: at } });
  }
  // The week's hard contract, once the week is known and until it is won. The same boss for everyone that week.
  if (save.week && !save.week.won && !save.board.some((p) => p.weekly)) {
    const week = new Rng(save.week.n * 7919 + 13);
    const c = can[save.week.n % can.length];
    const mark = Math.min(WEEKLY.mark, c.upTo) as Mark;
    save.board.push({ ...draw(save, week, c.m, mark, false, WEEKLY.variants), by: 'The lodge', why: 'This week\'s hard contract. Three times the pay, and a trinket for certain.', weekly: true, thing: null });
  }
  for (const c of can) {
    // Its first contract is plain: one hunter, the first difficulty, nothing unlike itself. It is how a boss is learned.
    if (c.first && !save.board.some((p) => p.monster === c.m.id && p.mark === 1)) save.board.push(draw(save, rng, c.m, 1, true));
  }
  for (const c of can) {
    // And the hardest difficulty it can be hunted at is always somewhere, so that nobody waits on the dice to go on.
    if (!c.first && save.board.length < BOARD.size && !save.board.some((p) => p.monster === c.m.id && p.mark === c.upTo)) save.board.push(draw(save, rng, c.m, c.upTo, false));
  }
  while (save.board.length < BOARD.size) {
    const c = rng.pick(can);
    // Higher difficulties are posted more often than lower ones.
    const marks = ([1, 2, 3] as Mark[]).filter((k) => k <= c.upTo);
    const mark = rng.weighted(marks, (k) => k);
    save.board.push(draw(save, rng, c.m, mark, false));
  }
  save.boardDice = rng.state;
}

/** Tells the lodge what week it is: a new week takes down last week's hard contract and posts this one's. */
export function setWeek(save: SaveData, n: number): void {
  if (save.week?.n === n) return;
  save.week = { n, won: false };
  save.board = save.board.filter((p) => !p.weekly);
}

/** Takes the whole board down and posts it again. Free once between hunts. Says why not, or nothing if it was done. */
export function repost(save: SaveData): string {
  if (!posting(save)) return 'Locked: finish the first hunts';
  if (save.reposts <= 0) return 'No new postings until after your next hunt';
  save.reposts--;
  save.board = [];
  fillBoard(save);
  return '';
}

/** One contract, drawn by the board's dice. */
function draw(save: SaveData, rng: Rng, m: MonsterDef, mark: Mark, plain: boolean, variantsAsked?: number): Posting {
  const variants: string[] = [];
  const tasks: Array<{ id: TaskKind; n?: number }> = [];
  if (!plain) {
    // More, and stronger, at a higher difficulty.
    const nv = variantsAsked ?? (mark === 1 ? (rng.chance(0.5) ? 1 : 0) : mark === 2 ? 1 : rng.chance(0.5) ? 2 : 1);
    const nt = mark === 1 ? (rng.chance(0.6) ? 1 : 0) : mark === 2 ? 1 : rng.chance(0.4) ? 2 : 1;
    for (let i = 0; i < nv; i++) {
      const can = VARIANTS.filter((v) => (!v.only || v.only === m.id) && (v.mark ?? 1) <= mark && !variants.includes(v.id) && !variants.some((x) => v.not?.includes(x) || byId(VARIANTS, x).not?.includes(v.id))
        && (v.kind !== 'minions' || !!MINION[m.id]));
      if (can.length) variants.push(rng.pick(can).id);
    }
    for (let i = 0; i < nt; i++) {
      // No Camp is not posted: building nothing was a choice, not a challenge.
      const can = TASKS.filter((t) => !tasks.some((x) => x.id === t.id || t.not?.includes(x.id)) && (t.id !== 'markers' || !!MARKER[m.id]) && t.id !== 'together' && t.id !== 'nobuild');
      if (can.length) tasks.push({ id: rng.pick(can).id });
    }
  }
  const danger = mark + variants.reduce((n, v) => n + byId(VARIANTS, v).danger, 0);
  const sizes = PARTY_SIZES[mark];
  const party = plain ? 1 : Math.min(PARTY.most, rng.pick(sizes) + (danger >= PARTY_DANGER ? 1 : 0));
  // With two hunters or more, keeping everyone standing may be asked too.
  if (!plain && party >= 2 && tasks.length < 2 && rng.chance(0.3)) tasks.push({ id: 'together' });
  // A fast kill with a Giant or a party gets the time their Health asks for; so does breaking it often with a party.
  const swift = tasks.find((t) => t.id === 'swift');
  if (swift) {
    const base = byId(TASKS, 'swift').n?.[mark - 1] ?? 300;
    swift.n = Math.round((base * (variants.includes('giant') ? 1.25 : 1) * (1 + 0.3 * (party - 1))) / 10) * 10;
  }
  const breaks = tasks.find((t) => t.id === 'breaks');
  if (breaks) breaks.n = (byId(TASKS, 'breaks').n?.[mark - 1] ?? 4) + (party - 1);
  const open = wares(save).filter((w) => !w.had && w.id !== 'supply');
  const thing = !plain && mark >= 2 && open.length > 0 && rng.chance(THING_CHANCE) ? rng.pick(open).id : null;
  return { id: save.nextPosting++, monster: m.id, mark, variants, tasks, party, by: rng.pick(POSTED_BY), why: rng.pick(WHY[m.id] ?? ['It must die.']), thing };
}

/** A posting on the board, by its number. */
export function postingOf(save: SaveData, id: number): Posting | undefined {
  return save.board.find((p) => p.id === id);
}

/** What a poster shows: everything a player reads off it, worked out here so that no screen works it out. */
export interface Poster {
  id: number;
  monster: string;
  /** "WANTED: The Gravedigger" and the like. */
  title: string;
  where: string;
  by: string;
  why: string;
  mark: Mark;
  /** Danger, 1 to 6: the difficulty and what the variants add. */
  danger: number;
  party: number;
  /** "Party: 3 hunters", or "Alone". */
  partyText: string;
  variants: Array<{ id: string; name: string; says: string }>;
  tasks: Array<{ id: TaskKind; name: string; says: string; bonus: number }>;
  coin: number;
  /** Coin paid besides for each task done, all of them together. */
  bonus: number;
  /** What a hand for hire takes of the coin, if the player has to take any on. */
  hiredCut: number;
  /** The shop's step paid besides, by name, if any. */
  thing: string | null;
  /** True for the first win at its difficulty, which pays the coin twice. */
  first: boolean;
  /** "THE WEEK'S CONTRACT", or a chain's name with how far along it is, or nothing. */
  banner: string;
  /** What winning the last step of a chain pays besides, or 0. */
  prize: number;
}

export function posterOf(save: SaveData, p: Posting): Poster {
  const m = byId(MONSTERS, p.monster);
  const danger = Math.min(6, p.mark + p.variants.reduce((n, v) => n + byId(VARIANTS, v).danger, 0));
  const r = rewardFor(save, p);
  return {
    id: p.id, monster: p.monster, title: `WANTED: ${m.name}`, where: WHERE[p.monster] ?? '', by: p.by, why: p.why, mark: p.mark, danger, party: p.party,
    partyText: p.party === 1 ? 'Alone' : `Party: ${p.party} hunters`,
    variants: p.variants.map((v) => {
      const d = byId(VARIANTS, v);
      return { id: d.id, name: d.name, says: d.says };
    }),
    tasks: p.tasks.map((t) => {
      const d = byId(TASKS, t.id);
      const n = t.n ?? d.n?.[p.mark - 1] ?? 0;
      const says = d.says.replace('{n}', d.id === 'swift' ? `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` : String(n));
      return { id: d.id, name: d.name, says, bonus: Math.round(r.base * d.pay) };
    }),
    coin: r.coin, bonus: r.bonus, hiredCut: r.cut, thing: p.thing ? (wares(save).find((w) => w.id === p.thing)?.name ?? null) : null, first: r.first,
    banner: bannerOf(p), prize: prizeOf(p),
  };
}

/** The line over a poster that is more than a contract: the week's, or a step of a chain. */
function bannerOf(p: Posting): string {
  if (p.weekly) return 'THE WEEK\'S CONTRACT';
  const c = p.chain ? CHAINS.find((x) => x.id === p.chain?.id) : undefined;
  return c && p.chain ? `${c.name.toUpperCase()}: ${p.chain.step + 1} OF ${c.steps.length}` : '';
}

/** What winning a chain's last step pays besides. */
function prizeOf(p: Posting): number {
  const c = p.chain ? CHAINS.find((x) => x.id === p.chain?.id) : undefined;
  return c && p.chain && p.chain.step === c.steps.length - 1 ? c.prize : 0;
}

/** What a posted contract pays: the coin of its boss and difficulty, more for its danger and its party, less what hands for hire take. */
export function rewardFor(save: SaveData, p: Posting): { coin: number; base: number; bonus: number; cut: number; first: boolean } {
  const m = byId(MONSTERS, p.monster);
  const first = (save.felled[p.monster] ?? 0) < p.mark;
  const extra = p.variants.reduce((n, v) => n + byId(VARIANTS, v).danger, 0);
  // The week's contract pays three times; a Moleskin Purse on the hunter who goes pays a little more.
  const purse = worn(save, save.muster.hunter).includes('purse') ? 1 + TRINKET_EFFECT.purse : 1;
  const base = Math.round(m.pay[p.mark - 1] * (1 + 0.25 * extra) * (1 + PARTY.pay * (p.party - 1)) * (p.weekly ? WEEKLY.pay : 1) * purse);
  const bonus = p.tasks.reduce((n, t) => n + Math.round(base * byId(TASKS, t.id).pay), 0);
  const { hired } = partyFor(save, p.party);
  const gross = base * (first ? 2 : 1);
  const cut = Math.round(gross * PARTY.hiredCut * hired);
  return { coin: gross - cut, base, bonus, cut, first };
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
  const step = openingOf(save);
  if (step && step.reinforcements === 0) return 'Locked: play 1 more hunt';
  if (step && m.reinforcements.length >= step.reinforcements) return 'Only 1 this hunt. Take the other off first.';
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
  const step = openingOf(save);
  if (step && Object.values(m.buildings).reduce((a, n) => a + n, 0) >= step.buildings) return step.buildings === 0 ? 'Locked: win your first hunt' : 'Only 1 building this hunt. Take the other off first.';
  if (now >= MOST.ofOne) return `No more than ${MOST.ofOne} of one`;
  if (costOf(m) + byId(BUILDINGS, id).cost > supplyOf(save)) return 'Not enough Supply';
  m.buildings[id] = now + 1;
  return '';
}

export function setHunter(save: SaveData, id: string): string {
  if (byId(HUNTERS, id).hired) return 'A hand for hire cannot lead';
  if (!isOpen(save, id)) return `Locked: ${opensBy(id)}`;
  save.muster.hunter = id;
  save.muster.partners = save.muster.partners.filter((x) => x !== id);
  return '';
}

// ------------------------------------------------------------ the party

/** True if a hunter can go as a partner: one of the player's own that is unlocked. Hands for hire fill the rest by themselves. */
function canPartner(save: SaveData, id: string): boolean {
  const h = HUNTERS.find((x) => x.id === id);
  return !!h && !h.hired && isOpen(save, id);
}

/** The hunters' bar of the loadout: every hunter of the player's own, unlocked or a dark shape with how to unlock it. */
export interface HunterSlot {
  id: string;
  /** Their name, or "???" while locked. */
  name: string;
  /** What they do, in a line, or nothing while locked. */
  way: string;
  open: boolean;
  /** How to unlock them, while locked. */
  unlock: string;
  /** True for the one the player leads with, and the place each partner is in (or -1). */
  leading: boolean;
  partner: number;
}

export function hunterBar(save: SaveData): HunterSlot[] {
  return HUNTERS.filter((h) => !h.hired).map((h) => {
    const open = isOpen(save, h.id);
    return { id: h.id, name: open ? h.name : '???', way: open ? h.way : '', open, unlock: open ? '' : opensBy(h.id), leading: save.muster.hunter === h.id, partner: save.muster.partners.indexOf(h.id) };
  });
}

/** Takes a hunter along as a partner, or leaves them. Says why not, or nothing if it was done. */
export function togglePartner(save: SaveData, id: string): string {
  const m = save.muster;
  if (m.partners.includes(id)) {
    m.partners = m.partners.filter((x) => x !== id);
    return '';
  }
  if (id === m.hunter) return 'That is you';
  if (byId(HUNTERS, id).hired) return 'Hands for hire come by themselves';
  if (!isOpen(save, id)) return `Locked: ${opensBy(id)}`;
  if (m.partners.length >= PARTY.most - 1) return `No more than ${PARTY.most - 1} partners`;
  m.partners.push(id);
  return '';
}

/** The partners' places on a contract for `party`: how many there are, how many the player has chosen, and how many are left. */
export function placesOf(save: SaveData, party: number): { places: number; chosen: number; left: number } {
  const places = Math.max(0, Math.min(PARTY.most, party) - 1);
  const chosen = Math.min(places, save.muster.partners.length);
  return { places, chosen, left: places - chosen };
}

/** What a hunter's page shows of them: their Health, the Damage of each blow of their chain, their reach and their speed, with their rank and trinkets in, as the hunt has them. */
export interface HunterStats {
  health: number;
  damage: number[];
  range: number;
  speed: number;
}

export function statsOf(save: SaveData, id: string): HunterStats {
  const h = byId(HUNTERS, id);
  const g = h.hired ? null : growthOf(save, id);
  const gain = g ? RANKS[g.rank].gain : 0;
  const t = g?.worn ?? [];
  const grow = (1 + gain) * (t.includes('whetstone') ? 1 + TRINKET_EFFECT.whetstone : 1);
  return {
    health: Math.round(h.hp * (1 + gain)) + (t.includes('bread') ? TRINKET_EFFECT.bread : 0),
    damage: h.combo.map((b) => Math.round(b.dmg * grow)),
    range: Math.max(...h.combo.map((b) => b.reach)),
    speed: h.speed,
  };
}

/** The hands for hire, in the order they are taken on: a fighter, then a bowman, then the fighter's brother. */
const HIRED: readonly string[] = ['sellsword', 'bowman', 'sellsword'];

/** Who goes on a contract with the player: their partners first, any other hunter they have unlocked, then hands for hire. */
export function partyFor(save: SaveData, size: number): { partners: string[]; hired: number } {
  const want = Math.max(0, Math.min(PARTY.most, size) - 1);
  const me = save.muster.hunter;
  const own = [...save.muster.partners, ...HUNTERS.filter((h) => !h.hired && isOpen(save, h.id)).map((h) => h.id)].filter((id, i, a) => id !== me && a.indexOf(id) === i && canPartner(save, id));
  const partners = own.slice(0, want);
  let hired = 0;
  while (partners.length < want) partners.push(HIRED[hired++ % HIRED.length]);
  return { partners, hired };
}

/** The hunter a partner's place holds, for the card: who, and whether a hand for hire. */
export function partnerDef(id: string): HunterDef {
  return byId(HUNTERS, id);
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

/** The hunt the muster makes of a posted contract: its boss and difficulty, its terms, and the party it takes. */
export function setupForPosting(save: SaveData, p: Posting, seed: number, tall: boolean): Setup {
  const base = setupOf(save, p.monster, p.mark, seed, tall);
  const partners = partyFor(save, p.party).partners;
  return { ...base, partners, grown: grownFor(save, [base.hunter, ...partners]), terms: { variants: [...p.variants], tasks: p.tasks.map((t) => ({ ...t })) } };
}

/** What each of these hunters has grown into, for the hunt: their rank's gain and the trinkets they wear. */
function grownFor(save: SaveData, ids: readonly string[]): Record<string, { gain: number; trinkets: string[] }> {
  return Object.fromEntries(ids.filter((id) => !byId(HUNTERS, id).hired).map((id) => [id, { gain: RANKS[rankOf(save.xp?.[id] ?? 0)].gain, trinkets: worn(save, id) }]));
}

/** The hunt the muster makes of a contract. */
export function setupOf(save: SaveData, monster: string, mark: Mark, seed: number, tall: boolean): Setup {
  const m = save.muster;
  const lesson = lessonFor(save, monster, mark);
  // A lesson is its own hunt: its hunter, nothing brought, no trophy, and its steps unless they were done before.
  if (lesson) return { seed, monster, mark, hunter: lesson.hunter, tall, reinforcements: [], buildings: [], trophy: null, lesson: lesson.id, taught: save.told.includes(`lesson:${lesson.id}`), autoAttack: save.auto !== false };
  return {
    seed, monster, mark, hunter: m.hunter, tall,
    reinforcements: m.reinforcements.map((id) => ({ id, charges: chargesOf(save, id) })),
    buildings: BUILDINGS.filter((b) => (m.buildings[b.id] ?? 0) > 0).map((b) => ({ id: b.id, n: m.buildings[b.id], sturdy: save.steps.includes(`sturdy:${b.id}`) })),
    trophy: save.worn[m.hunter] ?? null,
    grown: grownFor(save, [m.hunter]),
    autoAttack: save.auto !== false,
  };
}

// ------------------------------------------------------------ ranks and trinkets

/** A hunter's rank as a screen shows it: its name, what it gives, how far to the next, and the trinkets worn. */
export interface Growth {
  rank: number;
  name: string;
  /** "+8% Health and Damage", or nothing at the first rank. */
  gives: string;
  look: string;
  /** How far to the next rank, as a share, and its name; null at the last. */
  next: { share: number; name: string; left: number } | null;
  slots: number;
  worn: string[];
}

export function growthOf(save: SaveData, hunter: string): Growth {
  const xp = save.xp?.[hunter] ?? 0;
  const r = rankOf(xp);
  const d = RANKS[r];
  const n = toNextRank(xp);
  return {
    rank: r, name: d.name, gives: d.gain > 0 ? `+${Math.round(d.gain * 100)}% Health and Damage` : '', look: d.look,
    next: n ? { share: n.share, name: n.next.name, left: n.left } : null, slots: d.slots, worn: worn(save, hunter),
  };
}

/** The trinkets a hunter wears, cut to the slots of their rank. */
export function worn(save: SaveData, hunter: string): string[] {
  return wornBy((save.charms?.[hunter] ?? []).filter((t) => (save.trinkets ?? []).includes(t)), save.xp?.[hunter] ?? 0);
}

/** Puts a trinket on a hunter, or takes it off if they wear it. Says why not, or nothing if it was done. */
export function wearTrinket(save: SaveData, hunter: string, trinket: string): string {
  if (!(save.trinkets ?? []).includes(trinket)) return 'Not held';
  const charms = { ...(save.charms ?? {}) };
  const now = worn(save, hunter);
  if (now.includes(trinket)) {
    charms[hunter] = now.filter((t) => t !== trinket);
    save.charms = charms;
    return '';
  }
  const slots = RANKS[rankOf(save.xp?.[hunter] ?? 0)].slots;
  // One trinket is worn by one hunter at a time: it comes off whoever had it.
  for (const [id, list] of Object.entries(charms)) charms[id] = list.filter((t) => t !== trinket);
  charms[hunter] = now.length < slots ? [...now, trinket] : [...now.slice(0, slots - 1), trinket];
  save.charms = charms;
  return '';
}

/** What winning a contract at a mark would pay now, and whether that is the doubled pay of a first win. */
export function rewardOf(save: SaveData, monster: string, mark: Mark): { coin: number; first: boolean } {
  if (lessonFor(save, monster, mark)) return { coin: LESSON_PAY, first: false };
  const first = (save.felled[monster] ?? 0) < mark;
  return { coin: byId(MONSTERS, monster).pay[mark - 1] * (first ? 2 : 1), first };
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
  // The plain trinkets are sold too, once the lodge is open; the rare ones only come from contracts.
  if (!openingOf(save)) {
    for (const t of TRINKETS) {
      if (t.rare) continue;
      list.push({ id: `trinket:${t.id}`, name: t.name, says: t.says, price: t.price, had: (save.trinkets ?? []).includes(t.id) });
    }
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
  else if (id.startsWith('trinket:')) save.trinkets = [...(save.trinkets ?? []), id.slice(8)];
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
  /** True if the hunt was a lesson: its win is not the contract's. */
  lesson: boolean;
  /** A posted contract's tasks, each done or not, with what each paid. */
  tasks: Array<{ id: TaskKind; name: string; done: boolean; coin: number }>;
  /** What hands for hire took, and the shop's step paid besides, by name. */
  cut: number;
  thing: string | null;
  /** Experience each hunter who went earned, and the rank they rose to, if they rose. */
  ranks: Array<{ hunter: string; xp: number; rose: string | null }>;
  /** The trinket found, by its id, if one was. */
  trinket: string | null;
  /** A chain's step won, said as a line ("The Parish Debt: 1 of 3"), and what its end paid besides. */
  chain: string | null;
  prize: number;
  /** True if the week's contract was won. */
  weekly: boolean;
}

/** Gives experience to the hunters who went, and says who rose. */
function giveXp(save: SaveData, lead: string, partners: readonly string[], won: boolean, tasksDone: number, phases: number, danger: number): Pay['ranks'] {
  const out: Pay['ranks'] = [];
  const xp = { ...(save.xp ?? {}) };
  for (const id of [lead, ...partners]) {
    if (byId(HUNTERS, id).hired) continue;
    const before = xp[id] ?? 0;
    const got = rankXpFor(won, tasksDone, phases, danger, id !== lead);
    xp[id] = before + got;
    const rose = rankOf(xp[id]) > rankOf(before) ? RANKS[rankOf(xp[id])].name : null;
    out.push({ hunter: id, xp: got, rose });
  }
  save.xp = xp;
  return out;
}

/** Writes a hunt's end into the save and says what it paid. */
export function payFor(save: SaveData, monster: string, mark: Mark, won: boolean, tally: Tally, part: number, taken?: Posting): Pay {
  const def = byId(MONSTERS, monster);
  const lesson = lessonFor(save, monster, mark);
  save.hunts++;
  // What has been seen of it: the phase reached, all three once it has fallen.
  save.met = { ...(save.met ?? {}), [monster]: Math.max(save.met?.[monster] ?? 0, won ? 3 : Math.min(3, part + 1)) };
  if (taken) {
    // A contract taken comes off the board, won or lost, and a new one goes up in its place; now and then the whole board is posted again.
    const r = rewardFor(save, taken);
    // A contract tried again after it came off the board is paid as it was posted.
    save.board = save.board.filter((p) => p.id !== taken.id);
    save.sincePosted++;
    save.reposts = BOARD.freeReposts;
    if (save.sincePosted >= BOARD.turnEvery) {
      save.sincePosted = 0;
      save.board = [];
    }
    const danger = Math.min(6, taken.mark + taken.variants.reduce((n, v) => n + byId(VARIANTS, v).danger, 0));
    const partners = partyFor(save, taken.party).partners;
    const tasksDone = taken.tasks.filter((t) => tally.tasks[t.id]).length;
    const ranks = giveXp(save, save.muster.hunter, partners, won, won ? tasksDone : 0, won ? 3 : part, danger);
    if (!won) {
      const coin = CONSOLATION * part;
      save.coin += coin;
      fillBoard(save);
      return { won, coin, first: false, trophy: null, opened: [], posted: [], lesson: false, tasks: [], cut: 0, thing: null, ranks, trinket: null, chain: null, prize: 0, weekly: false };
    }
    save.wins++;
    // A trinket, now and then: always for the week's contract.
    const dice = new Rng((save.hunts * 7919 + save.boardDice) >>> 0);
    const held = save.trinkets ?? [];
    const trinket = dice.next() < dropChance(danger, !!taken.weekly) ? dropOf(held, dice.next()) : null;
    if (trinket) save.trinkets = [...held, trinket];
    if (taken.weekly && save.week) save.week.won = true;
    let chain: string | null = null;
    let prize = 0;
    const c = taken.chain ? CHAINS.find((x) => x.id === taken.chain?.id) : undefined;
    if (c && taken.chain && (save.chains?.[c.id] ?? 0) === taken.chain.step) {
      save.chains = { ...(save.chains ?? {}), [c.id]: taken.chain.step + 1 };
      chain = `${c.name}: ${taken.chain.step + 1} of ${c.steps.length}`;
      if (taken.chain.step === c.steps.length - 1) {
        prize = c.prize;
        save.coin += prize;
        chain = `${c.name}: done`;
      }
    }
    const tasks = taken.tasks.map((t) => {
      const d = byId(TASKS, t.id);
      const done = !!tally.tasks[t.id];
      return { id: t.id, name: d.name, done, coin: done ? Math.round(r.base * d.pay) : 0 };
    });
    const coin = r.coin + tasks.reduce((n, t) => n + t.coin, 0);
    save.coin += coin;
    const before = save.felled[monster] ?? 0;
    save.felled[monster] = Math.max(before, mark);
    let trophy: string | null = null;
    let opened: string[] = [];
    const newly: string[] = [];
    if (before === 0) {
      if (!save.trophies.includes(def.trophy.id)) {
        trophy = def.trophy.id;
        save.trophies.push(trophy);
        opened = opensWith(trophy);
      }
      for (const m of MONSTERS) if (m.after === monster) newly.push(m.name);
    }
    let thing: string | null = null;
    if (taken.thing && !save.steps.includes(taken.thing) && taken.thing !== 'supply') {
      const step = taken.thing;
      save.steps.push(step);
      thing = wares(save).find((w) => w.id === step)?.name ?? step;
    }
    fillBoard(save);
    return { won, coin, first: r.first, trophy, opened, posted: newly, lesson: false, tasks, cut: r.cut, thing, ranks, trinket, chain, prize, weekly: !!taken.weekly };
  }
  // A lesson whose steps were all done is not taught again, win or lose.
  if (lesson && tally.taught && !save.told.includes(`lesson:${lesson.id}`)) save.told.push(`lesson:${lesson.id}`);
  // Past the lesson, each hunt of the opening brings in the next thing, however it ended.
  if (!lesson) advance(save);
  const none = { trinket: null, chain: null, prize: 0, weekly: false };
  const ranks = giveXp(save, lesson ? lesson.hunter : save.muster.hunter, [], won, 0, won ? 3 : part, mark);
  if (!won) {
    const coin = CONSOLATION * part;
    save.coin += coin;
    return { won, coin, first: false, trophy: null, opened: [], posted: [], lesson: !!lesson, tasks: [], cut: 0, thing: null, ranks, ...none };
  }
  save.wins++;
  if (lesson) {
    // The lesson's win: its coin and the trophy, and the lodge. The contract itself is still to be won.
    save.coin += LESSON_PAY;
    let trophy: string | null = null;
    let opened: string[] = [];
    if (!save.trophies.includes(def.trophy.id)) {
      trophy = def.trophy.id;
      save.trophies.push(trophy);
      opened = opensWith(trophy);
    }
    advance(save);
    return { won, coin: LESSON_PAY, first: false, trophy, opened, posted: [], lesson: true, tasks: [], cut: 0, thing: null, ranks, ...none };
  }
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
  return { won, coin, first, trophy, opened, posted, lesson: false, tasks: [], cut: 0, thing: null, ranks, ...none };
}

/** What a contract tells of its boss: each attack and how it is shown on the ground, its weak place, its phases. */
export interface Quarry {
  /** Each attack known, with how it is told; nothing for one not yet seen. */
  attacks: Array<{ name: string; how: string } | null>;
  weak: string | null;
  /** A line for each phase: the attacks of it, or "???" where it has not been reached. */
  phases: string[];
}

/** How an attack's warning looks on the ground and what to do about it, in a few plain words. */
export function toldBy(a: AttackDef): string {
  const sh = a.shapes[0];
  let how = '';
  if (!sh) how = 'No mark on the ground.';
  else if (sh.kind === 'line') how = 'A strip on the ground toward you. Step aside.';
  else if (sh.kind === 'cone') how = 'A wedge in front of it. Get out wide or behind.';
  else if (sh.kind === 'ring' && sh.at === 'self') how = sh.inner ? 'A ring round it with a safe middle. Get in close.' : 'A circle round it. Get out.';
  else if (sh.kind === 'ring') how = sh.inner ? 'A ring with a safe middle. Stand in the middle.' : 'A circle where you stand. Move.';
  else if (sh.kind === 'marks') how = sh.at === 'follow' ? 'Circles that follow you. Keep moving.' : 'Circles on the ground. Stand between them.';
  else if (sh.kind === 'lanes') how = 'Strips across the field. Stand in the gaps.';
  if (a.summon) how += ' Something rises from them.';
  if (a.charge) how += ' Then it charges: lure it into a stone.';
  return how;
}

/**
 * What its contract tells of a boss: the attacks of each phase the player has reached, and how each is told; its
 * weak place once it has been hunted at all. The first time, only its first phase is told. "???" for the rest.
 */
export function quarryOf(save: SaveData, monster: string): Quarry {
  const m = byId(MONSTERS, monster);
  const seen = Math.max(1, save.met?.[monster] ?? 0, (save.felled[monster] ?? 0) > 0 ? 3 : 0);
  const known = new Set(m.parts.slice(0, seen).flat());
  const attacks = [...new Set(m.parts.flat())].map((id) => {
    const a = m.attacks.find((x) => x.id === id);
    return a && known.has(id) ? { name: a.name, how: toldBy(a) } : null;
  });
  const phases = m.parts.map((ids, i) => (i < seen ? `Phase ${i + 1}: ${[...new Set(ids)].map((id) => m.attacks.find((x) => x.id === id)?.name ?? id).join(', ')}.` : `Phase ${i + 1}: ???`));
  return { attacks, weak: (save.met?.[monster] ?? 0) > 0 || (save.felled[monster] ?? 0) > 0 ? (m.weak ?? null) : null, phases };
}
