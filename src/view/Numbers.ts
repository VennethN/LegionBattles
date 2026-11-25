// The numbers that float up from a hit or a heal. They are bitmap text from
// a small sheet of digits drawn once at start in the game's font, so showing
// one costs no canvas work, and they come from a pool.

import Phaser from 'phaser';
import { OUTLINE } from '../art/kit/palette';
import { FONT } from './config';
import { SHEET, type Sheet } from './art/Sheet';

export const DIGITS_KEY = 'digits';
// The digits, and the letters a big number is cut short with (game/format.ts): K, M, B, T and then aa, ab and on.
const CHARS = '0123456789.+-KMBTabcdefghijklmnopqrstuvwxyz';
// Narrow cells: the display face is condensed, and wide ones set its digits apart ("1 2" read as two numbers).
const CELL_W = 30;
const CELL_H = 60;

/**
 * Draws the digits and registers them as a bitmap font. They go on the
 * sheet with everything else, so a number is in the same batch as the units
 * it floats over. Call once, after the font has loaded.
 */
export function makeDigitFont(scene: Phaser.Scene, sheet: Sheet): void {
  if (scene.cache.bitmapFont.exists(DIGITS_KEY)) return;
  const canvas = document.createElement('canvas');
  canvas.width = CELL_W * CHARS.length;
  canvas.height = CELL_H;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.font = `700 46px ${FONT}, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 9;
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < CHARS.length; i++) {
    const x = i * CELL_W + CELL_W / 2;
    ctx.strokeText(CHARS[i], x, CELL_H / 2 + 2);
    ctx.fillText(CHARS[i], x, CELL_H / 2 + 2);
  }
  sheet.keep('digits', canvas, canvas.width, canvas.height, null);
  const frame = scene.textures.getFrame(SHEET, 'digits');
  const config = {
    image: SHEET,
    width: CELL_W,
    height: CELL_H,
    chars: CHARS,
    charsPerRow: CHARS.length,
    'offset.x': frame.cutX,
    'offset.y': frame.cutY,
    'spacing.x': 0,
    'spacing.y': 0,
    lineSpacing: 0,
  };
  scene.cache.bitmapFont.add(DIGITS_KEY, Phaser.GameObjects.RetroFont.Parse(scene, config));
}

interface Num {
  text: Phaser.GameObjects.BitmapText;
  active: boolean;
  t: number;
  x: number;
  y: number;
  vx: number;
  size: number;
}

const LIFE = 0.8;

export class Numbers {
  private pool: Num[] = [];
  private flip = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    size = 40,
  ) {
    for (let i = 0; i < size; i++) this.pool.push(this.make());
  }

  private make(): Num {
    const text = this.scene.add.bitmapText(0, 0, DIGITS_KEY, '0', 26).setOrigin(0.5).setVisible(false).setActive(false);
    text.setLetterSpacing(-14);
    text.depth = 7000;
    return { text, active: false, t: 0, x: 0, y: 0, vx: 0, size: 26 };
  }

  /** The zoom of the field on show. Numbers shrink with it, but less: they are read, not looked at. */
  zoom = 1;

  show(x: number, y: number, value: string, color: number, size = 26): void {
    let n: Num | null = null;
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        n = this.pool[i];
        break;
      }
    }
    if (!n) {
      n = this.make();
      this.pool.push(n);
    }
    n.active = true;
    n.t = 0;
    // Numbers that come together drift apart, left then right.
    this.flip = -this.flip;
    n.x = x + this.flip * 6;
    n.y = y;
    // Never on top of one still on show: a party's blows land together, and two numbers over each other read as one
    // garbled one. Moved down a line, under it, until it is clear: what is older has risen above.
    const w = value.length * size * 0.62 * Math.max(0.8, this.zoom);
    const line = size * 1.05 * Math.max(0.8, this.zoom);
    for (let tries = 0; tries < 5; tries++) {
      const over = this.pool.some((o) => {
        if (o === n || !o.active) return false;
        // Where it is now, worked out as update() places it: one shown this frame has not been placed yet.
        const k = o.t / LIFE;
        const ox = o.x + o.vx * k;
        const oy = o.y - 44 * this.zoom * (1 - (1 - k) * (1 - k));
        const ow = o.text.text.length * o.size * 0.62;
        return Math.abs(ox - n.x) < (w + ow) / 2 && Math.abs(oy - n.y) < line;
      });
      if (!over) break;
      n.y += line;
    }
    n.vx = this.flip * 16;
    n.size = size * Math.max(0.8, this.zoom);
    n.text.setText(value);
    n.text.setTint(color);
    n.text.setActive(true).setVisible(true);
  }

  update(dt: number): void {
    for (let i = 0; i < this.pool.length; i++) {
      const n = this.pool[i];
      if (!n.active) continue;
      n.t += dt;
      if (n.t >= LIFE) {
        n.active = false;
        n.text.setVisible(false).setActive(false);
        continue;
      }
      const k = n.t / LIFE;
      // Up fast, then slower; a pop at the start; gone over the last third.
      const rise = 1 - (1 - k) * (1 - k);
      const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.65 : 1.25 - Math.min(1, (k - 0.15) / 0.2) * 0.25;
      n.text.x = n.x + n.vx * k;
      n.text.y = n.y - 44 * this.zoom * rise;
      n.text.setFontSize(n.size * pop);
      n.text.alpha = k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35;
    }
  }

  clear(): void {
    for (const n of this.pool) {
      n.active = false;
      n.text.setVisible(false).setActive(false);
    }
  }
}
