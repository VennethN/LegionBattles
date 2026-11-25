// Where pictures go on a sheet. Pure arithmetic, so that a test can ask
// whether everything a game shows at once fits.
//
// It keeps the outline of what has been placed so far, as seen from below
// (a skyline), and sets each new picture where it comes to rest highest up,
// as far left as it can. Pictures of every height sit side by side that
// way, and a sheet holds about twice what it does when they are laid in
// rows as tall as their tallest.

export interface Spot {
  x: number;
  y: number;
}

/** A stretch of the outline: from x, w wide, with everything above y taken. */
interface Step {
  x: number;
  y: number;
  w: number;
}

/** Where the packer stood, to come back to. */
export type Mark = readonly Step[];

export class SkylinePacker {
  private line: Step[];

  constructor(
    readonly width: number,
    readonly height: number,
    readonly pad = 2,
  ) {
    this.line = [{ x: pad, y: pad, w: width - pad }];
  }

  /** The best place for a picture w wide on this outline: [index of the step it starts on, its top], or null. */
  private find(line: readonly Step[], w: number, h: number): [number, number] | null {
    const need = w + this.pad;
    let best = -1;
    let bestY = Infinity;
    for (let i = 0; i < line.length; i++) {
      const x = line[i].x;
      if (x + need > this.width) break;
      // It rests on the highest of the steps it lies across.
      let y = 0;
      let reach = 0;
      for (let k = i; k < line.length && reach < need; k++) {
        if (line[k].y > y) y = line[k].y;
        reach = line[k].x + line[k].w - x;
      }
      if (y + h + this.pad > this.height) continue;
      if (y < bestY) {
        bestY = y;
        best = i;
      }
    }
    return best < 0 ? null : [best, bestY];
  }

  /** Sets a picture down on an outline at the place found for it, and returns the outline's new steps. */
  private put(line: Step[], at: number, y: number, w: number, h: number): void {
    const x = line[at].x;
    const need = w + this.pad;
    const end = x + need;
    const fresh: Step = { x, y: y + h + this.pad, w: need };
    // The steps it covers go; one it covers part of is cut back to what still shows.
    let k = at;
    while (k < line.length && line[k].x + line[k].w <= end) k++;
    const rest = line.slice(k);
    if (rest.length > 0 && rest[0].x < end) {
      const cut = end - rest[0].x;
      rest[0] = { x: end, y: rest[0].y, w: rest[0].w - cut };
    }
    line.length = at;
    // Two steps at one height are one step.
    const last = line[line.length - 1];
    if (last && last.y === fresh.y) last.w += fresh.w;
    else line.push(fresh);
    for (const s of rest) {
      const tail = line[line.length - 1];
      if (tail.y === s.y) tail.w += s.w;
      else line.push(s);
    }
  }

  /** Room for a w by h picture, or null if there is none left. */
  place(w: number, h: number): Spot | null {
    const found = this.find(this.line, w, h);
    if (!found) return null;
    const spot = { x: this.line[found[0]].x, y: found[1] };
    this.put(this.line, found[0], found[1], w, h);
    return spot;
  }

  mark(): Mark {
    return this.line.map((s) => ({ ...s }));
  }

  restore(m: Mark): void {
    this.line = m.map((s) => ({ ...s }));
  }

  /** Draws a line under everything so far: what comes next is all below it. Returns that line's top. */
  newRow(): number {
    let y = this.pad;
    for (const s of this.line) if (s.y > y) y = s.y;
    this.line = [{ x: this.pad, y, w: this.width - this.pad }];
    return y;
  }

  /** Whether all of these would fit from here, without placing any. Give them tallest first. */
  fits(sizes: ReadonlyArray<readonly [number, number]>): boolean {
    const line = this.line.map((s) => ({ ...s }));
    for (const [w, h] of sizes) {
      const found = this.find(line, w, h);
      if (!found) return false;
      this.put(line, found[0], found[1], w, h);
    }
    return true;
  }

  /** The share of the sheet's height that is used. */
  used(): number {
    let y = 0;
    for (const s of this.line) if (s.y > y) y = s.y;
    return y / this.height;
  }
}
