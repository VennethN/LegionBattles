// Dice that roll the same way every time for the same name: a ragged edge
// has to be ragged the same way in every build, or the files change when
// nothing was changed.

export interface Dice {
  /** 0 up to, not including, 1. */
  next(): number;
  /** From a to b. */
  range(a: number, b: number): number;
}

export function dice(seed: string): Dice {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, range: (lo, hi) => lo + (hi - lo) * next() };
}
