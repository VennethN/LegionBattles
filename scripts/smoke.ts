// npm run smoke [url=http://127.0.0.1:5174/]
//
// Plays the game through its interface, as a player would, and fails if
// anything a press should do does not happen: hiring and leveling, the
// lists scrolled, the tabs, an ability, a supply pack, a rebirth from the
// button to the honors, the settings and starting over, the save kept over
// a reload, the card for time away, and all of it again by touch on a phone
// held upright. The dev server has to be running (npm run dev).
//
// A button is found by what it says and pressed where it is on the screen,
// so moving one does not break this.

import { createRequire } from 'node:module';

interface Page {
  on(event: string, fn: (m: { type(): string; text(): string; message: string }) => void): void;
  goto(url: string, o?: object): Promise<unknown>;
  reload(o?: object): Promise<unknown>;
  addInitScript(js: string): Promise<void>;
  waitForFunction(js: string, arg?: unknown, o?: object): Promise<unknown>;
  waitForTimeout(ms: number): Promise<void>;
  evaluate(js: string): Promise<unknown>;
  mouse: { click(x: number, y: number): Promise<void>; move(x: number, y: number, o?: object): Promise<void>; down(): Promise<void>; up(): Promise<void>; wheel(dx: number, dy: number): Promise<void> };
  touchscreen: { tap(x: number, y: number): Promise<void> };
  setViewportSize(size: { width: number; height: number }): Promise<void>;
}
interface Context {
  newPage(): Promise<Page>;
  close(): Promise<void>;
}
interface Browser {
  newContext(o: object): Promise<Context>;
  close(): Promise<void>;
}
const require = createRequire(import.meta.url);
const { chromium } = require('playwright') as { chromium: { launch(o: object): Promise<Browser> } };

const url = process.argv.slice(2).find((a) => a.startsWith('url='))?.slice(4) ?? 'http://127.0.0.1:5174/';
const failures: string[] = [];
let checks = 0;

function check(what: string, ok: boolean, got?: unknown): void {
  checks++;
  if (!ok) failures.push(`${what}${got === undefined ? '' : `: got ${JSON.stringify(got)}`}`);
}

/** Run in the page: where on the screen, in CSS pixels, the thing that says `text` in a scene is. Null if nothing says it. */
const FIND = `
window.__find = (sceneKey, text) => {
  const scene = game.scene.getScene(sceneKey);
  if (!scene || !game.scene.isActive(sceneKey)) return null;
  const cam = scene.cameras.main;
  const says = (o) => o.type === 'Text' && o.visible && o.text.replace(/\\s+/g, ' ').trim() === text;
  const at = (x, y) => {
    const ox = cam.width / 2, oy = cam.height / 2;
    return [(cam.x + ox + (x - cam.scrollX - ox) * cam.zoom) / view.density, (cam.y + oy + (y - cam.scrollY - oy) * cam.zoom) / view.density];
  };
  for (const o of scene.children.list) {
    if (!o.visible || o.alpha === 0) continue;
    if (o.type === 'Container' && o.list.some(says)) return at(o.x, o.y);
    if (says(o)) return at(o.x - (o.originX - 0.5) * o.width, o.y - (o.originY - 0.5) * o.height);
  }
  return null;
};
window.__state = () => {
  const s = save();
  return { stage: s.run.stage, top: s.run.top, gold: Math.floor(s.run.gold), heroes: s.run.heroes.slice(), camp: s.run.camp.slice(), laurels: s.laurels, ever: s.laurelsEver,
    honors: s.honors.slice(), rebirths: s.rebirths, taps: s.stats.taps, packs: s.stats.packs, buy: s.settings.buy, advance: s.settings.advance, holding: s.run.holding,
    sound: s.settings.sound, music: s.settings.music, shake: s.settings.shake, rally: s.abilities[0].until > Date.now(), modal: game.scene.isActive('Modal'), tall: view.tall };
};
`;

interface State {
  stage: number; top: number; gold: number; heroes: number[]; camp: number[]; laurels: number; ever: number; honors: number[]; rebirths: number; taps: number; packs: number;
  buy: number; advance: boolean; holding: boolean; sound: boolean; music: number; shake: boolean; rally: boolean; modal: boolean; tall: boolean;
}

async function play(browser: Browser, name: string, width: number, height: number, touch: boolean): Promise<void> {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: touch ? 2 : 1, hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GPU stall')) failures.push(`${name}: the console said [${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => failures.push(`${name}: ${e.message}`));

  const ready = async (): Promise<void> => {
    await page.waitForFunction("window.game && game.scene.isActive('Game') && game.scene.isActive('List')", undefined, { timeout: 30000 });
    await page.evaluate(FIND);
    await page.waitForTimeout(400);
  };
  const state = async (): Promise<State> => (await page.evaluate('__state()')) as State;
  const set = async (js: string): Promise<void> => {
    await page.evaluate(`(() => { const s = save(); ${js}; battle().reset(); game.scene.getScene('Game').scene.restart(); })()`);
    await page.waitForTimeout(900);
  };
  const tapAt = async (x: number, y: number): Promise<void> => {
    if (touch) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
  };
  /** Presses whatever says `text` in a scene. False if nothing does. */
  const press = async (scene: string, text: string): Promise<boolean> => {
    const at = (await page.evaluate(`__find(${JSON.stringify(scene)}, ${JSON.stringify(text)})`)) as [number, number] | null;
    if (!at) {
      failures.push(`${name}: nothing in ${scene} says "${text}"`);
      return false;
    }
    await tapAt(at[0], at[1]);
    await page.waitForTimeout(350);
    return true;
  };
  const says = async (scene: string, text: string): Promise<boolean> => (await page.evaluate(`__find(${JSON.stringify(scene)}, ${JSON.stringify(text)})`)) !== null;

  await page.goto(url, { waitUntil: 'load' });
  await ready();

  // A new player: the first hero's price is in the purse, and HIRE hires.
  let s = await state();
  check(`${name}: the layout is the one for this window`, s.tall === height > width, s.tall);
  check(`${name}: a new player has no one hired`, s.heroes.every((l) => l === 0), s.heroes);
  await press('List', 'HIRE');
  await page.waitForTimeout(500);
  s = await state();
  check(`${name}: HIRE hires the first hero`, s.heroes[0] === 1, s.heroes);
  check(`${name}: and it is paid for`, s.gold < 10, s.gold);

  // A press on the fight is a blow.
  const stageAt = (await page.evaluate("(() => { const g = game.scene.getScene('Game'); const r = g.lay.stage; const z = view.zoom / view.density; return [(r.x + r.w * 0.6) * z, (r.y + r.h * 0.55) * z]; })()")) as [number, number];
  for (let i = 0; i < 6; i++) {
    await tapAt(stageAt[0], stageAt[1]);
    await page.waitForTimeout(80);
  }
  s = await state();
  check(`${name}: six presses on the fight are six blows`, s.taps === 6, s.taps);

  // The buy toggle, and a level bought by the row's button.
  await set('s.run.gold = 1e7; s.run.heroes[0] = 3; s.hints.push("tap")');
  await press('Game', 'x1');
  s = await state();
  check(`${name}: the toggle goes from x1 to x10`, s.buy === 10, s.buy);
  await press('List', '+10');
  s = await state();
  check(`${name}: +10 buys ten levels`, s.heroes[0] === 13, s.heroes[0]);
  await press('List', 'HIRE');
  await page.waitForTimeout(700);
  await page.evaluate(FIND);
  s = await state();
  check(`${name}: the second hero is hired, ten levels at once`, s.heroes[1] === 10, s.heroes[1]);

  // The list scrolls, and a row that was out of sight can be pressed where it now is.
  await set('s.run.gold = 1e30; for (let i = 0; i < 18; i++) s.run.heroes[i] = 1; s.settings.buy = 1');
  const before = (await page.evaluate("game.scene.getScene('List').cameras.main.scrollY")) as number;
  const listAt = (await page.evaluate("(() => { const c = game.scene.getScene('List').cameras.main; return [(c.x + c.width / 2) / view.density, (c.y + c.height * 0.7) / view.density, c.height / view.density]; })()")) as [number, number, number];
  if (touch) {
    // A drag by touch: Playwright has no touch drag, so the pointer events a finger makes are sent as a mouse's, which Phaser reads the same.
    await page.mouse.move(listAt[0], listAt[1]);
    await page.mouse.down();
    await page.mouse.move(listAt[0], listAt[1] - listAt[2] * 0.5, { steps: 8 });
    await page.mouse.up();
  } else {
    await page.mouse.move(listAt[0], listAt[1]);
    await page.mouse.wheel(0, 900);
  }
  await page.waitForTimeout(700);
  const after = (await page.evaluate("game.scene.getScene('List').cameras.main.scrollY")) as number;
  check(`${name}: the list scrolls`, after > before + 100, [before, after]);
  const lastLevel = (await state()).heroes[17];
  // The last hero's row is at the foot of the list: scroll to it and press its button.
  await page.evaluate("(() => { const l = game.scene.getScene('List'); l.scroll = 1e6; l.place(); })()");
  await page.waitForTimeout(300);
  const lastAt = (await page.evaluate(`(() => { const l = game.scene.getScene('List'); const cam = l.cameras.main; const rows = l.children.list.filter((o) => o.type === 'Container' && o.input); const b = rows[rows.length - 1]; const ox = cam.width / 2, oy = cam.height / 2; return [(cam.x + ox + (b.x - cam.scrollX - ox) * cam.zoom) / view.density, (cam.y + oy + (b.y - cam.scrollY - oy) * cam.zoom) / view.density]; })()`)) as [number, number];
  await tapAt(lastAt[0], lastAt[1]);
  await page.waitForTimeout(400);
  s = await state();
  check(`${name}: the last hero's button, scrolled to, levels the last hero`, s.heroes[17] === lastLevel + 1, s.heroes[17]);

  // The camp.
  await press('Game', 'CAMP');
  await page.waitForTimeout(600);
  await page.evaluate(FIND);
  await press('List', 'BUILD');
  s = await state();
  check(`${name}: BUILD builds the first thing in the camp`, s.camp[0] === 1, s.camp);

  // An ability, the supply pack, and holding.
  await set('s.best = 40; s.run.stage = 12; s.run.top = 12; s.run.gold = 100; for (let i = 0; i < 18; i++) s.run.heroes[i] = i < 4 ? 20 : 0; s.packIn = 0');
  await page.waitForTimeout(800);
  const rallyAt = (await page.evaluate("(() => { const g = game.scene.getScene('Game'); const b = g.abilities[0].root; const z = view.zoom / view.density; return [b.x * z, b.y * z]; })()")) as [number, number];
  await tapAt(rallyAt[0], rallyAt[1]);
  await page.waitForTimeout(300);
  s = await state();
  check(`${name}: the first ability's button rallies`, s.rally, s.rally);
  const packAt = (await page.evaluate("(() => { const p = game.scene.getScene('Game').stage.packAt; const z = view.zoom / view.density; return p ? [p.x * z, p.y * z] : null; })()")) as [number, number] | null;
  check(`${name}: a supply pack has landed`, packAt !== null);
  if (packAt) {
    await page.waitForTimeout(700);
    const landed = (await page.evaluate("(() => { const p = game.scene.getScene('Game').stage.packAt; const z = view.zoom / view.density; return [p.x * z, p.y * z]; })()")) as [number, number];
    await tapAt(landed[0], landed[1]);
    await page.waitForTimeout(400);
    s = await state();
    check(`${name}: pressing the pack opens it`, s.packs === 1, s.packs);
  }
  await press('Game', 'AUTO ON');
  s = await state();
  check(`${name}: AUTO, pressed, holds the legion where it is`, !s.advance && s.holding, [s.advance, s.holding]);
  await press('Game', 'AUTO OFF');
  s = await state();
  check(`${name}: and pressed again lets it go on`, s.advance, s.advance);

  // Rebirth, from the tab to the honors.
  await set('s.run.stage = 41; s.run.top = 45; s.best = 45; s.run.gold = 5e9; for (let i = 0; i < 18; i++) s.run.heroes[i] = i < 9 ? 40 : 0; s.run.camp[0] = 4');
  await press('Game', 'REBIRTH');
  await page.waitForTimeout(600);
  await page.evaluate(FIND);
  check(`${name}: the rebirth tab says what a rebirth is`, await says('List', 'MUSTER AGAIN'));
  await press('List', 'REBIRTH');
  await page.waitForTimeout(500);
  s = await state();
  check(`${name}: the button asks first`, s.modal && s.rebirths === 0, [s.modal, s.rebirths]);
  await press('Modal', 'NOT YET');
  s = await state();
  check(`${name}: NOT YET changes nothing`, !s.modal && s.rebirths === 0 && s.stage === 41, [s.modal, s.rebirths, s.stage]);
  await press('List', 'REBIRTH');
  await page.waitForTimeout(500);
  const won = (await page.evaluate("(() => { const m = game.scene.getScene('Modal'); const t = m.children.list.flatMap((o) => (o.type === 'Container' ? o.list : [o])).find((o) => o.type === 'Text' && o.text.startsWith('REBIRTH')); return t ? t.text.replace(/\\s+/g, ' ') : ''; })()")) as string;
  await press('Modal', won);
  await page.waitForTimeout(1200);
  await page.evaluate(FIND);
  s = await state();
  check(`${name}: a rebirth sets the legion back to the start`, s.rebirths === 1 && s.stage === 1 && s.heroes.every((l) => l === 0) && s.camp.every((l) => l === 0), [s.rebirths, s.stage]);
  check(`${name}: and wins laurels`, s.laurels > 0 && s.laurels === s.ever, [s.laurels, s.ever]);
  const had = s.laurels;
  await press('List', 'EARN');
  s = await state();
  check(`${name}: a laurel buys an honor`, s.honors.some((h) => h === 1) && s.laurels < had, [s.honors, s.laurels]);

  // The settings.
  const cogAt = (await page.evaluate("(() => { const g = game.scene.getScene('Game'); const r = g.lay.stage; const z = view.zoom / view.density; return [(r.x + r.w - 38) * z, (r.y + 34) * z]; })()")) as [number, number];
  await tapAt(cogAt[0], cogAt[1]);
  await page.waitForTimeout(500);
  s = await state();
  check(`${name}: the cog opens the settings`, s.modal && (await says('Modal', 'SETTINGS')));
  await press('Modal', 'ON');
  s = await state();
  check(`${name}: sound can be turned off`, !s.sound, s.sound);
  await press('Modal', 'OFF');
  await press('Modal', '-');
  s = await state();
  check(`${name}: and on again, and the music turned down`, s.sound && s.music === 5, [s.sound, s.music]);
  await press('Modal', 'CLOSE');
  s = await state();
  check(`${name}: CLOSE puts the settings away`, !s.modal);

  // The save is kept over a reload, and time away is paid for. A page writes the time down as it is left, so the
  // two hours are taken off what was written as the page comes back, before the game has read it.
  await page.evaluate("(() => { const s = save(); s.run.heroes[0] = 30; s.run.heroes[1] = 20; s.run.stage = 6; s.run.top = 6; battle().reset(); })()");
  await page.waitForTimeout(300);
  const goldBefore = (await state()).gold;
  await page.addInitScript(
    "(() => { if (!sessionStorage.getItem('rewind')) return; sessionStorage.removeItem('rewind'); const raw = JSON.parse(localStorage.getItem('legion-idle-save') || 'null'); " +
      "if (raw) { raw.seen -= 2 * 3600 * 1000; localStorage.setItem('legion-idle-save', JSON.stringify(raw)); } })()",
  );
  await page.evaluate("sessionStorage.setItem('rewind', '1')");
  await page.reload({ waitUntil: 'load' });
  await ready();
  await page.waitForTimeout(600);
  s = await state();
  check(`${name}: the save is kept over a reload`, s.heroes[0] === 30 && s.rebirths === 1 && s.music === 5, [s.heroes[0], s.rebirths, s.music]);
  check(`${name}: coming back after two hours brings up the card for it`, s.modal && (await says('Modal', 'WHILE YOU WERE AWAY')));
  check(`${name}: and the purse is fuller`, s.gold > goldBefore, [goldBefore, s.gold]);
  await press('Modal', 'COLLECT');
  s = await state();
  check(`${name}: COLLECT puts the card away`, !s.modal);

  // Starting over asks twice.
  await tapAt(cogAt[0], cogAt[1]);
  await page.waitForTimeout(500);
  await press('Modal', 'START OVER');
  s = await state();
  check(`${name}: START OVER asks before it does anything`, s.modal && s.rebirths === 1, [s.modal, s.rebirths]);
  await press('Modal', 'SURE? AGAIN');
  await page.waitForTimeout(1200);
  s = await state();
  check(`${name}: asked again, it starts over`, s.rebirths === 0 && s.ever === 0 && s.heroes.every((l) => l === 0) && s.stage === 1, [s.rebirths, s.ever, s.stage]);

  await context.close();
  console.log(`smoke: ${name} played`);
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  await play(browser, 'wide', 1280, 720, false);
  await play(browser, 'phone', 390, 844, true);
  await browser.close();
  if (failures.length > 0) {
    console.error(`smoke: ${failures.length} of ${checks} checks failed:\n  ${failures.join('\n  ')}`);
    process.exitCode = 1;
  } else console.log(`smoke: all ${checks} checks passed`);
}

void main();
