// Putting teams on the board. Pure: a seed in, placements out.

import { COLS, HALF_COLS, ROWS } from './constants';
import { Rng } from './rng';
import type { Placement } from './types';

/** `count` units drawn from the roster, repeats allowed, each on its own enemy tile. */
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

/** Where a team stands until the player moves it: fighters forward, the rest behind. */
export function defaultFormation(units: readonly string[], frontline: (unit: string) => boolean): Placement[] {
  const front: Array<[number, number]> = [[3, 1], [3, 2], [3, 0], [3, 3], [2, 1], [2, 2], [2, 0], [2, 3]];
  const back: Array<[number, number]> = [[1, 1], [1, 2], [1, 0], [1, 3], [0, 1], [0, 2], [0, 0], [0, 3]];
  const taken = new Set<string>();
  const take = (list: Array<[number, number]>, other: Array<[number, number]>): [number, number] => {
    for (const t of [...list, ...other]) {
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

export function isPlayerTile(col: number, row: number): boolean {
  return col >= 0 && col < HALF_COLS && row >= 0 && row < ROWS;
}
