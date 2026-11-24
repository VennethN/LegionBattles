import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { describe, expect, it } from 'vitest';
import { minifySvg } from '../vite.config';

const ASSETS = path.resolve('public/assets');

function pixels(svg: string): Uint8Array {
  return new Resvg(svg).render().pixels;
}

describe('a picture as it is shipped', () => {
  const files = [
    'units/blue/knight/full.svg', 'units/red/jarl/full.svg', 'units/blue/lancer/lance.svg', 'units/blue/icegolem/body.svg',
    'icons/land-meadow.svg', 'packs/thornwood.svg', 'grades/S.svg', 'fx/arrow.svg', 'board/desert.svg', 'maps/frostholt.svg',
  ];

  it('is drawn exactly as the file it was made from', () => {
    for (const rel of files) {
      const svg = fs.readFileSync(path.join(ASSETS, rel), 'utf8');
      const small = minifySvg(svg);
      const a = pixels(svg);
      const b = pixels(small);
      expect(b.length, rel).toBe(a.length);
      let differ = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differ++;
      expect(differ, rel).toBe(0);
    }
  });

  it('is a good deal smaller, and points only at what is in it', () => {
    let before = 0;
    let after = 0;
    for (const rel of files) {
      const svg = fs.readFileSync(path.join(ASSETS, rel), 'utf8');
      const small = minifySvg(svg);
      before += svg.length;
      after += small.length;
      const ids = new Set([...small.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
      for (const m of small.matchAll(/(?:href="#|url\(#)([^")]+)/g)) expect(ids.has(m[1]), `${rel}: ${m[1]}`).toBe(true);
      // Every id left is one that something points at.
      const pointed = new Set([...small.matchAll(/(?:href="#|url\(#)([^")]+)/g)].map((m) => m[1]));
      for (const id of ids) expect(pointed.has(id), `${rel}: ${id}`).toBe(true);
    }
    expect(after).toBeLessThan(before * 0.8);
  });
});
