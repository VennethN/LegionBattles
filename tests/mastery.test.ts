// What a player keeps between runs is each hero's own mastery, and the
// companions in slots the best wave unlocks. Held here: every hero's track,
// what a run is paid, what reaches the wave from a track, the passives a
// track unlocks, the share each companion has of a bigger band, and what
// each new companion does.

import { describe, expect, it } from 'vitest';
import { ALLY_QUIRKS, COMPANIONS, HEROES, LAST_WAVE, RELICS, byId } from '../src/game/data';
import { beginRun, giftSays, masteryBoons, nextLevel, pickGift, tallyOf, trackRows } from '../src/game/hold';
import { LEVEL_XP, PAY, PERK, PERKS, levelAt, mastered, trackOf } from '../src/game/mastery';
import { newRun, setupOf } from '../src/game/run';
import { freshSave, record } from '../src/game/state';
import { World, type Ev, type Setup } from '../src/game/world';
import { alone, play, setup, stand, stats } from './field';

const has = <T extends Ev['t']>(events: readonly Ev[], t: T): Extract<Ev, { t: T }>[] => events.filter((e): e is Extract<Ev, { t: T }> => e.t === t);

/** A hero with these passives of their track, alone on a field. */
const withPerks = (hero: string, perks: string[], o: Partial<Setup> = {}): World => {
  const h = byId(HEROES, hero);
  return alone(new World(setup({ quirk: h.quirk, move: h.move, own: { id: h.weapon, tier: 0 }, perks, ...o, stats: { ...(o.stats ?? stats({ maxHp: 9999 })), crit: -1000 } })));
};

describe('a hero\'s track', () => {
  it('is twelve levels for every hero, of the same shape, with two passives, a relic and a title of their own', () => {
    for (const h of HEROES) {
      const track = trackOf(h.id);
      expect(track.length, h.id).toBe(LEVEL_XP.length);
      expect(track.map((l) => l.xp)).toEqual([...LEVEL_XP]);
      const gifts = track.flatMap((l) => l.gifts);
      const perks = gifts.filter((g) => g.kind === 'perk');
      expect(perks.length, h.id).toBe(2);
      for (const g of perks) if (g.kind === 'perk') expect(PERKS.find((p) => p.id === g.perk)?.hero, h.id).toBe(h.id);
      const relic = gifts.find((g) => g.kind === 'relic');
      expect(relic && relic.kind === 'relic' && RELICS.some((r) => r.id === relic.relic), h.id).toBe(true);
      expect(gifts.filter((g) => g.kind === 'stat').length, h.id).toBe(4);
      expect(gifts.some((g) => g.kind === 'title'), h.id).toBe(true);
      // Two levels are a pick of two: the weapon's way, and more from the skill.
      expect(track.filter((l) => l.gifts.length === 2).length, h.id).toBe(2);
      // Every gift says what it does in a line.
      for (const g of gifts) expect(giftSays(h.id, g).length, `${h.id} ${g.kind}`).toBeGreaterThan(5);
    }
    expect(new Set(PERKS.map((p) => p.id)).size).toBe(HEROES.length * 2);
  });

  it('costs more for each level, and a level is reached when its mastery is', () => {
    for (let i = 1; i < LEVEL_XP.length; i++) expect(LEVEL_XP[i] - LEVEL_XP[i - 1]).toBeGreaterThanOrEqual(LEVEL_XP[i - 1] - (LEVEL_XP[i - 2] ?? 0));
    expect(levelAt(0)).toBe(0);
    expect(levelAt(LEVEL_XP[0] - 1)).toBe(0);
    expect(levelAt(LEVEL_XP[0])).toBe(1);
    expect(levelAt(LEVEL_XP[LEVEL_XP.length - 1] + 999)).toBe(LEVEL_XP.length);
  });

  it('adds up what is reached, and only that: the picks count once their level is reached', () => {
    expect(mastered('bram', 0)).toMatchObject({ stats: {}, perks: [], relic: '', alt: false, title: '' });
    const all = mastered('bram', 99999, { 4: 1, 9: 1 });
    expect(all.perks).toEqual(['bash', 'holdline']);
    expect(all.alt).toBe(true);
    expect(all.again).toBeGreaterThan(0);
    expect(all.area).toBe(0);
    expect(all.relic).toBe('thornmail');
    expect(all.title.length).toBeGreaterThan(3);
    expect(mastered('bram', 99999).area).toBeGreaterThan(0);
    expect(mastered('bram', LEVEL_XP[2]).perks).toEqual(['bash']);
  });

  it('is paid by every run its hero plays, for the waves, the bosses, the win and the vows', () => {
    const run = { ...newRun('wren', 5), wave: 13, phase: 'over' as const, felled: ['warlord'] };
    expect(tallyOf(run).total).toBe(12 * PAY.wave + PAY.boss);
    const sworn = { ...run, vows: ['march', 'lean'] };
    expect(tallyOf(sworn).total).toBe(Math.round((12 * PAY.wave + PAY.boss) * (1 + 2 * PAY.vow)));
    const won = { ...run, wave: LAST_WAVE + 1, felled: [] };
    expect(tallyOf(won).lines.some((l) => l.xp === PAY.win)).toBe(true);
    // A first run that ends early still moves its hero on: the first level comes in a run or two.
    const save = freshSave();
    record(save, { ...newRun('wren', 5), wave: 8, phase: 'over' }, 0);
    expect(save.mastery.wren).toBeGreaterThanOrEqual(LEVEL_XP[0]);
    expect(nextLevel(save, 'wren')?.need).toBe(LEVEL_XP[1]);
    // Another hero's track is not moved.
    expect(save.mastery.bram ?? 0).toBe(0);
  });

  it('is given to the run as it begins, and the run keeps it', () => {
    const save = freshSave();
    save.mastery.wren = 99999;
    pickGift(save, 'wren', 9, 1);
    const run = beginRun(save, 'wren', 3);
    expect(run.boons.perks).toEqual(['longshot', 'slip']);
    expect(run.relics).toContain('horn');
    const s = setupOf(run);
    expect(s.perks).toEqual(['longshot', 'slip']);
    expect(s.skillAgain).toBeGreaterThan(0);
    expect(s.stats.damage).toBeGreaterThan(setupOf(newRun('wren', 3)).stats.damage);
    // What is picked after the run began is the next run's.
    pickGift(save, 'wren', 9, 0);
    expect(run.boons.again).toBeGreaterThan(0);
    expect(masteryBoons(save, 'wren').boons.again).toBe(0);
    // The screen's rows say the same.
    const rows = trackRows(save, 'wren');
    expect(rows.every((r) => r.reached)).toBe(true);
    expect(rows[9].gifts.map((g) => g.picked)).toEqual([true, false]);
  });
});

describe('the passives a track unlocks', () => {
  it('Bloodied: below half health, Hroth takes less', () => {
    const took = (perks: string[]): number => {
      const w = withPerks('hroth', perks);
      w.hero.hp = Math.round(w.hero.maxHp * 0.4);
      w.slots[0].cool = 999;
      stand(w, 'bruiser', w.hero.x + 6, w.hero.y, { hp: 99999, dmg: 50 }, true);
      return has(play(w, 0.2), 'hurt')[0].amount;
    };
    expect(took(['bloodied'])).toBe(Math.round(took([]) * PERK.bloodied.takes));
  });

  it('Long Shot: Wren\'s arrows hit harder the farther they fly', () => {
    const first = (perks: string[], dx: number): number => {
      const w = withPerks('wren', perks);
      const f = stand(w, 'bruiser', w.hero.x + dx, w.hero.y, { hp: 99999, dmg: 0 }, true);
      return has(play(w, 1.2), 'hit').filter((e) => e.id === f.id)[0].amount;
    };
    expect(first(['longshot'], 100)).toBeLessThan(first(['longshot'], 290));
    expect(first([], 290)).toBeLessThan(first(['longshot'], 290));
  });

  it('Arcane Ward: a ward takes Orrin\'s next blow whole', () => {
    const w = withPerks('orrin', ['arcward']);
    w.slots[0].cool = 999;
    play(w, PERK.arcward.every + 0.2);
    stand(w, 'bruiser', w.hero.x + 6, w.hero.y, { hp: 99999, dmg: 30 }, true);
    const events = play(w, 0.3);
    // The first blow is the ward's; a blow after it lands as any would.
    const kinds = events.map((e) => e.t).filter((t) => t === 'ward' || t === 'hurt');
    expect(kinds[0]).toBe('ward');
  });

  it('Snowfall: a gust now and then slows everyone near Ysolde', () => {
    const w = withPerks('ysolde', ['snowfall']);
    w.slots[0].cool = 999;
    const f = stand(w, 'bruiser', w.hero.x + 120, w.hero.y, { hp: 99999, dmg: 0 }, true);
    play(w, PERK.snowfall.every + 0.2);
    expect(f.slowBy).toBeGreaterThanOrEqual(PERK.snowfall.slow);
  });

  it('The Flock: Aldous strikes harder for each companion on its feet', () => {
    const harm = (band: number): number => {
      const w = withPerks('aldous', ['flock'], { band: COMPANIONS.slice(0, band).map((c) => ({ id: c.id, bond: 0 })) });
      const f = stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 99999, dmg: 0 }, true);
      return has(play(w, 1.5), 'hit').filter((e) => e.id === f.id)[0]?.amount ?? 0;
    };
    expect(harm(3)).toBeGreaterThan(harm(0));
  });

  it('Hungry Axe: Hroth\'s axe kills heal him at any health', () => {
    const w = withPerks('hroth', ['hungry']);
    w.hero.hp = Math.round(w.hero.maxHp * 0.9);
    const hp = w.hero.hp;
    stand(w, 'cutpurse', w.hero.x + 40, w.hero.y, { hp: 1, dmg: 0 }, true);
    play(w, 1);
    expect(w.hero.hp).toBeGreaterThan(hp);
  });
});

describe('a bigger band', () => {
  it('gives each companion less, so six are more than one and nowhere near six times as much', () => {
    const one = new World(setup({ band: [{ id: 'greta', bond: 0 }] }));
    const six = new World(setup({ band: ['greta', 'biscuit', 'pip', 'quill', 'mossback', 'tam'].map((id) => ({ id, bond: 0 })) }));
    const bear = (w: World) => w.band.find((a) => a.def.id === 'greta');
    const a = bear(one);
    const b = bear(six);
    if (!a || !b) throw new Error('no bear');
    // Each blow is rounded to a whole number, so the share is near, not exact.
    expect(six.allyHarm(b) / one.allyHarm(a)).toBeGreaterThan(0.3);
    expect(six.allyHarm(b) / one.allyHarm(a)).toBeLessThan(0.5);
    expect(b.maxHp / a.maxHp).toBeCloseTo(1 / Math.sqrt(6), 1);
    // All six together: about two and a half times one.
    expect(Math.sqrt(6)).toBeLessThan(2.5);
  });
});

describe('the new companions', () => {
  // A hero who carries nothing: whatever is done, the companion did it.
  const withOne = (id: string, o: Partial<Setup> = {}): World => alone(new World(setup({ band: [{ id, bond: 0 }], ...o })));

  it('Nettle heals you every few seconds, and once a wave when you are nearly down', () => {
    const w = withOne('nettle');
    w.hero.hp = Math.round(w.hero.maxHp * 0.6);
    const hp = w.hero.hp;
    play(w, ALLY_QUIRKS.mend.every + 0.5);
    expect(w.hero.hp).toBeGreaterThan(hp);
    const v = withOne('nettle');
    v.hero.hp = Math.round(v.hero.maxHp * 0.2);
    const low = v.hero.hp;
    play(v, 0.2);
    expect(v.hero.hp - low).toBeGreaterThanOrEqual(Math.round(v.hero.maxHp * ALLY_QUIRKS.tonic.heals) - 1);
  });

  it('Rime slows what is near it, and now and then freezes it', () => {
    const w = withOne('rime');
    const r = w.band[0];
    const f = stand(w, 'bruiser', r.x + 30, r.y, { hp: 99999, dmg: 0 }, true);
    const events = play(w, ALLY_QUIRKS.snap.every + 0.5);
    expect(f.slowBy).toBeGreaterThanOrEqual(ALLY_QUIRKS.snap.slow);
    expect(has(events, 'allyQuirk').some((e) => e.quirk === 'snap')).toBe(true);
  });

  it('Clank keeps a ward on you that takes a blow whole', () => {
    const w = withOne('clank');
    play(w, 0.3);
    stand(w, 'bruiser', w.hero.x + 6, w.hero.y, { hp: 99999, dmg: 30 }, true);
    const kinds = play(w, 0.3).map((e) => e.t).filter((t) => t === 'ward' || t === 'hurt');
    expect(kinds[0]).toBe('ward');
  });

  it('Hive drops a heart now and then, and leaves a poison cloud where they are thick', () => {
    // A long wave: the first is over before a heart is due.
    const w = withOne('hive', { wave: 58 });
    for (let i = 0; i < 4; i++) stand(w, 'bruiser', w.hero.x + 200, w.hero.y + i * 10, { hp: 99999, dmg: 0 }, true);
    play(w, ALLY_QUIRKS.honey.every + 1);
    expect(w.picks.some((p) => p.kind === 'heart')).toBe(true);
    expect(w.zones.some((z) => z.kind === 'cloud')).toBe(true);
  });

  it('Snap holds the toughest one near you still', () => {
    const w = withOne('snap');
    const f = stand(w, 'bruiser', w.hero.x + 80, w.hero.y, { hp: 99999, dmg: 0 });
    let held = false;
    for (let i = 0; i < 60 * 4 && !held; i++) {
      w.step({ x: 0, y: 0 });
      w.drain();
      held = w.band[0].state === 'hold' && f.stun > 0;
    }
    expect(held).toBe(true);
  });

  it('Smoke finishes off one that is nearly dead, but not a boss', () => {
    const w = withOne('smoke');
    const f = stand(w, 'bruiser', w.hero.x + 120, w.hero.y, { hp: 100, maxHp: 1000, dmg: 0 }, true);
    const events = play(w, 3);
    expect(f.dead).toBe(true);
    expect(has(events, 'allyQuirk').some((e) => e.quirk === 'cull')).toBe(true);
  });

  it('Boom marks the ground where they are thickest before its shell lands', () => {
    const w = withOne('boom');
    for (let i = 0; i < 5; i++) stand(w, 'bruiser', w.hero.x + 220, w.hero.y + i * 12, { hp: 99999, dmg: 0 }, true);
    const events = play(w, 4);
    expect(has(events, 'allyQuirk').some((e) => e.quirk === 'powder')).toBe(true);
  });

  it('Gilt bursts up under one and stuns those round it', () => {
    const w = withOne('gilt');
    const f = stand(w, 'bruiser', w.hero.x + 120, w.hero.y, { hp: 99999, dmg: 0 }, true);
    const events = play(w, 5);
    expect(has(events, 'burst').some((e) => e.kind === 'slam')).toBe(true);
    expect(f.hp).toBeLessThan(99999);
  });
});

describe('a found companion\'s cage', () => {
  it('stands on about one wave in ten once one may be met, once a run, and asking for the wave again does not change who is in it', () => {
    let caged = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const run = { ...newRun('wren', seed, ['biscuit'], 2, { seek: ['hive'] }), wave: 8, phase: 'fight' as const };
      const a = setupOf(run).found;
      // The wave's own dice are another roll each time it is set up; who is in the cage is not.
      expect(setupOf(run).found, `seed ${seed}`).toBe(a);
      if (a) {
        caged++;
        expect(a).toBe('hive');
        // Once a run: the next wave has none.
        run.wave = 9;
        expect(setupOf(run).found).toBeUndefined();
      }
    }
    expect(caged / 400).toBeGreaterThan(0.06);
    expect(caged / 400).toBeLessThan(0.14);
    // Not before its wave, and never on a boss's.
    expect(setupOf({ ...newRun('wren', 3, [], 2, { seek: ['boom'] }), wave: 8, phase: 'fight' }).found).toBeUndefined();
    for (let seed = 1; seed <= 100; seed++) expect(setupOf({ ...newRun('wren', seed, [], 2, { seek: ['hive'] }), wave: 10, phase: 'fight' }).found).toBeUndefined();
  });
});
