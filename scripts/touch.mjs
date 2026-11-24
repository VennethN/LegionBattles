// node scripts/touch.mjs [url]
//
// The same walk as scripts/screens.mjs, on a phone held sideways and with
// touches instead of a mouse: drag a unit, press FIGHT, wait for the result,
// press PLAY AGAIN. It fails if a touch does not do what a click would.

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.env.OUT ?? 'docs/screens';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}?seed=77`);
await page.waitForFunction(() => window.game?.scene?.getScene('Battle')?.phase === 'placement', null, { timeout: 20000 });
await page.waitForTimeout(400);

const box = await page.locator('canvas').boundingBox();
const k = box.width / 1280;
const at = (x, y) => ({ x: box.x + x * k, y: box.y + y * k });
const tile = (col, row) => at(160 + (col + 0.5) * 120, 186 + (row + 0.5) * 102 - 40);
const cdp = await context.newCDPSession(page);
const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: p.x, y: p.y }] });

const placed = () => page.evaluate(() => window.game.scene.getScene('Battle').team.map((p) => `${p.unit}@${p.col},${p.row}`).join(' '));
const before = await placed();
// Drag the unit on (3,1) onto (1,1), where another stands: they should swap.
const from = tile(3, 1);
const to = tile(1, 1);
await touch('touchStart', from);
for (let i = 1; i <= 8; i++) await touch('touchMove', { x: from.x + ((to.x - from.x) * i) / 8, y: from.y + ((to.y - from.y) * i) / 8 });
await touch('touchEnd');
await page.waitForTimeout(400);
const after = await placed();
await page.screenshot({ path: `${out}/6-phone-placement.png` });

const fight = at(640, 662);
await page.touchscreen.tap(fight.x, fight.y);
await page.waitForTimeout(3500);
await page.screenshot({ path: `${out}/7-phone-battle.png` });
await page.waitForFunction(() => window.game.scene.getScene('Battle').phase === 'result', null, { timeout: 120000 });
await page.waitForTimeout(900);
const seed1 = await page.evaluate(() => window.game.scene.getScene('Battle').seed);
await page.touchscreen.tap(fight.x, fight.y);
await page.waitForFunction((s) => {
  const scene = window.game.scene.getScene('Battle');
  return scene.phase === 'placement' && scene.seed !== s;
}, seed1, { timeout: 20000 });
const again = await page.evaluate(() => ({ seed: window.game.scene.getScene('Battle').seed, url: location.search, canvas: [window.game.canvas.width, window.game.canvas.height] }));

console.log(JSON.stringify({ before, after, swapped: before !== after, seed1, again }));
if (errors.length) console.log(`errors:\n  ${errors.join('\n  ')}`);
await browser.close();
if (before === after || errors.length) process.exit(1);
