// Every figure the kit draws.

import type { UnitArt } from '../kit/unit';
import { HUNTERS } from './hunters';
import { MONSTERS } from './monsters';
import { MUSTER } from './muster';
import { TRADES } from './trades';
import { LORDS } from './lords';
import { FOLK } from './folk';
import { DROVER } from './drover';
import { RANK_FITS, ranked } from './rank';

// A hunter's rank things are laid on here, over the figure as it is drawn, so that each hunter's own file stays about them alone.
export const UNIT_ART: UnitArt[] = [...HUNTERS, ...TRADES, ...DROVER, ...MONSTERS, ...LORDS, ...MUSTER, ...FOLK].map((u) => (RANK_FITS[u.id] ? ranked(u, RANK_FITS[u.id]) : u));

export function unit(id: string): UnitArt {
  const u = UNIT_ART.find((x) => x.id === id);
  if (!u) throw new Error(`no figure is called ${id}`);
  return u;
}
