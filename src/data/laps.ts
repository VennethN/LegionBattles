// The line of stages goes through the lands five times. Each time round is
// a lap, and a lap is a difficulty: the same stages, their enemies standing
// higher, more of them, paying more, and dropping a better pack. What they
// stand at and what they pay is the line's to say (stages.ts): it rises with
// a stage's number, so every stage of every world on every difficulty has
// its place on one scale.
//
// The owner has gone back and forth on this, and where it stands is both:
// "let's dismiss world entirely ... numbered waves ... so that everything
// fit on a linear scale", and then, on 24 November 2026, "Let's still add
// difficulties / It's still linear / ... the world will have its own
// difficulty of normal or hard". So a world is a land on a difficulty, its
// stages keep their numbers on the line, and which worlds are open is the
// rule in game/rules.ts (worldOpen): a world's next difficulty opens when it
// is beaten on the one before, and the world before it on that one.

export interface Lap {
  /** The difficulty's name: "Hard". */
  name: string;
  /** More enemies than the stage is written with: troops of its land, on free tiles. */
  extra: number;
  /**
   * The fewest enemies a stage fields on this lap. A land's first stages are
   * written with two or three, to teach a new player: met again by a team of
   * eight with its structures they would be no fight at all, so they are
   * filled up to this. It counts what a stage is worth, not heads: whoever
   * calls others up counts as those it calls, and a boss as three
   * (fieldedWorth in stages.ts).
   */
  least: number;
  /**
   * How much of a land's weight counts on this lap (lands.ts). Set by
   * measuring (npm run journey), last on 24 November 2026, when structures,
   * summoners and the bigger fields came: a team of eight with three
   * structures asks more of every lap than a team of eight did.
   */
  weight: number;
}

export const LAPS: readonly Lap[] = [
  { name: 'Normal', extra: 0, least: 0, weight: 0 },
  { name: 'Hard', extra: 0, least: 7, weight: 1.3 },
  { name: 'Expert', extra: 1, least: 8, weight: 1.2 },
  { name: 'Master', extra: 1, least: 9, weight: 1.2 },
  { name: 'Nightmare', extra: 2, least: 10, weight: 1.2 },
];

/** The difficulties' names, the easiest first. */
export const DIFFICULTIES: readonly string[] = LAPS.map((l) => l.name);

export function lapOf(lap: number): Lap {
  return LAPS[Math.max(0, Math.min(LAPS.length - 1, lap))];
}

/** A number raised evenly from what it is on the first lap to what it is on the last. */
export function raised(first: number, last: number, lap: number): number {
  const t = Math.max(0, Math.min(1, lap / (LAPS.length - 1)));
  return Math.round(first + (last - first) * t);
}
