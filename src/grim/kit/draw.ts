// How a piece is drawn in the Grim style.
//
// The light is firelight, in front of a figure and above it. Figures are
// drawn facing right, so the light is at the top right. Every tone is a flat
// shape with a hard edge:
//
//   the outline  black and thick, thicker still on the side away from the light,
//                and broken open here and there on the side toward it
//   the lit      one flat color
//   the middle   a band of a darker color where the form turns away
//   the shadow   solid black, cut with a hard edge, designed across the figure:
//                under a brim, under an arm, down the inside of a leg, where a
//                weapon casts it. It is not "the back of each piece".
//   the cold rim a thin line of cold light along a back turned from the fire,
//                so that a black back does not vanish in a dark lair
//
// Shadow is a shape, not a gradient and not hatching: half of a figure may
// be black, and its eyes always are.
//
// SVG has no line whose width changes. The outline here is not a stroke of
// the shape at all: it is the shape in black, a little bigger, moved a
// little away from the light, lying under the shape's color. Where the color
// covers it nearly to its edge the line is thinner; on the far side it shows
// wide. One element gives every piece the same outline.
//
// A piece left to itself has its back in shadow, which is right for a
// thing that stands alone and only a start for a figure. A figure's shadows
// are designed by whoever draws it: as a piece's own `dark`, or with
// `shade`, which lays one black shape over several pieces at once and is cut
// to all of them together, so that the shadow under an arm runs across coat,
// belt and sash as one shape.
//
// Detail is a second layer, and it is quiet: seams, folds, stitches, pits,
// grain are drawn in the piece's own middle tone on its lit part (`detail`),
// a step off the fill, so that a figure seen big is rich and a figure seen
// small is still its big shapes.
//
// There are no gradients, no filters and no pictures. A file here is plain
// attributes and ids, a shape written once and used for its outline, its
// color and its clip.

import { dice } from './dice';
import { COLD, FIRELIGHT, GROUND_SHADOW, INK, RIM_STRENGTH, SCRATCH, type Tone } from './palette';
import { Path, poly, type Pt } from './path';

/** How wide the line is where it is thinnest, toward the light. */
export const LINE = 3;
/** How much wider it gets on the side away from the light. */
export const HEAVY = 3.6;
/** Which way the light comes from, as a step toward it: up and to the right. */
export const TO_LIGHT: Pt = [0.8, -0.6];

export interface InkOpts {
  /**
   * The shadow on this piece: a shape, cut to the piece. A number is "this share of its back", which is what a
   * piece gets if nothing is said (0.4). False for none. The shadows that make a figure, under a brim, under an
   * arm, are designed on top of that with `shade`.
   */
  dark?: number | Path | false;
  /** How wide the band of the middle tone is, between the lit and the dark. 0 for none. */
  mid?: number;
  /** How wide a sliver of firelight is along the edge toward the light. None unless asked: it is for a blade's edge, a letter, wet stone. */
  rim?: number;
  /** How wide the cold rim is along the edge away from the light. For the pieces that are a figure's back. */
  cold?: number;
  /** Places where the outline is broken open on the lit side: each from one point of the edge to another. */
  open?: ReadonlyArray<readonly [Pt, Pt]>;
  /** The line's two widths, where a piece wants a finer or a heavier one. */
  line?: number;
  heavy?: number;
  /** False for a piece with no line round it, which lies inside another. */
  outline?: boolean;
  /** Drawn inside the piece, cut to its shape, over its tones. */
  inner?: (d: Doc) => void;
  /** For a shape with holes in it: a path inside a path is a hole. */
  holes?: boolean;
}

function attrs(a: Record<string, string | number | undefined>): string {
  return Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
}

function r(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * The edge of a shadow from one point to another, as the points of a polygon's side: straight, with one hard
 * break in it, which is what makes a shadow look cut and not ruled. `into` is which side the break steps to:
 * 1 for the left of the way the edge runs, -1 for the right. Give it the name of what it is on, so that it
 * breaks at the same place every time.
 */
export function cut(a: Pt, b: Pt, seed: string, into: 1 | -1 = 1, depth = 7): Pt[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  if (len < 26) return [a, b];
  const rnd = dice(seed);
  const nx = (-dy / len) * into;
  const ny = (dx / len) * into;
  const t = rnd.range(0.34, 0.62);
  const step = Math.min(depth, len * 0.16) * rnd.range(0.7, 1);
  const run = Math.min(len * 0.12, step * 1.1);
  const px = a[0] + dx * t;
  const py = a[1] + dy * t;
  // Above the break the edge stands a little further into the light, below it a little back: a notch, as a chisel leaves.
  return [
    [a[0] + nx * step * 0.5, a[1] + ny * step * 0.5],
    [px + nx * step * 0.5, py + ny * step * 0.5],
    [px + (dx / len) * run - nx * step * 0.5, py + (dy / len) * run - ny * step * 0.5],
    [b[0] - nx * step * 0.5, b[1] - ny * step * 0.5],
  ];
}

/**
 * A torn edge from one point to another, as the points of a polygon's side:
 * straight, with thin teeth that lean toward the light. `into` is which side
 * of the edge the teeth point to: 1 for the left of the way it runs, -1 for
 * the right. Give it the name of what it is on, so it tears the same way
 * every time.
 */
export function torn(a: Pt, b: Pt, seed: string, into: 1 | -1 = 1, depth = 9, every = 13): Pt[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const n = Math.max(1, Math.round(len / every));
  const rnd = dice(seed);
  // The side the teeth go to.
  const nx = (-dy / len) * into;
  const ny = (dx / len) * into;
  // They lean along the edge as a brush's hairs do, all the same way.
  const lean = 0.55;
  const out: Pt[] = [a];
  for (let i = 0; i < n; i++) {
    const t0 = (i + rnd.range(0.08, 0.3)) / n;
    const t1 = t0 + rnd.range(0.16, 0.32) / n;
    const long = depth * rnd.range(0.35, 1);
    // One in four places has no tooth: an edge that is all teeth is a saw.
    if (rnd.next() < 0.25) continue;
    const bx = a[0] + dx * t0;
    const by = a[1] + dy * t0;
    const cx = a[0] + dx * t1;
    const cy = a[1] + dy * t1;
    const mx = (bx + cx) / 2;
    const my = (by + cy) / 2;
    out.push([bx, by], [mx + nx * long - (dx / len) * long * lean, my + ny * long - (dy / len) * long * lean], [cx, cy]);
  }
  out.push(b);
  return out;
}

/** A stroke of a brush as a shape: wide where it is set down, a point where it lifts. */
export function wedge(a: Pt, b: Pt, width: number): Path {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * width * 0.5;
  const ny = (dx / len) * width * 0.5;
  return poly([[a[0] + nx, a[1] + ny], b, [a[0] - nx, a[1] - ny]]);
}

/** One SVG in the making: a part of a figure, a thing, a piece of ground. */
export class Doc {
  private defs: string[] = [];
  private body: string[] = [];
  private stack: string[][] = [];
  private used = new Set<string>();
  private stamps = new Map<(d: Doc) => void, string>();
  /** How much of a piece's own back shadow is kept, where it is given as a share. An icon keeps less: it has to read on a dark plate. */
  darkScale = 1;

  constructor(public readonly prefix: string) {}

  private id(name: string): string {
    let id = `${this.prefix}-${name}`;
    let n = 2;
    while (this.used.has(id)) id = `${this.prefix}-${name}-${n++}`;
    this.used.add(id);
    return id;
  }

  private push(s: string): void {
    (this.stack.length ? this.stack[this.stack.length - 1] : this.body).push(s);
  }

  /** A piece: its outline, its lit color, its rim of firelight, its middle tone and its shadow. What nearly everything is made of. */
  ink(name: string, p: Path, tone: Tone, opts: InkOpts = {}): this {
    const id = this.id(name);
    const shape = `#${id}-shape`;
    const rule = opts.holes ? 'evenodd' : undefined;
    const line = opts.line ?? LINE;
    const heavy = opts.heavy ?? HEAVY;
    const out: string[] = [`<g id="${id}">`];
    this.defs.push(`<path ${attrs({ id: `${id}-shape`, d: p.toString() })}/>`);
    if (opts.outline ?? true) {
      // The line: the shape in ink, bigger by a stroke, moved away from the light by half of what it is heavier by.
      out.push(`<use ${attrs({
        id: `${id}-line`, href: shape, transform: `translate(${r(-TO_LIGHT[0] * heavy * 0.62)} ${r(-TO_LIGHT[1] * heavy * 0.62)})`,
        fill: INK, 'fill-rule': rule, stroke: INK, 'stroke-width': r(line + heavy), 'stroke-linejoin': 'miter', 'stroke-miterlimit': 3,
      })}/>`);
    }

    const b = p.bounds();
    let dark: Path | null = null;
    const want = opts.dark ?? 0.4;
    if (want instanceof Path) dark = want;
    else if (want !== false && want > 0) {
      // The back of the piece, behind an edge that leans with the light: further back at the top, where the light gets round it.
      const x = b.x + b.w * want * this.darkScale;
      const lean = Math.min(b.w * 0.22, b.h * 0.2) * this.darkScale;
      const top: Pt = [x - lean, b.y - 4];
      const foot: Pt = [x + lean, b.y + b.h + 4];
      dark = poly([[b.x - 12, b.y - 4], ...cut(top, foot, id, -1, Math.min(8, b.w * 0.16)), [b.x - 12, b.y + b.h + 4]]);
    }
    const lit = `<use ${attrs({ id: `${id}-lit`, href: shape, fill: tone.lit, 'fill-rule': rule })}/>`;
    const rim = opts.rim ?? 0;
    const cold = opts.cold ?? 0;
    if (!dark && !opts.inner && rim <= 0 && cold <= 0) out.push(lit);
    else {
      // The lit color goes inside the cut with the rest. Outside it, the soft edge of the cut would let a hair of
      // it show all round the dark, between the dark and the line.
      this.defs.push(`<clipPath id="${id}-clip"><use ${attrs({ href: shape, 'clip-rule': rule })}/></clipPath>`);
      out.push(`<g clip-path="url(#${id}-clip)">`);
      out.push(lit);
      if (rim > 0) {
        // Firelight over the whole piece, then the lit color again over all but the edge toward the light.
        out.push(`<use ${attrs({ id: `${id}-rim`, href: shape, fill: FIRELIGHT, 'fill-rule': rule, opacity: RIM_STRENGTH })}/>`);
        out.push(`<use ${attrs({ id: `${id}-lit-over`, href: shape, transform: `translate(${r(-TO_LIGHT[0] * rim)} ${r(-TO_LIGHT[1] * rim)})`, fill: tone.lit, 'fill-rule': rule })}/>`);
      }
      if (dark) {
        const mid = opts.mid ?? Math.max(3, Math.min(9, b.w * 0.14));
        const dd = dark.toString();
        if (mid > 0) out.push(`<path ${attrs({ id: `${id}-mid`, d: dd, transform: `translate(${r(TO_LIGHT[0] * mid * 1.25)} ${r(TO_LIGHT[1] * mid * 0.4)})`, fill: tone.mid })}/>`);
        out.push(`<path ${attrs({ id: `${id}-dark`, d: dd, fill: INK })}/>`);
      }
      if (opts.inner) {
        this.stack.push([]);
        opts.inner(this);
        out.push(...(this.stack.pop() as string[]));
      }
      if (cold > 0) {
        // The cold rim: everything but the piece moved toward the light, which inside the cut is the edge away from it.
        const far = p.translate(TO_LIGHT[0] * cold * 1.2, TO_LIGHT[1] * cold * 1.2).toString();
        const all = `M ${r(b.x - 40)} ${r(b.y - 40)} L ${r(b.x + b.w + 40)} ${r(b.y - 40)} L ${r(b.x + b.w + 40)} ${r(b.y + b.h + 40)} L ${r(b.x - 40)} ${r(b.y + b.h + 40)} Z`;
        out.push(`<path ${attrs({ id: `${id}-cold`, d: `${all} ${far}`, fill: COLD, 'fill-rule': 'evenodd' })}/>`);
      }
      out.push('</g>');
    }
    for (const [i, [a, c]] of (opts.open ?? []).entries()) {
      // A break in the outline: the lit color carried out over the line between two points of the edge.
      const w = (opts.line ?? LINE) * 0.5 + 1.4;
      const ox = TO_LIGHT[0] * w;
      const oy = TO_LIGHT[1] * w;
      out.push(`<path ${attrs({ id: `${id}-open-${i}`, d: `M ${r(a[0])} ${r(a[1])} L ${r(a[0] + ox)} ${r(a[1] + oy)} L ${r(c[0] + ox)} ${r(c[1] + oy)} L ${r(c[0])} ${r(c[1])} Z`, fill: tone.lit })}/>`);
    }
    out.push('</g>');
    this.push(out.join('\n'));
    return this;
  }

  /**
   * A shadow designed across the figure: one black shape laid over several pieces drawn before it in this
   * picture, and cut to all of them together. `over` is the pieces' names. This is how the black under an arm,
   * under a brim or down the inside of a leg is one shape and not a stripe on each piece.
   */
  shade(name: string, p: Path, over: readonly string[], color: string = INK): this {
    const id = this.id(name);
    this.defs.push(`<clipPath id="${id}-clip">${over.map((o) => `<use href="#${this.prefix}-${o}-shape"/>`).join('')}</clipPath>`);
    this.push(`<g clip-path="url(#${id}-clip)"><path ${attrs({ id, d: p.toString(), fill: color })}/></g>`);
    return this;
  }

  /** Ink by itself: a cast shadow, the black under a brim, a slit, a crack. */
  black(name: string, p: Path): this {
    this.push(`<path ${attrs({ id: this.id(name), d: p.toString(), fill: INK })}/>`);
    return this;
  }

  /** A flat shape of a color with no line: a patch, a glow's heart, a stain. */
  flat(name: string, p: Path, fill: string, opacity?: number): this {
    this.push(`<path ${attrs({ id: this.id(name), d: p.toString(), fill, opacity })}/>`);
    return this;
  }

  /** A line of the pen, one width all along: a strap's edge, a string, a seam. Use `strokes` for anything a brush would do. */
  pen(name: string, p: Path, width = LINE, color: string = INK): this {
    this.push(`<path ${attrs({ id: this.id(name), d: p.toString(), fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linecap': 'butt', 'stroke-linejoin': 'miter' })}/>`);
    return this;
  }

  /** Strokes of a brush, each from where it is set down to where it lifts, all in one shape: hatching, creases, hair. */
  strokes(name: string, marks: ReadonlyArray<readonly [Pt, Pt]>, width = 3, color: string = INK): this {
    const p = new Path();
    for (const [a, b] of marks) p.add(wedge(a, b, width));
    this.push(`<path ${attrs({ id: this.id(name), d: p.toString(), fill: color })}/>`);
    return this;
  }

  /**
   * Detail in a piece's own middle tone: seams, folds, stitches, grain, pits. Quiet on purpose. Draw it inside a
   * piece (`inner`), where it is cut to the piece and lies under its shadow.
   */
  detail(name: string, marks: ReadonlyArray<readonly [Pt, Pt]>, tone: Tone, width = 2): this {
    return this.strokes(name, marks, width, tone.mid);
  }

  /** The one pale mark a piece may have: a worn edge, a scratch through the ink. */
  scratch(name: string, marks: ReadonlyArray<readonly [Pt, Pt]>, width = 2): this {
    return this.strokes(name, marks, width, SCRATCH);
  }

  /** The blot a figure stands on. */
  blot(name: string, p: Path): this {
    return this.flat(name, p, INK, GROUND_SHADOW);
  }

  /** Draws something somewhere else, at a size, mirrored if asked. A thing is written once and used each time after. */
  at(x: number, y: number, scale: number, flip: boolean, draw: (d: Doc) => void): this {
    let id = this.stamps.get(draw);
    if (!id) {
      id = this.id(`thing-${this.stamps.size + 1}`);
      this.stamps.set(draw, id);
      this.stack.push([]);
      draw(this);
      const inner = this.stack.pop() as string[];
      this.defs.push(`<g id="${id}">\n${inner.join('\n')}\n</g>`);
    }
    this.push(`<use href="#${id}" transform="translate(${r(x)} ${r(y)}) scale(${r(flip ? -scale : scale)} ${r(scale)})"/>`);
    return this;
  }

  /** Svg drawn elsewhere (a whole figure), put in as it is, moved by `transform` and cut to `clip` if given. */
  embed(name: string, content: string, transform: string, clip?: Path): this {
    const id = this.id(name);
    if (clip) this.defs.push(`<clipPath id="${id}-clip"><path d="${clip.toString()}"/></clipPath>`);
    this.push(`<g id="${id}"${clip ? ` clip-path="url(#${id}-clip)"` : ''}><g transform="${transform}">\n${content}\n</g></g>`);
    return this;
  }

  /** What is inside the svg element, for stacking parts into one picture. */
  inner(): string {
    const defs = this.defs.length ? `<defs>\n${this.defs.join('\n')}\n</defs>\n` : '';
    return defs + this.body.join('\n');
  }

  isEmpty(): boolean {
    return this.body.length === 0;
  }

  /** The file. `margin` is page left all round the canvas, for what reaches past it. */
  svg(width: number, height: number, margin = 0): string {
    return page(this.prefix, this.inner(), width, height, margin);
  }
}

/** An svg file of content drawn on a canvas, with page all round it if asked. */
export function page(id: string, inner: string, width: number, height: number, margin = 0): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" id="${id}" width="${width + margin * 2}" height="${height + margin * 2}" ` +
    `viewBox="${-margin} ${-margin} ${width + margin * 2} ${height + margin * 2}">\n${inner}\n</svg>\n`
  );
}
