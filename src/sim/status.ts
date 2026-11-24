// The lasting effects. Each has one number, its power, and a default for it.

import type { StatusId } from './types';

export const STATUS_IDS: readonly StatusId[] = [
  'burn', 'poison', 'stun', 'slow', 'haste', 'rage', 'weak', 'mark', 'shield', 'regen',
];

export const STATUS_INDEX: Readonly<Record<StatusId, number>> = Object.fromEntries(
  STATUS_IDS.map((id, i) => [id, i]),
) as Record<StatusId, number>;

export interface StatusRule {
  name: string;
  /** What the power means, for the card. */
  text: string;
  /** The power when whoever applies it names none. */
  power: number;
  /** True for the helpful ones. */
  good: boolean;
  /** Harm over time: the power is a share of the giver's damage, each second. */
  dot?: boolean;
}

export const STATUS: Readonly<Record<StatusId, StatusRule>> = {
  burn: { name: 'Burn', text: 'Loses health every second. Armor does not help.', power: 0.25, good: false, dot: true },
  poison: { name: 'Poison', text: 'Loses health every second, more with each dose, up to three.', power: 0.12, good: false, dot: true },
  stun: { name: 'Stun', text: 'Cannot move or attack.', power: 1, good: false },
  slow: { name: 'Slow', text: 'Moves and attacks slower.', power: 0.4, good: false },
  haste: { name: 'Haste', text: 'Moves and attacks faster.', power: 0.3, good: true },
  rage: { name: 'Rage', text: 'Deals more damage.', power: 0.3, good: true },
  weak: { name: 'Weak', text: 'Deals less damage.', power: 0.25, good: false },
  mark: { name: 'Mark', text: 'Takes more damage.', power: 0.25, good: false },
  shield: { name: 'Shield', text: 'Takes less damage.', power: 0.4, good: true },
  regen: { name: 'Regrowth', text: 'Regains health every second.', power: 0.04, good: true },
};

/** Poison stacks this many times. */
export const POISON_STACKS = 3;
/** Harm and healing over time land this often, in ticks (twice a second). */
export const PULSE_TICKS = 10;
