// npm run art (its second half): writes the game's own style, the Grim kit
// (src/grim, a copy of VennethN/game-assets styles/grim/source/src/art), to
// public/assets/grim, as that kit's own export does.
//
// grim/units/<id>/<part>.svg   each part of a figure, on the figure's page
// grim/units/<id>/full.svg     the figure put together, standing: for a card
// grim/things/<id>.svg         lair pieces and interface pieces
// grim/grounds/<lair>-<shape>.svg   a lair's floor, at the size of the field, lying down and on end
// grim/manifest.json           every figure's parts, pivots, boxes, moves and stills: what the game rigs them from

import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { THINGS } from '../src/grim/all';
import { composeUnit } from '../src/grim/compose';
import { Doc, page } from '../src/grim/kit/draw';
import { drawPart } from '../src/grim/kit/unit';
import { churchyardGround } from '../src/grim/lair';
import { FALL, HIT, STRIDE, TREAD } from '../src/grim/poses';
import { UNIT_ART } from '../src/grim/units';
import { UNIT_NOTES } from '../src/grim/units/notes';
import { FIELD } from '../src/game/content';

const OUT = 'public/assets/grim';

/** Corner to corner of what a picture draws, on its canvas: [x, y, width, height]. */
function boxOf(svg: string, w: number, h: number, margin: number): [number, number, number, number] {
  const px = new Resvg(svg).render().pixels;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] === 0) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error('a part draws nothing');
  return [x0 - margin, y0 - margin, x1 - x0 + 1, y1 - y0 + 1];
}

const files = new Map<string, string>();
const manifest = { style: 'grim', poses: { stride: STRIDE, tread: TREAD, hit: HIT, fall: FALL }, units: {} as Record<string, unknown>, things: {} as Record<string, unknown> };
for (const unit of UNIT_ART) {
  const [cw, ch] = unit.canvas;
  const W = cw + unit.margin * 2;
  const H = ch + unit.margin * 2;
  const parts = unit.parts.map((p) => {
    const svg = drawPart(unit, p).svg(cw, ch, unit.margin);
    files.set(`units/${unit.id}/${p.name}.svg`, svg);
    return { name: p.name, role: p.role, parent: p.parent, pivot: [p.pivot[0], p.pivot[1]], ...(p.sway !== undefined ? { sway: p.sway } : {}), ...(p.hangs ? { hangs: true } : {}), box: boxOf(svg, W, H, unit.margin) };
  });
  const full = page(unit.id, composeUnit(unit), cw, ch, unit.margin);
  files.set(`units/${unit.id}/full.svg`, full);
  manifest.units[unit.id] = {
    ...UNIT_NOTES[unit.id], canvas: [cw, ch], feet: [unit.feet[0], unit.feet[1]], margin: unit.margin, muzzle: [unit.muzzle[0], unit.muzzle[1]], top: unit.top,
    full: boxOf(full, W, H, unit.margin), parts, moves: unit.moves, stills: unit.stills ?? {},
  };
}
for (const t of THINGS) {
  const d = new Doc(t.id);
  t.draw(d);
  files.set(`things/${t.id}.svg`, d.svg(t.width, t.height));
  manifest.things[t.id] = { set: t.set, width: t.width, height: t.height, origin: [t.origin[0], t.origin[1]] };
}
for (const [shape, w, h] of [['wide', FIELD.long, FIELD.short], ['tall', FIELD.short, FIELD.long]] as const) {
  files.set(`grounds/churchyard-${shape}.svg`, churchyardGround(w, h).svg(w, h));
}
files.set('manifest.json', `${JSON.stringify(manifest)}\n`);

fs.rmSync(OUT, { recursive: true, force: true });
let bytes = 0;
for (const [rel, data] of files) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, data);
  bytes += data.length;
}
console.log(`grim: ${UNIT_ART.length} figures, ${THINGS.length} things, ${files.size} files, ${Math.round(bytes / 1024)} KB under ${OUT}`);
