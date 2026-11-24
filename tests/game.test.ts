import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../src/data/difficulties';
import { PACKS, allPacks, packAt, packById } from '../src/data/packs';
import { SETS, UNITS } from '../src/data/units';
import { WORLDS, stageCoins } from '../src/data/worlds';
import { COUNTDOWN, afterBattle, goTo, sameWhere, settle, teamChanged, whereOpen } from '../src/game/campaign';
import { GRADES, MAX_LEVEL, RARITIES, cardMult, gradeMult, xpToNext } from '../src/game/rarity';
import { COPY_XP, OTHER_UNIT, addCard, cardOf, cardsOf, combine, combinePreview, spare, whyNot, worth, xpHeld } from '../src/game/cards';
import {
  BASE_TEAM, MAX_TEAM, addXp, bestTeam, buyPack, clearedIn, difficultyOpen, finishStage, frontier, inPool, inTeam, isEnemyTile, known,
  openPack, packOpen, packPool, packsHeld, rollPack, stageEnemies, stageInput, stageOpen, stagePay, stageStanding, stageXp,
  startingSave, teamSize, tidyTeam, toggleTeam, topDifficulty, worldDone, worldOpen, type StageResult,
} from '../src/game/rules';
import { repair, type SaveData } from '../src/game/state';
import { runBattle } from '../src/sim/battle';
import { Rng } from '../src/sim/rng';

/** A save with a world's stages cleared up to (not including) `stage`. */
function at(world: number, stage: number): SaveData {
  const save = startingSave(7);
  for (let w = 0; w < world; w++) save.cleared[WORLDS[w].id] = [WORLDS[w].stages.length];
  save.cleared[WORLDS[world].id] = [stage];
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
    expect(save.cards).toHaveLength(3);
    expect(new Set(save.cards.map((c) => c.id)).size).toBe(3);
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
    expect(buyPack(save, 'thornwood')).toBe(false);
    expect(buyPack(save, 'recruit')).toBe(true);
    expect(save.coins).toBe(40);
    expect(save.packs.recruit).toBe(3);
    expect(buyPack(save, 'recruit')).toBe(false);
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
    const input = stageInput(save, WORLDS[0], 0);
    const knight = input.teams[0].find((p) => p.unit === 'knight');
    expect(knight?.hpMult).toBeCloseTo(cardMult(3, 5), 6);
    const foes = stageEnemies(WORLDS[0], 4);
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
    const knights = stageInput(save, WORLDS[0], 0).teams[0].filter((p) => p.unit === 'knight');
    expect(knights.map((p) => p.hpMult).sort()).toEqual([cardMult(first.grade, first.level), cardMult(4, 7)].sort());
    expect(runBattle(stageInput(save, WORLDS[0], 0), false).winner).toBe(0);
    // Only the cards that fought are taught by it.
    const spare = addCard(save, 'knight', 0);
    finishStage(save, 0, 0, true);
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

  it('FILL TEAM fields copies of a unit when they are the strongest held', () => {
    const save = startingSave(1);
    const strong = [0, 1, 2].map(() => Object.assign(addCard(save, 'mage', 5), { level: 12 }).id);
    const team = bestTeam(save);
    expect(team.filter((p) => p.unit === 'mage').map((p) => p.card).sort()).toEqual(strong.sort());
    expect(new Set(team.map((p) => `${p.col},${p.row}`)).size).toBe(team.length);
    expect(new Set(team.map((p) => p.card)).size).toBe(team.length);
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

describe('difficulties', () => {
  /** A save with a world finished on every difficulty below `d`. */
  function upTo(world: number, d: number): SaveData {
    const save = at(world, 0);
    save.cleared[WORLDS[world].id] = Array.from({ length: d }, () => WORLDS[world].stages.length);
    return save;
  }

  it('there are five, each asking more than the one before and paying more', () => {
    expect(DIFFICULTIES).toHaveLength(5);
    expect(DIFFICULTIES[0]).toMatchObject({ extra: 0, coins: 1, packCost: 1 });
    for (let d = 1; d < DIFFICULTIES.length; d++) {
      for (const w of WORLDS) {
        for (let i = 0; i < w.stages.length; i++) {
          const a = stageStanding(w, i, d - 1);
          const b = stageStanding(w, i, d);
          expect(cardMult(b.grade, b.level), `${w.name} ${i + 1} at ${d}`).toBeGreaterThan(cardMult(a.grade, a.level));
        }
      }
      expect(DIFFICULTIES[d].coins).toBeGreaterThan(DIFFICULTIES[d - 1].coins);
      expect(DIFFICULTIES[d].packCost).toBeGreaterThan(DIFFICULTIES[d - 1].packCost);
      expect(DIFFICULTIES[d].extra).toBeGreaterThanOrEqual(DIFFICULTIES[d - 1].extra);
    }
  });

  it("each is opened by the world's boss at the one before, in that world only", () => {
    const fresh = startingSave(1);
    expect(difficultyOpen(fresh, 0, 0)).toBe(true);
    expect(difficultyOpen(fresh, 0, 1)).toBe(false);
    expect(topDifficulty(fresh, 0)).toBe(0);
    expect(topDifficulty(fresh, 1)).toBe(-1);

    const save = at(0, WORLDS[0].stages.length - 1);
    const r = finishStage(save, 0, WORLDS[0].stages.length - 1, true);
    expect(r.harder).toBe(1);
    expect(difficultyOpen(save, 0, 1)).toBe(true);
    expect(difficultyOpen(save, 0, 2)).toBe(false);
    // The next world is open on Easy, and only on Easy.
    expect(difficultyOpen(save, 1, 0)).toBe(true);
    expect(difficultyOpen(save, 1, 1)).toBe(false);
    expect(stageOpen(save, 0, 0, 1)).toBe(true);
    expect(stageOpen(save, 0, 1, 1)).toBe(false);
  });

  it('progress is kept apart for each, and Easy alone opens worlds, team places and packs', () => {
    const save = upTo(0, 1);
    const size = teamSize(save);
    const r = finishStage(save, 0, 0, true, 1);
    expect(r.first).toBe(true);
    expect(clearedIn(save, 'thornwood', 1)).toBe(1);
    expect(clearedIn(save, 'thornwood', 0)).toBe(WORLDS[0].stages.length);
    expect(r.opened).toBeNull();
    expect(r.moreTeam).toBe(0);
    expect(teamSize(save)).toBe(size);
    // Finishing a world on Normal opens Hard there, and no world.
    const last = WORLDS[0].stages.length - 1;
    const hard = upTo(0, 1);
    hard.cleared.thornwood[1] = last;
    const end = finishStage(hard, 0, last, true, 1);
    expect(end.harder).toBe(2);
    expect(end.opened).toBeNull();
    expect(worldDone(hard, 'thornwood', 1)).toBe(true);
    // The last difficulty opens nothing harder.
    const top = upTo(0, 4);
    top.cleared.thornwood[4] = last;
    expect(finishStage(top, 0, last, true, 4).harder).toBe(-1);
  });

  it('enemies stand at a better grade and level, and from Hard there are more of them', () => {
    const world = WORLDS[0];
    const stage = world.stages[3];
    const easy = stageEnemies(world, 3, 0);
    expect(stageStanding(world, 3, 0)).toEqual({ grade: stage.grade, level: stage.level });
    for (let d = 1; d < DIFFICULTIES.length; d++) {
      const foes = stageEnemies(world, 3, d);
      expect(foes.length).toBe(stage.enemies.length + DIFFICULTIES[d].extra);
      expect(foes[0].hpMult ?? 0).toBeGreaterThan(stageEnemies(world, 3, d - 1)[0].hpMult ?? 0);
      const tiles = foes.map((p) => `${p.col},${p.row}`);
      expect(new Set(tiles).size).toBe(tiles.length);
      for (const p of foes) expect(isEnemyTile(p.col, p.row)).toBe(true);
      // Whoever joins is one of the stage's own.
      for (const p of foes.slice(easy.length)) expect(stage.enemies.some((e) => e.unit === p.unit && e.rank === 'troop')).toBe(true);
    }
  });

  it("on Nightmare every enemy is the best grade, and a world's last stage is at the level the world names", () => {
    for (const w of WORLDS) {
      const last = w.stages.length - 1;
      for (let i = 0; i <= last; i++) expect(stageStanding(w, i, 4).grade).toBe(6);
      expect(stageStanding(w, last, 4).level).toBe(w.nightmare);
      expect(w.nightmare).toBeGreaterThan(w.stages[last].level);
      for (let i = 0; i <= last; i++) for (let d = 0; d < 5; d++) expect(stageStanding(w, i, d).grade).toBeLessThanOrEqual(6);
    }
  });

  it('a gentle world climbs steeply: Thornwood on Hard is a match for the dunes on Easy', () => {
    const strength = (w: number, d: number): number => {
      const at = stageStanding(WORLDS[w], WORLDS[w].stages.length - 1, d);
      return cardMult(at.grade, at.level);
    };
    expect(strength(0, 2)).toBeGreaterThan(strength(1, 0));
    expect(strength(0, 3)).toBeGreaterThan(strength(2, 0) * 0.9);
  });

  it('a harder win pays more coins and experience, and drops that difficulty\'s pack', () => {
    expect(stagePay(WORLDS[0], 4, true, 2)).toBeGreaterThan(stagePay(WORLDS[0], 4, true, 1));
    expect(stagePay(WORLDS[0], 4, false, 2)).toBe(Math.round(stagePay(WORLDS[0], 4, true, 2) / 2));
    expect(stageXp(WORLDS[0], 4, true, 2)).toBeGreaterThan(stageXp(WORLDS[0], 4, true, 0));
    const save = upTo(0, 2);
    save.cleared.thornwood[2] = 4;
    const r = finishStage(save, 0, 4, true, 2);
    expect(r.packs.length).toBeGreaterThan(0);
    expect(new Set(r.packs)).toEqual(new Set(['thornwood@2']));
    expect(save.packs['thornwood@2']).toBe(r.packs.length);
    expect(packsHeld(save)).toBe((save.packs.recruit ?? 0) + r.packs.length);
  });

  it("a world's harder packs hold the same cards at better grades, for more, and are sold once that difficulty is open", () => {
    for (const base of PACKS.filter((p) => p.world)) {
      for (let d = 1; d < DIFFICULTIES.length; d++) {
        const p = packById(`${base.id}@${d}`);
        expect(p).toEqual(packAt(base, d));
        expect(p.set).toBe(base.set);
        expect(p.cost).toBeGreaterThan(packAt(base, d - 1).cost);
        expect(p.gradeMax).toBeGreaterThanOrEqual(packAt(base, d - 1).gradeMax);
        expect(p.gradeMin).toBeGreaterThanOrEqual(packAt(base, d - 1).gradeMin);
        expect(p.gradeMin).toBeLessThanOrEqual(p.gradeMax);
        expect(p.gradeMax).toBeLessThanOrEqual(6);
      }
      // On Nightmare, the best two grades.
      expect([packAt(base, 4).gradeMin, packAt(base, 4).gradeMax]).toEqual([5, 6]);
    }
    expect(() => packById('recruit@1')).toThrow();
    expect(() => packById('thornwood@9')).toThrow();
    expect(allPacks()).toHaveLength(PACKS.length + 3 * 4);

    const save = upTo(0, 1);
    expect(packOpen(save, packById('thornwood@1'))).toBe(true);
    expect(packOpen(save, packById('thornwood@2'))).toBe(false);
    save.coins = 100000;
    expect(buyPack(save, 'thornwood@1')).toBe(true);
    expect(buyPack(save, 'thornwood@2')).toBe(false);
    const pull = openPack(save, 'thornwood@1');
    expect(pull).not.toBeNull();
    expect(pull?.grade).toBeGreaterThanOrEqual(packById('thornwood@1').gradeMin);
  });

  it('every stage of every difficulty can be fielded and fought to an end', () => {
    const save = startingSave(3);
    for (const id of ['paladin', 'berserker', 'mage', 'cleric']) Object.assign(addCard(save, id, 6), { level: 20 });
    save.team = bestTeam(save);
    for (let w = 0; w < WORLDS.length; w++) {
      for (const stage of [0, WORLDS[w].stages.length - 1]) {
        for (let d = 0; d < DIFFICULTIES.length; d++) {
          const r = runBattle(stageInput(save, WORLDS[w], stage, d), false);
          expect([-1, 0, 1]).toContain(r.winner);
        }
      }
    }
  });
});

describe('the save', () => {
  it('survives a trip through JSON', () => {
    const save = at(1, 4);
    save.coins = 321;
    save.packs.dunes = 2;
    save.packs['thornwood@1'] = 1;
    save.cleared.thornwood.push(3);
    save.tutorial = { done: true, seen: ['team'] };
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
      version: 3, coins: -5,
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
    expect(mended.tutorial).toEqual({ done: false, seen: [] });
  });

  it('a save from before difficulties is carried over, with its progress as Easy and no tutorial', () => {
    const old = {
      version: 1, coins: 120, cards: { knight: { grade: 1, level: 3, xp: 4 } }, team: [{ unit: 'knight', col: 3, row: 1 }],
      cleared: { thornwood: 10, sunscar: 4 }, packs: { recruit: 2 }, rng: 7, stats: { battles: 30, wins: 20, opened: 9 }, speed: 2, sound: false,
    };
    const now = repair(old, 1);
    expect(now.version).toBe(3);
    // One card to a unit then: each is a card with a number now, and the team names it.
    expect(now.cards).toEqual([{ id: 1, unit: 'knight', grade: 1, level: 3, xp: 4 }]);
    expect(now.team).toEqual([{ card: 1, unit: 'knight', col: 3, row: 1 }]);
    expect(now.nextCard).toBe(2);
    expect(now.cleared).toEqual({ thornwood: [10], sunscar: [4] });
    expect(clearedIn(now, 'thornwood')).toBe(10);
    expect(difficultyOpen(now, 0, 1)).toBe(true);
    expect(now.coins).toBe(120);
    expect(now.sound).toBe(false);
    expect(now.tutorial.done).toBe(true);
  });

  it('a save from before copies were cards is carried over, each unit as one card', () => {
    const old = {
      version: 2, coins: 9, cards: { knight: { grade: 2, level: 4, xp: 1 }, mage: { grade: 0, level: 1, xp: 0 } },
      team: [{ unit: 'mage', col: 0, row: 1 }, { unit: 'knight', col: 3, row: 1 }, { unit: 'nobody', col: 1, row: 1 }],
      cleared: { thornwood: [3] }, tutorial: { done: true, seen: [] },
    };
    const now = repair(old, 1);
    expect(now.cards).toEqual([{ id: 1, unit: 'knight', grade: 2, level: 4, xp: 1 }, { id: 2, unit: 'mage', grade: 0, level: 1, xp: 0 }]);
    expect(now.team).toEqual([{ card: 2, unit: 'mage', col: 0, row: 1 }, { card: 1, unit: 'knight', col: 3, row: 1 }]);
    expect(now.nextCard).toBe(3);
    // And the next pull of a Knight is a second Knight, not a change to the first.
    now.packs.recruit = 40;
    while (cardsOf(now, 'knight').length < 2 && openPack(now, 'recruit'));
    expect(cardsOf(now, 'knight')).toHaveLength(2);
    expect(cardOf(now, 1)).toMatchObject({ grade: 2, level: 4, xp: 1 });
  });
});

describe('the run of battles', () => {
  const result = (won: boolean, first: boolean): StageResult => ({
    won, first, coins: 0, xp: 0, levelUps: [], packs: [], unlocked: [], moreTeam: 0, opened: null, harder: -1,
  });

  it('a first win goes on to the next stage, and after a boss on Easy to the next world', () => {
    const save = startingSave(1);
    expect(settle(save)).toEqual({ world: 0, stage: 0, d: 0 });
    const r = finishStage(save, 0, 0, true);
    expect(afterBattle(save, { world: 0, stage: 0, d: 0 }, r)).toEqual({ world: 0, stage: 1, d: 0 });
    const last = WORLDS[0].stages.length - 1;
    const boss = at(0, last);
    const won = finishStage(boss, 0, last, true);
    expect(afterBattle(boss, { world: 0, stage: last, d: 0 }, won)).toEqual({ world: 1, stage: 0, d: 0 });
    expect(whereOpen(boss, boss.at)).toBe(true);
  });

  it('a win again stays, so that a team left alone earns from a stage it can beat', () => {
    const save = at(0, 3);
    expect(afterBattle(save, { world: 0, stage: 1, d: 0 }, result(true, false))).toEqual({ world: 0, stage: 1, d: 0 });
  });

  it('on a harder difficulty it stays on the boss after beating it, and on the last world too', () => {
    const save = at(2, WORLDS[2].stages.length);
    save.cleared.thornwood = [10, 9];
    expect(afterBattle(save, { world: 0, stage: 9, d: 1 }, result(true, true))).toEqual({ world: 0, stage: 9, d: 1 });
    const end = WORLDS[2].stages.length - 1;
    expect(afterBattle(save, { world: 2, stage: end, d: 0 }, result(true, true))).toEqual({ world: 2, stage: end, d: 0 });
  });

  it('a loss steps back one stage, never to another world, and remembers where it lost', () => {
    const save = at(1, 3);
    expect(afterBattle(save, { world: 1, stage: 3, d: 0 }, result(false, false))).toEqual({ world: 1, stage: 2, d: 0 });
    expect(save.lostAt).toEqual({ world: 1, stage: 3, d: 0 });
    // Lost again one back: it steps back again, and still means to return to the furthest.
    expect(afterBattle(save, { world: 1, stage: 2, d: 0 }, result(false, false))).toEqual({ world: 1, stage: 1, d: 0 });
    expect(save.lostAt).toEqual({ world: 1, stage: 3, d: 0 });
    const first = at(1, 0);
    expect(afterBattle(first, { world: 1, stage: 0, d: 0 }, result(false, false))).toEqual({ world: 1, stage: 0, d: 0 });
    expect(first.lostAt).toBeNull();
  });

  it('a changed team goes back to the stage it lost at, once', () => {
    const save = at(1, 3);
    afterBattle(save, { world: 1, stage: 3, d: 0 }, result(false, false));
    expect(teamChanged(save)).toBe(true);
    expect(save.at).toEqual({ world: 1, stage: 3, d: 0 });
    expect(teamChanged(save)).toBe(false);
  });

  it('only an open stage can be gone to, and a save that points at a shut one is put right', () => {
    const save = at(0, 3);
    expect(goTo(save, { world: 0, stage: 3, d: 0 })).toBe(true);
    expect(goTo(save, { world: 0, stage: 4, d: 0 })).toBe(false);
    expect(goTo(save, { world: 1, stage: 0, d: 0 })).toBe(false);
    expect(goTo(save, { world: 0, stage: 0, d: 1 })).toBe(false);
    expect(save.at).toEqual({ world: 0, stage: 3, d: 0 });
    save.at = { world: 2, stage: 9, d: 3 };
    expect(settle(save)).toEqual({ world: 0, stage: 3, d: 0 });
    expect(sameWhere(save.at, { world: 0, stage: 3, d: 0 })).toBe(true);
  });

  it('counts down two seconds before a battle starts by itself', () => {
    expect(COUNTDOWN).toEqual({ first: 2, changed: 2, next: 2 });
  });
});
