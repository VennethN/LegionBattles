// Where the board is on the screen, and how a place in the simulation
// becomes a place on it. The board is seen a little from above, so the
// simulation's square tiles are drawn wider than they are tall.

import { BOARD_X as ART_BOARD_X, BOARD_Y as ART_BOARD_Y, TILE_H as ART_TILE_H } from '../art/board';
import { BOARD_H, BOARD_W, COLS, ROWS, TILE } from '../sim/constants';

export const Y_SCALE = ART_TILE_H / TILE;
export const TILE_W = TILE;
export const TILE_H = ART_TILE_H;
export const BOARD_X = ART_BOARD_X;
export const BOARD_Y = ART_BOARD_Y;
export const BOARD_PX_W = BOARD_W;
export const BOARD_PX_H = BOARD_H * Y_SCALE;

/** How big a unit's 192 canvas is drawn on the board. */
export const UNIT_SCALE = 0.8;

export function screenX(simX: number): number {
  return BOARD_X + simX;
}
export function screenY(simY: number): number {
  return BOARD_Y + simY * Y_SCALE;
}

export function tileScreenX(col: number): number {
  return BOARD_X + (col + 0.5) * TILE_W;
}
export function tileScreenY(row: number): number {
  return BOARD_Y + (row + 0.5) * TILE_H;
}

/** The tile under a point of the screen, or null if it is off the board. */
export function tileAt(x: number, y: number): { col: number; row: number } | null {
  const col = Math.floor((x - BOARD_X) / TILE_W);
  const row = Math.floor((y - BOARD_Y) / TILE_H);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return { col, row };
}
