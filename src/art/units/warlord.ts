import { BONE, CLOTH, GOLD, IRON } from '../kit/palette';
import { FEET, NECK, arm, belt, bulkTorsoPath, cape, crownedHelm, furCollar, greatsword, pauldron, skirt } from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// The boss of Thornwood. Read it by: the crown on a black helm, the cape,
// the sword as long as it is tall.
export const warlord: UnitArt = {
  id: 'warlord',
  style: 'chop',
  muzzle: [150, 100],
  top: 30,
  parts: [
    ground(42),
    part('cape', 'extra', 'body', [94, 106], (d, team) => cape(d, CLOTH[team]), 0.6),
    ...legs(IRON),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('plate', bulkTorsoPath(), IRON, {
        inner: (c) => {
          skirt(c, CLOTH[team]);
          belt(c, { y: 140, mat: GOLD, buckle: null });
        },
      });
      arm(d, 'arm', [118, 118], [122, 138], IRON, 17);
      furCollar(d, BONE);
      pauldron(d, 120, 114, GOLD, 10);
    }),
    part('head', 'head', 'body', NECK, (d) => crownedHelm(d)),
    part('sword', 'weapon', 'body', [122, 140], (d) => greatsword(d, { hand: [122, 140], angle: 30 }, 92, IRON)),
  ],
};
