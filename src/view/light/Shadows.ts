// The shadows figures throw. The sun is low in every land (hours.ts), so
// a shadow is long, and it lies the way the light goes: that is most of
// what makes a figure stand on the ground and not on top of a picture.
//
// One of the horde is a single picture, and its shadow is that same
// picture laid down, dark: its own shape. A figure moved part by part (the
// hero, a companion, a captain) would need every part drawn twice, so its
// shadow is one long soft shape instead. Both come from a pool that is
// dealt out afresh every frame, since a hundred figures come and go.
//
// Shadows are things on the ground, not light: they are there with the
// light off as well, and the hour's light falls on them as on the grass.

import Phaser from 'phaser';
import { SHEET } from '../art/Sheet';
import { SUN_ANGLE, type Hour } from './hours';

/** Not quite black: the sky's light is in a shadow. */
const DARK = 0x10122a;
/** How much narrower a thing's shadow is than the thing: the ground is seen from above and aslant. */
const FLAT = 0.72;
const TURN = Math.PI / 2 + SUN_ANGLE;

export class Shadows {
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private used = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly hour: Hour,
  ) {}

  /** A new frame: every shadow is asked for again. */
  begin(): void {
    this.used = 0;
  }

  private next(frame: string): Phaser.GameObjects.Image {
    let img = this.pool[this.used];
    if (!img) {
      // Under everything that stands, over the ground and what is painted on it.
      img = this.scene.add.image(0, 0, SHEET, frame).setDepth(0.4);
      this.pool.push(img);
    }
    this.used++;
    return img.setTexture(SHEET, frame).setVisible(true);
  }

  /** The shadow of one that is a single picture: the picture itself, laid on the ground. `scale` is the picture's own. */
  still(frame: string, x: number, y: number, scale: number, flip: boolean, alpha = 1): void {
    const h = this.hour;
    if (h.cast <= 0.01) return;
    this.next(frame)
      .setPosition(x, y)
      .setRotation(TURN)
      .setFlipX(flip)
      .setScale(scale * FLAT, scale * h.long * 0.82)
      .setTint(DARK)
      .setTintMode(Phaser.TintModes.FILL)
      .setAlpha(h.cast * alpha);
  }

  /** The shadow of a figure moved part by part: one long soft shape from its feet. `tall` and `wide` are the figure's, on the field. */
  blob(x: number, y: number, tall: number, wide: number, alpha = 1): void {
    const h = this.hour;
    if (h.cast <= 0.01) return;
    const long = tall * h.long * 0.8;
    const img = this.next('fx/glow');
    const fw = img.frame.width;
    // It starts under the feet and runs out the way the light goes.
    img
      .setPosition(x + Math.cos(SUN_ANGLE) * long * 0.42, y + Math.sin(SUN_ANGLE) * long * 0.42)
      .setRotation(SUN_ANGLE)
      .setFlipX(false)
      .setScale((long * 2.2) / fw, (wide * FLAT * 2.1) / fw)
      .setTint(DARK)
      .setTintMode(Phaser.TintModes.MULTIPLY)
      .setAlpha(Math.min(0.85, h.cast * 2.6 * alpha));
  }

  /** The frame is laid out: what was not asked for is put away. */
  end(): void {
    for (let i = this.used; i < this.pool.length; i++) this.pool[i].setVisible(false);
  }
}
