// node scripts/sheetfull.mjs [url]
//
// Fills the sheet the battle's units are drawn from until it has to be
// wiped, with a team standing on the board the whole time, and fails if the
// page throws or the team is not drawn again afterwards. The sheet holds the
// parts of every unit a player has met, in both colors, and wipes itself
// when the next battle's do not fit; a wipe that takes a picture from under
// a sprite that is still on the screen was a crash ("Cannot read properties
// of null (reading 'resolution')") until 24 November 2026. It needs the dev
// server running (npm run dev) or a served build, and Playwright.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const SEEN = ['tour:basics', 'tour:rewards', 'tour:packs', 'tour:dungeons', 'tour:raids', 'tour:skills', 'tour:upgrades', 'tour:structures'];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const cards = [];
for (const [u, g, l] of [['knight', 3, 8], ['paladin', 3, 8], ['archer', 3, 8], ['mage', 3, 8], ['cleric', 3, 8]]) cards.push({ id: cards.length + 1, unit: u, grade: g, level: l, xp: 0 });
const team = cards.map((c, i) => ({ card: c.id, unit: c.unit, col: 3 - (i % 2), row: i % 4 }));
const save = {
  version: 4, coins: 900, cards, nextCard: 99, met: cards.map((c) => c.unit), team, cleared: 12, ahead: {}, packs: {}, rng: 5,
  stats: { battles: 30, wins: 20, opened: 9 }, speed: 1, sound: false, tutorial: { done: true, seen: SEEN, at: 0, tour: null }, at: 3, lostAt: null, auto: false,
  player: { level: 6, xp: 0 }, tree: {}, upgrades: {},
};
await page.goto(base);
await page.evaluate((v) => localStorage.setItem('legion-battles-save', JSON.stringify(v)), save);
await page.reload();
const ready = () => page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 60000 });
await ready();
/** How many parts of units are on the sheet, and how many sprites of the team are on the board. */
const look = () => page.evaluate(() => {
  const t = window.game.textures.get('sheet');
  const m = window.game.scene.getScene('Main');
  const dead = m.children.list.filter((o) => o.frame && !o.frame.source).length;
  return { parts: Object.keys(t.frames).filter((n) => n.startsWith('units/')).length, views: m.board.views.length, dead };
});
const units = await page.evaluate(() => Object.keys(window.game.cache.json.get('manifest').units));
// The board is asked to stand the same team again with more and more others to have ready, eight at a time, both colors in turn.
let wiped = 0;
let before = (await look()).parts;
let most = before;
for (let i = 0; i < 40 && errors.length === 0; i++) {
  const more = [];
  for (let k = 0; k < 8; k++) more.push(units[(i * 8 + k) % units.length]);
  await page.evaluate(async (list) => {
    const m = window.game.scene.getScene('Main');
    const s = JSON.parse(localStorage.getItem('legion-battles-save'));
    await m.board.show(s.team, list.slice(0, 4).map((unit, n) => ({ unit, col: 6, row: n })), 7, list, m.board.field);
  }, more);
  await page.waitForTimeout(250);
  const now = await look();
  most = Math.max(most, now.parts);
  if (now.parts < before) wiped++;
  before = now.parts;
  if (now.dead > 0) {
    console.log(`FAILED: ${now.dead} things on the board are drawn from pictures that are gone`);
    process.exitCode = 1;
    break;
  }
  if (now.views < 5) {
    console.log(`FAILED: after ${i + 1} rounds the board has ${now.views} units on it`);
    process.exitCode = 1;
    break;
  }
  if (wiped >= 2) break;
}
await page.waitForTimeout(500);
console.log(JSON.stringify({ units: units.length, mostPartsAtOnce: most, wiped, errors }));
if (errors.length) {
  console.log(`FAILED: the page threw: ${errors[0]}`);
  process.exitCode = 1;
} else if (wiped === 0) {
  console.log('FAILED: the sheet was never wiped, so this checked nothing');
  process.exitCode = 1;
} else if (!process.exitCode) console.log('no errors');
await browser.close();
