// node scripts/tours.mjs [url]
//
// Walks every tour in the game itself. It starts a player for whom every
// tour is due, lets each start by itself (with battles between them), and
// presses whatever each step points at, or its NEXT, until the tour is over.
// It fails if a step points at nothing, does not move on, or a tour leaves
// the player on a screen they cannot get out of. Then it opens the settings,
// looks at the list of tutorials, and views one again. Pictures of the
// settings and of a step of each tour go to docs/screens. It needs the dev
// server running (npm run dev) or a served build, and Playwright.

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.env.OUT ?? 'docs/screens';
// ALL=1 keeps a picture of every step, not one to a tour.
const all = process.env.ALL === '1';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
// A place on the game's layout is not always where it is on the page: a menu is drawn in a window (view/app.ts).
const click = async (x, y) => {
  const p = await page.evaluate(([a, b]) => window.screenOf?.(a, b) ?? { x: a, y: b }, [x, y]);
  await page.mouse.click(p.x, p.y);
};
const errors = [];
page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').split('\n').slice(0, 5).join('\n')}`));
const fail = async (why) => {
  console.log(`FAILED: ${why}`);
  if (errors.length) console.log(`errors:\n  ${errors.join('\n  ')}`);
  await page.screenshot({ path: `${out}/failed.png` });
  await browser.close();
  process.exit(1);
};

const cards = [];
for (const [u, g, l] of [['knight', 4, 12], ['paladin', 4, 12], ['archer', 4, 12], ['mage', 4, 12], ['cleric', 4, 12], ['militia', 4, 12], ['watchtower', 3, 6], ['spiketrap', 2, 3]]) {
  cards.push({ id: cards.length + 1, unit: u, grade: g, level: l, xp: 0 });
}
const team = cards.slice(0, 6).map((c, i) => ({ card: c.id, unit: c.unit, col: 3 - (i % 2), row: i % 4 }));
const save = {
  version: 4, coins: 6000, cards, nextCard: 99, met: cards.map((c) => c.unit), team, cleared: 12, ahead: {},
  packs: { recruit: 1 }, rng: 5, stats: { battles: 9, wins: 6, opened: 3 }, speed: 2, sound: true,
  tutorial: { done: true, seen: ['tour:basics'], at: 0, tour: null }, at: 3, lostAt: null, auto: false,
  player: { level: 5, xp: 10 }, tree: {}, upgrades: {},
};
const SCREENS = ['Settings', 'Rewards', 'Hall', 'Player', 'Shop', 'Team', 'Map', 'Main'];
const ready = () => page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 60000 });
/** What the tutorial shows now, on whichever screen is on top, and the tour the save says is up. */
const guide = () => page.evaluate((screens) => {
  const s = JSON.parse(localStorage.getItem('legion-battles-save') ?? '{}');
  const top = screens.find((key) => window.game.scene.isActive(key));
  const g = top ? window.game.scene.getScene(top).guide : null;
  const live = window.game.scene.getScene('Main').guide;
  const step = g?.step ? { id: g.step.id, tour: g.step.tour, ok: !!g.step.ok, press: !!g.step.press, n: g.step.n, of: g.step.of, target: g.step.target, text: g.step.text, rect: g.rect } : null;
  let button = null;
  if (g?.step?.ok) {
    const b = g.drawn.filter((o) => o.type === 'Container').pop();
    button = b ? { x: b.x, y: b.y } : null;
  }
  return { top, step, button, seen: s.tutorial?.seen ?? [], holds: !!live?.holds };
}, SCREENS);
/** The tour that is up, as the game holds it now. */
const tourUp = () => page.evaluate(() => window.game.scene.getScene('Main').tourUp?.() ?? null);

await page.goto(base);
await page.evaluate((v) => localStorage.setItem('legion-battles-save', JSON.stringify(v)), save);
await page.reload();
await ready();

const walked = {};
const kept = new Set();
let shot = 0;
/** Presses through whatever tour is up until none is. */
async function walk(label) {
  let last = '';
  let same = 0;
  for (let i = 0; i < 120; i++) {
    const up = await tourUp();
    if (!up) return;
    const g = await guide();
    if (!g.step) {
      // Between two screens: the one the last press opened is still coming up.
      await page.waitForTimeout(150);
      if (++same > 60) await fail(`${label}: the tour ${up.id} is at step ${up.step + 1} and nothing is shown on ${g.top}`);
      continue;
    }
    if (g.step.id === last) {
      if (++same > 40) await fail(`${label}: step ${g.step.id} did not move on`);
      await page.waitForTimeout(150);
      continue;
    }
    last = g.step.id;
    same = 0;
    (walked[g.step.tour] ??= []).push(`${g.top}/${g.step.target}`);
    if (!g.step.rect || g.step.rect.w <= 0 || g.step.rect.h <= 0) await fail(`${label}: step ${g.step.id} points at nothing`);
    const r = g.step.rect;
    if (r.x < -8 || r.y < -8 || r.x + r.w > 1288 || r.y + r.h > 728) await fail(`${label}: step ${g.step.id} points off the screen: ${JSON.stringify(r)}`);
    await page.waitForTimeout(350);
    // One picture to a tour: its first note, which is the first step on the screen it leads into.
    const first = g.step.ok && !kept.has(`${label}:${g.step.tour}`);
    if (all || first) {
      kept.add(`${label}:${g.step.tour}`);
      await page.screenshot({ path: all ? `${out}/tour-${label}-${g.step.tour}-${g.step.n}.png` : `${out}/${93 + shot++}-tour-${g.step.tour}.png` });
    }
    if (g.step.ok) {
      if (!g.button) await fail(`${label}: step ${g.step.id} has no button`);
      await click(g.button.x, g.button.y);
    } else await click(r.x + r.w / 2, r.y + r.h / 2);
    await page.waitForTimeout(250);
  }
  await fail(`${label}: the tour did not end`);
}
/** Back to the field, whatever screen a tour left open, and a battle fought: two of them stand between one tour and the next. */
async function onward() {
  for (let i = 0; i < 5; i++) {
    const top = await page.evaluate((screens) => screens.find((key) => window.game.scene.isActive(key)), SCREENS);
    if (top === 'Main') break;
    await click(1280 - 262, 37);
    await page.waitForTimeout(400);
  }
  await ready();
  if (await tourUp()) return;
  await page.evaluate(() => window.game.scene.getScene('Main').fight());
  await page.waitForFunction(() => window.game.scene.getScene('Main').state === 'after', null, { timeout: 240000 });
  await ready();
  await page.waitForTimeout(300);
}

// 1. Each tour starts by itself, with battles between one and the next.
const order = [];
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(400);
  const up = await tourUp();
  if (up) {
    order.push(up.id);
    const g = await guide();
    if (!g.holds) await fail(`the battles do not wait while the tour ${up.id} is up`);
    await walk('first');
    const after = await guide();
    if (!after.seen.includes(`tour:${up.id}`)) await fail(`the tour ${up.id} ended and is not marked as seen`);
  } else if (order.length >= 6) break;
  await onward();
}
console.log(JSON.stringify({ order, walked }, null, 1));
if (order.length < 6) await fail(`only ${order.length} tours started by themselves: ${order.join(', ')}`);

// 2. The settings, and the list of tutorials.
await click(1168, 664);
await page.waitForFunction(() => window.game.scene.isActive('Settings'), null, { timeout: 10000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/91-settings.png` });
await page.evaluate(() => window.game.scene.getScene('Settings').scene.restart({ page: 'guides' }));
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/92-how-to-play.png` });

// 3. View the basics again from the list: its first row's button.
const view = await page.evaluate(() => window.game.scene.getScene('Settings').firstView);
if (!view) await fail('the list of tutorials has no VIEW');
await click(view.x + view.w / 2, view.y + view.h / 2);
await page.waitForFunction(() => !window.game.scene.isActive('Settings'), null, { timeout: 10000 });
await page.waitForTimeout(500);
const again = await tourUp();
if (!again || again.id !== 'basics') await fail(`VIEW AGAIN did not start the basics: ${JSON.stringify(again)}`);
await walk('again');
console.log(JSON.stringify({ again: walked.basics }));
if (errors.length) await fail('the page threw');
console.log('no errors');
await browser.close();
