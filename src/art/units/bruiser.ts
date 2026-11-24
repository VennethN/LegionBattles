import { CLOTH, LEATHER } from '../kit/palette';
import { FEET, NECK, arm, belt, bulkTorsoPath, club, sackHood } from '../kit/parts';
import { line } from '../kit/path';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// Read it by: the sack over its head with the corners up, the club over its shoulder.
export const bruiser: UnitArt = {
  id: 'bruiser',
  style: 'chop',
  muzzle: [146, 104],
  top: 30,
  parts: [
    ground(42),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('tunic', bulkTorsoPath(), CLOTH[team], {
        inner: (c) => {
          c.line('strap', line(62, 104, 126, 152));
          belt(c, { y: 142 });
        },
      });
      arm(d, 'arm', [118, 118], [124, 140], CLOTH[team], 17);
    }),
    part('head', 'head', 'body', NECK, (d) => sackHood(d)),
    part('club', 'weapon', 'body', [124, 142], (d) => club(d, { hand: [124, 142], angle: 22 })),
  ],
};
