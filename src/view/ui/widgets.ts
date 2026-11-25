// Buttons, labels and panels, drawn as vectors in the palette: a flat fill,
// a darker lip along the bottom, the one dark line round them.

import Phaser from 'phaser';
import { BONE, GOLD, OUTLINE, type Material } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import { FONT, TEXT_FONT, hex, view } from '../config';
import { nine, uiKey } from './grim';

export interface TextOpts {
  size?: number;
  color?: string;
  stroke?: string | null;
  strokeWidth?: number;
  weight?: 600 | 700;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  /** Which face, where the words alone do not say: the display face for labels, the text face for sentences. */
  face?: 'display' | 'text';
}

/** True for words set in the display face: a label, a name in capitals, a number. A sentence is set in the text face. */
export function displayed(text: string, o: TextOpts = {}): boolean {
  if (o.face) return o.face === 'display';
  return text === text.toUpperCase() || !/\s/.test(text.trim());
}

/**
 * Text in one of the game's two faces, with a thin dark line round it so that it reads on the field. Labels and
 * numbers are in the hard display face; sentences in the serif, a size up, as a serif reads smaller than its size.
 */
export function label(scene: Phaser.Scene, x: number, y: number, text: string, o: TextOpts = {}): Phaser.GameObjects.Text {
  const display = displayed(text, o);
  const size = (o.size ?? 24) + (display ? 0 : 1);
  const stroke = o.stroke === undefined ? OUTLINE : o.stroke;
  const t = scene.add.text(x, y, text, {
    fontFamily: display ? `${FONT}, serif` : `${TEXT_FONT}, serif`,
    fontStyle: `${display ? (o.weight ?? 700) : (o.weight ?? 700) === 700 ? 700 : 500}`,
    fontSize: `${size}px`,
    color: o.color ?? BONE.fill,
    stroke: stroke ?? undefined,
    strokeThickness: stroke ? (o.strokeWidth ?? Math.max(3, Math.round(size / 7))) : 0,
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
 * A board drawn with a Graphics object where a picture will not do: hard corners, a face lifted off a darker foot,
 * light along the top, the near-black line round it. The panels a screen keeps are baked pictures (bake.ts).
 */
export function slab(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  mat: Material,
  _radius = 14,
  lip = 6,
): void {
  g.fillStyle(hex(mat.shade), 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(hex(mat.fill), 1);
  g.fillRect(x, y, w, h - Math.max(2, lip * 0.6));
  g.fillStyle(0xfff0d0, 0.14);
  g.fillRect(x, y, w, 2);
  g.lineStyle(2.5, 0x0d0b09, 1);
  g.strokeRect(x, y, w, h);
}

export interface ButtonOpts {
  width?: number;
  height?: number;
  mat?: Material;
  size?: number;
  color?: string;
}

/** The color a board of the kit's is washed with for a material: red only for what must be pressed, brass for the way on, iron for the rest. */
function washOf(mat: Material): number {
  const f = mat.fill.toLowerCase();
  if (f.startsWith('#c7') || f.startsWith('#c0') || f.startsWith('#d0')) return 0xe07a66;
  if (f === '#c8a24a' || f === '#f2d264') return 0xf2dcae;
  if (f === '#e9dfc6' || f === '#d9cdb0') return 0xffffff;
  return 0xb8b2a8;
}

/**
 * A button: one of the style's boards with iron at its ends (large, medium or small, by its height), cut in nine to
 * its width, washed in its material's color, with its words across the middle in the display face. Never smaller
 * than 44 px either way, which is what a finger needs. It lifts a little under a pointer, sinks onto the kit's
 * pressed board when pressed, and fires when let go over it.
 */
export class Button {
  readonly root: Phaser.GameObjects.Container;
  private board: Phaser.GameObjects.NineSlice;
  private readonly text: Phaser.GameObjects.Text;
  private readonly w: number;
  private readonly h: number;
  private readonly kind: 'large' | 'medium' | 'small';
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
    this.kind = this.h >= 62 ? 'large' : this.h >= 50 ? 'medium' : 'small';
    this.mat = o.mat ?? GOLD;
    this.root = scene.add.container(x, y);
    this.board = nine(scene, `button-${this.kind}`, 0, 0, this.w, this.h);
    this.text = label(scene, 0, -2, text, { size: o.size ?? 30, color: o.color, face: 'display' });
    this.root.add([this.board, this.text]);
    this.root.setSize(this.w, this.h);
    this.root.setInteractive({ useHandCursor: true });
    this.root.on('pointerover', () => {
      this.over = true;
      this.draw();
    });
    this.root.on('pointerdown', () => {
      if (!this.enabled) {
        // A button that will not go says so: not enough coins, nothing to open.
        sfx.play('deny', 0.6);
        return;
      }
      this.down = true;
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
    // Pressed, it is the kit's pressed board and its words go down with it; under a pointer it is lifted and lit.
    const key = uiKey(`button-${this.kind}${this.down ? '-pressed' : ''}`);
    if (this.board.texture.key !== key) {
      this.board.destroy();
      this.board = nine(this.scene, `button-${this.kind}${this.down ? '-pressed' : ''}`, 0, 0, this.w, this.h, `button-${this.kind}`);
      this.root.addAt(this.board, 0);
    }
    const lift = this.down ? 2 : this.over && this.enabled ? -1 : 0;
    this.board.setY(lift);
    this.board.setTint(this.over && this.enabled && !this.down ? Math.min(0xffffff, washOf(this.mat) + 0x101010) : washOf(this.mat));
    this.text.y = -2 + lift;
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
