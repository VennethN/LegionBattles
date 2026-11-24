import { describe, expect, it } from 'vitest';
import { PACKS, packById } from '../src/data/packs';
import { SETS, UNITS } from '../src/data/units';
import { WORLDS, stageCoins } from '../src/data/worlds';
import { GRADES, MAX_LEVEL, RARITIES, cardMult, gradeMult, xpToNext } from '../src/game/rarity';
import {
  BASE_TEAM, MAX_TEAM, addXp, bestTeam, buyPack, clearedIn, finishStage, frontier, inPool, isEnemyTile, known, openPack,
  packOpen, packPool, rollPack, stageEnemies, stageInput, stageOpen, startingSave, teamSize, tidyTeam, toggleTeam, worldOpen,
} from '../src/game/rules';
import { repair, type SaveData } from '../src/game/state';
import { runBattle } from '../src/sim/battle';
import { Rng } from '../src/sim/rng';

/** A save with a world's stages cleared up to (not including) `stage`. */
function at(world: number, stage: number): SaveData {
  const save = startingSave(7);
  for (let w = 0; w < world; w++) save.cleared[WORLDS[w].id] = WORLDS[w].stages.length;
  save.cleared[WORLDS[world].id] = stage;
  return save;
}

describe('the data', () => {
  it('every unit belongs to a set and has a tier', () => {
    for (const u of Object.values(UNITS)) {
      expect(SETS[u.set], u.id).toBeDefined();
      expect(RARITIES, u.id).toContain(u.rarity);
      expect(u.hp, u.id).toBeGreaterThan(0);
      expect(u.attackInterval, u.id).toBeGreaterThan(u.windup);
    }
  });

  it('every skill has a name of its own', () => {
    const ids = Object.values(UNITS).map((u) => u.skill?.id).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
    const names = Object.values(UNITS).map((u) => u.skill?.name).filter(Boolean);
    expect(new Set(names).size).toBe(names.length);
  });

  it('a world has 10 to 25 stages, never fewer than the one before nor more than 5 more', () => {
    expect(WORLDS[0].stages.length).toBe(10);
    for (let i = 0; i < WORLDS.length; i++) {
      const n = WORLDS[i].stages.length;
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(25);
      if (i > 0) {
        expect(n).toBeGreaterThanOrEqual(WORLDS[i - 1].stages.length);
        expect(n - WORLDS[i - 1].stages.length).toBeLessThanOrEqual(5);
      }
    }
  });

  it('the last stage is the only boss, and a miniboss comes before it', () => {
    for (const w of WORLDS) {
      const kinds = w.stages.map((s) => s.kind);
      expect(kinds[kinds.length - 1]).toBe('boss');
      expect(kinds.filter((k) => k === 'boss')).toHaveLength(1);
      expect(kinds.filter((k) => k === 'miniboss').length).toBeGreaterThanOrEqual(1);
      for (const s of w.stages) {
        const ranks = s.enemies.map((e) => e.rank);
        if (s.kind === 'boss') expect(ranks.filter((r) => r === 'boss')).toHaveLength(1);
        if (s.kind === 'miniboss') expect(ranks.filter((r) => r === 'elite')).toHaveLength(1);
        if (s.kind === 'normal') expect(ranks.every((r) => r === 'troop')).toBe(true);
      }
    }
  });

  it('a stage fields only units of its world, each on its own enemy tile, none before it can be met', () => {
    for (const w of WORLDS) {
      w.stages.forEach((s, i) => {
        const tiles = new Set<string>();
        expect(s.enemies.length, s.name).toBeGreaterThan(0);
        for (const e of s.enemies) {
          const def = UNITS[e.unit];
          expect(def, `${s.name}: ${e.unit}`).toBeDefined();
          expect(def.set, `${s.name}: ${e.unit}`).toBe(w.set);
          expect(isEnemyTile(e.col, e.row), `${s.name}: ${e.unit}`).toBe(true);
          expect(tiles.has(`${e.col},${e.row}`), `${s.name}: two on ${e.col},${e.row}`).toBe(false);
          tiles.add(`${e.col},${e.row}`);
          // A unit is not fielded before the stage its `from` names, so that "beaten" means met.
          expect(def.from, `${s.name}: ${e.unit}`).toBeLessThanOrEqual(i + 1);
        }
        expect(s.grade).toBeLessThan(GRADES.length);
      });
      // And every unit of the set is met by the stage it says.
      for (const u of Object.values(UNITS).filter((x) => x.set === w.set)) {
        const first = w.stages.findIndex((s) => s.enemies.some((e) => e.unit === u.id));
        expect(first + 1, u.id).toBe(u.from);
      }
    }
  });

  it('stages never get easier, and pay more as they go', () => {
    for (const w of WORLDS) {
      for (let i = 1; i < w.stages.length; i++) {
        const a = w.stages[i - 1];
        const b = w.stages[i];
        expect(cardMult(b.grade, b.level), b.name).toBeGreaterThanOrEqual(cardMult(a.grade, a.level));
        if (b.kind === a.kind) expect(stageCoins(w, i)).toBeGreaterThanOrEqual(stageCoins(w, i - 1));
      }
    }
  });

  it('every world has a pack of its set, and a pack names a range of grades', () => {
    for (const w of WORLDS) expect(packById(w.pack).set).toBe(w.set);
    for (const p of PACKS) {
      expect(p.gradeMin).toBeGreaterThanOrEqual(0);
      expect(p.gradeMax).toBeLessThan(GRADES.length);
      expect(p.gradeMax).toBeGreaterThanOrEqual(p.gradeMin);
      expect(Object.values(UNITS).some((u) => u.set === p.set)).toBe(true);
    }
  });
});

describe('a new player', () => {
  it('starts with three cards in a team, two packs, and room for a fourth', () => {
    const save = startingSave(1);
    expect(Object.keys(save.cards)).toHaveLength(3);
    expect(save.team).toHaveLength(3);
    expect(save.packs.recruit).toBe(2);
    expect(teamSize(save)).toBe(BASE_TEAM);
    expect(frontier(save)).toEqual([0, 0]);
  });

  it('can win the first stage with what they start with', () => {
    let wins = 0;
    for (let n = 0; n < 20; n++) {
      const save = startingSave(n + 1);
      if (runBattle(stageInput(save, WORLDS[0], 0), false).winner === 0) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(18);
  });
});

describe('what is open', () => {
  it('stages open in order, and a world when the one before is finished', () => {
    const save = startingSave(1);
    expect(stageOpen(save, 0, 0)).toBe(true);
    expect(stageOpen(save, 0, 1)).toBe(false);
    expect(worldOpen(save, 1)).toBe(false);
    finishStage(save, 0, 0, true);
    expect(stageOpen(save, 0, 1)).toBe(true);
    const done = at(1, 0);
    expect(worldOpen(done, 1)).toBe(true);
    expect(stageOpen(done, 1, 0)).toBe(true);
    expect(worldOpen(done, 2)).toBe(false);
  });

  it('a loss opens nothing and pays no coins, but the team still learns', () => {
    const save = startingSave(1);
    const r = finishStage(save, 0, 0, false);
    expect(r.coins).toBe(0);
    expect(r.packs).toEqual([]);
    expect(clearedIn(save, 'thornwood')).toBe(0);
    expect(r.xp).toBeGreaterThan(0);
    expect(save.stats.battles).toBe(1);
    expect(save.stats.wins).toBe(0);
  });

  it('a first clear pays in full and a replay half', () => {
    const save = startingSave(1);
    const first = finishStage(save, 0, 0, true);
    const again = finishStage(save, 0, 0, true);
    expect(first.first).toBe(true);
    expect(again.first).toBe(false);
    expect(first.coins).toBe(stageCoins(WORLDS[0], 0));
    expect(again.coins).toBe(Math.round(first.coins / 2));
  });

  it('the team grows as bosses fall, to a ceiling', () => {
    expect(teamSize(at(0, 4))).toBe(4);
    expect(teamSize(at(0, 5))).toBe(5);
    expect(teamSize(at(1, 0))).toBe(6);
    expect(teamSize(at(2, 0))).toBe(7);
    const all = at(2, WORLDS[2].stages.length);
    expect(teamSize(all)).toBe(MAX_TEAM);
    const before = at(0, 4);
    expect(finishStage(before, 0, 4, true).moreTeam).toBe(1);
  });

  it('beating a boss opens the next world and always drops packs', () => {
    const save = at(0, WORLDS[0].stages.length - 1);
    const r = finishStage(save, 0, WORLDS[0].stages.length - 1, true);
    expect(r.opened).toBe('sunscar');
    expect(r.packs.filter((p) => p === 'thornwood').length).toBeGreaterThanOrEqual(2);
    expect(worldOpen(save, 1)).toBe(true);
  });
});

describe('what is known', () => {
  it('a unit is in a pack only once it has been beaten', () => {
    const save = startingSave(1);
    expect(inPool(save, UNITS.knight)).toBe(true);
    expect(inPool(save, UNITS.cutpurse)).toBe(false);
    expect(known(save, UNITS.cutpurse)).toBe(false);
    expect(known(save, UNITS.knight)).toBe(true);
    expect(known(save, UNITS.paladin)).toBe(false);
    const r = finishStage(save, 0, 0, true);
    expect(r.unlocked).toEqual(['cutpurse']);
    expect(known(save, UNITS.cutpurse)).toBe(true);
    expect(inPool(save, UNITS.warlord)).toBe(false);
  });

  it("a world's pack is sold once something in it has been beaten", () => {
    const save = startingSave(1);
    expect(packOpen(save, packById('recruit'))).toBe(true);
    expect(packOpen(save, packById('thornwood'))).toBe(false);
    finishStage(save, 0, 0, true);
    expect(packOpen(save, packById('thornwood'))).toBe(true);
    expect(packPool(save, packById('thornwood')).map((u) => u.id)).toEqual(['cutpurse']);
    expect(packOpen(save, packById('dunes'))).toBe(false);
    expect(packOpen(save, packById('royal'))).toBe(false);
    expect(packOpen(at(2, 0), packById('royal'))).toBe(true);
  });
});

describe('packs', () => {
  it('hand out only the grades they name, and only units of their set that are in the pool', () => {
    const save = at(2, 3);
    for (const pack of PACKS) {
      if (!packOpen(save, pack)) continue;
      const pool = new Set(packPool(save, pack).map((u) => u.id));
      const rng = new Rng(99);
      for (let i = 0; i < 400; i++) {
        const { unit, grade } = rollPack(save, pack, rng);
        expect(grade).toBeGreaterThanOrEqual(pack.gradeMin);
        expect(grade).toBeLessThanOrEqual(pack.gradeMax);
        expect(pool.has(unit.id)).toBe(true);
        expect(unit.set).toBe(pack.set);
      }
    }
  });

  it('turn over commons most and the rarest least, and low grades more than high', () => {
    const save = at(2, 3);
    const pack = packById('recruit');
    const rng = new Rng(5);
    const tiers: Record<string, number> = {};
    const grades = [0, 0, 0];
    for (let i = 0; i < 6000; i++) {
      const { unit, grade } = rollPack(save, pack, rng);
      tiers[unit.rarity] = (tiers[unit.rarity] ?? 0) + 1;
      grades[grade]++;
    }
    expect(tiers.common).toBeGreaterThan(tiers.uncommon);
    expect(tiers.uncommon).toBeGreaterThan(tiers.rare);
    expect(tiers.rare).toBeGreaterThan(tiers.epic);
    expect(tiers.epic).toBeGreaterThan(0);
    expect(grades[0]).toBeGreaterThan(grades[1]);
    expect(grades[1]).toBeGreaterThan(grades[2]);
    expect(grades[2]).toBeGreaterThan(0);
  });

  it('opening gives a new card, a better grade, or experience, and uses the pack up', () => {
    const save = startingSave(3);
    save.packs.recruit = 60;
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const cardsBefore = Object.keys(save.cards).length;
      const pull = openPack(save, 'recruit');
      expect(pull).not.toBeNull();
      if (!pull) continue;
      seen.add(pull.outcome);
      const card = save.cards[pull.unit];
      if (pull.outcome === 'new') {
        expect(Object.keys(save.cards).length).toBe(cardsBefore + 1);
        expect(card.grade).toBe(pull.grade);
      } else if (pull.outcome === 'gradeUp') {
        expect(pull.grade).toBeGreaterThan(pull.was);
        expect(card.grade).toBe(pull.grade);
      } else {
        expect(pull.xp).toBeGreaterThan(0);
        expect(card.grade).toBeGreaterThanOrEqual(pull.grade);
      }
    }
    expect(save.packs.recruit).toBe(0);
    expect(openPack(save, 'recruit')).toBeNull();
    expect(seen).toEqual(new Set(['new', 'gradeUp', 'duplicate']));
    expect(save.stats.opened).toBe(60);
  });

  it('the same save opens the same cards', () => {
    const a = startingSave(11);
    const b = startingSave(11);
    a.packs.recruit = b.packs.recruit = 10;
    for (let i = 0; i < 10; i++) expect(openPack(a, 'recruit')).toEqual(openPack(b, 'recruit'));
  });

  it('a new card joins the team while there is room', () => {
    const save = startingSave(4);
    expect(save.team).toHaveLength(3);
    let pull = openPack(save, 'recruit');
    while (pull && pull.outcome !== 'new') {
      save.packs.recruit++;
      pull = openPack(save, 'recruit');
    }
    expect(save.team).toHaveLength(4);
    expect(save.team.some((p) => p.unit === pull?.unit)).toBe(true);
  });

  it('are bought with coins, when sold and affordable', () => {
    const save = startingSave(1);
    save.coins = 100;
    expect(buyPack(save, 'thornwood')).toBe(false);
    expect(buyPack(save, 'recruit')).toBe(true);
    expect(save.coins).toBe(40);
    expect(save.packs.recruit).toBe(3);
    expect(buyPack(save, 'recruit')).toBe(false);
  });
});

describe('cards', () => {
  it('level with experience, up to a ceiling', () => {
    const card = { grade: 0, level: 1, xp: 0 };
    expect(addXp(card, xpToNext(1) - 1)).toBe(0);
    expect(addXp(card, 1)).toBe(1);
    expect(card.level).toBe(2);
    expect(card.xp).toBe(0);
    addXp(card, 1e9);
    expect(card.level).toBe(MAX_LEVEL);
    expect(addXp(card, 1000)).toBe(0);
  });

  it('a grade and a level both make a card stronger', () => {
    expect(gradeMult(0)).toBe(1);
    expect(gradeMult(3)).toBeGreaterThan(gradeMult(2));
    expect(cardMult(2, 5)).toBeGreaterThan(cardMult(2, 4));
    const save = startingSave(1);
    save.cards.knight = { grade: 3, level: 5, xp: 0 };
    const input = stageInput(save, WORLDS[0], 0);
    const knight = input.teams[0].find((p) => p.unit === 'knight');
    expect(knight?.hpMult).toBeCloseTo(cardMult(3, 5), 6);
    const foes = stageEnemies(WORLDS[0].stages[4]);
    const elite = foes.find((p) => p.unit === 'bruiser');
    expect(elite?.scale).toBeGreaterThan(1);
    expect(elite?.hpMult).toBeGreaterThan(foes[1].hpMult ?? 0);
  });
});

describe('the team', () => {
  it('takes units in and out, and no more than may be fielded', () => {
    const save = startingSave(1);
    for (const id of ['cleric', 'berserker', 'mage']) save.cards[id] = { grade: 0, level: 1, xp: 0 };
    expect(toggleTeam(save, 'cleric')).toBe(true);
    expect(save.team).toHaveLength(4);
    expect(toggleTeam(save, 'mage')).toBe(false);
    expect(toggleTeam(save, 'knight')).toBe(true);
    expect(save.team.some((p) => p.unit === 'knight')).toBe(false);
    expect(toggleTeam(save, 'mage')).toBe(true);
    expect(toggleTeam(save, 'paladin')).toBe(false);
    const tiles = save.team.map((p) => `${p.col},${p.row}`);
    expect(new Set(tiles).size).toBe(tiles.length);
  });

  it('is made fit to fight whatever state it was saved in', () => {
    const save = startingSave(1);
    save.team = [
      { unit: 'knight', col: 3, row: 1 },
      { unit: 'knight', col: 2, row: 1 },
      { unit: 'ghost', col: 1, row: 1 },
      { unit: 'archer', col: 3, row: 1 },
      { unit: 'militia', col: 9, row: 9 },
    ];
    tidyTeam(save);
    expect(save.team.map((p) => p.unit)).toEqual(['knight', 'archer', 'militia']);
    const tiles = save.team.map((p) => `${p.col},${p.row}`);
    expect(new Set(tiles).size).toBe(3);
    for (const p of save.team) expect(p.col).toBeLessThan(4);
  });

  it('FILL TEAM picks the strongest cards held', () => {
    const save = startingSave(1);
    save.cards.paladin = { grade: 4, level: 9, xp: 0 };
    save.cards.cleric = { grade: 0, level: 1, xp: 0 };
    const team = bestTeam(save);
    expect(team).toHaveLength(4);
    expect(team.some((p) => p.unit === 'paladin')).toBe(true);
  });
});

describe('the save', () => {
  it('survives a trip through JSON', () => {
    const save = at(1, 4);
    save.coins = 321;
    save.packs.dunes = 2;
    expect(repair(JSON.parse(JSON.stringify(save)), 1)).toEqual(save);
  });

  it('is started again when it is not a save, and mended when parts are missing', () => {
    expect(repair(null, 5).cards).toEqual({});
    expect(repair('nonsense', 5).coins).toBe(0);
    expect(repair({ version: 999, coins: 50 }, 5).coins).toBe(0);
    const mended = repair({ version: 1, coins: -5, cards: { knight: { grade: 2 } }, team: [{ unit: 'knight', col: 1, row: 1 }, { unit: 'nobody' }] }, 5);
    expect(mended.coins).toBe(0);
    expect(mended.cards.knight).toEqual({ grade: 2, level: 1, xp: 0 });
    expect(mended.team).toEqual([{ unit: 'knight', col: 1, row: 1 }]);
    expect(mended.packs).toEqual({});
  });
});
