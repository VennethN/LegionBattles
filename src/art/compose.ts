// Stacks a unit's parts into one picture, in a pose. Used for the contact
// sheet and for the whole-unit pictures the menus show.

import { drawPart, type UnitArt } from './kit/unit';
import type { Team } from './kit/palette';
import { FEET_X, FEET_Y, makeXforms, restPose, solve, type Pose } from './rig';

/** What is inside an svg file's root element. */
export function innerOf(svg: string): string {
  const open = svg.indexOf('>', svg.indexOf('<svg'));
  const close = svg.lastIndexOf('</svg>');
  return open < 0 || close < 0 ? svg : svg.slice(open + 1, close).trim();
}

/** Makes every id in a fragment its own, so that many units can share a document. */
export function withIdSuffix(fragment: string, suffix: string): string {
  return fragment
    .replace(/id="([^"]+)"/g, `id="$1${suffix}"`)
    .replace(/url\(#([^)]+)\)/g, `url(#$1${suffix})`);
}

export type PartSource = (unit: UnitArt, partName: string, team: Team) => string;

/** A part's content as the kit draws it. scripts/art.ts passes a source that prefers overrides. */
export const generated: PartSource = (unit, partName, team) => {
  const part = unit.parts.find((p) => p.name === partName);
  if (!part) throw new Error(`${unit.id} has no part ${partName}`);
  return drawPart(unit, part, team).inner();
};

export interface ComposeOpts {
  pose?: Pose;
  source?: PartSource;
  /** Leave the ground shadow out (for silhouettes). */
  noShadow?: boolean;
  idSuffix?: string;
}

/** The unit as svg content on its 192 canvas. */
export function composeUnit(unit: UnitArt, team: Team, opts: ComposeOpts = {}): string {
  const out = makeXforms(unit.parts.length);
  solve(unit.parts, opts.pose ?? restPose(), out);
  const source = opts.source ?? generated;
  const groups: string[] = [];
  unit.parts.forEach((part, i) => {
    if (opts.noShadow && part.role === 'shadow') return;
    const o = out[i];
    const r = (n: number): number => Math.round(n * 100) / 100;
    const transform =
      `translate(${r(FEET_X + o.x)} ${r(FEET_Y + o.y)}) rotate(${r(o.rot)}) ` +
      `scale(${r(o.sx)} ${r(o.sy)}) translate(${-part.pivot[0]} ${-part.pivot[1]})`;
    let content = source(unit, part.name, team);
    if (opts.idSuffix) content = withIdSuffix(content, opts.idSuffix);
    groups.push(`<g id="${unit.id}-${part.name}-layer${opts.idSuffix ?? ''}" transform="${transform}">\n${content}\n</g>`);
  });
  return groups.join('\n');
}
