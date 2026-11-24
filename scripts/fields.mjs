// node scripts/fields.mjs [url]
//
// Takes the pictures docs/screens keeps of the three fields and of the
// summoners: a stage on the first field with a Ringleader on it, one on the
// second with a team that was set out for the first, and one on the third
// with a team spread over it. It needs the dev server running (npm run dev)
// or a served build, and Playwright.

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
const errors = [];
page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').split('\n').slice(0, 5).join('\n')}`));

const cards = [];
const card = (unit, grade, level) => { cards.push({ id: cards.length + 1, unit, grade, level, xp: 0 }); return cards.length; };
const held = {};
for (const [u, g, l] of [
  ['knight', 4, 9], ['paladin', 4, 9], ['archer', 4, 9], ['mage', 4, 9], ['cleric', 4, 9], ['militia', 4, 9], ['berserker', 4, 9], ['herald', 3, 6],
  ['watchtower', 3, 6], ['barracks', 3, 6], ['spiketrap', 3, 6],
]) held[u] = card(u, g, l);
const f = (unit, col, row) => ({ card: held[unit], unit, col, row });
const save = (at, team) => ({
  version: 4, coins: 100, cards, nextCard: cards.length + 1, met: Object.keys(held), team,
  cleared: 60, packs: {}, rng: 5, stats: { battles: 9, wins: 6, opened: 3 }, speed: 1, sound: true,
  tutorial: { done: true, seen: SEEN, at: 0, tour: null }, at, lostAt: null, auto: false,
});
// A team as it is written on the first field: column 3 is the front, row 0 the top.
const compact = [
  f('knight', 3, 1), f('paladin', 3, 2), f('berserker', 3, 0), f('militia', 3, 3), f('archer', 1, 1), f('mage', 1, 2), f('cleric', 0, 1), f('herald', 0, 2),
  f('spiketrap', 2, 0), f('watchtower', 1, 0), f('barracks', 0, 3),
];
// And one set out on the biggest field: some stand where the first field has no tile (column -2, rows -1 and 4).
const wide = [
  f('knight', 3, 1), f('paladin', 3, 2), f('berserker', 3, -1), f('militia', 3, 4), f('archer', 0, 0), f('mage', 0, 3), f('cleric', -1, 1), f('herald', -2, 2),
  f('spiketrap', 2, 4), f('watchtower', 1, -1), f('barracks', -2, 4),
];
const load = async (at, team) => {
  await page.goto(base);
  await page.evaluate((s) => localStorage.setItem('legion-battles-save', JSON.stringify(s)), save(at, team));
  await page.reload();
  await page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(700);
};
const shots = async (name, waits) => {
  await page.screenshot({ path: `${out}/${name}-ready.png` });
  await page.evaluate(() => window.game.scene.getScene('Main').fight());
  let n = 0;
  for (const ms of waits) {
    await page.waitForTimeout(ms);
    await page.screenshot({ path: `${out}/${name}-battle${waits.length > 1 ? `-${++n}` : ''}.png` });
  }
};
// Bramble Maze, the sixth stage: the first field, 8 by 4, a Ringleader at the enemy's back and the player's Herald at theirs.
await load(5, compact);
await shots('70-field-8x4', [9500]);
// Glass Dunes, the seventeenth: the second field, 10 by 5, with a War Drummer.
await load(16, compact);
await shots('71-field-10x5', [4000]);
// Thornwood II, the forty-fifth: the third field, 12 by 6.
await load(44, wide);
await shots('72-field-12x6', [4000]);
// The same team on the first field again: whoever stood beyond it has come in to the nearest free tile.
await load(5, wide);
await page.screenshot({ path: `${out}/73-field-team-brought-in.png` });

console.log(errors.length ? `errors:\n  ${errors.join('\n  ')}` : 'no errors');
await browser.close();
