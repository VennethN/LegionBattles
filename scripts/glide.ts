// npm run glide
//
// With the game served (URL, or `npm run dev`): walks the hero every way,
// stops, starts and turns, and holds how they are drawn to being smooth.
//
// The wave moves in fixed steps and the screen draws when it likes. The
// headless clock usually steps exactly one frame at a time, which never
// shows a jerk; so here it is stepped by odd amounts (7, 23 and 13
// thousandths of a second, and a sixtieth), as a real screen at 144, 43
// and 75 frames a second would. Every frame the hero's drawn place is read
// back, and how far they were moved is held to how long the frame was.

import { chromium, open, type Page } from './browser';
import { arena, until, type Win } from './drive';

const browser = await chromium.launch();
const { page } = await open(browser, { viewport: { width: 907, height: 510 }, deviceScaleFactor: 1 });
await page.clock.install();
await page.goto(process.env.URL ?? 'http://127.0.0.1:5175/');
await page.evaluate(() => {
  localStorage.clear();
  // The light costs minutes a second in a headless browser and has no part in where the hero is drawn.
  localStorage.setItem('lastander-light', 'off');
});
await page.reload();
await page.clock.pauseAt(Date.now() + 1000);
await until(page as Page, 'Title');

await arena(page as Page, { hero: 'bram', wave: 1, level: 1, weapons: [], gold: 0 });
await until(page as Page, 'Hud');
// Nobody to fight: only the walk is looked at.
await page.evaluate(() => {
  const w = (window as unknown as Win).world() as unknown as { foes: unknown[]; marks: unknown[]; wave: { most: number } };
  w.wave.most = 0;
  w.foes.length = 0;
  w.marks.length = 0;
});

let worst = 0;
let frames = 0;
const fails: string[] = [];

/**
 * Holds the keys for so many frames of the given lengths in turn, and checks every frame once the walk is under
 * way. The game's own loop is stopped and each frame is asked for by hand, with the length it is told it took:
 * the page's stood-in clock only ever draws a frame every sixteen thousandths, which is one screen's rate, not all.
 */
async function walk(name: string, keys: string[], count: number, lengths: number[], steady: boolean): Promise<void> {
  for (const k of keys) await page.keyboard.down(k);
  await page.clock.runFor(40);
  const places = await page.evaluate(
    ({ count, lengths }) => {
      const game = (window as unknown as Win).game as unknown as { loop: { stop(): void; now: number }; step(time: number, delta: number): void };
      const scene = (window as unknown as Win).game.scene.getScene('Arena') as unknown as { hero: { x: number; y: number }; cameras: { main: { scrollX: number; scrollY: number } } };
      game.loop.stop();
      let t = performance.now();
      const out: Array<{ ms: number; x: number; y: number; cx: number; cy: number }> = [];
      for (let i = 0; i < count; i++) {
        const ms = lengths[i % lengths.length];
        t += ms;
        game.step(t, ms);
        out.push({ ms, x: scene.hero.x, y: scene.hero.y, cx: scene.cameras.main.scrollX, cy: scene.cameras.main.scrollY });
      }
      return out;
    },
    { count, lengths },
  );
  for (const k of keys) await page.keyboard.up(k);
  if (!steady) return;
  // Once under way, every frame moves them at the same speed, whatever its length; and the view goes with them exactly.
  const speeds: number[] = [];
  for (let i = 9; i < places.length; i++) {
    const a = places[i - 1];
    const b = places[i];
    speeds.push(Math.hypot(b.x - a.x, b.y - a.y) / (b.ms / 1000));
    const slip = Math.hypot(b.x - a.x - (b.cx - a.cx), b.y - a.y - (b.cy - a.cy));
    if (slip > 0.05) fails.push(`${name}: the view slipped ${slip.toFixed(2)} from the hero in a frame`);
  }
  const mean = speeds.reduce((x, y) => x + y, 0) / speeds.length;
  for (const v of speeds) {
    frames++;
    const off = Math.abs(v - mean) / mean;
    worst = Math.max(worst, off);
    if (off > 0.04) fails.push(`${name}: a frame moved them at ${v.toFixed(0)} a second, the walk's speed is ${mean.toFixed(0)}`);
  }
}

const ODD = [7, 23, 13, 1000 / 60, 9, 19];
await walk('right', ['KeyD'], 40, ODD, true);
await walk('left', ['KeyA'], 40, [1000 / 75], true);
await walk('up', ['KeyW'], 40, [1000 / 144], true);
await walk('down-right', ['KeyS', 'KeyD'], 40, ODD, true);
await browser.close();
if (fails.length) {
  for (const f of fails.slice(0, 8)) console.log(`✗ ${f}`);
  console.log(`glide: ${fails.length} of ${frames} frames were not smooth`);
  process.exit(1);
}
console.log(`glide: ${frames} frames of every length, the worst ${(worst * 100).toFixed(1)}% off the walk's own speed`);
