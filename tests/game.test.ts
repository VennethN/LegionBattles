import { describe, expect, it } from 'vitest';
import { LANDS } from '../src/data/lands';
import { DIFFICULTIES, LAPS } from '../src/data/laps';
import { PACKS, allPacks, packAt, packById } from '../src/data/packs';
import { STAGES, TOP, WORLDS, fieldedWorth, landOf, stageAt, stageStrength, worldOf } from '../src/data/stages';
import { SETS, UNITS, isStructure } from '../src/data/units';
import { COUNTDOWN, afterBattle, goTo, settle, teamChanged } from '../src/game/campaign';
import { COPY_XP, OTHER_UNIT, addCard, cardOf, cardsOf, combine, combinePreview, spare, whyNot, worth, xpHeld } from '../src/game/cards';
import { GRADES, MAX_LEVEL, RARITIES, cardMult, gradeMult, xpToNext } from '../src/game/rarity';
import {
  BASE_TEAM, MAX_STRUCTURES, MAX_TEAM, STRUCTURES_AT, STRUCTURE_PACK, STRUCTURE_SHARE, TEAM_AT, addXp, beaten, bestTeam, buyPack, cardPower,
  buyPacks, cleared, clearedIn, finishStage, frontier, inTeam, isEnemyTile, known, lineDone, openPack, openPacks, packHolds, packOdds, packOpen,
  packPool, packsHeld, rollPack, roomFor,
  stageCleared, stageEnemies, stageInput, stageOpen, stagePay, stageXp, startingSave, structuresIn, structuresSize, teamSize, tidyTeam, toggleTeam,
  unitsIn, worldDone, worldNeeds, worldOpen, worldReached, type StageResult,
} from '../src/game/rules';
import { SORTS, SORT_NAME, cardDamage, cardHealth, isSort, nextSort, sortCards, type Sort } from '../src/game/sorting';
import { repair, type SaveData } from '../src/game/state';
import { Battle, runBattle } from '../src/sim/battle';
import { Rng } from '../src/sim/rng';

/** A save with the line's stages cleared up to (not including) the one at `index`. */
function at(index: number): SaveData {
  const save = startingSave(7);
  save.cleared = index;
  save.at = Math.min(index, STAGES.length - 1);
  return save;
}

const PER_LAP = LANDS.reduce((n, l) => n + l.stages.length, 0);

describe('the data', () => {
  it('every unit belongs to a set and has a tier', () => {
    for (const u of Object.values(UNITS)) {
      expect(SETS[u.set], u.id).toBeDefined();
      expect(RARITIES).toContain(u.rarity);
      expect(u.hp).toBeGreaterThan(0);
    }
  });

  it('every skill has a name of its own', () => {
    const names = Object.values(UNITS).filter((u) => u.skill).map((u) => u.skill?.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('a land has 10 to 25 stages, never fewer than the one before nor more than 5 more', () => {
    let before = 0;
    LANDS.forEach((w, i) => {
      const n = w.stages.length;
      expect(n, w.id).toBeGreaterThanOrEqual(10);
      expect(n, w.id).toBeLessThanOrEqual(25);
      if (i > 0) {
        expect(n, w.id).toBeGreaterThanOrEqual(before);
        expect(n, w.id).toBeLessThanOrEqual(before + 5);
      }
      before = n;
    });
  });

  it('the last stage of a land is its only boss, and a miniboss comes before it', () => {
    for (const w of LANDS) {
      const kinds = w.stages.map((s) => s.kind);
      expect(kinds[kinds.length - 1], w.id).toBe('boss');
      expect(kinds.filter((k) => k === 'boss'), w.id).toHaveLength(1);
      expect(kinds.filter((k) => k === 'miniboss').length, w.id).toBeGreaterThanOrEqual(1);
      for (const s of w.stages) {
        const ranks = s.enemies.map((e) => e.rank);
        if (s.kind === 'boss') expect(ranks.filter((r) => r === 'boss'), s.name).toHaveLength(1);
        else expect(ranks, s.name).not.toContain('boss');
        if (s.kind === 'miniboss') expect(ranks.filter((r) => r === 'elite'), s.name).toHaveLength(1);
      }
    }
  });

  it('a stage fields only units of its land, each on its own enemy tile, none before it can be met', () => {
    for (const w of LANDS) {
      w.stages.forEach((s, i) => {
        const tiles = new Set<string>();
        expect(s.enemies.length, s.name).toBeGreaterThan(0);
        for (const e of s.enemies) {
          const u = UNITS[e.unit];
          expect(u, `${s.name}: ${e.unit}`).toBeDefined();
          expect(u.set, `${s.name}: ${e.unit}`).toBe(w.set);
          expect(isEnemyTile(e.col, e.row), `${s.name}: ${e.unit}`).toBe(true);
          expect(tiles.has(`${e.col},${e.row}`), `${s.name}: two on one tile`).toBe(false);
          tiles.add(`${e.col},${e.row}`);
          // A unit says from which stage of its land it is met: it stands in none before that.
          expect(u.from ?? 0, `${s.name}: ${e.unit}`).toBeLessThanOrEqual(i + 1);
        }
      });
      // And every unit of the land's set is met somewhere in it.
      for (const u of Object.values(UNITS)) {
        if (u.set !== w.set) continue;
        expect(w.stages.some((s) => s.enemies.some((e) => e.unit === u.id)), u.id).toBe(true);
      }
    }
  });

  it('every land has a pack of its set, and a pack names a range of grades', () => {
    for (const w of LANDS) {
      const pack = packById(w.pack);
      expect(pack.set).toBe(w.set);
      expect(pack.land).toBe(w.id);
    }
    for (const p of PACKS) {
      expect(p.gradeMin).toBeGreaterThanOrEqual(0);
      expect(p.gradeMax).toBeLessThan(GRADES.length);
      expect(p.gradeMax).toBeGreaterThanOrEqual(p.gradeMin);
      expect(Object.values(UNITS).some((u) => u.set === p.set)).toBe(true);
    }
  });
});

describe('the line of stages', () => {
  it('is one numbered line: every land in turn, and then again, five laps in all', () => {
    expect(STAGES).toHaveLength(PER_LAP * LAPS.length);
    STAGES.forEach((s, i) => {
      expect(s.index).toBe(i);
      expect(s.def).toBe(LANDS[s.land].stages[s.local]);
      expect(s.lap).toBe(Math.floor(i / PER_LAP));
    });
    // The first ten stages are the first land, as the owner asked: "wave 1 - 10 will be the first world".
    expect(STAGES.slice(0, 10).every((s) => s.land === 0 && s.lap === 0)).toBe(true);
    expect(STAGES[10].land).toBe(1);
    expect(stageAt(-5).index).toBe(0);
    expect(stageAt(99999).index).toBe(STAGES.length - 1);
  });

  it('a world is a stretch of it in one land, and every stage is in exactly one', () => {
    expect(WORLDS).toHaveLength(LANDS.length * LAPS.length);
    let next = 0;
    WORLDS.forEach((w, i) => {
      expect(w.index).toBe(i);
      expect(w.first).toBe(next);
      expect(w.last - w.first + 1).toBe(LANDS[w.land].stages.length);
      for (let n = w.first; n <= w.last; n++) {
        expect(worldOf(n)).toBe(w);
        expect(landOf(n)).toBe(LANDS[w.land]);
      }
      next = w.last + 1;
    });
    expect(next).toBe(STAGES.length);
    expect(WORLDS[0]).toMatchObject({ first: 0, last: 9, name: 'Thornwood' });
    expect(WORLDS[1]).toMatchObject({ first: 10, last: 21 });
    // The fourth world is the first land again, on the next difficulty, and says so.
    expect(WORLDS[LANDS.length]).toMatchObject({ land: 0, lap: 1, name: 'Thornwood', title: 'Thornwood, Hard' });
    expect(WORLDS[0].title).toBe('Thornwood, Normal');
    expect(new Set(WORLDS.map((w) => w.title)).size).toBe(WORLDS.length);
    expect(DIFFICULTIES).toEqual(['Normal', 'Hard', 'Expert', 'Master', 'Nightmare']);
  });

  it('on the first lap a stage stands at what it is written with', () => {
    for (let n = 0; n < PER_LAP; n++) {
      expect(STAGES[n].grade).toBe(STAGES[n].def.grade);
      expect(STAGES[n].level).toBe(STAGES[n].def.level);
    }
  });

  it('its enemies grow stronger with its number, to the top at the last stage of all', () => {
    for (let n = 1; n < STAGES.length; n++) {
      expect(stageStrength(n), `stage ${n + 1}`).toBeGreaterThanOrEqual(stageStrength(n - 1) * 0.999);
      // Over a stretch it never falls, and over a longer one it always rises.
      if (n >= 8) expect(stageStrength(n), `stage ${n + 1}`).toBeGreaterThanOrEqual(stageStrength(n - 8) * 0.999);
      if (n >= 30) expect(stageStrength(n), `stage ${n + 1}`).toBeGreaterThan(stageStrength(n - 30));
    }
    expect(stageStrength(STAGES.length - 1)).toBeGreaterThan(TOP * 0.97);
    expect(stageStrength(STAGES.length - 1)).toBeLessThan(TOP * 1.03);
    // Where a lap begins again in a weaker land, it is no easier than where the last one ended,
    // and the second lap begins a step above the first lap's last boss.
    for (let lap = 1; lap < LAPS.length; lap++) {
      expect(stageStrength(lap * PER_LAP), `lap ${lap + 1}`).toBeGreaterThanOrEqual(stageStrength(lap * PER_LAP - 1));
    }
    expect(stageStrength(PER_LAP)).toBeGreaterThan(stageStrength(PER_LAP - 1) * 1.1);
    // A stage's enemies stand at what makes them that strong: their land's units, their grade and level, and the land's weight.
    for (const s of STAGES) {
      if (s.lap === 0) continue;
      const land = LANDS[s.land];
      const stands = SETS[land.set].power * cardMult(s.grade, s.level);
      const asked = s.strength * (1 + (land.weight - 1) * LAPS[s.lap].weight);
      expect(stands / asked, `stage ${s.index + 1}`).toBeGreaterThan(0.96);
      expect(stands / asked, `stage ${s.index + 1}`).toBeLessThan(1.04);
    }
    for (const s of STAGES) {
      expect(s.grade).toBeGreaterThanOrEqual(0);
      expect(s.grade).toBeLessThan(GRADES.length);
      expect(s.level).toBeGreaterThanOrEqual(1);
    }
  });

  it('pays and teaches more as it goes, a boss more than the stage before it', () => {
    const plain = STAGES.filter((s) => s.def.kind === 'normal');
    for (let i = 1; i < plain.length; i++) {
      // Within a land of the first lap the pay is written by hand and rises; after it, it rises all along the line.
      if (plain[i].lap > 0 || plain[i].land === plain[i - 1].land) {
        expect(plain[i].coins, `stage ${plain[i].index + 1}`).toBeGreaterThanOrEqual(plain[i - 1].coins);
      }
    }
    for (const s of STAGES) {
      expect(s.coins % 5).toBe(0);
      expect(s.xp).toBeGreaterThanOrEqual(10);
      if (s.def.kind === 'boss') expect(s.coins).toBeGreaterThan(STAGES[s.index - 1].coins);
    }
    expect(STAGES[STAGES.length - 1].xp).toBeGreaterThan(STAGES[PER_LAP - 1].xp);
    expect(STAGES[PER_LAP].coins).toBeGreaterThan(STAGES[PER_LAP - 2].coins * 0.9);
  });

  it('on later laps a stage fields more enemies than it is written with, each on a free enemy tile', () => {
    for (const s of STAGES) {
      // On the first lap, who it is written with. After it, at least the lap's fewest, and from the third lap one more than written.
      // Whoever calls others up counts as those it calls, a tower as one, and a trap as none.
      const worth = fieldedWorth(s.def);
      expect(s.extra).toBe(Math.max(LAPS[s.lap].extra, LAPS[s.lap].least - worth));
      if (s.lap === 0) expect(s.extra).toBe(0);
      expect(worth + s.extra).toBeGreaterThanOrEqual(LAPS[s.lap].least);
    }
    for (const n of [0, PER_LAP, PER_LAP + 1, PER_LAP * 2, PER_LAP * 3 + 10, PER_LAP * 4 + 3, STAGES.length - 1]) {
      const stage = STAGES[n];
      const foes = stageEnemies(n);
      expect(foes).toHaveLength(stage.def.enemies.length + stage.extra);
      const tiles = new Set(foes.map((p) => `${p.col},${p.row}`));
      expect(tiles.size).toBe(foes.length);
      for (const p of foes) {
        expect(isEnemyTile(p.col, p.row, stage.field)).toBe(true);
        expect(UNITS[p.unit].set).toBe(LANDS[stage.land].set);
      }
      // Whoever is added is a troop of a kind the stage has, at the stage's own grade and level.
      const kinds = new Set(stage.def.enemies.filter((e) => e.rank === 'troop').map((e) => e.unit));
      for (const extra of foes.slice(stage.def.enemies.length)) {
        expect(extra.hpMult).toBeCloseTo(cardMult(stage.grade, stage.level), 6);
        expect(kinds.has(extra.unit)).toBe(true);
      }
    }
    // The line's first stage is two Cutpurses on the first lap, and filled up to the second lap's fewest when it is met again.
    expect(stageEnemies(0)).toHaveLength(2);
    expect(stageEnemies(PER_LAP)).toHaveLength(LAPS[1].least);
  });

  it("a land's pack is better each lap, and costs about what a win there pays", () => {
    for (const base of PACKS.filter((p) => p.land)) {
      let before = packAt(base, 0);
      for (let lap = 1; lap < LAPS.length; lap++) {
        const pack = packAt(base, lap);
        expect(pack.id).toBe(`${base.id}@${lap}`);
        expect(packById(pack.id)).toEqual(pack);
        expect(pack.set).toBe(base.set);
        expect(pack.gradeMin).toBeGreaterThanOrEqual(before.gradeMin);
        expect(pack.gradeMax).toBeGreaterThanOrEqual(before.gradeMax);
        expect(pack.gradeMin + pack.gradeMax).toBeGreaterThan(before.gradeMin + before.gradeMax - (lap === 1 ? 0 : 1));
        expect(pack.cost).toBeGreaterThan(before.cost);
        const world = WORLDS[lap * LANDS.length + LANDS.findIndex((l) => l.id === base.land)];
        const pays = STAGES[world.first].coins;
        expect(pack.cost).toBeGreaterThan(pays * 0.4);
        expect(pack.cost).toBeLessThan(pays * 1.6);
        before = pack;
      }
      // On the last lap a pack hands out only the best two grades.
      expect(packAt(base, LAPS.length - 1)).toMatchObject({ gradeMin: GRADES.length - 2, gradeMax: GRADES.length - 1 });
    }
    expect(() => packById('recruit@1')).toThrow();
    expect(() => packById('thornwood@9')).toThrow();
    expect(allPacks()).toHaveLength(PACKS.length + PACKS.filter((p) => p.land).length * (LAPS.length - 1));
  });

  it('a stage drops the pack of its land and lap', () => {
    for (const s of STAGES) {
      const pack = packById(s.pack);
      expect(pack.land).toBe(LANDS[s.land].id);
      expect(pack.lap ?? 0).toBe(s.lap);
    }
  });

  it('every stage of the line can be fielded and fought to an end', () => {
    const save = startingSave(3);
    for (const id of ['paladin', 'berserker', 'mage', 'cleric']) Object.assign(addCard(save, id, 6), { level: 20 });
    save.team = bestTeam(save);
    for (const w of WORLDS) {
      for (const n of [w.first, w.last]) {
        const r = runBattle(stageInput(save, n), false);
        expect([-1, 0, 1]).toContain(r.winner);
      }
    }
  });
});

describe('difficulties', () => {
  const N = LANDS.length;
  /** The place in WORLDS of a land on a difficulty. */
  const world = (land: number, difficulty: number): number => difficulty * N + land;

  it('a world is a land on a difficulty, and its stages keep their numbers on the line', () => {
    expect(WORLDS).toHaveLength(N * LAPS.length);
    WORLDS.forEach((w, i) => {
      expect(w).toMatchObject({ index: i, land: i % N, lap: Math.floor(i / N) });
      expect(w.title).toBe(`${LANDS[w.land].name}, ${DIFFICULTIES[w.lap]}`);
    });
    // Harder is further along the line: every stage of a difficulty comes after every stage of the one before.
    for (let d = 1; d < LAPS.length; d++) expect(WORLDS[world(0, d)].first).toBe(WORLDS[world(N - 1, d - 1)].last + 1);
  });

  it('a world opens when it is beaten on the difficulty before, and the world before it on this one', () => {
    const save = startingSave(2);
    expect(WORLDS.filter((w) => worldOpen(save, w.index)).map((w) => w.index)).toEqual([0]);
    expect(worldNeeds(save, world(0, 1))).toEqual([world(0, 0)]);
    expect(worldNeeds(save, world(1, 1))).toEqual([world(1, 0), world(0, 1)]);
    expect(worldNeeds(save, 0)).toEqual([]);
    // Thornwood beaten on Normal: the dunes on Normal, and Thornwood on Hard.
    save.cleared = WORLDS[0].last + 1;
    expect(WORLDS.filter((w) => worldOpen(save, w.index)).map((w) => w.index)).toEqual([0, world(1, 0), world(0, 1)].sort((a, b) => a - b));
    expect(worldOpen(save, world(1, 1))).toBe(false);
    expect(worldOpen(save, world(0, 2))).toBe(false);
    // The dunes on Hard need both: the dunes on Normal and Thornwood on Hard.
    save.cleared = WORLDS[1].last + 1;
    expect(worldOpen(save, world(1, 1))).toBe(false);
    save.ahead[world(0, 1)] = WORLDS[world(0, 1)].last - WORLDS[world(0, 1)].first + 1;
    expect(worldDone(save, world(0, 1))).toBe(true);
    expect(worldOpen(save, world(1, 1))).toBe(true);
    // And Thornwood on Expert needs only Thornwood on Hard: there is no land before it.
    expect(worldOpen(save, world(0, 2))).toBe(true);
    expect(worldOpen(save, world(2, 1))).toBe(false);
  });

  it('following the line, every world is open in its turn', () => {
    for (const w of WORLDS) {
      expect(worldOpen(at(w.first), w.index), w.title).toBe(true);
      // The land after it is not open on this difficulty until this one is beaten.
      if (w.land + 1 < N) expect(worldOpen(at(w.first), w.index + 1), w.title).toBe(false);
      for (let i = w.first; i <= w.last; i++) expect(stageOpen(at(i), i)).toBe(true);
    }
  });

  it('a stage won ahead of the line is kept, and taken in when the line comes to it', () => {
    const save = at(WORLDS[0].last + 1);
    const hard = WORLDS[world(0, 1)];
    // Thornwood on Hard is open, and only its first stage.
    expect(stageOpen(save, hard.first)).toBe(true);
    expect(stageOpen(save, hard.first + 1)).toBe(false);
    expect(stageCleared(save, hard.first)).toBe(false);
    const r = finishStage(save, hard.first, true);
    expect(r.first).toBe(true);
    expect(r.coins).toBe(stagePay(hard.first, true));
    // The line has not moved: its places in the team and for structures are as they were.
    expect(cleared(save)).toBe(WORLDS[0].last + 1);
    expect(clearedIn(save, hard.index)).toBe(1);
    expect(stageCleared(save, hard.first)).toBe(true);
    expect(stageOpen(save, hard.first + 1)).toBe(true);
    // Won again, it is not a first win.
    expect(finishStage(save, hard.first, true).first).toBe(false);
    expect(clearedIn(save, hard.index)).toBe(1);
    // A stage that is not open is not booked, whatever is claimed.
    expect(finishStage(save, hard.first + 3, true).first).toBe(false);
    // The line comes to that world: what was cleared there is already cleared.
    save.cleared = hard.first - 1;
    const last = finishStage(save, hard.first - 1, true);
    expect(last.first).toBe(true);
    expect(cleared(save)).toBe(hard.first + 1);
    expect(save.ahead[hard.index]).toBeUndefined();
    // A whole world cleared ahead is passed over at once.
    const far = at(WORLDS[N - 1].last);
    for (let i = hard.first; i <= hard.last; i++) far.ahead[hard.index] = i - hard.first + 1;
    finishStage(far, WORLDS[N - 1].last, true);
    expect(cleared(far)).toBe(hard.last + 1);
  });

  it('a win says which worlds it opened, and the battles go on along the line', () => {
    const save = at(WORLDS[0].last);
    const r = finishStage(save, WORLDS[0].last, true);
    expect(r.opened.sort((a, b) => a - b)).toEqual([world(1, 0), world(0, 1)].sort((a, b) => a - b));
    expect(r.reached).toBe(world(1, 0));
    expect(afterBattle(save, WORLDS[0].last, r)).toBe(WORLDS[1].first);
    // Beating Thornwood on Hard before the dunes are beaten: the next stage of the line is not open, so back to the line's own furthest.
    const hard = WORLDS[world(0, 1)];
    save.ahead[hard.index] = hard.last - hard.first;
    const r2 = finishStage(save, hard.last, true);
    expect(r2.first).toBe(true);
    expect(r2.opened).toEqual([world(0, 2)]);
    expect(r2.reached).toBe(-1);
    expect(afterBattle(save, hard.last, r2)).toBe(cleared(save));
    // A loss at the first stage of a world entered ahead of the line steps back to the last stage the line has cleared.
    const expert = WORLDS[world(0, 2)];
    save.at = expert.first;
    const lost = finishStage(save, expert.first, false);
    expect(afterBattle(save, expert.first, lost)).toBe(cleared(save) - 1);
    expect(save.lostAt).toBe(expert.first);
  });

  it('a save keeps what was cleared ahead, and one from before has none', () => {
    const save = at(12);
    save.ahead[N] = 4;
    const back = repair(JSON.parse(JSON.stringify(save)), 1);
    expect(back.ahead).toEqual({ [N]: 4 });
    const old = JSON.parse(JSON.stringify(save));
    delete old.ahead;
    expect(repair(old, 1).ahead).toEqual({});
    // Nonsense is dropped: a world there is not, a count that is not one, more than the world has.
    const bad = JSON.parse(JSON.stringify(save));
    bad.ahead = { 99: 3, [N]: 'x', [N + 1]: 500, '-1': 2 };
    expect(repair(bad, 1).ahead).toEqual({ [N + 1]: WORLDS[N + 1].last - WORLDS[N + 1].first + 1 });
  });
});

describe('a new player', () => {
  it('starts with three cards in a team, two packs, and room for a fourth', () => {
    const save = startingSave(1);
    expect(save.cards).toHaveLength(3);
    expect(new Set(save.cards.map((c) => c.id)).size).toBe(3);
    expect(save.team).toHaveLength(3);
    expect(save.packs.recruit).toBe(2);
    expect(teamSize(save)).toBe(BASE_TEAM);
    expect(frontier(save)).toBe(0);
    expect(cleared(save)).toBe(0);
  });

  it('can win the first stage with what they start with', () => {
    let wins = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const save = startingSave(seed);
      if (runBattle(stageInput(save, 0), false).winner === 0) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(18);
  });
});

describe('what is open', () => {
  it('stages open in order, one after the other, all along the line', () => {
    const save = startingSave(1);
    expect(stageOpen(save, 0)).toBe(true);
    expect(stageOpen(save, 1)).toBe(false);
    expect(stageOpen(save, -1)).toBe(false);
    const r = finishStage(save, 0, true);
    expect(r.first).toBe(true);
    expect(cleared(save)).toBe(1);
    expect(stageOpen(save, 1)).toBe(true);
    expect(stageOpen(save, 2)).toBe(false);
    expect(frontier(save)).toBe(1);
    const end = at(STAGES.length);
    expect(lineDone(end)).toBe(true);
    expect(frontier(end)).toBe(STAGES.length - 1);
    expect(stageOpen(end, STAGES.length)).toBe(false);
  });

  it('a loss opens nothing and pays no coins, but the team still learns', () => {
    const save = startingSave(1);
    const coins = save.coins;
    const r = finishStage(save, 0, false);
    expect(r.coins).toBe(0);
    expect(save.coins).toBe(coins);
    expect(cleared(save)).toBe(0);
    expect(r.xp).toBe(stageXp(0, false));
    expect(r.xp).toBeGreaterThan(0);
    expect(r.xp).toBeLessThan(stageXp(0, true));
    expect(save.stats).toMatchObject({ battles: 1, wins: 0 });
  });

  it('a first clear pays in full and a replay half', () => {
    const save = startingSave(1);
    const first = finishStage(save, 0, true);
    expect(first.coins).toBe(STAGES[0].coins);
    expect(first.coins).toBe(stagePay(0, true));
    const again = finishStage(save, 0, true);
    expect(again.first).toBe(false);
    expect(again.coins).toBe(Math.round(STAGES[0].coins / 2));
    expect(cleared(save)).toBe(1);
  });

  it('the team grows at stages the line names, to a ceiling', () => {
    expect(teamSize(at(0))).toBe(BASE_TEAM);
    TEAM_AT.forEach((n, i) => {
      expect(teamSize(at(n - 1)), `before stage ${n}`).toBe(BASE_TEAM + i);
      expect(teamSize(at(n)), `after stage ${n}`).toBe(BASE_TEAM + i + 1);
    });
    expect(teamSize(at(STAGES.length))).toBe(MAX_TEAM);
    const save = at(TEAM_AT[0] - 1);
    expect(finishStage(save, TEAM_AT[0] - 1, true).moreTeam).toBe(1);
  });

  it('beating the boss of a world always drops packs and opens the next world', () => {
    const save = at(9);
    const r = finishStage(save, 9, true);
    expect(r.packs.filter((p) => p === 'thornwood').length).toBeGreaterThanOrEqual(2);
    expect(r.reached).toBe(1);
    expect(worldReached(save, 1)).toBe(true);
    expect(worldReached(save, 2)).toBe(false);
    // A stage in the middle of a world opens no world, and the last stage of all says the line is done.
    expect(finishStage(at(3), 3, true).reached).toBe(-1);
    const last = finishStage(at(STAGES.length - 1), STAGES.length - 1, true);
    expect(last).toMatchObject({ finished: true, reached: -1 });
  });
});

describe('what is known', () => {
  it('a unit is known once it is held or has been beaten', () => {
    const save = startingSave(1);
    expect(beaten(save, UNITS.knight)).toBe(true);
    expect(beaten(save, UNITS.cutpurse)).toBe(false);
    expect(known(save, UNITS.cutpurse)).toBe(false);
    expect(known(save, UNITS.knight)).toBe(true);
    expect(known(save, UNITS.paladin)).toBe(false);
    const r = finishStage(save, 0, true);
    expect(r.unlocked).toEqual(['cutpurse']);
    expect(known(save, UNITS.cutpurse)).toBe(true);
    expect(beaten(save, UNITS.warlord)).toBe(false);
    // The dunes' Lancer stands at their first stage, which is the eleventh of the line.
    expect(beaten(at(10), UNITS.lancer)).toBe(false);
    expect(beaten(at(11), UNITS.lancer)).toBe(true);
  });

  it('a pack holds every unit of its set from the start: nothing in it is unlocked', () => {
    const save = startingSave(1);
    for (const pack of PACKS) {
      // All of its set: its people, its structures, or both, as the pack says. A prize is in no pack.
      const all = Object.values(UNITS)
        .filter((u) => u.set === pack.set && !u.prize && (pack.structures === undefined || (pack.structures === 'only') === isStructure(u.id)))
        .map((u) => u.id).sort();
      expect(all.length, pack.id).toBeGreaterThan(0);
      expect(packPool(save, pack).map((u) => u.id).sort(), pack.id).toEqual(all);
    }
    // The boss of the first world can be pulled before it has been met, and is known from then on.
    expect(packPool(save, packById('thornwood')).map((u) => u.id)).toContain('warlord');
    expect(known(save, UNITS.warlord)).toBe(false);
    save.packs.thornwood = 400;
    while (!known(save, UNITS.warlord) && openPack(save, 'thornwood'));
    expect(known(save, UNITS.warlord)).toBe(true);
  });

  it("a land's pack is sold once that land is open, and its harder packs once the land is open on that difficulty", () => {
    const save = startingSave(1);
    expect(packOpen(save, packById('recruit'))).toBe(true);
    expect(packOpen(save, packById('thornwood'))).toBe(true);
    expect(packOpen(save, packById('dunes'))).toBe(false);
    expect(packOpen(at(10), packById('dunes'))).toBe(true);
    expect(packOpen(at(21), packById('royal'))).toBe(false);
    expect(packOpen(at(22), packById('royal'))).toBe(true);
    // Thornwood on Hard opens with the Warlord's fall, and its pack with it; the dunes' Hard pack needs the dunes beaten too, and Thornwood on Hard.
    expect(packById('thornwood@1').name).toBe('Hard Thornwood Pack');
    expect(packOpen(at(9), packById('thornwood@1'))).toBe(false);
    expect(packOpen(at(10), packById('thornwood@1'))).toBe(true);
    expect(packOpen(at(PER_LAP), packById('dunes@1'))).toBe(false);
    expect(packOpen(at(PER_LAP + 10), packById('dunes@1'))).toBe(true);
    // Unopened packs of every lap are counted as held.
    const held = at(PER_LAP);
    held.packs = { recruit: 1, 'thornwood@1': 2 };
    expect(packsHeld(held)).toBe(3);
  });
});

describe('packs', () => {
  it('hand out only the grades they name, and only units of their set that are in the pool', () => {
    const save = at(25);
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
    const save = at(25);
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

  it('opening always gives a card of its own, a copy of a unit held too, and uses the pack up', () => {
    const save = startingSave(3);
    save.packs.recruit = 60;
    const seen = new Set<string>();
    let best = 0;
    for (let i = 0; i < 60; i++) {
      const before = save.cards.length;
      const held = cardsOf(save, 'knight').length;
      const pull = openPack(save, 'recruit');
      expect(pull).not.toBeNull();
      if (!pull) continue;
      seen.add(pull.outcome);
      // Every pull is one more card, whatever it is.
      expect(save.cards.length).toBe(before + 1);
      const card = cardOf(save, pull.card);
      expect(card).toMatchObject({ unit: pull.unit, grade: pull.grade, level: 1, xp: 0 });
      expect(pull.held).toBe(cardsOf(save, pull.unit).length);
      expect(pull.outcome).toBe(pull.held === 1 ? 'new' : 'copy');
      if (pull.unit === 'knight') expect(pull.held).toBe(held + 1);
      if (pull.best) {
        best++;
        // The best yet is better than every other card of its unit.
        for (const c of cardsOf(save, pull.unit)) if (c.id !== pull.card) expect(c.grade).toBeLessThan(pull.grade);
      }
    }
    expect(save.packs.recruit).toBe(0);
    expect(openPack(save, 'recruit')).toBeNull();
    expect(seen).toEqual(new Set(['new', 'copy']));
    expect(best).toBeGreaterThan(0);
    expect(save.stats.opened).toBe(60);
    expect(new Set(save.cards.map((c) => c.id)).size).toBe(save.cards.length);
  });

  it('the same save opens the same cards', () => {
    const a = startingSave(11);
    const b = startingSave(11);
    a.packs.recruit = b.packs.recruit = 10;
    for (let i = 0; i < 10; i++) expect(openPack(a, 'recruit')).toEqual(openPack(b, 'recruit'));
  });

  it('a card joins the team while there is room, a copy too, and waits when there is none', () => {
    const save = startingSave(4);
    expect(save.team).toHaveLength(3);
    const first = openPack(save, 'recruit');
    expect(first?.joined).toBe(true);
    expect(save.team).toHaveLength(4);
    expect(save.team.some((p) => p.card === first?.card && p.unit === first?.unit)).toBe(true);
    const second = openPack(save, 'recruit');
    expect(second?.joined).toBe(false);
    expect(save.team).toHaveLength(4);
    expect(inTeam(save, second?.card ?? 0)).toBe(false);
  });

  it('are bought with coins, when sold and affordable', () => {
    const save = startingSave(1);
    save.coins = 100;
    // The dunes have not been reached, so their pack is not sold however many coins there are.
    expect(buyPack(save, 'dunes')).toBe(false);
    expect(buyPack(save, 'recruit')).toBe(true);
    expect(save.coins).toBe(40);
    expect(save.packs.recruit).toBe(3);
    expect(buyPack(save, 'recruit')).toBe(false);
  });
});


describe('opening and buying many packs', () => {
  it('opening several is opening one that many times, and stops when there are no more', () => {
    const a = startingSave(9);
    const b = startingSave(9);
    a.packs.recruit = 5;
    b.packs.recruit = 5;
    const many = openPacks(a, 'recruit', 3);
    const single = [openPack(b, 'recruit'), openPack(b, 'recruit'), openPack(b, 'recruit')];
    expect(many).toEqual(single);
    expect(a.packs.recruit).toBe(2);
    expect(a.cards).toEqual(b.cards);
    // Asking for more than are held opens what there is.
    expect(openPacks(a, 'recruit', 10)).toHaveLength(2);
    expect(openPacks(a, 'recruit', 10)).toEqual([]);
    expect(a.stats.opened).toBe(5);
  });

  it('buying several stops at what the coins will pay for', () => {
    const save = startingSave(9);
    const cost = packById('recruit').cost;
    save.coins = cost * 3 + 5;
    expect(buyPacks(save, 'recruit', 10)).toBe(3);
    expect(save.coins).toBe(5);
    expect(save.packs.recruit).toBe(2 + 3);
    // A pack that is not sold yet is not bought.
    save.coins = 100000;
    expect(buyPacks(save, 'royal', 2)).toBe(0);
    expect(save.coins).toBe(100000);
  });

  it('a pack says how likely each thing in it is, and that is how it is rolled', () => {
    const save = startingSave(3);
    for (const pack of allPacks()) {
      const odds = packOdds(save, pack);
      expect(odds.map((o) => o.unit.id).sort(), pack.id).toEqual(packPool(save, pack).map((u) => u.id).sort());
      expect(odds.reduce((n, o) => n + o.chance, 0), pack.id).toBeCloseTo(1, 9);
      for (const o of odds) expect(o.chance, `${pack.id}: ${o.unit.id}`).toBeGreaterThan(0);
    }
    // A land's pack: a structure one time in five, and a Legendary rarely.
    const thornwood = packOdds(save, packById('thornwood'));
    expect(thornwood.filter((o) => isStructure(o.unit.id)).reduce((n, o) => n + o.chance, 0)).toBeCloseTo(STRUCTURE_SHARE, 9);
    expect(thornwood.find((o) => o.unit.id === 'warlord')!.chance).toBeLessThan(0.02);
    // Rolled many times, a unit comes up about as often as the pack said.
    const rng = new Rng(5);
    const n = 6000;
    const seen = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const id = rollPack(save, packById('thornwood'), rng).unit.id;
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    for (const o of thornwood) {
      if (o.chance > 0.05) expect((seen.get(o.unit.id) ?? 0) / n, o.unit.id).toBeGreaterThan(o.chance * 0.8);
      expect((seen.get(o.unit.id) ?? 0) / n, o.unit.id).toBeLessThan(o.chance * 1.25 + 0.01);
    }
  });
});

describe('cards', () => {
  it('level with experience, up to a ceiling', () => {
    const card = { id: 1, unit: 'knight', grade: 0, level: 1, xp: 0 };
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
    Object.assign(cardsOf(save, 'knight')[0], { grade: 3, level: 5 });
    const input = stageInput(save, 0);
    const knight = input.teams[0].find((p) => p.unit === 'knight');
    expect(knight?.hpMult).toBeCloseTo(cardMult(3, 5), 6);
    const foes = stageEnemies(4);
    const elite = foes.find((p) => p.unit === 'bruiser');
    expect(elite?.scale).toBeGreaterThan(1);
    expect(elite?.hpMult).toBeGreaterThan(foes[1].hpMult ?? 0);
  });
});


describe('the team', () => {
  it('takes cards in and out, and no more than may be fielded', () => {
    const save = startingSave(1);
    const [cleric, , mage] = ['cleric', 'berserker', 'mage'].map((id) => addCard(save, id, 0).id);
    const knight = cardsOf(save, 'knight')[0].id;
    expect(toggleTeam(save, cleric)).toBe(true);
    expect(save.team).toHaveLength(4);
    expect(toggleTeam(save, mage)).toBe(false);
    expect(toggleTeam(save, knight)).toBe(true);
    expect(save.team.some((p) => p.unit === 'knight')).toBe(false);
    expect(toggleTeam(save, mage)).toBe(true);
    // A card that is not held can't be fielded.
    expect(toggleTeam(save, 9999)).toBe(false);
    const tiles = save.team.map((p) => `${p.col},${p.row}`);
    expect(new Set(tiles).size).toBe(tiles.length);
  });

  it('fields two cards of one unit side by side, each with its own grade and level', () => {
    const save = startingSave(1);
    const first = cardsOf(save, 'knight')[0];
    const second = addCard(save, 'knight', 4);
    second.level = 7;
    expect(toggleTeam(save, second.id)).toBe(true);
    expect(save.team.filter((p) => p.unit === 'knight')).toHaveLength(2);
    const knights = stageInput(save, 0).teams[0].filter((p) => p.unit === 'knight');
    expect(knights.map((p) => p.hpMult).sort()).toEqual([cardMult(first.grade, first.level), cardMult(4, 7)].sort());
    expect(runBattle(stageInput(save, 0), false).winner).toBe(0);
    // Only the cards that fought are taught by it.
    const spare = addCard(save, 'knight', 0);
    finishStage(save, 0, true);
    expect(second.xp + second.level).toBeGreaterThan(7);
    expect(spare).toMatchObject({ level: 1, xp: 0 });
  });

  it('is made fit to fight whatever state it was saved in', () => {
    const save = startingSave(1);
    const id = (unit: string): number => cardsOf(save, unit)[0].id;
    save.team = [
      { card: id('knight'), unit: 'knight', col: 3, row: 1 },
      { card: id('knight'), unit: 'knight', col: 2, row: 1 },
      { card: 9999, unit: 'ghost', col: 1, row: 1 },
      // A place that names the wrong unit for its card takes the card's.
      { card: id('archer'), unit: 'mage', col: 3, row: 1 },
      { card: id('militia'), unit: 'militia', col: 9, row: 9 },
    ];
    tidyTeam(save);
    expect(save.team.map((p) => p.unit)).toEqual(['knight', 'archer', 'militia']);
    const tiles = save.team.map((p) => `${p.col},${p.row}`);
    expect(new Set(tiles).size).toBe(3);
    for (const p of save.team) expect(p.col).toBeLessThan(4);
  });

  it('FILL TEAM picks the strongest cards held', () => {
    const save = startingSave(1);
    Object.assign(addCard(save, 'paladin', 4), { level: 9 });
    addCard(save, 'cleric', 0);
    const team = bestTeam(save);
    expect(team).toHaveLength(4);
    expect(team.some((p) => p.unit === 'paladin')).toBe(true);
  });

  it('FILL TEAM wants some of each role: it will not field a wall of tanks while a fighter waits', () => {
    const save = at(40);
    save.cards = [];
    const tanks = [0, 1, 2, 3, 4, 5, 6, 7].map(() => Object.assign(addCard(save, 'knight', 4), { level: 10 }));
    const mage = Object.assign(addCard(save, 'mage', 3), { level: 8 });
    const archer = Object.assign(addCard(save, 'archer', 3), { level: 8 });
    const cleric = Object.assign(addCard(save, 'cleric', 3), { level: 8 });
    // Every Knight is stronger than any of the three, and still they are fielded.
    for (const c of [mage, archer, cleric]) expect(cardPower(c)).toBeLessThan(cardPower(tanks[0]));
    const team = bestTeam(save);
    expect(team).toHaveLength(teamSize(save));
    for (const c of [mage, archer, cleric]) expect(team.some((p) => p.card === c.id), c.unit).toBe(true);
    expect(team.filter((p) => p.unit === 'knight').length).toBeLessThan(8);
    // With nothing else to field, it fields what there is.
    save.cards = save.cards.filter((c) => c.unit === 'knight');
    expect(bestTeam(save)).toHaveLength(teamSize(save));
  });

  it('FILL TEAM fields copies of a unit when they are the strongest held', () => {
    const save = startingSave(1);
    const strong = [0, 1, 2].map(() => Object.assign(addCard(save, 'mage', 5), { level: 12 }).id);
    const team = bestTeam(save);
    expect(team.filter((p) => p.unit === 'mage').map((p) => p.card).sort()).toEqual(strong.sort());
    expect(new Set(team.map((p) => `${p.col},${p.row}`)).size).toBe(team.length);
    expect(new Set(team.map((p) => p.card)).size).toBe(team.length);
  });
});


describe('structures', () => {
  const structures = Object.values(UNITS).filter((u) => isStructure(u.id));

  it('are buildings and traps: each land has a tower, a hall that sends its troops out and a trap, and the Crownlands have six', () => {
    expect(structures).toHaveLength(15);
    for (const u of structures) {
      // A building stands still and a trap is a trap; nothing built walks.
      expect(u.kind === 'trap' ? !!u.trap : !!u.still, u.id).toBe(true);
      expect(u.speed, u.id).toBe(0);
      expect(cardPower({ id: 1, unit: u.id, grade: 0, level: 1, xp: 0 }), u.id).toBeGreaterThan(0);
      // Whoever a hall sends out is one of its own set, and no structure.
      if (u.summons) {
        expect(UNITS[u.summons.unit].set, u.id).toBe(u.set);
        expect(isStructure(u.summons.unit), u.id).toBe(false);
      }
    }
    expect(structures.filter((u) => u.set === 'kingdom')).toHaveLength(6);
    for (const land of LANDS) {
      const of = structures.filter((u) => u.set === land.set);
      expect(of.filter((u) => u.kind === 'trap'), land.id).toHaveLength(1);
      expect(of.filter((u) => u.summons), land.id).toHaveLength(1);
      expect(of.filter((u) => u.kind === 'building' && u.damage > 0), land.id).toHaveLength(1);
      // A unit says from which stage it is met, and that is the first it stands at.
      for (const u of of) {
        const first = land.stages.findIndex((st) => st.enemies.some((e) => e.unit === u.id));
        expect(u.from, u.id).toBe(first + 1);
      }
    }
  });

  it('stand in places of their own, which open as the line is cleared, and the first comes with a pack', () => {
    expect(structuresSize(at(0))).toBe(0);
    STRUCTURES_AT.forEach((n, i) => {
      expect(structuresSize(at(n - 1)), `before stage ${n}`).toBe(i);
      expect(structuresSize(at(n)), `after stage ${n}`).toBe(i + 1);
    });
    expect(structuresSize(at(STAGES.length))).toBe(MAX_STRUCTURES);
    // The Builder's Pack is sold from the stage that opens the first place, and one is handed over with it.
    expect(packById(STRUCTURE_PACK).after).toBe(STRUCTURES_AT[0]);
    const save = at(STRUCTURES_AT[0] - 1);
    const r = finishStage(save, STRUCTURES_AT[0] - 1, true);
    expect(r.moreStructures).toBe(1);
    expect(r.packs).toContain(STRUCTURE_PACK);
    expect(packOpen(save, packById(STRUCTURE_PACK))).toBe(true);
    expect(packOpen(at(STRUCTURES_AT[0] - 1), packById(STRUCTURE_PACK))).toBe(false);
    // The second place does not come with one.
    const later = at(STRUCTURES_AT[1] - 1);
    const r2 = finishStage(later, STRUCTURES_AT[1] - 1, true);
    expect(r2.moreStructures).toBe(1);
    expect(r2.packs).not.toContain(STRUCTURE_PACK);
  });

  it('a structure takes no unit\'s place and a unit takes no structure\'s', () => {
    const early = at(2);
    const tower = addCard(early, 'watchtower', 0);
    // No place for it yet.
    expect(roomFor(early, 'watchtower')).toBe(false);
    expect(toggleTeam(early, tower.id)).toBe(false);

    const save = at(STRUCTURES_AT[0]);
    save.cards = [];
    save.team = [];
    const units = ['knight', 'archer', 'militia', 'cleric', 'mage', 'paladin', 'berserker'].map((u) => addCard(save, u, 0));
    for (const c of units.slice(0, teamSize(save))) expect(toggleTeam(save, c.id), c.unit).toBe(true);
    // The team is full of units, and there is still the one place for a structure.
    expect(unitsIn(save.team)).toBe(teamSize(save));
    expect(toggleTeam(save, units[teamSize(save)].id)).toBe(false);
    const trap = addCard(save, 'spiketrap', 0);
    const wall = addCard(save, 'palisade', 0);
    expect(toggleTeam(save, trap.id)).toBe(true);
    expect(toggleTeam(save, wall.id)).toBe(false);
    expect(structuresIn(save.team)).toBe(1);
    expect(save.team).toHaveLength(teamSize(save) + 1);
    // Each stands on a tile of its own, the trap out in front.
    expect(new Set(save.team.map((p) => `${p.col},${p.row}`)).size).toBe(save.team.length);
    // A team with more structures than it has places is put right before it fights.
    save.team.push({ card: wall.id, unit: 'palisade', col: 0, row: 3 });
    tidyTeam(save);
    expect(structuresIn(save.team)).toBe(1);
    expect(unitsIn(save.team)).toBe(teamSize(save));
    // The battle is fought with all of them.
    expect(stageInput(save, 0).teams[0].map((p) => p.unit)).toContain('spiketrap');
  });

  it('FILL TEAM fills the structures\' places too, with no two the same while there is another to stand', () => {
    const save = at(STAGES.length);
    save.cards = [];
    for (const u of ['knight', 'archer', 'militia', 'cleric', 'mage', 'paladin', 'berserker', 'knight', 'archer']) addCard(save, u, 2);
    const towers = [0, 1, 2].map(() => Object.assign(addCard(save, 'watchtower', 5), { level: 10 }));
    addCard(save, 'spiketrap', 0);
    addCard(save, 'barracks', 0);
    const team = bestTeam(save);
    expect(unitsIn(team)).toBe(MAX_TEAM);
    expect(structuresIn(team)).toBe(MAX_STRUCTURES);
    expect(team.filter((p) => isStructure(p.unit)).map((p) => p.unit).sort()).toEqual(['barracks', 'spiketrap', 'watchtower']);
    // The tower fielded is one of the strong ones.
    expect(towers.map((c) => c.id)).toContain(team.find((p) => p.unit === 'watchtower')?.card);
    expect(new Set(team.map((p) => `${p.col},${p.row}`)).size).toBe(team.length);
    // With only towers to stand, it stands towers.
    save.cards = save.cards.filter((c) => c.unit !== 'spiketrap' && c.unit !== 'barracks');
    expect(bestTeam(save).filter((p) => p.unit === 'watchtower')).toHaveLength(3);
    // And with no place for one, none is fielded.
    save.cleared = 0;
    expect(structuresIn(bestTeam(save))).toBe(0);
  });

  it('a pack of people holds no structure, the Builder\'s Pack holds nothing else, and a land\'s pack turns one over about one time in five', () => {
    const save = startingSave(3);
    const rng = new Rng(77);
    for (let i = 0; i < 300; i++) expect(isStructure(rollPack(save, packById('recruit'), rng).unit.id)).toBe(false);
    for (let i = 0; i < 300; i++) expect(isStructure(rollPack(save, packById(STRUCTURE_PACK), rng).unit.id)).toBe(true);
    let built = 0;
    const seen = new Set<string>();
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const u = rollPack(save, packById('thornwood'), rng).unit;
      if (isStructure(u.id)) built++;
      seen.add(u.id);
    }
    expect(built / n).toBeGreaterThan(STRUCTURE_SHARE - 0.03);
    expect(built / n).toBeLessThan(STRUCTURE_SHARE + 0.03);
    // Everything of the raiders' can come out of it, the tent and the snare among them.
    for (const u of Object.values(UNITS)) if (u.set === 'raiders') expect(seen.has(u.id), u.id).toBe(true);
    for (const pack of PACKS) for (const u of packPool(save, pack)) expect(packHolds(pack, u)).toBe(true);
  });

  it('a later lap adds troops to a stage, never another tower or trap', () => {
    for (const s of STAGES) {
      if (s.extra === 0) continue;
      const written = s.def.enemies.filter((e) => isStructure(e.unit)).length;
      expect(stageEnemies(s.index).filter((p) => isStructure(p.unit)), `stage ${s.index + 1}`).toHaveLength(written);
    }
  });

  it('are listed after the people of their set, and sort like any card', () => {
    const save = startingSave(1);
    const tower = addCard(save, 'watchtower', 3);
    const order = sortCards(save.cards, 'unit').map((c) => c.unit);
    expect(order[order.length - 1]).toBe('watchtower');
    expect(sortCards(save.cards, 'grade')[0].id).toBe(tower.id);
  });
});

describe('summoners', () => {
  const summoners = Object.values(UNITS).filter((u) => u.summons && !isStructure(u.id));

  it('there is one to a set: it walks, fights little, and calls a troop of its own set', () => {
    // Every land's set has one. The Faithful are no land's: the rewards give them, and none of them calls anyone.
    expect(summoners.map((u) => u.set).sort()).toEqual(Object.keys(SETS).filter((s) => s !== 'faithful').sort());
    for (const u of summoners) {
      const called = UNITS[u.summons!.unit];
      expect(called.set, u.id).toBe(u.set);
      expect(isStructure(called.id), u.id).toBe(false);
      expect(called.summons, u.id).toBeUndefined();
      expect(u.speed, u.id).toBeGreaterThan(0);
      // It strikes less hard than whoever it calls.
      expect(u.damage / u.attackInterval, u.id).toBeLessThan(called.damage / called.attackInterval);
    }
  });

  it('a land\'s stands in a few of its stages, never two at once, and never in its boss\'s', () => {
    for (const land of LANDS) {
      const mine = summoners.find((u) => u.set === land.set)!;
      const stood = land.stages.map((st) => st.enemies.filter((e) => e.unit === mine.id).length);
      expect(Math.max(...stood), land.id).toBe(1);
      expect(stood.filter((n) => n > 0).length, land.id).toBeGreaterThanOrEqual(2);
      expect(stood.filter((n) => n > 0).length, land.id).toBeLessThanOrEqual(4);
      expect(stood[stood.length - 1], land.id).toBe(0);
      expect(mine.from).toBe(stood.findIndex((n) => n > 0) + 1);
    }
    // A later lap adds troops who fight, never a second summoner.
    for (const s of STAGES) {
      const written = s.def.enemies.filter((e) => UNITS[e.unit].summons).length;
      expect(stageEnemies(s.index).filter((p) => UNITS[p.unit].summons), `stage ${s.index + 1}`).toHaveLength(written);
    }
  });

  it('calls its troops in a battle, as strong as it is, and they are fielded like any card', () => {
    const b = new Battle({
      seed: 6, defs: UNITS, seconds: 30,
      teams: [[{ unit: 'herald', col: 0, row: 1, hpMult: 3, damageMult: 2 }], [{ unit: 'palisade', col: 7, row: 1 }, { unit: 'knight', col: 7, row: 3, hpMult: 30 }]],
    });
    while (!b.ended) b.step();
    const sent = b.units.filter((u) => u.calledBy === 0);
    expect(sent.length).toBeGreaterThanOrEqual(2);
    expect(sent[0].def.id).toBe('militia');
    expect(sent[0]).toMatchObject({ team: 0, maxHp: UNITS.militia.hp * 3, damage: UNITS.militia.damage * 2 });
    // A summoner takes a unit's place in the team, not a structure's, and stands at the back.
    const save = at(STRUCTURES_AT[0]);
    save.cards = [];
    save.team = [];
    const herald = addCard(save, 'herald', 0);
    expect(toggleTeam(save, herald.id)).toBe(true);
    expect(unitsIn(save.team)).toBe(1);
    expect(structuresIn(save.team)).toBe(0);
    expect(save.team[0].col).toBeLessThan(2);
    expect(cardPower(herald)).toBeGreaterThan(0);
  });
});

describe('sorting', () => {
  const held = (): SaveData => {
    const save = startingSave(1);
    Object.assign(addCard(save, 'paladin', 1), { level: 3 });
    Object.assign(addCard(save, 'knight', 5), { level: 2 });
    Object.assign(addCard(save, 'mage', 2), { level: 9 });
    addCard(save, 'archer', 0);
    return save;
  };

  it('lays cards out by unit, power, grade, level, rarity, health and damage, the most first', () => {
    const save = held();
    for (const by of SORTS) {
      const out = sortCards(save.cards, by);
      // Every card is there once, whatever the order.
      expect(out.map((c) => c.id).sort()).toEqual(save.cards.map((c) => c.id).sort());
      const key: Record<string, (c: (typeof out)[number]) => number> = {
        unit: () => 0,
        power: (c) => cardPower(c),
        grade: (c) => c.grade,
        level: (c) => c.level,
        rarity: (c) => RARITIES.indexOf(UNITS[c.unit].rarity),
        health: (c) => cardHealth(c),
        damage: (c) => cardDamage(c),
      };
      for (let i = 1; i < out.length; i++) expect(key[by](out[i - 1])).toBeGreaterThanOrEqual(key[by](out[i]));
    }
    expect(sortCards(save.cards, 'grade')[0]).toMatchObject({ unit: 'knight', grade: 5 });
    expect(sortCards(save.cards, 'level')[0]).toMatchObject({ unit: 'mage', level: 9 });
    expect(sortCards(save.cards, 'rarity')[0].unit).toBe('paladin');
  });

  it('by unit keeps the cards of a unit together, its best first', () => {
    const save = held();
    const out = sortCards(save.cards, 'unit');
    const knights = out.map((c, i) => (c.unit === 'knight' ? i : -1)).filter((i) => i >= 0);
    expect(knights[1] - knights[0]).toBe(1);
    expect(out[knights[0]].grade).toBe(5);
    const archers = out.filter((c) => c.unit === 'archer');
    expect(archers).toHaveLength(2);
    expect(Math.abs(out.indexOf(archers[0]) - out.indexOf(archers[1]))).toBe(1);
  });

  it('never shuffles cards that tie, and does not change the list it is given', () => {
    const save = held();
    const before = save.cards.map((c) => c.id);
    for (const by of SORTS) expect(sortCards(sortCards(save.cards, by), by)).toEqual(sortCards([...save.cards].reverse(), by));
    expect(save.cards.map((c) => c.id)).toEqual(before);
  });

  it('SORT steps through every order and comes round again, and a save keeps the choice', () => {
    let by: Sort = SORTS[0];
    const seen = new Set<string>();
    for (let i = 0; i < SORTS.length; i++) {
      seen.add(by);
      expect(SORT_NAME[by].length).toBeGreaterThan(0);
      by = nextSort(by);
    }
    expect(seen.size).toBe(SORTS.length);
    expect(by).toBe(SORTS[0]);
    const save = startingSave(1);
    expect(isSort(save.sort)).toBe(true);
    save.sort = 'rarity';
    expect(repair(JSON.parse(JSON.stringify(save)), 1).sort).toBe('rarity');
    expect(isSort('nonsense')).toBe(false);
  });
});


describe('combining', () => {
  const two = (): { save: ReturnType<typeof startingSave>; into: number; from: number } => {
    const save = startingSave(1);
    save.team = [];
    return { save, into: cardsOf(save, 'knight')[0].id, from: addCard(save, 'knight', 0).id };
  };

  it('gives a card the worth of the cards given up, which are gone', () => {
    const { save, into, from } = two();
    const before = save.cards.length;
    const fed = cardOf(save, from);
    const value = fed ? worth(fed) : 0;
    expect(value).toBe(COPY_XP[UNITS.knight.rarity]);
    const seen = combinePreview(save, into, [from]);
    // Looking changes nothing.
    expect(save.cards.length).toBe(before);
    const done = combine(save, into, [from]);
    expect(done).toEqual(seen);
    expect(done?.xp).toBe(value);
    expect(save.cards.length).toBe(before - 1);
    expect(cardOf(save, from)).toBeUndefined();
    const card = cardOf(save, into);
    expect(card && xpHeld(card)).toBe(value);
    expect(card?.grade).toBe(0);
  });

  it('a better grade, a rarer unit and a higher level are each worth more', () => {
    const card = (unit: string, grade: number, level: number) => ({ id: 1, unit, grade, level, xp: 0 });
    expect(worth(card('knight', 3, 1))).toBeGreaterThan(worth(card('knight', 2, 1)));
    expect(worth(card('knight', 0, 6))).toBeGreaterThan(worth(card('knight', 0, 5)));
    expect(worth(card('paladin', 0, 1))).toBeGreaterThan(worth(card('militia', 0, 1)));
  });

  it('a card given up takes less than it holds with it, so passing levels about makes nothing', () => {
    const { save, into, from } = two();
    const a = cardOf(save, into);
    const b = cardOf(save, from);
    if (!a || !b) throw new Error('no cards');
    addXp(a, 5000);
    const held = xpHeld(a);
    // The leveled card into the fresh one, and a fresh card back into that: less than there was.
    combine(save, b.id, [a.id]);
    expect(xpHeld(b)).toBeLessThan(held + COPY_XP[UNITS.knight.rarity]);
    expect(xpHeld(b)).toBeGreaterThan(held * 0.7);
  });

  it('the old card can be combined into a better pull, which keeps its grade', () => {
    const { save, into } = two();
    const old = cardOf(save, into);
    if (!old) throw new Error('no card');
    addXp(old, 2000);
    const pulled = addCard(save, 'knight', 4);
    const done = combine(save, pulled.id, [old.id]);
    expect(done?.to).toBeGreaterThan(1);
    expect(pulled.grade).toBe(4);
    expect(pulled.level).toBeGreaterThan(1);
    expect(pulled.level).toBeLessThanOrEqual(old.level);
  });

  it('takes any card, of its own unit or another', () => {
    const { save, into, from } = two();
    const archer = cardsOf(save, 'archer')[0];
    const militia = cardsOf(save, 'militia')[0];
    expect(whyNot(save, into, archer.id)).toBeNull();
    // The least are offered first: they are what a player parts with soonest.
    Object.assign(militia, { grade: 3, level: 4 });
    expect(spare(save, into).map((c) => c.id)).toEqual([archer.id, from, militia.id]);
    // A card of another unit gives half what a copy of the card's own unit would.
    expect(worth(archer, 'knight')).toBe(Math.round(worth(archer) * OTHER_UNIT));
    expect(worth(cardOf(save, from) ?? archer, 'knight')).toBe(COPY_XP[UNITS.knight.rarity]);
    const value = worth(archer, 'knight') + worth(militia, 'knight');
    const done = combine(save, into, [archer.id, militia.id]);
    expect(done).toMatchObject({ xp: value, given: 2 });
    expect(save.cards.map((c) => c.unit).sort()).toEqual(['knight', 'knight']);
    // A unit all of whose cards are gone is still known: it was held, and can be pulled again.
    expect(cardOf(save, into)?.unit).toBe('knight');
    expect(cardsOf(save, 'archer')).toHaveLength(0);
    expect(known(save, UNITS.archer)).toBe(true);
    expect(known(repair(JSON.parse(JSON.stringify(save)), 1), UNITS.archer)).toBe(true);
  });

  it('is refused for a card in the team, the card itself, a card twice, and a card at the last level', () => {
    const { save, into, from } = two();
    const archer = cardsOf(save, 'archer')[0].id;
    toggleTeam(save, archer);
    expect(whyNot(save, into, archer)).toMatch(/team/);
    expect(combine(save, into, [into])).toBeNull();
    expect(combine(save, into, [from, from])).toBeNull();
    expect(combine(save, into, [])).toBeNull();
    expect(combine(save, into, [9999])).toBeNull();
    toggleTeam(save, from);
    expect(whyNot(save, into, from)).toMatch(/team/);
    expect(combine(save, into, [from])).toBeNull();
    expect(spare(save, into).map((c) => c.unit)).toEqual(['militia']);
    toggleTeam(save, from);
    expect(spare(save, into).map((c) => c.id)).toContain(from);
    // All of it or none: one card that can't go keeps the others too.
    const third = addCard(save, 'knight', 1).id;
    const before = save.cards.length;
    expect(combine(save, into, [third, archer])).toBeNull();
    expect(save.cards.length).toBe(before);
    const top = cardOf(save, into);
    if (top) top.level = MAX_LEVEL;
    expect(combine(save, into, [from])).toBeNull();
    // The card in the team can still be the one that grows.
    if (top) top.level = 1;
    toggleTeam(save, into);
    expect(combine(save, into, [from, third])?.given).toBe(2);
    expect(inTeam(save, into)).toBe(true);
  });

  it('stops at the last level', () => {
    const { save, into, from } = two();
    // Two cards at the last level hold more than one card can take.
    const more = addCard(save, 'knight', 0);
    more.level = MAX_LEVEL;
    const fed = cardOf(save, from);
    if (fed) fed.level = MAX_LEVEL;
    const done = combine(save, into, [from, more.id]);
    expect(done?.to).toBe(MAX_LEVEL);
    expect(done?.left).toBe(0);
    expect(cardOf(save, into)).toMatchObject({ level: MAX_LEVEL, xp: 0 });
  });
});


describe('the save', () => {
  it('survives a trip through JSON', () => {
    const save = at(14);
    save.coins = 321;
    save.packs.dunes = 2;
    save.packs['thornwood@1'] = 1;
    save.lostAt = 13;
    save.tutorial = { done: true, seen: ['team'], at: 3, tour: null };
    expect(repair(JSON.parse(JSON.stringify(save)), 1)).toEqual(save);
    // A new player's save comes back as it went, tutorial and all.
    const fresh = startingSave(4);
    fresh.tutorial.seen.push('team');
    expect(repair(JSON.parse(JSON.stringify(fresh)), 1)).toEqual(fresh);
  });

  it('is started again when it is not a save, and mended when parts are missing', () => {
    expect(repair(null, 5).cards).toEqual([]);
    expect(repair('nonsense', 5).coins).toBe(0);
    expect(repair({ version: 999, coins: 50 }, 5).coins).toBe(0);
    const mended = repair({
      version: 4, coins: -5, cleared: 99999, at: -3, lostAt: 'nowhere',
      // A card with no number, two with the same, and one with nothing to it are dropped.
      cards: [{ id: 4, unit: 'knight', grade: 2 }, { unit: 'mage' }, { id: 4, unit: 'archer' }, null, { id: 6, unit: 'knight', level: 3 }],
      team: [{ card: 4, unit: 'archer', col: 1, row: 1 }, { card: 4, col: 2, row: 2 }, { card: 77 }, { card: 6, col: 0, row: 0 }],
    }, 5);
    expect(mended.coins).toBe(0);
    expect(mended.cards).toEqual([
      { id: 4, unit: 'knight', grade: 2, level: 1, xp: 0 },
      { id: 6, unit: 'knight', grade: 0, level: 3, xp: 0 },
    ]);
    // The next card's number is past every number in use, so no two cards ever share one.
    expect(mended.nextCard).toBe(7);
    expect(mended.team).toEqual([{ card: 4, unit: 'knight', col: 1, row: 1 }, { card: 6, unit: 'knight', col: 0, row: 0 }]);
    expect(mended.packs).toEqual({});
    expect(mended.tutorial).toEqual({ done: true, seen: [], at: 0, tour: null });
    // Progress is kept on the line, and the stage on show is one that is there.
    expect(mended.cleared).toBe(STAGES.length);
    expect(mended.at).toBe(0);
    expect(mended.lostAt).toBeNull();
  });

  it('a save from when there were worlds and difficulties is carried onto the line', () => {
    const old = {
      version: 3, coins: 120, cards: [{ id: 1, unit: 'knight', grade: 1, level: 3, xp: 4 }], nextCard: 2,
      team: [{ card: 1, unit: 'knight', col: 3, row: 1 }],
      // All of Thornwood and four stages of the dunes on Easy, and Thornwood on Normal too.
      cleared: { thornwood: [10, 10], sunscar: [4] }, packs: { recruit: 2, 'thornwood@1': 1 }, rng: 7,
      stats: { battles: 30, wins: 20, opened: 9 }, speed: 2, sound: false, tutorial: { done: true, seen: [] },
      at: { world: 0, stage: 3, d: 1 }, lostAt: { world: 1, stage: 4, d: 0 }, auto: false,
    };
    const now = repair(old, 1);
    expect(now.version).toBe(4);
    // The line is walked stage after stage: ten of Thornwood and four of the dunes. What was cleared
    // of a harder difficulty lies further along the line than that, so it waits to be reached.
    expect(now.cleared).toBe(14);
    expect(now.at).toBe(14);
    expect(now.lostAt).toBeNull();
    expect(now.coins).toBe(120);
    expect(now.sound).toBe(false);
    expect(now.auto).toBe(false);
    expect(now.cards).toEqual(old.cards);
    expect(now.packs).toEqual(old.packs);
    expect(stageOpen(now, 14)).toBe(true);
    // Everything of the first lap, and the next lap begins.
    const all = repair({ ...old, cleared: { thornwood: [10, 10, 3], sunscar: [12, 5], frostholt: [15] } }, 1);
    expect(all.cleared).toBe(PER_LAP + 10 + 5);
  });

  it('a save from before difficulties and from before copies were cards is carried over too', () => {
    const first = repair({
      version: 1, coins: 120, cards: { knight: { grade: 1, level: 3, xp: 4 } }, team: [{ unit: 'knight', col: 3, row: 1 }],
      cleared: { thornwood: 10, sunscar: 4 }, packs: { recruit: 2 }, rng: 7, stats: { battles: 30, wins: 20, opened: 9 }, speed: 2, sound: false,
    }, 1);
    expect(first.cleared).toBe(14);
    expect(first.tutorial.done).toBe(true);
    // One card to a unit then: each is a card with a number now, and the team names it.
    expect(first.cards).toEqual([{ id: 1, unit: 'knight', grade: 1, level: 3, xp: 4 }]);
    expect(first.team).toEqual([{ card: 1, unit: 'knight', col: 3, row: 1 }]);
    expect(first.nextCard).toBe(2);

    const second = repair({
      version: 2, coins: 9, cards: { knight: { grade: 2, level: 4, xp: 1 }, mage: { grade: 0, level: 1, xp: 0 } },
      team: [{ unit: 'mage', col: 0, row: 1 }, { unit: 'knight', col: 3, row: 1 }, { unit: 'nobody', col: 1, row: 1 }],
      cleared: { thornwood: [3] }, tutorial: { done: true, seen: [] },
    }, 1);
    expect(second.cleared).toBe(3);
    expect(second.cards).toEqual([{ id: 1, unit: 'knight', grade: 2, level: 4, xp: 1 }, { id: 2, unit: 'mage', grade: 0, level: 1, xp: 0 }]);
    expect(second.team).toEqual([{ card: 2, unit: 'mage', col: 0, row: 1 }, { card: 1, unit: 'knight', col: 3, row: 1 }]);
    // And the next pull of a Knight is a second Knight, not a change to the first.
    second.packs.recruit = 40;
    while (cardsOf(second, 'knight').length < 2 && openPack(second, 'recruit'));
    expect(cardsOf(second, 'knight')).toHaveLength(2);
    expect(cardOf(second, 1)).toMatchObject({ grade: 2, level: 4, xp: 1 });
  });
});

describe('the run of battles', () => {
  const result = (won: boolean, first: boolean): StageResult => ({
    won, first, coins: 0, xp: 0, levelUps: [], packs: [], unlocked: [], moreTeam: 0, moreStructures: 0, reached: -1, opened: [], field: null, finished: false,
    playerXp: 0, playerLevels: 0, playerLevel: 1,
  });

  it('a first win goes on to the next stage, across a world\'s end too', () => {
    // The win is booked before the next battle is chosen: the stage after it is open by then.
    const save = at(4);
    expect(afterBattle(save, 3, result(true, true))).toBe(4);
    expect(save.at).toBe(4);
    // The boss of the first world: the next battle is the first stage of the second.
    expect(afterBattle(at(10), 9, result(true, true))).toBe(10);
  });

  it('a win again stays, so that a team left alone earns from a stage it can beat', () => {
    const save = at(6);
    expect(afterBattle(save, 2, result(true, false))).toBe(2);
  });

  it('at the last stage of all it stays there', () => {
    const last = STAGES.length - 1;
    expect(afterBattle(at(STAGES.length), last, result(true, true))).toBe(last);
  });

  it('a loss steps back one stage, and remembers where it lost', () => {
    const save = at(12);
    expect(afterBattle(save, 12, result(false, false))).toBe(11);
    expect(save.lostAt).toBe(12);
    // A loss at the stage stepped back to goes back again, and the furthest loss is the one kept.
    expect(afterBattle(save, 11, result(false, false))).toBe(10);
    expect(save.lostAt).toBe(12);
    // There is nothing before the first stage.
    const start = startingSave(1);
    expect(afterBattle(start, 0, result(false, false))).toBe(0);
    expect(start.lostAt).toBeNull();
  });

  it('a changed team goes back to the stage it lost at, once', () => {
    const save = at(12);
    afterBattle(save, 12, result(false, false));
    expect(teamChanged(save)).toBe(true);
    expect(save.at).toBe(12);
    expect(save.lostAt).toBeNull();
    expect(teamChanged(save)).toBe(false);
  });

  it('winning the stage that was lost forgets the loss', () => {
    const save = at(12);
    afterBattle(save, 12, result(false, false));
    save.at = 12;
    save.cleared = 13;
    afterBattle(save, 12, result(true, true));
    expect(save.lostAt).toBeNull();
  });

  it('only an open stage can be gone to, and a save that points at a shut one is put right', () => {
    const save = at(3);
    expect(goTo(save, 5)).toBe(false);
    expect(save.at).toBe(3);
    expect(goTo(save, 1)).toBe(true);
    expect(save.at).toBe(1);
    save.at = 90;
    save.lostAt = 91;
    expect(settle(save)).toBe(3);
    expect(save.lostAt).toBeNull();
  });

  it('counts down two seconds before a battle starts by itself', () => {
    expect(COUNTDOWN).toEqual({ first: 2, changed: 2, next: 2 });
  });
});
