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

async function play(label: string, context: Context, page: Page, tap: Press, touch: boolean): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  await page.clock.install();
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.clock.pauseAt(Date.now() + 1000);

  // A new player is in a lair at once, in camp, with the first contract.
  check(`${label}: a new player lands in a lair`, await until(page, 'Hud'));
  await tick(page, 30);
  check(`${label}: it is the Sexton's, asleep, in camp`, (await hunt<string>(page, 'h.monster.def.id + "/" + h.phase')) === 'sexton/camp');
  check(`${label}: a muster was made for them`, (await hunt<number>(page, 'Object.values(h.toPlace).reduce((a, b) => a + b, 0)')) === 2 && (await hunt<number>(page, 'h.calls.length')) === 1);

  // Walk a little, and build: by the button.
  if (touch) {
    const size = page.viewportSize() as { width: number; height: number };
    await page.mouse.move(size.width * 0.3, size.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(size.width * 0.3 + 30, size.height * 0.5 - 5);
    await page.mouse.move(size.width * 0.3 + 60, size.height * 0.5 - 10);
    await tick(page, 40);
    await page.mouse.up();
  } else {
    await page.keyboard.down('KeyD');
    await tick(page, 40);
    await page.keyboard.up('KeyD');
  }
  const x = await hunt<number>(page, 'h.hunter.x');
  check(`${label}: the hunter walks`, x > 250);
  check(`${label}: a building's button sets it down`, (await press(page, tap, 'Hud', touch ? 'BARRICADE' : '1  BARRICADE')) && (await hunt<number>(page, 'h.buildings.length')) === 1);
  if (!touch) {
    await page.keyboard.down('KeyS');
    await tick(page, 40);
    await page.keyboard.up('KeyS');
    await page.keyboard.press('Digit2');
    await tick(page, 6);
    check(`${label}: and its number does`, (await hunt<number>(page, 'h.buildings.length')) === 2);
  }

  // Wake it.
  check(`${label}: WAKE IT wakes it`, (await press(page, tap, 'Hud', 'WAKE IT')) && (await hunt<string>(page, 'h.phase')) === 'hunt');

  // The buttons of the hunt.
  await tick(page, 30);
  const before = await hunt<number>(page, 'h.hunter.rollWait');
  check(`${label}: ROLL rolls`, (await press(page, tap, 'Hud', 'ROLL')) && (await hunt<number>(page, 'h.hunter.rollWait')) > before);
  check(`${label}: an ability's button uses it`, (await press(page, tap, 'Hud', 'REAP')) && (await hunt<number>(page, 'h.hunter.waits[1]')) > 0);
  check(`${label}: the horn's button calls them`, (await press(page, tap, 'Hud', 'PIKES')) && (await hunt<number>(page, 'h.allies.length')) === 4);

  // Pause, and what is in it.
  await page.keyboard.press('KeyP');
  await tick(page, 10);
  const t0 = await hunt<number>(page, 'h.time');
  await tick(page, 30);
  check(`${label}: paused, the hunt stands still`, (await hunt<number>(page, 'h.time')) === t0);
  check(`${label}: the sound can be turned off there`, (await press(page, tap, 'Hud', 'SOUND')) && (await saved<boolean>(page, 's.sound')) === false);
  await press(page, tap, 'Hud', 'SOUND');
  check(`${label}: and the light turned down`, await press(page, tap, 'Hud', 'LIGHT'));
  check(`${label}: RESUME goes on`, await press(page, tap, 'Hud', 'RESUME'));
  await tick(page, 20);
  check(`${label}: the hunt goes on`, (await hunt<number>(page, 'h.time')) > t0);

  // The hunt, played with the keys the bot would press, until it ends. The monster is brought low first: a whole hunt
  // is minutes, and what is tried here is that it can be played and ended, not how hard it is.
  await page.evaluate(() => {
    const h = (window as unknown as Win).hunt();
    if (h) {
      h.monster.part = 2;
      h.monster.hp = Math.min(h.monster.hp, 220);
    }
  });
  for (let i = 0; i < 40 && !(await hunt<string | null>(page, 'h.over')); i++) await playKeys(page, 90);
  check(`${label}: the monster falls to a hunter played with the keys`, (await hunt<string | null>(page, 'h.over')) === 'won');
  check(`${label}: what happened is said`, await until(page, 'Result'));
  await tick(page, 30);
  check(`${label}: the hunt paid, and gave its trophy`, (await saved<number>(page, 's.coin')) === 80 && (await saved<string>(page, 's.trophies.join()')) === 'spade');

  // To the lodge: the board, with the next contract posted.
  check(`${label}: THE LODGE leads to the lodge`, (await press(page, tap, 'Result', 'THE LODGE')) && (await until(page, 'Lodge')));
  await tick(page, 20);
  check(`${label}: the muster opens`, (await press(page, tap, 'Lodge', 'MUSTER')) && (await active(page, 'Lodge')));
  await tick(page, 20);
  // Jory was opened by the trophy: take him.
  check(`${label}: a hunter the trophy opened can be taken`, (await press(page, tap, 'Lodge', 'JORY')) && (await saved<string>(page, 's.muster.hunter')) === 'jory');
  await tick(page, 20);
  check(`${label}: a building is added within the supply`, (await press(page, tap, 'Lodge', 'BARRICADE')) && (await saved<number>(page, 's.muster.buildings.barricade')) === 2);
  await tick(page, 20);
  check(`${label}: and what the supply will not carry is refused`, (await press(page, tap, 'Lodge', 'BELL POST')) && (await saved<number | undefined>(page, 's.muster.buildings.bellpost')) === undefined);
  await tick(page, 20);
  check(`${label}: the ledger sells a step of supply`, (await press(page, tap, 'Lodge', 'LEDGER')) && (await tick(page, 20), await press(page, tap, 'Lodge', '40')) && (await saved<number>(page, 's.supply')) === 1);
  await tick(page, 20);
  check(`${label}: the board goes back`, await press(page, tap, 'Lodge', 'BOARD'));
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
