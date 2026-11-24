import { describe, expect, it } from 'vitest';
import { DUNGEONS, RAIDS, RAID_BOSS, RESERVES, dungeonById, raidById } from '../src/data/expeditions';
import { LANDS } from '../src/data/lands';
import { packById } from '../src/data/packs';
import { STAGES, WORLDS } from '../src/data/stages';
import { UNITS, isStructure } from '../src/data/units';
import { addCard, cardOf } from '../src/game/cards';
import {
  TIERS, afterFloor, canGoOn, dungeonPrize, fielded, finishRaid, floorEnemies, floorInput, placeOpen, raidEnemies, raidInput, raidPrize,
  startRun, tierOpen, tierPack, tierStage, tiersCleared, toggleFielded, topTier, unitsOf,
} from '../src/game/expeditions';
import { cardMult } from '../src/game/rarity';
import { bestTeam, isEnemyTile, startingSave, structuresSize, teamSize } from '../src/game/rules';
import { repair, type SaveData } from '../src/game/state';
import { Battle, runBattle } from '../src/sim/battle';

/** A save far enough along the line, with a strong team and cards to spare. */
function veteran(clearedTo = 60): SaveData {
  const save = startingSave(5);
  save.cleared = clearedTo;
  for (const id of ['paladin', 'berserker', 'mage', 'cleric', 'knight', 'archer', 'huscarl', 'pyromancer', 'lancer', 'militia']) {
    Object.assign(addCard(save, id, 6), { level: 20 });
  }
  save.team = bestTeam(save);
  return save;
}

describe('the dungeons and the raids', () => {
  it('there is one of each to a land, every unit in them is of that land, and each has a boss', () => {
    expect(DUNGEONS.map((d) => d.land).sort()).toEqual(LANDS.map((_, i) => i));
    expect(RAIDS.map((r) => r.land).sort()).toEqual(LANDS.map((_, i) => i));
    for (const d of DUNGEONS) {
      expect(d.floors.length, d.id).toBeGreaterThanOrEqual(4);
      expect(d.floors[d.floors.length - 1].kind, d.id).toBe('boss');
      d.floors.forEach((f) => {
        const tiles = new Set(f.enemies.map((e) => `${e.col},${e.row}`));
        expect(tiles.size, f.name).toBe(f.enemies.length);
        for (const e of f.enemies) {
          expect(UNITS[e.unit]?.set, `${f.name}: ${e.unit}`).toBe(LANDS[d.land].set);
          expect(isEnemyTile(e.col, e.row), f.name).toBe(true);
        }
      });
      expect(dungeonById(d.id)).toBe(d);
    }
    for (const r of RAIDS) {
      for (const unit of unitsOf(r)) expect(UNITS[unit]?.set, `${r.id}: ${unit}`).toBe(LANDS[r.land].set);
      expect(unitsOf(r)).toContain(r.calls.unit);
      expect(r.seconds).toBeGreaterThan(90);
      expect(raidById(r.id)).toBe(r);
    }
    expect(new Set([...DUNGEONS, ...RAIDS].map((x) => x.id)).size).toBe(DUNGEONS.length + RAIDS.length);
    expect(() => dungeonById('nowhere')).toThrow();
  });

  it('each opens at a stage of the line, a dungeon when its land\'s boss first falls, and stays open', () => {
    const save = startingSave(1);
    for (const d of DUNGEONS) {
      expect(d.after).toBe(WORLDS[d.land].last + 1);
      save.cleared = d.after - 1;
      expect(placeOpen(save, d), d.id).toBe(false);
      expect(topTier(save, 'dungeon', d)).toBe(-1);
      save.cleared = d.after;
      expect(placeOpen(save, d), d.id).toBe(true);
      expect(topTier(save, 'dungeon', d)).toBe(0);
    }
    for (const r of RAIDS) {
      // A raid opens later than the dungeon of its land.
      expect(r.after).toBeGreaterThan(DUNGEONS.find((d) => d.land === r.land)?.after ?? 0);
      save.cleared = r.after - 1;
      expect(placeOpen(save, r), r.id).toBe(false);
      save.cleared = r.after;
      expect(placeOpen(save, r), r.id).toBe(true);
    }
  });

  it('has five tiers, each opened by clearing the one before, each standing higher and paying more', () => {
    const save = veteran();
    const d = DUNGEONS[0];
    expect(TIERS).toBe(5);
    expect(tierOpen(save, 'dungeon', d, 0)).toBe(true);
    expect(tierOpen(save, 'dungeon', d, 1)).toBe(false);
    save.dungeons[d.id] = 2;
    expect(tiersCleared(save, 'dungeon', d.id)).toBe(2);
    expect(tierOpen(save, 'dungeon', d, 2)).toBe(true);
    expect(tierOpen(save, 'dungeon', d, 3)).toBe(false);
    expect(tierOpen(save, 'dungeon', d, TIERS)).toBe(false);
    expect(topTier(save, 'dungeon', d)).toBe(2);
    for (const place of [...DUNGEONS, ...RAIDS]) {
      for (let t = 0; t < TIERS; t++) {
        // A tier is measured by its land's own boss on that lap of the line.
        const at = tierStage(place.land, t);
        expect(at).toBe(STAGES[WORLDS[t * LANDS.length + place.land].last]);
        expect(at.def.kind).toBe('boss');
        // And pays the land's pack of the lap after: better than the line is dropping there.
        const pack = packById(tierPack(place.land, t));
        expect(pack.land).toBe(LANDS[place.land].id);
        expect(pack.lap ?? 0).toBe(Math.min(TIERS - 1, t + 1));
        if (t > 0) {
          const before = 'floors' in place ? dungeonPrize(place, t - 1) : raidPrize(place, t - 1);
          const now = 'floors' in place ? dungeonPrize(place, t) : raidPrize(place, t);
          expect(now.coins, `${place.id} tier ${t + 1}`).toBeGreaterThan(before.coins);
        }
      }
    }
    // A raid pays more than the dungeon of its land at the same tier.
    expect(raidPrize(RAIDS[0], 0).coins).toBeGreaterThan(dungeonPrize(DUNGEONS[0], 0).coins);
    expect(raidPrize(RAIDS[0], 0).packs).toBeGreaterThan(dungeonPrize(DUNGEONS[0], 0).packs);
  });
});

describe('a run of a dungeon', () => {
  it('takes the team and the strongest two other cards as reserves', () => {
    const save = veteran();
    const d = DUNGEONS[0];
    const run = startRun(save, d, 0);
    if (!run) throw new Error('no run');
    expect(run.roster).toHaveLength(save.team.length + RESERVES);
    expect(fielded(run).map((r) => r.card)).toEqual(save.team.map((p) => p.card));
    expect(run.roster.every((r) => r.hp === 1)).toBe(true);
    expect(new Set(run.roster.map((r) => r.card)).size).toBe(run.roster.length);
    // A tier that is not open cannot be started, nor a run without a team.
    expect(startRun(save, d, 1)).toBeNull();
    expect(startRun(startingSave(1), d, 0)).toBeNull();
    save.team = [];
    expect(startRun(save, d, 0)).toBeNull();
  });

  it('takes the team\'s structures in with it, and never a structure as a reserve', () => {
    const save = veteran();
    save.cleared = Math.max(save.cleared, 40);
    for (const u of ['watchtower', 'barracks', 'spiketrap', 'palisade', 'beartrap']) Object.assign(addCard(save, u, 6), { level: 20 });
    save.team = bestTeam(save);
    const built = save.team.filter((p) => isStructure(p.unit));
    expect(built).toHaveLength(structuresSize(save));
    const run = startRun(save, DUNGEONS[0], 0);
    if (!run) throw new Error('no run');
    expect(fielded(run).filter((r) => isStructure(r.unit))).toHaveLength(built.length);
    // The two strongest cards left over are structures, and still the reserves are people.
    const reserves = run.roster.filter((r) => !r.fielded);
    expect(reserves).toHaveLength(RESERVES);
    for (const r of reserves) expect(isStructure(r.unit), r.unit).toBe(false);
    // A trap that has gone off is spent for the run, like anyone who has fallen.
    const on = fielded(run);
    const trap = on.findIndex((r) => UNITS[r.unit].kind === 'trap');
    if (trap >= 0) {
      afterFloor(save, run, DUNGEONS[0], true, on.map((_, i) => (i === trap ? 0 : 1)));
      expect(run.roster.find((r) => r.card === on[trap].card)).toMatchObject({ hp: 0, fielded: false });
    }
    // A structure rested can be sent in again only while there is a place for one.
    const tower = fielded(run).find((r) => UNITS[r.unit].kind === 'building');
    if (tower) {
      expect(toggleFielded(save, run, tower.card)).toBe(true);
      expect(toggleFielded(save, run, tower.card)).toBe(true);
      expect(fielded(run).filter((r) => isStructure(r.unit)).length).toBeLessThanOrEqual(structuresSize(save));
    }
  });

  it('nothing heals between floors: a card brings the health it has left, and the fallen stay fallen', () => {
    const save = veteran();
    const d = DUNGEONS[0];
    const run = startRun(save, d, 0);
    if (!run) throw new Error('no run');
    const on = fielded(run);
    const left = on.map((_, i) => (i === 0 ? 0 : i === 1 ? 0.25 : 1));
    const r = afterFloor(save, run, d, true, left);
    expect(r).toMatchObject({ won: true, over: false, prize: null });
    expect(run.floor).toBe(1);
    expect(run.roster[0]).toMatchObject({ hp: 0, fielded: false });
    expect(run.roster[1].hp).toBe(0.25);
    // The next floor is fought by who is left, each as hurt as it came out, and the fallen are not in it.
    const input = floorInput(save, run, d);
    expect(input.teams[0]).toHaveLength(on.length - 1);
    expect(input.teams[0][0].hpShare).toBe(0.25);
    const b = new Battle(input);
    const hurt = b.units.filter((u) => u.team === 0)[0];
    expect(hurt.hp).toBe(Math.round(hurt.maxHp * 0.25));
    // The fallen cannot be sent in again, but a reserve can take its place.
    expect(toggleFielded(save, run, run.roster[0].card)).toBe(false);
    const reserve = run.roster.find((x) => !x.fielded && x.hp > 0);
    expect(reserve && toggleFielded(save, run, reserve.card)).toBe(true);
    expect(fielded(run)).toHaveLength(on.length);
    // No more are sent in than the team has places, and each stands on a tile of its own.
    const other = run.roster.find((x) => !x.fielded && x.hp > 0);
    expect(other && toggleFielded(save, run, other.card)).toBe(false);
    expect(fielded(run).length).toBeLessThanOrEqual(teamSize(save));
    expect(new Set(fielded(run).map((x) => `${x.col},${x.row}`)).size).toBe(fielded(run).length);
    // And a card can be rested: taken off the board while it still stands.
    expect(toggleFielded(save, run, run.roster[1].card)).toBe(true);
    expect(run.roster[1]).toMatchObject({ fielded: false, hp: 0.25 });
  });

  it('a floor lost ends the run and pays nothing but what the cards learned', () => {
    const save = veteran();
    const d = DUNGEONS[0];
    const run = startRun(save, d, 0);
    if (!run) throw new Error('no run');
    const coins = save.coins;
    const level = cardOf(save, run.roster[0].card)?.xp ?? 0;
    const r = afterFloor(save, run, d, false, fielded(run).map(() => 0));
    expect(r).toMatchObject({ won: false, over: true, prize: null });
    expect(r.xp).toBeGreaterThan(0);
    expect(run.over).toBe(true);
    expect(canGoOn(run)).toBe(false);
    expect(save.coins).toBe(coins);
    expect(tiersCleared(save, 'dungeon', d.id)).toBe(0);
    expect(cardOf(save, run.roster[0].card)?.xp ?? 0).toBeGreaterThanOrEqual(level);
    expect(toggleFielded(save, run, run.roster[0].card)).toBe(false);
  });

  it('only clearing the last floor pays: coins, two of the land\'s better pack, and the next tier', () => {
    const save = veteran();
    const d = DUNGEONS[0];
    const run = startRun(save, d, 0);
    if (!run) throw new Error('no run');
    const coins = save.coins;
    const prize = dungeonPrize(d, 0);
    let last = null;
    for (let f = 0; f < d.floors.length; f++) {
      expect(canGoOn(run)).toBe(true);
      last = afterFloor(save, run, d, true, fielded(run).map(() => 0.9));
      if (f < d.floors.length - 1) expect(last).toMatchObject({ over: false, prize: null });
    }
    expect(last).toMatchObject({ won: true, over: true });
    expect(last?.prize).toEqual({ coins: prize.coins, packs: [prize.pack, prize.pack], first: true });
    expect(save.coins).toBe(coins + prize.coins);
    expect(save.packs[prize.pack]).toBe(2);
    expect(tiersCleared(save, 'dungeon', d.id)).toBe(1);
    expect(tierOpen(save, 'dungeon', d, 1)).toBe(true);
    // Clearing it again pays again, and opens nothing more.
    const again = startRun(save, d, 0);
    if (!again) throw new Error('no run');
    for (let f = 0; f < d.floors.length; f++) last = afterFloor(save, again, d, true, fielded(again).map(() => 1));
    expect(last?.prize?.first).toBe(false);
    expect(tiersCleared(save, 'dungeon', d.id)).toBe(1);
    expect(save.packs[prize.pack]).toBe(4);
  });

  it('every floor of every dungeon can be fielded and fought to an end, harder each tier', () => {
    const save = veteran(185);
    for (const d of DUNGEONS) {
      save.dungeons[d.id] = TIERS;
      for (const tier of [0, TIERS - 1]) {
        const run = startRun(save, d, tier);
        if (!run) throw new Error('no run');
        for (let f = 0; f < d.floors.length; f++) {
          run.floor = f;
          expect([-1, 0, 1]).toContain(runBattle(floorInput(save, run, d), false).winner);
        }
      }
      const easy = floorEnemies(d, 0, 0);
      const hard = floorEnemies(d, TIERS - 1, 0);
      expect(hard[0].hpMult ?? 0).toBeGreaterThan(easy[0].hpMult ?? 0);
      expect(easy).toHaveLength(d.floors[0].enemies.length);
    }
  });
});

describe('a raid', () => {
  it('fields the land\'s lord, huge, calling up his own, with his guard', () => {
    for (const raid of RAIDS) {
      const foes = raidEnemies(raid, 0);
      const at = tierStage(raid.land, 0);
      expect(foes).toHaveLength(raid.guards.length + 1);
      expect(foes[0].unit).toBe(raid.boss.unit);
      expect(foes[0].summons).toEqual(raid.calls);
      expect(foes[0].scale).toBe(RAID_BOSS.scale);
      expect(foes[0].hpMult).toBeCloseTo(cardMult(at.grade, at.level + 2) * RAID_BOSS.hp, 6);
      expect(foes.slice(1).every((p) => !p.summons)).toBe(true);
      expect(new Set(foes.map((p) => `${p.col},${p.row}`)).size).toBe(foes.length);
    }
  });

  it('is one long battle in which more of the enemy keep coming', () => {
    const save = veteran();
    const raid = RAIDS[0];
    const input = raidInput(save, raid, 0);
    expect(input.seconds).toBe(raid.seconds);
    expect(input.teams[0]).toHaveLength(save.team.length);
    const r = runBattle(input);
    expect(r.events.filter((e) => e.type === 'spawn').length).toBeGreaterThan(0);
    expect(r.seconds).toBeLessThanOrEqual(raid.seconds);
    expect(runBattle(raidInput(save, raid, 0)).fingerprint).toBe(r.fingerprint);
  });

  it('pays only for a win, and for every win; the first opens the next tier', () => {
    const save = veteran();
    const raid = RAIDS[0];
    const coins = save.coins;
    const prize = raidPrize(raid, 0);
    const lost = finishRaid(save, raid, 0, false);
    expect(lost).toMatchObject({ won: false, prize: null });
    expect(lost.xp).toBeGreaterThan(0);
    expect(save.coins).toBe(coins);
    expect(tiersCleared(save, 'raid', raid.id)).toBe(0);
    const won = finishRaid(save, raid, 0, true);
    expect(won.prize).toEqual({ coins: prize.coins, packs: [prize.pack, prize.pack, prize.pack], first: true });
    expect(won.xp).toBeGreaterThan(lost.xp);
    expect(save.coins).toBe(coins + prize.coins);
    expect(save.packs[prize.pack]).toBe(3);
    expect(tierOpen(save, 'raid', raid, 1)).toBe(true);
    expect(finishRaid(save, raid, 0, true).prize?.first).toBe(false);
    expect(save.packs[prize.pack]).toBe(6);
    // Each try is another fight.
    expect(raidInput(save, raid, 0).seed).not.toBe(raidInput(veteran(), raid, 0).seed);
  });

  it('what is cleared is kept in the save', () => {
    const save = veteran();
    save.dungeons.hollow = 3;
    save.raids.muster = 1;
    const back = repair(JSON.parse(JSON.stringify(save)), 1);
    expect(back.dungeons).toEqual({ hollow: 3 });
    expect(back.raids).toEqual({ muster: 1 });
    expect(repair(JSON.parse(JSON.stringify(startingSave(2))), 1)).toMatchObject({ dungeons: {}, raids: {} });
  });
});
