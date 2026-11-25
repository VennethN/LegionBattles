// The board and the clock. Distances in the simulation are in pixels at 1x,
// on a board where a tile is a square; the view draws it a little from above.

export const TILE = 120;
export const COLS = 8;
export const ROWS = 4;
/** The player's tiles are the left half, the enemy's the right. */
export const HALF_COLS = COLS / 2;
export const BOARD_W = COLS * TILE;
export const BOARD_H = ROWS * TILE;

/** One step of the simulation, in seconds. Everything happens on a step. */
export const DT = 0.05;
export const TICKS_PER_SECOND = 20;
/** A battle that is not over by now is called for the side with more health left. */
export const MAX_SECONDS = 90;

/**
 * Calling a skill. The player's units use their skills by themselves, as the
 * enemy's do; but for this long before one is ready, in seconds, the player
 * may call it, and it is used at once.
 */
export const CALL_WINDOW = 2.5;
/** What a called skill does, against one that went off by itself: its damage, its mending, and how long what it leaves lasts. */
export const CALL_BONUS = 1.25;

export function tileCenterX(col: number): number {
  return (col + 0.5) * TILE;
}
export function tileCenterY(row: number): number {
  return (row + 0.5) * TILE;
}

export function ticks(seconds: number): number {
  return Math.max(1, Math.round(seconds * TICKS_PER_SECOND));
}
