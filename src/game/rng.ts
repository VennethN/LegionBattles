// The game's dice. A run is worked out from a seed, so that the same seed
// and the same moves give the same run: that is what lets the rules be
// tested, and a wave be measured, without anyone playing it.

export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }

  /** From 0 up to 1. */
  next(): number {
    // Mulberry32: small, fast, and even enough for a game.
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** A whole number from 0 up to `n`. */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  range(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(list: readonly T[]): T {
    return list[this.int(list.length)];
  }

  /** One of a list, each as likely as its weight says. */
  weighted<T>(list: readonly T[], weight: (item: T) => number): T {
    let total = 0;
    for (const item of list) total += Math.max(0, weight(item));
    let roll = this.next() * total;
    for (const item of list) {
      roll -= Math.max(0, weight(item));
      if (roll < 0) return item;
    }
    return list[list.length - 1];
  }

  /** Where the dice are, to carry on from later. */
  get state(): number {
    return this.s;
  }
}
