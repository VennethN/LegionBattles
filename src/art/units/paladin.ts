import { CLOTH, GOLD, STEEL } from '../kit/palette';
import { FEET, NECK, arm, belt, cape, kiteShield, pauldron, torsoPath, warhammer, wingedHelm } from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// Read it by: the wings on the helm, the kite shield, the cape, the hammer.
export const paladin: UnitArt = {
  id: 'paladin',
  style: 'slash',
  muzzle: [146, 104],
  top: 22,
  parts: [
    ground(38),
    part('cape', 'extra', 'body', [94, 106], (d, team) => cape(d, CLOTH[team]), 0.6),
    ...legs(STEEL),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('tabard', torsoPath(), CLOTH[team], { inner: (c) => belt(c, { y: 138, mat: GOLD, buckle: null }) });
      arm(d, 'arm', [117, 116], [128, 132], STEEL);
      pauldron(d, 117, 113, GOLD);
    }),
    part('head', 'head', 'body', NECK, (d) => wingedHelm(d)),
    part('shield', 'offhand', 'body', [72, 140], (d) => kiteShield(d, 72, 140)),
    part('hammer', 'weapon', 'body', [129, 133], (d) => warhammer(d, { hand: [129, 133], angle: 24 }, 56, STEEL)),
  ],
};
