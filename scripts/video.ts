// npm run video:film [sheet] [shot ...]
//
// Films the game for its preview video: the clip a portal plays when a
// player rests on the game's cover. It needs the dev server (npm run dev)
// and Playwright. What it makes goes to build/video, which is not kept in
// the repository; scripts/videocut.ts cuts the video from it.
//
// The game is played for real, in a browser, by a player well into it whose
// save is made here with the game's own rules. But the clock is this
// script's: the page's time stands still, and is moved on 16 thousandths of
// a second at a time, which is one frame of the game. After every second
// frame the screen is photographed. So each picture of the film is one
// thirtieth of a second of the game, however slowly this machine draws it,
// and a film made twice is the same film. A portal asks that a preview is
// not sped up: nothing here is. (Two frames of the game are 32 thousandths
// and a frame of the film is shown for 33, so the film runs a twenty-fifth
// slower than the game.)
//
// The screen is drawn at 2880 by 1620, two and a quarter times its layout:
// the landscape video is cut from that at up to one and a half times closer
// without a pixel being stretched, and the portrait video, 1080 by 1620, is
// a slice of it at full height.
//
// A shot is a save and a few lines that say what the player does. `sheet`
// plays the shots small and lays every half second of each side by side
// (build/video/sheets), which is how the moment to film is chosen.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { addCard } from '../src/game/cards';
import { bestTeam, startingSave } from '../src/game/rules';
import type { SaveData } from '../src/game/state';

const require = createRequire(import.meta.url);
// Playwright is the machine's, not the project's, and comes without its types here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const { chromium } = require('playwright') as { chromium: Any };

const BASE = process.env.URL ?? 'http://127.0.0.1:5173/';
/** Where the film goes. OUT=somewhere puts it elsewhere, to set two films side by side. */
const OUT = path.resolve(process.env.OUT ?? 'build/video');
/** One frame of the game, in thousandths of a second, as the page's stopped clock gives them. */
const STEP = 16;
/** Frames of the game to a frame of the film. */
const PER = 2;
/** Frames of the film to a second. */
export const FPS = 30;
/** How many times its layout the screen is drawn at for the film. */
const SCALE = 2.25;

/**
 * The frames that are not filmed are played and not drawn: a battle's first half minute is then got through in a
 * tenth of the time. A film made so was set beside one made with every frame drawn, and they were the same but
 * for the last bit of a pixel here and there (51 dB between them). FAST=0 draws every frame all the same.
 */
const FAST = process.env.FAST !== '0';

const TOURS = ['basics', 'packs', 'team', 'dungeons', 'raids', 'skills', 'upgrades', 'structures'].map((id) => `tour:${id}`);

/** The eight who fight and the three things built: one of each kind of fighter, so that a battle shows blades, arrows, spells and mending. */
const LEGION = ['paladin', 'knight', 'berserker', 'honorguard', 'mage', 'archer', 'cleric', 'frostwitch', 'watchtower', 'barracks', 'warbanner'];

/**
 * A player well into the game, about to fight a stage. Every card stands at
 * one grade and level, chosen for the stage with the game's own battle rules
 * (runBattle) so that the fight is long, close and won.
 */
function player(at: number, grade: number, level: number, more: (save: SaveData) => void = () => {}): SaveData {
  const save = startingSave(7);
  save.cards = [];
  save.met = [];
  save.nextCard = 1;
  for (const unit of LEGION) addCard(save, unit, grade).level = level;
  // Far enough along the line for all eight places and all three structures' places.
  save.cleared = Math.max(at, 110);
  save.at = at;
  save.coins = 23450;
  save.packs = {};
  save.stats = { battles: 412, wins: 371, opened: 96 };
  save.player = { level: 14, xp: 120 };
  save.tutorial = { done: true, seen: [...TOURS], at: 412, tour: null };
  save.speed = 1;
  save.auto = true;
  more(save);
  save.team = bestTeam(save);
  return save;
}

/** What a shot can do. Every wait is in seconds of the game. */
interface Film {
  page: Any;
  /** Lets the game run on without photographing it. */
  skip(seconds: number): Promise<void>;
  /** Lets the game run on, photographing it. */
  film(seconds: number): Promise<void>;
  /** Runs on until something is true of the page, photographing or not. Fails after `most` seconds. */
  until(what: string, test: () => boolean, most: number, filmed?: boolean): Promise<void>;
  /** Presses at a place on the game's layout. */
  click(x: number, y: number): Promise<void>;
  /** Presses the button of a screen that says this. */
  press(scene: string, text: string): Promise<void>;
  /** Runs something in the page. */
  run<T>(fn: () => T): Promise<T>;
  /** Seconds of the game played so far in the shot. */
  clock(): number;
  /** How many frames have been filmed so far: the number the next one gets. */
  frames(): number;
}

interface Shot {
  name: string;
  save: () => SaveData;
  play: (f: Film, whole: boolean) => Promise<void>;
  /** True for a short shot of a menu: its sheet keeps a picture every sixth of a second, not every half. */
  fine?: boolean;
}

/**
 * A battle's shot. On a sheet the whole fight is played, with a little of
 * the result after it, and it says how long the fight was. For the film,
 * only the parts chosen from the sheet, each from so many seconds into the
 * fight and for so many seconds; and, if `end` is given, from so many
 * seconds in until the result comes up and for so many seconds of that. A
 * fight is the same fight every time, so what a sheet showed at a moment is
 * what the film has at it.
 */
function battle(parts: Array<[from: number, seconds: number]>, end?: [from: number, after: number]): Shot['play'] {
  return async (f, whole) => {
    await f.skip(0.4);
    await f.run(() => main().fight());
    const began = f.clock();
    if (whole) {
      await f.until('the battle ends', () => main().state === 'after', 120, true);
      console.log(`video: the result came up ${(f.clock() - began).toFixed(1)} seconds after the fight began`);
      await f.film(2.5);
      return;
    }
    for (const [from, seconds] of parts) {
      await f.skip(from - (f.clock() - began));
      console.log(`video: the part from ${from} s starts at frame ${f.frames()}`);
      await f.film(seconds);
    }
    if (end) {
      await f.skip(end[0] - (f.clock() - began));
      console.log(`video: the end starts at frame ${f.frames()}`);
      await f.until('the battle ends', () => main().state === 'after', 30, true);
      console.log(`video: the result comes up at frame ${f.frames()}`);
      await f.film(end[1]);
    }
  };
}

/** More cards than the legion: a hand worth leafing through on the screen of units. */
const SPARE: Array<[string, number, number]> = [
  ['colossus', 5, 14], ['jarl', 4, 11], ['warlord', 4, 12], ['pyromancer', 3, 9], ['hexer', 4, 10], ['skald', 3, 8], ['drummer', 3, 9],
  ['icegolem', 2, 7], ['herald', 3, 8], ['blacksmith', 4, 10], ['militia', 2, 6], ['lancer', 1, 4], ['huscarl', 2, 5], ['spiketrap', 3, 6],
];

/**
 * The main screen and any other, by name. These are the page's own: what a
 * shot hands to `run` and `until` is carried to the page and runs there,
 * where nothing of this script is. `play` puts them in the page before the
 * game starts.
 */
declare function main(): Any;
declare function scene(key: string): Any;

const SHOTS: Shot[] = [
  {
    // Six packs of the Dunes at one press. The roller stands where it turns over two commons, an uncommon, two
    // rares and the Colossus (found by trying its states with the game's own openPacks); the game keeps the best for last.
    name: 'packs',
    fine: true,
    save: () =>
      player(36, 4, 12, (s) => {
        s.packs = { 'dunes@2': 6 };
        s.rng = 13;
      }),
    play: async (f) => {
      await f.skip(0.4);
      await f.press('Main', 'PACKS');
      await f.until('the packs are open', () => (window as Any).game.scene.isActive('Shop'), 5);
      await f.skip(0.6);
      await f.film(0.7);
      await f.press('Shop', 'OPEN 6');
      await f.film(0.6);
      await f.click(640, 340);
      await f.film(0.3);
      await f.until('every card is turned', () => !scene('Shop').busy, 20, true);
      await f.film(1.5);
    },
  },
  {
    // The screen of units: three of the legion stand on the field, and FILL TEAM sets out the rest.
    name: 'team',
    fine: true,
    save: () => {
      const s = player(36, 4, 12, (save) => {
        for (const [unit, grade, level] of SPARE) addCard(save, unit, grade).level = level;
      });
      s.team = s.team.slice(0, 3);
      return s;
    },
    play: async (f) => {
      await f.skip(0.4);
      await f.press('Main', 'UNITS');
      await f.until('the units are open', () => (window as Any).game.scene.isActive('Team'), 5);
      await f.skip(0.5);
      await f.film(0.6);
      await f.press('Team', 'FILL TEAM');
      await f.film(1.6);
    },
  },
  {
    // The first land, on its small field, where everyone is big: the Warlord's stage, with a legion a little too weak for comfort.
    name: 'meadow',
    save: () => player(9, 1, 4),
    play: battle([[6.2, 4.4]]),
  },
  {
    // The second land: the Colossus.
    name: 'dunes',
    save: () => player(21, 3, 10),
    play: battle([[4.8, 4.4]]),
  },
  {
    // The third land: the Jarl falls, and the result comes up.
    name: 'frost',
    save: () => player(36, 4, 12),
    play: battle([[2.8, 4], [26, 3.2]], [39.3, 2.8]),
  },
];

async function play(browser: Any, shot: Shot, sheet: boolean): Promise<void> {
  const scale = sheet ? 0.5 : SCALE;
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: scale });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e: Error) => errors.push(e.message));
  await page.clock.install();
  // As text, so that nothing of this script's making is in it. `__name` is the one thing of tsx's that a function
  // carried to the page still asks for: tsx wraps every named function in it, and the page has none.
  await context.addInitScript(`
    window.__name = (fn) => fn;
    window.main = () => window.game.scene.getScene('Main');
    window.scene = (key) => window.game.scene.getScene(key);
  `);
  // The save goes in before the game reads it.
  await page.goto(BASE);
  await page.evaluate((s: SaveData) => localStorage.setItem('legion-battles-save', JSON.stringify(s)), shot.save());
  await page.goto(`${BASE}?res=${sheet ? 1 : SCALE}`);
  await page.waitForFunction(() => {
    const g = (window as Any).game;
    return g?.scene?.isActive('Main') && g.scene.getScene('Main').state === 'ready';
  }, null, { timeout: 90000 });
  // From here the page's clock stands still, and moves only when this script moves it.
  await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 1000));

  const dir = path.join(OUT, sheet ? 'small' : 'frames', shot.name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  let frames = 0;
  let played = 0;
  /** In a sheet, one frame in fifteen is kept: one every half second. */
  const every = sheet ? (shot.fine ? 5 : 15) : 1;
  const step = async (filmed: boolean): Promise<void> => {
    await page.clock.runFor(STEP * PER);
    played++;
    if (filmed && played % every === 0) {
      await page.screenshot({ path: path.join(dir, `f-${String(frames).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
      frames++;
    }
  };
  const run = async (seconds: number, filmed: boolean): Promise<void> => {
    const n = Math.round(seconds * FPS);
    if (!filmed) {
      // Nobody sees an unfilmed frame, so it is played and not drawn: the game's scenes move on as ever and
      // only their drawing is left out, which is nine tenths of the wait at this size.
      if (FAST) await page.evaluate(() => {
        const g = (window as Any).game;
        g.sceneRender = g.scene.render;
        g.scene.render = () => {};
      });
      // And they go by a second at a time: one call, not thirty.
      for (let left = n; left > 0; left -= FPS) {
        const now = Math.min(FPS, left);
        await page.clock.runFor(STEP * PER * now);
        played += now;
      }
      if (FAST) await page.evaluate(() => {
        const g = (window as Any).game;
        g.scene.render = g.sceneRender;
      });
      return;
    }
    for (let i = 0; i < n; i++) await step(true);
  };
  const film: Film = {
    page,
    skip: (seconds) => run(seconds, false),
    film: (seconds) => run(seconds, true),
    until: async (what, test, most, filmed = false) => {
      for (let i = 0; i < most * FPS; i++) {
        if (await page.evaluate(test)) return;
        await step(filmed);
      }
      throw new Error(`${shot.name}: waited ${most} seconds and not yet: ${what}`);
    },
    click: async (x, y) => {
      const p = await page.evaluate(([a, b]: number[]) => (window as Any).screenOf?.(a, b) ?? { x: a, y: b }, [x, y]);
      await page.mouse.click(p.x, p.y);
    },
    press: async (scene, text) => {
      const at = await page.evaluate(([k, t]: string[]) => {
        const sc = (window as Any).game.scene.getScene(k);
        const hits: Array<{ x: number; y: number }> = [];
        const walk = (list: Any[], ox: number, oy: number): void => {
          for (const o of list) {
            if (o.type !== 'Container' || !o.visible) continue;
            if (o.list.some((c: Any) => typeof c.text === 'string' && c.text.trim() === t)) hits.push({ x: ox + o.x, y: oy + o.y });
            walk(o.list, ox + o.x, oy + o.y);
          }
        };
        walk(sc.children.list, 0, 0);
        return hits[0] ?? null;
      }, [scene, text]);
      if (!at) throw new Error(`${shot.name}: no button says "${text}" on ${scene}`);
      await film.click(at.x, at.y);
    },
    run: (fn) => page.evaluate(fn),
    clock: () => played / FPS,
    frames: () => frames,
  };

  const began = Date.now();
  await shot.play(film, sheet);
  if (errors.length > 0) throw new Error(`${shot.name}: the page threw: ${errors.join('; ')}`);
  await context.close();
  console.log(`video: ${shot.name}: ${frames} ${sheet ? 'small pictures' : 'frames'} of ${(played / FPS).toFixed(1)} seconds, in ${((Date.now() - began) / 1000).toFixed(0)} s`);

  if (sheet) {
    // The pictures side by side, ten to a row, with nothing written on them: the first is half a second in (a sixth, in a menu's shot), and they are read like a page.
    const sheets = path.join(OUT, 'sheets');
    fs.mkdirSync(sheets, { recursive: true });
    const { execFileSync } = await import('node:child_process');
    const rows = Math.ceil(frames / 10);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-start_number', '0', '-i', path.join(dir, 'f-%05d.jpg'), '-vf', `scale=320:-1,tile=10x${rows}`, '-frames:v', '1', '-q:v', '3', path.join(sheets, `${shot.name}.jpg`)]);
    console.log(`video: build/video/sheets/${shot.name}.jpg`);
  }
}

const args = process.argv.slice(2);
const sheet = args.includes('sheet');
const names = args.filter((a) => a !== 'sheet');
const unknown = names.filter((n) => !SHOTS.some((s) => s.name === n));
if (unknown.length > 0) {
  console.error(`video: no shot named ${unknown.join(', ')}. There are: ${SHOTS.map((s) => s.name).join(', ')}`);
  process.exit(1);
}
const browser = await chromium.launch();
try {
  for (const shot of SHOTS) if (names.length === 0 || names.includes(shot.name)) await play(browser, shot, sheet);
} finally {
  await browser.close();
}
