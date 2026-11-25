// The interface's own pieces, as a set: an icon for everything a player
// can press or bring, the bars, a panel, a ledger page, buttons in three
// sizes each with its pressed state, and the plates an icon sits on. All in
// the same hand as the figures: thick outline, hard shadow, earth colors,
// firelight and blood for what matters.
//
// An icon is one thing, drawn big and plain on a square of 64, with nothing
// behind it: the game puts it on a plate, a button or a card. A bar is a
// frame and a fill; the fill is a strip that the game stretches.

import { Doc, cut } from './kit/draw';
import { limb, limbDark, rivets, stitches, stud } from './kit/figure';
import { BLOOD, BONE, GORE, LAMP, LEAD, LEATHER, MOSS, PAPER, RUST, SNOW, SOOT, TALLOW, WOOD, type Tone } from './kit/palette';
import { poly, type Pt } from './kit/path';
import type { Thing } from './things';
import { word, wordWidth } from './ui';

const FIRE: Tone = { lit: LAMP.lit, mid: LAMP.mid };
const fine = { line: 2.2, heavy: 3 };

// ------------------------------------------------------------ icons, each on 64 by 64

const ICONS: Record<string, (d: Doc) => void> = {
  // Brace: the halberd's point lowered and set, and the ground it is set against.
  'ability-brace': (d) => {
    d.ink('shaft', limb([8, 52], [44, 20], 6, 5), WOOD, { dark: limbDark([8, 52], [44, 20], 6, 6, 'i-brace', 0.4), mid: 0, ...fine });
    d.ink('blade', poly([[40, 24], [36, 12], [54, 4], [60, 18], [52, 30], [46, 22]]), LEAD, { dark: 0.3, mid: 2, rim: 1.6, ...fine });
    d.ink('heel', poly([[2, 50], [16, 46], [20, 58], [4, 60]]), SOOT, { dark: 0.4, mid: 0, ...fine });
    d.strokes('set', [[[26, 56], [40, 56]], [[44, 56], [58, 56]]], 4);
  },
  // Reap: the blade and the sweep it makes.
  'ability-reap': (d) => {
    d.ink('sweep', poly([[6, 40], [16, 20], [36, 8], [58, 10], [40, 16], [26, 26], [18, 44]]), BONE, { dark: false, mid: 0, ...fine });
    d.ink('blade', poly([[30, 34], [50, 22], [62, 34], [56, 52], [44, 44], [36, 46]]), LEAD, { dark: 0.3, mid: 2, rim: 1.6, ...fine });
    d.ink('shaft', limb([8, 60], [36, 40], 6, 5), WOOD, { dark: 0.4, mid: 0, ...fine });
  },
  // Jaw Trap: open, its teeth up.
  'ability-jawtrap': (d) => {
    d.ink('jaw-far', poly([[8, 34], [12, 18], [18, 28], [24, 12], [30, 26], [36, 10], [42, 26], [48, 14], [54, 30], [58, 36], [8, 40]]), LEAD, { dark: 0.5, mid: 0, ...fine });
    d.ink('base', poly([[4, 38], [60, 36], [62, 48], [2, 50]]), LEAD, { dark: 0.4, mid: 2, ...fine });
    d.ink('pan', poly([[24, 40], [40, 39], [42, 47], [22, 48]]), RUST, { dark: false, ...fine });
    d.pen('chain', poly([[8, 50], [4, 58], [12, 62]], false), 2.6);
  },
  // Tar Flask: a black bottle, corked, and what runs out of it.
  'ability-tarflask': (d) => {
    d.ink('flask', poly([[24, 20], [40, 20], [42, 28], [52, 40], [50, 56], [14, 56], [12, 40], [22, 28]]), LEAD, { dark: 0.36, mid: 3, rim: 1.6, ...fine });
    d.ink('cork', poly([[26, 10], [38, 10], [39, 20], [25, 20]]), TALLOW, { dark: 0.3, mid: 0, ...fine });
    d.black('tar', poly([[30, 34], [50, 40], [58, 52], [62, 62], [20, 62], [26, 50]]));
    d.scratch('shine', [[[34, 44], [44, 48]]], 2);
  },
  // Flare: light, bursting.
  'ability-flare': (d) => {
    d.ink('burst', poly([[32, 2], [38, 20], [56, 8], [46, 26], [62, 32], [46, 38], [56, 56], [38, 44], [32, 62], [26, 44], [8, 56], [18, 38], [2, 32], [18, 26], [8, 8], [26, 20]]), FIRE, { dark: false, ...fine });
    d.flat('heart', poly([[32, 18], [42, 28], [38, 42], [26, 42], [22, 28]]), LAMP.hot);
  },
  // Street Lamp.
  'ability-lamp': (d) => {
    d.ink('post', poly([[29, 40], [35, 40], [36, 60], [28, 60]]), LEAD, { dark: 0.4, mid: 0, ...fine });
    d.ink('foot', poly([[18, 62], [22, 56], [42, 56], [46, 62]]), LEAD, { dark: 0.4, mid: 0, ...fine });
    d.ink('glass', poly([[20, 18], [44, 18], [40, 42], [24, 42]]), FIRE, { dark: false, ...fine });
    d.flat('heart', poly([[30, 38], [28, 28], [32, 22], [36, 28], [34, 38]]), LAMP.hot);
    d.black('roof', poly([[14, 20], [26, 6], [38, 6], [50, 20]]));
    d.black('bar', poly([[31, 18], [33, 18], [33, 42], [31, 42]]));
  },
  // Set On: a hound's head, jaws open.
  'ability-seton': (d) => {
    d.ink('neck', poly([[4, 20], [24, 14], [30, 34], [10, 50]]), LEATHER, { dark: 0.4, mid: 2, ...fine });
    d.ink('jaw', poly([[24, 40], [56, 50], [58, 58], [28, 54]]), TALLOW, { dark: 0.3, mid: 0, ...fine });
    d.ink('skull', poly([[20, 12], [36, 10], [50, 22], [62, 32], [60, 40], [36, 40], [22, 30]]), LEATHER, { dark: poly([[30, 14], [40, 16], [48, 26], [38, 28], [30, 22]]), mid: 0, ...fine });
    d.ink('teeth', poly([[36, 40], [40, 46], [44, 41], [48, 47], [52, 42], [56, 46], [36, 43]]), BONE, { dark: false, line: 1.2, heavy: 1.4 });
    d.ink('ear', poly([[20, 14], [12, 2], [28, 10]]), LEATHER, { dark: 0.5, mid: 0, ...fine });
    d.ink('rag', poly([[10, 44], [20, 40], [22, 60], [14, 54], [10, 62]]), BLOOD, { dark: 0.4, mid: 0, ...fine });
  },
  // Heel: the whistle, and its sound.
  'ability-heel': (d) => {
    d.ink('whistle', poly([[6, 30], [34, 22], [40, 26], [42, 40], [36, 44], [8, 40]]), BONE, { dark: 0.3, mid: 3, ...fine });
    d.black('hole', poly([[26, 26], [32, 24], [33, 30], [27, 31]]));
    d.pen('cord', poly([[8, 38], [4, 52], [14, 60]], false), 2.6);
    d.strokes('sound', [[[46, 22], [58, 12]], [[48, 32], [62, 32]], [[46, 42], [58, 52]]], 4.5, LAMP.lit);
  },
  // Dodge: a boot, and the ground going by under it.
  dodge: (d) => {
    d.ink('boot', poly([[26, 8], [42, 8], [44, 30], [58, 38], [62, 46], [62, 50], [24, 50], [22, 30]]), LEATHER, { dark: poly([[16, 4], [27, 4], [27, 40], [64, 46], [64, 54], [16, 54]]), mid: 3, ...fine });
    d.black('sole', poly([[22, 48], [63, 48], [63, 54], [22, 54]]));
    d.strokes('speed', [[[18, 16], [2, 16]], [[16, 28], [4, 28]], [[18, 40], [2, 40]], [[26, 60], [6, 60]], [[52, 60], [34, 60]]], 4);
  },
  // The horn that calls them.
  horn: (d) => {
    d.ink('horn', poly([[6, 46], [10, 36], [30, 34], [46, 22], [50, 8], [62, 10], [60, 30], [44, 46], [24, 54], [10, 54]]), BONE, {
      dark: poly([[0, 46], [28, 46], [46, 34], [58, 20], [64, 30], [46, 50], [24, 58], [0, 58]]), mid: 3, ...fine,
      inner: (c) => c.flat('band', poly([[28, 32], [36, 28], [42, 46], [34, 50]]), LEAD.lit),
    });
    d.black('mouth', poly([[50, 8], [62, 10], [61, 16], [50, 14]]));
    d.pen('strap', poly([[12, 54], [20, 62], [40, 60], [50, 44]], false), 2.6);
  },
  // Pikemen: three points in a row.
  pikemen: (d) => {
    for (const [i, x] of [12, 30, 48].entries()) {
      d.ink(`shaft-${i}`, limb([x - 4, 62], [x + 2, 24], 5, 4.4), WOOD, { dark: 0.4, mid: 0, ...fine });
      d.ink(`head-${i}`, poly([[x - 3, 26], [x + 8, 24], [x + 6, 2], [x - 1, 14]]), LEAD, { dark: 0.36, mid: 0, rim: 1.2, ...fine });
    }
    d.ink('rag', poly([[14, 28], [24, 30], [22, 44], [16, 38]]), BLOOD, { dark: 0.4, mid: 0, ...fine });
  },
  // Crossbowmen: the crossbow, seen from above.
  crossbowmen: (d) => {
    d.ink('stock', poly([[26, 20], [38, 20], [36, 62], [28, 62]]), WOOD, { dark: 0.4, mid: 2, ...fine });
    d.ink('prod', poly([[2, 26], [12, 16], [32, 12], [52, 16], [62, 26], [56, 28], [48, 22], [32, 19], [16, 22], [8, 28]]), LEAD, { dark: poly([[0, 22], [64, 22], [64, 32], [0, 32]]), mid: 0, rim: 1.4, ...fine });
    d.pen('string', poly([[5, 27], [32, 40], [59, 27]], false), 2);
    d.ink('bolt', poly([[30, 40], [34, 40], [35, 8], [32, 0], [29, 8]]), BONE, { dark: false, line: 1.4, heavy: 1.8 });
  },
  // Sappers: the keg, and its fuse alight.
  sappers: (d) => {
    d.ink('keg', poly([[14, 22], [50, 22], [54, 40], [50, 60], [14, 60], [10, 40]]), WOOD, {
      dark: 0.36, mid: 3, ...fine,
      inner: (c) => {
        c.flat('hoop-a', poly([[8, 28], [56, 28], [56, 33], [8, 33]]), LEAD.mid);
        c.flat('hoop-b', poly([[8, 49], [56, 49], [56, 54], [8, 54]]), LEAD.mid);
        c.detail('staves', [[[24, 22], [22, 60]], [[40, 22], [42, 60]]], WOOD, 1.8);
      },
    });
    d.pen('fuse', poly([[32, 22], [36, 12], [46, 10]], false), 3);
    d.ink('spark', poly([[46, 0], [50, 7], [58, 4], [53, 11], [60, 16], [51, 15], [48, 22], [45, 14], [38, 14], [44, 9]]), FIRE, { dark: false, line: 1.4, heavy: 1.8 });
  },
  barricade: (d) => {
    const stake = (n: string, a: Pt, b: Pt): void => void d.ink(n, poly([[a[0] - 5, a[1]], [a[0] + 5, a[1]], [b[0] + 3, b[1] + 10], b, [b[0] - 4, b[1] + 12]]), WOOD, { dark: limbDark(a, b, 10, 10, `i-${n}`, 0.5), mid: 0, ...fine });
    stake('a', [10, 62], [26, 6]);
    stake('c', [40, 62], [56, 10]);
    d.ink('log', poly([[2, 40], [62, 36], [62, 48], [2, 52]]), WOOD, { dark: poly([[0, 46], [64, 42], [64, 56], [0, 56]]), mid: 2, ...fine });
    stake('b', [24, 62], [40, 2]);
    d.ink('rope', poly([[26, 36], [36, 35], [37, 50], [27, 51]]), TALLOW, { dark: 0.4, mid: 0, ...fine });
  },
  watchfire: (d) => {
    d.ink('flame', poly([[14, 38], [10, 22], [20, 28], [20, 8], [32, 22], [36, 2], [44, 22], [52, 14], [50, 38]]), FIRE, { dark: false, ...fine, inner: (c) => c.flat('heart', poly([[24, 38], [26, 24], [34, 14], [40, 28], [42, 38]]), LAMP.hot) });
    d.ink('bowl', poly([[8, 36], [56, 36], [50, 50], [14, 50]]), LEAD, { dark: 0.36, mid: 2, ...fine });
    d.ink('leg-a', limb([20, 50], [12, 62], 5, 4), LEAD, { dark: 0.5, mid: 0, ...fine });
    d.ink('leg-b', limb([44, 50], [52, 62], 5, 4), LEAD, { dark: false, ...fine });
  },
  bellpost: (d) => {
    d.ink('post', poly([[8, 62], [10, 8], [18, 8], [20, 62]]), WOOD, { dark: 0.45, mid: 2, ...fine });
    d.ink('arm', poly([[10, 6], [54, 8], [54, 16], [10, 16]]), WOOD, { dark: poly([[6, 12], [58, 13], [58, 20], [6, 20]]), mid: 0, ...fine });
    d.ink('bell', poly([[32, 20], [46, 20], [50, 38], [56, 48], [22, 48], [28, 38]]), LEAD, { dark: 0.36, mid: 3, rim: 1.6, ...fine });
    d.black('clapper', poly([[36, 48], [42, 48], [41, 56], [37, 56]]));
    d.pen('rope', poly([[39, 56], [40, 62]], false), 2.4);
  },
  ballista: (d) => {
    d.ink('stock', poly([[4, 44], [10, 36], [58, 20], [60, 28], [12, 48]]), WOOD, { dark: poly([[0, 42], [62, 24], [62, 34], [0, 54]]), mid: 2, ...fine });
    d.ink('prod', poly([[40, 4], [48, 6], [56, 24], [54, 40], [46, 44], [50, 26]]), LEAD, { dark: 0.36, mid: 0, rim: 1.4, ...fine });
    d.ink('bolt', poly([[14, 38], [52, 24], [64, 22], [54, 30], [16, 42]]), BONE, { dark: false, line: 1.4, heavy: 1.8 });
    d.ink('leg', limb([26, 44], [20, 62], 6, 5), WOOD, { dark: 0.5, mid: 0, ...fine });
    d.ink('leg-b', limb([34, 42], [44, 62], 6, 5), WOOD, { dark: false, ...fine });
  },
  // Supply: a crate, roped.
  supply: (d) => {
    d.ink('crate', poly([[8, 18], [54, 14], [58, 54], [10, 58]]), WOOD, { dark: 0.3, mid: 3, ...fine, inner: (c) => c.detail('boards', [[[8, 30], [56, 27]], [[9, 44], [57, 41]]], WOOD, 1.8) });
    d.ink('rope-a', poly([[28, 15], [36, 14], [38, 56], [30, 57]]), TALLOW, { dark: 0.3, mid: 0, ...fine });
    d.ink('rope-b', poly([[8, 32], [56, 28], [57, 36], [9, 40]]), TALLOW, { dark: 0.3, mid: 0, ...fine });
    d.ink('seal', poly([[27, 28], [38, 27], [40, 38], [29, 40]]), BLOOD, { dark: 0.3, mid: 0, ...fine });
  },
  // Coin: struck, clipped, with the lodge's hook on it.
  coin: (d) => {
    d.ink('coin', poly([[20, 6], [42, 4], [58, 18], [60, 40], [46, 58], [24, 60], [8, 46], [4, 24]]), FIRE, {
      dark: poly([[0, 34], [64, 44], [64, 64], [0, 64]]), mid: 3, rim: 2, ...fine,
      inner: (c) => c.strokes('hook', [[[26, 18], [36, 42]], [[36, 42], [24, 40]]], 5),
    });
    d.black('clip', poly([[52, 12], [60, 20], [50, 20]]));
  },
  // The Gravedigger's spade.
  'trophy-spade': (d) => {
    d.ink('shaft', limb([32, 62], [32, 34], 8, 7), WOOD, { dark: 0.4, mid: 0, ...fine });
    d.ink('blade', poly([[14, 36], [12, 26], [18, 10], [32, 0], [46, 10], [52, 26], [50, 36], [38, 32], [26, 32]]), LEAD, {
      dark: poly([[6, 0], [28, 0], ...cut([28, 2], [30, 40], 'i-spade', -1, 3), [6, 40]]), mid: 3, rim: 2, ...fine,
      inner: (c) => c.flat('rust', poly([[34, 20], [46, 20], [48, 34], [36, 32]]), RUST.mid),
    });
    d.ink('step', poly([[10, 32], [54, 32], [52, 40], [12, 40]]), LEAD, { dark: 0.3, mid: 0, ...fine });
  },
  // The King's tine.
  'trophy-antler': (d) => {
    d.ink('beam', limb([14, 60], [40, 22], 12, 8), WOOD, { dark: limbDark([14, 60], [40, 22], 12, 10, 'i-beam', 0.5), mid: 2, ...fine });
    d.ink('tine-a', limb([38, 26], [58, 4], 8, 2), WOOD, { dark: 0.4, mid: 0, ...fine });
    d.ink('tine-b', limb([30, 38], [8, 16], 8, 2), WOOD, { dark: 0.5, mid: 0, ...fine });
    d.ink('tine-c', limb([40, 24], [34, 2], 7, 2), WOOD, { dark: 0.4, mid: 0, ...fine });
    d.flat('frost', poly([[40, 22], [56, 6], [58, 8], [44, 24]]), BONE.lit);
    d.ink('cord', poly([[10, 50], [24, 46], [26, 54], [12, 58]]), BLOOD, { dark: 0.3, mid: 0, ...fine });
  },
  // ---- The four hunters who came after: two skills each.
  // Forge Strike: the sledge's head, its face red-hot, sparks off it.
  'ability-forgestrike': (d) => {
    d.ink('haft', limb([6, 60], [30, 34], 6, 5), WOOD, { dark: limbDark([6, 60], [30, 34], 6, 6, 'i-fs', 0.4), mid: 0, ...fine });
    d.ink('head', poly([[18, 30], [36, 12], [56, 30], [38, 48]]), LEAD, { dark: 0.3, mid: 2, rim: 1.6, ...fine });
    d.ink('face', poly([[36, 12], [56, 30], [60, 26], [40, 8]]), FIRE, { dark: false, ...fine, inner: (c) => c.flat('hot', poly([[42, 12], [56, 26], [54, 28], [40, 14]]), LAMP.hot) });
    d.strokes('sparks', [[[54, 6], [60, 2]], [[60, 14], [64, 12]], [[48, 2], [50, 0]]], 3, LAMP.lit);
  },
  // Anvil: an anvil, falling, with the marks of its fall over it.
  'ability-anvil': (d) => {
    d.ink('face', poly([[4, 30], [6, 20], [44, 18], [62, 16], [52, 26], [44, 30]]), LEAD, { dark: 0.3, mid: 2, rim: 1.6, ...fine });
    d.ink('waist', poly([[18, 30], [38, 30], [40, 42], [16, 42]]), LEAD, { dark: 0.5, mid: 0, ...fine });
    d.ink('foot', poly([[8, 54], [12, 42], [44, 42], [48, 54]]), LEAD, { dark: 0.4, mid: 2, ...fine });
    d.strokes('fall', [[[12, 2], [12, 12]], [[24, 0], [24, 12]], [[36, 2], [36, 12]]], 3.4, BONE.lit);
    d.strokes('ground', [[[2, 60], [56, 60]]], 4);
  },
  // Powder Keg: a keg with a burning fuse.
  'ability-keg': (d) => {
    d.ink('keg', poly([[10, 24], [44, 20], [52, 36], [48, 58], [14, 60], [6, 42]]), WOOD, {
      dark: 0.3, mid: 3, ...fine,
      inner: (c) => {
        c.flat('hoop-a', poly([[16, 22], [22, 22], [20, 60], [14, 60]]), LEAD.mid);
        c.flat('hoop-b', poly([[38, 20], [44, 20], [46, 58], [40, 58]]), LEAD.mid);
        c.strokes('mark', [[[24, 34], [34, 48]], [[34, 34], [24, 48]]], 3, SOOT.mid);
      },
    });
    d.pen('fuse', poly([[44, 22], [52, 14], [54, 8]], false), 2.6);
    d.ink('spark', poly([[54, 0], [57, 5], [63, 3], [59, 8], [64, 12], [58, 11], [56, 16], [54, 11], [48, 11], [52, 7]]), FIRE, { dark: false, line: 1.4, heavy: 1.8 });
  },
  // Cave-in: rocks coming down in a line onto the floor.
  'ability-cavein': (d) => {
    d.ink('roof', poly([[0, 0], [64, 0], [64, 8], [44, 12], [30, 8], [14, 12], [0, 8]]), SOOT, { dark: false, ...fine });
    for (const [i, [x, y, k]] of ([[12, 22, 1], [32, 32, 1.3], [50, 20, 0.9], [22, 48, 1.1], [44, 50, 1]] as Array<[number, number, number]>).entries()) {
      d.ink(`rock-${i}`, poly([[x - 8 * k, y + 2 * k], [x - 4 * k, y - 7 * k], [x + 6 * k, y - 6 * k], [x + 8 * k, y + 4 * k], [x, y + 8 * k]]), LEAD, { dark: 0.35, mid: 0, ...fine });
    }
    d.strokes('fall', [[[12, 10], [12, 14]], [[50, 10], [50, 12]]], 2.4, BONE.lit);
  },
  // Shove: the pole's foot driven forward, and the push of it.
  'ability-shove': (d) => {
    d.ink('pole', limb([2, 44], [46, 30], 6, 6), WOOD, { dark: limbDark([2, 44], [46, 30], 6, 6, 'i-shove', 0.4), mid: 0, ...fine });
    d.ink('shoe', poly([[42, 26], [54, 22], [58, 32], [46, 36]]), LEAD, { dark: 0.3, mid: 0, ...fine });
    d.strokes('push', [[[50, 10], [60, 6]], [[58, 20], [64, 18]], [[58, 42], [64, 46]], [[50, 50], [58, 56]]], 3.4, BONE.lit);
    d.ink('binding', poly([[20, 34], [28, 32], [30, 40], [22, 42]]), BLOOD, { dark: 0.3, mid: 0, ...fine });
  },
  // Lantern Wake: a lantern swinging, and the trail of light it leaves behind it.
  'ability-wake': (d) => {
    for (const [i, [x, y, k]] of ([[8, 52, 0.6], [18, 46, 0.8], [28, 40, 1]] as Array<[number, number, number]>).entries()) {
      d.flat(`patch-${i}`, poly([[x - 8 * k, y], [x, y - 4 * k], [x + 8 * k, y], [x, y + 4 * k]]), LAMP.mid, 0.6 + i * 0.1);
    }
    d.pen('hook', poly([[44, 2], [48, 8], [44, 14]], false), 2.6);
    d.ink('lantern', poly([[34, 16], [54, 16], [52, 40], [36, 40]]), FIRE, { dark: false, ...fine, inner: (c) => c.flat('heart', poly([[40, 36], [44, 24], [48, 36]]), LAMP.hot) });
    d.black('roof', poly([[30, 18], [38, 10], [50, 10], [58, 18]]));
    d.black('bar', poly([[43, 16], [45, 16], [45, 40], [43, 40]]));
  },
  // Hook: the meat hook on its chain, thrown.
  'ability-hook': (d) => {
    d.pen('chain', poly([[4, 60], [14, 48], [24, 40], [32, 30]], false), 3.4);
    d.strokes('links', [[[8, 56], [12, 50]], [[18, 44], [22, 40]], [[26, 36], [30, 32]]], 2, LEAD.lit);
    d.ink('hook', poly([[32, 30], [40, 18], [52, 8], [60, 14], [58, 28], [50, 40], [52, 30], [52, 20], [46, 18], [40, 28]]), LEAD, { dark: 0.3, mid: 0, rim: 1.4, ...fine });
    d.ink('point', poly([[50, 40], [44, 46], [46, 38]]), LEAD, { dark: 0.3, mid: 0, ...fine });
  },
  // Hack: the cleaver, and the cuts it leaves, in a row.
  'ability-hack': (d) => {
    d.ink('blade', poly([[6, 8], [42, 4], [44, 30], [10, 34]]), LEAD, { dark: 0.3, mid: 2, rim: 1.6, ...fine, inner: (c) => c.black('hole', poly([[34, 10], [38, 10], [38, 14], [34, 14]])) });
    d.ink('grip', limb([10, 22], [2, 44], 6, 5), WOOD, { dark: 0.4, mid: 0, ...fine });
    d.strokes('cuts', [[[30, 40], [40, 62]], [[40, 38], [50, 60]], [[50, 36], [60, 58]]], 4, GORE.lit);
  },
  // The Spinner's silk: a skein of her grey thread, wound and tied.
  'trophy-silk': (d) => {
    d.ink('skein', poly([[10, 30], [18, 14], [34, 8], [50, 14], [56, 30], [50, 48], [34, 56], [18, 50]]), BONE, {
      dark: poly([[0, 34], [64, 40], [64, 64], [0, 64]]), mid: 3, ...fine,
      inner: (c) => c.detail('turns', [[[14, 24], [52, 18]], [[12, 32], [56, 28]], [[14, 42], [54, 38]], [[20, 50], [50, 48]]], BONE, 2),
    });
    d.ink('tie', poly([[28, 4], [38, 4], [40, 60], [26, 60]]), BLOOD, { dark: 0.3, mid: 0, ...fine });
    d.pen('loose', poly([[52, 40], [60, 52], [58, 62]], false), 2, BONE.lit);
  },
  // The Abbot's bell rope: a length of rope with its tufted grip, green at the end.
  'trophy-bellrope': (d) => {
    d.ink('rope', poly([[22, 0], [32, 0], [36, 40], [26, 40]]), TALLOW, { dark: 0.3, mid: 0, ...fine, inner: (c) => c.detail('twist', stitches([26, 4], [32, 38], 6, 6, 0.6), TALLOW, 1.6) });
    d.ink('sally', poly([[20, 36], [42, 34], [46, 54], [36, 62], [24, 62], [16, 52]]), BLOOD, { dark: 0.35, mid: 3, ...fine, inner: (c) => c.detail('tufts', [[[24, 44], [26, 56]], [[32, 42], [34, 58]], [[40, 42], [40, 54]]], BLOOD, 1.6) });
    d.flat('weed', poly([[30, 6], [36, 8], [34, 22], [30, 20]]), MOSS.mid);
  },
  // The Furnace's grate: a square of iron bars, red-hot behind.
  'trophy-grate': (d) => {
    d.ink('frame', poly([[6, 8], [58, 6], [60, 58], [4, 60]]), LEAD, { dark: 0.3, mid: 2, rim: 1.6, ...fine });
    d.ink('fire', poly([[12, 14], [52, 12], [54, 52], [10, 54]]), FIRE, { dark: false, ...fine, inner: (c) => c.flat('heart', poly([[18, 30], [46, 28], [48, 50], [16, 50]]), LAMP.hot) });
    for (let i = 0; i < 5; i++) d.black(`bar-${i}`, poly([[14 + i * 9, 12], [18 + i * 9, 12], [19 + i * 9, 54], [15 + i * 9, 54]]));
    rivets(d, 'bolts', [10, 10], [56, 8], 4, 2);
  },
  // The Mirror shard: a long splinter of mirror, bound at its foot, the cold light in it.
  'trophy-shard': (d) => {
    d.ink('shard', poly([[18, 60], [14, 44], [38, 4], [52, 0], [44, 22], [30, 52]]), LEAD, {
      dark: poly([[0, 30], [20, 30], [36, 0], [0, 0]]), mid: 0, rim: 1.6, ...fine,
      inner: (c) => {
        c.flat('light', poly([[30, 30], [44, 8], [48, 6], [36, 32]]), SNOW.mid);
        c.strokes('glint', [[[40, 14], [46, 6]]], 2, SNOW.lit);
      },
    });
    d.ink('binding', poly([[12, 48], [30, 52], [26, 62], [10, 58]]), LEATHER, { dark: 0.3, mid: 0, ...fine });
  },
  // ---- What the screens ask for besides the abilities, in the same hand.
  // Attack: the hunter's own blow, a short broad blade and the cut it makes.
  attack: (d) => {
    d.strokes('cut', [[[6, 30], [26, 8]], [[14, 44], [40, 14]]], 4, BONE.lit);
    d.ink('blade', poly([[18, 50], [46, 12], [58, 4], [54, 18], [24, 54]]), LEAD, { dark: poly([[0, 64], [21, 52], [56, 10], [64, 16], [64, 64]]), mid: 2, rim: 1.8, ...fine });
    d.ink('guard', poly([[10, 44], [16, 40], [34, 58], [28, 62]]), LEAD, { dark: 0.4, mid: 0, ...fine });
    d.ink('grip', limb([20, 50], [6, 62], 6, 6), LEATHER, { dark: 0.4, mid: 0, ...fine });
  },
  // Health: a heart as the butcher knows it, dark red, its vessels at the top.
  heart: (d) => {
    d.ink('heart', poly([[32, 60], [10, 40], [4, 24], [10, 12], [22, 10], [32, 18], [42, 10], [54, 12], [60, 24], [54, 40]]), BLOOD, {
      dark: 0.35, mid: 3, rim: 1.6, ...fine,
      inner: (c) => c.detail('vein', [[[36, 22], [30, 40]], [[30, 40], [36, 52]]], BLOOD, 2),
    });
    d.ink('vessel', poly([[26, 14], [26, 2], [34, 2], [34, 16]]), GORE, { dark: 0.4, mid: 0, ...fine });
  },
  // A sack of takings, its neck tied, a coin out of it.
  sack: (d) => {
    d.ink('sack', poly([[22, 20], [12, 34], [8, 50], [16, 60], [48, 60], [56, 50], [52, 34], [42, 20]]), TALLOW, { dark: 0.4, mid: 3, ...fine, inner: (c) => c.detail('folds', [[[22, 30], [18, 50]], [[40, 28], [44, 50]]], TALLOW, 2) });
    d.ink('neck', poly([[22, 20], [20, 6], [30, 12], [36, 4], [44, 8], [42, 20]]), TALLOW, { dark: 0.4, mid: 0, ...fine });
    d.ink('tie', poly([[20, 18], [44, 16], [44, 22], [20, 24]]), BLOOD, { dark: 0.3, mid: 0, ...fine });
    d.ink('coin', poly([[46, 50], [52, 44], [60, 46], [62, 54], [56, 60], [48, 58]]), FIRE, { dark: 0.4, mid: 0, rim: 1.2, ...fine });
  },
  // Locked: a padlock of black iron, its keyhole cut.
  lock: (d) => {
    d.ink('shackle', poly([[16, 30], [16, 18], [24, 6], [40, 6], [48, 18], [48, 30], [40, 30], [40, 20], [36, 14], [28, 14], [24, 20], [24, 30]]), LEAD, { dark: 0.4, mid: 0, rim: 1.2, ...fine });
    d.ink('body', poly([[8, 30], [56, 28], [58, 58], [6, 60]]), SOOT, { dark: poly([[0, 46], ...cut([0, 46], [64, 44], 'i-lock', 1, 3), [64, 64], [0, 64]]), mid: 3, rim: 1.6, ...fine });
    d.black('keyhole', poly([[29, 36], [35, 36], [35, 44], [37, 52], [27, 52], [29, 44]]));
    rivets(d, 'lock-rivets', [12, 34], [52, 32], 2, 1.8);
  },
  // Done: a tick cut deep, as a tally is.
  check: (d) => {
    d.ink('tick', poly([[4, 34], [14, 26], [26, 40], [52, 6], [62, 14], [28, 58], [20, 58]]), BONE, { dark: poly([[0, 40], [24, 48], [64, 12], [64, 64], [0, 64]]), mid: 2, ...fine });
    d.scratch('nick', [[[30, 44], [48, 20]]], 1.6);
  },
  // Settings: a cog of black iron with a bolt through it.
  cog: (d) => {
    const pts: Pt[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 29 : 21;
      pts.push([32 + Math.cos(a) * r, 32 + Math.sin(a) * r]);
    }
    d.ink('cog', poly(pts), LEAD, { dark: 0.3, mid: 3, rim: 1.4, ...fine });
    d.ink('bolt', poly([[24, 24], [40, 24], [42, 32], [40, 40], [24, 40], [22, 32]]), SOOT, { dark: 0.4, mid: 0, ...fine });
    d.scratch('bolt-cut', [[[27, 32], [37, 32]]], 2.4);
  },
  // Sound on: a hand bell and the ring off it.
  sound: (d) => {
    d.ink('handle', limb([20, 4], [24, 18], 6, 6), WOOD, { dark: false, mid: 0, ...fine });
    d.ink('bell', poly([[20, 18], [30, 18], [36, 32], [44, 48], [6, 48], [14, 32]]), LEAD, { dark: 0.4, mid: 3, rim: 1.6, ...fine });
    d.black('clapper', poly([[22, 48], [28, 48], [27, 56], [23, 56]]));
    d.strokes('ring', [[[48, 22], [58, 14]], [[50, 34], [62, 34]], [[48, 46], [58, 54]]], 4, LAMP.lit);
  },
  // Sound off: the same bell, a red cross over its ring.
  mute: (d) => {
    d.ink('handle', limb([20, 4], [24, 18], 6, 6), WOOD, { dark: false, mid: 0, ...fine });
    d.ink('bell', poly([[20, 18], [30, 18], [36, 32], [44, 48], [6, 48], [14, 32]]), LEAD, { dark: 0.4, mid: 3, ...fine });
    d.black('clapper', poly([[22, 48], [28, 48], [27, 56], [23, 56]]));
    d.ink('cross', poly([[44, 18], [50, 22], [56, 16], [62, 22], [56, 28], [62, 34], [56, 40], [50, 34], [44, 40], [38, 34], [44, 28], [38, 22]]), GORE, { dark: 0.3, mid: 0, ...fine });
  },
  // Pause: two bars of iron, nailed, as a door is barred.
  hold: (d) => {
    for (const [i, x] of [12, 38].entries()) {
      d.ink(`bar-${i}`, poly([[x, 6], [x + 14, 6], [x + 14, 58], [x, 58]]), LEAD, { dark: poly([[x + 8, 0], [x + 20, 0], [x + 20, 64], [x + 8, 64]]), mid: 2, rim: 1.4, ...fine });
      rivets(d, `bar-${i}-nails`, [x + 7, 12], [x + 7, 52], 2, 2);
    }
  },
  // A prize: a dented pewter cup on its foot.
  trophy: (d) => {
    d.ink('foot', poly([[16, 60], [20, 52], [44, 52], [48, 60]]), LEAD, { dark: 0.4, mid: 0, ...fine });
    d.ink('stem', poly([[28, 40], [36, 40], [38, 52], [26, 52]]), LEAD, { dark: 0.5, mid: 0, ...fine });
    d.ink('cup', poly([[8, 6], [56, 6], [52, 26], [40, 40], [24, 40], [12, 26]]), LEAD, { dark: poly([[36, 0], ...cut([36, 0], [34, 44], 'i-cup', 1, 3), [64, 44], [64, 0]]), mid: 3, rim: 1.8, ...fine, inner: (c) => c.black('dent', poly([[18, 18], [24, 16], [22, 24]])) });
    d.pen('handle-l', poly([[10, 12], [2, 16], [6, 28], [14, 28]], false), 3);
    d.pen('handle-r', poly([[54, 12], [62, 16], [58, 28], [50, 28]], false), 3);
  },
  // A mark of worth: a star cut from tin and nailed up, one point bent.
  star: (d) => {
    const pts: Pt[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 30 : 12;
      pts.push([32 + Math.cos(a) * r, 34 + Math.sin(a) * r - (i === 2 ? 3 : 0)]);
    }
    d.ink('star', poly(pts), FIRE, { dark: 0.3, mid: 2, rim: 1.4, ...fine });
    d.black('nail', poly([[30, 32], [34, 32], [34, 36], [30, 36]]));
  },
  // A sword, point up, plain and notched.
  sword: (d) => {
    d.ink('blade', poly([[28, 44], [28, 10], [32, 2], [36, 10], [36, 44]]), LEAD, { dark: poly([[32, 0], [40, 0], [40, 48], [32, 48]]), mid: 0, rim: 1.6, ...fine, inner: (c) => c.black('notch', poly([[28, 22], [31, 24], [28, 26]])) });
    d.ink('guard', poly([[14, 44], [50, 42], [50, 48], [14, 50]]), LEAD, { dark: 0.4, mid: 0, ...fine });
    d.ink('grip', poly([[29, 48], [35, 48], [35, 58], [29, 58]]), LEATHER, { dark: 0.4, mid: 0, ...fine });
    d.ink('pommel', poly([[26, 58], [38, 58], [36, 64], [28, 64]]), LEAD, { dark: 0.4, mid: 0, ...fine });
  },
  // Close: two strokes of red, crossed.
  cross: (d) => {
    d.ink('a', poly([[6, 14], [14, 6], [58, 50], [50, 58]]), BLOOD, { dark: 0.35, mid: 0, rim: 1.2, ...fine });
    d.ink('b', poly([[50, 6], [58, 14], [14, 58], [6, 50]]), BLOOD, { dark: 0.35, mid: 0, rim: 1.2, ...fine });
  },
  // Onward: an arrow, pointing right, its fletching ragged.
  arrow: (d) => {
    d.ink('shaft', poly([[8, 29], [46, 29], [46, 35], [8, 35]]), WOOD, { dark: 0.4, mid: 0, ...fine });
    d.ink('head', poly([[42, 18], [62, 32], [42, 46], [46, 32]]), LEAD, { dark: poly([[40, 32], [64, 32], [64, 50], [40, 50]]), mid: 0, rim: 1.6, ...fine });
    d.ink('fletch-a', poly([[2, 18], [12, 18], [22, 30], [10, 30]]), BLOOD, { dark: 0.3, mid: 0, ...fine });
    d.ink('fletch-b', poly([[2, 46], [12, 46], [22, 34], [10, 34]]), BLOOD, { dark: 0.4, mid: 0, ...fine });
  },
  // Time: an hourglass in a wooden frame, most of its sand run.
  hourglass: (d) => {
    d.ink('glass', poly([[18, 10], [46, 10], [36, 32], [46, 54], [18, 54], [28, 32]]), SNOW, { dark: 0.3, mid: 0, ...fine });
    d.ink('sand-top', poly([[24, 20], [40, 20], [34, 30], [30, 30]]), TALLOW, { dark: false, line: 1.2, heavy: 1.6 });
    d.ink('sand-low', poly([[20, 54], [26, 44], [32, 40], [38, 44], [44, 54]]), TALLOW, { dark: 0.3, mid: 0, line: 1.2, heavy: 1.6 });
    d.pen('run', poly([[32, 30], [32, 42]], false), 1.6, TALLOW.lit);
    d.ink('top', poly([[8, 4], [56, 4], [56, 12], [8, 12]]), WOOD, { dark: 0.4, mid: 0, ...fine });
    d.ink('bottom', poly([[8, 52], [56, 52], [56, 60], [8, 60]]), WOOD, { dark: 0.4, mid: 0, ...fine });
    d.ink('post-l', poly([[10, 12], [15, 12], [15, 52], [10, 52]]), WOOD, { dark: 0.4, mid: 0, ...fine });
    d.ink('post-r', poly([[49, 12], [54, 12], [54, 52], [49, 52]]), WOOD, { dark: 0.6, mid: 0, ...fine });
  },
  // A banner: a ragged red cloth on a pole, its foot driven in.
  banner: (d) => {
    d.ink('pole', limb([14, 62], [14, 4], 5, 5), WOOD, { dark: false, mid: 0, ...fine });
    d.ink('cloth', poly([[16, 8], [56, 10], [52, 22], [58, 36], [46, 34], [40, 44], [32, 36], [16, 40]]), BLOOD, {
      dark: poly([[0, 28], ...cut([0, 28], [64, 26], 'i-banner', 1, 3), [64, 48], [0, 48]]), mid: 3, ...fine,
      inner: (c) => c.strokes('mark', [[[28, 18], [38, 30]], [[38, 18], [28, 30]]], 3, BONE.mid),
    });
    d.ink('finial', poly([[10, 4], [14, 0], [18, 4], [14, 8]]), LEAD, { dark: 0.3, mid: 0, ...fine });
  },
};

// ------------------------------------------------------------ plates, bars, boards

/** The plate an ability's icon sits on: a round of iron, nailed. Pressed, it is sunk and dark. Spent, it is cold. */
function slot(state: 'up' | 'down' | 'spent'): (d: Doc) => void {
  return (d) => {
    const dy = state === 'down' ? 3 : 0;
    const ring: Pt[] = [[26, 2], [54, 2], [76, 22], [78, 54], [56, 78], [24, 78], [4, 56], [2, 24]];
    if (state !== 'down') d.black('drop', poly(ring.map(([x, y]) => [x + 1, y + 5] as Pt)));
    d.ink('rim', poly(ring.map(([x, y]) => [x, y + dy] as Pt)), LEAD, { dark: 0.3, mid: 3, rim: state === 'up' ? 2 : 0 });
    d.ink('well', poly([[28, 10], [52, 10], [70, 26], [70, 52], [54, 70], [26, 70], [10, 54], [10, 26]].map(([x, y]) => [x, y + dy] as Pt)), state === 'spent' ? { lit: SOOT.mid, mid: SOOT.mid } : SOOT, { dark: state === 'down' ? 0.6 : 0.24, mid: 3, line: 1.8, heavy: 2.4 });
    for (const [i, p] of ([[14, 14], [66, 14], [66, 66], [14, 66]] as Pt[]).entries()) stud(d, `nail-${i}`, [p[0], p[1] + dy], 2.2);
  };
}

/** A button: a board with iron at its ends, at a size. Pressed, it sits lower and its face is in shadow. */
function board(w: number, h: number, pressed: boolean): (d: Doc) => void {
  return (d) => {
    const dy = pressed ? 3 : 0;
    const P = (x: number, y: number): Pt => [x, y + dy];
    if (!pressed) d.black('drop', poly([[6, 12], [w - 4, 8], [w - 2, h - 2], [4, h]]));
    d.ink('board', poly([P(6, 8), P(w * 0.5, 5), P(w - 6, 4), P(w - 3, h - 12), P(w * 0.52, h - 9), P(4, h - 8)]), pressed ? { lit: WOOD.mid, mid: WOOD.mid } : WOOD, {
      dark: pressed ? false : poly([P(0, h - 22), ...cut(P(0, h - 20), P(w, h - 24), `btn-${w}`, 1, 3), P(w, h), P(0, h)]),
      mid: 3,
      inner: (c) => c.detail('grain', [[P(w * 0.2, h * 0.26), P(w * 0.5, h * 0.24)], [P(w * 0.4, h * 0.42), P(w * 0.8, h * 0.38)], [P(w * 0.22, h * 0.56), P(w * 0.46, h * 0.55)]], WOOD, 1.8),
    });
    const band = (name: string, x: number): void => {
      const bw = Math.max(12, w * 0.085);
      d.ink(name, poly([P(x, 4), P(x + bw, 3), P(x + bw + 1, h - 9), P(x + 1, h - 8)]), LEAD, { dark: pressed ? 0.6 : 0.3, mid: 2, line: 1.8, heavy: 2.4, rim: pressed ? 0 : 1.4 });
      stud(d, `${name}-a`, P(x + bw / 2, h * 0.24), 2.2);
      stud(d, `${name}-b`, P(x + bw / 2 + 0.6, h * 0.62), 2.2);
    };
    band('iron-a', 6);
    band('iron-b', w - 6 - Math.max(12, w * 0.085) - 1);
  };
}

/** A bar's frame: iron round a black trough, capped at the ends. `parts` cuts the trough with that many less one posts. */
function barFrame(w: number, h: number, parts = 1): (d: Doc) => void {
  return (d) => {
    d.ink('frame', poly([[2, 4], [w - 4, 2], [w - 2, h - 4], [4, h - 2]]), LEAD, { dark: poly([[0, h * 0.6], [w, h * 0.56], [w, h], [0, h]]), mid: 2, rim: 1.4, inner: (c) => c.flat('rust', poly([[w * 0.3, h * 0.6], [w * 0.5, h * 0.58], [w * 0.5, h], [w * 0.3, h]]), RUST.mid, 0.6) });
    d.black('trough', poly([[10, 9], [w - 10, 8], [w - 10, h - 9], [10, h - 8]]));
    for (let i = 1; i < parts; i++) {
      const x = 10 + ((w - 20) * i) / parts;
      d.ink(`post-${i}`, poly([[x - 4, 3], [x + 4, 3], [x + 5, h - 3], [x - 5, h - 3]]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
      stud(d, `post-${i}-nail`, [x, h / 2], 2);
    }
    rivets(d, 'caps', [6, h / 2], [6.01, h / 2 + 0.01], 1, 2);
  };
}

/** A strip of a bar's fill, 16 wide, for the game to stretch: a lit top, the color, a dark foot. */
function fill(tone: Tone, hot?: string): (d: Doc) => void {
  return (d) => {
    d.flat('fill', poly([[0, 0], [16, 0], [16, 18], [0, 18]]), tone.lit);
    d.flat('foot', poly([[0, 11], [16, 11], [16, 18], [0, 18]]), tone.mid);
    d.flat('top', poly([[0, 0], [16, 0], [16, 3], [0, 3]]), hot ?? tone.lit);
  };
}

/** A panel: a board of planks with iron corners. The game cuts it into nine and stretches the middle. */
function panel(d: Doc): void {
  d.black('drop', poly([[8, 12], [356, 8], [358, 258], [6, 260]]));
  d.ink('boards', poly([[6, 6], [354, 4], [356, 250], [4, 254]]), WOOD, {
    dark: poly([[0, 226], ...cut([0, 228], [360, 222], 'panel', 1, 4), [360, 262], [0, 262]]), mid: 5,
    inner: (c) => {
      c.strokes('gaps', [[[6, 88], [354, 86]], [[6, 170], [354, 168]]], 2.6);
      c.detail('grain', [[[40, 30], [160, 28]], [[200, 56], [320, 54]], [[60, 120], [200, 118]], [[220, 140], [330, 138]], [[40, 200], [180, 198]], [[230, 216], [320, 214]]], WOOD, 2);
      c.detail('knots', [[[280, 110], [292, 116]], [[292, 116], [280, 122]], [[90, 196], [100, 202]]], WOOD, 2.4);
    },
  });
  const corner = (n: string, x: number, y: number, sx: number, sy: number): void => {
    d.ink(n, poly([[x, y], [x + 34 * sx, y], [x + 34 * sx, y + 10 * sy], [x + 10 * sx, y + 10 * sy], [x + 10 * sx, y + 34 * sy], [x, y + 34 * sy]]), LEAD, { dark: sy < 0 ? 0.6 : 0.24, mid: 2, line: 1.8, heavy: 2.4, rim: sy > 0 ? 1.4 : 0 });
    stud(d, `${n}-a`, [x + 5 * sx, y + 5 * sy], 2.4);
    stud(d, `${n}-b`, [x + 26 * sx, y + 5 * sy], 2);
    stud(d, `${n}-c`, [x + 5 * sx, y + 26 * sy], 2);
  };
  corner('c-tl', 4, 4, 1, 1);
  corner('c-tr', 356, 2, -1, 1);
  corner('c-bl', 2, 254, 1, -1);
  corner('c-br', 358, 252, -1, -1);
}

/** The muster's ledger: a page ruled in columns, with a heading, a thumb mark and the lodge's seal. */
function ledger(d: Doc): void {
  d.ink('cover', poly([[2, 6], [316, 2], [320, 394], [4, 398]]), LEATHER, { dark: 0.14, mid: 4, inner: (c) => c.detail('cover-stitch', stitches([10, 12], [10, 390], 30, 4, 0), LEATHER, 1.4) });
  d.ink('page', poly([[18, 14], [306, 10], [310, 384], [20, 388]]), PAPER, {
    dark: false,
    inner: (c) => {
      c.flat('fox', poly([[240, 300], [320, 280], [320, 400], [220, 400]]), PAPER.mid, 0.7);
      c.flat('thumb', poly([[30, 330], [48, 324], [56, 344], [40, 356], [28, 346]]), PAPER.mid, 0.8);
      c.pen('head-rule', poly([[28, 64], [300, 60]], false), 3);
      c.pen('margin', poly([[70, 70], [74, 380]], false), 1.6, RUST.mid);
      c.pen('sum', poly([[236, 66], [240, 380]], false), 1.6, RUST.mid);
      for (let i = 0; i < 9; i++) c.detail(`rule-${i}`, [[[28, 96 + i * 32], [300, 92 + i * 32]]], PAPER, 2.2);
    },
  });
  word(d, 'MUSTER', 164 - wordWidth('MUSTER', 0.9, 3) / 2, 26, 0.9, { lit: '#14110f', mid: '#14110f' }, 3, 0.01);
  d.pen('ribbon', poly([[150, 2], [152, 30]], false), 5, BLOOD.lit);
}

/** The digits and marks, as a board to read them off. */
function numerals(d: Doc): void {
  d.ink('board', poly([[4, 6], [476, 2], [480, 66], [2, 70]]), SOOT, { dark: false });
  word(d, '0123456789+-/:.%!?', 14, 14, 1.2, BONE, 3.4, 2.4);
}

const UP = { lit: GORE.lit, mid: GORE.mid };

export const INTERFACE: Thing[] = [
  ...Object.entries(ICONS).map(([id, draw]): Thing => ({
    id: `icon-${id}`, set: 'icons', width: 64, height: 64, origin: [32, 32],
    draw: (d) => {
      // An icon is lit nearly all over: on a dark plate its black would be lost.
      d.darkScale = 0.45;
      draw(d);
    },
  })),
  { id: 'slot', set: 'ui', width: 82, height: 86, origin: [40, 40], draw: slot('up') },
  { id: 'slot-pressed', set: 'ui', width: 82, height: 86, origin: [40, 40], draw: slot('down') },
  { id: 'slot-spent', set: 'ui', width: 82, height: 86, origin: [40, 40], draw: slot('spent') },
  { id: 'button-large', set: 'ui', width: 244, height: 72, origin: [122, 36], draw: board(244, 72, false) },
  { id: 'button-large-pressed', set: 'ui', width: 244, height: 72, origin: [122, 36], draw: board(244, 72, true) },
  { id: 'button-medium', set: 'ui', width: 176, height: 58, origin: [88, 29], draw: board(176, 58, false) },
  { id: 'button-medium-pressed', set: 'ui', width: 176, height: 58, origin: [88, 29], draw: board(176, 58, true) },
  { id: 'button-small', set: 'ui', width: 112, height: 46, origin: [56, 23], draw: board(112, 46, false) },
  { id: 'button-small-pressed', set: 'ui', width: 112, height: 46, origin: [56, 23], draw: board(112, 46, true) },
  { id: 'bar-frame', set: 'ui', width: 300, height: 34, origin: [150, 17], draw: barFrame(300, 34) },
  { id: 'bar-frame-monster', set: 'ui', width: 520, height: 38, origin: [260, 19], draw: barFrame(520, 38, 3) },
  { id: 'bar-frame-stagger', set: 'ui', width: 360, height: 26, origin: [180, 13], draw: barFrame(360, 26) },
  { id: 'fill-health', set: 'ui', width: 16, height: 18, origin: [0, 0], draw: fill(BLOOD, GORE.lit) },
  { id: 'fill-monster', set: 'ui', width: 16, height: 18, origin: [0, 0], draw: fill(UP, '#e0564a') },
  { id: 'fill-stagger', set: 'ui', width: 16, height: 18, origin: [0, 0], draw: fill(FIRE, LAMP.hot) },
  { id: 'fill-wait', set: 'ui', width: 16, height: 18, origin: [0, 0], draw: fill(LEAD, BONE.lit) },
  { id: 'panel', set: 'ui', width: 362, height: 264, origin: [181, 132], draw: panel },
  { id: 'ledger', set: 'ui', width: 324, height: 402, origin: [162, 201], draw: ledger },
  { id: 'numerals', set: 'ui', width: 484, height: 74, origin: [242, 37], draw: numerals },
];

/** How the pieces the game stretches are cut: [left, top, right, bottom], the parts that are not stretched. */
export const SLICES: Record<string, readonly [number, number, number, number]> = {
  panel: [44, 44, 44, 44],
  'bar-frame': [14, 10, 14, 10],
  'bar-frame-stagger': [14, 9, 14, 9],
  'button-large': [34, 12, 34, 14],
  'button-medium': [28, 10, 28, 12],
  'button-small': [22, 8, 22, 10],
};
