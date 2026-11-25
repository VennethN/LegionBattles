import { describe, expect, it } from 'vitest';
import {
  BAND, BOARD, BRANCHES, BREATH, COMPANIONS, CRATES, CRATE_PRICES, DEEDS, ENEMIES, HALL, HEROES, ITEMS, KENNEL, KINDS, LAST_WAVE, OATHS, OMENS, PLACE_PRICE, REF, RELICS, RENOWN, ROAD, SLOTS, TIERS, VOW, VOWS,
  WEAPONS, thingKey, waveOf,
} from '../src/game/data';
import {
  altOpen, badge, beginDaily, beginRun, boardFull, boardOf, boonsOf, buyCrate, buyNode, canBuyNode, owns, refundBoard, buyFriend, buyHero, buyPlace, buyWare, chronicleOf, count, cratePrice, crateThings, dailyOf, dailyTaken,
  deedsOf, epithetOf, featSays, forksNow, friendPrice, hasWon, heroPrice, holdFull, inArmory, met, nextDeeds, oathsOf, placePrice, poolOf, setAlt, shutOf, startRelic, tallyOf, termsOf, toggleVow,
  vowsNext, vowsOpen, waresOf,
} from '../src/game/hold';
import { bandSize, banish, buy, endWave, handsOf, march, newRun, openPack, relook, reroll, rerollPrice, setupOf, statsOf, survived, takeRelic, whyNot, type RunData } from '../src/game/run';
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

  it('has a board of four branches, each place after the one it needs and dearer than it, and eight vows', () => {
    expect(new Set(BOARD.map((n) => n.id)).size).toBe(BOARD.length);
    expect(BOARD.length).toBeGreaterThanOrEqual(30);
    for (const b of BRANCHES) expect(BOARD.filter((n) => n.branch === b.id && !n.needs).length, b.id).toBe(1);
    const places = new Set<string>();
    for (const n of BOARD) {
      expect(n.name.length, n.id).toBeGreaterThan(3);
      expect(n.price, n.id).toBeGreaterThan(0);
      // No two places stand in the same spot of the board.
      const spot = `${n.at.col},${n.at.row}`;
      expect(places.has(spot), n.id).toBe(false);
      places.add(spot);
      if (!n.needs) continue;
      const before = BOARD.find((x) => x.id === n.needs);
      expect(before, n.id).toBeDefined();
      expect(before?.branch).toBe(n.branch);
      expect(n.price).toBeGreaterThan(before?.price ?? 0);
      expect(n.at.row).toBeGreaterThan(before?.at.row ?? 99);
    }
    // There is always something a new player can nearly afford: the feet of the branches are cheap.
    expect(Math.max(...BOARD.filter((n) => !n.needs).map((n) => n.price))).toBeLessThanOrEqual(40);
    expect(VOWS.length).toBe(8);
    expect(new Set(VOWS.map((v) => v.id)).size).toBe(8);
    for (const v of VOWS) expect(v.says.length, v.id).toBeGreaterThan(8);
  });

  it('has deeds with a name each, and three oaths for every hero, each opening something of theirs', () => {
    expect(new Set(DEEDS.map((d) => d.id)).size).toBe(DEEDS.length);
    for (const d of DEEDS) {
      expect(d.name.length, d.id).toBeGreaterThan(3);
      expect(d.says.length, d.id).toBeGreaterThan(8);
      expect(d.renown, d.id).toBeGreaterThan(0);
    }
    expect(DEEDS.length).toBeGreaterThanOrEqual(25);
    expect(OATHS.length).toBe(HEROES.length * 3);
    expect(new Set(OATHS.map((o) => o.id)).size).toBe(OATHS.length);
    for (const h of HEROES) {
      const mine = OATHS.filter((o) => o.hero === h.id);
      expect(mine.map((o) => o.opens.kind).sort(), h.id).toEqual(['epithet', 'relic', 'rule']);
      for (const o of mine) {
        expect(o.says.length, o.id).toBeGreaterThan(10);
        if (o.opens.kind === 'epithet') expect(o.opens.epithet).not.toBe(h.epithet);
        if (o.opens.kind === 'relic') expect(RELICS.some((r) => o.opens.kind === 'relic' && r.id === o.opens.relic), o.id).toBe(true);
      }
    }
  });

  it('names captains, kinds and relics through one table, and every name in it is one the game has', () => {
    for (const id of Object.values(REF.captain)) expect(ENEMIES.some((e) => e.id === id && e.ai === 'boss'), id).toBe(true);
    for (const id of Object.values(REF.kind)) expect(KINDS.some((k) => k.id === id), id).toBe(true);
    for (const id of Object.values(REF.relic)) expect(RELICS.some((r) => r.id === id), id).toBe(true);
    expect(Object.keys(REF.relic).sort()).toEqual(HEROES.map((h) => h.id).sort());
  });

  it('gives every crate a deed that opens it for nothing', () => {
    for (const c of CRATES) expect(c.deedSays.length, c.id).toBeGreaterThan(10);
  });
});

describe('renown', () => {
  it('is paid for waves, captains and the win, more for each vow sworn, and for deeds as they are', () => {
    const run = ended('bram', 8, { felled: ['warlord'] });
    expect(tallyOf(run).total).toBe(8 * RENOWN.wave + RENOWN.captain);
    expect(tallyOf(run).lines.map((l) => l.why)).toEqual(['Waves come through', 'Captains beaten']);
    const won = ended('bram', LAST_WAVE, { felled: ['warlord', 'colossus', 'jarl'] });
    const base = LAST_WAVE * RENOWN.wave + 3 * RENOWN.captain + RENOWN.win;
    expect(hasWon(won)).toBe(true);
    expect(tallyOf(won).total).toBe(base);
    const hard = { ...won, vows: ['march', 'lean'], deeds: ['win'] };
    const deed = DEEDS.find((d) => d.id === 'win')?.renown ?? 0;
    // Each vow pays more of the run's own renown, and a deed pays what it pays.
    expect(tallyOf(hard).total).toBe(base + Math.round(base * RENOWN.vow * 2) + deed);
    expect(tallyOf(hard).lines.some((l) => l.why === 'Vows kept')).toBe(true);
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

describe('the board', () => {
  /** A save that owns these places and whatever each needs first. */
  const owning = (...ids: string[]): SaveData => {
    const save = rich(100000);
    const want = (id: string): void => {
      const n = BOARD.find((x) => x.id === id);
      if (!n) throw new Error(id);
      if (n.needs && !owns(save, n.needs)) want(n.needs);
      if (!owns(save, id)) expect(buyNode(save, id), id).toBe(true);
    };
    ids.forEach(want);
    return save;
  };

  it('sells a place once, for its price, after the one before it', () => {
    const cost = (id: string): number => BOARD.find((n) => n.id === id)?.price ?? 0;
    const save = rich(cost('hero-1') + cost('body-1') + cost('arm-1') - 1);
    const had = save.renown;
    expect(canBuyNode(save, 'hero-1')).toBe(true);
    expect(canBuyNode(save, 'body-1')).toBe(false);
    expect(buyNode(save, 'body-1')).toBe(false);
    expect(buyNode(save, 'hero-1')).toBe(true);
    expect(save.renown).toBe(had - cost('hero-1'));
    expect(buyNode(save, 'hero-1')).toBe(false);
    expect(canBuyNode(save, 'body-1')).toBe(true);
    expect(canBuyNode(save, 'arm-1')).toBe(true);
    expect(buyNode(save, 'body-1')).toBe(true);
    // Renown short, or no such place.
    expect(buyNode(save, 'arm-1')).toBe(false);
    expect(buyNode(save, 'nothing')).toBe(false);
    const rows = boardOf(save);
    expect(rows.length).toBe(BOARD.length);
    expect(rows.find((r) => r.node.id === 'hero-1')).toMatchObject({ owned: true, open: true, can: false });
    expect(rows.find((r) => r.node.id === 'arm-1')).toMatchObject({ owned: false, open: true, can: false });
    expect(rows.find((r) => r.node.id === 'arm-2')).toMatchObject({ owned: false, open: false, can: false });
    for (const r of rows) expect(r.says.length, r.node.id).toBeGreaterThan(8);
  });

  it('can be taken back whole for what was paid, and spent again another way', () => {
    const save = owning('body-2', 'band-1');
    const spent = 100000 - save.renown;
    expect(spent).toBe(['hero-1', 'body-1', 'body-2', 'band-1'].reduce((n, id) => n + (BOARD.find((x) => x.id === id)?.price ?? 0), 0));
    expect(refundBoard(save)).toBe(spent);
    expect(save.renown).toBe(100000);
    expect(save.board).toEqual([]);
    expect(refundBoard(save)).toBe(0);
    expect(buyNode(save, 'arm-1')).toBe(false);
    expect(buyNode(save, 'hero-1')).toBe(true);
  });

  it('the hero grows for good: health, armor, harm, speed of striking and of foot, luck, reach', () => {
    const plain = statsOf(beginRun(freshSave(), 'bram', 1));
    const save = owning('body-5', 'arm-5', 'fortune-5');
    const grown = statsOf(beginRun(save, 'bram', 1));
    expect(grown.maxHp).toBe(plain.maxHp + 3 + 3 + 4);
    expect(grown.armor).toBe(plain.armor + 2);
    expect(grown.speed).toBe(plain.speed + 4);
    expect(grown.damage).toBe(plain.damage + 4 + 5 + 6);
    expect(grown.haste).toBe(plain.haste + 4 + 5);
    expect(grown.luck).toBe(plain.luck + 5 + 8);
    expect(grown.pickup).toBe(plain.pickup + 15);
    expect(new World(setupOf(beginRun(save, 'bram', 1))).hero.maxHp).toBe(grown.maxHp);
    expect(boonsOf(save).stats).toEqual({ maxHp: 10, armor: 2, speed: 4, damage: 15, haste: 9, luck: 13, pickup: 15 });
  });

  it('the purse: coins to begin with, free looks at other wares, and marks to strike a ware from the table', () => {
    const save = owning('purse-7');
    const run = { ...beginRun(save, 'bram', 31), wave: 5, phase: 'camp' as const };
    expect(run.gold).toBe(10 + 15 + 20);
    expect(beginRun(freshSave(), 'bram', 31).gold).toBe(0);
    // Two free looks in each camp. The Merchant's Seal gives none: it halves the dearest ware now.
    run.gold = 1000;
    expect(rerollPrice(run)).toBe(0);
    reroll(run);
    expect(rerollPrice(run)).toBe(0);
    reroll(run);
    expect(rerollPrice(run)).toBeGreaterThan(0);
    expect(run.gold).toBe(1000);
    run.relics = ['seal'];
    expect(rerollPrice(run)).toBeGreaterThan(0);
    // Four marks: a ware struck is not offered again in that run.
    expect(run.banishes).toBe(4);
    run.gold = 1e9;
    const struck = run.offers[0];
    expect(banish(run, 0)).toBe(true);
    expect(run.banishes).toBe(3);
    expect(run.shut).toContain(thingKey(struck));
    for (let n = 0; n < 300; n++) {
      run.wave = 3 + (n % 16);
      reroll(run);
      for (const o of run.offers) expect(thingKey(o) === thingKey(struck)).toBe(false);
    }
    const bare = { ...beginRun(freshSave(), 'bram', 31), wave: 5, phase: 'camp' as const };
    reroll(bare);
    expect(banish(bare, 0)).toBe(false);
  });

  it('fortune: more experience, a third road, and a second look at a relic\'s choice', () => {
    const save = owning('fortune-7');
    const plain = beginRun(freshSave(), 'bram', 1);
    endWave(plain, cleared(plain, { xp: 10 }));
    const run = beginRun(save, 'bram', 1);
    endWave(run, cleared(run, { xp: 10 }));
    expect(run.xp).toBeCloseTo(plain.xp * 1.14);
    expect(forksNow(freshSave())).toBe(ROAD.roads);
    expect(forksNow(save)).toBe(ROAD.roads + 1);
    const camp = { ...beginRun(save, 'bram', 77), wave: 6, phase: 'camp' as const };
    march(camp);
    expect(camp.roads.length).toBe(3);
    // A second look, once at each choice.
    const pick = beginRun(save, 'bram', 5);
    endWave(pick, cleared(pick, { felled: ['warlord'] }));
    pick.pending = 0;
    pick.phase = 'relic';
    const first = [...pick.relicChoices];
    expect(first.length).toBeGreaterThan(0);
    expect(relook(pick)).toBe(true);
    for (const id of pick.relicChoices) expect(first).not.toContain(id);
    expect(relook(pick)).toBe(false);
    const bare = beginRun(freshSave(), 'bram', 5);
    endWave(bare, cleared(bare, { felled: ['warlord'] }));
    bare.phase = 'relic';
    expect(relook(bare)).toBe(false);
  });

  it('the band: companions with more health, harder blows, and sooner on their feet', () => {
    const band = (save: SaveData): World => new World(setupOf(beginRun({ ...save, friends: ['greta'], band: ['greta'] }, 'bram', 1)));
    const plain = band(freshSave());
    const grown = band(owning('band-6'));
    expect(grown.band[0].maxHp).toBe(Math.round(plain.band[0].maxHp * 1.35));
    // A companion's blow is a small whole number, so a quarter more is a quarter more or the next whole number up.
    expect(grown.allyHarm(grown.band[0])).toBe(Math.max(1, Math.round((plain.band[0].def.dmg + plain.band[0].def.grow * plain.band[0].bond * 0) * 1.25)));
    const downFor = (w: World): number => {
      const a = w.band[0];
      stand(alone(w), 'bruiser', a.x + 4, a.y, { hp: 99999999, dmg: 99999 }, true);
      for (let i = 0; i < 600 && a.down <= 0; i++) w.step({ x: 0, y: 0 });
      return a.down;
    };
    const was = downFor(plain);
    expect(was).toBeGreaterThan(0);
    expect(downFor(grown) / was).toBeCloseTo(0.5, 1);
  });

  it('fury fills faster', () => {
    const filled = (save: SaveData): number => {
      const run = beginRun(save, 'bram', 1);
      const w = alone(new World({ ...setupOf(run), stats: stats({ maxHp: 9999, damage: 100000 }) }));
      for (let i = 0; i < 3; i++) stand(w, 'cutpurse', w.hero.x + 50 + i, w.hero.y, { hp: 1 }, true);
      play(w, 3);
      return w.fury;
    };
    const plain = filled(freshSave());
    expect(plain).toBeGreaterThan(0);
    expect(filled(owning('arm-6')) / plain).toBeCloseTo(1.15, 1);
  });

  it('A Second Breath: once in a run, a killing blow leaves the hero standing', () => {
    const save = owning('body-6');
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
    // Without that place on the board there is none.
    const bare = alone(new World(setup({ stats: stats({ maxHp: 20 }) })));
    stand(bare, 'bruiser', bare.hero.x + 6, bare.hero.y, { hp: 99999, dmg: 500 }, true);
    play(bare, 0.2);
    expect(bare.over).toBe('dead');
  });
});

describe('vows', () => {
  const all = VOWS.map((v) => v.id);

  it('are opened by winning: the first few by a first win, more for each vow a win was sworn under', () => {
    const save = freshSave();
    expect(vowsOpen(save)).toEqual([]);
    expect(vowsNext(save)).toBe('Win the twentieth wave.');
    expect(toggleVow(save, 'march')).toBe(false);
    expect(badge(save, 'bram')).toBeNull();
    record(save, ended('bram', LAST_WAVE), 0);
    expect(badge(save, 'bram')).toEqual([]);
    expect(vowsOpen(save)).toEqual(all.slice(0, VOW.first));
    expect(vowsNext(save)).toBe('Win a run under a vow.');
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

  it('counts a win when the twentieth wave is come through, though the run goes on', () => {
    const save = freshSave();
    const run = { ...newRun('bram', 5), wave: LAST_WAVE + 1, phase: 'camp' as const };
    record(save, run, 0);
    expect(vowsOpen(save).length).toBe(VOW.first);
    expect(save.deeds).toContain('win');
    expect(save.renown).toBe(0);
    run.wave = LAST_WAVE + 3;
    (run as RunData).phase = 'over';
    const tally = record(save, run, 0).tally;
    expect(tally?.lines.some((l) => l.why === 'The Morning')).toBe(true);
    expect(save.renown).toBe(tally?.total);
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
    expect(champions(5, ['champions'])).toBe(1);
    expect(champions(5, [])).toBe(0);
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

  it('are listed with those that open somebody, the crates\' own and the oaths of whoever is open, what is left to do first', () => {
    const save = freshSave();
    const rows = deedsOf(save);
    const openHeroes = HEROES.filter((h) => !h.unlock).length;
    expect(rows.length).toBe(DEEDS.length + HEROES.filter((h) => h.unlock).length + COMPANIONS.length + CRATES.length + openHeroes * 3);
    const orrin = rows.find((r) => r.id === 'hero-orrin');
    expect(orrin).toMatchObject({ name: '???', done: false, opens: 'a hero', says: featSays({ kind: 'wave', wave: 5 }) });
    // The oaths of a hero who is not open are not shown: nothing of them is told yet.
    expect(rows.some((r) => r.hero === 'orrin')).toBe(false);
    record(save, ended('bram', 6), 0);
    const after = deedsOf(save);
    expect(after.find((r) => r.id === 'hero-orrin')).toMatchObject({ name: 'Orrin Quillon', done: true });
    expect(after.filter((r) => r.hero === 'orrin').length).toBe(3);
    const firstDone = after.findIndex((r) => r.done);
    expect(after.slice(firstDone).every((r) => r.done)).toBe(true);
    expect(after.find((r) => r.id === 'wave10')?.share).toBeCloseTo(0.6);
  });

  it('the next deeds are the ones nearest done, and then the oaths of the hero just played', () => {
    const save = freshSave();
    record(save, ended('bram', 6), 0);
    const next = nextDeeds(save, 'bram', 4);
    expect(next.length).toBe(4);
    expect(next.every((r) => !r.done)).toBe(true);
    for (let i = 1; i < next.length; i++) expect(next[i - 1].share).toBeGreaterThanOrEqual(next[i].share);
    expect(next[0].share).toBeGreaterThan(0);
    // With many asked for, Bram's own oaths are among them, and nobody else's.
    const many = nextDeeds(save, 'bram', 40);
    expect(many.filter((r) => r.kind === 'oath').map((r) => r.hero)).toEqual(['bram', 'bram', 'bram']);
    expect(nextDeeds(save, '', 3).length).toBe(3);
  });
});

describe('oaths', () => {
  it('a win as a hero gives them a new name', () => {
    const save = freshSave();
    expect(epithetOf(save, 'bram')).toBe('the Gatewarden');
    const out = record(save, ended('bram', LAST_WAVE), 0);
    expect(out.oaths).toEqual(['bram-win']);
    expect(epithetOf(save, 'bram')).toBe('the Gate That Held');
    expect(epithetOf(save, 'wren')).toBe('the Quiet Arrow');
    expect(oathsOf(save, 'bram').map((o) => o.done)).toEqual([true, false, false]);
    // It is done once.
    expect(record(save, ended('bram', LAST_WAVE), 0).oaths).toEqual([]);
  });

  it('a win under a vow gives them a relic to begin every run with', () => {
    const save = freshSave();
    expect(startRelic(save, 'wren')).toBe('');
    record(save, ended('wren', LAST_WAVE, { vows: ['march'] }), 0);
    expect(save.oaths).toEqual(expect.arrayContaining(['wren-win', 'wren-vow']));
    expect(startRelic(save, 'wren')).toBe(REF.relic.wren);
    expect(beginRun(save, 'wren', 3).relics).toEqual([REF.relic.wren]);
    // It is hers alone.
    expect(beginRun(save, 'bram', 3).relics).toEqual([]);
  });

  it('the oath about their quirk opens a second rule for their own weapon, which is then chosen or not', () => {
    const save = freshSave();
    expect(altOpen(save, 'bram')).toBe(false);
    expect(setAlt(save, 'bram', true)).toBe(false);
    // Bram's is a captain beaten with no blow landed; the same deed as Wren does nothing for him.
    record(save, ended('wren', 8, { told: { met: [], slain: {}, roads: [], unstruck: ['warlord'] } }), 0);
    expect(altOpen(save, 'bram')).toBe(false);
    record(save, ended('bram', 8, { told: { met: [], slain: {}, roads: [], unstruck: ['warlord'] } }), 0);
    expect(altOpen(save, 'bram')).toBe(true);
    expect(beginRun(save, 'bram', 3).alt).toBe(false);
    expect(setAlt(save, 'bram', true)).toBe(true);
    expect(beginRun(save, 'bram', 3).alt).toBe(true);
    expect(beginRun(save, 'wren', 3).alt).toBe(false);
    expect(setAlt(save, 'bram', false)).toBe(true);
    expect(beginRun(save, 'bram', 3).alt).toBe(false);
  });

  it('each hero\'s own oath is done by what it asks for, as that hero', () => {
    const kept = (hero: string, o: Partial<RunData>): boolean => {
      const save = freshSave();
      record(save, ended(hero, 12, o), 0);
      return save.oaths.includes(`${hero}-quirk`);
    };
    const four = (id: string): RunData['weapons'] => [{ id, tier: 0 }, { id, tier: 0 }, { id, tier: 0 }];
    expect(kept('wren', { clean: 5 })).toBe(true);
    expect(kept('wren', { clean: 4 })).toBe(false);
    expect(kept('orrin', { weapons: four('staff') })).toBe(true);
    expect(kept('orrin', { weapons: four('sword') })).toBe(false);
    expect(kept('fenn', { gold: 400 })).toBe(true);
    expect(kept('nan', { weapons: four('torch') })).toBe(true);
    expect(kept('isaura', { kills: 1500 })).toBe(true);
    expect(kept('isaura', { kills: 1499 })).toBe(false);
    expect(kept('hroth', { rose: 0 })).toBe(true);
    expect(kept('hroth', { rose: -1 })).toBe(false);
    expect(kept('aldous', { band: [{ id: 'pip', bond: BAND.bonds }] })).toBe(true);
    expect(kept('ysolde', { weapons: four('frost') })).toBe(true);
    expect(kept('maren', { weapons: four('censer') })).toBe(true);
  });

  it('the world tells a wave come through with no blow landed, and the run counts them', () => {
    const run = newRun('wren', 4);
    endWave(run, cleared(run));
    expect(run.clean).toBe(1);
    run.phase = 'fight';
    endWave(run, cleared(run, { struck: true }));
    expect(run.clean).toBe(1);
    expect(run.time).toBeGreaterThanOrEqual(0);
  });
});

describe('a crate\'s own deed', () => {
  it('opens the crate for nothing, and the next one bought costs as if it had been bought', () => {
    const save = freshSave();
    expect(save.crates).toEqual([]);
    // Three bows in one run: Wren's own and two more.
    const out = record(save, ended('wren', 4, { weapons: [{ id: 'bow', tier: 0 }, { id: 'crossbow', tier: 0 }] }), 0);
    expect(out.crates).toEqual(['fletcher']);
    expect(save.crates).toEqual(['fletcher']);
    expect(save.renown).toBeGreaterThan(0);
    expect(cratePrice(save)).toBe(CRATE_PRICES[1]);
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
    const save = rich(100000);
    save.board = BOARD.map((n) => n.id);
    save.won = { bram: VOWS.map((v) => v.id) };
    save.vows = ['march'];
    const date = '2026-11-25';
    expect(dailyTaken(save, date)).toBe(false);
    const run = beginDaily(save, date);
    if (!run) throw new Error('no run');
    const d = dailyOf(date);
    expect(run).toMatchObject({ hero: d.hero, daily: date, vows: [], shut: [], pool: null, gold: 0, relics: [], forks: ROAD.roads });
    expect(run.boons).toEqual(boonsOf(freshSave()));
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
    expect(record(save, run, 0).tally?.total).toBeGreaterThan(0);
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

describe('what the Hold sells, all of it', () => {
  it('lists everything with its price, and is full when nothing is left', () => {
    const save = rich(100000);
    const wares = waresOf(save);
    expect(wares.filter((w) => w.kind === 'hero').length).toBe(HEROES.filter((h) => h.unlock).length);
    expect(wares.filter((w) => w.kind === 'friend').length).toBe(COMPANIONS.length);
    expect(wares.filter((w) => w.kind === 'crate').length).toBe(CRATES.length);
    // Of the board, only the places that may be bought now are for sale: the foot of each branch.
    expect(wares.filter((w) => w.kind === 'node').map((w) => w.id).sort()).toEqual(BOARD.filter((n) => !n.needs).map((n) => n.id).sort());
    expect(wares.filter((w) => w.kind === 'place').length).toBe(1);
    expect(wares.every((w) => w.can && w.price > 0 && w.name.length > 2)).toBe(true);
    expect(holdFull(save)).toBe(false);
    let guard = 0;
    while (!holdFull(save) && guard++ < 200) expect(buyWare(save, waresOf(save)[0])).toBe(true);
    expect(holdFull(save)).toBe(true);
    expect(boardFull(save)).toBe(true);
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
    const save = rich(4321);
    buyCrate(save, CRATES[1].id);
    buyNode(save, 'hero-1');
    buyNode(save, 'arm-1');
    // The screens count a run as it begins (session.ts): a save never has more runs ended than begun.
    save.runs = 3;
    record(save, ended('bram', LAST_WAVE, { told: { met: [], slain: {}, roads: [], unstruck: ['warlord'] } }), 0);
    toggleVow(save, 'march');
    setAlt(save, 'bram', true);
    const run = beginDaily(save, '2026-11-25');
    if (run) record(save, { ...run, wave: 3, phase: 'over' }, 0);
    const back = repair(JSON.parse(JSON.stringify(save)));
    expect(back.v).toBe(SAVE_VERSION);
    expect(back).toEqual(save);
    expect(back.alt).toEqual(['bram']);
    expect(back.vows).toEqual(['march']);
  });

  it('mends a save from before the Hold, and carries its run on', () => {
    const old = JSON.parse(JSON.stringify(freshSave())) as Record<string, unknown>;
    const run = JSON.parse(JSON.stringify({ ...newRun('wren', 8), wave: 4, phase: 'camp' })) as Record<string, unknown>;
    for (const k of ['vows', 'shut', 'pool', 'boons', 'daily', 'alt', 'time', 'clean', 'banishes', 'relooked', 'breathed', 'deeds', 'told', 'paid', 'won']) delete run[k];
    for (const k of ['renown', 'earned', 'crates', 'board', 'vows', 'won', 'deeds', 'oaths', 'alt', 'daily', 'dailyBest', 'seen', 'tally']) delete old[k];
    const back = repair({ ...old, v: 3, best: { bram: 6 }, felled: ['warlord'], run });
    expect(back).toMatchObject({ v: SAVE_VERSION, renown: 0, crates: [], board: [], vows: [], won: {}, deeds: [], oaths: [], alt: [], daily: null, dailyBest: 0, tally: null });
    expect(back.run).toMatchObject({ hero: 'wren', wave: 4, vows: [], shut: [], pool: null, daily: '', alt: false, time: 0, clean: 0, banishes: 0, relooked: false, breathed: false, deeds: [], told: null, paid: false, won: false });
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
      ...freshSave(), renown: -5, earned: 'lots', crates: ['fletcher', 'nonsense', 'fletcher'], board: ['body-1', 'purse-1', 'purse-2', 'nonsense', 'purse-1'], vows: ['march', 'made-up'], won: { bram: ['wind', 'no'], nobody: [] },
      deeds: ['win', 'made-up'], oaths: ['bram-win', 'nobody-win'], alt: ['bram', 'wren'], daily: { date: 5 }, dailyBest: -3, seen: { 'foe:cutpurse': 4, bad: -1, worse: 'x' }, tally: 'no',
    });
    expect(back.renown).toBe(0);
    expect(back.crates).toEqual(['fletcher']);
    // A place whose way to it is missing is let go: the body's first step needs the hero's.
    expect(back.board).toEqual(['purse-1', 'purse-2']);
    expect(back.vows).toEqual(['march']);
    expect(back.won).toEqual({ bram: ['wind'] });
    expect(back.deeds).toEqual(['win']);
    expect(back.oaths).toEqual(['bram-win']);
    // A second rule is chosen only where an oath has opened it.
    expect(back.alt).toEqual([]);
    expect(back.daily).toBeNull();
    expect(back.dailyBest).toBe(0);
    expect(back.seen).toEqual({ 'foe:cutpurse': 4 });
    expect(back.tally).toBeNull();
  });
});
