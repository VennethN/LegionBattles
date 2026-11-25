import { describe, expect, it } from 'vitest';
import { ITEMS, WEAPONS } from '../src/game/data';
import { compare, previewItem, previewLevel, previewOffer, weaponFacts } from '../src/game/preview';
import { newRun, statsOf, type RunData } from '../src/game/run';
import { noStats } from '../src/game/stats';

/** A run in its camp with these wares on the table. */
function camp(offers: RunData['offers'], weapons: RunData['weapons'] = []): RunData {
  const run = newRun('wren', 7);
  run.phase = 'camp';
  run.gold = 0;
  run.weapons = weapons;
  run.offers = offers;
  return run;
}

describe('what a choice would change', () => {
  it('lists only the stats that differ, before and after', () => {
    const a = noStats();
    const b = { ...noStats(), maxHp: 5, damage: 10 };
    a.maxHp = 30;
    b.maxHp = 35;
    const lines = compare(a, b);
    expect(lines.map((l) => l.name)).toEqual(['Max HP', 'Damage']);
    expect(lines[0]).toMatchObject({ before: '30', after: '35', up: true });
    expect(lines[0].by).toBe('+5 (+17%)');
    expect(lines[1]).toMatchObject({ before: '0%', after: '+10%', by: '+10%' });
    expect(lines.every((l) => l.says.length > 0)).toBe(true);
  });

  it("gives a level's choice as the rules would make it, and leaves the run as it was", () => {
    const run = newRun('bram', 3);
    run.phase = 'level';
    run.pending = 1;
    run.choices = [{ stat: 'damage', tier: 0, by: 8 }];
    const before = JSON.stringify(run);
    const p = previewLevel(run, 0);
    expect(JSON.stringify(run)).toBe(before);
    expect(p.changes[0]).toMatchObject({ stat: 'damage', before: '0%', after: '+8%', up: true });
    // Damage moves the hero's own weapon too, and that is said in its own numbers.
    expect(p.changes.some((c) => c.stat === '' && c.name.includes('damage'))).toBe(true);
  });

  it("gives an item's stats even when it cannot be paid for yet", () => {
    const item = ITEMS.find((it) => it.stats.maxHp && !it.stats.maxHp.toString().startsWith('-')) as (typeof ITEMS)[number];
    const run = camp([{ kind: 'item', id: item.id, tier: item.tier, price: 999, sold: false, locked: false }]);
    const p = previewOffer(run, 0);
    const hp = p.changes.find((c) => c.stat === 'maxHp');
    expect(hp?.after).toBe(String(statsOf(run).maxHp + (item.stats.maxHp ?? 0)));
    expect(run.items).toEqual([]);
    expect(previewItem(run, item.id).find((c) => c.stat === 'maxHp')?.after).toBe(hp?.after);
  });

  it("sets a weapon's numbers beside the same weapon held, and says when the two would merge", () => {
    const w = WEAPONS.find((x) => x.id !== 'bow') as (typeof WEAPONS)[number];
    const run = camp([{ kind: 'weapon', id: w.id, tier: 0, price: 10, sold: false, locked: false }], [{ id: w.id, tier: 0 }]);
    const p = previewOffer(run, 0);
    expect(p.weapon?.facts.dmg).toBe(weaponFacts(run, w.id, 0).dmg);
    expect(p.weapon?.held?.name).toBe(w.name);
    expect(p.weapon?.joins).toBe(true);
    expect(p.weapon?.facts.dps).toBeCloseTo(p.weapon!.facts.dmg * p.weapon!.facts.rate, 0);
  });

  it('says how a weapon moves its set bonus', () => {
    const w = WEAPONS.find((x) => x.kinds.length > 0) as (typeof WEAPONS)[number];
    const run = camp([{ kind: 'weapon', id: w.id, tier: 0, price: 10, sold: false, locked: false }]);
    const p = previewOffer(run, 0);
    expect(p.sets.length).toBe(w.kinds.length);
    for (const s of p.sets) expect(s.after).toBe(s.held + 1);
  });
});
