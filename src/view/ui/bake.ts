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
import { OUTLINE, type Material } from '../../art/kit/palette';
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

/**
 * What a material is as a board of this game: old paper for the pale, iron plate for the grey and the steel, dark
 * blood-red timber for the one thing that must be pressed, and timber for everything else. Red is spent only on that.
 */
function boardOf(mat: Material): { fill: string; shade: string; edge: string; grain: string; nail: string; paper: boolean } {
  const f = mat.fill.toLowerCase();
  if (['#e9dfc6', '#d9cdb0', '#f4f1e4'].includes(f)) return { fill: '#c9b58c', shade: '#a48d63', edge: '#5e4a2e', grain: '#8d7650', nail: '#3a2e20', paper: true };
  if (['#b9c2cc', '#5d6672', '#8d97a3'].includes(f)) return { fill: '#3e3b36', shade: '#2c2a26', edge: '#0d0b09', grain: '#4a4640', nail: '#8a847a', paper: false };
  if (['#c7364f', '#c0392b', '#d04a3c'].includes(f) || f.startsWith('#c7') || f.startsWith('#c0')) return { fill: '#6b1e19', shade: '#4d1410', edge: '#0d0b09', grain: '#7d2a22', nail: '#9a8f80', paper: false };
  return { fill: '#4a3424', shade: '#35251a', edge: '#0d0b09', grain: '#5a4130', nail: '#b08a48', paper: false };
}

/** A little sum that stands in for chance, so that a board of one size is worn the same way each time it is drawn. */
function wear(i: number, w: number, h: number): number {
  const n = Math.sin(i * 12.9898 + w * 78.233 + h * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * A board of this game, drawn on a canvas: hard edges a little worn, planks or a sheet of old paper, a bevel of
 * light along the top and shadow along the foot, nail heads in the corners, and the near-black line round it. The
 * name is the old one: every panel and button of the game is one of these.
 */
export function slabOn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, mat: Material, _radius = 14, lip = 6): void {
  const b = boardOf(mat);
  // The outline is the shape with its corners clipped and a few nicks along the edges: worn, not rounded.
  const cut = Math.min(5, w / 8, h / 8);
  const edge = (): void => {
    ctx.beginPath();
    ctx.moveTo(x + cut, y);
    const nicks = Math.max(1, Math.floor(w / 70));
    for (let i = 1; i <= nicks; i++) {
      const nx = x + (w * i) / (nicks + 1);
      ctx.lineTo(nx - 3, y);
      ctx.lineTo(nx, y + 1.5 + wear(i, w, h) * 1.5);
      ctx.lineTo(nx + 3, y);
    }
    ctx.lineTo(x + w - cut, y);
    ctx.lineTo(x + w, y + cut);
    ctx.lineTo(x + w, y + h - cut);
    ctx.lineTo(x + w - cut, y + h);
    for (let i = nicks; i >= 1; i--) {
      const nx = x + (w * i) / (nicks + 1) + 9;
      ctx.lineTo(nx + 3, y + h);
      ctx.lineTo(nx, y + h - 1.5 - wear(i + 9, w, h) * 1.5);
      ctx.lineTo(nx - 3, y + h);
    }
    ctx.lineTo(x + cut, y + h);
    ctx.lineTo(x, y + h - cut);
    ctx.lineTo(x, y + cut);
    ctx.closePath();
  };
  ctx.save();
  edge();
  ctx.fillStyle = b.shade;
  ctx.fill();
  ctx.clip();
  // The face, lifted off the foot by the lip: a pressed board has less of it.
  ctx.fillStyle = b.fill;
  ctx.fillRect(x, y, w, h - Math.max(2, lip * 0.6));
  if (b.paper) {
    // Old paper: darker toward its edges, a few stains.
    const g = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.2, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(70,45,20,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    for (let i = 0; i < Math.min(6, Math.floor((w * h) / 9000)); i++) {
      ctx.fillStyle = 'rgba(90,60,30,0.10)';
      ctx.beginPath();
      ctx.ellipse(x + wear(i, w, h) * w, y + wear(i + 3, w, h) * h, 6 + wear(i + 5, w, h) * 18, 4 + wear(i + 7, w, h) * 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Planks: seams across a board tall enough to have them, and grain along each.
    const planks = h >= 70 ? Math.round(h / 34) : 1;
    for (let i = 1; i < planks; i++) {
      const py = y + (h * i) / planks;
      ctx.fillStyle = b.edge;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x, py - 1, w, 2);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = b.grain;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < Math.min(14, Math.floor(h / 7)); i++) {
      const gy = y + 4 + wear(i, w, h) * (h - 8);
      const gx = x + wear(i + 1, w, h) * w * 0.4;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + w * (0.25 + wear(i + 2, w, h) * 0.4), gy + (wear(i + 4, w, h) - 0.5) * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // Light along the top edge, shadow along the foot.
  ctx.fillStyle = b.paper ? 'rgba(255,248,225,0.35)' : 'rgba(255,225,170,0.14)';
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x, y + h - Math.max(2, lip * 0.6) - 2, w, 2);
  ctx.restore();
  // Nail heads in the corners of anything big enough to have been nailed up.
  if (w >= 60 && h >= 36) {
    const inset = Math.min(9, h / 4);
    for (const [nx, ny] of [[x + inset, y + inset], [x + w - inset, y + inset], [x + inset, y + h - inset - lip * 0.4], [x + w - inset, y + h - inset - lip * 0.4]]) {
      ctx.fillStyle = b.nail;
      ctx.beginPath();
      ctx.arc(nx, ny, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,210,0.35)';
      ctx.fillRect(nx - 1.2, ny - 1.6, 1.2, 1.2);
    }
  }
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = b.edge;
  edge();
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
