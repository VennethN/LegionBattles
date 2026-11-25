// The road. Leaving the camp, a run picks one of the roads to the next
// wave. Each has an omen, what is different about the wave, and a prize,
// what surviving it gives besides coins. A captain's wave has one road, and
// so has the first.
//
// An omen is a change to the wave's numbers or one thing put on the field:
// the wave (world.ts) reads the numbers here, and the run (run.ts) rolls
// which roads are offered and pays the prize.

export type Omen = 'quiet' | 'horde' | 'champions' | 'night' | 'wagon' | 'shrine' | 'stray';

/** What a champion has that the rest have not. */
export type ChampionTrait = 'quick' | 'armored' | 'burning';
export const CHAMPION_TRAITS: readonly ChampionTrait[] = ['quick', 'armored', 'burning'];
/** What each is called over its head. */
export const TRAIT_NAMES: Record<ChampionTrait, string> = { quick: 'Quick', armored: 'Armored', burning: 'Burning' };

/** A road as it is offered and taken: its omen, and who is in the cage if it is the stray's. */
export interface Road {
  omen: Omen;
  stray?: string;
}

export interface OmenDef {
  id: Omen;
  name: string;
  /** What the wave is, in a line a player reads. */
  says: string;
  /** What coming through it gives, in a few words. */
  prize: string;
  /** The first wave it may lead to. */
  from: number;
  /** How often it is offered beside the others. */
  weight: number;
}

export const OMENS: readonly OmenDef[] = [
  { id: 'quiet', name: 'Quiet Road', says: 'The wave as it is.', prize: 'Nothing more', from: 2, weight: 3 },
  { id: 'horde', name: 'The Horde', says: 'Half as many again, each a little weaker.', prize: 'Half as much experience again', from: 2, weight: 2 },
  { id: 'champions', name: 'Champions', says: 'Fewer of them, and three champions among them.', prize: 'A relic, one of three', from: 3, weight: 2 },
  { id: 'night', name: 'Night March', says: 'It is dark, and they come on faster.', prize: 'A relic, one of three', from: 4, weight: 1.5 },
  { id: 'wagon', name: 'Pay Wagon', says: 'A wagon crosses the field under guard.', prize: 'Its chest, if you break it', from: 3, weight: 2 },
  { id: 'shrine', name: 'The Shrine', says: 'A shrine stands on the field. Stand in its ring.', prize: 'A blessing: a choice as for a level', from: 2, weight: 1.6 },
  { id: 'stray', name: 'The Stray', says: 'A creature is caged on the field. Break the cage.', prize: 'It fights beside you for the run', from: 3, weight: 1.4 },
];

export function omenOf(id: Omen): OmenDef {
  const found = OMENS.find((o) => o.id === id);
  if (!found) throw new Error(`road: no omen is called "${id}"`);
  return found;
}

/** The numbers of the road and of each omen. */
export const ROAD = {
  /** Roads offered at once, before what the Hold or a relic adds, and the most there ever are. */
  roads: 2,
  most: 4,
  horde: {
    /** How many times as many come and stand at once, how much of their health each has, and how many times the experience. */
    more: 1.5,
    hp: 0.8,
    xp: 1.5,
  },
  champions: {
    /** How many times as many of the rest come, and how many champions. */
    fewer: 0.75,
    count: 3,
    /** The shares of the wave's time at which each is marked. */
    at: [0.12, 0.38, 0.62],
    /** How many times the health, harm, size and coins of the one it is made from. */
    hp: 4,
    dmg: 1.5,
    size: 1.3,
    coins: 4,
    /** Quick: how many times as fast. */
    quick: 1.45,
    /** Armored: the share of a blow that gets through. Fire, clouds and holy ground are not blows. */
    armored: 0.55,
    /** Burning: how wide its blaze is, seconds of warning, seconds between, and how near the hero has to be for it to start. */
    blaze: 96,
    warn: 0.8,
    every: 3.4,
    near: 170,
  },
  night: {
    /** How many times as fast they come on in the dark. */
    faster: 1.12,
  },
  wagon: {
    /** The share of the wave's time at which it is marked, and the share of it that crossing the field takes. */
    at: 0.15,
    crossing: 0.6,
    /** How many guards go with it. */
    guards: 4,
    /** Coins in its chest on the first wave, and how many more each wave after. */
    coins: 14,
    more: 3,
  },
  shrine: {
    /** How wide its ring is, and the seconds of standing in it, in all, that bless. */
    r: 78,
    seconds: 8,
    /** No nearer the middle of the field, where the hero begins, than this. */
    clear: 270,
  },
  stray: {
    /** The most strays a run takes in. */
    most: 2,
    /** How far from where the hero begins the cage stands, at the least. */
    clear: 300,
  },
} as const;
