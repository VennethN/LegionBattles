// npm run smoke
//
// With `npm run dev` running: plays the game through its own interface, as
// a player would, with the keys and the mouse on a portal's frame and then
// by touch on a phone, and fails if a press does not do what it says. It
// finds a button by the words on it, so moving one does not break this, and
// a new button needs words.
//
// Time is stepped by this script: the headless browser draws too few
// frames a second for real time to mean anything.

import { chromium, open, type Context, type Page } from './browser';
import { arena, find, words } from './drive';

const base = process.env.URL ?? 'http://127.0.0.1:5175/';
let checks = 0;
const failures: string[] = [];

function check(what: string, ok: boolean): void {
  checks++;
  if (!ok) failures.push(what);
}

interface Win {
  game: Phaser.Game;
  view: { zoom: number; density: number; w: number; h: number; tall: boolean };
  run(): { hero: string; wave: number; gold: number; phase: string; weapons: unknown[]; items: unknown[]; rerolls: number; offers: Array<{ kind: string; locked: boolean; sold: boolean }>; pending: number; packs: number; roads: Array<{ omen: string }>; relics: string[] } | null;
  world(): { time: number; over: string | null; hero: { x: number; y: number; hp: number }; foes: Array<{ x: number; y: number }>; picks: Array<{ x: number; y: number }>; wave: { n: number } } | null;
  save(): { runs: number; run: unknown; best: Record<string, number> };
}

const tick = async (page: Page, frames: number): Promise<void> => {
  for (let i = 0; i < frames; i++) await page.clock.runFor(1000 / 60);
};

const active = (page: Page, key: string): Promise<boolean> => page.evaluate((k) => !!(window as unknown as Win).game?.scene?.isActive(k), key);

async function until(page: Page, key: string, most = 600): Promise<boolean> {
  for (let i = 0; i < most; i++) {
    if (await active(page, key)) return true;
    await page.clock.runFor(50);
    await new Promise((r) => setTimeout(r, 10));
  }
  return false;
}

type Press = (x: number, y: number) => Promise<void>;

async function press(page: Page, tap: Press, key: string, text: string): Promise<boolean> {
  const at = await find(page, key, text);
  if (!at) return false;
  await tap(at.x, at.y);
  await tick(page, 8);
  return true;
}

/** Steers with the keys for some frames: away from whoever is near, toward what lies about. */
async function fight(page: Page, frames: number): Promise<void> {
  let held: string[] = [];
  for (let f = 0; f < frames; f++) {
    if (f % 6 === 0) {
      const keys = await page.evaluate(() => {
        const world = (window as unknown as Win).world();
        if (!world || world.over) return [] as string[];
        let x = 0;
        let y = 0;
        for (const foe of world.foes) {
          const dx = world.hero.x - foe.x;
          const dy = world.hero.y - foe.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 120) {
            x += dx / d;
            y += dy / d;
          }
        }
        const k: string[] = [];
        if (x > 0.2) k.push('ArrowRight');
        if (x < -0.2) k.push('ArrowLeft');
        if (y > 0.2) k.push('ArrowDown');
        if (y < -0.2) k.push('ArrowUp');
        return k;
      });
      for (const k of held) if (!keys.includes(k)) await page.keyboard.up(k);
      for (const k of keys) if (!held.includes(k)) await page.keyboard.down(k);
      held = keys;
    }
    await page.clock.runFor(1000 / 60);
    if (f % 30 === 0 && (await page.evaluate(() => !!(window as unknown as Win).world()?.over))) break;
  }
  for (const k of held) await page.keyboard.up(k);
}

const world = (page: Page): Promise<{ time: number; x: number; y: number; hp: number; over: string | null; wave: number } | null> =>
  page.evaluate(() => {
    const w = (window as unknown as Win).world();
    return w ? { time: w.time, x: w.hero.x, y: w.hero.y, hp: w.hero.hp, over: w.over, wave: w.wave.n } : null;
  });

const run = (page: Page): Promise<ReturnType<Win['run']>> => page.evaluate(() => JSON.parse(JSON.stringify((window as unknown as Win).run())) as ReturnType<Win['run']>);

async function fall(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = (window as unknown as Win).world() as unknown as { hero: { hp: number }; over: string };
    w.hero.hp = 0;
    w.over = 'dead';
  });
}

async function play(label: string, { context, page }: { context: Context; page: Page }, touch: boolean): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const cdp = await context.newCDPSession(page);
  const tap: Press = touch ? (x, y) => page.touchscreen.tap(x, y) : (x, y) => page.mouse.click(x, y);
  const size = page.viewportSize() as { width: number; height: number };
  const ok = (what: string, good: boolean): void => check(`${label}: ${what}`, good);

  await page.clock.install();
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.clock.pauseAt(Date.now() + 1000);

  // Someone who has never played is in the field at once.
  ok('a new player lands in the field', await until(page, 'Hud'));
  ok('as the first hero, on the first wave', (await run(page))?.hero === 'bram' && (await world(page))?.wave === 1);

  // Steering: the keys, then a drag.
  let before = await world(page);
  if (!touch) {
    await page.keyboard.down('KeyD');
    await tick(page, 30);
    await page.keyboard.up('KeyD');
    let after = await world(page);
    ok('the D key runs the hero to the right', !!before && !!after && after.x > before.x + 40);
    before = after;
    await page.mouse.move(size.width * 0.5, size.height * 0.6);
    await page.mouse.down();
    await page.mouse.move(size.width * 0.5, size.height * 0.6 - 80);
    await tick(page, 30);
    await page.mouse.up();
    after = await world(page);
    ok('the mouse held and dragged up runs the hero up', !!before && !!after && after.y < before.y - 40);
  } else {
    const point = (x: number, y: number): object => ({ touchPoints: [{ x, y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', ...point(size.width * 0.3, size.height * 0.6) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', ...point(size.width * 0.3 + 90, size.height * 0.6) });
    await tick(page, 30);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const after = await world(page);
    ok('a finger dragged right runs the hero to the right', !!before && !!after && after.x > before.x + 40);
    await tick(page, 20);
    const still = await world(page);
    await tick(page, 20);
    const later = await world(page);
    ok('and the hero stops when it is lifted', !!still && !!later && Math.abs(later.x - still.x) < 1);
  }

  // The move: when it is full, the space bar lets it loose, or its button under a thumb.
  const fury = (): Promise<number> => page.evaluate(() => ((window as unknown as Win).world() as unknown as { fury: number }).fury);
  await page.evaluate(() => {
    const w = (window as unknown as Win).world() as unknown as { fury: number; auto: boolean };
    w.fury = 1;
    w.auto = false;
  });
  await tick(page, 4);
  ok('a full move waits to be asked for', (await fury()) === 1);
  if (!touch) await page.keyboard.press('Space');
  else ok('the move has a button', await press(page, tap, 'Hud', 'SHIELD RUSH'));
  await tick(page, 6);
  ok('the move is let loose when it is asked for', (await fury()) < 1);

  // Pause holds the wave still.
  if (!touch) await page.keyboard.press('KeyP');
  else await tap(size.width - 30, 24);
  await tick(page, 10);
  const held = await world(page);
  await tick(page, 40);
  ok('pause holds the wave still', (await world(page))?.time === held?.time);
  ok('RESUME is there', await press(page, tap, 'Hud', 'RESUME'));
  await tick(page, 20);
  ok('and the wave goes on', ((await world(page))?.time ?? 0) > (held?.time ?? 0));

  // The first wave, to its end. Coins are put in the hero's purse so that the camp can be tried.
  await page.evaluate(() => {
    const r = (window as unknown as Win).run();
    if (r) r.gold = 900;
  });
  await fight(page, 60 * 24);
  ok('the first wave ends in the camp', await until(page, 'Camp'));
  await tick(page, 20);
  for (let i = 0; i < 5 && (await run(page))?.phase === 'level'; i++) {
    // A level's choice: the first card says how much of what.
    await tap(size.width * (size.height > size.width ? 0.28 : 0.2), size.height * (size.height > size.width ? 0.2 : 0.55));
    await tick(page, 10);
  }
  let r = await run(page);
  ok('a level is chosen and the wares come up', r?.phase === 'camp');
  const hands = r?.weapons.length ?? 0;
  ok('BUY buys', (await press(page, tap, 'Camp', 'BUY')) && ((await run(page))?.weapons.length ?? 0) + ((await run(page))?.items.length ?? 0) > hands);
  ok('OTHER WARES shows others', (await press(page, tap, 'Camp', 'OTHER WARES')) && (await run(page))?.rerolls === 1);
  r = await run(page);
  ok('the next wave is on its button', await press(page, tap, 'Camp', `WAVE ${r?.wave}`));
  // Out of the camp the roads are laid out, and the one taken is the wave that is fought.
  ok('the roads to it are laid out', (await until(page, 'Road')) && (await run(page))?.phase === 'road' && (await run(page))?.roads.length === 2);
  await tick(page, 10);
  const first = (await run(page))?.roads[0].omen;
  ok('TAKE IT takes a road', await press(page, tap, 'Road', 'TAKE IT'));
  ok('and the wave begins by it', (await until(page, 'Hud')) && (await world(page))?.wave === 2 && (await page.evaluate(() => ((window as unknown as Win).world() as unknown as { omen: string }).omen)) === first);

  // A fall, and the ways on from it.
  await tick(page, 30);
  await fall(page);
  ok('a fall ends the run on the result', await until(page, 'Result'));
  await tick(page, 30);
  ok('AGAIN starts another with the same hero', (await press(page, tap, 'Result', 'AGAIN')) && (await until(page, 'Hud')) && (await world(page))?.wave === 1 && (await run(page))?.hero === 'bram');
  await tick(page, 30);
  await fall(page);
  await until(page, 'Result');
  await tick(page, 30);
  ok('HEROES goes to the list', (await press(page, tap, 'Result', 'HEROES')) && (await until(page, 'Title')));
  await tick(page, 10);
  // The first run has ended, so Biscuit has been met and comes along; a press on his place sends him home again.
  ok('a companion goes along after the first run', (await find(page, 'Title', 'WITH BISCUIT')) !== null);
  ok('and can be left at home', (await press(page, tap, 'Title', 'WITH BISCUIT')) && (await find(page, 'Title', 'WITH NOBODY')) !== null);
  ok('and taken along again', (await press(page, tap, 'Title', 'WITH NOBODY')) && (await find(page, 'Title', 'WITH BISCUIT')) !== null);
  // The Hold: the run that ended paid renown, a tab shows another part of it, and renown buys what is sold there.
  const hold = (): Promise<{ renown: number; places: number; tally: unknown }> => page.evaluate(() => (window as unknown as Win).save() as unknown as { renown: number; places: number; tally: unknown });
  ok('the run that ended paid renown', (await hold()).renown > 0 && (await hold()).tally !== null);
  ok('THE HOLD opens the Hold', (await press(page, tap, 'Title', 'THE HOLD')) && (await until(page, 'Hold')));
  await tick(page, 10);
  ok('with its renown said', (await words(page, 'Hold', 'RENOWN')) !== null);
  ok('KENNELS shows the band', (await press(page, tap, 'Hold', 'KENNELS')) && (await words(page, 'Hold', 'Places in the band')) !== null);
  await page.evaluate(() => {
    const w = window as unknown as Win;
    (w.save() as unknown as { renown: number }).renown = 500;
    w.game.scene.getScene('Hold').scene.restart({ tab: 'KENNELS' });
  });
  await tick(page, 10);
  ok('BUY buys the second place', (await press(page, tap, 'Hold', 'BUY')) && (await hold()).places === 2 && (await hold()).renown < 500);
  ok('VOWS says what opens them', (await press(page, tap, 'Hold', 'VOWS')) && (await words(page, 'Hold', 'Win the twentieth wave')) !== null);
  ok('DAILY shows the day\'s road', (await press(page, tap, 'Hold', 'DAILY')) && (await words(page, 'Hold', 'The road of')) !== null && (await find(page, 'Hold', 'SET OUT')) !== null);
  ok('BACK goes back to the list', (await press(page, tap, 'Hold', 'BACK')) && (await until(page, 'Title')));
  await tick(page, 10);
  ok('Wren can be chosen', await press(page, tap, 'Title', 'Wren'));
  ok('PLAY begins as them', (await press(page, tap, 'Title', 'PLAY')) && (await until(page, 'Hud')) && (await run(page))?.hero === 'wren');
  ok('with the companion on the field', (await page.evaluate(() => ((window as unknown as Win).world() as unknown as { band: Array<{ def: { id: string } }> }).band.map((a) => a.def.id).join())) === 'biscuit');

  // A run left in its camp is there after the page is shut.
  await fight(page, 60 * 24);
  await until(page, 'Camp');
  await tick(page, 10);
  const left = await run(page);
  await page.reload();
  await page.clock.pauseAt(Date.now() + 1000);
  ok('after a reload the list comes up, not a new run', await until(page, 'Title'));
  ok('with the run to carry on', (await press(page, tap, 'Title', 'CARRY ON')) && (await until(page, 'Camp')) && (await run(page))?.gold === left?.gold && (await run(page))?.wave === left?.wave);

  // A relic won: one of three is taken, and then the camp is there.
  await arena(page, { hero: 'bram', wave: 8, level: 6, gold: 50, phase: 'relic', relicsDue: 1, relicChoices: ['bellows', 'stormglass', 'oldmap'], offers: [] }, { camp: true });
  ok('a relic to choose comes up', await until(page, 'Road'));
  await tick(page, 10);
  ok('TAKE takes one', (await press(page, tap, 'Road', 'TAKE')) && (await run(page))?.relics.length === 1);
  ok('and the camp follows', (await until(page, 'Camp')) && (await run(page))?.phase === 'camp');
  await tick(page, 10);
  ok('the relic is shown in the camp', (await words(page, 'Camp', 'RELICS')) !== null);
  // The kinds of weapon held say what they give when pressed.
  const blade = await words(page, 'Camp', 'Blade');
  ok('the kinds held are listed', blade !== null);
  if (blade) {
    await tap(blade.x, blade.y);
    await tick(page, 10);
    ok('and pressed, say what they give', (await words(page, 'Camp', 'KINDS OF WEAPON')) !== null && (await press(page, tap, 'Camp', 'CLOSE')));
  }

  for (const e of [...new Set(errors)]) failures.push(`${label}: the page said: ${e}`);
  await page.evaluate(() => 0);
}

const browser = await chromium.launch();
await play('frame', await open(browser, { viewport: { width: 907, height: 510 }, deviceScaleFactor: 1 }), false);
await play('phone', await open(browser, { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }), true);
await browser.close();
if (failures.length > 0) {
  console.error(`smoke: ${failures.length} of ${checks} checks failed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`smoke: ${checks} checks pass, with keys and mouse on a portal's frame and by touch on a phone`);
