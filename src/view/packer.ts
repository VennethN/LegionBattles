// Where pictures go on a sheet: in rows, each as tall as its tallest
// picture. Pure arithmetic, so that a test can ask whether the biggest
// battle the game can stage fits.

export interface Spot {
  x: number;
  y: number;
}

export class ShelfPacker {
  private penX: number;
  private penY: number;
  private rowH = 0;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly pad = 2,
  ) {
    this.penX = pad;
    this.penY = pad;
  }

  /** Room for a w by h picture, or null if there is none left. */
  place(w: number, h: number): Spot | null {
    if (this.penX + w + this.pad > this.width) {
      this.penX = this.pad;
      this.penY += this.rowH + this.pad;
      this.rowH = 0;
    }
    if (this.penY + h + this.pad > this.height) return null;
    const spot = { x: this.penX, y: this.penY };
    this.penX += w + this.pad;
    this.rowH = Math.max(this.rowH, h);
    return spot;
  }

  /** Where the pen is, to come back to. */
  mark(): [number, number, number] {
    return [this.penX, this.penY, this.rowH];
  }

  restore(m: readonly [number, number, number]): void {
    [this.penX, this.penY, this.rowH] = m;
  }

  /** Ends the row, so that what comes next starts on a line of its own. Returns that line's top. */
  newRow(): number {
    if (this.penX > this.pad) {
      this.penX = this.pad;
      this.penY += this.rowH + this.pad;
      this.rowH = 0;
    }
    return this.penY;
  }

  /** Whether all of these would fit from here, without placing any. Give them tallest first. */
  fits(sizes: ReadonlyArray<readonly [number, number]>): boolean {
    const m = this.mark();
    let ok = true;
    for (const [w, h] of sizes) {
      if (!this.place(w, h)) {
        ok = false;
        break;
      }
    }
    this.restore(m);
    return ok;
  }

  /** The share of the sheet's height that is used. */
  used(): number {
    return (this.penY + this.rowH) / this.height;
  }
}
