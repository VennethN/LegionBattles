// The fields battles are fought on, and which a world is fought on. The
// field grows as the line of stages goes on: a skirmish at first, on the
// field everything is written on, and a battlefield by the second lap, with
// room for a full team, its structures, and an enemy that fields as many.
//
// Every field is drawn in the same place on the screen. A bigger one has
// smaller tiles, and everyone on it is drawn smaller to match.

import type { Field } from '../sim/field';

export const FIELDS: readonly Field[] = [
  { cols: 8, rows: 4 },
  { cols: 10, rows: 5 },
  { cols: 12, rows: 6 },
];

/**
 * The field of a world, by its place among the worlds: the first world on
 * the first field, the rest of the first lap on the second, and every lap
 * after on the third.
 */
export function fieldOfWorld(world: number, lands: number): Field {
  if (world <= 0) return FIELDS[0];
  return world < lands ? FIELDS[1] : FIELDS[2];
}

/** How a field is said: "10 by 5". */
export function fieldName(field: Field): string {
  return `${field.cols} by ${field.rows}`;
}
