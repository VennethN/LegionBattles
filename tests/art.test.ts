import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { castList } from '../src/art/cast';
import { checkCast, checkUnit } from '../src/art/check';
import { circle } from '../src/art/kit/path';
import { allColors } from '../src/art/kit/palette';
import { UNIT_ART } from '../src/art/units';
import { UNIT_NOTES } from '../src/art/units/notes';
import type { Manifest } from '../src/art/manifest';
import { CAMP, HEROES, LANDS } from '../src/game/data';
import { THEMES } from '../src/audio/music';

const manifest = JSON.parse(fs.readFileSync('public/assets/manifest.json', 'utf8')) as Manifest;

/** Every file under a folder, by its path. */
function files(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) files(full, out);
    else out.push(full);
  }
  return out;
}

describe('what the screens ask the art for', () => {
  const sources = files('src/view').filter((f) => f.endsWith('.ts')).map((f) => fs.readFileSync(f, 'utf8')).join('\n');

  it('every icon, effect and pack named in a screen is one the art build writes', () => {
    const asked = [...sources.matchAll(/['`](icon|fx|pack)\/([a-z0-9-]+)['`]/g)];
    expect(asked.length).toBeGreaterThan(20);
    for (const [, kind, name] of asked) {
      // "fx/solid" is the middle of "fx/pixel", cut out when the game starts (view/art/Sheet.ts).
      if (kind === 'fx' && name === 'solid') continue;
      const folder = kind === 'icon' ? manifest.icons : kind === 'fx' ? manifest.fx : manifest.packs;
      expect(folder[name], `${kind}/${name}`).toBeDefined();
    }
  });

  it('every land has an emblem, a ground, a pack and a tune', () => {
    for (const land of LANDS) {
      expect(manifest.icons[`land-${land.ground}`], `emblem of ${land.id}`).toBeDefined();
      expect(fs.existsSync(`public/assets/ground/${land.ground}.svg`), `ground of ${land.id}`).toBe(true);
      expect(THEMES[land.ground], `tune of ${land.id}`).toBeDefined();
    }
    // The packs are named in view/StageView.ts, one to each kind of ground.
    for (const name of ['thornwood', 'dunes', 'frost']) expect(manifest.packs[name], name).toBeDefined();
  });

  it('nothing is written that the game does not show', () => {
    const cast = new Set([...HEROES.map((h) => h.unit), ...CAMP.map((c) => c.unit), ...LANDS.flatMap((l) => [...l.troops, l.captain, l.boss])]);
    expect(Object.keys(manifest.units).sort()).toEqual([...cast].sort());
  });
});

describe('the pictures', () => {
  const svgs = files('public/assets').filter((f) => f.endsWith('.svg'));

  it('are drawn in the palette and no other colors', () => {
    const allowed = new Set([...allColors()].map((c) => c.toLowerCase()));
    const strange = new Map<string, string>();
    for (const file of svgs) {
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
        const c = m[0].toLowerCase();
        if (!allowed.has(c) && !strange.has(c)) strange.set(c, file);
      }
    }
    expect([...strange.entries()]).toEqual([]);
  });

  it('have no picture, font or script from anywhere else in them', () => {
    for (const file of svgs) {
      const text = fs.readFileSync(file, 'utf8');
      expect(/<image|<script|<foreignObject|@import|https?:\/\/(?!www\.w3\.org)/.test(text), file).toBe(false);
    }
  });

  it('fit the build: the whole of the art is well under what a portal takes', () => {
    const bytes = files('public/assets').reduce((a, f) => a + fs.statSync(f).size, 0);
    expect(bytes).toBeLessThan(4_200_000);
  });
});

describe('the whole cast, whether this game shows a unit or not', () => {
  it('is in the palette, in one line width, with a shadow, a body, a line in the notes, and cloth of its side unless it is a trap', () => {
    expect(checkCast()).toEqual([]);
    expect(UNIT_ART.length).toBe(Object.keys(UNIT_NOTES).length);
  });

  it('is caught when a unit breaks the style: a color of its own, or no side', () => {
    const knight = UNIT_ART.find((u) => u.id === 'knight')!;
    const painted = { ...knight, parts: [...knight.parts, { ...knight.parts[1], name: 'spot', draw: (d: Parameters<typeof knight.parts[1]['draw']>[0]) => void d.flat('spot', circle(96, 96, 4), '#123456') }] };
    expect(checkUnit(painted).join(' ')).toContain('#123456 is not in the palette');
    const trap = UNIT_ART.find((u) => u.id === 'spiketrap')!;
    expect(checkUnit({ ...trap, id: 'knight' }).join(' ')).toContain('shows no side');
    expect(checkUnit({ ...knight, id: 'spiketrap' }).join(' ')).toContain('is a trap and shows its side');
    expect(checkUnit({ ...knight, id: 'nobody' }).join(' ')).toContain('has no line in units/notes.ts');
  });

  it('is listed for a person to read, in the docs and in the skill, as it is drawn', () => {
    for (const file of ['docs/art/roster.md', '.claude/skills/legion-art/references/roster.md']) {
      expect(fs.readFileSync(file, 'utf8'), `${file}: run npm run art:roster -- list=${file}`).toBe(castList());
    }
  });
});

describe('the art skill', () => {
  it('carries the kit as it is here, so that the next game starts from what this one added', () => {
    // If this fails, the kit was changed and the skill was not told: node .claude/skills/legion-art/scripts/sync.mjs .
    const said = execFileSync('node', ['.claude/skills/legion-art/scripts/sync.mjs', '.', '--check'], { encoding: 'utf8' });
    expect(said).toContain('the skill has');
  });
});
