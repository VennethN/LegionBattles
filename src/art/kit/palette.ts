// Every color the art uses is named here. Nothing is drawn with a color that
// is not in this file, and scripts/sheet.ts fails on one that is.

export type Team = 'blue' | 'red';
export const TEAMS: readonly Team[] = ['blue', 'red'];

/** A flat fill with its cel-shade tone. */
export interface Material {
  fill: string;
  shade: string;
  /** True for what is polished: metal, a cut stone, ice. It is drawn with a streak of light across it. */
  gloss?: boolean;
}

export const OUTLINE = '#2a1a10';
/** Width of every dark line, at 1x. */
export const OUTLINE_WIDTH = 4;

/** Filled into hoods and visor slits: where a face would be, there is shadow. */
export const HOOD_INTERIOR = '#1e2b17';
/** The one small highlight a piece may have. */
export const HIGHLIGHT = '#f4f1e4';
/** Ground shadows are the outline color at this opacity. */
export const SHADOW_OPACITY = 0.28;

export const STEEL: Material = { fill: '#b9c2cc', shade: '#8d97a3', gloss: true };
export const LEATHER: Material = { fill: '#6b4a2b', shade: '#4e3520' };
export const WOOD: Material = { fill: '#9a6a3a', shade: '#75502b' };
export const GOLD: Material = { fill: '#c8a24a', shade: '#9c7c33', gloss: true };
/** Horn, parchment, bowstring, fletching. The one neutral light material. */
export const BONE: Material = { fill: '#e9dfc6', shade: '#c4b594' };
/** The plates of the grade badges between iron and gold, and above gold. */
export const BRONZE: Material = { fill: '#c98b52', shade: '#9a6337', gloss: true };
export const RUBY: Material = { fill: '#c7364f', shade: '#952239', gloss: true };
/** Dark iron for blackened gear, and stone for rocks and golems. */
export const IRON: Material = { fill: '#5d6672', shade: '#434b56', gloss: true };
export const STONE: Material = { fill: '#9c9a8c', shade: '#77766b' };

export const CLOTH: Record<Team, Material> = {
  blue: { fill: '#3d6fb6', shade: '#2f5893' },
  red: { fill: '#c2453a', shade: '#933027' },
};

/** Cloth that is no team's: robes, wraps and sashes worn by both sides. */
export const LINEN: Material = { fill: '#d9cdb0', shade: '#b3a585' };
export const DARK_CLOTH: Material = { fill: '#4a4458', shade: '#353041' };

// Magic accents. Each has a core color, a light halo tone and a shade.
export interface Accent extends Material {
  light: string;
}
export const ARCANE: Accent = { fill: '#8a5cd6', shade: '#6541a8', light: '#cdb6f7' };
export const FIRE: Accent = { fill: '#f08a3c', shade: '#c45f22', light: '#ffd27a' };
export const FROST: Accent = { fill: '#6fc7e8', shade: '#3f97bd', light: '#d4f1fb', gloss: true };
export const HOLY: Accent = { fill: '#f2d264', shade: '#c9a53a', light: '#fff3b8' };
export const VENOM: Accent = { fill: '#8fce4a', shade: '#62992b', light: '#d5f2a4' };

// The board. Each kind of land has four tones: two for the tiles, one for
// the land around them, one for specks on the ground.
export const GRASS = { fill: '#7fb956', shade: '#6ea748', dark: '#5c9440', light: '#93c96a' };
export const SAND = { fill: '#e6cc8e', shade: '#d9bc7a', dark: '#c4a564', light: '#f3e0ad' };
export const SNOW = { fill: '#e4edf2', shade: '#d3e0e8', dark: '#b9ccd8', light: '#f8fcfe' };
export const PINE: Material = { fill: '#3f7a5a', shade: '#2e5f45' };
export const CACTUS: Material = { fill: '#6fa052', shade: '#55813d' };
export const DIRT: Material = { fill: '#b08a5a', shade: '#8c6b42' };
export const BUSH: Material = { fill: '#4f8f3e', shade: '#3b722f' };

/** Every color above, for the off-palette check. */
export function allColors(): Set<string> {
  const out = new Set<string>([OUTLINE, HOOD_INTERIOR, HIGHLIGHT, '#ffffff']);
  const mats: Array<Record<string, string>> = [
    STEEL, LEATHER, WOOD, GOLD, BONE, BRONZE, RUBY, IRON, STONE, CLOTH.blue, CLOTH.red, LINEN, DARK_CLOTH,
    ARCANE, FIRE, FROST, HOLY, VENOM, GRASS, DIRT, BUSH, SAND, SNOW, PINE, CACTUS,
  ] as unknown as Array<Record<string, string>>;
  for (const m of mats) for (const v of Object.values(m)) if (typeof v === 'string') out.add(v);
  return out;
}
