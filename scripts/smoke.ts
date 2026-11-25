// npm run smoke
//
// With `npm run dev` running: plays the game through its own interface, as
// a player would, with the keys and the mouse on a portal's frame and then
// by touch on a phone, and fails if a press does not do what it says. It
// finds a button by the words on it, so moving one does not break this, and
// a new button needs words.
//
// The hunt itself is played by pressing the keys the bot would press
// (scripts/drive.ts): what is tried is the game's own input, end to end.
//
// Time is stepped by this script: the headless browser draws too few
// frames a second for real time to mean anything.

import { chromium, open, type Context, type Page } from './browser';
import { find, playKeys, tick, until, type Win } from './drive';

const base = process.env.URL ?? 'http://127.0.0.1:5180/';
let checks = 0;
const failures: string[] = [];

function check(what: string, ok: boolean): void {
  checks++;
  if (!ok) failures.push(what);
  // SMOKE_SAY=1 says each check as it is made: where a run stops is then known.
  if (process.env.SMOKE_SAY) console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
}

type Press = (x: number, y: number) => Promise<void>;

async function press(page: Page, tap: Press, key: string, text: string): Promise<boolean> {
  const at = await find(page, key, text);
  if (!at) return false;
  await tap(at.x, at.y);
  await tick(page, 10);
  return true;
}

const hunt = <T>(page: Page, read: string): Promise<T> => page.evaluate((r) => new Function('h', `return h ? (${r}) : null`)((window as unknown as Win).hunt()) as T, read);
const saved = <T>(page: Page, read: string): Promise<T> => page.evaluate((r) => new Function('s', `return ${r}`)((window as unknown as Win).save()) as T, read);
const active = (page: Page, key: string): Promise<boolean> => page.evaluate((k) => !!(window as unknown as Win).game?.scene?.isActive(k), key);

/** Brings the monster to its last sliver and plays the hunt out with the keys the bot would press: what is tried is that it can be ended. */
async function finish(page: Page): Promise<void> {
  await page.evaluate(() => {
    const h = (window as unknown as Win).hunt();
    if (h) {
      h.monster.part = (h as unknown as { cuts: readonly number[] }).cuts.length;
      h.monster.hp = Math.min(h.monster.hp, 160);
    }
  });
  for (let i = 0; i < 40 && !(await hunt<string | null>(page, 'h.over')); i++) await playKeys(page, 90);
}

async function play(label: string, context: Context, page: Page, tap: Press, touch: boolean): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  (page as unknown as { on(e: string, f: () => void): void }).on('crash', () => console.error(`${label}: the page crashed`));
  await page.clock.install();
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.clock.pauseAt(Date.now() + 1000);

  // A new player sees the title, presses PLAY, and is in the first hunt, which teaches: no camp, nothing brought.
  check(`${label}: a new player sees PLAY`, await until(page, 'Title'));
  await tick(page, 20);
  check(`${label}: PLAY starts the first hunt`, (await press(page, tap, 'Title', 'PLAY')) && (await until(page, 'Hud')));
  await tick(page, 30);
  check(`${label}: it is the Gravedigger, awake, with no camp`, (await hunt<string>(page, 'h.monster.def.id + "/" + h.phase')) === 'sexton/hunt');
  check(`${label}: nothing was brought`, (await hunt<number>(page, 'h.calls.length + h.buildings.length')) === 0);
  check(`${label}: its first step is to walk`, (await hunt<string>(page, 'h.teaching && h.teaching.step.id')) === 'move');

  // Walk: by keys or by a drag.
  const x0 = await hunt<number>(page, 'h.hunter.x');
  const y0 = await hunt<number>(page, 'h.hunter.y');
  if (touch) {
    const size = page.viewportSize() as { width: number; height: number };
    await page.mouse.move(size.width * 0.5, size.height * 0.6);
    await page.mouse.down();
    await page.mouse.move(size.width * 0.5 - 30, size.height * 0.6 + 10);
    await page.mouse.move(size.width * 0.5 - 60, size.height * 0.6 + 20);
    await tick(page, 70);
    await page.mouse.up();
  } else {
    await page.keyboard.down('KeyA');
    await tick(page, 70);
    await page.keyboard.up('KeyA');
  }
  check(`${label}: the hunter walks`, Math.hypot((await hunt<number>(page, 'h.hunter.x')) - x0, (await hunt<number>(page, 'h.hunter.y')) - y0) > 60);
  check(`${label}: walking is the first step done`, (await hunt<string>(page, 'h.teaching && h.teaching.step.id')) !== 'move');

  // Pause, and what is in it.
  await page.keyboard.press('KeyP');
  await tick(page, 10);
  const t0 = await hunt<number>(page, 'h.time');
  await tick(page, 30);
  check(`${label}: paused, the hunt stands still`, (await hunt<number>(page, 'h.time')) === t0);
  check(`${label}: the sound can be turned off there`, (await press(page, tap, 'Hud', 'SOUND')) && (await saved<boolean>(page, 's.sound')) === false);
  await press(page, tap, 'Hud', 'SOUND');
  check(`${label}: and the lines`, (await press(page, tap, 'Hud', 'LINES')) && (await saved<boolean>(page, 's.talk')) === false);
  await press(page, tap, 'Hud', 'LINES');
  check(`${label}: and the light turned down`, await press(page, tap, 'Hud', 'LIGHT'));
  check(`${label}: RESUME goes on`, await press(page, tap, 'Hud', 'RESUME'));
  await tick(page, 20);
  check(`${label}: the hunt goes on`, (await hunt<number>(page, 'h.time')) > t0);

  // The rest of the lesson, played by the bot through the game's own steering: each step is done once.
  await page.evaluate(() => (window as unknown as Win).pilot(true));
  for (let i = 0; i < 200 && (await hunt<boolean>(page, '!!h.teaching')); i++) await tick(page, 30);
  await page.evaluate(() => (window as unknown as Win).pilot(false));
  check(`${label}: every step of the lesson can be done`, (await hunt<boolean>(page, '!h.teaching')) === true);
  await finish(page);
  check(`${label}: the first hunt is won with the keys`, (await hunt<string | null>(page, 'h.over')) === 'won');
  check(`${label}: what happened is said`, await until(page, 'Result'));
  await tick(page, 30);
  check(`${label}: it paid, and gave its trophy`, (await saved<number>(page, 's.coin')) === 30 && (await saved<string>(page, 's.trophies.join()')) === 'spade');

  // The second hunt brings one building and the camp to set it in.
  check(`${label}: THE LODGE leads to the lodge`, (await press(page, tap, 'Result', 'THE LODGE')) && (await until(page, 'Lodge')));
  await tick(page, 20);
  check(`${label}: a barricade is given for the next hunt`, (await saved<number>(page, 's.muster.buildings.barricade')) === 1);
  check(`${label}: HUNT goes to a lair, in camp`, (await press(page, tap, 'Lodge', 'HUNT')) && (await until(page, 'Hud')) && (await tick(page, 30), (await hunt<string>(page, 'h.phase')) === 'camp'));
  check(`${label}: a building's button sets it down`, ((await press(page, tap, 'Hud', 'BARRICADE')) || (await press(page, tap, 'Hud', '1  BARRICADE'))) && (await hunt<number>(page, 'h.buildings.length')) === 1);
  check(`${label}: WAKE BOSS wakes it`, (await press(page, tap, 'Hud', 'WAKE BOSS')) && (await hunt<string>(page, 'h.phase')) === 'hunt');
  await tick(page, 30);
  const before = await hunt<number>(page, 'h.hunter.rollWait');
  check(`${label}: DODGE dodges`, (await press(page, tap, 'Hud', 'DODGE')) && (await hunt<number>(page, 'h.hunter.rollWait')) > before);
  check(`${label}: a skill's button uses it`, (await press(page, tap, 'Hud', 'SWEEP')) && (await hunt<number>(page, 'h.hunter.waits[1]')) > 0);
  await finish(page);
  check(`${label}: the second hunt is won`, (await hunt<string | null>(page, 'h.over')) === 'won' && (await until(page, 'Result')));
  await tick(page, 30);

  // The third brings spearmen and the horn to call them.
  check(`${label}: back to the lodge`, (await press(page, tap, 'Result', 'THE LODGE')) && (await until(page, 'Lodge')));
  await tick(page, 20);
  check(`${label}: spearmen are given for the next hunt`, (await saved<string>(page, 's.muster.reinforcements.join()')) === 'pikemen');
  check(`${label}: HUNT again`, (await press(page, tap, 'Lodge', 'HUNT')) && (await until(page, 'Hud')));
  await tick(page, 30);
  await press(page, tap, 'Hud', 'WAKE BOSS');
  await tick(page, 30);
  check(`${label}: the horn's button calls them`, (await press(page, tap, 'Hud', 'SPEARS')) && (await hunt<number>(page, 'h.allies.length')) >= 4);
  await finish(page);
  check(`${label}: the third hunt is won`, (await hunt<string | null>(page, 'h.over')) === 'won' && (await until(page, 'Result')));
  await tick(page, 30);

  // To the lodge: the board, with the next contract posted.
  check(`${label}: and now the shop is open`, (await press(page, tap, 'Result', 'THE LODGE')) && (await until(page, 'Lodge')) && (await tick(page, 20), !!(await find(page, 'Lodge', 'SHOP'))));
  check(`${label}: the team opens`, (await press(page, tap, 'Lodge', 'TEAM')) && (await active(page, 'Lodge')));
  await tick(page, 20);
  // Jory was opened by the trophy: take him. The team is an inn, its people brought in by the network: wait for them.
  for (let i = 0; i < 60 && !(await find(page, 'Lodge', 'JORY')); i++) {
    await page.clock.runFor(50);
    await new Promise((r) => setTimeout(r, 30));
  }
  check(`${label}: a hunter in the inn can be looked at`, (await press(page, tap, 'Lodge', 'JORY')) && (await tick(page, 30), !!(await find(page, 'Lodge', 'HUNT AS THEM'))));
  check(`${label}: a hunter the trophy opened can be taken`, (await press(page, tap, 'Lodge', 'HUNT AS THEM')) && (await saved<string>(page, 's.muster.hunter')) === 'jory');
  await tick(page, 20);
  check(`${label}: a building is added within the supply`, (await press(page, tap, 'Lodge', 'BARRICADE')) && (await saved<number>(page, 's.muster.buildings.barricade')) === 2);
  await tick(page, 20);
  check(`${label}: and what the supply will not carry is refused`, (await press(page, tap, 'Lodge', 'BELL')) && (await saved<number | undefined>(page, 's.muster.buildings.bellpost')) === undefined);
  await tick(page, 20);
  check(`${label}: the ledger sells a step of supply`, (await press(page, tap, 'Lodge', 'SHOP')) && (await tick(page, 20), await press(page, tap, 'Lodge', '40')) && (await saved<number>(page, 's.supply')) === 1);
  await tick(page, 20);
  check(`${label}: the board goes back`, await press(page, tap, 'Lodge', 'BOSSES'));
  await tick(page, 20);
  // The King was posted by the Gravedigger's fall: his bill is taken from the board.
  check(`${label}: the King's bill can be picked`, await press(page, tap, 'Lodge', 'ANTLERED KING'));
  await tick(page, 20);
  check(`${label}: HUNT goes to a lair`, (await press(page, tap, 'Lodge', 'HUNT')) && (await until(page, 'Hud')));
  await tick(page, 30);
  check(`${label}: as the hunter chosen, against the contract the board held out`, (await hunt<string>(page, 'h.hunter.def.id + "/" + h.monster.def.id')) === 'jory/king');

  // Giving up, and trying again.
  await page.keyboard.press('KeyP');
  await tick(page, 10);
  check(`${label}: GIVE UP ends the hunt`, (await press(page, tap, 'Hud', 'GIVE UP')) && (await until(page, 'Result')));
  await tick(page, 30);
  check(`${label}: TRY AGAIN goes back to the lair`, (await press(page, tap, 'Result', 'TRY AGAIN')) && (await until(page, 'Hud')));
  await tick(page, 20);
  check(`${label}: a new hunt, in camp`, (await hunt<string>(page, 'h.phase')) === 'camp');
  check(`${label}: nothing went wrong on the page (${errors.slice(0, 2).join(' | ')})`, errors.length === 0);
  await context.close();
}

const browser = await chromium.launch();
{
  const { context, page } = await open(browser, { viewport: { width: 907, height: 510 }, deviceScaleFactor: 1 });
  await play('mouse', context, page, (x, y) => page.mouse.click(x, y), false);
}
{
  const { context, page } = await open(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await play('touch', context, page, (x, y) => page.touchscreen.tap(x, y), true);
}
await browser.close();
if (failures.length) {
  console.error(`smoke: ${failures.length} of ${checks} checks failed\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`smoke: ${checks} checks passed, with the mouse and by touch`);
