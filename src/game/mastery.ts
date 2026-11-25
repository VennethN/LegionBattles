// Mastery: what a player keeps between runs is the heroes' own. The owner,
// of 25 November 2026: "as for permanent upgrades, it'll be hero based, so
// as you finish more with your hero, you get to unlock permanent upgrades
// for that hero, e.g more skill, more quirks of the hero unlocked as you go".
//
// Every run pays mastery to the hero who played it: for the waves cleared,
// the bosses beaten, the win, the vows sworn and the quests done in it, so
// that a run that dies early still moves the hero on. Each hero has a track
// of levels, and each level unlocks one thing for that hero only: more
// from their skill, a second and a third passive of their own, stat steps,
// the second way of their own weapon, a relic to start with and a title.
// At two levels the player picks one of two, and may pick again at any time.
//
// What a hero has unlocked is given to a run as it begins (hold.ts,
// termsOf) and the run keeps it to its end.

import type { Stat } from './stats';

// ---------------------------------------------------------------- the passives a track unlocks

/**
 * The second and third passive of each hero, written for them. Each is a
 * rule the wave keeps (world.ts), and each is seen on the field.
 */
export type Perk =
  | 'bash' | 'holdline'
  | 'longshot' | 'slip'
  | 'overflow' | 'arcward'
  | 'pickpocket' | 'luckybreak'
  | 'warmth' | 'hearth'
  | 'trample' | 'ninth'
  | 'bloodied' | 'hungry'
  | 'lastrites' | 'flock'
  | 'coldskin' | 'snowfall'
  | 'dawnlight' | 'radiance';

export interface PerkDef {
  id: Perk;
  hero: string;
  name: string;
  says: string;
}

export const PERKS: readonly PerkDef[] = [
  { id: 'bash', hero: 'bram', name: 'Shield Bash', says: 'While your shield is raised, enemies that hit you up close are knocked back and stunned for 0.6 s.' },
  { id: 'holdline', hero: 'bram', name: 'Hold the Line', says: 'While your shield is raised, heal 1% of your Max HP every second.' },
  { id: 'longshot', hero: 'wren', name: 'Long Shot', says: 'Your hits deal up to 30% more damage the farther the target is: full at 300 range.' },
  { id: 'slip', hero: 'wren', name: 'Slip Away', says: 'When you are hit, move 40% faster for 2 s.' },
  { id: 'overflow', hero: 'orrin', name: 'Overflow', says: 'Every 10th kill bursts with magic: 2x weapon damage to enemies around it.' },
  { id: 'arcward', hero: 'orrin', name: 'Arcane Ward', says: 'Every 12 s, a ward blocks the next hit on you completely.' },
  { id: 'pickpocket', hero: 'fenn', name: 'Pickpocket', says: 'Kills have a 12% chance to drop an extra coin.' },
  { id: 'luckybreak', hero: 'fenn', name: 'Lucky Break', says: 'After you dodge a hit, your next 2 hits are crits.' },
  { id: 'warmth', hero: 'nan', name: 'Warm Hands', says: 'Heal 1 HP every second for each burning enemy near you, up to 3 a second.' },
  { id: 'hearth', hero: 'nan', name: 'Hearth', says: 'Stand still for 2 s to light a ring of fire around you. It burns enemies in it.' },
  { id: 'trample', hero: 'isaura', name: 'Trample', says: 'While your lance is couched, enemies you ride into take half your weapon damage and are knocked aside.' },
  { id: 'ninth', hero: 'isaura', name: 'For the Ninth', says: 'A kill with a Tilt thrust gives you 25% Attack Speed for 3 s.' },
  { id: 'bloodied', hero: 'hroth', name: 'Bloodied', says: 'Below 50% HP, take 10% less damage.' },
  { id: 'hungry', hero: 'hroth', name: 'Hungry Axe', says: 'Kills with your axe heal 1 HP at any HP, at most 4 times a second.' },
  { id: 'lastrites', hero: 'aldous', name: 'Last Rites', says: 'When a companion is downed, enemies near it are stunned for 1.5 s.' },
  { id: 'flock', hero: 'aldous', name: 'The Flock', says: '+4% damage for each companion on its feet.' },
  { id: 'coldskin', hero: 'ysolde', name: 'Cold Skin', says: 'Enemies that hit you up close are slowed by 50% for 2 s.' },
  { id: 'snowfall', hero: 'ysolde', name: 'Snowfall', says: 'Every 8 s, a gust of snow slows every enemy within 170 for 2 s.' },
  { id: 'dawnlight', hero: 'maren', name: 'Dawnlight', says: 'Take 10% less damage while you stand on your holy ground.' },
  { id: 'radiance', hero: 'maren', name: 'Radiance', says: 'Enemies that die on your holy ground burst with light: 0.4x weapon damage around them.' },
];

/** The numbers of the passives above. */
export const PERK = {
  bash: { stun: 0.6, knock: 60 },
  holdline: { heals: 0.01 },
  longshot: { most: 0.3, full: 300 },
  slip: { faster: 0.4, seconds: 2 },
  overflow: { every: 10, r: 90, harm: 2 },
  arcward: { every: 12 },
  pickpocket: { chance: 0.12 },
  luckybreak: { hits: 2 },
  warmth: { r: 170, each: 1, most: 3 },
  hearth: { still: 2, r: 90, seconds: 2.2, harm: 0.5 },
  trample: { harm: 0.5, r: 30, knock: 40, again: 0.6 },
  ninth: { faster: 0.25, seconds: 3 },
  bloodied: { under: 0.5, takes: 0.9 },
  hungry: { heals: 1 },
  lastrites: { r: 170, stun: 1.5 },
  flock: { each: 0.04 },
  coldskin: { slow: 0.5, seconds: 2 },
  snowfall: { every: 8, r: 170, slow: 0.45, seconds: 2 },
  dawnlight: { takes: 0.9 },
  radiance: { r: 60, harm: 0.4 },
} as const;

// ---------------------------------------------------------------- what a level gives

/**
 * What a level of a hero's track unlocks.
 * stat: a stat step, added to the hero's own.
 * skill: more from their skill. harm: a share more damage. fill: Fury fills a share faster. area: a share wider.
 *   again: after the skill, the bar starts this share full.
 * perk: a passive of theirs (PERKS).
 * way: their own weapon's rules: the first way, or the second (heroes.ts, OWN_ALTS).
 * relic: a relic every run of theirs starts with.
 * title: a new title, shown with their name.
 */
export type Gift =
  | { kind: 'stat'; stat: Stat; by: number }
  | { kind: 'skill'; part: 'harm' | 'fill' | 'area' | 'again'; by: number }
  | { kind: 'perk'; perk: Perk }
  | { kind: 'way'; alt: boolean }
  | { kind: 'relic'; relic: string }
  | { kind: 'title'; title: string };

/** A level of a track: one gift, or a pick of two. */
export interface Level {
  /** Mastery needed, in all, to reach it. */
  xp: number;
  gifts: readonly Gift[];
}

/**
 * Mastery needed in all for each level. A run pays about 25 early and 60 or
 * more once a hero gets far (see `npm run pace -- --career`), so the first
 * two levels come in the first two or three runs, and the track is full
 * after about twenty runs with the hero.
 */
export const LEVEL_XP: readonly number[] = [12, 35, 70, 115, 170, 240, 320, 410, 520, 650, 800, 980];

/** What each run pays the hero who played it. */
export const PAY = {
  /** For each wave cleared. */
  wave: 2,
  /** For each boss beaten. */
  boss: 10,
  /** For clearing the last written wave, the hundredth. */
  win: 25,
  /** How much more of all of it each vow sworn pays. */
  vow: 0.2,
};

/** Each hero's own: four stat steps, the relic they start with, and their title. */
const OWN: Readonly<Record<string, { steps: ReadonlyArray<readonly [Stat, number]>; relic: string; title: string }>> = {
  bram: { steps: [['might', 2], ['armor', 3], ['damage', 25], ['maxHp', 15]], relic: 'thornmail', title: 'the Gate That Held' },
  wren: { steps: [['damage', 16], ['maxHp', 10], ['haste', 12], ['damage', 16]], relic: 'horn', title: 'the Uncaught' },
  orrin: { steps: [['lore', 2], ['haste', 10], ['maxHp', 8], ['damage', 10]], relic: 'stormglass', title: 'the Finished' },
  fenn: { steps: [['damage', 5], ['maxHp', 6], ['crit', 4], ['haste', 5]], relic: 'magpie', title: 'the Rich' },
  nan: { steps: [['lore', 3], ['maxHp', 10], ['damage', 15], ['regen', 4]], relic: 'bellows', title: 'the Last Hearth' },
  isaura: { steps: [['might', 5], ['maxHp', 30], ['damage', 60], ['armor', 6]], relic: 'spurs', title: 'Captain of the Dawn' },
  hroth: { steps: [['maxHp', 8], ['might', 1], ['armor', 1], ['damage', 5]], relic: 'lastcandle', title: 'the Thrice Buried' },
  aldous: { steps: [['regen', 4], ['maxHp', 10], ['armor', 2], ['damage', 25]], relic: 'whistle', title: 'the Morning Bell' },
  ysolde: { steps: [['lore', 3], ['maxHp', 12], ['damage', 25], ['dodge', 8]], relic: 'frostbite', title: 'the Thaw' },
  maren: { steps: [['might', 1], ['maxHp', 8], ['armor', 1], ['damage', 8]], relic: 'fallen', title: 'the Oath Kept' },
};

const perksOf = (hero: string): Perk[] => PERKS.filter((p) => p.hero === hero).map((p) => p.id);

/** A hero's whole track, level by level. Every hero's has the same shape, and what is theirs in it. */
export function trackOf(hero: string): Level[] {
  const own = OWN[hero];
  if (!own) return [];
  const [p2, p3] = perksOf(hero);
  const step = (i: number): Gift => ({ kind: 'stat', stat: own.steps[i][0], by: own.steps[i][1] });
  const shape: Gift[][] = [
    [step(0)],
    [{ kind: 'skill', part: 'harm', by: 0.4 }],
    [{ kind: 'perk', perk: p2 }],
    [step(1)],
    [{ kind: 'way', alt: false }, { kind: 'way', alt: true }],
    [{ kind: 'skill', part: 'fill', by: 0.2 }],
    [step(2)],
    [{ kind: 'relic', relic: own.relic }],
    [{ kind: 'perk', perk: p3 }],
    [{ kind: 'skill', part: 'area', by: 0.3 }, { kind: 'skill', part: 'again', by: 0.4 }],
    [step(3)],
    [{ kind: 'title', title: own.title }],
  ];
  return shape.map((gifts, i) => ({ xp: LEVEL_XP[i], gifts }));
}

/** The level a hero is at with this much mastery: how many levels of the track are reached. */
export function levelAt(xp: number): number {
  return LEVEL_XP.filter((need) => xp >= need).length;
}

/** What is added up of a hero's track to give a run. */
export interface Mastered {
  stats: Partial<Record<Stat, number>>;
  /** A share more skill damage, a share faster Fury, a share wider skill, and the share of the bar left after a skill. */
  harm: number;
  fill: number;
  area: number;
  again: number;
  perks: Perk[];
  relic: string;
  alt: boolean;
  title: string;
}

/**
 * What a hero has unlocked of their track, added up. `picks` is which of a
 * pair was picked at each level that has two, by the level's place in the
 * track; the first if none was.
 */
export function mastered(hero: string, xp: number, picks: Readonly<Record<number, number>> = {}): Mastered {
  const out: Mastered = { stats: {}, harm: 0, fill: 0, area: 0, again: 0, perks: [], relic: '', alt: false, title: '' };
  const reached = levelAt(xp);
  trackOf(hero).forEach((lv, i) => {
    if (i >= reached) return;
    const gift = lv.gifts[Math.min(lv.gifts.length - 1, Math.max(0, picks[i] ?? 0))];
    switch (gift.kind) {
      case 'stat':
        out.stats[gift.stat] = (out.stats[gift.stat] ?? 0) + gift.by;
        break;
      case 'skill':
        out[gift.part] += gift.by;
        break;
      case 'perk':
        out.perks.push(gift.perk);
        break;
      case 'way':
        out.alt = gift.alt;
        break;
      case 'relic':
        out.relic = gift.relic;
        break;
      case 'title':
        out.title = gift.title;
        break;
    }
  });
  return out;
}
