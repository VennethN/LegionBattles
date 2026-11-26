// Old Amos, the Drover, and Bull, his mastiff. They took Brask's place in
// the lodge so that nobody could take him for another game's old man with a
// pack of hunting dogs: Amos drives cattle over the moor and has one great
// dog in a leather coat, and everything he carries says cattle, not hounds.

import { cut, type Doc } from '../kit/draw';
import { arm, between, blot, boot, face, fist, hem, limb, limbDark, neck, pouch, rivets, satLegs, stitches, strap, stud } from '../kit/figure';
import { BLOOD, BONE, BRACKEN, LEAD, LEATHER, RUST, SOOT, TALLOW, WOOD } from '../kit/palette';
import { poly, type Pt } from '../kit/path';
import { hidden, part, type UnitArt } from '../kit/unit';
import { DODGE, FALL, HIT, LEAN, LUNGE_BITE, POINT, REST, UNDERHAND, WHISTLE, sitFor } from '../poses';
import { pose } from '../rig';
import { PERSON, PERSON_FEET, PERSON_MARGIN } from './hunters';

/** The third thrust, with Bull going in beside it: the whole weight thrown behind the goad. */
const DRIVE = {
  windup: pose({ weaponRot: 26, weaponY: 6, weaponX: -14, bodyRot: -12, bodyY: 3, headRot: 8, rootX: -10, legFrontRot: -12, extraRot: 14 }),
  strike: pose({ weaponRot: 82, weaponX: 30, weaponY: 30, bodyRot: 20, bodySy: -0.05, headRot: -12, rootX: 24, legFrontRot: -20, legBackRot: 20, extraRot: -26 }),
};

/** A cattle bell: a squared iron bell, dented, on a leather strap. `at` is where its strap hangs from. */
function cattleBell(d: Doc, name: string, at: Pt, k = 1): void {
  const [x, y] = at;
  const P = (dx: number, dy: number): Pt => [x + dx * k, y + dy * k];
  d.ink(`${name}-strap`, poly([P(-2, 0), P(2, 0), P(2, 6), P(-2, 6)]), LEATHER, { dark: false, mid: 0, line: 1.2, heavy: 1.6 });
  d.ink(`${name}-bell`, poly([P(-6, 6), P(6, 6), P(8, 20), P(-8, 20)]), LEAD, {
    dark: poly([P(0, 4), P(10, 4), P(10, 22), P(1, 22)]), mid: 2, line: 1.6, heavy: 2.2, rim: 1.2,
    inner: (c) => c.detail(`${name}-dent`, [[P(-4, 12), P(-1, 14)]], LEAD, 1.4),
  });
  d.black(`${name}-mouth`, poly([P(-8, 20), P(8, 20), P(6, 22.5), P(-6, 22.5)]));
  d.black(`${name}-clapper`, poly([P(-1.5, 21), P(1.5, 21), P(1.5, 25), P(-1.5, 25)]));
}

/**
 * Old Amos, the Drover. Forty years behind cattle on the moor have bent him at the shoulders and nowhere else:
 * a low hat with a brim as wide as a cart wheel, a long frieze coat to his calves with a short cape over it,
 * a red cloth at his throat, a cattle bell at one hip and a coil of rope at the other, a dog whistle on a cord
 * in his fist, and a goad-spear stood beside him: a drover's staff taller than he is, with an iron point and a
 * hook for turning a beast.
 */
const amos: UnitArt = {
  id: 'amos',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { thrust: UNDERHAND, drive: DRIVE, setOn: POINT, heel: WHISTLE },
  stills: { hit: HIT, fall: FALL, dodge: DODGE, rest: REST, sit: sitFor(178, { weaponRot: -22 }), lean: LEAN },
  muzzle: [196, -6],
  top: 52,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [132, 240], 120, 13)),
    hidden(part('leg-back', 'legBack', 'root', [114, 180], (d) => {
      d.ink('breeches', limb([116, 176], [108, 220], 22, 17, 1.5), WOOD, { dark: limbDark([116, 176], [108, 220], 22, 19, 'amos-lb', 0.6), mid: 2.5 });
      boot(d, 'boot', [106, 240], [108, 212], LEATHER, 44, 20);
    }), 'sit'),
    part('whistle-arm', 'offhand', 'body', [116, 112], (d) => {
      arm(d, 'arm', [116, 112], [120, 146], [138, 162], BRACKEN, LEATHER, 16);
      // The dog whistle in his fist, and its cord looped round the wrist.
      d.ink('whistle', poly([[134, 158], [146, 154], [148, 159], [136, 163]]), BONE, { dark: false, mid: 0, line: 1.3, heavy: 1.6 });
      d.pen('whistle-cord', poly([[134, 158], [128, 170], [136, 178], [142, 166]], false), 1.8, TALLOW.mid);
    }),
    hidden(part('leg-front', 'legFront', 'root', [144, 180], (d) => {
      d.ink('breeches', limb([144, 176], [154, 220], 23, 18, 1.5), WOOD, {
        dark: poly([[126, 170], [140, 170], ...cut([140, 176], [148, 224], 'amos-lf', -1, 4), [126, 224]]), mid: 2.5,
        inner: (c) => c.detail('knee', [[[148, 198], [160, 196]]], WOOD, 1.6),
      });
      boot(d, 'boot', [160, 240], [154, 212], LEATHER, 46, 21);
      strap(d, 'gaiter', [146, 216], [166, 214], 4.5, LEATHER, 0.7, LEAD);
    }), 'sit'),
    part('body', 'body', 'root', [130, 178], (d) => {
      // The frieze coat: long, heavy, its skirts split for riding and torn at the hem by gorse.
      d.ink('coat', poly([
        [104, 104], [156, 102], [166, 130], [162, 170], [170, 214],
        ...hem([170, 214], [96, 218], 'amos-coat', 6, 10).reverse().slice(1, -1),
        [96, 218], [104, 170], [98, 130],
      ]), BRACKEN, {
        dark: poly([[80, 94], [118, 94], ...cut([118, 102], [124, 222], 'amos-coat-dark', -1, 8), [80, 224]]),
        mid: 3, cold: 2.4,
        open: [[[164, 134], [161, 166]]],
        inner: (c) => {
          c.detail('coat-seams', [[[146, 106], [150, 212]], [[132, 176], [130, 214]]], BRACKEN, 1.8);
          c.detail('creases', [[[140, 150], [150, 160]], [[150, 186], [160, 200]]], BRACKEN, 2);
          // A patch where a horn caught it, sewn on rough.
          c.flat('patch', poly([[110, 182], [124, 180], [126, 196], [112, 198]]), BRACKEN.mid);
          c.strokes('patch-thread', stitches([110, 182], [124, 180], 4, 3, 0), 1.2);
        },
      });
      // Horn buttons down the front.
      [116, 132, 148].forEach((y, i) => stud(d, `button-${i}`, [156, y], 2));
      strap(d, 'belt', [100, 158], [164, 154], 8, LEATHER, 0.62, LEAD);
      // The cattle bell at his front hip, and the rope, coiled, at his back.
      cattleBell(d, 'bell', [150, 160], 1.1);
      d.ink('rope', poly([[98, 162], [104, 158], [118, 158], [122, 164], [120, 186], [114, 192], [104, 192], [98, 186]]), TALLOW, {
        dark: 0.42, mid: 2, line: 1.8, heavy: 2.4,
        inner: (c) => c.detail('rope-turns', [[[100, 168], [120, 166]], [[100, 176], [121, 174]], [[101, 184], [119, 183]]], TALLOW, 1.6),
      });
      pouch(d, 'salt-bag', [128, 164], 12, 14, LEATHER);
    }),
    part('legs-sat', 'extra', 'body', [130, 176], (d) => satLegs(d, 'sat', [130, 176], 64, WOOD, LEATHER, 21), 0, false, 'sit'),
    part('goad', 'weapon', 'body', [148, 114], (d) => {
      // The goad-spear: a drover's staff of ash, iron-shod, with a point for driving and a hook beside it for turning.
      const butt: Pt = [178, 240];
      const tip: Pt = [196, -10];
      const at = (t: number): Pt => between(butt, tip, t);
      d.ink('staff', limb(butt, at(0.86), 8, 7), WOOD, {
        dark: limbDark(butt, at(0.86), 8, 8, 'amos-staff', 0.4), mid: 0, line: 1.8, heavy: 2.4,
        inner: (c) => c.detail('staff-grain', [[at(0.12), at(0.2)], [at(0.5), at(0.6)], [at(0.72), at(0.8)]], WOOD, 1.3),
      });
      d.black('shoe', limb(butt, at(0.03), 9, 8));
      const h = at(0.86);
      const H = (dx: number, dy: number): Pt => [h[0] + dx, h[1] + dy];
      // The iron: a socket, a long square point, and a hook bent back from it.
      d.ink('socket', poly([H(-4.5, -2), H(5, -2), H(4.5, 16), H(-4, 16)]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
      rivets(d, 'socket-nails', H(0.4, 3), H(0.3, 13), 2, 1.3);
      d.ink('point', poly([H(-4, -2), H(-2, -26), H(1, -40), H(4, -26), H(5, -2)]), LEAD, {
        dark: poly([H(1, -44), H(10, -44), H(10, 0), H(1, 0)]), mid: 2, line: 1.8, heavy: 2.4, rim: 1.8,
      });
      d.ink('hook', poly([H(4, 2), H(14, -4), H(22, -14), H(20, -24), H(16, -22), H(17, -14), H(11, -8), H(5, 8)]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4, rim: 1.4 });
      // Bound where his hand goes, with a strip of hide.
      d.ink('grip', limb(at(0.42), at(0.5), 9.6, 9.2), LEATHER, { dark: limbDark(at(0.42), at(0.5), 10, 10, 'amos-grip', 0.4), mid: 0, line: 1.4, heavy: 1.8, inner: (c) => c.detail('grip-turns', stitches(at(0.43), at(0.49), 3, 9, 0.35), LEATHER, 1.2) });
      arm(d, 'arm', [148, 114], [170, 140], at(0.46), BRACKEN, LEATHER, 18);
      fist(d, 'fist', at(0.46), LEATHER, 8, 20);
    }),
    part('cape', 'extra', 'body', [132, 104], (d) => {
      // The short cape over his shoulders, frieze like the coat, its edge worn ragged.
      d.ink('cape', poly([
        [100, 116], [108, 98], [130, 90], [154, 92], [168, 106], [170, 122],
        ...hem([170, 122], [98, 130], 'amos-cape', 5, 10).reverse().slice(1, -1),
        [98, 130],
      ]), BRACKEN, {
        dark: poly([[84, 84], [120, 84], ...cut([120, 90], [124, 136], 'amos-cape-dark', -1, 5), [84, 138]]),
        mid: 2, cold: 2.4,
        inner: (c) => c.detail('cape-seams', [[[134, 94], [136, 124]]], BRACKEN, 1.6),
      });
    }, 0.2),
    part('head', 'head', 'body', [146, 100], (d) => {
      neck(d, 'neck', [146, 82], TALLOW, 27);
      face(d, 'face', [152, 86], TALLOW, { size: 27, jaw: 1.1, scar: false });
      // White whiskers cut short down the jaw, and the red cloth knotted at his throat.
      d.ink('whiskers', poly([[138, 90], [146, 92], [150, 104], [158, 106], [156, 112], [144, 112], [136, 102]]), BONE, {
        dark: 0.42, mid: 2, line: 1.8, heavy: 2.4,
        inner: (c) => c.detail('whisker-locks', [[[142, 96], [144, 108]], [[148, 104], [152, 110]]], BONE, 1.4),
      });
      d.ink('neckcloth', poly([[136, 106], [162, 106], [160, 116], [150, 120], [140, 114]]), BLOOD, { dark: 0.4, mid: 2, line: 1.8, heavy: 2.4 });
      d.ink('neckcloth-end', poly([[150, 116], [158, 118], [156, 132], [150, 128]]), BLOOD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
      // The dog whistle he calls Bull with, of horn, on a cord round his neck.
      d.pen('whistle-cord', poly([[142, 112], [146, 126], [152, 132]], false), 1.8, TALLOW.mid);
      d.ink('whistle', poly([[148, 130], [160, 126], [162, 131], [150, 135]]), BONE, { dark: false, mid: 0, line: 1.3, heavy: 1.6 });
      // The hat: a low round crown, and a brim as wide as his shoulders that shades all his face but the jaw.
      d.ink('crown', poly([[130, 74], [132, 60], [146, 52], [164, 54], [172, 66], [170, 76]]), SOOT, {
        dark: 0.45, mid: 3,
        inner: (c) => c.detail('crown-dent', [[[148, 54], [152, 66]]], SOOT, 1.6),
      });
      d.ink('band', poly([[131, 70], [171, 70], [171, 77], [131, 77]]), LEATHER, { dark: 0.3, mid: 0, line: 1.6, heavy: 2 });
      d.ink('brim', poly([[96, 86], [108, 76], [130, 72], [172, 72], [196, 78], [194, 84], [170, 82], [130, 82], [110, 90]]), SOOT, {
        dark: poly([[92, 80], [126, 78], [124, 96], [92, 96]]), mid: 2,
        open: [[[176, 73], [194, 78]]],
      });
    }),
  ],
};

/**
 * Bull, Amos's mastiff: twice the weight of a hound and built like a gate-post, a great square head with heavy
 * jowls, cropped ears, a brindled coat under a fighting coat of studded leather with a strap round his chest, and
 * a collar of iron spikes. His chest is pale so that he is never lost in the dark.
 */
const bull: UnitArt = {
  id: 'bull',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: {
    bite: LUNGE_BITE,
    run: { windup: pose({ legFrontRot: 30, legBackRot: -30, rootY: 2, bodyRot: -3, weaponRot: -4 }), strike: pose({ legFrontRot: -34, legBackRot: 32, rootY: -5, bodyRot: 4, weaponRot: 4, extraRot: -18 }) },
  },
  stills: {
    hit: HIT,
    fall: FALL,
    // Lying down by the fire at the inn: low on the floor, head on his paws.
    lie: pose({ rootY: 20, bodyRot: 2, weaponRot: 14, weaponY: 6, weaponX: 4, extraRot: 10 }),
  },
  muzzle: [228, 160],
  top: 128,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [130, 240], 150, 13)),
    part('tail', 'extra', 'body', [72, 166], (d) => {
      d.ink('tail', poly([[74, 162], [78, 172], [62, 186], [54, 204], [56, 186], [64, 172]]), BRACKEN, { dark: 0.5, mid: 2, rim: 0 });
    }, 1.1),
    hidden(part('legs-back', 'legBack', 'root', [90, 186], (d) => {
      d.ink('hind', poly([[78, 176], [104, 178], [100, 202], [108, 222], [104, 240], [90, 240], [92, 224], [80, 204]]), BRACKEN, { dark: 0.5 });
      d.ink('fore-far', limb([158, 192], [154, 240], 15, 12), BRACKEN, { dark: 0.6, mid: 2, rim: 0 });
    }), 'lie'),
    part('body', 'body', 'root', [124, 186], (d) => {
      // A barrel of a dog: the chest deep and wide, the loin hardly drawn up at all.
      d.ink('trunk', poly([[74, 166], [102, 154], [146, 148], [176, 154], [184, 182], [172, 206], [146, 206], [116, 198], [86, 196]]), BRACKEN, {
        dark: poly([[60, 172], ...cut([80, 186], [186, 200], 'bull-trunk', 1, 5), [186, 222], [60, 222]]),
        cold: 2.2, mid: 3,
        inner: (c) => {
          // The brindle: a few dark streaks over his coat.
          c.detail('brindle', [[[96, 168], [90, 186]], [[108, 162], [102, 180]], [[120, 160], [116, 176]], [[160, 160], [156, 172]]], BRACKEN, 2.6);
        },
      });
      // The fighting coat: thick studded leather over his back and flanks, strapped under the chest.
      d.ink('coat', poly([[82, 162], [104, 152], [146, 146], [172, 152], [174, 170], [158, 184], [120, 186], [88, 182]]), LEATHER, {
        dark: poly([[70, 166], ...cut([86, 176], [176, 178], 'bull-coat', 1, 4), [176, 196], [70, 196]]), mid: 3,
        inner: (c) => c.detail('coat-seam', [[[126, 150], [124, 184]]], LEATHER, 1.6),
      });
      rivets(d, 'coat-studs', [92, 170], [166, 168], 7, 1.8);
      rivets(d, 'coat-studs-top', [104, 158], [160, 154], 5, 1.6);
      // The girth that holds the coat on, under his chest, with an iron ring where it meets the coat.
      d.ink('girth', poly([[144, 150], [152, 150], [156, 204], [148, 204]]), LEATHER, { dark: 0.45, mid: 0, line: 1.6, heavy: 2 });
      d.ink('girth-ring', poly([[144, 178], [154, 178], [154, 186], [144, 186]]), LEAD, { dark: false, mid: 0, line: 1.4, heavy: 1.8 });
    }),
    hidden(part('legs-front', 'legFront', 'root', [166, 194], (d) => {
      d.ink('fore', poly([[158, 188], [180, 190], [178, 216], [184, 240], [166, 240], [164, 218]]), BRACKEN, { dark: 0.42 });
      d.ink('hind-near', poly([[92, 180], [116, 184], [112, 204], [122, 224], [120, 240], [104, 240], [106, 226], [96, 208]]), BRACKEN, { dark: 0.42 });
    }), 'lie'),
    part('legs-lie', 'extra', 'body', [124, 200], (d) => {
      // Lying: the forelegs stretched out in front, the hind folded under him.
      d.ink('fore-out', poly([[156, 214], [210, 216], [214, 226], [156, 228]]), BRACKEN, { dark: 0.42, mid: 2 });
      d.ink('hind-fold', poly([[84, 204], [118, 206], [124, 224], [84, 226]]), BRACKEN, { dark: 0.5, mid: 2 });
    }, 0, false, 'lie'),
    part('head', 'weapon', 'body', [178, 160], (d) => {
      // A great square head on a neck as thick as it: a broad brow, a short deep muzzle in a black mask, and jowls
      // that hang below the jaw. The brow is a ledge of black over where an eye would be, and no eye is drawn.
      d.ink('neck', poly([[160, 150], [188, 140], [200, 164], [182, 186], [166, 176]]), BRACKEN, { dark: 0.45, mid: 2 });
      // His pale breast, under the neck, so that he is never lost in the dark.
      d.ink('breast', poly([[170, 176], [192, 166], [198, 184], [188, 200], [174, 198]]), TALLOW, { dark: 0.35, mid: 2, line: 2, heavy: 2.6 });
      d.ink('skull', poly([[174, 140], [184, 128], [204, 126], [214, 136], [216, 150], [206, 164], [186, 166], [174, 156]]), BRACKEN, {
        dark: poly([[168, 128], [182, 124], ...cut([184, 130], [184, 168], 'bull-skull', -1, 4), [168, 170]]),
        mid: 3,
        inner: (c) => {
          c.black('brow', poly([[200, 136], [214, 136], [215, 142], [204, 143], [198, 140]]));
          c.detail('brow-folds', [[[190, 132], [198, 128]], [[192, 140], [200, 136]]], BRACKEN, 1.6);
        },
      });
      d.ink('muzzle', poly([[206, 140], [226, 142], [232, 150], [230, 164], [212, 168], [204, 158]]), SOOT, {
        dark: poly([[200, 158], [236, 158], [236, 172], [200, 172]]), mid: 2, line: 2, heavy: 2.6,
        inner: (c) => c.detail('muzzle-fold', [[[212, 146], [210, 160]]], SOOT, 1.4),
      });
      d.ink('jowl', poly([[204, 160], [226, 162], [224, 176], [214, 184], [204, 178]]), SOOT, { dark: 0.55, mid: 0, line: 2, heavy: 2.6 });
      d.black('nose', poly([[226, 142], [233, 145], [233, 152], [226, 152]]));
      // One fang over the lip at the corner of his jaw: a row of teeth on a black muzzle would read as eyes.
      d.ink('fang', poly([[217, 166], [222, 166], [220, 174]]), BONE, { dark: false, line: 1, heavy: 1.2, rim: 0 });
      // His ears, cropped short and square.
      d.ink('ear', poly([[182, 130], [184, 116], [194, 120], [194, 130]]), BRACKEN, { dark: 0.5, mid: 0, rim: 0 });
      // The collar: iron spikes on a band of hide.
      d.ink('collar', poly([[164, 160], [186, 150], [192, 160], [170, 172]]), LEATHER, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4, rim: 0 });
      for (const [i, [x, y]] of [[168, 162], [176, 158], [184, 154]].entries()) {
        d.ink(`spike-${i}`, poly([[x - 3, y + 1], [x, y - 8], [x + 3, y]]), LEAD, { dark: false, mid: 0, line: 1.2, heavy: 1.6, rim: 1 });
      }
      d.ink('tag', poly([[172, 170], [180, 168], [181, 176], [173, 178]]), RUST, { dark: false, mid: 0, line: 1.2, heavy: 1.6 });
    }),
  ],
};

export const DROVER: UnitArt[] = [amos, bull];
