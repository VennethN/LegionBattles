import { describe, expect, it } from 'vitest';
import { MONSTERS } from '../src/game/content';
import { CHAINS, RANKS, TRINKETS, chainNext, dropChance, dropOf, rankOf, rankXpFor, toNextRank, weekOf, wornBy } from '../src/game/growth';

describe('ranks', () => {
  it('rise with experience, each a little more than the one before, and the third opens a second slot', () => {
    expect(rankOf(0)).toBe(0);
    expect(rankOf(RANKS[1].need)).toBe(1);
    expect(rankOf(99999)).toBe(RANKS.length - 1);
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].need).toBeGreaterThan(RANKS[i - 1].need);
      expect(RANKS[i].gain).toBeGreaterThan(RANKS[i - 1].gain);
      expect(RANKS[i].look.length).toBeGreaterThan(0);
    }
    expect(RANKS[2].slots).toBe(2);
    expect(toNextRank(RANKS.at(-1)!.need)).toBeNull();
    expect(toNextRank(30)?.left).toBe(RANKS[1].need - 30);
  });

  it('a won hunt gives more than a lost one, and a partner earns half', () => {
    expect(rankXpFor(true, 1, 3, 2)).toBeGreaterThan(rankXpFor(false, 0, 1, 2));
    expect(rankXpFor(true, 0, 3, 1, true)).toBe(Math.round(rankXpFor(true, 0, 3, 1) / 2));
    // A first rank comes in about two won hunts; the last in a few dozen.
    expect(Math.ceil(RANKS[1].need / rankXpFor(true, 0, 3, 1))).toBeLessThanOrEqual(2);
    expect(Math.ceil(RANKS.at(-1)!.need / rankXpFor(true, 1, 3, 3))).toBeGreaterThan(8);
  });
});

describe('trinkets', () => {
  it('each says what it does with a number, and one dropped is never one already held', () => {
    for (const t of TRINKETS) expect(t.says, t.id).toMatch(/\d/);
    const held = TRINKETS.slice(0, 5).map((t) => t.id);
    for (let i = 0; i < 20; i++) {
      const got = dropOf(held, i / 20);
      expect(got).not.toBeNull();
      expect(held).not.toContain(got);
    }
    expect(dropOf(TRINKETS.map((t) => t.id), 0.5)).toBeNull();
  });

  it('drop more for a harder contract, always for the week\'s, and are worn only in the slots a rank gives', () => {
    expect(dropChance(4, false)).toBeGreaterThan(dropChance(1, false));
    expect(dropChance(1, true)).toBe(1);
    expect(wornBy(['a', 'b'], 0)).toEqual(['a']);
    expect(wornBy(['a', 'b'], RANKS[2].need)).toEqual(['a', 'b']);
  });
});

describe('the week and the chains', () => {
  it('a week is the same for every moment in it and the next one after it', () => {
    const monday = Date.UTC(2026, 10, 23, 9);
    expect(weekOf(monday)).toBe(weekOf(monday + 5 * 24 * 3600 * 1000));
    expect(weekOf(monday + 7 * 24 * 3600 * 1000)).toBe(weekOf(monday) + 1);
  });

  it('every chain names bosses there are, opens after a boss there is, and posts its steps in order', () => {
    for (const c of CHAINS) {
      expect(MONSTERS.some((m) => m.id === c.opensAfter), c.id).toBe(true);
      for (const s of c.steps) expect(MONSTERS.some((m) => m.id === s.monster), `${c.id} ${s.monster}`).toBe(true);
      expect(chainNext(c, {}, {})).toBeNull();
      expect(chainNext(c, { [c.opensAfter]: 1 }, {})).toBe(0);
      expect(chainNext(c, { [c.opensAfter]: 1 }, { [c.id]: 1 })).toBe(c.steps.length > 1 ? 1 : null);
      expect(chainNext(c, { [c.opensAfter]: 1 }, { [c.id]: c.steps.length })).toBeNull();
    }
  });
});
