// node scripts/tour.mjs [url]
//
// Puts a save that is well into the game in the browser's storage and takes
// the pictures docs/screens keeps of the menus and the later worlds: the
// map, the team, the packs, a card turned over, and the two bosses. It needs
// the dev server running (npm run dev) or a served build, and Playwright.
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
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack ?? '').split('\n').slice(0, 5).join('\n')));
const units = ['militia','archer','knight','cleric','berserker','mage','paladin','cutpurse','poacher','bruiser','hexer','warlord','lancer','javelineer','ballista','pyromancer','colossus','huscarl','harpooner','icegolem','frostwitch'];
const cards = {};
units.forEach((u, i) => { cards[u] = { grade: i % 7, level: 4 + (i % 9), xp: 10 }; });
const save = {
  version: 1, coins: 2345, cards,
  team: [{ unit: 'paladin', col: 3, row: 1 }, { unit: 'huscarl', col: 3, row: 2 }, { unit: 'colossus', col: 2, row: 0 }, { unit: 'frostwitch', col: 1, row: 1 }, { unit: 'ballista', col: 0, row: 2 }, { unit: 'pyromancer', col: 1, row: 3 }, { unit: 'cleric', col: 0, row: 0 }],
  cleared: { thornwood: 10, sunscar: 12, frostholt: 14 }, packs: { recruit: 1, royal: 2, frost: 1 }, rng: 99, stats: { battles: 200, wins: 150, opened: 80 }, speed: 2, sound: true,
};
await page.goto(base);
await page.evaluate((s) => localStorage.setItem('legion-battles-save', JSON.stringify(s)), save);
await page.reload();
const scene = (name) => page.waitForFunction((n) => window.game?.scene?.isActive(n), name, { timeout: 20000 });
await scene('Home');
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/10-map-frostholt.png` });
await page.evaluate(() => window.game.scene.getScene('Home').scene.restart({ world: 1 }));
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/11-map-dunes.png` });
await page.evaluate(() => window.game.scene.getScene('Home').scene.start('Team'));
await scene('Team');
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/12-team.png` });
await page.evaluate(() => window.game.scene.getScene('Team').scene.start('Shop'));
await scene('Shop');
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/13-packs.png` });
// Open a Royal Pack, for the picture of a card being turned over.
await page.mouse.click(640 + 2 * 244, 350 + 148);
await page.waitForTimeout(900);
await page.mouse.click(640, 360);
await page.waitForFunction(() => { const sc = window.game.scene.getScene('Shop'); return !sc.busy && sc.show.length > 6; }, null, { timeout: 30000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/14-card.png` });
for (const [w, st, name] of [[1, 11, 'colossus'], [2, 14, 'jarl']]) {
  await page.evaluate(([w, st]) => window.game.scene.getScenes(true)[0].scene.start('Battle', { world: w, stage: st }), [w, st]);
  await scene('Battle');
  await page.waitForFunction(() => window.game.scene.getScene('Battle').phase === 'placement', null, { timeout: 20000 }).catch(async () => { console.log('STUCK', JSON.stringify(await page.evaluate(() => { const b = window.game.scene.getScene('Battle'); return { phase: b.phase, team: b.team.length, enemies: b.enemies.length, loading: b.load.isLoading(), total: b.load.totalToLoad, failed: b.load.totalFailed }; })), errors.join('\n')); process.exit(1); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/15-${name}-placement.png` });
  await page.mouse.click(640, 662);
  await page.waitForTimeout(3200);
  await page.screenshot({ path: `${out}/16-${name}-battle.png` });
  await page.waitForFunction(() => window.game.scene.getScene('Battle').phase === 'result', null, { timeout: 180000 });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}/17-${name}-result.png` });
}
if (errors.length) console.log('ERRORS:\n' + errors.slice(0, 8).join('\n'));
else console.log('no errors');
await browser.close();
