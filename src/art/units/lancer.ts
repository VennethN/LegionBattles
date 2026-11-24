import { CLOTH, LEATHER, LINEN } from '../kit/palette';
import { FEET, NECK, arm, belt, cape, spear, torsoPath, turban } from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// Read it by: the great turban, the long lance with a pennant, the sash behind.
export const lancer: UnitArt = {
  id: 'lancer',
  style: 'thrust',
  muzzle: [184, 118],
  top: 38,
  parts: [
    ground(),
    part('sash', 'extra', 'body', [94, 106], (d, team) => cape(d, CLOTH[team]), 0.7),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d) => {
      d.piece('tunic', torsoPath(), LINEN, { inner: (c) => belt(c, { y: 140 }) });
      arm(d, 'arm', [114, 118], [116, 134], LINEN);
    }),
    part('head', 'head', 'body', NECK, (d, team) => turban(d, CLOTH[team])),
    part('lance', 'weapon', 'body', [116, 136], (d, team) => spear(d, { hand: [116, 136], angle: 74 }, 74, LEATHER, CLOTH[team])),
  ],
};
