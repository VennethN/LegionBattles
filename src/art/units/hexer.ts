import { CLOTH, DARK_CLOTH, LEATHER, VENOM, BONE } from '../kit/palette';
import { FEET, NECK, antlerMask, arm, hem, robePath, totemStaff } from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// Read it by: the antlers over a wooden mask, the carved post with a green charm.
export const hexer: UnitArt = {
  id: 'hexer',
  style: 'cast',
  muzzle: [148, 50],
  top: 22,
  parts: [
    ground(38),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('robe', robePath(), CLOTH[team], { inner: (c) => hem(c, BONE) });
      arm(d, 'sleeve', [116, 117], [137, 136], CLOTH[team], 17);
    }),
    part('head', 'head', 'body', NECK, (d) => antlerMask(d, DARK_CLOTH, VENOM)),
    part('totem', 'weapon', 'body', [139, 138], (d) => totemStaff(d, { hand: [139, 138], angle: 7 }, VENOM)),
  ],
};
