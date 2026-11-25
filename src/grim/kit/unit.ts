// What a figure's art is: a list of parts in the order they are drawn, each
// on the figure's own canvas with the feet at one place, so that stacking the
// parts puts the figure together and a rig can move them.
//
// A hunter and a monster are not drawn on the same canvas: a monster is
// three to five times a hunter's height and is drawn at that size, with the
// same width of line, so that it is huge and not merely enlarged.

import { Doc } from './draw';
import type { Pt } from './path';
import type { Pose } from '../rig';

/** What a part is to the rig. The game moves parts by their role, so a new figure animates without code of its own. */
export type Role =
  | 'shadow' // the blot on the ground, which never moves
  | 'legBack'
  | 'legFront'
  | 'body'
  | 'head'
  | 'weapon' // the arm that strikes, drawn with what it holds: it turns at the shoulder, so the arm goes where the weapon goes
  | 'offhand' // the other arm and what it holds
  | 'extra'; // a coat's tails, a lantern, a chain: follows what it hangs from and sways

/** What a part hangs from: it turns and moves with it. */
export type Parent = 'root' | 'body' | 'head' | 'weapon' | 'offhand';

export interface PartSpec {
  name: string;
  role: Role;
  parent: Parent;
  /** The point the part turns about: a shoulder, a neck, a hip, where a lantern hangs. */
  pivot: Pt;
  /** For an extra: how many degrees it lags and swings for each degree the pose asks. */
  sway?: number;
  /** True for what hangs by a ring or a chain: it goes where its parent goes and does not turn with it, so a lamp stays upright on a halberd swung over. */
  hangs?: boolean;
  draw: (d: Doc) => void;
}

/** One thing a figure does: drawn back, then the blow. */
export interface Move {
  windup: Pose;
  strike: Pose;
}

export interface UnitArt {
  id: string;
  /** The canvas it is drawn on, and where its feet are on it. */
  canvas: readonly [number, number];
  feet: Pt;
  /** How much page its files have round the canvas, for what reaches past it. */
  margin: number;
  /** In draw order, back to front. */
  parts: PartSpec[];
  /** What it can do, by name. The first is what it does when nothing else is asked. */
  moves: Record<string, Move>;
  /** Other ways it stands: staggered, fallen, raising an arm. */
  stills?: Record<string, Pose>;
  /** Where a shot leaves from, on the canvas. */
  muzzle: Pt;
  /** The top of the figure, for a bar over it. */
  top: number;
}

export function drawPart(unit: UnitArt, part: PartSpec): Doc {
  const d = new Doc(`${unit.id}-${part.name}`);
  part.draw(d);
  return d;
}

/** A part, said shortly. */
export function part(name: string, role: Role, parent: Parent, pivot: Pt, draw: (d: Doc) => void, sway?: number, hangs?: boolean): PartSpec {
  return { name, role, parent, pivot, draw, ...(sway !== undefined ? { sway } : {}), ...(hangs ? { hangs } : {}) };
}
