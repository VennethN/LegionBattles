import { describe, expect, it } from 'vitest';
import { botCamp, botSteer } from '../src/game/bot';
import { HEROES, ITEMS, OFFERS, SLOTS, WEAPONS, byId, levelNeeds, priceAt, rerollCost, weaponOf } from '../src/game/data';
import {
  buy, canSwap, choose, combine, endWave, held, lock, march, newRun, openPack, ownOf, reroll, rerollPrice, sell, sellPrice, setupOf, statsOf, survived, swap, twinOf, weaponNumbers, whyNot, type RunData,
} from '../src/game/run';
import { SAVE_VERSION, bestWave, featDone, featShare, freshSave, isOpen, record, repair } from '../src/game/state';
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
function inCamp(hero = 'bram', gold = 1000): RunData {
  const run = newRun(hero, 5);
  endWave(run, fought(run, { gold }));
  return run;
}

describe('a run', () => {
  it('starts every hero with their own weapon and their own stats', () => {
    for (const h of HEROES) {
      const run = newRun(h.id, 1);
      // Their own weapon is theirs alone and takes no hand: every hand is free.
      expect(run.weapons).toEqual([]);
      expect(ownOf(run)).toEqual({ id: h.weapon, tier: 0 });
      expect(weaponOf(h.weapon).own, h.id).toBe(true);
      expect(WEAPONS.some((w) => w.id === h.weapon), h.id).toBe(false);
      expect(setupOf(run).own).toEqual({ id: h.weapon, tier: 0 });
      expect(run.wave).toBe(1);
      expect(statsOf(run).maxHp).toBe(24 + (h.stats.maxHp ?? 0));
    }
    expect(statsOf(newRun('bram', 1)).armor).toBe(3);
    expect(new Set(HEROES.map((h) => h.weapon)).size).toBe(HEROES.length);
    expect(new Set(HEROES.map((h) => h.quirk)).size).toBe(HEROES.length);
    expect(new Set(HEROES.map((h) => h.move)).size).toBe(HEROES.length);
  });

  it('goes from a wave to the camp, or to a level first when one was made', () => {
    const run = newRun('bram', 3);
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
    expect(statsOf(run).maxHp).toBe(statsOf(newRun('bram', 3)).maxHp + 2 + chosenHp);
  });

  it('ends when the hero falls, and keeps what the last wave gave', () => {
    const run = newRun('wren', 3);
    endWave(run, fought(run, { gold: 7, kills: 4, dead: true }));
    expect(run.phase).toBe('over');
    expect(run.wave).toBe(1);
    expect(survived(run)).toBe(0);
    expect(run.kills).toBe(4);
    expect(march(run)).toBe(false);
  });

  it('a hero\'s own weapon grows a tier by itself at levels 5, 10 and 15, and no further', () => {
    const run = newRun('bram', 3);
    const tiers = [0, 4, 5, 9, 10, 14, 15, 40].map((level) => {
      run.level = level;
      return ownOf(run).tier;
    });
    expect(tiers).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    // Stronger at each: what the camp shows of it grows too.
    expect(weaponNumbers(run, 'gatekeeper', 3).harm).toBeGreaterThan(weaponNumbers(run, 'gatekeeper', 0).harm);
  });

  it('carries the fury bar from wave to wave, and what happens once in a land or a run', () => {
    const run = newRun('hroth', 3);
    expect(setupOf(run).spare).toBe(true);
    const w = fought(run);
    w.fury = 0.4;
    w.rose = true;
    w.rescued = true;
    endWave(run, w);
    expect(run.fury).toBe(0.4);
    expect(run.saved).toBe(true);
    march(run);
    const next = setupOf(run);
    expect(next.fury).toBe(0.4);
    // He got up in this land already; in the next he can again. Tam's rescue is once in a run.
    expect(next.spare).toBe(false);
    expect(next.rescue).toBe(false);
    run.wave = 11;
    expect(setupOf(run).spare).toBe(true);
  });

  it('Orrin picks from one more at each level', () => {
    const run = newRun('orrin', 3);
    endWave(run, fought(run, { xp: levelNeeds(0) }));
    expect(run.choices.length).toBe(5);
  });

  it('gives no two waves the same dice', () => {
    const run = newRun('bram', 3);
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
    const run = inCamp('bram', 0);
    expect(whyNot(run, 0)).toBe('coins');
    expect(buy(run, 0)).toBe(false);
    run.gold = 1000;
    const o = run.offers[0];
    expect(buy(run, 0)).toBe(true);
    expect(run.gold).toBe(1000 - o.price);
    expect(run.weapons.length).toBe(1);
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

  it('with every slot full, swaps a held weapon for one on offer from the offer\'s own card, if the sale pays for it', () => {
    const run = inCamp('bram', 0);
    run.weapons = Array.from({ length: SLOTS }, () => ({ id: 'bow', tier: 0 }));
    run.weapons[2] = { id: 'crossbow', tier: 2 };
    run.offers[0] = { kind: 'weapon', id: 'spear', tier: 1, price: sellPrice(run.weapons[2]) + 3, sold: false, locked: false };
    // The sale alone is not enough: three coins short.
    expect(canSwap(run, 0, 2)).toBe(false);
    run.gold = 3;
    expect(canSwap(run, 0, 2)).toBe(true);
    expect(swap(run, 0, 2)).toBe(true);
    expect(run.gold).toBe(0);
    expect(run.weapons.length).toBe(SLOTS);
    expect(run.weapons.some((w) => w.id === 'crossbow')).toBe(false);
    expect(run.weapons.filter((w) => w.id === 'spear' && w.tier === 1).length).toBe(1);
    expect(swap(run, 0, 0)).toBe(false);
    // A twin is merged by buying it; an item is not a weapon; a free slot needs no swap.
    run.gold = 999;
    run.offers[1] = { kind: 'weapon', id: 'bow', tier: 0, price: 5, sold: false, locked: false };
    run.offers[2] = { kind: 'item', id: 'mail', tier: 0, price: 5, sold: false, locked: false };
    expect(canSwap(run, 1, 0)).toBe(false);
    expect(canSwap(run, 2, 0)).toBe(false);
    run.weapons.pop();
    run.offers[3] = { kind: 'weapon', id: 'sword', tier: 0, price: 5, sold: false, locked: false };
    expect(canSwap(run, 3, 0)).toBe(false);
  });

  it('joins two of a kind into one of the next tier, up to the fifth form and nothing past it', () => {
    const run = inCamp();
    run.weapons = [{ id: 'sword', tier: 0 }, { id: 'bow', tier: 0 }, { id: 'sword', tier: 0 }, { id: 'sword', tier: 1 }];
    expect(twinOf(run, 'sword', 0, 0)).toBe(2);
    expect(combine(run, 1)).toBe(false);
    expect(combine(run, 0)).toBe(true);
    expect(run.weapons).toEqual([{ id: 'sword', tier: 1 }, { id: 'bow', tier: 0 }, { id: 'sword', tier: 1 }]);
    expect(combine(run, 0)).toBe(true);
    expect(run.weapons).toEqual([{ id: 'sword', tier: 2 }, { id: 'bow', tier: 0 }]);
    // Two of tier IV make the fifth form (forms.ts), and that merges with nothing.
    run.weapons = [{ id: 'sword', tier: 3 }, { id: 'sword', tier: 3 }];
    expect(combine(run, 0)).toBe(true);
    expect(run.weapons).toEqual([{ id: 'sword', tier: 4 }]);
    run.weapons.push({ id: 'sword', tier: 4 });
    expect(combine(run, 0)).toBe(false);
  });

  it('buys a weapon back for half, down to the last: the hero\'s own is never among them', () => {
    const run = inCamp('bram', 0);
    run.weapons.push({ id: 'crossbow', tier: 1 });
    const worth = sellPrice(run.weapons[0]);
    expect(worth).toBeGreaterThan(0);
    expect(sell(run, 0)).toBe(true);
    expect(run.gold).toBe(worth);
    expect(run.weapons.length).toBe(0);
    expect(sell(run, 0)).toBe(false);
    // And it is never on the camp's table.
    for (let i = 0; i < 30; i++) {
      run.gold = 9999;
      reroll(run);
      for (const o of run.offers) if (o.kind === 'weapon') expect(weaponOf(o.id).own).toBeFalsy();
    }
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
    const run = inCamp('bram', 0);
    expect(openPack(run)).toBeNull();
    run.packs = 2;
    const got = openPack(run);
    expect(got && byId(ITEMS, got).id).toBe(got);
    expect(run.items).toEqual([got]);
    expect(run.packs).toBe(1);
    expect(run.gold).toBe(0);
  });

  it('does nothing out of its turn', () => {
    const run = newRun('bram', 2);
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
    // Wren is the first hero; Bram is unlocked by finishing a run.
    expect(isOpen(save, 'wren')).toBe(true);
    expect(isOpen(save, 'bram')).toBe(false);
    expect(isOpen(save, 'orrin')).toBe(false);
    const run = newRun('wren', 1, ['biscuit']);
    run.wave = 4;
    expect(record(save, run, 30)).toMatchObject({ heroes: [], friends: [] });
    expect(bestWave(save)).toBe(3);
    expect(featShare(save, { kind: 'wave', wave: 5 })).toBeCloseTo(0.6);
    run.wave = 6;
    // The fifth wave come through unlocks Orrin and Pip. Biscuit has the only slot, and keeps it.
    expect(record(save, run, 30)).toMatchObject({ heroes: ['orrin'], friends: ['pip'] });
    expect(save.band).toEqual(['biscuit']);
    expect(record(save, run, 0)).toMatchObject({ heroes: [], friends: [] });
    expect(isOpen(save, 'orrin')).toBe(true);
    (run as RunData).phase = 'over';
    expect(record(save, run, 0).heroes).toEqual(['bram']);
    expect(save.kills).toBe(60);
    expect(save.last).toBe('wren');
  });

  it('counts a boss beaten, coins gathered in one run, and kills over every run', () => {
    const save = freshSave();
    const run = newRun('wren', 1);
    run.felled = ['warlord'];
    run.coins = 250;
    const opened = record(save, run, 4000);
    expect(opened.heroes.sort()).toEqual(['fenn', 'nan']);
    expect(save.kills).toBe(4000);
    expect(featDone(save, { kind: 'kills', kills: 4000 })).toBe(true);
    expect(featDone(save, { kind: 'boss', boss: 'warlord' })).toBe(true);
    expect(featDone(save, { kind: 'boss', boss: 'jarl' })).toBe(false);
    const poorer = newRun('wren', 1);
    poorer.coins = 10;
    record(save, poorer, 0);
    expect(save.coins).toBe(250);
  });

  it('mends whatever it is given', () => {
    expect(repair(null)).toEqual(freshSave());
    expect(repair('nonsense')).toEqual(freshSave());
    const odd = repair({ best: { bram: 3.9, nobody: 3 }, open: ['orrin', 'orrin', 'nobody', 5], kills: -4, last: 'nobody', sound: false, run: { hero: 'nobody' }, told: ['move'], band: ['pip', 'nobody'], places: 9, auto: false });
    expect(odd.best).toEqual({ bram: 3 });
    expect(odd.open).toEqual(['orrin']);
    expect(odd.kills).toBe(0);
    expect(odd.last).toBe('wren');
    // Nobody goes along who has not been unlocked, and the slots are the best wave's, not the save's say.
    expect(odd.band).toEqual([]);
    expect(odd).not.toHaveProperty('places');
    expect(odd.auto).toBe(false);
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
    const fighting = newRun('bram', 1);
    save.run = fighting;
    expect(repair(JSON.parse(JSON.stringify(save))).run).toBeNull();
  });
});

describe('a save from before the heroes had names', () => {
  it('is carried over: each hero by their new name, with whoever its deeds have opened since', () => {
    const old = { v: 1, best: { knight: 9, archer: 4, mage: 2 }, open: ['mage', 'cutpurse'], kills: 4100, coins: 120, felled: ['warlord'], runs: 6, last: 'mage', run: { hero: 'knight', wave: 3 }, sound: true, music: false, told: [] };
    const s = repair(old);
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.best).toEqual({ bram: 9, wren: 4, orrin: 2 });
    expect(s.last).toBe('orrin');
    expect(s.open).toEqual(expect.arrayContaining(['orrin', 'fenn', 'nan']));
    // The run it left in a camp carried other things, and is let go.
    expect(s.run).toBeNull();
    expect(s.ended).toBe(5);
    // Its deeds unlock companions too: Pip by the wave, Greta by the boss, Thistle by the kills. Biscuit goes along, in its one slot.
    expect(s.friends.sort()).toEqual(['biscuit', 'greta', 'pip', 'thistle']);
    expect(s.band).toEqual(['biscuit']);
    expect(s.music).toBe(false);
  });
});

describe('a whole run by the plain player', () => {
  it('trades in every camp and comes to an end', () => {
    const run = newRun('bram', 4242);
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
  }, 60000);
});
