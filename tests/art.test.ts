import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { castList } from '../src/art/cast';
import { checkCast } from '../src/art/check';
import { allColors } from '../src/art/kit/palette';
import { allColors as grimColors } from '../src/grim/kit/palette';
import { checkCast as checkGrim } from '../src/grim/check';
import type { Manifest } from '../src/art/manifest';
import { UNIT_ART } from '../src/art/units';
import { ABILITIES, BUILDINGS, HELPERS, HUNTERS, MONSTERS, REINFORCEMENTS } from '../src/game/content';
import { ICONS_USED, abilityIcon } from '../src/view/icons';
import { ALLY_ART, BUILDING_ART, GRIM_UNITS, HELPER_ART, HUNTER_ART, LAIR_GROUND, MONSTER_ART, MONSTER_MOVES, ABILITY_MOVES, RIGGED, STILLS, WHOLE, isGrim } from '../src/view/pictures';
import { GRIM_RASTER, type GrimManifest } from '../src/view/art/grim';
import { SkylinePacker } from '../src/view/art/packer';

const manifest = JSON.parse(fs.readFileSync('public/assets/manifest.json', 'utf8')) as Manifest;
const grim = JSON.parse(fs.readFileSync('public/assets/grim/manifest.json', 'utf8')) as GrimManifest;

/** Every file under a folder, by its path. */
function files(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) files(full, out);
    else out.push(full);
  }
  return out;
}

const has = (rel: string): boolean => fs.existsSync(path.join('public/assets', rel));

describe('what the game asks the art for', () => {
  it('everything in the game has a picture named for it', () => {
    for (const h of HUNTERS) expect(HUNTER_ART[h.id], h.id).toBeDefined();
    for (const m of MONSTERS) {
      expect(MONSTER_ART[m.id], m.id).toBeDefined();
      expect(LAIR_GROUND[m.lair], m.lair).toBeDefined();
    }
    for (const f of HELPERS) expect(HELPER_ART[f.id], f.id).toBeDefined();
    for (const r of REINFORCEMENTS) expect(ALLY_ART[r.id], r.id).toBeDefined();
    for (const b of BUILDINGS) expect(BUILDING_ART[b.id], b.id).toBeDefined();
    expect(ALLY_ART.hound).toBeDefined();
  });

  it('a hunter and a monster are drawn part by part, everyone else as two whole pictures, and what a card shows is drawn whole', () => {
    for (const k of RIGGED) {
      const unit = manifest.units[k.unit];
      expect(unit, k.unit).toBeDefined();
      for (const part of unit.parts) expect(has(`units/${k.team}/${k.unit}/${part.name}.svg`), `${k.unit}/${part.name}`).toBe(true);
    }
    for (const k of STILLS) {
      expect(Object.keys(manifest.units[k.unit]?.stills ?? {}).sort(), k.unit).toEqual(['a', 'b']);
      expect(has(`units/${k.team}/${k.unit}/still-a.svg`) && has(`units/${k.team}/${k.unit}/still-b.svg`), k.unit).toBe(true);
    }
    for (const k of WHOLE) expect(has(`units/${k.team}/${k.unit}/full.svg`), k.unit).toBe(true);
  });

  it('every ability has a picture, and so has everything else a screen names', () => {
    const drawn = new Set(Object.keys(manifest.icons).map((n) => `icon/${n}`));
    for (const a of ABILITIES) expect(drawn.has(abilityIcon(a.id)), a.id).toBe(true);
    // Whatever a screen asks for by name is on the list the art build writes from.
    const asked = new Set<string>();
    for (const file of files('src/view').filter((f) => f.endsWith('.ts'))) {
      for (const m of fs.readFileSync(file, 'utf8').matchAll(/'icon\/([a-z0-9-]+)'/g)) asked.add(m[1]);
    }
    for (const name of asked) expect(ICONS_USED.has(name), `icon/${name}`).toBe(true);
    for (const name of ICONS_USED) expect(drawn.has(`icon/${name}`), name).toBe(true);
  });

  it('nothing is written that the game does not show', () => {
    expect(Object.keys(manifest.icons).sort()).toEqual([...ICONS_USED].sort());
    const cast = new Set([...RIGGED, ...STILLS, ...WHOLE].map((k) => k.unit));
    expect(Object.keys(manifest.units).sort()).toEqual([...cast].sort());
    expect(Object.keys(manifest.grades)).toEqual([]);
  });

  it('every kind of lair has a ground, lying down and stood up', () => {
    for (const ground of Object.values(LAIR_GROUND)) {
      const at = 'grim' in ground ? `grim/grounds/${ground.grim}` : `arena/${ground.legion}`;
      expect(has(`${at}-wide.svg`), at).toBe(true);
      expect(has(`${at}-tall.svg`), at).toBe(true);
    }
  });

  it('every figure of the style the game shows is written part by part, with the moves its attacks are shown by', () => {
    for (const id of GRIM_UNITS) {
      const unit = grim.units[id];
      expect(unit, id).toBeDefined();
      for (const part of unit.parts) expect(has(`grim/units/${id}/${part.name}.svg`), `${id}/${part.name}`).toBe(true);
      expect(has(`grim/units/${id}/full.svg`), id).toBe(true);
    }
    for (const [monster, moves] of Object.entries(MONSTER_MOVES)) {
      const art = MONSTER_ART[monster];
      if (!isGrim(art)) continue;
      for (const move of Object.values(moves)) expect(grim.units[art.grim].moves[move], `${monster}: ${move}`).toBeDefined();
    }
    for (const h of HUNTERS) {
      const art = HUNTER_ART[h.id];
      if (!isGrim(art)) continue;
      for (const a of h.abilities) {
        const move = ABILITY_MOVES[a];
        if (move) expect(grim.units[art.grim].moves[move], `${h.id}: ${move}`).toBeDefined();
      }
    }
  });
});

describe('the pictures', () => {
  const svgs = files('public/assets').filter((f) => f.endsWith('.svg'));

  it('are drawn in the palette and no other colors', () => {
    // Two kits, two palettes: a picture is in its own kit's and no other.
    const legion = new Set([...allColors()].map((c) => c.toLowerCase()));
    const style = new Set([...grimColors()].map((c) => c.toLowerCase()));
    // One color the kit draws with and does not list: the red of the monster's bar. It is as the kit has it, and its artist has been told.
    style.add('#e0564a');
    const strange = new Map<string, string>();
    for (const file of svgs) {
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
        const c = m[0].toLowerCase();
        const allowed = file.includes(`${path.sep}grim${path.sep}`) ? style : legion;
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
    expect(bytes).toBeLessThan(3_600_000);
  });
});

describe('the sheet of the field', () => {
  // Packed as the game packs it (view/art/Sheet.ts, view/scenes/BootScene.ts): what is kept from the start,
  // and under it the units of a field. If a field does not fit, the game stops when it is come to.
  const WIDTH = 2048;
  const HEIGHT = 4096;
  const kept = (): SkylinePacker => {
    const p = new SkylinePacker(WIDTH, HEIGHT);
    const list = [...Object.values(manifest.fx), ...Object.values(manifest.icons), ...Object.values(manifest.packs)].sort((a, b) => b.height - a.height);
    for (const img of list) expect(p.place(img.width * 2, img.height * 2)).not.toBeNull();
    // The digits of the numbers that fly up.
    expect(p.place(44 * 40, 60)).not.toBeNull();
    p.newRow();
    return p;
  };
  const parts = (unit: string): Array<readonly [number, number]> => manifest.units[unit].parts.map((part) => [part.box[2] * 2, part.box[3] * 2] as const);
  const stills = (unit: string): Array<readonly [number, number]> => Object.values(manifest.units[unit].stills ?? {}).map((b) => [b[2], b[3]] as const);

  it('holds what is kept from the start in a third of itself', () => {
    expect(kept().used()).toBeLessThan(0.34);
  });

  it('holds any hunter, any monster, and everyone and everything else that can be on a field, all at once', () => {
    const p = kept();
    // A figure of the style is cut part by part at the sheet's own sharpness; a stand-in as the Legion kit has it.
    const style = (id: string): Array<readonly [number, number]> => grim.units[id].parts.map((part) => [Math.ceil(part.box[2] * GRIM_RASTER), Math.ceil(part.box[3] * GRIM_RASTER)] as const);
    const area = (list: Array<readonly [number, number]>): number => list.reduce((a, [w, h]) => a + w * h, 0);
    const of = (a: (typeof HUNTER_ART)[string]): Array<readonly [number, number]> => (isGrim(a) ? style(a.grim) : parts(a.legion));
    const biggest = (list: Array<(typeof HUNTER_ART)[string]>): Array<readonly [number, number]> => list.map(of).sort((a, b) => area(b) - area(a))[0];
    const others = [...Object.values(HELPER_ART), ...Object.values(ALLY_ART), ...Object.values(BUILDING_ART)].flatMap((a) => (isGrim(a) ? style(a.grim) : []));
    const things = Object.values(grim.things).filter((t) => t.set === 'churchyard').map((t) => [t.width, t.height] as const);
    const all = [...biggest(Object.values(HUNTER_ART)), ...biggest(Object.values(MONSTER_ART)), ...others, ...things, ...STILLS.flatMap((k) => stills(k.unit))].sort((a, b) => b[1] - a[1]);
    expect(p.fits(all)).toBe(true);
  });
});

describe('the style the game is drawn in', () => {
  it('holds to its own rules: its palette, its line, a shadow under every figure', () => {
    expect(checkGrim()).toEqual([]);
  });
});

describe('the whole cast of the kit, whether this game shows a unit or not', () => {
  it('is in the palette, in one line width, with a shadow, a body, a line in the notes, and cloth of its side unless it is a trap', () => {
    expect(checkCast()).toEqual([]);
  });

  it('is listed for a person to read as it is drawn', () => {
    expect(UNIT_ART.length).toBeGreaterThan(200);
    expect(fs.readFileSync('docs/art/roster.md', 'utf8'), 'run npm run art:roster -- list=docs/art/roster.md').toBe(castList());
  });
});
