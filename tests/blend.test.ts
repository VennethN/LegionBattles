import { describe, expect, it } from 'vitest';
import { Blend, shareOf } from '../src/view/blend';

/** A thing moving steadily, stepped at a sixtieth of a second, drawn by frames of any length. */
function drawn(frameMs: number, frames: number): number[] {
  const STEP = 1 / 60;
  const blend = new Blend();
  let x = 0;
  let acc = 0;
  const out: number[] = [];
  for (let f = 0; f < frames; f++) {
    acc += frameMs / 1000;
    while (acc >= STEP) {
      blend.keep('hero', x, 0);
      blend.prune();
      x += 200 * STEP;
      acc -= STEP;
    }
    out.push(blend.x('hero', x, shareOf(acc, STEP)));
  }
  return out;
}

describe('drawing between the steps of the wave', () => {
  it('draws a steady walk as steady, whatever the length of a frame', () => {
    // Frames that never line up with the steps: 75 and 144 to the second, and an odd 7 and 23 thousandths.
    for (const ms of [1000 / 75, 1000 / 144, 7, 23, 16.9]) {
      const xs = drawn(ms, 240).slice(8);
      const moved = xs.slice(1).map((x, i) => x - xs[i]);
      const want = (200 * ms) / 1000;
      // Every frame moves it as far as the frame was long, to within a hair. Without the blend a frame moves it by no step or by two.
      for (const d of moved) expect(Math.abs(d - want), `${ms} ms`).toBeLessThan(0.01);
    }
  });

  it('without the blend the same walk jerks: that is the fault it is there for', () => {
    const STEP = 1 / 60;
    let x = 0;
    let acc = 0;
    const moved: number[] = [];
    for (let f = 0; f < 120; f++) {
      const before = x;
      acc += 1 / 75;
      while (acc >= STEP) {
        x += 200 * STEP;
        acc -= STEP;
      }
      moved.push(x - before);
    }
    expect(Math.max(...moved) - Math.min(...moved)).toBeGreaterThan(3);
  });

  it('draws a thing that has just come to be where it is, and does not draw a leap half way', () => {
    const blend = new Blend();
    expect(blend.x(7, 300, 0.5)).toBe(300);
    blend.keep(7, 300, 100);
    blend.prune();
    expect(blend.x(7, 302, 0.5)).toBe(301);
    expect(blend.y(7, 104, 0.25)).toBe(101);
    // Thrown across the field in one step: drawn where it landed.
    expect(blend.x(7, 700, 0.5)).toBe(700);
  });

  it('forgets what is gone', () => {
    const blend = new Blend();
    blend.keep(1, 0, 0);
    blend.keep(2, 0, 0);
    blend.prune();
    blend.keep(1, 5, 0);
    blend.prune();
    // 2 was not kept at the last step: it has no place before, and is drawn where it is said to be.
    expect(blend.x(2, 40, 0.5)).toBe(40);
    expect(blend.x(1, 15, 0.5)).toBe(10);
  });
});
