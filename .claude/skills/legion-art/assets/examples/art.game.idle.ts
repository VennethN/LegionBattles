// What this game shows of the art kit, and what it draws that the kit does
// not have. The art build (scripts/art.ts) and the contact sheets
// (scripts/sheet.ts) are the same for every game drawn with the kit: this
// file is the game's own part of them.
//
// The kit draws more than any one game uses, and a picture nobody is shown
// is still a file a player has to wait for. So only what is named here is
// written.

import { GROUNDS } from '../src/art/ground';
import type { IconArt } from '../src/art/icons';
import { idleIcons } from '../src/art/icons-idle';
import type { Team } from '../src/art/kit/palette';
import { MARCH_H, MARCH_W, marchBackdrop } from '../src/art/march';
import { CAMP, HEROES, LANDS } from '../src/game/data';

/** A picture of the game's own that is loaded by itself: where it goes under public/assets, and how it is drawn. */
export interface Scene {
  file: string;
  /** What the contact sheet calls it. */
  title: string;
  width: number;
  height: number;
  svg(): string;
}

export interface ArtGame {
  /** Whether a unit's parts are written for a side. */
  wants(team: Team, unit: string): boolean;
  /** Whether the unit is also written whole, standing still, for a card or a list. */
  whole(team: Team, unit: string): boolean;
  /** The game's own icons, beside the kit's. */
  icons(): IconArt[];
  /** The icons to write, by name, or null for every one there is. */
  onlyIcons: ReadonlySet<string> | null;
  /** The packs to write, by name, or null for every one the kit draws. */
  onlyPacks: ReadonlySet<string> | null;
  /** The letters of the grade badges to write, plainest first. None, if the game has no grades. */
  grades: readonly string[];
  /** The word on the ribbon under LEGION in the logo. */
  logoWord: string;
  scenes: readonly Scene[];
}

/** Who is seen, and on which side: the heroes and the camp in blue, whoever bars the road in red. */
const CAST: Record<Team, Set<string>> = {
  blue: new Set([...HEROES.map((h) => h.unit), ...CAMP.map((c) => c.unit)]),
  red: new Set(LANDS.flatMap((l) => [...l.troops, l.captain, l.boss])),
};

export const GAME: ArtGame = {
  wants: (team, unit) => CAST[team].has(unit),
  // Only the player's own stand in the lists.
  whole: (team) => team === 'blue',
  icons: idleIcons,
  // The icons the screens ask for by name (tests/art.test.ts reads the screens and holds this to them).
  onlyIcons: new Set([
    'coin', 'sword', 'check', 'boot', 'hourglass', 'pack', 'land-meadow', 'land-desert', 'land-snow',
    'laurel', 'trophy', 'gauntlet', 'helm', 'tent', 'horn', 'arrows', 'sack', 'cog', 'chevrons', 'moon',
  ]),
  // The supply packs: one to each kind of land.
  onlyPacks: new Set(['thornwood', 'dunes', 'frost']),
  grades: [],
  logoWord: 'IDLE',
  // The painted ground the legion marches over, one picture to each kind of land.
  scenes: GROUNDS.map((ground) => ({
    file: `ground/${ground}.svg`,
    title: `${ground}: the ground the legion marches over`,
    width: MARCH_W,
    height: MARCH_H,
    svg: () => marchBackdrop(ground).svg(MARCH_W, MARCH_H),
  })),
};
