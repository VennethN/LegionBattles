// Buttons, labels and panels, drawn as vectors in the palette: a flat fill,
// a darker lip along the bottom, the one dark line round them.

import Phaser from 'phaser';
import { BONE, GOLD, HIGHLIGHT, OUTLINE, type Material } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { FONT, hex, view } from '../config';
import { BAKE_PAD, ribbonImage, slabKey } from './bake';

export interface TextOpts {
  size?: number;
  color?: string;
  stroke?: string | null;
  strokeWidth?: number;
  weight?: 600 | 700;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
}

/** Text in the game's font with the dark line round it. */
export function label(scene: Phaser.Scene, x: number, y: number, text: string, o: TextOpts = {}): Phaser.GameObjects.Text {
  const size = o.size ?? 24;
  const stroke = o.stroke === undefined ? OUTLINE : o.stroke;
  const t = scene.add.text(x, y, text, {
    fontFamily: `${FONT}, sans-serif`,
    fontStyle: `${o.weight ?? 700}`,
    fontSize: `${size}px`,
    color: o.color ?? BONE.fill,
    stroke: stroke ?? undefined,
    strokeThickness: stroke ? (o.strokeWidth ?? Math.max(4, Math.round(size / 5))) : 0,
    align: o.align ?? 'center',
    wordWrap: o.wrap ? { width: o.wrap } : undefined,
  });
  t.setResolution(Math.max(1, view.res));
  t.setOrigin(o.align === 'left' ? 0 : o.align === 'right' ? 1 : 0.5, 0.5);
  return t;
}

/** Takes the dark line off a button's words: for dark words on a pale button. */
export function plain(button: Button): Button {
  for (const o of button.root.list) {
    if (o instanceof Phaser.GameObjects.Text) o.setStroke(BONE.fill, 0);
  }
  return button;
}

/**
 * A rounded slab: fill, a darker lip along the bottom, a band of light
 * along the top as the art has, and a dark line round it.
 */
export function slab(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  mat: Material,
  radius = 14,
  lip = 6,
): void {
  g.fillStyle(hex(mat.shade), 1);
  g.fillRoundedRect(x, y, w, h, radius);
  g.fillStyle(hex(mat.fill), 1);
  g.fillRoundedRect(x, y, w, h - lip, radius);
  // The light comes from the top left, on a panel as on a unit. Small slabs and flat ones go without.
  if (lip > 0 && h >= 30 && w >= 40) {
    g.fillStyle(hex(HIGHLIGHT), 0.22);
    g.fillRoundedRect(x + 5, y + 4, w - 10, Math.min(7, h * 0.16), Math.min(radius, 5));
  }
  g.lineStyle(4, hex(OUTLINE), 1);
  g.strokeRoundedRect(x, y, w, h, radius);
}

export interface ButtonOpts {
  width?: number;
  height?: number;
  mat?: Material;
  size?: number;
  color?: string;
}

/**
 * A button. Never smaller than 44 px either way, which is what a finger
 * needs. It sinks when pressed and fires when let go over it. Its slab is a
 * picture made once for its size and color (bake.ts), up and down.
 */
export class Button {
  readonly root: Phaser.GameObjects.Container;
  private readonly slab: Phaser.GameObjects.Image;
  private readonly text: Phaser.GameObjects.Text;
  private readonly w: number;
  private readonly h: number;
  private mat: Material;
  private enabled = true;
  private down = false;
  private over = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    private readonly onClick: () => void,
    o: ButtonOpts = {},
  ) {
    this.w = Math.max(44, o.width ?? 200);
    this.h = Math.max(44, o.height ?? 64);
    this.mat = o.mat ?? GOLD;
    this.root = scene.add.container(x, y);
    this.slab = scene.add.image(0, 0, slabKey(scene, this.w, this.h, this.mat, 16, 7));
    this.text = label(scene, 0, -3, text, { size: o.size ?? 30, color: o.color });
    this.root.add([this.slab, this.text]);
    this.root.setSize(this.w, this.h);
    this.root.setInteractive({ useHandCursor: true });
    this.root.on('pointerdown', () => {
      if (!this.enabled) {
        // A button that will not go says so: not enough coins, nothing to open.
        sfx.play('deny', 0.6);
        return;
      }
      this.down = true;
      this.draw();
    });
    // Under a pointer it lifts a little: it is seen to be a thing that can be pressed before it is pressed.
    this.root.on('pointerover', () => {
      this.over = true;
      this.draw();
    });
    this.root.on('pointerout', () => {
      this.down = false;
      this.over = false;
      this.draw();
    });
    this.root.on('pointerup', () => {
      if (!this.enabled || !this.down) return;
      this.down = false;
      this.draw();
      sfx.play('click');
      this.onClick();
    });
    this.draw();
  }

  private draw(): void {
    // Pressed, it is a little shorter and its lip thinner: it has gone down into the page.
    const sink = this.down ? 4 : 0;
    const h = this.h - sink;
    this.slab
      .setTexture(slabKey(this.scene, this.w, h, this.mat, 16, this.down ? 3 : 7))
      .setDisplaySize(this.w + BAKE_PAD * 2, h + BAKE_PAD * 2)
      .setY(sink / 2);
    this.text.y = -3 + sink;
    this.root.alpha = this.enabled ? 1 : 0.5;
    this.root.setScale(this.over && this.enabled && !this.down ? 1.04 : 1);
  }

  setText(text: string): this {
    this.text.setText(text);
    return this;
  }

  setMaterial(mat: Material): this {
    this.mat = mat;
    this.draw();
    return this;
  }

  setEnabled(on: boolean): this {
    this.enabled = on;
    this.draw();
    return this;
  }

  setVisible(on: boolean): this {
    this.root.setVisible(on);
    if (on) this.root.setInteractive({ useHandCursor: true });
    else this.root.disableInteractive();
    return this;
  }

  setDepth(d: number): this {
    this.root.setDepth(d);
    return this;
  }

  /** Where it is on the screen, for the tutorial to point at. */
  get rect(): { x: number; y: number; w: number; h: number } {
    return { x: this.root.x - this.w / 2, y: this.root.y - this.h / 2, w: this.w, h: this.h };
  }

  destroy(): void {
    this.root.destroy();
  }
}

/**
 * A screen's heading: its words on a ribbon. One a screen, and the biggest words on it. Returns what it made, for
 * whoever keeps a screen's things together.
 */
export function heading(scene: Phaser.Scene, cx: number, y: number, text: string, mat?: Material): Phaser.GameObjects.GameObject[] {
  const t = label(scene, cx, y - 2, text, { size: 26 });
  const ribbon = ribbonImage(scene, cx, y, Math.max(160, t.width + 56), 40, mat);
  t.setDepth(ribbon.depth + 1);
  scene.children.bringToTop(t);
  return [ribbon, t];
}
