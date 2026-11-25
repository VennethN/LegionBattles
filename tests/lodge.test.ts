import { describe, expect, it } from 'vitest';
import { BUILDINGS, HUNTERS, MONSTERS, REINFORCEMENTS, TO_COME } from '../src/game/content';
import { Hunt } from '../src/game/hunt';
import {
  FIRST_MUSTER, SUPPLY, buy, canHunt, changeBuilding, chargesOf, contracts, costOf, freshSave, isOpen, nextContract, opensBy, payFor, repair, setHunter, setupOf, supplyOf,
  toggleReinforcement, wares, wear,
} from '../src/game/lodge';

const tally = { time: 100, dealt: {}, taken: {}, killedBy: null, breaks: 0 };

describe('a new lodge', () => {
  it('has a hunter, something for the horn and something to build, and a first muster that fits its supply', () => {
    const s = freshSave();
    expect(isOpen(s, 'marta')).toBe(true);
    expect(isOpen(s, 'jory')).toBe(false);
    expect(costOf(s.muster)).toBeLessThanOrEqual(supplyOf(s));
    expect(s.muster.reinforcements.length).toBeGreaterThan(0);
    expect(Object.keys(s.muster.buildings).length).toBeGreaterThan(0);
    expect(costOf(FIRST_MUSTER)).toBeLessThanOrEqual(SUPPLY.base);
  });

  it('posts the first monster only, and holds the rest out as shapes with what must fall first', () => {
    const board = contracts(freshSave());
    expect(board).toHaveLength(MONSTERS.length + TO_COME.length);
    expect(board[0].posted).toBe(true);
    expect(board[0].upTo).toBe(1);
    expect(board.slice(1).every((c) => !c.posted && c.needs.startsWith('Beat '))).toBe(true);
    expect(board.filter((c) => c.monster === null)).toHaveLength(TO_COME.length);
    expect(nextContract(freshSave())).toEqual({ monster: 'sexton', mark: 1 });
  });
});

describe('the muster', () => {
  it('takes what the supply allows and says why not otherwise', () => {
    const s = freshSave();
    expect(toggleReinforcement(s, 'crossbowmen')).toBe('Not enough Supply');
    expect(changeBuilding(s, 'barricade', 1)).toBe('');
    expect(costOf(s.muster)).toBe(6);
    expect(changeBuilding(s, 'barricade', 1)).toBe('Not enough Supply');
    expect(changeBuilding(s, 'watchfire', -1)).toBe('');
    expect(toggleReinforcement(s, 'crossbowmen')).toBe('');
    expect(s.muster.reinforcements).toEqual(['pikemen', 'crossbowmen']);
    expect(toggleReinforcement(s, 'pikemen')).toBe('');
    expect(s.muster.reinforcements).toEqual(['crossbowmen']);
  });

  it('does not take what is not opened, and says what opens it', () => {
    const s = freshSave();
    expect(setHunter(s, 'jory')).toBe('Locked: Beat The Gravedigger');
    expect(toggleReinforcement(s, 'sappers')).toBe('Locked: Beat The Gravedigger');
    expect(changeBuilding(s, 'ballista', 1)).toBe('Locked: Beat The Antlered King');
    expect(s.muster.hunter).toBe('marta');
    for (const t of [...HUNTERS, ...REINFORCEMENTS, ...BUILDINGS]) if (t.opens) expect(opensBy(t.id)).toMatch(/^Beat /);
  });

  it('makes the hunt it describes', () => {
    const s = freshSave();
    s.steps.push('more:pikemen', 'sturdy:barricade');
    const h = new Hunt(setupOf(s, 'sexton', 1, 5, false));
    expect(h.hunter.def.id).toBe('marta');
    expect(h.calls.map((c) => [c.def.id, c.left])).toEqual([['pikemen', 2]]);
    expect(h.toPlace).toEqual({ barricade: 1, watchfire: 1 });
    expect(chargesOf(s, 'pikemen')).toBe(2);
    h.step({ x: 0, y: 0, place: 'barricade' });
    expect(h.buildings[0].maxHp).toBe(135);
  });
});

describe('what a hunt pays', () => {
  it('the first fall pays twice, gives the trophy, opens what it opens and posts the next contract', () => {
    const s = freshSave();
    const pay = payFor(s, 'sexton', 1, true, tally, 2);
    expect(pay).toMatchObject({ won: true, coin: 80, first: true, trophy: 'spade', posted: ['The Antlered King'] });
    expect(pay.opened.sort()).toEqual(['Bell', 'Bombers', 'Jory Pell']);
    expect(s.coin).toBe(80);
    expect(isOpen(s, 'jory')).toBe(true);
    expect(canHunt(s, 'king', 1)).toBe(true);
    expect(canHunt(s, 'sexton', 2)).toBe(true);
    expect(canHunt(s, 'sexton', 3)).toBe(false);
    const again = payFor(s, 'sexton', 1, true, tally, 2);
    expect(again).toMatchObject({ coin: 40, first: false, trophy: null, opened: [], posted: [] });
    expect(nextContract(s)).toEqual({ monster: 'king', mark: 1 });
  });

  it('a lost hunt pays a little for each part got through, and opens nothing', () => {
    const s = freshSave();
    const pay = payFor(s, 'sexton', 1, false, tally, 2);
    expect(pay).toMatchObject({ won: false, coin: 12, trophy: null });
    expect(s.felled).toEqual({});
    expect(s.hunts).toBe(1);
    expect(s.wins).toBe(0);
  });

  it('a trophy is worn by one hunter and bends a rule for them', () => {
    const s = freshSave();
    payFor(s, 'sexton', 1, true, tally, 2);
    wear(s, 'spade');
    expect(setupOf(s, 'sexton', 1, 1, false).trophy).toBe('spade');
    wear(s, 'spade');
    expect(setupOf(s, 'sexton', 1, 1, false).trophy).toBe(null);
    wear(s, 'antler');
    expect(s.worn).toEqual({});
  });
});

describe('what coin buys', () => {
  it('a step of supply, then a dearer one, to the last', () => {
    const s = freshSave();
    s.coin = 1000;
    for (const price of SUPPLY.steps) {
      const before = s.coin;
      expect(buy(s, 'supply')).toBe('');
      expect(before - s.coin).toBe(price);
    }
    expect(supplyOf(s)).toBe(SUPPLY.base + SUPPLY.steps.length);
    expect(buy(s, 'supply')).toBe('Already bought');
  });

  it('a second call and a sturdier building, once each, for what is opened only', () => {
    const s = freshSave();
    expect(wares(s).some((w) => w.id === 'more:sappers')).toBe(false);
    expect(buy(s, 'more:pikemen')).toBe('Not enough coin');
    s.coin = 200;
    expect(buy(s, 'more:pikemen')).toBe('');
    expect(buy(s, 'more:pikemen')).toBe('Already bought');
    expect(buy(s, 'sturdy:barricade')).toBe('');
    expect(s.steps).toEqual(['more:pikemen', 'sturdy:barricade']);
  });
});

describe('a save read back', () => {
  it('is made whole, and what it cannot have is dropped', () => {
    const s = repair({ coin: 55.7, supply: 99, felled: { sexton: 2, nobody: 3 }, trophies: ['spade', 'spade', 'crown'], worn: { marta: 'spade', jory: 'antler' }, steps: ['more:pikemen', 'more:dragons'], muster: { hunter: 'agnes', reinforcements: ['pikemen', 'sappers', 'crossbowmen'], buildings: { barricade: 9, ballista: 1 } }, sound: false });
    expect(s.coin).toBe(55);
    expect(s.supply).toBe(SUPPLY.steps.length);
    expect(s.felled).toEqual({ sexton: 2 });
    expect(s.trophies).toEqual(['spade']);
    expect(s.worn).toEqual({ marta: 'spade' });
    expect(s.steps).toEqual(['more:pikemen']);
    expect(s.muster.hunter).toBe('marta');
    expect(s.muster.reinforcements).toEqual(['pikemen', 'sappers']);
    expect(s.muster.buildings).toEqual({ barricade: 3 });
    expect(s.sound).toBe(false);
    expect(repair(null)).toEqual(freshSave());
    expect(repair('nonsense')).toEqual(freshSave());
  });
});
