// The player's save while the game runs. Scenes read it, change it through
// the rules in src/game, and call commit() to write it down.

import { startingSave, tidyTeam } from '../game/rules';
import type { SaveData } from '../game/state';
import { loadSave, storeSave, wipeSave } from '../game/storage';

let current: SaveData | null = null;

function seed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

export function save(): SaveData {
  if (!current) {
    const loaded = loadSave(seed());
    current = loaded.fresh || Object.keys(loaded.save.cards).length === 0 ? startingSave(seed()) : loaded.save;
    tidyTeam(current);
  }
  return current;
}

export function commit(): void {
  if (current) storeSave(current);
}

/** Starts the game over. For the debug overlay and the tests. */
export function reset(): SaveData {
  wipeSave();
  current = startingSave(seed());
  commit();
  return current;
}
