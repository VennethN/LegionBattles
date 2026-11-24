// npm run art
//
// Writes every picture the game uses, as SVG, under public/assets, and the
// manifest that says how units are put together. Run it after changing
// anything under src/art, or after adding or changing a file in
// art/overrides (so that the manifest measures your file).
//
// It deletes and rewrites public/assets/{units,fx,board,icons,packs}. It never
// writes in art/overrides.

import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { boardArt } from '../src/art/board';
import { composeUnit, innerOf, type PartSource } from '../src/art/compose';
import { fxArt } from '../src/art/fx';
import { iconArt } from '../src/art/icons';
import { PACK_H, PACK_LOOKS, PACK_W, drawPack } from '../src/art/packs';
import { CANVAS, Doc } from '../src/art/kit/draw';
import { ARCANE, FIRE, FROST, HOLY, TEAMS, VENOM, type Team } from '../src/art/kit/palette';
import { drawPart } from '../src/art/kit/unit';
import type { Manifest, ManifestImage, ManifestPart } from '../src/art/manifest';
import { FEET_X, FEET_Y } from '../src/art/rig';
import { UNIT_ART } from '../src/art/units';

const OUT = path.resolve('public/assets');
const OVERRIDES = path.resolve('art/overrides');

function write(rel: string, content: string): void {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** The file the game will show at this path: a hand-edited one if there is one. */
export function effective(rel: string, generated: string): string {
  const file = path.join(OVERRIDES, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : generated;
}

/** Corner to corner of what an SVG draws, lines included, with a little room. */
function measure(svg: string, size: number): [number, number, number, number] | null {
  const box = new Resvg(svg).getBBox();
  if (!box || box.width <= 0 || box.height <= 0) return null;
  const pad = 2;
  const x0 = Math.max(0, Math.floor(box.x - pad));
  const y0 = Math.max(0, Math.floor(box.y - pad));
  const x1 = Math.min(size, Math.ceil(box.x + box.width + pad));
  const y1 = Math.min(size, Math.ceil(box.y + box.height + pad));
  return [x0, y0, x1 - x0, y1 - y0];
}

function union(a: [number, number, number, number] | null, b: [number, number, number, number] | null) {
  if (!a) return b;
  if (!b) return a;
  const x0 = Math.min(a[0], b[0]);
  const y0 = Math.min(a[1], b[1]);
  const x1 = Math.max(a[0] + a[2], b[0] + b[2]);
  const y1 = Math.max(a[1] + a[3], b[1] + b[3]);
  return [x0, y0, x1 - x0, y1 - y0] as [number, number, number, number];
}

function images(
  folder: string,
  list: Array<{ name: string; width: number; height: number; origin: [number, number]; draw: (d: Doc) => void }>,
): Record<string, ManifestImage> {
  const out: Record<string, ManifestImage> = {};
  for (const art of list) {
    const d = new Doc(art.name);
    art.draw(d);
    write(`${folder}/${art.name}.svg`, d.svg(art.width, art.height));
    out[art.name] = { width: art.width, height: art.height, origin: art.origin };
  }
  return out;
}

export function buildArt(): Manifest {
  for (const dir of ['units', 'fx', 'board', 'icons', 'packs']) fs.rmSync(path.join(OUT, dir), { recursive: true, force: true });

  const manifest: Manifest = {
    canvas: CANVAS,
    feet: [FEET_X, FEET_Y],
    teams: [...TEAMS],
    units: {},
    fx: {},
    board: {},
    icons: {},
    packs: {},
  };

  let files = 0;
  let overridden = 0;
  for (const unit of UNIT_ART) {
    const parts: ManifestPart[] = [];
    const shown = new Map<string, string>();
    for (const part of unit.parts) {
      let box: [number, number, number, number] | null = null;
      for (const team of TEAMS) {
        const rel = `units/${team}/${unit.id}/${part.name}.svg`;
        const generated = drawPart(unit, part, team).svg();
        write(rel, generated);
        files++;
        const svg = effective(rel, generated);
        if (svg !== generated) overridden++;
        shown.set(`${team}/${part.name}`, svg);
        box = union(box, measure(svg, CANVAS));
      }
      if (!box) throw new Error(`${unit.id}/${part.name} draws nothing`);
      parts.push({
        name: part.name,
        role: part.role,
        parent: part.parent,
        pivot: [part.pivot[0], part.pivot[1]],
        ...(part.sway !== undefined ? { sway: part.sway } : {}),
        box,
      });
    }
    // The whole unit standing still, for cards and menus.
    const source: PartSource = (_u, name, team: Team) => innerOf(shown.get(`${team}/${name}`) as string);
    for (const team of TEAMS) {
      const inner = composeUnit(unit, team, { source });
      write(
        `units/${team}/${unit.id}/full.svg`,
        `<svg xmlns="http://www.w3.org/2000/svg" id="${unit.id}" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">\n${inner}\n</svg>\n`,
      );
      files++;
    }
    let full: [number, number, number, number] | null = null;
    for (const p of parts) full = union(full, p.box);
    manifest.units[unit.id] = {
      style: unit.style,
      muzzle: [unit.muzzle[0], unit.muzzle[1]],
      top: unit.top,
      full: full as [number, number, number, number],
      parts,
    };
  }

  manifest.fx = images('fx', fxArt({ arcane: ARCANE, fire: FIRE, frost: FROST, holy: HOLY, venom: VENOM }));
  manifest.board = images('board', boardArt());
  manifest.icons = images('icons', iconArt());
  manifest.packs = images(
    'packs',
    Object.entries(PACK_LOOKS).map(([name, look]) => ({
      name,
      width: PACK_W,
      height: PACK_H,
      origin: [0.5, 0.5] as [number, number],
      draw: (d: Doc) => drawPack(d, look),
    })),
  );
  files +=
    Object.keys(manifest.fx).length + Object.keys(manifest.board).length + Object.keys(manifest.icons).length + Object.keys(manifest.packs).length;

  write('manifest.json', JSON.stringify(manifest, null, 1) + '\n');
  console.log(
    `art: ${UNIT_ART.length} units, ${files} files under public/assets` +
      (overridden ? `, ${overridden} measured from art/overrides` : ''),
  );
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/art.ts')) buildArt();
