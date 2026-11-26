// npx tsx scripts/loadtime.ts [URL]
//
// How long the game takes from the page being opened to its first screen
// being up and answering, on a slow line: 4 Mbit/s down, 100 ms each way,
// nothing cached. Measured for a new player (who lands in the lesson's
// lair, or on the title) and for one who has played (who lands in the
// lodge), three times each, against a built copy (`npm run build`, then
// `npx vite preview --port 5181`). Says too how much was downloaded by then.

import { chromium, open } from './browser';

const url = process.argv[2] ?? 'http://127.0.0.1:5181/';
const SAVE_KEY = 'boss-hunters-save';

interface Win {
  game?: { scene: { isActive(k: string): boolean } };
}

async function once(returning: boolean): Promise<{ ms: number; screen: string; kb: number }> {
  const browser = await chromium.launch();
  const { context, page } = await open(browser, { viewport: { width: 907, height: 510 }, deviceScaleFactor: 1 });
  if (returning) await context.addInitScript(`try { localStorage.setItem('${SAVE_KEY}', JSON.stringify({ hunts: 4, opening: 3, wins: 3 })); } catch (e) {}`);
  const cdp = await context.newCDPSession(page);
  let bytes = 0;
  const net = cdp as unknown as { on(e: string, f: (p: { encodedDataLength: number }) => void): void };
  net.on('Network.loadingFinished', (p) => {
    bytes += p.encodedDataLength;
  });
  await cdp.send('Network.enable', {});
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: (4 * 1024 * 1024) / 8, uploadThroughput: (1 * 1024 * 1024) / 8 });
  const t0 = Date.now();
  await page.goto(url);
  let screen = '';
  for (let i = 0; i < 1200 && !screen; i++) {
    screen = await page.evaluate(() => {
      const g = (window as unknown as Win).game;
      if (!g) return '';
      for (const k of ['Hud', 'Title', 'Lodge']) if (g.scene.isActive(k)) return k;
      return '';
    });
    if (!screen) await new Promise((r) => setTimeout(r, 50));
  }
  const ms = Date.now() - t0;
  await browser.close();
  return { ms, screen, kb: Math.round(bytes / 1024) };
}

for (const returning of [false, true]) {
  const all: Array<{ ms: number; screen: string; kb: number }> = [];
  for (let i = 0; i < 3; i++) all.push(await once(returning));
  const ms = all.map((a) => a.ms).sort((a, b) => a - b);
  console.log(`${returning ? 'returning player' : 'new player'}: first screen (${all[0].screen}) up in ${(ms[1] / 1000).toFixed(1)} s (median of ${ms.map((m) => (m / 1000).toFixed(1)).join(', ')}), ${all[1].kb} kB downloaded by then`);
}
