// The packs. Every pack holds one card. A pack says which set its cards are
// of and which grades it can hand out: how good a pack is is in that range,
// not in luck.
//
// A land's pack as written here is the pack of the first lap. Each later
// lap has a pack of its own for that land, made from it: the same cards, at
// grades raised evenly toward the best two there are, for more coins. Its
// id is the pack's with the lap after an at sign: "thornwood@2" is what
// Thornwood drops the third time round.

import { GRADES } from '../game/rarity';
import { LAPS, lapOf, raised } from './laps';
import { lapPackCost } from './stages';

export interface PackDef {
  id: string;
  name: string;
  set: string;
  cost: number;
  /** The worst and best grades it hands out, as places in GRADES. */
  gradeMin: number;
  gradeMax: number;
  /** The land it is the pack of: the shop sells it once the line has reached that land. Always sold, if left out. */
  land?: string;
  /** How many stages must be cleared before the shop sells it. */
  after?: number;
  /** Which lap it is its land's pack of. 0, the first, if left out. */
  lap?: number;
  /**
   * What it holds of its set's structures, the buildings and the traps: "none"
   * for a pack of people only, "only" for a pack of structures and nothing else.
   * Left out, it holds both, and turns a structure over one time in five
   * (STRUCTURE_SHARE in game/rules.ts).
   */
  structures?: 'none' | 'only';
  blurb: string;
}

export const PACKS: readonly PackDef[] = [
  {
    // A new player's pack is people: there is no place to stand a tower yet.
    id: 'recruit', name: 'Recruit Pack', set: 'kingdom', cost: 60, gradeMin: 0, gradeMax: 2, structures: 'none',
    blurb: 'Soldiers of the Crownlands.',
  },
  {
    // Sold from the stage that opens the first place for a structure (STRUCTURES_AT in game/rules.ts).
    id: 'builder', name: "Builder's Pack", set: 'kingdom', cost: 140, gradeMin: 0, gradeMax: 3, structures: 'only', after: 8,
    blurb: 'Towers, walls and traps.',
  },
  {
    id: 'thornwood', name: 'Thornwood Pack', set: 'raiders', cost: 110, gradeMin: 0, gradeMax: 3, land: 'thornwood',
    blurb: 'The raiders of Thornwood.',
  },
  {
    id: 'dunes', name: 'Dunes Pack', set: 'sandsworn', cost: 260, gradeMin: 1, gradeMax: 4, land: 'sunscar',
    blurb: 'The Sandsworn of the dunes.',
  },
  {
    id: 'frost', name: 'Frost Pack', set: 'frostbound', cost: 560, gradeMin: 2, gradeMax: 5, land: 'frostholt',
    blurb: 'The Frostbound of Frostholt.',
  },
  {
    id: 'royal', name: 'Royal Pack', set: 'kingdom', cost: 900, gradeMin: 3, gradeMax: 6, after: 22,
    blurb: "The Crown's own, and its best grades.",
  },
];

/** The id of a land's pack on a lap. */
export function packIdAt(base: string, lap: number): string {
  return lap > 0 ? `${base}@${lap}` : base;
}

/** A land's pack on a lap: the same cards at better grades, for more coins. */
export function packAt(base: PackDef, lap: number): PackDef {
  if (lap <= 0 || !base.land) return base;
  const rule = lapOf(lap);
  const top = GRADES.length - 1;
  return {
    ...base,
    id: packIdAt(base.id, lap),
    name: `${base.name}${rule.mark}`,
    // It costs about what a win in its range pays, as the first lap's packs do.
    cost: lapPackCost(base.land, lap) ?? base.cost,
    // On the last lap every land's pack hands out the best two grades; between, the range climbs evenly.
    gradeMin: raised(base.gradeMin, top - 1, lap),
    gradeMax: raised(base.gradeMax, top, lap),
    lap,
  };
}

export function packById(id: string): PackDef {
  const [baseId, d] = id.split('@');
  const p = PACKS.find((x) => x.id === baseId);
  if (!p) throw new Error(`no pack "${id}"`);
  const n = d === undefined ? 0 : Number(d);
  if (!Number.isInteger(n) || n < 0 || n >= LAPS.length || (n > 0 && !p.land)) throw new Error(`no pack "${id}"`);
  return packAt(p, n);
}

/** Every pack there is, on every lap. */
export function allPacks(): PackDef[] {
  const out: PackDef[] = [];
  for (const p of PACKS) {
    out.push(p);
    if (p.land) for (let lap = 1; lap < LAPS.length; lap++) out.push(packAt(p, lap));
  }
  return out;
}
