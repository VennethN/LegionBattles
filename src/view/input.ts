// How the hunter is steered and what the player asks for: by the keys, by
// the mouse, or by a finger. A finger or the mouse held down and dragged is
// a stick wherever it was put down; the rest are buttons on the screen and
// keys.
//
// The keys are read by where they are on the keyboard and not by the letter
// on them, so that the same keys work on a keyboard laid out in another way
// (the top-left letters are AZERTY in France).

import type Phaser from 'phaser';
import { view } from './config';

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};

/** What can be asked for with a key or a button, and the key of each. */
export type Ask = 'dodge' | 'a' | 'b' | 'call0' | 'call1' | 'place0' | 'place1' | 'place2' | 'place3' | 'wake';
/** The keys that attack while held. */
const ATTACK_KEYS = new Set(['KeyJ', 'KeyK']);
const ASKS: Record<string, Ask> = {
  Space: 'dodge', KeyQ: 'a', KeyE: 'b', KeyR: 'call0', KeyF: 'call1', Digit1: 'place0', Digit2: 'place1', Digit3: 'place2', Digit4: 'place3', Enter: 'wake',
};
/** The letter on the key of each thing, as most keyboards have it, for the buttons to show. */
export const KEY_NAMES: Record<Ask, string> = { dodge: 'SPACE', a: 'Q', b: 'E', call0: 'R', call1: 'F', place0: '1', place1: '2', place2: '3', place3: '4', wake: 'ENTER' };

/** How far, in the layout's units, a finger is dragged for the hunter to run flat out. */
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
  /** True once the hunter has been steered at all: the hint that says how goes away. */
  used = false;
  /** True if the last steering was by touch. */
  touch = false;

  private readonly down = new Set<string>();
  private pointer = -1;
  /** What has been asked for since the field last took it. */
  private readonly wants = new Set<Ask>();
  private readonly onDown = (e: KeyboardEvent): void => {
    if (KEYS[e.code] || ATTACK_KEYS.has(e.code)) {
      this.down.add(e.code);
      e.preventDefault();
    } else if (ASKS[e.code]) {
      if (!e.repeat) this.wants.add(ASKS[e.code]);
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
      // The other button of the mouse is the roll, wherever it is pressed.
      if (p.rightButtonDown()) {
        this.wants.add('dodge');
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

  /** Which way the hunter is steered now. */
  get steer(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    for (const code of this.down) {
      if (!KEYS[code]) continue;
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

  /**
   * True while the player attacks: an attack key held, or a finger or the mouse held down on the field without being
   * dragged (dragged, it is the stick). A button on the screen may hold it too.
   */
  get attacking(): boolean {
    for (const code of this.down) if (ATTACK_KEYS.has(code)) return true;
    if (this.attackHeld) return true;
    if (!this.stick) return false;
    return Math.hypot(this.stick.x - this.stick.x0, this.stick.y - this.stick.y0) / STICK < 0.18;
  }

  /** Held by an attack button on the screen. */
  attackHeld = false;

  /** Asks for something: a button on the screen does. */
  ask(what: Ask): void {
    this.wants.add(what);
  }

  /** Everything asked for since this was last called. */
  take(): Ask[] {
    const all = [...this.wants];
    this.wants.clear();
    return all;
  }

  /** Lets go of everything: when the hunt stops, so that the hunter does not run on when it starts again. */
  release(): void {
    this.wants.clear();
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
