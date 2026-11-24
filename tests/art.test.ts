import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { allColors } from '../src/art/kit/palette';
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
