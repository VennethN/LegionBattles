import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { castList } from '../src/art/cast';
import { checkCast } from '../src/art/check';
import { WEAPON_ART } from '../src/art/holdout';
import { allColors } from '../src/art/kit/palette';
import type { Manifest } from '../src/art/manifest';
import { UNIT_ART } from '../src/art/units';
import { BAND, COMPANIONS, ENEMIES, FUSED, HEROES, ITEMS, LANDS_DEF, LAND_NAMES, RELICS, ROAD, WEAPONS, byId } from '../src/game/data';
import { STAT_INFO, STATS } from '../src/game/stats';
import { ICONS_USED, THING_ICONS, itemIcon, relicIcon, statIcon, weaponIcon, HOLD_PLACES } from '../src/view/icons';
import { SkylinePacker } from '../src/view/art/packer';

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

const has = (rel: string): boolean => fs.existsSync(path.join('public/assets', rel));
/** Those who fight: a wagon and a cage are things, with pictures of their own. */
const FIGHTERS = ENEMIES.filter((e) => !e.prop);

describe('what the game asks the art for', () => {
  it('every hero is drawn part by part and whole, in blue', () => {
    for (const h of HEROES) {
      const unit = manifest.units[h.unit];
      expect(unit, h.id).toBeDefined();
      for (const part of unit.parts) expect(has(`units/blue/${h.unit}/${part.name}.svg`), `${h.unit}/${part.name}`).toBe(true);
      expect(has(`units/blue/${h.unit}/full.svg`), h.unit).toBe(true);
      // The hand that what they carry is taken out of: a figure with nothing in it has no hand to bare.
      expect(unit.parts.some((p) => p.role === 'weapon'), h.unit).toBe(true);
    }
  });

  it('every enemy is drawn in red: a boss part by part, the rest as two whole pictures to walk between', () => {
    for (const e of FIGHTERS) {
      const unit = manifest.units[e.unit];
      expect(unit, e.id).toBeDefined();
      if (e.ai === 'boss') {
        for (const part of unit.parts) expect(has(`units/red/${e.unit}/${part.name}.svg`), `${e.unit}/${part.name}`).toBe(true);
      } else {
        expect(Object.keys(unit.stills ?? {}).sort(), e.id).toEqual(['a', 'b']);
        expect(has(`units/red/${e.unit}/still-a.svg`) && has(`units/red/${e.unit}/still-b.svg`), e.id).toBe(true);
        // Its parts are not written: nobody moves them.
        expect(has(`units/red/${e.unit}/${unit.parts[0].name}.svg`), e.id).toBe(false);
      }
    }
  });

  it('every weapon, every ware and every stat has a picture, and so has everything else a screen names', () => {
    const drawn = new Set(Object.keys(manifest.icons).map((n) => `icon/${n}`));
    for (const w of WEAPONS) expect(drawn.has(weaponIcon(w.id)), w.id).toBe(true);
    expect([...WEAPON_ART].sort()).toEqual(WEAPONS.map((w) => w.id).sort());
    for (const it of ITEMS) expect(drawn.has(itemIcon(it.id)), it.id).toBe(true);
    for (const r of [...RELICS, ...FUSED]) expect(drawn.has(relicIcon(r.id)), r.id).toBe(true);
    // What a road puts on the field is a picture of its own, not a figure.
    for (const e of ENEMIES.filter((x) => x.prop)) expect(drawn.has(THING_ICONS[e.prop as keyof typeof THING_ICONS]), e.id).toBe(true);
    expect(drawn.has(THING_ICONS.shrine)).toBe(true);
    for (const s of STATS) expect(drawn.has(statIcon(STAT_INFO[s].icon)), s).toBe(true);
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
    // And what stands in the Hold behind them: the gate.
    const cast = new Set([...HEROES.map((h) => h.unit), ...COMPANIONS.map((c) => c.unit), ...FIGHTERS.map((e) => e.unit), ...HOLD_PLACES]);
    expect(Object.keys(manifest.units).sort()).toEqual([...cast].sort());
    expect(Object.keys(manifest.grades)).toEqual([]);
  });

  it('every land has a ground, lying down and stood up', () => {
    for (const land of Object.keys(LAND_NAMES)) {
      expect(has(`arena/${land}-wide.svg`), land).toBe(true);
      expect(has(`arena/${land}-tall.svg`), land).toBe(true);
    }
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

  // It was a third before the road: thirteen more weapons, a picture for every relic and the things of the road took it to under a half.
  // Each land's two wares and Master's Temper took it to just under one: what a wave stands up still fits, as the test after this holds.
  // The shapes effects are made of (src/art/fxShapes.ts, written small and scaled up where shown) took it just over a half:
  // what is left for the units is held by the test after this, which is the one that matters.
  it('holds what is kept from the start in about half of itself', () => {
    expect(kept().used()).toBeLessThan(0.51);
  });

  it('every companion is drawn part by part, in blue', () => {
    for (const c of COMPANIONS) {
      const unit = manifest.units[c.unit];
      expect(unit, c.id).toBeDefined();
      for (const part of unit.parts) expect(has(`units/blue/${c.unit}/${part.name}.svg`), `${c.unit}/${part.name}`).toBe(true);
    }
  });

  it('holds any hero, the biggest band there can be and everyone a land fields, in every one of the ten', () => {
    const size = (unit: string): number => manifest.units[unit].full[3] * manifest.units[unit].full[2];
    const tallest = HEROES.map((h) => h.unit).sort((a, b) => size(b) - size(a))[0];
    // A band is as many as there are slots, and the strays a road may add: the biggest of them, to be sure of the rest.
    const band = COMPANIONS.map((c) => c.unit).sort((a, b) => size(b) - size(a)).slice(0, BAND.places + ROAD.stray.most);
    for (const land of LANDS_DEF) {
      // A field holds one land's: its roster, whoever they call up, and its boss. The sheet is wiped between lands.
      const foes = land.roster.map(([id]) => id);
      const called = foes.map((id) => byId(ENEMIES, id).calls).filter((id): id is string => !!id);
      const p = kept();
      const all = [...parts(tallest), ...band.flatMap(parts), ...parts(land.boss), ...[...foes, ...called].flatMap(stills)].sort((a, b) => b[1] - a[1]);
      expect(p.fits(all), land.id).toBe(true);
    }
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
