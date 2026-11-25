// Drawings made once and kept as pictures.
//
// A Phaser Graphics object is worked out again every frame it is drawn:
// each rounded corner is cut into triangles sixty times a second, for a
// button that never changes. Measured on the main screen between battles
// (scripts/perf.mjs with IDLE=1), two thirds of a frame's script went to
// that. So what does not change is drawn once, with the browser's own 2D
// drawing, onto a small canvas, and shown as a picture from then on. Two
// buttons of one size and color share the one picture.

import Phaser from 'phaser';
import { BONE, CLOTH, HIGHLIGHT, IRON, OUTLINE, WOOD, type Material } from '../../art/kit/palette';
import { view } from '../config';

/** Room round a baked shape for the half of its outline that lies outside it. */
export const BAKE_PAD = 3;

/**
 * The key of a picture `w` by `h` in the layout's units, drawn by `draw` the
 * first time it is asked for and kept. It is made at the sharpness the game
 * is drawn at, so a picture of it is shown at `w` by `h`, not at its own size.
 */
export function baked(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): string {
  const res = Math.max(1, view.res);
  const full = `baked:${key}@${res.toFixed(2)}`;
  if (scene.textures.exists(full)) return full;
  const t = scene.textures.createCanvas(full, Math.ceil(w * res), Math.ceil(h * res));
  if (!t) return full;
  const ctx = t.getContext();
  ctx.scale(res, res);
  draw(ctx);
  t.refresh();
  return full;
}

/** The outline of a rectangle with rounded corners, as a path on a canvas. */
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

/** How wide the timber of a panel's frame is, and how big the iron at its corners. */
const FRAME = 8;
const CORNER = 20;

/**
 * A panel: a frame of timber with iron at its corners round a sheet of parchment. It is what the game's screens
 * are made of, in the same hand as its logo: every sheet a player reads from, big or small, a card or a whole
 * screen, is this one thing. Before it, a panel was a plain pale slab, and a reviewer took the title for a
 * settings menu.
 */
export function panelOn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius = 14): void {
  // The timber, with its under side in shade.
  ctx.fillStyle = WOOD.shade;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.fillStyle = WOOD.fill;
  roundRect(ctx, x, y, w, h - 5, radius);
  ctx.fill();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = HIGHLIGHT;
  roundRect(ctx, x + 6, y + 2.5, w - 12, 3, 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // The parchment, a shade darker along its foot and paler along its head.
  const px = x + FRAME;
  const py = y + FRAME;
  const pw = w - FRAME * 2;
  const ph = h - FRAME * 2 - 3;
  ctx.fillStyle = BONE.shade;
  roundRect(ctx, px, py, pw, ph, radius - 6);
  ctx.fill();
  ctx.fillStyle = BONE.fill;
  roundRect(ctx, px, py, pw, ph - 4, radius - 6);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = HIGHLIGHT;
  roundRect(ctx, px + 5, py + 4, pw - 10, Math.min(8, ph * 0.1), 4);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3;
  ctx.strokeStyle = OUTLINE;
  roundRect(ctx, px, py, pw, ph, radius - 6);
  ctx.stroke();
  // Iron at each corner: a plate cut on the slant, over the timber's joint.
  const c = Math.min(CORNER, w / 5, h / 5);
  const plate = (cx: number, cy: number, sx: number, sy: number): void => {
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * 3);
    ctx.lineTo(cx, cy + sy * c);
    ctx.lineTo(cx + sx * (FRAME + 1), cy + sy * c);
    ctx.lineTo(cx + sx * c, cy + sy * (FRAME + 1));
    ctx.lineTo(cx + sx * c, cy);
    ctx.lineTo(cx + sx * 3, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + sy * 3);
    ctx.closePath();
    ctx.fillStyle = sy > 0 ? IRON.fill : IRON.shade;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  };
  plate(x + 1, y + 1, 1, 1);
  plate(x + w - 1, y + 1, -1, 1);
  plate(x + 1, y + h - 1, 1, -1);
  plate(x + w - 1, y + h - 1, -1, -1);
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUTLINE;
  roundRect(ctx, x, y, w, h, radius);
  ctx.stroke();
}

/**
 * A ribbon for a screen's heading: a band in the hero's blue with its two tails folded back behind it, as the
 * family's logo has under its shield. The words are written over it by whoever asked.
 */
export function ribbonImage(scene: Phaser.Scene, cx: number, cy: number, w: number, h = 40, mat: Material = CLOTH.blue): Phaser.GameObjects.Image {
  const tail = 22;
  const full = w + tail * 2 + 8;
  const key = baked(scene, `ribbon:${w}x${h}:${mat.fill}`, full, h + 16, (ctx) => {
    const x = tail + 4;
    const y = 3;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = OUTLINE;
    // The tails, lower and darker: they are behind the band.
    for (const side of [-1, 1]) {
      const ex = side < 0 ? x : x + w;
      ctx.beginPath();
      ctx.moveTo(ex - side * 12, y + 9);
      ctx.lineTo(ex + side * tail, y + 9);
      ctx.lineTo(ex + side * (tail - 10), y + 9 + h / 2);
      ctx.lineTo(ex + side * tail, y + 9 + h);
      ctx.lineTo(ex - side * 12, y + 9 + h);
      ctx.closePath();
      ctx.fillStyle = mat.shade;
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = OUTLINE;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
    }
    ctx.fillStyle = mat.shade;
    roundRect(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.fillStyle = mat.fill;
    roundRect(ctx, x, y, w, h - 5, 5);
    ctx.fill();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = HIGHLIGHT;
    roundRect(ctx, x + 5, y + 4, w - 10, 5, 3);
    ctx.fill();
    ctx.globalAlpha = 1;
    roundRect(ctx, x, y, w, h, 5);
    ctx.stroke();
  });
  return scene.add.image(cx, cy + 5, key).setDisplaySize(full, h + 16);
}

/** The slab of widgets.ts, drawn on a canvas: fill, a darker lip along the bottom, a band of light along the top, the dark line round it. */
export function slabOn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, mat: Material, radius = 14, lip = 6): void {
  // A big pale slab is a sheet to read from, and every one of those is a framed panel: one kind of thing on every screen.
  if (mat.fill === BONE.fill && w >= 150 && h >= 110) {
    panelOn(ctx, x, y, w, h, Math.max(12, radius));
    return;
  }
  ctx.fillStyle = mat.shade;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.fillStyle = mat.fill;
  roundRect(ctx, x, y, w, h - lip, radius);
  ctx.fill();
  if (lip > 0 && h >= 30 && w >= 40) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = HIGHLIGHT;
    roundRect(ctx, x + 5, y + 4, w - 10, Math.min(7, h * 0.16), Math.min(radius, 5));
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUTLINE;
  roundRect(ctx, x, y, w, h, radius);
  ctx.stroke();
}

/** A slab as a picture: its key. The picture is the slab and BAKE_PAD round it. */
export function slabKey(scene: Phaser.Scene, w: number, h: number, mat: Material, radius = 14, lip = 6): string {
  return baked(scene, `slab:${w}x${h}:${mat.fill}${mat.shade}:${radius}:${lip}`, w + BAKE_PAD * 2, h + BAKE_PAD * 2, (ctx) =>
    slabOn(ctx, BAKE_PAD, BAKE_PAD, w, h, mat, radius, lip),
  );
}

/** A slab in a scene as a picture, its top left corner at (x, y) as slab() has it. */
export function slabImage(scene: Phaser.Scene, x: number, y: number, w: number, h: number, mat: Material, radius = 14, lip = 6): Phaser.GameObjects.Image {
  return scene.add
    .image(x + w / 2, y + h / 2, slabKey(scene, w, h, mat, radius, lip))
    .setDisplaySize(w + BAKE_PAD * 2, h + BAKE_PAD * 2);
}

/** A plain pill with the dark line round it, as a picture with its middle at (x, y): a count's plate, a dot. */
export function pillImage(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill: string): Phaser.GameObjects.Image {
  const key = baked(scene, `pill:${w}x${h}:${fill}`, w + 8, h + 8, (ctx) => {
    ctx.fillStyle = OUTLINE;
    roundRect(ctx, 0, 0, w + 8, h + 8, (h + 8) / 2);
    ctx.fill();
    ctx.fillStyle = fill;
    roundRect(ctx, 4, 4, w, h, h / 2);
    ctx.fill();
  });
  return scene.add.image(x, y, key).setDisplaySize(w + 8, h + 8);
}

let frozen = 0;

/** The engine's way of drawing a Graphics object onto a canvas, which it has for baking them (Graphics.generateTexture). */
type CanvasDraw = (renderer: unknown, src: unknown, camera: unknown, parent: null, ctx: CanvasRenderingContext2D, clip: boolean) => void;

/**
 * Turns a drawing that will not change again into a picture of itself, in
 * the same place, at the same depth, and takes the drawing away. `x`, `y`,
 * `w` and `h` say which part of the drawing's own space to keep: everything
 * it drew should lie inside. The picture is let go with whatever shows it.
 *
 * For a screen's panels, slots and tiles, which are drawn once when the
 * screen opens. A drawing that is cleared and drawn again (a bar that fills)
 * stays a drawing. If the engine cannot draw it on a canvas, it is given
 * back as it is: slower, and right.
 */
export function freeze(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): Phaser.GameObjects.Image | Phaser.GameObjects.Graphics {
  const scene = g.scene;
  const res = Math.max(1, view.res);
  const draw = (g as unknown as { renderCanvas?: CanvasDraw }).renderCanvas;
  const cam = (Phaser.GameObjects.Graphics as unknown as { TargetCamera?: Phaser.Cameras.Scene2D.BaseCamera }).TargetCamera;
  if (!draw || !cam || w <= 0 || h <= 0) return g;
  const key = `frozen:${++frozen}`;
  const t = scene.textures.createCanvas(key, Math.ceil(w * res), Math.ceil(h * res));
  if (!t) return g;
  // The engine draws through a camera. This one looks at the part asked for, and the drawing is made as big as the game is sharp.
  const was = { x: g.x, y: g.y, sx: g.scaleX, sy: g.scaleY, alpha: g.alpha, visible: g.visible };
  cam.setScene(scene);
  cam.setViewport(0, 0, Math.ceil(w * res), Math.ceil(h * res));
  cam.scrollX = 0;
  cam.scrollY = 0;
  g.setPosition(-x * res, -y * res).setScale(res).setAlpha(1).setVisible(true);
  const ctx = t.getContext();
  draw.call(g, scene.sys.game.renderer, g, cam, null, ctx, false);
  // It saves the canvas's state before it draws and leaves that to its caller.
  ctx.restore();
  t.refresh();
  const image = scene.add
    .image(was.x + x * was.sx, was.y + y * was.sy, key)
    .setOrigin(0, 0)
    .setDisplaySize(w * was.sx, h * was.sy)
    .setDepth(g.depth)
    .setAlpha(was.alpha)
    .setVisible(was.visible)
    .setScrollFactor(g.scrollFactorX, g.scrollFactorY);
  image.once('destroy', () => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
  });
  // Where the drawing was among its container's things, the picture is now.
  const parent = g.parentContainer;
  if (parent) parent.addAt(image, parent.getIndex(g));
  g.destroy();
  return image;
}
