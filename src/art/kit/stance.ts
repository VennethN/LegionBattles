// A stance: the kit's parts, drawn leaning, bigger, in mid stride.
//
// Every part of the kit is drawn for a figure that stands straight, and the
// rank and file all do. A hero is drawn for themselves: planted, bent, mid
// run. `posed` draws anything the kit has through a turn of the hero's own,
// so that a helm made for the neck at (96, 106) sits on a neck that is
// somewhere else, and its shade and its line are still laid by the same
// rules: the light stays top left however the thing is turned, because the
// turn is done to the shapes and not to the picture.

import type { Doc, PieceOpts } from './draw';
import { FEET_Y } from './draw';
import type { Material } from './palette';
import { path, type Path, type Pt } from './path';

/** Something done to every shape of a part: a lean, a size, a step to one side. */
export type Turn = (p: Path) => Path;

/** Where a point of the standing figure is, once turned. */
export function turned(turn: Turn, at: Pt): Pt {
  const b = turn(path().M(at[0], at[1])).bounds();
  return [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10];
}

/** Draws on `d` whatever `draw` draws, with every shape of it turned. */
export function posed(d: Doc, turn: Turn, draw: (d: Doc) => void): void {
  const through = {
    piece(name: string, p: Path, mat: Material, opts: PieceOpts = {}) {
      const inner = opts.inner;
      d.piece(name, turn(p), mat, inner ? { ...opts, inner: () => inner(through as unknown as Doc) } : opts);
      return through;
    },
    flat(name: string, p: Path, fill: string, opacity?: number) {
      d.flat(name, turn(p), fill, opacity);
      return through;
    },
    line(name: string, p: Path, color?: string, width?: number) {
      d.line(name, turn(p), color, width);
      return through;
    },
    glint(name: string, p: Path) {
      d.glint(name, turn(p));
      return through;
    },
    shadeOver(name: string, p: Path, strength?: number) {
      d.shadeOver(name, turn(p), strength);
      return through;
    },
    lightOver(name: string, p: Path, strength?: number) {
      d.lightOver(name, turn(p), strength);
      return through;
    },
  };
  draw(through as unknown as Doc);
}

/** How a hero is built: how big, how far they lean, and where their head is carried. */
export interface Build {
  /** Their size beside the rank and file, about the feet. */
  size?: number;
  /** Wider or narrower than that, about the middle. */
  wide?: number;
  /** Degrees the body leans forward from the hips. */
  lean?: number;
  /** Degrees more the head is tipped, about the neck, and how far it is carried forward and down. */
  nod?: number;
  headX?: number;
  headY?: number;
}

const HIPS: Pt = [96, 156];
const NECK_AT: Pt = [96, 106];

/** The body of a build: everything that hangs from the hips. */
export function bodyOf(b: Build): Turn {
  const s = b.size ?? 1;
  const w = (b.wide ?? 1) * s;
  return (p) => p.rotate(b.lean ?? 0, HIPS[0], HIPS[1]).scale(w, s, 96, FEET_Y);
}

/** The head of a build: on the body's neck, tipped and carried as it says. */
export function headOf(b: Build): Turn {
  const s = b.size ?? 1;
  return (p) =>
    p
      .rotate(b.nod ?? 0, NECK_AT[0], NECK_AT[1])
      .translate(b.headX ?? 0, b.headY ?? 0)
      .rotate(b.lean ?? 0, HIPS[0], HIPS[1])
      .scale(s, s, 96, FEET_Y);
}

/** A leg of a build: its hip moved along, and the leg swung about it. Swung forward is negative. */
export function legOf(b: Build, hipX: number, shift: number, swing: number): Turn {
  const s = b.size ?? 1;
  return (p) => p.translate(shift, 0).rotate(swing, hipX + shift, 152).scale(s, s, 96, FEET_Y);
}
