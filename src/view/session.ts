// The game that is being played: the save, the contract taken, and the
// hunt. Every screen asks here, so that there is one of each however many
// screens are open.

import type { Mark } from '../game/content';
import { Hunt, type Setup } from '../game/hunt';
import { nextContract, payFor, setupOf, type Pay, type SaveData } from '../game/lodge';
import { loadSave, storeSave, wipeSave } from '../game/storage';

let current: SaveData | null = null;
let hunt: Hunt | null = null;
let contract: { monster: string; mark: Mark } | null = null;
let pay: Pay | null = null;

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
  hunt = null;
  contract = null;
  pay = null;
  save();
}

export function startOver(): void {
  wipeSave();
  reloadSave();
}

export function theHunt(): Hunt | null {
  return hunt;
}

/** The contract being hunted, or the one the board holds out next. */
export function theContract(): { monster: string; mark: Mark } {
  return contract ?? nextContract(save());
}

export function takeContract(monster: string, mark: Mark): void {
  contract = { monster, mark };
}

/** Goes to the lair of the contract taken, with the muster as it stands. */
export function beginHunt(tall: boolean): Hunt {
  const c = theContract();
  contract = c;
  pay = null;
  hunt = new Hunt(setupOf(save(), c.monster, c.mark, (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0 || 1, tall));
  return hunt;
}

/** The hunt is over: the save takes what it paid, once. */
export function finishHunt(): Pay | null {
  if (!hunt || !hunt.over || !contract) return pay;
  if (pay) return pay;
  pay = payFor(save(), contract.monster, contract.mark, hunt.over === 'won', hunt.tally, hunt.monster.part);
  commit();
  return pay;
}

export function thePay(): Pay | null {
  return pay;
}

/** Leaves the lair: back to the lodge. */
export function leaveHunt(): void {
  hunt = null;
  pay = null;
  contract = null;
}

/**
 * Stands a hunt up as it is described, for the scripts that take pictures
 * of the game and for trying things from the browser's console. The game
 * itself never calls it.
 */
export function stage(o: Partial<Setup> & { monster: string; awake?: boolean }): Hunt {
  const base = setupOf(save(), o.monster, o.mark ?? 1, o.seed ?? 12345, !!o.tall);
  contract = { monster: o.monster, mark: o.mark ?? 1 };
  pay = null;
  hunt = new Hunt({ ...base, ...o });
  if (o.awake) hunt.step({ x: 0, y: 0, wake: true });
  return hunt;
}
