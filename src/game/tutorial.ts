// The tutorials. There are two kinds.
//
// The first is the one a new player is walked through: a few steps that
// lead from their first battle to their first packs and their team. Which
// of its steps is up is worked out afresh each time, from the save and from
// what is on the screen. So a reload, or a player who wanders, comes back to
// the right step, and nothing in it can get stuck out of order.
//
// The second kind is a tour: a few notes on one part of the game (the
// packs, the dungeons and raids, skill points, upgrades, the rewards,
// structures), each pointing at the thing it is about. A tour starts by
// itself the first time its part of the game matters, and never straight
// after another: a couple of battles are fought between two of them. Once seen it is on the list in the settings,
// where any of them can be viewed again. By the owner's word of 24 November
// 2026: "Make sure that we have tutorial drivers for important things / E.g
// the game itself, dungeons and raids, skill points, upgrades, packs / and
// show them appropriately / and allow players to view them again once they
// are already seen".
//
// A tour is data: TOURS below. What a step points at is found by name among
// what the screen has marked (view/ui/Guide.ts).
//
// The words are few. By the owner's word of 24 November 2026, of a note
// three sentences long: "the tutorial text are too long and ai-ish / Please
// simplify them to the thing that users only needed to know, we want to
// minimize reading". A step says one thing, in a line; a test holds every
// one of them to sixty characters.
//
// A tour ends on the screen it led into, with everything there free to be
// pressed: it never ends by asking for CLOSE. The owner, of a last step that
// said "Buy what you like. Press CLOSE." with the buttons under the shade:
// "how does this make sense, i cant buy anything if you cover it".
//
// While a step points at something, nothing else can be pressed, and battles
// do not start by themselves: a tutorial leads the player out of whatever it
// led them into.

import { DUNGEONS, RAIDS } from '../data/expeditions';
import { PACKS as SHELF } from '../data/packs';
import { UPGRADES } from '../data/player';
import { placeOpen } from './expeditions';
import { pointsFree, upgradeCost } from './player';
import { rewardsWaiting } from './rewards';
import { packOpen, packsHeld, priceOf, structuresSize } from './rules';
import type { SaveData } from './state';

export type GuideScene = 'Main' | 'Shop' | 'Team' | 'Worlds' | 'Rewards' | 'Hall' | 'Player' | 'Settings';

/** What is on the screen, as the scene that asks sees it. */
export interface GuideContext {
  scene: GuideScene;
  /** On the main screen: another screen is open over it. */
  covered?: boolean;
  /** On the main screen: a battle is being fought, or what it came to is being shown. */
  busy?: boolean;
  /** In the packs: a pouch is waiting to be torn, or a card has been turned over. */
  show?: 'none' | 'pouch' | 'reveal';
  /** Today, by the player's own clock (view/clock.ts): the rewards' tour asks whether anything waits. */
  day?: number;
  /** On the screen of cards: which of its two it is, the units' or the structures'. */
  page?: 'units' | 'structures';
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
  /** It has a button of its own, and is over when that is pressed. */
  ok?: boolean;
  /** What that button says. GOT IT, if left out. */
  button?: string;
  /** For a step of a tour: the tour it is of, its place in it from 1, and how many steps the tour has. */
  tour?: string;
  n?: number;
  of?: number;
  /** For a step of a tour: pressing what it points at is what moves the tour on. */
  press?: boolean;
}

const HELLO: Step = {
  id: 'hello', target: 'battle', holds: false, blocks: false,
  text: 'Your units fight on their own. Watch!',
};
const PACKS: Step = {
  id: 'packs', target: 'packs', holds: true, blocks: true,
  text: 'You have packs. Tap PACKS.',
};
const OPEN: Step = {
  id: 'open', target: 'open', holds: true, blocks: true,
  text: 'Tap OPEN.',
};
const TEAR: Step = {
  id: 'tear', target: 'pouch', holds: true, blocks: true,
  text: 'Tap the pack.',
};
const CARD: Step = {
  id: 'card', target: 'reveal:done', holds: true, blocks: true,
  text: 'Grades run from F up to S. Tap DONE.',
};
const CLOSE_PACKS: Step = {
  id: 'close-packs', target: 'close', holds: true, blocks: true,
  text: 'Tap CLOSE.',
};
const UNITS: Step = {
  id: 'units', target: 'units', holds: true, blocks: true,
  text: 'Tap UNITS to see your team.',
};
const FILL: Step = {
  id: 'fill', target: 'fill', holds: true, blocks: true,
  text: 'FILL TEAM picks your best. Tap it.',
};
const CLOSE_UNITS: Step = {
  id: 'close-units', target: 'close', holds: true, blocks: true,
  text: 'Tap CLOSE.',
};
const STRUCTS: Step = {
  id: 'structures', target: 'structures', holds: true, blocks: true,
  text: 'You have a tower too. Tap STRUCTURES.',
};
const CLOSE_STRUCTS: Step = {
  id: 'close-structures', target: 'close', holds: true, blocks: true,
  text: 'Towers fight from where they stand. Tap CLOSE.',
};
const WORD: Step = {
  id: 'word', target: 'stages', holds: true, blocks: true, ok: true,
  text: 'Win to move on. Lose and you drop back a stage. Tap here for the map.',
};

/** Every step, for the tests and for whoever wants to read them in order. */
export const STEPS: readonly Step[] = [HELLO, PACKS, OPEN, TEAR, CARD, CLOSE_PACKS, UNITS, FILL, CLOSE_UNITS, STRUCTS, CLOSE_STRUCTS, WORD];

export function seen(save: SaveData, id: string): boolean {
  return save.tutorial.seen.includes(id);
}

/**
 * The first tutorial is over. The rewards are shown straight after it, by
 * the owner's word of 24 November 2026 ("After the initial tutorial / SHOW
 * the reward screen"): their tour is up from its first note, and `open`
 * asks the main screen to open the screen it is on. The other tours wait
 * for battles to be fought.
 */
function endFirst(save: SaveData): void {
  save.tutorial.done = true;
  save.tutorial.at = save.stats.battles;
  // The first tutorial showed the tower and its screen: the structures need no tour of their own after it.
  for (const id of ['tour:basics', 'tour:structures']) if (!seen(save, id)) save.tutorial.seen.push(id);
  if (!tourSeen(save, 'rewards')) save.tutorial.tour = { id: 'rewards', step: 1, open: true };
}

/**
 * The screen the main screen should open now, because a tour starts on it:
 * the scene's key, or null. Asking takes the request away.
 */
export function tourOpens(save: SaveData): string | null {
  if (save.tutorial.show) {
    const key = save.tutorial.show;
    delete save.tutorial.show;
    return key;
  }
  const t = save.tutorial.tour;
  const at = t?.open ? tourById(t.id)?.steps[t.step] : undefined;
  if (!t || !at) return null;
  delete t.open;
  return at.scene === 'Worlds' ? 'Map' : at.scene;
}

/** Notes that a part of the tutorial is behind the player. Ends the tutorial with its last part. */
export function markSeen(save: SaveData, id: string): void {
  if (save.tutorial.done) return;
  if (!seen(save, id)) save.tutorial.seen.push(id);
  if (id === 'word') endFirst(save);
}

/** SKIP: ends the first tutorial, or the tour that is up. */
export function skipTutorial(save: SaveData): void {
  if (!save.tutorial.done) {
    endFirst(save);
    // Whoever skips the tutorial is shown the rewards all the same, without the notes on them.
    const t = save.tutorial.tour;
    if (t) {
      save.tutorial.seen.push(`tour:${t.id}`);
      save.tutorial.tour = null;
      save.tutorial.show = 'Rewards';
    }
  } else endTour(save);
}

/** The step of the first tutorial to show now, or null for none. */
function firstStep(save: SaveData, ctx: GuideContext): Step | null {
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
    if (ctx.scene !== 'Team' || ctx.page === 'structures') return null;
    return seen(save, 'fill') ? CLOSE_UNITS : FILL;
  }

  // Then the tower they started with, which has a screen of its own.
  if (!seen(save, 'structures')) {
    if (onMain) return STRUCTS;
    return ctx.scene === 'Team' && ctx.page === 'structures' ? CLOSE_STRUCTS : null;
  }

  // And a last word.
  return onMain ? WORD : null;
}

// ------------------------------------------------------------ tours

export interface TourStep {
  /** The screen it is shown on. */
  scene: GuideScene;
  /** The name of what it points at, as that screen marked it. */
  target: string;
  text: string;
  /**
   * press: the player presses what it points at, and that is what moves the
   * tour on (it opens a screen, turns a page, or shuts the screen).
   * note: it is read, and NEXT moves on.
   */
  kind: 'press' | 'note';
}

export interface Tour {
  id: string;
  /** What the list in the settings calls it, and one line under that. */
  name: string;
  blurb: string;
  /**
   * When it starts by itself: the first time this is true on the main
   * screen, if it has not been seen. Left out, it never starts by itself.
   */
  when?: (save: SaveData, day: number) => boolean;
  /** Whether the player has come to what it is about. Until then the list shows it dark, as "???". Always, if left out. */
  known?: (save: SaveData) => boolean;
  steps: readonly TourStep[];
}

const press = (scene: GuideScene, target: string, text: string): TourStep => ({ scene, target, text, kind: 'press' });
const note = (scene: GuideScene, target: string, text: string): TourStep => ({ scene, target, text, kind: 'note' });

/** True when the player's coins would buy something the shop sells. */
function canBuyPack(save: SaveData): boolean {
  return SHELF.some((p) => packOpen(save, p) && save.coins >= priceOf(save, p));
}
function canBuyUpgrade(save: SaveData): boolean {
  return UPGRADES.some((u) => {
    const cost = upgradeCost(save, u);
    return cost !== null && save.coins >= cost;
  });
}
export function dungeonOpen(save: SaveData): boolean {
  return DUNGEONS.some((d) => placeOpen(save, d));
}
export function raidOpen(save: SaveData): boolean {
  return RAIDS.some((r) => placeOpen(save, r));
}

/**
 * Every tour, in the order the list shows them, which is also the order
 * they are offered in when more than one is due.
 */
export const TOURS: readonly Tour[] = [
  {
    // What the first tutorial taught, as notes on the main screen: it is on the list from the start, and is never started by itself.
    id: 'basics', name: 'The basics', blurb: 'Battles, and where everything is.',
    steps: [
      note('Main', 'board', 'Your units fight by themselves. Drag to move them.'),
      note('Main', 'battle', 'BATTLE starts the fight.'),
      note('Main', 'auto', 'AUTO keeps battles going. 2x doubles the speed.'),
      note('Main', 'stages', 'Win to move on. Tap for the map.'),
      note('Main', 'packs', 'Packs give cards.'),
      note('Main', 'units', 'Pick who fights here.'),
      note('Main', 'level', 'Level up for skill points.'),
      note('Main', 'settings', 'Sound and tutorials are here.'),
    ],
  },
  {
    id: 'rewards', name: 'Rewards', blurb: 'Daily and playtime rewards.',
    // Not on top of the first tutorial: a few battles in.
    when: (save, day) => save.stats.battles >= 3 && rewardsWaiting(save, day) > 0,
    steps: [
      press('Main', 'rewards', 'A reward is ready. Tap REWARDS.'),
      note('Rewards', 'calendar', 'Claim one each day. Days 2 and 7 give special units.'),
      note('Rewards', 'playtime', 'Play to earn more. 10 minutes gives a special pack.'),
      note('Rewards', 'day', 'Tap CLAIM.'),
    ],
  },
  {
    id: 'packs', name: 'Packs', blurb: 'Buying and opening packs.',
    // The first tutorial has just opened a pack with them: this waits a few battles, and for coins enough to buy one.
    when: (save) => save.stats.battles >= 6 && canBuyPack(save),
    steps: [
      press('Main', 'packs', 'You can afford a pack. Tap PACKS.'),
      note('Shop', 'slots', 'Harder packs give better grades.'),
      note('Shop', 'detail', 'This is what the pack can give.'),
      note('Shop', 'buy', 'Green buys. Gold opens.'),
    ],
  },
  {
    // Dungeons and raids are taught apart, each when it opens: by the owner's word of 24 November 2026,
    // "DONT FUSE RAID WITH DUNGEON, THE TUTORIAL FOR DUNGEON SHOWS RAID EVEN THO ITS NOT UNLOCKED YET".
    id: 'dungeons', name: 'Dungeons', blurb: 'Floors with no healing.',
    when: (save) => dungeonOpen(save),
    known: (save) => dungeonOpen(save),
    steps: [
      press('Main', 'hall', 'A dungeon is open. Tap DUNGEONS.'),
      note('Hall', 'dungeon', 'Several floors, no healing between them.'),
      note('Hall', 'tiers', 'Beat one difficulty to open the next.'),
    ],
  },
  {
    id: 'raids', name: 'Raids', blurb: 'One long fight with a boss.',
    when: (save) => raidOpen(save),
    known: (save) => raidOpen(save),
    steps: [
      press('Main', 'raids', 'A raid is open. Tap RAIDS.'),
      note('Hall', 'raid', 'One long fight with a boss.'),
    ],
  },
  {
    id: 'skills', name: 'Skill points', blurb: 'Your level and the skill tree.',
    when: (save) => pointsFree(save) > 0,
    steps: [
      press('Main', 'level', 'You have a skill point. Tap your level.'),
      note('Player', 'tree', 'Pick a skill.'),
      note('Player', 'spend', 'SPEND A POINT ranks it up.'),
    ],
  },
  {
    id: 'upgrades', name: 'Upgrades', blurb: 'What coins buy for good.',
    when: (save) => canBuyUpgrade(save),
    steps: [
      press('Main', 'level', 'You can afford an upgrade. Tap your level.'),
      note('Player', 'upgrades', 'Upgrades cost coins and last forever.'),
    ],
  },
  {
    id: 'structures', name: 'Structures', blurb: 'Towers and traps.',
    when: (save) => structuresSize(save) > 0,
    known: (save) => structuresSize(save) > 0,
    steps: [
      press('Main', 'structures', 'You can field a structure. Tap STRUCTURES.'),
      note('Team', 'grid', 'Towers shoot. Traps go off once.'),
    ],
  },
];

export function tourById(id: string): Tour | undefined {
  return TOURS.find((t) => t.id === id);
}

export function tourSeen(save: SaveData, id: string): boolean {
  return seen(save, `tour:${id}`);
}

/** Whether the list shows a tour as what it is: the player has come to what it is about. */
export function tourKnown(save: SaveData, tour: Tour): boolean {
  return tour.known ? tour.known(save) : true;
}

/** How many battles are fought after one tutorial ends before the next may start. */
export const TOUR_GAP = 2;

/** The tour that is due to start by itself now, or null. Never while the first tutorial runs, nor straight after another. */
export function tourDue(save: SaveData, day: number): Tour | null {
  if (!save.tutorial.done || save.tutorial.tour) return null;
  if (save.stats.battles < save.tutorial.at + TOUR_GAP) return null;
  for (const tour of TOURS) if (tour.when && !tourSeen(save, tour.id) && tour.when(save, day)) return tour;
  return null;
}

/** Starts a tour from its first step, whether it has been seen or not: this is how one is viewed again. */
export function startTour(save: SaveData, id: string): boolean {
  if (!tourById(id)) return false;
  save.tutorial.tour = { id, step: 0 };
  return true;
}

/** Ends the tour that is up: it has been seen, and the next waits for another battle. */
export function endTour(save: SaveData): void {
  const t = save.tutorial.tour;
  if (!t) return;
  if (!tourSeen(save, t.id)) save.tutorial.seen.push(`tour:${t.id}`);
  save.tutorial.tour = null;
  save.tutorial.at = save.stats.battles;
}

/** Moves the tour that is up on to its next step, or ends it after its last. */
export function advanceTour(save: SaveData): void {
  const t = save.tutorial.tour;
  const tour = t && tourById(t.id);
  if (!t || !tour) return;
  t.step++;
  if (t.step >= tour.steps.length) endTour(save);
}

/** The step of the tour that is up, as this screen should show it, or null. */
function tourStep(save: SaveData, ctx: GuideContext): Step | null {
  for (;;) {
    const t = save.tutorial.tour;
    if (!t) return null;
    const tour = tourById(t.id);
    const at = tour?.steps[t.step];
    if (!tour || !at) {
      // A tour that is no longer there: nothing to show.
      save.tutorial.tour = null;
      return null;
    }
    if (ctx.scene === 'Main' && !ctx.covered && at.scene !== 'Main' && t.open) return null;
    if (ctx.scene === 'Main' && !ctx.covered && at.scene !== 'Main') {
      // The field is on show and the step belongs to a screen that is shut.
      if (at.kind === 'press' && at.target === 'close') {
        // It was shut because the step asked for that: on to the next.
        advanceTour(save);
        continue;
      }
      // It was shut some other way: back to the step that leads into it.
      let back = t.step;
      while (back > 0 && tour.steps[back].scene !== 'Main') back--;
      if (tour.steps[back].scene !== 'Main') {
        endTour(save);
        return null;
      }
      t.step = back;
      continue;
    }
    if (at.scene !== ctx.scene) return null;
    const last = t.step === tour.steps.length - 1;
    return {
      id: `${tour.id}:${t.step}`,
      target: at.target,
      text: at.text,
      holds: true,
      blocks: true,
      ok: at.kind === 'note',
      button: last ? 'DONE' : 'NEXT',
      tour: tour.id,
      n: t.step + 1,
      of: tour.steps.length,
      press: at.kind === 'press',
    };
  }
}

/**
 * The step to show now, or null for none: a step of the first tutorial
 * while that runs, then of whichever tour is up. A tour that is due is
 * started here, when the main screen is still and nothing is open over it.
 */
export function tutorialStep(save: SaveData, ctx: GuideContext): Step | null {
  if (!save.tutorial.done) return firstStep(save, ctx);
  if (!save.tutorial.tour && ctx.scene === 'Main' && !ctx.covered && !ctx.busy) {
    const due = tourDue(save, ctx.day ?? 0);
    if (due) startTour(save, due.id);
  }
  return tourStep(save, ctx);
}
