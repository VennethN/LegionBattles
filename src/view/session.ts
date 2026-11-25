// The game that is being played: the save, the run, and the wave that is
// being fought. Every screen asks here, so that there is one of each
// however many screens are open.

import { handOver } from '../game/handover';
import { endWave, newRun, setupOf, type RunData } from '../game/run';
import { bandFor, record, type SaveData } from '../game/state';
import { loadSave, storeSave, wipeSave } from '../game/storage';
import { World } from '../game/world';

let current: SaveData | null = null;
let run: RunData | null = null;
let world: World | null = null;
/** Heroes and companions opened by the run so far and not yet shown to the player. */
let opened: string[] = [];
let friends: string[] = [];

export function save(): SaveData {
  if (!current) current = loadSave().save;
  return current;
}

export function commit(): void {
  storeSave(save());
}

/** Reads the save again from where it is kept: a portal has just said whose it is. */
export function reloadSave(): void {
  current = null;
  run = null;
  world = null;
  save();
}

export function startOver(): void {
  wipeSave();
  reloadSave();
}

/** True once, for the run in which the move was handed over to the player: the field says so. */
let handed = false;
export function takeHanded(): boolean {
  const was = handed;
  handed = false;
  return was;
}

export function theRun(): RunData | null {
  return run;
}

export function theWorld(): World | null {
  return world;
}

/** Begins a new run with a hero. A run that was left in its camp is let go. */
export function startRun(hero: string): RunData {
  const s = save();
  // A player's first run is told so: it has a companion to find on its second wave, and few weapons in its camps.
  run = newRun(hero, (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0 || 1, bandFor(s, hero), undefined, { first: s.ended === 0 });
  // From the second run on the move waits for the player, and the game says so once.
  handed = handOver(s);
  world = null;
  opened = [];
  friends = [];
  s.run = null;
  s.runs++;
  s.last = hero;
  commit();
  return run;
}

/** Takes up the run that was left in its camp, if there is one. */
export function resumeRun(): RunData | null {
  const s = save();
  if (!s.run) return null;
  run = s.run;
  world = null;
  opened = [];
  return run;
}

/** The wave that is to be fought next, made ready. */
export function beginWave(tall: boolean): World {
  if (!run) throw new Error('no run');
  world = new World(setupOf(run, tall, save().auto));
  return world;
}

/**
 * The wave is over: the run and the save take what it left. A run that
 * goes on is kept in the save from here, so that shutting the game in the
 * camp loses nothing.
 */
export function finishWave(): void {
  if (!run || !world) return;
  const kills = world.kills;
  endWave(run, world);
  const s = save();
  const now = record(s, run, kills);
  opened.push(...now.heroes);
  friends.push(...now.friends);
  s.run = run.phase === 'over' ? null : run;
  commit();
}

/** Writes the run down as it stands: after a trade in the camp. */
export function keepRun(): void {
  const s = save();
  if (run && run.phase !== 'over' && run.phase !== 'fight') s.run = run;
  else if (run && run.phase === 'fight') s.run = null;
  commit();
}

/** The heroes the run has opened, once: the screen that shows them takes them. */
export function takeOpened(): string[] {
  const o = opened;
  opened = [];
  return o;
}

/** The companions the run has opened, once. */
export function takeFriends(): string[] {
  const o = friends;
  friends = [];
  return o;
}

export function endRun(): void {
  run = null;
  world = null;
  const s = save();
  s.run = null;
  commit();
}

/**
 * Stands a run up as it is described, for the scripts that take pictures
 * of the game and for trying things from the browser's console: a hero, a
 * wave, what they carry. The game itself never calls it.
 */
export function stage(o: Partial<RunData> & { hero: string }): RunData {
  run = { ...newRun(o.hero, 12345, o.band?.map((b) => b.id)), ...o };
  world = null;
  opened = [];
  return run;
}
