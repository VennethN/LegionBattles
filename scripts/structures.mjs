// node scripts/structures.mjs [url]
//
// Puts a save with buildings and traps in it in the browser's storage and
// takes pictures of them: on the player's side and the enemy's in a battle
// (a tower shooting, a barracks sending out its Militia, a trap gone off),
// on the UNITS screen, and the Builder's Pack in the shop. It needs the dev
// server running (npm run dev) or a served build, and Playwright.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { walker } from './walk.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

// Every tour is behind this player, so that none comes up over what is being looked at.
const SEEN = ['tour:basics', 'tour:rewards', 'tour:packs', 'tour:dungeons', 'tour:raids', 'tour:skills', 'tour:upgrades', 'tour:structures'];
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.env.OUT ?? 'docs/screens';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const { press, mark } = walker(page);
const errors = [];
page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').split('\n').slice(0, 5).join('\n')}`));

const cards = [];
const card = (unit, grade, level) => { cards.push({ id: cards.length + 1, unit, grade, level, xp: 10 }); return cards.length; };
const held = {};
for (const [unit, grade, level] of [
  ['knight', 2, 5], ['paladin', 1, 4], ['archer', 2, 5], ['mage', 1, 4], ['cleric', 1, 4], ['militia', 1, 3], ['berserker', 0, 3],
  ['watchtower', 1, 3], ['barracks', 1, 3], ['spiketrap', 1, 2], ['beartrap', 0, 2], ['palisade', 0, 2], ['warbanner', 0, 1],
  ['lookout', 0, 1], ['bramblesnare', 0, 1],
]) held[unit] = card(unit, grade, level);
const fielded = (unit, col, row) => ({ card: held[unit], unit, col, row });
const save = (at, cleared) => ({
  version: 4, coins: 2450, cards, nextCard: cards.length + 1, met: Object.keys(held),
  team: [
    fielded('knight', 3, 1), fielded('paladin', 3, 2), fielded('archer', 1, 0), fielded('mage', 1, 3), fielded('cleric', 0, 2), fielded('militia', 2, 0),
    // The structures: a trap out in front where they will come, the tower behind the line, the barracks at the back.
    fielded('spiketrap', 3, 0), fielded('watchtower', 1, 1), fielded('barracks', 0, 0),
  ],
  cleared,
  packs: { builder: 2, recruit: 1 }, rng: 99, stats: { battles: 90, wins: 60, opened: 30 },
  speed: 1, sound: true, tutorial: { done: true, seen: SEEN, at: 0, tour: null }, at, lostAt: null,
  // Battles wait for a press, so that the pictures are of a still screen.
  auto: false,
});
const load = async (at, cleared = 40) => {
  await page.goto(base);
  await page.evaluate((s) => localStorage.setItem('legion-battles-save', JSON.stringify(s)), save(at, cleared));
  await page.reload();
  await page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(500);
};
const overlay = async (key) => {
  await page.evaluate((k) => window.game.scene.getScene('Main').open(k), key);
  await page.waitForFunction((k) => window.game.scene.isActive(k), key, { timeout: 10000 });
  await page.waitForTimeout(400);
};
const fight = async (name, waits) => {
  await page.evaluate(() => window.game.scene.getScene('Main').fight());
  let n = 0;
  for (const ms of waits) {
    await page.waitForTimeout(ms);
    await page.screenshot({ path: `${out}/${name}${waits.length > 1 ? `-${++n}` : ''}.png` });
  }
};

// The Palisade, the ninth stage of Thornwood: a lookout, a snare, and the player's own structures against them.
await load(8);
await page.screenshot({ path: `${out}/60-structures-ready.png` });
await fight('61-structures-battle', [2600, 3800, 6000]);

// Smugglers' Ford: the raiders' tent sends out its Cutpurses.
await load(7);
await fight('62-structures-tent', [9500, 3000, 3000, 3000]);

// The Jarl, with a longhouse and a rune before him.
await load(36);
await page.screenshot({ path: `${out}/63-structures-jarl.png` });

// UNITS and STRUCTURES are two buttons, and each opens the side screen on its own cards, with the player's half of the field beside it.
await load(8);
await mark('Main', 'units');
await page.waitForFunction(() => window.game.scene.isActive('Team'), null, { timeout: 10000 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/64-structures-units-page.png` });
await press('Team', 'CLOSE');
await page.waitForFunction(() => !window.game.scene.isActive('Team'), null, { timeout: 10000 });
await page.waitForTimeout(300);
await mark('Main', 'structures');
await page.waitForFunction(() => window.game.scene.isActive('Team'), null, { timeout: 10000 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/65-structures-page.png` });
const team = (data) => page.evaluate((d) => window.game.scene.getScene('Team').scene.restart(d), data);
await team({ side: 'structures', selected: `c${held.beartrap}` });
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/66-structures-trap-card.png` });
// The index has the two pages too.
await page.evaluate(() => { const t = window.game.scene.getScene('Team'); t.scene.stop(); t.game.events.emit('overlay-swap', 'Team', 'Index'); });
await page.waitForFunction(() => window.game.scene.isActive('Index'), null, { timeout: 10000 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/68-structures-index.png` });

await load(8);
await overlay('Shop');
await page.screenshot({ path: `${out}/67-structures-shop.png` });

if (errors.length) console.log(`errors:\n  ${errors.slice(0, 20).join('\n  ')}`);
else console.log('no errors');
await browser.close();
