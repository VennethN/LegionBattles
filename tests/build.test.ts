import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { roundPath } from '../vite.config';

/** Every point a path's commands reach, in absolute units, to compare a path with its rounded copy. */
function points(d: string): Array<[number, number]> {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)/g) ?? [];
  const sizes: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7 };
  const out: Array<[number, number]> = [];
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let i = 0;
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) {
      cmd = tokens[i++];
      if (cmd.toLowerCase() === 'z') {
        x = sx;
        y = sy;
        continue;
      }
    }
    const lower = cmd.toLowerCase();
    const v = tokens.slice(i, i + sizes[lower]).map(Number);
    i += sizes[lower];
    const rel = cmd === lower;
    if (lower === 'h') x = rel ? x + v[0] : v[0];
    else if (lower === 'v') y = rel ? y + v[0] : v[0];
    else if (lower === 'a') {
      x = rel ? x + v[5] : v[5];
      y = rel ? y + v[6] : v[6];
    } else {
      const bx = x;
      const by = y;
      for (let k = 0; k < v.length; k += 2) out.push([rel ? bx + v[k] : v[k], rel ? by + v[k + 1] : v[k + 1]]);
      x = out[out.length - 1][0];
      y = out[out.length - 1][1];
    }
    out.push([x, y]);
    if (lower === 'm') {
      sx = x;
      sy = y;
      cmd = rel ? 'l' : 'L';
    }
  }
  return out;
}

describe('the build', () => {
  it('rounds a path so that no point drifts more than half a unit, however long the path', () => {
    const d = `M10.4 10.4${'l1.3 1.3'.repeat(40)}c1.2-3.4 5.6 7.8 9.1-2.2s3.3 4.4 1.1 1.1q2.2 2.2 3.3-1.5t4.4 4.4h3.3v-2.7a4.4 4.4 0 0 1 6.6 6.6z`;
    const a = points(d);
    const b = points(roundPath(d));
    expect(b.length).toBe(a.length);
    a.forEach(([x, y], k) => {
      expect(Math.abs(b[k][0] - x)).toBeLessThanOrEqual(0.5 + 1e-9);
      expect(Math.abs(b[k][1] - y)).toBeLessThanOrEqual(0.5 + 1e-9);
    });
    expect(roundPath(d).length).toBeLessThan(d.length);
  });

  it('stays well under the 5 MB a portal allows', () => {
    // A built copy is measured where there is one; the check builds before its tests are run only in CI, so it may not be.
    const dist = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(dist)) return;
    let total = 0;
    const walk = (dir: string): void => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) walk(f);
        else total += fs.statSync(f).size;
      }
    };
    walk(dist);
    expect(total).toBeLessThan(4.8 * 1000 * 1000);
  });
});
