// Small pictures for the interface. Each is drawn as the thing it is: a coin
// is a struck coin, a lock has a shackle, a crown has points. No letters, no
// faces, no emoji.

import { Doc } from './kit/draw';
import { BONE, CLOTH, GOLD, HOOD_INTERIOR, IRON, LEATHER, LINEN, STEEL, VENOM, WOOD, type Material } from './kit/palette';
import { capsule, circle, path, poly, roundRect, smooth, star } from './kit/path';

export interface IconArt {
  name: string;
  width: number;
  height: number;
  origin: [number, number];
  draw: (d: Doc) => void;
}

const flat = (m: Material): Material => ({ fill: m.shade, shade: m.shade });

const ICONS: Record<string, (d: Doc) => void> = {
  coin: (d) => {
    d.piece('coin', circle(24, 24, 19), GOLD, { shade: 4 });
    d.piece('stamp', star(24, 24, 5, 10, 4.5), flat(GOLD), { shade: 0 });
  },
  star: (d) => {
    d.piece('star', star(24, 25, 5, 20, 9), GOLD, { shade: 3 });
  },
  lock: (d) => {
    d.piece('shackle', path().M(11, 25).L(11, 16).C(11, 1, 37, 1, 37, 16).L(37, 25).L(30, 25).L(30, 16).C(30, 9, 18, 9, 18, 16).L(18, 25).Z(), STEEL, { shade: 0 });
    d.piece('body', roundRect(8, 21, 32, 23, 6), IRON, { shade: 4 });
    d.piece('keyhole', circle(24, 31, 4), GOLD, { shade: 0 });
  },
  crown: (d) => {
    d.piece('crown', poly([[7, 38], [4, 14], [15, 24], [24, 8], [33, 24], [44, 14], [41, 38]]), GOLD, { shade: 4 });
    d.piece('band', roundRect(6, 34, 36, 8, 3), flat(GOLD), { shade: 0 });
  },
  banner: (d) => {
    d.piece('pole', roundRect(9, 4, 6, 41, 3), WOOD, { shade: 0 });
    d.piece('flag', poly([[14, 7], [42, 9], [34, 18], [42, 28], [14, 30]]), CLOTH.red, { shade: 3 });
  },
  heart: (d) => {
    d.piece('heart', path().M(24, 42).C(4, 28, 3, 12, 14, 9).C(20, 8, 24, 13, 24, 16).C(24, 13, 28, 8, 34, 9).C(45, 12, 44, 28, 24, 42).Z(), CLOTH.red, { shade: 4 });
  },
  sword: (d) => {
    const t = (p: ReturnType<typeof poly>): ReturnType<typeof poly> => p.rotate(40, 24, 24);
    d.piece('blade', t(poly([[19, 6], [24, 1], [29, 6], [29, 30], [19, 30]])), STEEL, { shade: 3 });
    d.piece('guard', t(roundRect(12, 29, 24, 6, 3)), GOLD, { shade: 0 });
    d.piece('grip', t(roundRect(21, 34, 6, 10, 2)), LEATHER, { shade: 0 });
  },
  shield: (d) => {
    d.piece('shield', smooth([[7, 9, 'c'], [24, 5], [41, 9, 'c'], [41, 24], [34, 37], [24, 44, 'c'], [14, 37], [7, 24]]), STEEL, { shade: 4 });
    d.piece('boss', circle(24, 22, 6), GOLD, { shade: 0 });
  },
  boot: (d) => {
    d.piece('boot', path().M(13, 6).L(29, 6).L(29, 24).C(38, 25, 43, 30, 43, 37).L(43, 42).L(11, 42).L(11, 30).Z(), LEATHER, { shade: 4 });
    d.piece('cuff', roundRect(11, 4, 20, 8, 3), LINEN, { shade: 0 });
  },
  hourglass: (d) => {
    d.piece('glass', poly([[12, 8], [36, 8], [26, 24], [36, 40], [12, 40], [22, 24]]), BONE, { shade: 3 });
    d.piece('top', roundRect(8, 4, 32, 7, 3), WOOD, { shade: 0 });
    d.piece('bottom', roundRect(8, 37, 32, 7, 3), WOOD, { shade: 0 });
  },
  range: (d) => {
    // An arrow in flight, and the bow it left.
    d.piece('bow', path().M(8, 6).C(26, 12, 26, 36, 8, 42).L(6, 37).C(18, 32, 18, 16, 6, 11).Z(), WOOD, { shade: 0 });
    d.piece('shaft', roundRect(14, 21.5, 22, 5, 2.5), BONE, { shade: 0 });
    d.piece('head', poly([[33, 15], [45, 24], [33, 33]]), STEEL, { shade: 0 });
  },
  flag: (d) => {
    d.piece('pole', roundRect(10, 4, 6, 41, 3), WOOD, { shade: 0 });
    d.piece('flag', poly([[15, 7], [43, 13], [15, 27]]), CLOTH.blue, { shade: 3 });
  },
  cards: (d) => {
    d.piece('back', roundRect(6, 6, 24, 32, 5).rotate(-12, 18, 22), CLOTH.blue, { shade: 3 });
    d.piece('front', roundRect(17, 9, 24, 32, 5).rotate(8, 29, 25), BONE, { shade: 3 });
    d.piece('mark', star(29, 25, 4, 8, 3.5).rotate(8, 29, 25), GOLD, { shade: 0 });
  },
  pack: (d) => {
    d.piece('pouch', poly([[10, 8], [14, 4], [18, 8], [22, 4], [26, 8], [30, 4], [34, 8], [38, 4], [38, 40], [34, 44], [30, 40], [26, 44], [22, 40], [18, 44], [14, 40], [10, 44]]), CLOTH.blue, { shade: 4 });
    d.piece('seal', circle(24, 24, 8), GOLD, { shade: 2 });
  },
  check: (d) => {
    d.piece('check', poly([[6, 25], [12, 19], [20, 27], [36, 9], [42, 15], [20, 39]]), VENOM, { shade: 0 });
  },
  arrow: (d) => {
    d.piece('arrow', poly([[14, 8], [34, 24], [14, 40], [20, 24]]), BONE, { shade: 0 });
  },
  spark: (d) => {
    d.piece('spark', star(24, 24, 4, 21, 7), GOLD, { shade: 0 });
  },
  team: (d) => {
    // Three helms side by side: a team.
    d.piece('helm-a', smooth([[4, 34, 'c'], [5, 22], [13, 16], [21, 22], [22, 34, 'c']]), STEEL, { shade: 0 });
    d.piece('helm-c', smooth([[26, 34, 'c'], [27, 22], [35, 16], [43, 22], [44, 34, 'c']]), STEEL, { shade: 0 });
    d.piece('helm-b', smooth([[12, 40, 'c'], [13, 22], [24, 12], [35, 22], [36, 40, 'c']]), STEEL, { shade: 3 });
    d.piece('slit', capsule(20, 28, 34, 28, 5), { fill: HOOD_INTERIOR, shade: HOOD_INTERIOR }, { shade: 0 });
  },
};

export function iconArt(): IconArt[] {
  return Object.entries(ICONS).map(([name, draw]) => ({ name, width: 48, height: 48, origin: [0.5, 0.5], draw }));
}
