import { CLOTH, GOLD, HOLY, LEATHER, LINEN } from '../kit/palette';
import {
  FEET, HIP_Y, LEG_BACK_X, LEG_FRONT_X, NECK,
  arm, book, censer, cowl, hem, leg, mantle, robePath, shadow,
} from '../kit/parts';
import type { UnitArt } from '../kit/unit';

// The healer. Read it by: the round cowl with a veil, the wide mantle, the
// censer swinging on its chain, the book under the other arm.
export const cleric: UnitArt = {
  id: 'cleric',
  style: 'swing',
  muzzle: [138, 160],
  top: 44,
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
        d.piece('robe', robePath(), LINEN, { inner: (c) => hem(c, GOLD) });
        arm(d, 'sleeve', [118, 120], [135, 121], LINEN, 17);
        mantle(d, CLOTH[team]);
      },
    },
    { name: 'head', role: 'head', parent: 'body', pivot: NECK, draw: (d, team) => cowl(d, CLOTH[team]) },
    { name: 'book', role: 'offhand', parent: 'body', pivot: [72, 146], draw: (d, team) => book(d, 72, 146, CLOTH[team]) },
    { name: 'censer', role: 'weapon', parent: 'body', pivot: [138, 121], draw: (d) => censer(d, { hand: [138, 121], angle: 0 }, HOLY, 28) },
  ],
};
