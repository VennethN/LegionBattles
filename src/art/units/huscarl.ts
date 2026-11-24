import { BONE, CLOTH, LEATHER } from '../kit/palette';
import { FEET, NECK, arm, belt, furCollar, handAxe, roundShield, spangenhelm, torsoPath } from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// Read it by: the banded helm with mail hung from it, the fur, the great
// round shield held well forward, the bearded axe.
export const huscarl: UnitArt = {
  id: 'huscarl',
  style: 'slash',
  muzzle: [146, 104],
  top: 40,
  parts: [
    ground(38),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('tunic', torsoPath(), CLOTH[team], { inner: (c) => belt(c, { y: 140 }) });
      arm(d, 'arm', [116, 118], [128, 130], CLOTH[team]);
      furCollar(d, BONE);
    }),
    part('head', 'head', 'body', NECK, (d) => spangenhelm(d)),
    part('axe', 'weapon', 'body', [130, 131], (d) => handAxe(d, { hand: [130, 131], angle: 26 })),
    part('shield', 'offhand', 'body', [84, 140], (d) => roundShield(d, 84, 140, 28)),
  ],
};
