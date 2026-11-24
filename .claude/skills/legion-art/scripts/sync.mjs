#!/usr/bin/env node
// node sync.mjs <project> [--check] [--adopt]
//
// Takes a project's art source back into the skill (assets/kit), so that
// the next game starts from what this one added: every file the kit has,
// and every new file in the folders the kit owns whole. --check changes
// nothing and fails if the two differ, for a test to run.
//
// The kit remembers which project it was last taken from. Asked to take
// from another, it stops: that project's files may be the older ones, and
// would go over the newer. --adopt says they are to be taken all the same.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const kit = path.resolve(here, '../assets/kit');
const args = process.argv.slice(2);
const check = args.includes('--check');
const project = path.resolve(args.find((a) => !a.startsWith('--')) ?? '.');

/** The folders that are the kit's from top to bottom: a new file in one of them is a new part of the kit. */
const WHOLE = ['src/art', 'src/view/art'];

/**
 * What is a game's own and stays out of the kit, though the kit has a file by the same name: the kit's
 * scripts/art.game.ts shows everything, and a game's names its own cast from its own data.
 */
const OWN = new Set(['scripts/art.game.ts']);

function filesOf(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesOf(full, base));
    else out.push(path.relative(base, full));
  }
  return out.sort();
}

/** The project's name, by its package.json, and the name of the project the kit was last taken from. */
const SOURCE = path.join(kit, '.source');
let name = path.basename(project);
try {
  name = JSON.parse(fs.readFileSync(path.join(project, 'package.json'), 'utf8')).name ?? name;
} catch {
  // No package.json: the folder's name will do.
}
const last = fs.existsSync(SOURCE) ? fs.readFileSync(SOURCE, 'utf8').trim() : '';
if (!check && last && last !== name && !args.includes('--adopt')) {
  console.error(
    `sync: the kit was last taken from "${last}", and this project is "${name}".\n` +
      `Its files would go over the kit's, which may be the newer. Look first (--check lists where they differ),\n` +
      `and pass --adopt if this project's are the ones to keep.`,
  );
  process.exit(2);
}

const wanted = new Set(filesOf(kit).filter((rel) => rel !== '.source'));
for (const folder of WHOLE) for (const rel of filesOf(path.join(project, folder))) wanted.add(path.join(folder, rel));

const differs = [];
let copied = 0;
for (const rel of [...wanted].sort()) {
  if (OWN.has(rel.split(path.sep).join('/'))) continue;
  const from = path.join(project, rel);
  const to = path.join(kit, rel);
  if (!fs.existsSync(from)) {
    // The project has let go of a file the kit holds: the kit keeps it, as another game may want it.
    continue;
  }
  const same = fs.existsSync(to) && fs.readFileSync(from).equals(fs.readFileSync(to));
  if (same) continue;
  if (check) {
    differs.push(rel);
    continue;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  copied++;
}
if (check) {
  if (differs.length > 0) {
    console.error(
      `sync: the skill's kit and the project differ in ${differs.length} files:\n  ${differs.join('\n  ')}\n` +
        (last && last !== name
          ? `The kit was last taken from "${last}", so its copies may be the newer ones.`
          : `Run: node ${path.relative(project, path.join(here, 'sync.mjs'))} .`),
    );
    process.exit(1);
  }
  console.log('sync: the skill has the project\'s kit');
} else {
  fs.writeFileSync(SOURCE, `${name}\n`);
  console.log(`sync: ${copied} files taken into the skill from "${name}"`);
}
