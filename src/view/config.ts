// The screen. The game has no fixed shape: it is laid out afresh for
// whatever window it is given, wide or tall, so that it fills a monitor, a
// phone held upright and a portal's frame alike, with no bars round it.
//
// Everything is placed in the layout's own units. A wide window is 720 of
// them high and as wide as its shape makes it; a tall one is 720 wide and as
// high as its shape makes it. The cameras zoom those units up to the
// canvas, which is drawn at up to twice the window's own pixels on a dense
// screen so that the art, rasterized at 2x, stays sharp.

/** A wide window's height and a tall window's width, in the layout's units. */
export const BASE = 720;
/** A window narrower than this for its height is laid out tall: the fight above, the lists below. */
export const TALL_BELOW = 1.2;

export interface View {
  /** The window in the layout's units. */
  w: number;
  h: number;
  /** True for a window laid out tall. */
  tall: boolean;
  /** Canvas pixels to one unit of the layout: what every camera zooms by. */
  zoom: number;
  /** How sharp text and baked drawings are made: canvas pixels to a unit, within reason. */
  res: number;
  /** The canvas, in its own pixels, and how many of them there are to one of the window's. */
  width: number;
  height: number;
  density: number;
}

export const view: View = { w: 1280, h: 720, tall: false, zoom: 1, res: 1, width: 1280, height: 720, density: 1 };

/** The density the address asks for (?res=2), or 0. */
function askedDensity(): number {
  if (typeof window === 'undefined') return 0;
  const asked = Number(new URLSearchParams(window.location.search).get('res'));
  return asked >= 0.5 && asked <= 3 ? asked : 0;
}

/**
 * Works the view out for a window of this many of its own pixels. The
 * canvas is as dense as the screen up to 2, and never more than about four
 * million pixels in all: past that a phone's graphics pay for what an eye
 * cannot see.
 */
export function fit(cssW: number, cssH: number, dpr = 1): View {
  const w = Math.max(200, cssW);
  const h = Math.max(200, cssH);
  const aspect = w / h;
  view.tall = aspect < TALL_BELOW;
  if (view.tall) {
    view.w = BASE;
    view.h = BASE / aspect;
  } else {
    view.h = BASE;
    view.w = BASE * aspect;
  }
  let density = askedDensity() || Math.min(2, Math.max(1, dpr));
  if (!askedDensity()) {
    const most = 4_200_000;
    if (w * h * density * density > most) density = Math.max(1, Math.sqrt(most / (w * h)));
  }
  view.density = density;
  view.width = Math.round(w * density);
  view.height = Math.round(h * density);
  view.zoom = view.width / view.w;
  view.res = Math.min(3, Math.max(1, view.zoom));
  return view;
}

// The scale SVGs are rasterized at is the art runtime's to say (art/scale.ts). It is passed on here for the screens.
export { ART_SCALE } from './art/scale';

export const FONT = 'Fredoka';

export function hex(color: string): number {
  return parseInt(color.slice(1), 16);
}
