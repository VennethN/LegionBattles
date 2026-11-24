// Where the board is on the screen, and how a place in the simulation
// becomes a place on it. The board is seen a little from above, so the
// simulation's square tiles are drawn wider than they are tall.
//
// Every field is drawn in the same rectangle. The first, 8 by 4, fills it
// with the tiles the painted ground was made for; a bigger field has smaller
// tiles, and everything on it (units, shots, effects) is drawn smaller by
// the same share, which is its zoom.

import { BOARD_X as ART_BOARD_X, BOARD_Y as ART_BOARD_Y, TILE_H as ART_TILE_H } from '../art/board';
import { BOARD_H, BOARD_W, COLS, TILE } from '../sim/constants';
import { FIRST_FIELD, halfOf, type Field } from '../sim/field';

/** How much flatter than wide the ground is drawn. */
export const Y_SCALE = ART_TILE_H / TILE;
export const BOARD_X = ART_BOARD_X;
export const BOARD_Y = ART_BOARD_Y;
/** The rectangle every field is drawn in. */
export const BOARD_PX_W = BOARD_W;
export const BOARD_PX_H = BOARD_H * Y_SCALE;

/** How big a unit's 192 canvas is drawn on the first field. */
export const UNIT_SCALE = 0.8;

/** A field on the screen. */
export class FieldLayout {
  readonly cols: number;
  readonly rows: number;
  /** The columns the player has. */
  readonly half: number;
  /** How much smaller than on the first field everything is drawn: 1 there, 2/3 on a field of 12 by 6. */
  readonly zoom: number;
  readonly tileW: number;
  readonly tileH: number;
  /** How big a unit's canvas is drawn here. */
  readonly unit: number;

  constructor(readonly field: Field = FIRST_FIELD) {
    this.cols = field.cols;
    this.rows = field.rows;
    this.half = halfOf(field);
    this.zoom = COLS / field.cols;
    this.tileW = BOARD_PX_W / field.cols;
    this.tileH = BOARD_PX_H / field.rows;
    this.unit = UNIT_SCALE * this.zoom;
  }

  screenX(simX: number): number {
    return BOARD_X + simX * this.zoom;
  }
  screenY(simY: number): number {
    return BOARD_Y + simY * Y_SCALE * this.zoom;
  }
  tileX(col: number): number {
    return BOARD_X + (col + 0.5) * this.tileW;
  }
  tileY(row: number): number {
    return BOARD_Y + (row + 0.5) * this.tileH;
  }

  /** The tile under a point of the screen, or null if it is off the board. */
  tileAt(x: number, y: number): { col: number; row: number } | null {
    const col = Math.floor((x - BOARD_X) / this.tileW);
    const row = Math.floor((y - BOARD_Y) / this.tileH);
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null;
    return { col, row };
  }
}
