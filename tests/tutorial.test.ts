import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { addPlayerXp } from '../src/game/player';
import { claimDaily } from '../src/game/rewards';
import { finishStage, openPack, startingSave } from '../src/game/rules';
import { repair, type SaveData } from '../src/game/state';
import {
  STEPS, TOURS, TOUR_GAP, advanceTour, endTour, markSeen, skipTutorial, startTour, tourById, tourDue, tourKnown, tourSeen, tutorialStep, type GuideContext,
  type GuideScene,
} from '../src/game/tutorial';

const main: GuideContext = { scene: 'Main' };
const id = (save: ReturnType<typeof startingSave>, ctx: GuideContext): string | null => tutorialStep(save, ctx)?.id ?? null;

describe('the tutorial', () => {
  it('walks a new player from the first battle to the packs, the team and a last word', () => {
    const save = startingSave(1);
    // The first battle is watched, and nothing waits for the player.
    expect(id(save, main)).toBe('hello');
    expect(tutorialStep(save, main)?.holds).toBe(false);
    expect(tutorialStep(save, main)?.blocks).toBe(false);

    finishStage(save, 0, true);
    expect(id(save, main)).toBe('packs');
    expect(id(save, { scene: 'Shop', show: 'none' })).toBe('open');
    expect(id(save, { scene: 'Shop', show: 'pouch' })).toBe('tear');
    openPack(save, 'recruit');
    expect(id(save, { scene: 'Shop', show: 'reveal' })).toBe('card');
    expect(id(save, { scene: 'Shop', show: 'none' })).toBe('close-packs');
    // Back on the field before the packs are shut behind them: still the packs.
    expect(id(save, main)).toBe('packs');
    markSeen(save, 'packs');

    expect(id(save, main)).toBe('units');
    expect(id(save, { scene: 'Team' })).toBe('fill');
    markSeen(save, 'fill');
    expect(id(save, { scene: 'Team' })).toBe('close-units');
    markSeen(save, 'team');

    expect(id(save, main)).toBe('word');
    expect(tutorialStep(save, main)?.ok).toBe(true);
    markSeen(save, 'word');
    expect(save.tutorial.done).toBe(true);
    expect(tutorialStep(save, main)).toBeNull();
  });

  it('every step after the first holds the battles and lets nothing else be pressed', () => {
    for (const step of STEPS.slice(1)) {
      expect(step.holds, step.id).toBe(true);
      expect(step.blocks, step.id).toBe(true);
      expect(step.target.length, step.id).toBeGreaterThan(0);
      expect(step.text.length, step.id).toBeLessThan(190);
    }
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(STEPS.length);
  });

  it('shows nothing on a screen a step does not belong to, or under another screen', () => {
    const save = startingSave(1);
    expect(tutorialStep(save, { scene: 'Shop', show: 'none' })).toBeNull();
    expect(tutorialStep(save, { scene: 'Main', covered: true })).toBeNull();
    finishStage(save, 0, true);
    expect(tutorialStep(save, { scene: 'Team' })).toBeNull();
    expect(tutorialStep(save, { scene: 'Worlds' })).toBeNull();
  });

  it('picks up where it was after a reload', () => {
    const save = startingSave(1);
    finishStage(save, 0, true);
    openPack(save, 'recruit');
    markSeen(save, 'packs');
    const back = repair(JSON.parse(JSON.stringify(save)), 9);
    expect(back.tutorial.done).toBe(false);
    expect(id(back, main)).toBe('units');
  });

  it('skips the packs when there are none to open', () => {
    const save = startingSave(1);
    save.packs = {};
    save.stats.battles = 3;
    expect(id(save, main)).toBe('units');
  });

  it('can be skipped, and is over for good', () => {
    const save = startingSave(1);
    skipTutorial(save);
    expect(save.tutorial.done).toBe(true);
    expect(tutorialStep(save, main)).toBeNull();
    // None of its steps comes back, whatever is played after.
    finishStage(save, 0, true);
    const first = new Set(STEPS.map((s) => s.id));
    for (const ctx of [main, { scene: 'Shop', show: 'none' }, { scene: 'Team' }] as GuideContext[]) {
      const step = tutorialStep(save, ctx);
      expect(step === null || !first.has(step.id)).toBe(true);
    }
  });
});

describe('the tutorial and a battle', () => {
  it('asks for no press while a battle is on or its result is up, and still says its first word', () => {
    const save = startingSave(1);
    expect(tutorialStep(save, { scene: 'Main', busy: true })?.id).toBe('hello');
    finishStage(save, 0, true);
    expect(tutorialStep(save, { scene: 'Main', busy: true })).toBeNull();
    expect(tutorialStep(save, { scene: 'Main', busy: false })?.id).toBe('packs');
  });
});

// ------------------------------------------------------------ tours

const DAY = 20000;
const at = (scene: GuideScene, more: Partial<GuideContext> = {}): GuideContext => ({ scene, day: DAY, ...more });

/** A player whose first tutorial is behind them, with a few battles fought. */
function played(): SaveData {
  const save = startingSave(1);
  skipTutorial(save);
  save.stats.battles = 6;
  save.coins = 0;
  // Today's day of the calendar is claimed, so that nothing waits unless a test says so.
  claimDaily(save, DAY);
  save.coins = 0;
  return save;
}

/** Walks whatever tour is up to its end, as a player would: pressing what a step asks for, and NEXT on a note. */
function walk(save: SaveData): string[] {
  const shown: string[] = [];
  let scene: GuideScene = 'Main';
  for (let i = 0; i < 40 && save.tutorial.tour; i++) {
    const tour = tourById(save.tutorial.tour.id)!;
    const step = tutorialStep(save, at(scene));
    expect(step, `${tour.id} on ${scene}`).not.toBeNull();
    if (!step) break;
    shown.push(`${scene}/${step.target}`);
    expect(step.blocks).toBe(true);
    expect(step.holds).toBe(true);
    if (step.press && step.target === 'close') {
      // CLOSE shuts the screen, and the field finds the tour where it was.
      scene = 'Main';
      tutorialStep(save, at('Main'));
      continue;
    }
    advanceTour(save);
    // A press on the field opens the screen the next step is on; while that is open the field shows nothing.
    const next: GuideScene = save.tutorial.tour ? tour.steps[save.tutorial.tour.step].scene : scene;
    if (next !== scene) {
      expect(tutorialStep(save, at('Main', { covered: true }))).toBeNull();
      scene = next;
    }
  }
  return shown;
}

describe('the tours', () => {
  it('are a few notes each, start on the main screen, and lead into one screen at the most', () => {
    expect(new Set(TOURS.map((t) => t.id)).size).toBe(TOURS.length);
    for (const tour of TOURS) {
      expect(tour.steps.length, tour.id).toBeGreaterThanOrEqual(3);
      expect(tour.steps.length, tour.id).toBeLessThanOrEqual(8);
      expect(tour.steps[0].scene, tour.id).toBe('Main');
      expect(tour.name.length, tour.id).toBeGreaterThan(0);
      expect(tour.blurb.length, tour.id).toBeLessThan(60);
      const screens = new Set(tour.steps.map((s) => s.scene).filter((s) => s !== 'Main'));
      expect(screens.size, tour.id).toBeLessThanOrEqual(1);
      let left = false;
      tour.steps.forEach((step, i) => {
        expect(step.text.length, `${tour.id} step ${i + 1}`).toBeLessThan(240);
        expect(step.text, `${tour.id} step ${i + 1}`).not.toContain('\u2014');
        // Once it has left the field it does not come back to it, and what leads off the field is a press.
        if (step.scene !== 'Main') {
          if (!left) expect(tour.steps[i - 1].kind, `${tour.id}: what leads into ${step.scene}`).toBe('press');
          left = true;
        } else expect(left, `${tour.id} step ${i + 1}`).toBe(false);
        // A step that asks for CLOSE is the last: it leads out of what the tour led into.
        if (step.kind === 'press' && step.target === 'close') expect(i, tour.id).toBe(tour.steps.length - 1);
      });
    }
  });

  it('there is one for each of the things the owner named', () => {
    const ids = TOURS.map((t) => t.id);
    // "the game itself, dungeons and raids, skill points, upgrades, packs"
    for (const id of ['basics', 'hall', 'skills', 'upgrades', 'packs', 'rewards']) expect(ids).toContain(id);
  });

  it('point only at what the screens have marked', () => {
    const file: Record<GuideScene, string> = {
      Main: 'MainScene', Shop: 'ShopScene', Team: 'TeamScene', Worlds: 'MapScene', Rewards: 'RewardsScene', Hall: 'HallScene', Player: 'PlayerScene',
      Settings: 'SettingsScene',
    };
    const source = new Map<string, string>();
    for (const tour of TOURS) {
      for (const step of tour.steps) {
        const name = file[step.scene];
        if (!source.has(name)) source.set(name, fs.readFileSync(`src/view/scenes/${name}.ts`, 'utf8'));
        expect(source.get(name), `${tour.id}: ${step.scene} marks "${step.target}"`).toContain(`mark('${step.target}'`);
      }
    }
    // And the first tutorial's steps, on the three screens it goes through.
    const all = ['MainScene', 'ShopScene', 'TeamScene'].map((n) => fs.readFileSync(`src/view/scenes/${n}.ts`, 'utf8')).join('\n');
    for (const step of STEPS) expect(all, step.id).toContain(`mark('${step.target}'`);
  });

  it('none starts while the first tutorial runs, and the basics never start by themselves', () => {
    const save = startingSave(1);
    save.coins = 99999;
    save.stats.battles = 9;
    addPlayerXp(save, 5000);
    expect(tourDue(save, DAY)).toBeNull();
    expect(tutorialStep(save, at('Main'))?.tour).toBeUndefined();
    expect(tourById('basics')?.when).toBeUndefined();
    // Ending the first tutorial is having seen the basics.
    skipTutorial(save);
    expect(tourSeen(save, 'basics')).toBe(true);
    const walked = startingSave(1);
    walked.stats.battles = 2;
    walked.packs = {};
    markSeen(walked, 'team');
    markSeen(walked, 'word');
    expect(walked.tutorial.done).toBe(true);
    expect(tourSeen(walked, 'basics')).toBe(true);
    // And the next waits for a couple of battles.
    walked.coins = 99999;
    expect(tourDue(walked, DAY)).toBeNull();
    walked.stats.battles += TOUR_GAP - 1;
    expect(tourDue(walked, DAY)).toBeNull();
    walked.stats.battles++;
    // With today's day of the calendar still to claim, the rewards come first.
    expect(tourDue(walked, DAY)?.id).toBe('rewards');
    claimDaily(walked, DAY);
    // The packs wait a few battles more: the first tutorial has only just opened one.
    expect(tourDue(walked, DAY)?.id).not.toBe('packs');
    walked.stats.battles = 6;
    expect(tourDue(walked, DAY)?.id).toBe('packs');
  });

  it('each starts the first time its part of the game matters', () => {
    const save = played();
    expect(tourDue(save, DAY)).toBeNull();
    // Coins enough for a pack.
    save.coins = 60;
    expect(tourDue(save, DAY)?.id).toBe('packs');
    endTourOf(save, 'packs');
    // A level made: a point to spend.
    save.coins = 0;
    addPlayerXp(save, 60);
    expect(save.player.level).toBeGreaterThan(1);
    expect(tourDue(save, DAY)?.id).toBe('skills');
    endTourOf(save, 'skills');
    // Coins enough for an upgrade, which is dearer than the first pack: the packs have been seen.
    save.coins = 200;
    expect(tourDue(save, DAY)?.id).toBe('upgrades');
    endTourOf(save, 'upgrades');
    // The first dungeon opens at the tenth stage.
    save.coins = 0;
    expect(tourDue(save, DAY)).toBeNull();
    save.cleared = 10;
    expect(tourDue(save, DAY)?.id).toBe('hall');
    endTourOf(save, 'hall');
    // The place for a structure has been open since the eighth.
    expect(tourDue(save, DAY)?.id).toBe('structures');
    endTourOf(save, 'structures');
    // And tomorrow a day of the calendar waits.
    expect(tourDue(save, DAY)).toBeNull();
    expect(tourDue(save, DAY + 1)?.id).toBe('rewards');
    expect(tutorialStep(save, at('Main', { day: DAY + 1 }))?.tour).toBe('rewards');
    endTour(save);
    save.stats.battles += TOUR_GAP;
    expect(tourDue(save, DAY + 1)).toBeNull();
    for (const tour of TOURS) expect(tourSeen(save, tour.id), tour.id).toBe(true);
  });

  it('come one at a time, with battles between them', () => {
    const save = played();
    save.stats.battles = 8;
    save.coins = 99999;
    save.cleared = 12;
    addPlayerXp(save, 500);
    const seen: string[] = [];
    const when: number[] = [];
    for (let i = 0; i < 24; i++) {
      const step = tutorialStep(save, at('Main'));
      if (step?.tour) {
        seen.push(step.tour);
        when.push(save.stats.battles);
        // It is up until it is ended, however often the screen asks.
        expect(tutorialStep(save, at('Main'))?.tour).toBe(step.tour);
        endTour(save);
        // And nothing follows it straight away.
        expect(tutorialStep(save, at('Main'))).toBeNull();
      }
      save.stats.battles++;
    }
    for (let i = 1; i < when.length; i++) expect(when[i] - when[i - 1]).toBe(TOUR_GAP);
    // Every tour that has a time of its own, in the order of the list. The rewards wait for a day when something waits.
    expect(seen).toEqual(TOURS.filter((t) => t.when && t.id !== 'rewards').map((t) => t.id));
  });

  it('do not start under another screen or in the middle of a battle', () => {
    const save = played();
    save.coins = 500;
    expect(tutorialStep(save, at('Main', { covered: true }))).toBeNull();
    expect(tutorialStep(save, at('Main', { busy: true }))).toBeNull();
    expect(tutorialStep(save, at('Shop'))).toBeNull();
    expect(save.tutorial.tour).toBeNull();
    expect(tutorialStep(save, at('Main'))?.tour).toBe('packs');
  });

  it('a tour leads into its screen, through its notes, and out again', () => {
    for (const tour of TOURS) {
      const save = played();
      save.cleared = 12;
      expect(startTour(save, tour.id)).toBe(true);
      const shown = walk(save);
      expect(shown, tour.id).toEqual(tour.steps.map((s) => `${s.scene}/${s.target}`));
      expect(save.tutorial.tour, tour.id).toBeNull();
      expect(tourSeen(save, tour.id), tour.id).toBe(true);
    }
  });

  it('says how far along it is, and what its button says', () => {
    const save = played();
    startTour(save, 'basics');
    const first = tutorialStep(save, at('Main'));
    expect([first?.n, first?.of]).toEqual([1, tourById('basics')!.steps.length]);
    expect(first?.ok).toBe(true);
    expect(first?.button).toBe('NEXT');
    expect(first?.press).toBe(false);
    for (let i = 1; i < tourById('basics')!.steps.length; i++) advanceTour(save);
    expect(tutorialStep(save, at('Main'))?.button).toBe('DONE');
    advanceTour(save);
    expect(save.tutorial.tour).toBeNull();
    // A step that asks for a press has no button of its own.
    startTour(save, 'hall');
    expect(tutorialStep(save, at('Main'))?.press).toBe(true);
    expect(tutorialStep(save, at('Main'))?.ok).toBe(false);
  });

  it('a screen shut before its tour was done brings the tour back to the step that leads into it', () => {
    const save = played();
    save.cleared = 12;
    startTour(save, 'hall');
    expect(tutorialStep(save, at('Main'))?.target).toBe('hall');
    advanceTour(save);
    // The hall is open over the field: the field shows nothing.
    expect(tutorialStep(save, at('Main', { covered: true }))).toBeNull();
    expect(tutorialStep(save, at('Hall'))?.target).toBe('dungeon');
    advanceTour(save);
    expect(tutorialStep(save, at('Hall'))?.target).toBe('raid');
    // Shut some other way than the tour asked: back to DUNGEONS.
    expect(tutorialStep(save, at('Main'))?.target).toBe('hall');
    expect(save.tutorial.tour?.step).toBe(0);
    expect(tourSeen(save, 'hall')).toBe(false);
  });

  it('can be skipped, and can be viewed again once seen', () => {
    const save = played();
    save.coins = 500;
    expect(tutorialStep(save, at('Main'))?.tour).toBe('packs');
    skipTutorial(save);
    expect(save.tutorial.tour).toBeNull();
    expect(tourSeen(save, 'packs')).toBe(true);
    save.stats.battles += TOUR_GAP;
    expect(tourDue(save, DAY)?.id).not.toBe('packs');
    // From the list in the settings.
    const before = save.tutorial.seen.length;
    expect(startTour(save, 'packs')).toBe(true);
    expect(tutorialStep(save, at('Main'))?.id).toBe('packs:0');
    walk(save);
    expect(save.tutorial.seen.length).toBe(before);
    expect(startTour(save, 'no such tour')).toBe(false);
  });

  it('are dark on the list until the player has come to what they are about', () => {
    const save = played();
    const known = (id: string): boolean => tourKnown(save, tourById(id)!);
    for (const id of ['basics', 'packs', 'skills', 'upgrades', 'rewards']) expect(known(id), id).toBe(true);
    expect(known('hall')).toBe(false);
    expect(known('structures')).toBe(false);
    save.cleared = 8;
    expect(known('structures')).toBe(true);
    save.cleared = 10;
    expect(known('hall')).toBe(true);
  });

  it('a tour cut short by a reload starts again, and what has been seen is kept', () => {
    const save = played();
    save.coins = 500;
    tutorialStep(save, at('Main'));
    advanceTour(save);
    expect(save.tutorial.tour).toEqual({ id: 'packs', step: 1 });
    const back = repair(JSON.parse(JSON.stringify(save)), 3);
    expect(back.tutorial.tour).toBeNull();
    expect(back.tutorial.at).toBe(save.tutorial.at);
    expect(back.tutorial.seen).toEqual(save.tutorial.seen);
    expect(tutorialStep(back, at('Main'))?.id).toBe('packs:0');
  });

  it('a save from before there were tours is spared the ones its player has no use for', () => {
    const save = played();
    save.stats.opened = 12;
    save.tree = { command: 1 };
    const old = JSON.parse(JSON.stringify(save)) as { tutorial: { at?: number; seen: string[] } };
    delete old.tutorial.at;
    old.tutorial.seen = [];
    const back = repair(old, 3);
    for (const id of ['basics', 'packs', 'skills']) expect(tourSeen(back, id), id).toBe(true);
    // Nothing says they have bought an upgrade or been in a dungeon: those are still to come.
    for (const id of ['upgrades', 'hall', 'structures', 'rewards']) expect(tourSeen(back, id), id).toBe(false);
  });
});

/** Starts the tour that is due, checks it is the one, and ends it; then the battles between two tours are fought. */
function endTourOf(save: SaveData, id: string): void {
  expect(tutorialStep(save, at('Main'))?.tour).toBe(id);
  endTour(save);
  save.stats.battles += TOUR_GAP;
}
