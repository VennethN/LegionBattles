// Dice that roll the same every time: a scene is put together by a seed, so
// that the picture drawn today is the picture drawn tomorrow.

export class Dice {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }

  /** From 0 up to 1. */
  next(): number {
    this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0;
    return this.s / 4294967296;
  }

  /** A whole number from 0 up to `n`. */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}
