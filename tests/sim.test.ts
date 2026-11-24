import { describe, expect, it } from 'vitest';
import { UNITS, SKIRMISH_ROSTER } from '../src/data/units';
import { Battle, runBattle } from '../src/sim/battle';
import { DT, MAX_SECONDS, TILE } from '../src/sim/constants';
import { Rng } from '../src/sim/rng';
import { defaultFormation, randomEnemyTeam } from '../src/sim/setup';
import type { BattleInput, Placement } from '../src/sim/types';
import { battle, dummy, of } from './helpers';

function skirmish(seed: number): BattleInput {
  return {
    seed,
    defs: UNITS,
    teams: [
      defaultFormation(SKIRMISH_ROSTER, (u) => UNITS[u].range <= 1.5),
      randomEnemyTeam(seed, SKIRMISH_ROSTER),
    ],
  };
}

describe('determinism', () => {
  it('gives the same battle for the same seed and placements', () => {
    for (const seed of [1, 2, 123, 99999]) {
      const a = runBattle(skirmish(seed));
      const b = runBattle(skirmish(seed));
      expect(b.fingerprint).toBe(a.fingerprint);
      expect(b.events).toEqual(a.events);
      expect(b.hp).toEqual(a.hp);
      expect(b.winner).toBe(a.winner);
    }
  });

  it('gives another battle for another seed', () => {
    const prints = new Set([1, 2, 3, 4, 5, 6].map((s) => runBattle(skirmish(s)).fingerprint));
    expect(prints.size).toBeGreaterThan(1);
  });

  it('gives another battle when a unit is placed elsewhere', () => {
    const base = skirmish(5);
    const moved: BattleInput = {
      ...base,
      teams: [base.teams[0].map((p, i) => (i === 0 ? { ...p, row: p.row === 0 ? 3 : 0 } : p)), base.teams[1]],
    };
    expect(runBattle(moved).fingerprint).not.toBe(runBattle(base).fingerprint);
  });

  it('stepping one at a time is the same as running it whole', () => {
    const whole = runBattle(skirmish(42));
    const b = new Battle(skirmish(42));
    let n = 0;
    while (!b.ended) {
      b.step();
      n += b.eventCount;
    }
    expect(n).toBe(whole.events.length);
    expect(b.units.map((u) => u.hp)).toEqual(whole.hp);
  });

  it('draws the same enemy team from the same seed', () => {
    expect(randomEnemyTeam(123, SKIRMISH_ROSTER)).toEqual(randomEnemyTeam(123, SKIRMISH_ROSTER));
    const tiles = randomEnemyTeam(123, SKIRMISH_ROSTER).map((p) => `${p.col},${p.row}`);
    expect(new Set(tiles).size).toBe(4);
    for (const p of randomEnemyTeam(77, SKIRMISH_ROSTER)) {
      expect(p.col).toBeGreaterThanOrEqual(4);
      expect(p.col).toBeLessThan(8);
      expect(SKIRMISH_ROSTER).toContain(p.unit);
    }
  });
});

describe('every battle ends', () => {
  it('ends with a winner or a draw, in time, whatever is placed where', () => {
    const rng = new Rng(2024);
    const ids = Object.keys(UNITS);
    for (let n = 0; n < 150; n++) {
      const team = (cols: [number, number]): Placement[] => {
        const used = new Set<string>();
        const out: Placement[] = [];
        const size = 1 + rng.int(8);
        while (out.length < size) {
          const col = cols[0] + rng.int(cols[1] - cols[0]);
          const row = rng.int(4);
          if (used.has(`${col},${row}`)) continue;
          used.add(`${col},${row}`);
          out.push({ unit: rng.pick(ids), col, row });
        }
        return out;
      };
      const r = runBattle({ seed: n, defs: UNITS, teams: [team([0, 4]), team([4, 8])] }, false);
      expect([-1, 0, 1]).toContain(r.winner);
      expect(r.seconds).toBeLessThanOrEqual(MAX_SECONDS + DT);
      expect(r.ticks).toBeGreaterThan(0);
    }
  });

  it('ends even when nobody can hurt anybody', () => {
    const wall = dummy({ id: 'wall', damage: 1, armor: 999, hp: 100000 });
    const r = battle({ wall }, [{ unit: 'wall', col: 3, row: 1 }], [{ unit: 'wall', col: 4, row: 1 }]);
    expect(r.seconds).toBeCloseTo(MAX_SECONDS, 5);
    expect(of(r.events, 'battleEnd')).toHaveLength(1);
  });

  it('says who won, once, as the last thing', () => {
    const r = runBattle(skirmish(9));
    const ends = of(r.events, 'battleEnd');
    expect(ends).toHaveLength(1);
    expect(r.events[r.events.length - 1].type).toBe('battleEnd');
    expect(ends[0].amount).toBe(r.winner);
  });
});

describe('armor', () => {
  it('comes off every hit', () => {
    const hitter = dummy({ id: 'hitter', damage: 45 });
    const plated = dummy({ id: 'plated', armor: 15, damage: 1 });
    const r = battle({ hitter, plated }, [{ unit: 'hitter', col: 3, row: 1 }], [{ unit: 'plated', col: 4, row: 1 }]);
    const hits = of(r.events, 'damage').filter((e) => e.unit === 0);
    expect(hits.length).toBeGreaterThan(3);
    for (const e of hits.slice(0, -1)) expect(e.amount).toBe(30);
  });

  it('never brings a hit below 1', () => {
    const weak = dummy({ id: 'weak', damage: 5 });
    const plated = dummy({ id: 'plated', armor: 15, damage: 400 });
    const r = battle({ weak, plated }, [{ unit: 'weak', col: 3, row: 1 }], [{ unit: 'plated', col: 4, row: 1 }]);
    const hits = of(r.events, 'damage').filter((e) => e.unit === 0);
    expect(hits.length).toBeGreaterThan(0);
    for (const e of hits) expect(e.amount).toBe(1);
  });

  it("the Knight's armor is 15 and the others' is none", () => {
    expect(UNITS.knight.armor).toBe(15);
    expect(UNITS.archer.armor).toBe(0);
  });
});

describe('splash', () => {
  const caster = dummy({
    id: 'caster', damage: 60, range: 3.5, windup: 0.5, attackInterval: 5,
    projectile: { kind: 'orb-arcane', speed: 420 }, splash: { radius: 0.8, share: 0.5 }, speed: 0,
  });
  const post = dummy({ id: 'post', damage: 1, speed: 0, range: 0.1, hp: 5000 });
  const plated = dummy({ id: 'plated', damage: 1, speed: 0, range: 0.1, hp: 5000, armor: 10 });

  it('hurts the target in full and those within its radius by its share', () => {
    // Three posts in a column: the middle one is the target, the others one tile away.
    // 0.8 tiles does not reach one tile, so only the target is hurt.
    const far = battle({ caster, post }, [{ unit: 'caster', col: 3, row: 1 }], [
      { unit: 'post', col: 5, row: 1 },
      { unit: 'post', col: 5, row: 0 },
      { unit: 'post', col: 5, row: 2 },
    ]);
    const first = of(far.events, 'projectileHit')[0];
    const atFirst = far.events.filter((e) => e.type === 'damage' && e.t === first.t);
    expect(atFirst.map((e) => e.amount)).toEqual([60]);
  });

  it('reaches a neighbour inside the radius', () => {
    const wide = { ...caster, splash: { radius: 1.1, share: 0.5 } };
    const r = battle({ caster: wide, post, plated }, [{ unit: 'caster', col: 3, row: 1 }], [
      { unit: 'post', col: 5, row: 1 },
      { unit: 'plated', col: 5, row: 0 },
      { unit: 'post', col: 7, row: 3 },
    ]);
    const first = of(r.events, 'projectileHit')[0];
    const atFirst = r.events.filter((e) => e.type === 'damage' && e.t === first.t);
    // The target takes 60; the plated neighbour takes half, less its armor; the far post nothing.
    expect(atFirst.map((e) => [e.kind, e.amount])).toEqual([['attack', 60], ['splash', 20]]);
  });

  it("the Mage's splash is half its damage within 0.8 tiles", () => {
    expect(UNITS.mage.splash).toEqual({ radius: 0.8, share: 0.5 });
  });
});

describe('targets', () => {
  const post = dummy({ id: 'post', damage: 1, speed: 0, range: 0.1, hp: 200 });
  const walker = dummy({ id: 'walker', damage: 100 });

  it('goes for the nearest enemy', () => {
    const r = battle({ post, walker }, [{ unit: 'walker', col: 3, row: 0 }], [
      { unit: 'post', col: 7, row: 3 },
      { unit: 'post', col: 4, row: 0 },
      { unit: 'post', col: 6, row: 2 },
    ]);
    // Units are numbered turn about: walker 0, then posts 1, 2 (second team, in order)... the near post is the second placed.
    const firstAttack = of(r.events, 'attackStart').find((e) => e.unit === 0);
    const near = r.events.find((e) => e.type === 'damage' && e.unit === 0);
    expect(firstAttack?.target).toBe(near?.target);
    const b = new Battle({ seed: 1, defs: { post, walker }, teams: [[{ unit: 'walker', col: 3, row: 0 }], [
      { unit: 'post', col: 7, row: 3 },
      { unit: 'post', col: 4, row: 0 },
      { unit: 'post', col: 6, row: 2 },
    ]] });
    const nearId = b.units.find((u) => u.team === 1 && u.x === 4.5 * TILE)?.id;
    expect(firstAttack?.target).toBe(nearId);
  });

  it('turns to the next when its target dies, until none are left', () => {
    const r = battle({ post, walker }, [{ unit: 'walker', col: 3, row: 0 }], [
      { unit: 'post', col: 4, row: 0 },
      { unit: 'post', col: 5, row: 1 },
      { unit: 'post', col: 6, row: 2 },
    ]);
    const deaths = of(r.events, 'death').map((e) => e.unit);
    expect(deaths).toHaveLength(3);
    expect(r.winner).toBe(0);
    // Nearest first.
    const b = new Battle({ seed: 1, defs: { post, walker }, teams: [[{ unit: 'walker', col: 3, row: 0 }], [
      { unit: 'post', col: 4, row: 0 },
      { unit: 'post', col: 5, row: 1 },
      { unit: 'post', col: 6, row: 2 },
    ]] });
    const byCol = b.units.filter((u) => u.team === 1).sort((p, q) => p.x - q.x).map((u) => u.id);
    expect(deaths).toEqual(byCol);
  });

  it('never targets its own side or the dead', () => {
    const r = runBattle(skirmish(31));
    const b = new Battle(skirmish(31));
    const team = b.units.map((u) => u.team);
    const dead = new Set<number>();
    for (const e of r.events) {
      if (e.type === 'death') dead.add(e.unit);
      if (e.type === 'attackStart' && e.kind === 'attack') {
        expect(team[e.target]).not.toBe(team[e.unit]);
        expect(dead.has(e.target)).toBe(false);
      }
    }
  });
});

describe('timing', () => {
  it('lands a blow exactly its windup after it starts', () => {
    const r = runBattle(skirmish(3));
    const open = new Map<number, { t: number; wait: number }>();
    let checked = 0;
    for (const e of r.events) {
      if (e.type === 'attackStart') open.set(e.unit, { t: e.t, wait: e.amount });
      if (e.type === 'impact') {
        const s = open.get(e.unit);
        expect(s).toBeDefined();
        expect(e.t - (s as { t: number }).t).toBeCloseTo((s as { wait: number }).wait, 6);
        open.delete(e.unit);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it('events are in time order', () => {
    const r = runBattle(skirmish(4));
    for (let i = 1; i < r.events.length; i++) expect(r.events[i].t).toBeGreaterThanOrEqual(r.events[i - 1].t);
  });

  it('a shot takes its distance over its speed to arrive', () => {
    const shooter = dummy({ id: 'shooter', range: 4, speed: 0, windup: 0.3, attackInterval: 3, projectile: { kind: 'arrow', speed: 600 } });
    const post = dummy({ id: 'post', damage: 1, speed: 0, range: 0.1, hp: 5000 });
    const r = battle({ shooter, post }, [{ unit: 'shooter', col: 2, row: 1 }], [{ unit: 'post', col: 5, row: 1 }]);
    const launch = of(r.events, 'projectileLaunch')[0];
    const hit = of(r.events, 'projectileHit')[0];
    expect(hit.id).toBe(launch.id);
    expect(hit.t - launch.t).toBeCloseTo((3 * TILE) / 600, 1);
    const dmg = r.events.find((e) => e.type === 'damage' && e.t === hit.t);
    expect(dmg?.amount).toBe(50);
  });

  it('a unit attacks once per interval', () => {
    const hitter = dummy({ id: 'hitter', attackInterval: 1.2, windup: 0.35, speed: 0, range: 1.2 });
    const post = dummy({ id: 'post', damage: 1, speed: 0, range: 0.1, hp: 5000 });
    const r = battle({ hitter, post }, [{ unit: 'hitter', col: 3, row: 1 }], [{ unit: 'post', col: 4, row: 1 }]);
    const starts = of(r.events, 'attackStart').filter((e) => e.unit === 0).map((e) => e.t);
    for (let i = 1; i < 10; i++) expect(starts[i] - starts[i - 1]).toBeCloseTo(1.2, 6);
  });
});

describe('unit rules', () => {
  it('the Berserker attacks 40% faster below 40% health', () => {
    const zerk = { ...UNITS.berserker, skill: undefined, speed: 0, range: 1.2 };
    const post = dummy({ id: 'post', damage: 30, attackInterval: 0.5, speed: 0, range: 1.2, hp: 100000 });
    const r = battle({ berserker: zerk, post }, [{ unit: 'berserker', col: 3, row: 1 }], [{ unit: 'post', col: 4, row: 1 }]);
    let hp = zerk.hp;
    const gaps: Array<{ gap: number; frenzied: boolean }> = [];
    let last = -1;
    let lastFrenzied = false;
    for (const e of r.events) {
      if (e.type === 'damage' && e.target === 0) hp -= e.amount;
      if (e.type === 'attackStart' && e.unit === 0) {
        if (last >= 0) gaps.push({ gap: e.t - last, frenzied: lastFrenzied });
        last = e.t;
        lastFrenzied = hp < zerk.hp * 0.4;
      }
    }
    const calm = gaps.filter((g) => !g.frenzied).map((g) => g.gap);
    const wild = gaps.filter((g) => g.frenzied).map((g) => g.gap);
    expect(calm.length).toBeGreaterThan(2);
    expect(wild.length).toBeGreaterThan(2);
    expect(calm[0]).toBeCloseTo(0.9, 6);
    // 0.9 s over 1.4 is 0.643 s, which is 13 steps of 50 ms.
    expect(wild[wild.length - 1]).toBeCloseTo(0.65, 6);
  });

  it('a healer mends the ally with the least health for its size, in range', () => {
    const healer = dummy({ id: 'healer', damage: 10, range: 3, speed: 0, heal: { amount: 50, range: 3 }, projectile: { kind: 'orb-holy', speed: 480 } });
    const tough = dummy({ id: 'tough', hp: 1000, speed: 0, range: 0.1, damage: 1 });
    const frail = dummy({ id: 'frail', hp: 200, speed: 0, range: 0.1, damage: 1 });
    // The enemy archer shoots the frail one first (nearest), so it is the worse hurt.
    const sniper = dummy({ id: 'sniper', damage: 40, range: 8, speed: 0, attackInterval: 1, projectile: { kind: 'arrow', speed: 900 } });
    const r = battle({ healer, tough, frail, sniper }, [
      { unit: 'healer', col: 0, row: 1 },
      { unit: 'tough', col: 1, row: 0 },
      { unit: 'frail', col: 2, row: 1 },
    ], [{ unit: 'sniper', col: 6, row: 1 }]);
    const b = new Battle({ seed: 1, defs: { healer, tough, frail, sniper }, teams: [[
      { unit: 'healer', col: 0, row: 1 },
      { unit: 'tough', col: 1, row: 0 },
      { unit: 'frail', col: 2, row: 1 },
    ], [{ unit: 'sniper', col: 6, row: 1 }]] });
    const frailId = b.units.find((u) => u.def.id === 'frail')?.id;
    const heals = of(r.events, 'heal');
    expect(heals.length).toBeGreaterThan(2);
    expect(heals[0].target).toBe(frailId);
    expect(heals[0].amount).toBeLessThanOrEqual(50);
  });

  it('a stunned unit does nothing, and loses the blow it was winding up', () => {
    const stunner = dummy({
      id: 'stunner', damage: 10, speed: 0, range: 1.2, attackInterval: 0.5, windup: 0.1,
      onHit: { id: 'stun', duration: 2 },
    });
    const slow = dummy({ id: 'slow', damage: 500, speed: 0, range: 1.2, attackInterval: 1, windup: 0.6 });
    const r = battle({ stunner, slow }, [{ unit: 'stunner', col: 3, row: 1 }], [{ unit: 'slow', col: 4, row: 1 }]);
    // The slow unit is stunned again before its long windup ever finishes.
    expect(r.events.filter((e) => e.type === 'damage' && e.unit === 1)).toHaveLength(0);
    expect(r.winner).toBe(0);
  });

  it('burn hurts over time and armor does not help', () => {
    const torch = dummy({ id: 'torch', damage: 40, speed: 0, range: 1.2, attackInterval: 100, onHit: { id: 'burn', duration: 3, power: 0.5 } });
    const plated = dummy({ id: 'plated', armor: 30, damage: 1, speed: 0, range: 0.1, hp: 5000 });
    const r = battle({ torch, plated }, [{ unit: 'torch', col: 3, row: 1 }], [{ unit: 'plated', col: 4, row: 1 }]);
    const burns = r.events.filter((e) => e.type === 'damage' && e.kind === 'burn');
    // Half of 40 a second, landing twice a second for three seconds: six pulses of 10.
    expect(burns.map((e) => e.amount)).toEqual([10, 10, 10, 10, 10, 10]);
  });
});

describe('skills', () => {
  it('a volley hits several enemies at once', () => {
    const post = dummy({ id: 'post', damage: 1, speed: 0, range: 0.1, hp: 5000 });
    const archer = { ...UNITS.archer, speed: 0, range: 8 };
    const r = battle({ archer, post }, [{ unit: 'archer', col: 0, row: 1 }], [
      { unit: 'post', col: 4, row: 0 },
      { unit: 'post', col: 4, row: 1 },
      { unit: 'post', col: 4, row: 2 },
      { unit: 'post', col: 7, row: 3 },
    ]);
    const cast = of(r.events, 'skill')[0];
    expect(cast.kind).toBe('fan-of-arrows');
    const impact = r.events.find((e) => e.type === 'impact' && e.kind === 'fan-of-arrows');
    const shots = r.events.filter((e) => e.type === 'projectileLaunch' && e.t === impact?.t);
    expect(shots).toHaveLength(3);
    expect(new Set(shots.map((e) => e.target)).size).toBe(3);
  });

  it('a cleave hits everything around the unit', () => {
    const post = dummy({ id: 'post', damage: 1, speed: 0, range: 0.1, hp: 5000 });
    const zerk = { ...UNITS.berserker, speed: 0, range: 1.3 };
    const r = battle({ berserker: zerk, post }, [{ unit: 'berserker', col: 3, row: 1 }], [
      { unit: 'post', col: 4, row: 1 },
      { unit: 'post', col: 3, row: 0 },
      { unit: 'post', col: 7, row: 3 },
    ]);
    const impact = r.events.find((e) => e.type === 'impact' && e.kind === 'reaping-spin');
    const hits = r.events.filter((e) => e.type === 'damage' && e.kind === 'reaping-spin' && e.t === impact?.t);
    expect(hits).toHaveLength(2);
    for (const h of hits) expect(h.amount).toBe(63);
  });

  it('a mend heals every hurt ally nearby', () => {
    const r = runBattle({
      seed: 3,
      defs: UNITS,
      teams: [
        [{ unit: 'knight', col: 3, row: 1 }, { unit: 'knight', col: 3, row: 2 }, { unit: 'cleric', col: 2, row: 1 }],
        [{ unit: 'berserker', col: 4, row: 1 }, { unit: 'berserker', col: 4, row: 2 }],
      ],
    });
    const hymn = r.events.find((e) => e.type === 'impact' && e.kind === 'radiant-hymn');
    expect(hymn).toBeDefined();
    const healed = r.events.filter((e) => e.type === 'heal' && e.t === hymn?.t);
    expect(healed.length).toBeGreaterThanOrEqual(2);
  });
});

describe('what dungeons and raids ask of a battle', () => {
  const defs = { dummy: dummy(), imp: dummy({ id: 'imp', name: 'Imp', hp: 120, damage: 10 }), wall: dummy({ id: 'wall', name: 'Wall', hp: 90000, damage: 0 }) };

  it('a unit can come to a battle hurt, and one that comes with nothing left still comes alive', () => {
    const hurt = new Battle({ seed: 1, defs, teams: [[{ unit: 'dummy', col: 0, row: 0, hpShare: 0.25 }, { unit: 'dummy', col: 0, row: 1, hpShare: 0 }, { unit: 'dummy', col: 0, row: 2 }], [{ unit: 'dummy', col: 7, row: 0 }]] });
    const mine = hurt.units.filter((u) => u.team === 0);
    expect(mine.map((u) => u.hp)).toEqual([250, 1, 1000]);
    expect(mine.every((u) => u.maxHp === 1000)).toBe(true);
    // Hurt units lose to whole ones of the same kind.
    const a = [{ unit: 'dummy', col: 3, row: 1, hpShare: 0.3 }];
    const b = [{ unit: 'dummy', col: 4, row: 1 }];
    expect(battle(defs, a, b, 5).winner).toBe(1);
  });

  it('ends when its own time is up, and whoever has more of their health left has it', () => {
    const input = { seed: 3, defs, teams: [[{ unit: 'wall', col: 0, row: 0, hpShare: 0.5 }], [{ unit: 'wall', col: 7, row: 3 }]] as const };
    const short = runBattle({ ...input, seconds: 5 });
    expect(short.seconds).toBeCloseTo(5, 5);
    expect(short.winner).toBe(1);
    expect(runBattle(input).seconds).toBeGreaterThan(80);
  });

  it('a unit that calls others up does so on its clock, never past its cap, and they have its strength', () => {
    const caller = { unit: 'wall', col: 6, row: 1, hpMult: 2, damageMult: 3, summons: { unit: 'imp', every: 2, cap: 3 } };
    const b = new Battle({ seed: 9, defs, teams: [[{ unit: 'wall', col: 0, row: 1 }], [caller]], seconds: 30 });
    const spawns: number[] = [];
    let most = 0;
    while (!b.ended) {
      b.step();
      for (let i = 0; i < b.eventCount; i++) if (b.events[i].type === 'spawn') spawns.push(b.events[i].t);
      most = Math.max(most, b.units.filter((u) => u.alive && u.calledBy >= 0).length);
    }
    // The first after two seconds, then every two: the wall they fight never kills one, so the cap holds them at three.
    expect(spawns.slice(0, 3).map((t) => Math.round(t))).toEqual([2, 4, 6]);
    expect(spawns).toHaveLength(3);
    expect(most).toBe(3);
    const imps = b.units.filter((u) => u.def.id === 'imp');
    expect(imps).toHaveLength(3);
    for (const imp of imps) {
      expect(imp.team).toBe(1);
      expect(imp.maxHp).toBe(240);
      expect(imp.damage).toBe(30);
      expect(imp.calledBy).toBe(b.units.find((u) => u.summons)?.id);
      expect(imp.y).toBeGreaterThan(0);
      expect(imp.x).toBeGreaterThan(0);
    }
  });

  it('when one that was called up falls, another comes, and the same seed gives the same battle', () => {
    const teams = [[{ unit: 'wall', col: 0, row: 1 }], [{ unit: 'wall', col: 6, row: 1, summons: { unit: 'imp', every: 1, cap: 1 } }]] as const;
    const b = new Battle({ seed: 4, defs, teams, seconds: 20 });
    const called = (): number => b.units.filter((u) => u.calledBy >= 0).length;
    while (called() < 1) b.step();
    // Its cap is one: no second comes while the first stands.
    for (let i = 0; i < 60; i++) b.step();
    expect(called()).toBe(1);
    const first = b.units.find((u) => u.calledBy >= 0);
    if (first) first.alive = false;
    for (let i = 0; i < 25; i++) b.step();
    expect(called()).toBe(2);
    expect(runBattle({ seed: 4, defs, teams, seconds: 20 }).fingerprint).toBe(runBattle({ seed: 4, defs, teams, seconds: 20 }).fingerprint);
    // A battle with no one called up is the battle it always was.
    const plain = [[{ unit: 'dummy', col: 3, row: 1 }], [{ unit: 'dummy', col: 4, row: 1 }]] as const;
    expect(runBattle({ seed: 4, defs, teams: plain }).fingerprint).toBe(runBattle({ seed: 4, defs, teams: plain, seconds: 90 }).fingerprint);
  });
});

describe('buildings, auras and traps', () => {
  const defs = {
    dummy: dummy(),
    tower: dummy({ id: 'tower', name: 'Tower', still: true, hp: 800, damage: 40, range: 3, speed: 0, projectile: { kind: 'arrow', speed: 600 } }),
    wall: dummy({ id: 'wall', name: 'Wall', still: true, hp: 3000, damage: 0, range: 0, speed: 0 }),
    hall: dummy({ id: 'hall', name: 'Hall', still: true, hp: 3000, damage: 0, range: 0, speed: 0, summons: { unit: 'dummy', every: 2, cap: 1 } }),
    banner: dummy({ id: 'banner', name: 'Banner', still: true, hp: 500, damage: 0, range: 0, speed: 0, aura: { status: { id: 'haste', duration: 3 }, radius: 2, every: 1 } }),
    spikes: dummy({ id: 'spikes', name: 'Spikes', hp: 1, damage: 300, range: 0, speed: 0, trap: { trigger: 0.6, radius: 1 } }),
    jaws: dummy({ id: 'jaws', name: 'Jaws', hp: 1, damage: 50, range: 0, speed: 0, trap: { trigger: 0.6, radius: 0.8, status: { id: 'stun', duration: 2 } } }),
    // Someone who counts as standing but goes nowhere and harms no one: a battle is on while a side has one.
    post: dummy({ id: 'post', name: 'Post', hp: 100000, damage: 0, range: 0, speed: 0 }),
    healer: dummy({ id: 'healer', name: 'Healer', hp: 400, damage: 5, range: 3, heal: { amount: 60, range: 4 }, projectile: { kind: 'orb-holy', speed: 500 } }),
  };

  it('a building never moves, strikes only what comes within its reach, and falls like anything else', () => {
    const b = new Battle({ seed: 2, defs, teams: [[{ unit: 'tower', col: 1, row: 1 }, { unit: 'post', col: 0, row: 3 }], [{ unit: 'dummy', col: 7, row: 1 }]], seconds: 60 });
    const tower = b.units[0];
    const [x, y] = [tower.x, tower.y];
    let shotsBefore = 0;
    let near = false;
    while (!b.ended) {
      b.step();
      const foe = b.units.find((u) => u.team === 1)!;
      near = near || Math.abs(foe.x - tower.x) <= tower.rangePx;
      for (let i = 0; i < b.eventCount; i++) if (b.events[i].type === 'attackStart' && b.events[i].unit === tower.id && !near) shotsBefore++;
      if (tower.alive) expect([tower.x, tower.y]).toEqual([x, y]);
    }
    // It did not loose a shot while its enemy was out of reach, and the enemy, which could walk to it, pulled it down.
    expect(shotsBefore).toBe(0);
    expect(tower.alive).toBe(false);
  });

  it('whoever walks into a building gives way: it is not pushed', () => {
    const b = new Battle({ seed: 2, defs, teams: [[{ unit: 'wall', col: 3, row: 1 }, { unit: 'post', col: 0, row: 1 }], [{ unit: 'dummy', col: 5, row: 1 }, { unit: 'dummy', col: 5, row: 2 }]], seconds: 10 });
    const wall = b.units[0];
    const x = wall.x;
    let struck = 0;
    while (!b.ended) {
      b.step();
      for (let i = 0; i < b.eventCount; i++) if (b.events[i].type === 'damage' && b.events[i].target === wall.id) struck++;
    }
    // They came at it and struck it, and it stands where it stood.
    expect(struck).toBeGreaterThan(0);
    expect(wall.x).toBe(x);
  });

  it('nothing mends a building, a barracks sends out units as strong as it is, and a side has not lost while a building of its own stands', () => {
    const r = new Battle({ seed: 5, defs, teams: [[{ unit: 'wall', col: 0, row: 0 }, { unit: 'healer', col: 0, row: 3 }], [{ unit: 'dummy', col: 7, row: 0, damageMult: 6 }]], seconds: 40 });
    let healedWall = 0;
    while (!r.ended) {
      r.step();
      for (let i = 0; i < r.eventCount; i++) if (r.events[i].type === 'heal' && r.events[i].target === 0) healedWall++;
    }
    expect(healedWall).toBe(0);
    // A barracks of its own sends units out, as strong as it is.
    const hall = new Battle({ seed: 5, defs, teams: [[{ unit: 'hall', col: 0, row: 1, hpMult: 2, damageMult: 3 }, { unit: 'post', col: 0, row: 3 }], [{ unit: 'post', col: 7, row: 1 }]], seconds: 6 });
    while (!hall.ended) hall.step();
    const sent = hall.units.filter((u) => u.calledBy === 0);
    expect(sent.length).toBeGreaterThanOrEqual(1);
    expect(sent[0]).toMatchObject({ team: 0, maxHp: 2000, damage: 150 });
    // A wall with no one beside it still holds the field: it has to be pulled down before the battle is won.
    const alone = new Battle({ seed: 1, defs, teams: [[{ unit: 'wall', col: 3, row: 2 }], [{ unit: 'dummy', col: 4, row: 2, damageMult: 8 }]] });
    while (!alone.ended) alone.step();
    expect(alone.winner).toBe(1);
    expect(alone.tick).toBeGreaterThan(20);
    expect(alone.units[0].alive).toBe(false);
    // And a tower with no one beside it can win one: whoever comes at it has to bring it down first.
    const tower = runBattle({ seed: 1, defs, teams: [[{ unit: 'tower', col: 3, row: 1, damageMult: 20 }], [{ unit: 'dummy', col: 7, row: 1 }]] });
    expect(tower.winner).toBe(0);
  });

  it('a banner keeps its status on its own side near it, and not on those far off or on the enemy', () => {
    const b = new Battle({ seed: 3, defs, teams: [[{ unit: 'banner', col: 1, row: 1 }, { unit: 'wall', col: 1, row: 2 }, { unit: 'wall', col: 3, row: 3 }, { unit: 'post', col: 0, row: 3 }], [{ unit: 'post', col: 7, row: 0 }]], seconds: 3 });
    const hasted = new Set<number>();
    while (!b.ended) {
      b.step();
      for (let i = 0; i < b.eventCount; i++) if (b.events[i].type === 'status' && b.events[i].kind === 'haste') hasted.add(b.events[i].unit);
    }
    expect([...hasted]).toEqual([b.units.find((u) => u.def.id === 'wall' && u.team === 0)?.id]);
  });

  it("a trap is no one's target, goes off once when an enemy steps on it, and hurts all near it", () => {
    const teams = [[{ unit: 'spikes', col: 3, row: 1 }, { unit: 'post', col: 0, row: 1 }], [{ unit: 'dummy', col: 5, row: 1 }, { unit: 'dummy', col: 7, row: 3 }]] as const;
    const b = new Battle({ seed: 8, defs, teams, seconds: 30 });
    const trap = b.units[0];
    const stepper = b.units[1];
    const sprung: number[] = [];
    const hurtBy: number[] = [];
    while (!b.ended) {
      b.step();
      for (let i = 0; i < b.eventCount; i++) {
        const e = b.events[i];
        if (e.type === 'trap') sprung.push(e.unit);
        if (e.type === 'damage' && e.kind === 'trap') hurtBy.push(e.target);
        if (e.type === 'attackStart') expect(e.target).not.toBe(trap.id);
      }
    }
    expect(sprung).toEqual([trap.id]);
    expect(hurtBy).toContain(stepper.id);
    expect(trap.alive).toBe(false);
    // The one that was far off when it went was not touched by it.
    expect(hurtBy).not.toContain(b.units[3].id);
  });

  it('a trap with a status leaves it, and a side with only traps left has lost', () => {
    const b = new Battle({ seed: 8, defs, teams: [[{ unit: 'jaws', col: 3, row: 1 }, { unit: 'post', col: 0, row: 1 }], [{ unit: 'dummy', col: 5, row: 1 }]], seconds: 20 });
    let stunned = false;
    while (!b.ended) {
      b.step();
      for (let i = 0; i < b.eventCount; i++) if (b.events[i].type === 'status' && b.events[i].kind === 'stun') stunned = true;
    }
    expect(stunned).toBe(true);
    const only = runBattle({ seed: 1, defs, teams: [[{ unit: 'spikes', col: 0, row: 0 }], [{ unit: 'dummy', col: 7, row: 3 }]] });
    expect(only.winner).toBe(1);
    expect(only.seconds).toBeLessThan(1);
  });

  it('no skill reaches a trap: an archer that looses a fan of arrows at a wall leaves the trap beside it alone', () => {
    // The game's own units: the Archer's volley picks the nearest few, and a trap is never one of them.
    const b = new Battle({
      seed: 4, defs: UNITS, seconds: 40,
      teams: [[{ unit: 'archer', col: 0, row: 0, hpMult: 40, damageMult: 0.2 }], [{ unit: 'militia', col: 7, row: 0, hpMult: 40 }, { unit: 'palisade', col: 6, row: 0 }, { unit: 'spiketrap', col: 6, row: 3 }]],
    });
    const trap = b.units.find((u) => u.def.id === 'spiketrap')!;
    let skills = 0;
    while (!b.ended) {
      b.step();
      for (let i = 0; i < b.eventCount; i++) {
        const e = b.events[i];
        if (e.type === 'skill') skills++;
        if (e.type === 'damage' || e.type === 'death') expect(e.type === 'death' ? e.unit : e.target).not.toBe(trap.id);
      }
    }
    expect(skills).toBeGreaterThan(0);
    expect(trap.alive).toBe(true);
  });
});
