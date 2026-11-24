import { describe, expect, it } from 'vitest';
import {
  ABILITIES, BONUS_AT, BOSS_SECONDS, CAMP, FEATS, HEROES, HONORS, LANDS, LAND_STAGES, LAUREL_DAMAGE, OFFLINE_HOURS, OFFLINE_LEAST, REBIRTH_STAGE,
  STAGE_ENEMIES,
} from '../src/game/data';
import {
  ABILITY, abilityOpen, away, baseGold, bossSeconds, buyCamp, buyCount, buyHero, buyHonor, campCost, canBeat, canRebirth, claimFeats, damageMult,
  enemiesIn, enemyAt, enemyHp, farmStage, goldFor, goldMult, heroAffordable, heroBase, heroCost, heroDps, heroOpen, honorCost, income, kindOf, landName,
  landOf, lapOf, laurelsFor, legionDps, milestones, nextMilestone, offlineHours, rebirth, renown, spawnSeconds, startStage, tapDamage, troopHp,
} from '../src/game/rules';
import { newSave } from '../src/game/state';

const campOf = (effect: string): number => CAMP.findIndex((c) => c.effect === effect);
const honorOf = (effect: string): number => HONORS.findIndex((h) => h.effect === effect);

describe('the road', () => {
  it('is ten stages to a land: a captain half way, a boss at the end', () => {
    expect(kindOf(1)).toBe('troop');
    expect(kindOf(5)).toBe('captain');
    expect(kindOf(10)).toBe('boss');
    expect(kindOf(15)).toBe('captain');
    expect(kindOf(20)).toBe('boss');
    expect(enemiesIn(3)).toBe(STAGE_ENEMIES);
    expect(enemiesIn(5)).toBe(1);
    expect(enemiesIn(10)).toBe(1);
  });

  it('goes through every land and then through them again, harder', () => {
    expect(landOf(1).id).toBe(LANDS[0].id);
    expect(landOf(LAND_STAGES).id).toBe(LANDS[0].id);
    expect(landOf(LAND_STAGES + 1).id).toBe(LANDS[1].id);
    const all = LAND_STAGES * LANDS.length;
    expect(landOf(all + 1).id).toBe(LANDS[0].id);
    expect(lapOf(all)).toBe(0);
    expect(lapOf(all + 1)).toBe(1);
    expect(landName(1)).toBe(LANDS[0].name);
    expect(landName(all + 1)).toBe(`${LANDS[0].name} II`);
    expect(landName(all * 12 + 1)).toBe(`${LANDS[0].name} 13`);
  });

  it('fields the land\'s own: its troops, its captain, its boss, the same every time', () => {
    for (let stage = 1; stage <= LAND_STAGES * LANDS.length; stage++) {
      const land = landOf(stage);
      for (let n = 0; n < enemiesIn(stage); n++) {
        const who = enemyAt(stage, n);
        expect(who).toBe(enemyAt(stage, n));
        if (kindOf(stage) === 'boss') expect(who).toBe(land.boss);
        else if (kindOf(stage) === 'captain') expect(who).toBe(land.captain);
        else expect(land.troops).toContain(who);
      }
    }
    // More than one kind of enemy is met in a stage, and a land's heaviest only late in it.
    const first = new Set(Array.from({ length: STAGE_ENEMIES }, (_, n) => enemyAt(1, n)));
    expect(first.size).toBeGreaterThan(1);
    const heaviest = LANDS[0].troops[LANDS[0].troops.length - 1];
    expect(first.has(heaviest)).toBe(false);
  });

  it('grows harder with every stage, and pays as it grows', () => {
    for (let stage = 1; stage < 200; stage++) {
      expect(troopHp(stage + 1)).toBeGreaterThan(troopHp(stage));
      expect(baseGold(stage)).toBeGreaterThanOrEqual(1);
    }
    expect(enemyHp(10)).toBeGreaterThan(enemyHp(9) * 4);
    expect(baseGold(10)).toBeGreaterThan(baseGold(9) * 4);
    // Far down the road the numbers are still numbers.
    expect(Number.isFinite(enemyHp(1500))).toBe(true);
  });
});

describe('heroes', () => {
  it('are hired in order, each only once the one before is in the legion', () => {
    const s = newSave();
    expect(heroOpen(s, 0)).toBe(true);
    expect(heroOpen(s, 1)).toBe(false);
    s.run.gold = 1e9;
    expect(buyHero(s, 1, 1)).toBe(0);
    expect(buyHero(s, 0, 1)).toBe(1);
    expect(heroOpen(s, 1)).toBe(true);
    expect(buyHero(s, 1, 1)).toBe(1);
  });

  it('cost more with every level, and a later hero more than an earlier', () => {
    const s = newSave();
    let last = 0;
    for (let level = 0; level < 300; level++) {
      s.run.heroes[0] = level;
      const cost = heroCost(s, 0);
      expect(cost).toBeGreaterThan(last);
      last = cost;
    }
    s.run.heroes.fill(0);
    for (let i = 1; i < HEROES.length; i++) expect(heroCost(s, i)).toBeGreaterThan(heroCost(s, i - 1));
  });

  it('a price for many levels is the sum of the prices of each', () => {
    const s = newSave();
    s.run.heroes[2] = 7;
    let sum = 0;
    const t = newSave();
    for (let k = 0; k < 10; k++) {
      t.run.heroes[2] = 7 + k;
      sum += heroCost(t, 2);
    }
    // Each single price is rounded up, so the sum of them is a little over.
    expect(heroCost(s, 2, 10)).toBeLessThanOrEqual(sum);
    expect(heroCost(s, 2, 10)).toBeGreaterThan(sum - 10);
  });

  it('are paid for, and not bought when the purse is short', () => {
    const s = newSave();
    s.run.gold = heroCost(s, 0) - 1;
    expect(buyHero(s, 0, 1)).toBe(0);
    expect(s.run.heroes[0]).toBe(0);
    s.run.gold += 1;
    expect(buyHero(s, 0, 1)).toBe(1);
    expect(s.run.gold).toBe(0);
  });

  it('the purse is asked how many levels it buys, and buys exactly that', () => {
    const s = newSave();
    s.run.gold = 12_345;
    const n = heroAffordable(s, 0);
    expect(n).toBeGreaterThan(10);
    expect(heroCost(s, 0, n)).toBeLessThanOrEqual(s.run.gold);
    expect(heroCost(s, 0, n + 1)).toBeGreaterThan(s.run.gold);
    s.settings.buy = 0;
    expect(buyCount(s, 0)).toBe(n);
    expect(buyHero(s, 0)).toBe(n);
    // With nothing in the purse, MAX still asks for one, so that the button shows a price.
    s.run.gold = 0;
    expect(buyCount(s, 0)).toBe(1);
    expect(buyHero(s, 0)).toBe(0);
    s.settings.buy = 25;
    expect(buyCount(s, 0)).toBe(25);
  });

  it('double their damage at milestones, for as long as they are leveled', () => {
    expect(milestones(9)).toBe(0);
    expect(milestones(10)).toBe(1);
    expect(milestones(25)).toBe(2);
    expect(milestones(100)).toBe(5);
    expect(milestones(124)).toBe(5);
    expect(milestones(125)).toBe(6);
    expect(milestones(1000)).toBe(5 + 36);
    expect(nextMilestone(0)).toBe(10);
    expect(nextMilestone(10)).toBe(25);
    expect(nextMilestone(100)).toBe(125);
    expect(nextMilestone(137)).toBe(150);
    for (let level = 0; level < 400; level++) {
      const next = nextMilestone(level);
      expect(next).toBeGreaterThan(level);
      expect(milestones(next)).toBe(milestones(level) + 1);
      expect(milestones(next - 1)).toBe(milestones(level));
    }
    expect(heroBase(0, 10)).toBeCloseTo(heroBase(0, 9) * (10 / 9) * 2);
    expect(heroBase(3, 0)).toBe(0);
  });

  it('a later hero is worth hiring: more damage for its price than more levels of the one before, at first', () => {
    const s = newSave();
    for (let i = 1; i < HEROES.length; i++) expect(heroBase(i, 1)).toBeGreaterThan(heroBase(i - 1, 1));
    expect(legionDps(s)).toBe(0);
    s.run.heroes[0] = 1;
    s.run.heroes[1] = 1;
    expect(legionDps(s)).toBeCloseTo(heroBase(0, 1) + heroBase(1, 1));
  });

  it('give the whole legion something at level 25, and twice that at 100', () => {
    const s = newSave();
    const i = HEROES.findIndex((h) => h.bonus[0] === 'damage');
    s.run.heroes[i] = BONUS_AT - 1;
    const before = damageMult(s);
    s.run.heroes[i] = BONUS_AT;
    expect(damageMult(s)).toBeCloseTo(before * (1 + HEROES[i].bonus[1]));
    s.run.heroes[i] = 100;
    expect(damageMult(s)).toBeCloseTo(before * (1 + HEROES[i].bonus[1] * 2));
    const g = HEROES.findIndex((h) => h.bonus[0] === 'gold');
    const gold = goldMult(s);
    s.run.heroes[g] = BONUS_AT;
    expect(goldMult(s)).toBeCloseTo(gold * (1 + HEROES[g].bonus[1]));
  });
});

describe('the camp', () => {
  it('is built a level at a time, each dearer, up to its most', () => {
    const s = newSave();
    s.run.gold = Infinity;
    for (let i = 0; i < CAMP.length; i++) {
      let last = 0;
      for (let level = 0; level < CAMP[i].max; level++) {
        const cost = campCost(s, i);
        expect(cost).toBeGreaterThan(last);
        last = cost;
        expect(buyCamp(s, i)).toBe(true);
      }
      expect(buyCamp(s, i)).toBe(false);
      expect(s.run.camp[i]).toBe(CAMP[i].max);
    }
  });

  it('does what each thing says', () => {
    const s = newSave();
    s.run.heroes[0] = 5;
    const dps = legionDps(s);
    s.run.camp[campOf('damage')] = 2;
    expect(legionDps(s)).toBeCloseTo(dps * (1 + 2 * CAMP[campOf('damage')].per));
    const gold = goldMult(s);
    s.run.camp[campOf('gold')] = 3;
    expect(goldMult(s)).toBeCloseTo(gold * (1 + 3 * CAMP[campOf('gold')].per));
    const cost = heroCost(s, 0);
    s.run.camp[campOf('discount')] = 5;
    expect(heroCost(s, 0)).toBeLessThan(cost);
    // At its most the barracks still leaves heroes a price.
    s.run.camp[campOf('discount')] = CAMP[campOf('discount')].max;
    expect(heroCost(s, 0)).toBeGreaterThan(0);
    expect(bossSeconds(s)).toBe(BOSS_SECONDS);
    s.run.camp[campOf('bossTime')] = 2;
    expect(bossSeconds(s)).toBe(BOSS_SECONDS + 2 * CAMP[campOf('bossTime')].per);
    const wait = spawnSeconds(s);
    s.run.camp[campOf('march')] = CAMP[campOf('march')].max;
    expect(spawnSeconds(s)).toBeLessThan(wait);
    expect(spawnSeconds(s)).toBeGreaterThanOrEqual(0.2);
    const tap = tapDamage(s);
    s.run.camp[campOf('tap')] = 4;
    expect(tapDamage(s)).toBeGreaterThan(tap);
  });
});

describe('gold and taps', () => {
  it('a tap is never nothing, and is worth more as the legion grows', () => {
    const s = newSave();
    expect(tapDamage(s)).toBeGreaterThanOrEqual(1);
    const bare = tapDamage(s);
    s.run.heroes[0] = 50;
    s.run.heroes[1] = 50;
    expect(tapDamage(s)).toBeGreaterThan(bare);
  });

  it('abilities are given at their stages, and plunder triples what is paid while it lasts', () => {
    const s = newSave();
    for (let i = 0; i < ABILITIES.length; i++) expect(abilityOpen(s, i)).toBe(false);
    s.best = ABILITIES[ABILITY.RALLY].stage;
    expect(abilityOpen(s, ABILITY.RALLY)).toBe(true);
    expect(abilityOpen(s, ABILITY.PLUNDER)).toBe(false);
    const plain = goldFor(s, 7, 1000);
    s.abilities[ABILITY.PLUNDER].until = 5000;
    expect(goldFor(s, 7, 1000)).toBe(plain * ABILITIES[ABILITY.PLUNDER].power);
    expect(goldFor(s, 7, 6000)).toBe(plain);
    const tap = tapDamage(s, 1000);
    s.run.heroes[0] = 30;
    const strong = tapDamage(s, 1000);
    s.abilities[ABILITY.RALLY].until = 5000;
    expect(tapDamage(s, 1000)).toBeGreaterThan(strong);
    expect(strong).toBeGreaterThan(tap);
  });

  it('the legion is not sent at a boss it cannot bring down in time', () => {
    const s = newSave();
    expect(canBeat(s, 1)).toBe(true);
    expect(canBeat(s, 10)).toBe(false);
    s.run.heroes[0] = 1;
    expect(canBeat(s, 10)).toBe(false);
    s.run.heroes[0] = 200;
    expect(canBeat(s, 10)).toBe(true);
    s.run.stage = 10;
    expect(farmStage(s)).toBe(10);
    s.run.heroes[0] = 1;
    expect(farmStage(s)).toBe(9);
  });
});

describe('time away', () => {
  it('pays a share of what the legion earns where it stands, up to a number of hours', () => {
    const s = newSave();
    s.run.heroes[0] = 20;
    s.run.stage = 4;
    s.seen = 1_000_000;
    expect(income(s)).toBeGreaterThan(0);
    // Too short a time to say anything of.
    expect(away(s, s.seen + (OFFLINE_LEAST - 1) * 1000)).toBeNull();
    const hour = away(s, s.seen + 3600_000);
    expect(hour).not.toBeNull();
    expect(hour?.capped).toBe(false);
    expect(hour?.seconds).toBe(3600);
    const two = away(s, s.seen + 7200_000);
    expect(two?.gold).toBeGreaterThan((hour?.gold ?? 0) * 1.9);
    const week = away(s, s.seen + 7 * 24 * 3600_000);
    expect(week?.capped).toBe(true);
    expect(week?.seconds).toBe(OFFLINE_HOURS * 3600);
    // Less than the legion would have earned with the game open.
    expect(hour?.gold).toBeLessThan(income(s) * 3600);
  });

  it('pays nothing to a legion of no one, nor to a save that has never been seen', () => {
    const s = newSave();
    s.seen = 1000;
    expect(away(s, 1000 + 3600_000)).toBeNull();
    s.run.heroes[0] = 5;
    s.seen = 0;
    expect(away(s, 3600_000)).toBeNull();
  });

  it('a supply tent and the honor for it keep the legion at it longer', () => {
    const s = newSave();
    const hours = offlineHours(s);
    s.run.camp[campOf('offline')] = 3;
    expect(offlineHours(s)).toBeGreaterThan(hours);
    const more = offlineHours(s);
    s.honors[honorOf('offline')] = 2;
    expect(offlineHours(s)).toBeGreaterThan(more);
  });
});

describe('rebirth', () => {
  it('is not to be had before its stage, and is worth more the further the run went', () => {
    expect(laurelsFor(REBIRTH_STAGE - 1)).toBe(0);
    expect(laurelsFor(REBIRTH_STAGE)).toBeGreaterThanOrEqual(1);
    let last = 0;
    for (let top = REBIRTH_STAGE; top < 400; top++) {
      expect(laurelsFor(top)).toBeGreaterThanOrEqual(last);
      last = laurelsFor(top);
    }
    expect(laurelsFor(100)).toBeGreaterThan(laurelsFor(50) * 2);
    const s = newSave();
    s.run.top = REBIRTH_STAGE - 1;
    expect(canRebirth(s)).toBe(false);
    expect(rebirth(s)).toBe(0);
    expect(s.rebirths).toBe(0);
  });

  it('gives up the road, the purse, the levels and the camp, and keeps laurels, honors, feats and the best stage', () => {
    const s = newSave();
    s.run.stage = 44;
    s.run.top = 47;
    s.best = 47;
    s.run.gold = 1e12;
    s.run.heroes.fill(40);
    s.run.camp.fill(3);
    s.run.holding = true;
    s.honors[honorOf('gold')] = 2;
    s.feats.push(FEATS[0].id);
    s.abilities[0].ready = 9e15;
    s.settings.buy = 10;
    const dps = legionDps(s);
    const won = rebirth(s);
    expect(won).toBe(laurelsFor(47));
    expect(s.laurels).toBe(won);
    expect(s.laurelsEver).toBe(won);
    expect(s.rebirths).toBe(1);
    expect(s.run.stage).toBe(1);
    expect(s.run.top).toBe(1);
    expect(s.run.gold).toBe(0);
    expect(s.run.holding).toBe(false);
    expect(s.run.heroes.every((l) => l === 0)).toBe(true);
    expect(s.run.camp.every((l) => l === 0)).toBe(true);
    expect(s.best).toBe(47);
    expect(s.honors[honorOf('gold')]).toBe(2);
    expect(s.feats).toEqual([FEATS[0].id]);
    expect(s.abilities[0].ready).toBe(0);
    expect(s.settings.buy).toBe(10);
    // The same legion, hired again, is stronger for the laurels.
    s.run.heroes.fill(40);
    s.run.camp.fill(3);
    expect(legionDps(s)).toBeCloseTo(dps * (1 + LAUREL_DAMAGE * won));
  });

  it('laurels buy honors, each level dearer, and a spent laurel still counts for damage', () => {
    const s = newSave();
    s.laurels = 3;
    s.laurelsEver = 3;
    const i = honorOf('damage');
    const before = damageMult(s);
    expect(honorCost(s, i)).toBe(HONORS[i].cost);
    expect(buyHonor(s, i)).toBe(true);
    expect(s.laurels).toBe(3 - HONORS[i].cost);
    expect(s.laurelsEver).toBe(3);
    expect(damageMult(s)).toBeCloseTo(before * (1 + HONORS[i].per));
    expect(honorCost(s, i)).toBe(HONORS[i].cost + HONORS[i].step);
    s.laurels = 0;
    expect(buyHonor(s, i)).toBe(false);
    s.laurels = 1e9;
    s.honors[i] = HONORS[i].max;
    expect(buyHonor(s, i)).toBe(false);
  });

  it('a head start sets the next run down the road with something in its purse', () => {
    const s = newSave();
    const i = honorOf('start');
    s.honors[i] = 2;
    s.run.top = 60;
    expect(startStage(s)).toBe(1 + 2 * HONORS[i].per);
    rebirth(s);
    expect(s.run.stage).toBe(startStage(s));
    expect(s.run.top).toBe(startStage(s));
    expect(s.run.gold).toBeGreaterThan(0);
  });
});

describe('feats', () => {
  it('each has a name of its own and a number to reach', () => {
    expect(new Set(FEATS.map((f) => f.id)).size).toBe(FEATS.length);
    expect(new Set(FEATS.map((f) => f.name)).size).toBe(FEATS.length);
    for (const f of FEATS) expect(f.need).toBeGreaterThan(0);
  });

  it('are claimed once, when what they ask is done, and each is a little more damage and gold', () => {
    const s = newSave();
    expect(claimFeats(s)).toEqual([]);
    expect(renown(s)).toBe(1);
    s.best = 10;
    const done = claimFeats(s);
    expect(done.map((f) => f.need)).toEqual([5, 10]);
    expect(claimFeats(s)).toEqual([]);
    expect(renown(s)).toBeGreaterThan(1);
    s.run.heroes[0] = 4;
    const dps = heroDps(s, 0);
    s.stats.taps = 100;
    expect(claimFeats(s).length).toBe(1);
    expect(heroDps(s, 0)).toBeGreaterThan(dps);
    // A feat done stays done when what it counted is given up.
    s.run.top = 40;
    rebirth(s);
    expect(s.feats.length).toBe(3);
    // And the rebirth is itself a feat.
    expect(claimFeats(s).map((f) => f.kind)).toEqual(['rebirths']);
  });
});
