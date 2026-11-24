// Putting teams on the board. Pure: a seed in, placements out.

import { COLS, HALF_COLS, ROWS } from './constants';
import { FIRST_FIELD, rowsFromMiddle, shiftOf, type Field } from './field';
import { Rng } from './rng';
import type { Placement } from './types';

export { isPlayerTile } from './field';

/** `count` units drawn from the roster, repeats allowed, each on its own enemy tile of the first field. */
export function randomEnemyTeam(seed: number, roster: readonly string[], count = 4): Placement[] {
  const rng = new Rng(seed).fork(7);
  const free: Array<[number, number]> = [];
  for (let col = HALF_COLS; col < COLS; col++) for (let row = 0; row < ROWS; row++) free.push([col, row]);
  const out: Placement[] = [];
  for (let i = 0; i < count && free.length > 0; i++) {
    const unit = rng.pick(roster);
    const [col, row] = free.splice(rng.int(free.length), 1)[0];
    out.push({ unit, col, row });
  }
  return out;
}

/**
 * Where a team stands until the player moves it: fighters forward, the rest
 * behind, each line formed up from the middle of the field it is for. The
 * tiles are written as the first field's are (sim/field.ts): the front line
 * is column 3 on every field, and on a taller one the rows run past 0 to 3.
 */
export function defaultFormation(units: readonly string[], frontline: (unit: string) => boolean, field: Field = FIRST_FIELD): Placement[] {
  const shift = shiftOf(field);
  const rows = rowsFromMiddle(field.rows).map((r) => r - shift.row);
  const line = (col: number): Array<[number, number]> => rows.map((row) => [col, row]);
  const front = [...line(3), ...line(2)];
  const back = [...line(1), ...line(0)];
  // What a bigger field has behind those four columns is taken last.
  const behind: Array<[number, number]> = [];
  for (let col = -1; col >= -shift.col; col--) behind.push(...line(col));
  const taken = new Set<string>();
  const take = (list: Array<[number, number]>, other: Array<[number, number]>): [number, number] => {
    for (const t of [...list, ...other, ...behind]) {
      const key = `${t[0]},${t[1]}`;
      if (!taken.has(key)) {
        taken.add(key);
        return t;
      }
    }
    throw new Error('formation: more units than tiles');
  };
  return units.map((unit) => {
    const [col, row] = frontline(unit) ? take(front, back) : take(back, front);
    return { unit, col, row };
  });
}
