// node scripts/phone.mjs [url]
//
// A new player on a phone held sideways, with touches only: opens a pack,
// picks a card, starts the first stage, wins it and goes on to the next.
// It needs the dev server running (npm run dev) or a served build, and
// Playwright. It starts from an empty save.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.argv[2] ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => localStorage.clear());
await page.reload();
const scene = (name) => page.waitForFunction((n) => window.game?.scene?.isActive(n), name, { timeout: 20000 });
await scene('Home');
await page.waitForTimeout(400);
const box = await page.locator('canvas').boundingBox();
const k = box.width / 1280;
const tap = (x, y) => page.touchscreen.tap(box.x + x * k, box.y + y * k);
await tap(640 + 214, 676);
await scene('Shop');
await page.waitForTimeout(300);
await tap(640 - 2 * 244, 350 + 148);
await page.waitForTimeout(900);
await tap(640, 360);
await page.waitForFunction(() => { const sc = window.game.scene.getScene('Shop'); return !sc.busy && sc.show.length > 6; }, null, { timeout: 30000 });
await page.waitForTimeout(300);
await page.screenshot({ path: 'docs/screens/8-phone-card.png' });
await tap(640 - 150, 658);
await page.waitForTimeout(600);
await tap(640, 676);
await scene('Team');
await page.waitForTimeout(300);
await tap(30 + 66 + 140, 78 + 67);
await page.waitForTimeout(300);
const selected = await page.evaluate(() => window.game.scene.getScene('Team').selected);
await page.screenshot({ path: 'docs/screens/9-phone-team.png' });
await tap(640 - 214, 676);
await scene('Home');
await page.waitForTimeout(300);
const node = await page.evaluate(() => window.game.scene.getScene('Home').positions(10)[0]);
await tap(node[0], node[1]);
await page.waitForTimeout(400);
await tap(640 + 120, 360 - 10 + 210 - 62);
await scene('Battle');
await page.waitForFunction(() => window.game.scene.getScene('Battle').phase === 'placement', null, { timeout: 20000 });
await tap(640, 662);
await page.waitForFunction(() => window.game.scene.getScene('Battle').phase === 'result', null, { timeout: 120000 });
await page.waitForTimeout(2600);
const won = await page.evaluate(() => window.game.scene.getScene('Battle').battle.winner === 0);
// NEXT is the right-hand button of three when the stage was won.
if (won) {
  const rows = await page.evaluate(() => JSON.parse(localStorage.getItem('legion-battles-save')));
  await tap(640 + 198, 372 + (150 + 4 * 42) / 2 - 54);
  await page.waitForTimeout(1500);
  const st = await page.evaluate(() => { const b = window.game.scene.getScene('Battle'); return { stage: b.stageIndex, phase: b.phase }; });
  console.log(JSON.stringify({ selected, won, cleared: rows.cleared, next: st }));
} else console.log(JSON.stringify({ selected, won }));
if (errors.length) console.log('errors:\n  ' + errors.join('\n  '));
await browser.close();
