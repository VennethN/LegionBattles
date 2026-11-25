// Which picture stands for what. Every hunter, monster, helper, man and
// building of the game is shown with a figure of the art kit, named here
// and nowhere else: the screens ask this table, and the art build writes
// exactly what it names (scripts/art.game.ts).
//
// These are stand-ins. The game is to have a style of its own, and when its
// figures are drawn, bringing them in is this table and the art build: no
// screen names a picture.

/** A figure of the kit, and how big it is drawn on the field (1 is the kit's canvas, 192 units to a side). */
export interface Picture {
  unit: string;
  scale: number;
}

/** The side whose colors a figure is drawn in: the hunter's own in blue, what they hunt in red. */
export type Side = 'blue' | 'red';

export const HUNTER_ART: Record<string, Picture> = {
  marta: { unit: 'honorguard', scale: 0.68 },
  jory: { unit: 'poacher', scale: 0.66 },
  agnes: { unit: 'cleric', scale: 0.66 },
  brask: { unit: 'packmaster', scale: 0.68 },
};

export const MONSTER_ART: Record<string, Picture> = {
  sexton: { unit: 'gravedigger', scale: 1.75 },
  king: { unit: 'greatstag', scale: 1.7 },
};

export const HELPER_ART: Record<string, Picture> = {
  risen: { unit: 'shroud', scale: 0.56 },
};

/** Those who fight beside the hunter, by the reinforcement they came with. */
export const ALLY_ART: Record<string, Picture> = {
  pikemen: { unit: 'pikeman', scale: 0.56 },
  crossbowmen: { unit: 'crossbowman', scale: 0.56 },
  sappers: { unit: 'blaster', scale: 0.56 },
  hound: { unit: 'warhound', scale: 0.5 },
};

export const BUILDING_ART: Record<string, Picture> = {
  barricade: { unit: 'palisade', scale: 0.6 },
  watchfire: { unit: 'firepit', scale: 0.62 },
  bellpost: { unit: 'alarmbell', scale: 0.6 },
  ballista: { unit: 'ballista', scale: 0.6 },
};

/** What stands or lies on the field besides: a lair's stones, and a trap laid. */
export const STONE_ART: Picture = { unit: 'barrowstone', scale: 0.8 };
export const TRAP_ART: Picture = { unit: 'spiketrap', scale: 0.4 };

/** The ground of each kind of lair, by the name of the kit's ground it is drawn as. */
export const LAIR_GROUND: Record<string, 'meadow' | 'desert' | 'snow'> = { churchyard: 'meadow', wood: 'snow' };

/** Everything that is moved part by part: a hunter and a monster. */
export const RIGGED: ReadonlyArray<{ team: Side; unit: string }> = [
  ...Object.values(HUNTER_ART).map((p) => ({ team: 'blue' as const, unit: p.unit })),
  ...Object.values(MONSTER_ART).map((p) => ({ team: 'red' as const, unit: p.unit })),
];

/** Everything shown as one picture, changed between two as it walks. */
export const STILLS: ReadonlyArray<{ team: Side; unit: string }> = [
  ...Object.values(HELPER_ART).map((p) => ({ team: 'red' as const, unit: p.unit })),
  ...Object.values(ALLY_ART).map((p) => ({ team: 'blue' as const, unit: p.unit })),
  ...Object.values(BUILDING_ART).map((p) => ({ team: 'blue' as const, unit: p.unit })),
  { team: 'red', unit: STONE_ART.unit },
  { team: 'blue', unit: TRAP_ART.unit },
];

/** Everything shown whole on a card: the board's bills and the muster's ledger. */
export const WHOLE: ReadonlyArray<{ team: Side; unit: string }> = [
  ...Object.values(HUNTER_ART).map((p) => ({ team: 'blue' as const, unit: p.unit })),
  ...Object.values(MONSTER_ART).map((p) => ({ team: 'red' as const, unit: p.unit })),
  ...Object.values(ALLY_ART).map((p) => ({ team: 'blue' as const, unit: p.unit })),
  ...Object.values(BUILDING_ART).map((p) => ({ team: 'blue' as const, unit: p.unit })),
];
