import { describe, expect, it } from 'vitest';
import { botCamp, botSteer } from '../src/game/bot';
import { HEROES, ITEMS, OFFERS, SLOTS, WEAPONS, byId, levelNeeds, priceAt, rerollCost } from '../src/game/data';
import {
  buy, choose, combine, endWave, held, lock, march, newRun, openPack, reroll, rerollPrice, sell, sellPrice, setupOf, statsOf, survived, twinOf, whyNot, type RunData,
} from '../src/game/run';
import { bestWave, featDone, featShare, freshSave, isOpen, record, repair } from '../src/game/state';
import { World } from '../src/game/world';

/** A wave as the run would be given it back: over, with this much gathered. */
function fought(run: RunData, o: { gold?: number; xp?: number; kills?: number; packs?: number; dead?: boolean; felled?: string[] } = {}): World {
  const w = new World(setupOf(run));
  w.gold = o.gold ?? 0;
  w.xp = o.xp ?? 0;
  w.kills = o.kills ?? 0;
  w.packs = o.packs ?? 0;
  w.felled = o.felled ?? [];
  w.over = o.dead ? 'dead' : 'cleared';
  return w;
}

/** A run standing in its camp after the first wave, with coins to spend. */
function inCamp(hero = 'knight', gold = 1000): RunData {
  const run = newRun(hero, 5);
  endWave(run, fought(run, { gold }));
  return run;
}

describe('a run', () => {
  it('starts every hero with their own weapon and their own stats', () => {
    for (const h of HEROES) {
      const run = newRun(h.id, 1);
      expect(run.weapons).toEqual([{ id: h.weapon, tier: 0 }]);
      expect(run.wave).toBe(1);
      expect(statsOf(run).maxHp).toBe(24 + (h.stats.maxHp ?? 0));
    }
    expect(statsOf(newRun('knight', 1)).armor).toBe(2);
  });

  it('goes from a wave to the camp, or to a level first when one was made', () => {
    const run = newRun('knight', 3);
    endWave(run, fought(run, { gold: 12.6, xp: 5, kills: 9 }));
    expect(run.phase).toBe('camp');
    expect(run.wave).toBe(2);
    expect(run.gold).toBe(13);
    expect(run.kills).toBe(9);
    expect(survived(run)).toBe(1);
    expect(run.offers.length).toBe(OFFERS);
    march(run);
    endWave(run, fought(run, { xp: levelNeeds(0) + levelNeeds(1) }));
    expect(run.phase).toBe('level');
    expect(run.level).toBe(2);
    expect(run.pending).toBe(2);
    expect(run.choices.length).toBe(4);
    expect(new Set(run.choices.map((c) => c.stat)).size).toBe(4);
    const before = statsOf(run);
    const first = run.choices[0];
    expect(choose(run, 0)).toBe(true);
    expect(run.phase).toBe('level');
    expect(statsOf(run)[first.stat]).toBe(before[first.stat] + first.by);
    expect(choose(run, 1)).toBe(true);
    expect(run.phase).toBe('camp');
    expect(run.ups.length).toBe(2);
    // A level is a point of health by itself: two levels, two points over what the hero began with.
    const chosenHp = run.ups.filter((u) => u.stat === 'maxHp').reduce((n, u) => n + u.by, 0);
    expect(statsOf(run).maxHp).toBe(statsOf(newRun('knight', 3)).maxHp + 2 + chosenHp);
  });

  it('ends when the hero falls, and keeps what the last wave gave', () => {
    const run = newRun('archer', 3);
    endWave(run, fought(run, { gold: 7, kills: 4, dead: true }));
    expect(run.phase).toBe('over');
    expect(run.wave).toBe(1);
    expect(survived(run)).toBe(0);
    expect(run.kills).toBe(4);
    expect(march(run)).toBe(false);
  });

  it('counts the coins a thief gathers as coins, not as the experience they were worth', () => {
    const run = newRun('cutpurse', 3);
    endWave(run, fought(run, { xp: 15 }));
    expect(run.coins).toBe(10);
  });

  it('gives no two waves the same dice', () => {
    const run = newRun('knight', 3);
    expect(setupOf(run).seed).not.toBe(setupOf(run).seed);
  });
});

describe('the camp', () => {
  it('offers weapons in the first camps, at prices that rise with the wave', () => {
    const run = inCamp();
    expect(run.offers.slice(0, 2).every((o) => o.kind === 'weapon')).toBe(true);
    for (const o of run.offers) {
      const base = o.kind === 'weapon' ? byId(WEAPONS, o.id).price : byId(ITEMS, o.id).price;
      expect(o.price).toBeGreaterThanOrEqual(base);
    }
    expect(priceAt(100, 11)).toBeGreaterThan(priceAt(100, 1));
    expect(rerollCost(10, 0)).toBeGreaterThan(rerollCost(1, 0));
    expect(rerollCost(5, 2)).toBeGreaterThan(rerollCost(5, 0));
  });

  it('sells what there are coins for, once', () => {
    const run = inCamp('knight', 0);
    expect(whyNot(run, 0)).toBe('coins');
    expect(buy(run, 0)).toBe(false);
    run.gold = 1000;
    const o = run.offers[0];
    expect(buy(run, 0)).toBe(true);
    expect(run.gold).toBe(1000 - o.price);
    expect(run.weapons.length).toBe(2);
    expect(whyNot(run, 0)).toBe('sold');
    expect(buy(run, 0)).toBe(false);
  });

  it('an item bought is held, and its stats are the hero\'s from then on', () => {
    const run = inCamp();
    run.offers[3] = { kind: 'item', id: 'mail', tier: 1, price: 10, sold: false, locked: false };
    const before = statsOf(run);
    expect(buy(run, 3)).toBe(true);
    expect(held(run, 'mail')).toBe(1);
    expect(statsOf(run).armor).toBe(before.armor + 3);
    expect(statsOf(run).speed).toBe(before.speed - 4);
  });

  it('a hero with every hand full can buy a weapon only if it has a twin to be joined to', () => {
    const run = inCamp();
    run.weapons = Array.from({ length: SLOTS }, () => ({ id: 'bow', tier: 0 }));
    run.offers[0] = { kind: 'weapon', id: 'spear', tier: 0, price: 5, sold: false, locked: false };
    run.offers[1] = { kind: 'weapon', id: 'bow', tier: 0, price: 5, sold: false, locked: false };
    expect(whyNot(run, 0)).toBe('hands');
    expect(whyNot(run, 1)).toBe('');
    expect(buy(run, 1)).toBe(true);
    expect(run.weapons.length).toBe(SLOTS);
    expect(run.weapons.filter((w) => w.tier === 1).length).toBe(1);
  });

  it('joins two of a kind into one of the next tier, and nothing past the last', () => {
    const run = inCamp();
    run.weapons = [{ id: 'sword', tier: 0 }, { id: 'bow', tier: 0 }, { id: 'sword', tier: 0 }, { id: 'sword', tier: 1 }];
    expect(twinOf(run, 'sword', 0, 0)).toBe(2);
    expect(combine(run, 1)).toBe(false);
    expect(combine(run, 0)).toBe(true);
    expect(run.weapons).toEqual([{ id: 'sword', tier: 1 }, { id: 'bow', tier: 0 }, { id: 'sword', tier: 1 }]);
    expect(combine(run, 0)).toBe(true);
    expect(run.weapons).toEqual([{ id: 'sword', tier: 2 }, { id: 'bow', tier: 0 }]);
    run.weapons = [{ id: 'sword', tier: 3 }, { id: 'sword', tier: 3 }];
    expect(combine(run, 0)).toBe(false);
  });

  it('buys a weapon back for half, and never the last one', () => {
    const run = inCamp('knight', 0);
    run.weapons.push({ id: 'crossbow', tier: 1 });
    const worth = sellPrice(run.weapons[1]);
    expect(worth).toBeGreaterThan(0);
    expect(sell(run, 1)).toBe(true);
    expect(run.gold).toBe(worth);
    expect(sell(run, 0)).toBe(false);
    expect(run.weapons.length).toBe(1);
  });

  it('shows other wares for a price that rises each time, and keeps what is locked', () => {
    const run = inCamp();
    expect(lock(run, 2)).toBe(true);
    const kept = { ...run.offers[2] };
    const first = rerollPrice(run);
    const gold = run.gold;
    expect(reroll(run)).toBe(true);
    expect(run.gold).toBe(gold - first);
    expect(rerollPrice(run)).toBeGreaterThan(first);
    expect(run.offers[2]).toEqual(kept);
    // It is still there in the next camp, and the price of looking starts again.
    march(run);
    endWave(run, fought(run));
    expect(run.offers[2]).toEqual(kept);
    expect(rerollPrice(run)).toBeLessThanOrEqual(rerollCost(run.wave, 0));
    run.gold = 0;
    expect(reroll(run)).toBe(false);
  });

  it('opens a pack for something that costs nothing', () => {
    const run = inCamp('knight', 0);
    expect(openPack(run)).toBeNull();
    run.packs = 2;
    const got = openPack(run);
    expect(got && byId(ITEMS, got).id).toBe(got);
    expect(run.items).toEqual([got]);
    expect(run.packs).toBe(1);
    expect(run.gold).toBe(0);
  });

  it('does nothing out of its turn', () => {
    const run = newRun('knight', 2);
    expect(buy(run, 0)).toBe(false);
    expect(reroll(run)).toBe(false);
    expect(sell(run, 0)).toBe(false);
    expect(choose(run, 0)).toBe(false);
    expect(march(run)).toBe(false);
  });
});

describe('the save', () => {
  it('opens a hero when their feat is done, once, and says so', () => {
    const save = freshSave();
    expect(isOpen(save, 'knight')).toBe(true);
    expect(isOpen(save, 'mage')).toBe(false);
    const run = newRun('knight', 1);
    run.wave = 5;
    expect(record(save, run, 30)).toEqual([]);
    expect(bestWave(save)).toBe(4);
    expect(featShare(save, { kind: 'wave', wave: 5 })).toBeCloseTo(0.8);
    run.wave = 6;
    expect(record(save, run, 30)).toEqual(['mage']);
    expect(record(save, run, 0)).toEqual([]);
    expect(isOpen(save, 'mage')).toBe(true);
    expect(save.kills).toBe(60);
    expect(save.last).toBe('knight');
  });

  it('counts a boss beaten, coins gathered in one run, and kills over every run', () => {
    const save = freshSave();
    const run = newRun('archer', 1);
    run.felled = ['warlord'];
    run.coins = 250;
    expect(record(save, run, 700).sort()).toEqual(['cutpurse', 'lancer', 'pyromancer']);
    expect(featDone(save, { kind: 'boss', boss: 'warlord' })).toBe(true);
    expect(featDone(save, { kind: 'boss', boss: 'jarl' })).toBe(false);
    const poorer = newRun('archer', 1);
    poorer.coins = 10;
    record(save, poorer, 0);
    expect(save.coins).toBe(250);
  });

  it('mends whatever it is given', () => {
    expect(repair(null)).toEqual(freshSave());
    expect(repair('nonsense')).toEqual(freshSave());
    const odd = repair({ best: { knight: 7.9, nobody: 3 }, open: ['mage', 'mage', 'nobody', 5], kills: -4, last: 'nobody', sound: false, run: { hero: 'nobody' }, told: ['move'] });
    expect(odd.best).toEqual({ knight: 7 });
    expect(odd.open).toEqual(['mage']);
    expect(odd.kills).toBe(0);
    expect(odd.last).toBe('knight');
    expect(odd.sound).toBe(false);
    expect(odd.music).toBe(true);
    expect(odd.run).toBeNull();
    expect(odd.told).toEqual(['move']);
  });

  it('keeps a run left in its camp, and carries it on as it was', () => {
    const run = inCamp();
    const save = freshSave();
    save.run = run;
    const back = repair(JSON.parse(JSON.stringify(save)));
    expect(back.run).toEqual(run);
    expect(buy(back.run as RunData, 0)).toBe(true);
    const fighting = newRun('knight', 1);
    save.run = fighting;
    expect(repair(JSON.parse(JSON.stringify(save))).run).toBeNull();
  });
});

describe('a whole run by the plain player', () => {
  it('trades in every camp and comes to an end', () => {
    const run = newRun('knight', 4242);
    let waves = 0;
    while (run.phase !== 'over' && waves++ < 60) {
      const w = new World(setupOf(run));
      for (let i = 0; i < 60 * 200 && !w.over; i++) w.step(botSteer(w));
      endWave(run, w);
      if ((run.phase as string) !== 'over') botCamp(run);
    }
    expect(run.phase).toBe('over');
    expect(survived(run)).toBeGreaterThanOrEqual(2);
    expect(run.weapons.length).toBeGreaterThan(1);
    expect(run.gold).toBeGreaterThanOrEqual(0);
  });
});
