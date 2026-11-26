import { describe, expect, it } from 'vitest';
import { ENEMIES, ITEMS, LANDS, LAND_WAVES, TIERS, WEAPONS, byId, enemyAt } from '../src/game/data';
import { FIFTH, FIFTH_FORMS, fifthOf } from '../src/game/forms';
import { combine, newRun, reroll, sell, swap, canSwap, temper, twinOf, type RunData } from '../src/game/run';
import { noStats, type Stats } from '../src/game/stats';
import { STEP, World, type Ev, type Foe, type Setup } from '../src/game/world';

const stats = (line: Partial<Stats> = {}): Stats => ({ ...noStats(), maxHp: 9999, ...line });
const setup = (o: Partial<Setup> = {}): Setup => ({ seed: 7, wave: 1, stats: stats(), weapons: [{ id: 'sword', tier: 0 }], ...o });

function play(w: World, seconds: number): Ev[] {
  const all: Ev[] = [];
  for (let t = 0; t < seconds && !w.over; t += STEP) {
    w.step({ x: 0, y: 0 });
    all.push(...w.drain());
  }
  return all;
}

/** A wave with nothing in it but the foes the test stands up. */
function bare(o: Partial<Setup>): World {
  const w = new World(setup(o));
  w.foes.length = 0;
  w.marks.length = 0;
  return w;
}

function stand(w: World, id: string, x: number, y: number, o: Partial<Foe> = {}): Foe {
  const def = byId(ENEMIES, id);
  const at = enemyAt(def, 1);
  const f: Foe = {
    id: 9000 + w.foes.length, def, x, y, kx: 0, ky: 0, hp: at.hp * 40, maxHp: at.hp * 40, dmg: 0, face: 1, state: 'walk', left: 0, cool: 99, dx: 0, dy: 0, doing: '', turn: 0,
    slow: 0, slowBy: 0, stun: 0, burn: 0, burnBy: 0, burnTick: 0, frozen: 0, numb: 0, marked: 0, markedBy: 0, flee: 0, moving: false, spurred: false, boss: false, dead: false, champion: '', blaze: 0, ...o,
  };
  w.foes.push(f);
  return f;
}

/** A run in its camp, holding these weapons. */
function camp(weapons: Array<{ id: string; tier: number }>): RunData {
  const run = newRun('wren', 3);
  run.phase = 'camp';
  run.weapons = weapons.map((w) => ({ ...w }));
  run.gold = 99999;
  return run;
}

describe('the fifth form', () => {
  it('is there for every weapon, named, with one rule, and stronger than tier IV', () => {
    for (const w of WEAPONS) {
      const form = fifthOf(w.id);
      expect(form, w.id).not.toBeNull();
      expect(form!.name.length).toBeGreaterThan(2);
      expect(form!.says.length).toBeGreaterThan(10);
      expect(w.dmg.length).toBe(FIFTH + 1);
      expect(w.dmg[FIFTH]).toBeGreaterThan(w.dmg[FIFTH - 1]);
      expect(w.every[FIFTH]).toBeLessThan(w.every[FIFTH - 1]);
    }
    expect(Object.keys(FIFTH_FORMS).length).toBe(WEAPONS.length);
  });

  it('is made by merging two of tier IV, and merges with nothing', () => {
    const run = camp([{ id: 'greataxe', tier: TIERS - 1 }, { id: 'greataxe', tier: TIERS - 1 }]);
    expect(twinOf(run, 'greataxe', TIERS - 1, 0)).toBe(1);
    expect(combine(run, 0)).toBe(true);
    expect(run.weapons).toEqual([{ id: 'greataxe', tier: FIFTH }]);
    run.weapons.push({ id: 'greataxe', tier: FIFTH });
    expect(twinOf(run, 'greataxe', FIFTH, 0)).toBe(-1);
    expect(combine(run, 0)).toBe(false);
  });

  it('is never offered by the shop', () => {
    const run = camp([{ id: 'bow', tier: FIFTH }]);
    for (let i = 0; i < 200; i++) {
      reroll(run);
      for (const o of run.offers) expect(o.tier).toBeLessThan(FIFTH);
    }
  });

  it("comes of Master's Temper, at once or for the next weapon to reach tier IV", () => {
    const run = camp([{ id: 'dagger', tier: 1 }, { id: 'spear', tier: TIERS - 1 }]);
    run.relics.push('temper');
    expect(temper(run)).toBe(true);
    expect(run.weapons[1].tier).toBe(FIFTH);
    expect(temper(run)).toBe(false);
    const later = camp([{ id: 'dagger', tier: TIERS - 2 }, { id: 'dagger', tier: TIERS - 2 }]);
    later.relics.push('temper');
    expect(temper(later)).toBe(false);
    combine(later, 0);
    expect(later.weapons[0].tier).toBe(FIFTH);
  });

  it('sells for more than tier IV', () => {
    const a = camp([{ id: 'sword', tier: TIERS - 1 }]);
    const b = camp([{ id: 'sword', tier: FIFTH }]);
    sell(a, 0);
    sell(b, 0);
    expect(b.gold).toBeGreaterThan(a.gold);
  });
});

describe('the fifth forms on the field', () => {
  /** A hero holding one weapon at a tier, with one tough foe in reach, played a while. */
  function swing(id: string, tier: number, seconds = 6, more = 0): { w: World; f: Foe; others: Foe[]; ev: Ev[] } {
    const w = bare({ weapons: [{ id, tier }] });
    const h = w.hero;
    const f = stand(w, 'cutpurse', h.x + 60, h.y);
    const others = Array.from({ length: more }, (_, k) => stand(w, 'cutpurse', h.x + 60 + 30 * (k + 1), h.y + 20 * (k % 2 ? 1 : -1)));
    const ev = play(w, seconds);
    return { w, f, others, ev };
  }
  const forms = (ev: Ev[]): number => ev.filter((e) => e.t === 'form').length;

  it('bursts, every so-many hits', () => {
    expect(forms(swing('greataxe', FIFTH).ev)).toBeGreaterThan(0);
    expect(forms(swing('greataxe', TIERS - 1).ev)).toBe(0);
  });

  it('echoes: more strikes than tier IV makes', () => {
    const v = swing('sword', FIFTH).ev.filter((e) => e.t === 'strike').length;
    const iv = swing('sword', TIERS - 1).ev.filter((e) => e.t === 'strike').length;
    expect(v).toBeGreaterThan(iv);
  });

  it('marks, stuns and burns', () => {
    const marked = bare({ weapons: [{ id: 'dagger', tier: FIFTH }] });
    const m = stand(marked, 'cutpurse', marked.hero.x + 50, marked.hero.y);
    let seen = false;
    for (let t = 0; t < 4 && !seen; t += STEP) {
      marked.step({ x: 0, y: 0 });
      marked.drain();
      seen = m.marked > 0 && m.markedBy >= 0.2;
    }
    expect(seen).toBe(true);
    expect(forms(swing('spear', FIFTH, 8).ev)).toBeGreaterThan(0);
    const burnt = bare({ weapons: [{ id: 'torch', tier: FIFTH }] });
    const b = stand(burnt, 'cutpurse', burnt.hero.x + 50, burnt.hero.y);
    let lit = false;
    for (let t = 0; t < 4 && !lit; t += STEP) {
      burnt.step({ x: 0, y: 0 });
      burnt.drain();
      lit = b.burn > 0 && b.burnBy >= 8;
    }
    expect(lit).toBe(true);
  });

  it('jumps to another enemy', () => {
    const { ev } = swing('javelin', FIFTH, 6, 2);
    expect(ev.some((e) => e.t === 'form' && !!e.from)).toBe(true);
  });

  it('drags enemies in', () => {
    /** How far a still bystander ends from the one struck, with the halberd at a tier. */
    const after = (tier: number): { gap: number; ev: Ev[] } => {
      const w = bare({ weapons: [{ id: 'halberd', tier }] });
      const h = w.hero;
      const struck = stand(w, 'cutpurse', h.x + 60, h.y);
      // Off the line of the thrust, so that only the pull moves it.
      const far = stand(w, 'cutpurse', h.x + 60, h.y + 95, { cool: 999 });
      far.def = { ...far.def, speed: 0 };
      const ev = play(w, 3);
      return { gap: Math.hypot(far.x - struck.x, far.y - struck.y), ev };
    };
    const v = after(FIFTH);
    expect(v.ev.some((e) => e.t === 'form')).toBe(true);
    expect(v.gap).toBeLessThan(after(TIERS - 1).gap);
  });
});

describe("each land's own wares", () => {
  it('two for every land, each with a rule and a line that says it', () => {
    for (const land of LANDS) {
      const own = ITEMS.filter((it) => it.land === land);
      expect(own.length, land).toBe(2);
      for (const it of own) {
        expect(it.fx, it.id).toBeTruthy();
        expect((it.says ?? '').length).toBeGreaterThan(10);
      }
    }
  });

  it("are sold only in their land's shops", () => {
    for (const [k, land] of LANDS.entries()) {
      const run = camp([]);
      run.wave = k * LAND_WAVES + 2;
      for (let i = 0; i < 300; i++) {
        reroll(run);
        for (const o of run.offers) {
          if (o.kind !== 'item') continue;
          const def = byId(ITEMS, o.id);
          if (def.land) expect(def.land, `${o.id} at wave ${run.wave}`).toBe(land);
        }
      }
    }
  });

  it("carry their rule onto every weapon's blows", () => {
    const w = bare({ weapons: [{ id: 'sword', tier: 0 }], items: ['wolfpelt'] });
    const f = stand(w, 'cutpurse', w.hero.x + 50, w.hero.y);
    let slowed = false;
    for (let t = 0; t < 4 && !slowed; t += STEP) {
      w.step({ x: 0, y: 0 });
      w.drain();
      slowed = f.slow > 0 && f.slowBy >= 0.25;
    }
    expect(slowed).toBe(true);
  });
});

describe('swapping from the shop', () => {
  it('sells the one in a slot and buys the one on offer in a single step', () => {
    const run = camp([{ id: 'sword', tier: 0 }, { id: 'bow', tier: 0 }, { id: 'staff', tier: 0 }, { id: 'torch', tier: 0 }, { id: 'sling', tier: 0 }, { id: 'hail', tier: 0 }]);
    run.offers[0] = { kind: 'weapon', id: 'greataxe', tier: 1, price: 50, sold: false, locked: false };
    expect(canSwap(run, 0, 2)).toBe(true);
    expect(swap(run, 0, 2)).toBe(true);
    expect(run.weapons.map((x) => x.id)).toContain('greataxe');
    expect(run.weapons.map((x) => x.id)).not.toContain('staff');
  });
});
