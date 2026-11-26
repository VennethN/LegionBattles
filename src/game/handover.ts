// The move is the hero's one verb. A save begun now has AUTO off from the
// first run, and the skill is taught the first time it fills (the owner:
// "why skills are auto used"). A save from before that had it on for a
// first run and handed it over when the second began: such a save is
// handed over once, as before, and said so. Either way AUTO can be turned
// on in the pause panel, and stays as it is left.

/** What the save keeps of this. */
export interface HandedSave {
  ended: number;
  auto: boolean;
  told: string[];
}

/** The name it goes by in the save's list of things said once. */
export const HANDED = 'move';

/**
 * Hands the move over, if this is the time: a run has ended and it has not
 * been done before. True if it was done now, so that the game can say so.
 */
export function handOver(save: HandedSave): boolean {
  if (save.ended < 1 || save.told.includes(HANDED)) return false;
  save.told.push(HANDED);
  save.auto = false;
  return true;
}
