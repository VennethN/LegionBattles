// Which picture stands for what: every weapon, every ware of the camp and
// every stat has one, by name. The art build writes exactly the pictures
// named here (scripts/art.game.ts), and a test holds that each is drawn.

import { ITEMS, WEAPONS, weaponOf } from '../game/data';
import { STAT_INFO, STATS } from '../game/stats';

/** The picture of a weapon. A hero's own is drawn with a plain weapon's picture until it has one of its own. */
export const weaponIcon = (id: string): string => `icon/w-${weaponOf(id).icon ?? id}`;

/** The picture of each ware. Most have one of their own; a few are things the kit had drawn already. */
const ITEM_ICONS: Record<string, string> = {
  ration: 'ration', whetstone: 'whetstone', fletching: 'fletching', candle: 'candle', boots: 'boot', herbs: 'herb', purse: 'sack', buckler: 'shield',
  horseshoe: 'horseshoe', keg: 'keg', wardrum: 'wardrum', hawk: 'hawk', grimoire: 'grimoire', mail: 'mail', spyglass: 'spyglass', lodestone: 'magnet',
  cloak: 'cloak', banner: 'banner', horn: 'horn', chalice: 'chalice', gauntlets: 'gauntlet', hourglass: 'hourglass', crown: 'crown', relic: 'relic',
  stoneheart: 'stoneheart', quiver: 'quiver',
};

export const itemIcon = (id: string): string => `icon/${ITEM_ICONS[id] ?? 'sack'}`;

export const statIcon = (icon: string): string => `icon/${icon}`;

/** The pictures the screens and the field ask for besides those. */
const OTHER = ['coin', 'heart', 'sack', 'pack', 'fist', 'shot-bomb', 'shot-stone', 'reroll', 'lock', 'check', 'cog', 'sound', 'mute', 'hold', 'trophy', 'laurel', 'star', 'sword', 'chevrons', 'cross', 'arrow', 'crown'];

/** Every picture the game asks for by name, without the "icon/" in front: what the art build writes. */
export const ICONS_USED: ReadonlySet<string> = new Set([
  ...WEAPONS.map((w) => `w-${w.id}`),
  ...ITEMS.map((it) => itemIcon(it.id).slice(5)),
  ...STATS.map((s) => statIcon(STAT_INFO[s].icon).slice(5)),
  ...OTHER,
]);
