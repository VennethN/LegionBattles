// Which picture stands for what: every weapon, every ware of the camp and
// every stat has one, by name. The art build writes exactly the pictures
// named here (scripts/art.game.ts), and a test holds that each is drawn.

import { FUSED, ITEMS, RELICS, WEAPONS, weaponOf } from '../game/data';
import { STAT_INFO, STATS } from '../game/stats';

/** The picture of a weapon. A hero's own is drawn with a plain weapon's picture until it has one of its own. */
export const weaponIcon = (id: string): string => `icon/w-${weaponOf(id).icon ?? id}`;

/** The picture of each ware. Most have one of their own; a few are things the kit had drawn already. */
const ITEM_ICONS: Record<string, string> = {
  ration: 'ration', whetstone: 'whetstone', fletching: 'fletching', candle: 'candle', boots: 'boot', herbs: 'herb', purse: 'sack', buckler: 'shield',
  horseshoe: 'horseshoe', keg: 'keg', wardrum: 'wardrum', hawk: 'hawk', grimoire: 'grimoire', mail: 'mail', spyglass: 'spyglass', lodestone: 'magnet',
  cloak: 'cloak', banner: 'banner', horn: 'horn', chalice: 'chalice', gauntlets: 'gauntlet', hourglass: 'hourglass', crown: 'crown', relic: 'relic',
  stoneheart: 'stoneheart', quiver: 'quiver',
  // Each land's own wares.
  reedpipe: 'reedpipe', thornbrace: 'thornbrace', leechjar: 'leechjar', mudboots: 'mudboots', sunglass: 'sunglass', scarab: 'scarab', icepick: 'icepick', wolfpelt: 'wolfpelt', harpoon: 'harpoon', pearl: 'pearl', blastcap: 'blastcap', minerlamp: 'minerlamp', saddle: 'saddle', kumis: 'kumis', gravebell: 'gravebell', ossuary: 'ossuary', cogwheel: 'cogwheel', gearplate: 'gearplate', tongs: 'tongs', cinderheart: 'cinderheart',
};

export const itemIcon = (id: string): string => `icon/${ITEM_ICONS[id] ?? 'sack'}`;

export const statIcon = (icon: string): string => `icon/${icon}`;

/** The picture of a relic. */
export const relicIcon = (id: string): string => `icon/r-${id}`;

/** The pictures of what a road puts on the field: the pay wagon, the cage, the shrine; and the fire the camp is made at. */
export const THING_ICONS = { wagon: 'icon/thing-wagon', cage: 'icon/thing-cage', shrine: 'icon/thing-shrine', campfire: 'icon/thing-campfire', chest: 'icon/thing-chest', chestOpen: 'icon/thing-chest-open' } as const;

/** The pictures the screens and the field ask for besides those. */
const OTHER = ['coin', 'heart', 'sack', 'fist', 'shot-bomb', 'shot-stone', 'reroll', 'lock', 'check', 'cog', 'sound', 'mute', 'hold', 'trophy', 'laurel', 'star', 'sword', 'chevrons', 'cross', 'arrow', 'crown'];

/** Every picture the game asks for by name, without the "icon/" in front: what the art build writes. */
export const ICONS_USED: ReadonlySet<string> = new Set([
  ...WEAPONS.map((w) => `w-${w.id}`),
  ...ITEMS.map((it) => itemIcon(it.id).slice(5)),
  ...STATS.map((s) => statIcon(STAT_INFO[s].icon).slice(5)),
  ...[...RELICS, ...FUSED].map((r) => relicIcon(r.id).slice(5)),
  ...Object.values(THING_ICONS).map((n) => n.slice(5)),
  ...OTHER,
]);

/**
 * What stands behind a hero in the Hold besides people: the gate they go out by. It is a building of the kit,
 * shown whole, and the art build writes it because it is named here.
 */
export const HOLD_PLACES: readonly string[] = ['gatehouse'];
