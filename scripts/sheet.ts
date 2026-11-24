// npm run art:sheet
//
// Draws the pictures to look at before believing the art is right, into
// docs/art:
//
//   contact-sheet.png  every unit on both teams, every effect, icon, pack and badge
//   scenes.png         the painted ground of a battle in each land, and the map of each land
//   parts.png          every part of every unit alone, on both teams
//   poses.png          every unit at the far end of each movement
//   silhouettes.png    every unit as a black shape 48 px tall, in rows
//
// It also checks what a program can check: that no color is off the palette
// and that every dark line is the one width. Whether there is a face on
// anything, only looking at the sheet can tell.

import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { SCENE_H, SCENE_W } from '../src/art/backdrop';
import { BOARD_X, BOARD_Y, TILE_H, TILE_W } from '../src/art/board';
import { composeUnit, innerOf, withIdSuffix, type PartSource } from '../src/art/compose';
import { CANVAS } from '../src/art/kit/draw';
import { GRASS, OUTLINE, OUTLINE_WIDTH, TEAMS, allColors, type Team } from '../src/art/kit/palette';
import type { UnitArt } from '../src/art/kit/unit';
import { ATTACK_POSES, HIT_POSE, HOP_POSE, LAND_POSE, TOPPLE_POSE } from '../src/art/poses';
import type { Pose } from '../src/art/rig';
import { UNIT_ART } from '../src/art/units';
import { FIELDS } from '../src/data/fields';
import { LANDS } from '../src/data/lands';
import { COLS, ROWS } from '../src/sim/constants';
import { buildArt } from './art';

const ASSETS = path.resolve('public/assets');
const OVERRIDES = path.resolve('art/overrides');
const OUT = path.resolve('docs/art');
const FONT = 'DejaVu Sans, Inter, Arial, sans-serif';

const manifest = buildArt();

/** A file as the game will show it: the override if there is one. */
function shown(rel: string): string {
  const over = path.join(OVERRIDES, rel);
  return fs.readFileSync(fs.existsSync(over) ? over : path.join(ASSETS, rel), 'utf8');
}

const source: PartSource = (unit, part, team) => innerOf(shown(`units/${team}/${unit.id}/${part}.svg`));

let serial = 0;
function unitAt(unit: UnitArt, team: Team, x: number, y: number, scale: number, pose?: Pose, flip = false): string {
  const inner = composeUnit(unit, team, { pose, source, idSuffix: `-n${serial++}` });
  const sx = flip ? -scale : scale;
  const tx = flip ? x + CANVAS * scale : x;
  return `<g transform="translate(${tx} ${y}) scale(${sx} ${scale})">${inner}</g>`;
}

function label(x: number, y: number, text: string, size = 15, anchor = 'middle', color = OUTLINE): string {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="bold" text-anchor="${anchor}" fill="${color}">${text}</text>`;
}

function save(name: string, width: number, height: number, body: string, zoom = 1): void {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
  const png = new Resvg(svg, { fitTo: { mode: 'zoom', value: zoom }, font: { loadSystemFonts: true } }).render().asPng();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), png);
  console.log(`sheet: docs/art/${name} (${Math.round(width * zoom)} x ${Math.round(height * zoom)})`);
}

const only = process.argv.slice(2);
const units = UNIT_ART.filter((u) => only.length === 0 || only.includes(u.id));

// ------------------------------------------------------------ contact sheet
{
  const cell = 176;
  const scale = 0.88;
  const perRow = Math.min(units.length, 8);
  const unitRows = Math.ceil(units.length / perRow);
  const width = Math.max(perRow * cell + 40, 1040);
  let y = 20;
  let body = '';

  body += label(20, y + 16, 'UNITS: blue faces right, red faces left (mirrored, as in the game)', 16, 'start');
  y += 30;
  for (let r = 0; r < unitRows; r++) {
    for (const team of TEAMS) {
      for (let c = 0; c < perRow; c++) {
        const unit = units[r * perRow + c];
        if (!unit) continue;
        body += unitAt(unit, team, 20 + c * cell + 4, y, scale, undefined, team === 'red');
        if (team === 'blue') body += label(20 + c * cell + cell / 2, y + 12, unit.id);
      }
      y += cell - 6;
    }
    y += 8;
  }

  // Effects, board pieces and icons.
  for (const [folder, title] of [['fx', 'EFFECTS'], ['icons', 'ICONS'], ['packs', 'PACKS'], ['grades', 'GRADES: plainer to grander']] as const) {
    const list = Object.entries(manifest[folder]);
    if (list.length === 0) continue;
    body += label(20, y + 22, title, 16, 'start');
    y += 34;
    let x = 20;
    let rowH = 0;
    for (const [name, img] of list) {
      const w = Math.max(img.width, 70) + 16;
      if (x + w > width - 20) {
        x = 20;
        y += rowH + 30;
        rowH = 0;
      }
      const inner = withIdSuffix(innerOf(shown(`${folder}/${name}.svg`)), `-f${serial++}`);
      body += `<rect x="${x}" y="${y}" width="${w}" height="${img.height + 12}" rx="6" fill="${GRASS.shade}"/>`;
      body += `<g transform="translate(${x + (w - img.width) / 2} ${y + 6})">${inner}</g>`;
      body += label(x + w / 2, y + img.height + 26, name, 10);
      rowH = Math.max(rowH, img.height + 12);
      x += w + 10;
    }
    y += rowH + 40;
  }

  save('contact-sheet.png', width, y, `<rect width="${width}" height="${y}" fill="${GRASS.fill}"/>${body}`, 1.25);
}

// ------------------------------------------------------------------- parts
{
  // Every part by itself on its own canvas, so a stray shape shows: blue, then red.
  const ps = 0.42;
  const pc = CANVAS * ps + 4;
  const most = Math.max(...units.map((u) => u.parts.length));
  const width = 100 + most * pc * 2 + 30;
  const height = 34 + units.length * (pc + 14);
  let body = `<rect width="${width}" height="${height}" fill="${GRASS.fill}"/>`;
  body += label(20, 22, 'PARTS: each layer alone, with its pivot (cross). Blue, then red.', 15, 'start');
  units.forEach((unit, r) => {
    const y = 34 + r * (pc + 14);
    body += label(14, y + pc / 2 + 4, unit.id, 12, 'start');
    TEAMS.forEach((team, t) => {
      unit.parts.forEach((part, i) => {
        const x = 100 + t * (most * pc + 20) + i * pc;
        const inner = withIdSuffix(source(unit, part.name, team), `-p${serial++}`);
        body += `<rect x="${x}" y="${y}" width="${CANVAS * ps}" height="${CANVAS * ps}" rx="5" fill="${GRASS.shade}"/>`;
        body += `<g transform="translate(${x} ${y}) scale(${ps})">${inner}`;
        const [px, py] = part.pivot;
        body += `<path d="M ${px - 8} ${py} L ${px + 8} ${py} M ${px} ${py - 8} L ${px} ${py + 8}" stroke="#ffffff" stroke-width="3"/></g>`;
        if (t === 0) body += label(x + (CANVAS * ps) / 2, y + CANVAS * ps + 10, part.name, 8);
      });
    });
  });
  save('parts.png', width, height, body, 1.25);
}

// ------------------------------------------------------------------- poses
{
  // Two units to a row, each at the far end of every movement.
  const scale = 0.6;
  const cell = CANVAS * scale + 2;
  const names = ['rest', 'windup', 'strike', 'hop', 'land', 'hit', 'topple'];
  const block = 92 + names.length * cell + 16;
  const cols = units.length > 6 ? 2 : 1;
  const rows = Math.ceil(units.length / cols);
  const width = cols * block + 10;
  const height = rows * cell + 40;
  let body = `<rect width="${width}" height="${height}" fill="${GRASS.fill}"/>`;
  for (let c = 0; c < cols; c++) names.forEach((n, i) => (body += label(c * block + 92 + i * cell + cell / 2, 22, n, 12)));
  units.forEach((unit, n) => {
    const c = Math.floor(n / rows);
    const r = n % rows;
    const attack = ATTACK_POSES[unit.style];
    const poses: Array<Pose | undefined> = [undefined, attack.windup, attack.strike, HOP_POSE, LAND_POSE, HIT_POSE, TOPPLE_POSE];
    body += label(c * block + 10, 34 + r * cell + cell / 2, unit.id, 11, 'start');
    body += label(c * block + 10, 48 + r * cell + cell / 2, unit.style, 10, 'start', '#3b5a26');
    poses.forEach((p, i) => {
      body += unitAt(unit, n % 2 === 0 ? 'blue' : 'red', c * block + 92 + i * cell, 30 + r * cell, scale, p);
    });
  });
  save('poses.png', width, height, body, 1.25);
}

// ------------------------------------------------------------- silhouettes
{
  // Every unit as one black shape, 48 px tall from its top to its feet. A trap is low and wide:
  // at that height it would lie over its neighbors, so nothing is drawn bigger than a unit is.
  const all = UNIT_ART;
  const gap = 78;
  const perRow = Math.ceil(all.length / Math.ceil(all.length / 11));
  const rows = Math.ceil(all.length / perRow);
  const width = perRow * gap + 40;
  const height = rows * 96;
  let body = `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
  all.forEach((unit, n) => {
    const i = n % perRow;
    const row = Math.floor(n / perRow);
    const tall = 180 - unit.top;
    const scale = Math.min(48 / tall, 0.5);
    let inner = composeUnit(unit, 'blue', { source, noShadow: true, idSuffix: `-s${serial++}` });
    inner = inner
      .replace(/fill="#[0-9a-fA-F]{3,8}"/g, 'fill="#000000"')
      .replace(/stroke="#[0-9a-fA-F]{3,8}"/g, 'stroke="#000000"')
      .replace(/ opacity="[^"]*"/g, '');
    const x = 20 + i * gap + gap / 2 - 96 * scale;
    const y = row * 96 + 66 - 180 * scale;
    body += `<g transform="translate(${x} ${y}) scale(${scale})">${inner}</g>`;
    body += label(20 + i * gap + gap / 2, row * 96 + 86, unit.id, 10);
  });
  save('silhouettes.png', width, height, body, 2);
}

// ------------------------------------------------------------------ scenes
{
  // The painted scenes at half their size: the ground of a battle in each kind of land, and the map of each land.
  const k = 0.5;
  const w = SCENE_W * k;
  const h = SCENE_H * k;
  const lands = LANDS;
  const width = lands.length * (w + 20) + 20;
  const height = 2 * (h + 44) + 20;
  let body = `<rect width="${width}" height="${height}" fill="${GRASS.dark}"/>`;
  lands.forEach((land, i) => {
    const x = 20 + i * (w + 20);
    // Each land's ground is shown with the tiles of a different field on it: the first, the second, the third.
    const field = FIELDS[i % FIELDS.length];
    const scenes = [
      [`${land.ground}: the ground of a battle, with a field of ${field.cols} by ${field.rows}`, `board/${land.ground}.svg`],
      [`${land.name}: the map of its stages`, `maps/${land.id}.svg`],
    ];
    scenes.forEach(([title, file], row) => {
      const y = 34 + row * (h + 44);
      const inner = withIdSuffix(innerOf(shown(file)), `-sc${serial++}`);
      body += label(x + w / 2, y - 10, title, 14);
      body += `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${SCENE_W} ${SCENE_H}">${inner}</svg>`;
      if (row === 0) {
        // The tiles are a picture of their own, laid over the slab where the game lays them.
        const tiles = withIdSuffix(innerOf(shown(`tiles/${land.ground}-${field.cols}x${field.rows}.svg`)), `-sc${serial++}`);
        body += `<svg x="${x + BOARD_X * k}" y="${y + BOARD_Y * k}" width="${COLS * TILE_W * k}" height="${ROWS * TILE_H * k}" ` +
          `viewBox="0 0 ${field.cols * TILE_W} ${field.rows * TILE_H}">${tiles}</svg>`;
      }
    });
  });
  save('scenes.png', width, height, body, 1);
}

// ------------------------------------------------------------------ checks
{
  const palette = allColors();
  const problems: string[] = [];
  const walk = (dir: string): string[] =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
          const f = path.join(dir, e.name);
          return e.isDirectory() ? walk(f) : f.endsWith('.svg') ? [f] : [];
        })
      : [];
  for (const file of [...walk(ASSETS), ...walk(OVERRIDES)]) {
    const svg = fs.readFileSync(file, 'utf8');
    const rel = path.relative(process.cwd(), file);
    for (const m of svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,8})"/g)) {
      if (!palette.has(m[1].toLowerCase())) problems.push(`${rel}: ${m[1]} is not in the palette`);
    }
    for (const m of svg.matchAll(/<(?:path|use)[^>]*stroke="([^"]+)"[^>]*stroke-width="([^"]+)"/g)) {
      if (m[1].toLowerCase() === OUTLINE && Number(m[2]) !== OUTLINE_WIDTH) {
        problems.push(`${rel}: a dark line ${m[2]} wide (they are all ${OUTLINE_WIDTH})`);
      }
    }
    // A shape may be used again inside its own file (href="#..."). Nothing may point outside it.
    if (/<style|<script|<filter|href="[^#]/.test(svg)) problems.push(`${rel}: has a style, script, filter or a reference to another file`);
  }
  const unique = [...new Set(problems)];
  if (unique.length) {
    console.error(`sheet: ${unique.length} problem(s):\n  ${unique.slice(0, 40).join('\n  ')}`);
    process.exitCode = 1;
  } else {
    console.log('sheet: palette, line width and plain-SVG checks pass');
  }
}
