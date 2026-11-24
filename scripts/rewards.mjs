// node scripts/rewards.mjs [url]
//
// Takes the pictures docs/screens keeps of the rewards: the button on the
// main screen with its count, the calendar and the playtime track, a day
// claimed, the card the second day gives being turned up, and the pack no
// shop sells in its slot. It walks the days by moving the game's own clock
// (addDays, view/clock.ts). It needs the dev server running (npm run dev) or
// a served build, and Playwright.

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.env.OUT ?? 'docs/screens';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message + '\n' + (e.stack ?? '').split('\n').slice(0, 5).join('\n')));
const cards = [];
for (const [u, g, l] of [['knight', 2, 5], ['paladin', 2, 5], ['archer', 2, 5], ['mage', 2, 5], ['cleric', 2, 5]]) cards.push({ id: cards.length + 1, unit: u, grade: g, level: l, xp: 0 });
const team = cards.map((c, i) => ({ card: c.id, unit: c.unit, col: 3 - (i % 2), row: i % 4 }));
const save = {
  version: 4, coins: 310, cards, nextCard: 99, met: cards.map((c) => c.unit), team, cleared: 6, ahead: {},
  packs: {}, rng: 5, stats: { battles: 9, wins: 6, opened: 3 }, speed: 1, sound: true,
  tutorial: { done: true, seen: [] }, at: 6, lostAt: null, auto: false,
  player: { level: 4, xp: 20 }, tree: {}, upgrades: {},
};
const main = () => page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 30000 });
const open = async () => {
  await page.mouse.click(1280 - 102, 131);
  await page.waitForFunction(() => window.game.scene.isActive('Rewards'), null, { timeout: 10000 });
  await page.waitForTimeout(400);
};
const close = async () => {
  await page.mouse.click(1280 - 262, 37);
  await page.waitForFunction(() => !window.game.scene.isActive('Rewards'), null, { timeout: 10000 });
  await page.waitForTimeout(300);
};
/** Presses the CLAIM of a day of the calendar or of a step of the playtime track, where the scene says it is. */
const claim = async (what, i) => {
  const r = await page.evaluate(([w, n]) => {
    const s = window.game.scene.getScene('Rewards');
    return w === 'day' ? s.dayRect(n) : s.stepRect(n);
  }, [what, i]);
  await page.mouse.click(r.x + r.w / 2, r.y + r.h - 28);
};

await page.goto(base);
await page.evaluate((v) => localStorage.setItem('legion-battles-save', JSON.stringify(v)), save);
await page.reload();
await main();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/84-main-with-rewards.png` });

// The first day: coins.
await open();
await page.screenshot({ path: `${out}/85-rewards.png` });
await claim('day', 0);
await page.waitForTimeout(350);
await page.screenshot({ path: `${out}/86-rewards-day-claimed.png` });

// The second day gives a card no pack holds.
await page.evaluate(() => window.addDays(1));
await page.waitForTimeout(1200);
await claim('day', 1);
// The game's own clock runs slow where frames are slow: DONE is waited for, not timed.
await page.waitForFunction(() => !!window.game.scene.getScene('Rewards').doneRect, null, { timeout: 20000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/87-rewards-card.png` });
await page.mouse.click(640, 720 - 56);
await page.waitForFunction(() => !window.game.scene.getScene('Rewards').doneRect, null, { timeout: 10000 });
await page.waitForTimeout(300);

// Twelve minutes played: three steps of the track are ready, the pack no shop sells among them.
await page.evaluate(() => {
  const scene = window.game.scene.getScene('Rewards');
  scene.addPlayed(12 * 60 + 14);
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/88-rewards-playtime.png` });
await claim('step', 0);
await page.waitForTimeout(200);
await claim('step', 1);
await page.waitForTimeout(200);
await claim('step', 2);
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/89-rewards-pack-claimed.png` });
await close();

// The pack in its slot, with what it holds.
await page.mouse.click(328, 664);
await page.waitForFunction(() => window.game.scene.isActive('Shop'), null, { timeout: 10000 });
await page.waitForTimeout(300);
await page.mouse.click(30 + 66 + 3 * 140, 78 + 67);
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/90-faithful-pack.png` });

console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
