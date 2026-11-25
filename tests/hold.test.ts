import { describe, expect, it } from 'vitest';
import { BAND, COMPANIONS, CRATES, DEEDS, HEROES, ITEMS, LAST_WAVE, OMENS, RELICS, ROAD, SLOTS, TIERS, VOW, VOWS, WEAPONS, thingKey, waveOf } from '../src/game/data';
import { noBoons } from '../src/game/holdData';
import {
  badge, beginDaily, beginRun, chronicleOf, count, crateThings, dailyOf, dailyTaken, deedsOf, featSays, inArmory, masteryXp, met, nextDeeds, pickGift, poolOf, shutOf, termsOf, toggleVow, vowsNext, vowsOpen,
} from '../src/game/hold';
import { buy, endWave, handsOf, march, newRun, openPack, reroll, rerollPrice, setupOf, survived, takeRelic, whyNot, type RunData } from '../src/game/run';
import { SAVE_VERSION, freshSave, record, repair, type SaveData } from '../src/game/state';
import { World, type Ev } from '../src/game/world';
import { alone, play, setup, stand, stats } from './field';

const has = <T extends Ev['t']>(events: readonly Ev[], t: T): Extract<Ev, { t: T }>[] => events.filter((e): e is Extract<Ev, { t: T }> => e.t === t);

/** A save with every crate of the armory unlocked. */
const stocked = (): SaveData => ({ ...freshSave(), crates: CRATES.map((c) => c.id) });

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

  it('gives every crate a quest that unlocks it', () => {
    for (const c of CRATES) expect(c.deedSays.length, c.id).toBeGreaterThan(10);
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
    const all = stocked();
    expect(shutOf(all)).toEqual([]);
    const later = offeredIn(beginRun(all, 'bram', 11));
    // Nearly everything turns up over that many camps: at least most of what was shut.
    expect(shut.filter((k) => later.has(k)).length).toBeGreaterThan(shut.length * 0.8);
  });

  it('has no price on a crate: only its quest unlocks it, once', () => {
    const save = freshSave();
    record(save, ended('bram', 3, { weapons: [{ id: 'sword', tier: TIERS - 1 }] }), 0);
    expect(save.crates).toEqual(['armorer']);
    for (const t of CRATES.find((c) => c.id === 'armorer')?.things ?? []) expect(inArmory(save, t)).toBe(true);
    for (const t of CRATES[0].things) expect(inArmory(save, t)).toBe(false);
    record(save, ended('bram', 3, { weapons: [{ id: 'sword', tier: TIERS - 1 }] }), 0);
    expect(save.crates).toEqual(['armorer']);
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
    const later = { ...save, crates: [crate.id] };
    expect(run.shut).toContain(thingKey(crate.things[0]));
    expect(beginRun(later, 'bram', 3).shut).not.toContain(thingKey(crate.things[0]));
  });
});

describe('vows', () => {
  const all = VOWS.map((v) => v.id);

  it('are opened by winning: the first few by a first win, more for each vow a win was sworn under', () => {
    const save = freshSave();
    expect(vowsOpen(save)).toEqual([]);
    expect(vowsNext(save)).toBe(`Clear wave ${LAST_WAVE}.`);
    expect(toggleVow(save, 'march')).toBe(false);
    expect(badge(save, 'bram')).toBeNull();
    record(save, ended('bram', LAST_WAVE), 0);
    expect(badge(save, 'bram')).toEqual([]);
    expect(vowsOpen(save)).toEqual(all.slice(0, VOW.first));
    expect(vowsNext(save)).toBe('Win a run with 1 vow.');
    expect(toggleVow(save, all[VOW.first])).toBe(false);
    expect(toggleVow(save, 'march')).toBe(true);
    expect(toggleVow(save, 'lean')).toBe(true);
    expect(termsOf(save, 'wren').vows).toEqual(['march', 'lean']);
    const run = beginRun(save, 'wren', 4);
    expect(run.vows).toEqual(['march', 'lean']);
    record(save, { ...run, wave: LAST_WAVE + 1, phase: 'over' }, 0);
    expect(badge(save, 'wren')).toEqual(['march', 'lean']);
    expect(vowsOpen(save)).toEqual(all.slice(0, VOW.first + VOW.more * 2));
    // A plain win after it does not take the badge away, and a vow can be taken back.
    record(save, ended('wren', LAST_WAVE), 0);
    expect(badge(save, 'wren')).toEqual(['march', 'lean']);
    expect(toggleVow(save, 'march')).toBe(true);
    expect(save.vows).toEqual(['lean']);
    // A loss opens nothing.
    const before = vowsOpen(save).length;
    record(save, { ...beginRun(save, 'bram', 9), wave: 12, phase: 'over' }, 0);
    expect(vowsOpen(save).length).toBe(before);
    // Won under three, every vow is open.
    record(save, ended('bram', LAST_WAVE, { vows: all.slice(0, 3) }), 0);
    expect(vowsOpen(save)).toEqual(all);
    expect(vowsNext(save)).toBe('');
  });

  it('counts a win when the hundredth wave is come through, though the run goes on', () => {
    const save = freshSave();
    const run = { ...newRun('bram', 5), wave: LAST_WAVE + 1, phase: 'camp' as const };
    record(save, run, 0);
    expect(vowsOpen(save).length).toBe(VOW.first);
    expect(save.deeds).toContain('win');
    expect(masteryXp(save, 'bram')).toBe(0);
    run.wave = LAST_WAVE + 3;
    (run as RunData).phase = 'over';
    const tally = record(save, run, 0).tally;
    expect(tally?.lines.some((l) => l.why === 'The Morning')).toBe(true);
    expect(masteryXp(save, 'bram')).toBe(tally?.total);
  });

  it('a run takes only vows there are, and only the ones that are open are sworn', () => {
    expect(newRun('bram', 1, [], ROAD.roads, { vows: ['march', 'nonsense'] }).vows).toEqual(['march']);
    const save = freshSave();
    save.vows = ['march'];
    expect(termsOf(save, 'bram').vows).toEqual([]);
  });

  it('Forced March: they come quicker', () => {
    const walked = (vows: string[]): number => {
      const w = alone(new World(setup({ vows })));
      const f = stand(w, 'cutpurse', w.hero.x + 500, w.hero.y);
      play(w, 1);
      return w.hero.x + 500 - f.x;
    };
    expect(walked(['march']) / walked([])).toBeCloseTo(VOW.quick, 1);
  });

  it('Lean Coffers: wares and other wares cost more', () => {
    const camp = (vows: string[]): RunData => {
      const run = { ...newRun('bram', 21, [], ROAD.roads, { vows }), wave: 6, phase: 'camp' as const, gold: 500 };
      reroll(run);
      return run;
    };
    const plain = camp([]);
    const lean = camp(['lean']);
    expect(lean.offers.map((o) => o.id)).toEqual(plain.offers.map((o) => o.id));
    lean.offers.forEach((o, i) => expect(o.price).toBe(Math.max(1, Math.round(plain.offers[i].price * VOW.prices))));
    expect(rerollPrice(lean)).toBe(Math.round(rerollPrice(plain) * VOW.prices));
    expect(camp(['march']).offers.map((o) => o.price)).toEqual(plain.offers.map((o) => o.price));
  });

  it('Bare Fields: the fallen leave no hearts', () => {
    const hearts = (vows: string[]): number => {
      const w = alone(new World(setup({ vows, own: { id: 'gatekeeper', tier: 3 }, stats: stats({ maxHp: 9999, damage: 100000, luck: 100000 }) })));
      for (let i = 0; i < 60; i++) stand(w, 'cutpurse', w.hero.x + 40 + (i % 5), w.hero.y + (i % 7) - 3, { hp: 1 }, true);
      play(w, 4);
      return w.picks.filter((p) => p.kind === 'heart').length + has(play(w, 0.1), 'mend').length;
    };
    expect(hearts(['famine'])).toBe(0);
  });

  it('Champions Abroad: a champion walks in every wave from the third, but not beside a captain', () => {
    const champions = (wave: number, vows: string[]): number => {
      const w = new World(setup({ wave, vows, omen: 'quiet' }));
      return has(play(w, w.wave.seconds * VOW.champion.at + 3), 'champion').length;
    };
    expect(champions(6, ['champions'])).toBe(1);
    expect(champions(6, [])).toBe(0);
    // The fifth wave of a land has its elite, sworn or not.
    expect(champions(5, [])).toBe(1);
    expect(champions(15, [])).toBe(1);
    expect(champions(VOW.champion.from - 1, ['champions'])).toBe(0);
    const boss = [...Array(LAST_WAVE).keys()].map((i) => i + 1).find((n) => waveOf(n).boss) ?? 7;
    expect(champions(boss, ['champions'])).toBe(0);
    // The road that is all champions keeps its own three.
    const w = new World(setup({ wave: 5, vows: ['champions'], omen: 'champions' }));
    expect(has(play(w, w.wave.seconds * 0.7), 'champion').length).toBe(ROAD.champions.count);
  });

  it('One Hand Fewer: one hand fewer for what is bought', () => {
    const plain = newRun('bram', 3);
    const sworn = newRun('bram', 3, [], ROAD.roads, { vows: ['hand'] });
    expect(handsOf(plain)).toBe(SLOTS);
    expect(handsOf(sworn)).toBe(SLOTS - VOW.hands);
    Object.assign(sworn, { phase: 'camp', gold: 1e6, weapons: WEAPONS.slice(0, SLOTS - VOW.hands).map((w) => ({ id: w.id, tier: 0 })) });
    sworn.offers = [{ kind: 'weapon', id: WEAPONS[SLOTS].id, tier: 0, price: 1, sold: false, locked: false }];
    expect(whyNot(sworn, 0)).toBe('hands');
    expect(buy(sworn, 0)).toBe(false);
    Object.assign(plain, { phase: 'camp', gold: 1e6, weapons: [...sworn.weapons], offers: sworn.offers.map((o) => ({ ...o })) });
    expect(buy(plain, 0)).toBe(true);
  });

  it('The Early Dark: every wave is fought by night', () => {
    expect(new World(setup({ wave: 3 })).night).toBe(false);
    expect(new World(setup({ wave: 3, vows: ['dusk'] })).night).toBe(true);
  });

  it('Open Wounds: a wave is begun with the health the last one left', () => {
    const run = newRun('bram', 3, [], ROAD.roads, { vows: ['wounds'] });
    expect(setupOf(run).hurt).toBe(1);
    const w = new World(setupOf(run));
    w.hero.hp = Math.round(w.hero.maxHp * 0.4);
    Object.assign(w, { over: 'cleared' });
    endWave(run, w);
    run.phase = 'fight';
    const next = new World(setupOf(run));
    expect(next.hero.hp / next.hero.maxHp).toBeCloseTo(0.4, 1);
    // Without the vow a wave is begun whole.
    const plain = newRun('bram', 3);
    plain.left = 0.4;
    expect(new World(setupOf(plain)).hero.hp).toBe(new World(setupOf(plain)).hero.maxHp);
  });

  it('Second Wind: a captain that falls gets up once, and stays down the second time', () => {
    const fight = (vows: string[]): { events: Ev[]; w: World } => {
      const w = alone(new World(setup({ own: { id: 'gatekeeper', tier: 3 }, vows, stats: stats({ maxHp: 9999, damage: 100000 }) })));
      stand(w, 'warlord', w.hero.x + 60, w.hero.y, { boss: true, hp: 1000, maxHp: 1000 }, true);
      return { events: play(w, 6), w };
    };
    const hard = fight(['wind']);
    expect(has(hard.events, 'second').length).toBe(1);
    expect(has(hard.events, 'fall').filter((e) => e.boss).length).toBe(1);
    expect(hard.w.felled).toEqual(['warlord']);
    const plain = fight([]);
    expect(has(plain.events, 'second').length).toBe(0);
    expect(plain.w.felled).toEqual(['warlord']);
    // It gets up with a share of its health, and is down for a moment first.
    const w = alone(new World(setup({ own: { id: 'gatekeeper', tier: 3 }, vows: ['wind'], stats: stats({ maxHp: 9999, damage: 100000 }) })));
    const f = stand(w, 'warlord', w.hero.x + 60, w.hero.y, { boss: true, hp: 1000, maxHp: 1000 }, true);
    for (let i = 0; i < 600 && !f.second; i++) w.step({ x: 0, y: 0 });
    expect(f.dead).toBe(false);
    expect(f.hp).toBe(Math.round(1000 * VOW.wind));
    expect(f.stun).toBeGreaterThan(1);
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
    expect(cutpurse).toMatchObject({ name: 'Bandit', met: true, count: 12, counted: 'killed' });
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
    const run = { ...newRun('bram', 5), wave: 11, phase: 'camp' as const };
    const out = record(save, run, 0);
    expect(out.deeds).toEqual(['wave5']);
    expect(run.deeds).toEqual(['wave5']);
    expect(record(save, run, 0).deeds).toEqual([]);
    expect(masteryXp(save, 'bram')).toBe(0);
    (run as RunData).phase = 'over';
    const tally = record(save, run, 0).tally;
    expect(tally?.lines.find((l) => l.why === 'Still Standing')?.xp).toBe(DEEDS.find((d) => d.id === 'wave5')?.xp);
    // Another run that comes as far is paid for its waves, not for the quest again.
    const next = ended('wren', 10);
    expect(record(save, next, 0).tally?.lines.some((l) => l.why === 'Still Standing')).toBe(false);
  });

  it('each kind of deed is done by what it asks for', () => {
    expect(done(ended('bram', 25))).toEqual(expect.arrayContaining(['wave5', 'wave10']));
    expect(done(ended('bram', 24))).not.toContain('wave10');
    expect(done(ended('bram', 3, { felled: ['warlord'] }))).toContain('captain1');
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

  it('a win is a deed, more of them for the vows it was sworn under, and one for going alone', () => {
    const alone1 = done(ended('wren', LAST_WAVE, { vows: ['march', 'lean'] }));
    expect(alone1).toEqual(expect.arrayContaining(['win', 'vows1', 'vows2', 'alone']));
    expect(alone1).not.toContain('vows4');
    const banded = done(ended('bram', LAST_WAVE, { band: [{ id: 'pip', bond: 0 }] }));
    expect(banded).toContain('win');
    expect(banded).not.toContain('alone');
    expect(banded).not.toContain('vows1');
    // A stray let out of a cage on the way is not a band that was brought.
    expect(done(ended('bram', LAST_WAVE, { band: [{ id: 'pip', bond: 0, stray: true }] }))).toContain('alone');
    expect(done(ended('bram', LAST_WAVE - 1))).not.toContain('win');
    const save = freshSave();
    for (const h of HEROES.slice(0, 5)) record(save, ended(h.id, LAST_WAVE), 0);
    expect(save.deeds).toContain('wins5');
    expect(save.deeds).not.toContain('wins10');
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

  it('are listed with those that unlock somebody, the crates\' own and those that pay mastery, what is left to do first', () => {
    const save = freshSave();
    const rows = deedsOf(save);
    expect(rows.length).toBe(DEEDS.length + HEROES.filter((h) => h.unlock).length + COMPANIONS.filter((c) => c.unlock.kind !== 'start').length + CRATES.length);
    const orrin = rows.find((r) => r.id === 'hero-orrin');
    expect(orrin).toMatchObject({ name: '???', done: false, opens: 'a hero', says: featSays({ kind: 'wave', wave: 5 }) });
    // A hidden companion says its riddle, and nothing of who it is.
    const hidden = rows.filter((r) => r.id.startsWith('friend-') && r.says.startsWith('Hidden'));
    expect(hidden.length).toBe(COMPANIONS.filter((c) => c.unlock.kind === 'hidden').length);
    for (const r of hidden) expect(r).toMatchObject({ name: '???', opens: 'a companion' });
    record(save, ended('bram', 6), 0);
    const after = deedsOf(save);
    expect(after.find((r) => r.id === 'hero-orrin')).toMatchObject({ name: 'Orrin Quillon', done: true });
    expect(after.find((r) => r.id === 'friend-pip')).toMatchObject({ name: 'Pip', done: true });
    const firstDone = after.findIndex((r) => r.done);
    expect(after.slice(firstDone).every((r) => r.done)).toBe(true);
    expect(after.find((r) => r.id === 'wave5')?.share).toBeCloseTo(0.6);
    // Every quest that pays says how much.
    for (const r of after.filter((x) => x.kind === 'quest')) expect(r.xp, r.id).toBeGreaterThan(0);
  });

  it('the next quests are the ones nearest done, and never a hidden one', () => {
    const save = freshSave();
    record(save, ended('bram', 6), 0);
    const next = nextDeeds(save, 4);
    expect(next.length).toBe(4);
    expect(next.every((r) => !r.done)).toBe(true);
    for (let i = 1; i < next.length; i++) expect(next[i - 1].share).toBeGreaterThanOrEqual(next[i].share);
    expect(next[0].share).toBeGreaterThan(0);
    expect(nextDeeds(save, 60).some((r) => r.says.startsWith('Hidden'))).toBe(false);
  });
});

describe('a crate\'s own deed', () => {
  it('unlocks the crate, and the next run has it', () => {
    const save = freshSave();
    expect(save.crates).toEqual([]);
    // Three bows in one run: Wren's own and two more.
    const out = record(save, ended('wren', 4, { weapons: [{ id: 'bow', tier: 0 }, { id: 'crossbow', tier: 0 }] }), 0);
    expect(out.crates).toEqual(['fletcher']);
    expect(save.crates).toEqual(['fletcher']);
    expect(shutOf(save)).not.toContain(thingKey(CRATES[0].things[0]));
    expect(poolOf(save)).toContain('longbow');
    expect(poolOf(freshSave())).not.toContain('longbow');
    // A run already under way keeps the armory it began with; the next one has the crate.
    expect(beginRun(save, 'bram', 2).pool).toContain('longbow');
  });

  it('each crate\'s deed can be done with what a first run is offered', () => {
    const save = freshSave();
    record(save, ended('wren', 4, { weapons: [{ id: 'bow', tier: 0 }, { id: 'crossbow', tier: 0 }] }), 0);
    expect(save.crates).toContain('fletcher');
    record(save, ended('nan', 4, { weapons: [{ id: 'torch', tier: 0 }, { id: 'torch', tier: 0 }] }), 0);
    expect(save.crates).toContain('chandler');
    record(save, ended('ysolde', 4, { weapons: [{ id: 'frost', tier: 0 }, { id: 'frost', tier: 0 }] }), 0);
    expect(save.crates).toContain('winter');
    record(save, ended('maren', 4, { weapons: [{ id: 'censer', tier: 0 }, { id: 'censer', tier: 0 }], level: 15, gold: 300 }), 0);
    expect(save.crates).toEqual(expect.arrayContaining(['reliquary', 'scholar', 'gambler']));
    record(save, ended('bram', 4, { weapons: [{ id: 'sword', tier: TIERS - 1 }] }), 0);
    expect(save.crates).toContain('armorer');
    save.kills = 5000;
    for (const o of OMENS) save.seen[`omen:${o.id}`] = 1;
    record(save, ended('bram', 2), 0);
    expect(save.crates.sort()).toEqual(CRATES.map((c) => c.id).sort());
  });

  it('a run may be offered only the weapons it is given', () => {
    const run = { ...newRun('bram', 9, [], ROAD.roads, { pool: ['sword', 'bow'] }), wave: 5, phase: 'camp' as const, gold: 1e9 };
    const seen = new Set<string>();
    for (let n = 0; n < 200; n++) {
      reroll(run);
      for (const o of run.offers) if (o.kind === 'weapon') seen.add(o.id);
    }
    expect([...seen].sort()).toEqual(['bow', 'sword']);
  });
});

describe('the day\'s road', () => {
  it('is the same for everyone on a day, and another on the next', () => {
    const a = dailyOf('2026-11-25');
    expect(dailyOf('2026-11-25')).toEqual(a);
    expect(HEROES.some((h) => h.id === a.hero)).toBe(true);
    expect(a.band.length).toBe(1);
    expect(COMPANIONS.some((c) => c.id === a.band[0])).toBe(true);
    const days = [...Array(40).keys()].map((i) => dailyOf(`2026-12-${String(i + 1).padStart(2, '0')}`));
    expect(new Set(days.map((d) => d.seed)).size).toBe(40);
    expect(new Set(days.map((d) => d.hero)).size).toBeGreaterThan(5);
  });

  it('is one run a day, the same run whatever the Hold has, and its best is kept', () => {
    const save = stocked();
    save.mastery = Object.fromEntries(HEROES.map((h) => [h.id, 99999]));
    save.won = { bram: VOWS.map((v) => v.id) };
    save.vows = ['march'];
    const date = '2026-11-25';
    expect(dailyTaken(save, date)).toBe(false);
    const run = beginDaily(save, date);
    if (!run) throw new Error('no run');
    const d = dailyOf(date);
    expect(run).toMatchObject({ hero: d.hero, daily: date, vows: [], shut: [], pool: null, gold: 0, relics: [], forks: ROAD.roads, alt: false });
    expect(run.boons).toEqual(noBoons());
    expect(run.band.map((b) => b.id)).toEqual(d.band);
    expect(run).toEqual(beginDaily(freshSave(), date));
    expect(dailyTaken(save, date)).toBe(true);
    expect(beginDaily(save, date)).toBeNull();
    // How far it went and how long it was fought are written down as it goes, and paid like any run.
    run.wave = 8;
    run.time = 301.4;
    run.phase = 'camp';
    record(save, run, 0);
    expect(save.daily).toEqual({ date, wave: 7, seconds: 301 });
    expect(save.dailyBest).toBe(7);
    run.phase = 'over';
    // It is told what it came to, and pays no hero: it is the same run for everyone.
    const xp = masteryXp(save, d.hero);
    expect(record(save, run, 0).tally?.total).toBeGreaterThan(0);
    expect(masteryXp(save, d.hero)).toBe(xp);
    // The next day is another road, and a worse day does not lower the best.
    const next = beginDaily(save, '2026-11-26');
    if (!next) throw new Error('no run');
    next.wave = 3;
    next.phase = 'over';
    record(save, next, 0);
    expect(save.daily).toMatchObject({ date: '2026-11-26', wave: 2 });
    expect(save.dailyBest).toBe(7);
  });
});

describe('the save and the Hold', () => {
  it('keeps what the Hold has through being written and read', () => {
    const save = freshSave();
    // The screens count a run as it begins (session.ts): a save never has more runs ended than begun.
    save.runs = 3;
    record(save, ended('wren', LAST_WAVE, { told: { met: [], slain: {}, roads: [], unstruck: ['warlord'] } }), 0);
    record(save, ended('bram', 3, { weapons: [{ id: 'sword', tier: TIERS - 1 }] }), 0);
    toggleVow(save, 'march');
    pickGift(save, 'wren', 4, 1);
    const run = beginDaily(save, '2026-11-25');
    if (run) record(save, { ...run, wave: 3, phase: 'over' }, 0);
    save.run = { ...beginRun(save, 'wren', 4), wave: 12, phase: 'camp' };
    const back = repair(JSON.parse(JSON.stringify(save)));
    expect(back.v).toBe(SAVE_VERSION);
    expect(back).toEqual(save);
    expect(back.picks).toEqual({ wren: { 4: 1 } });
    expect(back.mastery.wren).toBeGreaterThan(0);
    expect(back.vows).toEqual(['march']);
    // The run kept in its camp is carried on where it was.
    expect(back.run).toMatchObject({ hero: 'wren', wave: 12, phase: 'camp' });
  });

  it('mends a save from the board: what it bought and held is mastery for the hero it played most, and its run is let go', () => {
    const old = JSON.parse(JSON.stringify(freshSave())) as Record<string, unknown>;
    for (const k of ['mastery', 'picks']) delete old[k];
    const run = JSON.parse(JSON.stringify({ ...newRun('wren', 8), wave: 4, phase: 'camp' })) as Record<string, unknown>;
    const back = repair({
      ...old, v: 4, best: { bram: 14, wren: 6 }, felled: ['warlord'], run, renown: 40, earned: 900, board: ['hero-1', 'arm-1', 'nonsense'], oaths: ['bram-win'], alt: ['bram'], places: 3,
      seen: { 'hero:bram': 9, 'hero:wren': 2 }, friends: ['pip', 'greta', 'nobody'], band: ['greta', 'pip', 'biscuit'],
    });
    expect(back.v).toBe(SAVE_VERSION);
    expect(back.run).toBeNull();
    expect(back.mastery.bram).toBeGreaterThan(40);
    expect(back.mastery.wren).toBeUndefined();
    for (const k of ['renown', 'earned', 'board', 'oaths', 'alt', 'places']) expect(back, k).not.toHaveProperty(k);
    // Whoever it had is kept, Biscuit with them, and a best of 14 is one more slot than the start.
    expect(back.friends).toEqual(expect.arrayContaining(['biscuit', 'pip', 'greta']));
    expect(back.friends).not.toContain('nobody');
    expect(back.band).toEqual(['greta', 'pip']);
    // Whoever it has played and beaten is in the Codex.
    expect(met(back, 'hero', 'bram')).toBe(true);
    expect(met(back, 'foe', 'warlord')).toBe(true);
  });

  it('carries a run of this version on from its camp', () => {
    const save = freshSave();
    save.run = { ...newRun('wren', 8), wave: 4, phase: 'camp' };
    const back = repair(JSON.parse(JSON.stringify(save)));
    if (!back.run) throw new Error('no run');
    expect(survived(back.run)).toBe(3);
    expect(march(back.run)).toBe(true);
  });

  it('throws out what is not the Hold\'s', () => {
    const back = repair({
      ...freshSave(), crates: ['fletcher', 'nonsense', 'fletcher'], vows: ['march', 'made-up'], won: { bram: ['wind', 'no'], nobody: [] }, mastery: { bram: 50, wren: -4, nobody: 9, fenn: 1e9 },
      picks: { bram: { 4: 1, 9: 7 }, nobody: { 1: 1 } }, deeds: ['win', 'made-up'], daily: { date: 5 }, dailyBest: -3, seen: { 'foe:cutpurse': 4, bad: -1, worse: 'x' }, tally: 'no',
    });
    expect(back.crates).toEqual(['fletcher']);
    expect(back.vows).toEqual(['march']);
    expect(back.won).toEqual({ bram: ['wind'] });
    expect(back.mastery).toEqual({ bram: 50, wren: 0, fenn: 980 });
    expect(back.picks).toEqual({ bram: { 4: 1 } });
    expect(back.deeds).toEqual(['win']);
    expect(back.daily).toBeNull();
    expect(back.dailyBest).toBe(0);
    expect(back.seen).toEqual({ 'foe:cutpurse': 4 });
    expect(back.tally).toBeNull();
  });
});

describe('what unlocks a thing says the wave its boss truly stands on', () => {
  it('names the land boss wave for every boss quest, hero and companion', async () => {
    const { bossWave } = await import('../src/game/data');
    const { deedsOf, routeSays } = await import('../src/game/hold');
    const save = freshSave();
    const bossWaves = (text: string): number[] => [...text.matchAll(/boss of wave (\d+)/gi)].map((m) => Number(m[1]));
    for (const d of DEEDS) {
      if (d.test.kind !== 'boss') continue;
      const row = deedsOf(save).find((r) => r.id === d.id);
      expect(bossWaves(row?.says ?? '')).toEqual([bossWave(d.test.boss)]);
    }
    for (const c of COMPANIONS) {
      if (c.unlock.kind !== 'deed' || c.unlock.test.kind !== 'boss') continue;
      expect(bossWaves(routeSays(c))).toEqual([bossWave(c.unlock.test.boss)]);
    }
    for (const h of HEROES) {
      if (h.unlock?.kind !== 'boss') continue;
      const row = deedsOf(save).find((r) => r.id === `hero-${h.id}`);
      expect(bossWaves(row?.says ?? '')).toEqual([bossWave(h.unlock.boss)]);
    }
  });
});

describe('each mastery level says what it gives in a few words', () => {
  it('has a short label for every gift of every hero, short enough to sit under a medallion', async () => {
    const { giftShort, trackRows } = await import('../src/game/hold');
    const save = freshSave();
    for (const h of HEROES) {
      for (const row of trackRows(save, h.id)) {
        for (const g of row.gifts) {
          const s = giftShort(g.gift);
          expect(s.length).toBeGreaterThan(0);
          expect(s.length).toBeLessThanOrEqual(14);
        }
      }
    }
  });
});
