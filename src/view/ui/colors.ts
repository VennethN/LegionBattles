// The colors of the tiers and the statuses, taken from the palette.

import { ARCANE, CLOTH, FIRE, FROST, HOLY, STEEL, VENOM, type Material } from '../../art/kit/palette';
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
