// The screen. The game is laid out on 1280 by 720 and scaled to fit; on a
// dense screen it is drawn at up to twice that and the cameras zoom to match,
// so that art loaded at 2x stays sharp.

export const W = 1280;
export const H = 720;

/** How many canvas pixels there are to one pixel of the layout. Chosen once, at start. */
export const RES = pickResolution();

function pickResolution(): number {
  if (typeof window === 'undefined') return 1;
  const asked = Number(new URLSearchParams(window.location.search).get('res'));
  if (asked >= 1 && asked <= 3) return asked;
  const fit = Math.min(window.innerWidth / W, window.innerHeight / H);
  const wanted = fit * (window.devicePixelRatio || 1);
  // In halves, and never more than 2: past that a phone pays in fill rate for nothing it can see.
  return Math.min(2, Math.max(1, Math.ceil(wanted * 2 - 0.2) / 2));
}

/** The scale SVGs are rasterized at. */
export const ART_SCALE = 2;

export const FONT = 'Fredoka';

export function hex(color: string): number {
  return parseInt(color.slice(1), 16);
}
