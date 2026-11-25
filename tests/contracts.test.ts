import { describe, expect, it } from 'vitest';
import { BOARD, CART_ROAD, HUNTERS, MONSTERS, PARTY, REVIVE, TASKS, TELL_FLOOR, VARIANTS, byId } from '../src/game/content';
import { Hunt, STEP, type Terms } from '../src/game/hunt';
import {
  OPENING, board, freshSave, hunterBar, partyFor, payFor, posterOf, repair, repost, rewardFor, setupForPosting, togglePartner, type Posting, type SaveData,
} from '../src/game/lodge';
import { awake, hold, next, of, play, setup } from './lair';

const ATTACK = { x: 0, y: 0, attack: true };
const terms = (variants: string[] = [], tasks: Terms['tasks'] = []): Terms => ({ variants, tasks });
const tally = { time: 100, dealt: {}, taken: {}, killedBy: null, breaks: 0, taught: false, tasks: {}, downs: 0 };

/** A lodge past its opening hunts, with the Gravedigger's trophy: the board is posted. */
function posted(): SaveData {
  const s = freshSave();
  s.opening = OPENING.length;
  s.trophies = ['spade'];
  s.felled = { sexton: 1 };
  return s;
}

describe('attacking is a press', () => {
  it('pressed again in its recovery, a blow chains to the next, and the chain goes back to its first after a pause', () => {
    const h = awake();
    hold(h, 'recover');
    h.hunter.x = h.monster.x - 110;
    h.hunter.y = h.monster.y;
    const combo = byId(HUNTERS, 'marta').combo;
    h.step(ATTACK);
    play(h, combo[0].wind + 0.05);
    // A press in the recovery, then let go: the second blow follows as the first ends.
    h.step(ATTACK);
    const after = play(h, combo[0].recover + combo[1].wind + 0.1);
    expect(of(after, 'blow').map((e) => e.n)).toEqual([1]);
    play(h, 2);
    h.step(ATTACK);
    expect(of(h.drain(), 'blow').map((e) => e.n)).toEqual([0]);
  });

  it('held, the chain goes on by itself: a player is not asked to mash', () => {
    const h = awake();
    hold(h, 'recover');
    h.hunter.x = h.monster.x - 110;
    h.hunter.y = h.monster.y;
    const blows = of(play(h, 4, ATTACK), 'strike');
    expect(blows.length).toBeGreaterThanOrEqual(4);
    expect(new Set(blows.map((b) => b.n))).toEqual(new Set([0, 1]));
  });

  it('a blow cannot be dodged out of while it winds up; its recovery can be', () => {
    const h = awake();
    hold(h, 'recover');
    h.hunter.x = h.monster.x - 110;
    h.step(ATTACK);
    h.step({ x: -1, y: 0, dodge: true });
    expect(h.hunter.roll).toBe(0);
    play(h, byId(HUNTERS, 'marta').combo[0].wind + 0.05);
    expect(h.hunter.blow?.landed).toBe(true);
    h.step({ x: -1, y: 0, dodge: true });
    expect(h.hunter.roll).toBeGreaterThan(0);
    expect(h.hunter.blow).toBe(null);
  });

  it("held, Jory's crossbow is cranked for a heavy bolt that goes by itself when it is ready", () => {
    const h = awake({ hunter: 'jory' });
    hold(h, 'recover');
    h.hunter.x = h.monster.x - 300;
    h.hunter.y = h.monster.y;
    const heavy = byId(HUNTERS, 'jory').heavy;
    const events = play(h, (heavy?.aim ?? 1) + 0.6, { ...ATTACK, aim: 0 });
    expect(of(events, 'blow').some((e) => e.heavy)).toBe(true);
  });

  it('aimed where the player points; with no aim, the way they face, turned to the boss if it is a little ahead', () => {
    const h = awake();
    hold(h, 'recover');
    h.hunter.x = h.monster.x - 110;
    h.hunter.y = h.monster.y + 30;
    h.hunter.aim = 0.2;
    h.step(ATTACK);
    const helped = of(h.drain(), 'blow')[0];
    expect(helped.angle).toBeCloseTo(Math.atan2(h.monster.y - h.hunter.y, h.monster.x - h.hunter.x), 5);
    play(h, 3);
    h.step({ ...ATTACK, aim: Math.PI });
    expect(of(h.drain(), 'blow')[0].angle).toBeCloseTo(Math.PI, 5);
  });

  it('the bot still wins the first hunt of the Gravedigger, pressing as a player would', async () => {
    const { Bot } = await import('../src/game/bot');
    const h = new Hunt(setup({ seed: 41 }));
    const b = new Bot(5);
    for (let t = 0; t < 600 && !h.over; t += STEP) {
      h.step(b.steer(h));
      h.drain();
    }
    expect(h.over).toBe('won');
  });
});

describe('a party', () => {
  it('partners come along, each a hunter of their own, and the boss has more health and is harder to break for each', () => {
    const solo = awake();
    const four = awake({ partners: ['jory', 'agnes', 'brask'] });
    expect(four.party.map((p) => p.def.id)).toEqual(['marta', 'jory', 'agnes', 'brask']);
    expect(four.party.slice(1).every((p) => p.ai)).toBe(true);
    expect(four.monster.maxHp).toBe(Math.round(solo.monster.maxHp * (1 + PARTY.hp * 3)));
    expect(four.monster.staggerMax).toBeGreaterThan(solo.monster.staggerMax);
    // Brask's dogs come with him, and run with him.
    expect(four.allies.filter((a) => a.group === 'hound' && a.owner === 3)).toHaveLength(2);
  });

  it('partners fight by themselves: they move, attack and hurt the boss', () => {
    const h = awake({ partners: ['jory', 'agnes'] });
    h.hunter.hp = h.hunter.maxHp = 1e6;
    play(h, 20);
    expect((h.tally.dealt.jory ?? 0) + (h.tally.dealt.agnes ?? 0)).toBeGreaterThan(0);
    expect(h.tally.dealt.hunter ?? 0).toBe(0);
  });

  it('a hunter who is down is helped up by standing by them, and the hunt is lost only when everyone is down', () => {
    const h = awake({ partners: ['jory'] });
    hold(h, 'recover');
    const hurt = h as unknown as { hurtHunter(who: unknown, n: number, by: string): void };
    hurt.hurtHunter(h.party[1], 9999, 'spade');
    expect(h.party[1].down).toBe(true);
    expect(h.over).toBe(null);
    h.hunter.x = h.party[1].x + 30;
    h.hunter.y = h.party[1].y;
    const events = play(h, 3.2);
    expect(of(events, 'helped')).toHaveLength(1);
    expect(h.party[1].down).toBe(false);
    expect(h.party[1].hp).toBeGreaterThan(0);
    for (const p of h.party) {
      p.grace = 0;
      hurt.hurtHunter(p, 9999, 'spade');
    }
    expect(h.over).toBe('lost');
  });

  it('the boss turns on the party: not always the player', () => {
    const h = awake({ seed: 4, partners: ['jory', 'agnes'] });
    for (const p of h.party) p.hp = p.maxHp = 1e6;
    const targets = of(play(h, 60), 'target').map((e) => e.who);
    expect(new Set(targets).size).toBeGreaterThan(1);
  });

  it('with three or more, it has attacks it has not alone, and what splits is marked at two of them', () => {
    const wide = MONSTERS.flatMap((m) => m.attacks).filter((a) => a.party);
    expect(wide.length).toBeGreaterThanOrEqual(2);
    const solo = awake();
    solo.hunter.hp = solo.hunter.maxHp = 1e6;
    expect(of(play(solo, 60, (x) => ({ x: x.monster.x - 160 - x.hunter.x, y: x.monster.y - x.hunter.y })), 'tell').some((e) => e.attack === 'widesweep')).toBe(false);
    const three = awake({ mark: 2, partners: ['jory', 'agnes'] });
    for (const p of three.party) p.hp = p.maxHp = 1e6;
    const seen = of(play(three, 120), 'tell');
    expect(seen.some((e) => e.attack === 'widesweep')).toBe(true);
    // Grasping Hands at two of them: two rings in one go.
    const h = awake({ mark: 2, partners: ['jory', 'agnes'] });
    h.party[1].x = 100;
    h.party[2].x = h.w - 100;
    next(h, 'grasp');
    h.hunter.x = h.monster.x - 400;
    play(h, 0.1);
    expect(h.tells.filter((t) => t.attack === 'grasp')).toHaveLength(2);
  });

  it('a contract fills its places with the player\'s own hunters first, then hands for hire', () => {
    const s = posted();
    expect(partyFor(s, 3)).toEqual({ partners: ['jory', 'sellsword'], hired: 1 });
    togglePartner(s, 'jory');
    expect(s.muster.partners).toEqual(['jory']);
    expect(togglePartner(s, 'marta')).toBe('That is you');
    expect(togglePartner(s, 'agnes')).toMatch(/^Locked/);
    const fresh = freshSave();
    expect(partyFor(fresh, 4)).toEqual({ partners: ['sellsword', 'bowman', 'sellsword'], hired: 3 });
  });

  it('the hunters\' bar shows every hunter of the player\'s own, and the locked ones as ??? with how to unlock them', () => {
    const bar = hunterBar(freshSave());
    expect(bar.map((h) => h.id)).toEqual(HUNTERS.filter((h) => !h.hired).map((h) => h.id));
    const jory = bar.find((h) => h.id === 'jory');
    expect(jory).toMatchObject({ name: '???', way: '', open: false });
    expect(jory?.unlock).toMatch(/^Beat /);
    expect(bar.find((h) => h.id === 'marta')).toMatchObject({ open: true, leading: true });
  });
});

describe('a contract unlike the last', () => {
  const variant = (id: string): Hunt => awake({ terms: terms([id]) });

  it('every variant and task in the tables is one the game knows how to play', () => {
    for (const v of VARIANTS) if (v.only) expect(MONSTERS.some((m) => m.id === v.only), v.id).toBe(true);
    for (const t of TASKS) expect(t.name.length).toBeGreaterThan(0);
  });

  it('Quick: faster, with shorter warnings that are never under what a person can react to', () => {
    const plain = awake();
    const quick = variant('quick');
    for (const h of [plain, quick]) {
      h.hunter.x = h.monster.x - 160;
      next(h, 'spade');
      play(h, 0.1);
    }
    const a = plain.tells[0].of;
    const b = quick.tells[0].of;
    expect(b).toBeLessThan(a);
    expect(b).toBeGreaterThanOrEqual(Math.min(a, TELL_FLOOR) - 1e-9);
  });

  it('Armored: half the damage until its stagger is broken once', () => {
    const plain = awake();
    const armored = variant('armored');
    for (const h of [plain, armored]) {
      hold(h, 'recover');
      h.hunter.x = h.monster.x - 110;
      h.hunter.y = h.monster.y;
      play(h, 1.2, ATTACK);
    }
    const lost = (h: Hunt): number => h.monster.maxHp - h.monster.hp;
    expect(lost(armored)).toBeLessThan(lost(plain) * 0.6);
  });

  it('Giant: more health, and bigger shapes', () => {
    const plain = awake();
    const giant = variant('giant');
    expect(giant.monster.maxHp).toBeGreaterThan(plain.monster.maxHp * 1.15);
    for (const h of [plain, giant]) {
      h.hunter.x = h.monster.x - 160;
      next(h, 'spade');
      play(h, 0.1);
    }
    expect(giant.tells[0].len).toBeGreaterThan(plain.tells[0].len);
  });

  it('Furious: its next phase\'s attacks from the start', () => {
    const h = awake({ seed: 3, terms: terms(['furious']) });
    h.hunter.hp = h.hunter.maxHp = 1e6;
    const names = of(play(h, 20, (x) => ({ x: x.monster.x - 150 - x.hunter.x, y: x.monster.y - x.hunter.y })), 'tell').filter((e) => e.first).map((e) => e.attack);
    expect(names.some((n) => ['furrow', 'lantern'].includes(n))).toBe(true);
  });

  it('Blighted: rot is left behind it, shown before it bursts like everything else', () => {
    const h = variant('blighted');
    h.hunter.hp = h.hunter.maxHp = 1e6;
    const events = play(h, 12, (x) => ({ x: x.monster.x - 300 - x.hunter.x, y: 0 }));
    expect(of(events, 'tell').some((e) => e.attack === 'blight')).toBe(true);
  });

  it('Restless Dead opens graves more often; Stampede charges twice; Escort and Endless Minions bring more', () => {
    const plain = awake({ seed: 3 });
    const restless = awake({ seed: 3, terms: terms(['restless']) });
    const graves = (h: Hunt): number => {
      h.hunter.hp = h.hunter.maxHp = 1e6;
      return of(play(h, 40, (x) => ({ x: x.monster.x - 150 - x.hunter.x, y: x.monster.y - x.hunter.y })), 'tell').filter((e) => e.first && e.attack === 'graves').length;
    };
    expect(graves(restless)).toBeGreaterThan(graves(plain));

    const king = awake({ monster: 'king', terms: terms(['stampede']) });
    king.hunter.hp = king.hunter.maxHp = 1e6;
    king.hunter.x = 200;
    next(king, 'charge');
    const dashes = of(play(king, 6), 'dash');
    expect(dashes.length).toBeGreaterThanOrEqual(2);

    const escort = new Hunt(setup({ terms: terms(['escort']) }));
    escort.step({ x: 0, y: 0, wake: true });
    expect(escort.helpers.filter((f) => f.def.id === 'risen')).toHaveLength(3);

    const waves = variant('waves');
    waves.hunter.hp = waves.hunter.maxHp = 1e6;
    const more = of(play(waves, 32, (x) => ({ x: 0, y: x.time % 2 < 1 ? 1 : -1 })), 'tell').filter((e) => e.attack === 'waves');
    expect(more.length).toBeGreaterThan(0);
  });

  it('nothing hurts that was not shown first, with every variant and a party', () => {
    for (const v of VARIANTS) {
      const monster = v.only ?? 'sexton';
      const h = awake({ monster, seed: 11, terms: terms([v.id]), partners: ['jory'] });
      const shown = new Set<string>();
      for (let t = 0; t < 40 && !h.over; t += STEP) {
        h.step({ x: Math.sin(t), y: Math.cos(t * 0.7) });
        for (const e of h.drain()) {
          if (e.t === 'tell') shown.add(e.attack);
          if (e.t === 'hurt' && e.who === 'hunter') expect(shown.has(e.by) || e.by === 'charge', `${v.id}: ${e.by}`).toBe(true);
        }
      }
    }
  });
});

describe('tasks besides the kill', () => {
  it('Fast Kill fails past its time; Careful fails past its hits; Break It is done when broken enough', () => {
    const h = awake({ terms: terms([], [{ id: 'swift', n: 2 }, { id: 'careful', n: 0 }, { id: 'breaks', n: 1 }]) });
    hold(h, 'recover');
    h.monster.stagger = h.monster.staggerMax - 1;
    h.hunter.x = h.monster.x - 110;
    h.hunter.y = h.monster.y;
    const events = play(h, 3, ATTACK);
    const said = of(events, 'task');
    expect(said).toContainEqual({ t: 'task', id: 'breaks', done: true });
    expect(said).toContainEqual({ t: 'task', id: 'swift', done: false });
    const hurt = h as unknown as { hurtHunter(who: unknown, n: number, by: string): void };
    h.hunter.grace = 0;
    hurt.hurtHunter(h.hunter, 1, 'spade');
    play(h, 0.1);
    expect(h.tasks.find((t) => t.id === 'careful')?.failed).toBe(true);
  });

  it('Markers stand on the field and are done when all are broken; the boss dying first fails them', () => {
    const h = awake({ terms: terms([], [{ id: 'markers', n: 3 }]) });
    const markers = h.helpers.filter((f) => f.def.still);
    expect(markers).toHaveLength(3);
    // They do nothing: no tells of theirs, however long.
    hold(h, 'recover');
    const events = play(h, 5);
    expect(of(events, 'tell')).toHaveLength(0);
    for (const m of markers) m.hp = 1;
    for (const m of [...markers]) {
      h.hunter.x = m.x - 60;
      h.hunter.y = m.y;
      h.hunter.grace = 99;
      play(h, 1, { ...ATTACK, aim: 0 });
    }
    expect(h.tasks[0].done).toBe(true);
    const g = awake({ terms: terms([], [{ id: 'markers', n: 3 }]) });
    hold(g, 'recover');
    g.monster.part = 2;
    g.monster.hp = 1;
    g.hunter.x = g.monster.x - 110;
    g.hunter.y = g.monster.y;
    play(g, 1, ATTACK);
    expect(g.over).toBe('won');
    expect(g.tally.tasks.markers).toBe(false);
  });

  it('Villagers and the Cart stand on the field to be kept; No Camp fails if anything is built; Stay Standing fails past its downs', () => {
    const v = awake({ terms: terms([], [{ id: 'villagers', n: 3 }]) });
    expect(v.allies.filter((a) => a.group === 'villager')).toHaveLength(3);
    v.allies = v.allies.filter((a) => a.group !== 'villager' || a !== v.allies.find((x) => x.group === 'villager'));
    play(v, 0.1);
    expect(v.tasks[0].failed).toBe(true);

    const c = awake({ terms: terms([], [{ id: 'cart' }]) });
    expect(c.buildings.some((b) => b.def.id === 'cart')).toBe(true);
    c.buildings = [];
    play(c, 0.1);
    expect(c.tasks[0].failed).toBe(true);

    const n = new Hunt(setup({ buildings: [{ id: 'barricade', n: 1 }], terms: terms([], [{ id: 'nobuild' }]) }));
    n.step({ x: 0, y: 0, place: 'barricade' });
    n.step({ x: 0, y: 0, wake: true });
    play(n, 0.1);
    expect(n.tasks[0].failed).toBe(true);

    const t = awake({ partners: ['jory'], terms: terms([], [{ id: 'together', n: 0 }]) });
    (t as unknown as { hurtHunter(who: unknown, n: number, by: string): void }).hurtHunter(t.party[1], 9999, 'spade');
    play(t, 0.1);
    expect(t.tasks[0].failed).toBe(true);
  });
});

describe('the board', () => {
  it('before the opening hunts are done nothing is posted; after, the board is full', () => {
    expect(board(freshSave())).toHaveLength(0);
    const s = posted();
    expect(board(s)).toHaveLength(BOARD.size);
  });

  it('a boss whose first trophy is not taken is always on it, plain; the hardest difficulty each can be hunted at is too', () => {
    const s = posted();
    const list = board(s);
    const king = list.filter((p) => p.monster === 'king' && p.mark === 1);
    expect(king.length).toBeGreaterThan(0);
    expect(king.some((p) => p.variants.length === 0 && p.tasks.length === 0 && p.party === 1)).toBe(true);
    expect(list.some((p) => p.monster === 'sexton' && p.mark === 2)).toBe(true);
  });

  it('a contract taken comes off when its hunt ends, a new one goes up, and every few hunts the whole board is posted again', () => {
    const s = posted();
    const first = board(s).map((p) => p.id);
    payFor(s, s.board[0].monster, s.board[0].mark, false, tally, 1, s.board[0]);
    expect(s.board).toHaveLength(BOARD.size);
    expect(s.board.map((p) => p.id)).not.toContain(first[0]);
    for (let i = 0; i < BOARD.turnEvery; i++) payFor(s, s.board[0].monster, s.board[0].mark, false, tally, 1, s.board[0]);
    expect(s.board.filter((p) => first.includes(p.id))).toHaveLength(0);
  });

  it('new postings are free once between hunts', () => {
    const s = posted();
    const before = board(s).map((p) => p.id);
    expect(repost(s)).toBe('');
    expect(s.board.map((p) => p.id).some((id) => before.includes(id))).toBe(false);
    expect(repost(s)).not.toBe('');
  });

  it('each poster says who posted it and why, what is unlike the boss, the party, the tasks and the reward', () => {
    const s = posted();
    for (let i = 0; i < 20; i++) {
      for (const p of board(s)) {
        const poster = posterOf(s, p);
        expect(poster.title).toMatch(/^WANTED: /);
        expect(poster.by.length).toBeGreaterThan(0);
        expect(poster.why.length).toBeGreaterThan(0);
        expect(poster.partyText).toMatch(p.party === 1 ? /^Alone$/ : /^Party: \d hunters$/);
        expect(poster.danger).toBeGreaterThanOrEqual(1);
        expect(poster.coin).toBeGreaterThan(0);
        for (const t of poster.tasks) expect(t.says).not.toMatch(/\{n\}/);
      }
      repost(s);
      s.reposts = 1;
    }
  });

  it('never two variants that cannot go together, and never more than the difficulty allows', () => {
    const s = posted();
    s.felled = { sexton: 2, king: 2 };
    for (let i = 0; i < 60; i++) {
      for (const p of board(s)) {
        for (const v of p.variants) for (const o of byId(VARIANTS, v).not ?? []) expect(p.variants).not.toContain(o);
        expect(p.variants.length).toBeLessThanOrEqual(p.mark === 3 ? 2 : 1);
        for (const v of p.variants) expect(byId(VARIANTS, v).mark ?? 1).toBeLessThanOrEqual(p.mark);
        expect(p.party).toBeGreaterThanOrEqual(1);
        expect(p.party).toBeLessThanOrEqual(PARTY.most);
      }
      repost(s);
      s.reposts = 1;
    }
  });

  it('pays more for danger and for a party, less what hands for hire take, and the tasks done besides', () => {
    const s = posted();
    const base: Posting = { id: 99, monster: 'sexton', mark: 1, variants: [], tasks: [], party: 1, by: 'x', why: 'y', thing: null };
    const plain = rewardFor(s, base).coin;
    expect(rewardFor(s, { ...base, variants: ['quick'] }).coin).toBeGreaterThan(plain);
    // With nobody of their own unlocked to go along, a hand for hire fills the place and takes a share.
    const lone = posted();
    lone.trophies = [];
    const two = rewardFor(lone, { ...base, party: 2 });
    expect(two.cut).toBeGreaterThan(0);
    expect(rewardFor(s, { ...base, party: 2 }).coin).toBeGreaterThan(plain);
    s.board = [{ ...base, tasks: [{ id: 'breaks', n: 1 }] }];
    const pay = payFor(s, 'sexton', 1, true, { ...tally, tasks: { breaks: true } }, 2, s.board[0]);
    expect(pay.tasks).toEqual([{ id: 'breaks', name: 'Break It', done: true, coin: expect.any(Number) }]);
    expect(pay.coin).toBe(plain + (pay.tasks[0].coin));
  });

  it('a posting is played as it says: its variants, its tasks and its party', () => {
    const s = posted();
    const p: Posting = { id: 7, monster: 'sexton', mark: 1, variants: ['quick'], tasks: [{ id: 'careful', n: 5 }], party: 3, by: 'x', why: 'y', thing: null };
    const h = new Hunt(setupForPosting(s, p, 3, false));
    expect([...h.variants]).toEqual(['quick']);
    expect(h.tasks.map((t) => t.id)).toEqual(['careful']);
    expect(h.party).toHaveLength(3);
  });

  it('the board is kept in the save and read back as it was', () => {
    const s = posted();
    board(s);
    const back = repair(JSON.parse(JSON.stringify(s)));
    expect(back.board).toEqual(s.board);
    expect(back.boardDice).toBe(s.boardDice);
  });
});

describe('the people and things a contract asks to be kept', () => {
  it('the boss never aims at a villager or the cart: its blows go at a hunter, and only a blow aimed at someone else or a helper reaches them', () => {
    const h = awake({ seed: 5, terms: terms([], [{ id: 'villagers', n: 1 }, { id: 'cart' }]) });
    h.hunter.hp = h.hunter.maxHp = 1e6;
    const villagers = new Set(h.allies.filter((a) => a.group === 'villager').map((a) => a.id));
    const cart = h.buildings.find((b) => b.def.id === 'cart');
    for (let t = 0; t < 40 && !h.over; t += STEP) {
      h.step({ x: 0, y: 0 });
      for (const tell of h.tells) {
        if (!tell.foe || tell.by !== 0 || tell.kind !== 'ring' || tell.attack === 'blight') continue;
        // A ring aimed at a target is on a hunter, never on a villager or the cart.
        for (const a of h.allies) if (villagers.has(a.id)) expect(tell.x === a.x && tell.y === a.y && tell.r < 60).toBe(false);
        if (cart) expect(tell.x === cart.x && tell.y === cart.y && tell.r < 60).toBe(false);
      }
      h.drain();
    }
  });

  it('a villager in a warning runs out of it, slower than a hunter', () => {
    const h = awake({ terms: terms([], [{ id: 'villagers', n: 1 }]) });
    const v = h.allies.find((a) => a.group === 'villager');
    if (!v) throw new Error('no villager');
    hold(h, 'recover', 99);
    h.tells.push({ id: 999, kind: 'ring', x: v.x, y: v.y, angle: 0, len: 0, w: 0, r: 70, half: 0, inner: 0, left: 3, of: 3, dmg: 1, foe: true, attack: 'test', by: 0 });
    const x0 = v.x;
    const y0 = v.y;
    play(h, 0.5);
    const moved = Math.hypot(v.x - x0, v.y - y0);
    expect(moved).toBeGreaterThan(20);
    expect(moved / 0.5).toBeLessThan(h.hunter.def.speed);
    play(h, 1.5);
    expect(Math.hypot(v.x - x0, v.y - y0)).toBeGreaterThan(70);
  });

  it('the cart rolls along its road, and stops while a warning is on its way', () => {
    const h = awake({ terms: terms([], [{ id: 'cart' }]) });
    hold(h, 'recover', 99);
    const cart = h.buildings.find((b) => b.def.id === 'cart');
    if (!cart || !h.cartRoad) throw new Error('no cart');
    const x0 = cart.x;
    const y0 = cart.y;
    play(h, 2);
    const rolled = Math.hypot(cart.x - x0, cart.y - y0);
    expect(rolled).toBeGreaterThan(CART_ROAD.speed * 1.5);
    const [tx, ty] = h.cartRoad.points[h.cartRoad.next];
    const d = Math.hypot(tx - cart.x, ty - cart.y);
    h.tells.push({ id: 998, kind: 'ring', x: cart.x + ((tx - cart.x) / d) * 60, y: cart.y + ((ty - cart.y) / d) * 60, angle: 0, len: 0, w: 0, r: 30, half: 0, inner: 0, left: 5, of: 5, dmg: 1, foe: true, attack: 'test', by: 0 });
    const x1 = cart.x;
    const y1 = cart.y;
    play(h, 1);
    expect(Math.hypot(cart.x - x1, cart.y - y1)).toBeLessThan(1);
  });

  it('Stay Standing counts a down helped up in time as half, and one left too long as whole', () => {
    const hurt = (h: Hunt, i: number): void => (h as unknown as { hurtHunter(who: unknown, n: number, by: string): void }).hurtHunter(h.party[i], 9999, 'spade');
    const quick = awake({ partners: ['jory'], terms: terms([], [{ id: 'together', n: 0.5 }]) });
    hold(quick, 'recover', 99);
    hurt(quick, 1);
    quick.hunter.x = quick.party[1].x + 30;
    quick.hunter.y = quick.party[1].y;
    play(quick, REVIVE.time + 0.4);
    expect(quick.party[1].down).toBe(false);
    play(quick, REVIVE.window + 1);
    expect(quick.tasks[0].now).toBe(0.5);
    expect(quick.tasks[0].failed).toBe(false);

    const slow = awake({ partners: ['jory'], terms: terms([], [{ id: 'together', n: 0.5 }]) });
    hold(slow, 'recover', 99);
    hurt(slow, 1);
    slow.hunter.x = 60;
    slow.party[1].x = slow.w - 60;
    play(slow, REVIVE.window + 1);
    expect(slow.tasks[0].now).toBe(1);
    expect(slow.tasks[0].failed).toBe(true);
  });
});
