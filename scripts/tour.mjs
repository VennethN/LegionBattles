// node scripts/tour.mjs [url]
//
// Puts a save that is well into the game in the browser's storage and takes
// the pictures docs/screens keeps of what a new player does not see yet: the
// menu of worlds with its difficulties, a full team, every pack on sale, a
// card turned over, and the two later bosses. It needs the dev server
// running (npm run dev) or a served build, and Playwright.

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
page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').split('\n').slice(0, 5).join('\n')}`));

const units = ['militia', 'archer', 'knight', 'cleric', 'berserker', 'mage', 'paladin', 'cutpurse', 'poacher', 'bruiser', 'hexer', 'warlord', 'lancer', 'javelineer', 'ballista', 'pyromancer', 'colossus', 'huscarl', 'harpooner', 'icegolem', 'frostwitch'];
const cards = {};
units.forEach((u, i) => { cards[u] = { grade: i % 7, level: 6 + (i % 9), xp: 10 }; });
const save = (at) => ({
  version: 2, coins: 23450, cards,
  team: [{ unit: 'paladin', col: 3, row: 1 }, { unit: 'huscarl', col: 3, row: 2 }, { unit: 'colossus', col: 2, row: 0 }, { unit: 'frostwitch', col: 1, row: 1 }, { unit: 'ballista', col: 0, row: 2 }, { unit: 'pyromancer', col: 1, row: 3 }, { unit: 'cleric', col: 0, row: 0 }],
  cleared: { thornwood: [10, 10, 4], sunscar: [12, 7], frostholt: [14] },
  packs: { recruit: 1, royal: 2, frost: 1, 'thornwood@2': 3 }, rng: 99, stats: { battles: 400, wins: 300, opened: 80 },
  speed: 2, sound: true, tutorial: { done: true, seen: [] }, at, lostAt: null,
  // Battles wait for a press, so that the pictures are of a still screen.
  auto: false,
});
const load = async (at) => {
  await page.goto(base);
  await page.evaluate((s) => localStorage.setItem('legion-battles-save', JSON.stringify(s)), save(at));
  await page.reload();
  await page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(500);
};
const overlay = async (key) => {
  await page.evaluate((k) => window.game.scene.getScene('Main').open(k), key);
  await page.waitForFunction((k) => window.game.scene.isActive(k), key, { timeout: 10000 });
  await page.waitForTimeout(400);
};
const close = async (key) => {
  await page.mouse.click(1280 - 262, 37);
  await page.waitForFunction((k) => !window.game.scene.isActive(k), key, { timeout: 10000 });
  await page.waitForTimeout(300);
};

await load({ world: 0, stage: 4, d: 2 });
await page.screenshot({ path: `${out}/10-main-hard.png` });
await overlay('Worlds');
await page.screenshot({ path: `${out}/11-worlds.png` });
await close('Worlds');
await overlay('Team');
await page.screenshot({ path: `${out}/12-team.png` });
await close('Team');
await overlay('Shop');
await page.screenshot({ path: `${out}/13-packs.png` });
// Open a Royal Pack, for the picture of a card being turned over.
await page.mouse.click(640 + 2 * 244, 372 + 140);
await page.waitForTimeout(900);
await page.mouse.click(640, 360);
await page.waitForFunction(() => { const sc = window.game.scene.getScene('Shop'); return !sc.busy && sc.show.length > 6; }, null, { timeout: 30000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/14-card.png` });

for (const [at, name] of [[{ world: 1, stage: 11, d: 0 }, 'colossus'], [{ world: 2, stage: 14, d: 0 }, 'jarl']]) {
  await load(at);
  await page.screenshot({ path: `${out}/15-${name}-ready.png` });
  await page.mouse.click(640, 664);
  await page.waitForTimeout(3200);
  await page.screenshot({ path: `${out}/16-${name}-battle.png` });
  await page.waitForFunction(() => window.game.scene.getScene('Main').state === 'after', null, { timeout: 180000 });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${out}/17-${name}-result.png` });
}
if (errors.length) {
  console.log(`ERRORS:\n${errors.slice(0, 8).join('\n')}`);
  process.exitCode = 1;
} else console.log('no errors');
await browser.close();
