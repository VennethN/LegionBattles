// Where to draw a thing between two steps of the wave.
//
// The wave moves in fixed steps, sixty to the second (game/world.ts), so
// that it plays the same on every machine. A screen draws when it likes: a
// frame may come after no step, or after two, and at 75 or 144 frames a
// second the two never line up. Drawn where the last step left it, a
// figure moving steadily is then seen to move unevenly: a jerk every few
// frames. The owner called it "the clanky animation when moving hero".
//
// So each thing's place before the last step is kept, and it is drawn part
// way from there to where it is now, by how far the frame is into the next
// step. The rules are untouched; this is only where the picture is put.

export class Blend {
  private readonly was = new Map<number | string, [number, number]>();
  private readonly seen = new Set<number | string>();

  /** Called for a thing just before a step moves it: where it is now is where it was. */
  keep(id: number | string, x: number, y: number): void {
    const at = this.was.get(id);
    if (at) {
      at[0] = x;
      at[1] = y;
    } else this.was.set(id, [x, y]);
    this.seen.add(id);
  }

  /** After a step: whatever was not kept this time is gone, and is forgotten. */
  prune(): void {
    if (this.was.size === this.seen.size) {
      this.seen.clear();
      return;
    }
    for (const id of this.was.keys()) if (!this.seen.has(id)) this.was.delete(id);
    this.seen.clear();
  }

  /**
   * Where to draw a thing that is at (x, y) after the last step, `share` of the way into the next one. A thing
   * with no place before (it has just come to be) is drawn where it is, and so is one that leapt further than any
   * step moves a thing: that is a leap, not a move to be drawn half way through.
   */
  x(id: number | string, x: number, share: number, leap = 60): number {
    const at = this.was.get(id);
    if (!at || Math.abs(x - at[0]) > leap) return x;
    return at[0] + (x - at[0]) * share;
  }

  y(id: number | string, y: number, share: number, leap = 60): number {
    const at = this.was.get(id);
    if (!at || Math.abs(y - at[1]) > leap) return y;
    return at[1] + (y - at[1]) * share;
  }

  clear(): void {
    this.was.clear();
    this.seen.clear();
  }
}

/**
 * How far a frame is into the step after the last one taken, from 0 to 1: the time left over after whole steps,
 * as a share of a step.
 */
export function shareOf(left: number, step: number): number {
  return Math.max(0, Math.min(1, left / step));
}
