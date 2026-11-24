// The colors of the tiers and the statuses, taken from the palette.

import type { Ground } from '../../art/board';
import { ARCANE, BRONZE, BUSH, CLOTH, FIRE, FROST, HOLY, STEEL, VENOM, type Material } from '../../art/kit/palette';
import type { Rarity } from '../../game/rarity';
import type { StatusId } from '../../sim/types';
import { hex } from '../config';

export const RARITY_MAT: Readonly<Record<Rarity, Material>> = {
  common: STEEL,
  uncommon: VENOM,
  rare: FROST,
  epic: ARCANE,
  legendary: HOLY,
};

/** What a world's banner is made of, by the kind of land it is in. */
export const LAND_MAT: Readonly<Record<Ground, Material>> = {
  meadow: BUSH,
  desert: BRONZE,
  snow: FROST,
};

export const STATUS_COLOR: Readonly<Record<StatusId, number>> = {
  burn: hex(FIRE.fill),
  poison: hex(VENOM.fill),
  stun: hex(HOLY.fill),
  slow: hex(FROST.fill),
  haste: hex(FROST.light),
  rage: hex(CLOTH.red.fill),
  weak: hex(ARCANE.shade),
  mark: hex(ARCANE.fill),
  shield: hex(STEEL.fill),
  regen: hex(VENOM.light),
};

/** The colors of the five difficulties, from Easy to Nightmare. */
export const DIFFICULTY_MAT: readonly Material[] = [VENOM, FROST, HOLY, FIRE, ARCANE];
