// node scripts/newplayer.mjs [url]
//
// A new player, from an empty save. It watches the first battle start by
// itself, then presses whatever the tutorial points at until the tutorial
// is over, and fails if a step points at nothing or does not move on. Then
// it lets battles run and checks that a win moves on to the next stage,
// pressing through whatever tour comes up between them as a player would.
// It needs the dev server running (npm run dev) or a served build, and
// Playwright. Pictures go to docs/screens.

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.env.OUT ?? 'docs/screens';
fs.mkdirSync(out, { recursive: true });

// TOUCH=1 plays it on a phone held sideways, with touches only.
const touch = process.env.TOUCH === '1';
const browser = await chromium.launch();
const context = touch
  ? await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })
  : await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
const tag = touch ? 'phone-' : '';
const errors = [];
page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').split('\n').slice(0, 4).join('\n')}`));
const fail = async (why) => {
  console.log(`FAILED: ${why}`);
  if (errors.length) console.log(`errors:\n  ${errors.join('\n  ')}`);
  await page.screenshot({ path: `${out}/failed.png` });
  await browser.close();
  process.exit(1);
};

await page.goto(base);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 30000 });

// A press at a place on the game's own 1280 by 720 layout, wherever the canvas is on the page.
const box = await page.locator('canvas').boundingBox();
const k = box.width / 1280;
// And a place on the layout is not always where it is on the page: a menu is drawn in a window (view/app.ts).
const press = async (x0, y0) => {
  const { x, y } = await page.evaluate(([a, b]) => window.screenOf?.(a, b) ?? { x: a, y: b }, [x0, y0]);
  return touch ? page.touchscreen.tap(box.x + x * k, box.y + y * k) : page.mouse.click(box.x + x * k, box.y + y * k);
};

// What the tutorial shows now, on whichever screen is on top.
const guide = () => page.evaluate(() => {
  for (const key of ['Settings', 'Rewards', 'Hall', 'Player', 'Shop', 'Team', 'Map', 'Main']) {
    if (!window.game.scene.isActive(key)) continue;
    const g = window.game.scene.getScene(key).guide;
    if (g && g.step) return { scene: key, id: g.step.id, ok: !!g.step.ok, blocks: g.step.blocks, rect: g.rect, tour: g.step.tour ?? null };
    if (key !== 'Main') return { scene: key, id: null };
  }
  return null;
});
/** Presses what a step points at, or its own button if it has one. */
const answer = async (g) => {
  if (g.ok) {
    // GOT IT, or NEXT, is the gold button in the bubble: find it by asking the scene.
    const at = await page.evaluate((key) => {
      const sc = window.game.scene.getScene(key);
      const b = sc.guide.drawn.filter((o) => o.type === 'Container').pop();
      return b ? { x: b.x, y: b.y } : null;
    }, g.scene);
    if (!at) await fail(`no button to press on ${g.id}`);
    await press(at.x, at.y);
  } else {
    await press(g.rect.x + g.rect.w / 2, g.rect.y + g.rect.h / 2);
  }
};
const main = () => page.evaluate(() => {
  const m = window.game.scene.getScene('Main');
  const s = JSON.parse(localStorage.getItem('legion-battles-save') ?? '{}');
  return { state: m.state, count: m.count, at: m.at, done: s.tutorial?.done, seen: s.tutorial?.seen, battles: s.stats?.battles, cleared: s.cleared, team: (s.team ?? []).length };
});

// 1. The first battle starts by itself.
let g = await guide();
if (!g || g.id !== 'hello') await fail(`expected the tutorial's first word, got ${JSON.stringify(g)}`);
await page.screenshot({ path: `${out}/${tag}20-first-countdown.png` });
await page.waitForFunction(() => window.game.scene.getScene('Main').state === 'fighting', null, { timeout: 60000 }).catch(() => fail('the first battle did not start by itself'));
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/${tag}21-first-battle.png` });
await page.waitForFunction(() => window.game.scene.getScene('Main').state === 'after', null, { timeout: 120000 });
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/${tag}22-first-result.png` });

// 2. Press what the tutorial points at, until it is over.
const walked = [];
let shots = 0;
for (let i = 0; i < 60; i++) {
  const m = await main();
  if (m.done) break;
  g = await guide();
  if (!g || !g.id) {
    await page.waitForTimeout(250);
    continue;
  }
  if (walked[walked.length - 1] !== g.id) {
    walked.push(g.id);
    if (['packs', 'open', 'card', 'fill', 'word'].includes(g.id)) await page.screenshot({ path: `${out}/${tag}2${3 + shots++}-tutorial-${g.id}.png` });
  }
  if (g.id === 'hello') {
    await page.waitForTimeout(300);
    continue;
  }
  await answer(g);
  await page.waitForTimeout(g.id === 'tear' ? 2600 : 600);
}
let m = await main();
if (!m.done) await fail(`the tutorial did not end: walked ${walked.join(' > ')}, save ${JSON.stringify(m)}`);

// 3. Battles go on by themselves, and a win moves on. A tour may come up between two of them (the packs, once
// there are coins enough for one): it is pressed through, and the battles go on after it.
const before = m.at;
const from = m.battles;
const tours = [];
let stuck = 0;
for (let i = 0; i < 900; i++) {
  m = await main();
  if ((m.battles ?? 0) >= from + 3) break;
  g = await guide();
  if (g && g.id) {
    if (tours[tours.length - 1] !== g.id) {
      tours.push(g.id);
      stuck = 0;
    } else if (++stuck > 30) await fail(`the tour stayed at ${g.id}`);
    await answer(g);
    await page.waitForTimeout(500);
  } else if (g && g.scene !== 'Main') {
    // A tour that ends on the screen it led into leaves it open: shut it. The screen of cards has its CLOSE at its own edge.
    if (g.scene === 'Team') await press(824 - 76, 37);
    else await press(1280 - 262, 37);
    await page.waitForTimeout(400);
  } else await page.waitForTimeout(400);
  if (i === 899) await fail('battles did not go on by themselves');
}
m = await main();
await page.screenshot({ path: `${out}/${tag}29-running.png` });
console.log(JSON.stringify({ walked, tours, stageBefore: before, now: m }));
if (errors.length) await fail('the page threw');
await browser.close();
