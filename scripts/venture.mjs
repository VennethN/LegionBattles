// node scripts/venture.mjs [url]
//
// Walks a dungeon and a raid: the hall of dungeons, a run of the first dungeon floor by
// floor with what each card has left carried on, its prize, and then the
// first raid from the hall of raids, where more of the enemy arrive while the battle is on. It
// needs the dev server running (npm run dev) or a served build, and
// Playwright. Pictures go to docs/screens.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { walker } from './walk.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
// Every tour is behind this player, so that none comes up over what is being looked at.
const SEEN = ['tour:basics', 'tour:rewards', 'tour:packs', 'tour:dungeons', 'tour:raids', 'tour:skills', 'tour:upgrades', 'tour:structures', 'tour:team'];
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.env.OUT ?? 'docs/screens';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const { press, mark } = walker(page);
const errors = [];
page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').split('\n').slice(0, 5).join('\n')}`));
const units = ['paladin', 'huscarl', 'colossus', 'frostwitch', 'ballista', 'pyromancer', 'cleric', 'knight', 'mage', 'archer'];
const cards = units.map((unit, i) => ({ id: i + 1, unit, grade: 4, level: 14, xp: 0 }));
const tiles = [[3, 1], [3, 2], [2, 0], [1, 1], [0, 2], [1, 3], [0, 0]];
const save = {
  version: 4, coins: 5210, cards, nextCard: 50, met: units,
  team: units.slice(0, 7).map((unit, i) => ({ card: i + 1, unit, col: tiles[i][0], row: tiles[i][1] })),
  cleared: 30, dungeons: {}, raids: {}, packs: {}, rng: 5, stats: { battles: 90, wins: 70, opened: 30 },
  speed: 2, sound: false, tutorial: { done: true, seen: SEEN, at: 0, tour: null }, at: 30, lostAt: null, auto: false, sort: 'unit',
};
await page.goto(base);
await page.evaluate((s) => localStorage.setItem('legion-battles-save', JSON.stringify(s)), save);
await page.reload();
await page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 60000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/30-main-with-hall-button.png` });
await mark('Main', 'hall');
await page.waitForFunction(() => window.game.scene.isActive('Hall'), null, { timeout: 10000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/31-hall.png` });
// ENTER the first dungeon.
await press('Hall', 'ENTER');
await page.waitForFunction(() => window.game.scene.isActive('Venture') && window.game.scene.getScene('Venture').state === 'camp', null, { timeout: 30000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/32-dungeon-camp.png` });
const scene = () => page.evaluate(() => { const v = window.game.scene.getScene('Venture'); return { state: v.state, floor: v.run?.floor, over: v.run?.over, roster: v.run?.roster.map((r) => [r.unit, Math.round(r.hp * 100), r.fielded]) }; });
for (let f = 0; f < 4; f++) {
  await press('Venture', 'FIGHT');
  await page.waitForFunction(() => window.game.scene.getScene('Venture').state === 'fighting', null, { timeout: 10000 });
  if (f === 0) { await page.waitForTimeout(2500); await page.screenshot({ path: `${out}/33-dungeon-floor.png` }); }
  await page.waitForFunction(() => ['camp', 'done'].includes(window.game.scene.getScene('Venture').state), null, { timeout: 240000 });
  await page.waitForTimeout(700);
  const now = await scene();
  console.log(`after floor ${f + 1}:`, JSON.stringify(now));
  if (f === 0) await page.screenshot({ path: `${out}/34-dungeon-camp-after-a-floor.png` });
  if (now.state === 'done') break;
}
await page.screenshot({ path: `${out}/35-dungeon-cleared.png` });
console.log('saved:', await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('legion-battles-save')); return { dungeons: s.dungeons, coins: s.coins, packs: s.packs }; }));
// BACK to the line, then a raid.
await press('Venture', 'BACK');
await page.waitForFunction(() => window.game.scene.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 30000 });
// The raids have a hall of their own, behind a button of their own.
await mark('Main', 'raids');
await page.waitForFunction(() => window.game.scene.isActive('Hall'), null, { timeout: 10000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/31b-hall-of-raids.png` });
await press('Hall', 'ENTER');
await page.waitForFunction(() => window.game.scene.isActive('Venture') && window.game.scene.getScene('Venture').state === 'camp', null, { timeout: 30000 });
await page.waitForTimeout(800);
await press('Venture', 'BATTLE');
await page.waitForTimeout(9000);
await page.screenshot({ path: `${out}/36-raid.png` });
console.log('raid units on the board:', await page.evaluate(() => window.game.scene.getScene('Venture').board.battle.units.length));
await page.waitForFunction(() => window.game.scene.getScene('Venture').state !== 'fighting', null, { timeout: 240000 });
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/37-raid-won.png` });
console.log('saved:', await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('legion-battles-save')); return { raids: s.raids, coins: s.coins, packs: s.packs }; }));
const end = await page.evaluate(() => JSON.parse(localStorage.getItem('legion-battles-save')));
if (end.dungeons.hollow !== 1 || !(end.packs['thornwood@1'] >= 2)) throw new Error(`the dungeon was not cleared and paid: ${JSON.stringify(end.dungeons)} ${JSON.stringify(end.packs)}`);
if (errors.length) {
  console.log(`ERRORS:\n${errors.join('\n')}`);
  process.exitCode = 1;
} else console.log('no errors');
await browser.close();
