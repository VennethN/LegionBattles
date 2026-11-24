// npm run art:sheet
//
// Draws the pictures to look at before believing the art is right, into
// docs/art:
//
//   contact-sheet.png  every unit on both teams, every part, every effect
//   poses.png          every unit at the far end of each movement
//   silhouettes.png    every unit as a black shape 48 px tall, in one row
//
// It also checks what a program can check: that no color is off the palette
// and that every dark line is the one width. Whether there is a face on
// anything, only looking at the sheet can tell.

import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { composeUnit, innerOf, withIdSuffix, type PartSource } from '../src/art/compose';
import { CANVAS } from '../src/art/kit/draw';
import { GRASS, OUTLINE, OUTLINE_WIDTH, TEAMS, allColors, type Team } from '../src/art/kit/palette';
import type { UnitArt } from '../src/art/kit/unit';
import { ATTACK_POSES, HIT_POSE, HOP_POSE, LAND_POSE, TOPPLE_POSE } from '../src/art/poses';
import type { Pose } from '../src/art/rig';
import { UNIT_ART } from '../src/art/units';
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
  const cell = 200;
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
        body += unitAt(unit, team, 20 + c * cell + 4, y, 1, undefined, team === 'red');
        if (team === 'blue') body += label(20 + c * cell + cell / 2, y + 12, unit.id);
      }
      y += cell - 4;
    }
    y += 8;
  }

  // Every part by itself, on its own canvas, so a stray shape shows.
  body += label(20, y + 22, 'PARTS: each layer alone, with its pivot (cross)', 16, 'start');
  y += 34;
  const ps = 0.62;
  const pc = CANVAS * ps + 6;
  for (const unit of units) {
    const perLine = Math.floor((width - 130) / pc);
    for (const team of TEAMS) {
      body += label(20, y + 20, `${unit.id}`, 13, 'start');
      body += label(20, y + 36, team, 12, 'start', team === 'blue' ? '#2f5893' : '#933027');
      unit.parts.forEach((part, i) => {
        const col = i % perLine;
        const row = Math.floor(i / perLine);
        const x = 120 + col * pc;
        const yy = y + row * pc;
        const inner = withIdSuffix(source(unit, part.name, team), `-p${serial++}`);
        body += `<rect x="${x}" y="${yy}" width="${CANVAS * ps}" height="${CANVAS * ps}" rx="6" fill="${GRASS.shade}"/>`;
        body += `<g transform="translate(${x} ${yy}) scale(${ps})">${inner}`;
        const [px, py] = part.pivot;
        body += `<path d="M ${px - 7} ${py} L ${px + 7} ${py} M ${px} ${py - 7} L ${px} ${py + 7}" stroke="#ffffff" stroke-width="2.5"/></g>`;
        body += label(x + (CANVAS * ps) / 2, yy + CANVAS * ps - 5, part.name, 10);
      });
      y += Math.ceil(unit.parts.length / perLine) * pc + 4;
    }
    y += 6;
  }

  // Effects, board pieces and icons.
  for (const [folder, title] of [['fx', 'EFFECTS'], ['board', 'BOARD'], ['icons', 'ICONS']] as const) {
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

  save('contact-sheet.png', width, y, `<rect width="${width}" height="${y}" fill="${GRASS.fill}"/>${body}`, 1.5);
}

// ------------------------------------------------------------------- poses
{
  const cell = 176;
  const scale = 0.9;
  const names = ['rest', 'windup', 'strike', 'hop', 'land', 'hit', 'topple'];
  const width = names.length * cell + 110;
  const height = units.length * cell + 40;
  let body = `<rect width="${width}" height="${height}" fill="${GRASS.fill}"/>`;
  names.forEach((n, i) => (body += label(100 + i * cell + cell / 2, 24, n)));
  units.forEach((unit, r) => {
    const attack = ATTACK_POSES[unit.style];
    const poses: Array<Pose | undefined> = [undefined, attack.windup, attack.strike, HOP_POSE, LAND_POSE, HIT_POSE, TOPPLE_POSE];
    body += label(14, 40 + r * cell + cell / 2, unit.id, 13, 'start');
    body += label(14, 56 + r * cell + cell / 2, unit.style, 11, 'start', '#3b5a26');
    poses.forEach((p, i) => {
      body += unitAt(unit, r % 2 === 0 ? 'blue' : 'red', 100 + i * cell + 4, 34 + r * cell, scale, p);
    });
  });
  save('poses.png', width, height, body, 1.5);
}

// ------------------------------------------------------------- silhouettes
{
  // Every unit as one black shape, 48 px tall from its top to its feet.
  const all = UNIT_ART;
  const gap = 78;
  const width = all.length * gap + 40;
  const height = 96;
  let body = `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
  all.forEach((unit, i) => {
    const tall = 180 - unit.top;
    const scale = 48 / tall;
    let inner = composeUnit(unit, 'blue', { source, noShadow: true, idSuffix: `-s${serial++}` });
    inner = inner
      .replace(/fill="#[0-9a-fA-F]{3,8}"/g, 'fill="#000000"')
      .replace(/stroke="#[0-9a-fA-F]{3,8}"/g, 'stroke="#000000"')
      .replace(/ opacity="[^"]*"/g, '');
    const x = 20 + i * gap + gap / 2 - 96 * scale;
    const y = 66 - 180 * scale;
    body += `<g transform="translate(${x} ${y}) scale(${scale})">${inner}</g>`;
    body += label(20 + i * gap + gap / 2, 86, unit.id, 10);
  });
  save('silhouettes.png', width, height, body, 2);
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
    for (const m of svg.matchAll(/<path[^>]*stroke="([^"]+)"[^>]*stroke-width="([^"]+)"/g)) {
      if (m[1].toLowerCase() === OUTLINE && Number(m[2]) !== OUTLINE_WIDTH) {
        problems.push(`${rel}: a dark line ${m[2]} wide (they are all ${OUTLINE_WIDTH})`);
      }
    }
    if (/<style|<script|<filter|href=/.test(svg)) problems.push(`${rel}: has a style, script, filter or reference`);
  }
  const unique = [...new Set(problems)];
  if (unique.length) {
    console.error(`sheet: ${unique.length} problem(s):\n  ${unique.slice(0, 40).join('\n  ')}`);
    process.exitCode = 1;
  } else {
    console.log('sheet: palette, line width and plain-SVG checks pass');
  }
}
