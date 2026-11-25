// What this game shows of the art kit, and what it draws that the kit does
// not have. The art build (scripts/art.ts) and the contact sheets
// (scripts/sheet.ts) are the same for every game drawn with the kit: this
// file is the game's own part of them.
//
// The kit draws more than any one game uses, and a picture nobody is shown
// is still a file a player has to wait for. So only what is named here is
// written.

import { GROUNDS } from '../src/art/ground';
import { arenaGround, holdoutIcons, weaponIcons } from '../src/art/holdout';
import type { IconArt } from '../src/art/icons';
import { idleIcons } from '../src/art/icons-idle';
import type { Team } from '../src/art/kit/palette';
import { HOP_POSE } from '../src/art/poses';
import { restPose, type Pose } from '../src/art/rig';
import { ARENA, COMPANIONS, ENEMIES, HEROES } from '../src/game/data';
import { ICONS_USED } from '../src/view/icons';

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
  /** Whether a unit is drawn for a side at all. */
  wants(team: Team, unit: string): boolean;
  /** Whether its parts are written, to be moved one by one by the rig. Everyone's are, if this is left out. */
  rigged?(team: Team, unit: string): boolean;
  /** Whether the unit is also written whole, standing still, for a card or a list. */
  whole(team: Team, unit: string): boolean;
  /** The poses it is written whole at, by name, for a game that shows a crowd as single pictures. None, if left out. */
  stills?(team: Team, unit: string): Record<string, Pose> | null;
  /** The game's own icons, beside the kit's. */
  icons(): IconArt[];
  /** The icons to write, by name, or null for every one there is. */
  onlyIcons: ReadonlySet<string> | null;
  /** The packs to write, by name, or null for every one the kit draws. */
  onlyPacks: ReadonlySet<string> | null;
  /** The letters of the grade badges to write, plainest first. None, if the game has no grades. */
  grades: readonly string[];
  /** The word across the shield in the logo, where a game has a name of its own: LEGION if it is not given. */
  logoFirst?: string;
  /** The word on the ribbon under it. */
  logoWord: string;
  scenes: readonly Scene[];
}

// The player's side: the heroes, and the companions who go with them.
const HERO_UNITS = new Set([...HEROES.map((h) => h.unit), ...COMPANIONS.map((c) => c.unit)]);
const FOE_UNITS = new Set(ENEMIES.map((e) => e.unit));
const BOSS_UNITS = new Set(ENEMIES.filter((e) => e.ai === 'boss').map((e) => e.unit));

/** A step in the middle of its stride: what a foe's picture is changed to and back as it comes on. */
const STRIDE: Pose = { ...HOP_POSE, rootY: -6 };

export const GAME: ArtGame = {
  // The heroes are the player's, in blue. Whoever comes at them is in red.
  wants: (team, unit) => (team === 'blue' ? HERO_UNITS.has(unit) : FOE_UNITS.has(unit)),
  // A hero and a boss are moved part by part. The horde is too many for that: each of it is one picture.
  rigged: (team, unit) => team === 'blue' || BOSS_UNITS.has(unit),
  whole: (team) => team === 'blue',
  stills: (team, unit) => (team === 'red' && !BOSS_UNITS.has(unit) ? { a: restPose(), b: STRIDE } : null),
  // The sister game's icons are the kit's now: a helm, a horn, a sack and a gauntlet are wares here.
  icons: () => [...idleIcons(), ...holdoutIcons(), ...weaponIcons()],
  onlyIcons: ICONS_USED,
  // A pack is what a boss leaves: one picture serves.
  onlyPacks: new Set(['thornwood']),
  grades: [],
  logoFirst: 'LAST',
  logoWord: 'STANDER',
  // The ground of the arena, one picture to each kind of land, lying down for a wide window and stood up for a tall one.
  scenes: GROUNDS.flatMap((ground) =>
    (['wide', 'tall'] as const).map((shape) => {
      const w = shape === 'wide' ? ARENA.long : ARENA.short;
      const h = shape === 'wide' ? ARENA.short : ARENA.long;
      return { file: `arena/${ground}-${shape}.svg`, title: `${ground}, ${shape}: the ground of the arena`, width: w, height: h, svg: () => arenaGround(ground, w, h, ARENA.edge).svg(w, h) };
    }),
  ),
};
