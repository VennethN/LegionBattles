import { CLOTH, FIRE, GOLD, LEATHER } from '../kit/palette';
import { FEET, NECK, arm, brazierStaff, flameHood, hem, robePath } from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// Read it by: the hood cut into flames, the staff with a bowl of fire on it.
export const pyromancer: UnitArt = {
  id: 'pyromancer',
  style: 'cast',
  muzzle: [140, 48],
  top: 18,
  parts: [
    ground(38),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('robe', robePath(), CLOTH[team], { inner: (c) => hem(c, GOLD) });
      arm(d, 'sleeve', [116, 117], [129, 136], CLOTH[team], 17);
    }),
    part('head', 'head', 'body', NECK, (d, team) => flameHood(d, CLOTH[team], FIRE)),
    part('staff', 'weapon', 'body', [131, 138], (d) => brazierStaff(d, { hand: [131, 138], angle: 7 }, FIRE)),
  ],
};
