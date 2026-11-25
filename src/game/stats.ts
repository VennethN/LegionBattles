// What a hero is, as numbers. Everything a hero has (who they are, what
// they have bought, what they chose on a level) is a line of these, and a
// hero's stats are those lines added up. So a new source of anything is one
// more line, and nothing else has to know about it.

export const STATS = [
  'maxHp', 'regen', 'lifesteal', 'damage', 'might', 'aim', 'lore', 'haste', 'crit', 'reach', 'armor', 'dodge', 'speed', 'luck', 'bounty', 'pickup',
] as const;
export type Stat = (typeof STATS)[number];
export type Stats = Record<Stat, number>;
export type StatLine = Partial<Stats>;

/** What each stat is, for the screens and for whoever tunes the numbers. */
export const STAT_INFO: Record<Stat, { name: string; icon: string; says: string; percent?: boolean }> = {
  maxHp: { name: 'Health', icon: 'heart', says: 'How much you can take.' },
  regen: { name: 'Mending', icon: 'herb', says: 'Health that comes back by itself: this much every ten seconds.' },
  lifesteal: { name: 'Leech', icon: 'drop', says: 'The chance that a blow gives back one health.', percent: true },
  damage: { name: 'Damage', icon: 'burst', says: 'More harm from everything you carry.', percent: true },
  might: { name: 'Might', icon: 'sword', says: 'Makes blades, spears, axes and hammers hit harder.' },
  aim: { name: 'Aim', icon: 'arrows', says: 'Makes bows, bolts and things thrown hit harder.' },
  lore: { name: 'Lore', icon: 'rune', says: 'Makes staffs and other magic hit harder.' },
  haste: { name: 'Haste', icon: 'hourglass', says: 'Everything you carry strikes more often.', percent: true },
  crit: { name: 'Edge', icon: 'spark', says: 'The chance of a blow that hits twice as hard.', percent: true },
  reach: { name: 'Reach', icon: 'range', says: 'How far off you can strike.' },
  armor: { name: 'Armor', icon: 'shield', says: 'Takes a share off every blow that lands on you.' },
  dodge: { name: 'Dodge', icon: 'feather', says: 'The chance a blow misses you altogether.', percent: true },
  speed: { name: 'Speed', icon: 'boot', says: 'How fast you run.', percent: true },
  luck: { name: 'Luck', icon: 'clover', says: 'Better things in the camp, and more left behind by the fallen.', percent: true },
  bounty: { name: 'Bounty', icon: 'coin', says: 'More coins from every coin picked up.', percent: true },
  pickup: { name: 'Gather', icon: 'magnet', says: 'From how far coins come to you.', percent: true },
};

export function noStats(): Stats {
  const s = {} as Stats;
  for (const k of STATS) s[k] = 0;
  return s;
}

/** Adds lines of stats up. */
export function sumStats(lines: ReadonlyArray<StatLine | undefined>): Stats {
  const s = noStats();
  for (const line of lines) {
    if (!line) continue;
    for (const k of STATS) s[k] += line[k] ?? 0;
  }
  return s;
}

/** The most dodge counts for: past this a hero could not be hit at all. */
export const DODGE_CAP = 60;

/** The share of a blow that gets through armor. Armor below nothing lets more through. */
export function armorShare(armor: number): number {
  return armor >= 0 ? 15 / (15 + armor) : 1 + -armor / 15;
}

/** How often things strike, as a share of their usual rate. Never less than a quarter. */
export function hasteRate(haste: number): number {
  return Math.max(0.25, 1 + haste / 100);
}

/** A stat as a player reads it: +5, -10%. */
export function statText(stat: Stat, value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${Math.round(value * 10) / 10}${STAT_INFO[stat].percent ? '%' : ''}`;
}
