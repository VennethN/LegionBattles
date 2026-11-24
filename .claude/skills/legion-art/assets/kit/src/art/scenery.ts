// What stands in a land: its trees and rocks, and the places a map marks.
// Each is drawn about its own foot at (0, 0), so that a scene can stand it
// anywhere, at any size, facing either way (Doc.at).
//
// Nothing here has a face. A camp is a tent, a tower is a tower.

import { Doc } from './kit/draw';
import {
  BONE, BUSH, CACTUS, CLOTH, DIRT, FIRE, FROST, GOLD, GRASS, HOLY, LEATHER, OUTLINE, PINE, RUBY, SAND,
  SHADOW_OPACITY, SNOW, STONE, WOOD, type Material, type Team,
} from './kit/palette';
import { capsule, circle, ellipse, path, poly, roundRect, smooth } from './kit/path';

export type Scenery = (d: Doc) => void;

const SNOWCAP: Material = { fill: SNOW.light, shade: SNOW.shade };
const SANDSTONE: Material = { fill: SAND.dark, shade: DIRT.fill };

function ground(d: Doc, rx: number, ry = rx * 0.26, dx = 4): void {
  d.flat('shadow', ellipse(dx, 2, rx, ry), OUTLINE, SHADOW_OPACITY);
}

// ------------------------------------------------------------ the meadow

/** A broad tree: a trunk and a crown in three heaps of leaves. */
export const tree: Scenery = (d) => {
  ground(d, 44, 11);
  d.piece('trunk', smooth([[-9, 0, 'c'], [-7, -22], [-10, -44], [10, -44], [7, -22], [10, 0, 'c']]), WOOD, {
    shade: 4,
    inner: (c) => {
      c.shadeOver('bark-a', capsule(-2, -6, -3, -30, 1.8), 1);
      c.shadeOver('bark-b', capsule(4, -14, 3, -38, 1.8), 1);
      c.shadeOver('under', roundRect(-14, -50, 28, 12, 0), 1.1);
    },
  });
  d.piece('crown-back', smooth([[-40, -52], [-48, -78], [-30, -100], [-4, -108], [26, -102], [46, -80], [44, -54], [20, -42], [-16, -42]]), { fill: BUSH.shade, shade: PINE.shade }, { shade: 5 });
  d.piece('crown', smooth([[-34, -58], [-42, -82], [-24, -104], [0, -112], [24, -104], [40, -84], [36, -60], [14, -50], [-14, -50]]), BUSH, {
    shade: 7,
    inner: (c) => {
      // Heaps of leaves: a lit one toward the light, a shaded hollow under each.
      c.lightOver('heap-a', smooth([[-30, -84], [-16, -102], [4, -104], [8, -90], [-8, -80]]), 0.7);
      c.lightOver('heap-b', smooth([[4, -74], [18, -86], [32, -80], [28, -66], [12, -62]]), 0.5);
      c.shadeOver('hollow-a', smooth([[-26, -70], [-8, -76], [6, -68], [-6, -60], [-22, -62]]), 0.8);
      c.shadeOver('hollow-b', smooth([[8, -58], [26, -62], [34, -56], [20, -50], [8, -52]]), 0.7);
      for (const [x, y] of [[-18, -92], [-2, -96], [12, -82], [-28, -76], [22, -72], [-10, -68]] as const) {
        c.lightOver('leaf', path().M(x, y).Q(x + 4, y - 5, x + 8, y).Q(x + 4, y + 2, x, y).Z(), 0.9);
      }
    },
  });
};

/** A bush, with berries on it. */
export const bush: Scenery = (d) => {
  ground(d, 34, 9);
  d.piece('bush', smooth([[-34, 0, 'c'], [-38, -16], [-28, -28], [-22, -42], [-4, -48], [10, -40], [22, -38], [32, -26], [38, -14], [36, 0, 'c']]), BUSH, {
    shade: 6,
    inner: (c) => {
      c.lightOver('heap', smooth([[-24, -30], [-10, -44], [6, -40], [4, -28], [-10, -22]]), 0.7);
      c.shadeOver('hollow', smooth([[-6, -18], [12, -24], [26, -16], [14, -8], [-4, -8]]), 0.8);
      for (const [x, y] of [[-16, -16], [8, -30], [22, -12], [-26, -8], [2, -6]] as const) c.flat('berry', circle(x, y, 3), RUBY.fill);
      for (const [x, y] of [[-17, -17], [7, -31], [21, -13], [-27, -9], [1, -7]] as const) c.flat('berry-lit', circle(x, y, 1), SNOW.light);
    },
  });
};

/** A rock with moss on it, or snow, or nothing, and a smaller one beside it. */
export function rock(mat: Material, cap: Material | null): Scenery {
  return (d) => {
    ground(d, 36, 9);
    d.piece('rock', smooth([[-30, 0, 'c'], [-28, -20], [-14, -36], [6, -38], [22, -26], [30, 0, 'c']]), mat, {
      shade: 6,
      inner: (c) => {
        // Cut in planes, with a crack down one.
        c.lightOver('facet', poly([[-24, -18], [-12, -34], [4, -34], [-4, -14], [-22, -6]]), 0.6);
        c.shadeOver('facet-far', poly([[8, -30], [24, -22], [28, 0], [10, 0], [4, -14]]), 0.6);
        c.shadeOver('crack', path().M(-2, -30).L(2, -20).L(-3, -12).L(1, -4).L(4, -4).L(0, -12).L(5, -20).L(1, -30).Z(), 1.1);
        if (cap) c.piece('cap', smooth([[-36, -22], [-16, -44], [10, -46], [30, -24], [16, -26], [4, -20], [-10, -28], [-24, -18]]), cap, { shade: 0 });
      },
    });
    d.piece('pebble', smooth([[14, 0, 'c'], [16, -10], [26, -14], [36, -8], [38, 0, 'c']]), mat, { shade: 3 });
    // Grass at its foot, or what the land has for it.
    if (cap === BUSH) for (const x of [-34, -6, 30]) d.flat('tuft', path().M(x, 0).L(x + 2, -9).L(x + 4, 0).L(x + 6, -7).L(x + 8, 0).Z(), GRASS.light);
  };
}

/** A stump, with its rings and a sprout. */
export const stump: Scenery = (d) => {
  ground(d, 26, 8);
  d.piece('roots', smooth([[-26, 0, 'c'], [-18, -8], [-16, -26], [16, -26], [18, -8], [26, 0, 'c']]), WOOD, {
    shade: 5,
    inner: (c) => {
      c.shadeOver('bark-a', capsule(-8, -4, -9, -22, 1.8), 1);
      c.shadeOver('bark-b', capsule(6, -6, 7, -22, 1.8), 1);
    },
  });
  d.piece('top', ellipse(0, -27, 18, 7), BONE, {
    shade: 0,
    inner: (c) => {
      c.shadeOver('ring-a', ellipse(0, -27, 12, 4.4), 0.7);
      c.flat('ring-b', ellipse(0, -27, 9, 3.2), BONE.fill);
      c.shadeOver('ring-c', ellipse(0, -27, 5, 1.8), 0.7);
    },
  });
  d.line('sprout', path().M(12, -30).Q(16, -38, 14, -44));
  d.piece('leaf', smooth([[14, -44, 'c'], [22, -50], [26, -44, 'c'], [20, -40]]), BUSH, { shade: 0 });
};

/** A handful of flowers. `petal` is their color. */
export function flowers(petal: string): Scenery {
  return (d) => {
    for (const [x, h] of [[-12, 16], [0, 22], [11, 14]] as const) {
      d.line('stem', path().M(x, 0).Q(x + 2, -h / 2, x, -h), BUSH.shade, 2.4);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        d.flat('petal', circle(x + Math.cos(a) * 4, -h + Math.sin(a) * 4, 3.2), petal);
      }
      d.flat('heart', circle(x, -h, 2.4), HOLY.fill);
    }
    d.flat('blade-a', path().M(-18, 0).L(-15, -9).L(-12, 0).Z(), GRASS.light);
    d.flat('blade-b', path().M(5, 0).L(8, -8).L(11, 0).Z(), GRASS.light);
  };
}

/** Two mushrooms. */
export const mushrooms: Scenery = (d) => {
  ground(d, 16, 5, 2);
  for (const [x, k] of [[-7, 1], [8, 0.7]] as const) {
    d.piece('stalk', roundRect(x - 3.5 * k, -12 * k, 7 * k, 13 * k, 2), BONE, { shade: 0 });
    d.piece('cap', smooth([[x - 12 * k, -11 * k, 'c'], [x - 9 * k, -22 * k], [x, -26 * k], [x + 9 * k, -22 * k], [x + 12 * k, -11 * k, 'c']]), CLOTH.red, {
      shade: 3,
      inner: (c) => {
        c.flat('spot-a', circle(x - 4 * k, -19 * k, 2.2 * k), BONE.fill);
        c.flat('spot-b', circle(x + 5 * k, -16 * k, 1.8 * k), BONE.fill);
      },
    });
  }
};

/** A fallen log. */
export const log: Scenery = (d) => {
  ground(d, 40, 8);
  d.piece('log', roundRect(-38, -22, 70, 22, 10), WOOD, {
    shade: 5,
    inner: (c) => {
      c.shadeOver('bark-a', capsule(-26, -15, 6, -15, 1.8), 1);
      c.shadeOver('bark-b', capsule(-12, -7, 18, -7, 1.8), 1);
      c.lightOver('moss', smooth([[-30, -24], [-6, -26], [4, -20], [-14, -17], [-30, -18]]), 0.2);
      c.flat('moss-b', smooth([[-28, -24], [-8, -25], [0, -21], [-14, -19], [-28, -20]]), BUSH.fill, 0.85);
    },
  });
  d.piece('end', ellipse(31, -11, 8, 11), BONE, {
    shade: 0,
    inner: (c) => c.shadeOver('ring', ellipse(31, -11, 4, 6), 0.7),
  });
};

/** A stretch of fence: three posts and two rails. `snow` caps it. */
export function fence(snow = false): Scenery {
  return (d) => {
    ground(d, 46, 6);
    d.piece('rail-a', roundRect(-44, -30, 88, 7, 3), WOOD, { shade: 0 });
    d.piece('rail-b', roundRect(-44, -16, 88, 7, 3), WOOD, { shade: 0 });
    for (const x of [-38, 0, 38]) {
      d.piece('post', smooth([[x - 5, 0, 'c'], [x - 5, -36], [x, -42], [x + 5, -36], [x + 5, 0, 'c']]), WOOD, { shade: 3 });
      if (snow) d.piece('cap', smooth([[x - 7, -36, 'c'], [x - 5, -44], [x + 5, -44], [x + 7, -36, 'c']]), SNOWCAP, { shade: 0 });
    }
  };
}

/** A tuft of tall grass. */
export function tuft(color: string, dark: string): Scenery {
  return (d) => {
    d.flat('back', path().M(-12, 0).L(-9, -16).L(-5, 0).L(-1, -22).L(4, 0).L(8, -15).L(12, 0).Z(), dark);
    d.flat('front', path().M(-8, 0).L(-5, -10).L(-2, 0).L(2, -14).L(6, 0).Z(), color);
  };
}

// ------------------------------------------------------------ the dunes

/** A tall cactus with two arms and a flower. */
export const cactus: Scenery = (d) => {
  ground(d, 26, 7);
  d.piece('arm-a', smooth([[-6, -30, 'c'], [-22, -32], [-26, -44], [-24, -58], [-14, -58], [-14, -44], [-6, -42, 'c']]), CACTUS, { shade: 3 });
  d.piece('arm-b', smooth([[8, -40, 'c'], [22, -42], [24, -54], [26, -66], [16, -66], [14, -54], [8, -52, 'c']]), CACTUS, { shade: 3 });
  d.piece('trunk', smooth([[-10, 0, 'c'], [-10, -64], [0, -76], [10, -64], [10, 0, 'c']]), CACTUS, {
    shade: 5,
    inner: (c) => {
      c.shadeOver('rib-a', capsule(-3, -8, -3, -66, 1.6), 1);
      c.shadeOver('rib-b', capsule(4, -8, 4, -64, 1.6), 1);
      for (const y of [-18, -34, -50]) c.lightOver('spine', capsule(-7, y, -5, y - 3, 1.2), 1.4);
    },
  });
  d.piece('flower', circle(0, -78, 5), CLOTH.red, { shade: 0 });
  d.flat('flower-heart', circle(0, -78, 1.8), HOLY.fill);
};

/** Sandstone worn in layers. */
export const sandrock: Scenery = (d) => {
  ground(d, 38, 9);
  d.piece('rock', smooth([[-32, 0, 'c'], [-34, -18], [-22, -34], [-4, -44], [16, -38], [28, -22], [32, 0, 'c']]), SANDSTONE, {
    shade: 6,
    inner: (c) => {
      // The layers it was laid down in.
      for (const y of [-10, -21, -31]) c.shadeOver('layer', smooth([[-40, y], [0, y - 4], [40, y], [40, y + 2.6], [0, y - 1.4], [-40, y + 2.6]]), 0.9);
      c.lightOver('facet', poly([[-26, -20], [-12, -38], [2, -40], [-6, -22]]), 0.6);
    },
  });
  d.piece('pebble', smooth([[18, 0, 'c'], [20, -9], [30, -12], [40, -7], [42, 0, 'c']]), SANDSTONE, { shade: 3 });
};

/** A dry thorn bush. */
export const dryShrub: Scenery = (d) => {
  ground(d, 26, 6);
  d.piece('shrub', poly([[-24, 0], [-30, -16], [-18, -12], [-20, -32], [-8, -18], [0, -40], [8, -18], [20, -32], [18, -12], [30, -16], [24, 0]]), { fill: DIRT.fill, shade: DIRT.shade }, {
    shade: 4,
    inner: (c) => {
      c.shadeOver('twig-a', capsule(0, -2, 0, -30, 1.8), 1);
      c.shadeOver('twig-b', capsule(-4, -4, -16, -24, 1.6), 1);
      c.shadeOver('twig-c', capsule(4, -4, 16, -24, 1.6), 1);
    },
  });
};

/** A palm leaning over. */
export const palm: Scenery = (d) => {
  ground(d, 36, 9, 10);
  d.piece('trunk', smooth([[-7, 0, 'c'], [-4, -30], [4, -60], [14, -84], [24, -82], [14, -58], [8, -30], [8, 0, 'c']]), WOOD, {
    shade: 4,
    inner: (c) => {
      for (const [x, y] of [[-6, -14], [-3, -30], [1, -46], [6, -60], [12, -72]] as const) c.shadeOver('ring', capsule(x, y, x + 16, y - 3, 2), 0.9);
    },
  });
  const frond = (pts: Array<[number, number]>, name: string, back: boolean): void => {
    d.piece(name, smooth(pts.map(([x, y]) => [x + 19, y - 84] as [number, number])), back ? { fill: CACTUS.shade, shade: PINE.shade } : CACTUS, { shade: back ? 0 : 4 });
  };
  frond([[0, 0], [-20, -22], [-48, -18], [-60, 2], [-40, -6], [-20, -4]], 'frond-a', true);
  frond([[0, 0], [22, -20], [48, -12], [56, 8], [38, -2], [18, 0]], 'frond-b', true);
  frond([[0, 0], [-14, -30], [-36, -38], [-54, -26], [-34, -24], [-16, -12]], 'frond-c', false);
  frond([[0, 0], [10, -32], [32, -40], [50, -28], [30, -24], [14, -10]], 'frond-d', false);
  frond([[0, 0], [-26, -6], [-42, 10], [-40, 28], [-28, 12], [-12, 6]], 'frond-e', false);
  frond([[0, 0], [24, -2], [40, 14], [38, 32], [26, 16], [10, 8]], 'frond-f', false);
  d.piece('nut-a', circle(15, -80, 5), LEATHER, { shade: 0 });
  d.piece('nut-b', circle(23, -78, 5), LEATHER, { shade: 0 });
};

/** Two clay jars, one tipped over. */
export const pots: Scenery = (d) => {
  ground(d, 28, 7);
  d.piece('jar', smooth([[-16, 0, 'c'], [-22, -14], [-18, -28], [-10, -32], [-10, -38], [2, -38], [2, -32], [10, -28], [14, -14], [8, 0, 'c']]), { fill: FIRE.shade, shade: DIRT.shade }, {
    shade: 4,
    inner: (c) => {
      c.piece('band', roundRect(-26, -22, 44, 6, 0), BONE, { shade: 0 });
      c.shadeOver('mouth', ellipse(-4, -38, 6, 2.4), 1.6);
    },
  });
  d.piece('jar-b', smooth([[12, -2, 'c'], [16, -14], [28, -18], [38, -12], [40, -2, 'c']]), { fill: FIRE.shade, shade: DIRT.shade }, { shade: 3 });
  d.flat('mouth-b', ellipse(39, -8, 3, 6), OUTLINE);
};

/** What is left of a pillar. */
export const ruin: Scenery = (d) => {
  ground(d, 34, 8);
  d.piece('base', roundRect(-22, -10, 44, 10, 2), SANDSTONE, { shade: 3 });
  d.piece('shaft', poly([[-15, -10], [-15, -52], [-6, -62], [2, -54], [10, -66], [15, -50], [15, -10]]), SANDSTONE, {
    shade: 5,
    inner: (c) => {
      for (const x of [-8, 0, 8]) c.shadeOver('flute', roundRect(x - 1.4, -70, 2.8, 62, 1), 0.9);
      c.shadeOver('course', roundRect(-20, -32, 40, 2.6, 0), 1);
    },
  });
  d.piece('drum', roundRect(22, -14, 26, 14, 4), SANDSTONE, {
    shade: 4,
    inner: (c) => c.shadeOver('flute', roundRect(24, -8, 22, 2.4, 1), 0.9),
  });
};

// ------------------------------------------------------------ the frost

/** A pine heavy with snow. */
export const pine: Scenery = (d) => {
  ground(d, 32, 9);
  d.piece('trunk', roundRect(-7, -18, 14, 18, 3), WOOD, { shade: 3 });
  const tier = (y: number, w: number, name: string): void => {
    d.piece(name, poly([[0, y - 38], [w, y - 6], [w - 9, y], [0, y - 6], [-w + 9, y], [-w, y - 6]]), PINE, {
      shade: 5,
      inner: (c) => {
        c.piece(`${name}-snow`, smooth([[0, y - 46], [w * 0.62, y - 18], [w * 0.3, y - 22], [w * 0.1, y - 14], [-w * 0.2, y - 22], [-w * 0.62, y - 18]]), SNOWCAP, { shade: 0 });
        c.shadeOver(`${name}-under`, poly([[-w, y - 2], [0, y - 8], [w, y - 2], [w, y + 4], [-w, y + 4]]), 1);
      },
    });
  };
  tier(-12, 34, 'low');
  tier(-38, 27, 'mid');
  tier(-64, 20, 'top');
};

/** Shards of ice standing out of the ground. */
export const iceSpike: Scenery = (d) => {
  ground(d, 28, 7);
  const shard = (name: string, pts: Array<[number, number]>, shade: number): void => {
    d.piece(name, poly(pts), FROST, {
      shade,
      inner: (c) => {
        // One face of each shard catches the light.
        const [a, b] = [pts[0], pts[1]];
        c.lightOver(`${name}-face`, poly([a, b, [(a[0] + pts[2][0]) / 2, 0]]), 0.9);
      },
    });
  };
  shard('spike-a', [[-24, 0], [-14, -40], [-2, 0]], 3);
  shard('spike-b', [[6, 0], [18, -32], [26, 0]], 3);
  shard('spike-c', [[-12, 0], [2, -60], [14, 0]], 5);
  d.glint('glint', poly([[-1, -40], [2, -50], [2, -22], [-3, -20]]));
};

/** A tree with no leaves, snow along its boughs. */
export const bareTree: Scenery = (d) => {
  ground(d, 26, 7);
  d.piece('bough-a', capsule(-2, -44, -26, -70, 7), { fill: WOOD.shade, shade: WOOD.shade }, { shade: 0 });
  d.piece('bough-b', capsule(2, -50, 24, -78, 7), WOOD, { shade: 0 });
  d.piece('twig', capsule(12, -64, 30, -62, 5), WOOD, { shade: 0 });
  d.piece('trunk', smooth([[-8, 0, 'c'], [-6, -30], [-5, -60], [0, -84], [5, -60], [6, -30], [8, 0, 'c']]), WOOD, {
    shade: 4,
    inner: (c) => c.shadeOver('bark', capsule(-1, -8, 0, -50, 1.8), 1),
  });
  d.piece('snow-a', smooth([[-28, -72, 'c'], [-18, -70], [-8, -56, 'c'], [-16, -60]]), SNOWCAP, { shade: 0 });
  d.piece('snow-b', smooth([[8, -60, 'c'], [18, -76], [26, -80, 'c'], [18, -68]]), SNOWCAP, { shade: 0 });
};

/** A heap of drifted snow. */
export const drift: Scenery = (d) => {
  d.piece('drift', smooth([[-40, 0, 'c'], [-30, -12], [-10, -20], [10, -16], [30, -10], [42, 0, 'c']]), { fill: SNOW.light, shade: SNOW.shade }, {
    shade: 5,
    outline: false,
    inner: (c) => c.shadeOver('lee', smooth([[4, -16], [30, -10], [42, 0], [14, 0]]), 0.25),
  });
};

/** Stones piled to mark a way. */
export const cairn: Scenery = (d) => {
  ground(d, 24, 6);
  d.piece('stone-a', roundRect(-20, -14, 40, 14, 6), STONE, { shade: 4 });
  d.piece('stone-b', roundRect(-14, -26, 28, 13, 6), STONE, { shade: 3 });
  d.piece('stone-c', roundRect(-8, -36, 17, 11, 5), STONE, { shade: 3 });
  d.piece('snow', smooth([[-10, -34, 'c'], [-6, -42], [6, -42], [11, -34, 'c']]), SNOWCAP, { shade: 0 });
};

// ------------------------------------------------------------ what a map marks

/** A camp: a tent with its flap open on shadow, and a fire. A plain stage. */
export function camp(cloth: Material): Scenery {
  return (d) => {
    ground(d, 40, 9);
    d.piece('tent', poly([[-34, 0], [-4, -46], [26, 0]]), cloth, {
      shade: 6,
      inner: (c) => {
        c.flat('door', poly([[-12, 0], [-4, -24], [4, 0]]), OUTLINE);
        c.shadeOver('seam', poly([[-4, -46], [-2, -46], [14, 0], [10, 0]]), 0.8);
        c.lightOver('panel', poly([[-30, 0], [-6, -38], [-16, 0]]), 0.5);
      },
    });
    d.line('pole', path().M(-4, -44).L(-4, -54));
    d.piece('pennant', poly([[-4, -54], [10, -50], [-4, -45]]), GOLD, { shade: 0 });
    // The fire beside it.
    d.piece('log-a', capsule(26, -3, 44, -5, 6), WOOD, { shade: 0 });
    d.flat('glow', circle(35, -12, 12), FIRE.light, 0.45);
    d.piece('flame', smooth([[29, -6, 'c'], [27, -14], [33, -18], [34, -26, 'c'], [40, -18], [42, -12], [41, -6, 'c']]), FIRE, { shade: 0 });
    d.flat('flame-heart', smooth([[32, -6, 'c'], [32, -11], [35, -16, 'c'], [38, -11], [38, -6, 'c']]), FIRE.light);
  };
}

/** A watchtower of timber with a banner: a miniboss holds it. */
export function tower(cloth: Material, snow = false): Scenery {
  return (d) => {
    ground(d, 34, 9);
    d.piece('leg-a', poly([[-22, 0], [-14, -46], [-8, -46], [-14, 0]]), WOOD, { shade: 3 });
    d.piece('leg-b', poly([[22, 0], [14, -46], [8, -46], [14, 0]]), WOOD, { shade: 3 });
    d.piece('brace', poly([[-16, -8], [14, -40], [16, -36], [-14, -4]]), { fill: WOOD.shade, shade: WOOD.shade }, { shade: 0 });
    d.piece('deck', roundRect(-24, -52, 48, 9, 2), WOOD, { shade: 0 });
    d.piece('wall', roundRect(-20, -74, 40, 24, 2), WOOD, {
      shade: 4,
      inner: (c) => {
        for (const x of [-10, 0, 10]) c.shadeOver('plank', roundRect(x - 1.2, -76, 2.4, 28, 0), 0.9);
        c.flat('slit', roundRect(-5, -68, 10, 9, 2), OUTLINE);
      },
    });
    d.piece('roof', poly([[-28, -72], [0, -98], [28, -72]]), snow ? SNOWCAP : cloth, {
      shade: snow ? 4 : 5,
      inner: (c) => c.shadeOver('eave', poly([[-28, -72], [28, -72], [28, -77], [-28, -77]]), 0.9),
    });
    d.line('staff', path().M(0, -96).L(0, -118));
    d.piece('banner', poly([[0, -118], [22, -114], [16, -108], [22, -102], [0, -104]]), cloth, { shade: 3 });
  };
}

/** A stronghold: a gate between two towers under a crown. A boss holds it. */
export function stronghold(stone: Material, cloth: Material, snow = false): Scenery {
  return (d) => {
    ground(d, 62, 12);
    const turret = (x: number, name: string): void => {
      d.piece(name, roundRect(x - 15, -78, 30, 78, 3), stone, {
        shade: 5,
        inner: (c) => {
          for (const y of [-20, -40, -60]) c.shadeOver('course', roundRect(x - 20, y, 40, 2.6, 0), 0.9);
          c.flat('slit', roundRect(x - 3, -56, 6, 16, 3), OUTLINE);
        },
      });
      d.piece(`${name}-roof`, poly([[x - 20, -76], [x, -108], [x + 20, -76]]), snow ? SNOWCAP : cloth, { shade: 5 });
      d.line(`${name}-staff`, path().M(x, -106).L(x, -122));
      d.piece(`${name}-flag`, poly([[x, -122], [x + 16, -118], [x, -113]]), GOLD, { shade: 0 });
    };
    turret(-40, 'tower-a');
    turret(40, 'tower-b');
    d.piece('wall', roundRect(-30, -56, 60, 56, 2), stone, {
      shade: 5,
      inner: (c) => {
        for (const y of [-16, -34]) c.shadeOver('course', roundRect(-34, y, 68, 2.6, 0), 0.9);
        c.flat('gate', path().M(-13, 0).L(-13, -24).Q(-13, -38, 0, -38).Q(13, -38, 13, -24).L(13, 0).Z(), OUTLINE);
        // The bars of the gate, and the crown over it.
        for (const x of [-6, 0, 6]) c.lightOver('bar', roundRect(x - 1, -36, 2, 36, 0), 0.5);
      },
    });
    for (const x of [-24, -8, 8, 24]) d.piece('merlon', roundRect(x - 6, -66, 12, 12, 2), stone, { shade: 0 });
    d.piece('crown', poly([[-14, -44], [-16, -58], [-8, -51], [0, -62], [8, -51], [16, -58], [14, -44]]), GOLD, { shade: 3 });
  };
}

/** A post with a banner in a team's color: whose side of the board this is. */
export function standard(team: Team): Scenery {
  return (d) => {
    ground(d, 12, 4, 2);
    d.piece('pole', roundRect(-3, -76, 6, 76, 2), WOOD, { shade: 0 });
    d.piece('cloth', poly([[3, -74], [36, -70], [28, -58], [36, -46], [3, -44]]), CLOTH[team], {
      shade: 4,
      inner: (c) => c.lightOver('fold', poly([[12, -74], [18, -73], [16, -44], [10, -44]]), 0.6),
    });
    d.piece('knob', circle(0, -78, 4.5), GOLD, { shade: 0 });
  };
}

/** A signpost. */
export const signpost: Scenery = (d) => {
  ground(d, 14, 4, 2);
  d.piece('post', roundRect(-3.5, -44, 7, 44, 2), WOOD, { shade: 0 });
  d.piece('board', poly([[-22, -42], [16, -42], [26, -34], [16, -26], [-22, -26]]), WOOD, {
    shade: 3,
    inner: (c) => c.shadeOver('grain', capsule(-16, -34, 12, -34, 1.6), 0.9),
  });
};

