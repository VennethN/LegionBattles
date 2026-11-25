// What hour it is in each wave, as light. A land is come into in the
// afternoon and its captain is met at night: the light goes down wave by
// wave, so that the lights the fight makes count for more the further in
// it is. Every number of the light's color is here.

import type { Land } from '../../game/data';

type Rgb = [number, number, number];

export interface Hour {
  /** The light that falls on everything. Over one is brighter than the pictures were drawn. */
  ambient: Rgb;
  /** The color of the shafts through the air: the sun's by day, the moon's or the sky's by night. */
  sun: Rgb;
  /** How strong the shafts are, and how deep the cloud shadow. */
  shafts: number;
  clouds: number;
  /** What the darkest parts of the picture lean to. */
  shade: Rgb;
  /** How dark the rim of the view is. */
  vignette: number;
}

/** The hours a land passes through, by how far through its waves it is: 0 at its first, 1 at its captain's. */
const DAYS: Record<Land, Array<[number, Hour]>> = {
  meadow: [
    [0, { ambient: [0.96, 0.96, 0.9], sun: [1.0, 0.9, 0.6], shafts: 0.22, clouds: 0.26, shade: [0.84, 0.95, 1.12], vignette: 0.34 }],
    [0.45, { ambient: [0.98, 0.88, 0.8], sun: [1.0, 0.58, 0.3], shafts: 0.24, clouds: 0.22, shade: [0.95, 0.84, 1.08], vignette: 0.42 }],
    [0.8, { ambient: [0.72, 0.58, 0.76], sun: [1.0, 0.5, 0.46], shafts: 0.16, clouds: 0.12, shade: [0.8, 0.84, 1.2], vignette: 0.44 }],
    [1, { ambient: [0.58, 0.63, 0.84], sun: [0.55, 0.72, 1.0], shafts: 0.1, clouds: 0.1, shade: [0.78, 0.9, 1.24], vignette: 0.44 }],
  ],
  desert: [
    [0, { ambient: [0.97, 0.94, 0.86], sun: [1.0, 0.94, 0.72], shafts: 0.14, clouds: 0.1, shade: [0.95, 0.9, 1.05], vignette: 0.32 }],
    [0.5, { ambient: [0.96, 0.8, 0.68], sun: [1.0, 0.52, 0.26], shafts: 0.22, clouds: 0.1, shade: [1.0, 0.8, 1.0], vignette: 0.44 }],
    [0.8, { ambient: [0.72, 0.54, 0.66], sun: [0.9, 0.42, 0.5], shafts: 0.12, clouds: 0, shade: [0.84, 0.8, 1.2], vignette: 0.5 }],
    [1, { ambient: [0.56, 0.56, 0.8], sun: [0.6, 0.7, 1.0], shafts: 0.08, clouds: 0, shade: [0.8, 0.88, 1.24], vignette: 0.44 }],
  ],
  snow: [
    [0, { ambient: [0.9, 0.95, 1.02], sun: [1.0, 0.95, 0.84], shafts: 0.16, clouds: 0.28, shade: [0.84, 0.94, 1.14], vignette: 0.36 }],
    [0.5, { ambient: [0.62, 0.72, 0.98], sun: [0.8, 0.76, 1.0], shafts: 0.12, clouds: 0.16, shade: [0.78, 0.9, 1.24], vignette: 0.46 }],
    // The last of it is under the northern lights.
    [1, { ambient: [0.52, 0.6, 0.82], sun: [0.36, 1.0, 0.7], shafts: 0.14, clouds: 0.08, shade: [0.78, 0.92, 1.24], vignette: 0.44 }],
  ],
};

/** Where each land's waves begin and end in the twenty. */
const SPANS: Record<Land, [number, number]> = { meadow: [1, 7], desert: [8, 14], snow: [15, 20] };

function mix(a: Rgb, b: Rgb, k: number): Rgb {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/** The hour of a wave. Past the twentieth the days come round again, as the waves do. */
export function hourOf(land: Land, wave: number): Hour {
  const at = ((wave - 1) % 20) + 1;
  const [from, to] = SPANS[land];
  const t = Math.max(0, Math.min(1, (at - from) / Math.max(1, to - from)));
  const day = DAYS[land];
  for (let i = 1; i < day.length; i++) {
    const [t1, b] = day[i];
    const [t0, a] = day[i - 1];
    if (t > t1) continue;
    const k = (t - t0) / (t1 - t0);
    return {
      ambient: mix(a.ambient, b.ambient, k),
      sun: mix(a.sun, b.sun, k),
      shafts: a.shafts + (b.shafts - a.shafts) * k,
      clouds: a.clouds + (b.clouds - a.clouds) * k,
      shade: mix(a.shade, b.shade, k),
      vignette: a.vignette + (b.vignette - a.vignette) * k,
    };
  }
  return day[day.length - 1][1];
}

/** How dark an hour is: 0 in full day, 1 in the deepest night there is. Lights count for more the darker it is. */
export function darkness(hour: Hour): number {
  const luma = hour.ambient[0] * 0.3 + hour.ambient[1] * 0.59 + hour.ambient[2] * 0.11;
  return Math.max(0, Math.min(1, (1 - luma) / 0.42));
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
};

/** The light a hero carries, by who they are. Anyone not here carries a lantern's. */
export const HERO_LIGHT: Record<string, number | undefined> = {
  mage: 0xc4a4ff,
  pyromancer: 0xffa860,
  frostwitch: 0xa8dcff,
  cleric: 0xffe6a0,
  paladin: 0xffe6a0,
};
export const LANTERN = 0xffd9a6;
