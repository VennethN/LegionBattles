// The likeness on a contract's bill: each lord who came later, head and
// shoulders, as the figure itself is drawn, cut to an oval on the dark,
// with a hard ink ring round it. The game lays it on the bill's paper.

import { composeUnit } from './compose';
import { Doc } from './kit/draw';
import { NIGHT } from './kit/palette';
import { poly, type Pt } from './kit/path';
import type { Thing } from './things';
import { unit } from './units';

const W = 200;
const H = 240;

function oval(cx: number, cy: number, rx: number, ry: number, n = 28): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt;
  });
}

/** A bust of a figure: the part of its canvas from x0 across `w` and down from y0 fills the oval. */
function bust(id: string, x0: number, y0: number, w: number): (d: Doc) => void {
  return (d) => {
    const ring = oval(W / 2, H / 2, W / 2 - 8, H / 2 - 8);
    const inside = oval(W / 2, H / 2, W / 2 - 14, H / 2 - 14);
    d.black('ring', poly(ring));
    d.flat('dark', poly(inside), NIGHT.mid);
    const k = (W - 28) / w;
    d.embed('figure', composeUnit(unit(id), { idSuffix: `-poster`, noShadow: true }), `translate(${14 - x0 * k} ${14 - y0 * k}) scale(${k})`, poly(inside));
  };
}

export const POSTERS: Thing[] = [
  { id: 'poster-spinner', set: 'posters', width: W, height: H, origin: [W / 2, H / 2], draw: bust('spinner', 190, 150, 540) },
  { id: 'poster-abbot', set: 'posters', width: W, height: H, origin: [W / 2, H / 2], draw: bust('abbot', 210, 0, 340) },
  { id: 'poster-furnace', set: 'posters', width: W, height: H, origin: [W / 2, H / 2], draw: bust('furnace', 170, 0, 460) },
  { id: 'poster-mirror', set: 'posters', width: W, height: H, origin: [W / 2, H / 2], draw: bust('mirror', 140, -20, 400) },
];
