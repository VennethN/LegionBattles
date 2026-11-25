import { ARCANE, CLOTH, GOLD, LEATHER } from '../kit/palette';
import {
  FEET, HIP_Y, LEG_BACK_X, LEG_FRONT_X, NECK,
  arm, hem, leg, orbStaff, pointedHood, robePath, shadow,
} from '../kit/parts';
import type { UnitArt } from '../kit/unit';

// Area damage. Read it by: the tall hood bent at its point, the long robe,
// the staff with a glowing orb that stands taller than the hood.
export const mage: UnitArt = {
  id: 'mage',
  style: 'cast',
  muzzle: [147, 52],
  top: 14,
  parts: [
    { name: 'shadow', role: 'shadow', parent: 'root', pivot: FEET, draw: (d) => shadow(d, 38) },
    { name: 'leg-back', role: 'legBack', parent: 'root', pivot: [LEG_BACK_X, HIP_Y], draw: (d) => leg(d, LEG_BACK_X, LEATHER, true) },
    { name: 'leg-front', role: 'legFront', parent: 'root', pivot: [LEG_FRONT_X, HIP_Y], draw: (d) => leg(d, LEG_FRONT_X, LEATHER) },
    {
      name: 'body',
      role: 'body',
      parent: 'root',
      pivot: FEET,
      draw: (d, team) => {
        d.piece('robe', robePath(), CLOTH[team], { inner: (c) => hem(c, GOLD) });
        arm(d, 'sleeve', [116, 117], [137, 136], CLOTH[team], 17);
      },
    },
    { name: 'head', role: 'head', parent: 'body', pivot: NECK, draw: (d, team) => pointedHood(d, CLOTH[team]) },
    { name: 'staff', role: 'weapon', parent: 'body', pivot: [139, 138], draw: (d) => orbStaff(d, { hand: [139, 138], angle: 7 }, ARCANE) },
  ],
};
