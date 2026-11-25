// The style's own interface pieces (VennethN/game-assets, styles/grim: the
// third pass's set), loaded as pictures of their own beside the field's
// sheet: buttons of timber with iron at the ends, the round iron slot an
// ability sits in, the frames round a bar and the strips that fill them,
// a plank panel, and an icon for every ability and thing to bring. What is
// stretched is cut in nine where the manifest says how (`slice`).

import Phaser from 'phaser';
import { getGrim } from '../art/grim';

/** How many pixels each unit of a piece is drawn at: sharp on a dense screen, and these pieces are few. */
export const UI_RASTER = 2;

/** Every piece the screens use, by the name the kit gives it. */
export const UI_PIECES = [
  'button-large', 'button-large-pressed', 'button-medium', 'button-medium-pressed', 'button-small', 'button-small-pressed',
  'slot', 'slot-pressed', 'slot-spent', 'bar-frame', 'bar-frame-monster', 'bar-frame-stagger',
  'fill-health', 'fill-monster', 'fill-stagger', 'fill-wait', 'panel', 'trophy-plate',
  'icon-ability-brace', 'icon-ability-reap', 'icon-ability-jawtrap', 'icon-ability-tarflask', 'icon-ability-flare', 'icon-ability-lamp',
  'icon-ability-seton', 'icon-ability-heel', 'icon-dodge', 'icon-horn', 'icon-pikemen', 'icon-crossbowmen', 'icon-sappers',
  'icon-barricade', 'icon-watchfire', 'icon-bellpost', 'icon-ballista', 'icon-supply', 'icon-coin', 'icon-trophy-spade', 'icon-trophy-antler',
  'icon-ability-forgestrike', 'icon-ability-anvil', 'icon-ability-keg', 'icon-ability-cavein', 'icon-ability-shove', 'icon-ability-wake',
  'icon-ability-hook', 'icon-ability-hack', 'icon-trophy-silk', 'icon-trophy-bellrope', 'icon-trophy-grate', 'icon-trophy-shard',
] as const;

export const uiKey = (id: string): string => `ui:${id}`;

/** Asks the loader for every piece. */
export function loadUi(scene: Phaser.Scene): void {
  for (const id of UI_PIECES) scene.load.svg(uiKey(id), `assets/grim/things/${id}.svg`, { scale: UI_RASTER });
}

/** The icon the kit drew for an ability or a thing, or null where it drew none. */
export function uiIcon(id: string): string | null {
  const name = id.startsWith('icon-') ? id : `icon-ability-${id}`;
  for (const k of [name, `icon-${id}`]) if ((UI_PIECES as readonly string[]).includes(k)) return uiKey(k);
  return null;
}

/** The size the kit drew a piece at, in the layout's units. */
export function uiSize(id: string): { w: number; h: number } {
  const t = getGrim().things[id];
  return { w: t.width, h: t.height };
}

/**
 * A piece cut in nine and stretched to `w` by `h`, its middle at (x, y): the corners and ends kept as drawn. A
 * piece the kit gave no cut is cut at a fifth of its size.
 */
export function nine(scene: Phaser.Scene, id: string, x: number, y: number, w: number, h: number, cutOf?: string): Phaser.GameObjects.NineSlice {
  const t = getGrim().things[cutOf ?? id] as { width: number; height: number; slice?: [number, number, number, number] };
  const [l, tp, r, b] = t.slice ?? [Math.round(t.width / 5), Math.round(t.height / 5), Math.round(t.width / 5), Math.round(t.height / 5)];
  // Never cut deeper than half of what is asked for: a short bar keeps its ends.
  const k = Math.min(1, w / (l + r + 2), h / (tp + b + 2));
  const s = UI_RASTER;
  const n = scene.add.nineslice(x, y, uiKey(id), undefined, (w / k) * s, (h / k) * s, l * s, r * s, tp * s, b * s);
  n.setScale(k / s);
  return n;
}
