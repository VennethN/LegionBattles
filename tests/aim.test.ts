// How a blow, a dodge and a throw find their way when the player does not
// point them: the rules a tap on a touch screen leans on.

import { describe, expect, it } from 'vitest';
import { Hunt } from '../src/game/hunt';
import { awake, hold, of, play, setup } from './lair';

describe('aiming', () => {
  it('a blow left to find its mark goes at the boss in reach, whichever way the hunter faces', () => {
    const h = awake();
    hold(h, 'recover');
    const m = h.monster;
    // The hunter beside the boss, looking away from it.
    h.hunter.x = m.x - m.def.r - 40;
    h.hunter.y = m.y;
    h.hunter.aim = Math.PI;
    const evs = play(h, 0.1, { x: 0, y: 0, attack: true, auto: true });
    const blow = of(evs, 'blow')[0];
    expect(blow).toBeDefined();
    expect(Math.abs(blow.angle)).toBeLessThan(0.2);
  });

  it('with the boss out of reach, it goes at the nearest helper in reach, and else straight ahead', () => {
    const h = awake();
    hold(h, 'recover');
    const m = h.monster;
    h.hunter.x = m.x - 600;
    h.hunter.y = m.y;
    h.hunter.aim = 0;
    const reach = h.hunter.def.combo[0].reach;
    // Nothing near: ahead.
    expect(h.autoAim(h.hunter, reach)).toBeCloseTo(0);
    // A helper just behind and below: at it.
    h.helpers.push({ ...(h.helpers[0] ?? {}), id: 999, x: h.hunter.x - 20, y: h.hunter.y + reach * 0.5 } as (typeof h.helpers)[number]);
    const a = h.autoAim(h.hunter, reach);
    expect(a).toBeCloseTo(Math.atan2(reach * 0.5, -20));
  });

  it('a dodge with no way to go goes the way pointed, and away from the boss when nothing is pointed', () => {
    const h = awake();
    hold(h, 'recover');
    const m = h.monster;
    h.hunter.x = m.x - 300;
    h.hunter.y = m.y;
    play(h, 0.05, { x: 0, y: 0, dodge: true, toward: Math.PI / 2 });
    expect(h.hunter.rx).toBeCloseTo(0);
    expect(h.hunter.ry).toBeCloseTo(1);
    const g = awake();
    hold(g, 'recover');
    g.hunter.x = g.monster.x - 300;
    g.hunter.y = g.monster.y;
    play(g, 0.05, { x: 0, y: 0, dodge: true });
    expect(g.hunter.rx).toBeLessThan(-0.9);
  });

  it('a thrown skill lands where it was aimed, no further than its reach', () => {
    const h = new Hunt(setup({ hunter: 'jory' }));
    h.step({ x: 0, y: 0, wake: true });
    h.drain();
    hold(h, 'recover');
    const { x, y } = h.hunter;
    // Tar is Jory's second skill: thrown at a point below him, then at one far past its reach.
    play(h, 0.05, { x: 0, y: 0, b: true, at: { x, y: y + 150 } });
    expect(h.pools[0].x).toBeCloseTo(x);
    expect(h.pools[0].y).toBeCloseTo(y + 150);
    const g = new Hunt(setup({ hunter: 'jory' }));
    g.step({ x: 0, y: 0, wake: true });
    g.drain();
    hold(g, 'recover');
    play(g, 0.05, { x: 0, y: 0, b: true, at: { x: g.hunter.x + 5000, y: g.hunter.y } });
    expect(g.pools[0].x - g.hunter.x).toBeLessThanOrEqual(401);
  });
});
