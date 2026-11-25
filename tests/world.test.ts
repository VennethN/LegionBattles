import { describe, expect, it } from 'vitest';
import { botSteer } from '../src/game/bot';
import { ENEMIES, HERO_RADIUS, HEROES, HURT_GRACE, ITEMS, LAST_WAVE, MARK_CLEAR, MARK_SECONDS, UPGRADES, WEAPONS, byId, coinShare, enemyAt, landAt, levelNeeds, tierWeights, waveOf } from '../src/game/data';
import { newRun, setupOf, statsOf } from '../src/game/run';
import { STATS, armorShare, hasteRate, noStats, sumStats, type Stats } from '../src/game/stats';
import { STEP, World, slotPlace, type Ev, type Foe, type Setup } from '../src/game/world';

const stats = (line: Partial<Stats> = {}): Stats => ({ ...noStats(), maxHp: 30, ...line });
const setup = (o: Partial<Setup> = {}): Setup => ({ seed: 7, wave: 1, stats: stats(), weapons: [{ id: 'sword', tier: 0 }], ...o });

/** Steps a wave with the hero standing still, for some seconds, and gives back everything that happened. */
function play(w: World, seconds: number, steer = { x: 0, y: 0 }): Ev[] {
  const all: Ev[] = [];
  for (let t = 0; t < seconds && !w.over; t += STEP) {
    w.step(steer);
    all.push(...w.drain());
  }
  return all;
}

/** Stands a foe where it is wanted, as the wave would. */
function stand(w: World, id: string, x: number, y: number, o: Partial<Foe> = {}): Foe {
  const def = byId(ENEMIES, id);
  const at = enemyAt(def, w.wave.n);
  const f: Foe = {
    id: 9000 + w.foes.length, def, x, y, kx: 0, ky: 0, hp: at.hp, maxHp: at.hp, dmg: at.dmg, face: 1, state: 'walk', left: 0, cool: 99, dx: 0, dy: 0, doing: '', turn: 0,
    slow: 0, slowBy: 0, stun: 0, burn: 0, burnBy: 0, burnTick: 0, frozen: 0, numb: 0, marked: 0, markedBy: 0, flee: 0, moving: false, spurred: false, boss: false, dead: false, ...o,
  };
  w.foes.push(f);
  return f;
}

describe('the data', () => {
  it('names only things there are', () => {
    for (const h of HEROES) {
      if (h.unlock?.kind === 'boss') expect(byId(ENEMIES, h.unlock.boss).ai).toBe('boss');
    }
    for (let n = 1; n <= LAST_WAVE * 2 + 3; n++) {
      const wave = waveOf(n);
      expect(wave.mix.length, `wave ${n}`).toBeGreaterThan(0);
      for (const [id] of wave.mix) expect(byId(ENEMIES, id).ai, `wave ${n}`).not.toBe('boss');
      if (wave.boss) expect(byId(ENEMIES, wave.boss).ai).toBe('boss');
    }
    for (const e of ENEMIES) if (e.calls) expect(byId(ENEMIES, e.calls).ai).toBe('walk');
    expect(new Set(HEROES.map((h) => h.id)).size).toBe(HEROES.length);
    expect(new Set(WEAPONS.map((w) => w.id)).size).toBe(WEAPONS.length);
    expect(new Set(ITEMS.map((w) => w.id)).size).toBe(ITEMS.length);
    expect(new Set(UPGRADES.map((u) => u.stat)).size).toBe(UPGRADES.length);
  });

  it('starts with two heroes open and gives each of the rest a feat', () => {
    expect(HEROES.filter((h) => h.unlock === null).map((h) => h.id)).toEqual(['bram', 'wren']);
  });

  it('makes every weapon better at every tier, and every enemy harder every wave', () => {
    for (const w of WEAPONS) {
      for (let t = 1; t < 4; t++) {
        expect(w.dmg[t], w.id).toBeGreaterThan(w.dmg[t - 1]);
        expect(w.every[t], w.id).toBeLessThan(w.every[t - 1]);
      }
    }
    for (const e of ENEMIES) {
      for (let n = 2; n <= 45; n++) {
        expect(enemyAt(e, n).hp, `${e.id} ${n}`).toBeGreaterThanOrEqual(enemyAt(e, n - 1).hp);
        expect(enemyAt(e, n).dmg, `${e.id} ${n}`).toBeGreaterThanOrEqual(enemyAt(e, n - 1).dmg);
      }
    }
    expect(enemyAt(byId(ENEMIES, 'huscarl'), 40).hp).toBeGreaterThan(enemyAt(byId(ENEMIES, 'huscarl'), 20).hp * 10);
  });

  it('has waves that lengthen to a minute, a boss on three of twenty, and the same twenty again after', () => {
    expect(waveOf(1).seconds).toBe(20);
    expect(waveOf(12).seconds).toBe(60);
    expect([7, 14, 20].map((n) => waveOf(n).boss)).toEqual(['warlord', 'colossus', 'jarl']);
    expect(Array.from({ length: 20 }, (_, i) => waveOf(i + 1).boss).filter(Boolean).length).toBe(3);
    expect(waveOf(27).boss).toBe('warlord');
    expect(waveOf(21).land).toBe('meadow');
    expect(waveOf(21).band).toBeGreaterThan(waveOf(1).band);
    // The lands are counted on past the written waves: what happens once in a land asks.
    expect([1, 7, 8, 14, 15, 20, 21, 28].map(landAt)).toEqual([0, 0, 1, 1, 2, 2, 3, 4]);
  });

  it('asks more for each level, opens better tiers later, and thins the coins', () => {
    for (let l = 1; l < 40; l++) expect(levelNeeds(l)).toBeGreaterThan(levelNeeds(l - 1));
    expect(tierWeights(1, 0).slice(1)).toEqual([0, 0, 0]);
    expect(tierWeights(12, 0)[3]).toBeGreaterThan(0);
    expect(tierWeights(12, 50)[2]).toBeGreaterThan(tierWeights(12, 0)[2]);
    expect(coinShare(1)).toBe(1);
    expect(coinShare(20)).toBeLessThan(0.3);
  });
});

describe('stats', () => {
  it('add up line by line', () => {
    const s = sumStats([{ maxHp: 20, armor: 1 }, { armor: 2, speed: -5 }, undefined]);
    expect(s.maxHp).toBe(20);
    expect(s.armor).toBe(3);
    expect(s.speed).toBe(-5);
    for (const k of STATS) expect(typeof s[k]).toBe('number');
  });

  it('armor takes a share that never reaches all, and haste never stops a weapon', () => {
    expect(armorShare(0)).toBe(1);
    expect(armorShare(15)).toBe(0.5);
    expect(armorShare(1000)).toBeGreaterThan(0);
    expect(armorShare(-15)).toBe(2);
    expect(hasteRate(100)).toBe(2);
    expect(hasteRate(-500)).toBe(0.25);
  });
});

describe('a wave', () => {
  it('is the same wave for the same seed and the same steering, and another for another seed', () => {
    const run = (seed: number): string => {
      const w = new World(setup({ seed, wave: 4 }));
      for (let i = 0; i < 60 * 30 && !w.over; i++) w.step(botSteer(w));
      return JSON.stringify([w.time.toFixed(3), w.hero, w.gold, w.kills, w.foes.map((f) => [f.id, Math.round(f.x), Math.round(f.y), f.hp])]);
    };
    expect(run(11)).toBe(run(11));
    expect(run(11)).not.toBe(run(12));
  });

  it('marks the ground before anyone stands on it, and never right beside the hero', () => {
    const w = new World(setup());
    const marked = new Map<number, number>();
    for (let t = 0; t < 6; t += STEP) {
      w.step({ x: 0, y: 0 });
      for (const e of w.drain()) {
        if (e.t === 'mark') {
          marked.set(e.id, w.time);
          expect(Math.hypot(e.x - w.hero.x, e.y - w.hero.y)).toBeGreaterThanOrEqual(MARK_CLEAR - 1);
        }
        if (e.t === 'stand') expect(w.time - (marked.get(e.id) ?? 99)).toBeGreaterThanOrEqual(MARK_SECONDS - STEP * 2);
      }
    }
    expect(marked.size).toBeGreaterThan(3);
  });

  it('ends cleared when its time is up: whoever is left leaves, and every coin on the ground comes in', () => {
    const w = new World(setup({ stats: stats({ maxHp: 9999 }) }));
    const events = play(w, 40);
    expect(w.over).toBe('cleared');
    expect(w.time).toBeGreaterThanOrEqual(20);
    expect(w.time).toBeLessThan(22);
    expect(w.foes).toEqual([]);
    expect(w.picks).toEqual([]);
    expect(events.filter((e) => e.t === 'gather').length).toBe(1);
    expect(events[events.length - 1]).toEqual({ t: 'end', cleared: true });
    expect(w.kills).toBeGreaterThan(0);
    expect(w.xp).toBeGreaterThan(0);
    // After it is over, nothing more happens.
    const frozen = w.time;
    w.step({ x: 1, y: 0 });
    expect(w.time).toBe(frozen);
  });

  it('ends when the hero falls, and says who did it', () => {
    const w = new World(setup({ stats: stats({ maxHp: 2 }), weapons: [{ id: 'bow', tier: 0 }] }));
    stand(w, 'bruiser', w.hero.x + 10, w.hero.y);
    const events = play(w, 5);
    expect(w.over).toBe('dead');
    expect(w.hero.hp).toBe(0);
    expect(w.lastBy).toBe('bruiser');
    expect(events[events.length - 1]).toEqual({ t: 'end', cleared: false });
  });

  it('a boss wave ends when its boss falls, and the boss leaves a pack', () => {
    const w = new World(setup({ wave: 7, stats: stats({ maxHp: 99999, might: 5000 }) }));
    play(w, 30);
    expect(w.over).toBe('cleared');
    expect(w.felled).toEqual(['warlord']);
    expect(w.packs).toBeGreaterThanOrEqual(1);
    expect(w.time).toBeLessThan(20);
  });
});

describe('the hero', () => {
  it('runs where steered at their speed, no faster on a slant, and stays on the field', () => {
    const w = new World(setup({ stats: stats({ speed: 0 }) }));
    const x0 = w.hero.x;
    for (let i = 0; i < 60; i++) w.step({ x: 1, y: 0 });
    const straight = w.hero.x - x0;
    expect(straight).toBeGreaterThan(195);
    expect(straight).toBeLessThan(215);
    const v = new World(setup({ stats: stats({ speed: 0 }) }));
    for (let i = 0; i < 60; i++) v.step({ x: 5, y: 5 });
    expect(Math.hypot(v.hero.x - x0, v.hero.y - v.h / 2)).toBeCloseTo(straight, 0);
    for (let i = 0; i < 60 * 20; i++) v.step({ x: 1, y: 1 });
    expect(v.hero.x).toBeLessThan(v.w);
    expect(v.hero.y).toBeLessThan(v.h);
    expect(new World(setup({ tall: true })).h).toBeGreaterThan(new World(setup({ tall: true })).w);
  });

  it('cannot be hurt twice in the same breath', () => {
    const w = new World(setup({ stats: stats({ maxHp: 100 }), weapons: [{ id: 'bow', tier: 0 }] }));
    w.slots[0].cool = 99;
    stand(w, 'bruiser', w.hero.x + 8, w.hero.y, { hp: 9999 });
    stand(w, 'bruiser', w.hero.x - 8, w.hero.y, { hp: 9999 });
    const hurts = play(w, 0.3).filter((e) => e.t === 'hurt');
    expect(hurts.length).toBe(1);
    expect(play(w, HURT_GRACE).filter((e) => e.t === 'hurt').length).toBe(1);
  });

  it('armor takes its share, and a blow always does at least one', () => {
    const taken = (o: Partial<Setup>): number => {
      const w = new World(setup({ weapons: [{ id: 'bow', tier: 0 }], ...o }));
      w.slots[0].cool = 99;
      stand(w, 'bruiser', w.hero.x + 8, w.hero.y, { hp: 9999, dmg: 10 });
      const e = play(w, 0.2).find((x) => x.t === 'hurt');
      return e && e.t === 'hurt' ? e.amount : 0;
    };
    expect(taken({})).toBe(10);
    expect(taken({ stats: stats({ armor: 15 }) })).toBe(5);
    expect(taken({ stats: stats({ armor: 100000 }) })).toBe(1);
  });

  it('dodges no more than the cap lets them', () => {
    const w = new World(setup({ stats: stats({ maxHp: 100000, dodge: 500 }), weapons: [{ id: 'bow', tier: 0 }] }));
    w.slots[0].cool = 999;
    stand(w, 'bruiser', w.hero.x + 8, w.hero.y, { hp: 99999 });
    const events = play(w, 19);
    const hurt = events.filter((e) => e.t === 'hurt').length;
    const dodged = events.filter((e) => e.t === 'dodge').length;
    expect(hurt).toBeGreaterThan(3);
    expect(dodged).toBeGreaterThan(hurt);
  });

  it('mends by itself at the rate of its Mending', () => {
    const w = new World(setup({ stats: stats({ maxHp: 50, regen: 10 }) }));
    w.hero.hp = 10;
    // Two seconds: before anyone has had time to reach them.
    const mends = play(w, 2.05).filter((e) => e.t === 'mend').length;
    expect(mends).toBe(2);
    expect(w.hero.hp).toBe(12);
  });
});

describe('weapons', () => {
  it('strike only what is in reach, and reach further with Reach', () => {
    const far = (line: Partial<Stats>): number => {
      const w = new World(setup({ weapons: [{ id: 'bow', tier: 0 }], stats: stats(line) }));
      return w.rangeOf(byId(WEAPONS, 'bow'));
    };
    expect(far({ reach: 50 })).toBe(far({}) + 50);
    const w = new World(setup({ weapons: [{ id: 'sword', tier: 0 }] }));
    const f = stand(w, 'bruiser', w.hero.x + 400, w.hero.y, { hp: 999 });
    f.def = { ...f.def, speed: 0 };
    expect(play(w, 0.3).some((e) => e.t === 'strike' || e.t === 'hit')).toBe(false);
    f.x = w.hero.x + 80;
    expect(play(w, 0.6).some((e) => e.t === 'hit')).toBe(true);
  });

  it('a spear goes through three in a line, and the lance that is a hero\'s own through everyone', () => {
    const hits = (id: string): number => {
      const w = new World(setup({ weapons: [], own: { id, tier: 0 }, stats: stats({ maxHp: 9999 }) }));
      for (let i = 0; i < 5; i++) {
        const f = stand(w, 'bruiser', w.hero.x + 60 + i * 20, w.hero.y, { hp: 9999 });
        f.def = { ...f.def, speed: 0 };
      }
      return play(w, 0.4).filter((e) => e.t === 'hit').length;
    };
    expect(hits('spear')).toBe(3);
    expect(hits('ninth')).toBeGreaterThan(3);
  });

  it('a sweep hits who is in front and not who is behind', () => {
    const w = new World(setup({ weapons: [{ id: 'sword', tier: 0 }], stats: stats({ maxHp: 9999 }) }));
    const front = stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 9999 });
    const back = stand(w, 'bruiser', w.hero.x - 75, w.hero.y, { hp: 9999 });
    front.def = { ...front.def, speed: 0 };
    back.def = { ...back.def, speed: 0 };
    play(w, 0.4);
    expect(front.hp).toBeLessThan(9999);
    expect(back.hp).toBe(9999);
  });

  it('strike more often with Haste', () => {
    const every = (haste: number, id: string): number => {
      const w = new World(setup({ stats: stats({ haste }), weapons: [{ id, tier: 0 }] }));
      return w.everyOf(w.slots[0]);
    };
    expect(every(100, 'sword')).toBeCloseTo(every(0, 'sword') / 2);
  });

  it('an arrow stops at the first it hits, and a bolt goes on through three', () => {
    const hits = (id: string): number => {
      const w = new World(setup({ weapons: [{ id, tier: 0 }], stats: stats({ maxHp: 9999 }) }));
      for (let i = 0; i < 6; i++) {
        const f = stand(w, 'bruiser', w.hero.x + 120 + i * 30, w.hero.y - 30, { hp: 99999 });
        f.def = { ...f.def, speed: 0 };
      }
      return play(w, 1).filter((e) => e.t === 'hit').length;
    };
    expect(hits('bow')).toBe(1);
    expect(hits('crossbow')).toBe(3);
  });

  it('fire burns on after the blow', () => {
    const burnt = (): number => {
      const w = new World(setup({ weapons: [{ id: 'torch', tier: 0 }], stats: stats({ maxHp: 9999 }) }));
      const f = stand(w, 'bruiser', w.hero.x + 50, w.hero.y, { hp: 99999 });
      f.def = { ...f.def, speed: 0 };
      play(w, 0.5);
      w.slots[0].cool = 999;
      return play(w, 9).filter((e) => e.t === 'hit' && e.soft).length;
    };
    expect(burnt()).toBeGreaterThanOrEqual(5);
  });

  it('a hammer stuns where it lands, and cold slows', () => {
    const w = new World(setup({ weapons: [{ id: 'hammer', tier: 0 }], stats: stats({ maxHp: 9999 }) }));
    const f = stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 9999 });
    play(w, 0.4);
    expect(f.stun).toBeGreaterThan(0);
    const cold = (): number => {
      const v = new World(setup({ weapons: [{ id: 'frost', tier: 0 }], stats: stats({ maxHp: 9999 }) }));
      const g = stand(v, 'bruiser', v.hero.x + 100, v.hero.y, { hp: 9999 });
      g.def = { ...g.def, speed: 0 };
      play(v, 0.8);
      expect(g.slow).toBeGreaterThan(0);
      return 9999 - g.hp;
    };
    expect(cold()).toBeGreaterThan(0);
  });

  it('float round the hero each in a place of its own', () => {
    for (let n = 1; n <= 6; n++) {
      const places = Array.from({ length: n }, (_, i) => slotPlace(i, n));
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) expect(Math.hypot(places[i].x - places[j].x, places[i].y - places[j].y)).toBeGreaterThan(12);
    }
  });
});

describe('what is left on the ground', () => {
  it('comes to a hero who is near, and is worth more with Bounty', () => {
    const got = (bounty: number): [number, number] => {
      const w = new World(setup({ stats: stats({ bounty }), weapons: [{ id: 'bow', tier: 0 }] }));
      w.slots[0].cool = 999;
      w.picks.push({ id: 1, kind: 'coin', x: w.hero.x + 40, y: w.hero.y, vx: 0, vy: 0, value: 3, pulled: false, age: 1 });
      w.picks.push({ id: 2, kind: 'coin', x: w.hero.x + 500, y: w.hero.y, vx: 0, vy: 0, value: 3, pulled: false, age: 1 });
      play(w, 0.39);
      return [w.gold, w.xp];
    };
    expect(got(0)).toEqual([3, 3]);
    expect(got(100)).toEqual([6, 3]);
  });

  it('a heart mends, and is left for a hero who is whole', () => {
    const mended = (hp: number): number => {
      const w = new World(setup({ stats: stats({ maxHp: 30 }), weapons: [{ id: 'bow', tier: 0 }] }));
      w.slots[0].cool = 999;
      w.hero.hp = hp;
      w.picks.push({ id: 1, kind: 'heart', x: w.hero.x + 30, y: w.hero.y, vx: 0, vy: 0, value: 3, pulled: false, age: 1 });
      play(w, 0.39);
      return w.hero.hp - hp;
    };
    expect(mended(10)).toBe(3);
    expect(mended(30)).toBe(0);
  });
});

describe('enemies', () => {
  it('a charger stops, turns, and runs through where the hero stood: a hero who steps aside is missed', () => {
    const w = new World(setup({ stats: stats({ maxHp: 9999 }), weapons: [{ id: 'bow', tier: 0 }] }));
    w.slots[0].cool = 999;
    const ram = stand(w, 'packram', w.hero.x + 200, w.hero.y, { hp: 99999, cool: 0 });
    const aimed = play(w, 0.2).find((e) => e.t === 'aim');
    expect(aimed && aimed.t === 'aim' && aimed.doing).toBe('charge');
    expect(ram.state).toBe('aim');
    // Step out of its line while it turns.
    const events = play(w, 2, { x: 0, y: 1 });
    expect(events.some((e) => e.t === 'hurt')).toBe(false);
    expect(ram.x).toBeLessThan(w.hero.x);
  });

  it('a shooter keeps its distance and looses what can be stepped out of', () => {
    const w = new World(setup({ wave: 3, stats: stats({ maxHp: 9999 }), weapons: [{ id: 'sword', tier: 0 }] }));
    const p = stand(w, 'poacher', w.hero.x + 120, w.hero.y, { hp: 99999, cool: 0.5 });
    const events = play(w, 4);
    expect(Math.hypot(p.x - w.hero.x, p.y - w.hero.y)).toBeGreaterThan(150);
    expect(events.some((e) => e.t === 'foeShot')).toBe(true);
    expect(byId(ENEMIES, 'poacher').flies ?? 0).toBeLessThan(260);
  });

  it('a powder monkey bursts where it lit its fuse, and leaves nothing', () => {
    const w = new World(setup({ wave: 10, stats: stats({ maxHp: 9999 }), weapons: [{ id: 'bow', tier: 0 }] }));
    w.slots[0].cool = 999;
    stand(w, 'powdermonkey', w.hero.x + 40, w.hero.y, { hp: 99999 });
    const events = play(w, 1.2);
    expect(events.some((e) => e.t === 'burst' && e.kind === 'foe')).toBe(true);
    expect(events.some((e) => e.t === 'hurt')).toBe(true);
    expect(w.picks.length).toBe(0);
    expect(w.kills).toBe(0);
  });

  it('do not stand in one another', () => {
    const w = new World(setup({ stats: stats({ maxHp: 99999 }), weapons: [{ id: 'bow', tier: 0 }] }));
    w.slots[0].cool = 999;
    const a = stand(w, 'cutpurse', w.hero.x + 300, w.hero.y, { hp: 9999 });
    const b = stand(w, 'cutpurse', w.hero.x + 300, w.hero.y, { hp: 9999 });
    play(w, 0.5);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(15);
    expect(HERO_RADIUS).toBeLessThan(20);
  });
});

describe('the plain player', () => {
  it('can play a run: every hero gets through the first wave with what they start with', () => {
    for (const h of HEROES) {
      const run = newRun(h.id, 99);
      expect(statsOf(run).maxHp, h.id).toBeGreaterThanOrEqual(15);
      const w = new World(setupOf(run));
      for (let i = 0; i < 60 * 40 && !w.over; i++) w.step(botSteer(w));
      expect(w.over, h.id).toBe('cleared');
    }
  });
});
