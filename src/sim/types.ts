// What a unit is to the simulation, what goes into a battle and what comes
// out of it. Nothing here knows about drawing.

export type Role = 'tank' | 'fighter' | 'ranger' | 'mage' | 'support';

/** Lasting effects on a unit. See STATUS in status.ts for what each does. */
export type StatusId =
  | 'burn'
  | 'poison'
  | 'stun'
  | 'slow'
  | 'haste'
  | 'rage'
  | 'weak'
  | 'mark'
  | 'shield'
  | 'regen';

export interface StatusApply {
  id: StatusId;
  /** Seconds. */
  duration: number;
  /** What the status's number is, where it has one. Its default if left out. */
  power?: number;
  /** 0 to 1. Always, if left out. */
  chance?: number;
}

/**
 * What a skill does.
 *  strike  one enemy, harder
 *  cleave  every enemy around the unit itself
 *  blast   every enemy around the target
 *  volley  several enemies at once, one shot each
 *  drain   one enemy, and the unit is healed by a share of the damage
 *  mend    heals allies around the unit (or the one worst hurt)
 *  boon    a helpful status on the unit and the allies around it
 *  hex     a harmful status on the target and the enemies around it
 */
export type SkillKind = 'strike' | 'cleave' | 'blast' | 'volley' | 'drain' | 'mend' | 'boon' | 'hex';

export interface SkillDef {
  id: string;
  name: string;
  kind: SkillKind;
  /** Seconds between uses. */
  cooldown: number;
  /** Seconds before the first use. Half the cooldown if left out. */
  first?: number;
  /** Times the unit's damage (or its heal, for mend). */
  power?: number;
  /** Tiles: how far around the target or the unit it reaches. */
  area?: number;
  /** For volley: how many enemies. */
  targets?: number;
  /** For drain: the share of damage that comes back as health. */
  share?: number;
  /** A status the skill leaves on what it touches. */
  status?: StatusApply;
  /** Seconds from starting the skill to it landing. The unit's own windup if left out. */
  windup?: number;
  /** What flies, for a skill that shoots something other than the unit's usual shot. */
  projectile?: string;
  /** One line for the unit's card. */
  text: string;
}

export interface UnitDef {
  id: string;
  name: string;
  role: Role;
  hp: number;
  damage: number;
  /** Seconds from one attack's start to the next. */
  attackInterval: number;
  /** Seconds from an attack's start to the blow landing or the shot leaving. */
  windup: number;
  /** Tiles, center to center. About 1 is melee. */
  range: number;
  /** Taken off every hit, which still does at least 1. */
  armor: number;
  /** Pixels a second. */
  speed: number;
  /** Tiles: how much room the unit takes. 0.3 if left out. */
  radius?: number;
  /** Set for a unit that shoots: what flies and how fast, in pixels a second. */
  projectile?: { kind: string; speed: number };
  /** Enemies this near the target, in tiles, take this share of the damage too. */
  splash?: { radius: number; share: number };
  /** A healer: mends the worst-hurt ally in range instead of attacking, when one is hurt. */
  heal?: { amount: number; range: number };
  /** A status every basic attack leaves. */
  onHit?: StatusApply;
  /** Attacks this much faster while health is below this share. */
  frenzy?: { below: number; haste: number };
  skill?: SkillDef;
  /** One line for the unit's card. */
  text?: string;
}

export interface Placement {
  unit: string;
  col: number;
  row: number;
  /** Multipliers from a card's level and grade. 1 if left out. */
  hpMult?: number;
  damageMult?: number;
}

export interface BattleInput {
  seed: number;
  defs: Readonly<Record<string, UnitDef>>;
  /** Team 0 is the player's, on the left. Team 1 is the enemy's. */
  teams: readonly [readonly Placement[], readonly Placement[]];
}

export type EventType =
  | 'moveStart'
  | 'moveEnd'
  | 'attackStart'
  | 'impact'
  | 'projectileLaunch'
  | 'projectileHit'
  | 'damage'
  | 'heal'
  | 'death'
  | 'skill'
  | 'status'
  | 'statusEnd'
  | 'battleEnd';

/**
 * Something that happened, stamped with the simulation's time. One shape for
 * all of them, so that the simulation can reuse the objects.
 *
 *  moveStart, moveEnd   unit
 *  attackStart          unit, target, amount = seconds until impact, kind = 'attack' | 'heal' | skill id
 *  impact               unit, target (-1 if the blow met nothing), kind as attackStart
 *  projectileLaunch     id, unit, target, x, y, kind = what flies
 *  projectileHit        id, unit, target (-1 if it met nothing), x, y, kind
 *  damage               unit = who dealt it (-1 for none), target, amount, kind = 'attack' | 'splash' | skill id | status id
 *  heal                 unit, target, amount
 *  death                unit = who died, target = who killed it (-1 for none)
 *  skill                unit, target, kind = skill id
 *  status, statusEnd    unit = who has it, target = who gave it, kind = status id, amount = seconds
 *  battleEnd            amount = winning team, or -1 for a draw
 */
export interface BattleEvent {
  t: number;
  type: EventType;
  unit: number;
  target: number;
  amount: number;
  x: number;
  y: number;
  id: number;
  kind: string;
}
