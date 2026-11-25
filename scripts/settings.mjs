// node scripts/settings.mjs [url]
//
// Presses everything on the settings screen and checks that each press does
// what it says and is kept: the volumes (the buttons to either side and a
// pip), sound off and on, the three ways of drawing, screen shake, and
// START OVER, which must ask first and must keep the settings. It needs the
// dev server running (npm run dev) or a served build, and Playwright. One
// picture goes to docs/screens: starting over, being asked.

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.env.OUT ?? 'docs/screens';
fs.mkdirSync(out, { recursive: true });
// Every tour is behind this player, so that none comes up over what is being pressed.
const SEEN = ['tour:basics', 'tour:rewards', 'tour:packs', 'tour:dungeons', 'tour:raids', 'tour:skills', 'tour:upgrades', 'tour:structures', 'tour:team'];
const browser = await chromium.launch();
// A dense screen, so that SHARP and FAST draw at different sizes.
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
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
const expect = async (what, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) await fail(`${what}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
};

const cards = [];
for (const [u, g, l] of [['knight', 3, 8], ['paladin', 3, 8], ['archer', 3, 8], ['mage', 3, 8], ['cleric', 3, 8]]) cards.push({ id: cards.length + 1, unit: u, grade: g, level: l, xp: 0 });
const team = cards.map((c, i) => ({ card: c.id, unit: c.unit, col: 3 - (i % 2), row: i % 4 }));
const save = {
  version: 4, coins: 900, cards, nextCard: 99, met: cards.map((c) => c.unit), team, cleared: 12, ahead: {},
  packs: { thornwood: 2 }, rng: 5, stats: { battles: 30, wins: 20, opened: 9 }, speed: 1, sound: true,
  tutorial: { done: true, seen: SEEN, at: 0, tour: null }, at: 12, lostAt: null, auto: false,
  player: { level: 6, xp: 0 }, tree: { command: 1 }, upgrades: { whetstones: 2 },
};
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('legion-battles-save') ?? '{}'));
const canvas = () => page.evaluate(() => [window.game.canvas.width, window.game.canvas.height]);
const ready = () => page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 60000 });
const press = async (x, y) => {
  await click(x, y);
  await page.waitForTimeout(250);
};

await page.goto(base);
await page.evaluate((v) => localStorage.setItem('legion-battles-save', JSON.stringify(v)), save);
await page.reload();
await ready();
await press(1168, 664);
await page.waitForFunction(() => window.game.scene.isActive('Settings'), null, { timeout: 10000 });
await page.waitForTimeout(300);

// The volumes. Music starts at 5 and effects at 8: less twice, more once, then the third pip and the last.
const lessX = 260;
const pipX = (i) => 300 + i * 24 + 9;
const moreX = 300 + 10 * 24 + 34;
const musicY = 84 + 126 + 96;
const effectsY = musicY + 84;
await press(lessX, musicY);
await press(lessX, musicY);
await expect('music after less twice', (await stored()).settings.music, 3);
await press(moreX, musicY);
await expect('music after more', (await stored()).settings.music, 4);
await press(pipX(2), effectsY);
await expect('effects after its third pip', (await stored()).settings.effects, 3);
await press(pipX(9), effectsY);
await expect('effects after its last pip', (await stored()).settings.effects, 10);
// What the mix was told: the volumes as shares, on the game's own voice.
const mix = await page.evaluate(() => ({ effects: window.sfx.effectsVolume, music: window.sfx.musicVolume, on: window.sfx.enabled }));
await expect('the mix', mix, { effects: 1, music: 0.4, on: true });
for (let i = 0; i < 6; i++) await press(lessX, musicY);
await expect('music cannot go under nothing', (await stored()).settings.music, 0);
await press(moreX, musicY);

// Sound off, and on again: the volumes are kept.
const toggleX = 40 + 590 - 105;
await press(toggleX, 84 + 126);
await expect('sound off', [(await stored()).sound, await page.evaluate(() => window.sfx.enabled)], [false, false]);
await expect('the volumes while it is off', [(await stored()).settings.music, (await stored()).settings.effects], [1, 10]);
await press(toggleX, 84 + 126);
await expect('sound on', [(await stored()).sound, await page.evaluate(() => window.sfx.enabled)], [true, true]);

// How the game is drawn: AUTO, then SHARP, then FAST, then AUTO again.
const gameX = 650 + 590 - 105;
const at2x = await canvas();
await press(gameX, 84 + 126);
await expect('graphics after one press', (await stored()).settings.graphics, 'sharp');
await expect('the canvas when SHARP on a dense screen', await canvas(), [2560, 1440]);
await press(gameX, 84 + 126);
await expect('graphics after two', (await stored()).settings.graphics, 'fast');
await expect('the canvas when FAST', await canvas(), [1280, 720]);
await press(gameX, 84 + 126);
await expect('graphics after three', (await stored()).settings.graphics, 'auto');
await expect('the canvas when AUTO again', await canvas(), at2x);

// Screen shake off.
await press(gameX, 84 + 126 + 96);
await expect('shake off', (await stored()).settings.shake, false);

// A reload keeps all of it, and FAST is drawn small from the first frame.
await press(gameX, 84 + 126);
await press(gameX, 84 + 126);
await expect('graphics set to FAST', (await stored()).settings.graphics, 'fast');
await page.reload();
await ready();
await expect('the canvas after a reload on FAST', await canvas(), [1280, 720]);
const kept = (await stored()).settings;
await expect('the settings after a reload', kept, { music: 1, effects: 10, shake: false, graphics: 'fast' });

// START OVER asks first. KEEP PLAYING changes nothing.
await press(1168, 664);
await page.waitForFunction(() => window.game.scene.isActive('Settings'), null, { timeout: 10000 });
await page.waitForTimeout(300);
const overX = 650 + 590 - 125;
const overY = 84 + 126 + 96 * 3;
await press(overX, overY);
await page.waitForTimeout(200);
// At the layout's own size, as every other picture is, though this screen is a dense one.
await page.screenshot({ path: `${out}/92b-start-over.png`, scale: 'css' });
await press(640 - 140, 360 + 88);
await expect('coins after KEEP PLAYING', (await stored()).coins, 900);
// And START OVER, pressed twice, wipes everything but the settings.
await press(overX, overY);
await press(640 + 140, 360 + 88);
await ready();
const fresh = await stored();
await expect('after starting over', { coins: fresh.coins, cleared: fresh.cleared, cards: fresh.cards.length, done: fresh.tutorial.done, level: fresh.player.level, tree: fresh.tree, claimed: fresh.rewards.claimed },
  { coins: 40, cleared: 0, cards: 4, done: false, level: 1, tree: {}, claimed: 0 });
await expect('the settings after starting over', fresh.settings, kept);
// The first tutorial runs again, for whoever is new: they land in a battle, with no menu on the screen.
const menus = await page.evaluate(() => window.game.scene.getScene('Main').packsButton.root.visible);
await expect('the menus after starting over', menus, false);
if (errors.length) await fail('the page threw');
console.log('no errors');
await browser.close();
