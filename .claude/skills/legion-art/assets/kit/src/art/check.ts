// What a program can check of a unit's art. It cannot see a face, a weak
// silhouette or a color that reads as the wrong side: those are looked for on
// the roster sheet (npm run art:roster). It can see the rest, and it is run
// over every unit the kit draws, not only the ones a game shows, so that a
// unit nobody uses yet is still held to the style.

import { CANVAS, MARGIN } from './kit/draw';
import { OUTLINE, OUTLINE_WIDTH, TEAMS, allColors } from './kit/palette';
import { drawPart, type UnitArt } from './kit/unit';
import { ATTACK_POSES } from './poses';
import { UNIT_ART } from './units';
import { UNIT_NOTES } from './units/notes';

/** What is wrong with one unit, as lines to print. None, if nothing is. */
export function checkUnit(unit: UnitArt): string[] {
  const out: string[] = [];
  const say = (what: string): void => void out.push(`${unit.id}: ${what}`);
  const palette = allColors();
  const note = UNIT_NOTES[unit.id];
  if (!note) say('has no line in units/notes.ts (its set, its role, how it is read)');
  if (!ATTACK_POSES[unit.style]) say(`moves in a way no pose is written for ("${unit.style}")`);
  if (unit.parts.filter((p) => p.role === 'shadow').length !== 1) say('has to have one ground shadow');
  if (!unit.parts.some((p) => p.role === 'body')) say('has no body: the rig hangs everything else from one');
  const names = unit.parts.map((p) => p.name);
  for (const n of new Set(names)) if (names.filter((m) => m === n).length > 1) say(`has two parts called "${n}"`);
  if (!(unit.top > -MARGIN && unit.top < 180)) say(`has its top at ${unit.top}, which is not on its page`);

  const drawn: Record<string, string> = {};
  for (const team of TEAMS) {
    let all = '';
    for (const part of unit.parts) {
      const svg = drawPart(unit, part, team).svg(CANVAS, CANVAS, MARGIN);
      all += svg;
      for (const m of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,8})"/g)) {
        if (!palette.has(m[1].toLowerCase())) say(`${part.name}: ${m[1]} is not in the palette`);
      }
      for (const m of svg.matchAll(/<(?:path|use)[^>]*stroke="([^"]+)"[^>]*stroke-width="([^"]+)"/g)) {
        if (m[1].toLowerCase() === OUTLINE && Number(m[2]) !== OUTLINE_WIDTH) say(`${part.name}: a dark line ${m[2]} wide (they are all ${OUTLINE_WIDTH})`);
      }
      if (/<style|<script|<filter|<image|href="[^#]/.test(svg)) say(`${part.name}: has a style, script, filter, picture or a reference to another file`);
      if (/NaN|undefined/.test(svg)) say(`${part.name}: a number in it did not come out as one`);
    }
    drawn[team] = all;
  }
  // A trap shows no side, so that it is not seen for what it is. Everything else has to show one.
  const same = drawn.blue === drawn.red;
  if (note?.role === 'trap' && !same) say('is a trap and shows its side: a trap has no cloth');
  if (note && note.role !== 'trap' && same) say('shows no side: it needs cloth in its team\'s color');
  return [...new Set(out)];
}

/** What is wrong with the whole cast. */
export function checkCast(units: readonly UnitArt[] = UNIT_ART): string[] {
  const out = units.flatMap(checkUnit);
  const ids = new Set(units.map((u) => u.id));
  for (const id of Object.keys(UNIT_NOTES)) if (!ids.has(id)) out.push(`${id}: has a line in units/notes.ts and no art`);
  return out;
}
