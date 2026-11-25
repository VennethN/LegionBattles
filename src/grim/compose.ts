// Stacks a figure's parts into one picture, in a pose. Used for the sheets
// and for the whole-figure pictures a menu shows.

import { drawPart, type UnitArt } from './kit/unit';
import { makeXforms, restPose, solve, type Pose } from './rig';

/** What is inside an svg file's root element. */
export function innerOf(svg: string): string {
  const open = svg.indexOf('>', svg.indexOf('<svg'));
  const close = svg.lastIndexOf('</svg>');
  return open < 0 || close < 0 ? svg : svg.slice(open + 1, close).trim();
}

/** Makes every id in a fragment its own, so that many figures can share a document. */
export function withIdSuffix(fragment: string, suffix: string): string {
  return fragment
    .replace(/id="([^"]+)"/g, `id="$1${suffix}"`)
    .replace(/href="#([^"]+)"/g, `href="#$1${suffix}"`)
    .replace(/url\(#([^)]+)\)/g, `url(#$1${suffix})`);
}

export interface ComposeOpts {
  pose?: Pose;
  /** Leave the blot on the ground out (for silhouettes). */
  noShadow?: boolean;
  idSuffix?: string;
  /** The still the figure stands in, so that a part shown only in it is drawn. */
  still?: string;
}

/** The figure as svg content on its own canvas. */
export function composeUnit(unit: UnitArt, opts: ComposeOpts = {}): string {
  const out = makeXforms(unit.parts.length);
  solve(unit.parts, unit.feet, opts.pose ?? restPose(), out);
  const groups: string[] = [];
  unit.parts.forEach((part, i) => {
    if (opts.noShadow && part.role === 'shadow') return;
    if (part.only && part.only !== opts.still) return;
    if (part.hide && part.hide === opts.still) return;
    const o = out[i];
    const r = (n: number): number => Math.round(n * 100) / 100;
    const transform =
      `translate(${r(unit.feet[0] + o.x)} ${r(unit.feet[1] + o.y)}) rotate(${r(o.rot)}) ` +
      `scale(${r(o.sx)} ${r(o.sy)}) translate(${-part.pivot[0]} ${-part.pivot[1]})`;
    let content = drawPart(unit, part).inner();
    if (opts.idSuffix) content = withIdSuffix(content, opts.idSuffix);
    groups.push(`<g id="${unit.id}-${part.name}-layer${opts.idSuffix ?? ''}" transform="${transform}">\n${content}\n</g>`);
  });
  return groups.join('\n');
}
