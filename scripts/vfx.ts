// npm run vfx [907x510] [moment ...]
//
// Films the hunt's effects, each moment as a run of frames, to build/vfx:
// blows landing, a whiff, the boss's slam and sweep, the stagger filling and
// breaking, the boss falling, a dodge, the skills, the hunter hurt badly. A
// strip of every few frames is made of each with ffmpeg, to look at. With a
// served build (the dev server's fonts do not come through a linked
// node_modules): URL=http://127.0.0.1:5196/.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { chromium, open, type Page } from './browser';
import { RICH, lair, tick, until, type Win } from './drive';

const args = process.argv.slice(2);
const size = args.find((a) => /^\d+x\d+$/.test(a)) ?? '907x510';
const want = args.filter((a) => !/^\d+x\d+$/.test(a));
const [width, height] = size.split('x').map(Number);
const out = `build/vfx/${size}${process.env.LIGHT ? `-${process.env.LIGHT}` : ''}`;
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const { page } = await open(browser, { viewport: { width, height }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e.stack ?? e.message)));
await page.clock.install();
await page.goto(process.env.URL ?? 'http://127.0.0.1:5196/');
await page.evaluate((light) => {
  localStorage.clear();
  if (light) localStorage.setItem('boss-hunters-light', light);
}, process.env.LIGHT ?? '');
await page.reload();
await page.clock.pauseAt(Date.now() + 5000);
await until(page, 'Hud');

/** Films `frames` frames of a moment, a picture every `every`, and lays them out as a strip. */
async function film(name: string, frames: number, every: number, step: (f: number) => Promise<void>): Promise<void> {
  const dir = `${out}/${name}`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  for (let f = 0; f < frames; f++) {
    await step(f);
    if (f % every === 0) await page.screenshot({ path: `${dir}/f-${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 86 });
  }
  const cols = 4;
  const rows = Math.min(4, Math.ceil(n / cols));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${dir}/f-%04d.jpg`, '-frames:v', '1', '-vf', `scale=${Math.round(width / 2)}:-1,tile=${cols}x${rows}:padding=4`, `${out}/strip-${name}.jpg`]);
  console.log(`vfx: ${name}, ${n} pictures`);
}

const hunt = (monster: string, hunter: string, extra: Record<string, unknown> = {}): Promise<void> =>
  lair(page, { monster, mark: 2, hunter, reinforcements: [{ id: 'pikemen', charges: 1 }], buildings: [{ id: 'watchfire', n: 1 }], awake: true, ...extra }, RICH);

/** Lets the bot play, one frame at a time. */
const bot = async (on: boolean): Promise<void> => {
  await page.evaluate((o) => (window as unknown as Win).pilot(o), on);
};

/** Changes the hunt as it stands: for a moment that would take minutes to come to by playing. */
const poke = (fn: string): Promise<void> => page.evaluate((src) => {
  const h = (window as unknown as Win).hunt() as unknown as Record<string, unknown>;
  // eslint-disable-next-line no-new-func
  new Function('h', src)(h);
}, fn);

const moments: Record<string, () => Promise<void>> = {
  // Blows on the boss with the bot playing: sparks, blood, the flash on him, cracks of light as his stagger fills.
  blows: async () => {
    await hunt('sexton', 'marta');
    await bot(true);
    await tick(page, 200);
    await film('blows', 96, 2, () => tick(page, 1));
    await bot(false);
  },
  // The boss's blows landing: the ground darkening first, then the furrow, the cracks, the dust and the clods.
  slam: async () => {
    await hunt('sexton', 'jory');
    await bot(true);
    await tick(page, 60);
    await film('slam', 120, 3, () => tick(page, 1));
    await bot(false);
  },
  // The stagger breaks: the biggest moment.
  break: async () => {
    await hunt('sexton', 'marta');
    await bot(true);
    await tick(page, 120);
    await poke('h.monster.stagger = h.monster.staggerMax - 1;');
    let broke = -1;
    await film('break', 96, 2, async (f) => {
      await tick(page, 1);
      if (broke < 0 && (await page.evaluate(() => (window as unknown as Win).hunt()?.monster.state === 'broken'))) broke = f;
    });
    await bot(false);
  },
  // The boss falls: slow, a last light, ash, the dark lifting.
  fall: async () => {
    await hunt('king', 'agnes');
    await bot(true);
    await tick(page, 120);
    await poke('h.monster.part = h.cuts.length; h.monster.hp = 6;');
    await film('fall', 150, 3, () => tick(page, 1));
    await bot(false);
  },
  // The King's charge: snow kicked up, hoof marks.
  charge: async () => {
    await hunt('king', 'brask');
    await bot(true);
    await tick(page, 90);
    await film('charge', 150, 3, () => tick(page, 1));
    await bot(false);
  },
  // The hunter badly hurt: the colors drain and the edges beat red.
  hurt: async () => {
    await hunt('sexton', 'jory');
    await poke('h.hunter.hp = Math.round(h.hunter.maxHp * 0.12);');
    await bot(true);
    await film('hurt', 60, 6, () => tick(page, 1));
    await bot(false);
  },
  // A dodge, the skills: after-images, the iron ring, the flare.
  skills: async () => {
    await hunt('sexton', 'agnes');
    await bot(true);
    await tick(page, 60);
    await film('skills', 150, 3, () => tick(page, 1));
    await bot(false);
  },
  // Each effect alone, set off by hand where the hunter and the boss stand, so that it can be looked at without
  // waiting for the bot to come to it.
  lab: async () => {
    for (const [hunter, monster] of [['marta', 'sexton'], ['agnes', 'king'], ['jory', 'sexton']] as const) {
      await lair(page, { monster, mark: 1, hunter, buildings: [{ id: 'watchfire', n: 1 }], awake: true }, RICH);
      await tick(page, 30);
      const fire = (src: string): Promise<void> => page.evaluate((code) => {
        const w = window as unknown as Win;
        const lair = w.game.scene.getScene('Lair') as unknown as { vfx: { react(e: unknown[]): void; told: Map<number, unknown> }; hunt: Record<string, unknown> };
        // eslint-disable-next-line no-new-func
        new Function('vfx', 'h', code)(lair.vfx, lair.hunt);
      }, src);
      // The hunter stands still a little way from the boss, facing it.
      await fire('h.hunter.x = h.monster.x - 170; h.hunter.y = h.monster.y + 10; h.monster.state = "recover"; h.monster.left = 99;');
      const steps: Array<[string, string]> = [
        ['strike', 'vfx.react([{ t: "strike", x: h.hunter.x, y: h.hunter.y, angle: 0, reach: 110, kind: h.hunter.def.id === "jory" ? "bolt" : "arc" }, { t: "hit", who: "monster", id: 0, x: h.monster.x, y: h.monster.y, amount: 30, big: false, open: false }]);'],
        ['big', 'vfx.react([{ t: "strike", x: h.hunter.x, y: h.hunter.y, angle: 0, reach: 110, kind: "arc" }, { t: "hit", who: "monster", id: 0, x: h.monster.x, y: h.monster.y, amount: 60, big: true, open: true }]);'],
        ['whiff', 'vfx.react([{ t: "strike", x: h.hunter.x, y: h.hunter.y, angle: 0.4, reach: 110, kind: "arc" }]);'],
        ['slam', 'const t = { id: 9001, kind: "line", x: h.monster.x - 40, y: h.monster.y, angle: Math.PI, len: 300, w: 70, r: 0, half: 0, inner: 0, left: 0, of: 1, dmg: 10, foe: true, attack: "slam", by: 0 }; vfx.told.set(9001, t); vfx.react([{ t: "land", id: 9001, kind: "line", x: t.x, y: t.y, r: 0, foe: true }]);'],
        ['stomp', 'const t = { id: 9002, kind: "ring", x: h.monster.x, y: h.monster.y, angle: 0, len: 0, w: 0, r: 160, half: 0, inner: 0, left: 0, of: 1, dmg: 10, foe: true, attack: "stomp", by: 0 }; vfx.told.set(9002, t); vfx.react([{ t: "land", id: 9002, kind: "ring", x: t.x, y: t.y, r: 160, foe: true }]);'],
        ['sweep', 'const t = { id: 9003, kind: "cone", x: h.monster.x, y: h.monster.y, angle: Math.PI, len: 0, w: 0, r: 240, half: 0.7, inner: 0, left: 0, of: 1, dmg: 10, foe: true, attack: "sweep", by: 0 }; vfx.told.set(9003, t); vfx.react([{ t: "land", id: 9003, kind: "cone", x: t.x, y: t.y, r: 240, foe: true }]);'],
        ['hurt', 'vfx.react([{ t: "hurt", who: "hunter", id: 0, x: h.hunter.x, y: h.hunter.y, amount: 20, by: "slam" }]);'],
        ['turned', 'vfx.react([{ t: "turned", x: h.hunter.x, y: h.hunter.y }]);'],
        ['flare', 'vfx.react([{ t: "ability", id: "flare", x: h.hunter.x + 60, y: h.hunter.y, r: 150, tx: h.monster.x, ty: h.monster.y }]);'],
        ['trap', 'vfx.react([{ t: "trap", x: h.monster.x - 60, y: h.monster.y }]);'],
        ['broken', 'h.monster.stagger = h.monster.staggerMax; vfx.react([{ t: "broken", x: h.monster.x, y: h.monster.y }]);'],
        ['fall', 'vfx.react([{ t: "fall", who: "monster", id: 0, x: h.monster.x, y: h.monster.y }]);'],
      ];
      for (const [name, code] of steps) {
        if (hunter !== 'marta' && !['strike', 'stomp', 'sweep', 'flare', 'trap'].includes(name)) continue;
        await fire(code);
        await film(`lab-${hunter}-${name}`, 24, 2, () => tick(page, 1));
        await tick(page, 40);
      }
    }
  },
  // Each kind of warning on the ground, held still at three moments of its time, at night and in the light of a fire.
  tells: async () => {
    for (const monster of ['sexton', 'king']) {
      await lair(page, { monster, mark: 1, hunter: 'marta', buildings: [{ id: 'watchfire', n: 1 }], awake: true }, RICH);
      await tick(page, 20);
      for (const k of [0.15, 0.6, 0.92]) {
        await page.evaluate(([kk, mon]) => {
          const h = (window as unknown as Win).hunt() as unknown as { tells: unknown[]; monster: { x: number; y: number; state: string; left: number }; hunter: { x: number; y: number } };
          const m = h.monster;
          m.state = 'recover';
          m.left = 99;
          h.hunter.x = m.x - 260;
          h.hunter.y = m.y + 40;
          const base = { left: 2 * (1 - kk), of: 2, dmg: 0, foe: true, by: 0, len: 0, w: 0, r: 0, half: 0, inner: 0, angle: 0 };
          h.tells.length = 0;
          h.tells.push(
            { ...base, id: 7001, kind: 'ring', x: m.x - 330, y: m.y - 150, r: 90, attack: mon === 'king' ? 'stomp' : 'graves' },
            { ...base, id: 7002, kind: 'ring', x: m.x + 40, y: m.y + 10, r: 230, inner: 110, attack: mon === 'king' ? 'bellow' : 'lantern' },
            { ...base, id: 7003, kind: 'cone', x: m.x, y: m.y, r: 260, half: 0.55, angle: Math.PI * 0.8, attack: mon === 'king' ? 'gore' : 'sweep' },
            { ...base, id: 7004, kind: 'line', x: m.x, y: m.y + 120, len: 420, w: 80, angle: Math.PI, attack: mon === 'king' ? 'charge' : 'spade' },
          );
        }, [k, monster] as const);
        await tick(page, 1);
        await page.screenshot({ path: `${out}/tells-${monster}-${Math.round(k * 100)}.jpg`, type: 'jpeg', quality: 88 });
      }
    }
    console.log('vfx: tells');
  },
  // The lair at rest before the boss wakes: fog, crows, embers.
  rest: async () => {
    await lair(page, { monster: 'sexton', mark: 1, hunter: 'marta', buildings: [{ id: 'watchfire', n: 1 }] }, RICH);
    await film('rest', 60, 15, () => tick(page, 1));
  },
};

for (const [name, run] of Object.entries(moments)) {
  if (want.length && !want.includes(name)) continue;
  await run();
}

await browser.close();
if (errors.length) console.log(`  the page said: ${[...new Set(errors)].slice(0, 4).join(' | ')}`);
void (null as unknown as Page);
