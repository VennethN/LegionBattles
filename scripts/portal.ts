// npm run portal
//
// Loads the CrazyGames build (npm run build:crazygames, served with
// `npx vite preview --outDir dist-crazygames --port 5183`, or URL=) in the
// headless browser, where CrazyGames' SDK runs in its own local mode, and
// writes down what the game tells the portal and when: loading, gameplay
// starting and stopping, ads asked for, a cheer. It plays a new player's
// first wave, pauses and resumes it, ends it, and leaves the camp, then
// says whether each call came at the moment the portal's rules ask for
// (docs/crazygames.md), what the page asked for from outside the build,
// and any error on the console.

import { chromium, open, type Page } from './browser';
import { fight, find, tick, until, type Win } from './drive';

const base = process.env.URL ?? 'http://127.0.0.1:5183/';
const browser = await chromium.launch();
const { context, page } = await open(browser, { viewport: { width: 907, height: 510 }, deviceScaleFactor: 1 });
const errors: string[] = [];
const outside = new Set<string>();
page.on('pageerror', (e) => errors.push(String(e.message)));
const said: string[] = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  // The SDK's local mode says each call it is given, after its own coloring: the call is the last words.
  else if (/HTML5 SDK/.test(m.text())) said.push(m.text().replace(/%c/g, '').replace(/[a-z-]+: [^;]+;/g, '').replace(/\s+/g, ' ').trim().slice(-90));
});
(page as unknown as { on(e: 'request', f: (r: { url(): string }) => void): void }).on('request', (r) => {
  const u = new URL(r.url());
  if (u.hostname && u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') outside.add(u.hostname);
});

// Every call the game makes to the SDK is written down, with what the game was doing when it came.
await (page as unknown as { addInitScript(f: () => void): Promise<void> }).addInitScript(() => {
  const log: Array<{ call: string; scene: string }> = [];
  (window as unknown as { portalLog: typeof log }).portalLog = log;
  const scenes = (): string => {
    const g = (window as unknown as { game?: { scene: { getScenes(on: boolean): Array<{ sys: { settings: { key: string } } }> } } }).game;
    return g ? g.scene.getScenes(true).map((s) => s.sys.settings.key).join('+') : 'boot';
  };
  const wrap = (): boolean => {
    const sdk = (window as unknown as { CrazyGames?: { SDK?: Record<string, Record<string, unknown>> } }).CrazyGames?.SDK;
    if (!sdk?.game || !sdk.ad) return false;
    for (const [part, names] of [['game', ['gameplayStart', 'gameplayStop', 'loadingStart', 'loadingStop', 'happytime']], ['ad', ['requestAd']]] as const) {
      for (const name of names) {
        const obj = sdk[part];
        const fn = obj[name] as ((...a: unknown[]) => unknown) | undefined;
        if (typeof fn !== 'function') continue;
        obj[name] = (...a: unknown[]) => {
          log.push({ call: name === 'requestAd' ? `requestAd:${String(a[0])}` : name, scene: scenes() });
          // An ad in the local mode is a picture the SDK lays over the page: answered at once here, as unfilled.
          if (name === 'requestAd') {
            const cb = a[1] as { adError?: (e: unknown) => void } | undefined;
            setTimeout(() => cb?.adError?.({ code: 'local' }), 50);
            return undefined;
          }
          return fn.apply(obj, a);
        };
      }
    }
    return true;
  };
  const timer = setInterval(() => {
    if (wrap()) clearInterval(timer);
  }, 5);
});

await page.clock.install();
await page.goto(base);
await page.evaluate(() => localStorage.setItem('lastander-light', 'off'));
await page.reload();
// Real time runs while the SDK comes from the network and wakes; then the clock is taken over.
await new Promise((r) => setTimeout(r, 6000));
await page.clock.pauseAt(Date.now() + 60_000);
const inPlay = await until(page, 'Hud', 900);
const log = (): Promise<Array<{ call: string; scene: string }>> => page.evaluate(() => (window as unknown as { portalLog: Array<{ call: string; scene: string }> }).portalLog.slice());
const env = await page.evaluate(() => (window as unknown as { CrazyGames?: { SDK?: { environment?: string } } }).CrazyGames?.SDK?.environment ?? 'none');
const step = async (what: string, run: () => Promise<void>): Promise<void> => {
  const before = (await log()).length;
  await run();
  const now = await log();
  console.log(`${what}: ${now.slice(before).map((c) => `${c.call} (${c.scene})`).join(', ') || 'nothing'}`);
};

console.log(`SDK: ${env}; in play at once: ${inPlay}`);
console.log(`loading and the first wave: ${(await log()).map((c) => `${c.call} (${c.scene})`).join(', ')}`);
await step('paused with P', async () => {
  await page.keyboard.press('KeyP');
  await tick(page as Page, 10);
});
await step('resumed with P', async () => {
  await page.keyboard.press('KeyP');
  await tick(page as Page, 10);
});
await step('the wave to its end', async () => {
  await page.evaluate(() => {
    const r = (window as unknown as Win).run();
    if (r) r.gold = 900;
  });
  await fight(page as Page, 60 * 30);
  await until(page as Page, 'Camp', 600);
});
const press = async (key: string, text: string): Promise<boolean> => {
  const at = await find(page as Page, key, text);
  if (!at) return false;
  await page.mouse.click(at.x, at.y);
  await tick(page as Page, 8);
  return true;
};
await step('a level chosen in the camp', async () => {
  await tick(page as Page, 20);
  for (let i = 0; i < 5 && (await page.evaluate(() => (window as unknown as Win).run()?.phase)) === 'level'; i++) {
    await page.mouse.click(907 * 0.2, 510 * 0.55);
    await tick(page as Page, 10);
  }
});
await step('NEXT WAVE pressed, a road chosen', async () => {
  await press('Camp', 'NEXT WAVE');
  await until(page as Page, 'Road', 200);
  await tick(page as Page, 10);
  await press('Road', 'CHOOSE');
  await tick(page as Page, 30);
  await until(page as Page, 'Hud', 300);
});
console.log(`the SDK said:\n  ${said.join('\n  ')}`);
console.log(`asked of hosts outside the build: ${[...outside].join(', ') || 'none'}`);
console.log(`errors: ${errors.length ? [...new Set(errors)].slice(0, 8).join(' | ') : 'none'}`);
await context.close();
await browser.close();
