// What lies on the field in a hunt and is not a figure: a trap set, a pool
// of tar, a keg with its fuse alight, the burst of a flare, bolts in the
// air, and the things a monster's attack leaves. Each is seen from the same
// angle as the ground it lies on.

import { Doc } from './kit/draw';
import { limb } from './kit/figure';
import { BLOOD, BONE, BRACKEN, EARTH, LAMP, LEAD, PALLOR, RUST, SOOT, WOOD, type Tone } from './kit/palette';
import { poly, type Pt } from './kit/path';
import type { Thing } from './things';

const FIRE: Tone = { lit: LAMP.lit, mid: LAMP.mid };

/** A jaw trap, set: open on the ground, its teeth up, its chain pegged. `shut` is after it has closed. */
function trapOnGround(shut: boolean): (d: Doc) => void {
  return (d) => {
    d.blot('blot', poly([[6, 44], [40, 38], [78, 44], [60, 52], [20, 52]]));
    d.pen('chain', poly([[14, 46], [6, 50], [2, 44]], false), 2.6);
    if (shut) {
      d.ink('jaws', poly([[18, 40], [24, 22], [30, 34], [36, 18], [42, 32], [48, 18], [54, 34], [60, 22], [66, 40], [62, 48], [22, 48]]), LEAD, { dark: 0.36, mid: 2, rim: 1.4, line: 2.2, heavy: 3 });
    } else {
      d.ink('jaw-far', poly([[14, 34], [18, 22], [24, 30], [30, 18], [36, 28], [42, 16], [48, 28], [54, 18], [60, 30], [66, 22], [70, 34]]), LEAD, { dark: 0.5, mid: 0, line: 2.2, heavy: 3 });
      d.ink('base', poly([[10, 34], [74, 34], [70, 46], [14, 46]]), LEAD, { dark: 0.3, mid: 2, line: 2.2, heavy: 3, inner: (c) => c.flat('rust', poly([[40, 40], [72, 38], [70, 48], [40, 48]]), RUST.mid) });
      d.ink('pan', poly([[32, 36], [52, 36], [50, 44], [34, 44]]), RUST, { dark: false, line: 1.6, heavy: 2 });
      d.ink('jaw-near', poly([[12, 46], [16, 54], [22, 48], [28, 56], [34, 48], [42, 57], [50, 48], [56, 56], [62, 48], [68, 54], [72, 46]]), LEAD, { dark: false, line: 2.2, heavy: 3, rim: 1.4 });
    }
  };
}

/** A pool of tar: black, with one hard shine on it. `alight` is after fire has touched it. */
function tar(alight: boolean): (d: Doc) => void {
  return (d) => {
    d.black('pool', poly([[10, 40], [40, 18], [96, 10], [150, 20], [186, 44], [176, 78], [128, 96], [60, 94], [20, 72]]));
    d.flat('rim', poly([[26, 44], [50, 26], [96, 20], [144, 28], [170, 46], [162, 70], [124, 84], [64, 82], [34, 66]]), SOOT.mid);
    d.black('deep', poly([[40, 46], [60, 32], [98, 28], [138, 36], [156, 48], [148, 66], [118, 76], [70, 74], [46, 62]]));
    d.flat('shine', poly([[70, 38], [104, 34], [112, 38], [78, 42]]), SOOT.lit);
    d.black('splash-a', poly([[0, 60], [10, 54], [12, 62]]));
    d.black('splash-b', poly([[186, 70], [196, 74], [188, 80]]));
    if (alight) {
      for (const [i, [x, y, k]] of ([[60, 60, 1], [100, 50, 1.4], [140, 58, 1], [84, 72, 0.8], [122, 70, 0.9]] as Array<[number, number, number]>).entries()) {
        d.ink(`flame-${i}`, poly([[x - 10 * k, y], [x - 8 * k, y - 16 * k], [x - 2 * k, y - 10 * k], [x + 2 * k, y - 30 * k], [x + 8 * k, y - 12 * k], [x + 12 * k, y - 18 * k], [x + 10 * k, y]]), FIRE, { dark: false, line: 1.6, heavy: 2, inner: (c) => c.flat(`heart-${i}`, poly([[x - 3 * k, y], [x, y - 14 * k], [x + 4 * k, y]]), LAMP.hot) });
      }
    }
  };
}

/** The sappers' charge, set down: a keg on its side, its fuse burning. */
function charge(d: Doc): void {
  d.blot('blot', poly([[6, 52], [40, 46], [74, 52], [60, 60], [16, 60]]));
  d.ink('keg', poly([[14, 22], [56, 18], [66, 34], [62, 52], [18, 56], [8, 40]]), WOOD, {
    dark: 0.3, mid: 3,
    inner: (c) => {
      c.flat('hoop-a', poly([[20, 18], [26, 18], [24, 58], [18, 58]]), LEAD.mid);
      c.flat('hoop-b', poly([[48, 16], [54, 16], [56, 56], [50, 56]]), LEAD.mid);
      c.detail('staves', [[[12, 32], [64, 28]], [[12, 44], [64, 40]]], WOOD, 1.6);
    },
  });
  d.pen('fuse', poly([[60, 30], [72, 24], [76, 14]], false), 2.6);
  d.ink('spark', poly([[76, 2], [80, 9], [88, 6], [83, 13], [90, 18], [81, 17], [78, 24], [75, 16], [68, 16], [74, 11]]), FIRE, { dark: false, line: 1.4, heavy: 1.8 });
}

/** A flare, at its height: light with a hard edge, thrown out in points. The game shows it for a moment and lights the field by it. */
function flare(d: Doc): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 === 0 ? 118 : i % 4 === 1 ? 62 : 78;
    pts.push([120 + Math.cos(a) * r, 120 + Math.sin(a) * r * 0.8]);
  }
  d.flat('outer', poly(pts), LAMP.mid, 0.9);
  d.flat('inner', poly(pts.map(([x, y]) => [120 + (x - 120) * 0.66, 120 + (y - 120) * 0.66] as Pt)), LAMP.lit);
  d.flat('heart', poly(pts.map(([x, y]) => [120 + (x - 120) * 0.3, 120 + (y - 120) * 0.3] as Pt)), LAMP.hot);
}

/** A bolt in the air, pointing right: a crossbow's, and a ballista's as long as a man. */
function bolt(len: number, w: number): (d: Doc) => void {
  return (d) => {
    d.ink('shaft', limb([4, w * 2], [len - w * 2.4, w * 2], w, w), WOOD, { dark: false, line: 1.6, heavy: 2 });
    d.ink('head', poly([[len - w * 3, w * 0.6], [len, w * 2], [len - w * 3, w * 3.4]]), LEAD, { dark: false, line: 1.6, heavy: 2, rim: 1 });
    d.ink('flight', poly([[2, w * 0.6], [w * 3.4, w * 1.4], [w * 3.4, w * 2.6], [2, w * 3.4], [w * 1.2, w * 2]]), BONE, { dark: false, line: 1.4, heavy: 1.8 });
  };
}

/** What the Antlered King's roots do to the ground: black thorns broken up through it, frost on them. */
function thorns(d: Doc): void {
  d.flat('broken', poly([[6, 78], [30, 60], [70, 56], [108, 62], [116, 80], [90, 92], [36, 94]]), EARTH.mid);
  const spike = (n: string, a: Pt, b: Pt, w: number): void => void d.ink(n, limb(a, b, w, w * 0.16), WOOD, { dark: 0.5, mid: 0, line: 2, heavy: 2.6, inner: (c) => c.flat(`${n}-frost`, limb(a, b, w * 0.3, 0.6).translate(w * 0.2, -1), BONE.lit) });
  spike('t1', [30, 76], [12, 30], 14);
  spike('t2', [52, 72], [50, 8], 16);
  spike('t3', [74, 74], [96, 22], 14);
  spike('t4', [92, 80], [116, 54], 10);
  spike('t5', [40, 82], [26, 58], 9);
  d.flat('clods', poly([[20, 80], [40, 74], [84, 76], [104, 84], [80, 90], [40, 90]]), BRACKEN.mid);
}

/** What the Gravedigger's bell brings: a hand out of the ground, reaching. */
function graveHand(d: Doc): void {
  d.flat('earth', poly([[4, 70], [24, 56], [60, 54], [80, 66], [70, 80], [20, 82]]), EARTH.mid);
  d.ink('arm', limb([44, 70], [40, 30], 14, 11), PALLOR, { dark: 0.45, mid: 2, line: 2.2, heavy: 3 });
  d.ink('palm', poly([[30, 34], [50, 30], [54, 18], [44, 12], [32, 18]]), PALLOR, { dark: 0.36, mid: 2, line: 2.2, heavy: 3 });
  d.strokes('fingers', [[[34, 16], [28, 2]], [[40, 13], [38, -2]], [[46, 13], [48, 0]], [[52, 18], [58, 8]], [[30, 28], [20, 24]]], 5, PALLOR.lit);
  d.flat('dirt', poly([[36, 60], [52, 56], [54, 72], [34, 74]]), EARTH.lit);
  d.ink('rag', poly([[36, 44], [50, 42], [54, 58], [46, 52], [40, 60]]), BONE, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
}

export const FIELD: Thing[] = [
  { id: 'jawtrap-set', set: 'field', width: 84, height: 60, origin: [42, 44], draw: trapOnGround(false) },
  { id: 'jawtrap-shut', set: 'field', width: 84, height: 60, origin: [42, 44], draw: trapOnGround(true) },
  { id: 'tar-pool', set: 'field', width: 198, height: 100, origin: [98, 54], draw: tar(false) },
  { id: 'tar-pool-alight', set: 'field', width: 198, height: 100, origin: [98, 54], draw: tar(true) },
  { id: 'charge', set: 'field', width: 94, height: 64, origin: [38, 54], draw: charge },
  { id: 'flare-burst', set: 'field', width: 240, height: 240, origin: [120, 120], draw: flare },
  { id: 'bolt', set: 'field', width: 46, height: 12, origin: [40, 6], draw: bolt(44, 3) },
  { id: 'bolt-ballista', set: 'field', width: 124, height: 20, origin: [112, 10], draw: bolt(120, 5) },
  { id: 'thorns', set: 'field', width: 122, height: 98, origin: [60, 80], draw: thorns },
  { id: 'grave-hand', set: 'field', width: 86, height: 86, origin: [44, 72], draw: graveHand },
];
export { BLOOD };
