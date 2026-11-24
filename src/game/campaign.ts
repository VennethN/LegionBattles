// The run of battles. The game plays like an idle game: battles start by
// themselves on a countdown and follow each other, and the player steps in
// to change the team or spend coins. This says where the next battle is
// fought; the main screen asks it and shows the answer.
//
//   a first win      on to the next stage; after a world's boss on Easy, on
//                    to the next world
//   a win again      the same stage again: a team left alone earns from a
//                    stage it can beat
//   a loss           back one stage, never to another world. The stage that
//                    was lost is remembered, and a changed team goes back to it

import { WORLDS } from '../data/worlds';
import { frontier, stageOpen, type StageResult } from './rules';
import type { SaveData, Where } from './state';

/**
 * Seconds before a battle starts by itself. Two at each of the three
 * moments, by the owner's word ("reduce the wait time to 2 seconds on auto
 * delay"). The count waits while a screen is open over the board or a unit
 * is being dragged, so it is never too short to change the team in.
 */
export const COUNTDOWN = {
  /** After the game is opened. */
  first: 2,
  /** After the player last changed something. */
  changed: 2,
  /** Between one battle and the next. */
  next: 2,
};

export function sameWhere(a: Where, b: Where): boolean {
  return a.world === b.world && a.stage === b.stage && a.d === b.d;
}

export function whereOpen(save: SaveData, at: Where): boolean {
  return at.world >= 0 && at.world < WORLDS.length && at.stage >= 0 && at.stage < WORLDS[at.world].stages.length && stageOpen(save, at.world, at.stage, at.d);
}

/** Makes sure the stage on show is one the player may fight: the furthest on Easy if it is not. */
export function settle(save: SaveData): Where {
  if (!whereOpen(save, save.at)) {
    const [world, stage] = frontier(save);
    save.at = { world, stage, d: 0 };
  }
  if (save.lostAt && !whereOpen(save, save.lostAt)) save.lostAt = null;
  return save.at;
}

/** Goes to a stage the player picked. Returns false, and changes nothing, if it is not open. */
export function goTo(save: SaveData, at: Where): boolean {
  if (!whereOpen(save, at)) return false;
  save.at = { ...at };
  save.lostAt = null;
  return true;
}

/** Where the next battle is fought, after one at `at` came out as `result`. Changes the save. */
export function afterBattle(save: SaveData, at: Where, result: StageResult): Where {
  const world = WORLDS[at.world];
  let next: Where = { ...at };
  if (!result.won) {
    if (at.stage > 0) {
      next = { ...at, stage: at.stage - 1 };
      // The furthest stage lost at is the one to come back to.
      if (!save.lostAt || save.lostAt.world !== at.world || save.lostAt.d !== at.d || save.lostAt.stage < at.stage) save.lostAt = { ...at };
    }
  } else if (result.first) {
    if (at.stage + 1 < world.stages.length) next = { ...at, stage: at.stage + 1 };
    else if (at.d === 0 && at.world + 1 < WORLDS.length) next = { world: at.world + 1, stage: 0, d: 0 };
    if (save.lostAt && sameWhere(save.lostAt, at)) save.lostAt = null;
  }
  save.at = next;
  return next;
}

/** The team has changed: if a stage was lost and stepped back from, it is tried again. Returns true if the stage on show changed. */
export function teamChanged(save: SaveData): boolean {
  const back = save.lostAt;
  if (!back) return false;
  save.lostAt = null;
  if (!whereOpen(save, back) || sameWhere(back, save.at)) return false;
  save.at = { ...back };
  return true;
}
