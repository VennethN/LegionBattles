// Projectiles and effects, in the same hand as the units. Each is its own
// small picture. The white ones are tinted in the game with a color from the
// palette, so one drawing serves every kind of magic.

import { Doc } from './kit/draw';
import { BONE, HIGHLIGHT, LINEN, OUTLINE, STEEL, WOOD, type Accent } from './kit/palette';
import { arrowShape } from './kit/parts';
import { circle, ellipse, path, poly, roundRect, smooth, star } from './kit/path';
import { shapeArt } from './fxShapes';

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

/**
 * Pictures of light: a soft glow and a tongue of flame. They are white,
 * colored by the game, and added to what is under them. These alone fade
 * from a bright middle to nothing, which the rule against gradients does
 * not reach: that rule is about figures and things, and light has no edge.
 * The game lays them over the drawn field (view/light) and never shows one
 * as a thing in itself.
 */
function lightArt(): FxArt[] {
  const soft = (id: string, stops: Array<[number, number]>, cx = 0.5, cy = 0.5): string =>
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.5" gradientUnits="objectBoundingBox">` +
    stops.map(([at, a]) => `<stop offset="${at}" stop-color="${WHITE}" stop-opacity="${a}"/>`).join('') +
    '</radialGradient>';
  return [
    {
      // Light with no edge: the glow round a flame, a mote in the air, a trail. Stretched, it is a streak.
      name: 'glow',
      width: 64,
      height: 64,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.raw(`<defs>${soft('light-glow', [[0, 1], [0.18, 0.72], [0.4, 0.3], [0.7, 0.08], [1, 0]])}</defs><rect x="0" y="0" width="64" height="64" fill="url(#light-glow)"/>`);
      },
    },
    {
      // A tongue of flame, widest low down and drawn out to a point above.
      name: 'flame',
      width: 48,
      height: 72,
      origin: [0.5, 0.78],
      draw: (d) => {
        const tongue = 'M24 2 C30 20 44 34 42 50 C40 64 32 70 24 70 C16 70 8 64 6 50 C4 34 18 20 24 2 Z';
        d.raw(`<defs>${soft('light-flame', [[0, 1], [0.3, 0.8], [0.62, 0.36], [1, 0]], 0.5, 0.74)}</defs><path d="${tongue}" fill="url(#light-flame)"/>`);
      },
    },
  ];
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
      // A crossbow's or an engine's bolt: short and thick.
      name: 'bolt',
      width: 56,
      height: 20,
      origin: [0.8, 0.5],
      draw: (d) => {
        d.piece('fletch', poly([[4, 4], [14, 4], [18, 10], [14, 16], [4, 16], [8, 10]]), BONE, { shade: 0 });
        d.piece('shaft', roundRect(14, 7, 28, 6, 3), WOOD, { shade: 0 });
        d.piece('head', poly([[38, 3], [53, 10], [38, 17]]), STEEL, { shade: 0 });
      },
    },
    {
      // A thrown spear.
      name: 'javelin',
      width: 80,
      height: 20,
      origin: [0.8, 0.5],
      draw: (d) => {
        d.piece('shaft', roundRect(4, 7.5, 58, 5, 2.5), WOOD, { shade: 0 });
        d.piece('head', poly([[58, 3], [77, 10], [58, 17], [62, 10]]), STEEL, { shade: 0 });
      },
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
        // The edge that cut, brighter than the rest, so a blade's swing has a front.
        d.line('edge', path().M(38, 11).C(70, 20, 86, 44, 84, 80), HIGHLIGHT, 3);
      },
    },
    {
      // A burst where a blow lands.
      name: 'spark',
      width: 64,
      height: 64,
      origin: [0.5, 0.5],
      draw: (d) => {
        d.piece('burst', star(32, 32, 8, 29, 13, -70), { fill: WHITE, shade: WHITE }, { shade: 0 });
        // A brighter star at its heart, so a blow's star is lit from where it struck.
        d.flat('core', star(32, 32, 8, 16, 8, -70), HIGHLIGHT);
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
  out.push(...lightArt());
  // The shapes effects are made of, so that an effect is a thing and not one more disc (fxShapes.ts).
  out.push(...shapeArt());
  for (const [name, accent] of Object.entries(accents)) {
    out.push({ name: `orb-${name}`, width: 48, height: 48, origin: [0.56, 0.5], draw: orb(accent) });
  }
  return out;
}

export const FX_COLORS = { WHITE, HIGHLIGHT, OUTLINE };
