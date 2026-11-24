// The dungeons and the raids: places off the line of stages, each in one of
// the lands, modelled on the owner's Roblox game.
//
// A dungeon is a run of floors fought one after another with one roster.
// Nothing heals between floors and the fallen stay fallen, so the roster has
// reserves, and the choice at each floor is who to send in. Only clearing
// the last floor pays.
//
// A raid is one long battle against a land's lord, grown huge, who calls up
// more of his own for as long as he stands.
//
// Each has five tiers, as the line has five laps: a tier's enemies stand
// where the land's own boss stands on that lap, a little higher. The first
// tier opens at a stage of the line, and each tier after it by clearing the
// one before.

import { stage, type StageDef, type StageEnemy } from './lands';
import { DIFFICULTIES } from './laps';

/** How many tiers a dungeon or a raid has, and what each is called: the difficulties' own names, as a tier is measured by a land's boss on that difficulty. */
export const TIER_MARKS: readonly string[] = DIFFICULTIES;
/** How many cards a dungeon's roster has beyond those that fight at once. */
export const RESERVES = 2;

export interface DungeonDef {
  id: string;
  name: string;
  blurb: string;
  /** Its land's place in LANDS: the ground it is fought on, who is in it, whose pack it pays. */
  land: number;
  /** How many stages of the line must be cleared for it to open. */
  after: number;
  /** Its floors, written as stages are. The grade and level written are not used: a tier sets them. */
  floors: StageDef[];
}

export interface RaidDef {
  id: string;
  name: string;
  blurb: string;
  land: number;
  after: number;
  /** The lord, where he stands, and who stands with him at the start. */
  boss: StageEnemy;
  guards: StageEnemy[];
  /** Who he calls up, how often in seconds, and how many may stand at once. */
  calls: { unit: string; every: number; cap: number };
  /** How long the battle may last, in seconds. */
  seconds: number;
}

/** What a raid's lord has over a boss of a stage: far more health, a harder blow, and he is drawn bigger still. */
export const RAID_BOSS = { hp: 9, damage: 1.5, scale: 1.5 } as const;

const floor = (name: string, kind: 'normal' | 'miniboss' | 'boss', who: string): StageDef => stage(name, kind, 0, 1, who);
const guards = (who: string): StageEnemy[] => stage('guards', 'normal', 0, 1, who).enemies;

export const DUNGEONS: readonly DungeonDef[] = [
  {
    id: 'hollow', name: 'The Hollow', land: 0, after: 10,
    blurb: 'Under the roots of Thornwood the raiders keep what they have taken.',
    floors: [
      floor('The Root Stair', 'normal', 'cutpurse@4,0 cutpurse@4,2 cutpurse@5,3 poacher@6,1 poacher@7,2'),
      floor('Fungus Hall', 'normal', 'bruiser@4,1 bruiser@4,2 cutpurse@5,0 cutpurse@5,3 hexer@7,1'),
      floor('The Blind Dark', 'miniboss', 'hexer@6,1+ hexer@7,2 bruiser@4,1 poacher@6,0 poacher@6,3 cutpurse@4,2 cutpurse@4,3'),
      floor('The Deep King', 'boss', 'warlord@5,1! bruiser@4,0 bruiser@4,3 hexer@7,0 hexer@7,3 poacher@6,2 poacher@7,1'),
    ],
  },
  {
    id: 'vault', name: 'The Sunken Vault', land: 1, after: 22,
    blurb: 'A king was buried under the dunes with his guard. The guard still stands.',
    floors: [
      floor('The Sand Door', 'normal', 'lancer@4,0 lancer@4,1 lancer@4,2 javelineer@6,1 javelineer@6,3'),
      floor('Hall of Spears', 'normal', 'lancer@4,0 lancer@4,1 lancer@4,2 lancer@4,3 javelineer@6,0 javelineer@6,2 ballista@7,1'),
      floor('The Lamp Room', 'miniboss', 'pyromancer@6,1+ pyromancer@7,3 lancer@4,0 lancer@4,2 lancer@5,3 javelineer@6,0'),
      floor('The Counting House', 'normal', 'ballista@7,0 ballista@7,2 lancer@4,0 lancer@4,1 lancer@4,3 pyromancer@6,1 javelineer@6,3'),
      floor('The Buried King', 'boss', 'colossus@5,1! lancer@4,0 lancer@4,3 pyromancer@7,0 pyromancer@7,3 ballista@7,1 javelineer@6,2'),
    ],
  },
  {
    id: 'deep', name: 'The Rime Deep', land: 2, after: 37,
    blurb: 'Below the frozen hall the ice goes down further than anyone has come back from.',
    floors: [
      floor('The Ice Stair', 'normal', 'huscarl@4,0 huscarl@4,1 huscarl@4,2 harpooner@6,1 harpooner@6,3'),
      floor('The Blue Gallery', 'normal', 'icegolem@4,1 huscarl@4,0 huscarl@4,3 harpooner@6,0 harpooner@6,2 frostwitch@7,1'),
      floor('The Hanging Lake', 'normal', 'icegolem@4,1 icegolem@4,2 huscarl@5,0 huscarl@5,3 harpooner@7,0 harpooner@7,3'),
      floor('The Three Sisters', 'miniboss', 'frostwitch@6,1+ frostwitch@6,2 frostwitch@7,0 huscarl@4,0 huscarl@4,1 huscarl@4,2 huscarl@4,3'),
      floor('The Cold Guard', 'normal', 'icegolem@4,0 icegolem@4,3 huscarl@4,1 huscarl@4,2 frostwitch@7,1 harpooner@6,0 harpooner@6,3'),
      floor('The First Jarl', 'boss', 'jarl@5,1! icegolem@4,0 icegolem@4,3 huscarl@4,2 frostwitch@7,0 frostwitch@7,3 harpooner@7,1'),
    ],
  },
];

export const RAIDS: readonly RaidDef[] = [
  {
    id: 'muster', name: "The Warlord's Muster", land: 0, after: 22,
    blurb: 'The Warlord has called in every raider of the wood. They keep coming while he stands.',
    boss: { unit: 'warlord', col: 6, row: 1, rank: 'boss' },
    guards: guards('bruiser@4,1 bruiser@4,2 hexer@7,3'),
    calls: { unit: 'cutpurse', every: 5, cap: 4 },
    seconds: 150,
  },
  {
    id: 'waking', name: 'The Waking Colossus', land: 1, after: 37,
    blurb: 'The Colossus has stood up out of the sand, and the Sandsworn march out from under it.',
    boss: { unit: 'colossus', col: 6, row: 1, rank: 'boss' },
    guards: guards('pyromancer@7,0 pyromancer@7,3 ballista@7,2'),
    calls: { unit: 'lancer', every: 5, cap: 4 },
    seconds: 150,
  },
  {
    id: 'lasthall', name: "The Jarl's Last Hall", land: 2, after: 47,
    blurb: 'The Jarl has barred his hall. His huscarls come out of the dark behind him, one after another.',
    boss: { unit: 'jarl', col: 6, row: 1, rank: 'boss' },
    guards: guards('icegolem@4,1 icegolem@4,2 frostwitch@7,3'),
    calls: { unit: 'huscarl', every: 6, cap: 4 },
    seconds: 150,
  },
];

export function dungeonById(id: string): DungeonDef {
  const d = DUNGEONS.find((x) => x.id === id);
  if (!d) throw new Error(`no dungeon "${id}"`);
  return d;
}

export function raidById(id: string): RaidDef {
  const r = RAIDS.find((x) => x.id === id);
  if (!r) throw new Error(`no raid "${id}"`);
  return r;
}
