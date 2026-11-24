import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GROUNDS } from '../src/art/board';
import { DUNGEONS, RAIDS } from '../src/data/expeditions';
import { FIELDS, fieldName, fieldOfWorld } from '../src/data/fields';
import { LANDS } from '../src/data/lands';
import { STAGES, WORLDS } from '../src/data/stages';
import { UNITS, isFrontline, isStructure } from '../src/data/units';
import { addCard } from '../src/game/cards';
import { floorEnemies, floorInput, raidEnemies, raidInput, startRun, tierField, TIERS } from '../src/game/expeditions';
import {
  bestTeam, fieldAt, finishStage, stageEnemies, stageInput, startingSave, teamPlacements, teamTile, tidyTeam, toggleTeam,
} from '../src/game/rules';
import type { SaveData } from '../src/game/state';
import { Battle, runBattle } from '../src/sim/battle';
import { TILE } from '../src/sim/constants';
import { FIRST_FIELD, halfOf, isEnemyTile, isPlayerTile, rowsFromMiddle, seatTeam, shiftOf, standEnemy, writtenTile } from '../src/sim/field';
import { defaultFormation } from '../src/sim/setup';
import { dummy } from './helpers';

/** A save with the line cleared up to the stage at `index`, standing there, with a full team and structures. */
function at(index: number): SaveData {
  const save = startingSave(11);
  save.cleared = index;
  save.at = Math.min(index, STAGES.length - 1);
  for (const u of ['paladin', 'mage', 'cleric', 'berserker', 'knight', 'archer', 'watchtower', 'barracks', 'spiketrap']) addCard(save, u, 2);
  save.team = bestTeam(save);
  return save;
}

const [SMALL, MIDDLE, BIG] = FIELDS;

describe('fields', () => {
  it('there are three, each bigger than the last, and the first is the one everything is written on', () => {
    expect(FIELDS).toHaveLength(3);
    expect(SMALL).toEqual(FIRST_FIELD);
    for (let i = 1; i < FIELDS.length; i++) {
      expect(FIELDS[i].cols).toBeGreaterThan(FIELDS[i - 1].cols);
      expect(FIELDS[i].rows).toBeGreaterThan(FIELDS[i - 1].rows);
    }
    for (const f of FIELDS) {
      // Each side has half of it, and every field is as much wider than tall as the first: they are drawn in the same room.
      expect(f.cols % 2).toBe(0);
      expect(f.cols / f.rows).toBe(SMALL.cols / SMALL.rows);
    }
    expect(fieldName(MIDDLE)).toBe('10 by 5');
  });

  it('a stage is fought on its world\'s field: the first world on the first, the rest of the first lap on the second, every lap after on the third', () => {
    for (const s of STAGES) {
      const world = WORLDS.find((w) => s.index >= w.first && s.index <= w.last);
      expect(world).toBeDefined();
      expect(s.field).toBe(fieldOfWorld(world!.index, LANDS.length));
    }
    expect(STAGES[0].field).toBe(SMALL);
    expect(STAGES[WORLDS[0].last].field).toBe(SMALL);
    expect(STAGES[WORLDS[1].first].field).toBe(MIDDLE);
    expect(STAGES[WORLDS[LANDS.length - 1].last].field).toBe(MIDDLE);
    expect(STAGES[WORLDS[LANDS.length].first].field).toBe(BIG);
    expect(STAGES[STAGES.length - 1].field).toBe(BIG);
    // The field never shrinks as the line goes on.
    for (let i = 1; i < STAGES.length; i++) expect(STAGES[i].field.cols).toBeGreaterThanOrEqual(STAGES[i - 1].field.cols);
  });

  it('has a picture of its tiles in every kind of land', () => {
    for (const ground of GROUNDS) {
      for (const f of FIELDS) {
        const file = `public/assets/tiles/${ground}-${f.cols}x${f.rows}.svg`;
        expect(fs.existsSync(file), file).toBe(true);
        // As big on the screen as the first field's, whatever the field.
        const svg = fs.readFileSync(file, 'utf8');
        expect(svg).toContain(`width="${SMALL.cols * TILE}"`);
        expect(svg).toContain(`viewBox="0 0 ${f.cols * TILE} `);
      }
    }
  });
});

describe('standing on a field', () => {
  it('the first field lies at the middle of a bigger one, the front lines where they were', () => {
    expect(shiftOf(SMALL)).toEqual({ col: 0, row: 0 });
    expect(shiftOf(MIDDLE)).toEqual({ col: 1, row: 0 });
    expect(shiftOf(BIG)).toEqual({ col: 2, row: 1 });
    for (const f of FIELDS) {
      // The player's front column and the enemy's, written 3 and 4, are the two at the middle.
      expect(3 + shiftOf(f).col).toBe(halfOf(f) - 1);
      expect(standEnemy(f, 4, 0)[0]).toBe(halfOf(f));
      expect(writtenTile(f, halfOf(f) - 1, shiftOf(f).row)).toEqual([3, 0]);
    }
    expect(rowsFromMiddle(4)).toEqual([1, 2, 0, 3]);
    expect(rowsFromMiddle(5)).toEqual([2, 3, 1, 4, 0]);
    expect(rowsFromMiddle(6)).toEqual([2, 3, 1, 4, 0, 5]);
  });

  it('an enemy keeps its depth behind its front line, and the four written rows are spread over the field\'s height', () => {
    for (const f of FIELDS) {
      const rows = [0, 1, 2, 3].map((r) => standEnemy(f, 5, r)[1]);
      expect(rows[0]).toBe(0);
      expect(rows[3]).toBe(f.rows - 1);
      expect(new Set(rows).size).toBe(4);
      // The same about the middle, upside down.
      expect(rows.map((r) => f.rows - 1 - r).reverse()).toEqual(rows);
      for (let col = 4; col < 8; col++) for (let row = 0; row < 4; row++) expect(isEnemyTile(...standEnemy(f, col, row), f)).toBe(true);
    }
    expect([0, 1, 2, 3].map((r) => standEnemy(SMALL, 6, r))).toEqual([[6, 0], [6, 1], [6, 2], [6, 3]]);
    expect(standEnemy(BIG, 7, 2)).toEqual([9, 3]);
  });

  it('a team keeps its tiles on a field that has them, and whoever was set out beyond it goes to the nearest free tile', () => {
    const team = [{ col: 3, row: 1 }, { col: 3, row: 2 }, { col: 0, row: 0 }, { col: 1, row: 3 }];
    // On the first field, as written. On a bigger one, the same shape at the middle.
    expect(seatTeam(team, SMALL)).toEqual([[3, 1], [3, 2], [0, 0], [1, 3]]);
    expect(seatTeam(team, MIDDLE)).toEqual([[4, 1], [4, 2], [1, 0], [2, 3]]);
    expect(seatTeam(team, BIG)).toEqual([[5, 2], [5, 3], [2, 1], [3, 4]]);
    // Set out on the biggest field, some of them where the first has no tile.
    const wide = [{ col: 3, row: -1 }, { col: 3, row: 4 }, { col: -2, row: 2 }, { col: 3, row: 0 }, { col: 0, row: 2 }];
    expect(seatTeam(wide, BIG)).toEqual([[5, 0], [5, 5], [0, 3], [5, 1], [2, 3]]);
    for (const f of FIELDS) {
      const seats = seatTeam(wide, f);
      expect(new Set(seats.map((s) => s.join())).size).toBe(wide.length);
      for (const [col, row] of seats) expect(isPlayerTile(col, row, f), `${col},${row} on ${fieldName(f)}`).toBe(true);
    }
    // On the first field the two who had tiles keep them, and the others stand as near as they can to where they were.
    const small = seatTeam(wide, SMALL);
    expect(small[3]).toEqual([3, 0]);
    expect(small[4]).toEqual([0, 2]);
    expect(small[0]).toEqual([2, 0]);
    expect(small[1]).toEqual([3, 3]);
    expect(small[2]).toEqual([0, 1]);
    // Two written on one tile do not stand on one.
    expect(new Set(seatTeam([{ col: 3, row: 1 }, { col: 3, row: 1 }], SMALL).map((s) => s.join())).size).toBe(2);
    // A team can be as many as its half has tiles, and no more.
    const crowd = Array.from({ length: 17 }, () => ({ col: 0, row: 0 }));
    expect(() => seatTeam(crowd, SMALL)).toThrow();
    expect(seatTeam(crowd.slice(0, 16), SMALL)).toHaveLength(16);
  });

  it('a team that has not been arranged forms up from the middle of its field, fighters forward', () => {
    const units = ['knight', 'paladin', 'militia', 'berserker', 'knight', 'archer', 'mage', 'cleric'];
    for (const f of FIELDS) {
      const tiles = defaultFormation(units, isFrontline, f);
      const seats = seatTeam(tiles, f);
      // Everyone stands where they were written: the formation is made for this field.
      seats.forEach(([col, row], i) => expect(writtenTile(f, col, row)).toEqual([tiles[i].col, tiles[i].row]));
      // The first fighter stands on the front line, in a middle row.
      expect(seats[0][0]).toBe(halfOf(f) - 1);
      expect(Math.abs(seats[0][1] - (f.rows - 1) / 2)).toBeLessThanOrEqual(0.5);
      // Fighters in front of the rest.
      const front = Math.min(...seats.filter((_, i) => isFrontline(units[i])).map((s) => s[0]));
      const back = Math.max(...seats.filter((_, i) => !isFrontline(units[i])).map((s) => s[0]));
      expect(front).toBeGreaterThan(back);
    }
    // On the first field it is what it always was.
    expect(defaultFormation(['knight', 'archer', 'militia'], isFrontline)).toEqual([
      { unit: 'knight', col: 3, row: 1 }, { unit: 'archer', col: 1, row: 1 }, { unit: 'militia', col: 3, row: 2 },
    ]);
  });
});

describe('a battle on a bigger field', () => {
  const defs = { dummy: dummy() };

  it('is fought on all of it: units stand on its far tiles and no one leaves it', () => {
    const b = new Battle({ seed: 3, defs, field: BIG, teams: [[{ unit: 'dummy', col: 0, row: 5 }], [{ unit: 'dummy', col: 11, row: 0 }]] });
    expect(b.field).toBe(BIG);
    expect([b.units[0].x, b.units[0].y]).toEqual([0.5 * TILE, 5.5 * TILE]);
    expect([b.units[1].x, b.units[1].y]).toEqual([11.5 * TILE, 0.5 * TILE]);
    while (!b.ended) {
      b.step();
      for (const u of b.units) {
        expect(u.x).toBeGreaterThanOrEqual(0);
        expect(u.x).toBeLessThanOrEqual(BIG.cols * TILE);
        expect(u.y).toBeGreaterThanOrEqual(0);
        expect(u.y).toBeLessThanOrEqual(BIG.rows * TILE);
      }
    }
    // They met: it did not run to the clock with the two of them a field apart.
    expect(b.time).toBeLessThan(60);
  });

  it('is the same battle every time, and with no field given it is the first field\'s, as it always was', () => {
    const input = { seed: 9, defs, field: MIDDLE, teams: [[{ unit: 'dummy', col: 4, row: 2 }], [{ unit: 'dummy', col: 9, row: 4 }]] } as const;
    expect(runBattle(input)).toEqual(runBattle(input));
    const plain = { seed: 9, defs, teams: [[{ unit: 'dummy', col: 3, row: 1 }], [{ unit: 'dummy', col: 4, row: 2 }]] } as const;
    expect(runBattle(plain)).toEqual(runBattle({ ...plain, field: FIRST_FIELD }));
    expect(new Battle(plain).field).toBe(FIRST_FIELD);
  });
});

describe('the rules on a field', () => {
  it('every stage stands its enemies on its own field\'s enemy tiles, each on a tile of its own', () => {
    for (const s of STAGES) {
      const foes = stageEnemies(s.index);
      expect(new Set(foes.map((p) => `${p.col},${p.row}`)).size, `stage ${s.index + 1}`).toBe(foes.length);
      for (const p of foes) expect(isEnemyTile(p.col, p.row, s.field), `stage ${s.index + 1}: ${p.unit}@${p.col},${p.row}`).toBe(true);
      // Its written troops stand as far behind their front line as they were written.
      s.def.enemies.forEach((e, i) => expect(foes[i].col - halfOf(s.field), `stage ${s.index + 1}`).toBe(e.col - 4));
    }
  });

  it('a stage\'s battle is fought on its field, with the team seated on it', () => {
    for (const index of [0, WORLDS[1].first + 3, WORLDS[LANDS.length].first + 2, STAGES.length - 1]) {
      const save = at(index);
      const input = stageInput(save, index);
      const field = STAGES[index].field;
      expect(input.field).toBe(field);
      expect(fieldAt(save)).toBe(field);
      expect(input.teams[0]).toHaveLength(save.team.length);
      expect(new Set(input.teams[0].map((p) => `${p.col},${p.row}`)).size).toBe(save.team.length);
      for (const p of input.teams[0]) expect(isPlayerTile(p.col, p.row, field)).toBe(true);
      // Seated as the board will show them.
      expect(input.teams[0].map((p) => [p.col, p.row])).toEqual(seatTeam(save.team, field));
      expect(teamPlacements(save, field)).toEqual(input.teams[0]);
      // And it can be fought to an end.
      expect(runBattle(input).ticks).toBeGreaterThan(0);
    }
  });

  it('a team set out on the big field still fights on the first, everyone on a tile of their own', () => {
    const save = at(STAGES.length - 1);
    expect(fieldAt(save)).toBe(BIG);
    // Spread them over the big field's edges.
    save.team.forEach((p, i) => {
      p.col = 3 - (i % 6);
      p.row = i < 6 ? -1 : 4;
    });
    for (const p of save.team) expect(teamTile(p.col, p.row)).toBe(true);
    tidyTeam(save);
    expect(save.team.every((p, i) => p.col === 3 - (i % 6))).toBe(true);
    const small = teamPlacements(save, SMALL);
    expect(small).toHaveLength(save.team.length);
    expect(new Set(small.map((p) => `${p.col},${p.row}`)).size).toBe(small.length);
    for (const p of small) expect(isPlayerTile(p.col, p.row, SMALL)).toBe(true);
    // A tile no field has is put right.
    save.team[0].col = -5;
    save.team[1].row = 9;
    tidyTeam(save);
    for (const p of save.team) expect(teamTile(p.col, p.row)).toBe(true);
    expect(teamTile(4, 0)).toBe(false);
    expect(teamTile(-3, 0)).toBe(false);
    expect(teamTile(0, 5)).toBe(false);
  });

  it('the team forms up again the first time the line comes to a bigger field, and not otherwise', () => {
    // The Warlord falls: the second world's field is bigger.
    const last = WORLDS[0].last;
    const save = at(last);
    expect(fieldAt(save)).toBe(SMALL);
    const before = save.team.map((p) => p.card).sort();
    const r = finishStage(save, last, true);
    expect(r.reached).toBe(1);
    expect(r.field).toBe(MIDDLE);
    // The same cards, set out for the new field: someone stands in its new row, and the front line is centred.
    expect(save.team.map((p) => p.card).sort()).toEqual(before);
    const seats = seatTeam(save.team, MIDDLE);
    seats.forEach(([col, row], i) => expect(writtenTile(MIDDLE, col, row)).toEqual([save.team[i].col, save.team[i].row]));
    expect(seats.some(([col, row]) => col === halfOf(MIDDLE) - 1 && row === 2)).toBe(true);
    // The second world to the third: the same field, and the team is left as the player set it out.
    const same = at(WORLDS[1].last);
    same.team.forEach((p, i) => {
      p.col = i % 4;
      p.row = Math.floor(i / 4);
    });
    const kept = same.team.map((p) => `${p.card}@${p.col},${p.row}`);
    const r2 = finishStage(same, WORLDS[1].last, true);
    expect(r2.reached).toBe(2);
    expect(r2.field).toBeNull();
    expect(same.team.map((p) => `${p.card}@${p.col},${p.row}`)).toEqual(kept);
    // A stage won again changes nothing, and neither does a loss.
    const again = at(last + 5);
    const was = again.team.map((p) => `${p.col},${p.row}`);
    expect(finishStage(again, last, true).field).toBeNull();
    expect(finishStage(again, last, false).field).toBeNull();
    expect(again.team.map((p) => `${p.col},${p.row}`)).toEqual(was);
  });

  it('a card put in the team takes a middle row of the field the player is at', () => {
    const save = startingSave(4);
    save.cleared = WORLDS[LANDS.length].first;
    save.at = save.cleared;
    save.team = [];
    const knight = save.cards.find((c) => c.unit === 'knight')!;
    expect(toggleTeam(save, knight.id)).toBe(true);
    const [col, row] = seatTeam(save.team, BIG)[0];
    expect(col).toBe(halfOf(BIG) - 1);
    expect([2, 3]).toContain(row);
  });

  it('dungeons and raids are fought on the field of the stage their tier is measured by', () => {
    for (const d of DUNGEONS) {
      for (let tier = 0; tier < TIERS; tier++) {
        const field = tierField(d.land, tier);
        expect(FIELDS).toContain(field);
        d.floors.forEach((_, floor) => {
          const foes = floorEnemies(d, tier, floor);
          expect(new Set(foes.map((p) => `${p.col},${p.row}`)).size).toBe(foes.length);
          for (const p of foes) expect(isEnemyTile(p.col, p.row, field), `${d.id} ${tier} ${floor}`).toBe(true);
        });
      }
    }
    for (const raid of RAIDS) {
      for (let tier = 0; tier < TIERS; tier++) {
        const field = tierField(raid.land, tier);
        const foes = raidEnemies(raid, tier);
        expect(new Set(foes.map((p) => `${p.col},${p.row}`)).size).toBe(foes.length);
        for (const p of foes) expect(isEnemyTile(p.col, p.row, field), `${raid.id} ${tier}`).toBe(true);
        const save = at(STAGES.length - 1);
        const input = raidInput(save, raid, tier);
        expect(input.field).toBe(field);
        for (const p of input.teams[0]) expect(isPlayerTile(p.col, p.row, field)).toBe(true);
      }
    }
    // A later tier is on a bigger field than the first.
    expect(tierField(0, 0)).toBe(SMALL);
    expect(tierField(0, 1)).toBe(BIG);
    const save = at(STAGES.length - 1);
    save.dungeons = {};
    const run = startRun(save, DUNGEONS[0], 0);
    if (!run) throw new Error('no run');
    const input = floorInput(save, run, DUNGEONS[0]);
    expect(input.field).toBe(SMALL);
    // Eleven of them, set out for the big field, on the first field's sixteen tiles.
    expect(input.teams[0].length).toBe(save.team.length);
    expect(new Set(input.teams[0].map((p) => `${p.col},${p.row}`)).size).toBe(input.teams[0].length);
    for (const p of input.teams[0]) expect(isPlayerTile(p.col, p.row, SMALL)).toBe(true);
    expect(input.teams[0].some((p) => isStructure(p.unit))).toBe(true);
    expect(UNITS[input.teams[0][0].unit]).toBeDefined();
  });
});
