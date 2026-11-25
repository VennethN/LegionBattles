import { CLOTH, DARK_CLOTH, LEATHER } from '../kit/palette';
import { FEET, NECK, arm, belt, dagger, faceWrap, lacing, torsoPath } from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// Read it by: the wrapped head with its knot trailing, a knife in each hand.
export const cutpurse: UnitArt = {
  id: 'cutpurse',
  style: 'thrust',
  muzzle: [160, 124],
  top: 48,
  parts: [
    ground(32),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('jerkin', torsoPath().scale(0.92, 1, 96, 159), DARK_CLOTH, {
        inner: (c) => {
          lacing(c, 108, 108);
          belt(c, { y: 138, mat: CLOTH[team], buckle: null });
        },
      });
      arm(d, 'arm', [114, 118], [136, 128], DARK_CLOTH, 13);
    }),
    part('head', 'head', 'body', NECK, (d, team) => faceWrap(d, CLOTH[team])),
    part('knife-back', 'offhand', 'body', [74, 134], (d) => dagger(d, { hand: [74, 134], angle: -118 }, 32)),
    part('knife', 'weapon', 'body', [138, 128], (d) => dagger(d, { hand: [138, 128], angle: 74 }, 36)),
  ],
};
