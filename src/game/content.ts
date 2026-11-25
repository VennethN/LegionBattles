// What there is in the game, as tables: the hunters and what they can do,
// the monsters and every attack they have, what can be called with the
// horn, what can be built in camp, and the numbers of a hunt. The rules
// that read these are in hunt.ts; what is opened and bought between hunts
// is in lodge.ts.
//
// A new hunter, monster, reinforcement or building is mostly a new entry
// here. A new kind of shape or ability is a few lines in hunt.ts as well.

/** How hard a contract is: one, two or three marks. */
export type Mark = 1 | 2 | 3;

export function byId<T extends { id: string }>(list: readonly T[], id: string): T {
  const found = list.find((x) => x.id === id);
  if (!found) throw new Error(`nothing is called ${id}`);
  return found;
}

// ------------------------------------------------------------ the field

/** The lair: its long side, its short side, and how far in from its rim anyone can stand. A wide window has it lying down, a tall one stood up. */
export const FIELD = { long: 1180, short: 800, edge: 46 };

/** How near the sleeping monster nothing can be built, and how near each other two buildings can stand. */
export const CAMP = { clear: 190, apart: 64, wakeAt: 120 };

/** How long after one call of the horn the next can be made. */
export const HORN_WAIT = 5;

/** After being struck, how long nothing else can hurt the hunter. Without it two tells landing together would be one death. */
export const HURT_GRACE = 0.45;

/** How long into a hunt the monster loses patience, and how much faster its tells are from then. A hunt must end. */
export const ENRAGE = { at: 420, faster: 0.7 };

/** What each mark does to a monster: its health, the harm of its blows, how long its tells show, and how long it walks between attacks. */
export const MARKS: Record<Mark, { hp: number; dmg: number; tell: number; gap: number; name: string }> = {
  1: { hp: 1, dmg: 1, tell: 1, gap: 1, name: 'First mark' },
  2: { hp: 1.2, dmg: 1.2, tell: 0.86, gap: 0.82, name: 'Second mark' },
  3: { hp: 1.4, dmg: 1.45, tell: 0.74, gap: 0.66, name: 'Third mark' },
};

// ------------------------------------------------------------ hunters

/** How a hunter strikes by themselves: a swing through an arc, or a bolt that flies. */
export interface StrikeDef {
  kind: 'arc' | 'bolt';
  /** How far it reaches. */
  reach: number;
  /** Seconds from one blow to the next. */
  every: number;
  dmg: number;
  /** Half the width of a swing, in degrees. */
  half?: number;
  /** How fast a bolt flies. */
  speed?: number;
  /** A bolt loosed from beyond this far does this much more. */
  far?: { beyond: number; by: number };
}

export type AbilityKind = 'brace' | 'sweep' | 'trap' | 'pool' | 'flare' | 'ward' | 'seton' | 'whistle';

/** One of a hunter's two abilities. `kind` says which rule in hunt.ts it is; the numbers are that rule's. */
export interface AbilityDef {
  id: string;
  name: string;
  /** What it does, for the muster's card. */
  says: string;
  kind: AbilityKind;
  /** Seconds before it can be used again. */
  wait: number;
  /** How wide it is, where it has a width. */
  r?: number;
  /** How long it lasts, where it lasts. */
  life?: number;
  dmg?: number;
  /** How much stagger it adds to the monster, flat. */
  stagger?: number;
  /** Seconds it holds or blinds the monster. */
  hold?: number;
  /** A share: how much less harm, how much slower, how much mended, how much more harm a held thing takes. */
  share?: number;
  /** How many of it can lie on the field at once. */
  most?: number;
  /** How far it can be thrown. */
  range?: number;
}

export const ABILITIES: readonly AbilityDef[] = [
  // Marta sets her halberd. The next of the monster's blows to reach her in `life` seconds is turned: it does nothing,
  // fills `stagger`, and she answers with a blow `share` times her own.
  { id: 'brace', name: 'Brace', says: 'Sets the halberd. The next blow that reaches her is turned and staggers the monster.', kind: 'brace', wait: 9, life: 1.4, stagger: 36, share: 2.5 },
  { id: 'reap', name: 'Reap', says: 'A wide sweep all round her that throws lesser things aside.', kind: 'sweep', wait: 8, r: 138, dmg: 30, stagger: 8 },
  // Jory's trap lies where he stood. What steps in it is held for `hold` seconds and takes `share` more while held.
  { id: 'jawtrap', name: 'Jaw Trap', says: 'Laid at his feet. What steps in it is held, and takes more while it is.', kind: 'trap', wait: 11, r: 30, life: 45, hold: 2.4, share: 0.3, stagger: 14, most: 2 },
  { id: 'tarflask', name: 'Tar Flask', says: 'A pool that slows what stands in it, and burns if fire touches it.', kind: 'pool', wait: 13, r: 96, life: 12, share: 0.45, dmg: 9, range: 400 },
  // Agnes's flare blinds the monster for `hold` seconds, which is an opening, and burns the small for `dmg`.
  { id: 'flare', name: 'Flare', says: 'A burst of light that blinds the monster for a moment and burns the small.', kind: 'flare', wait: 12, r: 190, hold: 1.9, dmg: 26, stagger: 16 },
  { id: 'lamp', name: 'Street Lamp', says: 'She stands a lamp on the ground. In its light allies are harder to hurt.', kind: 'ward', wait: 14, r: 120, life: 8, share: 0.5 },
  // Brask's hounds hold the monster for `hold` seconds and bite `share` times as hard for `life`.
  { id: 'seton', name: 'Set On', says: 'The hounds go for the monster and hold it.', kind: 'seton', wait: 14, hold: 2, life: 4.5, share: 2, stagger: 12 },
  { id: 'heel', name: 'Heel', says: 'The hounds come back to him, and all three mend.', kind: 'whistle', wait: 20, share: 0.2 },
];

export interface HunterDef {
  id: string;
  name: string;
  short: string;
  epithet: string;
  /** Who they are, in a line. */
  who: string;
  /** How they fight, for the muster. */
  way: string;
  hp: number;
  speed: number;
  /** The share of every blow that does not land on them: a heavy coat. */
  armor: number;
  strike: StrikeDef;
  /** The roll: how far, for how long nothing can hurt them, and how long before the next. */
  dodge: { dist: number; dur: number; wait: number };
  abilities: readonly [string, string];
  /** How many hounds come with them. */
  hounds?: number;
  /** What opens them: nothing, or a monster's trophy. */
  opens: string | null;
}

export const HUNTERS: readonly HunterDef[] = [
  {
    id: 'marta', name: 'Marta Voss', short: 'Marta', epithet: 'the Lychwarden', who: 'She kept the gate of a churchyard until what was in it got out.',
    way: 'Up close, with slow heavy blows. Hard to move.',
    hp: 125, speed: 158, armor: 0.22, strike: { kind: 'arc', reach: 98, every: 0.95, dmg: 16, half: 56 },
    dodge: { dist: 118, dur: 0.3, wait: 1.9 }, abilities: ['brace', 'reap'], opens: null,
  },
  {
    id: 'jory', name: 'Jory Pell', short: 'Jory', epithet: 'the Snaresman', who: 'He has never met the thing he could not catch, given a week.',
    way: 'From far off, always moving. His bolts bite harder from a distance.',
    hp: 84, speed: 186, armor: 0, strike: { kind: 'bolt', reach: 430, every: 1.05, dmg: 11, speed: 900, far: { beyond: 230, by: 0.35 } },
    dodge: { dist: 165, dur: 0.28, wait: 1.3 }, abilities: ['jawtrap', 'tarflask'], opens: 'spade',
  },
  {
    id: 'agnes', name: 'Agnes Thorn', short: 'Agnes', epithet: 'the Lamplighter', who: 'She lit the lamps of a town that is dark now. She kept the pole.',
    way: 'At middle reach, with fire and light.',
    hp: 104, speed: 166, armor: 0, strike: { kind: 'arc', reach: 152, every: 1.0, dmg: 13, half: 38 },
    dodge: { dist: 140, dur: 0.3, wait: 1.5 }, abilities: ['flare', 'lamp'], opens: 'antler',
  },
  {
    id: 'brask', name: 'Old Brask', short: 'Brask', epithet: 'the Kennelman', who: 'He talks to the dogs. He does not talk to anyone else.',
    way: 'With a boar spear, and two hounds that fight beside him.',
    hp: 104, speed: 166, armor: 0, strike: { kind: 'arc', reach: 118, every: 1.0, dmg: 13, half: 24 },
    dodge: { dist: 140, dur: 0.3, wait: 1.5 }, abilities: ['seton', 'heel'], hounds: 2, opens: 'antler',
  },
];

// ------------------------------------------------------------ who fights beside the hunter

export type AllyWay = 'hold' | 'shoot' | 'sap' | 'hound';

/** One of those who fight beside the hunter by themselves: a man of a reinforcement, or a hound. */
export interface AllyDef {
  /** How it fights: holds its ground, shoots from where it stands, runs in with a charge, or runs with the hunter. */
  way: AllyWay;
  hp: number;
  speed: number;
  reach: number;
  every: number;
  dmg: number;
  /** What a pikeman set against a charge does to whoever charges through him, and the stagger of it. */
  set?: { dmg: number; stagger: number };
  /** A sapper's charge: how wide, how long its fuse, its harm and its stagger. */
  blast?: { r: number; fuse: number; dmg: number; stagger: number };
}

export const HOUND: AllyDef = { way: 'hound', hp: 48, speed: 236, reach: 44, every: 0.8, dmg: 4 };

export interface ReinforcementDef {
  id: string;
  name: string;
  says: string;
  /** What it costs of the supply. */
  cost: number;
  /** How many times it can be called in a hunt, before any step is bought. */
  charges: number;
  men: number;
  /** Where they come on: a line in front of the hunter, a rank behind, or at a run from where the hunter stands. */
  form: 'line' | 'back' | 'run';
  /** True if the monster may turn on them and not on the hunter. */
  draws?: boolean;
  ally: AllyDef;
  opens: string | null;
}

export const REINFORCEMENTS: readonly ReinforcementDef[] = [
  {
    id: 'pikemen', name: 'Pikemen', says: 'Stand in a line where they are called and hold it. A charge that meets them is hurt.', cost: 2, charges: 1, men: 4, form: 'line', draws: true,
    ally: { way: 'hold', hp: 46, speed: 0, reach: 82, every: 0.9, dmg: 5, set: { dmg: 12, stagger: 6 } }, opens: null,
  },
  {
    id: 'crossbowmen', name: 'Crossbowmen', says: 'Stand back and shoot in volleys.', cost: 2, charges: 1, men: 3, form: 'back',
    ally: { way: 'shoot', hp: 26, speed: 0, reach: 600, every: 2.3, dmg: 9 }, opens: null,
  },
  {
    id: 'sappers', name: 'Sappers', says: 'Run in, set a charge on the monster and run out. The blast staggers it.', cost: 3, charges: 1, men: 2, form: 'run',
    ally: { way: 'sap', hp: 30, speed: 215, reach: 54, every: 0, dmg: 0, blast: { r: 88, fuse: 2, dmg: 110, stagger: 50 } }, opens: 'spade',
  },
];

// ------------------------------------------------------------ buildings

export type BuildingKind = 'ballista' | 'fire' | 'wall' | 'bell';

export interface BuildingDef {
  id: string;
  name: string;
  says: string;
  cost: number;
  hp: number;
  /** How much ground it takes: nothing walks through it. */
  r: number;
  kind: BuildingKind;
  /** How far it reaches: a ballista's range, a fire's light, how near the hunter must be to ring a bell. */
  reach: number;
  /** Seconds between a ballista's bolts, or between a bell's rings. */
  every?: number;
  dmg?: number;
  /** A share: how much faster those by a fire strike. */
  share?: number;
  stagger?: number;
  /** Seconds a monster that charged into it is dazed. */
  daze?: number;
  opens: string | null;
}

export const BUILDINGS: readonly BuildingDef[] = [
  { id: 'barricade', name: 'Barricade', says: 'Stops a charge once, and breaks. The monster that hit it is dazed.', cost: 1, hp: 90, r: 30, kind: 'wall', reach: 0, daze: 2.7, stagger: 34, opens: null },
  { id: 'watchfire', name: 'Watchfire', says: 'Light in a dark lair. Those near it strike faster.', cost: 2, hp: 60, r: 22, kind: 'fire', reach: 210, share: 0.3, opens: null },
  { id: 'bellpost', name: 'Bell Post', says: 'Rung by the hunter standing at it. Its sound breaks what the monster is preparing.', cost: 2, hp: 60, r: 22, kind: 'bell', reach: 96, every: 15, stagger: 20, daze: 1.6, opens: 'spade' },
  { id: 'ballista', name: 'Ballista', says: 'Shoots a heavy bolt at the monster every few seconds.', cost: 3, hp: 70, r: 28, kind: 'ballista', reach: 620, every: 4, dmg: 30, opens: 'antler' },
];

// ------------------------------------------------------------ monsters

/**
 * One of the shapes a monster's attack marks on the ground before it lands.
 * `after` is how long into the attack the shape appears; it then shows for
 * the attack's tell and lands.
 */
export type ShapeDef =
  /** A strip from the monster toward its mark, `turn` degrees off. */
  | { kind: 'line'; len: number; w: number; turn?: number; after?: number }
  /** A wedge from the monster toward its mark. */
  | { kind: 'cone'; r: number; half: number; turn?: number; after?: number }
  /** A circle on the monster or on its mark. With `inner`, the middle of it is safe. */
  | { kind: 'ring'; r: number; at: 'self' | 'target'; inner?: number; after?: number }
  /** `n` circles: scattered round the mark, anywhere on the field, or each where the hunter stands when it appears (`every` seconds apart). */
  | { kind: 'marks'; n: number; r: number; at: 'target' | 'field' | 'follow'; spread?: number; every?: number; after?: number }
  /** `n` strips right across the field with safe ground between them. */
  | { kind: 'lanes'; n: number; w: number; after?: number };

export interface AttackDef {
  id: string;
  name: string;
  /** Seconds a shape shows before it lands. */
  tell: number;
  /** Seconds the monster is open afterwards. */
  recover: number;
  dmg: number;
  shapes: readonly ShapeDef[];
  /** Only at this mark and above. */
  mark?: Mark;
  /** Only when its mark is at least this far off, or at most this near. Otherwise the next in its round is taken. */
  far?: number;
  near?: number;
  /** Helpers get up where its marks land. */
  summon?: string;
  /** The monster runs down its first line when it lands. Meeting a stone or a barricade dazes it. */
  charge?: { speed: number; daze: number; stagger: number };
  /** The hunter struck by it cannot move for this long. */
  root?: number;
}

/** A lesser thing that fights for a monster. */
export interface HelperDef {
  id: string;
  name: string;
  hp: number;
  speed: number;
  dmg: number;
  reach: number;
  every: number;
  /** Seconds its blow shows on the ground before it lands. */
  tell: number;
  /** The most of them a monster keeps on the field. */
  most: number;
}

export const HELPERS: readonly HelperDef[] = [
  { id: 'risen', name: 'the risen', hp: 34, speed: 78, dmg: 8, reach: 40, every: 1.6, tell: 0.5, most: 6 },
];

export interface MonsterDef {
  id: string;
  name: string;
  /** What the board says of it before it has been met. */
  rumor: string;
  /** What the board says once it has been hunted. */
  known: string;
  lair: 'churchyard' | 'wood';
  hp: number;
  speed: number;
  /** How much ground it takes. */
  r: number;
  /** How much stagger breaks it the first time, how much more each time after, how long it is down and how much more it takes then. */
  stagger: { max: number; grow: number; down: number; more: number };
  /** Seconds it walks between attacks, least and most. */
  gap: readonly [number, number];
  /** How near its mark it likes to stand. */
  reach: number;
  attacks: readonly AttackDef[];
  /** The round of attacks of each of its three parts, by name, in the order it uses them. */
  parts: readonly [readonly string[], readonly string[], readonly string[]];
  /** Standing stones in its lair: things a charge can be made to hit. */
  stones: number;
  /** Its trophy, by name, and what the trophy does for whoever wears it. */
  trophy: { id: string; name: string; says: string };
  /** The coin of each mark. The first fall at a mark pays twice. */
  pay: readonly [number, number, number];
  /** What must have been felled for its contract to be posted: nothing, or a monster. */
  after: string | null;
}

export const MONSTERS: readonly MonsterDef[] = [
  {
    id: 'sexton', name: 'The Sexton',
    rumor: 'The graves at Saint Odran are open, and someone is still digging.',
    known: 'His spade falls in lines. Where the ground is marked, the dead get up. He is slow: strike when the spade is down.',
    lair: 'churchyard', hp: 3400, speed: 62, r: 44, stagger: { max: 220, grow: 1.25, down: 4.5, more: 2 }, gap: [0.9, 1.5], reach: 150, stones: 0,
    attacks: [
      { id: 'spade', name: 'Spade', tell: 0.95, recover: 1.3, dmg: 20, shapes: [{ kind: 'line', len: 290, w: 78 }] },
      { id: 'sweep', name: 'Sweep', tell: 0.85, recover: 1.2, dmg: 18, near: 210, shapes: [{ kind: 'cone', r: 185, half: 66 }] },
      { id: 'graves', name: 'Open Graves', tell: 1.4, recover: 1.7, dmg: 12, summon: 'risen', shapes: [{ kind: 'marks', n: 3, r: 44, at: 'target', spread: 190 }] },
      // Three furrows, one after another, fanned.
      { id: 'furrow', name: 'Furrows', tell: 0.95, recover: 1.5, dmg: 20, shapes: [{ kind: 'line', len: 320, w: 62, turn: -30 }, { kind: 'line', len: 320, w: 62, after: 0.3 }, { kind: 'line', len: 320, w: 62, turn: 30, after: 0.6 }] },
      // His lantern: everything near him burns, so the answer is to be far or to be gone.
      { id: 'lantern', name: 'Grave Lantern', tell: 1.3, recover: 1.9, dmg: 24, shapes: [{ kind: 'ring', r: 200, at: 'self' }] },
      // The ground opens under the hunter again and again: keep moving.
      { id: 'bury', name: 'Bury', tell: 0.8, recover: 1.6, dmg: 16, shapes: [{ kind: 'marks', n: 6, r: 50, at: 'follow', every: 0.38 }] },
      { id: 'grasp', name: 'Grasping Hands', tell: 1.0, recover: 1.2, dmg: 9, root: 1.1, mark: 2, far: 170, shapes: [{ kind: 'ring', r: 82, at: 'target' }] },
      { id: 'cross', name: 'Cross', tell: 1.1, recover: 1.7, dmg: 19, mark: 3, shapes: [{ kind: 'line', len: 360, w: 74 }, { kind: 'line', len: 360, w: 74, turn: 90 }, { kind: 'line', len: 360, w: 74, turn: 180 }, { kind: 'line', len: 360, w: 74, turn: 270 }] },
      { id: 'moregraves', name: 'A Field of Graves', tell: 1.5, recover: 1.8, dmg: 10, summon: 'risen', mark: 3, shapes: [{ kind: 'marks', n: 5, r: 44, at: 'field' }] },
    ],
    parts: [
      ['spade', 'sweep', 'spade', 'graves', 'grasp'],
      ['furrow', 'sweep', 'graves', 'lantern', 'spade', 'grasp', 'cross'],
      ['bury', 'furrow', 'lantern', 'graves', 'sweep', 'cross', 'moregraves'],
    ],
    trophy: { id: 'spade', name: "The Sexton's Spade", says: 'Once in a hunt, the blow that would kill leaves one health instead.' },
    pay: [40, 70, 110], after: null,
  },
  {
    id: 'king', name: 'The Antlered King',
    rumor: 'Something crowned walks the winter wood, and the trees lean away from it.',
    known: 'He charges the length of the field. Stand so that a stone or a barricade is behind you, and step aside: what he hits dazes him.',
    lair: 'wood', hp: 4200, speed: 96, r: 46, stagger: { max: 250, grow: 1.25, down: 4.5, more: 2 }, gap: [0.7, 1.1], reach: 230, stones: 2,
    attacks: [
      { id: 'charge', name: 'Charge', tell: 1.05, recover: 0.8, dmg: 34, charge: { speed: 880, daze: 2.5, stagger: 30 }, shapes: [{ kind: 'line', len: 640, w: 84 }] },
      { id: 'gore', name: 'Gore', tell: 0.62, recover: 0.9, dmg: 23, near: 190, shapes: [{ kind: 'cone', r: 150, half: 54 }] },
      { id: 'stomp', name: 'Stomp', tell: 0.8, recover: 1.1, dmg: 21, near: 230, shapes: [{ kind: 'ring', r: 175, at: 'self' }] },
      // Roots break the ground round the hunter.
      { id: 'thorns', name: 'Thorns', tell: 1.0, recover: 1.2, dmg: 18, shapes: [{ kind: 'marks', n: 5, r: 48, at: 'target', spread: 170 }] },
      // His herd: the dead of the wood run the field in lanes, and the hunter stands between.
      { id: 'herd', name: 'The Herd', tell: 1.5, recover: 1.6, dmg: 25, shapes: [{ kind: 'lanes', n: 4, w: 96 }] },
      { id: 'bellow', name: 'Bellow', tell: 0.9, recover: 1.0, dmg: 17, mark: 2, shapes: [{ kind: 'ring', r: 280, at: 'self', inner: 120 }] },
      { id: 'crossherd', name: 'The Wild Hunt', tell: 1.6, recover: 1.8, dmg: 25, mark: 3, shapes: [{ kind: 'lanes', n: 4, w: 96 }, { kind: 'marks', n: 4, r: 48, at: 'target', spread: 200, after: 0.7 }] },
    ],
    parts: [
      ['charge', 'gore', 'stomp', 'charge', 'bellow'],
      ['charge', 'thorns', 'charge', 'gore', 'stomp', 'bellow'],
      ['herd', 'charge', 'thorns', 'charge', 'stomp', 'crossherd', 'charge'],
    ],
    trophy: { id: 'antler', name: "The King's Tine", says: 'A roll carries a quarter further, and comes back a quarter sooner.' },
    pay: [50, 85, 130], after: 'sexton',
  },
];

/** Monsters that are posted on the board but cannot yet be hunted: their names are not told. */
export const TO_COME: ReadonlyArray<{ id: string; after: string }> = [
  { id: 'spinner', after: 'king' },
  { id: 'abbot', after: 'king' },
  { id: 'furnace', after: 'king' },
  { id: 'glazier', after: 'king' },
];
