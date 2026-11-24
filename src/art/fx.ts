// Projectiles and effects, in the same hand as the units. Each is its own
// small picture. The white ones are tinted in the game with a color from the
// palette, so one drawing serves every kind of magic.

import { Doc } from './kit/draw';
import { BONE, HIGHLIGHT, LINEN, OUTLINE, type Accent } from './kit/palette';
import { arrowShape } from './kit/parts';
import { circle, ellipse, path, poly, smooth, star } from './kit/path';

export interface FxArt {
  name: string;
  width: number;
  height: number;
  /** The point the game places and turns it by, as a share of its size. */
  origin: [number, number];
  draw: (d: Doc) => void;
}

const WHITE = '#ffffff';

function orb(accent: Accent): (d: Doc) => void {
  return (d) => {
    d.flat('halo', circle(24, 24, 20), accent.light, 0.45);
    d.piece('tail', smooth([[24, 13, 'c'], [8, 17], [2, 24, 'c'], [8, 31], [24, 35, 'c']]), { fill: accent.light, shade: accent.light }, { shade: 0 });
    d.piece('core', circle(27, 24, 12), accent, { shade: 4 });
    d.glint('glint', circle(23, 20, 3));
  };
}

export function fxArt(accents: Record<string, Accent>): FxArt[] {
  const out: FxArt[] = [
    {
      name: 'arrow',
      width: 64,
      height: 24,
      origin: [0.8, 0.5],
      draw: (d) => arrowShape(d, 5, 12, 54),
    },
    {
      // A crescent that follows a blade: wide in the middle, sharp at both ends.
      name: 'slash',
      width: 96,
      height: 96,
      origin: [0.2, 0.5],
      draw: (d) => {
        const c = path()
          .M(30, 6)
          .C(74, 14, 92, 40, 84, 90)
          .C(80, 52, 62, 26, 30, 6)
          .Z();
        d.piece('arc', c, { fill: WHITE, shade: WHITE }, { shade: 0 });
      },
    },
    {
      // A burst where a blow lands.
      name: 'spark',
      width: 64,
      height: 64,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.piece('burst', star(32, 32, 7, 28, 12, -80), { fill: WHITE, shade: WHITE }, { shade: 0 });
      },
    },
    {
      // A ring that spreads where a blast goes off. No line: it is stretched as it grows.
      name: 'ring',
      width: 128,
      height: 128,
      origin: [0.5, 0.5],
      draw: (d) => {
        const ring = ellipse(64, 64, 60, 60).add(ellipse(64, 64, 46, 46).map((x, y) => [128 - x, y]));
        d.flat('ring', ring, WHITE);
      },
    },
    {
      // A soft disc: the glow a staff gathers before it lets go.
      name: 'disc',
      width: 64,
      height: 64,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.flat('outer', circle(32, 32, 30), WHITE, 0.35);
        d.flat('inner', circle(32, 32, 19), WHITE, 0.6);
      },
    },
    {
      // Dust kicked up by a fall or a landing.
      name: 'dust',
      width: 64,
      height: 48,
      origin: [0.5, 0.7],
      draw: (d) => {
        const puff = smooth([[8, 34], [10, 22], [20, 16], [28, 8], [42, 10], [48, 18], [58, 24], [58, 36], [44, 42], [20, 42]]);
        d.piece('puff', puff, LINEN, { shade: 4 });
      },
    },
    {
      // A four-pointed glint for healing and blessings.
      name: 'sparkle',
      width: 48,
      height: 48,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.piece('star', star(24, 24, 4, 21, 7), { fill: WHITE, shade: WHITE }, { shade: 0 });
      },
    },
    {
      // A chip that flies off when something breaks or dies.
      name: 'chip',
      width: 24,
      height: 24,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.piece('chip', poly([[4, 8], [14, 4], [20, 12], [12, 20]]), BONE, { shade: 0 });
      },
    },
    {
      // The white square bars and flashes are stretched from.
      name: 'pixel',
      width: 8,
      height: 8,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.flat('fill', poly([[0, 0], [8, 0], [8, 8], [0, 8]]), WHITE);
      },
    },
  ];
  for (const [name, accent] of Object.entries(accents)) {
    out.push({ name: `orb-${name}`, width: 48, height: 48, origin: [0.56, 0.5], draw: orb(accent) });
  }
  return out;
}

export const FX_COLORS = { WHITE, HIGHLIGHT, OUTLINE };
