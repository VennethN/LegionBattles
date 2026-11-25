// node scripts/legible.mjs [url]
//
// Goes through every screen of the game in a window the size of a portal's
// smallest frame, 821 by 462 at one pixel to a pixel, and measures every
// word that is on it. It fails, naming the screen and the words, if any are
// smaller than the floor: about 11 px tall on the page, as a font's size is
// counted. The game is laid out on 1280 by 720 and drawn to fit, so there a
// word of 17 on the field is 10.9 px and a word of 19 in a window is 11.0;
// anything written smaller is found here.
//
// It visits a new player's first battle with the tutorial's three steps,
// the main screen, a battle and its result on the first field and on the
// biggest, a card of an enemy, the units and the structures with a card
// open and with the forge, the index, the packs with one that is not sold,
// an opening of one and of ten, the map, the player's skills and upgrades,
// the halls of dungeons and of raids, a dungeon's camp and a floor of it,
// the rewards, the settings with the list of tutorials and START OVER, and
// every step of every tour.
//
// It needs the dev server running (npm run dev) or a served build, and
// Playwright. A picture of each visit goes to build/legible.
//
//   SIZE=907x510 node scripts/legible.mjs     another frame
//   ONLY=shop,tours node scripts/legible.mjs  only the visits whose names start so
//   FLOOR=12 node scripts/legible.mjs         another floor

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { walker } from './walk.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const [vw, vh] = (process.env.SIZE ?? '821x462').split('x').map(Number);
const dpr = Number(process.env.DPR ?? 1);
/**
 * The floor, in px on the page. "About 11": a word written at 17 on the field comes to 10.9 in this frame,
 * and no eye tells that from 11.
 */
const FLOOR = Number(process.env.FLOOR ?? 10.8);
const only = (process.env.ONLY ?? '').split(',').filter(Boolean);
const out = process.env.OUT ?? `build/legible/${vw}x${vh}`;
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr });
const page = await context.newPage();
const { click, press, mark, card: tile } = walker(page);
const errors = [];
page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').split('\n').slice(0, 4).join('\n')}`));

/** Every word on the screen now, with how tall it is on the page. */
const words = () => page.evaluate(() => {
  const game = window.game;
  const info = window.legible;
  const box = game.canvas.getBoundingClientRect();
  // Page px to one px of the canvas: the canvas is drawn at its own resolution and shown as big as the page lets it be.
  const css = box.width / game.canvas.width;
  const scenes = game.scene.getScenes(true);
  // A window open over the field hides the field's own words: those are the main screen's to answer for when it is on show.
  const covered = scenes.some((sc) => info.windowed.includes(sc.scene.key));
  const found = [];
  for (const sc of scenes) {
    if (covered && sc.scene.key === 'Main') continue;
    for (const cam of sc.cameras.cameras) {
      if (!cam.visible) continue;
      const view = cam.worldView;
      const walk = (list, sx, sy, ox, oy, alpha) => {
        for (const o of list) {
          if (!o.visible || (o.cameraFilter & cam.id) !== 0) continue;
          const a = alpha * (o.alpha ?? 1);
          if (a < 0.12) continue;
          const x = ox + (o.x ?? 0) * sx;
          const y = oy + (o.y ?? 0) * sy;
          if (o.type === 'Container') {
            walk(o.list, sx * o.scaleX, sy * o.scaleY, x, y, a);
            continue;
          }
          let em = 0;
          let said = '';
          if (o.type === 'Text') {
            said = o.text;
            em = parseFloat(o.style.fontSize) * Math.abs(o.scaleY) * sy;
          } else if (o.type === 'BitmapText') {
            said = o.text;
            em = o.fontSize * info.digitsEm * Math.abs(o.scaleY) * sy;
          } else if (o.type === 'Image' && typeof o.frame?.name === 'string' && o.frame.name.startsWith('grade/')) {
            // A grade's badge is a picture with a letter on it, and the letter is read. Its plate is 84 px of the
            // picture, and the letter two thirds of that: as a font counts, nearly as tall as the plate.
            said = `the grade ${o.frame.name.slice(6)} on its badge`;
            em = Math.abs(o.scaleY) * sy * 84 * 0.95;
          }
          if (!said || !said.trim() || em <= 0) continue;
          // Only what is on the screen: a pool of numbers waits off it, and a list's far rows are out of sight.
          if (x < view.x - 4 || x > view.right + 4 || y < view.y - 4 || y > view.bottom + 4) continue;
          found.push({ scene: sc.scene.key, said: said.replace(/\s+/g, ' ').trim().slice(0, 44), px: em * cam.zoom * css, size: Math.round(em * 10) / 10 });
        }
      };
      walk(sc.children.list, 1, 1, 0, 0, 1);
    }
  }
  return found;
});

const small = [];
const seenSmall = new Map();
let visits = 0;
let counted = 0;
/** Measures what is on the screen, under a name, and keeps a picture of it. */
const visit = async (name, settle = 450) => {
  await page.waitForTimeout(settle);
  const found = await words();
  visits++;
  counted += found.length;
  for (const w of found) {
    if (w.px >= FLOOR) continue;
    // The same words on the same screen are said once, with the first place they were met and how many more.
    const key = `${w.scene}|${w.said.replace(/\d+/g, '0')}`;
    const had = seenSmall.get(key);
    if (had) {
      if (!had.places.has(name)) had.places.add(name);
      continue;
    }
    const entry = { at: name, places: new Set([name]), ...w };
    seenSmall.set(key, entry);
    small.push(entry);
  }
  await page.screenshot({ path: `${out}/${name.replace(/[^a-z0-9]+/gi, '-')}.png` });
};
const wants = (name) => only.length === 0 || only.some((o) => name.startsWith(o));

// ------------------------------------------------------------ the players

const SEEN = ['tap', 'place', 'tour:basics', 'tour:packs', 'tour:team', 'tour:dungeons', 'tour:raids', 'tour:skills', 'tour:upgrades', 'tour:structures'];
const units = ['militia', 'archer', 'knight', 'cleric', 'berserker', 'mage', 'paladin', 'herald', 'cutpurse', 'poacher', 'bruiser', 'hexer', 'warlord', 'lancer', 'javelineer', 'ballista', 'pyromancer', 'colossus', 'huscarl', 'harpooner', 'icegolem', 'frostwitch'];
const built = ['watchtower', 'barracks', 'spiketrap', 'palisade'];
const cards = [];
const card = (unit, grade, level, xp = 10) => {
  cards.push({ id: cards.length + 1, unit, grade, level, xp });
  return cards.length;
};
const first = {};
units.forEach((u, i) => { first[u] = card(u, i % 7, 6 + (i % 14)); });
built.forEach((u, i) => { first[u] = card(u, 2 + i, 8 + i); });
for (const [grade, level] of [[0, 1], [1, 1], [2, 3]]) card('knight', grade, level);
const fielded = (id, col, row) => ({ card: id, unit: cards[id - 1].unit, col, row });
/** A player well into the game: the second lap, on the biggest field, with packs to open and coins to spend. */
const late = (at, more = {}) => ({
  version: 4, coins: 23450, cards, nextCard: cards.length + 1, met: [...units, ...built],
  team: [
    fielded(first.paladin, 3, 1), fielded(first.colossus, 3, 2), fielded(first.icegolem, 2, 0), fielded(first.frostwitch, 1, 1), fielded(first.ballista, 0, 2),
    fielded(first.pyromancer, 1, 3), fielded(first.cleric, 0, 0), fielded(first.warlord, 2, 3), fielded(first.watchtower, 0, 1), fielded(first.barracks, 0, 3),
  ],
  cleared: 52, ahead: {}, dungeons: { hollow: 1 }, raids: {},
  packs: { recruit: 1, royal: 2, frost: 1, 'thornwood@1': 12, faithful: 1 }, rng: 99, stats: { battles: 400, wins: 300, opened: 80 },
  speed: 1, sound: false, tutorial: { done: true, seen: SEEN, at: 0, tour: null }, at, lostAt: null, auto: false, sort: 'unit',
  player: { level: 14, xp: 320 }, tree: { command: 1, edge: 3, drill: 2 }, upgrades: { whetstones: 3, ledgers: 1 },
  ...more,
});
/** One on the first field, a battle short of a few levels and of the Warlord's first fall: the fullest result there is. */
const early = () => {
  const mine = [];
  for (const [u, g, l, x] of [['knight', 4, 9, 850], ['paladin', 4, 9, 0], ['archer', 4, 9, 852], ['mage', 4, 9, 0], ['cleric', 4, 9, 849], ['militia', 4, 9, 0], ['watchtower', 2, 4, 205]]) {
    mine.push({ id: mine.length + 1, unit: u, grade: g, level: l, xp: x });
  }
  return {
    version: 4, coins: 2450, cards: mine, nextCard: 99, met: mine.map((c) => c.unit), team: mine.map((c, i) => ({ card: c.id, unit: c.unit, col: 3 - (i % 2), row: i % 4 })),
    cleared: 9, ahead: {}, packs: {}, rng: 5, stats: { battles: 9, wins: 6, opened: 3 }, speed: 1, sound: false,
    tutorial: { done: true, seen: SEEN, at: 0, tour: null }, at: 9, lostAt: null, auto: false,
    player: { level: 9, xp: 420 }, tree: { command: 1, edge: 3, drill: 2 }, upgrades: { whetstones: 3, ledgers: 1 },
  };
};

const ready = () => page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state === 'ready', null, { timeout: 60000 });
const load = async (save) => {
  await page.goto(base);
  await page.evaluate((s) => {
    localStorage.clear();
    if (s) localStorage.setItem('legion-battles-save', JSON.stringify(s));
  }, save);
  await page.reload();
  await page.waitForFunction(() => window.game?.scene?.isActive('Main') && window.game.scene.getScene('Main').state !== 'loading', null, { timeout: 60000 });
};
const state = (key = 'Main') => page.evaluate((k) => window.game.scene.getScene(k).state, key);
const active = (key) => page.waitForFunction((k) => window.game.scene.isActive(k), key, { timeout: 15000 });
const gone = (key) => page.waitForFunction((k) => !window.game.scene.isActive(k), key, { timeout: 15000 });
const overlay = async (key, data) => {
  await page.evaluate(([k, d]) => window.game.scene.getScene('Main').open(k, d ?? undefined), [key, data ?? null]);
  await active(key);
};
const close = async (key) => {
  await press(key, 'CLOSE');
  await gone(key);
  await page.waitForTimeout(250);
};
/** Fights the battle on show, measuring it a few times while it is on, and then its result. */
const battle = async (name, key = 'Main') => {
  for (let i = 0; i < 400 && (await state(key)) === 'fighting'; i++) {
    if (i % 3 === 0 && i < 30) await visit(`${name} battle ${i / 3 + 1}`, 500);
    else await page.waitForTimeout(600);
  }
};
const step = async (id) => {
  await page.waitForFunction((want) => window.game.scene.getScene('Main').guide.step?.id === want, id, { timeout: 240000 });
  return page.evaluate(() => window.game.scene.getScene('Main').guide.rect);
};

// ------------------------------------------------------------ the visits

if (wants('new')) {
  // A new player: the field they land on, and the three things the first tutorial has them do.
  await load(null);
  await visit('new player landing', 200);
  let r = await step('tap');
  await visit('new player tap');
  await click(r.x + r.w / 2, r.y + r.h / 2);
  await visit('new player skill called', 300);
  r = await step('open');
  await visit('new player open');
  await click(r.x + r.w / 2, r.y + r.h / 2);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('legion-battles-save')).stats.opened === 1, null, { timeout: 20000 });
  await visit('new player first card', 1300);
  r = await step('place');
  await visit('new player place');
  await click(r.x + r.w / 2, r.y + r.h / 2);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('legion-battles-save')).tutorial.done, null, { timeout: 10000 });
  await visit('new player main', 700);
}

if (wants('early')) {
  // The first field: the main screen, a battle with a skill to call, and a boss's first fall, which says the most a result ever does.
  await load(early());
  await ready();
  await visit('early main');
  await page.evaluate(() => window.game.scene.getScene('Main').fight());
  await battle('early');
  await visit('early result', 2600);
}

if (wants('late')) {
  // The biggest field, where a unit is drawn at two thirds of its size and its plate is not.
  await load(late(51));
  await ready();
  await visit('late main');
  // The card of an enemy, and of one of the player's own in a battle.
  const foe = await page.evaluate(() => {
    const v = window.game.scene.getScene('Main').board.views.find((u) => u.team === 'red');
    return { x: v.x, y: v.y - v.height / 2 };
  });
  await click(foe.x, foe.y);
  await visit('late enemy card');
  await page.evaluate(() => window.game.scene.getScene('Main').fight());
  await battle('late');
  await visit('late result', 2600);
}

if (wants('team')) {
  await load(late(41));
  await ready();
  await overlay('Team', { side: 'units' });
  await visit('team units');
  await click(...tile(2));
  await visit('team card open');
  await press('Team', 'COMBINE');
  await page.waitForFunction(() => window.game.scene.getScene('Team').forge > 0, null, { timeout: 10000 });
  await visit('team forge');
  await press('Team', 'MARK THIS PAGE');
  await visit('team forge marked');
  await press('Team', 'BACK');
  await page.waitForFunction(() => window.game.scene.getScene('Team').forge === 0, null, { timeout: 10000 });
  await page.evaluate(() => window.game.scene.getScene('Team').scene.restart({ side: 'structures' }));
  await visit('team structures', 700);
  await press('Team', 'INDEX');
  await active('Index');
  await visit('index structures');
  await page.evaluate(() => {
    const sc = window.game.scene.getScene('Index');
    sc.registry.set('side', 'units');
    sc.scene.restart();
  });
  await visit('index units', 700);
  // One nobody has met: the Jarl, in the dark.
  await click(96 + 3 * 140, 145 + 3 * 140);
  await visit('index unknown');
  await close('Index');
}

if (wants('shop')) {
  await load(late(41));
  await ready();
  await overlay('Shop');
  await visit('shop');
  const slot = (col, row) => [96 + col * 140, 145 + row * 140];
  // One that is not sold yet, the one the rewards give, and one that is held.
  await click(...slot(3, 2));
  await visit('shop pack not sold');
  await click(...slot(3, 0));
  await visit('shop faithful pack');
  await click(...slot(2, 0));
  await visit('shop royal pack');
  await press('Shop', 'OPEN');
  await visit('shop press to open', 900);
  await click(640, 360);
  await page.waitForFunction(() => !window.game.scene.getScene('Shop').busy, null, { timeout: 30000 });
  await visit('shop card', 700);
  await press('Shop', 'DONE');
  await page.waitForTimeout(600);
  await click(...slot(1, 1));
  await page.waitForTimeout(300);
  await press('Shop', 'OPEN 10');
  await page.waitForTimeout(900);
  await click(640, 360);
  await visit('shop cards dealt', 1500);
  await page.waitForFunction(() => !window.game.scene.getScene('Shop').busy, null, { timeout: 60000 });
  await visit('shop ten cards', 700);
  await press('Shop', 'DONE');
  await page.waitForTimeout(600);
  await close('Shop');
}

if (wants('map')) {
  await load(late(41));
  await ready();
  await mark('Main', 'stages');
  await active('Map');
  await visit('map', 1200);
  // The first world, which is behind them, and a difficulty that is shut.
  await page.evaluate(() => window.game.scene.getScene('Map').scene.restart({ world: 0 }));
  await visit('map first world', 1200);
  await page.evaluate(() => window.game.scene.getScene('Map').scene.restart({ world: 9 }));
  await visit('map shut world', 1200);
  await close('Map');
}

if (wants('player')) {
  await load(late(41));
  await ready();
  await overlay('Player');
  await visit('player skills');
  await page.evaluate(() => window.game.scene.getScene('Player').scene.restart({ page: 'upgrades' }));
  await visit('player upgrades', 700);
  await close('Player');
}

if (wants('hall')) {
  await load(late(41, { raids: { warcamp: 1 } }));
  await ready();
  await overlay('Hall', { kind: 'dungeon' });
  await visit('hall of dungeons');
  await close('Hall');
  await overlay('Hall', { kind: 'raid' });
  await visit('hall of raids');
  await close('Hall');
  // A dungeon: its camp, a floor of it, and the camp again with what each card has left.
  await overlay('Hall', { kind: 'dungeon' });
  await press('Hall', 'ENTER');
  await page.waitForFunction(() => window.game.scene.isActive('Venture') && window.game.scene.getScene('Venture').state === 'camp', null, { timeout: 30000 });
  await visit('dungeon camp', 1200);
  await press('Venture', 'FIGHT');
  await page.waitForFunction(() => window.game.scene.getScene('Venture').state === 'fighting', null, { timeout: 10000 });
  await battle('dungeon', 'Venture');
  await visit('dungeon after a floor', 900);
}

if (wants('rewards')) {
  await load(late(41));
  await ready();
  await visit('main with a reward waiting');
  await overlay('Rewards');
  await visit('rewards');
  await close('Rewards');
}

if (wants('settings')) {
  await load(late(41));
  await ready();
  await overlay('Settings');
  await visit('settings');
  await press('Settings', 'START OVER');
  await visit('settings start over', 300);
  await press('Settings', 'KEEP PLAYING');
  await page.evaluate(() => window.game.scene.getScene('Settings').scene.restart({ page: 'guides' }));
  await visit('settings tutorials', 700);
  await close('Settings');
}

if (wants('tours')) {
  // Every step of every tour, started as the list in the settings starts one.
  const SCREENS = ['Settings', 'Rewards', 'Hall', 'Player', 'Shop', 'Team', 'Map', 'Main'];
  for (const id of ['basics', 'packs', 'team', 'dungeons', 'raids', 'skills', 'upgrades', 'structures']) {
    await load(late(41, { cleared: 60, at: 41, coins: 90000 }));
    await ready();
    await page.evaluate((tour) => {
      window.legible.startTour(tour);
      const m = window.game.scene.getScene('Main');
      m.guide.refresh();
      m.guideChanged();
    }, id);
    let last = '';
    for (let i = 0; i < 40; i++) {
      const g = await page.evaluate((screens) => {
        const top = screens.find((key) => window.game.scene.isActive(key));
        const guide = top ? window.game.scene.getScene(top).guide : null;
        const up = window.game.scene.getScene('Main').tourUp();
        if (!up) return { over: true };
        if (!guide?.step) return { waiting: true };
        let button = null;
        if (guide.step.ok) {
          const b = guide.drawn.filter((o) => o.type === 'Container').pop();
          button = b ? { x: b.x, y: b.y } : null;
        }
        return { id: guide.step.id, n: guide.step.n, rect: guide.rect, button };
      }, SCREENS);
      if (g.over) break;
      if (g.waiting || g.id === last) {
        await page.waitForTimeout(200);
        continue;
      }
      last = g.id;
      await visit(`tours ${id} ${g.n}`, 350);
      if (g.button) await click(g.button.x, g.button.y);
      else await click(g.rect.x + g.rect.w / 2, g.rect.y + g.rect.h / 2);
      await page.waitForTimeout(300);
    }
  }
}

// ------------------------------------------------------------ what it found

console.log(`${vw} by ${vh} at ${dpr} to a pixel: ${visits} screens, ${counted} words measured, the floor ${FLOOR} px`);
if (small.length > 0) {
  small.sort((a, b) => a.px - b.px);
  console.log(`\n${small.length} too small to read:`);
  for (const w of small) {
    const more = w.places.size > 1 ? `, and on ${w.places.size - 1} more` : '';
    console.log(`  ${w.px.toFixed(1).padStart(5)} px  ${w.scene.padEnd(9)} "${w.said}"  (written at ${w.size}; on "${w.at}"${more})`);
  }
}
if (errors.length) console.log(`\nthe page threw:\n  ${errors.slice(0, 6).join('\n  ')}`);
await browser.close();
if (small.length > 0 || errors.length > 0) process.exit(1);
console.log('every word can be read');
