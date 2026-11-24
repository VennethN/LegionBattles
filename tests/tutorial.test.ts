import { describe, expect, it } from 'vitest';
import { finishStage, openPack, startingSave } from '../src/game/rules';
import { repair } from '../src/game/state';
import { STEPS, markSeen, skipTutorial, tutorialStep, type GuideContext } from '../src/game/tutorial';

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
    expect(tutorialStep(save, main)).toBeNull();
    finishStage(save, 0, true);
    expect(tutorialStep(save, main)).toBeNull();
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
