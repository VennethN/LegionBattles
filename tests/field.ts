// What the tests of a wave share: a wave stood up as a test wants it, foes
// stood where they are wanted, and the wave played for a while.

import { ENEMIES, byId, enemyAt } from '../src/game/data';
import { noStats, type Stats } from '../src/game/stats';
import { STEP, World, type Ev, type Foe, type Setup, type Steer } from '../src/game/world';

export const stats = (line: Partial<Stats> = {}): Stats => ({ ...noStats(), maxHp: 30, ...line });

/** A wave with a hero who carries nothing but what a test gives them. */
export const setup = (o: Partial<Setup> = {}): Setup => ({ seed: 7, wave: 1, stats: stats({ maxHp: 9999 }), weapons: [], ...o });

/** Steps a wave for some seconds, with the hero steered one way, and gives back everything that happened. */
export function play(w: World, seconds: number, steer: Steer = { x: 0, y: 0 }): Ev[] {
  const all: Ev[] = [];
  for (let t = 0; t < seconds && !w.over; t += STEP) {
    w.step(steer);
    all.push(...w.drain());
  }
  return all;
}

/** Stands a foe where it is wanted, as the wave would. `still` is one that does not walk. */
export function stand(w: World, id: string, x: number, y: number, o: Partial<Foe> = {}, still = false): Foe {
  const def = byId(ENEMIES, id);
  const at = enemyAt(def, w.wave.n);
  const f: Foe = {
    id: 9000 + w.foes.length, def: still ? { ...def, speed: 0 } : def, x, y, kx: 0, ky: 0, hp: at.hp, maxHp: at.hp, dmg: at.dmg, face: 1, state: 'walk', left: 0, cool: 99, dx: 0, dy: 0,
    doing: '', turn: 0, slow: 0, slowBy: 0, stun: 0, burn: 0, burnBy: 0, burnTick: 0, frozen: 0, numb: 0, marked: 0, markedBy: 0, flee: 0, moving: false, spurred: false, boss: false,
    dead: false, ...o,
  };
  w.foes.push(f);
  return f;
}

/** Keeps the wave from sending anyone of its own for as long as a test lasts: only who the test stands is there. */
export function alone(w: World): World {
  (w as unknown as { nextBand: number }).nextBand = 1e9;
  return w;
}

/** The harm of the blows that were not critical, from what happened. */
export const blows = (events: readonly Ev[], id?: number): number[] =>
  events.flatMap((e) => (e.t === 'hit' && !e.crit && !e.soft && (id === undefined || e.id === id) ? [e.amount] : []));
