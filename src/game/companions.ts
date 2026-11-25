// The companions: creatures and people who fight beside the hero by
// themselves. What each does is steered by pure rules in world.ts, which
// reads the numbers here. A change here is measured with
// `npm run pace -- --band=<id>` before and after.

import type { Feat } from './data';

/**
 * How a companion fights.
 * bite: runs down the nearest enemy to the hero and bites it.
 * orbit: circles the hero and stings what comes close. Nothing can hurt it.
 * guard: walks ahead of the hero, slowly, and snaps at what is near.
 * stoop: flies, and comes down on those who shoot from far off. Nothing can reach it.
 * maul: stays by the hero and strikes everyone round itself.
 * spit: keeps a little off and spits fire at the nearest.
 * banner: stands by the hero and pokes at what comes too close.
 * ram: runs through the thickest of them and walks back.
 */
export type Does = 'bite' | 'orbit' | 'guard' | 'stoop' | 'maul' | 'spit' | 'banner' | 'ram';

/**
 * The rule only one companion has.
 * fetch (Biscuit): brings in coins that lie far off.
 * flare (Pip): flashes when the hero is struck, and stuns those near.
 * bulwark (Mossback): enemies near him go for him, and shots stop on his shell.
 * keen (Quill): what she strikes is marked and takes more from all.
 * roar (Greta): roars when the hero is under half health, and stuns all near her.
 * trail (Ember): the ground burns where it has run.
 * rally (Tam): everyone near the banner strikes faster, and once in a run he gets a fallen hero up.
 * stampede (Thistle): what he throws aside is stunned.
 */
export type AllyQuirk = 'fetch' | 'flare' | 'bulwark' | 'keen' | 'roar' | 'trail' | 'rally' | 'stampede';

export interface CompanionDef {
  id: string;
  /** The figure the kit draws for it. */
  unit: string;
  name: string;
  /** What it is: "a war hound". */
  kind: string;
  does: Does;
  /** What it does, in a line a player reads. */
  says: string;
  quirk: AllyQuirk;
  quirkName: string;
  quirkSays: string;
  /** Health at the hero's first level. 0 is one that nothing can hurt. */
  hp: number;
  /** Harm of one of its blows at the hero's first level, and how much more for each level of the hero. */
  dmg: number;
  grow: number;
  /** Seconds between its blows (for a stoop and a ram: between one and the next). */
  every: number;
  /** How fast it goes. */
  speed: number;
  /** How big it is to whatever touches it. */
  r: number;
  /** How far off it strikes. */
  reach: number;
  /** How far it throws back what it hits. */
  knock: number;
  /** What opens it. */
  unlock: Feat;
}

export const COMPANIONS: readonly CompanionDef[] = [
  {
    id: 'biscuit', unit: 'biscuit', name: 'Biscuit', kind: 'a war hound', does: 'bite', says: 'Runs down the nearest enemy and bites.',
    quirk: 'fetch', quirkName: 'Fetch', quirkSays: 'Brings in coins that lie far off.',
    hp: 24, dmg: 7, grow: 1.3, every: 0.6, speed: 270, r: 12, reach: 10, knock: 4, unlock: { kind: 'runs', runs: 1 },
  },
  {
    id: 'pip', unit: 'pip', name: 'Pip', kind: 'a wisp', does: 'orbit', says: 'Circles the hero and stings what comes close.',
    quirk: 'flare', quirkName: 'Flare', quirkSays: 'When the hero is struck, Pip flashes and stuns those near. It lights the dark.',
    hp: 0, dmg: 4, grow: 0.8, every: 0.7, speed: 2.4, r: 8, reach: 140, knock: 2, unlock: { kind: 'wave', wave: 4 },
  },
  {
    id: 'mossback', unit: 'mossback', name: 'Mossback', kind: 'an old siege turtle', does: 'guard', says: 'Walks ahead, slow, with a great deal of health.',
    quirk: 'bulwark', quirkName: 'Bulwark', quirkSays: 'Enemies near him go for him, and shots stop on his shell.',
    hp: 55, dmg: 3, grow: 0.5, every: 1.3, speed: 82, r: 22, reach: 30, knock: 10, unlock: { kind: 'wave', wave: 8 },
  },
  {
    id: 'quill', unit: 'quill', name: 'Quill', kind: 'an eagle', does: 'stoop', says: 'Stoops on those who shoot from far off.',
    quirk: 'keen', quirkName: 'Keen', quirkSays: 'Whatever she strikes is marked and takes more from all.',
    hp: 0, dmg: 9, grow: 1.5, every: 2.2, speed: 440, r: 12, reach: 14, knock: 8, unlock: { kind: 'kills', kills: 250 },
  },
  {
    id: 'greta', unit: 'greta', name: 'Greta', kind: 'a war bear', does: 'maul', says: 'Mauls everyone round her.',
    quirk: 'roar', quirkName: 'Roar', quirkSays: 'When the hero is under half health she roars, and all near her are stunned.',
    hp: 44, dmg: 6, grow: 1, every: 1.5, speed: 200, r: 20, reach: 52, knock: 22, unlock: { kind: 'boss', boss: 'warlord' },
  },
  {
    id: 'ember', unit: 'ember', name: 'Ember', kind: 'a salamander', does: 'spit', says: 'Spits fire at the nearest.',
    quirk: 'trail', quirkName: 'Trail', quirkSays: 'Where it scurries the ground burns for a moment.',
    hp: 14, dmg: 4, grow: 0.7, every: 1.6, speed: 210, r: 11, reach: 300, knock: 3, unlock: { kind: 'coins', coins: 350 },
  },
  {
    id: 'tam', unit: 'tam', name: 'Tam', kind: 'a squire with the banner', does: 'banner', says: 'Stands by the hero with the colors up.',
    quirk: 'rally', quirkName: 'Rally', quirkSays: 'Everyone near the banner strikes faster. Once in a run he drags a fallen hero back to their feet.',
    hp: 24, dmg: 3, grow: 0.5, every: 1.2, speed: 220, r: 12, reach: 44, knock: 8, unlock: { kind: 'wave', wave: 15 },
  },
  {
    id: 'thistle', unit: 'thistle', name: 'Thistle', kind: 'a great stag', does: 'ram', says: 'Charges through the line and scatters it.',
    quirk: 'stampede', quirkName: 'Stampede', quirkSays: 'What he throws aside is stunned.',
    hp: 32, dmg: 8, grow: 1.4, every: 3.2, speed: 190, r: 18, reach: 26, knock: 30, unlock: { kind: 'kills', kills: 2500 },
  },
];

/** The numbers every companion shares. */
export const BAND = {
  /** The most places in a band that the Hold opens. A hero's quirk may add one. */
  places: 2,
  /** The share of the hero's Damage and Haste that counts for a companion. */
  share: 0.5,
  /** How much more health a companion has for each level of the hero. */
  hpGrow: 0.1,
  /** The steps of a bond, and how much more health and harm each is. */
  bonds: 3,
  bond: 0.25,
  /** The chance that one of a level's choices is a bond, while a companion on the run has a step left. */
  bondChance: 0.3,
  /** The share of a blow a companion takes: they are in the thick of it far more than the hero. */
  takes: 0.62,
  /** Seconds a companion cannot be hurt again after a blow. */
  grace: 0.8,
  /** Seconds one that was struck down sits out, and the share of its health it gets up with. */
  down: 8,
  rises: 0.5,
  /** How far from the hero a companion goes after an enemy. */
  leash: 340,
} as const;

/** The numbers of each companion's quirk. `bond` is what each step of its bond adds, where the quirk grows. */
export const ALLY_QUIRKS = {
  fetch: {
    /** Seconds between one coin fetched and the next, and how much less for each step of the bond. */
    every: 2.5,
    bond: 0.5,
    /** Only a coin that has lain this long, and is further from the hero than they gather from, is fetched. */
    lain: 0.8,
  },
  flare: {
    /** How wide the flash is, seconds it stuns, and seconds before Pip can flash again. */
    r: 150,
    stun: 1.5,
    every: 6,
    bond: 1,
  },
  bulwark: {
    /** How near him enemies turn on him, and how much further for each step of the bond. */
    r: 135,
    bond: 25,
    /** The share of a shot's harm he takes when it stops on his shell. */
    shell: 0.34,
  },
  keen: {
    /** Seconds her mark lasts, and how much more the marked take; more for each step of the bond. */
    seconds: 5,
    more: 0.25,
    bond: 0.05,
  },
  roar: {
    /** How wide, seconds it stuns, and seconds before she can roar again. */
    r: 190,
    stun: 1.6,
    every: 14,
    bond: 2.5,
    /** The share of the hero's health under which she roars. */
    under: 0.5,
  },
  trail: {
    /** How wide the fire it leaves is, seconds it burns, and the share of its spit's harm it does a second. */
    r: 24,
    seconds: 1.5,
    harm: 0.8,
    /** Seconds between one patch of fire and the next as it runs. */
    every: 0.3,
  },
  rally: {
    /** How near the banner counts, and how much more often the hero strikes there; more for each step of the bond. */
    r: 170,
    faster: 0.06,
    bond: 0.03,
    /** The share of their health a hero is dragged back with, and the seconds nothing can hurt them after. */
    rises: 0.25,
    grace: 1.5,
  },
  stampede: {
    /** How fast he charges, for how long at most, and seconds what he throws aside is stunned; more for each step of the bond. */
    dash: 520,
    seconds: 0.9,
    stun: 1,
    bond: 0.3,
  },
} as const;
