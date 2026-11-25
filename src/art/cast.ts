// The cast as a list a person reads: each set, each unit, the part it was
// drawn to play and how it is told from the rest. It is written out as
// docs/art/roster.md and into the art skill (npm run art:roster list=...),
// and a test holds both to this, so the list is never behind the drawings.

import { UNIT_ART } from './units';
import { UNIT_NOTES } from './units/notes';

/** The sets in the order their first unit was drawn. */
export function castSets(): string[] {
  return [...new Set(UNIT_ART.map((u) => UNIT_NOTES[u.id]?.set ?? 'No set'))];
}

export function castList(): string {
  const sets = castSets();
  let md =
    `# The cast\n\nEvery unit the kit draws: ${UNIT_ART.length} in ${sets.length} sets. ` +
    'Written by `npm run art:roster list=<file>` from `src/art/units/notes.ts`: do not edit it by hand.\n\n' +
    'A game uses a unit by its id. The role is the part it was drawn to play, and a game may use it otherwise. ' +
    'To see them, `npm run art:roster -- <set, role or id ...>` draws a sheet.\n';
  for (const set of sets) {
    const of = UNIT_ART.filter((u) => (UNIT_NOTES[u.id]?.set ?? 'No set') === set);
    md += `\n## ${set} (${of.length})\n\n| id | role | read it by |\n| --- | --- | --- |\n`;
    for (const u of of) md += `| \`${u.id}\` | ${UNIT_NOTES[u.id]?.role ?? ''} | ${UNIT_NOTES[u.id]?.read ?? ''} |\n`;
  }
  return md;
}
