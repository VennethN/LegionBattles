// The run of battles. The game plays like an idle game: battles start by
// themselves on a countdown and follow each other, and the player steps in
// to change the team or spend coins. This says where the next battle is
// fought; the main screen asks it and shows the answer.
//
//   a first win      on to the next stage of the line
//   a win again      the same stage again: a team left alone earns from a
//                    stage it can beat
//   a loss           back one stage. The stage that was lost is remembered,
//                    and a changed team goes back to it

import { STAGES } from '../data/stages';
import { frontier, stageOpen, type StageResult } from './rules';
import type { SaveData } from './state';

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

/** Makes sure the stage on show is one the player may fight: the furthest if it is not. */
export function settle(save: SaveData): number {
  if (!stageOpen(save, save.at)) save.at = frontier(save);
  if (save.lostAt !== null && !stageOpen(save, save.lostAt)) save.lostAt = null;
  return save.at;
}

/** Goes to a stage the player picked. Returns false, and changes nothing, if it is not open. */
export function goTo(save: SaveData, at: number): boolean {
  if (!stageOpen(save, at)) return false;
  save.at = at;
  save.lostAt = null;
  return true;
}

/** Where the next battle is fought, after one at `at` came out as `result`. Changes the save. */
export function afterBattle(save: SaveData, at: number, result: StageResult): number {
  let next = at;
  if (!result.won) {
    if (at > 0) {
      next = at - 1;
      // The furthest stage lost at is the one to come back to.
      if (save.lostAt === null || save.lostAt < at) save.lostAt = at;
    }
  } else if (result.first) {
    if (at + 1 < STAGES.length) next = at + 1;
    if (save.lostAt === at) save.lostAt = null;
  }
  save.at = next;
  return next;
}

/** The team has changed: if a stage was lost and stepped back from, it is tried again. Returns true if the stage on show changed. */
export function teamChanged(save: SaveData): boolean {
  const back = save.lostAt;
  if (back === null) return false;
  save.lostAt = null;
  if (!stageOpen(save, back) || back === save.at) return false;
  save.at = back;
  return true;
}
