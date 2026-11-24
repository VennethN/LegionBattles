// The line of stages goes through the lands five times. Each time round is
// a lap: the same stages, their enemies standing higher, more of them from
// the third lap, paying more, and dropping a better pack. What they stand at
// and what they pay is the line's to say (stages.ts): it rises with a
// stage's number, not by the lap.
//
// These were the five difficulties of a world (Easy to Nightmare) until the
// owner asked for one line: "let's dismiss world entirely ... make
// everything into a big thing called Stage, which are basically numbered
// waves ... so that everything fit on a linear scale". A lap is that
// difficulty, met in turn instead of picked.

export interface Lap {
  /** What follows a land's name on this lap: "Thornwood II". */
  mark: string;
  /** More enemies than the stage is written with: troops of its land, on free tiles. */
  extra: number;
  /**
   * The fewest enemies a stage fields on this lap. A land's first stages are
   * written with two or three, to teach a new player: met again by a team of
   * eight they would be no fight at all, so they are filled up to this.
   */
  least: number;
  /**
   * How much of a land's weight counts on this lap (lands.ts). Most on the
   * second, where a small land's stages are still small, and less on the
   * last laps: every stage is filled to eight by then, which is itself part
   * of what a small land's weight stood in for. Set by measuring.
   */
  weight: number;
}

export const LAPS: readonly Lap[] = [
  { mark: '', extra: 0, least: 0, weight: 0 },
  { mark: ' II', extra: 0, least: 6, weight: 1.3 },
  { mark: ' III', extra: 1, least: 7, weight: 1 },
  { mark: ' IV', extra: 1, least: 8, weight: 0.8 },
  { mark: ' V', extra: 1, least: 8, weight: 0.8 },
];

export function lapOf(lap: number): Lap {
  return LAPS[Math.max(0, Math.min(LAPS.length - 1, lap))];
}

/** A number raised evenly from what it is on the first lap to what it is on the last. */
export function raised(first: number, last: number, lap: number): number {
  const t = Math.max(0, Math.min(1, lap / (LAPS.length - 1)));
  return Math.round(first + (last - first) * t);
}
