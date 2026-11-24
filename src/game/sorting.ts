// The orders the player can lay their cards out in. Pure: cards in, cards
// out. The screen of units asks this, and the save remembers the choice.

import { SETS, UNITS, type UnitInfo } from '../data/units';
import { RARITIES, cardMult } from './rarity';
import { cardPower } from './rules';
import type { Card } from './state';

/** The orders there are, in the order the SORT button steps through them. */
export const SORTS = ['unit', 'power', 'grade', 'level', 'rarity', 'health', 'damage'] as const;
export type Sort = (typeof SORTS)[number];

/** What the SORT button calls each. */
export const SORT_NAME: Readonly<Record<Sort, string>> = {
  unit: 'UNIT',
  power: 'POWER',
  grade: 'GRADE',
  level: 'LEVEL',
  rarity: 'RARITY',
  health: 'HEALTH',
  damage: 'DAMAGE',
};

export function isSort(v: unknown): v is Sort {
  return typeof v === 'string' && (SORTS as readonly string[]).includes(v);
}

/** The order after this one, round to the first again. */
export function nextSort(by: Sort): Sort {
  return SORTS[(SORTS.indexOf(by) + 1) % SORTS.length];
}

const SET_ORDER = Object.keys(SETS);

/** Units as a book would list them: by where they are from, then how rare, then by name. */
export function unitOrder(a: UnitInfo, b: UnitInfo): number {
  return (
    SET_ORDER.indexOf(a.set) - SET_ORDER.indexOf(b.set) ||
    RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) ||
    a.name.localeCompare(b.name)
  );
}

/** A card's health and the damage of one of its blows, as its sheet shows them. */
export function cardHealth(card: Card): number {
  const def = UNITS[card.unit];
  return def ? def.hp * cardMult(card.grade, card.level) : 0;
}
export function cardDamage(card: Card): number {
  const def = UNITS[card.unit];
  return def ? def.damage * cardMult(card.grade, card.level) : 0;
}

/**
 * Cards in an order, the most of whatever it is first. "unit" keeps a
 * unit's cards together, its best first. Cards that tie are put in that
 * order too, so that no order ever shuffles them.
 */
export function sortCards(cards: readonly Card[], by: Sort): Card[] {
  const book = (a: Card, b: Card): number => {
    const ua = UNITS[a.unit];
    const ub = UNITS[b.unit];
    return (ua && ub ? unitOrder(ua, ub) : a.unit.localeCompare(b.unit)) || b.grade - a.grade || b.level - a.level || b.xp - a.xp || a.id - b.id;
  };
  const rarity = (c: Card): number => RARITIES.indexOf(UNITS[c.unit]?.rarity ?? 'common');
  const key: Record<Sort, (a: Card, b: Card) => number> = {
    unit: () => 0,
    power: (a, b) => cardPower(b) - cardPower(a),
    grade: (a, b) => b.grade - a.grade || cardPower(b) - cardPower(a),
    level: (a, b) => b.level - a.level || cardPower(b) - cardPower(a),
    rarity: (a, b) => rarity(b) - rarity(a) || cardPower(b) - cardPower(a),
    health: (a, b) => cardHealth(b) - cardHealth(a),
    damage: (a, b) => cardDamage(b) - cardDamage(a),
  };
  return [...cards].sort((a, b) => key[by](a, b) || book(a, b));
}
