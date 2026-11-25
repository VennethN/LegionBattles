// npm run cover
//
// The pictures a portal shows the game by, in the three shapes it asks for,
// to docs/covers. They are put together from the game's own art: the hero
// in the middle with what they carry about them, the horde closing in from
// both sides, a captain behind, and the title small at the top.

import { lastanderLogoSvg } from '../src/art/lastander';
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { composeUnit, innerOf, withIdSuffix } from '../src/art/compose';
import { arenaGround, weaponIcons, WEAPON_HAND } from '../src/art/holdout';
import { iconArt } from '../src/art/icons';
import { Doc } from '../src/art/kit/draw';
import { OUTLINE, type Team } from '../src/art/kit/palette';
import { LOGO_H, LOGO_W } from '../src/art/logo';
import { FEET_X, FEET_Y, pose, type Pose } from '../src/art/rig';
import { UNIT_ART } from '../src/art/units';

const OUT = path.resolve('docs/covers');
const r = (n: number): number => Math.round(n * 100) / 100;
let serial = 0;

/** A weapon up and a step forward: how the hero stands on a cover. */
const READY: Pose = pose({ weaponRot: 16, weaponY: -16, weaponX: 6, bodyRot: 5, headRot: 3, offRot: -6, legFrontRot: -10, legBackRot: 9, rootX: 2 });
/** Coming on: how the horde does. */
const STRIDE: Pose = pose({ rootY: -5, bodyRot: 6, legBackRot: 24, legFrontRot: -22, weaponRot: -8, extraRot: -10 });

/** A unit with its feet at (x, y), `tall` from its feet to the top of its canvas. `flip` turns it to face left. */
function unit(id: string, team: Team, x: number, y: number, tall: number, flip = false, at?: Pose): string {
  const art = UNIT_ART.find((u) => u.id === id);
  if (!art) throw new Error(`cover: no unit ${id}`);
  const s = tall / FEET_Y;
  const inner = composeUnit(art, team, { pose: at, idSuffix: `-c${serial++}` });
  return `<g transform="translate(${r(x - (flip ? -1 : 1) * FEET_X * s)} ${r(y - FEET_Y * s)}) scale(${r(flip ? -s : s)} ${r(s)})">${inner}</g>`;
}

const WEAPONS = new Map(weaponIcons().map((w) => [w.name.slice(2), w]));
const ICONS = new Map(iconArt().map((i) => [i.name, i]));

/** What a hero carries, its hand at (x, y), turned by so many degrees, `s` times the size it is drawn. */
function weapon(id: string, x: number, y: number, s: number, turn: number): string {
  const art = WEAPONS.get(id);
  if (!art) throw new Error(`cover: no weapon ${id}`);
  const d = new Doc(`cover-w${serial++}`);
  art.draw(d);
  return `<g transform="translate(${r(x)} ${r(y)}) rotate(${turn}) scale(${r(s)}) translate(${-WEAPON_HAND[0]} ${-WEAPON_HAND[1]})">${d.inner()}</g>`;
}

function coin(x: number, y: number, size: number): string {
  const art = ICONS.get('coin');
  if (!art) return '';
  const d = new Doc(`cover-i${serial++}`);
  art.draw(d);
  const s = size / art.width;
  return `<g transform="translate(${r(x - size / 2)} ${r(y - size / 2)}) scale(${r(s)})">${d.inner()}</g>`;
}

/** The game's title, its middle at (x, y), `wide` across. */
function title(x: number, y: number, wide: number): string {
  const s = wide / LOGO_W;
  const inner = withIdSuffix(innerOf(lastanderLogoSvg()), `-c${serial++}`);
  // The logo's file is written three times the size it is drawn; its own page is that of the drawing.
  return `<g transform="translate(${r(x - wide / 2)} ${r(y - (LOGO_H * s) / 2)}) scale(${r(s)})">${inner}</g>`;
}

interface Stand {
  id: string;
  x: number;
  y: number;
  tall: number;
}

interface Layout {
  name: string;
  w: number;
  h: number;
  title: [number, number, number];
  hero: [number, number, number];
  /** Whoever closes in: those left of the hero face right, the rest face left. */
  horde: Stand[];
  boss: Stand;
  coins: Array<[number, number, number]>;
}

const LAYOUTS: Layout[] = [
  {
    name: 'landscape', w: 1920, h: 1080, title: [960, 168, 560], hero: [960, 900, 470],
    horde: [
      { id: 'cutpurse', x: 330, y: 740, tall: 280 }, { id: 'direwolf', x: 500, y: 1000, tall: 300 }, { id: 'bruiser', x: 170, y: 1010, tall: 330 }, { id: 'poacher', x: 620, y: 660, tall: 240 },
      { id: 'lancer', x: 1600, y: 760, tall: 280 }, { id: 'scarab', x: 1380, y: 980, tall: 300 }, { id: 'huscarl', x: 1770, y: 1020, tall: 320 }, { id: 'javelineer', x: 1300, y: 650, tall: 240 },
    ],
    boss: { id: 'warlord', x: 1560, y: 600, tall: 430 },
    coins: [[820, 960, 54], [1090, 990, 48], [740, 1030, 42], [1180, 930, 40]],
  },
  {
    name: 'portrait', w: 800, h: 1200, title: [400, 150, 500], hero: [400, 980, 430],
    horde: [
      { id: 'cutpurse', x: 110, y: 800, tall: 240 }, { id: 'direwolf', x: 170, y: 1130, tall: 270 }, { id: 'poacher', x: 120, y: 560, tall: 200 },
      { id: 'lancer', x: 690, y: 800, tall: 240 }, { id: 'scarab', x: 640, y: 1130, tall: 270 }, { id: 'javelineer', x: 700, y: 560, tall: 200 },
    ],
    boss: { id: 'warlord', x: 560, y: 600, tall: 360 },
    coins: [[290, 1060, 46], [520, 1090, 40], [240, 960, 34]],
  },
  {
    name: 'square', w: 800, h: 800, title: [400, 108, 400], hero: [400, 690, 340],
    horde: [
      { id: 'cutpurse', x: 100, y: 590, tall: 210 }, { id: 'direwolf', x: 190, y: 770, tall: 230 },
      { id: 'lancer', x: 700, y: 590, tall: 210 }, { id: 'scarab', x: 620, y: 770, tall: 230 },
    ],
    boss: { id: 'warlord', x: 590, y: 440, tall: 290 },
    coins: [[300, 740, 40], [510, 760, 36]],
  },
];

function draw(l: Layout): string {
  serial = 0;
  // The ground is the arena's own, a clearing in the meadow, laid over the whole picture.
  const g = arenaGround('meadow', 1400, 1000, 34);
  const k = Math.max(l.w / 1160, l.h / 780);
  let body = `<g transform="translate(${r((l.w - 1400 * k) / 2)} ${r((l.h - 1000 * k) / 2 + 30)}) scale(${r(k)})">${g.inner()}</g>`;
  // Darker toward the edges, in flat rings, so that the middle is where the eye goes.
  for (let i = 0; i < 5; i++) {
    const grow = 1 - i * 0.11;
    body += `<path d="M 0 0 H ${l.w} V ${l.h} H 0 Z M ${r(l.w / 2 - (l.w * 0.72 * grow))} ${r(l.h * 0.56)} a ${r(l.w * 0.72 * grow)} ${r(l.h * 0.66 * grow)} 0 1 0 ${r(l.w * 1.44 * grow)} 0 a ${r(l.w * 0.72 * grow)} ${r(l.h * 0.66 * grow)} 0 1 0 ${r(-l.w * 1.44 * grow)} 0 Z" fill="${OUTLINE}" fill-opacity="0.07" fill-rule="evenodd"/>`;
  }
  const [hx, hy, ht] = l.hero;
  const things: Array<{ y: number; svg: string }> = [];
  things.push({ y: l.boss.y, svg: unit(l.boss.id, 'red', l.boss.x, l.boss.y, l.boss.tall, l.boss.x > hx, READY) });
  for (const f of l.horde) things.push({ y: f.y, svg: unit(f.id, 'red', f.x, f.y, f.tall, f.x > hx, STRIDE) });
  for (const [x, y, size] of l.coins) things.push({ y: y - 1000, svg: coin(x, y, size) });
  // The hero, and what they carry about them: a bow behind, a staff and a spear to either side.
  const u = ht / FEET_Y;
  const hero = weapon('bow', hx - 122 * u, hy - 96 * u, u * 0.95, 196) + weapon('staff', hx - 62 * u, hy - 122 * u, u * 1.05, -16) +
    weapon('spear', hx + 96 * u, hy - 92 * u, u * 1.05, 26) + unit('knight', 'blue', hx, hy, ht, false, READY);
  things.push({ y: hy, svg: hero });
  things.sort((a, b) => a.y - b.y);
  for (const t of things) body += t.svg;
  const [tx, ty, tw] = l.title;
  body += title(tx, ty, tw);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.w}" height="${l.h}" viewBox="0 0 ${l.w} ${l.h}">${body}</svg>`;
}

fs.mkdirSync(OUT, { recursive: true });
const named = process.argv.slice(2);
for (const l of LAYOUTS) {
  if (named.length > 0 && !named.includes(l.name)) continue;
  const png = new Resvg(draw(l), { fitTo: { mode: 'width', value: l.w } }).render().asPng();
  fs.writeFileSync(path.join(OUT, `cover-${l.name}.png`), png);
  console.log(`cover: docs/covers/cover-${l.name}.png (${l.w} x ${l.h}, ${(png.length / 1024).toFixed(0)} KB)`);
}
