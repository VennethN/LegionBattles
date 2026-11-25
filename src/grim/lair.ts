// The churchyard: the Gravedigger's lair. A lair is a stage set, painted in the
// same flat shapes as the figures: a floor, and things stood on it. It is
// dark, and what light there is in it is firelight, which the game adds;
// the pictures here only say where the stone, the timber and the earth are.
//
// The floor is never as dark as a figure's shadow side, or a figure would be
// lost on it.

import { Doc, cut } from './kit/draw';
import { dice } from './kit/dice';
import { hem, limb, limbDark, rivets, stitches } from './kit/figure';
import { DEADGRASS, EARTH, INK, LAMP, LEAD, MOSS, NIGHT, RUST, SLATE, SOOT, STONE, WOOD } from './kit/palette';
import { poly, type Pt } from './kit/path';
import type { Thing } from './things';

/** The floor of the churchyard, any size: trodden earth, paler where feet have worn it, flagstones, dead grass. */
export function churchyardGround(width: number, height: number): Doc {
  const d = new Doc('churchyard-ground');
  const rnd = dice(`churchyard-${width}-${height}`);
  d.flat('earth', poly([[0, 0], [width, 0], [width, height], [0, height]]), EARTH.mid);
  // Worn places: flat angular patches of the lit tone.
  const patch = (name: string, cx: number, cy: number, r: number, color: string): void => {
    const pts: Pt[] = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = r * rnd.range(0.6, 1.1);
      pts.push([cx + Math.cos(a) * k * 1.5, cy + Math.sin(a) * k * 0.7]);
    }
    d.flat(name, poly(pts), color);
  };
  const area = (width * height) / (1400 * 1000);
  for (let i = 0; i < Math.round(16 * area); i++) patch(`worn-${i}`, rnd.range(0, width), rnd.range(0, height), rnd.range(60, 150), EARTH.lit);
  for (let i = 0; i < Math.round(10 * area); i++) patch(`grass-${i}`, rnd.range(0, width), rnd.range(0, height), rnd.range(40, 110), DEADGRASS.mid);
  // A path of flagstones across it, each a slab with its shadow side.
  const slabs = Math.round(width / 70);
  for (let i = 0; i < slabs; i++) {
    const x = (i + 0.5) * (width / slabs) + rnd.range(-12, 12);
    const y = height * 0.56 + Math.sin(i * 0.7) * height * 0.06 + rnd.range(-10, 10);
    const w = rnd.range(44, 62);
    const h = rnd.range(20, 28);
    d.flat(`slab-${i}-under`, poly([[x - w / 2 - 2, y - h / 2 + 3], [x + w / 2 - 1, y - h / 2 + 4], [x + w / 2 - 3, y + h / 2 + 4], [x - w / 2 - 3, y + h / 2 + 3]]), INK, 0.5);
    d.flat(`slab-${i}`, poly([[x - w / 2, y - h / 2 + rnd.range(-2, 2)], [x + w / 2, y - h / 2 + rnd.range(-2, 2)], [x + w / 2 - 3, y + h / 2], [x - w / 2 + 2, y + h / 2 + rnd.range(-2, 2)]]), i % 3 === 0 ? STONE.lit : STONE.mid);
  }
  // Tufts: three blades each.
  for (let i = 0; i < Math.round(70 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    d.strokes(`tuft-${i}`, [[[x, y], [x - 4, y - 11]], [[x + 3, y], [x + 3, y - 14]], [[x + 6, y], [x + 11, y - 10]]], 3, i % 2 ? DEADGRASS.lit : MOSS.mid);
  }
  // Puddles: cold, flat, with one hard sliver of the sky in each.
  for (let i = 0; i < Math.round(6 * area); i++) {
    const x = rnd.range(60, width - 60);
    const y = rnd.range(60, height - 60);
    const w = rnd.range(40, 80);
    d.flat(`puddle-${i}`, poly([[x - w, y], [x - w * 0.5, y - 9], [x + w * 0.4, y - 11], [x + w, y - 2], [x + w * 0.6, y + 9], [x - w * 0.4, y + 11]]), SLATE.mid);
    d.flat(`puddle-${i}-sky`, poly([[x - w * 0.3, y - 4], [x + w * 0.4, y - 6], [x + w * 0.5, y - 3], [x - w * 0.2, y - 1]]), SLATE.lit);
  }
  // Leaf litter, blown into drifts.
  for (let i = 0; i < Math.round(90 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    d.flat(`leaf-${i}`, poly([[x, y], [x + 5, y - 3], [x + 9, y], [x + 4, y + 2]]), i % 3 === 0 ? RUST.mid : i % 3 === 1 ? MOSS.mid : EARTH.lit);
  }
  // Stones and bits of bone.
  for (let i = 0; i < Math.round(40 * area); i++) {
    const x = rnd.range(0, width);
    const y = rnd.range(0, height);
    d.flat(`stone-${i}`, poly([[x - 5, y], [x - 1, y - 4], [x + 5, y - 2], [x + 4, y + 3], [x - 3, y + 3]]), i % 4 === 0 ? STONE.lit : STONE.mid);
  }
  return d;
}

/** A headstone. `kind` is its top: round, a cross, or broken off. It leans, as they all do, by `tilt` degrees. */
function headstone(kind: 'round' | 'cross' | 'broken', tilt: number): (d: Doc) => void {
  const R = (pts: Pt[]): Pt[] => pts.map(([x, y]) => {
    const a = (tilt * Math.PI) / 180;
    const dx = x - 44;
    const dy = y - 112;
    return [44 + dx * Math.cos(a) - dy * Math.sin(a), 112 + dx * Math.sin(a) + dy * Math.cos(a)] as Pt;
  });
  const M = (marks: Array<[Pt, Pt]>): Array<[Pt, Pt]> => marks.map(([a, b]) => R([a, b]) as [Pt, Pt]);
  return (d) => {
    d.blot('blot', poly([[6, 112], [70, 108], [100, 116], [60, 124], [10, 120]]));
    if (kind === 'cross') {
      d.ink('stone', poly(R([[30, 114], [32, 44], [12, 42], [14, 26], [32, 26], [34, 4], [52, 4], [52, 26], [72, 28], [70, 44], [52, 44], [56, 114]])), STONE, {
        dark: poly(R([[0, 0], [36, 0], ...cut([36, 4], [40, 116], 'hs-cross', -1, 6), [0, 116]])),
        cold: 2,
        inner: (c) => {
          c.detail('cracks', M([[[44, 30], [48, 60]], [[48, 60], [44, 78]]]), STONE, 1.8);
          c.flat('lichen', poly(R([[54, 28], [70, 30], [68, 40], [56, 38]])), MOSS.lit, 0.8);
          c.flat('moss', poly(R([[40, 100], [56, 96], [58, 116], [38, 116]])), MOSS.mid);
        },
      });
    } else {
      const top: Pt[] = kind === 'round' ? [[16, 34], [26, 14], [44, 6], [60, 14], [68, 34]] : [[16, 50], [28, 36], [38, 48], [50, 30], [58, 44], [68, 38]];
      d.ink('stone', poly(R([[14, 116], ...top, [72, 114]])), STONE, {
        dark: poly(R([[0, 0], [34, 0], ...cut([34, 4], [38, 118], `hs-${kind}`, -1, 7), [0, 118]])),
        cold: 2,
        inner: (c) => {
          // What was cut into it, worn nearly away: a line of letters, a date, a border.
          c.detail('words', M([[[44, 50], [62, 51]], [[44, 58], [58, 59]], [[44, 68], [64, 69]], [[44, 76], [54, 77]]]), STONE, 2.4);
          c.detail('border', M([[[40, 42], [66, 40]], [[40, 42], [41, 90]]]), STONE, 1.4);
          c.detail('crack', M([[[60, 30], [54, 46]], [[54, 46], [58, 62]]]), STONE, 1.8);
          c.flat('lichen', poly(R([[56, 20], [66, 26], [62, 36], [54, 30]])), MOSS.lit, 0.8);
          c.flat('moss', poly(R([[40, 98], [56, 92], [70, 100], [72, 116], [38, 116]])), MOSS.mid);
        },
      });
    }
    // The grass that has grown up round its foot.
    d.strokes('grass', [[[20, 118], [14, 104]], [[26, 119], [26, 102]], [[62, 118], [70, 104]], [[68, 119], [78, 110]]], 3.4, DEADGRASS.mid);
  };
}

function openGrave(d: Doc): void {
  // A pit with a lip: the near edge of the hole is lit earth, the hole itself is black, its far wall a step lighter.
  d.ink('lip', poly([[10, 62], [30, 34], [150, 26], [176, 52], [168, 90], [22, 98]]), EARTH, { dark: false, heavy: 3 });
  d.flat('far-wall', poly([[30, 40], [150, 32], [156, 52], [34, 60]]), EARTH.mid);
  d.black('pit', poly([[34, 58], [156, 50], [160, 80], [28, 88]]));
  d.strokes('roots', [[[60, 44], [56, 62]], [[110, 40], [114, 60]], [[136, 38], [132, 54]]], 2.2);
  // What came out of it, heaped beside, with the spade left standing in it.
  d.ink('mound', poly([[140, 92], [156, 50], [184, 30], [214, 40], [236, 70], [242, 96], [146, 102]]), EARTH, {
    dark: poly([[130, 20], [176, 20], ...cut([176, 30], [184, 106], 'grave-mound', -1, 7), [130, 106]]),
    inner: (c) => c.detail('clods', [[[196, 50], [204, 58]], [[212, 70], [222, 76]], [[190, 78], [198, 86]]], EARTH, 3),
  });
  d.ink('spade-shaft', limb([206, 50], [216, 6], 5, 5), WOOD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2 });
  d.ink('spade-grip', limb([208, 4], [224, 8], 4.5, 4.5), WOOD, { dark: false, line: 1.4, heavy: 1.8 });
  d.ink('spade-blade', poly([[197, 46], [215, 48], [213, 64], [205, 72], [198, 62]]), LEAD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2, rim: 1.2 });
  // A coffin lid, thrown aside.
  d.ink('lid', poly([[40, 100], [70, 92], [120, 96], [128, 106], [116, 116], [50, 116]]), WOOD, { dark: 0.3, mid: 3, inner: (c) => c.detail('boards', [[[60, 96], [58, 114]], [[90, 96], [90, 114]]], WOOD, 1.6) });
  rivets(d, 'lid-nails', [50, 104], [118, 102], 4, 1.4);
}

function wall(d: Doc): void {
  d.blot('blot', poly([[0, 136], [240, 130], [250, 140], [10, 146]]));
  // Courses of stone with a breach in them, a coping, and iron rails, some bent and some gone.
  d.ink('wall', poly([[4, 140], [6, 70], [150, 66], [156, 84], [170, 80], [176, 96], [196, 92], [200, 68], [236, 66], [238, 136]]), STONE, {
    dark: poly([[0, 108], ...cut([0, 104], [244, 100], 'wall-dark', 1, 5), [244, 146], [0, 146]]),
    mid: 6,
    cold: 2,
    inner: (c) => {
      c.detail('courses', [[[6, 88], [120, 86]], [[130, 86], [236, 84]], [[40, 70], [41, 86]], [[100, 70], [101, 86]], [[70, 88], [71, 104]], [[150, 86], [151, 102]], [[210, 84], [211, 100]], [[6, 104], [236, 100]]], STONE, 2.4);
      c.detail('cracks', [[[120, 70], [126, 96]], [[30, 92], [36, 110]]], STONE, 1.8);
      c.flat('lichen-a', poly([[20, 72], [44, 72], [40, 82], [24, 84]]), MOSS.lit, 0.8);
      c.flat('lichen-b', poly([[206, 70], [230, 70], [226, 80]]), MOSS.lit, 0.8);
      c.flat('moss', poly([[60, 96], [110, 94], [100, 106], [70, 108]]), MOSS.mid);
    },
  });
  d.ink('coping-a', poly([[0, 70], [2, 58], [150, 54], [152, 66]]), STONE, { dark: 0.2, mid: 4 });
  d.ink('coping-b', poly([[198, 68], [200, 56], [240, 54], [242, 66]]), STONE, { dark: 0.2, mid: 4 });
  // The stones that fell out of it.
  d.ink('fallen-a', poly([[160, 132], [168, 118], [186, 116], [192, 132]]), STONE, { dark: 0.4, mid: 3 });
  d.ink('fallen-b', poly([[184, 138], [190, 128], [206, 130], [208, 140]]), STONE, { dark: 0.4, mid: 3 });
  const rail = (name: string, x: number, lean: number, top: number): void => {
    d.black(name, poly([[x - 2.5, 58], [x + 2.5, 58], [x + 2.5 + lean, top + 14], [x + 6 + lean, top + 14], [x + lean, top], [x - 6 + lean, top + 14], [x - 2.5 + lean, top + 14]]));
  };
  rail('rail-0', 16, 0, 2);
  rail('rail-1', 46, 2, 4);
  rail('rail-2', 76, -1, 2);
  rail('rail-3', 106, 14, 12);
  rail('rail-5', 216, -3, 4);
  d.black('bar', poly([[8, 28], [122, 30], [122, 35], [8, 33]]));
  d.flat('bar-rust', poly([[60, 28.6], [84, 29], [84, 33.6], [60, 33.2]]), RUST.mid);
  // One rail, pulled out and lying across the breach.
  d.black('rail-down', poly([[140, 112], [200, 96], [202, 100], [142, 117]]));
}

function deadTree(d: Doc): void {
  d.blot('blot', poly([[40, 292], [120, 286], [170, 296], [110, 304], [50, 300]]));
  const branch = (name: string, a: Pt, b: Pt, w: number): void => {
    d.ink(name, limb(a, b, w, w * 0.3), WOOD, { dark: limbDark(a, b, w, w, `tree-${name}`, 0.6), mid: 0, rim: 0, line: 2, heavy: 2.6 });
  };
  branch('b1', [96, 150], [30, 70], 18);
  branch('b2', [36, 78], [8, 30], 8);
  branch('b3', [50, 92], [70, 40], 8);
  branch('b4', [112, 130], [176, 60], 16);
  branch('b5', [168, 68], [206, 44], 8);
  branch('b6', [150, 86], [150, 30], 8);
  branch('b7', [104, 110], [100, 34], 12);
  branch('b8', [100, 40], [84, 6], 6);
  // The trunk, split and leaning.
  d.ink('trunk', poly([[70, 296], [84, 220], [86, 150], [96, 110], [120, 116], [126, 160], [120, 230], [140, 296]]), WOOD, {
    dark: poly([[50, 100], [96, 100], ...cut([98, 110], [104, 300], 'tree-trunk', -1, 8), [50, 300]]),
    inner: (c) => {
      c.strokes('bark', [[[112, 150], [110, 210]], [[118, 180], [122, 250]], [[108, 230], [110, 280]]], 3);
      c.black('hollow', poly([[104, 176], [112, 170], [116, 186], [108, 196]]));
    },
  });
  // A hanged man's rope, and no man.
  d.pen('rope', poly([[166, 72], [168, 120]], false), 2.4);
  d.pen('noose', poly([[168, 120], [162, 130], [168, 140], [174, 130], [168, 120]], false), 2.4);
}

function lychGate(d: Doc): void {
  d.blot('blot', poly([[10, 306], [250, 300], [272, 310], [240, 318], [20, 316]]));
  // Two great posts, a beam, and a roof of shingles gone at one corner.
  d.ink('post-a', poly([[34, 310], [38, 120], [62, 120], [66, 310]]), WOOD, { dark: 0.5 });
  d.ink('post-b', poly([[204, 310], [208, 120], [232, 120], [236, 310]]), WOOD, { dark: 0.42 });
  d.ink('brace-a', limb([62, 170], [100, 128], 12, 11), WOOD, { dark: limbDark([62, 170], [100, 128], 12, 12, 'gate-ba', 0.5), mid: 2, rim: 0 });
  d.ink('brace-b', limb([208, 170], [170, 128], 12, 11), WOOD, { dark: limbDark([208, 170], [170, 128], 12, 12, 'gate-bb', 0.5), mid: 2, rim: 0 });
  d.ink('beam', poly([[20, 112], [250, 106], [252, 126], [22, 132]]), WOOD, { dark: poly([[10, 122], [260, 116], [260, 136], [10, 138]]), mid: 3, inner: (c) => c.detail('beam-grain', [[[40, 116], [120, 113]], [[150, 113], [240, 110]]], WOOD, 2) });
  // The pegs its joints are held with.
  rivets(d, 'pegs-a', [44, 116], [58, 116], 2, 2.2);
  rivets(d, 'pegs-b', [214, 112], [228, 112], 2, 2.2);
  d.ink('roof', poly([[0, 110], [60, 40], [136, 8], [212, 40], [270, 104], [240, 108], [222, 92], [196, 104], [30, 114]]), SOOT, {
    dark: poly([[-10, 0], [112, 0], ...cut([112, 8], [96, 120], 'gate-roof', -1, 9), [-10, 120]]),
    cold: 2.6,
    inner: (c) => {
      c.detail('shingles', [[[140, 30], [236, 80]], [[136, 52], [214, 92]], [[150, 16], [250, 92]], [[128, 76], [190, 100]]], SOOT, 3);
      c.detail('shingle-ends', [...stitches([150, 36], [230, 78], 8, 10, 0.4), ...stitches([144, 58], [210, 90], 6, 10, 0.4)], SOOT, 1.8);
      c.flat('roof-moss', poly([[170, 40], [200, 52], [190, 64], [164, 54]]), MOSS.mid);
      c.black('roof-hole', poly([[204, 66], [222, 72], [216, 86], [202, 80]]));
    },
  });
  // A lantern hung under the beam: the one light the gate has.
  d.pen('chain', poly([[136, 126], [136, 150]], false), 2.4);
  d.ink('lamp', poly([[126, 152], [146, 152], [148, 180], [124, 180]]), { lit: LAMP.lit, mid: LAMP.mid }, { dark: false, line: 1.8, heavy: 2.4, rim: 0 });
  d.flat('lamp-heart', poly([[132, 158], [140, 158], [141, 176], [131, 176]]), LAMP.hot);
  d.black('lamp-cap', poly([[122, 154], [130, 144], [142, 144], [150, 154]]));
  d.black('lamp-foot', poly([[122, 178], [150, 178], [146, 186], [126, 186]]));
  // What is left of the gate itself, hanging from one hinge.
  d.ink('leaf', poly([[66, 304], [70, 196], [112, 204], [108, 310]]), WOOD, {
    dark: 0.4,
    inner: (c) => c.strokes('boards', [[[82, 200], [80, 306]], [[96, 202], [94, 308]]], 2.6),
  });
  d.ink('strap', poly([[66, 222], [112, 228], [112, 236], [66, 230]]), RUST, { dark: false, line: 1.6, heavy: 2, rim: 0 });
}

function torchPost(d: Doc): void {
  d.blot('blot', poly([[10, 196], [44, 192], [62, 198], [40, 204], [14, 202]]));
  d.ink('post', poly([[26, 200], [29, 64], [39, 64], [42, 200]]), WOOD, { dark: 0.5, mid: 2 });
  d.ink('cup', poly([[18, 50], [50, 50], [46, 70], [22, 70]]), LEAD, { dark: 0.4, mid: 2 });
  d.ink('flame', poly([[22, 50], [18, 34], [28, 40], [30, 16], [40, 34], [48, 26], [46, 50]]), { lit: LAMP.lit, mid: LAMP.mid }, {
    dark: false, line: 1.6, heavy: 2, rim: 0,
    inner: (c) => c.flat('heart', poly([[28, 50], [30, 34], [34, 26], [38, 38], [40, 50]]), LAMP.hot),
  });
}

/** What stands far off: a church with a broken spire, and yews. One cold flat shape, hardly lighter than the night. */
function farChurch(d: Doc): void {
  d.flat('yews', poly([[0, 250], [10, 170], [30, 120], [44, 168], [60, 110], [84, 180], [100, 140], [118, 200], [140, 250]]), NIGHT.mid);
  d.flat('church', poly([[120, 250], [120, 150], [170, 110], [220, 150], [220, 120], [226, 60], [244, 20], [250, 44], [262, 60], [266, 120], [300, 120], [360, 150], [360, 250]]), NIGHT.lit);
  d.flat('church-shade', poly([[120, 250], [120, 150], [170, 110], [176, 250]]), NIGHT.mid);
  d.flat('tower-shade', poly([[220, 250], [220, 120], [226, 60], [240, 28], [242, 250]]), NIGHT.mid);
  d.black('window-a', poly([[190, 190], [196, 172], [202, 190], [202, 220], [190, 220]]));
  d.black('window-b', poly([[296, 180], [302, 164], [308, 180], [308, 214], [296, 214]]));
  d.black('louvre', poly([[238, 96], [252, 96], [252, 124], [238, 124]]));
  d.flat('yews-near', poly([[340, 250], [352, 150], [372, 96], [392, 160], [410, 120], [430, 190], [452, 150], [470, 250]]), NIGHT.mid);
}

/** A flat for the front of the stage: all black, to stand at a bottom corner of the screen in front of everything. */
function nearFlat(d: Doc): void {
  d.black('ground', poly([[0, 240], [0, 190], [40, 176], [90, 184], [150, 170], [210, 186], [260, 180], [300, 196], [300, 240]]));
  // A leaning cross, a stump of railing, and grass, all as shapes.
  d.black('cross', poly([[60, 190], [72, 96], [50, 92], [54, 74], [76, 78], [80, 40], [98, 42], [94, 82], [118, 86], [114, 104], [92, 100], [84, 192]]));
  d.black('rail-a', poly([[170, 180], [173, 110], [166, 110], [176, 88], [186, 110], [179, 110], [182, 180]]));
  d.black('rail-b', poly([[204, 186], [210, 124], [203, 124], [215, 102], [223, 126], [216, 125], [214, 186]]));
  d.black('rail-bar', poly([[160, 132], [232, 142], [232, 148], [160, 138]]));
  d.strokes('grass', [[[20, 190], [8, 150]], [[30, 186], [30, 146]], [[40, 184], [56, 150]], [[128, 180], [120, 144]], [[138, 176], [144, 140]], [[250, 186], [244, 150]], [[262, 186], [274, 152]], [[282, 192], [292, 160]]], 7);
}

export const CHURCHYARD: Thing[] = [
  { id: 'headstone-round', set: 'churchyard', width: 110, height: 130, origin: [44, 116], draw: headstone('round', 7) },
  { id: 'headstone-cross', set: 'churchyard', width: 110, height: 130, origin: [44, 116], draw: headstone('cross', -6) },
  { id: 'headstone-broken', set: 'churchyard', width: 110, height: 130, origin: [44, 116], draw: headstone('broken', 11) },
  { id: 'open-grave', set: 'churchyard', width: 250, height: 122, origin: [96, 76], draw: openGrave },
  { id: 'wall', set: 'churchyard', width: 252, height: 150, origin: [124, 138], draw: wall },
  { id: 'dead-tree', set: 'churchyard', width: 216, height: 310, origin: [106, 296], draw: deadTree },
  { id: 'lych-gate', set: 'churchyard', width: 280, height: 322, origin: [136, 310], draw: lychGate },
  { id: 'torch-post', set: 'churchyard', width: 70, height: 208, origin: [34, 200], draw: torchPost },
  { id: 'far-church', set: 'churchyard', width: 470, height: 250, origin: [235, 250], draw: farChurch },
  { id: 'near-flat', set: 'churchyard', width: 300, height: 240, origin: [150, 240], draw: nearFlat },
];
export { hem };
