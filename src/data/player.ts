// The player's own growth, apart from their cards: a level earned by
// fighting, a skill tree that levels pay for, and upgrades that coins buy.
// Asked for by the owner on 24 November 2026: "add player levels and skill
// tree for player", "add upgrades that are purchasable by coins".
//
// Everything these give is a bonus of one of a few kinds (Effect), and every
// bonus a player has is added up in one place, game/bonuses.ts. A new node
// or a new upgrade is a line here and nothing else.

/** The kinds of bonus there are. Each is a share: 0.1 is a tenth more. */
export type Effect =
  /** More health for everything the player fields. */
  | 'health'
  /** Harder blows, and more mending, from everything the player fields. */
  | 'damage'
  /** More health and harder blows for structures, on top of the two above. */
  | 'structures'
  /** More coins from a win. */
  | 'coins'
  /** More experience for the cards that fought, and for the player. */
  | 'xp'
  /** Added to the chance that a win drops a pack. */
  | 'drops'
  /** Taken off what a pack costs. */
  | 'packCost';

export const EFFECTS: readonly Effect[] = ['health', 'damage', 'structures', 'coins', 'xp', 'drops', 'packCost'];

/** How an effect is said: "+12% health". */
export const EFFECT_NAME: Readonly<Record<Effect, string>> = {
  health: 'health',
  damage: 'damage',
  structures: 'to structures',
  coins: 'coins',
  xp: 'experience',
  drops: 'chance of a pack',
  packCost: 'off the price of packs',
};

// ------------------------------------------------------------ levels

export const PLAYER_MAX_LEVEL = 50;
/** Skill points for each level gained. */
export const POINTS_PER_LEVEL = 1;

/**
 * The experience a level takes. A battle gives the player what it gives
 * each card that fought (a stage's `xp`), so the first levels come every
 * few battles and the later ones every dozen or so: a player who has
 * walked the whole line is near level 40, with about that many points for
 * a tree of 51 ranks. Not all of it can be had, which is what makes it a
 * choice.
 */
export function playerXpToNext(level: number): number {
  return Math.round(30 + 12 * Math.pow(Math.max(1, level), 1.6));
}

// ------------------------------------------------------------ the skill tree

export type Branch = 'root' | 'war' | 'guard' | 'craft' | 'fortune';

export const BRANCH_NAME: Readonly<Record<Branch, string>> = {
  root: 'Command',
  war: 'War',
  guard: 'Guard',
  craft: 'Craft',
  fortune: 'Fortune',
};

export interface TreeNode {
  id: string;
  name: string;
  branch: Branch;
  effect: Effect;
  /** What each rank gives, as a share. */
  perRank: number;
  ranks: number;
  /** The node that must have ranks before this one can, and how many. None for the root. */
  needs?: { node: string; ranks: number };
  /** Where it stands in the tree's picture: a column and a row. */
  at: readonly [number, number];
  /** The icon it wears (art/icons.ts). */
  icon: string;
  /** What it says of itself. "{amount}" is what it gives at the rank looked at. */
  text: string;
}

export const TREE: readonly TreeNode[] = [
  {
    id: 'command', name: 'Command', branch: 'root', effect: 'health', perRank: 0.02, ranks: 1, at: [0, 1.5], icon: 'crown',
    text: 'Everything you field has {amount} more health. The first step of every branch.',
  },
  // War: harder blows.
  {
    id: 'edge', name: 'Keen Edge', branch: 'war', effect: 'damage', perRank: 0.02, ranks: 5, needs: { node: 'command', ranks: 1 }, at: [1, 0], icon: 'sword',
    text: 'Everything you field strikes {amount} harder.',
  },
  {
    id: 'fury', name: 'Battle Fury', branch: 'war', effect: 'damage', perRank: 0.02, ranks: 5, needs: { node: 'edge', ranks: 3 }, at: [2, 0], icon: 'spark',
    text: 'Everything you field strikes {amount} harder still.',
  },
  // Guard: more health.
  {
    id: 'drill', name: 'Shield Drill', branch: 'guard', effect: 'health', perRank: 0.02, ranks: 5, needs: { node: 'command', ranks: 1 }, at: [1, 1], icon: 'shield',
    text: 'Everything you field has {amount} more health.',
  },
  {
    id: 'bulwark', name: 'Bulwark', branch: 'guard', effect: 'health', perRank: 0.02, ranks: 5, needs: { node: 'drill', ranks: 3 }, at: [2, 1], icon: 'heart',
    text: 'Everything you field has {amount} more health still.',
  },
  // Craft: structures.
  {
    id: 'masonry', name: 'Masonry', branch: 'craft', effect: 'structures', perRank: 0.05, ranks: 5, needs: { node: 'command', ranks: 1 }, at: [1, 2], icon: 'banner',
    text: 'Your structures have {amount} more health and strike that much harder.',
  },
  {
    id: 'engineers', name: 'Engineers', branch: 'craft', effect: 'structures', perRank: 0.05, ranks: 5, needs: { node: 'masonry', ranks: 3 }, at: [2, 2], icon: 'flag',
    text: 'Your structures gain {amount} more again.',
  },
  // Fortune: what a win brings.
  {
    id: 'tithe', name: 'Tithe', branch: 'fortune', effect: 'coins', perRank: 0.04, ranks: 5, needs: { node: 'command', ranks: 1 }, at: [1, 3], icon: 'coin',
    text: 'A win pays {amount} more coins.',
  },
  {
    id: 'study', name: 'Quick Study', branch: 'fortune', effect: 'xp', perRank: 0.04, ranks: 5, needs: { node: 'tithe', ranks: 2 }, at: [2, 3], icon: 'star',
    text: 'Your cards, and you, learn {amount} faster.',
  },
  {
    id: 'scouts', name: 'Scouts', branch: 'fortune', effect: 'drops', perRank: 0.02, ranks: 5, needs: { node: 'study', ranks: 2 }, at: [3, 3], icon: 'range',
    text: 'A win is {amount} more likely to drop a pack.',
  },
  {
    id: 'haggle', name: 'Haggling', branch: 'fortune', effect: 'packCost', perRank: 0.03, ranks: 5, needs: { node: 'scouts', ranks: 2 }, at: [4, 3], icon: 'hourglass',
    text: 'Packs cost {amount} less.',
  },
];

export function treeNode(id: string): TreeNode | undefined {
  return TREE.find((n) => n.id === id);
}

// ------------------------------------------------------------ upgrades

export interface UpgradeDef {
  id: string;
  name: string;
  effect: Effect;
  /** What each level gives, as a share. */
  perLevel: number;
  levels: number;
  /** What the first level costs, and what each level after costs more than the last. */
  cost: number;
  growth: number;
  icon: string;
  text: string;
}

/**
 * What coins buy besides packs. Each level costs more than the last by a
 * steady share, so that the first few are bought in the first world and the
 * last are something to save for on the last lap.
 */
export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'whetstones', name: 'Whetstones', effect: 'damage', perLevel: 0.01, levels: 15, cost: 120, growth: 1.42, icon: 'sword',
    text: 'Everything you field strikes {amount} harder.',
  },
  {
    id: 'rations', name: 'Rations', effect: 'health', perLevel: 0.01, levels: 15, cost: 120, growth: 1.42, icon: 'heart',
    text: 'Everything you field has {amount} more health.',
  },
  {
    id: 'timber', name: 'Seasoned Timber', effect: 'structures', perLevel: 0.03, levels: 10, cost: 200, growth: 1.55, icon: 'banner',
    text: 'Your structures have {amount} more health and strike that much harder.',
  },
  {
    id: 'ledgers', name: 'Ledgers', effect: 'coins', perLevel: 0.02, levels: 10, cost: 150, growth: 1.6, icon: 'coin',
    text: 'A win pays {amount} more coins.',
  },
  {
    id: 'tutors', name: 'Tutors', effect: 'xp', perLevel: 0.02, levels: 10, cost: 150, growth: 1.6, icon: 'star',
    text: 'Your cards, and you, learn {amount} faster.',
  },
];

export function upgradeById(id: string): UpgradeDef | undefined {
  return UPGRADES.find((u) => u.id === id);
}
