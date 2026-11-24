// Cards as things of their own. A pack always turns over a card, and a
// copy of a unit already held is kept as another card: the player fields
// it beside the first, or combines it into another card.
//
// A card grows two ways: by the experience its battles pay, and by the
// cards combined into it. Any card can be combined into any other: a copy
// of its unit, or a card of a unit the player has no use for. A card's
// grade is its own and never changes, so a better pull is a better card,
// and the old one can be combined into it.

import { UNITS } from '../data/units';
import { MAX_LEVEL, xpToNext, type Rarity } from './rarity';
import type { Card, SaveData } from './state';

export function cardOf(save: SaveData, id: number): Card | undefined {
  return save.cards.find((c) => c.id === id);
}

/** Orders cards best first: by grade, then level, then experience, then the older card. */
export function better(a: Card, b: Card): number {
  return b.grade - a.grade || b.level - a.level || b.xp - a.xp || a.id - b.id;
}

/** Every card held of a unit, best first. */
export function cardsOf(save: SaveData, unit: string): Card[] {
  return save.cards.filter((c) => c.unit === unit).sort(better);
}

export function holds(save: SaveData, unit: string): boolean {
  return save.cards.some((c) => c.unit === unit);
}

/** Whether a card of a unit has ever been held, the cards since combined away among them. */
export function met(save: SaveData, unit: string): boolean {
  return save.met.includes(unit) || holds(save, unit);
}

export function fielded(save: SaveData, id: number): boolean {
  return save.team.some((p) => p.card === id);
}

/** A new card of a unit at a grade, at level 1. Changes the save. */
export function addCard(save: SaveData, unit: string, grade: number): Card {
  const card: Card = { id: save.nextCard++, unit, grade, level: 1, xp: 0 };
  save.cards.push(card);
  if (!save.met.includes(unit)) save.met.push(unit);
  return card;
}

/** Gives a card experience. Returns how many levels it gained. */
export function addXp(card: Card, xp: number): number {
  let gained = 0;
  card.xp += Math.max(0, Math.round(xp));
  while (card.level < MAX_LEVEL && card.xp >= xpToNext(card.level)) {
    card.xp -= xpToNext(card.level);
    card.level++;
    gained++;
  }
  if (card.level >= MAX_LEVEL) card.xp = 0;
  return gained;
}

/** All the experience a card has taken in since it was pulled. */
export function xpHeld(card: Card): number {
  let total = card.xp;
  for (let l = 1; l < card.level; l++) total += xpToNext(l);
  return total;
}

// ------------------------------------------------------------ combining

/** What a card fresh from its pack is worth to the card it is combined into, at the worst grade. A rarer copy comes more seldom, so it is worth more. */
export const COPY_XP: Readonly<Record<Rarity, number>> = {
  common: 40,
  uncommon: 55,
  rare: 80,
  epic: 120,
  legendary: 200,
};
/** Each grade above the worst makes a card worth this much more. */
export const COPY_GRADE = 1.5;
/** The share of the experience a card holds that goes with it. Less than all, so that passing levels from card to card makes nothing. */
export const KEPT = 0.8;

/** What a card of another unit is worth, against a copy of the card's own unit. A copy teaches its own kind best. */
export const OTHER_UNIT = 0.5;

/**
 * The experience a card gives the card it is combined into. `into` is the
 * unit of that card: a card of another unit gives a share of what a copy
 * would. Without it, what the card is worth to a copy of itself.
 */
export function worth(card: Card, into: string = card.unit): number {
  const def = UNITS[card.unit];
  const fresh = COPY_XP[def ? def.rarity : 'common'] * Math.pow(COPY_GRADE, card.grade);
  return Math.round((fresh + KEPT * xpHeld(card)) * (into === card.unit ? 1 : OTHER_UNIT));
}

/**
 * Why a card can't be given up to another, or null if it can. Any card
 * goes into any other, whatever their units: only a card in the team is
 * kept, and a card at the last level has nothing to gain.
 */
export function whyNot(save: SaveData, into: number, from: number): string | null {
  const target = cardOf(save, into);
  const given = cardOf(save, from);
  if (!target || !given) return 'No such card.';
  if (into === from) return 'A card is not combined into itself.';
  if (target.level >= MAX_LEVEL) return 'It is at the last level already.';
  if (fielded(save, from)) return 'It is in your team. Take it out first.';
  return null;
}

export interface Combined {
  /** Experience the card takes in. */
  xp: number;
  /** Its level before and after. */
  from: number;
  to: number;
  /** Experience toward the next level, after. */
  left: number;
  /** How many cards are given up. */
  given: number;
}

/** What combining cards into one would do, without doing it. Null if any of them can't be given up, or none is named. */
export function combinePreview(save: SaveData, into: number, from: readonly number[]): Combined | null {
  const target = cardOf(save, into);
  if (!target || from.length === 0 || new Set(from).size !== from.length) return null;
  let xp = 0;
  for (const id of from) {
    if (whyNot(save, into, id)) return null;
    xp += worth(cardOf(save, id) as Card, target.unit);
  }
  const after: Card = { ...target };
  addXp(after, xp);
  return { xp, from: target.level, to: after.level, left: after.xp, given: from.length };
}

/** Combines cards into one: they are gone, and it takes their worth in experience. All of it or none. Changes the save. */
export function combine(save: SaveData, into: number, from: readonly number[]): Combined | null {
  const result = combinePreview(save, into, from);
  const target = cardOf(save, into);
  if (!result || !target) return null;
  addXp(target, result.xp);
  const gone = new Set(from);
  save.cards = save.cards.filter((c) => !gone.has(c.id));
  return result;
}

/** The cards that could be given up to a card now, the least of them first: the ones a player parts with soonest. */
export function spare(save: SaveData, into: number): Card[] {
  if (!cardOf(save, into)) return [];
  const unit = (cardOf(save, into) as Card).unit;
  return save.cards.filter((c) => whyNot(save, into, c.id) === null).sort((a, b) => worth(a, unit) - worth(b, unit) || a.id - b.id);
}
