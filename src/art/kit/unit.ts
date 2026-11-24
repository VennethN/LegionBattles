// What a unit's art is: a list of parts in the order they are drawn, each on
// the same 192 by 192 canvas with the feet at (96, 180), so that stacking the
// parts at one place puts the unit together.

import { Doc } from './draw';
import type { Team } from './palette';
import type { Pt } from './path';

/**
 * What a part is to the rig. The game moves parts by their role, so a new
 * unit animates without any code of its own.
 */
export type Role =
  | 'shadow' // stays on the ground, never moves
  | 'legBack'
  | 'legFront'
  | 'body'
  | 'head'
  | 'weapon' // main hand
  | 'offhand'
  | 'extra'; // a plume, a cape, a quiver: follows its parent and sways

/** What a part hangs from: it turns and moves with it. */
export type Parent = 'root' | 'body' | 'head';

/** How the main hand attacks, which picks the animation. */
export type AttackStyle = 'slash' | 'chop' | 'thrust' | 'bow' | 'cast' | 'swing' | 'throw' | 'shoot';

export interface PartSpec {
  name: string;
  role: Role;
  parent: Parent;
  /** The point the part turns about: a weapon's hand, a head's neck, a leg's hip. */
  pivot: Pt;
  /** For an extra: how many degrees it lags and swings as the unit moves. */
  sway?: number;
  draw: (d: Doc, team: Team) => void;
}

export interface UnitArt {
  id: string;
  /** In draw order, back to front. */
  parts: PartSpec[];
  style: AttackStyle;
  /** Where a shot leaves from, on the canvas. */
  muzzle: Pt;
  /** The top of the unit, for the health bar over it. */
  top: number;
}

export function drawPart(unit: UnitArt, part: PartSpec, team: Team): Doc {
  const d = new Doc(`${unit.id}-${part.name}`);
  part.draw(d, team);
  return d;
}
