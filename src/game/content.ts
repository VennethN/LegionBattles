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
  1: { hp: 1, dmg: 1, tell: 1, gap: 1, name: 'Difficulty 1' },
  2: { hp: 1.2, dmg: 1.2, tell: 0.86, gap: 0.82, name: 'Difficulty 2' },
  3: { hp: 1.4, dmg: 1.45, tell: 0.74, gap: 0.66, name: 'Difficulty 3' },
};

// ------------------------------------------------------------ the first hunt

/**
 * One thing taught, by having it done. The monster does what the step says, again and again, and the hunt does not
 * go on to the next until the hunter has done what it wants once.
 */
export interface LessonStep {
  id: string;
  /**
   * What ends it: `move` so many units walked; `avoid` an attack landed and missed; `dodge` a dodge made while an
   * attack was shown, which then missed; `strike` so many of the hunter's own blows landed; `skill` one of the two
   * abilities used; `break` the monster's stagger filled.
   */
  wants: 'move' | 'avoid' | 'dodge' | 'strike' | 'skill' | 'break';
  /** How many, for `move` and `strike`. */
  n?: number;
  /** Which ability, for `skill`. */
  skill?: 0 | 1;
  /** The attack the monster makes while the step waits. Without one it stands and does nothing. */
  attack?: string;
  /** How much longer than usual that attack's warning is shown here. */
  slow?: number;
  /** True if the first warning of this step is worth holding the moment for: the view slows time as it appears. */
  hold?: boolean;
  /** What the plate says: where there are keys, and by touch. */
  says: { keys: string; touch: string };
}

/**
 * A hunt that teaches: a simpler monster, nothing brought, no camp, and steps the hunt waits on. What a contract
 * allows is here and not in a screen: the lodge makes a hunt of a lesson where one is due (lodge.ts, `lessonFor`).
 */
export interface LessonDef {
  id: string;
  monster: string;
  /** Who goes: the one hunter a new player has. */
  hunter: string;
  /** No camp: the monster is awake as the hunter walks in. */
  camp: false;
  /** What this hunt does to the monster in place of a mark: its health, the harm of its blows, how long its warnings show, how long it walks between attacks. */
  scale: { hp: number; dmg: number; tell: number; gap: number };
  /** Its rounds for this hunt, in place of its own parts: fewer attacks, and fewer parts. */
  parts: readonly (readonly string[])[];
  /** The share of its stagger it takes to break it here: the break is to be seen. */
  stagger: number;
  /** While steps are left, no blow takes the hunter under this share of their health. */
  spare: number;
  steps: readonly LessonStep[];
  /** Said when the last step is done. */
  after: string;
}

export const LESSONS: readonly LessonDef[] = [
  {
    // The Gravedigger for someone who has never played: two attacks, then a third when he changes, all slow.
    // About two minutes with the steps. Measured by `npm run pace -- --lesson`.
    id: 'first', monster: 'sexton', hunter: 'marta', camp: false,
    scale: { hp: 0.38, dmg: 0.6, tell: 1.6, gap: 1.5 },
    parts: [['spade', 'sweep'], ['spade', 'lantern', 'sweep']],
    stagger: 0.3, spare: 0.4,
    steps: [
      { id: 'move', wants: 'move', n: 150, says: { keys: 'Move: W A S D or the arrow keys', touch: 'Drag anywhere to move' } },
      { id: 'avoid', wants: 'avoid', attack: 'spade', slow: 1.5, hold: true, says: { keys: 'Red ground: he hits there. Move out of the red.', touch: 'Red ground: he hits there. Move out of the red.' } },
      { id: 'dodge', wants: 'dodge', attack: 'sweep', slow: 1.5, hold: true, says: { keys: 'Press SPACE to dodge out of the red', touch: 'Tap DODGE to get out of the red' } },
      { id: 'strike', wants: 'strike', n: 3, says: { keys: 'Go close to him. You attack by yourself.', touch: 'Go close to him. You attack by yourself.' } },
      // Her block lasts 1.4 seconds: the warning here is a little shorter, so that a press as the red shows turns the blow.
      { id: 'block', wants: 'skill', skill: 0, attack: 'spade', slow: 0.85, says: { keys: 'Press Q when the red shows: Block stops his hit', touch: 'Tap BLOCK when the red shows: it stops his hit' } },
      { id: 'sweep', wants: 'skill', skill: 1, says: { keys: 'Press E next to him: Sweep hits hard', touch: 'Tap SWEEP next to him: it hits hard' } },
      { id: 'break', wants: 'break', attack: 'spade', says: { keys: 'Hit him right after he swings. Fill the gold bar.', touch: 'Hit him right after he swings. Fill the gold bar.' } },
    ],
    after: 'Now finish him.',
  },
];

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
  { id: 'brace', name: 'Block', says: 'She blocks the next hit: no damage, and the boss is weakened.', kind: 'brace', wait: 9, life: 1.4, stagger: 36, share: 2.5 },
  { id: 'reap', name: 'Sweep', says: 'Hits everything around her for 30 damage and knocks small enemies back.', kind: 'sweep', wait: 8, r: 138, dmg: 30, stagger: 8 },
  // Jory's trap lies where he stood. What steps in it is held for `hold` seconds and takes `share` more while held.
  { id: 'jawtrap', name: 'Trap', says: 'Placed at his feet. It holds what steps in it for 2.4 seconds, and that takes 30% more damage.', kind: 'trap', wait: 11, r: 30, life: 45, hold: 2.4, share: 0.3, stagger: 14, most: 2 },
  { id: 'tarflask', name: 'Tar', says: 'A pool that slows the boss by 45%. Fire sets it burning.', kind: 'pool', wait: 13, r: 96, life: 12, share: 0.45, dmg: 9, range: 400 },
  // Agnes's flare blinds the monster for `hold` seconds, which is an opening, and burns the small for `dmg`.
  { id: 'flare', name: 'Flare', says: 'A flash that stops the boss for 1.9 seconds and deals 26 damage to small enemies.', kind: 'flare', wait: 10, r: 190, hold: 1.9, dmg: 26, stagger: 16 },
  { id: 'lamp', name: 'Lamp', says: 'A lamp on the ground for 8 seconds. Everyone in its light takes half damage.', kind: 'ward', wait: 14, r: 120, life: 8, share: 0.5 },
  // Brask's hounds hold the monster for `hold` seconds and bite `share` times as hard for `life`.
  { id: 'seton', name: 'Dogs Attack', says: 'The dogs hold the boss for 1.8 seconds and bite twice as hard for 4 seconds.', kind: 'seton', wait: 18, hold: 1.8, life: 4, share: 2, stagger: 10 },
  { id: 'heel', name: 'Call Back', says: 'The dogs come back, get up if they are down, and all three heal 15%.', kind: 'whistle', wait: 24, share: 0.15 },
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
    id: 'marta', name: 'Marta Voss', short: 'Marta', epithet: 'the Warden', who: 'She kept the gate of a churchyard until what was in it got out.',
    way: 'Close range. Slow, heavy hits. 125 Health, takes 22% less damage.',
    hp: 125, speed: 158, armor: 0.22, strike: { kind: 'arc', reach: 98, every: 0.95, dmg: 16, half: 56 },
    dodge: { dist: 118, dur: 0.3, wait: 1.9 }, abilities: ['brace', 'reap'], opens: null,
  },
  {
    id: 'jory', name: 'Jory Pell', short: 'Jory', epithet: 'the Poacher', who: 'He has never met the thing he could not catch, given a week.',
    way: 'Long range. Fast on his feet. 35% more damage from far away. 84 Health.',
    hp: 84, speed: 186, armor: 0, strike: { kind: 'bolt', reach: 430, every: 1.05, dmg: 11, speed: 900, far: { beyond: 230, by: 0.35 } },
    dodge: { dist: 165, dur: 0.28, wait: 1.3 }, abilities: ['jawtrap', 'tarflask'], opens: 'spade',
  },
  {
    id: 'agnes', name: 'Agnes Thorn', short: 'Agnes', epithet: 'the Lamplighter', who: 'She lit the lamps of a town that is dark now. She kept the pole.',
    way: 'Mid range. Fire and light. 112 Health.',
    hp: 112, speed: 170, armor: 0, strike: { kind: 'arc', reach: 152, every: 1.0, dmg: 15, half: 38 },
    dodge: { dist: 140, dur: 0.3, wait: 1.5 }, abilities: ['flare', 'lamp'], opens: 'antler',
  },
  {
    id: 'brask', name: 'Old Brask', short: 'Brask', epithet: 'the Dog Handler', who: 'He talks to the dogs. He does not talk to anyone else.',
    way: 'A spear and two dogs that fight beside him. 104 Health.',
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
    id: 'pikemen', name: 'Spearmen', says: 'Four men in a line in front of you. They hurt a boss that charges into them.', cost: 2, charges: 1, men: 4, form: 'line', draws: true,
    ally: { way: 'hold', hp: 46, speed: 0, reach: 82, every: 0.9, dmg: 5, set: { dmg: 12, stagger: 6 } }, opens: null,
  },
  {
    id: 'crossbowmen', name: 'Crossbowmen', says: 'Three men behind you who shoot the boss.', cost: 2, charges: 1, men: 3, form: 'back',
    ally: { way: 'shoot', hp: 26, speed: 0, reach: 600, every: 2.3, dmg: 9 }, opens: null,
  },
  {
    id: 'sappers', name: 'Bombers', says: 'Two men who run in and set a bomb: 110 damage each, and it weakens the boss.', cost: 3, charges: 1, men: 2, form: 'run',
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
  { id: 'barricade', name: 'Barricade', says: 'Stops one charge and breaks. The boss is dazed for 2.7 seconds.', cost: 1, hp: 90, r: 30, kind: 'wall', reach: 0, daze: 2.7, stagger: 34, opens: null },
  { id: 'watchfire', name: 'Campfire', says: 'Light. Everyone near it attacks 30% faster.', cost: 2, hp: 60, r: 22, kind: 'fire', reach: 210, share: 0.3, opens: null },
  { id: 'bellpost', name: 'Bell', says: 'Stand next to it while the boss prepares an attack: the bell stops the attack.', cost: 2, hp: 60, r: 22, kind: 'bell', reach: 96, every: 15, stagger: 20, daze: 1.6, opens: 'spade' },
  { id: 'ballista', name: 'Ballista', says: 'Shoots the boss for 30 damage every 4 seconds.', cost: 3, hp: 70, r: 28, kind: 'ballista', reach: 620, every: 4, dmg: 30, opens: 'antler' },
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
    id: 'sexton', name: 'The Gravedigger',
    rumor: 'The graves at Saint Odran are open, and someone is still digging.',
    known: 'His spade hits in lines. The dead rise where the ground is marked. He is slow: attack after he swings.',
    lair: 'churchyard', hp: 3400, speed: 62, r: 44, stagger: { max: 220, grow: 1.25, down: 4.5, more: 2 }, gap: [0.9, 1.5], reach: 150, stones: 0,
    attacks: [
      { id: 'spade', name: 'Spade Slam', tell: 0.95, recover: 1.3, dmg: 20, shapes: [{ kind: 'line', len: 290, w: 78 }] },
      { id: 'sweep', name: 'Sweep', tell: 0.85, recover: 1.2, dmg: 18, near: 210, shapes: [{ kind: 'cone', r: 185, half: 66 }] },
      { id: 'graves', name: 'Open Graves', tell: 1.4, recover: 1.7, dmg: 12, summon: 'risen', shapes: [{ kind: 'marks', n: 3, r: 44, at: 'target', spread: 190 }] },
      // Three furrows, one after another, fanned.
      { id: 'furrow', name: 'Three Slams', tell: 0.95, recover: 1.5, dmg: 20, shapes: [{ kind: 'line', len: 320, w: 62, turn: -30 }, { kind: 'line', len: 320, w: 62, after: 0.3 }, { kind: 'line', len: 320, w: 62, turn: 30, after: 0.6 }] },
      // His lantern: everything near him burns, so the answer is to be far or to be gone.
      { id: 'lantern', name: 'Lantern Burst', tell: 1.3, recover: 1.9, dmg: 24, shapes: [{ kind: 'ring', r: 200, at: 'self' }] },
      // The ground opens under the hunter again and again: keep moving.
      { id: 'bury', name: 'Bury', tell: 0.8, recover: 1.6, dmg: 16, shapes: [{ kind: 'marks', n: 6, r: 50, at: 'follow', every: 0.38 }] },
      { id: 'grasp', name: 'Grasping Hands', tell: 1.0, recover: 1.2, dmg: 9, root: 1.1, mark: 2, far: 170, shapes: [{ kind: 'ring', r: 82, at: 'target' }] },
      { id: 'cross', name: 'Four Slams', tell: 1.1, recover: 1.7, dmg: 19, mark: 3, shapes: [{ kind: 'line', len: 360, w: 74 }, { kind: 'line', len: 360, w: 74, turn: 90 }, { kind: 'line', len: 360, w: 74, turn: 180 }, { kind: 'line', len: 360, w: 74, turn: 270 }] },
      { id: 'moregraves', name: 'More Graves', tell: 1.5, recover: 1.8, dmg: 10, summon: 'risen', mark: 3, shapes: [{ kind: 'marks', n: 5, r: 44, at: 'field' }] },
    ],
    parts: [
      ['spade', 'sweep', 'spade', 'graves', 'grasp'],
      ['furrow', 'sweep', 'graves', 'lantern', 'spade', 'grasp', 'cross'],
      ['bury', 'furrow', 'lantern', 'graves', 'sweep', 'cross', 'moregraves'],
    ],
    trophy: { id: 'spade', name: "The Gravedigger's Spade", says: 'Once per hunt, a hit that would kill you leaves you at 1 Health.' },
    pay: [40, 70, 110], after: null,
  },
  {
    id: 'king', name: 'The Antlered King',
    rumor: 'Something crowned walks the winter wood, and the trees lean away from it.',
    known: 'He charges across the field. Stand in front of a stone or a barricade and step aside: he is dazed when he hits it.',
    lair: 'wood', hp: 4200, speed: 96, r: 46, stagger: { max: 330, grow: 1.25, down: 4.5, more: 2 }, gap: [0.55, 0.9], reach: 230, stones: 2,
    attacks: [
      { id: 'charge', name: 'Charge', tell: 1.05, recover: 0.8, dmg: 42, charge: { speed: 880, daze: 2.2, stagger: 30 }, shapes: [{ kind: 'line', len: 640, w: 84 }] },
      { id: 'gore', name: 'Gore', tell: 0.62, recover: 0.9, dmg: 28, near: 190, shapes: [{ kind: 'cone', r: 150, half: 54 }] },
      { id: 'stomp', name: 'Stomp', tell: 0.8, recover: 1.1, dmg: 26, near: 230, shapes: [{ kind: 'ring', r: 175, at: 'self' }] },
      // Roots break the ground round the hunter.
      { id: 'thorns', name: 'Thorns', tell: 0.95, recover: 1.2, dmg: 23, shapes: [{ kind: 'marks', n: 5, r: 48, at: 'target', spread: 170 }] },
      // His herd: the dead of the wood run the field in lanes, and the hunter stands between.
      { id: 'herd', name: 'Stampede', tell: 1.4, recover: 1.6, dmg: 30, shapes: [{ kind: 'lanes', n: 4, w: 96 }] },
      { id: 'bellow', name: 'Roar', tell: 0.9, recover: 1.0, dmg: 22, mark: 2, shapes: [{ kind: 'ring', r: 280, at: 'self', inner: 120 }] },
      { id: 'crossherd', name: 'Wild Stampede', tell: 1.6, recover: 1.8, dmg: 30, mark: 3, shapes: [{ kind: 'lanes', n: 4, w: 96 }, { kind: 'marks', n: 4, r: 48, at: 'target', spread: 200, after: 0.7 }] },
    ],
    parts: [
      ['charge', 'gore', 'stomp', 'charge', 'bellow'],
      ['charge', 'thorns', 'charge', 'gore', 'stomp', 'bellow'],
      ['herd', 'charge', 'thorns', 'charge', 'stomp', 'crossherd', 'charge'],
    ],
    trophy: { id: 'antler', name: "The King's Tine", says: 'Dodge goes 25% further and has 25% less Cooldown.' },
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
