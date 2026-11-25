import { CLOTH, LEATHER } from '../kit/palette';
import { FEET, HIP_Y, LEG_BACK_X, LEG_FRONT_X, NECK, arm, belt, bow, hood, lacing, leg, nockedArrow, quiver, shadow, torsoPath } from '../kit/parts';
import { line } from '../kit/path';
import type { UnitArt } from '../kit/unit';

// Ranged. Read it by: the deep hood with its point at the back, the bow held
// out in front, the quiver over the shoulder.
export const archer: UnitArt = {
  id: 'archer',
  style: 'bow',
  muzzle: [156, 128],
  top: 44,
  parts: [
    { name: 'shadow', role: 'shadow', parent: 'root', pivot: FEET, draw: (d) => shadow(d, 34) },
    { name: 'quiver', role: 'extra', parent: 'body', pivot: [74, 150], sway: 0.5, draw: (d) => quiver(d) },
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
            lacing(c, 112, 108);
            c.line('strap', line(70, 100, 122, 150));
            belt(c, { y: 140, buckle: null });
          },
        });
        arm(d, 'arm', [116, 117], [137, 128], CLOTH[team]);
      },
    },
    { name: 'head', role: 'head', parent: 'body', pivot: NECK, draw: (d, team) => hood(d, CLOTH[team], 12) },
    { name: 'bow', role: 'weapon', parent: 'body', pivot: [140, 128], draw: (d) => bow(d, { hand: [140, 128], angle: 0 }) },
    { name: 'draw-hand', role: 'offhand', parent: 'body', pivot: [118, 128], draw: (d) => nockedArrow(d, 118, 128) },
  ],
};
