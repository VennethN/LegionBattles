// A unit as a recipe. Nearly everyone who walks is the same build: a shadow,
// two legs, a body with an arm, a head, something in each hand, something on
// the back. What makes a unit is which head, which weapon and which cloth,
// so a unit is written here as those choices and nothing else, and the parts
// (kit/parts.ts and its fellows) do the drawing.
//
// The first forty units were written out part by part, each in a file of
// its own, and still are. The recipe came when there were a hundred and
// fifty more to draw.

import type { Doc } from '../kit/draw';
import { CLOTH, LEATHER, type Material, type Team } from '../kit/palette';
import { FEET, NECK, arm as drawArm, bulkTorsoPath, pauldron, robePath, torsoPath, type Grip } from '../kit/parts';
import type { Pt } from '../kit/path';
import type { AttackStyle, PartSpec, UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';
import { note, type UnitRole } from './notes';

/** A head: how it is drawn, and how high it stands, for the bar over the unit. */
export interface Head {
  top: number;
  draw: (d: Doc, team: Team) => void;
}

/** What the main hand holds: how it is drawn about a grip, how it is used, and where its far end is when it stands upright. */
export interface Arm {
  style: AttackStyle;
  /** Its far end from the hand, upright: where a shot leaves from and a glow gathers. */
  tip: Pt;
  draw: (d: Doc, g: Grip, team: Team) => void;
}

/** A cloth that is the side's own, or one that is nobody's. */
export type Cloth = Material | 'team';

export function clothOf(c: Cloth | undefined, team: Team): Material {
  return c === undefined || c === 'team' ? CLOTH[team] : c;
}

export interface Wear {
  /** A tunic, a broad one for the big, or a robe to the ankles. */
  shape?: 'torso' | 'bulk' | 'robe';
  /** What it is made of. The side's own cloth, unless said. */
  cloth?: Cloth;
  /** Drawn on the cloth, cut to it: a belt, a seam, mail. */
  on?: (c: Doc, team: Team) => void;
  /** Drawn over the body and under the arm: a collar of fur, a mantle. */
  over?: (d: Doc, team: Team) => void;
  /** The sleeve. The body's own cloth, unless said. */
  sleeve?: Cloth;
  width?: number;
  /** The shoulder the arm hangs from. */
  from?: Pt;
  /** A pauldron on that shoulder. */
  shoulder?: Material;
}

/** A body and its arm, which reaches to wherever the hand is. */
export type Body = (d: Doc, team: Team, hand: Pt) => void;

export function wear(w: Wear = {}): Body {
  return (d, team, hand) => {
    const cloth = clothOf(w.cloth, team);
    const shape = w.shape === 'robe' ? robePath() : w.shape === 'bulk' ? bulkTorsoPath() : torsoPath();
    const on = w.on;
    d.piece(w.shape === 'robe' ? 'robe' : 'tunic', shape, cloth, on ? { inner: (c) => on(c, team) } : {});
    w.over?.(d, team);
    const from = w.from ?? ([w.shape === 'bulk' ? 118 : 116, 117] as Pt);
    // The arm stops at the hand, which is drawn with whatever it holds.
    const sleeve = w.sleeve === undefined ? cloth : clothOf(w.sleeve, team);
    drawArm(d, 'arm', from, [hand[0] - 1, hand[1] - 2], sleeve, w.width ?? (w.shape === 'torso' || w.shape === undefined ? 15 : 17));
    if (w.shoulder) pauldron(d, from[0] + 1, from[1] - 4, w.shoulder);
  };
}

export interface Recipe {
  set: string;
  role: UnitRole;
  /** Read it by: the head, what it holds, what else. */
  read: string;
  head: Head;
  body: Body;
  arm: Arm;
  /** Where the hand is, and how far what it holds leans from upright. */
  hold: readonly [x: number, y: number, angle: number];
  /** What the other hand holds. */
  off?: PartSpec;
  /** True where the other hand is in front of the weapon: the hand that draws a bow. */
  offOver?: boolean;
  /** What is behind the legs: a cape, a quiver, a banner on the back. */
  back?: PartSpec[];
  /** What stands on the head and is behind it: a plume. */
  crest?: PartSpec[];
  /** The boots. */
  legs?: Material;
  /** How wide its shadow is. */
  shadow?: number;
  /** Where the bar over it goes, if not at the top of its head. */
  top?: number;
  style?: AttackStyle;
}

/** Where a point of something drawn upright about the hand is, once it is held. */
export function held(p: Pt, hold: readonly [number, number, number]): Pt {
  const a = (hold[2] * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [Math.round(hold[0] + p[0] * c - p[1] * s), Math.round(hold[1] + p[0] * s + p[1] * c)];
}

/** A unit from its recipe. Its line in the notes is written as it is made. */
export function figure(id: string, r: Recipe): UnitArt {
  note(id, r.set, r.role, r.read);
  const hand: Pt = [r.hold[0], r.hold[1]];
  const g: Grip = { hand, angle: r.hold[2] };
  const weapon = part('weapon', 'weapon', 'body', hand, (d, team) => r.arm.draw(d, g, team));
  const parts: PartSpec[] = [
    ground(r.shadow),
    ...(r.back ?? []),
    ...legs(r.legs ?? LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => r.body(d, team, hand)),
    ...(r.crest ?? []),
    part('head', 'head', 'body', NECK, r.head.draw),
    ...(r.off && !r.offOver ? [r.off] : []),
    weapon,
    ...(r.off && r.offOver ? [r.off] : []),
  ];
  return { id, style: r.style ?? r.arm.style, muzzle: held(r.arm.tip, r.hold), top: r.top ?? r.head.top, parts };
}

/** What the other hand holds, as a part: `draw` is given the hand's place. */
export function off(at: Pt, draw: (d: Doc, x: number, y: number, team: Team) => void, name = 'off'): PartSpec {
  return part(name, 'offhand', 'body', at, (d, team) => draw(d, at[0], at[1], team));
}

/** Something that follows the body and sways: a cape, a pack, a banner on the back. */
export function extra(name: string, pivot: Pt, draw: (d: Doc, team: Team) => void, sway = 0.6, parent: 'body' | 'head' = 'body'): PartSpec {
  return part(name, 'extra', parent, pivot, draw, sway);
}
