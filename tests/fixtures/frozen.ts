// A cast and a few battles that are never changed, for holding the battle to
// what it was. The game's own units are tuned from time to time, and a test
// that pins a battle of theirs breaks for that and says nothing about the
// rules. These units are written out here in full and belong to no set: a
// fingerprint of one of these battles moves only when the simulation does.
//
// Between them they have every kind of skill, a healer, shots, splash, a
// status on a hit, a frenzy, a tower, a hall that calls troops up, a banner
// and a trap.

import type { BattleInput, Placement, UnitDef } from '../../src/sim/types';

export const FROZEN_DEFS: Readonly<Record<string, UnitDef>> = {
  sword: {
    id: 'sword', name: 'Sword', role: 'tank', hp: 900, damage: 45, attackInterval: 1.2, windup: 0.35, range: 0.95, armor: 15, speed: 70,
    skill: { id: 'slam', name: 'Slam', kind: 'strike', cooldown: 8, power: 1.3, status: { id: 'stun', duration: 1.2 }, text: '' },
  },
  bow: {
    id: 'bow', name: 'Bow', role: 'ranger', hp: 450, damage: 55, attackInterval: 1.0, windup: 0.35, range: 4, armor: 0, speed: 65,
    projectile: { kind: 'arrow', speed: 600 },
    skill: { id: 'fan', name: 'Fan', kind: 'volley', cooldown: 7, power: 0.8, targets: 3, text: '' },
  },
  priest: {
    id: 'priest', name: 'Priest', role: 'support', hp: 480, damage: 25, attackInterval: 1.5, windup: 0.5, range: 3, armor: 0, speed: 60,
    projectile: { kind: 'orb-holy', speed: 480 }, heal: { amount: 50, range: 3 },
    skill: { id: 'hymn', name: 'Hymn', kind: 'mend', cooldown: 10, power: 1.2, area: 2.5, windup: 0.7, status: { id: 'regen', duration: 3 }, text: '' },
  },
  axe: {
    id: 'axe', name: 'Axe', role: 'fighter', hp: 650, damage: 70, attackInterval: 0.9, windup: 0.3, range: 0.95, armor: 0, speed: 85,
    frenzy: { below: 0.4, haste: 0.4 },
    skill: { id: 'spin', name: 'Spin', kind: 'cleave', cooldown: 7, power: 0.9, area: 1.25, status: { id: 'weak', duration: 3 }, text: '' },
  },
  wizard: {
    id: 'wizard', name: 'Wizard', role: 'mage', hp: 420, damage: 60, attackInterval: 1.6, windup: 0.55, range: 3.5, armor: 0, speed: 60,
    projectile: { kind: 'orb-arcane', speed: 420 }, splash: { radius: 0.8, share: 0.5 },
    skill: { id: 'burst', name: 'Burst', kind: 'blast', cooldown: 9, power: 1.5, area: 1.3, windup: 0.8, status: { id: 'burn', duration: 4, power: 0.4 }, text: '' },
  },
  leech: {
    id: 'leech', name: 'Leech', role: 'fighter', hp: 1100, damage: 80, attackInterval: 1.4, windup: 0.45, range: 1.05, armor: 8, speed: 66, scale: 1.18,
    skill: { id: 'due', name: 'Due', kind: 'drain', cooldown: 9, power: 1.8, share: 0.4, windup: 0.6, text: '' },
  },
  guard: {
    id: 'guard', name: 'Guard', role: 'tank', hp: 880, damage: 44, attackInterval: 1.2, windup: 0.35, range: 1.3, armor: 12, speed: 68,
    skill: { id: 'wall', name: 'Wall', kind: 'boon', cooldown: 10, area: 1.6, status: { id: 'shield', duration: 4 }, windup: 0.4, text: '' },
  },
  witch: {
    id: 'witch', name: 'Witch', role: 'mage', hp: 430, damage: 42, attackInterval: 1.4, windup: 0.5, range: 3.5, armor: 0, speed: 60,
    projectile: { kind: 'orb-venom', speed: 440 }, onHit: { id: 'poison', duration: 3, chance: 0.6 },
    skill: { id: 'hex', name: 'Hex', kind: 'hex', cooldown: 9, power: 0.8, area: 1.5, status: { id: 'mark', duration: 5 }, windup: 0.6, text: '' },
  },
  tower: {
    id: 'tower', name: 'Tower', role: 'ranger', hp: 560, damage: 48, attackInterval: 1.1, windup: 0.35, range: 4.2, armor: 6, speed: 0, radius: 0.4, still: true,
    projectile: { kind: 'arrow', speed: 640 },
  },
  camp: {
    id: 'camp', name: 'Camp', role: 'support', hp: 760, damage: 0, attackInterval: 1, windup: 0.3, range: 0, armor: 8, speed: 0, radius: 0.44, still: true,
    summons: { unit: 'guard', every: 8, cap: 2, total: 4 },
  },
  banner: {
    id: 'banner', name: 'Banner', role: 'support', hp: 500, damage: 0, attackInterval: 1, windup: 0.3, range: 0, armor: 4, speed: 0, radius: 0.36, still: true,
    aura: { status: { id: 'haste', duration: 2.5, power: 0.2 }, radius: 1.8, every: 2 },
  },
  snare: {
    id: 'snare', name: 'Snare', role: 'support', hp: 1, damage: 120, attackInterval: 1, windup: 0.3, range: 0, armor: 0, speed: 0,
    trap: { trigger: 0.6, radius: 0.8, status: { id: 'slow', duration: 2.5 } },
  },
};

const at = (unit: string, col: number, row: number, more: Partial<Placement> = {}): Placement => ({ unit, col, row, ...more });

/** The battles, by name. Team 0 stands on columns 0 to 3, team 1 on 4 to 7. */
export const FROZEN_BATTLES: Readonly<Record<string, BattleInput>> = {
  starters: {
    seed: 11, defs: FROZEN_DEFS,
    teams: [[at('sword', 3, 1), at('bow', 1, 1), at('priest', 0, 2), at('tower', 1, 0)], [at('axe', 4, 1), at('axe', 5, 2), at('bow', 6, 1)]],
  },
  skills: {
    seed: 2024, defs: FROZEN_DEFS,
    teams: [
      [at('sword', 3, 1), at('axe', 3, 2), at('wizard', 1, 1), at('witch', 1, 2), at('priest', 0, 0), at('guard', 2, 3)],
      [at('leech', 4, 1, { scale: 1.24, hpMult: 1.6 }), at('guard', 4, 2), at('bow', 6, 0), at('witch', 6, 3), at('wizard', 7, 1), at('priest', 7, 2)],
    ],
  },
  structures: {
    seed: 77, defs: FROZEN_DEFS,
    teams: [
      [at('sword', 3, 1), at('bow', 1, 2), at('tower', 1, 0), at('camp', 0, 3), at('snare', 3, 2), at('banner', 2, 1)],
      [at('axe', 4, 1), at('axe', 4, 2), at('leech', 5, 0), at('tower', 7, 1), at('camp', 7, 3), at('snare', 4, 3), at('witch', 6, 2)],
    ],
  },
  strong: {
    seed: 99999, defs: FROZEN_DEFS,
    teams: [
      [at('sword', 3, 0, { hpMult: 2.2, damageMult: 1.8 }), at('axe', 3, 3, { hpMult: 2.2, damageMult: 1.8 }), at('bow', 0, 1, { hpMult: 2, damageMult: 2 }), at('priest', 0, 2, { hpMult: 2 })],
      [at('leech', 5, 1, { hpMult: 3, damageMult: 1.5, summons: { unit: 'axe', every: 5, cap: 3 } }), at('wizard', 7, 0, { hpMult: 2 }), at('witch', 7, 3, { hpMult: 2 })],
    ],
    seconds: 60,
  },
  bigField: {
    seed: 5, defs: FROZEN_DEFS, field: { cols: 12, rows: 6 },
    teams: [
      [at('sword', 5, 2), at('guard', 5, 3), at('axe', 4, 1), at('bow', 2, 2), at('wizard', 2, 3), at('priest', 1, 4), at('witch', 1, 1), at('tower', 3, 0)],
      [at('leech', 6, 2), at('axe', 6, 3), at('sword', 7, 4), at('bow', 9, 1), at('witch', 9, 4), at('wizard', 10, 2), at('priest', 10, 3), at('camp', 11, 5)],
    ],
  },
};
