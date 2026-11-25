import { BONE, CLOTH, LEATHER } from '../kit/palette';
import { FEET, HIP_Y, LEG_BACK_X, LEG_FRONT_X, NECK, arm, belt, furCollar, greatAxe, hornedHelm, leg, patch, shadow, torsoPath } from '../kit/parts';
import type { UnitArt } from '../kit/unit';

// Melee damage. Read it by: the two great horns, the fur over the shoulders,
// the axe that is as long as the unit is tall.
export const berserker: UnitArt = {
  id: 'berserker',
  style: 'chop',
  muzzle: [161, 110],
  top: 26,
  parts: [
    { name: 'shadow', role: 'shadow', parent: 'root', pivot: FEET, draw: (d) => shadow(d) },
    { name: 'leg-back', role: 'legBack', parent: 'root', pivot: [LEG_BACK_X, HIP_Y], draw: (d) => leg(d, LEG_BACK_X, LEATHER, true) },
    { name: 'leg-front', role: 'legFront', parent: 'root', pivot: [LEG_FRONT_X, HIP_Y], draw: (d) => leg(d, LEG_FRONT_X, LEATHER) },
    {
      name: 'body',
      role: 'body',
      parent: 'root',
      pivot: FEET,
      draw: (d, team) => {
        d.piece('tunic', torsoPath(), CLOTH[team], {
          inner: (c) => {
            patch(c, 100, 116);
            belt(c, { y: 140 });
          },
        });
        arm(d, 'arm', [114, 118], [134, 138], CLOTH[team]);
        furCollar(d, BONE);
      },
    },
    { name: 'head', role: 'head', parent: 'body', pivot: NECK, draw: (d) => hornedHelm(d) },
    { name: 'axe', role: 'weapon', parent: 'body', pivot: [135, 142], draw: (d) => greatAxe(d, { hand: [135, 142], angle: 24 }) },
  ],
};
