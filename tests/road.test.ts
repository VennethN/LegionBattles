import { describe, expect, it } from 'vitest';
import { botCamp, botSteer } from '../src/game/bot';
import { COMPANIONS, ENEMIES, OMENS, ROAD, byId, enemyAt, omenOf, waveOf, type Omen } from '../src/game/data';
import { choose, endWave, forksOf, march, newRun, setupOf, takeRelic, takeRoad, type RunData } from '../src/game/run';
import { freshSave, repair } from '../src/game/state';
import { STEP, World, type Ev, type Setup } from '../src/game/world';
import { alone, play, setup, stand, stats } from './field';

const has = <T extends Ev['t']>(events: readonly Ev[], t: T): Extract<Ev, { t: T }>[] => events.filter((e): e is Extract<Ev, { t: T }> => e.t === t);
const on = (omen: Omen, o: Partial<Setup> = {}): World => new World(setup({ wave: 5, omen, ...o }));

/** A run that stands in its camp before a wave. */
const camp = (wave: number, o: Partial<RunData> = {}): RunData => ({ ...newRun('bram', 99), wave, phase: 'camp', ...o });

/** A wave of the run's as if it had been come through, with whatever a test says it left. */
const cleared = (run: RunData, o: Partial<World> = {}): World => {
  const w = new World(setupOf(run));
  Object.assign(w, { over: 'cleared' }, o);
  return w;
};

describe('the road out of the camp', () => {
  it('has an omen of each kind, each with its name, what it is and its prize', () => {
    expect(OMENS.map((o) => o.id).sort()).toEqual(['champions', 'horde', 'night', 'quiet', 'shrine', 'stray', 'wagon']);
    for (const o of OMENS) for (const text of [o.name, o.says, o.prize]) expect(text.length, o.id).toBeGreaterThan(5);
  });

  it('lays out two roads, no two alike, and the one taken is the wave that is fought', () => {
    const run = camp(5);
    expect(march(run)).toBe(true);
    expect(run.phase).toBe('road');
    expect(run.roads.length).toBe(ROAD.roads);
    expect(new Set(run.roads.map((r) => r.omen)).size).toBe(run.roads.length);
    const want = run.roads[1].omen;
    expect(takeRoad(run, 5)).toBe(false);
    expect(takeRoad(run, 1)).toBe(true);
    expect(run.phase).toBe('fight');
    expect(run.roads).toEqual([]);
    expect(new World(setupOf(run)).omen).toBe(want);
  });

  it('comes from the run\'s own dice: the same run is offered the same roads', () => {
    const a = camp(6);
    const b = camp(6);
    march(a);
    march(b);
    expect(a.roads).toEqual(b.roads);
    const other = camp(6, { dice: 31337 });
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      other.phase = 'camp';
      march(other);
      for (const r of other.roads) seen.add(r.omen);
    }
    // Over many camps every omen that may lead to the sixth wave is offered.
    expect([...seen].sort()).toEqual(OMENS.filter((o) => o.from <= 6).map((o) => o.id).sort());
  });

  it('offers nothing before its time: the second wave is reached by a gentle road', () => {
    const run = camp(2);
    for (let i = 0; i < 30; i++) {
      run.phase = 'camp';
      march(run);
      for (const r of run.roads) expect(omenOf(r.omen).from).toBeLessThanOrEqual(2);
    }
  });

  it('has one road to a captain, and the run is on it at once', () => {
    const run = camp(7);
    expect(waveOf(7).boss).toBeDefined();
    march(run);
    expect(run.phase).toBe('fight');
    expect(run.road.omen).toBe('quiet');
    // Even a road taken by some other way changes nothing of a captain's wave.
    run.road = { omen: 'horde' };
    expect(new World(setupOf(run)).omen).toBe('quiet');
  });

  it('lays out a third road where the run was begun with three, and one more for the Old Map', () => {
    const three = { ...newRun('bram', 5, [], 3), wave: 5, phase: 'camp' as const };
    march(three);
    expect(three.roads.length).toBe(3);
    const mapped = camp(5, { relics: ['oldmap'] });
    expect(forksOf(mapped)).toBe(ROAD.roads + 1);
    march(mapped);
    expect(mapped.roads.length).toBe(ROAD.roads + 1);
    expect(forksOf({ ...mapped, forks: 99 })).toBe(ROAD.most);
  });

  it('is kept in a save, and a run left on the road is carried on from there', () => {
    const run = camp(5, { relics: ['bellows'] });
    march(run);
    const save = freshSave();
    save.run = run;
    const back = repair(JSON.parse(JSON.stringify(save)));
    expect(back.run).toEqual(run);
    expect(takeRoad(back.run as RunData, 0)).toBe(true);
    // A run that names a relic or an omen the game does not have is let go.
    save.run = { ...camp(5), relics: ['nosuch'] };
    expect(repair(JSON.parse(JSON.stringify(save))).run).toBeNull();
  });
});

describe('omens', () => {
  it('quiet road: the wave as it is written, with no prize', () => {
    const w = on('quiet');
    expect(w.wave).toEqual(waveOf(5));
    expect(w.night).toBe(false);
    expect(w.shrine).toBeNull();
    const run = camp(5);
    run.phase = 'fight';
    endWave(run, cleared(run));
    expect(run.phase).toBe('camp');
    expect(run.relicsDue).toBe(0);
  });

  it('the horde: half as many again, each a little weaker, and half as much experience again', () => {
    const plain = waveOf(5);
    const w = on('horde');
    expect(w.wave.band).toBe(Math.round(plain.band * ROAD.horde.more));
    expect(w.wave.most).toBe(Math.round(plain.most * ROAD.horde.more));
    const events = play(w, 3);
    const stood = has(events, 'stand').map((e) => w.foes.find((f) => f.id === e.id)).filter((f) => f !== undefined);
    expect(stood.length).toBeGreaterThan(0);
    for (const f of stood) expect(f.maxHp).toBe(Math.max(1, Math.round(enemyAt(f.def, 5).hp * ROAD.horde.hp)));
    // A coin is worth half as much experience again, and no more coins.
    w.picks.push({ id: 1, kind: 'coin', x: w.hero.x + 5, y: w.hero.y, vx: 0, vy: 0, value: 10, pulled: false, age: 1 });
    const before = { xp: w.xp, gold: w.gold, coins: w.coins };
    play(w, 0.5);
    expect(w.xp - before.xp).toBeGreaterThanOrEqual(10 * ROAD.horde.xp);
    expect((w.xp - before.xp) / (w.coins - before.coins)).toBeCloseTo(ROAD.horde.xp);
  });

  it('champions: fewer of the rest, and three champions, each bigger, far stronger, and with a trait', () => {
    const plain = waveOf(5);
    const w = on('champions');
    expect(w.wave.band).toBe(Math.max(2, Math.round(plain.band * ROAD.champions.fewer)));
    const events: Ev[] = [];
    const seen = new Map<number, { hp: number; size: number; trait: string }>();
    for (let t = 0; t < w.wave.seconds - 1 && !w.over; t += STEP) {
      w.step({ x: 0, y: 0 });
      for (const e of w.drain()) {
        events.push(e);
        if (e.t !== 'champion') continue;
        const f = w.foes.find((x) => x.id === e.id);
        if (f) seen.set(f.id, { hp: f.maxHp, size: f.def.size ?? 1, trait: f.champion });
      }
    }
    expect(has(events, 'champion').length).toBe(ROAD.champions.count);
    expect(seen.size).toBe(ROAD.champions.count);
    // Each is made from the sturdiest who walks in the wave.
    const from = byId(ENEMIES, 'bruiser');
    for (const c of seen.values()) {
      expect(c.hp).toBe(Math.round(enemyAt(from, 5).hp * ROAD.champions.hp));
      expect(c.size).toBeCloseTo((from.size ?? 1) * ROAD.champions.size);
      expect(['quick', 'armored', 'burning']).toContain(c.trait);
    }
  });

  it('champions: a quick one is faster, an armored one turns part of a blow but not of fire, a burning one blazes after a warning', () => {
    const w = alone(new World(setup({ wave: 5, omen: 'champions', own: { id: 'gatekeeper', tier: 0 }, stats: stats({ maxHp: 9999, crit: -1000 }) })));
    (w as unknown as { champsDue: number[] }).champsDue = [];
    const h = w.hero;
    const plain = stand(w, 'bruiser', h.x + 60, h.y, { hp: 9999, maxHp: 9999 }, true);
    const armored = stand(w, 'bruiser', h.x + 60, h.y + 8, { hp: 9999, maxHp: 9999, champion: 'armored' }, true);
    const events = play(w, 0.6);
    const a = has(events, 'hit').find((e) => e.id === plain.id)?.amount ?? 0;
    const b = has(events, 'hit').find((e) => e.id === armored.id)?.amount ?? 0;
    expect(a).toBeGreaterThan(0);
    expect(b).toBe(Math.round(a * ROAD.champions.armored));
    // Fire is no blow: it burns the armored as it burns anyone.
    w.slots[0].cool = 99;
    plain.burn = armored.burn = 1;
    plain.burnBy = armored.burnBy = 10;
    const burned = has(play(w, 0.6), 'hit').filter((e) => e.soft);
    expect(burned.find((e) => e.id === armored.id)?.amount).toBe(burned.find((e) => e.id === plain.id)?.amount);

    // A burning one stops near the hero, shows its ring, and then it goes off.
    const v = alone(new World(setup({ wave: 5, omen: 'champions', stats: stats({ maxHp: 9999 }) })));
    (v as unknown as { champsDue: number[] }).champsDue = [];
    stand(v, 'bruiser', v.hero.x + 70, v.hero.y, { hp: 9999, dmg: 4, champion: 'burning', blaze: 0 });
    const first = play(v, 0.2);
    const aim = has(first, 'aim')[0];
    expect(aim.doing).toBe('blaze');
    expect(aim.seconds).toBe(ROAD.champions.warn);
    expect(has(first, 'hurt').length).toBe(0);
    const then = play(v, ROAD.champions.warn + 0.1);
    expect(has(then, 'burst').some((e) => e.kind === 'foe' && e.r === ROAD.champions.blaze)).toBe(true);
    expect(has(then, 'hurt').length).toBeGreaterThan(0);
  });

  it('champions and the night march leave a relic to choose, one of three', () => {
    for (const omen of ['champions', 'night'] as const) {
      const run = camp(5);
      run.road = { omen };
      run.phase = 'fight';
      endWave(run, cleared(run));
      expect(run.phase, omen).toBe('relic');
      expect(run.relicChoices.length).toBe(3);
      expect(new Set(run.relicChoices).size).toBe(3);
      const took = run.relicChoices[2];
      expect(takeRelic(run, 2)).toBe(true);
      expect(run.relics).toEqual([took]);
      expect(run.phase).toBe('camp');
      // The road was for one wave: the next is quiet until another is taken.
      expect(run.road.omen).toBe('quiet');
    }
  });

  it('night march: it is night, and they come on faster', () => {
    const day = alone(on('quiet'));
    const night = alone(on('night'));
    expect(night.night).toBe(true);
    const a = stand(day, 'cutpurse', day.hero.x + 400, day.hero.y);
    const b = stand(night, 'cutpurse', night.hero.x + 400, night.hero.y);
    play(day, 1);
    play(night, 1);
    expect((night.hero.x + 400 - b.x) / (day.hero.x + 400 - a.x)).toBeCloseTo(ROAD.night.faster, 1);
  });

  it('pay wagon: it is marked, comes on under guard, hurts nobody, and broken open spills its chest', () => {
    const w = on('wagon', { own: { id: 'gatekeeper', tier: 0 } });
    const events = play(w, w.wave.seconds * ROAD.wagon.at + 2);
    const wagon = w.foes.find((f) => f.def.id === 'paywagon');
    expect(wagon).toBeDefined();
    if (!wagon) return;
    expect(has(events, 'wagon').map((e) => e.how)).toEqual(['on']);
    // Its guard stood with it: the sturdiest who walk in the wave.
    expect(has(events, 'mark').length).toBeGreaterThanOrEqual(1 + ROAD.wagon.guards);
    // It rolls over the hero and does nothing to them.
    const lone = alone(on('wagon'));
    (lone as unknown as { wagonDue: number }).wagonDue = -1;
    const cart = stand(lone, 'paywagon', lone.hero.x, lone.hero.y, { dx: 1 });
    (lone as unknown as { wagonSpeed: number }).wagonSpeed = 0;
    expect(has(play(lone, 1), 'hurt').length).toBe(0);
    // Broken, it leaves its chest, and is nobody's kill.
    cart.hp = 1;
    cart.burn = 1;
    cart.burnBy = 10;
    const broke = play(lone, 0.6);
    expect(has(broke, 'wagon').map((e) => e.how)).toEqual(['broken']);
    expect(lone.kills).toBe(0);
    expect(lone.picks.reduce((n, p) => n + (p.kind === 'coin' ? p.value : 0), 0) + lone.coins).toBe(ROAD.wagon.coins + ROAD.wagon.more * 4);
  });

  it('pay wagon: left alone it goes over the field and away with its chest', () => {
    const w = alone(on('wagon', { stats: stats({ maxHp: 9999 }) }));
    // The hero keeps to a corner, out of its way.
    const events = play(w, w.wave.seconds - 1, { x: -1, y: -1 });
    expect(has(events, 'wagon').map((e) => e.how)).toEqual(['on', 'away']);
    expect(w.coins).toBe(0);
  });

  it('the shrine: standing in its ring for eight seconds in all blesses the hero, and the blessing is a choice as for a level', () => {
    const w = on('shrine', { stats: stats({ maxHp: 99999 }) });
    const sh = w.shrine;
    expect(sh).not.toBeNull();
    if (!sh) return;
    expect(Math.hypot(sh.x - w.w / 2, sh.y - w.h / 2)).toBeGreaterThan(ROAD.shrine.r);
    // Out of the ring nothing is counted.
    play(w, 2);
    expect(sh.got).toBe(0);
    w.hero.x = sh.x;
    w.hero.y = sh.y;
    play(w, ROAD.shrine.seconds / 2);
    expect(sh.got).toBeCloseTo(ROAD.shrine.seconds / 2, 1);
    expect(w.blessed).toBe(false);
    // Stepping out does not lose what was counted.
    w.hero.x = sh.x + sh.r + 60;
    play(w, 1);
    expect(sh.got).toBeCloseTo(ROAD.shrine.seconds / 2, 1);
    w.hero.x = sh.x;
    const events = play(w, ROAD.shrine.seconds / 2 + 0.1);
    expect(has(events, 'bless').length).toBe(1);
    expect(w.blessed).toBe(true);

    const run = camp(5);
    run.road = { omen: 'shrine' };
    run.phase = 'fight';
    endWave(run, cleared(run, { blessed: true } as Partial<World>));
    expect(run.phase).toBe('level');
    expect(run.pending).toBe(1);
    const level = run.level;
    choose(run, 0);
    expect(run.level).toBe(level);
    expect(run.phase).toBe('camp');
    // A shrine that was not filled gives nothing.
    const other = camp(5);
    other.road = { omen: 'shrine' };
    other.phase = 'fight';
    endWave(other, cleared(other));
    expect(other.pending).toBe(0);
  });

  it('the stray: a cage stands on the field, and whoever is let out of it fights beside the band for the rest of the run', () => {
    const w = alone(on('stray', { stray: 'greta', own: { id: 'gatekeeper', tier: 0 }, band: [{ id: 'biscuit', bond: 0 }] }));
    const first = play(w, 3);
    const cage = w.foes.find((f) => f.def.id === 'cage');
    expect(cage).toBeDefined();
    if (!cage) return;
    expect(has(first, 'hurt').length).toBe(0);
    expect(Math.hypot(cage.x - w.w / 2, cage.y - w.h / 2)).toBeGreaterThan(200);
    // It does not move, whatever shoves it.
    const at = { x: cage.x, y: cage.y };
    w.hero.x = cage.x - 50;
    w.hero.y = cage.y;
    const events = play(w, 6);
    const free = has(events, 'free')[0];
    expect(free.who).toBe('greta');
    expect({ x: free.x, y: free.y }).toEqual(at);
    expect(w.freed).toBe('greta');
    expect(w.band.map((a) => a.def.id)).toEqual(['biscuit', 'greta']);
    expect(w.kills).toBe(0);

    const run = { ...newRun('bram', 3, ['biscuit']), wave: 5, phase: 'fight' as const, road: { omen: 'stray' as const, stray: 'greta' } };
    endWave(run, cleared(run, { freed: 'greta' } as Partial<World>));
    expect(run.band).toEqual([{ id: 'biscuit', bond: 0 }, { id: 'greta', bond: 0, stray: true }]);
    expect(new World(setupOf(run)).band.length).toBe(2);
  });

  it('the stray: the cage holds someone who is not on the run, and a run takes in no more than two', () => {
    const run = camp(6, { band: [{ id: 'biscuit', bond: 0 }] });
    const who = new Set<string>();
    for (let i = 0; i < 80; i++) {
      run.phase = 'camp';
      march(run);
      for (const r of run.roads) {
        if (r.omen !== 'stray') continue;
        expect(r.stray).toBeDefined();
        expect(r.stray).not.toBe('biscuit');
        who.add(r.stray as string);
      }
    }
    expect(who.size).toBeGreaterThan(2);
    for (const id of who) expect(COMPANIONS.some((c) => c.id === id)).toBe(true);
    const full = camp(6, { band: [{ id: 'pip', bond: 0, stray: true }, { id: 'quill', bond: 0, stray: true }] });
    for (let i = 0; i < 40; i++) {
      full.phase = 'camp';
      march(full);
      expect(full.roads.some((r) => r.omen === 'stray')).toBe(false);
    }
    // A cage with nobody named in it is not put on the field.
    expect(play(alone(on('stray')), 3).some((e) => e.t === 'mark')).toBe(false);
  });
});

describe('a run with roads in it', () => {
  it('is played to its end by the plain player, who takes roads and relics as they come', () => {
    const run = newRun('wren', 777, ['biscuit']);
    const omens = new Set<string>();
    let waves = 0;
    while (run.phase !== 'over' && waves++ < 14) {
      const w = new World(setupOf(run));
      omens.add(w.omen);
      for (let i = 0; i < 60 * 200 && !w.over; i++) w.step(botSteer(w));
      endWave(run, w);
      if ((run.phase as string) !== 'over') {
        botCamp(run);
        expect(run.phase).toBe('fight');
      }
    }
    expect(omens.size).toBeGreaterThan(1);
  }, 60000);
});
