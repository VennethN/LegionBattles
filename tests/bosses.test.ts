// The four bosses that came after the King, and the four hunters they open: what is new in each is held here.

import { describe, expect, it } from 'vitest';
import { BLEED, HELPERS, HUNTERS, MARKER, MINION, MONSTERS, WHERE, WHY, byId } from '../src/game/content';
import { STEP, type Hunt } from '../src/game/hunt';
import { awake, hold, next, of, play } from './lair';

const NEW_BOSSES = ['spinner', 'abbot', 'furnace', 'mirror'];
const NEW_HUNTERS = ['greta', 'ned', 'ida', 'silas'];

/** The hunt's own workings, for a test that sets something up by hand. */
type Inner = { use(h: unknown, i: 0 | 1, steer?: unknown): void; harm(n: number, by: string, who?: number): void; harmHelper(f: unknown, n: number): void };
const inner = (h: Hunt): Inner => h as unknown as Inner;

/** A hunt with the boss stood still, and the hunter set down where the test wants them. */
function stood(monster: string, hunter = 'marta', o = {}): Hunt {
  const h = awake({ monster, hunter, ...o });
  h.stones.length = 0;
  h.monster.x = 700;
  h.monster.y = 400;
  h.hunter.x = 560;
  h.hunter.y = 400;
  h.hunter.aim = 0;
  return h;
}

describe('the tables', () => {
  it('each boss after the King is opened by the one before, and opens one hunter', () => {
    const order = MONSTERS.map((m) => m.id);
    expect(order).toEqual(['sexton', 'king', ...NEW_BOSSES]);
    for (let i = 1; i < MONSTERS.length; i++) expect(MONSTERS[i].after).toBe(MONSTERS[i - 1].id);
    NEW_HUNTERS.forEach((id, i) => expect(byId(HUNTERS, id).opens).toBe(byId(MONSTERS, NEW_BOSSES[i]).trophy.id));
  });

  it('each has a place, reasons to be hunted, minions, and its lair props among the helpers', () => {
    for (const id of NEW_BOSSES) {
      const m = byId(MONSTERS, id);
      expect(WHERE[id], id).toBeTruthy();
      expect(WHY[id].length, id).toBeGreaterThanOrEqual(10);
      expect(HELPERS.some((f) => f.id === MINION[id]), id).toBe(true);
      if (MARKER[id]) expect(byId(HELPERS, MARKER[id]).still, id).toBe(true);
      if (m.props) expect(byId(HELPERS, m.props.id).still, id).toBe(true);
    }
  });
});

describe('the Spinner', () => {
  it('her spit lands as webs, and a web walked into holds the hunter and tears', () => {
    const h = stood('spinner');
    h.helpers = [];
    next(h, 'spit');
    play(h, 0.1);
    const ring = h.tells.find((t) => t.attack === 'spit') as Hunt['tells'][number];
    // Out of the first circle, then walked back into where it was.
    h.hunter.x = ring.x + 200;
    h.hunter.y = ring.y;
    play(h, 1.2);
    expect(h.pools.some((p) => p.def.id === 'web')).toBe(true);
    const web = h.pools.find((p) => p.def.id === 'web' && Math.hypot(p.x - ring.x, p.y - ring.y) < 1) as Hunt['pools'][number];
    hold(h, 'recover');
    h.hunter.x = web.x + web.r - 4;
    h.hunter.y = web.y;
    play(h, 0.05, { x: -1, y: 0 });
    expect(h.hunter.root).toBeGreaterThan(0.5);
    expect(web.life).toBeLessThanOrEqual(0);
  });

  it('the Silk halves the hold', () => {
    const rooted = (trophy: string | null): number => {
      const h = stood('spinner', 'marta', { trophy });
      h.helpers = [];
      hold(h, 'recover');
      h.pools.push({ id: 999, x: h.hunter.x + 20, y: h.hunter.y, r: 40, life: 5, burning: 0, def: { id: 'web', name: 'Web', says: '', kind: 'pool', wait: 0, hold: 0.8 } });
      h.step({ x: 1, y: 0 });
      return h.hunter.root;
    };
    expect(rooted('silk')).toBeCloseTo(rooted(null) / 2, 1);
  });

  it('nothing reaches her in the air; she comes down in her ring and is soft while she climbs back', () => {
    const h = stood('spinner');
    h.helpers = [];
    next(h, 'drop');
    play(h, 0.2);
    expect(h.monster.aloft).toBe(true);
    const before = h.monster.hp;
    inner(h).harm(50, 'test');
    expect(h.monster.hp).toBe(before);
    const ring = h.tells.find((t) => t.attack === 'drop') as Hunt['tells'][number];
    h.hunter.x = 200;
    play(h, 1.4);
    expect(h.monster.aloft).toBe(false);
    expect(Math.hypot(h.monster.x - ring.x, h.monster.y - ring.y)).toBeLessThan(60);
    expect(h.monster.state).toBe('recover');
    const soft = h.monster.hp;
    inner(h).harm(40, 'test');
    expect(soft - h.monster.hp).toBeGreaterThanOrEqual(58);
  });

  it('her sacs hatch young while they stand, and a broken sac hatches no more', () => {
    const h = stood('spinner');
    const sacs = h.helpers.filter((f) => f.def.id === 'eggsac');
    expect(sacs.length).toBe(3);
    h.hunter.hp = h.hunter.maxHp = 1e6;
    hold(h, 'recover', 99);
    const events = play(h, 18);
    expect(of(events, 'summon').length).toBeGreaterThanOrEqual(3);
    for (const s of sacs) inner(h).harmHelper(s, 9999);
    h.helpers = h.helpers.filter((f) => f.def.still);
    play(h, 20);
    expect(h.helpers.filter((f) => f.def.id === 'spiderling')).toHaveLength(0);
  });
});

describe('the Bell Abbot', () => {
  it('his toll has safe ground between its rings', () => {
    const hurt = (d: number): boolean => {
      const h = stood('abbot');
      h.pools = [];
      h.hunter.x = h.monster.x - d;
      next(h, 'toll');
      const events = play(h, 1.6);
      return of(events, 'hurt').some((e) => e.who === 'hunter');
    };
    expect(hurt(80)).toBe(true);
    expect(hurt(190)).toBe(false);
    expect(hurt(330)).toBe(true);
  });

  it('his monks walk round singing and mend him, but never past the part he is in', () => {
    const h = stood('abbot');
    hold(h, 'recover', 99);
    const monk = byId(HELPERS, 'monk');
    h.monster.hp -= 600;
    const low = h.monster.hp;
    h.helpers.push({ id: 900, def: monk, x: 300, y: 300, hp: monk.hp, face: 1, cool: 0, held: 0, moving: false, winding: false });
    const [x0, y0] = [300, 300];
    const events = play(h, 4);
    expect(h.monster.hp).toBeGreaterThan(low + 4);
    expect(of(events, 'mend').length).toBeGreaterThan(0);
    const m = h.helpers.find((f) => f.id === 900) as Hunt['helpers'][number];
    expect(Math.hypot(m.x - x0, m.y - y0)).toBeGreaterThan(80);
    play(h, 200);
    expect(h.monster.hp).toBeLessThanOrEqual(h.monster.maxHp);
  });

  it('the shallows slow a hunter walking through them', () => {
    const h = stood('abbot');
    hold(h, 'recover', 99);
    const pool = h.pools.find((p) => p.def.id === 'water') as Hunt['pools'][number];
    const walk = (x: number, y: number): number => {
      h.hunter.x = x;
      h.hunter.y = y;
      h.hunter.roll = 0;
      const from = h.hunter.x;
      h.step({ x: 1, y: 0 });
      return h.hunter.x - from;
    };
    const wet = walk(pool.x - 20, pool.y);
    const dry = walk(60, 60);
    expect(wet).toBeLessThan(dry * 0.75);
  });
});

describe('the Furnace', () => {
  it('hot, it takes little; cooled by a barrel broken next to it, it takes more', () => {
    const h = stood('furnace');
    hold(h, 'recover', 99);
    h.monster.heat = 80;
    let hp = h.monster.hp;
    inner(h).harm(100, 'test');
    const hot = hp - h.monster.hp;
    const barrel = h.helpers.find((f) => f.def.id === 'barrel') as Hunt['helpers'][number];
    barrel.x = h.monster.x + 80;
    barrel.y = h.monster.y;
    const events: ReturnType<Hunt['drain']> = [];
    inner(h).harmHelper(barrel, 999);
    events.push(...h.drain());
    expect(of(events, 'cool')).toHaveLength(1);
    expect(h.monster.heat).toBeLessThanOrEqual(30);
    hp = h.monster.hp;
    inner(h).harm(100, 'test');
    expect(hp - h.monster.hp).toBeGreaterThan(hot * 3);
  });

  it('a barrel broken far from it cools nothing, and another is rolled in after a while', () => {
    const h = stood('furnace');
    hold(h, 'recover', 99);
    h.monster.heat = 80;
    const barrels = h.helpers.filter((f) => f.def.id === 'barrel').length;
    const far = h.helpers.find((f) => f.def.id === 'barrel' && Math.hypot(f.x - h.monster.x, f.y - h.monster.y) > 300) as Hunt['helpers'][number];
    inner(h).harmHelper(far, 999);
    expect(h.monster.heat).toBeGreaterThan(70);
    h.hunter.hp = h.hunter.maxHp = 1e6;
    play(h, 20);
    expect(h.helpers.filter((f) => f.def.id === 'barrel').length).toBe(barrels);
  });

  it('left alone it heats up until it vents, shown first, and is left cool and open', () => {
    const h = stood('furnace');
    h.helpers = [];
    h.hunter.x = 100;
    h.hunter.hp = h.hunter.maxHp = 1e6;
    h.monster.heat = 100;
    h.monster.state = 'walk';
    h.monster.left = 0;
    const events = play(h, 0.5);
    expect(of(events, 'tell').some((e) => e.attack === 'overheat')).toBe(true);
    play(h, 1.6);
    expect(h.monster.heat).toBeLessThanOrEqual((byId(MONSTERS, 'furnace').heat?.after ?? 0) + 5);
    expect(h.monster.state).toBe('recover');
  });
});

describe('the Mirror King', () => {
  it('steps out of one mirror and leaves a reflection in each of the others', () => {
    const h = stood('mirror');
    h.hunter.hp = h.hunter.maxHp = 1e6;
    const mirrors = h.helpers.filter((f) => f.def.id === 'mirror');
    expect(mirrors).toHaveLength(4);
    next(h, 'step');
    play(h, 0.1);
    const rings = h.tells.filter((t) => t.attack === 'step');
    expect(rings).toHaveLength(4);
    const to = rings.find((t) => t.swapTo) as Hunt['tells'][number];
    play(h, 1.2);
    expect(Math.hypot(h.monster.x - to.x, h.monster.y - to.y)).toBeLessThan(90);
    const copies = h.helpers.filter((f) => f.def.id === 'reflection');
    expect(copies).toHaveLength(3);
    // A mirror broken takes its reflection with it.
    const tie = copies[0].tie as number;
    inner(h).harmHelper(h.helpers.find((f) => f.id === tie), 9999);
    expect(h.helpers.filter((f) => f.def.id === 'reflection')).toHaveLength(2);
  });

  it('with every mirror broken, he only steps to where he was marked', () => {
    const h = stood('mirror');
    for (const f of h.helpers.filter((x) => x.def.id === 'mirror')) inner(h).harmHelper(f, 9999);
    next(h, 'step');
    play(h, 0.1);
    expect(h.tells.filter((t) => t.attack === 'step')).toHaveLength(1);
    play(h, 1.2);
    expect(h.helpers.filter((f) => f.def.id === 'reflection')).toHaveLength(0);
  });
});

describe('the hunters who came later', () => {
  const swing = (h: Hunt, seconds: number): ReturnType<Hunt['drain']> => play(h, seconds, (x) => ({ x: 0, y: 0, attack: true, aim: Math.atan2(x.monster.y - x.hunter.y, x.monster.x - x.hunter.x) }));

  it("Greta's blows fill more stagger than their harm, and her second stuns what it lands on", () => {
    const fill = (hunter: string): number => {
      const h = stood('sexton', hunter);
      h.hunter.x = h.monster.x - 100;
      hold(h, 'recover');
      const hp = h.monster.hp;
      swing(h, 2.4);
      return h.monster.stagger / Math.max(1, hp - h.monster.hp);
    };
    expect(fill('greta')).toBeGreaterThan(fill('marta') * 1.3);
    const h = stood('sexton', 'greta');
    const risen = byId(HELPERS, 'risen');
    hold(h, 'recover');
    h.hunter.chain = 1;
    h.hunter.chainLeft = 1;
    h.helpers.push({ id: 901, def: risen, x: h.hunter.x + 70, y: h.hunter.y + 20, hp: 999, face: 1, cool: 5, held: 0, moving: false, winding: false });
    play(h, 0.7, { x: 0, y: 0, attack: true, aim: 0 });
    expect(h.helpers.find((f) => f.id === 901)?.held).toBeGreaterThan(1);
  });

  it("Greta's forge strike burns and cracks; her anvil is shown, holds what it falls on, and stays as cover", () => {
    const h = stood('sexton', 'greta');
    h.hunter.x = h.monster.x - 110;
    hold(h, 'walk', 99);
    inner(h).use(h.hunter, 0, { x: 0, y: 0, aim: 0 });
    expect(h.monster.burn).toBeGreaterThan(0);
    expect(h.monster.cracked).toBeGreaterThan(0);
    const hp = h.monster.hp;
    play(h, 3);
    expect(h.monster.hp).toBeLessThan(hp);
    const g = stood('sexton', 'greta');
    g.hunter.x = g.monster.x - 120;
    hold(g, 'walk', 99);
    inner(g).use(g.hunter, 1, { x: 0, y: 0, aim: 0 });
    const anvil = g.tells.find((t) => t.own === 'anvil');
    expect(anvil?.foe).toBe(false);
    const events = play(g, 1.0);
    expect(of(events, 'open').some((e) => e.why === 'held')).toBe(true);
    expect(g.stones.length).toBe(1);
    play(g, 16);
    expect(g.stones.length).toBe(0);
  });

  it("Ned's keg is shown with its fuse, and hurts a hunter left in it; a roll goes through", () => {
    const blown = (roll: boolean): number => {
      const h = stood('sexton', 'ned');
      h.helpers = [];
      h.hunter.x = h.monster.x - 60;
      hold(h, 'recover', 99);
      inner(h).use(h.hunter, 0);
      expect(h.tells.some((t) => t.own === 'keg')).toBe(true);
      play(h, 1.35);
      if (roll) h.step({ x: -1, y: 0, dodge: true });
      play(h, 0.5);
      return h.hunter.maxHp - h.hunter.hp;
    };
    expect(blown(false)).toBeGreaterThan(0);
    expect(blown(true)).toBe(0);
  });

  it("Ned's rocks come down where they were shown, and his pick wrecks what stands still", () => {
    const h = stood('sexton', 'ned');
    h.hunter.x = h.monster.x - 200;
    hold(h, 'recover', 99);
    inner(h).use(h.hunter, 1, { x: 0, y: 0, aim: 0 });
    const hp = h.monster.hp;
    expect(h.tells.some((t) => t.own === 'cavein' && t.kind === 'line')).toBe(true);
    play(h, 0.5);
    expect(h.monster.hp).toBe(hp);
    play(h, 0.7);
    expect(h.monster.hp).toBeLessThan(hp - 30);
    const blow = (hunter: string): number => {
      const w = stood('sexton', hunter, { terms: { variants: [], tasks: [{ id: 'markers', n: 1 }] } });
      const marker = w.helpers.find((f) => f.marker) as Hunt['helpers'][number];
      w.monster.x = 1100;
      hold(w, 'recover', 99);
      w.hunter.x = marker.x - 70;
      w.hunter.y = marker.y;
      const before = marker.hp;
      play(w, 0.6, { x: 0, y: 0, attack: true, aim: 0 });
      return before - marker.hp;
    };
    expect(blow('ned')).toBeGreaterThanOrEqual(blow('marta') * 2);
  });

  it("Ida's shove puts a boss off a blow it is winding up, and throws small things back", () => {
    const h = stood('sexton', 'ida');
    h.hunter.x = h.monster.x - 160;
    next(h, 'spade');
    play(h, 0.2);
    expect(h.monster.state).toBe('tell');
    inner(h).use(h.hunter, 0, { x: 0, y: 0, aim: 0 });
    expect(h.monster.state).toBe('dazed');
    expect(h.tells.filter((t) => t.foe && t.by === 0)).toHaveLength(0);
    const risen = byId(HELPERS, 'risen');
    const g = stood('sexton', 'ida');
    hold(g, 'recover', 99);
    g.monster.x = 1100;
    g.helpers.push({ id: 902, def: risen, x: g.hunter.x + 80, y: g.hunter.y, hp: 999, face: 1, cool: 5, held: 0, moving: false, winding: false });
    inner(g).use(g.hunter, 0, { x: 0, y: 0, aim: 0 });
    expect((g.helpers.find((f) => f.id === 902)?.x ?? 0) - g.hunter.x).toBeGreaterThan(200);
  });

  it("Ida's lantern leaves light that hastens hunters and slows the boss", () => {
    const h = stood('sexton', 'ida');
    hold(h, 'recover', 99);
    h.monster.x = 1100;
    h.hunter.x = 200;
    inner(h).use(h.hunter, 1);
    play(h, 1.2, { x: 1, y: 0 });
    expect(h.wards.length).toBeGreaterThan(1);
    const w = h.wards[0];
    const g = stood('sexton', 'ida');
    hold(g, 'recover', 99);
    g.monster.x = 1100;
    g.hunter.x = 300;
    const plain = g.hunter.x;
    play(g, 0.5, { x: 1, y: 0 });
    const dry = g.hunter.x - plain;
    h.hunter.x = w.x;
    h.hunter.y = w.y;
    const from = h.hunter.x;
    play(h, 0.5, { x: 1, y: 0 });
    expect(h.hunter.x - from).toBeGreaterThan(dry * 1.15);
  });

  it("Silas's cuts make the boss bleed, more with every cut, and the wounds close in the end", () => {
    const h = stood('sexton', 'silas');
    h.hunter.x = h.monster.x - 80;
    hold(h, 'recover', 99);
    swing(h, 1.5);
    expect(h.monster.bleed).toBeGreaterThanOrEqual(3);
    const hp = h.monster.hp;
    play(h, 1);
    expect(hp - h.monster.hp).toBeGreaterThanOrEqual(Math.floor(BLEED.dps * 2));
    play(h, 20);
    expect(h.monster.bleed).toBe(0);
  });

  it("Silas's hook drags a small thing to him, or him to the boss; his hack is a flurry of cuts", () => {
    const h = stood('sexton', 'silas');
    hold(h, 'recover', 99);
    h.hunter.x = h.monster.x - 300;
    inner(h).use(h.hunter, 0, { x: 0, y: 0, aim: 0 });
    expect(h.monster.x - h.hunter.x).toBeLessThan(120);
    const risen = byId(HELPERS, 'risen');
    const g = stood('sexton', 'silas');
    hold(g, 'recover', 99);
    g.helpers.push({ id: 903, def: risen, x: g.hunter.x + 250, y: g.hunter.y, hp: 999, face: 1, cool: 5, held: 0, moving: false, winding: false });
    inner(g).use(g.hunter, 0, { x: 0, y: 0, aim: 0 });
    expect((g.helpers.find((f) => f.id === 903)?.x ?? 0) - g.hunter.x).toBeLessThan(70);
    const k = stood('sexton', 'silas');
    k.hunter.x = k.monster.x - 80;
    hold(k, 'recover', 99);
    inner(k).use(k.hunter, 1, { x: 0, y: 0, aim: 0 });
    let cuts = 0;
    for (let t = 0; t < 1.2; t += STEP) {
      k.step({ x: 0, y: 0 });
      cuts += of(k.drain(), 'strike').length;
    }
    expect(cuts).toBe(6);
    expect(k.monster.bleed).toBeGreaterThanOrEqual(5);
  });
});
