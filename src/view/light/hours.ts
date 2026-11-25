// What hour it is in each wave, as light. A land is come into in the
// afternoon and its captain is met at night: the light goes down wave by
// wave, so that the lights the fight makes count for more the further in
// it is. Every number of the light's color is here.

import { LANDS, LAND_WAVES, LAST_WAVE, type Land } from '../../game/data';

type Rgb = [number, number, number];

export interface Hour {
  /** The light of the sky, which falls on everything, in the sun and out of it: cool, and less than the pictures were drawn in. */
  ambient: Rgb;
  /** The sun's own light (the moon's, at night), color and strength in one. It falls only where nothing is in its way. */
  sun: Rgb;
  /** How much of the sun the drifting shade takes away where it lies: the field is in patches of warm light and cool shade. */
  clouds: number;
  /** What the darkest parts of the picture lean to. */
  shade: Rgb;
  /** How dark the rim of the view is. */
  vignette: number;
  /** The shadow a figure throws: how long, as a share of its height, and how dark. */
  long: number;
  cast: number;
}

/**
 * Which way the sun's light goes across the field, in every land and at every hour: down and to the right, from a
 * sun low on the upper left. Shadows lie that way and the patches of shade are drawn out along it.
 */
export const SUN_ANGLE = 0.62;

/**
 * The hours a land passes through, by how far through its waves it is: 0 at its first, 1 at its captain's.
 *
 * No land is come into at noon. Noon is flat: the sky's light and the sun's are one white, nothing throws a
 * shadow, and the pictures look as they do with no light at all, only paler. The first wave is the first thing a
 * player sees, so it is the golden hour: a low warm sun, long shadows and cool shade. A reviewer said of the
 * first version, which began at noon, that it was "a pale haze over a flat lawn".
 */
// Night is dark, and only a little blue: a deep blue night turned a captain's grey iron to the hero's own blue.
const DAYS3: Record<'meadow' | 'desert' | 'snow', Array<[number, Hour]>> = {
  meadow: [
    [0, { ambient: [0.56, 0.62, 0.78], sun: [0.62, 0.4, 0.1], clouds: 0.88, shade: [0.84, 0.92, 1.14], vignette: 0.4, long: 1.15, cast: 0.3 }],
    [0.45, { ambient: [0.62, 0.6, 0.76], sun: [0.56, 0.28, 0.1], clouds: 0.86, shade: [0.9, 0.84, 1.12], vignette: 0.44, long: 1.6, cast: 0.28 }],
    [0.8, { ambient: [0.5, 0.48, 0.72], sun: [0.34, 0.14, 0.14], clouds: 0.7, shade: [0.8, 0.84, 1.2], vignette: 0.46, long: 1.9, cast: 0.18 }],
    [1, { ambient: [0.38, 0.42, 0.58], sun: [0.1, 0.13, 0.2], clouds: 0.6, shade: [0.86, 0.92, 1.14], vignette: 0.46, long: 0.8, cast: 0.16 }],
  ],
  desert: [
    [0, { ambient: [0.6, 0.6, 0.72], sun: [0.6, 0.42, 0.14], clouds: 0.72, shade: [0.95, 0.9, 1.08], vignette: 0.38, long: 1.1, cast: 0.3 }],
    [0.5, { ambient: [0.66, 0.54, 0.62], sun: [0.56, 0.24, 0.08], clouds: 0.7, shade: [1.0, 0.8, 1.04], vignette: 0.46, long: 1.7, cast: 0.28 }],
    [0.8, { ambient: [0.52, 0.42, 0.62], sun: [0.3, 0.1, 0.14], clouds: 0.5, shade: [0.84, 0.8, 1.2], vignette: 0.5, long: 2, cast: 0.18 }],
    [1, { ambient: [0.38, 0.4, 0.58], sun: [0.1, 0.12, 0.18], clouds: 0.4, shade: [0.88, 0.9, 1.14], vignette: 0.46, long: 0.8, cast: 0.16 }],
  ],
  snow: [
    [0, { ambient: [0.58, 0.68, 0.86], sun: [0.5, 0.36, 0.18], clouds: 0.8, shade: [0.84, 0.94, 1.14], vignette: 0.4, long: 1.4, cast: 0.26 }],
    [0.5, { ambient: [0.48, 0.58, 0.84], sun: [0.3, 0.2, 0.3], clouds: 0.7, shade: [0.78, 0.9, 1.24], vignette: 0.46, long: 1.9, cast: 0.18 }],
    // The last of it is under the northern lights.
    [1, { ambient: [0.36, 0.42, 0.58], sun: [0.06, 0.22, 0.16], clouds: 0.7, shade: [0.86, 0.94, 1.14], vignette: 0.46, long: 0.8, cast: 0.16 }],
  ],
};

/**
 * The days of the lands that came after the first three: each goes through
 * the hours of the land most like it, until it has days of its own. The
 * mire and the coast are green and wet like the meadow, the steppe, the
 * clockwork city and the forge dry and warm like the dunes, the mines and
 * the crypt cold and dim like the snow.
 */
const DAYS: Record<Land, Array<[number, Hour]>> = {
  ...DAYS3, mire: DAYS3.meadow, coast: DAYS3.meadow, steppe: DAYS3.desert, clock: DAYS3.desert, ember: DAYS3.desert, mine: DAYS3.snow, crypt: DAYS3.snow,
};

/** Where each land's waves begin and end among the written waves: ten each. */
const SPANS = Object.fromEntries(LANDS.map((land, i) => [land, [i * LAND_WAVES + 1, (i + 1) * LAND_WAVES]])) as Record<Land, [number, number]>;

function mix(a: Rgb, b: Rgb, k: number): Rgb {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/** The hour of a wave. Past the last written wave the days come round again, as the waves do. */
export function hourOf(land: Land, wave: number, night = false): Hour {
  // A night march is the land's last hour, and darker than that: there is no light but what is carried.
  if (night) {
    const last = DAYS[land][DAYS[land].length - 1][1];
    return { ...last, ambient: [last.ambient[0] * 0.82, last.ambient[1] * 0.82, last.ambient[2] * 0.86], sun: [0, 0, 0], clouds: 0, vignette: 0.56, cast: 0.1 };
  }
  const at = ((wave - 1) % LAST_WAVE) + 1;
  const [from, to] = SPANS[land];
  const t = Math.max(0, Math.min(1, (at - from) / Math.max(1, to - from)));
  const day = DAYS[land];
  for (let i = 1; i < day.length; i++) {
    const [t1, b] = day[i];
    const [t0, a] = day[i - 1];
    if (t > t1) continue;
    const k = (t - t0) / (t1 - t0);
    const num = (x: number, y: number): number => x + (y - x) * k;
    return {
      ambient: mix(a.ambient, b.ambient, k),
      sun: mix(a.sun, b.sun, k),
      clouds: num(a.clouds, b.clouds),
      shade: mix(a.shade, b.shade, k),
      vignette: num(a.vignette, b.vignette),
      long: num(a.long, b.long),
      cast: num(a.cast, b.cast),
    };
  }
  return day[day.length - 1][1];
}

/** How dark an hour is: 0 in the last of the day's sun, 1 in the deepest night there is. Lights count for more the darker it is. */
export function darkness(hour: Hour): number {
  // What falls where the sun does, which is most of the field.
  const lit = [hour.ambient[0] + hour.sun[0], hour.ambient[1] + hour.sun[1], hour.ambient[2] + hour.sun[2]];
  const luma = lit[0] * 0.3 + lit[1] * 0.59 + lit[2] * 0.11;
  return Math.max(0, Math.min(1, (1.04 - luma) / 0.56));
}

/** The colors a kind of light goes through as it cools, and the light it throws on the ground. */
export interface Element {
  hot: number;
  mid: number;
  cool: number;
  light: number;
}

/**
 * These are colors of light, not of things, so they are not the palette's:
 * a flame's heart is nearly white, which no drawn thing is.
 */
export const ELEMENTS: Record<string, Element> = {
  fire: { hot: 0xfff0b8, mid: 0xff9428, cool: 0xc02c14, light: 0xff8a3c },
  arcane: { hot: 0xf2e4ff, mid: 0xae6cff, cool: 0x5226c8, light: 0xa274ff },
  frost: { hot: 0xf0fcff, mid: 0x7cd6ff, cool: 0x2c74d2, light: 0x7cc8ff },
  holy: { hot: 0xfffadc, mid: 0xffd858, cool: 0xe08c1c, light: 0xffd870 },
  venom: { hot: 0xeeffd0, mid: 0x8ee04a, cool: 0x2c8c2c, light: 0x86e060 },
  red: { hot: 0xffe2d2, mid: 0xff4c3c, cool: 0x9c1020, light: 0xff4838 },
  spark: { hot: 0xffffff, mid: 0xffe9a8, cool: 0xff9a3a, light: 0xffe0a0 },
};

/** What each weapon gives off where it hangs by the hero, by its name. Most give off nothing. */
export const WEAPON_LIGHT: Record<string, string | undefined> = {
  torch: 'fire',
  brazier: 'fire',
  staff: 'arcane',
  frost: 'frost',
  venom: 'venom',
  censer: 'holy',
  // The heroes' own.
  unfinished: 'arcane',
  hearthbrand: 'fire',
  passingbell: 'holy',
  widowstear: 'frost',
  morningstar: 'holy',
};

/** The light a hero carries, by who they are. Anyone not here carries a lantern's. */
export const HERO_LIGHT: Record<string, number | undefined> = {
  orrin: 0xc4a4ff,
  nan: 0xffa860,
  ysolde: 0xa8dcff,
  aldous: 0xffe6a0,
  maren: 0xffe6a0,
};
export const LANTERN = 0xffd9a6;
