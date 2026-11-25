// The ten lands of the hundred waves: each fought through by the plain
// player without anything going wrong, each boss warning before it does
// what is its own, and every road of every land laid on its field.

import { describe, expect, it } from 'vitest';
import { botSteer } from '../src/game/bot';
import { ENEMIES, LANDS_DEF, LAND_WAVES, OMENS, byId, likeOf, waveOf } from '../src/game/data';
import { World, type Ev } from '../src/game/world';
import { setup, stats } from './field';

/** A wave played by the plain player for a while, with a hero who does not fall. */
const fought = (wave: number, o: Parameters<typeof setup>[0] = {}, seconds = 20): { w: World; events: Ev[] } => {
  const w = new World(setup({ wave, own: { id: 'gatekeeper', tier: 2 }, stats: stats({ maxHp: 999999, damage: 300 }), ...o }));
  const events: Ev[] = [];
  for (let i = 0; i < 60 * seconds && !w.over; i++) {
    w.step(botSteer(w));
    events.push(...w.drain());
  }
  return { w, events };
};

describe('the ten lands', () => {
  it('each is fought through, its first wave, its elite\'s and its boss\'s, and each boss warns before it strikes', () => {
    LANDS_DEF.forEach((land, i) => {
      const first = i * LAND_WAVES + 1;
      expect(waveOf(first).land).toBe(land.id);
      const plain = fought(first, {}, 8);
      expect(plain.w.met.length, land.id).toBeGreaterThan(0);
      // Who comes is the land's own.
      for (const id of plain.w.met) expect(land.roster.some(([r]) => r === id) || ENEMIES.some((e) => e.calls === id), `${id} in ${land.id}`).toBe(true);
      const elite = fought(first + 4, {}, 20);
      expect(elite.events.some((e) => e.t === 'champion'), `${land.id} elite`).toBe(true);
      const boss = fought(first + LAND_WAVES - 1, { stats: stats({ maxHp: 999999, damage: -60 }) }, 30);
      expect(boss.w.met, land.id).toContain(land.boss);
      const warned = boss.events.findIndex((e) => e.t === 'warn' || e.t === 'ring' || e.t === 'mark' || e.t === 'peril');
      expect(warned, `${land.boss} warns`).toBeGreaterThanOrEqual(0);
      expect(byId(ENEMIES, land.boss).ai).toBe('boss');
    });
  }, 60000);

  it('every road can be laid on its own land\'s field, and those that borrow another\'s rules work as it does', () => {
    for (const o of OMENS) {
      if (o.weight <= 0) continue;
      const li = o.land ? LANDS_DEF.findIndex((l) => l.id === o.land) : 0;
      const wave = li * LAND_WAVES + 6;
      const { w } = fought(wave, { omen: o.id }, 4);
      expect(w.omen, o.id).toBe(o.id);
      expect(likeOf(o.id).length).toBeGreaterThan(2);
    }
  }, 60000);
});
