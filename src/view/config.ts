// The screen. The game is laid out on 1280 by 720 and scaled to fit; on a
// dense screen it is drawn at up to twice that and the cameras zoom to match,
// so that art loaded at 2x stays sharp.

export const W = 1280;
export const H = 720;

const RES_KEY = 'legion-battles-res';

/** The resolution the address asks for (?res=2), or 0. One that is asked for is kept, however the game runs. */
function askedResolution(): number {
  if (typeof window === 'undefined') return 0;
  const asked = Number(new URLSearchParams(window.location.search).get('res'));
  return asked >= 1 && asked <= 3 ? asked : 0;
}

/** True if the resolution may be lowered when frames come slowly. */
export const RES_ADAPTS = askedResolution() === 0;

/**
 * How many canvas pixels there are to one pixel of the layout. Chosen at
 * start from the screen, and lowered while playing if frames come slowly
 * (app.ts, lowerResolution): the number of pixels drawn is what a weak
 * graphics chip pays for, and half the resolution is a quarter of them.
 */
export let RES = pickResolution();

function pickResolution(): number {
  if (typeof window === 'undefined') return 1;
  const asked = askedResolution();
  if (asked) return asked;
  const fit = Math.min(window.innerWidth / W, window.innerHeight / H);
  const wanted = fit * (window.devicePixelRatio || 1);
  // In halves, and never more than 2: past that a phone pays in fill rate for nothing it can see.
  let res = Math.min(2, Math.max(1, Math.ceil(wanted * 2 - 0.2) / 2));
  // A machine that was slow at a resolution before starts below it.
  try {
    const kept = Number(window.localStorage.getItem(RES_KEY));
    if (kept >= 1 && kept < res) res = kept;
  } catch {
    // No storage: the screen's own resolution it is.
  }
  return res;
}

/** Changes the resolution and remembers it for the next visit. app.ts resizes the canvas to match. */
export function setRes(res: number): void {
  RES = res;
  try {
    window.localStorage.setItem(RES_KEY, String(res));
  } catch {
    // Not kept, then.
  }
}

/** The scale SVGs are rasterized at. */
export const ART_SCALE = 2;

export const FONT = 'Fredoka';

export function hex(color: string): number {
  return parseInt(color.slice(1), 16);
}
