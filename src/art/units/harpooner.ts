import { BONE, CLOTH, LEATHER } from '../kit/palette';
import { FEET, NECK, arm, belt, furHood, javelin, ropeCoil, torsoPath } from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { ground, legs, part } from './common';

// Read it by: the ruff of fur round a dark hood, the barbed harpoon, the coil of rope.
export const harpooner: UnitArt = {
  id: 'harpooner',
  style: 'throw',
  muzzle: [160, 94],
  top: 46,
  parts: [
    ground(34),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('coat', torsoPath(), CLOTH[team], { inner: (c) => belt(c, { y: 140, mat: BONE, buckle: null }) });
      arm(d, 'arm', [114, 116], [124, 112], CLOTH[team]);
    }),
    part('head', 'head', 'body', NECK, (d) => furHood(d, LEATHER)),
    part('rope', 'offhand', 'body', [76, 132], (d) => ropeCoil(d, 76, 146)),
    part('harpoon', 'weapon', 'body', [126, 112], (d) => javelin(d, { hand: [126, 112], angle: 66 }, 48, LEATHER, true)),
  ],
};
