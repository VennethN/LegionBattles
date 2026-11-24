// The units and their numbers. This is the file to change to tune a fight:
// `npm run balance` plays a few hundred battles and says how long they last.
//
// A unit's `id` is also the name of its art (src/art/units).

import type { UnitDef } from '../sim/types';

export const UNITS: Readonly<Record<string, UnitDef>> = {
  knight: {
    id: 'knight',
    name: 'Knight',
    role: 'tank',
    hp: 900,
    damage: 45,
    attackInterval: 1.2,
    windup: 0.35,
    range: 0.95,
    armor: 15,
    speed: 70,
    text: 'Slow, armored, and very hard to move out of the way.',
    skill: {
      id: 'shield-slam',
      name: 'Shield Slam',
      kind: 'strike',
      cooldown: 8,
      power: 1.3,
      status: { id: 'stun', duration: 1.2 },
      text: 'Hits one enemy for 130% damage and stuns it.',
    },
  },
  berserker: {
    id: 'berserker',
    name: 'Berserker',
    role: 'fighter',
    hp: 650,
    damage: 70,
    attackInterval: 0.9,
    windup: 0.3,
    range: 0.95,
    armor: 0,
    speed: 85,
    frenzy: { below: 0.4, haste: 0.4 },
    text: 'Hits hard, and 40% faster when below 40% health.',
    skill: {
      id: 'reaping-spin',
      name: 'Reaping Spin',
      kind: 'cleave',
      cooldown: 7,
      power: 0.9,
      area: 1.25,
      text: 'Spins the axe: 90% damage to every enemy around.',
    },
  },
  archer: {
    id: 'archer',
    name: 'Archer',
    role: 'ranger',
    hp: 450,
    damage: 55,
    attackInterval: 1.0,
    windup: 0.35,
    range: 4,
    armor: 0,
    speed: 65,
    projectile: { kind: 'arrow', speed: 600 },
    text: 'Shoots from four tiles away. Keep something in front of it.',
    skill: {
      id: 'fan-of-arrows',
      name: 'Fan of Arrows',
      kind: 'volley',
      cooldown: 7,
      power: 0.8,
      targets: 3,
      text: 'Looses three arrows at once, at the three nearest enemies.',
    },
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    role: 'mage',
    hp: 420,
    damage: 60,
    attackInterval: 1.6,
    windup: 0.55,
    range: 3.5,
    armor: 0,
    speed: 60,
    projectile: { kind: 'orb-arcane', speed: 420 },
    splash: { radius: 0.8, share: 0.5 },
    text: 'Every orb also hurts the enemies beside its target.',
    skill: {
      id: 'arcane-burst',
      name: 'Arcane Burst',
      kind: 'blast',
      cooldown: 9,
      power: 1.5,
      area: 1.3,
      windup: 0.8,
      text: 'A great orb: 150% damage to everything near where it lands.',
    },
  },
  cleric: {
    id: 'cleric',
    name: 'Cleric',
    role: 'support',
    hp: 480,
    damage: 25,
    attackInterval: 1.5,
    windup: 0.5,
    range: 3,
    armor: 0,
    speed: 60,
    projectile: { kind: 'orb-holy', speed: 480 },
    heal: { amount: 50, range: 3 },
    text: 'Mends whoever is worst hurt within three tiles. Fights only when no one is.',
    skill: {
      id: 'radiant-hymn',
      name: 'Radiant Hymn',
      kind: 'mend',
      cooldown: 10,
      power: 1.2,
      area: 2.5,
      windup: 0.7,
      text: 'Heals every ally nearby at once.',
    },
  },
};

/** The units a skirmish draws its enemy team from, and the player's starting four. */
export const SKIRMISH_ROSTER: readonly string[] = ['knight', 'berserker', 'archer', 'mage'];

export function unitDef(id: string): UnitDef {
  const def = UNITS[id];
  if (!def) throw new Error(`no unit "${id}"`);
  return def;
}
