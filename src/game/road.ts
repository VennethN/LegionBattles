// The road. Leaving the camp, a run picks one of the roads to the next
// wave. Each has an omen, what is different about the wave, a cost, and a
// prize, what surviving it gives besides coins. No road is free: a prize
// that costs nothing is no choice. A captain's wave has one road, and so
// has the first: theirs has no omen (`quiet`), and is never offered.
//
// Six omens come anywhere. Each land has two that are only its own, so
// that the nineteen forks of a run are not the same seven things over.
//
// An omen is a change to the wave's numbers or one thing put on the field:
// the wave (world.ts) reads the numbers here, and the run (run.ts) rolls
// which roads are offered and pays the prize.

export type Omen = 'quiet' | 'horde' | 'champions' | 'forced' | 'toll' | 'duel' | 'wounded' | 'stray' | 'shrine' | 'wagon' | 'burning' | 'night' | 'blizzard';

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
  /** What the wave is and what it costs, in a line a player reads. */
  says: string;
  /** What coming through it gives, in a few words. */
  prize: string;
  /** The land it comes in, where it is one land's own: 'meadow', 'desert' or 'snow'. */
  land?: 'meadow' | 'desert' | 'snow';
  /** The first wave it may lead to. */
  from: number;
  /** How often it is offered beside the others. 0 for the road with no omen, which is never offered. */
  weight: number;
}

export const OMENS: readonly OmenDef[] = [
  { id: 'quiet', name: 'The Road', says: 'A normal wave.', prize: 'None', from: 1, weight: 0 },
  // Anywhere.
  { id: 'horde', name: 'The Horde', says: '50% more enemies.', prize: '+50% XP', from: 3, weight: 1.5 },
  { id: 'champions', name: 'Champions', says: '3 champions join the wave.', prize: 'Pick 1 of 3 relics', from: 4, weight: 1.5 },
  { id: 'forced', name: 'Forced March', says: 'No camp after it. You start the next wave with the HP you have left.', prize: 'Pick 1 of 3 relics', from: 4, weight: 1.8 },
  { id: 'toll', name: 'Toll Road', says: 'Pay 20% of your coins.', prize: 'The wave is 33% shorter', from: 3, weight: 2 },
  { id: 'duel', name: 'The Duel', says: 'One huge champion and no other enemies, so no other coins.', prize: 'Kill it: pick 1 of 3 relics', from: 5, weight: 1.7 },
  { id: 'wounded', name: 'The Wounded', says: 'Start the wave at 40% HP.', prize: '1 free upgrade of the best rarity', from: 3, weight: 1.3 },
  // Thornwood's own.
  { id: 'stray', name: 'The Stray', says: 'A caged creature is on the field, guarded by a champion.', prize: 'Break the cage: it joins you for this run', land: 'meadow', from: 2, weight: 1.6 },
  { id: 'shrine', name: 'The Grove Shrine', says: 'Stand in its ring for 11 s. Enemies spawn 2x as fast while you do.', prize: '1 free upgrade', land: 'meadow', from: 2, weight: 1.8 },
  // The dunes' own.
  { id: 'wagon', name: 'Pay Caravan', says: 'A guarded wagon crosses the field.', prize: 'Destroy it: a chest', land: 'desert', from: 8, weight: 1.8 },
  { id: 'burning', name: 'Burning Field', says: 'Fire sweeps the field in lanes. The ground shows where first.', prize: 'Coins are worth 2x', land: 'desert', from: 8, weight: 1.8 },
  // Frostholt's own.
  { id: 'night', name: 'The Long Night', says: 'It is dark, and enemies move 20% faster.', prize: 'Pick 1 of 3 relics', land: 'snow', from: 15, weight: 1.8 },
  { id: 'blizzard', name: 'Blizzard', says: 'You move 18% slower, and enemy shots slow you.', prize: 'Your lowest-tier weapon gains a tier', land: 'snow', from: 15, weight: 1.8 },
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
    hp: 1,
    xp: 1.5,
  },
  champions: {
    /** How many times as many of the rest come, and how many champions. */
    fewer: 0.85,
    count: 3,
    /** The shares of the wave's time at which each is marked. */
    at: [0.12, 0.38, 0.62],
    /** How many times the health, harm, size and coins of the one it is made from. */
    hp: 7,
    dmg: 1.6,
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
  /** The lone champion of the third wave, in every run: when it is marked, as a share of the wave's time. Felled, it leaves a relic. */
  herald: {
    at: 0.2,
  },
  forced: {
    /** The least share of their health a hero begins the next wave with, however the forced march left them. */
    least: 0.25,
  },
  toll: {
    /** The share of the purse the keepers take, the least purse they bother with, and the share of the wave's time that is left. */
    share: 0.2,
    least: 15,
    seconds: 0.67,
  },
  duel: {
    /** Seconds before the duelist is marked; how many times the health, harm and speed of the one it is made from. It blazes as a burning champion does. */
    at: 1.2,
    hp: 16,
    dmg: 2.4,
    speed: 1.4,
  },
  wounded: {
    /** The share of their health a hero begins with. */
    hp: 0.4,
  },
  night: {
    /** How many times as fast they come on in the dark. */
    faster: 1.2,
  },
  wagon: {
    /** The share of the wave's time at which it is marked, and the share of it that crossing the field takes. */
    at: 0.15,
    crossing: 0.6,
    /** How many guards go with it, and how many times the health of the one each is made from. */
    guards: 6,
    stout: 1.6,
    /** Coins in its chest on the first wave, and how many more each wave after. */
    coins: 14,
    more: 3,
  },
  shrine: {
    /** How wide its ring is, and the seconds of standing in it, in all, that bless. */
    r: 78,
    seconds: 11,
    /** No nearer the middle of the field, where the hero begins, than this. */
    clear: 270,
    /** While the hero stands in the ring, the share of the usual time between one band of them and the next. */
    hurry: 0.45,
  },
  stray: {
    /** The most strays a run takes in. */
    most: 1,
    /** How far from where the hero begins the cage stands, at the least. */
    clear: 300,
  },
  burning: {
    /** Seconds before the first lane, seconds between lanes, seconds a lane is shown before it burns, and seconds it burns. */
    first: 3,
    every: 3.6,
    warn: 1.3,
    burns: 0.8,
    /** How wide a lane is, how many of the wave's plainest blows its fire is to a hero, and how hot it leaves an enemy burning, as a share of that. */
    wide: 120,
    harm: 2,
    lights: 0.6,
    /** How many times the coins on the field are worth. */
    coins: 2,
  },
  blizzard: {
    /** The share of their speed the cold takes from a hero, and the share of it an enemy's shot takes besides for two seconds. */
    slow: 0.18,
    chills: 0.3,
  },
} as const;
