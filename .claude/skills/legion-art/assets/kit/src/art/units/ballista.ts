import { CLOTH } from '../kit/palette';
import { FEET, ballistaBow, ballistaCart, shadow, wheel } from '../kit/parts';
import { poly, roundRect } from '../kit/path';
import { WOOD } from '../kit/palette';
import type { UnitArt } from '../kit/unit';
import { part } from './common';

// An engine, not a soldier. Read it by: two wheels, a great bow on a beam, a pennant.
export const ballista: UnitArt = {
  id: 'ballista',
  style: 'shoot',
  muzzle: [166, 96],
  top: 58,
  parts: [
    part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 48, 9)),
    part('pennant', 'extra', 'body', [62, 138], (d, team) => {
      d.piece('pole', roundRect(59, 78, 6, 62, 3), WOOD, { shade: 0 });
      d.piece('flag', poly([[64, 80], [36, 86], [46, 94], [36, 104], [64, 106]]), CLOTH[team], { shade: 3 });
    }, 0.5),
    part('wheel-back', 'legBack', 'root', [76, 163], (d) => wheel(d, 76, 163, 17, true)),
    part('body', 'body', 'root', FEET, (d, team) => ballistaCart(d, CLOTH[team])),
    part('wheel-front', 'legFront', 'root', [118, 163], (d) => wheel(d, 118, 163, 17)),
    part('bow', 'weapon', 'body', [96, 116], (d) => ballistaBow(d, { hand: [96, 116], angle: 74 })),
  ],
};
