// The companions: creatures and people who fight beside the hero by
// themselves. What each does is steered by pure rules in world.ts, which
// reads the numbers here. A change here is measured with
// `npm run pace -- --band=<id>` before and after.

import type { DeedTest } from './holdData';

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
 * mend: stays by the hero and heals them now and then.
 * chill: walks by the hero; enemies near it are slowed.
 * ward: stands by the hero and punches what comes close.
 * shell: stays behind the hero and lobs a shell where they are thickest. The ground is marked first.
 * swarm: lets bees loose on the nearest group: a poison cloud.
 * grab: holds the toughest enemy near the hero still, and pinches it.
 * hunt: runs down the weakest enemy on the field.
 * burrow: digs under the nearest enemy and bursts up, throwing those round it.
 */
export type Does = 'bite' | 'orbit' | 'guard' | 'stoop' | 'maul' | 'spit' | 'banner' | 'ram' | 'mend' | 'chill' | 'ward' | 'shell' | 'swarm' | 'grab' | 'hunt' | 'burrow';

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
 * tonic (Nettle): once a wave, when the hero is nearly down, a big heal.
 * snap (Rime): now and then freezes every enemy near it.
 * aegis (Clank): now and then a ward that stops the next blow on the hero.
 * powder (Boom): its shells throw enemies back and stun them.
 * honey (Hive): now and then drops a heart by the hero.
 * hardshell (Snap): takes less from every blow.
 * cull (Smoke): its bite kills an enemy that is nearly dead.
 * treasure (Gilt): what it digs up may be a coin.
 */
export type AllyQuirk = 'fetch' | 'flare' | 'bulwark' | 'keen' | 'roar' | 'trail' | 'rally' | 'stampede' | 'tonic' | 'snap' | 'aegis' | 'powder' | 'honey' | 'hardshell' | 'cull' | 'treasure';

/**
 * How a companion is unlocked. The owner, of 25 November 2026: "some of
 * them by completing waves, some of them by doing specific things/ hidden
 * things, you can also get them by collecting them in game (random drop)".
 * start: there from the beginning.
 * wave: the best wave ever cleared, with any hero.
 * deed: a thing to do, told.
 * hidden: a thing to do, not told: the player has a riddle.
 * found: met in a run, in a cage on the field, from a wave on: breaking it unlocks the companion for good.
 */
export type Route =
  | { kind: 'start' }
  | { kind: 'wave'; wave: number }
  | { kind: 'deed'; test: DeedTest; says: string }
  | { kind: 'hidden'; test: DeedTest; riddle: string }
  | { kind: 'found'; from: number };

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
  /** How it is unlocked. */
  unlock: Route;
}

export const COMPANIONS: readonly CompanionDef[] = [
  {
    id: 'biscuit', unit: 'biscuit', name: 'Biscuit', kind: 'a war hound', does: 'bite', says: 'Chases the nearest enemy and bites it.',
    quirk: 'fetch', quirkName: 'Fetch', quirkSays: 'Fetches coins that are far from you.',
    hp: 24, dmg: 7, grow: 1.3, every: 0.6, speed: 270, r: 12, reach: 10, knock: 4, unlock: { kind: 'start' },
  },
  {
    id: 'pip', unit: 'pip', name: 'Pip', kind: 'a wisp', does: 'orbit', says: 'Circles you and stings enemies that come close.',
    quirk: 'flare', quirkName: 'Flare', quirkSays: 'When you are hit, Pip stuns nearby enemies for 1.5 s (once every 6 s). Lights up the dark.',
    hp: 0, dmg: 4, grow: 0.8, every: 0.7, speed: 2.4, r: 8, reach: 140, knock: 2, unlock: { kind: 'wave', wave: 5 },
  },
  {
    id: 'mossback', unit: 'mossback', name: 'Mossback', kind: 'an old siege turtle', does: 'guard', says: 'Slow, with a lot of HP. Walks ahead of you.',
    quirk: 'bulwark', quirkName: 'Bulwark', quirkSays: 'Nearby enemies attack him instead of you. His shell blocks shots.',
    hp: 55, dmg: 3, grow: 0.5, every: 1.3, speed: 82, r: 22, reach: 30, knock: 10, unlock: { kind: 'wave', wave: 20 },
  },
  {
    id: 'quill', unit: 'quill', name: 'Quill', kind: 'an eagle', does: 'stoop', says: 'Dives on enemies that shoot from range.',
    quirk: 'keen', quirkName: 'Keen', quirkSays: 'Enemies she hits are marked for 5 s and take 25% more damage.',
    hp: 0, dmg: 9, grow: 1.5, every: 2.2, speed: 440, r: 12, reach: 14, knock: 8, unlock: { kind: 'wave', wave: 12 },
  },
  {
    id: 'greta', unit: 'greta', name: 'Greta', kind: 'a war bear', does: 'maul', says: 'Mauls every enemy around her.',
    quirk: 'roar', quirkName: 'Roar', quirkSays: 'When you drop below 50% HP, she roars and stuns nearby enemies for 1.6 s (once every 14 s).',
    hp: 44, dmg: 6, grow: 1, every: 1.5, speed: 200, r: 20, reach: 52, knock: 22, unlock: { kind: 'deed', test: { kind: 'boss', boss: 'warlord' }, says: 'Beat the boss of wave 10.' },
  },
  {
    id: 'ember', unit: 'ember', name: 'Ember', kind: 'a salamander', does: 'spit', says: 'Spits fire at the nearest enemy.',
    quirk: 'trail', quirkName: 'Trail', quirkSays: 'Leaves a short trail of fire where it runs.',
    hp: 14, dmg: 4, grow: 0.7, every: 1.6, speed: 210, r: 11, reach: 300, knock: 3, unlock: { kind: 'deed', test: { kind: 'coins', coins: 350 }, says: 'Collect 350 coins in one run.' },
  },
  {
    id: 'tam', unit: 'tam', name: 'Tam', kind: 'a squire with the banner', does: 'banner', says: 'Stays near you with the banner raised.',
    quirk: 'rally', quirkName: 'Rally', quirkSays: 'You and companions near the banner attack 6% faster. Once per run, he revives you at 25% HP.',
    hp: 24, dmg: 3, grow: 0.5, every: 1.2, speed: 220, r: 12, reach: 44, knock: 8, unlock: { kind: 'wave', wave: 35 },
  },
  {
    id: 'thistle', unit: 'thistle', name: 'Thistle', kind: 'a great stag', does: 'ram', says: 'Charges through enemies and scatters them.',
    quirk: 'stampede', quirkName: 'Stampede', quirkSays: 'Enemies he knocks aside are stunned for 1 s.',
    hp: 32, dmg: 8, grow: 1.4, every: 3.2, speed: 190, r: 18, reach: 26, knock: 30, unlock: { kind: 'deed', test: { kind: 'kills', kills: 2500 }, says: 'Kill 2500 enemies in total.' },
  },
  {
    id: 'nettle', unit: 'leecher', name: 'Nettle', kind: 'a hedge herbalist', does: 'mend', says: 'Stays by you and heals you every 6 s.',
    quirk: 'tonic', quirkName: 'Tonic', quirkSays: 'Once per wave, when you drop below 30% HP, heals you for 20% of your Max HP.',
    hp: 18, dmg: 3, grow: 0.4, every: 1.1, speed: 220, r: 11, reach: 30, knock: 4,
    unlock: { kind: 'hidden', test: { kind: 'brink' }, riddle: 'I come to those who nearly fell, and stood.' },
  },
  {
    id: 'rime', unit: 'icegolem', name: 'Rime', kind: 'a small ice golem', does: 'chill', says: 'Walks by you. Enemies near it are slowed by 35%.',
    quirk: 'snap', quirkName: 'Cold Snap', quirkSays: 'Every 10 s, freezes every enemy near it for 1 s.',
    hp: 40, dmg: 5, grow: 0.9, every: 1.4, speed: 150, r: 18, reach: 36, knock: 12, unlock: { kind: 'found', from: 31 },
  },
  {
    id: 'clank', unit: 'automaton', name: 'Clank', kind: 'a clockwork guard', does: 'ward', says: 'Stands by you and punches enemies that come close.',
    quirk: 'aegis', quirkName: 'Aegis', quirkSays: 'Every 9 s, gives you a ward that blocks the next hit completely.',
    hp: 46, dmg: 6, grow: 1, every: 1.6, speed: 170, r: 20, reach: 40, knock: 18,
    unlock: { kind: 'hidden', test: { kind: 'tier' }, riddle: 'Make one perfect thing, and I will wake.' },
  },
  {
    id: 'boom', unit: 'cannon', name: 'Boom', kind: 'a little field gun', does: 'shell', says: 'Stays behind you. Every 3.2 s, fires a shell where enemies are thickest.',
    quirk: 'powder', quirkName: 'Big Powder', quirkSays: 'Its shells knock enemies far back and stun them for 0.5 s.',
    hp: 30, dmg: 10, grow: 1.6, every: 3.2, speed: 150, r: 18, reach: 520, knock: 40, unlock: { kind: 'found', from: 51 },
  },
  {
    id: 'hive', unit: 'beekeeper', name: 'Hive', kind: 'a beekeeper', does: 'swarm', says: 'Every 4 s, sends bees at the nearest group: a poison cloud for 3 s.',
    quirk: 'honey', quirkName: 'Honey', quirkSays: 'Every 20 s, drops a heart near you.',
    hp: 20, dmg: 3, grow: 0.5, every: 4, speed: 210, r: 12, reach: 360, knock: 0, unlock: { kind: 'found', from: 6 },
  },
  {
    id: 'snap', unit: 'reefcrab', name: 'Snap', kind: 'a reef crab', does: 'grab', says: 'Grabs the toughest enemy near you and holds it still for 2 s.',
    quirk: 'hardshell', quirkName: 'Hard Shell', quirkSays: 'Takes 40% less damage.',
    hp: 38, dmg: 6, grow: 1.1, every: 0.5, speed: 180, r: 18, reach: 14, knock: 0, unlock: { kind: 'found', from: 41 },
  },
  {
    id: 'smoke', unit: 'direwolf', name: 'Smoke', kind: 'a grey wolf', does: 'hunt', says: 'Runs down the weakest enemy on the field.',
    quirk: 'cull', quirkName: 'Cull', quirkSays: 'Its bite kills any enemy below 20% HP. Not bosses.',
    hp: 26, dmg: 8, grow: 1.4, every: 0.8, speed: 330, r: 14, reach: 10, knock: 4,
    unlock: { kind: 'hidden', test: { kind: 'clean', waves: 3 }, riddle: 'Run three waves where nothing touches you.' },
  },
  {
    id: 'gilt', unit: 'scarab', name: 'Gilt', kind: 'a golden beetle', does: 'burrow', says: 'Every 4 s, digs under the nearest enemy and bursts up, stunning enemies around it for 0.5 s.',
    quirk: 'treasure', quirkName: 'Treasure', quirkSays: 'Each burst has a 35% chance to dig up a coin.',
    hp: 30, dmg: 7, grow: 1.2, every: 4, speed: 230, r: 14, reach: 60, knock: 16, unlock: { kind: 'found', from: 21 },
  },
];

/**
 * Slots for companions, opened by the best wave ever cleared with any hero.
 * The owner: "rework companions into slots that you unlock as you get
 * further into the waves (best wave) up to a max of 6 companions". The
 * first is open from the start; each wave here opens one more.
 */
export const SLOT_WAVES: readonly number[] = [0, 10, 25, 40, 60, 80];

/** How a found companion turns up: a cage on the field, in a wave that is not the stray's road, at most once a run. */
export const FOUND = {
  /** The chance of a cage in a wave, once a found companion who is still locked may be met there. */
  chance: 0.1,
  /** Seconds into the wave the cage is marked. */
  at: 9,
};

/** The numbers every companion shares. */
export const BAND = {
  /** The most companions a run can have. */
  places: 6,
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
  /**
   * The room round the hero's feet that no companion on its feet stands in, across and up and down: a companion
   * in a fight came to stand on top of the hero, and the hero is who the player has to see. One running through
   * (a charge) is not stopped by it, and one that circles them is beyond it already.
   */
  room: [50, 30],
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
  tonic: {
    /** Under this share of the hero's health it heals them, by this share of their Max HP, once a wave; more for each step of the bond. */
    under: 0.3,
    heals: 0.2,
    bond: 0.05,
  },
  snap: {
    /** How near it enemies are slowed, by what share, seconds between freezes and how long each holds. */
    r: 120,
    slow: 0.35,
    every: 10,
    freeze: 1,
    bond: 1.5,
  },
  aegis: {
    /** Seconds between one ward and the next, less for each step of the bond. */
    every: 9,
    bond: 1.5,
  },
  powder: {
    /** How wide a shell lands, how long the ground is marked, and how long what it hits is stunned. */
    r: 70,
    warn: 0.8,
    stun: 0.5,
    bond: 0.2,
  },
  honey: {
    /** Seconds between hearts, less for each step of the bond. */
    every: 20,
    bond: 3,
    /** How wide the cloud of bees is and how long it stays; what it does a second, as a share of a sting. */
    r: 70,
    seconds: 3,
    harm: 1,
  },
  hardshell: {
    /** The share of a blow it takes, less for each step of the bond. */
    takes: 0.6,
    bond: 0.06,
    /** Seconds it holds what it grabs. */
    hold: 2,
  },
  cull: {
    /** The share of its health under which an enemy it bites dies, more for each step of the bond. */
    under: 0.2,
    bond: 0.04,
  },
  treasure: {
    /** The chance a burst digs up a coin, more for each step of the bond, and how much the coin is worth for each wave. */
    chance: 0.35,
    bond: 0.1,
    each: 0.25,
    /** How long what it throws is stunned. */
    stun: 0.5,
  },
  mend: {
    /** Seconds between its heals, and how much each heals: a base and more for each level of the hero. */
    every: 6,
    heals: 2,
    grow: 0.25,
  },
  stampede: {
    /** How fast he charges, for how long at most, and seconds what he throws aside is stunned; more for each step of the bond. */
    dash: 520,
    seconds: 0.9,
    stun: 1,
    bond: 0.3,
  },
} as const;
