// npm run cover
//
// The pictures a portal shows the game by, in the three shapes CrazyGames
// asks for (1920x1080, 800x1200 and 800x800), to docs/covers. Each is the
// game's own lair, drawn and lit by the game in a browser: a hunter facing
// the boss as it winds up, with nothing of the interface over it. The title,
// lettered in the style's own hand, is laid over the top; nothing else is
// written on a cover, as the portal asks. Needs `npm run dev` running.

import fs from 'node:fs';
import path from 'node:path';
import { chromium, open } from './browser';
import { RICH, lair, tick, until, type Win } from './drive';

const base = process.env.URL ?? 'http://127.0.0.1:5180/';
const OUT = path.resolve('docs/covers');
fs.mkdirSync(OUT, { recursive: true });

/** Each shape: its name, its size, who hunts what, and where the title stands, as shares of the picture. */
const SHAPES: Array<{ name: string; w: number; h: number; hunter: string; monster: string; title: { x: number; y: number; wide: number }; at: { mx: number; my: number; dx: number; dy: number } }> = [
  { name: 'landscape', w: 1920, h: 1080, hunter: 'marta', monster: 'sexton', title: { x: 0.27, y: 0.22, wide: 0.36 }, at: { mx: 0.66, my: 0.62, dx: -320, dy: 40 } },
  { name: 'portrait', w: 800, h: 1200, hunter: 'marta', monster: 'sexton', title: { x: 0.5, y: 0.13, wide: 0.72 }, at: { mx: 0.5, my: 0.5, dx: -40, dy: 250 } },
  { name: 'square', w: 800, h: 800, hunter: 'marta', monster: 'sexton', title: { x: 0.5, y: 0.14, wide: 0.52 }, at: { mx: 0.66, my: 0.8, dx: -340, dy: 20 } },
];

const titleSvg = fs.readFileSync(path.resolve('public/assets/grim/things/title.svg'), 'utf8');

const browser = await chromium.launch();
for (const s of SHAPES) {
  const { context, page } = await open(browser, { viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
  await page.clock.install();
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.clock.pauseAt(Date.now() + 1000);
  await until(page, 'Title');
  await lair(page, { monster: s.monster, mark: 1, hunter: s.hunter, reinforcements: [], buildings: [], awake: true }, { ...RICH, talk: false });
  // The boss low in the picture and the hunter stood off it, facing it; the boss let begin its first blow.
  await page.evaluate((a) => {
    const w = window as unknown as Win;
    const h = w.hunt() as unknown as { w: number; h: number; hunter: { x: number; y: number }; monster: { x: number; y: number } };
    if (!h) return;
    h.monster.x = h.w * a.mx;
    h.monster.y = h.h * a.my;
    h.hunter.x = h.monster.x + a.dx;
    h.hunter.y = h.monster.y + a.dy;
  }, s.at);
  await tick(page, 24);
  // Nothing of the interface: the HUD's scene is put to sleep, so the lair alone is drawn.
  await page.evaluate(() => {
    const w = window as unknown as Win;
    (w.game.scene.getScene('Hud') as unknown as { scene: { setVisible(v: boolean): void } }).scene.setVisible(false);
  });
  await tick(page, 2);
  const shot = (await page.screenshot({ type: 'png' })) as unknown as Buffer;
  await context.close();

  // The lair with the title over it, and a little dark at the top so that the title reads on any lair.
  const { context: c2, page: p2 } = await open(browser, { viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
  const tw = s.w * s.title.wide;
  await p2.setContent(`<!doctype html><html><body style="margin:0;width:${s.w}px;height:${s.h}px;overflow:hidden;background:#140c08">
    <div style="position:absolute;inset:0;background:url(data:image/png;base64,${shot.toString('base64')}) center/cover"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(to bottom, rgba(10,6,4,0.7) 0%, rgba(10,6,4,0) 34%), radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)"></div>
    <div style="position:absolute;left:${s.w * s.title.x - tw / 2}px;top:${s.h * s.title.y - (tw * 214) / 444 / 2}px;width:${tw}px;filter:drop-shadow(0 ${s.w / 200}px ${s.w / 120}px rgba(0,0,0,0.8))">${titleSvg.replace(/<svg /, '<svg style="width:100%;height:auto;display:block" ')}</div>
  </body></html>`);
  await p2.screenshot({ path: path.join(OUT, `${s.name}.png`) });
  await c2.close();
  console.log(`cover: ${s.name} ${s.w}x${s.h}`);
}
await browser.close();
