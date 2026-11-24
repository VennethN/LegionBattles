// The game that is being played: the save, the fight that runs on it, and
// when each is written down. Every screen asks here, so that there is one
// save and one fight however many screens are open.

import { Battle } from '../game/battle';
import { away, type Away } from '../game/rules';
import type { SaveData } from '../game/state';
import { loadSave, storeSave, wipeSave } from '../game/storage';

let current: SaveData | null = null;
let fight: Battle | null = null;
/** What was earned while the game was shut, until the game has said so to the player. */
let earned: Away | null = null;

/** Adds what the legion earned from when it was last seen until now, if that is long enough ago to say. */
function comeBack(save: SaveData, now: number): void {
  const gone = away(save, now);
  if (gone) {
    save.run.gold += gone.gold;
    save.stats.gold += gone.gold;
    earned = earned ? { seconds: earned.seconds + gone.seconds, capped: earned.capped || gone.capped, gold: earned.gold + gone.gold } : gone;
  }
  save.seen = now;
}

function open(): void {
  current = loadSave((Date.now() & 0x7fffffff) || 1).save;
  comeBack(current, Date.now());
  fight = new Battle(current);
}

export function save(): SaveData {
  if (!current) open();
  return current as SaveData;
}

export function battle(): Battle {
  if (!fight) open();
  return fight as Battle;
}

/** Writes the save down, with the moment it was written. */
export function commit(): void {
  const s = save();
  s.seen = Date.now();
  storeSave(s);
}

/** What was earned while the game was shut, once: the screen that shows it takes it. */
export function takeEarned(): Away | null {
  const e = earned;
  earned = null;
  return e;
}

/** The page was hidden and is seen again: the time between is time away. */
export function returned(): void {
  if (current) comeBack(current, Date.now());
}

/** Reads the save again from where it is kept: a portal has just said whose it is. */
export function reloadSave(): void {
  current = null;
  fight = null;
  earned = null;
  open();
}

/** Forgets everything and starts a new game. */
export function startOver(): void {
  wipeSave();
  reloadSave();
}
