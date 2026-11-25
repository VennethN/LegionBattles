import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { castList } from '../src/art/cast';
import { checkCast } from '../src/art/check';
import { UNIT_ART } from '../src/art/units';
import { UNIT_NOTES } from '../src/art/units/notes';
import { UNITS } from '../src/data/units';

// The kit draws more units than this game has: its sister games draw with
// the same kit, and whoever is drawn for one is there for all. The ones this
// game does not use yet are written to no file here, so nothing else would
// notice one going wrong.
describe('the whole cast of the kit', () => {
  it('is in the palette, in one line width, with a shadow, a body, a line in the notes, and cloth of its side unless it is a trap', () => {
    expect(checkCast()).toEqual([]);
    expect(UNIT_ART.length).toBe(Object.keys(UNIT_NOTES).length);
  });

  it('has everyone the game has, and more to choose from', () => {
    const drawn = new Set(UNIT_ART.map((u) => u.id));
    for (const id of Object.keys(UNITS)) expect(drawn.has(id), id).toBe(true);
    expect(UNIT_ART.length).toBeGreaterThan(Object.keys(UNITS).length);
  });

  it('is listed for a person to read, in the docs and in the skill, as it is drawn', () => {
    for (const file of ['docs/art/roster.md', '.claude/skills/legion-art/references/roster.md']) {
      expect(fs.readFileSync(file, 'utf8'), `${file}: run npm run art:roster -- list=${file}`).toBe(castList());
    }
  });
});
