// node scripts/player.mjs [url]
//
// Takes the pictures docs/screens keeps of the player's own growth: the
// level under the coins on the main screen, the skill tree, the upgrades,
// and what a battle's result shows (what was won, who made a level, the
// player's level, what the win opened). It needs the dev server running
// (npm run dev) or a served build, and Playwright.

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

// Every tour is behind this player, so that none comes up over what is being looked at.
const SEEN = ['tour:basics', 'tour:rewards', 'tour:packs', 'tour:dungeons', 'tour:raids', 'tour:skills', 'tour:upgrades', 'tour:structures'];
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.env.OUT ?? 'docs/screens';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
// A place on the game's layout is not always where it is on the page: a menu is drawn in a window (view/app.ts).
const click = async (x, y) => {
  const p = await page.evaluate(([a, b]) => window.screenOf?.(a, b) ?? { x: a, y: b }, [x, y]);
  await page.mouse.click(p.x, p.y);
};
const errors = [];
page.on('pageerror', (e) => errors.push(e.message + '\n' + (e.stack ?? '').split('\n').slice(0, 5).join('\n')));
const cards = [];
for (const [u, g, l, x] of [// Four of them are a battle short of their next level, so that the result has level-ups to show.
  ['knight', 4, 9, 850], ['paladin', 4, 9, 0], ['archer', 4, 9, 852], ['mage', 4, 9, 0], ['cleric', 4, 9, 849], ['militia', 4, 9, 0], ['watchtower', 2, 4, 205]]) cards.push({ id: cards.length + 1, unit: u, grade: g, level: l, xp: x });
const team = cards.map((c, i) => ({ card: c.id, unit: c.unit, col: 3 - (i % 2), row: i % 4 }));
const save = {
  version: 4, coins: 2450, cards, nextCard: 99, met: cards.map((c) => c.unit), team, cleared: 9, ahead: {},
  packs: {}, rng: 5, stats: { battles: 9, wins: 6, opened: 3 }, speed: 2, sound: true,
  tutorial: { done: true, seen: SEEN, at: 0, tour: null }, at: 9, lostAt: null, auto: false,
  player: { level: 9, xp: 420 }, tree: { command: 1, edge: 3, drill: 2 }, upgrades: { whetstones: 3, ledgers: 1 },
};
// The loading screen, with the logo over the bar. The art is held back a moment, so that the screen is still up to be looked at.
const hold = async (route) => {
  await new Promise((r) => setTimeout(r, 2500));
  // The page may have moved on by then, and the request with it.
  await route.continue().catch(() => {});
};
await page.route('**/assets/units/**', hold);
await page.goto(base);
await page.waitForFunction(() => window.game?.scene?.isActive('Boot') && window.game.textures.exists('logo'), null, { timeout: 30000 });
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/79-loading.png` });
await page.unroute('**/assets/units/**', hold);

await page.goto(base);
await page.evaluate((v) => localStorage.setItem('legion-battles-save', JSON.stringify(v)), save);
await page.reload();
await page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 30000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/80-main-with-level.png` });
await click(1280 - 102, 86);
await page.waitForFunction(() => window.game.scene.isActive('Player'), null, { timeout: 10000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/81-skills.png` });
await page.evaluate(() => window.game.scene.getScene('Player').scene.restart({ page: 'upgrades' }));
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/82-upgrades.png` });
await click(1280 - 262, 37);
await page.waitForTimeout(500);
// The Warlord: a first win, which opens two worlds, drops packs and makes levels.
await page.evaluate(() => window.game.scene.getScene('Main').fight());
await page.waitForFunction(() => window.game.scene.getScene('Main').state === 'after', null, { timeout: 180000 });
await page.waitForTimeout(1900);
await page.screenshot({ path: `${out}/83-result.png` });
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
