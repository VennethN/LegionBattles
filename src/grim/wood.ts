// The winter wood: the Antlered King's lair. Snow that is never white,
// dead bracken through it, black trunks, and the old stones and the wall
// that he can be made to run into. Built as the churchyard is: a floor, a
// far layer, things that stand on the field, and black flats in front.

import { Doc, cut } from './kit/draw';
import { dice } from './kit/dice';
import { chain, limb, limbDark } from './kit/figure';
import { BONE, BRACKEN, EARTH, INK, LEAD, MOSS, NIGHT, RUST, SNOW, STONE, WOOD } from './kit/palette';
import { poly, type Pt } from './kit/path';
import type { Thing } from './things';

/** The floor of the wood, any size: trodden snow, drifts, the tracks of something heavy, bracken and fallen leaves. */
export function woodGround(width: number, height: number): Doc {
  const d = new Doc('wood-ground');
  const rnd = dice(`wood-${width}-${height}`);
  d.flat('snow', poly([[0, 0], [width, 0], [width, height], [0, height]]), SNOW.mid);
  const area = (width * height) / (1400 * 1000);
  const patch = (name: string, cx: number, cy: number, r: number, color: string): void => {
    const pts: Pt[] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const k = r * rnd.range(0.6, 1.1);
      pts.push([cx + Math.cos(a) * k * 1.6, cy + Math.sin(a) * k * 0.66]);
    }
    d.flat(name, poly(pts), color);
  };
  // Drifts, where the snow lies deeper and catches what light there is; and bare ground under the trees.
  for (let i = 0; i < Math.round(18 * area); i++) patch(`drift-${i}`, rnd.range(0, width), rnd.range(0, height), rnd.range(60, 160), SNOW.lit);
  for (let i = 0; i < Math.round(8 * area); i++) patch(`bare-${i}`, rnd.range(0, width), rnd.range(0, height), rnd.range(40, 100), EARTH.mid);
  // His tracks: the churned lanes he has run before, across the whole field.
  for (let i = 0; i < Math.round(3 * area + 1); i++) {
    const y = rnd.range(height * 0.2, height * 0.8);
    const slope = rnd.range(-0.08, 0.08);
    d.flat(`lane-${i}`, poly([[0, y], [width, y + slope * width], [width, y + slope * width + 34], [0, y + 30]]), SNOW.mid);
    for (let x = 30; x < width; x += rnd.range(60, 110)) {
      const ty = y + slope * x + rnd.range(4, 22);
      d.flat(`track-${i}-${Math.round(x)}`, poly([[x, ty], [x + 12, ty - 4], [x + 20, ty + 2], [x + 10, ty + 8]]), EARTH.mid);
    }
  }
  // Bracken: dead brown fronds standing out of the snow.
  for (let i = 0; i < Math.round(60 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    d.strokes(`bracken-${i}`, [[[x, y], [x - 9, y - 14]], [[x + 2, y], [x + 2, y - 18]], [[x + 4, y], [x + 14, y - 12]], [[x - 2, y - 2], [x - 16, y - 4]]], 3.4, i % 3 === 0 ? BRACKEN.lit : BRACKEN.mid);
  }
  // Leaves and twigs on the snow, and stones through it.
  for (let i = 0; i < Math.round(80 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    if (i % 4 === 0) d.strokes(`twig-${i}`, [[[x, y], [x + rnd.range(8, 18), y + rnd.range(-6, 6)]]], 2.4, WOOD.mid);
    else d.flat(`leaf-${i}`, poly([[x, y], [x + 5, y - 3], [x + 9, y], [x + 4, y + 2]]), i % 2 ? BRACKEN.mid : RUST.mid);
  }
  for (let i = 0; i < Math.round(24 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    d.flat(`stone-${i}`, poly([[x - 7, y + 2], [x - 2, y - 6], [x + 7, y - 3], [x + 6, y + 4], [x - 4, y + 5]]), STONE.mid);
    d.flat(`stone-${i}-cap`, poly([[x - 3, y - 5], [x + 6, y - 3], [x + 3, y - 1], [x - 4, y - 2]]), SNOW.lit);
  }
  return d;
}

/** Snow lying on top of a thing: a flat cap with a hard edge. */
function cap(d: Doc, name: string, pts: Pt[]): void {
  d.ink(name, poly(pts), SNOW, { dark: false, line: 1.6, heavy: 2.2 });
}

/** A standing stone: old, leaning, cut with marks nobody reads. What he runs into. */
function standingStone(tall: boolean): (d: Doc) => void {
  return (d) => {
    const h = tall ? 210 : 150;
    const top = 226 - h;
    d.blot('blot', poly([[10, 226], [110, 220], [150, 232], [100, 242], [20, 238]]));
    d.ink('stone', poly([[26, 232], [34, top + 60], [50, top + 14], [78, top], [104, top + 22], [112, top + 80], [118, 230]]), STONE, {
      dark: poly([[0, top - 10], [58, top - 10], ...cut([58, top], [66, 240], `ss-${h}`, -1, 9), [0, 240]]),
      mid: 8, cold: 3,
      inner: (c) => {
        // The marks: a spiral, a row of cuts, a crack down it.
        c.detail('cuts', [[[78, top + 60], [100, top + 62]], [[78, top + 74], [98, top + 76]], [[80, top + 88], [102, top + 90]], [[84, top + 40], [96, top + 34]], [[96, top + 34], [100, top + 46]], [[100, top + 46], [90, top + 50]]], STONE, 3);
        c.strokes('crack', [[[92, top + 4], [84, top + 30]], [[84, top + 30], [90, top + 56]]], 2.4);
        c.flat('lichen', poly([[72, 150], [96, 146], [104, 170], [80, 176]]), MOSS.lit, 0.8);
        c.flat('moss', poly([[60, 200], [118, 196], [120, 236], [58, 236]]), MOSS.mid);
      },
    });
    cap(d, 'snow', [[48, top + 18], [78, top - 2], [106, top + 22], [96, top + 18], [78, top + 8], [58, top + 22]]);
    d.flat('drift', poly([[6, 232], [40, 220], [120, 222], [150, 234], [120, 240], [20, 240]]), SNOW.lit);
  };
}

/** An old hunting wall of dry stone, fallen in places: long enough to stop him. */
function huntingWall(d: Doc): void {
  d.blot('blot', poly([[0, 118], [270, 112], [286, 124], [10, 130]]));
  d.ink('wall', poly([[4, 124], [6, 56], [60, 50], [96, 62], [150, 46], [200, 54], [236, 76], [276, 84], [280, 120]]), STONE, {
    dark: poly([[0, 92], ...cut([0, 90], [286, 96], 'hw-dark', 1, 5), [286, 132], [0, 132]]),
    mid: 6, cold: 2.4,
    inner: (c) => {
      c.detail('stones', [[[8, 76], [90, 74]], [[100, 80], [230, 84]], [[40, 56], [42, 74]], [[70, 60], [72, 76]], [[130, 54], [132, 80]], [[176, 54], [178, 82]], [[210, 64], [212, 84]], [[24, 78], [26, 92]], [[110, 82], [112, 96]], [[160, 84], [162, 98]]], STONE, 2.4);
      c.flat('moss-a', poly([[16, 60], [50, 56], [44, 70], [20, 72]]), MOSS.mid);
      c.flat('lichen', poly([[152, 50], [186, 54], [180, 66], [156, 64]]), MOSS.lit, 0.8);
    },
  });
  cap(d, 'snow-a', [[4, 58], [60, 48], [96, 62], [84, 62], [58, 56], [8, 66]]);
  cap(d, 'snow-b', [[150, 44], [200, 52], [236, 76], [222, 74], [196, 60], [152, 54]]);
  // Stones that have fallen from it, and an old iron ring where a hound was tied.
  d.ink('fallen-a', poly([[236, 124], [246, 104], [268, 106], [276, 124]]), STONE, { dark: 0.4, mid: 3 });
  d.ink('fallen-b', poly([[98, 128], [104, 114], [124, 116], [128, 130]]), STONE, { dark: 0.4, mid: 3 });
  d.pen('ring', poly([[38, 88], [32, 96], [38, 104], [44, 96], [38, 88]], false), 3);
  d.flat('ring-rust', poly([[36, 100], [42, 98], [41, 104], [37, 105]]), RUST.mid);
}

/** A fallen tree: a trunk on its side with its root plate up and its branches broken, snow along its top. */
function fallenTree(d: Doc): void {
  d.blot('blot', poly([[10, 128], [300, 120], [330, 132], [280, 140], [20, 138]]));
  const branch = (n: string, a: Pt, b: Pt, w: number): void => void d.ink(n, limb(a, b, w, w * 0.3), WOOD, { dark: limbDark(a, b, w, w, `ft-${n}`, 0.6), mid: 0, line: 2, heavy: 2.6 });
  branch('b1', [220, 92], [262, 30], 12);
  branch('b2', [256, 40], [290, 26], 6);
  branch('b3', [270, 100], [322, 60], 10);
  branch('b4', [180, 96], [176, 44], 9);
  // The root plate: earth and roots torn up on end.
  d.ink('roots', poly([[20, 124], [8, 86], [22, 50], [44, 34], [66, 44], [80, 76], [74, 126]]), EARTH, {
    dark: 0.5, mid: 5, cold: 2.4,
    inner: (c) => c.strokes('root-lines', [[[40, 44], [30, 78]], [[54, 46], [50, 90]], [[66, 60], [64, 100]], [[26, 70], [20, 104]]], 3.4),
  });
  branch('root-a', [30, 52], [4, 20], 8);
  branch('root-b', [50, 36], [56, 4], 7);
  d.ink('trunk', poly([[60, 126], [64, 78], [150, 82], [260, 88], [326, 104], [320, 122], [250, 126]]), WOOD, {
    dark: poly([[50, 108], ...cut([56, 106], [330, 114], 'ft-trunk', 1, 5), [330, 134], [50, 134]]),
    mid: 5,
    inner: (c) => {
      c.detail('bark', [[[90, 92], [160, 96]], [[180, 100], [250, 104]], [[110, 104], [150, 106]], [[270, 104], [310, 110]]], WOOD, 2.4);
      c.black('hollow', poly([[196, 96], [214, 96], [216, 108], [198, 110]]));
    },
  });
  cap(d, 'snow', [[64, 80], [150, 80], [260, 86], [324, 102], [300, 100], [240, 92], [150, 90], [70, 88]]);
  d.flat('drift', poly([[40, 128], [120, 120], [240, 122], [320, 126], [300, 136], [60, 138]]), SNOW.lit);
}

/** Something hung in a tree by those who were here before: bones on a cord, a horseshoe, a little bell. */
function charm(d: Doc): void {
  chain(d, 'cord', [30, 0], [30, 36], 6);
  d.ink('stick', limb([6, 38], [54, 40], 5, 5), WOOD, { dark: false, line: 1.6, heavy: 2 });
  for (const [i, [x, len]] of ([[10, 30], [22, 46], [36, 38], [50, 26]] as Array<[number, number]>).entries()) {
    d.pen(`string-${i}`, poly([[x, 40], [x, 40 + len * 0.4]], false), 1.4);
    if (i === 2) d.ink('horseshoe', poly([[x - 8, 56], [x - 2, 56], [x - 3, 72], [x + 3, 72], [x + 2, 56], [x + 8, 56], [x + 9, 76], [x, 84], [x - 9, 76]]), LEAD, { dark: 0.3, mid: 0, line: 1.6, heavy: 2, inner: (c) => c.flat('shoe-rust', poly([[x - 9, 70], [x + 9, 72], [x, 86]]), RUST.mid) });
    else d.ink(`bone-${i}`, limb([x, 40 + len * 0.4], [x + (i - 1) * 2, 40 + len], 5, 4), BONE, { dark: 0.3, mid: 0, line: 1.6, heavy: 2 });
  }
}

/** The far side of the wood: trunks in the night's own color, a few of them nearer, and nothing between. */
function farTrees(d: Doc): void {
  const trunk = (n: string, x: number, w: number, top: number, color: string): void => void d.flat(n, poly([[x - w, 250], [x - w * 0.7, top + 40], [x - w * 1.6, top], [x - w * 0.2, top + 30], [x, top - 20], [x + w * 0.3, top + 26], [x + w * 1.8, top + 6], [x + w * 0.7, top + 50], [x + w, 250]]), color);
  for (const [i, [x, w, top]] of ([[30, 9, 60], [90, 7, 40], [150, 10, 70], [210, 6, 30], [270, 9, 56], [340, 7, 36], [400, 10, 64], [456, 6, 44]] as Array<[number, number, number]>).entries()) trunk(`far-${i}`, x, w, top, NIGHT.mid);
  d.flat('floor', poly([[0, 232], [470, 226], [470, 250], [0, 250]]), NIGHT.mid);
  for (const [i, [x, w, top]] of ([[60, 14, 20], [186, 16, 0], [310, 13, 24], [430, 15, 10]] as Array<[number, number, number]>).entries()) trunk(`near-${i}`, x, w, top, NIGHT.lit);
}

/** A flat for the front of the stage: black trunks, a low branch with what hangs from it, bracken. */
function trunkFlat(d: Doc): void {
  d.black('ground', poly([[0, 300], [0, 262], [50, 250], [120, 258], [200, 246], [260, 262], [300, 256], [300, 300]]));
  d.black('trunk-a', poly([[40, 262], [52, 120], [44, 0], [84, 0], [92, 130], [110, 264]]));
  d.black('branch', poly([[84, 60], [150, 40], [230, 44], [296, 20], [300, 30], [232, 56], [152, 54], [88, 80]]));
  d.black('trunk-b', poly([[214, 262], [222, 150], [216, 60], [240, 60], [246, 160], [262, 262]]));
  d.black('charm', poly([[168, 52], [172, 52], [172, 96], [182, 96], [184, 126], [158, 126], [160, 96], [168, 96]]));
  d.strokes('bracken', [[[10, 262], [0, 226]], [[18, 260], [20, 220]], [[26, 258], [42, 228]], [[130, 258], [122, 226]], [[140, 256], [150, 224]], [[270, 260], [262, 230]], [[282, 258], [294, 232]]], 7);
  void INK;
}

export const WOODLAND: Thing[] = [
  { id: 'standing-stone', set: 'wood', width: 160, height: 246, origin: [72, 230], draw: standingStone(true) },
  { id: 'standing-stone-low', set: 'wood', width: 160, height: 246, origin: [72, 230], draw: standingStone(false) },
  { id: 'hunting-wall', set: 'wood', width: 290, height: 134, origin: [142, 122], draw: huntingWall },
  { id: 'fallen-tree', set: 'wood', width: 334, height: 142, origin: [180, 128], draw: fallenTree },
  { id: 'hanging-charm', set: 'wood', width: 62, height: 90, origin: [30, 0], draw: charm },
  { id: 'far-trees', set: 'wood', width: 470, height: 250, origin: [235, 250], draw: farTrees },
  { id: 'trunk-flat', set: 'wood', width: 300, height: 300, origin: [150, 300], draw: trunkFlat },
];
