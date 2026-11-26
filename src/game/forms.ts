// What a weapon becomes past tier IV, and the small rules some wares carry.
//
// A run fills its six slots and holds a handful of relics by wave 10 or so,
// and a hundred waves need something to chase after that. So two tier IV
// weapons of the same kind merge into a fifth form, tier V, with a name of
// its own and one new rule; and each land's shop sells two wares no other
// shop has, each with a small rule of its own. Both are written here as one
// kind of thing, an effect a blow can carry, so that the wave (world.ts)
// works them all out in one place.

/**
 * Something a landed blow does besides its harm. Every kind is seen on the field:
 *
 * - `burst`: every `every`-th blow bursts round the one struck, for `share` of the blow, `r` wide.
 * - `chain`: a blow jumps to the nearest other enemy within `r`, for `share` of it.
 * - `stun`: every `every`-th blow stuns for `secs`.
 * - `slow`: a blow slows by `by` for `secs`.
 * - `burn`: a blow sets alight, `per` harm a second for `secs`.
 * - `mark`: a blow marks for `secs`: the marked take `by` more from everything.
 * - `pull`: a blow drags the enemies within `r` in toward the one struck.
 * - `mend`: a kill gives `heal` health back, no faster than the wave's own leech.
 * - `coin`: a kill drops a coin, at `chance`.
 * - `echo`: every `every`-th strike is struck twice. Only a weapon's fifth form has this: it is a strike, not a blow.
 */
export type FxKind = 'burst' | 'chain' | 'stun' | 'slow' | 'burn' | 'mark' | 'pull' | 'mend' | 'coin' | 'echo';

export interface Fx {
  kind: FxKind;
  /** Every how many blows (or strikes, for an echo). Left out, every one. */
  every?: number;
  /** A share of the blow's harm. */
  share?: number;
  /** How far, in the field's units. */
  r?: number;
  /** Seconds. */
  secs?: number;
  /** A share: how much slower, or how much more the marked take. */
  by?: number;
  /** Harm a second, for a burn. */
  per?: number;
  /** Health a kill gives back. */
  heal?: number;
  /** A chance, 0 to 1. */
  chance?: number;
}

export interface FifthForm {
  /** Its name as tier V. */
  name: string;
  /** What its new rule does, in a line a player reads. */
  says: string;
  fx: Fx;
}

/** The index of tier V: the tier two tier IV weapons merge into. The shop never offers it. */
export const FIFTH = 4;

/** How much more a fifth form's numbers are than its fourth's: harm up, the wait down. */
export const FIFTH_STEP = {
  /** Harm, and a burn's, a cloud's, a mace's mending, holy ground: a fourth form's times this. */
  more: 1.4,
  /** Seconds between strikes: a fourth form's times this. */
  every: 0.9,
  /** What a fifth form sells for and is worth, as the tiers' price steps go. */
  price: 16,
};

/** Every weapon's fifth form, by the weapon's id. Each has one rule a player sees on the field. */
export const FIFTH_FORMS: Readonly<Record<string, FifthForm>> = {
  sword: { name: 'Oathblade', says: 'Every 3rd sweep swings twice.', fx: { kind: 'echo', every: 3 } },
  dagger: { name: 'Nightfang', says: 'Hits mark the enemy: it takes 20% more from everything for 3 s.', fx: { kind: 'mark', by: 0.2, secs: 3 } },
  spear: { name: 'Skewer', says: 'Every 4th thrust stuns for 0.6 s.', fx: { kind: 'stun', every: 4, secs: 0.6 } },
  greataxe: { name: 'Headsman', says: 'Every 3rd hit bursts for 50% of its damage around the enemy.', fx: { kind: 'burst', every: 3, share: 0.5, r: 70 } },
  hammer: { name: 'Earthbreaker', says: 'Every 2nd slam sends an aftershock for 40% of its damage.', fx: { kind: 'burst', every: 2, share: 0.4, r: 95 } },
  torch: { name: 'Bonfire Brand', says: 'Hits burn for 8 damage a second for 3 s.', fx: { kind: 'burn', per: 8, secs: 3 } },
  bow: { name: "Hunter's Moon", says: 'Every 3rd shot is shot twice.', fx: { kind: 'echo', every: 3 } },
  crossbow: { name: 'Siegebow', says: 'Every 3rd bolt stuns for 0.5 s.', fx: { kind: 'stun', every: 3, secs: 0.5 } },
  javelin: { name: 'Skyspear', says: 'Hits jump to one more enemy for 50% damage.', fx: { kind: 'chain', share: 0.5, r: 120 } },
  sling: { name: "Giant's Sling", says: 'Hits mark the enemy: it takes 15% more from everything for 4 s.', fx: { kind: 'mark', by: 0.15, secs: 4 } },
  bomb: { name: 'Thunder Keg', says: 'Every blast sends an aftershock for 30% of its damage.', fx: { kind: 'burst', share: 0.3, r: 85 } },
  staff: { name: "Archmage's Rod", says: 'Every 2nd bolt is cast twice.', fx: { kind: 'echo', every: 2 } },
  brazier: { name: 'Sunfurnace', says: 'Hits burn for 12 damage a second for 3 s.', fx: { kind: 'burn', per: 12, secs: 3 } },
  frost: { name: 'Heart of Winter', says: 'Every 4th hit freezes the enemy for 0.8 s.', fx: { kind: 'stun', every: 4, secs: 0.8 } },
  venom: { name: 'Plague Bloom', says: 'Hits jump to one more enemy for 40% damage.', fx: { kind: 'chain', share: 0.4, r: 110 } },
  censer: { name: 'Choir Censer', says: 'Kills heal you 2 HP.', fx: { kind: 'mend', heal: 2 } },
  halberd: { name: "Warden's Glaive", says: 'Hits drag nearby enemies in toward the one struck.', fx: { kind: 'pull', r: 110 } },
  trident: { name: 'Tidecaller', says: 'Hits jump to one more enemy for 50% damage.', fx: { kind: 'chain', share: 0.5, r: 120 } },
  mace: { name: "Saint's Mace", says: 'Kills heal you 2 HP.', fx: { kind: 'mend', heal: 2 } },
  longbow: { name: 'Warbow of Ages', says: 'Hits jump to one more enemy for 60% damage.', fx: { kind: 'chain', share: 0.6, r: 140 } },
  rimebow: { name: 'Glacier Bow', says: 'Every 3rd arrow freezes the enemy for 0.7 s.', fx: { kind: 'stun', every: 3, secs: 0.7 } },
  blowpipe: { name: 'Nightshade Pipe', says: 'Hits mark the enemy: it takes 25% more from everything for 3 s.', fx: { kind: 'mark', by: 0.25, secs: 3 } },
  hatchet: { name: 'Whirling Axes', says: 'Every 2nd throw is thrown twice.', fx: { kind: 'echo', every: 2 } },
  hail: { name: 'Stormcloud', says: 'Every 2nd hit bursts for 35% of its damage around the enemy.', fx: { kind: 'burst', every: 2, share: 0.35, r: 70 } },
  holywater: { name: 'Font of Dawn', says: 'Kills heal you 2 HP.', fx: { kind: 'mend', heal: 2 } },
  gourd: { name: 'Rot Gourd', says: 'Every 2nd hit bursts for 35% of its damage around the enemy.', fx: { kind: 'burst', every: 2, share: 0.35, r: 80 } },
  sunbrand: { name: 'Noonblade', says: 'Hits burn for 10 damage a second for 3 s.', fx: { kind: 'burn', per: 10, secs: 3 } },
  fang: { name: 'Viper King', says: 'Kills drop a coin 25% of the time.', fx: { kind: 'coin', chance: 0.25 } },
  wand: { name: 'Stormwand', says: 'Hits jump to one more enemy for 70% damage.', fx: { kind: 'chain', share: 0.7, r: 140 } },
};

/** A weapon's fifth form, or null if it has none (a hero's own weapon does not take one). */
export function fifthOf(id: string): FifthForm | null {
  return FIFTH_FORMS[id] ?? null;
}

/** Four tiers of numbers, and the fifth worked out from the fourth by `k`. */
export function withFifth(four: readonly number[], k: number): number[] {
  return four.length > FIFTH ? [...four] : [...four, Math.round(four[FIFTH - 1] * k * 100) / 100];
}
