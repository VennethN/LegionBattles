// The tutorials. There are two kinds.
//
// The first is the one a new player plays through, and it is three things
// done, not read: in their first battle they call a skill, on its result
// they open the pack it dropped, and they put its card on the field. Each
// is shown by a hand that taps on the thing, with a word. Nothing else is
// shown to them: the packs, the units and the structures have screens of
// their own, and a tour each for the first time they matter. It was not
// always so. The first tutorial used to say "Your units fight on their own.
// Watch!", play the first battle by itself, and then point at eleven
// buttons across three menus; a portal sent the game back for it, asking
// for onboarding "in gameplay" that "prioritizes visuals and limits the use
// of text".
//
// Which of its steps is up is worked out afresh each time, from the save
// and from what is on the screen. So a reload in the middle carries on:
// with a pack to open, or a card in hand and a place for it.
//
// The second kind is a tour: a few notes on one part of the game (the
// packs, the team, the dungeons, the raids, skill points, upgrades,
// structures), each pointing at the thing it is about. The rewards have
// none: the owner asked for them to be left out of the tutorials, and their
// button says enough. A tour starts by itself the first time its part of
// the game matters, and never straight after another: a couple of battles
// are fought between two of them. Once seen it is on the list in the
// settings, where any of them can be viewed again. By the owner's word of
// 24 November 2026: "Make sure that we have tutorial drivers for important
// things / E.g the game itself, dungeons and raids, skill points, upgrades,
// packs / and show them appropriately / and allow players to view them
// again once they are already seen".
//
// A tour is data: TOURS below. What a step points at is found by name among
// what the screen has marked (view/ui/Guide.ts).
//
// The words are few. By the owner's word of 24 November 2026, of a note
// three sentences long: "the tutorial text are too long and ai-ish / Please
// simplify them to the thing that users only needed to know, we want to
// minimize reading". A step of a tour says one thing, in a line; a step of
// the first tutorial says a word. Tests hold both.
//
// A tour ends on the screen it led into, with everything there free to be
// pressed: it never ends by asking for CLOSE. The owner, of a last step that
// said "Buy what you like. Press CLOSE." with the buttons under the shade:
// "how does this make sense, i cant buy anything if you cover it".
//
// While a step of a tour points at something, nothing else can be pressed,
// and battles do not start by themselves: a tutorial leads the player out of
// whatever it led them into.

import { DUNGEONS, RAIDS } from '../data/expeditions';
import { PACKS as SHELF } from '../data/packs';
import { UPGRADES } from '../data/player';
import { isStructure } from '../data/units';
import { placeOpen } from './expeditions';
import { pointsFree, upgradeCost } from './player';
import { FIRST_PACK, inTeam, packOpen, packsHeld, priceOf, roomFor, structuresSize, tileFor, toggleTeam } from './rules';
import type { SaveData } from './state';

export type GuideScene = 'Main' | 'Shop' | 'Team' | 'Worlds' | 'Rewards' | 'Hall' | 'Player' | 'Settings';

/** What is on the screen, as the scene that asks sees it. */
export interface GuideContext {
  scene: GuideScene;
  /** On the main screen: another screen is open over it. */
  covered?: boolean;
  /** On the main screen: a battle is being fought, or what it came to is being shown. */
  busy?: boolean;
  /** On the main screen: what the board is doing. The team is standing ready, a battle is being fought, or its result is up. */
  phase?: 'ready' | 'fighting' | 'after';
  /** On the main screen, in a battle: a skill of one of the player's units can be called now. */
  callable?: boolean;
  /** A pack is being opened: a pouch is waiting to be torn, or a card has been turned over. */
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
  /**
   * It is shown by a hand that taps on what it points at, with its word
   * beside it, and no bubble: a step of the first tutorial, which is done
   * and not read.
   */
  hand?: boolean;
  /** What it points at shows itself, with a ring of its own: no ring is drawn round it. */
  bare?: boolean;
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

// In a battle, the first time a skill of theirs can be called: the battle all but stops until it is.
const TAP: Step = { id: 'tap', target: 'callable', holds: false, blocks: false, hand: true, bare: true, text: 'TAP!' };
// On the result of their first battle: the pack it dropped, opened where it lies.
const OPEN: Step = { id: 'open', target: 'gift', holds: true, blocks: true, hand: true, text: 'OPEN!' };
// And the card that came out of it, put on a tile of their choosing.
const PLACE: Step = { id: 'place', target: 'tile', holds: true, blocks: false, hand: true, text: 'PLACE!' };

/**
 * How fast the first battle runs while its hand waits for the first skill to
 * be called: all but stopped, so that nothing is lost by reading the screen.
 */
export const TAP_SLOW = 0.03;

/** Every step, for the tests and for whoever wants to read them in order. */
export const STEPS: readonly Step[] = [TAP, OPEN, PLACE];

export function seen(save: SaveData, id: string): boolean {
  return save.tutorial.seen.includes(id);
}

/**
 * The first tutorial is over, and nothing is opened after it. The rewards
 * were shown here for a day, and then the owner, of 24 November 2026:
 * "Actually let's not show the reward after the tutorial / But make sure
 * the reward button is really obvious and you wanna really click it
 * (exclude the reward from the tutorial as well)". So no tutorial speaks of
 * the rewards: their button on the main screen does that by itself
 * (RewardsPill in view/ui/chrome.ts). The tours wait for battles to be
 * fought.
 */
function endFirst(save: SaveData): void {
  save.tutorial.done = true;
  save.tutorial.at = save.stats.battles;
  // What the first tutorial taught is what the basics say: that tour is on the list as seen, to be viewed again.
  if (!seen(save, 'tour:basics')) save.tutorial.seen.push('tour:basics');
}

/** Notes that a part of the tutorial is behind the player. Ends the tutorial with its last part. */
export function markSeen(save: SaveData, id: string): void {
  if (save.tutorial.done) return;
  if (!seen(save, id)) save.tutorial.seen.push(id);
  if (id === 'place') endFirst(save);
}

/**
 * The card the first tutorial has the player put on the field: the newest
 * they hold that fights and is in no team, once a pack has been opened, if
 * the team has a place for it. Null if there is none, or the tutorial is
 * over.
 */
export function cardToPlace(save: SaveData): number | null {
  if (save.tutorial.done || seen(save, 'place') || save.stats.opened === 0) return null;
  let best = -1;
  let unit = '';
  for (const c of save.cards) {
    if (c.id > best && !isStructure(c.unit) && !inTeam(save, c.id)) {
      best = c.id;
      unit = c.unit;
    }
  }
  return best >= 0 && roomFor(save, unit) ? best : null;
}

/** The tile the tutorial's hand points at for that card, written as the first field's are: where it would go by itself. */
export function placeTile(save: SaveData): [number, number] | null {
  const card = cardToPlace(save);
  const held = card === null ? undefined : save.cards.find((c) => c.id === card);
  return held ? tileFor(save, held.unit) : null;
}

/** SKIP: ends the first tutorial, or the tour that is up. A card that was waiting to be put on the field walks onto it. */
export function skipTutorial(save: SaveData): void {
  if (!save.tutorial.done) {
    const card = cardToPlace(save);
    if (card !== null) toggleTeam(save, card);
    endFirst(save);
  } else endTour(save);
}

/** The step of the first tutorial to show now, or null for none. */
function firstStep(save: SaveData, ctx: GuideContext): Step | null {
  if (ctx.scene !== 'Main' || ctx.covered) return null;
  // In a battle there is one thing to learn, the first time it can be done.
  if (ctx.phase === 'fighting') return !seen(save, 'tap') && ctx.callable ? TAP : null;
  // While a pack is being opened nothing points at anything.
  if (ctx.show === 'pouch' || ctx.show === 'reveal') return null;
  // The first battle starts by itself: there is nothing to press before it.
  if (save.stats.battles === 0) return null;
  // The card first, if one is in hand: it goes on the field once the field is on show again.
  if (cardToPlace(save) !== null) return ctx.phase === 'ready' ? PLACE : null;
  if (save.stats.opened === 0 && (save.packs[FIRST_PACK] ?? 0) > 0) return OPEN;
  return null;
}

/**
 * True when the first tutorial has nothing left to show: a battle has been
 * fought, the field is still, and there is neither a pack to open nor a
 * card to place. A player who opened their pack and placed their card some
 * other way has done what it teaches.
 */
function firstOver(save: SaveData, ctx: GuideContext): boolean {
  return ctx.scene === 'Main' && !ctx.covered && ctx.phase === 'ready' && ctx.show !== 'pouch' && ctx.show !== 'reveal' && save.stats.battles > 0;
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
/** True when the player holds a card that is in no team: one that fights, or a structure. */
function spareCard(save: SaveData, structure: boolean): boolean {
  return save.cards.some((c) => isStructure(c.unit) === structure && !inTeam(save, c.id));
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
      note('Main', 'board', 'Tap a glowing unit for its skill. Drag units to move them.'),
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
    id: 'packs', name: 'Packs', blurb: 'Buying and opening packs.',
    // The first tutorial opened one pack with them, on the field. The screen of packs matters once they hold
    // another, which a new player does from the start, or have coins enough to buy one.
    when: (save) => packsHeld(save) > 0 || (save.stats.battles >= 6 && canBuyPack(save)),
    steps: [
      press('Main', 'packs', 'Packs give cards. Tap PACKS.'),
      note('Shop', 'slots', 'Harder packs give better grades.'),
      note('Shop', 'detail', 'This is what the pack can give.'),
      note('Shop', 'buy', 'Green buys. Gold opens.'),
    ],
  },
  {
    // The team's own screen matters the first time there is a choice to make: a card that fights and is in no team.
    id: 'team', name: 'Your team', blurb: 'Who fights, and where.',
    when: (save) => spareCard(save, false),
    steps: [
      press('Main', 'units', 'You hold more cards. Tap UNITS.'),
      note('Team', 'fill', 'FILL TEAM picks your best.'),
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
    // A new player's tower stands from the start and needs no words. Its screen matters when there is a second to choose from.
    when: (save) => spareCard(save, true),
    known: (save) => structuresSize(save) > 0,
    steps: [
      press('Main', 'structures', 'A new structure! Tap STRUCTURES.'),
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
  if (!save.tutorial.done) {
    const step = firstStep(save, ctx);
    if (step || !firstOver(save, ctx)) return step;
    endFirst(save);
  }
  if (!save.tutorial.tour && ctx.scene === 'Main' && !ctx.covered && !ctx.busy) {
    const due = tourDue(save, ctx.day ?? 0);
    if (due) startTour(save, due.id);
  }
  return tourStep(save, ctx);
}
