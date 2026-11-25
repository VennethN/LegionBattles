// The inn the hunters wait in, as pieces of a stage set: each stands on the
// floor (or hangs on the back wall) by its own point, and the game places them.
// They are drawn at the figures' own size, a hunter about 170 high, so that a
// seated hunter's seat is a bench's and a hand on the bar is at the bar's top:
// a bench's seat is 33 above the floor, which is where `sitFor` puts the hip.

import { Doc, cut } from './kit/draw';
import { chain, limb, limbDark, rivets, stitches } from './kit/figure';
import { BLOOD, BONE, EARTH, LAMP, LEAD, LEATHER, MOSS, NIGHT, PAPER, RUST, SNOW, SOOT, STONE, TALLOW, WOOD, type Tone } from './kit/palette';
import { poly, type Pt } from './kit/path';
import type { Thing } from './things';

const FIRE: Tone = { lit: LAMP.lit, mid: LAMP.mid };

/** A plank or a block, a little out of true, as everything in the room is. */
function box(x0: number, y0: number, x1: number, y1: number, lean = 1): Pt[] {
  return [[x0, y0 + lean], [x1, y0 - lean], [x1 + lean, y1], [x0 - lean, y1]];
}

/** A candle stub with its flame: the flame is the only bright thing, and never near a face. */
function candle(d: Doc, name: string, x: number, foot: number, h = 16, w = 7): void {
  d.ink(name, poly(box(x - w / 2, foot - h, x + w / 2, foot, 0.5)), TALLOW, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
  d.flat(`${name}-run`, poly([[x - w / 2, foot - h + 2], [x - w / 2 + 3, foot - h + 2], [x - w / 2 + 2, foot - h + 9]]), TALLOW.lit);
  d.ink(`${name}-flame`, poly([[x - 3, foot - h - 1], [x, foot - h - 14], [x + 3, foot - h - 1]]), FIRE, {
    dark: false, line: 1.2, heavy: 1.6,
    inner: (c) => c.flat(`${name}-hot`, poly([[x - 1, foot - h - 2], [x, foot - h - 8], [x + 1, foot - h - 2]]), LAMP.hot),
  });
}

/** A barrel standing, hooped twice, its staves drawn. */
function barrel(d: Doc, name: string, x: number, foot: number, w = 54, h = 76): void {
  const hw = w / 2;
  d.ink(name, poly([[x - hw + 6, foot], [x - hw, foot - h / 2], [x - hw + 6, foot - h], [x + hw - 6, foot - h], [x + hw, foot - h / 2], [x + hw - 6, foot]]), WOOD, {
    dark: poly([[x + 2, foot - h - 4], ...cut([x + 2, foot - h - 4], [x + 6, foot + 4], `${name}-dark`, 1, 4), [x + hw + 10, foot + 4], [x + hw + 10, foot - h - 4]]),
    mid: 3,
    inner: (c) => {
      c.detail(`${name}-staves`, [[[x - hw / 2, foot - h], [x - hw / 2 - 3, foot]], [[x, foot - h], [x, foot]], [[x + hw / 2, foot - h], [x + hw / 2 + 3, foot]]], WOOD, 1.6);
      c.flat(`${name}-hoop-a`, poly([[x - hw, foot - h + 12], [x + hw, foot - h + 12], [x + hw, foot - h + 18], [x - hw, foot - h + 18]]), LEAD.mid);
      c.flat(`${name}-hoop-b`, poly([[x - hw, foot - 18], [x + hw, foot - 18], [x + hw, foot - 12], [x - hw, foot - 12]]), LEAD.mid);
    },
  });
  d.ink(`${name}-head`, poly([[x - hw + 6, foot - h], [x + hw - 6, foot - h], [x + hw - 10, foot - h - 6], [x - hw + 10, foot - h - 6]]), WOOD, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
}

/** A tankard, a bottle, a loaf: what a table and a bar are set with. */
function tankard(d: Doc, name: string, x: number, foot: number): void {
  d.ink(name, poly(box(x - 7, foot - 16, x + 7, foot, 0.4)), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
  d.pen(`${name}-handle`, poly([[x + 7, foot - 13], [x + 12, foot - 11], [x + 12, foot - 4], [x + 7, foot - 3]], false), 2.4);
}

function bottle(d: Doc, name: string, x: number, foot: number, tone: Tone, h = 26): void {
  d.ink(name, poly([[x - 5, foot], [x - 5, foot - h * 0.6], [x - 2, foot - h * 0.75], [x - 2, foot - h], [x + 2, foot - h], [x + 2, foot - h * 0.75], [x + 5, foot - h * 0.6], [x + 5, foot]]), tone, {
    dark: 0.45, mid: 0, line: 1.4, heavy: 1.8,
    inner: (c) => c.flat(`${name}-gleam`, poly([[x - 4, foot - h * 0.55], [x - 2, foot - h * 0.55], [x - 2, foot - 4], [x - 4, foot - 4]]), SNOW.mid, 0.6),
  });
}

function loaf(d: Doc, name: string, x: number, foot: number): void {
  d.ink(name, poly([[x - 14, foot], [x - 12, foot - 8], [x, foot - 11], [x + 12, foot - 8], [x + 14, foot]]), TALLOW, { dark: 0.4, mid: 2, line: 1.4, heavy: 1.8, inner: (c) => c.detail(`${name}-scores`, [[[x - 6, foot - 9], [x - 3, foot - 4]], [[x + 3, foot - 10], [x + 6, foot - 5]]], TALLOW, 1.4) });
}

/** A long table on trestles, set for a supper nobody has finished. */
function longTable(d: Doc): void {
  d.blot('blot', poly([[0, 126], [340, 120], [346, 134], [6, 138]]));
  d.black('under', poly([[20, 60], [320, 56], [316, 120], [24, 124]]));
  for (const [i, x] of [40, 296].entries()) {
    d.ink(`trestle-${i}-a`, limb([x, 58], [x - 20, 128], 8, 7), WOOD, { dark: limbDark([x, 58], [x - 20, 128], 8, 7, `tr-${i}a`, 0.5), mid: 0, line: 1.6, heavy: 2 });
    d.ink(`trestle-${i}-b`, limb([x, 58], [x + 20, 128], 8, 7), WOOD, { dark: limbDark([x, 58], [x + 20, 128], 8, 7, `tr-${i}b`, 0.5), mid: 0, line: 1.6, heavy: 2 });
  }
  d.ink('stretcher', poly(box(40, 96, 296, 104, 1)), WOOD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2 });
  d.ink('top', poly([[2, 50], [336, 44], [340, 58], [4, 64]]), WOOD, {
    dark: poly([[0, 57], [340, 51], [340, 70], [0, 70]]),
    mid: 3,
    inner: (c) => {
      c.detail('boards', [[[4, 54], [338, 48]]], WOOD, 1.6);
      c.scratch('knife-marks', [[[110, 50], [124, 49]], [[118, 52], [130, 48]], [[240, 48], [256, 47]]], 1.4);
    },
  });
  // What is on it, left to right: a loaf on its board, a tankard, the candle, a plate with a bone, a tankard on its side.
  d.ink('board', poly(box(60, 42, 104, 47, 0.5)), WOOD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
  loaf(d, 'loaf', 82, 42);
  tankard(d, 'tankard-a', 132, 47);
  candle(d, 'candle', 170, 46, 18);
  d.ink('plate', poly([[200, 46], [204, 42], [236, 41], [240, 45]]), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('bone', poly([[210, 42], [214, 36], [228, 35], [232, 40]]), BONE, { dark: 0.4, mid: 0, line: 1.2, heavy: 1.6 });
  d.ink('tankard-b', poly([[262, 45], [284, 44], [284, 34], [262, 35]]), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
  d.flat('spill', poly([[284, 44], [306, 43], [312, 47], [286, 48]]), BLOOD.mid, 0.6);
}

/** A bench as long as the table, its seat 33 above the floor, which is where a seated hunter's hip is. */
function innBench(d: Doc): void {
  d.blot('blot', poly([[0, 58], [300, 54], [306, 66], [6, 70]]));
  for (const [i, x] of [34, 262].entries()) {
    d.ink(`leg-${i}-a`, limb([x, 30], [x - 12, 62], 7, 6), WOOD, { dark: limbDark([x, 30], [x - 12, 62], 7, 6, `bl-${i}a`, 0.5), mid: 0, line: 1.6, heavy: 2 });
    d.ink(`leg-${i}-b`, limb([x, 30], [x + 12, 62], 7, 6), WOOD, { dark: limbDark([x, 30], [x + 12, 62], 7, 6, `bl-${i}b`, 0.5), mid: 0, line: 1.6, heavy: 2 });
  }
  d.ink('seat', poly([[4, 24], [296, 20], [298, 32], [6, 36]]), WOOD, {
    dark: poly([[0, 30], [300, 26], [300, 40], [0, 40]]),
    mid: 2,
    inner: (c) => c.detail('grain', [[[30, 26], [120, 24]], [[180, 23], [260, 22]]], WOOD, 1.4),
  });
}

/** The bar: a counter of planks with a rail, two kegs tapped on a stand behind it, a shelf of bottles on the wall. */
function barCounter(d: Doc): void {
  d.blot('blot', poly([[0, 284], [360, 278], [366, 292], [6, 296]]));
  // The shelf on the back wall.
  d.ink('shelf', poly(box(40, 70, 330, 78, 1)), WOOD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2 });
  for (const [i, x] of [70, 300].entries()) d.ink(`bracket-${i}`, poly([[x, 78], [x + 10, 78], [x, 96]]), WOOD, { dark: 0.5, mid: 0, line: 1.4, heavy: 1.8 });
  const tones: Tone[] = [MOSS, BLOOD, NIGHT, MOSS, TALLOW, BLOOD, NIGHT, MOSS];
  tones.forEach((t, i) => bottle(d, `bottle-${i}`, 60 + i * 32, 70, t, 22 + ((i * 7) % 12)));
  // Two kegs lying on a stand, their taps toward us.
  d.ink('stand', poly(box(60, 186, 300, 196, 1)), WOOD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2 });
  for (const [i, x] of [110, 240].entries()) {
    d.ink(`keg-${i}`, poly([[x - 48, 186], [x - 54, 158], [x - 48, 126], [x + 48, 126], [x + 54, 158], [x + 48, 186]]), WOOD, {
      dark: poly([[x - 60, 160], ...cut([x - 60, 160], [x + 60, 158], `keg-${i}-dark`, 1, 4), [x + 60, 196], [x - 60, 196]]),
      mid: 3,
      inner: (c) => {
        c.flat(`keg-${i}-hoop-a`, poly([[x - 30, 126], [x - 24, 126], [x - 24, 186], [x - 30, 186]]), LEAD.mid);
        c.flat(`keg-${i}-hoop-b`, poly([[x + 24, 126], [x + 30, 126], [x + 30, 186], [x + 24, 186]]), LEAD.mid);
      },
    });
    d.ink(`keg-${i}-tap`, poly([[x - 4, 150], [x + 4, 150], [x + 4, 166], [x + 10, 166], [x + 10, 172], [x - 4, 172]]), RUST, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8, rim: 1 });
    d.strokes(`keg-${i}-chalk`, [[[x - 14, 136], [x - 6, 144]], [[x - 6, 136], [x - 14, 144]]], 2, BONE.mid);
  }
  // The counter, which hides the kegs' feet.
  d.ink('front', poly([[10, 284], [14, 196], [350, 190], [352, 280]]), WOOD, {
    dark: poly([[0, 236], ...cut([0, 236], [360, 230], 'front-dark', 1, 5), [360, 300], [0, 300]]),
    mid: 4,
    inner: (c) => {
      c.detail('panels', [[[96, 196], [96, 284]], [[180, 194], [180, 282]], [[264, 192], [264, 280]]], WOOD, 2.4);
      c.detail('rail', [[[14, 260], [350, 254]]], WOOD, 2);
      c.scratch('kicks', [[[30, 272], [44, 270]], [[200, 268], [220, 266]], [[300, 266], [312, 264]]], 1.4);
    },
  });
  rivets(d, 'nails', [24, 204], [340, 198], 8, 1.4);
  d.ink('top', poly([[0, 186], [360, 180], [362, 194], [2, 200]]), WOOD, { dark: poly([[0, 194], [362, 188], [362, 204], [0, 204]]), mid: 2, rim: 1.2 });
  tankard(d, 'mug-a', 70, 186);
  tankard(d, 'mug-b', 92, 186);
  bottle(d, 'bottle-out', 290, 182, MOSS, 26);
  d.ink('rag', poly([[180, 186], [214, 184], [220, 200], [208, 212], [196, 198], [182, 196]]), PAPER, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
}

/** The hearth: a chimney of dressed stone to the beams, a mantel with a candle and a jug, a fire under an arch of brick, a pot on its chain. */
function hearth(d: Doc): void {
  d.blot('blot', poly([[0, 364], [300, 358], [306, 374], [6, 378]]));
  d.ink('chimney', poly([[60, 190], [70, 0], [230, 0], [240, 190]]), STONE, {
    dark: poly([[150, 0], ...cut([150, 0], [156, 190], 'chimney-dark', 1, 5), [240, 190], [240, 0]]),
    mid: 4,
    inner: (c) => {
      for (let y = 20; y < 190; y += 22) c.detail(`course-${y}`, [[[64, y], [236, y - 1]]], STONE, 1.8);
      c.detail('joints', stitches([80, 10], [220, 180], 14, 8, 0), STONE, 1.6);
      c.flat('soot-up', poly([[110, 150], [190, 150], [176, 60], [124, 60]]), SOOT.mid, 0.5);
    },
  });
  d.ink('breast', poly([[20, 366], [24, 196], [276, 192], [280, 362]]), STONE, {
    dark: poly([[200, 190], ...cut([200, 190], [206, 370], 'breast-dark', 1, 5), [290, 370], [290, 190]]),
    mid: 5,
    inner: (c) => {
      for (let y = 214; y < 360; y += 24) c.detail(`stone-${y}`, [[[24, y], [278, y - 2]]], STONE, 2);
      c.detail('stone-joints', stitches([40, 220], [260, 350], 12, 9, 0), STONE, 1.8);
    },
  });
  // The fire's mouth: an arch of brick round the dark, the fire low in it.
  d.ink('arch', poly([[66, 364], [64, 270], [90, 238], [150, 226], [210, 238], [236, 270], [234, 362]]), RUST, {
    dark: 0.3, mid: 2,
    inner: (c) => c.detail('voussoirs', [[[74, 264], [92, 270]], [[98, 238], [108, 254]], [[150, 228], [150, 246]], [[202, 238], [192, 254]], [[226, 264], [208, 270]]], RUST, 2),
  });
  d.black('mouth', poly([[86, 362], [84, 276], [104, 254], [150, 244], [196, 254], [216, 276], [214, 362]]));
  d.flat('glow', poly([[96, 362], [104, 310], [150, 290], [196, 310], [204, 362]]), LAMP.mid, 0.55);
  chain(d, 'pot-chain', [150, 250], [150, 284], 5);
  d.ink('pot', poly([[126, 290], [174, 290], [178, 312], [166, 326], [134, 326], [122, 312]]), SOOT, { dark: 0.5, mid: 0, line: 1.6, heavy: 2, rim: 1 });
  d.ink('logs', poly([[96, 360], [110, 342], [196, 340], [206, 358]]), WOOD, { dark: 0.6, mid: 0, line: 1.6, heavy: 2 });
  d.ink('fire', poly([[104, 344], [114, 314], [124, 334], [134, 300], [146, 330], [156, 306], [168, 332], [180, 312], [196, 344]]), FIRE, {
    dark: false, line: 1.6, heavy: 2,
    inner: (c) => c.flat('fire-hot', poly([[126, 344], [136, 322], [148, 340], [160, 324], [172, 344]]), LAMP.hot),
  });
  d.flat('embers', poly([[88, 364], [212, 364], [206, 358], [96, 358]]), LAMP.mid, 0.9);
  // The mantel and what is on it.
  d.ink('mantel', poly(box(8, 182, 292, 198, 1)), WOOD, { dark: poly([[0, 192], [300, 188], [300, 206], [0, 206]]), mid: 2 });
  for (const [i, x] of [30, 262].entries()) d.ink(`corbel-${i}`, poly([[x - 10, 198], [x + 10, 198], [x + 4, 220], [x - 4, 220]]), WOOD, { dark: 0.5, mid: 0, line: 1.4, heavy: 1.8 });
  candle(d, 'mantel-candle', 60, 182, 20);
  d.ink('jug', poly([[226, 182], [222, 168], [228, 156], [226, 150], [242, 150], [240, 156], [246, 168], [242, 182]]), RUST, { dark: 0.45, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('horn', poly([[100, 182], [130, 176], [150, 170], [154, 176], [134, 184]]), BONE, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('poker', limb([272, 220], [262, 360], 3, 3), LEAD, { dark: false, mid: 0, line: 1.4, heavy: 1.8 });
}

/** A stair up to the rooms, along the back wall: a flight of treads on a stringer, a rail with its posts, dark under it. */
function stair(d: Doc): void {
  d.blot('blot', poly([[0, 326], [120, 320], [124, 334], [4, 338]]));
  const n = 9;
  const run = 26;
  const rise = 32;
  d.black('under', poly([[16, 330], [16 + n * run, 330 - n * rise], [16 + n * run, 330]]));
  for (let i = 0; i < n; i++) {
    const x = 16 + i * run;
    const y = 330 - (i + 1) * rise;
    d.ink(`tread-${i}`, poly(box(x - 2, y, x + run + 6, y + 8, 0.5)), WOOD, { dark: 0.5, mid: 0, line: 1.4, heavy: 1.8 });
    d.ink(`riser-${i}`, poly(box(x, y + 8, x + run, y + rise, 0.3)), WOOD, { dark: 0.6, mid: 0, line: 1.2, heavy: 1.6 });
  }
  d.ink('stringer', poly([[10, 334], [16 + n * run + 6, 330 - n * rise - 6], [16 + n * run + 6, 330 - n * rise + 16], [24, 334]]), WOOD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2 });
  for (let i = 0; i <= n; i += 3) {
    const x = 20 + i * run;
    const y = 330 - (i + 1) * rise;
    d.ink(`post-${i}`, limb([x, y + 8], [x, y - 60], 5, 5), WOOD, { dark: false, mid: 0, line: 1.4, heavy: 1.8 });
  }
  d.ink('rail', limb([20, 330 - rise - 60], [20 + n * run, 330 - (n + 1) * rise - 60], 6, 6), WOOD, { dark: false, mid: 0, line: 1.6, heavy: 2 });
  d.ink('newel', poly(box(12, 230, 28, 334, 0.5)), WOOD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2 });
  d.ink('newel-cap', poly([[8, 230], [32, 230], [28, 220], [12, 220]]), WOOD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
}

/** A window in the back wall: night outside, a crescent moon, the shutters open, a bottle on the sill. */
function innWindow(d: Doc): void {
  d.ink('frame', poly(box(8, 8, 142, 150, 1)), WOOD, { dark: 0.4, mid: 2 });
  d.ink('night', poly(box(20, 20, 130, 138, 0.5)), NIGHT, {
    dark: 0.3, mid: 0, line: 1.4, heavy: 1.8,
    inner: (c) => {
      c.flat('moon', poly([[96, 36], [104, 40], [108, 50], [104, 60], [96, 64], [100, 56], [101, 48], [99, 42]]), SNOW.lit);
      c.flat('hills', poly([[20, 120], [50, 106], [80, 114], [110, 100], [130, 108], [130, 138], [20, 138]]), NIGHT.mid);
    },
  });
  d.strokes('stars', [[[40, 36], [41, 38]], [[60, 52], [61, 54]], [[34, 70], [35, 72]], [[80, 30], [81, 32]]], 2, SNOW.mid);
  d.ink('mullion', poly(box(72, 20, 78, 138, 0.3)), WOOD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('transom', poly(box(20, 76, 130, 82, 0.3)), WOOD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('sill', poly(box(0, 146, 150, 156, 1)), WOOD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2 });
  bottle(d, 'sill-bottle', 118, 146, MOSS, 20);
  d.ink('shutter-l', poly([[8, 10], [1, 18], [1, 142], [8, 148]]), WOOD, { dark: 0.6, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('shutter-r', poly([[142, 10], [152, 18], [152, 142], [142, 148]]), WOOD, { dark: 0.6, mid: 0, line: 1.4, heavy: 1.8 });
}

/** The notice board the contracts are pinned to: notices nailed up over each other, one under a red seal. */
function noticeBoard(d: Doc): void {
  d.ink('board', poly(box(6, 10, 164, 132, 1)), WOOD, {
    dark: poly([[0, 90], ...cut([0, 90], [170, 86], 'board-dark', 1, 4), [170, 140], [0, 140]]),
    mid: 3,
    inner: (c) => c.detail('planks', [[[8, 50], [162, 48]], [[8, 92], [162, 90]]], WOOD, 2),
  });
  d.ink('frame', poly([[0, 4], [170, 0], [170, 140], [0, 144], [0, 4], [8, 12], [8, 132], [162, 130], [162, 8], [8, 12]]), WOOD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2, holes: true });
  const notices: Array<[number, number, number, number, number]> = [[18, 20, 46, 54, -4], [70, 16, 42, 46, 3], [118, 22, 36, 50, -2], [28, 74, 48, 50, 5], [84, 66, 40, 56, -3], [126, 80, 30, 40, 4]];
  notices.forEach(([x, y, w, h, tilt], i) => {
    d.ink(`notice-${i}`, poly([[x, y + tilt * 0.3], [x + w, y - tilt * 0.3], [x + w + tilt * 0.4, y + h], [x + tilt * 0.4, y + h + 2]]), PAPER, {
      dark: 0.3, mid: 0, line: 1.4, heavy: 1.8,
      inner: (c) => c.strokes(`notice-${i}-lines`, [[[x + 6, y + 10], [x + w - 8, y + 9]], [[x + 6, y + 18], [x + w - 12, y + 17]], [[x + 6, y + 26], [x + w - 6, y + 25]], [[x + 6, y + 34], [x + w - 14, y + 33]]], 1.6, SOOT.mid),
    });
    d.flat(`notice-${i}-nail`, poly([[x + w / 2 - 2, y + 2], [x + w / 2 + 2, y + 2], [x + w / 2 + 2, y + 6], [x + w / 2 - 2, y + 6]]), LEAD.mid);
  });
  d.ink('seal', poly([[96, 104], [104, 100], [112, 106], [110, 116], [100, 118], [94, 112]]), BLOOD, { dark: 0.4, mid: 0, line: 1.2, heavy: 1.6 });
}

/** A rack of what a hunter might borrow: two spears and a pike stood in it, an axe hung, a bow on a peg, a shield leant at its foot. */
function weaponRack(d: Doc): void {
  d.blot('blot', poly([[0, 216], [200, 210], [206, 224], [6, 228]]));
  d.ink('back', poly(box(20, 60, 180, 70, 1)), WOOD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2 });
  d.ink('foot', poly(box(14, 196, 186, 218, 1)), WOOD, { dark: 0.5, mid: 2, line: 1.6, heavy: 2 });
  for (const [i, x] of [24, 176].entries()) d.ink(`upright-${i}`, poly(box(x - 5, 50, x + 5, 216, 0.5)), WOOD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2 });
  const poles: Array<[number, number, number]> = [[50, 8, 0], [82, 20, 1], [114, 0, 2]];
  for (const [x, top, kind] of poles) {
    d.ink(`pole-${x}`, limb([x, top + 26], [x + 2, 198], 4, 4), WOOD, { dark: false, mid: 0, line: 1.4, heavy: 1.8 });
    const head = kind === 2
      ? poly([[x - 4, top + 28], [x, top], [x + 4, top + 28], [x + 14, top + 34], [x + 4, top + 36]])
      : poly([[x - 5, top + 28], [x, top], [x + 5, top + 28]]);
    d.ink(`head-${x}`, head, LEAD, { dark: 0.45, mid: 0, line: 1.4, heavy: 1.8, rim: 1 });
  }
  d.ink('axe-haft', limb([150, 74], [146, 170], 4, 4), WOOD, { dark: false, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('axe-head', poly([[148, 82], [170, 72], [176, 96], [164, 104], [150, 96]]), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8, rim: 1.2 });
  d.pen('bow', poly([[134, 40], [126, 80], [128, 130], [136, 164]], false), 4);
  d.pen('bow-string', poly([[134, 40], [136, 164]], false), 1.2, BONE.mid);
  d.ink('shield', poly([[150, 214], [148, 160], [176, 150], [200, 160], [196, 214]]), WOOD, {
    dark: 0.4, mid: 2,
    inner: (c) => c.flat('shield-band', poly([[150, 180], [198, 176], [198, 186], [150, 190]]), BLOOD.mid),
  });
  rivets(d, 'shield-rivets', [156, 164], [190, 160], 3, 1.6);
}

/** The butcher's block: a stump of a block on legs, a cleaver bit into it, a joint and a bucket by it. */
function butcherBlock(d: Doc): void {
  d.blot('blot', poly([[0, 138], [170, 132], [176, 146], [6, 150]]));
  for (const [i, x] of [36, 124].entries()) d.ink(`leg-${i}`, limb([x, 70], [x + (i ? 6 : -6), 140], 8, 8), WOOD, { dark: limbDark([x, 70], [x + (i ? 6 : -6), 140], 8, 8, `bb-${i}`, 0.5), mid: 0, line: 1.6, heavy: 2 });
  d.ink('block', poly([[18, 80], [16, 40], [144, 36], [148, 78]]), WOOD, {
    dark: poly([[0, 62], ...cut([0, 62], [160, 58], 'block-dark', 1, 4), [160, 90], [0, 90]]),
    mid: 3,
    inner: (c) => {
      c.detail('rings', [[[30, 44], [70, 42]], [[90, 41], [130, 40]]], WOOD, 1.6);
      c.flat('stain', poly([[60, 40], [104, 38], [110, 50], [70, 56]]), BLOOD.mid, 0.7);
    },
  });
  d.ink('top', poly([[14, 42], [146, 38], [140, 30], [20, 34]]), WOOD, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8, inner: (c) => c.scratch('chops', [[[40, 36], [52, 34]], [[110, 34], [120, 33]], [[76, 35], [84, 33]]], 1.4) });
  d.ink('cleaver', poly([[84, 34], [86, 6], [116, 4], [118, 32]]), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8, rim: 1.4 });
  d.ink('cleaver-grip', limb([116, 10], [140, 4], 5, 5), WOOD, { dark: false, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('joint', poly([[26, 34], [30, 20], [50, 14], [62, 22], [58, 34]]), BLOOD, { dark: 0.4, mid: 2, line: 1.4, heavy: 1.8, inner: (c) => c.flat('fat', poly([[30, 22], [48, 16], [50, 20], [34, 26]]), TALLOW.lit) });
  d.ink('knuckle', poly([[58, 26], [70, 24], [72, 30], [60, 32]]), BONE, { dark: 0.3, mid: 0, line: 1.2, heavy: 1.6 });
  d.ink('bucket', poly([[146, 140], [142, 104], [172, 102], [170, 140]]), WOOD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8, inner: (c) => c.flat('bucket-hoop', poly([[142, 116], [172, 114], [172, 120], [142, 122]]), LEAD.mid) });
  d.flat('drips', poly([[60, 138], [96, 136], [100, 142], [64, 144]]), BLOOD.mid, 0.6);
}

/** The smith's corner: a forge of brick with its hood and a glow in it, the bellows, an anvil on its stump, tongs and a hammer. */
function forgeCorner(d: Doc): void {
  d.blot('blot', poly([[0, 284], [300, 278], [306, 292], [6, 296]]));
  d.ink('hood', poly([[30, 130], [70, 0], [150, 0], [190, 130]]), SOOT, {
    dark: poly([[110, 0], ...cut([110, 0], [114, 130], 'hood-dark', 1, 4), [200, 130], [200, 0]]),
    mid: 3,
    inner: (c) => c.detail('hood-seams', [[[50, 70], [170, 70]], [[40, 104], [180, 104]]], SOOT, 2),
  });
  rivets(d, 'hood-rivets', [46, 120], [176, 120], 7, 1.6);
  d.ink('forge', poly([[20, 284], [22, 140], [200, 136], [204, 282]]), RUST, {
    dark: poly([[130, 130], ...cut([130, 130], [134, 290], 'forge-dark', 1, 5), [210, 290], [210, 130]]),
    mid: 4,
    inner: (c) => {
      for (let y = 160; y < 280; y += 18) c.detail(`brick-${y}`, [[[22, y], [202, y - 1]]], RUST, 1.8);
      c.detail('brick-joints', stitches([30, 150], [194, 276], 14, 8, 0), RUST, 1.6);
    },
  });
  d.ink('hearth-lip', poly(box(14, 134, 208, 146, 1)), STONE, { dark: 0.5, mid: 0, line: 1.6, heavy: 2 });
  d.black('firepot', poly([[54, 134], [64, 122], [156, 120], [166, 132]]));
  d.ink('coals', poly([[64, 132], [76, 112], [92, 124], [110, 104], [128, 122], [144, 110], [158, 130]]), FIRE, {
    dark: false, line: 1.4, heavy: 1.8,
    inner: (c) => c.flat('coals-hot', poly([[88, 130], [104, 112], [120, 130]]), LAMP.hot),
  });
  d.ink('tongs', poly([[150, 118], [196, 96], [198, 100], [154, 122]]), LEAD, { dark: false, mid: 0, line: 1.2, heavy: 1.6 });
  // The bellows, its nozzle into the forge's side.
  d.ink('bellows', poly([[196, 200], [250, 180], [274, 196], [250, 220], [196, 214]]), LEATHER, { dark: 0.4, mid: 2, inner: (c) => c.detail('folds', [[[214, 196], [254, 186]], [[214, 206], [252, 210]]], LEATHER, 1.8) });
  d.ink('bellows-arm', limb([262, 196], [292, 170], 4, 4), WOOD, { dark: false, mid: 0, line: 1.4, heavy: 1.8 });
  // The anvil on its stump, in front.
  d.ink('stump', poly([[220, 284], [222, 240], [282, 238], [286, 282]]), WOOD, { dark: 0.45, mid: 2, inner: (c) => c.detail('stump-grain', [[[236, 244], [238, 280]], [[262, 242], [264, 280]]], WOOD, 1.6) });
  d.ink('anvil-waist', poly([[236, 240], [240, 222], [266, 222], [270, 240]]), LEAD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2 });
  d.ink('anvil-face', poly([[214, 222], [216, 206], [276, 204], [300, 204], [284, 214], [276, 222]]), LEAD, { dark: poly([[200, 214], [300, 210], [300, 226], [200, 226]]), mid: 2, rim: 1.6 });
  d.ink('hammer-haft', limb([230, 202], [270, 190], 3, 3), WOOD, { dark: false, mid: 0, line: 1.2, heavy: 1.6 });
  d.ink('hammer-head', poly(box(222, 194, 236, 206, 0.3)), LEAD, { dark: 0.4, mid: 0, line: 1.2, heavy: 1.6 });
  d.flat('scale', poly([[0, 290], [60, 284], [120, 292], [200, 286], [290, 292], [300, 296], [0, 296]]), EARTH.mid, 0.8);
}

/** The miner's table: a little table with his lamp burning, a sketch of a seam held flat by a stone, a pick leant on it, ore in a dish. */
function minerTable(d: Doc): void {
  d.blot('blot', poly([[0, 146], [220, 140], [226, 154], [6, 158]]));
  d.black('under', poly([[30, 84], [190, 80], [186, 144], [34, 148]]));
  for (const [i, x] of [34, 186].entries()) d.ink(`leg-${i}`, limb([x, 82], [x, 148], 7, 7), WOOD, { dark: limbDark([x, 82], [x, 148], 7, 7, `mt-${i}`, 0.5), mid: 0, line: 1.6, heavy: 2 });
  d.ink('top', poly([[16, 76], [204, 72], [206, 86], [18, 90]]), WOOD, { dark: poly([[0, 84], [220, 80], [220, 96], [0, 96]]), mid: 2 });
  d.ink('sketch', poly([[50, 74], [56, 66], [126, 64], [124, 74]]), PAPER, { dark: 0.2, mid: 0, line: 1.2, heavy: 1.6, inner: (c) => c.strokes('seam', [[[60, 70], [118, 66]]], 1.4, SOOT.mid) });
  d.ink('paperweight', poly([[108, 66], [114, 60], [124, 62], [122, 68]]), STONE, { dark: 0.4, mid: 0, line: 1.2, heavy: 1.6 });
  d.ink('dish', poly([[132, 74], [136, 68], [164, 68], [168, 74]]), LEAD, { dark: 0.4, mid: 0, line: 1.2, heavy: 1.6 });
  d.ink('ore', poly([[138, 68], [144, 60], [152, 62], [160, 58], [162, 68]]), RUST, { dark: 0.4, mid: 0, line: 1.2, heavy: 1.6, inner: (c) => c.flat('ore-glint', poly([[150, 62], [154, 61], [152, 65]]), LAMP.lit) });
  // The lamp: a squat iron lamp with its flame behind horn panes.
  d.ink('lamp', poly([[22, 74], [24, 50], [30, 40], [50, 40], [56, 50], [58, 74]]), SOOT, {
    dark: 0.35, mid: 0, line: 1.6, heavy: 2,
    inner: (c) => c.flat('lamp-pane', poly([[30, 70], [30, 50], [50, 50], [50, 70]]), LAMP.mid),
  });
  d.ink('lamp-flame', poly([[36, 66], [40, 52], [44, 66]]), FIRE, { dark: false, line: 1.2, heavy: 1.6, inner: (c) => c.flat('lamp-hot', poly([[39, 64], [40, 58], [41, 64]]), LAMP.hot) });
  d.pen('lamp-bail', poly([[30, 40], [40, 30], [50, 40]], false), 2);
  d.ink('pick-haft', limb([196, 148], [180, 50], 4, 4), WOOD, { dark: false, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('pick-head', poly([[150, 58], [180, 44], [212, 50], [182, 52]]), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8, rim: 1 });
}

/** The back door to the river: planks under iron straps, a bar across, wet steps at its foot, an oar and a coil of rope by it. */
function riverDoor(d: Doc): void {
  d.blot('blot', poly([[0, 258], [160, 252], [166, 266], [6, 270]]));
  d.ink('jamb', poly([[14, 262], [16, 30], [40, 6], [120, 6], [144, 30], [146, 262], [132, 262], [130, 34], [116, 20], [44, 20], [30, 34], [28, 262]]), STONE, { dark: 0.4, mid: 2 });
  d.ink('door', poly([[30, 262], [30, 34], [44, 20], [116, 20], [130, 34], [130, 262]]), WOOD, {
    dark: poly([[80, 10], ...cut([80, 10], [84, 270], 'door-dark', 1, 4), [140, 270], [140, 10]]),
    mid: 3,
    inner: (c) => {
      c.detail('planks', [[[54, 22], [54, 262]], [[80, 20], [80, 262]], [[106, 22], [106, 262]]], WOOD, 2);
      c.flat('damp', poly([[30, 200], [130, 196], [130, 262], [30, 262]]), MOSS.mid, 0.6);
    },
  });
  for (const y of [70, 190]) {
    d.ink(`strap-${y}`, poly(box(30, y, 130, y + 10, 0.5)), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
    rivets(d, `strap-${y}-rivets`, [38, y + 5], [122, y + 5], 5, 1.4);
  }
  d.ink('bar', poly(box(22, 128, 140, 140, 1)), WOOD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2 });
  for (const x of [22, 132]) d.ink(`bar-hook-${x}`, poly(box(x, 124, x + 8, 144, 0.3)), LEAD, { dark: 0.4, mid: 0, line: 1.2, heavy: 1.6 });
  d.black('grille', poly(box(66, 42, 94, 62, 0.3)));
  d.strokes('grille-bars', [[[73, 42], [73, 62]], [[80, 42], [80, 62]], [[87, 42], [87, 62]]], 2.4, LEAD.mid);
  d.ink('step', poly([[10, 270], [14, 256], [146, 252], [152, 266]]), STONE, { dark: 0.4, mid: 0, line: 1.6, heavy: 2, inner: (c) => c.flat('wet', poly([[40, 262], [110, 258], [120, 264], [44, 268]]), SNOW.mid, 0.4) });
  d.ink('oar', limb([150, 256], [140, 60], 4, 4), WOOD, { dark: false, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('oar-blade', poly([[136, 250], [146, 200], [160, 202], [156, 256]]), WOOD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('rope', poly([[0, 262], [4, 240], [24, 232], [40, 240], [42, 262]]), TALLOW, {
    dark: 0.35, mid: 0, line: 1.4, heavy: 1.8,
    inner: (c) => c.detail('coils', [[[4, 250], [40, 248]], [[8, 240], [36, 238]], [[2, 256], [42, 256]]], TALLOW, 1.4),
  });
}

/** Barrels by the wall: two stood, one on its side in front of them. */
function barrels(d: Doc): void {
  d.blot('blot', poly([[0, 136], [200, 130], [206, 144], [6, 148]]));
  barrel(d, 'barrel-a', 52, 120, 56, 84);
  barrel(d, 'barrel-b', 112, 116, 52, 76);
  d.ink('barrel-c', poly([[100, 142], [96, 112], [104, 98], [176, 96], [186, 110], [182, 140]]), WOOD, {
    dark: poly([[90, 124], ...cut([90, 124], [190, 120], 'bc-dark', 1, 4), [190, 146], [90, 146]]),
    mid: 3,
    inner: (c) => {
      c.flat('bc-hoop-a', poly([[120, 98], [126, 98], [124, 142], [118, 142]]), LEAD.mid);
      c.flat('bc-hoop-b', poly([[156, 97], [162, 97], [164, 141], [158, 141]]), LEAD.mid);
    },
  });
  d.ink('bc-head', poly([[176, 96], [192, 100], [196, 124], [186, 140], [182, 140], [186, 110]]), WOOD, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('sack', poly([[150, 96], [148, 80], [156, 66], [176, 64], [182, 78], [180, 96]]), TALLOW, { dark: 0.4, mid: 2, line: 1.4, heavy: 1.8, inner: (c) => c.detail('sack-tie', [[[154, 70], [178, 68]]], TALLOW, 1.6) });
}

/** Candles in a cluster on a dish, burnt down unevenly, the wax run together. */
function candles(d: Doc): void {
  d.blot('blot', poly([[6, 82], [74, 78], [76, 88], [8, 90]]));
  d.ink('dish', poly([[4, 84], [10, 76], [70, 74], [76, 82]]), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('pool', poly([[16, 78], [24, 72], [58, 70], [66, 76]]), TALLOW, { dark: 0.3, mid: 0, line: 1.2, heavy: 1.6 });
  candle(d, 'tall', 30, 74, 34, 9);
  candle(d, 'mid', 48, 72, 22, 8);
  candle(d, 'low', 62, 74, 10, 7);
}

export const TAVERN: Thing[] = [
  { id: 'long-table', set: 'tavern', width: 346, height: 140, origin: [170, 128], draw: longTable },
  { id: 'inn-bench', set: 'tavern', width: 306, height: 70, origin: [150, 62], draw: innBench },
  { id: 'bar-counter', set: 'tavern', width: 366, height: 300, origin: [180, 288], draw: barCounter },
  { id: 'hearth', set: 'tavern', width: 306, height: 380, origin: [150, 368], draw: hearth },
  { id: 'stair', set: 'tavern', width: 270, height: 340, origin: [16, 332], draw: stair },
  { id: 'inn-window', set: 'tavern', width: 156, height: 160, origin: [75, 80], draw: innWindow },
  { id: 'notice-board', set: 'tavern', width: 172, height: 146, origin: [85, 72], draw: noticeBoard },
  { id: 'weapon-rack', set: 'tavern', width: 206, height: 230, origin: [100, 218], draw: weaponRack },
  { id: 'butcher-block', set: 'tavern', width: 176, height: 152, origin: [84, 140], draw: butcherBlock },
  { id: 'forge-corner', set: 'tavern', width: 306, height: 298, origin: [150, 288], draw: forgeCorner },
  { id: 'miner-table', set: 'tavern', width: 226, height: 160, origin: [110, 148], draw: minerTable },
  { id: 'river-door', set: 'tavern', width: 166, height: 272, origin: [80, 262], draw: riverDoor },
  { id: 'barrels', set: 'tavern', width: 206, height: 150, origin: [100, 140], draw: barrels },
  { id: 'candles', set: 'tavern', width: 80, height: 92, origin: [40, 84], draw: candles },
];
