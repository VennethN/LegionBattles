import type { BattleEvent, BattleInput, Placement, UnitDef } from '../src/sim/types';
import { runBattle, type BattleResult } from '../src/sim/battle';

/** A plain melee unit to build test cases from. */
export function dummy(over: Partial<UnitDef> = {}): UnitDef {
  return {
    id: 'dummy',
    name: 'Dummy',
    role: 'fighter',
    hp: 1000,
    damage: 50,
    attackInterval: 1,
    windup: 0.3,
    range: 0.95,
    armor: 0,
    speed: 80,
    ...over,
  };
}

export function battle(
  defs: Record<string, UnitDef>,
  a: Placement[],
  b: Placement[],
  seed = 1,
): BattleResult {
  const input: BattleInput = { seed, defs, teams: [a, b] };
  return runBattle(input);
}

export function of(events: BattleEvent[], type: BattleEvent['type']): BattleEvent[] {
  return events.filter((e) => e.type === type);
}
