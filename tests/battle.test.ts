import { describe, expect, it } from 'vitest';
import { Battle, type EventKind } from '../src/game/battle';
import { ABILITIES, FEATS, HEROES, PACK_EVERY, PACK_WAITS, STAGE_ENEMIES } from '../src/game/data';
import { ABILITY, bossSeconds, buyHero, canBeat, enemyHp, goldFor, heroCost, heroOpen, kindOf, legionDps, tapDamage } from '../src/game/rules';
import { newRun, newSave, type SaveData } from '../src/game/state';

const DT = 1 / 30;

/** Runs a fight for some seconds and counts what it said. */
function run(b: Battle, seconds: number, now = { t: 1_000_000 }, each?: (kind: EventKind, a: number, b: number, flag: boolean) => void): Record<string, number> {
  const seen: Record<string, number> = {};
  for (let t = 0; t < seconds; t += DT) {
    now.t += DT * 1000;
    b.tick(DT, now.t);
    for (let i = 0; i < b.count; i++) {
      const e = b.events[i];
      seen[e.kind] = (seen[e.kind] ?? 0) + 1;
      each?.(e.kind, e.a, e.b, e.flag);
    }
  }
  return seen;
}

/** A save with some of the legion hired. */
function legion(levels: number[], stage = 1): SaveData {
  const s = newSave(11);
  levels.forEach((l, i) => (s.run.heroes[i] = l));
  s.run.stage = stage;
  s.run.top = stage;
  s.best = stage;
  // No pack comes in the middle of a test that is not about packs.
  s.packIn = 1e9;
  return s;
}

describe('the fight', () => {
  it('a legion of no one waits: the enemy stands and nothing happens to it', () => {
    const s = legion([]);
    const b = new Battle(s);
    const seen = run(b, 20);
    expect(seen.spawn).toBe(1);
    expect(seen.kill).toBeUndefined();
    expect(b.phase).toBe('fight');
    expect(b.hp).toBe(enemyHp(1));
  });

  it('taps bring an enemy down and are paid for it', () => {
    const s = legion([]);
    const b = new Battle(s);
    run(b, 1);
    const now = 5_000_000;
    let dealt = 0;
    let taps = 0;
    while (s.stats.kills === 0 && taps < 100) {
      dealt += b.tap(now);
      taps++;
    }
    expect(s.stats.kills).toBe(1);
    expect(dealt).toBeGreaterThanOrEqual(enemyHp(1));
    expect(s.run.gold).toBe(newRun().gold + goldFor(s, 1, now));
    expect(s.stats.taps).toBe(taps);
    // A tap while the next is still walking up is counted and strikes nothing.
    expect(b.phase).toBe('spawn');
    expect(b.tap(now)).toBe(0);
    expect(s.stats.taps).toBe(taps + 1);
  });

  it('a new player can hire the first hero at once, and the second after a few dozen taps', () => {
    const s = legion([]);
    const b = new Battle(s);
    const now = { t: 1_000_000 };
    expect(buyHero(s, 0, 1)).toBe(1);
    let taps = 0;
    while (s.run.gold < heroCost(s, 1) && taps < 200) {
      run(b, 0.2, now);
      b.tap(now.t);
      taps++;
    }
    expect(taps).toBeGreaterThan(5);
    expect(taps).toBeLessThan(60);
    expect(buyHero(s, 1, 1)).toBe(1);
  });

  it('heroes strike by themselves, each on its own beat, for what the rules say they do a second', () => {
    const s = legion([5, 3], 3);
    const b = new Battle(s);
    let dealt = 0;
    const seconds = 120;
    const seen = run(b, seconds, undefined, (kind, _a, dmg) => {
      if (kind === 'hit') dealt += dmg;
    });
    expect(seen.swing).toBeGreaterThan(0);
    // Every blow is told of before it lands.
    expect(Math.abs(seen.swing - seen.hit)).toBeLessThanOrEqual(HEROES.length);
    // Time is lost between one enemy and the next, so what is dealt is under the rate and not far under.
    expect(dealt).toBeLessThanOrEqual(legionDps(s) * seconds * 1.01);
    expect(dealt).toBeGreaterThan(legionDps(s) * seconds * 0.4);
    expect(s.stats.kills).toBeGreaterThan(0);
    expect(s.run.gold).toBeGreaterThan(0);
  });

  it('ten fall and the legion goes on to the next stage', () => {
    const s = legion([60]);
    const b = new Battle(s);
    const stages: number[] = [];
    run(b, 40, undefined, (kind, a, _b, flag) => {
      if (kind === 'stage' && flag) stages.push(a);
    });
    expect(stages[0]).toBe(2);
    expect(stages.length).toBeGreaterThan(1);
    expect(s.run.stage).toBe(stages[stages.length - 1]);
    expect(s.run.top).toBe(s.run.stage);
    expect(s.best).toBe(s.run.stage);
    expect(s.stats.kills).toBeGreaterThanOrEqual(STAGE_ENEMIES * (stages.length - 1));
  });

  it('a captain it cannot bring down in time turns it back, and it holds a stage behind', () => {
    const s = legion([1], 5);
    expect(canBeat(s, 5)).toBe(false);
    const b = new Battle(s);
    const seen = run(b, bossSeconds(s) + 5);
    expect(seen.fail).toBe(1);
    expect(s.run.stage).toBe(4);
    expect(s.run.holding).toBe(true);
    expect(s.run.top).toBe(5);
    // There it stays, clearing the stage over and over.
    const again = run(b, 200);
    expect(again.fail).toBeUndefined();
    expect(s.run.stage).toBe(4);
    expect(s.run.gold).toBeGreaterThan(0);
  });

  it('goes on again by itself once it is strong enough, or at once when it is told to', () => {
    const s = legion([1], 5);
    const b = new Battle(s);
    run(b, bossSeconds(s) + 5);
    expect(s.run.holding).toBe(true);
    // Told to, as weak as it was: it tries, and is turned back again.
    b.challenge();
    expect(s.run.stage).toBe(5);
    expect(s.run.holding).toBe(false);
    run(b, bossSeconds(s) + 5);
    expect(s.run.stage).toBe(4);
    expect(s.run.holding).toBe(true);
    // Leveled up, it clears the stage it holds and goes on without being told.
    s.run.heroes[0] = 80;
    run(b, 60);
    expect(s.run.holding).toBe(false);
    expect(s.run.stage).toBeGreaterThan(5);
    expect(s.stats.bosses).toBeGreaterThanOrEqual(1);
  });

  it('holds where it is told to, and a boss that is beaten pays a boss\'s gold', () => {
    const s = legion([200], 9);
    const b = new Battle(s);
    b.setAdvance(false);
    run(b, 30);
    expect(s.run.stage).toBe(9);
    expect(s.run.holding).toBe(true);
    b.setAdvance(true);
    let paid = 0;
    run(b, 30, undefined, (kind, _a, gold, flag) => {
      if (kind === 'kill' && flag && paid === 0) paid = gold;
    });
    expect(s.run.stage).toBeGreaterThan(10);
    expect(paid).toBe(goldFor(s, 10, 0));
    expect(kindOf(10)).toBe('boss');
  });
});

describe('abilities', () => {
  it('cannot be used before they are given, nor again before they are ready', () => {
    const s = legion([20], 3);
    const b = new Battle(s);
    run(b, 1);
    expect(b.use(ABILITY.RALLY, 1000)).toBe(false);
    s.best = 30;
    expect(b.use(ABILITY.RALLY, 1000)).toBe(true);
    expect(s.abilities[ABILITY.RALLY].until).toBe(1000 + ABILITIES[ABILITY.RALLY].seconds * 1000);
    expect(b.use(ABILITY.RALLY, 2000)).toBe(false);
    expect(b.use(ABILITY.RALLY, 1000 + ABILITIES[ABILITY.RALLY].cooldown * 1000)).toBe(true);
  });

  it('a rally doubles what the heroes deal while it lasts', () => {
    const plain = legion([30], 8);
    const rallied = legion([30], 8);
    // Both have been as far, so that both have the same feats to their names.
    plain.best = 30;
    rallied.best = 30;
    const a = new Battle(plain);
    const b = new Battle(rallied);
    const now = { t: 1_000_000 };
    b.use(ABILITY.RALLY, now.t);
    // Blow for blow: what is dealt over a while is not twice as much, as enemies that fall faster cost more walking up.
    let one = 0;
    let two = 0;
    run(a, 10, { t: now.t }, (kind, _a, dmg) => {
      if (kind === 'hit' && one === 0) one = dmg;
    });
    run(b, 10, { t: now.t }, (kind, _a, dmg) => {
      if (kind === 'hit' && two === 0) two = dmg;
    });
    expect(one).toBeGreaterThan(0);
    expect(two).toBeCloseTo(one * ABILITIES[ABILITY.RALLY].power);
  });

  it('a volley strikes at once for many seconds of the legion\'s damage, and needs someone to strike', () => {
    const s = legion([10], 6);
    s.best = 30;
    const b = new Battle(s);
    // Nobody stands yet.
    expect(b.phase).toBe('spawn');
    expect(b.use(ABILITY.VOLLEY, 1000)).toBe(false);
    expect(s.abilities[ABILITY.VOLLEY].ready).toBe(0);
    run(b, 1);
    const kills = s.stats.kills;
    expect(b.use(ABILITY.VOLLEY, 5_000_000)).toBe(true);
    expect(b.events[b.count - 2].kind === 'storm' || b.events[0].kind === 'storm').toBe(true);
    expect(s.stats.kills).toBe(kills + 1);
    expect(legionDps(s) * ABILITIES[ABILITY.VOLLEY].power).toBeGreaterThan(enemyHp(6));
  });
});

describe('supply packs', () => {
  it('come as the game is played, wait a while, and go if they are not opened', () => {
    const s = legion([5]);
    s.packIn = 3;
    const b = new Battle(s);
    const first = run(b, 4);
    expect(first.pack).toBe(1);
    expect(b.packLeft).toBeGreaterThan(0);
    const later = run(b, PACK_WAITS + 1);
    expect(later.packGone).toBe(1);
    expect(b.packLeft).toBe(0);
    expect(s.packIn).toBeGreaterThanOrEqual(PACK_EVERY[0] * 0.4);
    expect(s.packIn).toBeLessThanOrEqual(PACK_EVERY[1]);
    expect(b.openPack(0)).toBeNull();
  });

  it('opened, hold gold, or a while of an ability the player has', () => {
    const s = legion([5]);
    const b = new Battle(s);
    const kinds = new Set<string>();
    for (let i = 0; i < 60; i++) {
      b.packLeft = 10;
      const gold = s.run.gold;
      const prize = b.openPack(1000);
      expect(prize).not.toBeNull();
      kinds.add(prize?.kind ?? '');
      // Nothing but gold, to a player who has no abilities yet.
      expect(prize?.kind).toBe('gold');
      expect(s.run.gold).toBe(gold + (prize?.gold ?? 0));
      expect(prize?.gold).toBeGreaterThan(0);
    }
    expect(s.stats.packs).toBe(60);
    s.best = 30;
    for (let i = 0; i < 200; i++) {
      b.packLeft = 10;
      kinds.add(b.openPack(1000)?.kind ?? '');
    }
    expect(kinds).toEqual(new Set(['gold', 'rally', 'plunder']));
    expect(s.abilities[ABILITY.RALLY].until).toBeGreaterThan(1000);
    // A pack's ability costs the ability nothing: it is as ready as it was.
    expect(s.abilities[ABILITY.RALLY].ready).toBe(0);
  });
});

describe('the whole road', () => {
  it('a player who buys what they can afford gets somewhere in ten minutes, and not everywhere', () => {
    const s = newSave(5);
    const b = new Battle(s);
    const now = { t: 1_000_000 };
    const shop = (): void => {
      // The dearest hero that can be afforded, over and over: not clever, and enough.
      for (let guard = 0; guard < 200; guard++) {
        let bought = false;
        for (let i = HEROES.length - 1; i >= 0; i--) {
          if (heroOpen(s, i) && buyHero(s, i, 1) > 0) {
            bought = true;
            break;
          }
        }
        if (!bought) return;
      }
    };
    // Taps to the first hero, then nothing but buying.
    for (let t = 0; t < 600; t += 0.5) {
      run(b, 0.5, now);
      if (s.run.heroes[0] === 0) for (let k = 0; k < 3; k++) b.tap(now.t);
      shop();
    }
    expect(s.run.top).toBeGreaterThan(8);
    expect(s.run.top).toBeLessThan(60);
    expect(s.feats).toContain(FEATS[0].id);
    expect(tapDamage(s)).toBeGreaterThan(1);
  });

  it('never says more in a tick than it has room to', () => {
    const s = legion(HEROES.map(() => 400), 2);
    s.run.camp.fill(8);
    const b = new Battle(s);
    for (let i = 0; i < 2000; i++) {
      b.tick(0.1, 1_000_000 + i * 100);
      expect(b.count).toBeLessThanOrEqual(b.events.length);
    }
    expect(s.run.stage).toBeGreaterThan(20);
  });
});
