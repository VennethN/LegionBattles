// npm run cover
//
// Draws the game's covers: the pictures a portal shows the game by, before
// anyone has played it. They are put together from the game's own art, by
// code, as everything in it is. The owner asked for a thumbnail on 24
// November 2026 ("the game's title / But game's title is small / With some
// units graphics and cards+packs"), and then for a better one: "Make the
// units bigger / As if theyre drawing their weapon / Make it extra shaded
// and shiny because we want people to click it / More units / Waay more
// units / And structures / And dont leave the grass just green".
//
// So a cover is a battle about to be joined. Two armies stand on a field,
// the player's blue from the left and the enemy's red from the right as on
// the title's shield: a crowd at the back with its towers and halls, a rank
// in the middle, and in front, big, the ones who lead, with their weapons
// up. Over the field, in the light where the two sides meet, are the cards
// and the packs they come out of. The title is small, at the top.
//
// "Shaded and shiny" is done to the finished figures, not to the art they
// are made of, which is the game's and stays as it is: light is laid over
// each from the top left and shade from the bottom right, cut to its own
// outline; the ones in front have a bright edge round them; cards and packs
// have a streak of light across them; whoever stands far back is hazed
// toward the sky's color; and stars sit on the blades.
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
import { Doc } from '../src/art/kit/draw';
import {
  BUSH, CLOTH, DIRT, FIRE, GRASS, HIGHLIGHT, HOLY, OUTLINE, SAND, STONE, type Material, type Team,
} from '../src/art/kit/palette';
import type { AttackStyle } from '../src/art/kit/unit';
import { LOGO_H, LOGO_W } from '../src/art/logoSize';
import { PACK_H, PACK_W } from '../src/art/packs';
import { ATTACK_POSES } from '../src/art/poses';
import { FEET_X, FEET_Y, pose, type Pose } from '../src/art/rig';
import { bush, fence, flowers, log, mushrooms, rock, stump, tree, tuft } from '../src/art/scenery';
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

/** The same numbers every time: a cover drawn twice is the same cover. */
function dice(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ------------------------------------------------------------ weapons up

/**
 * How each kind of fighter holds a weapon it is about to use: a blade or an
 * axe lifted high and tipped toward the enemy, with a stride under it; a
 * spear levelled; a bow drawn; a staff raised. Not the game's own wind-up,
 * which takes a blade back across the head: stood still and seen big, that
 * hides the helmet behind the weapon. Here the weapon is clear of the head,
 * so both are seen. `npm run cover poses` draws them one by one.
 */
const READY: Record<AttackStyle, Pose> = {
  slash: pose({ weaponRot: 14, weaponY: -17, weaponX: 6, bodyRot: 5, headRot: 3, offRot: -6, legFrontRot: -10, legBackRot: 9, rootX: 2 }),
  chop: pose({ weaponRot: 20, weaponY: -17, weaponX: 6, bodyRot: 5, bodySy: 0.03, headRot: 3, legFrontRot: -10, legBackRot: 9, rootX: 2 }),
  thrust: pose({ weaponX: 10, weaponRot: -9, bodyRot: 6, rootX: 4, headRot: 3, legBackRot: 10, legFrontRot: -4 }),
  bow: ATTACK_POSES.bow.windup,
  cast: ATTACK_POSES.cast.windup,
  swing: pose({ weaponRot: -58, weaponY: -7, bodyRot: -5, headRot: -4, offRot: 6 }),
  shoot: ATTACK_POSES.shoot.windup,
  throw: ATTACK_POSES.throw.windup,
};

// ------------------------------------------------------------ the pieces

/**
 * A unit standing with its feet at (x, y), `tall` from feet to the top of
 * its canvas. `flip` turns it to face left, as the enemy's side does.
 */
function unit(id: string, team: Team, x: number, y: number, tall: number, o: { flip?: boolean; ready?: boolean } = {}): string {
  const art = UNIT_ART.find((u) => u.id === id);
  if (!art) throw new Error(`cover: no unit ${id}`);
  const s = tall / FEET_Y;
  // What is built stands as it is: only whoever walks has a weapon to raise.
  const walks = !UNITS[id]?.kind;
  const inner = composeUnit(art, team, { pose: o.ready && walks ? READY[art.style] : undefined, source, idSuffix: `-c${serial++}` });
  const sx = o.flip ? -s : s;
  return `<g transform="translate(${r(x - (o.flip ? -1 : 1) * FEET_X * s)} ${r(y - FEET_Y * s)}) scale(${r(sx)} ${r(s)})">${inner}</g>`;
}

type Box = [number, number, number, number];

/** The room a unit takes: its canvas and the page round that, which a long spear held up reaches into. */
function unitBox(x: number, y: number, tall: number): Box {
  const s = tall / FEET_Y;
  return [x - (FEET_X + 60) * s, y - (FEET_Y + 60) * s, (192 + 120) * s, (192 + 90) * s];
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

/** The start of a rounded rectangle: the caller says what it is filled with. */
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
    `<g clip-path="url(#${clip})">${unit(id, 'blue', 0, h / 2 - 20, 132)}</g>` +
    `${round(-w / 2, -h / 2, w, h, 14)} fill="none" stroke="${OUTLINE}" stroke-width="4"/>`;
  return `<g transform="translate(${r(x)} ${r(y)}) rotate(${turn}) scale(${r(s)})">${body}</g>`;
}

/** A star of four points, for light caught on an edge. */
function star(x: number, y: number, size: number, opacity = 1): string {
  const k = size * 0.16;
  const d = `M ${r(x)} ${r(y - size)} L ${r(x + k)} ${r(y - k)} L ${r(x + size)} ${r(y)} L ${r(x + k)} ${r(y + k)} L ${r(x)} ${r(y + size)} L ${r(x - k)} ${r(y + k)} L ${r(x - size)} ${r(y)} L ${r(x - k)} ${r(y - k)} Z`;
  return `<circle cx="${r(x)}" cy="${r(y)}" r="${r(size * 0.75)}" fill="${HOLY.light}" opacity="${r(opacity * 0.35)}"/><path d="${d}" fill="${HIGHLIGHT}" opacity="${opacity}"/>`;
}

// ------------------------------------------------------------ shade and shine

interface Finish {
  /** A bright edge round it, in this color, this thick: for whoever stands in front. */
  edge?: [string, number];
  /** Light from above on one side and shade from below on the other, laid over it: how strong, from 0 to 1. */
  lit?: number;
  /** Which side the light is on: the left unless said. Whoever stands on the left of a cover is lit from its middle, on their right. */
  from?: 'left' | 'right';
  /** A streak of light across it, as on foil. */
  shine?: boolean;
  /** Hazed toward a color, for whoever stands far back: the color, and how far. */
  haze?: [string, number];
  /**
   * Polished: its light colors made lighter and its dark line left dark, most at its top, with no shade at all.
   * For the title, which is to be the brightest thing there: how strong. Plain white laid over it was tried first
   * and washed the outline to grey; this is white through the "overlay" blend, which leaves what is dark alone.
   */
  gloss?: number;
}

function edgeId(color: string, wide: number): string {
  return `fx-edge-${color.replace('#', '')}-${Math.round(wide * 10)}`;
}

/** The filters and the gradients the finishes use, once to a picture. `edges` are the bright edges asked for. */
function finishDefs(edges: Array<[string, number]>): string {
  const seen = new Set<string>();
  let out =
    // Everything it is laid on, white: a figure's own outline as a stencil.
    `<filter id="fx-white" x="-5%" y="-5%" width="110%" height="110%"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>` +
    // Light over one shoulder and shade under the other, for each side the light can be on, and a bright spot where it lands.
    [['l', 0, 1, 0.36], ['r', 1, 0, 0.64]]
      .map(
        ([side, x1, x2, cx]) =>
          `<linearGradient id="fx-lit-${side}" x1="${x1}" y1="0" x2="${x2}" y2="1">` +
          `<stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="0.4" stop-color="#ffffff" stop-opacity="0"/>` +
          `<stop offset="0.54" stop-color="${OUTLINE}" stop-opacity="0"/><stop offset="1" stop-color="${OUTLINE}" stop-opacity="0.74"/></linearGradient>` +
          `<radialGradient id="fx-spot-${side}" cx="${cx}" cy="0.4" r="0.2">` +
          `<stop offset="0" stop-color="#ffffff" stop-opacity="0.6"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>`,
      )
      .join('') +
    `<linearGradient id="fx-gloss" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#fff8dc" stop-opacity="1"/><stop offset="0.6" stop-color="#fff8dc" stop-opacity="0.8"/><stop offset="1" stop-color="#fff8dc" stop-opacity="0.5"/></linearGradient>` +
    `<linearGradient id="fx-shine" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0.34" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.44" stop-color="#ffffff" stop-opacity="0.55"/>` +
    `<stop offset="0.5" stop-color="#ffffff" stop-opacity="0.12"/><stop offset="0.56" stop-color="#ffffff" stop-opacity="0.4"/><stop offset="0.64" stop-color="#ffffff" stop-opacity="0"/></linearGradient>`;
  for (const [color, wide] of edges) {
    const key = edgeId(color, wide);
    if (seen.has(key)) continue;
    seen.add(key);
    // The outline grown outward and colored, and a wider, softer glow of the same under it.
    out +=
      `<filter id="${key}" x="-30%" y="-30%" width="160%" height="160%">` +
      `<feMorphology in="SourceAlpha" operator="dilate" radius="${r(wide)}" result="grown"/>` +
      `<feFlood flood-color="${color}" result="color"/><feComposite in="color" in2="grown" operator="in" result="edge"/>` +
      `<feGaussianBlur in="grown" stdDeviation="${r(wide * 2.4)}" result="soft"/><feComposite in="color" in2="soft" operator="in" result="glow"/>` +
      `<feMerge><feMergeNode in="glow"/><feMergeNode in="edge"/></feMerge></filter>`;
  }
  return out;
}

/** A thing as it is finished for a cover: itself, with whatever of edge, light, shine and haze is asked. `box` is the room it takes. */
function finished(body: string, box: Box, f: Finish): string {
  const id = `fig-${serial++}`;
  const [x, y, w, h] = box.map(r);
  const rect = `<rect x="${x}" y="${y}" width="${w}" height="${h}"`;
  let out = `<defs><g id="${id}">${body}</g><mask id="${id}-mask" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><use href="#${id}" filter="url(#fx-white)"/></mask></defs>`;
  if (f.edge) out += `<use href="#${id}" filter="url(#${edgeId(f.edge[0], f.edge[1])})"/>`;
  out += `<use href="#${id}"/>`;
  if (f.haze) out += `${rect} fill="${f.haze[0]}" opacity="${f.haze[1]}" mask="url(#${id}-mask)"/>`;
  const side = f.from === 'right' ? 'r' : 'l';
  if (f.lit) out += `${rect} fill="url(#fx-lit-${side})" opacity="${f.lit}" mask="url(#${id}-mask)"/>${rect} fill="url(#fx-spot-${side})" opacity="${f.lit}" mask="url(#${id}-mask)"/>`;
  if (f.gloss) out += `${rect} fill="url(#fx-gloss)" opacity="${f.gloss}" mask="url(#${id}-mask)" style="mix-blend-mode:overlay"/>`;
  if (f.shine) out += `${rect} fill="url(#fx-shine)" mask="url(#${id}-mask)"/>`;
  return out;
}

// ------------------------------------------------------------ a cover

/** A rank of an army: how tall its members stand, where their feet are, and how far back they are. */
interface Rank {
  tall: number;
  y: number;
  /**
   * Where they stand on the player's side, from the left edge: the first
   * and the last, with the rest spread between them. The enemy's stand as
   * far from the right edge.
   */
  span: [number, number];
  blue: string[];
  red: string[];
  /** 0 for the front, where edges are bright; toward 1 for the hazed crowd at the back. */
  far: number;
}

interface Layout {
  name: string;
  w: number;
  h: number;
  /** The title: its middle and how wide it is. It is kept small, as the owner asked. */
  title: [number, number, number];
  /** Where the light comes from: the middle of the cards. */
  light: [number, number];
  /** Where the field meets the sky. */
  horizon: number;
  /** How wide the road is, as halves of it in parts of the picture's width: at the horizon, and at the bottom. */
  road: [number, number];
  ranks: Rank[];
  /** The cards, from the back one forward: middle, height, lean. */
  cards: Array<[string, number, number, number, number]>;
  /** Whoever's feet are higher than this stands behind the cards, which hang in the air over the far ranks. */
  cardsAt: number;
  /** The packs: which, middle, height, lean. */
  packs: Array<[string, number, number, number, number]>;
  /** A far keep on each side's horizon: how far from its edge, and how big. */
  keep: [number, number];
  /** Light caught on a blade or a crown: where, and how big. */
  stars: Array<[number, number, number]>;
}

/** How big a cover is beside the landscape one: what a line's width and a tuft's size go by. */
function unitOf(l: Layout): number {
  return Math.sqrt((l.w * l.h) / (1920 * 1080));
}

/** Light from a point, as rays: every other one a little brighter than what it lies on. */
function rays(x: number, y: number, reach: number, n: number, opacity: number): string {
  let d = '';
  for (let i = 0; i < n; i += 2) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    d += `M ${r(x)} ${r(y)} L ${r(x + Math.cos(a0) * reach)} ${r(y + Math.sin(a0) * reach)} L ${r(x + Math.cos(a1) * reach)} ${r(y + Math.sin(a1) * reach)} Z `;
  }
  return `<path d="${d}" fill="${HIGHLIGHT}" opacity="${opacity}"/>`;
}

/**
 * A keep far off, as a shape against the sky: towers with pointed roofs, a
 * wall with its teeth, pennants. It has no window and no gate, as nothing
 * that far has, and so nothing on it can be taken for a face.
 */
function keep(x: number, base: number, s: number, color: string, flag: string, flip: boolean): string {
  const tower = (cx: number, half: number, top: number, roof: number): string =>
    `M ${cx - half} 0 L ${cx - half} ${-top} L ${cx - half - 5} ${-top} L ${cx} ${-top - roof} L ${cx + half + 5} ${-top} L ${cx + half} ${-top} L ${cx + half} 0 Z `;
  let wall = `M -78 0 L -78 -64 `;
  for (let i = 0; i < 8; i++) wall += `L ${-78 + i * 20} -76 L ${-68 + i * 20} -76 L ${-68 + i * 20} -64 L ${-58 + i * 20} -64 `;
  wall += `L 78 0 Z `;
  const d = wall + tower(-84, 17, 104, 40) + tower(0, 22, 140, 52) + tower(80, 15, 92, 34) + tower(44, 11, 112, 30);
  const pennant = (cx: number, top: number): string =>
    `<path d="M ${cx} ${-top} L ${cx} ${-top - 24} L ${cx + 20} ${-top - 19} L ${cx} ${-top - 13} Z" fill="${flag}"/>`;
  return (
    `<g transform="translate(${r(x)} ${r(base)}) scale(${r(flip ? -s : s)} ${r(s)})">` +
    `<path d="${d}" fill="${color}"/>` +
    // The side the light is on, a little paler.
    `<path d="${tower(0, 22, 140, 52)}" fill="${HIGHLIGHT}" opacity="0.12"/>` +
    pennant(-84, 144) + pennant(0, 192) + pennant(80, 126) +
    `</g>`
  );
}

/** The sky: the two sides of the title's shield, light where they meet, far keeps, and sparks in the air. */
function sky(l: Layout): string {
  const [lx, ly] = l.light;
  const blue = CLOTH.blue;
  const red = CLOTH.red;
  const lean = l.w * 0.07;
  const u = unitOf(l);
  const rnd = dice(7 + l.w);
  let motes = '';
  for (let i = 0; i < 54; i++) {
    const x = rnd() * l.w;
    const y = rnd() * l.horizon;
    const size = (2 + rnd() * rnd() * 13) * u;
    motes += i % 5 === 0 ? star(x, y, size * 2.4, 0.75) : `<circle cx="${r(x)}" cy="${r(y)}" r="${r(size)}" fill="${HOLY.light}" opacity="${r(0.2 + rnd() * 0.45)}"/>`;
  }
  const [off, big] = l.keep;
  return (
    `<defs>` +
    // Each side's sky runs from deep at the top to pale at the horizon, wherever the horizon is.
    `<linearGradient id="sky-blue" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${l.horizon}"><stop offset="0" stop-color="${blue.shade}"/><stop offset="0.5" stop-color="${blue.fill}"/><stop offset="1" stop-color="${HIGHLIGHT}"/></linearGradient>` +
    `<linearGradient id="sky-red" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${l.horizon}"><stop offset="0" stop-color="${red.shade}"/><stop offset="0.5" stop-color="${red.fill}"/><stop offset="1" stop-color="${FIRE.light}"/></linearGradient>` +
    `<radialGradient id="glow" cx="${lx}" cy="${ly}" r="${r(u * 750)}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.22" stop-color="${HOLY.light}" stop-opacity="0.85"/><stop offset="0.55" stop-color="${HOLY.fill}" stop-opacity="0.4"/><stop offset="1" stop-color="${HOLY.fill}" stop-opacity="0"/></radialGradient>` +
    `</defs>` +
    `<rect width="${l.w}" height="${l.h}" fill="url(#sky-red)"/>` +
    `<path d="M 0 0 L ${r(lx + lean)} 0 L ${r(lx - lean)} ${l.h} L 0 ${l.h} Z" fill="url(#sky-blue)"/>` +
    rays(lx, ly, Math.hypot(l.w, l.h), 32, 0.13) +
    keep(off, l.horizon + 6, big, blue.shade, blue.fill, false) +
    keep(l.w - off, l.horizon + 6, big, red.shade, red.fill, true) +
    `<rect width="${l.w}" height="${l.h}" fill="url(#glow)"/>` +
    motes
  );
}

/**
 * The field: not a green floor but ground that has been walked on. It rolls
 * away to the horizon in bands, a road of trodden earth runs through its
 * middle to where the armies meet, each side's color lies over its own
 * half, the light from above pools in the middle, and it has what a meadow
 * has: a line of trees where it ends, rocks, stumps, flowers and tufts.
 */
function field(l: Layout): string {
  const g = l.horizon;
  const deep = l.h - g;
  const u = unitOf(l);
  const lift = l.h * 0.03;
  const curve = (y: number, up: number): string => `M -20 ${r(y)} Q ${l.w / 2} ${r(y - up)} ${l.w + 20} ${r(y)} L ${l.w + 20} ${l.h + 20} L -20 ${l.h + 20} Z`;
  const cx = l.w / 2;
  const [near, wide] = l.road;
  /** Half the road's width at a depth, from 0 at the horizon to 1 at the bottom. */
  const half = (t: number): number => l.w * (near + (wide - near) * t * t);
  const rnd = dice(31 + l.h);

  // The trees stand on the horizon, behind the field's edge, each half hazed toward its side's sky.
  let trees = '';
  for (const side of [0, 1]) {
    const d = new Doc(`cover-trees-${l.name}-${side}`);
    const n = Math.round(13 * (l.w / 1920) / u);
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.2 + rnd() * 0.6) / n) * (l.w / 2);
      d.at(side === 0 ? x : l.w - x, g + (4 + (i % 2) * 7) * u, (0.62 + rnd() * 0.3) * u, side === 1, i % 4 === 3 ? bush : tree);
    }
    trees += finished(d.inner(), [side === 0 ? -20 : cx, g - 130 * u, cx + 20, 160 * u], { haze: [side === 0 ? CLOTH.blue.fill : CLOTH.red.fill, 0.42] });
  }

  let out =
    trees +
    `<defs>` +
    `<linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GRASS.light}"/><stop offset="0.3" stop-color="${GRASS.fill}"/><stop offset="1" stop-color="${GRASS.dark}"/></linearGradient>` +
    `<linearGradient id="field-blue" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${CLOTH.blue.shade}" stop-opacity="0.5"/><stop offset="0.47" stop-color="${CLOTH.blue.shade}" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="field-red" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${CLOTH.red.shade}" stop-opacity="0.5"/><stop offset="0.47" stop-color="${CLOTH.red.shade}" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="pool" cx="${cx}" cy="${r(g + deep * 0.36)}" r="${r(l.w * 0.3)}" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 ${r((g + deep * 0.36) * 0.35)}) scale(1 0.65)">` +
    `<stop offset="0" stop-color="${HOLY.light}" stop-opacity="0.42"/><stop offset="1" stop-color="${HOLY.light}" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="field-clip"><path d="${curve(g, lift)}"/></clipPath>` +
    `</defs>` +
    `<path d="${curve(g, lift)}" fill="url(#field)" stroke="${OUTLINE}" stroke-width="${r(Math.max(3, 5 * u))}"/>` +
    `<g clip-path="url(#field-clip)">`;
  // It rolls: bands of darker and lighter grass, nearer and nearer.
  const bands: Array<[number, string, number]> = [[0.12, GRASS.shade, 0.5], [0.27, GRASS.light, 0.32], [0.44, GRASS.shade, 0.5], [0.63, GRASS.light, 0.22], [0.82, GRASS.dark, 0.5]];
  for (const [at, color, opacity] of bands) out += `<path d="${curve(g + deep * at, lift * (1 - at))}" fill="${color}" opacity="${opacity}"/>`;
  // The road: wide where it is near, running back to the horizon, its middle paler where feet have worn it.
  const road = (k: number): string => {
    let left = '';
    let right = '';
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const y = g - 8 + (deep + 28) * t;
      // Its edges wander a little, as a track's do.
      const wob = Math.sin(t * 9) * l.w * 0.006 * t;
      left += `${i === 0 ? 'M' : 'L'} ${r(cx - half(t) * k + wob)} ${r(y)} `;
      right = `L ${r(cx + half(t) * k + wob)} ${r(y)} ` + right;
    }
    return left + right + 'Z';
  };
  out +=
    `<path d="${road(1.12)}" fill="${DIRT.shade}" stroke-linejoin="round"/>` +
    `<path d="${road(1)}" fill="${DIRT.fill}"/>` +
    `<path d="${road(0.62)}" fill="${SAND.fill}" opacity="0.55"/>` +
    `<path d="${road(0.3)}" fill="${SAND.light}" opacity="0.4"/>`;
  // Ruts across it and stones in it, by the same dice every time.
  for (let i = 0; i < 34; i++) {
    const t = 0.06 + rnd() * 0.94;
    const x = cx + (rnd() * 2 - 1) * half(t) * 0.92;
    const y = g + deep * t;
    const s = (4 + rnd() * 7) * u * (0.4 + t * 1.3);
    if (i % 3 === 0) out += `<ellipse cx="${r(x)}" cy="${r(y)}" rx="${r(s * 1.5)}" ry="${r(s)}" fill="${STONE.fill}" stroke="${OUTLINE}" stroke-width="${r(Math.max(1.5, 2.5 * u * t))}"/><ellipse cx="${r(x - s * 0.3)}" cy="${r(y - s * 0.3)}" rx="${r(s * 0.6)}" ry="${r(s * 0.3)}" fill="${HIGHLIGHT}" opacity="0.5"/>`;
    else out += `<ellipse cx="${r(x)}" cy="${r(y)}" rx="${r(s * 3.2)}" ry="${r(s * 0.5)}" fill="${DIRT.shade}" opacity="0.5"/>`;
  }
  out += `<rect width="${l.w}" height="${l.h}" fill="url(#field-blue)"/><rect width="${l.w}" height="${l.h}" fill="url(#field-red)"/><rect width="${l.w}" height="${l.h}" fill="url(#pool)"/></g>`;

  // What grows and what has been set down: drawn with the game's own scenery (art/scenery.ts).
  const d = new Doc(`cover-${l.name}`);
  const grass = tuft(GRASS.light, GRASS.dark);
  const dry = tuft(GRASS.fill, BUSH.shade);
  const white = flowers(HIGHLIGHT);
  const gold = flowers(HOLY.fill);
  const pink = flowers(CLOTH.red.fill);
  const mossy = rock(STONE, BUSH);
  const rails = fence();
  // Along the road's two edges, where nobody stands, and thinner out in the grass.
  const small = [grass, white, dry, gold, grass, mossy, pink, grass, mushrooms, white, stump, grass, gold, log, rails, grass];
  const spots: Array<{ x: number; y: number; s: number; flip: boolean; what: (d: Doc) => void }> = [];
  for (let i = 0; i < 96; i++) {
    const t = 0.05 + rnd() * 0.95;
    const y = g + deep * t;
    const clear = half(t) * 1.16 + 12 * u;
    const out2 = i % 3 === 0 ? rnd() * (cx - clear) : rnd() * rnd() * 150 * u * (0.4 + t);
    const off = clear + out2;
    if (off > cx + 20) continue;
    spots.push({ x: i % 2 === 0 ? cx - off : cx + off, y, s: (0.55 + t * 1.5) * u * 1.15, flip: rnd() < 0.5, what: small[i % small.length] });
  }
  spots.sort((a, b) => a.y - b.y);
  for (const p of spots) d.at(p.x, p.y, p.s, p.flip, p.what);
  return out + d.inner();
}

function draw(l: Layout): string {
  const blueSky = CLOTH.blue.fill;
  const redSky = CLOTH.red.fill;
  const u = unitOf(l);
  const thick = 5 * u;
  const thin = 3 * u;
  const edges: Array<[string, number]> = [[HIGHLIGHT, thick], [HOLY.light, thick], [HIGHLIGHT, thin]];

  // Everyone on the field, the farthest first, so that whoever is nearer stands in front.
  const stands: Array<{ y: number; svg: string }> = [];
  l.ranks.forEach((rank, n) => {
    const rnd = dice(101 + n * 17 + l.w);
    const count = Math.max(rank.blue.length, rank.red.length);
    for (let i = 0; i < count; i++) {
      const [from, to] = rank.span;
      const step = count > 1 ? (to - from) / (count - 1) : 0;
      for (const team of ['blue', 'red'] as Team[]) {
        const id = (team === 'blue' ? rank.blue : rank.red)[i];
        // Nobody in a crowd stands quite in line.
        const jx = (rnd() - 0.5) * step * 0.16;
        const jy = (rnd() - 0.5) * rank.tall * 0.07;
        if (!id) continue;
        const x = from + step * i + jx;
        const px = team === 'blue' ? x : l.w - x;
        const py = rank.y + jy;
        // A hall or a tower stands taller than the soldiers beside it.
        const tall = rank.tall * (UNITS[id]?.kind === 'building' ? 1.45 : 1);
        const front = rank.far === 0;
        const body = unit(id, team, px, py, tall, { flip: team === 'red', ready: true });
        const f: Finish = {
          from: team === 'blue' ? 'right' : 'left',
          lit: front ? 0.95 : 0.8 - rank.far * 0.3,
          edge: front ? [team === 'blue' ? HIGHLIGHT : HOLY.light, thick] : rank.far <= 0.45 ? [HIGHLIGHT, thin] : undefined,
          haze: rank.far > 0 ? [team === 'blue' ? blueSky : redSky, r(rank.far * 0.4)] : undefined,
        };
        stands.push({ y: py, svg: finished(body, unitBox(px, py, tall), f) });
      }
    }
  });
  const cards = l.cards
    .map(([id, x, y, tall, turn]) => {
      const room = tall * 0.72;
      return finished(card(id, x, y, tall, turn), [x - room, y - room, room * 2, room * 2], { edge: [HIGHLIGHT, thick], lit: 0.45, shine: true });
    })
    .join('');
  // The cards hang over the far ranks and behind the near ones.
  stands.push({ y: l.cardsAt, svg: cards });
  stands.sort((a, b) => a.y - b.y);

  // The packs stand at the front, in a light of their own.
  const px = l.packs.reduce((sum, p) => sum + p[1], 0) / l.packs.length;
  const py = l.packs.reduce((sum, p) => sum + p[2], 0) / l.packs.length;
  const pt = l.packs[0][3];
  const [lx, ly] = l.light;
  const reach = Math.abs(l.cards[1][1] - l.cards[0][1]) / 2 + l.cards[0][3] * 0.3;
  const rise = dice(55 + l.h);
  let sparks = '';
  for (let i = 0; i < 9; i++) {
    const t = 0.12 + rise() * 0.7;
    const wide = pt * 0.5 + (reach - pt * 0.5) * t;
    sparks += star(px + (lx - px) * t + (rise() * 2 - 1) * wide * 0.8, py + (ly - py) * t, (7 + rise() * 12) * u, 0.9);
  }
  // The cards have come out of the packs: light goes up from the one to the other, and sparks with it.
  const beam =
    `<defs><linearGradient id="beam" gradientUnits="userSpaceOnUse" x1="0" y1="${r(py)}" x2="0" y2="${r(ly)}">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="0.8"/><stop offset="0.5" stop-color="${HOLY.light}" stop-opacity="0.4"/><stop offset="1" stop-color="${HOLY.light}" stop-opacity="0.1"/></linearGradient></defs>` +
    `<path d="M ${r(px - pt * 0.5)} ${r(py)} L ${r(lx - reach)} ${r(ly)} L ${r(lx + reach)} ${r(ly)} L ${r(px + pt * 0.5)} ${r(py)} Z" fill="url(#beam)"/>` +
    `<path d="M ${r(px - pt * 0.22)} ${r(py)} L ${r(lx - reach * 0.45)} ${r(ly)} L ${r(lx + reach * 0.45)} ${r(ly)} L ${r(px + pt * 0.22)} ${r(py)} Z" fill="url(#beam)"/>` +
    sparks;
  const packLight =
    `<defs><radialGradient id="pack-light" cx="${r(px)}" cy="${r(py)}" r="${r(pt * 1.3)}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/><stop offset="0.45" stop-color="${HOLY.light}" stop-opacity="0.5"/><stop offset="1" stop-color="${HOLY.fill}" stop-opacity="0"/></radialGradient></defs>` +
    `<circle cx="${r(px)}" cy="${r(py)}" r="${r(pt * 1.3)}" fill="url(#pack-light)"/>`;
  const packs = l.packs
    .map(([id, x, y, tall, turn]) => {
      const room = tall * 0.7;
      return finished(pack(id, x, y, tall, turn), [x - room, y - room, room * 2, room * 2], { edge: [HIGHLIGHT, thick], lit: 0.5, shine: true });
    })
    .join('');
  const stars = l.stars.map(([x, y, size]) => star(x, y, size)).join('');
  // The title is small, so it is the brightest thing on the cover: it stands in a light of its own, with a bright
  // edge round it and a polish on its gold. Left as it is drawn for the game's dark title screen, it was the one
  // dull thing on a shining picture, on the murkiest part of the sky, and the owner took it for darkened.
  const [tx, ty, tw] = l.title;
  const th = (tw * LOGO_H) / LOGO_W;
  const halo =
    `<defs><radialGradient id="title-light"><stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="0.5" stop-color="${HOLY.light}" stop-opacity="0.6"/>` +
    `<stop offset="1" stop-color="${HOLY.light}" stop-opacity="0"/></radialGradient></defs>` +
    `<ellipse cx="${r(tx)}" cy="${r(ty)}" rx="${r(tw * 0.9)}" ry="${r(th * 0.9)}" fill="url(#title-light)"/>`;
  const name = halo + finished(title(tx, ty, tw), [tx - tw * 0.6, ty - th * 0.62, tw * 1.2, th * 1.24], { edge: [HIGHLIGHT, thick], gloss: 0.6 });
  // The corners are let go dark, so that the eye stays in the middle.
  const dim =
    `<defs><radialGradient id="dim" cx="50%" cy="46%" r="72%"><stop offset="0.62" stop-color="${OUTLINE}" stop-opacity="0"/><stop offset="1" stop-color="${OUTLINE}" stop-opacity="0.36"/></radialGradient></defs>` +
    `<rect width="${l.w}" height="${l.h}" fill="url(#dim)"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${l.w}" height="${l.h}" viewBox="0 0 ${l.w} ${l.h}">` +
    `<defs>${finishDefs(edges)}</defs>` +
    sky(l) + field(l) + beam + stands.map((s) => s.svg).join('') + packLight + packs + dim + stars + name +
    `</svg>`
  );
}

// The player's side is the kingdom and the faithful, with what the kingdom
// builds; the enemy's is everyone a player meets on the line of stages, with
// their halls and towers. From the back: what is built, then rank on rank of
// soldiers, then the ones who lead.
const LAYOUTS: Layout[] = [
  {
    name: 'landscape', w: 1920, h: 1080,
    title: [960, 104, 350],
    light: [960, 400],
    horizon: 430,
    road: [0.05, 0.19],
    keep: [150, 1.5],
    ranks: [
      { far: 0.95, tall: 150, y: 470, span: [64, 566], blue: ['watchtower', 'warbanner', 'barracks', 'watchtower'], red: ['lookout', 'raidertent', 'frostspire', 'wartent'] },
      { far: 0.9, tall: 106, y: 486, span: [26, 610], blue: ['militia', 'archer', 'militia', 'cleric', 'archer', 'knight', 'militia', 'beekeeper', 'archer', 'militia'], red: ['lancer', 'cutpurse', 'huscarl', 'poacher', 'lancer', 'harpooner', 'cutpurse', 'huscarl', 'javelineer', 'lancer'] },
      { far: 0.7, tall: 164, y: 566, span: [316, 316], blue: ['barracks'], red: ['longhouse'] },
      { far: 0.75, tall: 136, y: 546, span: [62, 590], blue: ['archer', 'gravedigger', 'militia', 'mage', 'bellringer', 'archer', 'knight'], red: ['poacher', 'bruiser', 'javelineer', 'hexer', 'skald', 'lancer', 'huscarl'] },
      { far: 0.6, tall: 176, y: 624, span: [34, 610], blue: ['knight', 'lamplighter', 'militia', 'cleric', 'berserker', 'archer'], red: ['huscarl', 'ringleader', 'lancer', 'pyromancer', 'bruiser', 'harpooner'] },
      { far: 0.5, tall: 206, y: 668, span: [50, 50], blue: ['watchtower'], red: ['lookout'] },
      { far: 0.42, tall: 230, y: 722, span: [96, 600], blue: ['blacksmith', 'archer', 'herald', 'militia'], red: ['icegolem', 'poacher', 'drummer', 'cutpurse'] },
      { far: 0.25, tall: 304, y: 846, span: [372, 590], blue: ['mage', 'cleric'], red: ['hexer', 'pyromancer'] },
      { far: 0.1, tall: 404, y: 992, span: [494, 494], blue: ['berserker'], red: ['jarl'] },
      { far: 0, tall: 570, y: 1092, span: [196, 196], blue: ['knight'], red: ['warlord'] },
    ],
    cards: [
      ['honorguard', 748, 408, 300, -14],
      ['frostwitch', 1172, 408, 300, 14],
      ['paladin', 960, 392, 350, 0],
    ],
    cardsAt: 600,
    packs: [
      ['thornwood', 812, 934, 250, -15],
      ['dunes', 1108, 934, 250, 15],
      ['royal', 960, 950, 272, 1],
    ],
    stars: [[490, 786, 34], [1352, 742, 34], [742, 772, 24], [1166, 738, 24], [206, 740, 22], [1690, 610, 24], [1084, 234, 26], [626, 300, 20], [892, 836, 22]],
  },
  {
    name: 'portrait', w: 800, h: 1200,
    title: [400, 86, 290],
    light: [400, 380],
    horizon: 500,
    road: [0.1, 0.3],
    keep: [80, 1],
    ranks: [
      { far: 0.95, tall: 112, y: 532, span: [50, 214], blue: ['watchtower', 'warbanner', 'barracks'], red: ['lookout', 'raidertent', 'frostspire'] },
      { far: 0.9, tall: 84, y: 548, span: [22, 268], blue: ['militia', 'archer', 'cleric', 'militia', 'knight', 'archer'], red: ['lancer', 'cutpurse', 'huscarl', 'poacher', 'harpooner', 'lancer'] },
      { far: 0.75, tall: 110, y: 602, span: [44, 262], blue: ['archer', 'gravedigger', 'mage', 'bellringer'], red: ['poacher', 'bruiser', 'hexer', 'skald'] },
      { far: 0.6, tall: 142, y: 670, span: [30, 268], blue: ['knight', 'lamplighter', 'militia', 'archer'], red: ['huscarl', 'ringleader', 'lancer', 'pyromancer'] },
      { far: 0.5, tall: 160, y: 704, span: [30, 30], blue: ['watchtower'], red: ['lookout'] },
      { far: 0.42, tall: 182, y: 752, span: [52, 262], blue: ['blacksmith', 'herald', 'militia'], red: ['icegolem', 'drummer', 'cutpurse'] },
      { far: 0.25, tall: 238, y: 858, span: [72, 240], blue: ['mage', 'cleric'], red: ['hexer', 'pyromancer'] },
      { far: 0.1, tall: 304, y: 978, span: [248, 248], blue: ['berserker'], red: ['jarl'] },
      { far: 0, tall: 440, y: 1200, span: [112, 112], blue: ['knight'], red: ['warlord'] },
    ],
    cards: [
      ['honorguard', 236, 392, 250, -14],
      ['frostwitch', 564, 392, 250, 14],
      ['paladin', 400, 372, 296, 0],
    ],
    cardsAt: 640,
    packs: [
      ['thornwood', 318, 1112, 160, -15],
      ['dunes', 482, 1112, 160, 15],
      ['royal', 400, 1120, 174, 1],
    ],
    stars: [[324, 960, 24], [424, 926, 24], [386, 800, 20], [118, 928, 16], [642, 838, 18], [506, 238, 20], [128, 300, 16], [346, 1050, 16]],
  },
  {
    name: 'square', w: 800, h: 800,
    title: [400, 72, 240],
    light: [400, 262],
    horizon: 330,
    road: [0.08, 0.24],
    keep: [70, 0.8],
    ranks: [
      { far: 0.95, tall: 84, y: 354, span: [40, 204], blue: ['watchtower', 'warbanner', 'barracks'], red: ['lookout', 'raidertent', 'frostspire'] },
      { far: 0.9, tall: 62, y: 366, span: [18, 252], blue: ['militia', 'archer', 'cleric', 'militia', 'knight', 'archer', 'militia'], red: ['lancer', 'cutpurse', 'huscarl', 'poacher', 'harpooner', 'lancer', 'cutpurse'] },
      { far: 0.75, tall: 80, y: 406, span: [34, 246], blue: ['archer', 'gravedigger', 'mage', 'bellringer', 'knight'], red: ['poacher', 'bruiser', 'hexer', 'skald', 'huscarl'] },
      { far: 0.6, tall: 104, y: 456, span: [24, 250], blue: ['knight', 'lamplighter', 'militia', 'archer'], red: ['huscarl', 'ringleader', 'lancer', 'pyromancer'] },
      { far: 0.5, tall: 118, y: 484, span: [26, 26], blue: ['watchtower'], red: ['lookout'] },
      { far: 0.42, tall: 132, y: 516, span: [44, 246], blue: ['blacksmith', 'herald', 'militia'], red: ['icegolem', 'drummer', 'cutpurse'] },
      { far: 0.25, tall: 172, y: 596, span: [156, 262], blue: ['mage', 'cleric'], red: ['hexer', 'pyromancer'] },
      { far: 0.1, tall: 226, y: 692, span: [250, 250], blue: ['berserker'], red: ['jarl'] },
      { far: 0, tall: 326, y: 806, span: [94, 94], blue: ['knight'], red: ['warlord'] },
    ],
    cards: [
      ['honorguard', 272, 268, 180, -14],
      ['frostwitch', 528, 268, 180, 14],
      ['paladin', 400, 256, 212, 0],
    ],
    cardsAt: 430,
    packs: [
      ['thornwood', 330, 716, 136, -15],
      ['dunes', 470, 716, 136, 15],
      ['royal', 400, 724, 148, 1],
    ],
    stars: [[262, 628, 20], [506, 600, 20], [414, 560, 16], [96, 604, 14], [672, 548, 15], [476, 158, 17], [198, 196, 14], [372, 662, 14]],
  },
];

/**
 * `npm run cover poses`: the leaders one by one with their weapons up, big,
 * on a plain ground, to build/covers/poses.png. A pose in READY is set by
 * looking at this, not at a crowd.
 */
function poseSheet(): void {
  const ids = ['knight', 'berserker', 'militia', 'archer', 'mage', 'cleric', 'paladin', 'honorguard', 'warlord', 'jarl', 'huscarl', 'lancer', 'hexer', 'icegolem', 'poacher', 'javelineer'];
  const cell = 330;
  const cols = 8;
  const w = cols * cell;
  const h = Math.ceil(ids.length / cols) * (cell + 50);
  let body = `<rect width="${w}" height="${h}" fill="${GRASS.fill}"/>`;
  ids.forEach((id, i) => {
    const x = (i % cols) * cell + cell / 2;
    const y = Math.floor(i / cols) * (cell + 50) + cell + 20;
    const red = i >= cols;
    body += finished(unit(id, red ? 'red' : 'blue', x, y, 300, { flip: red, ready: true }), unitBox(x, y, 300), { edge: [HIGHLIGHT, 4], lit: 0.95, from: red ? 'left' : 'right' });
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${finishDefs([[HIGHLIGHT, 4]])}</defs>${body}</svg>`;
  const dir = path.resolve('build/covers');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'poses.png'), new Resvg(svg, { fitTo: { mode: 'width', value: w } }).render().asPng());
  console.log('cover: build/covers/poses.png');
}

fs.mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
if (only.includes('poses')) {
  poseSheet();
  process.exit(0);
}
// `width=1080` draws a cover that many pixels wide, and `out=build/video` puts it somewhere else: the preview
// video opens on the cover (scripts/videocut.ts), and its portrait frame is bigger than the portrait cover.
const option = (name: string): string | undefined => only.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1);
const wide = Number(option('width') ?? 0);
const into = option('out') ? path.resolve(option('out') as string) : OUT;
const named = only.filter((a) => !a.includes('='));
fs.mkdirSync(into, { recursive: true });
for (const l of LAYOUTS) {
  if (named.length > 0 && !named.includes(l.name)) continue;
  const svg = draw(l);
  if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, svg);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: wide || l.w } }).render().asPng();
  fs.writeFileSync(path.join(into, `cover-${l.name}.png`), png);
  const tall = Math.round(((wide || l.w) * l.h) / l.w);
  console.log(`cover: ${path.relative(process.cwd(), path.join(into, `cover-${l.name}.png`))} (${wide || l.w} x ${tall}, ${(png.length / 1024).toFixed(0)} KB)`);
}
