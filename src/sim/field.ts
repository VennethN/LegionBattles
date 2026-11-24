// The field a battle is fought on: how many tiles across and down. The
// player's tiles are its left half, the enemy's its right.
//
// The first field, 8 by 4, is what everything is written on: a stage's
// enemies, a team's formation, a raid's guard. A bigger field has that one
// at its middle, the two front lines where they were, and more tiles behind
// each side and above and below. So a tile written on the first field can
// be outside it: column -1 is the fifth back from the player's front, row 4
// the one under the fourth.
//
// Pure arithmetic: no Phaser, no browser.

import { COLS, ROWS } from './constants';

export interface Field {
  cols: number;
  rows: number;
}

export const FIRST_FIELD: Field = { cols: COLS, rows: ROWS };

/** How many columns each side has. A field is always an even number across. */
export function halfOf(field: Field): number {
  return field.cols / 2;
}

/** What is added to a tile written on the first field to stand it the same way on this one. */
export function shiftOf(field: Field): { col: number; row: number } {
  return { col: (field.cols - COLS) / 2, row: Math.floor((field.rows - ROWS) / 2) };
}

export function isPlayerTile(col: number, row: number, field: Field = FIRST_FIELD): boolean {
  return col >= 0 && col < halfOf(field) && row >= 0 && row < field.rows;
}

export function isEnemyTile(col: number, row: number, field: Field = FIRST_FIELD): boolean {
  return col >= halfOf(field) && col < field.cols && row >= 0 && row < field.rows;
}

/** The rows of a field, the middle ones first: where a line forms up, and grows from. */
export function rowsFromMiddle(rows: number): number[] {
  const out: number[] = [];
  // For an even number the upper of the two middle rows comes first, as it always has on the first field.
  let up = Math.floor((rows - 1) / 2);
  let down = up + 1;
  while (up >= 0 || down < rows) {
    if (up >= 0) out.push(up--);
    if (down < rows) out.push(down++);
  }
  return out;
}

/**
 * Where an enemy written on the first field stands on this one. Its column
 * is as far behind its front line as it was written. Its row is spread over
 * the field's height: the four written rows over all the rows there are, so
 * that a line written to fill the first field is as wide as a bigger one.
 */
export function standEnemy(field: Field, col: number, row: number): [number, number] {
  const spread = Math.round((row * (field.rows - 1)) / (ROWS - 1));
  return [col + shiftOf(field).col, Math.max(0, Math.min(field.rows - 1, spread))];
}

/**
 * Where each of a team stands on a field, as tiles of that field. The team
 * is written on the first field's tiles and beyond them (see the top of this
 * file). Whoever's tile the field has, and no one before them took, stands
 * on it. The rest, who were set out on a bigger field than this, go one
 * after another to the free tile nearest where they were written, the
 * nearer the front on a tie. Nothing here is random.
 */
export function seatTeam(team: ReadonlyArray<{ col: number; row: number }>, field: Field): Array<[number, number]> {
  const shift = shiftOf(field);
  const half = halfOf(field);
  const taken = new Set<string>();
  const out: Array<[number, number] | null> = team.map((p) => {
    const col = p.col + shift.col;
    const row = p.row + shift.row;
    const key = `${col},${row}`;
    if (!isPlayerTile(col, row, field) || taken.has(key)) return null;
    taken.add(key);
    return [col, row];
  });
  return out.map((at, i) => {
    if (at) return at;
    const wantCol = team[i].col + shift.col;
    const wantRow = team[i].row + shift.row;
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let col = half - 1; col >= 0; col--) {
      for (let row = 0; row < field.rows; row++) {
        if (taken.has(`${col},${row}`)) continue;
        const d = (col - wantCol) * (col - wantCol) + (row - wantRow) * (row - wantRow);
        if (d < bestD) {
          bestD = d;
          best = [col, row];
        }
      }
    }
    if (!best) throw new Error('field: more units than tiles');
    taken.add(`${best[0]},${best[1]}`);
    return best;
  });
}

/** A tile of a field as it is written on the first one: what seatTeam undoes. */
export function writtenTile(field: Field, col: number, row: number): [number, number] {
  const shift = shiftOf(field);
  return [col - shift.col, row - shift.row];
}
