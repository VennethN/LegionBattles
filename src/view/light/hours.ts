// The light of each kind of lair, and the colors of what burns and glows.
// A lair is dark: what can be seen is what something lights.

export type Rgb = [number, number, number];

export interface Hour {
  /** The light that is everywhere: what the ground and the figures are multiplied by where nothing else lights them. */
  ambient: Rgb;
  /** The color of the shafts that come down, where there are any. */
  sun: Rgb;
  /** How strong the shafts are, and the shadows of cloud: none in a lair. */
  shafts: number;
  clouds: number;
  /** What the dark parts of the picture are tinted. */
  shade: Rgb;
  /** How dark the rim of the view is. */
  vignette: number;
}

export const LAIRS: Record<string, Hour> = {
  // A churchyard at night: a little green in the dark, as of old stone.
  churchyard: { ambient: [0.3, 0.36, 0.42], sun: [0.7, 0.8, 1], shafts: 0, clouds: 0.25, shade: [0.84, 0.94, 1.1], vignette: 0.62 },
  // A wood under snow and a moon: brighter, and blue.
  wood: { ambient: [0.36, 0.44, 0.6], sun: [0.7, 0.8, 1], shafts: 0.12, clouds: 0.2, shade: [0.82, 0.92, 1.14], vignette: 0.56 },
};

/** How dark an hour is, 0 for noon to 1 for the dead of night. */
export function darkness(hour: Hour): number {
  const lum = hour.ambient[0] * 0.3 + hour.ambient[1] * 0.5 + hour.ambient[2] * 0.2;
  return Math.max(0, Math.min(1, (1 - lum) / 0.6));
}

/** The colors of a thing that shines: its heart, its body, its cool edge, and the light it throws. */
export interface Element {
  hot: number;
  mid: number;
  cool: number;
  light: number;
}

export const ELEMENTS: Record<string, Element> = {
  fire: { hot: 0xfff0b8, mid: 0xff9428, cool: 0xc02c14, light: 0xff8a3c },
  arcane: { hot: 0xf2e4ff, mid: 0xae6cff, cool: 0x5226c8, light: 0xa274ff },
  frost: { hot: 0xf0fcff, mid: 0x7cd6ff, cool: 0x2c74d2, light: 0x7cc8ff },
  holy: { hot: 0xfffadc, mid: 0xffd858, cool: 0xe08c1c, light: 0xffd870 },
  venom: { hot: 0xeeffd0, mid: 0x8ee04a, cool: 0x2c8c2c, light: 0x86e060 },
  red: { hot: 0xffe2d2, mid: 0xff4c3c, cool: 0x9c1020, light: 0xff4838 },
  spark: { hot: 0xffffff, mid: 0xffe9a8, cool: 0xff9a3a, light: 0xffe0a0 },
};

/** The lantern a hunter carries. */
export const LANTERN = 0xffd9a6;
