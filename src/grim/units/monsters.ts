// The monsters, and the small things that come with them. A monster is
// drawn at its own size, three to five times a hunter's, with the same
// width of line: it is not a person made bigger. It is one idea, made wrong:
// too much back, too little head, an arm that reaches the ground.
//
// Each has one place that is blood red, which is where it can be hurt most,
// and which the player has to be able to find in the dark.

import { Doc, cut } from '../kit/draw';
import { arm, between, blot, boot, chain, face, hem, limb, limbDark, stitches, stud } from '../kit/figure';
import { BLOOD, BONE, EARTH, GORE, LAMP, LEAD, LEATHER, PALLOR, RUST, SNOW, SOOT, TALLOW, WOOD } from '../kit/palette';
import { poly, type Pt } from '../kit/path';
import { part, type Move, type UnitArt } from '../kit/unit';
import { CLAW, FALL, HIT } from '../poses';
import { pose, type Pose } from '../rig';
import { PERSON, PERSON_FEET, PERSON_MARGIN, lantern } from './hunters';

/** A candle stuck in its own wax, lit. `at` is its foot. */
function candle(d: Doc, name: string, at: Pt, h: number): void {
  const [x, y] = at;
  d.ink(`${name}-wax`, poly([[x - 5, y - h], [x + 4, y - h + 1], [x + 6, y - 6], [x + 10, y + 2], [x - 9, y + 3], [x - 6, y - 8]]), BONE, { dark: 0.4, mid: 2, line: 1.6, heavy: 2.4 });
  d.ink(`${name}-flame`, poly([[x - 4, y - h - 2], [x, y - h - 18], [x + 4, y - h - 2], [x, y - h + 1]]), { lit: LAMP.lit, mid: LAMP.mid }, { dark: false, line: 1.2, heavy: 1.6 });
  d.flat(`${name}-heart`, poly([[x - 1.6, y - h - 3], [x, y - h - 11], [x + 1.6, y - h - 3]]), LAMP.hot);
}

// The Gravedigger's own movements. His spade is carried blade up, and his far hand holds the bell he rings them up with.
const SLAM: Move = {
  windup: pose({ weaponRot: -92, weaponY: -20, weaponX: -14, bodyRot: -10, headRot: 8, rootX: -10, legFrontRot: -8, extraRot: 12 }),
  strike: pose({ weaponRot: 66, weaponX: 26, weaponY: 30, bodyRot: 16, bodySy: -0.04, headRot: -10, rootX: 22, legFrontRot: -12, legBackRot: 10, extraRot: -20 }),
};
const SWEEP: Move = {
  windup: pose({ weaponRot: -150, weaponY: 30, weaponX: -30, bodyRot: -14, headRot: 10, rootX: -14, legBackRot: 6, extraRot: 14 }),
  strike: pose({ weaponRot: 96, weaponY: 60, weaponX: 30, bodyRot: 18, headRot: -12, rootX: 26, legFrontRot: -12, legBackRot: 12, extraRot: -24 }),
};
const RING: Move = {
  windup: pose({ offRot: -96, offY: -20, bodyRot: -6, headRot: -6, weaponRot: 8 }),
  strike: pose({ offRot: -150, offY: -30, offX: 10, bodyRot: -10, bodySy: 0.03, headRot: -14, weaponRot: 14, extraRot: 10 }),
};
/** Broken: down on a knee, leaning on the spade, the head hanging. This is when he can be hurt most. */
const STAGGER: Pose = pose({ rootY: 34, bodyRot: 22, bodyY: 26, headRot: 22, headY: 8, weaponRot: 24, weaponY: 40, weaponX: 16, offRot: -14, offY: 10, legFrontRot: -34, legFrontY: -30, legBackRot: 42, legBackY: -22, extraRot: -10 });

const S_FEET: Pt = [360, 680];

/** A long bone, hung by a cord: a shaft with a knob at each end. */
function bone(d: Doc, name: string, a: Pt, b: Pt, w: number): void {
  d.ink(name, limb(a, b, w, w), BONE, { dark: limbDark(a, b, w, w, name, 0.36), mid: 0, line: 1.8, heavy: 2.4 });
  for (const [k, p] of [['a', a], ['b', b]] as const) {
    d.ink(`${name}-knob-${k}`, poly([[p[0] - w, p[1] - w * 0.7], [p[0] + w * 0.2, p[1] - w], [p[0] + w, p[1] - w * 0.2], [p[0] + w * 0.7, p[1] + w * 0.8], [p[0] - w * 0.6, p[1] + w]]), BONE, { dark: 0.36, mid: 0, line: 1.8, heavy: 2.4 });
  }
}

/**
 * The Gravedigger. A gravedigger grown huge on his work: a back like a barrow, the candles of a hundred burials
 * guttering on it and their wax run down him, a head too small and tied shut like a corpse's, bowed legs, one
 * arm so long its knuckles drag, the bell he rings the dead up with in that fist, and a grave spade the size of
 * a door in the other. The cage on his chest is where he keeps what he has taken, and where he can be hurt.
 */
const sexton: UnitArt = {
  id: 'sexton',
  canvas: [720, 720],
  feet: S_FEET,
  margin: 170,
  moves: { slam: SLAM, sweep: SWEEP, ring: RING },
  stills: { stagger: STAGGER, hit: HIT, fall: FALL },
  muzzle: [640, 180],
  top: 100,
  parts: [
    part('shadow', 'shadow', 'root', S_FEET, (d) => blot(d, [400, 682], 420, 36)),
    part('leg-back', 'legBack', 'root', [318, 536], (d) => {
      // Bowed: the thigh goes out and the shin comes back in.
      d.ink('thigh', limb([318, 524], [286, 600], 78, 58, 6), SOOT, { dark: limbDark([318, 524], [286, 600], 78, 62, 'sx-lb-t', 0.66) });
      d.ink('shin', limb([286, 590], [302, 656], 56, 46, 4), SOOT, { dark: limbDark([286, 590], [302, 656], 56, 48, 'sx-lb-s', 0.66) });
      boot(d, 'boot', [308, 680], [302, 646], LEATHER, 108, 50);
    }),
    part('tails', 'extra', 'body', [330, 520], (d) => {
      // What is left of a coat, hanging behind and between his legs.
      d.ink('tails', poly([[250, 470], [400, 500], [404, 606], ...hem([404, 606], [236, 632], 'sx-tails', 26, 26).reverse().slice(1, -1), [236, 632]]), SOOT, {
        dark: 0.6, cold: 3.4,
        inner: (c) => {
          c.detail('tail-folds', [[[330, 500], [322, 610]], [[370, 506], [372, 600]]], SOOT, 4);
          c.flat('dirt', poly([[300, 590], [360, 584], [400, 600], [404, 640], [290, 640]]), EARTH.mid);
        },
      });
    }, 0.4),
    part('leg-front', 'legFront', 'root', [404, 536], (d) => {
      d.ink('thigh', limb([404, 524], [442, 600], 82, 60, 6), SOOT, {
        dark: limbDark([404, 524], [442, 600], 82, 64, 'sx-lf-t', 0.4),
        inner: (c) => {
          c.flat('patch', poly([[416, 546], [452, 540], [460, 580], [424, 588]]), SOOT.mid);
          c.strokes('patch-thread', [...stitches([416, 546], [452, 540], 5, 7, 0), ...stitches([424, 588], [460, 580], 5, 7, 0)], 2.4);
        },
      });
      d.ink('shin', limb([442, 590], [426, 656], 58, 48, 4), SOOT, {
        dark: limbDark([442, 590], [426, 656], 58, 50, 'sx-lf-s', 0.4),
        inner: (c) => c.detail('bindings', stitches([446, 600], [432, 648], 4, 52, 0.2), SOOT, 4),
      });
      boot(d, 'boot', [438, 680], [426, 646], LEATHER, 116, 52);
      d.ink('toecap', poly([[478, 650], [504, 660], [504, 674], [472, 674]]), LEAD, { dark: 0.3, mid: 3, rim: 2 });
      d.flat('mud', poly([[380, 668], [420, 660], [470, 668], [500, 676], [380, 678]]), EARTH.mid);
    }),
    part('bell-arm', 'offhand', 'body', [398, 312], (d) => {
      // The far arm: too long, its knuckles on the ground, and in its fist the bell.
      const fistAt: Pt = [566, 632];
      // The bell lies on its side beyond the fist: big enough to be heard under the earth.
      d.ink('bell-handle', limb([578, 628], [606, 614], 16, 14), WOOD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
      d.ink('bell', poly([[602, 618], [622, 602], [660, 590], [690, 570], [722, 562], [730, 690], [696, 676], [662, 660], [624, 652], [602, 640]]), LEAD, {
        dark: poly([[590, 634], ...cut([596, 640], [740, 660], 'sx-bell', 1, 8), [740, 700], [590, 700]]),
        mid: 8, rim: 3,
        inner: (c) => {
          c.detail('bell-bands', [[[640, 596], [644, 656]], [[690, 572], [698, 676]]], LEAD, 4);
          c.flat('bell-rust', poly([[650, 630], [690, 640], [688, 674], [652, 658]]), RUST.mid);
          c.detail('bell-pits', [[[656, 606], [664, 616]], [[704, 590], [710, 602]], [[664, 622], [670, 630]]], LEAD, 3);
        },
      });
      d.black('bell-mouth', poly([[712, 566], [724, 562], [732, 690], [718, 684]]));
      d.ink('clapper', poly([[724, 640], [744, 646], [748, 666], [730, 670]]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
      arm(d, 'arm', [398, 312], [496, 480], fistAt, SOOT, PALLOR, 46);
      // The skin of his hand, cracked like dry ground.
      d.detail('cracks', [[[548, 620], [560, 632]], [[572, 612], [578, 626]], [[556, 644], [570, 648]]], PALLOR, 2.4);
    }),
    part('body', 'body', 'root', [360, 536], (d) => {
      // The barrow of his back and the fall of his belly: one great shape, most of it in the dark.
      d.ink('trunk', poly([
        [286, 540], [246, 430], [232, 300], [262, 196], [330, 138], [410, 150], [462, 222], [486, 300], [494, 390], [472, 480], [432, 546],
      ]), SOOT, {
        dark: poly([[200, 100], [344, 100], ...cut([346, 132], [384, 556], 'sx-trunk', -1, 26), [200, 580]]),
        mid: 14,
        cold: 4,
        open: [[[464, 226], [484, 296]]],
        inner: (c) => {
          // Shrouds, sewn on where the coat gave out: their weave shows.
          c.ink('shroud-a', poly([[404, 330], [488, 322], [492, 400], [470, 452], [410, 430]]), BONE, {
            dark: 0.3, mid: 6, line: 1.6, heavy: 2.4,
            inner: (w) => {
              w.detail('weave-a', stitches([420, 336], [424, 440], 9, 60, 0), BONE, 1.6);
              w.detail('weave-b', [[[436, 332], [440, 440]], [[456, 330], [458, 448]], [[474, 326], [474, 440]]], BONE, 1.6);
              w.flat('stain', poly([[440, 400], [476, 392], [480, 440], [452, 450]]), EARTH.lit, 0.6);
            },
          });
          c.ink('shroud-b', poly([[372, 180], [440, 196], [462, 250], [392, 262]]), BONE, {
            dark: 0.4, mid: 6, line: 1.6, heavy: 2.4,
            inner: (w) => w.detail('weave-c', [...stitches([400, 196], [404, 256], 6, 50, 0), [[416, 192], [420, 258]], [[436, 198], [440, 256]]], BONE, 1.6),
          });
          c.strokes('stitches', [[[402, 344], [392, 350]], [[404, 372], [394, 378]], [[406, 400], [396, 406]], [[410, 424], [400, 432]], [[380, 196], [372, 206]], [[386, 226], [376, 236]], [[390, 252], [382, 262]]], 4);
          // Seams and folds of the coat, a step off its own color.
          c.detail('coat-folds', [[[430, 270], [470, 300]], [[400, 290], [410, 326]], [[440, 470], [420, 530]], [[470, 410], [450, 470]]], SOOT, 5);
          // The firelight of his own candles, spilled down the front of the hump.
          c.flat('candle-light-a', poly([[352, 160], [408, 158], [440, 200], [420, 196], [396, 176], [364, 176]]), LAMP.mid, 0.5);
          c.flat('candle-light-b', poly([[404, 204], [440, 204], [456, 240], [430, 232]]), LAMP.mid, 0.3);
          // Grave dirt, caked on the low side of him.
          c.flat('dirt', poly([[392, 500], [470, 470], [466, 520], [430, 550], [390, 548]]), EARTH.mid);
          c.scratch('dry', [[[280, 250], [262, 330]], [[300, 360], [290, 440]], [[262, 380], [258, 430]]], 3);
        },
      });
      // A coil of rope over the shoulder and across him, for lowering what he buries.
      d.ink('rope-across', limb([330, 150], [470, 440], 16, 15), TALLOW, {
        dark: limbDark([330, 150], [470, 440], 16, 16, 'sx-rope-x', 0.4), mid: 0, line: 2, heavy: 2.6,
        inner: (c) => c.detail('rope-x-twist', stitches([336, 162], [466, 430], 22, 15, 0.5), TALLOW, 2.2),
      });
      // The rope he is belted with, and what hangs from it.
      d.ink('rope', poly([[262, 472], [470, 456], [472, 478], [266, 496]]), TALLOW, {
        dark: 0.5, mid: 4,
        inner: (c) => c.detail('twist', stitches([330, 482], [470, 468], 12, 22, 0.5), TALLOW, 3),
      });
      d.pen('bone-cord', poly([[440, 476], [444, 500]], false), 2.2);
      bone(d, 'bone-a', [440, 500], [452, 566], 7);
      d.pen('bone-cord-b', poly([[462, 474], [468, 494]], false), 2.2);
      bone(d, 'bone-b', [468, 496], [472, 548], 6);
      // Coffin nails, on a ring.
      d.pen('nail-ring', poly([[412, 480], [404, 492], [412, 504], [420, 492], [412, 480]], false), 2.4);
      d.strokes('nails', [[[408, 500], [400, 540]], [[412, 502], [410, 546]], [[416, 500], [422, 540]]], 5);
    }),
    part('candles', 'extra', 'body', [330, 150], (d) => {
      // The candles of the buried, set along his back in their own wax, and the wax run down him.
      d.ink('wax', poly([
        [262, 204], [288, 168], [330, 140], [392, 146], [424, 162], [430, 190], [424, 214], [414, 216], [410, 190], [398, 184], [394, 222], [384, 226], [378, 196], [362, 178], [352, 186],
        [344, 176], [318, 182], [312, 206], [302, 208], [298, 192], [284, 214], [280, 236], [270, 234],
      ]), BONE, {
        dark: 0.42, mid: 4,
        inner: (c) => {
          c.detail('wax-runs', [[[330, 150], [326, 174]], [[392, 154], [396, 200]], [[370, 150], [368, 172]], [[300, 180], [296, 204]]], BONE, 3);
          c.flat('wax-glow', poly([[340, 142], [400, 148], [412, 166], [350, 162]]), LAMP.lit, 0.4);
        },
      });
      candle(d, 'candle-a', [290, 176], 26);
      candle(d, 'candle-b', [326, 148], 40);
      candle(d, 'candle-c', [364, 142], 22);
      candle(d, 'candle-d', [398, 152], 32);
      candle(d, 'candle-e', [344, 146], 14);
    }, 0.06),
    part('cage', 'extra', 'body', [462, 356], (d) => {
      // What he has taken, in a cage on a chain: the one red thing on him.
      const P = (dx: number, dy: number): Pt => [462 + dx, 356 + dy];
      chain(d, 'chain', P(0, 0), P(2, 42), 9);
      d.ink('glow', poly([P(-24, 48), P(28, 48), P(32, 114), P(-28, 114)]), GORE, {
        dark: false, line: 2, heavy: 3,
        inner: (c) => c.flat('glow-low', poly([P(-30, 92), P(34, 90), P(34, 116), P(-30, 116)]), GORE.mid),
      });
      // What is in it: something that still beats.
      d.flat('heart', poly([P(-8, 62), P(2, 56), P(12, 62), P(16, 80), P(6, 102), P(-10, 94), P(-14, 76)]), LAMP.lit);
      d.flat('heart-core', poly([P(-2, 68), P(6, 66), P(8, 80), P(2, 92), P(-6, 84)]), LAMP.hot);
      d.black('top', poly([P(-30, 50), P(-12, 36), P(14, 36), P(34, 50)]));
      d.black('foot', poly([P(-32, 112), P(36, 112), P(28, 126), P(-24, 126)]));
      d.black('bar-a', poly([P(-12, 48), P(-8, 48), P(-10, 114), P(-14, 114)]));
      d.black('bar-b', poly([P(8, 48), P(12, 48), P(14, 114), P(10, 114)]));
      d.black('bar-c', poly([P(-26, 48), P(-23, 48), P(-27, 114), P(-30, 114)]));
      d.black('hoop', poly([P(-30, 78), P(34, 76), P(34, 82), P(-30, 84)]));
      d.ink('lock', poly([P(22, 70), P(36, 70), P(36, 90), P(22, 90)]), LEAD, { dark: 0.3, mid: 0, line: 1.6, heavy: 2 });
    }, 0.6, true),
    part('head', 'head', 'body', [452, 300], (d) => {
      const at: Pt = [486, 290];
      face(d, 'face', at, PALLOR, { size: 58, jaw: 1.3, ear: false, scar: true });
      // His skin, cracked.
      d.detail('skin-cracks', [[[494, 300], [500, 312]], [[484, 312], [488, 326]], [[502, 286], [508, 292]]], PALLOR, 2);
      // A burial hood, down to the brow, and the strip that ties a corpse's jaw shut, knotted on top.
      d.ink('hood', poly([[436, 300], [440, 262], [460, 244], [492, 240], [510, 258], [512, 274], [486, 270], [470, 280], [466, 318], [444, 322]]), BONE, {
        dark: poly([[420, 230], [460, 230], ...cut([460, 244], [456, 326], 'sx-hood', -1, 9), [420, 330]]),
        mid: 5, cold: 3,
        inner: (c) => {
          c.detail('hood-weave', [...stitches([470, 250], [506, 262], 6, 14, 0.2), [[466, 252], [464, 300]]], BONE, 1.8);
          c.flat('hood-stain', poly([[474, 262], [500, 262], [492, 272], [476, 274]]), EARTH.lit, 0.5);
        },
      });
      d.ink('jaw-tie', poly([[474, 276], [484, 274], [498, 318], [488, 322]]), BONE, { dark: 0.4, mid: 2, line: 1.6, heavy: 2.4 });
      d.ink('knot', poly([[468, 240], [480, 234], [488, 242], [476, 250]]), BONE, { dark: 0.4, mid: 0, line: 1.6, heavy: 2.4 });
    }),
    part('spade', 'weapon', 'body', [432, 334], (d) => {
      const butt: Pt = [534, 606];
      const neck: Pt = [610, 336];
      const hand: Pt = [564, 498];
      // A grave spade, blade up: a shaft like a gatepost, a T of a grip at its foot, a pointed blade worn bright along its edge.
      d.ink('shaft', limb(butt, neck, 22, 20), WOOD, {
        dark: limbDark(butt, neck, 22, 22, 'sx-shaft', 0.4), mid: 3,
        inner: (c) => c.detail('shaft-grain', [[between(butt, neck, 0.1), between(butt, neck, 0.3)], [between(butt, neck, 0.5), between(butt, neck, 0.72)], [between(butt, neck, 0.78), between(butt, neck, 0.92)]], WOOD, 3),
      });
      d.ink('grip', poly([[494, 588], [574, 612], [568, 634], [488, 610]]), WOOD, {
        dark: poly([[480, 606], [580, 628], [576, 642], [480, 620]]), mid: 3,
        inner: (c) => c.detail('grip-grain', [[[504, 598], [556, 614]]], WOOD, 3),
      });
      stud(d, 'grip-peg', [532, 610], 4);
      const B = (dx: number, dy: number): Pt => [neck[0] + dx, neck[1] + dy];
      d.ink('blade', poly([B(-56, 2), B(-60, -18), B(-46, -112), B(14, -214), B(66, -100), B(60, -14), B(54, 10), B(16, 0), B(-18, -8)]), LEAD, {
        dark: poly([B(-90, -230), B(-6, -230), ...cut(B(-4, -206), B(2, 20), 'sx-blade', -1, 16), B(-90, 30)]),
        mid: 9,
        rim: 4,
        inner: (c) => {
          // Pitted, rusted where it joins, bright only where the earth has scoured it, and earth still on it.
          c.detail('pits', [[B(24, -60), B(38, -44)], [B(34, -110), B(44, -96)], [B(18, -130), B(30, -118)], [B(40, -30), B(50, -20)], [B(12, -84), B(22, -74)]], LEAD, 4);
          c.flat('rust', poly([B(4, -34), B(40, -40), B(52, -8), B(14, 0)]), RUST.mid);
          c.flat('earth', poly([B(8, -206), B(30, -170), B(22, -140), B(2, -160)]), EARTH.lit);
          c.black('chip', poly([B(62, -72), B(52, -66), B(64, -58)]));
          c.detail('ridge', [[B(10, -200), B(12, -20)]], LEAD, 5);
        },
      });
      // The step for a boot, turned over along the blade's shoulders.
      d.ink('step-a', poly([B(-62, -6), B(-22, -14), B(-20, -2), B(-58, 8)]), LEAD, { dark: 0.4, mid: 0, line: 1.8, heavy: 2.4 });
      d.ink('step-b', poly([B(18, -6), B(60, -18), B(58, -4), B(20, 6)]), LEAD, { dark: false, line: 1.8, heavy: 2.4, rim: 2 });
      d.ink('socket', poly([B(-16, -8), B(14, -4), B(8, 40), B(-22, 34)]), LEAD, { dark: 0.4, mid: 3 });
      stud(d, 'nail-a', B(-4, 6), 3.5);
      stud(d, 'nail-b', B(-6, 22), 3.5);
      // The near arm: thick as a hunter's body.
      arm(d, 'arm', [432, 334], [540, 404], hand, SOOT, PALLOR, 60);
      d.detail('hand-cracks', [[[548, 480], [562, 494]], [[572, 476], [580, 490]], [[556, 506], [572, 512]]], PALLOR, 2.6);
    }),
  ],
};

/**
 * One of the risen: what gets up when the Gravedigger rings. Bent at the middle, its head hanging, both arms
 * reaching, the shroud it was sewn into torn open and the earth of its grave still on it.
 */
const risen: UnitArt = {
  id: 'risen',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { claw: CLAW },
  stills: { hit: HIT, fall: FALL },
  muzzle: [196, 132],
  top: 96,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 92, 10)),
    part('leg-back', 'legBack', 'root', [114, 176], (d) => {
      d.ink('thigh', limb([114, 172], [118, 206], 14, 10, 1), PALLOR, { dark: limbDark([114, 172], [118, 206], 14, 12, 'risen-lb-t', 0.6), mid: 2 });
      d.ink('shin', limb([118, 204], [104, 234], 10, 7), PALLOR, { dark: limbDark([118, 204], [104, 234], 10, 9, 'risen-lb-s', 0.6), mid: 2 });
      d.ink('foot', poly([[98, 232], [110, 230], [122, 240], [96, 240]]), PALLOR, { dark: 0.45, mid: 2, heavy: 4 });
    }),
    part('arm-back', 'offhand', 'body', [140, 126], (d) => {
      arm(d, 'arm', [140, 126], [164, 144], [188, 138], PALLOR, PALLOR, 9);
      d.strokes('fingers', [[[192, 134], [202, 130]], [[193, 138], [204, 138]], [[192, 142], [201, 146]]], 2.6, PALLOR.lit);
    }),
    part('leg-front', 'legFront', 'root', [130, 176], (d) => {
      d.ink('thigh', limb([130, 172], [146, 204], 15, 11, 1), PALLOR, { dark: limbDark([130, 172], [146, 204], 15, 12, 'risen-lf-t', 0.4), mid: 2 });
      d.ink('shin', limb([146, 202], [140, 234], 11, 8), PALLOR, { dark: limbDark([146, 202], [140, 234], 11, 9, 'risen-lf-s', 0.4), mid: 2, inner: (c) => c.flat('dirt', poly([[136, 218], [150, 216], [148, 236], [134, 236]]), EARTH.mid) });
      d.ink('foot', poly([[134, 232], [146, 230], [160, 240], [132, 240]]), PALLOR, { dark: 0.4, mid: 2, heavy: 4 });
    }),
    part('body', 'body', 'root', [122, 176], (d) => {
      // The shroud: wound round it once, torn open down the front, its ends trailing. Bent forward from the hips.
      d.ink('shroud', poly([
        [112, 130], [124, 116], [146, 112], [158, 126], [152, 150], [142, 172], [146, 188],
        ...hem([150, 198], [102, 204], 'risen-shroud', 14, 8).reverse(),
        [106, 170], [104, 146],
      ]), BONE, {
        dark: poly([[90, 106], [122, 106], ...cut([124, 114], [120, 210], 'risen-dark', -1, 7), [90, 214]]),
        cold: 2,
        inner: (c) => {
          c.detail('wraps', [[[154, 130], [124, 140]], [[150, 150], [122, 160]], [[144, 172], [122, 180]]], BONE, 2.2);
          c.flat('earth', poly([[124, 176], [148, 170], [150, 200], [120, 206]]), EARTH.lit, 0.8);
          c.flat('stain', poly([[136, 122], [152, 124], [148, 140], [134, 138]]), EARTH.lit, 0.6);
          // Where it tore: the ribs under it.
          c.black('tear', poly([[140, 142], [150, 138], [148, 162], [140, 168], [136, 154]]));
          c.strokes('ribs', [[[138, 148], [148, 146]], [[138, 154], [147, 153]], [[139, 160], [146, 160]]], 1.8, PALLOR.lit);
        },
      });
      // A strip of it trailing behind.
      d.ink('trail', poly([[110, 160], [116, 164], [104, 188], [92, 214], [96, 190]]), BONE, { dark: 0.5, mid: 0, line: 1.8, heavy: 2.4 });
    }),
    part('head', 'head', 'body', [146, 120], (d) => {
      // The head hangs: it is drawn low and tipped down.
      face(d, 'face', [160, 114], PALLOR, { size: 27, jaw: 1.25, ear: false });
      d.ink('cowl', poly([[140, 124], [142, 104], [154, 96], [170, 98], [174, 108], [164, 106], [154, 110], [152, 128]]), BONE, { dark: 0.45, mid: 2, cold: 1.8, inner: (c) => c.flat('cowl-earth', poly([[152, 98], [166, 98], [162, 106], [152, 108]]), EARTH.lit, 0.7) });
      d.ink('jaw-tie', poly([[155, 106], [160, 105], [167, 128], [162, 130]]), BONE, { dark: 0.3, mid: 1.5, line: 1.2, heavy: 1.8 });
    }),
    part('arm-front', 'weapon', 'body', [148, 128], (d) => {
      arm(d, 'arm', [148, 128], [172, 150], [198, 142], PALLOR, PALLOR, 10);
      // Fingers, open and reaching.
      d.strokes('fingers', [[[202, 136], [214, 130]], [[204, 141], [217, 140]], [[203, 146], [214, 150]]], 3, PALLOR.lit);
    }),
  ],
};

// The Antlered King's own movements. He goes on four legs, and his weapon is what he wears on his head.
const K_CHARGE: Move = {
  // Pawing the ground: his weight back, his head down and the points lowered at what he will run through.
  windup: pose({ rootX: -20, bodyRot: 9, bodyY: 10, headRot: 26, weaponRot: 8, legFrontRot: 22, legBackRot: -8, extraRot: 10 }),
  // Flat out: forelegs thrown forward, hind legs behind, everything on him streaming back.
  strike: pose({ rootX: 34, rootY: -10, bodyRot: 5, headRot: 20, weaponRot: 6, legFrontRot: -40, legBackRot: 36, extraRot: -34 }),
};
const K_GORE: Move = {
  windup: pose({ headRot: -22, weaponRot: -10, bodyRot: -5, rootX: -10, legFrontRot: 6, extraRot: 10 }),
  strike: pose({ headRot: 30, weaponRot: 16, bodyRot: 7, rootX: 26, legFrontRot: -12, legBackRot: 10, extraRot: -20 }),
};
const K_STOMP: Move = {
  // He rears, and comes down with both forefeet.
  windup: pose({ rootY: -30, bodyRot: -20, headRot: -8, legFrontRot: -34, legFrontY: -26, legBackRot: 10, extraRot: 14 }),
  strike: pose({ rootY: 6, bodyRot: 7, bodySy: -0.05, headRot: 14, legFrontRot: 10, legBackRot: -4, extraRot: -18 }),
};
const K_BELLOW: Move = {
  windup: pose({ headRot: 16, bodyRot: 4, bodyY: 4, weaponRot: 4 }),
  strike: pose({ headRot: -38, weaponRot: -10, bodyRot: -9, bodySy: 0.03, rootX: -6, legFrontRot: -6, extraRot: 12 }),
};
/** The other half of his stride: gathered, all four feet under him. With the charge's blow it makes a gallop. */
const K_GATHER: Pose = pose({ rootX: 10, rootY: 4, bodyRot: -3, headRot: 22, weaponRot: 6, legFrontRot: 30, legBackRot: -34, extraRot: -16 });
/** What a wall does to him: stopped dead, sat back on his haunches, his head thrown up and aside. */
const K_DAZE: Pose = pose({ rootX: -26, bodyRot: -15, bodyY: 8, headRot: -34, weaponRot: -14, legFrontRot: -18, legBackRot: 24, extraRot: 26 });
/** Broken: down on his knees in front, his crown on the ground. */
const K_STAGGER: Pose = pose({ rootX: 8, bodyRot: 17, bodyY: 34, headRot: 22, headY: 20, weaponRot: 12, legFrontRot: 62, legFrontY: -26, legBackRot: -8, extraRot: -12 });

const K_FEET: Pt = [430, 680];

/** A tine or a beam of antler: a branch that tapers, barked like a tree, with frost along its top. */
function tine(d: Doc, name: string, a: Pt, b: Pt, w: number): void {
  d.ink(name, limb(a, b, w, w * 0.22), WOOD, {
    dark: limbDark(a, b, w, w, name, 0.5), mid: 2, line: 2.2, heavy: 3,
    inner: (c) => c.flat(`${name}-frost`, limb(between(a, b, 0.2), between(a, b, 0.9), w * 0.5, w * 0.12).translate(w * 0.22, -w * 0.22), SNOW.lit),
  });
}

/**
 * The Antlered King. What a starving winter makes of a great stag, and what it has taken hangs on him: his
 * antlers have grown into a dead tree, with frost on every branch, and in that tree hang a lost hunter's
 * lamp still alight, a bell, a snared crow, a rag of the lodge's red. He is all shoulder and no belly, pale as
 * old snow, his ribs showing, an iron crown grown into his brow. The spears still in his shoulder are where
 * he can be hurt.
 */
const king: UnitArt = {
  id: 'king',
  canvas: [860, 720],
  feet: K_FEET,
  margin: 190,
  moves: { charge: K_CHARGE, gore: K_GORE, stomp: K_STOMP, bellow: K_BELLOW },
  stills: { gather: K_GATHER, daze: K_DAZE, stagger: K_STAGGER, hit: HIT, fall: FALL },
  muzzle: [760, 470],
  top: 20,
  parts: [
    part('shadow', 'shadow', 'root', K_FEET, (d) => blot(d, [440, 682], 520, 34)),
    part('tail', 'extra', 'body', [236, 440], (d) => {
      d.ink('tail', poly([[240, 430], [252, 446], [226, 480], [200, 530], [206, 476]]), BONE, { dark: 0.5, mid: 3, cold: 2.4 });
    }, 1),
    part('hind-far', 'legBack', 'root', [300, 470], (d) => {
      d.ink('thigh', limb([300, 460], [336, 540], 60, 34, 4), BONE, { dark: limbDark([300, 460], [336, 540], 60, 40, 'k-hf-t', 0.7) });
      d.ink('shank', limb([336, 534], [296, 606], 30, 20), BONE, { dark: limbDark([336, 534], [296, 606], 30, 22, 'k-hf-s', 0.7), mid: 3 });
      d.ink('cannon', limb([296, 600], [312, 668], 20, 16), BONE, { dark: limbDark([296, 600], [312, 668], 20, 17, 'k-hf-c', 0.7), mid: 3 });
      d.black('hoof', poly([[298, 664], [326, 662], [334, 680], [296, 680]]));
    }),
    part('fore-far', 'legFront', 'root', [500, 450], (d) => {
      d.ink('arm', limb([500, 440], [486, 566], 58, 36, 4), BONE, { dark: limbDark([500, 440], [486, 566], 58, 40, 'k-ff-a', 0.7) });
      d.ink('cannon', limb([486, 560], [498, 664], 30, 22), BONE, { dark: limbDark([486, 560], [498, 664], 30, 24, 'k-ff-c', 0.7), mid: 3 });
      d.black('hoof', poly([[482, 660], [516, 658], [526, 680], [480, 680]]));
    }),
    part('body', 'body', 'root', [400, 470], (d) => {
      // All shoulder: a hump over the forelegs higher than his head, and a loin a man could put his arms round.
      d.ink('trunk', poly([
        [240, 430], [300, 396], [380, 350], [450, 270], [520, 236], [580, 262], [612, 330], [618, 430], [590, 520], [540, 552], [460, 530], [380, 500], [310, 512], [262, 496],
      ]), BONE, {
        dark: poly([[200, 380], [330, 384], ...cut([340, 400], [600, 560], 'k-trunk', 1, 20), [600, 600], [200, 600]]),
        mid: 14,
        cold: 4,
        open: [[[582, 264], [610, 326]]],
        inner: (c) => {
          // Starved: every rib shows, and the hollow behind them.
          c.black('hollow', poly([[330, 470], [400, 452], [460, 474], [440, 520], [360, 506]]));
          c.strokes('ribs', [[[420, 392], [398, 470]], [[446, 380], [428, 474]], [[472, 372], [458, 484]], [[498, 368], [488, 494]], [[524, 368], [518, 506]]], 9);
          c.detail('rib-planes', [[[432, 388], [414, 462]], [[458, 378], [444, 470]], [[484, 372], [474, 480]], [[510, 370], [504, 490]]], BONE, 5);
          // The spine along his back, and the planes of the shoulder.
          c.detail('spine', stitches([300, 404], [450, 284], 9, 12, 0.3), BONE, 3);
          c.detail('shoulder', [[[540, 270], [560, 360]], [[572, 300], [596, 420]], [[560, 420], [540, 520]]], BONE, 6);
          // Old scars, and mange where the hide has gone.
          c.strokes('scars', [[[360, 420], [392, 432]], [[366, 432], [396, 446]], [[556, 448], [588, 470]]], 3);
          c.flat('mange', poly([[330, 400], [372, 386], [384, 420], [346, 436]]), PALLOR.mid, 0.7);
          // Snow lying on him where he is flat enough to hold it.
          c.flat('snow', poly([[452, 268], [520, 236], [580, 262], [590, 288], [540, 264], [500, 268], [470, 290]]), SNOW.lit);
        },
      });
      // What is left of a winter coat, shedding off the hump in strips.
      d.ink('ruff', poly([[470, 262], [520, 240], [584, 270], [606, 330], [596, 380], [580, 352], [566, 396], [548, 356], [530, 404], [516, 352], [498, 388], [486, 330]]), SOOT, {
        dark: poly([[440, 220], [500, 220], ...cut([506, 244], [520, 410], 'k-ruff', -1, 10), [440, 420]]), mid: 6, cold: 3,
        inner: (c) => {
          c.detail('ruff-hair', [[[530, 262], [540, 340]], [[556, 266], [566, 340]], [[580, 286], [588, 340]]], SOOT, 4);
          c.flat('ruff-snow', poly([[496, 250], [524, 240], [570, 262], [540, 258], [510, 264]]), SNOW.lit);
        },
      });
    }),
    part('spears', 'extra', 'body', [520, 330], (d) => {
      // The spears of those who came before, broken off in his shoulder, and the wound that has never closed.
      d.ink('wound', poly([[496, 318], [530, 306], [552, 326], [546, 356], [514, 364], [494, 344]]), GORE, { dark: false, line: 2, heavy: 3, inner: (c) => c.flat('wound-deep', poly([[508, 326], [532, 320], [540, 340], [518, 350]]), GORE.mid) });
      d.ink('shaft-a', limb([516, 332], [470, 204], 9, 8), WOOD, { dark: limbDark([516, 332], [470, 204], 9, 9, 'k-sp-a', 0.4), mid: 0, line: 1.8, heavy: 2.4 });
      d.ink('shaft-b', limb([532, 338], [520, 190], 9, 8), WOOD, { dark: limbDark([532, 338], [520, 190], 9, 9, 'k-sp-b', 0.4), mid: 0, line: 1.8, heavy: 2.4 });
      d.black('break-a', poly([[462, 206], [478, 200], [470, 190], [466, 198]]));
      d.ink('rag', poly([[520, 200], [508, 214], [488, 250], [500, 244], [498, 268], [512, 240], [522, 222]]), BLOOD, { dark: 0.45, mid: 2, line: 1.6, heavy: 2.2 });
    }, 0.1),
    part('strips', 'extra', 'body', [420, 500], (d) => {
      // Hide hanging off his belly in strips, frozen stiff.
      d.ink('strips', poly([[380, 498], [460, 526], [540, 548], [536, 574], [520, 610], [512, 572], [492, 600], [484, 560], [460, 592], [452, 546], [428, 576], [420, 530], [398, 552]]), SOOT, { dark: 0.4, mid: 4, inner: (c) => c.flat('ice', poly([[500, 580], [514, 584], [508, 606]]), SNOW.lit) });
    }, 0.7),
    part('hind-near', 'legBack', 'root', [280, 470], (d) => {
      d.ink('thigh', limb([280, 456], [322, 544], 70, 38, 5), BONE, {
        dark: limbDark([280, 456], [322, 544], 70, 44, 'k-hn-t', 0.42), cold: 3,
        inner: (c) => c.detail('thigh-planes', [[[300, 470], [326, 530]]], BONE, 5),
      });
      d.ink('shank', limb([322, 538], [276, 612], 32, 22), BONE, { dark: limbDark([322, 538], [276, 612], 32, 24, 'k-hn-s', 0.42), mid: 3 });
      d.ink('cannon', limb([276, 606], [296, 668], 22, 17), BONE, { dark: limbDark([276, 606], [296, 668], 22, 18, 'k-hn-c', 0.42), mid: 3, inner: (c) => c.detail('tendon', [[[280, 612], [296, 660]]], BONE, 3) });
      d.black('hoof', poly([[280, 664], [312, 662], [322, 680], [278, 680]]));
      d.flat('hoof-snow', poly([[274, 676], [326, 676], [330, 682], [270, 682]]), SNOW.mid);
    }),
    part('fore-near', 'legFront', 'root', [556, 460], (d) => {
      d.ink('arm', limb([556, 446], [566, 572], 68, 40, 5), BONE, {
        dark: limbDark([556, 446], [566, 572], 68, 46, 'k-fn-a', 0.4),
        inner: (c) => c.detail('arm-planes', [[[566, 460], [576, 550]], [[548, 480], [552, 540]]], BONE, 5),
      });
      d.ink('knee', poly([[546, 560], [588, 556], [592, 590], [550, 594]]), BONE, { dark: 0.4, mid: 4 });
      d.ink('cannon', limb([568, 586], [560, 664], 34, 26), BONE, { dark: limbDark([568, 586], [560, 664], 34, 28, 'k-fn-c', 0.4), mid: 3, inner: (c) => c.detail('tendon', [[[572, 596], [566, 656]]], BONE, 3) });
      d.black('hoof', poly([[540, 658], [582, 656], [596, 680], [538, 680]]));
      d.strokes('cleft', [[[566, 660], [570, 680]]], 4, BONE.mid);
      d.flat('hoof-snow', poly([[532, 676], [600, 676], [604, 682], [528, 682]]), SNOW.mid);
    }),
    part('head', 'head', 'body', [604, 350], (d) => {
      // A long heavy head, carried low. Under the brow there is nothing to see.
      d.ink('neck', poly([[580, 290], [640, 300], [660, 380], [620, 440], [584, 420]]), BONE, { dark: 0.36, mid: 6, inner: (c) => c.detail('neck-cords', [[[600, 310], [612, 420]], [[624, 320], [632, 410]]], BONE, 5) });
      d.ink('skull', poly([[610, 300], [668, 296], [704, 338], [740, 420], [752, 470], [730, 496], [700, 490], [668, 456], [632, 440], [610, 396]]), BONE, {
        dark: poly([[590, 280], [650, 280], ...cut([650, 300], [690, 500], 'k-skull', -1, 8), [590, 500]]),
        mid: 6,
        inner: (c) => {
          // The socket: black from the brow back, as on everything in this style.
          c.black('socket', poly([[664, 318], [706, 342], [716, 372], [692, 384], [668, 366], [654, 340]]));
          c.flat('cheek-plane', poly([[690, 392], [724, 410], [736, 452], [706, 470], [680, 440]]), BONE.mid);
          c.strokes('muzzle-lines', [[[736, 430], [716, 436]], [[746, 462], [724, 470]]], 3.4);
          c.detail('face-cracks', [[[700, 400], [712, 430]], [[676, 420], [684, 446]]], BONE, 3);
        },
      });
      d.black('nostril', poly([[738, 470], [750, 466], [750, 478], [740, 482]]));
      // His breath, in the cold.
      d.flat('breath', poly([[754, 470], [786, 452], [808, 462], [822, 446], [830, 466], [806, 484], [780, 480]]), SNOW.lit, 0.35);
      // A beard of hair and ice under his jaw.
      d.ink('beard', poly([[664, 456], [700, 490], [730, 496], [722, 520], [712, 560], [704, 524], [694, 566], [686, 520], [674, 548], [668, 500]]), SOOT, { dark: 0.4, mid: 4, inner: (c) => c.flat('beard-ice', poly([[706, 536], [714, 532], [712, 560]]), SNOW.lit) });
      // The crown: iron, grown into his brow, rusted, its points bent.
      d.ink('crown', poly([[604, 302], [610, 270], [624, 286], [632, 258], [646, 284], [660, 256], [668, 284], [684, 270], [682, 304], [644, 312]]), LEAD, {
        dark: 0.36, mid: 4, rim: 2,
        inner: (c) => {
          c.flat('crown-rust', poly([[604, 296], [640, 304], [684, 296], [684, 312], [604, 312]]), RUST.mid);
          c.detail('crown-pits', [[[618, 282], [622, 296]], [[652, 276], [656, 294]]], LEAD, 3);
        },
      });
      d.ink('ear', poly([[600, 318], [572, 300], [556, 318], [586, 340]]), BONE, { dark: 0.5, mid: 3, cold: 2 });
    }),
    part('antlers', 'weapon', 'head', [644, 290], (d) => {
      // The far beam first, then the near: a dead tree's worth, frosted, spread wide enough to fill a lane.
      tine(d, 'far-beam', [628, 284], [596, 150], 36);
      tine(d, 'far-beam-2', [598, 158], [640, 40], 28);
      tine(d, 'far-t1', [606, 190], [540, 120], 20);
      tine(d, 'far-t2', [612, 110], [566, 30], 17);
      tine(d, 'far-t3', [628, 70], [680, -10], 14);
      tine(d, 'near-beam', [656, 286], [722, 170], 42);
      tine(d, 'near-beam-2', [718, 178], [800, 60], 34);
      tine(d, 'near-t1', [686, 232], [640, 130], 20);
      tine(d, 'near-t2', [712, 190], [780, 180], 22);
      tine(d, 'near-t3', [740, 146], [716, 40], 20);
      tine(d, 'near-t4', [768, 104], [846, 96], 20);
      tine(d, 'near-t5', [790, 74], [800, -24], 17);
      tine(d, 'brow', [664, 280], [760, 300], 22);
      tine(d, 'brow-2', [742, 296], [800, 250], 14);
    }),
    part('lamp', 'extra', 'weapon', [782, 182], (d) => lantern(d, 'lamp', [782, 182], 2.2), 0.7, true),
    part('bell', 'extra', 'weapon', [642, 132], (d) => {
      chain(d, 'bell-chain', [642, 132], [642, 164], 7);
      d.ink('bell', poly([[630, 164], [654, 164], [660, 190], [668, 206], [616, 206], [624, 190]]), LEAD, { dark: 0.4, mid: 3, rim: 1.6, inner: (c) => c.flat('bell-rust', poly([[640, 190], [662, 194], [668, 208], [640, 208]]), RUST.mid) });
      d.black('clapper', poly([[638, 206], [646, 206], [645, 216], [639, 216]]));
    }, 0.9, true),
    part('crow', 'extra', 'weapon', [844, 100], (d) => {
      // A crow, caught in a snare and frozen there, head down.
      d.pen('snare', poly([[844, 100], [842, 126]], false), 2);
      d.black('crow', poly([[838, 126], [848, 126], [856, 150], [866, 176], [850, 168], [846, 190], [838, 170], [826, 180], [834, 150]]));
      d.flat('crow-frost', poly([[840, 130], [846, 130], [850, 148], [842, 146]]), SNOW.mid);
    }, 1, true),
    part('pennon', 'extra', 'weapon', [566, 36], (d) => {
      d.ink('pennon', poly([[566, 34], [574, 40], [560, 70], [544, 110], [548, 80], [536, 96], [546, 60]]), BLOOD, { dark: 0.45, mid: 2, line: 1.6, heavy: 2.2 });
    }, 1.2, true),
  ],
};

/**
 * One of the herd: the dead of the winter wood, that run the field in lanes when he calls. A hart with nothing
 * left on it but hide and frost, its head down, running.
 */
const herdbeast: UnitArt = {
  id: 'herdbeast',
  canvas: PERSON,
  feet: PERSON_FEET,
  margin: PERSON_MARGIN,
  moves: { run: { windup: pose({ legFrontRot: 30, legBackRot: -30, rootY: 3, bodyRot: -3 }), strike: pose({ legFrontRot: -36, legBackRot: 34, rootY: -6, bodyRot: 4, extraRot: -20 }) } },
  stills: { hit: HIT, fall: FALL },
  muzzle: [214, 150],
  top: 96,
  parts: [
    part('shadow', 'shadow', 'root', [128, 240], (d) => blot(d, [128, 240], 130, 10)),
    part('hind', 'legBack', 'root', [84, 170], (d) => {
      d.ink('thigh', limb([86, 166], [96, 198], 20, 11, 1), BONE, { dark: limbDark([86, 166], [96, 198], 20, 13, 'hb-ht', 0.5), mid: 2 });
      d.ink('shank', limb([96, 196], [80, 218], 10, 7), BONE, { dark: 0.5, mid: 0, line: 2, heavy: 2.6 });
      d.ink('cannon', limb([80, 216], [88, 238], 7, 6), BONE, { dark: 0.5, mid: 0, line: 2, heavy: 2.6 });
      d.black('hoof', poly([[84, 234], [94, 234], [96, 240], [82, 240]]));
    }),
    part('body', 'body', 'root', [124, 168], (d) => {
      d.ink('trunk', poly([[72, 160], [100, 150], [150, 146], [176, 154], [180, 176], [160, 190], [120, 180], [90, 184]]), BONE, {
        dark: poly([[60, 172], ...cut([70, 174], [186, 186], 'hb-trunk', 1, 4), [186, 200], [60, 200]]), cold: 2,
        inner: (c) => {
          c.strokes('ribs', [[[128, 152], [124, 178]], [[140, 152], [138, 182]], [[152, 152], [152, 184]]], 3);
          c.black('hollow', poly([[94, 172], [116, 166], [120, 182], [98, 184]]));
          c.flat('frost', poly([[100, 150], [150, 146], [170, 152], [140, 152], [104, 156]]), SNOW.lit);
        },
      });
      d.ink('tail', poly([[72, 158], [78, 166], [62, 178]]), BONE, { dark: 0.5, mid: 0, line: 1.8, heavy: 2.4 });
    }),
    part('fore', 'legFront', 'root', [164, 176], (d) => {
      d.ink('arm', limb([164, 172], [170, 210], 14, 8, 1), BONE, { dark: limbDark([164, 172], [170, 210], 14, 9, 'hb-fa', 0.4), mid: 2 });
      d.ink('cannon', limb([170, 208], [166, 238], 7, 6), BONE, { dark: 0.4, mid: 0, line: 2, heavy: 2.6 });
      d.black('hoof', poly([[162, 234], [172, 234], [174, 240], [160, 240]]));
    }),
    part('head', 'head', 'body', [176, 156], (d) => {
      d.ink('neck', poly([[166, 148], [184, 144], [196, 152], [184, 170], [170, 168]]), BONE, { dark: 0.4, mid: 2 });
      d.ink('skull', poly([[184, 138], [200, 138], [214, 152], [220, 164], [208, 170], [194, 160], [184, 154]]), BONE, {
        dark: false, line: 2.2, heavy: 3,
        inner: (c) => c.black('socket', poly([[190, 142], [202, 146], [204, 154], [194, 154]])),
      });
      d.ink('antler-a', limb([190, 140], [176, 108], 6, 2), WOOD, { dark: 0.5, mid: 0, line: 1.8, heavy: 2.4 });
      d.ink('antler-b', limb([196, 138], [204, 102], 6, 2), WOOD, { dark: 0.3, mid: 0, line: 1.8, heavy: 2.4 });
      d.ink('antler-c', limb([200, 122], [216, 114], 4, 1.5), WOOD, { dark: false, line: 1.6, heavy: 2 });
    }),
  ],
};

export const MONSTERS: UnitArt[] = [sexton, risen, king, herdbeast];
