// A small seeded generator (mulberry32). The same seed gives the same
// numbers on every machine, which is what makes a battle replayable.

export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** A number from 0 up to but not including 1. */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** A whole number from 0 up to but not including n. */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  pick<T>(list: readonly T[]): T {
    return list[this.int(list.length)];
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Another generator whose numbers do not depend on how many this one has given. */
  fork(salt: number): Rng {
    return new Rng(hash32(this.s ^ Math.imul(salt + 1, 0x9e3779b1)));
  }
}

export function hash32(n: number): number {
  let h = n >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** A seed from a string, for things like "world 2, stage 7". */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return hash32(h);
}
