// npm run fx:sheet: every effect picture big on one sheet, white ones tinted as the game tints them,
// on a field's green and on night's dark, to build/fx-sheet.png. Look at it after drawing an effect.
import fs from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { fxArt } from '../src/art/fx';
import { Doc } from '../src/art/kit/draw';
import { ARCANE, FIRE, FROST, HOLY, VENOM } from '../src/art/kit/palette';

const only = process.argv.slice(2);
const list = fxArt({ arcane: ARCANE, fire: FIRE, frost: FROST, holy: HOLY, venom: VENOM }).filter((a) => only.length === 0 || only.includes(a.name));
const TINT: Record<string, string> = {
  cut: '#fff4d0', stab: '#fff4d0', impact: '#fff1c0', puff: '#d9cdb0', 'tongue-w': '#f2d264', star5: '#f2d264', rune: '#cdb6f7', note: '#f2d264',
  beam: '#fff3b8', pool: '#8fce4a', glyphs: '#f2d264', frostpatch: '#d4f1fb', 'warn-ring': '#c7364f', 'warn-disc': '#c7364f', 'warn-burst': '#c7364f', 'warn-blaze': '#c7364f', 'warn-lane': '#c7364f', chevron: '#c7364f',
};
const cell = 150;
const cols = 8;
const rows = Math.ceil(list.length / cols);
let body = '';
list.forEach((a, i) => {
  const d = new Doc(a.name);
  a.draw(d);
  const k = Math.min(110 / a.width, 110 / a.height, 2.5);
  const x = (i % cols) * cell + (cell - a.width * k) / 2;
  const y = Math.floor(i / cols) * cell + (cell - 24 - a.height * k) / 2;
  const tint = TINT[a.name];
  const filter = tint ? ` filter="url(#t-${i})"` : '';
  if (tint) {
    const r = parseInt(tint.slice(1, 3), 16) / 255;
    const g = parseInt(tint.slice(3, 5), 16) / 255;
    const b = parseInt(tint.slice(5, 7), 16) / 255;
    body += `<filter id="t-${i}"><feColorMatrix type="matrix" values="${r} 0 0 0 0 0 ${g} 0 0 0 0 0 ${b} 0 0 0 0 0 1 0"/></filter>`;
  }
  body += `<g transform="translate(${x} ${y}) scale(${k})"${filter}>${d.inner()}</g>`;
  body += `<text x="${(i % cols) * cell + cell / 2}" y="${Math.floor(i / cols) * cell + cell - 8}" font-family="sans-serif" font-size="13" text-anchor="middle" fill="#f4f1e4">${a.name}</text>`;
});
const w = cols * cell;
const h = rows * cell;
const svg = (bg: string): string => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${body}</svg>`;
fs.mkdirSync('build', { recursive: true });
fs.writeFileSync('build/fx-sheet.png', new Resvg(svg('#5c7f44')).render().asPng());
fs.writeFileSync('build/fx-sheet-dark.png', new Resvg(svg('#20262e')).render().asPng());
console.log(`fx sheet: ${list.length} pictures, build/fx-sheet.png and build/fx-sheet-dark.png`);
