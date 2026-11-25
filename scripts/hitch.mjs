// node scripts/hitch.mjs [url]
//
// Looks for the frames that stall between battles. It lets a player with
// battles on AUTO fight through a few stages with the processor slowed
// (CPU=4 for four times, a stand-in for a phone), times every frame of the
// game's loop, and lists the long ones with what the main screen was doing
// and which of its own steps took the time: the end of a battle, the
// result, the next stage standing up, the art sheet being filled.
//
// STAGES=5 for more stages, AT=30 to start further down the line (new
// enemies come onto the sheet more often there). It needs the dev server
// running (npm run dev) and Playwright. The browser here draws with a
// software GL, so what a graphics chip does with a texture upload is not in
// these numbers: only the script's side.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const SEEN = ['tour:basics', 'tour:packs', 'tour:dungeons', 'tour:raids', 'tour:skills', 'tour:upgrades', 'tour:structures', 'tour:team'];
const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const slow = Number(process.env.CPU ?? 4);
const stages = Number(process.env.STAGES ?? 3);
const at = Number(process.env.AT ?? 6);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// A team strong enough to win where it stands, so that every battle moves on to a stage not yet seen.
const units = ['paladin', 'huscarl', 'colossus', 'frostwitch', 'ballista', 'pyromancer', 'cleric', 'jarl'];
const cards = units.map((unit, i) => ({ id: i + 1, unit, grade: 6, level: 20, xp: 0 }));
for (let i = 0; i < 80; i++) cards.push({ id: 100 + i, unit: ['knight', 'archer', 'mage', 'militia'][i % 4], grade: i % 5, level: 1 + (i % 7), xp: 0 });
cards.push({ id: 50, unit: 'watchtower', grade: 6, level: 20, xp: 0 });
const tiles = [[3, 1], [3, 2], [2, 0], [1, 1], [0, 2], [1, 3], [0, 0], [2, 3]];
const size = at >= 37 ? 8 : at >= 22 ? 7 : at >= 10 ? 6 : at >= 5 ? 5 : 4;
const save = {
  version: 4, coins: 5000, cards, nextCard: 500,
  team: [...units.slice(0, size).map((unit, i) => ({ card: i + 1, unit, col: tiles[i][0], row: tiles[i][1] })), { card: 50, unit: 'watchtower', col: 0, row: 3 }],
  cleared: at, packs: {}, rng: 5, stats: { battles: 90, wins: 70, opened: 30 },
  speed: 2, sound: false, tutorial: { done: true, seen: SEEN, at: 0, tour: null }, at, lostAt: null, auto: true,
};

await page.goto(base);
await page.evaluate((s) => localStorage.setItem('legion-battles-save', JSON.stringify(s)), save);
await page.reload();
await page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'fighting', null, { timeout: 60000 });

const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: slow });

await page.evaluate(() => {
  const main = window.game.scene.getScene('Main');
  const log = { frames: [], steps: [], battles: 0 };
  window.__hitch = log;
  // The main screen's own steps, timed: whichever of them ran inside a long frame is named with it.
  let inFrame = [];
  const wrap = (obj, name, label) => {
    const real = obj[name];
    if (typeof real !== 'function') return;
    obj[name] = function (...a) {
      const t0 = performance.now();
      try {
        return real.apply(this, a);
      } finally {
        inFrame.push([label, performance.now() - t0]);
      }
    };
  };
  for (const name of ['onEnd', 'showResult', 'refreshTop', 'refreshBottom', 'proceed', 'arrive', 'fight', 'clearToast']) wrap(main, name, name);
  for (const name of ['show', 'start', 'preview', 'clearUnits', 'setPlacement', 'makeView']) wrap(main.board, name, `board.${name}`);
  const loop = window.game.loop;
  const real = loop.callback;
  let last = performance.now();
  loop.callback = (time, delta) => {
    const t0 = performance.now();
    inFrame = [];
    real(time, delta);
    const now = performance.now();
    log.frames.push({ work: now - t0, gap: t0 - last, state: main.state, steps: inFrame });
    last = t0;
  };
  // Work that happens outside the loop: a loader's callback, a promise. Long tasks are how the browser reports those.
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) log.steps.push({ at: e.startTime, long: e.duration });
    }).observe({ entryTypes: ['longtask'] });
  } catch {
    // Not every browser reports them.
  }
  const end = main.onEnd;
  main.onEnd = function (...a) {
    log.battles++;
    return end.apply(this, a);
  };
});

await page.waitForFunction((n) => window.__hitch.battles >= n && window.game.scene.getScene('Main').state === 'fighting', stages, { timeout: 600000 });
await page.waitForTimeout(1500);
const log = await page.evaluate(() => window.__hitch);
await browser.close();

const frames = log.frames;
const work = frames.map((f) => f.work).sort((a, b) => a - b);
const pct = (p) => work[Math.min(work.length - 1, Math.floor(work.length * p))];
console.log(`cpu slowed ${slow}x, ${log.battles} battles from stage ${at + 1}, ${frames.length} frames`);
console.log(`a frame's script: half under ${pct(0.5).toFixed(1)} ms, 95 in 100 under ${pct(0.95).toFixed(1)} ms, the worst ${work[work.length - 1].toFixed(0)} ms`);
// A frame that took more than three frames' time at sixty a second is one a player sees.
const long = frames.map((f, i) => ({ ...f, i })).filter((f) => f.work > 50 || f.gap > 120);
console.log(`\n${long.length} frames a player would see stall (over 50 ms of script, or 120 ms since the frame before):`);
for (const f of long.slice(0, 40)) {
  const sums = new Map();
  for (const [n, ms] of f.steps) sums.set(n, (sums.get(n) ?? 0) + ms);
  const steps = [...sums].filter(([, ms]) => ms > 2).map(([n, ms]) => `${n} ${ms.toFixed(0)}`).join(', ');
  console.log(`  frame ${String(f.i).padStart(5)}  ${f.state.padEnd(9)} script ${f.work.toFixed(0).padStart(4)} ms, ${f.gap.toFixed(0).padStart(4)} ms since the last${steps ? `   ${steps}` : ''}`);
}
// By what the screen was doing.
const by = new Map();
for (const f of frames) {
  const b = by.get(f.state) ?? { n: 0, sum: 0, worst: 0 };
  b.n++;
  b.sum += f.work;
  b.worst = Math.max(b.worst, f.work);
  by.set(f.state, b);
}
console.log('\nby what the screen was doing: frames, the mean of their script, the worst');
for (const [state, b] of by) console.log(`  ${state.padEnd(9)} ${String(b.n).padStart(6)}  ${(b.sum / b.n).toFixed(1).padStart(6)} ms  ${b.worst.toFixed(0).padStart(5)} ms`);
if (log.steps.length) console.log(`\n${log.steps.length} long tasks, the longest ${Math.max(...log.steps.map((s) => s.long)).toFixed(0)} ms`);
if (errors.length) console.log(`errors:\n  ${errors.join('\n  ')}`);
