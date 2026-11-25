// What this game shows of the art kit, and what it draws that the kit does
// not have. The art build (scripts/art.ts) and the contact sheets
// (scripts/sheet.ts) are the same for every game drawn with the kit: this
// file is the game's own part of them, and the only one of the three to
// change.
//
// As it comes with the kit it shows everything: every unit on both sides,
// every icon, pack and grade, and the three painted grounds. A game cuts
// this down to what it shows, because a picture nobody is shown is still a
// file a player has to wait for. Legion Idle's is in the skill as
// assets/examples/art.game.idle.ts: it names its cast from its own data.

import { GROUNDS } from '../src/art/ground';
import type { IconArt } from '../src/art/icons';
import { idleIcons } from '../src/art/icons-idle';
import type { Team } from '../src/art/kit/palette';
import { MARCH_H, MARCH_W, marchBackdrop } from '../src/art/march';

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

export const GAME: ArtGame = {
  wants: () => true,
  whole: () => true,
  icons: idleIcons,
  onlyIcons: null,
  onlyPacks: null,
  grades: ['F', 'E', 'D', 'C', 'B', 'A', 'S'],
  logoWord: 'BATTLES',
  // A painted ground with a road through it, one to each kind of land: for a game seen from the side.
  scenes: GROUNDS.map((ground) => ({
    file: `ground/${ground}.svg`,
    title: `${ground}: a painted ground with a road through it`,
    width: MARCH_W,
    height: MARCH_H,
    svg: () => marchBackdrop(ground).svg(MARCH_W, MARCH_H),
  })),
};
