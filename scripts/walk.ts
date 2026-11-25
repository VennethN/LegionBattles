// npm run walk [state ...] [--size=907x510,...]
//
// With `npm run dev` running: pictures of the game in every state a player
// meets, at the sizes a portal shows it in, to build/walk. Read them after
// any change a player will see: most of what goes wrong is layout.
//
// A state is set up by standing a run up as it should be (window.stage)
// and starting the screen for it. Time is stepped by this script, one
// frame of the game at a time: the headless browser draws too few frames a
// second for real time to mean anything.

import fs from 'node:fs';

import { chromium, open, type Page } from './browser';

const args = process.argv.slice(2);
const want = args.filter((a) => !a.startsWith('--'));
const sizeArg = args.find((a) => a.startsWith('--size='))?.slice(7);
/** A portal's small frame, its smallest, a full screen, a phone on its side, and a phone upright. */
const SIZES: Array<[string, number, number, number]> = [
  ['frame', 907, 510, 1],
  ['small', 821, 462, 1],
  ['full', 1920, 1080, 1],
  ['phone-wide', 844, 390, 2],
  ['phone-tall', 390, 844, 2],
];
const sizes = sizeArg ? SIZES.filter((s) => sizeArg.split(',').includes(s[0]) || sizeArg.split(',').includes(`${s[1]}x${s[2]}`)) : SIZES.slice(0, 1);
const out = 'build/walk';
fs.mkdirSync(out, { recursive: true });
const base = process.env.URL ?? 'http://127.0.0.1:5175/';

interface Win {
  game: Phaser.Game;
  stage(o: Record<string, unknown>): unknown;
  run(): Record<string, unknown> | null;
  world(): { hero: { x: number; y: number; hp: number }; foes: Array<{ x: number; y: number }>; picks: Array<{ x: number; y: number }>; over: string | null; time: number } | null;
  save(): Record<string, unknown>;
}

async function tick(page: Page, frames: number): Promise<void> {
  for (let i = 0; i < frames; i++) await page.clock.runFor(1000 / 60);
}

async function until(page: Page, key: string, most = 400): Promise<boolean> {
  for (let i = 0; i < most; i++) {
    if (await page.evaluate((k) => (window as unknown as Win).game?.scene?.isActive(k), key)) return true;
    await page.clock.runFor(50);
    await new Promise((r) => setTimeout(r, 15));
  }
  return false;
}

/** Fights for some seconds, steering away from whoever is nearest and toward what lies about. */
async function fight(page: Page, seconds: number): Promise<void> {
  let held: string[] = [];
  for (let f = 0; f < seconds * 60; f++) {
    if (f % 6 === 0) {
      const keys = await page.evaluate(() => {
        const world = (window as unknown as Win).world();
        if (!world || world.over) return [];
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
      for (const k of held) if (!keys.includes(k)) await page.keyboard.up(k);
      for (const k of keys) if (!held.includes(k)) await page.keyboard.down(k);
      held = keys;
    }
    await page.clock.runFor(1000 / 60);
  }
  for (const k of held) await page.keyboard.up(k);
}

const RICH = [{ id: 'sword', tier: 2 }, { id: 'spear', tier: 1 }, { id: 'bow', tier: 1 }, { id: 'brazier', tier: 1 }, { id: 'hammer', tier: 0 }, { id: 'frost', tier: 0 }];
const THINGS = ['ration', 'ration', 'whetstone', 'mail', 'wardrum', 'banner', 'boots', 'keg', 'hawk', 'chalice', 'crown', 'lodestone'];
const UPS = [{ stat: 'maxHp', by: 12 }, { stat: 'damage', by: 16 }, { stat: 'armor', by: 3 }, { stat: 'haste', by: 15 }, { stat: 'regen', by: 4 }, { stat: 'might', by: 6 }];

/** Starts the field for a run stood up as described. */
async function arena(page: Page, o: Record<string, unknown>, data: Record<string, unknown> = {}): Promise<void> {
  await page.evaluate(([run, d]) => {
    const w = window as unknown as Win;
    w.stage(run);
    for (const key of ['Hud', 'Camp', 'Result', 'Title']) w.game.scene.stop(key);
    w.game.scene.start('Arena', d);
  }, [o, data] as const);
}

const STATES: Record<string, (page: Page, shot: (name: string) => Promise<void>) => Promise<void>> = {
  // What someone who has never played sees: the field at once, and how to move.
  first: async (page, shot) => {
    await until(page, 'Hud');
    await tick(page, 20);
    await shot('first');
    await fight(page, 7);
    await shot('first-fight');
  },
  // The list of heroes, with some open and some not, and a run left in its camp.
  title: async (page, shot) => {
    await page.evaluate(() => {
      const w = window as unknown as Win;
      const s = w.save() as { best: Record<string, number>; open: string[]; kills: number; coins: number; runs: number; last: string; told: string[] };
      Object.assign(s, { best: { knight: 9, archer: 4, mage: 6 }, open: ['mage', 'cutpurse'], kills: 420, coins: 260, runs: 5, last: 'mage', told: ['move'] });
      for (const key of ['Hud', 'Camp', 'Result', 'Arena']) w.game.scene.stop(key);
      w.game.scene.start('Title');
    });
    await tick(page, 20);
    await shot('title');
    const cols = (await page.evaluate(() => innerWidth < innerHeight)) ? 3 : 5;
    void cols;
  },
  // A wave in its middle, with every hand full.
  horde: async (page, shot) => {
    await arena(page, { hero: 'knight', wave: 11, weapons: RICH, items: THINGS, ups: UPS, level: 12, gold: 310 });
    await until(page, 'Hud');
    await fight(page, 16);
    await shot('horde');
  },
  // A boss.
  boss: async (page, shot) => {
    await arena(page, { hero: 'archer', wave: 7, weapons: RICH, items: THINGS, ups: UPS, level: 8, gold: 120 });
    await until(page, 'Hud');
    await fight(page, 9);
    await shot('boss');
  },
  // Snow and sand, to see the grounds.
  lands: async (page, shot) => {
    await arena(page, { hero: 'mage', wave: 9, weapons: RICH, items: THINGS, ups: UPS, level: 9 });
    await until(page, 'Hud');
    await fight(page, 8);
    await shot('land-desert');
    await arena(page, { hero: 'frostwitch', wave: 16, weapons: RICH, items: THINGS, ups: UPS, level: 14 });
    await until(page, 'Hud');
    await fight(page, 8);
    await shot('land-snow');
  },
  // A level's choice, then the wares.
  camp: async (page, shot) => {
    await arena(page, { hero: 'knight', wave: 6, weapons: RICH.slice(0, 4), items: THINGS.slice(0, 7), ups: UPS.slice(0, 3), level: 5, gold: 260, phase: 'level', pending: 1,
      choices: [{ stat: 'maxHp', tier: 0, by: 3 }, { stat: 'haste', tier: 1, by: 10 }, { stat: 'luck', tier: 2, by: 15 }, { stat: 'armor', tier: 3, by: 4 }],
      offers: [
        { kind: 'weapon', id: 'greataxe', tier: 1, price: 73, sold: false, locked: false }, { kind: 'item', id: 'mail', tier: 1, price: 59, sold: false, locked: true },
        { kind: 'weapon', id: 'sword', tier: 2, price: 116, sold: false, locked: false }, { kind: 'item', id: 'crown', tier: 3, price: 229, sold: true, locked: false },
      ] }, { camp: true });
    await until(page, 'Camp');
    await tick(page, 10);
    await shot('level');
    const size = page.viewportSize() as { width: number; height: number };
    await page.mouse.click(size.width * (size.height > size.width ? 0.28 : 0.2), size.height * (size.height > size.width ? 0.3 : 0.55));
    await tick(page, 10);
    await shot('wares');
    // Press the first weapon in hand: its card.
    const at = await page.evaluate(() => {
      const sc = (window as unknown as Win).game.scene.getScene('Camp') as unknown as { root: { list: Array<{ x: number; y: number; input?: unknown; width: number }> } };
      const slots = sc.root.list.filter((o) => o.input && o.width > 40 && o.width < 70);
      const view = (window as unknown as { view: { zoom: number; density: number } }).view;
      return slots[0] ? { x: (slots[0].x * view.zoom) / view.density, y: (slots[0].y * view.zoom) / view.density } : null;
    });
    if (at) {
      await page.mouse.click(at.x, at.y);
      await tick(page, 10);
      await shot('weapon');
    }
  },
  // A pack to open.
  pack: async (page, shot) => {
    await arena(page, { hero: 'cleric', wave: 8, weapons: RICH.slice(0, 3), items: THINGS.slice(0, 4), level: 6, gold: 90, phase: 'camp', packs: 1, offers: [] }, { camp: true });
    await until(page, 'Camp');
    await tick(page, 10);
    await shot('pack');
    const size = page.viewportSize() as { width: number; height: number };
    const zoomed = await page.evaluate(() => {
      const view = (window as unknown as { view: { w: number; h: number; zoom: number; density: number } }).view;
      return { x: ((view.w / 2) * view.zoom) / view.density, y: ((view.h / 2 + 116) * view.zoom) / view.density };
    });
    void size;
    await page.mouse.click(zoomed.x, zoomed.y);
    await tick(page, 10);
    await shot('pack-open');
  },
  // The end of a run that opened two heroes.
  result: async (page, shot) => {
    await page.evaluate(() => {
      const s = (window as unknown as Win).save() as { best: Record<string, number>; open: string[]; felled: string[]; runs: number };
      Object.assign(s, { best: {}, open: [], felled: [], runs: 2 });
    });
    await arena(page, { hero: 'knight', wave: 8, weapons: RICH.slice(0, 3), items: THINGS.slice(0, 4), level: 6, gold: 20, kills: 388, coins: 233, felled: ['warlord'] });
    await until(page, 'Hud');
    await fight(page, 3);
    await page.evaluate(() => {
      const world = (window as unknown as Win).world() as unknown as { hero: { hp: number }; over: string; lastBy: string };
      world.hero.hp = 0;
      world.over = 'dead';
      world.lastBy = 'scarab';
    });
    await until(page, 'Result');
    await tick(page, 60);
    await shot('result');
  },
  // The game held still.
  pause: async (page, shot) => {
    await arena(page, { hero: 'knight', wave: 3, weapons: RICH.slice(0, 2), level: 2 });
    await until(page, 'Hud');
    await fight(page, 4);
    await page.keyboard.press('KeyP');
    await tick(page, 10);
    await shot('pause');
  },
};

const browser = await chromium.launch();
for (const [label, width, height, dpr] of sizes) {
  const { context, page } = await open(browser, { viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: label.startsWith('phone'), isMobile: label.startsWith('phone') });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.clock.install();
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.clock.pauseAt(Date.now() + 1000);
  const shot = async (name: string): Promise<void> => {
    await page.screenshot({ path: `${out}/${label}-${name}.png` });
  };
  for (const [name, play] of Object.entries(STATES)) {
    if (want.length && !want.includes(name)) continue;
    try {
      await play(page, shot);
    } catch (e) {
      errors.push(`${name}: ${String(e)}`);
    }
  }
  console.log(`walk: ${label} ${width}x${height} done${errors.length ? `\n  errors:\n  ${[...new Set(errors)].slice(0, 8).join('\n  ')}` : ''}`);
  await context.close();
}
await browser.close();
