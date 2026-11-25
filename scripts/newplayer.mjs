// node scripts/newplayer.mjs [url]
//
// A new player, from an empty save. They land in their first battle, and
// the first tutorial has them do three things: call a skill when the hand
// taps on a unit, open the pack on the result, and put its card on a tile.
// This does each as a player would, by pressing where the hand points, and
// fails if a step does not come up, points at nothing or does not move on.
// Then it reloads in the middle of a second new player's tutorial, to see
// that it carries on from the save; lets battles run, calling a skill
// without being told to; and presses through whatever tour comes up
// between them, of which none is the rewards'.
//
// It needs the dev server running (npm run dev) or a served build, and
// Playwright. Pictures go to docs/screens.
//
//   SIZE=821x462 node scripts/newplayer.mjs    in a window of that size, as a portal's frame is
//   TOUCH=1 node scripts/newplayer.mjs         on a phone held sideways, with touches only

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.env.OUT ?? 'docs/screens';
fs.mkdirSync(out, { recursive: true });

const touch = process.env.TOUCH === '1';
const size = (process.env.SIZE ?? '').split('x').map(Number);
const sized = size.length === 2 && size.every((n) => n > 0);
const browser = await chromium.launch();
const context = touch
  ? await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })
  : await browser.newContext({ viewport: sized ? { width: size[0], height: size[1] } : { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const tag = touch ? 'phone-' : sized ? `${size[0]}-` : '';
const errors = [];
page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').split('\n').slice(0, 4).join('\n')}`));
const shot = (name) => page.screenshot({ path: `${out}/${tag}${name}.png` });
const fail = async (why) => {
  console.log(`FAILED: ${why}`);
  if (errors.length) console.log(`errors:\n  ${errors.join('\n  ')}`);
  await page.screenshot({ path: `${out}/failed.png` });
  await browser.close();
  process.exit(1);
};

const fresh = async () => {
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state !== 'loading', null, { timeout: 30000 });
};
await fresh();

// A press at a place on the game's own 1280 by 720 layout, wherever the canvas is on the page.
const box = await page.locator('canvas').boundingBox();
const k = box.width / 1280;
// And a place on the layout is not always where it is on the page: a menu is drawn in a window (view/app.ts).
const press = async (x0, y0) => {
  const { x, y } = await page.evaluate(([a, b]) => window.screenOf?.(a, b) ?? { x: a, y: b }, [x0, y0]);
  return touch ? page.touchscreen.tap(box.x + x * k, box.y + y * k) : page.mouse.click(box.x + x * k, box.y + y * k);
};

// What the tutorial shows now, on whichever screen is on top.
const guide = () => page.evaluate(() => {
  for (const key of ['Settings', 'Rewards', 'Hall', 'Player', 'Shop', 'Team', 'Map', 'Main']) {
    if (!window.game.scene.isActive(key)) continue;
    const g = window.game.scene.getScene(key).guide;
    if (g && g.step) return { scene: key, id: g.step.id, ok: !!g.step.ok, blocks: g.step.blocks, rect: g.rect, tour: g.step.tour ?? null };
    if (key !== 'Main') return { scene: key, id: null };
  }
  return null;
});
/** Presses what a step points at, or its own button if it has one. */
const answer = async (g) => {
  if (g.ok) {
    // GOT IT, or NEXT, is the gold button in the bubble: find it by asking the scene.
    const at = await page.evaluate((key) => {
      const sc = window.game.scene.getScene(key);
      const b = sc.guide.drawn.filter((o) => o.type === 'Container').pop();
      return b ? { x: b.x, y: b.y } : null;
    }, g.scene);
    if (!at) await fail(`no button to press on ${g.id}`);
    await press(at.x, at.y);
  } else {
    await press(g.rect.x + g.rect.w / 2, g.rect.y + g.rect.h / 2);
  }
};
const main = () => page.evaluate(() => {
  const m = window.game.scene.getScene('Main');
  const s = JSON.parse(localStorage.getItem('legion-battles-save') ?? '{}');
  const b = m.board.battle;
  return {
    state: m.state, at: m.at, done: s.tutorial?.done, seen: s.tutorial?.seen, battles: s.stats?.battles, opened: s.stats?.opened, cleared: s.cleared,
    team: (s.team ?? []).length, cards: (s.cards ?? []).length, calls: b ? b.calls.length : 0, time: b ? b.time : 0, pace: m.pace,
    menus: m.packsButton.root.visible,
  };
});
/** Waits for a step of the tutorial to be up, and gives it. */
const step = async (id, ms = 120000) => {
  await page.waitForFunction((want) => window.game.scene.getScene('Main').guide.step?.id === want, id, { timeout: ms }).catch(() => fail(`the tutorial never came to "${id}"`));
  return guide();
};

// 1. They land in a battle: no menu is on the screen, and it starts by itself in about a second.
let m = await main();
if (m.menus) await fail('a new player was shown the menus');
await shot('20-first-landing');
await page.waitForFunction(() => window.game.scene.getScene('Main').state === 'fighting', null, { timeout: 60000 }).catch(() => fail('the first battle did not start by itself'));

// 2. The first skill that can be called: the battle all but stops, and a hand taps on the unit.
let g = await step('tap');
await page.waitForTimeout(700);
m = await main();
if (m.pace > 0.1) await fail(`the battle did not slow for the hand: it runs at ${m.pace}`);
if (m.time > 5) await fail(`the first skill could be called only ${m.time.toFixed(1)} seconds in`);
const before = m.time;
await shot('21-tutorial-tap');
// Left alone it waits: the battle has all but stood still.
await page.waitForTimeout(1500);
m = await main();
if (m.time - before > 0.5) await fail('the battle went on without the player');
await answer(g);
await page.waitForFunction(() => window.game.scene.getScene('Main').board.battle?.calls.length > 0, null, { timeout: 10000 }).catch(() => fail('a press on the glowing unit called no skill'));
await page.waitForTimeout(350);
await shot('22-skill-called');
m = await main();
if (!m.seen?.includes('tap')) await fail('the first call was not kept');

// 3. On the result, the pack is opened where it lies, with one press.
g = await step('open', 240000);
await page.waitForTimeout(500);
await shot('23-tutorial-open');
await answer(g);
await page.waitForFunction(() => window.game.scene.getScene('Main').welcome.busy, null, { timeout: 10000 }).catch(() => fail('a press on the pack did not open it'));
await page.waitForFunction(() => JSON.parse(localStorage.getItem('legion-battles-save')).stats.opened === 1, null, { timeout: 20000 });
await page.waitForTimeout(1400);
await shot('24-first-card');

// 4. The card is put on the field by the player: a press on a lit tile.
g = await step('place');
await page.waitForTimeout(500);
await shot('25-tutorial-place');
m = await main();
if (m.team !== 4) await fail(`the new card walked into the team by itself: ${m.team} stand`);
await answer(g);
await page.waitForFunction(() => JSON.parse(localStorage.getItem('legion-battles-save')).tutorial.done, null, { timeout: 10000 }).catch(() => fail('a press on the lit tile did not place the card'));
await page.waitForTimeout(600);
m = await main();
if (m.team !== 5) await fail(`the card is not on the field: ${m.team} stand`);
if (!m.menus) await fail('the menus did not come when the tutorial ended');
await shot('26-tutorial-over');
const walked = m.seen;

// 5. A second new player leaves in the middle and comes back: the tutorial carries on from the save.
await fresh();
g = await step('tap');
await answer(g);
g = await step('open', 240000);
await page.reload();
await page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 30000 });
g = await step('open', 20000);
await page.waitForTimeout(400);
await shot('27-back-to-a-pack');
await answer(g);
await page.waitForFunction(() => JSON.parse(localStorage.getItem('legion-battles-save')).stats.opened === 1, null, { timeout: 20000 });
await page.reload();
await page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 30000 });
g = await step('place', 20000);
await page.waitForTimeout(400);
await shot('28-back-to-a-card');
// This one drags the card to a tile of their own choosing, the back corner, where the first pressed the one pointed at.
const card = await page.evaluate(() => {
  const w = window.game.scene.getScene('Main').welcome;
  const c = w.held.find((o) => o.type === 'Container');
  const b = window.game.scene.getScene('Main').board;
  const r = b.tileRect(0, 3);
  return { x: c.x, y: c.y, tx: r.x + r.w / 2, ty: r.y + r.h / 2 };
});
if (touch) {
  // A touch that goes down on the card, moves, and is let go over the tile.
  const cdp = await context.newCDPSession(page);
  const at = (x, y) => [{ x: box.x + x * k, y: box.y + y * k }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(card.x, card.y) });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(card.x + ((card.tx - card.x) * i) / 8, card.y + ((card.ty - card.y) * i) / 8) });
    await page.waitForTimeout(60);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
} else {
  await page.mouse.move(box.x + card.x * k, box.y + card.y * k);
  await page.mouse.down();
  await page.mouse.move(box.x + card.tx * k, box.y + card.ty * k, { steps: 10 });
  await page.waitForTimeout(250);
  await page.mouse.up();
}
await page.waitForFunction(() => JSON.parse(localStorage.getItem('legion-battles-save')).tutorial.done, null, { timeout: 10000 }).catch(() => fail('dragging the card to a tile did not place it'));
const where = await page.evaluate(() => JSON.parse(localStorage.getItem('legion-battles-save')).team.slice(-1)[0]);
if (where.col !== 0 || where.row !== 3) await fail(`the card was dragged to the back corner and stands at ${where.col},${where.row}`);

// 6. Battles go on by themselves, and a win moves on. A skill is called once without being told to. A tour
// may come up between two battles (the packs, as they hold two): it is pressed through, and the battles go on.
m = await main();
const stageBefore = m.at;
const from = m.battles;
const tours = [];
let stuck = 0;
let called = false;
for (let i = 0; i < 1200; i++) {
  m = await main();
  if ((m.battles ?? 0) >= from + 3) break;
  g = await guide();
  if (g && g.id) {
    if (tours[tours.length - 1] !== g.id) {
      tours.push(g.id);
      stuck = 0;
    } else if (++stuck > 30) await fail(`the tour stayed at ${g.id}`);
    await answer(g);
    await page.waitForTimeout(500);
  } else if (g && g.scene !== 'Main') {
    // A tour that ends on the screen it led into leaves it open: shut it. The screen of cards has its CLOSE at its own edge.
    if (g.scene === 'Team') await press(724 - 62, 37);
    else await press(1280 - 262, 37);
    await page.waitForTimeout(400);
  } else if (m.state === 'fighting' && !called) {
    // A unit that glows, with no hand but the small one over it: a press on it calls its skill.
    const at = await page.evaluate(() => window.game.scene.getScene('Main').board.callableRect());
    if (at) {
      await shot('29-callable');
      const had = m.calls;
      await press(at.x + at.w / 2, at.y + at.h / 2);
      await page.waitForTimeout(300);
      m = await main();
      if (m.calls <= had) await fail('a press on a unit that could be called did nothing');
      called = true;
      await shot('30-called');
    } else await page.waitForTimeout(150);
  } else await page.waitForTimeout(300);
  if (i === 1199) await fail('battles did not go on by themselves');
}
if (!called) await fail('no skill could be called in three battles');
if (tours.some((id) => id.startsWith('rewards'))) await fail('a tour spoke of the rewards');
m = await main();
await shot('31-running');
console.log(JSON.stringify({ walked, tours, stageBefore, now: m }));
if (errors.length) await fail('the page threw');
await browser.close();
