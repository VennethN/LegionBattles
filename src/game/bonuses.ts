// Every bonus a player has, from every source, added up in one place. A
// source is something the player has that boosts them: the skill tree, the
// upgrades coins buy. An effect is a kind of bonus (data/player.ts). Whatever
// needs a bonus asks here, and nowhere else adds sources up, so that a new
// source is one entry in SOURCES and nothing more. The Roblox game this one
// follows keeps its bonuses the same way, by the owner's word there.
//
// Pure functions on the save.

import { EFFECTS, TREE, UPGRADES, type Effect } from '../data/player';
import type { SaveData } from './state';

export interface Source {
  id: string;
  /** How the interface names it. */
  name: string;
  /** What it gives of an effect, as a share. */
  of: (save: SaveData, effect: Effect) => number;
}

export const SOURCES: readonly Source[] = [
  {
    id: 'tree',
    name: 'Skill tree',
    of: (save, effect) => {
      let n = 0;
      for (const node of TREE) if (node.effect === effect) n += node.perRank * Math.max(0, Math.min(node.ranks, save.tree?.[node.id] ?? 0));
      return n;
    },
  },
  {
    id: 'upgrades',
    name: 'Upgrades',
    of: (save, effect) => {
      let n = 0;
      for (const up of UPGRADES) if (up.effect === effect) n += up.perLevel * Math.max(0, Math.min(up.levels, save.upgrades?.[up.id] ?? 0));
      return n;
    },
  },
];

/** The most an effect can come to, where more would break something: a pack is never free. */
const CAPS: Partial<Record<Effect, number>> = { packCost: 0.5, drops: 0.5 };

/** All a player has of an effect, as a share: 0.12 is twelve in a hundred more. Sources add. */
export function bonus(save: SaveData, effect: Effect): number {
  let n = 0;
  for (const source of SOURCES) n += source.of(save, effect);
  const cap = CAPS[effect];
  return cap === undefined ? n : Math.min(cap, n);
}

/** What each source gives of an effect, for the interface to list. Only the ones that give any. */
export function bonusParts(save: SaveData, effect: Effect): Array<{ source: string; name: string; amount: number }> {
  const out: Array<{ source: string; name: string; amount: number }> = [];
  for (const source of SOURCES) {
    const amount = source.of(save, effect);
    if (amount > 0) out.push({ source: source.id, name: source.name, amount });
  }
  return out;
}

/** Every effect the player has any of, with its total. */
export function bonuses(save: SaveData): Array<{ effect: Effect; amount: number }> {
  return EFFECTS.map((effect) => ({ effect, amount: bonus(save, effect) })).filter((b) => b.amount > 0);
}

/** What a card's health and damage are multiplied by, beside its own grade and level: more for a structure. */
export function fieldBonus(save: SaveData, structure: boolean): { hp: number; damage: number } {
  const built = structure ? bonus(save, 'structures') : 0;
  return { hp: 1 + bonus(save, 'health') + built, damage: 1 + bonus(save, 'damage') + built };
}
