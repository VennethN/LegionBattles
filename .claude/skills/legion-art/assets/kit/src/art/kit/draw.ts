// How a piece is drawn: a flat fill, a darker tone on the side away from the
// light with a deeper one at its very edge, a lit rim on the side toward it,
// and a dark line of one width round it all. The light comes from the top
// left, so the dark is along the right and the bottom and the lit rim along
// the left and the top. Polished things have a streak of light across them.
//
// The deeper tone, the lit rim and the streak are the outline color and the
// highlight color laid over at part strength, so every material takes them
// and none needs tones of its own for them. There are still no gradients
// and no filters: every tone is a flat shape.
//
// The files this writes are meant to be opened in Inkscape: plain attributes,
// ids that say what a thing is, no styles, filters or scripts. A piece's
// shape is written once and used for its shade, its fill, its line and its
// clip (Inkscape calls these clones), and a thing stood in a scene many
// times is written once and used each time. That keeps the files small: the
// whole build has to stay under 5 MB.

import { HIGHLIGHT, OUTLINE, OUTLINE_WIDTH, SHADOW_OPACITY, type Material } from './palette';
import { Path } from './path';

export const CANVAS = 192;
/**
 * A unit's files have this much page all round the canvas. A long spear held
 * level reaches past the canvas, and what is past the edge of a file is cut
 * off. The canvas and every coordinate on it stay as they are: the feet are
 * still at (96, 180).
 */
export const MARGIN = 40;
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
  /** False for no lit rim, no deeper edge and no streak: only the fill and its shade. */
  finish?: boolean;
}

/** How strong the lit rim is, the deeper edge, and a polished thing's streak. */
export const LIT = 0.36;
export const DEEP = 0.2;
export const SHEEN = 0.2;

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
  /** What has been stood in the scene already, and the id it was written under. */
  private stamps = new Map<(d: Doc) => void, string>();

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
    // The shape itself, written once. Whatever is the whole shape uses it.
    const shape = `#${id}-shape`;
    this.defs.push(`<path ${attrs({ id: `${id}-shape`, d })}/>`);
    if (shade > 0 || opts.inner) {
      this.defs.push(`<clipPath id="${id}-clip"><use ${attrs({ href: shape, 'clip-rule': rule })}/></clipPath>`);
    }
    if (shade > 0) {
      const finish = (opts.finish ?? true) && !opts.holes;
      const use = (name: string, dx: number, dy: number, fill: string, opacity?: number): string =>
        `<use ${attrs({ id: `${id}-${name}`, href: shape, transform: dx || dy ? `translate(${r(dx)} ${r(dy)})` : undefined, fill, 'fill-rule': rule, opacity })}/>`;
      out.push(use('shade', 0, 0, mat.shade));
      out.push(`<g clip-path="url(#${id}-clip)">`);
      if (finish && shade >= 5) {
        // The deeper edge: the whole shape darkened, then its shade laid back over all but the far rim.
        const deep = shade * 0.62;
        out.push(use('deep', 0, 0, OUTLINE, DEEP));
        out.push(use('shade-over', -deep, -deep, mat.shade));
      }
      out.push(use('fill', -shade, -shade, mat.fill));
      if (finish && shade >= 3) {
        // The lit rim: the fill lightened all over, then laid back over all but the rim toward the light.
        // Half the dark line lies over the edge of a piece, so a rim has to be wider than that to be seen.
        const lit = shade >= 5 ? 4.6 : shade >= 4 ? 4.2 : 3.6;
        this.defs.push(`<clipPath id="${id}-lit-clip"><use ${attrs({ href: shape, transform: `translate(${-shade} ${-shade})` })}/></clipPath>`);
        out.push(`<g clip-path="url(#${id}-lit-clip)">`);
        out.push(use('lit', -shade, -shade, HIGHLIGHT, LIT));
        out.push(use('fill-over', lit, lit, mat.fill));
        out.push('</g>');
      }
      if (finish && mat.gloss) {
        const b = p.bounds();
        if (Math.min(b.w, b.h) >= 18) {
          // A streak of light across it, leaning with the light, and a thin one beside it.
          const lean = b.h * 0.42;
          const band = (x: number, w: number): string =>
            `M${r(x)} ${r(b.y)} L${r(x + w)} ${r(b.y)} L${r(x + w - lean)} ${r(b.y + b.h)} L${r(x - lean)} ${r(b.y + b.h)} Z`;
          const wide = Math.max(4, b.w * 0.15);
          const x = b.x + b.w * 0.5 + lean * 0.5;
          out.push(`<path ${attrs({ id: `${id}-sheen`, d: `${band(x, wide)} ${band(x + wide + 3.5, 2.6)}`, fill: HIGHLIGHT, opacity: SHEEN })}/>`);
        }
      }
    } else {
      out.push(`<use ${attrs({ id: `${id}-fill`, href: shape, fill: mat.fill, 'fill-rule': rule })}/>`);
      if (opts.inner) out.push(`<g clip-path="url(#${id}-clip)">`);
    }
    if (opts.inner) {
      this.stack.push([]);
      opts.inner(this);
      out.push(...(this.stack.pop() as string[]));
    }
    if (shade > 0 || opts.inner) out.push('</g>');
    if (outline) out.push(`<use ${attrs({ id: `${id}-line`, href: shape, ...LINE })}/>`);
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

  /**
   * A shadow laid over whatever is under it: what a head casts on the
   * shoulders, a belt on the cloth below it, a fold. `strength` is from 0 to
   * 1, and 1 is as dark as the shadow on the ground.
   */
  shadeOver(name: string, p: Path, strength = 0.7): this {
    return this.flat(name, p, OUTLINE, r(SHADOW_OPACITY * strength));
  }

  /** Light laid over whatever is under it: a worn edge, a facet, the shine on a fold. */
  lightOver(name: string, p: Path, strength = 0.7): this {
    return this.flat(name, p, HIGHLIGHT, r(LIT * strength));
  }

  /**
   * Draws something somewhere else: whatever `draw` draws about (0, 0) is
   * put at (x, y), at a size, mirrored if asked. A scene is made of things
   * drawn once and stood in many places.
   */
  at(x: number, y: number, scale: number, flip: boolean, draw: (d: Doc) => void): this {
    // A thing is written the first time it is stood somewhere, and used every time after.
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

  /** A line of svg as it stands, for the few shapes the rest of this cannot say. Its colors must be the palette's. */
  raw(svg: string): this {
    this.push(svg);
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
  svg(width = CANVAS, height = CANVAS, margin = 0): string {
    return page(this.prefix, this.inner(), width, height, margin);
  }
}

/** An svg file of content drawn on a canvas, with page all round it if asked. */
export function page(id: string, inner: string, width = CANVAS, height = CANVAS, margin = 0): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" id="${id}" width="${width + margin * 2}" height="${height + margin * 2}" ` +
    `viewBox="${-margin} ${-margin} ${width + margin * 2} ${height + margin * 2}">\n${inner}\n</svg>\n`
  );
}

function r(n: number): number {
  return Math.round(n * 100) / 100;
}

const LINE = {
  fill: 'none',
  stroke: OUTLINE,
  'stroke-width': OUTLINE_WIDTH,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const;
