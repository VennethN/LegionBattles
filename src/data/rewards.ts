// What the game gives for coming back and for staying. Two tracks, by the
// owner's word of 24 November 2026: "Add daily rewards and playtime reward /
// The 2nd day daily reward will be an exclusive unit / 7th day as well / Then
// on playtime / 10 minute will get an exclusive pack".
//
// The calendar has seven days. A day is claimed once in a day of the
// player's own clock, and the next claim is the next day of the calendar: it
// is never a streak, so a day missed loses nothing. After the seventh it
// goes round again, and its two cards come a grade better each time.
//
// The playtime track counts the minutes played today and starts again each
// day. The rules for both are in game/rewards.ts.

/**
 * A thing given.
 *  coins  what this many wins at the stage the player has come to would pay
 *  packs  packs by their id, or "land" for the pack of the land the line is in
 *  unit   a card of a unit by name, at a grade
 */
export type Reward =
  | { kind: 'coins'; wins: number }
  | { kind: 'packs'; pack: string; count: number }
  | { kind: 'unit'; unit: string; grade: number };

/** The calendar: what each of its seven days gives. The second and the seventh give a card no pack holds. */
export const DAILY: readonly Reward[] = [
  { kind: 'coins', wins: 5 },
  { kind: 'unit', unit: 'lamplighter', grade: 2 },
  { kind: 'packs', pack: 'land', count: 2 },
  { kind: 'coins', wins: 10 },
  { kind: 'packs', pack: 'land', count: 3 },
  { kind: 'coins', wins: 15 },
  { kind: 'unit', unit: 'honorguard', grade: 3 },
];

export interface PlaytimeStep {
  /** Minutes played today. */
  minutes: number;
  reward: Reward;
}

/** The pack only the rewards give (data/packs.ts). */
export const GIFT_PACK = 'faithful';

/** The playtime track. Ten minutes gives the pack no shop sells. */
export const PLAYTIME: readonly PlaytimeStep[] = [
  { minutes: 2, reward: { kind: 'coins', wins: 2 } },
  { minutes: 5, reward: { kind: 'packs', pack: 'land', count: 1 } },
  { minutes: 10, reward: { kind: 'packs', pack: GIFT_PACK, count: 1 } },
  { minutes: 20, reward: { kind: 'coins', wins: 6 } },
  { minutes: 30, reward: { kind: 'packs', pack: GIFT_PACK, count: 1 } },
];

/** A frame that takes longer than this is not counted as time played: the tab was hidden, or the device slept. */
export const PLAYTIME_GAP = 2;
