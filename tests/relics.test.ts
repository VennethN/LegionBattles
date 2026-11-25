import { describe, expect, it } from 'vitest';
import { BAND, MOVE, RELIC, RELICS, OFFERS, relicOf, rerollCost, waveOf } from '../src/game/data';
import { RELIC_CHOICES, buy, endWave, hasRelic, lock, march, newRun, reroll, rerollPrice, setupOf, statsOf, takeRelic, whyNot, type RunData } from '../src/game/run';
import { World, type Ev, type Pick, type Setup } from '../src/game/world';
import { alone, blows, play, setup, stand, stats } from './field';

const has = <T extends Ev['t']>(events: readonly Ev[], t: T): Extract<Ev, { t: T }>[] => events.filter((e): e is Extract<Ev, { t: T }> => e.t === t);
const told = (events: readonly Ev[], relic: string): boolean => has(events, 'relic').some((e) => e.id === relic);

/**
 * A wave fought with Bram's sword and these relics, and nobody on it but
 * who a test stands there. No blow is a lucky one, so that what a test
 * measures is the relic and not the dice.
 */
const holding = (relics: string[], o: Partial<Setup> = {}): World =>
  alone(new World(setup({ own: { id: 'gatekeeper', tier: 0 }, relics, ...o, stats: { ...(o.stats ?? stats({ maxHp: 9999 })), crit: (o.stats?.crit ?? 0) - 1000 } })));

/** The harm of the hero's first blow on a foe stood in front of them. */
const firstBlow = (w: World): number => {
  const f = stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 99999, maxHp: 99999 }, true);
  return Math.max(...blows(play(w, 0.6), f.id));
};

const coin = (w: World, x: number, y: number, value = 1, kind: Pick['kind'] = 'coin'): void => {
  w.picks.push({ id: 5000 + w.picks.length, kind, x, y, vx: 0, vy: 0, value, pulled: false, age: 1 });
};

const camp = (o: Partial<RunData> = {}): RunData => ({ ...newRun('bram', 99), wave: 5, phase: 'camp', ...o });

describe('relics', () => {
  it('are about two dozen, each with a name and a line that says what it does', () => {
    expect(RELICS.length).toBeGreaterThanOrEqual(24);
    expect(new Set(RELICS.map((r) => r.id)).size).toBe(RELICS.length);
    for (const r of RELICS) {
      expect(r.name.length, r.id).toBeGreaterThan(3);
      expect(r.says.length, r.id).toBeGreaterThan(15);
      expect(relicOf(r.id)).toBe(r);
    }
    expect(() => relicOf('nosuch')).toThrow();
  });

  it('come from a captain: one of three to choose, none of them held already', () => {
    const run = camp({ wave: 7, phase: 'fight', relics: ['bellows', 'crown'] });
    const w = new World(setupOf(run));
    Object.assign(w, { over: 'cleared', felled: ['warlord'] });
    endWave(run, w);
    expect(run.phase).toBe('relic');
    expect(run.relicChoices.length).toBe(RELIC_CHOICES);
    for (const id of run.relicChoices) expect(['bellows', 'crown']).not.toContain(id);
    expect(takeRelic(run, 9)).toBe(false);
    expect(takeRelic(run, 0)).toBe(true);
    expect(run.relics.length).toBe(3);
    expect(run.phase).toBe('camp');
  });

  it('a run that holds them all takes coins in place of another', () => {
    const run = camp({ wave: 7, phase: 'fight', relics: RELICS.map((r) => r.id) });
    const w = new World(setupOf(run));
    Object.assign(w, { over: 'cleared', felled: ['warlord'] });
    const gold = run.gold;
    endWave(run, w);
    expect(run.phase).toBe('camp');
    expect(run.gold).toBe(gold + RELIC.instead);
  });

  it('are now and then among the camp\'s wares, at a high price, never two and never one that is held', () => {
    const run = camp({ gold: 100000, relics: ['bellows'] });
    let seen = 0;
    for (let i = 0; i < 300; i++) {
      run.rerolls = 0;
      reroll(run);
      const relics = run.offers.filter((o) => o.kind === 'relic');
      expect(relics.length).toBeLessThanOrEqual(1);
      if (relics.length === 0) continue;
      seen++;
      const at = run.offers.indexOf(relics[0]);
      expect(at).toBe(OFFERS - 1);
      expect(hasRelic(run, relics[0].id)).toBe(false);
      // A relic is dear, unless the Merchant's Seal, bought on the way, has halved it.
      if (!relics[0].cut) expect(relics[0].price).toBeGreaterThan(RELIC.price);
      expect(whyNot(run, at)).toBe('');
      expect(buy(run, at)).toBe(true);
      expect(hasRelic(run, relics[0].id)).toBe(true);
      if (run.relics.length >= RELICS.length) break;
    }
    expect(seen).toBeGreaterThan(5);
    // Before the third wave none is offered.
    const early = camp({ wave: 2, gold: 100000 });
    for (let i = 0; i < 100; i++) {
      early.rerolls = 0;
      reroll(early);
      expect(early.offers.some((o) => o.kind === 'relic')).toBe(false);
    }
  });

  it('Bellows: what dies burning sets its neighbors alight', () => {
    for (const relics of [['bellows'], []]) {
      const w = holding(relics);
      w.slots[0].cool = 99;
      const h = w.hero;
      stand(w, 'cutpurse', h.x + 300, h.y, { hp: 1, burn: 2, burnBy: 4 }, true);
      const near = stand(w, 'bruiser', h.x + 300 + RELIC.bellows.r - 10, h.y, { hp: 9999 }, true);
      const far = stand(w, 'bruiser', h.x + 300, h.y + RELIC.bellows.r + 80, { hp: 9999 }, true);
      const events = play(w, 0.6);
      expect(near.burnBy).toBe(relics.length ? 4 : 0);
      expect(far.burnBy).toBe(0);
      expect(told(events, 'bellows')).toBe(relics.length > 0);
    }
  });

  it('Echo Bell: every fourth blow of the hero\'s own weapon lands twice', () => {
    const count = (relics: string[]): { strikes: number; rang: number } => {
      const w = holding(relics);
      // One who walks back each time it is thrown off, so that the blows go on landing.
      stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 9999999, dmg: 0 });
      const events = play(w, 18);
      return { strikes: has(events, 'strike').length, rang: has(events, 'relic').filter((e) => e.id === 'echobell').length };
    };
    expect(RELIC.echobell.every).toBe(4);
    expect(count([]).rang).toBe(0);
    const bell = count(['echobell']);
    expect(bell.rang).toBeGreaterThanOrEqual(3);
    // Each ring is one blow more, and there is one for every four of his own.
    expect(bell.rang).toBe(Math.floor((bell.strikes - bell.rang) / RELIC.echobell.every));
  });

  it('Wolfskin: a fifth more harm while a companion is close by', () => {
    const base = firstBlow(holding([], { band: [{ id: 'pip', bond: 0 }] }));
    expect(firstBlow(holding(['wolfskin'], { band: [{ id: 'pip', bond: 0 }] }))).toBe(Math.round(base * (1 + RELIC.wolfskin.more)));
    // One that is struck down is no company, and nor is nobody.
    const w = holding(['wolfskin'], { band: [{ id: 'biscuit', bond: 0 }] });
    w.band[0].down = 99;
    expect(firstBlow(w)).toBe(base);
    expect(firstBlow(holding(['wolfskin']))).toBe(base);
  });

  it('Last Candle: the first blow that would kill in a wave leaves one health, and the second kills', () => {
    const w = holding(['lastcandle'], { stats: stats({ maxHp: 10 }) });
    w.slots[0].cool = 99;
    stand(w, 'bruiser', w.hero.x + 6, w.hero.y, { hp: 99999, dmg: 500 }, true);
    const events = play(w, 0.2);
    expect(told(events, 'lastcandle')).toBe(true);
    expect(w.hero.hp).toBe(1);
    expect(w.over).toBeNull();
    play(w, RELIC.lastcandle.grace + 0.5);
    expect(w.over).toBe('dead');
  });

  it('Magpie Feather: coins fly in from anywhere on the field', () => {
    for (const relics of [['magpie'], []]) {
      const w = holding(relics);
      coin(w, w.hero.x + 500, w.hero.y, 3);
      // A heart is left where it lies for a hero who has no need of it.
      coin(w, w.hero.x - 500, w.hero.y, 3, 'heart');
      play(w, 2);
      expect(w.coins).toBe(relics.length ? 3 : 0);
      expect(w.picks.filter((p) => p.kind === 'heart').length).toBe(1);
    }
  });

  it('Thornmail: who strikes the hero up close takes three times their Armor', () => {
    const w = holding(['thornmail'], { stats: stats({ maxHp: 9999, armor: 4 }) });
    w.slots[0].cool = 99;
    const f = stand(w, 'bruiser', w.hero.x + 6, w.hero.y, { hp: 1000, dmg: 2 }, true);
    const events = play(w, 0.2);
    expect(has(events, 'hurt').length).toBe(1);
    expect(f.hp).toBe(1000 - 4 * RELIC.thornmail.times);
    expect(told(events, 'thornmail')).toBe(true);
    // A shot from far off is not a blow up close.
    const v = holding(['thornmail'], { stats: stats({ maxHp: 9999, armor: 4 }) });
    v.slots[0].cool = 99;
    const far = stand(v, 'poacher', v.hero.x + 200, v.hero.y, { hp: 1000, dmg: 2, cool: 0 }, true);
    expect(has(play(v, 3), 'hurt').length).toBeGreaterThan(0);
    expect(far.hp).toBe(1000);
  });

  it('Stormglass: every eight seconds lightning strikes the one with the most health, on ground marked first', () => {
    const w = holding(['stormglass']);
    w.slots[0].cool = 999;
    const weak = stand(w, 'cutpurse', w.hero.x + 300, w.hero.y, { hp: 500 }, true);
    const strong = stand(w, 'bruiser', w.hero.x - 300, w.hero.y, { hp: 5000 }, true);
    expect(play(w, RELIC.stormglass.every - 0.5).some((e) => e.t === 'warn')).toBe(false);
    const events = play(w, 0.6 + MOVE.warn + 0.1);
    const warned = has(events, 'warn')[0];
    expect(warned.kind).toBe('bolt');
    expect(Math.hypot(warned.x - strong.x, warned.y - strong.y)).toBeLessThan(2);
    expect(has(events, 'burst').some((e) => e.kind === 'bolt')).toBe(true);
    expect(strong.hp).toBeLessThan(5000);
    expect(weak.hp).toBe(500);
  });

  it('Hunter\'s Horn: the first blow on anyone unhurt is critical', () => {
    const w = holding(['horn']);
    const f = stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 99999, maxHp: 99999 }, true);
    const hits = has(play(w, w.everyOf(w.slots[0]) * 2.5), 'hit').filter((e) => e.id === f.id);
    expect(hits.map((e) => e.crit)).toEqual([true, false, false]);
    expect(hits[0].amount).toBe(hits[1].amount * w.slots[0].def.critBy);
  });

  it('Gravedigger\'s Spade: some of the slain get up on the hero\'s side, strike for a while and are gone', () => {
    const w = holding(['spade']);
    w.slots[0].cool = 999;
    const h = w.hero;
    for (let i = 0; i < 40; i++) stand(w, 'cutpurse', h.x + 200 + (i % 8) * 30, h.y - 100 + Math.floor(i / 8) * 30, { hp: 1, burn: 2, burnBy: 4 }, true);
    const events = play(w, 0.6);
    expect(w.kills).toBe(40);
    expect(w.risen.length).toBeGreaterThan(0);
    expect(w.risen.length).toBeLessThanOrEqual(RELIC.spade.most);
    expect(has(events, 'risen').length).toBe(w.risen.length);
    expect(w.risen[0].unit).toBe('cutpurse');
    // They go for whoever is near them, and nothing else does it harm.
    const victim = stand(w, 'bruiser', h.x + 320, h.y, { hp: 99999 }, true);
    play(w, 3);
    expect(victim.hp).toBeLessThan(99999);
    play(w, RELIC.spade.seconds);
    expect(w.risen.length).toBe(0);
    // A captain does not get up, and without the spade nobody does.
    const v = holding([]);
    v.slots[0].cool = 999;
    for (let i = 0; i < 40; i++) stand(v, 'cutpurse', v.hero.x + 200 + i * 20, v.hero.y, { hp: 1, burn: 2, burnBy: 4 }, true);
    play(v, 0.6);
    expect(v.risen.length).toBe(0);
  });

  it('Twin Quiver: a shot splits in two when it first hits, and the halves do not split again', () => {
    for (const relics of [['twinquiver'], []]) {
      const w = alone(new World(setup({ own: { id: 'whisper', tier: 0 }, relics, stats: stats({ maxHp: 9999, crit: -1000 }) })));
      const h = w.hero;
      const first = stand(w, 'bruiser', h.x + 150, h.y, { hp: 99999 }, true);
      for (const dy of [-70, 0, 70]) stand(w, 'bruiser', h.x + 290, h.y + dy, { hp: 99999, maxHp: 99999 }, true);
      let whole = 0;
      let halves = 0;
      for (let i = 0; i < 60 && has(w.drain(), 'hit').length === 0; i++) {
        w.step({ x: 0, y: 0 });
        const shot = w.shots.find((s) => s.mine);
        if (shot && !shot.split) whole = shot.dmg;
      }
      w.slots[0].cool = 999;
      const mine = w.shots.filter((s) => s.mine);
      halves = mine.filter((s) => s.dmg !== whole).length;
      expect(mine.length).toBe(relics.length ? 3 : 1);
      expect(halves).toBe(relics.length ? 2 : 0);
      if (relics.length) for (const s of mine) expect(s.dmg === whole || s.dmg === Math.round(whole * RELIC.twinquiver.share)).toBe(true);
      expect(first.hp).toBe(99999 - whole);
      play(w, 1);
      expect(w.shots.length).toBe(0);
    }
  });

  it('Whetstone of Ages: each wave come through, every weapon the hero carries does 2% more', () => {
    const base = firstBlow(holding([]));
    expect(firstBlow(holding(['ageswhet'], { whet: 10 }))).toBe(Math.round(base * (1 + 10 * RELIC.ageswhet.each)));
    const bought = (whet: number): number => {
      const w = alone(new World(setup({ weapons: [{ id: 'sword', tier: 0 }], relics: ['ageswhet'], whet, stats: stats({ maxHp: 9999, crit: -1000 }) })));
      return firstBlow(w);
    };
    expect(RELIC.ageswhet.each).toBe(0.02);
    expect(bought(10)).toBe(Math.round(bought(0) * (1 + 10 * RELIC.ageswhet.each)));
    // The run counts the waves it has been held for.
    const run = camp({ phase: 'fight', relics: ['ageswhet'] });
    const w = new World(setupOf(run));
    Object.assign(w, { over: 'cleared' });
    endWave(run, w);
    expect(run.whet).toBe(1);
    expect(setupOf(run).whet).toBe(1);
    const without = camp({ phase: 'fight' });
    const v = new World(setupOf(without));
    Object.assign(v, { over: 'cleared' });
    endWave(without, v);
    expect(without.whet).toBe(0);
  });

  it('Cracked Crown: double harm dealt, and double taken', () => {
    const base = firstBlow(holding([]));
    expect(firstBlow(holding(['crown']))).toBe(base * RELIC.crown.dealt);
    const taken = (relics: string[]): number => {
      const w = holding(relics);
      w.slots[0].cool = 99;
      stand(w, 'bruiser', w.hero.x + 6, w.hero.y, { hp: 99999, dmg: 7 }, true);
      return has(play(w, 0.2), 'hurt')[0].amount;
    };
    expect(taken(['crown'])).toBe(taken([]) * RELIC.crown.taken);
  });

  it('Paymaster\'s Ledger: coins not spent in a camp earn a tenth, thirty at most', () => {
    const run = camp({ wave: 7, gold: 120, relics: ['ledger'] });
    march(run);
    expect(run.gold).toBe(132);
    const rich = camp({ wave: 7, gold: 1000, relics: ['ledger'] });
    march(rich);
    expect(rich.gold).toBe(1000 + RELIC.ledger.most);
    const plain = camp({ wave: 7, gold: 120 });
    march(plain);
    expect(plain.gold).toBe(120);
  });

  it('Pilgrim\'s Shell: standing in one place for two seconds starts mending', () => {
    const w = holding(['shell'], { stats: stats({ maxHp: 30 }) });
    w.hero.hp = 10;
    play(w, RELIC.shell.after - 0.2);
    expect(w.hero.hp).toBe(10);
    play(w, 0.3 + RELIC.shell.every * 3);
    expect(w.hero.hp).toBeGreaterThanOrEqual(13);
    // Walking, nothing mends.
    const at = w.hero.hp;
    play(w, 3, { x: 1, y: 0 });
    expect(w.hero.hp).toBe(at);
    const plain = holding([], { stats: stats({ maxHp: 30 }) });
    plain.hero.hp = 10;
    play(plain, 6);
    expect(plain.hero.hp).toBe(10);
  });

  it('Harrier\'s Spurs: running builds speed, and a blow that lands loses it', () => {
    const run1 = (w: World): number => {
      const x = w.hero.x;
      play(w, 0.5, { x: 1, y: 0 });
      return w.hero.x - x;
    };
    const w = holding(['spurs'], { tall: false });
    w.slots[0].cool = 999;
    w.hero.x = 100;
    const cold = run1(holding([]));
    const first = run1(w);
    play(w, RELIC.spurs.seconds, { x: 0, y: 1 });
    play(w, 1, { x: 0, y: -1 });
    const fast = run1(w);
    expect(first).toBeLessThan(cold * 1.1);
    expect(fast / cold).toBeCloseTo(1 + RELIC.spurs.most, 1);
    stand(w, 'bruiser', w.hero.x + 6, w.hero.y, { hp: 99999, dmg: 1 }, true);
    expect(has(play(w, 0.1), 'hurt').length).toBe(1);
    w.foes.length = 0;
    expect(run1(w)).toBeLessThan(cold * 1.1);
  });

  it('Kennel Whistle: companions get up twice as fast and hit a quarter harder', () => {
    const plain = holding([], { band: [{ id: 'biscuit', bond: 0 }] });
    const w = holding(['whistle'], { band: [{ id: 'biscuit', bond: 0 }] });
    expect(w.allyHarm(w.band[0])).toBe(Math.round(plain.allyHarm(plain.band[0]) * RELIC.whistle.harder));
    for (const [v, share] of [[plain, 1], [w, RELIC.whistle.down]] as const) {
      const a = v.band[0];
      a.hp = 1;
      stand(v, 'bruiser', a.x, a.y, { hp: 99999, dmg: 50 }, true);
      play(v, 0.1);
      expect(a.down).toBeCloseTo(BAND.down * share, 0);
    }
  });

  it('Bone Dice: each wave one stat is rolled up by 15 and another down by 10, and the wave says which', () => {
    const run = camp({ phase: 'fight', relics: ['bonedice'] });
    const plain = statsOf(run);
    const pairs = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const s = setupOf(run);
      expect(s.bones).not.toBeNull();
      if (!s.bones) return;
      expect(s.bones.up).not.toBe(s.bones.down);
      expect(s.stats[s.bones.up]).toBe(plain[s.bones.up] + RELIC.bonedice.up);
      expect(s.stats[s.bones.down]).toBe(plain[s.bones.down] - RELIC.bonedice.down);
      expect(new World(s).bones).toEqual(s.bones);
      pairs.add(`${s.bones.up}/${s.bones.down}`);
    }
    expect(pairs.size).toBeGreaterThan(3);
    // The run's own stats are as they were: the dice are for one wave.
    expect(statsOf(run)).toEqual(plain);
    expect(setupOf(camp({ phase: 'fight' })).bones).toBeNull();
  });

  it('Ember Heart: every fifth kill bursts into flame and leaves those it reaches burning', () => {
    const w = holding(['emberheart']);
    w.slots[0].cool = 999;
    const h = w.hero;
    for (let i = 0; i < 5; i++) stand(w, 'cutpurse', h.x + 300 + i * 4, h.y, { hp: 1, burn: 2, burnBy: 1 }, true);
    const near = stand(w, 'bruiser', h.x + 330, h.y + 20, { hp: 99999 }, true);
    const events = play(w, 0.6);
    expect(w.kills).toBe(5);
    expect(has(events, 'relic').filter((e) => e.id === 'emberheart').length).toBe(1);
    expect(has(events, 'burst').some((e) => e.kind === 'fire' && e.r === RELIC.emberheart.r)).toBe(true);
    expect(near.hp).toBeLessThan(99999);
    expect(near.burnBy).toBe(RELIC.emberheart.burns);
    // Four kills do nothing.
    const v = holding(['emberheart']);
    v.slots[0].cool = 999;
    for (let i = 0; i < 4; i++) stand(v, 'cutpurse', v.hero.x + 300 + i * 4, v.hero.y, { hp: 1, burn: 2, burnBy: 1 }, true);
    expect(told(play(v, 0.6), 'emberheart')).toBe(false);
  });

  it('Frostbite Charm: the slowed do a quarter less, by hand and by shot', () => {
    const taken = (relics: string[], slow: number): number => {
      const w = holding(relics);
      w.slots[0].cool = 99;
      stand(w, 'bruiser', w.hero.x + 6, w.hero.y, { hp: 99999, dmg: 12, slow, slowBy: 0.1 }, true);
      return has(play(w, 0.2), 'hurt')[0].amount;
    };
    expect(taken([], 5)).toBe(12);
    expect(taken(['frostbite'], 0)).toBe(12);
    expect(taken(['frostbite'], 5)).toBe(Math.round(12 * RELIC.frostbite.lets));
    const w = holding(['frostbite']);
    w.slots[0].cool = 99;
    stand(w, 'poacher', w.hero.x + 200, w.hero.y, { hp: 99999, dmg: 12, cool: 0, slow: 9, slowBy: 0.1 }, true);
    expect(has(play(w, 3), 'hurt')[0].amount).toBe(Math.round(12 * RELIC.frostbite.lets));
  });

  it('Mirror Shard: a blow that is dodged is thrown back at who struck', () => {
    for (const relics of [['mirror'], []]) {
      const w = holding(relics, { stats: stats({ maxHp: 99999, dodge: 60 }) });
      w.slots[0].cool = 9999;
      const f = stand(w, 'bruiser', w.hero.x + 6, w.hero.y, { hp: 99999, dmg: 1 }, true);
      const events = play(w, 8);
      expect(has(events, 'dodge').length).toBeGreaterThan(0);
      expect(told(events, 'mirror')).toBe(relics.length > 0);
      expect(f.hp < 99999).toBe(relics.length > 0);
    }
  });

  it('Banner of the Fallen: each champion or captain killed gives health, at once and for the run', () => {
    const w = holding(['fallen'], { stats: stats({ maxHp: 30 }) });
    w.slots[0].cool = 999;
    stand(w, 'bruiser', w.hero.x + 300, w.hero.y, { hp: 1, burn: 2, burnBy: 4, champion: 'quick' }, true);
    stand(w, 'bruiser', w.hero.x + 300, w.hero.y + 200, { hp: 1, burn: 2, burnBy: 4 }, true);
    const events = play(w, 0.6);
    expect(w.banners).toBe(1);
    expect(w.hero.maxHp).toBe(30 + RELIC.fallen.health);
    expect(w.hero.hp).toBe(30 + RELIC.fallen.health);
    expect(told(events, 'fallen')).toBe(true);
    const run = camp({ phase: 'fight', relics: ['fallen'] });
    const before = statsOf(run).maxHp;
    const v = new World(setupOf(run));
    Object.assign(v, { over: 'cleared', banners: 2 });
    endWave(run, v);
    expect(run.vigor).toBe(RELIC.fallen.health * 2);
    expect(statsOf(run).maxHp).toBe(before + RELIC.fallen.health * 2);
    // Without the banner the dead are only counted.
    const plain = camp({ phase: 'fight' });
    const u = new World(setupOf(plain));
    Object.assign(u, { over: 'cleared', banners: 2 });
    endWave(plain, u);
    expect(plain.vigor).toBe(0);
  });

  it('Running Sands: waves are five seconds shorter, and fury fills a third faster', () => {
    expect(new World(setup({ wave: 6, relics: ['sands'] })).wave.seconds).toBe(waveOf(6).seconds - RELIC.sands.shorter);
    expect(new World(setup({ wave: 1, relics: ['sands'] })).wave.seconds).toBe(Math.max(RELIC.sands.least, waveOf(1).seconds - RELIC.sands.shorter));
    const fury = (relics: string[]): number => {
      const w = holding(relics, { move: 'charge', auto: false });
      w.slots[0].cool = 999;
      stand(w, 'cutpurse', w.hero.x + 300, w.hero.y, { hp: 1, burn: 2, burnBy: 4 }, true);
      play(w, 0.6);
      return w.fury;
    };
    expect(fury(['sands']) / fury([])).toBeCloseTo(RELIC.sands.fury);
  });

  it('Beggar\'s Bowl: a heart mends double and fills the fury bar', () => {
    for (const relics of [['bowl'], []]) {
      const w = holding(relics, { move: 'charge', auto: false, stats: stats({ maxHp: 30 }) });
      w.hero.hp = 10;
      coin(w, w.hero.x + 10, w.hero.y, 3, 'heart');
      play(w, 0.5);
      expect(w.hero.hp).toBe(10 + 3 * (relics.length ? RELIC.bowl.times : 1));
      expect(w.fury).toBeCloseTo(relics.length ? RELIC.bowl.fury : 0);
    }
  });

  it('Tithe Box: takes ten coins at each wave, and gives a quarter more harm if it got them', () => {
    const run = camp({ phase: 'fight', gold: 25, relics: ['tithe'] });
    const paid = setupOf(run);
    expect(run.gold).toBe(25 - RELIC.tithe.coins);
    expect(paid.tithe).toBe(true);
    const poor = camp({ phase: 'fight', gold: 5, relics: ['tithe'] });
    expect(setupOf(poor).tithe).toBe(false);
    expect(poor.gold).toBe(5);
    expect(setupOf(camp({ phase: 'fight', gold: 25 })).tithe).toBe(false);
    const base = firstBlow(holding([]));
    expect(firstBlow(holding(['tithe'], { tithe: true }))).toBe(Math.round(base * (1 + RELIC.tithe.more)));
    expect(firstBlow(holding(['tithe'], { tithe: false }))).toBe(base);
  });

  it('Merchant\'s Seal: the dearest ware in every camp is half its price, one at a time', () => {
    const run = camp({ gold: 100000, relics: ['seal'] });
    for (let i = 0; i < 20; i++) {
      reroll(run);
      const cut = run.offers.filter((o) => o.cut);
      expect(cut.length).toBe(1);
      // Halved, it was the dearest: twice what it costs now is no less than any other.
      for (const o of run.offers) expect(cut[0].price * 2 + 1).toBeGreaterThanOrEqual(o.price);
    }
    // One kept from before is the one: nothing else is halved beside it.
    const kept = run.offers.findIndex((o) => o.cut);
    lock(run, kept);
    reroll(run);
    expect(run.offers.filter((o) => o.cut).length).toBe(1);
    expect(run.offers[kept].cut).toBe(true);
    // Without the seal nothing is, and a look at other wares costs what it costs.
    const plain = camp({ gold: 100000 });
    reroll(plain);
    expect(plain.offers.some((o) => o.cut)).toBe(false);
    expect(rerollPrice(camp({ relics: ['seal'] }))).toBe(rerollCost(5, 0));
  });
});
