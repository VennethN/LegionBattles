import { describe, expect, it } from 'vitest';
import type { Tell } from '../src/game/hunt';
import { inside } from '../src/view/vfx/Tells';

// The marked ground is drawn brighter where the hunter stands in it. Whether they stand in it is worked out by the
// shape as the rules give it: these hold that working to the shapes.
const base: Tell = { id: 1, kind: 'ring', x: 0, y: 0, angle: 0, len: 0, w: 0, r: 100, half: 0, inner: 0, left: 1, of: 1, dmg: 1, foe: true, attack: 'x', by: 0 };

describe('a warning on the ground', () => {
  it('holds a ring to its rim, and leaves a safe middle out', () => {
    expect(inside(base, 99, 0)).toBe(true);
    expect(inside(base, 101, 0)).toBe(false);
    const band = { ...base, inner: 40 };
    expect(inside(band, 20, 0)).toBe(false);
    expect(inside(band, 60, 0)).toBe(true);
  });

  it('holds a cone to its width and reach', () => {
    const cone: Tell = { ...base, kind: 'cone', r: 200, half: 0.5, angle: Math.PI };
    expect(inside(cone, -150, 10)).toBe(true);
    expect(inside(cone, 150, 0)).toBe(false);
    expect(inside(cone, -150, 150)).toBe(false);
  });

  it('holds a lane to its length and width, from where it starts', () => {
    const lane: Tell = { ...base, kind: 'line', len: 300, w: 60, angle: 0 };
    expect(inside(lane, 150, 29)).toBe(true);
    expect(inside(lane, 150, 31)).toBe(false);
    expect(inside(lane, -5, 0)).toBe(false);
    expect(inside(lane, 305, 0)).toBe(false);
  });
});
