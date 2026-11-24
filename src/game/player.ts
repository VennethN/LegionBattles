// The player's level, their skill tree and the upgrades coins buy: what can
// be done, and doing it. Pure functions on the save. What these give is
// added up in bonuses.ts.

import {
  PLAYER_MAX_LEVEL, POINTS_PER_LEVEL, TREE, UPGRADES, playerXpToNext, treeNode, upgradeById, type TreeNode, type UpgradeDef,
} from '../data/player';
import type { SaveData } from './state';

// ------------------------------------------------------------ levels

/**
 * Gives the player experience. Returns how many levels that made. At the
 * last level nothing more is kept.
 */
export function addPlayerXp(save: SaveData, xp: number): number {
  const p = save.player;
  let gained = 0;
  if (p.level >= PLAYER_MAX_LEVEL) {
    p.xp = 0;
    return 0;
  }
  p.xp += Math.max(0, Math.round(xp));
  while (p.level < PLAYER_MAX_LEVEL && p.xp >= playerXpToNext(p.level)) {
    p.xp -= playerXpToNext(p.level);
    p.level++;
    gained++;
  }
  if (p.level >= PLAYER_MAX_LEVEL) p.xp = 0;
  return gained;
}

// ------------------------------------------------------------ the skill tree

export function rankOf(save: SaveData, node: string): number {
  const def = treeNode(node);
  return def ? Math.max(0, Math.min(def.ranks, Math.floor(save.tree[node] ?? 0))) : 0;
}

/** The skill points the player's level has earned, in all. */
export function pointsEarned(save: SaveData): number {
  return (Math.max(1, save.player.level) - 1) * POINTS_PER_LEVEL;
}

export function pointsSpent(save: SaveData): number {
  let n = 0;
  for (const node of TREE) n += rankOf(save, node.id);
  return n;
}

export function pointsFree(save: SaveData): number {
  return Math.max(0, pointsEarned(save) - pointsSpent(save));
}

/** Why a node can't take another rank, or null if it can: "full", "points", or "needs" (the node before it has too few ranks). */
export function whyNoRank(save: SaveData, node: TreeNode): 'full' | 'points' | 'needs' | null {
  if (rankOf(save, node.id) >= node.ranks) return 'full';
  if (node.needs && rankOf(save, node.needs.node) < node.needs.ranks) return 'needs';
  if (pointsFree(save) <= 0) return 'points';
  return null;
}

/** Spends a point on a node. Returns false, and changes nothing, if it can't take one. */
export function rankUp(save: SaveData, nodeId: string): boolean {
  const node = treeNode(nodeId);
  if (!node || whyNoRank(save, node) !== null) return false;
  save.tree[node.id] = rankOf(save, node.id) + 1;
  return true;
}

/** Takes every point back, to be spent again. It costs nothing: a tree that can't be tried is a tree that is looked up. */
export function resetTree(save: SaveData): void {
  save.tree = {};
}

/** Puts a tree right that a save brought in wrong: ranks a node can't have, more points than were earned. */
export function tidyTree(save: SaveData): void {
  const out: Record<string, number> = {};
  // In the tree's own order, which has every node after the one it needs.
  for (const node of TREE) {
    const want = Math.max(0, Math.min(node.ranks, Math.floor(save.tree[node.id] ?? 0)));
    if (want <= 0) continue;
    if (node.needs && (out[node.needs.node] ?? 0) < node.needs.ranks) continue;
    out[node.id] = want;
  }
  save.tree = out;
  if (pointsSpent(save) > pointsEarned(save)) save.tree = {};
}

// ------------------------------------------------------------ upgrades

export function upgradeLevel(save: SaveData, id: string): number {
  const def = upgradeById(id);
  return def ? Math.max(0, Math.min(def.levels, Math.floor(save.upgrades[id] ?? 0))) : 0;
}

/** What the next level of an upgrade costs, or null at its last level. */
export function upgradeCost(save: SaveData, def: UpgradeDef): number | null {
  const level = upgradeLevel(save, def.id);
  if (level >= def.levels) return null;
  // To the nearest five, as every price in the game is.
  return Math.round((def.cost * Math.pow(def.growth, level)) / 5) * 5;
}

/** Buys the next level of an upgrade. Returns false, and changes nothing, if it is at its last or costs too much. */
export function buyUpgrade(save: SaveData, id: string): boolean {
  const def = upgradeById(id);
  if (!def) return false;
  const cost = upgradeCost(save, def);
  if (cost === null || save.coins < cost) return false;
  save.coins -= cost;
  save.upgrades[def.id] = upgradeLevel(save, def.id) + 1;
  return true;
}

/** True if there is something to do on the player's screen: a point to spend, or an upgrade the coins will pay for. */
export function playerHasNews(save: SaveData): boolean {
  if (pointsFree(save) > 0 && TREE.some((n) => whyNoRank(save, n) === null)) return true;
  return UPGRADES.some((u) => {
    const cost = upgradeCost(save, u);
    return cost !== null && save.coins >= cost;
  });
}
