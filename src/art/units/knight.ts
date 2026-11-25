import { CLOTH, STEEL } from '../kit/palette';
import { FEET, HIP_Y, LEG_BACK_X, LEG_FRONT_X, NECK, arm, belt, leg, pauldron, plume, roundHelm, roundShield, shadow, stripe, sword, torsoPath } from '../kit/parts';
import type { UnitArt } from '../kit/unit';

// The tank. Read it by: the round closed helm with a plume, the big round
// shield, the short sword held forward.
export const knight: UnitArt = {
  id: 'knight',
  style: 'slash',
  muzzle: [150, 118],
  top: 28,
  parts: [
    { name: 'shadow', role: 'shadow', parent: 'root', pivot: FEET, draw: (d) => shadow(d) },
    { name: 'leg-back', role: 'legBack', parent: 'root', pivot: [LEG_BACK_X, HIP_Y], draw: (d) => leg(d, LEG_BACK_X, STEEL, true) },
    { name: 'leg-front', role: 'legFront', parent: 'root', pivot: [LEG_FRONT_X, HIP_Y], draw: (d) => leg(d, LEG_FRONT_X, STEEL) },
    {
      name: 'body',
      role: 'body',
      parent: 'root',
      pivot: FEET,
      draw: (d, team) => {
        d.piece('tabard', torsoPath(), CLOTH[team], {
          inner: (c) => {
            stripe(c);
            belt(c);
          },
        });
        arm(d, 'arm', [117, 116], [137, 133], STEEL);
        pauldron(d, 117, 113);
      },
    },
    { name: 'plume', role: 'extra', parent: 'head', pivot: [99, 54], sway: 1, draw: (d, team) => plume(d, CLOTH[team]) },
    { name: 'head', role: 'head', parent: 'body', pivot: NECK, draw: (d) => roundHelm(d) },
    { name: 'shield', role: 'offhand', parent: 'body', pivot: [76, 141], draw: (d) => roundShield(d, 76, 141) },
    { name: 'sword', role: 'weapon', parent: 'body', pivot: [138, 134], draw: (d) => sword(d, { hand: [138, 134], angle: 32 }, 60, STEEL) },
  ],
};
