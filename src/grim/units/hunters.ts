// The hunters. Each is drawn for themselves: a build, a hat or a hood that
// nobody else has, one thing of their trade drawn big, the lodge's dull red
// somewhere on them, and one thing that is lamplight, so that the player's
// own figure is found at once in a dark lair.
//
// Each has two layers. The first is the big shapes and the black, which is
// all that is seen at the size the game shows them. The second is what they
// carry and what their clothes are made of, drawn quietly in each piece's own
// middle tone, for when they are seen big.

import { Doc, cut } from '../kit/draw';
import { along, arm, between, blot, boot, chain, face, fist, hem, limb, limbDark, neck, pouch, rivets, stitches, strap, stud } from '../kit/figure';
import { BLOOD, BONE, LAMP, LEAD, LEATHER, MOSS, RUST, SCRATCH, SOOT, TALLOW, WOOD } from '../kit/palette';
import { poly, type Pt } from '../kit/path';
import { part, type UnitArt } from '../kit/unit';
import { BRACE, CLEAVE, FALL, HIT, JAB, POINT, RAISE_LIGHT, REAP, SET_DOWN, SHOULDER_LOOSE, UNDERHAND, WHISTLE } from '../poses';

/** The canvas hunters and other people are drawn on, and where they stand on it. */
export const PERSON: readonly [number, number] = [256, 256];
export const PERSON_FEET: Pt = [128, 240];
export const PERSON_MARGIN = 80;

/** A lantern: an iron cage with the light in it. `at` is the ring it hangs by. */
export function lantern(d: Doc, name: string, at: Pt, k = 1): void {
  const [x, y] = at;
  const P = (dx: number, dy: number): Pt => [x + dx * k, y + dy * k];
  d.pen(`${name}-ring`, poly([P(-2.5, 3), P(0, 0), P(2.5, 3), P(0, 6), P(-2.5, 3)], false), 1.8);
  // The light first, then the cage's bars over it in black.
  d.ink(`${name}-glass`, poly([P(-6, 9), P(6, 9), P(7.5, 23), P(-7.5, 23)]), { lit: LAMP.lit, mid: LAMP.mid }, {
    dark: false, line: 1.6, heavy: 2.4,
    inner: (c) => c.flat(`${name}-low`, poly([P(-8, 18), P(8, 17), P(8, 24), P(-8, 24)]), LAMP.mid),
  });
  d.flat(`${name}-heart`, poly([P(-2.2, 20), P(-3, 15), P(0, 10.5), P(3, 15), P(2.2, 20)]), LAMP.hot);
  d.black(`${name}-cap`, poly([P(-8.5, 9.5), P(-5, 4.5), P(5, 4.5), P(8.5, 9.5)]));
  d.black(`${name}-vent`, poly([P(-2.5, 5), P(2.5, 5), P(1.5, 2), P(-1.5, 2)]));
  d.black(`${name}-foot`, poly([P(-9, 22.5), P(9, 22.5), P(7, 26.5), P(-7, 26.5)]));
  d.black(`${name}-bar`, poly([P(-0.9, 9), P(0.9, 9), P(0.9, 23), P(-0.9, 23)]));
  d.black(`${name}-bar-l`, poly([P(-6.4, 9), P(-5, 9), P(-6.2, 23), P(-7.6, 23)]));
}

/** A big iron key on a ring. */
function keyOn(d: Doc, name: string, at: Pt, deg: number, len = 14): void {
  const a = (deg * Math.PI) / 180;
  const P = (t: number, n: number): Pt => [at[0] + Math.cos(a) * t - Math.sin(a) * n, at[1] + Math.sin(a) * t + Math.cos(a) * n];
  d.ink(name, poly([P(0, -1.2), P(len, -1.2), P(len, -4.5), P(len + 2, -4.5), P(len + 2, 1.2), P(len - 3, 1.2), P(len - 3, 3.6), P(len - 5.5, 3.6), P(len - 5.5, 1.2), P(0, 1.2)]), LEAD, { dark: false, line: 1.3, heavy: 1.6 });
}

/**
 * Marta Voss, the Warden: keeper of the gate the dead are carried through. Heavy and planted. A plain iron
 * kettle helm strapped under her jaw, a hide across shoulders as wide as a door, a short quilted jack belted
 * with the lodge's red, the gate's keys at her hip, fists like mallets on a halberd stood upright, and her
 * lamp hung low on its shaft.
 */
const marta: UnitArt = {
  id: 'marta',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { cleave: CLEAVE, reap: REAP },
  stills: { brace: BRACE, hit: HIT, fall: FALL },
  muzzle: [222, 30],
  top: 40,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [136, 240], 118, 13)),
    part('leg-back', 'legBack', 'root', [112, 192], (d) => {
      d.ink('hose', limb([112, 186], [106, 222], 22, 18, 2), WOOD, { dark: 0.62, mid: 3 });
      boot(d, 'boot', [106, 240], [106, 214], LEATHER, 44, 21);
    }),
    part('leg-front', 'legFront', 'root', [152, 192], (d) => {
      d.ink('hose', limb([152, 186], [158, 222], 24, 19, 2), WOOD, {
        // The inside of the leg is in the other leg's shadow.
        dark: poly([[136, 180], [150, 180], ...cut([150, 186], [154, 226], 'marta-lf', -1, 4), [136, 226]]),
        mid: 3,
        inner: (c) => {
          c.flat('patch', poly([[154, 200], [166, 199], [167, 211], [155, 212]]), WOOD.mid);
          c.strokes('patch-stitch', stitches([154, 200], [166, 199], 4, 3, 0), 1.2);
        },
      });
      boot(d, 'boot', [162, 240], [158, 214], LEATHER, 48, 22);
      d.ink('cap', poly([[176, 229], [188, 233], [188, 238], [173, 238]]), LEAD, { dark: false, line: 1.6, heavy: 2 });
      strap(d, 'boot-strap', [148, 222], [170, 220], 4.5, SOOT, 0.7, LEAD);
    }),
    part('body', 'body', 'root', [132, 192], (d) => {
      // A quilted jack: short, belted, its hem frayed.
      d.ink('jack', poly([
        [100, 100], [168, 100], [170, 124], [162, 148], [172, 198],
        ...hem([172, 198], [96, 202], 'marta-jack', 5, 9).reverse().slice(1, -1),
        [96, 202], [106, 148], [98, 124],
      ]), TALLOW, {
        dark: poly([[80, 90], [116, 90], ...cut([116, 100], [124, 206], 'marta-jack-dark', -1, 9), [80, 208]]),
        cold: 2.4,
        open: [[[170, 126], [164, 144]]],
        inner: (c) => {
          // The quilting: rows sewn down its length, and the ties across them.
          c.detail('quilt', [[[136, 104], [134, 198]], [[148, 104], [148, 198]], [[160, 104], [163, 198]], [[126, 104], [122, 198]]], TALLOW, 1.8);
          c.detail('ties', [...stitches([142, 116], [142, 190], 6, 5, 0), ...stitches([155, 116], [156, 190], 6, 5, 0)], TALLOW, 1.4);
          // A patch, sewn on with thick thread.
          c.flat('patch', poly([[150, 160], [166, 158], [168, 178], [152, 180]]), TALLOW.mid);
          c.strokes('patch-thread', [...stitches([150, 160], [166, 158], 4, 3.4, 0), ...stitches([166, 158], [168, 178], 4, 3.4, 0), ...stitches([152, 180], [168, 178], 4, 3.4, 0)], 1.2);
        },
      });
      // What the hide and the arms cast on her chest: one shape across the jack, not a stripe on each piece.
      d.shade('under-mantle', poly([[96, 108], [180, 104], [178, 119], [160, 117], [150, 126], [130, 121], [114, 128], [96, 124]]), ['jack']);
      // The belt, and the lodge's red knotted over it, its end hanging and frayed.
      strap(d, 'belt', [104, 150], [164, 146], 8, LEATHER);
      rivets(d, 'belt-studs', [108, 150], [124, 149], 3, 1.3);
      d.ink('sash', poly([[106, 138], [164, 135], [165, 146], [107, 150]]), BLOOD, { dark: 0.3, mid: 3, inner: (c) => c.detail('sash-folds', [[[128, 137], [130, 149]], [[146, 136], [150, 147]]], BLOOD, 1.6) });
      d.ink('sash-end', poly([[146, 146], [158, 146], [163, 176], [158, 182], [155, 174], [151, 184], [148, 172]]), BLOOD, { dark: 0.4, mid: 2, inner: (c) => c.detail('sash-crease', [[[152, 148], [154, 172]]], BLOOD, 1.6) });
      d.ink('buckle', poly([[124, 135], [137, 134.5], [137.5, 150], [124.5, 150.5]]), LEAD, { dark: 0.3, mid: 0, line: 1.8, heavy: 2.4, rim: 1.4 });
      d.black('buckle-pin', poly([[127, 141.4], [136, 141], [136, 143.4], [127, 143.6]]));
      // The gate's keys, on a ring at her hip.
      d.pen('key-ring', poly([[114, 152], [110, 158], [114, 164], [118, 158], [114, 152]], false), 1.8);
      keyOn(d, 'key-a', [113, 163], 96, 17);
      keyOn(d, 'key-b', [115, 163], 72, 14);
      keyOn(d, 'key-c', [112, 162], 118, 13);
      pouch(d, 'pouch', [160, 150], 14, 16, LEATHER);
    }),
    part('halberd', 'weapon', 'body', [136, 110], (d) => {
      const butt: Pt = [180, 240];
      const tip: Pt = [198, -22];
      const at = (t: number): Pt => between(butt, tip, t);
      // The arm that is further off, behind the shaft.
      arm(d, 'arm-back', [120, 110], [150, 142], at(0.34), TALLOW, LEATHER, 16);
      d.ink('shaft', limb(butt, at(0.93), 8, 7.4), WOOD, {
        dark: limbDark(butt, at(0.93), 8, 8, 'marta-shaft', 0.36), mid: 0, line: 1.8, heavy: 2.4,
        inner: (c) => c.detail('grain', [[at(0.08), at(0.2)], [at(0.62), at(0.74)]], WOOD, 1.4),
      });
      d.black('shoe', limb(butt, at(0.03), 9.5, 8));
      // The grip: hide wound round the shaft where her hands go.
      d.ink('wrap', limb(at(0.3), at(0.6), 9.4, 9), LEATHER, { dark: limbDark(at(0.3), at(0.6), 10, 10, 'marta-wrap', 0.36), mid: 0, line: 1.4, heavy: 1.8, inner: (c) => c.detail('wrap-turns', stitches(at(0.31), at(0.59), 9, 9, 0.35), LEATHER, 1.3) });
      // The head, drawn big: a spike above, a hook behind for dragging things out of graves, and a bill's blade to
      // the front: its edge runs out to a beak at the top and is hollowed below, so that it is not an axe's.
      const h = at(0.83);
      const H = (dx: number, dy: number): Pt => [h[0] + dx * 1.3, h[1] + dy * 1.3];
      d.ink('langets', poly([H(-3.2, 20), H(3.6, 20), H(3.2, 52), H(-2.8, 52)]), LEAD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
      rivets(d, 'langet-nails', H(0.3, 26), H(0.2, 50), 3, 1.3);
      d.ink('spike', poly([H(-3.5, -6), H(4, -6), H(3, -50)]), LEAD, { dark: 0.45, mid: 0 });
      d.ink('hook', poly([H(-2, -6), H(-2, 8), H(-12, 5), H(-18, 12), H(-28, 28), H(-28, 6), H(-14, -8)]), LEAD, { dark: 0.5, mid: 2, inner: (c) => c.flat('hook-rust', poly([H(-6, -6), H(-2, -6), H(-2, 8), H(-9, 4)]), RUST.mid) });
      d.ink('blade', poly([H(2, -14), H(18, -20), H(44, -38), H(40, -10), H(42, 14), H(30, 38), H(24, 22), H(12, 28), H(3, 24)]), LEAD, {
        dark: poly([H(-6, -44), H(10, -44), ...cut(H(10, -24), H(15, 40), 'marta-blade', -1, 6), H(-6, 44)]),
        mid: 5,
        rim: 2.2,
        inner: (c) => {
          // Pitted, notched, and bright only along the edge she keeps.
          c.detail('pits', [[H(22, -6), H(27, 0)], [H(26, 8), H(31, 13)], [H(20, 12), H(23, 17)], [H(30, -20), H(34, -14)]], LEAD, 1.8);
          c.flat('rust', poly([H(3, 16), H(10, 20), H(8, 27), H(3, 24)]), RUST.mid);
          c.black('notch', poly([H(41, 0), H(36, 3), H(41.6, 6)]));
        },
      });
      d.ink('socket', poly([H(-5.5, 20), H(6, 20), H(6, 30), H(-5.5, 30)]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
      // A rag of the lodge's red, tied under the head.
      d.ink('rag', poly([H(-4, 32), H(-10, 36), H(-22, 54), H(-14, 50), H(-12, 62), H(-6, 46), H(0, 40)]), BLOOD, { dark: 0.45, mid: 2, line: 1.6, heavy: 2.2 });
      // The near arm, over the shaft.
      arm(d, 'arm-front', [156, 110], [172, 136], at(0.55), TALLOW, LEATHER, 17);
    }),
    part('lamp', 'extra', 'weapon', [188, 178], (d) => {
      // Her lamp, on a bracket under her lower hand, in front of her: the light she works by.
      d.black('bracket', poly([[182, 172], [195, 172], [195, 178], [182, 178]]));
      lantern(d, 'lamp', [192, 177], 1.4);
    }, 0.6, true),
    part('mantle', 'extra', 'body', [134, 104], (d) => {
      // A hide across the shoulders, hair side out, which hides where the arms begin, so that they can go anywhere.
      d.ink('mantle', poly([
        [82, 108], [92, 90], [118, 84], [136, 92], [158, 92], [176, 96], [184, 114],
        ...hem([184, 114], [80, 124], 'marta-mantle', 8, 9).reverse().slice(1, -1),
        [80, 124],
      ]), LEATHER, {
        dark: poly([[70, 70], [104, 70], ...cut([104, 80], [112, 134], 'marta-mantle-dark', -1, 6), [70, 136]]),
        cold: 2.6,
        open: [[[160, 92], [174, 95]]],
        inner: (c) => {
          c.detail('hair', [[[150, 96], [155, 112]], [[166, 98], [172, 112]]], LEATHER, 2.4);
          c.detail('seam', stitches([120, 88], [124, 122], 6, 4, 0.2), LEATHER, 1.3);
        },
      });
      strap(d, 'mantle-strap', [122, 86], [136, 122], 5, SOOT, 0.6, LEAD);
    }, 0.12),
    part('head', 'head', 'body', [142, 98], (d) => {
      // Her braid, grey, down her back.
      d.ink('braid', poly([[124, 78], [132, 80], [128, 100], [122, 120], [115, 118], [119, 98]]), BONE, { dark: 0.5, mid: 2, inner: (c) => c.detail('plait', stitches([127, 82], [119, 116], 5, 6, 0.5), BONE, 1.4) });
      neck(d, 'neck', [144, 80], TALLOW, 27);
      face(d, 'face', [148, 82], TALLOW, { size: 28, jaw: 1.1, ear: false, scar: true });
      // The padded cap under the helm, down over her ears and the back of her neck.
      d.ink('coif', poly([[126, 72], [142, 72], [141, 88], [137, 98], [128, 100]]), TALLOW, { dark: 0.55, mid: 2, line: 2, heavy: 2.6, inner: (c) => c.detail('coif-quilt', [[[136, 74], [134, 98]], [[131, 74], [130, 98]]], TALLOW, 1.2) });
      // The kettle helm: a plain iron bowl with a narrow sloping brim, dented, riveted where the brim is joined on.
      d.ink('bowl', poly([[130, 68], [133, 56], [142, 49], [154, 48], [163, 54], [166, 67]]), LEAD, {
        dark: 0.4, mid: 3, cold: 2,
        inner: (c) => {
          c.detail('dent', [[[150, 52], [156, 60]], [[158, 56], [160, 62]]], LEAD, 2);
          c.flat('rust', poly([[142, 60], [152, 62], [150, 68], [140, 68]]), RUST.mid, 0.8);
        },
      });
      d.ink('brim', poly([[116, 71], [122, 65], [166, 63], [184, 70], [182, 76], [118, 77]]), LEAD, { dark: 0.3, mid: 3, rim: 1.6, open: [[[168, 63.4], [180, 68]]] });
      rivets(d, 'rivets', [128, 68], [166, 66.5], 5, 1.5);
      // The strap under her jaw.
      strap(d, 'chin-strap', [139, 76], [150, 98], 3.4, LEATHER);
    }),
  ],
};

/** A jaw trap, shut, hanging by its chain. `at` is the top of the chain. */
export function jawTrap(d: Doc, name: string, at: Pt, k = 1): void {
  const [x, y] = at;
  const P = (dx: number, dy: number): Pt => [x + dx * k, y + dy * k];
  chain(d, `${name}-chain`, P(0, 0), P(0, 13), 4.4);
  // Two jaws closed on each other: a ring of iron with its teeth meshed, a spring bar under, a pan in the middle.
  d.ink(`${name}-jaws`, poly([
    P(-11, 15), P(-7, 13), P(-5, 19), P(-2, 13), P(0, 19), P(3, 13), P(5, 19), P(8, 13), P(11, 15), P(13, 24), P(8, 31), P(-8, 31), P(-13, 24),
  ]), LEAD, { dark: 0.4, mid: 2, line: 1.8, heavy: 2.4, inner: (c) => c.flat(`${name}-rust`, poly([P(4, 24), P(12, 22), P(10, 31), P(3, 31)]), RUST.mid) });
  d.ink(`${name}-pan`, poly([P(-4, 22), P(4, 22), P(3, 28), P(-3, 28)]), RUST, { dark: false, line: 1.4, heavy: 1.8 });
  d.black(`${name}-spring`, poly([P(-15, 30), P(15, 30), P(13, 34), P(-13, 34)]));
}

/**
 * Jory Pell, the Poacher. Lean and wary under a deep hood, his eyes somewhere in it: a heavy olive coat with
 * its frogs done up, a pack on his back with his jaw traps swinging off it, and a windlass crossbow as long as
 * his body held hard into his shoulder.
 */
const jory: UnitArt = {
  id: 'jory',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { loose: SHOULDER_LOOSE, set: SET_DOWN },
  stills: { hit: HIT, fall: FALL },
  muzzle: [244, 112],
  top: 50,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [126, 240], 116, 12)),
    part('leg-back', 'legBack', 'root', [116, 156], (d) => {
      d.ink('thigh', limb([116, 152], [104, 194], 18, 14, 1.5), WOOD, { dark: limbDark([116, 152], [104, 194], 18, 15, 'jory-lb-t', 0.6), mid: 2.5 });
      d.ink('shin', limb([104, 190], [90, 226], 14, 11, 1), WOOD, { dark: limbDark([104, 190], [90, 226], 14, 12, 'jory-lb-s', 0.6), mid: 2.5 });
      boot(d, 'boot', [94, 240], [90, 218], LEATHER, 40, 16);
    }),
    part('pack', 'extra', 'body', [96, 124], (d) => {
      // His pack: a bag on a frame, a rolled blanket on top, the lodge's red rag tied to it.
      d.ink('frame', limb([86, 96], [92, 168], 5, 5), WOOD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2 });
      d.ink('bag', poly([[84, 108], [116, 104], [120, 150], [112, 160], [88, 162], [80, 150]]), LEATHER, {
        dark: 0.5, cold: 2.4,
        inner: (c) => {
          c.flat('flap', poly([[82, 106], [118, 102], [118, 126], [100, 132], [82, 126]]), LEATHER.mid);
          c.strokes('flap-stitch', stitches([84, 126], [100, 132], 4, 2.6, 0), 1.1);
        },
      });
      strap(d, 'pack-strap', [104, 104], [106, 158], 5, SOOT, 0.42, LEAD);
      d.ink('roll', poly([[80, 94], [86, 88], [116, 86], [122, 92], [120, 104], [82, 106]]), TALLOW, { dark: 0.45, mid: 3, inner: (c) => c.detail('roll-turns', [[[94, 88], [92, 104]], [[108, 87], [108, 103]]], TALLOW, 1.6) });
      d.ink('rag', poly([[84, 150], [92, 152], [90, 172], [84, 166], [80, 176]]), BLOOD, { dark: 0.45, mid: 0, line: 1.6, heavy: 2 });
    }, 0.2),
    part('traps', 'extra', 'body', [100, 160], (d) => {
      jawTrap(d, 'trap-a', [92, 160], 1.5);
      jawTrap(d, 'trap-b', [112, 162], 1.25);
    }, 0.8, true),
    part('leg-front', 'legFront', 'root', [130, 156], (d) => {
      d.ink('thigh', limb([130, 152], [150, 192], 19, 15, 1.5), WOOD, { dark: limbDark([130, 152], [150, 192], 19, 16, 'jory-lf-t', 0.36), mid: 2.5 });
      d.ink('shin', limb([150, 188], [144, 226], 15, 12, 1), WOOD, {
        dark: limbDark([150, 188], [144, 226], 15, 13, 'jory-lf-s', 0.36), mid: 2.5,
        inner: (c) => c.detail('wraps', stitches([150, 196], [145, 222], 5, 12, 0.3), WOOD, 1.6),
      });
      boot(d, 'boot', [152, 240], [144, 218], LEATHER, 42, 17);
    }),
    part('body', 'body', 'root', [124, 156], (d) => {
      // The coat: heavy, to the knee, leaning into his step, its skirts frayed.
      d.ink('coat', poly([
        [122, 104], [154, 104], [164, 128], [156, 160], [164, 200],
        ...hem([164, 200], [108, 206], 'jory-coat', 6, 10).reverse().slice(1, -1),
        [108, 206], [114, 160], [110, 128],
      ]), MOSS, {
        dark: poly([[94, 96], [126, 96], ...cut([126, 104], [128, 210], 'jory-coat-dark', -1, 7), [94, 212]]),
        open: [[[162, 130], [157, 156]]],
        inner: (c) => {
          c.detail('seam', [[[150, 108], [150, 200]]], MOSS, 1.8);
          c.detail('folds', [[[158, 164], [162, 198]], [[140, 166], [138, 202]]], MOSS, 2.2);
          c.flat('patch', poly([[136, 172], [150, 170], [152, 188], [138, 190]]), MOSS.mid);
          c.strokes('patch-thread', [...stitches([136, 172], [150, 170], 3, 3, 0), ...stitches([138, 190], [152, 188], 3, 3, 0)], 1.1);
        },
      });
      // The frogs: cords of the lodge's red, done up across his chest.
      [112, 124, 136].forEach((y, i) => {
        d.ink(`frog-${i}`, poly([[140, y], [158 + i * 2, y - 1], [159 + i * 2, y + 4], [140, y + 5]]), BLOOD, { dark: false, line: 1.3, heavy: 1.6 });
        stud(d, `toggle-${i}`, [146, y + 2.4], 1.8);
      });
      strap(d, 'belt', [112, 150], [160, 147], 8, LEATHER, 0.55, LEAD);
      // Bolts in a case at his hip, and a flask of tar.
      d.ink('case', poly([[140, 152], [152, 151], [156, 184], [144, 186]]), LEATHER, { dark: 0.4, mid: 2, inner: (c) => c.detail('case-stitch', stitches([142, 180], [154, 178], 3, 2.6, 0), LEATHER, 1.1) });
      d.strokes('bolts', [[[143, 152], [141, 142]], [[147, 152], [146, 140]], [[151, 151], [152, 141]]], 2.4);
      d.ink('flask', poly([[124, 156], [132, 156], [134, 162], [136, 176], [122, 176], [123, 162]]), SOOT, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
      d.ink('cork', poly([[125.5, 151], [130.5, 151], [131, 156], [125, 156]]), TALLOW, { dark: false, line: 1.2, heavy: 1.4 });
    }),
    part('crossbow', 'weapon', 'body', [142, 114], (d) => {
      // The arm that is further off, under the fore end.
      arm(d, 'arm-back', [136, 112], [170, 126], [200, 120], MOSS, LEATHER, 12);
      // The tiller: a long heavy stock, its butt in his shoulder.
      d.ink('stock', poly([[136, 108], [148, 106], [232, 108], [234, 118], [150, 124], [138, 122]]), WOOD, {
        dark: poly([[130, 117], [240, 113], [240, 128], [130, 128]]), mid: 2,
        inner: (c) => c.detail('grain', [[[156, 112], [200, 111]], [[178, 115], [226, 113]]], WOOD, 1.3),
      });
      // The windlass at the butt: a drum, two cranks, and its cords running forward to the string.
      d.ink('drum', poly([[128, 102], [142, 100], [144, 126], [130, 128]]), LEAD, { dark: 0.4, mid: 2, inner: (c) => c.detail('drum-bands', [[[130, 110], [143, 109]], [[131, 119], [144, 118]]], LEAD, 1.4) });
      d.pen('crank-up', poly([[134, 102], [130, 88], [122, 88]], false), 3);
      d.pen('crank-down', poly([[138, 128], [142, 142], [150, 142]], false), 3);
      d.pen('cords', poly([[142, 104], [190, 106]], false), 1.3);
      // The prod: a great bow of iron across the nose, seen from the side as it curves away, lashed on with cord.
      d.ink('prod', poly([[212, 56], [221, 58], [234, 100], [236, 124], [224, 168], [215, 170], [226, 124], [224, 102]]), LEAD, {
        dark: poly([[206, 50], [217, 54], [228, 102], [230, 124], [219, 172], [206, 174]]), mid: 2, rim: 1.6,
        inner: (c) => c.detail('prod-pits', [[[226, 84], [229, 92]], [[230, 132], [228, 140]]], LEAD, 1.6),
      });
      d.ink('lashing', poly([[220, 102], [234, 100], [236, 124], [222, 126]]), TALLOW, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8, inner: (c) => c.detail('lash-turns', stitches([222, 104], [222, 124], 5, 12, 0.2), TALLOW, 1.2) });
      d.pen('string', poly([[216, 58], [190, 108], [219, 169]], false), 1.6);
      // The bolt in its groove, its head past the nose, and the stirrup he puts his foot in to span it.
      d.ink('bolt', poly([[190, 105], [232, 104.4], [246, 107.6], [232, 110], [190, 109.4]]), BONE, { dark: false, line: 1.2, heavy: 1.6 });
      d.ink('stirrup', poly([[234, 102], [246, 100], [248, 122], [236, 122], [237, 117], [242, 117], [241, 106], [235, 107]]), LEAD, { dark: false, line: 1.4, heavy: 2 });
      // The near arm: his hand on the tickler.
      arm(d, 'arm-front', [150, 114], [160, 134], [176, 122], MOSS, LEATHER, 13.5);
    }),
    part('cowl', 'extra', 'body', [140, 104], (d) => {
      // The cape of his hood over both shoulders, which hides where the arms begin.
      d.ink('cowl', poly([
        [116, 110], [124, 96], [142, 90], [158, 92], [168, 104], [168, 120],
        ...hem([168, 120], [114, 126], 'jory-cowl', 6, 9).reverse().slice(1, -1),
        [114, 126],
      ]), LEATHER, {
        dark: poly([[104, 84], [130, 84], ...cut([130, 90], [132, 134], 'jory-cowl-dark', -1, 5), [104, 136]]),
        cold: 2.2,
        inner: (c) => c.detail('cowl-seam', stitches([146, 94], [150, 122], 5, 4, 0.2), LEATHER, 1.2),
      });
    }, 0.3),
    part('head', 'head', 'body', [148, 102], (d) => {
      face(d, 'face', [156, 86], TALLOW, { size: 27, jaw: 1.05, ear: false });
      // Three days of beard.
      d.detail('stubble', [[[158, 95], [160, 98]], [[154, 97], [155, 100]], [[162, 93], [164, 96]], [[150, 95], [151, 98]]], TALLOW, 1.2);
      // The hood: deep, its edge down over his brow, lined with the lodge's red where it turns back.
      d.ink('hood', poly([[134, 104], [132, 76], [140, 60], [156, 53], [172, 58], [180, 72], [172, 78], [163, 73], [152, 84], [150, 104]]), LEATHER, {
        dark: poly([[120, 46], [146, 46], ...cut([146, 54], [142, 108], 'jory-hood-dark', -1, 5), [120, 110]]),
        mid: 3,
        cold: 2.2,
        inner: (c) => {
          c.detail('hood-seam', stitches([156, 56], [172, 64], 4, 3.4, 0.2), LEATHER, 1.2);
          c.detail('hood-fold', [[[150, 66], [146, 82]], [[158, 62], [156, 72]]], LEATHER, 2);
        },
      });
      d.ink('lining', poly([[180, 72], [172, 78], [163, 73], [152, 84], [150, 96], [155, 86], [163, 78], [171, 82]]), BLOOD, { dark: false, line: 1.4, heavy: 1.8 });
      // Under the hood there is only its shadow.
      d.black('hood-shadow', poly([[152, 84], [163, 73], [171, 79], [166, 84], [158, 86], [153, 92]]));
    }),
  ],
};

/** The lamplighter's lamp, stood on the ground: an iron post on a foot, with a square lantern on it. */
export function streetLamp(d: Doc): void {
  d.ink('foot', poly([[104, 240], [110, 228], [146, 228], [152, 240]]), LEAD, { dark: 0.4, mid: 3 });
  d.ink('post', poly([[123, 230], [125, 132], [131, 132], [133, 230]]), LEAD, { dark: 0.45, mid: 2, inner: (c) => c.detail('post-bands', [[[124, 200], [133, 200]], [[124, 160], [133, 160]]], LEAD, 1.6) });
  d.ink('arm', poly([[114, 136], [142, 136], [140, 142], [116, 142]]), LEAD, { dark: 0.3, mid: 0, line: 1.6, heavy: 2 });
  d.ink('glass', poly([[114, 98], [142, 98], [138, 134], [118, 134]]), { lit: LAMP.lit, mid: LAMP.mid }, { dark: false, line: 1.8, heavy: 2.4, inner: (c) => c.flat('low', poly([[110, 122], [146, 120], [146, 136], [110, 136]]), LAMP.mid) });
  d.flat('heart', poly([[124, 130], [122, 116], [128, 104], [134, 116], [132, 130]]), LAMP.hot);
  d.black('roof', poly([[108, 100], [120, 82], [136, 82], [148, 100]]));
  d.black('finial', poly([[125, 84], [128, 72], [131, 84]]));
  d.black('bar', poly([[127, 98], [129, 98], [129, 134], [127, 134]]));
  d.black('sill', poly([[114, 132], [142, 132], [140, 138], [116, 138]]));
}

/**
 * Agnes Thorn, the Lamplighter. A working woman of the town, wiry, in a soot-black smock and a flat cap pulled
 * down, her ladder slung on her back, an oil can at her belt, and the long pole she lights the street lamps
 * with, its wick burning at the far end, well away from her.
 */
const agnes: UnitArt = {
  id: 'agnes',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { jab: JAB, flare: RAISE_LIGHT, lamp: SET_DOWN },
  stills: { hit: HIT, fall: FALL },
  muzzle: [238, 8],
  top: 30,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [126, 240], 104, 11)),
    part('ladder', 'extra', 'body', [112, 130], (d) => {
      // Her ladder, slung across her back: it stands up over her head and nobody else has that shape.
      const railA: [Pt, Pt] = [[84, 204], [112, 36]];
      const railB: [Pt, Pt] = [[100, 208], [128, 40]];
      for (let i = 0; i < 7; i++) {
        const a = between(railA[0], railA[1], 0.1 + i * 0.13);
        const b = between(railB[0], railB[1], 0.1 + i * 0.13);
        d.ink(`rung-${i}`, limb(a, b, 4, 4), WOOD, { dark: false, line: 1.4, heavy: 2 });
      }
      d.ink('rail-a', limb(railA[0], railA[1], 6.4, 5.6), WOOD, { dark: limbDark(railA[0], railA[1], 7, 7, 'agnes-rail-a', 0.5), mid: 0, line: 1.8, heavy: 2.4, cold: 1.6 });
      d.ink('rail-b', limb(railB[0], railB[1], 6.4, 5.6), WOOD, { dark: limbDark(railB[0], railB[1], 7, 7, 'agnes-rail-b', 0.4), mid: 0, line: 1.8, heavy: 2.4, inner: (c) => c.detail('rail-grain', [[[104, 180], [110, 140]], [[116, 110], [122, 76]]], WOOD, 1.3) });
    }, 0.1),
    part('leg-back', 'legBack', 'root', [118, 176], (d) => {
      d.ink('leg', limb([118, 172], [110, 222], 18, 14, 1.5), SOOT, { dark: limbDark([118, 172], [110, 222], 18, 15, 'agnes-lb', 0.6), mid: 2.5 });
      boot(d, 'boot', [112, 240], [110, 216], LEATHER, 40, 17);
    }),
    part('leg-front', 'legFront', 'root', [140, 176], (d) => {
      d.ink('leg', limb([140, 172], [148, 222], 19, 15, 1.5), SOOT, { dark: limbDark([140, 172], [148, 222], 19, 16, 'agnes-lf', 0.36), mid: 2.5 });
      boot(d, 'boot', [154, 240], [148, 216], LEATHER, 42, 18);
      strap(d, 'boot-strap', [140, 224], [160, 222], 4, SOOT, 0.7, LEAD);
    }),
    part('body', 'body', 'root', [130, 174], (d) => {
      // The smock: black with soot, loose, to the knee.
      d.ink('smock', poly([
        [112, 104], [152, 104], [160, 132], [154, 164], [162, 200],
        ...hem([162, 200], [106, 204], 'agnes-smock', 5, 10).reverse().slice(1, -1),
        [106, 204], [110, 164], [106, 134],
      ]), SOOT, {
        dark: poly([[90, 96], [120, 96], ...cut([120, 104], [124, 208], 'agnes-smock-dark', -1, 7), [90, 210]]),
        inner: (c) => c.detail('gathers', [[[128, 108], [126, 150]], [[146, 170], [150, 200]]], SOOT, 2),
      });
      // A leather apron over it, with a pocket, burnt in places.
      d.ink('apron', poly([[132, 118], [156, 116], [160, 190], [138, 196]]), LEATHER, {
        dark: 0.22, mid: 3,
        open: [[[158, 150], [159, 176]]],
        inner: (c) => {
          c.flat('pocket', poly([[140, 160], [156, 158], [157, 178], [142, 180]]), LEATHER.mid);
          c.strokes('pocket-stitch', stitches([140, 160], [156, 158], 4, 2.6, 0), 1.1);
          c.black('burn-a', poly([[146, 132], [150, 130], [151, 136], [147, 137]]));
          c.detail('burn-b', [[[150, 186], [154, 190]]], LEATHER, 2);
        },
      });
      strap(d, 'belt', [108, 150], [158, 146], 7, LEATHER, 0.5, LEAD);
      // The oil can: a cone-topped tin with a long spout and a wire handle.
      d.ink('can', poly([[114, 156], [130, 155], [132, 180], [112, 182]]), LEAD, { dark: 0.4, mid: 2, rim: 1.4, inner: (c) => c.detail('can-band', [[[113, 172], [132, 171]]], LEAD, 1.4) });
      d.ink('can-top', poly([[112, 157], [120, 147], [126, 147], [132, 156]]), LEAD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
      d.pen('spout', poly([[126, 150], [140, 138], [144, 139]], false), 2.6);
      d.pen('can-handle', poly([[114, 160], [107, 166], [113, 176]], false), 1.6);
    }),
    part('pole', 'weapon', 'body', [138, 114], (d) => {
      const butt: Pt = [102, 224];
      const tip: Pt = [234, 16];
      const at = (t: number): Pt => between(butt, tip, t);
      arm(d, 'arm-back', [124, 112], [116, 150], at(0.2), TALLOW, LEATHER, 13);
      d.ink('pole', limb(butt, at(0.96), 6.4, 5.4), WOOD, { dark: limbDark(butt, at(0.96), 7, 7, 'agnes-pole', 0.4), mid: 0, line: 1.6, heavy: 2.2, inner: (c) => c.detail('pole-grain', [[at(0.3), at(0.42)], [at(0.6), at(0.72)]], WOOD, 1.2) });
      // The far end: a brass ferrule, the hook that opens a lamp's door, and the wick alight in its holder.
      const h = at(0.96);
      d.ink('ferrule', limb(at(0.88), at(0.97), 8, 7), RUST, { dark: limbDark(at(0.88), at(0.97), 8, 8, 'agnes-ferrule', 0.4), mid: 0, line: 1.4, heavy: 1.8 });
      d.pen('hook', poly([[h[0] - 2, h[1] + 2], [h[0] - 12, h[1] - 4], [h[0] - 12, h[1] + 6]], false), 2.6);
      d.ink('holder', poly([[h[0] - 4, h[1] - 2], [h[0] + 4, h[1] + 2], [h[0] + 8, h[1] - 6], [h[0] + 1, h[1] - 10]]), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
      d.ink('flame', poly([[h[0] + 1, h[1] - 9], [h[0] - 2, h[1] - 20], [h[0] + 4, h[1] - 16], [h[0] + 8, h[1] - 32], [h[0] + 14, h[1] - 16], [h[0] + 12, h[1] - 8], [h[0] + 7, h[1] - 5]]), { lit: LAMP.lit, mid: LAMP.mid }, {
        dark: false, line: 1.4, heavy: 1.8,
        inner: (c) => c.flat('flame-heart', poly([[h[0] + 4, h[1] - 9], [h[0] + 5, h[1] - 18], [h[0] + 8, h[1] - 24], [h[0] + 10, h[1] - 14], [h[0] + 9, h[1] - 8]]), LAMP.hot),
      });
      arm(d, 'arm-front', [150, 112], [172, 132], at(0.5), TALLOW, LEATHER, 14);
    }),
    part('yoke', 'extra', 'body', [134, 104], (d) => {
      // The yoke of the smock over her shoulders, and the ladder's strap across it.
      d.ink('yoke', poly([
        [106, 110], [114, 96], [132, 90], [150, 92], [162, 102], [164, 118],
        ...hem([164, 118], [104, 124], 'agnes-yoke', 4, 10).reverse().slice(1, -1),
        [104, 124],
      ]), SOOT, {
        dark: poly([[92, 84], [118, 84], ...cut([118, 90], [122, 130], 'agnes-yoke-dark', -1, 5), [92, 132]]),
        cold: 2.2,
        inner: (c) => c.detail('yoke-seam', stitches([112, 118], [160, 114], 8, 3, 0), SOOT, 1.2),
      });
      strap(d, 'ladder-strap', [116, 96], [152, 122], 5.5, LEATHER, 0.6, LEAD);
    }, 0.15),
    part('head', 'head', 'body', [138, 100], (d) => {
      // Her hair, tied back.
      d.ink('bun', poly([[120, 74], [130, 72], [132, 88], [124, 94], [116, 86]]), TALLOW, { dark: 0.55, mid: 2, line: 2, heavy: 2.6, inner: (c) => c.detail('bun-strands', [[[124, 76], [122, 88]], [[128, 76], [127, 90]]], TALLOW, 1.2) });
      neck(d, 'neck', [140, 82], TALLOW, 27);
      face(d, 'face', [144, 84], TALLOW, { size: 27, jaw: 1.05 });
      d.detail('soot', [[[150, 92], [154, 96]], [[146, 96], [148, 99]]], TALLOW, 1.6);
      // The lodge's red, as a kerchief at her throat.
      d.ink('kerchief', poly([[130, 96], [152, 98], [150, 106], [140, 114], [132, 106]]), BLOOD, { dark: 0.4, mid: 2, line: 2, heavy: 2.6, inner: (c) => c.detail('kerchief-fold', [[[138, 100], [140, 110]]], BLOOD, 1.4) });
      // A flat cap, pulled down: its peak keeps the light off her eyes.
      d.ink('cap', poly([[124, 76], [126, 64], [146, 58], [162, 62], [166, 72], [158, 75]]), SOOT, {
        dark: 0.4, mid: 3, cold: 2,
        inner: (c) => c.detail('cap-seams', [[[146, 60], [146, 74]], [[136, 62], [134, 75]]], SOOT, 1.4),
      });
      d.ink('peak', poly([[156, 71], [166, 70], [182, 76], [180, 80], [156, 77]]), SOOT, { dark: poly([[150, 75], [186, 78], [186, 84], [150, 82]]), mid: 0, line: 2, heavy: 2.6 });
      stud(d, 'cap-button', [146, 59.5], 1.6);
    }),
  ],
};

/**
 * Old Brask, the Dog Handler. Wide as a cart and bent with it: a wolf's pelt with its ragged edge over his
 * shoulders, a bald head and a beard like a spade, a kennel apron, a leash coiled in one fist and a boar spear
 * stood upright in the other. A hound goes at his knee, and is a figure of its own.
 */
const brask: UnitArt = {
  id: 'brask',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { thrust: UNDERHAND, setOn: POINT, heel: WHISTLE },
  stills: { hit: HIT, fall: FALL },
  muzzle: [190, 0],
  top: 62,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [130, 240], 124, 13)),
    part('leg-back', 'legBack', 'root', [108, 176], (d) => {
      d.ink('leg', limb([110, 172], [100, 222], 26, 19, 2), LEATHER, { dark: limbDark([110, 172], [100, 222], 26, 21, 'brask-lb', 0.62) });
      boot(d, 'boot', [100, 240], [100, 214], SOOT, 44, 21);
    }),
    part('leash-arm', 'offhand', 'body', [114, 114], (d) => {
      arm(d, 'arm', [114, 114], [122, 148], [144, 162], RUST, LEATHER, 18);
      // The leash, coiled in his fist, its clip hanging.
      d.pen('coil-a', poly([[140, 168], [132, 180], [140, 192], [150, 180], [142, 170]], false), 2.6, LEATHER.mid);
      d.pen('coil-b', poly([[144, 170], [138, 184], [146, 198], [154, 184], [146, 172]], false), 2.6);
      d.ink('clip', poly([[144, 198], [150, 198], [151, 208], [143, 208]]), LEAD, { dark: false, line: 1.3, heavy: 1.6 });
    }),
    part('leg-front', 'legFront', 'root', [142, 176], (d) => {
      d.ink('leg', limb([142, 172], [154, 222], 28, 20, 2), LEATHER, {
        dark: poly([[124, 166], [138, 166], ...cut([138, 172], [146, 226], 'brask-lf', -1, 4), [124, 226]]),
        inner: (c) => c.detail('knee', [[[146, 196], [160, 194]], [[148, 202], [158, 201]]], LEATHER, 1.8),
      });
      boot(d, 'boot', [160, 240], [154, 214], SOOT, 48, 22);
      strap(d, 'boot-strap', [144, 224], [168, 222], 4.5, LEATHER, 0.7, LEAD);
    }),
    part('body', 'body', 'root', [126, 176], (d) => {
      // A barrel of a man in a quilted coat, bent forward from the hips.
      d.ink('coat', poly([[96, 106], [158, 104], [168, 132], [162, 172], [156, 196], [98, 198], [92, 152]]), RUST, {
        dark: poly([[78, 96], [112, 96], ...cut([112, 104], [118, 202], 'brask-coat', -1, 8), [78, 204]]),
        open: [[[166, 134], [163, 166]]],
        inner: (c) => {
          c.detail('quilt', [[[164, 122], [120, 126]], [[166, 142], [120, 146]], [[164, 162], [120, 166]], [[160, 182], [120, 186]]], RUST, 1.8);
          c.detail('quilt-down', [[[140, 108], [138, 196]], [[152, 108], [152, 196]]], RUST, 1.4);
        },
      });
      // The kennel apron: hide, clawed and bitten along its edge.
      d.ink('apron', poly([[124, 130], [160, 126], [164, 192], [154, 198], [148, 190], [140, 200], [128, 194]]), LEATHER, {
        dark: 0.2, mid: 3,
        inner: (c) => {
          c.strokes('claws', [[[138, 150], [144, 168]], [[143, 149], [149, 166]], [[148, 148], [154, 164]]], 1.6);
          c.flat('apron-patch', poly([[142, 172], [158, 170], [158, 186], [144, 188]]), LEATHER.mid);
          c.strokes('apron-thread', stitches([142, 172], [158, 170], 4, 3, 0), 1.1);
        },
      });
      strap(d, 'belt', [94, 162], [164, 158], 9, SOOT, 0.42, LEAD);
      // His horn, slung at the hip, banded with iron, and the whistle he calls them with.
      d.ink('horn', poly([[142, 166], [154, 164], [160, 182], [154, 204], [142, 214], [147, 196], [145, 180]]), BONE, {
        dark: 0.35, mid: 2,
        inner: (c) => c.flat('horn-band', poly([[142, 172], [158, 170], [159, 176], [143, 178]]), LEAD.mid),
      });
      d.ink('whistle', poly([[118, 164], [124, 164], [125, 180], [119, 180]]), BONE, { dark: false, line: 1.3, heavy: 1.6 });
      pouch(d, 'pouch', [104, 166], 14, 16, LEATHER);
      // A spare collar on his belt, studded, and a bag of bones for them.
      d.ink('collar', poly([[122, 172], [136, 170], [138, 180], [124, 182]]), SOOT, { dark: false, line: 1.6, heavy: 2 });
      rivets(d, 'collar-studs', [124, 176], [137, 175], 3, 1.3);
      d.ink('bone-bag', poly([[108, 184], [122, 184], [126, 204], [116, 210], [106, 204]]), TALLOW, { dark: 0.4, mid: 2, line: 1.8, heavy: 2.4, inner: (c) => c.detail('bag-tie', [[[108, 190], [124, 190]]], TALLOW, 1.4) });
    }),
    part('spear', 'weapon', 'body', [148, 116], (d) => {
      const butt: Pt = [180, 240];
      const tip: Pt = [190, -6];
      const at = (t: number): Pt => between(butt, tip, t);
      d.ink('shaft', limb(butt, at(0.78), 9, 8), WOOD, { dark: limbDark(butt, at(0.78), 9, 9, 'brask-shaft', 0.4), mid: 0, line: 1.8, heavy: 2.4, inner: (c) => c.detail('shaft-grain', [[at(0.1), at(0.24)], [at(0.56), at(0.68)]], WOOD, 1.4) });
      d.black('shoe', limb(butt, at(0.03), 10.5, 9));
      const h = at(0.78);
      const H = (dx: number, dy: number): Pt => [h[0] + dx, h[1] + dy];
      // The head, drawn big: lugs that stop a boar coming up the shaft, and a broad leaf of a blade.
      d.ink('socket', poly([H(-5, -2), H(6, -2), H(5, 22), H(-4, 22)]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
      rivets(d, 'socket-nails', H(0.6, 4), H(0.4, 20), 2, 1.4);
      d.ink('lugs', poly([H(-22, -10), H(-14, -4), H(15, -5), H(24, -12), H(22, 2), H(14, 4), H(-13, 5), H(-20, 3)]), LEAD, { dark: 0.4, mid: 2, rim: 1.4 });
      d.ink('blade', poly([H(-5, -4), H(-13, -22), H(-10, -42), H(2, -68), H(13, -42), H(15, -22), H(6, -4)]), LEAD, {
        dark: poly([H(-20, -72), H(0, -72), ...cut(H(1, -66), H(0, 0), 'brask-blade', -1, 4), H(-20, 0)]),
        mid: 3, rim: 2,
        inner: (c) => {
          c.detail('blade-pits', [[H(6, -30), H(9, -24)], [H(7, -46), H(9, -40)]], LEAD, 1.6);
          c.flat('blade-rust', poly([H(2, -14), H(12, -16), H(8, -4), H(2, -4)]), RUST.mid);
        },
      });
      // The lodge's red, tied under the lugs.
      d.ink('rag', poly([H(-4, 6), H(-12, 10), H(-22, 30), H(-14, 26), H(-12, 40), H(-5, 22), H(0, 12)]), BLOOD, { dark: 0.45, mid: 2, line: 1.6, heavy: 2.2 });
      arm(d, 'arm', [148, 116], [172, 142], at(0.46), RUST, LEATHER, 20);
    }),
    part('pelt', 'extra', 'body', [124, 104], (d) => {
      // The wolf's pelt: its fur torn all round, over both shoulders and down his back, a paw hanging in front.
      d.ink('pelt', poly([
        [82, 112], [92, 92], [112, 82], [140, 82], [166, 92], [176, 112],
        ...hem([176, 112], [150, 118], 'brask-pelt-f', 7, 7).reverse().slice(1, -1),
        [150, 118], [136, 128], [120, 118],
        ...hem([88, 150], [118, 156], 'brask-pelt', 8, 7).reverse(),
      ]), SOOT, {
        dark: poly([[66, 72], [104, 72], ...cut([104, 82], [100, 160], 'brask-pelt-dark', -1, 6), [66, 162]]),
        cold: 2.8,
        inner: (c) => c.detail('fur', [[[122, 90], [126, 110]], [[134, 88], [139, 108]], [[146, 90], [152, 106]], [[158, 96], [164, 110]], [[112, 96], [112, 118]], [[108, 126], [106, 146]]], SOOT, 2.6),
      });
      d.ink('paw', poly([[160, 110], [172, 110], [174, 130], [170, 136], [167, 130], [164, 137], [160, 130]]), SOOT, { dark: 0.3, mid: 0, line: 1.8, heavy: 2.4 });
      // The wolf's own head, flat on his far shoulder, its jaw sewn shut; and the thong that ties the pelt on.
      d.ink('wolf-head', poly([[86, 100], [100, 88], [116, 92], [112, 108], [96, 116]]), SOOT, { dark: 0.5, mid: 2, line: 1.8, heavy: 2.4, inner: (c) => c.detail('wolf-seam', stitches([92, 104], [110, 100], 4, 4, 0.2), SOOT, 1.4) });
      d.ink('wolf-ear', poly([[98, 90], [96, 76], [108, 88]]), SOOT, { dark: 0.5, mid: 0, line: 1.8, heavy: 2.4 });
      strap(d, 'pelt-thong', [130, 84], [150, 116], 4, LEATHER, 0.6, LEAD);
      d.strokes('claws', [[[161, 132], [160, 140]], [[166, 134], [166, 142]], [[171, 132], [172, 140]]], 2.4, BONE.lit);
    }, 0.3),
    part('head', 'head', 'body', [140, 100], (d) => {
      neck(d, 'neck', [142, 80], TALLOW, 28);
      face(d, 'face', [148, 82], TALLOW, { size: 28, jaw: 1, scar: true });
      // Bald, the skull's planes showing, with a beard like a spade, cut in locks.
      d.detail('skull-planes', [[[142, 70], [152, 69]], [[138, 76], [140, 70]]], TALLOW, 1.6);
      d.ink('beard', poly([[140, 90], [158, 88], [162, 96], [160, 116], [154, 122], [151, 128], [147, 120], [143, 114], [136, 98]]), BONE, {
        dark: 0.36, mid: 3,
        inner: (c) => c.detail('locks', [[[150, 94], [150, 120]], [[156, 94], [156, 114]], [[145, 96], [146, 112]]], BONE, 1.8),
      });
      d.ink('side-hair', poly([[131, 80], [138, 82], [139, 94], [132, 92]]), BONE, { dark: 0.5, mid: 0, line: 1.8, heavy: 2.4 });
    }),
  ],
};

export const HUNTERS: UnitArt[] = [marta, jory, agnes, brask];
// Kept to hand for whoever draws the next hunter.
export { along, chain, fist, SCRATCH };
