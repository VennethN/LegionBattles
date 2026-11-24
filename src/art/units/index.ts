import type { UnitArt } from '../kit/unit';
import { archer } from './archer';
import { berserker } from './berserker';
import { cleric } from './cleric';
import { knight } from './knight';
import { mage } from './mage';

/** Every unit that has art, in the order the contact sheet shows them. */
export const UNIT_ART: readonly UnitArt[] = [knight, berserker, archer, mage, cleric];

export function unitArt(id: string): UnitArt {
  const art = UNIT_ART.find((u) => u.id === id);
  if (!art) throw new Error(`no art for unit "${id}"`);
  return art;
}
