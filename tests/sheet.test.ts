import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Manifest } from '../src/art/manifest';
import { UNITS } from '../src/data/units';
import { WORLDS } from '../src/data/worlds';
import { MAX_TEAM } from '../src/game/rules';
import { ShelfPacker } from '../src/view/packer';

// The sheets are 2048 on a side and everything is drawn at 2x. These tests
// pack them as the game does (view/Sheet.ts, view/scenes/BootScene.ts), with
// the numbers npm run art wrote, and fail when something no longer fits:
// which is how a new unit that is one too many is found before a player does.

const manifest = JSON.parse(fs.readFileSync('public/assets/manifest.json', 'utf8')) as Manifest;
const SIZE = 2048;
const S = 2;

function keepFolder(p: ShelfPacker, folder: 'fx' | 'board' | 'icons' | 'packs' | 'grades'): void {
  const list = Object.entries(manifest[folder]).sort((a, b) => b[1].height - a[1].height);
  for (const [name, img] of list) expect(p.place(img.width * S, img.height * S), `${folder}/${name}`).not.toBeNull();
}

function unitParts(units: readonly string[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const u of units) for (const part of manifest.units[u].parts) out.push([part.box[2] * S, part.box[3] * S]);
  return out.sort((a, b) => b[1] - a[1]);
}

function area(unit: string): number {
  return manifest.units[unit].parts.reduce((a, p) => a + p.box[2] * p.box[3], 0);
}

describe('the art manifest', () => {
  it('has art for every unit the game has, and the game has every unit there is art for', () => {
    expect(Object.keys(manifest.units).sort()).toEqual(Object.keys(UNITS).sort());
  });

  it('has a picture for everything a unit shoots', () => {
    for (const u of Object.values(UNITS)) {
      if (u.projectile) expect(manifest.fx[u.projectile.kind], `${u.id} shoots ${u.projectile.kind}`).toBeDefined();
      if (u.skill?.projectile) expect(manifest.fx[u.skill.projectile], `${u.id}'s skill`).toBeDefined();
    }
  });

  it('gives every unit the parts the rig needs', () => {
    for (const [id, u] of Object.entries(manifest.units)) {
      const roles = u.parts.map((p) => p.role);
      expect(roles.filter((r) => r === 'shadow'), id).toHaveLength(1);
      expect(roles.filter((r) => r === 'body'), id).toHaveLength(1);
      expect(roles.filter((r) => r === 'weapon'), id).toHaveLength(1);
      expect(roles.filter((r) => r === 'head').length, id).toBeLessThanOrEqual(1);
      for (const p of u.parts) {
        expect(p.box[2], `${id}/${p.name}`).toBeGreaterThan(0);
        expect(p.box[0] + p.box[2], `${id}/${p.name}`).toBeLessThanOrEqual(manifest.canvas);
      }
    }
  });
});

describe('the battle sheet', () => {
  it('holds the biggest battle the game can stage, under what is always on it', () => {
    const p = new ShelfPacker(SIZE, SIZE);
    keepFolder(p, 'fx');
    keepFolder(p, 'board');
    keepFolder(p, 'icons');
    expect(p.place(44 * 12, 60)).not.toBeNull();
    p.newRow();
    const kept = p.used();

    // The player's eight biggest, and each stage's enemies in turn.
    const biggest = Object.keys(manifest.units).sort((a, b) => area(b) - area(a)).slice(0, MAX_TEAM);
    let worst = 0;
    for (const w of WORLDS) {
      for (const stage of w.stages) {
        const enemies = [...new Set(stage.enemies.map((e) => e.unit))];
        const mark = p.mark();
        expect(p.fits([...unitParts(biggest), ...unitParts(enemies)].sort((a, b) => b[1] - a[1])), `${w.name}: ${stage.name}`).toBe(true);
        for (const [pw, ph] of [...unitParts(biggest), ...unitParts(enemies)].sort((a, b) => b[1] - a[1])) p.place(pw, ph);
        worst = Math.max(worst, p.used());
        p.restore(mark);
      }
    }
    expect(kept).toBeLessThan(0.45);
    // Room to spare, for the units still to come.
    expect(worst).toBeLessThan(0.95);
  });
});

describe('the card sheet', () => {
  it('holds every pack, every unit on both sides, and every grade', () => {
    const p = new ShelfPacker(SIZE, SIZE);
    keepFolder(p, 'packs');
    const units = Object.entries(manifest.units).sort((a, b) => b[1].full[3] - a[1].full[3]);
    for (const scale of [S, 1]) {
      for (const [id, u] of units) expect(p.place(Math.round(u.full[2] * scale), Math.round(u.full[3] * scale)), id).not.toBeNull();
    }
    keepFolder(p, 'grades');
    expect(p.used()).toBeLessThan(0.97);
  });
});
