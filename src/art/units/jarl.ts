import { BONE, CLOTH, GOLD, IRON, LEATHER } from '../kit/palette';
import { FEET, NECK, arm, belt, bulkTorsoPath, cape, furCollar, greatHammer, jarlHelm, skirt } from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// The boss of Frostholt. Read it by: ram's horns curled beside a crowned
// helm, the cape, the hammer with a head like an anvil.
export const jarl: UnitArt = {
  id: 'jarl',
  style: 'chop',
  muzzle: [150, 96],
  top: 32,
  parts: [
    ground(44),
    part('cape', 'extra', 'body', [94, 106], (d, team) => cape(d, CLOTH[team]), 0.6),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('mail', bulkTorsoPath(), IRON, {
        inner: (c) => {
          skirt(c, CLOTH[team]);
          belt(c, { y: 140, mat: GOLD, buckle: null });
        },
      });
      arm(d, 'arm', [118, 118], [122, 140], IRON, 17);
      furCollar(d, BONE);
    }),
    part('head', 'head', 'body', NECK, (d) => jarlHelm(d)),
    part('hammer', 'weapon', 'body', [122, 142], (d) => greatHammer(d, { hand: [122, 142], angle: 22 })),
  ],
};
