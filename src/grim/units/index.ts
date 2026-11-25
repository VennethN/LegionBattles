// Every figure the kit draws.

import type { UnitArt } from '../kit/unit';
import { HUNTERS } from './hunters';
import { MONSTERS } from './monsters';
import { MUSTER } from './muster';
import { TRADES } from './trades';
import { LORDS } from './lords';

export const UNIT_ART: UnitArt[] = [...HUNTERS, ...TRADES, ...MONSTERS, ...LORDS, ...MUSTER];

export function unit(id: string): UnitArt {
  const u = UNIT_ART.find((x) => x.id === id);
  if (!u) throw new Error(`no figure is called ${id}`);
  return u;
}
