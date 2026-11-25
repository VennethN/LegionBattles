// What nearly every unit's file would otherwise repeat.

import type { Doc } from '../kit/draw';
import type { Material, Team } from '../kit/palette';
import { FEET, HIP_Y, LEG_BACK_X, LEG_FRONT_X, leg, shadow } from '../kit/parts';
import type { Pt } from '../kit/path';
import type { Parent, PartSpec, Role } from '../kit/unit';

export function part(
  name: string,
  role: Role,
  parent: Parent,
  pivot: Pt,
  draw: (d: Doc, team: Team) => void,
  sway?: number,
): PartSpec {
  return sway === undefined ? { name, role, parent, pivot, draw } : { name, role, parent, pivot, draw, sway };
}

export function ground(rx = 36): PartSpec {
  return part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, rx));
}

/** The two legs every walking unit has, the far one first. */
export function legs(mat: Material): PartSpec[] {
  return [
    part('leg-back', 'legBack', 'root', [LEG_BACK_X, HIP_Y], (d) => leg(d, LEG_BACK_X, mat, true)),
    part('leg-front', 'legFront', 'root', [LEG_FRONT_X, HIP_Y], (d) => leg(d, LEG_FRONT_X, mat)),
  ];
}
