// A world has five difficulties: the same stages with better enemies, each
// opened, for good, by the world's boss at the one before.
//
// What a harder difficulty asks is the same rule in every world: its enemies'
// grades rise evenly, from what the stage is written with on Easy to the
// best grade there is on Nightmare, and their levels rise evenly to the level
// the world names for its last stage on Nightmare (`nightmare` on a world).
// So a gentle world climbs steeply and a hard one gently, and all of them
// end near the top: Thornwood on Hard is a match for the dunes on Easy.
//
// A world's pack in the data is its Easy pack. The other four are made from
// it (packs.ts): the same cards, their grades raised by the same rule, for
// more coins.

export interface Difficulty {
  id: string;
  name: string;
  /** More enemies than the stage is written with: troops of its commonest kind, on free tiles. */
  extra: number;
  /** What a win's coins are multiplied by. */
  coins: number;
  /** What the price of the world's pack is multiplied by. */
  packCost: number;
}

export const DIFFICULTIES: readonly Difficulty[] = [
  { id: 'easy', name: 'Easy', extra: 0, coins: 1, packCost: 1 },
  { id: 'normal', name: 'Normal', extra: 0, coins: 1.7, packCost: 2 },
  { id: 'hard', name: 'Hard', extra: 1, coins: 2.6, packCost: 3.5 },
  { id: 'extreme', name: 'Extreme', extra: 1, coins: 3.8, packCost: 5.5 },
  { id: 'nightmare', name: 'Nightmare', extra: 1, coins: 5.2, packCost: 8 },
];

export function difficulty(d: number): Difficulty {
  return DIFFICULTIES[Math.max(0, Math.min(DIFFICULTIES.length - 1, d))];
}

/** How far up the difficulties `d` is: 0 on Easy, 1 on Nightmare. */
export function climb(d: number): number {
  return Math.max(0, Math.min(1, d / (DIFFICULTIES.length - 1)));
}

/** A number raised evenly from what it is on Easy to what it is on Nightmare. */
export function raised(easy: number, nightmare: number, d: number): number {
  return Math.round(easy + (nightmare - easy) * climb(d));
}
