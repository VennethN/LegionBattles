// How much the screen is moved and flashed. Some players want a hit to be
// felt in the whole screen, and some find that hard to watch: CALM keeps the
// effects but takes most of the shaking and the flashing out. It is kept
// beside the save, as the light's setting is.

export type FeelMode = 'full' | 'calm';

const KEY = 'boss-hunters-feel';
let now: FeelMode | null = null;

export function feelMode(): FeelMode {
  if (now) return now;
  let kept: string | null = null;
  try {
    kept = localStorage.getItem(KEY);
  } catch {
    // No storage: as it comes.
  }
  now = kept === 'calm' ? 'calm' : 'full';
  return now;
}

export function setFeelMode(mode: FeelMode): void {
  now = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Not kept, then.
  }
}

export function nextFeelMode(mode: FeelMode): FeelMode {
  return mode === 'full' ? 'calm' : 'full';
}

export const FEEL_NAMES: Record<FeelMode, string> = { full: 'FULL', calm: 'CALM' };

/** How much of a shake or a flash is kept in each mode. */
export function feelShare(): { shake: number; flash: number; stop: number } {
  return feelMode() === 'calm' ? { shake: 0.25, flash: 0.35, stop: 0.6 } : { shake: 1, flash: 1, stop: 1 };
}
