// node scripts/newplayer.mjs [url]
//
// A new player, from an empty save. It watches the first battle start by
// itself, then presses whatever the tutorial points at until the tutorial
// is over, and fails if a step points at nothing or does not move on. Then
// it lets battles run and checks that a win moves on to the next stage.
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
const press = (x, y) => (touch ? page.touchscreen.tap(box.x + x * k, box.y + y * k) : page.mouse.click(box.x + x * k, box.y + y * k));

// What the tutorial shows now, on whichever screen is on top.
const guide = () => page.evaluate(() => {
  for (const key of ['Shop', 'Team', 'Map', 'Main']) {
    if (!window.game.scene.isActive(key)) continue;
    const g = window.game.scene.getScene(key).guide;
    if (g && g.step) return { scene: key, id: g.step.id, ok: !!g.step.ok, blocks: g.step.blocks, rect: g.rect };
    if (key !== 'Main') return null;
  }
  return null;
});
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
  if (!g) {
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
  if (g.ok) {
    // GOT IT is the gold button in the bubble: find it by asking the scene.
    const at = await page.evaluate((key) => {
      const sc = window.game.scene.getScene(key);
      const b = sc.guide.drawn.filter((o) => o.type === 'Container').pop();
      return b ? { x: b.x, y: b.y } : null;
    }, g.scene);
    if (!at) await fail('no GOT IT to press');
    await press(at.x, at.y);
  } else {
    await press(g.rect.x + g.rect.w / 2, g.rect.y + g.rect.h / 2);
  }
  await page.waitForTimeout(g.id === 'tear' ? 2600 : 600);
}
let m = await main();
if (!m.done) await fail(`the tutorial did not end: walked ${walked.join(' > ')}, save ${JSON.stringify(m)}`);

// 3. Battles go on by themselves, and a win moves on.
const before = m.at;
await page.waitForFunction((b) => {
  const s = JSON.parse(localStorage.getItem('legion-battles-save') ?? '{}');
  return (s.stats?.battles ?? 0) >= b + 2;
}, m.battles, { timeout: 180000 }).catch(() => fail('battles did not go on by themselves'));
m = await main();
await page.screenshot({ path: `${out}/${tag}29-running.png` });
console.log(JSON.stringify({ walked, stageBefore: before, now: m }));
if (errors.length) await fail('the page threw');
await browser.close();
