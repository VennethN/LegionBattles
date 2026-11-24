// How a piece is drawn: a flat fill, one darker tone on the side away from
// the light, and a dark line of one width round it. The light comes from the
// top left, so the darker tone is a rim along the right and the bottom.
//
// The files this writes are meant to be opened in Inkscape: plain attributes,
// ids that say what a thing is, no styles, filters or scripts.

import { HIGHLIGHT, OUTLINE, OUTLINE_WIDTH, type Material } from './palette';
import { Path } from './path';

export const CANVAS = 192;
/** Where a unit's feet are, and its middle. Every part is drawn against these. */
export const CX = 96;
export const FEET_Y = 180;

export interface PieceOpts {
  /** How far the lit fill is pushed toward the light. 0 for no shade. */
  shade?: number;
  /** Drawn inside the piece, cut to its shape, under its outline. */
  inner?: (d: Doc) => void;
  /** False for a piece with no dark line round it. */
  outline?: boolean;
  /** For a shape with holes in it, such as a letter: a path inside a path is a hole. */
  holes?: boolean;
}

function attrs(a: Record<string, string | number | undefined>): string {
  return Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
}

/** One SVG in the making: a part of a unit, an effect, a prop. */
export class Doc {
  private defs: string[] = [];
  private body: string[] = [];
  private stack: string[][] = [];
  private used = new Set<string>();

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

  /** A filled, shaded, outlined shape: what nearly everything is made of. */
  piece(name: string, p: Path, mat: Material, opts: PieceOpts = {}): this {
    const id = this.id(name);
    const d = p.toString();
    const shade = opts.shade ?? 5;
    const outline = opts.outline ?? true;
    const rule = opts.holes ? 'evenodd' : undefined;
    const out: string[] = [];
    out.push(`<g id="${id}">`);
    if (shade > 0 || opts.inner) {
      this.defs.push(`<clipPath id="${id}-clip"><path ${attrs({ d, 'clip-rule': rule })}/></clipPath>`);
    }
    if (shade > 0) {
      out.push(`<path ${attrs({ id: `${id}-shade`, d, fill: mat.shade, 'fill-rule': rule })}/>`);
      out.push(`<g clip-path="url(#${id}-clip)">`);
      out.push(`<path ${attrs({ id: `${id}-fill`, d: p.translate(-shade, -shade).toString(), fill: mat.fill, 'fill-rule': rule })}/>`);
    } else {
      out.push(`<path ${attrs({ id: `${id}-fill`, d, fill: mat.fill, 'fill-rule': rule })}/>`);
      if (opts.inner) out.push(`<g clip-path="url(#${id}-clip)">`);
    }
    if (opts.inner) {
      this.stack.push([]);
      opts.inner(this);
      out.push(...(this.stack.pop() as string[]));
    }
    if (shade > 0 || opts.inner) out.push('</g>');
    if (outline) out.push(`<path ${attrs({ id: `${id}-line`, d, ...LINE })}/>`);
    out.push('</g>');
    this.push(out.join('\n'));
    return this;
  }

  /** A flat shape with no line: a visor slit, the dark of a hood, a halo. */
  flat(name: string, p: Path, fill: string, opacity?: number): this {
    this.push(`<path ${attrs({ id: this.id(name), d: p.toString(), fill, opacity })}/>`);
    return this;
  }

  /** A dark line of the one width: a seam, a string, a crease. */
  line(name: string, p: Path, color: string = OUTLINE, width: number = OUTLINE_WIDTH): this {
    this.push(
      `<path ${attrs({
        id: this.id(name),
        d: p.toString(),
        fill: 'none',
        stroke: color,
        'stroke-width': width,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      })}/>`,
    );
    return this;
  }

  /** The one small highlight a piece may have. */
  glint(name: string, p: Path): this {
    return this.flat(name, p, HIGHLIGHT);
  }

  /** What is inside the svg element, for stacking parts into one picture. */
  inner(): string {
    const defs = this.defs.length ? `<defs>\n${this.defs.join('\n')}\n</defs>\n` : '';
    return defs + this.body.join('\n');
  }

  isEmpty(): boolean {
    return this.body.length === 0;
  }

  svg(width = CANVAS, height = CANVAS): string {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" id="${this.prefix}" width="${width}" height="${height}" ` +
      `viewBox="0 0 ${width} ${height}">\n${this.inner()}\n</svg>\n`
    );
  }
}

const LINE = {
  fill: 'none',
  stroke: OUTLINE,
  'stroke-width': OUTLINE_WIDTH,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const;
