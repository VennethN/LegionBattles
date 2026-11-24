// The icons this game adds to the kit's (icons.ts), drawn the same way: each
// as the thing it is, on a 48 by 48 canvas, in the palette, with no letters
// and nothing that could be a face.

import { Doc } from './kit/draw';
import { BONE, BUSH, CLOTH, GOLD, HOOD_INTERIOR, IRON, LEATHER, LINEN, STEEL, WOOD, type Material } from './kit/palette';
import { capsule, circle, ellipse, path, poly, roundRect, smooth, star } from './kit/path';
import type { IconArt } from './icons';

const flat = (m: Material): Material => ({ fill: m.shade, shade: m.shade });

const ICONS: Record<string, (d: Doc) => void> = {
  // A wreath of laurel, tied at the foot: what a rebirth is paid in.
  laurel: (d) => {
    // Each side is one branch, a crescent whose outer edge is leaf tips: single leaves this small would be all line and no leaf.
    for (const side of [-1, 1] as const) {
      const pts: Array<[number, number]> = [];
      const at = (deg: number, r: number): [number, number] => [24 + side * Math.cos((deg * Math.PI) / 180) * r, 25 + Math.sin((deg * Math.PI) / 180) * r];
      // Out along the leaf tips from the foot to the top, then back down the inside.
      const tips = 5;
      for (let i = 0; i <= tips * 2; i++) pts.push(at(68 - i * 15.5, i % 2 === 1 ? 22 : 16.5));
      for (let i = 0; i <= 6; i++) pts.push(at(68 - tips * 31 + i * (tips * 31) / 6, 11.5));
      d.piece(`branch-${side > 0 ? 'r' : 'l'}`, poly(pts), BUSH, { shade: 3 });
    }
    d.piece('tie', poly([[18, 36], [30, 36], [28, 40], [33, 46], [24, 43], [15, 46], [20, 40]]), CLOTH.red, { shade: 0 });
  },
  // A cup with two handles on a foot: a feat done.
  trophy: (d) => {
    d.line('handle-l', path().M(13, 12).C(4, 12, 4, 25, 15, 25));
    d.line('handle-r', path().M(35, 12).C(44, 12, 44, 25, 33, 25));
    d.piece('stem', roundRect(21, 28, 6, 9, 2), flat(GOLD), { shade: 0 });
    d.piece('foot', roundRect(13, 36, 22, 7, 3), GOLD, { shade: 3 });
    d.piece('cup', path().M(11, 6).L(37, 6).L(36, 17).C(35, 26, 29, 30, 24, 30).C(19, 30, 13, 26, 12, 17).Z(), GOLD, { shade: 4 });
    d.piece('mark', star(24, 16, 5, 6, 2.8), flat(GOLD), { shade: 0 });
  },
  // A gauntlet, closed: the player's own blow.
  gauntlet: (d) => {
    d.piece('cuff', poly([[14, 28], [32, 28], [35, 44], [11, 44]]), STEEL, { shade: 3 });
    d.piece('fist', smooth([[10, 10, 'c'], [34, 8], [39, 14], [39, 24], [34, 30, 'c'], [12, 30, 'c'], [8, 22]]), STEEL, {
      shade: 4,
      inner: (c) => {
        for (const x of [17, 24, 31]) c.shadeOver('finger', roundRect(x - 1, 8, 2.4, 13, 1), 0.9);
      },
    });
    d.piece('thumb', smooth([[8, 20, 'c'], [18, 19], [21, 24], [17, 30, 'c'], [9, 29]]), STEEL, { shade: 2 });
    d.piece('band', roundRect(12, 27, 22, 5, 2), GOLD, { shade: 0 });
  },
  // A closed helm with a plume: the heroes.
  helm: (d) => {
    d.piece('plume', smooth([[22, 12, 'c'], [20, 2], [32, 1], [42, 8], [34, 9], [30, 14, 'c']]), CLOTH.blue, { shade: 3 });
    d.piece('helm', smooth([[8, 40, 'c'], [8, 20], [16, 9], [30, 9], [39, 20], [40, 40, 'c']]), STEEL, {
      shade: 4,
      inner: (c) => {
        c.flat('slit', roundRect(20, 22, 22, 6, 3), HOOD_INTERIOR);
        c.shadeOver('ridge', roundRect(27, 8, 3, 34, 1), 0.7);
      },
    });
    d.piece('rim', roundRect(6, 38, 36, 6, 3), GOLD, { shade: 0 });
  },
  // A tent with its flap open: the camp.
  tent: (d) => {
    d.line('pole', path().M(24, 9).L(24, 2));
    d.piece('pennant', poly([[24, 2], [35, 5], [24, 9]]), CLOTH.blue, { shade: 0 });
    d.piece('tent', poly([[3, 43], [24, 8], [45, 43]]), LINEN, {
      shade: 4,
      inner: (c) => {
        c.flat('door', poly([[17, 43], [24, 24], [31, 43]]), HOOD_INTERIOR);
        c.shadeOver('seam', poly([[24, 8], [26, 8], [36, 43], [32, 43]]), 0.8);
      },
    });
    d.piece('band', poly([[3, 43], [6, 38], [42, 38], [45, 43]]), CLOTH.blue, { shade: 0 });
  },
  // A horn, banded with gold: the rally.
  horn: (d) => {
    d.piece('horn', path().M(5, 36).C(6, 22, 20, 14, 40, 8).L(45, 20).C(30, 24, 18, 30, 11, 41).Z(), BONE, {
      shade: 4,
      inner: (c) => {
        c.shadeOver('ridge-a', capsule(20, 18, 24, 30, 2.4), 0.8);
        c.shadeOver('ridge-b', capsule(29, 14, 33, 26, 2.4), 0.8);
      },
    });
    d.piece('mouth', ellipse(42.5, 14, 4, 7.5).rotate(-16, 42.5, 14), GOLD, { shade: 0 });
    d.piece('tip', circle(8, 38.5, 4), GOLD, { shade: 0 });
  },
  // Three arrows coming down together: the volley.
  arrows: (d) => {
    for (const [x, turn] of [[11, -10], [24, 0], [37, 10]] as const) {
      const t = (p: ReturnType<typeof poly>): ReturnType<typeof poly> => p.rotate(turn, x, 24);
      d.piece(`shaft-${x}`, t(roundRect(x - 1.7, 6, 3.4, 30, 1.5)), WOOD, { shade: 0 });
      d.piece(`fletch-${x}`, t(poly([[x - 5, 3], [x, 7], [x + 5, 3], [x + 5, 11], [x, 15], [x - 5, 11]])), BONE, { shade: 0 });
      d.piece(`head-${x}`, t(poly([[x - 6, 34], [x + 6, 34], [x, 46]])), STEEL, { shade: 0 });
    }
  },
  // A sack tied at the neck, with a coin on it: plunder.
  sack: (d) => {
    d.piece('neck', poly([[17, 12], [20, 4], [28, 4], [31, 12]]), LINEN, { shade: 0 });
    d.piece('sack', smooth([[17, 12, 'c'], [31, 12, 'c'], [42, 26], [41, 39], [32, 45], [16, 45], [7, 39], [6, 26]]), LINEN, { shade: 5 });
    d.piece('cord', roundRect(15, 10, 18, 5, 2.5), LEATHER, { shade: 0 });
    d.piece('coin', circle(24, 30, 8.5), GOLD, { shade: 3 });
    d.piece('stamp', star(24, 30, 5, 4.6, 2.1), flat(GOLD), { shade: 0 });
  },
  // A toothed wheel: the settings.
  cog: (d) => {
    const teeth = path();
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a0 = ((i - 0.22) / n) * Math.PI * 2;
      const a1 = ((i + 0.22) / n) * Math.PI * 2;
      const a2 = ((i + 0.5 - 0.2) / n) * Math.PI * 2;
      const a3 = ((i + 0.5 + 0.2) / n) * Math.PI * 2;
      const at = (a: number, r: number): [number, number] => [24 + Math.cos(a) * r, 24 + Math.sin(a) * r];
      const pts = [at(a0, 21), at(a1, 21), at(a2, 15), at(a3, 15)];
      for (let k = 0; k < pts.length; k++) {
        if (i === 0 && k === 0) teeth.M(pts[k][0], pts[k][1]);
        else teeth.L(pts[k][0], pts[k][1]);
      }
    }
    teeth.Z();
    d.piece('wheel', teeth, STEEL, { shade: 3 });
    d.piece('hub', circle(24, 24, 6.5), IRON, { shade: 0 });
  },
  // Two chevrons: go on.
  chevrons: (d) => {
    for (const x of [6, 22]) d.piece(`chevron-${x}`, poly([[x, 8], [x + 9, 8], [x + 20, 24], [x + 9, 40], [x, 40], [x + 11, 24]]), GOLD, { shade: 3 });
  },
  // A cross: shut this.
  cross: (d) => {
    d.piece('cross', poly([
      [12, 6], [24, 18], [36, 6], [42, 12], [30, 24], [42, 36], [36, 42], [24, 30], [12, 42], [6, 36], [18, 24], [6, 12],
    ]), BONE, { shade: 3 });
  },
  // A crescent and a star: while the game was shut.
  moon: (d) => {
    d.piece('moon', path().M(30, 5).C(14, 4, 5, 14, 6, 26).C(7, 38, 18, 45, 30, 43).C(20, 38, 16, 30, 17, 23).C(18, 15, 23, 9, 30, 5).Z(), BONE, { shade: 3 });
    d.piece('star', star(36, 20, 4, 8, 3.2), GOLD, { shade: 0 });
  },
  // Two bars: stay.
  hold: (d) => {
    for (const x of [10, 28]) d.piece(`bar-${x}`, roundRect(x, 8, 10, 32, 4), BONE, { shade: 3 });
  },
  // A watchtower's top, for what it shoots.
  tower: (d) => {
    d.piece('legs', poly([[14, 44], [18, 26], [30, 26], [34, 44], [28, 44], [26, 32], [22, 32], [20, 44]]), WOOD, { shade: 0 });
    d.piece('wall', roundRect(10, 16, 28, 13, 2), WOOD, { shade: 3, inner: (c) => c.flat('slit', roundRect(20, 20, 8, 5, 2), HOOD_INTERIOR) });
    d.piece('roof', poly([[6, 17], [24, 3], [42, 17]]), CLOTH.blue, { shade: 3 });
  },
};

export function idleIcons(): IconArt[] {
  return Object.entries(ICONS).map(([name, draw]) => ({ name, width: 48, height: 48, origin: [0.5, 0.5], draw }));
}
