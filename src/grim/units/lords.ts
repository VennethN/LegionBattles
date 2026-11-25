// The four lords who came after the first two: the Spinner of the rotten
// cellar, the Bell Abbot of the drowned abbey, the Furnace of the foundry and
// the Mirror King of the mirror maker's hall, and what comes with each. Each
// is one idea made wrong, as the Gravedigger's hump of candles and the King's
// dead-tree antlers are, and each is our own: held to the question in
// guide/rules.md before it was drawn in detail.
//
// The Spinner is a spindle: her body is a bobbin wound with her own thread.
// The Bell Abbot's head is a cracked bell he wears to the shoulders. The
// Furnace is a stove that has learnt to walk, with a ladle for an arm. The
// Mirror King is a king made of the pieces of a broken mirror. Each has one
// blood-red place, where it can be hurt.

import { Doc, cut } from '../kit/draw';
import { arm, between, blot, chain, hem, limb, limbDark, rivets, stitches } from '../kit/figure';
import { BLOOD, BONE, EARTH, GORE, LAMP, LEAD, LEATHER, MOSS, PALLOR, RUST, SCRATCH, SLATE, SNOW, SOOT, TALLOW, WOOD, type Tone } from '../kit/palette';
import { poly, type Pt } from '../kit/path';
import { part, type Move, type UnitArt } from '../kit/unit';
import { FALL, HIT, LUNGE_BITE, STAND, THRUST } from '../poses';
import { pose, type Pose } from '../rig';
import { PERSON, PERSON_FEET, PERSON_MARGIN } from './hunters';

const FIRE: Tone = { lit: LAMP.lit, mid: LAMP.mid };

// ================================================================== the Spinner

/**
 * A long jointed leg: from where it joins the body up to a knee held high, then down through an ankle to a point.
 * Each joint is a knob of pale bone; the leg is thick at the body and thin at the point.
 */
function spiderLeg(d: Doc, name: string, pts: Pt[], w: number, tone: Tone, share: number): void {
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const wa = w * (1 - (i / n) * 0.6);
    const wb = w * (1 - ((i + 1) / n) * 0.6) * (i === n - 1 ? 0.3 : 1);
    d.ink(`${name}-${i}`, limb(a, b, wa, wb, i === 0 ? w * 0.12 : 0), tone, {
      dark: limbDark(a, b, wa, wb + 2, `${name}-${i}`, share), mid: 3, line: 2.4, heavy: 3.2,
      inner: (c) => {
        if (i < n - 1) c.detail(`${name}-${i}-hairs`, stitches(between(a, b, 0.2), between(a, b, 0.8), 4, wa * 0.7, 0.4), tone, 1.6);
      },
    });
  }
  for (let i = 1; i < n; i++) {
    const [x, y] = pts[i];
    const r = w * (0.42 - i * 0.06);
    d.ink(`${name}-joint-${i}`, poly([[x - r, y - r * 0.4], [x - r * 0.3, y - r], [x + r * 0.7, y - r * 0.8], [x + r, y + r * 0.2], [x + r * 0.2, y + r], [x - r * 0.8, y + r * 0.6]]), BONE, { dark: share > 0.5 ? 0.6 : 0.4, mid: 0, line: 1.8, heavy: 2.4 });
  }
}

const SP_FEET: Pt = [410, 680];

// Her movements. She can go up her thread and come down on what is under her.
const SP_DROP: Move = {
  // Gone up into the dark, her legs drawn in.
  windup: pose({ rootY: -230, bodyRot: -6, legFrontRot: 24, legBackRot: -24, weaponRot: -30, headRot: -10, extraRot: 20 }),
  // Down, all of her, legs thrown out.
  strike: pose({ rootY: 14, bodyRot: 6, bodySy: -0.08, bodySx: 0.05, legFrontRot: -14, legBackRot: 14, weaponRot: 30, headRot: 12, extraRot: -24 }),
};
const SP_BITE: Move = {
  // Her head down and in, her forelegs open: then the fangs.
  windup: pose({ headRot: -18, headY: -8, weaponRot: -30, bodyRot: -6, rootX: -14, legFrontRot: 6 }),
  strike: pose({ headRot: 22, headY: 10, weaponRot: 24, weaponX: 16, bodyRot: 10, rootX: 30, legFrontRot: -10, legBackRot: 10 }),
};
/** Her legs swept round her: what is near her is knocked down. */
const SP_LEGS: Move = {
  windup: pose({ weaponRot: -40, weaponY: -20, bodyRot: -8, headRot: -6, rootY: -10, legFrontRot: 26, legBackRot: -26 }),
  strike: pose({ weaponRot: 30, weaponX: 20, weaponY: 10, bodyRot: 6, bodySy: -0.05, headRot: 10, rootY: 10, legFrontRot: -24, legBackRot: 24, extraRot: -12 }),
};
const SP_SPIT: Move = {
  windup: pose({ headRot: -22, bodyRot: -8, weaponRot: -20, rootX: -10, extraRot: 10 }),
  strike: pose({ headRot: 18, bodyRot: 8, weaponRot: 10, rootX: 10, extraRot: -8 }),
};
const SP_BROOD: Move = {
  // The bobbin of her body pulses, and her young come down her legs.
  windup: pose({ bodySy: 0.06, bodySx: -0.04, bodyRot: -10, headRot: -12, legFrontRot: 8, legBackRot: -8 }),
  strike: pose({ bodySy: -0.08, bodySx: 0.06, bodyRot: 4, headRot: 10, extraRot: -30, legFrontRot: -12, legBackRot: 12 }),
};
/** Up her thread, hanging: what she does between drops. */
const SP_HANG: Pose = pose({ rootY: -200, bodyRot: -12, legFrontRot: 30, legBackRot: -30, weaponRot: -20, headRot: -14, extraRot: 10 });
const SP_STAGGER: Pose = pose({ rootY: 40, bodyRot: 14, bodySy: -0.06, headRot: 26, weaponRot: 40, weaponY: 40, legFrontRot: -34, legFrontY: 14, legBackRot: 30, legBackY: 14, extraRot: -12 });

/**
 * The Spinner. What lives under the cellar of the old mill: a thing as big as a cart, all legs, whose body is a
 * spindle wound round and round with her own grey thread, so that she is a bobbin as tall as a man that walks.
 * She hangs from the beams on one line of it and comes down on what is under her. Her head is veiled in her
 * thread, and where a face would be there is only the dark under the veil and two hooked fangs. Where the thread
 * has worn through on her body, what is under it shows red: that is where she can be hurt.
 */
const spinner: UnitArt = {
  id: 'spinner',
  canvas: [820, 720],
  feet: SP_FEET,
  margin: 200,
  moves: { bite: SP_BITE, legs: SP_LEGS, spit: SP_SPIT, drop: SP_DROP, brood: SP_BROOD },
  stills: { hang: SP_HANG, stagger: SP_STAGGER, hit: HIT, fall: FALL },
  muzzle: [700, 400],
  top: 160,
  parts: [
    part('shadow', 'shadow', 'root', SP_FEET, (d) => blot(d, [420, 684], 640, 34)),
    part('line', 'extra', 'body', [270, 230], (d) => {
      // The line she hangs by, up into the dark.
      d.pen('line', poly([[270, 236], [268, -190]], false), 3.4, BONE.mid);
      d.pen('line-b', poly([[276, 236], [282, -190]], false), 1.6, BONE.lit);
    }, 0),
    part('far-legs-back', 'legBack', 'root', [400, 470], (d) => {
      spiderLeg(d, 'leg-a', [[400, 450], [250, 210], [150, 440], [110, 650]], 34, SOOT, 0.75);
      spiderLeg(d, 'leg-b', [[440, 460], [360, 250], [300, 470], [290, 666]], 32, SOOT, 0.75);
    }),
    part('far-legs-front', 'legFront', 'root', [520, 440], (d) => {
      spiderLeg(d, 'leg-c', [[540, 430], [690, 190], [780, 420], [800, 640]], 32, SOOT, 0.75);
      spiderLeg(d, 'leg-d', [[500, 440], [600, 250], [650, 460], [660, 666]], 30, SOOT, 0.75);
    }),
    part('body', 'body', 'root', [420, 470], (d) => {
      // The front of her, where the legs join: a hard dark plate, ridged.
      d.ink('fore', poly([[420, 380], [480, 352], [560, 356], [610, 390], [620, 450], [580, 500], [500, 512], [440, 496], [410, 450]]), SOOT, {
        dark: poly([[380, 430], ...cut([390, 430], [640, 470], 'sp-fore', 1, 10), [640, 540], [380, 540]]),
        mid: 8, cold: 3,
        inner: (c) => {
          c.detail('fore-ridges', [[[470, 368], [490, 420]], [[516, 360], [526, 418]], [[560, 366], [566, 420]]], SOOT, 4);
          c.strokes('fore-hairs', stitches([430, 470], [600, 470], 9, 12, 0.5), 2.2, SOOT.mid);
        },
      });
      // The bobbin: her body, a spindle wound with thread. Thick in the middle, narrow at each end, tipped back.
      d.ink('bobbin', poly([
        [446, 380], [420, 300], [380, 240], [330, 214], [270, 214], [220, 244], [186, 300], [176, 370], [194, 440], [240, 492], [306, 512], [370, 502], [420, 456],
      ]), BONE, {
        dark: poly([[150, 380], ...cut([160, 376], [460, 420], 'sp-bobbin', 1, 14), [460, 560], [150, 560]]),
        mid: 12, cold: 4,
        open: [[[384, 244], [418, 296]]],
        inner: (c) => {
          // The thread, wound across her in bands, every band a step off the next.
          for (let i = 0; i < 13; i++) {
            const y = 226 + i * 22;
            c.detail(`turn-${i}`, [[[170, y + 16], [450, y - 18]]], BONE, i % 2 === 0 ? 4 : 2.4);
          }
          c.flat('grime', poly([[200, 440], [300, 452], [360, 480], [300, 510], [230, 490]]), EARTH.mid, 0.6);
          // Where the thread has worn through: under it, red. The one red place.
          c.ink('wound', poly([[214, 372], [250, 352], [300, 346], [346, 330], [352, 346], [310, 372], [262, 380], [222, 392]]), GORE, {
            dark: false, line: 2.4, heavy: 3,
            inner: (w) => {
              w.flat('wound-deep', poly([[240, 368], [300, 356], [330, 344], [300, 364], [250, 374]]), GORE.mid);
              w.strokes('frayed', [[[214, 372], [204, 362]], [[250, 352], [246, 338]], [[346, 330], [356, 318]], [[310, 372], [318, 386]], [[262, 380], [258, 394]]], 2.4, BONE.lit);
            },
          });
        },
      });
      // The two ends of the spindle: a cap of horn at the top where her line comes out, and her spinnerets below.
      d.ink('cap', poly([[250, 220], [300, 200], [338, 212], [320, 228], [272, 232]]), BONE, { dark: 0.4, mid: 3, line: 2.2, heavy: 3 });
      d.ink('spinnerets', poly([[190, 430], [170, 458], [180, 480], [208, 470], [222, 450]]), SOOT, { dark: 0.5, mid: 2 });
      d.pen('trailing', poly([[184, 470], [140, 520], [120, 600]], false), 2.4, BONE.mid);
    }),
    part('eggs', 'extra', 'body', [330, 506], (d) => {
      // Egg sacs hung under her in a string: pale, veined, heavy.
      const sac = (n: string, x: number, y: number, r: number): void => {
        d.ink(n, poly([[x - r * 0.7, y], [x - r * 0.4, y - r * 0.2], [x + r * 0.4, y - r * 0.2], [x + r * 0.8, y + r * 0.4], [x + r * 0.7, y + r * 1.2], [x, y + r * 1.6], [x - r * 0.8, y + r * 1.1]]), BONE, {
          dark: 0.45, mid: 4, line: 2, heavy: 2.6,
          inner: (c) => c.detail(`${n}-veins`, [[[x - r * 0.2, y], [x - r * 0.4, y + r * 1.2]], [[x + r * 0.3, y + r * 0.1], [x + r * 0.2, y + r * 1.3]]], BLOOD, 1.6),
        });
      };
      d.pen('egg-thread', poly([[330, 500], [320, 540], [350, 560]], false), 2, BONE.mid);
      sac('sac-a', 318, 528, 30);
      sac('sac-b', 360, 546, 24);
      sac('sac-c', 292, 560, 20);
    }, 0.5, true),
    part('near-legs-back', 'legBack', 'root', [430, 470], (d) => {
      spiderLeg(d, 'leg-e', [[420, 460], [300, 270], [210, 480], [190, 676]], 38, SOOT, 0.42);
      spiderLeg(d, 'leg-f', [[460, 470], [400, 320], [360, 510], [350, 676]], 36, SOOT, 0.42);
    }),
    part('near-legs-front', 'legFront', 'root', [520, 460], (d) => {
      spiderLeg(d, 'leg-g', [[530, 460], [650, 250], [730, 480], [750, 676]], 38, SOOT, 0.42);
      spiderLeg(d, 'leg-h', [[500, 470], [570, 310], [610, 500], [610, 676]], 36, SOOT, 0.42);
    }),
    part('head', 'head', 'body', [600, 410], (d) => {
      // A small head under a veil of her thread: the dark under it, and two hooked fangs.
      d.ink('fang-far', poly([[628, 440], [650, 456], [660, 494], [646, 520], [640, 494], [630, 462]]), BONE, { dark: 0.6, mid: 2, line: 2, heavy: 2.6 });
      d.ink('head', poly([[590, 380], [620, 360], [660, 366], [684, 392], [682, 432], [650, 450], [610, 446], [588, 420]]), SOOT, { dark: 0.5, mid: 4 });
      d.black('under-veil', poly([[630, 400], [684, 400], [690, 440], [646, 456], [628, 434]]));
      d.ink('veil', poly([[580, 372], [612, 350], [660, 352], [694, 376], [702, 404], [690, 400], [674, 384], [640, 380], [616, 394], [600, 430], [590, 420]]), BONE, {
        dark: 0.36, mid: 5, cold: 2.4,
        inner: (c) => c.detail('veil-threads', [[[620, 356], [600, 410]], [[648, 354], [638, 384]], [[676, 366], [686, 392]]], BONE, 2),
      });
      d.ink('veil-fall', poly([[694, 376], [712, 400], [716, 446], [704, 430], [700, 460], [692, 420]]), BONE, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
      d.ink('fang-near', poly([[656, 440], [680, 452], [692, 490], [680, 524], [672, 494], [658, 462]]), BONE, { dark: 0.4, mid: 2, line: 2, heavy: 2.6, rim: 1.4 });
    }),
    part('palps', 'weapon', 'body', [600, 420], (d) => {
      // Her forelegs, held up and in front, hooked at the ends: what she takes hold of things with.
      spiderLeg(d, 'palp-far', [[600, 420], [680, 300], [760, 340], [770, 400]], 24, SOOT, 0.7);
      spiderLeg(d, 'palp-near', [[610, 430], [700, 340], [790, 380], [790, 450]], 28, SOOT, 0.42);
      d.ink('hook-near', poly([[784, 446], [800, 470], [790, 494], [782, 470]]), BONE, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
    }),
  ],
};

/** One of her young: a spindle the size of a dog, on thin legs, veiled as she is. */
const spiderling: UnitArt = {
  id: 'spiderling',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { bite: LUNGE_BITE },
  stills: { hit: HIT, fall: FALL },
  muzzle: [196, 196],
  top: 140,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 140, 10)),
    part('legs-far', 'legBack', 'root', [128, 200], (d) => {
      spiderLeg(d, 'leg-a', [[116, 196], [80, 156], [50, 200], [40, 236]], 9, SOOT, 0.75);
      spiderLeg(d, 'leg-b', [[140, 194], [180, 150], [210, 196], [216, 236]], 9, SOOT, 0.75);
    }),
    part('body', 'body', 'root', [128, 200], (d) => {
      d.ink('bobbin', poly([[150, 190], [140, 172], [116, 162], [92, 168], [80, 186], [86, 206], [108, 216], [134, 212]]), BONE, {
        dark: 0.45, mid: 3, cold: 1.8,
        inner: (c) => {
          for (let i = 0; i < 4; i++) c.detail(`turn-${i}`, [[[80, 176 + i * 10], [148, 168 + i * 10]]], BONE, 1.6);
        },
      });
      d.ink('fore', poly([[140, 184], [162, 180], [176, 192], [168, 206], [146, 208]]), SOOT, { dark: 0.45, mid: 2 });
      d.ink('veil', poly([[160, 180], [176, 176], [190, 186], [188, 198], [178, 196], [168, 190]]), BONE, { dark: 0.3, mid: 0, line: 1.6, heavy: 2 });
      d.ink('fang', poly([[180, 198], [190, 202], [192, 214], [184, 210]]), BONE, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
    }),
    part('legs-near', 'legFront', 'root', [128, 204], (d) => {
      spiderLeg(d, 'leg-c', [[120, 204], [74, 170], [60, 214], [56, 240]], 10, SOOT, 0.42);
      spiderLeg(d, 'leg-d', [[146, 204], [196, 166], [226, 208], [232, 240]], 10, SOOT, 0.42);
    }),
  ],
};

// ================================================================== the Bell Abbot

const AB_FEET: Pt = [360, 690];

const AB_TOLL: Move = {
  // The clapper-staff brought up over his shoulder and swung into his own bell: the ring goes out across the water.
  windup: pose({ weaponRot: 40, weaponY: 20, bodyRot: 6, headRot: 4, rootX: -6 }),
  strike: pose({ weaponRot: -96, weaponY: -40, weaponX: -30, bodyRot: -8, bodySy: 0.03, headRot: 14, rootX: -10, extraRot: 16 }),
};
/** The crook swung flat across in front. */
const AB_CROOK: Move = {
  windup: pose({ weaponRot: -60, weaponY: -10, weaponX: -20, bodyRot: -10, headRot: -6, rootX: -14, extraRot: 14 }),
  strike: pose({ weaponRot: 70, weaponY: 40, weaponX: 30, bodyRot: 14, headRot: 8, rootX: 22, legFrontRot: -10, legBackRot: 10, extraRot: -20 }),
};
const AB_KNELL: Move = {
  // He goes down on the water with all his weight, bell first: a wave rolls out from him.
  windup: pose({ rootY: -14, bodyRot: -10, bodySy: 0.04, headRot: -10, weaponRot: -20, offRot: -40 }),
  strike: pose({ rootY: 30, bodyRot: 24, bodySy: -0.06, headRot: 22, headY: 20, weaponRot: 30, weaponY: 40, offRot: 30, offY: 30, legFrontRot: -20, legBackRot: 20, extraRot: -20 }),
};
const AB_CENSER: Move = {
  // The censer on its chain swung back and then out in a line in front of him, smoking.
  windup: pose({ offRot: 60, offY: 10, bodyRot: -8, headRot: -4, rootX: -8, extraRot: 20 }),
  strike: pose({ offRot: -110, offX: 30, offY: -10, bodyRot: 12, headRot: 8, rootX: 18, legFrontRot: -10, legBackRot: 10, extraRot: -30 }),
};
const AB_PROCESSION: Move = {
  // His far hand raised, his beads swinging: his monks come up out of the water and walk.
  windup: pose({ offRot: -40, offY: -10, bodyRot: -4, headRot: -6 }),
  strike: pose({ offRot: -130, offY: -40, offX: 20, bodyRot: -10, bodySy: 0.03, headRot: -16, extraRot: 20 }),
};
const AB_STAGGER: Pose = pose({ rootY: 60, bodyRot: 20, bodyY: 30, headRot: 30, headY: 30, weaponRot: 50, weaponY: 60, offRot: 30, offY: 40, legFrontRot: -50, legFrontY: -40, legBackRot: 40, legBackY: -30, extraRot: -14 });

/**
 * The Bell Abbot. The abbey went under the water a hundred years ago with its abbot in the bell tower, ringing
 * for help. He came up again a giant, the great bell still on him: he wears it over his head to the shoulders,
 * green with the water, and there is no face under it to see. His habit is sodden and hung with weed, his hands
 * are drowned grey, and he strikes his own bell with its iron clapper on a pole to send its ring out over the
 * flood. The bell is cracked, and through the crack something shows red: that is where he can be hurt.
 */
const abbot: UnitArt = {
  id: 'abbot',
  canvas: [720, 720],
  feet: AB_FEET,
  margin: 190,
  moves: { crook: AB_CROOK, toll: AB_TOLL, censer: AB_CENSER, procession: AB_PROCESSION, knell: AB_KNELL },
  stills: { stagger: AB_STAGGER, hit: HIT, fall: FALL },
  muzzle: [520, 140],
  top: 60,
  parts: [
    part('shadow', 'shadow', 'root', AB_FEET, (d) => blot(d, [370, 692], 460, 34)),
    part('censer-arm', 'offhand', 'body', [300, 300], (d) => {
      // The far arm, under its sleeve, holding the chain of his censer.
      arm(d, 'arm', [300, 300], [262, 410], [282, 500], SOOT, PALLOR, 46);
    }),
    part('censer', 'extra', 'offhand', [282, 506], (d) => {
      // The censer: a pot of green bronze on three chains, its lid pierced, smoke coming out in hard grey pieces.
      chain(d, 'censer-chain', [282, 506], [284, 586], 7);
      d.ink('censer-lid', poly([[262, 596], [276, 580], [294, 580], [306, 596]]), RUST, { dark: 0.4, mid: 2, line: 2, heavy: 2.6, inner: (c) => c.flat('lid-green', poly([[280, 584], [294, 584], [300, 594], [284, 594]]), MOSS.lit, 0.8) });
      d.ink('censer-pot', poly([[256, 598], [312, 598], [306, 630], [290, 644], [276, 644], [260, 630]]), RUST, {
        dark: 0.45, mid: 3, rim: 1.6,
        inner: (c) => {
          c.flat('pot-green', poly([[262, 606], [284, 604], [280, 630], [266, 626]]), MOSS.mid);
          c.black('holes', poly([[288, 610], [294, 610], [294, 618], [288, 618]]));
          c.flat('ember', poly([[296, 612], [302, 612], [301, 620], [296, 620]]), LAMP.mid);
        },
      });
      d.flat('smoke-a', poly([[300, 590], [326, 566], [344, 576], [338, 548], [360, 530], [364, 560], [340, 590]]), SLATE.lit, 0.6);
      d.flat('smoke-b', poly([[252, 600], [230, 580], [240, 560], [222, 540], [248, 548], [262, 590]]), SLATE.lit, 0.45);
    }, 0.6, true),
    part('leg-back', 'legBack', 'root', [320, 560], (d) => {
      // Under the habit nothing shows but his feet, bare, swollen, in the water.
      d.ink('foot', poly([[260, 664], [320, 656], [350, 674], [346, 692], [256, 692]]), PALLOR, { dark: 0.6, mid: 4, heavy: 5 });
    }),
    part('leg-front', 'legFront', 'root', [400, 560], (d) => {
      d.ink('foot', poly([[390, 660], [450, 652], [492, 672], [490, 692], [386, 692]]), PALLOR, { dark: 0.42, mid: 4, heavy: 5, inner: (c) => c.detail('toes', [[[468, 664], [470, 680]], [[480, 668], [482, 684]]], PALLOR, 2) });
    }),
    part('body', 'body', 'root', [360, 560], (d) => {
      // The habit: wide as a bell itself at the foot, heavy with water, dragged, hung with weed.
      d.ink('habit', poly([
        [260, 250], [330, 210], [420, 214], [470, 260], [496, 380], [520, 520], [540, 640],
        ...hem([540, 640], [200, 650], 'ab-habit', 22, 26).reverse().slice(1, -1),
        [200, 650], [214, 520], [236, 380],
      ]), SOOT, {
        dark: poly([[160, 200], [330, 200], ...cut([340, 214], [360, 660], 'ab-habit-dark', -1, 22), [160, 670]]),
        mid: 12, cold: 4,
        open: [[[476, 280], [494, 370]]],
        inner: (c) => {
          c.detail('habit-folds', [[[420, 280], [440, 400]], [[450, 420], [480, 600]], [[400, 460], [410, 620]], [[480, 300], [500, 420]]], SOOT, 6);
          // Where the water has dried on it: salt in a hard line, a step lighter.
          c.detail('tide-line', [[[220, 540], [520, 520]]], SOOT, 3);
          // Weed, hung off him in strands, and barnacles in a crust.
          c.flat('weed-a', poly([[430, 300], [456, 296], [470, 380], [452, 420], [446, 360]]), MOSS.mid);
          c.flat('weed-b', poly([[470, 480], [494, 476], [510, 560], [500, 600], [488, 540]]), MOSS.mid);
          c.strokes('barnacles', [[[440, 560], [446, 554]], [[452, 570], [458, 566]], [[436, 584], [442, 578]], [[464, 584], [470, 580]]], 3.6, BONE.lit);
        },
      });
      // The rope he is girt with, three knots in it, its end trailing in the water.
      d.ink('girdle', poly([[230, 420], [500, 400], [504, 420], [234, 444]]), TALLOW, { dark: 0.4, mid: 3, inner: (c) => c.detail('girdle-twist', stitches([240, 432], [496, 412], 14, 16, 0.5), TALLOW, 2) });
      d.ink('girdle-end', limb([470, 420], [490, 600], 12, 10), TALLOW, { dark: limbDark([470, 420], [490, 600], 12, 12, 'ab-girdle', 0.4), mid: 0, line: 1.8, heavy: 2.4 });
      for (const [i, y] of [470, 510, 550].entries()) d.ink(`knot-${i}`, poly([[472, y], [490, y - 4], [494, y + 10], [476, y + 14]]), TALLOW, { dark: 0.4, mid: 0, line: 1.6, heavy: 2.2 });
      // Water still running off him.
      d.strokes('drips', [[[230, 600], [228, 636]], [[300, 610], [298, 650]], [[516, 600], [520, 640]]], 3, SLATE.lit);
    }),
    part('cowl', 'extra', 'body', [370, 250], (d) => {
      // His cowl, swollen with water, round the foot of the bell: it hides where his arms begin.
      d.ink('cowl', poly([
        [230, 270], [260, 220], [330, 196], [420, 200], [480, 230], [510, 280],
        ...hem([510, 280], [226, 300], 'ab-cowl', 14, 22).reverse().slice(1, -1),
        [226, 300],
      ]), SOOT, {
        dark: poly([[200, 180], [340, 180], ...cut([340, 196], [350, 320], 'ab-cowl-dark', -1, 10), [200, 320]]),
        mid: 8, cold: 3.4,
        inner: (c) => c.flat('cowl-weed', poly([[430, 214], [470, 228], [480, 260], [450, 250]]), MOSS.mid),
      });
    }, 0.1),
    part('bell', 'head', 'body', [370, 210], (d) => {
      // The bell, worn to the shoulders: green with the water, its lip resting on his cowl, cracked down its front.
      d.ink('bell', poly([[262, 232], [282, 196], [300, 120], [320, 82], [360, 66], [404, 72], [428, 110], [444, 190], [470, 228], [476, 244], [258, 248]]), RUST, {
        dark: poly([[240, 50], [340, 50], ...cut([340, 66], [352, 250], 'ab-bell', -1, 12), [240, 260]]),
        mid: 10, rim: 4,
        inner: (c) => {
          // Verdigris where the water lay, and the bands cast in it.
          c.flat('green-a', poly([[380, 90], [420, 100], [434, 170], [404, 150]]), MOSS.lit, 0.8);
          c.flat('green-b', poly([[300, 150], [340, 140], [330, 220], [296, 212]]), MOSS.mid);
          c.detail('bands', [[[300, 124], [430, 118]], [[286, 200], [452, 196]], [[280, 214], [458, 212]]], RUST, 4);
          c.detail('letters', stitches([370, 160], [440, 158], 7, 10, 0), RUST, 2.4);
          // The crack, and the red through it: the one red place.
          c.ink('crack', poly([[404, 80], [414, 108], [404, 136], [420, 168], [410, 204], [398, 170], [392, 136], [398, 108]]), GORE, {
            dark: false, line: 2.4, heavy: 3,
            inner: (w) => w.flat('crack-deep', poly([[402, 110], [408, 128], [402, 150], [398, 130]]), GORE.mid),
          });
        },
      });
      d.ink('lip', poly([[252, 236], [482, 232], [490, 252], [246, 258]]), RUST, { dark: 0.45, mid: 4, rim: 2 });
      // The crown it was hung by, and a stub of its rope.
      d.ink('crown', poly([[336, 70], [346, 40], [376, 36], [388, 66]]), RUST, { dark: 0.45, mid: 3 });
      d.black('crown-eye', poly([[352, 52], [370, 50], [370, 60], [352, 62]]));
      d.ink('rope-stub', poly([[356, 40], [366, 40], [372, 6], [362, 0], [358, 14]]), TALLOW, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
    }),
    part('clapper', 'weapon', 'body', [440, 300], (d) => {
      // The near arm, and the bell's own clapper on a pole: an iron club with a ball at its end.
      const butt: Pt = [520, 640];
      const top: Pt = [560, 90];
      const at = (t: number): Pt => between(butt, top, t);
      d.ink('pole', limb(butt, at(0.86), 18, 16), WOOD, {
        dark: limbDark(butt, at(0.86), 18, 18, 'ab-pole', 0.4), mid: 3,
        inner: (c) => c.detail('pole-grain', [[at(0.2), at(0.4)], [at(0.6), at(0.8)]], WOOD, 3),
      });
      d.ink('clapper', poly([[536, 182], [586, 176], [590, 120], [606, 84], [580, 40], [540, 44], [520, 82], [534, 120]]), LEAD, {
        dark: poly([[500, 30], [560, 30], ...cut([560, 40], [566, 190], 'ab-clapper', -1, 8), [500, 200]]),
        mid: 6, rim: 3,
        inner: (c) => {
          c.flat('clapper-rust', poly([[540, 140], [584, 136], [586, 176], [540, 180]]), RUST.mid);
          c.detail('clapper-pits', [[[570, 70], [580, 80]], [[556, 100], [564, 110]]], LEAD, 3);
        },
      });
      d.ink('ferrule', poly([[536, 176], [588, 172], [590, 196], [538, 200]]), LEAD, { dark: 0.4, mid: 0, line: 2, heavy: 2.6 });
      arm(d, 'arm', [440, 300], [520, 400], at(0.48), SOOT, PALLOR, 50);
      d.detail('drowned-hand', [[[520, 380], [530, 392]], [[536, 376], [544, 386]]], PALLOR, 2.4);
    }),
  ],
};

/** One of his monks: drowned, hooded, walking in his procession with a tall candle on a staff. */
const monk: UnitArt = {
  id: 'monk',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { jab: THRUST },
  stills: { hit: HIT, fall: FALL },
  muzzle: [196, 30],
  top: 40,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 100, 11)),
    part('leg-back', 'legBack', 'root', [118, 200], (d) => d.ink('foot', poly([[100, 232], [124, 230], [134, 240], [98, 240]]), PALLOR, { dark: 0.6, mid: 2, heavy: 4 })),
    part('leg-front', 'legFront', 'root', [142, 200], (d) => d.ink('foot', poly([[136, 232], [160, 230], [170, 240], [134, 240]]), PALLOR, { dark: 0.4, mid: 2, heavy: 4 })),
    part('body', 'body', 'root', [130, 200], (d) => {
      d.ink('habit', poly([[108, 104], [150, 102], [162, 150], [170, 232], ...hem([170, 232], [96, 234], 'monk-habit', 6, 10).reverse().slice(1, -1), [96, 234], [100, 150]]), SOOT, {
        dark: poly([[80, 96], [122, 96], ...cut([122, 104], [126, 240], 'monk-dark', -1, 6), [80, 240]]),
        mid: 4, cold: 2,
        inner: (c) => {
          c.detail('folds', [[[140, 120], [146, 200]], [[154, 170], [160, 226]]], SOOT, 2.4);
          c.flat('weed', poly([[146, 150], [158, 148], [162, 190], [150, 186]]), MOSS.mid);
        },
      });
      d.ink('girdle', poly([[104, 150], [160, 146], [161, 154], [105, 158]]), TALLOW, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
      d.strokes('drips', [[[110, 214], [109, 230]], [[156, 216], [158, 232]]], 2, SLATE.lit);
    }),
    part('staff', 'weapon', 'body', [140, 116], (d) => {
      const foot: Pt = [170, 236];
      const top: Pt = [184, 30];
      d.ink('staff', limb(foot, top, 6, 5), WOOD, { dark: limbDark(foot, top, 6, 6, 'monk-staff', 0.4), mid: 0, line: 1.6, heavy: 2.2 });
      d.ink('pricket', poly([[176, 30], [192, 30], [190, 38], [178, 38]]), LEAD, { dark: 0.3, mid: 0, line: 1.4, heavy: 1.8 });
      d.ink('candle', poly([[180, 4], [188, 4], [190, 30], [178, 30]]), BONE, { dark: 0.4, mid: 0, line: 1.4, heavy: 1.8 });
      d.ink('flame', poly([[180, 4], [184, -12], [188, 4], [184, 6]]), FIRE, { dark: false, line: 1.2, heavy: 1.6 });
      d.flat('flame-heart', poly([[182.5, 3], [184, -6], [185.5, 3]]), LAMP.hot);
      arm(d, 'arm', [148, 114], [166, 138], between(foot, top, 0.5), SOOT, PALLOR, 12);
    }),
    part('head', 'head', 'body', [138, 100], (d) => {
      // A deep hood over a head that is only its dark: nothing shows under it.
      d.ink('hood', poly([[112, 110], [116, 80], [134, 64], [156, 66], [168, 84], [166, 108], [150, 112]]), SOOT, {
        dark: 0.42, mid: 3, cold: 2,
        inner: (c) => c.flat('hood-weed', poly([[140, 66], [156, 68], [150, 78]]), MOSS.mid),
      });
      d.black('hood-dark', poly([[146, 82], [164, 86], [164, 106], [148, 108], [142, 96]]));
    }),
  ],
};

// ================================================================== the Furnace

const FU_FEET: Pt = [360, 690];

const FU_VENT: Move = {
  // It turns where it stands, and the vents round its belly spit fire in lines that go round with it.
  windup: pose({ bodyRot: -12, bodySx: -0.03, weaponRot: -20, offRot: 20, rootX: -10, legFrontRot: 8, legBackRot: -8 }),
  strike: pose({ bodyRot: 14, bodySx: 0.04, weaponRot: 26, offRot: -26, rootX: 12, legFrontRot: -10, legBackRot: 10, extraRot: -20 }),
};
/** Its door thrown open and its sparks belched out: they land and walk. */
const FU_CINDERS: Move = {
  // Leaning back on its heels, then forward, its door thrown open: fire in a cone in front of it.
  windup: pose({ bodyRot: -16, rootX: -14, weaponRot: -30, offRot: -20, legFrontRot: -12, extraRot: 16 }),
  strike: pose({ bodyRot: 22, bodySy: -0.04, rootX: 20, weaponRot: 20, offRot: 20, legFrontRot: -16, legBackRot: 16, extraRot: -24 }),
};
/** It rears on its back leg and comes down on what is in front, all its weight. */
const FU_PRESS: Move = {
  windup: pose({ rootY: -20, bodyRot: -8, legFrontRot: -40, legFrontY: -40, weaponRot: -20, offRot: -20, extraRot: 12 }),
  strike: pose({ rootY: 8, bodyRot: 6, bodySy: -0.06, legFrontRot: 6, weaponRot: 14, offRot: 14, extraRot: -16 }),
};
/** The ladle flicked forward: gobbets of slag thrown out ahead. */
const FU_SLAG: Move = {
  windup: pose({ weaponRot: 30, weaponY: 20, bodyRot: -6, rootX: -6 }),
  strike: pose({ weaponRot: -50, weaponX: 20, weaponY: -30, bodyRot: 10, rootX: 10, extraRot: -10 }),
};
const FU_POUR: Move = {
  // The ladle lifted full, and tipped: what is in it goes where it is tipped.
  windup: pose({ weaponRot: -60, weaponY: -40, bodyRot: -6, rootX: -6, extraRot: 8 }),
  strike: pose({ weaponRot: 70, weaponX: 30, weaponY: 20, bodyRot: 12, rootX: 14, legFrontRot: -10, extraRot: -12 }),
};
/** Cooled: water on it, its fires low, slumped on its legs. The game darkens it while it is so; the steam is a thing of its own. */
const FU_COOLED: Pose = pose({ rootY: 26, bodyY: 10, bodyRot: 6, bodySy: -0.05, weaponRot: 30, weaponY: 30, offRot: 24, offY: 20, legFrontRot: -14, legBackRot: 14, extraRot: 10 });
const FU_STAGGER: Pose = pose({ rootY: 50, rootRot: 6, bodyRot: 16, bodyY: 26, weaponRot: 50, weaponY: 50, offRot: 40, offY: 40, legFrontRot: -40, legFrontY: -30, legBackRot: 30, legBackY: -20, extraRot: -16 });

/**
 * The Furnace. The foundry's great stove, that the founders fed for a hundred years and that one night got up
 * on its own iron legs and fed itself. A round belly of riveted plate, a chimney that leans and smokes, vents
 * round its belly in a band that glow and spit, a firebox door low on its front with a grate across it, one
 * arm that ends in a ladle full of what it has melted and the other in a hooked poker. It has no face, and
 * nothing on it is one: grates and vents run in rows. A seam on its side has split red-hot: that is where it
 * can be hurt, once it is cooled.
 */
const furnace: UnitArt = {
  id: 'furnace',
  canvas: [720, 720],
  feet: FU_FEET,
  margin: 200,
  moves: { press: FU_PRESS, vent: FU_VENT, slag: FU_SLAG, cinders: FU_CINDERS, pour: FU_POUR },
  stills: { cooled: FU_COOLED, stagger: FU_STAGGER, hit: HIT, fall: FALL },
  muzzle: [520, 470],
  top: 20,
  parts: [
    part('shadow', 'shadow', 'root', FU_FEET, (d) => blot(d, [370, 692], 460, 36)),
    part('poker-arm', 'offhand', 'body', [270, 330], (d) => {
      // The far arm: jointed iron, and the poker it rakes the fire with, hooked.
      d.ink('upper', limb([270, 330], [216, 430], 40, 32), SOOT, { dark: limbDark([270, 330], [216, 430], 40, 34, 'fu-pa-u', 0.7), mid: 4 });
      d.ink('fore', limb([216, 430], [240, 540], 32, 26), SOOT, { dark: limbDark([216, 430], [240, 540], 32, 28, 'fu-pa-f', 0.7), mid: 4 });
      d.ink('elbow', poly([[200, 414], [230, 410], [236, 444], [204, 448]]), LEAD, { dark: 0.6, mid: 2 });
      d.ink('poker', limb([240, 530], [160, 660], 10, 8), LEAD, { dark: limbDark([240, 530], [160, 660], 10, 10, 'fu-poker', 0.6), mid: 0, line: 2, heavy: 2.6 });
      d.ink('poker-hook', poly([[164, 650], [140, 668], [148, 690], [160, 676], [172, 660]]), LEAD, { dark: 0.5, mid: 0, line: 2, heavy: 2.6 });
      d.flat('poker-hot', poly([[148, 672], [160, 662], [162, 672], [152, 684]]), LAMP.mid);
    }),
    part('leg-back', 'legBack', 'root', [300, 560], (d) => {
      d.ink('leg', limb([300, 540], [276, 640], 66, 52, 4), SOOT, { dark: limbDark([300, 540], [276, 640], 66, 54, 'fu-lb', 0.7), mid: 4 });
      d.ink('foot', poly([[220, 640], [320, 632], [340, 664], [330, 690], [212, 690]]), LEAD, { dark: 0.6, mid: 3, heavy: 5 });
      rivets(d, 'foot-bolts', [232, 668], [320, 664], 4, 3);
    }),
    part('leg-front', 'legFront', 'root', [420, 560], (d) => {
      d.ink('leg', limb([420, 540], [448, 640], 70, 54, 4), SOOT, {
        dark: limbDark([420, 540], [448, 640], 70, 56, 'fu-lf', 0.4), mid: 4,
        inner: (c) => c.detail('leg-plates', [[[400, 580], [470, 576]], [[410, 614], [470, 612]]], SOOT, 3),
      });
      d.ink('knee', poly([[400, 570], [460, 562], [470, 596], [408, 604]]), LEAD, { dark: 0.4, mid: 3, rim: 2 });
      d.ink('foot', poly([[390, 640], [500, 630], [526, 662], [520, 690], [384, 690]]), LEAD, { dark: 0.4, mid: 3, heavy: 5, rim: 2 });
      rivets(d, 'foot-bolts', [400, 668], [510, 662], 5, 3);
      d.flat('ash', poly([[380, 680], [440, 674], [530, 682], [380, 690]]), EARTH.mid);
    }),
    part('body', 'body', 'root', [360, 560], (d) => {
      // The belly: riveted plate, round, squat, a band of vents across its upper part and a seam split down its side.
      d.ink('belly', poly([[210, 520], [190, 440], [196, 340], [236, 270], [300, 230], [380, 222], [460, 244], [520, 300], [546, 390], [534, 480], [500, 546], [420, 580], [300, 580]]), LEAD, {
        dark: poly([[160, 200], [330, 200], ...cut([340, 222], [370, 590], 'fu-belly', -1, 18), [160, 600]]),
        mid: 12, cold: 4, rim: 3,
        open: [[[508, 290], [538, 370]]],
        inner: (c) => {
          // The plates and their rivets, and soot and rust where the heat has been.
          c.detail('plates', [[[240, 300], [520, 330]], [[210, 470], [536, 450]], [[380, 226], [390, 580]], [[460, 246], [480, 570]]], LEAD, 4);
          c.flat('soot', poly([[380, 230], [460, 244], [490, 280], [420, 270]]), SOOT.mid);
          c.flat('rust-a', poly([[460, 500], [520, 486], [510, 540], [470, 552]]), RUST.mid);
          c.flat('rust-b', poly([[250, 300], [290, 290], [292, 320], [256, 326]]), RUST.mid);
          c.detail('pits', [[[420, 320], [430, 330]], [[480, 380], [490, 392]], [[440, 520], [452, 530]], [[400, 460], [410, 470]]], LEAD, 3);
          // The seam split red-hot: the one red place.
          c.ink('seam', poly([[480, 330], [500, 336], [494, 380], [510, 420], [496, 470], [480, 430], [486, 390], [476, 360]]), GORE, {
            dark: false, line: 2.4, heavy: 3,
            inner: (w) => w.flat('seam-hot', poly([[486, 360], [494, 362], [496, 400], [490, 430], [486, 396]]), LAMP.mid),
          });
        },
      });
      rivets(d, 'rivets-a', [232, 314], [518, 336], 11, 3.4);
      rivets(d, 'rivets-b', [212, 476], [530, 456], 12, 3.4);
      // The band of vents: a row of slots that glow, all the way round what can be seen of it.
      for (let i = 0; i < 8; i++) {
        const x = 236 + i * 36;
        const y = 376 - Math.sin((i / 7) * Math.PI) * 10;
        d.black(`vent-${i}`, poly([[x - 9, y - 18], [x + 9, y - 20], [x + 9, y + 20], [x - 9, y + 22]]));
        d.flat(`vent-glow-${i}`, poly([[x - 5, y - 10], [x + 5, y - 11], [x + 5, y + 16], [x - 5, y + 17]]), i % 2 === 0 ? LAMP.lit : LAMP.mid);
      }
      // The firebox door, low on the front, off to the side: a plate with a grate of many bars, glowing behind.
      d.ink('door', poly([[400, 450], [500, 440], [506, 540], [404, 552]]), LEAD, {
        dark: 0.36, mid: 4, rim: 2,
        inner: (c) => {
          c.ink('fire', poly([[414, 466], [492, 458], [496, 530], [418, 538]]), FIRE, { dark: false, mid: 0, line: 1.8, heavy: 2.2, inner: (w) => w.flat('fire-heart', poly([[426, 496], [484, 490], [486, 528], [428, 532]]), LAMP.hot) });
          for (let i = 0; i < 7; i++) c.black(`bar-${i}`, poly([[420 + i * 12, 460], [425 + i * 12, 460], [427 + i * 12, 538], [422 + i * 12, 538]]));
        },
      });
      d.ink('door-latch', poly([[504, 480], [524, 476], [526, 492], [506, 496]]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
      d.black('hinge-a', poly([[394, 460], [404, 458], [404, 472], [394, 474]]));
      d.black('hinge-b', poly([[396, 528], [406, 526], [406, 540], [396, 542]]));
    }),
    part('quench', 'extra', 'body', [360, 560], (d) => {
      // Shown only while it is cooled: where the water hit it, the iron gone black and dead, its vents out, steam off it.
      d.flat('quench-a', poly([[300, 236], [420, 228], [470, 270], [440, 330], [380, 316], [330, 360], [270, 330], [240, 290]]), SOOT.mid, 0.94);
      d.flat('quench-b', poly([[220, 340], [380, 340], [520, 350], [530, 400], [380, 410], [214, 404]]), SOOT.mid, 0.96);
      d.flat('quench-door', poly([[410, 460], [494, 452], [498, 534], [414, 542]]), SOOT.mid, 0.92);
      d.strokes('runs', [[[300, 410], [296, 470]], [[350, 412], [352, 490]], [[440, 408], [446, 450]], [[480, 404], [484, 440]], [[260, 400], [254, 450]]], 4, SOOT.mid);
      d.strokes('wet', [[[330, 250], [360, 244]], [[260, 300], [280, 290]], [[420, 380], [460, 376]]], 2.4, SLATE.lit);
      // The split seam still shows red through it: cooled is when it can be hurt.
      d.ink('quench-seam', poly([[480, 330], [500, 336], [494, 380], [510, 420], [496, 470], [480, 430], [486, 390], [476, 360]]), GORE, { dark: false, line: 2.4, heavy: 3 });
      // Steam: pale, flat, in hard pieces going up off it.
      d.flat('steam-a', poly([[260, 230], [300, 180], [340, 200], [330, 140], [370, 120], [380, 170], [360, 220]]), SNOW.lit, 0.7);
      d.flat('steam-b', poly([[420, 220], [450, 160], [500, 170], [480, 110], [520, 90], [540, 150], [490, 230]]), SNOW.lit, 0.6);
      d.flat('steam-c', poly([[180, 380], [140, 330], [170, 300], [150, 250], [200, 270], [214, 340]]), SNOW.lit, 0.5);
    }, 0, false, 'cooled'),
    part('stack', 'extra', 'body', [330, 236], (d) => {
      // The chimney: a leaning stack of pipe, banded, with smoke coming off it.
      d.ink('pipe', poly([[294, 240], [282, 110], [276, 50], [330, 40], [342, 104], [364, 236]]), SOOT, {
        dark: poly([[260, 30], [300, 30], ...cut([300, 40], [326, 244], 'fu-stack', -1, 8), [260, 250]]),
        mid: 6, cold: 3,
        inner: (c) => c.detail('pipe-soot', [[[320, 60], [330, 200]]], SOOT, 3),
      });
      d.ink('band-a', poly([[280, 120], [340, 112], [342, 126], [282, 134]]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
      d.ink('band-b', poly([[286, 190], [354, 182], [356, 196], [288, 204]]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
      d.ink('cap', poly([[262, 50], [344, 34], [348, 50], [266, 62]]), LEAD, { dark: 0.4, mid: 2, line: 2, heavy: 2.6 });
      // Smoke: dark, flat, going up in hard pieces.
      d.flat('smoke-a', poly([[280, 30], [320, 4], [350, 14], [340, -30], [300, -40], [270, -10]]), SOOT.mid, 0.85);
      d.flat('smoke-b', poly([[300, -50], [340, -70], [370, -100], [330, -130], [290, -100]]), SOOT.lit, 0.55);
      d.flat('ember', poly([[330, -20], [336, -26], [340, -18], [334, -14]]), LAMP.lit);
    }, 0.1),
    part('ladle', 'weapon', 'body', [470, 320], (d) => {
      // The near arm: jointed iron, ending in a ladle full of what it has melted.
      d.ink('upper', limb([470, 320], [560, 410], 44, 36), SOOT, { dark: limbDark([470, 320], [560, 410], 44, 38, 'fu-la-u', 0.4), mid: 4 });
      d.ink('fore', limb([560, 410], [600, 520], 36, 30), SOOT, { dark: limbDark([560, 410], [600, 520], 36, 32, 'fu-la-f', 0.4), mid: 4 });
      d.ink('elbow', poly([[540, 396], [578, 390], [584, 428], [546, 432]]), LEAD, { dark: 0.4, mid: 2, rim: 2 });
      d.ink('shoulder', poly([[448, 300], [498, 290], [508, 340], [454, 350]]), LEAD, { dark: 0.4, mid: 3, rim: 2 });
      rivets(d, 'shoulder-bolts', [456, 306], [500, 298], 3, 3);
      // The ladle: a deep iron bowl on the end of the arm, slag in it and dripping from its lip.
      d.ink('bowl', poly([[560, 510], [660, 500], [672, 540], [650, 580], [580, 584], [556, 548]]), LEAD, {
        dark: poly([[540, 560], ...cut([540, 556], [680, 546], 'fu-bowl', 1, 6), [680, 600], [540, 600]]),
        mid: 5, rim: 2,
      });
      d.ink('slag', poly([[566, 512], [656, 504], [650, 520], [570, 526]]), FIRE, { dark: false, line: 1.8, heavy: 2.4, inner: (c) => c.flat('slag-hot', poly([[590, 512], [640, 508], [636, 518], [594, 520]]), LAMP.hot) });
      d.ink('drip', poly([[660, 510], [672, 512], [670, 540], [664, 560], [660, 540]]), FIRE, { dark: false, line: 1.4, heavy: 1.8 });
    }),
  ],
};

// ================================================================== the Mirror King

const MI_FEET: Pt = [330, 700];

const MI_CUT: Move = {
  windup: pose({ weaponRot: -80, weaponY: -20, bodyRot: -8, headRot: -6, rootX: -10, extraRot: 12 }),
  strike: pose({ weaponRot: 70, weaponX: 20, weaponY: 20, bodyRot: 12, headRot: 8, rootX: 20, legFrontRot: -12, legBackRot: 12, extraRot: -20 }),
};
const MI_SHATTER: Move = {
  // He draws in, and bursts: pieces of him fly out every way.
  windup: pose({ weaponRot: 30, offRot: 30, bodyRot: 4, bodySy: -0.04, bodySx: -0.04, headRot: 10, rootY: 6 }),
  strike: pose({ weaponRot: -60, weaponY: -20, offRot: -80, offY: -20, bodyRot: -8, bodySy: 0.05, bodySx: 0.05, headRot: -16, rootY: -8, extraRot: 24 }),
};
const MI_STEP: Move = {
  // Into a mirror and out of another: he turns side on and is gone, and is somewhere else.
  windup: pose({ bodyRot: -14, bodySx: -0.2, headRot: -10, weaponRot: -20, offRot: -20, rootX: -12, extraRot: 20 }),
  strike: pose({ bodyRot: 10, bodySx: -0.4, headRot: 10, weaponRot: 10, offRot: 10, rootX: 30, extraRot: -26 }),
};
/** His far hand flung out: splinters of him fly in a fan. */
const MI_SHARDS: Move = {
  windup: pose({ offRot: 40, offY: 10, bodyRot: -10, headRot: -6, rootX: -8, extraRot: 14 }),
  strike: pose({ offRot: -90, offX: 30, offY: -10, bodyRot: 14, headRot: 8, rootX: 16, legFrontRot: -10, legBackRot: 10, extraRot: -24 }),
};
/** He stands up tall and his crown and his mantle of glass flare: a ring of it goes out round him. */
const MI_CROWN: Move = {
  windup: pose({ bodySy: -0.04, headRot: 12, weaponRot: 20, offRot: 20, rootY: 6, extraRot: 10 }),
  strike: pose({ bodySy: 0.06, headRot: -18, weaponRot: -50, offRot: -60, rootY: -10, extraRot: -30 }),
};
const MI_LURE: Move = {
  // His far hand raised flat, as to a glass: and what was a reflection of him gets up and walks.
  windup: pose({ offRot: -40, offY: -10, bodyRot: -4, headRot: -6 }),
  strike: pose({ offRot: -110, offX: 20, offY: -30, bodyRot: -8, bodySy: 0.03, headRot: -12, extraRot: 14 }),
};
const MI_STAGGER: Pose = pose({ rootY: 50, bodyRot: 22, bodyY: 26, headRot: 30, headY: 16, weaponRot: 60, weaponY: 60, offRot: 30, offY: 30, legFrontRot: -46, legFrontY: -30, legBackRot: 40, legBackY: -20, extraRot: -14 });

interface Glass {
  /** The glass: its lit face, and its middle tone. */
  glass: Tone;
  /** What a glint on the glass is. */
  glint: string;
  /** The pane that has the light in it. */
  pale: string;
  robe: Tone;
  lining: Tone;
  /** The red at the heart of him: a reflection has none. */
  heart: boolean;
}

const KING_GLASS: Glass = { glass: SLATE, glint: SNOW.lit, pale: SNOW.mid, robe: SOOT, lining: BLOOD, heart: true };
/** A reflection is the same figure in the cold of the glass, pale: the game draws it a little see-through. */
const REFLECTION_GLASS: Glass = { glass: SNOW, glint: SCRATCH, pale: SNOW.lit, robe: SNOW, lining: SLATE, heart: false };

/** A body of glass in pieces: facets of the glass's tones with black between them, and glints. */
function shards(d: Doc, name: string, outline: Pt[], facets: Pt[][], g: Glass, dark: Pt[]): void {
  d.ink(name, poly(outline), g.glass, {
    dark: poly(dark), mid: 6, rim: 2,
    inner: (c) => {
      facets.forEach((f, i) => c.flat(`${name}-facet-${i}`, poly(f), i % 2 === 0 ? g.glass.mid : g.pale));
      facets.forEach((f, i) => c.pen(`${name}-crack-${i}`, poly([...f, f[0]], false), 2.2));
      c.strokes(`${name}-glints`, facets.slice(0, 3).map((f): [Pt, Pt] => [f[0], between(f[0], f[1], 0.5)]), 2, g.glint);
    },
  });
}

function mirrorKing(id: string, g: Glass): UnitArt {
  return {
    id,
    canvas: [660, 720],
    feet: MI_FEET,
    margin: 190,
    moves: { cut: MI_CUT, shards: MI_SHARDS, step: MI_STEP, lure: MI_LURE, shatter: MI_SHATTER, crown: MI_CROWN },
    stills: { stagger: MI_STAGGER, hit: HIT, fall: FALL },
    muzzle: [540, 200],
    top: 30,
    parts: [
      part('shadow', 'shadow', 'root', MI_FEET, (d) => blot(d, [336, 702], 320, 30)),
      part('glass-arm', 'offhand', 'body', [280, 250], (d) => {
        // The far arm, its hand of glass held flat, as to a mirror.
        arm(d, 'sleeve', [280, 250], [230, 360], [250, 440], g.robe, g.glass, 40);
        shards(d, 'hand', [[230, 430], [262, 420], [282, 452], [262, 486], [232, 474]], [[[240, 436], [262, 430], [258, 456]], [[246, 460], [268, 452], [262, 478]]], g, [[200, 460], [300, 470], [300, 500], [200, 500]]);
      }),
      part('leg-back', 'legBack', 'root', [300, 520], (d) => {
        d.ink('shin', limb([300, 500], [282, 660], 46, 34), g.robe, { dark: limbDark([300, 500], [282, 660], 46, 36, `${id}-lb`, 0.7), mid: 4 });
        shards(d, 'foot', [[236, 668], [290, 656], [320, 676], [316, 700], [230, 700]], [[[250, 670], [286, 662], [296, 688]]], g, [[220, 690], [330, 690], [330, 710], [220, 710]]);
      }),
      part('leg-front', 'legFront', 'root', [360, 520], (d) => {
        d.ink('shin', limb([360, 500], [386, 660], 48, 36), g.robe, { dark: limbDark([360, 500], [386, 660], 48, 38, `${id}-lf`, 0.4), mid: 4 });
        shards(d, 'foot', [[350, 664], [410, 652], [450, 674], [446, 700], [346, 700]], [[[370, 668], [410, 660], [420, 690]], [[420, 668], [440, 676], [432, 694]]], g, [[340, 692], [460, 692], [460, 710], [340, 710]]);
      }),
      part('mantle', 'extra', 'body', [300, 230], (d) => {
        // Behind his shoulders, what is left of the great mirror he came out of: long pieces of it stood up in a fan.
        const piece = (n: string, foot: Pt, tip: Pt, w: number): void => {
          const [fx, fy] = foot;
          const [tx, ty] = tip;
          shards(d, n, [[fx - w, fy], [tx - w * 0.3, ty + 10], [tx, ty], [tx + w * 0.5, ty + 18], [fx + w, fy + 4]],
            [[[fx - w * 0.4, fy - 6], [tx - w * 0.1, ty + 20], [fx + w * 0.3, fy - 20]]], g,
            [[fx - w - 60, ty - 10], [fx - w * 0.2, ty - 10], [fx - w * 0.2, fy + 10], [fx - w - 60, fy + 10]]);
        };
        piece('piece-a', [252, 270], [170, 120], 26);
        piece('piece-b', [272, 240], [230, 60], 30);
        piece('piece-c', [300, 226], [300, 70], 22);
        piece('piece-d', [244, 330], [150, 230], 20);
      }, 0.04),
      part('body', 'body', 'root', [330, 520], (d) => {
        // The robe: a king's, long, gone to rags at the foot, its lining showing where it is torn.
        d.ink('robe', poly([
          [270, 220], [330, 196], [400, 210], [430, 270], [448, 420], [486, 610],
          ...hem([486, 610], [140, 640], `${id}-robe`, 24, 22).reverse().slice(1, -1),
          [140, 640], [176, 560], [216, 420], [240, 280],
        ]), g.robe, {
          dark: poly([[170, 180], [320, 180], ...cut([320, 196], [340, 630], `${id}-robe-dark`, -1, 18), [170, 640]]),
          mid: 10, cold: 4,
          open: [[[430, 290], [440, 400]]],
          inner: (c) => {
            c.detail('robe-folds', [[[380, 260], [396, 420]], [[410, 440], [440, 590]], [[360, 460], [370, 600]]], g.robe, 5);
            c.flat('lining', poly([[400, 560], [460, 548], [470, 600], [440, 612], [420, 590], [404, 606]]), g.lining.lit);
          },
        });
        // His chest of glass, where the robe is open: and at the heart of it, if he is the king himself, a red pane.
        shards(d, 'chest', [[316, 230], [400, 222], [418, 300], [396, 380], [330, 390], [308, 320]],
          [[[324, 240], [380, 232], [370, 290]], [[384, 236], [408, 300], [380, 300]], [[318, 300], [360, 300], [340, 370]], [[364, 308], [396, 312], [384, 372]]], g,
          [[280, 200], [340, 200], [336, 400], [280, 400]]);
        if (g.heart) {
          d.ink('heart', poly([[346, 300], [374, 294], [388, 322], [370, 352], [344, 344]]), GORE, {
            dark: false, line: 2.4, heavy: 3,
            inner: (c) => c.flat('heart-deep', poly([[354, 312], [372, 308], [378, 328], [360, 338]]), GORE.mid),
          });
        }
        // A belt of glass plates, and a chain of office gone dull.
        chain(d, 'office', [312, 240], [404, 300], 9);
      }),
      part('ermine', 'extra', 'body', [340, 220], (d) => {
        // The collar of the robe: fur, matted, worn to the hide in places. It hides where his arms begin.
        d.ink('collar', poly([
          [250, 250], [280, 210], [330, 190], [392, 196], [432, 222], [446, 260],
          ...hem([446, 260], [246, 270], `${id}-collar`, 10, 14).reverse().slice(1, -1),
          [246, 270],
        ]), BONE, {
          dark: poly([[220, 180], [316, 180], ...cut([316, 190], [322, 290], `${id}-collar-dark`, -1, 8), [220, 290]]),
          mid: 5, cold: 3,
          inner: (c) => c.detail('fur', [[[360, 200], [366, 250]], [[386, 204], [394, 254]], [[410, 214], [420, 256]], [[334, 198], [338, 250]]], BONE, 3),
        });
      }, 0.12),
      part('head', 'head', 'body', [350, 200], (d) => {
        // His head: one long pane of mirror, cracked across, tilted to the light. Nothing looks out of it.
        shards(d, 'face', [[320, 196], [326, 130], [352, 96], [384, 104], [400, 150], [392, 200], [366, 214]],
          [[[360, 100], [384, 104], [398, 146], [334, 210], [322, 196], [326, 170]]], g,
          [[300, 90], [344, 90], [344, 220], [300, 220]]);
        // One crack across the pane, and the light lying on it in a band.
        d.pen('face-crack', poly([[324, 150], [350, 160], [362, 150], [398, 176]], false), 2.6);
        d.strokes('face-light', [[[372, 112], [392, 150]], [[364, 122], [376, 144]]], 3, g.glint);
        // The crown: spikes of glass, long and broken, stood in a band of iron.
        d.ink('band', poly([[318, 118], [394, 106], [400, 126], [322, 138]]), LEAD, { dark: 0.4, mid: 2, line: 2, heavy: 2.6 });
        const spike = (n: string, x: number, h: number, lean: number): void => shards(d, n, [[x - 9, 118], [x + lean, 118 - h], [x + 10, 116]], [], g, [[x - 20, 0], [x - 2, 0], [x - 2, 130], [x - 20, 130]]);
        spike('spike-a', 326, 56, -10);
        spike('spike-b', 344, 90, -4);
        spike('spike-c', 362, 110, 4);
        spike('spike-d', 380, 76, 10);
        spike('spike-e', 394, 40, 14);
      }),
      part('blade', 'weapon', 'body', [420, 250], (d) => {
        // The near arm and the blade he cuts with: a long splinter of mirror, sharp both sides, bound at its foot.
        shards(d, 'blade', [[470, 400], [490, 380], [560, 160], [580, 40], [598, 160], [520, 400], [500, 420]],
          [[[500, 380], [560, 180], [540, 300]], [[540, 320], [580, 120], [580, 200]]], g,
          [[450, 380], [560, 30], [570, 30], [500, 440]]);
        d.ink('binding', poly([[468, 396], [510, 404], [504, 432], [462, 424]]), LEATHER, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4, inner: (c) => c.detail('binding-turns', stitches([470, 402], [508, 410], 4, 24, 0.3), LEATHER, 1.6) });
        arm(d, 'sleeve', [420, 250], [470, 340], [486, 410], g.robe, g.glass, 42);
      }),
    ],
  };
}

const mirror = mirrorKing('mirror', KING_GLASS);
const reflection = mirrorKing('reflection', REFLECTION_GLASS);

// ================================================================== what stands in their lairs

/** A spark off the Furnace that walks: a lump of clinker on two stubs, hot through its cracks. */
const cinder: UnitArt = {
  id: 'cinder',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { bite: LUNGE_BITE },
  stills: { hit: HIT, fall: FALL },
  muzzle: [176, 196],
  top: 150,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 90, 9)),
    part('leg-back', 'legBack', 'root', [118, 214], (d) => d.ink('stub', poly([[108, 214], [124, 214], [126, 238], [104, 238]]), SOOT, { dark: 0.6, mid: 0, line: 2, heavy: 3 })),
    part('leg-front', 'legFront', 'root', [140, 214], (d) => d.ink('stub', poly([[134, 214], [150, 214], [156, 238], [132, 238]]), SOOT, { dark: 0.4, mid: 0, line: 2, heavy: 3 })),
    part('body', 'body', 'root', [128, 214], (d) => {
      d.ink('clinker', poly([[94, 210], [90, 186], [104, 164], [128, 154], [156, 158], [176, 178], [178, 204], [160, 220], [110, 222]]), SOOT, {
        dark: 0.45, mid: 4, cold: 2,
        inner: (c) => {
          c.ink('cracks', poly([[96, 196], [112, 184], [124, 192], [140, 172], [152, 180], [172, 166], [174, 174], [154, 190], [142, 182], [128, 202], [112, 194], [98, 204]]), FIRE, { dark: false, line: 1.8, heavy: 2.2, inner: (w) => w.flat('hot', poly([[136, 184], [142, 178], [140, 188]]), LAMP.hot) });
          c.ink('crack-b', poly([[120, 162], [130, 170], [126, 176], [116, 168]]), FIRE, { dark: false, line: 1.4, heavy: 1.8 });
          c.detail('pits', [[[100, 196], [106, 200]], [[160, 206], [166, 210]]], SOOT, 2.4);
        },
      });
      d.flat('spark-a', poly([[150, 146], [156, 136], [160, 146], [156, 150]]), LAMP.lit);
      d.flat('spark-b', poly([[118, 140], [122, 132], [126, 140]]), LAMP.mid);
    }),
  ],
};

/** Her egg sac, stuck to the cellar floor in a nest of thread: pale, veined, as big as a calf, things moving in it. */
const eggsac: UnitArt = {
  id: 'eggsac',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { stand: STAND },
  stills: { hit: HIT },
  muzzle: [128, 170],
  top: 120,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 150, 12)),
    part('body', 'body', 'root', [128, 236], (d) => {
      d.strokes('nest', [[[60, 236], [100, 200]], [[70, 238], [128, 214]], [[196, 236], [160, 200]], [[186, 238], [128, 216]], [[90, 238], [80, 220]]], 2.4, BONE.mid);
      d.ink('sac', poly([[80, 230], [70, 196], [80, 160], [106, 132], [136, 124], [164, 136], [184, 168], [188, 206], [176, 232], [128, 240]]), BONE, {
        dark: poly([[50, 120], [96, 120], ...cut([96, 124], [104, 244], 'eggsac', -1, 8), [50, 244]]),
        mid: 6, cold: 2.4,
        inner: (c) => {
          c.strokes('veins', [[[118, 134], [108, 180]], [[108, 180], [116, 226]], [[140, 130], [150, 170]], [[150, 170], [140, 214]], [[166, 150], [176, 196]]], 2.4, BLOOD.mid);
          // Shapes pressing out from inside: curled legs, dark.
          c.flat('young-a', poly([[130, 160], [150, 156], [160, 172], [146, 182], [134, 176]]), SOOT.mid, 0.6);
          c.flat('young-b', poly([[100, 196], [118, 192], [124, 208], [106, 212]]), SOOT.mid, 0.5);
          c.detail('thread', stitches([84, 186], [182, 176], 6, 20, 0.4), BONE, 2);
        },
      });
    }),
  ],
};

/** A water barrel of the foundry, on its end, hooped, wet down its sides: what cools the Furnace when it is broken. */
const barrel: UnitArt = {
  id: 'barrel',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { stand: STAND },
  stills: { hit: HIT },
  muzzle: [128, 150],
  top: 110,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 110, 11)),
    part('body', 'body', 'root', [128, 236], (d) => {
      d.ink('staves', poly([[86, 236], [80, 190], [84, 140], [92, 122], [164, 122], [172, 140], [176, 190], [170, 236]]), WOOD, {
        dark: poly([[60, 110], [116, 110], ...cut([116, 122], [120, 240], 'barrel', -1, 6), [60, 240]]),
        mid: 5, rim: 2,
        inner: (c) => {
          c.detail('stave-lines', [[[108, 126], [104, 234]], [[128, 124], [128, 236]], [[150, 126], [154, 234]]], WOOD, 2.4);
          c.strokes('wet', [[[160, 150], [162, 190]], [[140, 170], [141, 214]], [[166, 200], [168, 230]]], 2.4, SLATE.lit);
        },
      });
      for (const [i, y] of [134, 184, 226].entries()) d.ink(`hoop-${i}`, poly([[82, y], [174, y], [175, y + 9], [81, y + 9]]), LEAD, { dark: 0.45, mid: 0, line: 1.8, heavy: 2.4, rim: 1.4 });
      d.ink('top', poly([[92, 122], [164, 122], [158, 112], [98, 112]]), WOOD, { dark: false, line: 1.8, heavy: 2.4 });
      d.flat('water', poly([[100, 118], [156, 118], [152, 114], [104, 114]]), SLATE.lit);
      d.ink('ladle', poly([[150, 116], [176, 84], [182, 88], [158, 120]]), LEAD, { dark: 0.4, mid: 0, line: 1.6, heavy: 2 });
    }),
  ],
};

/** A tall mirror of the hall, in a carved frame on clawed feet: he steps out of it. Its glass gives back the cold light. */
const mirrorStand: UnitArt = {
  id: 'mirror-stand',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { stand: STAND },
  stills: { hit: HIT },
  muzzle: [128, 120],
  top: 0,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 120, 10)),
    part('body', 'body', 'root', [128, 236], (d) => {
      d.ink('frame', poly([[78, 230], [74, 40], [92, 10], [128, 0], [164, 10], [182, 40], [178, 230]]), WOOD, {
        dark: poly([[50, 0], [110, 0], ...cut([110, 0], [114, 240], 'mirror-frame', -1, 6), [50, 240]]),
        mid: 4, rim: 2,
        inner: (c) => {
          c.detail('carving', [[[92, 24], [110, 12]], [[146, 12], [164, 24]], [[84, 120], [84, 160]], [[172, 120], [172, 160]]], WOOD, 2.4);
          c.flat('gilt', poly([[120, 4], [136, 4], [140, 14], [116, 14]]), RUST.lit);
        },
      });
      // The glass: the cold of the hall in it, a pale band across it, nothing looking back.
      d.ink('glass', poly([[90, 214], [88, 52], [102, 28], [128, 20], [154, 28], [168, 52], [166, 214]]), SLATE, {
        dark: poly([[80, 20], [110, 20], [100, 220], [80, 220]]), mid: 0, line: 2, heavy: 2.4,
        inner: (c) => {
          c.flat('glass-light', poly([[120, 40], [150, 36], [166, 80], [166, 120], [110, 200], [96, 200], [96, 170]]), SNOW.mid);
          c.strokes('glints', [[[140, 48], [156, 80]], [[146, 44], [150, 54]]], 2.4, SNOW.lit);
        },
      });
      for (const [i, x] of [76, 164].entries()) d.ink(`claw-${i}`, poly([[x, 226], [x + 18, 226], [x + 22, 240], [x - 4, 240]]), LEAD, { dark: 0.45, mid: 0, line: 1.6, heavy: 2.2 });
    }),
  ],
};

export const LORDS: UnitArt[] = [spinner, spiderling, eggsac, abbot, monk, furnace, cinder, barrel, mirror, reflection, mirrorStand];
