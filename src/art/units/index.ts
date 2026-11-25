import type { UnitArt } from '../kit/unit';
import { archer } from './archer';
import { ballista } from './ballista';
import { berserker } from './berserker';
import { bruiser } from './bruiser';
import { cleric } from './cleric';
import { cutpurse } from './cutpurse';
import { frostwitch } from './frostwitch';
import { colossus, icegolem } from './golems';
import { harpooner } from './harpooner';
import { hexer } from './hexer';
import { huscarl } from './huscarl';
import { jarl } from './jarl';
import { javelineer } from './javelineer';
import { knight } from './knight';
import { lancer } from './lancer';
import { mage } from './mage';
import { militia } from './militia';
import { paladin } from './paladin';
import { poacher } from './poacher';
import { pyromancer } from './pyromancer';
import { warlord } from './warlord';
import { STRUCTURES_ART } from './structures';
import { FAITHFUL_ART } from './faithful';
import { drummer, herald, ringleader, skald } from './summoners';
import { BEASTS_ART } from './beasts';
import { CROWNLANDS_ART } from './crownlands';
import { MACHINES_ART } from './machines';
import { DEEPS_ART } from './deeps';
import { ORDERS_ART } from './orders';
import { SHORES_ART } from './shores';
import { WILDS_ART } from './wilds';
import { WORKS_ART } from './works';

/** Every unit that has art, in the order the contact sheet shows them: set by set. */
export const UNIT_ART: readonly UnitArt[] = [
  militia, archer, knight, cleric, berserker, mage, paladin,
  cutpurse, poacher, bruiser, hexer, warlord,
  lancer, javelineer, ballista, pyromancer, colossus,
  huscarl, harpooner, icegolem, frostwitch, jarl,
  // The summoners, one to a set.
  herald, ringleader, drummer, skald,
  // The structures: buildings and traps, the Crownlands' and then each land's.
  ...STRUCTURES_ART,
  // The Faithful, whom only the rewards give.
  ...FAITHFUL_ART,
  // The hundred and fifty drawn after the first games were made: set by set.
  ...CROWNLANDS_ART,
  ...WILDS_ART,
  ...DEEPS_ART,
  ...SHORES_ART,
  ...ORDERS_ART,
  ...BEASTS_ART,
  ...MACHINES_ART,
  ...WORKS_ART,
];

// Two units of one name would write over each other's files, and only one of them would be seen.
{
  const seen = new Set<string>();
  for (const u of UNIT_ART) {
    if (seen.has(u.id)) throw new Error(`art: two units are called "${u.id}"`);
    seen.add(u.id);
  }
}

export function unitArt(id: string): UnitArt {
  const art = UNIT_ART.find((u) => u.id === id);
  if (!art) throw new Error(`no art for unit "${id}"`);
  return art;
}
