// node scripts/perf.mjs [url]
//
// Measures a full battle on the main screen: how long a frame's script work
// takes, how many draw calls a frame makes, and which functions the time
// goes to. The processor is slowed (CPU=4 for four times) to stand in for a
// phone. SCREEN=Team measures with that screen open over the board instead.
// It needs the dev server running (npm run dev) and Playwright.
//
// The browser here draws with a software GL, so what the graphics card would
// do is not measured: only the script side, and the count of draw calls.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

// Every tour is behind this player, so that none comes up over what is being looked at.
const SEEN = ['tour:basics', 'tour:rewards', 'tour:packs', 'tour:dungeons', 'tour:raids', 'tour:skills', 'tour:upgrades', 'tour:structures'];
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const slow = Number(process.env.CPU ?? 4);
const screen = process.env.SCREEN ?? '';
const res = process.env.RES ? `?res=${process.env.RES}` : '';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const units = ['paladin', 'huscarl', 'colossus', 'frostwitch', 'ballista', 'pyromancer', 'cleric', 'jarl'];
const cards = units.map((unit, i) => ({ id: i + 1, unit, grade: 6, level: 20, xp: 0 }));
for (let i = 0; i < 60; i++) cards.push({ id: 100 + i, unit: ['knight', 'archer', 'mage', 'militia'][i % 4], grade: i % 5, level: 1 + (i % 7), xp: 0 });
// And three structures, as a team this far along has: the last stage is fought on the biggest field, by the most there can be.
const built = ['watchtower', 'barracks', 'spiketrap'];
built.forEach((unit, i) => cards.push({ id: 50 + i, unit, grade: 6, level: 20, xp: 0 }));
const tiles = [[3, 1], [3, 2], [2, 0], [1, 1], [0, 2], [1, 3], [0, 0], [2, 3]];
const builtTiles = [[1, -1], [-1, 4], [3, 4]];
const save = {
  version: 4, coins: 5000, cards, nextCard: 500,
  team: [
    ...units.map((unit, i) => ({ card: i + 1, unit, col: tiles[i][0], row: tiles[i][1] })),
    ...built.map((unit, i) => ({ card: 50 + i, unit, col: builtTiles[i][0], row: builtTiles[i][1] })),
  ],
  cleared: 184,
  packs: { recruit: 3 }, rng: 5, stats: { battles: 900, wins: 700, opened: 300 },
  speed: 2, sound: false, tutorial: { done: true, seen: SEEN, at: 0, tour: null }, at: 184, lostAt: null, auto: true,
};

await page.goto(base + res);
await page.evaluate((s) => localStorage.setItem('legion-battles-save', JSON.stringify(s)), save);
await page.reload();
await page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'fighting', null, { timeout: 60000 });
if (screen) {
  await page.evaluate((k) => {
    const m = window.game.scene.getScene('Main');
    m.open(k);
  }, screen);
  await page.waitForFunction((k) => window.game.scene.isActive(k), screen, { timeout: 10000 });
}

// Count draw calls, and time the game's own step, from inside the page.
await page.evaluate(() => {
  const gl = window.game.renderer.gl;
  const stat = { draws: 0, frames: 0, step: 0, worst: 0, steps: [] };
  window.__stat = stat;
  for (const name of ['drawArrays', 'drawElements']) {
    const real = gl[name].bind(gl);
    gl[name] = (...a) => {
      stat.draws++;
      return real(...a);
    };
  }
  const loop = window.game.loop;
  const real = loop.callback;
  loop.callback = (time, delta) => {
    const t0 = performance.now();
    real(time, delta);
    const dt = performance.now() - t0;
    stat.frames++;
    stat.step += dt;
    stat.steps.push(dt);
    if (dt > stat.worst) stat.worst = dt;
  };
});

const client = await page.context().newCDPSession(page);
if (slow > 1) await client.send('Emulation.setCPUThrottlingRate', { rate: slow });
await client.send('Profiler.enable');
await client.send('Profiler.setSamplingInterval', { interval: 500 });
await page.evaluate(() => { const s = window.__stat; s.draws = 0; s.frames = 0; s.step = 0; s.worst = 0; s.steps = []; });
await client.send('Profiler.start');
await page.waitForTimeout(6000);
const { profile } = await client.send('Profiler.stop');
const stat = await page.evaluate(() => {
  const s = window.__stat;
  const sorted = [...s.steps].sort((a, b) => a - b);
  const m = window.game.scene.getScene('Main');
  return {
    frames: s.frames, draws: s.draws / Math.max(1, s.frames), step: s.step / Math.max(1, s.frames), worst: s.worst,
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0, fps: window.game.loop.actualFps, state: m.state,
    canvas: [window.game.canvas.width, window.game.canvas.height],
    objects: window.game.scene.getScenes(true).map((sc) => `${sc.scene.key}:${sc.children.list.length}`).join(' '),
  };
});

// Self time by function, from the sampled profile.
const self = new Map();
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const total = profile.samples.length;
for (const id of profile.samples) {
  const n = byId.get(id);
  const f = n.callFrame;
  const where = f.url ? f.url.split('/').slice(-2).join('/').split('?')[0] : '';
  const name = `${f.functionName || '(anonymous)'} ${where}:${f.lineNumber + 1}`;
  self.set(name, (self.get(name) ?? 0) + 1);
}
const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22);
console.log(`cpu slowed ${slow}x, ${screen || 'battle'}, canvas ${stat.canvas.join('x')}, ${stat.objects}`);
console.log(`frames ${stat.frames} in 6 s (${stat.fps.toFixed(0)} fps here), script per frame ${stat.step.toFixed(2)} ms (95th ${stat.p95.toFixed(2)}, worst ${stat.worst.toFixed(1)}), draw calls per frame ${stat.draws.toFixed(1)}, state ${stat.state}`);
for (const [name, n] of top) console.log(`  ${((100 * n) / total).toFixed(1).padStart(5)}%  ${name}`);
if (errors.length) console.log(`ERRORS: ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
