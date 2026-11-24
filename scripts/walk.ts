// npm run walk [name ...] [url=http://127.0.0.1:5174/]
//
// Takes pictures of the game in the states a player meets, on a wide screen
// and on a phone held upright, to build/walk. The dev server has to be
// running (npm run dev). It is how a change to a screen is looked at: the
// states are set up by writing the save, as no one has the hours to play to
// them.
//
// Name states to take only those ("npm run walk boss feats").

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// Playwright is the machine's, not the project's: it is asked for where it is installed, and only what is used of it is typed.
interface Page {
  on(event: string, fn: (m: { type(): string; text(): string; message: string; stack?: string }) => void): void;
  goto(url: string, o?: object): Promise<unknown>;
  waitForFunction(js: string, arg?: unknown, o?: object): Promise<unknown>;
  waitForTimeout(ms: number): Promise<void>;
  evaluate(js: string): Promise<unknown>;
  screenshot(o: { path: string }): Promise<unknown>;
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

const OUT = path.resolve('build/walk');
const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('url='))?.slice(4) ?? 'http://127.0.0.1:5174/';
const only = args.filter((a) => !a.includes('='));

interface Screen {
  name: string;
  width: number;
  height: number;
  /** Device pixels to a CSS pixel. */
  dpr: number;
}

const SCREENS: Screen[] = [
  { name: 'wide', width: 1280, height: 720, dpr: 1 },
  { name: 'phone', width: 390, height: 844, dpr: 2 },
];

/** Code run in the page to make a save of a kind. `s` is the save, `H` and `C` how many heroes and camp things there are. */
const SAVES: Record<string, string> = {
  fresh: '',
  early: 's.run.stage = 7; s.run.top = 7; s.run.gold = 480; s.run.heroes[0] = 14; s.run.heroes[1] = 6; s.run.heroes[2] = 2; s.run.camp[0] = 1; s.stats.taps = 60; s.hints.push("tap");',
  boss: 's.run.stage = 10; s.run.top = 10; s.run.gold = 2600; s.run.heroes[0] = 26; s.run.heroes[1] = 14; s.run.heroes[2] = 10; s.run.heroes[3] = 5; s.run.camp[0] = 3; s.run.camp[1] = 2; s.run.camp[2] = 2; s.stats.taps = 300; s.hints.push("tap");',
  late:
    's.run.stage = 34; s.run.top = 36; s.run.gold = 4.2e9; for (let i = 0; i < 12; i++) s.run.heroes[i] = Math.max(1, 60 - i * 5); ' +
    'for (let i = 0; i < 6; i++) s.run.camp[i] = 6 - i; s.laurels = 14; s.laurelsEver = 40; s.rebirths = 2; s.honors[0] = 3; s.honors[1] = 2; s.best = 52; ' +
    's.stats.taps = 4000; s.stats.kills = 9000; s.stats.bosses = 9; s.stats.gold = 9e9; s.hints.push("tap"); s.run.holding = true;',
  whole:
    's.run.stage = 58; s.run.top = 58; s.run.gold = 7.7e15; for (let i = 0; i < 18; i++) s.run.heroes[i] = Math.max(10, 150 - i * 7); ' +
    'for (let i = 0; i < 8; i++) s.run.camp[i] = 8 - i; s.laurels = 3; s.laurelsEver = 260; s.rebirths = 7; for (let i = 0; i < 8; i++) s.honors[i] = Math.max(0, 5 - i); s.best = 71; ' +
    's.stats.taps = 30000; s.stats.kills = 90000; s.stats.bosses = 40; s.stats.gold = 9e16; s.hints.push("tap");',
};

interface State {
  name: string;
  save: keyof typeof SAVES;
  /** Run in the page once the game stands. */
  then?: string;
  /** Seconds to wait before the picture. */
  wait?: number;
}

const GAME = "game.scene.getScene('Game')";
const STATES: State[] = [
  { name: 'fresh', save: 'fresh' },
  { name: 'early', save: 'early' },
  { name: 'boss', save: 'boss', wait: 2.5 },
  { name: 'late', save: 'late', then: `battle().packLeft = 30; ${GAME}.stage.dropPack(); s.abilities[0].until = Date.now() + 15000; s.abilities[1].ready = Date.now() + 80000;`, wait: 2 },
  { name: 'whole', save: 'whole', wait: 3 },
  { name: 'camp', save: 'late', then: `${GAME}.scene.restart({ tab: 'camp' })`, wait: 2 },
  { name: 'rebirth', save: 'late', then: `${GAME}.scene.restart({ tab: 'rebirth' })`, wait: 2 },
  { name: 'feats', save: 'late', then: `${GAME}.scene.restart({ tab: 'feats' })`, wait: 2 },
  { name: 'settings', save: 'early', then: `${GAME}.scene.launch('Modal', { kind: 'settings' })` },
  { name: 'away', save: 'late', then: `${GAME}.scene.launch('Modal', { kind: 'away', earned: { seconds: 9000, capped: true, gold: 6.4e10 } })` },
  { name: 'muster', save: 'late', then: `${GAME}.scene.launch('Modal', { kind: 'rebirth' })` },
];

async function shoot(browser: Browser, screen: Screen, state: State): Promise<string[]> {
  const context = await browser.newContext({ viewport: { width: screen.width, height: screen.height }, deviceScaleFactor: screen.dpr });
  const page = await context.newPage();
  const said: string[] = [];
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GPU stall')) said.push(`${state.name}/${screen.name}: [${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => said.push(`${state.name}/${screen.name}: ${e.message}\n${(e.stack ?? '').split('\n').slice(1, 5).join('\n')}`));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction("window.game && game.scene.isActive('Game')", undefined, { timeout: 30000 });
  if (SAVES[state.save]) {
    await page.evaluate(`(() => { const s = save(); ${SAVES[state.save]} battle().reset(); ${GAME}.scene.restart(); })()`);
    await page.waitForTimeout(600);
  }
  if (state.then) await page.evaluate(`(() => { const s = save(); ${state.then} })()`);
  await page.waitForTimeout((state.wait ?? 1.5) * 1000);
  // The legion's figures are brought in as they are wanted: wait until nothing more is on its way.
  await page.waitForFunction(`${GAME}.load.totalToLoad === 0 || ${GAME}.load.progress === 1`, undefined, { timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `${state.name}-${screen.name}.png`) });
  await context.close();
  return said;
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const said: string[] = [];
  for (const state of STATES) {
    if (only.length > 0 && !only.includes(state.name)) continue;
    for (const screen of SCREENS) said.push(...(await shoot(browser, screen, state)));
    console.log(`walk: ${state.name}`);
  }
  await browser.close();
  if (said.length > 0) {
    console.log(said.join('\n'));
    process.exitCode = 1;
  } else console.log(`walk: nothing was said on the console. Pictures are in ${OUT}`);
}

void main();
