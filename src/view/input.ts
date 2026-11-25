// How the hero is steered: by the keys, or by a finger or the mouse held
// down and dragged, which is a stick wherever it was put down.
//
// The keys are read by where they are on the keyboard and not by the letter
// on them, so that the same four keys steer on a keyboard laid out in
// another way (the top-left letters are ZQSD in France).

import type Phaser from 'phaser';
import type { Steer } from '../game/world';
import { view } from './config';

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};

/** How far, in the layout's units, a finger is dragged for the hero to run flat out. */
const STICK = 46;

export interface Stick {
  /** Where it was put down, and where the finger is now, in the layout's units. */
  x0: number;
  y0: number;
  x: number;
  y: number;
}

export class Controls {
  /** The stick, while a finger or the mouse is held down. */
  stick: Stick | null = null;
  /** True once the hero has been steered at all: the hint that says how goes away. */
  used = false;
  /** True if the last steering was by touch: the hint shows a finger, not keys. */
  touch = false;

  private readonly down = new Set<string>();
  private pointer = -1;
  /** True from when the move was asked for until the field has taken it. */
  private want = false;
  private readonly onDown = (e: KeyboardEvent): void => {
    if (KEYS[e.code]) {
      this.down.add(e.code);
      e.preventDefault();
    } else if (e.code === 'Space') {
      // The space bar lets the hero's move loose.
      this.want = true;
      e.preventDefault();
    }
  };
  private readonly onUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
  };
  private readonly onBlur = (): void => {
    this.down.clear();
    this.stick = null;
    this.pointer = -1;
  };

  constructor(scene: Phaser.Scene) {
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('blur', this.onBlur);
    const at = (p: Phaser.Input.Pointer): [number, number] => [p.x / view.zoom, p.y / view.zoom];
    scene.input.mouse?.disableContextMenu();
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer, over: unknown[]) => {
      // The other button of the mouse lets the move loose, wherever it is pressed.
      if (p.rightButtonDown()) {
        this.want = true;
        return;
      }
      // A press on a button is the button's.
      if (over.length > 0 || this.pointer >= 0) return;
      const [x, y] = at(p);
      this.pointer = p.id;
      this.stick = { x0: x, y0: y, x, y };
      this.touch = p.wasTouch;
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pointer || !this.stick) return;
      [this.stick.x, this.stick.y] = at(p);
    });
    const lift = (p: Phaser.Input.Pointer): void => {
      if (p.id !== this.pointer) return;
      this.pointer = -1;
      this.stick = null;
    };
    scene.input.on('pointerup', lift);
    scene.input.on('pointerupoutside', lift);
    scene.events.once('shutdown', () => this.destroy());
  }

  /** Which way the hero is steered now. */
  get steer(): Steer {
    let x = 0;
    let y = 0;
    for (const code of this.down) {
      x += KEYS[code][0];
      y += KEYS[code][1];
    }
    if (x !== 0 || y !== 0) {
      this.used = true;
      this.touch = false;
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    }
    if (this.stick) {
      const dx = (this.stick.x - this.stick.x0) / STICK;
      const dy = (this.stick.y - this.stick.y0) / STICK;
      const len = Math.hypot(dx, dy);
      // A finger that has hardly moved is a press, not a push.
      if (len < 0.18) return { x: 0, y: 0 };
      this.used = true;
      return len > 1 ? { x: dx / len, y: dy / len } : { x: dx, y: dy };
    }
    return { x: 0, y: 0 };
  }

  /** Asks for the hero's move: its button on a phone does. */
  act(): void {
    this.want = true;
  }

  /** True if the move was asked for since this was last called. */
  takeAct(): boolean {
    const want = this.want;
    this.want = false;
    return want;
  }

  /** Lets go of everything: when the wave stops, so that the hero does not run on when it starts again. */
  release(): void {
    this.want = false;
    this.down.clear();
    this.stick = null;
    this.pointer = -1;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
