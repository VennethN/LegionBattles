// npm run walk [state ...] [--size=907x510,...]
//
// With `npm run dev` running: pictures of the game in every state a player
// meets, at the sizes a portal shows it in, to build/walk. Read them after
// any change a player will see: most of what goes wrong is layout.
//
// A state is set up by standing a run up as it should be (window.stage)
// and starting the screen for it. Time is stepped by this script, one
// frame of the game at a time: the headless browser draws too few frames a
// second for real time to mean anything.

import fs from 'node:fs';

import { chromium, open, type Page } from './browser';
import { RICH, THINGS, UPS, arena, fight as fightFrames, find, tick, until, words, type Win } from './drive';

/** Fights for some seconds. */
const fight = (page: Page, seconds: number): Promise<void> => fightFrames(page, Math.round(seconds * 60));

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
const base = process.env.URL ?? 'http://127.0.0.1:5175/';

const STATES: Record<string, (page: Page, shot: (name: string) => Promise<void>) => Promise<void>> = {
  // What someone who has never played sees: the field at once, and how to move.
  first: async (page, shot) => {
    await until(page, 'Hud');
    await tick(page, 20);
    await shot('first');
    await fight(page, 7);
    await shot('first-fight');
  },
  // The list of heroes, with some open and some not, and a run left in its camp.
  title: async (page, shot) => {
    await page.evaluate(() => {
      const w = window as unknown as Win;
      const s = w.save() as { best: Record<string, number>; open: string[]; kills: number; coins: number; runs: number; last: string; told: string[] };
      Object.assign(s, { best: { bram: 9, wren: 4, orrin: 6 }, open: ['orrin', 'fenn'], kills: 420, coins: 260, runs: 5, ended: 5, last: 'orrin', friends: ['biscuit', 'pip', 'mossback', 'quill'], band: ['pip'], told: ['move'] });
      for (const key of ['Hud', 'Camp', 'Result', 'Arena']) w.game.scene.stop(key);
      w.game.scene.start('Title');
    });
    await tick(page, 20);
    await shot('title');
    const cols = (await page.evaluate(() => innerWidth < innerHeight)) ? 3 : 5;
    void cols;
  },
  // A wave in its middle, with every hand full.
  horde: async (page, shot) => {
    await arena(page, { hero: 'bram', wave: 11, weapons: RICH, items: THINGS, ups: UPS, level: 12, gold: 310, fury: 0.9, band: [{ id: 'greta', bond: 1 }, { id: 'pip', bond: 0 }] });
    await until(page, 'Hud');
    await fight(page, 16);
    await shot('horde');
  },
  // The band: a hero with companions beside them, as the wave begins and in the middle of it.
  band: async (page, shot) => {
    await arena(page, { hero: 'aldous', wave: 4, level: 4, weapons: RICH.slice(0, 2), band: [{ id: 'greta', bond: 0 }, { id: 'mossback', bond: 0 }, { id: 'biscuit', bond: 0 }], fury: 0.5 });
    await until(page, 'Hud');
    await tick(page, 40);
    await shot('band');
    await fight(page, 7);
    await shot('band-fight');
  },
  // Each hero's move as it goes off, and a moment after: the ten are told apart by these.
  moves: async (page, shot) => {
    const each: Array<[string, number, Array<{ id: string; bond: number }>]> = [
      ['bram', 5, []], ['wren', 6, []], ['orrin', 9, []], ['fenn', 4, []], ['nan', 13, []],
      ['isaura', 10, []], ['hroth', 7, []], ['aldous', 12, [{ id: 'biscuit', bond: 0 }, { id: 'tam', bond: 0 }]], ['ysolde', 17, []], ['maren', 19, []],
    ];
    // MOVES=bram,nan takes only those.
    const only = (process.env.MOVES ?? '').split(',').filter(Boolean);
    for (const [hero, wave, band] of each) {
      if (only.length && !only.includes(hero)) continue;
      await arena(page, { hero, wave, level: 9, weapons: RICH.slice(1, 3), items: THINGS, ups: UPS, gold: 90, fury: 1, band });
      await until(page, 'Hud');
      // A little of the wave, so that there is someone to use it on; then it is let loose, and seen a few frames in and well in.
      await fight(page, 2.6);
      await page.keyboard.down('Space');
      await tick(page, 2);
      await page.keyboard.up('Space');
      await tick(page, 7);
      await shot(`move-${hero}`);
      await fight(page, 0.45);
      await shot(`move-${hero}-b`);
    }
  },
  // What each quirk looks like while it is on: Bram set behind his shield, Wren untouched, Isaura at speed, Hroth hurt.
  quirks: async (page, shot) => {
    await arena(page, { hero: 'bram', wave: 3, level: 4, weapons: [], gold: 20 });
    await until(page, 'Hud');
    await tick(page, 150);
    await shot('quirk-bram');
    await arena(page, { hero: 'wren', wave: 3, level: 4, weapons: [], gold: 20 });
    await until(page, 'Hud');
    await page.evaluate(() => {
      const w = (window as unknown as Win).world() as unknown as { hero: { safe: number } };
      w.hero.safe = 14;
    });
    await tick(page, 30);
    await shot('quirk-wren');
    await arena(page, { hero: 'isaura', wave: 9, level: 6, weapons: [], gold: 20 });
    await until(page, 'Hud');
    await fight(page, 4);
    await shot('quirk-isaura');
    await arena(page, { hero: 'hroth', wave: 16, level: 8, weapons: [], gold: 20 });
    await until(page, 'Hud');
    await page.evaluate(() => {
      const w = (window as unknown as Win).world() as unknown as { hero: { hp: number; maxHp: number } };
      w.hero.hp = Math.ceil(w.hero.maxHp * 0.25);
    });
    await fight(page, 2);
    await shot('quirk-hroth');
  },
  // Twelve pictures three frames apart of a hero in a fight: laid side by side they show a blow being drawn back, landed and let go.
  swing: async (page, shot) => {
    await arena(page, { hero: process.env.HERO ?? 'bram', wave: 3, level: 4, weapons: [], gold: 20 });
    await until(page, 'Hud');
    await fight(page, 3.2);
    for (let i = 0; i < 12; i++) {
      await fight(page, 0.05);
      await shot(`swing-${String(i).padStart(2, '0')}`);
    }
  },
  // A companion struck down, counted back up.
  down: async (page, shot) => {
    await arena(page, { hero: 'bram', wave: 5, level: 5, weapons: RICH.slice(0, 2), band: [{ id: 'biscuit', bond: 0 }, { id: 'greta', bond: 1 }] });
    await until(page, 'Hud');
    await fight(page, 2);
    await page.evaluate(() => {
      const w = (window as unknown as Win).world() as unknown as { band: Array<{ hp: number; down: number }> };
      w.band[0].hp = 0;
      w.band[0].down = 5;
    });
    await tick(page, 40);
    await shot('down');
  },
  // A boss.
  boss: async (page, shot) => {
    await arena(page, { hero: 'wren', wave: 7, weapons: RICH, items: THINGS, ups: UPS, level: 8, gold: 120 });
    await until(page, 'Hud');
    await fight(page, 9);
    await shot('boss');
  },
  // Snow and sand, to see the grounds.
  lands: async (page, shot) => {
    await arena(page, { hero: 'orrin', wave: 9, weapons: RICH, items: THINGS, ups: UPS, level: 9 });
    await until(page, 'Hud');
    await fight(page, 8);
    await shot('land-desert');
    await arena(page, { hero: 'ysolde', wave: 16, weapons: RICH, items: THINGS, ups: UPS, level: 14 });
    await until(page, 'Hud');
    await fight(page, 8);
    await shot('land-snow');
  },
  // A level's choice, then the wares.
  camp: async (page, shot) => {
    await arena(page, { hero: 'bram', wave: 6, weapons: RICH.slice(0, 4), items: THINGS.slice(0, 7), ups: UPS.slice(0, 3), level: 5, gold: 260, phase: 'level', pending: 1,
      choices: [{ stat: 'maxHp', tier: 0, by: 3 }, { stat: 'haste', tier: 1, by: 10 }, { stat: 'luck', tier: 2, by: 15 }, { stat: 'armor', tier: 3, by: 4 }],
      offers: [
        { kind: 'weapon', id: 'greataxe', tier: 1, price: 73, sold: false, locked: false }, { kind: 'item', id: 'mail', tier: 1, price: 59, sold: false, locked: true },
        { kind: 'weapon', id: 'sword', tier: 2, price: 116, sold: false, locked: false }, { kind: 'item', id: 'crown', tier: 3, price: 229, sold: true, locked: false },
      ] }, { camp: true });
    await until(page, 'Camp');
    await tick(page, 10);
    await shot('level');
    const size = page.viewportSize() as { width: number; height: number };
    await page.mouse.click(size.width * (size.height > size.width ? 0.28 : 0.2), size.height * (size.height > size.width ? 0.3 : 0.55));
    await tick(page, 10);
    await shot('wares');
    // Press the first weapon in hand: its card. Then a thing: its card.
    const place = (pick: 'hand' | 'thing'): Promise<{ x: number; y: number } | null> =>
      page.evaluate((which) => {
        const w = window as unknown as Win;
        const sc = w.game.scene.getScene('Camp') as unknown as { root: { list: Array<{ type: string; x: number; y: number; input?: unknown; width: number; displayWidth?: number }> } };
        // A hand is a pressable slot about sixty across; a thing is a small pressable picture.
        const found = sc.root.list.find((o) => !!o.input && (which === 'hand' ? o.type === 'Container' && o.width > 50 && o.width < 70 : o.type === 'Image' && (o.displayWidth ?? 99) < 30));
        return found ? { x: (found.x * w.view.zoom) / w.view.density, y: (found.y * w.view.zoom) / w.view.density } : null;
      }, pick);
    const hand = await place('hand');
    if (hand) {
      await page.mouse.click(hand.x, hand.y);
      await tick(page, 10);
      await shot('weapon');
      await page.mouse.click(8, 8);
      await tick(page, 10);
    }
    const thing = await place('thing');
    if (thing) {
      await page.mouse.click(thing.x, thing.y);
      await tick(page, 10);
      await shot('thing');
    }
  },
  // The road out of the camp: two roads, then three, then a relic to choose.
  road: async (page, shot) => {
    const base = { hero: 'bram', wave: 6, weapons: RICH.slice(0, 4), items: THINGS.slice(0, 5), level: 5, gold: 120, offers: [] };
    await arena(page, { ...base, phase: 'road', roads: [{ omen: 'champions' }, { omen: 'shrine' }] }, { camp: true });
    await until(page, 'Road');
    await tick(page, 10);
    await shot('road');
    await arena(page, { ...base, phase: 'road', roads: [{ omen: 'wagon' }, { omen: 'stray', stray: 'greta' }, { omen: 'night' }], band: [{ id: 'biscuit', bond: 1 }, { id: 'pip', bond: 0, stray: true }] }, { camp: true });
    await until(page, 'Road');
    await tick(page, 10);
    await shot('road-three');
    await arena(page, { ...base, phase: 'relic', relicsDue: 2, relicChoices: ['stormglass', 'bonedice', 'fallen'] }, { camp: true });
    await until(page, 'Road');
    await tick(page, 10);
    await shot('relic');
  },
  // The camp of a run well on: relics held, kinds built up, a relic among the wares, and the card of the kinds.
  relics: async (page, shot) => {
    await arena(page, { hero: 'bram', wave: 9, weapons: [{ id: 'sword', tier: 2 }, { id: 'halberd', tier: 1 }, { id: 'fang', tier: 1 }, { id: 'torch', tier: 0 }, { id: 'sunbrand', tier: 0 }, { id: 'hail', tier: 0 }],
      items: THINGS.slice(0, 7), ups: UPS.slice(0, 3), level: 9, gold: 400, phase: 'camp',
      relics: ['bellows', 'echobell', 'stormglass', 'ageswhet', 'fallen', 'oldmap', 'seal', 'crown'],
      offers: [
        { kind: 'weapon', id: 'trident', tier: 1, price: 73, sold: false, locked: false }, { kind: 'item', id: 'mail', tier: 1, price: 59, sold: false, locked: true },
        { kind: 'weapon', id: 'holywater', tier: 2, price: 116, sold: false, locked: false }, { kind: 'relic', id: 'spade', tier: 3, price: 140, sold: false, locked: false },
      ] }, { camp: true });
    await until(page, 'Camp');
    await tick(page, 10);
    await shot('relics');
    const at = await words(page, 'Camp', 'Blade');
    if (at) {
      await page.mouse.click(at.x, at.y);
      await tick(page, 10);
      await shot('kinds');
    }
  },
  // What a road puts on the field: the shrine, the cage, the wagon, champions, and the night.
  omens: async (page, shot) => {
    const base = { hero: 'wren', wave: 6, weapons: RICH.slice(0, 4), items: THINGS.slice(0, 6), ups: UPS, level: 8, band: [{ id: 'biscuit', bond: 0 }], relics: ['spade'] };
    const near = (what: 'shrine' | 'thing'): Promise<void> =>
      page.evaluate((which) => {
        const w = (window as unknown as Win).world() as unknown as { hero: { x: number; y: number }; shrine: { x: number; y: number } | null; foes: Array<{ x: number; y: number; def: { prop?: string } }> };
        const to = which === 'shrine' ? w.shrine : w.foes.find((f) => f.def.prop);
        if (to) Object.assign(w.hero, { x: to.x - 40, y: to.y + 30 });
      }, what);
    await arena(page, { ...base, road: { omen: 'shrine' } });
    await until(page, 'Hud');
    await fight(page, 0.5);
    await near('shrine');
    await tick(page, 200);
    await shot('omen-shrine');
    await arena(page, { ...base, road: { omen: 'stray', stray: 'greta' } });
    await until(page, 'Hud');
    await fight(page, 2.5);
    await near('thing');
    await tick(page, 20);
    await shot('omen-cage');
    await arena(page, { ...base, road: { omen: 'wagon' } });
    await until(page, 'Hud');
    await fight(page, 9);
    await near('thing');
    await tick(page, 12);
    await shot('omen-wagon');
    await arena(page, { ...base, road: { omen: 'champions' } });
    await until(page, 'Hud');
    await fight(page, 9);
    await shot('omen-champions');
    await arena(page, { ...base, road: { omen: 'night' } });
    await until(page, 'Hud');
    await fight(page, 6);
    await shot('omen-night');
  },
  // A pack to open.
  pack: async (page, shot) => {
    await arena(page, { hero: 'aldous', wave: 8, weapons: RICH.slice(0, 3), items: THINGS.slice(0, 4), level: 6, gold: 90, phase: 'camp', packs: 1, offers: [] }, { camp: true });
    await until(page, 'Camp');
    await tick(page, 10);
    await shot('pack');
    const size = page.viewportSize() as { width: number; height: number };
    const zoomed = await page.evaluate(() => {
      const view = (window as unknown as { view: { w: number; h: number; zoom: number; density: number } }).view;
      return { x: ((view.w / 2) * view.zoom) / view.density, y: ((view.h / 2 + 116) * view.zoom) / view.density };
    });
    void size;
    await page.mouse.click(zoomed.x, zoomed.y);
    await tick(page, 10);
    await shot('pack-open');
  },
  // The end of a run that opened two heroes.
  result: async (page, shot) => {
    await page.evaluate(() => {
      const s = (window as unknown as Win).save() as { best: Record<string, number>; open: string[]; felled: string[]; runs: number };
      Object.assign(s, { best: {}, open: [], felled: [], runs: 2 });
    });
    await arena(page, { hero: 'bram', wave: 8, weapons: RICH.slice(0, 3), items: THINGS.slice(0, 4), level: 6, gold: 20, kills: 388, coins: 233, felled: ['warlord'] });
    await until(page, 'Hud');
    await fight(page, 3);
    await page.evaluate(() => {
      const world = (window as unknown as Win).world() as unknown as { hero: { hp: number }; over: string; lastBy: string };
      world.hero.hp = 0;
      world.over = 'dead';
      world.lastBy = 'scarab';
    });
    await until(page, 'Result');
    await tick(page, 60);
    await shot('result');
  },
  // The light changed while a wave goes on: all of it, the cheap part, none, and all of it again.
  light: async (page, shot) => {
    await arena(page, { hero: 'pyromancer', wave: 7, weapons: RICH, items: THINGS, ups: UPS, level: 8, gold: 120 });
    await until(page, 'Hud');
    await fight(page, 6);
    await shot('light-full');
    for (const name of ['low', 'off', 'full-again']) {
      await page.keyboard.press('KeyP');
      await tick(page, 10);
      if (name === 'low') await shot('light-pause');
      const at = await find(page, 'Hud', 'LIGHT');
      if (at) await page.mouse.click(at.x, at.y);
      await tick(page, 4);
      await page.keyboard.press('KeyP');
      await fight(page, 2.5);
      await shot(`light-${name}`);
    }
  },
  // The game held still.
  pause: async (page, shot) => {
    await arena(page, { hero: 'bram', wave: 3, weapons: RICH.slice(0, 2), level: 2 });
    await until(page, 'Hud');
    await fight(page, 4);
    await page.keyboard.press('KeyP');
    await tick(page, 10);
    await shot('pause');
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
  // The game has to have loaded before a state can be stood up in it: a new player lands in the field, so that is waited for.
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
