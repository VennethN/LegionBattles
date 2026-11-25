// Which small picture stands for what: every ability, and what the screens
// name besides. The art build writes exactly the pictures named here
// (scripts/art.game.ts), and a test holds that each is drawn.

/** The picture on each ability's button, by the ability's name. */
export const ABILITY_ICONS: Record<string, string> = {
  brace: 'shield', reap: 'burst', jawtrap: 'lock', tarflask: 'keg', flare: 'spark', lamp: 'candle', seton: 'chevrons', heel: 'herb',
};

export const abilityIcon = (id: string): string => `icon/${ABILITY_ICONS[id] ?? 'star'}`;

/** The pictures the screens ask for besides those. */
const OTHER = ['coin', 'heart', 'sack', 'boot', 'horn', 'lock', 'check', 'cog', 'sound', 'mute', 'hold', 'trophy', 'star', 'sword', 'cross', 'arrow', 'hourglass', 'banner'];

/** Every picture the game asks for by name, without the "icon/" in front: what the art build writes. */
export const ICONS_USED: ReadonlySet<string> = new Set([...Object.values(ABILITY_ICONS), ...OTHER]);
