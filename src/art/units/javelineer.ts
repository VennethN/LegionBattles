import { CLOTH, LEATHER, LINEN, WOOD } from '../kit/palette';
import { FEET, NECK, arm, belt, buckler, javelin, seam, skirt, spikeHelm, torsoPath } from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// Read it by: the spike on the helm, the cloth hung from it, the javelin held up to throw.
export const javelineer: UnitArt = {
  id: 'javelineer',
  style: 'throw',
  muzzle: [160, 96],
  top: 22,
  parts: [
    ground(34),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('tunic', torsoPath(), LINEN, {
        inner: (c) => {
          seam(c, 108, 100, 146);
          skirt(c, CLOTH[team]);
          belt(c, { y: 140 });
        },
      });
      arm(d, 'arm', [114, 116], [124, 114], LINEN);
    }),
    part('head', 'head', 'body', NECK, (d, team) => spikeHelm(d, CLOTH[team])),
    part('shield', 'offhand', 'body', [78, 138], (d) => buckler(d, 78, 138, 17, WOOD)),
    part('javelin', 'weapon', 'body', [126, 114], (d) => javelin(d, { hand: [126, 114], angle: 68 }, 44)),
  ],
};
