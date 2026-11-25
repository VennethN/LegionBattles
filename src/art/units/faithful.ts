// The Faithful: the townsfolk only the rewards give (data/rewards.ts). None
// is a soldier, and none is dressed as one: each is read by the hat of its
// trade and the tool it carries.

import { BONE, CLOTH, DARK_CLOTH, FIRE, GOLD, IRON, LEATHER, LINEN, STEEL, type Material } from '../kit/palette';
import {
  FEET, NECK, arm, belt, bulkTorsoPath, buttons, cape, crestedHelm, forgeMask, halberd, handbell, hem, lampPole, mantle, pauldron, robePath, seam,
  shovel, skep, skirt, stovepipe, stripe, tailHood, tongs, torsoPath, tricorn, veilHat, warhammer,
} from '../kit/parts';
import { roundRect, smooth } from '../kit/path';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

/** Straw: gold's color without its polish. */
const STRAW: Material = { fill: GOLD.fill, shade: GOLD.shade };

// Read it by: the wide straw hat with its veil to the shoulders, and the hive carried on one hand.
// The hive is held low: its one door is nowhere near the window of the veil, so the two never read as a pair.
export const beekeeper: UnitArt = {
  id: 'beekeeper',
  style: 'throw',
  muzzle: [151, 118],
  top: 42,
  parts: [
    ground(36),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('smock', robePath(), LINEN, { inner: (c) => hem(c, CLOTH[team]) });
      arm(d, 'sleeve', [116, 120], [137, 142], LINEN, 16);
    }),
    part('head', 'head', 'body', NECK, (d, team) => veilHat(d, STRAW, LINEN, CLOTH[team])),
    part('hive', 'weapon', 'body', [141, 144], (d) => skep(d, { hand: [141, 144], angle: 14 }, STRAW)),
  ],
};

// Read it by: the hood with its long tail down the back, and the shovel carried like an axe.
export const gravedigger: UnitArt = {
  id: 'gravedigger',
  style: 'chop',
  muzzle: [161, 110],
  top: 30,
  parts: [
    ground(36),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('coat', torsoPath(), DARK_CLOTH, {
        inner: (c) => {
          seam(c, 108, 100, 146);
          skirt(c, CLOTH[team]);
          belt(c, { y: 140 });
        },
      });
      arm(d, 'arm', [114, 118], [134, 138], DARK_CLOTH);
    }),
    part('head', 'head', 'body', NECK, (d) => tailHood(d, DARK_CLOTH)),
    part('shovel', 'weapon', 'body', [135, 142], (d) => shovel(d, { hand: [135, 142], angle: 24 })),
  ],
};

// Read it by: the three-cornered hat, the short cape, and the great bell swung from one hand.
export const bellringer: UnitArt = {
  id: 'bellringer',
  style: 'swing',
  muzzle: [144, 150],
  top: 34,
  parts: [
    ground(36),
    part('cape', 'extra', 'body', [78, 112], (d, team) => cape(d, CLOTH[team]), 0.5),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('coat', torsoPath(), CLOTH[team], {
        inner: (c) => {
          buttons(c, 109, 112, 3);
          belt(c, { y: 142, mat: GOLD, buckle: null });
        },
      });
      arm(d, 'sleeve', [116, 116], [140, 108], CLOTH[team], 15);
    }),
    part('head', 'head', 'body', NECK, (d) => tricorn(d, DARK_CLOTH, LINEN)),
    part('bell', 'weapon', 'body', [142, 106], (d) => handbell(d, { hand: [142, 106], angle: 0 })),
  ],
};

// Read it by: the flat mask of plate, the apron, the hammer, and the billet glowing in its tongs.
export const blacksmith: UnitArt = {
  id: 'blacksmith',
  style: 'slash',
  muzzle: [155, 104],
  top: 46,
  parts: [
    ground(40),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('shirt', bulkTorsoPath(), CLOTH[team], {
        inner: (c) => {
          // The apron: leather from the chest down, hung from a strap round the neck.
          c.piece('apron', smooth([[80, 112, 'c'], [116, 112, 'c'], [124, 134], [124, 170], [72, 170], [72, 134]]), LEATHER, {
            shade: 4,
            inner: (a) => a.piece('pocket', roundRect(88, 138, 22, 14, 3), LEATHER, { shade: 0 }),
          });
        },
      });
      arm(d, 'arm', [118, 116], [138, 132], CLOTH[team], 17);
      pauldron(d, 119, 113, IRON, 10);
    }),
    part('head', 'head', 'body', NECK, (d) => forgeMask(d)),
    part('tongs', 'offhand', 'body', [72, 144], (d) => tongs(d, 72, 144, FIRE)),
    part('hammer', 'weapon', 'body', [139, 133], (d) => warhammer(d, { hand: [139, 133], angle: 26 }, 54, LEATHER)),
  ],
};

// Read it by: the hat as tall as its head, the long coat, and the pole with a flame at its tip.
export const lamplighter: UnitArt = {
  id: 'lamplighter',
  style: 'cast',
  muzzle: [155, 34],
  top: 12,
  parts: [
    ground(36),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('coat', robePath(), DARK_CLOTH, {
        inner: (c) => {
          buttons(c, 109, 112, 4);
          hem(c, CLOTH[team]);
        },
      });
      arm(d, 'sleeve', [116, 117], [138, 136], DARK_CLOTH, 16);
    }),
    part('head', 'head', 'body', NECK, (d, team) => stovepipe(d, DARK_CLOTH, CLOTH[team])),
    part('pole', 'weapon', 'body', [139, 137], (d) => lampPole(d, { hand: [139, 137], angle: 8 }, FIRE)),
  ],
};

// Read it by: the crest that stands from brow to nape, the mantle, and the halberd taller than it is.
export const honorguard: UnitArt = {
  id: 'honorguard',
  style: 'chop',
  muzzle: [162, 96],
  top: 8,
  parts: [
    ground(40),
    part('cape', 'extra', 'body', [94, 106], (d, team) => cape(d, CLOTH[team]), 0.6),
    ...legs(STEEL),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('tabard', torsoPath(), BONE, {
        inner: (c) => {
          stripe(c, 101, 12);
          belt(c, { y: 138, mat: GOLD, buckle: null });
        },
      });
      arm(d, 'arm', [116, 118], [136, 140], STEEL);
      mantle(d, CLOTH[team]);
      pauldron(d, 118, 112, GOLD, 10);
    }),
    part('head', 'head', 'body', NECK, (d, team) => crestedHelm(d, CLOTH[team])),
    part('halberd', 'weapon', 'body', [137, 142], (d, team) => halberd(d, { hand: [137, 142], angle: 10 }, CLOTH[team])),
  ],
};

export const FAITHFUL_ART: readonly UnitArt[] = [beekeeper, gravedigger, bellringer, blacksmith, lamplighter, honorguard];
