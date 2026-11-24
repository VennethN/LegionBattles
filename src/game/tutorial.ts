// The first-run tutorial: a few steps that lead a new player from their
// first battle to their first packs and their team.
//
// Which step is up is worked out afresh each time, from the save and from
// what is on the screen. So a reload, or a player who wanders, comes back to
// the right step, and nothing here can get stuck out of order.
//
// While a step points at something, nothing else can be pressed, and battles
// do not start by themselves: a tutorial leads the player out of whatever it
// led them into.

import { packsHeld } from './rules';
import type { SaveData } from './state';

export type GuideScene = 'Main' | 'Shop' | 'Team' | 'Worlds' | 'Rewards';

/** What is on the screen, as the scene that asks sees it. */
export interface GuideContext {
  scene: GuideScene;
  /** On the main screen: another screen is open over it. */
  covered?: boolean;
  /** On the main screen: a battle is being fought, or what it came to is being shown. */
  busy?: boolean;
  /** In the packs: a pouch is waiting to be torn, or a card has been turned over. */
  show?: 'none' | 'pouch' | 'reveal';
}

export interface Step {
  id: string;
  /** The name of what it points at, as the screen marked it. */
  target: string;
  text: string;
  /** Battles wait while it is up. */
  holds: boolean;
  /** Nothing but what it points at can be pressed. */
  blocks: boolean;
  /** It has a GOT IT button, and is over when that is pressed. */
  ok?: boolean;
}

const HELLO: Step = {
  id: 'hello', target: 'battle', holds: false, blocks: false,
  text: 'Battles start by themselves, and your units fight on their own. Watch this one.',
};
const PACKS: Step = {
  id: 'packs', target: 'packs', holds: true, blocks: true,
  text: 'You hold packs of cards. Press PACKS.',
};
const OPEN: Step = {
  id: 'open', target: 'open', holds: true, blocks: true,
  text: 'Every pack holds one card. Press OPEN.',
};
const TEAR: Step = {
  id: 'tear', target: 'pouch', holds: true, blocks: true,
  text: 'Press the pouch to tear it open.',
};
const CARD: Step = {
  id: 'card', target: 'reveal:done', holds: true, blocks: true,
  text: "The badge is the card's grade: F is the plainest, S the best. A copy of a card you hold is a card of its own. Press DONE.",
};
const CLOSE_PACKS: Step = {
  id: 'close-packs', target: 'close', holds: true, blocks: true,
  text: 'Open the rest when you like. Now back to the field: press CLOSE.',
};
const UNITS: Step = {
  id: 'units', target: 'units', holds: true, blocks: true,
  text: 'A new card joins your team while there is room. Press UNITS to see who fights.',
};
const FILL: Step = {
  id: 'fill', target: 'fill', holds: true, blocks: true,
  text: 'FILL TEAM fields your strongest cards. Press it.',
};
const CLOSE_UNITS: Step = {
  id: 'close-units', target: 'close', holds: true, blocks: true,
  text: 'Press a card to read it, and PUT IN TEAM or TAKE OUT to choose for yourself. For now, press CLOSE.',
};
const WORD: Step = {
  id: 'word', target: 'stages', holds: true, blocks: true, ok: true,
  text: 'This is your stage, and its world. Win and the next begins. Lose, and you step back a stage to grow. Press it for the map. AUTO stops battles starting by themselves.',
};

/** Every step, for the tests and for whoever wants to read them in order. */
export const STEPS: readonly Step[] = [HELLO, PACKS, OPEN, TEAR, CARD, CLOSE_PACKS, UNITS, FILL, CLOSE_UNITS, WORD];

export function seen(save: SaveData, id: string): boolean {
  return save.tutorial.seen.includes(id);
}

/** Notes that a part of the tutorial is behind the player. Ends the tutorial with its last part. */
export function markSeen(save: SaveData, id: string): void {
  if (save.tutorial.done) return;
  if (!seen(save, id)) save.tutorial.seen.push(id);
  if (id === 'word') save.tutorial.done = true;
}

export function skipTutorial(save: SaveData): void {
  save.tutorial.done = true;
}

/** The step to show now, or null for none. */
export function tutorialStep(save: SaveData, ctx: GuideContext): Step | null {
  if (save.tutorial.done) return null;
  const watching = ctx.scene === 'Main' && !ctx.covered;
  // A step that asks for a press waits until the board is still.
  const onMain = watching && !ctx.busy;

  // The first battle is only watched.
  if (save.stats.battles === 0) return watching ? HELLO : null;

  // Then the packs. With none held and none ever opened there is nothing to show.
  if (!seen(save, 'packs') && (save.stats.opened > 0 || packsHeld(save) > 0)) {
    if (onMain) return PACKS;
    if (ctx.scene !== 'Shop') return null;
    if (ctx.show === 'pouch') return TEAR;
    if (ctx.show === 'reveal') return CARD;
    return save.stats.opened === 0 ? OPEN : CLOSE_PACKS;
  }

  // Then the team.
  if (!seen(save, 'team')) {
    if (onMain) return UNITS;
    if (ctx.scene !== 'Team') return null;
    return seen(save, 'fill') ? CLOSE_UNITS : FILL;
  }

  // And a last word.
  return onMain ? WORD : null;
}
