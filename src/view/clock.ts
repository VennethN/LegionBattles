// The day, by the player's own clock. The rules of the rewards are told the
// day (game/rewards.ts) and never ask for it, so that the tests can turn the
// calendar's pages; this is what asks.
//
// `?days=2` in the address moves the clock two days on, and so does
// addDays() from the browser's console: that is how the walks (scripts/)
// come back tomorrow.

import { dayOf } from '../game/rewards';

let shift = 0;
if (typeof window !== 'undefined') {
  const asked = Number(new URLSearchParams(window.location.search).get('days'));
  if (Number.isFinite(asked)) shift = Math.floor(asked);
}

let day = 0;
let asked = -Infinity;

/**
 * Today, as days since 1970 where the player is. The main screen asks every
 * frame, so the clock itself is read once a second and no more.
 */
export function today(): number {
  const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (t - asked >= 1000) {
    asked = t;
    const now = new Date();
    day = dayOf(now.getTime(), now.getTimezoneOffset());
  }
  return day + shift;
}

/** Moves the clock on by whole days. For the console and the walks. */
export function addDays(n: number): number {
  shift += Math.floor(n);
  return today();
}
