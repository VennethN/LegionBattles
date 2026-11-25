import { describe, expect, it } from 'vitest';
import { HUNTERS, MONSTERS, byId } from '../src/game/content';
import { Hunt } from '../src/game/hunt';
import { OPENING, type SaveData, board, buy, freshSave, growthOf, payFor, posterOf, setWeek, setupOf, wares, wearTrinket } from '../src/game/lodge';
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

describe('growth in the lodge and the hunt', () => {
  const tally = { time: 100, dealt: {}, taken: {}, killedBy: null, breaks: 0, taught: false, tasks: {}, downs: 0 };
  /** A lodge past its opening, with the Gravedigger felled once: the board is posted. */
  const posted = (): SaveData => {
    const s = freshSave();
    s.opening = OPENING.length;
    s.trophies = ['spade'];
    s.felled = { sexton: 1 };
    return s;
  };

  it('a hunt gives the hunter who led it experience, and a rank gives more health and damage in the hunt', () => {
    const s = posted();
    const p = board(s)[0];
    const pay = payFor(s, p.monster, p.mark, true, tally, 2, p);
    expect(pay.ranks[0]).toMatchObject({ hunter: 'marta' });
    expect(s.xp?.marta).toBeGreaterThan(0);
    s.xp = { marta: RANKS[2].need };
    expect(growthOf(s, 'marta')).toMatchObject({ rank: 2, slots: 2 });
    const plain = new Hunt(setupOf(freshSave(), 'king', 1, 1, false));
    const grown = new Hunt(setupOf(s, 'king', 1, 1, false));
    expect(grown.hunter.maxHp).toBe(Math.round(plain.hunter.maxHp * (1 + RANKS[2].gain)));
  });

  it('a trinket is bought, worn in a slot its rank gives, and reaches the hunt', () => {
    const s = posted();
    s.coin = 1000;
    expect(wares(s).some((w) => w.id === 'trinket:bread')).toBe(true);
    expect(wares(s).some((w) => TRINKETS.find((t) => t.rare && w.id === `trinket:${t.id}`))).toBe(false);
    expect(buy(s, 'trinket:bread')).toBe('');
    expect(buy(s, 'trinket:boots')).toBe('');
    expect(wearTrinket(s, 'marta', 'bread')).toBe('');
    // One slot at the first rank: a second trinket takes the first one's place.
    expect(wearTrinket(s, 'marta', 'boots')).toBe('');
    expect(growthOf(s, 'marta').worn).toEqual(['boots']);
    expect(wearTrinket(s, 'marta', 'bread')).toBe('');
    const h = new Hunt(setupOf(s, 'king', 1, 1, false));
    expect(h.hunter.trinkets).toEqual(['bread']);
    expect(h.hunter.maxHp).toBe(byId(HUNTERS, 'marta').hp + 12);
    expect(wearTrinket(s, 'marta', 'nail')).toBe('Not held');
  });

  it('the week\'s contract is posted once a week, pays three times and always drops a trinket', () => {
    const s = posted();
    setWeek(s, 40);
    const w = board(s).find((p) => p.weekly);
    expect(w).toBeDefined();
    if (!w) return;
    expect(w.variants).toHaveLength(2);
    expect(posterOf(s, w).banner).toBe('THE WEEK\'S CONTRACT');
    const pay = payFor(s, w.monster, w.mark, true, tally, 2, w);
    expect(pay.weekly).toBe(true);
    expect(pay.trinket).not.toBeNull();
    expect(board(s).some((p) => p.weekly)).toBe(false);
    // The next week, a new one.
    setWeek(s, 41);
    expect(board(s).some((p) => p.weekly)).toBe(true);
  });

  it('a chain posts its steps one after another, each telling the next part, and pays a prize at its end', () => {
    const s = posted();
    s.felled = { sexton: 2, king: 2, spinner: 2, abbot: 2, furnace: 1 };
    const chainOf = (): ReturnType<typeof board>[number] | undefined => board(s).find((p) => p.chain?.id === 'parish');
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      const p = chainOf();
      expect(p, `step ${i}`).toBeDefined();
      if (!p) return;
      expect(p.chain?.step).toBe(i);
      seen.push(p.why);
      const pay = payFor(s, p.monster, p.mark, true, tally, 2, p);
      if (i === 2) expect(pay.prize).toBe(260);
    }
    expect(new Set(seen).size).toBe(3);
    expect(chainOf()).toBeUndefined();
  });
});
