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

/** Every unit that has art, in the order the contact sheet shows them: set by set. */
export const UNIT_ART: readonly UnitArt[] = [
  militia, archer, knight, cleric, berserker, mage, paladin,
  cutpurse, poacher, bruiser, hexer, warlord,
  lancer, javelineer, ballista, pyromancer, colossus,
  huscarl, harpooner, icegolem, frostwitch, jarl,
];

export function unitArt(id: string): UnitArt {
  const art = UNIT_ART.find((u) => u.id === id);
  if (!art) throw new Error(`no art for unit "${id}"`);
  return art;
}
