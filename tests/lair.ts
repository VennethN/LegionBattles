// What the tests of a hunt share: a hunt stood up as a test wants it, woken,
// with the monster put where and how it is wanted, and played for a while.

import type { Mark } from '../src/game/content';
import { Hunt, STEP, type Ev, type MonsterState, type Setup, type Steer } from '../src/game/hunt';

export const setup = (o: Partial<Setup> = {}): Setup => ({ seed: 7, monster: 'sexton', mark: 1 as Mark, hunter: 'marta', reinforcements: [], buildings: [], ...o });

/** A hunt already woken, with the monster's first roar over. */
export function awake(o: Partial<Setup> = {}): Hunt {
  const h = new Hunt(setup(o));
  h.step({ x: 0, y: 0, wake: true });
  h.drain();
  return h;
}

/** Steps a hunt for some seconds and gives back everything that happened. */
export function play(h: Hunt, seconds: number, steer: Steer | ((h: Hunt) => Steer) = { x: 0, y: 0 }): Ev[] {
  const all: Ev[] = [];
  for (let t = 0; t < seconds && !h.over; t += STEP) {
    h.step(typeof steer === 'function' ? steer(h) : steer);
    all.push(...h.drain());
  }
  return all;
}

/** Puts the monster in a state, for as long as a test needs it there. */
export function hold(h: Hunt, state: MonsterState, seconds = 99): void {
  h.monster.state = state;
  h.monster.left = seconds;
}

/** Sets the monster's round so that the attack named is its next. */
export function next(h: Hunt, attack: string): void {
  const round = h.monster.def.parts[h.monster.part];
  const at = round.indexOf(attack);
  if (at < 0) throw new Error(`${attack} is not in the round of part ${h.monster.part}`);
  (h as unknown as { round: number }).round = at;
  h.monster.state = 'walk';
  h.monster.left = 0;
}

export const of = <T extends Ev['t']>(events: readonly Ev[], t: T): Array<Extract<Ev, { t: T }>> => events.filter((e): e is Extract<Ev, { t: T }> => e.t === t);
