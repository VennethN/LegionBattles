// How a number is written. An idle game's numbers outgrow their names
// quickly, so past a trillion they take two letters, aa, ab, ac and on,
// which have no end worth worrying about.

const NAMED = ['', 'K', 'M', 'B', 'T'];

/** The letters after a number of this many thousands of thousands: 1 is K, 4 is T, 5 is aa. */
export function suffix(group: number): string {
  if (group < NAMED.length) return NAMED[Math.max(0, group)];
  const n = group - NAMED.length;
  return String.fromCharCode(97 + (Math.floor(n / 26) % 26)) + String.fromCharCode(97 + (n % 26));
}

/**
 * A number in at most three figures and its letters: 999, 1.23K, 45.6M,
 * 789B, 1.05aa. It is cut short, never rounded up, so that what is shown
 * of a purse is never more than is in it. `up` rounds up instead, for a
 * price: what is shown of a price is never less than it costs.
 */
export function fmt(value: number, up = false): string {
  if (!Number.isFinite(value)) return 'MAX';
  if (value < 0) return `-${fmt(-value, !up)}`;
  const round = up ? Math.ceil : Math.floor;
  if (value < 1000) return String(round(value + (up ? -1e-9 : 1e-9)));
  let group = Math.floor(Math.log10(value) / 3);
  let m = value / Math.pow(1000, group);
  // A hair under a thousand of one group is one of the next.
  if (m >= 999.5 && up) {
    m /= 1000;
    group++;
  }
  const places = m < 10 ? 2 : m < 100 ? 1 : 0;
  const k = Math.pow(10, places);
  let shown = round(m * k + (up ? -1e-9 : 1e-9)) / k;
  if (shown >= 1000) {
    shown /= 1000;
    group++;
    return `${shown.toFixed(2)}${suffix(group)}`;
  }
  return `${shown.toFixed(places)}${suffix(group)}`;
}

/** Seconds as a short length of time: 45s, 3m 20s, 2h 05m. */
export function span(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
}

/** A share as a percentage with no more figures than it needs: 0.15 is 15%, 0.025 is 2.5%. */
export function percent(share: number): string {
  const p = share * 100;
  return `${Math.abs(p - Math.round(p)) < 0.05 ? Math.round(p) : p.toFixed(1)}%`;
}
