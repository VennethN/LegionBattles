import { describe, expect, it } from 'vitest';
import { botCamp, botLevel, botSteer } from '../src/game/bot';
import { ALLY_QUIRKS, BAND, COMPANIONS, ENEMIES, byId, levelNeeds } from '../src/game/data';
import { bandSize, choose, endWave, newRun, setupOf, type RunData } from '../src/game/run';
import { bandFor, featDone, freshSave, isFriend, record, repair, setBand } from '../src/game/state';
import { World, type Ally, type Ev, type Setup } from '../src/game/world';
import { alone, play, setup, stand, stats } from './field';

/** A wave with one companion beside a hero who carries nothing: whatever is hurt, the companion did it. */
const withOne = (id: string, o: Partial<Setup> = {}): [World, Ally] => {
  const w = alone(new World(setup({ band: [{ id, bond: 0 }], ...o })));
  return [w, w.band[0]];
};
const has = <T extends Ev['t']>(events: readonly Ev[], t: T): Extract<Ev, { t: T }>[] => events.filter((e): e is Extract<Ev, { t: T }> => e.t === t);

describe('the companions', () => {
  it('are eight, each with a name, what it is, what it does, a quirk and a deed that opens it', () => {
    expect(COMPANIONS.map((c) => c.id)).toEqual(['biscuit', 'pip', 'mossback', 'quill', 'greta', 'ember', 'tam', 'thistle']);
    expect(new Set(COMPANIONS.map((c) => c.quirk)).size).toBe(COMPANIONS.length);
    expect(new Set(COMPANIONS.map((c) => c.does)).size).toBe(COMPANIONS.length);
    for (const c of COMPANIONS) {
      for (const text of [c.name, c.kind, c.says, c.quirkName, c.quirkSays]) expect(text.length, c.id).toBeGreaterThan(2);
      if (c.unlock.kind === 'boss') expect(byId(ENEMIES, c.unlock.boss).ai).toBe('boss');
    }
    // Biscuit comes after the first run ends, however it went.
    expect(byId(COMPANIONS, 'biscuit').unlock).toEqual({ kind: 'runs', runs: 1 });
  });

  it('stand beside the hero as the wave begins, and walk at their heel when there is nobody to fight', () => {
    const [w, dog] = withOne('biscuit');
    expect(Math.hypot(dog.x - w.hero.x, dog.y - w.hero.y)).toBeLessThan(110);
    play(w, 3, { x: 1, y: 0 });
    // Near, and not on top of them.
    expect(Math.hypot(dog.x - w.hero.x, dog.y - w.hero.y)).toBeLessThan(110);
    expect(Math.hypot(dog.x - w.hero.x, dog.y - w.hero.y)).toBeGreaterThan(40);
    expect(w.hero.x).toBeGreaterThan(w.w / 2 + 300);
  });

  it('grow with the hero: their level, a share of their Damage and Haste, and each step of the bond', () => {
    const harm = (o: Partial<Setup>, bond = 0): number => {
      const w = new World(setup({ band: [{ id: 'greta', bond }], ...o }));
      return w.allyHarm(w.band[0]);
    };
    const bear = byId(COMPANIONS, 'greta');
    expect(harm({})).toBe(bear.dmg);
    expect(harm({ level: 10 })).toBe(Math.round(bear.dmg + bear.grow * 10));
    expect(harm({ stats: stats({ damage: 100 }) })).toBe(Math.round(bear.dmg * (1 + BAND.share)));
    expect(harm({}, 2)).toBe(Math.round(bear.dmg * (1 + BAND.bond * 2)));
    const w = new World(setup({ band: [{ id: 'greta', bond: 0 }], stats: stats({ haste: 100 }) }));
    expect(w.allyEvery(w.band[0])).toBeCloseTo(bear.every / (1 + BAND.share));
    const grown = new World(setup({ band: [{ id: 'greta', bond: 1 }], level: 10 }));
    expect(grown.band[0].maxHp).toBe(Math.round(bear.hp * (1 + BAND.hpGrow * 10) * (1 + BAND.bond)));
  });

  it('are hurt by what touches them, struck down, sit out, and get up again', () => {
    const [w, bear] = withOne('greta');
    const f = stand(w, 'bruiser', bear.x + 5, bear.y, { hp: 999999, dmg: 1000 });
    const events = play(w, 0.2);
    expect(has(events, 'allyHurt').length).toBe(1);
    expect(has(events, 'allyDown').length).toBe(1);
    expect(bear.down).toBeGreaterThan(BAND.down - 0.5);
    expect(bear.hp).toBe(0);
    // It does nothing while it is down, and nothing more lands on it.
    f.x = w.hero.x + 500;
    f.def = { ...f.def, speed: 0 };
    const at = [bear.x, bear.y];
    const sat = play(w, BAND.down - 0.5);
    expect([bear.x, bear.y]).toEqual(at);
    expect(has(sat, 'allyStrike').length).toBe(0);
    const up = play(w, 1);
    expect(has(up, 'allyUp').length).toBe(1);
    expect(bear.hp).toBe(Math.ceil(bear.maxHp * BAND.rises));
    // A companion takes only a share of a blow, and not twice in the same breath.
    const [v, dog] = withOne('biscuit');
    stand(v, 'cutpurse', dog.x + 4, dog.y, { hp: 999999, dmg: 4 }, true);
    stand(v, 'cutpurse', dog.x - 4, dog.y, { hp: 999999, dmg: 4 }, true);
    const hurt = has(play(v, BAND.grace * 0.9), 'allyHurt');
    expect(hurt.map((e) => e.amount)).toEqual([Math.round(4 * BAND.takes)]);
  });

  it('Biscuit runs down the nearest enemy and bites, and fetches coins that lie far off', () => {
    const [w, dog] = withOne('biscuit');
    const f = stand(w, 'bruiser', w.hero.x + 250, w.hero.y, { hp: 99999, dmg: 0 }, true);
    const events = play(w, 2.5);
    expect(has(events, 'allyStrike').length).toBeGreaterThan(1);
    expect(f.hp).toBeLessThan(99999);
    expect(Math.hypot(dog.x - f.x, dog.y - f.y)).toBeLessThan(60);
    // A coin out of the hero's reach is brought in.
    const [v, hound] = withOne('biscuit');
    v.picks.push({ id: 77, kind: 'coin', x: v.hero.x - 400, y: v.hero.y + 100, vx: 0, vy: 0, value: 3, pulled: false, age: 2 });
    const fetched = play(v, 4);
    expect(has(fetched, 'allyQuirk').map((e) => e.quirk)).toEqual(['fetch']);
    expect(v.gold).toBe(3);
    expect(hound.state).toBe('with');
    // Nobody fetches for a hero with no hound.
    const none = alone(new World(setup({})));
    none.picks.push({ id: 77, kind: 'coin', x: none.hero.x - 400, y: none.hero.y + 100, vx: 0, vy: 0, value: 3, pulled: false, age: 2 });
    play(none, 4);
    expect(none.gold).toBe(0);
  });

  it('Pip circles the hero, stings what comes close, cannot be hurt, and flashes when the hero is struck', () => {
    const [w, pip] = withOne('pip', { stats: stats({ maxHp: 9999 }) });
    expect(pip.maxHp).toBe(0);
    const f = stand(w, 'bruiser', w.hero.x + 110, w.hero.y, { hp: 99999, dmg: 0 }, true);
    const events = play(w, 3);
    expect(Math.hypot(pip.x - w.hero.x, pip.y - w.hero.y)).toBeLessThan(90);
    expect(f.hp).toBeLessThan(99999);
    expect(has(events, 'allyHurt').length).toBe(0);
    const near = stand(w, 'cutpurse', w.hero.x + 5, w.hero.y, { hp: 99999, dmg: 1 }, true);
    const other = stand(w, 'cutpurse', w.hero.x + 100, w.hero.y + 60, { hp: 99999, dmg: 1 }, true);
    const struck = play(w, 0.1);
    expect(has(struck, 'hurt').length).toBe(1);
    expect(has(struck, 'allyQuirk').map((e) => e.quirk)).toEqual(['flare']);
    expect(near.stun).toBeGreaterThan(1);
    expect(other.stun).toBeGreaterThan(1);
    // Not again for a while.
    play(w, 2);
    expect(pip.quirkCool).toBeGreaterThan(0);
  });

  it('Mossback draws those near him, and shots stop on his shell', () => {
    const [w, turtle] = withOne('mossback', { stats: stats({ maxHp: 9999 }) });
    turtle.x = w.hero.x + 200;
    turtle.y = w.hero.y;
    const near = stand(w, 'cutpurse', turtle.x + 100, turtle.y, { hp: 99999, dmg: 1 });
    const far = stand(w, 'cutpurse', w.hero.x - 300, w.hero.y, { hp: 99999, dmg: 1 });
    play(w, 0.5);
    // The one near him has come toward him, away from the hero; the other toward the hero.
    expect(near.x).toBeLessThan(turtle.x + 100);
    expect(near.x).toBeGreaterThan(turtle.x - 40);
    expect(far.x).toBeGreaterThan(w.hero.x - 300);
    // A shot at the hero that passes him stops there.
    const [v, shell] = withOne('mossback', { wave: 3, stats: stats({ maxHp: 9999 }) });
    // He stands between the hero and whoever is nearest to them: here, someone far off to the right.
    stand(v, 'bruiser', v.hero.x + 400, v.hero.y, { hp: 99999, dmg: 0 }, true);
    shell.x = v.hero.x + 110;
    shell.y = v.hero.y;
    v.shots.push({ id: 5, mine: false, x: v.hero.x + 260, y: v.hero.y - 12, vx: -220, vy: 0, r: 7, dmg: 6, crit: false, pierce: 0, leaps: 0, life: 3, art: 'orb-red', knock: 0, seen: [], from: null, tier: 0, mark: 0, lob: null, chills: 0, by: 'poacher', burns: 0 });
    const hp = shell.hp;
    const events = play(v, 1.2);
    expect(has(events, 'hurt').length).toBe(0);
    expect(shell.hp).toBe(hp - Math.max(1, Math.round(6 * ALLY_QUIRKS.bulwark.shell * 2 * BAND.takes)));
    expect(v.shots.length).toBe(0);
    // A captain is not drawn off.
    const [u, t2] = withOne('mossback', { stats: stats({ maxHp: 9999 }) });
    t2.x = u.hero.x + 200;
    const boss = stand(u, 'warlord', t2.x + 100, t2.y, { hp: 99999, dmg: 1, boss: true, cool: 99 });
    play(u, 0.5);
    expect(boss.x).toBeLessThan(t2.x + 100);
    expect(Math.hypot(boss.x - u.hero.x, boss.y - u.hero.y)).toBeLessThan(300);
  });

  it('Quill stoops on those who shoot before anyone else, and what she strikes is marked', () => {
    const [w, eagle] = withOne('quill', { wave: 3, stats: stats({ maxHp: 9999 }) });
    const walker = stand(w, 'bruiser', w.hero.x + 150, w.hero.y, { hp: 99999, dmg: 0 }, true);
    const shooter = stand(w, 'poacher', w.hero.x - 450, w.hero.y - 100, { hp: 99999, cool: 99 }, true);
    const events = play(w, 4);
    expect(has(events, 'allyStrike').length).toBeGreaterThan(0);
    expect(shooter.hp).toBeLessThan(99999);
    expect(walker.hp).toBe(99999);
    expect(shooter.marked).toBeGreaterThan(0);
    expect(eagle.maxHp).toBe(0);
    // The marked take more from everything.
    const before = shooter.hp;
    shooter.burn = 0.4;
    shooter.burnBy = 20;
    shooter.burnTick = 0;
    const burnt = has(play(w, 0.1), 'hit').find((e) => e.soft);
    expect(burnt?.amount).toBe(Math.round(10 * (1 + ALLY_QUIRKS.keen.more)));
    expect(shooter.hp).toBeLessThan(before);
  });

  it('Greta mauls everyone round her, and roars when the hero is under half health', () => {
    const [w, bear] = withOne('greta', { stats: stats({ maxHp: 100 }) });
    const foes = [-30, 0, 30].map((dy) => stand(w, 'bruiser', w.hero.x + 120, w.hero.y + dy, { hp: 99999, dmg: 0 }, true));
    const events = play(w, 2.5);
    expect(foes.filter((f) => f.hp < 99999).length).toBe(3);
    expect(has(events, 'allyQuirk').length).toBe(0);
    w.hero.hp = 40;
    for (const f of foes) f.stun = 0;
    const roared = play(w, 0.1);
    expect(has(roared, 'allyQuirk').map((e) => e.quirk)).toEqual(['roar']);
    expect(foes.some((f) => f.stun > 1)).toBe(true);
    expect(bear.quirkCool).toBeGreaterThan(10);
  });

  it('Ember spits fire that keeps burning, and leaves the ground burning where it runs', () => {
    const [w] = withOne('ember');
    const f = stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 99999, dmg: 0 }, true);
    const events = play(w, 3);
    expect(has(events, 'allyStrike').length).toBeGreaterThan(0);
    expect(f.burn).toBeGreaterThan(0);
    expect(events.some((e) => e.t === 'hit' && e.soft && e.id === f.id)).toBe(true);
    expect(w.zones.filter((z) => z.kind === 'fire').length).toBeGreaterThan(1);
    // The fire on the ground burns whoever stands in it.
    const z = w.zones.filter((x) => x.kind === 'fire').pop();
    w.band[0].down = 99;
    w.shots = [];
    const g = stand(w, 'bruiser', z?.x ?? 0, z?.y ?? 0, { hp: 99999, dmg: 0 }, true);
    play(w, 0.4);
    expect(g.hp).toBeLessThan(99999);
  });

  it('Tam stands by the hero, everyone near the banner strikes faster, and once in a run he gets a fallen hero up', () => {
    const plain = alone(new World(setup({ weapons: [{ id: 'sword', tier: 0 }] })));
    const [w, tam] = withOne('tam', { weapons: [{ id: 'sword', tier: 0 }], stats: stats({ maxHp: 20 }) });
    play(w, 0.2);
    expect(Math.hypot(tam.x - w.hero.x, tam.y - w.hero.y)).toBeLessThan(80);
    expect(w.everyOf(w.slots[0])).toBeCloseTo(plain.everyOf(plain.slots[0]) / (1 + ALLY_QUIRKS.rally.faster));
    w.slots[0].cool = 999;
    const f = stand(w, 'bruiser', w.hero.x + 8, w.hero.y, { hp: 999999, dmg: 500 }, true);
    const events = play(w, 0.1);
    expect(has(events, 'rescue').length).toBe(1);
    expect(w.over).toBeNull();
    expect(w.rescued).toBe(true);
    expect(w.hero.hp).toBe(Math.round(20 * ALLY_QUIRKS.rally.rises));
    f.x = w.hero.x + 8;
    f.kx = 0;
    play(w, ALLY_QUIRKS.rally.grace + 0.5);
    expect(w.over).toBe('dead');
    // Not if he has done it in this run already, and not while he is down himself.
    const [v] = withOne('tam', { stats: stats({ maxHp: 20 }), rescue: false });
    stand(v, 'bruiser', v.hero.x + 8, v.hero.y, { hp: 999999, dmg: 500 }, true);
    play(v, 0.1);
    expect(v.over).toBe('dead');
    const [u, down] = withOne('tam', { stats: stats({ maxHp: 20 }) });
    down.down = 5;
    stand(u, 'bruiser', u.hero.x + 8, u.hero.y, { hp: 999999, dmg: 500 }, true);
    play(u, 0.1);
    expect(u.over).toBe('dead');
  });

  it('Thistle charges through the thickest of them, and what he throws aside is stunned', () => {
    const [w, stag] = withOne('thistle');
    const crowd = [0, 1, 2, 3].map((i) => stand(w, 'bruiser', w.hero.x + 220 + (i % 2) * 36, w.hero.y - 20 + Math.floor(i / 2) * 40, { hp: 99999, dmg: 0 }, true));
    const lone = stand(w, 'bruiser', w.hero.x - 300, w.hero.y - 200, { hp: 99999, dmg: 0 }, true);
    const events = play(w, 1.6);
    expect(has(events, 'allyStrike').length).toBe(1);
    expect(crowd.filter((f) => f.hp < 99999).length).toBeGreaterThanOrEqual(2);
    expect(crowd.some((f) => f.stun > 0)).toBe(true);
    expect(lone.hp).toBe(99999);
    // He has been through them and out the other side.
    expect(has(events, 'allyDown').length).toBe(0);
    expect(stag.x).toBeGreaterThan(w.hero.x + 150);
    // Nothing lands on him in the middle of his charge.
    const [v, deer] = withOne('thistle');
    for (let i = 0; i < 4; i++) stand(v, 'bruiser', v.hero.x + 200 + i * 40, v.hero.y, { hp: 99999, dmg: 500 }, true);
    const all: Ev[] = [];
    for (let t = 0; t < 2 && deer.state !== 'dash'; t += 0.05) all.push(...play(v, 0.05));
    while (deer.state === 'dash') all.push(...play(v, 0.02));
    expect(has(all, 'allyHurt').length).toBe(0);
  });
});

describe('the band and the run', () => {
  it('a run takes the companions it is given, and a wave has them on the field', () => {
    const run = newRun('bram', 5, ['biscuit', 'nobody', 'biscuit', 'pip']);
    expect(run.band).toEqual([{ id: 'biscuit', bond: 0 }, { id: 'pip', bond: 0 }]);
    const w = new World(setupOf(run));
    expect(w.band.map((a) => a.def.id)).toEqual(['biscuit', 'pip']);
    expect(newRun('bram', 5).band).toEqual([]);
  });

  it('they are whole again at each camp', () => {
    const run = newRun('bram', 5, ['biscuit']);
    const w = new World(setupOf(run));
    w.band[0].hp = 1;
    w.over = 'cleared';
    endWave(run, w);
    const next = new World(setupOf(run));
    expect(next.band[0].hp).toBe(next.band[0].maxHp);
  });

  it('a level may offer a bond with a companion on the run, three steps each and no more', () => {
    const levels = (band: string[]): { bonds: number; run: RunData } => {
      const run = newRun('bram', 11, band);
      let bonds = 0;
      for (let i = 0; i < 60; i++) {
        const w = new World(setupOf(run));
        w.over = 'cleared';
        w.xp = levelNeeds(run.level);
        endWave(run, w);
        while (run.phase === 'level') {
          const at = run.choices.findIndex((c) => c.bond);
          if (at >= 0) {
            expect(run.choices.filter((c) => c.bond).length).toBe(1);
            expect(run.choices[at].bond).toBe('biscuit');
            expect(run.choices[at].tier).toBe(run.band[0].bond);
            const ups = run.ups.length;
            expect(choose(run, at)).toBe(true);
            // A bond is taken in place of a stat.
            expect(run.ups.length).toBe(ups);
            bonds++;
          } else choose(run, 0);
        }
        run.phase = 'fight';
      }
      return { bonds, run };
    };
    const withDog = levels(['biscuit']);
    expect(withDog.bonds).toBe(BAND.bonds);
    expect(withDog.run.band[0].bond).toBe(BAND.bonds);
    expect(levels([]).bonds).toBe(0);
    // The plain player takes them.
    const run = newRun('bram', 3, ['biscuit']);
    for (let i = 0; i < 40 && run.band[0].bond === 0; i++) {
      const w = new World(setupOf(run));
      w.over = 'cleared';
      w.xp = levelNeeds(run.level);
      endWave(run, w);
      botLevel(run);
      run.phase = 'fight';
    }
    expect(run.band[0].bond).toBeGreaterThan(0);
  });

  it('the save keeps who is open, who goes, and how many places there are', () => {
    const save = freshSave();
    expect(save.places).toBe(1);
    expect(save.band).toEqual([]);
    expect(save.auto).toBe(true);
    expect(isFriend(save, 'biscuit')).toBe(false);
    expect(setBand(save, 0, 'biscuit')).toBe(false);
    // The first run ends: Biscuit is opened, and comes along next time without being asked.
    const run = newRun('bram', 1);
    run.phase = 'over';
    expect(record(save, run, 0).friends).toEqual(['biscuit']);
    expect(save.ended).toBe(1);
    expect(featDone(save, { kind: 'runs', runs: 1 })).toBe(true);
    expect(bandFor(save, 'bram')).toEqual(['biscuit']);
    // One place: a second companion opened waits for the player to choose.
    save.friends.push('pip');
    expect(bandFor(save, 'bram')).toEqual(['biscuit']);
    expect(setBand(save, 0, 'pip')).toBe(true);
    expect(bandFor(save, 'bram')).toEqual(['pip']);
    expect(setBand(save, 1, 'biscuit')).toBe(true);
    expect(save.band).toEqual(['pip', 'biscuit']);
    // Aldous brings one more than there are places; a second place takes two for anyone.
    expect(bandFor(save, 'bram')).toEqual(['pip']);
    expect(bandFor(save, 'aldous')).toEqual(['pip', 'biscuit']);
    save.places = 2;
    expect(bandFor(save, 'bram')).toEqual(['pip', 'biscuit']);
    expect(bandSize('aldous', 2)).toBe(3);
    // One already in the band changes places, and a place can be emptied.
    expect(setBand(save, 0, 'biscuit')).toBe(true);
    expect(save.band).toEqual(['biscuit', 'pip']);
    expect(setBand(save, 0, '')).toBe(true);
    expect(save.band).toEqual(['pip']);
    expect(repair(JSON.parse(JSON.stringify(save))).band).toEqual(['pip']);
  });

  it('a run with a companion is kept in its camp and carried on as it was', () => {
    const run = newRun('aldous', 5, ['biscuit', 'pip']);
    const w = new World(setupOf(run));
    w.over = 'cleared';
    w.gold = 50;
    endWave(run, w);
    const save = freshSave();
    save.run = run;
    expect(repair(JSON.parse(JSON.stringify(save))).run).toEqual(run);
  });

  it('the plain player gets every companion through the first waves, and they do something there', () => {
    for (const c of COMPANIONS) {
      const run = newRun('bram', 31, [c.id]);
      let struck = 0;
      for (let wave = 0; wave < 3; wave++) {
        const w = new World(setupOf(run));
        for (let i = 0; i < 60 * 70 && !w.over; i++) {
          w.step(botSteer(w));
          for (const e of w.drain()) if (e.t === 'allyStrike' || e.t === 'allyQuirk') struck++;
        }
        expect(w.over, c.id).toBe('cleared');
        endWave(run, w);
        botCamp(run);
      }
      // Tam is there for his banner, not his spear.
      if (c.id !== 'tam') expect(struck, c.id).toBeGreaterThan(3);
    }
  });
});
