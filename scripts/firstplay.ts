// npm run firstplay [-- --mbit=4 --rtt=100 --runs=3]
//
// With the game served (URL=, the build preferably: npx vite preview), how
// long it takes on a slow connection from opening the page to (1) something
// of the game on the screen, (2) the first frame that can be played, for a
// new player (the first wave, with the hero moving), and (3) the title for a
// returning player. The browser's cache is off and the connection is
// throttled as a phone's or a slow home's is, so the numbers are what a
// first visit costs. The owner: "can we get rid of loading bars and instead
// have it asynchronously loading? this is so players get more quickly into
// the game".

import { chromium, open, type Page } from './browser';

const args = process.argv.slice(2);
const arg = (name: string, or: number): number => Number(args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? or);
const base = process.env.URL ?? 'http://127.0.0.1:5179/';
const mbit = arg('mbit', 4);
const rtt = arg('rtt', 100);
const runs = arg('runs', 3);

type Probe = { scenes: string[]; time: number; hero: boolean };
const probe = (page: Page): Promise<Probe> =>
  page.evaluate(() => {
    const w = window as unknown as { game?: { scene: { getScenes(on: boolean): Array<{ sys: { settings: { key: string } } }> } }; world?: () => { time: number } | null };
    const scenes = w.game ? w.game.scene.getScenes(true).map((s) => s.sys.settings.key) : [];
    let time = 0;
    try {
      time = w.world?.()?.time ?? 0;
    } catch {
      time = 0;
    }
    return { scenes, time, hero: time > 0 };
  }) as Promise<Probe>;

/** Opens the page as someone new, or as someone who has played, and times what comes when. */
async function visit(returning: boolean): Promise<{ shown: number; playable: number; bytes: number }> {
  const browser = await chromium.launch();
  const { context, page } = await open(browser, { viewport: { width: 907, height: 510 }, deviceScaleFactor: 1 });
  const cdp = await (context as unknown as { newCDPSession(p: unknown): Promise<{ send(m: string, p?: unknown): Promise<unknown>; on(e: string, f: (p: { encodedDataLength: number }) => void): void }> }).newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  let bytes = 0;
  cdp.on('Network.loadingFinished', (p) => {
    bytes += p.encodedDataLength;
  });
  if (returning) {
    // A save of someone a few runs in, written before the game is opened.
    await page.goto(`${base}?blank`);
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('lastander-light', 'off');
    });
    await page.goto(base);
    for (let i = 0; i < 400; i++) {
      const p = await probe(page);
      if (p.scenes.includes('Hud') || p.scenes.includes('Title')) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    await page.evaluate(() => {
      const raw = localStorage.getItem('lastander-save');
      const s = raw ? JSON.parse(raw) : {};
      s.runs = Math.max(3, s.runs ?? 0);
      s.ended = s.runs;
      s.run = null;
      localStorage.setItem('lastander-save', JSON.stringify(s));
    });
  } else {
    await page.goto(`${base}?blank`);
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('lastander-light', 'off');
    });
  }
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: rtt, downloadThroughput: (mbit * 1e6) / 8, uploadThroughput: (mbit * 1e6) / 8 / 4 });
  bytes = 0;
  const t0 = Date.now();
  await (page as unknown as { goto(u: string, o: unknown): Promise<unknown> }).goto(base, { waitUntil: 'commit' });
  let shown = 0;
  let playable = 0;
  const marks = new Map<string, number>();
  for (let i = 0; i < 1200 && !playable; i++) {
    const p: Probe = await probe(page).catch(() => ({ scenes: [] as string[], time: 0, hero: false }));
    if (!shown && p.scenes.length > 0) shown = Date.now() - t0;
    for (const k of p.scenes) if (!marks.has(k)) marks.set(k, Date.now() - t0);
    if (returning ? p.scenes.includes('Title') : p.scenes.includes('Hud') && p.hero) playable = Date.now() - t0;
    if (!playable) await new Promise((r) => setTimeout(r, 40));
  }
  await context.close();
  await browser.close();
  if (process.env.MARKS) console.log(`  ${[...marks].map(([k, t]) => `${k} ${(t / 1000).toFixed(1)}`).join(', ')}`);
  return { shown, playable, bytes };
}

for (const returning of [false, true]) {
  const all: Array<{ shown: number; playable: number; bytes: number }> = [];
  for (let i = 0; i < runs; i++) all.push(await visit(returning));
  const mid = (k: 'shown' | 'playable' | 'bytes'): number => all.map((x) => x[k]).sort((a, b) => a - b)[Math.floor(all.length / 2)];
  console.log(
    `${returning ? 'returning player, to the title' : 'new player, to the first wave'} at ${mbit} Mbit/s and ${rtt} ms: ` +
      `game on screen ${(mid('shown') / 1000).toFixed(1)} s, playable ${(mid('playable') / 1000).toFixed(1)} s, ${(mid('bytes') / 1e6).toFixed(2)} MB fetched by then ` +
      `(each: ${all.map((x) => `${(x.playable / 1000).toFixed(1)}`).join(', ')})`,
  );
}
