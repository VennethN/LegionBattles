// The four lairs that came after the churchyard and the wood: the rotten
// cellar under Harrow (the Spinner's), the drowned abbey of Saint Wenna (the
// Bell Abbot's), the old foundry at Black Pit (the Furnace's) and the mirror
// maker's hall (the Mirror King's). Each is built as the first two are: a
// floor drawn at any size, a far layer, pieces that stand on the field, and a
// black flat for the front. And what the new hunters and lords leave on the
// field: an anvil, a keg, webs, light on the water, what is left of a sac,
// a barrel and a mirror once broken, the shallows and a run of poured iron.

import { Doc, cut } from './kit/draw';
import { dice } from './kit/dice';
import { chain, limb, limbDark, rivets, stitches } from './kit/figure';
import { BLOOD, BONE, EARTH, LAMP, LEAD, MOSS, NIGHT, RUST, SLATE, SNOW, SOOT, STONE, TALLOW, WOOD, type Tone } from './kit/palette';
import { poly, type Pt } from './kit/path';
import type { Thing } from './things';

const FIRE: Tone = { lit: LAMP.lit, mid: LAMP.mid };

/** A ragged flat patch round a point, wider than it is deep, as the floor is seen. */
function patch(d: Doc, name: string, rnd: { range(a: number, b: number): number }, cx: number, cy: number, r: number, color: string, opacity?: number): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const k = r * rnd.range(0.6, 1.1);
    pts.push([cx + Math.cos(a) * k * 1.6, cy + Math.sin(a) * k * 0.66]);
  }
  d.flat(name, poly(pts), color, opacity);
}

/** Flags laid in rows, as a floor of stone is: each its own tone, some cracked, some gone. */
function flags(d: Doc, name: string, width: number, height: number, tone: Tone, rnd: { range(a: number, b: number): number }, size = 120): void {
  for (let y = 0, row = 0; y < height; y += size * 0.62, row++) {
    for (let x = row % 2 === 0 ? 0 : -size / 2; x < width; x += size) {
      const r = rnd.range(0, 1);
      if (r < 0.12) continue;
      const j = (): number => rnd.range(-5, 5);
      const g = 6;
      d.flat(`${name}-${row}-${Math.round(x)}`, poly([[x + g + j(), y + g + j()], [x + size - g + j(), y + g + j()], [x + size - g + j(), y + size * 0.62 - g + j()], [x + g + j(), y + size * 0.62 - g + j()]]), r < 0.5 ? tone.mid : tone.lit, r < 0.5 ? 1 : 0.5);
      if (r > 0.86) d.strokes(`${name}-crack-${row}-${Math.round(x)}`, [[[x + size * 0.3, y + 8], [x + size * 0.5, y + size * 0.3]], [[x + size * 0.5, y + size * 0.3], [x + size * 0.4, y + size * 0.56]]], 2, tone === STONE ? EARTH.mid : SOOT.mid);
    }
  }
}

// ================================================================== the cellar

/** The cellar floor: packed earth and old flags, wine long spilt, her thread lying across it, rubble. */
export function cellarGround(width: number, height: number): Doc {
  const d = new Doc('cellar-ground');
  const rnd = dice(`cellar-${width}-${height}`);
  const area = (width * height) / (1400 * 1000);
  d.flat('earth', poly([[0, 0], [width, 0], [width, height], [0, height]]), EARTH.mid);
  flags(d, 'flag', width, height, STONE, rnd, 130);
  for (let i = 0; i < Math.round(14 * area); i++) patch(d, `earth-${i}`, rnd, rnd.range(0, width), rnd.range(0, height), rnd.range(50, 140), EARTH.mid);
  for (let i = 0; i < Math.round(6 * area); i++) patch(d, `wine-${i}`, rnd, rnd.range(0, width), rnd.range(0, height), rnd.range(30, 80), BLOOD.mid, 0.5);
  // Her thread, laid down in long strands from wall to wall.
  for (let i = 0; i < Math.round(14 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    const a = rnd.range(0, Math.PI);
    const l = rnd.range(120, 320);
    d.strokes(`thread-${i}`, [[[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l * 0.5]]], 1.6, BONE.mid);
  }
  for (let i = 0; i < Math.round(40 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    d.flat(`rubble-${i}`, poly([[x - 8, y + 2], [x - 3, y - 6], [x + 7, y - 4], [x + 6, y + 4], [x - 4, y + 6]]), i % 3 === 0 ? RUST.mid : STONE.mid);
  }
  for (let i = 0; i < Math.round(20 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    d.flat(`bones-${i}`, poly([[x, y], [x + 14, y - 3], [x + 15, y], [x + 1, y + 3]]), BONE.mid);
  }
  return d;
}

/** A rack of wine casks against the dark, three high, her thread wound through it, one cask staved in. */
function caskRack(d: Doc): void {
  d.blot('blot', poly([[0, 236], [250, 228], [260, 244], [10, 250]]));
  d.ink('rack', poly([[10, 240], [14, 40], [246, 34], [250, 236]]), WOOD, {
    dark: poly([[0, 150], ...cut([0, 150], [260, 140], 'rack-dark', 1, 6), [260, 260], [0, 260]]),
    mid: 4,
    inner: (c) => c.detail('posts', [[[90, 40], [92, 238]], [[170, 38], [172, 236]]], WOOD, 3),
  });
  const cask = (n: string, x: number, y: number, broken = false): void => {
    d.ink(n, poly([[x - 34, y - 30], [x + 34, y - 30], [x + 38, y], [x + 34, y + 30], [x - 34, y + 30], [x - 38, y]]), WOOD, {
      dark: 0.4, mid: 3, rim: 1.4,
      inner: (c) => {
        c.flat(`${n}-hoop-a`, poly([[x - 22, y - 30], [x - 16, y - 30], [x - 16, y + 30], [x - 22, y + 30]]), LEAD.mid);
        c.flat(`${n}-hoop-b`, poly([[x + 16, y - 30], [x + 22, y - 30], [x + 22, y + 30], [x + 16, y + 30]]), LEAD.mid);
        if (broken) c.black(`${n}-hole`, poly([[x - 8, y - 14], [x + 10, y - 20], [x + 14, y + 6], [x - 4, y + 14], [x - 12, y]]));
      },
    });
    d.ink(`${n}-end`, poly([[x + 30, y - 24], [x + 40, y - 18], [x + 42, y + 18], [x + 32, y + 24]]), WOOD, { dark: 0.3, mid: 0, line: 1.6, heavy: 2 });
  };
  cask('cask-a', 52, 76);
  cask('cask-b', 130, 74, true);
  cask('cask-c', 208, 72);
  cask('cask-d', 52, 146);
  cask('cask-e', 208, 142);
  cask('cask-f', 130, 210);
  d.black('gap', poly([[96, 116], [166, 114], [166, 176], [96, 178]]));
  d.flat('spilt', poly([[110, 232], [180, 230], [200, 244], [100, 246]]), BLOOD.mid, 0.7);
  // Her thread through all of it.
  d.strokes('web', [[[14, 40], [92, 120]], [[92, 120], [246, 34]], [[60, 40], [90, 120]], [[92, 120], [130, 36]], [[92, 120], [200, 180]], [[30, 200], [92, 120]]], 1.8, BONE.lit);
}

/** A brick pillar holding up the vault, bellied and cracked, wound thick with her thread at its foot. */
function cellarPillar(d: Doc): void {
  d.blot('blot', poly([[10, 300], [110, 294], [120, 306], [14, 310]]));
  d.ink('pillar', poly([[24, 304], [30, 40], [20, 0], [104, 0], [96, 40], [100, 304]]), RUST, {
    dark: poly([[0, 0], [50, 0], ...cut([50, 0], [54, 310], 'pillar-dark', -1, 5), [0, 310]]),
    mid: 6, cold: 2,
    inner: (c) => {
      for (let y = 20; y < 300; y += 24) c.detail(`course-${y}`, [[[26, y], [100, y - 2]]], RUST, 2);
      c.detail('joints', stitches([30, 40], [96, 250], 9, 10, 0), RUST, 2);
      c.flat('damp', poly([[60, 200], [98, 196], [100, 300], [58, 300]]), MOSS.mid, 0.7);
    },
  });
  d.ink('web-wrap', poly([[16, 304], [20, 230], [60, 210], [108, 226], [110, 304]]), BONE, {
    dark: 0.4, mid: 3, cold: 1.6,
    inner: (c) => c.detail('wrap-turns', [[[20, 280], [108, 262]], [[20, 256], [108, 240]], [[22, 236], [100, 222]]], BONE, 2),
  });
  d.ink('wrapped', poly([[70, 270], [78, 236], [96, 232], [100, 272]]), BONE, { dark: 0.5, mid: 0, line: 1.6, heavy: 2 });
}

/** Casks broken open in a heap, the staves sprung, a hoop rolled off. */
function brokenCasks(d: Doc): void {
  d.blot('blot', poly([[0, 120], [200, 114], [210, 130], [6, 134]]));
  d.ink('cask', poly([[20, 120], [24, 70], [80, 60], [120, 70], [126, 120]]), WOOD, { dark: 0.4, mid: 3, inner: (c) => c.black('open', poly([[60, 74], [110, 76], [104, 110], [62, 108]])) });
  for (const [i, [x, y, l, a]] of ([[130, 120, 70, -0.4], [150, 116, 60, -0.9], [40, 122, 50, -2.5], [170, 122, 40, -0.2]] as Array<[number, number, number, number]>).entries()) {
    const b: Pt = [x + Math.cos(a) * l, y + Math.sin(a) * l];
    d.ink(`stave-${i}`, limb([x, y], b, 7, 6), WOOD, { dark: limbDark([x, y], b, 7, 7, `stave-${i}`, 0.4), mid: 0, line: 1.6, heavy: 2 });
  }
  d.ink('hoop', poly([[150, 90], [184, 84], [196, 104], [186, 124], [160, 126], [148, 110], [156, 110], [164, 118], [182, 116], [188, 104], [180, 92], [158, 98]]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.2 });
  d.flat('wine', poly([[30, 124], [110, 120], [150, 130], [40, 134]]), BLOOD.mid, 0.8);
}

/** The vaults going away into the dark: arches of brick, one after another. */
function farVaults(d: Doc): void {
  d.flat('back', poly([[0, 0], [470, 0], [470, 250], [0, 250]]), NIGHT.mid);
  for (const [i, x] of [0, 120, 240, 360].entries()) {
    d.flat(`pier-${i}`, poly([[x, 250], [x, 90], [x + 30, 60], [x + 90, 60], [x + 120, 90], [x + 120, 250], [x + 96, 250], [x + 96, 110], [x + 80, 86], [x + 40, 86], [x + 24, 110], [x + 24, 250]]), NIGHT.lit);
    d.black(`deep-${i}`, poly([[x + 36, 250], [x + 36, 120], [x + 50, 104], [x + 70, 104], [x + 84, 120], [x + 84, 250]]));
  }
  d.strokes('far-web', [[[60, 90], [140, 140]], [[180, 70], [250, 120]], [[300, 100], [420, 90]]], 1.4, NIGHT.lit);
}

/** A flat for the front: a beam, a sagging web hung from it with something wrapped in it, rubble. */
function cellarFlat(d: Doc): void {
  d.black('ground', poly([[0, 300], [0, 262], [60, 256], [140, 266], [220, 254], [300, 262], [300, 300]]));
  d.black('beam', poly([[0, 20], [300, 10], [300, 40], [0, 50]]));
  d.black('post', poly([[30, 40], [56, 40], [60, 264], [26, 264]]));
  d.strokes('web', [[[56, 50], [200, 160]], [[100, 46], [200, 160]], [[160, 42], [200, 160]], [[240, 36], [200, 160]], [[290, 34], [200, 160]], [[70, 100], [270, 90]], [[110, 130], [250, 130]]], 3);
  d.black('wrapped', poly([[180, 150], [200, 140], [220, 156], [222, 220], [204, 240], [184, 226]]));
}

// ================================================================== the abbey

/** The abbey floor: its flags under a hand of water, weed in the cracks, the water lying deeper in pools. */
export function abbeyGround(width: number, height: number): Doc {
  const d = new Doc('abbey-ground');
  const rnd = dice(`abbey-${width}-${height}`);
  const area = (width * height) / (1400 * 1000);
  d.flat('water', poly([[0, 0], [width, 0], [width, height], [0, height]]), SLATE.mid);
  flags(d, 'flag', width, height, STONE, rnd, 140);
  // Water over all of it, darker where it is deep, and pale where the light lies on it.
  d.flat('wet', poly([[0, 0], [width, 0], [width, height], [0, height]]), SLATE.mid, 0.45);
  for (let i = 0; i < Math.round(10 * area); i++) patch(d, `deep-${i}`, rnd, rnd.range(0, width), rnd.range(0, height), rnd.range(70, 170), NIGHT.mid, 0.6);
  for (let i = 0; i < Math.round(30 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    d.strokes(`ripple-${i}`, [[[x, y], [x + rnd.range(30, 70), y + rnd.range(-3, 3)]]], 2, SLATE.lit);
  }
  for (let i = 0; i < Math.round(36 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    d.strokes(`weed-${i}`, [[[x, y], [x + 8, y - 22]], [[x + 4, y], [x - 6, y - 18]], [[x + 6, y], [x + 18, y - 12]]], 2.6, i % 2 ? MOSS.mid : MOSS.lit);
  }
  for (let i = 0; i < Math.round(16 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    d.flat(`shell-${i}`, poly([[x - 4, y], [x, y - 4], [x + 4, y], [x, y + 3]]), BONE.mid);
  }
  return d;
}

/** A pier of the nave fallen across the floor: drums of stone, weed on them, a carved capital. */
function fallenColumn(d: Doc): void {
  d.blot('blot', poly([[0, 120], [320, 108], [330, 124], [6, 134]]));
  const drum = (n: string, x: number, w: number, y: number): void => {
    d.ink(n, poly([[x, y + 50], [x + 4, y], [x + w, y - 6], [x + w + 6, y + 44]]), STONE, {
      dark: poly([[x - 10, y + 26], ...cut([x - 10, y + 26], [x + w + 10, y + 20], `${n}-dark`, 1, 4), [x + w + 10, y + 60], [x - 10, y + 60]]),
      mid: 4, cold: 1.8,
      inner: (c) => c.flat(`${n}-weed`, poly([[x + 10, y + 2], [x + w * 0.6, y - 2], [x + w * 0.5, y + 12], [x + 14, y + 14]]), MOSS.mid),
    });
    d.ink(`${n}-end`, poly([[x + w, y - 6], [x + w + 14, y + 4], [x + w + 18, y + 40], [x + w + 6, y + 44]]), STONE, { dark: 0.3, mid: 0, line: 1.6, heavy: 2 });
  };
  drum('drum-a', 10, 80, 66);
  drum('drum-b', 110, 70, 62);
  drum('drum-c', 196, 60, 58);
  d.ink('capital', poly([[262, 50], [306, 40], [318, 64], [314, 104], [272, 112], [260, 96]]), STONE, {
    dark: 0.4, mid: 3, cold: 1.6,
    inner: (c) => c.detail('carving', [[[276, 60], [300, 54]], [[280, 72], [304, 66]], [[290, 84], [306, 96]]], STONE, 2),
  });
  d.flat('water-line', poly([[0, 116], [320, 104], [320, 112], [0, 124]]), SLATE.lit, 0.7);
}

/** A pew rotted in the water, its back broken, weed hanging off it. */
function pew(d: Doc): void {
  d.blot('blot', poly([[0, 120], [200, 114], [206, 128], [4, 132]]));
  d.ink('back', poly([[16, 116], [18, 30], [120, 24], [130, 50], [150, 46], [188, 60], [190, 112]]), WOOD, {
    dark: poly([[0, 80], ...cut([0, 80], [200, 70], 'pew-dark', 1, 5), [200, 140], [0, 140]]),
    mid: 4,
    inner: (c) => {
      c.detail('boards', [[[18, 50], [186, 66]], [[18, 76], [188, 86]]], WOOD, 2.4);
      c.flat('weed-a', poly([[40, 30], [60, 28], [56, 70], [46, 80]]), MOSS.mid);
      c.flat('weed-b', poly([[150, 50], [170, 56], [166, 96]]), MOSS.mid);
    },
  });
  d.ink('end', poly([[6, 120], [8, 20], [26, 16], [30, 120]]), WOOD, { dark: 0.4, mid: 2, line: 2, heavy: 2.6, inner: (c) => c.detail('carved', [[[14, 26], [22, 40]]], WOOD, 2) });
  d.flat('water', poly([[0, 108], [206, 100], [206, 112], [0, 120]]), SLATE.lit, 0.7);
}

/** The font: a deep stone bowl on a stem, full, a candle stub burning on its rim. */
function font(d: Doc): void {
  d.blot('blot', poly([[10, 200], [130, 194], [140, 206], [14, 210]]));
  d.ink('stem', poly([[50, 200], [54, 110], [90, 110], [96, 200]]), STONE, { dark: 0.5, mid: 3, cold: 1.6, inner: (c) => c.flat('moss', poly([[56, 160], [92, 156], [94, 200], [52, 200]]), MOSS.mid) });
  d.ink('base', poly([[30, 206], [36, 190], [110, 186], [118, 204]]), STONE, { dark: 0.4, mid: 2 });
  d.ink('bowl', poly([[6, 60], [140, 54], [128, 104], [96, 118], [50, 120], [18, 106]]), STONE, {
    dark: poly([[0, 86], ...cut([0, 86], [150, 80], 'font-dark', 1, 4), [150, 130], [0, 130]]),
    mid: 4, cold: 2,
    inner: (c) => c.detail('carving', stitches([24, 82], [124, 78], 8, 12, 0.6), STONE, 2),
  });
  d.ink('water', poly([[14, 60], [132, 54], [124, 64], [20, 70]]), SLATE, { dark: false, line: 1.6, heavy: 2, inner: (c) => c.strokes('shine', [[[60, 60], [100, 58]]], 2, SNOW.lit) });
  d.ink('stub', poly([[110, 40], [122, 40], [122, 58], [110, 58]]), TALLOW, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('flame', poly([[112, 40], [116, 22], [120, 40]]), FIRE, { dark: false, line: 1.2, heavy: 1.6, inner: (c) => c.flat('heart', poly([[114.5, 39], [116, 30], [117.5, 39]]), LAMP.hot) });
}

/** The abbey beyond the water: its nave roofless, tall windows empty, the tower leaning, the water up its walls. */
function farAbbey(d: Doc): void {
  d.flat('back', poly([[0, 120], [470, 110], [470, 250], [0, 250]]), NIGHT.mid);
  d.flat('nave', poly([[40, 250], [40, 110], [80, 70], [120, 110], [120, 90], [200, 90], [200, 110], [240, 70], [280, 110], [280, 250]]), NIGHT.lit);
  for (const [i, x] of [60, 140, 220].entries()) d.black(`window-${i}`, poly([[x, 220], [x, 140], [x + 10, 118], [x + 20, 140], [x + 20, 220]]));
  d.flat('tower', poly([[320, 250], [322, 60], [340, 20], [360, 24], [376, 64], [370, 250]]), NIGHT.lit);
  d.flat('tower-shade', poly([[320, 250], [322, 60], [340, 20], [344, 250]]), NIGHT.mid);
  d.black('belfry', poly([[336, 70], [356, 70], [356, 104], [336, 104]]));
  d.flat('water', poly([[0, 210], [470, 204], [470, 250], [0, 250]]), SLATE.mid, 0.9);
  d.strokes('water-shine', [[[40, 216], [120, 214]], [[200, 220], [300, 218]], [[360, 214], [440, 212]]], 2, SLATE.lit);
}

/** A flat for the front: reeds, a broken arch standing out of the water. */
function abbeyFlat(d: Doc): void {
  d.black('ground', poly([[0, 300], [0, 266], [80, 260], [160, 270], [240, 258], [300, 266], [300, 300]]));
  d.black('arch', poly([[10, 266], [14, 90], [40, 40], [90, 12], [140, 14], [176, 40], [196, 76], [180, 84], [184, 70], [160, 50], [130, 38], [96, 40], [66, 62], [48, 100], [46, 266]]));
  d.black('jamb', poly([[180, 266], [182, 120], [196, 110], [214, 118], [216, 266]]));
  d.strokes('reeds', [[[160, 268], [150, 180]], [[170, 266], [176, 170]], [[180, 266], [196, 190]], [[240, 262], [232, 186]], [[250, 262], [262, 176]], [[262, 264], [282, 200]], [[100, 270], [92, 214]]], 6);
  d.black('reed-head', poly([[172, 168], [180, 168], [180, 194], [172, 194]]));
}

// ================================================================== the foundry

/** The foundry floor: black cinders packed hard, iron plates let into it, rails, old slag that still glows in its cracks. */
export function foundryGround(width: number, height: number): Doc {
  const d = new Doc('foundry-ground');
  const rnd = dice(`foundry-${width}-${height}`);
  const area = (width * height) / (1400 * 1000);
  d.flat('cinders', poly([[0, 0], [width, 0], [width, height], [0, height]]), SOOT.mid);
  for (let i = 0; i < Math.round(16 * area); i++) patch(d, `ash-${i}`, rnd, rnd.range(0, width), rnd.range(0, height), rnd.range(60, 160), EARTH.mid, 0.6);
  for (let i = 0; i < Math.round(8 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    const w = rnd.range(90, 160);
    d.flat(`plate-${i}`, poly([[x, y], [x + w, y - 4], [x + w + 4, y + w * 0.5], [x + 2, y + w * 0.52]]), SOOT.lit);
    for (const [k, [px, py]] of ([[x + 8, y + 6], [x + w - 6, y + 2], [x + w - 4, y + w * 0.46], [x + 10, y + w * 0.46]] as Pt[]).entries()) d.flat(`plate-${i}-bolt-${k}`, poly([[px - 3, py], [px, py - 3], [px + 3, py], [px, py + 3]]), LEAD.mid);
  }
  // Rails for the crucible carts, across the floor.
  for (let i = 0; i < Math.round(2 * area + 1); i++) {
    const y = rnd.range(height * 0.25, height * 0.75);
    const slope = rnd.range(-0.06, 0.06);
    for (let x = 10; x < width; x += 46) d.flat(`sleeper-${i}-${x}`, poly([[x, y + slope * x - 8], [x + 18, y + slope * x - 8], [x + 18, y + slope * x + 40], [x, y + slope * x + 40]]), WOOD.mid);
    d.flat(`rail-${i}-a`, poly([[0, y], [width, y + slope * width], [width, y + slope * width + 6], [0, y + 6]]), LEAD.mid);
    d.flat(`rail-${i}-b`, poly([[0, y + 26], [width, y + slope * width + 26], [width, y + slope * width + 32], [0, y + 32]]), LEAD.mid);
  }
  for (let i = 0; i < Math.round(10 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    d.flat(`slag-${i}`, poly([[x - 30, y], [x - 10, y - 12], [x + 24, y - 10], [x + 36, y + 4], [x + 6, y + 12], [x - 24, y + 10]]), SOOT.lit);
    d.strokes(`slag-${i}-glow`, [[[x - 14, y], [x + 4, y - 4]], [[x + 4, y - 4], [x + 20, y + 2]]], 2, LAMP.mid);
  }
  for (let i = 0; i < Math.round(50 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    d.flat(`coal-${i}`, poly([[x - 5, y + 2], [x - 2, y - 4], [x + 5, y - 2], [x + 4, y + 3]]), i % 5 === 0 ? RUST.mid : SOOT.lit);
  }
  return d;
}

/** A heap of coal and coke tipped against the wall, a shovel stood in it. */
function coalHeap(d: Doc): void {
  d.blot('blot', poly([[0, 150], [240, 142], [250, 158], [6, 164]]));
  d.ink('heap', poly([[4, 156], [40, 100], [90, 60], [140, 54], [190, 86], [230, 130], [244, 154]]), SOOT, {
    dark: poly([[0, 110], ...cut([0, 110], [250, 100], 'heap-dark', 1, 6), [250, 170], [0, 170]]),
    mid: 6, cold: 2,
    inner: (c) => c.detail('lumps', stitches([30, 120], [220, 110], 12, 10, 0.8), SOOT, 3),
  });
  d.ink('shovel-haft', limb([150, 70], [196, 0], 5, 5), WOOD, { dark: limbDark([150, 70], [196, 0], 5, 5, 'shovel', 0.4), mid: 0, line: 1.6, heavy: 2 });
  d.ink('shovel-blade', poly([[134, 66], [160, 62], [162, 92], [140, 96]]), LEAD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
}

/** A rack of ingot moulds and finished bars, iron on iron, stacked crossways. */
function mouldRack(d: Doc): void {
  d.blot('blot', poly([[0, 150], [210, 144], [220, 158], [6, 162]]));
  d.ink('rack', poly([[10, 154], [12, 40], [200, 34], [204, 150]]), LEAD, {
    dark: poly([[0, 90], ...cut([0, 90], [210, 84], 'mould-dark', 1, 5), [210, 170], [0, 170]]),
    mid: 3, rim: 2,
  });
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k < 4; k++) {
      const x = 22 + k * 44;
      const y = 50 + r * 26;
      d.ink(`bar-${r}-${k}`, poly([[x, y], [x + 36, y - 2], [x + 38, y + 16], [x + 2, y + 18]]), r % 2 === 0 ? LEAD : RUST, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
    }
  }
  d.flat('hot-bar', poly([[68, 128], [102, 126], [104, 140], [70, 142]]), LAMP.mid);
}

/** A hoist: a timber post and jib with a chain and a great hook hanging, a crucible on it. */
function hoist(d: Doc): void {
  d.blot('blot', poly([[0, 316], [140, 310], [150, 324], [6, 330]]));
  d.ink('post', poly([[20, 320], [26, 10], [52, 10], [56, 320]]), WOOD, { dark: 0.45, mid: 4, inner: (c) => c.detail('grain', [[[36, 40], [38, 300]]], WOOD, 2.4) });
  d.ink('jib', poly([[26, 20], [190, 12], [194, 32], [30, 44]]), WOOD, { dark: 0.4, mid: 3 });
  d.ink('brace', limb([40, 120], [130, 30], 7, 7), WOOD, { dark: limbDark([40, 120], [130, 30], 7, 7, 'brace', 0.4), mid: 0, line: 1.6, heavy: 2 });
  chain(d, 'chain', [176, 30], [176, 180], 8);
  d.ink('crucible', poly([[140, 186], [212, 184], [204, 240], [190, 252], [160, 252], [146, 240]]), LEAD, {
    dark: 0.42, mid: 3, rim: 2,
    inner: (c) => c.flat('crucible-rust', poly([[150, 220], [200, 218], [196, 240], [156, 242]]), RUST.mid),
  });
  d.ink('crucible-lip', poly([[134, 180], [218, 178], [214, 192], [138, 194]]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.2, inner: (c) => c.flat('melt', poly([[144, 182], [208, 180], [206, 188], [146, 190]]), LAMP.lit) });
  rivets(d, 'bolts', [146, 200], [206, 198], 5, 2.4);
}

/** The foundry's back wall: brick kilns with their mouths glowing, a great chimney, the roof gone to beams. */
function farFoundry(d: Doc): void {
  d.flat('back', poly([[0, 40], [470, 40], [470, 250], [0, 250]]), NIGHT.mid);
  d.flat('chimney', poly([[360, 250], [370, 0], [410, 0], [420, 250]]), NIGHT.lit);
  for (const [i, x] of [20, 140, 250].entries()) {
    d.flat(`kiln-${i}`, poly([[x, 250], [x, 150], [x + 20, 120], [x + 70, 110], [x + 100, 130], [x + 100, 250]]), NIGHT.lit);
    d.flat(`mouth-${i}`, poly([[x + 30, 250], [x + 30, 200], [x + 50, 186], [x + 70, 200], [x + 70, 250]]), i === 1 ? LAMP.mid : RUST.mid);
  }
  d.strokes('beams', [[[0, 60], [470, 40]], [[80, 60], [140, 0]], [[260, 50], [200, 0]]], 5, NIGHT.lit);
}

/** A flat for the front: hanging chains with a hook, a beam, and a tipped crucible. */
function foundryFlat(d: Doc): void {
  d.black('ground', poly([[0, 300], [0, 262], [100, 256], [180, 266], [300, 256], [300, 300]]));
  d.black('beam', poly([[0, 0], [300, 0], [300, 26], [0, 30]]));
  for (const [i, x] of [60, 120, 230].entries()) d.strokes(`chain-${i}`, [[[x, 26], [x + 2, 100 + i * 40]]], 6);
  d.black('hook', poly([[116, 180], [130, 180], [134, 210], [120, 230], [104, 222], [100, 206], [110, 212], [122, 206]]));
  d.black('crucible', poly([[180, 262], [196, 220], [250, 214], [270, 236], [262, 262]]));
}

// ================================================================== the hall

/** The hall's floor: a floor of black and pale squares gone dull, glass broken over it, frames dropped. */
export function hallGround(width: number, height: number): Doc {
  const d = new Doc('hall-ground');
  const rnd = dice(`hall-${width}-${height}`);
  const area = (width * height) / (1400 * 1000);
  d.flat('floor', poly([[0, 0], [width, 0], [width, height], [0, height]]), SOOT.mid);
  const s = 110;
  for (let y = 0, row = 0; y < height; y += s * 0.62, row++) {
    for (let x = 0, col = 0; x < width; x += s, col++) {
      if ((row + col) % 2 === 0) d.flat(`tile-${row}-${col}`, poly([[x + 2, y + 2], [x + s - 2, y + 2], [x + s - 2, y + s * 0.62 - 2], [x + 2, y + s * 0.62 - 2]]), STONE.mid);
    }
  }
  for (let i = 0; i < Math.round(10 * area); i++) patch(d, `dust-${i}`, rnd, rnd.range(0, width), rnd.range(0, height), rnd.range(60, 160), EARTH.mid, 0.4);
  // Glass: splinters lying where they fell, catching the cold light.
  for (let i = 0; i < Math.round(90 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    const l = rnd.range(6, 18);
    d.flat(`glass-${i}`, poly([[x, y], [x + l, y - l * 0.3], [x + l * 0.6, y + 3]]), i % 3 === 0 ? SNOW.lit : SNOW.mid, 0.8);
  }
  for (let i = 0; i < Math.round(5 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    d.flat(`dropped-frame-${i}`, poly([[x, y], [x + 70, y - 6], [x + 74, y + 30], [x + 4, y + 36], [x + 4, y + 30], [x + 66, y + 24], [x + 64, y + 2], [x + 8, y + 8], [x + 8, y + 30], [x + 4, y + 30]]), WOOD.mid);
  }
  return d;
}

/** The mirror maker's bench: frames, a pane on the press, his tools, a candle. */
function bench(d: Doc): void {
  d.blot('blot', poly([[0, 150], [260, 144], [270, 158], [6, 164]]));
  for (const [i, x] of [20, 220].entries()) d.ink(`leg-${i}`, limb([x, 90], [x, 154], 9, 8), WOOD, { dark: limbDark([x, 90], [x, 154], 9, 9, `leg-${i}`, 0.5), mid: 0, line: 1.6, heavy: 2 });
  d.ink('top', poly([[6, 96], [250, 88], [256, 104], [8, 112]]), WOOD, { dark: 0.4, mid: 3, inner: (c) => c.detail('scars', [[[40, 98], [70, 96]], [[160, 94], [200, 92]]], WOOD, 2) });
  d.ink('pane', poly([[40, 86], [120, 82], [124, 40], [46, 44]]), SLATE, { dark: 0.3, mid: 0, line: 1.6, heavy: 2, inner: (c) => c.flat('pane-light', poly([[80, 46], [110, 44], [70, 84], [52, 84]]), SNOW.mid) });
  d.ink('frame', poly([[140, 88], [150, 20], [210, 16], [216, 84], [204, 84], [200, 30], [160, 32], [154, 88]]), WOOD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2, inner: (c) => c.flat('gilt', poly([[170, 22], [190, 20], [190, 26], [170, 28]]), RUST.lit) });
  d.ink('stub', poly([[226, 70], [236, 70], [236, 88], [226, 88]]), TALLOW, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
  d.ink('flame', poly([[228, 70], [231, 54], [234, 70]]), FIRE, { dark: false, line: 1.2, heavy: 1.6 });
  d.black('under', poly([[20, 112], [240, 104], [236, 140], [24, 144]]));
}

/** A crate of panes packed in straw, one standing out of it cracked. */
function paneCrate(d: Doc): void {
  d.blot('blot', poly([[0, 130], [150, 124], [156, 138], [4, 142]]));
  d.ink('crate', poly([[10, 136], [12, 60], [140, 54], [144, 130]]), WOOD, {
    dark: poly([[0, 100], ...cut([0, 100], [150, 94], 'crate-dark', 1, 4), [150, 150], [0, 150]]),
    mid: 4,
    inner: (c) => c.detail('slats', [[[12, 80], [142, 74]], [[12, 104], [142, 98]], [[14, 60], [140, 130]]], WOOD, 2.4),
  });
  d.strokes('straw', [[[20, 60], [14, 46]], [[40, 58], [44, 44]], [[110, 56], [104, 42]], [[130, 54], [138, 42]]], 2.4, TALLOW.mid);
  for (const [i, x] of [40, 70, 96].entries()) {
    d.ink(`pane-${i}`, poly([[x, 60], [x + 4, 4 + i * 8], [x + 24, 6 + i * 8], [x + 22, 60]]), SLATE, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8, inner: (c) => c.flat(`pane-${i}-light`, poly([[x + 8, 10 + i * 8], [x + 20, 12 + i * 8], [x + 10, 40]]), SNOW.mid) });
  }
  d.pen('crack', poly([[74, 20], [82, 34], [76, 50]], false), 1.6);
}

/** A pillar of the hall: dressed stone with a gilt band, a broken sconce on it. */
function hallPillar(d: Doc): void {
  d.blot('blot', poly([[10, 300], [100, 294], [110, 306], [14, 310]]));
  d.ink('pillar', poly([[24, 304], [26, 30], [16, 10], [96, 10], [86, 30], [90, 304]]), STONE, {
    dark: poly([[0, 0], [44, 0], ...cut([44, 0], [48, 310], 'hp-dark', -1, 4), [0, 310]]),
    mid: 6, cold: 2.4,
    inner: (c) => {
      c.detail('flutes', [[[48, 40], [48, 290]], [[64, 40], [64, 290]], [[78, 40], [78, 290]]], STONE, 2);
      c.flat('band', poly([[26, 120], [90, 118], [90, 132], [26, 134]]), RUST.lit);
    },
  });
  d.ink('cap', poly([[10, 12], [102, 8], [96, 0], [16, 2]]), STONE, { dark: 0.3, mid: 0, line: 1.6, heavy: 2 });
  d.ink('sconce', poly([[88, 160], [110, 150], [114, 162], [94, 172]]), LEAD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
}

/** The far wall of the hall: tall windows, frames hung in rows with nothing in them, a gallery. */
function farHall(d: Doc): void {
  d.flat('wall', poly([[0, 20], [470, 20], [470, 250], [0, 250]]), NIGHT.lit);
  for (const [i, x] of [30, 160, 290, 410].entries()) {
    d.flat(`window-${i}`, poly([[x, 200], [x, 70], [x + 20, 40], [x + 40, 70], [x + 40, 200]]), SLATE.mid);
    d.strokes(`window-${i}-bars`, [[[x + 20, 44], [x + 20, 200]], [[x, 120], [x + 40, 120]]], 3, NIGHT.mid);
  }
  for (const [i, x] of [90, 220, 350].entries()) {
    d.flat(`frame-${i}`, poly([[x, 160], [x, 90], [x + 46, 90], [x + 46, 160]]), NIGHT.mid);
    d.black(`frame-${i}-empty`, poly([[x + 8, 152], [x + 8, 98], [x + 38, 98], [x + 38, 152]]));
  }
  d.flat('gallery', poly([[0, 200], [470, 196], [470, 214], [0, 218]]), NIGHT.mid);
  d.flat('floor', poly([[0, 230], [470, 226], [470, 250], [0, 250]]), NIGHT.mid);
}

/** A flat for the front: a drape torn half down, and a great frame leant against nothing, empty. */
function hallFlat(d: Doc): void {
  d.black('ground', poly([[0, 300], [0, 262], [100, 258], [200, 266], [300, 258], [300, 300]]));
  d.black('drape', poly([[0, 0], [120, 0], [100, 60], [110, 140], [80, 200], [70, 150], [50, 230], [30, 170], [0, 210]]));
  d.black('frame', poly([[170, 262], [180, 60], [280, 50], [292, 262], [274, 262], [264, 72], [196, 78], [188, 262]]));
}

// ================================================================== on the field

/** Greta's anvil, as it lands and stays: a black iron anvil, square-shouldered, its horn to the right. */
function anvil(d: Doc): void {
  d.blot('blot', poly([[6, 104], [130, 98], [138, 112], [10, 114]]));
  d.ink('foot', poly([[24, 108], [30, 84], [110, 80], [118, 106]]), LEAD, { dark: 0.45, mid: 2, rim: 1.6 });
  d.ink('waist', poly([[44, 84], [50, 56], [92, 54], [96, 82]]), LEAD, { dark: 0.5, mid: 0, line: 1.8, heavy: 2.4 });
  d.ink('face', poly([[8, 58], [10, 36], [104, 32], [150, 30], [128, 46], [104, 52], [104, 58]]), LEAD, {
    dark: poly([[0, 48], [160, 42], [160, 70], [0, 70]]), mid: 3, rim: 2,
    inner: (c) => c.strokes('worn', [[[20, 38], [96, 34]]], 2.4, LEAD.lit),
  });
  d.black('hardy-hole', poly([[20, 40], [28, 40], [28, 46], [20, 46]]));
  d.flat('dust', poly([[0, 110], [30, 100], [40, 112], [110, 108], [140, 100], [150, 114], [0, 118]]), EARTH.mid, 0.8);
}

/** Ned's powder keg, thrown down and waiting: on its side, the burnt mark on it, its fuse spitting. */
function powderKeg(d: Doc): void {
  d.blot('blot', poly([[6, 62], [60, 56], [80, 62], [64, 70], [12, 70]]));
  d.ink('keg', poly([[14, 26], [60, 22], [72, 40], [66, 62], [18, 66], [8, 46]]), WOOD, {
    dark: 0.3, mid: 3,
    inner: (c) => {
      c.flat('hoop-a', poly([[22, 22], [28, 22], [26, 66], [20, 66]]), LEAD.mid);
      c.flat('hoop-b', poly([[52, 20], [58, 20], [60, 64], [54, 64]]), LEAD.mid);
      c.strokes('mark', [[[34, 34], [46, 52]], [[46, 34], [34, 52]]], 3, SOOT.mid);
    },
  });
  d.pen('fuse', poly([[66, 34], [78, 26], [80, 14]], false), 2.6);
  d.ink('spark', poly([[80, 2], [84, 9], [92, 6], [87, 13], [94, 18], [85, 17], [82, 24], [79, 16], [72, 16], [78, 11]]), FIRE, { dark: false, line: 1.4, heavy: 1.8, inner: (c) => c.flat('spark-hot', poly([[81, 10], [84, 12], [82, 15]]), LAMP.hot) });
}

/** A web on the floor, where her spit landed: seen from above as the floor is, a round of it with its spokes. */
function web(d: Doc): void {
  const c: Pt = [64, 40];
  const ring = (r: number): Pt[] => Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + 0.2;
    const k = r * (0.86 + 0.14 * Math.sin(i * 2.3));
    return [c[0] + Math.cos(a) * k * 1.6, c[1] + Math.sin(a) * k * 0.62] as Pt;
  });
  d.flat('shade', poly(ring(38)), SOOT.mid, 0.35);
  const outer = ring(38);
  d.strokes('spokes', outer.map((p): [Pt, Pt] => [c, p]), 1.8, BONE.lit);
  for (const r of [12, 22, 32]) {
    const pts = ring(r);
    d.strokes(`round-${r}`, pts.map((p, i): [Pt, Pt] => [p, pts[(i + 1) % pts.length]]), 1.6, BONE.mid);
  }
  d.flat('knot', poly([[c[0] - 5, c[1]], [c[0], c[1] - 3], [c[0] + 5, c[1]], [c[0], c[1] + 3]]), BONE.lit);
}

/** Light left on the ground behind Ida's lantern: a soft-edged patch, as the game lays it and lets it fade. */
function wakeLight(d: Doc): void {
  d.flat('outer', poly([[4, 30], [24, 12], [64, 4], [104, 12], [124, 30], [104, 48], [64, 56], [24, 48]]), LAMP.mid, 0.35);
  d.flat('inner', poly([[24, 30], [40, 18], [64, 14], [88, 18], [104, 30], [88, 42], [64, 46], [40, 42]]), LAMP.lit, 0.45);
  d.flat('heart', poly([[46, 30], [56, 24], [72, 24], [82, 30], [72, 36], [56, 36]]), LAMP.hot, 0.5);
}

/** An egg sac burst: its skin split and fallen open, wet, empty, thread round it. */
function sacBurst(d: Doc): void {
  d.blot('blot', poly([[6, 84], [150, 78], [160, 92], [10, 96]]));
  d.strokes('nest', [[[0, 90], [40, 64]], [[160, 90], [120, 64]], [[20, 94], [80, 80]]], 2, BONE.mid);
  d.ink('skin-a', poly([[20, 88], [26, 56], [50, 40], [70, 54], [60, 70], [70, 88]]), BONE, { dark: 0.45, mid: 3, inner: (c) => c.strokes('veins-a', [[[34, 54], [40, 80]]], 2, BLOOD.mid) });
  d.ink('skin-b', poly([[90, 88], [96, 60], [120, 44], [142, 60], [140, 88]]), BONE, { dark: 0.45, mid: 3, inner: (c) => c.strokes('veins-b', [[[118, 54], [124, 82]]], 2, BLOOD.mid) });
  d.black('inside', poly([[60, 90], [66, 66], [96, 64], [100, 90]]));
  d.flat('wet', poly([[40, 94], [130, 90], [140, 100], [30, 102]]), MOSS.mid, 0.6);
}

/** A water barrel broken: staves sprung, hoops off, the water run out across the floor. */
function barrelBroken(d: Doc): void {
  d.flat('water', poly([[0, 70], [40, 54], [120, 52], [180, 66], [170, 86], [90, 96], [20, 90]]), SLATE.lit, 0.7);
  d.blot('blot', poly([[30, 82], [140, 76], [150, 90], [34, 94]]));
  d.ink('stump', poly([[50, 84], [52, 50], [64, 40], [74, 52], [88, 36], [100, 50], [112, 44], [116, 84]]), WOOD, { dark: 0.4, mid: 3, inner: (c) => c.flat('hoop', poly([[50, 72], [116, 70], [116, 78], [50, 80]]), LEAD.mid) });
  for (const [i, [x, y, l, a]] of ([[120, 84], [40, 86], [150, 72], [20, 74]].map(([x, y], k) => [x, y, 40 - k * 4, [-0.3, -2.8, -0.9, -2.2][k]]) as Array<[number, number, number, number]>).entries()) {
    const b: Pt = [x + Math.cos(a) * l, y + Math.sin(a) * l];
    d.ink(`stave-${i}`, limb([x, y], b, 6, 5), WOOD, { dark: limbDark([x, y], b, 6, 6, `bstave-${i}`, 0.4), mid: 0, line: 1.6, heavy: 2 });
  }
  d.ink('hoop-off', poly([[150, 50], [176, 46], [184, 60], [172, 72], [150, 70], [158, 66], [170, 64], [174, 58], [168, 52], [156, 56]]), LEAD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
}

/** A tall mirror broken: the frame stood empty and crooked, the glass in pieces at its foot. */
function mirrorBroken(d: Doc): void {
  d.blot('blot', poly([[20, 244], [150, 238], [160, 252], [24, 256]]));
  d.ink('frame', poly([[30, 240], [26, 50], [44, 20], [80, 10], [116, 20], [134, 50], [130, 240], [116, 240], [118, 60], [104, 36], [80, 28], [56, 36], [42, 60], [44, 240]]), WOOD, {
    dark: poly([[0, 0], [60, 0], ...cut([60, 0], [64, 260], 'mb-dark', -1, 6), [0, 260]]), mid: 3, rim: 1.6,
  });
  d.black('empty', poly([[44, 236], [42, 60], [56, 36], [80, 28], [104, 36], [118, 60], [116, 236]]));
  // What is left in the frame: teeth of glass round the edge.
  d.ink('teeth', poly([[44, 60], [60, 70], [50, 90], [44, 120]]), SLATE, { dark: false, line: 1.4, heavy: 1.8, inner: (c) => c.flat('teeth-light', poly([[46, 66], [56, 72], [48, 86]]), SNOW.mid) });
  d.ink('teeth-b', poly([[104, 36], [116, 60], [100, 56], [96, 46]]), SLATE, { dark: false, line: 1.4, heavy: 1.8 });
  for (const [i, [x, y, l]] of ([[50, 246, 26], [86, 250, 34], [120, 244, 22], [150, 252, 18], [20, 252, 16]] as Array<[number, number, number]>).entries()) {
    d.ink(`piece-${i}`, poly([[x, y], [x + l, y - l * 0.3], [x + l * 0.7, y + 4]]), SLATE, { dark: false, line: 1.4, heavy: 1.8, inner: (c) => c.flat(`piece-${i}-light`, poly([[x + 3, y - 1], [x + l * 0.6, y - l * 0.2], [x + l * 0.4, y + 1]]), SNOW.lit) });
  }
}

/** The abbey's shallows: deeper water lying on the floor, with its edge, ripples and weed. Seen from above, at its size in the rules (r 112 is 224 across). */
function shallows(d: Doc): void {
  const rnd = dice('shallows');
  const pts: Pt[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const k = 112 * rnd.range(0.92, 1.04);
    pts.push([120 + Math.cos(a) * k, 80 + Math.sin(a) * k * 0.62]);
  }
  d.flat('edge', poly(pts), SLATE.lit, 0.6);
  d.flat('deep', poly(pts.map(([x, y]): Pt => [120 + (x - 120) * 0.9, 80 + (y - 80) * 0.88])), NIGHT.mid, 0.75);
  d.strokes('ripples', [[[60, 70], [110, 68]], [[130, 96], [190, 94]], [[80, 110], [120, 112]], [[150, 50], [180, 52]]], 2, SLATE.lit);
  d.strokes('weed', [[[40, 90], [48, 70]], [[44, 92], [34, 74]], [[196, 74], [206, 56]], [[200, 76], [190, 60]]], 2.4, MOSS.lit);
}

/** Poured iron, run out across the floor in a lane: bright at its heart, crusting black at its edges. */
function pouredIron(d: Doc): void {
  d.flat('crust', poly([[0, 20], [60, 8], [140, 14], [220, 6], [260, 20], [250, 44], [180, 50], [100, 44], [20, 50]]), SOOT.lit);
  d.ink('melt', poly([[10, 26], [70, 16], [140, 22], [220, 14], [248, 26], [230, 38], [160, 40], [90, 36], [24, 42]]), FIRE, { dark: false, line: 1.6, heavy: 2, inner: (c) => c.flat('heart', poly([[40, 28], [120, 24], [200, 22], [230, 28], [170, 32], [90, 32]]), LAMP.hot) });
  d.flat('skin-a', poly([[60, 24], [90, 22], [84, 30], [62, 30]]), SOOT.mid, 0.7);
  d.flat('skin-b', poly([[170, 26], [200, 22], [196, 30], [174, 32]]), SOOT.mid, 0.7);
}

export const DEEP: Thing[] = [
  { id: 'cask-rack', set: 'cellar', width: 260, height: 256, origin: [130, 240], draw: caskRack },
  { id: 'cellar-pillar', set: 'cellar', width: 124, height: 314, origin: [62, 304], draw: cellarPillar },
  { id: 'broken-casks', set: 'cellar', width: 214, height: 140, origin: [100, 124], draw: brokenCasks },
  { id: 'far-vaults', set: 'cellar', width: 470, height: 250, origin: [235, 250], draw: farVaults },
  { id: 'cellar-flat', set: 'cellar', width: 300, height: 300, origin: [150, 300], draw: cellarFlat },
  { id: 'fallen-column', set: 'abbey', width: 330, height: 136, origin: [160, 120], draw: fallenColumn },
  { id: 'pew', set: 'abbey', width: 210, height: 134, origin: [100, 120], draw: pew },
  { id: 'font', set: 'abbey', width: 150, height: 212, origin: [72, 204], draw: font },
  { id: 'shallows', set: 'abbey', width: 240, height: 160, origin: [120, 80], draw: shallows },
  { id: 'far-abbey', set: 'abbey', width: 470, height: 250, origin: [235, 250], draw: farAbbey },
  { id: 'abbey-flat', set: 'abbey', width: 300, height: 300, origin: [150, 300], draw: abbeyFlat },
  { id: 'coal-heap', set: 'foundry', width: 250, height: 166, origin: [124, 156], draw: coalHeap },
  { id: 'mould-rack', set: 'foundry', width: 220, height: 164, origin: [106, 152], draw: mouldRack },
  { id: 'hoist', set: 'foundry', width: 224, height: 332, origin: [40, 320], draw: hoist },
  { id: 'poured-iron', set: 'foundry', width: 262, height: 56, origin: [130, 28], draw: pouredIron },
  { id: 'far-foundry', set: 'foundry', width: 470, height: 250, origin: [235, 250], draw: farFoundry },
  { id: 'foundry-flat', set: 'foundry', width: 300, height: 300, origin: [150, 300], draw: foundryFlat },
  { id: 'bench', set: 'hall', width: 270, height: 166, origin: [130, 154], draw: bench },
  { id: 'pane-crate', set: 'hall', width: 158, height: 144, origin: [76, 132], draw: paneCrate },
  { id: 'hall-pillar', set: 'hall', width: 116, height: 314, origin: [58, 304], draw: hallPillar },
  { id: 'far-hall', set: 'hall', width: 470, height: 250, origin: [235, 250], draw: farHall },
  { id: 'hall-flat', set: 'hall', width: 300, height: 300, origin: [150, 300], draw: hallFlat },
  { id: 'anvil', set: 'field', width: 156, height: 120, origin: [72, 108], draw: anvil },
  { id: 'powderkeg', set: 'field', width: 98, height: 74, origin: [40, 64], draw: powderKeg },
  { id: 'web', set: 'field', width: 128, height: 80, origin: [64, 40], draw: web },
  { id: 'wake-light', set: 'field', width: 128, height: 60, origin: [64, 30], draw: wakeLight },
  { id: 'eggsac-burst', set: 'field', width: 164, height: 106, origin: [80, 90], draw: sacBurst },
  { id: 'barrel-broken', set: 'field', width: 190, height: 100, origin: [84, 86], draw: barrelBroken },
  { id: 'mirror-stand-broken', set: 'field', width: 176, height: 260, origin: [80, 244], draw: mirrorBroken },
];
