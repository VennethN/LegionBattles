// Calling a skill: the player's part in a battle. A unit's skill may be
// called for a short while before it would go off by itself, and a called
// skill is used at once and does more. The calls are part of a battle's
// input, so a battle is still a function of what goes into it.

import { describe, expect, it } from 'vitest';
import { Battle, callEverything, runBattle } from '../src/sim/battle';
import { CALL_BONUS, CALL_WINDOW, DT, TICKS_PER_SECOND } from '../src/sim/constants';
import type { BattleInput, Call, UnitDef } from '../src/sim/types';
import { FROZEN_BATTLES } from './fixtures/frozen';
import { dummy, of } from './helpers';

/**
 * What each of the frozen battles came to before skills could be called,
 * taken from the simulation as it then was (24 November 2026). With no calls
 * a battle must still come to exactly this: the same steps, the same events,
 * the same places and health at every step.
 */
const BEFORE: Record<string, { fingerprint: number; ticks: number; winner: number; events: number }> = {
  starters: { fingerprint: 323861584, ticks: 309, winner: 0, events: 375 },
  skills: { fingerprint: 1719610745, ticks: 500, winner: 1, events: 1014 },
  structures: { fingerprint: 1094503353, ticks: 1049, winner: 1, events: 1127 },
  strong: { fingerprint: 3881108344, ticks: 449, winner: 1, events: 635 },
  bigField: { fingerprint: 2779482580, ticks: 667, winner: 1, events: 1403 },
};

/**
 * A striker whose skill is ready 4 seconds in, standing next to something that will not fall. It reaches a
 * little past the next tile: a skill asks for its target a shade nearer than a blow does.
 */
function duel(skill: Partial<NonNullable<UnitDef['skill']>> = {}, more: Partial<UnitDef> = {}): BattleInput {
  const defs = {
    hero: dummy({
      id: 'hero', damage: 100, attackInterval: 1, windup: 0.3, range: 1.2,
      skill: { id: 'blow', name: 'Blow', kind: 'strike', cooldown: 10, first: 4, power: 2, text: '', ...skill },
      ...more,
    }),
    post: dummy({ id: 'post', hp: 100000, damage: 1, attackInterval: 5 }),
  };
  return { seed: 3, defs, teams: [[{ unit: 'hero', col: 3, row: 1 }], [{ unit: 'post', col: 4, row: 1 }]], seconds: 16 };
}

const READY = 4 * TICKS_PER_SECOND;
const OPENS = READY - CALL_WINDOW * TICKS_PER_SECOND;

describe('a battle nobody calls a skill in', () => {
  it('is exactly the battle it was before skills could be called', () => {
    expect(Object.keys(FROZEN_BATTLES).sort()).toEqual(Object.keys(BEFORE).sort());
    for (const [name, input] of Object.entries(FROZEN_BATTLES)) {
      const r = runBattle(input);
      expect({ fingerprint: r.fingerprint, ticks: r.ticks, winner: r.winner, events: r.events.length }, name).toEqual(BEFORE[name]);
      expect(of(r.events, 'call'), name).toHaveLength(0);
      expect(r.calls, name).toHaveLength(0);
    }
  });

  it('is the same with an empty list of calls as with none', () => {
    for (const [name, input] of Object.entries(FROZEN_BATTLES)) {
      expect(runBattle({ ...input, calls: [] }).fingerprint, name).toBe(BEFORE[name].fingerprint);
    }
  });

  it('uses the skill by itself when it is ready, at its usual strength', () => {
    const r = runBattle(duel());
    const used = of(r.events, 'skill');
    expect(used[0].t).toBeCloseTo(READY * DT, 5);
    const hit = r.events.find((e) => e.type === 'damage' && e.kind === 'blow');
    expect(hit?.amount).toBe(200);
  });
});

describe('calling a skill', () => {
  it('can be done only in the window before the skill is ready, by a unit with something in reach', () => {
    const b = new Battle(duel());
    const open: number[] = [];
    while (!b.ended && b.tick < READY - 1) {
      if (b.callable(0)) open.push(b.tick);
      b.step();
    }
    // The wait is counted down on the unit's own turn, so it is within the window from the step after it comes to it.
    expect(open[0]).toBe(OPENS);
    expect(open[open.length - 1]).toBe(READY - 2);
    expect(open).toHaveLength(READY - 1 - OPENS);
  });

  it('uses the skill on the step of the call, for more', () => {
    const tick = OPENS + 5;
    const r = runBattle({ ...duel(), calls: [{ tick, unit: 0 }] });
    const called = of(r.events, 'call');
    expect(called).toHaveLength(1);
    expect(called[0].t).toBeCloseTo(tick * DT, 5);
    expect(called[0].unit).toBe(0);
    // The skill itself is begun on that same step, and it is the first use of it.
    const used = of(r.events, 'skill');
    expect(used[0].t).toBeCloseTo(tick * DT, 5);
    const hit = r.events.find((e) => e.type === 'damage' && e.kind === 'blow');
    expect(hit?.amount).toBe(200 * CALL_BONUS);
    expect(hit && hit.t).toBeLessThan(READY * DT);
  });

  it('drops the blow the unit was in the middle of, and the next use is a whole wait after the call', () => {
    const tick = OPENS + 5;
    const r = runBattle({ ...duel(), calls: [{ tick, unit: 0 }] });
    const used = of(r.events, 'skill').map((e) => Math.round(e.t / DT));
    expect(used[0]).toBe(tick);
    // Called at 10 seconds' wait: the second use comes by itself 10 seconds on, at its usual strength.
    expect(used[1]).toBe(tick + 10 * TICKS_PER_SECOND);
    const hits = r.events.filter((e) => e.type === 'damage' && e.kind === 'blow').map((e) => e.amount);
    expect(hits).toEqual([250, 200]);
  });

  it('does nothing outside the window', () => {
    const plain = runBattle(duel());
    // Too early; an enemy's unit; a unit that is not there; and a step that is long past by the time it is given.
    const calls: Call[] = [{ tick: 1, unit: 0 }, { tick: OPENS - 3, unit: 0 }, { tick: OPENS + 5, unit: 1 }, { tick: OPENS + 6, unit: 7 }, { tick: -4, unit: 0 }];
    const r = runBattle({ ...duel(), calls });
    expect(r.fingerprint).toBe(plain.fingerprint);
    expect(r.events).toEqual(plain.events);
    expect(of(r.events, 'call')).toHaveLength(0);
  });

  it('does nothing for a unit with no one in reach', () => {
    const far = duel();
    const input: BattleInput = { ...far, teams: [[{ unit: 'hero', col: 0, row: 0 }], [{ unit: 'post', col: 7, row: 3 }]] };
    const b = new Battle(input);
    // The two are a long walk apart when the window opens: there is no one to use it on.
    while (b.tick < OPENS + 2) b.step();
    expect(b.units[0].skillWait).toBeLessThanOrEqual(CALL_WINDOW * TICKS_PER_SECOND);
    expect(b.callable(0)).toBe(false);
    expect(b.call(0)).toBe(false);
    expect(b.calls).toHaveLength(0);
  });

  it('does nothing for a stunned unit, an enemy, a building or a trap', () => {
    const defs = {
      hero: dummy({ id: 'hero', range: 1.2, skill: { id: 'blow', name: 'Blow', kind: 'strike', cooldown: 10, first: 1, power: 2, text: '' } }),
      tower: dummy({ id: 'tower', still: true, range: 6, projectile: { kind: 'arrow', speed: 600 } }),
      stunner: dummy({ id: 'stunner', hp: 100000, damage: 1, attackInterval: 0.5, windup: 0.1, onHit: { id: 'stun', duration: 5 } }),
    };
    const b = new Battle({ seed: 1, defs, teams: [[{ unit: 'hero', col: 3, row: 1 }, { unit: 'tower', col: 0, row: 1 }], [{ unit: 'stunner', col: 4, row: 1 }]] });
    for (let i = 0; i < 12; i++) b.step();
    // The hero is stunned by now, the stunner is the enemy's, the tower has no skill to call.
    expect(b.units[0].stTicks.some((t) => t > 0)).toBe(true);
    expect(b.callable(0)).toBe(false);
    expect(b.callable(1)).toBe(false);
    expect(b.callable(2)).toBe(false);
  });

  it('makes a called skill mend more, and what it leaves last longer', () => {
    const defs = {
      priest: dummy({
        id: 'priest', damage: 10, heal: { amount: 100, range: 3 }, range: 3, projectile: { kind: 'orb-holy', speed: 480 },
        skill: { id: 'hymn', name: 'Hymn', kind: 'mend', cooldown: 20, first: 3, power: 1, area: 3, windup: 0.2, status: { id: 'shield', duration: 4 }, text: '' },
      }),
      wall: dummy({ id: 'wall', hp: 5000, damage: 0, attackInterval: 9 }),
      foe: dummy({ id: 'foe', hp: 100000, damage: 300, attackInterval: 0.5, windup: 0.1 }),
    };
    const input: BattleInput = { seed: 5, defs, teams: [[{ unit: 'priest', col: 1, row: 1 }, { unit: 'wall', col: 3, row: 1 }], [{ unit: 'foe', col: 4, row: 1 }]], seconds: 8 };
    const plain = runBattle(input);
    const mend = (events: typeof plain.events): { amount: number; shield: number } => {
      const at = events.findIndex((e) => e.type === 'impact' && e.kind === 'hymn');
      const heal = events.slice(at).find((e) => e.type === 'heal' && e.unit === 0);
      const shield = events.slice(at).find((e) => e.type === 'status' && e.kind === 'shield');
      return { amount: heal?.amount ?? 0, shield: shield?.amount ?? 0 };
    };
    expect(mend(plain.events)).toEqual({ amount: 100, shield: 4 });
    const tick = 3 * TICKS_PER_SECOND - 10;
    const called = runBattle({ ...input, calls: [{ tick, unit: 0 }] });
    expect(of(called.events, 'call')).toHaveLength(1);
    expect(mend(called.events)).toEqual({ amount: 100 * CALL_BONUS, shield: 4 * CALL_BONUS });
  });

  it('is the same battle whenever the same calls are given', () => {
    for (const [name, input] of Object.entries(FROZEN_BATTLES)) {
      // A player who calls everything: the calls that came of it, given back as input, are that battle again.
      const live = runBattle(input, true, callEverything);
      expect(of(live.events, 'call').length, name).toBeGreaterThan(0);
      expect(live.fingerprint, name).not.toBe(BEFORE[name].fingerprint);
      const again = runBattle({ ...input, calls: live.calls });
      expect(again.fingerprint, name).toBe(live.fingerprint);
      expect(again.events, name).toEqual(live.events);
      expect(again.hp, name).toEqual(live.hp);
      const third = runBattle({ ...input, calls: live.calls });
      expect(third.events, name).toEqual(again.events);
    }
  });

  it('is the same whether a call is made while the battle is stepped or given with the input', () => {
    const input = FROZEN_BATTLES.starters;
    const b = new Battle(input);
    const seen: string[] = [];
    while (!b.ended) {
      // A press on the bowman, whenever it can be called, as the board would make it between two steps.
      // Units are numbered turn about, so the player's second is number 2.
      if (b.tick % 7 === 0) b.call(2);
      b.step();
      for (let i = 0; i < b.eventCount; i++) seen.push(`${b.events[i].t.toFixed(2)} ${b.events[i].type} ${b.events[i].unit} ${b.events[i].target} ${b.events[i].amount}`);
    }
    expect(b.calls.length).toBeGreaterThan(0);
    const replay = runBattle({ ...input, calls: b.calls });
    expect(replay.events.map((e) => `${e.t.toFixed(2)} ${e.type} ${e.unit} ${e.target} ${e.amount}`)).toEqual(seen);
    expect(replay.hp).toEqual(b.units.map((u) => u.hp));
  });

  it('takes two presses in the same moment as one call', () => {
    const b = new Battle(duel());
    while (!b.callable(0) && !b.ended) b.step();
    expect(b.call(0)).toBe(true);
    expect(b.call(0)).toBe(true);
    expect(b.calls).toHaveLength(1);
    b.step();
    expect(b.units[0].action).toBe(2);
    // In the middle of the skill it cannot be called again.
    expect(b.callable(0)).toBe(false);
  });

  it('leaves the enemy as it was: only the player\'s units can be called', () => {
    for (const [name, input] of Object.entries(FROZEN_BATTLES)) {
      const b = new Battle(input);
      while (!b.ended) {
        for (let i = 0; i < b.units.length; i++) if (b.units[i].team === 1) expect(b.callable(i), name).toBe(false);
        b.step();
      }
    }
  });

  it('says how near a skill is to going off by itself', () => {
    const b = new Battle(duel());
    expect(b.callProgress(0)).toBe(0);
    while (b.tick < OPENS + CALL_WINDOW * TICKS_PER_SECOND * 0.5) b.step();
    expect(b.callProgress(0)).toBeCloseTo(0.5, 1);
    while (b.tick < READY - 1) b.step();
    expect(b.callProgress(0)).toBeGreaterThan(0.95);
  });
});
