// The units and their numbers. This is the file to change to tune a fight.
// `npm run balance` plays skirmishes and says how long they last, and
// `npm run journey` plays new players through the worlds.
//
// A unit's `id` is also the name of its art (src/art/units).
//
// Numbers are written at the strength of the first set. A set's `power`
// multiplies its units' health, damage, healing and armor, which is how the
// units of a later world outdo those of an earlier one whatever their tier.

import type { Rarity } from '../game/rarity';
import type { UnitDef } from '../sim/types';

/** What the game knows about a unit beyond how it fights. */
export interface UnitInfo extends UnitDef {
  set: string;
  rarity: Rarity;
  /** The stage of its set's world (counting from 1) that must be cleared before packs turn it over. None for the first set. */
  from?: number;
  /**
   * What it is, if it is not a unit that walks and fights: a building, which
   * stands where it is put (a tower, a barracks, a wall, a banner), or a
   * trap, which lies there until an enemy steps on it. Both are cards like
   * any other, but they are fielded in the team's places for structures, not in its
   * places for units (game/rules.ts).
   */
  kind?: 'building' | 'trap';
  /** Where FILL TEAM stands it, if not where its reach would put it: a barracks strikes no one and still belongs at the back. */
  place?: 'front' | 'back';
}

export interface SetDef {
  id: string;
  name: string;
  power: number;
}

export const SETS: Readonly<Record<string, SetDef>> = {
  kingdom: { id: 'kingdom', name: 'The Crownlands', power: 1 },
  raiders: { id: 'raiders', name: 'Thornwood Raiders', power: 1.06 },
  sandsworn: { id: 'sandsworn', name: 'The Sandsworn', power: 1.3 },
  frostbound: { id: 'frostbound', name: 'The Frostbound', power: 1.6 },
};

type Raw = Omit<UnitInfo, 'id'>;

const RAW: Record<string, Raw> = {
  // ------------------------------------------------------------ the Crownlands
  militia: {
    name: 'Militia', set: 'kingdom', rarity: 'common', role: 'fighter',
    hp: 600, damage: 40, attackInterval: 1.0, windup: 0.3, range: 1.3, armor: 5, speed: 74,
    text: 'A long spear and a small shield. Reaches past whoever stands in front.',
    skill: {
      id: 'hold-the-line', name: 'Hold the Line', kind: 'boon', cooldown: 10, area: 1.4,
      status: { id: 'shield', duration: 4 }, windup: 0.4,
      text: 'Shields itself and the allies beside it for 4 seconds.',
    },
  },
  archer: {
    name: 'Archer', set: 'kingdom', rarity: 'common', role: 'ranger',
    hp: 450, damage: 55, attackInterval: 1.0, windup: 0.35, range: 4, armor: 0, speed: 65,
    projectile: { kind: 'arrow', speed: 600 },
    text: 'Shoots from four tiles away. Keep something in front of it.',
    skill: {
      id: 'fan-of-arrows', name: 'Fan of Arrows', kind: 'volley', cooldown: 7, power: 0.8, targets: 3,
      text: 'Looses three arrows at once, at the three nearest enemies.',
    },
  },
  knight: {
    name: 'Knight', set: 'kingdom', rarity: 'uncommon', role: 'tank',
    hp: 900, damage: 45, attackInterval: 1.2, windup: 0.35, range: 0.95, armor: 15, speed: 70,
    text: 'Slow, armored, and very hard to move out of the way.',
    skill: {
      id: 'shield-slam', name: 'Shield Slam', kind: 'strike', cooldown: 8, power: 1.3,
      status: { id: 'stun', duration: 1.2 },
      text: 'Hits one enemy for 130% damage and stuns it.',
    },
  },
  cleric: {
    name: 'Cleric', set: 'kingdom', rarity: 'uncommon', role: 'support',
    hp: 480, damage: 25, attackInterval: 1.5, windup: 0.5, range: 3, armor: 0, speed: 60,
    projectile: { kind: 'orb-holy', speed: 480 },
    heal: { amount: 50, range: 3 },
    text: 'Mends whoever is worst hurt within three tiles. Fights only when no one is.',
    skill: {
      id: 'radiant-hymn', name: 'Radiant Hymn', kind: 'mend', cooldown: 10, power: 1.2, area: 2.5, windup: 0.7,
      text: 'Heals every ally nearby at once.',
    },
  },
  berserker: {
    name: 'Berserker', set: 'kingdom', rarity: 'rare', role: 'fighter',
    hp: 650, damage: 70, attackInterval: 0.9, windup: 0.3, range: 0.95, armor: 0, speed: 85,
    frenzy: { below: 0.4, haste: 0.4 },
    text: 'Hits hard, and 40% faster when below 40% health.',
    skill: {
      id: 'reaping-spin', name: 'Reaping Spin', kind: 'cleave', cooldown: 7, power: 0.9, area: 1.25,
      text: 'Spins the axe: 90% damage to every enemy around.',
    },
  },
  mage: {
    name: 'Mage', set: 'kingdom', rarity: 'rare', role: 'mage',
    hp: 420, damage: 60, attackInterval: 1.6, windup: 0.55, range: 3.5, armor: 0, speed: 60,
    projectile: { kind: 'orb-arcane', speed: 420 },
    splash: { radius: 0.8, share: 0.5 },
    text: 'Every orb also hurts the enemies beside its target.',
    skill: {
      id: 'arcane-burst', name: 'Arcane Burst', kind: 'blast', cooldown: 9, power: 1.5, area: 1.3, windup: 0.8,
      text: 'A great orb: 150% damage to everything near where it lands.',
    },
  },
  paladin: {
    name: 'Paladin', set: 'kingdom', rarity: 'epic', role: 'tank',
    hp: 1050, damage: 62, attackInterval: 1.3, windup: 0.4, range: 0.95, armor: 12, speed: 68,
    text: 'A wall that mends: its oath heals and shields everyone near it.',
    skill: {
      id: 'oath-of-light', name: 'Oath of Light', kind: 'mend', cooldown: 11, power: 1.5, area: 2,
      status: { id: 'shield', duration: 3 }, windup: 0.6,
      text: 'Heals the allies around it and shields them for 3 seconds.',
    },
  },

  // ------------------------------------------------------------ Thornwood Raiders
  cutpurse: {
    name: 'Cutpurse', set: 'raiders', rarity: 'common', role: 'fighter', from: 1,
    hp: 380, damage: 30, attackInterval: 0.6, windup: 0.2, range: 0.9, armor: 0, speed: 108,
    text: 'Two knives and quick feet. Dies fast, stabs faster.',
    skill: {
      id: 'dirty-trick', name: 'Dirty Trick', kind: 'strike', cooldown: 6, power: 1.8,
      status: { id: 'weak', duration: 3 },
      text: 'A low blow for 180% damage that leaves its target weak.',
    },
  },
  poacher: {
    name: 'Poacher', set: 'raiders', rarity: 'common', role: 'ranger', from: 2,
    hp: 400, damage: 72, attackInterval: 1.7, windup: 0.5, range: 4.5, armor: 0, speed: 62,
    projectile: { kind: 'bolt', speed: 780 },
    text: 'A heavy crossbow: slow to load, and it hurts.',
    skill: {
      id: 'barbed-bolt', name: 'Barbed Bolt', kind: 'strike', cooldown: 8, power: 1.4,
      status: { id: 'poison', duration: 4 },
      text: 'A bolt for 140% damage that leaves poison in the wound.',
    },
  },
  bruiser: {
    name: 'Bruiser', set: 'raiders', rarity: 'uncommon', role: 'tank', from: 5,
    hp: 1150, damage: 60, attackInterval: 1.5, windup: 0.5, range: 1.0, armor: 5, speed: 60, scale: 1.08,
    text: 'Big, slow, and holding most of a tree.',
    skill: {
      id: 'ground-pound', name: 'Ground Pound', kind: 'cleave', cooldown: 10, power: 1.0, area: 1.35,
      status: { id: 'stun', duration: 0.8 }, windup: 0.7,
      text: 'Brings the club down: damage and a short stun to everyone around.',
    },
  },
  hexer: {
    name: 'Hexer', set: 'raiders', rarity: 'rare', role: 'mage', from: 7,
    hp: 430, damage: 42, attackInterval: 1.4, windup: 0.5, range: 3.5, armor: 0, speed: 60,
    projectile: { kind: 'orb-venom', speed: 440 },
    onHit: { id: 'poison', duration: 3, chance: 0.6 },
    text: 'Its orbs poison, and its hex makes every blow on the cursed land harder.',
    skill: {
      id: 'withering-hex', name: 'Withering Hex', kind: 'hex', cooldown: 9, area: 1.5,
      status: { id: 'mark', duration: 5 }, windup: 0.6,
      text: 'Marks its target and the enemies near it: they take 25% more damage.',
    },
  },
  warlord: {
    name: 'Warlord', set: 'raiders', rarity: 'legendary', role: 'fighter', from: 10,
    hp: 1500, damage: 96, attackInterval: 1.4, windup: 0.45, range: 1.05, armor: 12, speed: 66, scale: 1.18,
    text: 'The one the raiders answer to. What its blade takes, it keeps.',
    skill: {
      id: 'tyrants-due', name: "Tyrant's Due", kind: 'drain', cooldown: 9, power: 1.8, share: 0.4, windup: 0.6,
      text: 'A blow for 180% damage that heals the Warlord by part of what it deals.',
    },
  },

  // ------------------------------------------------------------ the Sandsworn
  lancer: {
    name: 'Lancer', set: 'sandsworn', rarity: 'common', role: 'fighter', from: 1,
    hp: 640, damage: 46, attackInterval: 1.0, windup: 0.3, range: 1.45, armor: 4, speed: 84,
    text: 'A longer spear than anyone else on the sand, and quick with it.',
    skill: {
      id: 'skewer', name: 'Skewer', kind: 'strike', cooldown: 7, power: 1.7,
      status: { id: 'slow', duration: 3 },
      text: 'Runs one enemy through for 170% damage and slows it.',
    },
  },
  javelineer: {
    name: 'Javelineer', set: 'sandsworn', rarity: 'common', role: 'ranger', from: 2,
    hp: 500, damage: 58, attackInterval: 1.2, windup: 0.4, range: 3.2, armor: 0, speed: 76,
    projectile: { kind: 'javelin', speed: 640 },
    text: 'Throws from three tiles, and keeps a spare for a second target.',
    skill: {
      id: 'twin-cast', name: 'Twin Cast', kind: 'volley', cooldown: 6, power: 1.1, targets: 2,
      text: 'Two javelins at once, at the two nearest enemies.',
    },
  },
  ballista: {
    name: 'Ballista', set: 'sandsworn', rarity: 'uncommon', role: 'ranger', from: 4,
    hp: 620, damage: 112, attackInterval: 2.6, windup: 0.7, range: 6, armor: 6, speed: 34,
    projectile: { kind: 'bolt', speed: 950 },
    text: 'A siege engine on wheels. Reaches most of the board, and barely moves.',
    skill: {
      id: 'siege-bolt', name: 'Siege Bolt', kind: 'blast', cooldown: 11, power: 1.2, area: 1.0,
      status: { id: 'stun', duration: 0.7 }, windup: 1.0,
      text: 'A bolt that bursts: damage and a short stun where it lands.',
    },
  },
  pyromancer: {
    name: 'Pyromancer', set: 'sandsworn', rarity: 'rare', role: 'mage', from: 6,
    hp: 450, damage: 60, attackInterval: 1.5, windup: 0.5, range: 3.5, armor: 0, speed: 60,
    projectile: { kind: 'orb-fire', speed: 460 },
    onHit: { id: 'burn', duration: 3 },
    text: 'Everything it hits goes on burning.',
    skill: {
      id: 'firestorm', name: 'Firestorm', kind: 'blast', cooldown: 10, power: 1.2, area: 1.6,
      status: { id: 'burn', duration: 4, power: 0.4 }, windup: 0.8,
      text: 'Sets a wide patch alight: damage now and a fierce burn after.',
    },
  },
  colossus: {
    name: 'Sandstone Colossus', set: 'sandsworn', rarity: 'legendary', role: 'tank', from: 12,
    hp: 2100, damage: 92, attackInterval: 1.8, windup: 0.6, range: 1.1, armor: 16, speed: 50, scale: 1.3,
    text: 'Raised from the dunes to guard something long forgotten. It guards still.',
    skill: {
      id: 'quake', name: 'Quake', kind: 'cleave', cooldown: 9, power: 0.9, area: 2.0,
      status: { id: 'slow', duration: 3 }, windup: 0.8,
      text: 'Stamps the ground: damage to everyone within two tiles, and they are slowed.',
    },
  },

  // ------------------------------------------------------------ the Frostbound
  huscarl: {
    name: 'Huscarl', set: 'frostbound', rarity: 'common', role: 'tank', from: 1,
    hp: 880, damage: 44, attackInterval: 1.2, windup: 0.35, range: 0.95, armor: 12, speed: 68,
    text: 'A shield, an axe, and no thought of stepping back.',
    skill: {
      id: 'shield-wall', name: 'Shield Wall', kind: 'boon', cooldown: 10, area: 1.6,
      status: { id: 'shield', duration: 4 }, windup: 0.4,
      text: 'Shields itself and the allies beside it for 4 seconds.',
    },
  },
  harpooner: {
    name: 'Harpooner', set: 'frostbound', rarity: 'common', role: 'ranger', from: 2,
    hp: 480, damage: 66, attackInterval: 1.5, windup: 0.5, range: 3.6, armor: 0, speed: 66,
    projectile: { kind: 'javelin', speed: 700 },
    onHit: { id: 'slow', duration: 2, chance: 0.5 },
    text: 'A barbed harpoon. Half the time, whoever it hits is slowed.',
    skill: {
      id: 'reel-in', name: 'Cold Iron', kind: 'strike', cooldown: 8, power: 1.6,
      status: { id: 'mark', duration: 4 },
      text: 'A throw for 160% damage that marks its target.',
    },
  },
  icegolem: {
    name: 'Rime Golem', set: 'frostbound', rarity: 'uncommon', role: 'tank', from: 5,
    hp: 1250, damage: 56, attackInterval: 1.6, windup: 0.55, range: 1.0, armor: 10, speed: 54, scale: 1.1,
    text: 'Ice that learned to walk. Slow to anger, slower to fall.',
    skill: {
      id: 'shatter', name: 'Shatter', kind: 'cleave', cooldown: 9, power: 1.1, area: 1.4,
      status: { id: 'weak', duration: 4 }, windup: 0.7,
      text: 'Bursts its own shell: damage all round, and the struck are left weak.',
    },
  },
  frostwitch: {
    name: 'Frost Witch', set: 'frostbound', rarity: 'rare', role: 'mage', from: 8,
    hp: 450, damage: 54, attackInterval: 1.5, windup: 0.5, range: 3.6, armor: 0, speed: 60,
    projectile: { kind: 'orb-frost', speed: 460 },
    onHit: { id: 'slow', duration: 2 },
    splash: { radius: 0.7, share: 0.5 },
    text: 'Her orbs slow what they touch, and what stands beside it.',
    skill: {
      id: 'deep-freeze', name: 'Deep Freeze', kind: 'hex', cooldown: 13, power: 0.8, area: 1.1,
      status: { id: 'stun', duration: 1.2 }, windup: 0.8,
      text: 'Freezes her target and the enemies near it solid for a moment.',
    },
  },
  jarl: {
    name: 'Jarl of the Rime', set: 'frostbound', rarity: 'legendary', role: 'fighter', from: 15,
    hp: 1750, damage: 92, attackInterval: 1.5, windup: 0.5, range: 1.1, armor: 12, speed: 64, scale: 1.3,
    frenzy: { below: 0.4, haste: 0.3 },
    text: 'Lord of the frozen hall. Wounded, it only swings faster.',
    skill: {
      id: 'winters-wrath', name: "Winter's Wrath", kind: 'cleave', cooldown: 10, power: 1.0, area: 1.7,
      status: { id: 'stun', duration: 0.6 }, windup: 0.7,
      text: 'A great sweep of the hammer: damage and a stun to everyone in reach.',
    },
  },

  // ------------------------------------------------------------ structures: buildings and traps
  // A building never moves and nothing mends it. It does not hold the field
  // alone: a side with no one left who walks has lost, whatever of its still
  // stands. A trap goes off once. Each land has a tower, something that
  // calls up its troops, and a trap of its own; the Crownlands have six.
  palisade: {
    name: 'Palisade', set: 'kingdom', rarity: 'common', role: 'tank', kind: 'building', still: true, place: 'front',
    hp: 1200, damage: 0, attackInterval: 1, windup: 0.3, range: 0, armor: 12, speed: 0, radius: 0.42,
    text: 'A wall of stakes. Whoever comes at it has to break it or go round, and it does nothing else.',
  },
  spiketrap: {
    name: 'Spike Trap', set: 'kingdom', rarity: 'common', role: 'support', kind: 'trap', place: 'front',
    hp: 1, damage: 260, attackInterval: 1, windup: 0.3, range: 0, armor: 0, speed: 0,
    trap: { trigger: 0.6, radius: 1.1 },
    text: 'Lies in the grass. The first enemy to step on it, and whoever is beside them, takes its spikes.',
  },
  beartrap: {
    name: 'Bear Trap', set: 'kingdom', rarity: 'uncommon', role: 'support', kind: 'trap', place: 'front',
    hp: 1, damage: 120, attackInterval: 1, windup: 0.3, range: 0, armor: 0, speed: 0,
    trap: { trigger: 0.6, radius: 0.8, status: { id: 'stun', duration: 2.5 } },
    text: 'Shuts on the first enemy to step on it and holds them there, stunned, for two and a half seconds.',
  },
  watchtower: {
    name: 'Watchtower', set: 'kingdom', rarity: 'uncommon', role: 'ranger', kind: 'building', still: true,
    hp: 560, damage: 48, attackInterval: 1.1, windup: 0.35, range: 4.2, armor: 6, speed: 0, radius: 0.4,
    projectile: { kind: 'arrow', speed: 640 },
    text: 'Shoots whoever comes within four tiles of it. It cannot follow them, so stand it where they will come.',
  },
  barracks: {
    name: 'Barracks', set: 'kingdom', rarity: 'rare', role: 'support', kind: 'building', still: true, place: 'back',
    hp: 760, damage: 0, attackInterval: 1, windup: 0.3, range: 0, armor: 8, speed: 0, radius: 0.44,
    summons: { unit: 'militia', every: 8, cap: 2 },
    text: 'Sends out a Militia every eight seconds, two at a time at most, as strong as the Barracks is.',
  },
  warbanner: {
    name: 'War Banner', set: 'kingdom', rarity: 'rare', role: 'support', kind: 'building', still: true, place: 'back',
    hp: 480, damage: 0, attackInterval: 1, windup: 0.3, range: 0, armor: 4, speed: 0, radius: 0.3,
    aura: { status: { id: 'haste', duration: 3.4 }, radius: 1.9, every: 3 },
    text: 'Everyone of yours within two tiles of it fights faster for as long as it stands.',
  },
  lookout: {
    name: 'Lookout', set: 'raiders', rarity: 'uncommon', role: 'ranger', kind: 'building', still: true, from: 4,
    hp: 500, damage: 42, attackInterval: 1.2, windup: 0.35, range: 4, armor: 4, speed: 0, radius: 0.36,
    projectile: { kind: 'arrow', speed: 600 },
    text: 'A crow\'s nest on a pole. Shoots whoever comes within four tiles.',
  },
  raidertent: {
    name: 'Raider Tent', set: 'raiders', rarity: 'rare', role: 'support', kind: 'building', still: true, place: 'back', from: 8,
    hp: 620, damage: 0, attackInterval: 1, windup: 0.3, range: 0, armor: 4, speed: 0, radius: 0.44,
    summons: { unit: 'cutpurse', every: 8, cap: 2 },
    text: 'A Cutpurse comes out of it every eight seconds, two at a time at most.',
  },
  bramblesnare: {
    name: 'Bramble Snare', set: 'raiders', rarity: 'common', role: 'support', kind: 'trap', place: 'front', from: 3,
    hp: 1, damage: 90, attackInterval: 1, windup: 0.3, range: 0, armor: 0, speed: 0,
    trap: { trigger: 0.6, radius: 0.9, status: { id: 'slow', duration: 4 } },
    text: 'Thorns wound into a ring. Whoever steps in it is cut, and slowed for four seconds.',
  },
  sunobelisk: {
    name: 'Sun Obelisk', set: 'sandsworn', rarity: 'rare', role: 'mage', kind: 'building', still: true, from: 5,
    hp: 560, damage: 44, attackInterval: 1.5, windup: 0.45, range: 4, armor: 8, speed: 0, radius: 0.36,
    projectile: { kind: 'orb-fire', speed: 520 }, onHit: { id: 'burn', duration: 3 },
    text: 'Throws fire at whoever comes within four tiles, and leaves them burning.',
  },
  wartent: {
    name: 'War Tent', set: 'sandsworn', rarity: 'rare', role: 'support', kind: 'building', still: true, place: 'back', from: 8,
    hp: 680, damage: 0, attackInterval: 1, windup: 0.3, range: 0, armor: 4, speed: 0, radius: 0.46,
    summons: { unit: 'lancer', every: 9, cap: 2 },
    text: 'A Lancer rides out of it every nine seconds, two at a time at most.',
  },
  firepit: {
    name: 'Fire Pit', set: 'sandsworn', rarity: 'uncommon', role: 'support', kind: 'trap', place: 'front', from: 3,
    hp: 1, damage: 110, attackInterval: 1, windup: 0.3, range: 0, armor: 0, speed: 0,
    trap: { trigger: 0.6, radius: 1.2, status: { id: 'burn', duration: 4 } },
    text: 'Coals under the sand. It bursts under the first enemy to step on it and sets all near it burning.',
  },
  frostspire: {
    name: 'Frost Spire', set: 'frostbound', rarity: 'rare', role: 'mage', kind: 'building', still: true, from: 4,
    hp: 580, damage: 40, attackInterval: 1.6, windup: 0.45, range: 4, armor: 8, speed: 0, radius: 0.36,
    projectile: { kind: 'orb-frost', speed: 500 }, onHit: { id: 'slow', duration: 2.5 },
    text: 'Throws cold at whoever comes within four tiles, and slows them.',
  },
  longhouse: {
    name: 'Longhouse', set: 'frostbound', rarity: 'rare', role: 'support', kind: 'building', still: true, place: 'back', from: 9,
    hp: 740, damage: 0, attackInterval: 1, windup: 0.3, range: 0, armor: 8, speed: 0, radius: 0.46,
    summons: { unit: 'huscarl', every: 10, cap: 2 },
    text: 'A Huscarl comes out of it every ten seconds, two at a time at most.',
  },
  frostrune: {
    name: 'Frost Rune', set: 'frostbound', rarity: 'uncommon', role: 'support', kind: 'trap', place: 'front', from: 3,
    hp: 1, damage: 100, attackInterval: 1, windup: 0.3, range: 0, armor: 0, speed: 0,
    trap: { trigger: 0.6, radius: 1.1, status: { id: 'stun', duration: 2 } },
    text: 'A sign cut in the ice. It freezes whoever steps on it, and all near them, where they stand.',
  },
};

function build(): Record<string, UnitInfo> {
  const out: Record<string, UnitInfo> = {};
  for (const [id, raw] of Object.entries(RAW)) {
    const power = SETS[raw.set].power;
    const r = (n: number): number => Math.round(n * power);
    out[id] = {
      ...raw,
      id,
      hp: r(raw.hp),
      damage: r(raw.damage),
      armor: r(raw.armor),
      heal: raw.heal ? { amount: r(raw.heal.amount), range: raw.heal.range } : undefined,
    };
  }
  return out;
}

export const UNITS: Readonly<Record<string, UnitInfo>> = build();

/** The units a skirmish draws its enemy team from, and the player's four in one. */
export const SKIRMISH_ROSTER: readonly string[] = ['knight', 'berserker', 'archer', 'mage'];

export function unitDef(id: string): UnitInfo {
  const def = UNITS[id];
  if (!def) throw new Error(`no unit "${id}"`);
  return def;
}

export function unitsOfSet(set: string): UnitInfo[] {
  return Object.values(UNITS).filter((u) => u.set === set);
}

/** Who stands at the front when a team is laid out for the player. */
export function isFrontline(id: string): boolean {
  const def = UNITS[id];
  return def.place ? def.place === 'front' : def.range <= 1.6;
}

/** True for a building or a trap: a structure, a card that is fielded in a structure's place, not among the units. */
export function isStructure(id: string): boolean {
  return !!UNITS[id]?.kind;
}
