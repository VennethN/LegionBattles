// The move is the hero's one verb. With AUTO on it plays itself, which is
// right for a player's first run, when they have not been told there is
// one, and wrong after it: the verb is theirs. So when a player begins
// their second run AUTO is turned off for them, once, and the game says
// so. They can turn it on again in the pause panel, and it stays as they
// leave it from then on.

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
