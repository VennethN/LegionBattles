// What this game shows of the art kit, and what it draws that the kit does
// not have. The art build (scripts/art.ts) and the contact sheets
// (scripts/sheet.ts) are the same for every game drawn with the kit: this
// file is the game's own part of them.
//
// The kit draws more than any one game uses, and a picture nobody is shown
// is still a file a player has to wait for. So only what is named here is
// written.

import { arenaGround, holdoutIcons } from '../src/art/holdout';
import type { IconArt } from '../src/art/icons';
import { idleIcons } from '../src/art/icons-idle';
import type { Team } from '../src/art/kit/palette';
import { HOP_POSE } from '../src/art/poses';
import { restPose, type Pose } from '../src/art/rig';
import { FIELD } from '../src/game/content';
import { ICONS_USED } from '../src/view/icons';
import { LEGION_GROUNDS, RIGGED, STILLS, WHOLE } from '../src/view/pictures';

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
  /** A logo and a mark of the game's own, drawn elsewhere: the family's shield with the words on it if it is not given. */
  logo?: { svg(): string; mark(): string };
  /** The word on the ribbon under it. */
  logoWord: string;
  scenes: readonly Scene[];
}

/** A step in the middle of its stride: what a still picture is changed to and back as its figure walks. */
const STRIDE: Pose = { ...HOP_POSE, rootY: -6 };

const has = (list: ReadonlyArray<{ team: string; unit: string }>, team: Team, unit: string): boolean => list.some((k) => k.team === team && k.unit === unit);

export const GAME: ArtGame = {
  // Only what the table of pictures still names of this kit is written: the stand-ins for what the game's own style has not drawn yet.
  wants: (team, unit) => has(RIGGED, team, unit) || has(STILLS, team, unit) || has(WHOLE, team, unit),
  // A hunter and a monster are moved part by part. Everyone else on a field is one picture.
  rigged: (team, unit) => has(RIGGED, team, unit),
  whole: (team, unit) => has(WHOLE, team, unit),
  stills: (team, unit) => (has(STILLS, team, unit) ? { a: restPose(), b: STRIDE } : null),
  icons: () => [...idleIcons(), ...holdoutIcons()],
  onlyIcons: ICONS_USED,
  onlyPacks: new Set<string>(),
  grades: [],
  // A stand-in, like the figures: the family's shield with this game's name on it, until the game's own style has a logo.
  logoFirst: 'BOSS',
  logoWord: 'HUNTERS',
  // The ground of a lair, one picture to each kind, lying down for a wide window and stood up for a tall one.
  scenes: LEGION_GROUNDS.flatMap((ground) =>
    (['wide', 'tall'] as const).map((shape) => {
      const w = shape === 'wide' ? FIELD.long : FIELD.short;
      const h = shape === 'wide' ? FIELD.short : FIELD.long;
      return { file: `arena/${ground}-${shape}.svg`, title: `${ground}, ${shape}: the ground of a lair`, width: w, height: h, svg: () => arenaGround(ground, w, h, FIELD.edge).svg(w, h) };
    }),
  ),
};
