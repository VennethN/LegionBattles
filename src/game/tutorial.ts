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

/** The first tutorial is over: from the next battle on, the tours may start. */
function endFirst(save: SaveData): void {
  save.tutorial.done = true;
  save.tutorial.at = save.stats.battles;
  if (!seen(save, 'tour:basics')) save.tutorial.seen.push('tour:basics');
}

/** Notes that a part of the tutorial is behind the player. Ends the tutorial with its last part. */
export function markSeen(save: SaveData, id: string): void {
  if (save.tutorial.done) return;
  if (!seen(save, id)) save.tutorial.seen.push(id);
  if (id === 'word') endFirst(save);
}

/** SKIP: ends the first tutorial, or the tour that is up. */
export function skipTutorial(save: SaveData): void {
  if (!save.tutorial.done) endFirst(save);
  else endTour(save);
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
    if (ctx.scene !== 'Team') return null;
    return seen(save, 'fill') ? CLOSE_UNITS : FILL;
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
function hallOpen(save: SaveData): boolean {
  return DUNGEONS.some((d) => placeOpen(save, d)) || RAIDS.some((r) => placeOpen(save, r));
}

/**
 * Every tour, in the order the list shows them, which is also the order
 * they are offered in when more than one is due.
 */
export const TOURS: readonly Tour[] = [
  {
    // What the first tutorial taught, as notes on the main screen: it is on the list from the start, and is never started by itself.
    id: 'basics', name: 'The basics', blurb: 'The field, battles, and where everything is.',
    steps: [
      note('Main', 'board', 'This is the field. Your units stand on the left and fight by themselves. Before a battle starts, drag one to move it.'),
      note('Main', 'battle', 'BATTLE starts the fight now. Left alone it counts down and starts by itself. While a battle runs it says STOP.'),
      note('Main', 'auto', 'AUTO ON keeps the battles coming. Turn it off to fight one at a time. The button beside it plays them at double speed.'),
      note('Main', 'stages', 'Your stage, and its world. A first win moves you on. A loss steps you back one stage to grow. Press it for the map of every stage.'),
      note('Main', 'packs', 'PACKS: every pack holds one card. Stages drop them and coins buy them.'),
      note('Main', 'units', 'UNITS: every card you hold. Choose who fights, and combine the cards you have no use for into the ones you do.'),
      note('Main', 'level', 'Your own level. Every battle teaches you a little, and each level is a point for the skill tree.'),
      note('Main', 'settings', 'Sound, music and the rest are here. So is this list: every tutorial can be viewed again.'),
    ],
  },
  {
    id: 'rewards', name: 'Rewards', blurb: 'The daily calendar and the time you play.',
    // Not on top of the first tutorial: a few battles in.
    when: (save, day) => save.stats.battles >= 3 && rewardsWaiting(save, day) > 0,
    steps: [
      press('Main', 'rewards', 'Something waits for you here. Press REWARDS.'),
      note('Rewards', 'calendar', 'A day of the calendar each day you come back. Miss a day and nothing is lost. Its second and seventh days give cards that no pack holds.'),
      note('Rewards', 'playtime', 'The time you play today earns these, and starts again tomorrow. Ten minutes gives a pack that no shop sells.'),
      note('Rewards', 'day', 'Whatever is ready has a green CLAIM on it. The count on the REWARDS button says how many wait.'),
    ],
  },
  {
    id: 'packs', name: 'Packs', blurb: 'What a pack holds, and buying more.',
    // The first tutorial has just opened a pack with them: this waits a few battles, and for coins enough to buy one.
    when: (save) => save.stats.battles >= 6 && canBuyPack(save),
    steps: [
      press('Main', 'packs', 'You have coins enough for a pack. Press PACKS.'),
      note('Shop', 'slots', 'Every pack has a slot. A land has a pack of its own on each difficulty, and the harder ones hand out better grades.'),
      note('Shop', 'detail', 'The pack you pressed, and all it can turn over. Press a small tile to see what it is and how likely. The two badges are the worst and the best grade it gives.'),
      note('Shop', 'buy', 'The green buttons buy with coins, one or ten. OPEN opens one, and the button beside it up to ten at once.'),
      press('Shop', 'close', 'A new card joins your team while there is room. Press CLOSE.'),
    ],
  },
  {
    id: 'hall', name: 'Dungeons and raids', blurb: 'Fights off the line of stages.',
    when: (save) => hallOpen(save),
    known: (save) => hallOpen(save),
    steps: [
      press('Main', 'hall', 'A dungeon has opened. Press DUNGEONS.'),
      note('Hall', 'dungeon', 'A dungeon is floors fought one after another. Nothing heals between them and the fallen stay down, so you bring two reserves and choose who goes in at each floor. Only the last floor pays.'),
      note('Hall', 'raid', 'A raid is one long battle against a lord grown huge. He calls up more of his own for as long as he stands.'),
      note('Hall', 'tiers', 'Each has five difficulties. Clearing one opens the next, and each pays better packs than the last.'),
      press('Hall', 'close', 'ENTER takes your team in, whenever you like. For now, press CLOSE.'),
    ],
  },
  {
    id: 'skills', name: 'Skill points', blurb: 'Your level, and the skill tree.',
    when: (save) => pointsFree(save) > 0,
    steps: [
      press('Main', 'level', 'You made a level, and a level is a skill point. Press your level.'),
      note('Player', 'tree', 'The skill tree. Each skill has ranks, and some open only when the one before them has ranks enough.'),
      note('Player', 'spend', 'Press a skill to read it here. SPEND A POINT takes a rank of it. Every point can be taken back and spent again.'),
      press('Player', 'close', 'Spend yours when you like. Press CLOSE.'),
    ],
  },
  {
    id: 'upgrades', name: 'Upgrades', blurb: 'What coins buy for good.',
    when: (save) => canBuyUpgrade(save),
    steps: [
      press('Main', 'level', 'You have coins enough for an upgrade. Press your level.'),
      note('Player', 'upgrades', 'Upgrades are bought with coins and kept for good. Each level of one costs more than the last.'),
      note('Player', 'totals', 'Everything you have, from skills and upgrades together, is added up here.'),
      press('Player', 'close', 'Buy what you like. Press CLOSE.'),
    ],
  },
  {
    id: 'structures', name: 'Structures', blurb: 'Buildings and traps, and where they go.',
    when: (save) => structuresSize(save) > 0,
    known: (save) => structuresSize(save) > 0,
    steps: [
      press('Main', 'units', 'Your team has a place for a structure now. Press UNITS.'),
      press('Team', 'tab:structures', 'Buildings and traps have a page of their own. Press STRUCTURES.'),
      note('Team', 'grid', 'A building stands where you put it: a tower shoots, a barracks sends out troops, a wall holds. A trap lies in wait and goes off once. They take the places for structures, not the places for units.'),
      press('Team', 'close', 'Press one to read it, and PUT IN TEAM to field it. Press CLOSE.'),
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
