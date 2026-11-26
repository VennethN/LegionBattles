// npm run fx:look [state ...]
//
// With `npm run dev` running (or URL= a served build): close pictures of the
// effects, to build/fxlook. Each state plays a wave until the moment that is
// to be looked at comes (a red warning on the ground, a crowd being hit, a
// level), and takes the field round the hero at three moments a few frames
// apart, twice as big, as a strip. The pictures of a whole screen are too
// small to see a chip of stone or a tongue of fire in.

import fs from 'node:fs';

import { chromium, open, type Page } from './browser';
import { RICH, THINGS, UPS, arena, fight, until, type Win } from './drive';

const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const out = 'build/fxlook';
fs.mkdirSync(out, { recursive: true });
const base = process.env.URL ?? 'http://127.0.0.1:5175/';

type World = { hero: { x: number; y: number; hp: number; maxHp: number }; foes: Array<{ state: string; doing: string; x: number; y: number }>; zones: unknown[] };
const world = (page: Page): Promise<World> => page.evaluate(() => {
  const w = (window as unknown as Win).world() as unknown as World;
  return { hero: { ...w.hero }, foes: w.foes.map((f) => ({ state: f.state, doing: f.doing, x: f.x, y: f.y })), zones: [...w.zones] };
});

/** The hero cannot fall in these: the pictures are of what is done to the others. */
const keep = (page: Page): Promise<void> => page.evaluate(() => {
  const h = ((window as unknown as Win).world() as unknown as World).hero;
  h.maxHp = 99999;
  h.hp = 99999;
});

/** Plays on, a few frames at a time, until `when` says the moment has come, or the time is up. */
async function wait(page: Page, seconds: number, when: (w: World) => boolean): Promise<boolean> {
  for (let i = 0; i < seconds * 10; i++) {
    await fight(page, 6);
    if (when(await world(page))) return true;
  }
  return false;
}

/** Three pictures round the hero, `gap` frames apart, side by side in one strip. */
async function strip(page: Page, name: string, gap: number): Promise<void> {
  const files: string[] = [];
  for (let i = 0; i < 3; i++) {
    if (i) await fight(page, gap);
    const file = `${out}/${name}-${i + 1}.png`;
    await (page as unknown as { screenshot(o: unknown): Promise<unknown> }).screenshot({ path: file, clip: { x: 907 / 2 - 230, y: 510 / 2 - 150, width: 460, height: 300 } });
    files.push(file);
  }
  console.log(`  ${name}: ${files.join(' ')}`);
}

const STATES: Record<string, (page: Page) => Promise<void>> = {
  // A red warning: a lane or a ring on the ground before the blow.
  warn: async (page) => {
    await arena(page, { hero: 'bram', wave: 8, weapons: RICH.slice(0, 2), items: THINGS, ups: UPS, level: 12, gold: 50 });
    await until(page, 'Hud');
    await keep(page);
    const seen = await wait(page, 40, (w) => w.foes.some((f) => f.state === 'aim' && ['charge', 'burst', 'ring', 'blaze'].includes(f.doing)));
    if (!seen) console.log('  warn: no warning came');
    await strip(page, 'warn', 12);
  },
  // Blows on a crowd, by every kind of weapon a hand can hold.
  hits: async (page) => {
    await arena(page, { hero: 'nan', wave: 11, weapons: [{ id: 'sword', tier: 2 }, { id: 'hammer', tier: 2 }, { id: 'torch', tier: 1 }, { id: 'frost', tier: 1 }, { id: 'staff', tier: 1 }, { id: 'censer', tier: 1 }], items: THINGS, ups: UPS, level: 14, gold: 50 });
    await until(page, 'Hud');
    await keep(page);
    await fight(page, 60 * 6);
    await strip(page, 'hits', 5);
  },
  // Further on, in other lands.
  hits2: async (page) => {
    await arena(page, { hero: 'hroth', wave: 31, weapons: RICH, items: THINGS, ups: UPS, level: 26, gold: 50 });
    await until(page, 'Hud');
    await keep(page);
    await fight(page, 60 * 5);
    await strip(page, 'hits2', 5);
  },
  hits3: async (page) => {
    await arena(page, { hero: 'ysolde', wave: 51, weapons: RICH, items: THINGS, ups: UPS, level: 36, gold: 50 });
    await until(page, 'Hud');
    await keep(page);
    await fight(page, 60 * 5);
    await strip(page, 'hits3', 5);
  },
};

const browser = await chromium.launch();
const { context, page } = await open(browser, { viewport: { width: 907, height: 510 }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e.message)));
await page.clock.install();
await page.goto(base);
await page.evaluate(() => localStorage.setItem('lastander-light', 'full'));
await page.reload();
await page.clock.pauseAt(Date.now() + 1000);
await until(page, 'Hud');
for (const [name, run] of Object.entries(STATES)) {
  if (want.length && !want.includes(name)) continue;
  try {
    await run(page as Page);
  } catch (e) {
    errors.push(`${name}: ${String(e)}`);
  }
}
console.log(`fx look done${errors.length ? `\n  errors:\n  ${[...new Set(errors)].slice(0, 8).join('\n  ')}` : ''}`);
await context.close();
await browser.close();
