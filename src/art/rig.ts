// The rig: where each part of a unit is, given a pose. The game and the
// contact sheet both use this, so a pose that comes apart on the sheet comes
// apart in the game, and the other way round.
//
// No Phaser and no DOM here. Nothing is allocated when a pose is solved.

import type { Parent, Role } from './kit/unit';

export const FEET_X = 96;
export const FEET_Y = 180;

/** A part as the rig needs it. The manifest's parts are these. */
export interface RigPart {
  name: string;
  role: Role;
  parent: Parent;
  pivot: readonly [number, number];
  sway?: number;
}

/**
 * A pose is offsets from standing still. Angles are in degrees, clockwise on
 * screen with the unit facing right, so positive leans forward. Scales are
 * differences from 1. Everything is 0 at rest, so poses can be added up.
 */
export interface Pose {
  rootX: number;
  rootY: number;
  /** Turns the whole unit about its feet: toppling over. */
  rootRot: number;
  bodyRot: number;
  bodyY: number;
  bodySx: number;
  bodySy: number;
  headRot: number;
  headY: number;
  weaponRot: number;
  weaponX: number;
  weaponY: number;
  weaponSx: number;
  offRot: number;
  offX: number;
  offY: number;
  legBackRot: number;
  legBackY: number;
  legFrontRot: number;
  legFrontY: number;
  /** Added to every extra, times its own sway. */
  extraRot: number;
}

export const POSE_KEYS = [
  'rootX', 'rootY', 'rootRot', 'bodyRot', 'bodyY', 'bodySx', 'bodySy', 'headRot', 'headY',
  'weaponRot', 'weaponX', 'weaponY', 'weaponSx', 'offRot', 'offX', 'offY',
  'legBackRot', 'legBackY', 'legFrontRot', 'legFrontY', 'extraRot',
] as const satisfies ReadonlyArray<keyof Pose>;

export function restPose(): Pose {
  return {
    rootX: 0, rootY: 0, rootRot: 0, bodyRot: 0, bodyY: 0, bodySx: 0, bodySy: 0, headRot: 0, headY: 0,
    weaponRot: 0, weaponX: 0, weaponY: 0, weaponSx: 0, offRot: 0, offX: 0, offY: 0,
    legBackRot: 0, legBackY: 0, legFrontRot: 0, legFrontY: 0, extraRot: 0,
  };
}

export function pose(p: Partial<Pose>): Pose {
  return { ...restPose(), ...p };
}

export function clearPose(p: Pose): void {
  for (const k of POSE_KEYS) p[k] = 0;
}

export function addPose(into: Pose, p: Pose, weight = 1): void {
  for (const k of POSE_KEYS) into[k] += p[k] * weight;
}

/** Where a part is drawn: its pivot's place relative to the feet, its turn and its stretch. */
export interface PartXform {
  x: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
}

const RAD = Math.PI / 180;

/**
 * Fills `out[i]` for `parts[i]`. A part's place is its pivot carried through
 * what it hangs from: head and hands ride the body, a plume rides the head,
 * and everything but the shadow rides the root.
 */
export function solve(parts: readonly RigPart[], p: Pose, out: PartXform[]): void {
  const bodyC = Math.cos(p.bodyRot * RAD);
  const bodyS = Math.sin(p.bodyRot * RAD);
  const bsx = 1 + p.bodySx;
  const bsy = 1 + p.bodySy;
  const headC = Math.cos(p.headRot * RAD);
  const headS = Math.sin(p.headRot * RAD);
  const rootC = Math.cos(p.rootRot * RAD);
  const rootS = Math.sin(p.rootRot * RAD);

  // The head's pivot, to carry what hangs from the head.
  let headPx = FEET_X;
  let headPy = FEET_Y - 74;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].role === 'head') {
      headPx = parts[i].pivot[0];
      headPy = parts[i].pivot[1];
      break;
    }
  }

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const o = out[i];
    let x = part.pivot[0] - FEET_X;
    let y = part.pivot[1] - FEET_Y;
    let rot = 0;
    let sx = 1;
    let sy = 1;

    if (part.role === 'shadow') {
      o.x = x;
      o.y = y;
      o.rot = 0;
      o.sx = 1;
      o.sy = 1;
      continue;
    }

    // Its own offsets, in the frame of what it hangs from.
    switch (part.role) {
      case 'body':
        rot = p.bodyRot;
        y += p.bodyY;
        sx = bsx;
        sy = bsy;
        break;
      case 'head':
        rot = p.headRot;
        y += p.headY;
        break;
      case 'weapon':
        rot = p.weaponRot;
        x += p.weaponX;
        y += p.weaponY;
        sx = 1 + p.weaponSx;
        break;
      case 'offhand':
        rot = p.offRot;
        x += p.offX;
        y += p.offY;
        break;
      case 'legBack':
        rot = p.legBackRot;
        y += p.legBackY;
        break;
      case 'legFront':
        rot = p.legFrontRot;
        y += p.legFrontY;
        break;
      case 'extra':
        rot = p.extraRot * (part.sway ?? 0);
        break;
    }

    if (part.parent === 'head') {
      // Round the head's pivot by the head's turn, then on with the head.
      const hx = headPx - FEET_X;
      const hy = headPy - FEET_Y;
      const dx = x - hx;
      const dy = y - hy;
      x = hx + dx * headC - dy * headS;
      y = hy + dx * headS + dy * headC + p.headY;
      rot += p.headRot;
    }

    if (part.parent !== 'root' && part.role !== 'body') {
      // Carried by the body: stretched and turned about the feet.
      const dx = x * bsx;
      const dy = y * bsy;
      x = dx * bodyC - dy * bodyS;
      y = dx * bodyS + dy * bodyC + p.bodyY;
      rot += p.bodyRot;
    }

    // The root: the whole unit turned about its feet, then moved.
    const rx = x * rootC - y * rootS;
    const ry = x * rootS + y * rootC;
    o.x = rx + p.rootX;
    o.y = ry + p.rootY;
    o.rot = rot + p.rootRot;
    o.sx = sx;
    o.sy = sy;
  }
}

export function makeXforms(n: number): PartXform[] {
  const out: PartXform[] = [];
  for (let i = 0; i < n; i++) out.push({ x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
  return out;
}
