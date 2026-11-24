import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Manifest } from '../src/art/manifest';
import { UNIT_ART } from '../src/art/units';
import { CAMP, HEROES, LANDS } from '../src/game/data';
import { SkylinePacker } from '../src/view/art/packer';

// The fight's art is on one sheet, 2048 wide and 4096 tall, with everything
// drawn at 2x. These tests pack it as the game does (view/art/Sheet.ts,
// view/scenes/BootScene.ts), with the numbers npm run art wrote, and fail
// when something no longer fits: which is how a hero or a land that is one
// too many is found before a player finds it.

const manifest = JSON.parse(fs.readFileSync('public/assets/manifest.json', 'utf8')) as Manifest;
const WIDTH = 2048;
const HEIGHT = 4096;
const S = 2;

type Box = [number, number, number, number];

function overlaps(boxes: Box[]): number {
  let n = 0;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]) n++;
    }
  }
  return n;
}

describe('the packer', () => {
  it('sets pictures down side by side, none over another, none over the edge', () => {
    const p = new SkylinePacker(512, 512);
    const boxes: Box[] = [];
    let seed = 7;
    const dice = (): number => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 400; i++) {
      const w = 8 + Math.floor(dice() * 70);
      const h = 8 + Math.floor(dice() * 70);
      const spot = p.place(w, h);
      if (!spot) continue;
      expect(spot.x).toBeGreaterThanOrEqual(p.pad);
      expect(spot.y).toBeGreaterThanOrEqual(p.pad);
      expect(spot.x + w + p.pad).toBeLessThanOrEqual(512);
      expect(spot.y + h + p.pad).toBeLessThanOrEqual(512);
      // With the room it is given round it, so that one picture's edge does not show on the next.
      boxes.push([spot.x, spot.y, w + p.pad, h + p.pad]);
    }
    expect(boxes.length).toBeGreaterThan(60);
    expect(overlaps(boxes)).toBe(0);
    // It wastes little: most of what it was given room for is picture.
    const used = boxes.reduce((a, b) => a + b[2] * b[3], 0);
    expect(used / (512 * 512)).toBeGreaterThan(0.7);
  });

  it('says no when there is no room, and can be asked without anything being set down', () => {
    const p = new SkylinePacker(100, 100);
    expect(p.place(200, 10)).toBeNull();
    expect(p.fits([[90, 40], [90, 40]])).toBe(true);
    expect(p.fits([[90, 40], [90, 40], [90, 40]])).toBe(false);
    // Asking set nothing down.
    expect(p.used()).toBeLessThan(0.05);
    expect(p.place(90, 40)).toEqual({ x: p.pad, y: p.pad });
  });

  it('comes back to where it stood', () => {
    const p = new SkylinePacker(256, 256);
    p.place(100, 50);
    const top = p.newRow();
    expect(top).toBe(p.pad + 50 + p.pad);
    const mark = p.mark();
    const first = p.place(60, 60);
    p.place(120, 30);
    p.restore(mark);
    expect(p.place(60, 60)).toEqual(first);
    // What was above the line stays above it.
    expect(first?.y).toBeGreaterThanOrEqual(top);
  });
});

describe('the sheet', () => {
  const heroes = HEROES.map((h) => h.unit);
  const camp = CAMP.map((c) => c.unit);
  const foes = [...new Set(LANDS.flatMap((l) => [...l.troops, l.captain, l.boss]))];

  it('has art for everyone the game shows', () => {
    const drawn = new Set(UNIT_ART.map((u) => u.id));
    for (const unit of [...heroes, ...camp, ...foes]) {
      expect(drawn.has(unit), `${unit} is drawn`).toBe(true);
      expect(manifest.units[unit], `${unit} is in the manifest: run npm run art`).toBeDefined();
    }
    for (const unit of [...heroes, ...camp]) {
      expect(fs.existsSync(path.join('public/assets/units/blue', unit, 'full.svg')), `${unit}'s picture for the lists`).toBe(true);
      for (const part of manifest.units[unit].parts) expect(fs.existsSync(path.join('public/assets/units/blue', unit, `${part.name}.svg`)), `${unit}/${part.name}`).toBe(true);
    }
    for (const unit of foes) {
      for (const part of manifest.units[unit].parts) expect(fs.existsSync(path.join('public/assets/units/red', unit, `${part.name}.svg`)), `${unit}/${part.name}`).toBe(true);
    }
  });

  it('holds the whole legion, its camp and every land\'s enemies at once', () => {
    const p = new SkylinePacker(WIDTH, HEIGHT);
    for (const folder of ['fx', 'icons', 'packs'] as const) {
      const list = Object.entries(manifest[folder]).sort((a, b) => b[1].height - a[1].height);
      for (const [name, img] of list) expect(p.place(img.width * S, img.height * S), `${folder}/${name}`).not.toBeNull();
    }
    // The digits the damage numbers are drawn with (view/Numbers.ts): a strip of them.
    expect(p.place(44 * 43, 60)).not.toBeNull();
    p.newRow();
    // Figures come one at a time, in whatever order a player meets them: here the worst way round, big late.
    const boxes: Box[] = [];
    const add = (unit: string): void => {
      const parts = manifest.units[unit].parts.map((q) => [q.box[2] * S, q.box[3] * S] as const).sort((a, b) => b[1] - a[1]);
      expect(p.fits(parts), `room for ${unit}`).toBe(true);
      for (const [w, h] of parts) {
        const spot = p.place(w, h);
        if (spot) boxes.push([spot.x, spot.y, w, h]);
      }
    };
    for (const unit of foes) add(unit);
    for (const unit of camp) add(unit);
    for (const unit of heroes) add(unit);
    expect(overlaps(boxes)).toBe(0);
    // With room to spare for a land or a few heroes more.
    expect(p.used()).toBeLessThan(0.9);
  });
});
