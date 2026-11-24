// The worlds and their stages. A world has a length of its own: the first
// has 10 stages, and each after it has as many or a few more. The last stage
// is the world's only boss, and a miniboss comes about every fifth stage.
//
// A stage is written as who stands where. "cutpurse@4,1" is a Cutpurse on
// column 4, row 1 (columns 4 to 7 are the enemy's; rows are 0 to 3). A "+"
// after it makes it the stage's miniboss, and a "!" its boss: bigger, with
// more health and a harder blow.
//
// `grade` and `level` are what every enemy of the stage stands at, as a card
// would. They are set by measuring: `npm run journey` plays new players
// through and says where they stall.

import type { Ground } from '../art/board';

export type StageKind = 'normal' | 'miniboss' | 'boss';

export interface StageEnemy {
  unit: string;
  col: number;
  row: number;
  rank: 'troop' | 'elite' | 'boss';
}

export interface StageDef {
  name: string;
  kind: StageKind;
  grade: number;
  level: number;
  enemies: StageEnemy[];
}

export interface WorldDef {
  id: string;
  name: string;
  blurb: string;
  ground: Ground;
  /** The set its enemies are of, and the pack its stages drop. */
  set: string;
  pack: string;
  /** Coins for a first clear of its first stage and of its last; the stages between are spread evenly. */
  coins: [number, number];
  stages: StageDef[];
}

/** What a miniboss and a boss have over a troop of the same unit. */
export const RANK = {
  troop: { hp: 1, damage: 1, scale: 1 },
  elite: { hp: 1.9, damage: 1.15, scale: 1.14 },
  boss: { hp: 2.8, damage: 1.25, scale: 1.24 },
} as const;

function stage(name: string, kind: StageKind, grade: number, level: number, who: string): StageDef {
  const enemies = who.split(/\s+/).filter(Boolean).map((token): StageEnemy => {
    const m = /^([a-z]+)@(\d),(\d)([+!]?)$/.exec(token);
    if (!m) throw new Error(`stage "${name}": cannot read "${token}"`);
    return { unit: m[1], col: Number(m[2]), row: Number(m[3]), rank: m[4] === '!' ? 'boss' : m[4] === '+' ? 'elite' : 'troop' };
  });
  return { name, kind, grade, level, enemies };
}

export const WORLDS: readonly WorldDef[] = [
  {
    id: 'thornwood',
    name: 'Thornwood',
    blurb: 'Raiders have taken the forest road. Take it back.',
    ground: 'meadow',
    set: 'raiders',
    pack: 'thornwood',
    coins: [40, 150],
    stages: [
      stage("Wood's Edge", 'normal', 0, 1, 'cutpurse@4,1 cutpurse@5,2'),
      stage('The Deer Trail', 'normal', 0, 1, 'cutpurse@4,1 cutpurse@4,2 poacher@6,1'),
      stage('Snare Hollow', 'normal', 0, 2, 'cutpurse@4,0 cutpurse@4,2 cutpurse@5,3 poacher@6,1'),
      stage('The Toll Bridge', 'normal', 0, 2, 'cutpurse@4,1 cutpurse@4,2 poacher@6,0 poacher@6,3'),
      stage("Bruiser's Camp", 'miniboss', 0, 3, 'bruiser@4,1+ cutpurse@5,0 cutpurse@5,3 poacher@7,2'),
      stage('Bramble Maze', 'normal', 0, 4, 'bruiser@4,2 cutpurse@4,0 cutpurse@5,1 cutpurse@4,3 poacher@7,1'),
      stage("The Hexer's Circle", 'normal', 1, 4, 'bruiser@4,1 cutpurse@4,3 cutpurse@5,0 hexer@6,2 poacher@7,0'),
      stage("Smugglers' Ford", 'normal', 1, 5, 'bruiser@4,1 bruiser@4,2 poacher@6,0 poacher@6,3 hexer@7,1'),
      stage('The Palisade', 'normal', 1, 6, 'bruiser@4,2 cutpurse@4,0 cutpurse@4,3 poacher@6,1 poacher@7,3 hexer@6,2'),
      stage('The Warlord', 'boss', 1, 7, 'warlord@5,1! bruiser@4,0 bruiser@4,3 poacher@7,1 poacher@7,2 hexer@6,3'),
    ],
  },
  {
    id: 'sunscar',
    name: 'Sunscar Dunes',
    blurb: 'Past the forest, sand. The Sandsworn keep an old road and an older guard.',
    ground: 'desert',
    set: 'sandsworn',
    pack: 'dunes',
    coins: [130, 380],
    stages: [
      stage('The Dry Well', 'normal', 1, 4, 'lancer@4,1 lancer@4,2 lancer@5,0'),
      stage('Caravan Tracks', 'normal', 1, 4, 'lancer@4,1 lancer@4,2 javelineer@6,0 javelineer@6,3'),
      stage('The Salt Flat', 'normal', 1, 5, 'lancer@4,0 lancer@4,1 lancer@4,3 javelineer@6,1 javelineer@6,2'),
      stage('Siege Camp', 'normal', 1, 6, 'lancer@4,1 lancer@4,2 javelineer@5,0 ballista@7,1 ballista@7,2'),
      stage('Windcut Pass', 'normal', 2, 6, 'lancer@4,0 lancer@4,2 lancer@5,3 javelineer@6,1 javelineer@6,2 ballista@7,0'),
      stage('The Ember Shrine', 'miniboss', 2, 7, 'pyromancer@6,1+ lancer@4,0 lancer@4,1 lancer@4,2 javelineer@6,3'),
      stage('Glass Dunes', 'normal', 2, 8, 'lancer@4,1 lancer@4,2 javelineer@5,0 javelineer@5,3 pyromancer@7,1 ballista@7,3'),
      stage('The Sunken Gate', 'normal', 2, 8, 'lancer@4,0 lancer@4,1 lancer@4,2 lancer@4,3 pyromancer@6,1 pyromancer@6,2'),
      stage('Scorpion Rocks', 'normal', 2, 9, 'lancer@4,1 lancer@4,2 javelineer@5,0 javelineer@5,3 ballista@7,0 ballista@7,3 pyromancer@6,1'),
      stage('The Long Stair', 'normal', 3, 9, 'lancer@4,0 lancer@4,1 lancer@4,2 lancer@4,3 javelineer@6,0 javelineer@6,3 pyromancer@7,1 pyromancer@7,2'),
      stage('Hall of Pillars', 'miniboss', 3, 10, 'ballista@7,1+ lancer@4,0 lancer@4,1 lancer@4,2 lancer@4,3 pyromancer@6,0 javelineer@6,3'),
      stage('The Colossus', 'boss', 3, 11, 'colossus@5,1! lancer@4,0 lancer@4,3 javelineer@6,0 javelineer@6,3 pyromancer@7,1 pyromancer@7,2'),
    ],
  },
  {
    id: 'frostholt',
    name: 'Frostholt',
    blurb: 'The road ends at a frozen hall, and the Jarl who has never lost it.',
    ground: 'snow',
    set: 'frostbound',
    pack: 'frost',
    coins: [340, 900],
    stages: [
      stage('The Snowline', 'normal', 2, 8, 'huscarl@4,1 huscarl@4,2 huscarl@5,0'),
      stage('Frozen Shore', 'normal', 2, 8, 'huscarl@4,1 huscarl@4,2 harpooner@6,0 harpooner@6,3'),
      stage('Whalebone Arch', 'normal', 2, 9, 'huscarl@4,0 huscarl@4,1 huscarl@4,3 harpooner@6,1 harpooner@6,2'),
      stage('The Ice Road', 'normal', 2, 10, 'huscarl@4,0 huscarl@4,1 huscarl@4,2 huscarl@4,3 harpooner@6,1 harpooner@6,2'),
      stage('The Rime Cairn', 'miniboss', 3, 10, 'icegolem@5,1+ huscarl@4,0 huscarl@4,3 harpooner@6,0 harpooner@6,3'),
      stage('Blue Crevasse', 'normal', 3, 11, 'icegolem@4,1 huscarl@4,0 huscarl@4,3 harpooner@6,0 harpooner@6,2 harpooner@6,3'),
      stage('The Still Lake', 'normal', 3, 11, 'icegolem@4,1 icegolem@4,2 huscarl@5,0 huscarl@5,3 harpooner@7,1 harpooner@7,2'),
      stage("Witch's Hollow", 'normal', 3, 12, 'frostwitch@6,1 huscarl@4,0 huscarl@4,1 huscarl@4,2 icegolem@4,3 harpooner@7,3'),
      stage('The Howling Stair', 'normal', 3, 13, 'icegolem@4,1 huscarl@4,0 huscarl@4,2 huscarl@4,3 frostwitch@6,0 harpooner@6,2 harpooner@7,3'),
      stage('The Pale Sisters', 'miniboss', 4, 13, 'frostwitch@6,1+ frostwitch@6,2 huscarl@4,0 huscarl@4,1 huscarl@4,2 huscarl@4,3'),
      stage('Hall Gate', 'normal', 4, 14, 'icegolem@4,1 icegolem@4,2 huscarl@4,0 huscarl@4,3 frostwitch@6,1 harpooner@7,0 harpooner@7,3'),
      stage('The Mead Hall', 'normal', 4, 14, 'huscarl@4,0 huscarl@4,1 huscarl@4,2 huscarl@4,3 icegolem@5,1 frostwitch@7,1 frostwitch@7,2 harpooner@6,3'),
      stage('The Frozen Court', 'normal', 4, 15, 'icegolem@4,0 icegolem@4,3 huscarl@4,1 huscarl@4,2 frostwitch@6,1 frostwitch@6,2 harpooner@7,0 harpooner@7,3'),
      stage('The Throne Steps', 'normal', 4, 16, 'icegolem@4,1 icegolem@4,2 huscarl@5,0 huscarl@5,3 huscarl@4,0 huscarl@4,3 frostwitch@7,1 frostwitch@7,2'),
      stage('The Jarl', 'boss', 5, 16, 'jarl@5,1! icegolem@4,0 icegolem@4,3 huscarl@4,2 frostwitch@7,0 frostwitch@7,3 harpooner@7,1 harpooner@7,2'),
    ],
  },
];

export function worldById(id: string): WorldDef {
  const w = WORLDS.find((x) => x.id === id);
  if (!w) throw new Error(`no world "${id}"`);
  return w;
}

/** Coins for the first clear of a stage. A replay pays half. */
export function stageCoins(world: WorldDef, index: number): number {
  const n = world.stages.length;
  const t = n > 1 ? index / (n - 1) : 0;
  const base = world.coins[0] + (world.coins[1] - world.coins[0]) * t;
  const kind = world.stages[index].kind;
  return Math.round((base * (kind === 'boss' ? 1.6 : kind === 'miniboss' ? 1.25 : 1)) / 5) * 5;
}
