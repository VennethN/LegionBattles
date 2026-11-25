// npx tsx scripts/look.ts [width] [height] [seconds] [name]
//
// A quick look at the field: opens the game as a new player at a window
// size, lets the plain player steer for some seconds on a clock this
// script steps itself, and writes pictures to build/look. The headless
// browser draws only a few frames a second, so real time says nothing
// about the pace: the clock is stepped one frame of the game at a time.

import fs from 'node:fs';

import { chromium, open } from './browser';

const [w, h, seconds, name] = [Number(process.argv[2] ?? 907), Number(process.argv[3] ?? 510), Number(process.argv[4] ?? 8), process.argv[5] ?? 'look'];
const out = 'build/look';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const { page } = await open(browser, { viewport: { width: w, height: h }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.clock.install();
await page.goto('http://127.0.0.1:5175/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.clock.pauseAt(Date.now() + 1000);
// Loading goes by the network, not by the clock: step until the field is up.
for (let i = 0; i < 400; i++) {
  await page.clock.runFor(50);
  const up = await page.evaluate(() => {
    const g = (window as unknown as { game?: Phaser.Game }).game;
    return !!g && g.scene.isActive('Hud');
  });
  if (up) break;
  await new Promise((r) => setTimeout(r, 30));
}
await page.screenshot({ path: `${out}/${name}-0.png` });
// The plain player steers, by holding the keys its steering comes nearest to.
const frames = Math.round(seconds * 60);
let held: string[] = [];
for (let f = 0; f < frames; f++) {
  if (f % 6 === 0) {
    const want = await page.evaluate(() => {
      const world = (window as unknown as { world: () => { hero: { x: number; y: number }; foes: Array<{ x: number; y: number }>; picks: Array<{ x: number; y: number }> } | null }).world();
      if (!world) return [];
      let x = 0;
      let y = 0;
      for (const foe of world.foes) {
        const dx = world.hero.x - foe.x;
        const dy = world.hero.y - foe.y;
        const d = Math.hypot(dx, dy);
        if (d < 110) {
          x += dx / d;
          y += dy / d;
        }
      }
      if (Math.hypot(x, y) < 0.3 && world.picks.length) {
        const p = world.picks[0];
        x = p.x - world.hero.x;
        y = p.y - world.hero.y;
      }
      const keys: string[] = [];
      if (x > 8) keys.push('KeyD');
      if (x < -8) keys.push('KeyA');
      if (y > 8) keys.push('KeyS');
      if (y < -8) keys.push('KeyW');
      if (Math.abs(x) <= 8 && Math.abs(y) <= 8 && Math.hypot(x, y) > 0.3) {
        if (x > 0.2) keys.push('KeyD');
        if (x < -0.2) keys.push('KeyA');
        if (y > 0.2) keys.push('KeyS');
        if (y < -0.2) keys.push('KeyW');
      }
      return keys;
    });
    for (const k of held) if (!want.includes(k)) await page.keyboard.up(k);
    for (const k of want) if (!held.includes(k)) await page.keyboard.down(k);
    held = want;
  }
  await page.clock.runFor(1000 / 60);
  if ((f + 1) % Math.round(frames / 4) === 0) await page.screenshot({ path: `${out}/${name}-${Math.round((f + 1) / (frames / 4))}.png` });
}
for (const k of held) await page.keyboard.up(k);
// If the wave is over, the camp comes up: step until it has, and look at each of its steps.
const scene = (key: string): Promise<boolean> => page.evaluate((k) => (window as unknown as { game: Phaser.Game }).game.scene.isActive(k), key);
for (let i = 0; i < 120 && !(await scene('Camp')) && !(await scene('Result')); i++) await page.clock.runFor(50);
if (await scene('Camp')) {
  await page.clock.runFor(200);
  await page.screenshot({ path: `${out}/${name}-camp-a.png` });
  // Take whatever choices a level is waiting on, by pressing the first card.
  for (let i = 0; i < 6; i++) {
    const phase = await page.evaluate(() => (window as unknown as { run: () => { phase: string; packs: number } | null }).run()?.phase);
    if (phase !== 'level') break;
    await page.mouse.click(w * (h > w ? 0.28 : 0.2), h * 0.55);
    await page.clock.runFor(200);
  }
  await page.evaluate(() => {
    const r = (window as unknown as { run: () => { gold: number } | null }).run();
    if (r) r.gold += 60;
  });
  await page.clock.runFor(100);
  await page.screenshot({ path: `${out}/${name}-camp-b.png` });
}
if (await scene('Result')) await page.screenshot({ path: `${out}/${name}-result.png` });
console.log(JSON.stringify(await page.evaluate(() => {
  const world = (window as unknown as { world: () => { time: number; kills: number; gold: number; hero: { hp: number; maxHp: number }; foes: unknown[]; over: string | null } | null }).world();
  return world ? { time: world.time.toFixed(1), kills: world.kills, gold: world.gold, hp: `${world.hero.hp}/${world.hero.maxHp}`, foes: world.foes.length, over: world.over } : null;
})));
if (errors.length) console.log(`errors:\n  ${[...new Set(errors)].slice(0, 6).join('\n  ')}`);
await browser.close();
