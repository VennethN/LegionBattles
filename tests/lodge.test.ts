import { describe, expect, it } from 'vitest';
import { BUILDINGS, HUNTERS, MONSTERS, REINFORCEMENTS, TO_COME, byId } from '../src/game/content';
import { Hunt } from '../src/game/hunt';
import {
  FIRST_MUSTER, LESSON_PAY, OPENING, SUPPLY, lessonFor, newsOf, openingOf, type SaveData, buy, canHunt, changeBuilding, chargesOf, contracts, costOf, freshSave, isOpen, nextContract, opensBy, payFor, repair, setHunter, setupOf, supplyOf,
  quarryOf, toggleReinforcement, toldBy, wares, wear, placesOf, statsOf, togglePartner,
} from '../src/game/lodge';
import { ABILITIES } from '../src/game/content';
import { RANKS } from '../src/game/growth';

const tally = { time: 100, dealt: {}, taken: {}, killedBy: null, breaks: 0, taught: false, tasks: {}, downs: 0 };

/** A lodge with the opening hunts behind it: everything is open, and the muster is the one a player starts from. */
const opened = (): SaveData => {
  const s = freshSave();
  s.opening = OPENING.length;
  s.muster = { hunter: FIRST_MUSTER.hunter, reinforcements: [...FIRST_MUSTER.reinforcements], buildings: { ...FIRST_MUSTER.buildings }, partners: [] };
  return s;
};

describe('a new lodge', () => {
  it('has one hunter and nothing else to take, and the muster it will have later fits its supply', () => {
    const s = freshSave();
    expect(isOpen(s, 'marta')).toBe(true);
    expect(isOpen(s, 'jory')).toBe(false);
    expect(s.muster).toEqual({ hunter: 'marta', reinforcements: [], buildings: {}, partners: [] });
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
    const s = opened();
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
    const s = opened();
    expect(setHunter(s, 'jory')).toBe('Locked: Beat The Gravedigger');
    expect(toggleReinforcement(s, 'sappers')).toBe('Locked: Beat The Gravedigger');
    expect(changeBuilding(s, 'ballista', 1)).toBe('Locked: Beat The Antlered King');
    expect(s.muster.hunter).toBe('marta');
    for (const t of [...HUNTERS, ...REINFORCEMENTS, ...BUILDINGS]) if (t.opens) expect(opensBy(t.id)).toMatch(/^Beat /);
  });

  it('makes the hunt it describes', () => {
    const s = opened();
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

describe("a hunter's page", () => {
  it('gives every skill a line of its own whose numbers are the full line\'s', () => {
    for (const a of ABILITIES) {
      expect(a.brief, a.id).toBeTruthy();
      expect((a.brief ?? '').length, a.id).toBeLessThanOrEqual(48);
      for (const n of (a.brief ?? '').match(/\d+(\.\d+)?/g) ?? []) expect(a.says, `${a.id}: ${n}`).toContain(n);
    }
  });

  it('shows the stats the hunt gives the hunter, with their rank in', () => {
    const s = opened();
    const marta = byId(HUNTERS, 'marta');
    expect(statsOf(s, 'marta')).toEqual({ health: marta.hp, damage: marta.combo.map((b) => b.dmg), range: Math.max(...marta.combo.map((b) => b.reach)), speed: marta.speed });
    s.xp = { marta: 1e6 };
    const top = RANKS[RANKS.length - 1].gain;
    const h = new Hunt(setupOf(s, 'sexton', 1, 5, false));
    expect(statsOf(s, 'marta').health).toBe(h.hunter.maxHp);
    expect(statsOf(s, 'marta').damage[0]).toBe(Math.round(marta.combo[0].dmg * (1 + top)));
  });

  it('counts the partner places a contract has, and how many are left', () => {
    const s = opened();
    expect(placesOf(s, 1)).toEqual({ places: 0, chosen: 0, left: 0 });
    s.trophies.push('spade');
    expect(placesOf(s, 3)).toEqual({ places: 2, chosen: 0, left: 2 });
    s.muster.partners = ['jory'];
    expect(placesOf(s, 3)).toEqual({ places: 2, chosen: 1, left: 1 });
    expect(placesOf(s, 2)).toEqual({ places: 1, chosen: 1, left: 0 });
    expect(togglePartner(s, 'jory')).toBe('');
    expect(placesOf(s, 3).chosen).toBe(0);
  });
});

describe('what a hunt pays', () => {
  it('the first fall pays twice, gives the trophy, opens what it opens and posts the next contract', () => {
    const s = opened();
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
    const s = opened();
    const pay = payFor(s, 'sexton', 1, false, tally, 2);
    expect(pay).toMatchObject({ won: false, coin: 12, trophy: null });
    expect(s.felled).toEqual({});
    expect(s.hunts).toBe(1);
    expect(s.wins).toBe(0);
  });

  it('a trophy is worn by one hunter and bends a rule for them', () => {
    const s = opened();
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
    const s = opened();
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
    const s = opened();
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
    expect(s.opening).toBe(OPENING.length);
    expect(repair(null)).toEqual(freshSave());
    expect(repair('nonsense')).toEqual(freshSave());
  });
});

describe('the opening hunts', () => {
  it('the first is a lesson: Marta alone against a simpler Gravedigger, with no camp and nothing brought', () => {
    const s = freshSave();
    expect(lessonFor(s, 'sexton', 1)?.id).toBe('first');
    const setup = setupOf(s, 'sexton', 1, 3, false);
    expect(setup).toMatchObject({ lesson: 'first', hunter: 'marta', reinforcements: [], buildings: [], taught: false });
    const h = new Hunt(setup);
    expect(h.phase).toBe('hunt');
    expect(h.camps).toBe(false);
    expect(h.calls).toEqual([]);
    expect(h.toPlace).toEqual({});
    expect(changeBuilding(s, 'barricade', 1)).toBe('Locked: win your first hunt');
    expect(toggleReinforcement(s, 'pikemen')).toBe('Locked: play 1 more hunt');
  });

  it('lost, the lesson is the next hunt again, without its steps if they were all done', () => {
    const s = freshSave();
    expect(payFor(s, 'sexton', 1, false, { ...tally, taught: true }, 1)).toMatchObject({ won: false, lesson: true });
    expect(s.opening).toBe(0);
    expect(setupOf(s, 'sexton', 1, 3, false)).toMatchObject({ lesson: 'first', taught: true });
  });

  it('won, it pays its coin and the trophy, and the contract itself is still to be won', () => {
    const s = freshSave();
    const pay = payFor(s, 'sexton', 1, true, { ...tally, taught: true }, 1);
    expect(pay).toMatchObject({ won: true, coin: LESSON_PAY, trophy: 'spade', lesson: true, posted: [] });
    expect(pay.opened).toContain('Jory Pell');
    expect(s.felled).toEqual({});
    expect(canHunt(s, 'king', 1)).toBe(false);
    expect(lessonFor(s, 'sexton', 1)).toBe(null);
    expect(nextContract(s)).toEqual({ monster: 'sexton', mark: 1 });
  });

  it('then each hunt brings in one new thing, however it ends: a building and the camp, the horn, and then everything', () => {
    const s = freshSave();
    payFor(s, 'sexton', 1, true, tally, 1);
    // The second hunt: one building, and a camp to set it in.
    expect(s.muster).toEqual({ hunter: 'marta', reinforcements: [], buildings: { barricade: 1 }, partners: [] });
    expect(newsOf(s)).toMatch(/^New: a Barricade/);
    expect(changeBuilding(s, 'watchfire', 1)).toMatch(/^Only 1 building/);
    expect(toggleReinforcement(s, 'pikemen')).toBe('Locked: play 1 more hunt');
    const second = new Hunt(setupOf(s, 'sexton', 1, 3, false));
    expect(second.phase).toBe('camp');
    expect(second.toPlace).toEqual({ barricade: 1 });
    expect(second.calls).toEqual([]);
    // The third: the horn.
    payFor(s, 'sexton', 1, false, tally, 1);
    expect(s.muster).toEqual({ hunter: 'marta', reinforcements: ['pikemen'], buildings: { barricade: 1 }, partners: [] });
    expect(newsOf(s)).toMatch(/^New: Spearmen/);
    expect(new Hunt(setupOf(s, 'sexton', 1, 3, false)).calls.map((c) => c.def.id)).toEqual(['pikemen']);
    // And after it the supply decides.
    payFor(s, 'sexton', 1, false, tally, 1);
    expect(openingOf(s)).toBe(null);
    expect(s.muster).toEqual(FIRST_MUSTER);
    expect(newsOf(s)).toMatch(/^New: Supply/);
    expect(changeBuilding(s, 'barricade', 1)).toBe('');
  });

  it('a save from before the opening that has won is past it', () => {
    expect(repair({ wins: 2, trophies: ['spade'] }).opening).toBe(OPENING.length);
    expect(repair({ wins: 0 }).opening).toBe(0);
    expect(repair({ opening: 1, muster: { hunter: 'marta', reinforcements: ['pikemen'], buildings: { barricade: 2, watchfire: 1 } } }).muster).toEqual({ hunter: 'marta', reinforcements: [], buildings: { barricade: 1 }, partners: [] });
  });
});

describe('what a contract tells of its boss', () => {
  it('the first time, only its first phase; after a hunt, what was reached; once felled, all of it', () => {
    const s = freshSave();
    const m = byId(MONSTERS, 'sexton');
    let q = quarryOf(s, 'sexton');
    expect(q.phases[0]).not.toContain('???');
    expect(q.phases[1]).toContain('???');
    expect(q.phases[2]).toContain('???');
    expect(q.weak).toBeNull();
    const first = new Set(m.parts[0]);
    q.attacks.forEach((a, i) => expect(!!a).toBe(first.has([...new Set(m.parts.flat())][i])));
    s.met = { sexton: 2 };
    q = quarryOf(s, 'sexton');
    expect(q.phases[1]).not.toContain('???');
    expect(q.phases[2]).toContain('???');
    expect(q.weak).toBeTruthy();
    s.felled.sexton = 1;
    q = quarryOf(s, 'sexton');
    expect(q.phases.every((p) => !p.includes('???'))).toBe(true);
    expect(q.attacks.every((a) => a && a.how.length > 0)).toBe(true);
  });

  it('the save keeps what has been seen of each boss', () => {
    expect(repair({ met: { sexton: 2, king: 9, nobody: 1 } }).met).toEqual({ sexton: 2, king: 3 });
  });

  it('every attack of every boss is told in plain words', () => {
    for (const m of MONSTERS) for (const a of m.attacks) expect(toldBy(a).length, `${m.id} ${a.id}`).toBeGreaterThan(10);
  });
});
