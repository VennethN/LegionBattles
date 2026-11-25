// A quick look at units while they are being drawn:
//   npx tsx scripts/preview.ts [unit ...]   -> build/preview.png
import fs from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { composeUnit } from '../src/art/compose';
import { GRASS } from '../src/art/kit/palette';
import { UNIT_ART } from '../src/art/units';

const names = process.argv.slice(2);
const units = UNIT_ART.filter((u) => names.length === 0 || names.includes(u.id));
const cell = 192;
const cols = units.length;
let body = `<rect width="${cols * cell}" height="${cell * 2}" fill="${GRASS.fill}"/>`;
units.forEach((u, i) => {
  body += `<g transform="translate(${i * cell} 0)">${composeUnit(u, 'blue', { idSuffix: `-b${i}` })}</g>`;
  body += `<g transform="translate(${i * cell + cell} ${cell}) scale(-1 1)">${composeUnit(u, 'red', { idSuffix: `-r${i}` })}</g>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${cell * 2}" viewBox="0 0 ${cols * cell} ${cell * 2}">${body}</svg>`;
fs.mkdirSync('build', { recursive: true });
const zoom = Number(process.env.ZOOM ?? 3);
fs.writeFileSync('build/preview.png', new Resvg(svg, { fitTo: { mode: 'zoom', value: zoom } }).render().asPng());
console.log(`build/preview.png (${units.map((u) => u.id).join(', ')})`);
