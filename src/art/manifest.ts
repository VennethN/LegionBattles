// The shape of public/assets/manifest.json, which scripts/art.ts writes and
// the game reads to know what parts a unit has and where they turn.

import type { AttackStyle } from './kit/unit';
import type { RigPart } from './rig';

export interface ManifestPart extends RigPart {
  /** The part's own corner-to-corner on the canvas: [x, y, width, height]. */
  box: [number, number, number, number];
}

export interface ManifestUnit {
  style: AttackStyle;
  muzzle: [number, number];
  top: number;
  /** Corner to corner of the whole unit standing still: [x, y, width, height]. */
  full: [number, number, number, number];
  /** In draw order, back to front. */
  parts: ManifestPart[];
  /** The whole unit at a pose, where the game asked for any: each one's corner to corner, by its name. */
  stills?: Record<string, [number, number, number, number]>;
}

export interface ManifestImage {
  width: number;
  height: number;
  origin: [number, number];
}

export interface Manifest {
  canvas: number;
  /** How much page a unit's files have all round the canvas. A part's box is on the canvas, and may reach into it. */
  margin: number;
  feet: [number, number];
  teams: string[];
  units: Record<string, ManifestUnit>;
  fx: Record<string, ManifestImage>;
  icons: Record<string, ManifestImage>;
  packs: Record<string, ManifestImage>;
  grades: Record<string, ManifestImage>;
}
