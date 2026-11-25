import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { addPlayerXp } from '../src/game/player';
import { claimDaily } from '../src/game/rewards';
import { addCard } from '../src/game/cards';
import { FIRST_PACK, FIRST_SEED, fieldCard, finishStage, openPack, stageInput, startingSave } from '../src/game/rules';
import { repair, type SaveData } from '../src/game/state';
import {
  STEPS, TAP_SLOW, TOURS, TOUR_GAP, advanceTour, cardToPlace, endTour, markSeen, placeTile, skipTutorial, startTour, tourById, tourDue, tourKnown,
  tourSeen, tutorialStep,
  type GuideContext,
  type GuideScene,
} from '../src/game/tutorial';
import { Battle, callEverything, runBattle } from '../src/sim/battle';

const id = (save: ReturnType<typeof startingSave>, ctx: GuideContext): string | null => tutorialStep(save, ctx)?.id ?? null;
/** The main screen with the team standing ready, in a battle, and with a battle's result up. */
const ready: GuideContext = { scene: 'Main', phase: 'ready', busy: false };
const fighting: GuideContext = { scene: 'Main', phase: 'fighting', busy: true };
const after: GuideContext = { scene: 'Main', phase: 'after', busy: true };

describe('the first tutorial', () => {
  it('is three things done: a skill called, a pack opened, a card put on the field', () => {
    const save = startingSave(1);
    // A new player lands in a battle: before it there is nothing to press and nothing to read.
    expect(tutorialStep(save, ready)).toBeNull();
    expect(save.tutorial.done).toBe(false);

    // In it, nothing until a skill of theirs can be called. Then the hand: it holds nothing back and blocks nothing.
    expect(tutorialStep(save, fighting)).toBeNull();
    const tap = tutorialStep(save, { ...fighting, callable: true });
    expect(tap?.id).toBe('tap');
    expect([tap?.hand, tap?.holds, tap?.blocks]).toEqual([true, false, false]);
    // It stays for as long as the skill can be called and has not been.
    expect(id(save, { ...fighting, callable: true })).toBe('tap');
    markSeen(save, 'tap');
    // Once is enough: the next skill that can be called says so by itself.
    expect(tutorialStep(save, { ...fighting, callable: true })).toBeNull();

    // The first win drops a pack of soldiers, and the result waits for it to be opened.
    const won = finishStage(save, 0, true);
    expect(won.packs).toContain(FIRST_PACK);
    const open = tutorialStep(save, after);
    expect(open?.id).toBe('open');
    expect([open?.hand, open?.holds, open?.blocks]).toEqual([true, true, true]);
    // While it is being opened nothing points at anything.
    expect(tutorialStep(save, { ...after, show: 'pouch' })).toBeNull();
    const pull = openPack(save, FIRST_PACK, false);
    expect(pull?.joined).toBe(false);
    expect(tutorialStep(save, { ...after, show: 'reveal' })).toBeNull();
    expect(cardToPlace(save)).toBe(pull?.card);
    // The card waits for the field to be on show again, and the result does not wait for it.
    expect(tutorialStep(save, after)).toBeNull();
    expect(save.tutorial.done).toBe(false);

    // On the field: the hand points at the tile the card would take by itself, and any free tile will do.
    const place = tutorialStep(save, ready);
    expect(place?.id).toBe('place');
    expect([place?.hand, place?.holds, place?.blocks]).toEqual([true, true, false]);
    const tile = placeTile(save);
    expect(tile).not.toBeNull();
    const before = save.team.length;
    // The back corner, not the tile pointed at: it is the player's to choose.
    expect(fieldCard(save, pull?.card ?? -1, 0, 3)).toBe(true);
    expect(save.team.length).toBe(before + 1);
    markSeen(save, 'place');
    expect(save.tutorial.done).toBe(true);
    expect(tutorialStep(save, ready)).toBeNull();
    expect(cardToPlace(save)).toBeNull();
  });

  it('every step is a hand and a word, with a thing of its own to point at', () => {
    expect(STEPS.map((s) => s.id)).toEqual(['tap', 'open', 'place']);
    for (const step of STEPS) {
      expect(step.hand, step.id).toBe(true);
      expect(step.target.length, step.id).toBeGreaterThan(0);
      // "Limits the use of text": a word, said loud.
      expect(step.text.split(' ').length, step.id).toBeLessThanOrEqual(2);
      expect(step.text.length, step.id).toBeLessThanOrEqual(8);
      expect(step.text, step.id).toBe(step.text.toUpperCase());
      expect(step.ok, step.id).toBeUndefined();
    }
    expect(new Set(STEPS.map((s) => s.target)).size).toBe(STEPS.length);
    // The battle is all but stopped while the first hand waits.
    expect(TAP_SLOW).toBeGreaterThan(0);
    expect(TAP_SLOW).toBeLessThan(0.1);
  });

  it('shows nothing on any other screen, or under one', () => {
    const save = startingSave(1);
    finishStage(save, 0, true);
    expect(id(save, ready)).toBe('open');
    expect(tutorialStep(save, { ...ready, covered: true })).toBeNull();
    for (const scene of ['Shop', 'Team', 'Worlds', 'Rewards', 'Hall', 'Player', 'Settings'] as GuideScene[]) {
      expect(tutorialStep(save, { scene }), scene).toBeNull();
      expect(tutorialStep(save, { scene, show: 'none', page: 'units' }), scene).toBeNull();
    }
    expect(save.tutorial.done).toBe(false);
  });

  it('carries on after a reload: with a pack to open, and then with a card in hand', () => {
    const save = startingSave(1);
    finishStage(save, 0, true);
    // They left with the result up. Back on the field, the pack is still to be opened.
    let back = repair(JSON.parse(JSON.stringify(save)), 9);
    expect(back.tutorial.done).toBe(false);
    expect(id(back, ready)).toBe('open');
    // They left with the card in hand.
    const pull = openPack(back, FIRST_PACK, false);
    back = repair(JSON.parse(JSON.stringify(back)), 9);
    expect(id(back, ready)).toBe('place');
    expect(cardToPlace(back)).toBe(pull?.card);
    // And a new player who leaves in the middle of the first battle lands in it again.
    const fresh = repair(JSON.parse(JSON.stringify(startingSave(1))), 9);
    expect(tutorialStep(fresh, ready)).toBeNull();
    expect(id(fresh, { ...fighting, callable: true })).toBe('tap');
  });

  it('opens a pack even after a first battle that was lost: they came with two', () => {
    const save = startingSave(1);
    expect(save.packs[FIRST_PACK]).toBe(2);
    const lost = finishStage(save, 0, false);
    expect(lost.packs).toHaveLength(0);
    expect(id(save, after)).toBe('open');
  });

  it('is over when there is nothing left of it to do', () => {
    // The pack was opened some other way and its card walked into the team.
    const save = startingSave(1);
    finishStage(save, 0, true);
    expect(openPack(save, FIRST_PACK)?.joined).toBe(true);
    expect(cardToPlace(save)).toBeNull();
    // On the result it only shows nothing; it is ended when the field is still.
    expect(tutorialStep(save, after)).toBeNull();
    expect(save.tutorial.done).toBe(false);
    expect(tutorialStep(save, ready)).toBeNull();
    expect(save.tutorial.done).toBe(true);
    // And for a player with no pack to open.
    const bare = startingSave(1);
    bare.packs = {};
    bare.stats.battles = 1;
    expect(tutorialStep(bare, ready)).toBeNull();
    expect(bare.tutorial.done).toBe(true);
    // Not before a battle has been fought, though.
    const first = startingSave(1);
    expect(tutorialStep(first, ready)).toBeNull();
    expect(first.tutorial.done).toBe(false);
  });

  it('can be skipped at every step, and is over for good', () => {
    // At the hand in the battle.
    const a = startingSave(1);
    expect(id(a, { ...fighting, callable: true })).toBe('tap');
    skipTutorial(a);
    expect(a.tutorial.done).toBe(true);
    // At the pack.
    const b = startingSave(1);
    finishStage(b, 0, true);
    expect(id(b, after)).toBe('open');
    skipTutorial(b);
    expect(b.tutorial.done).toBe(true);
    // The pack is still theirs, to open where packs are opened.
    expect(b.packs[FIRST_PACK]).toBe(3);
    // With a card in hand: it walks into the team, as a card does anywhere else.
    const c = startingSave(1);
    finishStage(c, 0, true);
    const pull = openPack(c, FIRST_PACK, false);
    expect(id(c, ready)).toBe('place');
    skipTutorial(c);
    expect(c.tutorial.done).toBe(true);
    expect(c.team.some((p) => p.card === pull?.card)).toBe(true);
    // None of its steps comes back, whatever is played after.
    for (const save of [a, b, c]) {
      finishStage(save, 1, true);
      const first = new Set(STEPS.map((s) => s.id));
      for (const ctx of [ready, after, { ...fighting, callable: true }] as GuideContext[]) {
        const step = tutorialStep(save, ctx);
        expect(step === null || !first.has(step.id)).toBe(true);
      }
    }
  });
});

describe('a new player\'s first battle', () => {
  it('is the same battle for every new player', () => {
    const one = stageInput(startingSave(1), 0);
    for (const seed of [2, 99, 123456789]) expect(stageInput(startingSave(seed), 0)).toEqual(one);
    expect(one.seed).toBe(FIRST_SEED);
    // The second battle is each player's own.
    const a = startingSave(1);
    const b = startingSave(2);
    finishStage(a, 0, true);
    finishStage(b, 0, true);
    expect(stageInput(a, 1).seed).not.toBe(stageInput(b, 1).seed);
  });

  it('has a skill to call about two seconds in: the Archer\'s, and soon after it the Knight\'s', () => {
    const input = stageInput(startingSave(1), 0);
    const b = new Battle(input);
    const first = new Map<string, number>();
    while (!b.ended) {
      for (let i = 0; i < b.units.length; i++) {
        if (b.units[i].team === 0 && b.callable(i) && !first.has(b.units[i].def.id)) first.set(b.units[i].def.id, b.time);
      }
      b.step();
    }
    const order = [...first.entries()].sort((x, y) => x[1] - y[1]);
    expect(order[0][0]).toBe('archer');
    expect(order[0][1]).toBeGreaterThanOrEqual(1);
    expect(order[0][1]).toBeLessThanOrEqual(3);
    expect(order[1][0]).toBe('knight');
    expect(order[1][1]).toBeLessThanOrEqual(5);
  });

  it('is won in ten to fifteen seconds, whether a skill is called or not', () => {
    const input = stageInput(startingSave(1), 0);
    const untouched = runBattle(input, false);
    // The tutorial's player: the first skill that can be called, and nothing after.
    const b = new Battle(input);
    let call = -1;
    while (!b.ended && call < 0) {
      for (let i = 0; i < b.units.length && call < 0; i++) if (b.callable(i)) call = i;
      if (call < 0) b.step();
    }
    const once = runBattle({ ...input, calls: [{ tick: b.tick + 1, unit: call }] }, true);
    const always = runBattle(input, false, callEverything);
    expect(once.events.filter((e) => e.type === 'call')).toHaveLength(1);
    for (const r of [untouched, once, always]) {
      expect(r.winner).toBe(0);
      expect(r.seconds).toBeGreaterThanOrEqual(8.5);
      expect(r.seconds).toBeLessThanOrEqual(15);
    }
    // Calling is worth something even here: the player who calls everything is done sooner.
    expect(always.seconds).toBeLessThan(untouched.seconds);
  });
});

// ------------------------------------------------------------ tours

const DAY = 20000;
const at = (scene: GuideScene, more: Partial<GuideContext> = {}): GuideContext => ({ scene, day: DAY, ...more });

/** A player whose first tutorial is behind them, with a few battles fought and the packs they came with opened. */
function played(): SaveData {
  const save = startingSave(1);
  save.tutorial.done = true;
  // As the first tutorial leaves it: what it taught is what the basics say.
  save.tutorial.seen.push('tap', 'place', 'tour:basics');
  save.packs = {};
  save.stats.opened = 3;
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
      expect(tour.steps.length, tour.id).toBeGreaterThanOrEqual(2);
      expect(tour.steps.length, tour.id).toBeLessThanOrEqual(8);
      expect(tour.steps[0].scene, tour.id).toBe('Main');
      expect(tour.name.length, tour.id).toBeGreaterThan(0);
      expect(tour.blurb.length, tour.id).toBeLessThan(60);
      const screens = new Set(tour.steps.map((s) => s.scene).filter((s) => s !== 'Main'));
      expect(screens.size, tour.id).toBeLessThanOrEqual(1);
      expect(tour.steps[tour.steps.length - 1].kind, `${tour.id}: its last step`).toBe('note');
      let left = false;
      tour.steps.forEach((step, i) => {
        // Few words: a step says one thing, in a line.
        expect(step.text.length, `${tour.id} step ${i + 1}`).toBeLessThanOrEqual(60);
        expect(step.text, `${tour.id} step ${i + 1}`).not.toContain('\u2014');
        // Once it has left the field it does not come back to it, and what leads off the field is a press.
        if (step.scene !== 'Main') {
          if (!left) expect(tour.steps[i - 1].kind, `${tour.id}: what leads into ${step.scene}`).toBe('press');
          left = true;
        } else expect(left, `${tour.id} step ${i + 1}`).toBe(false);
        // No step asks for CLOSE: a tour ends on the screen it led into, with everything there free to be pressed.
        expect(step.target, `${tour.id} step ${i + 1}`).not.toBe('close');
      });
    }
  });

  it('there is one for each of the things the owner named', () => {
    const ids = TOURS.map((t) => t.id);
    // "the game itself, dungeons and raids, skill points, upgrades, packs"
    for (const id of ['basics', 'dungeons', 'raids', 'skills', 'upgrades', 'packs']) expect(ids).toContain(id);
    // And none for the rewards: "exclude the reward from the tutorial as well".
    expect(ids).not.toContain('rewards');
    for (const tour of TOURS) for (const step of tour.steps) expect(`${step.scene} ${step.target} ${step.text}`.toLowerCase(), tour.id).not.toContain('reward');
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
    // And the first tutorial's steps, all of them on the main screen: it leads into no other.
    const mainScreen = fs.readFileSync('src/view/scenes/MainScene.ts', 'utf8');
    for (const step of STEPS) expect(mainScreen, step.id).toContain(`mark('${step.target}'`);
  });

  it('none starts while the first tutorial runs, and the basics never start by themselves', () => {
    const save = startingSave(1);
    save.coins = 99999;
    save.stats.battles = 9;
    addPlayerXp(save, 5000);
    expect(tourDue(save, DAY)).toBeNull();
    expect(tutorialStep(save, at('Main', { phase: 'after', busy: true }))?.tour).toBeUndefined();
    expect(tourById('basics')?.when).toBeUndefined();
    // Ending the first tutorial is having seen the basics.
    skipTutorial(save);
    expect(tourSeen(save, 'basics')).toBe(true);
    const walked = startingSave(1);
    finishStage(walked, 0, true);
    const pull = openPack(walked, FIRST_PACK, false);
    fieldCard(walked, pull?.card ?? -1, 0, 3);
    markSeen(walked, 'place');
    expect(walked.tutorial.done).toBe(true);
    expect(tourSeen(walked, 'basics')).toBe(true);
    // The first tutorial led into no screen, so every other tour is still to come, and waits for a couple of battles.
    for (const tour of TOURS) if (tour.id !== 'basics') expect(tourSeen(walked, tour.id), tour.id).toBe(false);
    expect(walked.tutorial.tour).toBeNull();
    expect(tourDue(walked, DAY)).toBeNull();
    walked.stats.battles += TOUR_GAP - 1;
    expect(tourDue(walked, DAY)).toBeNull();
    walked.stats.battles++;
    // Then the packs: they hold the two they came with, and have been shown no screen to open them on.
    expect(tourDue(walked, DAY)?.id).toBe('packs');
  });

  it('nothing follows the first tutorial: no tour, no screen, and no word of the rewards', () => {
    const save = startingSave(1);
    finishStage(save, 0, true);
    const pull = openPack(save, FIRST_PACK, false);
    expect(tutorialStep(save, at('Main', { phase: 'ready' }))?.id).toBe('place');
    fieldCard(save, pull?.card ?? -1, 0, 3);
    markSeen(save, 'place');
    expect(save.tutorial.done).toBe(true);
    expect(save.tutorial.tour).toBeNull();
    // A reward waits from the first day, and still nothing is shown for it, today or tomorrow.
    for (const day of [DAY, DAY + 1]) {
      expect(tutorialStep(save, at('Main', { day, phase: 'ready' }))).toBeNull();
      expect(tutorialStep(save, at('Rewards', { day }))).toBeNull();
    }
    save.stats.battles += 10;
    expect(tourDue(save, DAY + 1)?.id).not.toBe('rewards');
    // The same for whoever skips it.
    const skipped = startingSave(1);
    skipTutorial(skipped);
    expect(skipped.tutorial.done).toBe(true);
    expect(skipped.tutorial.tour).toBeNull();
    expect(tutorialStep(skipped, at('Main'))).toBeNull();
    expect(tutorialStep(skipped, at('Rewards'))).toBeNull();
    // And a save that was in the middle of the old tour of the rewards comes back with no tour up.
    const old = JSON.parse(JSON.stringify(save)) as { tutorial: { tour: unknown; show?: string }; stats: { battles: number } };
    old.tutorial.tour = { id: 'rewards', step: 1, open: true };
    old.tutorial.show = 'Rewards';
    old.stats.battles = 1;
    const back = repair(old, 3);
    expect(back.tutorial.tour).toBeNull();
    expect(tutorialStep(back, at('Main'))).toBeNull();
  });

  it('each starts the first time its part of the game matters', () => {
    const save = played();
    expect(tourDue(save, DAY)).toBeNull();
    // A pack held, or coins enough for one: the screen of packs has something on it for them.
    save.packs = { recruit: 1 };
    expect(tourDue(save, DAY)?.id).toBe('packs');
    save.packs = {};
    expect(tourDue(save, DAY)).toBeNull();
    save.coins = 60;
    expect(tourDue(save, DAY)?.id).toBe('packs');
    endTourOf(save, 'packs');
    // A card that fights and is in no team: there is a choice to make, and a screen to make it on.
    save.coins = 0;
    expect(tourDue(save, DAY)).toBeNull();
    addCard(save, 'militia', 2);
    addCard(save, 'mage', 1);
    expect(tourDue(save, DAY)?.id).toBe('team');
    endTourOf(save, 'team');
    // A second structure, with the tower standing in the one place there is.
    expect(tourDue(save, DAY)).toBeNull();
    addCard(save, 'spiketrap', 0);
    expect(tourDue(save, DAY)?.id).toBe('structures');
    endTourOf(save, 'structures');
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
    expect(tourDue(save, DAY)?.id).toBe('dungeons');
    endTourOf(save, 'dungeons');
    // The first raid opens at the twenty-second, and is taught then and not before.
    expect(tourDue(save, DAY)).toBeNull();
    save.cleared = 22;
    expect(tourDue(save, DAY)?.id).toBe('raids');
    endTourOf(save, 'raids');
    // And that is all of them: a day of the calendar that waits tomorrow starts nothing.
    expect(tourDue(save, DAY)).toBeNull();
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
    // Every tour that has a time of its own and whose time has come, in the order of the list. The raids wait
    // for a raid, and the team's and the structures' for a card that stands in no team.
    expect(seen).toEqual(TOURS.filter((t) => t.when && !['raids', 'team', 'structures'].includes(t.id)).map((t) => t.id));
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
    startTour(save, 'dungeons');
    expect(tutorialStep(save, at('Main'))?.press).toBe(true);
    expect(tutorialStep(save, at('Main'))?.ok).toBe(false);
  });

  it('a screen shut before its tour was done brings the tour back to the step that leads into it', () => {
    const save = played();
    save.cleared = 12;
    startTour(save, 'dungeons');
    expect(tutorialStep(save, at('Main'))?.target).toBe('hall');
    advanceTour(save);
    // The hall is open over the field: the field shows nothing.
    expect(tutorialStep(save, at('Main', { covered: true }))).toBeNull();
    expect(tutorialStep(save, at('Hall'))?.target).toBe('dungeon');
    advanceTour(save);
    expect(tutorialStep(save, at('Hall'))?.target).toBe('tiers');
    // Shut some other way than the tour asked: back to DUNGEONS.
    expect(tutorialStep(save, at('Main'))?.target).toBe('hall');
    expect(save.tutorial.tour?.step).toBe(0);
    expect(tourSeen(save, 'dungeons')).toBe(false);
    // The dungeons' tour says nothing of raids, and the raids' nothing of dungeons.
    for (const step of tourById('dungeons')!.steps) expect(`${step.target} ${step.text}`.toLowerCase()).not.toContain('raid');
    for (const step of tourById('raids')!.steps) expect(step.text.toLowerCase()).not.toContain('dungeon');
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
    for (const id of ['basics', 'packs', 'skills', 'upgrades']) expect(known(id), id).toBe(true);
    expect(known('dungeons')).toBe(false);
    expect(known('raids')).toBe(false);
    // A place for a structure is there from the start.
    expect(known('structures')).toBe(true);
    save.cleared = 10;
    expect(known('dungeons')).toBe(true);
    expect(known('raids')).toBe(false);
    save.cleared = 22;
    expect(known('raids')).toBe(true);
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
    for (const id of ['basics', 'packs', 'team', 'skills', 'structures']) expect(tourSeen(back, id), id).toBe(true);
    // Nothing says they have bought an upgrade or been in a dungeon: those are still to come.
    for (const id of ['upgrades', 'dungeons', 'raids']) expect(tourSeen(back, id), id).toBe(false);
    // And a player who has never stood a structure is shown where they go.
    const bare = JSON.parse(JSON.stringify(save)) as { tutorial: { at?: number; seen: string[] }; team: Array<{ unit: string }> };
    delete bare.tutorial.at;
    bare.tutorial.seen = [];
    bare.team = bare.team.filter((p) => p.unit !== 'watchtower');
    const shown = repair(bare, 3);
    expect(tourSeen(shown, 'structures')).toBe(false);
    shown.stats.battles = 9;
    shown.tutorial.seen.push('tour:packs', 'tour:skills');
    expect(tourDue(shown, DAY)?.id).toBe('structures');
  });
});

/** Starts the tour that is due, checks it is the one, and ends it; then the battles between two tours are fought. */
function endTourOf(save: SaveData, id: string): void {
  expect(tutorialStep(save, at('Main'))?.tour).toBe(id);
  endTour(save);
  save.stats.battles += TOUR_GAP;
}
