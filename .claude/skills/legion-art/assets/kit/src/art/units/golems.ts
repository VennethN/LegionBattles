import { ARCANE, CLOTH, DIRT, FROST, HOLY, LINEN, type Team } from '../kit/palette';
import { FEET, HIP_Y, golemArm, golemBody, golemHead, golemLeg, shadow, type GolemLook } from '../kit/parts';
import type { UnitArt } from '../kit/unit';
import { part } from './common';

// Golems are one build in two stones. Read one by: no neck, fists like
// boulders, a sign glowing in its chest. Its head is a block with a line cut
// in it and nothing more.

function golem(id: string, look: GolemLook, top: number): UnitArt {
  const cloth = (team: Team) => CLOTH[team];
  return {
    id,
    style: 'chop',
    muzzle: [150, 110],
    top,
    parts: [
      part('shadow', 'shadow', 'root', FEET, (d) => shadow(d, 48, 10)),
      part('fist-back', 'offhand', 'body', [58, 104], (d, team) => golemArm(d, 50, 102, look, cloth(team), true)),
      part('leg-back', 'legBack', 'root', [80, HIP_Y], (d) => golemLeg(d, 80, look, true)),
      part('leg-front', 'legFront', 'root', [110, HIP_Y], (d) => golemLeg(d, 110, look)),
      part('body', 'body', 'root', FEET, (d, team) => golemBody(d, look, cloth(team))),
      part('head', 'head', 'body', [98, 98], (d) => golemHead(d, look)),
      part('fist', 'weapon', 'body', [134, 104], (d, team) => golemArm(d, 132, 102, look, cloth(team))),
    ],
  };
}

/** Sandstone under a crust of pale sand, with a sun sign. The boss of the dunes. */
export const colossus = golem('colossus', { rock: DIRT, cap: LINEN, rune: HOLY, spikes: false }, 48);

/** Blue ice under snow, shards on its shoulders. */
export const icegolem = golem('icegolem', {
  rock: FROST,
  cap: { fill: FROST.light, shade: FROST.light },
  rune: ARCANE,
  spikes: true,
}, 22);
