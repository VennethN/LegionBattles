// What the heroes do that a player does with them: the quirks that are
// played and not only had, the moves that are aimed, a first run's script,
// the move handed over, and coins that are lost at the bell.

import { describe, expect, it } from 'vitest';
import { botSteer } from '../src/game/bot';
import { HEROES, LATE_COIN, MOVE, MOVES, QUIRKS, ROAD, SIGNATURES, WEAPONS, byId, finishedAs, weaponOf } from '../src/game/data';
import { HANDED, handOver } from '../src/game/handover';
import { beginRun, poolOf } from '../src/game/hold';
import { HERALD_WAVE, buy, canToss, endWave, kindCounts, march, newRun, ownDef, reroll, setupOf, toss, tossOdds, type Offer, type RunData } from '../src/game/run';
import { freshSave } from '../src/game/state';
import { World, type Ev, type Setup } from '../src/game/world';
import { alone, blows, play, setup, shotAt, stand, stats } from './field';

const as = (hero: string, o: Partial<Setup> = {}): World => {
  const h = byId(HEROES, hero);
  return alone(new World(setup({ quirk: h.quirk, move: h.move, own: { id: h.weapon, tier: 0 }, ...o, stats: { ...(o.stats ?? stats({ maxHp: 9999 })), crit: -1000 } })));
};
const has = <T extends Ev['t']>(events: readonly Ev[], t: T): Extract<Ev, { t: T }>[] => events.filter((e): e is Extract<Ev, { t: T }> => e.t === t);

const ware = (o: Partial<Offer>): Offer => ({ kind: 'item', id: 'ration', tier: 0, price: 40, sold: false, locked: false, ...o });
const inCamp = (hero: string, o: Partial<RunData> = {}): RunData => ({ ...newRun(hero, 5), phase: 'camp', wave: 4, gold: 100, ...o });

describe('quirks that are played', () => {
  it('Bram: a set shield stops what comes from the side he faces, and not what comes from behind', () => {
    const w = as('bram');
    w.slots[0].cool = 999;
    play(w, 0.6);
    expect(w.trait.on).toBe(true);
    expect(w.hero.face).toBe(1);
    shotAt(w, 70);
    const front = play(w, 0.4);
    expect(has(front, 'block').map((e) => e.back)).toEqual([false]);
    expect(has(front, 'hurt').length).toBe(0);
    shotAt(w, -70);
    const behind = play(w, 0.4);
    expect(has(behind, 'block').length).toBe(0);
    expect(has(behind, 'hurt')[0].amount).toBe(Math.round(5 * QUIRKS.standfast.lets));
    // He turns to what his sword strikes at: the shield faces the fight.
    const v = as('bram');
    stand(v, 'bruiser', v.hero.x - 60, v.hero.y, { hp: 99999, dmg: 0 }, true);
    play(v, 0.5);
    expect(v.hero.face).toBe(-1);
  });

  it('Orrin: his staff is finished as the last weapon he bought, with its kinds and what it leaves', () => {
    const run = inCamp('orrin', { offers: [ware({ kind: 'weapon', id: 'torch' }), ware({ kind: 'weapon', id: 'frost' })] });
    expect(ownDef(run).kinds).toEqual(['arcane']);
    expect(kindCounts(run).arcane).toBe(1);
    buy(run, 0);
    expect(run.taken).toBe('torch');
    expect(ownDef(run).kinds).toEqual(weaponOf('torch').kinds);
    expect(ownDef(run).burn).toEqual(weaponOf('torch').burn);
    // A blunt thing: it stuns.
    expect(ownDef(run).stun).toBe(QUIRKS.unfinished.blunt);
    // The staff and the torch are two of fire now, and the staff is arcane no longer.
    expect(kindCounts(run)).toMatchObject({ fire: 2, arcane: 0 });
    buy(run, 1);
    expect(ownDef(run).slow).toBe(weaponOf('frost').slow);
    expect(ownDef(run).burn).toBeUndefined();
    // On the field its bolt does what that weapon does.
    const burning = as('orrin', { taken: 'torch' });
    const f = stand(burning, 'bruiser', burning.hero.x + 200, burning.hero.y, { hp: 99999 }, true);
    play(burning, 1.2);
    expect(f.burn).toBeGreaterThan(0);
    expect(burning.trait.on).toBe(true);
    const cloudy = as('orrin', { taken: 'venom' });
    stand(cloudy, 'bruiser', cloudy.hero.x + 200, cloudy.hero.y, { hp: 99999 }, true);
    play(cloudy, 1.2);
    expect(cloudy.zones.some((z) => z.kind === 'cloud')).toBe(true);
    const plain = as('orrin');
    expect(plain.trait.on).toBe(false);
    expect(plain.own?.def.kinds).toEqual(['arcane']);
    // What each plain kind gives: a bow's reach, a pole's line, a blade's edge, a thrown thing's skip.
    const staff = weaponOf('unfinished');
    expect(finishedAs(staff, weaponOf('bow')).range).toBe(staff.range + QUIRKS.unfinished.bow);
    expect(finishedAs(staff, weaponOf('spear')).pierce).toBe((staff.pierce ?? 0) + QUIRKS.unfinished.pole);
    expect(finishedAs(staff, weaponOf('sword')).crit).toBe(staff.crit + QUIRKS.unfinished.blade);
    expect(finishedAs(staff, weaponOf('sling')).leaps).toBe(QUIRKS.unfinished.thrown);
    // Nobody else's own weapon changes for what they buy.
    const other = inCamp('bram', { offers: [ware({ kind: 'weapon', id: 'torch' })] });
    buy(other, 0);
    expect(ownDef(other)).toEqual(weaponOf('gatekeeper'));
  });

  it('Fenn: his knife knocks coins loose, and the coins he holds are harm, full at 80', () => {
    const coins = (quirk: Setup['quirk']): number => {
      const w = alone(new World(setup({ wave: 8, quirk, own: { id: 'headstails', tier: 0 } })));
      stand(w, 'bruiser', w.hero.x + 50, w.hero.y, { hp: 999999, dmg: 1 });
      play(w, 30);
      return w.gold + w.picks.filter((p) => p.kind === 'coin').length;
    };
    expect(coins('double')).toBeGreaterThan(0);
    expect(coins(null)).toBe(0);
    const harm = (purse: number): number => {
      const w = as('fenn', { purse });
      const f = stand(w, 'bruiser', w.hero.x + 50, w.hero.y, { hp: 999999 }, true);
      return Math.max(...blows(play(w, 1), f.id));
    };
    expect(QUIRKS.double.coins * 100 * QUIRKS.double.most).toBe(80);
    expect(harm(40)).toBeGreaterThan(harm(0));
    expect(harm(100000)).toBe(harm(80));
    expect(as('fenn', { purse: 40 }).trait.share).toBeCloseTo(0.5);
  });

  it('Fenn: once in a camp he tosses for a ware: heads it is free, tails it is paid for and gone', () => {
    let heads = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const run = inCamp('fenn', { dice: seed * 7919, offers: [ware({}), ware({ id: 'boots' })] });
      expect(canToss(run, 0)).toBe(true);
      const how = toss(run, 0);
      expect(run.offers[0].sold).toBe(true);
      if (how === 'heads') {
        heads++;
        expect(run.gold).toBe(100);
        expect(run.items).toEqual(['ration']);
      } else {
        expect(how).toBe('tails');
        expect(run.gold).toBe(60);
        expect(run.items).toEqual([]);
      }
      // Once in a camp.
      expect(canToss(run, 1)).toBe(false);
      expect(toss(run, 1)).toBeNull();
    }
    expect(heads).toBeGreaterThan(70);
    expect(heads).toBeLessThan(130);
    // Luck tilts the coin, though never past three in four.
    const lucky = inCamp('fenn', { ups: [{ stat: 'luck', by: 40 }] });
    expect(tossOdds(lucky)).toBeCloseTo(QUIRKS.double.heads + 40 * QUIRKS.double.luck);
    expect(tossOdds(inCamp('fenn', { ups: [{ stat: 'luck', by: 4000 }] }))).toBe(QUIRKS.double.best);
    // He cannot toss for what he could not pay for, and nobody else tosses at all.
    expect(canToss(inCamp('fenn', { gold: 10, offers: [ware({})] }), 0)).toBe(false);
    expect(canToss(inCamp('bram', { offers: [ware({})] }), 0)).toBe(false);
    // The next camp has a toss of its own.
    const run = inCamp('fenn', { offers: [ware({})] });
    toss(run, 0);
    run.phase = 'fight';
    const w = new World(setupOf(run));
    Object.assign(w, { over: 'cleared' });
    endWave(run, w);
    expect(run.tossed).toBe(false);
  });

  it('Nan: fire near her never goes out, far from her it does, and one she lights again burns hotter', () => {
    const w = as('nan');
    w.slots[0].cool = 999;
    const near = stand(w, 'bruiser', w.hero.x + 150, w.hero.y, { hp: 999999, burn: 1, burnBy: 2 }, true);
    const far = stand(w, 'bruiser', w.hero.x + 500, w.hero.y, { hp: 999999, burn: 1, burnBy: 2 }, true);
    play(w, 3);
    expect(near.burn).toBeGreaterThan(0);
    expect(far.burn).toBeLessThanOrEqual(0);
    expect(w.trait.on).toBe(true);
    const v = as('nan');
    const f = stand(v, 'bruiser', v.hero.x + 150, v.hero.y, { hp: 999999 }, true);
    play(v, 1.2);
    const first = f.burnBy;
    expect(first).toBeGreaterThan(0);
    play(v, weaponOf('hearthbrand').every[0] + 0.1);
    expect(f.burnBy).toBeCloseTo(first * (1 + QUIRKS.banked.hotter));
    play(v, 20);
    expect(f.burnBy).toBeCloseTo(first * QUIRKS.banked.most);
    // Another hero with her staff lights the same fire each time.
    const plain = alone(new World(setup({ own: { id: 'hearthbrand', tier: 0 } })));
    const g = stand(plain, 'bruiser', plain.hero.x + 150, plain.hero.y, { hp: 999999 }, true);
    play(plain, 6);
    expect(g.burnBy).toBeCloseTo(first);
  });

  it('Isaura: riding straight couches her lance for one great thrust; a sharp turn, a halt or a wall loses it', () => {
    const w = as('isaura');
    const f = stand(w, 'bruiser', w.hero.x + 420, w.hero.y + 30, { hp: 999999, dmg: 0 }, true);
    const ride = play(w, 2.7, { x: 1, y: 0 });
    const b = blows(ride, f.id);
    expect(b.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...b)).toBeGreaterThanOrEqual(Math.floor(Math.min(...b) * QUIRKS.tilt.times) - 1);
    expect(has(ride, 'strike').filter((e) => e.great).length).toBe(1);
    expect(has(ride, 'quirk').map((e) => e.on)).toEqual([true, false]);
    // The thrust spent it: she has to ride straight again.
    expect(w.trait.share).toBeLessThan(1);
    const turned = as('isaura');
    play(turned, 1.2, { x: 1, y: 0 });
    play(turned, 1.2, { x: 0, y: 1 });
    expect(turned.trait.on).toBe(false);
    expect(turned.hero.ran).toBeCloseTo(1.2, 1);
    // A gentle turn is still the same ride.
    const gentle = as('isaura');
    play(gentle, 1, { x: 1, y: 0 });
    play(gentle, 0.8, { x: 1, y: 0.5 });
    expect(gentle.trait.on).toBe(true);
    play(gentle, QUIRKS.tilt.slack + 0.1);
    expect(gentle.trait.share).toBe(0);
    // Riding into a wall is not riding.
    const walled = as('isaura');
    walled.hero.x = walled.w - 40;
    play(walled, 2.5, { x: 1, y: 0 });
    expect(walled.trait.on).toBe(false);
  });

  it('Hroth: under a third of his health he hits far harder and his axe feeds him; he does not mend by himself, and gets up once', () => {
    const harm = (hp: number): number => {
      const w = as('hroth', { stats: stats({ maxHp: 100 }) });
      w.hero.hp = hp;
      const f = stand(w, 'bruiser', w.hero.x + 80, w.hero.y, { hp: 999999, dmg: 0 }, true);
      return Math.max(...blows(play(w, 0.5), f.id));
    };
    expect(harm(20)).toBeGreaterThanOrEqual(Math.floor(harm(100) * (1 + QUIRKS.gravedebt.more)) - 1);
    expect(harm(50)).toBe(harm(100));
    const fed = (hp: number): number => {
      const w = as('hroth', { stats: stats({ maxHp: 100 }) });
      w.hero.hp = hp;
      stand(w, 'cutpurse', w.hero.x + 60, w.hero.y, { hp: 1, dmg: 0 }, true);
      play(w, 0.6);
      return w.hero.hp - hp;
    };
    expect(fed(20)).toBe(QUIRKS.gravedebt.mends);
    expect(fed(60)).toBe(0);
    const w = as('hroth', { stats: stats({ maxHp: 30, regen: 50 }) });
    w.slots[0].cool = 999;
    w.hero.hp = 3;
    play(w, 3);
    expect(w.hero.hp).toBe(3);
    expect(w.trait.on).toBe(true);
    stand(w, 'bruiser', w.hero.x + 8, w.hero.y, { hp: 99999, dmg: 50 }, true);
    const events = play(w, 0.1);
    expect(w.over).toBeNull();
    expect(has(events, 'rise').length).toBe(1);
    expect(w.hero.hp).toBe(Math.round(30 * QUIRKS.gravedebt.rises));
    expect(w.rose).toBe(true);
    const v = as('hroth', { stats: stats({ maxHp: 30 }), spare: false });
    v.slots[0].cool = 999;
    stand(v, 'bruiser', v.hero.x + 8, v.hero.y, { hp: 99999, dmg: 500 }, true);
    play(v, 0.1);
    expect(v.over).toBe('dead');
  });

  it('Aldous: a companion who has strayed from his fold is not mended with him', () => {
    const w = as('aldous', { band: [{ id: 'mossback', bond: 0 }], stats: stats({ maxHp: 30 }) });
    w.slots[0].cool = 999;
    const turtle = w.band[0];
    turtle.hp = 5;
    turtle.x = w.hero.x + QUIRKS.shepherd.r + 200;
    w.hero.hp = 10;
    w.picks.push({ id: 1, kind: 'heart', x: w.hero.x + 30, y: w.hero.y, vx: 0, vy: 0, value: 3, pulled: false, age: 1 });
    play(w, 0.3);
    expect(w.hero.hp).toBe(13);
    expect(turtle.hp).toBe(5);
  });
});

describe('moves that are aimed', () => {
  it('each is unlike the rest, and says what it does', () => {
    expect(new Set(MOVES.map((m) => m.id)).size).toBe(10);
    expect(new Set(HEROES.map((h) => h.move)).size).toBe(10);
    for (const m of MOVES) expect(m.says.length, m.id).toBeGreaterThan(20);
  });

  it('Plant the Gate: a wall across the way he faces; what it lands on is thrown back, and nothing passes it until it is gone', () => {
    const w = alone(new World(setup({ move: 'gate', fury: 1, own: { id: 'gatekeeper', tier: 0 } })));
    w.slots[0].cool = 999;
    const near = stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 99999, dmg: 0 }, true);
    const events = play(w, 0.05, { x: 0, y: 0, act: true });
    const gate = has(events, 'gate')[0];
    expect(gate).toMatchObject({ nx: 1, ny: 0, half: byId(MOVES, 'gate').r, seconds: byId(MOVES, 'gate').seconds });
    expect(gate.x).toBe(w.hero.x + MOVE.gateAhead);
    expect(near.hp).toBeLessThan(99999);
    expect(near.stun).toBeGreaterThan(0);
    const walker = stand(w, 'cutpurse', w.hero.x + 300, w.hero.y, { hp: 99999, dmg: 0 });
    shotAt(w, 200);
    const held = play(w, 4);
    expect(walker.x).toBeGreaterThan(gate.x);
    expect(has(held, 'block').length).toBe(1);
    expect(has(held, 'hurt').length).toBe(0);
    play(w, 1.2);
    expect(w.walls.length).toBe(0);
    play(w, 3);
    expect(walker.x).toBeLessThan(w.hero.x + 60);
    // It goes the way he is steered, when he is.
    const up = alone(new World(setup({ move: 'gate', fury: 1 })));
    expect(has(play(up, 0.05, { x: 0, y: -1, act: true }), 'gate')[0]).toMatchObject({ nx: 0, ny: -1 });
  });

  it('The One That Matters: one arrow at the strongest in reach, worth a dozen blows, and two dozen at full Unseen', () => {
    const one = (safe: number): { amount: number; crit: boolean; weak: number } => {
      const w = as('wren', { fury: 1 });
      w.slots[0].cool = 999;
      Object.assign(w, { quiet: safe > 0 ? QUIRKS.unseen.most : 0 });
      const weak = stand(w, 'cutpurse', w.hero.x + 100, w.hero.y, { hp: 50, dmg: 0 }, true);
      const strong = stand(w, 'bruiser', w.hero.x - 300, w.hero.y + 100, { hp: 99999, dmg: 0 }, true);
      const events = play(w, 0.6, { x: 0, y: 0, act: true });
      expect(has(events, 'move')[0].dx).toBeLessThan(0);
      const hits = has(events, 'hit').filter((e) => e.id === strong.id);
      expect(hits.length).toBe(1);
      return { amount: hits[0].amount, crit: hits[0].crit, weak: weak.hp };
    };
    const blow = (): number => {
      const w = as('wren');
      const f = stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 99999 }, true);
      return blows(play(w, 0.8), f.id)[0];
    };
    const fresh = one(0);
    expect(fresh.weak).toBe(50);
    expect(fresh.crit).toBe(false);
    expect(fresh.amount).toBeGreaterThanOrEqual(blow() * byId(MOVES, 'oneshot').harm * 0.9);
    const hidden = one(100);
    expect(hidden.crit).toBe(true);
    expect(hidden.amount).toBeGreaterThan(fresh.amount * 2);
    // By itself it waits for one worth it: a crowd of the weak is not.
    const w = as('wren', { fury: 1, auto: true });
    for (let i = 0; i < 6; i++) stand(w, 'cutpurse', w.hero.x + 200, w.hero.y - 60 + i * 24, { hp: 5, dmg: 0 }, true);
    expect(w.ripe).toBe(false);
    stand(w, 'bruiser', w.hero.x + 300, w.hero.y, { hp: 9999, dmg: 0, champion: 'armored' }, true);
    expect(w.ripe).toBe(true);
  });

  it('Starfall: the stars come down one after another in a line the way he faces, each marked first', () => {
    const w = as('orrin', { fury: 1 });
    w.slots[0].cool = 999;
    const on = stand(w, 'bruiser', w.hero.x, w.hero.y - MOVE.starsFrom - MOVE.starsApart, { hp: 99999 }, true);
    const behind = stand(w, 'bruiser', w.hero.x, w.hero.y + 200, { hp: 99999 }, true);
    const warns = has(play(w, 0.05, { x: 0, y: -1, act: true }), 'warn');
    expect(warns.length).toBe(MOVE.stars);
    warns.forEach((e, i) => {
      expect(e.kind).toBe('star');
      expect(Math.abs(e.x - w.hero.x)).toBeLessThan(20);
      expect(Math.abs(w.hero.y - e.y - (MOVE.starsFrom + i * MOVE.starsApart))).toBeLessThan(20);
      if (i > 0) expect(e.seconds).toBeGreaterThan(warns[i - 1].seconds);
    });
    play(w, 2.5);
    expect(on.hp).toBeLessThan(99999);
    expect(behind.hp).toBe(99999);
  });

  it('Charge: a run the way she is steered, through everyone, who are struck and thrown aside', () => {
    const w = as('isaura', { fury: 1, stats: stats({ maxHp: 50 }) });
    w.slots[0].cool = 999;
    const x0 = w.hero.x;
    const foes = [60, 120, 180].map((d) => stand(w, 'bruiser', x0 + d, w.hero.y + 6, { hp: 99999, dmg: 40 }, true));
    const off = stand(w, 'bruiser', x0, w.hero.y + 300, { hp: 99999 }, true);
    const events = play(w, 1, { x: 1, y: 0, act: true });
    expect(w.hero.x - x0).toBeGreaterThan(200);
    for (const f of foes) expect(f.hp).toBeLessThan(99999);
    expect(off.hp).toBe(99999);
    expect(has(events, 'hurt').length).toBe(0);
    expect(w.hero.dash).toBeNull();
  });

  it('Open Grave: he pays a share of his health, though never the last of it, and for some seconds does double harm and is fed by every blow', () => {
    const w = as('hroth', { stats: stats({ maxHp: 100 }) });
    const f = stand(w, 'bruiser', w.hero.x + 80, w.hero.y, { hp: 999999, dmg: 0 }, true);
    const before = Math.max(...blows(play(w, 2.2), f.id));
    w.fury = 1;
    const opened = play(w, 0.05, { x: 0, y: 0, act: true });
    expect(has(opened, 'move').map((e) => e.id)).toEqual(['opengrave']);
    expect(w.hero.hp).toBe(100 - Math.round(100 * MOVE.graveCost));
    expect(w.hero.open).toBeGreaterThan(byId(MOVES, 'opengrave').seconds - 0.2);
    const during = play(w, 2.2);
    expect(Math.max(...blows(during, f.id))).toBeGreaterThanOrEqual(before * 2 - 1);
    expect(has(during, 'mend').length).toBeGreaterThan(0);
    play(w, 5);
    expect(w.hero.open).toBe(0);
    // He stands where he was thrown to: put him back in reach. Fed back over a third, he is not in debt either.
    f.x = w.hero.x + 80;
    f.kx = 0;
    expect(w.hero.hp / w.hero.maxHp).toBeGreaterThan(QUIRKS.gravedebt.under);
    expect(Math.max(...blows(play(w, 2.2), f.id))).toBe(before);
    const low = as('hroth', { fury: 1, stats: stats({ maxHp: 100 }) });
    low.slots[0].cool = 999;
    low.hero.hp = 5;
    play(low, 0.05, { x: 0, y: 0, act: true });
    expect(low.hero.hp).toBe(1);
    expect(low.over).toBeNull();
    // By itself it is not opened by one who cannot pay for it.
    const auto = as('hroth', { fury: 1, auto: true, stats: stats({ maxHp: 100 }) });
    for (let i = 0; i < 6; i++) stand(auto, 'cutpurse', auto.hero.x + 90, auto.hero.y - 60 + i * 24, { hp: 9999, dmg: 0 }, true);
    expect(auto.ripe).toBe(true);
    auto.hero.hp = 30;
    expect(auto.ripe).toBe(false);
  });

  it('Judgment: a hammer of light falls where she stands, stuns those round her and leaves the ground holy', () => {
    const w = as('maren', { fury: 1 });
    w.slots[0].cool = 999;
    const near = stand(w, 'bruiser', w.hero.x + 100, w.hero.y, { hp: 99999, dmg: 0 }, true);
    const far = stand(w, 'bruiser', w.hero.x + 400, w.hero.y, { hp: 99999 }, true);
    const warn = has(play(w, 0.1, { x: 0, y: 0, act: true }), 'warn')[0];
    expect(warn.kind).toBe('light');
    expect(Math.hypot(warn.x - w.hero.x, warn.y - w.hero.y)).toBeLessThan(2);
    expect(near.hp).toBe(99999);
    play(w, MOVE.warn + 0.3);
    expect(near.hp).toBeLessThan(99999);
    expect(near.stun).toBeGreaterThan(0);
    expect(far.hp).toBe(99999);
    expect(w.zones.some((z) => z.kind === 'holy')).toBe(true);
  });
});

describe('a weapon of their own', () => {
  it('has numbers of its own: none is a shop weapon\'s twin, and none is the worse of the one it is drawn with', () => {
    for (const own of SIGNATURES) {
      for (const shop of WEAPONS) expect(own.dmg.join(), `${own.id} and ${shop.id}`).not.toBe(shop.dmg.join());
      const kin = byId(WEAPONS, own.icon ?? '');
      for (let t = 0; t < 4; t++) expect(own.dmg[t] / own.every[t], `${own.id} at tier ${t}`).toBeGreaterThan(kin.dmg[t] / kin.every[t]);
    }
  });
});

describe('a first run', () => {
  const through = (run: RunData, o: Partial<World> = {}): World => {
    run.phase = 'fight';
    const w = new World(setupOf(run));
    Object.assign(w, { over: 'cleared' }, o);
    endWave(run, w);
    return w;
  };

  it('is Wren with Biscuit along, and has its roads by the dice like any run', () => {
    const save = freshSave();
    const run = beginRun(save, save.last, 11);
    expect(run.hero).toBe('wren');
    expect(run.first).toBe(true);
    expect(run.band.map((b) => b.id)).toEqual(['biscuit']);
    expect(run.slots).toBe(1);
    through(run);
    expect(run.phase).toBe('camp');
    march(run);
    expect(run.phase).toBe('road');
    expect(run.roads.length).toBe(ROAD.roads);
    // The one slot is Biscuit's: no cage on the road offers another who could not join.
    for (let i = 0; i < 30; i++) {
      run.phase = 'camp';
      march(run);
      expect(run.roads.some((r) => r.omen === 'stray'), `try ${i}`).toBe(false);
    }
  });

  it('is offered weapons from a small pool, which is the armory as a new player has it: one input, given when it begins', () => {
    const save = freshSave();
    const start = poolOf(save);
    const run = beginRun(save, 'bram', 3);
    expect(run.first).toBe(true);
    expect(run.pool).toEqual(start);
    // About ten, and at least one of every plain kind but venom, which needs explaining.
    expect(start.length).toBeGreaterThanOrEqual(10);
    expect(start.length).toBeLessThanOrEqual(12);
    through(run);
    run.gold = 99999;
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      for (const o of run.offers) if (o.kind === 'weapon') seen.add(o.id);
      reroll(run);
    }
    for (const id of seen) expect(start, id).toContain(id);
    expect(seen.size).toBeGreaterThan(6);
    // A run that has ended makes the next one no first run, with the same armory until a crate is opened.
    save.ended = 1;
    const next = beginRun(save, 'bram', 3);
    expect(next.first).toBe(false);
    expect(next.pool).toEqual(start);
    // A run begun with no terms has every weapon, and one given a pool keeps to it.
    expect(newRun('bram', 3).pool).toBeNull();
    const few = newRun('bram', 3, [], ROAD.roads, { pool: ['bow', 'nothing'] });
    through(few);
    few.gold = 99999;
    for (let i = 0; i < 20; i++) {
      for (const o of few.offers) if (o.kind === 'weapon') expect(o.id).toBe('bow');
      reroll(few);
    }
  });

  it('and every run: a lone champion comes on the third wave, and felled it leaves a relic', () => {
    const run = newRun('bram', 3);
    expect(setupOf(run).herald).toBe(false);
    run.wave = HERALD_WAVE;
    expect(setupOf(run).herald).toBe(true);
    const w = alone(new World(setup({ wave: HERALD_WAVE, herald: true })));
    const came = play(w, ROAD.herald.at * w.wave.seconds + 2);
    expect(has(came, 'champion').map((e) => e.trait)).toEqual(['armored']);
    const champ = w.foes.find((f) => f.champion);
    expect(champ).toBeDefined();
    if (!champ) return;
    expect(w.herald).toBe(false);
    champ.hp = 1;
    champ.burn = 1;
    champ.burnBy = 4;
    expect(has(play(w, 0.6), 'herald').length).toBe(1);
    expect(w.herald).toBe(true);
    // The run takes the relic: one of three to choose.
    through(run, { herald: true });
    expect(run.phase).toBe('relic');
    expect(run.relicChoices.length).toBe(3);
    // No champion comes with no herald asked for.
    const plain = alone(new World(setup({ wave: HERALD_WAVE })));
    expect(has(play(plain, 12), 'champion').length).toBe(0);
  });
});

describe('the move, handed over', () => {
  it('waits for the player from the very first run of a save begun now, and is never handed over', () => {
    const s = freshSave();
    expect(s.auto).toBe(false);
    s.ended = 3;
    expect(handOver(s)).toBe(false);
    expect(s.auto).toBe(false);
  });

  it('in a save from before, plays itself in a first run and from the second waits for the player, which is said once', () => {
    const s = { ...freshSave(), auto: true, told: [] as string[] };
    expect(handOver(s)).toBe(false);
    expect(s.auto).toBe(true);
    s.ended = 1;
    expect(handOver(s)).toBe(true);
    expect(s.auto).toBe(false);
    expect(s.told).toContain(HANDED);
    // A player who turns it back on is left alone from then on.
    s.auto = true;
    s.ended = 5;
    expect(handOver(s)).toBe(false);
    expect(s.auto).toBe(true);
  });

  it('comes about twice in an early wave and three or four times late, by the kills it takes', () => {
    // Kills in a wave, as the pace report finds them: about 25 on the second wave and about 250 on the eighteenth.
    const moves = (wave: number, kills: number): number => kills / (MOVE.kills + MOVE.more * (wave - 1));
    expect(moves(2, 25)).toBeGreaterThan(1.2);
    expect(moves(2, 25)).toBeLessThan(2.6);
    expect(moves(18, 250)).toBeGreaterThan(2.4);
    expect(moves(18, 250)).toBeLessThan(4.4);
  });
});

describe('coins at the bell', () => {
  const coin = (w: World, dx: number, value = 10): void => {
    w.picks.push({ id: 5000 + w.picks.length, kind: 'coin', x: w.hero.x + dx, y: w.hero.y, vx: 0, vy: 0, value, pulled: false, age: 1 });
  };

  it('one still on the ground when the wave ends is worth half, in coins and in what coins give', () => {
    const w = alone(new World(setup({ wave: 1 })));
    play(w, w.wave.seconds - 1);
    coin(w, 500);
    play(w, 4);
    expect(w.over).toBe('cleared');
    expect(w.coins).toBe(10 * LATE_COIN);
    expect(w.gold).toBe(10 * LATE_COIN);
    expect(w.xp).toBe(10 * LATE_COIN);
    // One the hero went for is whole.
    const v = alone(new World(setup({ wave: 1 })));
    coin(v, 30);
    play(v, v.wave.seconds + 3);
    expect(v.coins).toBe(10);
  });

  it('the Magpie Feather and Biscuit bring them in whole, and one who has felled a captain loses nothing', () => {
    const magpie = alone(new World(setup({ wave: 1, relics: ['magpie'] })));
    play(magpie, magpie.wave.seconds - 3);
    coin(magpie, 500);
    play(magpie, 6);
    expect(magpie.coins).toBe(10);
    const dog = alone(new World(setup({ wave: 1, band: [{ id: 'biscuit', bond: 0 }] })));
    coin(dog, 420);
    play(dog, dog.wave.seconds + 3);
    expect(dog.coins).toBe(10);
    const captain = alone(new World(setup({ wave: 10 })));
    coin(captain, 500);
    captain.felled.push('warlord');
    play(captain, 3);
    expect(captain.over).toBe('cleared');
    expect(captain.coins).toBe(10);
  });
});

describe('the plain player', () => {
  it('lets the move loose when there is a crowd for it, stands as Bram, rides straight as Isaura and turns stars on the enemy', () => {
    const bram = as('bram', { fury: 1, stats: stats({ maxHp: 9999 }) });
    for (let i = 0; i < 5; i++) stand(bram, 'cutpurse', bram.hero.x + 80, bram.hero.y - 60 + i * 30, { hp: 99999, dmg: 0 }, true);
    expect(botSteer(bram).act).toBe(true);
    const still = as('bram', { stats: stats({ maxHp: 9999 }) });
    stand(still, 'bruiser', still.hero.x + 60, still.hero.y, { hp: 99999, dmg: 0 }, true);
    expect(botSteer(still)).toMatchObject({ x: 0, y: 0 });
    const isaura = as('isaura', { stats: stats({ maxHp: 9999 }) });
    stand(isaura, 'bruiser', isaura.hero.x + 120, isaura.hero.y, { hp: 99999, dmg: 0 }, true);
    let couched = false;
    for (let i = 0; i < 60 * 8; i++) {
      isaura.step(botSteer(isaura));
      couched ||= isaura.trait.on;
    }
    expect(couched).toBe(true);
    const orrin = as('orrin', { fury: 1, stats: stats({ maxHp: 9999 }) });
    for (let i = 0; i < 5; i++) stand(orrin, 'cutpurse', orrin.hero.x - 200, orrin.hero.y - 60 + i * 30, { hp: 99999, dmg: 0 }, true);
    const steer = botSteer(orrin);
    expect(steer.act).toBe(true);
    expect(steer.x).toBeLessThan(-0.8);
  });
});
