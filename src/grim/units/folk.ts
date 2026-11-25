// Folk and things a contract brings onto the field: the villagers a hunt has
// to keep alive, the cart it has to bring through, the hands for hire who
// make up a party, and what the hunters break or lay down. Plainer than a
// hunter on purpose: the eye goes to the hunter and the boss first, and a
// villager must read at once as somebody who cannot fight.

import { Doc, cut } from '../kit/draw';
import { arm, blot, boot, chain, face, fist, hem, limb, limbDark, neck, pouch, rivets, satLegs, stitches, strap, stud } from '../kit/figure';
import { BLOOD, BONE, EARTH, INK, LAMP, LEAD, LEATHER, MOSS, RUST, SOOT, STONE, TALLOW, WOOD } from '../kit/palette';
import { poly, type Pt } from '../kit/path';
import { hidden, part, type UnitArt } from '../kit/unit';
import { CHOP, DODGE, FALL, HIT, LEAN, REST, STAND, sitFor } from '../poses';
import { pose } from '../rig';
import { PERSON, PERSON_FEET, PERSON_MARGIN } from './hunters';

// ------------------------------------------------------------ how folk move

/** Running away: hunched forward, arms up over the head. The game plays it while a villager flees, between strides. */
const FLEE = {
  windup: pose({ bodyRot: 10, headRot: 8, weaponRot: -30, weaponY: -6, rootX: 4, legFrontRot: -18, legBackRot: 16, extraRot: -10 }),
  strike: pose({ bodyRot: 14, headRot: 12, weaponRot: -46, weaponY: -10, rootX: 8, legFrontRot: 16, legBackRot: -14, extraRot: -16 }),
};
/** Down on the ground with the arms over the head, as far from the blow as it can get. */
const COWER = pose({ rootY: 26, bodyRot: 22, bodyY: 6, headRot: 26, headY: 8, weaponRot: -54, weaponY: -2, legFrontRot: -60, legFrontY: -8, legBackRot: -44, legBackY: -6, extraRot: 10 });
/** A longbow drawn to the ear, then let go. */
const BOW = {
  windup: pose({ weaponRot: -4, weaponX: -4, bodyRot: -4, headRot: 2, offRot: -10, offX: -8, extraRot: 4 }),
  strike: pose({ weaponRot: 3, weaponX: 2, bodyRot: -8, headRot: -3, rootX: -4, offRot: 12, offX: 4, extraRot: 10 }),
};

// ------------------------------------------------------------ villagers

/**
 * A farmer, caught out: a straw hat with a torn brim, a smock and a sack over his shoulder he will not let go of,
 * patched trousers and clogs. Round-shouldered and small beside a hunter.
 */
const farmer: UnitArt = {
  id: 'villager-farmer',
  canvas: PERSON, feet: PERSON_FEET, margin: PERSON_MARGIN,
  moves: { flee: FLEE },
  stills: { cower: COWER, hit: HIT, fall: FALL },
  muzzle: [150, 140], top: 104,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 84, 10)),
    part('leg-back', 'legBack', 'root', [118, 186], (d) => {
      d.ink('leg', limb([118, 182], [112, 224], 17, 14, 1), WOOD, { dark: limbDark([118, 182], [112, 224], 17, 15, 'farm-lb', 0.62), mid: 2.5 });
      boot(d, 'clog', [114, 240], [112, 220], WOOD, 34, 15);
    }),
    part('leg-front', 'legFront', 'root', [138, 186], (d) => {
      d.ink('leg', limb([138, 182], [144, 224], 18, 14, 1), WOOD, { dark: limbDark([138, 182], [144, 224], 18, 15, 'farm-lf', 0.36), mid: 2.5, inner: (c) => { c.flat('patch', poly([[138, 198], [150, 197], [151, 209], [139, 210]]), WOOD.mid); c.detail('patch-stitch', stitches([138, 198], [150, 197], 3, 3, 0), WOOD, 1.2); } });
      boot(d, 'clog', [148, 240], [144, 220], WOOD, 36, 15);
    }),
    part('body', 'body', 'root', [128, 186], (d) => {
      d.ink('smock', poly([[108, 126], [150, 124], [158, 150], [156, 192], ...hem([156, 192], [102, 196], 'farm-smock', 5, 9).reverse().slice(1, -1), [102, 196], [100, 152]]), BONE, {
        dark: poly([[86, 118], [118, 118], ...cut([118, 126], [120, 200], 'farm-smock-d', -1, 6), [86, 200]]),
        cold: 2,
        inner: (c) => c.detail('smocking', [...stitches([126, 130], [146, 130], 5, 5, 0.4), [[134, 134], [136, 188]], [[146, 134], [150, 186]]], BONE, 1.6),
      });
      d.shade('under-arms', poly([[100, 132], [160, 130], [158, 142], [100, 146]]), ['smock']);
      strap(d, 'cord', [102, 164], [156, 160], 4, LEATHER);
      // The sack over his back: what he saved, and will not drop.
      d.ink('sack', poly([[86, 120], [108, 112], [116, 132], [112, 168], [90, 172], [80, 146]]), TALLOW, { dark: 0.55, mid: 3, cold: 2, inner: (c) => { c.detail('sack-fold', [[[94, 124], [98, 160]]], TALLOW, 1.6); c.flat('sack-patch', poly([[92, 146], [104, 144], [104, 156], [92, 158]]), TALLOW.mid); } });
      d.pen('sack-tie', poly([[104, 114], [110, 108], [114, 116]], false), 2.2);
    }),
    part('arms', 'weapon', 'body', [132, 130], (d) => {
      // One hand on the sack's neck over his shoulder, the other hanging: the flee throws both up.
      arm(d, 'arm-back', [118, 130], [106, 146], [104, 118], BONE, TALLOW, 12);
      arm(d, 'arm-front', [140, 130], [148, 154], [150, 176], BONE, TALLOW, 13);
    }),
    part('head', 'head', 'body', [134, 122], (d) => {
      neck(d, 'neck', [134, 112], TALLOW, 24);
      face(d, 'face', [138, 106], TALLOW, { size: 25, jaw: 1.1 });
      // A straw hat with its brim torn, low over the eyes.
      d.ink('hat-crown', poly([[122, 98], [126, 82], [148, 80], [154, 98]]), TALLOW, { dark: 0.4, mid: 2, inner: (c) => c.detail('straw', [[[128, 84], [128, 96]], [[136, 82], [136, 96]], [[144, 82], [146, 96]]], TALLOW, 1.3) });
      d.ink('hat-brim', poly([[106, 100], [170, 96], [176, 102], [164, 104], [160, 110], [150, 104], [112, 106]]), TALLOW, { dark: poly([[100, 103], [180, 99], [180, 110], [100, 112]]), mid: 2 });
      d.black('brim-shade', poly([[128, 104], [156, 102], [152, 112], [130, 114]]));
    }),
  ],
};

/** An old woman: bent nearly double over a stick, a shawl over her head and back, a long skirt to the ground, a basket. */
const crone: UnitArt = {
  id: 'villager-crone',
  canvas: PERSON, feet: PERSON_FEET, margin: PERSON_MARGIN,
  moves: { flee: FLEE },
  stills: { cower: COWER, hit: HIT, fall: FALL },
  muzzle: [150, 150], top: 116,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [130, 240], 86, 10)),
    part('leg-back', 'legBack', 'root', [120, 214], (d) => boot(d, 'shoe', [116, 240], [116, 226], SOOT, 30, 13)),
    part('leg-front', 'legFront', 'root', [138, 214], (d) => boot(d, 'shoe', [144, 240], [142, 226], SOOT, 32, 13)),
    part('body', 'body', 'root', [128, 200], (d) => {
      // The skirt, long and heavy and dragging its hem.
      d.ink('skirt', poly([[110, 164], [148, 160], [160, 230], ...hem([160, 230], [98, 232], 'crone-skirt', 5, 8).reverse().slice(1, -1), [98, 232]]), RUST, {
        dark: poly([[80, 156], [118, 156], ...cut([118, 162], [122, 236], 'crone-skirt-d', -1, 6), [80, 236]]),
        cold: 2,
        inner: (c) => c.detail('folds', [[[132, 168], [130, 226]], [[146, 168], [150, 226]]], RUST, 1.8),
      });
      d.ink('apron', poly([[134, 166], [150, 164], [158, 218], [140, 222]]), BONE, { dark: 0.3, mid: 2 });
      // The shawl: over the head and down the bent back, its fringe torn.
      d.ink('shawl', poly([[96, 136], [116, 118], [150, 120], [160, 140], [152, 172], ...hem([152, 172], [100, 178], 'crone-shawl', 5, 7).reverse().slice(1, -1), [100, 178]]), SOOT, {
        dark: poly([[80, 112], [120, 112], ...cut([120, 120], [118, 182], 'crone-shawl-d', -1, 6), [80, 184]]),
        cold: 2.2,
        inner: (c) => c.detail('weave', [...stitches([108, 140], [150, 140], 6, 5, 0.3), ...stitches([104, 158], [150, 156], 6, 5, 0.3)], SOOT, 1.3),
      });
      // A basket on her arm, with what she was carrying in it.
      d.ink('basket', poly([[90, 168], [114, 166], [112, 188], [94, 190]]), WOOD, { dark: 0.45, mid: 2, inner: (c) => c.detail('wicker', [...stitches([92, 172], [112, 170], 5, 14, 0)], WOOD, 1.4) });
      d.ink('loaf', poly([[94, 166], [104, 160], [112, 166]]), TALLOW, { dark: false, line: 1.4, heavy: 1.8 });
    }),
    part('stick', 'weapon', 'body', [146, 150], (d) => {
      arm(d, 'arm', [138, 140], [152, 160], [164, 168], SOOT, TALLOW, 11);
      d.ink('stick', limb([166, 238], [164, 160], 5, 5), WOOD, { dark: 0.45, mid: 0, line: 1.6, heavy: 2 });
      fist(d, 'hand', [164, 166], TALLOW, 6.5, 90);
    }),
    part('head', 'head', 'body', [148, 140], (d) => {
      face(d, 'face', [152, 132], TALLOW, { size: 22, jaw: 1.2, ear: false });
      // The shawl's hood over her head, the face deep inside it.
      d.ink('hood', poly([[132, 140], [134, 120], [150, 112], [166, 120], [162, 128], [146, 124], [140, 146]]), SOOT, { dark: 0.55, mid: 2, cold: 1.8 });
      d.black('hood-shade', poly([[146, 124], [164, 126], [160, 134], [148, 134]]));
    }),
  ],
};

/** A boy: small, in a cap too big for him and a tunic tied at the waist, barefoot, a stick for driving geese. */
const boy: UnitArt = {
  id: 'villager-boy',
  canvas: PERSON, feet: PERSON_FEET, margin: PERSON_MARGIN,
  moves: { flee: FLEE },
  stills: { cower: COWER, hit: HIT, fall: FALL },
  muzzle: [150, 160], top: 138,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 66, 9)),
    part('leg-back', 'legBack', 'root', [122, 204], (d) => {
      d.ink('leg', limb([122, 200], [118, 234], 11, 9, 1), TALLOW, { dark: limbDark([122, 200], [118, 234], 11, 10, 'boy-lb', 0.6), mid: 2 });
      d.ink('foot', poly([[112, 233], [126, 232], [128, 240], [110, 240]]), TALLOW, { dark: 0.5, mid: 0, line: 1.6, heavy: 2.4 });
    }),
    part('leg-front', 'legFront', 'root', [136, 204], (d) => {
      d.ink('leg', limb([136, 200], [140, 234], 12, 9, 1), TALLOW, { dark: limbDark([136, 200], [140, 234], 12, 10, 'boy-lf', 0.36), mid: 2 });
      d.ink('foot', poly([[134, 233], [148, 232], [152, 240], [132, 240]]), TALLOW, { dark: 0.3, mid: 0, line: 1.6, heavy: 2.4 });
    }),
    part('body', 'body', 'root', [128, 204], (d) => {
      d.ink('tunic', poly([[114, 158], [144, 156], [150, 176], [148, 208], ...hem([148, 208], [110, 210], 'boy-tunic', 4, 7).reverse().slice(1, -1), [110, 210], [108, 178]]), MOSS, {
        dark: poly([[94, 150], [122, 150], ...cut([122, 158], [124, 214], 'boy-tunic-d', -1, 5), [94, 214]]),
        cold: 1.8,
        inner: (c) => c.flat('patch', poly([[134, 184], [144, 183], [144, 194], [134, 195]]), MOSS.mid),
      });
      strap(d, 'tie', [110, 182], [148, 180], 4, BLOOD);
    }),
    part('arms', 'weapon', 'body', [132, 162], (d) => {
      arm(d, 'arm-back', [120, 162], [112, 178], [106, 160], MOSS, TALLOW, 9);
      d.ink('stick', limb([110, 200], [160, 120], 3.6, 3), WOOD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
      arm(d, 'arm-front', [140, 162], [148, 180], [140, 178], MOSS, TALLOW, 10);
    }),
    part('head', 'head', 'body', [134, 154], (d) => {
      face(d, 'face', [136, 142], TALLOW, { size: 21, mouth: false, jaw: 0.9 });
      // A cap too big for him, down over his ears, its peak broken.
      d.ink('cap', poly([[120, 140], [120, 126], [132, 118], [146, 120], [150, 130], [160, 134], [146, 136], [128, 144]]), LEATHER, { dark: 0.45, mid: 2, cold: 1.6 });
    }),
  ],
};

// ------------------------------------------------------------ the cart

/** One wheel: a rim of wood on spokes, an iron tire and a hub. Drawn about its axle so the rig can turn it. */
function wheel(d: Doc, name: string, at: Pt, r: number, far: boolean): void {
  const [x, y] = at;
  const ring = (k: number, n = 14): Pt[] => Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * Math.PI * 2) * r * k, y + Math.sin((i / n) * Math.PI * 2) * r * k] as Pt);
  d.black(`${name}-gaps`, poly(ring(0.98)));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    d.ink(`${name}-spoke-${i}`, limb([x, y], [x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86], 4.6, 3.6), WOOD, { dark: far ? 0.7 : 0.4, mid: 0, line: 1.4, heavy: 1.8 });
  }
  d.ink(`${name}-rim`, poly([...ring(1), ...ring(0.8).reverse(), ring(1)[0]]), WOOD, { dark: far ? 0.75 : 0.45, mid: 2, cold: far ? 0 : 2 });
  d.pen(`${name}-tire`, poly([...ring(1.02), ring(1.02)[0]], false), 2.6, INK);
  d.ink(`${name}-hub`, poly(ring(0.22, 8)), LEAD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
  stud(d, `${name}-pin`, [x + 1, y - 1], 1.8);
}

/**
 * A hand cart, heavy-laden: two big wheels, a bed of planks with low sides, a load of sacks and a cask lashed
 * under a sheet, two long shafts to pull it by. The wheels are parts of their own that turn about the axle.
 */
const cart: UnitArt = {
  id: 'cart',
  canvas: [320, 256], feet: [160, 240], margin: 80,
  moves: { roll: { windup: pose({ legBackRot: -60, legFrontRot: -60, bodyY: -1 }), strike: pose({ legBackRot: 60, legFrontRot: 60, bodyY: 1 }) } },
  stills: { hit: HIT, broken: pose({ rootRot: 14, rootY: 6, bodyRot: 6, legFrontRot: 40, legFrontY: 18, legBackRot: -20, extraRot: 20 }) },
  muzzle: [160, 140], top: 104,
  parts: [
    part('shadow', 'shadow', 'root', [160, 240], (d) => blot(d, [160, 240], 220, 14)),
    part('wheel-far', 'legBack', 'root', [140, 200], (d) => wheel(d, 'wheel', [140, 200], 38, true)),
    part('body', 'body', 'root', [160, 196], (d) => {
      // The shafts, long, to pull it by.
      d.ink('shaft', limb([210, 182], [306, 212], 7, 6), WOOD, { dark: 0.45, mid: 0, line: 1.6, heavy: 2 });
      // The bed and its low sides.
      d.ink('bed', poly([[62, 172], [232, 166], [236, 186], [66, 192]]), WOOD, {
        dark: poly([[50, 180], [250, 174], [250, 200], [50, 200]]),
        cold: 2,
        inner: (c) => c.detail('planks', [[[64, 178], [234, 172]], [[100, 170], [102, 190]], [[150, 168], [152, 188]], [[200, 166], [202, 186]]], WOOD, 1.6),
      });
      rivets(d, 'bed-nails', [72, 176], [226, 170], 6, 1.4);
      // The load: a cask on its side and sacks.
      d.ink('cask', poly([[78, 132], [130, 130], [136, 150], [130, 170], [78, 172], [72, 150]]), WOOD, { dark: 0.5, mid: 3, inner: (c) => { c.detail('staves', [[[84, 134], [84, 168]], [[96, 132], [96, 170]], [[108, 132], [108, 170]], [[120, 132], [120, 170]]], WOOD, 1.3); } });
      d.ink('hoop-a', poly([[88, 132], [94, 132], [94, 170], [88, 170]]), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
      d.ink('hoop-b', poly([[114, 131], [120, 131], [120, 170], [114, 170]]), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
      d.ink('sack-a', poly([[138, 130], [168, 120], [184, 128], [182, 168], [140, 170]]), TALLOW, { dark: 0.5, mid: 3, inner: (c) => c.detail('sack-fold', [[[156, 128], [160, 164]]], TALLOW, 1.6) });
      d.ink('sack-b', poly([[176, 140], [208, 132], [224, 144], [222, 168], [180, 168]]), TALLOW, { dark: 0.45, mid: 3, cold: 1.6 });
      d.pen('sack-tie', poly([[164, 122], [170, 114], [176, 122]], false), 2);
    }),
    part('sheet', 'extra', 'body', [150, 126], (d) => {
      // A sheet thrown over the load and roped down, its corner flapping: the lodge's red, so the cart is found.
      d.ink('sheet', poly([[96, 128], [150, 114], [192, 124], [210, 136], [198, 142], [178, 134], [140, 132], [108, 140]]), BLOOD, { dark: 0.4, mid: 3, inner: (c) => c.detail('sheet-fold', [[[130, 122], [134, 134]], [[168, 122], [174, 134]]], BLOOD, 1.6) });
      d.pen('rope', poly([[84, 136], [140, 120], [214, 140]], false), 2.4);
    }, 0.3),
    part('wheel-near', 'legFront', 'root', [176, 204], (d) => wheel(d, 'wheel', [176, 204], 40, false)),
  ],
};

// ------------------------------------------------------------ hands for hire

/**
 * A sellsword: a man for hire with nothing of his own but what he fights with. A dented iron cap, a mail
 * shirt over a stained gambeson, a short sword and a round wooden shield with its paint gone. Plainer than any
 * hunter and with no lodge's red on him.
 */
const sellsword: UnitArt = {
  id: 'sellsword',
  canvas: PERSON, feet: PERSON_FEET, margin: PERSON_MARGIN,
  moves: { chop: CHOP },
  stills: { hit: HIT, fall: FALL, dodge: DODGE, rest: REST, sit: sitFor(176, { weaponRot: 20 }), lean: LEAN },
  muzzle: [214, 120], top: 66,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 104, 11)),
    hidden(part('leg-back', 'legBack', 'root', [114, 178], (d) => {
      d.ink('leg', limb([114, 174], [104, 222], 21, 16, 1.5), SOOT, { dark: limbDark([114, 174], [104, 222], 21, 17, 'sell-lb', 0.6), mid: 2.5 });
      boot(d, 'boot', [104, 240], [104, 216], LEATHER, 40, 18);
    }), 'sit'),
    part('shield', 'offhand', 'body', [106, 130], (d) => {
      d.ink('shield', poly([[70, 104], [96, 94], [118, 102], [124, 130], [118, 160], [96, 170], [72, 160], [64, 132]]), WOOD, {
        dark: 0.5, cold: 2.2,
        inner: (c) => { c.detail('boards', [[[80, 100], [82, 164]], [[94, 96], [96, 168]], [[108, 98], [110, 164]]], WOOD, 1.6); c.flat('old-paint', poly([[84, 110], [104, 104], [110, 130], [90, 138]]), WOOD.mid); },
      });
      d.ink('boss', poly([[88, 124], [98, 118], [106, 126], [104, 138], [92, 140], [86, 132]]), LEAD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2, rim: 1.2 });
      rivets(d, 'rim-nails', [72, 128], [96, 98], 3, 1.4);
    }),
    hidden(part('leg-front', 'legFront', 'root', [140, 178], (d) => {
      d.ink('leg', limb([140, 174], [150, 222], 22, 17, 1.5), SOOT, { dark: limbDark([140, 174], [150, 222], 22, 18, 'sell-lf', 0.36), mid: 2.5 });
      boot(d, 'boot', [156, 240], [150, 216], LEATHER, 42, 19);
    }), 'sit'),
    part('body', 'body', 'root', [128, 176], (d) => {
      d.ink('gambeson', poly([[104, 106], [152, 104], [160, 134], [156, 182], ...hem([156, 182], [100, 186], 'sell-gam', 4, 9).reverse().slice(1, -1), [100, 186], [98, 140]]), TALLOW, {
        dark: poly([[84, 96], [116, 96], ...cut([116, 104], [120, 190], 'sell-gam-d', -1, 7), [84, 192]]),
        cold: 2,
        inner: (c) => { c.detail('quilt', [[[132, 108], [130, 180]], [[144, 108], [146, 178]]], TALLOW, 1.6); c.flat('stain', poly([[136, 150], [150, 146], [152, 160], [138, 164]]), TALLOW.mid); },
      });
      // Mail to the hips, its links rusting.
      d.ink('mail', poly([[106, 108], [150, 106], [156, 132], [152, 162], [104, 166], [100, 136]]), LEAD, { dark: poly([[86, 100], [118, 100], ...cut([118, 108], [122, 168], 'sell-mail', -1, 6), [86, 170]]), mid: 2, inner: (c) => c.detail('links', [...stitches([112, 114], [148, 112], 7, 6, 0.4), ...stitches([110, 132], [150, 130], 7, 6, 0.4), ...stitches([108, 150], [150, 148], 7, 6, 0.4)], LEAD, 1.1) });
      strap(d, 'belt', [100, 160], [156, 156], 7, LEATHER, 0.6, LEAD);
      pouch(d, 'purse', [146, 162], 12, 14, LEATHER);
    }),
    part('legs-sat', 'extra', 'body', [130, 176], (d) => satLegs(d, 'sat', [130, 176], 64, SOOT, LEATHER, 20), 0, false, 'sit'),
    part('sword', 'weapon', 'body', [144, 112], (d) => {
      arm(d, 'arm', [140, 112], [158, 136], [176, 120], TALLOW, LEATHER, 14);
      d.ink('blade', poly([[180, 114], [222, 74], [226, 78], [186, 120]]), LEAD, { dark: poly([[182, 118], [224, 77], [228, 82], [186, 124]]), mid: 0, rim: 1.4, line: 1.6, heavy: 2.2 });
      d.ink('guard', poly([[172, 108], [178, 104], [192, 124], [186, 128]]), LEAD, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
      fist(d, 'hand', [176, 120], LEATHER, 7.5, -45);
    }),
    part('head', 'head', 'body', [134, 100], (d) => {
      face(d, 'face', [140, 88], TALLOW, { size: 26, scar: true, jaw: 1.15 });
      // A plain iron cap with a dent in it and a nose guard, no crest, nothing of anybody's.
      d.ink('cap', poly([[120, 86], [124, 70], [138, 62], [152, 66], [158, 80], [150, 82], [128, 88]]), LEAD, { dark: 0.4, mid: 3, cold: 1.8, rim: 1.2, inner: (c) => c.detail('dent', [[[140, 66], [144, 74]]], LEAD, 2) });
      d.ink('nasal', poly([[148, 78], [153, 78], [154, 96], [150, 96]]), LEAD, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
    }),
  ],
};

/** A bowman for hire: a short hood, a leather jerkin, a longbow as tall as he is, arrows in a bag at his hip. */
const bowman: UnitArt = {
  id: 'bowman',
  canvas: PERSON, feet: PERSON_FEET, margin: PERSON_MARGIN,
  moves: { loose: BOW },
  stills: { hit: HIT, fall: FALL, dodge: DODGE, rest: REST, sit: sitFor(174, { weaponRot: 30, weaponY: 10 }), lean: LEAN },
  muzzle: [214, 112], top: 64,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 98, 11)),
    hidden(part('leg-back', 'legBack', 'root', [116, 176], (d) => {
      d.ink('leg', limb([116, 172], [106, 222], 18, 14, 1.5), WOOD, { dark: limbDark([116, 172], [106, 222], 18, 15, 'bow-lb', 0.6), mid: 2.5 });
      boot(d, 'boot', [106, 240], [106, 216], LEATHER, 38, 16);
    }), 'sit'),
    hidden(part('leg-front', 'legFront', 'root', [138, 176], (d) => {
      d.ink('leg', limb([138, 172], [148, 222], 19, 15, 1.5), WOOD, { dark: limbDark([138, 172], [148, 222], 19, 16, 'bow-lf', 0.36), mid: 2.5 });
      boot(d, 'boot', [154, 240], [148, 216], LEATHER, 40, 17);
    }), 'sit'),
    part('body', 'body', 'root', [128, 174], (d) => {
      d.ink('jerkin', poly([[106, 108], [150, 106], [156, 136], [152, 180], ...hem([152, 180], [104, 184], 'bow-jerk', 4, 9).reverse().slice(1, -1), [104, 184], [100, 140]]), LEATHER, {
        dark: poly([[86, 98], [118, 98], ...cut([118, 106], [122, 188], 'bow-jerk-d', -1, 7), [86, 190]]),
        cold: 2,
        inner: (c) => c.detail('lacing', stitches([142, 112], [144, 170], 7, 7, 0.3), LEATHER, 1.6),
      });
      strap(d, 'belt', [100, 156], [154, 152], 6, SOOT, 0.4, LEAD);
      // A bag of arrows at his hip, the fletchings out of it.
      d.ink('bag', poly([[100, 150], [116, 148], [118, 182], [102, 184]]), SOOT, { dark: 0.45, mid: 2 });
      d.strokes('arrows', [[[104, 150], [100, 136]], [[108, 150], [106, 134]], [[112, 149], [112, 136]]], 2.2);
      d.ink('fletch', poly([[96, 136], [114, 132], [116, 138], [98, 140]]), BONE, { dark: false, line: 1.2, heavy: 1.6 });
    }),
    part('legs-sat', 'extra', 'body', [128, 174], (d) => satLegs(d, 'sat', [128, 174], 66, WOOD, LEATHER, 18), 0, false, 'sit'),
    part('bow', 'weapon', 'body', [142, 114], (d) => {
      arm(d, 'arm-back', [132, 112], [150, 118], [168, 114], LEATHER, TALLOW, 12);
      // The longbow, held out in front, taller than he is.
      d.ink('stave', poly([[182, 32], [188, 36], [194, 80], [196, 114], [194, 150], [188, 196], [182, 200], [186, 150], [188, 114], [186, 80]]), WOOD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
      d.pen('string', poly([[184, 36], [168, 114], [184, 196]], false), 1.4);
      d.ink('grip', poly([[186, 106], [196, 106], [196, 122], [186, 122]]), LEATHER, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
      d.ink('arrow', poly([[164, 112], [214, 111], [222, 114], [214, 116], [164, 115]]), BONE, { dark: false, line: 1.2, heavy: 1.6 });
      arm(d, 'arm-front', [146, 116], [166, 116], [190, 114], LEATHER, TALLOW, 12);
    }),
    part('head', 'head', 'body', [136, 102], (d) => {
      face(d, 'face', [142, 90], TALLOW, { size: 26, ear: false });
      // A short hood with a long tail hanging down his back.
      d.ink('hood', poly([[116, 112], [118, 82], [132, 70], [148, 72], [156, 84], [146, 86], [138, 112]]), MOSS, { dark: 0.55, mid: 2, cold: 1.8 });
      d.ink('tail', poly([[118, 84], [100, 98], [94, 124], [104, 120], [116, 104]]), MOSS, { dark: 0.6, mid: 0 });
      d.black('hood-shade', poly([[138, 84], [156, 84], [154, 92], [140, 94]]));
    }),
  ],
};

// ------------------------------------------------------------ what a contract asks to be broken first, and what is laid

/** A grave marker the dead get up by: a crooked wooden cross on a mound of turned earth, a candle burning at its foot. */
const gravemarker: UnitArt = {
  id: 'gravemarker',
  canvas: [192, 256], feet: [96, 240], margin: 60,
  moves: { stand: STAND },
  stills: { hit: HIT, broken: pose({ bodyRot: 38, bodyY: 10, extraRot: 20 }) },
  muzzle: [96, 120], top: 86,
  parts: [
    part('shadow', 'shadow', 'root', [96, 240], (d) => blot(d, [96, 240], 120, 12)),
    part('mound', 'legFront', 'root', [96, 236], (d) => {
      d.ink('earth', poly([[30, 240], [52, 220], [96, 212], [140, 218], [164, 240]]), EARTH, { dark: poly([[20, 230], [70, 222], ...cut([70, 222], [60, 244], 'gm-earth', -1, 4), [20, 246]]), mid: 3, inner: (c) => c.detail('clods', [[[70, 228], [80, 226]], [[110, 222], [122, 226]], [[130, 232], [142, 230]]], EARTH, 2) });
    }),
    part('body', 'body', 'root', [96, 224], (d) => {
      d.ink('post', poly([[88, 226], [100, 226], [104, 96], [92, 94]]), WOOD, { dark: poly([[80, 230], [94, 230], ...cut([94, 226], [96, 92], 'gm-post', -1, 3), [80, 90]]), mid: 2, inner: (c) => c.detail('grain', [[[96, 120], [98, 200]]], WOOD, 1.4) });
      d.ink('arm', poly([[66, 124], [128, 116], [130, 128], [68, 136]]), WOOD, { dark: 0.4, mid: 2 });
      d.pen('lash', poly([[90, 118], [102, 132], [92, 132], [102, 118]], false), 2.2);
      // A rag tied to it, and the name cut off it long ago.
      d.ink('rag', poly([[118, 120], [126, 120], [128, 150], [122, 144], [118, 156]]), BONE, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
      d.strokes('cuts', [[[94, 150], [100, 150]], [[94, 162], [100, 164]]], 1.6);
    }),
    part('candle', 'extra', 'root', [122, 228], (d) => {
      d.ink('candle', poly([[118, 230], [126, 230], [126, 212], [118, 212]]), BONE, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
      d.flat('flame', poly([[120, 212], [122, 202], [125, 212]]), LAMP.lit);
      d.flat('heart', poly([[121, 211], [122, 206], [123.6, 211]]), LAMP.hot);
    }, 0),
  ],
};

/** An antler totem: a stake with a stag's antlers lashed to its top, bones and a bell hung on it: the King's mark on his wood. */
const totem: UnitArt = {
  id: 'totem',
  canvas: [192, 256], feet: [96, 240], margin: 60,
  moves: { stand: STAND },
  stills: { hit: HIT, broken: pose({ bodyRot: -42, bodyY: 12, extraRot: 30 }) },
  muzzle: [96, 80], top: 34,
  parts: [
    part('shadow', 'shadow', 'root', [96, 240], (d) => blot(d, [96, 240], 96, 11)),
    part('body', 'body', 'root', [96, 236], (d) => {
      d.ink('stake', poly([[88, 240], [102, 240], [104, 76], [94, 70], [88, 76]]), WOOD, { dark: poly([[80, 244], [94, 244], ...cut([94, 240], [96, 70], 'totem-stake', -1, 3), [80, 66]]), mid: 2, inner: (c) => c.detail('grain', [[[96, 100], [98, 220]]], WOOD, 1.4) });
      // The antlers, bleached, lashed on with rawhide.
      const tine = (name: string, pts: Pt[]): void => void d.ink(name, poly(pts), BONE, { dark: 0.35, mid: 0, line: 1.6, heavy: 2.2 });
      tine('beam-l', [[92, 82], [70, 60], [52, 32], [58, 30], [76, 54], [96, 76]]);
      tine('tine-l1', [[66, 52], [48, 50], [46, 44], [64, 46]]);
      tine('tine-l2', [[60, 40], [56, 18], [62, 18], [66, 38]]);
      tine('beam-r', [[98, 76], [120, 56], [140, 28], [146, 32], [128, 60], [102, 82]]);
      tine('tine-r1', [[124, 54], [146, 52], [148, 58], [126, 60]]);
      tine('tine-r2', [[134, 42], [140, 20], [146, 22], [140, 44]]);
      d.pen('rawhide', poly([[88, 78], [104, 88], [90, 92], [104, 80]], false), 2.4);
      d.ink('rag', poly([[90, 92], [104, 92], [108, 130], [100, 122], [94, 134]]), BLOOD, { dark: 0.4, mid: 2 });
    }),
    part('bones', 'extra', 'body', [72, 66], (d) => {
      d.pen('cord', poly([[72, 60], [70, 94]], false), 1.6);
      d.ink('bone', poly([[64, 94], [76, 92], [78, 98], [66, 100]]), BONE, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
      d.ink('jaw', poly([[62, 102], [78, 104], [76, 112], [66, 110]]), BONE, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
    }, 0.5, true),
    part('bell', 'extra', 'body', [128, 60], (d) => {
      d.pen('cord', poly([[128, 58], [128, 82]], false), 1.6);
      d.ink('bell', poly([[122, 82], [134, 82], [140, 100], [116, 100]]), RUST, { dark: 0.4, mid: 2, rim: 1.2, line: 1.6, heavy: 2 });
      d.black('mouth', poly([[118, 98], [138, 98], [136, 102], [120, 102]]));
    }, 0.6, true),
  ],
};

/** A standing stone, as a figure the game can stand on the field and knock a boss into: grey, leaning, ringed with lichen. */
const stone: UnitArt = {
  id: 'stone',
  canvas: [192, 256], feet: [96, 240], margin: 60,
  moves: { stand: STAND },
  stills: { hit: HIT, cracked: pose({ bodyRot: 6, bodyY: 2 }) },
  muzzle: [96, 120], top: 40,
  parts: [
    part('shadow', 'shadow', 'root', [96, 240], (d) => blot(d, [96, 240], 130, 14)),
    part('body', 'body', 'root', [96, 236], (d) => {
      d.ink('stone', poly([[48, 240], [44, 150], [58, 70], [86, 40], [118, 46], [140, 96], [148, 170], [144, 240]]), STONE, {
        dark: poly([[30, 250], [30, 40], [80, 40], ...cut([80, 46], [92, 246], 'stone-d', -1, 8), [96, 250]]),
        cold: 2.4,
        inner: (c) => {
          c.flat('lichen-a', poly([[100, 70], [118, 66], [124, 82], [106, 88]]), MOSS.mid);
          c.flat('lichen-b', poly([[110, 170], [132, 164], [138, 182], [116, 188]]), MOSS.mid);
          c.detail('cracks', [[[96, 50], [102, 96]], [[102, 96], [94, 130]], [[120, 120], [134, 150]]], STONE, 2);
          c.detail('carving', [[[92, 140], [104, 150]], [[104, 150], [116, 140]], [[104, 150], [104, 166]]], STONE, 2.6);
        },
      });
    }),
  ],
};

/** Jory's jaw trap as it lies set on the ground, its teeth up: a figure so that it can be shown shut on what stepped in. */
const jawtrap: UnitArt = {
  id: 'jawtrap',
  canvas: [128, 96], feet: [64, 80], margin: 30,
  moves: { stand: STAND },
  stills: { shut: pose({ weaponRot: 60, offRot: -60 }) },
  muzzle: [64, 60], top: 54,
  parts: [
    part('shadow', 'shadow', 'root', [64, 80], (d) => blot(d, [64, 80], 96, 8)),
    part('body', 'body', 'root', [64, 78], (d) => {
      d.ink('base', poly([[24, 74], [104, 72], [106, 80], [22, 82]]), LEAD, { dark: 0.4, mid: 2 });
      d.ink('pan', poly([[54, 70], [74, 70], [76, 76], [52, 76]]), RUST, { dark: false, line: 1.4, heavy: 1.8 });
      chain(d, 'chain', [22, 78], [6, 86], 5);
    }),
    part('jaw-far', 'offhand', 'body', [64, 74], (d) => d.ink('jaw', poly([[22, 74], [26, 58], [34, 66], [40, 54], [48, 64], [56, 52], [64, 64], [64, 74]]), LEAD, { dark: 0.5, mid: 0, line: 1.6, heavy: 2.2 })),
    part('jaw-near', 'weapon', 'body', [64, 74], (d) => d.ink('jaw', poly([[64, 74], [64, 64], [72, 52], [80, 64], [88, 54], [94, 66], [102, 58], [106, 74]]), LEAD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2.2, rim: 1.2 })),
  ],
};

export const FOLK: UnitArt[] = [farmer, crone, boy, cart, sellsword, bowman, gravemarker, totem, stone, jawtrap];
