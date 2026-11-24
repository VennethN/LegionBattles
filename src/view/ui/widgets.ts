// Buttons, labels and panels, drawn as vectors in the palette: a flat fill,
// a darker lip along the bottom, the one dark line round them.

import Phaser from 'phaser';
import { BONE, GOLD, HIGHLIGHT, OUTLINE, type Material } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { FONT, RES, hex } from '../config';

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
  t.setResolution(Math.max(1, RES));
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
 * needs. It sinks when pressed and fires when let go over it.
 */
export class Button {
  readonly root: Phaser.GameObjects.Container;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private readonly w: number;
  private readonly h: number;
  private mat: Material;
  private enabled = true;
  private down = false;

  constructor(
    scene: Phaser.Scene,
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
    this.g = scene.add.graphics();
    this.text = label(scene, 0, -3, text, { size: o.size ?? 30, color: o.color });
    this.root.add([this.g, this.text]);
    this.root.setSize(this.w, this.h);
    this.root.setInteractive({ useHandCursor: true });
    this.root.on('pointerdown', () => {
      if (!this.enabled) return;
      this.down = true;
      this.draw();
    });
    this.root.on('pointerout', () => {
      this.down = false;
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
    const g = this.g;
    g.clear();
    const sink = this.down ? 4 : 0;
    slab(g, -this.w / 2, -this.h / 2 + sink, this.w, this.h - sink, this.mat, 16, this.down ? 3 : 7);
    this.text.y = -3 + sink;
    this.root.alpha = this.enabled ? 1 : 0.5;
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
