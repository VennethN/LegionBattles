// What bodies usually wear, by name: a tunic with a belt, plate over a tabard,
// mail with a skirt, a robe with a hem. A recipe asks for one of these and adds
// what is its own.

import type { Doc } from '../kit/draw';
import { CLOTH, GOLD, IRON, STEEL, type Material, type Team } from '../kit/palette';
import { belt, hem, mailRings, skirt, stripe } from '../kit/parts';
import { scales } from '../kit/gear';
import { wear, type Body, type Wear } from './figure';

type On = (c: Doc, team: Team) => void;

export const B = {
  /** Cloth in the side's color, and a belt. */
  tunic: (on?: On, o: Wear = {}): Body => wear({ on: (c, team) => { on?.(c, team); belt(c, { y: 140 }); }, ...o }),
  /** A tabard with a stripe, an arm and a shoulder in plate. */
  plate: (mat: Material = STEEL, on?: On, o: Wear = {}): Body => wear({ on: (c, team) => { stripe(c); on?.(c, team); belt(c); }, sleeve: mat, shoulder: mat, ...o }),
  /** Mail to the hips, and the side's color in the skirt below it. */
  mail: (mat: Material = IRON, on?: On, o: Wear = {}): Body => wear({
    cloth: mat, sleeve: mat,
    on: (c, team) => { mailRings(c, 60, 104, 132, 138); skirt(c, CLOTH[team]); on?.(c, team); belt(c); },
    ...o,
  }),
  /** Scales, and the side's color in the skirt below them. */
  scale: (mat: Material, on?: On, o: Wear = {}): Body => wear({
    cloth: mat, sleeve: mat,
    on: (c, team) => { scales(c, 104, 140); skirt(c, CLOTH[team]); on?.(c, team); belt(c); },
    ...o,
  }),
  /** A robe to the ankles with a band at its hem. */
  robe: (trim: Material = GOLD, on?: On, o: Wear = {}): Body => wear({ shape: 'robe', on: (c, team) => { on?.(c, team); hem(c, trim); }, ...o }),
  /** A broad tunic, for the big. */
  bulk: (on?: On, o: Wear = {}): Body => wear({ shape: 'bulk', on: (c, team) => { on?.(c, team); belt(c, { y: 142 }); }, ...o }),
};
