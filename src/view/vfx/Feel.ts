// What a blow does to the whole screen: the view is knocked along the line
// the blow travelled and springs back, rumbles under something heavy,
// leans in a little on a great blow, and now and then goes white or dark.
// It is laid on the view after it has been put where it follows, and the
// sharp camera of the tells is moved with it, so that a tell never slides
// off the ground it is drawn on.

import Phaser from 'phaser';
import { feelShare } from './setting';

export class Feel {
  /** The knock: a spring, pushed along a line. */
  private kx = 0;
  private ky = 0;
  private vx = 0;
  private vy = 0;
  /** The rumble: shaking with no line to it, and how long it has left. */
  private rumbleLeft = 0;
  private rumbleOf = 1;
  private rumbleBy = 0;
  /** A lean in: a share of zoom, that falls back. */
  private lean = 0;
  private flashAlpha = 0;
  private flashColor = 0xffffff;
  private dimFor = 0;
  private dimLeft = 0;
  private dimMost = 0;
  /** What the dark is laid in front of: the boss's place, by depth. */
  dimDepth = 0;
  private readonly flashRect: Phaser.GameObjects.Rectangle;
  private readonly dimRect: Phaser.GameObjects.Rectangle;
  private ox = 0;
  private oy = 0;
  private zoomBy = 1;

  constructor(
    scene: Phaser.Scene,
    /** Hands a thing to the camera that draws over the light: a white flash is not darkened by the dark. */
    crisp: (obj: Phaser.GameObjects.GameObject) => void,
  ) {
    this.flashRect = scene.add.rectangle(0, 0, 10, 10, 0xffffff, 1).setOrigin(0, 0).setDepth(9800).setVisible(false);
    crisp(this.flashRect);
    this.dimRect = scene.add.rectangle(0, 0, 10, 10, 0x05080a, 1).setOrigin(0, 0).setDepth(0).setVisible(false);
  }

  /** A blow along a line, from `angle`, of a size in the field's units. */
  kick(angle: number, by: number): void {
    const s = feelShare().shake;
    this.vx += Math.cos(angle) * by * 60 * s;
    this.vy += Math.sin(angle) * by * 60 * s;
  }

  /** Shaking with no line: something heavy landed. `by` is the most it moves, in the field's units. */
  rumble(seconds: number, by: number): void {
    const s = feelShare().shake;
    if (by * s < this.rumbleBy * (this.rumbleLeft / this.rumbleOf)) return;
    this.rumbleLeft = seconds;
    this.rumbleOf = seconds;
    this.rumbleBy = by * s;
  }

  /** The view leans in a little: a share of its size. */
  punch(share: number): void {
    this.lean = Math.max(this.lean, share * feelShare().shake);
  }

  /** The whole screen goes a color for a moment. */
  flash(color: number, alpha: number): void {
    this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, alpha * feelShare().flash);
  }

  /** Everything behind the boss goes dark for a while, so that he is all there is to see. */
  dim(seconds: number, most: number): void {
    this.dimFor = seconds;
    this.dimLeft = seconds;
    this.dimMost = most;
  }

  update(dt: number): void {
    // A stiff spring, well damped: knocked, it is back in a fifth of a second with one small swing past.
    const k = 420;
    const damp = 26;
    this.vx += (-k * this.kx - damp * this.vx) * dt;
    this.vy += (-k * this.ky - damp * this.vy) * dt;
    this.kx += this.vx * dt;
    this.ky += this.vy * dt;
    let rx = 0;
    let ry = 0;
    if (this.rumbleLeft > 0) {
      this.rumbleLeft = Math.max(0, this.rumbleLeft - dt);
      const a = this.rumbleBy * (this.rumbleLeft / this.rumbleOf);
      rx = (Math.random() * 2 - 1) * a;
      ry = (Math.random() * 2 - 1) * a;
    }
    this.ox = Math.max(-26, Math.min(26, this.kx + rx));
    this.oy = Math.max(-26, Math.min(26, this.ky + ry));
    this.lean = Math.max(0, this.lean - dt * 0.3);
    this.zoomBy = 1 + this.lean;
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 3.2);
    if (this.dimLeft > 0) this.dimLeft = Math.max(0, this.dimLeft - dt);
  }

  /** Lays the knock, the rumble and the lean on the view, which has just been put where it follows. */
  apply(cam: Phaser.Cameras.Scene2D.Camera, baseZoom: number): void {
    cam.scrollX += this.ox;
    cam.scrollY += this.oy;
    if (Math.abs(cam.zoom - baseZoom * this.zoomBy) > 1e-4) cam.setZoom(baseZoom * this.zoomBy);
    // The flash and the dark are laid over the whole of what the view shows, in the field's units.
    const z = cam.zoom;
    const vw = cam.width / z;
    const vh = cam.height / z;
    const x0 = cam.scrollX + cam.width / 2 - vw / 2 - 30;
    const y0 = cam.scrollY + cam.height / 2 - vh / 2 - 30;
    this.flashRect.setVisible(this.flashAlpha > 0.01).setFillStyle(this.flashColor, this.flashAlpha).setSize(vw + 60, vh + 60).setPosition(x0, y0);
    const k = this.dimFor > 0 ? Math.sin((1 - this.dimLeft / this.dimFor) * Math.PI) : 0;
    const dimA = Math.min(1, k * 1.6) * this.dimMost;
    this.dimRect.setVisible(dimA > 0.01).setFillStyle(0x05080a, dimA).setSize(vw + 60, vh + 60).setPosition(x0, y0).setDepth(this.dimDepth - 1);
  }
}
