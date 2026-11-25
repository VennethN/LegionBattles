// What is not a figure: the pieces a lair is dressed with, and the pieces of
// the interface. A thing is one picture of a size of its own, with the point
// it is stood by (its foot, for what stands on the ground).

import type { Doc } from './kit/draw';

export interface Thing {
  id: string;
  /** Where it belongs: a lair's name for scenery and ground, 'ui' for the interface. */
  set: string;
  width: number;
  height: number;
  /** The point it is placed by. */
  origin: readonly [number, number];
  draw: (d: Doc) => void;
}
