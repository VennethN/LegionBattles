// The named heroes of Legion Holdout. Each is drawn for themselves: a build
// and a stance of their own (kit/stance.ts), a head nobody else has, their
// own weapon big in the hand, cloth that moves, and one color beside their
// side's. They are told from each other as black shapes before anything
// else: look at them that way after changing one.

import { ARCANE, BONE, BRONZE, CLOTH, DARK_CLOTH, FIRE, FROST, GOLD, IRON, LEATHER, LINEN, PINE, STEEL, type Material } from '../kit/palette';
import { FEET, NECK, arm, belt, bulkTorsoPath, cape, hem, hood, lacing, leg, mantle, nockedArrow, patch, pauldron, quiver, robePath, shadow, skirt, stripe, torsoPath } from '../kit/parts';
import { capsule, line, poly, roundRect, smooth, type Pt } from '../kit/path';
import { crook, longbow } from '../kit/arms';
import { breastplate, ropeBelt, sash } from '../kit/gear';
import { STRAW } from '../kit/heads';
import {
  capTassel, dawnHelm, firewood, flatCap, gateHelm, gateShield, gatekeeper, gravecleaver, headstone, hearthbrand, horseTail, iceCrown, kerchief,
  luckyKnife, monkHood, morningstarHammer, ninthLance, oathRibbons, openBook, passingBell, ropeEnds, runCape, scarfTails, scrollPack, shroudHelm,
  squareCap, tailFeather, tailedSallet, twoCoins, unfinishedStaff, veilTrain, widowsTear, windCloak,
} from '../kit/heroes';
import { bodyOf, headOf, legOf, posed, turned, type Build } from '../kit/stance';
import type { PartSpec, UnitArt } from '../kit/unit';
import { part } from './common';
import { note } from './notes';

/** A hero's two legs, each with its hip moved along and swung: a planted stance, a stride. */
function stand(b: Build, mat: Material, back: readonly [number, number], front: readonly [number, number]): PartSpec[] {
  const tb = legOf(b, 85, back[0], back[1]);
  const tf = legOf(b, 104, front[0], front[1]);
  return [
    part('leg-back', 'legBack', 'root', turned(tb, [85 + back[0], 152]), (d) => posed(d, tb, (c) => leg(c, 85, mat, true))),
    part('leg-front', 'legFront', 'root', turned(tf, [104 + front[0], 152]), (d) => posed(d, tf, (c) => leg(c, 104, mat))),
  ];
}

const ground = (rx: number): PartSpec => part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, rx));

// ---------------------------------------------------------------- Bram Oakenhold, the Gatewarden

const BRAM: Build = { size: 1.08, lean: 2 };

note('bram', 'Heroes', 'melee', 'a helm with battlements like a gate tower, the door of the gate as a shield, a broad sword laid over it');
export const bram: UnitArt = (() => {
  const body = bodyOf(BRAM);
  const head = headOf(BRAM);
  const hand: Pt = [146, 93];
  return {
    id: 'bram',
    style: 'slash',
    muzzle: [160, 80],
    top: 30,
    parts: [
      ground(42),
      part('cape', 'extra', 'body', turned(body, [96, 106]), (d, team) => posed(d, body, (c) => cape(c, CLOTH[team])), 1.2),
      ...stand(BRAM, IRON, [-7, 8], [5, -5]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('tabard', torsoPath(), CLOTH[team], { inner: (i) => { stripe(i); belt(i, { mat: LEATHER, buckle: IRON }); } });
        });
        arm(d, 'arm', turned(body, [117, 115]), [hand[0] - 2, hand[1] + 2], IRON, 16);
        posed(d, body, (c) => pauldron(c, 117, 112, IRON, 13));
      }),
      part('head', 'head', 'body', turned(head, NECK), (d) => posed(d, head, (c) => gateHelm(c))),
      part('shield', 'offhand', 'body', [131, 140], (d) => gateShield(d, 131, 96, 179, 26)),
      part('sword', 'weapon', 'body', hand, (d) => gatekeeper(d, { hand, angle: 26 }, 76, IRON)),
    ],
  };
})();

// ---------------------------------------------------------------- Wren Fallowmere, the Quiet Arrow

const WREN: Build = { size: 0.97, lean: -4, nod: 5, headX: 1 };

note('wren', 'Heroes', 'ranged', 'a hood with one long barred feather, a moss cloak blown out behind, a bow taller than she is');
export const wren: UnitArt = (() => {
  const body = bodyOf(WREN);
  const head = headOf(WREN);
  const hand: Pt = [147, 121];
  const pull: Pt = [121, 121];
  return {
    id: 'wren',
    style: 'bow',
    muzzle: [166, 121],
    top: 12,
    parts: [
      ground(34),
      part('cloak', 'extra', 'body', turned(body, [96, 106]), (d) => posed(d, (p) => body(p.rotate(13, 98, 104)), (c) => windCloak(c, PINE)), 2.2),
      part('quiver', 'extra', 'body', turned(body, [74, 150]), (d) => posed(d, body, (c) => quiver(c)), 0.5),
      ...stand(WREN, LEATHER, [-6, 9], [7, -13]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('tunic', torsoPath(), CLOTH[team], {
            inner: (i) => {
              lacing(i, 112, 108);
              i.line('strap', line(70, 100, 122, 150));
              belt(i, { y: 140, buckle: null });
            },
          });
          mantle(c, PINE, null);
        });
        arm(d, 'arm', turned(body, [116, 116]), [hand[0] - 3, hand[1]], CLOTH[team], 14);
        // A bracer on the arm the string slaps.
        d.piece('bracer', capsule(hand[0] - 15, hand[1] - 1, hand[0] - 7, hand[1], 15), LEATHER, { shade: 0 });
      }),
      part('feather', 'extra', 'head', turned(head, [100, 58]), (d) => posed(d, head, (c) => tailFeather(c, [100, 58], BONE, 50)), 1.6),
      part('head', 'head', 'body', turned(head, NECK), (d, team) => posed(d, head, (c) => hood(c, CLOTH[team], 4))),
      part('bow', 'weapon', 'body', hand, (d) => longbow(d, { hand, angle: 5 })),
      part('draw-hand', 'offhand', 'body', pull, (d) => nockedArrow(d, pull[0], pull[1], 60)),
    ],
  };
})();


// ---------------------------------------------------------------- Orrin Quillon, the Unfinished

const ORRIN: Build = { size: 1, lean: 6, nod: -2, headX: 1 };

note('orrin', 'Heroes', 'caster', 'a square student\'s cap with a tassel, scrolls on his back, an open book, a staff whose ring was never finished');
export const orrin: UnitArt = (() => {
  const body = bodyOf(ORRIN);
  const head = headOf(ORRIN);
  const hand: Pt = [141, 134];
  return {
    id: 'orrin',
    style: 'cast',
    muzzle: [150, 34],
    top: 14,
    parts: [
      ground(38),
      part('scrolls', 'extra', 'body', turned(body, [66, 130]), (d) => posed(d, body, (c) => scrollPack(c)), 0.5),
      ...stand(ORRIN, LEATHER, [-3, 5], [4, -8]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('robe', robePath(), CLOTH[team], {
            inner: (i) => {
              hem(i, ARCANE);
              // A stole of black down the front, spotted with ink.
              i.piece('stole', roundRect(101, 96, 13, 60, 0), DARK_CLOTH, { shade: 0 });
              i.shadeOver('ink-a', smooth([[84, 132], [90, 128], [93, 134], [88, 139]]), 1.6);
              i.shadeOver('ink-b', smooth([[120, 146], [125, 144], [126, 150], [121, 151]]), 1.6);
            },
          });
        });
        arm(d, 'sleeve', turned(body, [116, 117]), [hand[0] - 2, hand[1] - 1], CLOTH[team], 17);
      }),
      part('tassel', 'extra', 'head', turned(head, [98, 54]), (d) => posed(d, head, (c) => capTassel(c, ARCANE)), 2),
      part('head', 'head', 'body', turned(head, NECK), (d, team) => posed(d, head, (c) => squareCap(c, DARK_CLOTH, CLOTH[team]))),
      part('book', 'offhand', 'body', [84, 134], (d) => openBook(d, 84, 132, ARCANE)),
      part('staff', 'weapon', 'body', hand, (d) => unfinishedStaff(d, { hand, angle: 9 }, ARCANE, 76)),
    ],
  };
})();

// ---------------------------------------------------------------- Fenn Two-Coins, the Lucky

const FENN: Build = { size: 0.9, lean: 9, nod: -5, headX: 1 };

note('fenn', 'Heroes', 'melee', 'a flat cap pulled low, a long scarf out behind, a yellow half cape, two coins at the belt, a broad knife in each hand');
export const fenn: UnitArt = (() => {
  const body = bodyOf(FENN);
  const head = headOf(FENN);
  const hand: Pt = [143, 128];
  const off: Pt = [70, 140];
  return {
    id: 'fenn',
    style: 'thrust',
    muzzle: [182, 122],
    top: 50,
    parts: [
      ground(34),
      ...stand(FENN, LEATHER, [-8, 20], [8, -18]),
      part('tails', 'offhand', 'body', off, (d) => luckyKnife(d, { hand: off, angle: -118 }, 40, IRON)),
      part('body', 'body', 'root', FEET, (d, team) => {
        arm(d, 'arm-far', turned(body, [78, 116]), [off[0] + 2, off[1] - 1], CLOTH[team], 13);
        posed(d, body, (c) => {
          // A jerkin the yellow of his coins: the one thing about him that is not quiet.
          c.piece('jerkin', torsoPath(), STRAW, {
            inner: (i) => {
              patch(i, 82, 114);
              belt(i, { y: 138 });
            },
          });
        });
        arm(d, 'arm', turned(body, [115, 117]), [hand[0] - 2, hand[1]], CLOTH[team], 14);
      }),
      part('coins', 'extra', 'body', turned(body, [112, 142]), (d) => { const [x, y] = turned(body, [112, 142]); twoCoins(d, x, y); }, 2.4),
      part('scarf', 'extra', 'head', turned(head, [76, 100]), (d, team) => posed(d, head, (c) => scarfTails(c, CLOTH[team])), 2.2),
      part('head', 'head', 'body', turned(head, NECK), (d, team) => posed(d, head, (c) => flatCap(c, DARK_CLOTH, CLOTH[team]))),
      part('heads', 'weapon', 'body', hand, (d) => luckyKnife(d, { hand, angle: 76 }, 46, GOLD)),
    ],
  };
})();

// ---------------------------------------------------------------- Old Nan Cinderwick, the Hearthwitch

const NAN: Build = { size: 0.9, lean: 21, nod: -14, headX: 9, headY: 9 };

note('nan', 'Heroes', 'caster', 'bent double under a bundle of firewood, a headscarf tied under the chin, a crooked staff held high with a fire in its basket');
export const nan: UnitArt = (() => {
  const body = bodyOf(NAN);
  const head = headOf(NAN);
  const hand: Pt = [142, 112];
  return {
    id: 'nan',
    style: 'cast',
    muzzle: [150, 30],
    top: 4,
    parts: [
      ground(38),
      part('firewood', 'extra', 'body', turned(body, [62, 112]), (d) => posed(d, body, (c) => firewood(c)), 0.6),
      ...stand(NAN, LEATHER, [-3, 4], [3, -5]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('dress', robePath(), CLOTH[team], {
            inner: (i) => {
              hem(i, FIRE);
              i.piece('apron', smooth([[92, 126, 'c'], [130, 126, 'c'], [136, 162], [116, 168], [96, 166]]), LINEN, { shade: 0, inner: (a) => patch(a, 108, 144, 12, 10) });
              i.piece('ties', roundRect(56, 124, 80, 6, 0), LINEN, { shade: 0 });
            },
          });
          mantle(c, DARK_CLOTH, null);
        });
        arm(d, 'sleeve', turned(body, [116, 116]), [hand[0] - 2, hand[1] + 2], DARK_CLOTH, 15);
      }),
      part('head', 'head', 'body', turned(head, NECK), (d, team) => posed(d, head, (c) => kerchief(c, CLOTH[team]))),
      part('staff', 'weapon', 'body', hand, (d) => hearthbrand(d, { hand, angle: 7 }, FIRE, 50)),
    ],
  };
})();

// ---------------------------------------------------------------- Isaura Vane, Captain of the Ninth

const ISAURA: Build = { size: 1.03, lean: 14, nod: -9, headX: 2 };

note('isaura', 'Heroes', 'melee', 'leaning into a run, a sallet with a long white tail of horsehair, a torn cape straight out behind, a couched lance with a steel guard and a torn white pennon');
export const isaura: UnitArt = (() => {
  const body = bodyOf(ISAURA);
  const head = headOf(ISAURA);
  const hand: Pt = [128, 138];
  return {
    id: 'isaura',
    style: 'thrust',
    muzzle: [228, 126],
    top: 34,
    parts: [
      ground(40),
      part('cape', 'extra', 'body', turned(body, [96, 104]), (d, team) => posed(d, body, (c) => runCape(c, CLOTH[team])), 2.4),
      ...stand(ISAURA, STEEL, [-9, 30], [9, -26]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('tabard', torsoPath(), CLOTH[team], {
            inner: (i) => {
              breastplate(i, STEEL);
              belt(i, { y: 140 });
            },
          });
        });
        arm(d, 'arm', turned(body, [116, 116]), [hand[0] - 1, hand[1] - 2], STEEL, 15);
        posed(d, body, (c) => pauldron(c, 116, 112, STEEL, 12));
      }),
      part('tail', 'extra', 'head', turned(head, [92, 54]), (d) => posed(d, head, (c) => horseTail(c, [92, 54], BONE, 66)), 2.6),
      part('head', 'head', 'body', turned(head, NECK), (d) => posed(d, head, (c) => tailedSallet(c))),
      part('lance', 'weapon', 'body', hand, (d) => ninthLance(d, { hand, angle: 83 }, 70)),
    ],
  };
})();

// ---------------------------------------------------------------- Hroth the Unburied

const HROTH: Build = { size: 1.16, wide: 1.06, lean: 10, nod: 3, headX: 7, headY: 9 };

note('hroth', 'Heroes', 'melee', 'huge and hunched, his own headstone roped to his back with a broken stake, a winding sheet and one horn, an axe with a blade like a spade');
export const hroth: UnitArt = (() => {
  const body = bodyOf(HROTH);
  const head = headOf(HROTH);
  const hand: Pt = [146, 150];
  return {
    id: 'hroth',
    style: 'chop',
    muzzle: [176, 96],
    top: 20,
    parts: [
      ground(48),
      part('headstone', 'extra', 'body', turned(body, [70, 130]), (d) => posed(d, body, (c) => headstone(c)), 0.4),
      ...stand(HROTH, LEATHER, [-8, 7], [6, -7]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('shroud', bulkTorsoPath(), LINEN, {
            inner: (i) => {
              sash(i, CLOTH[team]);
              i.line('rope-a', line(60, 122, 136, 112));
              i.line('rope-b', line(60, 132, 136, 124));
              skirt(i, CLOTH[team], 143);
              ropeBelt(i, 138);
            },
          });
          // The hem of his kilt, cut ragged below the body.
          c.piece('rag', poly([[70, 156], [124, 156], [120, 170], [112, 162], [104, 172], [96, 163], [88, 172], [80, 162], [72, 168]]), CLOTH[team], { shade: 3 });
        });
        arm(d, 'arm', turned(body, [118, 118]), [hand[0] - 2, hand[1] - 3], LINEN, 21);
      }),
      part('head', 'head', 'body', turned(head, NECK), (d) => posed(d, head, (c) => shroudHelm(c))),
      part('axe', 'weapon', 'body', hand, (d) => gravecleaver(d, { hand, angle: 20 }, 88)),
    ],
  };
})();

// ---------------------------------------------------------------- Brother Aldous Bell

const ALDOUS: Build = { size: 1.02, wide: 1.14, lean: -3 };

note('aldous', 'Heroes', 'support', 'a stout monk in a deep hood, a shepherd\'s crook, a great bronze bell hung from his fist');
export const aldous: UnitArt = (() => {
  const body = bodyOf(ALDOUS);
  const head = headOf(ALDOUS);
  const hand: Pt = [148, 104];
  const off: Pt = [70, 132];
  return {
    id: 'aldous',
    style: 'swing',
    muzzle: [150, 150],
    top: 30,
    parts: [
      ground(42),
      ...stand(ALDOUS, LEATHER, [-2, 2], [2, -2]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('habit', robePath(), LINEN, {
            inner: (i) => {
              hem(i, LEATHER);
              i.piece('scapular', roundRect(87, 96, 26, 82, 0), CLOTH[team], { shade: 0 });
              ropeBelt(i, 136);
            },
          });
        });
        arm(d, 'sleeve', turned(body, [116, 118]), [hand[0] - 3, hand[1] + 2], LINEN, 18);
      }),
      part('rope', 'extra', 'body', turned(body, [108, 138]), (d) => { const [x, y] = turned(body, [108, 140]); ropeEnds(d, x, y); }, 2),
      part('head', 'head', 'body', turned(head, NECK), (d, team) => posed(d, head, (c) => monkHood(c, CLOTH[team]))),
      part('crook', 'offhand', 'body', off, (d) => crook(d, { hand: off, angle: -4 }, 84)),
      part('bell', 'weapon', 'body', hand, (d) => passingBell(d, { hand, angle: 0 }, BRONZE)),
    ],
  };
})();

// ---------------------------------------------------------------- Ysolde Rimeheart, the Winter Widow

const YSOLDE: Build = { size: 1.07, wide: 0.9, lean: -3, nod: -3 };

note('ysolde', 'Heroes', 'caster', 'tall and narrow, a black veil over her whole head under a crown of ice spires, its train out behind, a wand held out with one great tear of ice');
export const ysolde: UnitArt = (() => {
  const body = bodyOf(YSOLDE);
  const head = headOf(YSOLDE);
  const hand: Pt = [150, 108];
  return {
    id: 'ysolde',
    style: 'cast',
    muzzle: [172, 60],
    top: -6,
    parts: [
      ground(34),
      part('train', 'extra', 'head', turned(head, [76, 66]), (d) => posed(d, head, (c) => veilTrain(c, DARK_CLOTH)), 2.4),
      ...stand(YSOLDE, DARK_CLOTH, [-2, 2], [2, -3]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('gown', robePath(), CLOTH[team], {
            inner: (i) => {
              hem(i, FROST);
              i.piece('bodice', smooth([[60, 96, 'c'], [132, 96, 'c'], [128, 124], [112, 138], [96, 142], [80, 138], [64, 124]]), DARK_CLOTH, { shade: 0 });
            },
          });
        });
        // A sleeve that hangs open from the wrist.
        const sh = turned(body, [114, 115]);
        d.piece('sleeve-fall', smooth([[hand[0] - 20, hand[1] + 4, 'c'], [hand[0] - 4, hand[1] + 6, 'c'], [hand[0] - 8, hand[1] + 26], [hand[0] - 14, hand[1] + 38, 'c'], [hand[0] - 24, hand[1] + 22]]), DARK_CLOTH, { shade: 3 });
        arm(d, 'sleeve', sh, [hand[0] - 3, hand[1] + 1], DARK_CLOTH, 14);
      }),
      part('head', 'head', 'body', turned(head, NECK), (d) => posed(d, head, (c) => iceCrown(c, DARK_CLOTH, FROST))),
      part('wand', 'weapon', 'body', hand, (d) => widowsTear(d, { hand, angle: 26 }, FROST, 34)),
    ],
  };
})();

// ---------------------------------------------------------------- Maren Dawnguard, the Oathkeeper

const MAREN: Build = { size: 1.08, lean: -2 };

note('maren', 'Heroes', 'captain', 'a helm with the sun\'s rays fanned over it, a long cape, her oaths hung sealed from the shoulder, a hammer for two hands with the sun on its head');
export const maren: UnitArt = (() => {
  const body = bodyOf(MAREN);
  const head = headOf(MAREN);
  const hand: Pt = [140, 142];
  return {
    id: 'maren',
    style: 'chop',
    muzzle: [166, 60],
    top: 8,
    parts: [
      ground(42),
      part('cape', 'extra', 'body', turned(body, [96, 106]), (d, team) => posed(d, body, (c) => cape(c, CLOTH[team])), 1.4),
      ...stand(MAREN, STEEL, [-5, 6], [5, -6]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('tabard', torsoPath(), CLOTH[team], {
            inner: (i) => {
              stripe(i);
              belt(i, { y: 142, mat: BONE });
            },
          });
        });
        arm(d, 'arm', turned(body, [117, 116]), [hand[0] - 2, hand[1] - 3], STEEL, 16);
        posed(d, body, (c) => pauldron(c, 117, 112, GOLD, 13));
      }),
      part('oaths', 'extra', 'body', turned(body, [112, 118]), (d) => { const [x, y] = turned(body, [110, 122]); oathRibbons(d, x, y); }, 2.2),
      part('head', 'head', 'body', turned(head, NECK), (d) => posed(d, head, (c) => dawnHelm(c))),
      part('hammer', 'weapon', 'body', hand, (d) => morningstarHammer(d, { hand, angle: 12 }, 92)),
    ],
  };
})();

export const HEROES_ART: readonly UnitArt[] = [bram, wren, orrin, fenn, nan, isaura, hroth, aldous, ysolde, maren];
