// What a program can check of a figure's art. It cannot see an eye that
// should not have been drawn, a weak silhouette or a figure that is all one
// grey: those are looked for on the sheets. It can see the rest.

import { allColors } from './kit/palette';
import { drawPart, type UnitArt } from './kit/unit';
import { POSE_KEYS, makeXforms, solve, type Pose } from './rig';
import { UNIT_ART } from './units';
import { UNIT_NOTES } from './units/notes';

/** What is wrong with one figure, as lines to print. None, if nothing is. */
export function checkUnit(unit: UnitArt): string[] {
  const out: string[] = [];
  const say = (what: string): void => void out.push(`${unit.id}: ${what}`);
  const palette = allColors();
  if (!UNIT_NOTES[unit.id]) say('has no line in units/notes.ts (what it is, how it is read)');
  if (unit.parts.filter((p) => p.role === 'shadow').length !== 1) say('has to have one blot on the ground');
  if (!unit.parts.some((p) => p.role === 'body')) say('has no body: the rig hangs everything else from one');
  const names = unit.parts.map((p) => p.name);
  for (const n of new Set(names)) if (names.filter((m) => m === n).length > 1) say(`has two parts called "${n}"`);
  for (const p of unit.parts) {
    if ((p.parent === 'head' || p.parent === 'weapon' || p.parent === 'offhand') && !unit.parts.some((q) => q.role === p.parent)) {
      say(`${p.name} hangs from the ${p.parent}, and there is none`);
    }
    if (p.role === 'extra' && p.sway === undefined) say(`${p.name} is an extra with no sway: say 0 if it is stiff`);
  }
  if (Object.keys(unit.moves).length === 0) say('has no move: the game would not know how it strikes');
  if (!(unit.top > -unit.margin && unit.top < unit.feet[1])) say(`has its top at ${unit.top}, which is not on its page`);
  const poses: Array<[string, Pose]> = [
    ...Object.entries(unit.moves).flatMap(([m, mv]): Array<[string, Pose]> => [[`${m}.windup`, mv.windup], [`${m}.strike`, mv.strike]]),
    ...Object.entries(unit.stills ?? {}),
  ];
  const xf = makeXforms(unit.parts.length);
  for (const [name, p] of poses) {
    for (const k of POSE_KEYS) if (typeof p[k] !== 'number' || Number.isNaN(p[k])) say(`pose ${name} has no number for ${k}`);
    solve(unit.parts, unit.feet, p, xf);
    if (xf.some((x) => Number.isNaN(x.x + x.y + x.rot))) say(`pose ${name} does not solve`);
  }
  for (const part of unit.parts) {
    const svg = drawPart(unit, part).svg(unit.canvas[0], unit.canvas[1], unit.margin);
    for (const m of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,8})"/g)) {
      if (!palette.has(m[1].toLowerCase())) say(`${part.name}: ${m[1]} is not in the palette`);
    }
    if (/<style|<script|<filter|<image|Gradient|href="[^#]/.test(svg)) say(`${part.name}: has a style, script, filter, gradient, picture or a reference to another file`);
    if (/NaN|undefined/.test(svg)) say(`${part.name}: a number in it did not come out as one`);
  }
  return [...new Set(out)];
}

/** What is wrong with the whole cast. */
export function checkCast(units: readonly UnitArt[] = UNIT_ART): string[] {
  const out = units.flatMap(checkUnit);
  const ids = units.map((u) => u.id);
  for (const id of new Set(ids)) if (ids.filter((x) => x === id).length > 1) out.push(`${id}: two figures have this name`);
  return out;
}
