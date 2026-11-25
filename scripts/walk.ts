// npm run walk [state ...] [--size=frame,small,full,phone-wide,phone-tall]
//
// With `npm run dev` running: pictures of the game in every state a player
// meets, at the sizes a portal shows it in, to build/walk. Read them after
// any change a player will see: most of what goes wrong is layout.
//
// A state is set up by standing a hunt up as it should be (window.stage)
// and starting the screen for it. Time is stepped by this script, one
// frame of the game at a time: the headless browser draws too few frames a
// second for real time to mean anything.

import fs from 'node:fs';

import { chromium, open, type Page } from './browser';
import { RICH, find, lair, pilot, tick, until, type Win } from './drive';

const args = process.argv.slice(2);
const want = args.filter((a) => !a.startsWith('--'));
const sizeArg = args.find((a) => a.startsWith('--size='))?.slice(7);
/** A portal's small frame, its smallest, a full screen, a phone on its side, and a phone upright. */
const SIZES: Array<[string, number, number, number]> = [
  ['frame', 907, 510, 1],
  ['small', 821, 462, 1],
  ['full', 1920, 1080, 1],
  ['phone-wide', 844, 390, 2],
  ['phone-tall', 390, 844, 2],
];
const sizes = sizeArg ? SIZES.filter((s) => sizeArg.split(',').includes(s[0]) || sizeArg.split(',').includes(`${s[1]}x${s[2]}`)) : SIZES.slice(0, 1);
const out = 'build/walk';
fs.mkdirSync(out, { recursive: true });
const base = process.env.URL ?? 'http://127.0.0.1:5180/';

const lodge = async (page: Page, leaf: string, save: Record<string, unknown>): Promise<void> => {
  await page.evaluate(([l, s]) => {
    const w = window as unknown as Win;
    Object.assign(w.save(), s);
    for (const key of ['Hud', 'Result', 'Lair', 'Lodge']) w.game.scene.stop(key);
    w.game.scene.start('Lodge', { leaf: l });
  }, [leaf, save] as const);
  await until(page, 'Lodge');
  await tick(page, 12);
};

/** Has the monster begin the attack named, with the hunter stood off from it, and steps until its tell is half shown. */
const tell = async (page: Page, monster: string, part: number, attack: string): Promise<void> => {
  await lair(page, { monster, mark: 3, hunter: 'marta', reinforcements: [], buildings: [], awake: true });
  await page.evaluate(([p, a]) => {
    const h = (window as unknown as Win).hunt();
    if (!h) return;
    h.monster.part = p as number;
    const round = h.monster.def.parts[p as number];
    (h as unknown as { round: number }).round = Math.max(0, round.indexOf(a as string));
    h.hunter.maxHp = h.hunter.hp = 9999;
    h.hunter.x = h.monster.x - 210;
    h.hunter.y = h.monster.y + 30;
    h.monster.state = 'walk';
    h.monster.left = 0;
  }, [part, attack] as const);
  for (let i = 0; i < 90; i++) {
    await tick(page, 2);
    const half = await page.evaluate(() => {
      const h = (window as unknown as Win).hunt();
      return !!h && h.tells.some((t) => t.left < t.of * 0.45);
    });
    if (half) break;
  }
};

const STATES: Record<string, (page: Page, shot: (name: string) => Promise<void>) => Promise<void>> = {
  // What someone who has never played sees: a lair at once, a camp to set, and how to walk.
  first: async (page, shot) => {
    await until(page, 'Hud');
    await tick(page, 30);
    await shot('first');
    await pilot(page, 9);
    await shot('first-camp');
    await pilot(page, 14);
    await shot('first-hunt');
  },
  // The lodge: the board with one contract posted, then with more, the muster and the ledger.
  lodge: async (page, shot) => {
    await lodge(page, 'board', { hunts: 1, wins: 0, coin: 12 });
    await shot('board-new');
    await lodge(page, 'board', RICH);
    await shot('board');
    await lodge(page, 'muster', RICH);
    await shot('muster');
    const at = await find(page, 'Lodge', 'BALLISTA');
    if (at) await page.mouse.click(at.x, at.y);
    await tick(page, 12);
    await shot('muster-note');
    await lodge(page, 'muster', { hunts: 1, wins: 0, coin: 12, trophies: [], felled: {}, worn: {}, steps: [], supply: 0 });
    await shot('muster-new');
    await lodge(page, 'ledger', RICH);
    await shot('ledger');
  },
  // Setting camp: everything that can be built, half of it down.
  camp: async (page, shot) => {
    await lair(page, { monster: 'king', mark: 1, hunter: 'jory', reinforcements: [{ id: 'crossbowmen', charges: 1 }], buildings: [{ id: 'barricade', n: 2 }, { id: 'watchfire', n: 1 }, { id: 'bellpost', n: 1 }, { id: 'ballista', n: 1 }] }, RICH);
    await tick(page, 20);
    await shot('camp');
    await pilot(page, 7);
    await shot('camp-built');
  },
  // A hunt in its middle, against each monster.
  hunt: async (page, shot) => {
    await lair(page, { monster: 'sexton', mark: 2, hunter: 'marta', reinforcements: [{ id: 'pikemen', charges: 1 }, { id: 'sappers', charges: 1 }], buildings: [{ id: 'barricade', n: 1 }, { id: 'watchfire', n: 1 }, { id: 'ballista', n: 1 }] }, RICH);
    await pilot(page, 34);
    await shot('hunt-sexton');
    await pilot(page, 22);
    await shot('hunt-sexton-later');
    await lair(page, { monster: 'king', mark: 2, hunter: 'brask', reinforcements: [{ id: 'crossbowmen', charges: 1 }], buildings: [{ id: 'barricade', n: 2 }, { id: 'bellpost', n: 1 }] }, RICH);
    await pilot(page, 26);
    await shot('hunt-king');
    await lair(page, { monster: 'king', mark: 2, hunter: 'agnes', reinforcements: [{ id: 'pikemen', charges: 1 }], buildings: [{ id: 'watchfire', n: 1 }] }, RICH);
    await pilot(page, 24);
    await shot('hunt-king-agnes');
  },
  // Every attack of every monster, with its tell half shown: this is what a player has to read.
  tells: async (page, shot) => {
    const all: Array<[string, number, string]> = [
      ['sexton', 0, 'spade'], ['sexton', 0, 'sweep'], ['sexton', 0, 'graves'], ['sexton', 0, 'grasp'], ['sexton', 1, 'furrow'], ['sexton', 1, 'lantern'], ['sexton', 1, 'cross'],
      ['sexton', 2, 'bury'], ['sexton', 2, 'moregraves'],
      ['king', 0, 'charge'], ['king', 0, 'gore'], ['king', 0, 'stomp'], ['king', 0, 'bellow'], ['king', 1, 'thorns'], ['king', 2, 'herd'], ['king', 2, 'crossherd'],
    ];
    for (const [monster, part, attack] of all) {
      await tell(page, monster, part, attack);
      await shot(`tell-${monster}-${attack}`);
    }
  },
  // The monster open, broken, and changing.
  states: async (page, shot) => {
    await lair(page, { monster: 'sexton', mark: 1, hunter: 'marta', reinforcements: [], buildings: [], awake: true }, RICH);
    const put = (state: string, left: number): Promise<void> =>
      page.evaluate(([s, l]) => {
        const h = (window as unknown as Win).hunt();
        if (!h) return;
        h.hunter.x = h.monster.x - 130;
        h.hunter.y = h.monster.y;
        h.monster.state = s as string;
        h.monster.left = l as number;
        if (s === 'broken') h.monster.stagger = h.monster.staggerMax;
      }, [state, left] as const);
    await put('recover', 3);
    await tick(page, 40);
    await shot('state-open');
    await put('broken', 4);
    await tick(page, 50);
    await shot('state-broken');
    await page.evaluate(() => {
      const h = (window as unknown as Win).hunt() as unknown as { harm(n: number, by: string): void; monster: { state: string } } | null;
      if (h) {
        h.monster.state = 'walk';
        h.harm(99999, 'test');
      }
    });
    await tick(page, 45);
    await shot('state-shift');
  },
  // How a hunt ends, both ways.
  result: async (page, shot) => {
    await lair(page, { monster: 'sexton', mark: 1, hunter: 'marta', awake: true }, { hunts: 0, wins: 0, trophies: [], felled: {}, coin: 0 });
    await page.evaluate(() => {
      const h = (window as unknown as Win).hunt();
      if (h) {
        h.monster.part = 2;
        h.monster.hp = 5;
        h.hunter.x = h.monster.x - 110;
        h.hunter.y = h.monster.y;
        h.monster.state = 'recover';
        h.monster.left = 9;
      }
    });
    await tick(page, 60 * 4);
    await until(page, 'Result');
    await tick(page, 20);
    await shot('result-won');
    await lair(page, { monster: 'king', mark: 2, hunter: 'jory', awake: true }, RICH);
    await pilot(page, 8);
    await page.evaluate(() => {
      const h = (window as unknown as Win).hunt() as unknown as { hurtHunter(n: number, by: string): void; hunter: { grace: number } } | null;
      if (h) {
        h.hunter.grace = 0;
        h.hurtHunter(99999, 'charge');
      }
    });
    await tick(page, 60 * 3);
    await until(page, 'Result');
    await tick(page, 20);
    await shot('result-lost');
  },
  // The game held still.
  pause: async (page, shot) => {
    await lair(page, { monster: 'sexton', mark: 1, hunter: 'marta', awake: true }, RICH);
    await pilot(page, 5);
    await page.keyboard.press('KeyP');
    await tick(page, 10);
    await shot('pause');
    await page.keyboard.press('KeyP');
  },
};

const browser = await chromium.launch();
for (const [label, width, height, dpr] of sizes) {
  const { context, page } = await open(browser, { viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: label.startsWith('phone'), isMobile: label.startsWith('phone') });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.clock.install();
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.clock.pauseAt(Date.now() + 1000);
  // The game has to have loaded before a state can be stood up in it: a new player lands in a lair, so that is waited for.
  await until(page, 'Hud');
  const shot = async (name: string): Promise<void> => {
    await page.screenshot({ path: `${out}/${label}-${name}.png` });
  };
  for (const [name, play] of Object.entries(STATES)) {
    if (want.length && !want.includes(name)) continue;
    try {
      await play(page, shot);
    } catch (e) {
      errors.push(`${name}: ${String(e)}`);
    }
  }
  console.log(`walk: ${label} ${width}x${height} done${errors.length ? `\n  errors:\n  ${[...new Set(errors)].slice(0, 8).join('\n  ')}` : ''}`);
  await context.close();
}
await browser.close();
