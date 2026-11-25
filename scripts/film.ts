// npm run film [1280x720]
//
// With `npm run dev` running: films the game, a picture to every other
// frame, to build/film, and says how to make a clip of them. It is how the
// game is seen moving where there is no screen: the headless browser draws
// a few frames a second, so the game's own clock is stepped and each frame
// photographed. A new player's first wave, the camp, and then a horde and
// a boss from further on.

import fs from 'node:fs';
import { chromium, open, type Page } from './browser';
import { RICH, THINGS, UPS, arena, fight, find, tick, until, type Win } from './drive';

const [width, height] = (process.argv[2] ?? '1280x720').split('x').map(Number);
const out = 'build/film';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const { page } = await open(browser, { viewport: { width, height }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message)));
await page.clock.install();
await page.goto(process.env.URL ?? 'http://127.0.0.1:5175/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.clock.pauseAt(Date.now() + 1000);

let n = 0;
/** A picture of every other frame: thirty to the second. */
const shoot = async (frame: number): Promise<void> => {
  if (frame % 2 === 0) await page.screenshot({ path: `${out}/f-${String(n++).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 88 });
};
const hold = async (p: Page, frames: number): Promise<void> => {
  for (let f = 0; f < frames; f++) {
    await p.clock.runFor(1000 / 60);
    await shoot(f);
  }
};
const press = async (xShare: number, yShare: number): Promise<void> => {
  await page.mouse.click(width * xShare, height * yShare);
};

// A new player's first wave.
await until(page, 'Hud');
await fight(page, 60 * 11, shoot);
// The rest of it goes by unseen, and then the camp.
await page.evaluate(() => {
  const r = (window as unknown as Win).run() as { gold: number } | null;
  if (r) r.gold += 30;
});
await fight(page, 60 * 12);
await until(page, 'Camp');
await hold(page, 70);
if ((await page.evaluate(() => (window as unknown as Win).run()?.phase)) === 'level') {
  await press(0.2, 0.55);
  await hold(page, 60);
}
// Buy the first ware, and go.
const buyAt = await find(page, 'Camp', 'BUY');
if (buyAt) await page.mouse.click(buyAt.x, buyAt.y);
await hold(page, 50);
const goAt = await find(page, 'Camp', 'WAVE');
if (goAt) await page.mouse.click(goAt.x, goAt.y);
else await press(0.87, 0.92);
await until(page, 'Hud');
await fight(page, 60 * 6, shoot);

// Further on: every hand full on the dunes, and a boss.
await arena(page, { hero: 'bram', wave: 11, weapons: RICH, items: THINGS, ups: UPS, level: 12, gold: 310 });
await until(page, 'Hud');
await fight(page, 60 * 5);
await fight(page, 60 * 9, shoot);
await arena(page, { hero: 'wren', wave: 7, weapons: RICH, items: THINGS, ups: UPS, level: 8, gold: 120 });
await until(page, 'Hud');
await fight(page, 60 * 3);
await fight(page, 60 * 9, shoot);
await tick(page, 2);

await browser.close();
console.log(`film: ${n} pictures in ${out}${errors.length ? `\n  the page said: ${[...new Set(errors)].slice(0, 4).join(' | ')}` : ''}`);
console.log(`  ffmpeg -y -framerate 30 -i ${out}/f-%05d.jpg -c:v libx264 -pix_fmt yuv420p -crf 20 build/holdout.mp4`);
