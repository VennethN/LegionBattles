// The packs. Every pack holds one card. A pack says which set its cards are
// of and which grades it can hand out: how good a pack is is in that range,
// not in luck.
//
// A world's pack as written here is its Easy pack. Each harder difficulty of
// the world has a pack of its own, made from it: the same cards, at grades
// raised evenly toward the best two there are, for more coins. Its id is the world's with the
// difficulty after an at sign, as "thornwood@2" is Thornwood's Hard pack.

import { GRADES } from '../game/rarity';
import { DIFFICULTIES, difficulty, raised } from './difficulties';

export interface PackDef {
  id: string;
  name: string;
  set: string;
  cost: number;
  /** The worst and best grades it hands out, as places in GRADES. */
  gradeMin: number;
  gradeMax: number;
  /** The world that must be open before the shop sells it. Always, if left out. */
  world?: string;
  /** The world whose boss must have fallen before the shop sells it. */
  after?: string;
  /** Which difficulty of its world it is the pack of. 0, Easy, if left out. */
  difficulty?: number;
  blurb: string;
}

export const PACKS: readonly PackDef[] = [
  {
    id: 'recruit', name: 'Recruit Pack', set: 'kingdom', cost: 60, gradeMin: 0, gradeMax: 2,
    blurb: 'Soldiers of the Crownlands.',
  },
  {
    id: 'thornwood', name: 'Thornwood Pack', set: 'raiders', cost: 110, gradeMin: 0, gradeMax: 3, world: 'thornwood',
    blurb: 'Raiders you have beaten in Thornwood.',
  },
  {
    id: 'dunes', name: 'Dunes Pack', set: 'sandsworn', cost: 260, gradeMin: 1, gradeMax: 4, world: 'sunscar',
    blurb: 'Sandsworn you have beaten in the dunes.',
  },
  {
    id: 'frost', name: 'Frost Pack', set: 'frostbound', cost: 560, gradeMin: 2, gradeMax: 5, world: 'frostholt',
    blurb: 'Frostbound you have beaten in Frostholt.',
  },
  {
    id: 'royal', name: 'Royal Pack', set: 'kingdom', cost: 900, gradeMin: 3, gradeMax: 6, after: 'sunscar',
    blurb: "The Crown's own, and its best grades.",
  },
];

/** The id of a world's pack at a difficulty. */
export function packIdAt(base: string, d: number): string {
  return d > 0 ? `${base}@${d}` : base;
}

/** A world's pack at a difficulty: the same cards at better grades, for more coins. */
export function packAt(base: PackDef, d: number): PackDef {
  if (d <= 0 || !base.world) return base;
  const diff = difficulty(d);
  const top = GRADES.length - 1;
  return {
    ...base,
    id: packIdAt(base.id, d),
    name: `${base.name}, ${diff.name}`,
    cost: Math.round((base.cost * diff.packCost) / 10) * 10,
    // On Nightmare every world's pack hands out the best two grades; between, the range climbs evenly.
    gradeMin: raised(base.gradeMin, top - 1, d),
    gradeMax: raised(base.gradeMax, top, d),
    difficulty: d,
  };
}

export function packById(id: string): PackDef {
  const [baseId, d] = id.split('@');
  const p = PACKS.find((x) => x.id === baseId);
  if (!p) throw new Error(`no pack "${id}"`);
  const n = d === undefined ? 0 : Number(d);
  if (!Number.isInteger(n) || n < 0 || n >= DIFFICULTIES.length || (n > 0 && !p.world)) throw new Error(`no pack "${id}"`);
  return packAt(p, n);
}

/** Every pack there is, at every difficulty. */
export function allPacks(): PackDef[] {
  const out: PackDef[] = [];
  for (const p of PACKS) {
    out.push(p);
    if (p.world) for (let d = 1; d < DIFFICULTIES.length; d++) out.push(packAt(p, d));
  }
  return out;
}
