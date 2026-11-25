// What each unit is for, beside its drawing: the set it belongs to, the part
// it plays, and how it is told from every other. A game reads this to pick
// units for a land or a list; the roster sheet groups by it; and writing a
// unit's line here is the first step of drawing it: if the line cannot be
// written, the unit has no silhouette yet.
//
// The units that were drawn before this file existed have their lines as the
// comments at the top of their own files.

/** The part a unit was drawn to play. A game may use it otherwise. */
export type UnitRole = 'melee' | 'ranged' | 'caster' | 'support' | 'captain' | 'boss' | 'beast' | 'mounted' | 'engine' | 'building' | 'trap';

export interface UnitNote {
  /** The set it was drawn for: a land, a people, a trade. */
  set: string;
  role: UnitRole;
  /** Read it by: its head, what it holds, what else. */
  read: string;
}

export const UNIT_NOTES: Record<string, UnitNote> = {};

/** Writes a unit's line. Twice for one unit is a mistake in the art, and stops the build. */
export function note(id: string, set: string, role: UnitRole, read: string): void {
  if (UNIT_NOTES[id]) throw new Error(`art: two units are called "${id}"`);
  UNIT_NOTES[id] = { set, role, read };
}
