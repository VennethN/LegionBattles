import { CLOTH, LEATHER } from '../kit/palette';
import { FEET, NECK, arm, belt, buckler, kettleHelm, patch, seam, spear, torsoPath } from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// Read it by: the wide brim of the kettle hat, the long spear held level.
export const militia: UnitArt = {
  id: 'militia',
  style: 'thrust',
  muzzle: [176, 124],
  top: 48,
  parts: [
    ground(),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('tunic', torsoPath(), CLOTH[team], {
        inner: (c) => {
          patch(c, 98, 114);
          seam(c, 112);
          belt(c, { y: 140 });
        },
      });
      arm(d, 'arm', [114, 118], [116, 136], CLOTH[team]);
    }),
    part('head', 'head', 'body', NECK, (d) => kettleHelm(d)),
    part('buckler', 'offhand', 'body', [80, 138], (d) => buckler(d, 80, 138, 17)),
    part('spear', 'weapon', 'body', [116, 138], (d) => spear(d, { hand: [116, 138], angle: 76 }, 66)),
  ],
};
