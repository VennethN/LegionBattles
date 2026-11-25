// What the scripts that drive the game share: stepping its clock, waiting
// for a screen, steering a hero with the keys, and standing a run up as it
// is described.

import type { Page } from './browser';

/** What the game puts on its window for these scripts (src/main.ts). */
export interface Win {
  game: Phaser.Game;
  view: { zoom: number; density: number; w: number; h: number; tall: boolean };
  stage(o: Record<string, unknown>): unknown;
  run(): Record<string, unknown> | null;
  world(): { hero: { x: number; y: number; hp: number }; foes: Array<{ x: number; y: number }>; picks: Array<{ x: number; y: number }>; over: string | null; time: number } | null;
  save(): Record<string, unknown>;
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

/** The keys a plain player would hold now: away from whoever is nearest, and toward what lies about when nobody is. */
export function keysWanted(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const world = (window as unknown as Win).world();
    if (!world || world.over) return [] as string[];
    let x = 0;
    let y = 0;
    for (const foe of world.foes) {
      const dx = world.hero.x - foe.x;
      const dy = world.hero.y - foe.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 120) {
        x += dx / d;
        y += dy / d;
      }
    }
    if (Math.hypot(x, y) < 0.3 && world.picks.length) {
      x = (world.picks[0].x - world.hero.x) / 100;
      y = (world.picks[0].y - world.hero.y) / 100;
    }
    const k: string[] = [];
    if (x > 0.2) k.push('KeyD');
    if (x < -0.2) k.push('KeyA');
    if (y > 0.2) k.push('KeyS');
    if (y < -0.2) k.push('KeyW');
    return k;
  });
}

/** Fights for some frames with the keys. `each` is called after every frame: a film takes its picture there. */
export async function fight(page: Page, frames: number, each?: (frame: number) => Promise<void>): Promise<void> {
  let held: string[] = [];
  for (let f = 0; f < frames; f++) {
    if (f % 6 === 0) {
      const keys = await keysWanted(page);
      for (const k of held) if (!keys.includes(k)) await page.keyboard.up(k);
      for (const k of keys) if (!held.includes(k)) await page.keyboard.down(k);
      held = keys;
    }
    await page.clock.runFor(1000 / 60);
    if (each) await each(f);
  }
  for (const k of held) await page.keyboard.up(k);
}

/** Starts the field for a run stood up as described. */
export async function arena(page: Page, run: Record<string, unknown>, data: Record<string, unknown> = {}): Promise<void> {
  await page.evaluate(([r, d]) => {
    const w = window as unknown as Win;
    w.stage(r);
    for (const key of ['Hud', 'Camp', 'Road', 'Result', 'Title']) w.game.scene.stop(key);
    w.game.scene.start('Arena', d);
  }, [run, data] as const);
}

/** A hero well into a run: every hand full, a dozen things, a few levels' choices. */
export const RICH = [{ id: 'sword', tier: 2 }, { id: 'spear', tier: 1 }, { id: 'bow', tier: 1 }, { id: 'brazier', tier: 1 }, { id: 'hammer', tier: 0 }, { id: 'frost', tier: 0 }];
export const THINGS = ['ration', 'ration', 'whetstone', 'mail', 'wardrum', 'banner', 'boots', 'keg', 'hawk', 'chalice', 'crown', 'lodestone'];
export const UPS = [{ stat: 'maxHp', by: 12 }, { stat: 'damage', by: 16 }, { stat: 'armor', by: 3 }, { stat: 'haste', by: 15 }, { stat: 'regen', by: 4 }, { stat: 'might', by: 6 }];

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

/** Where on the page words that start with `text` are written on a screen, whether they can be pressed or not, or null. It is a little inside their left end. */
export function words(page: Page, key: string, text: string): Promise<{ x: number; y: number } | null> {
  return page.evaluate(([k, t]) => {
    const w = window as unknown as Win;
    const sc = w.game.scene.getScene(k) as unknown as { children: { list: unknown[] } };
    interface Node {
      type: string;
      visible: boolean;
      x: number;
      y: number;
      originX?: number;
      width?: number;
      text?: string;
      list?: Node[];
    }
    let hit: { x: number; y: number } | null = null;
    const walk = (list: Node[], ox: number, oy: number): void => {
      for (const o of list) {
        if (hit || !o.visible) continue;
        if (o.type === 'Text' && typeof o.text === 'string' && o.text.trim().startsWith(t)) hit = { x: ox + o.x - (o.originX ?? 0) * (o.width ?? 0) + 8, y: oy + o.y };
        else if (o.list) walk(o.list, ox + o.x, oy + o.y);
      }
    };
    walk(sc.children.list as Node[], 0, 0);
    const at = hit as { x: number; y: number } | null;
    return at ? { x: (at.x * w.view.zoom) / w.view.density, y: (at.y * w.view.zoom) / w.view.density } : null;
  }, [key, text] as const);
}
