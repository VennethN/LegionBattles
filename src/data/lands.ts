// The lands the line of stages runs through, and the stages written for
// each. A land is where a run of stages is fought: it decides the ground,
// who the enemies are and which pack they drop. The player is never shown a
// land to pick: they see one numbered line of stages (stages.ts), and the
// lands are stretches of it. The first has 10 stages, and each after it has
// as many or a few more. The last stage of a land is its only boss, and a
// miniboss comes about every fifth stage.
//
// A stage is written as who stands where. "cutpurse@4,1" is a Cutpurse on
// column 4, row 1 (columns 4 to 7 are the enemy's; rows are 0 to 3). A "+"
// after it makes it the stage's miniboss, and a "!" its boss: bigger, with
// more health and a harder blow.
//
// `grade` and `level` are what every enemy of the stage stands at the first
// time the line comes through, as a card would. They are set by measuring:
// `npm run journey` plays new players through and says where they stall.

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

export interface LandDef {
  id: string;
  name: string;
  blurb: string;
  ground: Ground;
  /** The set its enemies are of, and the pack its stages drop. */
  set: string;
  pack: string;
  /** Coins for a first clear of its first stage and of its last; the stages between are spread evenly. */
  coins: [number, number];
  /**
   * How much more its troops are raised on later laps than their numbers
   * alone would ask. A land's units are not all as hard to fight at the same
   * health and damage: raiders have simpler skills than the Frostbound, and
   * their stages are smaller. Set by measuring (npm run journey), so that a
   * land met again is as much of a fight as the land before it was.
   */
  weight: number;
  stages: StageDef[];
}

/** What a miniboss and a boss have over a troop of the same unit. */
export const RANK = {
  troop: { hp: 1, damage: 1, scale: 1 },
  elite: { hp: 1.4, damage: 1, scale: 1.14 },
  boss: { hp: 1.6, damage: 1, scale: 1.24 },
} as const;

/** A stage as it is written: its name, its kind, what its enemies stand at, and who stands where. */
export function stage(name: string, kind: StageKind, grade: number, level: number, who: string): StageDef {
  const enemies = who.split(/\s+/).filter(Boolean).map((token): StageEnemy => {
    const m = /^([a-z]+)@(\d),(\d)([+!]?)$/.exec(token);
    if (!m) throw new Error(`stage "${name}": cannot read "${token}"`);
    return { unit: m[1], col: Number(m[2]), row: Number(m[3]), rank: m[4] === '!' ? 'boss' : m[4] === '+' ? 'elite' : 'troop' };
  });
  return { name, kind, grade, level, enemies };
}

export const LANDS: readonly LandDef[] = [
  {
    id: 'thornwood',
    name: 'Thornwood',
    blurb: 'Raiders have taken the forest road. Take it back.',
    ground: 'meadow',
    set: 'raiders',
    pack: 'thornwood',
    coins: [40, 150],
    weight: 1.3,
    stages: [
      stage("Wood's Edge", 'normal', 0, 1, 'cutpurse@4,1 cutpurse@5,2'),
      stage('The Deer Trail', 'normal', 0, 1, 'cutpurse@4,1 cutpurse@4,2 poacher@6,1'),
      stage('Snare Hollow', 'normal', 0, 1, 'cutpurse@4,0 cutpurse@4,2 cutpurse@5,3 poacher@6,1 bramblesnare@4,1'),
      stage('The Toll Bridge', 'normal', 0, 2, 'cutpurse@4,1 cutpurse@4,2 poacher@6,0 poacher@6,3 lookout@7,1'),
      stage("Bruiser's Camp", 'miniboss', 0, 2, 'bruiser@4,1+ cutpurse@5,0 cutpurse@5,3 poacher@7,2'),
      stage('Bramble Maze', 'normal', 0, 2, 'bruiser@4,2 cutpurse@4,0 cutpurse@5,1 cutpurse@4,3 poacher@7,1 bramblesnare@4,1 bramblesnare@5,2 ringleader@7,3'),
      stage("The Hexer's Circle", 'normal', 0, 3, 'bruiser@4,1 cutpurse@4,3 cutpurse@5,0 hexer@6,2 poacher@7,0'),
      stage("Smugglers' Ford", 'normal', 0, 3, 'bruiser@4,1 bruiser@4,2 poacher@6,0 poacher@6,3 hexer@7,1 raidertent@7,2'),
      stage('The Palisade', 'normal', 0, 4, 'bruiser@4,2 cutpurse@4,0 cutpurse@4,3 poacher@6,1 poacher@7,3 hexer@6,2 lookout@7,0 bramblesnare@4,1 ringleader@7,2'),
      stage('The Warlord', 'boss', 0, 4, 'warlord@5,1! bruiser@4,2 cutpurse@4,0 poacher@7,1 poacher@7,2 hexer@6,3 bramblesnare@4,1'),
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
    weight: 1.12,
    stages: [
      stage('The Dry Well', 'normal', 1, 3, 'lancer@4,1 lancer@4,2 lancer@5,0'),
      stage('Caravan Tracks', 'normal', 1, 3, 'lancer@4,1 lancer@4,2 javelineer@6,0 javelineer@6,3'),
      stage('The Salt Flat', 'normal', 1, 4, 'lancer@4,0 lancer@4,1 lancer@4,3 javelineer@6,1 javelineer@6,2 firepit@4,2'),
      stage('Siege Camp', 'normal', 1, 4, 'lancer@4,1 lancer@4,2 javelineer@5,0 ballista@7,1 ballista@7,2'),
      stage('Windcut Pass', 'normal', 1, 4, 'lancer@4,0 lancer@4,2 lancer@5,3 javelineer@6,1 javelineer@6,2 ballista@7,0 sunobelisk@7,2'),
      stage('The Ember Shrine', 'miniboss', 1, 5, 'pyromancer@6,1+ lancer@4,0 lancer@4,1 lancer@4,2 javelineer@6,3 firepit@5,1'),
      stage('Glass Dunes', 'normal', 1, 5, 'lancer@4,1 lancer@4,2 javelineer@5,0 javelineer@5,3 pyromancer@7,1 ballista@7,3 drummer@6,2'),
      stage('The Sunken Gate', 'normal', 1, 6, 'lancer@4,0 lancer@4,1 lancer@4,2 lancer@4,3 pyromancer@6,1 pyromancer@6,2 wartent@7,1'),
      stage('Scorpion Rocks', 'normal', 1, 6, 'lancer@4,1 lancer@4,2 javelineer@5,0 javelineer@5,3 ballista@7,0 pyromancer@6,1 sunobelisk@7,2'),
      stage('The Long Stair', 'normal', 2, 6, 'lancer@4,0 lancer@4,1 lancer@4,2 lancer@4,3 javelineer@6,0 javelineer@6,3 pyromancer@7,1 firepit@5,1 drummer@7,2'),
      stage('Hall of Pillars', 'miniboss', 2, 7, 'ballista@7,1+ lancer@4,0 lancer@4,1 lancer@4,2 lancer@4,3 pyromancer@6,0 javelineer@6,3 sunobelisk@7,0 sunobelisk@7,3'),
      stage('The Colossus', 'boss', 2, 7, 'colossus@5,1! lancer@4,0 lancer@4,3 javelineer@6,0 javelineer@6,3 pyromancer@7,1'),
    ],
  },
  {
    id: 'frostholt',
    name: 'Frostholt',
    blurb: 'The road ends at a frozen hall that has never been taken.',
    ground: 'snow',
    set: 'frostbound',
    pack: 'frost',
    coins: [340, 900],
    weight: 1.06,
    stages: [
      stage('The Snowline', 'normal', 2, 6, 'huscarl@4,1 huscarl@4,2 huscarl@5,0'),
      stage('Frozen Shore', 'normal', 2, 6, 'huscarl@4,1 huscarl@4,2 harpooner@6,0 harpooner@6,3'),
      stage('Whalebone Arch', 'normal', 2, 7, 'huscarl@4,0 huscarl@4,1 huscarl@4,3 harpooner@6,1 harpooner@6,2 frostrune@4,2'),
      stage('The Ice Road', 'normal', 2, 7, 'huscarl@4,0 huscarl@4,1 huscarl@4,2 huscarl@4,3 harpooner@6,1 harpooner@6,2 frostspire@7,0'),
      stage('The Rime Cairn', 'miniboss', 2, 8, 'icegolem@5,1+ huscarl@4,0 huscarl@4,3 harpooner@6,0 harpooner@6,3'),
      stage('Blue Crevasse', 'normal', 3, 8, 'icegolem@4,1 huscarl@4,0 huscarl@4,3 harpooner@6,0 harpooner@6,2 harpooner@6,3 frostrune@4,2 skald@7,1'),
      stage('The Still Lake', 'normal', 3, 8, 'icegolem@4,1 icegolem@4,2 huscarl@5,0 huscarl@5,3 harpooner@7,1 harpooner@7,2 frostrune@4,0 frostrune@4,3'),
      stage("Witch's Hollow", 'normal', 3, 8, 'frostwitch@6,1 huscarl@4,0 huscarl@4,1 huscarl@4,2 icegolem@4,3 harpooner@7,3 frostspire@7,0'),
      stage('The Howling Stair', 'normal', 3, 9, 'icegolem@4,1 huscarl@4,0 huscarl@4,2 huscarl@4,3 frostwitch@6,0 harpooner@6,2 harpooner@7,3 longhouse@7,1'),
      stage('The Pale Sisters', 'miniboss', 3, 9, 'frostwitch@6,1+ frostwitch@6,2 huscarl@4,0 huscarl@4,1 huscarl@4,2 huscarl@4,3 frostrune@5,1'),
      stage('Hall Gate', 'normal', 3, 9, 'icegolem@4,1 icegolem@4,2 huscarl@4,0 huscarl@4,3 frostwitch@6,1 harpooner@7,0 harpooner@7,3 frostspire@7,1 skald@6,2'),
      stage('The Mead Hall', 'normal', 3, 9, 'huscarl@4,0 huscarl@4,1 huscarl@4,2 icegolem@5,1 frostwitch@7,1 frostwitch@7,2 harpooner@6,3 longhouse@7,0'),
      stage('The Frozen Court', 'normal', 3, 10, 'icegolem@4,0 huscarl@4,1 huscarl@4,2 huscarl@4,3 frostwitch@6,1 harpooner@7,0 harpooner@7,3 frostrune@5,1 frostrune@5,2 skald@7,1'),
      stage('The Throne Steps', 'normal', 3, 10, 'icegolem@4,1 icegolem@4,2 huscarl@4,0 huscarl@4,3 harpooner@6,0 frostwitch@7,1 frostwitch@7,2 frostspire@7,0'),
      stage('The Jarl', 'boss', 3, 10, 'jarl@5,1! icegolem@4,0 icegolem@4,3 huscarl@4,2 frostwitch@7,0 harpooner@7,1 harpooner@7,2'),
    ],
  },
];

export function landById(id: string): LandDef {
  const w = LANDS.find((x) => x.id === id);
  if (!w) throw new Error(`no land "${id}"`);
  return w;
}

/** Coins for the first clear of a stage of a land, the first time the line comes through. A replay pays half. */
export function landCoins(world: LandDef, index: number): number {
  const n = world.stages.length;
  const t = n > 1 ? index / (n - 1) : 0;
  const base = world.coins[0] + (world.coins[1] - world.coins[0]) * t;
  const kind = world.stages[index].kind;
  return Math.round((base * (kind === 'boss' ? 1.6 : kind === 'miniboss' ? 1.25 : 1)) / 5) * 5;
}
