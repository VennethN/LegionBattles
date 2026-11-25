// npm run art
//
// Writes every picture the game uses, as SVG, under public/assets, and the
// manifest that says how units are put together. Run it after changing
// anything under src/art, or after adding or changing a file in
// art/overrides (so that the manifest measures your file).
//
// Everything it writes under public/assets is its to write and to remove.
// It never writes in art/overrides.
//
// This file is the same for every game drawn with the kit. What a game
// shows of the kit, and what it draws that the kit does not have (its
// grounds, its own icons, the word in its logo), is said in
// scripts/art.game.ts.

import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { logoMarkSvg, logoSvg } from '../src/art/logo';
import { composeUnit, innerOf, type PartSource } from '../src/art/compose';
import { fxArt } from '../src/art/fx';
import { iconArt } from '../src/art/icons';
import { PACK_H, PACK_LOOKS, PACK_W, drawPack } from '../src/art/packs';
import { CANVAS, Doc, MARGIN, page } from '../src/art/kit/draw';
import { ARCANE, FIRE, FROST, HOLY, TEAMS, VENOM, type Team } from '../src/art/kit/palette';
import { drawPart } from '../src/art/kit/unit';
import type { Manifest, ManifestImage, ManifestPart } from '../src/art/manifest';
import { FEET_X, FEET_Y } from '../src/art/rig';
import { GRADE_H, GRADE_W, drawGrade } from '../src/art/grades';
import { UNIT_ART } from '../src/art/units';
import { GAME } from './art.game';

const OUT = path.resolve('public/assets');
const OVERRIDES = path.resolve('art/overrides');

/** The folders under public/assets that are this script's: a file in one of them that it did not write is removed. */
const GENERATED = [...new Set(['units', 'fx', 'icons', 'packs', 'grades', 'logo', ...GAME.scenes.map((sc) => sc.file.split('/')[0])])];
const written = new Set<string>();

/**
 * A picture as it is sent to a player: the same drawing in fewer bytes. The
 * kit names every shape and wraps every layer in a turn of nothing, which
 * helps whoever reads the drawing and costs a player who has to wait for it.
 * With a hundred units the art came to twice what a portal takes. So the
 * names nothing points at, the turns that do nothing and the line breaks
 * between tags are left out. Nothing that is drawn changes.
 */
export function slim(svg: string): string {
  // Each name something points at is given a short one: a picture is a document of its own, so they need only differ in it.
  const short = new Map<string, string>();
  for (const m of svg.matchAll(/(?:href="#|url\(#)([^")]+)/g)) if (!short.has(m[1])) short.set(m[1], `i${short.size.toString(36)}`);
  return svg
    .replace(/ id="([^"]+)"/g, (_all, id: string) => (short.has(id) ? ` id="${short.get(id)}"` : ''))
    .replace(/(href="#|url\(#)([^")]+)/g, (_all, how: string, id: string) => `${how}${short.get(id) ?? id}`)
    .replace(/ d="([^"]+)"/g, (all, d: string) => ` d="${tightPath(d) ?? all.slice(4, -1)}"`)
    .replace(/ transform="translate\((-?[\d.]+) (-?[\d.]+)\) rotate\(0\) scale\(1 1\) translate\(-?[\d.]+ -?[\d.]+\)"/g, (all: string, x: string, y: string) =>
      // Only a turn of nothing about a point and back again is nothing.
      all.endsWith(`translate(${-Number(x)} ${-Number(y)})"`) ? '' : all,
    )
    // And the numbers of a turn or a shade, as short as they read.
    .replace(/ (transform|opacity)="([^"]+)"/g, (_all, name: string, v: string) => ` ${name}="${v.replace(/(^|[ (])0\./g, '$1.').replace(/ -/g, '-')}"`)
    .replace(/<g>((?:(?!<g[ >]|<\/g>).)*)<\/g>/gs, '$1')
    .replace(/>\s+</g, '><')
    .replace(/^([\s\S]*)$/, (whole) => lined(whole));
}

/** A number as short as it can be written, to a hundredth: "0.5" is ".5", "2.00" is "2". */
function num(n: number): string {
  const t = String(Math.round(n * 100) / 100);
  return t.replace(/^(-?)0\./, '$1.');
}

/** Text that follows other text in a path, with room only where it would otherwise run into a number before it. */
function glue(out: string, t: string): string {
  if (out === '' || /[a-zA-Z]/.test(t[0]) || /[a-zA-Z]$/.test(out) || t.startsWith('-')) return out + t;
  // ".5" after "1.2" reads as a new number; after "12" it would not.
  if (t.startsWith('.') && /\.\d*$/.test(out)) return out + t;
  return `${out} ${t}`;
}

/** Numbers one after another, with room only where the next would otherwise run into the last. */
function nums(list: readonly number[]): string {
  return list.reduce((out, n) => glue(out, num(n)), '');
}

/**
 * A path written as short as it can be and drawn the same: each step from
 * where the last left off, where that is shorter, and a letter said again
 * only when it changes. Half of every picture is its paths. The point each
 * step starts from is the one the browser will have come to, so nothing is
 * thrown off by the rounding. Null for a path with letters it does not know,
 * which is written as it was.
 */
export function tightPath(d: string): string | null {
  const parts = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g);
  if (!parts) return null;
  const ARGS: Record<string, number> = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };
  let out = '';
  let was = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let i = 0;
  const round = (k: number): number => Math.round(k * 100) / 100;
  while (i < parts.length) {
    let cmd = parts[i++];
    if (!(cmd in ARGS)) return null;
    if (cmd === 'Z') {
      out += 'z';
      was = 'z';
      x = sx;
      y = sy;
      continue;
    }
    const n = ARGS[cmd];
    // A letter may be followed by more than one step of its kind; after a move, they are lines.
    do {
      const v = parts.slice(i, i + n).map(Number);
      if (v.length < n || v.some((k) => !Number.isFinite(k))) return null;
      i += n;
      const rel = v.map((k, j) => k - (j % 2 === 0 ? x : y));
      // A line straight across or straight down is one number.
      if (cmd === 'L' && (round(rel[0]) === 0 || round(rel[1]) === 0)) {
        const across = round(rel[1]) === 0;
        const letter = across ? 'h' : 'v';
        if (letter !== was) out += letter;
        out = glue(out, num(across ? rel[0] : rel[1]));
        was = letter;
        if (across) x = round(x + round(rel[0]));
        else y = round(y + round(rel[1]));
        continue;
      }
      const a = nums(v);
      const r = nums(rel);
      const useRel = r.length < a.length;
      const letter = useRel ? cmd.toLowerCase() : cmd;
      // A move is always said: a step after it with no letter of its own would be read as a line.
      if (letter !== was || cmd === 'M') out += letter;
      out = glue(out, useRel ? r : a);
      was = letter;
      // Where the browser will be after the step, as it reads what was written.
      const end = (useRel ? rel : v).slice(-2).map(round);
      x = useRel ? round(x + end[0]) : end[0];
      y = useRel ? round(y + end[1]) : end[1];
      if (cmd === 'M') {
        sx = x;
        sy = y;
        cmd = 'L';
      }
    } while (i < parts.length && !/[a-zA-Z]/.test(parts[i]));
  }
  return out;
}

/**
 * The one dark line round every shape is written the same way thousands of
 * times. Each width of it that a picture draws is said once, as a class, and
 * each shape that is lined names it: the line is drawn as it was.
 */
function lined(svg: string): string {
  const LINE = / fill="none" stroke="(#[0-9a-f]{6})" stroke-width="([\d.]+)" stroke-linecap="round" stroke-linejoin="round"/g;
  // So are the light and the shade laid over each shape: a color seen through.
  const SEEN = / fill="(#[0-9a-f]{6})" opacity="([\d.]+)"/g;
  const rules = new Map<string, string>();
  const named = (rule: string): string => {
    if (!rules.has(rule)) rules.set(rule, `c${rules.size.toString(36)}`);
    return ` class="${rules.get(rule)}"`;
  };
  const out = svg
    .replace(LINE, (_all, color: string, width: string) => named(`fill:none;stroke:${color};stroke-width:${width};stroke-linecap:round;stroke-linejoin:round`))
    .replace(SEEN, (_all, color: string, opacity: string) => named(`fill:${color};opacity:${opacity.replace(/^0\./, '.')}`));
  if (rules.size === 0) return svg;
  return out.replace(/^(<svg[^>]*>)/, `$1<style>${[...rules].map(([rule, name]) => `.${name}{${rule}}`).join('')}</style>`);
}

/**
 * Writes a file only if it has changed, and remembers it. A file that is
 * the same as before is left alone, so a dev server that is running does
 * not see everything vanish and come back.
 */
function write(rel: string, drawn: string): void {
  const content = rel.endsWith('.svg') ? slim(drawn) : drawn;
  const file = path.join(OUT, rel);
  written.add(file);
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** Removes what an earlier run wrote and this one did not: a part that was renamed, a unit that is gone. */
function sweep(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      sweep(file);
      if (fs.readdirSync(file).length === 0) fs.rmdirSync(file);
    } else if (!written.has(file)) {
      fs.rmSync(file);
    }
  }
}

/** The file the game will show at this path: a hand-edited one if there is one. */
export function effective(rel: string, generated: string): string {
  const file = path.join(OVERRIDES, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : generated;
}

/**
 * Corner to corner of what a unit's file draws, lines included, with a
 * little room, on the canvas: a spear that reaches past the canvas gives a
 * box that does. What reaches the edge of the page itself would be cut off
 * in the game, so that is an error, and so is a file with another page.
 */
function measure(svg: string, rel: string): [number, number, number, number] | null {
  const size = CANVAS + MARGIN * 2;
  if (!svg.includes(`viewBox="${-MARGIN} ${-MARGIN} ${size} ${size}"`)) {
    throw new Error(`${rel}: its page must be viewBox="${-MARGIN} ${-MARGIN} ${size} ${size}" (the ${CANVAS} canvas with ${MARGIN} all round)`);
  }
  // Counted from the picture itself, so that it does not matter how a renderer reports a box.
  const img = new Resvg(svg).render();
  const px = img.pixels;
  let x0 = size;
  let y0 = size;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (px[(y * size + x) * 4 + 3] === 0) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  if (x0 === 0 || y0 === 0 || x1 === size - 1 || y1 === size - 1) {
    throw new Error(`${rel}: it runs off its page, ${MARGIN} past the canvas, and would be cut off. Make it smaller or MARGIN bigger.`);
  }
  const pad = 2;
  const left = Math.max(0, x0 - pad) - MARGIN;
  const top = Math.max(0, y0 - pad) - MARGIN;
  const right = Math.min(size, x1 + 1 + pad) - MARGIN;
  const bottom = Math.min(size, y1 + 1 + pad) - MARGIN;
  return [left, top, right - left, bottom - top];
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
  written.clear();

  const manifest: Manifest = {
    canvas: CANVAS,
    margin: MARGIN,
    feet: [FEET_X, FEET_Y],
    teams: [...TEAMS],
    units: {},
    fx: {},
    icons: {},
    packs: {},
    grades: {},
  };

  let files = 0;
  let overridden = 0;
  let units = 0;
  const rigged = (team: Team, unit: string): boolean => GAME.rigged?.(team, unit) ?? true;
  for (const unit of UNIT_ART) {
    const teams = TEAMS.filter((t) => GAME.wants(t, unit.id));
    if (teams.length === 0) continue;
    units++;
    const parts: ManifestPart[] = [];
    const shown = new Map<string, string>();
    for (const part of unit.parts) {
      let box: [number, number, number, number] | null = null;
      for (const team of teams) {
        const rel = `units/${team}/${unit.id}/${part.name}.svg`;
        const generated = drawPart(unit, part, team).svg(CANVAS, CANVAS, MARGIN);
        // A unit the game shows only whole, as stills, is put together here and its parts are not written.
        if (rigged(team, unit.id)) {
          write(rel, generated);
          files++;
        }
        const svg = effective(rel, generated);
        if (svg !== generated) overridden++;
        shown.set(`${team}/${part.name}`, svg);
        box = union(box, measure(svg, rel));
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
    // The whole unit standing still, for cards and lists, where the game shows one.
    const source: PartSource = (_u, name, team: Team) => innerOf(shown.get(`${team}/${name}`) as string);
    for (const team of teams) {
      if (!GAME.whole(team, unit.id)) continue;
      const inner = composeUnit(unit, team, { source });
      write(`units/${team}/${unit.id}/full.svg`, page(unit.id, inner, CANVAS, CANVAS, MARGIN));
      files++;
    }
    // The whole unit at the far end of a movement or two, for a game that shows a crowd of them as single pictures
    // changed in turn: a figure moved part by part costs eight pictures and a pose worked out, every frame.
    let stills: Record<string, [number, number, number, number]> | null = null;
    for (const team of teams) {
      const poses = GAME.stills?.(team, unit.id);
      if (!poses) continue;
      stills ??= {};
      for (const [name, pose] of Object.entries(poses)) {
        const rel = `units/${team}/${unit.id}/still-${name}.svg`;
        const svg = page(`${unit.id}-${name}`, composeUnit(unit, team, { source, pose }), CANVAS, CANVAS, MARGIN);
        write(rel, svg);
        files++;
        stills[name] = union(stills[name] ?? null, measure(svg, rel)) as [number, number, number, number];
      }
    }
    let full: [number, number, number, number] | null = null;
    for (const p of parts) full = union(full, p.box);
    manifest.units[unit.id] = {
      style: unit.style,
      muzzle: [unit.muzzle[0], unit.muzzle[1]],
      top: unit.top,
      full: full as [number, number, number, number],
      parts,
      ...(stills ? { stills } : {}),
    };
  }

  manifest.fx = images('fx', fxArt({ arcane: ARCANE, fire: FIRE, frost: FROST, holy: HOLY, venom: VENOM }));
  // The game's own painted scenes. Each is one picture, loaded by itself when it is wanted and not packed on a sheet.
  for (const scene of GAME.scenes) write(scene.file, scene.svg());
  // The logo, and its mark alone: each one picture, loaded by itself where it is shown.
  write('logo/logo.svg', GAME.logo ? GAME.logo.svg() : logoSvg(GAME.logoWord, GAME.logoFirst));
  write('logo/mark.svg', GAME.logo ? GAME.logo.mark() : logoMarkSvg());
  const icons = [...iconArt(), ...GAME.icons()].filter((i) => !GAME.onlyIcons || GAME.onlyIcons.has(i.name));
  for (const name of GAME.onlyIcons ?? []) if (!icons.some((i) => i.name === name)) throw new Error(`art: no icon is drawn by the name "${name}"`);
  manifest.icons = images('icons', icons);
  manifest.packs = images(
    'packs',
    Object.entries(PACK_LOOKS)
      .filter(([name]) => !GAME.onlyPacks || GAME.onlyPacks.has(name))
      .map(([name, look]) => ({
        name,
        width: PACK_W,
        height: PACK_H,
        origin: [0.5, 0.5] as [number, number],
        draw: (d: Doc) => drawPack(d, look),
      })),
  );
  // A grade's badge has the middle of its plate for its own middle, whatever stands out of it.
  manifest.grades = images(
    'grades',
    GAME.grades.map((letter, grade) => ({
      name: letter,
      width: GRADE_W,
      height: GRADE_H,
      origin: [0.5, 54 / GRADE_H] as [number, number],
      draw: (d: Doc) => drawGrade(d, grade, letter),
    })),
  );
  files += Object.keys(manifest.fx).length + GAME.scenes.length + Object.keys(manifest.icons).length + Object.keys(manifest.packs).length + Object.keys(manifest.grades).length + 2;

  write('manifest.json', JSON.stringify(manifest, null, 1) + '\n');
  for (const dir of GENERATED) sweep(path.join(OUT, dir));
  console.log(
    `art: ${units} of the kit's ${UNIT_ART.length} units, ${files} files under public/assets` +
      (overridden ? `, ${overridden} measured from art/overrides` : ''),
  );
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/art.ts')) buildArt();
