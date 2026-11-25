import { describe, expect, it } from 'vitest';
import { ABILITIES, BUILDINGS, CAMP, HELPERS, HUNTERS, MARKS, MONSTERS, REINFORCEMENTS, byId } from '../src/game/content';
import { Hunt, STEP, inside, type Tell } from '../src/game/hunt';
import { awake, hold, next, of, play, setup } from './lair';

describe('the tables', () => {
  it('every round names attacks the monster has, and every attack shows before it lands', () => {
    for (const m of MONSTERS) {
      for (const round of m.parts) {
        expect(round.length).toBeGreaterThan(2);
        for (const id of round) expect(m.attacks.some((a) => a.id === id), `${m.id}: ${id}`).toBe(true);
      }
      for (const a of m.attacks) {
        expect(a.tell * MARKS[3].tell, `${m.id}: ${a.id}`).toBeGreaterThanOrEqual(0.45);
        expect(a.shapes.length, a.id).toBeGreaterThan(0);
        if (a.summon) expect(HELPERS.some((h) => h.id === a.summon), a.id).toBe(true);
        expect(m.parts.some((r) => r.includes(a.id)), `${a.id} is in no round`).toBe(true);
      }
    }
  });

  it('in every part there is something a monster can do at the first mark, near and far', () => {
    for (const m of MONSTERS) {
      for (const round of m.parts) {
        for (const d of [60, 200, 500]) {
          const can = round.map((id) => byId(m.attacks, id)).filter((a) => (a.mark ?? 1) === 1 && (a.far === undefined || d >= a.far) && (a.near === undefined || d <= a.near));
          // Far off, a monster with nothing that reaches walks closer: that is allowed. Up close there must be something.
          if (d <= 200) expect(can.length, `${m.id} at ${d}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every hunter has two abilities that exist, and what opens anything is a trophy some monster gives', () => {
    const trophies = new Set(MONSTERS.map((m) => m.trophy.id));
    for (const h of HUNTERS) for (const a of h.abilities) expect(ABILITIES.some((x) => x.id === a), a).toBe(true);
    for (const t of [...HUNTERS, ...REINFORCEMENTS, ...BUILDINGS]) if (t.opens) expect(trophies.has(t.opens), t.id).toBe(true);
    // Someone and something are there from the first day.
    expect(HUNTERS.some((h) => !h.opens) && REINFORCEMENTS.some((r) => !r.opens) && BUILDINGS.some((b) => !b.opens)).toBe(true);
  });
});

describe('camp', () => {
  it('buildings are set down where the hunter stands while the monster sleeps, as many as were brought', () => {
    const h = new Hunt(setup({ buildings: [{ id: 'barricade', n: 2 }] }));
    expect(h.phase).toBe('camp');
    h.step({ x: 0, y: 0, place: 'barricade' });
    expect(h.buildings).toHaveLength(1);
    expect(h.toPlace.barricade).toBe(1);
    // Not on top of the first.
    expect(h.whyNot('barricade')).toBe('Too near another');
    const events = play(h, 1.5, { x: 0, y: 1 });
    h.step({ x: 0, y: 0, place: 'barricade' });
    expect(h.buildings).toHaveLength(2);
    expect(h.whyNot('barricade')).toBe('None left');
    expect(of([...events, ...h.drain()], 'place')).toHaveLength(2);
  });

  it('nothing is built beside the monster, and nothing once it is awake', () => {
    const h = new Hunt(setup({ buildings: [{ id: 'barricade', n: 2 }] }));
    h.hunter.x = h.monster.x - CAMP.clear + 60;
    h.hunter.y = h.monster.y;
    expect(h.whyNot('barricade')).toBe('Too near it');
    h.hunter.x = 200;
    h.step({ x: 0, y: 0, wake: true });
    expect(h.phase).toBe('hunt');
    expect(h.whyNot('barricade')).toBe('It is awake');
    h.step({ x: 0, y: 0, place: 'barricade' });
    expect(h.buildings).toHaveLength(0);
  });

  it('walking up to it wakes it, and it does nothing before it is woken', () => {
    const h = new Hunt(setup());
    expect(of(play(h, 5), 'tell')).toHaveLength(0);
    expect(h.time).toBe(0);
    const events = play(h, 12, { x: 1, y: 0 });
    expect(of(events, 'wake')).toHaveLength(1);
    expect(h.phase).not.toBe('camp');
  });
});

describe('tells', () => {
  it('a blow shows on the ground for its time, then lands on whoever is in it, and only on them', () => {
    const h = awake();
    h.hunter.x = h.monster.x - 140;
    next(h, 'spade');
    const before = h.hunter.hp;
    let events = play(h, 0.5);
    const told = of(events, 'tell');
    expect(told).toHaveLength(1);
    expect(told[0].first).toBe(true);
    expect(h.tells).toHaveLength(1);
    expect(h.hunter.hp).toBe(before);
    events = play(h, 0.6);
    expect(of(events, 'land')).toHaveLength(1);
    expect(h.hunter.hp).toBeLessThan(before);
    // The same blow with the hunter beside its line does nothing.
    const g = awake();
    g.hunter.x = g.monster.x - 140;
    next(g, 'spade');
    play(g, 0.3);
    g.hunter.y += 120;
    play(g, 0.8);
    expect(g.hunter.hp).toBe(g.hunter.maxHp);
  });

  it('nothing hurts the hunter that was not shown first', () => {
    for (const monster of MONSTERS) {
      const h = awake({ monster: monster.id, mark: 3, seed: 11 });
      h.hunter.hp = h.hunter.maxHp = 1e6;
      const shown = new Set<string>();
      let t = 0;
      while (!h.over && t < 90) {
        t += STEP;
        h.step({ x: Math.sin(t * 0.7), y: Math.cos(t * 1.3) });
        for (const e of h.drain()) {
          if (e.t === 'tell') shown.add(e.attack);
          if (e.t === 'hurt' && e.who === 'hunter') expect(shown.has(e.by), e.by).toBe(true);
        }
      }
      expect(shown.size).toBeGreaterThanOrEqual(2);
    }
  });

  it('a roll goes through a blow, and cannot be made again at once', () => {
    const h = awake();
    h.hunter.x = h.monster.x - 140;
    next(h, 'spade');
    play(h, 0.85);
    const events = play(h, 0.2, (x) => ({ x: 0, y: 0, dodge: x.hunter.rollWait <= 0 }));
    expect(of(events, 'roll')).toHaveLength(1);
    expect(h.hunter.rollWait).toBeGreaterThan(1);
    const after = play(h, 0.3);
    expect(of([...events, ...after], 'dodged').length + (h.hunter.hp === h.hunter.maxHp ? 1 : 0)).toBeGreaterThan(0);
    expect(h.hunter.hp).toBe(h.hunter.maxHp);
  });

  it('a shape holds what is inside it and nothing else', () => {
    const base = { id: 1, x: 0, y: 0, angle: 0, len: 0, w: 0, r: 0, half: 0, inner: 0, left: 1, of: 1, dmg: 1, foe: true, attack: 'x', by: 0 };
    const line: Tell = { ...base, kind: 'line', len: 200, w: 60 };
    expect(inside(line, 100, 20)).toBe(true);
    expect(inside(line, 100, 40)).toBe(false);
    expect(inside(line, 220, 0)).toBe(false);
    expect(inside(line, -10, 0)).toBe(false);
    const cone: Tell = { ...base, kind: 'cone', r: 150, half: Math.PI / 4 };
    expect(inside(cone, 100, 50)).toBe(true);
    expect(inside(cone, 50, 100)).toBe(false);
    expect(inside(cone, -50, 0)).toBe(false);
    const ring: Tell = { ...base, kind: 'ring', r: 200, inner: 100 };
    expect(inside(ring, 150, 0)).toBe(true);
    expect(inside(ring, 50, 0)).toBe(false);
    expect(inside(ring, 250, 0)).toBe(false);
  });

  it('struck, the hunter cannot be struck again for a moment', () => {
    const h = awake({ monster: 'sexton' });
    h.hunter.x = h.monster.x - 120;
    next(h, 'spade');
    play(h, 1.0);
    const hp = h.hunter.hp;
    expect(h.hunter.grace).toBeGreaterThan(0);
    (h as unknown as { hurtHunter(n: number, by: string): void }).hurtHunter(50, 'spade');
    expect(h.hunter.hp).toBe(hp);
  });
});

describe('the monster', () => {
  it('uses the attacks of its round in their order, with a walk between', () => {
    const h = awake({ seed: 3 });
    h.hunter.hp = h.hunter.maxHp = 99999;
    const names = of(play(h, 25, (x) => ({ x: x.monster.x - 150 - x.hunter.x, y: x.monster.y - x.hunter.y })), 'tell').filter((e) => e.first).map((e) => e.attack);
    expect(names.slice(0, 4)).toEqual(['spade', 'sweep', 'spade', 'graves']);
    // The second mark's attack is not in a first mark's round.
    expect(names.includes('grasp')).toBe(false);
  });

  it('an attack kept for a higher mark is used at that mark', () => {
    const h = awake({ seed: 3, mark: 2 });
    h.hunter.hp = h.hunter.maxHp = 99999;
    const names = of(play(h, 40, (x) => ({ x: x.monster.x - 200 - x.hunter.x, y: x.monster.y - x.hunter.y })), 'tell').map((e) => e.attack);
    expect(names.includes('grasp')).toBe(true);
  });

  it('is open after an attack, and blows in the opening are what fill its stagger', () => {
    const h = awake();
    h.hunter.x = h.monster.x - 120;
    hold(h, 'walk');
    play(h, 3);
    const closed = h.monster.stagger;
    expect(closed).toBeGreaterThan(0);
    const g = awake();
    g.hunter.x = g.monster.x - 120;
    hold(g, 'recover');
    expect(g.open).toBe(true);
    play(g, 3);
    expect(g.monster.stagger).toBeGreaterThan(closed * 5);
  });

  it('breaks when its stagger is full: down for a while, taking far more, and harder to break the next time', () => {
    const h = awake();
    h.hunter.x = h.monster.x - 120;
    hold(h, 'recover');
    h.monster.stagger = h.monster.staggerMax - 1;
    const events = play(h, 1.2);
    expect(of(events, 'broken')).toHaveLength(1);
    expect(h.monster.state).toBe('broken');
    const hits = of(play(h, 2), 'hit').filter((e) => e.who === 'monster');
    expect(hits.every((e) => e.big && e.amount === byId(HUNTERS, 'marta').strike.dmg * h.monster.def.stagger.more)).toBe(true);
    const max = h.monster.staggerMax;
    h.hunter.x = 60;
    const after = play(h, 4);
    expect(of(after, 'rise')).toHaveLength(1);
    expect(h.monster.stagger).toBe(0);
    expect(h.monster.staggerMax).toBeGreaterThan(max);
    expect(h.tally.breaks).toBe(1);
  });

  it('changes at two thirds and at one third of its health, and no blow carries it past a change', () => {
    const h = awake();
    const call = h as unknown as { harm(n: number, by: string): void };
    call.harm(99999, 'test');
    expect(h.monster.hp).toBe(Math.ceil((h.monster.maxHp * 2) / 3));
    expect(h.monster.state).toBe('shift');
    // While it changes nothing hurts it.
    call.harm(500, 'test');
    expect(h.monster.hp).toBe(Math.ceil((h.monster.maxHp * 2) / 3));
    h.hunter.x = 60;
    const events = play(h, 3);
    expect(of(events, 'part').map((e) => e.part)).toEqual([1]);
    expect(h.monster.part).toBe(1);
    // Its change is shown before it throws anyone off.
    expect(of(events, 'land').length).toBeGreaterThan(0);
    call.harm(99999, 'test');
    expect(h.monster.hp).toBe(Math.ceil(h.monster.maxHp / 3));
    play(h, 3);
    expect(h.monster.part).toBe(2);
    call.harm(99999, 'test');
    expect(h.over).toBe('won');
    expect(h.monster.hp).toBe(0);
  });

  it('has more health, hits harder and shows its blows for less at a higher mark', () => {
    const one = awake({ mark: 1 });
    const three = awake({ mark: 3 });
    expect(three.monster.maxHp).toBeGreaterThan(one.monster.maxHp * 1.3);
    for (const h of [one, three]) {
      h.hunter.x = h.monster.x - 140;
      next(h, 'spade');
      play(h, 0.1);
    }
    expect(three.tells[0].dmg).toBeGreaterThan(one.tells[0].dmg);
    expect(three.tells[0].of).toBeLessThan(one.tells[0].of);
  });

  it('loses patience: after long enough its blows come sooner', () => {
    const h = awake();
    h.hunter.hp = h.hunter.maxHp = 1e9;
    (h as unknown as { time: number }).time = 419.9;
    const events = play(h, 1);
    expect(of(events, 'enrage')).toHaveLength(1);
    expect(h.monster.enraged).toBe(true);
  });
});

describe('the Sexton', () => {
  it('opens graves where the ground was marked, and the dead get up out of them', () => {
    const h = awake();
    h.hunter.x = h.monster.x - 300;
    next(h, 'graves');
    const events = play(h, 2);
    expect(of(events, 'tell')).toHaveLength(3);
    expect(of(events, 'summon')).toHaveLength(3);
    expect(h.helpers).toHaveLength(3);
  });

  it('the risen show their blow before it lands, and can be cut down', () => {
    const h = awake();
    hold(h, 'recover');
    h.hunter.x = 200;
    h.hunter.y = 200;
    h.helpers.push({ id: 900, def: byId(HELPERS, 'risen'), x: 230, y: 200, hp: 1000, face: 1, cool: 0, held: 0, moving: false, winding: false });
    h.hunter.since = -99;
    const events = play(h, 0.3);
    expect(of(events, 'tell').map((e) => e.attack)).toEqual(['risen']);
    expect(h.hunter.hp).toBe(h.hunter.maxHp);
    play(h, 0.4);
    expect(h.hunter.hp).toBeLessThan(h.hunter.maxHp);
    h.helpers[0].hp = 1;
    h.hunter.since = 99;
    const fell = play(h, 0.2);
    expect(of(fell, 'fall').some((e) => e.who === 'helper')).toBe(true);
    expect(h.helpers).toHaveLength(0);
  });

  it('buries: a mark opens under the hunter again and again, so standing still is death and walking is not', () => {
    const still = awake();
    still.monster.part = 2;
    still.hunter.x = still.monster.x - 400;
    next(still, 'bury');
    play(still, 4);
    expect(still.hunter.hp).toBeLessThan(still.hunter.maxHp);
    const walking = awake();
    walking.monster.part = 2;
    walking.hunter.x = walking.monster.x - 400;
    next(walking, 'bury');
    play(walking, 4, (x) => ({ x: Math.cos(x.time * 1.5), y: Math.sin(x.time * 1.5) }));
    expect(walking.hunter.hp).toBe(walking.hunter.maxHp);
  });
});

describe('the Antlered King', () => {
  const lined = (o = {}): Hunt => {
    const h = awake({ monster: 'king', ...o });
    h.stones.length = 0;
    h.monster.x = 800;
    h.monster.y = 400;
    h.hunter.x = 400;
    h.hunter.y = 400;
    return h;
  };

  it('runs down the line it showed, and strikes whoever is still in it as it passes', () => {
    const h = lined();
    next(h, 'charge');
    const events = play(h, 2.2);
    expect(of(events, 'dash')).toHaveLength(1);
    expect(of(events, 'hurt').some((e) => e.who === 'hunter' && e.by === 'charge')).toBe(true);
    expect(h.monster.x).toBeLessThan(400);
  });

  it('a hunter who steps aside is not touched, and the King who meets nothing is soon up again', () => {
    const h = lined();
    next(h, 'charge');
    const events = play(h, 2.2, (x) => ({ x: 0, y: x.tells.length ? 1 : 0 }));
    expect(h.hunter.hp).toBe(h.hunter.maxHp);
    expect(of(events, 'crash')).toHaveLength(0);
    expect(of(events, 'open').map((e) => e.why)).toEqual(['recover']);
  });

  it('a stone in his way dazes him for a long time and staggers him', () => {
    const h = lined();
    h.stones.push({ x: 300, y: 400, r: 34 });
    next(h, 'charge');
    const events = play(h, 2.2, (x) => ({ x: 0, y: x.tells.length ? 1 : 0 }));
    expect(of(events, 'crash').map((e) => e.into)).toEqual(['stone']);
    expect(h.monster.state).toBe('dazed');
    expect(h.monster.stagger).toBeGreaterThanOrEqual(30);
    expect(h.monster.left).toBeGreaterThan(1);
  });

  it('a barricade does the same once, and breaks', () => {
    const h = new Hunt(setup({ monster: 'king', buildings: [{ id: 'barricade', n: 1 }] }));
    h.stones.length = 0;
    h.hunter.x = 300;
    h.hunter.y = 400;
    h.hunter.aim = 0;
    h.step({ x: 0, y: 0, place: 'barricade' });
    h.step({ x: 0, y: 0, wake: true });
    h.monster.x = 800;
    h.monster.y = 400;
    next(h, 'charge');
    const events = play(h, 2.4, (x) => ({ x: 0, y: x.tells.length ? 1 : 0 }));
    expect(of(events, 'crash').map((e) => e.into)).toEqual(['barricade']);
    expect(h.buildings).toHaveLength(0);
    expect(h.monster.state).toBe('dazed');
  });

  it('his herd runs the field in lanes with safe ground between', () => {
    const h = lined();
    h.monster.part = 2;
    next(h, 'herd');
    play(h, 0.2);
    expect(h.tells).toHaveLength(4);
    // Somewhere across the field there is ground no lane covers.
    let safe = 0;
    for (let y = 60; y < h.h - 60; y += 4) if (!h.tells.some((t) => inside(t, 400, y))) safe++;
    expect(safe).toBeGreaterThan(40);
  });
});

describe('the hunter', () => {
  it('strikes by themselves at what is in reach, and at nothing that is not', () => {
    const h = awake();
    hold(h, 'recover');
    h.hunter.x = h.monster.x - 400;
    expect(of(play(h, 2), 'strike')).toHaveLength(0);
    h.hunter.x = h.monster.x - 110;
    const events = play(h, 2);
    expect(of(events, 'strike').length).toBeGreaterThanOrEqual(2);
    expect(h.monster.hp).toBeLessThan(h.monster.maxHp);
  });

  it("Jory's bolts fly, and bite harder from far off", () => {
    const near = awake({ hunter: 'jory' });
    hold(near, 'recover');
    near.hunter.x = near.monster.x - 150;
    const a = of(play(near, 1.5), 'hit').map((e) => e.amount);
    const far = awake({ hunter: 'jory' });
    hold(far, 'recover');
    far.hunter.x = far.monster.x - 380;
    const b = of(play(far, 1.8), 'hit').map((e) => e.amount);
    expect(a.length).toBeGreaterThan(0);
    expect(b[0]).toBeGreaterThan(a[0]);
  });

  it('Marta in her coat takes less than Jory from the same blow', () => {
    const hp = (hunter: string): number => {
      const h = awake({ hunter });
      h.hunter.x = h.monster.x - 140;
      next(h, 'spade');
      play(h, 1.2);
      return h.hunter.maxHp - h.hunter.hp;
    };
    expect(hp('marta')).toBeLessThan(hp('jory'));
  });

  it('an ability asked for in the middle of a roll is used as the roll ends', () => {
    const h = awake();
    hold(h, 'recover');
    h.step({ x: 1, y: 0, dodge: true });
    h.step({ x: 0, y: 0, b: true });
    expect(h.hunter.waits[1]).toBe(0);
    play(h, 0.4);
    expect(h.hunter.waits[1]).toBeGreaterThan(0);
  });

  it('falls when their health is gone, and the hunt is lost', () => {
    const h = awake();
    h.hunter.hp = 1;
    h.hunter.x = h.monster.x - 140;
    next(h, 'spade');
    const events = play(h, 2);
    expect(h.over).toBe('lost');
    expect(of(events, 'end')[0].won).toBe(false);
    expect(h.tally.killedBy).toBe('spade');
  });
});

describe('abilities', () => {
  it('Brace turns the next blow: nothing taken, the monster staggered and struck back', () => {
    const h = awake();
    h.hunter.x = h.monster.x - 140;
    next(h, 'spade');
    play(h, 0.5);
    const hp = h.monster.hp;
    const events = play(h, 0.7, (x) => ({ x: 0, y: 0, a: x.hunter.waits[0] <= 0 }));
    expect(of(events, 'turned')).toHaveLength(1);
    expect(h.hunter.hp).toBe(h.hunter.maxHp);
    expect(h.monster.stagger).toBeGreaterThanOrEqual(36);
    expect(h.monster.hp).toBeLessThan(hp);
    expect(h.hunter.waits[0]).toBeGreaterThan(5);
  });

  it('Reap strikes everything round her and throws the lesser back', () => {
    const h = awake();
    hold(h, 'recover');
    h.hunter.x = 300;
    h.hunter.y = 300;
    for (const [i, a] of [0, 2, 4].entries()) h.helpers.push({ id: 900 + i, def: byId(HELPERS, 'risen'), x: 300 + Math.cos(a) * 60, y: 300 + Math.sin(a) * 60, hp: 100, face: 1, cool: 9, held: 9, moving: false, winding: false });
    h.hunter.since = -99;
    h.step({ x: 0, y: 0, b: true });
    expect(h.helpers.every((f) => f.hp === 70)).toBe(true);
    expect(h.helpers.every((f) => Math.hypot(f.x - 300, f.y - 300) > 150)).toBe(true);
  });

  it("Jory's trap holds the monster that walks into it, and it takes more while held", () => {
    const h = awake({ hunter: 'jory' });
    h.hunter.x = h.monster.x - 200;
    h.hunter.since = -99;
    h.step({ x: 0, y: 0, a: true });
    expect(h.traps).toHaveLength(1);
    h.hunter.x = 80;
    hold(h, 'walk');
    const events = [];
    while (h.traps.length && h.time < 8) events.push(...play(h, 0.1));
    expect(of(events, 'trap')).toHaveLength(1);
    expect(of(events, 'open').some((e) => e.why === 'held')).toBe(true);
    expect(h.monster.state).toBe('held');
    expect(h.monster.soft).toBeGreaterThan(0);
  });

  it('no more than two of his traps lie at once', () => {
    const h = awake({ hunter: 'jory' });
    hold(h, 'recover');
    for (let i = 0; i < 3; i++) {
      h.hunter.waits[0] = 0;
      h.hunter.y += 80;
      h.step({ x: 0, y: 0, a: true });
    }
    expect(h.traps).toHaveLength(2);
  });

  it('his tar slows what stands in it, and burns when fire touches it', () => {
    const h = awake({ hunter: 'jory', buildings: [] });
    h.hunter.x = h.monster.x - 300;
    hold(h, 'recover');
    h.hunter.since = -99;
    h.step({ x: 0, y: 0, b: true });
    expect(h.pools).toHaveLength(1);
    expect(Math.hypot(h.pools[0].x - h.monster.x, h.pools[0].y - h.monster.y)).toBeLessThan(5);
    expect((h as unknown as { slowAt(x: number, y: number): number }).slowAt(h.monster.x, h.monster.y)).toBeLessThan(0.7);
    const hp = h.monster.hp;
    h.buildings.push({ id: 800, def: byId(BUILDINGS, 'watchfire'), x: h.monster.x + 60, y: h.monster.y, hp: 50, maxHp: 50, cool: 0 });
    const events = play(h, 3);
    expect(of(events, 'alight')).toHaveLength(1);
    expect(hp - h.monster.hp).toBeGreaterThan(20);
  });

  it("Agnes's flare blinds the monster out of what it was preparing, and her ward halves what lands in it", () => {
    const h = awake({ hunter: 'agnes' });
    h.hunter.x = h.monster.x - 140;
    next(h, 'spade');
    play(h, 0.4);
    const events = play(h, 0.1, (x) => ({ x: 0, y: 0, a: x.hunter.waits[0] <= 0 }));
    expect(of(events, 'open').map((e) => e.why)).toEqual(['blind']);
    expect(h.tells).toHaveLength(0);
    const harm = (ward: boolean): number => {
      const g = awake({ hunter: 'agnes' });
      g.hunter.x = g.monster.x - 140;
      if (ward) g.step({ x: 0, y: 0, b: true });
      next(g, 'spade');
      play(g, 1.2);
      return g.hunter.maxHp - g.hunter.hp;
    };
    expect(harm(true)).toBeLessThan(harm(false) * 0.6);
  });

  it("Brask's hounds fight beside him, hold the monster when set on, and get up at his whistle", () => {
    const h = awake({ hunter: 'brask' });
    expect(h.allies.filter((a) => a.group === 'hound')).toHaveLength(2);
    h.hunter.x = h.monster.x - 300;
    hold(h, 'walk');
    const events = play(h, 0.1, (x) => ({ x: 0, y: 0, a: x.hunter.waits[0] <= 0 }));
    expect(of(events, 'open').map((e) => e.why)).toEqual(['held']);
    expect(h.frenzy).toBeGreaterThan(3);
    const hp = h.monster.hp;
    play(h, 1.5);
    expect(h.monster.hp).toBeLessThan(hp);
    h.allies[0].state = 'down';
    h.allies[0].hp = 0;
    h.hunter.hp = 50;
    h.step({ x: 0, y: 0, b: true });
    expect(h.allies[0].state).toBe('heel');
    expect(h.allies[0].hp).toBeGreaterThan(0);
    expect(h.hunter.hp).toBeGreaterThan(50);
  });
});

describe('the horn', () => {
  it('calls what was brought, as often as it has charges, with a wait between', () => {
    const h = awake({ reinforcements: [{ id: 'pikemen', charges: 2 }] });
    hold(h, 'recover');
    h.step({ x: 0, y: 0, call: 0 });
    expect(h.allies).toHaveLength(4);
    expect(h.calls[0].left).toBe(1);
    h.step({ x: 0, y: 0, call: 0 });
    expect(h.allies).toHaveLength(4);
    play(h, 5.2);
    h.step({ x: 0, y: 0, call: 0 });
    expect(h.allies).toHaveLength(8);
    play(h, 5.2);
    h.step({ x: 0, y: 0, call: 0 });
    expect(h.allies).toHaveLength(8);
  });

  it('pikemen stand between the hunter and the monster, strike what comes in reach, and hurt a charge that meets them', () => {
    const h = awake({ monster: 'king', reinforcements: [{ id: 'pikemen', charges: 1 }] });
    h.stones.length = 0;
    h.monster.x = 800;
    h.monster.y = 400;
    h.hunter.x = 400;
    h.hunter.y = 400;
    hold(h, 'recover');
    h.step({ x: 0, y: 0, call: 0 });
    expect(h.allies.every((a) => a.x > 440 && a.x < 480)).toBe(true);
    next(h, 'charge');
    const hp = h.monster.hp;
    const events = play(h, 2.2, (x) => ({ x: 0, y: x.tells.length ? 1 : 0 }));
    expect(hp - h.monster.hp).toBeGreaterThanOrEqual(22);
    expect(of(events, 'hurt').some((e) => e.who === 'ally')).toBe(true);
  });

  it('crossbowmen stand back and shoot it', () => {
    const h = awake({ hunter: 'jory', reinforcements: [{ id: 'crossbowmen', charges: 1 }] });
    hold(h, 'recover');
    h.hunter.x = h.monster.x - 300;
    h.hunter.since = -999;
    h.step({ x: 0, y: 0, call: 0 });
    expect(h.allies.every((a) => a.x < h.hunter.x)).toBe(true);
    const events = play(h, 4);
    expect(of(events, 'loose').filter((e) => e.from === 'ally').length).toBeGreaterThanOrEqual(3);
    expect(h.tally.dealt.crossbowmen).toBeGreaterThan(0);
  });

  it('sappers run in, lay a charge that is shown, run out, and the blast staggers it', () => {
    const h = awake({ reinforcements: [{ id: 'sappers', charges: 1 }] });
    hold(h, 'recover');
    h.hunter.x = h.monster.x - 260;
    h.hunter.since = -999;
    h.step({ x: 0, y: 0, call: 0 });
    const events = play(h, 6);
    expect(of(events, 'tell').filter((e) => e.attack === 'charge')).toHaveLength(2);
    expect(of(events, 'blast')).toHaveLength(2);
    expect(h.tally.dealt.sappers).toBeGreaterThanOrEqual(60);
    expect(h.monster.stagger).toBeGreaterThan(30);
    // They were clear of their own charge.
    expect(of(events, 'fall').filter((e) => e.who === 'ally')).toHaveLength(0);
  });
});

describe('buildings', () => {
  const built = (id: string, o = {}): Hunt => {
    const h = new Hunt(setup({ buildings: [{ id, n: 1 }], ...o }));
    h.hunter.aim = 0;
    h.step({ x: 0, y: 0, place: id });
    h.step({ x: 0, y: 0, wake: true });
    h.drain();
    return h;
  };

  it('a ballista shoots the monster by itself', () => {
    const h = built('ballista');
    hold(h, 'recover');
    const events = play(h, 9);
    expect(of(events, 'loose').filter((e) => e.from === 'ballista').length).toBeGreaterThanOrEqual(2);
    expect(h.tally.dealt.ballista).toBeGreaterThanOrEqual(30);
  });

  it('by a watchfire the hunter strikes faster', () => {
    const blows = (fire: boolean): number => {
      const h = fire ? built('watchfire') : awake();
      hold(h, 'recover');
      h.monster.x = h.hunter.x + 120;
      h.monster.y = h.hunter.y;
      return of(play(h, 10), 'strike').length;
    };
    expect(blows(true)).toBeGreaterThan(blows(false));
  });

  it('a bell rung while the monster prepares breaks what it was preparing', () => {
    const h = built('bellpost');
    h.monster.x = h.hunter.x + 200;
    h.monster.y = h.hunter.y;
    next(h, 'spade');
    h.hunter.since = 99;
    const events = play(h, 0.3);
    expect(of(events, 'bell')).toHaveLength(1);
    expect(h.tells).toHaveLength(0);
    expect(h.monster.state).toBe('dazed');
    expect(h.buildings[0].cool).toBeGreaterThan(10);
    // It cannot be rung again at once.
    next(h, 'spade');
    h.hunter.since = 99;
    expect(of(play(h, 0.3), 'bell')).toHaveLength(0);
  });

  it('what a blow lands on is broken in the end', () => {
    const h = built('watchfire');
    h.monster.x = h.buildings[0].x + 120;
    h.monster.y = h.buildings[0].y;
    h.hunter.x = h.buildings[0].x;
    h.hunter.y = h.buildings[0].y + 40;
    h.hunter.hp = h.hunter.maxHp = 1e6;
    const events = play(h, 40, { x: 0, y: 0 });
    expect(of(events, 'fall').some((e) => e.who === 'building')).toBe(true);
  });
});

describe('trophies', () => {
  it("the Sexton's spade leaves one health, once", () => {
    const h = awake({ trophy: 'spade' });
    const call = h as unknown as { hurtHunter(n: number, by: string): void };
    call.hurtHunter(9999, 'spade');
    expect(h.hunter.hp).toBe(1);
    expect(h.over).toBe(null);
    h.hunter.grace = 0;
    call.hurtHunter(9999, 'spade');
    expect(h.over).toBe('lost');
  });

  it("the King's tine carries a roll further and brings it back sooner", () => {
    const far = (trophy: string | null): [number, number] => {
      const h = awake({ trophy });
      hold(h, 'recover');
      const x = h.hunter.x;
      h.step({ x: -1, y: 0, dodge: true });
      play(h, 0.5);
      return [x - h.hunter.x, h.hunter.rollWait];
    };
    expect(far('antler')[0]).toBeGreaterThan(far(null)[0] + 20);
    expect(far('antler')[1]).toBeLessThan(far(null)[1]);
  });
});

describe('a hunt as a whole', () => {
  it('the same seed and the same steering give the same hunt', () => {
    const run = (): string => {
      const h = awake({ seed: 99, reinforcements: [{ id: 'pikemen', charges: 1 }] });
      const events = play(h, 30, (x) => ({ x: Math.sin(x.time), y: Math.cos(x.time * 0.7), call: x.time > 3 && x.time < 3.1 ? 0 : undefined, dodge: Math.floor(x.time * 2) % 5 === 0 }));
      return JSON.stringify(events.length) + ':' + Math.round(h.hunter.hp) + ':' + Math.round(h.monster.hp) + ':' + Math.round(h.hunter.x);
    };
    expect(run()).toBe(run());
  });

  it('nobody leaves the field', () => {
    const h = awake({ monster: 'king', seed: 5 });
    h.hunter.hp = h.hunter.maxHp = 1e9;
    for (let t = 0; t < 60; t += STEP) {
      h.step({ x: -1, y: -1, dodge: true });
      expect(h.hunter.x).toBeGreaterThanOrEqual(46);
      expect(h.monster.x).toBeGreaterThanOrEqual(46);
      expect(h.monster.x).toBeLessThanOrEqual(h.w - 46);
      expect(h.monster.y).toBeGreaterThanOrEqual(46);
      expect(h.monster.y).toBeLessThanOrEqual(h.h - 46);
    }
  });

  it('a tall window has the field stood up', () => {
    const h = new Hunt(setup({ tall: true }));
    expect(h.h).toBeGreaterThan(h.w);
    expect(h.monster.y).toBeLessThan(h.hunter.y);
  });
});
