// What grows between hunts besides coin and trophies: each hunter's rank,
// earned by hunting with them; trinkets a contract may drop, worn in a
// hunter's slots, each a small rule; the week's hard contract; and the
// contracts that follow on from one another, telling a story across their
// posters. Pure, like the rest of the lodge: the screens ask here.

import type { Mark } from './content';

// ------------------------------------------------------------ ranks

/**
 * A hunter's rank, from hunting with them. Each rank is a small lasting gain (more health and more damage) and a
 * new look on their figure and plate; the third opens a second slot for a trinket.
 */
export interface RankDef {
  /** Experience the hunter needs, in all, to stand at this rank. */
  need: number;
  /** What the rank is called, plainly. */
  name: string;
  /** More health and more damage than at the first rank, as a share. */
  gain: number;
  /** Slots for trinkets at this rank. */
  slots: number;
  /** What is new on the hunter's look: shown on their plate and in the inn. */
  look: string;
}

export const RANKS: readonly RankDef[] = [
  { need: 0, name: 'Hired', gain: 0, slots: 1, look: '' },
  { need: 60, name: 'Blooded', gain: 0.03, slots: 1, look: 'A blooded cord at the belt' },
  { need: 170, name: 'Sworn', gain: 0.06, slots: 2, look: 'A hunter\'s cloak' },
  { need: 340, name: 'Feared', gain: 0.09, slots: 2, look: 'A trophy worn on the shoulder' },
  { need: 600, name: 'Legend', gain: 0.12, slots: 2, look: 'A gold-edged cloak' },
];

/** Experience a hunt gives the hunter who led it: for going, for winning, for each task done and each phase reached. */
export const RANK_XP = { hunt: 10, win: 25, task: 6, phase: 4, danger: 5 };

/** The rank a hunter stands at, from their experience: 0 is the first. */
export function rankOf(xp: number): number {
  let r = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].need) r = i;
  return r;
}

/** How far to the next rank, as a share, and what it needs; null at the last. */
export function toNextRank(xp: number): { share: number; left: number; next: RankDef } | null {
  const r = rankOf(xp);
  const next = RANKS[r + 1];
  if (!next) return null;
  const from = RANKS[r].need;
  return { share: (xp - from) / (next.need - from), left: next.need - xp, next };
}

/** What one hunt gives the hunter who led it. Partners earn half, so a party fills every hunter's rank, more slowly. */
export function rankXpFor(won: boolean, tasksDone: number, phases: number, danger: number, partner = false): number {
  const xp = RANK_XP.hunt + (won ? RANK_XP.win : 0) + tasksDone * RANK_XP.task + phases * RANK_XP.phase + Math.max(0, danger - 1) * RANK_XP.danger;
  return partner ? Math.round(xp / 2) : xp;
}

// ------------------------------------------------------------ trinkets

/**
 * A trinket: a small thing worn, which bends one rule for the hunter wearing it. The hunt reads them by id (Setup's
 * `trinkets`); what each does is said in one line, with its number.
 */
export interface TrinketDef {
  id: string;
  name: string;
  says: string;
  /** How rare: a common one drops more often and costs less in the shop. */
  rare: boolean;
  /** Its price in the shop, when it is offered there. */
  price: number;
}

export const TRINKETS: readonly TrinketDef[] = [
  // None of these is what a trophy does: a trophy is a boss's, and bends the hunt more.
  { id: 'whetstone', name: 'Whetstone', says: 'Your hits do 8% more damage.', rare: false, price: 90 },
  { id: 'salt', name: 'Pouch of Grave Salt', says: 'Your hits fill the boss\'s stagger 20% faster.', rare: false, price: 90 },
  { id: 'boots', name: 'Oiled Boots', says: 'Move 8% faster.', rare: false, price: 70 },
  { id: 'flask', name: 'Hip Flask', says: 'Breaking the stagger heals you 15 Health.', rare: false, price: 100 },
  { id: 'bread', name: 'Hard Bread', says: '+12 Health.', rare: false, price: 80 },
  { id: 'nail', name: 'Coffin Nail', says: 'The first hit you take in each phase does 50% less damage.', rare: true, price: 150 },
  { id: 'ribbon', name: 'Red Ribbon', says: 'Your partners do 10% more damage.', rare: true, price: 140 },
  { id: 'purse', name: 'Moleskin Purse', says: 'Contracts pay you 15% more coin.', rare: true, price: 140 },
];

/** How a trinket changes the hunt, read by the hunt for the hunter who wears it. */
export const TRINKET_EFFECT = {
  whetstone: 0.08,
  salt: 0.2,
  boots: 0.08,
  flask: 15,
  bread: 12,
  nail: 0.5,
  ribbon: 0.1,
  purse: 0.15,
} as const;

/** The chance a contract won drops a trinket the player has not got: more for a harder one. */
export function dropChance(danger: number, weekly: boolean): number {
  if (weekly) return 1;
  return Math.min(0.6, 0.15 + 0.08 * Math.max(0, danger - 1));
}

/** Which trinket drops, by a number from the hunt's dice in [0, 1): one not held, rare ones less often. */
export function dropOf(held: readonly string[], roll: number): string | null {
  const left = TRINKETS.filter((t) => !held.includes(t.id));
  if (left.length === 0) return null;
  const weight = (t: TrinketDef): number => (t.rare ? 1 : 3);
  const total = left.reduce((n, t) => n + weight(t), 0);
  let at = roll * total;
  for (const t of left) {
    at -= weight(t);
    if (at < 0) return t.id;
  }
  return left[left.length - 1].id;
}

/** What a hunter wears, cut to the slots their rank gives. */
export function wornBy(worn: readonly string[] | undefined, xp: number): string[] {
  return (worn ?? []).slice(0, RANKS[rankOf(xp)].slots);
}

// ------------------------------------------------------------ the week's contract

/** The week's hard contract: the third mark, two of the boss's variants, three times the pay, a trinket for sure. */
export const WEEKLY = { mark: 3 as Mark, variants: 2, pay: 3 };

/** The week of a date, counted from a fixed Monday: the same for every player in the same week. */
export function weekOf(ms: number): number {
  const monday = Date.UTC(2026, 0, 5);
  return Math.floor((ms - monday) / (7 * 24 * 3600 * 1000));
}

// ------------------------------------------------------------ contracts that follow on

/**
 * A chain of contracts: each a boss at a mark, with who posts it and the part of the story its poster tells. The
 * next is posted when the one before is won.
 */
export interface ChainDef {
  id: string;
  /** What the chain is called on its posters. */
  name: string;
  /** The boss whose first fall puts the chain's first contract up. */
  opensAfter: string;
  steps: ReadonlyArray<{ monster: string; mark: Mark; by: string; why: string }>;
  /** Coin paid besides, when the last is won. */
  prize: number;
}

export const CHAINS: readonly ChainDef[] = [
  {
    id: 'parish', name: 'The Parish Debt', opensAfter: 'sexton', prize: 260,
    steps: [
      { monster: 'sexton', mark: 2, by: 'Father Aldric', why: 'The Gravedigger dug again. This time he dug up the parish books.' },
      { monster: 'spinner', mark: 2, by: 'Father Aldric', why: 'The books are in the cellar under Harrow, wrapped in silk. Bring them back.' },
      { monster: 'abbot', mark: 2, by: 'Father Aldric', why: 'The last page names the abbey. Whatever rings there owes the parish a debt.' },
    ],
  },
  {
    id: 'winter', name: 'The Long Winter', opensAfter: 'king', prize: 220,
    steps: [
      { monster: 'king', mark: 2, by: 'The reeve of Coldwater', why: 'Snow in summer again. The King has come back to the wood.' },
      { monster: 'king', mark: 3, by: 'The reeve of Coldwater', why: 'He did not stay dead. Something keeps him. Find it and end it.' },
    ],
  },
  {
    id: 'glass', name: 'Fire and Glass', opensAfter: 'furnace', prize: 280,
    steps: [
      { monster: 'furnace', mark: 2, by: 'The foreman of the works', why: 'The Furnace was lit again in the night. Nobody lit it.' },
      { monster: 'mirror', mark: 2, by: 'The foreman of the works', why: 'The glass for the mirror hall was made here. Someone wanted it made very hot.' },
    ],
  },
];

/** The step of a chain that is next to post, if any: the first one not yet won, once the chain is open. */
export function chainNext(chain: ChainDef, felled: Record<string, number>, won: Record<string, number>): number | null {
  if (!felled[chain.opensAfter]) return null;
  const done = won[chain.id] ?? 0;
  return done < chain.steps.length ? done : null;
}
