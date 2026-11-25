// The inn the hunters wait in between hunts: the TEAM screen's first view.
// A dark warm room seen as a stage set, drawn in code from the style's
// shapes and colors, lit by its hearth and a lantern or two. Each hunter has
// a place of their own and stands or sits there as who they are: Marta
// keeping the door, Jory at the window with his crossbow, Agnes tending a
// lamp by the fire, Brask on the bench with his dogs, and the hands for hire
// leaning at the bar. One not yet unlocked is a black shape at their place,
// "???" and how to unlock them, and nothing else.
//
// It shows and asks: who is open is the lodge's to say, and a press on a
// hunter only tells the lodge screen whom to show.

import Phaser from 'phaser';
import { BONE, HOLY } from '../art/kit/palette';
import { sfx } from '../audio/sfx';
import { HUNTERS, byId } from '../game/content';
import { isOpen, opensBy, type SaveData } from '../game/lodge';
import { Talk, VOICES } from '../game/talk';
import { pose, type Pose } from '../grim/rig';
import { ASSETS, getManifest } from './app';
import { view } from './config';
import { CARDS, SHEET, portraitFrame, sheet } from './art/Sheet';
import { GrimFigure } from './art/GrimFigure';
import { getGrim, wantedUnit } from './art/grim';
import { HUNTER_ART, STAND_IN, isGrim } from './pictures';
import { label } from './ui/widgets';

/** A place in the room, as shares of its width and height: where the feet are, and which way they face. */
interface Place {
  x: number;
  y: number;
  face: 1 | -1;
}

/** Where everything stands, for a wide room (one row along the floor) and a tall one (a back row and a front row). */
interface Plan {
  door: number;
  board: number;
  window: number;
  hearth: number;
  stair: number;
  table: [number, number, number];
  bar: [number, number, number];
  floor: number;
  at: Record<string, Place>;
}

const WIDE: Plan = {
  door: 0.07, board: 0.19, window: 0.33, hearth: 0.53, stair: 0.7, table: [0.6, 0.76, 0.9], bar: [0.8, 1.0, 0.82], floor: 0.6,
  at: {
    marta: { x: 0.12, y: 0.9, face: 1 },
    jory: { x: 0.32, y: 0.84, face: -1 },
    agnes: { x: 0.45, y: 0.86, face: 1 },
    brask: { x: 0.68, y: 0.92, face: -1 },
    sellsword: { x: 0.86, y: 0.86, face: -1 },
    bowman: { x: 0.95, y: 0.88, face: -1 },
  },
};

const TALL: Plan = {
  door: 0.08, board: 0.3, window: 0.52, hearth: 0.82, stair: 0.6, table: [0.04, 0.46, 0.93], bar: [0.6, 1.0, 0.82], floor: 0.42,
  at: {
    marta: { x: 0.16, y: 0.6, face: 1 },
    jory: { x: 0.5, y: 0.56, face: -1 },
    agnes: { x: 0.7, y: 0.6, face: 1 },
    brask: { x: 0.24, y: 0.95, face: 1 },
    sellsword: { x: 0.7, y: 0.86, face: -1 },
    bowman: { x: 0.88, y: 0.88, face: -1 },
  },
};

/**
 * How each stands at their place: the rig's own keys, held under the breathing. The kit has no sitting, leaning or
 * a boot up yet (the artist is asked for them): these are what can be had from the parts as they are.
 */
const RESTS: Record<string, Partial<Pose>> = {
  // On guard by the door, the halberd grounded beside her.
  marta: { weaponRot: -8, weaponY: 10, bodyRot: -2, headRot: 3 },
  // At the window, the crossbow raised to look it over.
  jory: { weaponRot: -32, weaponY: -6, weaponX: 4, headRot: 10, bodyRot: 4 },
  // By the fire, the lamp held out on its pole to be trimmed.
  agnes: { weaponRot: 18, weaponY: 2, bodyRot: 5, headRot: 8, extraRot: 6 },
  // By the bench, the spear grounded, looking down at the dogs. Sat on it, once the kit has a sitting pose.
  brask: { weaponRot: -12, weaponY: 8, headRot: 12, bodyRot: 4 },
};

/** How tall a hunter stands in the room, in the layout's units: never under about 60 screen pixels on a phone. */
const SCALE = 0.62;

interface Spot {
  id: string;
  open: boolean;
  x: number;
  y: number;
  fig: GrimFigure | null;
  img: Phaser.GameObjects.Image | null;
  dogs: GrimFigure[];
  pool: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text | null;
  lit: number;
  height: number;
}

export class Tavern {
  readonly root: Phaser.GameObjects.Container;
  private readonly spots: Spot[] = [];
  private readonly fire: Phaser.GameObjects.Graphics;
  private readonly smoke: Phaser.GameObjects.Graphics;
  private readonly glows: Array<{ img: Phaser.GameObjects.Image; base: number; x: number; y: number; reach: number }> = [];
  private readonly talk: Talk;
  private said: { c: Phaser.GameObjects.Container; who: string; left: number } | null = null;
  private quiet = 2.2;
  private clock = 0;
  private hearthAt: [number, number] = [0, 0];
  private scrollMin = 0;
  private dragFrom: number | null = null;
  private dragged = 0;
  private gone = false;

  /**
   * A room `w` by `h` with its top left at (x, y). In a tall window the room is wider than the screen and is dragged
   * sideways. `look` is called with a hunter's id when they are pressed, `board` when the notice board is.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly w: number,
    private readonly h: number,
    private readonly s: SaveData,
    private readonly look: (id: string) => void,
    private readonly board: () => void,
  ) {
    const plan = view.tall ? TALL : WIDE;
    this.root = scene.add.container(x, y);
    // In a tall window the room is a little wider than the screen, and starts on the hearth.
    if (view.tall && w > view.w - 12) {
      this.scrollMin = view.w - 6 - w;
      this.root.x = Math.max(this.scrollMin + 6, Math.min(6, view.w / 2 - plan.hearth * w));
      const mask = scene.make.graphics({}, false).fillRect(6, y, view.w - 12, h);
      this.root.setMask(mask.createGeometryMask());
      this.dragging(y);
    }
    const g = scene.add.graphics();
    this.root.add(g);
    this.drawRoom(g, plan);
    this.fire = scene.add.graphics();
    this.smoke = scene.add.graphics();
    this.root.add([this.fire]);
    this.drawBoard(plan);
    this.talk = new Talk((Date.now() & 0xffff) + 7, 'marta', 'sexton');

    // The figures come once their pictures are in; the room stands meanwhile.
    const loader = scene.scene.get(ASSETS);
    const art = sheet(scene.game, getManifest());
    const wanted = ['marta', 'jory', 'agnes', 'brask', 'hound'].map(wantedUnit);
    void art.ensureWanted(loader, wanted).then(() => {
      if (this.gone || !scene.scene.isActive()) return;
      this.people(plan);
      this.root.add(this.smoke);
    });
  }

  // ------------------------------------------------------------ the room

  private drawRoom(g: Phaser.GameObjects.Graphics, plan: Plan): void {
    const { w, h } = this;
    const fy = h * plan.floor;
    // The back wall: dark boards, posts and a beam across the top.
    g.fillStyle(0x24170e, 1).fillRect(0, 0, w, fy);
    for (let x = 0; x < w; x += 18) g.fillStyle(x % 36 === 0 ? 0x2a1b10 : 0x21150d, 1).fillRect(x, 0, 17, fy);
    g.lineStyle(1, 0x150d08, 0.8);
    for (let x = 18; x < w; x += 18) g.lineBetween(x, 0, x, fy);
    for (let px = 0.0; px <= 1.001; px += view.tall ? 0.25 : 1 / 6) {
      g.fillStyle(0x140c07, 1).fillRect(px * w - 9, 0, 18, fy);
      g.fillStyle(0x2e2014, 1).fillRect(px * w - 9, 0, 4, fy);
    }
    g.fillStyle(0x140c07, 1).fillRect(0, h * 0.06, w, 20);
    g.fillStyle(0x3a2a1a, 1).fillRect(0, h * 0.06, w, 5);
    // The floor: boards running away, darker toward the wall, a skirting where they meet.
    g.fillStyle(0x1a110a, 1).fillRect(0, fy, w, h - fy);
    for (let i = 1; i < 9; i++) {
      const yy = fy + (h - fy) * Math.pow(i / 9, 1.3);
      g.lineStyle(1, 0x0e0905, 0.9).lineBetween(0, yy, w, yy);
    }
    for (let x = -w; x < w * 2; x += 60) g.lineStyle(1, 0x0e0905, 0.6).lineBetween(w / 2 + (x - w / 2) * 0.55, fy, x, h);
    g.fillStyle(0x0c0704, 1).fillRect(0, fy - 4, w, 8);

    this.door(g, plan.door * w, fy);
    this.window(g, plan.window * w, fy);
    this.stair(g, plan.stair * w, fy);
    this.bar(g, plan, fy);
    this.hearth(g, plan.hearth * w, fy);
    this.table(g, plan);
    // Lanterns from the beam: one over the table, one over the bar.
    for (const lx of [plan.table[0] + 0.04, plan.bar[0] + 0.08]) this.lantern(g, lx * w, h * 0.06 + 20);
  }

  private door(g: Phaser.GameObjects.Graphics, x: number, fy: number): void {
    const dw = Math.min(78, this.w * 0.09);
    const top = fy - this.h * (view.tall ? 0.3 : 0.44);
    g.fillStyle(0x0c0704, 1).fillRect(x - dw / 2 - 6, top - 6, dw + 12, fy - top + 6);
    g.fillStyle(0x3a2616, 1).fillRect(x - dw / 2, top, dw, fy - top);
    for (let i = 1; i < 4; i++) g.lineStyle(2, 0x241509, 1).lineBetween(x - dw / 2 + (dw / 4) * i, top, x - dw / 2 + (dw / 4) * i, fy);
    // Iron bands and a ring.
    for (const k of [0.22, 0.72]) g.fillStyle(0x1a1a1c, 1).fillRect(x - dw / 2, top + (fy - top) * k, dw, 7);
    g.lineStyle(3, 0x4a4a4e, 1).strokeCircle(x + dw * 0.28, top + (fy - top) * 0.5, 6);
  }

  private window(g: Phaser.GameObjects.Graphics, x: number, fy: number): void {
    const ww = Math.min(110, this.w * 0.12);
    const top = this.h * (view.tall ? 0.11 : 0.16);
    const bot = fy - this.h * (view.tall ? 0.14 : 0.2);
    g.fillStyle(0x0c0704, 1).fillRect(x - ww / 2 - 8, top - 8, ww + 16, bot - top + 16);
    // Night outside: deep blue, a moon, stars, the line of a far roof.
    g.fillStyle(0x0f1828, 1).fillRect(x - ww / 2, top, ww, bot - top);
    g.fillStyle(0xd8d4bc, 1).fillCircle(x + ww * 0.2, top + (bot - top) * 0.28, 9);
    g.fillStyle(0x0f1828, 1).fillCircle(x + ww * 0.2 + 4, top + (bot - top) * 0.28 - 2, 8);
    for (let i = 0; i < 7; i++) g.fillStyle(0xbfc8d8, 0.8).fillRect(x - ww / 2 + ((i * 37) % ww), top + ((i * 23) % ((bot - top) * 0.6)), 2, 2);
    g.fillStyle(0x070b12, 1).fillTriangle(x - ww / 2, bot, x - ww * 0.1, bot - 26, x + ww * 0.2, bot);
    g.fillStyle(0x070b12, 1).fillRect(x - ww / 2, bot - 10, ww, 10);
    // The leading and the sill.
    g.fillStyle(0x140c07, 1).fillRect(x - 3, top, 6, bot - top).fillRect(x - ww / 2, (top + bot) / 2 - 3, ww, 6);
    g.fillStyle(0x3a2a1a, 1).fillRect(x - ww / 2 - 12, bot + 6, ww + 24, 8);
    // Moonlight falling in, faint and cold.
    g.fillStyle(0x6a88b8, 0.06).fillPoints([new Phaser.Math.Vector2(x - ww / 2, bot), new Phaser.Math.Vector2(x + ww / 2, bot), new Phaser.Math.Vector2(x + ww * 0.9, fy + 40), new Phaser.Math.Vector2(x - ww * 0.1, fy + 40)], true);
  }

  private stair(g: Phaser.GameObjects.Graphics, x: number, fy: number): void {
    // A stair up to the rooms, along the wall: steps rising to the left, under a rail.
    const n = 8;
    const sw = Math.min(150, this.w * 0.15);
    const rise = (fy - this.h * 0.1) / n;
    for (let i = 0; i < n; i++) {
      const sx = x + sw / 2 - (sw / n) * (i + 1);
      g.fillStyle(i % 2 ? 0x2e1e12 : 0x34231a, 1).fillRect(sx, fy - rise * (i + 1), sw / n + 2, rise);
      g.fillStyle(0x47321f, 1).fillRect(sx, fy - rise * (i + 1), sw / n + 2, 3);
    }
    g.lineStyle(4, 0x140c07, 1).lineBetween(x + sw / 2, fy - rise * 1.5 - 30, x - sw / 2, fy - rise * (n + 0.5) - 30);
    for (let i = 0; i <= n; i += 2) {
      const px = x + sw / 2 - (sw / n) * i;
      g.lineStyle(3, 0x140c07, 1).lineBetween(px, fy - rise * i, px, fy - rise * (i + 1.5) - 30);
    }
  }

  private bar(g: Phaser.GameObjects.Graphics, plan: Plan, fy: number): void {
    const [a, b, foot] = plan.bar;
    const x0 = a * this.w;
    const x1 = b * this.w;
    const front = foot * this.h;
    const tall = this.h * (view.tall ? 0.09 : 0.18);
    // On the wall behind: a shelf of kegs and bottles.
    const shelf = fy - this.h * (view.tall ? 0.16 : 0.26);
    g.fillStyle(0x140c07, 1).fillRect(x0 + 8, shelf, x1 - x0 - 16, 8);
    for (let kx = x0 + 30; kx < x1 - 20; kx += 46) {
      g.fillStyle(0x0c0704, 1).fillCircle(kx, shelf - 20, 21);
      g.fillStyle(0x5a3a20, 1).fillCircle(kx, shelf - 20, 18);
      g.lineStyle(3, 0x2a2a2c, 1).strokeCircle(kx, shelf - 20, 13);
      g.fillStyle(0x1a1a1c, 1).fillCircle(kx, shelf - 20, 3);
    }
    for (let bx = x0 + 20; bx < x1 - 10; bx += 15) {
      const tint = [0x2f4a30, 0x4a2a22, 0x3a3a50][Math.floor(bx / 15) % 3];
      g.fillStyle(0x0c0704, 1).fillRect(bx - 1, shelf - 62, 9, 20);
      g.fillStyle(tint, 1).fillRect(bx, shelf - 61, 7, 18).fillRect(bx + 2, shelf - 68, 3, 8);
    }
    // The counter: its top, its front of boards, a foot rail.
    g.fillStyle(0x0c0704, 1).fillRect(x0 - 4, front - tall - 4, x1 - x0 + 8, tall + 8);
    g.fillStyle(0x3e2a18, 1).fillRect(x0, front - tall, x1 - x0, tall);
    for (let bx = x0 + 14; bx < x1; bx += 22) g.lineStyle(2, 0x26170c, 1).lineBetween(bx, front - tall + 10, bx, front);
    g.fillStyle(0x5a3e24, 1).fillRect(x0 - 6, front - tall - 8, x1 - x0 + 12, 12);
    g.fillStyle(0x7a5634, 1).fillRect(x0 - 6, front - tall - 8, x1 - x0 + 12, 3);
    g.lineStyle(3, 0x6a6a6e, 0.8).lineBetween(x0, front - 8, x1, front - 8);
    // Two tankards on it.
    for (const tx of [x0 + (x1 - x0) * 0.3, x0 + (x1 - x0) * 0.62]) {
      g.fillStyle(0x0c0704, 1).fillRect(tx - 7, front - tall - 26, 14, 19);
      g.fillStyle(0x7a7a80, 1).fillRect(tx - 5, front - tall - 24, 10, 16);
      g.fillStyle(0xe8d8a8, 1).fillRect(tx - 5, front - tall - 26, 10, 3);
    }
  }

  private hearth(g: Phaser.GameObjects.Graphics, x: number, fy: number): void {
    const hw = Math.min(150, this.w * 0.15);
    const top = fy - this.h * (view.tall ? 0.24 : 0.36);
    const mouth = fy - this.h * (view.tall ? 0.12 : 0.18);
    // The chimney breast in stones, the mantel beam, the black mouth.
    g.fillStyle(0x0c0704, 1).fillRect(x - hw / 2 - 6, 0, hw + 12, fy);
    for (let row = 0; row * 16 < fy; row++) {
      for (let c = -1; c * 26 < hw + 26; c++) {
        const sx = x - hw / 2 + c * 26 + (row % 2) * 13;
        const shade = [0x4a4038, 0x3e352e, 0x544840][(row * 3 + c * 7 + 99) % 3];
        g.fillStyle(shade, 1).fillRect(Math.max(x - hw / 2, sx), row * 16, Math.min(24, x + hw / 2 - Math.max(x - hw / 2, sx)), 14);
      }
    }
    g.fillStyle(0x2a1a0e, 1).fillRect(x - hw / 2 - 16, top, hw + 32, 14);
    g.fillStyle(0x4a3220, 1).fillRect(x - hw / 2 - 16, top, hw + 32, 4);
    g.fillStyle(0x080504, 1).fillRect(x - hw * 0.36, mouth - 4, hw * 0.72, fy - mouth + 4);
    g.fillStyle(0x080504, 1).fillEllipse(x, mouth, hw * 0.72, 34);
    // Logs, and a pot on its hook.
    g.fillStyle(0x2a1a0e, 1).fillRect(x - hw * 0.26, fy - 12, hw * 0.52, 9);
    g.lineStyle(2, 0x2a2a2c, 1).lineBetween(x + hw * 0.12, mouth, x + hw * 0.12, mouth + 16);
    g.fillStyle(0x1a1a1c, 1).fillEllipse(x + hw * 0.12, mouth + 24, 26, 18);
    // Something on the mantel: a candle, a jar.
    g.fillStyle(0xe8dcc0, 1).fillRect(x - hw * 0.3, top - 16, 6, 16);
    g.fillStyle(0x5a6a5a, 1).fillRect(x + hw * 0.22, top - 14, 12, 14);
    this.hearthAt = [x, fy - 18];
    this.glow(x, fy - 30, hw * 3.2, 0xff8a3a, 0.7);
    this.glow(x - hw * 0.3 + 3, top - 20, 46, 0xffc070, 0.45);
  }

  private table(g: Phaser.GameObjects.Graphics, plan: Plan): void {
    const [a, b, foot] = plan.table;
    const x0 = a * this.w;
    const x1 = b * this.w;
    const y = foot * this.h - (view.tall ? 70 : 64);
    // A long table, its top seen a little from above, and a bench before it.
    g.fillStyle(0x0c0704, 1).fillRect(x0 - 4, y - 4, x1 - x0 + 8, 30);
    g.fillStyle(0x4a3220, 1).fillRect(x0, y, x1 - x0, 14);
    g.fillStyle(0x34231a, 1).fillRect(x0, y + 14, x1 - x0, 10);
    for (const lx of [x0 + 10, x1 - 20]) g.fillStyle(0x24170e, 1).fillRect(lx, y + 24, 10, 40);
    // A bench in front.
    g.fillStyle(0x0c0704, 1).fillRect(x0 + 10, y + 36, x1 - x0 - 20, 14);
    g.fillStyle(0x5a3e24, 1).fillRect(x0 + 12, y + 38, x1 - x0 - 24, 8);
    for (const lx of [x0 + 20, x1 - 30]) g.fillStyle(0x24170e, 1).fillRect(lx, y + 46, 8, 18);
    // A candle, a loaf, a cup.
    g.fillStyle(0xe8dcc0, 1).fillRect(x0 + (x1 - x0) * 0.5, y - 14, 5, 14);
    g.fillStyle(0xa8743a, 1).fillEllipse(x0 + (x1 - x0) * 0.25, y + 2, 30, 14);
    g.fillStyle(0x7a7a80, 1).fillRect(x0 + (x1 - x0) * 0.72, y - 10, 9, 11);
    this.glow(x0 + (x1 - x0) * 0.5 + 2, y - 16, 70, 0xffc070, 0.5);
  }

  private lantern(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.lineStyle(2, 0x0c0704, 1).lineBetween(x, y, x, y + 22);
    g.fillStyle(0x0c0704, 1).fillRect(x - 9, y + 22, 18, 24);
    g.fillStyle(0xffc060, 1).fillRect(x - 6, y + 26, 12, 16);
    g.fillStyle(0x0c0704, 1).fillTriangle(x - 11, y + 24, x + 11, y + 24, x, y + 14);
    this.glow(x, y + 34, 150, 0xffb050, 0.55);
  }

  /** A pool of warm light: drawn added over the room, and it breathes with the fire. */
  private glow(x: number, y: number, reach: number, color: number, alpha: number): void {
    const img = this.scene.add.image(x, y, SHEET, 'fx/glow').setBlendMode(Phaser.BlendModes.ADD).setTint(color).setAlpha(alpha);
    img.setDisplaySize(reach, reach * 0.8);
    this.root.add(img);
    this.glows.push({ img, base: alpha, x, y, reach });
  }

  /** The notice board by the door: the contracts. Pressed, it goes to them. */
  private drawBoard(plan: Plan): void {
    const x = plan.board * this.w;
    const fy = this.h * plan.floor;
    const bw = Math.min(96, this.w * 0.11);
    const bh = bw * 0.8;
    const y = fy - this.h * (view.tall ? 0.2 : 0.3);
    const c = this.scene.add.container(x, y);
    const g = this.scene.add.graphics();
    g.fillStyle(0x0c0704, 1).fillRect(-bw / 2 - 5, -bh / 2 - 5, bw + 10, bh + 10);
    g.fillStyle(0x5a3e24, 1).fillRect(-bw / 2, -bh / 2, bw, bh);
    const bills: Array<[number, number, number]> = [[-0.28, -0.18, -5], [0.06, -0.22, 4], [0.3, 0.12, -3], [-0.1, 0.18, 6]];
    for (const [bx, by, a] of bills) {
      const px = bx * bw;
      const py = by * bh;
      const r = (a * Math.PI) / 180;
      const pts = [[-13, -16], [13, -16], [13, 16], [-13, 16]].map(([u, v]) => new Phaser.Math.Vector2(px + u * Math.cos(r) - v * Math.sin(r), py + u * Math.sin(r) + v * Math.cos(r)));
      g.fillStyle(0xd8c8a0, 1).fillPoints(pts, true);
      g.fillStyle(0x2a1c10, 1).fillRect(px - 8, py - 10, 16, 3).fillRect(px - 6, py - 3, 12, 2);
      g.fillStyle(0x8a1e16, 1).fillCircle(px, py + 8, 3);
    }
    c.add(g);
    c.add(label(this.scene, 0, bh / 2 + 16, 'CONTRACTS', { size: 15, face: 'display', color: HOLY.fill }));
    c.setSize(bw + 10, bh + 40).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => {
      if (this.dragged > 8) return;
      sfx.play('click');
      this.board();
    });
    this.root.add(c);
  }

  // ------------------------------------------------------------ the people

  private people(plan: Plan): void {
    const grim = getGrim();
    const order = HUNTERS.map((d) => d.id).sort((a, b) => (plan.at[a]?.y ?? 0) - (plan.at[b]?.y ?? 0));
    for (const id of order) {
      const at = plan.at[id];
      if (!at) continue;
      const def = byId(HUNTERS, id);
      const open = def.hired ? true : isOpen(this.s, id);
      const x = at.x * this.w;
      const y = at.y * this.h;
      const pool = this.scene.add.image(x, y - 4, SHEET, 'fx/glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffb060).setAlpha(0).setDisplaySize(140, 60);
      this.root.add(pool);
      const spot: Spot = { id, open, x, y, fig: null, img: null, dogs: [], pool, name: null, lit: 0, height: 120 };
      // Brask's dogs lie at his feet, his or not: a black shape each while he is shut away.
      if (id === 'brask') {
        for (const [dx, f] of [[-66, 1], [64, -1]] as const) {
          const dog = new GrimFigure(this.scene, 'hound', grim.units.hound, grim.poses, SCALE * 0.8, dx > 0 ? 9 : 4);
          dog.x = x + dx;
          dog.y = y + 6;
          dog.facing = f;
          dog.rest = pose({ bodyY: 8, headRot: dx > 0 ? -10 : 6 });
          if (!open) [dog.tint, dog.fill] = [0x0a0806, true];
          this.root.add(dog.root);
          spot.dogs.push(dog);
        }
      }
      const art = HUNTER_ART[id];
      if (isGrim(art)) {
        const fig = new GrimFigure(this.scene, art.grim, grim.units[art.grim], grim.poses, SCALE, id.length * 5);
        fig.x = x;
        fig.y = y;
        fig.facing = at.face;
        fig.rest = pose(RESTS[id] ?? {});
        fig.shift = 1;
        if (!open) [fig.tint, fig.fill] = [0x0a0806, true];
        this.root.add(fig.root);
        spot.fig = fig;
        spot.height = fig.height;
      } else {
        // A hand for hire is not drawn yet: a dark stand-in, leaning on the bar.
        const img = this.scene.add.image(x, y, CARDS, portraitFrame(art.team, art.legion)).setOrigin(0.5, 0.92);
        img.setScale((150 * SCALE) / img.height).setTint(STAND_IN).setTintMode(Phaser.TintModes.FILL).setFlipX(at.face < 0).setAngle(at.face * -5);
        this.root.add(img);
        spot.img = img;
        spot.height = img.displayHeight;
      }
      if (!open) {
        this.root.add(label(this.scene, x, y - spot.height - 14, '???', { size: 20, face: 'display', color: BONE.shade }));
        const how = label(this.scene, x, y + 18, opensBy(id) || 'Locked', { size: 15, color: BONE.shade, wrap: 150 });
        this.root.add(how);
      }
      // A zone round them to press, and their name over them while the pointer is on them.
      // The name is in it, unseen, so that a script finds the hunter by it as a player finds them by their look.
      const zone = this.scene.add.container(x, y - spot.height / 2);
      zone.add(label(this.scene, 0, 0, def.short.toUpperCase(), { size: 15 }).setAlpha(0));
      zone.setSize(96, spot.height + 24).setInteractive({ useHandCursor: true });
      this.root.add(zone);
      zone.on('pointerover', () => {
        if (!open) return;
        spot.name ??= label(this.scene, x, y - spot.height - 14, def.short.toUpperCase(), { size: 17, face: 'display', color: HOLY.fill });
        this.root.add(spot.name);
        spot.name.setVisible(true);
        spot.lit = Math.max(spot.lit, 0.5);
      });
      zone.on('pointerout', () => spot.name?.setVisible(false));
      zone.on('pointerup', () => {
        if (this.dragged > 8) return;
        sfx.play('click');
        // A light comes up on them and they step forward, and then the detail opens.
        spot.lit = 2;
        this.scene.tweens.add({ targets: spot.fig?.root ?? spot.img, y: '+=6', duration: 160, ease: 'Quad.easeOut' });
        this.scene.time.delayedCall(220, () => this.look(id));
      });
      this.spots.push(spot);
    }
  }

  /** In a tall window the room is dragged sideways; a drag is not a press. */
  private dragging(top: number): void {
    const input = this.scene.input;
    input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.worldY < top || p.worldY > top + this.h) return;
      this.dragFrom = p.worldX - this.root.x;
      this.dragged = 0;
    });
    input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.dragFrom === null || !p.isDown) return;
      const nx = Math.max(this.scrollMin + 6, Math.min(6, p.worldX - this.dragFrom));
      this.dragged += Math.abs(nx - this.root.x);
      this.root.x = nx;
    });
    input.on('pointerup', () => {
      this.dragFrom = null;
      // The press that ends a drag is still seen by what is under it: forget the drag after that.
      this.scene.time.delayedCall(0, () => (this.dragged = 0));
    });
  }

  // ------------------------------------------------------------ each frame

  update(dt: number): void {
    if (this.gone) return;
    this.clock += dt;
    const t = this.clock;
    // The fire: tongues of flame that rise and fall, and its light breathing with them.
    const f = this.fire;
    f.clear();
    const [hx, hy] = this.hearthAt;
    const flick = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3 + 1);
    for (let i = 0; i < 5; i++) {
      const fx = hx + (i - 2) * 12;
      const tall = 26 + 14 * Math.sin(t * (6 + i) + i * 1.7) + (i === 2 ? 12 : 0);
      f.fillStyle(0xd8541e, 0.95).fillTriangle(fx - 9, hy + 6, fx + 9, hy + 6, fx + Math.sin(t * 7 + i) * 4, hy - tall);
      f.fillStyle(0xffc052, 0.95).fillTriangle(fx - 5, hy + 6, fx + 5, hy + 6, fx + Math.sin(t * 8 + i) * 3, hy - tall * 0.6);
    }
    for (const gl of this.glows) gl.img.setAlpha(gl.base * flick);
    // Smoke under the beams: a few soft wisps that drift and fade.
    const sm = this.smoke;
    sm.clear();
    for (let i = 0; i < 6; i++) {
      const k = (t * 0.06 + i / 6) % 1;
      sm.fillStyle(0x8a7a6a, 0.05 * Math.sin(k * Math.PI)).fillEllipse(hx + (k - 0.5) * this.w * 0.5 + Math.sin(t * 0.3 + i) * 20, this.h * (0.14 - k * 0.06), 120 + 60 * k, 26);
    }

    for (const sp of this.spots) {
      // How lit each one is: the fire near them, a little everywhere, and a pool at their feet when picked or pointed at.
      const near = Math.max(0, 1 - Math.abs(sp.x - hx) / (this.w * 0.55));
      const warm = 0.55 + 0.45 * near * flick;
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x6a5a50), Phaser.Display.Color.ValueToColor(0xffe2c0), 100, Math.round(warm * 100),
      );
      if (sp.open && sp.fig) sp.fig.tint = Math.min(0xffffff, Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      sp.lit = Math.max(0, sp.lit - dt * 1.5);
      sp.pool.setAlpha(Math.min(0.8, sp.lit * 0.5));
      sp.fig?.update(t, dt);
      for (const d of sp.dogs) d.update(t, dt);
      // A stand-in breathes by its own height.
      if (sp.img) sp.img.scaleY = sp.img.scaleX * (1 + 0.012 * Math.sin(t * 2 + sp.x));
    }
    this.chatter(dt);
  }

  /** Now and then one of them says something, in the hunt's own caption, over their head; nothing waits for it. */
  private chatter(dt: number): void {
    if (this.said) {
      this.said.left -= dt;
      if (this.said.left <= 0) {
        const c = this.said.c;
        this.said = null;
        this.quiet = 3 + Math.random() * 3;
        this.scene.tweens.add({ targets: c, alpha: 0, duration: 260, onComplete: () => c.destroy() });
      }
      return;
    }
    this.quiet -= dt;
    if (this.quiet > 0) return;
    const open = this.spots.filter((sp) => sp.open);
    if (!open.length) return;
    const sp = open[Math.floor(Math.random() * open.length)];
    const says = this.talk.pick(sp.id, 'rest');
    if (!says) {
      this.quiet = 2;
      return;
    }
    const c = this.scene.add.container(0, 0);
    const line = label(this.scene, 0, 0, says, { size: 17, wrap: 240, color: BONE.fill });
    const name = label(this.scene, 0, 0, VOICES[sp.id]?.name ?? sp.id, { size: 15, color: HOLY.fill });
    const w = Math.max(line.width, name.width) + 24;
    const h = line.height + name.height + 12;
    name.setPosition(0, -h / 2 + 7 + name.height / 2);
    line.setPosition(0, h / 2 - 7 - line.height / 2);
    const g = this.scene.add.graphics();
    g.fillStyle(0x0d0b09, 0.85).fillRect(-w / 2, -h / 2, w, h);
    g.lineStyle(1.5, 0x7a7064, 0.9).strokeRect(-w / 2, -h / 2, w, h);
    c.add([g, name, line]);
    // Over their head, kept inside the room.
    const x = Math.max(w / 2 + 4, Math.min(this.w - w / 2 - 4, sp.x));
    const y = Math.max(h / 2 + 4, sp.y - sp.height - h / 2 - 10);
    c.setPosition(x, y).setAlpha(0).setScale(0.9);
    this.root.add(c);
    this.scene.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.said = { c, who: sp.id, left: 2.4 + says.length * 0.035 };
  }

  destroy(): void {
    this.gone = true;
  }
}
