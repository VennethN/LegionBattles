// The hunters who came to the lodge after the first four. Each is a trade,
// not a class (guide/rules.md, "Ours"), dressed in what that trade wears and
// carrying the tool of it drawn twice as big as life: the smith's sledge,
// the miner's pick and powder, the ferrywoman's pole with its lamp, the
// butcher's cleaver and hook. Built as the first four are: the big shapes and
// the black first, the second layer quiet in each piece's middle tone, the
// lodge's dull red somewhere on each, and at most one bright thing, which is
// lamplight or heat.

import { Doc, cut } from '../kit/draw';
import { arm, between, blot, boot, chain, face, fist, hem, limb, limbDark, neck, pouch, rivets, satLegs, stitches, strap, stud } from '../kit/figure';
import { BLOOD, BONE, LAMP, LEAD, LEATHER, RUST, SLATE, SOOT, STONE, TALLOW, WOOD } from '../kit/palette';
import { poly, type Pt } from '../kit/path';
import { hidden, part, type UnitArt } from '../kit/unit';
import { BACKHAND, BREAK_GROUND, CHOP, DODGE, FALL, FORGE_STRIKE, HACK, HEAVE, HIT, HOOK_THROW, JAB, PICK, POLE_SWEEP, RAISE_LIGHT, REST, SHOVE, SIT, SMASH, SWING_LOW, THROW, LEAN, sitFor } from '../poses';
import { PERSON, PERSON_FEET, PERSON_MARGIN, lantern } from './hunters';

/** What every hunter does besides fighting: roll, wait at the inn, sit down there. */
const WAITS = { dodge: DODGE, rest: REST, sit: SIT };

// ------------------------------------------------------------------ Greta Hale, the Smith

/**
 * Greta Hale, the Smith. Built like the anvil she works at: shoulders wider than the door, bare arms scorched
 * to the elbow, a leather apron from her chest to her knees with the burns of years in it, her hair cropped under
 * a kerchief of the lodge's red, tongs hung at her hip and a forge sledge on her shoulder whose head is still red
 * from the fire.
 */
const greta: UnitArt = {
  id: 'greta',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { smash: SMASH, swing: SWING_LOW, forgestrike: FORGE_STRIKE, anvil: HEAVE },
  stills: { hit: HIT, fall: FALL, ...WAITS, sit: sitFor(184, {}), lean: LEAN },
  muzzle: [214, 150],
  top: 30,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [132, 240], 128, 13)),
    hidden(part('leg-back', 'legBack', 'root', [114, 186], (d) => {
      d.ink('hose', limb([114, 182], [104, 222], 25, 20, 2), WOOD, { dark: limbDark([114, 182], [104, 222], 25, 21, 'greta-lb', 0.62), mid: 3 });
      boot(d, 'boot', [104, 240], [104, 214], SOOT, 46, 22);
    }), 'sit'),
    hidden(part('leg-front', 'legFront', 'root', [150, 186], (d) => {
      d.ink('hose', limb([150, 182], [160, 222], 27, 21, 2), WOOD, {
        dark: poly([[132, 176], [146, 176], ...cut([146, 182], [152, 226], 'greta-lf', -1, 4), [132, 226]]),
        mid: 3,
        inner: (c) => c.detail('knee', [[[156, 202], [168, 200]]], WOOD, 1.8),
      });
      boot(d, 'boot', [164, 240], [160, 214], SOOT, 50, 23);
      d.ink('toecap', poly([[180, 229], [192, 233], [192, 238], [177, 238]]), LEAD, { dark: false, line: 1.6, heavy: 2, rim: 1.2 });
    }), 'sit'),
    part('tongs', 'extra', 'body', [110, 150], (d) => {
      // Her tongs, hung at the back of her hip by a ring: two long iron arms, crossed, the jaws at the bottom.
      d.ink('tong-a', limb([110, 150], [96, 216], 5, 4), LEAD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2.2 });
      d.ink('tong-b', limb([116, 150], [104, 218], 5, 4), LEAD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2.2 });
      d.ink('jaw-a', poly([[92, 212], [98, 212], [94, 226], [88, 224]]), LEAD, { dark: false, line: 1.4, heavy: 1.8 });
      d.ink('jaw-b', poly([[102, 214], [108, 214], [108, 228], [102, 228]]), LEAD, { dark: false, line: 1.4, heavy: 1.8 });
      stud(d, 'rivet', [106, 186], 2);
      d.pen('ring', poly([[110, 146], [106, 152], [112, 156], [116, 150], [110, 146]], false), 2);
    }, 0.4, true),
    part('body', 'body', 'root', [132, 186], (d) => {
      // A sleeveless shirt of soot-black linen, and under it a body like a barrel.
      d.ink('shirt', poly([[98, 102], [170, 100], [176, 132], [168, 176], [162, 200], [104, 202], [96, 152]]), SOOT, {
        dark: poly([[80, 92], [116, 92], ...cut([116, 100], [122, 208], 'greta-shirt', -1, 8), [80, 210]]),
        cold: 2.4,
        inner: (c) => c.detail('shirt-seam', [[[118, 104], [116, 196]]], SOOT, 1.6),
      });
      // The apron: thick hide from her chest to her knees, burnt through in places, a pocket of nails.
      d.ink('apron', poly([[130, 108], [168, 104], [176, 132], [172, 214], [160, 220], [152, 212], [140, 222], [128, 214]]), LEATHER, {
        dark: poly([[112, 96], [138, 96], ...cut([138, 106], [140, 226], 'greta-apron', -1, 5), [112, 226]]),
        mid: 4,
        open: [[[174, 134], [173, 170]]],
        inner: (c) => {
          c.detail('apron-scuffs', [[[150, 120], [160, 136]], [[156, 180], [166, 196]], [[146, 196], [150, 210]]], LEATHER, 2);
          c.black('burn-a', poly([[158, 146], [164, 143], [167, 150], [161, 154]]));
          c.black('burn-b', poly([[146, 202], [150, 200], [151, 206], [147, 207]]));
          c.flat('scorch', poly([[150, 140], [170, 136], [172, 158], [154, 160]]), LEATHER.mid);
          c.flat('pocket', poly([[148, 168], [168, 166], [168, 186], [150, 188]]), LEATHER.mid);
          c.strokes('pocket-stitch', stitches([148, 168], [168, 166], 4, 3, 0), 1.2);
          // Nails standing up out of the pocket.
          c.strokes('nails', [[[154, 168], [153, 160]], [[158, 168], [158, 158]], [[162, 167], [163, 160]]], 1.6);
        },
      });
      // What her arms and the sledge cast across the apron's bib.
      d.shade('under-arms', poly([[124, 110], [176, 106], [176, 120], [160, 118], [150, 128], [136, 122], [124, 128]]), ['apron', 'shirt']);
      strap(d, 'apron-tie', [100, 160], [172, 156], 6, LEATHER, 0.3, LEAD);
      d.ink('tie-end', poly([[104, 160], [96, 166], [94, 182], [100, 176], [104, 186], [106, 168]]), LEATHER, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
      pouch(d, 'pouch', [120, 162], 14, 16, LEATHER);
    }),
    part('legs-sat', 'extra', 'body', [134, 184], (d) => satLegs(d, 'sat', [134, 184], 56, WOOD, SOOT, 25), 0, false, 'sit'),
    part('sledge', 'weapon', 'body', [136, 112], (d) => {
      const butt: Pt = [186, 164];
      const end: Pt = [86, 54];
      const at = (t: number): Pt => between(butt, end, t);
      // The far arm, under the haft, its hand up the haft.
      arm(d, 'arm-back', [124, 108], [138, 142], at(0.42), TALLOW, LEATHER, 16);
      d.detail('burns-back', [[[132, 128], [136, 136]], [[128, 120], [131, 126]]], TALLOW, 2);
      d.ink('haft', limb(butt, at(0.9), 10, 9), WOOD, {
        dark: limbDark(butt, at(0.9), 10, 10, 'greta-haft', 0.4), mid: 0, line: 1.8, heavy: 2.4,
        inner: (c) => c.detail('haft-grain', [[at(0.12), at(0.26)], [at(0.56), at(0.7)]], WOOD, 1.4),
      });
      d.black('haft-end', limb(butt, at(0.03), 11, 10));
      // The head, drawn big: a block of iron across the end of the haft, wedged, banded, and one face of it still
      // red from the fire, at the back, well away from her face.
      const u: Pt = [(end[0] - butt[0]) / 148.3, (end[1] - butt[1]) / 148.3];
      const n: Pt = [-u[1], u[0]];
      const h = at(0.93);
      const H = (a: number, b: number): Pt => [h[0] + n[0] * a + u[0] * b, h[1] + n[1] * a + u[1] * b];
      d.ink('head', poly([H(-44, -15), H(-38, -19), H(36, -19), H(44, -14), H(44, 14), H(38, 19), H(-38, 19), H(-44, 15)]), LEAD, {
        dark: poly([H(-60, -2), ...cut(H(-60, -2), H(60, -2), 'greta-head', 1, 4), H(60, 30), H(-60, 30)]),
        mid: 4, rim: 2,
        inner: (c) => {
          c.detail('head-pits', [[H(10, -14), H(16, -8)], [H(-20, -12), H(-14, -6)], [H(24, 6), H(30, 12)]], LEAD, 1.8);
          c.flat('head-rust', poly([H(-6, 8), H(10, 8), H(12, 19), H(-8, 19)]), RUST.mid);
        },
      });
      d.ink('band-a', poly([H(-14, -20), H(-8, -20), H(-8, 20), H(-14, 20)]), LEAD, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
      d.ink('band-b', poly([H(8, -20), H(14, -20), H(14, 20), H(8, 20)]), LEAD, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
      d.black('wedge', poly([H(-2, -22), H(2, -22), H(1, -16), H(-1, -16)]));
      // The face that is still hot: heat, not a lamp, but the one bright thing she carries.
      d.ink('hot-face', poly([H(-48, -16), H(-42, -18), H(-42, 18), H(-48, 15)]), { lit: LAMP.lit, mid: LAMP.mid }, { dark: false, line: 1.6, heavy: 2 });
      d.flat('hot-heart', poly([H(-47, -8), H(-43, -10), H(-43, 10), H(-47, 8)]), LAMP.hot);
      // The near arm, its hand at the foot of the haft.
      arm(d, 'arm-front', [158, 108], [184, 134], at(0.06), TALLOW, LEATHER, 17);
      d.detail('burns-front', [[[172, 120], [176, 128]], [[180, 140], [184, 146]], [[166, 114], [170, 118]]], TALLOW, 2);
      d.flat('scar-front', poly([[176, 126], [182, 124], [184, 130], [178, 132]]), RUST.mid);
    }),
    part('hide', 'extra', 'body', [134, 104], (d) => {
      // A short cape of scorched hide over her shoulders, which hides where the arms begin.
      d.ink('hide', poly([
        [88, 112], [98, 92], [124, 84], [150, 88], [170, 92], [182, 108],
        ...hem([182, 108], [86, 122], 'greta-hide', 7, 10).reverse().slice(1, -1),
        [86, 122],
      ]), LEATHER, {
        dark: poly([[70, 72], [108, 72], ...cut([108, 82], [114, 132], 'greta-hide-dark', -1, 6), [70, 134]]),
        cold: 2.6,
        open: [[[160, 88], [176, 96]]],
        inner: (c) => {
          c.detail('hide-scorch', [[[150, 94], [158, 108]], [[164, 98], [172, 110]]], LEATHER, 2.4);
          c.black('hide-burn', poly([[136, 98], [142, 96], [143, 102], [138, 104]]));
        },
      });
      strap(d, 'apron-neck', [130, 90], [136, 112], 5, LEATHER, 0.5, LEAD);
    }, 0.12),
    part('head', 'head', 'body', [146, 96], (d) => {
      neck(d, 'neck', [146, 78], TALLOW, 30);
      face(d, 'face', [152, 82], TALLOW, { size: 29, jaw: 1.18, ear: false });
      d.detail('soot', [[[158, 90], [162, 94]], [[150, 94], [152, 98]], [[160, 78], [164, 80]]], TALLOW, 1.8);
      // Cropped hair at the nape, under the kerchief.
      d.ink('nape', poly([[130, 74], [138, 74], [138, 92], [132, 96], [127, 88]]), RUST, { dark: 0.5, mid: 2, line: 1.8, heavy: 2.4 });
      // The kerchief of the lodge's red, tied tight round her head, its knot at the back and one end lying back.
      d.ink('kerchief', poly([[128, 74], [132, 62], [148, 55], [162, 58], [170, 68], [166, 72], [150, 69], [138, 76]]), BLOOD, {
        dark: 0.4, mid: 3, cold: 2,
        inner: (c) => c.detail('kerchief-folds', [[[146, 58], [144, 70]], [[156, 60], [154, 69]]], BLOOD, 1.6),
      });
      d.ink('knot', poly([[124, 66], [132, 64], [134, 72], [126, 74]]), BLOOD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2.2 });
      d.ink('tail', poly([[124, 70], [108, 80], [104, 90], [114, 86], [126, 76]]), BLOOD, { dark: 0.45, mid: 0, line: 1.6, heavy: 2.2 });
    }),
  ],
};

// ------------------------------------------------------------------ Ned Rook, the Miner

/**
 * Ned Rook, the Miner. Bent from forty years under a roof too low: long arms, a coat grey with stone dust, a
 * leather hard hat with a candle stood on its crown in a tin, a keg of blasting powder on his back with its fuse
 * coiled on top, and a pick held at the ready with the lodge's red rag on its haft.
 */
const ned: UnitArt = {
  id: 'ned',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { jab: JAB, pick: PICK, keg: THROW, cavein: BREAK_GROUND },
  stills: { hit: HIT, fall: FALL, ...WAITS, sit: sitFor(168, {}), lean: LEAN },
  muzzle: [208, 62],
  top: 40,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 116, 12)),
    hidden(part('leg-back', 'legBack', 'root', [114, 170], (d) => {
      d.ink('thigh', limb([114, 166], [100, 202], 19, 15, 1.5), WOOD, { dark: limbDark([114, 166], [100, 202], 19, 16, 'ned-lb-t', 0.6), mid: 2.5 });
      d.ink('shin', limb([100, 198], [92, 226], 15, 12, 1), WOOD, { dark: limbDark([100, 198], [92, 226], 15, 13, 'ned-lb-s', 0.6), mid: 2.5 });
      boot(d, 'boot', [96, 240], [92, 218], LEATHER, 42, 17);
    }), 'sit'),
    part('keg', 'extra', 'body', [98, 118], (d) => {
      // Blasting powder: a small keg on a frame, banded with iron, a fuse coiled on its lid.
      d.ink('keg', poly([[76, 96], [114, 92], [120, 110], [118, 150], [112, 162], [78, 164], [72, 150], [70, 112]]), WOOD, {
        dark: poly([[60, 86], [92, 86], ...cut([92, 92], [96, 170], 'ned-keg', -1, 5), [60, 172]]),
        mid: 3, cold: 2.4,
        inner: (c) => c.detail('staves', [[[100, 96], [102, 160]], [[110, 100], [112, 156]]], WOOD, 1.6),
      });
      d.ink('hoop-a', poly([[70, 112], [120, 108], [121, 116], [71, 120]]), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
      d.ink('hoop-b', poly([[72, 146], [119, 142], [119, 150], [73, 154]]), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
      rivets(d, 'hoop-nails', [80, 116], [114, 112], 3, 1.3);
      // A mark burnt on it so nobody takes it for ale.
      d.strokes('mark', [[[96, 126], [106, 136]], [[106, 126], [96, 136]]], 2.2);
      d.ink('lid', poly([[78, 94], [112, 90], [114, 96], [80, 100]]), WOOD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
      d.pen('fuse', poly([[96, 92], [88, 84], [100, 80], [110, 86], [98, 88], [92, 76]], false), 2.2, TALLOW.mid);
      strap(d, 'keg-strap', [108, 92], [116, 160], 5, LEATHER, 0.4, LEAD);
    }, 0.2),
    part('throw-arm', 'offhand', 'body', [132, 114], (d) => {
      // His far hand is free: it takes a keg off his back and throws it. Empty, it hangs by his side.
      arm(d, 'arm', [132, 114], [124, 146], [132, 172], STONE, LEATHER, 13);
    }),
    hidden(part('leg-front', 'legFront', 'root', [134, 170], (d) => {
      d.ink('thigh', limb([134, 166], [152, 200], 20, 16, 1.5), WOOD, { dark: limbDark([134, 166], [152, 200], 20, 17, 'ned-lf-t', 0.36), mid: 2.5 });
      d.ink('shin', limb([152, 196], [146, 226], 16, 13, 1), WOOD, { dark: limbDark([152, 196], [146, 226], 16, 14, 'ned-lf-s', 0.36), mid: 2.5 });
      // A leather pad strapped on his knee, for kneeling at the face.
      d.ink('kneepad', poly([[144, 190], [160, 188], [162, 206], [146, 208]]), LEATHER, { dark: 0.4, mid: 2, line: 1.8, heavy: 2.4 });
      stud(d, 'kneepad-stud', [153, 197], 1.6);
      boot(d, 'boot', [154, 240], [146, 218], LEATHER, 44, 18);
    }), 'sit'),
    part('body', 'body', 'root', [126, 170], (d) => {
      // A coat grey with stone dust, bent forward from the hips, patched at the elbows of a life.
      d.ink('coat', poly([
        [112, 108], [152, 106], [164, 130], [158, 162], [164, 194],
        ...hem([164, 194], [108, 200], 'ned-coat', 5, 10).reverse().slice(1, -1),
        [108, 200], [112, 164], [106, 136],
      ]), STONE, {
        dark: poly([[90, 98], [124, 98], ...cut([124, 106], [128, 204], 'ned-coat-dark', -1, 7), [90, 206]]),
        cold: 2.2,
        open: [[[162, 132], [159, 156]]],
        inner: (c) => {
          c.detail('dust', [[[140, 120], [146, 128]], [[150, 172], [156, 180]], [[134, 186], [140, 194]], [[146, 140], [150, 146]]], STONE, 2.2);
          c.flat('patch', poly([[136, 150], [152, 148], [154, 166], [138, 168]]), STONE.mid);
          c.strokes('patch-thread', [...stitches([136, 150], [152, 148], 3, 3, 0), ...stitches([138, 168], [154, 166], 3, 3, 0)], 1.1);
        },
      });
      strap(d, 'belt', [108, 154], [160, 150], 7, LEATHER, 0.6, LEAD);
      // A tin box for his bread, a coil of fuse, and a hammer for the drill.
      d.ink('tin', poly([[138, 158], [154, 157], [155, 172], [139, 173]]), LEAD, { dark: 0.4, mid: 2, line: 1.6, heavy: 2, inner: (c) => c.detail('tin-lid', [[[138, 162], [155, 161]]], LEAD, 1.2) });
      d.pen('fuse-coil', poly([[118, 160], [112, 168], [120, 174], [126, 166], [118, 162]], false), 2.2, TALLOW.mid);
      d.ink('drill-hammer', poly([[124, 172], [128, 172], [128, 194], [124, 194]]), WOOD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
      d.ink('drill-head', poly([[118, 168], [134, 168], [134, 174], [118, 174]]), LEAD, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
    }),
    part('legs-sat', 'extra', 'body', [126, 168], (d) => satLegs(d, 'sat', [126, 168], 72, WOOD, LEATHER, 18), 0, false, 'sit'),
    part('pick', 'weapon', 'body', [144, 116], (d) => {
      const butt: Pt = [132, 196];
      const top: Pt = [210, 78];
      const at = (t: number): Pt => between(butt, top, t);
      d.ink('haft', limb(butt, at(0.96), 8, 7), WOOD, {
        dark: limbDark(butt, at(0.96), 8, 8, 'ned-haft', 0.4), mid: 0, line: 1.8, heavy: 2.4,
        inner: (c) => c.detail('haft-grain', [[at(0.14), at(0.26)], [at(0.6), at(0.72)]], WOOD, 1.3),
      });
      // The lodge's red, a rag tied round the haft below his hands.
      d.ink('rag', poly([at(0.12), [at(0.12)[0] - 8, at(0.12)[1] + 4], [at(0.12)[0] - 14, at(0.12)[1] + 22], [at(0.12)[0] - 6, at(0.12)[1] + 16], [at(0.12)[0] - 4, at(0.12)[1] + 28], at(0.2)]), BLOOD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2.2 });
      // The head, drawn big: a bar of iron bent like a crow's bill, a point to the front and a flat chisel to the
      // back, through an eye wedged onto the haft.
      const h = at(0.94);
      const H = (dx: number, dy: number): Pt => [h[0] + dx, h[1] + dy];
      d.ink('head', poly([H(-46, 14), H(-40, 4), H(-20, -6), H(0, -10), H(22, -8), H(42, 2), H(60, 22), H(40, 10), H(20, 4), H(0, 2), H(-20, 6), H(-40, 18)]), LEAD, {
        dark: poly([H(-60, 4), ...cut(H(-60, 4), H(70, 8), 'ned-head', 1, 3), H(70, 40), H(-60, 40)]),
        mid: 3, rim: 2,
        inner: (c) => {
          c.detail('head-pits', [[H(12, -4), H(18, 0)], [H(-24, 0), H(-18, 4)]], LEAD, 1.6);
          c.flat('head-rust', poly([H(-4, -6), H(8, -6), H(8, 2), H(-4, 2)]), RUST.mid);
        },
      });
      d.ink('eye', poly([H(-7, -14), H(7, -14), H(7, 8), H(-7, 8)]), LEAD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2.2 });
      stud(d, 'wedge', H(0, -16), 2);
      arm(d, 'arm-front', [154, 112], [172, 140], at(0.56), STONE, LEATHER, 14);
    }),
    part('collar', 'extra', 'body', [140, 106], (d) => {
      // The coat's collar turned up, and a shoulder cape of oiled cloth against the drip, which hides where the arms begin.
      d.ink('cape', poly([
        [110, 114], [118, 100], [138, 94], [156, 98], [166, 110], [166, 124],
        ...hem([166, 124], [108, 128], 'ned-cape', 5, 10).reverse().slice(1, -1),
        [108, 128],
      ]), SOOT, {
        dark: poly([[96, 90], [126, 90], ...cut([126, 96], [130, 134], 'ned-cape-dark', -1, 5), [96, 136]]),
        cold: 2.2,
        inner: (c) => c.detail('cape-seam', stitches([116, 120], [162, 118], 7, 3, 0), SOOT, 1.2),
      });
    }, 0.25),
    part('head', 'head', 'body', [152, 104], (d) => {
      neck(d, 'neck', [152, 90], TALLOW, 25);
      face(d, 'face', [158, 94], TALLOW, { size: 26, jaw: 1.12, ear: false });
      // Stone dust in the lines of his face, and three days of grey stubble.
      d.detail('dust', [[[160, 98], [164, 102]], [[152, 100], [154, 104]], [[164, 86], [168, 88]]], TALLOW, 1.6);
      d.detail('stubble', [[[156, 104], [158, 107]], [[162, 102], [164, 105]], [[150, 103], [151, 106]]], TALLOW, 1.2);
      // The lodge's red at his throat: a neckerchief, knotted, its end lying back.
      d.ink('neckerchief', poly([[140, 104], [164, 106], [162, 114], [150, 118], [142, 112]]), BLOOD, { dark: 0.4, mid: 2, line: 1.8, heavy: 2.4, inner: (c) => c.detail('kerchief-fold', [[[150, 107], [152, 116]]], BLOOD, 1.4) });
      // The hard hat: boiled leather, a round crown and a short brim all round, dented.
      d.ink('crown', poly([[138, 82], [140, 68], [150, 60], [164, 60], [172, 68], [174, 80]]), LEATHER, {
        dark: 0.42, mid: 3, cold: 2,
        inner: (c) => {
          c.detail('crown-seam', [[[156, 61], [156, 80]]], LEATHER, 1.6);
          c.detail('crown-dent', [[[164, 66], [168, 72]]], LEATHER, 2);
        },
      });
      d.ink('brim', poly([[132, 84], [136, 78], [178, 77], [190, 84], [186, 88], [136, 89]]), LEATHER, { dark: 0.3, mid: 2, open: [[[178, 77.4], [188, 82]]] });
      // A fat candle stuck in a tin dish clipped to the front of the crown: the light he works by, stood well above his face.
      d.ink('holder', poly([[160, 66], [180, 64], [178, 70], [162, 71]]), LEAD, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
      d.pen('clip', poly([[166, 70], [168, 78]], false), 2);
      d.ink('candle', poly([[163, 52], [176, 51], [177, 65], [162, 66]]), BONE, {
        dark: 0.4, mid: 2, line: 1.6, heavy: 2,
        inner: (c) => c.detail('drips', [[[166, 53], [166, 60]], [[172, 52], [173, 58]]], BONE, 1.6),
      });
      d.ink('flame', poly([[164, 52], [168, 40], [170, 32], [174, 42], [176, 51], [170, 54]]), { lit: LAMP.lit, mid: LAMP.mid }, { dark: false, line: 1.3, heavy: 1.7 });
      d.flat('flame-heart', poly([[167, 51], [170, 39], [173, 51]]), LAMP.hot);
    }),
  ],
};

// ------------------------------------------------------------------ Ida Marsh, the Ferrywoman

/** A coil of rope seen from the side: loops one over another. `at` is the top of the coil. */
function coil(d: Doc, name: string, at: Pt, w: number, h: number): void {
  const [x, y] = at;
  d.ink(name, poly([[x - w * 0.5, y + h * 0.2], [x - w * 0.3, y], [x + w * 0.3, y], [x + w * 0.5, y + h * 0.2], [x + w * 0.46, y + h * 0.8], [x + w * 0.2, y + h], [x - w * 0.2, y + h], [x - w * 0.46, y + h * 0.8]]), TALLOW, {
    dark: 0.42, mid: 2, line: 1.8, heavy: 2.4,
    inner: (c) => c.detail(`${name}-turns`, [[[x - w * 0.4, y + h * 0.3], [x + w * 0.42, y + h * 0.26]], [[x - w * 0.44, y + h * 0.55], [x + w * 0.44, y + h * 0.52]], [[x - w * 0.36, y + h * 0.8], [x + w * 0.38, y + h * 0.78]]], TALLOW, 1.6),
  });
}

/**
 * Ida Marsh, the Ferrywoman. She has poled the dead and the living over the black water for thirty years, and
 * looks it: a long oilskin coat that shines where it is wet, a sou'wester with its brim long at the back,
 * waders to the thigh, a coil of rope over her shoulder, and a ferry pole three times her height with a lantern
 * on the hook at its top, so that it is seen from the far bank.
 */
const ida: UnitArt = {
  id: 'ida',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { jab: JAB, sweep: POLE_SWEEP, shove: SHOVE, wake: RAISE_LIGHT },
  stills: { hit: HIT, fall: FALL, ...WAITS, sit: sitFor(174, { weaponRot: -24 }), lean: LEAN },
  muzzle: [186, -42],
  top: 40,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [130, 240], 112, 12)),
    hidden(part('leg-back', 'legBack', 'root', [118, 176], (d) => {
      d.ink('wader', limb([118, 172], [110, 222], 20, 16, 1.5), LEATHER, { dark: limbDark([118, 172], [110, 222], 20, 17, 'ida-lb', 0.6), mid: 2.5 });
      boot(d, 'boot', [112, 240], [110, 216], LEATHER, 42, 17);
    }), 'sit'),
    hidden(part('leg-front', 'legFront', 'root', [142, 176], (d) => {
      d.ink('wader', limb([142, 172], [150, 222], 21, 17, 1.5), LEATHER, {
        dark: limbDark([142, 172], [150, 222], 21, 18, 'ida-lf', 0.36), mid: 2.5,
        inner: (c) => c.detail('wader-creases', [[[146, 194], [158, 192]], [[148, 206], [158, 205]]], LEATHER, 1.6),
      });
      d.ink('wader-top', poly([[134, 170], [154, 168], [156, 180], [136, 182]]), LEATHER, { dark: 0.3, mid: 0, line: 1.8, heavy: 2.4 });
      boot(d, 'boot', [156, 240], [150, 216], LEATHER, 44, 18);
    }), 'sit'),
    part('body', 'body', 'root', [132, 176], (d) => {
      // The oilskin: long, stiff, shining in hard streaks where the water lies on it.
      d.ink('oilskin', poly([
        [112, 102], [154, 102], [164, 130], [160, 164], [168, 214],
        ...hem([168, 214], [102, 218], 'ida-coat', 4, 14).reverse().slice(1, -1),
        [102, 218], [108, 164], [104, 130],
      ]), SLATE, {
        dark: poly([[86, 94], [122, 94], ...cut([122, 102], [126, 222], 'ida-coat-dark', -1, 7), [86, 224]]),
        mid: 4, cold: 2.4,
        open: [[[162, 132], [161, 160]]],
        inner: (c) => {
          // Where the wet catches the light: hard streaks, a step lighter, down the front.
          c.scratch('wet', [[[150, 112], [154, 138]], [[156, 170], [162, 204]], [[144, 176], [146, 196]]], 2.2);
          c.detail('coat-seam', [[[146, 108], [148, 212]]], SLATE, 1.6);
          c.detail('creases', [[[134, 150], [140, 160]], [[150, 186], [158, 198]]], SLATE, 2);
        },
      });
      // The toggles, of horn, down the front.
      [116, 132, 148].forEach((y, i) => d.ink(`toggle-${i}`, poly([[148, y], [156, y - 1], [156, y + 3], [148, y + 4]]), BONE, { dark: false, line: 1.2, heavy: 1.6 }));
      strap(d, 'belt', [106, 156], [162, 152], 7, LEATHER, 0.7, LEAD);
      // A bailer at her hip, and a pouch of fares.
      d.ink('bailer', poly([[110, 160], [130, 158], [128, 174], [114, 176]]), WOOD, { dark: 0.4, mid: 2, line: 1.6, heavy: 2.2 });
      d.ink('bailer-handle', limb([112, 162], [100, 152], 4, 4), WOOD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
      pouch(d, 'fares', [146, 158], 12, 14, LEATHER);
      rivets(d, 'coins', [142, 168], [150, 167], 2, 1.6);
    }),
    part('legs-sat', 'extra', 'body', [132, 174], (d) => satLegs(d, 'sat', [132, 174], 66, LEATHER, LEATHER, 20), 0, false, 'sit'),
    part('pole', 'weapon', 'body', [138, 116], (d) => {
      // The pole: three times her height, its foot shod in iron, a lantern on the hook at the top.
      const foot: Pt = [196, 238];
      const top: Pt = [176, -56];
      const at = (t: number): Pt => between(foot, top, t);
      arm(d, 'arm-back', [124, 112], [140, 138], at(0.34), SLATE, LEATHER, 13);
      d.ink('pole', limb(foot, top, 8, 6), WOOD, {
        dark: limbDark(foot, top, 8, 8, 'ida-pole', 0.4), mid: 0, line: 1.8, heavy: 2.4,
        inner: (c) => c.detail('pole-grain', [[at(0.1), at(0.18)], [at(0.5), at(0.6)], [at(0.76), at(0.86)]], WOOD, 1.3),
      });
      d.black('shoe', limb(foot, at(0.03), 9, 8));
      // The lodge's red, a strip of it bound round the pole where she holds it.
      d.ink('binding', limb(at(0.4), at(0.47), 9.4, 9), BLOOD, { dark: limbDark(at(0.4), at(0.47), 10, 10, 'ida-bind', 0.4), mid: 0, line: 1.4, heavy: 1.8, inner: (c) => c.detail('binding-turns', stitches(at(0.41), at(0.46), 3, 9, 0.35), BLOOD, 1.2) });
      // The hook at the top, bent back, that the lantern hangs from.
      d.pen('hook', poly([top, [top[0] + 2, top[1] - 8], [top[0] + 14, top[1] - 10], [top[0] + 18, top[1] - 2]], false), 3.4);
      arm(d, 'arm-front', [156, 112], [176, 138], at(0.42), SLATE, LEATHER, 14);
    }),
    part('lantern', 'extra', 'weapon', [194, -60], (d) => lantern(d, 'lantern', [194, -60], 1.6), 0.8, true),
    part('shoulders', 'extra', 'body', [134, 104], (d) => {
      // The oilskin's cape over her shoulders, which hides where the arms begin, and the rope coiled over it.
      d.ink('cape', poly([
        [106, 112], [114, 96], [134, 90], [152, 92], [164, 104], [166, 120],
        ...hem([166, 120], [104, 126], 'ida-cape', 3, 14).reverse().slice(1, -1),
        [104, 126],
      ]), SLATE, {
        dark: poly([[90, 84], [122, 84], ...cut([122, 90], [126, 132], 'ida-cape-dark', -1, 5), [90, 134]]),
        cold: 2.2,
        inner: (c) => c.scratch('cape-wet', [[[150, 96], [158, 110]]], 2),
      });
      coil(d, 'rope', [112, 96], 30, 36);
    }, 0.15),
    part('head', 'head', 'body', [142, 98], (d) => {
      neck(d, 'neck', [144, 80], TALLOW, 27);
      face(d, 'face', [150, 84], TALLOW, { size: 27, jaw: 1.05, ear: false, scar: true });
      // Grey hair, plaited, and the lodge's red scarf knotted at her throat.
      d.ink('plait', poly([[128, 82], [134, 82], [132, 102], [126, 116], [121, 114], [126, 100]]), BONE, { dark: 0.5, mid: 2, line: 1.8, heavy: 2.4, inner: (c) => c.detail('plait-turns', stitches([131, 86], [124, 112], 4, 5, 0.5), BONE, 1.2) });
      d.ink('scarf', poly([[136, 98], [158, 100], [156, 108], [146, 114], [138, 108]]), BLOOD, { dark: 0.4, mid: 2, line: 1.8, heavy: 2.4 });
      // The sou'wester: a soft crown, a short brim in front and a long one down the back of her neck.
      d.ink('crown', poly([[132, 76], [134, 62], [146, 54], [160, 56], [168, 66], [166, 76]]), SLATE, {
        dark: 0.42, mid: 3, cold: 2,
        inner: (c) => {
          c.detail('crown-seams', [[[150, 56], [150, 74]], [[140, 60], [138, 76]]], SLATE, 1.4);
          c.scratch('crown-wet', [[[158, 60], [162, 68]]], 1.6);
        },
      });
      d.ink('brim', poly([[106, 92], [112, 80], [130, 72], [166, 72], [182, 76], [180, 82], [162, 80], [134, 82], [122, 96]]), SLATE, {
        dark: poly([[100, 84], [130, 80], [126, 100], [100, 100]]), mid: 2,
        open: [[[168, 72.4], [180, 75]]],
      });
      // The tie under her chin.
      d.pen('tie', poly([[142, 80], [150, 104]], false), 1.8);
    }),
  ],
};

// ------------------------------------------------------------------ Silas Grey, the Butcher

/** A meat hook: a thick iron S, its point turned up. `at` is where it hangs from. */
function meatHook(d: Doc, name: string, at: Pt, k = 1): void {
  const [x, y] = at;
  const P = (dx: number, dy: number): Pt => [x + dx * k, y + dy * k];
  d.ink(name, poly([P(-3, 0), P(3, 0), P(3, 10), P(8, 18), P(8, 30), P(2, 38), P(-8, 38), P(-14, 30), P(-14, 22), P(-8, 22), P(-8, 28), P(-4, 32), P(0, 30), P(2, 24), P(-3, 14)]), LEAD, {
    dark: 0.4, mid: 0, line: 1.8, heavy: 2.4, rim: 1.2,
    inner: (c) => c.flat(`${name}-rust`, poly([P(-8, 30), P(0, 30), P(0, 38), P(-8, 38)]), RUST.mid),
  });
  d.black(`${name}-point`, poly([P(-14, 22), P(-16, 14), P(-10, 22)]));
}

/**
 * Silas Grey, the Butcher. Big in every direction and none of it soft: a bald head on no neck, a nose broken
 * twice, a smock that was white once and is stiff with what it has been through, the lodge's red in his apron
 * strings, a cleaver like a tombstone in one fist and in the other a meat hook on a chain, swinging. A small
 * lantern on his belt, for the cold room.
 */
const silas: UnitArt = {
  id: 'silas',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { chop: CHOP, backhand: BACKHAND, hook: HOOK_THROW, hack: HACK },
  stills: { hit: HIT, fall: FALL, ...WAITS, sit: sitFor(186, {}), lean: LEAN },
  muzzle: [214, 150],
  top: 54,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 130, 13)),
    hidden(part('leg-back', 'legBack', 'root', [112, 188], (d) => {
      d.ink('leg', limb([112, 184], [104, 222], 27, 21, 2), SOOT, { dark: limbDark([112, 184], [104, 222], 27, 22, 'silas-lb', 0.62), mid: 3 });
      boot(d, 'boot', [104, 240], [104, 214], LEATHER, 46, 22);
    }), 'sit'),
    part('hook-arm', 'offhand', 'body', [114, 112], (d) => {
      // The far arm, hanging, the chain wound twice round the fist and the hook swinging under it.
      arm(d, 'arm', [114, 112], [110, 148], [118, 176], BONE, TALLOW, 18);
      d.detail('arm-hair', [[[114, 156], [116, 164]], [[112, 140], [114, 146]]], TALLOW, 1.4);
      d.pen('wind-a', poly([[110, 172], [126, 176]], false), 2.4);
      d.pen('wind-b', poly([[110, 178], [126, 182]], false), 2.4);
    }),
    part('hook', 'extra', 'offhand', [120, 182], (d) => {
      chain(d, 'chain', [120, 182], [122, 200], 4.6);
      meatHook(d, 'hook', [122, 200], 1.05);
    }, 0.9, true),
    hidden(part('leg-front', 'legFront', 'root', [148, 188], (d) => {
      d.ink('leg', limb([148, 184], [158, 222], 29, 22, 2), SOOT, {
        dark: poly([[130, 178], [144, 178], ...cut([144, 184], [150, 226], 'silas-lf', -1, 4), [130, 226]]),
        mid: 3,
      });
      boot(d, 'boot', [162, 240], [158, 214], LEATHER, 50, 23);
      // Sawdust on his boots, from the floor of the shop.
      d.detail('sawdust', [[[164, 230], [170, 232]], [[176, 232], [180, 234]]], LEATHER, 1.6);
    }), 'sit'),
    part('body', 'body', 'root', [130, 188], (d) => {
      // The smock: once white, now the color of old bone, stiff and stained down the front, to the knee.
      d.ink('smock', poly([
        [96, 104], [168, 102], [180, 132], [178, 172], [170, 212],
        ...hem([170, 212], [100, 216], 'silas-smock', 4, 12).reverse().slice(1, -1),
        [100, 216], [94, 172], [92, 132],
      ]), BONE, {
        dark: poly([[76, 94], [114, 94], ...cut([114, 102], [120, 222], 'silas-smock-dark', -1, 9), [76, 224]]),
        mid: 4, cold: 2.4,
        open: [[[178, 134], [178, 166]]],
        inner: (c) => {
          // Stains: dried, dark, a step off red, never the bright of fresh blood.
          c.flat('stain-a', poly([[150, 140], [172, 136], [176, 160], [156, 168], [148, 156]]), BLOOD.mid, 0.7);
          c.flat('stain-b', poly([[140, 186], [160, 184], [162, 204], [144, 206]]), BLOOD.mid, 0.6);
          c.flat('stain-c', poly([[164, 176], [174, 174], [172, 190], [164, 190]]), BLOOD.mid, 0.5);
          c.detail('smock-folds', [[[136, 110], [134, 150]], [[156, 172], [160, 206]]], BONE, 2);
        },
      });
      // The apron over the belly, its strings of the lodge's red tied round at the back.
      d.ink('apron', poly([[126, 128], [174, 124], [180, 156], [174, 206], [130, 210]]), LEATHER, {
        dark: 0.2, mid: 3,
        inner: (c) => {
          c.detail('apron-scores', [[[146, 140], [160, 150]], [[150, 168], [164, 176]], [[140, 186], [154, 194]]], LEATHER, 1.8);
          c.flat('apron-stain', poly([[156, 136], [172, 134], [174, 150], [158, 152]]), BLOOD.mid, 0.6);
        },
      });
      strap(d, 'strings', [96, 130], [178, 124], 5, BLOOD, 0.08, LEAD);
      d.ink('string-end', poly([[98, 132], [90, 140], [88, 156], [94, 150], [96, 162], [100, 140]]), BLOOD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
      strap(d, 'belt', [96, 162], [178, 158], 8, LEATHER, 0.3, LEAD);
      // His steel for the edge, and a little lantern for the cold room: the one bright thing on him.
      d.ink('steel', limb([112, 166], [106, 204], 4.4, 3.4), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
      d.ink('steel-grip', poly([[108, 158], [116, 158], [115, 168], [109, 168]]), WOOD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
      d.black('lamp-hook', poly([[138, 162], [142, 162], [142, 170], [138, 170]]));
      lantern(d, 'lamp', [140, 168], 1.05);
    }),
    part('legs-sat', 'extra', 'body', [132, 186], (d) => satLegs(d, 'sat', [132, 186], 54, SOOT, LEATHER, 26), 0, false, 'sit'),
    part('cleaver', 'weapon', 'body', [146, 114], (d) => {
      // The near arm, the cleaver held up at the shoulder, ready, its blade like a tombstone.
      arm(d, 'arm', [156, 110], [184, 136], [194, 106], BONE, TALLOW, 19);
      d.detail('forearm', [[[188, 124], [192, 116]], [[186, 132], [190, 128]]], TALLOW, 1.6);
      d.ink('handle', poly([[188, 98], [200, 98], [200, 116], [188, 116]]), WOOD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2.2, inner: (c) => c.detail('handle-grain', [[[192, 100], [192, 114]]], WOOD, 1.2) });
      rivets(d, 'handle-pins', [194, 100], [194, 114], 2, 1.6);
      d.ink('blade', poly([[184, 98], [204, 98], [214, 92], [222, 40], [210, 30], [176, 30], [170, 40], [172, 70]]), LEAD, {
        dark: poly([[160, 20], [190, 20], ...cut([190, 28], [192, 100], 'silas-blade', -1, 5), [160, 104]]),
        mid: 4, rim: 2.4,
        inner: (c) => {
          c.detail('blade-pits', [[[198, 50], [204, 56]], [[206, 70], [210, 76]], [[196, 80], [200, 86]]], LEAD, 1.6);
          c.flat('blade-stain', poly([[200, 34], [214, 34], [218, 48], [204, 50]]), BLOOD.mid, 0.6);
        },
      });
      // The hole in its corner that it hangs from in the shop.
      d.black('hang-hole', poly([[176, 38], [182, 38], [182, 44], [176, 44]]));
      fist(d, 'grip', [194, 112], TALLOW, 15, -84);
    }),
    part('shoulders', 'extra', 'body', [132, 104], (d) => {
      // A short shoulder cape of oiled leather, against the drip of the carcasses, which hides where the arms begin.
      d.ink('cape', poly([
        [86, 112], [96, 94], [120, 86], [148, 88], [170, 94], [184, 110],
        ...hem([184, 110], [84, 124], 'silas-cape', 5, 12).reverse().slice(1, -1),
        [84, 124],
      ]), LEATHER, {
        dark: poly([[70, 76], [106, 76], ...cut([106, 86], [112, 132], 'silas-cape-dark', -1, 6), [70, 134]]),
        cold: 2.6,
        inner: (c) => c.detail('cape-scuffs', [[[150, 94], [158, 106]], [[164, 98], [172, 108]]], LEATHER, 2),
      });
    }, 0.12),
    part('head', 'head', 'body', [148, 98], (d) => {
      neck(d, 'neck', [146, 86], TALLOW, 32);
      face(d, 'face', [154, 86], TALLOW, { size: 30, jaw: 1.22, scar: true });
      // Bald, the skull's planes showing; a nose broken twice; jowls.
      d.ink('skull', poly([[136, 76], [138, 66], [150, 59], [162, 60], [168, 66], [160, 66], [146, 70]]), TALLOW, { dark: 0.42, mid: 3, cold: 2, inner: (c) => c.detail('skull-planes', [[[152, 62], [162, 64]], [[144, 66], [146, 72]]], TALLOW, 1.6) });
      d.detail('jowl', [[[156, 98], [164, 100]], [[150, 100], [156, 104]]], TALLOW, 1.8);
      d.strokes('broken-nose', [[[166, 84], [170, 88]]], 1.8);
      // Grey stubble at the back of the head, cut close.
      d.detail('stubble', [[[138, 70], [138, 76]], [[142, 66], [143, 72]]], TALLOW, 1.4);
    }),
  ],
};

export const TRADES: UnitArt[] = [greta, ned, ida, silas];
