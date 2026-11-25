// npm run roster [figure ...] [cols=4] [zoom=2] [pose=<move>.windup|<move>.strike|<still>] [ground=dark|lit|paper] [out=build/roster.png] [shape] [poses]
// npm run roster check       what a program can check, over every figure the kit draws
//
// Draws figures in rows with their names, straight from the source. "shape"
// draws each as a black shape on white, which is how two figures that are
// too alike are found. "poses" draws one figure at rest and at both ends of
// every move and every still it has. "ground" is what they stand on: a lair
// as the game lights it near a lamp (lit), away from one (dark), or paper.

import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { checkCast } from '../../src/grim/check';
import { composeUnit } from '../../src/grim/compose';
import { EARTH, INK, PAPER } from '../../src/grim/kit/palette';
import type { UnitArt } from '../../src/grim/kit/unit';
import type { Pose } from '../../src/grim/rig';
import { UNIT_ART } from '../../src/grim/units';

const args = process.argv.slice(2);
const flags = new Set(['check', 'shape', 'poses']);
const option = (name: string, fallback: string): string => args.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1) ?? fallback;
const names = args.filter((a) => !a.includes('=') && !flags.has(a));
const shape = args.includes('shape');
const zoom = Number(option('zoom', '2'));
const poseName = option('pose', '');
const ground = option('ground', 'lit');
const out = path.resolve(option('out', 'build/roster.png'));

if (args.includes('check')) {
  const problems = checkCast();
  if (problems.length > 0) {
    console.error(`roster: ${problems.length} problem(s):\n  ${problems.slice(0, 60).join('\n  ')}`);
    process.exit(1);
  }
  console.log(`roster: ${UNIT_ART.length} figures, each in the palette, with a blot, a body, parts that hang from parts it has, and poses that are whole`);
  process.exit(0);
}

const wanted = names.length === 0 ? UNIT_ART : names.map((n) => {
  const u = UNIT_ART.find((x) => x.id === n);
  if (!u) throw new Error(`roster: nothing is named ${n}`);
  return u;
});

interface Cell {
  unit: UnitArt;
  pose?: Pose;
  label: string;
}

function poseOf(unit: UnitArt, name: string): Pose | undefined {
  if (!name) return undefined;
  const [a, b] = name.split('.');
  if (b === 'windup' || b === 'strike') return unit.moves[a]?.[b];
  return unit.stills?.[a];
}

let cells: Cell[];
if (args.includes('poses')) {
  cells = wanted.flatMap((unit) => [
    { unit, label: `${unit.id}` },
    ...Object.entries(unit.moves).flatMap(([m, mv]) => [
      { unit, pose: mv.windup, label: `${m}: back` },
      { unit, pose: mv.strike, label: `${m}: blow` },
    ]),
    ...Object.entries(unit.stills ?? {}).map(([s, p]) => ({ unit, pose: p, label: s })),
  ]);
} else cells = wanted.map((unit) => ({ unit, pose: poseOf(unit, poseName), label: unit.id }));

const cols = Number(option('cols', String(Math.min(cells.length, args.includes('poses') ? 5 : 4))));
// Every cell is as big as the biggest figure's page, and figures stand on one line.
const cw = Math.max(...cells.map((c) => c.unit.canvas[0] + c.unit.margin * 2));
const ch = Math.max(...cells.map((c) => c.unit.canvas[1] + c.unit.margin * 2));
const rowH = ch + 26;
const rows = Math.ceil(cells.length / cols);
const width = cols * cw + 16;
const height = rows * rowH + 12;
const fill = shape ? '#ffffff' : ground === 'dark' ? '#1f1e19' : ground === 'paper' ? PAPER.lit : EARTH.lit;
const text = shape || ground === 'paper' ? INK : PAPER.lit;
const BLACK = '<filter id="black" x="-20%" y="-20%" width="140%" height="140%"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 20 -10"/></filter>';
let body = `${shape ? `<defs>${BLACK}</defs>` : ''}<rect width="${width}" height="${height}" fill="${fill}"/>`;
cells.forEach((c, i) => {
  const u = c.unit;
  const x = 8 + (i % cols) * cw + (cw - u.canvas[0]) / 2;
  const y = 6 + Math.floor(i / cols) * rowH + (ch - u.margin - u.canvas[1]);
  body += `<g transform="translate(${x} ${y})"${shape ? ' filter="url(#black)"' : ''}>${composeUnit(u, { pose: c.pose, idSuffix: `-n${i}`, noShadow: shape })}</g>`;
  body += `<text x="${8 + (i % cols) * cw + cw / 2}" y="${6 + Math.floor(i / cols) * rowH + ch + 14}" font-family="DejaVu Sans, Arial, sans-serif" font-size="15" font-weight="bold" text-anchor="middle" fill="${text}">${c.label}</text>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, new Resvg(svg, { fitTo: { mode: 'zoom', value: zoom }, font: { loadSystemFonts: true } }).render().asPng());
console.log(`roster: ${path.relative(process.cwd(), out)} (${cells.length} drawn, ${Math.round(width * zoom)} x ${Math.round(height * zoom)})`);
