// npm run art:roster [unit or set ...] [cols=6] [zoom=1.25] [pose=windup|strike|hit] [out=build/roster.png] [both] [shape]
// npm run art:roster check              what a program can check, over every unit the kit draws
// npm run art:roster list=docs/art/roster.md    the cast as a list: each set, each unit, its role, how it is read
//
// Draws units in rows with their names, straight from the art's source: no
// files have to have been written, so it shows the whole kit and not only
// what one game uses. It is how a batch of new units is looked at, and how
// the picture of the whole cast is made. Name units, or a set to draw the
// units of it, or a role (beast, engine, building ...). "both" draws the
// enemy's color under the player's. "shape" draws each as a black shape on
// white, which is how two units that are too alike are found.

import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { castList, castSets } from '../src/art/cast';
import { checkCast } from '../src/art/check';
import { composeUnit } from '../src/art/compose';
import { CANVAS } from '../src/art/kit/draw';
import { GRASS, OUTLINE } from '../src/art/kit/palette';
import { ATTACK_POSES, HIT_POSE } from '../src/art/poses';
import type { Pose } from '../src/art/rig';
import { UNIT_ART } from '../src/art/units';
import { UNIT_NOTES } from '../src/art/units/notes';

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string => args.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1) ?? fallback;
const names = args.filter((a) => !a.includes('=') && a !== 'both' && a !== 'check' && a !== 'shape');
const shape = args.includes('shape');
const both = args.includes('both');
const cols = Number(option('cols', '6'));
const zoom = Number(option('zoom', '1.25'));
const poseName = option('pose', '');
const out = path.resolve(option('out', 'build/roster.png'));

if (args.includes('check')) {
  const problems = checkCast();
  if (problems.length > 0) {
    console.error(`roster: ${problems.length} problem(s):\n  ${problems.slice(0, 60).join('\n  ')}`);
    process.exit(1);
  }
  console.log(`roster: ${UNIT_ART.length} units, each in the palette, with one line width, a shadow, a body, a line in the notes, and cloth of its side unless it is a trap`);
  process.exit(0);
}

const list = option('list', '');
if (list) {
  fs.mkdirSync(path.dirname(path.resolve(list)), { recursive: true });
  fs.writeFileSync(path.resolve(list), castList());
  console.log(`roster: ${list} (${UNIT_ART.length} units in ${castSets().length} sets)`);
  process.exit(0);
}

const named = (id: string): boolean => names.includes(id) || names.includes(UNIT_NOTES[id]?.set ?? '') || names.includes(UNIT_NOTES[id]?.role ?? '');
const wanted = UNIT_ART.filter((u) => names.length === 0 || named(u.id));
if (wanted.length === 0) throw new Error(`roster: nothing is named ${names.join(', ')}`);

const cell = CANVAS + 8;
// Riders, towers and a treant's crown stand over the top of the canvas, so a row has room above it.
const HEAD = 30;
const rowH = (both ? CANVAS * 2 : CANVAS) + 26 + HEAD;
const rows = Math.ceil(wanted.length / cols);
const width = cols * cell + 16;
const height = rows * rowH + 12;
// A black shape: every color to black, and whatever is half seen through (the shadow on the ground) to nothing.
const INK = '<filter id="ink" x="-20%" y="-20%" width="140%" height="140%"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 20 -10"/></filter>';
let body = shape ? `<defs>${INK}</defs><rect width="${width}" height="${height}" fill="#ffffff"/>` : `<rect width="${width}" height="${height}" fill="${GRASS.fill}"/>`;
let n = 0;
wanted.forEach((unit, i) => {
  const x = 8 + (i % cols) * cell;
  const y = 6 + HEAD + Math.floor(i / cols) * rowH;
  const pose: Pose | undefined = poseName === 'hit' ? HIT_POSE : poseName === 'windup' || poseName === 'strike' ? ATTACK_POSES[unit.style][poseName] : undefined;
  body += `<g transform="translate(${x} ${y})"${shape ? ' filter="url(#ink)"' : ''}>${composeUnit(unit, 'blue', { pose, idSuffix: `-b${n++}` })}</g>`;
  if (both) body += `<g transform="translate(${x + CANVAS} ${y + CANVAS}) scale(-1 1)">${composeUnit(unit, 'red', { pose, idSuffix: `-r${n++}` })}</g>`;
  body += `<text x="${x + CANVAS / 2}" y="${y + rowH - HEAD - 8}" font-family="DejaVu Sans, Arial, sans-serif" font-size="15" font-weight="bold" text-anchor="middle" fill="${OUTLINE}">${unit.id}</text>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, new Resvg(svg, { fitTo: { mode: 'zoom', value: zoom }, font: { loadSystemFonts: true } }).render().asPng());
console.log(`roster: ${path.relative(process.cwd(), out)} (${wanted.length} units, ${Math.round(width * zoom)} x ${Math.round(height * zoom)})`);
