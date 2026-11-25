// npm run film [1280x720] [sexton|king|lesson] [hunter]
//
// `lesson` is the first hunt as a new player meets it: the title, PLAY, and
// the lesson played through the keys (attack held on J, as a player holds
// it), filmed to its end, with how long it took.
//
// With `npm run dev` running: films a hunt, a picture to every other frame,
// to build/film, and says how to make a clip of them. It is how the game is
// seen moving where there is no screen: the headless browser draws a few
// frames a second, so the game's own clock is stepped and each frame
// photographed. The bot plays: setting camp, the waking, and the first
// minute and a half of the hunt.

import fs from 'node:fs';
import { chromium, open } from './browser';
import { RICH, find, lair, pilot, playKeys, tick, until, type Win } from './drive';

const [width, height] = (process.argv[2] ?? '1280x720').split('x').map(Number);
const monster = process.argv[3] ?? 'sexton';
const hunter = process.argv[4] ?? 'marta';
const out = 'build/film';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const { page } = await open(browser, { viewport: { width, height }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message)));
await page.clock.install();
await page.goto(process.env.URL ?? 'http://127.0.0.1:5180/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.clock.pauseAt(Date.now() + 1000);

let n = 0;
/** A picture of every other frame: thirty to the second. */
const shoot = async (frame: number): Promise<void> => {
  if (frame % 2 === 0) await page.screenshot({ path: `${out}/f-${String(n++).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 88 });
};

if (monster === 'lesson') {
  await until(page, 'Title');
  await tick(page, 30);
  const play = await find(page, 'Title', 'PLAY');
  if (play) await page.mouse.click(play.x, play.y);
  await until(page, 'Hud');
  let frame = 0;
  // Played a second at a time, so the end is seen as it comes: up to five minutes of the game.
  for (let s = 0; s < 300; s++) {
    await playKeys(page, 60, (f) => shoot(frame + f));
    frame += 60;
    if (await page.evaluate(() => !!(window as unknown as Win).hunt()?.over)) break;
  }
  const end = await page.evaluate(() => {
    const h = (window as unknown as Win).hunt();
    return h ? { over: h.over, time: Math.round(h.time) } : null;
  });
  for (let f = 0; f < 120; f++) {
    await tick(page, 1);
    await shoot(frame + f);
  }
  console.log(`lesson: ${end?.over ?? 'not over'} after ${end?.time ?? '?'} s of the hunt, ${Math.round(frame / 60)} s from PLAY`);
} else {
await until(page, 'Hud');
await lair(page, { monster, mark: 1, hunter, reinforcements: [{ id: 'pikemen', charges: 1 }], buildings: [{ id: 'barricade', n: 1 }, { id: 'watchfire', n: 1 }] }, RICH);
await pilot(page, Number(process.env.FILM_SECONDS ?? 60), shoot);
}

await browser.close();
console.log(`film: ${n} pictures in ${out}${errors.length ? `\n  the page said: ${[...new Set(errors)].slice(0, 4).join(' | ')}` : ''}`);
console.log(`  ffmpeg -y -framerate 30 -i ${out}/f-%05d.jpg -c:v libx264 -pix_fmt yuv420p -crf 20 build/hunt.mp4`);
