// The named heroes of Lastander. Each is drawn for themselves: a build
// and a stance of their own (kit/stance.ts), a head nobody else has, their
// own weapon big in the hand, cloth that moves, and one color beside their
// side's. They are told from each other as black shapes before anything
// else: look at them that way after changing one.
//
// Each has one idea, drawn big. They are shown about sixty pixels tall, and
// at that size a book, a vial, a seal or a purse is mud: the first drawing
// of them had all of those, and a second pair of eyes had them taken off.
// No two are the same height or width, and each strikes in a way of its own
// (poses.ts), in which the lead foot steps and the head stays on the enemy.

import { ARCANE, BONE, BRONZE, CLOTH, DARK_CLOTH, FIRE, FROST, GOLD, IRON, LEATHER, LINEN, PINE, STEEL, type Material } from '../kit/palette';
import { FEET, NECK, arm, belt, bulkTorsoPath, cape, hem, hood, lacing, leg, mantle, nockedArrow, pauldron, robePath, shadow, skirt, stripe, torsoPath } from '../kit/parts';
import { line, poly, roundRect, smooth, type Path, type Pt } from '../kit/path';
import { longbow } from '../kit/arms';
import { sash } from '../kit/gear';
import { STRAW } from '../kit/heads';
import {
  bellCrook, capTassel, coinToss, dawnHelm, firewood, flatCap, gateHelm, gateShield, gatekeeper, gravecleaver, headstone, hearthbrand, horseTail, iceCrown,
  kerchief, luckyKnife, monkHood, morningstarHammer, ninthLance, runCape, scarfTails, scrollPack, shroudHelm, squareCap, tailFeather, tailedSallet,
  unfinishedStaff, veilTrain, widowsTear, windCloak,
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

const BRAM: Build = { size: 1.04, wide: 1.14, lean: 2 };

note('bram', 'Heroes', 'melee', 'wide and planted, a helm with battlements like a gate tower, the door of the gate as a shield, a broad sword laid over it');
export const bram: UnitArt = (() => {
  const body = bodyOf(BRAM);
  const head = headOf(BRAM);
  const hand: Pt = [149, 93];
  return {
    id: 'bram',
    style: 'guard',
    muzzle: [164, 78],
    top: 34,
    parts: [
      ground(46),
      part('cape', 'extra', 'body', turned(body, [96, 106]), (d, team) => posed(d, body, (c) => cape(c, CLOTH[team])), 1.4),
      ...stand(BRAM, IRON, [-8, 8], [5, -5]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('tabard', torsoPath(), CLOTH[team], { inner: (i) => { stripe(i); belt(i, { mat: LEATHER, buckle: IRON }); } });
        });
        arm(d, 'arm', turned(body, [117, 115]), [hand[0] - 2, hand[1] + 2], IRON, 16);
        posed(d, body, (c) => pauldron(c, 117, 112, IRON, 13));
      }),
      part('head', 'head', 'body', turned(head, NECK), (d) => posed(d, head, (c) => gateHelm(c))),
      part('shield', 'offhand', 'body', [134, 140], (d) => gateShield(d, 134, 96, 179, 27)),
      part('sword', 'weapon', 'body', hand, (d) => gatekeeper(d, { hand, angle: 26 }, 76, IRON)),
    ],
  };
})();

// ---------------------------------------------------------------- Wren Fallowmere, the Quiet Arrow

const WREN: Build = { size: 0.94, lean: -3, nod: 4, headX: 1 };

note('wren', 'Heroes', 'ranged', 'slight, a moss green hood with one long barred feather, a great cloak blown out behind, a bow taller than she is carried low with the arrow on the string');
export const wren: UnitArt = (() => {
  const body = bodyOf(WREN);
  const head = headOf(WREN);
  // The bow is carried low, pointed at the ground ahead of her, and comes up to shoot (the longshot poses).
  const hand: Pt = [140, 140];
  const pull: Pt = [121, 129];
  return {
    id: 'wren',
    style: 'longshot',
    muzzle: [168, 122],
    top: 14,
    parts: [
      ground(34),
      part('cloak', 'extra', 'body', turned(body, [96, 104]), (d, team) => posed(d, (p) => body(p.scale(1.5, 1.5, 106, 102).rotate(8, 100, 104)), (c) => windCloak(c, CLOTH[team])), 2.4),
      ...stand(WREN, LEATHER, [-6, 9], [7, -13]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('tunic', torsoPath(), CLOTH[team], {
            inner: (i) => {
              lacing(i, 112, 108);
              belt(i, { y: 140, buckle: null });
            },
          });
        });
        arm(d, 'arm', turned(body, [116, 117]), [hand[0] - 3, hand[1] - 2], CLOTH[team], 14);
      }),
      part('feather', 'extra', 'head', turned(head, [100, 58]), (d) => posed(d, head, (c) => tailFeather(c, [100, 58], BONE, 56)), 1.8),
      part('head', 'head', 'body', turned(head, NECK), (d) => posed(d, head, (c) => hood(c, PINE, 4))),
      part('bow', 'weapon', 'body', hand, (d) => longbow(d, { hand, angle: 30 })),
      part('draw-hand', 'offhand', 'body', pull, (d) => posed(d, (p) => p.rotate(30, pull[0], pull[1]), (c) => nockedArrow(c, pull[0], pull[1], 62))),
    ],
  };
})();

// ---------------------------------------------------------------- Orrin Quillon, the Unfinished

const ORRIN: Build = { size: 0.99, wide: 0.92, lean: 5, nod: -2, headX: 1 };

note('orrin', 'Heroes', 'caster', 'lanky, a square student\'s cap with a tassel, scrolls on his back, a staff whose head is half carved with its stone lashed on crooked');
export const orrin: UnitArt = (() => {
  const body = bodyOf(ORRIN);
  const head = headOf(ORRIN);
  const hand: Pt = [140, 136];
  return {
    id: 'orrin',
    style: 'invoke',
    muzzle: [166, 30],
    top: 4,
    parts: [
      ground(36),
      part('scrolls', 'extra', 'body', turned(body, [66, 130]), (d) => posed(d, body, (c) => scrollPack(c)), 0.6),
      ...stand(ORRIN, LEATHER, [-3, 5], [4, -8]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('robe', robePath(), CLOTH[team], {
            inner: (i) => {
              hem(i, DARK_CLOTH);
              // A stole of black down the front: the one thing he kept of the college.
              i.piece('stole', roundRect(100, 96, 15, 62, 0), DARK_CLOTH, { shade: 0 });
            },
          });
        });
        arm(d, 'sleeve', turned(body, [116, 117]), [hand[0] - 2, hand[1] - 1], CLOTH[team], 17);
      }),
      part('tassel', 'extra', 'head', turned(head, [98, 54]), (d) => posed(d, head, (c) => capTassel(c, STRAW)), 2.2),
      part('head', 'head', 'body', turned(head, NECK), (d, team) => posed(d, head, (c) => squareCap(c, DARK_CLOTH, CLOTH[team]))),
      part('staff', 'weapon', 'body', hand, (d) => unfinishedStaff(d, { hand, angle: 9 }, ARCANE, 76)),
    ],
  };
})();

// ---------------------------------------------------------------- Fenn Two-Coins, the Lucky

const FENN: Build = { size: 0.8, lean: 13, nod: -9, headX: 1 };

note('fenn', 'Heroes', 'melee', 'small and low, a flat cap, a long scarf out behind, a broad knife thrust forward, and a coin turning in the air over his other hand');
export const fenn: UnitArt = (() => {
  const body = bodyOf(FENN);
  const head = headOf(FENN);
  const hand: Pt = [142, 136];
  const off: Pt = [50, 116];
  return {
    id: 'fenn',
    style: 'lunge',
    muzzle: [186, 128],
    top: 60,
    parts: [
      ground(36),
      ...stand(FENN, LEATHER, [-11, 26], [10, -22]),
      part('coin', 'offhand', 'body', off, (d, team) => {
        arm(d, 'arm-far', turned(body, [78, 117]), [off[0] + 3, off[1] + 2], CLOTH[team], 13);
        coinToss(d, off[0], off[1]);
      }),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('tunic', torsoPath(), CLOTH[team], { inner: (i) => belt(i, { y: 138 }) });
        });
        arm(d, 'arm', turned(body, [115, 117]), [hand[0] - 2, hand[1]], CLOTH[team], 14);
      }),
      part('scarf', 'extra', 'head', turned(head, [76, 100]), (d, team) => posed(d, (p) => head(p.scale(1.25, 1.25, 78, 102)), (c) => scarfTails(c, CLOTH[team])), 2.4),
      part('head', 'head', 'body', turned(head, NECK), (d, team) => posed(d, head, (c) => flatCap(c, DARK_CLOTH, CLOTH[team]))),
      part('heads', 'weapon', 'body', hand, (d) => luckyKnife(d, { hand, angle: 78 }, 52, GOLD)),
    ],
  };
})();

// ---------------------------------------------------------------- Old Nan Cinderwick, the Hearthwitch

const NAN: Build = { size: 0.86, lean: 21, nod: 8, headX: 12, headY: 14 };

note('nan', 'Heroes', 'caster', 'old and stooped, bent forward over a stick held in both hands with a fire in the basket at its head, a load of firewood high on her back');
export const nan: UnitArt = (() => {
  const body = bodyOf(NAN);
  const head = headOf(NAN);
  // The stick stands in front of her, clear of the hood's opening: across it, it was a bar over the one dark place she has.
  const front = turned(head, [131, 90]);
  const hand: Pt = [Math.round(front[0] + 15), 122];
  const wood = (p: Path): Path => body(p.translate(6, -10));
  return {
    id: 'nan',
    style: 'invoke',
    muzzle: [hand[0] + 6, 30],
    top: 10,
    parts: [
      ground(42),
      part('firewood', 'extra', 'body', turned(wood, [62, 112]), (d) => posed(d, wood, (c) => firewood(c)), 0.6),
      ...stand(NAN, LEATHER, [-3, 4], [5, -6]),
      part('body', 'body', 'root', FEET, (d, team) => {
        arm(d, 'sleeve-far', turned(body, [110, 122]), [hand[0] - 3, hand[1] + 19], CLOTH[team], 14);
        posed(d, body, (c) => {
          c.piece('dress', robePath(), CLOTH[team], { inner: (i) => hem(i, FIRE) });
          // A shawl over her shoulders, crossed in front.
          mantle(c, DARK_CLOTH, null);
        });
        arm(d, 'sleeve', turned(body, [118, 116]), [hand[0] - 3, hand[1] + 2], CLOTH[team], 15);
      }),
      part('head', 'head', 'body', turned(head, NECK), (d, team) => posed(d, head, (c) => kerchief(c, CLOTH[team]))),
      part('staff', 'weapon', 'body', hand, (d) => hearthbrand(d, { hand, angle: 3 }, FIRE, 54)),
    ],
  };
})();

// ---------------------------------------------------------------- Isaura Vane, Captain of the Ninth

const ISAURA: Build = { size: 1.03, lean: 14, nod: -9, headX: 2 };

note('isaura', 'Heroes', 'melee', 'leaning into a run, a sallet with a long white tail of horsehair, a torn cape straight out behind, a couched lance longer than anyone\'s with its pennon in ribbons');
export const isaura: UnitArt = (() => {
  const body = bodyOf(ISAURA);
  const head = headOf(ISAURA);
  const hand: Pt = [116, 141];
  return {
    id: 'isaura',
    style: 'lunge',
    muzzle: [226, 128],
    top: 34,
    parts: [
      ground(42),
      part('cape', 'extra', 'body', turned(body, [96, 104]), (d, team) => posed(d, (p) => body(p.scale(1.2, 1.2, 104, 102)), (c) => runCape(c, CLOTH[team])), 2.6),
      ...stand(ISAURA, STEEL, [-9, 30], [9, -26]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          // A surcoat in her side's color over the steel, and its skirt cut ragged by the road.
          c.piece('skirt', poly([[66, 150], [126, 150], [124, 172], [114, 164], [106, 174], [96, 165], [86, 174], [78, 164], [68, 170]]), CLOTH[team], { shade: 3 });
          c.piece('surcoat', torsoPath(), CLOTH[team], { inner: (i) => { stripe(i); belt(i, { y: 140 }); } });
        });
        arm(d, 'arm', turned(body, [114, 116]), [hand[0] - 1, hand[1] - 2], STEEL, 15);
        posed(d, body, (c) => pauldron(c, 114, 112, STEEL, 12));
      }),
      part('tail', 'extra', 'head', turned(head, [92, 54]), (d) => posed(d, head, (c) => horseTail(c, [92, 54], BONE, 70)), 2.8),
      part('head', 'head', 'body', turned(head, NECK), (d) => posed(d, head, (c) => tailedSallet(c, STEEL, STEEL))),
      part('lance', 'weapon', 'body', hand, (d, team) => ninthLance(d, { hand, angle: 83 }, 76, CLOTH[team], 52)),
    ],
  };
})();

// ---------------------------------------------------------------- Hroth the Unburied

const HROTH: Build = { size: 1.3, wide: 1.02, lean: 12, nod: 4, headX: 8, headY: 11 };

note('hroth', 'Heroes', 'melee', 'a third bigger than anyone and hunched, his own headstone roped to his back, a winding sheet and one horn, an axe with a blade like a spade');
export const hroth: UnitArt = (() => {
  const body = bodyOf(HROTH);
  const head = headOf(HROTH);
  const stone = (p: Path): Path => body(p.translate(-15, -15));
  const hand: Pt = [154, 150];
  return {
    id: 'hroth',
    style: 'cleave',
    muzzle: [190, 90],
    top: -12,
    parts: [
      ground(52),
      part('headstone', 'extra', 'body', turned(stone, [70, 130]), (d) => posed(d, stone, (c) => headstone(c)), 0.4),
      ...stand(HROTH, LEATHER, [-8, 8], [6, -8]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          // The rag of his kilt below the body, then the body in its sheet: three windings and no more.
          c.piece('rag', poly([[68, 154], [126, 154], [122, 172], [113, 163], [104, 174], [96, 164], [87, 174], [79, 163], [70, 170]]), CLOTH[team], { shade: 3 });
          c.piece('shroud', bulkTorsoPath(), LINEN, {
            inner: (i) => {
              sash(i, CLOTH[team]);
              i.line('wind-a', line(58, 118, 138, 110));
              i.line('wind-b', line(58, 131, 138, 124));
              skirt(i, CLOTH[team], 142);
              i.line('wind-c', line(56, 142, 138, 142));
            },
          });
        });
        arm(d, 'arm', turned(body, [118, 118]), [hand[0] - 2, hand[1] - 3], LINEN, 23);
      }),
      part('head', 'head', 'body', turned(head, NECK), (d) => posed(d, head, (c) => shroudHelm(c))),
      part('axe', 'weapon', 'body', hand, (d) => gravecleaver(d, { hand, angle: 14 }, 98)),
    ],
  };
})();

// ---------------------------------------------------------------- Brother Aldous Bell

const ALDOUS: Build = { size: 1, wide: 1.16, lean: 8, nod: -3 };

note('aldous', 'Heroes', 'support', 'a stout monk bent over a shepherd\'s crook taller than he is, and a great bronze bell hung from its hook');
export const aldous: UnitArt = (() => {
  const body = bodyOf(ALDOUS);
  const head = headOf(ALDOUS);
  const hand: Pt = [150, 124];
  return {
    id: 'aldous',
    style: 'toll',
    muzzle: [186, 84],
    top: 0,
    parts: [
      ground(44),
      ...stand(ALDOUS, LEATHER, [-3, 3], [4, -5]),
      part('body', 'body', 'root', FEET, (d, team) => {
        arm(d, 'sleeve-far', turned(body, [108, 122]), [hand[0] - 3, hand[1] + 21], LINEN, 16);
        posed(d, body, (c) => {
          c.piece('habit', robePath(), LINEN, {
            inner: (i) => {
              hem(i, LEATHER);
              i.piece('scapular', roundRect(84, 96, 30, 82, 0), CLOTH[team], { shade: 0 });
            },
          });
        });
        arm(d, 'sleeve', turned(body, [116, 118]), [hand[0] - 3, hand[1] + 2], LINEN, 18);
      }),
      part('head', 'head', 'body', turned(head, NECK), (d, team) => posed(d, head, (c) => monkHood(c, CLOTH[team]))),
      part('bell', 'weapon', 'body', hand, (d) => bellCrook(d, { hand, angle: 3 }, BRONZE, 98)),
    ],
  };
})();

// ---------------------------------------------------------------- Ysolde Rimeheart, the Winter Widow

const YSOLDE: Build = { size: 1.16, wide: 0.8, lean: -2, nod: -3 };

note('ysolde', 'Heroes', 'caster', 'the tallest and the narrowest, a black veil under a crown of ice spires, its train out behind, a wand held out with one tear of ice as big as her head');
export const ysolde: UnitArt = (() => {
  const body = bodyOf(YSOLDE);
  const head = headOf(YSOLDE);
  const hand: Pt = [142, 120];
  return {
    id: 'ysolde',
    style: 'invoke',
    muzzle: [174, 54],
    top: -14,
    parts: [
      ground(32),
      part('train', 'extra', 'head', turned(head, [76, 66]), (d) => posed(d, head, (c) => veilTrain(c, DARK_CLOTH)), 2.6),
      ...stand(YSOLDE, DARK_CLOTH, [-2, 2], [2, -3]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('gown', robePath(), CLOTH[team], {
            inner: (i) => {
              hem(i, FROST);
              i.piece('bodice', smooth([[60, 96, 'c'], [132, 96, 'c'], [128, 118], [112, 130], [96, 133], [80, 130], [64, 118]]), DARK_CLOTH, { shade: 0 });
            },
          });
        });
        // A sleeve that hangs open from the wrist.
        d.piece('sleeve-fall', smooth([[hand[0] - 20, hand[1] + 4, 'c'], [hand[0] - 4, hand[1] + 6, 'c'], [hand[0] - 8, hand[1] + 26], [hand[0] - 14, hand[1] + 40, 'c'], [hand[0] - 24, hand[1] + 22]]), DARK_CLOTH, { shade: 3 });
        arm(d, 'sleeve', turned(body, [114, 115]), [hand[0] - 3, hand[1] + 1], DARK_CLOTH, 14);
      }),
      part('head', 'head', 'body', turned(head, NECK), (d) => posed(d, head, (c) => iceCrown(c, DARK_CLOTH, FROST))),
      part('wand', 'weapon', 'body', hand, (d) => widowsTear(d, { hand, angle: 24 }, FROST, 42)),
    ],
  };
})();

// ---------------------------------------------------------------- Maren Dawnguard, the Oathkeeper

const MAREN: Build = { size: 1.1, lean: -3 };

note('maren', 'Heroes', 'captain', 'tall and easy, weight on one leg, a smooth helm with half a sun for a crest, a great hammer on her shoulder with her oath hung from it, sealed in red');
export const maren: UnitArt = (() => {
  const body = bodyOf(MAREN);
  const head = headOf(MAREN);
  const hand: Pt = [134, 134];
  return {
    id: 'maren',
    style: 'smite',
    muzzle: [176, 80],
    top: 20,
    parts: [
      ground(42),
      part('cape', 'extra', 'body', turned(body, [96, 106]), (d, team) => posed(d, body, (c) => cape(c, CLOTH[team])), 1.6),
      ...stand(MAREN, STEEL, [-3, 0], [9, -15]),
      part('body', 'body', 'root', FEET, (d, team) => {
        posed(d, body, (c) => {
          c.piece('tabard', torsoPath(), CLOTH[team], { inner: (i) => { stripe(i); belt(i, { y: 142, mat: BONE }); } });
        });
        arm(d, 'arm', turned(body, [117, 116]), [hand[0] - 2, hand[1] - 3], STEEL, 16);
        posed(d, body, (c) => pauldron(c, 117, 112, STEEL, 12));
      }),
      // The hammer is drawn before the head: it lies on her shoulder, and its head is seen behind hers.
      part('hammer', 'weapon', 'body', hand, (d) => morningstarHammer(d, { hand, angle: -58 }, 100)),
      part('head', 'head', 'body', turned(head, NECK), (d) => posed(d, head, (c) => dawnHelm(c))),
    ],
  };
})();

export const HEROES_ART: readonly UnitArt[] = [bram, wren, orrin, fenn, nan, isaura, hroth, aldous, ysolde, maren];
