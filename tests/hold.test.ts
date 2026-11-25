import { describe, expect, it } from 'vitest';
import {
  BAND, BLESSINGS, BREATH, COMPANIONS, CRATES, CRATE_PRICES, DANGER, DANGERS, DEEDS, HALL, HEROES, ITEMS, KENNEL, LAST_WAVE, OMENS, PLACE_PRICE, RELICS, RENOWN, ROAD, TIERS, WEAPONS,
  thingKey, waveOf,
} from '../src/game/data';
import {
  badge, beginRun, blessPrice, blessSays, blessStep, buyBlessing, buyCrate, buyFriend, buyHero, buyPlace, buyWare, chronicleOf, count, cratePrice, crateThings, deedsOf, featSays, forksNow, hasWon,
  heroPrice, holdFull, inArmory, met, nextDeed, placePrice, setDanger, shutOf, tallyOf, termsOf, waresOf, friendPrice,
} from '../src/game/hold';
import { bandSize, blessed, endWave, march, newRun, openPack, reroll, rerollPrice, setupOf, statsOf, survived, takeRelic, type RunData } from '../src/game/run';
import { SAVE_VERSION, bandFor, freshSave, isFriend, isOpen, record, repair, type SaveData } from '../src/game/state';
import { World, type Ev } from '../src/game/world';
import { alone, play, setup, stand, stats } from './field';

const has = <T extends Ev['t']>(events: readonly Ev[], t: T): Extract<Ev, { t: T }>[] => events.filter((e): e is Extract<Ev, { t: T }> => e.t === t);

/** A save with renown to spend. */
const rich = (renown = 5000): SaveData => ({ ...freshSave(), renown, earned: renown });

/** A run that has come through a number of waves and then ended. */
const ended = (hero: string, waves: number, o: Partial<RunData> = {}): RunData => ({ ...newRun(hero, 5), wave: waves + 1, phase: 'over', ...o });

/** A wave of the run's as if it had been come through, with whatever a test says it left. */
const cleared = (run: RunData, o: Partial<World> = {}): World => {
  const w = new World(setupOf(run));
  Object.assign(w, { over: 'cleared' }, o);
  return w;
};

describe('the lists of the Hold', () => {
  it('puts every thing of a crate in one crate only, and every thing is one the game has', () => {
    const seen = new Set<string>();
    for (const c of CRATES) {
      expect(c.name.length, c.id).toBeGreaterThan(5);
      expect(c.says.length, c.id).toBeGreaterThan(5);
      expect(c.things.length, c.id).toBeGreaterThanOrEqual(3);
      for (const t of c.things) {
        expect(seen.has(thingKey(t)), thingKey(t)).toBe(false);
        seen.add(thingKey(t));
        const list: ReadonlyArray<{ id: string }> = t.kind === 'weapon' ? WEAPONS : t.kind === 'item' ? ITEMS : RELICS;
        expect(list.some((x) => x.id === t.id), thingKey(t)).toBe(true);
      }
    }
    expect(new Set(CRATES.map((c) => c.id)).size).toBe(CRATES.length);
    expect(CRATE_PRICES.length).toBe(CRATES.length);
    for (let i = 1; i < CRATE_PRICES.length; i++) expect(CRATE_PRICES[i]).toBeGreaterThan(CRATE_PRICES[i - 1]);
  });

  it('leaves enough in the armory from the start for a good first run', () => {
    const save = freshSave();
    const open = (kind: 'weapon' | 'item' | 'relic', list: ReadonlyArray<{ id: string }>): string[] => list.filter((x) => inArmory(save, { kind, id: x.id })).map((x) => x.id);
    const weapons = open('weapon', WEAPONS);
    expect(weapons.length).toBeGreaterThanOrEqual(12);
    // Every way of fighting is there: up close, from afar, and by magic.
    for (const kind of ['melee', 'ranged', 'magic']) expect(WEAPONS.some((w) => weapons.includes(w.id) && w.kind === kind), kind).toBe(true);
    const items = open('item', ITEMS);
    for (let tier = 0; tier < TIERS; tier++) expect(ITEMS.some((it) => items.includes(it.id) && it.tier === tier), `tier ${tier}`).toBe(true);
    expect(open('relic', RELICS).length).toBeGreaterThanOrEqual(8);
    // And the crates hold a good part of the game: a later run has more in it.
    expect(shutOf(save).length).toBeGreaterThanOrEqual(30);
  });

  it('prices every hero and companion that a deed opens', () => {
    for (const h of HEROES) expect(HALL[h.id] !== undefined, h.id).toBe(h.unlock !== null);
    for (const c of COMPANIONS) expect(KENNEL[c.id], c.id).toBeGreaterThan(0);
  });

  it('has blessings in steps that cost more each time, and dangers one to five', () => {
    for (const b of BLESSINGS) {
      expect(b.prices.length, b.id).toBe(b.by.length);
      for (let i = 1; i < b.prices.length; i++) {
        expect(b.prices[i]).toBeGreaterThan(b.prices[i - 1]);
        expect(b.by[i]).toBeGreaterThan(b.by[i - 1]);
      }
      for (const by of b.by) expect(b.says(by).length).toBeGreaterThan(8);
    }
    expect(DANGERS.map((d) => d.n)).toEqual([1, 2, 3, 4, 5]);
    for (const d of DANGERS) expect(d.says.length).toBeGreaterThan(8);
  });

  it('has deeds with a name each, one for a win with every hero and one for every danger', () => {
    expect(new Set(DEEDS.map((d) => d.id)).size).toBe(DEEDS.length);
    for (const d of DEEDS) {
      expect(d.name.length, d.id).toBeGreaterThan(3);
      expect(d.says.length, d.id).toBeGreaterThan(8);
      expect(d.renown, d.id).toBeGreaterThan(0);
    }
    for (const h of HEROES) expect(DEEDS.some((d) => d.test.kind === 'win' && d.test.hero === h.id), h.id).toBe(true);
    for (const n of DANGERS) expect(DEEDS.some((d) => d.test.kind === 'win' && d.test.danger === n.n), `danger ${n.n}`).toBe(true);
    expect(DEEDS.length).toBeGreaterThanOrEqual(30);
  });
});

describe('renown', () => {
  it('is paid for waves, captains and the win, more at a higher danger, and for deeds as they are', () => {
    const run = ended('bram', 8, { felled: ['warlord'] });
    expect(tallyOf(run).total).toBe(8 * RENOWN.wave + RENOWN.captain);
    expect(tallyOf(run).lines.map((l) => l.why)).toEqual(['Waves come through', 'Captains beaten']);
    const won = ended('bram', LAST_WAVE, { felled: ['warlord', 'colossus', 'jarl'] });
    const base = LAST_WAVE * RENOWN.wave + 3 * RENOWN.captain + RENOWN.win;
    expect(hasWon(won)).toBe(true);
    expect(tallyOf(won).total).toBe(base);
    const hard = { ...won, danger: 2, deeds: ['win'] };
    const deed = DEEDS.find((d) => d.id === 'win')?.renown ?? 0;
    // The danger pays more of the run's own renown, and a deed pays what it pays.
    expect(tallyOf(hard).total).toBe(base + Math.round(base * RENOWN.danger * 2) + deed);
    expect(tallyOf(hard).lines.some((l) => l.why === 'Danger 2')).toBe(true);
    expect(tallyOf(ended('bram', 0)).total).toBe(0);
  });

  it('is paid once, when the run ends, and the save keeps the tally', () => {
    const save = freshSave();
    const run = { ...newRun('bram', 5), wave: 4, phase: 'camp' as const };
    expect(record(save, run, 10).tally).toBeNull();
    expect(save.renown).toBe(0);
    run.phase = 'over' as never;
    const out = record(save, run, 0);
    expect(out.tally?.total).toBe(3 * RENOWN.wave);
    expect(save.renown).toBe(3 * RENOWN.wave);
    expect(save.earned).toBe(3 * RENOWN.wave);
    expect(save.tally).toEqual(out.tally);
    // Told again, it pays nothing more.
    expect(record(save, run, 0).tally).toBeNull();
    expect(save.renown).toBe(3 * RENOWN.wave);
  });
});

describe('the hall, the kennels and the band', () => {
  it('sells a hero whose deed is not done, once, to whoever has the renown', () => {
    const poor = rich(10);
    expect(heroPrice(poor, 'orrin')).toBe(HALL.orrin);
    expect(buyHero(poor, 'orrin')).toBe(false);
    expect(isOpen(poor, 'orrin')).toBe(false);
    const save = rich(HALL.orrin + 5);
    expect(buyHero(save, 'orrin')).toBe(true);
    expect(isOpen(save, 'orrin')).toBe(true);
    expect(save.renown).toBe(5);
    expect(heroPrice(save, 'orrin')).toBeNull();
    expect(buyHero(save, 'orrin')).toBe(false);
    // One who is there from the start was never for sale.
    expect(heroPrice(save, 'bram')).toBeNull();
    expect(buyHero(rich(), 'nobody')).toBe(false);
  });

  it('sells a companion, who goes straight into a free place of the band', () => {
    const save = rich();
    expect(friendPrice(save, 'greta')).toBe(KENNEL.greta);
    expect(buyFriend(save, 'greta')).toBe(true);
    expect(isFriend(save, 'greta')).toBe(true);
    expect(save.band).toEqual(['greta']);
    expect(save.renown).toBe(5000 - KENNEL.greta);
    expect(buyFriend(save, 'greta')).toBe(false);
    // With the one place taken, the next waits in the kennels.
    expect(buyFriend(save, 'pip')).toBe(true);
    expect(save.band).toEqual(['greta']);
  });

  it('sells the second place in the band once, and the shepherd still brings one more', () => {
    const save = rich();
    buyFriend(save, 'greta');
    buyFriend(save, 'pip');
    buyFriend(save, 'biscuit');
    expect(placePrice(save)).toBe(PLACE_PRICE);
    expect(buyPlace(save)).toBe(true);
    expect(save.places).toBe(2);
    // Whoever was waiting takes it.
    expect(save.band).toEqual(['greta', 'pip']);
    expect(placePrice(save)).toBeNull();
    expect(buyPlace(save)).toBe(false);
    expect(bandFor(save, 'bram').length).toBe(2);
    save.band.push('biscuit');
    expect(bandSize('aldous', save.places)).toBe(BAND.places + 1);
    expect(bandFor(save, 'aldous').length).toBe(3);
    expect(buyPlace(rich(PLACE_PRICE - 1))).toBe(false);
  });
});

describe('the armory', () => {
  /** Everything a run is offered over many camps, relic choices and packs. */
  const offeredIn = (run: RunData): Set<string> => {
    const seen = new Set<string>();
    run.phase = 'camp';
    run.gold = 1e9;
    for (let n = 0; n < 400; n++) {
      run.wave = 3 + (n % 16);
      reroll(run);
      for (const o of run.offers) seen.add(thingKey(o));
    }
    for (let n = 0; n < 60; n++) {
      run.relics = [];
      run.phase = 'fight';
      endWave(run, cleared(run, { felled: ['warlord'] }));
      for (const id of run.relicChoices) seen.add(thingKey({ kind: 'relic', id }));
      // Whatever the wave left to be chosen is put by: only what was offered is looked at.
      if ((run.phase as string) === 'relic') takeRelic(run, 0);
      run.pending = 0;
      run.relicsDue = 0;
      run.phase = 'camp';
      run.packs = 3;
      for (let k = 0; k < 3; k++) {
        const id = openPack(run);
        if (id) seen.add(thingKey({ kind: 'item', id }));
      }
      run.items = [];
    }
    return seen;
  };

  it('never offers a run what its crates have not opened, and offers it all once they have', () => {
    const save = freshSave();
    const shut = shutOf(save);
    const first = offeredIn(beginRun(save, 'bram', 11));
    for (const k of shut) expect(first.has(k), k).toBe(false);
    expect(first.size).toBeGreaterThan(25);
    const all = rich();
    for (const c of CRATES) expect(buyCrate(all, c.id)).toBe(true);
    expect(shutOf(all)).toEqual([]);
    const later = offeredIn(beginRun(all, 'bram', 11));
    // Nearly everything turns up over that many camps: at least most of what was shut.
    expect(shut.filter((k) => later.has(k)).length).toBeGreaterThan(shut.length * 0.8);
  });

  it('sells the crates in any order, each dearer than the last', () => {
    const save = rich();
    expect(cratePrice(save)).toBe(CRATE_PRICES[0]);
    expect(buyCrate(save, 'nothing')).toBe(false);
    expect(buyCrate(save, CRATES[3].id)).toBe(true);
    expect(save.renown).toBe(5000 - CRATE_PRICES[0]);
    expect(buyCrate(save, CRATES[3].id)).toBe(false);
    expect(cratePrice(save)).toBe(CRATE_PRICES[1]);
    for (const t of CRATES[3].things) expect(inArmory(save, t)).toBe(true);
    for (const t of CRATES[0].things) expect(inArmory(save, t)).toBe(false);
    expect(buyCrate(rich(CRATE_PRICES[0] - 1), CRATES[0].id)).toBe(false);
    for (const c of CRATES) buyCrate(save, c.id);
    expect(cratePrice(save)).toBeNull();
  });

  it('shows a crate with what was never met dark, and a run keeps what it began with', () => {
    const save = freshSave();
    const crate = CRATES[0];
    expect(crateThings(save, crate).every((t) => t.name === '???' && !t.met)).toBe(true);
    save.seen[thingKey(crate.things[0])] = 0;
    const shown = crateThings(save, crate);
    expect(shown[0].met).toBe(true);
    expect(shown[0].name).not.toBe('???');
    expect(shown[1].name).toBe('???');
    // A crate bought in the middle of a run does not change that run.
    const run = beginRun(save, 'bram', 3);
    const rich2 = { ...save, renown: 999 };
    buyCrate(rich2, crate.id);
    expect(run.shut).toContain(thingKey(crate.things[0]));
    expect(beginRun(rich2, 'bram', 3).shut).not.toContain(thingKey(crate.things[0]));
  });
});

describe('blessings', () => {
  it('are bought a step at a time, each step dearer, until there are no more', () => {
    const save = rich();
    const purse = BLESSINGS.find((b) => b.id === 'purse');
    if (!purse) throw new Error('no purse');
    expect(blessSays(save, 'purse')).toEqual({ now: '', next: purse.says(purse.by[0]) });
    for (let i = 0; i < purse.prices.length; i++) {
      expect(blessPrice(save, 'purse')).toBe(purse.prices[i]);
      expect(buyBlessing(save, 'purse')).toBe(true);
      expect(blessStep(save, 'purse')).toBe(i + 1);
    }
    expect(blessPrice(save, 'purse')).toBeNull();
    expect(buyBlessing(save, 'purse')).toBe(false);
    expect(blessSays(save, 'purse').next).toBe('');
    expect(buyBlessing(rich(5), 'hearty')).toBe(false);
  });

  it('A Full Purse: a run begins with coins', () => {
    const save = rich();
    expect(beginRun(save, 'bram', 1).gold).toBe(0);
    buyBlessing(save, 'purse');
    buyBlessing(save, 'purse');
    expect(beginRun(save, 'bram', 1).gold).toBe(BLESSINGS.find((b) => b.id === 'purse')?.by[1]);
  });

  it('Hearth Bread: more health', () => {
    const save = rich();
    const before = statsOf(beginRun(save, 'bram', 1)).maxHp;
    buyBlessing(save, 'hearty');
    const run = beginRun(save, 'bram', 1);
    expect(blessed(run, 'hearty')).toBe(2);
    expect(statsOf(run).maxHp).toBe(before + 2);
    expect(new World(setupOf(run)).hero.maxHp).toBe(before + 2);
  });

  it("Old Soldiers' Tales: more experience from the same wave", () => {
    const save = rich();
    const plain = beginRun(save, 'bram', 1);
    endWave(plain, cleared(plain, { xp: 10 }));
    for (let i = 0; i < 3; i++) buyBlessing(save, 'study');
    const run = beginRun(save, 'bram', 1);
    endWave(run, cleared(run, { xp: 10 }));
    expect(run.xp).toBeCloseTo(plain.xp * 1.18);
  });

  it("The Quartermaster's Favor: the first looks at other wares in each camp are free", () => {
    const save = rich();
    buyBlessing(save, 'quarter');
    const run = { ...beginRun(save, 'bram', 1), wave: 5, phase: 'camp' as const, gold: 100 };
    expect(rerollPrice(run)).toBe(0);
    expect(reroll(run)).toBe(true);
    expect(run.gold).toBe(100);
    expect(rerollPrice(run)).toBeGreaterThan(0);
    buyBlessing(save, 'quarter');
    const two = { ...beginRun(save, 'bram', 1), wave: 5, phase: 'camp' as const, gold: 100 };
    reroll(two);
    expect(rerollPrice(two)).toBe(0);
    // With the Merchant's Seal as well there is one more.
    two.relics = ['seal'];
    reroll(two);
    expect(rerollPrice(two)).toBe(0);
    reroll(two);
    expect(rerollPrice(two)).toBeGreaterThan(0);
  });

  it('The Third Road: three roads to choose from', () => {
    const save = rich();
    expect(forksNow(save)).toBe(ROAD.roads);
    buyBlessing(save, 'path');
    expect(forksNow(save)).toBe(ROAD.roads + 1);
    const run = { ...beginRun(save, 'bram', 77), wave: 6, phase: 'camp' as const };
    march(run);
    expect(run.roads.length).toBe(3);
  });

  it('A Second Breath: once in a run, a killing blow leaves the hero standing', () => {
    const save = rich();
    buyBlessing(save, 'breath');
    const run = beginRun(save, 'bram', 1);
    expect(setupOf(run).breath).toBe(true);
    const w = alone(new World(setup({ stats: stats({ maxHp: 20 }), breath: true })));
    stand(w, 'bruiser', w.hero.x + 6, w.hero.y, { hp: 99999, dmg: 500 }, true);
    const events = play(w, 0.2);
    expect(has(events, 'breath').length).toBe(1);
    expect(w.hero.hp).toBe(Math.round(20 * BREATH.rises));
    expect(w.over).toBeNull();
    expect(w.breathed).toBe(true);
    // The second one kills.
    play(w, BREATH.grace + 0.6);
    expect(w.over).toBe('dead');
    // The run remembers that it was drawn: there is no second in the next wave.
    endWave(run, cleared(run, { breathed: true }));
    expect(run.breathed).toBe(true);
    expect(setupOf(run).breath).toBe(false);
    // Without the blessing there is none.
    const bare = alone(new World(setup({ stats: stats({ maxHp: 20 }) })));
    stand(bare, 'bruiser', bare.hero.x + 6, bare.hero.y, { hp: 99999, dmg: 500 }, true);
    play(bare, 0.2);
    expect(bare.over).toBe('dead');
  });
});

describe('danger', () => {
  it('opens one step at a time, by winning at the one before', () => {
    const save = freshSave();
    expect(setDanger(save, 1)).toBe(false);
    expect(badge(save, 'bram')).toBe(-1);
    record(save, ended('bram', LAST_WAVE), 0);
    expect(save.dangers).toBe(1);
    expect(badge(save, 'bram')).toBe(0);
    expect(setDanger(save, 1)).toBe(true);
    expect(setDanger(save, 2)).toBe(false);
    expect(termsOf(save).danger).toBe(1);
    const run = beginRun(save, 'wren', 4);
    expect(run.danger).toBe(1);
    record(save, { ...run, wave: LAST_WAVE + 1, phase: 'over' }, 0);
    expect(save.dangers).toBe(2);
    expect(badge(save, 'wren')).toBe(1);
    // A loss opens nothing, and a win at a lower danger does not lower a badge.
    record(save, ended('wren', LAST_WAVE), 0);
    expect(badge(save, 'wren')).toBe(1);
    record(save, { ...beginRun(save, 'bram', 9), wave: 12, phase: 'over' }, 0);
    expect(save.dangers).toBe(2);
    expect(setDanger(save, -1)).toBe(false);
    expect(setDanger(save, 0)).toBe(true);
  });

  it('counts a win when the twentieth wave is come through, though the run goes on', () => {
    const save = freshSave();
    const run = { ...newRun('bram', 5), wave: LAST_WAVE + 1, phase: 'camp' as const };
    record(save, run, 0);
    expect(save.dangers).toBe(1);
    expect(save.deeds).toContain('win');
    expect(save.renown).toBe(0);
    run.wave = LAST_WAVE + 3;
    (run as RunData).phase = 'over';
    const tally = record(save, run, 0).tally;
    expect(tally?.lines.some((l) => l.why === 'The Morning')).toBe(true);
    expect(save.renown).toBe(tally?.total);
  });

  it('1, Forced March: they come quicker', () => {
    const walked = (danger: number): number => {
      const w = alone(new World(setup({ danger })));
      const f = stand(w, 'cutpurse', w.hero.x + 500, w.hero.y);
      play(w, 1);
      return w.hero.x + 500 - f.x;
    };
    expect(walked(1) / walked(0)).toBeCloseTo(DANGER.quick, 1);
  });

  it('2, Lean Coffers: wares and other wares cost more', () => {
    const camp = (danger: number): RunData => {
      const run = { ...newRun('bram', 21, [], ROAD.roads, { danger }), wave: 6, phase: 'camp' as const, gold: 500 };
      reroll(run);
      return run;
    };
    const plain = camp(0);
    const lean = camp(2);
    expect(lean.offers.map((o) => o.id)).toEqual(plain.offers.map((o) => o.id));
    lean.offers.forEach((o, i) => expect(o.price).toBe(Math.max(1, Math.round(plain.offers[i].price * DANGER.prices))));
    expect(rerollPrice(lean)).toBe(Math.round(rerollPrice(plain) * DANGER.prices));
    // The first danger leaves prices alone.
    expect(camp(1).offers.map((o) => o.price)).toEqual(plain.offers.map((o) => o.price));
  });

  it('3, Champions Abroad: a champion walks in every wave from the third, but not beside a captain', () => {
    const champions = (wave: number, danger: number): number => {
      const w = new World(setup({ wave, danger, omen: 'quiet' }));
      return has(play(w, w.wave.seconds * DANGER.champion.at + 3), 'champion').length;
    };
    expect(champions(5, 3)).toBe(1);
    expect(champions(5, 2)).toBe(0);
    expect(champions(DANGER.champion.from - 1, 3)).toBe(0);
    const boss = [...Array(LAST_WAVE).keys()].map((i) => i + 1).find((n) => waveOf(n).boss) ?? 7;
    expect(champions(boss, 3)).toBe(0);
    // The road that is all champions keeps its own three.
    const w = new World(setup({ wave: 5, danger: 3, omen: 'champions' }));
    expect(has(play(w, w.wave.seconds * 0.7), 'champion').length).toBe(ROAD.champions.count);
  });

  it('4, Second Wind: a captain that falls gets up once, and stays down the second time', () => {
    const fight = (danger: number): { events: Ev[]; w: World } => {
      const w = alone(new World(setup({ own: { id: 'gatekeeper', tier: 3 }, danger, stats: stats({ maxHp: 9999, damage: 100000 }) })));
      stand(w, 'warlord', w.hero.x + 60, w.hero.y, { boss: true, hp: 1000, maxHp: 1000 }, true);
      return { events: play(w, 6), w };
    };
    const hard = fight(4);
    expect(has(hard.events, 'second').length).toBe(1);
    expect(has(hard.events, 'fall').filter((e) => e.boss).length).toBe(1);
    expect(hard.w.felled).toEqual(['warlord']);
    const plain = fight(3);
    expect(has(plain.events, 'second').length).toBe(0);
    expect(plain.w.felled).toEqual(['warlord']);
    // It gets up with a share of its health, and is down for a moment first.
    const w = alone(new World(setup({ own: { id: 'gatekeeper', tier: 3 }, danger: 4, stats: stats({ maxHp: 9999, damage: 100000 }) })));
    const f = stand(w, 'warlord', w.hero.x + 60, w.hero.y, { boss: true, hp: 1000, maxHp: 1000 }, true);
    for (let i = 0; i < 600 && !f.second; i++) w.step({ x: 0, y: 0 });
    expect(f.dead).toBe(false);
    expect(f.hp).toBe(Math.round(1000 * DANGER.wind));
    expect(f.stun).toBeGreaterThan(1);
  });

  it('5, The Long Dark: mending gives half, and they are sturdier', () => {
    const mended = (danger: number): number => {
      const w = new World(setup({ danger, stats: stats({ maxHp: 50, regen: 10 }) }));
      w.hero.hp = 10;
      play(w, 2.05);
      return w.hero.hp - 10;
    };
    expect(mended(4)).toBe(2);
    expect(mended(5)).toBe(1);
    const health = (danger: number): number => {
      const w = new World(setup({ wave: 6, danger }));
      play(w, 4);
      return Math.max(...w.foes.filter((f) => f.def.id === 'cutpurse' || f.def.id === 'warhound').map((f) => f.maxHp), 0);
    };
    const plain = health(4);
    expect(plain).toBeGreaterThan(0);
    expect(health(5)).toBe(Math.round(plain * DANGER.hp));
  });
});

describe('the chronicle', () => {
  it('remembers who stood on the field, how many were slain, and what a run held', () => {
    const save = freshSave();
    expect(met(save, 'foe', 'cutpurse')).toBe(false);
    const run = newRun('bram', 5, ['pip']);
    const w = cleared(run, { met: ['cutpurse', 'warhound'], slain: { cutpurse: 7 } });
    endWave(run, w);
    run.relics = ['echobell'];
    run.weapons = [{ id: 'sword', tier: 0 }];
    run.items = ['ration', 'ration'];
    record(save, run, 7);
    expect(met(save, 'foe', 'warhound')).toBe(true);
    expect(count(save, 'foe', 'warhound')).toBe(0);
    expect(count(save, 'foe', 'cutpurse')).toBe(7);
    expect(met(save, 'hero', 'bram')).toBe(true);
    expect(met(save, 'friend', 'pip')).toBe(true);
    expect(met(save, 'weapon', 'sword')).toBe(true);
    expect(met(save, 'weapon', 'gatekeeper')).toBe(true);
    expect(met(save, 'relic', 'echobell')).toBe(true);
    expect(met(save, 'item', 'ration')).toBe(true);
    expect(count(save, 'omen', 'quiet')).toBe(1);
    // The wares on the table have been seen, though not bought.
    for (const o of run.offers) expect(met(save, o.kind, o.id), o.id).toBe(true);
    // Told once: the same wave is not counted again.
    expect(run.told).toBeNull();
    record(save, run, 0);
    expect(count(save, 'foe', 'cutpurse')).toBe(7);
    // A run that ends is counted for who was on it and what it held, each thing once.
    expect(count(save, 'hero', 'bram')).toBe(0);
    run.phase = 'over';
    record(save, run, 0);
    expect(count(save, 'hero', 'bram')).toBe(1);
    expect(count(save, 'friend', 'pip')).toBe(1);
    expect(count(save, 'item', 'ration')).toBe(1);
    expect(count(save, 'relic', 'echobell')).toBe(1);
  });

  it('adds up what several waves told before the save took it', () => {
    const run = newRun('bram', 5);
    endWave(run, cleared(run, { met: ['cutpurse'], slain: { cutpurse: 3 } }));
    run.phase = 'fight';
    endWave(run, cleared(run, { met: ['cutpurse', 'poacher'], slain: { cutpurse: 2, poacher: 1 }, unstruck: ['warlord'] }));
    expect(run.told).toEqual({ met: ['cutpurse', 'poacher'], slain: { cutpurse: 5, poacher: 1 }, roads: ['quiet'], unstruck: ['warlord'] });
  });

  it('names what has been met and keeps the rest as "???"', () => {
    const save = freshSave();
    save.seen['foe:cutpurse'] = 12;
    save.seen['relic:echobell'] = 0;
    const pages = chronicleOf(save);
    expect(pages.map((p) => p.kind)).toEqual(['hero', 'friend', 'foe', 'weapon', 'item', 'relic', 'omen']);
    const foes = pages[2];
    expect(foes.met).toBe(1);
    const cutpurse = foes.entries.find((e) => e.id === 'cutpurse');
    expect(cutpurse).toMatchObject({ name: 'Cutpurse', met: true, count: 12, counted: 'slain' });
    for (const e of foes.entries) if (e.id !== 'cutpurse') expect(e).toMatchObject({ name: '???', says: '', met: false });
    // What is only a thing on the field, a wagon or a cage, is no enemy to chronicle.
    expect(foes.entries.some((e) => e.id === 'paywagon' || e.id === 'cage')).toBe(false);
    expect(pages[5].entries.find((e) => e.id === 'echobell')?.says.length).toBeGreaterThan(5);
    // Every hero's own weapon has a place, and so does every road.
    expect(pages[3].entries.length).toBe(WEAPONS.length + HEROES.length);
    expect(pages[6].entries.length).toBe(OMENS.length);
  });

  it('the world tells who stood, who was slain, and a captain that fell with no blow landed', () => {
    const w = alone(new World(setup({ own: { id: 'gatekeeper', tier: 3 }, stats: stats({ maxHp: 9999, damage: 100000 }) })));
    stand(w, 'cutpurse', w.hero.x + 50, w.hero.y, {}, true);
    stand(w, 'warlord', w.hero.x - 50, w.hero.y, { boss: true, cool: 99 }, true);
    play(w, 3);
    expect(w.slain).toEqual({ cutpurse: 1, warlord: 1 });
    expect(w.unstruck).toEqual(['warlord']);
    // Struck first, the captain's fall is not an untouched one.
    const v = alone(new World(setup({ own: { id: 'gatekeeper', tier: 3 }, stats: stats({ maxHp: 9999, damage: 100000 }) })));
    v.slots[0].cool = 1;
    stand(v, 'bruiser', v.hero.x + 6, v.hero.y, { hp: 1, maxHp: 1, dmg: 1 }, true);
    stand(v, 'warlord', v.hero.x - 50, v.hero.y, { boss: true, cool: 99 }, true);
    play(v, 5);
    expect(v.struck).toBe(true);
    expect(v.felled).toEqual(['warlord']);
    expect(v.unstruck).toEqual([]);
    // Who the wave itself sends is met as it stands.
    const plain = new World(setup({ wave: 1 }));
    play(plain, 4);
    expect(plain.met).toContain('cutpurse');
  });
});

describe('deeds', () => {
  const done = (run: RunData, save = freshSave()): string[] => {
    record(save, run, 0);
    return save.deeds;
  };

  it('are done once each, said when they are, and paid when the run ends', () => {
    const save = freshSave();
    const run = { ...newRun('bram', 5), wave: 6, phase: 'camp' as const };
    const out = record(save, run, 0);
    expect(out.deeds).toEqual(['wave5']);
    expect(run.deeds).toEqual(['wave5']);
    expect(record(save, run, 0).deeds).toEqual([]);
    expect(save.renown).toBe(0);
    (run as RunData).phase = 'over';
    const tally = record(save, run, 0).tally;
    expect(tally?.lines.find((l) => l.why === 'Still Standing')?.renown).toBe(10);
    // Another run that comes as far is paid for its waves, not for the deed again.
    const next = ended('wren', 5);
    expect(record(save, next, 0).tally?.lines.some((l) => l.why === 'Still Standing')).toBe(false);
  });

  it('each kind of deed is done by what it asks for', () => {
    expect(done(ended('bram', 10))).toEqual(expect.arrayContaining(['wave5', 'wave10']));
    expect(done(ended('bram', 3, { felled: ['warlord'] }))).toContain('warlord');
    expect(done(ended('bram', 3), { ...freshSave(), kills: 5000 })).toEqual(expect.arrayContaining(['kills1', 'kills2']));
    expect(done(ended('bram', 3), { ...freshSave(), ended: 9 })).toContain('runs10');
    expect(done(ended('bram', 3, { level: 15 }))).toContain('level15');
    expect(done(ended('bram', 3, { gold: 300 }))).toContain('purse');
    expect(done(ended('bram', 3, { gold: 299 }))).not.toContain('purse');
    // Bram's own sword is a blade: three more make four of a kind.
    expect(done(ended('bram', 3, { weapons: [{ id: 'sword', tier: 0 }, { id: 'dagger', tier: 0 }, { id: 'fang', tier: 0 }] }))).toContain('kinds4');
    expect(done(ended('bram', 3, { weapons: [{ id: 'sword', tier: 0 }, { id: 'dagger', tier: 0 }] }))).not.toContain('kinds4');
    expect(done(ended('bram', 3, { weapons: [{ id: 'bow', tier: TIERS - 1 }] }))).toContain('tier');
    const eight = RELICS.slice(0, 8).map((r) => r.id);
    expect(done(ended('bram', 3, { relics: eight }))).toEqual(expect.arrayContaining(['relics5', 'relics8']));
    expect(done(ended('bram', 3, { relics: eight.slice(0, 5) }))).not.toContain('relics8');
    expect(done(ended('bram', 3, { band: [{ id: 'pip', bond: BAND.bonds }] }))).toContain('bond');
    expect(done(ended('bram', 8, { told: { met: [], slain: {}, roads: [], unstruck: ['warlord'] } }))).toContain('unstruck');
    expect(done(ended('bram', 8))).not.toContain('unstruck');
  });

  it('a win is a deed, one for its hero, one for its danger, and one for going alone', () => {
    const alone1 = done(ended('wren', LAST_WAVE, { danger: 2 }));
    expect(alone1).toEqual(expect.arrayContaining(['win', 'win-wren', 'danger1', 'danger2', 'alone']));
    expect(alone1).not.toContain('danger3');
    expect(alone1).not.toContain('win-bram');
    const banded = done(ended('bram', LAST_WAVE, { band: [{ id: 'pip', bond: 0 }] }));
    expect(banded).toContain('win-bram');
    expect(banded).not.toContain('alone');
    // A stray let out of a cage on the way is not a band that was brought.
    expect(done(ended('bram', LAST_WAVE, { band: [{ id: 'pip', bond: 0, stray: true }] }))).toContain('alone');
    expect(done(ended('bram', LAST_WAVE - 1))).not.toContain('win');
    const save = freshSave();
    for (const h of HEROES.slice(0, 5)) record(save, ended(h.id, LAST_WAVE), 0);
    expect(save.deeds).toContain('wins5');
  });

  it('every road come through is a deed, once all of them have been', () => {
    const save = freshSave();
    for (const o of OMENS.slice(1)) save.seen[`omen:${o.id}`] = 1;
    record(save, ended('bram', 2), 0);
    expect(save.deeds).not.toContain('roads');
    save.seen[`omen:${OMENS[0].id}`] = 1;
    record(save, ended('bram', 2), 0);
    expect(save.deeds).toContain('roads');
  });

  it('are listed with those that open a hero or a companion, the unopened dark, what is left to do first', () => {
    const save = freshSave();
    const rows = deedsOf(save);
    expect(rows.length).toBe(DEEDS.length + HEROES.filter((h) => h.unlock).length + COMPANIONS.length);
    const orrin = rows.find((r) => r.id === 'hero-orrin');
    expect(orrin).toMatchObject({ name: '???', done: false, opens: 'a hero', says: featSays({ kind: 'wave', wave: 5 }) });
    record(save, ended('bram', 6), 0);
    const after = deedsOf(save);
    expect(after.find((r) => r.id === 'hero-orrin')).toMatchObject({ name: 'Orrin Quillon', done: true });
    const firstDone = after.findIndex((r) => r.done);
    expect(after.slice(firstDone).every((r) => r.done)).toBe(true);
    expect(after.find((r) => r.id === 'wave10')?.share).toBeCloseTo(0.6);
    // The next to go for is the one nearest done.
    expect(nextDeed(save)?.id).toBe('wave10');
  });
});

describe('what the Hold sells, all of it', () => {
  it('lists everything with its price, and is full when nothing is left', () => {
    const save = rich(100000);
    const wares = waresOf(save);
    expect(wares.filter((w) => w.kind === 'hero').length).toBe(HEROES.filter((h) => h.unlock).length);
    expect(wares.filter((w) => w.kind === 'friend').length).toBe(COMPANIONS.length);
    expect(wares.filter((w) => w.kind === 'crate').length).toBe(CRATES.length);
    expect(wares.filter((w) => w.kind === 'blessing').length).toBe(BLESSINGS.length);
    expect(wares.filter((w) => w.kind === 'place').length).toBe(1);
    expect(wares.every((w) => w.can && w.price > 0 && w.name.length > 2)).toBe(true);
    expect(holdFull(save)).toBe(false);
    let guard = 0;
    while (!holdFull(save) && guard++ < 200) expect(buyWare(save, waresOf(save)[0])).toBe(true);
    expect(holdFull(save)).toBe(true);
    for (const h of HEROES) expect(isOpen(save, h.id)).toBe(true);
    for (const c of COMPANIONS) expect(isFriend(save, c.id)).toBe(true);
    expect(shutOf(save)).toEqual([]);
    expect(waresOf(rich(0)).every((w) => !w.can)).toBe(true);
  });

  it('a hero or a companion a deed has opened is no longer for sale', () => {
    const save = freshSave();
    record(save, ended('bram', 6), 0);
    expect(waresOf(save).some((w) => w.id === 'orrin')).toBe(false);
    expect(waresOf(save).some((w) => w.id === 'pip')).toBe(false);
    expect(waresOf(save).some((w) => w.id === 'maren')).toBe(true);
  });
});

describe('the save and the Hold', () => {
  it('keeps what the Hold has through being written and read', () => {
    const save = rich(321);
    buyCrate(save, CRATES[1].id);
    buyBlessing(save, 'hearty');
    // The screens count a run as it begins (session.ts): a save never has more runs ended than begun.
    save.runs = 1;
    record(save, ended('bram', LAST_WAVE), 0);
    setDanger(save, 1);
    const back = repair(JSON.parse(JSON.stringify(save)));
    expect(back.v).toBe(SAVE_VERSION);
    expect(back).toEqual(save);
  });

  it('mends a save from before the Hold, and carries its run on', () => {
    const old = JSON.parse(JSON.stringify(freshSave())) as Record<string, unknown>;
    const run = JSON.parse(JSON.stringify({ ...newRun('wren', 8), wave: 4, phase: 'camp' })) as Record<string, unknown>;
    for (const k of ['danger', 'shut', 'bless', 'breathed', 'deeds', 'told', 'paid', 'won']) delete run[k];
    for (const k of ['renown', 'earned', 'crates', 'bless', 'danger', 'dangers', 'won', 'deeds', 'seen', 'tally']) delete old[k];
    const back = repair({ ...old, v: 3, best: { bram: 6 }, felled: ['warlord'], run });
    expect(back).toMatchObject({ v: SAVE_VERSION, renown: 0, crates: [], bless: {}, danger: 0, dangers: 0, deeds: [], tally: null });
    expect(back.run).toMatchObject({ hero: 'wren', wave: 4, danger: 0, shut: [], bless: {}, breathed: false, deeds: [], told: null, paid: false, won: false });
    // Whoever it has played and beaten is in the Chronicle.
    expect(met(back, 'hero', 'bram')).toBe(true);
    expect(met(back, 'foe', 'warlord')).toBe(true);
    // The run can be carried on as any other.
    if (!back.run) throw new Error('no run');
    expect(survived(back.run)).toBe(3);
    expect(march(back.run)).toBe(true);
  });

  it('throws out what is not the Hold\'s', () => {
    const back = repair({
      ...freshSave(), renown: -5, earned: 'lots', crates: ['fletcher', 'nonsense', 'fletcher'], bless: { purse: 99, hearty: -2, nothing: 3 }, danger: 4, dangers: 2, won: { bram: 9, nobody: 1 },
      deeds: ['win', 'made-up'], seen: { 'foe:cutpurse': 4, bad: -1, worse: 'x' }, tally: 'no',
    });
    expect(back.renown).toBe(0);
    expect(back.crates).toEqual(['fletcher']);
    expect(back.bless).toEqual({ purse: 3 });
    expect(back.dangers).toBe(2);
    expect(back.danger).toBe(2);
    expect(back.won).toEqual({ bram: DANGERS.length });
    expect(back.deeds).toEqual(['win']);
    expect(back.seen).toEqual({ 'foe:cutpurse': 4 });
    expect(back.tally).toBeNull();
  });
});
