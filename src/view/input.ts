// How the hunter is steered and what the player asks for. There are two
// ways, and the game uses the one the player last used, never both at once:
//
// - Mouse and keys. W A S D or the arrows move, the pointer aims, the left
//   button attacks (held, the chain goes on), the right button or Space
//   dodges, Q and E are the skills (held, a skill shows where it will go;
//   let go, it is used there), R and F the horn. No stick, no thumb buttons.
// - Touch: two thumbs. A stick drawn bottom left moves; on the right a big
//   ATTACK with the skills, the dodge and the horn round it. ATTACK tapped
//   finds its own mark; held and dragged, it strikes the way it is dragged.
//   A skill or the dodge dragged shows where it will go and goes there when
//   let go, or is called off on the cancel mark.
//
// A key or a mouse press makes it mouse and keys; a finger or a pen makes it
// touch. The keys are read by where they are on the keyboard and not by the
// letter on them, so that the same keys work on a keyboard laid out in
// another way (the top-left letters are AZERTY in France).

import type Phaser from 'phaser';
import { view } from './config';

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};

/** What can be asked for with a key or a button, and the key of each. */
export type Ask = 'dodge' | 'a' | 'b' | 'call0' | 'call1' | 'place0' | 'place1' | 'place2' | 'place3' | 'wake';
/** The keys that attack while held. */
const ATTACK_KEYS = new Set(['KeyJ']);
/** The skills' keys: held, the skill shows where it will go; let go, it is used. */
const SKILL_KEYS: Record<string, 0 | 1> = { KeyQ: 0, KeyE: 1 };
const ASKS: Record<string, Ask> = {
  // K beside Space for the dodge, so that a hand on J and K has both.
  Space: 'dodge', KeyK: 'dodge', KeyR: 'call0', KeyF: 'call1', Digit1: 'place0', Digit2: 'place1', Digit3: 'place2', Digit4: 'place3', Enter: 'wake',
};
/** The letter on the key of each thing, as most keyboards have it, for the buttons to show. */
export const KEY_NAMES: Record<Ask, string> = { dodge: 'SPACE', a: 'Q', b: 'E', call0: 'R', call1: 'F', place0: '1', place1: '2', place2: '3', place3: '4', wake: 'ENTER' };

/** The stick's reach, in the layout's units: pushed this far, the hunter runs flat out. */
export const STICK_R = 62;
/** How far a thumb on a button is dragged before it is aiming and not tapping. */
export const DRAG_MIN = 18;
/** How far a skill's drag reaches, in the layout's units, for its furthest throw. */
export const DRAG_FAR = 120;

export type Scheme = 'mouse' | 'touch';

/** Where a skill or a dodge was aimed: at a point of the screen (the mouse), or by a drag from a button (a thumb). */
export type Target = { kind: 'screen'; x: number; y: number } | { kind: 'drag'; dx: number; dy: number };

/** What was asked for, with where it was aimed. */
export interface Asked {
  ask: Ask;
  at?: Target;
}

/** A thumb held on a button: where it went down and where it is now, in the layout's units. */
export interface Drag {
  id: number;
  x0: number;
  y0: number;
  x: number;
  y: number;
}

const isTouch = (p: Phaser.Input.Pointer): boolean => {
  const type = (p.event as PointerEvent | undefined)?.pointerType;
  return p.wasTouch || type === 'touch' || type === 'pen';
};

export class Controls {
  /** The way of playing in use. The screen shows only its own. */
  scheme: Scheme;
  /** Told when the way of playing changes, so that the screen shows the other's buttons. */
  onScheme: ((s: Scheme) => void) | null = null;
  /** True once the hunter has been steered at all: the hint that says how goes away. */
  used = false;

  /** The stick: where its base is drawn when let go, where it is now, and the knob's push from it. */
  readonly stickHome = { x: 0, y: 0 };
  readonly stickAt = { x: 0, y: 0 };
  knob = { x: 0, y: 0 };
  private stickId = -1;

  /** The pointer, in the canvas's pixels, while a mouse is on the screen: the lair aims at it. */
  mouse: { x: number; y: number } | null = null;
  private mouseHeld = false;
  /** A skill key held: its shape is shown at the pointer until it is let go. */
  holding: 0 | 1 | null = null;

  /** Thumbs on the buttons: ATTACK held (and dragged to aim), a skill or the dodge being aimed. */
  attackDrag: Drag | null = null;
  skillDrag: (Drag & { i: 0 | 1 }) | null = null;
  dodgeDrag: Drag | null = null;
  /** Where the cancel mark is while a skill is being aimed: a thumb let go on it calls the skill off. */
  cancelAt = { x: 0, y: 0, r: 44 };
  /** Held by the ATTACK button by any means (a script presses it too). */
  attackHeld = false;

  /** True while the lair is in camp: a press on the field sets down or picks up, it does not attack. */
  camp = false;
  /** In camp, the card picked up: the building a press on the field sets down. */
  picking: string | null = null;
  /** In camp on a touch screen, where a finger last was on the field: the picked card's ghost stands there. */
  ground: { x: number; y: number } | null = null;
  /** Presses on the field in camp, in the canvas's pixels: to set the picked card down there, or pick a building up. */
  private readonly spots: Array<{ kind: 'place' | 'lift'; x: number; y: number }> = [];

  private readonly down = new Set<string>();
  private readonly wants: Asked[] = [];
  private readonly onDown = (e: KeyboardEvent): void => {
    if (KEYS[e.code] || ATTACK_KEYS.has(e.code) || SKILL_KEYS[e.code] !== undefined || ASKS[e.code]) this.use('mouse');
    if (KEYS[e.code] || ATTACK_KEYS.has(e.code)) {
      this.down.add(e.code);
      e.preventDefault();
    } else if (SKILL_KEYS[e.code] !== undefined) {
      if (!e.repeat) this.holding = SKILL_KEYS[e.code];
      e.preventDefault();
    } else if (ASKS[e.code]) {
      if (!e.repeat) this.ask(ASKS[e.code], this.pointerTarget());
      e.preventDefault();
    }
  };
  private readonly onUp = (e: KeyboardEvent): void => {
    this.down.delete(e.code);
    // A skill key let go: the skill is used where the pointer is.
    const i = SKILL_KEYS[e.code];
    if (i !== undefined && this.holding === i) {
      this.holding = null;
      this.ask(i === 0 ? 'a' : 'b', this.pointerTarget());
    }
  };
  private readonly onBlur = (): void => this.release();

  constructor(scene: Phaser.Scene, touchFirst: boolean) {
    this.scheme = touchFirst ? 'touch' : 'mouse';
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('blur', this.onBlur);
    // Two thumbs at once: one on the stick, one on the buttons.
    scene.input.addPointer(2);
    const at = (p: Phaser.Input.Pointer): [number, number] => [p.x / view.zoom, p.y / view.zoom];
    scene.input.mouse?.disableContextMenu();
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer, over: unknown[]) => {
      this.use(isTouch(p) ? 'touch' : 'mouse');
      const [x, y] = at(p);
      // In camp a press on the field, not on a button, sets the picked card down there or picks a building up.
      if (this.camp && over.length === 0 && !p.rightButtonDown()) {
        this.spots.push({ kind: this.picking ? 'place' : 'lift', x: p.x, y: p.y });
        if (this.scheme === 'mouse') this.mouse = { x: p.x, y: p.y };
        else this.ground = { x: p.x, y: p.y };
        // A thumb that set something down is not also a push on the stick.
        if (this.picking || this.scheme === 'mouse') return;
      }
      if (this.scheme === 'mouse') {
        this.mouse = { x: p.x, y: p.y };
        // The other button of the mouse is the dodge, wherever it is pressed.
        if (p.rightButtonDown()) {
          this.ask('dodge', this.pointerTarget());
          return;
        }
        // The left button on the field attacks; on a button, it is the button's.
        if (over.length === 0) this.mouseHeld = true;
        return;
      }
      // A thumb on the left of the screen, not on a button, takes the stick; its base slides a little toward it.
      if (over.length > 0 || this.stickId >= 0 || x > view.w * 0.45) return;
      this.stickId = p.id;
      const dx = x - this.stickHome.x;
      const dy = y - this.stickHome.y;
      const d = Math.hypot(dx, dy);
      const slide = x < view.w / 3 ? Math.min(d, 46) / (d || 1) : 0;
      this.stickAt.x = this.stickHome.x + dx * slide;
      this.stickAt.y = this.stickHome.y + dy * slide;
      this.push(x, y);
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!isTouch(p)) this.mouse = { x: p.x, y: p.y };
      else if (this.camp && this.picking && p.id !== this.stickId) this.ground = { x: p.x, y: p.y };
      const [x, y] = at(p);
      if (p.id === this.stickId) this.push(x, y);
      for (const d of [this.attackDrag, this.skillDrag, this.dodgeDrag]) if (d && d.id === p.id) [d.x, d.y] = [x, y];
    });
    const lift = (p: Phaser.Input.Pointer): void => {
      if (!isTouch(p)) this.mouseHeld = false;
      if (p.id === this.stickId) {
        this.stickId = -1;
        this.knob = { x: 0, y: 0 };
        this.stickAt.x = this.stickHome.x;
        this.stickAt.y = this.stickHome.y;
      }
      this.letGo(p.id);
    };
    scene.input.on('pointerup', lift);
    scene.input.on('pointerupoutside', lift);
    scene.events.once('shutdown', () => this.destroy());
  }

  /** The way of playing the player has just used: the screen changes to it at once. */
  private use(s: Scheme): void {
    if (this.scheme === s) return;
    this.scheme = s;
    this.release();
    this.onScheme?.(s);
  }

  private push(x: number, y: number): void {
    let dx = x - this.stickAt.x;
    let dy = y - this.stickAt.y;
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) [dx, dy] = [(dx / d) * STICK_R, (dy / d) * STICK_R];
    this.knob = { x: dx, y: dy };
  }

  /** Where the mouse points, as a target, while it is the mouse that plays. */
  private pointerTarget(): Target | undefined {
    return this.scheme === 'mouse' && this.mouse ? { kind: 'screen', x: this.mouse.x, y: this.mouse.y } : undefined;
  }

  // ------------------------------------------------------------ the thumb buttons

  /** A thumb down on ATTACK, a skill or the dodge: it is held, and aimed if it is dragged. */
  press(what: 'attack' | 'a' | 'b' | 'dodge', p: Phaser.Input.Pointer): void {
    this.use(isTouch(p) ? 'touch' : 'mouse');
    const [x, y] = [p.x / view.zoom, p.y / view.zoom];
    const d: Drag = { id: p.id, x0: x, y0: y, x, y };
    if (what === 'attack') {
      this.attackDrag = d;
      this.attackHeld = true;
    } else if (what === 'dodge') this.dodgeDrag = d;
    else this.skillDrag = { ...d, i: what === 'a' ? 0 : 1 };
  }

  /** How far a drag has gone, as its length. */
  static dragged(d: Drag | null): number {
    return d ? Math.hypot(d.x - d.x0, d.y - d.y0) : 0;
  }

  /** True while a skill being aimed is over the cancel mark. */
  get cancelling(): boolean {
    const d = this.skillDrag ?? this.dodgeDrag;
    return !!d && Math.hypot(d.x - this.cancelAt.x, d.y - this.cancelAt.y) < this.cancelAt.r;
  }

  private letGo(id: number): void {
    if (this.attackDrag?.id === id) {
      this.attackDrag = null;
      this.attackHeld = false;
    }
    const s = this.skillDrag;
    if (s?.id === id) {
      const cancel = this.cancelling;
      this.skillDrag = null;
      // A tap uses it at its own mark; a drag where it was dragged; let go on the cancel mark, not at all.
      if (!cancel) this.ask(s.i === 0 ? 'a' : 'b', Controls.dragged(s) >= DRAG_MIN ? { kind: 'drag', dx: s.x - s.x0, dy: s.y - s.y0 } : undefined);
    }
    const d = this.dodgeDrag;
    if (d?.id === id) {
      const cancel = this.cancelling;
      this.dodgeDrag = null;
      if (!cancel) this.ask('dodge', Controls.dragged(d) >= DRAG_MIN ? { kind: 'drag', dx: d.x - d.x0, dy: d.y - d.y0 } : undefined);
    }
  }

  // ------------------------------------------------------------ what the lair reads

  /** Which way the hunter is steered now, and how hard. */
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
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    }
    if (this.stickId >= 0) {
      const dx = this.knob.x / STICK_R;
      const dy = this.knob.y / STICK_R;
      // A thumb that has hardly moved is resting, not pushing.
      if (Math.hypot(dx, dy) < 0.15) return { x: 0, y: 0 };
      this.used = true;
      return { x: dx, y: dy };
    }
    return { x: 0, y: 0 };
  }

  /** True while the stick is held. */
  get sticking(): boolean {
    return this.stickId >= 0;
  }

  /** True while the player attacks: an attack key, the left button on the field, or ATTACK held. */
  get attacking(): boolean {
    for (const code of this.down) if (ATTACK_KEYS.has(code)) return true;
    return this.attackHeld || this.mouseHeld;
  }

  /** Asks for something: a button on the screen does, with where it was aimed if it was. */
  ask(what: Ask, at?: Target): void {
    this.wants.push(at ? { ask: what, at } : { ask: what });
  }

  /** The presses on the field in camp since this was last called. */
  takeSpots(): Array<{ kind: 'place' | 'lift'; x: number; y: number }> {
    return this.spots.splice(0, this.spots.length);
  }

  /** Everything asked for since this was last called. */
  take(): Asked[] {
    return this.wants.splice(0, this.wants.length);
  }

  /** Lets go of everything: when the hunt stops, so that the hunter does not run on when it starts again. */
  release(): void {
    this.wants.length = 0;
    this.spots.length = 0;
    this.ground = null;
    this.down.clear();
    this.stickId = -1;
    this.knob = { x: 0, y: 0 };
    this.mouseHeld = false;
    this.holding = null;
    this.attackDrag = null;
    this.skillDrag = null;
    this.dodgeDrag = null;
    this.attackHeld = false;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
