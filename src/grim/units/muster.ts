// What a hunter brings: the lodge's people, a hound, and the things that
// are set down in a lair before the monster wakes. They are plainer than a
// hunter, on purpose: the player's eye should go to the hunter first.

import { cut } from '../kit/draw';
import { arm, between, blot, boot, face, hem, limb, limbDark, stud } from '../kit/figure';
import { BLOOD, BONE, EARTH, LAMP, LEAD, LEATHER, RUST, SOOT, STONE, TALLOW, WOOD } from '../kit/palette';
import { poly, type Pt } from '../kit/path';
import { part, type UnitArt } from '../kit/unit';
import { FALL, HIT, KICK, LUNGE_BITE, STAND, THRUST } from '../poses';
import { PERSON, PERSON_FEET, PERSON_MARGIN, streetLamp } from './hunters';

/** A pikeman of the lodge: a quilted coat, a mail hood under an iron cap, the lodge's red, and a pike held low at what comes. */
const pikeman: UnitArt = {
  id: 'pikeman',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { thrust: THRUST },
  stills: { hit: HIT, fall: FALL },
  muzzle: [250, 118],
  top: 62,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [126, 240], 100, 11)),
    part('leg-back', 'legBack', 'root', [110, 172], (d) => {
      d.ink('leg', limb([112, 168], [100, 222], 20, 15), SOOT, { dark: limbDark([112, 168], [100, 222], 20, 17, 'pike-lb', 0.55) });
      boot(d, 'boot', [100, 240], [100, 216], LEATHER, 38, 17);
    }),
    part('leg-front', 'legFront', 'root', [136, 172], (d) => {
      d.ink('leg', limb([136, 168], [150, 222], 21, 16), SOOT, { dark: limbDark([136, 168], [150, 222], 21, 18, 'pike-lf', 0.4) });
      boot(d, 'boot', [156, 240], [150, 216], LEATHER, 40, 18);
    }),
    part('body', 'body', 'root', [124, 170], (d) => {
      d.ink('jack', poly([[100, 106], [150, 104], [158, 136], [152, 178], [102, 182], [96, 140]]), TALLOW, {
        dark: poly([[84, 96], [114, 96], ...cut([114, 104], [118, 186], 'pike-jack', -1, 7), [84, 188]]),
        cold: 2,
        inner: (c) => {
          c.detail('quilt', [[[138, 106], [140, 176]], [[150, 108], [150, 172]], [[128, 106], [126, 178]]], TALLOW, 1.8);
          c.flat('jack-patch', poly([[140, 160], [154, 158], [152, 176], [140, 178]]), TALLOW.mid);
        },
      });
      // The lodge's red, worn as a short tabard, torn.
      d.ink('tabard', poly([[118, 104], [146, 104], [150, 158], [144, 150], [140, 168], [134, 152], [128, 162], [124, 146], [120, 156]]), BLOOD, { dark: 0.3, mid: 3, inner: (c) => { c.detail('tabard-fold', [[[132, 108], [134, 150]]], BLOOD, 1.8); c.black('tabard-hole', poly([[138, 126], [143, 124], [142, 132]])); } });
      d.ink('belt', poly([[97, 144], [156, 140], [156, 150], [98, 154]]), LEATHER, { dark: 0.4, mid: 2, line: 1.8, heavy: 2.4, rim: 0 });
    }),
    part('pike', 'weapon', 'body', [136, 112], (d) => {
      const butt: Pt = [70, 168];
      const tip: Pt = [252, 116];
      const at = (t: number): Pt => between(butt, tip, t);
      arm(d, 'arm-back', [116, 112], [112, 140], at(0.22), TALLOW, LEATHER, 15);
      d.ink('shaft', limb(butt, at(0.9), 7, 6.4), WOOD, { dark: limbDark(butt, at(0.9), 7, 7, 'pike-shaft', 0.4), mid: 0, line: 1.8, heavy: 2.4, rim: 0 });
      const h = at(0.9);
      d.ink('head', poly([[h[0], h[1] - 5], [h[0] + 8, h[1] - 7], [tip[0], tip[1]], [h[0] + 6, h[1] + 6], [h[0] - 1, h[1] + 4]]), LEAD, { dark: poly([[h[0] - 4, h[1] + 1], [tip[0] + 2, tip[1] + 1], [h[0] + 6, h[1] + 9], [h[0] - 4, h[1] + 8]]), mid: 0, rim: 0 });
      arm(d, 'arm-front', [142, 112], [150, 138], at(0.5), TALLOW, LEATHER, 16);
    }),
    part('head', 'head', 'body', [134, 100], (d) => {
      face(d, 'face', [140, 86], TALLOW, { size: 27 });
      // A hood of mail, and a plain iron cap on it.
      d.ink('mail', poly([[118, 106], [120, 80], [130, 72], [138, 76], [134, 92], [136, 108]]), LEAD, { dark: 0.55, mid: 2 });
      d.ink('cap', poly([[118, 80], [122, 67], [138, 60], [152, 64], [160, 76], [152, 75], [122, 84]]), LEAD, { dark: 0.36, mid: 3, cold: 1.8, rim: 1.4, inner: (c) => c.detail('cap-dent', [[[140, 64], [146, 72]]], LEAD, 2) });
      stud(d, 'rivet', [138, 70], 1.8);
      stud(d, 'rivet-b', [148, 71], 1.8);
    }),
  ],
};

/** One of Brask's hounds: deep in the chest, thin in the loin, a collar with spikes and the lodge's rag on it. */
const hound: UnitArt = {
  id: 'hound',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { bite: LUNGE_BITE },
  stills: { hit: HIT, fall: FALL },
  muzzle: [206, 176],
  top: 142,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 124, 11)),
    part('tail', 'extra', 'body', [84, 178], (d) => {
      d.ink('tail', poly([[86, 174], [90, 182], [70, 196], [56, 216], [62, 196], [72, 182]]), SOOT, { dark: 0.5, mid: 2, rim: 0 });
    }, 1.2),
    part('legs-back', 'legBack', 'root', [96, 190], (d) => {
      d.ink('hind', poly([[88, 182], [108, 184], [104, 204], [112, 222], [108, 240], [98, 240], [100, 226], [90, 206]]), SOOT, { dark: 0.5 });
      d.ink('fore-far', limb([150, 196], [146, 240], 11, 8), SOOT, { dark: 0.6, mid: 2, rim: 0 });
    }),
    part('body', 'body', 'root', [124, 190], (d) => {
      // The chest hangs low and the belly is drawn up under the loin.
      d.ink('trunk', poly([[84, 174], [110, 166], [146, 162], [170, 170], [172, 196], [160, 212], [140, 204], [116, 192], [96, 196]]), SOOT, {
        dark: poly([[70, 180], ...cut([88, 190], [176, 204], 'hound-trunk', 1, 5), [176, 220], [70, 220]]),
        cold: 2,
        inner: (c) => {
          // The belly and the chest are pale, so that a hound is not lost in the dark.
          c.flat('belly', poly([[96, 196], [116, 190], [140, 202], [160, 212], [172, 196], [174, 222], [90, 222]]), TALLOW.mid);
          c.detail('ribs', [[[142, 172], [138, 192]], [[152, 172], [150, 196]], [[132, 172], [128, 188]]], SOOT, 2.4);
          c.strokes('scar', [[[118, 172], [128, 178]]], 1.6);
        },
      });
    }),
    part('legs-front', 'legFront', 'root', [160, 198], (d) => {
      d.ink('fore', poly([[154, 194], [170, 196], [168, 220], [174, 240], [162, 240], [158, 222]]), SOOT, { dark: 0.42 });
      d.ink('hind-near', poly([[100, 186], [118, 190], [114, 208], [124, 226], [122, 240], [110, 240], [112, 228], [102, 210]]), SOOT, { dark: 0.42 });
    }),
    part('head', 'weapon', 'body', [166, 172], (d) => {
      // A long head, the brow heavy over where an eye would be, the jaw open on its teeth.
      d.ink('neck', poly([[156, 162], [176, 156], [184, 172], [168, 188]]), SOOT, { dark: 0.4, mid: 2 });
      d.ink('jaw', poly([[176, 178], [204, 184], [206, 190], [180, 190]]), TALLOW, { dark: 0.3, mid: 0, line: 2, heavy: 2.6 });
      d.ink('teeth', poly([[184, 180], [188, 185], [192, 181], [196, 186], [200, 182], [204, 184], [184, 183]]), BONE, { dark: false, line: 1, heavy: 1.2, rim: 0 });
      d.ink('skull', poly([[170, 154], [184, 152], [196, 162], [210, 170], [208, 178], [186, 178], [172, 172]]), SOOT, {
        dark: poly([[166, 150], [182, 150], [190, 162], [200, 170], [186, 172], [176, 166], [166, 172]]),
        mid: 2,
      });
      d.ink('ear', poly([[170, 156], [164, 138], [178, 150]]), SOOT, { dark: 0.5, mid: 0, rim: 0 });
      d.ink('collar', poly([[154, 170], [170, 160], [174, 168], [158, 180]]), LEATHER, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4, rim: 0 });
      d.ink('rag', poly([[158, 178], [166, 175], [168, 194], [162, 188], [158, 196]]), BLOOD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2, rim: 0 });
    }),
  ],
};

/** A ballista: a great crossbow on a sled, with a windlass behind and a bolt as long as a man. */
const ballista: UnitArt = {
  id: 'ballista',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { loose: KICK },
  stills: { hit: HIT },
  muzzle: [232, 140],
  top: 110,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 150, 13)),
    part('sled', 'body', 'root', [128, 220], (d) => {
      // Two runners, a post, and the braces that hold it up.
      d.ink('brace-back', limb([84, 232], [126, 186], 10, 9), WOOD, { dark: limbDark([84, 232], [126, 186], 10, 10, 'bal-bb', 0.5), mid: 2, rim: 0 });
      d.ink('brace-front', limb([172, 232], [132, 186], 10, 9), WOOD, { dark: limbDark([172, 232], [132, 186], 10, 10, 'bal-bf', 0.5), mid: 2, rim: 0 });
      d.ink('post', poly([[120, 178], [138, 178], [140, 232], [118, 232]]), WOOD, { dark: 0.42 });
      d.ink('runner', poly([[60, 228], [196, 228], [204, 234], [200, 240], [58, 240], [54, 234]]), WOOD, { dark: poly([[50, 234], [210, 234], [210, 242], [50, 242]]), mid: 0 });
      d.ink('band', poly([[116, 196], [142, 196], [142, 204], [116, 204]]), LEAD, { dark: 0.35, mid: 0, line: 1.8, heavy: 2.4, rim: 0 });
      stud(d, 'bolt-a', [124, 200], 2);
      stud(d, 'bolt-b', [134, 200], 2);
    }),
    part('bow', 'weapon', 'body', [128, 180], (d) => {
      // The stock, tipped up toward what it will shoot, the windlass at its tail.
      d.ink('stock', poly([[62, 190], [72, 180], [214, 142], [218, 154], [76, 196]]), WOOD, { dark: poly([[56, 190], [222, 148], [222, 162], [56, 204]]), mid: 3, inner: (c) => c.detail('stock-grain', [[[90, 180], [150, 164]], [[140, 172], [200, 154]]], WOOD, 1.6) });
      d.ink('lash', poly([[196, 138], [208, 134], [214, 156], [202, 160]]), TALLOW, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
      d.ink('windlass', poly([[58, 176], [76, 172], [80, 192], [62, 196]]), LEAD, { dark: 0.4, mid: 2 });
      d.pen('crank', poly([[68, 184], [56, 170], [48, 176]], false), 3.4);
      // The prod, seen from its end as it curves away, and its cord.
      d.ink('prod', poly([[196, 96], [206, 98], [222, 138], [224, 156], [212, 196], [202, 198], [212, 156], [210, 140]]), LEAD, { dark: 0.36, mid: 3 });
      d.pen('cord', poly([[200, 98], [124, 168], [206, 197]], false), 2);
      d.ink('bolt', poly([[122, 162], [214, 137], [238, 136], [216, 146], [124, 170]]), BONE, { dark: poly([[118, 168], [240, 138], [240, 150], [118, 176]]), mid: 0, line: 1.6, heavy: 2, rim: 0 });
    }),
  ],
};

/** A watchfire: an iron basket on three legs, logs in it, and the fire. */
const watchfire: UnitArt = {
  id: 'watchfire',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { stand: STAND },
  muzzle: [128, 150],
  top: 96,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 96, 11)),
    part('basket', 'body', 'root', [128, 200], (d) => {
      d.ink('leg-a', limb([112, 192], [98, 240], 8, 6), LEAD, { dark: 0.5, mid: 0, rim: 0 });
      d.ink('leg-c', limb([128, 194], [130, 240], 8, 6), LEAD, { dark: 0.5, mid: 0, rim: 0 });
      d.ink('leg-b', limb([144, 192], [160, 240], 8, 6), LEAD, { dark: 0.3, mid: 0, rim: 0 });
      d.ink('log-a', limb([106, 172], [146, 160], 12, 11), WOOD, { dark: limbDark([106, 172], [146, 160], 12, 12, 'wf-la', 0.5), mid: 2, rim: 0 });
      d.ink('log-b', limb([114, 158], [152, 174], 12, 11), WOOD, { dark: limbDark([114, 158], [152, 174], 12, 12, 'wf-lb', 0.5), mid: 2, rim: 0 });
      d.ink('bowl', poly([[98, 170], [158, 170], [152, 196], [104, 196]]), LEAD, {
        dark: 0.36,
        mid: 3,
        inner: (c) => {
          // The fire shows through the bars.
          c.flat('glow-a', poly([[120, 174], [128, 174], [127, 192], [121, 192]]), LAMP.mid);
          c.flat('glow-b', poly([[136, 174], [144, 174], [142, 192], [137, 192]]), LAMP.lit);
        },
      });
      d.ink('rim', poly([[94, 166], [162, 166], [162, 173], [94, 173]]), LEAD, { dark: 0.3, mid: 0, line: 1.8, heavy: 2.4, rim: 0 });
    }),
    part('fire', 'extra', 'body', [128, 166], (d) => {
      // Flat tongues with hard edges, as everything is: the game's own light makes it glow.
      d.ink('flame', poly([[106, 166], [100, 146], [112, 152], [110, 126], [124, 140], [128, 104], [138, 132], [148, 118], [146, 146], [158, 140], [152, 166]]), { lit: LAMP.lit, mid: LAMP.mid }, {
        dark: false,
        line: 1.6,
        heavy: 2,
        rim: 0,
        inner: (c) => {
          c.flat('low', poly([[104, 168], [106, 152], [116, 160], [120, 148], [130, 160], [140, 146], [146, 158], [154, 152], [154, 168]]), LAMP.mid);
          c.flat('heart', poly([[118, 166], [120, 146], [128, 130], [136, 148], [140, 166]]), LAMP.hot);
        },
      });
    }, 0.5),
  ],
};

/** A barricade: sharpened stakes lashed across a log, set to stop one charge. */
const barricade: UnitArt = {
  id: 'barricade',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { stand: STAND },
  stills: { hit: HIT },
  muzzle: [200, 150],
  top: 130,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 170, 12)),
    part('frame', 'body', 'root', [128, 220], (d) => {
      const stake = (name: string, foot: Pt, point: Pt): void => {
        d.ink(name, poly([[foot[0] - 7, foot[1]], [foot[0] + 7, foot[1]], [point[0] + 5, point[1] + 14], point, [point[0] - 6, point[1] + 16]]), WOOD, {
          dark: limbDark(foot, point, 14, 14, `bar-${name}`, 0.5),
          mid: 2,
          rim: 0,
        });
      };
      stake('stake-a', [70, 240], [114, 132]);
      stake('stake-c', [128, 240], [176, 140]);
      stake('stake-e', [186, 240], [226, 150]);
      // The log they are lashed to, and the planks nailed across.
      d.ink('log', poly([[48, 200], [210, 196], [214, 212], [50, 218]]), WOOD, { dark: poly([[40, 208], [220, 204], [220, 222], [40, 224]]), mid: 3 });
      d.ink('plank', poly([[78, 176], [196, 170], [198, 186], [80, 192]]), WOOD, { dark: poly([[70, 184], [204, 178], [204, 196], [70, 198]]), mid: 2 });
      stake('stake-b', [100, 240], [140, 122]);
      stake('stake-d', [158, 240], [204, 132]);
      d.ink('rope-a', poly([[108, 194], [122, 192], [124, 216], [110, 218]]), TALLOW, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4, rim: 0 });
      d.ink('rope-b', poly([[164, 192], [178, 190], [180, 214], [166, 216]]), TALLOW, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4, rim: 0 });
      d.ink('plate', poly([[136, 172], [150, 171], [151, 188], [137, 189]]), RUST, { dark: 0.3, mid: 0, line: 1.8, heavy: 2.4, rim: 0 });
    }),
  ],
};

/** The lamp Agnes stands on the ground: an iron post on a foot with a lit lantern on it. */
const streetlamp: UnitArt = {
  id: 'streetlamp',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { stand: STAND },
  muzzle: [128, 116],
  top: 70,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 70, 9)),
    part('lamp', 'body', 'root', [128, 236], (d) => streetLamp(d)),
  ],
};

export const MUSTER: UnitArt[] = [pikeman, hound, ballista, watchfire, barricade, streetlamp];
// The lair's own tones are drawn in lair.ts; these are named here so a thing set down can sit on them in a sheet.
export { EARTH, STONE, RUST, hem };
