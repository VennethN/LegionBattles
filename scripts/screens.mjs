// node scripts/screens.mjs [url]
//
// Plays the game in a headless browser and takes the pictures docs/screens
// keeps: placement, the middle of a battle, the result. It needs the dev
// server running (npm run dev) or a served build, and Playwright.

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.env.OUT ?? 'docs/screens';
const seed = process.env.SEED ?? '123';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: Number(process.env.DPR ?? 1) });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(`${base}?seed=${seed}`);
await page.waitForFunction(() => window.game?.scene?.getScene('Battle')?.phase === 'placement', null, { timeout: 20000 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/1-placement.png` });

// Drag the first unit two tiles back, to see that dragging works.
const box = await page.locator('canvas').boundingBox();
const sx = box.width / 1280;
const sy = box.height / 720;
const at = (x, y) => [box.x + x * sx, box.y + y * sy];
const tile = (col, row) => at(160 + (col + 0.5) * 120, 186 + (row + 0.5) * 102 - 40);
await page.mouse.move(...tile(3, 1));
await page.mouse.down();
await page.mouse.move(...tile(2, 2), { steps: 8 });
await page.screenshot({ path: `${out}/2-dragging.png` });
await page.mouse.move(...tile(1, 3), { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(400);

await page.mouse.click(...at(640, 662));
await page.waitForTimeout(Number(process.env.MID ?? 4200));
await page.screenshot({ path: `${out}/3-battle.png` });
await page.keyboard.press('d');
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/4-debug.png` });
await page.keyboard.press('d');

await page.waitForFunction(() => window.game.scene.getScene('Battle').phase === 'result', null, { timeout: 120000 });
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/5-result.png` });

const info = await page.evaluate(() => {
  const s = window.game.scene.getScene('Battle');
  return { winner: s.battle.winner, seconds: s.battle.time, fps: Math.round(window.game.loop.actualFps), renderer: window.game.renderer.type };
});
console.log(JSON.stringify(info));
if (errors.length) console.log(`console:\n  ${errors.slice(0, 20).join('\n  ')}`);
await browser.close();
