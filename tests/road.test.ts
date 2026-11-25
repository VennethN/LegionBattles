import { describe, expect, it } from 'vitest';
import { botCamp, botSteer } from '../src/game/bot';
import { COMPANIONS, ENEMIES, OMENS, ROAD, byId, enemyAt, omenOf, waveOf, type Omen } from '../src/game/data';
import { choose, endWave, forksOf, march, newRun, setupOf, takeRelic, takeRoad, tollOf, type RunData } from '../src/game/run';
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
    // Twelve that are offered, and the road with no omen, which is the first wave's and a captain's and is never offered.
    const offered = OMENS.filter((o) => o.weight > 0);
    expect(offered.length).toBe(12);
    expect(OMENS.filter((o) => o.weight <= 0).map((o) => o.id)).toEqual(['quiet']);
    for (const o of OMENS) for (const text of [o.name, o.says, o.prize]) expect(text.length, o.id).toBeGreaterThan(3);
    // Six come anywhere, and each land has two that are only its own.
    expect(offered.filter((o) => !o.land).length).toBe(6);
    for (const land of ['meadow', 'desert', 'snow']) expect(offered.filter((o) => o.land === land).length, land).toBe(2);
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
    // Over many camps every omen that may lead to the sixth wave is offered: those of anywhere and Thornwood's own, but
    // not a forced march, which would leave no camp before the captain, nor the toll road, to one with an empty purse.
    expect([...seen].sort()).toEqual(OMENS.filter((o) => o.weight > 0 && o.from <= 6 && (!o.land || o.land === 'meadow') && o.id !== 'forced' && o.id !== 'toll').map((o) => o.id).sort());
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

  it('the horde: half as many again, none the weaker, and half as much experience again', () => {
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

  it('champions and the long night leave a relic to choose, one of three', () => {
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

  it('the shrine: standing in its ring for long enough in all blesses the hero, and the blessing is a choice as for a level', () => {
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

  it('the stray: the cage holds someone who is not on the run, and a run takes in no more than one', () => {
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
    const full = camp(6, { band: [{ id: 'biscuit', bond: 0 }, ...['pip', 'quill', 'greta'].slice(0, ROAD.stray.most).map((id) => ({ id, bond: 0, stray: true }))] });
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
  it('offers each land its own: the cage and the shrine in Thornwood, the caravan and the fire in the dunes, the night and the blizzard in Frostholt', () => {
    const offered = (wave: number): Set<string> => {
      const run = camp(wave, { gold: 200 });
      const seen = new Set<string>();
      for (let i = 0; i < 60; i++) {
        run.phase = 'camp';
        march(run);
        for (const r of run.roads) seen.add(r.omen);
      }
      return seen;
    };
    const own = (land: string): string[] => OMENS.filter((o) => o.land === land).map((o) => o.id).sort();
    expect(own('meadow')).toEqual(['shrine', 'stray']);
    expect(own('desert')).toEqual(['burning', 'wagon']);
    expect(own('snow')).toEqual(['blizzard', 'night']);
    const at = { meadow: offered(5), desert: offered(10), snow: offered(17) };
    for (const [land, seen] of Object.entries(at)) {
      for (const id of own(land)) expect(seen.has(id), `${id} in ${land}`).toBe(true);
      for (const o of OMENS) if (o.land && o.land !== land) expect(seen.has(o.id), `${o.id} in ${land}`).toBe(false);
      // And those of anywhere come there too.
      for (const id of ['horde', 'champions', 'toll', 'duel', 'wounded', 'forced']) expect(seen.has(id), `${id} in ${land}`).toBe(true);
    }
  });

  it('no road is free: the horde is none the weaker, the shrine hurries them on, the cage has its jailer and the wagon a stout guard', () => {
    expect(ROAD.horde.hp).toBe(1);
    // While the hero stands in the shrine's ring the bands come faster.
    const bands = (inRing: boolean): number => {
      const w = on('shrine', { wave: 2 });
      const sh = w.shrine;
      if (!sh) throw new Error('no shrine');
      if (inRing) {
        w.hero.x = sh.x;
        w.hero.y = sh.y;
      }
      return has(play(w, 9), 'mark').length;
    };
    expect(bands(true)).toBeGreaterThan(bands(false) * 1.3);
    // A champion stands by the cage.
    const cage = alone(on('stray', { wave: 2, stray: 'biscuit' }));
    // Looked at as it stands: it goes for the hero from there.
    const came = play(cage, 2.75);
    expect(has(came, 'champion').map((e) => e.trait)).toEqual(['armored']);
    const box = cage.foes.find((f) => f.def.prop === 'cage');
    const jailer = cage.foes.find((f) => f.champion);
    expect(box && jailer && Math.hypot(box.x - jailer.x, box.y - jailer.y)).toBeLessThan(120);
    // The wagon's guard: six of them, each with more health than the sturdiest of the wave has.
    const wagon = alone(on('wagon', { wave: 9 }));
    play(wagon, ROAD.wagon.at * wagon.wave.seconds + 2.5);
    const guards = wagon.foes.filter((f) => !f.def.prop);
    expect(guards.length).toBe(ROAD.wagon.guards);
    const plain = Math.max(...wagon.wave.mix.map(([id]) => enemyAt(byId(ENEMIES, id), 9).hp));
    for (const g of guards) expect(g.maxHp).toBeGreaterThan(plain);
  });

  it('forced march: a relic, no camp after it, and the next wave finds the hero as this one left them', () => {
    // Never before a captain.
    const before = camp(6, { gold: 200 });
    for (let i = 0; i < 60; i++) {
      before.phase = 'camp';
      march(before);
      expect(before.roads.some((r) => r.omen === 'forced')).toBe(false);
    }
    const run = camp(4, { phase: 'fight', road: { omen: 'forced' }, gold: 50 });
    const w = cleared(run);
    w.hero.hp = Math.round(w.hero.maxHp * 0.4);
    endWave(run, w);
    expect(run.phase).toBe('relic');
    takeRelic(run, 0);
    // Whatever else was owed is chosen; then it is the road and not the camp.
    while ((run.phase as string) === 'level') choose(run, 0);
    expect(run.phase).toBe('road');
    expect(run.gold).toBe(50);
    takeRoad(run, 0);
    const setup5 = setupOf(run);
    expect(setup5.hurt).toBeCloseTo(0.4, 1);
    expect(new World(setup5).hero.hp).toBe(Math.round(setup5.stats.maxHp * (setup5.hurt ?? 1)));
    // It is paid for once.
    expect(setupOf(run).hurt).toBe(1);
    // One who came out of it nearly dead is given a little.
    const dying = camp(4, { phase: 'fight', road: { omen: 'forced' } });
    const v = cleared(dying);
    v.hero.hp = 1;
    endWave(dying, v);
    expect(dying.hurt).toBe(ROAD.forced.least);
  });

  it('toll road: the keepers take a fifth of the purse, and the wave is a third shorter', () => {
    const run = camp(5, { phase: 'road', gold: 100, roads: [{ omen: 'toll' }, { omen: 'horde' }] });
    expect(tollOf(run)).toBe(20);
    takeRoad(run, 0);
    expect(run.gold).toBe(80);
    const w = new World(setupOf(run));
    expect(w.wave.seconds).toBe(Math.round(waveOf(5).seconds * ROAD.toll.seconds));
    // Another road costs no coins.
    const other = camp(5, { phase: 'road', gold: 100, roads: [{ omen: 'toll' }, { omen: 'horde' }] });
    takeRoad(other, 1);
    expect(other.gold).toBe(100);
    // An empty purse is not worth their while.
    const poor = camp(5, { gold: ROAD.toll.least - 1 });
    for (let i = 0; i < 60; i++) {
      poor.phase = 'camp';
      march(poor);
      expect(poor.roads.some((r) => r.omen === 'toll')).toBe(false);
    }
  });

  it('the duel: one great champion and nobody else; felled, the wave is over at once and it leaves a relic', () => {
    const w = on('duel', { wave: 6 });
    const came = play(w, ROAD.duel.at + 2.5);
    expect(has(came, 'duel').map((e) => e.how)).toEqual(['on']);
    expect(w.foes.length).toBe(1);
    const duelist = w.foes[0];
    expect(duelist.champion).toBe('burning');
    const sturdiest = Math.max(...waveOf(6).mix.map(([id]) => byId(ENEMIES, id)).filter((d) => d.ai === 'walk' || d.ai === 'charge').map((d) => enemyAt(d, 6).hp));
    expect(duelist.maxHp).toBeGreaterThan(sturdiest * ROAD.duel.hp * 0.9);
    // Nobody else comes, however long it lasts.
    play(w, 8);
    expect(w.foes.length).toBe(1);
    expect(w.marks.length).toBe(0);
    duelist.hp = 1;
    duelist.burn = 1;
    duelist.burnBy = 4;
    const end = play(w, 3);
    expect(has(end, 'duel').map((e) => e.how)).toEqual(['won']);
    expect(w.dueled).toBe(true);
    expect(w.over).toBe('cleared');
    expect(w.time).toBeLessThan(w.wave.seconds);
    const run = camp(6, { phase: 'fight', road: { omen: 'duel' } });
    endWave(run, cleared(run, { dueled: true }));
    expect(run.phase).toBe('relic');
    // One who only outlasted it has nothing for it.
    const ran = camp(6, { phase: 'fight', road: { omen: 'duel' } });
    endWave(ran, cleared(ran));
    expect(ran.relicsDue).toBe(0);
  });

  it('the wounded: the hero begins hurt, and coming through pays a choice of the best kind', () => {
    const w = on('wounded', { stats: stats({ maxHp: 40 }) });
    expect(w.hero.hp).toBe(Math.round(40 * ROAD.wounded.hp));
    expect(ROAD.wounded.hp).toBeLessThanOrEqual(0.5);
    expect(w.hero.maxHp).toBe(40);
    const run = camp(5, { phase: 'fight', road: { omen: 'wounded' } });
    endWave(run, cleared(run));
    expect(run.phase).toBe('level');
    expect(run.bests).toBe(1);
    expect(run.choices.length).toBeGreaterThan(2);
    for (const c of run.choices) expect(c.tier).toBe(3);
    choose(run, 0);
    expect(run.bests).toBe(0);
  });

  it('burning field: lanes of fire are shown and then burn; a hero in one is burnt, an enemy in one is set alight, and every coin counts double', () => {
    const w = alone(on('burning', { wave: 9, stats: stats({ maxHp: 9999 }) }));
    const shown = has(play(w, ROAD.burning.first + 0.1), 'peril');
    expect(shown.length).toBe(1);
    const lane = shown[0];
    expect(lane.seconds).toBeCloseTo(ROAD.burning.warn);
    // It goes through where the hero stands, the whole way across the field or down it.
    expect(Math.abs(lane.x - w.hero.x) < 40 || Math.abs(lane.y - w.hero.y) < 40).toBe(true);
    expect(Math.max(lane.w, lane.h)).toBeGreaterThan(900);
    const inIt = stand(w, 'scarab', w.hero.x + (lane.w > lane.h ? 200 : 0), w.hero.y + (lane.w > lane.h ? 0 : 200), { hp: 99999, dmg: 0 }, true);
    const outOfIt = stand(w, 'scarab', w.hero.x + (lane.w > lane.h ? 0 : 300), w.hero.y + (lane.w > lane.h ? 300 : 0), { hp: 99999, dmg: 0 }, true);
    // Nothing happens until it has been shown for long enough.
    expect(has(play(w, ROAD.burning.warn - 0.3), 'hurt').length).toBe(0);
    const lit = play(w, 0.6);
    expect(has(lit, 'hurt').length).toBeGreaterThan(0);
    expect(w.hurtBy.fire).toBeGreaterThan(0);
    expect(inIt.burn).toBeGreaterThan(0);
    expect(outOfIt.burn).toBe(0);
    // A hero who steps out of the lane in time is not touched.
    const away = alone(on('burning', { wave: 9, stats: stats({ maxHp: 9999 }) }));
    const first = has(play(away, ROAD.burning.first + 0.1), 'peril')[0];
    const steer = first.w > first.h ? { x: 0, y: 1 } : { x: 1, y: 0 };
    expect(has(play(away, ROAD.burning.warn + ROAD.burning.burns, steer), 'hurt').length).toBe(0);
    // Every coin counts double.
    const rich = alone(on('burning', { wave: 9 }));
    rich.picks.push({ id: 1, kind: 'coin', x: rich.hero.x + 20, y: rich.hero.y, vx: 0, vy: 0, value: 3, pulled: false, age: 1 });
    play(rich, 0.5);
    expect(rich.coins).toBe(3 * ROAD.burning.coins);
  });

  it('blizzard: the cold slows the hero and what they loose chills; the spoils are a tier for the plainest weapon, or a pack', () => {
    const far = (omen: Omen): number => {
      const w = alone(on(omen, { wave: 16 }));
      const x0 = w.hero.x;
      play(w, 1, { x: 1, y: 0 });
      return w.hero.x - x0;
    };
    expect(far('blizzard')).toBeCloseTo(far('quiet') * (1 - ROAD.blizzard.slow), 0);
    const w = alone(on('blizzard', { wave: 16 }));
    stand(w, 'harpooner', w.hero.x + 200, w.hero.y, { hp: 99999, cool: 0 }, true);
    play(w, 1);
    expect(w.shots.filter((sh) => !sh.mine).every((sh) => sh.chills === ROAD.blizzard.chills)).toBe(true);
    expect(w.shots.some((sh) => !sh.mine)).toBe(true);
    const run = camp(16, { phase: 'fight', road: { omen: 'blizzard' }, weapons: [{ id: 'bow', tier: 2 }, { id: 'sword', tier: 0 }, { id: 'spear', tier: 3 }] });
    endWave(run, cleared(run));
    expect(run.weapons.map((x) => x.tier)).toEqual([2, 1, 3]);
    expect(run.packs).toBe(0);
    const bare = camp(16, { phase: 'fight', road: { omen: 'blizzard' } });
    endWave(bare, cleared(bare));
    expect(bare.packs).toBe(1);
  });

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
