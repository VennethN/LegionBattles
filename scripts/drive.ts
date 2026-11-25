// What the scripts that drive the game share: stepping its clock, waiting
// for a screen, finding a button by its words, standing a hunt up as it is
// described, and playing one with the keys as the bot would.

import type { Page } from './browser';

/** A hunt as the scripts see it (src/game/hunt.ts): only what they ask of it. */
export interface HuntWin {
  phase: string;
  over: string | null;
  time: number;
  open: boolean;
  hunter: { x: number; y: number; hp: number; maxHp: number; rollWait: number; waits: [number, number] };
  monster: { x: number; y: number; hp: number; maxHp: number; part: number; state: string; left: number; stagger: number; staggerMax: number; def: { parts: string[][] } };
  tells: Array<{ id: number; attack: string; left: number; of: number }>;
  helpers: unknown[];
  allies: unknown[];
  buildings: unknown[];
  toPlace: Record<string, number>;
  calls: Array<{ left: number }>;
  hornWait: number;
  giveUp(): void;
}

/** What the game puts on its window for these scripts (src/main.ts). */
export interface Win {
  game: Phaser.Game;
  view: { zoom: number; density: number; w: number; h: number; tall: boolean };
  stage(o: Record<string, unknown>): HuntWin;
  hunt(): HuntWin | null;
  save(): Record<string, unknown>;
  pilot(on: boolean): void;
  botSteer(): { x: number; y: number; dodge?: boolean; a?: boolean; b?: boolean; call?: number; place?: string; wake?: boolean } | null;
}

/** Steps the game by so many of its frames. The page's clock must have been taken over and paused. */
export async function tick(page: Page, frames: number): Promise<void> {
  for (let i = 0; i < frames; i++) await page.clock.runFor(1000 / 60);
}

/** Steps until a screen is up. Loading goes by the network and not by the clock, so real time is let pass too. */
export async function until(page: Page, key: string, most = 400): Promise<boolean> {
  for (let i = 0; i < most; i++) {
    if (await page.evaluate((k) => !!(window as unknown as Win).game?.scene?.isActive(k), key)) return true;
    await page.clock.runFor(50);
    await new Promise((r) => setTimeout(r, 15));
  }
  return false;
}

/** Stands a hunt up as described and goes to its lair. */
export async function lair(page: Page, hunt: Record<string, unknown>, save: Record<string, unknown> = {}): Promise<void> {
  await page.evaluate(([h, s]) => {
    const w = window as unknown as Win;
    Object.assign(w.save(), s);
    w.pilot(false);
    for (const key of ['Hud', 'Result', 'Lodge', 'Lair']) w.game.scene.stop(key);
    w.stage(h);
    w.game.scene.start('Lair');
  }, [hunt, save] as const);
  await until(page, 'Hud');
}

/** Lets the bot steer the hunt for some seconds. `each` is called after every frame: a film takes its picture there. */
export async function pilot(page: Page, seconds: number, each?: (frame: number) => Promise<void>): Promise<void> {
  await page.evaluate(() => (window as unknown as Win).pilot(true));
  for (let f = 0; f < Math.round(seconds * 60); f++) {
    await page.clock.runFor(1000 / 60);
    if (each) await each(f);
  }
  await page.evaluate(() => (window as unknown as Win).pilot(false));
}

/** The keys that are the same as a steering: the game's own, by where they are on the keyboard. */
const PLACE_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];

/**
 * Plays the hunt through the keyboard for some frames: the bot says what it
 * would do, and this presses the keys for it, so that what is tried is the
 * game's own input and not a way round it.
 */
export async function playKeys(page: Page, frames: number, each?: (frame: number) => Promise<void>): Promise<void> {
  let held: string[] = [];
  for (let f = 0; f < frames; f++) {
    if (f % 3 === 0) {
      const s = await page.evaluate(() => {
        const w = window as unknown as Win;
        const steer = w.botSteer();
        const h = w.hunt();
        return steer && h ? { steer, places: Object.keys(h.toPlace) } : null;
      });
      const keys: string[] = [];
      if (s) {
        if (s.steer.x > 0.3) keys.push('KeyD');
        if (s.steer.x < -0.3) keys.push('KeyA');
        if (s.steer.y > 0.3) keys.push('KeyS');
        if (s.steer.y < -0.3) keys.push('KeyW');
        if (s.steer.dodge) await page.keyboard.press('Space');
        if (s.steer.a) await page.keyboard.press('KeyQ');
        if (s.steer.b) await page.keyboard.press('KeyE');
        if (s.steer.call !== undefined) await page.keyboard.press(s.steer.call === 0 ? 'KeyR' : 'KeyF');
        if (s.steer.wake) await page.keyboard.press('Enter');
        if (s.steer.place) {
          // The game numbers what was brought in the order of its own table, which is the order the hunt lists it in.
          const order = ['barricade', 'watchfire', 'bellpost', 'ballista'].filter((id) => s.places.includes(id));
          await page.keyboard.press(PLACE_KEYS[order.indexOf(s.steer.place)] ?? 'Digit1');
        }
      }
      for (const k of held) if (!keys.includes(k)) await page.keyboard.up(k);
      for (const k of keys) if (!held.includes(k)) await page.keyboard.down(k);
      held = keys;
    }
    await page.clock.runFor(1000 / 60);
    if (each) await each(f);
  }
  for (const k of held) await page.keyboard.up(k);
}

/** A lodge well on: both monsters felled, coin in hand, everything opened. */
export const RICH = { coin: 260, supply: 2, felled: { sexton: 2, king: 1 }, trophies: ['spade', 'antler'], worn: { marta: 'spade' }, steps: ['more:pikemen'], hunts: 9, wins: 5, told: ['move', 'tell', 'roll', 'open', 'summon', 'crash'] };

/** Where on the page the middle of the first thing on a screen that says words starting with `text` is, or null. */
export function find(page: Page, key: string, text: string): Promise<{ x: number; y: number } | null> {
  return page.evaluate(([k, t]) => {
    const w = window as unknown as Win;
    const sc = w.game.scene.getScene(k) as unknown as { children: { list: unknown[] } };
    interface Node {
      type: string;
      visible: boolean;
      x: number;
      y: number;
      input?: unknown;
      text?: string;
      list?: Node[];
    }
    let hit: { x: number; y: number } | null = null;
    const walk = (list: Node[], ox: number, oy: number): void => {
      for (const o of list) {
        if (hit || o.type !== 'Container' || !o.visible) continue;
        const kids = o.list ?? [];
        if (o.input && kids.some((c) => typeof c.text === 'string' && c.text.trim().startsWith(t))) hit = { x: ox + o.x, y: oy + o.y };
        walk(kids, ox + o.x, oy + o.y);
      }
    };
    walk(sc.children.list as Node[], 0, 0);
    const at = hit as { x: number; y: number } | null;
    return at ? { x: (at.x * w.view.zoom) / w.view.density, y: (at.y * w.view.zoom) / w.view.density } : null;
  }, [key, text] as const);
}
