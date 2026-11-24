import { CLOTH, FROST, LEATHER } from '../kit/palette';
import { FEET, NECK, arm, crystalWand, hem, robePath, witchHat } from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// Read it by: the broad hat with its bent point, the crystal as big as her head.
export const frostwitch: UnitArt = {
  id: 'frostwitch',
  style: 'cast',
  muzzle: [142, 72],
  top: 12,
  parts: [
    ground(38),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('robe', robePath(), CLOTH[team], { inner: (c) => hem(c, { fill: FROST.light, shade: FROST.light }) });
      arm(d, 'sleeve', [116, 117], [130, 130], CLOTH[team], 17);
    }),
    part('head', 'head', 'body', NECK, (d, team) => witchHat(d, CLOTH[team], FROST)),
    part('wand', 'weapon', 'body', [132, 132], (d) => crystalWand(d, { hand: [132, 132], angle: 14 }, FROST)),
  ],
};
