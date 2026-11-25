// Every color the Grim style uses is named here. Nothing is drawn with a
// color that is not in this file, and the style check fails on one that is.
//
// The palette is small, earthy and worn: browns, rust, dull red, olive,
// dirty bone, lead. Nothing in it is bright but the two accents, firelight
// and blood, which are kept for what a player has to find at once. A tone
// has two flat colors, its lit one and its middle one. Its third is not a
// color of its own: the shadow side of everything is black.

/** A flat lit color and the middle tone that lies between it and the ink. */
export interface Tone {
  lit: string;
  mid: string;
}

/** The black of every outline and every shadow shape. A warm near-black, so that firelight sits well against it. */
export const INK = '#14110f';
/** The paper the interface is printed on, and its foxed tone. */
export const PAPER: Tone = { lit: '#d8cbab', mid: '#b5a684' };
/** The one pale mark a piece may have: a worn edge, a scratch through the ink. */
export const SCRATCH = '#e9e0c6';
/** Firelight where it catches an edge: laid over a piece's lit color along the side toward the light, with a hard edge. */
export const FIRELIGHT = '#f4d294';
export const RIM_STRENGTH = 0.55;
/** The cold of the dark, where it catches the edge of a back turned from the fire: the one rim the style has. */
export const COLD = '#506a76';
/** How dark the blot a figure stands on is. */
export const GROUND_SHADOW = 0.55;

export const BONE: Tone = { lit: '#cfc5a8', mid: '#9c9178' };
/** Candle fat, old linen, and the skin of people who do not see the sun. */
export const TALLOW: Tone = { lit: '#c7ad84', mid: '#927a58' };
export const RUST: Tone = { lit: '#9a5b38', mid: '#6a3b24' };
/** Dried blood: the lodge's cloth, a sash, a wax seal. */
export const BLOOD: Tone = { lit: '#7d312b', mid: '#551f1c' };
export const MOSS: Tone = { lit: '#727646', mid: '#4b4f2f' };
/** Iron and lead: blades, plate, chain. */
export const LEAD: Tone = { lit: '#8c9194', mid: '#5b6165' };
/** Black cloth and tarred leather, which are never quite black where the light is. */
export const SOOT: Tone = { lit: '#4f4944', mid: '#34302d' };
/** The cold one: a wet coat, slate, a monster's hide. */
export const SLATE: Tone = { lit: '#5f7480', mid: '#3f505b' };
export const LEATHER: Tone = { lit: '#7b5b3d', mid: '#553d29' };
export const WOOD: Tone = { lit: '#6f5c46', mid: '#4a3c2d' };
/** Dead flesh: what gets up out of a grave. */
export const PALLOR: Tone = { lit: '#9aa48c', mid: '#6b7562' };

// The two accents. Nothing else in the style is bright.
/** Lamplight: a lantern, a watchfire, a brand. `hot` is its heart. */
export const LAMP = { lit: '#eeb040', mid: '#c27a26', hot: '#ffe6a2' };
/** Fresh blood, and a monster's weak place. */
export const GORE = { lit: '#c42a2c', mid: '#8c1a20' };

// The ground of a lair, which is never as dark as ink: a figure's dark side has to stand off it.
export const EARTH: Tone = { lit: '#5a5645', mid: '#434134' };
export const STONE: Tone = { lit: '#77786f', mid: '#54564f' };
export const DEADGRASS: Tone = { lit: '#666a45', mid: '#4a4e33' };

/** What stands far off in the dark: a church, a line of yews. Cold, and only just lighter than black. */
export const NIGHT: Tone = { lit: '#33424b', mid: '#242f36' };

/** Every color above, for the off-palette check. */
export function allColors(): Set<string> {
  const out = new Set<string>([INK, SCRATCH, FIRELIGHT, COLD]);
  const tones: Array<object> = [
    PAPER, BONE, TALLOW, RUST, BLOOD, MOSS, LEAD, SOOT, SLATE, LEATHER, WOOD, PALLOR, LAMP, GORE, EARTH, STONE, DEADGRASS, NIGHT,
  ];
  for (const t of tones) for (const v of Object.values(t)) out.add(v as string);
  return out;
}
