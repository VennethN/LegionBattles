import { CLOTH, LEATHER, LINEN } from '../kit/palette';
import { FEET, NECK, arm, belt, brimHat, crossbow, lacing, quiver, skirt, torsoPath } from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// Read it by: the broad hat over a scarf, the crossbow held out level.
export const poacher: UnitArt = {
  id: 'poacher',
  style: 'shoot',
  muzzle: [168, 126],
  top: 46,
  parts: [
    ground(34),
    part('quiver', 'extra', 'body', [74, 150], (d) => quiver(d), 0.5),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('shirt', torsoPath(), LINEN, {
        inner: (c) => {
          lacing(c, 109, 108);
          skirt(c, CLOTH[team]);
          belt(c, { y: 140 });
        },
      });
      arm(d, 'arm', [114, 118], [120, 130], LINEN);
    }),
    part('head', 'head', 'body', NECK, (d, team) => brimHat(d, LEATHER, CLOTH[team])),
    part('crossbow', 'weapon', 'body', [120, 131], (d) => crossbow(d, { hand: [120, 131], angle: 86 })),
  ],
};
