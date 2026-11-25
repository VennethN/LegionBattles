// The kinds of weapon. Every weapon is of one kind or two, and holding
// two, three and four of a kind gives that kind's gift, which grows at each
// step. A hero's own weapon counts. It is what makes a run a build: a
// fourth blade is worth more to a hero with three than a better axe.
//
// The part of a gift that is a plain stat (critical blows, mending, lore)
// goes into the run's stats (run.ts, `statLines`), so that the camp shows
// it with the rest. The part that bends how weapons work, the wave applies
// (world.ts), from what it is handed to fight with.

import type { StatLine } from './stats';

export type Kind = 'blade' | 'pole' | 'blunt' | 'bow' | 'thrown' | 'fire' | 'frost' | 'holy' | 'venom' | 'arcane';

/** How many of a kind have to be held for each step of its gift. */
export const KIND_STEPS = [2, 3, 4] as const;

/** The numbers of each kind's gift, at its three steps. */
export const GIFTS = {
  /** Blades find the gap: critical chance, for everything the hero strikes with. */
  blade: { crit: [5, 10, 18] },
  /** Poles keep them off: everything reaches this share further, and at the last step a thrust goes through this many more. */
  pole: { reach: [0.12, 0.2, 0.3], thrust: [0, 0, 1] },
  /** Blunt things daze: stuns last this many seconds longer, and blows throw back this much further. */
  blunt: { stun: [0.2, 0.35, 0.5], knock: [1.2, 1.35, 1.5] },
  /** Bows are quick: what shoots or is thrown strikes this much more often, counted as Haste. */
  bow: { haste: [8, 15, 25] },
  /** Thrown things skip: this many more leaps for what is thrown straight, and bursts this much wider. */
  thrown: { leaps: [1, 1, 2], burst: [1, 1.15, 1.15] },
  /** Fire keeps burning: this many seconds longer, and at the last step this much hotter. */
  fire: { more: [1, 2, 3], by: [1, 1, 1.3] },
  /** Cold bites deeper: slowing takes this much more of their speed, for this many seconds longer. */
  frost: { by: [0.08, 0.14, 0.2], more: [0.5, 1, 1.5] },
  /** Holy things mend: this much Mending. */
  holy: { regen: [2, 4, 7] },
  /** Venom spreads: clouds are this much wider and do this much more. */
  venom: { r: [1.15, 1.25, 1.4], harm: [1.15, 1.3, 1.5] },
  /** The arcane is learned: this much Lore, and at the last step every so-many-th spell does not have to be waited for. */
  arcane: { lore: [2, 4, 7], free: [0, 0, 5] },
} as const;

export interface KindDef {
  id: Kind;
  name: string;
  /** What the gift gives at each of its three steps, in words a player reads. */
  says: readonly [string, string, string];
}

const pct = (n: number): string => `${Math.round(n * 100)}%`;

export const KINDS: readonly KindDef[] = [
  { id: 'blade', name: 'Blade', says: GIFTS.blade.crit.map((c) => `+${c}% Crit Chance`) as [string, string, string] },
  { id: 'pole', name: 'Polearm', says: [`+${pct(GIFTS.pole.reach[0])} Range for all weapons`, `+${pct(GIFTS.pole.reach[1])} Range for all weapons`, `+${pct(GIFTS.pole.reach[2])} Range, and thrusts hit 1 more enemy`] },
  { id: 'blunt', name: 'Blunt', says: GIFTS.blunt.stun.map((s, i) => `Stuns last ${s} s longer, +${pct(GIFTS.blunt.knock[i] - 1)} knockback`) as [string, string, string] },
  { id: 'bow', name: 'Bow', says: GIFTS.bow.haste.map((h) => `+${h}% Attack Speed for ranged weapons`) as [string, string, string] },
  { id: 'thrown', name: 'Thrown', says: ['Thrown weapons bounce to 1 more enemy', 'Bounce to 1 more enemy, explosions 15% wider', 'Bounce to 2 more enemies, explosions 15% wider'] },
  { id: 'fire', name: 'Fire', says: ['Burns last 1 s longer', 'Burns last 2 s longer', 'Burns last 3 s longer and deal 30% more damage'] },
  { id: 'frost', name: 'Frost', says: GIFTS.frost.by.map((b, i) => `Slows are ${pct(b)} stronger and last ${GIFTS.frost.more[i]} s longer`) as [string, string, string] },
  { id: 'holy', name: 'Holy', says: GIFTS.holy.regen.map((r) => `+${r} HP Regen`) as [string, string, string] },
  { id: 'venom', name: 'Poison', says: GIFTS.venom.r.map((r, i) => `Poison clouds are ${pct(r - 1)} wider and deal ${pct(GIFTS.venom.harm[i] - 1)} more damage`) as [string, string, string] },
  { id: 'arcane', name: 'Arcane', says: [`+${GIFTS.arcane.lore[0]} Magic Damage`, `+${GIFTS.arcane.lore[1]} Magic Damage`, `+${GIFTS.arcane.lore[2]} Magic Damage, and every ${GIFTS.arcane.free[2]}th spell has no cooldown`] },
];

export type KindCounts = Record<Kind, number>;

/** How many of each kind are among these weapons. */
export function countKinds(weapons: ReadonlyArray<{ kinds: readonly Kind[] }>): KindCounts {
  const counts = Object.fromEntries(KINDS.map((k) => [k.id, 0])) as KindCounts;
  for (const w of weapons) for (const k of new Set(w.kinds)) counts[k]++;
  return counts;
}

/** The step of a kind's gift that this many of it give: 0 for none, 3 for all of it. */
export function kindStep(held: number): number {
  return KIND_STEPS.filter((n) => held >= n).length;
}

/** What the kinds held do to how weapons work in a wave. With nothing held, every number here changes nothing. */
export interface Gifts {
  /** Everything reaches this share further. */
  reach: number;
  /** A thrust goes through this many more. */
  thrust: number;
  /** Seconds longer a weapon's stun lasts, and how many times as far a blow throws back. */
  stun: number;
  knock: number;
  /** Haste for what shoots or is thrown. */
  bowHaste: number;
  /** More leaps for what is thrown straight, and how many times as wide bursts are. */
  leaps: number;
  burst: number;
  /** Seconds longer fires burn, and how many times as hot. */
  burnMore: number;
  burnBy: number;
  /** How much more of their speed slowing takes, and for how many seconds longer. */
  slowBy: number;
  slowMore: number;
  /** How many times as wide clouds are, and how many times the harm. */
  cloudR: number;
  cloudBy: number;
  /** Every this many spells one is cast at once, or 0. */
  free: number;
}

const at = (list: readonly number[], step: number, none: number): number => (step > 0 ? list[step - 1] : none);

export function giftsOf(c: KindCounts): Gifts {
  const s = (k: Kind): number => kindStep(c[k]);
  return {
    reach: at(GIFTS.pole.reach, s('pole'), 0),
    thrust: at(GIFTS.pole.thrust, s('pole'), 0),
    stun: at(GIFTS.blunt.stun, s('blunt'), 0),
    knock: at(GIFTS.blunt.knock, s('blunt'), 1),
    bowHaste: at(GIFTS.bow.haste, s('bow'), 0),
    leaps: at(GIFTS.thrown.leaps, s('thrown'), 0),
    burst: at(GIFTS.thrown.burst, s('thrown'), 1),
    burnMore: at(GIFTS.fire.more, s('fire'), 0),
    burnBy: at(GIFTS.fire.by, s('fire'), 1),
    slowBy: at(GIFTS.frost.by, s('frost'), 0),
    slowMore: at(GIFTS.frost.more, s('frost'), 0),
    cloudR: at(GIFTS.venom.r, s('venom'), 1),
    cloudBy: at(GIFTS.venom.harm, s('venom'), 1),
    free: at(GIFTS.arcane.free, s('arcane'), 0),
  };
}

/** The part of the gifts that is plain stats: it goes into the run's own. */
export function giftLine(c: KindCounts): StatLine {
  const line: StatLine = {};
  const crit = at(GIFTS.blade.crit, kindStep(c.blade), 0);
  const regen = at(GIFTS.holy.regen, kindStep(c.holy), 0);
  const lore = at(GIFTS.arcane.lore, kindStep(c.arcane), 0);
  if (crit) line.crit = crit;
  if (regen) line.regen = regen;
  if (lore) line.lore = lore;
  return line;
}
