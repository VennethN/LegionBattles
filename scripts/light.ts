// npm run light [scene ...] [--mode=full,low,off] [--size=907x510] [--out=build/light]
//
// With `npm run dev` running: pictures of the field under its light, at
// each hour of each land, to build/light. Look at them after any change to
// the light (src/view/light): the afternoon, the evening and the night of
// every land, a captain's wave among them, with a hero who carries fire and
// one who does not. `--mode=off` is the field as it was drawn before there
// was any light, to set beside the others.
//
// `--film=6` films each scene asked for instead, for that many seconds, a
// picture to every other frame, to <out>/film-<scene>, and says how to make
// a clip of them: fire and bolts are only half seen in a still.

import fs from 'node:fs';

import { chromium, open, type Page } from './browser';
import { RICH, THINGS, UPS, arena, fight, until } from './drive';

const args = process.argv.slice(2);
const want = args.filter((a) => !a.startsWith('--'));
const arg = (name: string, or: string): string => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? or;
const modes = arg('mode', 'full').split(',');
const [width, height] = arg('size', '907x510').split('x').map(Number);
const dpr = Number(arg('dpr', '1'));
const out = arg('out', 'build/light');
const film = Number(arg('film', '0'));
fs.mkdirSync(out, { recursive: true });
const base = process.env.URL ?? 'http://127.0.0.1:5175/';

/** Hands full of what burns and glows. */
const FIRE = [{ id: 'torch', tier: 1 }, { id: 'brazier', tier: 1 }, { id: 'staff', tier: 1 }, { id: 'bomb', tier: 1 }, { id: 'frost', tier: 0 }, { id: 'censer', tier: 0 }];

/** A scene: who, in which wave, carrying what, and how many seconds into it the picture is taken. */
const SCENES: Record<string, { hero: string; wave: number; weapons: unknown[]; seconds: number }> = {
  'meadow-day': { hero: 'bram', wave: 1, weapons: [{ id: 'sword', tier: 0 }, { id: 'torch', tier: 0 }], seconds: 8 },
  'meadow-gold': { hero: 'nan', wave: 4, weapons: FIRE, seconds: 10 },
  'meadow-dusk': { hero: 'orrin', wave: 6, weapons: FIRE, seconds: 10 },
  'meadow-night': { hero: 'wren', wave: 7, weapons: RICH, seconds: 9 },
  'desert-noon': { hero: 'orrin', wave: 8, weapons: FIRE, seconds: 9 },
  'desert-evening': { hero: 'bram', wave: 11, weapons: RICH, seconds: 16 },
  'desert-night': { hero: 'nan', wave: 14, weapons: FIRE, seconds: 10 },
  'snow-day': { hero: 'ysolde', wave: 15, weapons: RICH, seconds: 9 },
  'snow-dusk': { hero: 'aldous', wave: 18, weapons: FIRE, seconds: 12 },
  'snow-night': { hero: 'maren', wave: 20, weapons: FIRE, seconds: 10 },
};

const browser = await chromium.launch();
for (const mode of modes) {
  const { context, page } = await open(browser, { viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: height > width, isMobile: height > width });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('403')) errors.push(m.text());
  });
  await page.clock.install();
  await page.goto(base);
  await page.evaluate((m) => {
    localStorage.clear();
    localStorage.setItem('lastander-light', m);
  }, mode);
  await page.reload();
  await page.clock.pauseAt(Date.now() + 1000);
  await until(page, 'Hud');
  for (const [name, scene] of Object.entries(SCENES)) {
    if (want.length && !want.some((w) => name.includes(w))) continue;
    try {
      await arena(page as Page, { hero: scene.hero, wave: scene.wave, weapons: scene.weapons, items: THINGS, ups: UPS, level: 10, gold: 120 });
      await until(page, 'Hud');
      await fight(page, Math.round(scene.seconds * 60));
      await page.screenshot({ path: `${out}/${name}${mode === 'full' ? '' : `-${mode}`}.png` });
      if (film > 0) {
        const dir = `${out}/film-${name}`;
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        let n = 0;
        await fight(page, Math.round(film * 60), async (f) => {
          if (f % 2 === 0) await page.screenshot({ path: `${dir}/f-${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90 });
        });
        console.log(`  ffmpeg -y -framerate 30 -i ${dir}/f-%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 20 ${out}/${name}.mp4`);
      }
    } catch (e) {
      errors.push(`${name}: ${String(e)}`);
    }
  }
  console.log(`light: ${mode} ${width}x${height} done${errors.length ? `\n  errors:\n  ${[...new Set(errors)].slice(0, 8).join('\n  ')}` : ''}`);
  await context.close();
}
await browser.close();
