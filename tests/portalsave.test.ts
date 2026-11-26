import { describe, expect, it } from 'vitest';
import { botCamp } from '../src/game/bot';
import { beginRun } from '../src/game/hold';
import { endWave, setupOf } from '../src/game/run';
import { freshSave, record } from '../src/game/state';
import { SAVE_KEY, loadSave, setStore, storeSave, type Store } from '../src/game/storage';
import { STEP, World } from '../src/game/world';

/**
 * CrazyGames keeps the save in its data module, which holds a megabyte for a game and stops backing it up past that
 * (docs.crazygames.com/sdk/data). A long run is what makes a save big: it is kept at every camp with all it holds.
 */
const PORTAL_LIMIT = 1024 * 1024;

/** The data module as it behaves: localStorage's calls, and an error past the limit. */
class Portal implements Store {
  map = new Map<string, string>();
  most = 0;
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    const size = new TextEncoder().encode(value).length;
    this.most = Math.max(this.most, size);
    if (size > PORTAL_LIMIT) throw new Error('dataLimitExcedeed');
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

describe('the save on a portal', () => {
  it('holds a run of a hundred waves, kept at every camp, and gives it back as it was', () => {
    const portal = new Portal();
    setStore(portal);
    try {
      const save = freshSave();
      const run = beginRun(save, 'wren', 7);
      save.runs++;
      for (let wave = 1; wave <= 100 && run.phase !== 'over'; wave++) {
        const world = new World(setupOf(run));
        // The wave is fought a little and then called cleared: what grows a save is what a run holds and does
        // between waves, not the fight itself. The hero cannot fall, and is paid as a run far on is.
        world.hero.maxHp = 1e9;
        world.hero.hp = 1e9;
        for (let i = 0; i < 120 && !world.over; i++) world.step({ x: 0, y: 0 }, STEP);
        world.over = 'cleared';
        endWave(run, world);
        run.gold += 60 + wave * 8;
        record(save, run, world.kills);
        // As the game keeps it when the camp comes up: the run in the save, written to the portal.
        save.run = (run.phase as string) === 'over' ? null : run;
        storeSave(save);
        expect(portal.getItem(SAVE_KEY), `wave ${wave}`).not.toBeNull();
        const back = loadSave().save;
        expect(back.run?.wave, `wave ${wave}`).toBe(run.wave);
        botCamp(run);
      }
      expect(run.wave).toBeGreaterThan(100);
      if (process.env.SAVE_SIZE) process.stdout.write(`largest save: ${portal.most} bytes\n`);
      // Well inside the limit, so that a longer run, or what is added to a save later, still fits.
      expect(portal.most).toBeLessThan(PORTAL_LIMIT / 4);
    } finally {
      setStore(null);
    }
  });
});
