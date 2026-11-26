// What each hero's own weapon learns at levels 5, 10 and 15: thirty rules,
// three to a weapon, each held to doing what its line says, and to not
// doing it a tier before.

import { describe, expect, it } from 'vitest';
import { BAND, HEROES, MOVE, OWN, OWN_GROWS, OWN_RULES, QUIRKS, SIGNATURES, byId, ownRules, weaponOf } from '../src/game/data';
import { World, type Ev, type Setup } from '../src/game/world';
import { alone, blows, play, setup, shotAt, stand, stats } from './field';

/** A hero whose own weapon has learned this many of its rules. */
const at = (hero: string, tier: number, o: Partial<Setup> = {}): World => {
  const h = byId(HEROES, hero);
  return alone(new World(setup({ quirk: h.quirk, move: h.move, own: { id: h.weapon, tier }, ...o, stats: { ...(o.stats ?? stats({ maxHp: 9999 })), crit: -1000 } })));
};
const has = <T extends Ev['t']>(events: readonly Ev[], t: T): Extract<Ev, { t: T }>[] => events.filter((e): e is Extract<Ev, { t: T }> => e.t === t);
const struck = (events: readonly Ev[]): Set<number> => new Set(has(events, 'hit').filter((e) => !e.soft).map((e) => e.id));

describe('what a weapon of their own learns', () => {
  it('is three rules for each of the ten, one at each of three levels, each a line the camp can show', () => {
    expect(OWN_RULES.length).toBe(30);
    for (const w of SIGNATURES) {
      const rules = ownRules(w.id, 0);
      expect(rules.map((r) => r.level), w.id).toEqual([...OWN_GROWS]);
      for (const r of rules) {
        expect(r.says.length, w.id).toBeGreaterThan(20);
        expect(r.on).toBe(false);
      }
      expect(ownRules(w.id, 2).map((r) => r.on)).toEqual([true, true, false]);
    }
    expect(new Set(OWN_RULES.map((r) => r.says)).size).toBe(30);
  });

  // ---- Gatekeeper
  it('Gatekeeper, 5: a set shield throws shots back at who loosed them', () => {
    const thrown = (tier: number): [boolean, boolean] => {
      const w = at('bram', tier);
      w.slots[0].cool = 999;
      play(w, 0.6);
      shotAt(w, 70);
      const events = play(w, 0.3);
      return [has(events, 'block')[0].back, w.shots.some((s) => s.mine && s.vx > 0)];
    };
    expect(thrown(1)).toEqual([true, true]);
    expect(thrown(0)).toEqual([false, false]);
  });

  it('Gatekeeper, 10: the first sweep from behind a shield just set goes all the way round, and stuns', () => {
    const sweep = (tier: number): { behind: number; stunned: boolean } => {
      const w = at('bram', tier);
      w.slots[0].cool = 0.6;
      const front = stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 99999, dmg: 0 }, true);
      const behind = stand(w, 'bruiser', w.hero.x - 70, w.hero.y, { hp: 99999, dmg: 0 }, true);
      const first = play(w, 0.7);
      const stunned = behind.stun > 0;
      // They were thrown back by it: put them where they stood, and the second sweep is an ordinary one, at the nearer.
      front.x = w.hero.x + 60;
      behind.x = w.hero.x - 70;
      front.kx = 0;
      behind.kx = 0;
      const all = [...first, ...play(w, 1.2)];
      return { behind: blows(all, behind.id).length, stunned };
    };
    expect(sweep(2)).toEqual({ behind: 1, stunned: true });
    expect(sweep(1)).toEqual({ behind: 0, stunned: false });
  });

  it('Gatekeeper, 15: who strikes a set shield up close is thrown back and stunned', () => {
    const bashed = (tier: number): boolean => {
      const w = at('bram', tier);
      w.slots[0].cool = 999;
      const f = stand(w, 'bruiser', w.hero.x + 8, w.hero.y, { hp: 99999, dmg: 10 }, true);
      // His first blows land before the shield is up. One that lands on it throws him off.
      play(w, 1.2);
      return f.x > w.hero.x + 20;
    };
    expect(bashed(3)).toBe(true);
    expect(bashed(2)).toBe(false);
  });

  // ---- Whisper
  it('Whisper, 5: an arrow that finds someone unhurt pins them for a second', () => {
    const pinned = (tier: number): number => {
      const w = at('wren', tier);
      const f = stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 99999, maxHp: 99999 }, true);
      play(w, 0.36 + 0.5);
      return f.stun;
    };
    expect(pinned(1)).toBeGreaterThan(0);
    expect(pinned(1)).toBeLessThanOrEqual(OWN.whisper.pin);
    expect(pinned(0)).toBe(0);
  });

  it('Whisper, 10: at full Unseen her arrows go through everyone', () => {
    const through = (tier: number, safe: number): number => {
      const w = at('wren', tier);
      Object.assign(w, { quiet: safe > 0 ? QUIRKS.unseen.most : 0 });
      // Near enough that an arrow loosed from the hand at the first of them is still at their height when it reaches the last.
      // Close enough together that even a slim one at the end is still in the arrow's path.
      for (let i = 0; i < 5; i++) stand(w, 'bruiser', w.hero.x + 100 + i * 38, w.hero.y, { hp: 99999, dmg: 0 }, true);
      return struck(play(w, 0.9)).size;
    };
    expect(through(2, 100)).toBe(5);
    expect(through(2, 0)).toBe(2);
    expect(through(1, 100)).toBe(2);
  });

  it('Whisper, 15: a kill at full Unseen looses the next arrow at once', () => {
    const loosed = (tier: number): number => {
      const w = at('wren', tier);
      Object.assign(w, { quiet: QUIRKS.unseen.most });
      stand(w, 'cutpurse', w.hero.x + 150, w.hero.y, { hp: 1, maxHp: 9, dmg: 0 }, true);
      stand(w, 'bruiser', w.hero.x + 150, w.hero.y + 200, { hp: 99999, maxHp: 99999, dmg: 0 }, true);
      return has(play(w, 1), 'loose').length;
    };
    expect(loosed(3)).toBe(2);
    expect(loosed(2)).toBe(1);
  });

  // ---- The Unfinished Staff
  it('The Unfinished Staff, 5: every third bolt is cast twice', () => {
    const casts = (tier: number): number => {
      const w = at('orrin', tier);
      stand(w, 'bruiser', w.hero.x + 250, w.hero.y, { hp: 99999 }, true);
      return has(play(w, 0.36 + weaponOf('unfinished').every[1] * 2 + 0.2), 'loose').length;
    };
    expect(casts(1)).toBe(4);
    expect(casts(0)).toBe(3);
    expect(OWN.unfinished.every).toBe(3);
  });

  it('The Unfinished Staff, 10: a bolt that fells its mark flies on to another', () => {
    const next = (tier: number): number => {
      const w = at('orrin', tier);
      stand(w, 'cutpurse', w.hero.x + 200, w.hero.y, { hp: 1, dmg: 0 }, true);
      const other = stand(w, 'bruiser', w.hero.x + 200, w.hero.y + 150, { hp: 99999, dmg: 0 }, true);
      play(w, 1.2);
      return other.hp;
    };
    expect(next(2)).toBeLessThan(99999);
    expect(next(1)).toBe(99999);
  });

  it('The Unfinished Staff, 15: a bolt splits in two on the first it strikes', () => {
    const halves = (tier: number): number => {
      const w = at('orrin', tier);
      stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 99999, dmg: 0 }, true);
      let most = 0;
      for (let i = 0; i < 60; i++) {
        w.step({ x: 0, y: 0 });
        most = Math.max(most, w.shots.filter((s) => s.mine && s.split).length);
      }
      return most;
    };
    expect(halves(3)).toBe(3);
    expect(halves(2)).toBe(0);
  });

  // ---- Heads and Tails
  it('Heads and Tails, 5: a critical blow knocks a coin loose, though not more often than so', () => {
    const coins = (tier: number): number => {
      const w = alone(new World(setup({ quirk: 'double', own: { id: 'headstails', tier }, stats: stats({ maxHp: 9999, crit: 1000 }) })));
      stand(w, 'bruiser', w.hero.x + 50, w.hero.y, { hp: 9999999, dmg: 0 });
      play(w, 6.2);
      return w.coins + w.picks.filter((p) => p.kind === 'coin').length;
    };
    const learned = coins(1);
    expect(learned).toBeGreaterThanOrEqual(4);
    // One for each gap of time, and the few his blows knock loose in any case.
    expect(learned).toBeLessThanOrEqual(Math.ceil(6.2 / OWN.headstails.gap) + 3);
    expect(coins(0)).toBeLessThan(learned);
  });

  it('Heads and Tails, 10: a coin picked up makes his next blow critical', () => {
    const sure = (tier: number): number => {
      const w = at('fenn', tier);
      stand(w, 'bruiser', w.hero.x + 50, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      w.picks.push({ id: 1, kind: 'coin', x: w.hero.x + 20, y: w.hero.y, vx: 0, vy: 0, value: 1, pulled: false, age: 1 });
      return has(play(w, 1.2), 'hit').filter((e) => e.crit).length;
    };
    // And that blow knocks a coin loose, which makes the next one sure in its turn.
    expect(sure(2)).toBeGreaterThanOrEqual(1);
    expect(sure(1)).toBe(0);
  });

  it('Heads and Tails, 15: the knife strikes behind him as well as before', () => {
    const sides = (tier: number): number => {
      const w = at('fenn', tier);
      stand(w, 'bruiser', w.hero.x + 50, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      stand(w, 'bruiser', w.hero.x - 54, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      return struck(play(w, 0.5)).size;
    };
    expect(sides(3)).toBe(2);
    expect(sides(2)).toBe(1);
  });

  // ---- Hearthbrand
  it('Hearthbrand, 5: where its fire bursts the ground burns on', () => {
    const ground = (tier: number): number => {
      const w = at('nan', tier);
      stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 99999, dmg: 0 }, true);
      play(w, 1);
      return w.zones.filter((z) => z.kind === 'fire').length;
    };
    expect(ground(1)).toBe(1);
    expect(ground(0)).toBe(0);
  });

  it('Hearthbrand, 10: what dies burning near her bursts, and lights those round it', () => {
    const lit = (tier: number, dx: number): number => {
      const w = at('nan', tier);
      w.slots[0].cool = 999;
      stand(w, 'bruiser', w.hero.x + dx, w.hero.y, { hp: 1, burn: 3, burnBy: 6 }, true);
      const near = stand(w, 'bruiser', w.hero.x + dx + 30, w.hero.y, { hp: 9999 }, true);
      const events = play(w, 0.2);
      expect(has(events, 'burst').filter((e) => e.kind === 'fire').length).toBe(near.burn > 0 ? 1 : 0);
      return near.burn;
    };
    expect(lit(2, 150)).toBeGreaterThan(0);
    expect(lit(1, 150)).toBe(0);
    // Far from her it only dies.
    expect(lit(2, QUIRKS.banked.r + 200)).toBe(0);
  });

  it('Hearthbrand, 15: its bursts are half as wide again', () => {
    const wide = (tier: number): number => {
      const w = at('nan', tier);
      stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 99999, dmg: 0 }, true);
      return has(play(w, 1), 'burst').filter((e) => e.kind === 'fire')[0].r;
    };
    expect(wide(3)).toBeCloseTo(wide(2) * OWN.hearthbrand.wider);
  });

  // ---- The Ninth's Lance
  const ride = (tier: number): { ratio: number; stunned: boolean; reach: number } => {
    const w = at('isaura', tier);
    const f = stand(w, 'bruiser', w.hero.x + 420, w.hero.y + 30, { hp: 9999999, dmg: 0 }, true);
    let stunned = false;
    let reach = 0;
    const all: Ev[] = [];
    for (let i = 0; i < 60 * 2.7; i++) {
      w.step({ x: 1, y: 0 });
      for (const e of w.drain()) {
        all.push(e);
        if (e.t === 'strike' && e.great) {
          stunned = f.stun > 0;
          reach = e.range;
        }
      }
    }
    const b = blows(all, f.id);
    return { ratio: Math.max(...b) / Math.min(...b), stunned, reach };
  };

  it("The Ninth's Lance, 5: a couched thrust throws back all it meets, and stuns them", () => {
    expect(ride(1).stunned).toBe(true);
    expect(ride(0).stunned).toBe(false);
  });

  it("The Ninth's Lance, 10: a kill with the lance gives the thrust back at once", () => {
    const thrusts = (tier: number): number => {
      const w = at('isaura', tier);
      stand(w, 'cutpurse', w.hero.x + 100, w.hero.y, { hp: 1, dmg: 0 }, true);
      stand(w, 'bruiser', w.hero.x + 140, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      return has(play(w, 1), 'strike').length;
    };
    expect(thrusts(2)).toBe(2);
    expect(thrusts(1)).toBe(1);
  });

  it("The Ninth's Lance, 15: a couched thrust lands harder still, and reaches half as far again", () => {
    const last = ride(3);
    const before = ride(2);
    expect(before.ratio).toBeGreaterThan(QUIRKS.tilt.times * 0.95);
    expect(before.ratio).toBeLessThan(QUIRKS.tilt.times * 1.05);
    expect(last.ratio).toBeGreaterThan(OWN.ninth.times * 0.95);
    expect(last.reach).toBeCloseTo(before.reach * OWN.ninth.reach);
  });

  // ---- Gravecleaver
  const debtor = (tier: number, o: Partial<Setup> = {}): World => {
    const w = at('hroth', tier, { stats: stats({ maxHp: 100 }), ...o });
    w.hero.hp = 20;
    return w;
  };

  it('Gravecleaver, 5: in debt his axe goes all the way round him', () => {
    const round = (tier: number, hp: number): number => {
      const w = debtor(tier);
      w.hero.hp = hp;
      stand(w, 'bruiser', w.hero.x + 70, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      stand(w, 'bruiser', w.hero.x - 74, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      return struck(play(w, 0.5)).size;
    };
    expect(round(1, 20)).toBe(2);
    expect(round(1, 90)).toBe(1);
    expect(round(0, 20)).toBe(1);
  });

  it('Gravecleaver, 10: what his axe fells in debt bursts where it drops', () => {
    const burst = (tier: number): number => {
      const w = debtor(tier);
      stand(w, 'cutpurse', w.hero.x + 90, w.hero.y, { hp: 1, dmg: 0 }, true);
      // Out of the axe's reach, and within the burst of the one that falls.
      const beyond = stand(w, 'bruiser', w.hero.x + 150, w.hero.y, { hp: 9999, dmg: 0 }, true);
      play(w, 0.5);
      return beyond.hp;
    };
    expect(burst(2)).toBeLessThan(9999);
    expect(burst(1)).toBe(9999);
  });

  it('Gravecleaver, 15: he gets up from a killing blow with the grave open', () => {
    const risen = (tier: number): number => {
      const w = at('hroth', tier, { stats: stats({ maxHp: 30 }) });
      w.slots[0].cool = 999;
      stand(w, 'bruiser', w.hero.x + 8, w.hero.y, { hp: 99999, dmg: 500 }, true);
      expect(has(play(w, 0.1), 'rise').length).toBe(1);
      return w.hero.open;
    };
    expect(risen(3)).toBeGreaterThan(4.5);
    expect(risen(2)).toBe(0);
  });

  // ---- The Passing Bell
  it("The Passing Bell, 5: each ring takes seconds off a fallen companion's rest", () => {
    const rest = (tier: number): number => {
      const w = at('aldous', tier, { band: [{ id: 'mossback', bond: 0 }] });
      stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      w.band[0].hp = 0;
      w.band[0].down = 10;
      play(w, 0.5);
      return w.band[0].down;
    };
    expect(rest(0) - rest(1)).toBeCloseTo(OWN.passingbell.wakes, 1);
  });

  it('The Passing Bell, 10: companions in his fold take half the harm', () => {
    const taken = (tier: number, dx: number): number => {
      const w = at('aldous', tier, { band: [{ id: 'mossback', bond: 0 }] });
      w.slots[0].cool = 999;
      const turtle = w.band[0];
      turtle.x = w.hero.x + dx;
      turtle.y = w.hero.y;
      stand(w, 'bruiser', turtle.x, turtle.y, { hp: 9999999, dmg: 20 }, true);
      return has(play(w, 0.1), 'allyHurt')[0].amount;
    };
    const whole = Math.round(20 * BAND.takes);
    expect(taken(1, 100)).toBe(whole);
    expect(taken(2, 100)).toBe(Math.round(20 * BAND.takes * OWN.passingbell.lets));
    // Strayed from the fold, it takes it all.
    expect(taken(2, QUIRKS.shepherd.r + 150)).toBe(whole);
  });

  it('The Passing Bell, 15: at each ring every companion in his fold strikes at once', () => {
    const strikes = (tier: number): number => {
      const w = at('aldous', tier, { band: [{ id: 'greta', bond: 0 }] });
      const bear = w.band[0];
      stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      bear.x = w.hero.x + 30;
      bear.y = w.hero.y;
      bear.cool = 5;
      return has(play(w, 1), 'allyStrike').length;
    };
    expect(strikes(3)).toBeGreaterThanOrEqual(1);
    expect(strikes(2)).toBe(0);
  });

  // ---- Widow's Tear
  it("Widow's Tear, 5: its bolt goes through everyone in its line", () => {
    const through = (tier: number): number => {
      const w = at('ysolde', tier);
      for (let i = 0; i < 5; i++) stand(w, 'bruiser', w.hero.x + 100 + i * 38, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      return struck(play(w, 1.2)).size;
    };
    expect(through(1)).toBe(5);
    expect(through(0)).toBe(3);
  });

  it("Widow's Tear, 10: what breaks leaves ice on the ground that slows who crosses it", () => {
    const iced = (tier: number): [number, number] => {
      const w = at('ysolde', tier);
      w.slots[0].cool = 999;
      stand(w, 'bruiser', w.hero.x + 300, w.hero.y, { hp: 1, frozen: 1, burn: 1, burnBy: 4 }, true);
      play(w, 0.2);
      // One who comes on to it after: it was not there when the shards flew.
      const late = stand(w, 'cutpurse', w.hero.x + 310, w.hero.y, { hp: 9999, dmg: 0 }, true);
      play(w, 0.1);
      return [w.zones.filter((z) => z.kind === 'ice').length, late.slow];
    };
    const [ice, slow] = iced(2);
    expect(ice).toBe(1);
    expect(slow).toBeGreaterThan(0);
    expect(iced(1)).toEqual([0, 0]);
  });

  it("Widow's Tear, 15: a captain freezes as long as anyone", () => {
    const frozen = (tier: number): number => {
      const w = at('ysolde', tier);
      const f = stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 9999999, dmg: 0, boss: true, slow: 2, slowBy: 0.4 }, true);
      return has(play(w, 1), 'freeze').filter((e) => e.id === f.id)[0].seconds;
    };
    expect(frozen(3)).toBeCloseTo(QUIRKS.deepcold.freeze);
    expect(frozen(2)).toBeCloseTo(QUIRKS.deepcold.freeze * MOVE.bossShare);
  });

  // ---- Morningstar
  it('Morningstar, 5: her holy ground lasts twice as long', () => {
    const life = (tier: number): number => {
      const w = at('maren', tier);
      stand(w, 'bruiser', w.hero.x + 50, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      play(w, 0.5);
      return w.zones.filter((z) => z.kind === 'holy')[0].life;
    };
    expect(life(1)).toBeGreaterThan(QUIRKS.consecrate.seconds * OWN.morningstar.longer - 0.3);
    expect(life(0)).toBeLessThan(QUIRKS.consecrate.seconds);
  });

  it('Morningstar, 10: on holy ground her hammer strikes a third faster', () => {
    const every = (tier: number, hallowed: boolean): number => {
      const w = at('maren', tier);
      if (hallowed) w.zones.push({ id: 1, x: w.hero.x, y: w.hero.y, r: 80, by: 1, life: 9, tick: 9, kind: 'holy', mend: 9 });
      return w.everyOf(w.slots[0]);
    };
    expect(every(2, true)).toBeCloseTo(every(2, false) / OWN.morningstar.faster);
    expect(every(1, true)).toBeCloseTo(every(1, false));
  });

  it('Morningstar, 15: what dies on holy ground gives her health back', () => {
    const mended = (tier: number, hallowed: boolean): number => {
      const w = at('maren', tier, { stats: stats({ maxHp: 30 }) });
      w.slots[0].cool = 999;
      w.hero.hp = 10;
      // Holy ground off where she is not: it does not mend her itself.
      if (hallowed) w.zones.push({ id: 1, x: w.hero.x + 300, y: w.hero.y, r: 80, by: 0, life: 9, tick: 9, kind: 'holy', mend: 9 });
      stand(w, 'cutpurse', w.hero.x + 300, w.hero.y, { hp: 1, burn: 1, burnBy: 4 }, true);
      play(w, 0.3);
      return w.hero.hp;
    };
    expect(mended(3, true)).toBe(11);
    expect(mended(3, false)).toBe(10);
    expect(mended(2, true)).toBe(10);
  });
});
