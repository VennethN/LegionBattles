// Which small picture stands for what: every ability, and what the screens
// name besides. All are the Grim kit's own icons (src/grim/interface.ts),
// loaded as interface pieces (src/view/ui/grim.ts); a test holds that each
// is drawn and that each one a screen names is on this list.

import { ABILITIES } from '../game/content';

/** The kit's icon on each ability's button, by the ability's name: each has its own, drawn as what it is. */
export const ABILITY_ICONS: Record<string, string> = Object.fromEntries(ABILITIES.map((a) => [a.id, `ability-${a.id}`]));

/** The key of the picture of an ability, ready to show. */
export const abilityIcon = (id: string): string => `ui:icon-${ABILITY_ICONS[id] ?? 'star'}`;

/** Each trinket's picture, drawn by the kit as the thing it is. */
export const TRINKET_ICONS: Record<string, string> = {
  whetstone: 'trinket-whetstone', salt: 'trinket-salt', boots: 'trinket-boots', flask: 'trinket-flask',
  bread: 'trinket-bread', nail: 'trinket-nail', ribbon: 'trinket-ribbon', purse: 'trinket-purse',
};

/** What the shop shows for each ware, by what it is: the thing it is for, or the trinket. */
export function wareIcon(id: string): string {
  const [kind, what] = id.split(':');
  if (kind === 'supply') return 'icon-sack';
  if (kind === 'trinket') return `icon-${TRINKET_ICONS[what] ?? 'star'}`;
  return `icon-${what}`;
}

/** The kit's icons the screens ask for besides those, by name without the "icon-" in front. */
export const OTHER_ICONS = [
  'attack', 'dodge', 'horn', 'pikemen', 'crossbowmen', 'sappers', 'barricade', 'watchfire', 'bellpost', 'ballista', 'supply', 'coin',
  'trophy-spade', 'trophy-antler', 'trophy-silk', 'trophy-bellrope', 'trophy-grate', 'trophy-shard',
  'heart', 'sack', 'lock', 'check', 'cog', 'sound', 'mute', 'hold', 'trophy', 'star', 'sword', 'cross', 'arrow', 'hourglass', 'banner',
] as const;

/** Every icon the game shows, by the kit's name for it: what is loaded. */
export const ICONS_USED: ReadonlySet<string> = new Set([...Object.values(ABILITY_ICONS), ...Object.values(TRINKET_ICONS), ...OTHER_ICONS].map((n) => `icon-${n}`));
