// The packs. Every pack holds one card. A pack says which set its cards are
// of and which grades it can hand out: how good a pack is is in that range,
// not in luck.

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
  blurb: string;
}

export const PACKS: readonly PackDef[] = [
  {
    id: 'recruit', name: 'Recruit Pack', set: 'kingdom', cost: 60, gradeMin: 0, gradeMax: 2,
    blurb: 'Soldiers of the Crownlands. Grades F to D.',
  },
  {
    id: 'thornwood', name: 'Thornwood Pack', set: 'raiders', cost: 110, gradeMin: 0, gradeMax: 3, world: 'thornwood',
    blurb: 'Raiders you have beaten in Thornwood. Grades F to C.',
  },
  {
    id: 'dunes', name: 'Dunes Pack', set: 'sandsworn', cost: 260, gradeMin: 1, gradeMax: 4, world: 'sunscar',
    blurb: 'Sandsworn you have beaten in the dunes. Grades E to B.',
  },
  {
    id: 'frost', name: 'Frost Pack', set: 'frostbound', cost: 560, gradeMin: 2, gradeMax: 5, world: 'frostholt',
    blurb: 'Frostbound you have beaten in Frostholt. Grades D to A.',
  },
  {
    id: 'royal', name: 'Royal Pack', set: 'kingdom', cost: 900, gradeMin: 3, gradeMax: 6, after: 'sunscar',
    blurb: "The Crown's best. Grades C to S.",
  },
];

export function packById(id: string): PackDef {
  const p = PACKS.find((x) => x.id === id);
  if (!p) throw new Error(`no pack "${id}"`);
  return p;
}
