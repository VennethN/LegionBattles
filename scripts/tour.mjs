// node scripts/tour.mjs [url]
//
// Puts a save that is well into the game in the browser's storage and takes
// the pictures docs/screens keeps of what a new player does not see yet: the
// drawn map of a world's stages, a full team with copies of a unit in
// it, cards combined into one, every pack on sale, a card turned over, and
// the two later bosses. It needs the dev server
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
// One card of each unit, and copies of a few: every card is its own, with its own grade and level.
const cards = [];
const card = (unit, grade, level) => { cards.push({ id: cards.length + 1, unit, grade, level, xp: 10 }); return cards.length; };
const first = {};
units.forEach((u, i) => { first[u] = card(u, i % 7, 6 + (i % 9)); });
for (const [grade, level] of [[0, 1], [0, 1], [1, 1], [0, 3], [2, 1], [1, 2]]) card('knight', grade, level);
for (const [grade, level] of [[4, 1], [1, 5], [0, 1]]) card('mage', grade, level);
const paladin2 = card('paladin', 5, 9);
card('paladin', 2, 1);
const fielded = (id, col, row) => ({ card: id, unit: cards[id - 1].unit, col, row });
const save = (at) => ({
  version: 4, coins: 23450, cards, nextCard: cards.length + 1, met: units,
  // Two Paladins side by side: a copy is fielded like any card.
  team: [fielded(first.paladin, 3, 1), fielded(paladin2, 3, 2), fielded(first.colossus, 2, 0), fielded(first.frostwitch, 1, 1), fielded(first.ballista, 0, 2), fielded(first.pyromancer, 1, 3), fielded(first.cleric, 0, 0)],
  // Into the fifth world: the first lap of the lands is behind, and the second is under way.
  cleared: 52,
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

await load(41);
await page.screenshot({ path: `${out}/10-main.png` });
// The stage's plate opens the map of its world. The arrows turn to the worlds on either side.
await page.mouse.click(640, 64);
await page.waitForFunction(() => window.game.scene.isActive('Map'), null, { timeout: 10000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/11-map.png` });
await page.mouse.click(1280 - 44, 400);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/11b-map-next-world.png` });
const shown = await page.evaluate(() => window.game.scene.getScene('Map').world.index);
if (shown !== 4) throw new Error(`the arrow did not turn to the fifth world: ${shown}`);
// Pressing a stage that is open goes to it: the first of this world.
const firstStage = await page.evaluate(() => window.game.scene.getScene('Map').world.first);
await page.mouse.click(150, 290);
await page.waitForFunction(() => !window.game.scene.isActive('Map'), null, { timeout: 10000 });
await page.waitForFunction(() => window.game.scene.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 30000 });
const went = await page.evaluate(() => JSON.parse(localStorage.getItem('legion-battles-save')).at);
if (went !== firstStage) throw new Error(`pressing a stage on the map went to ${went}, not ${firstStage}`);
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/11c-main-after-map.png` });
await overlay('Team');
await page.screenshot({ path: `${out}/12-team.png` });
// The best Knight is the fourth tile. COMBINE turns the screen into a forge for it:
// every other card is there, the least first, and any of them can be given up.
const cardsNow = () => page.evaluate(() => JSON.parse(localStorage.getItem('legion-battles-save')).cards);
const before = await cardsNow();
await page.mouse.click(96 + 3 * 140, 145);
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/12b-card-with-copies.png` });
await page.mouse.click(1158, 648);
await page.waitForFunction(() => window.game.scene.getScene('Team').forge > 0, null, { timeout: 10000 });
await page.waitForTimeout(300);
const target = await page.evaluate(() => window.game.scene.getScene('Team').forge);
await page.screenshot({ path: `${out}/12c-forge.png` });
// MARK THIS PAGE, then COMBINE, which asks once.
await page.mouse.click(1070, 502);
await page.waitForTimeout(200);
const marked = await page.evaluate(() => [...window.game.scene.getScene('Team').marked]);
await page.mouse.click(1070, 572);
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/12d-forge-sure.png` });
if ((await cardsNow()).length !== before.length) throw new Error('COMBINE did not ask before it gave the cards up');
await page.mouse.click(1070, 572);
await page.waitForFunction(() => window.game.scene.getScene('Team').forge === 0, null, { timeout: 10000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/12e-combined.png` });
const after = await cardsNow();
const was = before.find((c) => c.id === target);
const now = after.find((c) => c.id === target);
const kinds = new Set(before.filter((c) => marked.includes(c.id)).map((c) => c.unit));
if (marked.length < 10 || kinds.size < 2) throw new Error(`the page marked ${marked.length} cards of ${kinds.size} units: any card should be there`);
if (after.length !== before.length - marked.length || after.some((c) => marked.includes(c.id))) throw new Error('the marked cards were not given up');
if (!now || !was || now.grade !== was.grade || (now.level === was.level && now.xp <= was.xp)) throw new Error(`the card did not grow: ${JSON.stringify(now)}`);
const team = await page.evaluate(() => JSON.parse(localStorage.getItem('legion-battles-save')).team);
if (team.length !== 7 || team.some((p) => !after.some((c) => c.id === p.card))) throw new Error('a card of the team was given up');
// UNITS lists only cards held. INDEX, beside the count of them, is the page of every unit there is.
const tiles = await page.evaluate(() => window.game.scene.getScene('Team').tiles.map((t) => !!t.card));
if (tiles.length !== after.length || tiles.includes(false)) throw new Error('the screen of units shows something that is not a card held');
const index = await page.evaluate(() => {
  const sc = window.game.scene.getScene('Team');
  const b = sc.children.list.filter((o) => o.type === 'Container').find((c) => c.list.some((t) => t.text === 'INDEX'));
  return b ? { x: b.x, y: b.y } : null;
});
if (!index) throw new Error('no INDEX button on the screen of units');
await page.mouse.click(index.x, index.y);
await page.waitForFunction(() => window.game.scene.isActive('Index') && !window.game.scene.isActive('Team'), null, { timeout: 10000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/12f-index.png` });
// The Jarl has not been met: his tile is dark, and pressing it tells nothing.
await page.mouse.click(96 + 3 * 140, 145 + 3 * 140);
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/12g-index-unknown.png` });
// The index has a page for structures too: every one of them is there, and none is a unit.
await page.evaluate(() => {
  const sc = window.game.scene.getScene('Index');
  sc.registry.set('side', 'structures');
  sc.scene.restart();
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/12h-index-structures.png` });
await page.evaluate(() => {
  const sc = window.game.scene.getScene('Index');
  sc.registry.set('side', 'units');
  sc.scene.restart();
});
await page.waitForTimeout(400);
// MY CARDS, beside the tabs, goes back to the cards held.
const back = await page.evaluate(() => {
  const sc = window.game.scene.getScene('Index');
  const b = sc.children.list.filter((o) => o.type === 'Container').find((c) => c.list.some((t) => t.text === 'MY CARDS'));
  return b ? { x: b.x, y: b.y } : null;
});
if (!back) throw new Error('no MY CARDS button on the index');
await page.mouse.click(back.x, back.y);
await page.waitForFunction(() => window.game.scene.isActive('Team') && !window.game.scene.isActive('Index'), null, { timeout: 10000 });
await page.waitForTimeout(300);
await close('Team');
await overlay('Shop');
await page.screenshot({ path: `${out}/13-packs.png` });
// Every pack has a slot, laid out as the cards on the screen of units are. Pressing one brings it up on the right.
const slot = (col, row) => [96 + col * 140, 145 + row * 140];
const openOne = [884 + 186 - 88, 78 + 620 - 112];
const openMany = [884 + 186 + 88, 78 + 620 - 112];
const turned = () => page.waitForFunction(() => !window.game.scene.getScene('Shop').busy, null, { timeout: 30000 });
// A pack that is not sold yet says what opens it.
await page.mouse.click(...slot(3, 2));
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/13b-pack-not-sold.png` });
// The Royal Pack, the third along the top: open one, for the picture of a card being turned over.
await page.mouse.click(...slot(2, 0));
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/13c-pack-in-focus.png` });
await page.mouse.click(...openOne);
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/14a-press-to-open.png` });
await page.mouse.click(640, 360);
await page.waitForTimeout(600);
await turned();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/14-card.png` });
// DONE, then the Expert Thornwood Pack, of which three are held: all opened at one press.
const done = await page.evaluate(() => window.game.scene.getScene('Shop').doneRect);
await page.mouse.click(done.x + done.w / 2, done.y + done.h / 2);
await page.waitForTimeout(600);
await page.mouse.click(...slot(2, 1));
await page.waitForTimeout(300);
const opened = await page.evaluate(() => JSON.parse(localStorage.getItem('legion-battles-save')).stats.opened);
await page.mouse.click(...openMany);
await page.waitForTimeout(900);
await page.mouse.click(640, 360);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/14b-cards-dealt.png` });
await turned();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/14c-three-cards.png` });
const openedNow = await page.evaluate(() => JSON.parse(localStorage.getItem('legion-battles-save')).stats.opened);
if (openedNow !== opened + 3) throw new Error(`three packs were held and ${openedNow - opened} were opened at once`);

for (const [at, name] of [[21, 'colossus'], [36, 'jarl']]) {
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
