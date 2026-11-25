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
    for (const key of ['Title', 'Hud', 'Result', 'Lair', 'Lodge']) w.game.scene.stop(key);
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
    h.hunter.x = h.monster.x - 172;
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

/** The attacks of the four bosses that came after the King. */
const LATER: Array<[string, number, string]> = [
  ['spinner', 0, 'bite'], ['spinner', 0, 'spit'], ['spinner', 0, 'drop'], ['spinner', 0, 'legs'], ['spinner', 1, 'brood'], ['spinner', 1, 'webfield'], ['spinner', 2, 'frenzy'],
  ['abbot', 0, 'crook'], ['abbot', 0, 'toll'], ['abbot', 0, 'censer'], ['abbot', 0, 'procession'], ['abbot', 1, 'peal'], ['abbot', 2, 'drown'], ['abbot', 2, 'knell'],
  ['furnace', 0, 'press'], ['furnace', 0, 'vent'], ['furnace', 0, 'slag'], ['furnace', 0, 'cinders'], ['furnace', 1, 'spokes'], ['furnace', 2, 'pour'],
  ['mirror', 0, 'cut'], ['mirror', 0, 'shards'], ['mirror', 0, 'step'], ['mirror', 1, 'lure'], ['mirror', 1, 'shatter'], ['mirror', 2, 'crown'],
];

const STATES: Record<string, (page: Page, shot: (name: string) => Promise<void>) => Promise<void>> = {
  // The four bosses that came after the King, and the four hunters they open: each later hunter in each later lair as
  // it wakes, then the later bosses' attacks.
  later: async (page, shot) => {
    const pairs: Array<[string, string]> = [['spinner', 'greta'], ['abbot', 'ned'], ['furnace', 'ida'], ['mirror', 'silas']];
    for (const [monster, hunter] of pairs) {
      await lair(page, { monster, mark: 1, hunter, reinforcements: [], buildings: [], awake: true });
      await tick(page, 60 * 4);
      await shot(`later-${monster}-${hunter}`);
    }
    for (const [monster, part, attack] of LATER) {
      await tell(page, monster, part, attack);
      await shot(`tell-${monster}-${attack}`);
    }
  },
  // What someone who has never played sees: the title, PLAY, and the first hunt, which teaches. A picture at each step
  // of the lesson with its plate up (and its warning on the ground where it has one), then the win and the lodge after.
  first: async (page, shot) => {
    await shot('title');
    const play = await find(page, 'Title', 'PLAY');
    if (play) await page.mouse.click(play.x, play.y);
    await until(page, 'Hud');
    await tick(page, 50);
    await shot('lesson-1-move');
    const step = (): Promise<string> => page.evaluate(() => (window as unknown as Win).hunt()?.teaching?.step.id ?? '');
    const shown = (): Promise<boolean> => page.evaluate(() => {
      const h = (window as unknown as Win).hunt();
      return !!h && h.tells.some((t) => t.of - t.left > 0.5);
    });
    let n = 1;
    let last = await step();
    for (let f = 0; f < 60 * 240; f++) {
      // The bot plays; when a new step comes up it stands still until the step's warning shows, for the picture.
      const now = await step();
      if (now !== last) {
        last = now;
        n++;
        if (!now) break;
        await page.evaluate(() => (window as unknown as Win).pilot(false));
        const attack = await page.evaluate(() => !!(window as unknown as Win).hunt()?.teaching?.step.attack);
        for (let w = 0; w < (attack ? 900 : 30); w++) {
          await tick(page, 1);
          if (attack && (await shown())) break;
        }
        await shot(`lesson-${n}-${now}`);
      }
      await page.evaluate(() => (window as unknown as Win).pilot(true));
      await tick(page, 1);
    }
    await page.evaluate(() => (window as unknown as Win).pilot(false));
    await tick(page, 40);
    await shot('lesson-after');
    await page.evaluate(() => (window as unknown as Win).pilot(true));
    for (let f = 0; f < 60 * 240; f += 20) {
      await tick(page, 20);
      if (await page.evaluate(() => !!(window as unknown as Win).hunt()?.over)) break;
    }
    await page.evaluate(() => (window as unknown as Win).pilot(false));
    await tick(page, 60 * 3);
    await until(page, 'Result');
    await tick(page, 20);
    await shot('lesson-won');
    const lodge = await find(page, 'Result', 'THE LODGE');
    if (lodge) await page.mouse.click(lodge.x, lodge.y);
    await until(page, 'Lodge');
    await tick(page, 20);
    await shot('lodge-second-hunt');
    const team = await find(page, 'Lodge', 'TEAM');
    if (team) await page.mouse.click(team.x, team.y);
    await tick(page, 20);
    await shot('team-second-hunt');
    const hunt = await find(page, 'Lodge', 'HUNT');
    if (hunt) await page.mouse.click(hunt.x, hunt.y);
    await until(page, 'Hud');
    await tick(page, 40);
    await shot('second-hunt-camp');
  },
  // The lodge: the board with one contract posted, then with more, the muster and the ledger.
  lodge: async (page, shot) => {
    await lodge(page, 'board', { hunts: 1, wins: 0, coin: 12, opening: 0 });
    await shot('board-new');
    await lodge(page, 'board', RICH);
    await shot('board');
    // The team: the inn, once its people are in; then one of them pressed, which opens what they do and the loadout.
    const people = async (): Promise<void> => {
      for (let i = 0; i < 80 && !(await find(page, 'Lodge', 'BRASK')); i++) {
        await page.clock.runFor(50);
        await new Promise((r) => setTimeout(r, 30));
      }
      await tick(page, 90);
    };
    await lodge(page, 'muster', RICH);
    await people();
    await shot('inn');
    await lodge(page, 'muster', { ...RICH, felled: {}, trophies: [], worn: {} });
    await people();
    await shot('inn-new');
    await lodge(page, 'muster', RICH);
    await people();
    const jory = await find(page, 'Lodge', 'JORY');
    if (jory) await page.mouse.click(jory.x, jory.y);
    await tick(page, 30);
    await shot('muster');
    const at = await find(page, 'Lodge', 'BALLISTA');
    if (at) await page.mouse.click(at.x, at.y);
    await tick(page, 12);
    await shot('muster-note');
    await lodge(page, 'muster', { opening: 2, hunts: 2, wins: 1, coin: 42, trophies: ['spade'], felled: {}, worn: {}, steps: [], supply: 0, muster: { hunter: 'marta', reinforcements: ['pikemen'], buildings: { barricade: 1 }, partners: [] } });
    await shot('muster-new');
    await lodge(page, 'ledger', RICH);
    await shot('ledger');
  },
  // Setting camp: everything that can be built, half of it down.
  camp: async (page, shot) => {
    await lair(page, { monster: 'king', mark: 1, hunter: 'jory', reinforcements: [{ id: 'crossbowmen', charges: 1 }], buildings: [{ id: 'barricade', n: 2 }, { id: 'watchfire', n: 1 }, { id: 'bellpost', n: 1 }, { id: 'ballista', n: 1 }] }, RICH);
    await tick(page, 20);
    await shot('camp');
    // A card picked up: its ghost stands where the pointer is, with its reach; then set down there with a click.
    const card = await find(page, 'Hud', 'BALLISTA');
    if (card) await page.mouse.click(card.x, card.y);
    const vp = page.viewportSize() ?? { width: 907, height: 510 };
    await page.mouse.move(vp.width * 0.42, vp.height * 0.6);
    await tick(page, 6);
    await shot('camp-ghost');
    await page.mouse.click(vp.width * 0.42, vp.height * 0.6);
    await tick(page, 12);
    await shot('camp-placed');
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
  // A contract's hunt with partners: their plates and the task strip, the villagers to keep, then the cart and its road.
  party: async (page, shot) => {
    await lair(page, { monster: 'sexton', mark: 2, hunter: 'marta', partners: ['brask', 'agnes'], reinforcements: [], buildings: [], terms: { variants: [], tasks: [{ id: 'villagers', n: 2 }, { id: 'together', n: 4 }, { id: 'careful', n: 3 }] } }, RICH);
    await pilot(page, 30);
    await shot('party-villagers');
    await lair(page, { monster: 'king', mark: 2, hunter: 'jory', partners: ['marta'], reinforcements: [], buildings: [], terms: { variants: [], tasks: [{ id: 'cart' }, { id: 'breaks', n: 2 }] } }, RICH);
    await pilot(page, 20);
    await shot('party-cart');
    // The cart and its road: the hunter stood by it, so that the camera looks there.
    await page.evaluate(() => {
      const h = (window as unknown as Win).hunt() as unknown as { hunter: { x: number; y: number }; buildings: Array<{ x: number; y: number; def: { id: string } }> };
      const cart = h.buildings.find((b) => b.def.id === 'cart');
      if (cart) [h.hunter.x, h.hunter.y] = [cart.x + 70, cart.y + 40];
    });
    await tick(page, 40);
    await shot('party-cart-road');
  },
  // The two ways of playing in a hunt: by touch (the stick, ATTACK and the arc, a skill being aimed by a drag, with
  // the cancel mark, and ATTACK dragged), and by mouse and keys (a skill's key held, its shape at the pointer).
  thumbs: async (page, shot) => {
    await lair(page, { monster: 'sexton', mark: 1, hunter: 'jory', reinforcements: [{ id: 'pikemen', charges: 1 }], buildings: [], awake: true }, RICH);
    await pilot(page, 5);
    const set = (o: Record<string, unknown>): Promise<void> =>
      page.evaluate((v) => {
        const hud = (window as unknown as Win).game.scene.getScene('Hud') as unknown as { controls: Record<string, unknown>; rescheme(): void };
        const c = hud.controls;
        if (v.scheme && v.scheme !== c.scheme) {
          c.scheme = v.scheme;
          hud.rescheme();
        }
        for (const k of ['skillDrag', 'attackDrag', 'dodgeDrag', 'holding', 'mouse']) if (k in v) c[k] = v[k];
      }, o);
    await set({ scheme: 'touch' });
    await tick(page, 4);
    await shot('thumbs');
    const atk = await page.evaluate(() => {
      const hud = (window as unknown as Win).game.scene.getScene('Hud') as unknown as { atk: { x: number; y: number } | null };
      return hud.atk ? { x: hud.atk.x, y: hud.atk.y } : { x: 0, y: 0 };
    });
    await set({ skillDrag: { id: 99, i: 1, x0: atk.x - 110, y0: atk.y - 110, x: atk.x - 200, y: atk.y - 160 } });
    await tick(page, 2);
    await shot('thumbs-aim');
    await set({ skillDrag: null, attackDrag: { id: 98, x0: atk.x, y0: atk.y, x: atk.x - 60, y: atk.y + 30 } });
    await tick(page, 2);
    await shot('thumbs-attack');
    await set({ attackDrag: null, scheme: 'mouse' });
    const size = page.viewportSize() as { width: number; height: number };
    await page.mouse.move(size.width * 0.62, size.height * 0.45);
    await set({ holding: 1 });
    await tick(page, 2);
    await shot('keys-aim');
    await set({ holding: null });
  },
  // A line said in a hunt: the boss's own by it, the hunter's over her head, and something heard from the King.
  talk: async (page, shot) => {
    const say = (who: string, when: string): Promise<void> =>
      page.evaluate(([w, n]) => {
        const lair = (window as unknown as Win).game.scene.getScene('Lair') as unknown as { talk: { drop(): void; offer(who: string, when: string): void } };
        lair.talk.drop();
        lair.talk.offer(w, n);
      }, [who, when] as const);
    await lair(page, { monster: 'sexton', mark: 1, hunter: 'marta', reinforcements: [], buildings: [], awake: true }, RICH);
    await pilot(page, 4);
    await say('sexton', 'change');
    await tick(page, 12);
    await shot('talk-boss');
    await say('marta', 'break');
    await tick(page, 12);
    await shot('talk-hunter');
    await lair(page, { monster: 'king', mark: 1, hunter: 'jory', reinforcements: [], buildings: [], awake: true }, RICH);
    await pilot(page, 4);
    await say('king', 'change');
    await tick(page, 12);
    await shot('talk-heard');
  },
  // Every attack of every monster, with its tell half shown: this is what a player has to read.
  tells: async (page, shot) => {
    const all: Array<[string, number, string]> = [
      ['sexton', 0, 'spade'], ['sexton', 0, 'sweep'], ['sexton', 0, 'graves'], ['sexton', 0, 'grasp'], ['sexton', 1, 'furrow'], ['sexton', 1, 'lantern'], ['sexton', 1, 'cross'],
      ['sexton', 2, 'bury'], ['sexton', 2, 'moregraves'],
      ['king', 0, 'charge'], ['king', 0, 'gore'], ['king', 0, 'stomp'], ['king', 0, 'bellow'], ['king', 1, 'thorns'], ['king', 2, 'herd'], ['king', 2, 'crossherd'],
      ...LATER,
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
    // Near death: the bar drains after a blow, the screen's edge is red.
    await page.evaluate(() => {
      const h = (window as unknown as Win).hunt();
      if (h) h.hunter.hp = Math.round(h.hunter.maxHp * 0.22);
    });
    await tick(page, 4);
    await shot('state-low');
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
    await lair(page, { monster: 'sexton', mark: 1, hunter: 'marta', awake: true }, { opening: 3, hunts: 3, wins: 1, trophies: [], felled: {}, coin: 0 });
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
  // The game has to have loaded before a state can be stood up in it: a new player lands on the title, so that is waited for.
  await until(page, 'Title');
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
