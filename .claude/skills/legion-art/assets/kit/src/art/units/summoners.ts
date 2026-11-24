// The summoners: units that fight little and call others to their side. One
// to a set. Each is read by what it calls with, which no one else carries.

import { BONE, CLOTH, FIRE, GOLD, LEATHER, LINEN } from '../kit/palette';
import {
  FEET, NECK, arm, beater, belt, cape, crookLantern, drum, furCollar, furHood, hem, hood, robePath, roundHelm, seam, skirt, stripe, torsoPath,
  trumpet, turban, warHorn,
} from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// Read it by: the gold helm, and the long horn raised with a cloth hung from it.
export const herald: UnitArt = {
  id: 'herald',
  style: 'cast',
  muzzle: [158, 64],
  top: 36,
  parts: [
    ground(34),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('tabard', torsoPath(), CLOTH[team], {
        inner: (c) => {
          stripe(c, 101, 11);
          belt(c, { y: 140 });
        },
      });
      arm(d, 'arm', [114, 116], [128, 110], CLOTH[team]);
    }),
    part('head', 'head', 'body', NECK, (d) => roundHelm(d, GOLD)),
    part('trumpet', 'weapon', 'body', [129, 110], (d, team) => trumpet(d, { hand: [129, 110], angle: 38 }, CLOTH[team])),
  ],
};

// Read it by: the leather hood, the long coat, and the lantern swung on a crook.
export const ringleader: UnitArt = {
  id: 'ringleader',
  style: 'cast',
  muzzle: [152, 76],
  top: 40,
  parts: [
    ground(36),
    part('cape', 'extra', 'body', [78, 112], (d, team) => cape(d, CLOTH[team]), 0.5),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('coat', robePath(), LEATHER, { inner: (c) => hem(c, CLOTH[team]) });
      arm(d, 'sleeve', [116, 117], [128, 134], LEATHER, 16);
    }),
    part('head', 'head', 'body', NECK, (d) => hood(d, LEATHER, 16)),
    part('lantern', 'weapon', 'body', [129, 135], (d) => crookLantern(d, { hand: [129, 135], angle: 4 }, FIRE)),
  ],
};

// Read it by: the pale turban, the great drum slung in front, the beater raised over it.
export const drummer: UnitArt = {
  id: 'drummer',
  style: 'slash',
  muzzle: [140, 96],
  top: 38,
  parts: [
    ground(38),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('tunic', torsoPath(), LINEN, {
        inner: (c) => {
          seam(c, 108, 100, 146);
          skirt(c, CLOTH[team]);
        },
      });
      arm(d, 'arm', [114, 116], [128, 104], LINEN);
    }),
    part('head', 'head', 'body', NECK, (d, team) => turban(d, LINEN, CLOTH[team])),
    part('drum', 'offhand', 'body', [112, 142], (d, team) => drum(d, 112, 142, CLOTH[team])),
    part('beater', 'weapon', 'body', [129, 104], (d) => beater(d, { hand: [129, 104], angle: 24 })),
  ],
};

// Read it by: the fur hood in its side's color, and the great curved horn held up to it.
export const skald: UnitArt = {
  id: 'skald',
  style: 'cast',
  muzzle: [156, 62],
  top: 40,
  parts: [
    ground(36),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d) => {
      d.piece('tunic', torsoPath(), LEATHER, {
        inner: (c) => {
          seam(c);
          belt(c, { y: 140 });
        },
      });
      arm(d, 'arm', [116, 116], [130, 112], LEATHER);
      furCollar(d, BONE);
    }),
    part('head', 'head', 'body', NECK, (d, team) => furHood(d, CLOTH[team])),
    part('horn', 'weapon', 'body', [131, 112], (d) => warHorn(d, { hand: [131, 112], angle: 20 })),
  ],
};
