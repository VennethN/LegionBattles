// The second way of each hero's own weapon: ten rules, one to a weapon,
// each chosen in place of one of the three it learns. Each is held to doing
// what its line says, to standing in for the first rule of its level, and
// to doing nothing a level before.

import { describe, expect, it } from 'vitest';
import { ALT, BAND, HEROES, OWN, OWN_ALTS, OWN_GROWS, OWN_RULES, QUIRKS, SIGNATURES, altAt, altChoice, byId, ownRules } from '../src/game/data';
import { beginRun, pickGift } from '../src/game/hold';
import { LEVEL_XP, trackOf } from '../src/game/mastery';
import { newRun, setupOf } from '../src/game/run';
import { freshSave } from '../src/game/state';
import { World, type Ev, type Setup } from '../src/game/world';
import { alone, blows, play, setup, shotAt, stand, stats } from './field';

/** A hero whose own weapon has learned this many of its rules, by the second way or the first. */
const at = (hero: string, tier: number, alt: boolean, o: Partial<Setup> = {}): World => {
  const h = byId(HEROES, hero);
  return alone(new World(setup({ quirk: h.quirk, move: h.move, own: { id: h.weapon, tier }, alt, ...o, stats: { ...(o.stats ?? stats({ maxHp: 9999 })), crit: -1000 } })));
};
const has = <T extends Ev['t']>(events: readonly Ev[], t: T): Extract<Ev, { t: T }>[] => events.filter((e): e is Extract<Ev, { t: T }> => e.t === t);
const struck = (events: readonly Ev[]): Set<number> => new Set(has(events, 'hit').filter((e) => !e.soft).map((e) => e.id));

describe('the second way of a weapon of their own', () => {
  it('is one rule for each of the ten, at a level the weapon has a rule for, and unlike every other', () => {
    expect(OWN_ALTS.length).toBe(10);
    expect(new Set([...OWN_RULES, ...OWN_ALTS].map((r) => r.says)).size).toBe(40);
    for (const w of SIGNATURES) {
      const choice = altChoice(w.id);
      expect(choice, w.id).not.toBeNull();
      expect(OWN_GROWS).toContain(choice?.level);
      const first = ownRules(w.id, 3);
      const second = ownRules(w.id, 3, true);
      // Two of the three are as they were, and the third is the other way.
      expect(second.filter((r, i) => r.says === first[i].says).length, w.id).toBe(2);
      expect(second.filter((r) => r.alt).map((r) => r.says)).toEqual([choice?.second]);
      expect(first.some((r) => r.alt)).toBe(false);
      expect(altAt(w.id)).toBeGreaterThan(0);
    }
    expect(altAt('sword')).toBe(0);
  });

  it('is given to a run by the Hold once the hero\'s track has reached it and the player has picked it', () => {
    const save = freshSave();
    const level = trackOf('bram').findIndex((lv) => lv.gifts.some((g) => g.kind === 'way' && g.alt));
    expect(pickGift(save, 'bram', level, 1)).toBe(true);
    // Picked before it is reached, it waits.
    expect(setupOf(beginRun(save, 'bram', 5)).alt).toBe(false);
    save.mastery.bram = LEVEL_XP[level];
    expect(setupOf(beginRun(save, 'bram', 5)).alt).toBe(true);
    // The first way can be picked again at any time.
    pickGift(save, 'bram', level, 0);
    expect(setupOf(beginRun(save, 'bram', 5)).alt).toBe(false);
    pickGift(save, 'bram', level, 1);
    // It is the hero's own choice: another hero's runs are as they were.
    expect(setupOf(beginRun(save, 'wren', 5)).alt).toBe(false);
    expect(setupOf(newRun('bram', 5)).alt).toBe(false);
  });

  it('Gatekeeper, 5: a blocked shot fills Fury, and is not thrown back', () => {
    const blocked = (tier: number, alt: boolean): [number, boolean] => {
      const w = at('bram', tier, alt);
      w.slots[0].cool = 999;
      play(w, 0.6);
      shotAt(w, 70);
      const events = play(w, 0.3);
      return [w.fury, has(events, 'block')[0].back];
    };
    expect(blocked(1, true)).toEqual([ALT.gatekeeper.fury, false]);
    expect(blocked(1, false)).toEqual([0, true]);
    expect(blocked(0, true)).toEqual([0, false]);
  });

  it('Whisper, 10: at full Unseen an arrow bounces to two more, and does not go through', () => {
    const reached = (tier: number, alt: boolean, safe: number): number => {
      const w = at('wren', tier, alt);
      Object.assign(w, { quiet: safe > 0 ? QUIRKS.unseen.most : 0 });
      // Three in a ring round the first, none behind it in the arrow's line.
      stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 99999, dmg: 0 }, true);
      stand(w, 'bruiser', w.hero.x + 200, w.hero.y - 90, { hp: 99999, dmg: 0 }, true);
      stand(w, 'bruiser', w.hero.x + 200, w.hero.y + 90, { hp: 99999, dmg: 0 }, true);
      return struck(play(w, 0.9)).size;
    };
    expect(reached(2, true, 100)).toBe(3);
    expect(reached(2, true, 0)).toBe(1);
    expect(reached(2, false, 100)).toBe(1);
    expect(reached(1, true, 100)).toBe(1);
  });

  it('The Unfinished Staff, 5: every fifth bolt does three times the damage, and none is cast twice', () => {
    const bolts = (tier: number, alt: boolean): number[] => {
      const w = at('orrin', tier, alt);
      const f = stand(w, 'bruiser', w.hero.x + 250, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      const all: Ev[] = [];
      for (let i = 0; i < 60 * 14 && blows(all, f.id).length < 10; i++) {
        w.step({ x: 0, y: 0 });
        all.push(...w.drain());
        // It is not to be knocked out of reach.
        f.x = w.hero.x + 250;
        f.kx = 0;
      }
      return blows(all, f.id).slice(0, 10);
    };
    const great = bolts(1, true);
    const plain = Math.min(...great);
    expect(great.map((b) => Math.round(b / plain))).toEqual([1, 1, 1, 1, ALT.unfinished.times, 1, 1, 1, 1, ALT.unfinished.times]);
    expect(new Set(bolts(0, true)).size).toBe(1);
  });

  it('Heads and Tails, 5: a crit heals 1 HP, though not more often than so, and knocks no coin loose for it', () => {
    const healed = (tier: number, alt: boolean): number => {
      const w = alone(new World(setup({ quirk: 'double', own: { id: 'headstails', tier }, alt, stats: stats({ maxHp: 9999, crit: 1000 }) })));
      w.hero.hp = 100;
      stand(w, 'bruiser', w.hero.x + 50, w.hero.y, { hp: 9999999, dmg: 0 });
      play(w, 6.2);
      return w.hero.hp - 100;
    };
    // Whatever the bruiser's elbows cost him, they cost him by either way: the difference is what the crits gave back.
    const got = healed(1, true) - healed(1, false);
    expect(got).toBeGreaterThanOrEqual(2);
    expect(got).toBeLessThanOrEqual(Math.ceil(6.2 / ALT.headstails.gap) * ALT.headstails.heals);
    expect(healed(0, true)).toBe(healed(0, false));
  });

  it('Hearthbrand, 15: its burn is half as hot again, and its bursts no wider', () => {
    const lit = (tier: number, alt: boolean): [number, number] => {
      const w = at('nan', tier, alt);
      const f = stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      const events = play(w, 1);
      return [f.burnBy, has(events, 'burst').filter((e) => e.kind === 'fire')[0].r];
    };
    const [hot, wide] = lit(3, true);
    const [warm, wider] = lit(3, false);
    expect(hot).toBeCloseTo(warm * ALT.hearthbrand.hotter);
    expect(wider).toBeCloseTo(wide * OWN.hearthbrand.wider);
    // A level before, the two ways are one.
    expect(lit(2, true)).toEqual(lit(2, false));
  });

  it("The Ninth's Lance, 10: after a couched thrust nothing hurts her for a moment, and a kill gives no thrust back", () => {
    const ride = (tier: number, alt: boolean): number => {
      const w = at('isaura', tier, alt);
      stand(w, 'bruiser', w.hero.x + 420, w.hero.y + 30, { hp: 9999999, dmg: 0 }, true);
      let grace = 0;
      for (let i = 0; i < 60 * 2.7; i++) {
        w.step({ x: 1, y: 0 });
        for (const e of w.drain()) if (e.t === 'strike' && e.great) grace = w.hero.grace;
      }
      return grace;
    };
    expect(ride(2, true)).toBeCloseTo(ALT.ninth.grace, 1);
    expect(ride(2, false)).toBe(0);
    expect(ride(1, true)).toBe(0);
    const thrusts = (alt: boolean): number => {
      const w = at('isaura', 2, alt);
      stand(w, 'cutpurse', w.hero.x + 100, w.hero.y, { hp: 1, dmg: 0 }, true);
      stand(w, 'bruiser', w.hero.x + 140, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      return has(play(w, 1), 'strike').length;
    };
    expect(thrusts(true)).toBe(1);
    expect(thrusts(false)).toBe(2);
  });

  it('Gravecleaver, 10: in debt his axe is faster, and what it fells does not burst', () => {
    const every = (tier: number, alt: boolean, hp: number): number => {
      const w = at('hroth', tier, alt, { stats: stats({ maxHp: 100 }) });
      w.hero.hp = hp;
      return w.everyOf(w.slots[0]);
    };
    expect(every(2, true, 20)).toBeCloseTo(every(2, false, 20) / ALT.gravecleaver.faster);
    expect(every(2, true, 90)).toBeCloseTo(every(2, false, 90));
    expect(every(1, true, 20)).toBeCloseTo(every(1, false, 20));
    const bursts = (alt: boolean): number => {
      const w = at('hroth', 2, alt, { stats: stats({ maxHp: 100 }) });
      w.hero.hp = 20;
      stand(w, 'cutpurse', w.hero.x + 60, w.hero.y, { hp: 1, dmg: 0 }, true);
      return has(play(w, 0.5), 'burst').filter((e) => e.kind === 'rise').length;
    };
    expect(bursts(true)).toBe(0);
    expect(bursts(false)).toBe(1);
  });

  it('The Passing Bell, 10: companions in his fold strike harder, and take what anyone would', () => {
    const turtle = (tier: number, alt: boolean, dx: number): [number, number] => {
      const w = at('aldous', tier, alt, { band: [{ id: 'mossback', bond: 0 }] });
      w.slots[0].cool = 999;
      const a = w.band[0];
      a.x = w.hero.x + dx;
      a.y = w.hero.y;
      const harm = w.allyHarm(a);
      stand(w, 'bruiser', a.x, a.y, { hp: 9999999, dmg: 20 }, true);
      return [harm, has(play(w, 0.1), 'allyHurt')[0].amount];
    };
    const whole = Math.round(20 * BAND.takes);
    const [plain] = turtle(1, true, 100);
    const [harder, took] = turtle(2, true, 100);
    // Each blow is rounded: the bell's share more is within a point of it.
    expect(Math.abs(harder - plain * ALT.passingbell.harder)).toBeLessThanOrEqual(1);
    expect(harder).toBeGreaterThan(plain);
    expect(took).toBe(whole);
    expect(turtle(2, false, 100)[0]).toBe(plain);
    // Strayed from the fold, it strikes as it did.
    const far = QUIRKS.shepherd.r + 150;
    expect(turtle(2, true, far)[0]).toBe(turtle(1, true, far)[0]);
  });

  it("Widow's Tear, 10: what breaks freezes those near it, and leaves no ice", () => {
    const broke = (tier: number, alt: boolean): [number, number] => {
      const w = at('ysolde', tier, alt);
      w.slots[0].cool = 999;
      const near = stand(w, 'bruiser', w.hero.x + 330, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      stand(w, 'bruiser', w.hero.x + 300, w.hero.y, { hp: 1, frozen: 1, burn: 1, burnBy: 4 }, true);
      play(w, 0.2);
      return [near.frozen > 0 ? 1 : 0, w.zones.filter((z) => z.kind === 'ice').length];
    };
    expect(broke(2, true)).toEqual([1, 0]);
    expect(broke(2, false)).toEqual([0, 1]);
    expect(broke(1, true)).toEqual([0, 0]);
  });

  it('Morningstar, 5: her holy ground is wider, and lasts as long as it did', () => {
    const ground = (tier: number, alt: boolean): [number, number] => {
      const w = at('maren', tier, alt);
      stand(w, 'bruiser', w.hero.x + 50, w.hero.y, { hp: 9999999, dmg: 0 }, true);
      play(w, 0.5);
      const z = w.zones.filter((x) => x.kind === 'holy')[0];
      return [z.r, z.life];
    };
    const [r, life] = ground(0, false);
    const [wide, kept] = ground(1, true);
    expect(wide).toBeCloseTo(r * ALT.morningstar.wider);
    expect(kept).toBeLessThan(QUIRKS.consecrate.seconds);
    expect(ground(0, true)[0]).toBeCloseTo(r);
    expect(life).toBeLessThan(QUIRKS.consecrate.seconds);
  });
});
