// Small pictures for the interface: a coin, a star, and the like. Drawn as
// the things they are, in the same hand as everything else.

import { Doc } from './kit/draw';
import { GOLD } from './kit/palette';
import { circle, star } from './kit/path';

export interface IconArt {
  name: string;
  width: number;
  height: number;
  origin: [number, number];
  draw: (d: Doc) => void;
}

export function iconArt(): IconArt[] {
  return [
    {
      name: 'coin',
      width: 48,
      height: 48,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.piece('coin', circle(24, 24, 19), GOLD, { shade: 4 });
        d.piece('stamp', star(24, 24, 5, 10, 4.5), { fill: GOLD.shade, shade: GOLD.shade }, { shade: 0 });
      },
    },
  ];
}
