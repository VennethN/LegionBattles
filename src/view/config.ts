import type Phaser from 'phaser';
// The screen. The game has no fixed shape: it is laid out afresh for
// whatever window it is given, wide or tall, so that it fills a monitor, a
// phone held either way and a portal's frame alike, with no bars round it.
//
// Everything is placed in the layout's own units. A wide window is 600 of
// them high and as wide as its shape makes it; a tall one is 600 wide and
// as high as its shape makes it. That is fewer units than the sister games
// have, on purpose: a portal shows a game in a frame as small as 821 by
// 462, and at 600 units high the smallest words here are still eleven of
// that frame's pixels tall. The cameras zoom the units up to the canvas,
// which is drawn at up to twice the window's own pixels on a dense screen
// so that the art stays sharp.

/** A wide window's height and a tall window's width, in the layout's units. */
export const BASE = 600;
/** A window narrower than this for its height is laid out tall. */
export const TALL_BELOW = 1;
/** The least a wide layout is across, and the least a tall one is high: what the camp's wares need side by side, and one over another. */
export const WIDE_LEAST = 760;
export const TALL_LEAST = 860;

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
    view.h = Math.max(BASE / aspect, TALL_LEAST);
    view.w = view.h * aspect;
  } else {
    view.w = Math.max(BASE * aspect, WIDE_LEAST);
    view.h = view.w / aspect;
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

/**
 * True where the player steers with a finger: a phone or a tablet. It is asked of the browser in two ways, since
 * neither alone is right everywhere: a laptop with a touch screen has touch and a mouse, and some phones' browsers
 * say they are desktops.
 */
export function byFinger(game: Phaser.Game): boolean {
  const coarse = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return coarse || (game.device.input.touch && !game.device.os.desktop);
}
