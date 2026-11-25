// The game's own style at run time: the manifest the Grim kit writes
// (scripts/grim.ts), and how its figures and things are put on the sheet.
//
// What differs from the Legion kit this project was begun with: a figure is
// one drawing with no sides; each has its own canvas, feet and margin; and
// what it can do is named moves and stills in the manifest.

import type { Pose, RigPart } from '../../grim/rig';
import type { Wanted } from './Sheet';

export interface GrimPart extends RigPart {
  box: [number, number, number, number];
  /** Shown only while the figure stands in this still: the Furnace's water, only while it is cooled. */
  only?: string;
}

export interface GrimUnit {
  kind: string;
  name: string;
  canvas: [number, number];
  feet: [number, number];
  margin: number;
  muzzle: [number, number];
  top: number;
  full: [number, number, number, number];
  parts: GrimPart[];
  moves: Record<string, { windup: Pose; strike: Pose }>;
  stills: Record<string, Pose>;
}

export interface GrimManifest {
  poses: { stride: Pose; tread: Pose; hit: Pose; fall: Pose };
  units: Record<string, GrimUnit>;
  things: Record<string, { set: string; width: number; height: number; origin: [number, number] }>;
}

/**
 * How many pixels a unit of a figure's canvas is drawn at on the sheet. A
 * figure stands at about 0.6 of its canvas on the field and the field is
 * shown at up to twice that on a dense screen, so this is sharp enough,
 * and a monster's parts still fit the sheet.
 */
export const GRIM_RASTER = 1.25;

let manifest: GrimManifest | null = null;

export function setGrim(m: GrimManifest): void {
  manifest = m;
}

export function getGrim(): GrimManifest {
  if (!manifest) throw new Error('the style manifest has not loaded');
  return manifest;
}

export const grimFrame = (unit: string, part: string): string => `grim/${unit}/${part}`;
export const thingFrame = (id: string): string => `thing/${id}`;

/** A figure's parts, as things for the sheet to load and pack: each cut to its own box, turning at its pivot. */
export function wantedUnit(id: string): Wanted {
  const u = getGrim().units[id];
  const k = GRIM_RASTER;
  return {
    id: `grim:${id}`,
    files: u.parts.map((part) => {
      const [bx, by, bw, bh] = part.box;
      const frame = grimFrame(id, part.name);
      return {
        frame, key: `svg:${frame}`, url: `assets/grim/units/${id}/${part.name}.svg`, scale: k,
        sx: Math.floor((bx + u.margin) * k), sy: Math.floor((by + u.margin) * k), w: Math.ceil(bw * k), h: Math.ceil(bh * k),
        origin: [(part.pivot[0] - bx) / bw, (part.pivot[1] - by) / bh] as const,
      };
    }),
  };
}

/** A lair piece, whole, standing on its own origin. */
export function wantedThing(id: string): Wanted {
  const t = getGrim().things[id];
  const frame = thingFrame(id);
  return { id: `thing:${id}`, files: [{ frame, key: `svg:${frame}`, url: `assets/grim/things/${id}.svg`, scale: 1, sx: 0, sy: 0, w: t.width, h: t.height, origin: [t.origin[0] / t.width, t.origin[1] / t.height] as const }] };
}
