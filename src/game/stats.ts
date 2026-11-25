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
  maxHp: { name: 'Max HP', icon: 'heart', says: 'How much damage you can take.' },
  regen: { name: 'HP Regen', icon: 'herb', says: 'HP restored every 10 seconds.' },
  lifesteal: { name: 'Life Steal', icon: 'drop', says: 'Chance for a hit to heal 1 HP.', percent: true },
  damage: { name: 'Damage', icon: 'burst', says: 'More damage from every weapon.', percent: true },
  might: { name: 'Melee Damage', icon: 'sword', says: 'More damage for swords, spears, axes and hammers.' },
  aim: { name: 'Ranged Damage', icon: 'arrows', says: 'More damage for bows and thrown weapons.' },
  lore: { name: 'Magic Damage', icon: 'rune', says: 'More damage for staffs and other magic.' },
  haste: { name: 'Attack Speed', icon: 'hourglass', says: 'Every weapon attacks faster.', percent: true },
  crit: { name: 'Crit Chance', icon: 'spark', says: 'Chance for a hit to deal 2x damage.', percent: true },
  reach: { name: 'Range', icon: 'range', says: 'How far your weapons reach.' },
  armor: { name: 'Armor', icon: 'shield', says: 'Reduces the damage you take.' },
  dodge: { name: 'Dodge', icon: 'feather', says: 'Chance to avoid a hit completely.', percent: true },
  speed: { name: 'Move Speed', icon: 'boot', says: 'How fast you move.', percent: true },
  luck: { name: 'Luck', icon: 'clover', says: 'Better items in the shop, and more drops from enemies.', percent: true },
  bounty: { name: 'Coin Gain', icon: 'coin', says: 'More coins from every coin you pick up.', percent: true },
  pickup: { name: 'Pickup Range', icon: 'magnet', says: 'How far away you pick up coins.', percent: true },
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
