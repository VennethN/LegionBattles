#!/usr/bin/env node
// node install.mjs <project> [--force] [--list]
//
// Copies the kit (assets/kit) into a project, each file to the same path
// under the project. A file that is already there is left alone, so that a
// project's own changes are never written over: --force writes over them.
// --list only says what it would do.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const kit = path.resolve(here, '../assets/kit');
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const target = path.resolve(args.find((a) => !a.startsWith('--')) ?? '.');

/** Every file under a folder, as paths from it. */
export function filesOf(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesOf(full, base));
    else out.push(path.relative(base, full));
  }
  return out.sort();
}

if (!fs.existsSync(kit)) {
  console.error(`install: no kit at ${kit}`);
  process.exit(1);
}
let copied = 0;
let kept = 0;
for (const rel of filesOf(kit)) {
  // The kit's note of where it was last taken from is the kit's own.
  if (rel === '.source') continue;
  const to = path.join(target, rel);
  const there = fs.existsSync(to);
  if (there && !flags.has('--force')) {
    kept++;
    if (flags.has('--list')) console.log(`keep   ${rel}`);
    continue;
  }
  if (flags.has('--list')) {
    console.log(`${there ? 'write  ' : 'copy   '}${rel}`);
    continue;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(kit, rel), to);
  copied++;
}
if (flags.has('--list')) process.exit(0);
console.log(`install: ${copied} files copied into ${target}${kept ? `, ${kept} already there and left alone (--force writes over them)` : ''}`);
console.log(`
Next:
  npm install --save-dev @resvg/resvg-js tsx typescript     (and phaser, for the runtime under src/view)
  add to package.json scripts:  "art": "tsx scripts/art.ts",  "art:sheet": "tsx scripts/sheet.ts",  "art:roster": "tsx scripts/roster.ts"
  say what the game shows in scripts/art.game.ts: as it comes, it shows everything
  npm run art          writes public/assets and its manifest.json
  npm run art:sheet    draws docs/art/*.png and checks colors and lines
  npm run art:roster   draws any units or sets from the source (-- check holds the whole cast to the style)
Read references/rules.md before drawing anything.`);
