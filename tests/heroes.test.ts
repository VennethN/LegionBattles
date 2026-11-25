import { describe, expect, it } from 'vitest';
import { botSteer } from '../src/game/bot';
import { HEROES, MOVE, MOVES, OWN_GROWS, QUIRKS, SIGNATURES, WEAPONS, byId, ownTier, weaponOf } from '../src/game/data';
import { bandSize, newRun, setupOf } from '../src/game/run';
import { World, type Ev, type Setup } from '../src/game/world';
import { alone, blows, play, setup, stand, stats } from './field';

/**
 * A wave as one hero would fight it: their quirk, their move and their own
 * weapon, and nothing bought. No blow of theirs is a lucky one, so that
 * what a test measures is the rule and not the dice.
 */
const as = (hero: string, o: Partial<Setup> = {}): World => {
  const h = byId(HEROES, hero);
  return alone(new World(setup({ quirk: h.quirk, move: h.move, own: { id: h.weapon, tier: 0 }, ...o, stats: { ...(o.stats ?? stats({ maxHp: 9999 })), crit: -1000 } })));
};
const has = <T extends Ev['t']>(events: readonly Ev[], t: T): Extract<Ev, { t: T }>[] => events.filter((e): e is Extract<Ev, { t: T }> => e.t === t);

describe('the heroes', () => {
  it('each have a name, an epithet, who they are, a line, a weapon of their own, a quirk and a move', () => {
    expect(HEROES.length).toBe(10);
    for (const h of HEROES) {
      for (const text of [h.name, h.epithet, h.who, h.line, h.quirkName, h.says]) expect(text.length, h.id).toBeGreaterThan(3);
      expect(weaponOf(h.weapon).own, h.id).toBe(true);
      expect(byId(MOVES, h.move).name.length, h.id).toBeGreaterThan(3);
      // The picture a weapon of their own is drawn with is a plain weapon's.
      expect(WEAPONS.some((w) => w.id === weaponOf(h.weapon).icon), h.id).toBe(true);
    }
    expect(SIGNATURES.length).toBe(HEROES.length);
    for (const w of SIGNATURES) for (let t = 1; t < 4; t++) expect(w.dmg[t], w.id).toBeGreaterThan(w.dmg[t - 1]);
    expect(OWN_GROWS.map(ownTier)).toEqual([1, 2, 3]);
  });

  it('strike with their own weapon first, from their hand, and it is marked as theirs', () => {
    const w = as('bram', { weapons: [{ id: 'bow', tier: 1 }] });
    expect(w.slots.map((s) => [s.def.id, s.own])).toEqual([['gatekeeper', true], ['bow', false]]);
    expect(w.own?.def.id).toBe('gatekeeper');
    stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 9999 }, true);
    expect(has(play(w, 0.5), 'strike')[0].slot).toBe(0);
  });
});

describe('quirks', () => {
  it('Bram: standing still sets his shield, which takes its share of a blow and quickens his sword; a step drops it', () => {
    const w = as('bram', { stats: stats({ maxHp: 9999 }) });
    expect(w.trait.on).toBe(false);
    const quick = w.everyOf(w.slots[0]);
    const events = play(w, QUIRKS.standfast.after + 0.1);
    expect(w.trait.on).toBe(true);
    expect(has(events, 'quirk').map((e) => e.on)).toEqual([true]);
    expect(w.everyOf(w.slots[0])).toBeCloseTo(quick / QUIRKS.standfast.faster);
    w.slots[0].cool = 99;
    stand(w, 'bruiser', w.hero.x + 8, w.hero.y, { hp: 9999, dmg: 10 }, true);
    expect(has(play(w, 0.1), 'hurt')[0].amount).toBe(Math.round(10 * QUIRKS.standfast.lets));
    // Moving, the same blow lands whole.
    const moved = play(w, 0.7, { x: 0, y: 1 });
    expect(has(moved, 'quirk').map((e) => e.on)).toEqual([false]);
    expect(w.trait.on).toBe(false);
    const v = as('bram', { stats: stats({ maxHp: 9999 }) });
    v.slots[0].cool = 99;
    stand(v, 'bruiser', v.hero.x + 8, v.hero.y, { hp: 9999, dmg: 10 }, true);
    expect(has(play(v, 0.1, { x: 0, y: 0.2 }), 'hurt')[0].amount).toBe(10);
  });

  it('Wren: every second untouched she hits harder, up to a cap, and one blow takes half of it away', () => {
    // A long wave, as the first lasts twenty seconds. With nobody near her she needs under eight untouched.
    const w = as('wren', { wave: 58 });
    const f = stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 99999 }, true);
    const first = Math.min(...blows(play(w, 1.5), f.id));
    play(w, 20);
    expect(w.trait).toEqual({ on: true, share: 1 });
    const late = Math.min(...blows(play(w, 3), f.id));
    expect(late).toBeGreaterThanOrEqual(Math.floor(first * (1 + QUIRKS.unseen.most) * 0.92));
    expect(late).toBeGreaterThan(first);
    stand(w, 'cutpurse', w.hero.x + 5, w.hero.y, { hp: 99999, dmg: 1 }, true);
    const struck = play(w, 0.1);
    expect(has(struck, 'hurt').length).toBe(1);
    expect(has(struck, 'quirk').map((e) => e.on)).toEqual([false]);
    // A blow halves it: it is not all lost.
    expect(w.trait.share).toBeCloseTo(QUIRKS.unseen.keeps, 1);
  });

  it('Aldous: what heals him heals those in his fold, and companions near him strike faster and harder', () => {
    // He brings as many as anyone: the slots are the player's, and the same for every hero.
    expect(bandSize('aldous', 1)).toBe(1);
    expect(bandSize('bram', 1)).toBe(1);
    const w = as('aldous', { band: [{ id: 'biscuit', bond: 0 }], stats: stats({ maxHp: 30 }) });
    w.slots[0].cool = 999;
    const dog = w.band[0];
    dog.hp = 5;
    w.hero.hp = 10;
    w.picks.push({ id: 1, kind: 'heart', x: w.hero.x + 30, y: w.hero.y, vx: 0, vy: 0, value: 3, pulled: false, age: 1 });
    play(w, 0.4);
    expect(w.hero.hp).toBe(13);
    expect(dog.hp).toBe(8);
    const plain = alone(new World(setup({ band: [{ id: 'biscuit', bond: 0 }] })));
    expect(w.allyEvery(dog)).toBeCloseTo(plain.allyEvery(plain.band[0]) / QUIRKS.shepherd.faster);
    dog.x = w.hero.x + QUIRKS.shepherd.r + 50;
    expect(w.allyEvery(dog)).toBeCloseTo(plain.allyEvery(plain.band[0]));
  });

  it('Ysolde: the slowed, struck again, freeze; the frozen take more, and break into shards that slow those near', () => {
    const w = as('ysolde');
    const f = stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 99999 }, true);
    const every = weaponOf('widowstear').every[0];
    const first = play(w, 0.36 + 0.6);
    expect(f.slow).toBeGreaterThan(0);
    expect(f.frozen).toBe(0);
    const second = play(w, every);
    expect(has(second, 'freeze').map((e) => e.id)).toEqual([f.id]);
    expect(blows(second, f.id)[0]).toBeGreaterThanOrEqual(Math.floor(blows(first, f.id)[0] * QUIRKS.deepcold.more));
    expect(f.numb).toBeGreaterThan(0);
    // It cannot be frozen again at once.
    expect(has(play(w, every * 2), 'freeze').length).toBe(0);
    // One that dies frozen breaks.
    const v = as('ysolde');
    v.slots[0].cool = 999;
    stand(v, 'bruiser', v.hero.x + 300, v.hero.y, { hp: 1, frozen: 1, burn: 1, burnBy: 4 }, true);
    const near = stand(v, 'bruiser', v.hero.x + 330, v.hero.y, { hp: 9999 }, true);
    const events = play(v, 0.2);
    expect(has(events, 'burst').filter((e) => e.kind === 'frost').length).toBe(1);
    expect(near.slow).toBeGreaterThan(0);
    expect(near.hp).toBeLessThan(9999);
  });

  it('Maren: her hammer leaves holy ground that burns enemies and mends whoever of the band stands on it', () => {
    const w = as('maren', { stats: stats({ maxHp: 30 }), band: [{ id: 'biscuit', bond: 0 }] });
    const f = stand(w, 'bruiser', w.hero.x + 40, w.hero.y, { hp: 999999, dmg: 0 }, true);
    f.x = w.hero.x + 50;
    w.hero.hp = 10;
    w.band[0].hp = 3;
    const events = play(w, 1.2);
    expect(w.zones.filter((z) => z.kind === 'holy').length).toBeGreaterThan(0);
    expect(events.some((e) => e.t === 'hit' && e.soft && e.id === f.id)).toBe(true);
    w.foes.length = 0;
    w.hero.x = w.zones[0].x;
    w.hero.y = w.zones[0].y;
    w.band[0].x = w.zones[0].x;
    w.band[0].y = w.zones[0].y;
    expect(w.trait.on).toBe(true);
    play(w, QUIRKS.consecrate.mends + 0.2);
    expect(w.hero.hp).toBeGreaterThan(10);
    // Another hero's hammer leaves nothing.
    const v = alone(new World(setup({ weapons: [{ id: 'hammer', tier: 0 }] })));
    stand(v, 'bruiser', v.hero.x + 50, v.hero.y, { hp: 999999 }, true);
    play(v, 1.2);
    expect(v.zones.length).toBe(0);
  });
});

describe('the move', () => {
  it('is filled by kills, more of them on later waves, and says when it is full', () => {
    const w = as('bram');
    w.slots[0].cool = 999;
    expect(w.fury).toBe(0);
    for (let i = 0; i < MOVE.kills - 1; i++) stand(w, 'cutpurse', w.hero.x + 300, w.hero.y, { hp: 1, burn: 1, burnBy: 4 }, true);
    let events = play(w, 0.1);
    expect(w.fury).toBeCloseTo((MOVE.kills - 1) / MOVE.kills);
    expect(has(events, 'fury').length).toBe(0);
    stand(w, 'cutpurse', w.hero.x + 300, w.hero.y, { hp: 1, burn: 1, burnBy: 4 }, true);
    events = play(w, 0.6);
    expect(w.fury).toBe(1);
    expect(has(events, 'fury').length).toBe(1);
    const later = as('bram', { wave: 10 });
    later.slots[0].cool = 999;
    stand(later, 'cutpurse', later.hero.x + 300, later.hero.y, { hp: 1, burn: 1, burnBy: 4 }, true);
    play(later, 0.1);
    expect(later.fury).toBeCloseTo(1 / (MOVE.kills + MOVE.more * 9));
    // It is carried in from the wave before.
    expect(as('bram', { fury: 0.7 }).fury).toBe(0.7);
  });

  it('is let loose when asked, only when full; or by itself when there is a crowd for it', () => {
    const w = as('bram', { fury: 0.5 });
    expect(has(play(w, 0.2, { x: 1, y: 0, act: true }), 'move').length).toBe(0);
    w.fury = 1;
    const events = play(w, 0.05, { x: 1, y: 0, act: true });
    expect(has(events, 'move').map((e) => e.id)).toEqual(['gate']);
    expect(w.fury).toBe(0);
    // By itself: not with nobody about, nor with one or two, but with a crowd, a captain, or a hero in trouble.
    const auto = (foes: number, o: { hp?: number; boss?: boolean } = {}): boolean => {
      const v = as('bram', { fury: 1, auto: true, stats: stats({ maxHp: 100 }) });
      v.slots[0].cool = 999;
      if (o.hp) v.hero.hp = o.hp;
      for (let i = 0; i < foes; i++) stand(v, 'cutpurse', v.hero.x + 90, v.hero.y - 60 + i * 30, { hp: 9999, dmg: 0, boss: !!o.boss }, true);
      expect(v.ripe).toBe(has(play(v, 0.05), 'move').length === 1);
      return v.fury === 0;
    };
    expect(auto(0)).toBe(false);
    expect(auto(2)).toBe(false);
    expect(auto(MOVE.crowd)).toBe(true);
    expect(auto(1, { boss: true })).toBe(true);
    expect(auto(1, { hp: 20 })).toBe(true);
    // And never by itself where the player has turned that off.
    const manual = as('bram', { fury: 1, auto: false });
    for (let i = 0; i < 6; i++) stand(manual, 'cutpurse', manual.hero.x + 90, manual.hero.y - 60 + i * 30, { hp: 9999, dmg: 0 }, true);
    expect(has(play(manual, 0.5), 'move').length).toBe(0);
  });

  it('Starfall: stars fall one after another, each marked first', () => {
    const w = as('orrin', { fury: 1 });
    w.slots[0].cool = 999;
    const foes = [0, 1, 2, 3, 4].map((i) => stand(w, 'bruiser', w.hero.x + 200 + i * 40, w.hero.y - 80 + i * 40, { hp: 99999 }, true));
    const events = play(w, 3, { x: 0, y: 0, act: true });
    expect(has(events, 'warn').length).toBe(MOVE.stars);
    expect(has(events, 'burst').filter((e) => e.kind === 'star').length).toBe(MOVE.stars);
    expect(foes.filter((f) => f.hp < 99999).length).toBeGreaterThanOrEqual(4);
    expect(w.falls.length).toBe(0);
  });

  it('Vanish: enemies lose him and cannot strike him, and his blows are sure ones', () => {
    const w = as('fenn', { fury: 1, stats: stats({ maxHp: 50 }) });
    const f = stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 999999, dmg: 5 });
    const x0 = w.hero.x;
    play(w, 0.05, { x: 0, y: 0, act: true });
    expect(w.hero.unseen).toBeGreaterThan(1.5);
    // He walks off; it goes on to where he was.
    play(w, 1.8, { x: 0, y: 1 });
    expect(Math.abs(f.x - x0)).toBeLessThan(120);
    expect(Math.abs(f.y - (w.h / 2))).toBeLessThan(40);
    const v = as('fenn', { fury: 1, stats: stats({ maxHp: 50 }) });
    stand(v, 'bruiser', v.hero.x + 10, v.hero.y, { hp: 999999, dmg: 5 }, true);
    const events = play(v, 1.5, { x: 0, y: 0, act: true });
    expect(has(events, 'hurt').length).toBe(0);
    const hits = has(events, 'hit');
    expect(hits.length).toBeGreaterThan(1);
    expect(hits.every((e) => e.crit)).toBe(true);
  });

  it('Wildfire: a ring of fire runs out from her, and whoever it passes burns', () => {
    const w = as('nan', { fury: 1 });
    w.slots[0].cool = 999;
    const near = stand(w, 'bruiser', w.hero.x + 80, w.hero.y, { hp: 99999, dmg: 0 }, true);
    const far = stand(w, 'bruiser', w.hero.x + 280, w.hero.y, { hp: 99999 }, true);
    const out = stand(w, 'bruiser', w.hero.x + 450, w.hero.y, { hp: 99999 }, true);
    const events = play(w, 0.25, { x: 0, y: 0, act: true });
    expect(has(events, 'ring')[0].kind).toBe('fire');
    expect(near.burn).toBeGreaterThan(0);
    // It has not reached the far one yet.
    expect(far.burn).toBe(0);
    play(w, 0.6);
    expect(far.burn).toBeGreaterThan(0);
    expect(out.burn).toBe(0);
    expect(w.rings.length).toBe(0);
  });

  it('Toll: the bell stuns all who hear it, heals the hero and the band, and gets the fallen up', () => {
    const w = as('aldous', { fury: 1, stats: stats({ maxHp: 100 }), band: [{ id: 'biscuit', bond: 0 }, { id: 'greta', bond: 0 }] });
    w.slots[0].cool = 999;
    w.hero.hp = 40;
    const [dog, bear] = w.band;
    dog.hp = 0;
    dog.down = 5;
    bear.hp = 1;
    const f = stand(w, 'bruiser', w.hero.x + 250, w.hero.y, { hp: 99999, dmg: 0 }, true);
    const far = stand(w, 'bruiser', w.hero.x + 600, w.hero.y, { hp: 99999, dmg: 0 }, true);
    const events = play(w, 0.05, { x: 0, y: 0, act: true });
    expect(f.stun).toBeGreaterThan(1);
    expect(f.hp).toBeLessThan(99999);
    expect(far.stun).toBe(0);
    expect(w.hero.hp).toBe(40 + Math.ceil(100 * MOVE.tollMends));
    expect(dog.down).toBe(0);
    expect(dog.hp).toBeGreaterThan(0);
    expect(bear.hp).toBeGreaterThan(1);
    expect(has(events, 'allyUp').length).toBe(1);
  });

  it('Whiteout: everything on the field freezes, and what was in the air falls out of it', () => {
    const w = as('ysolde', { fury: 1, wave: 3 });
    w.slots[0].cool = 999;
    const foes = [100, 500, -600].map((d) => stand(w, 'poacher', w.hero.x + d, w.hero.y + 200, { hp: 99999, cool: 0 }));
    play(w, 0.9);
    expect(w.shots.some((s) => !s.mine)).toBe(true);
    const events = play(w, 0.05, { x: 0, y: 0, act: true });
    expect(has(events, 'freeze').length).toBe(3);
    for (const f of foes) expect(f.frozen).toBeGreaterThan(1.5);
    expect(w.shots.some((s) => !s.mine)).toBe(false);
    const at = foes.map((f) => f.x);
    play(w, 1);
    expect(foes.map((f) => f.x)).toEqual(at);
  });

});

describe('the plain player', () => {
  it('can play every hero through the first wave with what they start with, alone', () => {
    for (const h of HEROES) {
      const run = newRun(h.id, 99);
      const w = new World(setupOf(run));
      expect(w.own?.def.id, h.id).toBe(h.weapon);
      for (let i = 0; i < 60 * 40 && !w.over; i++) w.step(botSteer(w));
      expect(w.over, h.id).toBe('cleared');
    }
  });
});
