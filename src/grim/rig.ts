// The rig: where each part of a figure is, given a pose. The game and the
// sheets both use this, so a pose that comes apart on a sheet comes apart in
// the game, and the other way round.
//
// It is the Legion style's rig with three things changed, each because a
// tall figure asked for it. The feet are the figure's own, not one place for
// all. The body turns about its own pivot, the hips, and carries what hangs
// from it round that point, where the Legion's short figures turn about
// their feet. And an extra may hang from a weapon or an off hand, so that a
// pennon goes with its lance and a lantern with the arm that holds it; one
// marked as hanging goes where its parent goes without turning with it. A
// weapon may itself be worn on the head, as antlers are, and what hangs from
// it then goes with both.
//
// No Phaser and no DOM here. Nothing is allocated when a pose is solved.

import type { Parent, Role } from './kit/unit';

/** A part as the rig needs it. The manifest's parts are these. */
export interface RigPart {
  name: string;
  role: Role;
  parent: Parent;
  pivot: readonly [number, number];
  sway?: number;
  /** It hangs: it is carried by its parent and does not turn with it. */
  hangs?: boolean;
}

/**
 * A pose is offsets from standing still. Angles are in degrees, clockwise on
 * screen with the figure facing right, so positive leans forward. Scales are
 * differences from 1. Everything is 0 at rest, so poses can be added up.
 */
export interface Pose {
  rootX: number;
  rootY: number;
  /** Turns the whole figure about its feet: toppling over. */
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

function pivotOf(parts: readonly RigPart[], role: Role, fallback: readonly [number, number]): readonly [number, number] {
  for (let i = 0; i < parts.length; i++) if (parts[i].role === role) return parts[i].pivot;
  return fallback;
}

/**
 * Fills `out[i]` for `parts[i]`. A part's place is its pivot carried through
 * what it hangs from: the head and the arms ride the body, an extra rides
 * whatever it is said to, and everything but the shadow rides the root.
 */
export function solve(parts: readonly RigPart[], feet: readonly [number, number], p: Pose, out: PartXform[]): void {
  const fx = feet[0];
  const fy = feet[1];
  const bsx = 1 + p.bodySx;
  const bsy = 1 + p.bodySy;
  const bodyC = Math.cos(p.bodyRot * RAD);
  const bodyS = Math.sin(p.bodyRot * RAD);
  const rootC = Math.cos(p.rootRot * RAD);
  const rootS = Math.sin(p.rootRot * RAD);
  const body = pivotOf(parts, 'body', feet);
  const bx = body[0] - fx;
  const by = body[1] - fy;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const o = out[i];
    let x = part.pivot[0] - fx;
    let y = part.pivot[1] - fy;
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

    // Carried by a head, a weapon or an off hand: round that part's pivot by its turn, and on with it. And if
    // what carries it is itself carried by the head (antlers are a weapon worn on a head), round the head as well.
    let carrier: Parent = part.parent;
    for (let hop = 0; hop < 2 && (carrier === 'head' || carrier === 'weapon' || carrier === 'offhand'); hop++) {
      const role: Role = carrier;
      let c: readonly [number, number] = part.pivot;
      let next: Parent = 'body';
      for (let k = 0; k < parts.length; k++) {
        if (parts[k].role === role) {
          c = parts[k].pivot;
          next = parts[k].parent;
          break;
        }
      }
      const turn = role === 'head' ? p.headRot : role === 'weapon' ? p.weaponRot : p.offRot;
      const ox = role === 'weapon' ? p.weaponX : role === 'offhand' ? p.offX : 0;
      const oy = role === 'head' ? p.headY : role === 'weapon' ? p.weaponY : p.offY;
      const cx = c[0] - fx;
      const cy = c[1] - fy;
      const dx = x - cx;
      const dy = y - cy;
      const cs = Math.cos(turn * RAD);
      const sn = Math.sin(turn * RAD);
      x = cx + dx * cs - dy * sn + ox;
      y = cy + dx * sn + dy * cs + oy;
      rot += turn;
      carrier = next;
    }

    // Carried by the body: stretched and turned about the hips.
    if (part.parent !== 'root' && part.role !== 'body') {
      const dx = (x - bx) * bsx;
      const dy = (y - by) * bsy;
      x = bx + dx * bodyC - dy * bodyS;
      y = by + dx * bodyS + dy * bodyC + p.bodyY;
      rot += p.bodyRot;
    }

    // The root: the whole figure turned about its feet, then moved.
    const rx = x * rootC - y * rootS;
    const ry = x * rootS + y * rootC;
    o.x = rx + p.rootX;
    o.y = ry + p.rootY;
    // What hangs keeps its own way down: only its sway turns it.
    o.rot = part.hangs ? p.extraRot * (part.sway ?? 0) : rot + p.rootRot;
    o.sx = sx;
    o.sy = sy;
  }
}

export function makeXforms(n: number): PartXform[] {
  const out: PartXform[] = [];
  for (let i = 0; i < n; i++) out.push({ x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
  return out;
}
