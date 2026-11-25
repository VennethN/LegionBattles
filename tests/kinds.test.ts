import { describe, expect, it } from 'vitest';
import { GIFTS, KINDS, KIND_STEPS, SIGNATURES, WEAPONS, countKinds, giftsOf, kindStep, weaponOf, type Kind } from '../src/game/data';
import { kindCounts, kindsOf, newRun, statsOf, type RunData } from '../src/game/run';
import { hasteRate } from '../src/game/stats';
import { World, type Carried, type Ev, type Setup } from '../src/game/world';
import { alone, play, setup, stand, stats } from './field';

const has = <T extends Ev['t']>(events: readonly Ev[], t: T): Extract<Ev, { t: T }>[] => events.filter((e): e is Extract<Ev, { t: T }> => e.t === t);
const carry = (...ids: string[]): Carried[] => ids.map((id) => ({ id, tier: 0 }));

/** A wave fought with these weapons and nothing else, by nobody in particular. */
const armed = (ids: string[], o: Partial<Setup> = {}): World => alone(new World(setup({ weapons: carry(...ids), ...o, stats: stats({ maxHp: 9999, crit: -1000 }) })));

/** Lets only one of the weapons strike. */
const only = (w: World, id: string): void => {
  for (const s of w.slots) s.cool = s.def.id === id ? 0 : 9999;
};

const run = (hero: string, ...ids: string[]): RunData => ({ ...newRun(hero, 5), weapons: carry(...ids) });

describe('the kinds of weapon', () => {
  it('every weapon is of one kind or two, a hero\'s own among them', () => {
    const known = new Set(KINDS.map((k) => k.id));
    for (const w of [...WEAPONS, ...SIGNATURES]) {
      expect(w.kinds.length, w.id).toBeGreaterThanOrEqual(1);
      expect(w.kinds.length, w.id).toBeLessThanOrEqual(2);
      expect(new Set(w.kinds).size, w.id).toBe(w.kinds.length);
      for (const k of w.kinds) expect(known.has(k), `${w.id}: ${k}`).toBe(true);
    }
  });

  it('every kind has at least four weapons that can be bought, so that all of its gift can be had', () => {
    const counts = countKinds(WEAPONS);
    for (const k of KINDS) expect(counts[k.id], k.id).toBeGreaterThanOrEqual(KIND_STEPS[KIND_STEPS.length - 1]);
  });

  it('no two weapons are the same weapon by another name', () => {
    const shape = (id: string): string => {
      const w = weaponOf(id);
      return JSON.stringify([w.kind, w.motion, w.dmg, w.every, w.range, w.pierce, w.burst, w.burn, w.slow, w.cloud, w.leaps, w.stun, w.mends, w.holy, w.arc]);
    };
    expect(new Set(WEAPONS.map((w) => shape(w.id))).size).toBe(WEAPONS.length);
    expect(new Set(WEAPONS.map((w) => w.name)).size).toBe(WEAPONS.length);
  });

  it('two, three and four of a kind are the three steps of its gift', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(kindStep)).toEqual([0, 0, 1, 2, 3, 3, 3]);
    for (const k of KINDS) for (const line of k.says) expect(line.length, k.id).toBeGreaterThan(5);
    // Nothing held changes nothing.
    const none = giftsOf(countKinds([]));
    expect(none).toEqual({ reach: 0, thrust: 0, stun: 0, knock: 1, bowHaste: 0, leaps: 0, burst: 1, burnMore: 0, burnBy: 1, slowBy: 0, slowMore: 0, cloudR: 1, cloudBy: 1, free: 0 });
  });

  it('the camp is told what is held of each kind, what that gives and what the next step asks for; a hero\'s own weapon counts', () => {
    const r = run('bram', 'sword', 'dagger', 'spear');
    expect(kindCounts(r).blade).toBe(3);
    const held = kindsOf(r);
    expect(held.map((k) => [k.kind, k.held, k.step])).toEqual([['blade', 3, 2], ['pole', 1, 0]]);
    expect(held[0].says).toBe(KINDS[0].says[1]);
    expect(held[0].next).toEqual({ at: 4, says: KINDS[0].says[2] });
    expect(held[1].says).toBe('');
    expect(held[1].next?.at).toBe(2);
    const full = kindsOf(run('bram', 'sword', 'dagger', 'halberd'));
    expect(full[0].step).toBe(3);
    expect(full[0].next).toBeNull();
    // A weapon of two kinds counts for both, once each.
    expect(kindCounts(run('hroth')).blade).toBe(1);
    expect(kindCounts(run('hroth')).blunt).toBe(1);
  });
});

describe('gifts', () => {
  it('Blade: critical chance, in the hero\'s own stats', () => {
    const base = statsOf(run('wren')).crit;
    expect(statsOf(run('bram')).crit).toBe(base);
    expect(statsOf(run('bram', 'sword')).crit).toBe(base + GIFTS.blade.crit[0]);
    expect(statsOf(run('bram', 'sword', 'dagger')).crit).toBe(base + GIFTS.blade.crit[1]);
    expect(statsOf(run('bram', 'sword', 'dagger', 'halberd')).crit).toBe(base + GIFTS.blade.crit[2]);
  });

  it('Pole: everything reaches further, and at the last step a thrust goes through one more', () => {
    const one = armed(['spear', 'bow']);
    const two = armed(['spear', 'halberd', 'bow']);
    for (const id of ['spear', 'bow']) expect(two.rangeOf(weaponOf(id)) / one.rangeOf(weaponOf(id))).toBeCloseTo(1 + GIFTS.pole.reach[0]);
    const struck = (ids: string[]): number => {
      const w = armed(ids);
      only(w, 'spear');
      for (let i = 0; i < 6; i++) stand(w, 'cutpurse', w.hero.x + 40 + i * 14, w.hero.y, { hp: 99999 }, true);
      return new Set(has(play(w, 0.1), 'hit').map((e) => e.id)).size;
    };
    expect(struck(['spear'])).toBe(3);
    expect(struck(['spear', 'halberd', 'trident', 'javelin'])).toBe(3 + GIFTS.pole.thrust[2]);
  });

  it('Blunt: stuns last longer, and blows throw back further', () => {
    const slam = (ids: string[]): { stun: number; thrown: number } => {
      const w = armed(ids);
      only(w, 'hammer');
      const f = stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 99999 }, true);
      // The one the hammer lands on is not thrown anywhere: the one beside it is.
      const beside = stand(w, 'bruiser', w.hero.x + 60, w.hero.y + 30, { hp: 99999 }, true);
      w.step({ x: 0, y: 0 });
      return { stun: f.stun, thrown: Math.hypot(beside.kx, beside.ky) };
    };
    const plain = slam(['hammer']);
    const two = slam(['hammer', 'mace']);
    expect(two.stun - plain.stun).toBeCloseTo(GIFTS.blunt.stun[0]);
    expect(two.thrown / plain.thrown).toBeCloseTo(GIFTS.blunt.knock[0]);
  });

  it('Bow: what shoots or is thrown strikes more often, and nothing else does', () => {
    const one = armed(['bow', 'sword', 'sling']);
    const two = armed(['bow', 'crossbow', 'sword', 'sling']);
    const every = (w: World, id: string): number => w.everyOf(w.slots.find((s) => s.def.id === id) as World['slots'][number]);
    expect(every(one, 'bow') / every(two, 'bow')).toBeCloseTo(hasteRate(GIFTS.bow.haste[0]));
    expect(every(one, 'sling') / every(two, 'sling')).toBeCloseTo(hasteRate(GIFTS.bow.haste[0]));
    expect(every(two, 'sword')).toBe(every(one, 'sword'));
  });

  it('Thrown: what is thrown straight skips on to more, and at the next step bursts are wider', () => {
    const leaps = (ids: string[], id: string): number => {
      const w = armed(ids);
      only(w, id);
      stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 99999 }, true);
      w.step({ x: 0, y: 0 });
      return w.shots[0].leaps;
    };
    expect(leaps(['sling'], 'sling')).toBe(1);
    expect(leaps(['sling', 'javelin'], 'sling')).toBe(1 + GIFTS.thrown.leaps[0]);
    expect(leaps(['sling', 'javelin'], 'javelin')).toBe(GIFTS.thrown.leaps[0]);
    // An arrow is not thrown.
    expect(leaps(['sling', 'javelin', 'bow'], 'bow')).toBe(0);
    const burst = (ids: string[]): number => {
      const w = armed(ids);
      only(w, 'bomb');
      stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 99999 }, true);
      return has(play(w, 1.5), 'burst')[0].r;
    };
    expect(burst(['bomb', 'sling', 'javelin']) / burst(['bomb'])).toBeCloseTo(GIFTS.thrown.burst[1]);
  });

  it('Fire: fires burn longer, and at the last step hotter', () => {
    const lit = (ids: string[]): { burn: number; by: number } => {
      const w = armed(ids);
      only(w, 'torch');
      const f = stand(w, 'bruiser', w.hero.x + 50, w.hero.y, { hp: 99999 }, true);
      w.step({ x: 0, y: 0 });
      return { burn: f.burn, by: f.burnBy };
    };
    const plain = lit(['torch']);
    expect(lit(['torch', 'bomb']).burn - plain.burn).toBeCloseTo(GIFTS.fire.more[0]);
    const all = lit(['torch', 'bomb', 'brazier', 'sunbrand']);
    expect(all.burn - plain.burn).toBeCloseTo(GIFTS.fire.more[2]);
    expect(all.by / plain.by).toBeCloseTo(GIFTS.fire.by[2]);
  });

  it('Frost: slowing takes more of their speed, for longer', () => {
    const cold = (ids: string[]): { slow: number; by: number } => {
      const w = armed(ids);
      only(w, 'trident');
      const f = stand(w, 'bruiser', w.hero.x + 50, w.hero.y, { hp: 99999 }, true);
      w.step({ x: 0, y: 0 });
      return { slow: f.slow, by: f.slowBy };
    };
    const plain = cold(['trident']);
    const two = cold(['trident', 'hail']);
    expect(two.by - plain.by).toBeCloseTo(GIFTS.frost.by[0]);
    expect(two.slow - plain.slow).toBeCloseTo(GIFTS.frost.more[0]);
  });

  it('Holy: mending, in the hero\'s own stats', () => {
    const base = statsOf(run('aldous')).regen;
    expect(statsOf(run('aldous', 'censer')).regen).toBe(base + GIFTS.holy.regen[0]);
    expect(statsOf(run('aldous', 'censer', 'mace', 'holywater')).regen).toBe(base + GIFTS.holy.regen[2]);
  });

  it('Venom: clouds are wider and eat faster', () => {
    const cloud = (ids: string[]): { r: number; by: number } => {
      const w = armed(ids);
      only(w, 'gourd');
      stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 99999 }, true);
      play(w, 1.5);
      const z = w.zones.find((x) => x.kind === 'cloud');
      return { r: z?.r ?? 0, by: z?.by ?? 0 };
    };
    const plain = cloud(['gourd']);
    const two = cloud(['gourd', 'fang']);
    expect(plain.r).toBeGreaterThan(0);
    expect(two.r / plain.r).toBeCloseTo(GIFTS.venom.r[0]);
    expect(two.by / plain.by).toBeCloseTo(GIFTS.venom.harm[0]);
  });

  it('Arcane: lore, and at the last step every fifth spell is cast at once', () => {
    const base = statsOf(run('bram')).lore;
    expect(statsOf(run('bram', 'staff', 'wand')).lore).toBe(base + GIFTS.arcane.lore[0]);
    const quick = (ids: string[]): number => {
      const w = armed(ids);
      only(w, 'staff');
      stand(w, 'bruiser', w.hero.x + 200, w.hero.y, { hp: 99999, maxHp: 99999 }, true);
      return has(play(w, w.everyOf(w.slots[0]) * 10.5), 'loose').filter((e) => e.slot === 0).length;
    };
    const plain = quick(['staff', 'sword']);
    const four = quick(['staff', 'wand', 'brazier', 'frost']);
    expect(giftsOf(countKinds(['staff', 'wand', 'brazier', 'frost'].map(weaponOf))).free).toBe(GIFTS.arcane.free[2]);
    expect(four).toBeGreaterThan(plain);
  });
});

describe('the second armful of weapons', () => {
  const kinds = (id: string): readonly Kind[] => weaponOf(id).kinds;

  it('a rime trident slows those it runs through', () => {
    const w = armed(['trident']);
    const f = stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 99999 }, true);
    play(w, 0.5);
    expect(f.slow).toBeGreaterThan(0);
    expect(kinds('trident')).toEqual(['frost', 'pole']);
  });

  it('a blessed mace mends whoever fells someone with it, and not otherwise', () => {
    const w = armed(['mace'], { stats: stats({ maxHp: 30 }) });
    w.hero.hp = 10;
    const tough = stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 99999 }, true);
    play(w, 0.1);
    expect(w.hero.hp).toBe(10);
    tough.hp = 1;
    w.slots[0].cool = 0;
    play(w, 0.1);
    expect(w.hero.hp).toBe(11);
  });

  it('a blowpipe, a serpent sickle and a spore gourd each leave a cloud', () => {
    for (const id of ['blowpipe', 'fang', 'gourd']) {
      const w = armed([id]);
      stand(w, 'bruiser', w.hero.x + 60, w.hero.y, { hp: 99999 }, true);
      play(w, 1.2);
      expect(w.zones.some((z) => z.kind === 'cloud'), id).toBe(true);
      expect(kinds(id), id).toContain('venom');
    }
  });

  it('holy water leaves holy ground, which burns them and mends whoever of the band stands on it', () => {
    const w = armed(['holywater'], { stats: stats({ maxHp: 30 }) });
    const f = stand(w, 'bruiser', w.hero.x + 40, w.hero.y, { hp: 99999 }, true);
    play(w, 1.2);
    w.slots[0].cool = 999;
    const z = w.zones.find((x) => x.kind === 'holy');
    expect(z).toBeDefined();
    const hp = f.hp;
    w.hero.hp = 10;
    play(w, 2.6);
    expect(f.hp).toBeLessThan(hp);
    expect(w.hero.hp).toBeGreaterThan(10);
  });

  it('a sunbrand sets alight everyone its sweep reaches, and hailstones slow and skip', () => {
    const w = armed(['sunbrand']);
    const a = stand(w, 'bruiser', w.hero.x + 70, w.hero.y - 22, { hp: 99999 }, true);
    const b = stand(w, 'bruiser', w.hero.x + 70, w.hero.y + 22, { hp: 99999 }, true);
    play(w, 0.5);
    expect(a.burnBy).toBeGreaterThan(0);
    expect(b.burnBy).toBeGreaterThan(0);
    const v = armed(['hail']);
    const first = stand(v, 'bruiser', v.hero.x + 150, v.hero.y, { hp: 99999 }, true);
    const second = stand(v, 'bruiser', v.hero.x + 250, v.hero.y + 60, { hp: 99999 }, true);
    play(v, 1.2);
    expect(first.slow).toBeGreaterThan(0);
    expect(second.slow).toBeGreaterThan(0);
  });

  it('a war bow reaches far and often finds the gap; a halberd reaches further than a sword in a narrower sweep', () => {
    expect(weaponOf('longbow').range).toBeGreaterThan(weaponOf('crossbow').range);
    expect(weaponOf('longbow').crit).toBeGreaterThan(weaponOf('bow').crit * 2);
    expect(weaponOf('halberd').range).toBeGreaterThan(weaponOf('sword').range + 30);
    expect(weaponOf('halberd').arc ?? 0).toBeLessThan(weaponOf('sword').arc ?? 0);
    // Throwing axes go through two, a rime bow slows, a spark wand leaps.
    expect(weaponOf('hatchet').pierce).toBe(1);
    expect(weaponOf('rimebow').slow).toBeGreaterThan(0);
    expect(weaponOf('wand').leaps).toBe(2);
  });
});
