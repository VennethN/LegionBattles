import { describe, expect, it } from 'vitest';
import { Battle } from '../src/game/battle';
import { ABILITIES, CAMP, HEROES, HONORS } from '../src/game/data';
import { heroCost, legionDps } from '../src/game/rules';
import { SAVE_VERSION, newRun, newSave, repair } from '../src/game/state';

describe('the save', () => {
  it('a new one has no one hired, nothing built, and stands at the first stage', () => {
    const s = newSave(9);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.run.stage).toBe(1);
    expect(s.run.heroes).toEqual(HEROES.map(() => 0));
    // With the price of the first hero in the purse, so that the first thing there is to do is hire.
    expect(s.run.gold).toBe(heroCost(s, 0));
    expect(s.run.camp).toEqual(CAMP.map(() => 0));
    expect(s.honors).toEqual(HONORS.map(() => 0));
    expect(s.abilities.length).toBe(ABILITIES.length);
    expect(s.rng).toBe(9);
    // The dice are never left at nought, which they could not leave.
    expect(newSave(0).rng).toBe(1);
  });

  it('comes back from storage as it went in', () => {
    const s = newSave(4);
    s.run.stage = 37;
    s.run.top = 41;
    s.best = 55;
    s.run.gold = 1.5e12;
    s.run.heroes[3] = 77;
    s.run.camp[1] = 4;
    s.run.holding = true;
    s.laurels = 6;
    s.laurelsEver = 19;
    s.honors[2] = 3;
    s.rebirths = 2;
    s.feats.push('stage-5');
    s.hints.push('tap');
    s.settings.buy = 0;
    s.settings.sound = false;
    s.abilities[1].ready = 123456;
    s.seen = 987654321;
    expect(repair(JSON.parse(JSON.stringify(s)), 1)).toEqual(s);
  });

  it('whatever is read is made into a save the rules can trust', () => {
    for (const junk of [null, undefined, 7, 'save', [], {}, { run: 3 }, { run: { heroes: 'many', camp: null, stage: -4, gold: 'lots' } }]) {
      const s = repair(junk, 2);
      expect(s.run.stage).toBeGreaterThanOrEqual(1);
      expect(s.run.top).toBeGreaterThanOrEqual(s.run.stage);
      expect(s.run.heroes.length).toBe(HEROES.length);
      expect(s.run.camp.length).toBe(CAMP.length);
      // What it has in its purse is what a new save has: the price of the first hero.
      expect(s.run.gold).toBe(newRun().gold);
      expect(Number.isFinite(legionDps(s))).toBe(true);
      // And a fight can be run on it.
      const b = new Battle(s);
      for (let i = 0; i < 50; i++) b.tick(0.1, 1000 + i * 100);
    }
  });

  it('numbers that could not be are brought back in', () => {
    const s = repair(
      {
        run: { stage: 12.7, top: 3, kills: -2, gold: -50, heroes: [5.9, -3, 'x', Infinity, NaN], camp: CAMP.map(() => 1e9) },
        laurels: -4,
        best: 2,
        honors: HONORS.map(() => 1e9),
        settings: { music: 99, effects: -3, buy: 7, sound: 'yes' },
        abilities: [{ ready: 'soon' }],
        feats: ['stage-5', 'stage-5', 'no-such-feat', 42],
        rng: 0,
      },
      3,
    );
    expect(s.run.stage).toBe(12);
    expect(s.run.top).toBe(12);
    expect(s.best).toBeGreaterThanOrEqual(12);
    expect(s.run.kills).toBe(0);
    expect(s.run.gold).toBe(0);
    expect(s.run.heroes.slice(0, 5)).toEqual([5, 0, 0, 0, 0]);
    s.run.camp.forEach((level, i) => expect(level).toBe(CAMP[i].max));
    s.honors.forEach((level, i) => expect(level).toBe(HONORS[i].max));
    expect(s.laurels).toBe(0);
    expect(s.settings.music).toBeLessThanOrEqual(10);
    expect(s.settings.effects).toBeGreaterThanOrEqual(0);
    expect([1, 10, 25, 0]).toContain(s.settings.buy);
    expect(typeof s.settings.sound).toBe('boolean');
    expect(s.abilities.length).toBe(ABILITIES.length);
    expect(s.abilities[0].ready).toBe(0);
    expect(s.feats).toEqual(['stage-5']);
    expect(s.rng).not.toBe(0);
  });

  it('a save from before a hero was added has that hero unhired', () => {
    const old = JSON.parse(JSON.stringify(newSave(1))) as { run: { heroes: number[]; camp: number[] } };
    old.run.heroes = [10, 4];
    old.run.camp = [2];
    const s = repair(old, 1);
    expect(s.run.heroes.length).toBe(HEROES.length);
    expect(s.run.heroes.slice(0, 3)).toEqual([10, 4, 0]);
    expect(s.run.camp.slice(0, 2)).toEqual([2, 0]);
  });
});
