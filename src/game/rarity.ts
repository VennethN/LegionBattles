// Tiers, grades and levels: the three things that say how good a card is.
//
// A tier says how rare a unit is in its own set, not how strong it is. A
// common unit of a later world outdoes a rare one of an earlier.
// A grade is rolled when a card is pulled, and a pack says which grades it
// can hand out. A level is earned by fighting.

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export interface RarityRule {
  name: string;
  /** How often a pack turns this tier over, against the others. */
  weight: number;
}

export const RARITY: Readonly<Record<Rarity, RarityRule>> = {
  common: { name: 'Common', weight: 56 },
  uncommon: { name: 'Uncommon', weight: 27 },
  rare: { name: 'Rare', weight: 12.5 },
  epic: { name: 'Epic', weight: 3.8 },
  legendary: { name: 'Legendary', weight: 0.7 },
};

/** Grades from worst to best. A card's grade is its place in this list. */
export const GRADES: readonly string[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];

/** Each grade is this much stronger than the one below it, in health and in damage. */
export const GRADE_STEP = 1.16;
/** Each grade is this much less likely than the one below it, inside a pack's range. */
export const GRADE_FALLOFF = 0.55;

export function gradeMult(grade: number): number {
  return Math.pow(GRADE_STEP, grade);
}

export const MAX_LEVEL = 20;
/** Each level adds this share of a unit's base numbers. */
export const LEVEL_STEP = 0.06;

export function levelMult(level: number): number {
  return 1 + LEVEL_STEP * (level - 1);
}

/** Experience a card needs to go from this level to the next. */
export function xpToNext(level: number): number {
  return 40 + 30 * (level - 1) + 9 * (level - 1) * (level - 1);
}

/** What a card's grade and level multiply its health and damage by. */
export function cardMult(grade: number, level: number): number {
  return gradeMult(grade) * levelMult(level);
}
