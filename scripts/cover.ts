// npm run cover
//
// Draws the game's covers: the pictures a portal shows the game by, before
// anyone has played it. They are put together from the game's own art, by
// code, as everything in it is: its units, its cards, its packs, and its
// title, small. The owner, of 24 November 2026: "Let's
// also make a thumbnail for the game / Which is the game's title / But
// game's title is small / With some units graphics and cards+packs".
//
// There is one for each shape CrazyGames asks for, and all three are the
// same picture laid out again: landscape (1920 by 1080), portrait (800 by
// 1200) and square (800 by 800). They go to docs/covers, as PNG.
//
// What a portal asks of a cover is held to here: no border round it, no
// words on it but the game's title (so a card on a cover has no name and no
// grade's letter on it), and nothing that is not the game's own.

import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { composeUnit, innerOf, withIdSuffix, type PartSource } from '../src/art/compose';
import { CLOTH, GRASS, HIGHLIGHT, HOLY, OUTLINE, type Material, type Team } from '../src/art/kit/palette';
import { LOGO_H, LOGO_W } from '../src/art/logoSize';
import { PACK_H, PACK_W } from '../src/art/packs';
import { FEET_X, FEET_Y } from '../src/art/rig';
import { UNIT_ART } from '../src/art/units';
import { UNITS } from '../src/data/units';
import { RARITY_MAT } from '../src/view/ui/colors';

const ASSETS = path.resolve('public/assets');
const OVERRIDES = path.resolve('art/overrides');
const OUT = path.resolve('docs/covers');

/** A file as the game shows it: the hand-edited one if there is one. */
function shown(rel: string): string {
  const over = path.join(OVERRIDES, rel);
  return fs.readFileSync(fs.existsSync(over) ? over : path.join(ASSETS, rel), 'utf8');
}

const source: PartSource = (unit, part, team) => innerOf(shown(`units/${team}/${unit.id}/${part}.svg`));

let serial = 0;
const r = (n: number): number => Math.round(n * 10) / 10;

/**
 * A unit standing with its feet at (x, y), `tall` from feet to the top of
 * its canvas. `flip` turns it to face left, as the enemy's side does.
 */
function unit(id: string, team: Team, x: number, y: number, tall: number, o: { flip?: boolean; shadow?: boolean } = {}): string {
  const art = UNIT_ART.find((u) => u.id === id);
  if (!art) throw new Error(`cover: no unit ${id}`);
  const s = tall / FEET_Y;
  const inner = composeUnit(art, team, { source, noShadow: o.shadow === false, idSuffix: `-c${serial++}` });
  const sx = o.flip ? -s : s;
  return `<g transform="translate(${r(x - (o.flip ? -1 : 1) * FEET_X * s)} ${r(y - FEET_Y * s)}) scale(${r(sx)} ${r(s)})">${inner}</g>`;
}

/** A pack with its middle at (x, y), `tall` high, leaning by `turn` degrees. */
function pack(id: string, x: number, y: number, tall: number, turn: number): string {
  const s = tall / PACK_H;
  const inner = withIdSuffix(innerOf(shown(`packs/${id}.svg`)), `-c${serial++}`);
  return `<g transform="translate(${r(x)} ${r(y)}) rotate(${turn}) scale(${r(s)}) translate(${-PACK_W / 2} ${-PACK_H / 2})">${inner}</g>`;
}

/** The game's title, its middle at (x, y), `wide` across. */
function title(x: number, y: number, wide: number): string {
  const s = wide / LOGO_W;
  const inner = withIdSuffix(innerOf(shown('logo/logo.svg')), `-c${serial++}`);
  return `<g transform="translate(${r(x - wide / 2)} ${r(y - (LOGO_H * s) / 2)}) scale(${r(s)})">${inner}</g>`;
}

/** A rounded rectangle as a path's corners go. */
function round(x: number, y: number, w: number, h: number, k: number): string {
  return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${r(k)}" ry="${r(k)}"`;
}

/**
 * A card as the game draws one (view/ui/UnitCard.ts): a tile in its tier's
 * color with a darker lip, a lighter window, and the unit standing in it.
 * It has no name and no grade on it: a cover may carry no words but the
 * title. Its middle is at (x, y), it is `tall` high, and it leans by `turn`.
 */
function card(id: string, x: number, y: number, tall: number, turn: number): string {
  const mat: Material = RARITY_MAT[UNITS[id].rarity];
  // Drawn on the game's own card, 128 by 168 with the name's strip left out of it, and scaled.
  const w = 128;
  const h = 164;
  const s = tall / h;
  const clip = `card-window-${serial++}`;
  const body =
    `${round(-w / 2, -h / 2, w, h, 14)} fill="${mat.shade}"/>` +
    `${round(-w / 2, -h / 2, w, h - 7, 14)} fill="${mat.fill}"/>` +
    `${round(-w / 2 + 6, -h / 2 + 5, w - 12, 8, 5)} fill="${HIGHLIGHT}" opacity="0.3"/>` +
    `<clipPath id="${clip}">${round(-w / 2 + 9, -h / 2 + 9, w - 18, h - 26, 9)}/></clipPath>` +
    `${round(-w / 2 + 9, -h / 2 + 9, w - 18, h - 26, 9)} fill="${HIGHLIGHT}" opacity="0.42"/>` +
    // The unit stands on the window's floor and is cut to the window, as a picture in a frame is.
    `<g clip-path="url(#${clip})">${unit(id, 'blue', 0, h / 2 - 20, 132, { shadow: true })}</g>` +
    `${round(-w / 2, -h / 2, w, h, 14)} fill="none" stroke="${OUTLINE}" stroke-width="4"/>`;
  return `<g transform="translate(${r(x)} ${r(y)}) rotate(${turn}) scale(${r(s)})">${body}</g>`;
}

/** Light from a point, as rays: every other one a little brighter than the ground it lies on. */
function rays(x: number, y: number, reach: number, n: number, opacity: number): string {
  let d = '';
  for (let i = 0; i < n; i += 2) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    d += `M ${r(x)} ${r(y)} L ${r(x + Math.cos(a0) * reach)} ${r(y + Math.sin(a0) * reach)} L ${r(x + Math.cos(a1) * reach)} ${r(y + Math.sin(a1) * reach)} Z `;
  }
  return `<path d="${d}" fill="${HIGHLIGHT}" opacity="${opacity}"/>`;
}

interface Layout {
  name: string;
  w: number;
  h: number;
  /** The title: its middle and how wide it is. It is kept small, as the owner asked. */
  title: [number, number, number];
  /** Where the light comes from: the middle of the cards. */
  light: [number, number];
  /** How high the ground comes up. */
  ground: number;
  /** The cards, from the back one forward: middle, height, lean. */
  cards: Array<[string, number, number, number, number]>;
  /** The packs: which, middle, height, lean. */
  packs: Array<[string, number, number, number, number]>;
  /** Who stands in front, from the back forward: which unit, whose side, feet, height. */
  units: Array<[string, Team, number, number, number]>;
}

function draw(l: Layout): string {
  const [lx, ly] = l.light;
  const blue = CLOTH.blue;
  const red = CLOTH.red;
  const reach = Math.hypot(l.w, l.h);
  // The two sides of the title's shield: the player's blue from the left, the enemy's red from the right, and light where they meet.
  const lean = l.w * 0.07;
  const sky =
    `<defs>` +
    `<linearGradient id="sky-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${blue.fill}"/><stop offset="1" stop-color="${blue.shade}"/></linearGradient>` +
    `<linearGradient id="sky-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${red.fill}"/><stop offset="1" stop-color="${red.shade}"/></linearGradient>` +
    `<radialGradient id="glow" cx="${lx}" cy="${ly}" r="${r(Math.min(l.w, l.h) * 0.62)}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="${HOLY.light}" stop-opacity="0.95"/><stop offset="0.45" stop-color="${HOLY.fill}" stop-opacity="0.5"/><stop offset="1" stop-color="${HOLY.fill}" stop-opacity="0"/></radialGradient>` +
    `</defs>` +
    `<rect width="${l.w}" height="${l.h}" fill="url(#sky-red)"/>` +
    `<path d="M 0 0 L ${r(lx + lean)} 0 L ${r(lx - lean)} ${l.h} L 0 ${l.h} Z" fill="url(#sky-blue)"/>` +
    rays(lx, ly, reach, 28, 0.1) +
    `<rect width="${l.w}" height="${l.h}" fill="url(#glow)"/>`;
  // The ground they stand on: a rise of grass, with a darker lip under its edge.
  const g = l.ground;
  const ground =
    `<path d="M ${-20} ${r(g + 26)} Q ${l.w / 2} ${r(g - l.h * 0.075 + 26)} ${l.w + 20} ${r(g + 26)} L ${l.w + 20} ${l.h + 20} L -20 ${l.h + 20} Z" fill="${GRASS.dark}"/>` +
    `<path d="M ${-20} ${r(g)} Q ${l.w / 2} ${r(g - l.h * 0.075)} ${l.w + 20} ${r(g)} L ${l.w + 20} ${l.h + 20} L -20 ${l.h + 20} Z" fill="${GRASS.fill}" stroke="${OUTLINE}" stroke-width="${r(Math.max(4, l.w / 320))}"/>`;
  const cards = l.cards.map(([id, x, y, tall, turn]) => card(id, x, y, tall, turn)).join('');
  const packs = l.packs.map(([id, x, y, tall, turn]) => pack(id, x, y, tall, turn)).join('');
  const units = l.units
    .map(([id, team, x, y, tall]) => unit(id, team, x, y, tall, { flip: team === 'red' }))
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.w}" height="${l.h}" viewBox="0 0 ${l.w} ${l.h}">${sky}${ground}${cards}${packs}${units}${title(...l.title)}</svg>`;
}

const LAYOUTS: Layout[] = [
  {
    name: 'landscape', w: 1920, h: 1080,
    title: [960, 122, 440],
    light: [960, 540],
    ground: 905,
    cards: [
      ['mage', 640, 560, 450, -15],
      ['colossus', 1280, 560, 450, 15],
      ['paladin', 960, 520, 520, 0],
    ],
    packs: [
      ['thornwood', 780, 905, 250, -16],
      ['dunes', 1140, 905, 250, 16],
      ['royal', 960, 925, 270, 2],
    ],
    units: [
      ['archer', 'blue', 150, 990, 410],
      ['hexer', 'red', 1772, 990, 410],
      ['knight', 'blue', 380, 1040, 520],
      ['warlord', 'red', 1540, 1040, 540],
    ],
  },
  {
    name: 'portrait', w: 800, h: 1200,
    title: [400, 112, 380],
    light: [400, 520],
    ground: 1010,
    cards: [
      ['mage', 176, 566, 360, -15],
      ['colossus', 624, 566, 360, 15],
      ['paladin', 400, 530, 410, 0],
    ],
    packs: [
      ['thornwood', 268, 880, 210, -16],
      ['dunes', 532, 880, 210, 16],
      ['royal', 400, 896, 228, 2],
    ],
    units: [
      ['knight', 'blue', 170, 1176, 400],
      ['warlord', 'red', 640, 1176, 415],
    ],
  },
  {
    name: 'square', w: 800, h: 800,
    title: [400, 92, 300],
    light: [400, 392],
    ground: 664,
    cards: [
      ['mage', 204, 404, 262, -15],
      ['colossus', 596, 404, 262, 15],
      ['paladin', 400, 380, 300, 0],
    ],
    packs: [
      ['thornwood', 310, 626, 156, -16],
      ['dunes', 490, 626, 156, 16],
      ['royal', 400, 638, 168, 2],
    ],
    units: [
      ['knight', 'blue', 128, 778, 292],
      ['warlord', 'red', 680, 778, 304],
    ],
  },
];

fs.mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
for (const l of LAYOUTS) {
  if (only.length > 0 && !only.includes(l.name)) continue;
  const svg = draw(l);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: l.w } }).render().asPng();
  fs.writeFileSync(path.join(OUT, `cover-${l.name}.png`), png);
  console.log(`cover: docs/covers/cover-${l.name}.png (${l.w} x ${l.h}, ${(png.length / 1024).toFixed(0)} KB)`);
}
